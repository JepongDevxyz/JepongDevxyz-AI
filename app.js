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
'graduation-cap':'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
smile:'<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
'panel-right':'<rect width="18" height="18" x="3" y="3" rx="2"/><line x1="15" x2="15" y1="3" y2="21"/>',
tag:'<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
'layout-grid':'<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
sliders:'<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/>',
bell:'<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
plug:'<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
'file-text':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
'presentation':'<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/><path d="M7 17h10"/>',
sheet:'<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/>',
link:'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
archive:'<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>'
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
 {provider:'apinex', id:'free/deepseek-v4.1-flash', name:'DeepSeek V4.1 Flash', short:'DeepSeek V4.1', tiny:'V4.1 Flash', badge:'DS', desc:'Default · Free', sub:'Fastest answers for everyday questions'},
 {provider:'apinex', id:'free/deepseek-v4-flash-0731', name:'DeepSeek V4 Flash', short:'DeepSeek V4', tiny:'V4 Flash', badge:'DS', desc:'Free', sub:'Fast answers, everyday questions'},
 {provider:'apinex', id:'free/deepseek-v4-pro-0813', name:'DeepSeek V4 Pro', short:'DeepSeek V4 Pro', tiny:'V4 Pro', badge:'DS', desc:'Free', sub:'Deeper reasoning, expert answers'},
 {provider:'apinex', id:'free/gemini-4-hydrogen', name:'Gemini 4 Hydrogen', short:'Gemini 4', tiny:'Gemini 4', badge:'GE', desc:'Free', sub:'Fast answers with search and images'},
 {provider:'apinex', id:'free/glm-5.3-flash', name:'GLM 5.3 Flash', short:'GLM 5.3', tiny:'GLM 5.3', badge:'GL', desc:'Free', sub:'Fast answers, long conversations'},
 {provider:'apinex', id:'free/glm-5.3-flashx', name:'GLM 5.3 FlashX', short:'GLM 5.3X', tiny:'GLM 5.3X', badge:'GL', desc:'Free', sub:'Extra-fast answers'},
 {provider:'apinex', id:'free/gpt-6-luna', name:'GPT-6 Luna', short:'GPT-6 Luna', tiny:'Luna', badge:'GP', desc:'Free', sub:'Creative writing and conversation'},
 {provider:'apinex', id:'free/minimax-m3.1-flash', name:'MiniMax M3.1 Flash', short:'MiniMax M3.1', tiny:'M3.1 Flash', badge:'MM', desc:'Free', sub:'Fast answers, long context'},
 {provider:'apinex', id:'free/qwen-3.8-max', name:'Qwen 3.8 Max', short:'Qwen 3.8', tiny:'Qwen 3.8', badge:'QW', desc:'Free', sub:'Strong coding and reasoning'}
];
// APINEX-only (2026-11-24): Bailu removed completely. These 9 free models
// passed a live retest the same day; the other free/ models are
// subscription-gated (402) despite the prefix and are NOT listed.
const SESS_KEY='jepongQwenReset.sessions.v1', SET_KEY='jepongQwenReset.settings.v1', PROJ_KEY='jepongQwenReset.projects.v1', EXTRA_KEY='jepongQwenReset.extra.v1', DRAFT_KEY='jepongQwenReset.drafts.v1', PENDING_KEY='jepongQwenReset.pending.v1', LIB_KEY='jepongQwenReset.library.v1';
const EFFORT={Auto:'Medium',Thinking:'High',Fast:'Instant'};
const defaultSettings=()=>({
  theme:'light', profileName:'Jepong', profileEmail:'', profilePhoto:'',
  provider:'apinex', model:'free/deepseek-v4.1-flash',
  responseMode:'Auto', webSearch:false, toolsEnabled:true, advancedEnabled:true,
  responseLang:{code:'auto', label:'Auto'},
  behavior:{ctrlEnter:false, autoScroll:true},
  notifications:{browser:false, updates:'Off'},
  data:{improveModel:true, allowShare:true},
  plan:'Free',
  interface:{titleAuto:true, autoCopy:false, pasteAsFile:true, wrapCode:false, reduceMotion:false, showSuggestions:true},
  personalization:{nickname:'', about:'', style:'Default', custom:'', enableNew:true, refMemory:true, refHistory:true, savedMemory:''},
  advanced:{webScraping:true, imageSearch:true, webSearchAdv:true, imageGeneration:true, codeInterpreter:true, retrieveMemory:true, imageEditing:true, updateMemory:true, localEnlarge:true},
  cookies:{analytics:false, personalization:true},
  voice:{voiceURI:'', name:'', lang:'', rate:1, pitch:1, voiceMode:false, micDeviceId:'', personality:'Assistant', dictation:'Tidy up'}
});
let settings=Object.assign(defaultSettings(), loadJSON(SET_KEY,{}));
settings.interface=Object.assign(defaultSettings().interface, settings.interface||{});
settings.personalization=Object.assign(defaultSettings().personalization, settings.personalization||{});
settings.advanced=Object.assign(defaultSettings().advanced, settings.advanced||{});
settings.cookies=Object.assign(defaultSettings().cookies, settings.cookies||{});
settings.voice=Object.assign(defaultSettings().voice, settings.voice||{});
settings.responseLang=Object.assign(defaultSettings().responseLang, settings.responseLang||{});
settings.behavior=Object.assign(defaultSettings().behavior, settings.behavior||{});
settings.notifications=Object.assign(defaultSettings().notifications, settings.notifications||{});
settings.data=Object.assign(defaultSettings().data, settings.data||{});
if(typeof settings.plan!=='string'||!settings.plan) settings.plan='Free';
if(!MODELS.some(m=>m.provider===settings.provider&&m.id===settings.model)){ settings.provider='apinex'; settings.model='free/deepseek-v4.1-flash'; }
function saveSettings(){ saveJSON(SET_KEY, settings); }
let sessions=loadJSON(SESS_KEY,[]); if(!Array.isArray(sessions)) sessions=[];
sessions=sessions.filter(s=>!s.temporary); /* a private chat never reaches storage */
let projects=loadJSON(PROJ_KEY,[]); if(!Array.isArray(projects)) projects=[];
let extra=loadJSON(EXTRA_KEY,{feedback:[],reports:[]}); if(!extra||typeof extra!=='object') extra={feedback:[],reports:[]};
if(!extra.usage) extra.usage={chat:0, image:0, voice:0};
if(!Array.isArray(extra.trash)) extra.trash=[];
if(!Array.isArray(extra.automations)) extra.automations=[];
if(!Array.isArray(extra.sharedLinks)) extra.sharedLinks=[];
if(!Array.isArray(extra.skills)) extra.skills=[];
if(!Array.isArray(extra.connectRequested)) extra.connectRequested=[];
if(!Array.isArray(extra.customConnectors)) extra.customConnectors=[];
if(extra.bannerDismissed!==true) extra.bannerDismissed=false;
if(typeof extra.seenVersion!=='string') extra.seenVersion='';
let library=loadJSON(LIB_KEY,[]); if(!Array.isArray(library)) library=[];
function saveLibrary(){ saveJSON(LIB_KEY, library); }
function libraryBytes(){ return library.reduce((n,f)=>n+((f.data?Math.floor(f.data.length*0.75):0)+(f.size||0)),0); }
function fmtBytes(n){ if(n<1024) return n+' B'; if(n<1048576) return (n/1024).toFixed(1)+' KB'; return (n/1048576).toFixed(1)+' MB'; }
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
let collapsedSecs={chats:false,projects:false}; /* sidebar section collapse (Grok parity) */
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
  /* Grok's code header has ONE control: Copy. Download/Collapse are gone
     per the rebuild order. */
  return '<div class="code-block" data-code="'+esc(code)+'"><div class="code-head">'+langBadge(lang)+'<span class="code-lang">'+esc(lang||'code')+'</span>'
    +'<button type="button" data-code-act="copy" aria-label="Copy code">'+icon('copy',15)+'</button></div>'
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
      html+='<div class="table-wrap"><table><thead><tr>'+head.map(c=>'<th>'+inlineMd(c)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table><div class="table-foot"><button type="button" data-table-copy>'+icon('copy',14)+'<span>Copy table</span></button><button type="button" data-table-open>'+icon('file-down',14)+'<span>Open as file</span></button></div></div>'; continue; }
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
  let items=sessions.filter(s=>!s.temporary&&!s.archived);
  /* Dedupe by id — a session must never render twice, whatever the array holds. */
  const seenIds=new Set(); items=items.filter(s=>{ if(seenIds.has(s.id)) return false; seenIds.add(s.id); return true; });
  if(activeProjectId) items=items.filter(s=>s.projectId===activeProjectId);
  const pinned=items.filter(s=>s.pinned), rest=items.filter(s=>!s.pinned);
  /* Round 5: two DIFFERENT chats can share one auto-title — disambiguate
     the DISPLAY title only, numbering in render order. */
  const titleCount={}, dispTitle=new Map();
  [...pinned, ...rest].forEach(s=>{ const t=(s.title||'New chat'); const k=t.toLowerCase(); titleCount[k]=(titleCount[k]||0)+1; dispTitle.set(s.id, titleCount[k]>1? t+' ('+titleCount[k]+')' : t); });
  let html='';
  if(activeProjectId){ const p=projects.find(p=>p.id===activeProjectId); html+='<div class="sb-group">'+esc(p?p.name:'Project')+' · <a href="#" id="clearProj" style="color:var(--accent)">All chats</a></div>'; }
  html+=pinned.map(s=>itemHtml(s, dispTitle.get(s.id))).join('');
  const shown=showAllChats?rest:rest.slice(0,5);
  html+=shown.map(s=>itemHtml(s, dispTitle.get(s.id))).join('');
  if(!showAllChats&&rest.length>5) html+='<button class="sb-more" id="sbMore" type="button">Show more</button>';
  if(!items.length) html+='<div class="sb-empty">'+(activeProjectId?'No chats in this project yet.':'No chats yet. Start a new one.')+'</div>';
  list.innerHTML=html;
  list.classList.toggle('collapsed', !!collapsedSecs.chats);
  const more=$('#sbMore'); if(more) more.addEventListener('click',()=>{ showAllChats=true; renderSidebar(); });
  const pl=$('#projList');
  /* Grok shows its Projects header + "New Project" row even with no
     projects; the header is static HTML now, the list always renders. */
  if(pl){
    pl.innerHTML=projects.length
      ? projects.map(p=>'<button class="sb-item" data-proj="'+p.id+'"><span class="sb-item-title">'+esc(p.name)+'</span></button>').join('')
      : '<button class="sb-item" id="sbNewProjRow" type="button"><span class="sb-item-title">New Project</span></button>';
    pl.querySelectorAll('[data-proj]').forEach(el=>el.addEventListener('click',()=>{ openProjectPage(el.getAttribute('data-proj')); }));
    const nr=$('#sbNewProjRow'); if(nr) nr.addEventListener('click',()=>openProjectDialog());
  }
  const cp=$('#clearProj'); if(cp) cp.addEventListener('click',e=>{ e.preventDefault(); activeProjectId=null; renderSidebar(); });
  list.querySelectorAll('.sb-item').forEach(el=>{
    el.addEventListener('click',e=>{ if(e.target.closest('.sb-item-menu')) return; openSession(el.dataset.id); });
    const menuBtn=el.querySelector('.sb-item-menu');
    if(menuBtn) menuBtn.addEventListener('click',e=>{ e.stopPropagation(); chatItemMenu(el.dataset.id, menuBtn); });
  });
  hydrateIcons(list);
}
function itemHtml(s, displayTitle){
  return '<button class="sb-item'+(s.id===currentId?' active':'')+'" data-id="'+s.id+'"><span class="sb-item-title">'+esc(displayTitle||s.title||'New chat')+'</span><span class="sb-item-menu" role="button" aria-label="Chat options">'+icon('ellipsis',16)+'</span></button>';
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
  const ok=await showConfirm({title:'Delete chat?', text:'"'+(s.title||'New chat')+'" will be moved to Deleted Conversations. You can restore it from Settings → Data Controls.', okLabel:'Delete'});
  if(!ok) return;
  await trashChat(s);
  sessions=sessions.filter(x=>x.id!==id);
  if(currentId===id){ currentId=null; }
  saveSessions(); renderAll();
}
function promptDialog(title,label,initial,multiline){
  return new Promise(res=>{
    const m=$('#infoModal'); $('#infoModalTitle').textContent=title;
    const body=$('#infoModalText');
    body.innerHTML='';
    const lab=document.createElement('label'); lab.className='field-label'; lab.textContent=label;
    const inp=document.createElement(multiline?'textarea':'input'); inp.className='field'; inp.value=initial||''; if(!multiline) inp.maxLength=60; else inp.rows=4;
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
const SUGGESTIONS=[{t:'Explain a concept',icon:'lightbulb'},{t:'Make a website',icon:'code'},{t:'Search the web',icon:'globe'}];
function renderHomeSugg(){
  /* Grok home shows exactly these 3 rows under the composer, in this order,
     centred, grey. Each sends its text as a real message (web search is a
     backend behavior now, not a toggle). */
  const box=$('#homeSugg'); if(!box) return;
  if(curSession()){ box.hidden=true; box.innerHTML=''; return; }
  box.hidden=false;
  box.innerHTML=SUGGESTIONS.map(o=>'<button type="button" data-sugg="'+esc(o.t)+'"><span class="sugg-ic">'+icon(o.icon,16)+'</span><span>'+esc(o.t)+'</span></button>').join('');
  box.querySelectorAll('[data-sugg]').forEach(b=>b.addEventListener('click',()=>sendMessage(b.getAttribute('data-sugg'))));
}
function renderAll(){
  applyTheme();
  const s=curSession();
  const hasChat=!!s;
  $('#homeView').hidden=hasChat;
  $('#chatView').hidden=!hasChat;
  $('#greetLine1').textContent="What's on the agenda today?";
  $('#greetLine2').hidden=true;
  const pel=$('#profileEmailLabel'); if(pel){ pel.textContent=settings.profileEmail||'Free plan'; }
  $('#profileNameLabel').textContent=settings.profileName||'Jepong';
  $('#profileAvatar').textContent=(settings.profileName||'J')[0].toUpperCase();
  /* Grok top bar: centred pill. Home = smiley + "JepongDevxyz AI"; in a
     chat = the chat title, truncated. The dashed "Private" badge sits right
     of the pill (grok shows it); tapping it toggles Private mode. */
  const tt=$('#topTitle');
  const label=hasChat?(s.title||'New chat'):'JepongDevxyz AI';
  tt.classList.toggle('chat-title', hasChat);
  tt.innerHTML='<span class="top-pill">'+(hasChat?'':'<span class="top-smiley">'+icon('smile',18)+'</span>')+'<span>'+esc(label)+'</span></span>'
    +'<button type="button" class="private-badge'+(temporary?' on':'')+'" id="topPrivateBadge" aria-label="Private chat" aria-pressed="'+(temporary?'true':'false')+'">Private</button>';
  const badge=$('#topPrivateBadge');
  if(badge) badge.addEventListener('click',e=>{ e.stopPropagation(); setPrivate(!temporary); });
  const banner=$('#appBanner'); if(banner) banner.hidden=!!extra.bannerDismissed;
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
      /* Grok: NO bubble — plain dark text, right-aligned, toolbar Copy/Edit
         only beneath it. Delete is gone per the rebuild order. */
      html+='<div class="msg user" data-mid="'+m.id+'"><div class="msg-user-text">'
        +((m.attachments||[]).map(a=>'<span class="att-chip">'+esc(a.name)+'</span>').join(''))
        +esc(m.text)+'</div><div class="msg-user-actions">'
        +'<button type="button" class="icon-btn" data-u-act="copy" data-mid="'+m.id+'" aria-label="Copy">'+icon('copy',15)+'</button>'
        +'<button type="button" class="icon-btn" data-u-act="edit" data-mid="'+m.id+'" aria-label="Edit">'+icon('pencil',15)+'</button>'
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
  box.querySelectorAll('.think-row').forEach(r=>r.addEventListener('click',()=>{ const div=r.parentElement.querySelector('.think-divider'); if(div) div.hidden=!div.hidden; const ch=r.querySelector('.think-chev'); if(ch) ch.innerHTML=icon(div&&!div.hidden?'chevron-up':'chevron-right',13); }));
  box.querySelectorAll('[data-src-open]').forEach(b=>b.addEventListener('click',()=>openSources(b.getAttribute('data-src-open'))));
  box.querySelectorAll('[data-src-chip]').forEach(c=>c.addEventListener('click',()=>openSources(c.getAttribute('data-src-chip'))));
  if(stickToBottom){ const cv=$('#chatView'); cv.scrollTop=cv.scrollHeight; }
}
function favColor(host){
  /* Grok shows real favicons; the honest local equivalent is a coloured
     circle with the domain's initial — no fake brand logo, no network fetch. */
  const colors=['#3572a5','#b59a00','#3178c6','#e34c26','#563d7c','#4e9a06','#b07219','#7f52ff','#00add8','#cc342d','#777bb3','#f05138'];
  let n=0; for(const c of String(host||'')) n=(n*31+c.charCodeAt(0))>>>0;
  return colors[n%colors.length];
}
function assistantHtml(s,m){
  let h='<div class="msg asst" data-mid="'+m.id+'">';
  /* Grok thinking: the row shows "Working for Ns" live / "Thought for Ns"
     after, and expanding it shows ONLY a thin divider line — no steps, no
     step lines, ever. Work notes are still stripped from the text by
     absorbWorkNotes; they simply never render. */
  const hasTimes=!!(m.streamStartedAt||m.streamEndedAt);
  if(hasTimes||m.thoughtStopped||m.pending){
    const live=!!m.pending;
    const t0=m.streamStartedAt||m.createdAt||Date.now();
    const t1=live?Date.now():(m.streamEndedAt||m.createdAt||t0);
    const secs=Math.max(0,Math.round((t1-t0)/1000));
    const label=m.thoughtStopped?'Stopped':(live?('Working for '+secs+'s'):((hasTimes)?('Thought for '+secs+'s'):'Thought'));
    h+='<div class="think-row" role="button">'+(live?'<span class="spin"></span>':'')+'<span class="think-label">'+esc(label)+'</span><span class="think-chev">'+icon('chevron-right',13)+'</span></div>';
    h+='<div class="think-divider" hidden></div>';
  }
  if(m.image){ h+='<div class="img-card"><img src="'+esc(m.image)+'" alt="Generated image"></div>'; }
  if(m.text){ h+='<div class="msg-asst">'+mdToHtml(stripSourcesBlock(m.text))+'</div>'; }
  if(m.errorCard){ h+='<div class="err-card"><div class="err-title">Image generation limit</div><div>'+esc(m.errorCard)+'</div><button type="button" class="btn-primary" data-a-act="upgrade" data-mid="'+m.id+'">Upgrade</button></div>'; }
  const urls=extractUrls(m.text||'');
  const footParts=[];
  if(urls.length||m.image){
    /* Grok: overlapping favicon circles + "N sources" button (no chips). */
    const favs=urls.slice(0,3).map(u=>{ const host=hostOf(u); return '<span class="src-fav" style="background:'+favColor(host)+'">'+esc(host[0].toUpperCase())+'</span>'; }).join('');
    footParts.push('<button type="button" class="sources-btn" data-src-open="'+m.id+'"><span class="src-favicons">'+favs+'</span><span>'+(urls.length?urls.length+' source'+(urls.length>1?'s':''):'Sources')+'</span></button>');
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
  /* Grok puts the sources button and the action bar on ONE row. No
     follow-up pills — grok shows none. */
  if(footParts.length) h+='<div class="reply-foot">'+footParts.join('')+'</div>';
  return h+'</div>';
}
function codeAction(btn){
  const block=btn.closest('.code-block'); if(!block) return;
  const code=block.getAttribute('data-code')||'';
  if(btn.getAttribute('data-code-act')==='copy'){ copyText(code).then(()=>toast('Code copied')); }
}
function tableCopy(btn){
  const wrap=btn.closest('.table-wrap'); if(!wrap) return;
  const table=wrap.querySelector('table'); if(!table) return;
  copyText(table.innerText||'').then(()=>toast('Table copied'));
}
function tableOpen(btn){
  /* Grok's "Open as file": the table opens in the right pane (with a real
     Download .md button there). */
  const wrap=btn.closest('.table-wrap'); if(!wrap) return;
  const table=wrap.querySelector('table'); if(!table) return;
  openTableInPane(table);
}
function userMsgAction(act,mid){
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  if(act==='copy'){ copyText(m.text).then(()=>toast('Copied')); }
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
  else if(act==='upgrade'){ openUpgradeSheet(); }
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
  /* Grok's Sources sheet: a plain list, title + domain only, no tabs, no
     favicons inside. Titles are the hosts (we receive URLs, not titles). */
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  const urls=extractUrls(m.text||'');
  const list=$('#sourcesList');
  const rows=urls.map((u,i)=>{ const host=hostOf(u); return '<a class="src-row" href="'+esc(u)+'" target="_blank" rel="noopener"><span class="src-fav" style="background:'+favColor(host)+'">'+esc(host[0].toUpperCase())+'</span><span><span class="src-title">'+esc(host)+'</span><span class="src-host">'+esc(u)+'</span></span></a>'; });
  if(m.image) rows.push('<a class="src-row" href="'+esc(m.image)+'" target="_blank" rel="noopener"><span class="src-fav" style="background:#3572a5">I</span><span><span class="src-title">Generated image</span><span class="src-host">Image from this conversation</span></span></a>');
  list.innerHTML=rows.length?rows.join(''):'<div class="src-empty">No sources in this answer.</div>';
  openSheet('#sourcesDialog');
}
async function regenerate(s,m){
  m.text=''; m.activity=[]; m.thoughtStopped=false; m.pending=true; m.thinkMode=settings.responseMode;
  const userMsg=[...s.messages].reverse().find(x=>x.role==='user');
  renderMessages();
  await streamInto(s,userMsg||{text:''},m,[]);
}
let scrollBtnFadeTimer=null;
function updateScrollBtn(){
  /* Grok's home has no scroll button — show it only inside a chat, and
     only once the user has scrolled up from the bottom. Round 5: it fades
     out after 3s idle so it never sits on message text persistently, and
     returns on the next scroll. */
  const cv=$('#chatView'); if(!cv) return;
  const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
  const hv=$('#homeView'); const onHome=hv&&!hv.hidden;
  const btn=$('#scrollBottom');
  const show=!!(curSession()&&!onHome&&dist>240);
  btn.hidden=!show;
  if(scrollBtnFadeTimer){ clearTimeout(scrollBtnFadeTimer); scrollBtnFadeTimer=null; }
  if(show){ btn.classList.remove('faded'); scrollBtnFadeTimer=setTimeout(()=>{ btn.classList.add('faded'); },3000); }
  else btn.classList.remove('faded');
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
let pendingCustomPrompt=''; /* one-shot model instruction (personal skills) — consumed by streamInto, never shown as user text */
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
  /* Rebuild: no Search toggle anywhere in grok's UI — web search is a
     backend behavior. Always allow it when the advanced flag is on; the
     backend decides per message whether to search. */
  const web=settings.advancedEnabled!==false&&settings.advanced.webSearchAdv;
  const body={ message:userMsg.text, history:historyFor(s,userMsg.id), files:filePayload||[],
    provider:settings.provider, model:settings.model, mode:'general',
    customPrompt:pendingCustomPrompt||'', webSearch:web, forceWebSearch:web,
    autoFallback:true, smartRouter:false, activityStream:true, autoTools:settings.toolsEnabled,
    clientTimeZone:(Intl&&Intl.DateTimeFormat&&Intl.DateTimeFormat().resolvedOptions().timeZone)||'Asia/Manila',
    clientUtcOffsetMinutes:-new Date().getTimezoneOffset(),
    personalization:Object.assign(buildPersonalization(),{intelligence:EFFORT[settings.responseMode]||'Medium', fastAnswers:settings.responseMode==='Fast', advancedWebSearch:web}) };
  if(voiceStyleOverride){ body.personalization.style=voiceStyleOverride; }
  pendingCustomPrompt=''; voiceStyleOverride=null;
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
    if(asst.text&&!asst.activity.some(a=>a.state==='error')) notifyReply(asst.text);
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
  fresh.querySelectorAll('.think-row').forEach(r=>r.addEventListener('click',()=>{ const div=r.parentElement.querySelector('.think-divider'); if(div) div.hidden=!div.hidden; const ch=r.querySelector('.think-chev'); if(ch) ch.innerHTML=icon(div&&!div.hidden?'chevron-up':'chevron-right',13); }));
  fresh.querySelectorAll('[data-src-open]').forEach(b=>b.addEventListener('click',()=>openSources(b.getAttribute('data-src-open'))));
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
  if(t&&t.length>1){
    /* Round 5: never mint a title another chat already has — the model
       gives the same Title Case title for same-topic chats, which is how
       the sidebar ended up with two identical rows. Suffix " 2", " 3"... */
    let unique=t, n=2;
    while(sessions.some(x=>x.id!==s.id&&(x.title||'').toLowerCase()===unique.toLowerCase())){ unique=t+' '+n; n++; }
    s.title=unique; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); const cur=curSession(); if(cur&&cur.id===s.id) $('#topTitle').innerHTML='<span class="top-logo">'+J_MARK+'</span><span>'+esc(unique)+'</span>'; }
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
      const raw=e.results&&e.results[0]&&e.results[0][0]?e.results[0][0].transcript:'';
      const txt=refineDictation(raw);
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
  voiceStyleOverride=vmPersonalityStyle();
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
  /* Grok's picker is a bottom sheet at phone width: name + sub-label +
     checkmark, no icons, no premium band. Real names per Q1. */
  const list=$('#modelSheetList');
  list.innerHTML=MODELS.map(m=>'<button class="sheet-list-btn" data-model="'+m.id+'" type="button"><span class="row-main"><span>'+esc(m.name)+'</span><span class="row-sub">'+esc(m.sub||m.desc||'')+'</span></span>'+(m.id===settings.model?'<span class="check">'+icon('check',18)+'</span>':'')+'</button>').join('');
  list.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>{
    const m=MODELS.find(x=>x.id===b.getAttribute('data-model')); if(!m) return;
    settings.provider=m.provider; settings.model=m.id; saveSettings(); renderAll(); closeSheet('#modelSheet'); toast(m.name+' selected');
  }));
  openSheet('#modelSheet');
}
function renderPlusList(items){
  const list=$('#plusSheetList');
  list.innerHTML=items.map((it,i)=>'<button class="sheet-list-btn" data-plus-idx="'+i+'" type="button"><span data-icon="'+(it.icon||'info')+'" data-size="18"></span><span class="row-main"><span>'+esc(it.label)+'</span>'+(it.sub?'<span class="row-sub">'+esc(it.sub)+'</span>':'')+'</span>'+(it.chevron?'<span class="chev">'+icon('chevron-right',16)+'</span>':'')+'</button>').join('');
  hydrateIcons(list);
  list.querySelectorAll('[data-plus-idx]').forEach(b=>b.addEventListener('click',()=>{
    const it=items[parseInt(b.getAttribute('data-plus-idx'),10)];
    if(it.submenu){ renderPlusList([{label:'Back', icon:'arrow-left', onClick:()=>openPlusMenu()}, ...it.submenu()]); return; }
    closeSheet('#plusSheet');
    if(it.onClick) it.onClick();
  }));
  openSheet('#plusSheet');
}
function openPlusMenu(){
  /* Grok's "+" menu, exactly 5 items in order. Submenus open inside the
     same sheet with a Back row. */
  renderPlusList([
    {icon:'file', label:'Upload a file', onClick:()=>pickFile('files')},
    {icon:'folder', label:'Projects', chevron:true, submenu:()=>[
      ...projects.map(p=>({icon:'folder', label:p.name, onClick:()=>openProjectPage(p.id)})),
      {icon:'plus', label:'New project', onClick:()=>openProjectDialog()}
    ]},
    {icon:'zap', label:'Skills', chevron:true, submenu:()=>[
      ...SKILL_BUILTINS.map(s=>({icon:s.icon, label:s.name, sub:'Create a '+s.ext+' file', onClick:()=>openSkillFileDialog(s)})),
      ...extra.skills.map(s=>({icon:'zap', label:s.name, sub:'Personal skill', onClick:()=>runPersonalSkill(s)})),
      {icon:'plus', label:'New Skill', onClick:()=>newPersonalSkill()}
    ]},
    {icon:'plug', label:'Add connector', onClick:()=>openSettings('connectors')},
    {icon:'file', label:'Files', chevron:true, submenu:()=>[
      ...library.slice(0,8).map(f=>({icon:f.kind==='image'?'image':'file', label:f.name, sub:fmtBytes(f.size||0), onClick:()=>openFileInPane(f)})),
      {icon:'plus', label:'Upload files', onClick:()=>$('#libFileInput').click()}
    ]}
  ]);
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

/* ---------- Connect Apps catalog (grok inventory J, exact names/descriptions) ---------- */
const CONNECT_APPS=[
 {name:'Gmail', desc:'Your inbox, supercharged by Grok.', cat:'Recommended', color:'#d93025'},
 {name:'Google Drive', desc:'Search and summarize your files in Google Drive.', cat:'Recommended', color:'#0f9d58'},
 {name:'Google Calendar', desc:'Let Grok know your schedule.', cat:'Recommended', color:'#4285f4'},
 {name:'GitHub', desc:'Build & review code with your repos.', cat:'Recommended', color:'#24292f'},
 {name:'Finance', desc:'Real-time financial data from Yahoo Finance.', cat:'Recommended', color:'#6e6e6a'},
 {name:'Notion', desc:'Make Notion your source of truth for Grok.', cat:'Recommended', color:'#111110'},
 {name:'X Ads', desc:'Ads insights, campaigns and creatives.', cat:'Advertising', color:'#111110'},
 {name:'Google Cloud BigQuery', desc:'Ask questions of your data in BigQuery.', cat:'Analytics', color:'#4285f4'},
 {name:'Expensify', desc:'Expense reports, receipts, approvals, and reimbursements.', cat:'Apps', color:'#03a99d'},
 {name:'Paypal', desc:'Send, receive, and manage payments.', cat:'Apps', color:'#003087'},
 {name:'Zapier', desc:'Create and run Zaps for 8,000+ apps.', cat:'Apps', color:'#ff4a00'},
 {name:'Datadog', desc:'AI-powered insights into your cloud and DevOps stack.', cat:'Developer', color:'#632ca6'},
 {name:'Excalidraw', desc:'Draw diagrams and sketches.', cat:'Developer', color:'#6965db'},
 {name:'Mixpanel', desc:'Product analytics and insights from Mixpanel.', cat:'Developer', color:'#7856ff'},
 {name:'Netlify', desc:'Build, deploy and manage your websites.', cat:'Developer', color:'#00ad9f'},
 {name:'Vercel', desc:'Ship code and run Next.js apps.', cat:'Developer', color:'#111110'},
 {name:'Bigdata.com', desc:'Financial data and research.', cat:'Finance', color:'#6e6e6a'},
 {name:'Coinbase', desc:'Crypto prices and portfolio.', cat:'Finance', color:'#0052ff'},
 {name:'Daloopa', desc:'Financial data and models.', cat:'Finance', color:'#6e6e6a'},
 {name:'Finary', desc:'Track your wealth in one place.', cat:'Finance', color:'#6e6e6a'},
 {name:'IBKR', desc:'Interactive Brokers trading data.', cat:'Finance', color:'#d50000'},
 {name:'Outlook', desc:'Your email and calendar from Microsoft.', cat:'Productivity', color:'#0078d4'},
 {name:'Outlook Calendar', desc:'Your Microsoft calendar.', cat:'Productivity', color:'#0078d4'},
 {name:'Asana', desc:'Manage your projects and tasks.', cat:'Productivity', color:'#f06a6a'},
 {name:'Atlassian', desc:'Jira and Confluence for your team.', cat:'Productivity', color:'#0052cc'},
 {name:'Calendly', desc:'Schedule meetings without the back-and-forth.', cat:'Productivity', color:'#006bff'},
 {name:'Canva', desc:'Design anything, fast.', cat:'Productivity', color:'#00c4cc'},
 {name:'HubSpot', desc:'CRM, marketing, and sales.', cat:'Sales', color:'#ff7a59'},
 {name:'Meltwater', desc:'Media monitoring and social listening.', cat:'Sales', color:'#6e6e6a'},
 {name:'Buffer', desc:'Schedule and publish social posts.', cat:'Social Media', color:'#231f20'},
 {name:'Metricool', desc:'Social media analytics and scheduling.', cat:'Social Media', color:'#6e6e6a'},
 {name:'Box', desc:'Store files and collaborate in Box.', cat:'Storage', color:'#0061d5'},
 {name:'Stripe', desc:'Accept, process, and manage payments.', cat:'Payments', color:'#635bff'}
];
/* ---------- Automations catalog (grok inventory J) ---------- */
const AUTOMATIONS=[
 {name:'Custom', desc:'Build your own automation from scratch.', cat:'Featured', featured:true, color:'#6e6e6a'},
 {name:'Morning Brief', desc:'Your day, summarized every morning.', cat:'Featured', featured:true, color:'#f59e0b'},
 {name:'Daily Stock Tracker', desc:'Your stocks, tracked every day.', cat:'Featured', featured:true, color:'#16a34a'},
 {name:'AI News Digest', desc:"The day's AI news, digested.", cat:'Featured', featured:true, color:'#3b82f6'},
 {name:'Daily Planner', desc:'A plan for your day, every day.', cat:'Featured', featured:true, color:'#8b5cf6'},
 {name:'Weekly Review', desc:'Your week, reviewed every Sunday.', cat:'Featured', featured:true, color:'#ec4899'},
 {name:'X Trends Digest', desc:'What is trending on X today.', cat:'News', color:'#111110'},
 {name:'Email Auto-Responder', desc:'Draft replies to your email automatically.', cat:'Productivity', color:'#0ea5e9'},
 {name:'Task Extractor', desc:'Turn messages into tasks.', cat:'Productivity', color:'#14b8a6'},
 {name:'Earnings Calendar', desc:'Upcoming earnings, on your calendar.', cat:'Finance', color:'#16a34a'},
 {name:'Portfolio News Scan', desc:'News about your holdings, scanned daily.', cat:'Finance', color:'#22c55e'},
 {name:'Competitor Watch', desc:'Watch what your competitors do.', cat:'Research', color:'#6366f1'},
 {name:'Paper Watch', desc:'New papers in your field, watched.', cat:'Research', color:'#8b5cf6'},
 {name:'Weekend Deep Dive', desc:'A deep dive every weekend.', cat:'Research', color:'#a855f7'},
 {name:'Workout Coach', desc:'A workout plan that adapts to you.', cat:'Lifestyle', color:'#ef4444'},
 {name:'Meal Planner', desc:'Meals planned for your week.', cat:'Lifestyle', color:'#f97316'},
 {name:'Language Practice', desc:'Practice a language a little every day.', cat:'Lifestyle', color:'#06b6d4'}
];

/* ---------- settings pages (grok: 9 sections, grok order) ---------- */
let settingsPageKey='list';
const SETTING_ROWS=[
 {key:'account', icon:'user', label:'Account', value:()=>settings.plan||'Free'},
 {key:'appearance', icon:'moon', label:'Appearance', value:()=>cap(settings.theme||'light')},
 {key:'behavior', icon:'brain', label:'Behavior', value:()=>''},
 {key:'notifications', icon:'bell', label:'Notifications', value:()=>''},
 {key:'customize', icon:'sliders', label:'Customize', value:()=>cap(settings.personalization.style||'Default')},
 {key:'connectors', icon:'plug', label:'Connect Apps', value:()=>extra.connectRequested.length?extra.connectRequested.length+' requested':'0 connected'},
 {key:'skills', icon:'zap', label:'Skills', value:()=>''},
 {key:'automations', icon:'clock', label:'Automations', value:()=>extra.automations.length?String(extra.automations.length):''},
 {key:'data', icon:'shield', label:'Data Controls', value:()=>''}
];
function cap(s){ return s? s[0].toUpperCase()+s.slice(1):s; }
function voiceLabel(){
  const e=resolveVoiceEntry();
  if(e) return e.title;
  return 'Device default';
}
function openSettings(key){
  settingsPageKey=key||'list';
  renderSettingsPage();
  $('#settingsPage').hidden=false;
}
function switchHtml(on, id, label){
  return '<button id="'+id+'" class="switch'+(on?' on':'')+'" type="button" aria-label="'+esc(label)+'"></button>';
}
function toggleRow(id, title, sub, on){
  return '<div class="set-toggle-row"><div class="set-toggle-text"><h3>'+esc(title)+'</h3>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+switchHtml(on, id, title)+'</div>';
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
  if(settingsPageKey==='account'){
    title.textContent='Account';
    body.innerHTML='<div class="set-card"><h3>'+esc(settings.profileName||'Jepong')+'</h3><p>'+esc(settings.profileEmail||'No email set')+'</p></div>'
      +'<div class="set-list">'
      +'<button class="set-row" id="accManage"><span class="set-ic">'+icon('user',18)+'</span><span class="set-label">Manage Account</span><span class="chev">↗</span></button>'
      +'<button class="set-row" id="accSignOut"><span class="set-ic">'+icon('log-out',18)+'</span><span class="set-label">Sign Out</span></button>'
      +'<button class="set-row" id="accDashboard"><span class="set-ic">'+icon('layout-grid',18)+'</span><span class="set-label">JepongDevxyz AI dashboard</span><span class="set-value">Open ↗</span></button>'
      +'</div>'
      +'<div class="set-subhead">App</div>'
      +'<button class="set-row" id="accLangRow"><span class="set-ic">'+icon('globe',18)+'</span><span class="set-label">Language</span><span class="set-value">'+esc((settings.responseLang&&settings.responseLang.label)||'Auto')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<div class="set-subhead">Plan</div>'
      +'<div class="set-card"><h3>'+esc(settings.plan||'Free')+'</h3><p>Free on this device — no payment is taken.</p><button id="accUpgrade" class="btn-primary" type="button">Upgrade</button></div>';
    body.querySelector('#accManage').addEventListener('click',()=>{ settingsPageKey='profile'; renderSettingsPage(); });
    body.querySelector('#accSignOut').addEventListener('click',()=>signOut());
    body.querySelector('#accDashboard').addEventListener('click',()=>{ try{ window.open('https://jepong-devxyz-ai.vercel.app/','_blank'); }catch(e){} });
    body.querySelector('#accLangRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      const langs=[{code:'auto',label:'Auto'},{code:'en',label:'English'},{code:'fil',label:'Filipino'},{code:'es',label:'Spanish'},{code:'fr',label:'French'},{code:'de',label:'German'},{code:'ja',label:'Japanese'},{code:'ko',label:'Korean'},{code:'zh',label:'Chinese'}];
      showMenu(Math.min(r.left,window.innerWidth-220), r.bottom+4, langs.map(l=>({label:l.label+(((settings.responseLang&&settings.responseLang.code)||'auto')===l.code?' ✓':''), onClick:()=>{ settings.responseLang={code:l.code,label:l.label}; saveSettings(); renderSettingsPage(); toast('Language updated'); }})));
    });
    body.querySelector('#accUpgrade').addEventListener('click',()=>{ $('#settingsPage').hidden=true; openUpgradeSheet(); });
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
  if(settingsPageKey==='appearance'){
    /* Grok's Appearance has exactly ONE control: Theme (Light/Dark/System). */
    title.textContent='Appearance';
    const cur=settings.theme||'light';
    body.innerHTML='<div class="set-list"><button class="set-row" id="themeRow"><span class="set-ic">'+icon('monitor',18)+'</span><span class="set-label">Theme</span><span class="set-value">'+esc(cap(cur))+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button></div>';
    body.querySelector('#themeRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['light','dark','system'].map(t=>({label:cap(t)+(cur===t?' ✓':''), onClick:()=>{ settings.theme=t; saveSettings(); applyTheme(); renderSettingsPage(); }})));
    });
    return;
  }
  if(settingsPageKey==='behavior'){
    title.textContent='Behavior';
    const vLabel=voiceLabel();
    body.innerHTML='<div class="set-subhead">Sending</div><div class="set-card">'
      +toggleRow('behCtrlSw','Require Ctrl+Enter to send','Press Ctrl+Enter to send a message.', !!(settings.behavior&&settings.behavior.ctrlEnter))
      +toggleRow('behScrollSw','Auto-Scroll','Scroll to the newest reply automatically.', !(settings.behavior&&settings.behavior.autoScroll===false))
      +'</div>'
      +'<div class="set-subhead">Voice</div><div class="set-list">'
      +'<button class="set-row" id="behVoiceRow"><span class="set-ic">'+icon('volume-2',18)+'</span><span class="set-label">Voice</span><span class="set-value">'+esc(vLabel)+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="behSpeedRow"><span class="set-ic">'+icon('gauge',18)+'</span><span class="set-label">Speed</span><span class="set-value">'+esc(vmSpeedLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="behPersRow"><span class="set-ic">'+icon('user',18)+'</span><span class="set-label">Personality</span><span class="set-value">'+esc(vmPersonalityLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="behDictRow"><span class="set-ic">'+icon('mic',18)+'</span><span class="set-label">Dictation Refinement</span><span class="set-value">'+esc(settings.voice.dictation||'Tidy up')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'</div><p class="set-note">Changes apply from JepongDevxyz AI\'s next reply, even during a call.</p>';
    body.querySelector('#behCtrlSw').addEventListener('click',e=>{ settings.behavior.ctrlEnter=!settings.behavior.ctrlEnter; saveSettings(); e.currentTarget.classList.toggle('on', settings.behavior.ctrlEnter); });
    body.querySelector('#behScrollSw').addEventListener('click',e=>{ settings.behavior.autoScroll=settings.behavior.autoScroll===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.behavior.autoScroll!==false); });
    body.querySelector('#behVoiceRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      const cat=voiceCatalog(); const sel=resolveVoiceEntry();
      const items=[{label:'Device default'+(!settings.voice.voiceURI?' ✓':''), onClick:()=>{ settings.voice.voiceURI=''; settings.voice.name=''; saveSettings(); renderSettingsPage(); }}];
      cat.forEach(c=>items.push({label:c.title+' — '+c.sub+((sel&&sel.uri===c.uri)?' ✓':''), onClick:()=>{ settings.voice.voiceURI=c.uri; settings.voice.name=c.name; saveSettings(); renderSettingsPage(); if(c.uri) speak('Hello, this is a preview of the selected voice.', c.uri); }}));
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-320)), r.bottom+4, items);
    });
    body.querySelector('#behSpeedRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, VM_SPEEDS.map(sp=>({label:sp.l+((settings.voice.rate||1)===sp.v?' ✓':''), onClick:()=>{ settings.voice.rate=sp.v; saveSettings(); renderSettingsPage(); toast('Speed updated'); }})));
    });
    body.querySelector('#behPersRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, VM_PERSONALITIES.map(p=>({label:p+(vmPersonalityLabel()===p?' ✓':''), onClick:async()=>{
        if(p==='Custom…'){
          const cur2=settings.personalization.custom||'';
          const next=await promptDialog('Custom personality','Custom instruction', cur2);
          if(next===null) return;
          settings.personalization.custom=next.trim(); settings.voice.personality='Custom…';
        } else {
          settings.voice.personality=p;
        }
        saveSettings(); renderSettingsPage(); toast('Personality updated');
      }})));
    });
    body.querySelector('#behDictRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, ['No refinement','Tidy up','Fully refine'].map(d=>({label:d+((settings.voice.dictation||'Tidy up')===d?' ✓':''), onClick:()=>{ settings.voice.dictation=d; saveSettings(); renderSettingsPage(); toast('Dictation refinement updated'); }})));
    });
    return;
  }
  if(settingsPageKey==='notifications'){
    title.textContent='Notifications';
    body.innerHTML='<div class="set-card">'
      +toggleRow('notifBrowserSw','Browser Notifications','Notify when a reply finishes while you are away.', !!(settings.notifications&&settings.notifications.browser))
      +'</div>'
      +'<button class="set-row" id="notifUpdatesRow"><span class="set-ic">'+icon('bell',18)+'</span><span class="set-label">Product Updates</span><span class="set-value">'+esc((settings.notifications&&settings.notifications.updates)||'Off')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>';
    body.querySelector('#notifBrowserSw').addEventListener('click',async e=>{
      if(!settings.notifications.browser){
        if(!('Notification' in window)){ toast('Notifications are not supported in this browser'); return; }
        try{
          const perm=await Notification.requestPermission();
          if(perm!=='granted'){ toast('Notification permission denied'); return; }
        }catch(err){ toast('Notification permission denied'); return; }
      }
      settings.notifications.browser=!settings.notifications.browser; saveSettings();
      e.currentTarget.classList.toggle('on', settings.notifications.browser);
    });
    body.querySelector('#notifUpdatesRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['On','Off'].map(u=>({label:u+((settings.notifications.updates||'Off')===u?' ✓':''), onClick:()=>{ settings.notifications.updates=u; saveSettings(); renderSettingsPage(); }})));
    });
    return;
  }
  if(settingsPageKey==='customize'){
    title.textContent='Customize';
    const styles=['Default','Custom','Concise','Formal','Tutor','Comprehensive'];
    const cur=settings.personalization.style||'Default';
    body.innerHTML='<button class="set-row" id="custRow"><span class="set-ic">'+icon('sliders',18)+'</span><span class="set-label">Customize JepongDevxyz AI\'s Response</span><span class="set-value">'+esc(cur)+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<p class="set-note">Personalize how JepongDevxyz AI responds to you.</p>';
    body.querySelector('#custRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, styles.map(s2=>({label:s2+(cur===s2?' ✓':''), onClick:async()=>{
        if(s2==='Custom'){
          const next=await promptDialog('Custom style','Custom instruction', settings.personalization.custom||'', true);
          if(next===null) return;
          settings.personalization.custom=next.trim();
        }
        settings.personalization.style=s2; saveSettings(); renderSettingsPage(); toast('Response style updated');
      }})));
    });
    return;
  }
  if(settingsPageKey==='connectors'){
    title.textContent='Connect Apps';
    body.innerHTML='<p class="set-note">'+extra.connectRequested.length+' requested · 0 connected — connections need an app account; requests are saved on this device.</p>'
      +'<div class="conn-search"><span>'+icon('search',16)+'</span><input id="connSearch" type="text" placeholder="Search apps" autocomplete="off"></div>'
      +'<div class="conn-chips" id="connChips"></div>'
      +'<div id="connList"></div>'
      +'<button id="connCustom" class="btn-ghost" type="button" style="border:1px solid var(--line);margin-top:12px">Add a custom connector</button>';
    let connCat='All', connQ='';
    const cats=['All','Advertising','Analytics','Apps','Developer','Finance','More'];
    const renderConn=()=>{
      document.querySelectorAll('#connChips .conn-chip').forEach(c=>c.classList.toggle('active', c.getAttribute('data-conn-cat')===connCat));
      const list=$('#connList');
      const apps=CONNECT_APPS.filter(a=>{
        if(connQ&&!(a.name.toLowerCase().includes(connQ)||a.desc.toLowerCase().includes(connQ))) return false;
        if(connCat==='All') return true;
        if(connCat==='More') return ['Google Workspace','Payments','Productivity','Sales','Social Media','Storage','Custom'].includes(a.cat);
        return a.cat===connCat;
      });
      const byCat={}; apps.forEach(a=>{ (byCat[a.cat]=byCat[a.cat]||[]).push(a); });
      let html='';
      Object.keys(byCat).forEach(cat=>{
        html+='<div class="set-subhead">'+esc(cat)+'</div>'+byCat[cat].map(a=>{
          const req=extra.connectRequested.includes(a.name);
          return '<button class="conn-row" data-conn="'+esc(a.name)+'" type="button"><span class="conn-logo" style="background:'+a.color+'">'+esc(a.name[0])+'</span><span class="conn-tx"><span class="conn-name">'+esc(a.name)+'</span><span class="conn-desc">'+esc(a.desc)+'</span></span><span class="conn-pill'+(req?' requested':'')+'">'+(req?'Requested':'Connect')+'</span></button>';
        }).join('');
      });
      list.innerHTML=html||'<div class="src-empty">No apps match.</div>';
      list.querySelectorAll('[data-conn]').forEach(b=>b.addEventListener('click',()=>{
        const name=b.getAttribute('data-conn');
        if(extra.connectRequested.includes(name)){ toast('Already requested — saved on this device'); return; }
        extra.connectRequested.push(name); saveExtra();
        toast(name+' requested — real connections need an app account');
        renderConn(); renderSettingsPage();
      }));
    };
    body.querySelector('#connChips').innerHTML=cats.map(c=>'<button class="conn-chip'+(c===connCat?' active':'')+'" data-conn-cat="'+c+'" type="button">'+esc(c)+'</button>').join('');
    body.querySelectorAll('#connChips .conn-chip').forEach(b=>b.addEventListener('click',()=>{ connCat=b.getAttribute('data-conn-cat'); renderConn(); }));
    body.querySelector('#connSearch').addEventListener('input',e=>{ connQ=e.target.value.toLowerCase(); renderConn(); });
    body.querySelector('#connCustom').addEventListener('click',async()=>{
      const name=await promptDialog('Add a custom connector','Connector name','');
      if(name===null||!name.trim()) return;
      const url=await promptDialog('Add a custom connector','Connector URL', 'https://');
      if(url===null) return;
      CONNECT_APPS.push({name:name.trim(), desc:url.trim(), cat:'Custom', color:'#6e6e6a'});
      extra.customConnectors.push({name:name.trim(), url:url.trim()});
      saveExtra(); renderConn(); toast('Custom connector saved');
    });
    renderConn();
    return;
  }
  if(settingsPageKey==='skills'){
    title.textContent='Skills';
    const personal=extra.skills||[];
    body.innerHTML='<div class="set-subhead">Personal</div>'
      +(personal.length?personal.map(s2=>'<div class="skill-row"><span class="skill-ic">'+icon('zap',18)+'</span><span class="skill-name">'+esc(s2.name)+'</span><button type="button" class="skill-on'+(s2.on?' on':'')+'" data-skill-toggle="'+s2.id+'">'+(s2.on?'On':'Off')+'</button><button type="button" class="mini-btn danger" data-skill-del="'+s2.id+'">Delete</button></div>').join(''):'<div class="empty-dash">No personal skills yet</div>')
      +'<button id="newSkillBtn" class="btn-primary" type="button">New Skill</button>'
      +'<div class="set-subhead">Built-in</div>'
      +SKILL_BUILTINS.map(s2=>'<button class="skill-row" data-builtin-skill="'+s2.ext+'" type="button"><span class="skill-ic">'+icon(s2.icon,18)+'</span><span class="skill-name">'+esc(s2.name)+'</span><span class="skill-on on">On</span></button>').join('');
    body.querySelector('#newSkillBtn').addEventListener('click',()=>newPersonalSkill());
    body.querySelectorAll('[data-skill-toggle]').forEach(b=>b.addEventListener('click',()=>{
      const s2=extra.skills.find(x=>x.id===b.getAttribute('data-skill-toggle')); if(!s2) return;
      s2.on=!s2.on; saveExtra(); renderSettingsPage();
    }));
    body.querySelectorAll('[data-skill-del]').forEach(b=>b.addEventListener('click',async()=>{
      const ok=await showConfirm({title:'Delete skill?', text:'This personal skill will be removed.', okLabel:'Delete'});
      if(!ok) return;
      extra.skills=extra.skills.filter(x=>x.id!==b.getAttribute('data-skill-del')); saveExtra(); renderSettingsPage();
    }));
    body.querySelectorAll('[data-builtin-skill]').forEach(b=>b.addEventListener('click',()=>{
      const s2=SKILL_BUILTINS.find(x=>x.ext===b.getAttribute('data-builtin-skill')); if(s2) openSkillFileDialog(s2);
    }));
    return;
  }
  if(settingsPageKey==='automations'){
    title.textContent='Automations';
    let autoCat='All';
    body.innerHTML='<div class="conn-chips" id="autoChips"></div><div id="autoList"></div>';
    const renderAuto=()=>{
      document.querySelectorAll('#autoChips .conn-chip').forEach(c=>c.classList.toggle('active', c.getAttribute('data-auto-cat')===autoCat));
      const list=$('#autoList');
      let html='';
      const mine=extra.automations||[];
      if(mine.length&&autoCat==='All'){
        html+='<div class="set-subhead">My automations</div>'+mine.map((a,i)=>'<div class="auto-card"><span class="auto-ic" style="background:#6e6e6a">'+icon('clock',18)+'</span><span class="auto-tx"><span class="auto-name">'+esc(a.name)+'</span><span class="auto-desc">Saved on this device — does not run yet</span></span><button type="button" class="mini-btn danger" data-auto-del="'+i+'">Remove</button></div>').join('');
      }
      const groups={};
      AUTOMATIONS.forEach(a=>{ if(autoCat==='All'||a.cat===autoCat||(autoCat==='Featured'&&a.featured)) (groups[a.cat]=groups[a.cat]||[]).push(a); });
      Object.keys(groups).forEach(cat=>{
        html+='<div class="set-subhead">'+esc(cat==='Featured'?'Featured':cat)+'</div>'+groups[cat].map(a=>{
          const saved=mine.some(x=>x.name===a.name);
          return '<div class="auto-card"><span class="auto-ic" style="background:'+a.color+'">'+icon('clock',18)+'</span><span class="auto-tx"><span class="auto-name">'+esc(a.name)+'</span><span class="auto-desc">'+esc(a.desc)+'</span></span><button type="button" class="mini-btn" data-auto-add="'+esc(a.name)+'" '+(saved?'disabled':'')+'>'+(saved?'Added':'Add')+'</button></div>';
        }).join('');
      });
      list.innerHTML=html||'<div class="src-empty">No automations in this category.</div>';
      list.querySelectorAll('[data-auto-del]').forEach(b=>b.addEventListener('click',()=>{ extra.automations.splice(parseInt(b.getAttribute('data-auto-del'),10),1); saveExtra(); renderAuto(); }));
      list.querySelectorAll('[data-auto-add]').forEach(b=>b.addEventListener('click',()=>{
        const name=b.getAttribute('data-auto-add');
        const tpl=AUTOMATIONS.find(x=>x.name===name); if(!tpl) return;
        extra.automations.push({name:tpl.name, cat:tpl.cat, at:Date.now()}); saveExtra();
        toast(name+' saved on this device — automations do not run yet (no server to run them)');
        renderAuto();
      }));
    };
    body.querySelector('#autoChips').innerHTML=['All','News','Productivity','Finance','Research','Lifestyle'].map(c=>'<button class="conn-chip'+(c===autoCat?' active':'')+'" data-auto-cat="'+c+'" type="button">'+esc(c)+'</button>').join('');
    body.querySelectorAll('#autoChips .conn-chip').forEach(b=>b.addEventListener('click',()=>{ autoCat=b.getAttribute('data-auto-cat'); renderAuto(); }));
    renderAuto();
    return;
  }
  if(settingsPageKey==='data'){
    title.textContent='Data Controls';
    const used=fmtBytes(libraryBytes());
    body.innerHTML='<div class="set-subhead">Personalization</div><div class="set-card">'
      +toggleRow('dataImproveSw','Improve the Model','Let replies improve from how you use the app.', settings.advanced.updateMemory!==false)
      +toggleRow('dataHistSw','Personalize With Conversation History','Let replies use what you talked about before.', settings.personalization.refHistory!==false)
      +'</div><p class="set-note">These settings apply on this device.</p>'
      +'<div class="set-subhead">Sharing</div><div class="set-card">'
      +toggleRow('dataShareSw','Allow Chat Link Sharing','Let chats be shared as links.', settings.data.allowShare!==false)
      +'</div>'
      +'<div class="set-subhead">Account Data</div><div class="set-list">'
      +'<div class="set-row"><span class="set-ic">'+icon('file',18)+'</span><span class="set-label">File Storage</span><span class="set-value">'+esc(used)+' used of 1.0 GB</span></div>'
      +'<button class="set-row" data-data-view="sharedlinks"><span class="set-ic">'+icon('link',18)+'</span><span class="set-label">Shared Links</span><span class="set-value">View</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="archived"><span class="set-ic">'+icon('archive',18)+'</span><span class="set-label">Archived Conversations</span><span class="set-value">View</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="deleted"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Deleted Conversations</span><span class="set-value">View</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row danger" data-data-act="deleteAll"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete All Conversations</span></button>'
      +'<button class="set-row danger" data-data-act="deleteImagine"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete All Imagine Data</span></button>'
      +'<button class="set-row" data-data-act="export"><span class="set-ic">'+icon('download',18)+'</span><span class="set-label">Export Account Data</span></button>'
      +'<button class="set-row danger" data-data-act="deleteAccount"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete Account</span></button>'
      +'</div>'
      +'<div class="set-subhead">Browsing Data</div><div class="set-list">'
      +'<button class="set-row" data-data-act="clearCache"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Clear Cache</span></button>'
      +'</div>'
      +'<div class="set-subhead">Legal</div><div class="set-list">'
      +'<button class="set-row" data-data-view="terms"><span class="set-label">Terms</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="privacy"><span class="set-label">Privacy</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="acceptable"><span class="set-label">Acceptable Use</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="cookiesPage"><span class="set-label">Cookie Policy</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="cookies"><span class="set-label">Cookie Settings</span><span class="set-value">Manage cookie settings</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'</div>';
    body.querySelector('#dataImproveSw').addEventListener('click',e=>{ settings.advanced.updateMemory=settings.advanced.updateMemory===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.advanced.updateMemory!==false); });
    body.querySelector('#dataHistSw').addEventListener('click',e=>{ settings.personalization.refHistory=settings.personalization.refHistory===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.personalization.refHistory!==false); });
    body.querySelector('#dataShareSw').addEventListener('click',e=>{ settings.data.allowShare=settings.data.allowShare===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.data.allowShare!==false); });
    body.querySelectorAll('[data-data-view]').forEach(b=>b.addEventListener('click',()=>{ const k=b.getAttribute('data-data-view'); $('#settingsPage').hidden=true; openInfoPage(k); }));
    body.querySelectorAll('[data-data-act]').forEach(b=>b.addEventListener('click',async()=>{
      const act=b.getAttribute('data-data-act');
      if(act==='export'){
        const payload={exportedAt:new Date().toISOString(), app:'JepongDevxyz AI', sessions, projects, library:library.map(f=>({id:f.id,name:f.name,kind:f.kind,size:f.size,createdAt:f.createdAt}))};
        downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), 'jepongdevxyz-ai-export.json');
        toast('Account data exported'); return;
      }
      if(act==='clearCache'){
        localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(PENDING_KEY);
        drafts={}; pendingWork=[];
        toast('Cache cleared'); return;
      }
      if(act==='deleteImagine'){
        const ok=await showConfirm({title:'Delete all Imagine data?', text:'All generated images will be removed from your chats.', okLabel:'Delete'});
        if(!ok) return;
        sessions.forEach(s=>s.messages.forEach(m=>{ if(m.image) delete m.image; }));
        saveSessions(); renderAll(); toast('Imagine data deleted'); return;
      }
      if(act==='deleteAll'){
        const ok=await showConfirm({title:'Delete all conversations?', text:'All chats will be moved to Deleted Conversations, where you can restore them.', okLabel:'Delete'});
        if(!ok) return;
        for(const s of sessions.slice()){ await trashChat(s); }
        sessions=[]; currentId=null; saveSessions(); renderAll(); toast('All chats deleted'); return;
      }
      if(act==='deleteAccount'){
        const ok=await showConfirm({title:'Delete account?', text:'Chats, settings, projects, library and usage data will be deleted from this browser.', okLabel:'Delete'});
        if(!ok) return;
        localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY); localStorage.removeItem(DRAFT_KEY); localStorage.removeItem(PENDING_KEY); localStorage.removeItem(LIB_KEY);
        location.reload(); return;
      }
    }));
    return;
  }
  title.textContent='Settings'; settingsPageKey='list'; renderSettingsPage();
}
function langCodeOf(label){
  const map={'English':'en-US','Filipino':'fil-PH','Spanish':'es-ES','French':'fr-FR','German':'de-DE','Italian':'it-IT','Portuguese':'pt-PT','Japanese':'ja-JP','Korean':'ko-KR','Chinese':'zh-CN','Hindi':'hi-IN','Indonesian':'id-ID'};
  return map[label]||'';
}
async function signOut(){
  const ok=await showConfirm({title:'Sign out?', text:'Your local profile and session data will be cleared from this browser.', okLabel:'Sign out'});
  if(!ok) return;
  localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY);
  location.reload();
}

/* ================= REBUILD surfaces (grok inventory A–M) ================= */

/* ---------- autocomplete (typing replaces the suggestion rows) ---------- */
const AUTOCOMPLETE_BASE=['hello world python','hello world javascript','hello, how are you?','explain quantum computing','write a poem about the sea','make a website for a bakery','plan my day tomorrow'];
function renderAutocomplete(){
  const box=$('#autoComplete'); const input=$('#composerInput');
  const q=(input.value||'').trim().toLowerCase();
  if(!q||curSession()){ box.hidden=true; box.innerHTML=''; return; }
  const rows=[];
  sessions.filter(s=>!s.temporary&&!s.archived).forEach(s=>{
    const t=(s.title||'');
    if(t.toLowerCase().includes(q)) rows.push({typed:t.slice(0,q.length), rest:t.slice(q.length), tag:'Chat', fill:t});
  });
  AUTOCOMPLETE_BASE.forEach(t=>{ if(t.toLowerCase().includes(q)) rows.push({typed:t.slice(0,q.length), rest:t.slice(q.length), tag:'', fill:t}); });
  const seen=new Set(); const uniq=rows.filter(r=>{ const k=r.fill.toLowerCase(); if(seen.has(k)) return false; seen.add(k); return true; }).slice(0,5);
  if(!uniq.length){ box.hidden=true; box.innerHTML=''; return; }
  box.hidden=false;
  box.innerHTML=uniq.map((r,i)=>'<button type="button" data-ac="'+i+'"><span><span class="ac-typed">'+esc(r.typed)+'</span><span class="ac-rest">'+esc(r.rest)+'</span></span>'+(r.tag?'<span class="ac-tag">'+esc(r.tag)+'</span>':'')+'</button>').join('');
  box.querySelectorAll('[data-ac]').forEach(b=>b.addEventListener('click',()=>{
    const r=uniq[parseInt(b.getAttribute('data-ac'),10)];
    const inp=$('#composerInput'); inp.value=r.fill; autosize(); renderComposerState(); hideAutocomplete(); inp.focus();
  }));
}
function hideAutocomplete(){ const box=$('#autoComplete'); if(box){ box.hidden=true; box.innerHTML=''; } }

/* ---------- right pane (App preview / files) ---------- */
function openRightPane(){
  const p=$('#rightPane'); p.hidden=false; renderPaneFiles();
}
function closeRightPane(){ const p=$('#rightPane'); if(p) p.hidden=true; }
function renderPaneFiles(){
  const body=$('#paneBody'); const s=curSession();
  const files=[];
  if(s) s.messages.forEach(m=>{ (m.attachments||[]).forEach(a=>files.push({name:a.name, kind:a.kind||'file'})); if(m.image) files.push({name:'Generated image', kind:'image', image:m.image}); });
  library.forEach(f=>files.push({name:f.name, kind:f.kind, lib:f}));
  $('#paneTitle').textContent='App preview';
  if(!files.length){
    body.innerHTML='<div class="pane-empty">Open a file…<br><br>Files you attach and images you generate will appear here.</div>';
    return;
  }
  body.innerHTML=files.map((f,i)=>'<button class="pane-file" data-pane-file="'+i+'" type="button"><span class="pane-file-ic">'+icon(f.kind==='image'?'image':'file',18)+'</span><span>'+esc(f.name)+'</span></button>').join('');
  body.querySelectorAll('[data-pane-file]').forEach(b=>b.addEventListener('click',()=>{
    const f=files[parseInt(b.getAttribute('data-pane-file'),10)];
    if(f.image){ body.innerHTML='<img src="'+esc(f.image)+'" alt="Generated image" style="max-width:100%;border-radius:12px">'; return; }
    if(f.lib){ openFileInPane(f.lib); return; }
    toast('Preview is not available for this file');
  }));
}
function openFileInPane(f){
  const body=$('#paneBody');
  $('#paneTitle').textContent=f.name;
  openRightPane();
  if(f.kind==='image'&&f.data){
    body.innerHTML='<img src="data:'+esc(f.mimeType||'image/png')+';base64,'+esc(f.data)+'" alt="'+esc(f.name)+'" style="max-width:100%;border-radius:12px">';
  } else if(f.data){
    let text='';
    try{ text=decodeURIComponent(escape(atob(f.data))); }catch(e){ text='(binary file — preview not available)'; }
    body.innerHTML='<pre style="white-space:pre-wrap;word-break:break-word;font-size:13px">'+esc(text.slice(0,8000))+'</pre>';
  } else {
    body.innerHTML='<div class="pane-empty">Preview is not available for this file.</div>';
  }
  const dl=document.createElement('button'); dl.className='btn-primary'; dl.type='button'; dl.textContent='Download';
  dl.addEventListener('click',()=>{
    if(!f.data){ toast('Nothing to download'); return; }
    const bin=atob(f.data); const arr=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    const blob=new Blob([arr],{type:f.mimeType||'application/octet-stream'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download=f.name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });
  body.appendChild(dl);
}
function openTableInPane(table){
  /* Grok's "Open as file": the table opens in the right pane. */
  const body=$('#paneBody');
  $('#paneTitle').textContent='Table';
  openRightPane();
  body.innerHTML='<div class="pane-table-wrap">'+table.outerHTML+'</div>';
  const dl=document.createElement('button'); dl.className='btn-primary'; dl.type='button'; dl.textContent='Download as .md';
  dl.addEventListener('click',()=>{
    const rowText=tr=>Array.from(tr.querySelectorAll('th,td')).map(c=>(c.textContent||'').trim().replace(/\|/g,'\\|')).join(' | ');
    const head=table.querySelector('thead tr'), bodyRows=Array.from(table.querySelectorAll('tbody tr'));
    const cols=head?head.querySelectorAll('th,td').length:(bodyRows[0]?bodyRows[0].querySelectorAll('td').length:0);
    let md='';
    if(head) md+='| '+rowText(head)+' |\n| '+Array.from({length:cols},()=>'---').join(' | ')+' |\n';
    md+=bodyRows.map(tr=>'| '+rowText(tr)+' |').join('\n');
    const blob=new Blob([md],{type:'text/markdown'}); const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='table.md'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });
  body.appendChild(dl);
}

/* ---------- command palette ---------- */
let palTab='all';
function relTime(ts){
  const d=Date.now()-(ts||Date.now());
  const m=Math.floor(d/60000); if(m<1) return 'now'; if(m<60) return m+'m';
  const h=Math.floor(m/60); if(h<24) return h+'h';
  return Math.floor(h/24)+'d';
}
function openPalette(){ palTab='all'; const inp=$('#paletteInput'); if(inp) inp.value=''; renderPalette(); openSheet('#paletteSheet'); setTimeout(()=>{ const i=$('#paletteInput'); if(i) i.focus(); },60); }
function renderPalette(){
  const q=(($('#paletteInput').value||'').trim().toLowerCase());
  document.querySelectorAll('#paletteTabs .tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-pal-tab')===palTab));
  const box=$('#paletteResults');
  const match=s=>(!q||s.toLowerCase().includes(q));
  let html='';
  const quick=[
    {icon:'square-pen', label:'New Chat', sub:'Ctrl J', on:'newChat'},
    {icon:'folder', label:'New Project', sub:'', on:'newProject'},
    {icon:'clock', label:'New Automation', sub:'', on:'newAutomation'},
    {icon:'settings', label:'Open settings', sub:'Ctrl ,', on:'settings'}
  ].filter(a=>match(a.label));
  const chats=sessions.filter(s=>!s.temporary&&!s.archived).slice(0,5).filter(s=>match(s.title||'')||(s.messages||[]).some(m=>(m.text||'').toLowerCase().includes(q)));
  const files=library.filter(f=>match(f.name));
  const autos=AUTOMATIONS.filter(a=>match(a.name));
  const apps=CONNECT_APPS.filter(a=>match(a.name));
  const images=[]; sessions.forEach(s=>s.messages.forEach(m=>{ if(m.image) images.push({name:'Generated image · '+(s.title||'New chat'), image:m.image, sid:s.id}); }));
  const show=(tab)=>palTab==='all'||palTab===tab;
  if(show('all')&&quick.length) html+='<div class="pal-sec">Quick actions</div>'+quick.map((a,i)=>'<button class="pal-row" data-pal-quick="'+a.on+'" type="button"><span class="pal-ic">'+icon(a.icon,18)+'</span><span class="pal-tx"><span>'+esc(a.label)+'</span></span>'+(a.sub?'<span class="pal-kbd">'+esc(a.sub)+'</span>':'')+'</button>').join('');
  if(show('all')&&chats.length) html+='<div class="pal-sec">Chats</div>'+chats.map(s=>'<button class="pal-row" data-pal-chat="'+s.id+'" type="button"><span class="pal-ic">'+icon('message-square-plus',18)+'</span><span class="pal-tx"><span>'+esc(s.title||'New chat')+'</span><span class="pal-sub">'+relTime(s.updatedAt)+'</span></span></button>').join('');
  if(show('imagine')) html+='<div class="pal-sec">Imagine</div>'+(images.length?images.map(im=>'<button class="pal-row" data-pal-chat="'+im.sid+'" type="button"><span class="pal-ic">'+icon('image',18)+'</span><span class="pal-tx"><span>'+esc(im.name)+'</span></span></button>').join(''):'<div class="pal-sec">No images yet — ask for an image in chat.</div>')+'<button class="pal-row" data-pal-quick="createImage" type="button"><span class="pal-ic">'+icon('image',18)+'</span><span class="pal-tx"><span>Create image</span></span></button>';
  if(show('apps')) html+='<div class="pal-sec">Apps</div>'+(apps.length?apps.map(a=>'<button class="pal-row" data-pal-app="'+esc(a.name)+'" type="button"><span class="pal-ic">'+icon('layout-grid',18)+'</span><span class="pal-tx"><span>'+esc(a.name)+'</span><span class="pal-sub">'+esc(a.desc)+'</span></span></button>').join(''):'<div class="pal-sec">No apps match.</div>');
  if(show('automations')) html+='<div class="pal-sec">Automations</div>'+(autos.length?autos.map(a=>'<button class="pal-row" data-pal-auto="'+esc(a.name)+'" type="button"><span class="pal-ic">'+icon('clock',18)+'</span><span class="pal-tx"><span>'+esc(a.name)+'</span></span></button>').join(''):'<div class="pal-sec">No automations match.</div>');
  if(show('files')) html+='<div class="pal-sec">Files</div>'+(files.length?files.map((f,i)=>'<button class="pal-row" data-pal-file="'+i+'" type="button"><span class="pal-ic">'+icon(f.kind==='image'?'image':'file',18)+'</span><span class="pal-tx"><span>'+esc(f.name)+'</span><span class="pal-sub">'+fmtBytes(f.size||0)+'</span></span></button>').join(''):'<div class="pal-sec">No files yet.</div>');
  if(!html) html='<div class="pal-sec">No results for "'+esc(q)+'"</div>';
  box.innerHTML=html;
  box.querySelectorAll('[data-pal-quick]').forEach(b=>b.addEventListener('click',()=>{
    const k=b.getAttribute('data-pal-quick'); closeSheet('#paletteSheet');
    if(k==='newChat') newChat();
    else if(k==='newProject') openProjectDialog();
    else if(k==='newAutomation') openSettings('automations');
    else if(k==='settings') openSettings();
    else if(k==='createImage'){ activeTool='image'; openSheet('#imageSheet'); setTimeout(()=>$('#imagePrompt').focus(),60); }
  }));
  box.querySelectorAll('[data-pal-chat]').forEach(b=>b.addEventListener('click',()=>{ closeSheet('#paletteSheet'); openSession(b.getAttribute('data-pal-chat')); }));
  box.querySelectorAll('[data-pal-file]').forEach(b=>b.addEventListener('click',()=>{ const f=files[parseInt(b.getAttribute('data-pal-file'),10)]; closeSheet('#paletteSheet'); if(f) openFileInPane(f); }));
  box.querySelectorAll('[data-pal-app]').forEach(b=>b.addEventListener('click',()=>{ closeSheet('#paletteSheet'); openSettings('connectors'); }));
  box.querySelectorAll('[data-pal-auto]').forEach(b=>b.addEventListener('click',()=>{ closeSheet('#paletteSheet'); openSettings('automations'); }));
}

/* ---------- Library ---------- */
let libTab='all', libGridView=false;
function openLibrary(tab){ libTab=tab||'all'; renderLibrary(); $('#libraryPage').hidden=false; }
function libraryImages(){
  const out=[];
  library.forEach(f=>{ if(f.kind==='image') out.push(f); });
  sessions.forEach(s=>s.messages.forEach(m=>{ if(m.image) out.push({name:'Generated image · '+(s.title||'New chat'), kind:'image', image:m.image}); }));
  return out;
}
function renderLibrary(){
  document.querySelectorAll('#libTabs .tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-lib-tab')===libTab));
  const q=(($('#libSearch').value||'').trim().toLowerCase());
  const body=$('#libBody');
  const match=f=>!q||(f.name||'').toLowerCase().includes(q);
  const empty=(ic,title,sub)=>'<div class="lib-empty"><span class="lib-empty-ic">'+icon(ic,26)+'</span><h3>'+esc(title)+'</h3><p>'+esc(sub)+'</p></div>';
  const fileRow=f=>'<div class="lib-file"><span class="lib-file-ic">'+icon(f.kind==='image'?'image':'file',18)+'</span><span class="lib-file-tx"><span>'+esc(f.name)+'</span><span class="lib-file-sub">'+fmtBytes(f.size||0)+'</span></span><button type="button" class="lib-del" data-lib-del="'+esc(f.id)+'" aria-label="Delete file">'+icon('trash-2',15)+'</button></div>';
  let html='';
  if(libTab==='all'){
    const items=library.filter(match);
    html=items.length?items.map(fileRow).join(''):empty('image','Your library is empty','Upload files to keep them within reach.');
  } else if(libTab==='media'){
    const imgs=libraryImages().filter(match);
    html=imgs.length?imgs.map(f=>f.image?'<img class="lib-img" src="'+esc(f.image)+'" alt="Generated image">':fileRow(f)).join(''):empty('image','No media yet','Upload images, videos, or audio to see them here.');
  } else if(libTab==='files'){
    const items=library.filter(f=>f.kind!=='image').filter(match);
    html=items.length?items.map(fileRow).join(''):empty('file','No files yet','Upload files to keep them within reach.');
  } else if(libTab==='projects'){
    const items=projects.filter(p=>!q||p.name.toLowerCase().includes(q));
    html=(items.length?items.map(p=>'<button class="lib-file" data-lib-proj="'+p.id+'" type="button"><span class="lib-file-ic">'+icon('folder',18)+'</span><span class="lib-file-tx"><span>'+esc(p.name)+'</span><span class="lib-file-sub">'+esc(p.desc||'')+'</span></span></button>').join(''):empty('folder','No projects yet','Create a project to keep your files and chats organized.'))
      +'<div class="lib-sec">Try an example</div><div class="lib-grid">'+EXAMPLE_PROJECTS.map((p,i)=>'<button class="lib-card" data-lib-example="'+i+'" type="button"><span class="lib-card-tag">'+esc(p.tag)+'</span><div class="lib-card-title">'+esc(p.name)+'</div></button>').join('')+'</div>';
  } else if(libTab==='apps'){
    html=empty('layout-grid','No apps yet','Apps you build will appear here.');
  }
  body.innerHTML=html;
  body.querySelectorAll('[data-lib-del]').forEach(b=>b.addEventListener('click',async()=>{
    const id=b.getAttribute('data-lib-del');
    const ok=await showConfirm({title:'Delete file?', text:'This file will be removed from your library.', okLabel:'Delete'});
    if(!ok) return;
    library=library.filter(f=>f.id!==id); saveLibrary(); renderLibrary();
  }));
  body.querySelectorAll('[data-lib-proj]').forEach(b=>b.addEventListener('click',()=>{ $('#libraryPage').hidden=true; openProjectPage(b.getAttribute('data-lib-proj')); }));
  body.querySelectorAll('[data-lib-example]').forEach(b=>b.addEventListener('click',()=>{
    const p=EXAMPLE_PROJECTS[parseInt(b.getAttribute('data-lib-example'),10)];
    const proj={id:uid(), name:p.name, desc:p.desc, color:PROJ_COLORS[0], folders:[], createdAt:Date.now()};
    projects.unshift(proj); saveProjects(); renderSidebar();
    $('#libraryPage').hidden=true; openProjectPage(proj.id); toast('Project created');
  }));
  body.querySelectorAll('.lib-file').forEach(row=>{
    if(row.hasAttribute('data-lib-proj')) return;
    row.addEventListener('click',e=>{ if(e.target.closest('[data-lib-del]')) return; const id=row.querySelector('[data-lib-del]')?.getAttribute('data-lib-del'); const f=library.find(x=>x.id===id); if(f) openFileInPane(f); });
  });
}
const EXAMPLE_PROJECTS=[
 {name:'Legal Document Reviewer', tag:'Learning', desc:'Review and explain legal documents in plain language.'},
 {name:'Cover Letter Writer', tag:'Writing', desc:'Write tailored cover letters for job applications.'},
 {name:'Writing Assistant', tag:'Writing', desc:'Draft, edit, and polish any kind of writing.'},
 {name:'Fitness Advice', tag:'Wellness', desc:'Workout plans and fitness guidance.'}
];
function uploadLibraryFiles(files){
  const MAX_BYTES=1100000;
  let done=0, added=0;
  const finish=()=>{ done++; if(done===files.length){ saveLibrary(); projUploadTarget=null; renderLibrary(); if(added) toast(added+' file(s) added to your library'); } };
  files.forEach(f=>{
    if(f.size>MAX_BYTES){ toast('"'+f.name+'" is too large (max ~1 MB)'); finish(); return; }
    const isImage=f.type&&f.type.startsWith('image/');
    const entry={id:uid(), name:f.name, kind:isImage?'image':'file', mimeType:f.type||'', size:f.size||0, createdAt:Date.now(), projectId:projUploadTarget||null};
    if(!window.FileReader){ library.unshift(entry); added++; finish(); return; }
    const rd=new FileReader();
    rd.onload=()=>{ try{ const url=String(rd.result||''); entry.data=url.indexOf(',')>=0?url.split(',')[1]:url; }catch(err){} library.unshift(entry); added++; finish(); };
    rd.onerror=()=>{ toast('Could not read "'+f.name+'"'); finish(); };
    rd.readAsDataURL(f);
  });
}

/* ---------- Projects: dialog + page ---------- */
const PROJ_COLORS=['#3572a5','#b59a00','#3178c6','#e34c26','#563d7c','#4e9a06'];
let projIconIdx=0, projFolders=[];
function renderProjFolders(){
  const box=$('#projFolders');
  box.innerHTML=projFolders.map((f,i)=>'<span class="proj-folder-chip">'+esc(f)+'<button type="button" data-proj-folder-del="'+i+'" aria-label="Remove folder">'+icon('x',13)+'</button></span>').join('')+'<button id="projAddFolder" class="proj-add-folder" type="button">Add Folder</button>';
  box.querySelectorAll('[data-proj-folder-del]').forEach(b=>b.addEventListener('click',()=>{ projFolders.splice(parseInt(b.getAttribute('data-proj-folder-del'),10),1); renderProjFolders(); }));
  box.querySelector('#projAddFolder').addEventListener('click',async()=>{
    const name=await promptDialog('Add folder','Folder name','');
    if(name===null||!name.trim()) return;
    projFolders.push(name.trim()); renderProjFolders();
  });
}
function openProjectDialog(){
  projIconIdx=0; projFolders=[];
  $('#projIconBtn').style.background=PROJ_COLORS[0];
  $('#projNameInput').value=''; $('#projDescInput').value='';
  renderProjFolders();
  openSheet('#projectDialog');
  setTimeout(()=>$('#projNameInput').focus(),60);
}
function createProjectFromDialog(){
  const name=$('#projNameInput').value.trim()||'Untitled Project';
  const desc=$('#projDescInput').value.trim();
  const proj={id:uid(), name, desc, color:PROJ_COLORS[projIconIdx], folders:projFolders.slice(), createdAt:Date.now()};
  projects.unshift(proj); saveProjects(); renderSidebar();
  closeSheet('#projectDialog');
  openProjectPage(proj.id); toast('Project created');
}
function openProjectPage(id){
  const p=projects.find(x=>x.id===id); if(!p) return;
  activeProjectId=id;
  $('#projectTitle').textContent=p.name;
  const body=$('#projectBody');
  const chats=sessions.filter(s=>s.projectId===id&&!s.temporary&&!s.archived);
  const files=library.filter(f=>f.projectId===id);
  body.innerHTML='<div class="set-card"><h3>'+esc(p.name)+'</h3><p>'+esc(p.desc||'No description.')+'</p>'+(p.folders&&p.folders.length?'<p style="margin-top:8px">Folders: '+p.folders.map(esc).join(' · ')+'</p>':'')+'</div>'
    +'<div class="lib-sec">Chats ('+chats.length+')</div>'
    +(chats.length?chats.map(s=>'<button class="lib-file" data-proj-chat="'+s.id+'" type="button"><span class="lib-file-ic">'+icon('message-square-plus',18)+'</span><span class="lib-file-tx"><span>'+esc(s.title||'New chat')+'</span></span></button>').join(''):'<p class="set-note">No chats in this project yet.</p>')
    +'<div class="lib-sec">Files ('+files.length+')</div>'
    +(files.length?files.map(f=>'<button class="lib-file" data-proj-file="'+f.id+'" type="button"><span class="lib-file-ic">'+icon(f.kind==='image'?'image':'file',18)+'</span><span class="lib-file-tx"><span>'+esc(f.name)+'</span></span></button>').join(''):'<p class="set-note">No files in this project yet.</p>')
    +'<button id="projUploadBtn" class="btn-primary" type="button">Upload files to this project</button>'
    +'<button id="projDeleteBtn" class="btn-ghost" type="button" style="color:var(--danger);margin-top:8px">Delete project</button>';
  body.querySelectorAll('[data-proj-chat]').forEach(b=>b.addEventListener('click',()=>{ $('#projectPage').hidden=true; openSession(b.getAttribute('data-proj-chat')); }));
  body.querySelectorAll('[data-proj-file]').forEach(b=>b.addEventListener('click',()=>{ const f=library.find(x=>x.id===b.getAttribute('data-proj-file')); if(f) openFileInPane(f); }));
  body.querySelector('#projUploadBtn').addEventListener('click',()=>{ projUploadTarget=id; $('#libFileInput').click(); });
  body.querySelector('#projDeleteBtn').addEventListener('click',async()=>{
    const ok=await showConfirm({title:'Delete project?', text:'"'+p.name+'" will be deleted. Its chats stay in All chats.', okLabel:'Delete'});
    if(!ok) return;
    projects=projects.filter(x=>x.id!==id);
    sessions.forEach(s=>{ if(s.projectId===id) s.projectId=null; });
    saveProjects(); saveSessions(); renderSidebar();
    $('#projectPage').hidden=true; activeProjectId=null; toast('Project deleted');
  });
  $('#projectPage').hidden=false;
}
let projUploadTarget=null;

/* ---------- Grok Bot sheet ---------- */
function openBotSheet(){ openSheet('#botSheet'); }

/* ---------- Upgrade dialog (free per Q2) ---------- */
const UPGRADE_PLANS={
 Plus:{sub:'Our introductory plan: Shared — AI usage pool across all products', was:'₱490 monthly', price:'Free', ai:['Grok Chat/Voice/Imagine/Build','Grok API','Cursor'], x:['Fewer timeline ads','Premium checkmark','Enhanced creator tools','Advanced Analytics','Get paid to post','Edit posts','Customize your experience','Create longer posts','Write Articles','Media Studio','1080p video uploads','Post longer videos','Higher posting limits','Bookmark folders','Download videos','Higher DM limits'], btn:'Upgrade to Plus'},
 Premium:{sub:'Everything in Plus, and:', mult:'4x more usage compared to Plus', deal:'Black friday deal', was:'₱2,090 Billed once for 2 months', price:'Free', then:'Then Free monthly', ai:['Grok Bot','Latest Grok models','Faster Chat responses','Make stunning AI images & videos','Cloud agents & automations','Code hosting & AI code reviews'], x:['Ad-free scrolling on most surfaces','Preferred @handle','Higher reply boost'], btn:'Claim limited-time offer'},
 Super:{sub:'Everything in Premium, and:', mult:'15x more usage compared to Plus', was:'₱7,090 monthly', price:'Free', ai:['Priority model access at peak times','Faster responses & generations'], x:[], btn:'Upgrade to Super'},
 Ultra:{sub:'Everything in Super, and:', mult:'50x more usage compared to Plus', was:'₱13,990 monthly', price:'Free', ai:['Most powerful Chat models','Earliest access to new features','Fastest responses & generations'], x:[], btn:'Upgrade to Ultra'}
};
let upgTab='Premium', upgTimer=null;
function upgCountdownText(){
  const end=new Date('2026-12-02T16:00:00+08:00').getTime();
  let d=Math.max(0, end-Date.now());
  const days=Math.floor(d/86400000); d-=days*86400000;
  const h=Math.floor(d/3600000); d-=h*3600000;
  const m=Math.floor(d/60000); d-=m*60000;
  const s=Math.floor(d/1000);
  const pad=n=>String(n).padStart(2,'0');
  return pad(days)+' DAYS '+pad(h)+' HR '+pad(m)+' MIN '+pad(s)+' SEC';
}
function openUpgradeSheet(){
  upgTab=settings.plan&&UPGRADE_PLANS[settings.plan]?settings.plan:'Premium';
  renderUpgradeSheetBody();
  openSheet('#upgradeSheet');
  if(upgTimer) clearInterval(upgTimer);
  upgTimer=setInterval(()=>{ const el=$('#upgCountdown'); if(el&&!$('#upgradeSheet').hidden) el.textContent=upgCountdownText(); else if(upgTimer){ clearInterval(upgTimer); upgTimer=null; } },1000);
}
function renderUpgradeSheetBody(){
  document.querySelectorAll('#upgTabs .tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-upg-tab')===upgTab));
  const p=UPGRADE_PLANS[upgTab];
  const cd=$('#upgCountdown'); if(cd) cd.textContent=upgCountdownText();
  $('#upgBody').innerHTML='<div class="upg-plan-sub">'+esc(p.sub)+'</div>'
    +(p.deal?'<span class="upg-deal">'+esc(p.deal)+'</span>':'')
    +(p.mult?'<div class="upg-plan-sub"><strong>'+esc(p.mult)+'</strong></div>':'')
    +'<div class="upg-price">'+esc(p.price)+(p.was?'<span class="upg-was">'+esc(p.was)+'</span>':'')+'</div>'
    +(p.then?'<div class="upg-price-sub">'+esc(p.then)+'</div>':'')
    +'<div class="upg-benefits">AI Benefits</div><ul class="upg-benefits-list">'+p.ai.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>'
    +(p.x&&p.x.length?'<div class="upg-benefits">X Benefits</div><ul class="upg-benefits-list">'+p.x.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>':'')
    +'<button id="upgClaimBtn" class="btn-primary" type="button">'+esc(p.btn)+'</button>';
  $('#upgClaimBtn').addEventListener('click',()=>{
    settings.plan=upgTab; saveSettings(); renderAll();
    closeSheet('#upgradeSheet');
    toast(upgTab+' plan set — free on this device');
  });
}

/* ---------- Help menu + info pages ---------- */
function openHelpMenu(){
  const r=$('#profileBtn')?$('#profileBtn').getBoundingClientRect():{left:120,top:300};
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-230)), r.top-8, [
    {icon:'circle-help', label:'FAQ', onClick:()=>openInfoPage('faq')},
    {icon:'user-plus', label:'Community', onClick:()=>openInfoPage('community')},
    {icon:'file-text', label:'Changelog', onClick:()=>openInfoPage('changelog')},
    {icon:'message-square-plus', label:'Send Feedback', onClick:()=>openInfoPage('feedback')},
    {icon:'link', label:'Shared Links', onClick:()=>openInfoPage('sharedlinks')}
  ], {above:true});
}
function openInfoPage(key){
  const body=$('#infoBody'), title=$('#infoTitle');
  const back=()=>{ $('#infoPage').hidden=true; };
  if(key==='faq'){
    title.textContent='FAQ';
    body.innerHTML='<div class="set-card"><h3>How do I start a chat?</h3><p>Type a message and tap Send. Your chats are saved on this device.</p></div>'
      +'<div class="set-card"><h3>How do I switch models?</h3><p>Tap the model name in the composer to open the model picker. Nine free models are available.</p></div>'
      +'<div class="set-card"><h3>How do I generate an image?</h3><p>Ask for an image in chat, or tap + then Create image.</p></div>'
      +'<div class="set-card"><h3>Are my chats private?</h3><p>Chats live in this browser only. Private chats are never saved — they disappear when you refresh.</p></div>'
      +'<div class="set-card"><h3>Why did a reply take a while?</h3><p>Replies can take around 30 seconds while the model works.</p></div>';
  } else if(key==='community'){
    title.textContent='Community';
    body.innerHTML='<div class="set-card"><h3>Community</h3><p>There is no community forum for JepongDevxyz AI yet. If you have feedback, use Send Feedback — it is saved on this device.</p></div><button id="commFeedback" class="btn-primary" type="button">Send Feedback</button>';
    body.querySelector('#commFeedback').addEventListener('click',()=>openInfoPage('feedback'));
  } else if(key==='changelog'){
    title.textContent='Changelog';
    body.innerHTML='<div class="set-card"><h3>Grok rebuild — 2026-11-25</h3><p>Fresh rebuild from a full grok.com review: new sidebar with Library and Projects, 9-section Settings, command palette, Library page, upgrade plans free on this device, and grok-style tables that scroll instead of breaking words.</p></div>'
      +'<div class="set-card"><h3>Round 5 — 2026-11-25</h3><p>Tables fit the viewport, scroll button fades, duplicate titles numbered, Projects always visible, near-black greeting.</p></div>'
      +'<div class="set-card"><h3>Round 4 — 2026-11-25</h3><p>Deterministic answers to app questions, Premium band fix, one-line model rows.</p></div>'
      +'<div class="set-card"><h3>Grok rebuild — 2026-11-24</h3><p>Fresh frontend cloned from grok.com, APINEX-only backend, voice mode, dictate.</p></div>';
  } else if(key==='feedback'){
    title.textContent='Send Feedback';
    body.innerHTML='<label class="field-label" for="fbText">Your feedback</label><textarea id="fbText" class="field" rows="5" placeholder="Tell us what works and what does not…"></textarea><button id="fbSend" class="btn-primary" type="button">Send feedback</button><p class="set-note">Feedback is saved on this device only.</p>';
    body.querySelector('#fbSend').addEventListener('click',()=>{
      const t=body.querySelector('#fbText').value.trim();
      if(!t){ toast('Write your feedback first'); return; }
      extra.feedback.push({text:t, at:Date.now()}); saveExtra();
      toast('Feedback saved'); back();
    });
  } else if(key==='sharedlinks'){
    title.textContent='Shared Links';
    const links=extra.sharedLinks||[];
    body.innerHTML=links.length?links.map((l,i)=>'<div class="trash-row"><span class="trash-tx"><span>'+esc(l.title||'Shared chat')+'</span><span class="trash-sub">'+esc(l.url||'')+' · '+fmtStamp(l.at)+'</span></span></div>').join(''):'<div class="set-card"><h3>No shared links yet</h3><p>Links you share from a chat will appear here.</p></div>';
  } else if(key==='terms'){
    title.textContent='Terms';
    body.innerHTML='<div class="set-card"><h3>Terms</h3><p>JepongDevxyz AI is provided as-is. AI-generated content may be inaccurate — verify important information. Do not use the app for anything unlawful, and do not share passwords or sensitive personal information in chats.</p></div>';
  } else if(key==='privacy'){
    title.textContent='Privacy';
    body.innerHTML='<div class="set-card"><h3>Privacy</h3><p>Your chats, settings and projects are stored in this browser on your device. There is no JepongDevxyz AI account and nothing is uploaded to a JepongDevxyz AI server for storage. Messages you send are processed by the chat backend to generate replies. Voice input uses your device speech recognition and voices.</p></div>';
  } else if(key==='acceptable'){
    title.textContent='Acceptable Use';
    body.innerHTML='<div class="set-card"><h3>Acceptable Use</h3><p>Use JepongDevxyz AI for lawful purposes only. Do not use it to deceive, harass, or harm others, and do not try to break or abuse the service.</p></div>';
  } else if(key==='cookiesPage'){
    title.textContent='Cookie Policy';
    body.innerHTML='<div class="set-card"><h3>Cookie Policy</h3><p>JepongDevxyz AI stores its data in this browser (local storage), not in cookies. Your preferences, chats, and projects never leave this device. Third-party cookies are not used.</p></div>';
  } else if(key==='cookies'){
    title.textContent='Cookie Settings';
    body.innerHTML='<div class="set-card"><div class="set-toggle-row"><div class="set-toggle-text"><h3>Analytics</h3><p>Anonymous usage analytics.</p></div><button id="ckAnalytics" class="switch'+(settings.cookies.analytics?' on':'')+'" type="button" aria-label="Analytics"></button></div>'
      +'<div class="set-toggle-row"><div class="set-toggle-text"><h3>Personalization</h3><p>Remember your preferences on this device.</p></div><button id="ckPers" class="switch'+(settings.cookies.personalization?' on':'')+'" type="button" aria-label="Personalization"></button></div></div>';
    body.querySelector('#ckAnalytics').addEventListener('click',e=>{ settings.cookies.analytics=!settings.cookies.analytics; saveSettings(); e.currentTarget.classList.toggle('on', settings.cookies.analytics); });
    body.querySelector('#ckPers').addEventListener('click',e=>{ settings.cookies.personalization=!settings.cookies.personalization; saveSettings(); e.currentTarget.classList.toggle('on', settings.cookies.personalization); });
  } else if(key==='archived'){
    title.textContent='Archived Conversations';
    const items=sessions.filter(s=>s.archived);
    body.innerHTML=items.length?items.map(s=>'<div class="trash-row"><span class="trash-tx"><span>'+esc(s.title||'New chat')+'</span><span class="trash-sub">'+fmtStamp(s.updatedAt)+'</span></span><button type="button" class="mini-btn" data-unarchive="'+s.id+'">Restore</button></div>').join(''):'<div class="set-card"><h3>No archived conversations</h3><p>Archived chats will appear here.</p></div>';
    body.querySelectorAll('[data-unarchive]').forEach(b=>b.addEventListener('click',()=>{ const s=getSession(b.getAttribute('data-unarchive')); if(s){ s.archived=false; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); openInfoPage('archived'); toast('Chat restored'); } }));
  } else if(key==='deleted'){
    title.textContent='Deleted Conversations';
    const items=extra.trash||[];
    body.innerHTML=items.length?items.map((t,i)=>'<div class="trash-row"><span class="trash-tx"><span>'+esc(t.title||'New chat')+'</span><span class="trash-sub">Deleted '+fmtStamp(t.deletedAt)+'</span></span><button type="button" class="mini-btn" data-restore="'+i+'">Restore</button><button type="button" class="mini-btn danger" data-forever="'+i+'">Delete forever</button></div>').join(''):'<div class="set-card"><h3>No deleted conversations</h3><p>Deleted chats are kept here until you delete them forever.</p></div>';
    body.querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>{
      const t=extra.trash.splice(parseInt(b.getAttribute('data-restore'),10),1)[0];
      if(t){ const s={id:t.id, title:t.title, createdAt:t.createdAt||Date.now(), updatedAt:Date.now(), messages:t.messages||[], titleAutoPending:false, titleRequested:true, projectId:t.projectId||null, temporary:false}; sessions.unshift(s); saveSessions(); saveExtra(); renderSidebar(); openInfoPage('deleted'); toast('Chat restored'); }
    }));
    body.querySelectorAll('[data-forever]').forEach(b=>b.addEventListener('click',async()=>{
      const ok=await showConfirm({title:'Delete forever?', text:'This chat cannot be recovered.', okLabel:'Delete'});
      if(!ok) return;
      extra.trash.splice(parseInt(b.getAttribute('data-forever'),10),1); saveExtra(); openInfoPage('deleted');
    }));
  }
  $('#infoPage').hidden=false;
}

/* ---------- Conversation Actions menu (grok top-bar "...") ---------- */
function topTitleMenu(s){
  const r=$('#topTitle').getBoundingClientRect();
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-240)), r.bottom+4, [
    {icon:'share', label:'Share', onClick:()=>shareChat(s)},
    {icon:'pin', label:s.pinned?'Unpin':'Pin', onClick:()=>{ s.pinned=!s.pinned; saveSessions(); renderSidebar(); }},
    {icon:'pencil', label:'Rename', onClick:()=>renameChat(s.id)},
    {icon:'folder', label:'Add to Project', onClick:()=>addToProjectMenu(s)},
    {icon:'message-square-plus', label:'Send Feedback', onClick:()=>openInfoPage('feedback')},
    {icon:'copy', label:'Copy Conversation ID', onClick:()=>{ copyText(s.id).then(()=>toast('Conversation ID copied')); }},
    {icon:'link', label:'Open in new tab', onClick:()=>{ try{ window.open(location.href,'_blank'); }catch(e){} }},
    {icon:'archive', label:'Archive', onClick:()=>{ s.archived=true; s.updatedAt=Date.now(); saveSessions(); if(currentId===s.id){ currentId=null; } renderAll(); toast('Chat archived'); }},
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteChat(s.id)}
  ]);
}
function shareChat(s){
  if(settings.data&&settings.data.allowShare===false){ toast('Link sharing is off — enable it in Data Controls'); return; }
  extra.sharedLinks.push({title:s.title||'New chat', url:location.origin+location.pathname, at:Date.now(), chatId:s.id});
  saveExtra();
  copyText(location.origin+location.pathname).then(()=>toast('Link copied'));
}
function addToProjectMenu(s){
  const r=$('#topTitle').getBoundingClientRect();
  const items=projects.map(p=>({icon:'folder', label:p.name, onClick:()=>{ s.projectId=p.id; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); toast('Added to '+p.name); }}));
  items.push({icon:'plus', label:'New project', onClick:()=>openProjectDialog()});
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-240)), r.bottom+4, items);
}

/* ---------- delete -> trash (restorable) ---------- */
async function trashChat(s){
  extra.trash.unshift({id:s.id, title:s.title, createdAt:s.createdAt, deletedAt:Date.now(), messages:s.messages, projectId:s.projectId||null});
  saveExtra();
}

/* ---------- dictation refinement (Behavior setting, real) ---------- */
function refineDictation(text){
  const mode=settings.voice.dictation||'Tidy up';
  let t=String(text||'').trim();
  if(mode==='No refinement') return t;
  t=t.replace(/\s+/g,' ').replace(/\s+([,.!?])/g,'$1');
  t=t.charAt(0).toUpperCase()+t.slice(1);
  if(mode==='Fully refine'){
    t=t.replace(/\b(um|uh|erm|like)\b/gi,'').replace(/\s+/g,' ').trim();
    t=t.charAt(0).toUpperCase()+t.slice(1);
    if(t&&!/[.!?]$/.test(t)) t+='.';
  }
  return t;
}

/* ---------- voice personality override (Behavior setting, real) ---------- */
let voiceStyleOverride=null;
function vmPersonalityStyle(){
  const p=settings.voice.personality||'Assistant';
  if(p==='Assistant') return 'Default';
  if(p==='Custom…') return 'Custom';
  return p;
}

/* ---------- notifications (real) ---------- */
function notifyReply(text){
  if(!(settings.notifications&&settings.notifications.browser)) return;
  if(!('Notification' in window)) return;
  if(Notification.permission!=='granted') return;
  if(!document.hidden) return;
  try{ new Notification('JepongDevxyz AI', {body:String(text||'').slice(0,120)}); }catch(e){}
}
function checkProductUpdates(){
  /* Real meaning of "Product Updates: On" — a one-time "What's new" toast
     when the app version changes. Off means never. */
  if(!(settings.notifications&&settings.notifications.updates==='On')) return;
  if(extra.seenVersion==='grok-rebuild-2026-11-25') return;
  extra.seenVersion='grok-rebuild-2026-11-25'; saveExtra();
  setTimeout(()=>toast('What\'s new: grok-style rebuild — Library, 9-section Settings, command palette.'), 2500);
}

/* ================= Skills: real client-side file creation ================= */
const SKILL_BUILTINS=[
 {name:'Create a docx file', ext:'docx', icon:'file-text'},
 {name:'Create a pdf file', ext:'pdf', icon:'file-text'},
 {name:'Create a pptx file', ext:'pptx', icon:'presentation'},
 {name:'Create a xlsx file', ext:'xlsx', icon:'sheet'}
];
/* Minimal ZIP writer (STORE, no compression) + tiny Office XML generators.
   A .docx/.xlsx/.pptx built this way is a real file that opens in
   Word/Sheets/Slides — not a renamed .txt. */
function crc32(buf){
  if(!crc32.table){
    const t=[]; for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } crc32.table=t;
  }
  let c=0xFFFFFFFF; for(let i=0;i<buf.length;i++) c=crc32.table[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
function zipStore(files){
  /* files: [{name, data: string|Uint8Array}] -> Blob (application/zip) */
  const enc=new TextEncoder();
  const chunks=[]; const central=[]; let offset=0;
  const pushU16=v=>{ const b=new Uint8Array(2); new DataView(b.buffer).setUint16(0,v,true); chunks.push(b); };
  const pushU32=v=>{ const b=new Uint8Array(4); new DataView(b.buffer).setUint32(0,v>>>0,true); chunks.push(b); };
  const pushBytes=b=>chunks.push(b instanceof Uint8Array?b:enc.encode(String(b)));
  files.forEach(f=>{
    const nameBytes=enc.encode(f.name);
    const data=f.data instanceof Uint8Array?f.data:enc.encode(String(f.data));
    const crc=crc32(data);
    const localOffset=offset;
    pushU32(0x04034b50); pushU16(20); pushU16(0x0800); pushU16(0); pushU16(0); pushU16(0);
    pushU32(crc); pushU32(data.length); pushU32(data.length); pushU16(nameBytes.length); pushU16(0);
    pushBytes(nameBytes); pushBytes(data);
    offset+=30+nameBytes.length+data.length;
    central.push({nameBytes, crc, size:data.length, offset:localOffset});
  });
  const centralStart=offset;
  central.forEach(c=>{
    pushU32(0x02014b50); pushU16(20); pushU16(20); pushU16(0x0800); pushU16(0); pushU16(0); pushU16(0);
    pushU32(c.crc); pushU32(c.size); pushU32(c.size); pushU16(c.nameBytes.length);
    pushU16(0); pushU16(0); pushU16(0); pushU16(0); pushU32(0); pushU32(c.offset); pushBytes(c.nameBytes);
    offset+=46+c.nameBytes.length;
  });
  pushU32(0x06054b50); pushU16(0); pushU16(0); pushU16(central.length); pushU16(central.length);
  pushU32(offset-centralStart); pushU32(centralStart); pushU16(0);
  const total=chunks.reduce((n,c)=>n+c.length,0);
  const out=new Uint8Array(total); let p=0;
  chunks.forEach(c=>{ out.set(c,p); p+=c.length; });
  return new Blob([out],{type:'application/zip'});
}
function xmlEsc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function downloadBlob(blob, filename){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
}
function makeDocx(title, text){
  const paras=String(text||'').split('\n').map(l=>'<w:p><w:r><w:t xml:space="preserve">'+xmlEsc(l)+'</w:t></w:r></w:p>').join('');
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+paras+'</w:body></w:document>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  return zipStore([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rels},{name:'word/document.xml',data:doc}]);
}
function makeXlsx(title, text){
  const rows=String(text||'').split('\n').map(l=>{
    const cells=(l.includes('\t')?l.split('\t'):l.includes('|')?l.split('|'):[l]).map(c=>'<c t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(c.trim())+'</t></is></c>').join('');
    return '<row>'+cells+'</row>';
  }).join('');
  const sheet='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows+'</sheetData></worksheet>';
  const wb='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const wbrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  return zipStore([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rels},{name:'xl/workbook.xml',data:wb},{name:'xl/_rels/workbook.xml.rels',data:wbrels},{name:'xl/worksheets/sheet1.xml',data:sheet}]);
}
function makePptx(title, text){
  const lines=String(text||'').split('\n').filter(l=>l.trim());
  const shapes=lines.map((l,i)=>'<p:sp><p:nvSpPr><p:cNvPr id="'+(i+2)+'" name="Text '+(i+1)+'"/><p:cNvSpPr txBox="1"/><p:nvSpPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="457200" y="'+(457200+i*457200)+'"/><a:ext cx="8229600" cy="400000"/></a:xfrm></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US"/><a:t>'+xmlEsc(l)+'</a:t></a:r></a:p></p:txBody></p:sp>').join('');
  const slide='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'+shapes+'</p:spTree></p:cSld></p:sld>';
  const pres='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSzCx="9144000" cy="6858000"/><p:notesSzCx="6858000" cy="9144000"/></p:presentation>';
  const presrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>';
  const master='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>';
  const masterrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
  const layout='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank"><p:cSld name="Blank"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
  const layoutrels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>';
  const sliderels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>';
  return zipStore([{name:'[Content_Types].xml',data:ct},{name:'_rels/.rels',data:rels},{name:'ppt/presentation.xml',data:pres},{name:'ppt/_rels/presentation.xml.rels',data:presrels},{name:'ppt/slides/slide1.xml',data:slide},{name:'ppt/slides/_rels/slide1.xml.rels',data:sliderels},{name:'ppt/slideMasters/slideMaster1.xml',data:master},{name:'ppt/slideMasters/_rels/slideMaster1.xml.rels',data:masterrels},{name:'ppt/slideLayouts/slideLayout1.xml',data:layout},{name:'ppt/slideLayouts/_rels/slideLayout1.xml.rels',data:layoutrels}]);
}
async function openSkillFileDialog(skill){
  const name=await promptDialog(skill.name,'File name', 'Untitled');
  if(name===null) return;
  const content=await promptDialog(skill.name,'Content', '', true);
  if(content===null) return;
  const fileName=(name.trim()||'Untitled')+'.'+skill.ext;
  if(skill.ext==='pdf'){
    /* Real PDF: the browser's own print-to-PDF. The content opens in a
       page with a Print button; the user saves it as PDF. */
    const body=$('#infoBody'); $('#infoTitle').textContent=fileName;
    body.innerHTML='<div class="set-card"><h3>'+esc(fileName)+'</h3><div style="white-space:pre-wrap;font-size:14.5px">'+esc(content)+'</div></div><button id="pdfPrintBtn" class="btn-primary" type="button">Print / Save as PDF</button>';
    body.querySelector('#pdfPrintBtn').addEventListener('click',()=>{ try{ window.print(); }catch(e){ toast('Print is not available'); } });
    $('#infoPage').hidden=false;
    toast('PDF ready — use Print to save it');
    return;
  }
  let blob=null;
  if(skill.ext==='docx') blob=makeDocx(name, content);
  else if(skill.ext==='xlsx') blob=makeXlsx(name, content);
  else if(skill.ext==='pptx') blob=makePptx(name, content);
  if(blob){ downloadBlob(blob, fileName); toast(fileName+' downloaded'); }
}
async function newPersonalSkill(){
  const name=await promptDialog('New Skill','Skill name','');
  if(name===null||!name.trim()) return;
  const instruction=await promptDialog('New Skill','What should this skill do? (instruction for the model)', '', true);
  if(instruction===null) return;
  extra.skills.push({id:uid(), name:name.trim(), instruction:instruction.trim(), on:true});
  saveExtra(); toast('Skill created');
  if(settingsPageKey==='skills') renderSettingsPage();
}
async function runPersonalSkill(skill){
  if(!skill.on){ toast('This skill is off — turn it on in Settings → Skills'); return; }
  const input=await promptDialog(skill.name,'What should '+skill.name+' do?','', true);
  if(input===null||!input.trim()) return;
  pendingCustomPrompt=(skill.instruction||'')+'\n\nUser request: '+input.trim();
  sendMessage(input.trim());
}

/* ---------- wiring / init ---------- */
function wire(){
  hydrateIcons(document);
  $('#modelMark').innerHTML=J_MARK;
  $('#menuBtn').addEventListener('click',()=>{ $('#sidebar').classList.add('open'); $('#scrim').hidden=false; });
  $('#sbClose').addEventListener('click',closeSidebarMobile);
  $('#scrim').addEventListener('click',closeSidebarMobile);
  $('#newChatBtn').addEventListener('click',newChat);
  $('#sbSearchIcon').addEventListener('click',()=>{ closeSidebarMobile(); openPalette(); });
  $('#topSearchBtn').addEventListener('click',()=>openPalette());
  $('#paneBtn').addEventListener('click',()=>{ const p=$('#rightPane'); if(p.hidden) openRightPane(); else closeRightPane(); });
  $('#paneClose').addEventListener('click',closeRightPane);
  $('#bannerClose').addEventListener('click',()=>{ extra.bannerDismissed=true; saveExtra(); $('#appBanner').hidden=true; });
  $('#bannerOpen').addEventListener('click',()=>{ try{ window.open('https://jepong-devxyz-ai.vercel.app/','_blank'); }catch(e){} });
  $('#topTitle').addEventListener('click',()=>{ const s=curSession(); if(!s) return; topTitleMenu(s); });
  $('#botCardHead').addEventListener('click',()=>{ $('#botCard').classList.toggle('closed'); });
  $('#botCreate').addEventListener('click',()=>{ closeSidebarMobile(); openBotSheet(); });
  $('#sbLibraryRow').addEventListener('click',()=>{ closeSidebarMobile(); openLibrary('all'); });
  $('#sbNewProj').addEventListener('click',()=>openProjectDialog());
  $('#sbProjMore').addEventListener('click',e=>{
    const r=e.currentTarget.getBoundingClientRect();
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, [
      {icon:'plus', label:'New project', onClick:()=>openProjectDialog()},
      {icon:'chevron-down', label:collapsedSecs.projects?'Expand projects':'Collapse projects', onClick:()=>{ collapsedSecs.projects=!collapsedSecs.projects; $('#projList').style.display=collapsedSecs.projects?'none':''; }}
    ]);
  });
  $('#sbChatsMore').addEventListener('click',e=>{
    const r=e.currentTarget.getBoundingClientRect();
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, [
      {icon:'plus', label:'New chat', onClick:()=>newChat()},
      {icon:'chevron-down', label:collapsedSecs.chats?'Expand chats':'Collapse chats', onClick:()=>{ collapsedSecs.chats=!collapsedSecs.chats; renderSidebar(); }}
    ]);
  });
  $('#sbNewPlus').addEventListener('click',()=>newChat());
  $('#sbBlackFriday').addEventListener('click',()=>{ closeSidebarMobile(); openUpgradeSheet(); });
  $('#sbConnectApps').addEventListener('click',()=>{ closeSidebarMobile(); openSettings('connectors'); });
  $('#profileBtn').addEventListener('click',e=>{
    /* Grok's profile row opens the account menu: Dashboard / Settings /
       Help (submenu) / Upgrade plan / Sign out. */
    const r=e.currentTarget.getBoundingClientRect(); closeSidebarMobile();
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-230)), r.top-8, [
      {header:(settings.profileName||'Jepong')+(settings.profileEmail?' · '+settings.profileEmail:'')},
      {icon:'layout-grid',label:'Dashboard',onClick:()=>{ try{ window.open('https://jepong-devxyz-ai.vercel.app/','_blank'); }catch(err){} }},
      {icon:'settings',label:'Settings',onClick:()=>openSettings()},
      {icon:'circle-help',label:'Help',onClick:()=>openHelpMenu()},
      {icon:'rocket',label:'Upgrade plan',onClick:()=>openUpgradeSheet()},
      {icon:'log-out',label:'Sign out',danger:true,onClick:()=>signOut()}
    ], {above:true});
  });
  const input=$('#composerInput');
  input.addEventListener('input',()=>{ autosize(); renderComposerState(); saveDraft(); renderAutocomplete(); });
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&!e.shiftKey){
      if(settings.behavior&&settings.behavior.ctrlEnter){ return; /* Enter inserts a newline; Ctrl+Enter sends */ }
      e.preventDefault(); hideAutocomplete(); sendMessage();
    }
    if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); hideAutocomplete(); sendMessage(); }
    if(e.key==='Escape'){ hideAutocomplete(); }
  });
  $('#sendBtn').addEventListener('click',()=>{ hideAutocomplete(); sendMessage(); });
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
  $('#libFileInput').addEventListener('change',e=>{
    const files=Array.from(e.target.files||[]);
    e.target.value='';
    if(!files.length) return;
    uploadLibraryFiles(files);
  });
  document.querySelectorAll('[data-close-sheet]').forEach(b=>b.addEventListener('click',()=>{ const sh=b.closest('.sheet'); if(sh) sh.hidden=true; }));
  document.querySelectorAll('.sheet').forEach(sh=>sh.addEventListener('click',e=>{ if(e.target===sh) sh.hidden=true; }));
  $('#confirmCancel').addEventListener('click',()=>closeConfirm(false));
  $('#confirmOk').addEventListener('click',()=>closeConfirm(true));
  $('#infoModalOk').addEventListener('click',()=>{ $('#infoModal').hidden=true; });
  $('#settingsBack').addEventListener('click',()=>{
    if(settingsPageKey==='list'){ $('#settingsPage').hidden=true; }
    else { settingsPageKey='list'; renderSettingsPage(); }
  });
  $('#settingsClose').addEventListener('click',()=>{ $('#settingsPage').hidden=true; });
  $('#settingsBanner').addEventListener('click',()=>{ $('#settingsPage').hidden=true; openUpgradeSheet(); });
  $('#infoBack').addEventListener('click',()=>{ $('#infoPage').hidden=true; });
  $('#infoClose').addEventListener('click',()=>{ $('#infoPage').hidden=true; });
  $('#libraryBack').addEventListener('click',()=>{ $('#libraryPage').hidden=true; });
  $('#libraryClose').addEventListener('click',()=>{ $('#libraryPage').hidden=true; });
  $('#libraryUpload').addEventListener('click',()=>{ $('#libFileInput').click(); });
  $('#libSearch').addEventListener('input',()=>renderLibrary());
  $('#libViewBtn').addEventListener('click',()=>{ libGridView=!libGridView; renderLibrary(); });
  $('#libTabs').querySelectorAll('[data-lib-tab]').forEach(t=>t.addEventListener('click',()=>{ libTab=t.getAttribute('data-lib-tab'); renderLibrary(); }));
  $('#projectBack').addEventListener('click',()=>{ $('#projectPage').hidden=true; });
  $('#projectClose').addEventListener('click',()=>{ $('#projectPage').hidden=true; });
  $('#projIconBtn').addEventListener('click',()=>{ projIconIdx=(projIconIdx+1)%PROJ_COLORS.length; $('#projIconBtn').style.background=PROJ_COLORS[projIconIdx]; });
  $('#projAddFolder').addEventListener('click',async()=>{
    const name=await promptDialog('Add folder','Folder name','');
    if(name===null||!name.trim()) return;
    projFolders.push(name.trim()); renderProjFolders();
  });
  $('#projCreateBtn').addEventListener('click',()=>createProjectFromDialog());
  $('#botUpgradeBtn').addEventListener('click',()=>{ closeSheet('#botSheet'); openUpgradeSheet(); });
  $('#upgTabs').querySelectorAll('[data-upg-tab]').forEach(t=>t.addEventListener('click',()=>{ upgTab=t.getAttribute('data-upg-tab'); renderUpgradeSheetBody(); }));
  $('#paletteInput').addEventListener('input',()=>renderPalette());
  $('#paletteTabs').querySelectorAll('[data-pal-tab]').forEach(t=>t.addEventListener('click',()=>{ palTab=t.getAttribute('data-pal-tab'); renderPalette(); }));
  const cv=$('#chatView');
  cv.addEventListener('scroll',()=>{
    const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
    stickToBottom=dist<60;
    updateScrollBtn();
  });
  $('#scrollBottom').addEventListener('click',()=>{ cv.scrollTo({top:cv.scrollHeight, behavior:'smooth'}); stickToBottom=true; updateScrollBtn(); });
  document.addEventListener('click',e=>{ if(suppressMenuClose){ suppressMenuClose=false; return; } if(activeMenu&&!e.target.closest('.menu-pop')) closeMenu(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ if(vmOpen){ closeVoiceMode(); return; } closeAllSheets(); closeMenu(); closeRightPane(); if($('#sidebar').classList.contains('open')) closeSidebarMobile(); } });
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
  checkProductUpdates();
});
