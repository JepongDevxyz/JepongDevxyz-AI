/* lib/chat/config.js — split from api/chat.js (mechanical move, no behavior change). */
import { normalizeResponseEffort, responseEffortRank } from './effort.js';

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    // A6 FIX: synced to picker (was 5 incl. removed aliases; picker offers only this one)
    models: ['gemini-3.5-flash-lite'],
    defaultModel: 'gemini-3.5-flash-lite'
  },
  cloudflare: {
    label: 'Cloudflare',
    models: ['@cf/zai-org/glm-4.7-flash','@cf/nvidia/nemotron-3-120b-a12b','@cf/openai/gpt-oss-120b','@cf/qwen/qwen3.8-27b'],
    defaultModel: '@cf/openai/gpt-oss-120b'
  },
  groq: {
    label: 'Groq',
    // A6 FIX: synced to picker (removed openai/gpt-oss-20b, added groq/compound)
    models: ['openai/gpt-oss-120b','qwen/qwen3.8-27b','groq/compound'],
    defaultModel: 'openai/gpt-oss-120b'
  },
  openrouter: {
    label: 'OpenRouter',
    models: ['nvidia/nemotron-3-ultra-550b-a55b:free','poolside/laguna-s-2.1:free','nvidia/nemotron-3-super-120b-a12b:free'],
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b:free'
  },
  mistral: {
    label: 'Mistral',
    models: ['mistral-small-latest','codestral-latest'],
    defaultModel: 'mistral-small-latest'
  },
  cohere: {
    label: 'Cohere',
    models: ['command-a-plus-05-2026','command-a-reasoning-08-2025'],
    defaultModel: 'command-a-plus-05-2026'
  },
  aihorde: {
    label: 'AI Horde',
    models: ['auto'],
    defaultModel: 'auto'
  },
  unorouter: {
    label: 'UnoRouter',
    models: ['auto'],
    defaultModel: 'auto'
  },
  nvidia: {
    label: 'NVIDIA',
    models: ['nvidia/nemotron-3-ultra-550b-a55b','nvidia/nemotron-3-super-120b-a12b'],
    defaultModel: 'nvidia/nemotron-3-ultra-550b-a55b'
  },
  codecraft: {
    label: 'CodeCraft API',
    // Explicit CodeCraft catalog requested for JepongDevxyz AI. The live
    // /v1/models sync can still refresh/replace this bootstrap list when the
    // provider catalog is reachable.
    models: ["deepseek-v4-pro-max","deepseek-v4-flash-0731","deepseek-v4-pro-0813","gemma-2-2b","qwen3.8-max","qwen3.8-27b","qwen3.7-max","glm-5.3","glm-5.2","muse-spark-1.1","seed-2.1-pro","seed-2.1-turbo","gemini-3.6-flash","gemini-3.7-flash","gemini-3.1-pro","grok-4.5","grok-4.6","kimi-k3","kimi-k2.6","gpt-5.5","gpt-5.5-pro","gpt-5.6-luna","gpt-5.6-terra","gpt-5.6-sol","claude-mythos-preview","claude-opus-4.6","claude-opus-5.5","claude-fable-5.1"],
    defaultModel: 'gpt-5.6-sol'
  },
  agentrouter: {
    label: 'AgentRouter',
    // A6 FIX: synced to picker (deepseek-v4-pro not offered)
    models: ['deepseek-v4-flash'],
    defaultModel: 'deepseek-v4-flash'
  },
  hcnsec: {
    label: 'HCNSEC',
    // A6 FIX: synced to picker (removed MiMo-V2.6-Flash, Qwen3.8-Flash-Next, spark-x2.5; added DeepSeek-V4.1-Flash, step-3.7-flash)
    models: ['DeepSeek-V4-Flash','DeepSeek-V4.1-Flash','glm-5.3-flash','sensenova-6.8-flash-lite','step-3.7-flash'],
    defaultModel: 'DeepSeek-V4-Flash'
  },
  bailucode: {
    label: 'Bailucode',
    // A6 FIX: synced to picker (added bailu-2.8-lite)
    models: ['bailu-apex','bailu-2.8-lite'],
    defaultModel: 'bailu-apex'
  },
  seekai: {
    label: 'SEEKAI',
    models: ['deepseek-v4.1-flash','glm-5.3-flash','mimo-v2.6-flash','deepseek-ai/DeepSeek-V4-Flash-0731','qwen3.8-flash','deepseek-v4-flash'],
    defaultModel: 'deepseek-v4-flash'
  }
};

// Registered AI Horde and then public AI Horde are emergency-only, never picker providers.
const RETRYABLE = new Set([401,402,403,408,409,425,429,500,502,503,504]);

// Central chat-model timeout policy. New/future model IDs inherit this automatically
// because timeout selection is provider/route based, never tied to a hard-coded model list.
/* P0/A1 FIX — Hobby time budget. Vercel Hobby clamps Edge functions to
   ~25s (vercel.json maxDuration:300 is silently ignored there), so a
   270s upstream timeout + 3 tool rounds + 4 continuations can NEVER fit —
   the function is hard-killed mid-stream. Everything below is bounded by
   JD_CHAT_BUDGET_MS (default 22s, Hobby-safe). Raise CHAT_TIME_BUDGET_MS
   on Pro, where maxDuration:300 actually applies. */
const JD_CHAT_BUDGET_MS = Math.max(8000, Number(process.env.CHAT_TIME_BUDGET_MS || 22_000));
function jdDeadlineMs() { return Date.now() + JD_CHAT_BUDGET_MS; }
function jdBudgetLeft(deadline) { return Math.max(0, (Number(deadline) || 0) - Date.now()); }
const CHAT_UPSTREAM_TIMEOUT_MS=Math.max(8000,Math.min(Number(process.env.CHAT_UPSTREAM_TIMEOUT_MS||270_000),JD_CHAT_BUDGET_MS-4000));
const CHAT_FAST_UPSTREAM_TIMEOUT_MS=Math.max(8000,Math.min(Number(process.env.CHAT_FAST_UPSTREAM_TIMEOUT_MS||270_000),JD_CHAT_BUDGET_MS-4000));
function chatUpstreamTimeoutMs(provider=''){
  return String(provider||'').toLowerCase()==='codecraft'
    ? CHAT_FAST_UPSTREAM_TIMEOUT_MS
    : CHAT_UPSTREAM_TIMEOUT_MS;
}

/* =========================================================
   API COST / ABUSE GUARD
   Best-effort edge-instance guard. For production-wide hard limits,
   back this with a shared store (Supabase/Redis) when available.
========================================================= */
const API_GUARD = {
  windowMs: Math.max(10_000, Number(process.env.API_RATE_WINDOW_MS || 60_000)),
  maxRequests: Math.max(1, Number(process.env.API_RATE_MAX_REQUESTS || 20)),
  maxHeavyRequests: Math.max(1, Number(process.env.API_RATE_MAX_HEAVY_REQUESTS || 6)),
  maxBodyChars: Math.max(20_000, Number(process.env.API_MAX_BODY_CHARS || 2_200_000)),
  maxDailyEstimatedTokens: Math.max(10_000, Number(process.env.API_DAILY_ESTIMATED_TOKEN_BUDGET || 600_000)),
  // Comma/newline-separated provider keys are rotated on retry. Keep the cap configurable; default 8.
  maxProviderCredentialsPerRequest: Math.max(1, Math.min(32, Number(process.env.API_MAX_CREDENTIAL_RETRIES || 8))),
  maxFallbackProviders: Math.max(0, Math.min(6, Number(process.env.API_MAX_FALLBACK_PROVIDERS || 2))),
  abnormalBurst: Math.max(2, Number(process.env.API_ABNORMAL_BURST || 12))
};
const apiGuardWindows = new Map();
const apiGuardDaily = new Map();
function stableClientKey(req){
  const raw=String(req?.headers?.get('x-forwarded-for')||req?.headers?.get('x-real-ip')||req?.headers?.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
  let h=2166136261;
  for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}
  return `c${(h>>>0).toString(36)}`;
}
function pruneGuardMaps(now=Date.now()){
  if(apiGuardWindows.size>5000) for(const [k,v] of apiGuardWindows) if(now-v.startedAt>API_GUARD.windowMs*3) apiGuardWindows.delete(k);
  if(apiGuardDaily.size>5000) for(const [k,v] of apiGuardDaily) if(now-v.startedAt>86_400_000) apiGuardDaily.delete(k);
}
function estimatedTokensFromBody(body){
  let chars=String(body?.message||'').length;
  try{ chars+=JSON.stringify(body?.history||[]).length; }catch(_){}
  for(const f of (Array.isArray(body?.files)?body.files:[])) chars+=String(f?.extractedText||'').length+Math.ceil(String(f?.data||'').length*.08);
  return Math.max(1,Math.ceil(chars/4));
}
function isHeavyApiRequest(body){
  const effort=normalizeResponseEffort(body?.responseEffort||body?.personalization?.intelligence,body?.personalization?.fastAnswers);
  return responseEffortRank(effort)>=3||body?.activityStream===true||body?.action==='generate-image'||body?.action==='generate-pet-image'||(Array.isArray(body?.files)&&body.files.length>2);
}
function checkApiGuard(req,body){
  const now=Date.now(); pruneGuardMaps(now);
  const key=stableClientKey(req), heavy=isHeavyApiRequest(body);
  let w=apiGuardWindows.get(key);
  if(!w||now-w.startedAt>=API_GUARD.windowMs) w={startedAt:now,count:0,heavy:0};
  w.count++; if(heavy)w.heavy++; apiGuardWindows.set(key,w);
  if(w.count===API_GUARD.abnormalBurst) console.warn('[API-GUARD] abnormal request burst', {client:key,count:w.count,windowMs:API_GUARD.windowMs});
  if(w.count>API_GUARD.maxRequests||w.heavy>API_GUARD.maxHeavyRequests){
    const retry=Math.max(1,Math.ceil((API_GUARD.windowMs-(now-w.startedAt))/1000));
    return {ok:false,status:429,error:'Too many requests. Please wait before trying again.',headers:{'Retry-After':String(retry),'X-App-RateLimit-Limit':String(API_GUARD.maxRequests),'X-App-RateLimit-Remaining':'0'}};
  }
  let d=apiGuardDaily.get(key);
  if(!d||now-d.startedAt>=86_400_000)d={startedAt:now,estimatedTokens:0,requests:0};
  const estimate=estimatedTokensFromBody(body); d.estimatedTokens+=estimate; d.requests++; apiGuardDaily.set(key,d);
  if(d.estimatedTokens>API_GUARD.maxDailyEstimatedTokens){
    console.warn('[API-GUARD] estimated daily token budget reached',{client:key,estimatedTokens:d.estimatedTokens});
    return {ok:false,status:429,error:'Daily usage limit reached for this device/session. Please try again later.',headers:{'Retry-After':'3600'}};
  }
  return {ok:true,key,estimate,remaining:Math.max(0,API_GUARD.maxRequests-w.count)};
}

export { PROVIDERS, RETRYABLE, JD_CHAT_BUDGET_MS, jdDeadlineMs, jdBudgetLeft, CHAT_UPSTREAM_TIMEOUT_MS, CHAT_FAST_UPSTREAM_TIMEOUT_MS, chatUpstreamTimeoutMs, API_GUARD, apiGuardWindows, apiGuardDaily, stableClientKey, pruneGuardMaps, estimatedTokensFromBody, isHeavyApiRequest, checkApiGuard };
