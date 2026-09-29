import { fetchPublicGitHubContext } from './plugins.js';
import { getGitHubSession } from './_github_oauth.js';
import { resolveGitHubAccess } from './_github_app.js';
import { fetchGitHubRunContext } from './_plugin_execution_context.js';
import { fetchGitHubIssuesContext,shouldReadGitHubIssues } from './_plugin_issues_context.js';

export const config = { runtime: 'edge' };

/* =========================================================
   JEPONGDEVXYZ AI — MULTI PROVIDER / MULTI KEY / ACTIVITY SSE
   High-level execution activity only. No hidden reasoning is exposed.
========================================================= */

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    models: ['gemini-flash-latest','gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite'],
    defaultModel: 'gemini-flash-latest'
  },
  cloudflare: {
    label: 'Cloudflare',
    models: ['@cf/zai-org/glm-4.7-flash','@cf/nvidia/nemotron-3-120b-a12b','@cf/openai/gpt-oss-120b','@cf/qwen/qwen3.8-27b'],
    defaultModel: '@cf/openai/gpt-oss-120b'
  },
  groq: {
    label: 'Groq',
    models: ['openai/gpt-oss-120b','openai/gpt-oss-20b','qwen/qwen3.8-27b'],
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
    models: ['deepseek-v4-pro','deepseek-v4-flash'],
    defaultModel: 'deepseek-v4-pro'
  },
  hcnsec: {
    label: 'HCNSEC',
    models: ['DeepSeek-V4-Flash','glm-5.3-flash','MiMo-V2.6-Flash','Qwen3.8-Flash-Next','sensenova-6.8-flash-lite','spark-x2.5'],
    defaultModel: 'DeepSeek-V4-Flash'
  },
  bailucode: {
    label: 'Bailucode',
    models: ['bailu-apex'],
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
const CHAT_UPSTREAM_TIMEOUT_MS=Math.max(30_000,Number(process.env.CHAT_UPSTREAM_TIMEOUT_MS||270_000));
const CHAT_FAST_UPSTREAM_TIMEOUT_MS=Math.max(30_000,Number(process.env.CHAT_FAST_UPSTREAM_TIMEOUT_MS||270_000));
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
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

function parseKeys(pluralName, singleName) {
  const raw = process.env[pluralName] || process.env[singleName] || '';
  return raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const providerKeyCursor = new Map();
function rotateProviderKeys(provider, keys) {
  if (!Array.isArray(keys) || keys.length < 2) return keys || [];
  const start = providerKeyCursor.get(provider) || 0;
  providerKeyCursor.set(provider, (start + 1) % keys.length);
  return keys.map((_, i) => keys[(start + i) % keys.length]);
}

function sanitizeCustomProviderKeys(body,provider){
  const raw=body?.customApiKeys?.[provider];
  if(typeof raw!=='string'&& !Array.isArray(raw))return [];
  const text=Array.isArray(raw)?raw.join(','):raw;
  return String(text).split(/[\n,]+/).map(x=>x.trim()).filter(x=>x.length>=8).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}


// Configured keys belong to the SAME selected provider. Exhaust each key
// before switching models/providers; the emergency fallback switch controls
// cross-provider/anonymous routing, not key rotation.
function providerCredentials(keys,autoFallback=false){
  const list=Array.isArray(keys)?keys:[];
  // Cloudflare supplies account objects; preserve those alongside string keys.
  return [...new Set(list.filter(item=>item&&(typeof item!=='string'||item.trim())))]
    .slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function getProviderKeys(provider,rotate=true) {
  const envNames={
    gemini:['GEMINI_API_KEYS','GEMINI_API_KEY'],
    groq:['GROQ_API_KEYS','GROQ_API_KEY'],
    openrouter:['OPENROUTER_API_KEYS','OPENROUTER_API_KEY'],
    mistral:['MISTRAL_API_KEYS','MISTRAL_API_KEY'],
    cohere:['COHERE_API_KEYS','COHERE_API_KEY'],
    aihorde:['AIHORDE_API_KEYS','AIHORDE_API_KEY'],
    unorouter:['UNOROUTER_API_KEYS','UNOROUTER_API_KEY'],
    nvidia:['NVIDIA_API_KEYS','NVIDIA_API_KEY'],
    codecraft:['CODECRAFT_API_KEYS','CODECRAFT_API_KEY'],
    agentrouter:['AGENTROUTER_API_KEYS','AGENTROUTER_API_KEY'],
    hcnsec:['HCNSEC_API_KEYS','HCNSEC_API_KEY'],
    bailucode:['BAILUCODE_API_KEYS','BAILUCODE_API_KEY'],
    seekai:['SEEKAI_API_KEYS','SEEKAI_API_KEY']
  }[provider];
  if(!envNames)return [];
  const keys=parseKeys(envNames[0],envNames[1]);
  return (rotate?rotateProviderKeys(provider,keys):keys).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function getCloudflareAccounts() {
  const accounts = [];
  const raw = process.env.CLOUDFLARE_ACCOUNTS || '';
  for (const entry of raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean)) {
    const separator = entry.indexOf(':');
    if (separator < 1) continue;
    const accountId = entry.slice(0, separator).trim();
    const apiToken = entry.slice(separator + 1).trim();
    if (accountId && apiToken) accounts.push({ accountId, apiToken });
  }

  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  if (accountId && apiToken && !accounts.some(x => x.accountId === accountId && x.apiToken === apiToken)) {
    accounts.push({ accountId, apiToken });
  }
  return accounts.slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function getBailuAnthropicKeys(rotate=true){
  const dedicated=parseKeys('BAILUCODE_ANTHROPIC_API_KEYS','BAILUCODE_ANTHROPIC_API_KEY');
  const keys=dedicated.length?dedicated:parseKeys('BAILUCODE_API_KEYS','BAILUCODE_API_KEY');
  return (rotate?rotateProviderKeys('bailucode-anthropic',keys):keys).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

function credentialCount(provider) {
  if(provider==='cloudflare')return getCloudflareAccounts().length;
  if(provider==='bailucode')return getProviderKeys(provider).length+getBailuAnthropicKeys().length;
  return getProviderKeys(provider).length;
}

function configured(provider) {
  return credentialCount(provider) > 0;
}

function providerLabel(provider) {
  if(provider==='aihorde-public') return 'AI Horde Anonymous';
  return PROVIDERS[provider]?.label || provider;
}

function modelLabel(model = '') {
  return String(model)
    .replace(/^@cf\//,'')
    .replace(/^openai\//,'')
    .replace(/^google\//,'')
    .replace(/^deepseek\//,'')
    .replace(/^groq\//,'')
    .replace(/[-_]/g,' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function safeEmit(emit, event) {
  try { emit?.(event); } catch (_) {}
}

function activity(emit, id, label, state = 'running', kind = 'process', detail = '') {
  safeEmit(emit, { type:'activity', id, label, state, kind, detail, at:Date.now() });
}

function providerAttemptDetail({model='',attemptIndex=0,attemptCount=1,attemptNoun='credential',fallbackModel=''}) {
  const parts=[];
  if(model) parts.push(modelLabel(model));
  if(attemptCount>1) parts.push(`${attemptNoun} ${attemptIndex+1}/${attemptCount}`);
  if(fallbackModel) parts.push(`fallback model ${modelLabel(fallbackModel)}`);
  return parts.join(' • ');
}

function providerLifecycleActivity(emit, {
  provider='', model='', state='running', phase='connecting', detail='',
  attemptIndex=0, attemptCount=1, attemptNoun='credential', fallbackModel=''
}={}) {
  if(!provider) return;
  const name=providerLabel(provider);
  const id=`provider-${provider}`;
  let label=`Connecting to ${providerLabel(provider)}`;

  if(phase==='connected') label=`${providerLabel(provider)} connected`;
  else if(phase==='retry') label=`Retrying ${name}`;
  else if(phase==='failed') label='Provider connection failed';

  const attemptDetail=providerAttemptDetail({model,attemptIndex,attemptCount,attemptNoun,fallbackModel});
  // Keep one lifecycle row per provider. Retries are transient diagnostics; once a
  // later credential/model succeeds, the same activity id is overwritten by the
  // final connected state instead of leaving a scary stale failure in the UI.
  activity(emit,id,label,state,'provider',detail || attemptDetail);
}


function wantsCompleteCode(message='') {
  const text=String(message||'').toLowerCase().replace(/\s+/g,' ').trim();
  return [
    /paki\s*(?:bigay|ibigay)(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /bigay(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /ibigay(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /\bbuong\s+code\b/i,
    /\bfull\s+(?:source\s+)?code\b/i,
    /\bcomplete\s+(?:source\s+)?code\b/i,
    /\bwhole\s+(?:source\s+)?code\b/i,
    /\bentire\s+(?:source\s+)?code\b/i,
    /\bupdated\s+(?:source\s+)?code\b/i,
    /\bupdate(?:d)?\s+code\b/i,
    /\bfixed\s+(?:source\s+)?code\b/i,
    /\bworking\s+(?:source\s+)?code\b/i,
    /\bready[- ]to[- ](?:import|build)\b/i,
    /\bdo\s+not\s+(?:split|truncate)\b/i,
    /\b(?:don't|dont)\s+(?:split|truncate)\b/i
  ].some(rx=>rx.test(text));
}

const RESPONSE_EFFORT_LEVELS=['Instant','Low','Medium','High','Extra','Max'];
const RESPONSE_EFFORT_RANK=Object.fromEntries(RESPONSE_EFFORT_LEVELS.map((name,index)=>[name,index]));

function normalizeResponseEffort(value='Instant', fastAnswers=false) {
  if(fastAnswers===true)return 'Instant';
  const raw=String(value||'Instant').trim().toLowerCase();
  if(raw==='max'||raw==='maximum')return 'Max';
  if(raw==='extra'||raw==='xhigh'||raw==='extra-high')return 'Extra';
  if(raw==='high'||raw==='deep')return 'High';
  if(raw==='medium'||raw==='balanced')return 'Medium';
  if(raw==='low'||raw==='light')return 'Low';
  return 'Instant';
}

function responseEffortRank(value='Instant'){
  return RESPONSE_EFFORT_RANK[normalizeResponseEffort(value)] ?? 0;
}

function responseEffortPolicy(value='Instant'){
  const level=normalizeResponseEffort(value);
  const rank=responseEffortRank(level);
  const reasoningTokens=[0,384,768,1536,3072,5120][rank]||0;
  return {
    level,
    rank,
    reasoningTokens,
    // Keep the selected level's latency policy shared across providers. Instant
    // answers avoid auxiliary model calls; later levels progressively add them.
    activityPlanner:rank>=1,
    qualityPreflight:rank>=2,
    activityEvidence:rank>=3,
    // OpenRouter supports a six-step reasoning scale, so preserve all six UI levels.
    openRouter:['none','minimal','low','medium','high','xhigh'][rank]||'none',
    // Providers with a three-step native control still retain six distinct app
    // levels through the shared system instruction, token budget and Extra/Max preflight.
    standard:rank<=1?'low':rank===2?'medium':'high',
    gemini:['MINIMAL','LOW','MEDIUM','HIGH','HIGH','HIGH'][rank]||'MINIMAL'
  };
}

function effortOutputBudgetFor(message='',effort='Instant'){
  const base=outputBudgetFor(message);
  const policy=responseEffortPolicy(effort);
  return Math.min(16384,base+policy.reasoningTokens);
}

function nativeEffortFields(provider,model,effort='Instant'){
  const policy=responseEffortPolicy(effort);
  const target=String(model||'').toLowerCase();

  if(provider==='openrouter'){
    return {reasoning:{effort:policy.openRouter,exclude:true}};
  }

  if(provider==='groq'){
    if(target==='qwen/qwen3.8-27b'){
      return {
        reasoning_effort:policy.rank===0?'none':policy.standard,
        include_reasoning:false
      };
    }
    if(/^openai\/gpt-oss-(20b|120b)$/.test(target)){
      return {
        reasoning_effort:policy.standard,
        include_reasoning:false
      };
    }
  }

  if(provider==='mistral' && target==='mistral-small-latest'){
    return {reasoning_effort:policy.rank>=3?'high':'none'};
  }

  if(provider==='nvidia' && target.includes('nemotron')){
    if(policy.rank===0)return {chat_template_kwargs:{enable_thinking:false}};
    return {
      chat_template_kwargs:{enable_thinking:true},
      thinking_token_budget:Math.max(384,policy.reasoningTokens)
    };
  }

  return {};
}

function geminiThinkingConfig(model,effort='Instant'){
  const target=String(model||'').toLowerCase();
  // The configured Gemini family is 3.x/current-latest; Gemini 3+ exposes
  // thinkingLevel. Do not request thought text.
  if(target==='gemini-flash-latest'||/^gemini-3\./.test(target)){
    return {includeThoughts:false,thinkingLevel:responseEffortPolicy(effort).gemini};
  }
  return null;
}

function outputBudgetFor(message='') {
  // Dynamic response budget: short requests stay efficient, while complex
  // coding/research/troubleshooting tasks have more room to finish properly.
  if(wantsCompleteCode(message)) return 16384;
  const t=normalizeIntentText(message);
  const complex=/\b(code|coding|debug|error|build|architecture|full|complete|detailed|breakdown|analyze|analysis|research|compare|review|verify|step by step|troubleshoot|production|website|app|api)\b/i.test(t);
  return complex ? 8192 : 4096;
}

function responseQualityInstruction(message='') {
  const full=wantsCompleteCode(message);
  let text =
    ' Before sending the final answer, silently proofread it for spelling, grammar, punctuation, naming consistency, syntax mistakes, missing brackets, and accidental omissions. ' +
    'Do not claim absolute perfection; prioritize correctness and clear natural language.';

  if(full){
    text +=
      ' The user explicitly requested the complete code. Return the entire requested code in this single response whenever the provider output limit permits. ' +
      'Do not intentionally split it into Part 1/Part 2, do not omit unchanged sections, do not use placeholders such as "rest of code here", and do not tell the user to press Continue. ' +
      'Use one complete fenced code block per requested file and preserve all required imports, functions, styles, markup, configuration, and closing syntax.';
  }else{
    text +=
      ' If the answer would be unusually long, you may stop only at a clean logical boundary rather than forcing everything into one response. ' +
      'Do not cut a code block, function, HTML tag structure, JSON object, or sentence in the middle. This allows the interface Continue button to request the next portion.';
  }
  return text;
}


function detectArtifactRequest(message='', files=[]) {
  const text=String(message||'').trim();
  if(!text) return null;

  // Only create a downloadable artifact when the USER explicitly asks for one.
  // Dotted code identifiers (req.method, res.ok), URLs and ordinary filename mentions
  // must never be treated as download requests by themselves.
  const knownExts=new Set([
    'zip','pdf','txt','md','html','htm','js','mjs','cjs','css','py','json','csv','xml','svg',
    'sql','ts','tsx','jsx','php','java','c','cpp','h','hpp','cs','yaml','yml','sh'
  ]);

  const fileMatch=(text.match(/(?:^|[\s\"'`(])([a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,79}\.([a-zA-Z0-9]{1,10}))(?=$|[\s\"'`),!?])/i)||[]);
  const candidateFilename=fileMatch[1]||'';
  const candidateExt=(fileMatch[2]||'').toLowerCase();
  const filename=knownExts.has(candidateExt) ? candidateFilename : '';
  const ext=filename ? candidateExt : '';

  const deliveryVerb=/\b(?:download|downloadable|i-download|idownload|export|save(?:\s+as)?|send(?:\s+me)?|pa[ -]?send|paki[ -]?send|bigay|ibigay|bigyan)\b/i.test(text);
  const createVerb=/\b(?:gawan|gumawa|create|generate)\b/i.test(text);
  const artifactNoun=/\b(?:file|zip|pdf|document|doc|archive|download|code|source|project)\b/i.test(text);
  const typedFile=/\b(?:html|javascript|js|css|python|json|markdown|text|txt|csv|xml|svg|sql|typescript|tsx|jsx|php|java|c\+\+|cpp|c#|yaml|yml|shell|bash)\s+(?:file|document|code)\b/i.test(text);
  const directType=/(?:^|\s)\.(?:zip|pdf|txt|md|html|js|css|py|json|csv|xml|svg|sql|ts|tsx|jsx|php|java|cpp|cs|yaml|yml|sh)\b/i.test(text) ||
    /\b(?:zip file|pdf file|downloadable file|download file)\b/i.test(text);

  const inputFiles=Array.isArray(files)?files:[];
  const rootNames=[...new Set(inputFiles.map(f=>String(f?.parentName||f?.name||f?.filename||'')).filter(Boolean))];
  const attachedZip=rootNames.find(name=>/\.zip$/i.test(name))||'';
  const codeDeliveryIntent=wantsCompleteCode(text) ||
    /\b(?:updated|fixed|complete|full|buong)\s+(?:source\s+)?(?:code|project)\b/i.test(text) ||
    /\b(?:bigay|ibigay|send|pa[ -]?send|export|download)\b[\s\S]{0,45}\b(?:code|source|project)\b/i.test(text);
  const projectEditIntent=/\b(?:ayusin|fix|update|modify|edit|refactor|convert|gawing|build|create|gumawa|gawan)\b/i.test(text) &&
    /\b(?:code|project|app|website|android|aide|gradle|source)\b/i.test(text);
  const implicitProjectArtifact=Boolean(attachedZip && (codeDeliveryIntent||projectEditIntent));

  const explicitlyRequested =
    (deliveryVerb && (artifactNoun || directType || !!filename || typedFile)) ||
    (createVerb && (artifactNoun || typedFile || directType)) ||
    codeDeliveryIntent ||
    implicitProjectArtifact;

  if(!explicitlyRequested) return null;

  let kind='file';
  let wantedExt=ext;

  if(ext==='zip' || /(?:^|\s)\.zip\b|\bzip file\b/i.test(text) || implicitProjectArtifact ||
     (codeDeliveryIntent && /\b(?:project|app|website|android|aide|gradle)\b/i.test(text))) {
    kind='zip'; wantedExt='zip';
  } else if(ext==='pdf' || /(?:^|\s)\.pdf\b|\bpdf (?:file|document)\b/i.test(text)) {
    kind='pdf'; wantedExt='pdf';
  } else if(!wantedExt) {
    const words=[
      ['html','html'],['javascript','js'],['js','js'],['css','css'],['python','py'],
      ['json','json'],['markdown','md'],['text','txt'],['txt','txt'],['csv','csv'],
      ['xml','xml'],['svg','svg'],['sql','sql'],['typescript','ts'],['tsx','tsx'],
      ['jsx','jsx'],['php','php'],['java','java'],['c++','cpp'],['cpp','cpp'],
      ['c#','cs'],['yaml','yaml'],['yml','yml'],['shell','sh'],['bash','sh']
    ];
    for(const [word,x] of words){
      const rx=new RegExp(`\\b${word.replace(/[+]/g,'\\+')}\\s+(?:file|document|code)\\b`,'i');
      if(rx.test(text)){wantedExt=x;break;}
    }
    if(!wantedExt) wantedExt='txt';
  }

  const zipBase=attachedZip
    ? attachedZip.replace(/\.zip$/i,'').replace(/[^\w.\- ()]/g,'_').slice(0,78)
    : '';
  const autoName=(kind==='zip' && zipBase)
    ? `${zipBase}_updated.zip`
    : `JepongDevxyz-output.${wantedExt}`;
  const safeName=(filename || autoName)
    .replace(/[^\w.\- ()]/g,'_')
    .slice(0,100);

  return {kind,ext:wantedExt,filename:safeName};
}

function artifactInstruction(message='', files=[]) {
  const req=detectArtifactRequest(message,files);
  if(!req) return '';

  const inputFiles=Array.isArray(files)?files:[];
  const attachedZip=inputFiles.find(f=>/\.zip$/i.test(String(f?.parentName||f?.name||f?.filename||'')));
  let text =
    ' The user requested a real downloadable artifact. Generate the complete final content that should go inside that artifact. ' +
    'Do not merely explain how to create the file and do not invent a fake download URL. ';

  if(req.kind==='zip' && attachedZip){
    text +=
      'The user uploaded an existing project ZIP. The browser keeps the original archive locally and will overlay your changed/new files onto it, so unchanged files and binary libraries remain intact. ' +
      'For EVERY file you actually changed or created, emit one line exactly "FILE: relative/path/filename.ext" immediately followed by a fenced code block containing the COMPLETE final contents of that file. ' +
      'Use the real archive-relative path. Never emit placeholders such as "same as before", "unchanged code here", "rest omitted", or fabricated binary contents. ' +
      'Do not rewrite files you did not need to change merely to make the ZIP look complete. ' +
      'In the visible final answer, be concise but concrete: state what you inspected, the real fixes made, what verification actually passed, any build/runtime limitation, and that the updated downloadable project ZIP contains the preserved original files plus your changed files. ';
  }else if(req.kind==='zip'){
    text +=
      'For a new ZIP/project request, put EVERY generated project file in its own fenced code block and immediately precede it with a line exactly like "FILE: path/filename.ext". ' +
      'Use real relative paths, not display labels. Include all source/config files required for the project to work; do not use placeholders such as "unchanged code here", "same as before", or "rest omitted". ';
  }else if(req.kind==='pdf'){
    text +=
      'For a PDF request, write polished document content with clear headings and readable prose; the server will convert your response into an actual PDF. ';
  }else{
    text +=
      `The server will package the response as a .${req.ext} file. If this is source code, return the complete source code in a fenced code block without placeholders. `;
  }
  return text;
}

function utf8Bytes(text=''){ return new TextEncoder().encode(String(text)); }

function bytesToBase64(bytes){
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  }
  return btoa(binary);
}

function crc32(bytes){
  let crc=0 ^ (-1);
  for(let i=0;i<bytes.length;i++){
    crc=(crc>>>8)^CRC32_TABLE[(crc^bytes[i])&0xff];
  }
  return (crc ^ (-1))>>>0;
}

const CRC32_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  return table;
})();

function dosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
  const day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}

function writeU16(view,offset,value){ view.setUint16(offset,value,true); }
function writeU32(view,offset,value){ view.setUint32(offset,value>>>0,true); }

function makeZip(entries=[]){
  const safeEntries=entries
    .filter(e=>e&&e.name!=null)
    .map((e,i)=>({
      name:String(e.name||`file-${i+1}.txt`).replace(/^\/+/,'').replace(/\.\.(\/|\\)/g,''),
      data:e.data instanceof Uint8Array?e.data:utf8Bytes(e.data||'')
    }));

  const locals=[];
  const centrals=[];
  let localOffset=0;
  const stamp=dosDateTime();

  for(const e of safeEntries){
    const nameBytes=utf8Bytes(e.name);
    const crc=crc32(e.data);

    const local=new Uint8Array(30+nameBytes.length+e.data.length);
    const lv=new DataView(local.buffer);
    writeU32(lv,0,0x04034b50);
    writeU16(lv,4,20);
    writeU16(lv,6,0x0800);
    writeU16(lv,8,0); // store
    writeU16(lv,10,stamp.time);
    writeU16(lv,12,stamp.day);
    writeU32(lv,14,crc);
    writeU32(lv,18,e.data.length);
    writeU32(lv,22,e.data.length);
    writeU16(lv,26,nameBytes.length);
    writeU16(lv,28,0);
    local.set(nameBytes,30);
    local.set(e.data,30+nameBytes.length);
    locals.push(local);

    const central=new Uint8Array(46+nameBytes.length);
    const cv=new DataView(central.buffer);
    writeU32(cv,0,0x02014b50);
    writeU16(cv,4,20);
    writeU16(cv,6,20);
    writeU16(cv,8,0x0800);
    writeU16(cv,10,0);
    writeU16(cv,12,stamp.time);
    writeU16(cv,14,stamp.day);
    writeU32(cv,16,crc);
    writeU32(cv,20,e.data.length);
    writeU32(cv,24,e.data.length);
    writeU16(cv,28,nameBytes.length);
    writeU16(cv,30,0);
    writeU16(cv,32,0);
    writeU16(cv,34,0);
    writeU16(cv,36,0);
    writeU32(cv,38,0);
    writeU32(cv,42,localOffset);
    central.set(nameBytes,46);
    centrals.push(central);

    localOffset+=local.length;
  }

  const centralSize=centrals.reduce((n,x)=>n+x.length,0);
  const end=new Uint8Array(22);
  const ev=new DataView(end.buffer);
  writeU32(ev,0,0x06054b50);
  writeU16(ev,4,0); writeU16(ev,6,0);
  writeU16(ev,8,safeEntries.length);
  writeU16(ev,10,safeEntries.length);
  writeU32(ev,12,centralSize);
  writeU32(ev,16,localOffset);
  writeU16(ev,20,0);

  const total=localOffset+centralSize+end.length;
  const out=new Uint8Array(total);
  let p=0;
  for(const x of locals){out.set(x,p);p+=x.length;}
  for(const x of centrals){out.set(x,p);p+=x.length;}
  out.set(end,p);
  return out;
}

function asciiPdfText(text=''){
  return String(text)
    .replace(/\r/g,'')
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/[—–]/g,'-')
    .replace(/…/g,'...')
    .replace(/•/g,'*')
    .replace(/→/g,'->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'?');
}

function wrapPdfLines(text='',width=92){
  const out=[];
  for(const raw of asciiPdfText(text).split('\n')){
    if(!raw){out.push('');continue;}
    let line=raw;
    while(line.length>width){
      let cut=line.lastIndexOf(' ',width);
      if(cut<30) cut=width;
      out.push(line.slice(0,cut));
      line=line.slice(cut).trimStart();
    }
    out.push(line);
  }
  return out;
}

function pdfEscape(s=''){ return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }

function makePdf(text=''){
  const lines=wrapPdfLines(text,92);
  const perPage=48;
  const pages=[];
  for(let i=0;i<Math.max(1,Math.ceil(lines.length/perPage));i++){
    pages.push(lines.slice(i*perPage,(i+1)*perPage));
  }

  const pageCount=pages.length;
  const firstPageObj=4;
  const firstContentObj=firstPageObj+pageCount;
  const objects=[];

  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[2]=`<< /Type /Pages /Kids [${pages.map((_,i)=>`${firstPageObj+i} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  for(let i=0;i<pageCount;i++){
    const pageObj=firstPageObj+i;
    const contentObj=firstContentObj+i;
    objects[pageObj]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;

    let stream='BT\n/F1 10 Tf\n50 750 Td\n13 TL\n';
    for(const line of pages[i]){
      stream+=`(${pdfEscape(line)}) Tj\nT*\n`;
    }
    stream+='ET\n';
    const len=utf8Bytes(stream).length;
    objects[contentObj]=`<< /Length ${len} >>\nstream\n${stream}endstream`;
  }

  const enc=new TextEncoder();
  const chunks=[enc.encode('%PDF-1.4\n')];
  const offsets=[0];
  let pos=chunks[0].length;
  const maxObj=objects.length-1;

  for(let i=1;i<=maxObj;i++){
    offsets[i]=pos;
    const chunk=enc.encode(`${i} 0 obj\n${objects[i]}\nendobj\n`);
    chunks.push(chunk);
    pos+=chunk.length;
  }

  const xrefPos=pos;
  let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=maxObj;i++) xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  chunks.push(enc.encode(xref));

  const total=chunks.reduce((n,c)=>n+c.length,0);
  const out=new Uint8Array(total);
  let p=0; for(const c of chunks){out.set(c,p);p+=c.length;}
  return out;
}

function extensionFromFence(lang=''){
  const map={
    html:'html',javascript:'js',js:'js',typescript:'ts',ts:'ts',tsx:'tsx',jsx:'jsx',
    css:'css',python:'py',py:'py',json:'json',markdown:'md',md:'md',csv:'csv',
    xml:'xml',svg:'svg',sql:'sql',php:'php',java:'java',cpp:'cpp',c:'c',csharp:'cs',
    cs:'cs',yaml:'yaml',yml:'yml',bash:'sh',shell:'sh',sh:'sh'
  };
  return map[String(lang||'').toLowerCase()]||'txt';
}

function extractZipEntries(responseText='',requestedFilename='',options={}){
  const text=String(responseText||'');
  const entries=[];
  const explicitOnly=options?.explicitOnly===true;
  const addReadme=options?.addReadme!==false;
  const named=/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?(?:(?:FILE|Filename|File)\s*:\s*)?([\w.@+()\-\/\\ ]+\.(?:html?|css|m?js|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|h|hpp|cs|xml|svg|sql|ya?ml|sh|gradle|properties|md|txt))(?:\*\*)?\s*\n```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/gi;
  let m;
  while((m=named.exec(text))){
    const name=m[1].trim().replace(/[^\w./\- ()]/g,'_').replace(/^\/+/,'');
    entries.push({name:name||`file-${entries.length+1}.${extensionFromFence(m[2])}`,data:m[3]});
  }

  if(!entries.length && !explicitOnly){
    const fence=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
    while((m=fence.exec(text))){
      const ext=extensionFromFence(m[1]);
      const base=requestedFilename && !requestedFilename.toLowerCase().endsWith('.zip')
        ? requestedFilename
        : `file-${entries.length+1}.${ext}`;
      entries.push({name:base,data:m[2]});
    }
  }

  if(!entries.length && !explicitOnly) entries.push({name:'response.md',data:text});
  if(addReadme && entries.length && !entries.some(e=>e.name.toLowerCase()==='readme.md')){
    entries.push({name:'README.md',data:text});
  }
  return entries;
}

function extractPrimaryFileContent(responseText='',ext='txt'){
  const text=String(responseText||'');
  const codeLike=new Set(['html','js','css','py','json','xml','svg','sql','ts','tsx','jsx','php','java','cpp','c','cs','yaml','yml','sh']);
  if(codeLike.has(ext)){
    const fence=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
    let m;
    while((m=fence.exec(text))){
      const fenceExt=extensionFromFence(m[1]);
      if(fenceExt===ext || !m[1]) return m[2].replace(/\s+$/,'')+'\n';
    }
    const first=text.match(/```[a-zA-Z0-9_+#.-]*\n([\s\S]*?)```/);
    if(first) return first[1].replace(/\s+$/,'')+'\n';
  }
  return text;
}

function mimeForExtension(ext='txt'){
  const map={
    txt:'text/plain;charset=utf-8',md:'text/markdown;charset=utf-8',
    html:'text/html;charset=utf-8',css:'text/css;charset=utf-8',
    js:'text/javascript;charset=utf-8',ts:'text/plain;charset=utf-8',
    json:'application/json;charset=utf-8',csv:'text/csv;charset=utf-8',
    xml:'application/xml;charset=utf-8',svg:'image/svg+xml;charset=utf-8',
    pdf:'application/pdf',zip:'application/zip',py:'text/x-python;charset=utf-8',
    sql:'application/sql;charset=utf-8'
  };
  return map[ext]||'application/octet-stream';
}

function buildGeneratedArtifact(message='',responseText='',files=[]){
  const req=detectArtifactRequest(message,files);
  if(!req) return null;

  let bytes;
  let filename=req.filename;
  let mimeType=mimeForExtension(req.ext);
  let entryCount=1;
  let overlay=false;

  if(req.kind==='zip'){
    filename=filename.toLowerCase().endsWith('.zip')?filename:`${filename.replace(/\.[^.]+$/,'')}.zip`;
    overlay=(Array.isArray(files)?files:[]).some(f=>/\.zip$/i.test(String(f?.parentName||f?.name||f?.filename||'')));
    const entries=extractZipEntries(responseText,'',{
      explicitOnly:overlay,
      addReadme:!overlay
    });
    if(overlay && !entries.length){
      return {
        error:'The model did not return any complete FILE: path blocks to overlay onto the uploaded project ZIP.',
        filename,
        size:0
      };
    }
    entryCount=entries.length;
    bytes=makeZip(entries);
    mimeType='application/zip';
  }else if(req.kind==='pdf'){
    filename=filename.toLowerCase().endsWith('.pdf')?filename:`${filename.replace(/\.[^.]+$/,'')}.pdf`;
    bytes=makePdf(responseText);
    mimeType='application/pdf';
  }else{
    const content=extractPrimaryFileContent(responseText,req.ext);
    bytes=utf8Bytes(content);
  }

  // Keep SSE payloads comfortably bounded. Existing uploaded ZIPs are merged in
  // the browser, so this payload carries only changed/new text files.
  if(bytes.length>6_000_000){
    return {
      error:'Generated file is too large to send through the chat stream.',
      filename,
      size:bytes.length
    };
  }

  return {
    filename,
    mimeType,
    size:bytes.length,
    base64:bytesToBase64(bytes),
    kind:req.kind,
    entryCount,
    overlay,
    label:req.kind==='zip'
      ? (overlay
          ? `Updated project patch · ${entryCount} changed file${entryCount===1?'':'s'}`
          : `ZIP project · ${entryCount} file${entryCount===1?'':'s'}`)
      : req.kind==='pdf'?'PDF document':`${req.ext.toUpperCase()} file`
  };
}


/* =========================================================
   JEPONGDEVXYZ HELPFULNESS CORE
   Improves intent understanding, typo tolerance, context use,
   ambiguity handling, answer quality, and task-aware behavior.
   This does not change the underlying provider model itself.
   ========================================================= */

function normalizeIntentText(input=''){
  return String(input||'')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/\s+/g,' ')
    .replace(/\bpano\b/g,'paano')
    .replace(/\bbat\b/g,'bakit')
    .replace(/\bbkt\b/g,'bakit')
    .replace(/\bpwedi\b/g,'pwede')
    .replace(/\bpede\b/g,'pwede')
    .replace(/\bpuedi\b/g,'pwede')
    .replace(/\bayosin\b/g,'ayusin')
    .replace(/\bgawn\b/g,'gawin')
    .replace(/\bgawinm\b/g,'gawin')
    .replace(/\bgumana\b/g,'gumagana')
    .replace(/\bdiko\b/g,'di ko')
    .replace(/\bdi\s+ko\b/g,'hindi ko')
    .replace(/\bsya\b/g,'siya')
    .replace(/\bganon\b/g,'ganoon')
    .replace(/\bganto\b/g,'ganito')
    .replace(/\beto\b/g,'ito')
    .replace(/\byan\b/g,'iyan')
    .replace(/\byung\b/g,'iyong')
    .replace(/\bpls\b/g,'please')
    .replace(/\bplz\b/g,'please')
    .replace(/\bthx\b/g,'thanks')
    .trim();
}

function classifyUserTask(message='', files=[]){
  const raw=String(message||'');
  const t=normalizeIntentText(raw);
  const hasFiles=Array.isArray(files)&&files.length>0;
  const hasImage=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/'));
  const hasVideo=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('video/')||f?.mediaRole==='video-frame');
  const hasDocument=Array.isArray(files)&&files.some(f=>/\b(pdf|docx|pptx|spreadsheet|epub|zip|rtf|text)\b/i.test(String(f?.kind||'')));
  const hasCodeFile=Array.isArray(files)&&files.some(f=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|h|hpp|cs|sql|ya?ml|sh|gradle|properties|toml)$/i.test(String(f?.name||f?.filename||'')));

  if(hasVideo || /\b(video|clip|recording)\b/i.test(t)) return 'video';
  if(hasImage || /\b(image|photo|picture|larawan|screenshot|logo|design)\b/i.test(t)) return 'image';
  if(hasDocument && /\b(summarize|summary|review|read|extract|document|file|pdf|docx|pptx|spreadsheet)\b/i.test(t)) return 'file';
  if(hasCodeFile || /\b(code|coding|debug|bug|error|javascript|typescript|html|css|python|node|api|backend|frontend|react|php|java|sql|github|vercel|deploy|build|compile)\b/i.test(t)) return 'coding';
  if(shouldAutoResearch(raw) || /\b(research|search|verify online|check online|hanapin|maghanap|tingnan online)\b/i.test(t)) return 'research';
  if(/\b(homework|school|study|lesson|explain|solve|equation|quiz|reviewer|flashcard|assignment)\b/i.test(t)) return 'study';
  if(/\b(write|rewrite|grammar|caption|script|email|message|essay|summarize|summary|translate|translation)\b/i.test(t)) return 'writing';
  if(/\b(fix|ayusin|problem|issue|not working|hindi gumagana|gumagana ba|troubleshoot|bakit)\b/i.test(t)) return 'troubleshooting';
  if(/\b(compare|choose|recommend|best|alin|which|budget|plan|planning)\b/i.test(t)) return 'decision';
  if(/^(hi|hello|hey|kumusta|kamusta|sino ka|who are you|thanks|thank you|salamat)[!?.\s]*$/i.test(t)) return 'casual';
  if(hasFiles) return 'file';
  return 'general';
}

function looksReferential(message=''){
  const t=normalizeIntentText(message);
  return /\b(ito|iyan|iyon|iyong|yung|ganito|ganyan|same|same as before|ulit|again|yung nauna|iyong nauna|doon|diyan|dito|this|that|these|those|above|previous|earlier)\b/i.test(t);
}

function looksAmbiguousButLowRisk(message=''){
  const t=normalizeIntentText(message);
  if(!t) return false;
  const words=t.split(/\s+/).filter(Boolean);
  return words.length<=5 && !/[?]/.test(message) && !/\b(delete|send|buy|pay|password|account|medical|legal|financial)\b/i.test(t);
}

function helpfulnessCoreInstruction(userMessage='', history=[], files=[]){
  const task=classifyUserTask(userMessage,files);
  const referential=looksReferential(userMessage);
  const typoish=/\b(pano|bat|bkt|pwedi|pede|puedi|ayosin|gawn|diko|sya|ganon|ganto|eto|yan|pls|plz)\b/i.test(String(userMessage||''));
  const historyCount=Array.isArray(history)?history.length:0;
  const fileCount=userAttachmentCount(files);

  let text =
    ' CORE RESPONSE BEHAVIOR: Be highly helpful, practical, context-aware, and easy to talk to. ' +
    'Infer the user’s intended meaning from ordinary typos, misspellings, shorthand, missing punctuation, phonetic spelling, Taglish, and casual chat style. ' +
    'Do not get stuck analyzing a typo or slang term when the intended request is reasonably clear. Answer the intended request directly. ' +
    'Do not scold the user for grammar or spelling. Only mention a correction when the correction itself is useful to the task. ' +
    'Use the latest user message as the primary instruction, while using prior conversation context to resolve references and preserve ongoing decisions. ' +
    'If the user says “ito”, “iyan”, “ganito”, “same”, “ulit”, “this”, “that”, or similar references, connect them to the most recent relevant message, file, code, link, setting, or result when the context makes that clear. ' +
    'Do not ask the user to repeat information that is already present in the conversation or attached files. ' +
    'When a request has one obvious likely interpretation, proceed with that interpretation. If an assumption materially affects the answer, state it briefly. ' +
    'Ask a clarifying question only when genuinely necessary because two or more plausible interpretations would lead to meaningfully different answers, or required information is missing. ' +
    'For low-risk everyday ambiguity, make a reasonable assumption and help immediately instead of blocking on clarification. ' +
    'Never invent facts, test results, file contents, web searches, or actions. Distinguish verified information from inference. ' +
    'Think through complex tasks internally, but give the user only the useful answer, explanation, result, or high-level progress—not hidden chain-of-thought. ' +
    'Prefer concrete next steps, exact fixes, examples, and actionable details over generic filler. ' +
    'Avoid repetitive disclaimers, unnecessary preambles, and restating the entire question. ' +
    'Keep simple questions simple; give fuller detail only when the task benefits from it. ';

  if(typoish){
    text += ' The latest message contains likely shorthand or typos. Interpret them by context and respond to the intended meaning without making the typo itself the topic.';
  }

  if(referential && historyCount){
    text += ' The latest message is referential. Resolve its pronouns/deictic words against the recent conversation before deciding that context is missing.';
  }

  if(fileCount){
    text += ` The user supplied ${fileCount} file${fileCount===1?'':'s'}. When the request concerns those files, ground the answer in their actual content and do not substitute unrelated general knowledge for unseen file details.`;
  }

  if(task==='casual'){
    text += ' This is casual conversation. Reply naturally and briefly; do not over-explain ordinary greetings or slang.';
  } else if(task==='coding'){
    text +=
      ' For coding work: act like a careful senior engineer. Identify the actual failure mode, preserve working code, make the smallest correct fix when possible, and explain only the important tradeoffs. ' +
      'When code or logs are supplied, inspect those exact details before giving a generic solution. If complete code is requested, provide complete runnable code without placeholder omissions.';
  } else if(task==='troubleshooting'){
    text +=
      ' For troubleshooting: prioritize the most likely cause, give checks in a sensible order, separate confirmed symptoms from guesses, and avoid sending the user through unnecessary steps.';
  } else if(task==='research'){
    text +=
      ' For research/current-information tasks: rely on supplied live-source/tool context when available, prefer recent authoritative evidence, and do not present stale model knowledge as current fact.';
  } else if(task==='study'){
    text +=
      ' For learning tasks: explain at the user’s level, build intuition before jargon, show a worked example when useful, and help the user learn rather than merely dumping an answer.';
  } else if(task==='writing'){
    text +=
      ' For writing tasks: preserve the user’s intended meaning and voice, improve clarity and grammar naturally, and return polished copy rather than discussing every edit unless asked.';
  } else if(task==='decision'){
    text +=
      ' For decisions/comparisons: identify the user’s real constraint, compare the factors that matter, and give a clear recommendation with the main reason and tradeoff.';
  } else if(task==='image'){
    text +=
      ' For image/screenshot tasks: focus on visible evidence and the user’s requested change or question. Do not invent details that are not visible.';
  } else if(task==='video'){
    text +=
      ' For video tasks: use native video analysis when supplied; otherwise use sampled frames and metadata. Do not invent unsampled events or audio/transcript details. Follow the user’s requested transformation, review, or question as closely as the available media evidence permits.';
  }

  if(looksAmbiguousButLowRisk(userMessage)){
    text += ' The request is short and low-risk; infer the most natural meaning from context and answer rather than forcing a clarification.';
  }

  return text;
}

function universalCapabilityInstruction(userMessage='', files=[]) {
  const task=classifyUserTask(userMessage,files);
  const hasAttachments=Array.isArray(files)&&files.length>0;
  const hasProjectArchive=(Array.isArray(files)?files:[]).some(f=>
    /\.(?:zip|apk|aab|jar|aar)$/i.test(String(f?.parentName||f?.name||f?.filename||'')) ||
    ['zip','archive','archive-entry'].includes(String(f?.kind||''))
  );

  let text =
    ' UNIVERSAL CAPABILITY PIPELINE: The application has already normalized conversation context, attachments, available tool evidence, and task-specific verification before this response reaches the selected model. ' +
    'Use that supplied evidence regardless of which provider/model is selected. Do not downgrade the answer merely because your provider normally lacks a particular file parser; if parsed attachment/tool context is present, use it. ' +
    'For every task, first identify the concrete requested outcome and constraints from the latest message plus relevant recent context; then inspect available evidence; then solve or implement; then check the result against the request before answering. ' +
    'Never substitute a generic tutorial when the user supplied concrete files, code, screenshots, links, logs, or project context. ' +
    'Never claim inaccessible evidence was inspected. If evidence is partial, use the inspected portions precisely and say only what remains unverified. ' +
    'Do not expose hidden chain-of-thought; communicate concise conclusions, high-level progress, concrete changes, and verification evidence. ';

  if(hasAttachments){
    text +=
      ' ATTACHMENT TASK RULE: Treat supplied attachment content as first-class task input. Cross-reference filenames, declarations, imports, configuration, callers, resources, and errors when relevant instead of judging a file in isolation.';
  }
  if(hasProjectArchive){
    text +=
      ' PROJECT ARCHIVE RULE: A project archive may be represented by a complete file index plus a task-ranked set of source/config entries. Inspect the actual supplied entries before diagnosing. ' +
      'For