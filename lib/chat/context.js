/* lib/chat/context.js — split from api/chat.js (mechanical move, no behavior change). */
import { runConfiguredWebSearch } from '../../api/web-search.js';
import { configured } from './keys.js';
import { looksReferential, normalizeIntentText } from './prompts.js';
import { buildLiveSearchQuery, buildLiveSourceContext, enrichSearchResults, isSafePublicUrl, isSimpleCasualMessage, noKeyWebSearch, relevantWebResults, safeJsonResponse, shouldAutoResearch } from './search.js';
import { isVagueFreshnessFollowUp } from './task.js';
import { activity } from './utils.js';

function shouldRunLiveWebSearch(message='',enabled=false,force=false){
  return enabled===true && (force===true || !isSimpleCasualMessage(message));
}

function extractWeatherLocation(message=''){
  const text=String(message||'').normalize('NFKC').replace(/\s+/g,' ').trim();
  if(!text)return '';
  const locationPattern='([\\p{L}\\p{M}0-9][\\p{L}\\p{M}0-9 .,’\'-]{0,98}?)';
  const endings='(?:\\s+(?:right now|now|today|tonight|tomorrow|ngayon|mamaya|bukas|forecast|weather|panahon|ulan|init|bagyo|temperatura)\\b.*|[?.!,;:]*$)';
  const candidates=[];
  const afterWeather=new RegExp('(?:weather|panahon|forecast|temperatura|ulan|init|bagyo)(?:\\s+(?:like|today|tonight|now|ngayon|today|right now))*\\s+(?:in|at|for|near|around|sa|ng|nang|para sa)\\s+'+locationPattern+endings,'iu').exec(text);
  if(afterWeather)candidates.push(afterWeather[1]);
  const beforeWeather=new RegExp('(?:^|\\s)(?:in|at|for|near|around|sa|ng|nang|para sa)\\s+'+locationPattern+'\\s+(?:weather|panahon|forecast|temperatura|ulan|init|bagyo)\\b','iu').exec(text);
  if(beforeWeather)candidates.push(beforeWeather[1]);
  const locationFirst=new RegExp('^(.+?)\\s+(?:weather|panahon|forecast)\\b','iu').exec(text);
  if(locationFirst)candidates.push(locationFirst[1]);
  const ignored=/^(?:(?:what(?: is|'s)?(?: the)?|how(?:'s| is)?(?: the)?|anong|ano ang|kumusta ang|the|weather|panahon|forecast|ngayon|today|tonight|now|dito|diyan|there|here)\s*)+$/iu;
  for(const raw of candidates){
    const location=String(raw||'').replace(/[?.!,;:]+$/g,'').replace(/\s+/g,' ').trim()
      .replace(/\s+(?:right now|now|today|tonight|tomorrow|ngayon|mamaya|bukas)$/iu,'').trim();
    if(!location||ignored.test(location))continue;
    return location.slice(0,100);
  }
  return '';
}

async function getEnhancedLiveWebContext(message, webSearch, emit, options={}){
  if(!message)return '';

  const fast=Boolean(options.fast);
  const forceWebSearch=options.forceWebSearch===true;
  const contextMessage=String(options.contextMessage||'').trim();
  const vagueFreshFollowUp=isVagueFreshnessFollowUp(message);
  const wantsLive=shouldRunLiveWebSearch(message,webSearch,forceWebSearch);
  if(!wantsLive)return '';

  const useContextQuery=contextMessage && (looksReferential(message)||vagueFreshFollowUp||String(message).trim().split(/\s+/).length<=6);
  const searchQuery=buildLiveSearchQuery(useContextQuery?contextMessage:message);
  if(!searchQuery || (isVagueFreshnessFollowUp(searchQuery)&&!forceWebSearch))return '';

  const sourcePages=fast?1:3;
  let configuredSearchApiAttempted=false;
  const searchOutcome=await runConfiguredWebSearch(searchQuery,{
    env:process.env,fetchImpl:fetch,timeoutMs:fast?5000:8000,
    fast,maxResults:fast?3:5,isSafePublicUrl,relevantWebResults,
    onProviderAttempt:({state,httpStatus,resultCount})=>{
      if(state!=='unconfigured')configuredSearchApiAttempted=true;
      const label=state==='completed'
        ?`Found ${resultCount} relevant result${resultCount===1?'':'s'}`
        :state==='warning'
          ?`Web Search API ${httpStatus?'unavailable':resultCount===0?'returned no relevant results':'search failed'}${httpStatus?` • HTTP ${httpStatus}`:''} • trying another source`
          :'Searching the web';
      activity(emit,'web-search',state==='unconfigured'
        ?'No configured Web Search API found • checking public sources'
        :label,state==='unconfigured'?'running':state,'web');
    }
  });
  if(searchOutcome.results.length){
    return buildLiveSourceContext(await enrichSearchResults(searchOutcome.results,emit,sourcePages));
  }

  const attemptedSummary=configuredSearchApiAttempted
    ?'configured Web Search APIs were tried'
    :'no configured Web Search API is available';

  // Weather has a dedicated live-data fallback, but only after configured
  // Web Search APIs are tried and their actual provider status is emitted.
  const isWeather=/(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i.test(message);
  if(isWeather){
    const location=extractWeatherLocation(message);
    if(location){
    activity(emit,'web-search',`Configured Web Search APIs had no usable weather results • checking wttr.in for ${location}`,'running','web');
      try{
      const res=await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`,{
        headers:{'User-Agent':'JepongDevxyz-AI/1.0'},signal:AbortSignal.timeout(fast?4500:7000)
      });
      if(res.ok){
        const d=await safeJsonResponse(res);
        if(!d)throw new Error('Weather source returned invalid JSON');
        const c=d.current_condition?.[0]||{};
        const n=d.nearest_area?.[0]||{};
        activity(emit,'web-search',`Live weather ready for ${n.areaName?.[0]?.value||location} • wttr.in (${attemptedSummary})`,'completed','web');
        return `\n\n[REAL-TIME WEATHER — fetched ${new Date().toISOString()}]\nLocation: ${n.areaName?.[0]?.value||location}\nTemperature: ${c.temp_C||'N/A'}°C\nFeels like: ${c.FeelsLikeC||'N/A'}°C\nCondition: ${c.weatherDesc?.[0]?.value||'Unknown'}\nHumidity: ${c.humidity||'N/A'}%\nWind: ${c.windspeedKmph||'N/A'} km/h\nRain: ${c.precipMM||'N/A'} mm.\nState clearly that this is live fetched data.`;
      }
      }catch(_){}
    }
  }

  const fallbackReason=configuredSearchApiAttempted
    ?'configured Web Search APIs returned no usable results'
    :'no Web Search API is configured';
  const results=await noKeyWebSearch(searchQuery,emit,{fallbackReason});
  return buildLiveSourceContext(await enrichSearchResults(results,emit,sourcePages));
}

function normalizeHistory(history = []) {
  return (Array.isArray(history)?history:[])
    .filter(x => x && (x.text || x.parts))
    .map(x => {
      const role=x.role === 'bot' || x.role === 'model' || x.role === 'assistant' ? 'assistant' : 'user';
      let content=x.text || (Array.isArray(x.parts) ? x.parts.map(p => p?.text || '').join('\n') : '');
      content=String(content||'').trim();
      return {role,content};
    })
    .filter(x => x.content)
    .slice(-40);
}

function buildOpenAIMessages(history, message, systemInstruction) {
  const messages = [{ role:'system', content:systemInstruction }, ...normalizeHistory(history)];
  if (messages.length > 1 && messages.at(-1).role === 'user') messages.pop();
  if (message?.trim()) messages.push({ role:'user', content:message.trim() });
  return messages;
}

function buildOpenAIVisionMessages(history, message, systemInstruction, files=[]){
  const messages=[{role:'system',content:systemInstruction},...normalizeHistory(history)];
  if(messages.length>1 && messages.at(-1).role==='user')messages.pop();
  const content=[];
  if(message?.trim())content.push({type:'text',text:message.trim()});
  for(const f of (Array.isArray(files)?files:[]).slice(0,10)){
    if(!f?.data||!String(f?.mimeType||'').toLowerCase().startsWith('image/'))continue;
    content.push({type:'image_url',image_url:{url:`data:${f.mimeType};base64,${f.data}`}});
  }
  if(content.length)messages.push({role:'user',content});
  return messages;
}

function smartRoute(mode, files, message) {
  const intentText=normalizeIntentText(message);
  const hasImage = Array.isArray(files) && files.some(f => f?.mimeType?.startsWith('image/') && f?.data);
  if (hasImage) {
    if (configured('cloudflare')) return {provider:'cloudflare',model:'@cf/google/gemma-4-26b-a4b-it',reason:'vision'};
    if (configured('gemini')) return {provider:'gemini',model:'gemini-3.5-flash-lite',reason:'vision'};
  }
  const coding = mode === 'coder' || /\b(code|coding|debug|javascript|javscript|html|hmtl|css|python|pyton|node|api|bug|error|typescript|php|java|react|sql|github|vercel|deploy|backend|frontend)\b/i.test(intentText);
  if (coding) {
    if (configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'coding'};
    if (configured('mistral')) return {provider:'mistral',model:'codestral-latest',reason:'coding'};
  }
  if (mode === 'school') {
    if (configured('gemini')) return {provider:'gemini',model:'gemini-3.5-flash-lite',reason:'school'};
    if (configured('cohere')) return {provider:'cohere',model:'command-a-03-2025',reason:'school'};
  }

  const research=shouldAutoResearch(message) || /\b(research|verify online|check online|source search|web research)\b/i.test(intentText);
  if(research){
    if(configured('gemini')) return {provider:'gemini',model:'gemini-3.5-flash-lite',reason:'research synthesis'};
    if(configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'research synthesis'};
  }

  const reasoning=/\b(reason|reasoning|logic|strategy|plan|complex|architecture|decision|tradeoff)\b/i.test(intentText);
  if(reasoning){
    if(configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'complex reasoning'};
    if(configured('gemini')) return {provider:'gemini',model:'gemini-3.5-flash-lite',reason:'complex reasoning'};
  }

  return null;
}

export { shouldRunLiveWebSearch, extractWeatherLocation, getEnhancedLiveWebContext, normalizeHistory, buildOpenAIMessages, buildOpenAIVisionMessages, smartRoute };
