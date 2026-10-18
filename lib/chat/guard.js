// JEPONGDEVXYZ AI — API cost/abuse guard
// Extracted from api/chat.js (lines 145-614)

import { normalizeIntentText } from './helpfulness.js';

/* =========================================================
   API COST / ABUSE GUARD
   Best-effort edge-instance guard. For production-wide hard limits,
   back this with a shared store (Supabase/Redis) when available.
========================================================= */
export const API_GUARD = {
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
export const apiGuardWindows = new Map();
export const apiGuardDaily = new Map();
export function stableClientKey(req){
  const raw=String(req?.headers?.get('x-forwarded-for')||req?.headers?.get('x-real-ip')||req?.headers?.get('cf-connecting-ip')||'unknown').split(',')[0].trim();
  let h=2166136261;
  for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619);}
  return `c${(h>>>0).toString(36)}`;
}
export function pruneGuardMaps(now=Date.now()){
  if(apiGuardWindows.size>5000) for(const [k,v] of apiGuardWindows) if(now-v.startedAt>API_GUARD.windowMs*3) apiGuardWindows.delete(k);
  if(apiGuardDaily.size>5000) for(const [k,v] of apiGuardDaily) if(now-v.startedAt>86_400_000) apiGuardDaily.delete(k);
}
export function estimatedTokensFromBody(body){
  let chars=String(body?.message||'').length;
  try{ chars+=JSON.stringify(body?.history||[]).length; }catch(_){}
  for(const f of (Array.isArray(body?.files)?body.files:[])) chars+=String(f?.extractedText||'').length+Math.ceil(String(f?.data||'').length*.08);
  return Math.max(1,Math.ceil(chars/4));
}
export function isHeavyApiRequest(body){
  const effort=normalizeResponseEffort(body?.responseEffort||body?.personalization?.intelligence,body?.personalization?.fastAnswers);
  return responseEffortRank(effort)>=3||body?.activityStream===true||body?.action==='generate-image'||body?.action==='generate-pet-image'||(Array.isArray(body?.files)&&body.files.length>2);
}
export function checkApiGuard(req,body){
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
export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

export function parseKeys(pluralName, singleName) {
  const raw = process.env[pluralName] || process.env[singleName] || '';
  return raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

export function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const providerKeyCursor = new Map();
export function rotateProviderKeys(provider, keys) {
  if (!Array.isArray(keys) || keys.length < 2) return keys || [];
  const start = providerKeyCursor.get(provider) || 0;
  providerKeyCursor.set(provider, (start + 1) % keys.length);
  return keys.map((_, i) => keys[(start + i) % keys.length]);
}

export function sanitizeCustomProviderKeys(body,provider){
  const raw=body?.customApiKeys?.[provider];
  if(typeof raw!=='string'&& !Array.isArray(raw))return [];
  const text=Array.isArray(raw)?raw.join(','):raw;
  return String(text).split(/[\n,]+/).map(x=>x.trim()).filter(x=>x.length>=8).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}


// Configured keys belong to the SAME selected provider. Exhaust each key
// before switching models/providers; the emergency fallback switch controls
// cross-provider/anonymous routing, not key rotation.
export function providerCredentials(keys,autoFallback=false){
  const list=Array.isArray(keys)?keys:[];
  // Cloudflare supplies account objects; preserve those alongside string keys.
  return [...new Set(list.filter(item=>item&&(typeof item!=='string'||item.trim())))]
    .slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

export function getProviderKeys(provider,rotate=true) {
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

export function getCloudflareAccounts() {
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

export function getBailuAnthropicKeys(rotate=true){
  const dedicated=parseKeys('BAILUCODE_ANTHROPIC_API_KEYS','BAILUCODE_ANTHROPIC_API_KEY');
  const keys=dedicated.length?dedicated:parseKeys('BAILUCODE_API_KEYS','BAILUCODE_API_KEY');
  return (rotate?rotateProviderKeys('bailucode-anthropic',keys):keys).slice(0,API_GUARD.maxProviderCredentialsPerRequest);
}

export function credentialCount(provider) {
  if(provider==='cloudflare')return getCloudflareAccounts().length;
  if(provider==='bailucode')return getProviderKeys(provider).length+getBailuAnthropicKeys().length;
  return getProviderKeys(provider).length;
}

export function configured(provider) {
  return credentialCount(provider) > 0;
}

export function providerLabel(provider) {
  if(provider==='aihorde-public') return 'AI Horde Anonymous';
  return PROVIDERS[provider]?.label || provider;
}

export function modelLabel(model = '') {
  return String(model)
    .replace(/^@cf\//,'')
    .replace(/^openai\//,'')
    .replace(/^google\//,'')
    .replace(/^deepseek\//,'')
    .replace(/^groq\//,'')
    .replace(/[-_]/g,' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function safeEmit(emit, event) {
  try { emit?.(event); } catch (_) {}
}

export function activity(emit, id, label, state = 'running', kind = 'process', detail = '') {
  safeEmit(emit, { type:'activity', id, label, state, kind, detail, at:Date.now() });
}

export function providerAttemptDetail({model='',attemptIndex=0,attemptCount=1,attemptNoun='credential',fallbackModel=''}) {
  const parts=[];
  if(model) parts.push(modelLabel(model));
  if(attemptCount>1) parts.push(`${attemptNoun} ${attemptIndex+1}/${attemptCount}`);
  if(fallbackModel) parts.push(`fallback model ${modelLabel(fallbackModel)}`);
  return parts.join(' • ');
}

export function providerLifecycleActivity(emit, {
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


export function wantsCompleteCode(message='') {
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

export const RESPONSE_EFFORT_LEVELS=['Instant','Low','Medium','High','Extra','Max'];
export const RESPONSE_EFFORT_RANK=Object.fromEntries(RESPONSE_EFFORT_LEVELS.map((name,index)=>[name,index]));

export function normalizeResponseEffort(value='Instant', fastAnswers=false) {
  if(fastAnswers===true)return 'Instant';
  const raw=String(value||'Instant').trim().toLowerCase();
  if(raw==='max'||raw==='maximum')return 'Max';
  if(raw==='extra'||raw==='xhigh'||raw==='extra-high')return 'Extra';
  if(raw==='high'||raw==='deep')return 'High';
  if(raw==='medium'||raw==='balanced')return 'Medium';
  if(raw==='low'||raw==='light')return 'Low';
  return 'Instant';
}

export function responseEffortRank(value='Instant'){
  return RESPONSE_EFFORT_RANK[normalizeResponseEffort(value)] ?? 0;
}

export function responseEffortPolicy(value='Instant'){
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

export function effortOutputBudgetFor(message='',effort='Instant'){
  const base=outputBudgetFor(message);
  const policy=responseEffortPolicy(effort);
  return Math.min(16384,base+policy.reasoningTokens);
}

export function nativeEffortFields(provider,model,effort='Instant'){
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

export function geminiThinkingConfig(model,effort='Instant'){
  const target=String(model||'').toLowerCase();
  // The configured Gemini family is 3.x/current-latest; Gemini 3+ exposes
  // thinkingLevel. Do not request thought text.
  if(target==='gemini-flash-latest'||/^gemini-3\./.test(target)){
    return {includeThoughts:false,thinkingLevel:responseEffortPolicy(effort).gemini};
  }
  return null;
}

export function outputBudgetFor(message='') {
  // Dynamic response budget: short requests stay efficient, while complex
  // coding/research/troubleshooting tasks have more room to finish properly.
  if(wantsCompleteCode(message)) return 16384;
  const t=normalizeIntentText(message);
  const complex=/\b(code|coding|debug|error|build|architecture|full|complete|detailed|breakdown|analyze|analysis|research|compare|review|verify|step by step|troubleshoot|production|website|app|api)\b/i.test(t);
  return complex ? 8192 : 4096;
}

export function responseQualityInstruction(message='') {
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


export function detectArtifactRequest(message='', files=[]) {
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
  const artifactNoun=/\b(?:file|zip|pdf|document|doc|docs|report|summary|summaries|ulat|archive|download|code|source|project)\b/i.test(text);
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

export function artifactInstruction(message='', files=[]) {
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

export function utf8Bytes(text=''){ return new TextEncoder().encode(String(text)); }

