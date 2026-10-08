/* JepongDevxyz AI — Unified Memory System v1 (2026-10-08)
 * Additive memory layer:
 * - account-scoped Supabase saved memories
 * - explicit "remember/tandaan" capture
 * - individual edit/pin/delete
 * - unified summary generation from saved rows
 * - incognito isolation
 * - no local cross-account fallback
 */
(function () {
  'use strict';
  if (window.__jdUnifiedMemoryV1) return;
  window.__jdUnifiedMemoryV1 = true;

  var state = { rows: [], loading: false, saving: false };

  function signedIn() {
    try { return !!cloudUser && !!cloudClient; } catch (_) { return false; }
  }
  function incognito() {
    try { return !!isIncognito; } catch (_) { return false; }
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function rowsForContext() {
    return state.rows.filter(function (r) { return r && r.content && r.deleted_at == null; })
      .sort(function(a,b){ return Number(!!b.pinned)-Number(!!a.pinned) || String(b.updated_at||'').localeCompare(String(a.updated_at||'')); })
      .slice(0, 40);
  }
  function compileSummary() {
    var rows = rowsForContext();
    return rows.map(function(r,i){
      var prefix = r.pinned ? '[Pinned] ' : '';
      var cat = r.category && r.category !== 'general' ? '[' + r.category + '] ' : '';
      return (i + 1) + '. ' + prefix + cat + String(r.content).trim();
    }).join('\\n').slice(0, 12000);
  }
  function applyContext() {
    try {
      if (incognito()) return;
      personalizationSettings.memorySummary = compileSummary();
      if (typeof persistPersonalization === 'function') persistPersonalization();
    } catch (_) {}
  }
  async function loadRows() {
    if (!signedIn() || incognito()) { state.rows = []; applyContext(); renderManager(); return; }
    state.loading = true; renderManager();
    var result = await cloudClient.from('memories')
      .select('id,content,source,category,origin,confidence,pinned,source_conversation_id,metadata,created_at,updated_at')
      .eq('user_id', cloudUser.id)
      .neq('source','memory_summary')
      .order('pinned',{ascending:false})
      .order('updated_at',{ascending:false});
    state.loading = false;
    if (result.error) {
      console.warn('Unified memory load:', result.error.message);
      renderManager(result.error.message);
      return;
    }
    state.rows = Array.isArray(result.data) ? result.data : [];
    applyContext();
    renderManager();
  }
  async function saveRow(id, content, category, pinned) {
    if (!signedIn() || incognito()) throw new Error('Sign in to save account memory.');
    content = String(content || '').trim().slice(0, 4000);
    if (!content) throw new Error('Memory cannot be empty.');
    var payload = {
      content: content,
      category: category || 'general',
      origin: 'explicit',
      source: 'user',
      confidence: 1,
      pinned: !!pinned,
      metadata: { managed_by: 'unified_memory_v1' },
      updated_at: new Date().toISOString()
    };
    var q = id
      ? cloudClient.from('memories').update(payload).eq('id',id).eq('user_id',cloudUser.id)
      : cloudClient.from('memories').insert(Object.assign({user_id:cloudUser.id}, payload));
    var result = await q.select('id,content,source,category,origin,confidence,pinned,source_conversation_id,metadata,created_at,updated_at').maybeSingle();
    if (result.error) throw result.error;
    await loadRows();
    return result.data;
  }
  async function deleteRow(id) {
    if (!signedIn() || incognito()) throw new Error('Sign in to manage account memory.');
    var result = await cloudClient.from('memories').delete().eq('id',id).eq('user_id',cloudUser.id);
    if (result.error) throw result.error;
    await loadRows();
  }
  async function deleteAllAndDisable() {
    if (!signedIn() || incognito()) throw new Error('Sign in to delete account memory.');
    var uid = cloudUser.id;
    var result = await cloudClient.from('memories').delete().eq('user_id',uid).neq('source','memory_summary');
    if (result.error) throw result.error;
    var summary = await cloudClient.from('memories').delete().eq('user_id',uid).eq('source','memory_summary');
    if (summary.error) throw summary.error;
    personalizationSettings.memorySummary = '';
    personalizationSettings.memoryEnabled = false;
    persistPersonalization();
    try { if (typeof renderPersonalizationSettings === 'function') renderPersonalizationSettings(); } catch (_) {}
    state.rows = [];
    renderManager();
  }

  function ensureManager() {
    if (document.getElementById('jdMemoryManagerOverlay')) return;
    var overlay = document.createElement('div');
    overlay.id = 'jdMemoryManagerOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="floating-modal jd-memory-manager" role="dialog" aria-modal="true" aria-labelledby="jdMemoryTitle">' +
        '<div class="jd-memory-head"><div><h3 id="jdMemoryTitle">Saved memories</h3><p>Only memories saved to your signed-in account are used here.</p></div><button type="button" class="personalization-close" id="jdMemoryClose" aria-label="Close">✕</button></div>' +
        '<div id="jdMemoryBody"></div>' +
        '<div class="jd-memory-add"><input id="jdMemoryInput" maxlength="4000" placeholder="Add something to remember…"><select id="jdMemoryCategory"><option value="general">General</option><option value="preference">Preference</option><option value="project">Project</option><option value="communication">Communication</option><option value="technical">Technical</option><option value="goal">Goal</option></select><label><input id="jdMemoryPinned" type="checkbox"> Pin</label><button id="jdMemorySave" type="button">Save</button></div>' +
      '</div>';
    document.body.appendChild(overlay);
    document.getElementById('jdMemoryClose').onclick = closeManager;
    overlay.addEventListener('click', function(e){ if(e.target===overlay) closeManager(); });
    document.getElementById('jdMemorySave').onclick = async function(){
      var input=document.getElementById('jdMemoryInput'),cat=document.getElementById('jdMemoryCategory'),pin=document.getElementById('jdMemoryPinned');
      try { this.disabled=true; await saveRow(null,input.value,cat.value,pin.checked); input.value=''; pin.checked=false; }
      catch(e){ showModernAlert?.(e.message||'Could not save memory.','Memory'); }
      finally { this.disabled=false; }
    };
  }
  function renderManager(error) {
    var body=document.getElementById('jdMemoryBody'); if(!body) return;
    if(!signedIn() || incognito()){
      body.innerHTML='<div class="jd-memory-empty">Sign in to manage account memories. Temporary/Incognito chats do not save or retrieve memory.</div>';
      return;
    }
    if(state.loading){ body.innerHTML='<div class="jd-memory-empty">Loading saved memories…</div>'; return; }
    if(error){ body.innerHTML='<div class="jd-memory-empty jd-memory-error">'+esc(error)+'<br><button id="jdMemoryRetry">Retry</button></div>'; document.getElementById('jdMemoryRetry').onclick=loadRows; return; }
    if(!state.rows.length){ body.innerHTML='<div class="jd-memory-empty">No saved memories yet. Explicit “remember that…” requests will appear here.</div>'; return; }
    body.innerHTML=state.rows.map(function(r){
      return '<article class="jd-memory-item" data-id="'+esc(r.id)+'">'+
        '<div class="jd-memory-item-main"><div class="jd-memory-text">'+esc(r.content)+'</div><div class="jd-memory-meta">'+esc(r.category||'general')+(r.pinned?' · pinned':'')+'</div></div>'+
        '<div class="jd-memory-actions"><button data-act="edit">Edit</button><button data-act="pin">'+(r.pinned?'Unpin':'Pin')+'</button><button data-act="delete" class="danger">Delete</button></div>'+
      '</article>';
    }).join('');
    body.querySelectorAll('.jd-memory-item').forEach(function(item){
      var id=item.getAttribute('data-id'), row=state.rows.find(function(r){return r.id===id;});
      item.querySelector('[data-act="edit"]').onclick=async function(){
        var next=prompt('Edit memory',row.content); if(next==null)return;
        try{await saveRow(id,next,row.category,row.pinned);}catch(e){showModernAlert?.(e.message||'Update failed.','Memory');}
      };
      item.querySelector('[data-act="pin"]').onclick=async function(){
        try{await saveRow(id,row.content,row.category,!row.pinned);}catch(e){showModernAlert?.(e.message||'Update failed.','Memory');}
      };
      item.querySelector('[data-act="delete"]').onclick=async function(){
        if(!confirm('Delete this saved memory?'))return;
        try{await deleteRow(id);}catch(e){showModernAlert?.(e.message||'Delete failed.','Memory');}
      };
    });
  }
  function openManager() {
    ensureManager();
    if (incognito()) { showModernAlert?.('Memory is unavailable in Temporary/Incognito chat.','Memory'); return; }
    document.getElementById('jdMemoryManagerOverlay').classList.add('open');
    loadRows();
  }
  function closeManager(){ document.getElementById('jdMemoryManagerOverlay')?.classList.remove('open'); }

  async function explicitRemember(text) {
    if(!signedIn() || incognito()) return false;
    var raw=String(text||'').trim();
    var m=raw.match(/^(?:remember|tandaan(?:\s+mo)?|please remember|remember that)\s*[:,-]?\s*(.+)$/i);
    if(!m) return false;
    var fact=m[1].trim();
    if(!fact) return false;
    try {
      var normalized=fact.toLowerCase();
      var existing=await cloudClient.from('memories').select('id,content,category,pinned').eq('user_id',cloudUser.id).neq('source','memory_summary').ilike('content','%'+fact.slice(0,80).replace(/[%_]/g,'')+'%').limit(1).maybeSingle();
      if(existing.data?.id) await saveRow(existing.data.id,fact,existing.data.category,existing.data.pinned);
      else await saveRow(null,fact,'general',false);
      try{showModernAlert('Saved to Memory.','Memory');}catch(_){}
      return true;
    } catch(e) {
      console.warn('Explicit memory save skipped:',e);
      return false;
    }
  }

  window.JDMemory = { load:loadRows, open:openManager, close:closeManager, add:function(t,c,p){return saveRow(null,t,c,p);}, delete:deleteRow, disableAndDelete:deleteAllAndDisable, rows:function(){return state.rows.slice();}, compile:compileSummary };
  window.addEventListener('jd:account-changed', function(){ state.rows=[]; applyContext(); if(signedIn()) loadRows(); else renderManager(); });

  function installHooks() {
    ensureManager();
    var oldOpen = window.openMemorySummaryEditor;
    window.openMemorySummaryEditor = function(){
      openManager();
    };
    var oldSave = window.saveMemorySummary;
    window.saveMemorySummary = async function(){
      /* Legacy editor remains compatible: save its text as one explicit memory. */
      var el=document.getElementById('psMemorySummaryEditor'), text=el?.value?.trim();
      if(!text){closeManager();return;}
      try{
        await saveRow(null,text,'general',false);
        document.getElementById('memorySummaryModalOverlay')?.classList.remove('open');
        showModernAlert('Memory saved to your account.','Memory');
      }catch(e){showModernAlert?.(e.message||'Memory save failed.','Memory');}
    };
    var oldSend=window.sendMessage;
    if(typeof oldSend==='function' && !oldSend.__jdMemoryWrapped){
      var wrapped=async function(){
        var input=document.getElementById('userInput');
        var text=input?.value||'';
        await explicitRemember(text);
        return oldSend.apply(this,arguments);
      };
      wrapped.__jdMemoryWrapped=true;
      window.sendMessage=wrapped;
    }
  }

  function addStyles(){
    if(document.getElementById('jdUnifiedMemoryCss'))return;
    var s=document.createElement('style');s.id='jdUnifiedMemoryCss';
    s.textContent='.jd-memory-manager{max-width:620px;width:min(94vw,620px);max-height:88dvh}.jd-memory-head{display:flex;gap:12px;align-items:flex-start;border-bottom:1px solid var(--border-color);padding-bottom:12px}.jd-memory-head h3{margin:0;font-size:1rem}.jd-memory-head p{margin:4px 0 0;color:var(--text-muted);font-size:.72rem;line-height:1.45}.jd-memory-head button{margin-left:auto;flex:0 0 auto}.jd-memory-empty{padding:26px 8px;text-align:center;color:var(--text-muted);font-size:.78rem;line-height:1.55}.jd-memory-item{border:1px solid var(--border-color);border-radius:14px;padding:12px;margin:10px 0;background:rgba(255,255,255,.025)}.jd-memory-text{font-size:.82rem;line-height:1.45;white-space:pre-wrap;overflow-wrap:anywhere}.jd-memory-meta{font-size:.65rem;color:var(--text-muted);margin-top:6px;text-transform:capitalize}.jd-memory-actions{display:flex;gap:6px;margin-top:9px}.jd-memory-actions button,.jd-memory-empty button{border:1px solid var(--border-color);background:transparent;color:var(--text-main);border-radius:9px;padding:6px 9px;font-size:.68rem}.jd-memory-actions .danger{color:#ef7373}.jd-memory-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)}.jd-memory-add input:not([type=checkbox]),.jd-memory-add select{min-width:0;background:var(--input-bg);color:var(--text-main);border:1px solid var(--border-color);border-radius:10px;padding:9px;font-size:.76rem}.jd-memory-add input:first-child{grid-column:1/-1}.jd-memory-add label{font-size:.68rem;display:flex;align-items:center;gap:4px;color:var(--text-muted)}.jd-memory-add #jdMemorySave{border:0;border-radius:10px;padding:9px 14px;background:var(--accent-gradient);color:#fff;font-weight:700}body.theme-light .jd-memory-item{background:rgba(0,0,0,.018)}@media(max-width:520px){.jd-memory-add{grid-template-columns:1fr 1fr}.jd-memory-add #jdMemorySave{grid-column:1/-1}.jd-memory-manager{width:calc(100vw - 20px)}}';
    document.head.appendChild(s);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){addStyles();installHooks();});
  else { addStyles(); installHooks(); }
})();
