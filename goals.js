/* JepongDevxyz AI — Goals Page v2 (2026-10-04)
   Full Muse-app parity:
   - Goal record: emoji, title, current_state pulse, description, category
     (health/relationships/money/career/interests/productivity/something_else),
     goal_kind (outcome/behavior/learning/habit/maintenance/recovery/identity/exploratory),
     value_alignment ("why it matters"), progress, target_date, reminders
   - Lifecycle: active / completed only (no paused — matches Muse)
   - Subgoals: nest goals under a parent goal
   - Activity timeline: dated progress entries per goal
   - AI operations API: window.JDGoals.aiCreate / aiLogEntry / aiSetProgress
     (used by goals-chat.js when the AI manages goals from chat)
   - Storage: Supabase (signed-in) with localStorage fallback
   - Theme-aware (dark/light), bottom-centered "Powered by Jepong Devxyz" toasts
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdGoalsV2) return;
  window.__jdGoalsV2 = true;
  window.__jdGoals = true; /* compat flag for v1 consumers */

  var LS_KEY = 'jd_goals_v2';
  var LS_ENTRIES = 'jd_goal_entries_v2';

  var CATEGORIES = [
    ['health', '🏃', 'Health'], ['relationships', '❤️', 'Relationships'],
    ['money', '💰', 'Money'], ['career', '💼', 'Career'],
    ['interests', '🎨', 'Interests'], ['productivity', '⚡', 'Productivity'],
    ['something_else', '✨', 'Something else']
  ];
  var KINDS = [
    ['outcome', 'Outcome'], ['behavior', 'Behavior'], ['learning', 'Learning'],
    ['habit', 'Habit'], ['maintenance', 'Maintenance'], ['recovery', 'Recovery'],
    ['identity', 'Identity'], ['exploratory', 'Exploratory']
  ];
  var EMOJIS = ['🎯', '🏃', '📚', '💰', '❤️', '💼', '🎨', '⚡', '🌱', '🏆', '✈️', '🎵', '💪', '🧠', '🌙', '☀️'];

  var CSS = [
    '#jdGoalsPage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdGoalsPage[hidden]{display:none!important}',
    '.jdg-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdg-back{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdg-back:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdg-back svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdg-title{font-size:1.05rem;font-weight:600}',
    '.jdg-add{width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.1);color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdg-add:active{transform:scale(.92)}',
    '.jdg-add svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round}',
    '.jdg-scroll{flex:1;overflow-y:auto;padding:8px 16px 100px;-webkit-overflow-scrolling:touch}',
    '.jdg-empty{text-align:center;color:#888;padding:60px 20px;font-size:.92rem;line-height:1.6}',
    '.jdg-empty svg{width:48px;height:48px;stroke:#555;fill:none;stroke-width:1.5;margin-bottom:12px}',
    '.jdg-card{background:#1e1e1e;border-radius:18px;padding:16px;margin-bottom:12px;cursor:pointer}',
    '.jdg-card.sub{margin-left:24px;position:relative}',
    '.jdg-card.sub::before{content:"";position:absolute;left:-16px;top:-6px;bottom:50%;width:12px;',
    'border-left:2px solid rgba(255,255,255,.15);border-bottom:2px solid rgba(255,255,255,.15);border-radius:0 0 0 8px}',
    '.jdg-card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}',
    '.jdg-emoji{font-size:1.5rem;margin-right:10px;flex:0 0 auto}',
    '.jdg-card-title{font-size:.98rem;font-weight:600;margin-bottom:2px}',
    '.jdg-card-state{font-size:.78rem;color:#aaa;margin-bottom:8px;line-height:1.4}',
    '.jdg-card-desc{font-size:.83rem;color:#999;line-height:1.45;margin-bottom:10px}',
    '.jdg-badge{font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:20px;flex:0 0 auto;text-transform:uppercase;letter-spacing:.04em}',
    '.jdg-badge.active{background:rgba(52,199,89,.15);color:#34c759}',
    '.jdg-badge.completed{background:rgba(0,122,255,.15);color:#0a84ff}',
    '.jdg-bar{height:8px;border-radius:4px;background:rgba(255,255,255,.1);overflow:hidden;margin:8px 0}',
    '.jdg-bar-fill{height:100%;border-radius:4px;background:#fff;transition:width .3s}',
    '.jdg-meta{display:flex;align-items:center;justify-content:space-between;font-size:.75rem;color:#888;margin-top:6px}',
    '.jdg-meta .pct{color:#fff;font-weight:700}',
    '.jdg-cat{font-size:.7rem;color:#888}',
    /* Detail view */
    '.jdg-detail-sec{font-size:.8rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin:20px 0 10px}',
    '.jdg-why{background:#1e1e1e;border-radius:14px;padding:14px 16px;font-size:.87rem;color:#ccc;line-height:1.5;margin-bottom:4px}',
    '.jdg-entry{background:#1e1e1e;border-radius:14px;padding:12px 14px;margin-bottom:8px}',
    '.jdg-entry-title{font-size:.88rem;font-weight:600;margin-bottom:2px}',
    '.jdg-entry-desc{font-size:.82rem;color:#aaa;line-height:1.45}',
    '.jdg-entry-date{font-size:.7rem;color:#777;margin-top:6px}',
    '.jdg-entry-add{display:flex;gap:8px;margin-top:4px}',
    '.jdg-entry-add input{flex:1;background:#2c2c2e;border:none;border-radius:12px;padding:11px 14px;color:#fff;font-size:.85rem;font-family:inherit}',
    '.jdg-entry-add input::placeholder{color:#666}',
    '.jdg-entry-add button{border:none;border-radius:12px;background:#fff;color:#000;font-weight:700;padding:0 18px;cursor:pointer;font-size:.85rem}',
    /* Bottom sheet */
    '#jdgSheet{position:fixed;inset:0;z-index:24600;display:none}',
    '#jdgSheet.open{display:block}',
    '.jdg-sheet-bg{position:absolute;inset:0;background:rgba(0,0,0,.6)}',
    '.jdg-sheet-body{position:absolute;left:0;right:0;bottom:0;background:#1c1c1e;border-radius:24px 24px 0 0;',
    'padding:20px 20px 34px;max-height:88vh;overflow-y:auto}',
    '.jdg-sheet-title{font-size:1.05rem;font-weight:700;margin-bottom:16px;text-align:center}',
    '.jdg-label{font-size:.82rem;color:#999;margin:0 0 6px 4px;display:block}',
    '.jdg-input{width:100%;background:#2c2c2e;border:none;border-radius:14px;padding:13px 15px;font-size:.92rem;',
    'color:#fff;margin-bottom:14px;box-sizing:border-box;font-family:inherit}',
    '.jdg-input::placeholder{color:#666}',
    '.jdg-input:focus{outline:1px solid rgba(255,255,255,.25)}',
    'textarea.jdg-input{min-height:70px;resize:vertical}',
    'select.jdg-input{appearance:none}',
    '.jdg-row2{display:flex;gap:10px}',
    '.jdg-row2>div{flex:1;min-width:0}',
    '.jdg-emojigrid{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}',
    '.jdg-emo{font-size:1.4rem;width:44px;height:44px;border-radius:12px;background:#2c2c2e;border:2px solid transparent;cursor:pointer}',
    '.jdg-emo.on{border-color:#fff}',
    '.jdg-dayrow{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}',
    '.jdg-day{flex:1;text-align:center;font-size:.75rem;font-weight:600;padding:9px 4px;border-radius:12px;background:#2c2c2e;color:#888;border:none;cursor:pointer;min-width:44px}',
    '.jdg-day.on{background:#fff;color:#000}',
    '.jdg-stepper{display:flex;align-items:center;gap:12px;margin-bottom:14px}',
    '.jdg-step-btn{width:44px;height:44px;border-radius:50%;border:none;background:#2c2c2e;color:#fff;font-size:1.3rem;cursor:pointer}',
    '.jdg-step-btn:active{transform:scale(.92)}',
    '.jdg-step-val{flex:1;text-align:center;font-size:1.1rem;font-weight:700}',
    '.jdg-btn{width:100%;border:none;border-radius:16px;padding:15px;font-size:.95rem;font-weight:700;cursor:pointer;margin-bottom:10px}',
    '.jdg-btn.primary{background:#fff;color:#000}',
    '.jdg-btn.danger{background:rgba(255,69,58,.12);color:#ff453a}',
    '.jdg-btn.ghost{background:transparent;color:#999}',
    '.jdg-btn:active{transform:scale(.98)}',
    /* Toast */
    '#jdgToast{position:fixed;left:50%;bottom:32px;transform:translateX(-50%) translateY(20px);background:#2c2c2e;color:#fff;',
    'font-size:.85rem;padding:12px 20px;border-radius:24px;opacity:0;transition:all .3s;z-index:24700;pointer-events:none;',
    'white-space:nowrap;max-width:92vw}',
    '#jdgToast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
    '#jdgToast small{display:block;text-align:center;font-size:.65rem;color:#888;margin-top:2px}',
    /* Light mode */
    'body.theme-light #jdGoalsPage{background:#f2f2f5;color:#111}',
    /* Tracking section (Muse-app parity) */
    '.jdg-track-sec{margin:6px 0 8px}',
    '.jdg-track-head{display:flex;align-items:center;gap:10px;padding:12px 16px}',
    '.jdg-track-dot{width:9px;height:9px;border-radius:50%;background:#30d158;flex:0 0 auto}',
    '.jdg-track-title{font-size:1.05rem;font-weight:700;flex:1}',
    '.jdg-track-menu{background:none;border:none;color:#888;font-size:1.2rem;cursor:pointer;padding:4px 8px}',
    '.jdg-track-item{display:flex;align-items:flex-start;gap:12px;padding:13px 16px;cursor:pointer}',
    '.jdg-track-item:active{background:rgba(255,255,255,.03)}',
    '.jdg-track-check{width:22px;height:22px;border-radius:6px;border:1.5px solid rgba(255,255,255,.3);',
    'background:transparent;cursor:pointer;flex:0 0 auto;margin-top:1px}',
    '.jdg-track-check.done{background:#30d158;border-color:#30d158}',
    '.jdg-track-body{flex:1;min-width:0}',
    '.jdg-track-name{font-size:.95rem;font-weight:600;color:#fff;line-height:1.35}',
    '.jdg-track-sub{font-size:.82rem;color:#8e8e93;line-height:1.45;margin-top:3px;display:-webkit-box;',
    '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.jdg-track-opts{background:none;border:none;color:#666;font-size:1.1rem;cursor:pointer;padding:2px 6px;flex:0 0 auto}',
    '.jdg-track-empty{padding:8px 16px 12px;color:#666;font-size:.86rem}',
    '.jdg-show-more{display:flex;align-items:center;gap:8px;background:none;border:none;color:#888;',
    'font-size:.9rem;cursor:pointer;padding:10px 16px}',
    '.jdg-dots{letter-spacing:2px}',
    /* Goals menu sheet */
    '.jdg-menu-body{padding:8px !important}',
    '.jdg-menu-item{display:flex;align-items:center;justify-content:space-between;width:100%;background:none;',
    'border:none;color:#fff;font-size:.95rem;padding:14px 16px;cursor:pointer;text-align:left}',
    '.jdg-menu-item:active{background:rgba(255,255,255,.06)}',
    '.jdg-menu-check{color:#fff;font-weight:700}',
    '.jdg-menu-label{font-size:.75rem;color:#888;padding:10px 16px 2px;text-transform:none}',
    '.jdg-menu-item.jdg-danger span{color:#ff453a}',
    /* Blue Let's do it button (video-exact) */
    '.jdg-intake-btn{width:100%;background:#0a84ff;color:#fff;border:none;border-radius:16px;padding:14px;',
    'font-size:.92rem;font-weight:700;cursor:pointer}',
    '.jdg-intake-btn:active{transform:scale(.98)}',
    '.jdg-create-sec{margin:14px 4px 6px}',
    '.jdg-create-title{font-size:1.05rem;font-weight:700;margin-bottom:6px;padding:0 12px}',
    '.jdg-cat-row{display:flex;align-items:center;gap:16px;padding:13px 12px;cursor:pointer}',
    '.jdg-cat-row:active{background:rgba(255,255,255,.04)}',
    '.jdg-cat-ico{width:28px;height:28px;display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#888}',
    '.jdg-cat-ico svg{width:26px;height:26px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
    '.jdg-cat-name{font-size:1rem;flex:1;color:#fff}',
    '.jdg-cat-plus{font-size:1.5rem;color:#888;font-weight:300;flex:0 0 auto;padding:0 4px;cursor:pointer;line-height:1}',
    '.jdg-cat-plus:active{transform:scale(.9);color:#fff}',
    '.jdg-intake-title{font-size:1.05rem;font-weight:800;margin-bottom:10px}',
    '.jdg-intake-desc{font-size:.86rem;color:#b0b0b5;line-height:1.55;margin-bottom:20px}',
    'body.theme-light .jdg-cat-row:active{background:rgba(0,0,0,.05)}',
    'body.theme-light .jdg-cat-ico{background:rgba(0,0,0,.05)}',
    'body.theme-light .jdg-cat-plus{border-color:rgba(0,0,0,.2);color:#666}',
    'body.theme-light .jdg-intake-desc{color:#666}',
    'body.theme-light .jdg-intake-btn{background:#111;color:#fff}',
    'body.theme-light .jdg-back{color:#111}',
    'body.theme-light .jdg-add{background:rgba(0,0,0,.06);color:#111}',
    'body.theme-light .jdg-card,body.theme-light .jdg-why,body.theme-light .jdg-entry{background:#fff;color:#111;box-shadow:0 1px 6px rgba(0,0,0,.07)}',
    'body.theme-light .jdg-card-desc,body.theme-light .jdg-entry-desc{color:#666}',
    'body.theme-light .jdg-card-state{color:#777}',
    'body.theme-light .jdg-bar{background:rgba(0,0,0,.08)}',
    'body.theme-light .jdg-bar-fill{background:#111}',
    'body.theme-light .jdg-meta{color:#999}',
    'body.theme-light .jdg-meta .pct{color:#111}',
    'body.theme-light .jdg-empty{color:#999}',
    'body.theme-light .jdg-sheet-body{background:#fff;color:#111}',
    'body.theme-light .jdg-input,body.theme-light .jdg-entry-add input{background:#f0f0f2;color:#111}',
    'body.theme-light .jdg-input::placeholder,body.theme-light .jdg-entry-add input::placeholder{color:#aaa}',
    'body.theme-light .jdg-emo{background:#f0f0f2}',
    'body.theme-light .jdg-emo.on{border-color:#111}',
    'body.theme-light .jdg-day{background:#f0f0f2;color:#888}',
    'body.theme-light .jdg-day.on{background:#111;color:#fff}',
    'body.theme-light .jdg-step-btn{background:#f0f0f2;color:#111}',
    'body.theme-light .jdg-btn.primary{background:#111;color:#fff}',
    'body.theme-light .jdg-entry-add button{background:#111;color:#fff}',
    'body.theme-light #jdgToast{background:#111;color:#fff}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
  };

  function ensureCSS() {
    if (document.getElementById('jdgCss')) return;
    var st = document.createElement('style');
    st.id = 'jdgCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Storage ---------- */
  function lsGet(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function uid(p) { return (p || 'g_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function sb() { try { return window.__jdSupabase || null; } catch (e) { return null; } }
  function isLocalId(id) { return String(id).indexOf('g_') === 0 || String(id).indexOf('e_') === 0; }

  function normGoal(r) {
    return {
      id: r.id, title: r.title, description: r.description || '',
      target_date: r.target_date || '', progress: r.progress || 0,
      status: r.status === 'completed' ? 'completed' : 'active',
      reminder_time: r.reminder_time || '', reminder_days: r.reminder_days || '',
      emoji: r.emoji || '🎯', category: r.category || '', goal_kind: r.goal_kind || '',
      value_alignment: r.value_alignment || '', current_state: r.current_state || '',
      parent_goal_id: r.parent_goal_id || ''
    };
  }
  function normEntry(r) {
    return {
      id: r.id, goal_id: r.goal_id, title: r.title, description: r.description || '',
      current_state: r.current_state || '', effective_at: r.effective_at || r.created_at
    };
  }

  async function loadGoals() {
    var c = sb();
    if (c) {
      try {
        var r = await c.from('goals').select('*').order('created_at', { ascending: false });
        if (!r.error && r.data) return r.data.map(normGoal);
      } catch (e) {}
    }
    return lsGet(LS_KEY, []);
  }
  async function persistGoal(g, isNew) {
    var c = sb();
    if (c && !isLocalId(g.id)) {
      try {
        var payload = {
          title: g.title, description: g.description || null,
          target_date: g.target_date || null, progress: g.progress || 0,
          status: g.status || 'active', reminder_time: g.reminder_time || null,
          reminder_days: g.reminder_days || null, emoji: g.emoji || null,
          category: g.category || null, goal_kind: g.goal_kind || null,
          value_alignment: g.value_alignment || null, current_state: g.current_state || null,
          parent_goal_id: g.parent_goal_id || null, updated_at: new Date().toISOString()
        };
        var r = isNew
          ? await c.from('goals').insert(payload).select().single()
          : await c.from('goals').update(payload).eq('id', g.id).select().single();
        if (!r.error && r.data) return normGoal(r.data);
      } catch (e) {}
    }
    var list = lsGet(LS_KEY, []);
    var rec = {
      id: g.id, title: g.title, description: g.description, target_date: g.target_date,
      progress: g.progress, status: g.status, reminder_time: g.reminder_time,
      reminder_days: g.reminder_days, emoji: g.emoji, category: g.category,
      goal_kind: g.goal_kind, value_alignment: g.value_alignment,
      current_state: g.current_state, parent_goal_id: g.parent_goal_id
    };
    if (isNew) { rec.id = rec.id || uid('g_'); list.unshift(rec); }
    else {
      var i = list.findIndex(function (x) { return x.id === rec.id; });
      if (i >= 0) list[i] = rec; else list.unshift(rec);
    }
    lsSet(LS_KEY, list);
    return normGoal(rec);
  }
  async function removeGoal(id) {
    var c = sb();
    if (c && !isLocalId(id)) { try { await c.from('goals').delete().eq('id', id); } catch (e) {} }
    lsSet(LS_KEY, lsGet(LS_KEY, []).filter(function (g) { return g.id !== id; }));
    lsSet(LS_ENTRIES, lsGet(LS_ENTRIES, []).filter(function (e) { return e.goal_id !== id; }));
  }
  async function loadEntries(goalId) {
    var c = sb();
    if (c && !isLocalId(goalId)) {
      try {
        var r = await c.from('goal_entries').select('*').eq('goal_id', goalId).order('effective_at', { ascending: false });
        if (!r.error && r.data) return r.data.map(normEntry);
      } catch (e) {}
    }
    return lsGet(LS_ENTRIES, []).filter(function (e) { return e.goal_id === goalId; })
      .sort(function (a, b) { return new Date(b.effective_at) - new Date(a.effective_at); });
  }
  async function addEntry(goalId, title, desc) {
    var c = sb();
    var rec = { id: uid('e_'), goal_id: goalId, title: title, description: desc || '', current_state: '', effective_at: new Date().toISOString() };
    if (c && !isLocalId(goalId)) {
      try {
        var r = await c.from('goal_entries').insert({
          goal_id: goalId, title: title, description: desc || null,
          effective_at: rec.effective_at
        }).select().single();
        if (!r.error && r.data) return normEntry(r.data);
      } catch (e) {}
    }
    var list = lsGet(LS_ENTRIES, []);
    list.unshift(rec);
    lsSet(LS_ENTRIES, list);
    return normEntry(rec);
  }

  /* ---------- Toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('jdgToast');
    if (!t) { t = document.createElement('div'); t.id = 'jdgToast'; document.body.appendChild(t); }
    t.innerHTML = esc(msg) + '<small>Powered by Jepong Devxyz</small>';
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  /* ---------- Helpers ---------- */
  function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return d; }
  }
  function fmtDT(s) {
    try { return new Date(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
      new Date(s).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
    catch (e) { return ''; }
  }
  function catLabel(c) {
    var f = CATEGORIES.find(function (x) { return x[0] === c; });
    return f ? f[1] + ' ' + f[2] : '';
  }

  /* ---------- Main list ---------- */
  function renderList(list, targetBox) {
    var box = targetBox || document.getElementById('jdgList');
    if (!box) return;
    var tops = list.filter(function (g) { return !g.parent_goal_id; });
    var activeGoals = tops.filter(function (g) { return g.status === 'active'; });

    /* Tracking section — Muse-app parity: green dot, checkboxes, Show more */
    var showAll = box.getAttribute('data-show-all') === '1';
    var trackItems = showAll ? activeGoals : activeGoals.slice(0, 3);
    var trackingHtml = '<div class="jdg-track-sec">' +
      '<div class="jdg-track-head"><span class="jdg-track-dot"></span>' +
      '<span class="jdg-track-title">Tracking</span>' +
      '<button class="jdg-track-menu" id="jdgTrackMenuBtn" aria-label="Tracking options">⋮</button></div>';
    if (!trackItems.length) {
      trackingHtml += '<div class="jdg-track-empty">Nothing being tracked yet.</div>';
    } else {
      trackingHtml += trackItems.map(function (g) {
        return '<div class="jdg-track-item" data-id="' + esc(g.id) + '">' +
          '<button class="jdg-track-check" data-id="' + esc(g.id) + '" aria-label="Mark complete"></button>' +
          '<div class="jdg-track-body"><div class="jdg-track-name">' + esc(g.title) + '</div>' +
          (g.current_state ? '<div class="jdg-track-sub">' + esc(g.current_state) + '</div>' : '') +
          '</div>' +
          '<button class="jdg-track-opts" data-id="' + esc(g.id) + '" aria-label="Options">⋮</button></div>';
      }).join('');
    }
    if (activeGoals.length > 3) {
      trackingHtml += '<button class="jdg-show-more" id="jdgShowMore">' +
        (showAll ? 'Show less' : '<span class="jdg-dots">···</span> Show more') + '</button>';
    }
    trackingHtml += '</div>';

    /* Create-a-goal category picker — outline Lucide icons (Muse-app pixel parity) */
    var CAT_ICONS = {
      health: '<svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
      relationships: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      finance: '<svg viewBox="0 0 24 24"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      career: '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M12 14h.01"/></svg>',
      interests: '<svg viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.07A5.47 5.47 0 0 0 22 10.5C22 5.8 17.5 2 12 2z"/></svg>',
      productivity: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
      other: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'
    };
    var cats = [
      ['health', 'Health'],
      ['relationships', 'Relationships'],
      ['finance', 'Finance'],
      ['career', 'Career'],
      ['interests', 'Interests'],
      ['productivity', 'Productivity'],
      ['other', 'Something else']
    ];
    var createHtml = '<div class="jdg-create-sec"><div class="jdg-create-title">Create a goal</div>' +
      cats.map(function (c) {
        return '<div class="jdg-cat-row" data-cat="' + c[0] + '">' +
          '<span class="jdg-cat-ico">' + CAT_ICONS[c[0]] + '</span>' +
          '<span class="jdg-cat-name">' + c[1] + '</span>' +
          '<span class="jdg-cat-plus" data-cat="' + c[0] + '" aria-label="Create ' + c[1] + ' goal">+</span></div>';
      }).join('') + '</div>';

    if (!tops.length) {
      box.innerHTML = trackingHtml + createHtml +
        '<div class="jdg-empty">' + I.target + '<div>No goals yet.<br>Pick a category above to create your first goal.</div></div>';
    } else {
      var cards = (function () {
        function card(g, isSub) {
          var bell = g.reminder_time ? ' 🔔' : '';
          var subs = list.filter(function (x) { return x.parent_goal_id === g.id; });
          return '<div class="jdg-card' + (isSub ? ' sub' : '') + '" data-id="' + esc(g.id) + '">' +
            '<div class="jdg-card-top"><div style="display:flex;flex:1;min-width:0">' +
            '<span class="jdg-emoji">' + esc(g.emoji || '🎯') + '</span>' +
            '<div style="flex:1;min-width:0"><div class="jdg-card-title">' + esc(g.title) + esc(bell) + '</div>' +
            (g.current_state ? '<div class="jdg-card-state">' + esc(g.current_state) + '</div>' : '') +
            '</div></div>' +
            '<span class="jdg-badge ' + g.status + '">' + (g.status === 'completed' ? 'Done' : 'Active') + '</span></div>' +
            '<div class="jdg-bar"><div class="jdg-bar-fill" style="width:' + (g.progress || 0) + '%"></div></div>' +
            '<div class="jdg-meta"><span class="pct">' + (g.progress || 0) + '%</span>' +
            '<span>' + (g.category ? '<span class="jdg-cat">' + esc(catLabel(g.category)) + '</span> · ' : '') +
            (g.target_date ? '🎯 ' + esc(fmtDate(g.target_date)) : '') + '</span></div>' +
            '</div>' +
            subs.map(function (s) { return card(s, true); }).join('');
        }
        return tops.map(function (g) { return card(g, false); }).join('');
      })();
      box.innerHTML = trackingHtml + cards + createHtml;
    }
    /* wire tracking interactions */
    var smBtn = box.querySelector('#jdgShowMore');
    if (smBtn) smBtn.addEventListener('click', function () {
      box.setAttribute('data-show-all', box.getAttribute('data-show-all') === '1' ? '0' : '1');
      renderList(list, targetBox);
    });
    var tmBtn = box.querySelector('#jdgTrackMenuBtn');
    if (tmBtn) tmBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openGoalsMenu(box);
    });
    box.querySelectorAll('.jdg-track-check').forEach(function (cb) {
      cb.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = cb.getAttribute('data-id');
        if (window.JDGoals && window.JDGoals.aiSetProgress) {
          window.JDGoals.aiSetProgress(id, 100);
        }
        cb.classList.add('done');
        setTimeout(function () { renderList(list, targetBox); }, 400);
      });
    });
    box.querySelectorAll('.jdg-track-item').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.getAttribute('data-id')); });
    });
    box.querySelectorAll('.jdg-track-opts').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        openTrackItemMenu(btn.getAttribute('data-id'), list, targetBox);
      });
    });
    box.querySelectorAll('.jdg-card').forEach(function (el) {
      el.addEventListener('click', function () { openDetail(el.getAttribute('data-id')); });
    });
    box.querySelectorAll('.jdg-cat-row, .jdg-cat-plus').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.stopPropagation();
        openIntakeSheet(el.getAttribute('data-cat'));
      });
    });
  }

  /* ---------- Per-item ⋮ menu (Muse-app parity: Complete, Add subgoal, Rename, Delete) ---------- */
  function openTrackItemMenu(id, list, targetBox) {
    var g = (window.__jdGoalsList || []).find(function (x) { return x.id === id; });
    if (!g) return;
    var sh = document.getElementById('jdgSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'jdgSheet';
      document.body.appendChild(sh);
    }
    sh.innerHTML =
      '<div class="jdg-sheet-bg" id="jdgItemMenuBg"></div>' +
      '<div class="jdg-sheet-body jdg-menu-body">' +
      '<button class="jdg-menu-item" data-act="complete"><span>✓&nbsp;&nbsp;Complete</span></button>' +
      '<button class="jdg-menu-item" data-act="subgoal"><span>＋&nbsp;&nbsp;Add a subgoal</span></button>' +
      '<button class="jdg-menu-item" data-act="rename"><span>✎&nbsp;&nbsp;Rename</span></button>' +
      '<button class="jdg-menu-item jdg-danger" data-act="delete"><span>🗑&nbsp;&nbsp;Delete</span></button>' +
      '</div>';
    sh.classList.add('open');
    document.getElementById('jdgItemMenuBg').addEventListener('click', function () { sh.classList.remove('open'); });
    sh.querySelectorAll('.jdg-menu-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        sh.classList.remove('open');
        if (act === 'complete') {
          if (window.JDGoals && window.JDGoals.aiSetProgress) window.JDGoals.aiSetProgress(id, 100);
          setTimeout(function () { renderList(list, targetBox); }, 400);
        } else if (act === 'subgoal') {
          openDetail(id);
          setTimeout(function () {
            var ab = document.getElementById('jdgAddSub');
            if (ab) ab.click();
          }, 400);
        } else if (act === 'rename') {
          openDetail(id);
        } else if (act === 'delete') {
          if (confirm('Delete "' + g.title + '"?')) {
            removeGoal(id).then(function () { renderList(list, targetBox); refresh(); });
          }
        }
      });
    });
  }

  /* ---------- Goals ⋮ menu (Muse-app parity) ---------- */
  var LS_SHOW_SUB = 'jd_goals_show_subtitles';
  var LS_SHOW_FIRST = 'jd_goals_show_first';
  var LS_SORT_AUTO = 'jd_goals_sort_auto';
  function gOpt(k, fb) {
    try { var v = localStorage.getItem(k); return v == null ? fb : v === '1'; }
    catch (e) { return fb; }
  }
  function gSetOpt(k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) {} }

  function openGoalsMenu(box) {
    var sh = document.getElementById('jdgSheet');
    if (!sh) {
      /* Explore pane mode: create sheet container */
      sh = document.createElement('div');
      sh.id = 'jdgSheet';
      document.body.appendChild(sh);
    }
    function row(id, label, checked) {
      return '<button class="jdg-menu-item" data-act="' + id + '"><span>' + label + '</span>' +
        (checked ? '<span class="jdg-menu-check">✓</span>' : '') + '</button>';
    }
    sh.innerHTML =
      '<div class="jdg-sheet-bg" id="jdgMenuBg"></div>' +
      '<div class="jdg-sheet-body jdg-menu-body">' +
      row('subtitles', gOpt(LS_SHOW_SUB, true) ? 'Hide subtitles' : 'Show subtitles') +
      '<div class="jdg-menu-label">Show first</div>' +
      row('first-tracking', 'Tracking', gOpt(LS_SHOW_FIRST, true)) +
      row('first-goals', 'Goals', !gOpt(LS_SHOW_FIRST, true)) +
      row('sort', 'Sort automatically', gOpt(LS_SORT_AUTO, false)) +
      row('completed', 'Completed goals', false) +
      '</div>';
    sh.classList.add('open');
    document.getElementById('jdgMenuBg').addEventListener('click', function () { sh.classList.remove('open'); });
    sh.querySelectorAll('.jdg-menu-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'subtitles') gSetOpt(LS_SHOW_SUB, !gOpt(LS_SHOW_SUB, true));
        else if (act === 'first-tracking') { try { localStorage.setItem(LS_SHOW_FIRST, '1'); } catch (e) {} }
        else if (act === 'first-goals') { try { localStorage.setItem(LS_SHOW_FIRST, '0'); } catch (e) {} }
        else if (act === 'sort') gSetOpt(LS_SORT_AUTO, !gOpt(LS_SORT_AUTO, false));
        else if (act === 'completed') {
          sh.classList.remove('open');
          if (window.JDGoals) window.JDGoals.open();
          return;
        }
        sh.classList.remove('open');
      });
    });
  }

  /* ---------- Category intake sheet (chat-based refinement, like the Muse app) ---------- */
  function openIntakeSheet(cat) {
    var names = { health: 'health', relationships: 'relationships', finance: 'finance', career: 'career', interests: 'interests', productivity: 'productivity', other: '' };
    var label = names[cat] || '';
    var sh = document.getElementById('jdgSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'jdgSheet';
      document.body.appendChild(sh);
    }
    sh.innerHTML =
      '<div class="jdg-sheet-bg" id="jdgIntakeBg"></div>' +
      '<div class="jdg-sheet-body">' +
      '<div class="jdg-intake-title">Create a' + (label ? ' ' + esc(label) : '') + ' goal</div>' +
      '<div class="jdg-intake-desc">First, we\'ll refine the goal together in chat. ' +
      'I\'ll ask a few questions to clarify exactly what you\'re after.<br><br>' +
      'Once it\'s set I\'ll track your progress here.</div>' +
      '<button class="jdg-intake-btn" id="jdgIntakeGo">Let\'s do it</button>' +
      '</div>';
    sh.classList.add('open');
    document.getElementById('jdgIntakeBg').addEventListener('click', function () { sh.classList.remove('open'); });
    document.getElementById('jdgIntakeGo').addEventListener('click', function () {
      sh.classList.remove('open');
      startChatIntake(cat);
    });
  }

  function startChatIntake(cat) {
    try { if (window.JDExplore) window.JDExplore.close(); } catch (e) {}
    var gp = document.getElementById('jdGoalsPage');
    if (gp) gp.hidden = true;
    var names = { health: 'health', relationships: 'relationships', finance: 'finance', career: 'career', interests: 'interests', productivity: 'productivity' };
    var c = names[cat] ? ' for ' + names[cat] : '';
    var msg = 'Help me create a new goal' + c + '. Ask me what I want to achieve, why it matters, and suggest a target date.';
    try {
      if (window.JDMainChat && window.JDMainChat.sendAsUser) {
        window.JDMainChat.sendAsUser(msg);
      } else if (window.JDMainChat) {
        window.JDMainChat.open();
      }
    } catch (e) {}
  }
  async function refresh() {
    var list = await loadGoals();
    window.__jdGoalsList = list;
    renderList(list);
  }

  /* ---------- Detail view (entries timeline) ---------- */
  var detailId = null;
  function openDetail(id) {
    detailId = id;
    var g = (window.__jdGoalsList || []).find(function (x) { return x.id === id; });
    if (!g) return;
    var html =
      '<div class="jdg-sheet-bg" id="jdgSheetBg"></div>' +
      '<div class="jdg-sheet-body">' +
      '<div style="text-align:center;font-size:2.4rem;margin-bottom:8px">' + esc(g.emoji || '🎯') + '</div>' +
      '<div class="jdg-sheet-title">' + esc(g.title) + '</div>' +
      (g.current_state ? '<div style="text-align:center;color:#aaa;font-size:.88rem;margin:-8px 0 12px">' + esc(g.current_state) + '</div>' : '') +
      '<div class="jdg-bar"><div class="jdg-bar-fill" style="width:' + (g.progress || 0) + '%"></div></div>' +
      '<div class="jdg-meta" style="margin-bottom:6px"><span class="pct">' + (g.progress || 0) + '% complete</span>' +
      '<span class="jdg-badge ' + g.status + '">' + (g.status === 'completed' ? 'Done' : 'Active') + '</span></div>' +
      (g.description ? '<div class="jdg-detail-sec">About</div><div class="jdg-why">' + esc(g.description) + '</div>' : '') +
      (g.value_alignment ? '<div class="jdg-detail-sec">Why it matters</div><div class="jdg-why">' + esc(g.value_alignment) + '</div>' : '') +
      '<div class="jdg-detail-sec">Progress timeline</div>' +
      '<div id="jdgEntries"><div style="color:#888;font-size:.85rem">Loading…</div></div>' +
      '<div class="jdg-entry-add"><input id="jdgNewEntry" placeholder="Log progress…"><button id="jdgAddEntry">Add</button></div>' +
      '<div style="height:16px"></div>' +
      '<button class="jdg-btn primary" id="jdgEditBtn">Edit Goal</button>' +
      '<button class="jdg-btn ghost" id="jdgDetailClose">Close</button>' +
      '</div>';
    var sh = document.getElementById('jdgSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'jdgSheet';
      document.body.appendChild(sh);
    }
    sh.innerHTML = html;
    sh.classList.add('open');
    document.getElementById('jdgSheetBg').addEventListener('click', closeSheet);
    document.getElementById('jdgDetailClose').addEventListener('click', closeSheet);
    document.getElementById('jdgEditBtn').addEventListener('click', function () { openSheet(id); });
    function renderEntries(entries) {
      var box = document.getElementById('jdgEntries');
      if (!entries.length) { box.innerHTML = '<div style="color:#777;font-size:.84rem;margin-bottom:8px">No entries yet — log your first win below.</div>'; return; }
      box.innerHTML = entries.map(function (e) {
        return '<div class="jdg-entry"><div class="jdg-entry-title">' + esc(e.title) + '</div>' +
          (e.description ? '<div class="jdg-entry-desc">' + esc(e.description) + '</div>' : '') +
          '<div class="jdg-entry-date">' + esc(fmtDT(e.effective_at)) + '</div></div>';
      }).join('');
    }
    loadEntries(id).then(renderEntries);
    document.getElementById('jdgAddEntry').addEventListener('click', function () {
      var inp = document.getElementById('jdgNewEntry');
      var v = inp.value.trim();
      if (!v) return;
      addEntry(id, v, '').then(function () {
        inp.value = '';
        loadEntries(id).then(renderEntries);
        toast('Progress logged');
      });
    });
  }

  /* ---------- Add/Edit sheet ---------- */
  var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var editingId = null;
  function openSheet(id) {
    editingId = id || null;
    var g = id ? (window.__jdGoalsList || []).find(function (x) { return x.id === id; }) : null;
    var days = (g && g.reminder_days ? g.reminder_days.split(',') : []);
    var parents = (window.__jdGoalsList || []).filter(function (x) { return x.id !== (g && g.id) && !x.parent_goal_id; });
    var html =
      '<div class="jdg-sheet-bg" id="jdgSheetBg"></div>' +
      '<div class="jdg-sheet-body">' +
      '<div class="jdg-sheet-title">' + (g ? 'Edit Goal' : 'New Goal') + '</div>' +
      '<label class="jdg-label">Icon</label><div class="jdg-emojigrid" id="jdgFEmoji">' +
      EMOJIS.map(function (e) {
        return '<button class="jdg-emo' + ((g ? g.emoji : '🎯') === e ? ' on' : '') + '" data-e="' + e + '">' + e + '</button>';
      }).join('') + '</div>' +
      '<label class="jdg-label">Title</label>' +
      '<input class="jdg-input" id="jdgFTitle" placeholder="e.g. Save for a trip" value="' + esc(g ? g.title : '') + '">' +
      '<label class="jdg-label">Current state (one-line status)</label>' +
      '<input class="jdg-input" id="jdgFState" placeholder="e.g. ₱12,000 saved of ₱50,000" value="' + esc(g ? g.current_state : '') + '">' +
      '<label class="jdg-label">Description</label>' +
      '<textarea class="jdg-input" id="jdgFDesc" placeholder="What is this goal about?">' + esc(g ? g.description : '') + '</textarea>' +
      '<label class="jdg-label">Why it matters</label>' +
      '<input class="jdg-input" id="jdgFWhy" placeholder="e.g. For our family vacation" value="' + esc(g ? g.value_alignment : '') + '">' +
      '<div class="jdg-row2"><div>' +
      '<label class="jdg-label">Life area</label><select class="jdg-input" id="jdgFCat"><option value="">—</option>' +
      CATEGORIES.map(function (c) {
        return '<option value="' + c[0] + '"' + (g && g.category === c[0] ? ' selected' : '') + '>' + c[1] + ' ' + c[2] + '</option>';
      }).join('') + '</select></div><div>' +
      '<label class="jdg-label">Goal kind</label><select class="jdg-input" id="jdgFKind"><option value="">—</option>' +
      KINDS.map(function (k) {
        return '<option value="' + k[0] + '"' + (g && g.goal_kind === k[0] ? ' selected' : '') + '>' + k[1] + '</option>';
      }).join('') + '</select></div></div>' +
      (parents.length ? '<label class="jdg-label">Subgoal of (optional)</label><select class="jdg-input" id="jdgFParent"><option value="">Top-level goal</option>' +
      parents.map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (g && g.parent_goal_id === p.id ? ' selected' : '') + '>' + esc(p.title) + '</option>';
      }).join('') + '</select>' : '') +
      '<div class="jdg-row2"><div>' +
      '<label class="jdg-label">Target date</label>' +
      '<input class="jdg-input" id="jdgFDate" type="date" value="' + esc(g ? g.target_date : '') + '"></div><div>' +
      '<label class="jdg-label">Reminder time</label>' +
      '<input class="jdg-input" id="jdgFTime" type="time" value="' + esc(g ? g.reminder_time : '') + '"></div></div>' +
      '<label class="jdg-label">Reminder days</label>' +
      '<div class="jdg-dayrow" id="jdgFDays">' +
      DAYS.map(function (d) {
        return '<button class="jdg-day' + (days.indexOf(d) >= 0 ? ' on' : '') + '" data-d="' + d + '">' + d[0] + '</button>';
      }).join('') + '</div>' +
      '<label class="jdg-label">Progress</label>' +
      '<div class="jdg-stepper"><button class="jdg-step-btn" id="jdgMinus">−</button>' +
      '<div class="jdg-step-val" id="jdgProgVal">' + (g ? (g.progress || 0) : 0) + '%</div>' +
      '<button class="jdg-step-btn" id="jdgPlus">+</button></div>' +
      (g ? '<label class="jdg-label">Status</label><div class="jdg-dayrow" id="jdgFStatus">' +
        ['active', 'completed'].map(function (s) {
          return '<button class="jdg-day' + (g.status === s ? ' on' : '') + '" data-s="' + s + '" style="flex:1">' +
            (s === 'completed' ? 'Completed' : 'Active') + '</button>';
        }).join('') + '</div>' : '') +
      '<button class="jdg-btn primary" id="jdgSave">' + (g ? 'Save Changes' : 'Create Goal') + '</button>' +
      (g ? '<button class="jdg-btn danger" id="jdgDelete">Delete Goal</button>' : '') +
      '<button class="jdg-btn ghost" id="jdgCancel">Cancel</button>' +
      '</div>';
    var sh = document.getElementById('jdgSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'jdgSheet';
      document.body.appendChild(sh);
    }
    sh.innerHTML = html;
    sh.classList.add('open');

    var prog = g ? (g.progress || 0) : 0;
    var status = g ? g.status : 'active';
    var emoji = g ? (g.emoji || '🎯') : '🎯';
    function setProg(v) { prog = Math.max(0, Math.min(100, v)); document.getElementById('jdgProgVal').textContent = prog + '%'; }
    document.getElementById('jdgFEmoji').addEventListener('click', function (e) {
      var b = e.target.closest('.jdg-emo'); if (!b) return;
      this.querySelectorAll('.jdg-emo').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); emoji = b.getAttribute('data-e');
    });
    document.getElementById('jdgMinus').addEventListener('click', function () { setProg(prog - 5); });
    document.getElementById('jdgPlus').addEventListener('click', function () { setProg(prog + 5); });
    document.getElementById('jdgFDays').addEventListener('click', function (e) {
      var b = e.target.closest('.jdg-day'); if (b) b.classList.toggle('on');
    });
    var stEl = document.getElementById('jdgFStatus');
    if (stEl) stEl.addEventListener('click', function (e) {
      var b = e.target.closest('.jdg-day'); if (!b) return;
      stEl.querySelectorAll('.jdg-day').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on'); status = b.getAttribute('data-s');
    });
    document.getElementById('jdgSheetBg').addEventListener('click', closeSheet);
    document.getElementById('jdgCancel').addEventListener('click', closeSheet);
    document.getElementById('jdgSave').addEventListener('click', function () {
      var title = document.getElementById('jdgFTitle').value.trim();
      if (!title) { toast('Please enter a goal title'); return; }
      var selDays = Array.prototype.map.call(
        document.querySelectorAll('#jdgFDays .jdg-day.on'),
        function (b) { return b.getAttribute('data-d'); }).join(',');
      var parSel = document.getElementById('jdgFParent');
      var goal = {
        id: g ? g.id : uid('g_'),
        title: title,
        description: document.getElementById('jdgFDesc').value.trim(),
        current_state: document.getElementById('jdgFState').value.trim(),
        value_alignment: document.getElementById('jdgFWhy').value.trim(),
        category: document.getElementById('jdgFCat').value,
        goal_kind: document.getElementById('jdgFKind').value,
        parent_goal_id: parSel ? parSel.value : '',
        target_date: document.getElementById('jdgFDate').value,
        reminder_time: document.getElementById('jdgFTime').value,
        reminder_days: selDays,
        progress: prog,
        status: prog >= 100 ? 'completed' : status,
        emoji: emoji
      };
      persistGoal(goal, !g).then(function () {
        closeSheet(); refresh();
        toast(g ? 'Goal updated' : 'Goal created 🎉');
        if (window.__jdGoalsNotify && window.__jdGoalsNotify.reschedule) window.__jdGoalsNotify.reschedule();
      });
    });
    var del = document.getElementById('jdgDelete');
    if (del) del.addEventListener('click', function () {
      if (!confirm('Delete this goal and its timeline?')) return;
      removeGoal(editingId).then(function () {
        closeSheet(); refresh(); toast('Goal deleted');
        if (window.__jdGoalsNotify && window.__jdGoalsNotify.reschedule) window.__jdGoalsNotify.reschedule();
      });
    });
  }
  function closeSheet() {
    var sh = document.getElementById('jdgSheet');
    if (sh) sh.classList.remove('open');
    editingId = null; detailId = null;
  }

  /* ---------- Page shell ---------- */
  function buildPage() {
    if (document.getElementById('jdGoalsPage')) return;
    var p = document.createElement('div');
    p.id = 'jdGoalsPage';
    p.hidden = true;
    p.innerHTML =
      '<div class="jdg-header">' +
      '<button class="jdg-back" id="jdgBack" aria-label="Back">' + I.back + '</button>' +
      '<div class="jdg-title">Goals</div>' +
      '<button class="jdg-add" id="jdgAddBtn" aria-label="Add goal">' + I.plus + '</button>' +
      '</div>' +
      '<div class="jdg-scroll" id="jdgList"></div>';
    document.body.appendChild(p);
    var sh = document.createElement('div');
    sh.id = 'jdgSheet';
    document.body.appendChild(sh);
    document.getElementById('jdgBack').addEventListener('click', function () { p.hidden = true; });
    document.getElementById('jdgAddBtn').addEventListener('click', function () { openSheet(null); });
  }
  function openGoals() {
    ensureCSS(); buildPage();
    document.getElementById('jdGoalsPage').hidden = false;
    refresh();
  }

  /* ---------- Settings row ---------- */
  function addSettingsRow() {
    if (document.getElementById('jdgSettingsRow')) return;
    var iv = setInterval(function () {
      var rows = document.querySelectorAll('[data-jd-settings-row], .jd-settings-row, [class*="settings"] [role="button"]');
      var anchor = null;
      for (var i = 0; i < rows.length; i++) {
        var t = (rows[i].textContent || '').toLowerCase();
        if (t.indexOf('memory') >= 0 || t.indexOf('personalization') >= 0) { anchor = rows[i]; break; }
      }
      if (!anchor) return;
      var row = document.createElement('div');
      row.id = 'jdgSettingsRow';
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:16px;cursor:pointer';
      row.innerHTML = '<span style="display:flex;align-items:center;gap:12px">' +
        '<span style="width:22px;height:22px;display:inline-flex">' + I.target + '</span>Goals</span>' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>';
      row.addEventListener('click', openGoals);
      anchor.parentNode.insertBefore(row, anchor.nextSibling);
      clearInterval(iv);
    }, 1500);
  }

  /* ---------- Public API (incl. AI operations) ---------- */
  /* Mount goals list UI into an Explore pane */
  function mountPane(container) {
    ensureCSS();
    container.innerHTML = '<div class="jdg-pane-list"></div>';
    var listBox = container.querySelector('.jdg-pane-list');
    async function refresh() {
      var list = await loadGoals();
      window.__jdGoalsList = list;
      renderList(list, listBox);
    }
    refresh();
    return refresh;
  }

  window.JDGoals = {
    open: openGoals,
    mountPane: mountPane,
    list: function () { return (window.__jdGoalsList || []).slice(); },
    activeGoals: function () {
      return (window.__jdGoalsList || []).filter(function (g) { return g.status === 'active'; });
    },
    contextForChat: function () {
      var act = this.activeGoals();
      if (!act.length) return '';
      var lines = act.map(function (g) {
        return '- ' + (g.emoji || '🎯') + ' ' + g.title + ' (' + (g.progress || 0) + '% complete' +
          (g.current_state ? ' — ' + g.current_state : '') +
          (g.target_date ? ', target: ' + g.target_date : '') + ')';
      });
      return 'The user is working on these goals:\n' + lines.join('\n') +
        '\nEncourage progress naturally when relevant. When the user shares a meaningful update, ' +
        'log it with [[JD_GOAL_ENTRY|goal_id|title|description]]. ' +
        'When they state a new aspiration, create it with [[JD_GOAL_CREATE|title|description|category]]. ' +
        'Do not lecture.';
    },
    /* AI-driven operations (called by goals-chat.js marker protocol) */
    aiCreate: function (title, description, category) {
      var goal = {
        id: uid('g_'), title: String(title || '').slice(0, 120) || 'Untitled goal',
        description: String(description || '').slice(0, 500),
        category: CATEGORIES.some(function (c) { return c[0] === category; }) ? category : '',
        emoji: '🎯', progress: 0, status: 'active',
        current_state: '', value_alignment: '', goal_kind: '',
        target_date: '', reminder_time: '', reminder_days: '', parent_goal_id: ''
      };
      return persistGoal(goal, true).then(function (saved) {
        return refresh().then(function () {
          toast('New goal created: ' + saved.title + ' 🎉');
          if (window.__jdGoalsNotify && window.__jdGoalsNotify.reschedule) window.__jdGoalsNotify.reschedule();
          return saved;
        });
      });
    },
    aiLogEntry: function (goalId, title, description) {
      var g = (window.__jdGoalsList || []).find(function (x) { return x.id === goalId; });
      if (!g) {
        /* fuzzy match by title when the AI only knows the name */
        var q = String(goalId || '').toLowerCase();
        g = (window.__jdGoalsList || []).find(function (x) { return x.title.toLowerCase().indexOf(q) >= 0; });
      }
      if (!g) return Promise.resolve(null);
      return addEntry(g.id, String(title || 'Progress update').slice(0, 120), String(description || '').slice(0, 500))
        .then(function (e) { toast('Progress logged for ' + g.title); return e; });
    },
    aiSetProgress: function (goalId, progress) {
      var g = (window.__jdGoalsList || []).find(function (x) { return x.id === goalId; });
      if (!g) {
        var q = String(goalId || '').toLowerCase();
        g = (window.__jdGoalsList || []).filter(function (x) { return x.status === 'active'; })
          .find(function (x) { return x.title.toLowerCase().indexOf(q) >= 0; });
      }
      if (!g) return Promise.resolve(null);
      g.progress = Math.max(0, Math.min(100, Number(progress) || 0));
      if (g.progress >= 100) g.status = 'completed';
      return persistGoal(g, false).then(function () {
        return refresh().then(function () {
          toast(g.title + ': ' + g.progress + '%' + (g.progress >= 100 ? ' 🎉 Completed!' : ''));
          return g;
        });
      });
    }
  };

  ensureCSS();
  buildPage();
  addSettingsRow();
  loadGoals().then(function (list) { window.__jdGoalsList = list; });
})();
