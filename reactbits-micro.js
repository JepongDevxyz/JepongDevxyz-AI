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

  /* PromptBar — vanilla port of the ReactBits interaction model. */
  var PB_ARROW_UP=[12,4.5,18.5,11,14.25,11,14.25,19.5,9.75,19.5,9.75,11,5.5,11];
  var PB_SQUARE=[12,6,18,6,18,12,18,18,6,18,6,12,6,6];
  var pbMorphRaf=0;
  var pbMorphValue=0;
  var pbTyping={energy:0,strokes:0};
  var pbSparkRaf=0;
  var pbSparkResizeObserver=null;
  var pbSparkParts=[];
  var pbSparkState=null;

  function pbMix(a,b,t){return a+(b-a)*t;}
  function pbPathAt(a,b,t){
    var d='';
    for(var i=0;i<a.length;i+=2){
      d+=(i?'L':'M')+pbMix(a[i],b[i],t).toFixed(2)+' '+pbMix(a[i+1],b[i+1],t).toFixed(2);
    }
    return d+'Z';
  }

  // cubic-bezier(.77,0,.175,1), matching the ReactBits SendGlyph easing.
  function pbEase(x){
    var x1=.77,y1=0,x2=.175,y2=1;
    function sampleCurveX(t){var inv=1-t;return 3*inv*inv*t*x1+3*inv*t*t*x2+t*t*t;}
    function sampleCurveY(t){var inv=1-t;return 3*inv*inv*t*y1+3*inv*t*t*y2+t*t*t;}
    function sampleDerivativeX(t){return 3*(1-t)*(1-t)*x1+6*(1-t)*t*(x2-x1)+3*t*t*(1-x2);}
    var t=x;
    for(var i=0;i<6;i++){
      var dx=sampleCurveX(t)-x;
      var d=sampleDerivativeX(t);
      if(Math.abs(dx)<1e-5||Math.abs(d)<1e-6)break;
      t-=dx/d;
      t=Math.max(0,Math.min(1,t));
    }
    return sampleCurveY(t);
  }

  function animatePromptGlyph(busy){
    var svg=doc.getElementById('promptBarSendGlyph');
    var path=doc.getElementById('promptBarSendPath');
    if(!svg||!path)return;
    cancelAnimationFrame(pbMorphRaf);
    var reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    var start=pbMorphValue;
    var target=busy?1:0;
    var dir=busy?1:-1;
    if(reduce||Math.abs(target-start)<.001){
      pbMorphValue=target;
      path.setAttribute('d',pbPathAt(PB_ARROW_UP,PB_SQUARE,target));
      svg.style.transform='';
      return;
    }
    var began=performance.now();
    var duration=240;
    function frame(now){
      var p=Math.min(1,(now-began)/duration);
      var e=pbEase(p);
      var v=start+(target-start)*e;
      pbMorphValue=v;
      path.setAttribute('d',pbPathAt(PB_ARROW_UP,PB_SQUARE,v));
      var goo=Math.sin(v*Math.PI);
      var sx=1-.12*goo;
      svg.style.transform=goo?'rotate('+(dir*8*goo)+'deg) scale('+sx+','+(1/sx)+')':'';
      if(p<1)pbMorphRaf=requestAnimationFrame(frame);
      else{
        pbMorphValue=target;
        path.setAttribute('d',pbPathAt(PB_ARROW_UP,PB_SQUARE,target));
        svg.style.transform='';
      }
    }
    pbMorphRaf=requestAnimationFrame(frame);
  }

  function stopPromptSparks(){
    if(pbSparkRaf)cancelAnimationFrame(pbSparkRaf);
    pbSparkRaf=0;
    try{pbSparkResizeObserver?.disconnect?.();}catch(_){}
    pbSparkResizeObserver=null;
    pbSparkParts=[];
    pbSparkState=null;
    var canvas=doc.getElementById('promptBarSparks');
    var ctx=canvas?.getContext?.('2d');
    if(canvas&&ctx)ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function startPromptSparks(){
    var bar=doc.getElementById('promptBar');
    var canvas=doc.getElementById('promptBarSparks');
    if(!bar||!canvas||pbSparkRaf||window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
    var ctx=canvas.getContext('2d');
    if(!ctx)return;
    var sparkColor=getComputedStyle(bar).getPropertyValue('--pb-spark').trim()||'#b39dff';
    var w=0,h=0,due=0,speed=1,pulse=0,last=performance.now();
    pbTyping.strokes=0;
    pbSparkParts=[];

    function resize(){
      var rect=canvas.getBoundingClientRect();
      var dpr=Math.min(2,window.devicePixelRatio||1);
      w=rect.width;h=rect.height;
      canvas.width=Math.round(w*dpr);
      canvas.height=Math.round(h*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function spawn(burst){
      pbSparkParts.push({
        x:Math.random()*w,
        y:burst?h*(.2+Math.random()*.8):h+3,
        r:.9+Math.random()*1.1,
        vy:-(7+Math.random()*9),
        sway:(Math.random()-.5)*10,
        phase:Math.random()*Math.PI*2,
        life:burst?Math.random()*1.2:0,
        span:2.4+Math.random()*2.4
      });
    }
    function tick(now){
      if(!doc.getElementById('promptBar')?.hasAttribute('data-max')){
        stopPromptSparks();return;
      }
      var dt=Math.min(.05,(now-last)/1000);last=now;
      pbTyping.energy*=Math.exp(-dt/.8);
      pulse*=Math.exp(-dt/.16);
      if(pbTyping.strokes>0){pbTyping.strokes=0;pulse=1;}
      var energy=pbTyping.energy;
      speed+=(1+energy*6-speed)*(1-Math.exp(-dt/.15));
      due+=dt;
      while(due>.14){due-=.14;if(pbSparkParts.length<30)spawn(false);}
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle=sparkColor;ctx.shadowColor=sparkColor;ctx.shadowBlur=6+energy*10+pulse*6;
      for(var i=pbSparkParts.length-1;i>=0;i--){
        var part=pbSparkParts[i];part.life+=dt;
        if(part.life>part.span){pbSparkParts.splice(i,1);continue;}
        var k=part.life/part.span;
        var twinkle=.7+.3*Math.sin((now/160)*(1+energy)+part.phase);
        part.y+=part.vy*dt*speed;
        if(part.y<-4){part.y=h+3;part.x=Math.random()*w;}
        var edge=Math.min(1,Math.max(0,part.y/14),Math.max(0,(h-part.y)/14));
        ctx.globalAlpha=Math.min(1,Math.sin(k*Math.PI)*(.9+energy*.25)*twinkle)*edge;
        ctx.beginPath();
        ctx.arc(
          part.x+Math.sin((now/900)*(1+energy*.8)+part.phase)*part.sway,
          part.y,
          part.r*twinkle*(1+energy*.35),
          0,Math.PI*2
        );
        ctx.fill();
      }
      ctx.globalAlpha=1;
      pbSparkRaf=requestAnimationFrame(tick);
    }

    resize();
    for(var i=0;i<26;i++)spawn(true);
    pbSparkResizeObserver=new ResizeObserver(resize);
    pbSparkResizeObserver.observe(canvas);
    pbSparkState={canvas:canvas,ctx:ctx};
    pbSparkRaf=requestAnimationFrame(tick);
  }

  function syncPrompt(){
    var bar=doc.getElementById('promptBar');
    var input=doc.getElementById('userInput');
    var action=doc.getElementById('mainActionBtn');
    if(!bar||!input||!action)return;

    var busy=action.classList.contains('generating')||/stop/i.test(action.title||'');
    var hasText=!!String(input.value||'').trim();
    var preview=doc.getElementById('filePreviewContainer');
    var hasFiles=!!preview?.children?.length;
    var voiceEntry=!busy&&!!action.__jdVoiceSwapped;
    var armed=busy||hasText||hasFiles||voiceEntry;
    var plus=doc.getElementById('composerPlusBtn');
    var effort=doc.getElementById('responseEffortBtn');
    var effortLabel=doc.getElementById('responseEffortLabel');
    var field=bar.querySelector('.prompt-bar__field');

    bar.dataset.models='false';
    bar.toggleAttribute('data-busy',busy);
    var slingWrap=doc.getElementById('mainActionSling');
    if(slingWrap){slingWrap.toggleAttribute('data-busy',busy);slingWrap.toggleAttribute('data-disabled',!armed);}
    if(armed)action.setAttribute('data-armed','');
    else action.removeAttribute('data-armed');
    action.disabled=!armed;

    if(plus){
      var plusOpen=plus.getAttribute('aria-expanded')==='true';
      plus.toggleAttribute('data-on',plusOpen);
    }
    if(effort){
      var effortOpen=effort.getAttribute('aria-expanded')==='true';
      effort.toggleAttribute('data-on',effortOpen);
    }

    var maxed=String(effortLabel?.textContent||'').trim().toLowerCase()==='max';
    bar.toggleAttribute('data-max',maxed);
    field?.toggleAttribute('data-max',maxed);
    effort?.toggleAttribute('data-max',maxed);
    if(maxed)startPromptSparks(); else stopPromptSparks();
  }


  function slingIsBusy(action){
    return !!action && (action.classList.contains('generating') || /stop/i.test(action.title||''));
  }

  function bindSling(action){
    var wrap=doc.getElementById('mainActionSling') || action?.closest?.('.rb-sling-wrap');
    if(!action||!wrap||action.dataset.rbSlingBound==='1')return;
    action.dataset.rbSlingBound='1';
    var GAP=4,SLOP_FINE=4,SLOP_COARSE=8,FINGER_MAX=3000,HAND_MAX=6000;
    var CANCEL=.5,POWER_CAP=1.5,DOT_MS=300,STROKE=3,FLIGHT=120,SPREAD=60,LAUNCH_SPEED=2600,RECOIL=.2;
    var ARM_AT=48;
    var MAX_PULL=160;
    var EASE_OUT='cubic-bezier(0.23, 1, 0.32, 1)';
    var reduce=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    var size=wrap.getBoundingClientRect().width||56;
    // On the compact phone face, keep the landing well inside the row gap so it
    // cannot paint over the adjacent microphone capsule.
    var gap=size<=32?-1:GAP,wellR=size/2+gap+STROKE,padR=size/2-STROKE/2;
    var fx=wrap.querySelector('.rb-sling-fx'),tension=wrap.querySelector('.rb-sling-tension');
    var bands=wrap.querySelectorAll('.rb-sling-band'),hot=wrap.querySelector('.rb-sling-band--hot');
    var well=wrap.querySelector('.rb-sling-well'),arc=wrap.querySelector('.rb-sling-arc');
    var icon=wrap.querySelector('.prompt-bar__glyph'),dots=Array.from(wrap.querySelectorAll('.rb-sling-dot'));
    var state={active:false,id:null,startX:0,startY:0,x:0,y:0,dir:{ux:0,uy:-1},hist:[],slop:8,scale:1,
      armed:false,power:0,sentTimer:0,skipClick:false,paintQueued:false,anim:null};
    var H=wellR+STROKE+2;
    fx?.setAttribute('viewBox',(-H)+' '+(-H)+' '+(2*H)+' '+(2*H));
    fx?.style.setProperty('--sl-svg',(2*H)+'px');
    well?.setAttribute('r',String(wellR));arc?.setAttribute('r',String(wellR));

    function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}
    function rubberband(o,dim,c){c=c??.55;return(o*dim*c)/(dim+c*Math.abs(o));}
    function coords(){return{x:state.x,y:state.y};}
    function setOffset(x,y){state.x=x;state.y=y;wrap.style.setProperty('--sling-x',x.toFixed(2)+'px');wrap.style.setProperty('--sling-y',y.toFixed(2)+'px');}
    function aimIcon(ux,uy,dist){if(!icon)return;var angle=Math.atan2(-uy,-ux)*180/Math.PI+90;icon.style.transition='none';icon.style.transform='rotate('+(angle*clamp(dist/12,0,1))+'deg)';}
    function relaxIcon(){if(!icon)return;icon.style.transition=reduce?'none':'transform 360ms '+EASE_OUT;icon.style.transform='rotate(0deg)';}
    function paint(){
      state.paintQueued=false;if(!fx||!bands.length||!arc||!tension)return;
      var x=state.x,y=state.y,ux=state.dir.ux,uy=state.dir.uy,proj=x*ux+y*uy;
      var p=clamp(proj/ARM_AT,0,1),dist=Math.hypot(x,y),d='';
      if(dist>.5){var a=Math.atan2(y,x),b=Math.acos(clamp((wellR-padR)/dist,-1,1));
        d=[a+b,a-b].map(function(t){var cx=Math.cos(t),cy=Math.sin(t);return'M'+(wellR*cx).toFixed(2)+','+(wellR*cy).toFixed(2)+'L'+(x+padR*cx).toFixed(2)+','+(y+padR*cy).toFixed(2);}).join('');}
      bands.forEach(function(path){path.setAttribute('d',d);});
      if(hot)hot.style.opacity=String(p);
      tension.style.opacity=String(clamp(proj/6,0,1));
      arc.setAttribute('stroke-dasharray',p+' '+(1-p));arc.setAttribute('stroke-dashoffset',String(p/2));arc.style.opacity=p>.01?'1':'0';
      arc.setAttribute('transform','rotate('+((Math.atan2(-uy,-ux)*180/Math.PI).toFixed(2))+')');
      if(state.active)aimIcon(ux,uy,dist);
      if(state.dotPending&&proj<=size/4)launchDots();
    }
    function schedulePaint(){if(state.paintQueued)return;state.paintQueued=true;requestAnimationFrame(paint);}
    function launchDots(){
      state.dotPending=false;clearTimeout(state.dotTimer);relaxIcon();
      var base=Math.atan2(-state.dir.uy,-state.dir.ux),cone=SPREAD*Math.PI/180,push=.85+.35*state.power;
      dots.forEach(function(dot,i){if(!dot)return;dot.getAnimations().forEach(function(a){a.cancel();});
        var lead=i===0,angle=base+(lead?0:(Math.random()+Math.random()-1)*(cone/2));
        var cx=Math.cos(angle),cy=Math.sin(angle),reach=(lead?FLIGHT:FLIGHT*(.3+Math.random()))*push;
        var drift=lead?0:(Math.random()-.5)*FLIGHT*.4,scale=lead?1:.3+Math.random()*.6;
        var shrink=lead?.6:scale*(.2+Math.random()*.4),duration=lead?DOT_MS:DOT_MS*(.7+Math.random()),delay=lead?0:Math.random()*70;
        var to=wellR+reach;
        if(!reduce&&dot.animate){
          dot.animate([{transform:'translate('+cx*wellR+'px,'+cy*wellR+'px) scale('+scale+')'},{transform:'translate('+(cx*to-cy*drift)+'px,'+(cy*to+cx*drift)+'px) scale('+shrink+')'}],{duration:duration,delay:delay,easing:EASE_OUT,fill:'none'});
          dot.animate([{opacity:1,offset:0},{opacity:1,offset:.55},{opacity:0,offset:1}],{duration:duration,delay:delay,easing:'linear',fill:'none'});
        }
      });
    }
    function settle(v0){
      cancelAnimationFrame(state.anim);state.anim=0;
      if(reduce){setOffset(0,0);schedulePaint();return;}
      var x=state.x,y=state.y,vx=v0.x,vy=v0.y,last=performance.now(),start=last,k=220;
      var damping=2*clamp(.7-RECOIL,.25,.9)*Math.sqrt(k);
      function tick(now){
        var dt=clamp((now-last)/1000,.001,.032);last=now;
        var ax=-k*x-damping*vx,ay=-k*y-damping*vy;vx+=ax*dt;vy+=ay*dt;x+=vx*dt;y+=vy*dt;
        setOffset(x,y);schedulePaint();
        if((now-start>180&&Math.hypot(x,y)<.35&&Math.hypot(vx,vy)<4)||now-start>900){
          setOffset(0,0);wrap.removeAttribute('data-loaded');schedulePaint();state.anim=0;return;
        }
        state.anim=requestAnimationFrame(tick);
      }
      state.anim=requestAnimationFrame(tick);
    }
    function suppressNextClick(){
      state.skipClick=true;
      clearTimeout(state.skipTimer);
      state.skipTimer=setTimeout(function(){state.skipClick=false;},700);
    }
    function sendFromRelease(){
      if(state.armed){state.power=clamp((Math.min(Math.hypot(state.x,state.y)/ARM_AT,POWER_CAP)-1)/(POWER_CAP-1),0,1);state.dotPending=true;state.dotTimer=setTimeout(launchDots,150);}
      else{state.power=0;state.dotPending=true;state.dotTimer=setTimeout(launchDots,0);}
      suppressNextClick();
      requestAnimationFrame(function(){if(typeof window.handleMainAction==='function')window.handleMainAction();});
    }
    action.addEventListener('pointerdown',function(e){
      if(e.button!==0||action.disabled||!action.hasAttribute('data-armed')||slingIsBusy(action)||state.active)return;
      var rect=wrap.getBoundingClientRect();state.scale=rect.width/(wrap.offsetWidth||rect.width)||1;
      cancelAnimationFrame(state.anim);state.anim=0;
      var p=coords(),dist=Math.hypot(p.x,p.y),clamped=Math.min(dist,.95*MAX_PULL),rawNow=dist>.5?(MAX_PULL*clamped)/(MAX_PULL-clamped):0;
      state.active=true;state.id=e.pointerId;state.startX=e.clientX;state.startY=e.clientY;state.armed=false;state.moved=false;state.hist=[];
      state.rawOrigin=dist>.5?{x:rawNow*p.x/dist,y:rawNow*p.y/dist}:{x:0,y:0};
      state.slop=e.pointerType==='touch'?SLOP_COARSE:SLOP_FINE;
      wrap.setAttribute('data-dragging','');action.setAttribute('data-held','');
      try{action.setPointerCapture(e.pointerId);}catch(_){}e.preventDefault();
    });
    action.addEventListener('pointermove',function(e){
      if(!state.active||e.pointerId!==state.id)return;
      var dx=(e.clientX-state.startX)/state.scale,dy=(e.clientY-state.startY)/state.scale,rx=state.rawOrigin.x+dx,ry=state.rawOrigin.y+dy;
      var axis='any';if(axis==='horizontal')ry=rubberband(ry,size/4);else if(axis==='vertical')rx=rubberband(rx,size/4);
      if(!state.moved&&Math.hypot(dx,dy)>state.slop)state.moved=true;
      var raw=Math.hypot(rx,ry);if(raw<.01)return;
      var d=(MAX_PULL*raw)/(MAX_PULL+raw),ux=rx/raw,uy=ry/raw;state.dir={ux:ux,uy:uy};setOffset(d*ux,d*uy);
      var now=performance.now();state.hist.push({x:d*ux,y:d*uy,t:now});while(state.hist.length>4||now-state.hist[0].t>80)state.hist.shift();
      var loaded=d>=ARM_AT;if(loaded!==state.armed){state.armed=loaded;wrap.toggleAttribute('data-loaded',loaded);}schedulePaint();e.preventDefault();
    });
    function finish(e,cancelled){
      if(!state.active||e.pointerId!==state.id)return;
      var g={moved:!!state.moved,hist:state.hist.slice()},d=Math.hypot(state.x,state.y),p=d/ARM_AT,ux=state.dir.ux,uy=state.dir.uy,vx=0,vy=0;
      try{action.releasePointerCapture(e.pointerId);}catch(_){}
      state.active=false;state.id=null;state.moved=false;wrap.removeAttribute('data-dragging');action.removeAttribute('data-held');
      if(!cancelled&&g.hist.length>1){var a=g.hist[0],b=g.hist[g.hist.length-1],dt=b.t-a.t;if(dt>0&&performance.now()-b.t<50){vx=(b.x-a.x)/dt*1000;vy=(b.y-a.y)/dt*1000;}}
      var fm=Math.hypot(vx,vy);if(fm>FINGER_MAX){vx*=FINGER_MAX/fm;vy*=FINGER_MAX/fm;}
      if(!g.moved){relaxIcon();if(!cancelled&&!action.disabled&&!slingIsBusy(action))sendFromRelease();}
      else{
        var fire=state.armed&&!cancelled,launch=fire?LAUNCH_SPEED*Math.min(p,POWER_CAP):CANCEL*LAUNCH_SPEED*Math.min(p,1);
        var v0x=vx-ux*launch,v0y=vy-uy*launch,m=Math.hypot(v0x,v0y);if(m>HAND_MAX){v0x*=HAND_MAX/m;v0y*=HAND_MAX/m;}
        if(fire&&!action.disabled&&!slingIsBusy(action))sendFromRelease();
        else{if(!cancelled)suppressNextClick();relaxIcon();}
        settle({x:v0x,y:v0y});
      }
      state.armed=false;wrap.removeAttribute('data-loaded');schedulePaint();e.preventDefault();
    }
    action.addEventListener('pointerup',function(e){finish(e,false);});
    action.addEventListener('pointercancel',function(e){finish(e,true);});
    action.addEventListener('lostpointercapture',function(e){finish(e,true);});
    action.addEventListener('click',function(e){if(state.skipClick&&e.detail!==0){state.skipClick=false;clearTimeout(state.skipTimer);e.preventDefault();e.stopImmediatePropagation();}},true);
    action.addEventListener('keydown',function(e){if(e.key==='Escape'&&state.active)finish({pointerId:state.id,preventDefault:function(){}},true);});
    schedulePaint();
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

    input.addEventListener('input',function(){
      pbTyping.energy=Math.min(1.6,pbTyping.energy+.22);
      pbTyping.strokes=Math.min(4,pbTyping.strokes+1);
      syncPrompt();
    });
    input.addEventListener('focus',function(){
      window.closeComposerTools?.();
      window.closeResponseEffortMenu?.();
    });

    bindSling(action);

    var promptObserver=new MutationObserver(syncPrompt);
    promptObserver.observe(action,{
      attributes:true,
      attributeFilter:['class','title','aria-label']
    });
    if(plus)promptObserver.observe(plus,{attributes:true,attributeFilter:['aria-expanded']});
    if(effort)promptObserver.observe(effort,{attributes:true,attributeFilter:['aria-expanded','data-max']});
    if(effortLabel)promptObserver.observe(effortLabel,{childList:true,characterData:true,subtree:true});
    var preview=doc.getElementById('filePreviewContainer');
    if(preview)promptObserver.observe(preview,{childList:true});

    syncPrompt();
    animatePromptGlyph(false);
  }

  function setPromptBusy(active,stopping){
    var bar=doc.getElementById('promptBar');
    var action=doc.getElementById('mainActionBtn');
    if(bar)bar.toggleAttribute('data-busy',!!active);
    if(action){
      if(active)action.setAttribute('data-armed','');
      action.disabled=false;
    }
    if(bar)bar.dataset.stopping=String(!!stopping);
    animatePromptGlyph(!!active);
    syncPrompt();
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
      downAt:Number.isFinite(Number(e.timeStamp))?Number(e.timeStamp):performance.now(),
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

    var eventNow=Number.isFinite(Number(e.timeStamp))?Number(e.timeStamp):performance.now();
    // Synthetic PointerEvents can report a zero/default timestamp while pointerdown
    // used a monotonic timestamp. Keep both ends in the same clock domain.
    if(eventNow<g.downAt)eventNow=performance.now();
    var held=Math.max(0,eventNow-g.downAt);
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
        // pointerup/pointercancel own normal gesture completion. Browsers may fire
        // lostpointercapture during release; do not finalize the same gesture twice.
        if(voiceGesture&&voiceGesture.id===e.pointerId&&!(e.buttons===0))voicePointerEnd(e,false);
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
    hydrateRefine:hydrateRefine,
    bindSling:bindSling
  };

  if(doc.readyState==='loading')doc.addEventListener('DOMContentLoaded',function(){setTimeout(start,0);},{once:true});
  else setTimeout(start,0);
})();
