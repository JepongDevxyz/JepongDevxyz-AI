import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
const source=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function between(start,end){
 const s=source.indexOf(start),e=source.indexOf(end,s+start.length);
 assert(s>=0&&e>s,'Missing '+start);
 return source.slice(s,e);
}
const native=between('function aiHordeNativePrompt(','\nasync function runAIHorde({');
const auth=between('async function checkAIHordeCredential(','\nasync function liveAIHordePickerModels(');
const picker=between('function fourResponsiveAIHordeModels(','\nfunction summarizeAIHordeError(');
assert(native.includes("models:[model],nsfw:false,slow_workers:false"),'Must submit exactly chosen model');
assert(native.includes("base+'status/'+encodeURIComponent(id)"),'Must poll native text status by job ID');
assert(native.includes("method:'DELETE'"),'Must cancel unfinished requests');
assert(source.includes("if(model&&model!=='auto')return runAIHordeNativeSelected"),'Explicit model must avoid compatibility proxy');
assert(source.includes("const keys=anonymous?[AIHORDE_ANONYMOUS_KEY]:configuredKeys;"),
 'Registered and anonymous Horde must remain independent emergency routes');
const key='private-fixture-not-real';
function authTest(status){
 const seen=[];
 const get=new Function('AIHORDE_ANONYMOUS_KEY','fetch','AIHORDE_CLIENT_AGENT','AbortSignal',
 auth+'return checkAIHordeCredential;')('0000000000',async(url,options)=>{
  seen.push({url,method:options.method,apikey:options.headers.apikey});
  return {ok:status===200,status};
 },'JD-UNIT-TEST',{timeout:()=>null});
 return {get,seen};
}
const yes=authTest(200);
assert.equal(await yes.get(key),'valid');
assert.equal(yes.seen[0].apikey,key);
const no=authTest(401);assert.equal(await no.get(key),'rejected');
assert.equal(await no.get(''),'missing');
assert.equal(await no.get('0000000000'),'anonymous');
const unknown=authTest(503);assert.equal(await unknown.get(key),'unverified');

function createRunner({keys=['first-registered-key'],authStatus='valid',generate,models=['strong-active-model']}={}){
 const requests=[];
 class FakeResponse{constructor(text,{headers}){this.text=text;this.headers=headers;}}
 const deps={
  AIHORDE_ANONYMOUS_KEY:'0000000000',AIHORDE_CLIENT_AGENT:'JD-UNIT-TEST',
  getProviderKeys:()=>keys,
  providerLifecycleActivity:()=>{},providerLabel:x=>x,
  resolveAIHordeModels:async(name)=>{
   if(name==='auto')return models.map(x=>({name:x,workers:2,eta:5}));
   return models.includes(name)?[{name,workers:2,eta:5}]:[];
  },
  buildOpenAIMessages:(_h,message,system)=>[{role:'system',content:system||'Brief.'},{role:'user',content:message}],
  outputBudgetFor:()=>256,
  checkAIHordeCredential:async k=>k==='0000000000'?'anonymous':authStatus,
  summarizeAIHordeError:(status)=>'upstream HTTP '+status,
  passthroughHeaders:(_up,provider,model)=>({'X-AI-Provider':provider,'X-AI-Model':model}),
  Response:FakeResponse,
  AbortSignal:{timeout:ms=>({ms})},
  Date:globalThis.Date,
  setTimeout,
  fetch:async(url,options)=>{
   requests.push({url,method:options.method,key:options.headers.apikey,body:options.body});
   return generate(url,options);
  }
 };
 const runner=new Function(...Object.keys(deps),native+'\nreturn {runAIHordeNativeSelected,aiHordeNativeTextRequest};')(...Object.values(deps));
 return {...runner,requests};
}
const success=createRunner({generate:async(url)=>{
 if(url.endsWith('/async'))return {ok:true,status:202,json:async()=>({id:'example-job-id-123'})};
 if(url.endsWith('/status/example-job-id-123'))return {
  ok:true,status:200,json:async()=>({done:true,generations:[{text:'Assistant: Hello!'}]})
 };
 throw Error('Unexpected fetch '+url);
}});
const result=await success.runAIHordeNativeSelected({
 model:'strong-active-model',history:[],files:[],message:'Hi',systemInstruction:'Be brief.',autoFallback:false
});
assert(result.ok&&result.response.text==='Hello!');
assert(success.requests.every(x=>x.key==='first-registered-key'));
assert.deepEqual(success.requests.map(x=>x.method),['POST','GET']);
const submitted=JSON.parse(success.requests[0].body);
assert.deepEqual(submitted.models,['strong-active-model']);
assert(!success.requests.some(x=>x.url.includes('oai.aihorde.net')));

const rejected=createRunner({keys:['invalid-first','good-second'],authStatus:'rejected',
 generate:async()=>{throw Error('No generation must be sent if auth rejected');}});
const denied=await rejected.runAIHordeNativeSelected({
 model:'strong-active-model',history:[],files:[],message:'Hi',autoFallback:false
});
assert(!denied.ok&&denied.status===401);
assert.deepEqual(rejected.requests,[],'Strict OFF must not submit or try a second key');

const failed=createRunner({keys:['first','second'],generate:async(url,options)=>{
 if(options.headers.apikey==='first')return {ok:false,status:401,json:async()=>({message:'rejected'})};
 if(url.endsWith('/async'))return {ok:true,status:202,json:async()=>({id:'job-second-12345'})};
 return {ok:true,status:200,json:async()=>({done:true,generations:[{text:'Second key works.'}]})};
}});
const recovered=await failed.runAIHordeNativeSelected({
 model:'strong-active-model',history:[],files:[],message:'Hi',autoFallback:true
});
assert(recovered.ok&&recovered.response.text==='Second key works.');
assert.deepEqual(failed.requests.map(x=>x.key),['first','second','second']);

const noModel=createRunner({models:[],generate:async()=>{throw Error('Not active');}});
const absent=await noModel.runAIHordeNativeSelected({
 model:'offline-model',history:[],files:[],message:'Hi',autoFallback:false
});
assert(!absent.ok&&noModel.requests.length===0);

const pick=new Function('isAllowedAIHordeModelName','scoreAIHordeModel','getAIHordeActiveModels','AbortSignal',
 picker+'\nreturn fourResponsiveAIHordeModels;')(()=>true,m=>20-m.eta,async()=>[],{timeout:()=>null});
assert.deepEqual(pick([{name:'unknown',workers:3,eta:null},{name:'fast-7b',workers:2,eta:8}]).map(x=>x.name),['fast-7b']);
console.log('PASS: first-party key valid/rejected/unverified; native exact-model 202/poll; strict OFF no second key/anonymous; ON credential retry; offline rejects; unknown queue ETA excluded.');
