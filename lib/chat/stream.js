/* lib/chat/stream.js — split from api/chat.js (mechanical move, no behavior change). */
import { accumulateOpenAIToolDeltas } from '../tools/index.js';
import { RETRYABLE } from './config.js';
import { providerLabel } from './keys.js';

function isRetryableStatus(status) { return RETRYABLE.has(Number(status)); }

function isProviderQuotaFailure(status,error=''){
  const code=Number(status)||0;
  const text=String(error||'').toLowerCase();
  return [402,429].includes(code) ||
    /quota[ _-]?(?:exceeded|exhausted|reached)|(?:insufficient|exhausted|out of) (?:credits?|balance|quota)|rate[ _-]?limit[ _-]?(?:exceeded|reached)|resource_exhausted|insufficient_quota|(?:daily|monthly|usage|billing hard) limit (?:exceeded|reached)|credits? (?:exhausted|depleted)|credit balance (?:exhausted|insufficient)/.test(text);
}
function captureProviderStreamError(finishState,errorPayload={}){
  const payload=errorPayload&&typeof errorPayload==='object'?errorPayload:{message:String(errorPayload||'')};
  const nested=payload.error&&typeof payload.error==='object'?payload.error:{};
  const status=Number(payload.status||payload.status_code||payload.statusCode||payload.code||nested.status||nested.code)||0;
  const message=String(payload.message||payload.detail||payload.type||nested.message||nested.type||errorPayload||'Provider stream failed').slice(0,900);
  const codeText=String(payload.status||payload.code||nested.status||nested.code||'');
  const creditExhausted=status===402||/RESOURCE_EXHAUSTED|INSUFFICIENT_QUOTA/i.test(codeText)||
    (status===429&&/quota|credit|billing/i.test(`${codeText} ${message}`))||
    /(?:credit(?:s)?\s+(?:exhausted|depleted|insufficient|balance)|insufficient[_ ]quota|resource_exhausted|quota\s+(?:exhausted|exceeded|reached)|billing.{0,30}(?:limit|quota|credit)|(?:limit|quota).{0,30}(?:billing|credit))/i.test(message);
  finishState.creditExhausted=creditExhausted;
  finishState.reason=creditExhausted?'credit_exhausted':'provider_error';
  finishState.status=status||(creditExhausted?402:502);
  finishState.error=message;
}
function isFallbackableProviderFailure(status,error=''){
  const code=Number(status)||0;
  if([401,403].includes(code)||isProviderQuotaFailure(code,error))return true;
  return /no user matching sent api key|credential was rejected|invalid api key/.test(String(error||'').toLowerCase());
}
function shouldRetryProviderCredential(status,error=''){
  return isRetryableStatus(status)||isProviderQuotaFailure(status,error);
}

function passthroughHeaders(upstream, provider, model, fallbackFrom = '', routedReason = '', keyIndex = 0, keyCount = 1) {
  const h = {
    'Content-Type':'text/plain; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'X-AI-Provider':provider,
    'X-AI-Model':model,
    'X-AI-Fallback-From':fallbackFrom,
    'X-AI-Route-Reason':routedReason,
    'X-AI-Key-Index':String(keyIndex + 1),
    'X-AI-Key-Count':String(keyCount),
    'Access-Control-Expose-Headers':'X-AI-Provider, X-AI-Model, X-AI-Fallback-From, X-AI-Route-Reason, X-AI-Key-Index, X-AI-Key-Count, X-RateLimit-Limit-Requests, X-RateLimit-Remaining-Requests, X-RateLimit-Reset-Requests, X-RateLimit-Limit-Tokens, X-RateLimit-Remaining-Tokens, X-RateLimit-Reset-Tokens, Retry-After'
  };
  for (const name of ['x-ratelimit-limit-requests','x-ratelimit-remaining-requests','x-ratelimit-reset-requests','x-ratelimit-limit-tokens','x-ratelimit-remaining-tokens','x-ratelimit-reset-tokens','retry-after']) {
    const v = upstream?.headers?.get(name);
    if (v) h[name] = v;
  }
  return h;
}

function openAIStreamToText(body, finishState={reason:''}) {
  const decoder = new TextDecoder(); const encoder = new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){ this.buffer=''; },
    transform(chunk, controller){
      this.buffer += decoder.decode(chunk,{stream:true});
      const lines = this.buffer.split('\n'); this.buffer = lines.pop() || '';
      for (const line of lines) {
        const t=line.trim(); if (!t.startsWith('data:')) continue;
        const s=t.slice(5).trim();
        if (!s) continue;
        if (s==='[DONE]') {
          if(!finishState.reason) finishState.reason='stop';
          continue;
        }
        try {
          const p=JSON.parse(s);
          if(p?.error){captureProviderStreamError(finishState,p.error);continue;}
          const choice=p.choices?.[0];
          // Unified tools: capture native tool calls without disturbing text.
          if(choice?.delta?.tool_calls) accumulateOpenAIToolDeltas(finishState,choice.delta.tool_calls);
          if(Array.isArray(choice?.message?.tool_calls)&&choice.message.tool_calls.length){
            accumulateOpenAIToolDeltas(finishState,choice.message.tool_calls.map((tc,i)=>({index:i,id:tc.id,function:tc.function})));
          }
          const rawText=choice?.delta?.content ?? choice?.message?.content;
          const text=typeof rawText==='string'
            ? rawText
            : (Array.isArray(rawText)
                ? rawText.map(part=>typeof part==='string'?part:(part?.text||part?.content||'')).join('')
                : '');
          const reason=choice?.finish_reason ?? choice?.finishReason ?? p?.finish_reason;
          if(reason) finishState.reason=String(reason).toLowerCase();
          if(text) controller.enqueue(encoder.encode(text));
        } catch(_){}
      }
    },
    flush(){
      if(!finishState.reason) finishState.reason='unknown';
    }
  }));
}

function cohereStreamToText(body, finishState={reason:''}) {
  const decoder=new TextDecoder(); const encoder=new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){this.buffer='';},
    transform(chunk,controller){
      this.buffer += decoder.decode(chunk,{stream:true});
      const lines=this.buffer.split('\n'); this.buffer=lines.pop()||'';
      for(const line of lines){
        const t=line.trim(); if(!t.startsWith('data:')) continue;
        try{
          const p=JSON.parse(t.slice(5).trim());
          if(p?.error||p?.type==='error'){captureProviderStreamError(finishState,p.error||p);continue;}
          const text=p?.delta?.message?.content?.text;
          const reason=p?.delta?.finish_reason ?? p?.finish_reason ?? p?.finishReason;
          if(reason) finishState.reason=String(reason).toLowerCase();
          if(p?.type==='message-end' && !finishState.reason) finishState.reason='stop';
          if(p?.type==='content-delta' && text) controller.enqueue(encoder.encode(text));
        }catch(_){}
      }
    },
    flush(){
      if(!finishState.reason) finishState.reason='unknown';
    }
  }));
}

function retryLabel(provider, status, hasNext) {
  if (status === 429) return `${providerLabel(provider)} rate limit reached${hasNext ? ' — rotating credential' : ''}`;
  if (status === 402) return `${providerLabel(provider)} billing/model access is unavailable${hasNext ? ' — trying another option' : ' — checking fallback'}`;
  if (status === 401 || status === 403) return `${providerLabel(provider)} credential was rejected${hasNext ? ' — trying another' : ''}`;
  if (status >= 500) return `${providerLabel(provider)} is temporarily busy${hasNext ? ' — trying another credential' : ''}`;
  return `${providerLabel(provider)} request failed${hasNext ? ' — retrying' : ''}`;
}

export { isRetryableStatus, isProviderQuotaFailure, captureProviderStreamError, isFallbackableProviderFailure, shouldRetryProviderCredential, passthroughHeaders, openAIStreamToText, cohereStreamToText, retryLabel };
