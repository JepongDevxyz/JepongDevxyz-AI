/* lib/chat/providers.js — split from api/chat.js (mechanical move, no behavior change). */
import { TOOL_FAMILY_GEMINI, TOOL_FAMILY_OPENAI, recordGeminiFunctionCall, toolsForFamily } from '../tools/index.js';
import { API_GUARD, JD_CHAT_BUDGET_MS, PROVIDERS, chatUpstreamTimeoutMs } from './config.js';
import { buildOpenAIMessages, buildOpenAIVisionMessages } from './context.js';
import { effortOutputBudgetFor, geminiThinkingConfig, nativeEffortFields } from './effort.js';
import { configured, getCloudflareAccounts, getProviderKeys, modelLabel, providerCredentials, providerLabel } from './keys.js';
import { DYNAMIC_MODEL_PROVIDERS } from './models.js';
import { temperatureFor } from './prompts.js';
import { cleanUpstreamError } from './sanitize.js';
import { captureProviderStreamError, cohereStreamToText, isRetryableStatus, openAIStreamToText, passthroughHeaders, retryLabel, shouldRetryProviderCredential } from './stream.js';
import { json, providerLifecycleActivity, shuffle } from './utils.js';

async function runGemini({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant',unifiedTools=null,toolContents=null}) {
  const keys = providerCredentials(getProviderKeys('gemini',autoFallback),autoFallback);
  if (!keys.length) return {ok:false,status:500,error:'Gemini API key is not configured.'};
  const target = PROVIDERS.gemini.models.includes(model) ? model : PROVIDERS.gemini.defaultModel;

  const currentParts=[];
  if(Array.isArray(files)){
    for(const f of files){
      if(!f?.data||!f?.mimeType)continue;
      const mime=String(f.mimeType).toLowerCase();
      if(mime.startsWith('image/')||mime.startsWith('video/')){
        currentParts.push({inline_data:{mime_type:f.mimeType,data:f.data}});
      }
    }
  }
  if(message?.trim()) currentParts.push({text:message.trim()});
  const contents=[];
  for(const h of history||[]) {
    const role=h.role==='bot'||h.role==='model'?'model':'user';
    const text=h.text || (Array.isArray(h.parts) ? h.parts.map(p=>p.text||'').join('\n') : '');
    if(text?.trim()) contents.push({role,parts:[{text:text.trim()}]});
  }
  if(currentParts.length && contents.at(-1)?.role==='user') contents.pop();
  if(currentParts.length) contents.push({role:'user',parts:currentParts});
  const requestContents=toolContents||contents;
  if(!requestContents.length) return {ok:false,status:400,error:'No prompt provided.'};
  // Unified tools: same canonical tools, translated to Gemini functionDeclarations.
  const nativeTools=unifiedTools?toolsForFamily(TOOL_FAMILY_GEMINI,unifiedTools):null;

  const generationConfig={
    maxOutputTokens:effortOutputBudgetFor(message,responseEffort),
    temperature:temperatureFor(message,files)
  };
  const thinkingConfig=geminiThinkingConfig(target,responseEffort);
  if(thinkingConfig)generationConfig.thinkingConfig=thinkingConfig;

  let last=''; let status=500;
  for(let i=0;i<keys.length;i++) {
    providerLifecycleActivity(emit,{
      provider:'gemini',model:target,state:'running',phase:'connecting',
      attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
    });
    try {
      const geminiBody={system_instruction:{parts:[{text:systemInstruction}]},contents:requestContents,generationConfig};
      if(nativeTools) geminiBody.tools=nativeTools;
      let res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(target)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(keys[i])}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(geminiBody),signal:AbortSignal.timeout(90000)
      });
      // Current Gemini 3 models support thinkingLevel. If a future alias/model
      // rejects the native knob, keep the selected Jepong effort via the shared
      // system instruction and retry once without thinkingConfig.
      if(!res.ok && [400,422].includes(res.status) && generationConfig.thinkingConfig){
        const compatibleConfig={...generationConfig};
        delete compatibleConfig.thinkingConfig;
        const retryBody={system_instruction:{parts:[{text:systemInstruction}]},contents:requestContents,generationConfig:compatibleConfig};
        if(nativeTools) retryBody.tools=nativeTools;
        res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(target)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(keys[i])}`,{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(retryBody),signal:AbortSignal.timeout(90000)
        });
      }
      if(res.ok) {
        providerLifecycleActivity(emit,{
          provider:'gemini',model:target,state:'completed',phase:'connected',
          attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
        });
        const decoder=new TextDecoder(), encoder=new TextEncoder();
        const finishState={reason:'',toolFamily:TOOL_FAMILY_GEMINI,nativeMessages:requestContents};
        const stream=res.body.pipeThrough(new TransformStream({
          start(){this.buffer='';},
          transform(chunk,controller){
            this.buffer+=decoder.decode(chunk,{stream:true});
            const lines=this.buffer.split('\n');this.buffer=lines.pop()||'';
            for(const line of lines){
              const t=line.trim();if(!t.startsWith('data:'))continue;
              try{
                const p=JSON.parse(t.slice(5).trim());
                if(p?.error){captureProviderStreamError(finishState,p.error);continue;}
                const candidate=p.candidates?.[0];
                if(candidate?.finishReason) finishState.reason=String(candidate.finishReason).toLowerCase();
                for(const part of candidate?.content?.parts||[]){
                  if(part.text) controller.enqueue(encoder.encode(part.text));
                  // Unified tools: capture native function calls.
                  if(part.functionCall) recordGeminiFunctionCall(finishState,part.functionCall);
                }
              }catch(_){}
            }
          },
          flush(){if(!finishState.reason)finishState.reason='unknown';}
        }));
        return {ok:true,response:new Response(stream,{headers:passthroughHeaders(res,'gemini',target,fallbackFrom,routedReason,i,keys.length)}),finishState};
      }
      status=res.status; last=await res.text().catch(()=>`Gemini ${status}`);
      const canRetry=isRetryableStatus(status)&&i<keys.length-1;
      providerLifecycleActivity(emit,{
        provider:'gemini',model:target,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
        detail:retryLabel('gemini',status,canRetry),attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
      });
      if(!shouldRetryProviderCredential(status,last)) break;
    } catch(e) {
      status=502; last=e?.message||String(e);
      const canRetry=i<keys.length-1;
      providerLifecycleActivity(emit,{
        provider:'gemini',model:target,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
        detail:`Gemini connection timed out${canRetry?' — trying another credential':''}`,attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
      });
    }
  }
  return {ok:false,status,error:last||'Gemini unavailable'};
}

async function runCloudflare({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'}) {
  const accounts = providerCredentials(autoFallback?shuffle(getCloudflareAccounts()):getCloudflareAccounts(),autoFallback);
  if(!accounts.length) return {ok:false,status:500,error:'Cloudflare credentials are not configured.'};
  let target=PROVIDERS.cloudflare.models.includes(model)?model:PROVIDERS.cloudflare.defaultModel;
  const hasImage=Array.isArray(files)&&files.some(f=>f?.data&&f?.mimeType?.startsWith('image/'));
  if(hasImage&&target!=='@cf/google/gemma-4-26b-a4b-it'){
    if(!autoFallback)return {ok:false,status:415,error:'The selected Cloudflare model does not support this image request. Fallback is OFF; choose a vision-capable model manually.'};
    target='@cf/google/gemma-4-26b-a4b-it';
  }
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  if(hasImage){
    const last=messages.pop();
    const content=[{type:'text',text:last?.content||message||'Analyze this image.'}];
    for(const f of files)if(f?.data&&f?.mimeType?.startsWith('image/'))content.push({type:'image_url',image_url:{url:`data:${f.mimeType};base64,${f.data}`}});
    messages.push({role:'user',content});
  }

  let last=''; let status=500;
  for(let i=0;i<accounts.length;i++) {
    providerLifecycleActivity(emit,{
      provider:'cloudflare',model:target,state:'running',phase:'connecting',
      attemptIndex:i,attemptCount:accounts.length,attemptNoun:'account'
    });
    try {
      const a=accounts[i];
      const res=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(a.accountId)}/ai/v1/chat/completions`,{
        method:'POST',headers:{Authorization:`Bearer ${a.apiToken}`,'Content-Type':'application/json'},body:JSON.stringify({model:target,messages,stream:true,max_completion_tokens:effortOutputBudgetFor(message,responseEffort),temperature:temperatureFor(message,files)}),signal:AbortSignal.timeout(chatUpstreamTimeoutMs('generic'))
      });
      if(res.ok){
        providerLifecycleActivity(emit,{
          provider:'cloudflare',model:target,state:'completed',phase:'connected',
          attemptIndex:i,attemptCount:accounts.length,attemptNoun:'account'
        });
        const finishState={reason:''};
        return {ok:true,response:new Response(openAIStreamToText(res.body,finishState),{headers:passthroughHeaders(res,'cloudflare',target,fallbackFrom,routedReason,i,accounts.length)}),finishState};
      }
      status=res.status; last=await res.text().catch(()=>`Cloudflare ${status}`);
      const canRetry=isRetryableStatus(status)&&i<accounts.length-1;
      providerLifecycleActivity(emit,{
        provider:'cloudflare',model:target,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
        detail:retryLabel('cloudflare',status,canRetry),attemptIndex:i,attemptCount:accounts.length,attemptNoun:'account'
      });
      if(!isRetryableStatus(status)) break;
    }catch(e){
      status=502;last=e?.message||String(e);
      const canRetry=i<accounts.length-1;
      providerLifecycleActivity(emit,{
        provider:'cloudflare',model:target,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
        detail:`Cloudflare connection timed out${canRetry?' — trying another account':''}`,attemptIndex:i,attemptCount:accounts.length,attemptNoun:'account'
      });
    }
  }
  return {ok:false,status,error:last||'Cloudflare unavailable'};
}

function sanitizeCustomApiProfile(body){
  const p=body?.customApiProfile;if(!p||typeof p!=='object')return null;
  const rawKeys=[p.apiKey,...(Array.isArray(p.apiKeys)?p.apiKeys:String(p.apiKeys||'').split(/[\\n,]+/))];
  const apiKeys=[...new Set(rawKeys.map(x=>String(x||'').trim().slice(0,2048)).filter(x=>x.length>=8))].slice(0,API_GUARD.maxProviderCredentialsPerRequest);
  const apiKey=apiKeys[0]||'';
  let baseUrl=String(p.baseUrl||'').trim().slice(0,500);
  const name=String(p.name||'Custom API').trim().slice(0,80);
  const model=String(p.model||'auto').trim().slice(0,200)||'auto';
  if(!apiKey||!/^https:\/\//i.test(baseUrl))return null;
  baseUrl=baseUrl.replace(/\/$/,'');
  return {name,apiKey,apiKeys,baseUrl,model,autoLoadModels:p.autoLoadModels!==false};
}
async function runGenericCustomApi(profile,{history,message,systemInstruction,emit,autoFallback=false,responseEffort='Instant'}){
  const url=chatCompletionsUrl(profile.baseUrl,profile.baseUrl);
  const model=profile.model==='auto'?'auto':profile.model;
  const keys=providerCredentials(Array.isArray(profile.apiKeys)&&profile.apiKeys.length?profile.apiKeys:[profile.apiKey],autoFallback);
  let last=null;
  for(let i=0;i<keys.length;i++){
    try{
      const res=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+keys[i],'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify({model,messages:buildOpenAIMessages(history,message,systemInstruction),stream:true,max_tokens:effortOutputBudgetFor(message,responseEffort)}),signal:AbortSignal.timeout(chatUpstreamTimeoutMs('generic'))});
      if(!res.ok){last={ok:false,status:res.status,error:cleanUpstreamError(await res.text().catch(()=>''),res.status,'custom',model)};if([401,402,403,408,409,429,500,502,503,504].includes(res.status)&&i<keys.length-1)continue;return last;}
      const finishState={reason:'unknown'};return {ok:true,response:openAIStreamToText(res,profile.name,model,'','custom-api',i,keys.length,finishState),finishState};
    }catch(err){last={ok:false,status:502,error:err?.message||'Custom API unavailable'};if(i<keys.length-1)continue;}
  }
  return last||{ok:false,status:502,error:'Custom API unavailable'};
}

function chatCompletionsUrl(base,fallback){
  const raw=String(base||'').trim().replace(/\/$/,'');
  if(!raw)return fallback;
  if(/\/chat\/completions$/i.test(raw))return raw;
  if(/\/(?:openapi\/)?v1$/i.test(raw))return raw+'/chat/completions';
  return raw+'/v1/chat/completions';
}

// SEEKAI may return either a buffered OpenAI JSON response or SSE. Only mark a
// request successful after validating actual assistant text, not HTTP 200 alone.
function seekaiExtractReply(raw,contentType=''){
  const input=String(raw||'');
  if(/text\/html/i.test(contentType)||/^\s*(?:<!doctype|<html\b)/i.test(input))return {kind:'html',text:'',reason:''};
  const asText=entry=>typeof entry==='string'?entry:
    Array.isArray(entry)?entry.map(part=>typeof part==='string'?part:(typeof part?.text==='string'?part.text:typeof part?.content==='string'?part.content:'')).join(''):
    '';
  if(/^\s*data:/m.test(input)||/text\/event-stream/i.test(contentType)){
    let output='',finishReason='',errored=false;
    for(const line of input.split(/\r?\n/)){
      const part=line.trim();
      if(!part.startsWith('data:'))continue;
      const data=part.slice(5).trim();if(!data||data==='[DONE]')continue;
      let event;try{event=JSON.parse(data);}catch{continue;}
      if(event?.error){errored=true;break;}
      const choice=event?.choices?.[0];
      output+=asText(choice?.delta?.content??choice?.message?.content??event?.delta?.text);
      if(choice?.finish_reason)finishReason=String(choice.finish_reason);
    }
    return {kind:'sse',text:errored?'':output.trim(),reason:finishReason,errored};
  }
  let parsed;try{parsed=JSON.parse(input);}catch{return {kind:'invalid-json',text:'',reason:''};}
  const choice=parsed?.choices?.[0];
  return {kind:'json',text:asText(choice?.message?.content??choice?.text??parsed?.output_text).trim(),
    reason:String(choice?.finish_reason||''),errored:!!parsed?.error};
}

async function runSeekAI({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,customApiKeys=null,responseEffort='Instant'}){
  const keys=providerCredentials(Array.isArray(customApiKeys)&&customApiKeys.length?customApiKeys:getProviderKeys('seekai',autoFallback),autoFallback);
  if(!keys.length)return {ok:false,status:503,error:'SEEKAI_API_KEYS is not configured in Vercel.'};
  const selected=String(model||'').trim();
  const target=!selected||selected==='agent'?PROVIDERS.seekai.defaultModel:selected;
  if(!PROVIDERS.seekai.models.includes(target))return {ok:false,status:400,error:'This SEEKAI model is not in the six models allowed for the configured key: '+target};
  const endpoint=chatCompletionsUrl(process.env.SEEKAI_BASE_URL,'https://seekai.cc/v1/chat/completions');
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  let status=502,last='SEEKAI did not return an assistant response.';
  for(let i=0;i<keys.length;i++){
    providerLifecycleActivity(emit,{provider:'seekai',model:target,state:'running',
      phase:'connecting',attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'});
    try{
      // Buffered JSON avoids treating a 200 HTML page or an empty SSE stream as a reply.
      const upstream=await fetch(endpoint,{method:'POST',headers:{
        Authorization:'Bearer '+keys[i],'Content-Type':'application/json',Accept:'application/json'
      },body:JSON.stringify({model:target,messages,stream:false,max_tokens:Math.min(effortOutputBudgetFor(message,responseEffort),8192)}),
      signal:AbortSignal.timeout(85000)});
      status=upstream.status;
      const raw=await upstream.text();
      const parsed=seekaiExtractReply(raw,upstream.headers.get('content-type')||'');
      if(upstream.ok&&parsed.text){
        providerLifecycleActivity(emit,{provider:'seekai',model:target,state:'completed',phase:'connected',
          attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'});
        return {ok:true,response:new Response(parsed.text,{headers:passthroughHeaders(
          upstream,'seekai',target,fallbackFrom,routedReason,i,keys.length
        )}),finishState:{reason:parsed.reason||'stop'}};
      }
      if(parsed.kind==='html')last='SEEKAI returned an HTML page instead of an API response (HTTP '+status+').';
      else if(status===401||status===403)last='SEEKAI rejected the API credential (HTTP '+status+').';
      else if(status===402)last='SEEKAI account or model access is unavailable (HTTP 402).';
      else if(status===429)last='SEEKAI rate limit reached (HTTP 429).';
      else if(status===400||status===404||status===422)last='SEEKAI rejected model '+target+' or the request (HTTP '+status+'). Verify the model is in your live SEEKAI catalog.';
      else if(parsed.errored)last='SEEKAI returned an API error (HTTP '+status+').';
      else if(upstream.ok)last='SEEKAI returned HTTP 200 but no assistant text for '+target+'.';
      else last='SEEKAI API returned HTTP '+status+'.';
      // Retry only credential-specific or transient errors, never invent another model.
      const retry=i<keys.length-1 && ([401,403,408,429,500,502,503,504].includes(status));
      providerLifecycleActivity(emit,{provider:'seekai',model:target,state:retry?'warning':'error',
        phase:retry?'retry':'failed',detail:last,attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'});
      if(!retry)break;
    }catch(error){
      status=502;last=error?.name==='TimeoutError'
        ?'SEEKAI request timed out before returning assistant text.'
        :'SEEKAI request failed due to a network or response error.';
      const retry=i<keys.length-1;
      providerLifecycleActivity(emit,{provider:'seekai',model:target,state:retry?'warning':'error',
        phase:retry?'retry':'failed',detail:last,attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'});
      if(!retry)break;
    }
  }
  return {ok:false,status,error:last};
}

async function runOpenAICompatible(provider,{model,history,files=[],message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,customApiKeys=null,visionPayload=false,responseEffort='Instant',unifiedTools=null,toolMessages=null}) {
  const cfg={
    groq:{url:'https://api.groq.com/openai/v1/chat/completions'},
    openrouter:{url:'https://openrouter.ai/api/v1/chat/completions'},
    mistral:{url:'https://api.mistral.ai/v1/chat/completions'},
    unorouter:{url:chatCompletionsUrl(process.env.UNOROUTER_BASE_URL,'https://api.unorouter.com/v1/chat/completions')},
    nvidia:{url:'https://integrate.api.nvidia.com/v1/chat/completions'},
    codecraft:{url:'https://www.codecraftapi.com/v1/chat/completions'},
    hcnsec:{url:'https://api.hcnsec.cn/v1/chat/completions'},
    seekai:{url:chatCompletionsUrl(process.env.SEEKAI_BASE_URL,'https://seekai.cc/v1/chat/completions')},
    bailucode:{url:'https://bailucode.com/openapi/v1/chat/completions'}
  }[provider];
  if(!cfg) return {ok:false,status:400,error:'Unsupported provider.'};

  const requestKeys=Array.isArray(customApiKeys)?customApiKeys:[];
  const keys=providerCredentials(requestKeys.length?requestKeys:getProviderKeys(provider,autoFallback),autoFallback);
  if(!keys.length) return {ok:false,status:500,error:`${providerLabel(provider)} API key is not configured.`};
  // P0/A1: bound the key-rotation loop to the time budget — during a
  // provider outage every key would otherwise hang for the full upstream
  // timeout, blowing the Hobby 25s wall.
  const keyLoopStart=Date.now();

  const suppliedModel=String(model||'').trim();
  const requested=(DYNAMIC_MODEL_PROVIDERS.has(provider) && suppliedModel)
    ? suppliedModel
    : (PROVIDERS[provider].models.includes(suppliedModel)?suppliedModel:PROVIDERS[provider].defaultModel);
  const messages=toolMessages
    ?toolMessages
    :(visionPayload
      ?buildOpenAIVisionMessages(history,message,systemInstruction,files)
      :buildOpenAIMessages(history,message,systemInstruction));
  // Unified tools: same canonical tools on every model, translated to the
  // provider's native function-calling format.
  const nativeTools=unifiedTools?toolsForFamily(TOOL_FAMILY_OPENAI,unifiedTools):null;
  let modelCandidates=[requested];

  // Compatible model substitution is allowed only when the user enabled fallback.
  if(autoFallback){
    if(provider==='groq' && requested==='qwen/qwen3.8-27b'){
      modelCandidates=['qwen/qwen3.8-27b','qwen/qwen3.6-27b','openai/gpt-oss-120b'];
    } else if(provider==='groq' && requested==='qwen/qwen3.6-27b'){
      modelCandidates=['qwen/qwen3.6-27b','openai/gpt-oss-120b'];
    } else if(provider==='groq' && requested==='openai/gpt-oss-120b'){
      modelCandidates=['openai/gpt-oss-120b','qwen/qwen3.6-27b'];
    }

    if(provider==='mistral' && requested==='mistral-small-latest'){
      modelCandidates=['mistral-small-latest','ministral-14b-latest','ministral-8b-latest'];
    } else if(provider==='mistral' && requested==='ministral-14b-latest'){
      modelCandidates=['ministral-14b-latest','mistral-small-latest'];
    } else if(provider==='mistral' && requested==='codestral-latest'){
      modelCandidates=['codestral-latest','mistral-small-latest'];
    }

    if(provider==='openrouter' && requested!=='openrouter/free'){
      modelCandidates=[requested,'openrouter/free'];
    }

    if(provider==='mistral' && requested==='mistral-small-latest'){
      modelCandidates=['mistral-small-latest','mistral-small-3.2-24b-instruct-2506'];
    }
  }

  let last='';
  let status=500;
  let lastTarget=requested;

  for(let mi=0; mi<modelCandidates.length; mi++){
    const target=modelCandidates[mi];
    lastTarget=target;

    for(let i=0;i<keys.length;i++){
      if(Date.now()-keyLoopStart>JD_CHAT_BUDGET_MS-8000) break; // P0/A1: time budget
      const substituted=target!==requested;
      providerLifecycleActivity(emit,{
        provider,model:requested,state:'running',phase:'connecting',
        attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential',
        fallbackModel:substituted?target:''
      });

      const headers={
        Authorization:`Bearer ${keys[i]}`,
        'Content-Type':'application/json',
        'Accept':'text/event-stream'
      };
      if(provider==='codecraft') headers['x-api-key']=keys[i];
      if(provider==='openrouter'){
        headers['HTTP-Referer']=process.env.SITE_URL || 'https://jepongdevxyz.ai';
        headers['X-Title']='JepongDevxyz AI';
      }

      const upstreamTimeoutMs=chatUpstreamTimeoutMs(provider);
      try{
        const payload={
          model:target,
          messages,
          stream:true,
          max_tokens:effortOutputBudgetFor(message,responseEffort),
          temperature:temperatureFor(message,files),
          ...nativeEffortFields(provider,target,responseEffort)
        };
        if(nativeTools) payload.tools=nativeTools;
        if(provider==='groq' && /^(?:openai\/gpt-oss-(?:20b|120b)|qwen\/qwen3\.8-27b)$/i.test(target)){
          payload.max_completion_tokens=payload.max_tokens;
          delete payload.max_tokens;
        }

        // Keep the upstream request inside the serverless execution budget.
        // A 120s provider timeout can outlive the hosting request and surface as a
        // generic "operation was aborted" after the model has already done work.
        let res=await fetch(cfg.url,{
          method:'POST',
          headers,
          body:JSON.stringify(payload),
          signal:AbortSignal.timeout(upstreamTimeoutMs)
        });

        const nativeFields=nativeEffortFields(provider,target,responseEffort);
        if(!res.ok && [400,422].includes(res.status) && (Object.keys(nativeFields).length||payload.tools)){
          // Some OpenAI-compatible gateways do not expose their upstream model's
          // native reasoning fields, or reject the tools parameter. Retry without
          // only those optional fields; the six-level Jepong effort still remains
          // active through the shared system instruction and effort-scaled
          // generation budget. Tool-less models keep working via the pipeline.
          const compatiblePayload={...payload};
          for(const key of Object.keys(nativeFields))delete compatiblePayload[key];
          delete compatiblePayload.tools;
          res=await fetch(cfg.url,{
            method:'POST',
            headers,
            body:JSON.stringify(compatiblePayload),
            signal:AbortSignal.timeout(upstreamTimeoutMs)
          });
        }

        if(res.ok){
          providerLifecycleActivity(emit,{
            provider,model:requested,state:'completed',phase:'connected',
            attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential',
            fallbackModel:substituted?target:''
          });
          const finishState={reason:'',toolFamily:TOOL_FAMILY_OPENAI,nativeMessages:messages};
          return {
            ok:true,
            response:new Response(
              openAIStreamToText(res.body,finishState),
              {headers:passthroughHeaders(
                res,provider,target,
                fallbackFrom || (substituted?requested:''),
                routedReason || (substituted?'model-fallback':''),
                i,keys.length
              )}
            ),
            finishState
          };
        }

        status=res.status;
        const raw=await res.text().catch(()=>`${provider} ${status}`);
        last=cleanUpstreamError(raw,status,provider,target);

        const hasAnotherKey=i<keys.length-1;
        const hasAnotherModel=autoFallback && mi<modelCandidates.length-1;
        const canRetry=hasAnotherKey||hasAnotherModel;
        providerLifecycleActivity(emit,{
          provider,model:requested,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
          detail:last.slice(0,180) || retryLabel(provider,status,canRetry),
          attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential',
          fallbackModel:substituted?target:''
        });

        if(!hasAnotherKey && !hasAnotherModel) break;
      }catch(e){
        const timedOut=e?.name==='TimeoutError'||/timed?\s*out|timeout|aborted due to timeout/i.test(String(e?.message||e));
        status=timedOut?504:502;
        last=timedOut?`${providerLabel(provider)} did not start/finish the upstream response within ${Math.round(upstreamTimeoutMs/1000)}s.`:(e?.message||String(e));
        const hasAnotherKey=i<keys.length-1;
        const hasAnotherModel=autoFallback && mi<modelCandidates.length-1;
        const canRetry=hasAnotherKey||hasAnotherModel;
        providerLifecycleActivity(emit,{
          provider,model:requested,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
          detail:`${providerLabel(provider)} connection timed out${hasAnotherKey?' — rotating credential':hasAnotherModel?' — trying fallback model':''}`,
          attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential',
          fallbackModel:substituted?target:''
        });
      }
    }

    if(!autoFallback) break;
  }

  return {ok:false,status,error:last||`${providerLabel(provider)} unavailable for ${modelLabel(lastTarget)}`};
}

async function runCohere({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'}) {
  const keys=providerCredentials(autoFallback?shuffle(getProviderKeys('cohere')):getProviderKeys('cohere',false),autoFallback);
  if(!keys.length)return {ok:false,status:500,error:'Cohere API key is not configured.'};
  const target=PROVIDERS.cohere.models.includes(model)?model:PROVIDERS.cohere.defaultModel;
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  let last='';let status=500;
  for(let i=0;i<keys.length;i++) {
    providerLifecycleActivity(emit,{
      provider:'cohere',model:target,state:'running',phase:'connecting',
      attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
    });
    try{
      const res=await fetch('https://api.cohere.com/v2/chat',{method:'POST',headers:{Authorization:`Bearer ${keys[i]}`,'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify({model:target,messages,stream:true,max_tokens:effortOutputBudgetFor(message,responseEffort),temperature:temperatureFor(message,[])}),signal:AbortSignal.timeout(chatUpstreamTimeoutMs('generic'))});
      if(res.ok){
        providerLifecycleActivity(emit,{
          provider:'cohere',model:target,state:'completed',phase:'connected',
          attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
        });
        const finishState={reason:''};
        return {ok:true,response:new Response(cohereStreamToText(res.body,finishState),{headers:passthroughHeaders(res,'cohere',target,fallbackFrom,routedReason,i,keys.length)}),finishState};
      }
      status=res.status;last=await res.text().catch(()=>`Cohere ${status}`);
      const canRetry=isRetryableStatus(status)&&i<keys.length-1;
      providerLifecycleActivity(emit,{
        provider:'cohere',model:target,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
        detail:retryLabel('cohere',status,canRetry),attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
      });
      if(!shouldRetryProviderCredential(status,last))break;
    }catch(e){
      status=502;last=e?.message||String(e);
      const canRetry=i<keys.length-1;
      providerLifecycleActivity(emit,{
        provider:'cohere',model:target,state:canRetry?'warning':'error',phase:canRetry?'retry':'failed',
        detail:`Cohere connection timed out${canRetry?' — rotating credential':''}`,attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
      });
    }
  }
  return {ok:false,status,error:last||'Cohere unavailable'};
}

export { runGemini, runCloudflare, sanitizeCustomApiProfile, runGenericCustomApi, chatCompletionsUrl, seekaiExtractReply, runSeekAI, runOpenAICompatible, runCohere };
