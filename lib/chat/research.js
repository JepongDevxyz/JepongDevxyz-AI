// JEPONGDEVXYZ AI — Research tools
// Extracted from api/chat.js (lines 1931-2776)

import { configured, providerLabel, modelLabel, activity, wantsCompleteCode, detectArtifactRequest } from './guard.js';
import { normalizeIntentText } from './helpfulness.js';
import { readInternalProviderText } from './orchestrator.js';
import { splitContextualTaskMessage, isVagueFreshnessFollowUp, linkLabel } from './activity.js';
import { runGemini, runCloudflare, runOpenAICompatible } from './runners.js';
/* =========================================================
   SMART REAL-TIME RESEARCH + SAFE VERIFICATION TOOLS
   High-level, auditable tools only. No hidden reasoning.
   ========================================================= */

export function shouldAutoResearchCore(message=''){
  const t=normalizeIntentText(message);
  if(!t)return false;

  // "Yung latest ngayon ang gawin mo" is a continuation instruction, not a
  // request to search the internet. It must inherit the preceding task.
  if(isVagueFreshnessFollowUp(message))return false;

  // Explicit research/search requests always count.
  if(/\b(search|research|verify online|check online|find online|look up|hanapin|maghanap|tingnan online|suriin online)\b/i.test(t))return true;

  // Topics whose answer is inherently live/current.
  if(/\b(news|breaking|weather|panahon|forecast|outage|price|presyo|exchange rate|stock price|crypto price|schedule today|availability today|live score|score today|election result|polling)\b/i.test(t))return true;
  if(/\b(what time is it|current time|time now|anong oras|anong time|oras ngayon|time zone|timezone)\b/i.test(t))return true;

  const currentYear=new Date().getUTCFullYear();
  const years=[...t.matchAll(/\b((?:19|20)\d{2})\b/g)].map(m=>Number(m[1]));
  if(years.some(year=>year>=currentYear-1))return true;

  const freshness=/\b(latest|current|currently|today|tonight|this week|this month|this year|now|ngayon|kasalukuyan|newest|most recent|release date|released today)\b/i.test(t);
  if(!freshness)return false;

  // Freshness words alone are not a search command. Require a real subject
  // after removing conversational filler, so "yung latest ngayon ang gawin mo"
  // continues the existing task instead of querying Wikipedia.
  const subject=t
    .replace(/\b(latest|current|currently|today|tonight|this week|this month|this year|now|ngayon|kasalukuyan|newest|most recent|release date|released today)\b/gi,' ')
    .replace(/\b(iyong|yung|ito|iyan|iyon|ganito|ganyan|ang|na|naman|sana|please|paki|mo|ko|natin|gawin|gawing|use|do|make|it|that|this|the|one|what|is|are|version)\b/gi,' ')
    .replace(/[^a-z0-9]+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
  return subject.split(/\s+/).some(word=>word.length>=3);
}

export function shouldAutoResearch(message=''){
  const parts=splitContextualTaskMessage(message);
  if(parts.followUp && isVagueFreshnessFollowUp(parts.followUp)){
    // A vague follow-up inherits research only when the anchored task was
    // already an explicit live-research task.
    return shouldAutoResearchCore(parts.anchor) &&
      /\b(search|research|news|weather|panahon|forecast|price|presyo|outage|live score|verify online|check online|hanapin|maghanap|tingnan online)\b/i.test(normalizeIntentText(parts.anchor));
  }
  return shouldAutoResearchCore(parts.raw);
}

export function isWebsiteSecurityRequest(message=''){
  return /\b(website|web\s*site|site|webpage|web\s*app|webapp|domain)\b/i.test(message)
    && /\b(safe|safety|secure|security|ligtas|seguridad|vulnerab|prote[ck]|hack|harden|headers|ssl|https|audit)\b/i.test(message);
}

export function buildLiveSearchQuery(message=''){
  const incoming=String(message||'').trim();
  const parts=splitContextualTaskMessage(incoming);
  const raw=parts.followUp&&isVagueFreshnessFollowUp(parts.followUp)
    ? String(parts.anchor||incoming).trim()
    : incoming;
  const t=normalizeIntentText(raw);
  // A conversational request is not a search query. Search for relevant
  // security guidance, not the user's full Filipino sentence or filler words.
  if(isWebsiteSecurityRequest(raw)){
    return 'OWASP website security checklist HTTPS HSTS Content Security Policy security headers';
  }
  const clean=raw.replace(/https?:\/\/[^\s]+/gi,' ')
    .replace(/\b(?:paki|please|nga|naman|sana|tignan|tingnan|mo|ako|yung|itong|kung|ano|rin|pwede|bang|natin|give|me|can|you|could|would|tell|find|look|up|search|about)\b/gi,' ')
    .replace(/\s+/g,' ').trim().slice(0,170);
  const q=clean||raw.slice(0,170);
  const currentYear=new Date().getUTCFullYear();
  const needsFreshness=/\b(latest|current|today|this week|this month|this year|news|price|presyo|outage|release|released|schedule|ngayon)\b/i.test(t);
  return needsFreshness&&!/\b(?:19|20)\d{2}\b/.test(q)?`${q} ${currentYear}`:q;
}

// Search providers can return unrelated results even for a correctly scoped
// query. Never show those pages as if they were sources for the user's task.
export function relevantWebResults(results=[], query=''){
  const security=isWebsiteSecurityRequest(query)
    || /\bOWASP\b/i.test(query)&&/\bsecurity\b/i.test(query);
  const terms=[...new Set(String(query).toLowerCase()
    .replace(/https?:\/\/\S+/g,' ')
    .match(/[a-z]{4,}/g)||[])].filter(w=>
      !['https','http','www','with','from','about','that','this','your','please','check','look','find','search','latest','current','results','status','today','site'].includes(w)
    );
  return (Array.isArray(results)?results:[]).filter(r=>{
    const title=String(r?.title||'').toLowerCase();
    const url=String(r?.url||'').toLowerCase();
    const snippet=String(r?.snippet||'').toLowerCase();
    const hay=`${title} ${url} ${snippet}`;
    if(security){
      // An HTTPS link or generic mention of "security" does not establish that
      // a page covers website security. Require a specific topic match in text.
      const content=`${title} ${snippet}`;
      return /\b(owasp|web\s*security|website\s*security|web\s*application\s*security|application\s*security|security\s*headers|content\s*security\s*policy|hsts|tls|csp|http\s*headers|mozilla\s*observatory|https\s*(?:configuration|setup|security)|ssl\s*(?:configuration|security))\b/i.test(content)
        || (/\b(owasp\.org|developer\.mozilla\.org|web\.dev)\b/i.test(url)
            && /\b(security|http|https|headers|csp|hsts|tls|ssl)\b/i.test(content));
    }
    if(!terms.length)return false;
    const matches=terms.filter(t=>hay.includes(t)).length;
    return matches>=Math.min(2,terms.length);
  }).slice(0,5);
}

export function shouldVerifyTask(message='', files=[]){
  const t=normalizeIntentText(message);
  if(Array.isArray(files) && files.length && /\b(test|verify|check|inspect|validate|debug|run|working|gumagana|subukan|i-test|itest|suriin|ayusin|error|bug|build|compile|deploy|create|make|gawan|gumawa|implement|develop)\b/i.test(t)) return true;
  return /\b(test|verify|check|inspect|validate|debug|run|working|gumagana|subukan|i-test|itest|suriin|build|compile|deploy|endpoint|website|url|api|create|make|gawan|gumawa|implement|develop|html|javascript|typescript|python|java|kotlin|game)\b/i.test(t);
}

export function auditGeneratedResponse(message='',generatedText='',files=[]){
  const text=String(generatedText||'').trim();
  const checks=[];
  checks.push({name:'non-empty response',ok:text.length>0});
  checks.push({name:'internal markers hidden',ok:!/(?:\[INTERNAL_|\[UPLOADED PROJECT INSPECTION\]|JD_WORK_NOTE|PUBLIC_UPDATE:|INTERNAL_BRIEF:)/i.test(text)});

  const codeBlocks=extractCodeBlocks(text);
  const t=normalizeIntentText(message);
  const asksCode=/\b(code|html|css|javascript|typescript|python|java|kotlin|android|app|website|game|api|backend|frontend|build|create|make|gawan|gumawa|implement|develop|program)\b/i.test(t);
  if(asksCode){
    checks.push({name:'requested implementation present',ok:codeBlocks.length>0 || /\b(?:FILE|Filename)\s*:/i.test(text)});
  }

  if(wantsCompleteCode(message)){
    const omitted=/\b(rest omitted|same as before|unchanged code here|remaining code|code omitted|etc\.?\s*$)/im.test(text);
    checks.push({name:'no placeholder omission',ok:!omitted});
  }

  const artifact=detectArtifactRequest(message,files);
  if(artifact?.kind==='zip' && Array.isArray(files) && files.some(f=>/\.zip$/i.test(String(f?.parentName||f?.name||f?.filename||'')))){
    checks.push({name:'updated project file blocks',ok:/\bFILE\s*:\s*[^\n]+/i.test(text)});
  }

  const failed=checks.filter(x=>!x.ok);
  return {checks,failed,ok:failed.length===0,codeBlocks};
}

export function htmlDecode(s=''){
  return String(s)
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#x2F;/gi,'/').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)||32));
}

export function stripHtml(s=''){
  return htmlDecode(String(s)
    .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
  ).trim();
}

export function extractPublicUrl(text=''){
  const matches=String(text||'').match(/https?:\/\/[^\s<>"'`)\]]+/gi)||[];
  return matches.map(x=>x.replace(/[.,!?;:]+$/,''));
}

export function isPrivateIpv4(host=''){
  const m=host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if(!m)return false;
  const [a,b,c,d]=m.slice(1).map(Number);
  if([a,b,c,d].some(n=>n<0||n>255))return true;
  return a===10 || a===127 || a===0 || (a===169&&b===254) ||
    (a===172&&b>=16&&b<=31) || (a===192&&b===168) ||
    (a===100&&b>=64&&b<=127) || a>=224;
}

export function isSafePublicUrl(raw=''){
  try{
    const u=new URL(raw);
    if(!['http:','https:'].includes(u.protocol))return false;
    const h=u.hostname.toLowerCase().replace(/^\[|\]$/g,'').replace(/\.$/,'');
    if(!h || h==='localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal'))return false;
    if(h.includes(':')){
      if(h==='::1' || h==='::' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:') || /^fe[89ab][0-9a-f]*:/i.test(h) || h.startsWith('ff'))return false;
      if(h.startsWith('::ffff:'))return false;
    }
    if(isPrivateIpv4(h))return false;
    return true;
  }catch(_){return false;}
}

export async function safePublicFetch(url, options={}, maxRedirects=3){
  let current=url;
  for(let i=0;i<=maxRedirects;i++){
    if(!isSafePublicUrl(current))throw new Error('Blocked non-public URL');
    const res=await fetch(current,{...options,redirect:'manual'});
    if(res.status>=300&&res.status<400){
      const loc=res.headers.get('location');
      if(!loc)return res;
      current=new URL(loc,current).toString();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

export function decodeDuckDuckGoHref(href=''){
  try{
    const decoded=htmlDecode(href);
    const u=new URL(decoded,'https://duckduckgo.com');
    const uddg=u.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : u.toString();
  }catch(_){return htmlDecode(href);}
}

export function publicSearchFallbackResultLabel({provider='public sources',resultCount=0,reason=''}={}){
  const count=Math.max(0,Number(resultCount)||0);
  const results=count===1?'1 relevant web result':`${count} relevant web results`;
  const base=count?`Found ${results} • ${provider}`:`No relevant web results found • ${provider}`;
  return reason?`${base} • public fallback (${reason})`:`${base} • public source`;
}

export async function duckDuckGoHtmlSearch(query, emit){
  activity(emit,'web-search','Searching the live web','running','web',query.slice(0,120));
  try{
    const res=await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,{
      headers:{
        'User-Agent':'Mozilla/5.0 (compatible; JepongDevxyzAI/1.0; +https://vercel.app)',
        'Accept':'text/html,application/xhtml+xml'
      },
      signal:AbortSignal.timeout(8000)
    });
    if(!res.ok)throw new Error(`Search HTTP ${res.status}`);
    const html=await res.text();
    const results=[];
    const rx=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1800}?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>)/gi;
    let m;
    while((m=rx.exec(html)) && results.length<5){
      const url=decodeDuckDuckGoHref(m[1]);
      if(!isSafePublicUrl(url))continue;
      const title=stripHtml(m[2]).slice(0,180);
      const snippet=stripHtml(m[3]).slice(0,500);
      if(title)results.push({title,url,snippet});
    }

    // Fallback parser when DDG changes snippet markup.
    if(!results.length){
      const arx=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while((m=arx.exec(html)) && results.length<5){
        const url=decodeDuckDuckGoHref(m[1]);
        if(!isSafePublicUrl(url))continue;
        const title=stripHtml(m[2]).slice(0,180);
        if(title)results.push({title,url,snippet:''});
      }
    }

    activity(emit,'web-search',results.length?`Searched ${results.length} live web results`:'No live web results found',results.length?'completed':'warning','web');
    return results;
  }catch(e){
    activity(emit,'web-search','Live web search was unavailable — continuing with available context','warning','web',String(e?.message||e).slice(0,140));
    return [];
  }
}



export function decodeXmlText(value=''){
  return htmlDecode(String(value||'')
    .replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')).trim();
}

export async function safeJsonResponse(res){
  const text=await res.text().catch(()=> '');
  if(!text.trim())return null;
  try{return JSON.parse(text);}catch(_){return null;}
}

export async function bingRssSearch(query){
  try{
    const url=`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
    const res=await fetch(url,{
      headers:{'User-Agent':'Mozilla/5.0 (compatible; JepongDevxyzAI/1.0)','Accept':'application/rss+xml,application/xml,text/xml,*/*'},
      signal:AbortSignal.timeout(8500)
    });
    if(!res.ok)return [];
    const xml=await res.text();
    if(!xml.trim())return [];
    const results=[];
    const rx=/<item\b[^>]*>([\s\S]*?)<\/item>/gi;
    let m;
    while((m=rx.exec(xml))&&results.length<5){
      const item=m[1];
      const title=decodeXmlText((item.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').slice(0,180);
      const url=decodeXmlText((item.match(/<link[^>]*>([\s\S]*?)<\/link>/i)||[])[1]||'');
      const snippet=decodeXmlText((item.match(/<description[^>]*>([\s\S]*?)<\/description>/i)||[])[1]||'').slice(0,500);
      if(title&&isSafePublicUrl(url))results.push({title,url,snippet,source:'Bing RSS'});
    }
    return results;
  }catch(_){return [];}
}

export async function wikipediaSearch(query){
  try{
    const url=`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=5&format=json&utf8=1&origin=*`;
    const res=await fetch(url,{
      headers:{'User-Agent':'JepongDevxyzAI/1.0','Accept':'application/json'},
      signal:AbortSignal.timeout(7000)
    });
    if(!res.ok)return [];
    const d=await safeJsonResponse(res);
    const rows=d?.query?.search||[];
    return rows.slice(0,5).map(x=>({
      title:String(x.title||'').slice(0,180),
      url:`https://en.wikipedia.org/wiki/${encodeURIComponent(String(x.title||'').replace(/ /g,'_'))}`,
      snippet:stripHtml(String(x.snippet||'')).slice(0,500),
      source:'Wikipedia'
    })).filter(x=>x.title&&isSafePublicUrl(x.url));
  }catch(_){return [];}
}

export function isSimpleCasualMessage(message=''){
  const t=String(message||'').trim();
  return /^(hi|hello|hey|kumusta|kamusta|salamat|thanks|thank you|good morning|good afternoon|good evening|yo|sup)[!.? ]*$/i.test(t);
}

export async function noKeyWebSearch(query, emit,{fallbackReason=''}={}){
  const searchTopic=String(query||'').replace(/\s+/g,' ').trim().slice(0,100);
  const securityTopic=/\b(OWASP|website security|web security|security headers|Content Security Policy|HSTS|TLS|SSL)\b/i.test(searchTopic);
  const activityLabel=securityTopic
    ? 'Searching trusted website security guidance'
    : (searchTopic?`Searching for relevant sources: ${searchTopic}`:'Searching the web');
  activity(emit,'web-search',fallbackReason
    ?`Checking public search sources • ${fallbackReason}`
    :activityLabel,'running','web');
  const attempts=[
    ['Bing',()=>bingRssSearch(query)],
    ['DuckDuckGo',()=>duckDuckGoInstantSearch(query,null)],
    ['Wikipedia',()=>wikipediaSearch(query)]
  ];
  for(const [label,fn] of attempts){
    const results=await fn();
    const relevant=relevantWebResults(results,query);
    if(relevant.length){
      activity(emit,'web-search',publicSearchFallbackResultLabel({
        provider:label,resultCount:relevant.length,reason:fallbackReason
      }), 'completed','web');
      return relevant;
    }
  }
  // Legacy DDG HTML is last because Vercel may receive HTTP 403 from it.
  try{
    const results=await duckDuckGoHtmlSearch(query,null);
    const relevant=relevantWebResults(results,query);
    if(relevant.length){
      activity(emit,'web-search',`Found ${relevant.length} relevant web result${relevant.length===1?'':'s'} • DuckDuckGo`,'completed','web');
      return relevant;
    }
  }catch(_){}
  activity(emit,'web-search',publicSearchFallbackResultLabel({
    provider:'public sources',resultCount:0,reason:fallbackReason||'all search sources failed'
  }),'warning','web','No search source returned usable results.');
  return [];
}

export async function duckDuckGoInstantSearch(query='', emit){
  activity(emit,'web-search-alt','Checking alternate live search source','running','web');
  try{
    const res=await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,{
      headers:{'Accept':'application/json','User-Agent':'JepongDevxyzAI/1.0'},
      signal:AbortSignal.timeout(5500)
    });
    if(!res.ok)throw new Error(`Search HTTP ${res.status}`);
    const d=await safeJsonResponse(res);
    if(!d)throw new Error('Search returned an empty or non-JSON response');
    const results=[];
    const push=(title,url,snippet='')=>{
      if(results.length>=5||!title||!isSafePublicUrl(url))return;
      if(results.some(x=>x.url===url))return;
      results.push({title:String(title).slice(0,180),url:String(url),snippet:String(snippet||'').slice(0,500)});
    };
    push(d.Heading||d.AbstractText,d.AbstractURL,d.AbstractText);
    const walk=items=>{
      for(const item of Array.isArray(items)?items:[]){
        if(results.length>=5)break;
        if(Array.isArray(item?.Topics)) walk(item.Topics);
        else if(item?.FirstURL) push(item.Text||item.Result||'DuckDuckGo result',item.FirstURL,item.Text||'');
      }
    };
    walk(d.RelatedTopics);
    activity(emit,'web-search-alt',results.length?`Alternate search found ${results.length} result${results.length===1?'':'s'}`:'Alternate live search returned no usable results',results.length?'completed':'warning','web');
    return results;
  }catch(e){
    activity(emit,'web-search-alt','Alternate live search was unavailable','warning','web',String(e?.message||e).slice(0,120));
    return [];
  }
}

export async function enrichSearchResults(results=[], emit, maxSources=3){
  const enriched=[];
  for(let i=0;i<Math.min(results.length,Math.max(0,maxSources));i++){
    const r=results[i];
    activity(emit,`web-source-${i}`,`Reading source ${i+1}: ${r.title.slice(0,62)}`,'running','web');
    try{
      const res=await safePublicFetch(r.url,{
        method:'GET',
        headers:{'User-Agent':'Mozilla/5.0 (compatible; JepongDevxyzAI/1.0)','Accept':'text/html,text/plain,application/json'},
        signal:AbortSignal.timeout(7000)
      },2);
      const type=(res.headers.get('content-type')||'').toLowerCase();
      let extract='';
      if(res.ok && (type.includes('text/')||type.includes('json')||!type)){
        const raw=(await res.text()).slice(0,180000);
        extract=stripHtml(raw).slice(0,2500);
      }
      enriched.push({...r,status:res.status,extract});
      activity(emit,`web-source-${i}`,res.ok && extract
        ?`Read source: ${r.title.slice(0,72)}`
        :`Could not read source: ${r.title.slice(0,72)} • HTTP ${res.status}`,
        res.ok&&extract?'completed':'warning','web');
    }catch(_){
      enriched.push(r);
      activity(emit,`web-source-${i}`,`Could not open source: ${r.title.slice(0,72)}; using search snippet`,'warning','web');
    }
  }
  return enriched;
}

export function buildLiveSourceContext(results=[]){
  if(!results.length)return '';
  const now=new Date().toISOString();
  let out=`\n\n[LIVE WEB RESEARCH — fetched ${now}]\n`;
  results.forEach((r,i)=>{
    out+=`\nSource ${i+1}: ${r.title}\nURL: ${r.url}\n`;
    if(r.snippet)out+=`Search snippet: ${r.snippet}\n`;
    if(r.extract)out+=`Page extract: ${r.extract}\n`;
  });
  out+=`\nUse these live sources only for claims they support. If sources conflict or are incomplete, say so. Mention source names/URLs in the answer when live facts matter.`;
  return out;
}

export function textFromAttachment(file){
  try{
    if(typeof file?.extractedText==='string' && file.extractedText.trim()){
      return file.extractedText.slice(0,650000);
    }
    if(!file?.data)return '';
    const mime=String(file.mimeType||'').toLowerCase();
    const name=String(file.name||file.filename||'');
    const textual=/^(text\/|application\/(json|javascript|xml|x-yaml|yaml))/i.test(mime) ||
      /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|md|txt|csv|xml|svg|py|php|java|kt|kts|c|cpp|h|hpp|cs|sql|yaml|yml|sh|log|gradle|properties|toml|ini|cfg|conf|env|pro)$/i.test(name);
    if(!textual)return '';
    const bin=atob(String(file.data));
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder('utf-8',{fatal:false}).decode(bytes).slice(0,180000);
  }catch(_){return '';}
}


export function sanitizeIncomingAttachments(files=[]){
  const input=Array.isArray(files)?files.slice(0,64):[];
  let totalBase64=0;
  let totalText=0;
  const out=[];

  for(const raw of input){
    if(!raw||typeof raw!=='object')continue;
    const f={
      name:String(raw.name||raw.filename||'Attachment').slice(0,220),
      parentName:String(raw.parentName||'').slice(0,220),
      mimeType:String(raw.mimeType||'application/octet-stream').slice(0,120),
      originalMimeType:String(raw.originalMimeType||raw.mimeType||'application/octet-stream').slice(0,120),
      kind:String(raw.kind||'file').slice(0,40),
      mediaRole:String(raw.mediaRole||'').slice(0,40),
      size:Math.max(0,Number(raw.size)||0),
      frameTimeSeconds:Number.isFinite(Number(raw.frameTimeSeconds))?Number(raw.frameTimeSeconds):null,
      pageNumber:Number.isFinite(Number(raw.pageNumber))?Number(raw.pageNumber):null,
      extractionError:String(raw.extractionError||'').slice(0,500),
      extractionWarning:String(raw.extractionWarning||'').slice(0,500),
      archiveFileCount:Math.max(0,Number(raw.archiveFileCount)||0),
      archiveReadableCount:Math.max(0,Number(raw.archiveReadableCount)||0),
      archiveBinaryCount:Math.max(0,Number(raw.archiveBinaryCount)||0),
      archiveSelectedCount:Math.max(0,Number(raw.archiveSelectedCount)||0),
      archiveSelectedChars:Math.max(0,Number(raw.archiveSelectedChars)||0),
      archivePriority:Number.isFinite(Number(raw.archivePriority))?Number(raw.archivePriority):0
    };

    if(typeof raw.extractedText==='string' && totalText<1150000){
      const remain=1150000-totalText;
      f.extractedText=raw.extractedText.slice(0,Math.min(650000,remain));
      totalText+=f.extractedText.length;
    }else f.extractedText='';

    if(typeof raw.data==='string' && totalBase64<2500000){
      const remain=2500000-totalBase64;
      if(raw.data.length<=remain && raw.data.length<=1500000){
        f.data=raw.data;
        totalBase64+=raw.data.length;
      }
    }

    out.push(f);
  }
  return out;
}

export function attachmentRootName(file={}){
  return String(file.parentName||file.name||file.filename||'Attachment');
}

export function userAttachmentCount(files=[]){
  const names=new Set();
  for(const f of Array.isArray(files)?files:[]){
    const root=attachmentRootName(f);
    if(root)names.add(root);
  }
  return names.size;
}

export function buildAttachmentSourceContext(files=[], userMessage=''){
  if(!Array.isArray(files)||!files.length)return '';
  const grouped=new Map();

  for(const f of files){
    const root=attachmentRootName(f);
    if(!grouped.has(root))grouped.set(root,{root,items:[],texts:[],errors:[],warnings:[]});
    const g=grouped.get(root);
    g.items.push(f);

    const text=textFromAttachment(f);
    if(text && !f.mediaRole)g.texts.push(text);
    if(f.extractionError)g.errors.push(f.extractionError);
    if(f.extractionWarning)g.warnings.push(f.extractionWarning);
  }

  const roots=[...grouped.entries()];
  const t=normalizeIntentText(userMessage);
  const codeEditIntent=/\b(fix|ayusin|edit|modify|update|add|lagyan|implement|paganahin|make it work|working|gumagana|refactor|rewrite)\b/i.test(t);
  const singleCodeFile=roots.length===1 && /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|h|hpp|cs|sql|ya?ml|sh|gradle|properties|toml)$/i.test(roots[0]?.[0]||'');
  const hasProjectArchive=roots.some(([name])=>/\.(?:zip|apk|aab|jar|aar)$/i.test(String(name||'')));
  const sourceBudget=(codeEditIntent&&singleCodeFile)?650000:(hasProjectArchive?380000:320000);

  let out='\n\n[ATTACHED SOURCE CONTENT]\n';
  let used=0;
  for(const [name,g] of roots.slice(0,12)){
    if(used>=sourceBudget)break;
    const first=g.items[0]||{};
    const mediaItems=g.items.filter(x=>x?.data && /^(image|video)\//i.test(String(x.mimeType||''))).length;
    out+=`\n--- Attachment: ${name} ---\n`;
    out+=`Type: ${first.originalMimeType||first.mimeType||'unknown'}\n`;
    if(first.size)out+=`Size: ${first.size} bytes\n`;
    if(first.duration)out+=`Duration: ${first.duration}\n`;
    if(mediaItems)out+=`Prepared visual/media parts: ${mediaItems}\n`;

    const text=g.texts.join('\n\n');
    if(text){
      const remain=sourceBudget-used;
      const part=text.slice(0,remain);
      out+=`Extracted content:\n${part}\n`;
      used+=part.length;
    }else if(!mediaItems){
      out+='No readable text content was extracted from this attachment.\n';
    }

    if(g.warnings.length)out+=`Extraction note: ${[...new Set(g.warnings)].join(' | ').slice(0,700)}\n`;
    if(g.errors.length)out+=`Extraction error: ${[...new Set(g.errors)].join(' | ').slice(0,700)}\n`;
  }

  out+=
    '\nATTACHMENT GROUNDING RULES: When the user asks to summarize, extract, answer questions, review, edit, transform, or draft from these attachments, treat the attachment content as the requested source. Preserve its terminology and distinctions. Do not silently replace missing information with outside knowledge. If a requested fact is not supported by the attachment, say so. When multiple files are present, distinguish them by filename. If outside research is also requested, clearly separate attachment-derived information from outside information.' +
    '\nSOURCE EDITING RULES: If the user attaches a source file such as index.html, JavaScript, CSS, JSON, Python, or a project archive and asks you to make it work, fix it, or add features, inspect the supplied source first and implement the request against that exact source. Preserve working behavior unless the requested change requires otherwise. Do not answer with generic sample code when the user clearly wants their uploaded file modified. If the supplied source is truncated, unreadable, or incomplete, say exactly what could not be inspected instead of pretending the whole file was reviewed.';
  return out;
}

export function mediaAttachments(files=[]){
  return (Array.isArray(files)?files:[]).filter(f=>{
    if(!f?.data)return false;
    const mime=String(f.mimeType||'').toLowerCase();
    return mime.startsWith('image/') || mime.startsWith('video/');
  }).slice(0,14);
}

export function mediaGroundingPrompt(message='', files=[]){
  const media=mediaAttachments(files);
  const manifest=media.map((f,i)=>{
    let detail=`${i+1}. ${f.name}`;
    if(f.mediaRole==='video-frame' && f.frameTimeSeconds!=null)detail+=` at ${f.frameTimeSeconds}s`;
    if(f.mediaRole==='pdf-page' && f.pageNumber!=null)detail+=` (PDF page ${f.pageNumber})`;
    if(f.parentName)detail+=` from ${f.parentName}`;
    return detail;
  }).join('\n');

  return (
    'Analyze the attached media strictly for the user’s latest request. ' +
    'Describe only evidence that is actually visible/audible in the supplied media. ' +
    'For screenshots or documents, read visible text carefully. ' +
    'For sampled video frames, do not claim events between frames unless clearly inferable; do not invent audio. ' +
    'Group findings by source filename when there are multiple attachments. ' +
    'Return a concise factual media-analysis note for another assistant pass, not a conversational final answer.\n\n' +
    `User request: ${String(message||'').slice(0,8000)}\n\nMedia manifest:\n${manifest}`
  );
}

export function usableMediaAnalysis(text=''){
  const t=String(text||'').replace(/\s+/g,' ').trim();
  if(t.length<24)return false;
  const refusal=/(?:can(?:not|'t)|unable to|don't have|do not have)\s+(?:see|view|access|open|inspect|analy[sz]e|process)\b.{0,80}\b(?:image|photo|picture|video|attachment|file)/i.test(t) ||
    /(?:no|without)\s+(?:image|photo|video|attachment)\s+(?:was\s+)?(?:provided|attached|available|visible)/i.test(t);
  return !refusal;
}

export async function analyzeMediaForNonVisionProvider(files=[], message='', selectedProvider='', selectedModel='', emit, customApiKeys=null, responseEffort='Instant'){
  const media=mediaAttachments(files);
  if(!media.length)return '';

  // Gemini and the dedicated Cloudflare vision selection receive the original
  // media directly in the final request, so a bridge analysis would only
  // duplicate cost and context.
  if(selectedProvider==='gemini'||selectedProvider==='cloudflare-vision'){
    activity(emit,'attachment-media',`Prepared ${media.length} visual/media part${media.length===1?'':'s'} for ${providerLabel(selectedProvider)}`,'completed','file');
    return '';
  }

  const imageOnly=media.filter(f=>String(f.mimeType||'').startsWith('image/'));
  const videoFrames=media.filter(f=>f.mediaRole==='video-frame').length;
  const rootNames=[...new Set(media.map(f=>attachmentRootName(f)).filter(Boolean))];
  const attachmentLabel=rootNames.slice(0,2).join(', ').slice(0,110);
  activity(emit,'attachment-media',videoFrames
    ?`Reading ${videoFrames} sampled video frame${videoFrames===1?'':'s'}${attachmentLabel?' from '+attachmentLabel:''} for your request`
    :`Reading ${imageOnly.length||media.length} attached image${(imageOnly.length||media.length)===1?'':'s'}${attachmentLabel?' from '+attachmentLabel:''} for your request`,
    'running',videoFrames?'file':'image');

  const system =
    'You are an attachment analysis tool. Be literal and evidence-grounded. ' +
    'Read visible text when legible. Do not invent people, objects, events, audio, or details that are not present. ' +
    'Your output will be given to another response model as source context.';
  const prompt=mediaGroundingPrompt(message,media);

  // First try the user's selected OpenAI-compatible model with image/frame
  // parts. If that exact model supports vision, no provider switch is needed.
  // A refusal or unsupported multimodal response is not accepted as evidence.
  const openAICompatibleVision=new Set(['groq','openrouter','mistral','unorouter','nvidia','codecraft','hcnsec','seekai','bailucode']);
  if(imageOnly.length && openAICompatibleVision.has(selectedProvider) &&
     ((Array.isArray(customApiKeys)&&customApiKeys.length)||configured(selectedProvider))){
    activity(emit,'attachment-media-selected',`Checking attached media with ${providerLabel(selectedProvider)} • ${modelLabel(selectedModel||'selected model')}`,'running','image');
    try{
      const r=await runOpenAICompatible(selectedProvider,{
        model:selectedModel,
        history:[],
        files:imageOnly,
        message:mediaGroundingPrompt(message,imageOnly),
        systemInstruction:system,
        emit:null,
        autoFallback:false,
        customApiKeys,
        visionPayload:true,
        responseEffort
      });
      if(r.ok){
        const text=await readInternalProviderText(r.response,16000);
        if(usableMediaAnalysis(text)){
          activity(emit,'attachment-media-selected',`Read attached media with ${providerLabel(selectedProvider)} • ${modelLabel(selectedModel||'selected model')}`,'completed','image');
          activity(emit,'attachment-media','Attachment evidence is ready for the selected response model','completed','file');
          return `\n\n[MEDIA ATTACHMENT ANALYSIS — ${providerLabel(selectedProvider)}]\n${text}\nUse this only as evidence about the supplied media; the original user request still controls the task.`;
        }
      }
      activity(emit,'attachment-media-selected','Selected model did not return grounded visual evidence — trying a configured vision analyzer','warning','image');
    }catch(_){
      activity(emit,'attachment-media-selected','Selected model could not read the visual payload directly — trying a configured vision analyzer','warning','image');
    }
  }

  // Gemini is the strongest general bridge here because it can receive both
  // image frames and a small native video payload. This does not change the
  // model/provider that writes the final answer.
  if(configured('gemini')){
    activity(emit,'attachment-media-bridge','Using Gemini to read attachment evidence for the selected model','running','image');
    try{
      const r=await runGemini({
        model:'gemini-flash-latest',
        history:[],
        files:media,
        message:prompt,
        systemInstruction:system,
        emit:null,
        autoFallback:false,
        responseEffort
      });
      if(r.ok){
        const text=await readInternalProviderText(r.response,16000);
        if(usableMediaAnalysis(text)){
          activity(emit,'attachment-media-bridge','Gemini finished reading the attachment evidence','completed','image');
          activity(emit,'attachment-media','Attachment evidence is ready for the selected response model','completed','file');
          return `\n\n[MEDIA ATTACHMENT ANALYSIS — Gemini]\n${text}\nUse this only as evidence about the supplied media; the original user request still controls the task.`;
        }
      }
      activity(emit,'attachment-media-bridge','Gemini did not return grounded attachment evidence','warning','image');
    }catch(_){
      activity(emit,'attachment-media-bridge','Gemini attachment analysis was unavailable','warning','image');
    }
  }

  // Cloudflare is a second vision bridge for photos, screenshots, PDF page
  // renders, and sampled video frames.
  if(imageOnly.length && configured('cloudflare')){
    activity(emit,'attachment-media-cloudflare','Trying Cloudflare vision for the attachment evidence','running','image');
    try{
      const r=await runCloudflare({
        model:'@cf/google/gemma-4-26b-a4b-it',
        history:[],
        files:imageOnly,
        message:mediaGroundingPrompt(message,imageOnly),
        systemInstruction:system,
        emit:null,
        autoFallback:false,
        responseEffort
      });
      if(r.ok){
        const text=await readInternalProviderText(r.response,16000);
        if(usableMediaAnalysis(text)){
          activity(emit,'attachment-media-cloudflare','Cloudflare vision finished reading the attachment evidence','completed','image');
          activity(emit,'attachment-media','Attachment evidence is ready for the selected response model','completed','file');
          return `\n\n[MEDIA ATTACHMENT ANALYSIS — Cloudflare]\n${text}\nUse this only as evidence about the supplied media; the original user request still controls the task.`;
        }
      }
      activity(emit,'attachment-media-cloudflare','Cloudflare did not return grounded attachment evidence','warning','image');
    }catch(_){
      activity(emit,'attachment-media-cloudflare','Cloudflare attachment analysis was unavailable','warning','image');
    }
  }

  activity(emit,'attachment-media','No configured vision route could read the attached media','warning','file');
  return null;
}


export function extractCodeBlocks(text=''){
  const out=[];
  const rx=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
  let m;
  while((m=rx.exec(String(text||''))) && out.length<8){
    out.push({lang:(m[1]||'').toLowerCase(),code:m[2]});
  }
  return out;
}

export function balanceReport(text='', pairs=[['{','}'],['[',']'],['(',')']]){
  const clean=String(text||'').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
  const errors=[];
  for(const [a,b] of pairs){
    let n=0;
    for(const ch of clean){ if(ch===a)n++; else if(ch===b)n--; if(n<0){errors.push(`unexpected ${b}`);break;} }
    if(n>0)errors.push(`missing ${b} ×${n}`);
  }
  return errors;
}

export function staticVerifyText(name='input', text='', hint=''){
  const lower=(hint||name||'').toLowerCase();
  const findings=[];
  let status='passed';

  if(/\bjson\b|\.json$/.test(lower)){
    try{JSON.parse(text);findings.push('JSON parses successfully.');}
    catch(e){status='failed';findings.push(`JSON parse error: ${String(e.message).slice(0,180)}`);}
  }else if(/\bhtml\b|\.html?$/.test(lower)){
    const tags=[...String(text).matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>/gi)]
      .map(m=>({name:m[1].toLowerCase(),close:m[0][1]==='/',self:/\/>$/.test(m[0])}));
    const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const stack=[];
    for(const t of tags){
      if(voids.has(t.name)||t.self)continue;
      if(!t.close)stack.push(t.name);
      else{
        const idx=stack.lastIndexOf(t.name);
        if(idx===-1){findings.push(`Closing </${t.name}> has no matching opener.`);status='warning';}
        else stack.splice(idx,1);
      }
    }
    if(stack.length){findings.push(`Possible unclosed HTML tags: ${[...new Set(stack.slice(-8))].join(', ')}.`);status='warning';}
    if(!findings.length)findings.push('Basic HTML tag structure looks balanced.');
  }else if(/\bcss\b|\.css$/.test(lower)){
    const errs=balanceReport(text,[['{','}']]);
    if(errs.length){status='failed';findings.push(`CSS structure issue: ${errs.join(', ')}.`);}
    else findings.push('CSS braces are balanced.');
  }else if(/\b(js|javascript|typescript|tsx|jsx)\b|\.(m?js|cjs|ts|tsx|jsx)$/.test(lower)){
    const errs=balanceReport(text);
    if(errs.length){status='failed';findings.push(`Bracket structure issue: ${errs.join(', ')}.`);}
    else findings.push('Basic JavaScript/TypeScript bracket structure is balanced.');
    if(/\b(eval|new Function)\s*\(/.test(text))findings.push('Dynamic code execution pattern detected; not executed by the verifier.');
  }else{
    const errs=balanceReport(text);
    if(errs.length){status='warning';findings.push(`Possible delimiter issue: ${errs.join(', ')}.`);}
    else findings.push('No obvious delimiter-balance issue found.');
  }

  return {name,status,findings};
}

export function shouldProbeRequestedUrl(url='',message=''){
  const raw=String(url||'').trim();
  const msg=normalizeIntentText(message);
  if(!raw)return false;
  let parsed;
  try{parsed=new URL(raw);}catch(_){return false;}
  const explicitProbe=/\b(test|probe|check|verify|open|fetch|inspect|status|reachable|working|gumagana|i-check|icheck|i-test|itest|subukan)\b/i.test(msg);
  const apiLike=/\bapi\b/i.test(parsed.hostname) || /^\/v\d+(?:\/)?$/i.test(parsed.pathname) ||
    /\/(?:v\d+\/)?(?:chat|responses?|completions?|messages?|generate)(?:\/|$)/i.test(parsed.pathname);
  // A base API URL inside a build prompt is configuration, not a webpage the
  // assistant should GET. Probing it creates misleading 404 activity/context.
  if(apiLike&&!explicitProbe)return false;
  return true;
}

export async function probeRequestedUrls(message='', emit){
  const urls=[...new Set(extractPublicUrl(message))]
    .filter(isSafePublicUrl)
    .filter(url=>shouldProbeRequestedUrl(url,message))
    .slice(0,3);
  const results=[];
  for(let i=0;i<urls.length;i++){
    const url=urls[i];
    activity(emit,`url-test-${i}`,`Testing requested URL: ${linkLabel(url)}`,'running','test',url.slice(0,100));
    const started=Date.now();
    try{
      const res=await safePublicFetch(url,{
        method:'GET',
        headers:{'User-Agent':'JepongDevxyzAI/1.0','Accept':'text/html,application/json,text/plain,*/*'},
        signal:AbortSignal.timeout(10000)
      },2);
      const elapsed=Date.now()-started;
      results.push({url,status:res.status,ok:res.ok,elapsedMs:elapsed,contentType:res.headers.get('content-type')||''});
      activity(emit,`url-test-${i}`,`${res.ok?'URL responded':'URL returned an error'} • HTTP ${res.status} • ${elapsed} ms`,res.ok?'completed':'warning','test');
    }catch(e){
      results.push({url,ok:false,error:String(e?.message||e)});
      activity(emit,`url-test-${i}`,'URL test failed','warning','test',String(e?.message||e).slice(0,120));
    }
  }
  return results;
}

export function executionEnvironmentContext(message=''){
  const t=String(message||'').toLowerCase();
  if(/\b(apk|android studio|gradle|compile android|build android|xcode|ipa|docker|native build|npm install|pip install|gcc|clang|java compiler|run python|execute code)\b/i.test(t)){
    return `\n\n[EXECUTION ENVIRONMENT]\nThis API runs on Vercel Edge. It can perform HTTP checks, inspect text/code statically, validate JSON/basic markup structure, and research the live public web. It does NOT provide a full local Android/iOS compiler, Docker daemon, package installer, shell, or arbitrary-code execution sandbox. Never claim a native build or executable test ran unless an external configured service actually returned a result.`;
  }
  return '';
}


