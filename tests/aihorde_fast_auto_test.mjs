import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const source=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function extract(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert(a>=0&&b>a,'Source marker missing: '+start);
  return source.slice(a,b);
}
const quality=extract('function scoreAIHordeModel(','\nfunction summarizeAIHordeError(');
const resolve=extract('async function resolveAIHordeModels(','\nfunction isAIHordeGenerationFailure(');
const run=extract('async function runAIHorde(','\nasync function runAnonymousAIHordeFallback(');
const available=[
 {name:'fast-24b',workers:2,eta:5,queued:0,performance:90},
 {name:'slow-70b',workers:16,eta:125,queued:100,performance:130},
 {name:'medium-7b',workers:3,eta:16,queued:1,performance:30},
 {name:'slow-13b',workers:1,eta:160,queued:20,performance:20}
];
const rank=new Function('getAIHordeActiveModels','normalizeIntentText','numericModelSizeHint',
  quality+'\n'+resolve+'\nreturn {scoreAIHordeModel,resolveAIHordeModels};')(
  async()=>available,x=>x,name=>Number((name.match(/(\d+)b/)||[])[1]||0)
);
const ranked=await rank.resolveAIHordeModels('auto','Hi',{});
assert.deepEqual(ranked.map(x=>x.name),['fast-24b','medium-7b','slow-70b']);
assert.equal((await rank.resolveAIHordeModels('slow-70b','Hi',{}))[0].name,'slow-70b');

function mockRunner({keys=[],generate,clock={now:1000000}}){
  const observed=[];
  class FakeResponse{
    constructor(value,options){this.value=value;this.headers=options.headers;}
  }
  const deps={
    Date:{now:()=>clock.now},
    AIHORDE_ANONYMOUS_KEY:'0000000000',AIHORDE_CLIENT_AGENT:'JD-test',
    providerCredentials:(keys,autoFallback)=>autoFallback?keys:keys.slice(0,1),
    runAIHordeNativeSelected:async args=>{observed.push({native:true,model:args.model});return {ok:true};},
    getProviderKeys:()=>keys,shuffle:x=>x,resolveAIHordeModels:async()=>ranked,
    buildOpenAIMessages:(_h,message)=>[{role:'user',content:message}],
    providerLifecycleActivity:()=>{},providerLabel:x=>x,
    outputBudgetFor:()=>4096,temperatureFor:()=>0.4,
    passthroughHeaders:()=>({}),Response:FakeResponse,
    AbortSignal:{timeout:ms=>({timeoutMs:ms})},
    summarizeAIHordeError:()=> 'request failed',isAIHordeCredentialFailure:(status)=>status===401,
    isAIHordeGenerationFailure:(status)=>status>=500,
    fetch:async(_url,options)=>{
      const body=JSON.parse(options.body);
      observed.push({key:options.headers.apikey,timeout:options.signal.timeoutMs,model:body.model,
        maxTokens:body.max_tokens,upstreamTimeout:body.timeout});
      return generate(options,body,clock);
    }
  };
  const runner=new Function(...Object.keys(deps),run+'\nreturn runAIHorde;')(...Object.values(deps));
  return {runner,observed};
}
const success=mockRunner({keys:['fake-key'],generate:async(_opt,_body)=>({
  status:200,ok:true,text:async()=>JSON.stringify({choices:[{message:{content:'Blue.'}}]})
})});
const successResult=await success.runner({model:'auto',history:[],message:'What is the sky color?',files:[]});
assert(successResult.ok);
assert.equal(successResult.response.value,'Blue.');
assert.equal(success.observed[0].model,'fast-24b');
assert(success.observed[0].timeout<=26000&&success.observed[0].maxTokens<=320);

const fallback=mockRunner({keys:['fake-key'],generate:async(options)=>(
  options.headers.apikey==='fake-key'
    ?{status:401,ok:false,text:async()=>JSON.stringify({error:'credential rejected'})}
    :{status:200,ok:true,text:async()=>JSON.stringify({choices:[{message:{content:'Public route works.'}}]})}
)});
const fallbackResult=await fallback.runner({model:'auto',history:[],message:'Hi',files:[],autoFallback:true});
assert(fallbackResult.ok&&fallback.observed.length===2);
assert.deepEqual(fallback.observed.map(x=>x.key),['fake-key','0000000000']);

const time=mockRunner({keys:[],clock:{now:1000000},generate:async(_options,_body,clock)=>{
  clock.now+=27000;throw new Error('Simulated upstream timeout');
}});
const timeoutResult=await time.runner({model:'auto',history:[],message:'Hi',files:[],autoFallback:true});
assert(!timeoutResult.ok&&timeoutResult.status===504);
assert(time.observed.length<=2,'Auto must not exceed overall time budget');
assert(time.observed.every(x=>x.timeout<=26000),'Per-attempt timeout exceeded');

const explicit=mockRunner({keys:[],generate:async()=>({
  status:200,ok:true,text:async()=>JSON.stringify({choices:[{message:{content:'OK'}}]})
})});
await explicit.runner({model:'slow-70b',history:[],message:'Hi',files:[],autoFallback:true});
assert.deepEqual(explicit.observed,[{native:true,model:'slow-70b'}],
 'Explicitly selected models must use the native AI Horde route, not old Auto proxy.');

console.log('AI Horde Auto tests passed: queue-aware ranking, manual model, fast reply, credential fallback, deadline, manual timeout');
