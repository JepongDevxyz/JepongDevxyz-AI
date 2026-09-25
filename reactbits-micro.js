/* JepongDevxyz AI — ReactBits micro runtime.
   Targeted adapters only; no page-wide mutation loop. */
(function(){
  'use strict';

  var doc=document;
  var voiceTimer=null;
  var voiceStartedAt=0;
  var switchObserver=null;

  function directCheckbox(host){
    if(!host||!host.children)return null;
    for(var i=0;i<host.children.length;i++){
      var child=host.children[i];
      if(child&&child.tagName==='INPUT'&&child.type==='checkbox')return child;
    }
    return null;
  }

  function dispatchChange(input){
    input.dispatchEvent(new Event('change',{bubbles:true}));
  }

  /* BellToggle */
  function syncBell(){
    var root=doc.getElementById('replyBellToggle');
    var input=doc.getElementById('settingsNotifyToggle');
    if(!root||!input)return;
    var on=!!input.checked;
    root.dataset.on=String(on);
    root.setAttribute('aria-pressed',String(on));
    var button=root.querySelector('.bell-toggle__button');
    if(button){
      button.disabled=!!input.disabled;
      button.setAttribute('aria-pressed',String(on));
    }
  }

  function ringBell(root){
    if(!root)return;
    root.classList.remove('rb-ring');
    void root.offsetWidth;
    root.classList.add('rb-ring');
    setTimeout(function(){root.classList.remove('rb-ring');},850);
  }

  function toggleBell(){
    var root=doc.getElementById('replyBellToggle');
    var input=doc.getElementById('settingsNotifyToggle');
    if(!root||!input||input.disabled)return;
    input.checked=!input.checked;
    dispatchChange(input);
    syncBell();
    if(input.checked)ringBell(root);
  }

  function bindBell(){
    var root=doc.getElementById('replyBellToggle');
    var input=doc.getElementById('settingsNotifyToggle');
    var button=root&&root.querySelector('.bell-toggle__button');
    if(!root||!input||!button||root.dataset.rbBound==='1')return;
    root.dataset.rbBound='1';
    button.addEventListener('pointerdown',function(){root.dataset.pressed='';});
    ['pointerup','pointercancel','pointerleave'].forEach(function(type){
      button.addEventListener(type,function(){delete root.dataset.pressed;});
    });
    button.addEventListener('click',toggleBell);
    input.addEventListener('change',syncBell);
    syncBell();
  }

  /* PromptBar */
  function syncPrompt(){
    var bar=doc.getElementById('promptBar');
    var input=doc.getElementById('userInput');
    var action=doc.getElementById('mainActionBtn');
    if(!bar||!input||!action)return;
    var busy=action.classList.contains('generating')||/stop/i.test(action.title||'');
    bar.dataset.busy=String(busy);
    bar.dataset.models='false';
    bar.dataset.hasText=String(!!String(input.value||'').trim());
  }

  function bindPrompt(){
    var bar=doc.getElementById('promptBar');
    var input=doc.getElementById('userInput');
    var action=doc.getElementById('mainActionBtn');
    if(!bar||!input||!action||bar.dataset.rbBound==='1')return;
    bar.dataset.rbBound='1';
    input.addEventListener('input',syncPrompt);
    new MutationObserver(syncPrompt).observe(action,{
      attributes:true,childList:true,subtree:true,
      attributeFilter:['class','title','aria-label']
    });
    syncPrompt();
  }

  function setPromptBusy(active,stopping){
    var bar=doc.getElementById('promptBar');
    if(bar){
      bar.dataset.busy=String(!!active);
      bar.dataset.stopping=String(!!stopping);
    }
  }

  /* SquishSwitch */
  function switchMetrics(root){
    var track=root.querySelector(':scope > span:last-child');
    if(!track)return null;
    var rect=track.getBoundingClientRect();
    var style=getComputedStyle(root);
    var inset=parseFloat(style.getPropertyValue('--ss-inset'))||3;
    var thumb=parseFloat(style.getPropertyValue('--ss-thumb'))||22;
    return {track:track,rect:rect,inset:inset,thumb:thumb,max:Math.max(0,rect.width-inset*2-thumb)};
  }

  function paintSwitch(root,input,dragX){
    if(!root||!input)return;
    var m=switchMetrics(root);
    if(!m)return;
    var x=dragX;
    if(x==null)x=input.checked?m.max:0;
    x=Math.max(0,Math.min(m.max,x));
    root.style.setProperty('--ss-x',x+'px');
    root.dataset.on=String(!!input.checked);
  }

  function bindSquish(root){
    if(!root||root.dataset.rbBound==='1')return;
    var input=directCheckbox(root);
    if(!input)return;
    root.dataset.rbBound='1';

    var state=null;
    input.addEventListener('change',function(){paintSwitch(root,input,null);});
    paintSwitch(root,input,null);

    root.addEventListener('pointerdown',function(e){
      if(input.disabled||e.button!==0)return;
      var m=switchMetrics(root); if(!m)return;
      state={id:e.pointerId,start:e.clientX,base:input.checked?m.max:0,moved:false,max:m.max};
      root.dataset.held='';
      root.style.setProperty('--ss-sx','1.08');
      root.style.setProperty('--ss-sy','.93');
      try{root.setPointerCapture(e.pointerId);}catch(_){}
    });

    root.addEventListener('pointermove',function(e){
      if(!state||state.id!==e.pointerId)return;
      var dx=e.clientX-state.start;
      if(Math.abs(dx)>5)state.moved=true;
      if(!state.moved)return;
      var x=Math.max(0,Math.min(state.max,state.base+dx));
      paintSwitch(root,input,x);
      var next=x>state.max/2;
      if(next!==input.checked){
        input.checked=next;
        dispatchChange(input);
      }
    });

    function end(e,cancelled){
      if(!state||state.id!==e.pointerId)return;
      var old=state; state=null;
      delete root.dataset.held;
      root.style.setProperty('--ss-sx','1');
      root.style.setProperty('--ss-sy','1');
      try{root.releasePointerCapture(e.pointerId);}catch(_){}
      if(cancelled){
        paintSwitch(root,input,null);
        return;
      }
      if(!old.moved){
        input.checked=!input.checked;
        dispatchChange(input);
      }
      paintSwitch(root,input,null);
    }

    root.addEventListener('pointerup',function(e){end(e,false);});
    root.addEventListener('pointercancel',function(e){end(e,true);});
  }

  function hydrateSquish(scope){
    var root=scope&&scope.querySelectorAll?scope:doc;
    if(scope&&scope.nodeType===1&&scope.matches&&scope.matches('.squish-switch-root'))bindSquish(scope);
    root.querySelectorAll&&root.querySelectorAll('.squish-switch-root').forEach(bindSquish);
  }

  function watchDynamicSwitches(){
    if(switchObserver||!doc.body)return;
    switchObserver=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node&&node.nodeType===1)hydrateSquish(node);
        });
      });
    });
    switchObserver.observe(doc.body,{childList:true,subtree:true});
  }

  /* VoicePill */
  function formatClock(ms){
    var s=Math.max(0,Math.floor(ms/1000));
    return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  }

  function stopVoiceTimer(){
    if(voiceTimer){cancelAnimationFrame(voiceTimer);voiceTimer=null;}
  }

  function tickVoice(){
    var mic=doc.getElementById('micBtn');
    if(!mic||mic.dataset.state!=='listening'){stopVoiceTimer();return;}
    var time=mic.querySelector('.voice-pill__time');
    if(time)time.textContent=formatClock(Date.now()-voiceStartedAt);
    voiceTimer=requestAnimationFrame(tickVoice);
  }

  function syncVoice(){
    var mic=doc.getElementById('micBtn');
    if(!mic)return;
    var active=mic.classList.contains('recording')||mic.getAttribute('aria-pressed')==='true';
    var next=active?'listening':'idle';
    if(mic.dataset.state!==next)mic.dataset.state=next;
    if(active&&!voiceTimer){
      voiceStartedAt=Date.now();
      voiceTimer=requestAnimationFrame(tickVoice);
    }else if(!active){
      stopVoiceTimer();
      var time=mic.querySelector('.voice-pill__time');
      if(time)time.textContent='0:00';
    }
  }

  function syncReadAloud(){
    var player=doc.getElementById('speechMiniPlayer');
    if(!player)return;
    player.dataset.state=player.classList.contains('visible')?'listening':'idle';
  }

  function bindVoice(){
    var mic=doc.getElementById('micBtn');
    if(mic&&mic.dataset.rbBound!=='1'){
      mic.dataset.rbBound='1';
      new MutationObserver(syncVoice).observe(mic,{attributes:true,attributeFilter:['class','aria-pressed']});
    }
    var player=doc.getElementById('speechMiniPlayer');
    if(player&&player.dataset.rbBound!=='1'){
      player.dataset.rbBound='1';
      new MutationObserver(syncReadAloud).observe(player,{attributes:true,attributeFilter:['class','aria-hidden']});
    }
    syncVoice();
    syncReadAloud();
  }

  /* RefineFrame */
  function initRefineFrame(frame){
    if(!frame||frame.dataset.rbBound==='1')return;
    frame.dataset.rbBound='1';
    frame.classList.add('rb-enter');
    setTimeout(function(){frame.classList.remove('rb-enter');},800);
    setTimeout(function(){frame.classList.add('rb-chip-hidden');},2000);
  }

  function hydrateRefine(scope){
    var root=scope&&scope.querySelectorAll?scope:doc;
    if(scope&&scope.nodeType===1&&scope.matches&&scope.matches('.refine-frame'))initRefineFrame(scope);
    root.querySelectorAll&&root.querySelectorAll('.refine-frame').forEach(initRefineFrame);
  }

  function start(){
    bindBell();
    bindPrompt();
    hydrateSquish(doc);
    bindVoice();
    hydrateRefine(doc);
    watchDynamicSwitches();

    var dynamic=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(!node||node.nodeType!==1)return;
          hydrateRefine(node);
          if(node.matches&&node.matches('#replyBellToggle'))bindBell();
          if(node.matches&&node.matches('#promptBar'))bindPrompt();
          if(node.matches&&node.matches('#micBtn,#speechMiniPlayer'))bindVoice();
        });
      });
    });
    if(doc.body)dynamic.observe(doc.body,{childList:true,subtree:true});

    window.__JD_REACTBITS_MICRO_READY__=true;
  }

  window.JDReactBits={
    syncBell:syncBell,
    toggleBell:toggleBell,
    ringBell:ringBell,
    syncPrompt:syncPrompt,
    setPromptBusy:setPromptBusy,
    syncVoice:syncVoice,
    syncReadAloud:syncReadAloud,
    hydrateSquish:hydrateSquish,
    hydrateRefine:hydrateRefine
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',function(){setTimeout(start,0);},{once:true});
  else setTimeout(start,0);
})();