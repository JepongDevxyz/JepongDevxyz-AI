import { strict as assert } from 'node:assert';
import { runConfiguredWebSearch } from '../api/web-search.js';

const calls=[];
const providerActivity=[];
const env={
  SERPAPI_API_KEYS:'serp-secret-1,serp-secret-2',
  TAVILY_API_KEYS:'tavily-secret-1,tavily-secret-2',
  FIRECRAWL_API_KEYS:'firecrawl-secret-1,firecrawl-secret-2',
  GOOGLE_SEARCH_API_KEYS:'google-secret-1,google-secret-2',
  GOOGLE_SEARCH_CX:'engine-id',
  WEB_SEARCH_PROVIDER_ORDER:'serpapi,tavily,firecrawl,google'
};
const fetchImpl=async (url,init={})=>{
  calls.push({url:String(url),init});
  if(String(url).startsWith('https://serpapi.com/')){
    if(new URL(String(url)).searchParams.get('api_key')==='serp-secret-1')return {ok:false,status:429,json:async()=>({})};
    if(new URL(String(url)).searchParams.get('api_key')==='serp-secret-2')return {ok:false,status:402,json:async()=>({})};
  }
  if(String(url)==='https://api.tavily.com/search')return {
    ok:true,status:200,json:async()=>({results:[{
      title:'Photosynthesis facts',url:'https://example.org/photosynthesis',content:'Photosynthesis converts light into chemical energy.'
    }]})
  };
  throw new Error('unexpected provider request');
};
const outcome=await runConfiguredWebSearch('photosynthesis light energy',{
  env,fetchImpl,signal:{},maxResults:4,onProviderAttempt:event=>providerActivity.push(event)
});
assert.deepEqual(outcome.results.map(x=>x.title),['Photosynthesis facts']);
assert.equal(outcome.provider,'tavily');
assert.equal(calls.length,3,'rotate every SerpAPI key then fall through to Tavily');
assert.match(calls[0].url,/engine=google/);
assert.match(calls[0].url,/api_key=serp-secret-1/);
assert.match(calls[1].url,/api_key=serp-secret-2/);
assert.equal(calls[2].url,'https://api.tavily.com/search');
assert.equal(calls[2].init.headers.Authorization,'Bearer tavily-secret-1');
assert.equal(JSON.parse(calls[2].init.body).query,'photosynthesis light energy');
assert.deepEqual(providerActivity.map(x=>`${x.provider}:${x.state}`),[
  'serpapi:running','serpapi:warning','serpapi:running','serpapi:warning','tavily:running','tavily:completed'
],'activity callback must identify each actual provider/key attempt and success');

const nextStart= calls.length;
const secondOutcome=await runConfiguredWebSearch('photosynthesis light energy',{
  env,fetchImpl,signal:{},maxResults:4
});
assert.equal(secondOutcome.provider,'tavily');
assert.match(calls[nextStart].url,/api_key=serp-secret-2/,'next search should start with the next SerpAPI key');
assert.match(calls[nextStart+1].url,/api_key=serp-secret-1/,'then exhaust the remaining SerpAPI key');
assert.equal(calls[nextStart+2].init.headers.Authorization,'Bearer tavily-secret-2','provider key order should rotate between searches too');

const allCalls=[];
await runConfiguredWebSearch('topic',{
  env:{GOOGLE_SEARCH_API_KEYS:'key-without-cx'},
  fetchImpl:async url=>{allCalls.push(String(url));return {ok:false,status:500,json:async()=>({})};}
});
assert.equal(allCalls.length,0,'Google must be skipped unless its cx search-engine ID is configured');

console.log('PASS: configured search providers rotate keys, report real provider attempts, and require both Google CSE credentials.');
