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
    models: ['@cf/zai-org/glm-4.7-flash','@cf/google/gemma-4-26b-a4b-it','@cf/nvidia/nemotron-3-120b-a12b'],
    defaultModel: '@cf/zai-org/glm-4.7-flash'
  },
  groq: {
    label: 'Groq',
    models: ['openai/gpt-oss-120b','openai/gpt-oss-20b','llama-3.3-70b-versatile','llama-3.1-8b-instant','groq/compound-mini'],
    defaultModel: 'openai/gpt-oss-20b'
  },
  openrouter: {
    label: 'OpenRouter',
    models: ['openrouter/auto','openai/gpt-oss-120b','deepseek/deepseek-v3.2','google/gemini-3.1-pro-preview'],
    defaultModel: 'openrouter/auto'
  },
  mistral: {
    label: 'Mistral',
    models: ['mistral-small-latest','mistral-large-latest','codestral-latest','ministral-8b-latest'],
    defaultModel: 'mistral-small-latest'
  },
  cohere: {
    label: 'Cohere',
    models: ['command-a-plus-05-2026','command-a-03-2025','command-a-reasoning-08-2025','command-r7b-12-2024'],
    defaultModel: 'command-a-03-2025'
  }
};

const FALLBACK_ORDER = ['cloudflare','groq','mistral','cohere','openrouter','gemini'];
const RETRYABLE = new Set([401,403,408,409,425,429,500,502,503,504]);

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

function getProviderKeys(provider) {
  if (provider === 'gemini') return parseKeys('GEMINI_API_KEYS','GEMINI_API_KEY');
  if (provider === 'groq') return parseKeys('GROQ_API_KEYS','GROQ_API_KEY');
  if (provider === 'openrouter') return parseKeys('OPENROUTER_API_KEYS','OPENROUTER_API_KEY');
  if (provider === 'mistral') return parseKeys('MISTRAL_API_KEYS','MISTRAL_API_KEY');
  if (provider === 'cohere') return parseKeys('COHERE_API_KEYS','COHERE_API_KEY');
  return [];
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
  return accounts;
}

function credentialCount(provider) {
  return provider === 'cloudflare' ? getCloudflareAccounts().length : getProviderKeys(provider).length;
}

function configured(provider) {
  return credentialCount(provider) > 0;
}

function providerLabel(provider) {
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

function buildSystemInstruction(mode, customPrompt, liveWebContext, studyTool, personalization) {
  let text = 'You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Be accurate, helpful, and concise when possible. Put programming code inside fenced Markdown code blocks.';

  if (personalization && typeof personalization === 'object') {
    const p = personalization;
    const safe = v => typeof v === 'string' ? v.trim().slice(0, 4000) : '';
    if (safe(p.nickname)) text += ` Address the user as ${safe(p.nickname)} when natural, but do not overuse the name.`;
    if (safe(p.occupation)) text += ` The user describes their occupation/role as: ${safe(p.occupation)}.`;
    if (safe(p.moreAbout)) text += ` User-provided preferences/context: ${safe(p.moreAbout)}.`;
    if (p.memoryEnabled && safe(p.memorySummary)) text += ` User-controlled memory summary: ${safe(p.memorySummary)}.`;
    if (safe(p.customInstructions)) text += ` Custom personalization instructions: ${safe(p.customInstructions)}.`;

    const style = safe(p.baseStyle);
    if (style && style !== 'Default') text += ` Use a ${style.toLowerCase()} communication style.`;
    if (p.warm === 'More') text += ' Use a warmer, supportive tone.';
    else if (p.warm === 'Less') text += ' Keep warmth restrained and matter-of-fact.';
    if (p.enthusiastic === 'More') text += ' Be more energetic and enthusiastic.';
    else if (p.enthusiastic === 'Less') text += ' Keep enthusiasm low-key.';
    if (p.headersLists === 'More') text += ' Prefer clear headings and structured lists when useful.';
    else if (p.headersLists === 'Less') text += ' Avoid unnecessary headings and lists.';
    if (p.emoji === 'More') text += ' Emoji may be used a little more often when appropriate.';
    else if (p.emoji === 'Less') text += ' Avoid emoji unless clearly useful.';
    if (p.fastAnswers) text += ' Prefer concise answers first; expand only when the task needs detail.';
    if (p.referenceWritingStyle) text += " Match the user's general writing tone and phrasing from the current conversation without copying long passages.";

    const pet = safe(p.pet);
    const petDescription = safe(p.petDescription);
    if (p.showPetInChat !== false && pet && pet !== 'None') text += ` The user selected a companion persona called ${pet}; let it subtly influence friendliness without becoming distracting or roleplay-heavy.`;
    if (p.showPetInChat !== false && pet && pet !== 'None' && petDescription) text += ` Companion preference: ${petDescription}.`;

    const lang = safe(p.language);
    if (lang === 'Filipino') text += ' Prefer Filipino/Tagalog unless technical English is clearer.';
    else if (lang === 'English') text += ' Prefer English.';
    else if (lang && lang !== 'Auto-detect') text += ` Prefer ${lang} when practical.`;

    if (p.intelligence === 'Instant') text += ' For voice-style interactions, answer quickly and directly.';
    else if (p.intelligence === 'Deep') text += ' For voice-style interactions, favor deeper reasoning and fuller explanations.';
    else if (p.intelligence === 'Balanced') text += ' For voice-style interactions, balance speed and depth.';

    const voicePersona = safe(p.voicePersona);
    if (voicePersona) text += ` Spoken-response personality preference: ${voicePersona}.`;
    const voiceSpeed = Number(p.voiceSpeed);
    const voicePitch = Number(p.voicePitch);
    if (Number.isFinite(voiceSpeed) && voiceSpeed !== 1) text += ` The user prefers spoken responses at about ${voiceSpeed.toFixed(2)}x speed.`;
    if (Number.isFinite(voicePitch) && voicePitch !== 1) text += ` The user prefers a spoken pitch profile near ${voicePitch.toFixed(2)}x.`;
  }
  if (liveWebContext) text += liveWebContext;
  if (mode === 'school') text += ' Act as an academic assistant for students. Explain concepts clearly, teach step-by-step, and prioritize learning.';
  else if (mode === 'coder') text += ' Act as a senior software engineer. Diagnose bugs, explain tradeoffs, and provide clean production-minded code.';
  else if (mode === 'tagalog') text += ' Reply naturally in Filipino/Tagalog unless technical English terms are clearer.';
  else if (mode === 'affiliate') text += ' Act as a digital marketing writing assistant for safe, age-appropriate products and content.';
  else if (mode === 'custom' && customPrompt) text += ` ${customPrompt}`;

  if (studyTool === 'quiz') text += ' STUDY TOOL: Create a short quiz from the current topic. Ask questions first and do not reveal all answers immediately.';
  else if (studyTool === 'reviewer') text += ' STUDY TOOL: Produce a structured reviewer with headings, key ideas, definitions, examples, and a quick recap.';
  else if (studyTool === 'flashcards') text += ' STUDY TOOL: Produce concise flashcards in Q: / A: format, one card per pair.';
  else if (studyTool === 'explain') text += ' STUDY TOOL: Explain the topic simply using short steps, analogies, and one concrete example.';
  return text;
}

async function getLiveWebContext(message, webSearch, emit) {
  if (!webSearch || !message) return '';
  activity(emit,'web-search','JepongDevxyz is checking live web context','running','web');
  try {
    const isWeather = /(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i.test(message);
    if (isWeather) {
      const match = message.match(/(?:sa|in|for|at)\s+([a-zA-Z\s,.-]+)/i);
      const location = match ? match[1].trim() : 'Guimba';
      const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
        headers: {'User-Agent':'JepongDevxyz-AI/1.0'}, signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const d = await res.json();
        const c = d.current_condition?.[0] || {};
        const n = d.nearest_area?.[0] || {};
        activity(emit,'web-search',`Live weather context ready for ${n.areaName?.[0]?.value || location}`,'completed','web');
        return `\n\n[REAL-TIME WEATHER]\nLocation: ${n.areaName?.[0]?.value || location}\nTemperature: ${c.temp_C || 'N/A'}°C\nFeels like: ${c.FeelsLikeC || 'N/A'}°C\nCondition: ${c.weatherDesc?.[0]?.value || 'Unknown'}\nHumidity: ${c.humidity || 'N/A'}%\nWind: ${c.windspeedKmph || 'N/A'} km/h\nRain: ${c.precipMM || 'N/A'} mm.`;
      }
    } else {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(message)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const d = await res.json();
        if (d.AbstractText) {
          activity(emit,'web-search','Live web context found','completed','web');
          return `\n\n[LIVE WEB RESULT]\n${d.AbstractText}\nSource: ${d.AbstractURL || 'Internet'}`;
        }
      }
    }
    activity(emit,'web-search','No instant web result found — continuing normally','warning','web');
  } catch (_) {
    activity(emit,'web-search','Live web lookup timed out — continuing normally','warning','web');
  }
  return '';
}

function normalizeHistory(history = []) {
  return history.filter(x => x && (x.text || x.parts)).map(x => ({
    role: x.role === 'bot' || x.role === 'model' ? 'assistant' : 'user',
    content: x.text || (Array.isArray(x.parts) ? x.parts.map(p => p.text || '').join('\n') : '')
  })).filter(x => x.content);
}

function buildOpenAIMessages(history, message, systemInstruction) {
  const messages = [{ role:'system', content:systemInstruction }, ...normalizeHistory(history)];
  if (messages.length > 1 && messages.at(-1).role === 'user') messages.pop();
  if (message?.trim()) messages.push({ role:'user', content:message.trim() });
  return messages;
}

function smartRoute(mode, files, message) {
  const hasImage = Array.isArray(files) && files.some(f => f?.mimeType?.startsWith('image/') && f?.data);
  if (hasImage) {
    if (configured('cloudflare')) return {provider:'cloudflare',model:'@cf/google/gemma-4-26b-a4b-it',reason:'vision'};
    if (configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'vision'};
  }
  const coding = mode === 'coder' || /\b(code|coding|debug|javascript|html|css|python|node|api|bug|error|typescript|php|java|react|sql)\b/i.test(message || '');
  if (coding) {
    if (configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'coding'};
    if (configured('mistral')) return {provider:'mistral',model:'codestral-latest',reason:'coding'};
  }
  if (mode === 'school') {
    if (configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'school'};
    if (configured('cohere')) return {provider:'cohere',model:'command-a-03-2025',reason:'school'};
  }
  return null;
}

function isRetryableStatus(status) { return RETRYABLE.has(Number(status)); }

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

function openAIStreamToText(body) {
  const decoder = new TextDecoder(); const encoder = new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){ this.buffer=''; },
    transform(chunk, controller){
      this.buffer += decoder.decode(chunk,{stream:true});
      const lines = this.buffer.split('\n'); this.buffer = lines.pop() || '';
      for (const line of lines) {
        const t=line.trim(); if (!t.startsWith('data:')) continue;
        const s=t.slice(5).trim(); if (!s || s==='[DONE]') continue;
        try {
          const p=JSON.parse(s);
          const text=p.choices?.[0]?.delta?.content ?? p.choices?.[0]?.message?.content;
          if (typeof text==='string' && text) controller.enqueue(encoder.encode(text));
        } catch(_){}
      }
    }
  }));
}

function cohereStreamToText(body) {
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
          const text=p?.delta?.message?.content?.text;
          if(p?.type==='content-delta' && text) controller.enqueue(encoder.encode(text));
        }catch(_){}
      }
    }
  }));
}

function retryLabel(provider, status, hasNext) {
  if (status === 429) return `${providerLabel(provider)} rate limit reached${hasNext ? ' — rotating credential' : ''}`;
  if (status === 401 || status === 403) return `${providerLabel(provider)} credential was rejected${hasNext ? ' — trying another' : ''}`;
  if (status >= 500) return `${providerLabel(provider)} is temporarily busy${hasNext ? ' — trying another credential' : ''}`;
  return `${providerLabel(provider)} request failed${hasNext ? ' — retrying' : ''}`;
}

async function runGemini({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const keys = shuffle(getProviderKeys('gemini'));
  if (!keys.length) return {ok:false,status:500,error:'Gemini API key is not configured.'};
  const target = PROVIDERS.gemini.models.includes(model) ? model : PROVIDERS.gemini.defaultModel;

  const currentParts=[];
  if(Array.isArray(files)) for(const f of files) if(f?.data&&f?.mimeType) currentParts.push({inline_data:{mime_type:f.mimeType,data:f.data}});
  if(message?.trim()) currentParts.push({text:message.trim()});
  const contents=[];
  for(const h of history||[]) {
    const role=h.role==='bot'||h.role==='model'?'model':'user';
    const text=h.text || (Array.isArray(h.parts) ? h.parts.map(p=>p.text||'').join('\n') : '');
    if(text?.trim()) contents.push({role,parts:[{text:text.trim()}]});
  }
  if(currentParts.length && contents.at(-1)?.role==='user') contents.pop();
  if(currentParts.length) contents.push({role:'user',parts:currentParts});
  if(!contents.length) return {ok:false,status:400,error:'No prompt provided.'};

  let last=''; let status=500;
  for(let i=0;i<keys.length;i++) {
    activity(emit,`gemini-key-${i}`,`Connecting to Gemini • ${modelLabel(target)}${keys.length>1?` • credential ${i+1}/${keys.length}`:''}`,'running','provider');
    try {
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(target)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(keys[i])}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_instruction:{parts:[{text:systemInstruction}]},contents}),signal:AbortSignal.timeout(25000)
      });
      if(res.ok) {
        activity(emit,`gemini-key-${i}`,`Gemini connected • ${modelLabel(target)}`,'completed','provider');
        const decoder=new TextDecoder(), encoder=new TextEncoder();
        const stream=res.body.pipeThrough(new TransformStream({
          start(){this.buffer='';},
          transform(chunk,controller){
            this.buffer+=decoder.decode(chunk,{stream:true});
            const lines=this.buffer.split('\n');this.buffer=lines.pop()||'';
            for(const line of lines){
              const t=line.trim();if(!t.startsWith('data:'))continue;
              try{const p=JSON.parse(t.slice(5).trim());for(const part of p.candidates?.[0]?.content?.parts||[])if(part.text)controller.enqueue(encoder.encode(part.text));}catch(_){}
            }
          }
        }));
        return {ok:true,response:new Response(stream,{headers:passthroughHeaders(res,'gemini',target,fallbackFrom,routedReason,i,keys.length)})};
      }
      status=res.status; last=await res.text().catch(()=>`Gemini ${status}`);
      activity(emit,`gemini-key-${i}`,retryLabel('gemini',status,i<keys.length-1),i<keys.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status)) break;
    } catch(e) {
      status=502; last=e?.message||String(e);
      activity(emit,`gemini-key-${i}`,`Gemini connection timed out${i<keys.length-1?' — trying another credential':''}`,i<keys.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||'Gemini unavailable'};
}

async function runCloudflare({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const accounts = shuffle(getCloudflareAccounts());
  if(!accounts.length) return {ok:false,status:500,error:'Cloudflare credentials are not configured.'};
  let target=PROVIDERS.cloudflare.models.includes(model)?model:PROVIDERS.cloudflare.defaultModel;
  const hasImage=Array.isArray(files)&&files.some(f=>f?.data&&f?.mimeType?.startsWith('image/'));
  if(hasImage) target='@cf/google/gemma-4-26b-a4b-it';
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  if(hasImage){
    const last=messages.pop();
    const content=[{type:'text',text:last?.content||message||'Analyze this image.'}];
    for(const f of files)if(f?.data&&f?.mimeType?.startsWith('image/'))content.push({type:'image_url',image_url:{url:`data:${f.mimeType};base64,${f.data}`}});
    messages.push({role:'user',content});
  }

  let last=''; let status=500;
  for(let i=0;i<accounts.length;i++) {
    activity(emit,`cloudflare-key-${i}`,`Connecting to Cloudflare • ${modelLabel(target)}${accounts.length>1?` • account ${i+1}/${accounts.length}`:''}`,'running','provider');
    try {
      const a=accounts[i];
      const res=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(a.accountId)}/ai/v1/chat/completions`,{
        method:'POST',headers:{Authorization:`Bearer ${a.apiToken}`,'Content-Type':'application/json'},body:JSON.stringify({model:target,messages,stream:true,max_completion_tokens:2048,temperature:.7}),signal:AbortSignal.timeout(30000)
      });
      if(res.ok){
        activity(emit,`cloudflare-key-${i}`,`Cloudflare connected • ${modelLabel(target)}`,'completed','provider');
        return {ok:true,response:new Response(openAIStreamToText(res.body),{headers:passthroughHeaders(res,'cloudflare',target,fallbackFrom,routedReason,i,accounts.length)})};
      }
      status=res.status; last=await res.text().catch(()=>`Cloudflare ${status}`);
      activity(emit,`cloudflare-key-${i}`,retryLabel('cloudflare',status,i<accounts.length-1),i<accounts.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status)) break;
    }catch(e){
      status=502;last=e?.message||String(e);
      activity(emit,`cloudflare-key-${i}`,`Cloudflare connection timed out${i<accounts.length-1?' — trying another account':''}`,i<accounts.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||'Cloudflare unavailable'};
}

async function runOpenAICompatible(provider,{model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const cfg={
    groq:{url:'https://api.groq.com/openai/v1/chat/completions'},
    openrouter:{url:'https://openrouter.ai/api/v1/chat/completions'},
    mistral:{url:'https://api.mistral.ai/v1/chat/completions'}
  }[provider];
  if(!cfg) return {ok:false,status:400,error:'Unsupported provider.'};
  const keys=shuffle(getProviderKeys(provider));
  if(!keys.length) return {ok:false,status:500,error:`${providerLabel(provider)} API key is not configured.`};
  const target=PROVIDERS[provider].models.includes(model)?model:PROVIDERS[provider].defaultModel;
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  let last='';let status=500;

  for(let i=0;i<keys.length;i++) {
    activity(emit,`${provider}-key-${i}`,`Connecting to ${providerLabel(provider)} • ${modelLabel(target)}${keys.length>1?` • credential ${i+1}/${keys.length}`:''}`,'running','provider');
    const headers={Authorization:`Bearer ${keys[i]}`,'Content-Type':'application/json'};
    if(provider==='openrouter'){
      headers['HTTP-Referer']=process.env.SITE_URL || 'https://jepongdevxyz.ai';
      headers['X-Title']='JepongDevxyz AI';
    }
    try{
      const res=await fetch(cfg.url,{method:'POST',headers,body:JSON.stringify({model:target,messages,stream:true,max_tokens:2048,temperature:.7}),signal:AbortSignal.timeout(30000)});
      if(res.ok){
        activity(emit,`${provider}-key-${i}`,`${providerLabel(provider)} connected • ${modelLabel(target)}`,'completed','provider');
        return {ok:true,response:new Response(openAIStreamToText(res.body),{headers:passthroughHeaders(res,provider,target,fallbackFrom,routedReason,i,keys.length)})};
      }
      status=res.status; last=await res.text().catch(()=>`${provider} ${status}`);
      activity(emit,`${provider}-key-${i}`,retryLabel(provider,status,i<keys.length-1),i<keys.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status)) break;
    }catch(e){
      status=502;last=e?.message||String(e);
      activity(emit,`${provider}-key-${i}`,`${providerLabel(provider)} connection timed out${i<keys.length-1?' — rotating credential':''}`,i<keys.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||`${providerLabel(provider)} unavailable`};
}

async function runCohere({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const keys=shuffle(getProviderKeys('cohere'));
  if(!keys.length)return {ok:false,status:500,error:'Cohere API key is not configured.'};
  const target=PROVIDERS.cohere.models.includes(model)?model:PROVIDERS.cohere.defaultModel;
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  let last='';let status=500;
  for(let i=0;i<keys.length;i++) {
    activity(emit,`cohere-key-${i}`,`Connecting to Cohere • ${modelLabel(target)}${keys.length>1?` • credential ${i+1}/${keys.length}`:''}`,'running','provider');
    try{
      const res=await fetch('https://api.cohere.com/v2/chat',{method:'POST',headers:{Authorization:`Bearer ${keys[i]}`,'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify({model:target,messages,stream:true,max_tokens:2048,temperature:.7}),signal:AbortSignal.timeout(30000)});
      if(res.ok){
        activity(emit,`cohere-key-${i}`,`Cohere connected • ${modelLabel(target)}`,'completed','provider');
        return {ok:true,response:new Response(cohereStreamToText(res.body),{headers:passthroughHeaders(res,'cohere',target,fallbackFrom,routedReason,i,keys.length)})};
      }
      status=res.status;last=await res.text().catch(()=>`Cohere ${status}`);
      activity(emit,`cohere-key-${i}`,retryLabel('cohere',status,i<keys.length-1),i<keys.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status))break;
    }catch(e){
      status=502;last=e?.message||String(e);
      activity(emit,`cohere-key-${i}`,`Cohere connection timed out${i<keys.length-1?' — rotating credential':''}`,i<keys.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||'Cohere unavailable'};
}

async function runProvider(provider,args){
  if(provider==='gemini')return runGemini(args);
  if(provider==='cloudflare')return runCloudflare(args);
  if(provider==='cohere')return runCohere(args);
  if(['groq','openrouter','mistral'].includes(provider))return runOpenAICompatible(provider,args);
  return {ok:false,status:400,error:'Unknown provider'};
}

function responseMeta(response) {
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

async function processChat(body, emit) {
  let {message,history=[],files=[],provider='gemini',model,mode,customPrompt,webSearch,autoFallback=true,smartRouter=false,studyTool,personalization} = body;
  const startedAt=Date.now();
  activity(emit,'prepare','JepongDevxyz AI is preparing your request','running','process');

  if(Array.isArray(files)&&files.length){
    const images=files.filter(f=>f?.mimeType?.startsWith('image/')).length;
    activity(emit,'attachments',images?`Reviewing ${images} attached image${images>1?'s':''}`:`Reviewing ${files.length} attached file${files.length>1?'s':''}`,'completed','file');
  }

  let routedReason='';
  if(smartRouter){
    activity(emit,'router','Smart Router is choosing the best provider','running','route');
    const route=smartRoute(mode,files,message);
    if(route&&configured(route.provider)){
      provider=route.provider;model=route.model;routedReason=route.reason;
      activity(emit,'router',`Smart Router selected ${providerLabel(provider)} • ${modelLabel(model)} for ${route.reason}`,'completed','route');
    } else {
      activity(emit,'router','Smart Router kept your selected provider','completed','route');
    }
  }

  if(!PROVIDERS[provider])provider='gemini';
  model=PROVIDERS[provider].models.includes(model)?model:PROVIDERS[provider].defaultModel;
  const liveWebContext=await getLiveWebContext(message,webSearch,emit);
  const systemInstruction=buildSystemInstruction(mode,customPrompt,liveWebContext,studyTool,personalization);
  activity(emit,'prepare','Request prepared','completed','process');

  const first=await runProvider(provider,{model,history,files,message,systemInstruction,routedReason,emit});
  if(first.ok){
    activity(emit,'generation',`${providerLabel(first.response.headers.get('x-ai-provider')||provider)} is generating your answer`,'running','generate');
    return {ok:true,response:first.response,startedAt};
  }

  const fallbackable=isRetryableStatus(first.status);
  if(autoFallback&&fallbackable){
    activity(emit,'fallback',`${providerLabel(provider)} is unavailable — Auto Fallback is checking alternatives`,'warning','fallback');
    for(const p of FALLBACK_ORDER){
      if(p===provider||!configured(p))continue;
      const hasImage=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/'));
      if(hasImage&&!['gemini','cloudflare'].includes(p))continue;
      const fallbackModel=PROVIDERS[p].defaultModel;
      activity(emit,'fallback',`Switching to ${providerLabel(p)} • ${modelLabel(fallbackModel)}`,'running','fallback');
      const r=await runProvider(p,{model:fallbackModel,history,files,message,systemInstruction,fallbackFrom:provider,routedReason:routedReason||'fallback',emit});
      if(r.ok){
        activity(emit,'fallback',`Fallback connected to ${providerLabel(p)}`,'completed','fallback');
        activity(emit,'generation',`${providerLabel(p)} is generating your answer`,'running','generate');
        return {ok:true,response:r.response,startedAt};
      }
    }
    activity(emit,'fallback','No fallback provider was available','error','fallback');
  }

  return {ok:false,status:first.status||500,error:first.error||'AI provider unavailable.',provider,startedAt};
}

async function providerUsageSnapshot(){
  const providers={};
  for(const p of Object.keys(PROVIDERS)) providers[p]={configured:configured(p),status:configured(p)?'ready':'not-configured',credentials:credentialCount(p)};
  providers.cloudflare.freeDailyNeurons=10000;

  const openRouterKeys=getProviderKeys('openrouter');
  if(openRouterKeys.length){
    try{
      const r=await fetch('https://openrouter.ai/api/v1/key',{headers:{Authorization:`Bearer ${openRouterKeys[0]}`},signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const d=(await r.json()).data||{};
        providers.openrouter.usage={limit:d.limit,limit_remaining:d.limit_remaining,limit_reset:d.limit_reset,usage:d.usage,usage_daily:d.usage_daily,usage_weekly:d.usage_weekly,usage_monthly:d.usage_monthly,is_free_tier:d.is_free_tier};
      }
    }catch(_){}
  }
  return providers;
}

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function activityStreamResponse(body) {
  const encoder=new TextEncoder();
  return new Response(new ReadableStream({
    start(controller){
      const send=(event,data)=>controller.enqueue(encoder.encode(sseEvent(event,data)));
      const emit=data=>send('activity',data);
      (async()=>{
        try{
          const result=await processChat(body,emit);
          if(!result.ok){
            send('error',{message:result.error||'AI provider unavailable.',status:result.status||500,provider:result.provider||body.provider||'gemini'});
            controller.close();
            return;
          }

          const meta=responseMeta(result.response);
          send('meta',meta);
          const reader=result.response.body.getReader();
          const decoder=new TextDecoder();
          while(true){
            const {done,value}=await reader.read();
            if(done)break;
            const text=decoder.decode(value,{stream:true});
            if(text)send('text',{text});
          }
          const tail=decoder.decode(); if(tail)send('text',{text:tail});
          const elapsedMs=Math.max(1,Date.now()-result.startedAt);
          send('activity',{type:'activity',id:'generation',label:`Response complete in ${(elapsedMs/1000).toFixed(elapsedMs>=1000?1:2)}s`,state:'completed',kind:'generate',at:Date.now()});
          send('done',{elapsedMs,...meta});
          controller.close();
        }catch(e){
          send('error',{message:e?.message||String(e),status:500});
          controller.close();
        }
      })();
    }
  }),{
    headers:{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive'
    }
  });
}

export default async function handler(req){
  if(req.method==='HEAD')return new Response(null,{status:200});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json();
    if(body.action==='provider-status') return json({providers:await providerUsageSnapshot(),cloudflare:{freeDailyNeurons:10000,reset:'00:00 UTC'}});
    if(body.activityStream===true) return activityStreamResponse(body);

    const result=await processChat(body,null);
    if(result.ok)return result.response;
    return json({error:result.error||'AI provider unavailable',provider:result.provider,status:result.status,rateLimited:result.status===429},result.status||500,{'X-AI-Provider':result.provider||body.provider||'gemini'});
  }catch(e){return json({error:e?.message||String(e)},500);}
}
