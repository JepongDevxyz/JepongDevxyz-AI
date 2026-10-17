/* lib/chat/sse.js — split from api/chat.js (mechanical move, no behavior change). */
import { uploadSharedFile } from '../share-file/upload.js';
import { MAX_TOOL_ROUNDS, TOOL_FAMILY_GEMINI, UNIFIED_TOOLS, buildToolFollowUp, executeUnifiedTool, finalizeToolCalls } from '../tools/index.js';
import { buildGeneratedArtifact } from './archive.js';
import { detectArtifactRequest } from './artifacts.js';
import { sanitizeIncomingAttachments } from './attachments.js';
import { PROVIDERS, jdBudgetLeft } from './config.js';
import { normalizeResponseEffort } from './effort.js';
import { runAvailableProviderFallback, runProvider } from './fallback.js';
import { configured, modelLabel, providerLabel, sanitizeCustomProviderKeys } from './keys.js';
import { processChat } from './process.js';
import { sanitizeCustomApiProfile } from './providers.js';
import { responseMeta } from './refine.js';
import { sanitizeAssistantOutput } from './sanitize.js';
import { auditGeneratedResponse } from './search.js';
import { isFallbackableProviderFailure } from './stream.js';
import { contextualTaskMessage, taskAuditActivity, taskCodeVerificationLabel } from './task.js';
import { toolFetchWebpage, toolWebSearch } from './tools.js';
import { activity } from './utils.js';
import { extractCodeBlocks, staticVerifyText } from './verify.js';

const MAX_AUTO_CONTINUATIONS = 4;

function finishReasonNeedsContinuation(reason=''){
  const r=String(reason||'').toLowerCase();
  return [
    'length','max_tokens','max_output_tokens','max_tokens_reached',
    'max_token','token_limit','max_completion_tokens'
  ].includes(r);
}

function hasUnclosedFence(text=''){
  const count=(String(text||'').match(/```/g)||[]).length;
  return count%2===1;
}

function looksObviouslyTruncated(text=''){
  const t=String(text||'').trim();
  if(!t) return false;
  if(hasUnclosedFence(t)) return true;

  const tail=t.slice(-220);
  // Conservative heuristic: only continue when the ending strongly looks cut off.
  if(/[,:;([{<]$/.test(tail)) return true;
  if(/\b(function|const|let|var|return|if|else|for|while|class|interface|type|import|export)\s*$/i.test(tail)) return true;
  if(/["'`]$/.test(tail) && /[=([{,:]\s*["'`][^"'`]*["'`]?$/.test(tail)) return true;
  return false;
}

function continuationNeeded(finishState, generatedText=''){
  return finishState?.creditExhausted===true && String(generatedText||'').trim().length>0;
}

function continuationOverlapLength(previousText='', continuationText='', maxOverlap=8192){
  const previous=String(previousText||'');
  const next=String(continuationText||'');
  const limit=Math.min(previous.length,next.length,Math.max(0,Number(maxOverlap)||0));
  for(let size=limit;size>=16;size--){
    if(previous.slice(-size)===next.slice(0,size))return size;
  }
  return 0;
}

function buildContinuationHistory(body, generatedText=''){
  const base=Array.isArray(body.history)?body.history.slice(-36):[];
  const out=[...base];
  if(String(body.message||'').trim()) out.push({role:'user',text:String(body.message).trim()});
  if(String(generatedText||'').trim()) out.push({role:'model',text:String(generatedText)});
  return out;
}

function continuationPrompt(partNumber=1){
  return (
    `Continue the same answer from exactly where it stopped. This is automatic continuation ${partNumber}. ` +
    'Do not restart, repeat, summarize, apologize, add a new introduction, or mention that this is another part. ' +
    'Continue seamlessly from the previous final character. If the answer is already complete, output nothing.'
  );
}

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function activityStreamResponse(body, requestSignal=null) {
  const encoder=new TextEncoder();
  let cancelled=false;
  let activeReader=null;
  const source={
    start(controller){
      const abortNow=()=>{
        cancelled=true;
        try{activeReader?.cancel('client_aborted');}catch(_){}
      };
      if(requestSignal){
        if(requestSignal.aborted)abortNow();
        else requestSignal.addEventListener('abort',abortNow,{once:true});
      }
      const send=(event,data)=>{
        if(cancelled)return;
        try{controller.enqueue(encoder.encode(sseEvent(event,data)));}catch(_){cancelled=true;}
      };
      const emittedMilestones=new Map();
      const emit=data=>{
        if(!data || data.type!=='activity')return;
        const key=String(data.id||'');
        const signature=[data.label,data.state,data.kind,data.detail].join('|');
        if(key && emittedMilestones.get(key)===signature)return;
        if(key)emittedMilestones.set(key,signature);
        send('activity',data);
      };
      // Activity events are emitted only by real request/tool lifecycle operations.
      // No timed pseudo-steps: a model may spend several seconds on one operation.
      // Flush an SSE comment instead of a user-visible pseudo activity. Detailed
      // Activity rows must correspond to real context, tool, plugin, provider,
      // generation, continuation, verification, or artifact work.
      try{controller.enqueue(encoder.encode(': stream-open\n\n'));}catch(_){cancelled=true;}
      const keepAlive=setInterval(()=>{
        try{controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));}catch(_){}
      },10000);
      (async()=>{
        try{
          const activityContextMessage=contextualTaskMessage(body.message||'',body.history||[]);
          const result=await processChat(body,emit);
          if(!result.ok){
            send('error',{message:result.error||'AI provider unavailable.',status:result.status||500,provider:result.provider||body.provider||'gemini'});
            clearInterval(keepAlive);
            controller.close();
            return;
          }

          const meta=responseMeta(result.response);
          send('meta',meta);

          let generatedText='';
          let activeResponse=result.response;
          let activeFinishState=result.finishState||{reason:'unknown'};
          let continuationCount=0;
          let resolvedProvider=result.resolvedProvider||meta.provider||body.provider||'gemini';
          let resolvedModel=result.resolvedModel||meta.model||body.model||PROVIDERS[resolvedProvider]?.defaultModel;
          const continuationSystemInstruction=(result.systemInstruction||'') +
            ' AUTOMATIC CONTINUATION MODE: When continuing a previous answer, continue seamlessly without repeating earlier text. Do not add "Part 2", "Continuation", or a new introduction.';

          while(activeResponse){
            const reader=activeResponse.body.getReader();
            activeReader=reader;
            const decoder=new TextDecoder();
            const continuationBoundary=generatedText;
            let pendingContinuationPrefix=continuationCount>0?'':null;
            const emitGeneratedText=(piece='',flush=false)=>{
              let visible=String(piece||'');
              if(pendingContinuationPrefix!==null){
                pendingContinuationPrefix+=visible;
                if(!flush&&pendingContinuationPrefix.length<128)return;
                visible=pendingContinuationPrefix.slice(continuationOverlapLength(continuationBoundary,pendingContinuationPrefix));
                pendingContinuationPrefix=null;
              }
              if(visible){generatedText+=visible;send('text',{text:visible});}
            };

            let streamReadError=null;
            while(!cancelled){
              try{
                const {done,value}=await reader.read();
                if(done)break;
                const text=decoder.decode(value,{stream:true});
                if(text)emitGeneratedText(text);
              }catch(readError){
                streamReadError=readError;
                activeFinishState={reason:'unknown'};
                break;
              }
            }
            const tail=decoder.decode();
            if(tail)emitGeneratedText(tail);
            if(pendingContinuationPrefix!==null)emitGeneratedText('',true);

            if(cancelled) break;
            if(streamReadError){
              if(generatedText.trim())send('activity',{
                type:'activity',
                id:`stream-interrupted-${continuationCount+1}`,
                label:'Response stream was interrupted — partial answer preserved',
                state:'warning',
                kind:'generate',
                detail:'Automatic continuation only starts after a confirmed provider credit exhaustion.',
                at:Date.now()
              });
              send('error',{message:generatedText.trim()?'The provider stream was interrupted. The partial answer is preserved; retry to continue.':'The provider stream was interrupted before a response was received. Please retry.',status:502,provider:resolvedProvider});
              clearInterval(keepAlive);
              try{controller.close();}catch(_){}
              return;
            }
            if(!continuationNeeded(activeFinishState,generatedText)) break;
            if(jdBudgetLeft(body._jdDeadline)<=6000){
              send('activity',{
                type:'activity',
                id:'auto-continue-budget',
                label:'Time budget reached — partial answer preserved',
                state:'warning',
                kind:'generate',
                detail:'Tap Continue to keep going.',
                at:Date.now()
              });
              break;
            }
            if(continuationCount>=MAX_AUTO_CONTINUATIONS){
              send('activity',{
                type:'activity',
                id:'auto-continue-limit',
                label:`Automatic continuation reached the safety cap (${MAX_AUTO_CONTINUATIONS})`,
                state:'warning',
                kind:'generate',
                detail:'The manual Continue button remains available.',
                at:Date.now()
              });
              break;
            }

            continuationCount++;
            const completedResponseNumber=continuationCount;
            const nextResponseNumber=continuationCount+1;
            send('activity',{
              type:'activity',
              id:`response-${completedResponseNumber}`,
              label:`Response ${completedResponseNumber} lost its provider credit stream`,
              state:'completed',
              kind:'generate',
              detail:'Continuing the partial answer with the next available API key or enabled fallback.',
              at:Date.now()
            });
            send('activity',{
              type:'activity',
              id:`auto-continue-${continuationCount}`,
              label:`Response ${nextResponseNumber} — continuing`,
              state:'running',
              kind:'generate',
              at:Date.now()
            });

            const continuationArgs={
              model:resolvedModel,
              history:buildContinuationHistory(body,generatedText),
              files:sanitizeIncomingAttachments(body.files||[]),
              message:continuationPrompt(continuationCount),
              systemInstruction:continuationSystemInstruction,
              routedReason:'automatic-continuation',
              emit:null,
              autoFallback:body.autoFallback===true,
              customApiKeys:sanitizeCustomProviderKeys(body,resolvedProvider),
              customApiProfile:resolvedProvider==='custom-api'?sanitizeCustomApiProfile(body):null,
              responseEffort:normalizeResponseEffort(body?.personalization?.intelligence,body?.personalization?.fastAnswers)
            };
            let continuation=await runProvider(resolvedProvider,continuationArgs);
            if(!continuation.ok&&body.autoFallback===true&&isFallbackableProviderFailure(continuation.status,continuation.error)){
              send('activity',{
                type:'activity',id:`auto-continue-${continuationCount}`,
                label:'Continuation key exhausted — checking other configured models',
                state:'warning',kind:'generate',at:Date.now()
              });
              continuation=await runAvailableProviderFallback(resolvedProvider,continuationArgs,{
                body,files:continuationArgs.files,includeEmergencyFallback:true
              });
            }

            if(!continuation.ok){
              send('activity',{
                type:'activity',
                id:`auto-continue-${continuationCount}`,
                label:'Automatic continuation could not start — keeping the response generated so far',
                state:'warning',
                kind:'generate',
                detail:String(continuation.error||'Provider unavailable').slice(0,180),
                at:Date.now()
              });
              send('error',{
                message:`The response could not continue because all available API keys${body.autoFallback===true?' and enabled fallback models':''} are exhausted or unavailable. The partial response is preserved. ${String(continuation.error||'').slice(0,140)}`,
                status:continuation.status||503,
                provider:resolvedProvider
              });
              clearInterval(keepAlive);
              try{controller.close();}catch(_){}
              return;
            }

            activeResponse=continuation.response;
            activeFinishState=continuation.finishState||{reason:'unknown'};
            resolvedProvider=activeResponse.headers.get('x-ai-provider')||resolvedProvider;
            resolvedModel=activeResponse.headers.get('x-ai-model')||resolvedModel;
            send('meta',responseMeta(activeResponse));

            send('activity',{
              type:'activity',
              id:`auto-continue-${continuationCount}`,
              label:`Response ${continuationCount+1} connected`,
              state:'completed',
              detail:`${providerLabel(resolvedProvider)} • ${modelLabel(resolvedModel)}`,
              kind:'generate',
              at:Date.now()
            });
          }

          // Unified native tool loop: every model gets the same tools
          // ("itulad mo sayo lahat ng models"). Turn 1 may end with native
          // tool calls; they are executed server-side and the follow-up turn
          // is streamed. Bounded to MAX_TOOL_ROUNDS. Providers without native
          // function calling keep working through the pipeline below.
          let pendingSessionTitle='';
          let sharedViaNativeTool=false;
          let toolRounds=0;
          while(!cancelled && toolRounds<MAX_TOOL_ROUNDS){
            if(jdBudgetLeft(body._jdDeadline)<=6000){
              send('activity',{type:'activity',id:'tool-budget',label:'Time budget reached — keeping generated response',state:'warning',kind:'tool',at:Date.now()});
              break;
            }
            const toolFamily=activeFinishState?.toolFamily||null;
            const toolCalls=finalizeToolCalls(toolFamily,activeFinishState);
            if(!toolCalls.length) break;
            toolRounds++;
            const toolResults=[];
            for(const call of toolCalls){
              const toolLabel=call.name==='share_file'?'Creating downloadable file'
                :call.name==='create_session'?'Creating new chat session'
                :call.name==='web_search'?'Searching the live web'
                :call.name==='fetch_webpage'?'Reading web page'
                :call.name==='generate_image'?'Generating image'
                :call.name==='get_directions'?'Getting directions'
                :call.name==='get_weather'?'Checking the weather'
                :('Using tool '+call.name);
              send('activity',{type:'activity',id:'tool-'+call.name+'-'+toolRounds,label:toolLabel,state:'running',kind:'tool',at:Date.now()});
              const toolResult=await executeUnifiedTool(call,{
                uploadSharedFile,
                webSearch:toolWebSearch,
                fetchWebpage:toolFetchWebpage,
                onShared:()=>{ sharedViaNativeTool=true; },
                onCreateSession:(title)=>{ pendingSessionTitle=title; },
              });
              toolResults.push({call,result:toolResult});
              send('activity',{type:'activity',id:'tool-'+call.name+'-'+toolRounds,
                label:toolResult.ok?toolLabel+' — done':toolLabel+' — failed',
                state:toolResult.ok?'completed':'warning',kind:'tool',
                detail:String(toolResult.url||toolResult.error||'').slice(0,180),at:Date.now()});
            }
            const followUp=buildToolFollowUp(toolFamily,activeFinishState?.nativeMessages,toolCalls,toolResults);
            if(!followUp) break;
            const toolArgs={
              model:resolvedModel,
              history:[],
              files:[],
              message:'',
              systemInstruction:result.systemInstruction,
              routedReason:'unified-tool-followup',
              emit:null,
              autoFallback:false,
              customApiKeys:sanitizeCustomProviderKeys(body,resolvedProvider),
              customApiProfile:resolvedProvider==='custom-api'?sanitizeCustomApiProfile(body):null,
              responseEffort:normalizeResponseEffort(body?.personalization?.intelligence,body?.personalization?.fastAnswers),
              unifiedTools:UNIFIED_TOOLS,
              ...(toolFamily===TOOL_FAMILY_GEMINI?{toolContents:followUp.contents}:{toolMessages:followUp.messages}),
            };
            let next=null;
            try{ next=await runProvider(resolvedProvider,toolArgs); }
            catch(e){ next={ok:false,error:String(e?.message||e)}; }
            if(!next||!next.ok){
              send('activity',{type:'activity',id:'tool-followup-'+toolRounds,label:'Tool follow-up unavailable — keeping generated response',state:'warning',kind:'tool',at:Date.now()});
              break;
            }
            activeResponse=next.response;
            activeFinishState=next.finishState||{reason:'unknown'};
            resolvedProvider=activeResponse.headers.get('x-ai-provider')||resolvedProvider;
            resolvedModel=activeResponse.headers.get('x-ai-model')||resolvedModel;
            try{
              const toolReader=activeResponse.body.getReader();
              activeReader=toolReader;
              const toolDecoder=new TextDecoder();
              while(!cancelled){
                const {done,value}=await toolReader.read();
                if(done) break;
                const text=toolDecoder.decode(value,{stream:true});
                if(text){ generatedText+=text; send('text',{text}); }
              }
              const tail=toolDecoder.decode();
              if(tail){ generatedText+=tail; send('text',{text:tail}); }
            }catch(_){ break; }
          }

          if(finishReasonNeedsContinuation(activeFinishState?.reason)&&generatedText.trim()){
            send('activity',{type:'activity',id:'provider-output-limit',label:'Provider output limit reached — partial answer preserved',state:'warning',kind:'generate',at:Date.now()});
          }

          generatedText=sanitizeAssistantOutput(generatedText);

          // create_session tool (pipeline fallback): the model must ask permission
          // first and only emit [CREATE_SESSION: <title>] after the user agrees.
          // Strip the marker so it never shows as prose; the client creates the
          // new session from the SSE event below.
          {
            const sessionMark=String(generatedText).match(/\[CREATE_SESSION\s*:\s*([^\]\n]{1,80})\]/i);
            if(sessionMark){
              pendingSessionTitle=String(sessionMark[1]).trim().slice(0,60);
              generatedText=String(generatedText).replace(/\s*\[CREATE_SESSION\s*:\s*[^\]\n]{1,80}\]\s*/gi,'').trim();
            }
          }

          if(cancelled){
            clearInterval(keepAlive);
            try{controller.close();}catch(_){}
            return;
          }

          if(continuationCount>0){
            send('activity',{
              type:'activity',
              id:'auto-continue-complete',
              label:`Automatic continuation finished${continuationCount>1?` after ${continuationCount} continuations`:''}`,
              state:'completed',
              kind:'generate',
              at:Date.now()
            });
          }

          // Every normal assistant response gets a real server-side result audit.
          // This keeps Activity useful for all prompts, not only uploads/repositories.
          send('activity',{
            type:'activity',
            id:'response-audit',
            label:'Checking the response against your request',
            state:'running',
            kind:'test',
            at:Date.now()
          });
          const responseAudit=auditGeneratedResponse(activityContextMessage,generatedText,body.files||[]);
          const auditActivity=taskAuditActivity(activityContextMessage,body.files||[],responseAudit,result.activityBlueprint||null);
          send('activity',{
            type:'activity',
            id:'response-audit',
            label:auditActivity.label,
            state:responseAudit.ok?'completed':'warning',
            kind:auditActivity.kind||'test',
            detail:responseAudit.ok
              ?'Response structure and requested-output requirements passed the server audit.'
              :responseAudit.failed.map(x=>x.name).slice(0,4).join(' • '),
            at:Date.now()
          });

          // Whenever the model actually generated code, statically inspect it even
          // if the user did not literally say "test" or "verify". This covers prompts
          // such as "Gawan mo ako ng HTML snake game" across every selected model.
          const generatedBlocks=responseAudit.codeBlocks||extractCodeBlocks(generatedText);
          if(generatedBlocks.length){
            send('activity',{
              type:'activity',
              id:'output-verification',
              label:`Checking ${Math.min(generatedBlocks.length,10)} generated code block${Math.min(generatedBlocks.length,10)===1?'':'s'}`,
              state:'running',
              kind:'test',
              detail:'Static verification only; code is not arbitrarily executed.',
              at:Date.now()
            });
            const postReports=generatedBlocks.slice(0,10).map((b,i)=>staticVerifyText(`Generated code block ${i+1}`,b.code,b.lang));
            const failed=postReports.filter(r=>r.status==='failed').length;
            const warnings=postReports.filter(r=>r.status==='warning').length;
            send('activity',{
              type:'activity',
              id:'output-verification',
              label:taskCodeVerificationLabel(activityContextMessage,body.files||[],failed,warnings,postReports.length,result.activityBlueprint||null),
              state:failed?'warning':'completed',
              kind:'test',
              detail:'Static verification only; code was not arbitrarily executed.',
              at:Date.now()
            });
          }

          const artifactReq=detectArtifactRequest(body.message||'',body.files||[]);
          if(artifactReq && !sharedViaNativeTool){
            send('activity',{type:'activity',id:'artifact',label:artifactReq.kind==='zip'?'Packaging updated code into a ZIP':'Preparing requested download file',state:'running',kind:'file',at:Date.now()});
          }
          // If the native share_file tool already handled this turn, skip the
          // pipeline artifact: the model pasted the public URL itself and there
          // is no file content left in the text to package.
          const artifact=sharedViaNativeTool?null:buildGeneratedArtifact(body.message||'',generatedText,body.files||[]);
          if(artifact){
            if(artifact.error){
              send('activity',{type:'activity',id:'artifact',label:artifact.error,state:'warning',kind:'file',at:Date.now()});
            }else{
              // share_file tool: upload the generated file to the project's
              // own Vercel Blob store for a public download link in chat.
              // Never breaks the chat: on any failure the local download
              // card still works exactly as before. Overlay ZIPs are skipped
              // because the complete file is merged locally in the browser.
              if(!artifact.overlay && artifact.base64){
                try{
                  send('activity',{type:'activity',id:'artifact-upload',label:`Uploading ${artifact.filename} for a public link`,state:'running',kind:'file',at:Date.now()});
                  const bin=atob(String(artifact.base64));
                  const bytes=new Uint8Array(bin.length);
                  for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
                  const shared=await uploadSharedFile({filename:artifact.filename,bytes,mimeType:artifact.mimeType});
                  if(shared && shared.ok && shared.url){
                    artifact.url=shared.url;
                    send('activity',{type:'activity',id:'artifact-upload',label:'Public download link ready',state:'completed',kind:'file',at:Date.now()});
                  }else{
                    send('activity',{type:'activity',id:'artifact-upload',label:'Public link unavailable — download card still works',state:'warning',kind:'file',at:Date.now()});
                  }
                }catch(_){
                  send('activity',{type:'activity',id:'artifact-upload',label:'Public link unavailable — download card still works',state:'warning',kind:'file',at:Date.now()});
                }
              }
              send('activity',{type:'activity',id:'artifact',label:`Generated ${artifact.filename}`,state:'completed',kind:'file',at:Date.now()});
              send('artifact',artifact);
            }
          }

          // create_session tool: the model asked permission first and the user
          // agreed (marker above). The client creates the new session.
          if(pendingSessionTitle){
            send('create_session',{title:pendingSessionTitle,at:Date.now()});
          }

          const elapsedMs=Math.max(1,Date.now()-result.startedAt);
          send('activity',{
            type:'activity',
            id:'thinking',
            label:result.activityTaskLabel||'Working on your request',
            state:'completed',
            kind:result.activityTaskKind||'process',
            at:Date.now()
          });
          send('activity',{type:'activity',id:'generation',label:`Response complete in ${(elapsedMs/1000).toFixed(elapsedMs>=1000?1:2)}s`,state:'completed',kind:'generate',at:Date.now()});
          const locationToolAppendix=String(result.locationToolAppendix||'').trim();
          if(locationToolAppendix){
            const addition='\n\n'+locationToolAppendix;
            generatedText+=addition;
            send('text',{text:addition});
          }
          send('done',{elapsedMs,autoContinuations:continuationCount,...meta});
          clearInterval(keepAlive);
          controller.close();
        }catch(e){
          send('error',{message:e?.message||String(e),status:500});
          clearInterval(keepAlive);
          controller.close();
        }
      })();
    },
    cancel(reason){
      cancelled=true;
      try{activeReader?.cancel(reason||'client_cancelled');}catch(_){}
    }
  };
  return new Response(new ReadableStream(source),{
    headers:{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive'
    }
  });
}

export { MAX_AUTO_CONTINUATIONS, finishReasonNeedsContinuation, hasUnclosedFence, looksObviouslyTruncated, continuationNeeded, continuationOverlapLength, buildContinuationHistory, continuationPrompt, sseEvent, activityStreamResponse };
