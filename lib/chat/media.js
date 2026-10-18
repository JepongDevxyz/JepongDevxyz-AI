// JEPONGDEVXYZ AI — Streaming, TTS, image generation
// Extracted from api/chat.js (lines 6243-7296)

import { uploadSharedFile } from '../share-file/upload.js';
import { UNIFIED_TOOLS, TOOL_FAMILY_GEMINI, MAX_TOOL_ROUNDS, finalizeToolCalls, buildToolFollowUp, executeUnifiedTool } from '../tools/index.js';
import { detectArtifactRequest, getCloudflareAccounts, json, modelLabel, normalizeResponseEffort, parseKeys, providerLabel, rotateProviderKeys, sanitizeCustomProviderKeys, shuffle } from './guard.js';
import { buildGeneratedArtifact, bytesToBase64 } from './tools.js';
import { sanitizeAssistantOutput } from './orchestrator.js';
import { auditGeneratedResponse, extractCodeBlocks, safeJsonResponse, sanitizeIncomingAttachments, staticVerifyText } from './research.js';
export function activityStreamResponse(body, requestSignal=null) {
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


export const CLOUDFLARE_TTS_MODEL = '@cf/myshell-ai/melotts';
export const MELOTTS_LANGUAGE_ALIASES = {
  en:['en'],
  es:['es'],
  fr:['fr'],
  zh:['zh'],
  ja:['jp','ja'],
  ko:['kr','ko']
};

export function normalizeTTSLanguage(input='en-US'){
  const raw=String(input||'en-US').toLowerCase().replace('_','-');
  const base=raw.split('-')[0];
  if(base==='jp') return 'ja';
  if(base==='kr') return 'ko';
  return base;
}

export function decodeBase64Audio(base64){
  try{
    const clean=String(base64||'').replace(/^data:audio\/[^;]+;base64,/i,'').trim();
    if(!clean) return null;
    const bin=atob(clean);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  }catch(_){return null;}
}

export function extractAudioBytesFromCloudflareJson(payload){
  const candidates=[
    payload?.result?.audio,
    payload?.result?.audio_base64,
    payload?.result?.audioBase64,
    payload?.result?.mp3,
    payload?.audio,
    payload?.audio_base64,
    payload?.audioBase64,
    payload?.mp3
  ];
  for(const value of candidates){
    if(typeof value==='string'){
      const bytes=decodeBase64Audio(value);
      if(bytes?.length) return bytes;
    }
  }
  return null;
}

export const OPENAI_TTS_VOICES={Jepong:'onyx',Janna:'nova',Calixie:'shimmer',Sevich:'echo',Princess:'coral',Herald:'ash',Sol:'cedar',Fable:'sage',Luna:'marin',Lancelot:'onyx',Sydney:'alloy',Odette:'verse'};

/* ElevenLabs is the primary cloud TTS provider. Voice IDs are discovered from
   the account at runtime; no secret or account-specific voice ID is shipped to
   the browser. This also lets a user replace/add voices without a code deploy. */
export const ELEVEN_PERSONA_GENDERS={
  Jepong:'male',Janna:'female',Calixie:'female',Sevich:'male',Princess:'female',
  Herald:'male',Sol:'male',Fable:'female',Luna:'female',Lancelot:'male',
  Sydney:'female',Odette:'female'
};
export const ELEVEN_PERSONA_STYLE={
  Jepong:['confident','versatile','natural','conversational'],
  Janna:['warm','friendly','natural','conversational'],
  Calixie:['bright','expressive','energetic','conversational'],
  Sevich:['composed','direct','calm','professional'],
  Princess:['warm','cheerful','expressive','friendly'],
  Herald:['clear','confident','professional','narration'],
  Sol:['relaxed','calm','savvy','conversational'],
  Fable:['gentle','expressive','thoughtful','narration'],
  Luna:['calm','warm','gentle','conversational'],
  Lancelot:['refined','assured','calm','confident'],
  Sydney:['bright','inquisitive','friendly','conversational'],
  Odette:['elegant','warm','gentle','expressive']
};
export const elevenVoiceCache=new Map();

export function elevenLanguageCode(language='en-US'){
  const base=normalizeTTSLanguage(language);
  return base==='tl'?'fil':base;
}
export function elevenVoiceGender(voice){
  const labels=voice?.labels||{};
  return String(labels.gender||labels.sex||'').toLowerCase();
}
export function elevenVoiceSearchText(voice){
  return [voice?.name,voice?.description,...Object.values(voice?.labels||{})].filter(Boolean).join(' ').toLowerCase();
}
export function elevenVoiceLocaleScore(voice,language='en-US'){
  const requested=String(language||'').toLowerCase().replace('_','-');
  const base=elevenLanguageCode(requested);
  let score=0;
  const verified=Array.isArray(voice?.verified_languages)?voice.verified_languages:[];
  for(const item of verified){
    const lang=String(item?.language||'').toLowerCase();
    const locale=String(item?.locale||'').toLowerCase().replace('_','-');
    if(locale&&locale===requested)score=Math.max(score,160);
    else if(lang===base)score=Math.max(score,130);
    else if((base==='fil'||base==='tl')&&(lang==='fil'||lang==='tl'))score=Math.max(score,140);
  }
  const hay=elevenVoiceSearchText(voice);
  if(hay.includes(requested)||hay.includes(requested.replace('-',' ')))score=Math.max(score,120);
  const country=requested.split('-')[1]||'';
  if(country&&new RegExp('(?:^|\\W)'+country+'(?:$|\\W)','i').test(hay))score+=20;
  return score;
}
export function getElevenLabsKeys(){
  const raw=[
    process.env.ELEVENLABS_API_KEYS,
    process.env.ELEVENLABS_API_KEY,
    ...Object.keys(process.env).filter(k=>/^ELEVENLABS_API_KEY_\d+$/.test(k)).sort((a,b)=>Number(a.match(/\d+/)?.[0]||0)-Number(b.match(/\d+/)?.[0]||0)).map(k=>process.env[k])
  ].filter(Boolean).join(',');
  return [...new Set(raw.split(/[\n,;]+/).map(x=>String(x||'').trim()).filter(Boolean))];
}
export function rotatedElevenLabsKeys(){
  const keys=getElevenLabsKeys();
  if(keys.length<2)return keys;
  const start=Math.floor(Date.now()/60000)%keys.length;
  return keys.slice(start).concat(keys.slice(0,start));
}
export async function getElevenVoices(key){
  const cached=elevenVoiceCache.get(key);
  if(cached?.voices?.length&&Date.now()-cached.at<10*60*1000)return cached.voices;
  const all=[];
  let next='';
  for(let page=0;page<10;page++){
    const url='https://api.elevenlabs.io/v2/voices?page_size=100'+(next?'&next_page_token='+encodeURIComponent(next):'');
    const res=await fetch(url,{headers:{'xi-api-key':key,'Accept':'application/json'},signal:AbortSignal.timeout(15000)});
    if(!res.ok)throw new Error('ElevenLabs voices HTTP '+res.status);
    const data=await res.json();
    if(Array.isArray(data?.voices))all.push(...data.voices);
    next=String(data?.next_page_token||'');
    if(!next||data?.has_more===false)break;
  }
  const voices=[...new Map(all.map(v=>[v.voice_id,v])).values()];
  elevenVoiceCache.set(key,{at:Date.now(),voices});
  return voices;
}
export function selectElevenVoice(voices,persona,language){
  if(!voices.length)return null;
  const desired=ELEVEN_PERSONA_GENDERS[persona]||'female';
  const exactName=voices.find(v=>String(v?.name||'').toLowerCase()===String(persona||'').toLowerCase());
  if(exactName&&elevenVoiceLocaleScore(exactName,language)>0)return exactName;

  const genderMatches=voices.filter(v=>elevenVoiceGender(v)===desired);
  const genderUnknown=voices.filter(v=>!elevenVoiceGender(v));
  let pool=genderMatches.length?genderMatches:(genderUnknown.length?genderUnknown:voices);
  const styleWords=ELEVEN_PERSONA_STYLE[persona]||[];
  const personaIndex=Math.max(0,Object.keys(ELEVEN_PERSONA_GENDERS).indexOf(persona));
  const ranked=pool.map((v,index)=>{
    const locale=elevenVoiceLocaleScore(v,language);
    const hay=elevenVoiceSearchText(v);
    const style=styleWords.reduce((n,w)=>n+(hay.includes(w)?10:0),0);
    // Persona-specific rotation is only a tie breaker after locale/gender/style.
    const rotation=(index-personaIndex+pool.length)%Math.max(1,pool.length);
    return {v,score:locale*100+style*10-rotation};
  }).sort((a,b)=>b.score-a.score);
  return ranked[0]?.v||null;
}
export async function elevenLabsTTS(body={}){
  const keys=rotatedElevenLabsKeys();
  if(!keys.length)return null;
  const text=String(body.text||body.prompt||'').replace(/\s+/g,' ').trim().slice(0,4000);
  if(!text)return json({error:'No text provided for speech.'},400);
  const language=String(body.language||body.lang||'en-US');
  const persona=String(body.voice||'Jepong');
  const model=String(process.env.ELEVENLABS_TTS_MODEL||'eleven_multilingual_v2').trim();
  for(let ki=0;ki<keys.length;ki++){
    const key=keys[ki];
    try{
      const voices=await getElevenVoices(key);
      const selected=selectElevenVoice(voices,persona,language);
      if(!selected?.voice_id)continue;
      const payload={text,model_id:model,voice_settings:{stability:.5,similarity_boost:.75,style:.15,use_speaker_boost:true}};
      if(model!=='eleven_multilingual_v2')payload.language_code=elevenLanguageCode(language);
      const res=await fetch('https://api.elevenlabs.io/v1/text-to-speech/'+encodeURIComponent(selected.voice_id)+'?output_format=mp3_44100_128',{
        method:'POST',headers:{'xi-api-key':key,'Content-Type':'application/json','Accept':'audio/mpeg'},
        body:JSON.stringify(payload),signal:AbortSignal.timeout(90000)
      });
      if(!res.ok){
        // Try the next configured key on auth, quota/rate-limit, or provider errors.
        if([401,402,403,429].includes(res.status)||res.status>=500)continue;
        continue;
      }
      return new Response(res.body,{status:200,headers:{
        'Content-Type':'audio/mpeg','Cache-Control':'no-store','X-TTS-Engine':'elevenlabs',
        'X-TTS-Language':language,'X-TTS-Voice':String(selected.name||selected.voice_id),
        'X-TTS-Gender':ELEVEN_PERSONA_GENDERS[persona]||'female','X-TTS-Persona':persona,
        'X-TTS-Key-Slot':String(ki+1)
      }});
    }catch(_){continue;}
  }
  return null;
}

export function ttsLanguageInstruction(language='en-US',voiceName='Jepong'){
  const tag=String(language||'en-US').replace('_','-');
  const base=tag.toLowerCase().split('-')[0];
  const labels={fil:'Filipino (Philippines)',tl:'Tagalog (Philippines)',en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',pt:'Portuguese',ja:'Japanese',ko:'Korean',zh:'Mandarin Chinese',ar:'Arabic',hi:'Hindi',id:'Indonesian',ms:'Malay',vi:'Vietnamese',th:'Thai',ru:'Russian',uk:'Ukrainian',tr:'Turkish',nl:'Dutch',pl:'Polish',bn:'Bengali'};
  const label=labels[base]||tag;
  const personaGender=ELEVEN_PERSONA_GENDERS[voiceName];
  const gender=personaGender==='male'?'masculine':personaGender==='female'?'feminine':'natural';
  return `Speak only in ${label}, using a native, natural ${label} accent. Do not introduce an accent from another language or country. Preserve the input language and wording. Use a ${gender} voice character. Clear conversational delivery, not robotic.`;
}
export async function openAITTS(body={}){
  const key=String(process.env.OPENAI_TTS_API_KEY||process.env.OPENAI_API_KEY||'').trim();
  if(!key)return null;
  const text=String(body.text||body.prompt||'').replace(/\s+/g,' ').trim().slice(0,4000);
  if(!text)return json({error:'No text provided for speech.'},400);
  const language=String(body.language||body.lang||'en-US');
  const persona=String(body.voice||'Jepong');
  const voice=OPENAI_TTS_VOICES[persona]||'coral';
  try{
    const res=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Accept':'audio/mpeg'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL||'gpt-4o-mini-tts',input:text,voice,instructions:ttsLanguageInstruction(language,persona),response_format:'mp3'}),signal:AbortSignal.timeout(90000)});
    if(!res.ok)return null;
    return new Response(res.body,{status:200,headers:{'Content-Type':'audio/mpeg','Cache-Control':'no-store','X-TTS-Engine':'openai-gpt-4o-mini-tts','X-TTS-Language':language,'X-TTS-Voice':voice,'X-TTS-Persona':persona}});
  }catch(_){return null;}
}
export async function serverTTS(body={}){
  const eleven=await elevenLabsTTS(body); if(eleven)return eleven;
  const openai=await openAITTS(body); if(openai)return openai;
  return cloudflareTTS(body);
}

export async function cloudflareTTS(body={}){
  const text=String(body.text||body.prompt||'').replace(/\s+/g,' ').trim().slice(0,1800);
  if(!text) return json({error:'No text provided for speech.'},400);

  const base=normalizeTTSLanguage(body.language||body.lang||'en-US');
  const languageAttempts=MELOTTS_LANGUAGE_ALIASES[base];
  if(!languageAttempts){
    return json({
      error:'Neural voice is not available for this language in MeloTTS.',
      code:'unsupported_tts_language',
      fallback:'browser',
      language:base
    },422);
  }

  const accounts=shuffle(getCloudflareAccounts());
  if(!accounts.length){
    return json({
      error:'Cloudflare Workers AI is not configured.',
      code:'tts_not_configured',
      fallback:'browser'
    },503);
  }

  let lastError='Cloudflare TTS unavailable.';
  let lastStatus=502;

  for(let ai=0; ai<accounts.length; ai++){
    const account=accounts[ai];
    for(const lang of languageAttempts){
      try{
        const endpoint=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/ai/run/${CLOUDFLARE_TTS_MODEL}`;
        const res=await fetch(endpoint,{
          method:'POST',
          headers:{
            'Authorization':`Bearer ${account.apiToken}`,
            'Content-Type':'application/json',
            'Accept':'audio/mpeg, application/json'
          },
          body:JSON.stringify({prompt:text,lang}),
          signal:AbortSignal.timeout(90000)
        });

        const contentType=(res.headers.get('content-type')||'').toLowerCase();

        if(res.ok){
          if(contentType.includes('audio/') || contentType.includes('application/octet-stream')){
            return new Response(res.body,{
              status:200,
              headers:{
                'Content-Type':contentType.includes('audio/') ? contentType.split(';')[0] : 'audio/mpeg',
                'Cache-Control':'no-store',
                'X-TTS-Engine':'cloudflare-melotts',
                'X-TTS-Language':lang,
                'X-TTS-Model':CLOUDFLARE_TTS_MODEL
              }
            });
          }

          const payload=await res.json().catch(()=>null);
          const audioBytes=extractAudioBytesFromCloudflareJson(payload);
          if(audioBytes?.length){
            return new Response(audioBytes,{
              status:200,
              headers:{
                'Content-Type':'audio/mpeg',
                'Cache-Control':'no-store',
                'X-TTS-Engine':'cloudflare-melotts',
                'X-TTS-Language':lang,
                'X-TTS-Model':CLOUDFLARE_TTS_MODEL
              }
            });
          }

          lastStatus=502;
          lastError='Cloudflare returned an unexpected TTS response.';
          continue;
        }

        lastStatus=res.status;
        lastError=await res.text().catch(()=>`Cloudflare TTS HTTP ${res.status}`);
        if(!isRetryableStatus(res.status) && res.status!==400) break;
      }catch(e){
        lastStatus=502;
        lastError=e?.message||String(e);
      }
    }
  }

  return json({
    error:'Neural voice is temporarily unavailable.',
    detail:String(lastError).slice(0,500),
    code:'tts_unavailable',
    fallback:'browser'
  },lastStatus||502);
}



export const PET_IMAGE_MODEL='@cf/black-forest-labs/flux-1-schnell';
export const WEBSITE_PET_STYLE_GUIDE = 'Use the same overall mascot design language as the website pets like Luna and Mochi: a cute polished companion character, rounded silhouette, large expressive eyes, soft 3D/cartoon rendering, clean edges, appealing studio lighting, friendly face, and a charming app-mascot presentation.';
export const WEBSITE_PET_REFERENCE_GUIDES = {
  Luna:'Cat-inspired mascot with a gentle, curious, supportive vibe and soft plush-like proportions.',
  Kiro:'Dog-inspired mascot with a loyal, upbeat, playful vibe and friendly rounded proportions.',
  Mochi:'Rabbit-inspired mascot with a calm, gentle, cozy vibe and soft rounded ears and plush proportions.',
  Pixel:'Robot-inspired mascot with a cheerful smart vibe, cute tech details, and rounded futuristic shapes.',
  Nova:'Black cat-inspired mascot with a cool mysterious vibe and elegant rounded proportions.',
  Sunny:'Chick-inspired mascot with bright happy energy and a cute compact silhouette.',
  Kumo:'Panda-inspired mascot with a chill relaxed vibe and cozy rounded proportions.',
  Ace:'Fox-inspired mascot with a brave confident vibe and cute alert features.'
};

export function buildPetImagePrompt(options={}){
  const petName=String(options.name||'My Pet').trim().slice(0,60) || 'My Pet';
  const userIdea=String(options.description||'a cute friendly companion pet').trim().slice(0,1000) || 'a cute friendly companion pet';
  const matchSiteStyle = options.matchSiteStyle !== false;
  const referencePet = String(options.referencePet||'').trim();
  const parts = [
    `Create one polished companion pet mascot. The pet name is ${petName}, but DO NOT render the name or any text in the image.`,
    `USER VISUAL REQUEST — follow this as the source of truth: "${userIdea}".`,
    'Treat the USER VISUAL REQUEST as mandatory. Preserve every explicitly requested species/creature, primary and secondary color, marking, eye color, horn, wing, ear, tail, fin, crystal, clothing, accessory, pose, expression, and personality cue. Never silently substitute, omit, or invent a conflicting visible trait.',
    'When the user gives multiple colors, apply all of them to visible pet features in a natural way rather than dropping one. When a trait is ambiguous, prefer the most literal interpretation that is compatible with the requested species.',
    'Interpret only obvious minor spelling typos when context is clear; otherwise preserve the user wording instead of guessing.'
  ];
  if(matchSiteStyle){
    parts.push(WEBSITE_PET_STYLE_GUIDE);
    if(referencePet && WEBSITE_PET_REFERENCE_GUIDES[referencePet]){
      parts.push(`STYLE REFERENCE ONLY — use ${referencePet} only as a style anchor: ${WEBSITE_PET_REFERENCE_GUIDES[referencePet]} This influences rendering language and mascot proportions only. It must NOT override the species, colors, or visible traits requested by the user unless the user explicitly asks for them.`);
    }
  } else {
    parts.push('If the user explicitly requests an art style, that style wins. Otherwise use a cute high-quality 3D animated app-mascot style that fits a friendly AI companion.');
  }
  parts.push('Single full-body pet, centered, clearly visible, square composition, isolated subject on a fully transparent background (alpha channel), no floor, no backdrop, no scenery, no frame, no extra characters, no UI, no letters, no logo, no watermark. Keep the complete body inside the canvas with comfortable transparent padding around it so it matches the built-in floating pets.');
  return parts.join(' ').slice(0,2600);
}

export function extractCloudflareImageBase64(payload){
  if(!payload)return '';
  const candidates=[
    payload?.result?.image,
    payload?.image,
    payload?.result?.data?.[0]?.b64_json,
    payload?.data?.[0]?.b64_json
  ];
  for(const value of [...candidates,payload?.result]){
    if(typeof value==='string'&&value.length>100)return value.replace(/^data:image\/[^;]+;base64,/i,'');
  }
  return '';
}

export async function generateImage(body={},requestSignal=null){
  const prompt=String(body.prompt||body.message||'').trim().slice(0,2200);
  if(!prompt)return json({error:'Image prompt is required.'},400);
  const preference=String(body.model||'auto').toLowerCase();
  const seed=Math.floor(Math.random()*2147483000)+1;
  const errors=[];
  const accounts=shuffle(getCloudflareAccounts());

  if(preference!=='pollinations'){
    for(const account of accounts){
      try{
        const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/ai/run/${PET_IMAGE_MODEL}`;
        const res=await fetch(url,{method:'POST',headers:{'Authorization':`Bearer ${account.apiToken}`,'Content-Type':'application/json','Accept':'application/json,image/jpeg,image/png,*/*'},body:JSON.stringify({prompt,seed,steps:8}),signal:requestSignal||AbortSignal.timeout(65000)});
        if(res.ok){
          const contentType=(res.headers.get('content-type')||'').toLowerCase();
          if(contentType.startsWith('image/')){
            const bytes=new Uint8Array(await res.arrayBuffer());
            if(bytes.length)return json({ok:true,imageDataUrl:`data:${contentType.split(';')[0]};base64,${bytesToBase64(bytes)}`,provider:'Cloudflare Workers AI',model:PET_IMAGE_MODEL});
          }else{
            const payload=await safeJsonResponse(res);
            const image=extractCloudflareImageBase64(payload);
            if(image)return json({ok:true,imageDataUrl:`data:image/jpeg;base64,${image}`,provider:'Cloudflare Workers AI',model:PET_IMAGE_MODEL});
          }
          errors.push('Cloudflare returned no usable image data.');
        }else errors.push(`Cloudflare HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
      }catch(e){
        if(requestSignal?.aborted)return json({error:'Image generation cancelled.',code:'cancelled'},499);
        errors.push(`Cloudflare: ${String(e?.message||e).slice(0,220)}`);
      }
    }
  }

  const pollinationsKey=String(process.env.POLLINATIONS_API_KEY||'').trim();
  if(pollinationsKey){
    try{
      const url=`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=1024&height=1024&seed=${seed}`;
      const res=await fetch(url,{headers:{'Authorization':`Bearer ${pollinationsKey}`,'Accept':'image/*'},signal:requestSignal||AbortSignal.timeout(65000)});
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'image/jpeg').split(';')[0];
        const bytes=new Uint8Array(await res.arrayBuffer());
        if(bytes.length)return json({ok:true,imageDataUrl:`data:${contentType};base64,${bytesToBase64(bytes)}`,provider:'Pollinations',model:'flux'});
      }else errors.push(`Pollinations HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
    }catch(e){
      if(requestSignal?.aborted)return json({error:'Image generation cancelled.',code:'cancelled'},499);
      errors.push(`Pollinations: ${String(e?.message||e).slice(0,220)}`);
    }
  }

  if(!accounts.length&&!pollinationsKey)return json({error:'No image generator is configured.',detail:'Configure Cloudflare Workers AI credentials or POLLINATIONS_API_KEY.'},503);
  return json({error:'Image generation is temporarily unavailable.',detail:errors.slice(0,3).join(' | ').slice(0,700)},502);
}

export async function removePetImageBackground(imageBytes,contentType,requestSignal=null){
  if(!imageBytes?.length)return null;
  // Background removal is an optional post-process. Try every configured
  // Cloudflare account instead of assuming the first Workers AI token also
  // has Cloudflare Images segmentation permission.
  for(const account of shuffle(getCloudflareAccounts())){
    try{
      const form=new FormData();
      const blob=new Blob([imageBytes],{type:contentType||'image/jpeg'});
      form.append('image',blob,'pet-input.jpg');
      const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/images/v1/segment`;
      const res=await fetch(url,{
        method:'POST',
        headers:{'Authorization':`Bearer ${account.apiToken}`,'Accept':'image/png'},
        body:form,
        signal:requestSignal || AbortSignal.timeout(8000)
      });
      if(!res.ok)continue;
      const bytes=new Uint8Array(await res.arrayBuffer());
      const isPng=bytes.length>=8 &&
        bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 &&
        bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a;
      if(isPng)return {bytes,contentType:'image/png'};
    }catch(_){ }
  }
  return null;
}

export async function finalizePetImage(imageBytes,contentType,requestSignal=null){
  const segmented=await removePetImageBackground(imageBytes,contentType,requestSignal);
  if(segmented)return {
    imageDataUrl:`data:image/png;base64,${bytesToBase64(segmented.bytes)}`,
    backgroundRemoved:true,
    transparentPng:true
  };
  // Do not make the whole pet generator fail just because the optional Images
  // segmentation product is unavailable for the current Cloudflare token/account.
  // The generation prompt already requests an isolated no-background pet.
  const normalizedType=String(contentType||'image/jpeg').split(';')[0].toLowerCase();
  return {
    imageDataUrl:`data:${normalizedType};base64,${bytesToBase64(imageBytes)}`,
    backgroundRemoved:false,
    transparentPng:normalizedType==='image/png'
  };
}

export async function generatePetImage(body={},requestSignal=null){
  const name=String(body.name||'').trim().slice(0,60) || 'My Pet';
  const description=String(body.description||body.prompt||'').trim().slice(0,900);
  if(!description)return json({error:'Describe the pet you want to generate.',code:'pet_prompt_required'},400);
  const matchSiteStyle = body.matchSiteStyle !== false;
  const referencePet = String(body.referencePet||'').trim();
  const prompt=buildPetImagePrompt({name,description,matchSiteStyle,referencePet});
  const seed=Math.floor(Math.random()*2147483000)+1;
  const errors=[];

  const accounts=shuffle(getCloudflareAccounts());
  for(const account of accounts){
    try{
      const url=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/ai/run/${PET_IMAGE_MODEL}`;
      const signal=requestSignal || AbortSignal.timeout(35000);
      const res=await fetch(url,{
        method:'POST',
        headers:{
          'Authorization':`Bearer ${account.apiToken}`,
          'Content-Type':'application/json',
          'Accept':'application/json,image/jpeg,image/png,*/*'
        },
        body:JSON.stringify({prompt,seed,steps:8}),
        signal
      });
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'').toLowerCase();
        if(contentType.startsWith('image/')){
          const bytes=new Uint8Array(await res.arrayBuffer());
          if(bytes.length){
            // Return the generated pet immediately. Background removal is a best-effort
            // enhancement and must never hold the serverless request open long enough
            // to turn a successful generation into a Vercel 504.
            const finalImage=await finalizePetImage(bytes,contentType.split(';')[0],requestSignal);
            return json({
              ok:true,name,description,
              imageDataUrl:finalImage.imageDataUrl,
              backgroundRemoved:finalImage.backgroundRemoved,
              transparentPng:finalImage.transparentPng,
              provider:'Cloudflare Workers AI',model:PET_IMAGE_MODEL,referencePet,matchSiteStyle
            });
          }
        }else{
          const payload=await safeJsonResponse(res);
          const image=extractCloudflareImageBase64(payload);
          if(image){
            const finalImage=await finalizePetImage(Uint8Array.from(atob(image),ch=>ch.charCodeAt(0)),'image/jpeg',requestSignal);
            return json({
              ok:true,
              name,
              description,
              imageDataUrl:finalImage.imageDataUrl,
              backgroundRemoved:finalImage.backgroundRemoved,
              transparentPng:finalImage.transparentPng,
              provider:'Cloudflare Workers AI',
              model:PET_IMAGE_MODEL,
              referencePet,
              matchSiteStyle
            });
          }
        }
        errors.push('Cloudflare returned no usable image data.');
      }else{
        errors.push(`Cloudflare HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
      }
    }catch(e){
      if(requestSignal?.aborted)return json({error:'Pet generation cancelled.',code:'cancelled'},499);
      errors.push(`Cloudflare: ${String(e?.message||e).slice(0,220)}`);
    }
  }

  // Pollinations supports key rotation too. Configure POLLINATIONS_API_KEYS as
  // comma/newline-separated server-side keys; POLLINATIONS_API_KEY remains compatible.
  const pollinationsKeys=rotateProviderKeys('pollinations',parseKeys('POLLINATIONS_API_KEYS','POLLINATIONS_API_KEY'))
    .slice(0,API_GUARD.maxProviderCredentialsPerRequest);
  for(const pollinationsKey of pollinationsKeys){
    try{
      const url=`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=flux&width=512&height=512&seed=${seed}`;
      const res=await fetch(url,{
        headers:{'Authorization':`Bearer ${pollinationsKey}`,'Accept':'image/*'},
        signal:requestSignal || AbortSignal.timeout(35000)
      });
      if(res.ok){
        const contentType=(res.headers.get('content-type')||'image/jpeg').split(';')[0];
        const bytes=new Uint8Array(await res.arrayBuffer());
        if(bytes.length){
          const finalImage=await finalizePetImage(bytes,contentType,requestSignal);
          return json({
            ok:true,
            name,
            description,
            imageDataUrl:finalImage.imageDataUrl,
            backgroundRemoved:finalImage.backgroundRemoved,
            transparentPng:finalImage.transparentPng,
            provider:'Pollinations',
            model:'flux',
            referencePet,
            matchSiteStyle
          });
        }
        errors.push('Pollinations returned no usable image data.');
      }else{
        errors.push(`Pollinations HTTP ${res.status}: ${(await res.text().catch(()=>'' )).slice(0,220)}`);
      }
    }catch(e){
      if(requestSignal?.aborted)return json({error:'Pet generation cancelled.',code:'cancelled'},499);
      errors.push(`Pollinations: ${String(e?.message||e).slice(0,220)}`);
    }
  }

  if(!accounts.length&&!pollinationsKeys.length){
    return json({
      error:'No pet image generator is configured.',
      detail:'Configure Cloudflare Workers AI credentials (CLOUDFLARE_ACCOUNTS or CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN) or POLLINATIONS_API_KEYS/POLLINATIONS_API_KEY in server environment variables.'
    },503);
  }

  return json({
    error:'Pet image generation is temporarily unavailable. Please try again.',
    code:'pet_generation_failed',
    detail:errors.slice(0,4).join(' | ').slice(0,900)
  },502);
}


