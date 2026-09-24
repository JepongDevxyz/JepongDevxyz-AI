import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const chat=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function section(start,end){
  const s=chat.indexOf(start),e=chat.indexOf(end,s+start.length);
  assert(s>=0&&e>s,'Missing source contract: '+start);
  return chat.slice(s,e);
}
assert(chat.includes('autoFallback = body.autoFallback === true;'),'Fallback flag must be strictly boolean');
assert(chat.includes('smartRouter = autoFallback && body.smartRouter === true;'),'Fallback OFF must lock model/provider');
assert(chat.includes('if(autoFallback&&fallbackable){'),'Cross-provider fallback must require ON');
assert(chat.includes("if(openai.ok||args.autoFallback!==true)return openai;"),'Bailu alternate API route must require ON');
assert(index.includes('router.disabled=!autoProviderFallback;'),'UI must disable router when fallback OFF');
assert(index.includes('syncStrictRoutingControls();'),'UI must sync fallback controls');

const helper=section('function providerCredentials(','\nfunction getProviderKeys(');
const selected=new Function(helper+'return providerCredentials;')();
assert.deepEqual(selected(['first','second'],false),['first']);
assert.deepEqual(selected(['first','second'],true),['first','second']);

const keyCode=section('function getProviderKeys(','\nfunction ');
const getKeys=new Function('rotateProviderKeys','parseKeys','API_GUARD',keyCode+'return getProviderKeys;')(
  (_provider,keys)=>keys.slice().reverse(),
  (plural)=>plural==='AIHORDE_API_KEYS'?['first-key','second-key']:['first-key','second-key'],
  {maxProviderCredentialsPerRequest:8}
);
assert.deepEqual(getKeys('aihorde',false),['first-key','second-key'],
  'OFF must preserve the first configured key, not advance rotation');
assert.deepEqual(getKeys('aihorde',true),['second-key','first-key'],
  'ON may rotate credentials');

const runCode=section('async function runAIHorde(','\nasync function runAnonymousAIHordeFallback(');
function fixture({keys=['first-key','second-key'],status=401,answer=''}={}){
  const calls=[],events=[];
  const deps={
    AIHORDE_ANONYMOUS_KEY:'0000000000',AIHORDE_CLIENT_AGENT:'unit-test',
    providerCredentials:selected,
    shuffle:keys=>keys,
    getProviderKeys:(_p,rotate)=>rotate?keys.slice().reverse():keys,
    resolveAIHordeModels:async()=>[
      {name:'first-fast-model',workers:3},
      {name:'second-fast-model',workers:2}
    ],
    buildOpenAIMessages:()=>[{role:'user',content:'Hi'}],
    providerLifecycleActivity:(_emit,event)=>events.push(event),
    providerLabel:p=>p,outputBudgetFor:()=>200,temperatureFor:()=>0.4,
    passthroughHeaders:()=>({'x-ai-provider':'aihorde'}),
    Response:class{constructor(body,init){this.text=body;this.headers=init.headers;}},
    AbortSignal:{timeout:ms=>({ms})},
    summarizeAIHordeError:()=>status===401?'Unauthorized':'Busy worker',
    isAIHordeCredentialFailure:code=>code===401,
    isAIHordeGenerationFailure:code=>code>=500,
    Date:{now:()=>1000000},
    fetch:async(_url,init)=>{
      calls.push({key:init.headers.apikey,model:JSON.parse(init.body).model});
      const ok=answer!==''&&init.headers.apikey==='0000000000';
      return {ok,status:ok?200:status,text:async()=>JSON.stringify(
        ok?{choices:[{message:{content:answer}}]}:{error:'upstream failure'}
      )};
    }
  };
  const run=new Function(...Object.keys(deps),runCode+'return runAIHorde;')(...Object.values(deps));
  return {run,calls,events};
}
const off=fixture();
const denied=await off.run({model:'auto',message:'Hi',files:[],autoFallback:false});
assert.equal(denied.ok,false);
assert.deepEqual(off.calls,[{key:'first-key',model:'first-fast-model'}],
  'OFF must use only the first configured key and first auto-selected model');
const on=fixture({answer:'Anonymous success'});
const result=await on.run({model:'auto',message:'Hi',files:[],autoFallback:true});
assert.equal(result.ok,true);
assert(on.calls.some(call=>call.key==='0000000000'),'ON must be able to use anonymous fallback');
assert(on.calls.length>1,'ON must be able to retry credentials');
const noKey=fixture({keys:[]});
const noKeyResult=await noKey.run({model:'auto',message:'Hi',files:[],autoFallback:false});
assert.equal(noKeyResult.ok,false);
assert.match(noKeyResult.error,/Anonymous fallback is OFF/);
assert.equal(noKey.calls.length,0,'OFF must not use anonymous route when no key is configured');

const workerOff=fixture({status:503});
await workerOff.run({model:'auto',message:'Hi',files:[],autoFallback:false});
assert.deepEqual(workerOff.calls,[{key:'first-key',model:'first-fast-model'}],
  'OFF must not switch models after upstream error');
console.log('Strict fallback tests passed: one credential/model/provider, no anonymous with OFF, key and anonymous fallback with ON, smart routing locked.');
