(()=>{
  'use strict';
  if(window.__JD_MOTION_UX_READY__)return;
  window.__JD_MOTION_UX_READY__=true;

  const doc=document;
  const SCROLL_KEY='jd_scroll_state_v3';
  const PULL_THRESHOLD=96;
  const PULL_MAX=78;
  const PULL_HOLD=48;
  const RESTORE_DELAYS=[0,48,120,240,420,700];
  let scrollStates={};
  try{scrollStates=JSON.parse(localStorage.getItem(SCROLL_KEY)||'{}')||{};}catch(_){scrollStates={};}

  const state={
    restoring:false,
    restoreToken:0,
    saveTimer:0,
    pullStartX:0,
    pullStartY:0,
    pullRaw:0,
    pullCandidate:false,
    pulling:false,
    armed:false,
    refreshing:false,
    thresholdTicked:false,
    userInterruptedRestore:false
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

  function hashText(value){
    const text=String(value||'');
    let h=2166136261;
    for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
    return (h>>>0).toString(36);
  }

  function stableAnchorId(node,index){
    if(!node)return 'row:'+index;
    const explicit=node.getAttribute('data-message-id')||node.getAttribute('data-message-index')||node.id;
    if(explicit)return 'id:'+explicit+':'+(node.classList.contains('user')?'u':node.classList.contains('bot')?'b':'x');
    const text=String(node.textContent||'').replace(/\s+/g,' ').trim().slice(0,160);
    return 'sig:'+hashText((node.className||'')+'|'+text)+'|'+index;
  }

  function decorateScrollAnchors(){
    const el=box();
    if(!el)return;
    [...el.querySelectorAll('.msg,.ai-activity-card,.welcome-screen,.study-panel')].forEach((node,index)=>{
      node.dataset.jdScrollAnchor=stableAnchorId(node,index);
    });
    el.style.setProperty('--jd-scroll-offset','12px');
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
      distanceFromBottom:Math.max(0,max-el.scrollTop),
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
    const max=Math.max(0,el.scrollHeight-el.clientHeight);
    if(saved.atBottom){
      el.scrollTop=max;
      return true;
    }
    const escaped=typeof CSS!=='undefined'&&CSS.escape?CSS.escape(String(saved.anchor||'')):String(saved.anchor||'').replace(/["\\]/g,'\\$&');
    const target=saved.anchor?el.querySelector('[data-jd-scroll-anchor="'+escaped+'"]'):null;
    if(target){
      const boxRect=el.getBoundingClientRect();
      const currentOffset=target.getBoundingClientRect().top-boxRect.top;
      el.scrollTop=Math.max(0,Math.min(max,el.scrollTop+(currentOffset-Number(saved.anchorOffset||0))));
      return true;
    }
    el.scrollTop=Math.max(0,Math.min(max,Number(saved.top)||0));
    return true;
  }

  function cancelRestore(){
    if(!state.restoring)return;
    state.userInterruptedRestore=true;
    state.restoreToken++;
    state.restoring=false;
  }

  function restoreScroll(key=activeScrollKey()){
    if(!key||!scrollStates[key])return false;
    const token=++state.restoreToken;
    state.restoring=true;
    state.userInterruptedRestore=false;
    RESTORE_DELAYS.forEach((delay,index)=>{
      setTimeout(()=>{
        if(token!==state.restoreToken||state.userInterruptedRestore)return;
        applyScrollSnapshot(key);
        if(index===RESTORE_DELAYS.length-1&&token===state.restoreToken)state.restoring=false;
      },delay);
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
      state.saveTimer=setTimeout(()=>captureScroll(),80);
    },{passive:true});
    ['touchstart','pointerdown','wheel'].forEach(type=>el.addEventListener(type,cancelRestore,{passive:true}));
    window.addEventListener('pagehide',()=>captureScroll(),{passive:true});
    window.addEventListener('beforeunload',()=>captureScroll(),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')captureScroll();},{passive:true});
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
    indicator.setAttribute('aria-label','Pull to refresh');
    indicator.innerHTML='<svg class="jd-pull-refresh__arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v13"/><path d="m7 13 5 5 5-5"/></svg><span class="jd-pull-refresh__spinner" aria-hidden="true"></span><svg class="jd-pull-refresh__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    host.prepend(indicator);
    return indicator;
  }

  function dampPull(raw){
    const n=Math.max(0,Number(raw)||0);
    const first=Math.min(n,PULL_THRESHOLD)*.48;
    const extra=Math.max(0,n-PULL_THRESHOLD)*.16;
    return Math.min(PULL_MAX,first+extra);
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
    indicator.classList.toggle('visible',pull>3);
    indicator.classList.toggle('armed',armed);
    indicator.setAttribute('aria-label',armed?'Release to refresh':'Pull to refresh');
    el.style.setProperty('--jd-pull-y',pull.toFixed(1)+'px');
    el.classList.add('jd-pull-shift');
    if(armed&&!state.thresholdTicked){
      state.thresholdTicked=true;
      try{if(typeof jdHapticPulse==='function')jdHapticPulse(10);}catch(_){}
    }else if(!armed){state.thresholdTicked=false;}
    return {armed,pull,progress};
  }

  function resetPullState(){
    state.pullCandidate=false;
    state.pulling=false;
    state.armed=false;
    state.thresholdTicked=false;
    state.pullRaw=0;
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
        },380);
      }
      if(indicator){
        indicator.style.setProperty('--jd-pull','0px');
        indicator.style.setProperty('--jd-pull-progress','0');
        indicator.classList.remove('visible','armed','loading','done','failed');
        indicator.setAttribute('aria-label','Pull to refresh');
      }
      resetPullState();
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
    state.pullCandidate=false;
    state.pulling=false;
    indicator.classList.add('visible','loading');
    indicator.classList.remove('armed','done','failed');
    indicator.setAttribute('aria-label','Refreshing');
    el.classList.add('jd-pull-shift','jd-pull-settle');
    el.style.setProperty('--jd-pull-y',PULL_HOLD+'px');
    const started=performance.now();
    let ok=true;
    try{await refreshCurrentView();}catch(_){ok=false;}
    const wait=Math.max(0,420-(performance.now()-started));
    if(wait)await new Promise(resolve=>setTimeout(resolve,wait));
    state.refreshing=false;
    indicator.classList.remove('loading');
    indicator.classList.add(ok?'done':'failed');
    indicator.setAttribute('aria-label',ok?'Updated':'Could not refresh');
    if(ok){try{if(typeof jdHapticPulse==='function')jdHapticPulse(8);}catch(_){}}
    settlePull(ok?150:260);
    return ok;
  }

  function pullBlockedTarget(target){
    if(doc.querySelector('.modal-overlay.open,.sidebar.open'))return true;
    if(!target?.closest)return false;
    return !!target.closest('textarea,input,select,[contenteditable="true"],.prompt-bar,.composer-tool-sheet,.floating-scroll-pill');
  }

  function bindPull(){
    const el=box();
    if(!el||el.dataset.jdPullBound==='1')return;
    el.dataset.jdPullBound='1';
    ensurePullIndicator();

    el.addEventListener('touchstart',event=>{
      if(state.refreshing||event.touches.length!==1||el.scrollTop>1||pullBlockedTarget(event.target))return;
      state.pullStartX=event.touches[0].clientX;
      state.pullStartY=event.touches[0].clientY;
      state.pullRaw=0;
      state.pullCandidate=true;
      state.pulling=false;
      state.armed=false;
      state.thresholdTicked=false;
    },{passive:true});

    el.addEventListener('touchmove',event=>{
      if(!state.pullCandidate||state.refreshing||event.touches.length!==1)return;
      const dx=event.touches[0].clientX-state.pullStartX;
      const dy=event.touches[0].clientY-state.pullStartY;
      if(dy<=0||el.scrollTop>1){resetPullState();settlePull();return;}
      if(!state.pulling){
        if(Math.abs(dy)<7)return;
        if(Math.abs(dx)>Math.abs(dy)*.85){resetPullState();return;}
        state.pulling=true;
      }
      event.preventDefault();
      setPull(dy);
    },{passive:false});

    const release=()=>{
      if(!state.pullCandidate||state.refreshing)return;
      const armed=state.pulling&&state.armed;
      state.pullCandidate=false;
      state.pulling=false;
      if(armed)triggerRefresh();
      else settlePull();
    };
    el.addEventListener('touchend',release,{passive:true});
    el.addEventListener('touchcancel',()=>{resetPullState();settlePull();},{passive:true});
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

  function humanSize(bytes){
    const n=Math.max(0,Number(bytes)||0);
    if(n<1024)return n+' B';
    if(n<1024*1024)return (n/1024).toFixed(n<10240?1:0)+' KB';
    if(n<1024*1024*1024)return (n/(1024*1024)).toFixed(n<10*1024*1024?1:0)+' MB';
    return (n/(1024*1024*1024)).toFixed(1)+' GB';
  }

  function fileTypeLabel(file){
    const mime=String(file?.originalMimeType||file?.mimeType||'').split('/').pop();
    const ext=String(file?.name||'').split('.').pop();
    const value=(mime&&mime!=='octet-stream'?mime:ext)||'file';
    return String(value).toUpperCase().slice(0,12);
  }

  function previewSource(file){
    if(file?.fullData)return file.fullData;
    const frame=(file?.frames||[]).find(item=>item?.fullData||item?.data);
    if(frame?.fullData)return frame.fullData;
    if(frame?.data&&frame?.mimeType)return 'data:'+frame.mimeType+';base64,'+frame.data;
    return '';
  }

  function fallbackIcon(kind){
    const icon=kind==='image'?'image':kind==='video'?'video':kind==='audio'?'music':kind==='pdf'?'file-text':'file';
    return '<i data-lucide="'+icon+'"></i>';
  }

  function enhanceUploadCards(){
    const host=doc.getElementById('filePreviewContainer');
    if(!host)return;
    let files=[];
    try{files=typeof selectedFilesData!=='undefined'?[...selectedFilesData]:[];}catch(_){files=[];}
    host.querySelectorAll('.jd-upload-queue-summary').forEach(node=>node.remove());
    const chips=[...host.querySelectorAll('.jd-upload-chip')];
    if(!files.length||!chips.length)return;

    if(files.length>1){
      const ready=files.filter(file=>['ready','warning'].includes(file.status)).length;
      const failed=files.filter(file=>file.status==='error').length;
      const summary=doc.createElement('span');
      summary.className='jd-upload-queue-summary';
      summary.innerHTML='<span>'+(failed?'One or more files need attention':ready===files.length?'Files ready':'Preparing files')+'</span><span>'+ready+' / '+files.length+' ready</span>';
      host.prepend(summary);
    }

    chips.forEach((chip,index)=>{
      const file=files[index];
      if(!file)return;
      chip.classList.remove('jd-upload-card');
      chip.classList.add('jd-upload-lane');
      chip.dataset.status=file.status||'ready';

      const oldIcon=chip.querySelector('.jd-upload-chip__icon,.prompt-bar__chip-icon');
      const name=chip.querySelector('.jd-upload-chip__name,.prompt-bar__chip-name');
      const remove=chip.querySelector('.jd-upload-chip__remove,.prompt-bar__chip-x');
      if(!name||!remove)return;
      oldIcon?.remove();

      let thumb=chip.querySelector('.jd-upload-lane__thumb');
      if(!thumb){thumb=doc.createElement('span');thumb.className='jd-upload-lane__thumb';chip.prepend(thumb);}
      const preview=previewSource(file);
      thumb.innerHTML=preview?'<img alt="" src="'+String(preview).replace(/"/g,'&quot;')+'">':fallbackIcon(file.kind);

      let body=chip.querySelector('.jd-upload-lane__body');
      if(!body){body=doc.createElement('span');body.className='jd-upload-lane__body';chip.insertBefore(body,remove);body.appendChild(name);}
      let meta=body.querySelector('.jd-upload-lane__meta');
      if(!meta){meta=doc.createElement('span');meta.className='jd-upload-lane__meta';body.appendChild(meta);}
      meta.textContent=fileTypeLabel(file)+' · '+humanSize(file.size);
      let status=body.querySelector('.jd-upload-lane__status');
      if(!status){status=doc.createElement('span');status.className='jd-upload-lane__status';body.appendChild(status);}

      let actions=chip.querySelector('.jd-upload-lane__actions');
      if(!actions){actions=doc.createElement('span');actions.className='jd-upload-lane__actions';chip.appendChild(actions);actions.appendChild(remove);}
      else if(remove.parentNode!==actions)actions.appendChild(remove);

      const stats=progressStats(file);
      const processing=file.status==='processing';
      const indeterminate=processing&&!!file.progressIndeterminate;
      const measured=Math.max(0,Math.min(100,Number(file.progressPercent)||stats.percent||0));
      const percent=['ready','warning'].includes(file.status)?100:measured;

      let statusText='';
      if(file.status==='error')statusText='Failed · retry this file';
      else if(file.status==='warning')statusText='Ready · check warning';
      else if(file.status==='ready')statusText='Ready';
      else if(indeterminate&&percent<=0)statusText=file.statusText||'Preparing…';
      else{
        statusText=Math.round(percent)+'%';
        const rate=formatRate(stats.speed);
        const eta=formatEta(stats.eta);
        if(rate!=='—')statusText+=' · '+rate;
        if(eta!=='—')statusText+=' · '+eta+' left';
      }
      status.textContent=statusText;

      let progress=chip.querySelector('.jd-upload-lane__progress');
      if(!progress){progress=doc.createElement('span');progress.className='jd-upload-lane__progress';progress.innerHTML='<i></i>';chip.appendChild(progress);}
      progress.classList.toggle('indeterminate',indeterminate&&percent<=0);
      progress.querySelector('i').style.width=(indeterminate&&percent<=0)?'34%':percent.toFixed(1)+'%';

      let retry=actions.querySelector('.jd-upload-lane__retry');
      if(file.status==='error'){
        if(!retry){
          retry=doc.createElement('button');
          retry.type='button';
          retry.className='jd-upload-lane__retry';
          retry.textContent='Retry';
          retry.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();retryAttachment(file.id);});
          actions.insertBefore(retry,remove);
        }
      }else retry?.remove();
    });
    try{refreshLucideIcons?.(host);}catch(_){}
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
    version:'2026-09-27-three-reference-v2',
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