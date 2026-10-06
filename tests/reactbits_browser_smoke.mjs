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
    const details=msg.params?.exceptionDetails;
    runtimeErrors.push(details?.exception?.description||details?.exception?.value||details?.text||'Runtime exception');
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
  const ready=await evaluate(`document.readyState !== 'loading' && !!document.body && window.__JD_REACTBITS_MICRO_READY__ === true && window.__JD_MOTION_UX_READY__ === true`);
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

for(let i=0;i<80;i++){
  const ready=await evaluate(`!!window.JDVoiceMode&&!!document.getElementById('mainActionBtn')?.__jdVoiceSwapped`);
  if(ready)break;
  if(i===79)throw new Error('Voice mode did not attach to the empty composer action');
  await sleep(100);
}
const voiceEntryState=JSON.parse(await evaluate(`JSON.stringify((()=>{
  const action=document.getElementById('mainActionBtn');
  return {swapped:!!action?.__jdVoiceSwapped,disabled:!!action?.disabled,armed:action?.hasAttribute('data-armed'),slingDisabled:action?.closest('.rb-sling-wrap')?.hasAttribute('data-disabled')};
})())`));
assert(voiceEntryState.swapped,'empty composer must display the voice action');
assert.equal(voiceEntryState.disabled,false,'visible voice action must remain tappable when the composer is empty');
assert.equal(voiceEntryState.armed,true,'voice action must enter the Sling quick-tap path');
assert.equal(voiceEntryState.slingDisabled,false,'Sling wrapper must not suppress the voice action');

// Keep this component smoke independent from the external Markdown CDN used only to render message bodies.
await evaluate(`if(typeof window.marked==='undefined'){window.marked={parse:value=>String(value??'').replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]))}}`);

// 1/6: frame-match the supplied Work Activity recording.
const activity=JSON.parse(await evaluate(`(async()=>{
  showAIIndicator('Build the requested dashboard',[]);
  appendActivityEvent({id:'task-context',label:'Built the file',kind:'process',state:'completed'});
  appendActivityEvent({id:'web-search',label:'Searching the web',kind:'web',state:'running'});
  appendActivityEvent({id:'process-step',label:'Implemented the dashboard',kind:'process',state:'completed'});
  appendActivityEvent({id:'provider-codecraft',label:'CodeCraftAPI connected',kind:'provider',state:'completed'});
  appendActivityEvent({id:'generation',label:'Generating the response',kind:'generate',state:'running'});
  appendActivityEvent({id:'thinking',label:'Preparing implementation',kind:'build',state:'running'});
  appendJdWorkNote('May isang importanteng production detail na kailangan isaalang-alang.');
  await drainActivityPlayback();
  const card=document.getElementById('activeAiIndicator');
  const rows=[...card.querySelectorAll('.ai-activity-row')];
  const web=rows.find(x=>x.dataset.activityId==='web-search');
  const process=rows.find(x=>x.dataset.activityId==='process-step');
  const thinking=rows.find(x=>x.dataset.activityId==='thinking');
  const provider=rows.find(x=>x.dataset.activityId==='provider-codecraft');
  const generation=rows.find(x=>x.dataset.activityId==='generation');
  const note=card.querySelector('.ai-work-commentary__text');
  const cardStyle=getComputedStyle(card);
  const labelStyle=getComputedStyle(web.querySelector('.ai-activity-label'));
  const noteStyle=getComputedStyle(note);
  const headerStyle=getComputedStyle(card.querySelector('.ai-activity-header-actions'));
  const before={
    reference:card.classList.contains('reference-work-flow'),
    headerDisplay:headerStyle.display,
    latticeCells:card.querySelectorAll('#aiActivityLattice .lattice-loader__run .lattice-loader__cell').length,
    marginLeft:cardStyle.marginLeft,
    marginRight:cardStyle.marginRight,
    labelFont:labelStyle.fontSize,
    thoughtFont:getComputedStyle(card.querySelector('.thought-line')).fontSize,
    labelLine:labelStyle.lineHeight,
    noteFont:noteStyle.fontSize,
    webIconDisplay:getComputedStyle(web.querySelector('.ai-activity-icon')).display,
    processIconless:process.classList.contains('ai-activity-iconless'),
    thinkingIconless:thinking.classList.contains('ai-activity-iconless'),
    thinkingText:thinking.querySelector('.ai-activity-label')?.textContent||'',
    providerDisplay:getComputedStyle(provider).display,
    generationDisplay:getComputedStyle(generation).display,
    lead:card.querySelector('.ai-activity-lead')?.textContent||'',
    primaryVisible:rows.filter(x=>getComputedStyle(x).display!=='none').map(x=>x.dataset.activityId)
  };
  finishAIIndicator(true,1200);
  before.settled={
    status:card.querySelector('#aiActivityLattice')?.dataset.status||'',
    label:card.querySelector('#aiActivityLattice')?.getAttribute('aria-label')||'',
    working:card.querySelector('.thought-line')?.dataset.working||''
  };
  return JSON.stringify(before);
})()`));
assert.equal(activity.reference,true,'Reference Work class missing');
assert.equal(activity.headerDisplay,'flex','Requested Lattice/Thought header must remain visible above the existing Activity timeline');
assert.equal(activity.latticeCells,9,'Lattice Loader must render the full 3x3 grid');
assert.deepEqual(activity.settled,{status:'done',label:'Done',working:'false'},'Lattice and Thought Line must settle with the activity result');
assert.equal(activity.marginLeft,'14px');
assert.equal(activity.marginRight,'12px');
assert.equal(activity.labelFont,'15.5px');
assert.equal(activity.thoughtFont,'16px','ThoughtLine label and timer must match the supplied mobile reference scale');
assert.equal(activity.noteFont,'16px');
assert.notEqual(activity.webIconDisplay,'none','Tool/search row must keep its icon');
assert.equal(activity.processIconless,true,'Plain work milestone must not reserve an icon lane');
assert.equal(activity.thinkingIconless,true,'Thinking must be a plain terminal row');
assert.equal(activity.thinkingText,'Preparing implementation','Model-work row must preserve the task-specific activity label');
assert.notEqual(activity.providerDisplay,'none','Provider connection status must remain visible in the primary activity timeline');
assert.notEqual(activity.generationDisplay,'none','Generation status must remain visible in the primary activity timeline');
assert.equal(activity.lead,'','Temporary client lead must clear after the truthful server timeline starts');
assert(activity.primaryVisible.includes('task-context')&&activity.primaryVisible.includes('web-search')&&activity.primaryVisible.includes('process-step')&&activity.primaryVisible.includes('thinking'),
  'Primary chronological reference milestones are missing');

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
  assert.equal(!!send.__jdVoiceSwapped,false,'typing must restore the send action after voice entry');
  const armed=send.hasAttribute('data-armed');
  const arrowBefore=path?.getAttribute('d')||'';

  toggleComposerTools({stopPropagation(){}},true);
  const sourceMenu=document.getElementById('composerToolSheet');
  const sourceOpen=!sourceMenu.hidden && sourceMenu.matches('.prompt-bar__menu[data-kind="at"]');
  closeComposerTools();

  toggleResponseEffortMenu({stopPropagation(){}},true);
  const effortMenu=document.getElementById('responseEffortMenu');
  const effortTrack=document.getElementById('responseEffortTrack');
  const effortOpen=!effortMenu.hidden && !!effortTrack;
  const effortLevels=[];
  for(let i=0;i<6;i++){
    setResponseEffortByIndex(i,{closeMenu:false,toast:false});
    effortLevels.push({
      label:document.getElementById('responseEffortLabel')?.textContent||'',
      now:effortTrack?.getAttribute('aria-valuenow')||'',
      max:bar.hasAttribute('data-max')
    });
  }
  const effortDots=effortTrack?.querySelectorAll('.prompt-bar__effort-dot').length||0;
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
    effortLevels,effortDots,
    arrowBefore,stopPath,arrowAfter
  });
})()`));
assert(prompt.busy,'PromptBar busy attribute missing');
assert(prompt.idle,'PromptBar busy attribute did not clear');
assert.equal(prompt.models,'false');
assert(prompt.armed,'PromptBar send never armed');
assert(prompt.sourceOpen,'ReactBits source menu did not open');
assert(prompt.effortOpen,'ReactBits effort slider did not open');
assert.equal(prompt.effortDots,6,'ReactBits effort slider must expose six stops');
assert.deepEqual(
  prompt.effortLevels.map(x=>x.label),
  ['Instant','Low','Medium','High','Extra','Max'],
  'ReactBits effort slider labels/order mismatch'
);
assert.deepEqual(
  prompt.effortLevels.map(x=>x.now),
  ['0','1','2','3','4','5'],
  'ReactBits effort slider aria positions mismatch'
);
assert.equal(prompt.effortLevels.at(-1).max,true,'Max effort must enable the ReactBits max/spark state');
assert.equal(prompt.effortLevels.slice(0,-1).some(x=>x.max),false,'Only Max may enable the ReactBits max/spark state');
assert(prompt.field&&prompt.controls&&prompt.chips,'ReactBits PromptBar hierarchy missing');
assert.notEqual(prompt.stopPath,prompt.arrowBefore,'send glyph did not morph to stop');
assert.equal(prompt.arrowAfter,prompt.arrowBefore,'send glyph did not morph back to arrow');

// Sling Button follows the ReactBits defaults and routes each gesture once.
const sling=JSON.parse(await evaluate(`(async()=>{
  const input=document.getElementById('userInput');
  const wrap=document.getElementById('mainActionSling');
  const button=document.getElementById('mainActionBtn');
  const calls=[];
  input.value='sling smoke';input.dispatchEvent(new Event('input',{bubbles:true}));
  window.handleMainAction=()=>calls.push(button.title||'Send');
  const fire=(type,id,x)=>button.dispatchEvent(new PointerEvent(type,{
    bubbles:true,cancelable:true,pointerId:id,clientX:x,clientY:100,button:0,isPrimary:true,pointerType:'touch'
  }));
  const click=()=>button.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,detail:1}));
  const size=button.getBoundingClientRect().width;
  const dots=wrap.querySelectorAll('.rb-sling-dot').length;
  const hasArc=!!wrap.querySelector('.rb-sling-arc')&&!!wrap.querySelector('.rb-sling-band--hot');
  fire('pointerdown',41,100);fire('pointerup',41,100);click();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const tapCount=calls.length;
  calls.length=0;
  fire('pointerdown',42,100);fire('pointermove',42,130);fire('pointerup',42,130);click();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const shortPullCount=calls.length;
  calls.length=0;
  fire('pointerdown',43,100);fire('pointermove',43,180);fire('pointerup',43,180);click();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const loadedPullCount=calls.length;
  calls.length=0;
  updateGenerationActionButton(true,false);
  fire('pointerdown',44,100);fire('pointermove',44,170);fire('pointerup',44,170);click();
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const busyCalls=[...calls];
  updateGenerationActionButton(false,false);
  input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
  return JSON.stringify({size,dots,hasArc,tapCount,shortPullCount,loadedPullCount,busyCalls,band:wrap.querySelector('.rb-sling-band')?.getAttribute('d')||''});
})()`));
assert.equal(sling.size,56,'Desktop Sling Button hit target must match the ReactBits default diameter');
assert.equal(sling.dots,14,'Sling Button must render the reference particle count');
assert.equal(sling.hasArc,true,'Sling Button must include its tension arc and hot band');
assert.equal(sling.tapCount,1,'Sling Button tap must send exactly once');
assert.equal(sling.shortPullCount,0,'under-threshold drag must not send');
assert.equal(sling.loadedPullCount,1,'loaded Sling Button release must send exactly once');
assert.deepEqual(sling.busyCalls,['Stop generating'],'busy Sling Button click must preserve the Stop handler');

// Upload reference regression: selected files must stay visibly represented inside the PromptBar.
const uploadChip=JSON.parse(await evaluate(`(()=>{
  selectedFilesData.splice(0,selectedFilesData.length,{
    id:'att-smoke',
    name:'Zen Injector.zip',
    originalMimeType:'application/zip',
    mimeType:'application/zip',
    size:195559424,
    lastModified:Date.now(),
    kind:'zip',
    status:'processing',
    statusText:'Preparing…',
    progressBytes:0,
    progressPercent:0,
    progressStartedAt:performance.now(),
    progressIndeterminate:false,
    extractedText:'',
    frames:[],
    data:'',
    fullData:''
  });
  renderFilePreviews();
  const host=document.getElementById('filePreviewContainer');
  const chip=host?.querySelector('.prompt-bar__chip.jd-upload-chip');
  const processing={
    hidden:host?.hidden,
    inlineDisplay:host?.style.display||'',
    visible:host?.classList.contains('is-visible')||false,
    name:chip?.querySelector('.jd-upload-chip__name')?.textContent||'',
    spinner:!!chip?.querySelector('.attachment-spinner'),
    remove:!!chip?.querySelector('.jd-upload-chip__remove')
  };

  selectedFilesData[0].status='ready';
  selectedFilesData[0].statusText='Ready';
  renderFilePreviews();
  const readyChip=host?.querySelector('.prompt-bar__chip.jd-upload-chip');
  const ready={
    spinner:!!readyChip?.querySelector('.attachment-spinner'),
    fileIcon:!!readyChip?.querySelector('[data-lucide="file"],svg'),
    name:readyChip?.querySelector('.jd-upload-chip__name')?.textContent||''
  };

  selectedFilesData.splice(0,selectedFilesData.length);
  renderFilePreviews();
  return JSON.stringify({processing,ready,emptyHidden:host?.hidden,emptyDisplay:host?.style.display||''});
})()`));
assert.equal(uploadChip.processing.hidden,false,'selected attachment host must not remain hidden');
assert.equal(uploadChip.processing.inlineDisplay,'flex','selected attachment host must be explicitly visible');
assert.equal(uploadChip.processing.visible,true,'selected attachment host must carry the visible state');
assert.equal(uploadChip.processing.name,'Zen Injector.zip','reference upload filename chip missing');
assert.equal(uploadChip.processing.spinner,true,'processing attachment must show the reference spinner');
assert.equal(uploadChip.processing.remove,true,'upload chip remove control missing');
assert.equal(uploadChip.ready.spinner,false,'ready attachment must stop showing the spinner');
assert.equal(uploadChip.ready.fileIcon,true,'ready attachment must switch to a file icon');
assert.equal(uploadChip.ready.name,'Zen Injector.zip');
assert.equal(uploadChip.emptyHidden,true,'empty attachment host must hide again');
assert.equal(uploadChip.emptyDisplay,'none','empty attachment host must not reserve PromptBar space');

// Exercise the real <input type=file> -> change -> handleFileSelect path used by mobile browsers.
const realFileInput=JSON.parse(await evaluate(`(async()=>{
  const input=document.getElementById('fileInput');
  const host=document.getElementById('filePreviewContainer');
  const file=new File(['PK\\u0003\\u0004smoke'],'Zen Injector.zip',{type:'application/zip',lastModified:Date.now()});
  const dt=new DataTransfer();
  dt.items.add(file);
  Object.defineProperty(input,'files',{configurable:true,value:dt.files});
  input.dispatchEvent(new Event('change',{bubbles:true}));

  for(let i=0;i<20;i++){
    if(host?.querySelector('.jd-upload-chip'))break;
    await new Promise(r=>setTimeout(r,25));
  }
  const chip=host?.querySelector('.jd-upload-chip');
  const during={
    chip:!!chip,
    hidden:host?.hidden,
    display:getComputedStyle(host).display,
    visibility:getComputedStyle(host).visibility,
    opacity:getComputedStyle(host).opacity,
    width:chip?.getBoundingClientRect().width||0,
    height:chip?.getBoundingClientRect().height||0,
    text:chip?.textContent||''
  };

  await new Promise(r=>setTimeout(r,200));
  selectedFilesData.splice(0,selectedFilesData.length);
  renderFilePreviews();
  return JSON.stringify(during);
})()`));
assert.equal(realFileInput.chip,true,'real file input path did not create the upload chip');
assert.equal(realFileInput.hidden,false,'real file input path left preview hidden');
assert.equal(realFileInput.display,'flex','real file input preview is not flex-visible');
assert.notEqual(realFileInput.visibility,'hidden','real file input preview is visibility:hidden');
assert.notEqual(realFileInput.opacity,'0','real file input preview is transparent');
assert(realFileInput.width>40&&realFileInput.height>=24,'real upload chip has no visible geometry');
assert(realFileInput.text.includes('Zen Injector.zip'),'real file input chip filename missing');

// Three supplied motion references: pull physics, exact scroll restoration, honest upload lanes.
const motionUx=JSON.parse(await evaluate(`(async()=>{
  const api=window.JDMotionUX;
  const host=document.getElementById('filePreviewContainer');
  const inputContainer=document.getElementById('inputContainer');
  const field=document.querySelector('#promptBar .prompt-bar__field');

  // Upload queue enhancement must stay compact while exposing honest per-file state.
  selectedFilesData.splice(0,selectedFilesData.length,{
    id:'motion-upload',
    name:'demo-recording.mp4',
    originalMimeType:'video/mp4',
    mimeType:'video/mp4',
    size:48*1024*1024,
    kind:'video',
    status:'processing',
    statusText:'Preparing…',
    progressBytes:24*1024*1024,
    progressPercent:50,
    progressStartedAt:performance.now()-2000,
    progressIndeterminate:false,
    frames:[],data:'',fullData:''
  });
  renderFilePreviews();
  const uploadLane=host?.querySelector('.jd-upload-lane');
  const upload={
    lane:!!uploadLane,
    meta:uploadLane?.querySelector('.jd-upload-lane__meta')?.textContent||'',
    status:uploadLane?.querySelector('.jd-upload-lane__status')?.textContent||'',
    progress:!!uploadLane?.querySelector('.jd-upload-lane__progress'),
    thumb:!!uploadLane?.querySelector('.jd-upload-lane__thumb'),
    width:uploadLane?.getBoundingClientRect().width||0
  };
  inputContainer?.classList.add('attachment-drop-active');
  const dropContent=field?getComputedStyle(field,'::after').content:'';
  inputContainer?.classList.remove('attachment-drop-active');

  // Pull-to-refresh should be a compact icon revealed by elastic pull, not a text pill.
  const pullLow=api.setPull(40);
  const pullHigh=api.setPull(110);
  const indicator=document.getElementById('jdPullRefresh');
  const pull={
    lowArmed:pullLow.armed,
    highArmed:pullHigh.armed,
    visible:indicator?.classList.contains('visible')||false,
    armed:indicator?.classList.contains('armed')||false,
    label:indicator?.getAttribute('aria-label')||'',
    arrow:!!indicator?.querySelector('.jd-pull-refresh__arrow'),
    visibleText:String(indicator?.textContent||'').trim()
  };
  api.settlePull();
  await new Promise(r=>setTimeout(r,420));

  // Exact scroll-state restoration with a stable message anchor.
  const chat=document.getElementById('chatBox');
  const original=chat.innerHTML;
  chat.innerHTML='<button class="floating-scroll-pill" id="scrollPill"><span class="latest-label">Latest</span><span class="unread-badge" id="unreadBadge" style="display:none;">0</span></button><div class="msg bot" data-message-index="1" style="height:520px">A</div><div class="msg bot" data-message-index="2" style="height:520px">B</div><div class="msg bot" data-message-index="3" style="height:520px">C</div>';
  api.decorateScrollAnchors();
  const anchorBefore=chat.querySelectorAll('.msg')[1]?.dataset?.jdScrollAnchor||'';
  chat.scrollTop=610;
  api.captureScroll('browser-smoke');
  const savedTop=chat.scrollTop;
  chat.scrollTop=0;
  api.restoreScroll('browser-smoke');
  await new Promise(r=>setTimeout(r,760));
  const restoredTop=chat.scrollTop;
  const anchorAfter=chat.querySelectorAll('.msg')[1]?.dataset?.jdScrollAnchor||'';
  chat.innerHTML=original;

  selectedFilesData.splice(0,selectedFilesData.length);
  renderFilePreviews();

  return JSON.stringify({
    version:api.version,
    upload,
    dropContent,
    pull,
    savedTop,
    restoredTop,
    anchorBefore,
    anchorAfter,
    manual:history.scrollRestoration
  });
})()`));

assert.equal(motionUx.version,'2026-09-27-three-reference-v2','three-reference motion v2 runtime missing');
assert.equal(motionUx.upload.lane,true,'per-file upload lane did not render');
assert.equal(motionUx.upload.progress,true,'per-file upload progress lane missing');
assert.equal(motionUx.upload.thumb,true,'upload visual proof/thumbnail slot missing');
assert(motionUx.upload.meta.includes('MP4')&&motionUx.upload.meta.includes('MB'),'upload lane must expose type and size');
assert(motionUx.upload.status.includes('50%'),'measurable upload preparation must expose honest percent progress');
assert(motionUx.upload.width>120&&motionUx.upload.width<=260,'upload lane should remain compact inside PromptBar');
assert(String(motionUx.dropContent).includes('Release to add files'),'drag/release feedback is not visible');
assert.equal(motionUx.pull.lowArmed,false,'pull threshold armed too early');
assert.equal(motionUx.pull.highArmed,true,'pull threshold did not arm');
assert.equal(motionUx.pull.visible,true);
assert.equal(motionUx.pull.armed,true);
assert.equal(motionUx.pull.arrow,true,'pull affordance arrow missing');
assert.equal(motionUx.pull.visibleText,'','pull affordance must not render the old text pill');
assert.equal(motionUx.pull.label,'Release to refresh','pull affordance accessibility state did not update');
assert(motionUx.anchorBefore&&motionUx.anchorBefore===motionUx.anchorAfter,'stable scroll anchor changed across restore');
assert(Math.abs(motionUx.restoredTop-motionUx.savedTop)<5,'chat scroll position did not restore exactly');
assert.equal(motionUx.manual,'manual','browser scroll restoration must be manual');

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

const voiceEntryTap=JSON.parse(await evaluate(`(async()=>{
  const action=document.getElementById('mainActionBtn');
  const oldSpeak=window.speakSmartVoice;
  const oldSR=window.SpeechRecognition,oldWebkitSR=window.webkitSpeechRecognition;
  window.speakSmartVoice=()=>{};
  window.SpeechRecognition=function(){this.start=()=>{};this.abort=()=>{};this.stop=()=>{};};
  action.click();
  await new Promise(r=>setTimeout(r,30));
  const opened=!!window.JDVoiceMode?.isOpen()&&!document.getElementById('jdVoiceMode')?.hasAttribute('hidden');
  window.JDVoiceMode?.close();
  window.speakSmartVoice=oldSpeak;
  if(oldSR===undefined)delete window.SpeechRecognition;else window.SpeechRecognition=oldSR;
  if(oldWebkitSR===undefined)delete window.webkitSpeechRecognition;else window.webkitSpeechRecognition=oldWebkitSR;
  return JSON.stringify({opened});
})()`));
assert.equal(voiceEntryTap.opened,true,'tapping the waveform voice action must open voice mode');

await sleep(250);
assert.deepEqual(runtimeErrors,[],'browser runtime exceptions: '+runtimeErrors.join(' | '));
assert.deepEqual(consoleErrors,[],'ReactBits runtime console errors: '+consoleErrors.join(' | '));

ws.close();
console.log('PASS: headless Chrome ReactBits 6/6 runtime smoke');
