/* JepongDevxyz AI — ReactBits micro runtime.
   Targeted adapters only; no page-wide mutation loop. */
(function(){
  'use strict';

  var doc=document;
  var voiceTimer=null;
  var voiceStartedAt=0;

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
    var hasText=!!String(input.value||'').trim();
    var hasFiles=!!doc.querySelector('#filePreviewContainer > *');
    var armed=busy||hasText||hasFiles;
    var plus=doc.getElementById('composerPlusBtn');
    var effort=doc.getElementById('responseEffortBtn');
    var effortLabel=doc.getElementById('responseEffortLabel');
    var field=bar.querySelector('.prompt-bar__field');

    bar.dataset.busy=String(busy);
    bar.dataset.models='false';
    bar.dataset.hasText=String(hasText);
    if(armed)action.setAttribute('data-armed','');
    else action.removeAttribute('data-armed');

    if(plus){
      if(plus.getAttribute('aria-expanded')==='true')plus.setAttribute('data-on','');
      else plus.removeAttribute('data-on');
    }
    if(effort){
      if(effort.getAttribute('aria-expanded')==='true')effort.setAttribute('data-on','');
      else effort.removeAttribute('data-on');
    }
    var maxed=String(effortLabel?.textContent||'').trim().toLowerCase()==='high';
    if(maxed){
      bar.setAttribute('data-max','');
      field?.setAttribute('data-max','');
      effort?.setAttribute('data-max','');
    }else{
      bar.removeAttribute('data-max');
      field?.removeAttribute('data-max');
      effort?.removeAttribute('data-max');
    }
  }

  function bindPrompt(){
    var bar=doc.getElementById('promptBar');
    var input=doc.getElementById('userInput');
    var action=doc.getElementById('mainActionBtn');
    var plus=doc.getElementById('composerPlusBtn');
    var effort=doc.getElementById('responseEffortBtn');
    var effortLabel=doc.getElementById('responseEffortLabel');
    if(!bar||!input||!action||bar.dataset.rbBound==='1')return;
    bar.dataset.rbBound='1';
    input.addEventListener('input',syncPrompt);
    var promptObserver=new MutationObserver(syncPrompt);
    promptObserver.observe(action,{
      attributes:true,childList:true,subtree:true,
      attributeFilter:['class','title','aria-label']
    });
    if(plus)promptObserver.observe(plus,{attributes:true,attributeFilter:['aria-expanded']});
    if(effort)promptObserver.observe(effort,{attributes:true,attributeFilter:['aria-expanded']});
    if(effortLabel)promptObserver.observe(effortLabel,{childList:true,characterData:true,subtree:true});
    var preview=doc.getElementById('filePreviewContainer');
    if(preview)promptObserver.observe(preview,{childList:true});
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
    var track=null;
    for(var i=root.children.length-1;i>=0;i--){
      var child=root.children[i];
      if(child&&child.tagName==='SPAN'){track=child;break;}
    }
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
    var suppressClick=false;
    input.addEventListener('change',function(){paintSwitch(root,input,null);});
    root.addEventListener('click',function(e){
      if(suppressClick){
        suppressClick=false;
        e.preventDefault();
        e.stopPropagation();
      }
    });
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
        suppressClick=old.moved;
        paintSwitch(root,input,null);
        return;
      }
      if(old.moved){
        suppressClick=true;
      }else if(root.tagName!=='LABEL'){
        input.checked=!input.checked;
        dispatchChange(input);
        suppressClick=true;
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

  /* VoicePill — ReactBits auto mode:
     quick tap toggles dictation; hold >=300ms records until release;
     slide left 64px cancels. */
  var voiceGesture=null;
  var VOICE_HOLD_AFTER=300;
  var VOICE_CANCEL_DISTANCE=64;
  var VOICE_SLIDE_MIN=4;

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
    var starting=mic.dataset.state==='starting';
    var next=active?'listening':starting?'starting':'idle';
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

  function settleVoiceSlide(mic){
    if(!mic)return;
    delete mic.dataset.sliding;
    mic.style.setProperty('--vp-slide','0px');
    mic.style.setProperty('--vp-cancel','0');
  }

  function voicePointerDown(e){
    var mic=e.currentTarget;
    if(e.button!==0||e.isPrimary===false||voiceGesture)return;
    var already=mic.dataset.state==='listening'||mic.dataset.state==='starting'||mic.getAttribute('aria-pressed')==='true';
    voiceGesture={
      id:e.pointerId,
      downX:e.clientX,
      downAt:performance.now(),
      ownPress:!already,
      sliding:false,
      cancelled:false
    };
    mic.setAttribute('data-pressed','');
    mic.dataset.input='pointer';
    try{mic.setPointerCapture(e.pointerId);}catch(_){}
    if(!already)window.startSpeechRecognition?.();
  }

  function voicePointerMove(e){
    var mic=e.currentTarget;
    var g=voiceGesture;
    if(!g||g.id!==e.pointerId||!g.ownPress||g.cancelled)return;
    var dx=e.clientX-g.downX;
    if(!g.sliding&&dx>-VOICE_SLIDE_MIN)return;
    g.sliding=true;
    mic.setAttribute('data-sliding','');
    var pull=Math.min(VOICE_CANCEL_DISTANCE+24,Math.max(0,-dx));
    mic.style.setProperty('--vp-slide',(-pull)+'px');
    var progress=Math.min(1,pull/VOICE_CANCEL_DISTANCE);
    mic.style.setProperty('--vp-cancel',progress.toFixed(3));
    if(progress>=1){
      g.cancelled=true;
      settleVoiceSlide(mic);
      window.stopSpeechRecognition?.('cancel');
    }
  }

  function voicePointerEnd(e,cancelled){
    var mic=e.currentTarget;
    var g=voiceGesture;
    if(!g||g.id!==e.pointerId)return;
    voiceGesture=null;
    mic.removeAttribute('data-pressed');
    if(g.sliding)settleVoiceSlide(mic);
    try{
      if(mic.hasPointerCapture?.(e.pointerId))mic.releasePointerCapture(e.pointerId);
    }catch(_){}
    if(g.cancelled)return;
    if(cancelled){
      if(g.ownPress)window.stopSpeechRecognition?.('cancel');
      return;
    }

    var held=performance.now()-g.downAt;
    var isHold=held>=Number(mic.dataset.holdAfter||VOICE_HOLD_AFTER);
    if(g.ownPress){
      // Exact ReactBits auto behavior:
      // short tap starts and stays listening; hold stops on release.
      if(isHold)window.stopSpeechRecognition?.('release');
    }else{
      // A press that began while already listening stops it.
      window.stopSpeechRecognition?.(isHold?'release':'tap');
    }
  }

  function voiceKeyDown(e){
    if(e.key==='Escape'){
      e.preventDefault();
      window.stopSpeechRecognition?.('escape');
      return;
    }
    if((e.key===' '||e.key==='Enter')&&!e.repeat){
      e.preventDefault();
      window.toggleSpeechRecognition?.();
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
      mic.dataset.mode='auto';
      mic.dataset.holdAfter=String(VOICE_HOLD_AFTER);
      mic.addEventListener('pointerdown',voicePointerDown);
      mic.addEventListener('pointermove',voicePointerMove);
      mic.addEventListener('pointerup',function(e){voicePointerEnd(e,false);});
      mic.addEventListener('pointercancel',function(e){voicePointerEnd(e,true);});
      mic.addEventListener('lostpointercapture',function(e){
        if(voiceGesture&&voiceGesture.id===e.pointerId)voicePointerEnd(e,false);
      });
      mic.addEventListener('keydown',voiceKeyDown);
      mic.addEventListener('click',function(e){
        // Pointer gestures are handled above. Keep keyboard/synthetic clicks accessible.
        if(e.detail===0&&!voiceGesture)window.toggleSpeechRecognition?.();
      });
      mic.addEventListener('contextmenu',function(e){e.preventDefault();});
      new MutationObserver(syncVoice).observe(mic,{attributes:true,attributeFilter:['class','aria-pressed','data-state']});
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
    var dynamic=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(!node||node.nodeType!==1)return;
          hydrateRefine(node);
          hydrateSquish(node);
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