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
'play':'<polygon points="6 3 20 12 6 21 6 3"/>',
'thumbs-up':'<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"/>',
'thumbs-down':'<path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"/>',
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
'rocket':'<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
layers:'<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
code:'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
'file-down':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M12 18v-6"/><path d="m8 14 4 4 4-4"/>',
lightbulb:'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
'book-open':'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
calendar:'<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
'graduation-cap':'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>'
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
function warnToast(html,link){
  /* Grok-style warning: a white card at the top with an X (and an optional
     action link), auto-dismissed — not the black pill. */
  const stack=$('#warnStack'); if(!stack) return;
  const el=document.createElement('div'); el.className='warn-toast';
  el.innerHTML='<span aria-hidden="true">⚠</span><span>'+html+(link?' <a href="#" data-warn-link>'+esc(link.label)+'</a>':'')+'</span><button type="button" class="warn-x" aria-label="Dismiss">'+icon('x',15)+'</button>';
  el.querySelector('.warn-x').addEventListener('click',()=>el.remove());
  const a=el.querySelector('[data-warn-link]');
  if(a&&link) a.addEventListener('click',e=>{ e.preventDefault(); el.remove(); link.onClick(); });
  stack.appendChild(el);
  setTimeout(()=>{ el.remove(); },6000);
}

/* ---------- models / settings (same keys as the Qwen build) ---------- */
const MODELS=[
 {provider:'apinex', id:'free/deepseek-v4.1-flash', name:'DeepSeek V4.1 Flash', short:'DeepSeek V4.1', tiny:'V4.1 Flash', badge:'DS', desc:'Default · Free'},
 {provider:'apinex', id:'free/deepseek-v4-flash-0731', name:'DeepSeek V4 Flash', short:'DeepSeek V4', tiny:'V4 Flash', badge:'DS', desc:'Free'},
 {provider:'apinex', id:'free/deepseek-v4-pro-0813', name:'DeepSeek V4 Pro', short:'DeepSeek V4 Pro', tiny:'V4 Pro', badge:'DS', desc:'Free'},
 {provider:'apinex', id:'free/gemini-4-hydrogen', name:'Gemini 4 Hydrogen', short:'Gemini 4', tiny:'Gemini 4', badge:'GE', desc:'Free'},
 {provider:'apinex', id:'free/glm-5.3-flash', name:'GLM 5.3 Flash', short:'GLM 5.3', tiny:'GLM 5.3', badge:'GL', desc:'Free'},
 {provider:'apinex', id:'free/glm-5.3-flashx', name:'GLM 5.3 FlashX', short:'GLM 5.3X', tiny:'GLM 5.3X', badge:'GL', desc:'Free'},
 {provider:'apinex', id:'free/gpt-6-luna', name:'GPT-6 Luna', short:'GPT-6 Luna', tiny:'Luna', badge:'GP', desc:'Free'},
 {provider:'apinex', id:'free/minimax-m3.1-flash', name:'MiniMax M3.1 Flash', short:'MiniMax M3.1', tiny:'M3.1 Flash', badge:'MM', desc:'Free'},
 {provider:'apinex', id:'free/qwen-3.8-max', name:'Qwen 3.8 Max', short:'Qwen 3.8', tiny:'Qwen 3.8', badge:'QW', desc:'Free'}
];
// APINEX-only (2026-11-24): Bailu removed completely. These 9 free models
// passed a live retest the same day; the other free/ models are
// subscription-gated (402) despite the prefix and are NOT listed.
const SESS_KEY='jepongQwenReset.sessions.v1', SET_KEY='jepongQwenReset.settings.v1', PROJ_KEY='jepongQwenReset.projects.v1', EXTRA_KEY='jepongQwenReset.extra.v1', DRAFT_KEY='jepongQwenReset.drafts.v1', PENDING_KEY='jepongQwenReset.pending.v1';
const EFFORT={Auto:'Medium',Thinking:'High',Fast:'Instant'};
const defaultSettings=()=>({
  theme:'light', profileName:'Jepong', profileEmail:'', profilePhoto:'',
  provider:'apinex', model:'free/deepseek-v4.1-flash',
  responseMode:'Auto', webSearch:false, toolsEnabled:true, advancedEnabled:true,
  responseLang:{code:'auto', label:'Auto'},
  interface:{titleAuto:true, autoCopy:false, pasteAsFile:true, wrapCode:false, reduceMotion:false, showSuggestions:true},
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
sessions=sessions.filter(s=>!s.temporary); /* a private chat never reaches storage */
let projects=loadJSON(PROJ_KEY,[]); if(!Array.isArray(projects)) projects=[];
let extra=loadJSON(EXTRA_KEY,{feedback:[],reports:[]}); if(!extra||typeof extra!=='object') extra={feedback:[],reports:[]};
if(!extra.usage) extra.usage={chat:0, image:0, voice:0};
function saveSessions(){ saveJSON(SESS_KEY, sessions.filter(s=>!s.temporary)); }
function saveProjects(){ saveJSON(PROJ_KEY, projects); }
function saveExtra(){ saveJSON(EXTRA_KEY, extra); }
/* Refresh-proofing (her order: "Dapat walang mawawala kahit mag refresh").
   Three things used to vanish on reload: the composer draft, the open chat,
   and any reply still streaming or queued (its pending assistant message was
   never saved — save happens at stream end — so the user message sat
   orphaned with no reply and no retry). All three now survive:
   - drafts: composer text + staged attachments, per session (or 'home')
   - extra.lastSessionId: the chat she was in
   - pendingWork: user messages still waiting for a reply, re-sent on boot
   Attachment bytes are kept only while the record stays under the cap;
   otherwise the text survives and the user is told to re-attach. */
const DRAFT_MAX_JSON=2000000, PENDING_MAX_ENTRY=1500000;
let drafts=loadJSON(DRAFT_KEY,{}); if(!drafts||typeof drafts!=='object') drafts={};
function draftKey(){ return currentId||'home'; }
function saveDraft(){
  const input=$('#composerInput'); if(!input) return;
  const text=input.value||'';
  const rec={text, attachments:attachments.map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0, data:a.data||undefined}))};
  if(JSON.stringify(rec).length>DRAFT_MAX_JSON){
    rec.attachments=rec.attachments.map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0}));
    rec.attachmentsDropped=true;
  }
  if(!text&&!rec.attachments.length){ delete drafts[draftKey()]; }
  else drafts[draftKey()]=rec;
  saveJSON(DRAFT_KEY, drafts);
}
function restoreDraft(){
  const input=$('#composerInput'); if(!input) return;
  const rec=drafts[draftKey()];
  if(!rec){ input.value=''; attachments=[]; autosize(); renderAttachBar(); return; }
  input.value=rec.text||'';
  attachments=(rec.attachments||[]).map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0, data:a.data||undefined}));
  autosize(); renderAttachBar();
  if(rec.attachmentsDropped) toast('Your message was restored — please re-attach your files.');
}
let pendingWork=loadJSON(PENDING_KEY,[]); if(!Array.isArray(pendingWork)) pendingWork=[];
function savePending(){ saveJSON(PENDING_KEY, pendingWork); }
function addPending(sessionId,userMsgId,tool,filePayload){
  if(pendingWork.some(p=>p.userMsgId===userMsgId)) return;
  const e={sessionId, userMsgId, tool:tool||null};
  if(filePayload&&filePayload.length){
    const fp=filePayload.map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0, data:a.data||undefined}));
    if(JSON.stringify(fp).length<=PENDING_MAX_ENTRY) e.filePayload=fp;
    else e.filesMissing=true;
  }
  pendingWork.push(e); savePending();
}
function clearPending(userMsgId){ const n=pendingWork.length; pendingWork=pendingWork.filter(p=>p.userMsgId!==userMsgId); if(pendingWork.length!==n) savePending(); }
function recoverPending(){
  /* Boot: re-send every user message that never got its reply. Entries whose
     session or message is gone, or that already have an assistant reply
     after them, are dropped silently. */
  if(!pendingWork.length){ resetFallbackTitles(); return; }
  let filesMissing=false, resumed=0;
  const entries=pendingWork.slice(); pendingWork=[];
  for(const e of entries){
    const s=getSession(e.sessionId);
    const um=s&&s.messages.find(m=>m.id===e.userMsgId);
    if(!s||!um) continue;
    const idx=s.messages.findIndex(m=>m.id===e.userMsgId);
    if(s.messages.slice(idx+1).some(m=>m.role==='assistant')) continue;
    if(e.filesMissing) filesMissing=true;
    pendingWork.push(e);
    sendQueue.push({s, userMsg:um, filePayload:e.filePayload||[], tool:e.tool||null});
    resumed++;
  }
  savePending();
  resetFallbackTitles();
  if(filesMissing) toast('Your messages were restored — please re-attach any missing images.');
  if(resumed) drainSendQueue();
}
function resetFallbackTitles(){
  /* A refresh before the title call landed left titleRequested=true with the
     raw-prompt fallback stuck forever. Reset it wherever the title is still
     the fallback, and re-run the title call for chats that already have a
     reply. */
  let changed=false;
  for(const s of sessions){
    if(!s.titleAutoPending) continue;
    const first=s.messages.find(m=>m.role==='user');
    if(first&&s.title===titleCase(first.text||'')){
      s.titleRequested=false; changed=true;
      if(s.messages.length>=2&&s.messages.some(m=>m.role==='assistant')){
        const sid=s.id; setTimeout(()=>{ generateTitle(sid).catch(()=>{}); },1500);
      }
    }
  }
  if(changed) saveSessions();
}
function trackRequest(kind){ try{ extra.usage[kind]=(extra.usage[kind]||0)+1; saveExtra(); }catch(e){} }

let currentId=null, temporary=false;
let activeProjectId=null;
let searchQuery='';
let collapsedSecs={chats:false,projects:false}; /* sidebar section collapse (Grok parity) */
let attachments=[];
let streaming=false, aborter=null;
let stickToBottom=true;
let activeMenu=null;
let suppressMenuClose=false;
function applyTheme(){ document.documentElement.setAttribute('data-theme', settings.theme||'light'); const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content',(settings.theme==='dark')?'#101011':'#fafaf8'); document.body.classList.toggle('wrap-code', !!(settings.interface&&settings.interface.wrapCode)); document.body.classList.toggle('reduce-motion', !!(settings.interface&&settings.interface.reduceMotion)); }
function modelOf(){ return MODELS.find(m=>m.id===settings.model)||MODELS[0]; }
function getSession(id){ return sessions.find(s=>s.id===id)||null; }
function curSession(){ return currentId?getSession(currentId):null; }
function timeGreeting(){ const h=new Date().getHours(); return h<12?'Good morning':(h<18?'Good afternoon':'Good evening'); }
function titleCase(t){
  /* Fallback titles come from the raw prompt: cut at a word boundary and strip
     trailing punctuation, so a title never ends mid-word with a stray comma
     ("Compare Python And JavaScript In A Short Table,"). */
  const s=String(t||'').trim().split(/\s+/).map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(' ');
  if(s.length<=48) return s.replace(/[,.;:!?]+$/,'');
  return s.slice(0,48).replace(/\s+\S*$/,'').replace(/[,.;:!?]+$/,'');
}
function ensureSession(firstText){
  if(currentId){ const s=getSession(currentId); if(s) return s; }
  const s={id:uid(), title:titleCase(firstText)||'New chat', createdAt:Date.now(), updatedAt:Date.now(), messages:[], titleAutoPending:true, titleRequested:false, projectId:activeProjectId||null, temporary:!!temporary};
  sessions.unshift(s); currentId=s.id; saveSessions();
  try{ extra.lastSessionId=s.id; saveExtra(); }catch(e){}
  return s;
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
function showMenu(x,y,items,opts){
  closeMenu();
  const pop=document.createElement('div'); pop.className='menu-pop'; pop.id='menuPop';
  items.forEach(it=>{
    if(it.header){ const d=document.createElement('div'); d.className='menu-head'; d.textContent=it.header; pop.appendChild(d); return; }
    if(it.band){ const b=document.createElement('button'); b.className='menu-band';
      b.innerHTML='<span class="menu-band-tx"><span class="ub-title">'+esc(it.title||'')+'</span><span class="ub-sub">'+esc(it.sub||'')+'</span></span><span class="ub-pill">'+esc(it.pill||'Upgrade')+'</span>';
      b.addEventListener('click',()=>{ closeMenu(); it.onClick&&it.onClick(); }); pop.appendChild(b); return; }
    const b=document.createElement('button'); if(it.danger) b.className='danger';
    b.innerHTML=(it.icon===null?'':'<span class="menu-ic">'+icon(it.icon||'info',16)+'</span>')
      +(it.badge?'<span class="menu-badge">'+esc(it.badge)+'</span>':'')
      +'<span class="menu-row-tx"><span>'+esc(it.label)+'</span>'+(it.sub?'<span class="menu-row-sub">'+esc(it.sub)+'</span>':'')+'</span>'
      +(it.tag?'<span class="menu-tag">'+esc(it.tag)+'</span>':'')
      +(it.checked?'<span class="menu-check">'+icon('check',18)+'</span>':'');
    b.addEventListener('click',()=>{ closeMenu(); it.onClick&&it.onClick(); });
    pop.appendChild(b);
  });
  document.body.appendChild(pop);
  suppressMenuClose=true; /* the click that opened this menu bubbles to the
    document closer afterwards — it must not close what it just opened */
  const vw=window.innerWidth, vh=window.innerHeight;
  const w=pop.offsetWidth||200, h=pop.offsetHeight||items.length*40;
  pop.style.left=Math.max(8,Math.min(x,vw-w-8))+'px';
  /* opts.above: the popup opens ABOVE the anchor (Grok's model picker sits
     above the composer) — its bottom edge lands at y. */
  pop.style.top=(opts&&opts.above)?Math.max(8,y-h)+'px':Math.max(8,Math.min(y,vh-h-8))+'px';
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
function highlightCode(code){
  /* Lightweight syntax tint (Grok colors its code; ours was plain mono).
     One regex pass over the raw code: comments, strings, numbers, keywords.
     Each token is escaped separately, so markup can never leak into output. */
  const re=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|elif|for|while|do|switch|case|break|continue|class|extends|new|try|catch|finally|throw|import|from|export|default|async|await|typeof|instanceof|def|print|and|or|not|None|True|False|lambda|with|as|pass|raise|yield|public|private|static|void|null|true|false|this|self|fn|struct|impl|use|pub|match|loop|int|str|float|bool)\b/g;
  let out='', last=0, m;
  while((m=re.exec(code))){
    out+=esc(code.slice(last,m.index));
    const t=m[0];
    if(m[1]) out+='<span class="tk-c">'+esc(t)+'</span>';
    else if(m[2]) out+='<span class="tk-s">'+esc(t)+'</span>';
    else if(m[3]) out+='<span class="tk-n">'+esc(t)+'</span>';
    else out+='<span class="tk-k">'+esc(t)+'</span>';
    last=m.index+t.length;
  }
  return out+esc(code.slice(last));
}
function langBadge(lang){
  /* Grok shows a real language mark in the code header; ours was a generic
     </> icon. A two-letter badge in the language's color is the honest
     equivalent — no fake brand logo. */
  const l=String(lang||'code').toLowerCase();
  const map={python:['Py','#3572a5'],javascript:['JS','#b59a00'],typescript:['TS','#3178c6'],html:['<>','#e34c26'],css:['#','#563d7c'],json:['{}','#6e6e6a'],bash:['$','#4e9a06'],shell:['$','#4e9a06'],java:['Ja','#b07219'],kotlin:['Kt','#7f52ff'],go:['Go','#00add8'],rust:['Rs','#dea584'],ruby:['Rb','#cc342d'],php:['Ph','#777bb3'],swift:['Sw','#f05138'],c:['C','#555555'],'c++':['C+','#649ad2']};
  const b=map[l]||[l.slice(0,2).toUpperCase(),'#6e6e6a'];
  return '<span class="code-badge" style="background:'+b[1]+'">'+esc(b[0])+'</span>';
}
function codeBlockHtml(lang,code){
  return '<div class="code-block" data-code="'+esc(code)+'"><div class="code-head">'+langBadge(lang)+'<span class="code-lang">'+esc(lang||'code')+'</span>'
    +'<button type="button" data-code-act="copy" aria-label="Copy code">'+icon('copy',15)+'</button>'
    +'<button type="button" data-code-act="download" aria-label="Download code">'+icon('download',15)+'</button>'
    +'<button type="button" data-code-act="collapse" aria-label="Collapse code">'+icon('chevron-up',14)+'</button></div>'
    +'<div class="code-body"><pre><code>'+highlightCode(code)+'</code></pre></div></div>';
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
      html+='<div class="table-wrap"><div class="table-head"><button type="button" data-table-copy>'+icon('copy',14)+'<span>Copy table</span></button><button type="button" data-table-open>'+icon('file-down',14)+'<span>Open as file</span></button></div><table><thead><tr>'+head.map(c=>'<th>'+inlineMd(c)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>'; continue; }
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
function stripSourcesBlock(text){
  /* The model sometimes ends its answer with a raw "Sources:" list of bare
     URLs. Grok never shows that inline — sources live only in the sources
     row/sheet. Cut the trailing block from the body; extractUrls() still
     feeds the row, so nothing is lost. */
  const lines=String(text||'').split('\n');
  let end=lines.length;
  while(end>0&&lines[end-1].trim()==='') end--;
  let i=end;
  while(i>0){
    const l=lines[i-1].trim();
    /* A sources list line: a list marker plus a link or bare URL anywhere
       in the line (the model also writes "- [Python docs](url) — official"
       and "- Python docs — https://…", not just link-only lines). */
    if(/^([-*•]|\d+\.)\s+.*(https?:\/\/|\[[^\]]+\]\()/.test(l)){ i--; continue; }
    break;
  }
  if(i<end){
    const head=(lines[i-1]||'').trim();
    if(/^#{0,3}\s*\*{0,2}sources:?\*{0,2}\s*$/i.test(head)) return lines.slice(0,i-1).join('\n').replace(/\s+$/,'');
    if(end-i>=2) return lines.slice(0,i).join('\n').replace(/\s+$/,'');
  }
  return text;
}
const WN_OPEN='[[JD_WORK_NOTE]]', WN_CLOSE='[[/JD_WORK_NOTE]]';
function absorbWorkNotes(asst,chunk){
  /* The backend asks the model to emit [[JD_WORK_NOTE]]…[[/JD_WORK_NOTE]]
     progress notes. They are UI metadata: they become the live thinking
     step (Grok's one-short-line-at-a-time) instead of leaking the wrapper
     into the reply. A chunk can split a note, so an open fragment buffers. */
  asst.workNotes=asst.workNotes||[];
  asst._nb=(asst._nb||'')+String(chunk||'');
  let buf=asst._nb, out='';
  for(;;){
    const open=buf.indexOf(WN_OPEN);
    if(open<0){ out+=buf; buf=''; break; }
    out+=buf.slice(0,open);
    const close=buf.indexOf(WN_CLOSE,open);
    if(close<0){ buf=buf.slice(open); break; }
    const note=buf.slice(open+WN_OPEN.length,close).trim();
    if(note&&!asst.workNotes.includes(note)) asst.workNotes.push(note);
    buf=buf.slice(close+WN_CLOSE.length);
  }
  asst._nb=buf;
  asst.text=(asst.text||'')+out;
}
function isInternalStep(a){
  /* Backend activity labels that expose internals — provider/model names and
     the "Connecting to …" line — never reach the UI. Round 3: the audit /
     verification lines ("Checked the response against your request", "2
     static checks passed", "Response complete in …s") are server-side
     self-checks, not work the user asked to see — Grok's expanded thinking
     shows no step lines at all, so these go too. */
  const l=String((a&&a.label)||'');
  if(!l.trim()) return true;
  return /connecting to|apinex|bailu|deepseek|gemini|\bglm\b|gpt-6|minimax|qwen|kimi|muse-spark|provider|model not found|audit|static check|response complete|checked the response|response structure|^thinking$/i.test(l);
}
function shortStep(l){
  const s=String(l||'').trim();
  if(s.length<=90) return s;
  return s.slice(0,87).replace(/\s+\S*$/,'')+'…';
}
function fmtStamp(ts){
  const d=new Date(ts||Date.now()), now=new Date();
  const t=d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
  const day=d.toDateString()===now.toDateString()?'Today':d.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return day+' '+t;
}

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
let showAllChats=false; /* sidebar "Show more" state (Grok parity) */
function renderSidebar(){
  const list=$('#chatList');
  /* Private chats never appear in history — in-memory only, gone on refresh. */
  let items=sessions.filter(s=>!s.temporary);
  /* Dedupe by id — a session must never render twice, whatever the array holds. */
  const seenIds=new Set(); items=items.filter(s=>{ if(seenIds.has(s.id)) return false; seenIds.add(s.id); return true; });
  if(activeProjectId) items=items.filter(s=>s.projectId===activeProjectId);
  if(searchQuery){ const q=searchQuery.toLowerCase(); items=items.filter(s=>(s.title||'').toLowerCase().includes(q)||(s.messages||[]).some(m=>(m.text||'').toLowerCase().includes(q))); }
  const pinned=items.filter(s=>s.pinned), rest=items.filter(s=>!s.pinned);
  let html='';
  if(activeProjectId){ const p=projects.find(p=>p.id===activeProjectId); html+='<div class="sb-group">'+esc(p?p.name:'Project')+' · <a href="#" id="clearProj" style="color:var(--accent)">All chats</a></div>'; }
  /* Grok's history is a flat list — no Today / Previous 7 Days / Older
     headings. Pinned chats stay first. "Show more" reveals the rest. */
  if(!searchQuery&&!activeProjectId) html+='<div class="sb-sec-row"><span class="sb-sec">Chats</span><span class="sb-sec-actions"><button class="icon-btn sb-sec-chev'+(collapsedSecs.chats?' closed':'')+'" id="sbChatsChev" type="button" aria-label="Collapse chats">'+icon('chevron-down',16)+'</button><button class="icon-btn" id="sbNewPlus" type="button" aria-label="New chat">'+icon('plus',16)+'</button></span></div>';
  html+=pinned.map(itemHtml).join('');
  const shown=(searchQuery||showAllChats)?rest:rest.slice(0,5);
  html+=shown.map(itemHtml).join('');
  if(!searchQuery&&!showAllChats&&rest.length>5) html+='<button class="sb-more" id="sbMore" type="button">Show more</button>';
  if(!items.length) html+='<div class="sb-empty">'+(searchQuery?'No chats match your search.':'No chats yet. Start a new one.')+'</div>';
  list.innerHTML=html;
  list.classList.toggle('collapsed', !!collapsedSecs.chats);
  const cc=$('#sbChatsChev'); if(cc) cc.addEventListener('click',()=>{ collapsedSecs.chats=!collapsedSecs.chats; renderSidebar(); });
  const more=$('#sbMore'); if(more) more.addEventListener('click',()=>{ showAllChats=true; renderSidebar(); });
  const np=$('#sbNewPlus'); if(np) np.addEventListener('click',()=>newChat());
  const pl=$('#projList');
  /* Empty Projects section is dead space — hide its header + list until
     the user creates a project. */
  const ps=$('#sbProjSec'); if(ps) ps.hidden=!projects.length;
  if(pl){
    pl.hidden=!projects.length;
    pl.innerHTML=projects.map(p=>'<button class="sb-item" data-proj="'+p.id+'"><span class="sb-item-title">'+esc(p.name)+'</span></button>').join('');
    pl.querySelectorAll('[data-proj]').forEach(el=>el.addEventListener('click',()=>{ activeProjectId=el.getAttribute('data-proj'); renderSidebar(); toast('Showing project chats'); }));
  }
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
function sessionMenuItems(s){
  const id=s.id;
  const projItems=projects.map(p=>({icon:'folder', label:'Move to '+p.name, onClick:()=>{ s.projectId=p.id; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); toast('Moved to '+p.name); }}));
  return [
    {icon:'pin', label:s.pinned?'Unpin':'Pin', onClick:()=>{ s.pinned=!s.pinned; saveSessions(); renderSidebar(); }},
    {icon:'share', label:'Share', onClick:()=>{ copyText(location.origin+location.pathname).then(()=>toast('Link copied')); }},
    {icon:'git-branch', label:'Branch in new chat', onClick:()=>branchSession(id)},
    {icon:'copy', label:'Copy conversation ID', onClick:()=>{ copyText(id).then(()=>toast('Conversation ID copied')); }},
    {icon:'pencil', label:'Rename', onClick:()=>renameChat(id)},
    ...projItems,
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteChat(id)}
  ];
}
function branchSession(id){
  const s=getSession(id); if(!s) return;
  const copy={id:uid(), title:(s.title||'New chat')+' (branch)', createdAt:Date.now(), updatedAt:Date.now(), messages:JSON.parse(JSON.stringify(s.messages)), titleAutoPending:false, titleRequested:true, projectId:s.projectId||null, temporary:!!s.temporary};
  sessions.unshift(copy); saveSessions(); openSession(copy.id); toast('Branched into a new chat');
}
function chatItemMenu(id,anchor){
  const s=getSession(id); if(!s) return;
  const r=anchor.getBoundingClientRect();
  showMenu(r.left, r.bottom+4, sessionMenuItems(s));
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
  const os=getSession(id);
  currentId=id; temporary=!!(os&&os.temporary); showAllChats=false;
  try{ extra.lastSessionId=id; saveExtra(); }catch(e){}
  closeSidebarMobile(); renderAll(); restoreDraft();
  const cv=$('#chatView'); cv.scrollTop=cv.scrollHeight; stickToBottom=true; updateScrollBtn();
  /* Backfill follow-up pills for the last reply of an older chat (replies
     made before pills existed never got them; one silent call, then saved). */
  if(os&&!streaming){
    const lastAsst=[...os.messages].reverse().find(m=>m.role==='assistant'&&m.text&&!m.followups&&!m.pending&&!m.errorCard);
    if(lastAsst){ const sid=os.id, mid=lastAsst.id; setTimeout(()=>{ requestFollowups(sid,mid).catch(()=>{}); },1200); }
  }
}
function newChat(){
  currentId=null; showAllChats=false;
  try{ extra.lastSessionId=null; saveExtra(); }catch(e){}
  closeSidebarMobile(); renderAll(); restoreDraft();
  $('#composerInput').focus();
}
function setPrivate(on){
  /* Grok's Private toggle: the current chat becomes private (never saved,
     never in history) or returns to normal; new chats inherit the mode. */
  temporary=!!on;
  const s=curSession();
  if(s){ s.temporary=temporary; saveSessions(); renderSidebar(); }
  renderAll();
  if(temporary) toast('Private chat — this chat will not be saved');
}
function closeSidebarMobile(){ if(window.innerWidth<1024){ $('#sidebar').classList.remove('open'); $('#scrim').hidden=true; } }
const SUGGESTIONS=[{t:'Create an image',icon:'image'},{t:'Write or edit',icon:'pencil'},{t:'Search the web',icon:'globe'},{t:'Make a website',icon:'code'},{t:'Explain a concept',icon:'lightbulb'},{t:'Design a presentation',icon:'book-open'},{t:'Plan my day',icon:'calendar'},{t:'Help me learn something new',icon:'graduation-cap'}];
function renderHomeSugg(){
  /* Grok home shows three rotating suggestion rows under the composer.
     Every row does something real: image opens the image sheet, search turns
     web search on, the rest send as starter messages. */
  const box=$('#homeSugg'); if(!box) return;
  const show=!curSession()&&settings.interface.showSuggestions!==false;
  if(!show){ box.hidden=true; box.innerHTML=''; return; }
  const pool=SUGGESTIONS.slice();
  for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
  box.hidden=false;
  box.innerHTML=pool.slice(0,3).map(o=>'<button type="button" data-sugg="'+esc(o.t)+'"><span class="sugg-ic">'+icon(o.icon,16)+'</span><span>'+esc(o.t)+'</span></button>').join('');
  box.querySelectorAll('[data-sugg]').forEach(b=>b.addEventListener('click',()=>{
    const t=b.getAttribute('data-sugg');
    if(t==='Create an image'){ activeTool='image'; openSheet('#imageSheet'); setTimeout(()=>$('#imagePrompt').focus(),60); return; }
    if(t==='Search the web'){ settings.webSearch=true; saveSettings(); renderComposerState(); toast('Web search on'); $('#composerInput').focus(); return; }
    sendMessage(t);
  }));
}
function renderAll(){
  applyTheme();
  const s=curSession();
  const hasChat=!!s;
  $('#homeView').hidden=hasChat;
  $('#chatView').hidden=!hasChat;
  $('#greetLine1').textContent="What's on the agenda today?";
  $('#greetLine2').hidden=true;
  const pel=$('#profileEmailLabel'); if(pel){ pel.textContent=settings.profileEmail||''; pel.style.display=settings.profileEmail?'':'none'; }
  $('#profileNameLabel').textContent=settings.profileName||'Jepong';
  $('#profileAvatar').textContent=(settings.profileName||'J')[0].toUpperCase();
  $('#topTitle').innerHTML='<span class="top-logo">'+J_MARK+'</span><span>'+esc(hasChat?(s.title||'New chat'):'JepongDevxyz AI')+'</span>';
  const pb=$('#privateBtn'); if(pb){ pb.classList.toggle('on', !!temporary); pb.setAttribute('aria-pressed', temporary?'true':'false'); }
  $('#modelName').textContent=modelOf().tiny||modelOf().short||modelOf().name;
  $('#modelMark').innerHTML=J_MARK;
  $('#composerInput').placeholder='Ask anything...';
  renderSidebar(); renderMessages(); renderComposerState(); renderHomeSugg();
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
  $('#voiceBtn').hidden=streaming||hasText;
  $('#micBtn').hidden=streaming;
  $('#stopBtn').hidden=!streaming;
  const bar=$('#attachBar');
  if(attachments.length){
    bar.hidden=false;
    bar.innerHTML=attachments.map((a,i)=>'<span class="att-chip">'+esc(a.name)+'<button type="button" data-att-del="'+i+'" aria-label="Remove attachment">'+icon('x',13)+'</button></span>').join('');
    bar.querySelectorAll('[data-att-del]').forEach(b=>b.addEventListener('click',()=>{ attachments.splice(parseInt(b.getAttribute('data-att-del'),10),1); renderComposerState(); renderAttachBar(); saveDraft(); }));
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
  box.querySelectorAll('[data-table-copy]').forEach(b=>b.addEventListener('click',()=>tableCopy(b)));
  box.querySelectorAll('[data-table-open]').forEach(b=>b.addEventListener('click',()=>tableOpen(b)));
  box.querySelectorAll('[data-fu]').forEach(b=>b.addEventListener('click',()=>{ const t=b.getAttribute('data-fu-text'); if(t) sendMessage(t); }));
  box.querySelectorAll('.think-row').forEach(r=>r.addEventListener('click',()=>{ const steps=r.parentElement.querySelector('.think-steps'); if(steps) steps.hidden=!steps.hidden; const ch=r.querySelector('.think-chev'); if(ch) ch.innerHTML=icon(steps&&!steps.hidden?'chevron-up':'chevron-right',13); }));
  box.querySelectorAll('[data-src-open]').forEach(b=>b.addEventListener('click',()=>openSources(b.getAttribute('data-src-open'))));
  box.querySelectorAll('[data-src-chip]').forEach(c=>c.addEventListener('click',()=>openSources(c.getAttribute('data-src-chip'))));
  if(stickToBottom){ const cv=$('#chatView'); cv.scrollTop=cv.scrollHeight; }
}
function assistantHtml(s,m){
  let h='<div class="msg asst" data-mid="'+m.id+'">';
  /* Grok-style thinking: one short step line at a time + a live seconds timer,
     collapsing to "Thought for Ns". Backend activity is filtered — provider /
     model names and the "Connecting to …" line never reach the UI — and the
     model's own [[JD_WORK_NOTE]] progress notes are the step lines. */
  const steps=(m.activity||[]).filter(a=>!isInternalStep(a));  const notes=(m.workNotes||[]).map(n=>({label:n,state:'completed'}));
  const allSteps=steps.concat(notes);
  const showThink=(m.thinkMode&&m.thinkMode!=='Fast')||allSteps.length>0;
  if(showThink||m.thoughtStopped){
    const live=!!m.pending;
    const t0=m.streamStartedAt||m.createdAt||Date.now();
    const t1=live?Date.now():(m.streamEndedAt||m.createdAt||t0);
    const secs=Math.max(0,Math.round((t1-t0)/1000));
    const hasTimes=!!(m.streamStartedAt||m.streamEndedAt);
    const label=m.thoughtStopped?'Stopped':(live?('Working for '+secs+'s'):((hasTimes)?('Thought for '+secs+'s'):'Thought'));
    const lastLine=live?(notes.length?notes[notes.length-1].label:(steps.length?steps[steps.length-1].label:'')):'';
    h+='<div class="think-row" role="button">'+(live?'<span class="spin"></span>':'')+'<span class="think-label">'+esc(label)+'</span><span class="think-chev">'+icon('chevron-right',13)+'</span></div>';
    if(live&&lastLine) h+='<div class="think-step-line">'+esc(shortStep(lastLine))+'</div>';
    if(allSteps.length){
      /* The full step list stays collapsed (tap the row to expand) — while
         live it used to render open, so the latest step showed twice: once
         in the single step line and once in the list. */
      h+='<div class="think-steps" hidden>'+allSteps.map(a=>'<div class="think-step'+(a.state==='completed'?' done':'')+'"><span class="st-ic">'+(a.state==='completed'?icon('check',13):icon('gauge',13))+'</span><span>'+esc(shortStep(a.label||''))+(a.detail?'<span class="st-detail">'+esc(a.detail)+'</span>':'')+'</span></div>').join('')+'</div>';
    }
  }
  if(m.image){ h+='<div class="img-card"><img src="'+esc(m.image)+'" alt="Generated image"></div>'; }
  if(m.text){ h+='<div class="msg-asst">'+mdToHtml(stripSourcesBlock(m.text))+'</div>'; }
  if(m.errorCard){ h+='<div class="err-card"><div class="err-title">Image generation limit</div><div>'+esc(m.errorCard)+'</div><button type="button" class="btn-primary" data-a-act="upgrade" data-mid="'+m.id+'">Upgrade</button></div>'; }
  const urls=extractUrls(m.text||'');
  const footParts=[];
  if(urls.length||m.image){
    footParts.push('<button type="button" class="sources-btn" data-src-open="'+m.id+'">'+icon('globe',14)+'<span>'+(urls.length?urls.length+' source'+(urls.length>1?'s':''):'Sources')+'</span></button>'
      +urls.slice(0,3).map(u=>'<a class="src-chip" href="#" data-src-chip="'+m.id+'">'+esc(hostOf(u))+'</a>').join(''));
  }
  if(!m.pending){
    const fb=m.feedback||'';
    footParts.push('<div class="action-bar">'
      +'<button type="button" data-a-act="copy" data-mid="'+m.id+'" aria-label="Copy">'+icon('copy',15)+'</button>'
      +'<button type="button" data-a-act="good" data-mid="'+m.id+'" aria-label="Good response" class="'+(fb==='good'?'active':'')+'">'+icon('thumbs-up',15)+'</button>'
      +'<button type="button" data-a-act="bad" data-mid="'+m.id+'" aria-label="Bad response" class="'+(fb==='bad'?'active':'')+'">'+icon('thumbs-down',15)+'</button>'
      +'<button type="button" data-a-act="more" data-mid="'+m.id+'" aria-label="More">'+icon('ellipsis',15)+'</button>'
      +'</div>');
  }
  /* Grok puts the sources button and the action bar on ONE row. */
  if(footParts.length) h+='<div class="reply-foot">'+footParts.join('')+'</div>';
  if(!m.pending){
    if(Array.isArray(m.followups)&&m.followups.length){
      h+='<div class="followups">'+m.followups.slice(0,2).map(f=>'<button type="button" class="followup-btn" data-fu="'+m.id+'" data-fu-text="'+esc(f)+'"><span>'+esc(f)+'</span></button>').join('')+'</div>';
    }
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
function tableCopy(btn){
  const wrap=btn.closest('.table-wrap'); if(!wrap) return;
  const table=wrap.querySelector('table'); if(!table) return;
  copyText(table.innerText||'').then(()=>toast('Table copied'));
}
function tableOpen(btn){
  /* Grok's "Open as file": the table as a downloadable .md file. */
  const wrap=btn.closest('.table-wrap'); if(!wrap) return;
  const table=wrap.querySelector('table'); if(!table) return;
  const rowText=tr=>Array.from(tr.querySelectorAll('th,td')).map(c=>(c.textContent||'').trim().replace(/\|/g,'\\|')).join(' | ');
  const head=table.querySelector('thead tr'), bodyRows=Array.from(table.querySelectorAll('tbody tr'));
  const cols=head?head.querySelectorAll('th,td').length:(bodyRows[0]?bodyRows[0].querySelectorAll('td').length:0);
  let md='';
  if(head) md+='| '+rowText(head)+' |\n| '+Array.from({length:cols},()=>'---').join(' | ')+' |\n';
  md+=bodyRows.map(tr=>'| '+rowText(tr)+' |').join('\n');
  const blob=new Blob([md],{type:'text/markdown'}); const a=document.createElement('a');
  a.href=URL.createObjectURL(blob); a.download='table.md'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  toast('Table opened as file');
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
  else if(act==='good'||act==='bad'){ m.feedback=(m.feedback===act)?null:act; s.updatedAt=Date.now(); saveSessions(); renderMessages(); if(m.feedback) toast('Thanks for the feedback'); }
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
    {header:fmtStamp(m.createdAt||Date.now())},
    {icon:'git-branch', label:'Branch in new chat', onClick:()=>branchFrom(mid)},
    {icon:'share', label:'Share', onClick:()=>{ copyText(location.origin+location.pathname).then(()=>toast('Link copied')); }},
    {icon:'volume-2', label:'Read aloud', onClick:()=>readAloud(m)},
    {icon:'download', label:'Export to PDF', onClick:()=>{ try{ window.print(); }catch(e){ toast('Print is not available'); } }},
    {icon:'rotate-ccw', label:'Regenerate', onClick:()=>{ const s2=curSession(); if(s2) regenerate(s2,m); }},
    {icon:'image', label:'Create image', onClick:()=>{ const s=curSession(); if(!s) return; const userMsg={id:uid(), role:'user', text:String(m.text||'').slice(0,500), createdAt:Date.now(), attachments:[]}; s.messages.push(userMsg); saveSessions(); runImageGeneration(s,userMsg); }},
    {icon:'trash-2', label:'Delete', danger:true, onClick:async()=>{ const ok=await showConfirm({title:'Delete message?', text:'This answer will be deleted.', okLabel:'Delete'}); if(!ok) return; const s=curSession(); if(!s) return; s.messages=s.messages.filter(x=>x.id!==mid); s.updatedAt=Date.now(); saveSessions(); renderMessages(); }}
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
  /* Grok's home has no scroll button — show it only inside a chat, and
     only once the user has scrolled up from the bottom. */
  const cv=$('#chatView'); if(!cv) return;
  const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
  const hv=$('#homeView'); const onHome=hv&&!hv.hidden;
  $('#scrollBottom').hidden=!(curSession()&&!onHome&&dist>240);
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
  const dk=draftKey(); /* capture before ensureSession can change currentId */
  const s=ensureSession(text);
  const userMsg={id:uid(), role:'user', text, createdAt:Date.now(), attachments:attachments.map(a=>({name:a.name, kind:a.kind}))};
  const filePayload=attachments.slice();
  const tool=activeTool; activeTool=null;
  s.messages.push(userMsg); s.updatedAt=Date.now(); if(!temporary) saveSessions();
  attachments=[]; renderAttachBar();
  if(presetText===undefined){ input.value=''; autosize(); renderComposerState(); delete drafts[dk]; saveJSON(DRAFT_KEY, drafts); }
  renderAll();
  if(streaming){ sendQueue.push({s,userMsg,filePayload,tool}); addPending(s.id,userMsg.id,tool,filePayload); return; }
  if(tool==='image'){ try{ await runImageGeneration(s,userMsg); }finally{ drainSendQueue(); } return; }
  try{ await runChatStream(s,userMsg,filePayload); }finally{ drainSendQueue(); }
}
function drainSendQueue(){
  if(streaming||!sendQueue.length) return;
  const next=sendQueue.shift();
  if(!getSession(next.s.id)){ clearPending(next.userMsg.id); drainSendQueue(); return; }
  if(next.tool==='image'){ runImageGeneration(next.s,next.userMsg).then(drainSendQueue,drainSendQueue); return; }
  runChatStream(next.s,next.userMsg,next.filePayload).then(drainSendQueue,drainSendQueue);
}
let activeTool=null;
async function runChatStream(s,userMsg,filePayload){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true, thinkMode:settings.responseMode};
  s.messages.push(asst); renderMessages();
  if(!temporary) addPending(s.id,userMsg.id,null,filePayload);
  /* Title sooner: the summary title used to wait for the whole reply, so the
     raw-prompt fallback sat in the top bar and sidebar for a long slow reply.
     The title call retries itself while a stream is running, so scheduling it
     now lands the real title as soon as the stream ends. */
  if(!temporary&&s.titleAutoPending&&!s.titleRequested){ const sid=s.id; setTimeout(()=>{ generateTitle(sid).catch(()=>{}); },1500); }
  await streamInto(s,userMsg,asst,filePayload);
}
async function streamInto(s,userMsg,asst,filePayload){
  setStreaming(true); aborter=('AbortController' in window)?new AbortController():null;
  asst.thinkMode=settings.responseMode; asst.thoughtStopped=false; asst.textReceived=false;
  asst.streamStartedAt=Date.now();
  const thinkTick=setInterval(()=>{ if(getSession(s.id)===s&&asst.pending) paintAssistant(s,asst); },1000);
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
      const rawText=(data&&typeof data==='object'?(data.text||data.reply||data.message||data.content||''):raw)||'';
      asst._nb=''; asst.workNotes=asst.workNotes||[]; absorbWorkNotes(asst,rawText);
      if(asst.text) asst.textReceived=true;
    }
  }catch(err){
    if(err&&err.name==='AbortError'){
      if(!asst.textReceived&&!asst.text){ asst.thoughtStopped=true; asst.text=''; }
      else asst.text+=(asst.text?'\n\n':'')+'_Stopped._';
    }
    else { asst.text=(asst.text?asst.text+'\n\n':'')+'⚠ '+(err&&err.message?err.message:'Something went wrong.'); asst.activity.push({label:'Request failed', state:'error', detail:String(err&&err.message||err), at:Date.now()}); }
  }finally{
    asst.streamEndedAt=Date.now(); try{ clearInterval(thinkTick); }catch(e){}
    asst.text=cleanAssistantText(asst.text);
    asst.pending=false;
    s.updatedAt=Date.now(); if(!temporary) saveSessions();
    clearPending(userMsg.id);
    setStreaming(false); renderAll();
    if(settings.voice.voiceMode&&asst.text&&!vmOpen) speak(asst.text);
    if(settings.interface.autoCopy&&asst.text) copyText(asst.text);
    if(!temporary&&s.titleAutoPending&&!s.titleRequested&&s.messages.length===2&&s.messages[0].role==='user'&&asst.text&&!asst.activity.some(a=>a.state==='error')&&getSession(s.id)===s){
      const sid=s.id; setTimeout(()=>{ generateTitle(sid).catch(()=>{}); },3000);
    }
    if(!temporary&&asst.text&&!asst.activity.some(a=>a.state==='error')&&getSession(s.id)===s){
      const sid=s.id, mid=asst.id; setTimeout(()=>{ requestFollowups(sid,mid).catch(()=>{}); },1200);
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
    if(ev==='text'&&obj&&typeof obj.text==='string'){ absorbWorkNotes(asst,obj.text); if(obj.text) asst.textReceived=true; paintAssistant(s,asst); }
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
  fresh.querySelectorAll('[data-table-copy]').forEach(b=>b.addEventListener('click',()=>tableCopy(b)));
  fresh.querySelectorAll('[data-table-open]').forEach(b=>b.addEventListener('click',()=>tableOpen(b)));
  fresh.querySelectorAll('[data-fu]').forEach(b=>b.addEventListener('click',()=>{ const t=b.getAttribute('data-fu-text'); if(t) sendMessage(t); }));
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
  if(t&&t.length>1){ s.title=t; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); const cur=curSession(); if(cur&&cur.id===s.id) $('#topTitle').innerHTML='<span class="top-logo">'+J_MARK+'</span><span>'+esc(t)+'</span>'; }
}
async function requestFollowups(sessionId,mid){
  /* Grok shows two follow-up pills under a reply. Ours are generated by the
     model (same lightweight title-call pattern); if the call fails or returns
     nothing usable, no pills render — never a fake suggestion. */
  const s=getSession(sessionId); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m||m.followups||m.pending||!m.text) return;
  if(streaming) return;
  const fast=MODELS[0];
  const u=[...s.messages].reverse().find(x=>x.role==='user');
  if(!u) return;
  const prompt='Suggest 2 short follow-up questions the user might ask next IN THIS APP. Only suggest things this app can actually do: answer questions, write text or code, translate, solve math, explain its own features and models, or discuss an attached file or image. Never suggest directions, weather, maps, locations, news, or anything needing live data, an account, or tools this app does not have. Reply with only the two questions, one per line, no numbering, no quotes.\n\nUser: '+String(u.text||'').slice(0,400)+'\nAssistant: '+String(m.text||'').slice(0,400);
  let text='';
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:prompt, history:[], files:[], provider:fast.provider, model:fast.id, mode:'general', customPrompt:'You suggest follow-up questions. Reply with only the questions.', webSearch:false, forceWebSearch:false, autoFallback:false, smartRouter:false, activityStream:false, autoTools:false, personalization:{intelligence:'Instant', fastAnswers:true} })});
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
  }catch(e){ return; }
  text=cleanAssistantText(text);
  const qs=text.split('\n').map(l=>l.replace(/^\s*(?:[-*•\d.)\]]+\s*)/,'').replace(/^["“”']+|["“”']+$/g,'').trim()).filter(l=>l.length>3&&l.length<=90&&/\?$/.test(l)).slice(0,2);
  if(qs.length){ m.followups=qs; s.updatedAt=Date.now(); saveSessions(); if(curSession()&&curSession().id===s.id) renderMessages(); }
}
async function runImageGeneration(s,userMsg){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true};
  s.messages.push(asst); renderMessages(); setStreaming(true);
  if(!temporary) addPending(s.id,userMsg.id,'image',null);
  trackRequest('image');
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'generate-image', prompt:userMsg.text, model:'auto'})});
    const data=await res.json().catch(()=>({}));
    if(data&&data.imageDataUrl){ asst.image=data.imageDataUrl; asst.text='Here is your image.'; }
    else throw new Error((data&&(data.error||data.detail))||'Image generation failed');
  }catch(err){ asst.errorCard=String(err&&err.message?err.message:'Image generation failed.'); asst.text=''; }
  asst.pending=false; s.updatedAt=Date.now(); if(!temporary) saveSessions(); clearPending(userMsg.id); setStreaming(false); renderAll();
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
      if(e&&e.error==='not-allowed'){ warnToast('Microphone access denied. Check your browser settings.'); warnToast('Customize how much your dictation is cleaned up in settings.', {label:'Settings', onClick:()=>openSettings()}); }
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
      if(e&&e.error==='not-allowed'){ warnToast('Microphone access denied. Check your browser settings.'); closeVoiceMode(); }
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
    if(e&&e.name==='NotAllowedError'){ warnToast('Microphone access denied. Check your browser settings.'); return; }
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
  /* Grok's picker is a small popup anchored ABOVE the composer, not a
     bottom sheet — same 9 real models, same checkmark, Premium band last. */
  const c=$('#composer').getBoundingClientRect();
  /* One-line rows (badge + name + Free tag + check) — grok's picker is
     ~730px tall; the old two-line rows made ours ~1,420px. */
  const items=[{header:modelOf().name+' · Default'}].concat(MODELS.map(m=>({icon:null,badge:m.badge,label:m.name,tag:'Free',checked:m.id===settings.model,onClick:()=>{
    settings.provider=m.provider; settings.model=m.id; saveSettings(); renderAll(); toast(m.name+' selected');
  }})));
  items.push({band:true,title:'Premium',sub:'Unlock extended capabilities',pill:'Upgrade',onClick:()=>{ settingsPageKey='subscription'; renderSettingsPage(); $('#settingsPage').hidden=false; }});
  showMenu(Math.max(8,c.left), c.top-8, items, {above:true});
}
function openPlusMenu(){
  /* Grok's "+" opens one menu: attach/create actions plus the Search/Think/
     Build modes that used to be labeled chips in the composer row. Nothing
     is removed — the modes just live behind the "+" now, with checkmarks. */
  const r=$('#plusBtn').getBoundingClientRect();
  const c=$('#composer').getBoundingClientRect();
  showMenu(Math.max(8,r.left), c.top-8, [
    {icon:'file',label:'Attach files',onClick:()=>pickFile('files')},
    {icon:'camera',label:'Take a photo',onClick:()=>pickFile('camera')},
    {icon:'image',label:'Choose from library',onClick:()=>pickFile('library')},
    {icon:'zap',label:'Create image',onClick:()=>{ activeTool='image'; openSheet('#imageSheet'); setTimeout(()=>$('#imagePrompt').focus(),60); }},
    {icon:'globe',label:'Search the web',checked:!!settings.webSearch,onClick:()=>{ settings.webSearch=!settings.webSearch; saveSettings(); renderComposerState(); toast(settings.webSearch?'Web search on':'Web search off'); }},
    {icon:'brain',label:'Think',checked:settings.responseMode==='Thinking',onClick:()=>{ settings.responseMode=settings.responseMode==='Thinking'?'Auto':'Thinking'; saveSettings(); renderComposerState(); toast(settings.responseMode==='Thinking'?'Thinking mode on':'Thinking mode off'); }},
    {icon:'wrench',label:'Build',onClick:()=>openModelSheet()}
  ], {above:true});
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
 {key:'account', icon:'user', label:'Account', value:()=>''},
 {key:'appearance', icon:'monitor', label:'Appearance', value:()=>cap(settings.theme||'light')},
 {key:'behavior', icon:'brain', label:'Behavior', value:()=>cap(settings.responseMode||'Auto')},
 {key:'voice', icon:'volume-2', label:'Voice', value:()=>voiceLabel()},
 {key:'data', icon:'shield', label:'Data controls', value:()=>''},
 {key:'subscription', icon:'zap', label:'Subscription', value:()=>'Free'},
 {key:'profile', icon:'user', label:'Profile', value:()=>settings.profileName||'Jepong'},
 {key:'usage', icon:'gauge', label:'Usage', value:()=>''},
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
  /* Grok's settings header has ONE exit: on the list page the back arrow
     closes the page exactly like the X, so hide it there; sub-pages keep
     it (there it means "back to the list", not "close"). */
  const sb=$('#settingsBack'); if(sb) sb.style.display=settingsPageKey==='list'?'none':'';
  const back=()=>{ settingsPageKey='list'; renderSettingsPage(); };
  const rowHtml=r=>'<button class="set-row" data-set="'+r.key+'"><span class="set-ic">'+icon(r.icon,18)+'</span><span class="set-label">'+esc(r.label)+'</span>'+(r.value()?'<span class="set-value">'+esc(r.value())+'</span>':'')+'<span class="chev">'+icon('chevron-right',16)+'</span></button>';
  if(settingsPageKey==='list'){
    title.textContent='Settings';
    body.innerHTML='<div class="set-search"><span>'+icon('search',16)+'</span><input id="setSearch" type="text" placeholder="Search settings" autocomplete="off"></div>'
      +'<div class="set-list">'+SETTING_ROWS.map(rowHtml).join('')+'</div>'
      +'<button class="set-row danger" data-set="signout"><span class="set-ic">'+icon('log-out',18)+'</span><span class="set-label">Sign out</span></button>';
    body.querySelector('#setSearch').addEventListener('input',e=>{
      const q=e.target.value.toLowerCase();
      body.querySelectorAll('.set-list [data-set], .set-row.danger').forEach(b=>{ b.style.display=!q||(b.textContent||'').toLowerCase().includes(q)?'':'none'; });
    });
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
    body.innerHTML='<div class="set-list"><button class="set-row" id="themeRow"><span class="set-ic">'+icon('monitor',18)+'</span><span class="set-label">Theme</span><span class="set-value">'+esc(cap(cur))+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button></div>'
      +'<div class="set-card">'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Wrap long code blocks</h3><p>Wrap long lines in code blocks by default.</p></div><button id="wrapCodeSw" class="switch'+(settings.interface.wrapCode?' on':'')+'" type="button" aria-label="Wrap long code blocks"></button></div>'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Reduce motion</h3></div><button id="reduceMotionSw" class="switch'+(settings.interface.reduceMotion?' on':'')+'" type="button" aria-label="Reduce motion"></button></div>'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Show suggestions</h3><p>Starter prompts on new chats and follow-ups under replies.</p></div><button id="showSuggSw" class="switch'+(settings.interface.showSuggestions!==false?' on':'')+'" type="button" aria-label="Show suggestions"></button></div>'
      +'</div>'
      +'<button class="upgrade-band sticky" id="appearanceUpgrade"><span><span class="ub-title">Premium</span><span class="ub-sub">Unlock extended capabilities</span></span><span class="ub-pill">Upgrade</span></button>';
    body.querySelector('#themeRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['light','dark','system'].map(t=>({label:cap(t)+(cur===t?' ✓':''), onClick:()=>{ settings.theme=t; saveSettings(); applyTheme(); renderSettingsPage(); }})));
    });
    body.querySelector('#wrapCodeSw').addEventListener('click',e=>{ settings.interface.wrapCode=!settings.interface.wrapCode; saveSettings(); applyTheme(); e.currentTarget.classList.toggle('on', settings.interface.wrapCode); });
    body.querySelector('#reduceMotionSw').addEventListener('click',e=>{ settings.interface.reduceMotion=!settings.interface.reduceMotion; saveSettings(); applyTheme(); e.currentTarget.classList.toggle('on', settings.interface.reduceMotion); });
    body.querySelector('#showSuggSw').addEventListener('click',e=>{ settings.interface.showSuggestions=settings.interface.showSuggestions===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.interface.showSuggestions!==false); renderAll(); });
    body.querySelector('#appearanceUpgrade').addEventListener('click',()=>{ settingsPageKey='subscription'; renderSettingsPage(); });
    return;
  }
  if(settingsPageKey==='behavior'){
    title.textContent='Behavior';
    body.innerHTML='<div class="set-card">'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Default response mode</h3><p>'+esc(cap(settings.responseMode||'Auto'))+'</p></div><button id="behModeBtn" class="btn-primary" type="button" style="flex:none">Change</button></div>'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Auto-generate chat titles</h3><p>Give each chat a short summary title.</p></div><button id="behTitleSw" class="switch'+(settings.interface.titleAuto!==false?' on':'')+'" type="button" aria-label="Auto-generate chat titles"></button></div>'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Auto-copy replies</h3><p>Copy each reply to the clipboard automatically.</p></div><button id="behCopySw" class="switch'+(settings.interface.autoCopy?' on':'')+'" type="button" aria-label="Auto-copy replies"></button></div>'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Paste images as files</h3><p>Images pasted into the composer attach as files.</p></div><button id="behPasteSw" class="switch'+(settings.interface.pasteAsFile!==false?' on':'')+'" type="button" aria-label="Paste images as files"></button></div>'
      +'</div>';
    body.querySelector('#behModeBtn').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['Auto','Thinking','Fast'].map(m=>({label:m+(settings.responseMode===m?' ✓':''), onClick:()=>{ settings.responseMode=m; saveSettings(); renderComposerState(); renderSettingsPage(); toast('Default mode: '+m); }})));
    });
    body.querySelector('#behTitleSw').addEventListener('click',e=>{ settings.interface.titleAuto=settings.interface.titleAuto===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.interface.titleAuto!==false); });
    body.querySelector('#behCopySw').addEventListener('click',e=>{ settings.interface.autoCopy=!settings.interface.autoCopy; saveSettings(); e.currentTarget.classList.toggle('on', !!settings.interface.autoCopy); });
    body.querySelector('#behPasteSw').addEventListener('click',e=>{ settings.interface.pasteAsFile=settings.interface.pasteAsFile===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.interface.pasteAsFile!==false); });
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
      +'<button class="set-row" id="voiceSpeedRow"><span class="set-ic">'+icon('gauge',18)+'</span><span class="set-label">Speed</span><span class="set-value">'+esc(vmSpeedLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="voicePersRow"><span class="set-ic">'+icon('user',18)+'</span><span class="set-label">Personality</span><span class="set-value">'+esc(vmPersonalityLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<div class="set-card"><h3>Read replies aloud</h3><p>Speak each answer automatically with the selected voice.</p><button id="voiceModeSw" class="switch'+(settings.voice.voiceMode?' on':'')+'" type="button" aria-label="Read replies aloud"></button></div>';
    body.querySelector('[data-voice-page="lang"]').addEventListener('click',()=>{ settingsPageKey='voice-lang'; renderSettingsPage(); });
    body.querySelector('#voiceSpeedRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.min(r.left,window.innerWidth-220), r.bottom+4, VM_SPEEDS.map(sp=>({label:sp.l+((settings.voice.rate||1)===sp.v?' ✓':''), onClick:()=>{ settings.voice.rate=sp.v; saveSettings(); renderSettingsPage(); toast('Speed updated'); }})));
    });
    body.querySelector('#voicePersRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.min(r.left,window.innerWidth-220), r.bottom+4, VM_PERSONALITIES.map(p=>({label:p+(vmPersonalityLabel()===p?' ✓':''), onClick:()=>{ settings.personalization.style=p==='Custom…'?'Custom':(p==='Assistant'?'Default':p); saveSettings(); renderSettingsPage(); toast('Personality updated'); }})));
    });
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
      +'<button class="set-row" data-data="export"><span class="set-ic">'+icon('download',18)+'</span><span class="set-label">Export chats</span></button>'
      +'<div class="set-card"><h3>Personalize with conversation history</h3><p>Let replies use what you talked about before.</p><button id="refHistSw" class="switch'+(settings.personalization.refHistory!==false?' on':'')+'" type="button" aria-label="Personalize with conversation history"></button></div>'
      +'<div class="set-card"><h3>Use saved memory</h3><p>Let replies use your saved notes and preferences.</p><button id="refMemSw" class="switch'+(settings.personalization.refMemory!==false?' on':'')+'" type="button" aria-label="Use saved memory"></button></div>'
      +'<button class="set-row danger" data-data="chats"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete all chats</span></button>'
      +'<button class="set-row danger" data-data="all"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete all data</span></button>';
    body.querySelectorAll('[data-data]').forEach(b=>b.addEventListener('click',async()=>{
      const kind=b.getAttribute('data-data');
      if(kind==='export'){
        const payload={exportedAt:new Date().toISOString(), app:'JepongDevxyz AI', sessions, projects};
        const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
        const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='jepongdevxyz-ai-export.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
        toast('Chats exported'); return;
      }
      const ok=await showConfirm({title:kind==='all'?'Delete all data?':'Delete all chats?', text:kind==='all'?'Chats, settings, projects and usage counters will be deleted.':'All chats will be permanently deleted.', okLabel:'Delete'});
      if(!ok) return;
      if(kind==='all'){ localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY); location.reload(); return; }
      sessions=[]; currentId=null; saveSessions(); renderAll(); toast('All chats deleted');
    }));
    body.querySelector('#refHistSw').addEventListener('click',e=>{ settings.personalization.refHistory=settings.personalization.refHistory===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.personalization.refHistory!==false); });
    body.querySelector('#refMemSw').addEventListener('click',e=>{ settings.personalization.refMemory=settings.personalization.refMemory===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.personalization.refMemory!==false); });
    return;
  }
  if(settingsPageKey==='account'){
    title.textContent='Account';
    body.innerHTML='<div class="set-card"><h3>'+esc(settings.profileName||'Jepong')+'</h3><p>'+esc(settings.profileEmail||'No email set')+' · Free plan</p></div>'
      +'<button class="set-row" id="accLangRow"><span class="set-ic">'+icon('globe',18)+'</span><span class="set-label">Language</span><span class="set-value">'+esc((settings.responseLang&&settings.responseLang.label)||'Auto')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row danger" data-acc="data"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete all data</span></button>';
    body.querySelector('#accLangRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      const langs=[{code:'auto',label:'Auto'},{code:'en',label:'English'},{code:'fil',label:'Filipino'},{code:'es',label:'Spanish'},{code:'fr',label:'French'},{code:'de',label:'German'},{code:'ja',label:'Japanese'},{code:'ko',label:'Korean'},{code:'zh',label:'Chinese'}];
      showMenu(Math.min(r.left,window.innerWidth-220), r.bottom+4, langs.map(l=>({label:l.label+(((settings.responseLang&&settings.responseLang.code)||'auto')===l.code?' ✓':''), onClick:()=>{ settings.responseLang={code:l.code,label:l.label}; saveSettings(); renderSettingsPage(); toast('Language updated'); }})));
    });
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
  $('#privateBtn').addEventListener('click',()=>{ setPrivate(!temporary); });
  $('#topSearchBtn').addEventListener('click',()=>{ if(window.innerWidth<1024){ $('#sidebar').classList.add('open'); $('#scrim').hidden=false; } setTimeout(()=>$('#chatSearch').focus(),80); });
  $('#topTitle').addEventListener('click',()=>{ const s=curSession(); if(!s) return; const r=$('#topTitle').getBoundingClientRect(); showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, sessionMenuItems(s)); });
  $('#sbNewProj').addEventListener('click',async()=>{
    const name=await promptDialog('New project','Project name','');
    if(name===null||!name.trim()) return;
    projects.unshift({id:uid(), name:name.trim(), createdAt:Date.now()});
    saveProjects(); renderSidebar(); toast('Project created');
  });
  $('#profileBtn').addEventListener('click',e=>{
    /* Grok's profile row opens an account menu — Settings/Help/Upgrade/
       Sign out all already exist, they just live behind this menu now. */
    const r=e.currentTarget.getBoundingClientRect(); closeSidebarMobile();
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.top-8, [
      {header:(settings.profileName||'Jepong')+(settings.profileEmail?' · '+settings.profileEmail:'')},
      {icon:'settings',label:'Settings',onClick:()=>openSettings()},
      {icon:'circle-help',label:'Help',onClick:()=>openInfoPage('help')},
      {icon:'rocket',label:'Upgrade to Premium',onClick:()=>openInfoPage('upgrade')},
      {icon:'log-out',label:'Sign out',danger:true,onClick:()=>signOut()}
    ], {above:true});
  });
  $('#sbProjChev').addEventListener('click',()=>{ collapsedSecs.projects=!collapsedSecs.projects; $('#projList').classList.toggle('collapsed', collapsedSecs.projects); $('#sbProjChev').classList.toggle('closed', collapsedSecs.projects); });
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
  input.addEventListener('input',()=>{ autosize(); renderComposerState(); saveDraft(); });
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMessage(); }
  });
  $('#sendBtn').addEventListener('click',()=>sendMessage());
  $('#stopBtn').addEventListener('click',()=>{ if(aborter){ try{ aborter.abort(); }catch(e){} } });
  $('#modelBtn').addEventListener('click',openModelSheet);
  $('#plusBtn').addEventListener('click',openPlusMenu);
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
    const finish=()=>{ pending--; if(!pending){ renderComposerState(); saveDraft(); if(attached) toast(attached+' file(s) attached'); } };
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
  $('#settingsClose').addEventListener('click',()=>{ $('#settingsPage').hidden=true; });
  $('#infoBack').addEventListener('click',()=>{ $('#infoPage').hidden=true; });
  $('#infoClose').addEventListener('click',()=>{ $('#infoPage').hidden=true; });
  const cv=$('#chatView');
  cv.addEventListener('scroll',()=>{
    const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
    stickToBottom=dist<60;
    updateScrollBtn();
  });
  $('#scrollBottom').addEventListener('click',()=>{ cv.scrollTo({top:cv.scrollHeight, behavior:'smooth'}); stickToBottom=true; updateScrollBtn(); });
  document.addEventListener('click',e=>{ if(suppressMenuClose){ suppressMenuClose=false; return; } if(activeMenu&&!e.target.closest('.menu-pop')) closeMenu(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(vmOpen){ closeVoiceMode(); return; } closeAllSheets(); closeMenu(); if($('#sidebar').classList.contains('open')) closeSidebarMobile(); } });
  if('speechSynthesis' in window){ loadVoices(); try{ speechSynthesis.onvoiceschanged=()=>{ loadVoices(); }; }catch(e){} }
}
document.addEventListener('DOMContentLoaded',()=>{
  applyTheme(); wire(); renderAll();
  /* Refresh-proofing: reopen the chat she was in (with its draft), then
     resume any reply that was still streaming or queued when she refreshed.
     Nothing is lost on reload. */
  if(extra.lastSessionId&&getSession(extra.lastSessionId)){ openSession(extra.lastSessionId); }
  else restoreDraft();
  recoverPending();
});
