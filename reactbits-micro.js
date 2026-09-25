/* JepongDevxyz AI — ReactBits-inspired micro interaction bridge.
   No React runtime is added. Existing handlers remain the single source of truth.
   Startup-safe revision: DOM upgrades are batched after paint to avoid mutation storms. */
(function(){
  'use strict';

  var doc=document;
  var timers=new WeakMap();
  var activityObservers=new WeakMap();
  var pendingScopes=new Set();
  var flushScheduled=false;

  function safe(fn){
    try{return fn();}
    catch(err){console.error('[JepongDevxyz micro]',err);}
  }

  function setData(node,key,value){
    if(!node)return;
    var next=String(value);
    if(node.dataset[key]!==next)node.dataset[key]=next;
  }

  function el(tag,className,html){
    var node=doc.createElement(tag);
    if(className)node.className=className;
    if(html!==undefined)node.innerHTML=html;
    return node;
  }

  function lattice(){
    var root=el('span','rb-lattice');
    root.setAttribute('aria-hidden','true');
    root.dataset.status='working';
    for(var i=0;i<9;i++)root.appendChild(doc.createElement('i'));
    return root;
  }

  function syncActivity(card){
    if(!card)return;
    var grid=card.querySelector('.rb-lattice');
    var status=card.classList.contains('error')?'error':
      (card.classList.contains('complete')||card.dataset.finalized==='true')?'done':'working';

    if(grid&&grid.dataset.status!==status)grid.dataset.status=status;

    var head=card.querySelector('.ai-activity-summary-row');
    if(head){
      if(!head.classList.contains('rb-thought-line'))head.classList.add('rb-thought-line');
      setData(head,'working',status==='working');
    }

    var list=card.querySelector('.ai-activity-list');
    if(list&&!list.classList.contains('rb-thought-steps'))list.classList.add('rb-thought-steps');
  }

  function upgradeActivity(card){
    if(!card)return;
    if(card.dataset.rbActivity!=='1'){
      card.dataset.rbActivity='1';
      if(!card.classList.contains('rb-activity'))card.classList.add('rb-activity');

      var head=card.querySelector('.ai-activity-summary-row');
      if(head&&!head.querySelector('.rb-lattice')){
        var grid=lattice();
        var icon=head.querySelector('.ai-activity-summary-icon');
        if(icon)head.insertBefore(grid,icon);
        else head.insertBefore(grid,head.firstChild);
      }

      if(!activityObservers.has(card)){
        var mo=new MutationObserver(function(){safe(function(){syncActivity(card);});});
        mo.observe(card,{attributes:true,attributeFilter:['class','data-finalized']});
        activityObservers.set(card,mo);
      }
    }
    syncActivity(card);
  }

  function bellSvg(){
    return '<span class="rb-bell-icon" aria-hidden="true">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>'+
      '<path class="rb-bell-clapper" d="M10 21h4"></path></svg><span class="rb-bell-badge">1</span></span>';
  }

  function syncBell(input,button){
    var on=!!input.checked;
    setData(button,'on',on);
    button.setAttribute('aria-pressed',String(on));
    button.disabled=!!input.disabled;
    var label=button.querySelector('.rb-bell-label');
    var next=on?"You'll be notified":'Notify me';
    if(label&&label.textContent!==next)label.textContent=next;
  }

  function upgradeBell(){
    var input=doc.getElementById('settingsNotifyToggle');
    if(!input||input.dataset.rbBell==='1')return;
    var host=input.closest('.jd-reply-notify-switch')||input.parentElement;
    if(!host)return;

    input.dataset.rbBell='1';
    host.classList.add('rb-bell-host');
    host.classList.remove('rb-squish-host');

    var button=el('button','rb-bell-toggle',bellSvg()+'<span class="rb-bell-label"></span>');
    button.type='button';
    button.setAttribute('aria-label','Reply notifications');
    button.addEventListener('click',function(){
      if(input.disabled)return;
      input.checked=!input.checked;
      input.dispatchEvent(new Event('change',{bubbles:true}));
      button.classList.remove('rb-ring');
      void button.offsetWidth;
      button.classList.add('rb-ring');
      setTimeout(function(){button.classList.remove('rb-ring');syncBell(input,button);},850);
      setTimeout(function(){syncBell(input,button);},80);
      setTimeout(function(){syncBell(input,button);},650);
    });
    input.addEventListener('change',function(){syncBell(input,button);});
    host.appendChild(button);
    syncBell(input,button);
  }

  function upgradePromptBar(){
    var bar=doc.querySelector('.chat-input-pill');
    var input=doc.getElementById('userInput');
    var action=doc.getElementById('mainActionBtn');
    if(!bar||!input||!action)return;

    bar.classList.add('rb-prompt-bar');
    setData(bar,'rbModels','false');

    function sync(){
      var busy=action.classList.contains('generating')||/stop/i.test(action.title||'');
      setData(bar,'busy',busy);
      setData(bar,'hasText',!!input.value.trim());
    }

    if(bar.dataset.rbPrompt!=='1'){
      bar.dataset.rbPrompt='1';
      input.addEventListener('input',sync);
      var mo=new MutationObserver(sync);
      mo.observe(action,{
        attributes:true,
        childList:true,
        subtree:true,
        attributeFilter:['class','title','aria-label']
      });
    }
    sync();
  }

  function tickVoiceTime(button){
    var state=timers.get(button);
    if(!state)return;
    var target=button.querySelector('.rb-vp-time');
    if(target){
      var sec=Math.max(0,Math.floor((Date.now()-state.started)/1000));
      target.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');
    }
    state.id=requestAnimationFrame(function(){tickVoiceTime(button);});
  }

  function syncMic(button){
    if(!button)return;
    var active=button.classList.contains('recording')||button.getAttribute('aria-pressed')==='true';
    var state=timers.get(button);
    if(active&&!state){
      state={started:Date.now(),id:0};
      timers.set(button,state);
      tickVoiceTime(button);
    }else if(!active&&state){
      cancelAnimationFrame(state.id);
      timers.delete(button);
      var time=button.querySelector('.rb-vp-time');
      if(time)time.textContent='0:00';
    }
  }

  function upgradeMic(){
    var button=doc.getElementById('micBtn');
    if(!button||button.dataset.rbVoice==='1')return;
    button.dataset.rbVoice='1';
    button.classList.add('rb-voice-pill');

    var wave=el('span','rb-vp-wave','<i></i><i></i><i></i><i></i><i></i>');
    var time=el('span','rb-vp-time','0:00');
    var stop=el('span','rb-vp-stop');
    wave.setAttribute('aria-hidden','true');
    time.setAttribute('aria-hidden','true');
    stop.setAttribute('aria-hidden','true');
    button.appendChild(wave);
    button.appendChild(time);
    button.appendChild(stop);

    var mo=new MutationObserver(function(){syncMic(button);});
    mo.observe(button,{attributes:true,attributeFilter:['class','aria-pressed']});
    syncMic(button);
  }

  function upgradeReadAloud(){
    var player=doc.getElementById('speechMiniPlayer');
    if(player&&!player.classList.contains('rb-read-voice-pill'))player.classList.add('rb-read-voice-pill');
  }

  function directCheckbox(host){
    if(!host||!host.children)return null;
    for(var i=0;i<host.children.length;i++){
      var child=host.children[i];
      if(child&&child.tagName==='INPUT'&&child.type==='checkbox')return child;
    }
    return null;
  }

  function upgradeSquishHost(host){
    if(!host)return;
    var input=directCheckbox(host);
    if(!input||input.id==='settingsNotifyToggle')return;
    host.classList.add('rb-squish-host');

    var visual=input.nextElementSibling;
    if(!visual||visual.tagName==='INPUT'){
      visual=el('span','rb-squish-track');
      input.insertAdjacentElement('afterend',visual);
    }
  }

  function upgradeSquish(scope){
    var selector='label.ios-switch,label.mini-toggle,.jd-haptics-switch,.jd-reply-notify-switch,.ps-pet-behavior-toggle';
    if(scope&&scope.nodeType===1&&scope.matches&&scope.matches(selector))upgradeSquishHost(scope);
    var root=scope&&scope.querySelectorAll?scope:doc;
    root.querySelectorAll(selector).forEach(upgradeSquishHost);
  }

  function refineImage(img){
    if(!img||img.dataset.rbRefined==='1'||img.closest('.rb-refine-frame'))return;
    if(img.getAttribute('alt')!=='Generated artwork')return;

    img.dataset.rbRefined='1';
    var frame=el('div','rb-refine-frame rb-enter');
    frame.dataset.status='complete';
    frame.setAttribute('role','img');
    frame.setAttribute('aria-label','Generated image ready');
    if(!img.parentNode)return;
    img.parentNode.insertBefore(frame,img);
    frame.appendChild(img);

    var chip=el('span','rb-refine-chip',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg><span>Ready</span>');
    frame.appendChild(chip);
    setTimeout(function(){frame.classList.remove('rb-enter');},850);
  }

  function upgradeImages(scope){
    if(scope&&scope.nodeType===1&&scope.matches&&scope.matches('img[alt="Generated artwork"]'))refineImage(scope);
    var root=scope&&scope.querySelectorAll?scope:doc;
    root.querySelectorAll('img[alt="Generated artwork"]').forEach(refineImage);
  }

  function upgradeActivities(scope){
    if(scope&&scope.nodeType===1&&scope.matches&&scope.matches('.ai-activity-card'))upgradeActivity(scope);
    var root=scope&&scope.querySelectorAll?scope:doc;
    root.querySelectorAll('.ai-activity-card').forEach(upgradeActivity);
  }

  function upgradeAll(scope){
    upgradeActivities(scope);
    upgradeImages(scope);
    upgradeSquish(scope);

    if(scope===doc||!scope||scope.nodeType===9||
       (scope.querySelector&&(
         scope.querySelector('#settingsNotifyToggle')||
         scope.querySelector('.chat-input-pill')||
         scope.querySelector('#micBtn')||
         scope.querySelector('#speechMiniPlayer')
       ))){
      upgradeBell();
      upgradePromptBar();
      upgradeMic();
      upgradeReadAloud();
    }
  }

  function flushPending(){
    flushScheduled=false;
    var batch=Array.from(pendingScopes);
    pendingScopes.clear();
    batch.forEach(function(scope){safe(function(){upgradeAll(scope);});});
  }

  function schedule(scope){
    if(scope)pendingScopes.add(scope);
    if(flushScheduled)return;
    flushScheduled=true;
    if(typeof requestAnimationFrame==='function')requestAnimationFrame(flushPending);
    else setTimeout(flushPending,16);
  }

  function start(){
    var root=doc.body||doc.documentElement;
    if(!root)return;

    schedule(doc);

    var observer=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node&&node.nodeType===1)schedule(node);
        });
      });
    });
    observer.observe(root,{childList:true,subtree:true});
    window.__JD_REACTBITS_MICRO_READY__=true;
  }

  function queueStart(){
    setTimeout(function(){safe(start);},0);
  }

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',queueStart,{once:true});
  else queueStart();
})();