/* lib/chat/search.js — split from api/chat.js (mechanical move, no behavior change). */
import { detectArtifactRequest } from './artifacts.js';
import { wantsCompleteCode } from './effort.js';
import { normalizeIntentText } from './prompts.js';
import { isVagueFreshnessFollowUp, splitContextualTaskMessage } from './task.js';
import { activity, json } from './utils.js';
import { extractCodeBlocks } from './verify.js';

function shouldAutoResearchCore(message=''){
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

function shouldAutoResearch(message=''){
  const parts=splitContextualTaskMessage(message);
  if(parts.followUp && isVagueFreshnessFollowUp(parts.followUp)){
    // A vague follow-up inherits research only when the anchored task was
    // already an explicit live-research task.
    return shouldAutoResearchCore(parts.anchor) &&
      /\b(search|research|news|weather|panahon|forecast|price|presyo|outage|live score|verify online|check online|hanapin|maghanap|tingnan online)\b/i.test(normalizeIntentText(parts.anchor));
  }
  return shouldAutoResearchCore(parts.raw);
}

function isWebsiteSecurityRequest(message=''){
  return /\b(website|web\s*site|site|webpage|web\s*app|webapp|domain)\b/i.test(message)
    && /\b(safe|safety|secure|security|ligtas|seguridad|vulnerab|prote[ck]|hack|harden|headers|ssl|https|audit)\b/i.test(message);
}

function buildLiveSearchQuery(message=''){
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
function relevantWebResults(results=[], query=''){
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

function shouldVerifyTask(message='', files=[]){
  const t=normalizeIntentText(message);
  if(Array.isArray(files) && files.length && /\b(test|verify|check|inspect|validate|debug|run|working|gumagana|subukan|i-test|itest|suriin|ayusin|error|bug|build|compile|deploy|create|make|gawan|gumawa|implement|develop)\b/i.test(t)) return true;
  return /\b(test|verify|check|inspect|validate|debug|run|working|gumagana|subukan|i-test|itest|suriin|build|compile|deploy|endpoint|website|url|api|create|make|gawan|gumawa|implement|develop|html|javascript|typescript|python|java|kotlin|game)\b/i.test(t);
}

function auditGeneratedResponse(message='',generatedText='',files=[]){
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

function htmlDecode(s=''){
  return String(s)
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#x2F;/gi,'/').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)||32));
}

function stripHtml(s=''){
  return htmlDecode(String(s)
    .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
  ).trim();
}

function extractPublicUrl(text=''){
  const matches=String(text||'').match(/https?:\/\/[^\s<>"'`)\]]+/gi)||[];
  return matches.map(x=>x.replace(/[.,!?;:]+$/,''));
}

function isPrivateIpv4(host=''){
  const m=host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if(!m)return false;
  const [a,b,c,d]=m.slice(1).map(Number);
  if([a,b,c,d].some(n=>n<0||n>255))return true;
  return a===10 || a===127 || a===0 || (a===169&&b===254) ||
    (a===172&&b>=16&&b<=31) || (a===192&&b===168) ||
    (a===100&&b>=64&&b<=127) || a>=224;
}

function isSafePublicUrl(raw=''){
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

async function safePublicFetch(url, options={}, maxRedirects=3){
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

function decodeDuckDuckGoHref(href=''){
  try{
    const decoded=htmlDecode(href);
    const u=new URL(decoded,'https://duckduckgo.com');
    const uddg=u.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : u.toString();
  }catch(_){return htmlDecode(href);}
}

function publicSearchFallbackResultLabel({provider='public sources',resultCount=0,reason=''}={}){
  const count=Math.max(0,Number(resultCount)||0);
  const results=count===1?'1 relevant web result':`${count} relevant web results`;
  const base=count?`Found ${results} • ${provider}`:`No relevant web results found • ${provider}`;
  return reason?`${base} • public fallback (${reason})`:`${base} • public source`;
}

async function duckDuckGoHtmlSearch(query, emit){
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

function decodeXmlText(value=''){
  return htmlDecode(String(value||'')
    .replace(/^<!\[CDATA\[/,'').replace(/\]\]>$/,'')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')).trim();
}

async function safeJsonResponse(res){
  const text=await res.text().catch(()=> '');
  if(!text.trim())return null;
  try{return JSON.parse(text);}catch(_){return null;}
}

async function bingRssSearch(query){
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

async function wikipediaSearch(query){
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

function isSimpleCasualMessage(message=''){
  const t=String(message||'').trim();
  return /^(hi|hello|hey|kumusta|kamusta|salamat|thanks|thank you|good morning|good afternoon|good evening|yo|sup)[!.? ]*$/i.test(t);
}

async function noKeyWebSearch(query, emit,{fallbackReason=''}={}){
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

async function duckDuckGoInstantSearch(query='', emit){
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

async function enrichSearchResults(results=[], emit, maxSources=3){
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

function buildLiveSourceContext(results=[]){
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

export { shouldAutoResearchCore, shouldAutoResearch, isWebsiteSecurityRequest, buildLiveSearchQuery, relevantWebResults, shouldVerifyTask, auditGeneratedResponse, htmlDecode, stripHtml, extractPublicUrl, isPrivateIpv4, isSafePublicUrl, safePublicFetch, decodeDuckDuckGoHref, publicSearchFallbackResultLabel, duckDuckGoHtmlSearch, decodeXmlText, safeJsonResponse, bingRssSearch, wikipediaSearch, isSimpleCasualMessage, noKeyWebSearch, duckDuckGoInstantSearch, enrichSearchResults, buildLiveSourceContext };
