/* JepongDevxyz AI — ReactBits-inspired micro interaction bridge.
   No React runtime is added. Existing handlers remain the single source of truth. */
(function(){
  'use strict';

  var doc=document;
  var timers=new WeakMap();

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
    if(!grid)return;
    var status=card.classList.contains('error')?'error':
      (card.classList.contains('complete')||card.dataset.finalized==='true')?'done':'working';
    grid.dataset.status=status;
    var head=card.querySelector('.ai-activity-summary-row');
    if(head){
      head.classList.add('rb-thought-line');
      head.dataset.working=status==='working'?'true':'false';
    }
    var list=card.querySelector('.ai-activity-list');
    if(list)list.classList.add('rb-thought-steps');
  }

  function upgradeActivity(card){
    if(!card||card.dataset.rbActivity==='1')return;
    card.dataset.rbActivity='1';
    card.classList.add('rb-activity');
    var head=card.querySelector('.ai-activity-summary-row');
    if(head&&!head.querySelector('.rb-lattice')){
      var grid=lattice();
      var icon=head.querySelector('.ai-activity-summary-icon');
      if(icon)head.insertBefore(grid,icon);
      else head.insertBefore(grid,head.firstChild);
    }
    syncActivity(card);
    var mo=new MutationObserver(function(){syncActivity(card);});
    mo.observe(card,{attributes:true,attributeFilter:['class','data-finalized'],childList:true,subtree:true});
  }

  function bellSvg(){
    return '<span class="rb-bell-icon" aria-hidden="true">'+
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+
      '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path>'+
      '<path class="rb-bell-clapper" d="M10 21h4"></path></svg><span class="rb-bell-badge">1</span></span>';
  }

  function syncBell(input,button){
    var on=!!input.checked;
    button.dataset.on=String(on);
    button.setAttribute('aria-pressed',String(on));
    button.disabled=!!input.disabled;
    var label=button.querySelector('.rb-bell-label');
    if(label)label.textContent=on?"You'll be notified":'Notify me';
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
    bar.dataset.rbModels='false';

    function sync(){
      var busy=action.classList.contains('generating')||/stop/i.test(action.title||'');
      bar.dataset.busy=String(busy);
      bar.dataset.hasText=String(!!input.value.trim());
    }
    if(bar.dataset.rbPrompt!=='1'){
      bar.dataset.rbPrompt='1';
      input.addEventListener('input',sync);
      var mo=new MutationObserver(sync);
      mo.observe(action,{attributes:true,childList:true,subtree:true,attributeFilter:['class','title','aria-label']});
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
    if(!player)return;
    player.classList.add('rb-read-voice-pill');
  }

  function upgradeSquish(){
    var selectors=['label.ios-switch','label.mini-toggle','.jd-haptics-switch','.jd-reply-notify-switch','.ps-pet-behavior-toggle'];
    doc.querySelectorAll(selectors.join(',')).forEach(function(host){
      var input=host.querySelector(':scope > input[type="checkbox"]');
      if(!input||input.id==='settingsNotifyToggle')return;
      host.classList.add('rb-squish-host');
      var visual=input.nextElementSibling;
      if(!visual||visual.tagName==='INPUT'){
        visual=el('span','rb-squish-track');
        input.insertAdjacentElement('afterend',visual);
      }
    });
  }

  function refineImage(img){
    if(!img||img.dataset.rbRefined==='1'||img.closest('.rb-refine-frame'))return;
    if(img.getAttribute('alt')!=='Generated artwork')return;
    img.dataset.rbRefined='1';
    var frame=el('div','rb-refine-frame rb-enter');
    frame.dataset.status='complete';
    frame.setAttribute('role','img');
    frame.setAttribute('aria-label','Generated image ready');
    img.parentNode.insertBefore(frame,img);
    frame.appendChild(img);
    var chip=el('span','rb-refine-chip',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg><span>Ready</span>');
    frame.appendChild(chip);
    setTimeout(function(){frame.classList.remove('rb-enter');},850);
  }

  function upgradeImages(root){
    var scope=root&&root.querySelectorAll?root:doc;
    if(scope.matches&&scope.matches('img[alt="Generated artwork"]'))refineImage(scope);
    scope.querySelectorAll&&scope.querySelectorAll('img[alt="Generated artwork"]').forEach(refineImage);
  }

  function upgradeAll(root){
    var scope=root&&root.querySelectorAll?root:doc;
    if(scope.matches&&scope.matches('.ai-activity-card'))upgradeActivity(scope);
    scope.querySelectorAll&&scope.querySelectorAll('.ai-activity-card').forEach(upgradeActivity);
    upgradeBell();
    upgradePromptBar();
    upgradeMic();
    upgradeReadAloud();
    upgradeSquish();
    upgradeImages(scope);
  }

  function start(){
    upgradeAll(doc);
    var root=doc.body||doc.documentElement;
    if(!root)return;
    var observer=new MutationObserver(function(records){
      records.forEach(function(record){
        record.addedNodes.forEach(function(node){
          if(node.nodeType===1)upgradeAll(node);
        });
      });
      upgradeBell();
      upgradePromptBar();
      upgradeSquish();
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();