/* JepongDevxyz AI — Grok clone frontend.
   Fresh build from GROK-BEHAVIOR-SPEC-2026-11-24.md. Reuses the /api/chat
   contract and local storage keys of the Qwen build so existing user data
   survives. Backend untouched. No alert()/confirm()/prompt() — custom
   dialogs only. CSS variables only. */
'use strict';
/* ---------- icons (Lucide-style stroke paths) ---------- */
const ICONS={
menu:'<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
image:'<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
globe:'<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
brain:'<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>',
wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
'audio-lines':'<path d="M2 10v4"/><path d="M6 6v12"/><path d="M10 3v18"/><path d="M14 8v8"/><path d="M18 5v14"/><path d="M22 10v4"/>',
mic:'<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
'arrow-up':'<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
'arrow-down':'<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',
'chevron-down':'<path d="m6 9 6 6 6-6"/>',
'chevron-right':'<path d="m9 18 6-6-6-6"/>',
'chevron-up':'<path d="m18 15-6-6-6 6"/>',
search:'<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
'message-square-plus':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v6"/><path d="M9 10h6"/>',
'square-pen':'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
user:'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
'user-plus':'<path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/>',
zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
copy:'<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
'volume-2':'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/>',
'rotate-ccw':'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
share:'<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/>',
ellipsis:'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
'trash-2':'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
pencil:'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
'git-branch':'<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
check:'<path d="M20 6 9 17l-5-5"/>',
lock:'<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
moon:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
monitor:'<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>',
'log-out':'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
info:'<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
'circle-help':'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
folder:'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
camera:'<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
file:'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
'arrow-left':'<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
pin:'<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/>',
shield:'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
gauge:'<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>'
};
const J_MARK='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 9h22"/><path d="M29 9v21a9 9 0 0 1-18 0v-3"/></svg>';
function icon(name,size){ size=size||18; const p=ICONS[name]||ICONS.info; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
function hydrateIcons(root){ (root||document).querySelectorAll('[data-icon]').forEach(el=>{ const n=el.getAttribute('data-icon'); const s=parseInt(el.getAttribute('data-size')||'18',10); el.innerHTML=icon(n,s); }); }

/* ---------- utils / storage ---------- */
const $=s=>document.querySelector(s);
const uid=()=> 'm'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function loadJSON(k,f){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch(e){ return f; } }
function saveJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function copyText(t){ if(navigator.clipboard&&navigator.clipboard.writeText){ return navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t)); } fallbackCopy(t); return Promise.resolve(); }
function fallbackCopy(t){ try{ const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }catch(e){} }
let toastTimer=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },2600); }

/* ---------- models / settings (same keys as the Qwen build) ---------- */
const MODELS=[
 {provider:'apinex', id:'free/deepseek-v4.1-flash', name:'DeepSeek V4.1 Flash', desc:'Default · Free'},
 {provider:'apinex', id:'free/deepseek-v4-flash-0731', name:'DeepSeek V4 Flash', desc:'Free'},
 {provider:'apinex', id:'free/deepseek-v4-pro-0813', name:'DeepSeek V4 Pro', desc:'Free'},
 {provider:'apinex', id:'free/gemini-4-hydrogen', name:'Gemini 4 Hydrogen', desc:'Free'},
 {provider:'apinex', id:'free/glm-5.3-flash', name:'GLM 5.3 Flash', desc:'Free'},
 {provider:'apinex', id:'free/glm-5.3-flashx', name:'GLM 5.3 FlashX', desc:'Free'},
 {provider:'apinex', id:'free/gpt-6-luna', name:'GPT-6 Luna', desc:'Free'},
 {provider:'apinex', id:'free/minimax-m3.1-flash', name:'MiniMax M3.1 Flash', desc:'Free'},
 {provider:'apinex', id:'free/qwen-3.8-max', name:'Qwen 3.8 Max', desc:'Free'}
];
// APINEX-only (2026-11-24): Bailu removed completely. These 9 free models
// passed a live retest the same day; the other free/ models are
// subscription-gated (402) despite the prefix and are NOT listed.
const SESS_KEY='jepongQwenReset.sessions.v1', SET_KEY='jepongQwenReset.settings.v1', PROJ_KEY='jepongQwenReset.projects.v1', EXTRA_KEY='jepongQwenReset.extra.v1';
const EFFORT={Auto:'Medium',Thinking:'High',Fast:'Instant'};
const defaultSettings=()=>({
  theme:'light', profileName:'Jepong', profileEmail:'', profilePhoto:'',
  provider:'apinex', model:'free/deepseek-v4.1-flash',
  responseMode:'Auto', webSearch:false, toolsEnabled:true, advancedEnabled:true,
  responseLang:{code:'auto', label:'Auto'},
  interface:{titleAuto:true, autoCopy:false, pasteAsFile:true},
  personalization:{nickname:'', about:'', style:'Default', custom:'', enableNew:true, refMemory:true, refHistory:true, savedMemory:''},
  advanced:{webScraping:true, imageSearch:true, webSearchAdv:true, imageGeneration:true, codeInterpreter:true, retrieveMemory:true, imageEditing:true, updateMemory:true, localEnlarge:true},
  cookies:{analytics:false, personalization:true},
  voice:{voiceURI:'', name:'', lang:'', rate:1, pitch:1, voiceMode:false, micDeviceId:''}
});
let settings=Object.assign(defaultSettings(), loadJSON(SET_KEY,{}));
settings.interface=Object.assign(defaultSettings().interface, settings.interface||{});
settings.personalization=Object.assign(defaultSettings().personalization, settings.personalization||{});
settings.advanced=Object.assign(defaultSettings().advanced, settings.advanced||{});
settings.cookies=Object.assign(defaultSettings().cookies, settings.cookies||{});
settings.voice=Object.assign(defaultSettings().voice, settings.voice||{});
settings.responseLang=Object.assign(defaultSettings().responseLang, settings.responseLang||{});
if(!MODELS.some(m=>m.provider===settings.provider&&m.id===settings.model)){ settings.provider='apinex'; settings.model='free/deepseek-v4.1-flash'; }
function saveSettings(){ saveJSON(SET_KEY, settings); }
let sessions=loadJSON(SESS_KEY,[]); if(!Array.isArray(sessions)) sessions=[];
let projects=loadJSON(PROJ_KEY,[]); if(!Array.isArray(projects)) projects=[];
let extra=loadJSON(EXTRA_KEY,{feedback:[],reports:[]}); if(!extra||typeof extra!=='object') extra={feedback:[],reports:[]};
if(!extra.usage) extra.usage={chat:0, image:0, voice:0};
function saveSessions(){ saveJSON(SESS_KEY, sessions); }
function saveProjects(){ saveJSON(PROJ_KEY, projects); }
function saveExtra(){ saveJSON(EXTRA_KEY, extra); }
function trackRequest(kind){ try{ extra.usage[kind]=(extra.usage[kind]||0)+1; saveExtra(); }catch(e){} }

let currentId=null, temporary=false;
let activeProjectId=null;
let searchQuery='';
let attachments=[];
let streaming=false, aborter=null;
let stickToBottom=true;
let activeMenu=null;
let suppressMenuClose=false;
function applyTheme(){ document.documentElement.setAttribute('data-theme', settings.theme||'light'); const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content',(settings.theme==='dark')?'#101011':'#fafaf8'); }
function modelOf(){ return MODELS.find(m=>m.id===settings.model)||MODELS[0]; }
function getSession(id){ return sessions.find(s=>s.id===id)||null; }
function curSession(){ return currentId?getSession(currentId):null; }
function timeGreeting(){ const h=new Date().getHours(); return h<12?'Good morning':(h<18?'Good afternoon':'Good evening'); }
function titleCase(t){ return String(t||'').trim().split(/\s+/).map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(' ').slice(0,48); }
function ensureSession(firstText){
  if(currentId){ const s=getSession(currentId); if(s) return s; }
  const s={id:uid(), title:titleCase(firstText)||'New chat', createdAt:Date.now(), updatedAt:Date.now(), messages:[], titleAutoPending:true, titleRequested:false, projectId:activeProjectId||null};
  sessions.unshift(s); currentId=s.id; saveSessions(); return s;
}
function historyFor(s,beforeId){ const out=[]; for(const m of s.messages){ if(m.id===beforeId) break; if(m.role==='user') out.push({role:'user', content:m.text||''}); else if(m.role==='assistant'&&m.text) out.push({role:'assistant', content:m.text||''}); } return out.slice(-20); }
function cleanAssistantText(t){
  t=String(t||'');
  t=t.replace(/\[\[JD_[A-Z_]+\]\][\s\S]*?\[\[\/JD_[A-Z_]+\]\]/g,'');
  t=t.replace(/\[\[JD_[A-Z_]+\]\]/g,'').replace(/\[\[\/JD_[A-Z_]+\]\]/g,'');
  return t.trim();
}
function buildPersonalization(){
  const p=settings.personalization||{};
  return {nickname:p.nickname||'', about:p.about||'', style:p.style||'Default', customInstruction:p.custom||'', enableInNewChat:p.enableNew!==false, referenceMemory:p.refMemory!==false, referenceHistory:p.refHistory!==false, savedMemory:p.savedMemory||''};
}

/* ---------- dialogs / menus / sheets ---------- */
let confirmResolve=null;
function showConfirm(o){
  $('#confirmTitle').textContent=o.title||'Are you sure?';
  $('#confirmText').textContent=o.text||'';
  const ok=$('#confirmOk'); ok.textContent=o.okLabel||'Delete';
  $('#confirmModal').hidden=false;
  return new Promise(res=>{ confirmResolve=res; });
}
function closeConfirm(v){ $('#confirmModal').hidden=true; if(confirmResolve){ const r=confirmResolve; confirmResolve=null; r(v); } }
function showInfo(title,text){ $('#infoModalTitle').textContent=title; $('#infoModalText').textContent=text; $('#infoModal').hidden=false; }
function closeSheet(sel){ const el=$(sel); if(el) el.hidden=true; }
function openSheet(sel){ document.querySelectorAll('.sheet').forEach(s=>{ if(s.id!==sel.slice(1)) s.hidden=true; }); $(sel).hidden=false; }
function closeAllSheets(){ document.querySelectorAll('.sheet').forEach(s=>s.hidden=true); }
function showMenu(x,y,items){
  closeMenu();
  const pop=document.createElement('div'); pop.className='menu-pop'; pop.id='menuPop';
  items.forEach(it=>{
    const b=document.createElement('button'); if(it.danger) b.className='danger';
    b.innerHTML='<span class="menu-ic">'+icon(it.icon||'info',16)+'</span><span>'+esc(it.label)+'</span>';
    b.addEventListener('click',()=>{ closeMenu(); it.onClick&&it.onClick(); });
    pop.appendChild(b);
  });
  document.body.appendChild(pop);
  suppressMenuClose=true; /* the click that opened this menu bubbles to the
    document closer afterwards — it must not close what it just opened */
  const vw=window.innerWidth, vh=window.innerHeight;
  const w=pop.offsetWidth||200, h=pop.offsetHeight||items.length*40;
  pop.style.left=Math.max(8,Math.min(x,vw-w-8))+'px';
  pop.style.top=Math.max(8,Math.min(y,vh-h-8))+'px';
  activeMenu=pop;
}
function closeMenu(){ if(activeMenu){ activeMenu.remove(); activeMenu=null; } }

/* ---------- markdown (compact, complete) ---------- */
function inlineMd(s){
  s=esc(s);
  s=s.replace(/`([^`\n]+)`/g,'<code>$1</code>');
  s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  s=s.replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>');
  s=s.replace(/~~([^~]+)~~/g,'<del>$1</del>');
  s=s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  s=s.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g,'$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return s;
}
function codeBlockHtml(lang,code){
  const lines=String(code).replace(/\n$/,'').split('\n');
  const lns=lines.map((_,i)=>'<div>'+(i+1)+'</div>').join('');
  return '<div class="code-block" data-code="'+esc(code)+'"><div class="code-head"><span class="code-lang">'+esc(lang||'code')+'</span>'
    +'<button type="button" data-code-act="copy" aria-label="Copy code">'+icon('copy',15)+'</button>'
    +'<button type="button" data-code-act="download" aria-label="Download code">'+icon('download',15)+'</button>'
    +'<button type="button" data-code-act="collapse" aria-label="Collapse code">'+icon('chevron-up',14)+'</button></div>'
    +'<div class="code-body"><div class="code-lns">'+lns+'</div><pre><code>'+esc(code)+'</code></pre></div></div>';
}
function mdToHtml(text){
  const src=String(text||'');
  const blocks=[]; const lines=src.split('\n'); let i=0; let html='';
  const flushPara=()=>{ if(blocks.length){ html+='<p>'+blocks.map(inlineMd).join('<br>')+'</p>'; blocks.length=0; } };
  while(i<lines.length){
    const line=lines[i];
    const fence=line.match(/^```(\w*)\s*$/);
    if(fence){ flushPara(); const lang=fence[1]||''; const buf=[]; i++;
      while(i<lines.length&&!lines[i].startsWith('```')){ buf.push(lines[i]); i++; }
      i++; html+=codeBlockHtml(lang,buf.join('\n')); continue; }
    const th=line.match(/^(#{1,3})\s+(.*)$/);
    if(th){ flushPara(); const lvl=th[1].length; html+='<h'+lvl+'>'+inlineMd(th[2])+'</h'+lvl+'>'; i++; continue; }
    if(/^\s*---+\s*$/.test(line)){ flushPara(); html+='<hr>'; i++; continue; }
    if(/^\s*>\s?(.*)$/.test(line)){ flushPara(); const q=[]; while(i<lines.length&&/^\s*>\s?/.test(lines[i])){ q.push(lines[i].replace(/^\s*>\s?/,'')); i++; } html+='<blockquote>'+q.map(inlineMd).join('<br>')+'</blockquote>'; continue; }
    if(/^\s*\|.*\|\s*$/.test(line)&&i+1<lines.length&&/^\s*\|[\s:|-]+\|\s*$/.test(lines[i+1])){
      flushPara();
      const parseRow=r=>r.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      const head=parseRow(line); i+=2; let rows='';
      while(i<lines.length&&/^\s*\|.*\|\s*$/.test(lines[i])){ const cells=parseRow(lines[i]); rows+='<tr>'+cells.map(c=>'<td>'+inlineMd(c)+'</td>').join('')+'</tr>'; i++; }
      html+='<table><thead><tr>'+head.map(c=>'<th>'+inlineMd(c)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table>'; continue; }
    if(/^\s*([-*]|\d+\.)\s+/.test(line)){
      flushPara(); const ordered=/^\s*\d+\.\s+/.test(line); const items=[];
      while(i<lines.length&&/^\s*([-*]|\d+\.)\s+/.test(lines[i])){ items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/,'')); i++; }
      html+='<'+(ordered?'ol':'ul')+'>'+items.map(t=>'<li>'+inlineMd(t)+'</li>').join('')+'</'+(ordered?'ol':'ul')+'>'; continue; }
    if(line.trim()===''){ flushPara(); i++; continue; }
    blocks.push(line); i++;
  }
  flushPara();
  return html||'<p></p>';
}
function extractUrls(text){
  const found=[]; const seen=new Set();
  String(text||'').replace(/https?:\/\/[^\s<>"')\]]+/g, u=>{
    const clean=u.replace(/[.,;:!?]+$/,'');
    if(!seen.has(clean)){ seen.add(clean); found.push(clean); }
    return u;
  });
  return found;
}
function hostOf(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return u; } }

/* ---------- voice (device voices, cleaned labels, validated selection) ---------- */
const SPOKEN_LANGS=['Auto Detect','English','Filipino','Spanish','French','German','Italian','Portuguese','Japanese','Korean','Chinese','Hindi','Indonesian'];
let _voices=[];
function loadVoices(){ try{ _voices=(window.speechSynthesis&&speechSynthesis.getVoices)?speechSynthesis.getVoices():[]; }catch(e){ _voices=[]; } }
function cleanVoice(v){
  let raw=String(v.name||'').trim();
  const script=/#(Cyrl|Latn)/.exec(raw);
  raw=raw.replace(/\s*#(Cyrl|Latn)\s*/g,'').trim();
  let title=raw, sub='';
  const m=raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if(m){ title=m[1].trim(); sub=m[2].trim(); }
  if(!sub) sub=langNameOf(v.lang||'');
  if(script) sub+=' · '+(script[1]==='Cyrl'?'Cyrillic':'Latin');
  if(v.default) sub+=' · Default';
  return {uri:v.voiceURI, name:String(v.name||'').trim(), title, sub, lang:v.lang||''};
}
function langNameOf(code){
  try{ const dn=new Intl.DisplayNames(['en'],{type:'language'}); const base=String(code||'').split(/[-_]/)[0]; const n=dn.of(base); return n||code; }catch(e){ return code; }
}
function voiceCatalog(){
  loadVoices();
  const seen=new Set(); const out=[];
  _voices.forEach(v=>{ const c=cleanVoice(v); const key=c.uri+'|'+c.title+'|'+c.sub; if(seen.has(key)) return; seen.add(key); out.push(c); });
  out.sort((a,b)=>a.title.localeCompare(b.title));
  return out;
}
function resolveVoiceEntry(){
  const cat=voiceCatalog();
  if(!settings.voice.voiceURI) return null;
  const hit=cat.find(c=>c.uri===settings.voice.voiceURI);
  if(!hit) return null;
  if(settings.voice.name&&hit.name!==settings.voice.name&&hit.title!==settings.voice.name) return null;
  return hit;
}
function speak(text,voiceURI){
  /* Fire-and-forget wrapper; speakAsync() is the awaitable form used by
     voice mode. Returns true when a synthesis attempt was made. */
  if(!('speechSynthesis' in window)) return false;
  speakAsync(text,voiceURI);
  return true;
}
function speakAsync(text,voiceURI){
  return new Promise(res=>{
    if(!('speechSynthesis' in window)){ res(false); return; }
    try{
      speechSynthesis.cancel();
      const u=new SpeechSynthesisUtterance(String(text||'').slice(0,1200));
      const uri=voiceURI!==undefined?voiceURI:(resolveVoiceEntry()?resolveVoiceEntry().uri:'');
      if(uri){ const v=_voices.find(v=>v.voiceURI===uri); if(v) u.voice=v; }
      if(settings.voice.lang) u.lang=settings.voice.lang;
      u.rate=settings.voice.rate||1; u.pitch=settings.voice.pitch||1;
      let done=false; const fin=v=>{ if(!done){ done=true; res(v); } };
      u.onend=()=>fin(true); u.onerror=()=>fin(false);
      speechSynthesis.speak(u);
      /* Safety net: a speech engine that never fires onend/onerror must not
         hang a voice conversation forever. */
      setTimeout(()=>fin(false), 90000);
    }catch(e){ res(false); }
  });
}
function stopSpeak(){ try{ if('speechSynthesis' in window) speechSynthesis.cancel(); }catch(e){} }

/* ---------- rendering ---------- */
function groupOf(ts){
  const d=new Date(ts), now=new Date();
  const dayStart=x=>{ const c=new Date(x); c.setHours(0,0,0,0); return c.getTime(); };
  if(dayStart(d)===dayStart(now)) return 'Today';
  if(Date.now()-ts<7*86400000) return 'Previous 7 Days';
  return 'Older';
}
function renderSidebar(){
  const list=$('#chatList');
  let items=sessions.slice();
  if(activeProjectId) items=items.filter(s=>s.projectId===activeProjectId);
  if(searchQuery){ const q=searchQuery.toLowerCase(); items=items.filter(s=>(s.title||'').toLowerCase().includes(q)||(s.messages||[]).some(m=>(m.text||'').toLowerCase().includes(q))); }
  const pinned=items.filter(s=>s.pinned), rest=items.filter(s=>!s.pinned);
  let html='';
  if(activeProjectId){ const p=projects.find(p=>p.id===activeProjectId); html+='<div class="sb-group">'+esc(p?p.name:'Project')+' · <a href="#" id="clearProj" style="color:var(--accent)">All chats</a></div>'; }
  if(pinned.length){ html+='<div class="sb-group">Pinned</div>'+pinned.map(itemHtml).join(''); }
  const groups=['Today','Previous 7 Days','Older'];
  groups.forEach(g=>{
    const gItems=rest.filter(s=>groupOf(s.updatedAt||s.createdAt)===g);
    if(gItems.length) html+='<div class="sb-group">'+g+'</div>'+gItems.map(itemHtml).join('');
  });
  if(!items.length) html+='<div class="sb-empty">'+(searchQuery?'No chats match your search.':'No chats yet. Start a new one.')+'</div>';
  list.innerHTML=html;
  const cp=$('#clearProj'); if(cp) cp.addEventListener('click',e=>{ e.preventDefault(); activeProjectId=null; renderSidebar(); });
  list.querySelectorAll('.sb-item').forEach(el=>{
    el.addEventListener('click',e=>{ if(e.target.closest('.sb-item-menu')) return; openSession(el.dataset.id); });
    const menuBtn=el.querySelector('.sb-item-menu');
    if(menuBtn) menuBtn.addEventListener('click',e=>{ e.stopPropagation(); chatItemMenu(el.dataset.id, menuBtn); });
  });
  hydrateIcons(list);
}
function itemHtml(s){
  return '<button class="sb-item'+(s.id===currentId?' active':'')+'" data-id="'+s.id+'"><span class="sb-item-title">'+esc(s.title||'New chat')+'</span><span class="sb-item-menu" role="button" aria-label="Chat options">'+icon('ellipsis',16)+'</span></button>';
}
function chatItemMenu(id,anchor){
  const s=getSession(id); if(!s) return;
  const r=anchor.getBoundingClientRect();
  const projItems=projects.map(p=>({icon:'folder', label:'Move to '+p.name, onClick:()=>{ s.projectId=p.id; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); toast('Moved to '+p.name); }}));
  showMenu(r.left, r.bottom+4, [
    {icon:'pin', label:s.pinned?'Unpin':'Pin', onClick:()=>{ s.pinned=!s.pinned; saveSessions(); renderSidebar(); }},
    {icon:'pencil', label:'Rename', onClick:()=>renameChat(id)},
    ...projItems,
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteChat(id)}
  ]);
}
async function renameChat(id){
  const s=getSession(id); if(!s) return;
  const name=await promptDialog('Rename chat','Chat name', s.title||'');
  if(name===null) return;
  s.title=name.trim()||s.title; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); renderAll();
}
async function deleteChat(id){
  const s=getSession(id); if(!s) return;
  const ok=await showConfirm({title:'Delete chat?', text:'"'+(s.title||'New chat')+'" will be permanently deleted.', okLabel:'Delete'});
  if(!ok) return;
  sessions=sessions.filter(x=>x.id!==id);
  if(currentId===id){ currentId=null; }
  saveSessions(); renderAll();
}
function promptDialog(title,label,initial){
  return new Promise(res=>{
    const m=$('#infoModal'); $('#infoModalTitle').textContent=title;
    const body=$('#infoModalText');
    body.innerHTML='';
    const lab=document.createElement('label'); lab.className='field-label'; lab.textContent=label;
    const inp=document.createElement('input'); inp.className='field'; inp.value=initial||''; inp.maxLength=60;
    body.appendChild(lab); body.appendChild(inp);
    const ok=$('#infoModalOk'); const cancel=$('#infoModalCancel');
    if(cancel) cancel.hidden=false;
    m.hidden=false;
    const done=v=>{ ok.removeEventListener('click',onOk); if(cancel) cancel.removeEventListener('click',onCancel); if(cancel) cancel.hidden=true; m.hidden=true; body.innerHTML=''; res(v); };
    const onOk=()=>done(inp.value);
    const onCancel=()=>done(null);
    ok.addEventListener('click',onOk);
    if(cancel) cancel.addEventListener('click',onCancel);
    setTimeout(()=>inp.focus(),50);
  });
}
function openSession(id){
  currentId=id; temporary=false;
  closeSidebarMobile(); renderAll();
  const cv=$('#chatView'); cv.scrollTop=cv.scrollHeight; stickToBottom=true; updateScrollBtn();
}
function newChat(){
  currentId=null; temporary=false;
  closeSidebarMobile(); renderAll();
  $('#composerInput').focus();
}
function closeSidebarMobile(){ if(window.innerWidth<1024){ $('#sidebar').classList.remove('open'); $('#scrim').hidden=true; } }
function renderAll(){
  applyTheme();
  const s=curSession();
  const hasChat=!!s;
  $('#homeView').hidden=hasChat;
  $('#chatView').hidden=!hasChat;
  $('#greetLine1').textContent=timeGreeting()+', '+(settings.profileName||'Jepong');
  $('#profileNameLabel').textContent=settings.profileName||'Jepong';
  $('#profileAvatar').textContent=(settings.profileName||'J')[0].toUpperCase();
  $('#topTitle').textContent=hasChat?(s.title||'New chat'):'JepongDevxyz AI';
  $('#modelName').textContent=modelOf().name;
  $('#modelMark').innerHTML=J_MARK;
  $('#composerInput').placeholder=hasChat?'Ask JepongDevxyz AI anything':'Ask anything...';
  renderSidebar(); renderMessages(); renderComposerState();
}
function renderComposerState(){
  const input=$('#composerInput');
  const hasText=input.value.trim().length>0||attachments.length>0;
  /* Grok rule: ONE slot on the right. Empty composer (no text, no
     attachments, not streaming) shows the Voice-mode waveform ONLY; the
     Send arrow appears only once there is text or an attachment. */
  /* Queued sends (Bug 1 fix): Send stays enabled while streaming so a tap
     queues the message instead of dropping it — see sendQueue. */
  $('#sendBtn').disabled=!hasText;
  $('#sendBtn').hidden=!hasText;
  $('#sendBtn').classList.toggle('home', !curSession());
  $('#voiceBtn').hidden=streaming||hasText;
  $('#micBtn').hidden=streaming;
  $('#stopBtn').hidden=!streaming;
  $('#searchToolBtn').classList.toggle('active', !!settings.webSearch);
  $('#thinkToolBtn').classList.toggle('active', settings.responseMode==='Thinking');
  const bar=$('#attachBar');
  if(attachments.length){
    bar.hidden=false;
    bar.innerHTML=attachments.map((a,i)=>'<span class="att-chip">'+esc(a.name)+'<button type="button" data-att-del="'+i+'" aria-label="Remove attachment">'+icon('x',13)+'</button></span>').join('');
    bar.querySelectorAll('[data-att-del]').forEach(b=>b.addEventListener('click',()=>{ attachments.splice(parseInt(b.getAttribute('data-att-del'),10),1); renderComposerState(); renderAttachBar(); }));
  } else { bar.hidden=true; bar.innerHTML=''; }
  const st=$('#attachState'); if(st) st.textContent=attachments.length? attachments.length+' file(s) selected':'No file selected';
}
function renderAttachBar(){ renderComposerState(); }
function renderMessages(){
  const s=curSession(); const box=$('#messages');
  if(!s){ box.innerHTML=''; return; }
  let html='';
  s.messages.forEach(m=>{
    if(m.role==='user'){
      html+='<div class="msg user" data-mid="'+m.id+'"><div class="msg-bubble">'
        +((m.attachments||[]).map(a=>'<span class="att-chip">'+esc(a.name)+'</span>').join(''))
        +esc(m.text)+'</div><div class="msg-user-actions">'
        +'<button type="button" class="icon-btn" data-u-act="copy" data-mid="'+m.id+'" aria-label="Copy">'+icon('copy',15)+'</button>'
        +'<button type="button" class="icon-btn" data-u-act="edit" data-mid="'+m.id+'" aria-label="Edit">'+icon('pencil',15)+'</button>'
        +'<button type="button" class="icon-btn" data-u-act="delete" data-mid="'+m.id+'" aria-label="Delete">'+icon('trash-2',15)+'</button>'
        +'</div></div>';
    } else {
      html+=assistantHtml(s,m);
    }
  });
  box.innerHTML=html;
  box.querySelectorAll('[data-u-act]').forEach(b=>b.addEventListener('click',()=>userMsgAction(b.getAttribute('data-u-act'), b.getAttribute('data-mid'))));
  box.querySelectorAll('[data-a-act]').forEach(b=>b.addEventListener('click',()=>asstAction(b.getAttribute('data-a-act'), b.getAttribute('data-mid'))));
  box.querySelectorAll('[data-code-act]').forEach(b=>b.addEventListener('click',()=>codeAction(b)));
  box.querySelectorAll('.think-row').forEach(r=>r.addEventListener('click',()=>{ const steps=r.parentElement.querySelector('.think-steps'); if(steps) steps.hidden=!steps.hidden; const ch=r.querySelector('.think-chev'); if(ch) ch.innerHTML=icon(steps&&!steps.hidden?'chevron-up':'chevron-right',13); }));
  box.querySelectorAll('[data-src-open]').forEach(b=>b.addEventListener('click',()=>openSources(b.getAttribute('data-src-open'))));
  box.querySelectorAll('[data-src-chip]').forEach(c=>c.addEventListener('click',()=>openSources(c.getAttribute('data-src-chip'))));
  if(stickToBottom){ const cv=$('#chatView'); cv.scrollTop=cv.scrollHeight; }
}
function assistantHtml(s,m){
  let h='<div class="msg asst" data-mid="'+m.id+'">';
  const showThink=m.thinkMode&&m.thinkMode!=='Fast';
  if(showThink||m.thoughtStopped){
    const live=!!m.pending;
    const label=m.thoughtStopped?'Stopped':(live?'Thinking…':'Thinking');
    const steps=(m.activity||[]);
    h+='<div class="think-row" role="button"><span class="'+(live?'spin':'')+'">'+(live?'':'<span style="display:inline-flex;color:var(--muted)">'+icon('brain',15)+'</span>')+'</span><span class="think-label">'+esc(label)+'</span><span class="think-chev">'+icon('chevron-right',13)+'</span></div>';
    if(steps.length){
      h+='<div class="think-steps"'+(live?'':' hidden')+'>'+steps.map(a=>'<div class="think-step'+(a.state==='completed'?' done':'')+'"><span class="st-ic">'+(a.state==='completed'?icon('check',13):icon('gauge',13))+'</span><span>'+esc(a.label||'')+(a.detail?'<span class="st-detail">'+esc(a.detail)+'</span>':'')+'</span></div>').join('')+'</div>';
    }
  }
  if(m.image){ h+='<div class="img-card"><img src="'+esc(m.image)+'" alt="Generated image"></div>'; }
  if(m.text){ h+='<div class="msg-asst">'+mdToHtml(m.text)+'</div>'; }
  if(m.errorCard){ h+='<div class="err-card"><div class="err-title">Image generation limit</div><div>'+esc(m.errorCard)+'</div><button type="button" class="btn-primary" data-a-act="upgrade" data-mid="'+m.id+'">Upgrade</button></div>'; }
  const urls=extractUrls(m.text||'');
  if(urls.length||m.image){
    h+='<div><button type="button" class="sources-btn" data-src-open="'+m.id+'">'+icon('globe',14)+'<span>Sources</span></button> '
      +urls.slice(0,3).map(u=>'<a class="src-chip" href="#" data-src-chip="'+m.id+'">'+esc(hostOf(u))+'</a>').join('')+'</div>';
  }
  if(!m.pending){
    h+='<div class="action-bar">'
      +'<button type="button" data-a-act="copy" data-mid="'+m.id+'">'+icon('copy',15)+'<span>Copy</span></button>'
      +'<button type="button" data-a-act="read" data-mid="'+m.id+'">'+icon('volume-2',15)+'<span>Read aloud</span></button>'
      +'<button type="button" data-a-act="regen" data-mid="'+m.id+'">'+icon('rotate-ccw',15)+'<span>Regenerate</span></button>'
      +'<button type="button" data-a-act="share" data-mid="'+m.id+'">'+icon('share',15)+'<span>Share</span></button>'
      +'<button type="button" data-a-act="more" data-mid="'+m.id+'">'+icon('ellipsis',15)+'</button>'
      +'</div>';
  }
  return h+'</div>';
}
function codeAction(btn){
  const block=btn.closest('.code-block'); if(!block) return;
  const code=block.getAttribute('data-code')||'';
  const act=btn.getAttribute('data-code-act');
  if(act==='copy'){ copyText(code).then(()=>toast('Code copied')); }
  else if(act==='download'){
    const blob=new Blob([code],{type:'text/plain'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='code.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }
  else if(act==='collapse'){ const body=block.querySelector('.code-body'); if(body){ body.hidden=!body.hidden; btn.innerHTML=icon(body.hidden?'chevron-down':'chevron-up',14); } }
}
function userMsgAction(act,mid){
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  if(act==='copy'){ copyText(m.text).then(()=>toast('Copied')); }
  else if(act==='delete'){ s.messages=s.messages.filter(x=>x.id!==mid); s.updatedAt=Date.now(); saveSessions(); renderMessages(); }
  else if(act==='edit'){ editUserMessage(s,m); }
}
async function editUserMessage(s,m){
  /* Bug 2 fix (same guard as Janna e39ffcb): editing an early message used to
     silently delete every later turn. Now the user is warned first; Cancel
     returns to the editor with the draft kept and nothing deleted. */
  let draft=m.text||'';
  for(;;){
    const next=await promptDialog('Edit message','Message', draft);
    if(next===null||next===undefined) return;
    const idx=s.messages.indexOf(m);
    if(idx<0) return;
    const trimmed=next.trim();
    if(!trimmed) return;
    const laterUsers=s.messages.slice(idx+1).filter(x=>x.role==='user').length;
    if(laterUsers>0){
      const ok=await showConfirm({title:'Edit this message?', text:'There are '+laterUsers+' more exchange'+(laterUsers>1?'s':'')+' after this one. Editing will remove them and start a new answer from here.', okLabel:'Edit anyway'});
      if(!ok){ draft=trimmed; continue; }
    }
    s.messages=s.messages.slice(0,idx);
    s.updatedAt=Date.now(); saveSessions();
    const userMsg={id:uid(), role:'user', text:trimmed, createdAt:Date.now(), attachments:[]};
    s.messages.push(userMsg); saveSessions(); renderAll();
    await runChatStream(s,userMsg,[]);
    return;
  }
}
function asstAction(act,mid){
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  if(act==='copy'){ copyText(m.text||'').then(()=>toast('Copied')); }
  else if(act==='read'){ readAloud(m); }
  else if(act==='regen'){ regenerate(s,m); }
  else if(act==='share'){ copyText(location.origin+location.pathname).then(()=>toast('Link copied')); }
  else if(act==='upgrade'){ openInfoPage('upgrade'); }
  else if(act==='more'){ asstMoreMenu(m,mid); }
}
function asstMoreMenu(m,mid){
  const btn=document.querySelector('[data-a-act="more"][data-mid="'+mid+'"]');
  const r=btn?btn.getBoundingClientRect():{left:120,bottom:200};
  showMenu(Math.min(r.left,window.innerWidth-210), r.top-190, [
    {icon:'trash-2', label:'Delete', danger:true, onClick:async()=>{ const ok=await showConfirm({title:'Delete message?', text:'This answer will be deleted.', okLabel:'Delete'}); if(!ok) return; const s=curSession(); if(!s) return; s.messages=s.messages.filter(x=>x.id!==mid); s.updatedAt=Date.now(); saveSessions(); renderMessages(); }},
    {icon:'git-branch', label:'Branch conversation', onClick:()=>branchFrom(mid)},
    {icon:'image', label:'Create image', onClick:()=>{ const s=curSession(); if(!s) return; const userMsg={id:uid(), role:'user', text:String(m.text||'').slice(0,500), createdAt:Date.now(), attachments:[]}; s.messages.push(userMsg); saveSessions(); runImageGeneration(s,userMsg); }},
    {icon:'volume-2', label:'Listen', onClick:()=>readAloud(m)}
  ]);
}
function readAloud(m){
  const btn=document.querySelector('[data-a-act="read"][data-mid="'+m.id+'"]');
  if(btn&&btn.classList.contains('active')){ stopSpeak(); btn.classList.remove('active'); return; }
  if(!('speechSynthesis' in window)){ toast('Read aloud is not supported in this browser'); return; }
  loadVoices();
  if(speak(m.text||'')){ if(btn) btn.classList.add('active'); setTimeout(()=>{ if(btn) btn.classList.remove('active'); }, Math.min(60000, Math.max(4000,(m.text||'').length*90))); }
  else toast('Read aloud is not supported in this browser');
}
function branchFrom(mid){
  const s=curSession(); if(!s) return;
  const idx=s.messages.findIndex(x=>x.id===mid); if(idx<0) return;
  const copy={id:uid(), title:(s.title||'New chat')+' (branch)', createdAt:Date.now(), updatedAt:Date.now(), messages:JSON.parse(JSON.stringify(s.messages.slice(0,idx+1))), titleAutoPending:false, titleRequested:true, projectId:s.projectId||null};
  sessions.unshift(copy); saveSessions(); openSession(copy.id); toast('Branched into a new chat');
}
function openSources(mid){
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  const urls=extractUrls(m.text||'');
  const web=$('#sourcesWeb'), imgs=$('#sourcesImages');
  web.innerHTML=urls.length? urls.map((u,i)=>'<a class="src-row" href="'+esc(u)+'" target="_blank" rel="noopener"><span class="src-num">'+(i+1)+'</span><span><span class="src-title">'+esc(hostOf(u))+'</span><br><span class="src-host">'+esc(u)+'</span></span></a>').join('') : '<div class="src-empty">No web sources in this answer.</div>';
  imgs.innerHTML=m.image? '<a class="src-row" href="'+esc(m.image)+'" target="_blank" rel="noopener"><span class="src-num">1</span><span><span class="src-title">Generated image</span><br><span class="src-host">Image from this conversation</span></span></a>' : '<div class="src-empty">No images found</div>';
  document.querySelectorAll('[data-src-tab]').forEach(t=>t.addEventListener('click',()=>{
    document.querySelectorAll('[data-src-tab]').forEach(x=>x.classList.remove('active')); t.classList.add('active');
    const tab=t.getAttribute('data-src-tab'); web.hidden=tab!=='web'; imgs.hidden=tab!=='images';
  }));
  document.querySelector('[data-src-tab="web"]').classList.add('active');
  document.querySelector('[data-src-tab="images"]').classList.remove('active');
  web.hidden=false; imgs.hidden=true;
  openSheet('#sourcesDialog');
}
async function regenerate(s,m){
  m.text=''; m.activity=[]; m.thoughtStopped=false; m.pending=true; m.thinkMode=settings.responseMode;
  const userMsg=[...s.messages].reverse().find(x=>x.role==='user');
  renderMessages();
  await streamInto(s,userMsg||{text:''},m,[]);
}
function updateScrollBtn(){
  const cv=$('#chatView'); if(!cv) return;
  const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
  $('#scrollBottom').hidden=!(curSession()&&dist>240);
}

/* ---------- composer / send / streaming ---------- */
function autosize(){
  const input=$('#composerInput');
  input.style.height='auto';
  input.style.height=Math.min(input.scrollHeight,140)+'px';
}
function setStreaming(on){
  streaming=on;
  $('#stopBtn').hidden=!on; $('#sendBtn').hidden=on;
  renderComposerState();
}
let sendQueue=[]; /* Bug 1 fix: messages sent while a reply streams are queued, never dropped */
async function sendMessage(presetText){
  const input=$('#composerInput'); const text=(presetText!==undefined?presetText:input.value).trim();
  if(!text&&!attachments.length) return;
  const s=ensureSession(text);
  const userMsg={id:uid(), role:'user', text, createdAt:Date.now(), attachments:attachments.map(a=>({name:a.name, kind:a.kind}))};
  const filePayload=attachments.slice();
  const tool=activeTool; activeTool=null;
  s.messages.push(userMsg); s.updatedAt=Date.now(); if(!temporary) saveSessions();
  attachments=[]; renderAttachBar();
  if(presetText===undefined){ input.value=''; autosize(); renderComposerState(); }
  renderAll();
  if(streaming){ sendQueue.push({s,userMsg,filePayload,tool}); return; }
  if(tool==='image'){ try{ await runImageGeneration(s,userMsg); }finally{ drainSendQueue(); } return; }
  try{ await runChatStream(s,userMsg,filePayload); }finally{ drainSendQueue(); }
}
function drainSendQueue(){
  if(streaming||!sendQueue.length) return;
  const next=sendQueue.shift();
  if(!getSession(next.s.id)){ drainSendQueue(); return; }
  if(next.tool==='image'){ runImageGeneration(next.s,next.userMsg).then(drainSendQueue,drainSendQueue); return; }
  runChatStream(next.s,next.userMsg,next.filePayload).then(drainSendQueue,drainSendQueue);
}
let activeTool=null;
async function runChatStream(s,userMsg,filePayload){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true, thinkMode:settings.responseMode};
  s.messages.push(asst); renderMessages();
  await streamInto(s,userMsg,asst,filePayload);
}
async function streamInto(s,userMsg,asst,filePayload){
  setStreaming(true); aborter=('AbortController' in window)?new AbortController():null;
  asst.thinkMode=settings.responseMode; asst.thoughtStopped=false; asst.textReceived=false;
  const web=!!settings.webSearch&&settings.advancedEnabled!==false&&settings.advanced.webSearchAdv;
  const body={ message:userMsg.text, history:historyFor(s,userMsg.id), files:filePayload||[],
    provider:settings.provider, model:settings.model, mode:'general',
    customPrompt:'', webSearch:web, forceWebSearch:web,
    autoFallback:true, smartRouter:false, activityStream:true, autoTools:settings.toolsEnabled,
    clientTimeZone:(Intl&&Intl.DateTimeFormat&&Intl.DateTimeFormat().resolvedOptions().timeZone)||'Asia/Manila',
    clientUtcOffsetMinutes:-new Date().getTimezoneOffset(),
    personalization:Object.assign(buildPersonalization(),{intelligence:EFFORT[settings.responseMode]||'Medium', fastAnswers:settings.responseMode==='Fast', advancedWebSearch:web}) };
  trackRequest('chat');
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:aborter?aborter.signal:undefined});
    if(!res.ok) throw new Error('Request failed ('+res.status+')');
    const ct=(res.headers&&res.headers.get&&res.headers.get('content-type'))||'';
    if(res.body&&res.body.getReader&&ct.includes('text/event-stream')){
      await readSSE(res.body.getReader(), s, asst);
    } else {
      const raw=await res.text();
      let data=null; try{ data=JSON.parse(raw); }catch(e){}
      asst.text=(data&&typeof data==='object'?(data.text||data.reply||data.message||data.content||''):raw)||'';
      if(asst.text) asst.textReceived=true;
    }
  }catch(err){
    if(err&&err.name==='AbortError'){
      if(!asst.textReceived&&!asst.text){ asst.thoughtStopped=true; asst.text=''; }
      else asst.text+=(asst.text?'\n\n':'')+'_Stopped._';
    }
    else { asst.text=(asst.text?asst.text+'\n\n':'')+'⚠ '+(err&&err.message?err.message:'Something went wrong.'); asst.activity.push({label:'Request failed', state:'error', detail:String(err&&err.message||err), at:Date.now()}); }
  }finally{
    asst.text=cleanAssistantText(asst.text);
    asst.pending=false;
    s.updatedAt=Date.now(); if(!temporary) saveSessions();
    setStreaming(false); renderAll();
    if(settings.voice.voiceMode&&asst.text&&!vmOpen) speak(asst.text);
    if(settings.interface.autoCopy&&asst.text) copyText(asst.text);
    if(!temporary&&s.titleAutoPending&&!s.titleRequested&&s.messages.length===2&&s.messages[0].role==='user'&&asst.text&&!asst.activity.some(a=>a.state==='error')&&getSession(s.id)===s){
      const sid=s.id; setTimeout(()=>{ generateTitle(sid).catch(()=>{}); },3000);
    }
  }
}
async function readSSE(reader,s,asst){
  const decoder=('TextDecoder' in window)?new TextDecoder():null;
  let buf='';
  const handleBlock=block=>{
    let ev='message', data='';
    block.split('\n').forEach(line=>{ if(line.startsWith(':')) return; if(line.startsWith('event:')) ev=line.slice(6).trim(); else if(line.startsWith('data:')) data+=line.slice(5).trim(); });
    if(!data) return; let obj=null; try{ obj=JSON.parse(data); }catch(e){}
    if(ev==='text'&&obj&&typeof obj.text==='string'){ asst.text+=obj.text; if(obj.text) asst.textReceived=true; paintAssistant(s,asst); }
    else if(ev==='activity'&&obj){ const ex=asst.activity.find(a=>a.id&&obj.id&&a.id===obj.id); if(ex) Object.assign(ex,obj); else asst.activity.push(obj); paintAssistant(s,asst); }
    else if(ev==='artifact'&&obj){ asst.artifacts=asst.artifacts||[]; asst.artifacts.push(obj); }
    else if(ev==='error'&&obj){ throw new Error(obj.message||'Stream error'); }
  };
  for(;;){
    const {done,value}=await reader.read(); if(done) break;
    buf+=decoder?decoder.decode(value,{stream:true}):String(value);
    let idx; while((idx=buf.indexOf('\n\n'))>=0){ const block=buf.slice(0,idx); buf=buf.slice(idx+2); if(block.trim()) handleBlock(block); }
  }
  if(buf.trim()) handleBlock(buf);
}
function paintAssistant(s,asst){
  const box=$('#messages'); if(!box) return;
  const el=box.querySelector('[data-mid="'+asst.id+'"]');
  if(!el){ renderMessages(); return; }
  const tmp=document.createElement('div'); tmp.innerHTML=assistantHtml(s,asst);
  const fresh=tmp.firstChild;
  el.replaceWith(fresh);
  fresh.querySelectorAll('[data-a-act]').forEach(b=>b.addEventListener('click',()=>asstAction(b.getAttribute('data-a-act'), b.getAttribute('data-mid'))));
  fresh.querySelectorAll('[data-code-act]').forEach(b=>b.addEventListener('click',()=>codeAction(b)));
  fresh.querySelectorAll('.think-row').forEach(r=>r.addEventListener('click',()=>{ const steps=r.parentElement.querySelector('.think-steps'); if(steps) steps.hidden=!steps.hidden; }));
  fresh.querySelectorAll('[data-src-open]').forEach(b=>b.addEventListener('click',()=>openSources(b.getAttribute('data-src-open'))));
  fresh.querySelectorAll('[data-src-chip]').forEach(c=>c.addEventListener('click',()=>openSources(c.getAttribute('data-src-chip'))));
  if(stickToBottom){ const cv=$('#chatView'); cv.scrollTop=cv.scrollHeight; }
}
async function generateTitle(sessionId){
  const s=getSession(sessionId);
  if(!s||s.titleRequested||!s.titleAutoPending||s.messages.length<2) return;
  if(!settings.interface.titleAuto) return;
  if(streaming){ setTimeout(()=>{ generateTitle(sessionId).catch(()=>{}); },2000); return; }
  s.titleRequested=true; saveSessions();
  const fast=MODELS[0];
  const u=s.messages.find(m=>m.role==='user'), a=s.messages.find(m=>m.role==='assistant');
  if(!u||!a) return;
  const prompt='Write a 3-6 word Title Case title for this conversation. Reply with only the title, no quotes, no punctuation at the end.\n\nUser: '+String(u.text||'').slice(0,500)+'\nAssistant: '+String(a.text||'').slice(0,500);
  let text='';
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:prompt, history:[], files:[], provider:fast.provider, model:fast.id, mode:'general', customPrompt:'You generate short chat titles. Reply with only the title.', webSearch:false, forceWebSearch:false, autoFallback:false, smartRouter:false, activityStream:false, autoTools:false, personalization:{intelligence:'Instant', fastAnswers:true} })});
    const ct=(res.headers&&res.headers.get&&res.headers.get('content-type'))||'';
    if(res.body&&res.body.getReader&&ct.includes('text/event-stream')){
      const reader=res.body.getReader(); const decoder=('TextDecoder' in window)?new TextDecoder():null; let buf='';
      const drain=block=>{ block.split('\n').forEach(line=>{ if(line.startsWith('data:')){ try{ const o=JSON.parse(line.slice(5).trim()); if(o&&typeof o.text==='string') text+=o.text; }catch(e){} } }); };
      for(;;){ const {done,value}=await reader.read(); if(done) break; buf+=decoder?decoder.decode(value,{stream:true}):String(value);
        let idx; while((idx=buf.indexOf('\n\n'))>=0){ const block=buf.slice(0,idx); buf=buf.slice(idx+2); drain(block); } }
      if(buf.trim()) drain(buf);
    } else {
      const raw=await res.text(); let data=null; try{ data=JSON.parse(raw); }catch(e){}
      text=(data&&typeof data==='object'?(data.text||data.reply||data.message||data.content||''):raw)||'';
    }
  }catch(e){}
  const t=titleCase(text);
  if(t&&t.length>1){ s.title=t; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); const cur=curSession(); if(cur&&cur.id===s.id) $('#topTitle').textContent=t; }
}
async function runImageGeneration(s,userMsg){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true};
  s.messages.push(asst); renderMessages(); setStreaming(true);
  trackRequest('image');
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'generate-image', prompt:userMsg.text, model:'auto'})});
    const data=await res.json().catch(()=>({}));
    if(data&&data.imageDataUrl){ asst.image=data.imageDataUrl; asst.text='Here is your image.'; }
    else throw new Error((data&&(data.error||data.detail))||'Image generation failed');
  }catch(err){ asst.errorCard=String(err&&err.message?err.message:'Image generation failed.'); asst.text=''; }
  asst.pending=false; s.updatedAt=Date.now(); if(!temporary) saveSessions(); setStreaming(false); renderAll();
}

/* ---------- voice dictation ---------- */
let recog=null, listening=false;
function toggleVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('Voice input is not supported in this browser'); return; }
  if(listening){ try{ recog&&recog.stop(); }catch(e){} return; }
  try{
    recog=new SR();
    recog.lang=(settings.voice.lang&&settings.voice.lang!=='auto')?settings.voice.lang:(settings.responseLang&&settings.responseLang.code!=='auto'?settings.responseLang.code:'en-US');
    recog.interimResults=false; recog.maxAlternatives=1;
    recog.onresult=e=>{
      const txt=e.results&&e.results[0]&&e.results[0][0]?e.results[0][0].transcript:'';
      if(txt){ const input=$('#composerInput'); input.value=(input.value?input.value+' ':'')+txt; autosize(); renderComposerState(); input.focus(); }
    };
    recog.onerror=e=>{
      listening=false; $('#micBtn').classList.remove('listening');
      if(e&&e.error==='not-allowed') toast('Permission denied when accessing microphone');
      else if(e&&e.error==='no-speech') toast('No speech detected');
      else toast('Voice input failed');
    };
    recog.onend=()=>{ listening=false; $('#micBtn').classList.remove('listening'); };
    recog.start(); listening=true; $('#micBtn').classList.add('listening');
  }catch(e){ toast('Voice input failed'); }
}

/* ---------- voice mode (Grok-style full Listening screen) ----------
   Real conversation: mic audio via getUserMedia (selected mic device, live
   level meter) + SpeechRecognition for the transcript; the transcript is
   sent as a real chat message and the reply is spoken with the selected
   device voice. Nothing here is canned: if the browser has no speech
   recognition, voice mode refuses to open (toast) instead of faking it. */
let vmOpen=false, vmRecog=null, vmListening=false, vmSpeaking=false, vmMuted=false, vmHandling=false;
let vmStream=null, vmAnalyser=null, vmAudioCtx=null, vmRaf=0, vmState='listening';
const VM_SPEEDS=[{v:0.5,l:'0.5×'},{v:0.75,l:'0.75×'},{v:0.9,l:'0.9×'},{v:1,l:'Normal'},{v:1.1,l:'1.1×'},{v:1.25,l:'1.25×'},{v:1.5,l:'1.5×'},{v:2,l:'2×'}];
const VM_PERSONALITIES=['Custom…','Assistant','Storyteller','Kids Story Time','Kids Trivia Game','Meditation','Conspiracy'];
function vmVoiceTitle(){ const e=resolveVoiceEntry(); return e?e.title:'Device default'; }
function vmPersonalityLabel(){ const s=settings.personalization.style||'Default'; if(s==='Default') return 'Assistant'; if(s==='Custom') return 'Custom…'; return s; }
function vmSpeedLabel(){ const r=settings.voice.rate||1; const hit=VM_SPEEDS.find(x=>x.v===r); return hit?hit.l:'Normal'; }
function vmUpdateSel(){ const el=$('#vmVoiceLabel'); if(el) el.textContent=vmVoiceTitle()+' · '+vmPersonalityLabel(); }
function vmSetState(state, transcript){
  vmState=state;
  const st=$('#vmState'); if(!st) return;
  st.textContent=state==='listening'?(vmMuted?'Muted':'Listening'):state==='thinking'?'Thinking':state==='speaking'?'Speaking':'Listening';
  const tr=$('#vmTranscript'); if(tr) tr.textContent=transcript||'';
  /* Dots animate while speaking (the reply being spoken) and while
     listening when there is no live mic analyser; with an analyser the
     rAF loop drives the heights from real mic levels instead. */
  const anim=state==='speaking'||(state==='listening'&&!vmMuted);
  ['#vmDots','#vmDotsMini'].forEach(sel=>{ const d=$(sel); if(d) d.classList.toggle('auto', anim&&!vmAnalyser); });
}
function vmTickDots(){
  if(!vmOpen) return;
  if(vmAnalyser&&vmState==='listening'){
    const data=new Uint8Array(vmAnalyser.frequencyBinCount);
    vmAnalyser.getByteFrequencyData(data);
    ['#vmDots','#vmDotsMini'].forEach(sel=>{
      const d=$(sel); if(!d) return;
      const spans=d.querySelectorAll('span');
      spans.forEach((sp,i)=>{
        const v=data[Math.floor(i*data.length/spans.length)]||0;
        sp.style.height=Math.max(4, Math.round(4+v/255*22))+'px';
      });
    });
  }
  vmRaf=requestAnimationFrame(vmTickDots);
}
async function vmAcquireMic(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return;
  const tryGet=async cons=>{ vmStream=await navigator.mediaDevices.getUserMedia(cons); };
  try{
    if(settings.voice.micDeviceId) await tryGet({audio:{deviceId:{exact:settings.voice.micDeviceId}}});
    else await tryGet({audio:true});
  }catch(e){
    if(e&&e.name==='OverconstrainedError'){ try{ await tryGet({audio:true}); }catch(e2){ if(e2&&e2.name==='NotAllowedError') throw e2; } }
    else throw e;
  }
  try{
    const AC=window.AudioContext||window.webkitAudioContext;
    if(AC&&vmStream){ vmAudioCtx=new AC(); const src=vmAudioCtx.createMediaStreamSource(vmStream); vmAnalyser=vmAudioCtx.createAnalyser(); vmAnalyser.fftSize=256; src.connect(vmAnalyser); }
  }catch(e){ vmAnalyser=null; }
}
function vmStartRecog(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR||!vmOpen||vmMuted) return;
  try{
    vmRecog=new SR();
    vmRecog.lang=(settings.voice.lang&&settings.voice.lang!=='auto')?settings.voice.lang:(settings.responseLang&&settings.responseLang.code!=='auto'?settings.responseLang.code:'en-US');
    vmRecog.continuous=true; vmRecog.interimResults=true; vmRecog.maxAlternatives=1;
    vmRecog.onresult=e=>{
      let interim='', final='';
      for(let i=e.resultIndex||0;i<e.results.length;i++){ const r=e.results[i]; if(!r||!r[0]) continue; if(r.isFinal) final+=r[0].transcript; else interim+=r[0].transcript; }
      if(interim) vmSetState('listening', interim);
      if(final&&final.trim()) vmHandleHeard(final.trim());
    };
    vmRecog.onerror=e=>{
      if(e&&e.error==='not-allowed'){ toast('Permission denied when accessing microphone'); closeVoiceMode(); }
    };
    vmRecog.onend=()=>{ vmListening=false; if(vmOpen&&!vmSpeaking&&!vmMuted&&!vmHandling){ try{ vmRecog.start(); vmListening=true; }catch(e){} } };
    vmRecog.start(); vmListening=true;
  }catch(e){ toast('Voice input failed'); }
}
async function vmHandleHeard(text){
  if(!vmOpen) return;
  vmHandling=true;
  try{ vmRecog&&vmRecog.stop(); }catch(e){}
  vmListening=false;
  vmSetState('thinking', text);
  await sendMessage(text);
  if(!vmOpen){ vmHandling=false; return; }
  const s=curSession();
  const last=s?[...s.messages].reverse().find(m=>m.role==='assistant'&&m.text):null;
  if(last&&last.text){
    vmSetState('speaking', last.text);
    vmSpeaking=true;
    await speakAsync(last.text);
    vmSpeaking=false;
  }
  if(!vmOpen){ vmHandling=false; return; }
  vmHandling=false;
  vmSetState('listening');
  vmStartRecog();
}
async function openVoiceMode(){
  if(vmOpen) return;
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('Voice input is not supported in this browser'); return; }
  try{ await vmAcquireMic(); }
  catch(e){
    if(e&&e.name==='NotAllowedError'){ toast('Permission denied when accessing microphone'); return; }
    vmStream=null; vmAnalyser=null;
  }
  vmOpen=true; vmMuted=false;
  $('#voiceMode').hidden=false;
  vmUpdateSel(); vmSetState('listening');
  vmStartRecog(); vmTickDots();
}
function closeVoiceMode(){
  if(!vmOpen) return;
  vmOpen=false; vmSpeaking=false; vmMuted=false; vmHandling=false;
  try{ vmRecog&&vmRecog.stop(); }catch(e){} vmRecog=null; vmListening=false;
  stopSpeak();
  if(vmStream){ try{ vmStream.getTracks().forEach(t=>{ try{ t.stop(); }catch(e){} }); }catch(e){} vmStream=null; }
  if(vmRaf) cancelAnimationFrame(vmRaf); vmRaf=0;
  if(vmAudioCtx){ try{ vmAudioCtx.close(); }catch(e){} vmAudioCtx=null; vmAnalyser=null; }
  $('#voiceMode').hidden=true;
  renderComposerState();
}
function openVoiceSheet(){
  const list=$('#voiceSheetList');
  const cat=voiceCatalog(); const sel=resolveVoiceEntry();
  list.innerHTML='<button class="radio-row'+(!settings.voice.voiceURI?' sel':'')+'" data-vs-voice=""><span class="radio"></span><span class="radio-label">Device default</span><span class="set-value">System voice</span></button>'
    +cat.map(c=>'<button class="radio-row'+(sel&&sel.uri===c.uri?' sel':'')+'" data-vs-voice="'+esc(c.uri)+'" data-vs-name="'+esc(c.name)+'"><span class="radio"></span><span class="radio-label">'+esc(c.title)+'</span><span class="set-value">'+esc(c.sub)+'</span></button>').join('');
  list.querySelectorAll('[data-vs-voice]').forEach(b=>b.addEventListener('click',()=>{
    const uri=b.getAttribute('data-vs-voice');
    settings.voice.voiceURI=uri; settings.voice.name=b.getAttribute('data-vs-name')||'';
    saveSettings(); vmUpdateSel(); openVoiceSheet();
    if(uri){ const e=resolveVoiceEntry(); speak('Hello, this is a preview of the selected voice.', uri); }
    else speak('Hello, this is the device default voice.', '');
    toast('Voice selected');
  }));
  const setPill=(id,label)=>{ const el=$(id); if(el) el.innerHTML=esc(label)+icon('chevron-down',14); };
  setPill('#vsPersonality', esc(vmPersonalityLabel()));
  setPill('#vsSpeed', esc(vmSpeedLabel()));
  setPill('#vsMic', esc(vmMicLabel()));
  openSheet('#voiceSheet');
}
function vmMicLabel(){
  if(settings.voice.micDeviceId){ const d=(vmMicCache||[]).find(x=>x.deviceId===settings.voice.micDeviceId); if(d&&d.label) return d.label; }
  return 'Microphone';
}
let vmMicCache=null;
async function vmListMics(){
  try{
    if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices) return [];
    const devs=await navigator.mediaDevices.enumerateDevices();
    vmMicCache=devs.filter(d=>d.kind==='audioinput');
    return vmMicCache;
  }catch(e){ return []; }
}
function vmPersonalityMenu(anchor){
  const r=anchor.getBoundingClientRect();
  showMenu(r.left, r.bottom+4, VM_PERSONALITIES.map(p=>({icon:'check', label:p+(vmPersonalityLabel()===p?' ✓':''), onClick:async()=>{
    if(p==='Custom…'){
      const cur=settings.personalization.custom||'';
      const next=await promptDialog('Custom personality','Custom instruction', cur);
      if(next===null) return;
      settings.personalization.custom=next.trim(); settings.personalization.style='Custom';
    } else {
      settings.personalization.style=(p==='Assistant'?'Default':p);
    }
    saveSettings(); vmUpdateSel(); openVoiceSheet();
  }})));
}
function vmSpeedMenu(anchor){
  const r=anchor.getBoundingClientRect();
  showMenu(r.left, r.bottom+4, VM_SPEEDS.map(s=>({icon:'check', label:s.l+(vmSpeedLabel()===s.l?' ✓':''), onClick:()=>{
    settings.voice.rate=s.v; saveSettings(); vmUpdateSel(); openVoiceSheet();
  }})));
}
async function vmMicMenu(anchor){
  const mics=await vmListMics();
  const r=anchor.getBoundingClientRect();
  const items=[{icon:'check', label:'Microphone'+(!settings.voice.micDeviceId?' ✓':''), onClick:()=>{ settings.voice.micDeviceId=''; saveSettings(); openVoiceSheet(); toast('Microphone updated — applies next voice session'); }}];
  mics.forEach(d=>{
    if(!d.deviceId) return;
    items.push({icon:'check', label:(d.label||'Microphone')+(settings.voice.micDeviceId===d.deviceId?' ✓':''), onClick:()=>{ settings.voice.micDeviceId=d.deviceId; saveSettings(); openVoiceSheet(); toast('Microphone updated — applies next voice session'); }});
  });
  showMenu(r.left, r.bottom+4, items);
}

/* ---------- sheets: model / attach / image ---------- */
function openModelSheet(){
  const list=$('#modelList');
  $('#modelSheetSub').textContent=modelOf().name+' · Default';
  list.innerHTML=MODELS.map(m=>'<button class="sheet-list-btn" data-model="'+m.id+'"><span class="row-main"><span>'+esc(m.name)+'</span><span class="row-sub">'+esc(m.desc)+'</span></span>'+(m.id===settings.model?'<span class="check">'+icon('check',18)+'</span>':'')+'</button>').join('');
  list.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{
    const m=MODELS.find(x=>x.id===b.getAttribute('data-model')); if(!m) return;
    settings.provider=m.provider; settings.model=m.id; saveSettings();
    closeSheet('#modelSheet'); renderAll(); toast(m.name+' selected');
  }));
  openSheet('#modelSheet');
}
function openAttachSheet(){ renderComposerState(); openSheet('#attachSheet'); }
function pickFile(kind){
  const fi=$('#fileInput');
  fi.removeAttribute('capture');
  if(kind==='camera'){ fi.setAttribute('accept','image/*'); fi.setAttribute('capture','environment'); }
  else if(kind==='library'){ fi.setAttribute('accept','image/*'); }
  else { fi.setAttribute('accept','*/*'); }
  fi.click();
}

/* ---------- settings pages ---------- */
let settingsPageKey='list';
const SETTING_ROWS=[
 {key:'appearance', icon:'monitor', label:'Appearance', value:()=>cap(settings.theme||'light')},
 {key:'profile', icon:'user', label:'Profile', value:()=>settings.profileName||'Jepong'},
 {key:'usage', icon:'gauge', label:'Usage', value:()=>''},
 {key:'voice', icon:'volume-2', label:'Voice', value:()=>voiceLabel()},
 {key:'data', icon:'shield', label:'Data controls', value:()=>''},
 {key:'account', icon:'user', label:'Account', value:()=>''},
 {key:'subscription', icon:'zap', label:'Subscription', value:()=>'Free'},
 {key:'help', icon:'circle-help', label:'Help', value:()=>''},
 {key:'about', icon:'info', label:'About', value:()=>''},
 {key:'privacy', icon:'shield', label:'Privacy', value:()=>''},
 {key:'terms', icon:'file', label:'Terms', value:()=>''}
];
function cap(s){ return s? s[0].toUpperCase()+s.slice(1):s; }
function voiceLabel(){
  const e=resolveVoiceEntry();
  if(e) return e.title;
  return 'Device default';
}
function openSettings(){
  settingsPageKey='list';
  renderSettingsPage();
  $('#settingsPage').hidden=false;
}
function renderSettingsPage(){
  const body=$('#settingsBody'), title=$('#settingsTitle');
  const back=()=>{ settingsPageKey='list'; renderSettingsPage(); };
  const rowHtml=r=>'<button class="set-row" data-set="'+r.key+'"><span class="set-ic">'+icon(r.icon,18)+'</span><span class="set-label">'+esc(r.label)+'</span>'+(r.value()?'<span class="set-value">'+esc(r.value())+'</span>':'')+'<span class="chev">'+icon('chevron-right',16)+'</span></button>';
  if(settingsPageKey==='list'){
    title.textContent='Settings';
    body.innerHTML='<div class="set-list">'+SETTING_ROWS.map(rowHtml).join('')+'</div>'
      +'<button class="set-row danger" data-set="signout"><span class="set-ic">'+icon('log-out',18)+'</span><span class="set-label">Sign out</span></button>';
    body.querySelectorAll('[data-set]').forEach(b=>b.addEventListener('click',()=>{
      const k=b.getAttribute('data-set');
      if(k==='signout'){ signOut(); return; }
      settingsPageKey=k; renderSettingsPage();
    }));
    return;
  }
  if(settingsPageKey==='appearance'){
    title.textContent='Appearance';
    const cur=settings.theme||'light';
    body.innerHTML='<div class="set-list">'+['light','dark','system'].map(t=>'<button class="radio-row'+(cur===t?' sel':'')+'" data-theme-opt="'+t+'"><span class="radio"></span><span class="radio-label">'+cap(t)+'</span>'+(cur===t?icon('check',16):'')+'</button>').join('')+'</div><p class="set-note">System follows your device setting.</p>';
    body.querySelectorAll('[data-theme-opt]').forEach(b=>b.addEventListener('click',()=>{ settings.theme=b.getAttribute('data-theme-opt'); saveSettings(); applyTheme(); renderSettingsPage(); }));
    return;
  }
  if(settingsPageKey==='profile'){
    title.textContent='Profile';
    body.innerHTML='<label class="field-label" for="pfName">Name</label><input id="pfName" class="field" value="'+esc(settings.profileName||'')+'" maxlength="40">'
      +'<label class="field-label" for="pfEmail">Email</label><input id="pfEmail" class="field" value="'+esc(settings.profileEmail||'')+'" maxlength="80" placeholder="Optional">'
      +'<button id="pfSave" class="btn-primary" type="button">Save</button>';
    body.querySelector('#pfSave').addEventListener('click',()=>{
      settings.profileName=body.querySelector('#pfName').value.trim()||'Jepong';
      settings.profileEmail=body.querySelector('#pfEmail').value.trim();
      saveSettings(); renderAll(); toast('Profile saved'); back();
    });
    return;
  }
  if(settingsPageKey==='usage'){
    title.textContent='Usage';
    const u=extra.usage||{chat:0,image:0,voice:0};
    body.innerHTML='<div class="set-card"><h3>Free plan</h3><p>Usage is counted on this device. There is no server-side credit balance.</p></div>'
      +'<div class="set-card"><div class="usage-num">'+(u.chat||0)+'</div><p>Chat requests</p></div>'
      +'<div class="set-card"><div class="usage-num">'+(u.image||0)+'</div><p>Images generated</p></div>'
      +'<button id="usageUpgrade" class="btn-primary" type="button">Upgrade</button>';
    body.querySelector('#usageUpgrade').addEventListener('click',()=>{ settingsPageKey='subscription'; renderSettingsPage(); });
    return;
  }
  if(settingsPageKey==='voice'){
    title.textContent='Voice';
    const cat=voiceCatalog(); const sel=resolveVoiceEntry();
    const langVal=settings.voice.lang||'';
    body.innerHTML='<button class="set-row" data-voice-page="lang"><span class="set-ic">'+icon('globe',18)+'</span><span class="set-label">Spoken language</span><span class="set-value">'+esc(langVal?langNameOf(langVal):'Auto Detect')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<div class="set-list" id="voiceList">'
      +'<button class="radio-row'+(!settings.voice.voiceURI?' sel':'')+'" data-voice-uri=""><span class="radio"></span><span class="radio-label">Device default</span><span class="set-value">System voice</span></button>'
      +cat.map(c=>'<button class="radio-row'+(sel&&sel.uri===c.uri?' sel':'')+'" data-voice-uri="'+esc(c.uri)+'" data-voice-name="'+esc(c.name)+'"><span class="radio"></span><span class="radio-label">'+esc(c.title)+'</span><span class="set-value">'+esc(c.sub)+'</span></button>').join('')
      +'</div>'
      +'<div class="set-card"><h3>Read replies aloud</h3><p>Speak each answer automatically with the selected voice.</p><button id="voiceModeSw" class="switch'+(settings.voice.voiceMode?' on':'')+'" type="button" aria-label="Read replies aloud"></button></div>';
    body.querySelector('[data-voice-page="lang"]').addEventListener('click',()=>{ settingsPageKey='voice-lang'; renderSettingsPage(); });
    body.querySelectorAll('[data-voice-uri]').forEach(b=>b.addEventListener('click',()=>{
      const uri=b.getAttribute('data-voice-uri');
      settings.voice.voiceURI=uri; settings.voice.name=b.getAttribute('data-voice-name')||'';
      saveSettings(); renderSettingsPage();
      if(uri){ const e=resolveVoiceEntry(); speak('Hello, this is a preview of the selected voice.', uri); }
      else speak('Hello, this is the device default voice.', '');
      toast('Voice selected');
    }));
    body.querySelector('#voiceModeSw').addEventListener('click',e=>{ settings.voice.voiceMode=!settings.voice.voiceMode; saveSettings(); e.currentTarget.classList.toggle('on', settings.voice.voiceMode); });
    return;
  }
  if(settingsPageKey==='voice-lang'){
    title.textContent='Spoken language';
    const cur=settings.voice.lang||'';
    body.innerHTML='<div class="set-list">'+['',...SPOKEN_LANGS.filter(l=>l!=='Auto Detect')].map(l=>{
      const code=l===''?'':langCodeOf(l);
      const label=l===''?'Auto Detect':l;
      return '<button class="radio-row'+(cur===code?' sel':'')+'" data-lang="'+esc(code)+'"><span class="radio"></span><span class="radio-label">'+esc(label)+'</span>'+(cur===code?icon('check',16):'')+'</button>';
    }).join('')+'</div>';
    body.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{ settings.voice.lang=b.getAttribute('data-lang'); saveSettings(); settingsPageKey='voice'; renderSettingsPage(); }));
    return;
  }
  if(settingsPageKey==='data'){
    title.textContent='Data controls';
    body.innerHTML='<div class="set-card"><h3>Your data lives on this device</h3><p>Chats, settings and projects are stored in this browser only. Deleting them cannot be undone.</p></div>'
      +'<button class="set-row danger" data-data="chats"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete all chats</span></button>'
      +'<button class="set-row danger" data-data="all"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete all data</span></button>';
    body.querySelectorAll('[data-data]').forEach(b=>b.addEventListener('click',async()=>{
      const kind=b.getAttribute('data-data');
      const ok=await showConfirm({title:kind==='all'?'Delete all data?':'Delete all chats?', text:kind==='all'?'Chats, settings, projects and usage counters will be deleted.':'All chats will be permanently deleted.', okLabel:'Delete'});
      if(!ok) return;
      if(kind==='all'){ localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY); location.reload(); return; }
      sessions=[]; currentId=null; saveSessions(); renderAll(); toast('All chats deleted');
    }));
    return;
  }
  if(settingsPageKey==='account'){
    title.textContent='Account';
    body.innerHTML='<div class="set-card"><h3>'+esc(settings.profileName||'Jepong')+'</h3><p>'+esc(settings.profileEmail||'No email set')+' · Free plan</p></div>'
      +'<button class="set-row danger" data-acc="data"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete all data</span></button>';
    body.querySelector('[data-acc="data"]').addEventListener('click',async()=>{
      const ok=await showConfirm({title:'Delete all data?', text:'Chats, settings, projects and usage counters will be deleted.', okLabel:'Delete'});
      if(!ok) return;
      localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY); location.reload();
    });
    return;
  }
  if(settingsPageKey==='subscription'){ renderUpgrade(body); title.textContent='Subscription'; return; }
  if(settingsPageKey==='help'){ renderHelp(body); title.textContent='Help'; return; }
  if(settingsPageKey==='about'){
    title.textContent='About';
    body.innerHTML='<div class="set-card"><h3>JepongDevxyz AI</h3><p>Version 1.0.0-grok · Grok-style rebuild</p><p style="margin-top:8px">Created by Jay-Ar Lee Espiritu</p></div><p class="set-note">JepongDevxyz AI can make mistakes. Verify its responses.</p>';
    return;
  }
  if(settingsPageKey==='privacy'){
    title.textContent='Privacy';
    body.innerHTML='<div class="set-card"><h3>Privacy</h3><p>Your chats, settings and projects are stored in this browser on your device. There is no JepongDevxyz AI account and nothing is uploaded to a JepongDevxyz AI server for storage. Messages you send are processed by the chat backend to generate replies. Voice input uses your device speech recognition and voices.</p></div>';
    return;
  }
  if(settingsPageKey==='terms'){
    title.textContent='Terms';
    body.innerHTML='<div class="set-card"><h3>Terms</h3><p>JepongDevxyz AI is provided as-is. AI-generated content may be inaccurate — verify important information. Do not use the app for anything unlawful, and do not share passwords or sensitive personal information in chats.</p></div>';
    return;
  }
  title.textContent='Settings'; settingsPageKey='list'; renderSettingsPage();
}
function langCodeOf(label){
  const map={'English':'en-US','Filipino':'fil-PH','Spanish':'es-ES','French':'fr-FR','German':'de-DE','Italian':'it-IT','Portuguese':'pt-PT','Japanese':'ja-JP','Korean':'ko-KR','Chinese':'zh-CN','Hindi':'hi-IN','Indonesian':'id-ID'};
  return map[label]||'';
}
const PLANS=[
 {name:'Free', price:'$0', per:'forever', feats:['Chat with free APINEX models','Image generation','Voice input & read aloud'], current:true},
 {name:'Lite', price:'$4', per:'per month', feats:['Everything in Free','Priority responses','More image generations']},
 {name:'Plus', price:'$19', per:'per month', feats:['Everything in Lite','Fastest responses','Highest image limits']},
 {name:'Pro', price:'$99', per:'per month', feats:['Everything in Plus','Maximum limits','Early access to new features']}
];
function renderUpgrade(body){
  body.innerHTML='<p class="set-note">Choose a plan. Prices are in USD.</p>'+PLANS.map(p=>'<div class="plan-card'+(p.current?' current':'')+'"><div class="plan-name">'+p.name+(p.current?' · Current plan':'')+'</div><div class="plan-price">'+p.price+' '+p.per+'</div><ul>'+p.feats.map(f=>'<li>'+esc(f)+'</li>').join('')+'</ul><button class="btn-primary" data-plan="'+p.name+'" type="button">'+(p.current?'Current plan':'Upgrade to '+p.name)+'</button></div>').join('');
  body.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{
    const p=b.getAttribute('data-plan');
    if(p==='Free'){ toast('You are on the Free plan'); return; }
    showInfo('Upgrade', 'Upgrading to '+p+' is not wired in this build yet. Plans are shown for reference — no payment is taken.');
  }));
}
function renderHelp(body){
  body.innerHTML='<div class="set-card"><h3>How to use JepongDevxyz AI</h3><p>Type a message and tap Send. Use the + button to attach files, Image to generate an image, Search to look up current facts, and Think for step-by-step reasoning. Tap the model name to switch between the nine free APINEX models. Your chats are saved on this device.</p></div>'
    +'<div class="set-card"><h3>Contact</h3><p>Email: businessdevgithubjepong@gmail.com</p></div>';
}
async function signOut(){
  const ok=await showConfirm({title:'Sign out?', text:'Your local profile and session data will be cleared from this browser.', okLabel:'Sign out'});
  if(!ok) return;
  localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY);
  location.reload();
}

/* ---------- info pages (Help / Projects / Upgrade) ---------- */
function openInfoPage(key){
  const body=$('#infoBody'), title=$('#infoTitle');
  if(key==='help'){ title.textContent='Help'; renderHelp(body); }
  else if(key==='upgrade'){ title.textContent='Upgrade'; renderUpgrade(body); }
  else if(key==='projects'){
    title.textContent='Projects';
    body.innerHTML='<button id="newProjBtn" class="btn-primary" type="button">New project</button><div id="projList" class="set-list" style="margin-top:10px">'
      +(projects.length? projects.map(p=>'<button class="set-row" data-proj="'+p.id+'"><span class="set-ic">'+icon('folder',18)+'</span><span class="set-label">'+esc(p.name)+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>').join('') : '<div class="sb-empty">No projects yet.</div>')
      +'</div>';
    body.querySelector('#newProjBtn').addEventListener('click',async()=>{
      const name=await promptDialog('New project','Project name','');
      if(name===null||!name.trim()) return;
      projects.unshift({id:uid(), name:name.trim(), createdAt:Date.now()});
      saveProjects(); openInfoPage('projects');
    });
    body.querySelectorAll('[data-proj]').forEach(b=>b.addEventListener('click',()=>{
      activeProjectId=b.getAttribute('data-proj'); $('#infoPage').hidden=true; renderSidebar(); toast('Showing project chats');
    }));
  }
  $('#infoPage').hidden=false;
}

/* ---------- wiring / init ---------- */
function wire(){
  hydrateIcons(document);
  $('#modelMark').innerHTML=J_MARK;
  $('#menuBtn').addEventListener('click',()=>{ $('#sidebar').classList.add('open'); $('#scrim').hidden=false; });
  $('#scrim').addEventListener('click',closeSidebarMobile);
  $('#newChatBtn').addEventListener('click',newChat);
  $('#topNewBtn').addEventListener('click',newChat);
  $('#profileBtn').addEventListener('click',()=>{ settingsPageKey='profile'; renderSettingsPage(); $('#settingsPage').hidden=false; closeSidebarMobile(); });
  $('#chatSearch').addEventListener('input',e=>{ searchQuery=e.target.value; $('#chatSearchClear').hidden=!searchQuery; renderSidebar(); });
  $('#chatSearchClear').addEventListener('click',()=>{ $('#chatSearch').value=''; searchQuery=''; $('#chatSearchClear').hidden=true; renderSidebar(); });
  document.querySelectorAll('[data-explore]').forEach(b=>b.addEventListener('click',()=>{
    const k=b.getAttribute('data-explore'); closeSidebarMobile();
    if(k==='settings') openSettings();
    else if(k==='help') openInfoPage('help');
    else if(k==='projects') openInfoPage('projects');
    else if(k==='upgrade') openInfoPage('upgrade');
    else if(k==='invite'){ copyText(location.origin+location.pathname).then(()=>toast('Invite link copied')); }
  }));
  const input=$('#composerInput');
  input.addEventListener('input',()=>{ autosize(); renderComposerState(); });
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
  });
  $('#sendBtn').addEventListener('click',()=>sendMessage());
  $('#stopBtn').addEventListener('click',()=>{ if(aborter){ try{ aborter.abort(); }catch(e){} } });
  $('#modelBtn').addEventListener('click',openModelSheet);
  $('#buildToolBtn').addEventListener('click',openModelSheet);
  $('#plusBtn').addEventListener('click',openAttachSheet);
  $('#imageToolBtn').addEventListener('click',()=>{ activeTool='image'; openSheet('#imageSheet'); setTimeout(()=>$('#imagePrompt').focus(),60); });
  $('#searchToolBtn').addEventListener('click',()=>{ settings.webSearch=!settings.webSearch; saveSettings(); renderComposerState(); toast(settings.webSearch?'Web search on':'Web search off'); });
  $('#thinkToolBtn').addEventListener('click',()=>{
    settings.responseMode=settings.responseMode==='Thinking'?'Auto':'Thinking'; saveSettings(); renderComposerState();
    toast(settings.responseMode==='Thinking'?'Thinking mode on':'Thinking mode off');
  });
  $('#micBtn').addEventListener('click',toggleVoice);
  $('#voiceBtn').addEventListener('click',openVoiceMode);
  $('#vmStop').addEventListener('click',closeVoiceMode);
  $('#vmMic').addEventListener('click',()=>{
    vmMuted=!vmMuted;
    $('#vmMic').classList.toggle('muted', vmMuted);
    $('#vmMic').setAttribute('aria-label', vmMuted?'Unmute microphone':'Mute microphone');
    if(vmMuted){ try{ vmRecog&&vmRecog.stop(); }catch(e){} vmListening=false; }
    else vmStartRecog();
    vmSetState('listening');
  });
  $('#vmPlus').addEventListener('click',openAttachSheet);
  $('#vmVoiceSel').addEventListener('click',openVoiceSheet);
  $('#vsPersonalityRow').addEventListener('click',e=>vmPersonalityMenu(e.currentTarget));
  $('#vsSpeedRow').addEventListener('click',e=>vmSpeedMenu(e.currentTarget));
  $('#vsMicRow').addEventListener('click',e=>vmMicMenu(e.currentTarget));
  $('#imageGenerateBtn').addEventListener('click',()=>{
    const p=$('#imagePrompt').value.trim();
    if(!p){ toast('Describe the image first'); return; }
    closeSheet('#imageSheet'); $('#imagePrompt').value='';
    sendMessage(p); activeTool=null;
  });
  document.querySelectorAll('[data-attach]').forEach(b=>b.addEventListener('click',()=>{ closeSheet('#attachSheet'); pickFile(b.getAttribute('data-attach')); }));
  $('#fileInput').addEventListener('change',e=>{
    const files=Array.from(e.target.files||[]);
    e.target.value='';
    if(!files.length) return;
    /* Bug 5 fix: read real bytes. The backend vision/text paths need
       {mimeType, data} (raw base64, no data: prefix); the old code sent
       name+kind only, so an attached image never reached the model. */
    const MAX_BYTES=1100000; /* ~1.47M base64 chars, under the server 1.5M/file cap */
    let pending=files.length, attached=0;
    const finish=()=>{ pending--; if(!pending){ renderComposerState(); if(attached) toast(attached+' file(s) attached'); } };
    files.forEach(f=>{
      const isImage=f.type&&f.type.startsWith('image/');
      const entry={name:f.name, kind:isImage?'image':'file', mimeType:f.type||'', size:f.size||0};
      if(f.size>MAX_BYTES){ toast('"'+f.name+'" is too large (max ~1 MB)'); finish(); return; }
      if(!window.FileReader){ attachments.push(entry); attached++; finish(); return; }
      const rd=new FileReader();
      rd.onload=()=>{ try{ const url=String(rd.result||''); entry.data=url.indexOf(',')>=0?url.split(',')[1]:url; }catch(err){} attachments.push(entry); attached++; finish(); };
      rd.onerror=()=>{ toast('Could not read "'+f.name+'"'); finish(); };
      rd.readAsDataURL(f);
    });
  });
  document.querySelectorAll('[data-close-sheet]').forEach(b=>b.addEventListener('click',()=>{ const sh=b.closest('.sheet'); if(sh) sh.hidden=true; }));
  document.querySelectorAll('.sheet').forEach(sh=>sh.addEventListener('click',e=>{ if(e.target===sh) sh.hidden=true; }));
  $('#confirmCancel').addEventListener('click',()=>closeConfirm(false));
  $('#confirmOk').addEventListener('click',()=>closeConfirm(true));
  $('#infoModalOk').addEventListener('click',()=>{ $('#infoModal').hidden=true; });
  $('#settingsBack').addEventListener('click',()=>{
    if(settingsPageKey==='list'){ $('#settingsPage').hidden=true; }
    else if(settingsPageKey==='voice-lang'){ settingsPageKey='voice'; renderSettingsPage(); }
    else { settingsPageKey='list'; renderSettingsPage(); }
  });
  $('#infoBack').addEventListener('click',()=>{ $('#infoPage').hidden=true; });
  const cv=$('#chatView');
  cv.addEventListener('scroll',()=>{
    const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
    stickToBottom=dist<60;
    updateScrollBtn();
  });
  $('#scrollBottom').addEventListener('click',()=>{ cv.scrollTo({top:cv.scrollHeight, behavior:'smooth'}); stickToBottom=true; updateScrollBtn(); });
  document.addEventListener('click',e=>{ if(suppressMenuClose){ suppressMenuClose=false; return; } if(activeMenu&&!e.target.closest('.menu-pop')) closeMenu(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(vmOpen){ closeVoiceMode(); return; } closeAllSheets(); closeMenu(); } });
  if('speechSynthesis' in window){ loadVoices(); try{ speechSynthesis.onvoiceschanged=()=>{ loadVoices(); }; }catch(e){} }
}
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme(); wire(); renderAll();
});
