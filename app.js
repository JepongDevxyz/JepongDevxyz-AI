'use strict';
/* JepongDevxyz AI — fresh Qwen-based frontend. Vanilla JS, no build step.
   Backend: POST /api/chat (see BLUEPRINT.md). Local stores only. */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));

const MODELS=[{"provider": "gemini", "id": "gemini-flash-latest", "name": "Gemini Flash Latest", "desc": "Balanced all-around"}, {"provider": "gemini", "id": "gemini-3.8-flash", "name": "Gemini 3.8 Flash", "desc": "Advanced general tasks"}, {"provider": "gemini", "id": "gemini-3.7-flash", "name": "Gemini 3.7 Flash", "desc": "Reasoning"}, {"provider": "gemini", "id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash-Lite", "desc": "Fast/light"}, {"provider": "cloudflare", "id": "@cf/openai/gpt-oss-120b", "name": "GPT-OSS 120B", "desc": "Strong reasoning + coding"}, {"provider": "cloudflare", "id": "@cf/zai-org/glm-4.7-flash", "name": "GLM 4.7 Flash", "desc": "Strong coding + multilingual reasoning"}, {"provider": "cloudflare", "id": "@cf/nvidia/nemotron-3-120b-a12b", "name": "Nemotron 3 Super", "desc": "Agentic reasoning"}, {"provider": "cloudflare", "id": "@cf/qwen/qwen3.8-27b", "name": "Qwen 3.8 27B", "desc": "Vision + reasoning + tools"}, {"provider": "groq", "id": "openai/gpt-oss-120b", "name": "GPT-OSS 120B", "desc": "Strong reasoning + coding"}, {"provider": "groq", "id": "qwen/qwen3.8-27b", "name": "Qwen 3.8 27B", "desc": "Vision + reasoning"}, {"provider": "groq", "id": "groq/compound", "name": "Compound", "desc": "Multi-tool web + code system"}, {"provider": "openrouter", "id": "nvidia/nemotron-3-ultra-550b-a55b:free", "name": "Nemotron 3 Ultra Free", "desc": "1M context · deep reasoning"}, {"provider": "openrouter", "id": "poolside/laguna-s-2.1:free", "name": "Laguna S 2.1 Free", "desc": "Strong coding agent"}, {"provider": "openrouter", "id": "nvidia/nemotron-3-super-120b-a12b:free", "name": "Nemotron 3 Super Free", "desc": "Agentic reasoning"}, {"provider": "mistral", "id": "mistral-small-latest", "name": "Mistral Small Latest", "desc": "General-purpose model"}, {"provider": "mistral", "id": "codestral-latest", "name": "Codestral", "desc": "Coding specialist"}, {"provider": "cohere", "id": "command-a-plus-05-2026", "name": "Command A+", "desc": "Vision + reasoning + agents"}, {"provider": "cohere", "id": "command-a-reasoning-08-2025", "name": "Command A Reasoning", "desc": "Deep reasoning"}, {"provider": "unorouter", "id": "auto", "name": "UnoRouter Auto", "desc": "Best available free-tier route"}, {"provider": "nvidia", "id": "nvidia/nemotron-3-ultra-550b-a55b", "name": "Nemotron 3 Ultra", "desc": "Strong free-tier reasoning"}, {"provider": "nvidia", "id": "nvidia/nemotron-3-super-120b-a12b", "name": "Nemotron 3 Super", "desc": "Strong free-tier agentic reasoning"}, {"provider": "codecraft", "id": "deepseek-v4-pro-max", "name": "DeepSeek V4 Pro Max", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "deepseek-v4-flash-0731", "name": "DeepSeek V4 Flash 0731", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "deepseek-v4-pro-0813", "name": "DeepSeek V4 Pro 0813", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gemma-2-2b", "name": "Gemma 2 2B", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "qwen3.8-max", "name": "Qwen 3.8 Max", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "qwen3.8-27b", "name": "Qwen 3.8 27B", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "qwen3.7-max", "name": "Qwen 3.7 Max", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "glm-5.3", "name": "GLM 5.3", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "glm-5.2", "name": "GLM 5.2", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "muse-spark-1.1", "name": "Muse Spark 1.1", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "seed-2.1-pro", "name": "Seed 2.1 Pro", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "seed-2.1-turbo", "name": "Seed 2.1 Turbo", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gemini-3.6-flash", "name": "Gemini 3.6 Flash", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gemini-3.7-flash", "name": "Gemini 3.7 Flash", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gemini-3.1-pro", "name": "Gemini 3.1 Pro", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "grok-4.5", "name": "Grok 4.5", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "grok-4.6", "name": "Grok 4.6", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "kimi-k3", "name": "Kimi K3", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "kimi-k2.6", "name": "Kimi K2.6", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gpt-5.5", "name": "GPT-5.5", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gpt-5.5-pro", "name": "GPT-5.5 Pro", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gpt-5.6-luna", "name": "GPT-5.6 Luna", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gpt-5.6-terra", "name": "GPT-5.6 Terra", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "gpt-5.6-sol", "name": "GPT-5.6 Sol", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "claude-mythos-preview", "name": "Claude Mythos Preview", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "claude-opus-4.6", "name": "Claude Opus 4.6", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "claude-opus-5.5", "name": "Claude Opus 5.5", "desc": "CodeCraft"}, {"provider": "codecraft", "id": "claude-fable-5.1", "name": "Claude Fable 5.1", "desc": "CodeCraft"}, {"provider": "agentrouter", "id": "deepseek-v4-flash", "name": "DeepSeek V4 Flash", "desc": "AgentRouter"}, {"provider": "hcnsec", "id": "DeepSeek-V4-Flash", "name": "DeepSeek V4 Flash", "desc": "Allowed by API key"}, {"provider": "hcnsec", "id": "DeepSeek-V4.1-Flash", "name": "DeepSeek V4.1 Flash", "desc": "Allowed by API key"}, {"provider": "hcnsec", "id": "glm-5.3-flash", "name": "GLM 5.3 Flash", "desc": "Allowed by API key"}, {"provider": "hcnsec", "id": "sensenova-6.8-flash-lite", "name": "SenseNova 6.8 Flash Lite", "desc": "Allowed by API key"}, {"provider": "hcnsec", "id": "step-3.7-flash", "name": "Step 3.7 Flash", "desc": "Allowed by API key"}, {"provider": "bailucode", "id": "bailu-apex", "name": "BAILU Apex", "desc": "Strongest normal route"}, {"provider": "bailucode", "id": "bailu-2.8-lite", "name": "BAILU 2.8 Lite", "desc": "Light/free route"}, {"provider": "seekai", "id": "deepseek-v4.1-flash", "name": "DeepSeek V4.1 Flash", "desc": "Allowed by SEEKAI key · response subject to live provider access"}, {"provider": "seekai", "id": "glm-5.3-flash", "name": "GLM 5.3 Flash", "desc": "Allowed by SEEKAI key · response subject to live provider access"}, {"provider": "seekai", "id": "mimo-v2.6-flash", "name": "MiMo V2.6 Flash", "desc": "Allowed by SEEKAI key · response subject to live provider access"}, {"provider": "seekai", "id": "deepseek-ai/DeepSeek-V4-Flash-0731", "name": "DeepSeek V4 Flash 0731", "desc": "Allowed by SEEKAI key · response subject to live provider access"}, {"provider": "seekai", "id": "qwen3.8-flash", "name": "Qwen 3.8 Flash", "desc": "Allowed by SEEKAI key · response subject to live provider access"}, {"provider": "seekai", "id": "deepseek-v4-flash", "name": "DeepSeek V4 Flash", "desc": "Allowed by SEEKAI key · response subject to live provider access"}];
const PROVIDER_NAMES={gemini:'Gemini',cloudflare:'Cloudflare',groq:'Groq',openrouter:'OpenRouter',mistral:'Mistral',cohere:'Cohere',unorouter:'UnoRouter',nvidia:'NVIDIA',codecraft:'CodeCraft',agentrouter:'AgentRouter',hcnsec:'HCNSEC',bailucode:'Bailucode',seekai:'SEEKAI'};

const SESS_KEY='jepongQwenReset.sessions.v1', SET_KEY='jepongQwenReset.settings.v1', PROJ_KEY='jepongQwenReset.projects.v1', EXTRA_KEY='jepongQwenReset.extra.v1';
function loadJSON(k,f){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch(e){ return f; } }
function saveJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

const defaultSettings=()=>({
  theme:'system', profileName:'Jepong', profileEmail:'',
  provider:'gemini', model:'gemini-flash-latest', bailuRoute:'',
  responseMode:'Auto', webSearch:false, toolsEnabled:true,
  interface:{titleAuto:true, autoCopy:false, pasteAsFile:true},
  personalization:{nickname:'', about:'', style:'Default', custom:'', enableNew:true, refMemory:true, refHistory:true, savedMemory:''},
  advanced:{webScraping:true, imageSearch:true, webSearchAdv:true, imageGeneration:true, codeInterpreter:true, retrieveMemory:true, imageEditing:true, updateMemory:true, localEnlarge:true},
  cookies:{analytics:false, personalization:true},
  voice:{voiceURI:'', rate:1, pitch:1, voiceMode:false}
});
let settings=Object.assign(defaultSettings(), loadJSON(SET_KEY,{}));
settings.interface=Object.assign(defaultSettings().interface, settings.interface||{});
settings.personalization=Object.assign(defaultSettings().personalization, settings.personalization||{});
settings.advanced=Object.assign(defaultSettings().advanced, settings.advanced||{});
settings.cookies=Object.assign(defaultSettings().cookies, settings.cookies||{});
settings.voice=Object.assign(defaultSettings().voice, settings.voice||{});
let sessions=loadJSON(SESS_KEY,[]); if(!Array.isArray(sessions)) sessions=[];
let projects=loadJSON(PROJ_KEY,[]); if(!Array.isArray(projects)) projects=[];
let extra=loadJSON(EXTRA_KEY,{feedback:[],reports:[]});

let currentId=null, temporary=false, tempSession=null;
let activeProjectId=null;           // project filter / assignment for new chats
let searchQuery='', searchTimer=null;
let manageMode=false; const manageSel=new Set();
let shareMode=false; const shareSel=new Set();
let attachments=[]; let activeTool=null;
let modelsExpanded=false; let settingsSection='General';
let aborter=null, streaming=false, stickBottom=true;
let editingMsgId=null;

const saveSessions=()=>saveJSON(SESS_KEY,sessions);
const saveProjects=()=>saveJSON(PROJ_KEY,projects);
const saveSettings=()=>saveJSON(SET_KEY,settings);
const saveExtra=()=>saveJSON(EXTRA_KEY,extra);
const getSession=id=>sessions.find(s=>s.id===id)||null;
const currentSession=()=> temporary? tempSession : getSession(currentId);
const modelEntry=()=>MODELS.find(m=>m.provider===settings.provider&&m.id===settings.model)||MODELS[0];

/* ---------- theme ---------- */
function resolvedTheme(){ if(settings.theme==='dark') return 'dark'; if(settings.theme==='light') return 'light'; try{ return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'; }catch(e){ return 'light'; } }
function applyTheme(){ document.documentElement.dataset.theme=resolvedTheme(); }
try{ window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(settings.theme==='system') applyTheme(); }); }catch(e){}

/* ---------- toast ---------- */
let toastTimer=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },2600); }

/* ---------- generic modal / context menu ---------- */
function closeModal(){ $('#modalRoot').innerHTML=''; }
function openModal({title='',body='',actions=[],wide=false}={}){
  const root=$('#modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><div class="modal${wide?' wide':''}" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="modal-body"></div><div class="modal-actions"></div></div></div>`;
  const bodyEl=root.querySelector('.modal-body'); if(typeof body==='string') bodyEl.innerHTML=body; else if(body) bodyEl.appendChild(body);
  const actEl=root.querySelector('.modal-actions');
  actions.forEach(a=>{ const b=document.createElement('button'); b.type='button'; b.textContent=a.label; b.className=a.kind==='danger'?'danger-btn':a.kind==='primary'?'primary-btn':'white-pill'; b.addEventListener('click',()=>a.onClick&&a.onClick(b)); actEl.appendChild(b); });
  root.querySelector('.modal-backdrop').addEventListener('mousedown',e=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });
  return {bodyEl, actEl, close:closeModal};
}
function confirmModal(title,text,confirmLabel,onConfirm){
  openModal({title, body:`<p>${esc(text)}</p>`, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:confirmLabel, kind:'danger', onClick:()=>{ closeModal(); onConfirm(); }}
  ]});
}
let ctxEl=null;
function closeCtx(){ if(ctxEl){ ctxEl.remove(); ctxEl=null; } }
function showCtx(x,y,items){
  closeCtx(); ctxEl=document.createElement('div'); ctxEl.className='context-menu'; ctxEl.setAttribute('role','menu');
  items.forEach(it=>{ if(it.sep){ const d=document.createElement('div'); d.className='menu-sep'; ctxEl.appendChild(d); return; }
    const b=document.createElement('button'); b.type='button'; b.innerHTML=`<span>${esc(it.label)}</span>${it.arrow?'<span>›</span>':''}`; if(it.danger) b.className='danger';
    b.addEventListener('click',()=>{ if(!it.keepOpen) closeCtx(); it.onClick&&it.onClick(); }); ctxEl.appendChild(b); });
  document.body.appendChild(ctxEl);
  const r=ctxEl.getBoundingClientRect(); ctxEl.style.left=clamp(x,8,innerWidth-r.width-8)+'px'; ctxEl.style.top=clamp(y,8,innerHeight-r.height-8)+'px';
}
document.addEventListener('click',e=>{ if(ctxEl&&!ctxEl.contains(e.target)) closeCtx(); });

/* ---------- sidebar: sessions / projects / search / manage ---------- */
function dateGroup(ts){
  const now=new Date(), d=new Date(ts);
  const startOfDay=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=(startOfDay(now)-startOfDay(d))/86400000;
  if(diff<=0) return 'Today'; if(diff<7) return 'Previous 7 Days'; return 'Older';
}
function highlight(text,q){
  const t=String(text||''); if(!q) return esc(t);
  const i=t.toLowerCase().indexOf(q.toLowerCase()); if(i<0) return esc(t);
  return esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length));
}
function visibleSessions(){ return sessions.filter(s=>!s.archived&&(!activeProjectId||s.projectId===activeProjectId)); }

function chatRow(s,{archived=false,q=''}={}){
  const row=document.createElement('div'); row.className='chat-row'+(s.id===currentId&&!temporary?' selected':'');
  let inner='';
  if(manageMode&&!archived) inner+=`<input class="manage-check" type="checkbox" ${manageSel.has(s.id)?'checked':''} aria-label="Select chat">`;
  inner+=`<button class="chat-open" type="button">${highlight(s.title,q)}${q&&s._snippet?`<span class="snippet">${highlight(s._snippet,q)}</span>`:''}</button>`;
  if(!manageMode) inner+=`<button class="chat-menu-btn" type="button" aria-label="Chat menu">•••</button>`;
  row.innerHTML=inner;
  const open=()=>{ if(manageMode&&!archived){ toggleManageSel(s.id); } else openSession(s.id); };
  row.querySelector('.chat-open').addEventListener('click',open);
  const chk=row.querySelector('.manage-check'); if(chk) chk.addEventListener('change',()=>toggleManageSel(s.id));
  const mb=row.querySelector('.chat-menu-btn'); if(mb) mb.addEventListener('click',e=>{ e.stopPropagation(); const r=mb.getBoundingClientRect(); showChatMenu(s,r.left-170,r.bottom+4,archived); });
  return row;
}
function renderHistory(){
  const list=$('#historyList'); list.innerHTML='';
  const vis=visibleSessions().slice().sort((a,b)=> (b.pinned-a.pinned) || b.updatedAt-a.updatedAt);
  if(!vis.length){ list.innerHTML='<div class="empty-note">No chats yet</div>'; }
  let lastGroup='';
  vis.forEach(s=>{ const g=s.pinned?'Pinned':dateGroup(s.updatedAt);
    if(g!==lastGroup){ const l=document.createElement('div'); l.className='group-label'; l.textContent=g; list.appendChild(l); lastGroup=g; }
    list.appendChild(chatRow(s)); });
  const arch=$('#archivedList'); arch.innerHTML='';
  const archived=sessions.filter(s=>s.archived).sort((a,b)=>b.updatedAt-a.updatedAt);
  if(!archived.length) arch.innerHTML='<div class="empty-note">No archived chats</div>';
  archived.forEach(s=>arch.appendChild(chatRow(s,{archived:true})));
  renderManageBar();
}
function renderSearch(){
  const box=$('#searchResults'); const q=searchQuery.trim();
  $('#historySections').hidden=!!q; $('#archivedSection').hidden=!!q; box.innerHTML='';
  if(!q) return;
  const hits=sessions.filter(s=>!s.archived).map(s=>{
    const inTitle=s.title.toLowerCase().includes(q.toLowerCase());
    const msg=s.messages.find(m=>m.text&&m.text.toLowerCase().includes(q.toLowerCase()));
    if(!inTitle&&!msg) return null;
    return Object.assign({},s,{_snippet:msg?msg.text.slice(Math.max(0,msg.text.toLowerCase().indexOf(q.toLowerCase())-20), msg.text.toLowerCase().indexOf(q.toLowerCase())+q.length+40):''});
  }).filter(Boolean);
  if(!hits.length){ box.innerHTML='<div class="empty-note">No results</div>'; return; }
  hits.forEach(s=>box.appendChild(chatRow(s,{q})));
}
function renderProjects(){
  const el=$('#projectList'); el.innerHTML='';
  projects.forEach(p=>{
    const row=document.createElement('div'); row.className='project-row'+(p.id===activeProjectId?' selected':'');
    row.innerHTML=`<button class="project-open" type="button">${esc(p.icon||'▣')} ${esc(p.name)}</button><button class="project-menu-btn" type="button" aria-label="Project menu">•••</button>`;
    row.querySelector('.project-open').addEventListener('click',()=>{ activeProjectId=activeProjectId===p.id?null:p.id; renderProjects(); renderAll(); toast(activeProjectId?('Project: '+p.name):'All chats'); });
    row.querySelector('.project-menu-btn').addEventListener('click',e=>{ e.stopPropagation(); const r=e.target.getBoundingClientRect(); showCtx(r.left-160,r.bottom+4,[
      {label:'Rename', onClick:()=>renameProject(p)},
      {label:'New Chat in Project', onClick:()=>{ activeProjectId=p.id; newChat(); }},
      {sep:true},
      {label:'Delete', danger:true, onClick:()=>confirmModal('Delete project?','Chats in this project will stay, unassigned.','Delete',()=>{ sessions.forEach(s=>{ if(s.projectId===p.id) delete s.projectId; }); projects=projects.filter(x=>x.id!==p.id); if(activeProjectId===p.id) activeProjectId=null; saveProjects(); saveSessions(); renderProjects(); renderAll(); })}
    ]); });
    el.appendChild(row);
  });
}
function toggleManageSel(id){ manageSel.has(id)?manageSel.delete(id):manageSel.add(id); renderHistory(); }
function renderManageBar(){
  $('#manageBar').hidden=!manageMode;
  if(manageMode){ $('#manageCount').textContent=`Selected ${manageSel.size}/${visibleSessions().length}`; $('#manageSelectAll').checked=manageSel.size>0&&manageSel.size===visibleSessions().length; }
}
function setManageMode(on){ manageMode=on; manageSel.clear(); $('#externalRows').style.display=on?'none':''; renderHistory(); }
function openSession(id){ currentId=id; temporary=false; tempSession=null; exitShareMode(); renderAll(); }
function newChat(){
  currentId=null; temporary=false; tempSession=null; exitShareMode(); renderAll(); $('#composerInput').focus();
}
function ensureSession(firstText){
  if(temporary){ if(!tempSession) tempSession={id:'temp', title:'Temporary Chat', messages:[], createdAt:Date.now(), updatedAt:Date.now()}; return tempSession; }
  let s=getSession(currentId);
  if(!s){ s={id:uid(), title:settings.interface.titleAuto? (firstText||'New Chat').slice(0,60)||'New Chat':'New Chat', createdAt:Date.now(), updatedAt:Date.now(), pinned:false, archived:false, messages:[]};
    if(activeProjectId) s.projectId=activeProjectId;
    sessions.unshift(s); currentId=s.id; }
  return s;
}

/* ---------- chat "..." menu + actions on sessions ---------- */
function download(name, content, type){
  try{ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); }
  catch(e){ toast('Download is not available here'); }
}
function showChatMenu(s,x,y,archived=false){
  const items=[];
  if(archived){
    items.push({label:'Unarchive', onClick:()=>{ s.archived=false; s.updatedAt=Date.now(); saveSessions(); renderAll(); }});
    items.push({label:'Delete', danger:true, onClick:()=>confirmDeleteSession(s)});
  } else {
    items.push({label:s.pinned?'Unpin':'Pin', onClick:()=>{ s.pinned=!s.pinned; s.updatedAt=Date.now(); saveSessions(); renderAll(); }});
    items.push({label:'Rename', onClick:()=>renameSession(s)});
    items.push({label:'Clone', onClick:()=>{ const c=JSON.parse(JSON.stringify(s)); c.id=uid(); c.title=s.title+' copy'; c.createdAt=Date.now(); c.updatedAt=Date.now(); sessions.unshift(c); saveSessions(); renderAll(); toast('Chat cloned'); }});
    items.push({label:'Archive', onClick:()=>{ s.archived=true; if(currentId===s.id) currentId=null; saveSessions(); renderAll(); }});
    items.push({label:'Share', onClick:()=>{ openSession(s.id); enterShareMode(); }});
    items.push({label:'Select', onClick:()=>{ setManageMode(true); }});
    items.push({label:'Download', arrow:true, onClick:()=>{ openModal({title:'Download chat', body:'<p>Choose a format.</p>', actions:[
      {label:'Export chat (.json)', onClick:()=>{ download(s.title.replace(/[^\w-]+/g,'_')+'.json', JSON.stringify(s,null,2),'application/json'); closeModal(); }},
      {label:'Plain text (.txt)', onClick:()=>{ download(s.title.replace(/[^\w-]+/g,'_')+'.txt', s.messages.map(m=>(m.role==='user'?'You: ':'JepongDevxyz AI: ')+m.text).join('\n\n'),'text/plain'); closeModal(); }},
      {label:'Cancel', onClick:()=>closeModal()} ]}); }});
    items.push({label:'Move to Project', arrow:true, onClick:()=>{ const body=document.createElement('div');
      if(!projects.length) body.innerHTML='<p>No projects yet. Create one from the sidebar first.</p>';
      projects.forEach(p=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=p.name; b.addEventListener('click',()=>{ s.projectId=p.id; saveSessions(); closeModal(); renderAll(); toast('Moved to '+p.name); }); body.appendChild(b); });
      const none=document.createElement('button'); none.type='button'; none.className='chip'; none.textContent='No project'; none.addEventListener('click',()=>{ delete s.projectId; saveSessions(); closeModal(); renderAll(); }); body.appendChild(none);
      openModal({title:'Move to Project', body, actions:[{label:'Cancel', onClick:()=>closeModal()}]}); }});
    items.push({label:'Delete', danger:true, onClick:()=>confirmDeleteSession(s)});
    items.push({sep:true});
    items.push({label:'Report Content', onClick:()=>reportContent(s)});
  }
  showCtx(x,y,items);
}
function confirmDeleteSession(s){
  openModal({title:'Delete chat?', body:`<p>Delete "${esc(s.title)}"? This cannot be undone.</p>`, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Delete', kind:'danger', onClick:()=>{ sessions=sessions.filter(x=>x.id!==s.id); if(currentId===s.id) currentId=null; saveSessions(); closeModal(); renderAll(); }}
  ]});
}
function renameSession(s){
  const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Chat name</label><input class="text-input" id="renameInput" value="${esc(s.title)}" maxlength="120"></div>`;
  openModal({title:'Rename chat', body:wrap, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Save', kind:'primary', onClick:()=>{ const v=wrap.querySelector('#renameInput').value.trim(); if(v){ s.title=v; s.updatedAt=Date.now(); saveSessions(); renderAll(); } closeModal(); }}
  ]});
  setTimeout(()=>{ const i=wrap.querySelector('#renameInput'); i&&i.focus(); i&&i.select(); },30);
}
function renameProject(p){
  const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Project Name</label><input class="text-input" id="renameInput" value="${esc(p.name)}" maxlength="80"></div>`;
  openModal({title:'Rename project', body:wrap, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Save', kind:'primary', onClick:()=>{ const v=wrap.querySelector('#renameInput').value.trim(); if(v){ p.name=v; saveProjects(); renderProjects(); } closeModal(); }}
  ]});
}
function reportContent(s){
  const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Reason</label><textarea class="textarea-input" id="reportText" placeholder="Describe the problem" maxlength="1000"></textarea></div><p class="kbd-note">Reports are stored on this device only — the backend contract has no report endpoint.</p>`;
  openModal({title:'Report Content', body:wrap, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Submit', kind:'primary', onClick:()=>{ const v=wrap.querySelector('#reportText').value.trim(); if(!v){ toast('Add a reason first'); return; } extra.reports.push({chatId:s.id, reason:v, at:Date.now()}); saveExtra(); closeModal(); toast('Report saved on this device'); }}
  ]});
}

/* ---------- New Project dialog (local projects store) ---------- */
function newProjectModal(){
  const cats=['Investment','Homework','Writing','Health','Travel'];
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="icon-choice"><div class="project-icon" id="npIcon">▣</div><div class="chip-row" id="npIcons">${['▣','💼','📚','✍','❤','✈','💡','🎯'].map((i,ix)=>`<button type="button" class="chip${ix===0?' active':''}" data-icon="${i}">${i}</button>`).join('')}</div></div>
    <div class="field"><label>Project Name</label><input class="text-input" id="npName" maxlength="80" placeholder="Project Name"></div>
    <div class="chip-row" id="npCats">${cats.map(c=>`<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}</div>
    <button type="button" class="outline-btn" id="npAdvBtn">Advanced Settings ⌄</button>
    <div id="npAdv" hidden>
      <div class="field"><label>Memory</label><select class="select-input" id="npMemory"><option value="default">Default</option><option value="project-only">Project only</option><option value="off">Off</option></select></div>
      <div class="field"><label>Instructions <span class="counter" id="npCount">0/1000</span></label><textarea class="textarea-input" id="npInstr" maxlength="1000" placeholder="Instructions for this project"></textarea></div>
      <div class="field"><label>Files</label><button type="button" class="outline-btn" id="npFiles">+ Add Files</button> <span id="npFileNames" class="kbd-note"></span><input type="file" id="npFileInput" multiple hidden></div>
    </div>`;
  let icon='▣', cat='', fileNames=[];
  wrap.querySelectorAll('#npIcons .chip').forEach(b=>b.addEventListener('click',()=>{ wrap.querySelectorAll('#npIcons .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); icon=b.dataset.icon; wrap.querySelector('#npIcon').textContent=icon; }));
  wrap.querySelectorAll('#npCats .chip').forEach(b=>b.addEventListener('click',()=>{ cat=cat===b.dataset.cat?'':b.dataset.cat; wrap.querySelectorAll('#npCats .chip').forEach(x=>x.classList.toggle('active',x.dataset.cat===cat)); }));
  wrap.querySelector('#npAdvBtn').addEventListener('click',()=>{ const a=wrap.querySelector('#npAdv'); a.hidden=!a.hidden; });
  wrap.querySelector('#npInstr').addEventListener('input',e=>{ wrap.querySelector('#npCount').textContent=e.target.value.length+'/1000'; });
  wrap.querySelector('#npFiles').addEventListener('click',()=>wrap.querySelector('#npFileInput').click());
  wrap.querySelector('#npFileInput').addEventListener('change',e=>{ fileNames=Array.from(e.target.files).map(f=>f.name); wrap.querySelector('#npFileNames').textContent=fileNames.join(', '); });
  const m=openModal({title:'New Project', body:wrap, wide:true, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Create project', kind:'primary', onClick:()=>{
      const name=wrap.querySelector('#npName').value.trim(); if(!name){ toast('Enter a project name'); return; }
      const p={id:uid(), name, category:cat, icon, memory:wrap.querySelector('#npMemory').value, instructions:wrap.querySelector('#npInstr').value, files:fileNames, createdAt:Date.now()};
      projects.unshift(p); saveProjects(); activeProjectId=p.id; closeModal(); renderProjects(); renderAll(); toast('Project created');
    }}
  ]});
  const nameInput=wrap.querySelector('#npName');
  const createBtn=m.actEl.querySelectorAll('button')[1]; createBtn.disabled=true; createBtn.style.opacity='.5';
  nameInput.addEventListener('input',()=>{ const on=!!nameInput.value.trim(); createBtn.disabled=!on; createBtn.style.opacity=on?'1':'.5'; });
}

/* ---------- Archived Chats modal ---------- */
function archivedModal(){
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="search-wrap" style="margin-bottom:10px"><span class="search-icon">⌕</span><input id="archSearch" type="search" placeholder="Search Chats" style="flex:1;border:0;background:transparent;outline:0"></div><div class="scroll-area" id="archList"></div>`;
  const render=()=>{ const q=wrap.querySelector('#archSearch').value.trim().toLowerCase();
    const list=wrap.querySelector('#archList'); list.innerHTML='';
    const items=sessions.filter(s=>s.archived&&(!q||s.title.toLowerCase().includes(q)));
    if(!items.length){ list.innerHTML='<div class="empty-note" style="text-align:center;padding:34px">No archived tasks</div>'; return; }
    items.forEach(s=>{ const row=document.createElement('div'); row.className='chat-row';
      row.innerHTML=`<button class="chat-open" type="button">${esc(s.title)}</button><button class="white-pill" type="button" data-a="un">Unarchive</button><button class="white-pill" type="button" data-a="del">Delete</button>`;
      row.querySelector('.chat-open').addEventListener('click',()=>{ closeModal(); openSession(s.id); });
      row.querySelector('[data-a="un"]').addEventListener('click',()=>{ s.archived=false; saveSessions(); render(); renderAll(); });
      row.querySelector('[data-a="del"]').addEventListener('click',()=>{ sessions=sessions.filter(x=>x.id!==s.id); saveSessions(); render(); renderAll(); });
      list.appendChild(row); });
  };
  wrap.querySelector('#archSearch').addEventListener('input',render);
  openModal({title:'Archived Chats', body:wrap, wide:true, actions:[{label:'Close', onClick:()=>closeModal()}]});
  render();
}

/* ---------- rich text (safe markdown-lite) ---------- */
function inlineFmt(t){
  return esc(t).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function richText(text){
  const lines=String(text||'').split('\n'); let html='', inCode=false, codeBuf=[], inList=false;
  const closeList=()=>{ if(inList){ html+='</ul>'; inList=false; } };
  const tableCells=line=>{ let t=line.trim(); if(t.startsWith('|')) t=t.slice(1); if(t.endsWith('|')) t=t.slice(0,-1); return t.split('|').map(x=>x.trim()); };
  const isTableSep=line=>{ if(!line.includes('|')) return false; const cells=tableCells(line); return cells.length>0&&cells.every(x=>/^:?-{3,}:?$/.test(x)); };
  for(let idx=0; idx<lines.length; idx++){
    const line=lines[idx];
    if(line.trim().startsWith('```')){ if(inCode){ html+='<pre><code>'+esc(codeBuf.join('\n'))+'</code></pre>'; codeBuf=[]; inCode=false; } else { closeList(); inCode=true; } continue; }
    if(inCode){ codeBuf.push(line); continue; }
    if(line.includes('|')&&idx+1<lines.length&&isTableSep(lines[idx+1])){
      closeList();
      const head=tableCells(line); idx++;
      html+='<table><thead><tr>'+head.map(x=>`<th>${inlineFmt(x)}</th>`).join('')+'</tr></thead><tbody>';
      while(idx+1<lines.length&&lines[idx+1].includes('|')&&lines[idx+1].trim()){ idx++; const cells=tableCells(lines[idx]); html+='<tr>'+head.map((_,ci)=>`<td>${inlineFmt(cells[ci]||'')}</td>`).join('')+'</tr>'; }
      html+='</tbody></table>'; continue;
    }
    const h=line.match(/^(#{1,3})\s+(.*)/); if(h){ closeList(); html+=`<h${h[1].length+2}>${inlineFmt(h[2])}</h${h[1].length+2}>`; continue; }
    const li=line.match(/^\s*[-*]\s+(.*)/); if(li){ if(!inList){ html+='<ul>'; inList=true; } html+=`<li>${inlineFmt(li[1])}</li>`; continue; }
    closeList();
    if(!line.trim()){ html+=''; } else html+=`<p>${inlineFmt(line)}</p>`;
  }
  if(inCode) html+='<pre><code>'+esc(codeBuf.join('\n'))+'</code></pre>';
  closeList(); return html||'<p></p>';
}

/* ---------- messages ---------- */
function scrollChat(){ const sc=$('#chatScroller'); sc.scrollTop=sc.scrollHeight; }
function renderMessages(){
  const s=currentSession();
  const has=s&&s.messages.length>0;
  $('#temporaryBanner').hidden=!(temporary&&!has);
  $('#homeView').hidden=has||temporary;
  $('#messageColumn').hidden=!has;
  $('#disclaimer').hidden=!has;
  $('#currentChatMenuBtn').hidden=!has;
  document.querySelector('.app-frame').classList.toggle('temp-on',temporary);
  // composer placement: home slot when empty home, dock otherwise
  const composer=$('#composer');
  if(!has&&!temporary) $('#homeComposerSlot').appendChild(composer); else $('#dockComposerSlot').appendChild(composer);
  $('#dock').style.display=(!has&&!temporary)?'none':'';
  $('#composerInput').placeholder=(has||temporary)?'How can I help you today?':'How can I help you?';
  const col=$('#messageColumn'); col.innerHTML='';
  document.querySelector('.main-card').classList.toggle('share-mode',shareMode);
  if(!s) return;
  s.messages.forEach(m=>col.appendChild(messageEl(s,m)));
  if(stickBottom) scrollChat();
}
function messageEl(s,m){
  const wrap=document.createElement('div'); wrap.className='message '+m.role; wrap.dataset.mid=m.id;
  if(shareMode){ const cb=document.createElement('input'); cb.type='checkbox'; cb.className='select-box'; cb.checked=shareSel.has(m.id);
    cb.addEventListener('change',()=>{ cb.checked?shareSel.add(m.id):shareSel.delete(m.id); updateShareBar(); }); wrap.appendChild(cb); }
  if(m.role==='user'){
    if(editingMsgId===m.id){
      wrap.innerHTML=`<div class="edit-box"><textarea>${esc(m.text)}</textarea><div class="edit-actions"><button type="button" class="white-pill" data-a="cancel">Cancel</button><button type="button" class="black-pill" data-a="send">Send</button></div></div>`;
      wrap.querySelector('[data-a="cancel"]').addEventListener('click',()=>{ editingMsgId=null; renderMessages(); });
      wrap.querySelector('[data-a="send"]').addEventListener('click',()=>{ const v=wrap.querySelector('textarea').value.trim(); if(!v||streaming) return; const idx=s.messages.findIndex(x=>x.id===m.id); if(idx<0) return; m.text=v; s.messages=s.messages.slice(0,idx+1); s.updatedAt=Date.now(); if(!temporary) saveSessions(); editingMsgId=null; renderAll(); runChatStream(s,m,[]); });
      return wrap;
    }
    const bub=document.createElement('div'); bub.className='user-bubble'; bub.textContent=m.text; wrap.appendChild(bub);
    const acts=document.createElement('div'); acts.className='hover-actions';
    acts.innerHTML=`<button type="button" title="Copy" data-a="copy">⧉</button><button type="button" title="Edit" data-a="edit">✎</button><button type="button" title="Delete" data-a="del">🗑</button>`;
    acts.querySelector('[data-a="copy"]').addEventListener('click',()=>copyText(m.text));
    acts.querySelector('[data-a="edit"]').addEventListener('click',()=>{ editingMsgId=m.id; renderMessages(); });
    acts.querySelector('[data-a="del"]').addEventListener('click',()=>{ s.messages=s.messages.filter(x=>x.id!==m.id); s.updatedAt=Date.now(); if(!temporary) saveSessions(); renderAll(); });
    wrap.appendChild(acts);
    (m.attachments||[]).forEach(a=>{ const c=document.createElement('div'); c.className='file-chip'; c.innerHTML=`<span>${esc(a.name)}</span>`; wrap.appendChild(c); });
    return wrap;
  }
  // assistant
  if(m.activity&&m.activity.length){
    const row=document.createElement('button'); row.type='button'; row.className='activity-row';
    row.innerHTML=`<span class="bulb">💡</span><span>${m.pending?'Working…':'Thinking completed'}</span><span>›</span>`;
    row.addEventListener('click',()=>openDrawer(m)); wrap.appendChild(row);
  }
  const content=document.createElement('div'); content.className='message-content';
  if(m.image){ const img=document.createElement('img'); img.className='generated-image'; img.src=m.image; img.alt='Generated image'; wrap.appendChild(img); }
  content.innerHTML=richText(m.text); wrap.appendChild(content);
  (m.artifacts||[]).forEach(a=>{ const card=document.createElement('div'); card.className='artifact-card';
    card.innerHTML=`<span>▤ ${esc(a.filename||'file')} <small class="kbd-note">${esc(a.label||'')} ${a.size?('· '+a.size+' bytes'):''}</small></span>`;
    const b=document.createElement('button'); b.type='button'; b.className='black-pill'; b.textContent='Download';
    b.addEventListener('click',()=>{ if(a.url){ const l=document.createElement('a'); l.href=a.url; l.target='_blank'; l.click(); }
      else if(a.base64){ try{ const bin=atob(a.base64); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); download(a.filename, bytes, a.mimeType||'application/octet-stream'); }catch(e){ toast('Download failed'); } } });
    card.appendChild(b); wrap.appendChild(card); });
  if(m.pending){ const cur=document.createElement('span'); cur.className='stream-cursor'; cur.innerHTML='<i></i><i></i><i></i>'; content.appendChild(cur); }
  if(!m.pending){
    const row=document.createElement('div'); row.className='action-row';
    row.innerHTML=`
      <button type="button" title="Copy" data-a="copy">⧉</button>
      <button type="button" title="Good Response" data-a="good" class="${m.feedback==='good'?'active':''}">👍</button>
      <button type="button" title="Bad Response" data-a="bad" class="${m.feedback==='bad'?'active':''}">👎</button>
      <button type="button" title="Share" data-a="share">↗</button>
      <button type="button" title="Regenerate" data-a="regen">⟳</button>
      <button type="button" title="More" data-a="more">•••</button>`;
    row.querySelector('[data-a="copy"]').addEventListener('click',()=>copyText(m.text));
    row.querySelector('[data-a="good"]').addEventListener('click',()=>{ m.feedback=m.feedback==='good'?null:'good'; if(!temporary) saveSessions(); renderMessages(); });
    row.querySelector('[data-a="bad"]').addEventListener('click',()=>{ m.feedback=m.feedback==='bad'?null:'bad'; if(!temporary) saveSessions(); renderMessages(); });
    row.querySelector('[data-a="share"]').addEventListener('click',()=>{ shareSel.clear(); shareSel.add(m.id); enterShareMode(); });
    row.querySelector('[data-a="regen"]').addEventListener('click',()=>regenerate(s,m));
    row.querySelector('[data-a="more"]').addEventListener('click',e=>{ e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect(); showCtx(r.left-150,r.bottom+4,[
      {label:'Read aloud', onClick:()=>speak(m.text)},
      {label:'Branch in new chat', onClick:()=>branchChat(s,m)},
      {sep:true},
      {label:'Delete', danger:true, onClick:()=>{ s.messages=s.messages.filter(x=>x.id!==m.id); if(!temporary) saveSessions(); renderAll(); }}
    ]); });
    wrap.appendChild(row);
  }
  return wrap;
}
function assistantContentEl(id){ const el=document.querySelector(`.message.assistant[data-mid="${id}"] .message-content`); return el; }
function paintAssistant(s,m){ const el=assistantContentEl(m.id); if(el){ el.innerHTML=richText(m.text); const cur=document.createElement('span'); cur.className='stream-cursor'; cur.innerHTML='<i></i><i></i><i></i>'; el.appendChild(cur); if(stickBottom) scrollChat(); }
  else renderMessages(); }
function branchChat(s,m){
  const idx=s.messages.findIndex(x=>x.id===m.id);
  const c={id:uid(), title:s.title+' (branch)', createdAt:Date.now(), updatedAt:Date.now(), pinned:false, archived:false, messages:JSON.parse(JSON.stringify(s.messages.slice(0,idx+1)))};
  if(s.projectId) c.projectId=s.projectId;
  sessions.unshift(c); saveSessions(); openSession(c.id); toast('Branched in new chat');
}
function copyText(t){
  const done=()=>toast('Copied');
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t,done)); }
  else fallbackCopy(t,done);
}
function fallbackCopy(t,done){ try{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done&&done(); }catch(e){ toast('Copy is not available here'); } }

/* ---------- share selection mode ---------- */
function enterShareMode(){ shareMode=true; $('#shareBar').hidden=false; renderMessages(); updateShareBar(); }
function exitShareMode(){ if(!shareMode) return; shareMode=false; shareSel.clear(); $('#shareBar').hidden=true; renderMessages(); }
function updateShareBar(){ $('#shareCount').textContent=shareSel.size+' selected'; $('#shareSelectAll').checked=shareSel.size>0&&currentSession()&&shareSel.size===currentSession().messages.length; }

/* ---------- activity drawer ("Thinking and Search") ---------- */
function openDrawer(m){
  const d=$('#activityDrawer'); d.querySelector('h2').textContent='Thinking and Search';
  const list=$('#activityList'); list.innerHTML='';
  (m.activity||[]).forEach(a=>{ const it=document.createElement('div'); it.className='activity-item '+(a.state||'');
    it.innerHTML=`<span class="activity-status">${a.state==='completed'?'✓':a.state==='error'?'!':'…'}</span><div><div>${esc(a.label||a.kind||'Activity')}</div>${a.detail?`<small>${esc(a.detail)}</small>`:''}<small>${a.at?new Date(a.at).toLocaleTimeString():''}</small></div>`;
    list.appendChild(it); });
  if(!list.children.length) list.innerHTML='<p class="kbd-note">No activity recorded for this reply.</p>';
  d.hidden=false;
}

/* ---------- chat request / streaming ---------- */
const EFFORT={Fast:'Instant', Auto:'Medium', Thinking:'High'};
const TOOL_PRESETS={
  'research':{instruction:'Research this using web sources and cite what you use.', web:true},
  'deep-research':{instruction:'Do deep research: compare multiple sources, note disagreements, and structure a thorough report.', web:true},
  'report':{instruction:'Write a polished, well-structured report on this.'},
  'code':{instruction:'Answer as an expert coding assistant with complete, working code.', mode:'coder'},
  'ppt':{instruction:'Create a presentation: produce slide-by-slide content with titles and bullet points, formatted as a downloadable PPT-style document if possible.'},
  'slides':{instruction:'Create slide-by-slide content with titles and concise bullets.'},
  'artifacts':{instruction:'Produce the requested result as a complete downloadable file.'},
  'learn':{instruction:'Teach this step by step with examples and a short check-for-understanding at the end.'},
  'travel':{instruction:'Act as a travel planner: build a practical day-by-day plan with logistics and budget notes.', web:true}
};
function buildPersonalization(){
  const p=settings.personalization, a=settings.advanced;
  let custom=p.custom||'';
  if(p.refMemory&&p.savedMemory) custom+=(custom?'\n':'')+'Saved memory: '+p.savedMemory;
  const proj=activeProjectId?projects.find(x=>x.id===activeProjectId):null;
  if(proj&&proj.instructions) custom+=(custom?'\n':'')+'Project instructions: '+proj.instructions;
  return { nickname:p.nickname, moreAbout:p.about, customInstructions:p.enableNew?custom:'', baseStyle:p.style,
    advancedWebScraping:a.webScraping, advancedImageSearch:a.imageSearch, advancedWebSearch:a.webSearchAdv,
    advancedImageGeneration:a.imageGeneration, advancedCodeInterpreter:a.codeInterpreter, advancedRetrieveMemory:a.retrieveMemory,
    advancedImageEditing:a.imageEditing, advancedUpdateMemory:a.updateMemory, advancedLocalEnlarge:a.localEnlarge };
}
function historyFor(s, uptoId){
  if(!settings.personalization.refHistory) return [];
  const msgs=uptoId? s.messages.slice(0, s.messages.findIndex(m=>m.id===uptoId)) : s.messages;
  return msgs.filter(m=>!m.pending).map(m=>({role:m.role==='assistant'?'bot':'user', text:m.text}));
}
async function sendCurrent(presetText){
  const input=$('#composerInput'); const text=(presetText!==undefined?presetText:input.value).trim();
  if(streaming) return;
  if(activeTool==='video'){ openModal({title:'Generative Video', body:'<p>There is no video-generation endpoint in the /api/chat backend contract, so a video cannot be generated from this frontend yet.</p>', actions:[{label:'OK', kind:'primary', onClick:()=>closeModal()}]}); return; }
  if(!text&&!attachments.length) return;
  const s=ensureSession(text);
  const userMsg={id:uid(), role:'user', text, createdAt:Date.now(), attachments:attachments.map(a=>({name:a.name, kind:a.kind}))};
  const filePayload=attachments.slice();
  s.messages.push(userMsg); s.updatedAt=Date.now(); if(!temporary) saveSessions();
  attachments=[]; renderAttachments();
  if(presetText===undefined){ input.value=''; autosize(); updateSend(); }
  activeToolConsumed();
  renderAll();
  if(activeToolLast==='image'){ await runImageGeneration(s,userMsg); return; }
  await runChatStream(s,userMsg,filePayload);
}
let activeToolLast=null;
function activeToolConsumed(){ activeToolLast=activeTool; if(activeTool&&activeTool!=='image') { /* keep tool until changed */ } }
function setStreaming(on){ streaming=on; $('#stopBtn').hidden=!on; $('#sendBtn').hidden=on; }
async function runChatStream(s,userMsg,filePayload){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true};
  s.messages.push(asst); renderMessages();
  setStreaming(true); aborter=('AbortController' in window)?new AbortController():null;
  const preset=TOOL_PRESETS[activeToolLast]||{};
  const web=!!(settings.webSearch||preset.web||activeToolLast==='research'||activeToolLast==='deep-research')&&settings.advanced.webSearchAdv;
  const body={ message:userMsg.text, history:historyFor(s,userMsg.id), files:filePayload||[],
    provider:settings.provider, model:settings.model, mode:preset.mode||'general',
    customPrompt:preset.instruction||'', webSearch:web, forceWebSearch:!!preset.web,
    autoFallback:true, smartRouter:false, activityStream:true, autoTools:settings.toolsEnabled,
    clientTimeZone:(Intl&&Intl.DateTimeFormat&&Intl.DateTimeFormat().resolvedOptions().timeZone)||'Asia/Manila',
    clientUtcOffsetMinutes:-new Date().getTimezoneOffset(),
    personalization:Object.assign(buildPersonalization(),{intelligence:EFFORT[settings.responseMode]||'Medium', fastAnswers:settings.responseMode==='Fast', advancedWebSearch:web}) };
  if(settings.provider==='bailucode'&&settings.bailuRoute) body.bailuRoute=settings.bailuRoute;
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
    }
  }catch(err){
    if(err&&err.name==='AbortError'){ asst.text+=(asst.text?'\n\n':'')+'_Stopped._'; }
    else { asst.text=(asst.text?asst.text+'\n\n':'')+'⚠ '+(err&&err.message?err.message:'Something went wrong.'); asst.activity.push({label:'Request failed', state:'error', detail:String(err&&err.message||err), at:Date.now()}); }
  }finally{
    asst.pending=false; s.updatedAt=Date.now(); if(!temporary) saveSessions();
    setStreaming(false); renderAll();
    if(settings.voice.voiceMode&&asst.text) speak(asst.text);
    if(settings.interface.autoCopy&&asst.text) copyText(asst.text);
  }
}
async function readSSE(reader,s,asst){
  const decoder=('TextDecoder' in window)?new TextDecoder():null;
  let buf='';
  const handleBlock=block=>{
    let ev='message', data='';
    block.split('\n').forEach(line=>{ if(line.startsWith(':')) return; if(line.startsWith('event:')) ev=line.slice(6).trim(); else if(line.startsWith('data:')) data+=line.slice(5).trim(); });
    if(!data) return; let obj=null; try{ obj=JSON.parse(data); }catch(e){}
    if(ev==='text'&&obj&&typeof obj.text==='string'){ asst.text+=obj.text; paintAssistant(s,asst); }
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
async function runImageGeneration(s,userMsg){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true};
  s.messages.push(asst); renderMessages(); setStreaming(true);
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'generate-image', prompt:userMsg.text, model:'auto'})});
    const data=await res.json().catch(()=>({}));
    if(data&&data.imageDataUrl){ asst.image=data.imageDataUrl; asst.text='Here is your image.'; }
    else throw new Error((data&&(data.error||data.detail))||'Image generation failed');
  }catch(err){ asst.text='⚠ '+(err&&err.message?err.message:'Image generation failed.'); }
  asst.pending=false; s.updatedAt=Date.now(); if(!temporary) saveSessions(); setStreaming(false); renderAll();
}
function regenerate(s,m){
  if(streaming) return;
  const idx=s.messages.findIndex(x=>x.id===m.id); if(idx<0) return;
  const userMsg=[...s.messages.slice(0,idx)].reverse().find(x=>x.role==='user'); if(!userMsg) return;
  s.messages=s.messages.slice(0,idx); if(!temporary) saveSessions(); renderAll();
  runChatStream(s,userMsg,[]);
}

/* ---------- attachments ---------- */
function renderAttachments(){
  const box=$('#attachmentChips'); box.innerHTML=''; box.hidden=!attachments.length;
  attachments.forEach((a,i)=>{ const c=document.createElement('span'); c.className='file-chip'; c.innerHTML=`<span>${esc(a.name)}</span>`;
    const b=document.createElement('button'); b.type='button'; b.textContent='×'; b.setAttribute('aria-label','Remove attachment');
    b.addEventListener('click',()=>{ attachments.splice(i,1); renderAttachments(); updateSend(); }); c.appendChild(b); box.appendChild(c); });
}
function readFileAs(file){
  return new Promise(resolve=>{
    const kind=(file.type.split('/')[0]||'file');
    const base={name:file.name, mimeType:file.type||'application/octet-stream', kind:file.type||kind, size:file.size};
    const reader=new FileReader();
    if(file.type.startsWith('image/')){ reader.onload=()=>resolve(Object.assign(base,{data:reader.result})); reader.onerror=()=>resolve(base); reader.readAsDataURL(file); }
    else if(file.type.startsWith('text/')||/\.(txt|md|json|csv|js|html|css)$/i.test(file.name)){ reader.onload=()=>resolve(Object.assign(base,{extractedText:String(reader.result).slice(0,200000)})); reader.onerror=()=>resolve(base); reader.readAsText(file); }
    else resolve(base);
  });
}
async function addFiles(fileList){ for(const f of Array.from(fileList||[])){ attachments.push(await readFileAs(f)); } renderAttachments(); updateSend(); }

/* ---------- voice ---------- */
function speak(text){
  try{
    if(!('speechSynthesis' in window)){ toast('Speech is not available in this browser'); return; }
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(String(text).replace(/[#*_`>]/g,'').slice(0,1200));
    const v=speechSynthesis.getVoices().find(x=>x.voiceURI===settings.voice.voiceURI); if(v) u.voice=v;
    u.rate=settings.voice.rate||1; u.pitch=settings.voice.pitch||1; speechSynthesis.speak(u);
  }catch(e){ toast('Speech is not available in this browser'); }
}
let recog=null;
function toggleMic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('Voice input is not available in this browser'); return; }
  if(recog){ try{ recog.stop(); }catch(e){} recog=null; return; }
  recog=new SR(); recog.lang='en-US'; recog.interimResults=true;
  recog.onresult=e=>{ let t=''; for(const r of e.results) t+=r[0].transcript; const inp=$('#composerInput'); inp.value=t; autosize(); updateSend(); };
  recog.onend=()=>{ recog=null; };
  try{ recog.start(); toast('Listening…'); }catch(e){ recog=null; }
}

/* ---------- model picker ---------- */
function renderModelPanel(){
  const list=$('#modelList'); const q=($('#modelSearch').value||'').toLowerCase();
  const cur=modelEntry(); $('#selectedModelName').textContent=cur.name;
  $('#modelCount').textContent=MODELS.length+' models';
  const filtered=MODELS.filter(m=>!q||m.name.toLowerCase().includes(q)||m.id.toLowerCase().includes(q)||m.provider.includes(q));
  const shown=modelsExpanded?filtered:filtered.slice(0,3);
  list.innerHTML=''; let lastProv='';
  shown.forEach(m=>{ if(m.provider!==lastProv){ const g=document.createElement('div'); g.className='model-group'; g.textContent=PROVIDER_NAMES[m.provider]||m.provider; list.appendChild(g); lastProv=m.provider; }
    const b=document.createElement('button'); b.type='button'; b.className='model-option'+(m.provider===settings.provider&&m.id===settings.model?' selected':'');
    b.innerHTML=`<span class="model-dot">${esc((PROVIDER_NAMES[m.provider]||m.provider).slice(0,2).toUpperCase())}</span><span class="model-copy"><strong>${esc(m.name)}</strong><small>${esc(m.desc)}</small></span><span class="check">✓</span>`;
    b.addEventListener('click',()=>{ settings.provider=m.provider; settings.model=m.id; if(m.provider!=='bailucode') settings.bailuRoute=''; saveSettings(); renderModelPanel(); toast('Model: '+m.name); });
    list.appendChild(b); });
  if(!shown.length) list.innerHTML='<div class="empty-note">No models match</div>';
  $('#expandModelsBtn').style.display=(!modelsExpanded&&filtered.length>3)?'':'none';
  const cmp=$('#modelCompareToggle'); cmp.setAttribute('aria-checked','false'); cmp.disabled=true; cmp.title='Model Comparison is unavailable in the backend contract';
  // Bailu route row (real contract field) when a Bailu model is selected
  if(settings.provider==='bailucode'){
    const row=document.createElement('div'); row.className='field'; row.innerHTML='<label>Bailu route</label>';
    const sel=document.createElement('select'); sel.className='select-input';
    [['','Auto route'],['normal','Normal'],['anthropic','Anthropic']].forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); });
    sel.value=settings.bailuRoute||''; sel.addEventListener('change',()=>{ settings.bailuRoute=sel.value; saveSettings(); });
    row.appendChild(sel); list.appendChild(row);
  }
}

/* ---------- settings page ---------- */
const SECTIONS=['General','Usage & Billing','Interface','Models','Chats','Personalization','Account','About'];
function openSettings(section){ settingsSection=section||settingsSection||'General'; $('#settingsPage').hidden=false; renderSettings(); }
function closeSettings(){ $('#settingsPage').hidden=true; }
function renderSettings(){
  const nav=$('#settingsNav'); nav.innerHTML='';
  SECTIONS.forEach(name=>{ const b=document.createElement('button'); b.type='button'; b.textContent=name; b.className=name===settingsSection?'active':'';
    b.addEventListener('click',()=>{ settingsSection=name; renderSettings(); }); nav.appendChild(b); });
  const c=$('#settingsContent'); c.innerHTML='';
  ({General:secGeneral,'Usage & Billing':secUsage,Interface:secInterface,Models:secModels,Chats:secChats,Personalization:secPersonalization,Account:secAccount,About:secAbout}[settingsSection]||secGeneral)(c);
  $('#profileName').textContent=settings.profileName||'Jepong';
  $('#profileAvatar').textContent=(settings.profileName||'J').trim().charAt(0).toUpperCase()||'J';
  $('#profileMenuHeader').textContent=settings.profileEmail||settings.profileName||'Local profile';
}
function el(html){ const d=document.createElement('div'); d.innerHTML=html; return d; }
function rowEl(title,desc,control){
  const r=document.createElement('div'); r.className='setting-row';
  r.innerHTML=`<div class="copy"><strong>${esc(title)}</strong>${desc?`<p>${esc(desc)}</p>`:''}</div>`; if(control) r.appendChild(control); return r;
}
function switchEl(val,onChange,label){
  const b=document.createElement('button'); b.type='button'; b.className='switch'; b.setAttribute('role','switch'); b.setAttribute('aria-checked',String(!!val)); if(label) b.setAttribute('aria-label',label);
  b.addEventListener('click',()=>{ const v=b.getAttribute('aria-checked')!=='true'; b.setAttribute('aria-checked',String(v)); onChange(v); });
  return b;
}
function h2(t){ const h=document.createElement('h2'); h.textContent=t; return h; }

function secGeneral(c){
  c.appendChild(h2('General'));
  const seg=document.createElement('div'); seg.className='segmented';
  ['System','Light','Dark'].forEach(t=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.className=settings.theme===t.toLowerCase()?'active':''; b.addEventListener('click',()=>{ settings.theme=t.toLowerCase(); saveSettings(); applyTheme(); renderSettings(); }); seg.appendChild(b); });
  c.appendChild(rowEl('Theme','Applies instantly and is saved on this device.',seg));
  const voiceBtn=document.createElement('button'); voiceBtn.type='button'; voiceBtn.className='outline-btn'; voiceBtn.textContent='Voice ›';
  const panel=document.createElement('div');
  voiceBtn.addEventListener('click',()=>{ panel.innerHTML='';
    const vp=document.createElement('div'); vp.className='voice-panel';
    vp.innerHTML='<strong>Voice</strong><p class="kbd-note">Used by Read aloud and Voice mode. Voices come from this device/browser.</p>';
    const sel=document.createElement('select'); sel.className='select-input'; sel.setAttribute('aria-label','Voice');
    const fill=()=>{ sel.innerHTML=''; const vs=('speechSynthesis' in window)?speechSynthesis.getVoices():[];
      const def=document.createElement('option'); def.value=''; def.textContent='Device default'; sel.appendChild(def);
      vs.forEach(v=>{ const o=document.createElement('option'); o.value=v.voiceURI; o.textContent=v.name+' ('+v.lang+')'; sel.appendChild(o); }); sel.value=settings.voice.voiceURI||''; };
    fill(); if('speechSynthesis' in window) speechSynthesis.onvoiceschanged=fill;
    sel.addEventListener('change',()=>{ settings.voice.voiceURI=sel.value; saveSettings(); });
    vp.appendChild(sel);
    [['Rate','rate',0.5,2],['Pitch','pitch',0,2]].forEach(([label,key,min,max])=>{ const f=document.createElement('div'); f.className='field';
      f.innerHTML=`<label>${label} <span>${settings.voice[key]}</span></label>`; const r=document.createElement('input'); r.type='range'; r.min=min; r.max=max; r.step='0.1'; r.value=settings.voice[key]; r.style.width='100%';
      r.addEventListener('input',()=>{ settings.voice[key]=parseFloat(r.value); saveSettings(); f.querySelector('span').textContent=r.value; }); f.appendChild(r); vp.appendChild(f); });
    const test=document.createElement('button'); test.type='button'; test.className='black-pill'; test.textContent='Test voice'; test.addEventListener('click',()=>speak('Hello, this is JepongDevxyz AI.')); vp.appendChild(test);
    const vmRow=rowEl('Voice mode','Read new replies aloud automatically.',switchEl(settings.voice.voiceMode,v=>{ settings.voice.voiceMode=v; saveSettings(); syncVoiceBtn(); })); vp.appendChild(vmRow);
    panel.appendChild(vp); });
  c.appendChild(rowEl('Voice','Choose the voice used for Read aloud.',voiceBtn));
  c.appendChild(panel);
}
function secUsage(c){
  c.appendChild(h2('Usage & Billing'));
  const totalMsgs=sessions.reduce((n,s)=>n+s.messages.length,0);
  const chars=sessions.reduce((n,s)=>n+s.messages.reduce((a,m)=>a+(m.text||'').length,0),0);
  const grid=document.createElement('div'); grid.className='usage-grid';
  grid.innerHTML=`<div class="usage-card"><strong>Free</strong><span>Current plan (local profile)</span></div><div class="usage-card"><strong>${sessions.length}</strong><span>Chats on this device</span></div><div class="usage-card"><strong>${totalMsgs}</strong><span>Messages · ~${Math.round(chars/4)} tokens of text</span></div>`;
  c.appendChild(grid);
  const up=document.createElement('button'); up.type='button'; up.className='primary-btn'; up.textContent='Upgrade'; up.style.marginTop='14px'; up.addEventListener('click',openUpgrade); c.appendChild(up);
  const tabs=document.createElement('div'); tabs.className='segmented'; tabs.style.marginTop='22px';
  const area=document.createElement('div');
  const draw=async(which)=>{
    area.innerHTML='';
    if(which==='Agent usage'){
      const b=document.createElement('button'); b.type='button'; b.className='outline-btn'; b.textContent='Refresh provider status'; area.appendChild(b);
      const pre=document.createElement('pre'); pre.className='kbd-note'; pre.style.whiteSpace='pre-wrap'; area.appendChild(pre);
      const load=async()=>{ pre.textContent='Loading…'; try{ const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'provider-status'})}); const d=await r.json(); pre.textContent=JSON.stringify(d,null,2).slice(0,4000); }catch(e){ pre.textContent='Provider status unavailable: '+(e&&e.message||e); } };
      b.addEventListener('click',load); load();
    } else area.innerHTML='<p class="kbd-note" style="margin-top:14px">No video credits — this backend has no video-credit system. Generative Video is listed as a gap in the build report.</p>';
  };
  ['Agent usage','Video credits'].forEach((t,i)=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.className=i===0?'active':''; b.addEventListener('click',()=>{ tabs.querySelectorAll('button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); draw(t); }); tabs.appendChild(b); });
  c.appendChild(tabs); c.appendChild(area); draw('Agent usage');
}
function openUpgrade(){
  const plans=[['Free','$0','Current plan on this device',true],['Lite','$4/mo','For light everyday use',false],['Plus','$19/mo','Recommended',false],['Pro','$99/mo','For heavy use',false]];
  const wrap=document.createElement('div'); wrap.className='usage-grid';
  plans.forEach(([name,price,note,cur])=>{ const card=document.createElement('div'); card.className='usage-card';
    card.innerHTML=`<strong>${esc(name)}</strong><span>${esc(price)} · ${esc(note)}</span>`;
    const b=document.createElement('button'); b.type='button'; b.className=cur?'white-pill':'primary-btn'; b.textContent=cur?'Current plan':'Upgrade'; b.style.marginTop='10px';
    b.addEventListener('click',()=>{ if(cur){ toast('You are on the Free plan'); return; }
      openModal({title:'Upgrade to '+name, body:'<p>Checkout is not available in this frontend: the backend exposes no billing or PayMongo contract a fresh frontend can call. Nothing was charged.</p>', actions:[{label:'OK', kind:'primary', onClick:()=>closeModal()}]}); });
    card.appendChild(b); wrap.appendChild(card); });
  openModal({title:'Upgrade', body:wrap, wide:true, actions:[{label:'Close', onClick:()=>closeModal()}]});
}
function secInterface(c){
  c.appendChild(h2('Interface'));
  const I=settings.interface;
  c.appendChild(rowEl('Title Auto-Generation','Name new chats from the first message.',switchEl(I.titleAuto,v=>{ I.titleAuto=v; saveSettings(); })));
  c.appendChild(rowEl('Auto-Copy Response','Copy each completed reply to the clipboard.',switchEl(I.autoCopy,v=>{ I.autoCopy=v; saveSettings(); })));
  c.appendChild(rowEl('Paste Large Text as File','Attach pasted text over 2,000 characters as a file instead of a message.',switchEl(I.pasteAsFile,v=>{ I.pasteAsFile=v; saveSettings(); })));
}
function secModels(c){
  c.appendChild(h2('Models'));
  c.appendChild(el('<p class="kbd-note">The real models available to JepongDevxyz AI. Picking one here also selects it in the chat model picker.</p>'));
  const providers=[...new Set(MODELS.map(m=>m.provider))];
  providers.forEach(pv=>{ const acc=document.createElement('div'); acc.className='accordion';
    const head=document.createElement('button'); head.type='button'; head.className='accordion-head'; head.innerHTML=`<span>${esc(PROVIDER_NAMES[pv]||pv)}</span><span>⌄</span>`;
    const body=document.createElement('div'); body.className='accordion-body'; body.hidden=true;
    MODELS.filter(m=>m.provider===pv).forEach(m=>{ const r=document.createElement('div'); r.className='meta-card'; r.style.marginTop='8px';
      r.innerHTML=`<strong>${esc(m.name)}</strong><div>${esc(m.desc)}</div><div class="kbd-note">${esc(m.id)}</div>`;
      const b=document.createElement('button'); b.type='button'; b.className='outline-btn'; b.textContent=(settings.provider===pv&&settings.model===m.id)?'Selected':'Use in chat'; b.style.marginTop='8px';
      b.addEventListener('click',()=>{ settings.provider=pv; settings.model=m.id; saveSettings(); renderModelPanel(); renderSettings(); }); r.appendChild(b); body.appendChild(r); });
    head.addEventListener('click',()=>{ body.hidden=!body.hidden; });
    acc.appendChild(head); acc.appendChild(body); c.appendChild(acc); });
}
function secChats(c){
  c.appendChild(h2('Chats'));
  const mk=(label,desc,btnLabel,danger,fn)=>{ const b=document.createElement('button'); b.type='button'; b.className=danger?'danger-btn':'outline-btn'; b.textContent=btnLabel; b.addEventListener('click',fn); c.appendChild(rowEl(label,desc,b)); };
  mk('Import Chats','Load chats from a JSON export file.','Import',false,()=>$('#importInput').click());
  mk('Export Chats','Download all chats on this device as JSON.','Export',false,()=>{ download('jepongdevxyz-chats.json', JSON.stringify(sessions,null,2),'application/json'); toast('Chats exported'); });
  mk('Archived Chats','View and restore archived chats.','Open',false,()=>archivedModal());
  mk('Archive All Chats','Move every chat to Archived.','Archive All',false,()=>confirmModal('Archive all chats?','Every chat on this device will be archived.','Archive All',()=>{ sessions.forEach(s=>s.archived=true); currentId=null; saveSessions(); renderAll(); toast('All chats archived'); }));
  mk('Delete All Chats','Permanently delete every chat on this device.','Delete All',true,()=>confirmModal('Delete all chats?','This permanently deletes every chat stored on this device.','Delete All',()=>{ sessions=[]; currentId=null; saveSessions(); renderAll(); toast('All chats deleted'); }));
}
function secPersonalization(c){
  c.appendChild(h2('Personalization'));
  const P=settings.personalization, A=settings.advanced;
  const memBtn=document.createElement('button'); memBtn.type='button'; memBtn.className='outline-btn'; memBtn.textContent='Manage';
  memBtn.addEventListener('click',()=>{ const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Saved Memory</label><textarea class="textarea-input" id="smText" placeholder="Facts the assistant should remember">${esc(P.savedMemory)}</textarea></div>`;
    openModal({title:'Saved Memory', body:wrap, actions:[{label:'Cancel', onClick:()=>closeModal()},{label:'Save', kind:'primary', onClick:()=>{ P.savedMemory=wrap.querySelector('#smText').value; saveSettings(); closeModal(); toast('Memory saved'); }}]}); });
  c.appendChild(rowEl('Saved Memory','Facts you ask JepongDevxyz AI to remember, sent with new requests.',memBtn));
  c.appendChild(rowEl('Reference saved memories','Include saved memory in chat requests.',switchEl(P.refMemory,v=>{ P.refMemory=v; saveSettings(); })));
  c.appendChild(rowEl('Reference chat history','Send previous messages in this chat as context.',switchEl(P.refHistory,v=>{ P.refHistory=v; saveSettings(); })));
  const custBtn=document.createElement('button'); custBtn.type='button'; custBtn.className='outline-btn'; custBtn.textContent='Customize';
  custBtn.addEventListener('click',()=>customizeModal());
  c.appendChild(rowEl('Customize','Nickname, about you, response style and custom instructions — sent to the backend as personalization.',custBtn));
  const ckBtn=document.createElement('button'); ckBtn.type='button'; ckBtn.className='outline-btn'; ckBtn.textContent='Manage Cookies';
  ckBtn.addEventListener('click',()=>{ const wrap=document.createElement('div');
    wrap.appendChild(rowEl('Analytics cookies','Anonymous usage measurement on this device.',switchEl(settings.cookies.analytics,v=>{ settings.cookies.analytics=v; saveSettings(); })));
    wrap.appendChild(rowEl('Personalization cookies','Remember personalization choices on this device.',switchEl(settings.cookies.personalization,v=>{ settings.cookies.personalization=v; saveSettings(); })));
    openModal({title:'Manage Cookies', body:wrap, actions:[{label:'Done', kind:'primary', onClick:()=>closeModal()}]}); });
  c.appendChild(rowEl('Manage Cookies','Control optional cookies stored by this frontend.',ckBtn));
  const advHead=document.createElement('button'); advHead.type='button'; advHead.className='accordion-head'; advHead.innerHTML='<span>Advanced</span><span>⌄</span>';
  const advBody=document.createElement('div'); advBody.hidden=true;
  [['Web Scraping','webScraping'],['Image search','imageSearch'],['Web search','webSearchAdv'],['Image generation','imageGeneration'],['Code Interpreter','codeInterpreter'],['Retrieve historical memory','retrieveMemory'],['Image editing','imageEditing'],['Update memory','updateMemory'],['Local image enlargement','localEnlarge']].forEach(([label,key])=>{
    advBody.appendChild(rowEl(label,'',switchEl(A[key],v=>{ A[key]=v; saveSettings(); if(key==='imageGeneration') syncToolsAvailability(); }))); });
  advHead.addEventListener('click',()=>{ advBody.hidden=!advBody.hidden; });
  const acc=document.createElement('div'); acc.className='accordion'; acc.appendChild(advHead); acc.appendChild(advBody); c.appendChild(acc);
}
function customizeModal(){
  const P=settings.personalization;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="field"><label>Nickname <span class="counter" id="czNickCount">${P.nickname.length}/128</span></label><input class="text-input" id="czNick" maxlength="128" value="${esc(P.nickname)}"></div>
    <div class="field"><label>About you <span class="counter" id="czAboutCount">${P.about.length}/500</span></label><textarea class="textarea-input" id="czAbout" maxlength="500">${esc(P.about)}</textarea></div>
    <div class="style-grid" id="czStyles">${[['Default','Balanced responses'],['Concise','Short and direct'],['Socratic','Guides with questions'],['Formal','Professional tone']].map(([n,d])=>`<button type="button" class="style-card${P.style===n?' active':''}" data-style="${n}"><strong>${n}</strong><span>${d}</span></button>`).join('')}</div>
    <div class="field"><label>Custom instruction <span class="counter" id="czCustomCount">${P.custom.length}/40960</span></label><textarea class="textarea-input" id="czCustom" maxlength="40960">${esc(P.custom)}</textarea></div>`;
  const enRow=rowEl('Enable in new chat','Apply this customization to new chats.',switchEl(P.enableNew,v=>{ P.enableNew=v; saveSettings(); }));
  wrap.appendChild(enRow);
  let style=P.style;
  wrap.querySelectorAll('#czStyles .style-card').forEach(b=>b.addEventListener('click',()=>{ style=b.dataset.style; wrap.querySelectorAll('#czStyles .style-card').forEach(x=>x.classList.toggle('active',x===b)); }));
  [['#czNick','#czNickCount',128],['#czAbout','#czAboutCount',500],['#czCustom','#czCustomCount',40960]].forEach(([i,ct,max])=>{ wrap.querySelector(i).addEventListener('input',e=>{ wrap.querySelector(ct).textContent=e.target.value.length+'/'+max; }); });
  openModal({title:'Customize', body:wrap, wide:true, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Save', kind:'primary', onClick:()=>{ P.nickname=wrap.querySelector('#czNick').value; P.about=wrap.querySelector('#czAbout').value; P.custom=wrap.querySelector('#czCustom').value; P.style=style; saveSettings(); closeModal(); toast('Customization saved'); }}
  ]});
}
function secAccount(c){
  c.appendChild(h2('Account'));
  const card=document.createElement('div'); card.className='usage-card';
  card.innerHTML=`<strong>${esc(settings.profileName||'Jepong')}</strong><span>${esc(settings.profileEmail||'Local profile — no account sign-in in this frontend')}</span>`;
  c.appendChild(card);
  const edit=document.createElement('button'); edit.type='button'; edit.className='outline-btn'; edit.textContent='Edit account'; edit.style.marginTop='12px';
  edit.addEventListener('click',()=>{ const wrap=document.createElement('div');
    wrap.innerHTML=`<div class="field"><label>Display name</label><input class="text-input" id="acName" value="${esc(settings.profileName)}" maxlength="60"></div><div class="field"><label>Email</label><input class="text-input" id="acEmail" type="email" value="${esc(settings.profileEmail)}" maxlength="120"></div>`;
    openModal({title:'Edit account', body:wrap, actions:[{label:'Cancel', onClick:()=>closeModal()},{label:'Save', kind:'primary', onClick:()=>{ settings.profileName=wrap.querySelector('#acName').value.trim()||'Jepong'; settings.profileEmail=wrap.querySelector('#acEmail').value.trim(); saveSettings(); closeModal(); renderSettings(); renderAll(); toast('Account saved'); }}]}); });
  c.appendChild(edit);
  const del=document.createElement('button'); del.type='button'; del.className='danger-btn'; del.textContent='Delete Account'; del.style.marginTop='22px';
  del.addEventListener('click',()=>confirmModal('Delete account?','This deletes the local profile and ALL data stored by this frontend on this device.','Delete',()=>{ localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY); sessions=[]; projects=[]; settings=defaultSettings(); saveSettings(); applyTheme(); currentId=null; closeSettings(); renderAll(); toast('All local data deleted'); }));
  c.appendChild(rowEl('Delete Account','Remove the local profile and all locally stored data.',del));
}
function secAbout(c){
  c.appendChild(h2('About'));
  c.appendChild(el(`<div class="setting-row"><div class="copy"><strong>JepongDevxyz AI</strong><p>Version 1.0.0</p></div></div>
    <p>JepongDevxyz AI is an AI assistant that helps you research, write, code, and create — with streamed answers, file attachments, and tools for research, images, and documents.</p>
    <p>Chats in this frontend are stored on this device. Replies are generated by the model providers configured on the JepongDevxyz AI backend.</p>
    <p>Created by Jay-Ar Lee Espiritu.</p>`));
  const sug=document.createElement('button'); sug.type='button'; sug.className='outline-btn'; sug.textContent='Suggestions';
  sug.addEventListener('click',()=>{ const cats=['Model Quality','Response Speed','Feature Request','UI / Design','Bug / Issue','Other']; let cat='';
    const wrap=document.createElement('div');
    wrap.innerHTML=`<div class="field"><label>* What would you like to suggest?</label><div class="chip-row" id="sgCats">${cats.map(x=>`<button type="button" class="chip" data-cat="${x}">${x}</button>`).join('')}</div></div>
      <div class="field"><label>Tell us more <span class="counter" id="sgCount">0/1000</span></label><textarea class="textarea-input" id="sgText" maxlength="1000" placeholder="Tell us more details"></textarea></div>
      <div class="field"><label>Attach image</label><button type="button" class="outline-btn" id="sgImg">+</button> <span class="kbd-note" id="sgImgName"></span><input type="file" id="sgFile" accept="image/*" hidden></div>
      <p class="kbd-note">Suggestions are saved on this device — the backend contract has no feedback endpoint.</p>`;
    wrap.querySelectorAll('#sgCats .chip').forEach(b=>b.addEventListener('click',()=>{ cat=b.dataset.cat; wrap.querySelectorAll('#sgCats .chip').forEach(x=>x.classList.toggle('active',x===b)); validate(); }));
    wrap.querySelector('#sgText').addEventListener('input',e=>{ wrap.querySelector('#sgCount').textContent=e.target.value.length+'/1000'; validate(); });
    wrap.querySelector('#sgImg').addEventListener('click',()=>wrap.querySelector('#sgFile').click());
    wrap.querySelector('#sgFile').addEventListener('change',e=>{ wrap.querySelector('#sgImgName').textContent=e.target.files[0]?e.target.files[0].name:''; });
    const m=openModal({title:'Suggestions', body:wrap, actions:[{label:'Cancel', onClick:()=>closeModal()},{label:'Submit', kind:'primary', onClick:()=>{ extra.feedback.push({cat, text:wrap.querySelector('#sgText').value, at:Date.now()}); saveExtra(); closeModal(); toast('Suggestion saved on this device'); }}]});
    const submitBtn=m.actEl.querySelectorAll('button')[1];
    const validate=()=>{ const ok=!!cat&&!!wrap.querySelector('#sgText').value.trim(); submitBtn.disabled=!ok; submitBtn.style.opacity=ok?'1':'.5'; };
    validate(); });
  c.appendChild(rowEl('Feedback','Tell us what to improve.',sug));
}

/* ---------- composer + chrome wiring ---------- */
function autosize(){ const t=$('#composerInput'); t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,170)+'px'; }
function updateSend(){ $('#sendBtn').disabled=!($('#composerInput').value.trim()||attachments.length); $('#micBtn').style.display=$('#composerInput').value.trim()?'none':''; }
function syncVoiceBtn(){ $('#voiceModeBtn').setAttribute('aria-pressed',String(!!settings.voice.voiceMode)); }
function syncToolsAvailability(){ const b=document.querySelector('[data-tool="image"]'); if(b){ b.disabled=!settings.advanced.imageGeneration; b.style.opacity=settings.advanced.imageGeneration?'1':'.45'; } }
function closePopovers(){ $('#toolsMenu').hidden=true; $('#modeMenu').hidden=true; $('#modelPanel').hidden=true; $('#profileMenu').hidden=true; $('#moreToolsMenu').hidden=true; }
function renderAll(){ renderHistory(); renderSearch(); renderProjects(); renderMessages(); renderModelPanel(); syncVoiceBtn(); syncToolsAvailability();
  $('#tempChatBtn').setAttribute('aria-pressed',String(temporary));
  $('#profileName').textContent=settings.profileName||'Jepong';
  $('#profileAvatar').textContent=(settings.profileName||'J').trim().charAt(0).toUpperCase()||'J';
  $('#profileMenuHeader').textContent=settings.profileEmail||settings.profileName||'Local profile';
  $$('#modeMenu [data-response-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.responseMode===settings.responseMode));
  $('#responseModeLabel').textContent=settings.responseMode;
  $('#toolsEnabledToggle').setAttribute('aria-checked',String(!!settings.toolsEnabled));
  $$('#toolsMenu [data-tool]').forEach(b=>b.classList.toggle('selected',b.dataset.tool===activeTool));
}

function init(){
  applyTheme();
  // sidebar
  $('#sidebarToggle').addEventListener('click',()=>{ const sb=$('#sidebar'); if(innerWidth<=700) sb.classList.toggle('mobile-open'); else sb.classList.toggle('rail'); });
  $('#brandHome').addEventListener('click',newChat);
  $('#newChatBtn').addEventListener('click',newChat);
  $('#railSearchBtn').addEventListener('click',()=>{ $('#sidebar').classList.remove('rail'); $('#sidebar').classList.add('mobile-open'); setTimeout(()=>$('#chatSearch').focus(),30); });
  $('#chatSearch').addEventListener('input',e=>{ clearTimeout(searchTimer); const v=e.target.value; $('#clearSearch').hidden=!v;
    searchTimer=setTimeout(()=>{ searchQuery=v; renderSearch(); },250); });
  $('#clearSearch').addEventListener('click',()=>{ $('#chatSearch').value=''; searchQuery=''; $('#clearSearch').hidden=true; renderSearch(); renderHistory(); });
  $('#projectsToggle').addEventListener('click',e=>{ const b=$('#projectsBody'); b.hidden=!b.hidden; e.currentTarget.setAttribute('aria-expanded',String(!b.hidden)); });
  $('#allChatsToggle').addEventListener('click',e=>{ const b=$('#historyList'); b.hidden=!b.hidden; e.currentTarget.setAttribute('aria-expanded',String(!b.hidden)); });
  $('#archivedToggle').addEventListener('click',e=>{ const b=$('#archivedList'); b.hidden=!b.hidden; e.currentTarget.setAttribute('aria-expanded',String(!b.hidden)); e.currentTarget.querySelector('.chev').textContent=b.hidden?'›':'⌄'; });
  $('#newProjectBtn').addEventListener('click',newProjectModal);
  $('#communityBtn').addEventListener('click',()=>window.open('https://chat.qwen.ai/community','_blank'));
  $('#coderBtn').addEventListener('click',()=>window.open('https://coder.qwen.ai','_blank'));
  $('#createBtn').addEventListener('click',()=>window.open('https://create.qwen.com','_blank'));
  // manage bar
  $('#manageSelectAll').addEventListener('change',e=>{ manageSel.clear(); if(e.target.checked) visibleSessions().forEach(s=>manageSel.add(s.id)); renderHistory(); });
  $('#manageCancel').addEventListener('click',()=>setManageMode(false));
  $('#manageDelete').addEventListener('click',()=>{ if(!manageSel.size){ toast('Select chats first'); return; }
    confirmModal('Delete selected chats?',manageSel.size+' chat(s) will be permanently deleted.','Delete',()=>{ sessions=sessions.filter(s=>!manageSel.has(s.id)); if(manageSel.has(currentId)) currentId=null; saveSessions(); setManageMode(false); renderAll(); }); });
  // profile
  $('#profileBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#profileMenu'); const was=m.hidden; closePopovers(); m.hidden=!was; });
  $('#profileMenu').addEventListener('click',e=>{ const b=e.target.closest('[data-profile-action]'); if(!b) return; closePopovers();
    const a=b.dataset.profileAction;
    if(a==='settings') openSettings('General'); else if(a==='usage') openSettings('Usage & Billing');
    else if(a==='upgrade') openUpgrade(); else if(a==='archived') archivedModal();
    else if(a==='support') openModal({title:'Customer Service Center', body:'<p>JepongDevxyz AI has no help-center backend yet. For account and app help, use Settings → About → Suggestions — your note is saved on this device.</p>', actions:[{label:'Close', kind:'primary', onClick:()=>closeModal()}]});
    else if(a==='logout'){ temporary=false; tempSession=null; currentId=null; renderAll(); toast('Signed out of the local profile'); } });
  $('#upgradeBtn').addEventListener('click',openUpgrade);
  $('#topUpgradeBtn').addEventListener('click',openUpgrade);
  // top bar
  $('#tempChatBtn').addEventListener('click',()=>{ temporary=!temporary; if(temporary) tempSession=null; exitShareMode(); renderAll(); if(temporary) toast('Temporary Chat — nothing will be saved'); });
  $('#currentChatMenuBtn').addEventListener('click',e=>{ e.stopPropagation(); const s=currentSession(); if(s&&!temporary){ const r=e.currentTarget.getBoundingClientRect(); showChatMenu(s,r.left-170,r.bottom+4); } });
  $('#modelBtn').addEventListener('click',e=>{ e.stopPropagation(); const p=$('#modelPanel'); const was=p.hidden; closePopovers(); p.hidden=!was; if(!p.hidden) renderModelPanel(); });
  $('#modelSearch').addEventListener('input',()=>renderModelPanel());
  $('#expandModelsBtn').addEventListener('click',()=>{ modelsExpanded=true; renderModelPanel(); });
  $('#modelPanel').addEventListener('click',e=>e.stopPropagation());
  // composer
  const form=$('#composer'), input=$('#composerInput');
  form.addEventListener('submit',e=>{ e.preventDefault(); sendCurrent(); });
  input.addEventListener('input',()=>{ autosize(); updateSend(); });
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendCurrent(); } });
  input.addEventListener('paste',e=>{ if(!settings.interface.pasteAsFile) return; const t=(e.clipboardData||window.clipboardData); const txt=t&&t.getData?t.getData('text'):''; if(txt&&txt.length>2000){ e.preventDefault(); attachments.push({name:'pasted-text.txt', mimeType:'text/plain', kind:'text/plain', size:txt.length, extractedText:txt.slice(0,200000)}); renderAttachments(); updateSend(); toast('Large text attached as a file'); } });
  $('#stopBtn').addEventListener('click',()=>{ if(aborter) aborter.abort(); });
  $('#micBtn').addEventListener('click',toggleMic);
  $('#voiceModeBtn').addEventListener('click',()=>{ settings.voice.voiceMode=!settings.voice.voiceMode; saveSettings(); syncVoiceBtn(); toast(settings.voice.voiceMode?'Voice mode on':'Voice mode off'); });
  $('#toolsBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#toolsMenu'); const was=m.hidden; closePopovers(); m.hidden=!was; });
  $('#moreToolsBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#moreToolsMenu'); m.hidden=!m.hidden; e.currentTarget.setAttribute('aria-expanded',String(!m.hidden)); });
  $('#toolsMenu').addEventListener('click',e=>e.stopPropagation());
  $$('#toolsMenu [data-tool]').forEach(b=>b.addEventListener('click',()=>{ const t=b.dataset.tool;
    if(t==='upload'){ closePopovers(); $('#fileInput').click(); return; }
    activeTool=activeTool===t?null:t; closePopovers(); renderAll();
    if(t==='image'&&!settings.advanced.imageGeneration){ toast('Image generation is off in Settings → Personalization → Advanced'); activeTool=null; renderAll(); return; }
    if(activeTool) toast('Mode: '+b.textContent.trim().replace(/\s+/g,' ')); input.focus(); }));
  $('#toolsEnabledToggle').addEventListener('click',e=>{ e.stopPropagation(); settings.toolsEnabled=!settings.toolsEnabled; saveSettings(); e.currentTarget.setAttribute('aria-checked',String(settings.toolsEnabled)); });
  $('#responseModeBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#modeMenu'); const was=m.hidden; closePopovers(); m.hidden=!was; });
  $('#modeMenu').addEventListener('click',e=>e.stopPropagation());
  $$('#modeMenu [data-response-mode]').forEach(b=>b.addEventListener('click',()=>{ settings.responseMode=b.dataset.responseMode; saveSettings(); closePopovers(); renderAll(); }));
  $('#fileInput').addEventListener('change',e=>{ addFiles(e.target.files); e.target.value=''; });
  // share bar
  $('#shareSelectAll').addEventListener('change',e=>{ const s=currentSession(); if(!s) return; shareSel.clear(); if(e.target.checked) s.messages.forEach(m=>shareSel.add(m.id)); renderMessages(); updateShareBar(); });
  $('#shareCancel').addEventListener('click',exitShareMode);
  $('#shareCopy').addEventListener('click',()=>{ const s=currentSession(); if(!s) return; const txt=s.messages.filter(m=>shareSel.has(m.id)).map(m=>(m.role==='user'?'You: ':'JepongDevxyz AI: ')+m.text).join('\n\n'); if(!txt){ toast('Select messages first'); return; } copyText(txt); exitShareMode(); });
  // drawer + settings chrome
  $('#drawerClose').addEventListener('click',()=>{ $('#activityDrawer').hidden=true; });
  $('#settingsBack').addEventListener('click',closeSettings);
  // import
  $('#importInput').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ try{ const data=JSON.parse(String(r.result)); const arr=Array.isArray(data)?data:data.sessions; if(!Array.isArray(arr)) throw new Error('bad format');
      let n=0; arr.forEach(s=>{ if(s&&s.id&&Array.isArray(s.messages)&&!getSession(s.id)){ sessions.push(Object.assign({title:'Imported chat', createdAt:Date.now(), updatedAt:Date.now(), pinned:false, archived:false},s)); n++; } });
      saveSessions(); renderAll(); toast('Imported '+n+' chat(s)'); }catch(err){ toast('Import failed: not a valid chats file'); } };
    r.readAsText(f); });
  // scroller stickiness + global close
  $('#chatScroller').addEventListener('scroll',e=>{ const sc=e.target; stickBottom=sc.scrollHeight-sc.scrollTop-sc.clientHeight<120; });
  document.addEventListener('click',e=>{ if(!e.target.closest('.model-wrap')&&!e.target.closest('#toolsMenu')&&!e.target.closest('#composer')&&!e.target.closest('.profile-block')) closePopovers(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closePopovers(); closeCtx(); } });
  renderAll(); updateSend(); autosize();
}
init();
