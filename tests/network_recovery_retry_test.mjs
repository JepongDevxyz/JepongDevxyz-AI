import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function waitForNetworkRecovery(');
const end=html.indexOf('\n        function setReconnectVisible(',start);
assert(start>=0&&end>start,'network recovery wait helper must exist');
const helper=html.slice(start,end);

function createHarness({online=false,probe=async()=>({ok:true})}={}){
  const listeners=new Map();
  let poll=null;
  let timeout=null;
  const window={
    addEventListener(type,fn){listeners.set(type,fn)},
    removeEventListener(type,fn){if(listeners.get(type)===fn)listeners.delete(type)}
  };
  const context={
    navigator:{onLine:online},window,setReconnectVisible(){},
    fetch:probe,
    Date,
    setInterval(fn){poll=fn;return 1},clearInterval(){poll=null},
    setTimeout(fn){timeout=fn;return 2},clearTimeout(){timeout=null}
  };
  vm.createContext(context);
  vm.runInContext(helper,context);
  return {
    wait:context.waitForNetworkRecovery,
    setOnline(value){context.navigator.onLine=value},
    online(){listeners.get('online')?.()},
    poll(){poll?.()},
    timeout(){timeout?.()}
  };
}

let probes=0;
const recovered=createHarness({online:true,probe:async()=>({ok:++probes>1})});
const recovery=recovered.wait(null,30000);
await new Promise(resolve=>setImmediate(resolve));
recovered.setOnline(true);
recovered.online();
assert.equal(await recovery,true,'a restored, reachable connection must unblock response recovery');
assert(probes>=2,'recovery must verify the actual app endpoint instead of trusting navigator.onLine');

const unavailable=createHarness({probe:async()=>({ok:false})});
const timedOut=unavailable.wait(null,1);
await new Promise(resolve=>setImmediate(resolve));
unavailable.timeout();
assert.equal(await timedOut,false,'recovery must stop cleanly when the reconnect window expires');

const source=html.slice(html.indexOf('        async function executeAICall('),html.indexOf('\n        /* 6. SEND MESSAGE',html.indexOf('        async function executeAICall(')));
assert(source.includes('waitForNetworkRecovery(requestController.signal'),
  'interrupted model calls must wait for a verified network before automatic retry');
assert(source.includes('recoveryAttempt<1'),
  'automatic model retry must be capped to prevent duplicate request loops');
assert(source.includes('studyTool: studyToolForRequest')&&
  source.includes('recoveryAttempt+1,studyToolForRequest'),
  'automatic retry must preserve request-specific study action state');

console.log('PASS: verified recovery-gated, one-time automatic retry for interrupted model responses.');
