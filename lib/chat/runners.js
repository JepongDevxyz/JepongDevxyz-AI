// JEPONGDEVXYZ AI — Provider runners (runGemini, runCloudflare, etc.)
// Extracted from api/chat.js (lines 4156-5424)

import { TOOL_FAMILY_OPENAI, TOOL_FAMILY_GEMINI, TOOL_FAMILY_ANTHROPIC, toolsForFamily, recordGeminiFunctionCall, accumulateAnthropicEvent } from '../tools/index.js';
import { chatUpstreamTimeoutMs } from './providers.js';
import { activity, configured, effortOutputBudgetFor, geminiThinkingConfig, getBailuAnthropicKeys, getCloudflareAccounts, getProviderKeys, json, modelLabel, nativeEffortFields, providerCredentials, providerLabel, providerLifecycleActivity, responseEffortPolicy, responseEffortRank, sanitizeCustomProviderKeys, shuffle } from './guard.js';
import { isVisualWebUiRequest, normalizeIntentText } from './helpfulness.js';
import { cleanUpstreamError, readInternalProviderText, temperatureFor } from './orchestrator.js';
export async function runGemini({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant',unifiedTools=null,toolContents=null}) {
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

export async function runCloudflare({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'}) {
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

export function sanitizeCustomApiProfile(body){
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
export async function runGenericCustomApi(profile,{history,message,systemInstruction,emit,autoFallback=false,responseEffort='Instant'}){
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

export function chatCompletionsUrl(base,fallback){
  const raw=String(base||'').trim().replace(/\/$/,'');
  if(!raw)return fallback;
  if(/\/chat\/completions$/i.test(raw))return raw;
  if(/\/(?:openapi\/)?v1$/i.test(raw))return raw+'/chat/completions';
  return raw+'/v1/chat/completions';
}


// SEEKAI may return either a buffered OpenAI JSON response or SSE. Only mark a
// request successful after validating actual assistant text, not HTTP 200 alone.
export function seekaiExtractReply(raw,contentType=''){
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

export async function runSeekAI({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,customApiKeys=null,responseEffort='Instant'}){
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

export async function runOpenAICompatible(provider,{model,history,files=[],message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,customApiKeys=null,visionPayload=false,responseEffort='Instant',unifiedTools=null,toolMessages=null}) {
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

export async function runCohere({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'}) {
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

export const AIHORDE_ANONYMOUS_KEY='0000000000';
export const AIHORDE_CLIENT_AGENT='JepongDevxyz-AI:1.0:https://github.com/JepongDevxyz/JepongDevxyz-AI';
export const AIHORDE_BLOCKED_MODEL_PATTERNS=[/nsfw/i,/hentai/i,/porn/i,/erotic/i,/sexual/i,/\bsex\b/i,/\badult\b/i,/\berp\b/i,/explicit/i,/fetish/i];

export function isAllowedAIHordeModelName(name=''){
  const value=String(name||'').trim();
  return Boolean(value) && !AIHORDE_BLOCKED_MODEL_PATTERNS.some(rx=>rx.test(value));
}

export function numericModelSizeHint(name=''){
  const values=[...String(name).matchAll(/(?:^|[^0-9])(\d{1,3})\s*[bB](?:\b|[^a-z])/g)]
    .map(m=>Number(m[1]))
    .filter(Number.isFinite);
  return values.length?Math.max(...values):0;
}

export async function getAIHordeActiveModels(signal){
  const res=await fetch('https://aihorde.net/api/v2/status/models?type=text',{
    signal,
    headers:{Accept:'application/json','Client-Agent':AIHORDE_CLIENT_AGENT}
  });
  if(!res.ok) throw new Error(`AI Horde model status returned HTTP ${res.status}`);
  const data=await res.json();
  if(!Array.isArray(data)) throw new Error('Unexpected AI Horde model status response');
  return data
    .filter(item=>item&&isAllowedAIHordeModelName(item.name))
    .map(item=>({
      name:String(item.name),
      workers:Number(item.count??item.workers??item.threads??0)||0,
      queued:Number(item.queued??0)||0,
      jobs:Number(item.jobs??0)||0,
      eta:item.eta!=null&&Number.isFinite(Number(item.eta))?Number(item.eta):null,
      performance:Number(item.performance??0)||0
    }));
}

export function scoreAIHordeModel(item,message='',sourceModel=''){
  const name=String(item?.name||'');
  const lower=name.toLowerCase();
  const prompt=`${normalizeIntentText(message)} ${String(sourceModel||'').toLowerCase()}`;
  const coding=/\b(code|coding|debug|javascript|html|css|python|node|api|typescript|php|java|react|sql|github|vercel|backend|frontend)\b/i.test(prompt);
  const reasoning=/\b(reason|reasoning|logic|strategy|plan|complex|architecture|analysis|research|compare|math)\b/i.test(prompt);
  const size=numericModelSizeHint(name);
  const workers=Math.max(0,Number(item?.workers)||0);
  const eta=Math.max(0,Number(item?.eta)||0); // AI Horde publishes queue-clear ETA in seconds.
  const queued=Math.max(0,Number(item?.queued)||0);
  const throughput=Math.max(0,Number(item?.performance)||0);
  // Prior formula rewarded worker count 25x more than ETA; it selected huge queues.
  // Prefer workers already available, lower queue ETA, and adequate model capability.
  let score=Math.log2(workers+1)*38 + Math.min(throughput,250)*0.34;
  score-=Math.min(eta,240)*4.2;
  score-=Math.min(queued/Math.max(1,workers),150)*1.6;
  if(coding && /(qwen|coder|code|deepseek|nemotron|llama)/i.test(lower))score+=48;
  if(reasoning && /(qwen|gemma|nemotron|llama|anubis|behemoth)/i.test(lower))score+=40;
  if(size>=70)score+=coding||reasoning?40:12;
  else if(size>=24)score+=28;
  else if(size>=7)score+=18;
  else if(size>0)score+=4;
  return score;
}

// Live four-slot AI Horde picker: no static model IDs or hidden Auto entry.
// A current worker count and low published ETA are availability estimates,
// NOT a guarantee that a particular generation will finish quickly.
export function fourResponsiveAIHordeModels(models,preferred=[]){
  const list=(Array.isArray(models)?models:[])
    .filter(m=>isAllowedAIHordeModelName(m?.name)&&Number(m?.workers)>0&&
      m?.eta!=null&&Number.isFinite(Number(m.eta))&&Number(m.eta)>=0&&Number(m.eta)<=60);
  const deduped=[...new Map(list.map(m=>[String(m.name),m])).values()];
  const ranked=deduped.sort((a,b)=>
    scoreAIHordeModel(b,'Hi')-scoreAIHordeModel(a,'Hi')||
    Number(a.eta)-Number(b.eta)||String(a.name).localeCompare(String(b.name))
  );
  // Keep the same four named slots between picker visits while each model
  // still has a live worker and a short reported queue. Replace only offline
  // or slow entries; never display a stale model just to fill four slots.
  const pinned=[...new Set((Array.isArray(preferred)?preferred:[])
    .slice(0,4).filter(x=>typeof x==='string').map(x=>x.trim()).filter(Boolean))];
  const retained=pinned.map(name=>ranked.find(m=>m.name===name)).filter(Boolean);
  return [...retained,...ranked.filter(m=>!retained.some(old=>old.name===m.name))].slice(0,4);
}

export async function checkAIHordeCredential(key){
  if(!key)return 'missing';
  if(key===AIHORDE_ANONYMOUS_KEY)return 'anonymous';
  try{
    // Native first-party credential lookup: do not return the account, key, or raw error.
    const result=await fetch('https://aihorde.net/api/v2/find_user',{
      method:'GET',headers:{apikey:key,Accept:'application/json','Client-Agent':AIHORDE_CLIENT_AGENT},
      signal:AbortSignal.timeout(7500)
    });
    if(result.ok)return 'valid';
    if([401,403,404].includes(result.status))return 'rejected';
    return 'unverified';
  }catch(_){return 'unverified';}
}

export async function liveAIHordePickerModels(preferred=[]){
  const firstKey=getProviderKeys('aihorde',false).find(key=>key!==AIHORDE_ANONYMOUS_KEY)||'';
  const [keyStatus,modelsResult]=await Promise.all([
    checkAIHordeCredential(firstKey),
    getAIHordeActiveModels(AbortSignal.timeout(9000))
      .then(active=>({ok:true,active})).catch(()=>({ok:false,active:[]}))
  ]);
  const models=fourResponsiveAIHordeModels(modelsResult.active,preferred).map(item=>({
    id:item.name,name:item.name,workers:item.workers,etaSeconds:item.eta,
    queued:item.queued,online:true
  }));
  return {status:modelsResult.ok?(models.length?'ready':'no-fast-workers'):'unavailable',
    models,keyStatus,checkedAt:new Date().toISOString(),source:'AI Horde native text worker status',
    error:modelsResult.ok?'':'Could not verify live AI Horde worker availability. Please retry.'};
}

export function summarizeAIHordeError(status, data, raw=''){
  const combined=`${data?.error?.message||''} ${data?.message||''} ${raw||''}`.replace(/\s+/g,' ').trim();
  const lower=combined.toLowerCase();
  if(/no user matching sent api key/.test(lower)) return 'AI Horde rejected this credential.';
  if(/api key is not configured/.test(lower)) return 'AI Horde is not configured on the server yet.';
  if(status===401||status===403) return 'AI Horde rejected the current credential.';
  if(status===429) return 'AI Horde rate limit reached.';
  if(status>=500) return 'AI Horde is temporarily unavailable.';
  return combined || `AI Horde ${status}`;
}

export function isAIHordeCredentialFailure(status,error=''){
  const code=Number(status)||0;
  const text=String(error||'').toLowerCase();
  return [401,403,406].includes(code) || /no user matching sent api key|invalid api key|credential was rejected|unauthorized|forbidden/.test(text);
}

export async function resolveAIHordeModels(requested='auto',message='',signal){
  const models=await getAIHordeActiveModels(signal);
  if(!models.length) return [];
  if(requested && requested!=='auto'){
    const exact=models.find(x=>x.name===requested);
    return exact?[exact]:[];
  }
  // Auto selects active models using real queue ETA/worker data, not hard-coded IDs.
  // Avoid long queues when at least one model has a short published ETA; retain
  // a small fallback shortlist inside AI Horde for transient worker failures.
  const active=models.filter(x=>(Number(x.workers)||0)>0);
  const shortQueue=active.filter(x=>(Number(x.eta)||0)<=35);
  const ranked=[...(shortQueue.length?shortQueue:active)]
    .sort((a,b)=>scoreAIHordeModel(b,message,requested)-scoreAIHordeModel(a,message,requested));
  // Keep a slower candidate only if there are fewer than three low-queue models.
  if(shortQueue.length){
    for(const item of active.sort((a,b)=>scoreAIHordeModel(b,message,requested)-scoreAIHordeModel(a,message,requested))){
      if(ranked.length>=3)break;
      if(!ranked.some(x=>x.name===item.name))ranked.push(item);
    }
  }
  return ranked.slice(0,3);
}

export function isAIHordeGenerationFailure(status,error=''){
  const code=Number(status)||0;
  const text=String(error||'').toLowerCase();
  return code===408 || code===429 || code>=500 ||
    /not enough generations|no generations|no generation|worker|queue|timed? ?out|timeout|unavailable|busy|faulted|aborted/.test(text);
}

export function aiHordeNativePrompt(messages){
  const transcript=(Array.isArray(messages)?messages:[]).map(m=>{
    const role=m?.role==='system'?'System':m?.role==='assistant'?'Assistant':'User';
    return role+': '+(typeof m?.content==='string'?m.content:'');
  }).join('\n\n');
  return transcript.slice(-14000)+'\n\nAssistant:';
}

export async function aiHordeNativeTextRequest({key,model,messages,maxTokens=256,timeoutMs=44000}){
  const base='https://aihorde.net/api/v2/generate/text/';
  const headers={apikey:key,Accept:'application/json','Content-Type':'application/json','Client-Agent':AIHORDE_CLIENT_AGENT};
  const deadline=Date.now()+timeoutMs;
  let id='',complete=false;
  try{
    const submit=await fetch(base+'async',{
      method:'POST',headers,body:JSON.stringify({
        prompt:aiHordeNativePrompt(messages),
        models:[model],nsfw:false,slow_workers:false,
        params:{max_context_length:2048,max_length:Math.max(32,Math.min(640,Number(maxTokens)||256)),n:1}
      }),signal:AbortSignal.timeout(Math.min(12000,timeoutMs))
    });
    const data=await submit.json().catch(()=>({}));
    if(!submit.ok)return {ok:false,status:submit.status,error:summarizeAIHordeError(submit.status,data,'')};
    id=String(data?.id||'');
    if(!/^[a-z0-9-]{8,80}$/i.test(id))return {ok:false,status:502,error:'AI Horde accepted the request without a valid job ID.'};
    while(Date.now()<deadline-1500){
      const remain=deadline-Date.now();
      const statusResponse=await fetch(base+'status/'+encodeURIComponent(id),{
        method:'GET',headers:{apikey:key,Accept:'application/json','Client-Agent':AIHORDE_CLIENT_AGENT},
        signal:AbortSignal.timeout(Math.min(8000,Math.max(1000,remain-800)))
      });
      const result=await statusResponse.json().catch(()=>({}));
      if(!statusResponse.ok)return {ok:false,status:statusResponse.status,
        error:summarizeAIHordeError(statusResponse.status,result,'')};
      if(result?.done===true){
        complete=true;
        const text=typeof result?.generations?.[0]?.text==='string'?result.generations[0].text.trim():'';
        return text?{ok:true,status:200,text:text.replace(/^(?:Assistant\s*:\s*)/i,'').trim()}:
          {ok:false,status:502,error:'AI Horde finished without assistant text.'};
      }
      if(result?.faulted===true||result?.is_possible===false)
        return {ok:false,status:503,error:'The selected AI Horde model is unable to complete this request right now.'};
      const ms=Math.min(1800,Math.max(0,deadline-Date.now()-1500));
      if(ms>0)await new Promise(resolve=>setTimeout(resolve,ms));
    }
    return {ok:false,status:504,error:'AI Horde model did not finish within the response time limit.'};
  }catch(error){
    return {ok:false,status:504,error:error?.name==='TimeoutError'?'AI Horde model timed out.':'AI Horde native text API request failed.'};
  }finally{
    if(id&&!complete){
      // Prevent slow queued jobs from consuming resources after the chat has timed out.
      try{await fetch(base+'status/'+encodeURIComponent(id),{method:'DELETE',
        headers:{apikey:key,'Client-Agent':AIHORDE_CLIENT_AGENT},signal:AbortSignal.timeout(1800)});}
      catch(_){}
    }
  }
}

export async function runAIHordeNativeSelected({model,history,files,message,systemInstruction,
    fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'},{anonymous=false}={}){
  const stored=anonymous?[]:getProviderKeys('aihorde',autoFallback).filter(k=>k!==AIHORDE_ANONYMOUS_KEY);
  const keys=anonymous?[AIHORDE_ANONYMOUS_KEY]:stored;
  if(!keys.length)return {ok:false,status:503,error:'AI Horde API key is not configured. Anonymous fallback is OFF.'};
  if(Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/')&&f?.data))
    return {ok:false,status:415,error:'AI Horde text models cannot directly process image attachments.'};
  let initial;
  try{initial=await resolveAIHordeModels(model,message,AbortSignal.timeout(9000));}
  catch(_){return {ok:false,status:503,error:'Cannot verify the selected AI Horde model is online.'};}
  if(!initial.length||Number(initial[0]?.workers)<=0)
    return {ok:false,status:503,error:'The selected AI Horde model is not currently online. Reopen the model picker.'};
  const models=[initial[0]];
  if(autoFallback){
    try{
      const fallbackModels=await resolveAIHordeModels('auto',message,AbortSignal.timeout(7000));
      for(const m of fallbackModels){
        if(models.length>=3)break;
        if(m.name!==model&&!models.some(x=>x.name===m.name))models.push(m);
      }
    }catch(_){}
  }
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  const runtimeProvider=anonymous?'aihorde-public':'aihorde';
  let last={ok:false,status:503,error:'AI Horde did not complete this request.'};
  for(let m=0;m<models.length;m++){
    for(let i=0;i<keys.length;i++){
      const key=keys[i],isAnonymous=key===AIHORDE_ANONYMOUS_KEY;
      providerLifecycleActivity(emit,{provider:runtimeProvider,model:models[m].name,
        state:'running',phase:'connecting',attemptIndex:i,attemptCount:keys.length,
        attemptNoun:isAnonymous?'anonymous route':'credential'});
      const auth=await checkAIHordeCredential(key);
      if(auth==='rejected'||auth==='missing'){
        last={ok:false,status:401,error:'AI Horde rejected the configured API key. Verify the first AIHORDE_API_KEYS entry in Vercel.'};
      }else{
        const ms=Math.max(18000,Math.min(47000,Number(models[m].eta||0)*1000+18000));
        const outcome=await aiHordeNativeTextRequest({key,model:models[m].name,messages,
          maxTokens:Math.min(
            effortOutputBudgetFor(message,responseEffort),
            [180,320,512,768,1024,1400][responseEffortRank(responseEffort)]||512
          ),timeoutMs:ms});
        if(outcome.ok&&outcome.text){
          providerLifecycleActivity(emit,{provider:runtimeProvider,model:models[m].name,
            state:'completed',phase:'connected',attemptIndex:i,attemptCount:keys.length,
            attemptNoun:isAnonymous?'anonymous route':'credential'});
          const headers=passthroughHeaders(null,runtimeProvider,models[m].name,fallbackFrom,
            isAnonymous?(routedReason||'aihorde-anonymous'):routedReason,i,keys.length);
          return {ok:true,response:new Response(outcome.text,{headers}),finishState:{reason:'stop'}};
        }
        last=outcome;
      }
      if(!autoFallback){
        providerLifecycleActivity(emit,{provider:runtimeProvider,model:models[m].name,
          state:'error',phase:'failed',detail:last.error,attemptIndex:i,attemptCount:keys.length});
        return last;
      }
    }
  }
  return last;
}

export async function runAIHorde({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'},{anonymous=false}={}){
  if(model&&model!=='auto')return runAIHordeNativeSelected({model,history,files,message,systemInstruction,fallbackFrom,routedReason,emit,autoFallback,responseEffort},{anonymous});
  const configuredKeys=anonymous?[]:providerCredentials(autoFallback?shuffle(getProviderKeys('aihorde')):getProviderKeys('aihorde',false),autoFallback).filter(k=>k!==AIHORDE_ANONYMOUS_KEY);
  // Anonymous is an independent, last-resort attempt invoked only by the
  // emergency fallback coordinator AFTER every registered Horde key fails.
  const keys=anonymous?[AIHORDE_ANONYMOUS_KEY]:configuredKeys;
  if(!keys.length)return {ok:false,status:503,error:'AI Horde API key is not configured. Anonymous fallback is OFF.'};
  const runtimeProvider=anonymous?'aihorde-public':'aihorde';
  const autoMode=!model||model==='auto';
  // A bounded overall budget avoids 70-80 second waits per anonymous/key attempt.
  // Explicitly chosen models keep the existing timeouts.
  const autoDeadline=autoMode?Date.now()+56000:Infinity;

  const hasImage=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/')&&f?.data);
  if(hasImage) return {ok:false,status:415,error:'AI Horde text route does not directly process image attachments.'};

  let candidates;
  try{
    candidates=await resolveAIHordeModels(model||'auto',message,AbortSignal.timeout(autoMode?7000:12000));
  }catch(e){
    return {ok:false,status:503,error:e?.message||'AI Horde model list is unavailable.'};
  }
  if(!candidates.length) return {ok:false,status:503,error:'No suitable AI Horde text model is currently active.'};
  if(!autoFallback)candidates=candidates.slice(0,1); // Auto chooses ONE active model; never switches on failure.

  const messages=buildOpenAIMessages(history,message,systemInstruction);
  let last='AI Horde could not complete a generation.'; let status=503;

  for(let m=0;m<candidates.length;m++){
    const resolved=candidates[m];
    for(let i=0;i<keys.length;i++){
      const remaining=autoDeadline-Date.now();
      if(autoMode&&remaining<3000){
        return {ok:false,status:504,error:'AI Horde Auto reached its quick-response time budget. No worker finished in time; retry shortly.'};
      }
      const attemptMs=autoMode
        ?Math.max(3000,Math.min(26000,remaining-1500))
        :null;
      const isAnonymousKey=keys[i]===AIHORDE_ANONYMOUS_KEY;
      providerLifecycleActivity(emit,{
        provider:runtimeProvider,model:resolved.name,state:'running',phase:'connecting',
        detail:m>0?`Trying another active AI Horde model: ${resolved.name}`:'',
        attemptIndex:i,attemptCount:keys.length,attemptNoun:isAnonymousKey?'anonymous route':'credential'
      });
      try{
        const res=await fetch('https://oai.aihorde.net/v1/chat/completions',{
          method:'POST',
          headers:{
            apikey:keys[i],
            Authorization:`Bearer ${keys[i]}`,
            'Content-Type':'application/json',
            'Client-Agent':AIHORDE_CLIENT_AGENT
          },
          body:JSON.stringify({
            model:resolved.name,
            stream:false,
            messages,
            max_tokens:autoMode
              ?Math.min(effortOutputBudgetFor(message,responseEffort),isAnonymousKey?768:(responseEffortRank(responseEffort)>=4?1536:1024),
                String(message||'').length<=150&&!/\b(code|program|source|implementation|essay|explain in detail|detalyado|mahaba)\b/i.test(String(message||''))?Math.max(320,320+responseEffortRank(responseEffort)*96):1536)
              :Math.min(effortOutputBudgetFor(message,responseEffort),isAnonymousKey?1024:(responseEffortRank(responseEffort)>=4?3072:2048)),
            temperature:temperatureFor(message,files),
            timeout:autoMode?Math.max(3,Math.floor(attemptMs/1000)-1):isAnonymousKey?55:65
          }),
          signal:AbortSignal.timeout(autoMode?attemptMs:isAnonymousKey?70000:80000)
        });
        status=res.status;
        const raw=await res.text();
        let data;
        try{data=JSON.parse(raw);}catch(_){data={raw};}
        const text=data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';
        if(res.ok&&typeof text==='string'&&text.trim()){
          providerLifecycleActivity(emit,{
            provider:runtimeProvider,model:resolved.name,state:'completed',phase:'connected',
            detail:`${providerLabel(runtimeProvider)} connected with ${resolved.name}${isAnonymousKey?' via anonymous route':''}`,
            attemptIndex:i,attemptCount:keys.length,attemptNoun:isAnonymousKey?'anonymous route':'credential'
          });
          const headers=passthroughHeaders(res,runtimeProvider,data?.model||resolved.name,fallbackFrom,
            isAnonymousKey?(routedReason||'aihorde-anonymous'):routedReason,i,keys.length);
          return {ok:true,response:new Response(text.trim(),{headers}),finishState:{reason:'stop'}};
        }

        last=summarizeAIHordeError(status,data,raw);
        const credentialFailure=isAIHordeCredentialFailure(status,last);
        const generationFailure=(res.ok&&!String(text||'').trim())||isAIHordeGenerationFailure(status,last);
        const hasNextKey=i<keys.length-1;
        const hasNextModel=m<candidates.length-1;

        // Credential errors rotate credentials. Generation/worker errors rotate
        // models after credentials are exhausted. Both remain entirely in AI Horde.
        if(credentialFailure && hasNextKey){
          providerLifecycleActivity(emit,{
            provider:runtimeProvider,model:resolved.name,state:'warning',phase:'retry',
            detail:`AI Horde route unavailable — trying the next Horde route`,
            attemptIndex:i,attemptCount:keys.length,attemptNoun:isAnonymousKey?'anonymous route':'credential'
          });
          continue;
        }
        if(generationFailure && hasNextKey && !isAnonymousKey){
          // A registered key can have different priority/kudos; try Horde's public
          // route before abandoning a currently active model.
          providerLifecycleActivity(emit,{
            provider:runtimeProvider,model:resolved.name,state:'warning',phase:'retry',
            detail:`AI Horde did not complete this generation — retrying within AI Horde`,
            attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'
          });
          continue;
        }
        if(generationFailure && hasNextModel){
          providerLifecycleActivity(emit,{
            provider:runtimeProvider,model:resolved.name,state:'warning',phase:'retry',
            detail:`AI Horde model did not return a generation — trying another active model`,
            attemptIndex:m,attemptCount:candidates.length,attemptNoun:'model'
          });
          break;
        }

        providerLifecycleActivity(emit,{
          provider:runtimeProvider,model:resolved.name,state:'error',phase:'failed',
          detail:generationFailure?'AI Horde could not complete a generation with the available active models.':last,
          attemptIndex:i,attemptCount:keys.length,attemptNoun:isAnonymousKey?'anonymous route':'credential'
        });
        return {ok:false,status,error:generationFailure?'AI Horde is currently unable to complete this generation. Please retry shortly.':last};
      }catch(e){
        status=503;last=e?.message||String(e);
        const hasNextKey=i<keys.length-1;
        const hasNextModel=m<candidates.length-1;
        if(autoMode&&autoDeadline-Date.now()<3000){
          return {ok:false,status:504,error:'AI Horde Auto reached its quick-response time budget. No worker finished in time; retry shortly.'};
        }
        if(hasNextKey) continue;
        if(hasNextModel) break;
        return {ok:false,status,error:'AI Horde timed out before a generation completed. Please retry shortly.'};
      }
    }
  }
  return {ok:false,status,error:last||`${providerLabel(runtimeProvider)} unavailable`};
}
export async function runAnonymousAIHordeFallback(args){
  return runAIHorde({...args,routedReason:'fallback-public'},{anonymous:true});
}


export function anthropicStreamToText(body,finishState={reason:''}){
  const decoder=new TextDecoder(),encoder=new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){this.buffer='';},
    transform(chunk,controller){
      this.buffer+=decoder.decode(chunk,{stream:true});
      const lines=this.buffer.split('\n');this.buffer=lines.pop()||'';
      for(const line of lines){
        const t=line.trim();if(!t.startsWith('data:'))continue;
        const raw=t.slice(5).trim();if(!raw||raw==='[DONE]')continue;
        try{
          const p=JSON.parse(raw);
          if(p?.error||p?.type==='error'){captureProviderStreamError(finishState,p.error||p);continue;}
          // Unified tools: capture native tool_use blocks.
          accumulateAnthropicEvent(finishState,p);
          const text=p?.delta?.text ?? p?.content_block?.text;
          const reason=p?.delta?.stop_reason ?? p?.message?.stop_reason;
          if(reason)finishState.reason=String(reason).toLowerCase();
          if(p?.type==='message_stop'&&!finishState.reason)finishState.reason='stop';
          if(typeof text==='string'&&text)controller.enqueue(encoder.encode(text));
        }catch(_){}
      }
    },
    flush(){if(!finishState.reason)finishState.reason='unknown';}
  }));
}

export async function runAgentRouter({model,history,message,systemInstruction,emit,autoFallback=false,customApiKeys=null,responseEffort='Instant'}){
  const keys=providerCredentials(Array.isArray(customApiKeys)&&customApiKeys.length?customApiKeys:
    getProviderKeys('agentrouter',autoFallback),autoFallback);
  if(!keys.length)return {ok:false,status:500,error:'AGENTROUTER_API_KEYS is not configured.'};
  const target=String(model||PROVIDERS.agentrouter.defaultModel).trim()||PROVIDERS.agentrouter.defaultModel;
  const base=String(process.env.AGENTROUTER_BRIDGE_URL||'https://agentrouter-isolated-production.up.railway.app').trim().replace(/\/+$/,'');
  let endpoint;
  try{
    const u=new URL(base);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Invalid URL');
    endpoint=u.origin+u.pathname.replace(/\/+$/,'')+'/chat';
  }catch{return {ok:false,status:500,error:'AGENTROUTER_BRIDGE_URL must be an HTTPS URL.'};}
  const messages=[];
  for(const h of (Array.isArray(history)?history:[]).slice(-15)){
    const role=['bot','model','assistant'].includes(h?.role)?'assistant':'user';
    const content=String(h?.text||h?.content||'').trim();
    if(content)messages.push({role,content:content.slice(0,8000)});
  }
  if(String(message||'').trim())messages.push({role:'user',content:String(message).trim().slice(0,8000)});
  if(!messages.length)return {ok:false,status:400,error:'AgentRouter requires a text message.'};
  const effort=responseEffortPolicy(responseEffort).level;
  const body=JSON.stringify({
    model:target,
    messages,
    system:(String(systemInstruction||'')+'\nSelected response effort: '+effort+'.').slice(0,18000),
    max_tokens:effortOutputBudgetFor(message,responseEffort)
  });
  const timestamp=String(Date.now()),encoder=new TextEncoder();
  let last='Railway AgentRouter bridge did not return a model response.',status=502;
  for(let i=0;i<keys.length;i++){
    providerLifecycleActivity(emit,{provider:'agentrouter',model:target,state:'running',phase:'connecting',
      attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'});
    try{
      const secret=await crypto.subtle.importKey('raw',encoder.encode(keys[i]),
        {name:'HMAC',hash:'SHA-256'},false,['sign']);
      const digest=new Uint8Array(await crypto.subtle.sign('HMAC',secret,encoder.encode(timestamp+'.'+body)));
      const signature=Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('');
      const upstream=await fetch(endpoint,{method:'POST',headers:{
        'content-type':'application/json','x-bridge-timestamp':timestamp,'x-bridge-signature':signature
      },body,signal:AbortSignal.timeout(62000)});
      let data={};
      try{data=await upstream.json();}catch{}
      const answer=typeof data?.response==='string'?data.response.trim():'';
      if(upstream.ok&&answer){
        providerLifecycleActivity(emit,{provider:'agentrouter',model:target,state:'completed',phase:'connected',
          attemptIndex:i,attemptCount:keys.length,attemptNoun:'credential'});
        return {ok:true,response:new Response(answer,{status:200,headers:{
          'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache, no-transform',
          'X-AI-Provider':'agentrouter','X-AI-Model':target,
          'X-AI-Key-Index':String(Number(data.keyIndex)||1),
          'X-AI-Key-Count':String(Number(data.keyCount)||keys.length)
        }}),finishState:{reason:'end_turn'}};
      }
      status=upstream.status||502;
      last=upstream.status===401
        ?'Railway bridge authentication failed: AGENTROUTER_API_KEYS must match between Vercel and Railway.'
        :typeof data?.error==='string'?data.error.slice(0,240):'AgentRouter CLI returned no model response.';
      // Exhaust same-provider keys on access/quota errors before emergency fallback.
      if(i<keys.length-1&&([401,402,403,429].includes(status)||isProviderQuotaFailure(status,last)))continue;
      break;
    }catch(error){
      status=502;
      last=error?.name==='TimeoutError'
        ?'AgentRouter CLI timed out generating a response.'
        :'Railway AgentRouter bridge is unreachable or returned an invalid response.';
      break;
    }
  }
  providerLifecycleActivity(emit,{provider:'agentrouter',model:target,state:'error',phase:'failed',detail:last});
  return {ok:false,status,error:last};
}

export async function runBailuAnthropic({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,customApiKeys=null,responseEffort='Instant',unifiedTools=null,toolMessages=null}){
  const keys=providerCredentials(Array.isArray(customApiKeys)&&customApiKeys.length?customApiKeys:getBailuAnthropicKeys(autoFallback),autoFallback);
  if(!keys.length)return {ok:false,status:500,error:'Bailucode Anthropic API key is not configured.'};
  const target=model||PROVIDERS.bailucode.defaultModel;
  const messages=[];
  for(const h of history||[]){
    const role=h.role==='bot'||h.role==='model'?'assistant':'user';
    const text=String(h.text||'').trim();if(text)messages.push({role,content:text});
  }
  if(String(message||'').trim())messages.push({role:'user',content:String(message).trim()});
  const requestMessages=toolMessages||messages;
  // Unified tools: same canonical tools, translated to Anthropic format.
  const nativeTools=unifiedTools?toolsForFamily(TOOL_FAMILY_ANTHROPIC,unifiedTools):null;
  let last='',status=500;
  for(let i=0;i<keys.length;i++){
    try{
      const anthropicBody={model:target,max_tokens:effortOutputBudgetFor(message,responseEffort),system:systemInstruction,messages:requestMessages,stream:true};
      if(nativeTools) anthropicBody.tools=nativeTools;
      const res=await fetch('https://bailucode.com/openapi/v1/messages',{
        method:'POST',
        headers:{'x-api-key':keys[i],Authorization:'Bearer '+keys[i],'anthropic-version':'2023-06-01','content-type':'application/json','accept':'text/event-stream'},
        body:JSON.stringify(anthropicBody),
        signal:AbortSignal.timeout(chatUpstreamTimeoutMs('generic'))
      });
      if(res.ok){
        const finishState={reason:'',toolFamily:TOOL_FAMILY_ANTHROPIC,nativeMessages:requestMessages};
        return {ok:true,response:new Response(anthropicStreamToText(res.body,finishState),{headers:passthroughHeaders(res,'bailucode',target,fallbackFrom,routedReason||'bailu-anthropic',i,keys.length)}),finishState};
      }
      status=res.status;last=cleanUpstreamError(await res.text().catch(()=>''),status,'bailucode',target);
      if(!shouldRetryProviderCredential(status,last))break;
    }catch(e){status=502;last=e?.message||String(e);}
  }
  return {ok:false,status,error:last||'Bailucode Anthropic route unavailable'};
}

export async function runBailucode(args){
  if(args.bailuRoute==='anthropic'){
    const anthropic=await runBailuAnthropic(args);
    if(anthropic.ok||args.autoFallback!==true)return anthropic;
    const openai=await runOpenAICompatible('bailucode',args);
    return openai.ok?openai:anthropic;
  }
  const openai=await runOpenAICompatible('bailucode',args);
  if(openai.ok||args.autoFallback!==true)return openai;
  const anthropic=await runBailuAnthropic(args);
  return anthropic.ok?anthropic:openai;
}

export function fallbackProviderCandidates(selectedProvider,{
  providers=PROVIDERS,isConfigured=configured,limit=API_GUARD.maxFallbackProviders,files=[]
}={}){
  const hasImage=Array.isArray(files)&&files.some(file=>String(file?.mimeType||'').startsWith('image/')&&file?.data);
  const hasVideo=Array.isArray(files)&&files.some(file=>String(file?.mimeType||'').startsWith('video/')&&file?.data);
  const order=['gemini','cloudflare','groq','openrouter','mistral','cohere','unorouter','nvidia','codecraft','agentrouter','hcnsec','bailucode','seekai'];
  return order
    .filter(provider=>provider!==selectedProvider&&providers[provider]&&isConfigured(provider))
    .filter(provider=>!hasVideo||provider==='gemini')
    .filter(provider=>!hasImage||provider==='gemini'||provider==='cloudflare')
    .slice(0,Math.max(0,Number(limit)||0))
    .map(provider=>({provider,model:providers[provider].defaultModel}));
}

export async function runAvailableProviderFallback(selectedProvider,args,{
  body={},files=args?.files||[],providers=PROVIDERS,limit=API_GUARD.maxFallbackProviders,
  runner=runProvider,includeEmergencyFallback=false,runRegistered=runAIHorde,
  runAnonymous=runAnonymousAIHordeFallback
}={}){
  if(args?.autoFallback!==true)return {ok:false,status:403,error:'Provider fallback is disabled.'};
  const sameProviderModels=(providers[selectedProvider]?.models||[])
    .filter(model=>model&&model!==args.model)
    .slice(0,2);
  let last={ok:false,status:503,error:'No other configured model provider is available.'};
  for(const model of sameProviderModels){
    const attempt=await runner(selectedProvider,{
      ...args,
      model,
      customApiKeys:sanitizeCustomProviderKeys(body,selectedProvider),
      autoFallback:true,
      fallbackFrom:selectedProvider,
      routedReason:'credit-model-fallback'
    });
    if(attempt?.ok)return {...attempt,fallbackProvider:selectedProvider,fallbackModel:model};
    last=attempt||last;
  }
  const candidates=fallbackProviderCandidates(selectedProvider,{
    providers,limit,files,
    isConfigured:provider=>configured(provider)||sanitizeCustomProviderKeys(body,provider).length>0
  });
  for(const candidate of candidates){
    const attempt=await runner(candidate.provider,{
      ...args,
      model:candidate.model,
      customApiKeys:sanitizeCustomProviderKeys(body,candidate.provider),
      customApiProfile:null,
      autoFallback:true,
      fallbackFrom:selectedProvider,
      routedReason:'credit-exhaustion-fallback'
    });
    if(attempt?.ok)return {...attempt,fallbackProvider:candidate.provider,fallbackModel:candidate.model};
    last=attempt||last;
  }
  const hasUnsupportedMedia=Array.isArray(files)&&files.some(file=>
    file?.data&&/^(?:image|video)\//i.test(String(file?.mimeType||''))
  );
  if(includeEmergencyFallback&&!hasUnsupportedMedia){
    const emergencyArgs={
      ...args,model:'auto',fallbackFrom:selectedProvider,
      autoFallback:true,routedReason:'credit-continuation-emergency'
    };
    const registered=await runRegistered(emergencyArgs);
    if(registered?.ok)return {...registered,fallbackProvider:'aihorde',fallbackModel:'auto'};
    last=registered||last;
    const anonymous=await runAnonymous(emergencyArgs);
    if(anonymous?.ok)return {...anonymous,fallbackProvider:'aihorde-public',fallbackModel:'auto'};
    last=anonymous||last;
  }
  return last;
}

export async function runProvider(provider,args){
  if(provider==='custom-api' && args?.customApiProfile){
    return runGenericCustomApi(args.customApiProfile,{
      history:args.history,
      message:args.message,
      systemInstruction:args.systemInstruction,
      emit:args.emit,
      autoFallback:args.autoFallback===true,
      responseEffort:args.responseEffort||'Instant'
    });
  }
  if(provider==='gemini')return runGemini(args);
  if(provider==='cloudflare')return runCloudflare(args);
  if(provider==='cohere')return runCohere(args);
  if(provider==='aihorde')return runAIHorde(args);
  if(provider==='bailucode')return runBailucode(args);
  if(provider==='agentrouter')return runAgentRouter(args);
  if(provider==='seekai')return runSeekAI(args);
  if(['groq','openrouter','mistral','unorouter','nvidia','codecraft','hcnsec'].includes(provider))return runOpenAICompatible(provider,args);
  return {ok:false,status:400,error:'Unknown provider'};
}

export function responseMeta(response) {
  const num = name => {
    const raw=response.headers.get(name); if(raw==null)return null;
    const n=Number(raw); return Number.isFinite(n)?n:null;
  };
  return {
    provider:response.headers.get('x-ai-provider')||'',
    model:response.headers.get('x-ai-model')||'',
    fallbackFrom:response.headers.get('x-ai-fallback-from')||'',
    routeReason:response.headers.get('x-ai-route-reason')||'',
    keyIndex:num('x-ai-key-index'),
    keyCount:num('x-ai-key-count'),
    remainingRequests:num('x-ratelimit-remaining-requests'),
    limitRequests:num('x-ratelimit-limit-requests'),
    remainingTokens:num('x-ratelimit-remaining-tokens'),
    limitTokens:num('x-ratelimit-limit-tokens'),
    retryAfter:response.headers.get('retry-after')||''
  };
}

export function shouldRunUiRefinementPass(message='',files=[]){
  return isVisualWebUiRequest(message,files);
}

export function buildUiRefinementPrompt(originalRequest='',draft=''){
  const safeDraft=String(draft||'').slice(0,90000);
  return [
    'Refine the following DRAFT into the final user-facing answer.',
    'Do not discuss the refinement process. Return only the improved final answer.',
    'Preserve every functional requirement from the original request.',
    'If the draft contains HTML/CSS/JavaScript for a UI, keep the requested functionality but make the interface product-quality: complete visual hierarchy, spacing, typography, responsive mobile behavior, polished controls, accessible states, and consistent icons.',
    'For a single-file HTML app, prefer self-contained inline CSS/JS so the built-in preview renders correctly without depending on a CSS framework. If the draft uses Tailwind or another CDN without the user explicitly requesting it, replace that dependency with equivalent self-contained CSS.',
    'Do not leave default browser-looking buttons, inputs, headings, lists, or forms unstyled when the user asked for a real interface.',
    'If a screenshot/video/reference is part of the request context, preserve its layout hierarchy, proportions, density, placement, and interaction pattern as closely as possible.',
    'Do not remove requested tools/features merely to simplify the UI.',
    'Do not claim that code was executed or tested unless verified tool context says so.',
    '',
    'ORIGINAL REQUEST:',
    String(originalRequest||'').slice(0,14000),
    '',
    'DRAFT:',
    safeDraft
  ].join('\n');
}

export async function maybeRefineVisualUiResponse({first,provider,model,history,files,message,systemInstruction,routedReason,emit,customApiKeys,customApiProfile,responseEffort}){
  if(!first?.ok || !shouldRunUiRefinementPass(message,files))return first;
  let draft='';
  try{
    draft=await readInternalProviderText(first.response.clone(),90000);
  }catch(_){
    return first;
  }
  if(!draft.trim())return first;

  activity(emit,'ui-polish','Polishing the requested interface, responsive layout, and visual states','running','build');
  const refineSystem=systemInstruction +
    '\n FINAL UI REFINEMENT MODE: You are performing a second quality pass on a generated interface. Output only the improved final user-facing answer. Preserve functionality and user constraints. Enforce the VISUAL UI IMPLEMENTATION CONTRACT strictly.';
  try{
    const refined=await runProvider(provider,{
      model,
      history,
      files,
      message:buildUiRefinementPrompt(message,draft),
      systemInstruction:refineSystem,
      routedReason:routedReason||'ui-refinement',
      emit:null,
      autoFallback:false,
      customApiKeys,
      customApiProfile,
      responseEffort
    });
    if(refined?.ok){
      activity(emit,'ui-polish','Interface quality pass complete','completed','build');
      return refined;
    }
    activity(emit,'ui-polish','Interface quality pass unavailable — using the original generated result','warning','build');
  }catch(_){
    activity(emit,'ui-polish','Interface quality pass unavailable — using the original generated result','warning','build');
  }
  return first;
}

export function applyChatFeatureSettings(body={}){
  const settings=body.personalization||{};
  const plugins=body.plugins||{};
  const {superpowers,skills,autoUse}=plugins;
  return {
    ...body,
    ...(settings.librarySearch===false?{files:[]}:{}),
    ...(settings.connectorSearch===false?{plugins:{superpowers,skills,autoUse,plugins:[]}}:{})
  };
}

