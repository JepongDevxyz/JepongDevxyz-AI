import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const source=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function segment(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing source contract: '+start);
  return source.slice(a,b);
}
const classifier=new Function(segment('function isProviderQuotaFailure(','\nfunction passthroughHeaders(')+
  '\nreturn isFallbackableProviderFailure;')();
for(const status of [401,402,403,429]) assert.equal(classifier(status,''),true);
for(const status of [400,404,415,422,500,502,503,504]) assert.equal(classifier(status,'model not found'),false);
assert.equal(classifier(400,'quota exceeded'),true);

const chooseKeys=new Function('API_GUARD',segment('function providerCredentials(','\nfunction getProviderKeys(')+
 '\nreturn providerCredentials;')({maxProviderCredentialsPerRequest:8});
const providerRunner=segment('async function runOpenAICompatible(','\nasync function runCohere(');
function primary({statuses=[429,200],keys=['key-one','key-two'],fallback=false}={}){
 const attempts=[];
 class FakeResponse{constructor(body,{headers}={}){this.body=body;this.headers={get:()=>null,...headers};}}
 const deps={
   providerCredentials:chooseKeys,
   getProviderKeys:()=>keys,
   DYNAMIC_MODEL_PROVIDERS:new Set(),
   PROVIDERS:{groq:{models:['openai/gpt-oss-20b'],defaultModel:'openai/gpt-oss-20b'}},
   buildOpenAIMessages:()=>[{role:'user',content:'Hi'}],
   providerLifecycleActivity:()=>{},
   outputBudgetFor:()=>100,
   temperatureFor:()=>0.3,
   AbortSignal:{timeout:ms=>ms},
   fetch:async(_url,opts)=>{
     const nth=attempts.length,status=statuses[Math.min(nth,statuses.length-1)];
     attempts.push({key:opts.headers.Authorization.replace('Bearer ',''),model:JSON.parse(opts.body).model});
     return {ok:status===200,status,body:'mocked-stream',text:async()=>'{"error":"quota exceeded"}'};
   },
   openAIStreamToText:()=> 'mocked-text',
   Response:FakeResponse,
   passthroughHeaders:()=>({}),
   cleanUpstreamError:()=> 'quota exceeded',
   retryLabel:()=> 'quota exceeded',
   providerLabel:x=>x,
   modelLabel:x=>x,
   chatCompletionsUrl:()=>''
 };
 const runner=new Function(...Object.keys(deps),providerRunner+'\nreturn runOpenAICompatible;')(...Object.values(deps));
 return {attempts,execute:()=>runner('groq',{model:'openai/gpt-oss-20b',history:[],message:'Hi',autoFallback:fallback})};
}

const enough=primary();
assert.equal((await enough.execute()).ok,true);
assert.deepEqual(enough.attempts.map(x=>x.key),['key-one','key-two'],
 'First exhausted key must rotate to second on same selected model with emergency OFF');
assert(enough.attempts.every(x=>x.model==='openai/gpt-oss-20b'));
const exhausted=primary({statuses:[429,429],fallback:true});
const failed=await exhausted.execute();
assert.equal(failed.ok,false);
assert.equal(failed.status,429);
assert.deepEqual(exhausted.attempts.map(x=>x.key),['key-one','key-two']);

const from=source.indexOf('  const fallbackable=isFallbackableProviderFailure(first.status,first.error);');
const last="  return {ok:false,status:first.status||500,error:first.error||'AI provider unavailable.',provider,startedAt};";
const to=source.indexOf(last,from);
assert(from>=0&&to>from,'Emergency fallback coordinator not found');
const coordinator=source.slice(from,to+last.length);
async function fallback({enabled=true,first=failed,registeredSuccess=false,anonymousSuccess=true,files=[]}={}){
 const calls=[];
 const success=(provider)=>({ok:true,response:{
   headers:{get:k=>({'x-ai-provider':provider,'x-ai-model':'verified-live-model'}[k]||null)}
 },finishState:{reason:'stop'}});
 const deps={
   autoFallback:enabled,first,provider:'groq',model:'openai/gpt-oss-20b',
   history:[],files,message:'Hi',systemInstruction:'Test',routedReason:'',emit:()=>{},startedAt:1,
   isFallbackableProviderFailure:classifier,
   activity:()=>{},providerLabel:x=>x,
   runAIHorde:async args=>{calls.push({kind:'registered',args});return registeredSuccess?success('aihorde'):{ok:false,status:401,error:'invalid registered key'};},
   runAnonymousAIHordeFallback:async args=>{calls.push({kind:'anonymous',args});return anonymousSuccess?success('aihorde-public'):{ok:false,status:503,error:'no workers'};}
 };
 const result=await new Function(...Object.keys(deps),'return (async()=>{'+coordinator+'})();')(...Object.values(deps));
 return {result,calls};
}
const goodRegistered=await fallback({registeredSuccess:true});
assert.equal(goodRegistered.result.ok,true);
assert.deepEqual(goodRegistered.calls.map(x=>x.kind),['registered']);
assert.equal(goodRegistered.result.resolvedProvider,'aihorde');
assert.equal(goodRegistered.calls[0].args.model,'auto');

const badRegistered=await fallback();
assert.equal(badRegistered.result.ok,true);
assert.deepEqual(badRegistered.calls.map(x=>x.kind),['registered','anonymous']);
assert.equal(badRegistered.result.resolvedProvider,'aihorde-public');
assert.equal(badRegistered.calls[1].args.model,'auto');

const off=await fallback({enabled:false});
assert.equal(off.result.ok,false);
assert.deepEqual(off.calls,[],'OFF forbids both emergency routes even after all keys exhaust');
for(const status of [400,415,500,503]){
 const noRoute=await fallback({first:{ok:false,status,error:'Invalid request or temporary outage'}});
 assert.deepEqual(noRoute.calls,[], 'HTTP '+status+' must not trigger emergency quota fallback');
}
const vision=await fallback({files:[{mimeType:'image/png',data:'base64'}]});
assert.deepEqual(vision.calls,[],'Text-only Horde must not silently consume image requests');
const none=await fallback({anonymousSuccess:false});
assert.equal(none.result.ok,false);
assert.match(none.result.error,/both AI Horde fallback routes are unavailable/i);

assert(!frontend.includes('data-provider="aihorde"'));
assert(!frontend.includes('aihordeFourModelChoices'));
assert(frontend.includes("currentSelectedProvider='gemini'"));
console.log('PASS: first key -> second key -> registered Horde -> anonymous Horde, gated ON, no carousel, no validation/vision fallback.');
