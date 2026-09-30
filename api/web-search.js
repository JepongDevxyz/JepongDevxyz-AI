const DEFAULT_PROVIDER_ORDER=['serpapi','tavily','firecrawl','google','brave'];
const providerKeyCursors=new Map();

function configuredProviders(env={}){
  const keys={
    serpapi:readKeys(env,'SERPAPI_API_KEYS','SERPAPI_API_KEY'),
    tavily:readKeys(env,'TAVILY_API_KEYS','TAVILY_API_KEY'),
    firecrawl:readKeys(env,'FIRECRAWL_API_KEYS','FIRECRAWL_API_KEY'),
    google:readKeys(env,'GOOGLE_SEARCH_API_KEYS','GOOGLE_SEARCH_API_KEY'),
    brave:readKeys(env,'BRAVE_SEARCH_API_KEYS','BRAVE_SEARCH_API_KEY')
  };
  if(!String(env.GOOGLE_SEARCH_CX||'').trim())keys.google=[];
  const requested=String(env.WEB_SEARCH_PROVIDER_ORDER||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const order=requested.length?requested:DEFAULT_PROVIDER_ORDER;
  return [...new Set([...order,...DEFAULT_PROVIDER_ORDER])].filter(name=>keys[name]?.length);
}

function readKeys(env,plural,singular){
  return String(env[plural]||env[singular]||'').split(/[\n,]+/).map(value=>value.trim()).filter(Boolean)
    .slice(0,Math.max(1,Math.min(32,Number(env.API_MAX_CREDENTIAL_RETRIES||8))));
}

function normalizeResults(provider,data,maxResults=5){
  const rows=provider==='serpapi'?data?.organic_results
    :provider==='tavily'?data?.results
    :provider==='firecrawl'?(data?.web||data?.data?.web||data?.data||data?.results)
    :provider==='google'?data?.items
    :data?.web?.results;
  if(!Array.isArray(rows))return [];
  return rows.slice(0,maxResults).map(item=>({
    title:String(item?.title||'').trim().slice(0,180),
    url:String(item?.url||item?.link||'').trim(),
    snippet:String(item?.snippet||item?.content||item?.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,500)
  })).filter(result=>result.title&&result.url);
}

function providerRequest(provider,key,query,options={}){
  const {maxResults=5,signal,env={}}=options;
  if(provider==='serpapi'){
    const url=new URL('https://serpapi.com/search.json');
    url.searchParams.set('engine','google');url.searchParams.set('api_key',key);
    url.searchParams.set('q',query);url.searchParams.set('num',String(Math.min(maxResults,10)));
    return {url,init:{method:'GET',headers:{Accept:'application/json'},signal}};
  }
  if(provider==='tavily')return {url:'https://api.tavily.com/search',init:{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({query,search_depth:options.fast?'fast':'basic',topic:'general',max_results:Math.min(maxResults,20),include_answer:false,include_raw_content:false}),signal
  }};
  if(provider==='firecrawl')return {url:'https://api.firecrawl.dev/v2/search',init:{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({query,limit:Math.min(maxResults,10),sources:[{type:'web'}]}),signal
  }};
  if(provider==='google'){
    const url=new URL('https://customsearch.googleapis.com/customsearch/v1');
    url.searchParams.set('key',key);url.searchParams.set('cx',String(env.GOOGLE_SEARCH_CX||'').trim());
    url.searchParams.set('q',query);url.searchParams.set('num',String(Math.min(maxResults,10)));
    return {url,init:{method:'GET',headers:{Accept:'application/json'},signal}};
  }
  if(provider==='brave'){
    const url=new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q',query);url.searchParams.set('count',String(Math.min(maxResults,20)));
    return {url,init:{method:'GET',headers:{Accept:'application/json','X-Subscription-Token':key},signal}};
  }
  return null;
}

export async function runConfiguredWebSearch(query,options={}){
  const {env=process.env,fetchImpl=fetch,signal,fast=false,maxResults=5,isSafePublicUrl=defaultSafeUrl,relevantWebResults=defaultRelevantResults,onProviderAttempt}=options;
  const normalizedQuery=String(query||'').trim().slice(0,500);
  if(!normalizedQuery)return {results:[],provider:'',keyIndex:-1,keyCount:0};
  for(const provider of configuredProviders(env)){
    const configuredKeys={
      serpapi:readKeys(env,'SERPAPI_API_KEYS','SERPAPI_API_KEY'),
      tavily:readKeys(env,'TAVILY_API_KEYS','TAVILY_API_KEY'),
      firecrawl:readKeys(env,'FIRECRAWL_API_KEYS','FIRECRAWL_API_KEY'),
      google:readKeys(env,'GOOGLE_SEARCH_API_KEYS','GOOGLE_SEARCH_API_KEY'),
      brave:readKeys(env,'BRAVE_SEARCH_API_KEYS','BRAVE_SEARCH_API_KEY')
    }[provider]||[];
    if(!configuredKeys.length)continue;
    const start=providerKeyCursors.get(provider)||0;
    providerKeyCursors.set(provider,(start+1)%configuredKeys.length);
    const keys=configuredKeys.map((_,index)=>configuredKeys[(start+index)%configuredKeys.length]);
    for(let keyIndex=0;keyIndex<keys.length;keyIndex++){
     const key=keys[keyIndex];
     try{
      onProviderAttempt?.({provider,keyIndex,keyCount:keys.length,state:'running'});
      const attemptSignal=signal||AbortSignal.timeout(Math.max(1000,Number(options.timeoutMs)||(fast?5000:8000)));
      const request=providerRequest(provider,key,normalizedQuery,{...options,env,signal:attemptSignal,fast,maxResults});
      if(!request)continue;
      const response=await fetchImpl(request.url,request.init);
      if(!response?.ok){
        onProviderAttempt?.({provider,keyIndex,keyCount:keys.length,state:'warning',httpStatus:Number(response?.status)||0});
        if(isCredentialOrQuotaFailure(response?.status))continue;
        break;
      }
      const data=await response.json();
      const safe=normalizeResults(provider,data,maxResults).filter(item=>isSafePublicUrl(item.url));
      const relevant=relevantWebResults(safe,normalizedQuery);
      if(relevant.length){
        onProviderAttempt?.({provider,keyIndex,keyCount:keys.length,state:'completed',resultCount:relevant.length});
        return {results:relevant,provider,keyIndex,keyCount:keys.length};
      }
      break;
     }catch(_){
       // Network/timeout errors also advance to the next key and provider.
       onProviderAttempt?.({provider,keyIndex,keyCount:keys.length,state:'warning'});
       continue;
     }
    }
  }
  return {results:[],provider:'',keyIndex:-1,keyCount:0};
}

function isCredentialOrQuotaFailure(status){
  return [401,402,403,408,409,425,429,500,502,503,504].includes(Number(status));
}

function defaultSafeUrl(value){
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch(_){return false;}
}

function defaultRelevantResults(rows,query){
  const terms=[...new Set(String(query).toLowerCase().match(/[a-z0-9]{4,}/g)||[])];
  if(!terms.length)return [];
  return rows.filter(row=>{
    const text=`${row.title} ${row.url} ${row.snippet}`.toLowerCase();
    return terms.filter(term=>text.includes(term)).length>=Math.min(2,terms.length);
  }).slice(0,5);
}
