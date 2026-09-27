(()=>{
  'use strict';
  if(window.__JD_MOTION_UX_READY__)return;
  window.__JD_MOTION_UX_READY__=true;

  const doc=document;
  const SCROLL_KEY='jd_scroll_state_v2';
  const PULL_THRESHOLD=86;
  const PULL_MAX=118;
  const PULL_HOLD=52;
  let scrollStates={};
  try{scrollStates=JSON.parse(localStorage.getItem(SCROLL_KEY)||'{}')||{};}catch(_){scrollStates={};}

  const state={
    restoring:false,
    restoreToken:0,
    saveTimer:0,
    pullStartY:0,
    pullRaw:0,
    pulling:false,
    armed:false,
    refreshing:false,
    thresholdTicked:false
  };

  function box(){return doc.getElementById('chatBox');}
  function activeScrollKey(){
    try{
      if(typeof isBibleMode!=='undefined'&&isBibleMode){
        return typeof currentBibleSessionId!=='undefined'&&currentBibleSessionId?('bible:'+currentBibleSessionId):'';
      }
      if(typeof isIncognito!=='undefined'&&isIncognito){
        return typeof currentIncognitoSessionId!=='undefined'&&currentIncognitoSessionId?('incognito:'+currentIncognitoSessionId):'';
      }
      return typeof currentSessionId!=='undefined'&&currentSessionId?('chat:'+currentSessionId):'';
    }catch(_){return '';}
  }

  function decorateScrollAnchors(){
    const el=box();
    if(!el)return;
    [...el.querySelectorAll('.msg,.ai-activity-card,.welcome-screen')].forEach((node,index)=>{
      node.dataset.jdScrollAnchor=String(index);
    });
  }

  function firstVisibleAnchor(){
    const el=box();
    if(!el)return null;
    decorateScrollAnchors();
    const rect=el.getBoundingClientRect();
    const nodes=[...el.querySelectorAll('[data-jd-scroll-anchor]')];
    for(const node of nodes){
      const r=node.getBoundingClientRect();
      if(r.bottom>rect.top+4){
        return {id:node.dataset.jdScrollAnchor,offset:r.top-rect.top};
      }
    }
    return null;
  }

  function persistScrollStates(){
    try{localStorage.setItem(SCROLL_KEY,JSON.stringify(scrollStates));}catch(_){}
  }

  function captureScroll(key=activeScrollKey()){
    const el=box();
    if(!el||!key)return null;
    const max=Math.max(0,el.scrollHeight-el.clientHeight);
    const anchor=firstVisibleAnchor();
    const snapshot={
      top:Math.max(0,el.scrollTop),
      max,
      atBottom:max-el.scrollTop<=24,
      anchor:anchor?.id??null,
      anchorOffset:Number(anchor?.offset||0),
      savedAt:Date.now()
    };
    scrollStates[key]=snapshot;
    persistScrollStates();
    return snapshot;
  }

  function applyScrollSnapshot(key){
    const el=box();
    const saved=scrollStates[key];
    if(!el||!saved)return false;
    decorateScrollAnchors();
    if(saved.atBottom){
      el.scrollTop=el.scrollHeight;
      return true;
    }
    const target=saved.anchor!=null?el.querySelector('[data-jd-scroll-anchor="'+CSS.escape(String(saved.anchor))+'"]'):null;
    if(target){
      const boxRect=el.getBoundingClientRect();
      const currentOffset=target.getBoundingClientRect().top-boxRect.top;
      el.scrollTop=Math.max(0,el.scrollTop+(currentOffset-Number(saved.anchorOffset||0)));
    }else{
      const max=Math.max(0,el.scrollHeight-el.clientHeight);
      el.scrollTop=Math.min(Math.max(0,Number(saved.top)||0),max);
    }
    return true;
  }

  function restoreScroll(key=activeScrollKey()){
    if(!key||!scrollStates[key])return false;
    const token=++state.restoreToken;
    state.restoring=true;
    const paint=()=>{
      if(token!==state.restoreToken)return;
      applyScrollSnapshot(key);
    };
    requestAnimationFrame(()=>{
      paint();
      setTimeout(paint,60);
      setTimeout(()=>{
        paint();
        if(token===state.restoreToken)state.restoring=false;
      },220);
    });
    return true;
  }

  function bindScrollState(){
    const el=box();
    if(!el||el.dataset.jdScrollBound==='1')return;
    el.dataset.jdScrollBound='1';
    if('scrollRestoration' in history)history.scrollRestoration='manual';
    el.addEventListener('scroll',()=>{
      if(state.restoring||state.pulling||state.refreshing)return;
      clearTimeout(state.saveTimer);
      state.saveTimer=setTimeout(()=>captureScroll(),90);
    },{passive:true});
    window.addEventListener('pagehide',()=>captureScroll(),{passive:true});
    window.addEventListener('beforeunload',()=>captureScroll(),{passive:true});
  }

  function wrapNavigation(){
    if(typeof window.loadChatSession==='function'&&!window.loadChatSession.__jdScrollWrapped){
      const original=window.loadChatSession;
      const wrapped=function(id,...args){
        captureScroll();
        const result=original.call(this,id,...args);
        decorateScrollAnchors();
        restoreScroll('chat:'+id);
        return result;
      };
      wrapped.__jdScrollWrapped=true;
      wrapped.__jdOriginal=original;
      window.loadChatSession=wrapped;
    }
    if(typeof window.loadBibleSession==='function'&&!window.loadBibleSession.__jdScrollWrapped){
      const original=window.loadBibleSession;
      const wrapped=function(id,...args){
        captureScroll();
        const result=original.call(this,id,...args);
        decorateScrollAnchors();
        restoreScroll('bible:'+id);
        return result;
      };
      wrapped.__jdScrollWrapped=true;
      wrapped.__jdOriginal=original;
      window.loadBibleSession=wrapped;
    }
    if(typeof window.createNewChat==='function'&&!window.createNewChat.__jdScrollWrapped){
      const original=window.createNewChat;
      const wrapped=function(...args){
        captureScroll();
        return original.apply(this,args);
      };
      wrapped.__jdScrollWrapped=true;
      wrapped.__jdOriginal=original;
      window.createNewChat=wrapped;
    }
  }

  function ensurePullIndicator(){
    const host=doc.querySelector('.chat-viewport-wrapper');
    if(!host)return null;
    let indicator=doc.getElementById('jdPullRefresh');
    if(indicator)return indicator;
    indicator=doc.createElement('div');
    indicator.id='jdPullRefresh';
    indicator.className='jd-pull-refresh';
    indicator.setAttribute('aria-hidden','true');
    indicator.innerHTML='<span class="jd-pull-refresh__ring" aria-hidden="true"><i></i></span><span class="jd-pull-refresh__label">Pull to refresh</span>';
    host.prepend(indicator);
    return indicator;
  }

  function dampPull(raw){
    const n=Math.max(0,Number(raw)||0);
    if(n<=PULL_THRESHOLD)return Math.min(PULL_MAX,n*.62);
    return Math.min(PULL_MAX,PULL_THRESHOLD*.62+(n-PULL_THRESHOLD)*.28);
  }

  function setPull(raw){
    const el=box();
    const indicator=ensurePullIndicator();
    if(!el||!indicator)return {armed:false,pull:0,progress:0};
    state.pullRaw=Math.max(0,Number(raw)||0);
    const pull=dampPull(state.pullRaw);
    const progress=Math.max(0,Math.min(1,state.pullRaw/PULL_THRESHOLD));
    const armed=state.pullRaw>=PULL_THRESHOLD;
    state.armed=armed;
    indicator.style.setProperty('--jd-pull',pull.toFixed(1)+'px');
    indicator.style.setProperty('--jd-pull-progress',String(progress));
    indicator.classList.toggle('visible',pull>2);
    indicator.classList.toggle('armed',armed);
    indicator.querySelector('.jd-pull-refresh__label').textContent=armed?'Release to refresh':'Pull to refresh';
    el.style.setProperty('--jd-pull-y',pull.toFixed(1)+'px');
    el.classList.add('jd-pull-shift');
    if(armed&&!state.thresholdTicked){
      state.thresholdTicked=true;
      try{if(typeof jdHapticPulse==='function')jdHapticPulse(10);}catch(_){}
    }else if(!armed){
      state.thresholdTicked=false;
    }
    return {armed,pull,progress};
  }

  function settlePull(delay=0){
    const el=box();
    const indicator=ensurePullIndicator();
    setTimeout(()=>{
      if(el){
        el.classList.add('jd-pull-settle');
        el.style.setProperty('--jd-pull-y','0px');
        setTimeout(()=>{
          el.classList.remove('jd-pull-shift','jd-pull-settle');
          el.style.removeProperty('--jd-pull-y');
        },420);
      }
      if(indicator){
        indicator.style.setProperty('--jd-pull','0px');
        indicator.style.setProperty('--jd-pull-progress','0');
        indicator.classList.remove('visible','armed','loading','done','failed');
        indicator.querySelector('.jd-pull-refresh__label').textContent='Pull to refresh';
      }
      state.pulling=false;
      state.armed=false;
      state.thresholdTicked=false;
      state.pullRaw=0;
    },delay);
  }

  async function refreshCurrentView(){
    const key=activeScrollKey();
    captureScroll(key);
    try{
      if(typeof cloudUser!=='undefined'&&cloudUser&&typeof loadCloudState==='function'){
        await loadCloudState();
      }
    }catch(error){
      console.warn('[JepongDevxyz pull refresh] cloud refresh:',error?.message||error);
    }
    try{
      if(typeof isBibleMode!=='undefined'&&isBibleMode&&typeof currentBibleSessionId!=='undefined'&&currentBibleSessionId&&typeof window.loadBibleSession==='function'){
        window.loadBibleSession(currentBibleSessionId);
      }else if(typeof isIncognito!=='undefined'&&isIncognito){
        // Incognito stays in-memory; do not rebuild it from persistent storage.
      }else if(typeof currentSessionId!=='undefined'&&currentSessionId&&typeof window.loadChatSession==='function'){
        window.loadChatSession(currentSessionId);
      }
      if(typeof renderSidebarHistory==='function')renderSidebarHistory();
      if(typeof measureNetworkPing==='function')measureNetworkPing();
    }catch(error){
      console.warn('[JepongDevxyz pull refresh] render refresh:',error?.message||error);
      throw error;
    }
    restoreScroll(key);
  }

  async function triggerRefresh(){
    if(state.refreshing)return false;
    const el=box();
    const indicator=ensurePullIndicator();
    if(!el||!indicator)return false;
    state.refreshing=true;
    state.pulling=false;
    indicator.classList.add('visible','loading');
    indicator.classList.remove('armed','done','failed');
    indicator.querySelector('.jd-pull-refresh__label').textContent='Refreshing…';
    el.classList.add('jd-pull-shift','jd-pull-settle');
    el.style.setProperty('--jd-pull-y',PULL_HOLD+'px');
    const started=performance.now();
    let ok=true;
    try{await refreshCurrentView();}catch(_){ok=false;}
    const wait=Math.max(0,520-(performance.now()-started));
    if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
    state.refreshing=false;
    indicator.classList.remove('loading');
    indicator.classList.add(ok?'done':'failed');
    indicator.querySelector('.jd-pull-refresh__label').textContent=ok?'Updated':'Could not refresh';
    if(ok){
      try{if(typeof jdHapticPulse==='function')jdHapticPulse(8);}catch(_){}
    }
    settlePull(260);
    return ok;
  }

  function bindPull(){
    const el=box();
    if(!el||el.dataset.jdPullBound==='1')return;
    el.dataset.jdPullBound='1';
    ensurePullIndicator();

    el.addEventListener('touchstart',event=>{
      if(state.refreshing||event.touches.length!==1||el.scrollTop>0)return;
      state.pullStartY=event.touches[0].clientY;
      state.pullRaw=0;
      state.pulling=true;
      state.armed=false;
      state.thresholdTicked=false;
    },{passive:true});

    el.addEventListener('touchmove',event=>{
      if(!state.pulling||state.refreshing||event.touches.length!==1)return;
      const raw=event.touches[0].clientY-state.pullStartY;
      if(raw<=0){
        state.pulling=false;
        settlePull();
        return;
      }
      if(el.scrollTop>0){
        state.pulling=false;
        settlePull();
        return;
      }
      if(raw>3)event.preventDefault();
      setPull(raw);
    },{passive:false});

    const release=()=>{
      if(!state.pulling||state.refreshing)return;
      const armed=state.armed;
      state.pulling=false;
      if(armed)triggerRefresh();
      else settlePull();
    };
    el.addEventListener('touchend',release,{passive:true});
    el.addEventListener('touchcancel',()=>{state.pulling=false;settlePull();},{passive:true});
  }

  function formatRate(value){
    try{return typeof attachmentRate==='function'?attachmentRate(value):'—';}catch(_){return '—';}
  }
  function formatEta(value){
    try{return typeof attachmentEta==='function'?attachmentEta(value):'—';}catch(_){return '—';}
  }
  function progressStats(file){
    try{
      if(typeof attachmentProgressStats==='function')return attachmentProgressStats(file);
    }catch(_){}
    const total=Math.max(0,Number(file?.size)||0);
    const loaded=Math.max(0,Math.min(total,Number(file?.progressBytes)||0));
    const percent=total?Math.min(100,(loaded/total)*100):Math.max(0,Number(file?.progressPercent)||0);
    return {total,loaded,speed:0,eta:null,percent};
  }

  function enhanceUploadCards(){
    const host=doc.getElementById('filePreviewContainer');
    if(!host)return;
    let files=[];
    try{files=typeof selectedFilesData!=='undefined'?[...selectedFilesData]:[];}catch(_){files=[];}
    host.querySelectorAll('.jd-upload-queue-summary').forEach(node=>node.remove());
    const chips=[...host.querySelectorAll('.jd-upload-chip')];
    if(!files.length||!chips.length)return;

    const done=files.filter(file=>['ready','warning'].includes(file.status)).length;
    const failed=files.filter(file=>file.status==='error').length;
    const active=files.length-done-failed;
    if(files.length>1){
      const summary=doc.createElement('span');
      summary.className='jd-upload-queue-summary';
      summary.innerHTML='<span>'+(active?'Preparing '+files.length+' files':(failed?'Files prepared with errors':'Files ready'))+'</span><span>'+done+' of '+files.length+' ready</span>';
      host.prepend(summary);
    }

    chips.forEach((chip,index)=>{
      const file=files[index];
      if(!file)return;
      chip.classList.add('jd-upload-card');
      chip.dataset.status=file.status||'ready';

      const icon=chip.querySelector('.jd-upload-chip__icon,.prompt-bar__chip-icon');
      const name=chip.querySelector('.jd-upload-chip__name,.prompt-bar__chip-name');
      const remove=chip.querySelector('.jd-upload-chip__remove,.prompt-bar__chip-x');
      if(!icon||!name||!remove)return;

      let body=chip.querySelector('.jd-upload-card__body');
      if(!body){
        body=doc.createElement('span');
        body.className='jd-upload-card__body';
        chip.insertBefore(body,remove);
        body.appendChild(name);
      }

      let meta=body.querySelector('.jd-upload-card__meta');
      if(!meta){
        meta=doc.createElement('span');
        meta.className='jd-upload-card__meta';
        body.appendChild(meta);
      }
      let progress=body.querySelector('.jd-upload-card__progress');
      if(!progress){
        progress=doc.createElement('span');
        progress.className='jd-upload-card__progress';
        progress.innerHTML='<i></i>';
        body.appendChild(progress);
      }

      const stats=progressStats(file);
      const processing=file.status==='processing';
      const indeterminate=processing&&!!file.progressIndeterminate;
      const percent=['ready','warning'].includes(file.status)?100:Math.max(0,Math.min(100,Number(file.progressPercent)||stats.percent||0));
      progress.classList.toggle('indeterminate',indeterminate);
      progress.querySelector('i').style.width=indeterminate?'36%':percent.toFixed(1)+'%';

      let statusText='';
      if(file.status==='error'){
        statusText='Failed';
      }else if(file.status==='warning'){
        statusText='Ready with warning';
      }else if(file.status==='ready'){
        statusText='Ready';
      }else if(indeterminate){
        statusText=file.statusText||'Processing…';
      }else{
        const rate=formatRate(stats.speed);
        const eta=formatEta(stats.eta);
        statusText=Math.round(percent)+'%';
        if(rate!=='—')statusText+=' · '+rate;
        if(eta!=='—')statusText+=' · '+eta+' left';
      }
      meta.textContent=statusText;

      let retry=chip.querySelector('.jd-upload-card__retry');
      if(file.status==='error'){
        if(!retry){
          retry=doc.createElement('button');
          retry.type='button';
          retry.className='jd-upload-card__retry';
          retry.textContent='Retry';
          retry.addEventListener('click',event=>{
            event.preventDefault();
            event.stopPropagation();
            retryAttachment(file.id);
          });
          chip.insertBefore(retry,remove);
        }
      }else{
        retry?.remove();
      }
    });
    try{window.JDReactBits?.syncPrompt?.();}catch(_){}
  }

  async function retryAttachment(id){
    let item=null;
    try{item=typeof selectedFilesData!=='undefined'?selectedFilesData.find(file=>file.id===id):null;}catch(_){}
    if(!item)return false;
    const source=item._sourceFile;
    if(!source){
      try{showModernToast?.('Choose the file again to retry.');}catch(_){}
      return false;
    }
    item.status='processing';
    item.statusText='Retrying…';
    item.progressBytes=0;
    item.progressPercent=0;
    item.progressStartedAt=performance.now();
    item.progressIndeterminate=false;
    item.extractionError='';
    renderFilePreviews();
    let job;
    try{
      job=processAttachmentFile(source,item);
      if(typeof attachmentJobs!=='undefined'&&attachmentJobs?.set){
        attachmentJobs.set(item.id,job.finally(()=>attachmentJobs.delete(item.id)));
      }
      await job;
      return item.status!=='error';
    }catch(_){
      return false;
    }finally{
      renderFilePreviews();
    }
  }

  function wrapUploads(){
    if(typeof window.addSelectedFiles==='function'&&!window.addSelectedFiles.__jdMotionWrapped){
      const original=window.addSelectedFiles;
      const wrapped=async function(fileList,...args){
        const incoming=Array.from(fileList||[]);
        const result=await original.call(this,fileList,...args);
        try{
          const pool=typeof selectedFilesData!=='undefined'?selectedFilesData:[];
          incoming.forEach(source=>{
            const match=pool.find(item=>!item._sourceFile&&item.name===source.name&&Number(item.size)===Number(source.size)&&Number(item.lastModified)===Number(source.lastModified));
            if(match)match._sourceFile=source;
          });
        }catch(_){}
        renderFilePreviews();
        return result;
      };
      wrapped.__jdMotionWrapped=true;
      wrapped.__jdOriginal=original;
      window.addSelectedFiles=wrapped;
    }

    if(typeof window.renderFilePreviews==='function'&&!window.renderFilePreviews.__jdMotionWrapped){
      const original=window.renderFilePreviews;
      const wrapped=function(...args){
        const result=original.apply(this,args);
        enhanceUploadCards();
        return result;
      };
      wrapped.__jdMotionWrapped=true;
      wrapped.__jdOriginal=original;
      window.renderFilePreviews=wrapped;
    }
  }

  function init(){
    bindScrollState();
    wrapNavigation();
    wrapUploads();
    bindPull();
    decorateScrollAnchors();
    enhanceUploadCards();
  }

  window.JDMotionUX={
    version:'2026-09-27-three-reference-v1',
    captureScroll,
    restoreScroll,
    decorateScrollAnchors,
    setPull,
    triggerRefresh,
    settlePull,
    enhanceUploadCards,
    retryAttachment,
    get scrollStates(){return scrollStates;},
    get state(){return {...state};}
  };

  init();
})();