/* lib/chat/aihorde.js — split from api/chat.js (mechanical move, no behavior change). */
import { TOOL_FAMILY_ANTHROPIC, accumulateAnthropicEvent, toolsForFamily } from '../tools/index.js';
import { PROVIDERS, chatUpstreamTimeoutMs } from './config.js';
import { buildOpenAIMessages } from './context.js';
import { effortOutputBudgetFor, responseEffortPolicy, responseEffortRank } from './effort.js';
import { configured, getBailuAnthropicKeys, getProviderKeys, providerCredentials, providerLabel } from './keys.js';
import { normalizeIntentText, temperatureFor } from './prompts.js';
import { runOpenAICompatible } from './providers.js';
import { cleanUpstreamError } from './sanitize.js';
import { captureProviderStreamError, isProviderQuotaFailure, passthroughHeaders, shouldRetryProviderCredential } from './stream.js';
import { json, providerLifecycleActivity, shuffle } from './utils.js';

const AIHORDE_ANONYMOUS_KEY='0000000000';
const AIHORDE_CLIENT_AGENT='JepongDevxyz-AI:1.0:https://github.com/JepongDevxyz/JepongDevxyz-AI';
const AIHORDE_BLOCKED_MODEL_PATTERNS=[/nsfw/i,/hentai/i,/porn/i,/erotic/i,/sexual/i,/\bsex\b/i,/\badult\b/i,/\berp\b/i,/explicit/i,/fetish/i];

function isAllowedAIHordeModelName(name=''){
  const value=String(name||'').trim();
  return Boolean(value) && !AIHORDE_BLOCKED_MODEL_PATTERNS.some(rx=>rx.test(value));
}

function numericModelSizeHint(name=''){
  const values=[...String(name).matchAll(/(?:^|[^0-9])(\d{1,3})\s*[bB](?:\b|[^a-z])/g)]
    .map(m=>Number(m[1]))
    .filter(Number.isFinite);
  return values.length?Math.max(...values):0;
}

async function getAIHordeActiveModels(signal){
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

function scoreAIHordeModel(item,message='',sourceModel=''){
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
function fourResponsiveAIHordeModels(models,preferred=[]){
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

async function checkAIHordeCredential(key){
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

async function liveAIHordePickerModels(preferred=[]){
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

function summarizeAIHordeError(status, data, raw=''){
  const combined=`${data?.error?.message||''} ${data?.message||''} ${raw||''}`.replace(/\s+/g,' ').trim();
  const lower=combined.toLowerCase();
  if(/no user matching sent api key/.test(lower)) return 'AI Horde rejected this credential.';
  if(/api key is not configured/.test(lower)) return 'AI Horde is not configured on the server yet.';
  if(status===401||status===403) return 'AI Horde rejected the current credential.';
  if(status===429) return 'AI Horde rate limit reached.';
  if(status>=500) return 'AI Horde is temporarily unavailable.';
  return combined || `AI Horde ${status}`;
}

function isAIHordeCredentialFailure(status,error=''){
  const code=Number(status)||0;
  const text=String(error||'').toLowerCase();
  return [401,403,406].includes(code) || /no user matching sent api key|invalid api key|credential was rejected|unauthorized|forbidden/.test(text);
}

async function resolveAIHordeModels(requested='auto',message='',signal){
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

function isAIHordeGenerationFailure(status,error=''){
  const code=Number(status)||0;
  const text=String(error||'').toLowerCase();
  return code===408 || code===429 || code>=500 ||
    /not enough generations|no generations|no generation|worker|queue|timed? ?out|timeout|unavailable|busy|faulted|aborted/.test(text);
}

function aiHordeNativePrompt(messages){
  const transcript=(Array.isArray(messages)?messages:[]).map(m=>{
    const role=m?.role==='system'?'System':m?.role==='assistant'?'Assistant':'User';
    return role+': '+(typeof m?.content==='string'?m.content:'');
  }).join('\n\n');
  return transcript.slice(-14000)+'\n\nAssistant:';
}

async function aiHordeNativeTextRequest({key,model,messages,maxTokens=256,timeoutMs=44000}){
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

async function runAIHordeNativeSelected({model,history,files,message,systemInstruction,
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

async function runAIHorde({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,responseEffort='Instant'},{anonymous=false}={}){
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
async function runAnonymousAIHordeFallback(args){
  return runAIHorde({...args,routedReason:'fallback-public'},{anonymous:true});
}

function anthropicStreamToText(body,finishState={reason:''}){
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

async function runAgentRouter({model,history,message,systemInstruction,emit,autoFallback=false,customApiKeys=null,responseEffort='Instant'}){
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

async function runBailuAnthropic({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit,autoFallback=false,customApiKeys=null,responseEffort='Instant',unifiedTools=null,toolMessages=null}){
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

async function runBailucode(args){
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

export { AIHORDE_ANONYMOUS_KEY, AIHORDE_CLIENT_AGENT, AIHORDE_BLOCKED_MODEL_PATTERNS, isAllowedAIHordeModelName, numericModelSizeHint, getAIHordeActiveModels, scoreAIHordeModel, fourResponsiveAIHordeModels, checkAIHordeCredential, liveAIHordePickerModels, summarizeAIHordeError, isAIHordeCredentialFailure, resolveAIHordeModels, isAIHordeGenerationFailure, aiHordeNativePrompt, aiHordeNativeTextRequest, runAIHordeNativeSelected, runAIHorde, runAnonymousAIHordeFallback, anthropicStreamToText, runAgentRouter, runBailuAnthropic, runBailucode };
