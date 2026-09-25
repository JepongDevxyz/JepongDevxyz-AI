import assert from 'node:assert/strict';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const endpoint='http://127.0.0.1:9222';

async function getPage(){
  for(let i=0;i<80;i++){
    try{
      const pages=await fetch(endpoint+'/json/list').then(r=>r.json());
      const page=pages.find(x=>x.type==='page'&&String(x.url||'').includes('127.0.0.1:4173'));
      if(page?.webSocketDebuggerUrl)return page;
    }catch{}
    await sleep(250);
  }
  throw new Error('Chrome DevTools page did not become available');
}

const page=await getPage();
const ws=new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('CDP websocket timeout')),5000);
  ws.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
  ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('CDP websocket error'));},{once:true});
});

let seq=0;
const pending=new Map();
const runtimeErrors=[];
const consoleErrors=[];

ws.addEventListener('message',event=>{
  const msg=JSON.parse(String(event.data));
  if(msg.id&&pending.has(msg.id)){
    const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
    if(msg.error)reject(new Error(msg.error.message||JSON.stringify(msg.error)));
    else resolve(msg.result);
    return;
  }
  if(msg.method==='Runtime.exceptionThrown'){
    runtimeErrors.push(msg.params?.exceptionDetails?.text||'Runtime exception');
  }
  if(msg.method==='Runtime.consoleAPICalled'&&msg.params?.type==='error'){
    const text=(msg.params?.args||[]).map(x=>x.value??x.description??'').join(' ');
    if(text.includes('[JepongDevxyz micro]'))consoleErrors.push(text);
  }
});

function call(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{
      if(pending.has(id)){pending.delete(id);reject(new Error('CDP timeout: '+method));}
    },8000);
  });
}
async function evaluate(expression){
  const out=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(out.exceptionDetails)throw new Error(out.exceptionDetails.text||'Evaluation failed');
  return out.result?.value;
}

await call('Runtime.enable');
await call('Page.enable');
await call('Log.enable');

for(let i=0;i<80;i++){
  const ready=await evaluate(`document.readyState !== 'loading' && !!document.body && window.__JD_REACTBITS_MICRO_READY__ === true`);
  if(ready)break;
  if(i===79)throw new Error('JepongDevxyz AI ReactBits runtime did not become ready');
  await sleep(250);
}

const initial=JSON.parse(await evaluate(`JSON.stringify({
  bodyText:document.body.innerText.trim().length,
  prompt:!!document.querySelector('#promptBar.prompt-bar[data-models="false"]'),
  mic:!!document.querySelector('#micBtn.voice-pill'),
  readAloud:!!document.querySelector('#speechMiniPlayer.read-aloud-pill'),
  bell:!!document.querySelector('#replyBellToggle.bell-toggle'),
  squish:document.querySelectorAll('.squish-switch-root').length,
  old:document.querySelectorAll('.chat-input-pill,.pill-mic-btn,.speech-mini-player,.mini-toggle,.ios-switch,.jd-haptics-switch,.jd-reply-notify-switch').length
})`));
assert(initial.bodyText>20,'page rendered blank');
assert(initial.prompt,'PromptBar did not render');
assert(initial.mic,'VoicePill microphone did not render');
assert(initial.readAloud,'VoicePill read-aloud surface did not render');
assert(initial.bell,'BellToggle did not render');
assert(initial.squish>=3,'SquishSwitch controls did not render');
assert.equal(initial.old,0,'legacy component markup still rendered');

// 1/6: real Activity functions must render LatticeLoader + ThoughtLine and real labels.
const activity=JSON.parse(await evaluate(`(()=>{
  showAIIndicator('Audit ReactBits browser smoke test',[]);
  appendActivityEvent({id:'task-context',label:'Auditing requested ReactBits components',kind:'process',state:'completed'});
  appendActivityEvent({id:'generation',label:'Generating response',kind:'generate',state:'running'});
  const card=document.getElementById('activeAiIndicator');
  const before={
    lattice:!!card?.querySelector('.lattice-loader[data-status="working"]'),
    thought:!!card?.querySelector('.thought-line'),
    trace:!!card?.querySelector('.thought-line__trace'),
    lead:card?.querySelector('.ai-activity-lead')?.textContent||'',
    rows:card?.querySelectorAll('.ai-activity-row').length||0
  };
  finishAIIndicator(true,1200);
  before.done=card?.querySelector('.lattice-loader')?.dataset.status;
  return JSON.stringify(before);
})()`));
assert(activity.lattice&&activity.thought&&activity.trace,'LatticeLoader + ThoughtLine failed to render');
assert.equal(activity.lead,'Auditing requested ReactBits components');
assert(activity.rows>=1,'real Activity row did not render');
assert.equal(activity.done,'done','LatticeLoader did not settle to done');

// 2/6: BellToggle mirrors actual checkbox state without requesting browser permission.
const bell=JSON.parse(await evaluate(`(()=>{
  const input=document.getElementById('settingsNotifyToggle');
  const root=document.getElementById('replyBellToggle');
  input.checked=false;window.JDReactBits.syncBell();
  const off=root.dataset.on;
  input.checked=true;window.JDReactBits.syncBell();
  const on=root.dataset.on;
  input.checked=false;window.JDReactBits.syncBell();
  return JSON.stringify({off,on,button:root.querySelector('.bell-toggle__button')?.getAttribute('aria-pressed')});
})()`));
assert.equal(bell.off,'false');assert.equal(bell.on,'true');assert.equal(bell.button,'false');

// 3/6: PromptBar follows the real send/stop state.
const prompt=JSON.parse(await evaluate(`(()=>{
  const bar=document.getElementById('promptBar');
  updateGenerationActionButton(true,false);
  const busy=bar.dataset.busy;
  const stop=!!document.querySelector('#mainActionBtn .prompt-bar__stop');
  updateGenerationActionButton(false,false);
  return JSON.stringify({busy,stop,idle:bar.dataset.busy,models:bar.dataset.models});
})()`));
assert.equal(prompt.busy,'true');assert(prompt.stop,'PromptBar stop state missing');
assert.equal(prompt.idle,'false');assert.equal(prompt.models,'false');

// 4/6: RefineFrame complete initializes in-browser.
const refine=JSON.parse(await evaluate(`(()=>{
  const frame=document.createElement('div');
  frame.className='refine-frame';frame.dataset.status='complete';
  frame.innerHTML='<div class="refine-frame__media"></div><div class="refine-frame__chip"></div>';
  document.body.appendChild(frame);window.JDReactBits.hydrateRefine(frame);
  return JSON.stringify({bound:frame.dataset.rbBound,status:frame.dataset.status,enter:frame.classList.contains('rb-enter')});
})()`));
assert.equal(refine.bound,'1');assert.equal(refine.status,'complete');assert(refine.enter);

// 5/6: existing SquishSwitch roots are hydrated and retain real checkbox inputs.
const squish=JSON.parse(await evaluate(`(()=>{
  window.JDReactBits.hydrateSquish(document);
  const roots=[...document.querySelectorAll('.squish-switch-root')];
  return JSON.stringify({count:roots.length,bound:roots.filter(x=>x.dataset.rbBound==='1').length,inputs:roots.filter(x=>x.querySelector('input[type="checkbox"]')).length});
})()`));
assert(squish.count>=3);assert.equal(squish.bound,squish.count);assert.equal(squish.inputs,squish.count);

// 6/6: VoicePill + read aloud visual states follow the real app state.
const voice=JSON.parse(await evaluate(`(()=>{
  const mic=document.getElementById('micBtn');
  mic.classList.add('recording');mic.setAttribute('aria-pressed','true');window.JDReactBits.syncVoice();
  const listening=mic.dataset.state;
  mic.classList.remove('recording');mic.setAttribute('aria-pressed','false');window.JDReactBits.syncVoice();
  const idle=mic.dataset.state;
  const player=document.getElementById('speechMiniPlayer');
  player.classList.add('visible');window.JDReactBits.syncReadAloud();const reading=player.dataset.state;
  player.classList.remove('visible');window.JDReactBits.syncReadAloud();const stopped=player.dataset.state;
  return JSON.stringify({listening,idle,reading,stopped});
})()`));
assert.deepEqual(voice,{listening:'listening',idle:'idle',reading:'listening',stopped:'idle'});

await sleep(250);
assert.deepEqual(runtimeErrors,[],'browser runtime exceptions: '+runtimeErrors.join(' | '));
assert.deepEqual(consoleErrors,[],'ReactBits runtime console errors: '+consoleErrors.join(' | '));

ws.close();
console.log('PASS: headless Chrome ReactBits 6/6 runtime smoke');
