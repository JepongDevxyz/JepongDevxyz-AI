/* lib/chat/tts.js — split from api/chat.js (mechanical move, no behavior change). */
import { configured, getCloudflareAccounts } from './keys.js';
import { isRetryableStatus } from './stream.js';
import { json, shuffle } from './utils.js';

const CLOUDFLARE_TTS_MODEL = '@cf/myshell-ai/melotts';
const MELOTTS_LANGUAGE_ALIASES = {
  en:['en'],
  es:['es'],
  fr:['fr'],
  zh:['zh'],
  ja:['jp','ja'],
  ko:['kr','ko']
};

function normalizeTTSLanguage(input='en-US'){
  const raw=String(input||'en-US').toLowerCase().replace('_','-');
  const base=raw.split('-')[0];
  if(base==='jp') return 'ja';
  if(base==='kr') return 'ko';
  return base;
}

function decodeBase64Audio(base64){
  try{
    const clean=String(base64||'').replace(/^data:audio\/[^;]+;base64,/i,'').trim();
    if(!clean) return null;
    const bin=atob(clean);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  }catch(_){return null;}
}

function extractAudioBytesFromCloudflareJson(payload){
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

const OPENAI_TTS_VOICES={Jepong:'onyx',Janna:'nova',Calixie:'shimmer',Sevich:'echo',Princess:'coral',Herald:'ash',Sol:'cedar',Fable:'sage',Luna:'marin',Lancelot:'onyx',Sydney:'alloy',Odette:'verse'};

/* ElevenLabs is the primary cloud TTS provider. Voice IDs are discovered from
   the account at runtime; no secret or account-specific voice ID is shipped to
   the browser. This also lets a user replace/add voices without a code deploy. */
const ELEVEN_PERSONA_GENDERS={
  Jepong:'male',Janna:'female',Calixie:'female',Sevich:'male',Princess:'female',
  Herald:'male',Sol:'male',Fable:'female',Luna:'female',Lancelot:'male',
  Sydney:'female',Odette:'female'
};
const ELEVEN_PERSONA_STYLE={
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
const elevenVoiceCache=new Map();

function elevenLanguageCode(language='en-US'){
  const base=normalizeTTSLanguage(language);
  return base==='tl'?'fil':base;
}
function elevenVoiceGender(voice){
  const labels=voice?.labels||{};
  return String(labels.gender||labels.sex||'').toLowerCase();
}
function elevenVoiceSearchText(voice){
  return [voice?.name,voice?.description,...Object.values(voice?.labels||{})].filter(Boolean).join(' ').toLowerCase();
}
function elevenVoiceLocaleScore(voice,language='en-US'){
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
function getElevenLabsKeys(){
  const raw=[
    process.env.ELEVENLABS_API_KEYS,
    process.env.ELEVENLABS_API_KEY,
    ...Object.keys(process.env).filter(k=>/^ELEVENLABS_API_KEY_\d+$/.test(k)).sort((a,b)=>Number(a.match(/\d+/)?.[0]||0)-Number(b.match(/\d+/)?.[0]||0)).map(k=>process.env[k])
  ].filter(Boolean).join(',');
  return [...new Set(raw.split(/[\n,;]+/).map(x=>String(x||'').trim()).filter(Boolean))];
}
function rotatedElevenLabsKeys(){
  const keys=getElevenLabsKeys();
  if(keys.length<2)return keys;
  const start=Math.floor(Date.now()/60000)%keys.length;
  return keys.slice(start).concat(keys.slice(0,start));
}
async function getElevenVoices(key){
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
function selectElevenVoice(voices,persona,language){
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
async function elevenLabsTTS(body={}){
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

function ttsLanguageInstruction(language='en-US',voiceName='Jepong'){
  const tag=String(language||'en-US').replace('_','-');
  const base=tag.toLowerCase().split('-')[0];
  const labels={fil:'Filipino (Philippines)',tl:'Tagalog (Philippines)',en:'English',es:'Spanish',fr:'French',de:'German',it:'Italian',pt:'Portuguese',ja:'Japanese',ko:'Korean',zh:'Mandarin Chinese',ar:'Arabic',hi:'Hindi',id:'Indonesian',ms:'Malay',vi:'Vietnamese',th:'Thai',ru:'Russian',uk:'Ukrainian',tr:'Turkish',nl:'Dutch',pl:'Polish',bn:'Bengali'};
  const label=labels[base]||tag;
  const personaGender=ELEVEN_PERSONA_GENDERS[voiceName];
  const gender=personaGender==='male'?'masculine':personaGender==='female'?'feminine':'natural';
  return `Speak only in ${label}, using a native, natural ${label} accent. Do not introduce an accent from another language or country. Preserve the input language and wording. Use a ${gender} voice character. Clear conversational delivery, not robotic.`;
}
async function openAITTS(body={}){
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
async function serverTTS(body={}){
  const eleven=await elevenLabsTTS(body); if(eleven)return eleven;
  const openai=await openAITTS(body); if(openai)return openai;
  return cloudflareTTS(body);
}

async function cloudflareTTS(body={}){
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

export { CLOUDFLARE_TTS_MODEL, MELOTTS_LANGUAGE_ALIASES, normalizeTTSLanguage, decodeBase64Audio, extractAudioBytesFromCloudflareJson, OPENAI_TTS_VOICES, ELEVEN_PERSONA_GENDERS, ELEVEN_PERSONA_STYLE, elevenVoiceCache, elevenLanguageCode, elevenVoiceGender, elevenVoiceSearchText, elevenVoiceLocaleScore, getElevenLabsKeys, rotatedElevenLabsKeys, getElevenVoices, selectElevenVoice, elevenLabsTTS, ttsLanguageInstruction, openAITTS, serverTTS, cloudflareTTS };
