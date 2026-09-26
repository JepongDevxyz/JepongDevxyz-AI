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
  prompt:!!document.querySelector('#promptBar.prompt-bar[data-models="false"] .prompt-bar__field .prompt-bar__bar'),
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
    headline:card?.querySelector('#aiActivitySummary')?.textContent||'',
    timer:card?.querySelector('#aiActivityTimer')?.textContent||'',
    rows:card?.querySelectorAll('.ai-activity-row').length||0
  };
  finishAIIndicator(true,1200);
  before.done=card?.querySelector('.lattice-loader')?.dataset.status;
  before.settled=card?.querySelector('#aiActivitySummary')?.textContent||'';
  before.finalTimer=card?.querySelector('#aiActivityTimer')?.textContent||'';
  return JSON.stringify(before);
})()`));
assert(activity.lattice&&activity.thought&&activity.trace,'LatticeLoader + ThoughtLine failed to render');
assert.equal(activity.lead,'Auditing requested ReactBits components');
assert.equal(activity.headline,'Generating response','ThoughtLine did not follow the real running activity event');
assert(activity.rows>=1,'real Activity row did not render');
assert.equal(activity.done,'done','LatticeLoader did not settle to done');
assert.equal(activity.settled,'Thought for','ThoughtLine did not settle like ReactBits');
assert.equal(activity.finalTimer,'1s','ThoughtLine final elapsed timer mismatch');

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

// 3/6: PromptBar uses the ReactBits menu/slider/chips and morphs send -> stop.
const prompt=JSON.parse(await evaluate(`(async()=>{
  const bar=document.getElementById('promptBar');
  const input=document.getElementById('userInput');
  const send=document.getElementById('mainActionBtn');
  const path=document.getElementById('promptBarSendPath');

  input.value='hello';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  const armed=send.hasAttribute('data-armed');
  const arrowBefore=path?.getAttribute('d')||'';

  toggleComposerTools({stopPropagation(){}},true);
  const sourceMenu=document.getElementById('composerToolSheet');
  const sourceOpen=!sourceMenu.hidden && sourceMenu.matches('.prompt-bar__menu[data-kind="at"]');
  closeComposerTools();

  toggleResponseEffortMenu({stopPropagation(){}},true);
  const effortMenu=document.getElementById('responseEffortMenu');
  const effortOpen=!effortMenu.hidden && !!effortMenu.querySelector('.prompt-bar__effort-track');
  closeResponseEffortMenu();

  updateGenerationActionButton(true,false);
  await new Promise(r=>setTimeout(r,280));
  const busy=bar.hasAttribute('data-busy');
  const stopPath=path?.getAttribute('d')||'';

  updateGenerationActionButton(false,false);
  await new Promise(r=>setTimeout(r,280));
  const idle=!bar.hasAttribute('data-busy');
  const arrowAfter=path?.getAttribute('d')||'';

  return JSON.stringify({
    busy,idle,models:bar.dataset.models,armed,sourceOpen,effortOpen,
    field:!!bar.querySelector('.prompt-bar__field'),
    controls:!!bar.querySelector('.prompt-bar__bar'),
    chips:!!bar.querySelector('#filePreviewContainer.prompt-bar__chips'),
    arrowBefore,stopPath,arrowAfter
  });
})()`));
assert(prompt.busy,'PromptBar busy attribute missing');
assert(prompt.idle,'PromptBar busy attribute did not clear');
assert.equal(prompt.models,'false');
assert(prompt.armed,'PromptBar send never armed');
assert(prompt.sourceOpen,'ReactBits source menu did not open');
assert(prompt.effortOpen,'ReactBits effort slider did not open');
assert(prompt.field&&prompt.controls&&prompt.chips,'ReactBits PromptBar hierarchy missing');
assert.notEqual(prompt.stopPath,prompt.arrowBefore,'send glyph did not morph to stop');
assert.equal(prompt.arrowAfter,prompt.arrowBefore,'send glyph did not morph back to arrow');

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

// 6/6: VoicePill + read aloud states and actual tap/hold gesture contract.
const voice=JSON.parse(await evaluate(`(async()=>{
  const mic=document.getElementById('micBtn');
  const calls=[];
  window.startSpeechRecognition=()=>{
    calls.push('start');
    mic.dataset.state='listening';
    mic.classList.add('recording');
    mic.setAttribute('aria-pressed','true');
    window.JDReactBits.syncVoice();
    return Promise.resolve(true);
  };
  window.stopSpeechRecognition=reason=>{
    calls.push('stop:'+reason);
    mic.classList.remove('recording');
    mic.setAttribute('aria-pressed','false');
    mic.dataset.state='idle';
    window.JDReactBits.syncVoice();
  };

  const fire=(type,id,x)=>mic.dispatchEvent(new PointerEvent(type,{
    bubbles:true,pointerId:id,clientX:x,button:0,isPrimary:true,pointerType:'touch'
  }));

  // Quick tap from idle starts and remains listening.
  fire('pointerdown',11,120);fire('pointerup',11,120);
  const quick=[...calls];
  const afterQuick=mic.dataset.state;

  // Quick tap while already listening stops.
  fire('pointerdown',12,120);fire('pointerup',12,120);
  const afterToggle=[...calls];

  // Hold from idle starts then stops on release after threshold.
  fire('pointerdown',13,120);
  await new Promise(r=>setTimeout(r,330));
  fire('pointerup',13,120);
  const afterHold=[...calls];

  // Slide left past 64px cancels.
  fire('pointerdown',14,120);
  fire('pointermove',14,45);
  fire('pointerup',14,45);
  const afterCancel=[...calls];

  const player=document.getElementById('speechMiniPlayer');
  player.classList.add('visible');window.JDReactBits.syncReadAloud();const reading=player.dataset.state;
  player.classList.remove('visible');window.JDReactBits.syncReadAloud();const stopped=player.dataset.state;

  return JSON.stringify({quick,afterQuick,afterToggle,afterHold,afterCancel,reading,stopped});
})()`));
assert.deepEqual(voice.quick,['start'],'quick tap should start dictation without immediate stop');
assert.equal(voice.afterQuick,'listening');
assert.deepEqual(voice.afterToggle,['start','stop:tap'],'tap while listening should stop');
assert.deepEqual(voice.afterHold.slice(-2),['start','stop:release'],'hold must stop on release');
assert.deepEqual(voice.afterCancel.slice(-2),['start','stop:cancel'],'slide-left must cancel');
assert.equal(voice.reading,'listening');assert.equal(voice.stopped,'idle');

await sleep(250);
assert.deepEqual(runtimeErrors,[],'browser runtime exceptions: '+runtimeErrors.join(' | '));
assert.deepEqual(consoleErrors,[],'ReactBits runtime console errors: '+consoleErrors.join(' | '));

ws.close();
console.log('PASS: headless Chrome ReactBits 6/6 runtime smoke');
