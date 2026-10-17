/* ============================================================
   affect-wire.js — Wire affectUI components into JepongDevxyz AI
   Version: v20261008a342

   Wires the 12 affectUI components (affect-ui.js) into the app:

   1. AutonomyDial → EXTRA → JepongDevxyz AI → "Agent Permissions"
      card. Opens a sheet with the dial. Level persists to
      localStorage (jd_autonomy_level). Exposed as
      window.jdAutonomyLevel() for agent code to check.

   Additive only. Idempotent.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdAffectWireLoaded) return;
  window.__jdAffectWireLoaded = true;

  /* ============ Autonomy level store ============ */
  var LEVEL_KEY = 'jd_autonomy_level';
  var PINNED_KEY = 'jd_autonomy_pinned';
  function getLevel() {
    try {
      var v = parseInt(localStorage.getItem(LEVEL_KEY), 10);
      return (v === 0 || v === 1 || v === 2) ? v : 1;
    } catch (_) { return 1; }
  }
  function setLevel(l) {
    try { localStorage.setItem(LEVEL_KEY, String(l)); } catch (_) {}
  }
  function getPinned() {
    try { return JSON.parse(localStorage.getItem(PINNED_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function setPinned(p) {
    try { localStorage.setItem(PINNED_KEY, JSON.stringify(p)); } catch (_) {}
  }
  window.jdAutonomyLevel = getLevel;
  window.jdSetAutonomyLevel = setLevel;

  /* Agent actions with risk levels */
  var ACTIONS = [
    { id: 'web_search', label: 'Web search', detail: 'Search the internet for information', risk: 'safe' },
    { id: 'read_files', label: 'Read files', detail: 'Read files you uploaded', risk: 'safe' },
    { id: 'gen_image', label: 'Generate images', detail: 'Create images from text', risk: 'safe' },
    { id: 'send_email', label: 'Send email', detail: 'Send email from your account', risk: 'risky' },
    { id: 'book', label: 'Book & buy', detail: 'Make bookings and purchases', risk: 'risky' },
    { id: 'delete_data', label: 'Delete data', detail: 'Delete chats, files, memories', risk: 'destructive' }
  ];

  /* ============ Permissions sheet ============ */
  function openPermissions() {
    // Remove existing
    var old = document.getElementById('jdPermSheet');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'jdPermSheet';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;';

    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--jd-bg,#1a1a1a);color:var(--jd-fg,#eee);width:100%;max-width:480px;max-height:85vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:20px;';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
    head.innerHTML = '<h3 style="margin:0;font-size:17px;">🎚️ Agent Permissions</h3>';
    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'background:none;border:none;color:inherit;font-size:20px;cursor:pointer;padding:8px;';
    closeBtn.onclick = function () { overlay.remove(); };
    head.appendChild(closeBtn);
    sheet.appendChild(head);

    var sub = document.createElement('p');
    sub.style.cssText = 'margin:0 0 16px;font-size:13px;opacity:.7;';
    sub.textContent = 'What the agent may do without asking you.';
    sheet.appendChild(sub);

    // Render the dial (wait for affect-ui.js)
    function renderDial() {
      if (!window.__jdAffectUI || !window.__jdAffectUI.AutonomyDial) {
        setTimeout(renderDial, 300);
        return;
      }
      var dial = window.__jdAffectUI.AutonomyDial({
        level: getLevel(),
        actions: ACTIONS.map(function (a) {
          return { id: a.id, label: a.label, detail: a.detail, risk: a.risk };
        }),
        pinned: getPinned(),
        onLevelChange: function (l) { setLevel(l); toast(levelName(l)); },
        onPinnedChange: function (p) { setPinned(p); }
      });
      sheet.appendChild(dial);
    }
    renderDial();

    overlay.appendChild(sheet);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }
  window.jdOpenAgentPermissions = openPermissions;

  function levelName(l) {
    return l === 0 ? 'Ask every time' : l === 1 ? 'Ask before risky actions' : 'Full auto';
  }
  function toast(msg) {
    try {
      if (window.jdOdToast) window.jdOdToast('🎚️ ' + msg);
      else if (window.showModernToast) window.showModernToast('🎚️ ' + msg);
    } catch (_) {}
  }

  /* ============ Inject card into EXTRA sheet ============ */
  function tryInject() {
    if (document.getElementById('jdPermCard')) return true;
    var cards = document.querySelectorAll('.jd-extra-ai-card');
    for (var i = 0; i < cards.length; i++) {
      var h4 = cards[i].querySelector('h4');
      if (h4 && h4.textContent.indexOf('Agent Skills') >= 0) {
        var card = document.createElement('div');
        card.className = 'jd-extra-ai-card';
        card.id = 'jdPermCard';
        card.innerHTML =
          '<h4>🎚️ Agent Permissions</h4>' +
          '<p>Control what the agent may do without asking: <b>ask every time</b>, <b>ask before risky</b>, or <b>full auto</b>. Current: <b>' + levelName(getLevel()) + '</b>.</p>' +
          '<button class="jd-extra-ai-facts" id="jdPermOpenBtn">Open permissions</button>';
        cards[i].parentNode.insertBefore(card, cards[i].nextSibling);
        document.getElementById('jdPermOpenBtn').addEventListener('click', function () {
          openPermissions();
        });
        return true;
      }
    }
    return false;
  }
  function injectCard() {
    // Try immediately (card may already be in DOM)
    if (tryInject()) return;
    // Otherwise watch for the sheet to render
    var obs = new MutationObserver(function () {
      if (tryInject()) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectCard);
  else injectCard();

  /* ============================================================
     SECTION 2 — affectUI component wiring (v20261008a342+)
     Helpers + non-breaking integrations for the remaining 11
     components. All guarded: wait for window.__jdAffectUI.
     ============================================================ */

  /* ---- UI-ready helper: run fn(UI) when affect-ui.js loaded ---- */
  function whenUI(fn, tries) {
    tries = (tries == null) ? 40 : tries;
    if (window.__jdAffectUI) { try { fn(window.__jdAffectUI); } catch (_) {} return; }
    if (tries <= 0) return;
    setTimeout(function () { whenUI(fn, tries - 1); }, 300);
  }

  /* ---- Generic bottom sheet ---- */
  function openSheet(title, sub) {
    var old = document.getElementById('jdAfxSheet');
    if (old) old.remove();
    var overlay = document.createElement('div');
    overlay.id = 'jdAfxSheet';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;';
    var sheet = document.createElement('div');
    sheet.style.cssText = 'background:var(--jd-bg,#1a1a1a);color:var(--jd-fg,#eee);width:100%;max-width:480px;max-height:85vh;overflow-y:auto;border-radius:20px 20px 0 0;padding:20px;';
    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;';
    var h = document.createElement('h3');
    h.style.cssText = 'margin:0;font-size:17px;';
    h.textContent = title;
    head.appendChild(h);
    var x = document.createElement('button');
    x.textContent = '✕';
    x.style.cssText = 'background:none;border:none;color:inherit;font-size:20px;cursor:pointer;padding:8px;';
    x.onclick = function () { overlay.remove(); };
    head.appendChild(x);
    sheet.appendChild(head);
    if (sub) {
      var p = document.createElement('p');
      p.style.cssText = 'margin:0 0 16px;font-size:13px;opacity:.7;';
      p.textContent = sub;
      sheet.appendChild(p);
    }
    overlay.appendChild(sheet);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    return { overlay: overlay, sheet: sheet, close: function () { overlay.remove(); } };
  }
  window.jdAfxSheet = openSheet;

  /* ============ 1. ThinkingLoader ============
     The app's "Thought for…" trace is server-rendered; replacing it
     is risky. Expose a helper other patches (or future work) can use
     to show a polished loader inside any container. */
  window.jdShowThinkingLoader = function (container, opts) {
    if (!container) return null;
    var loader = null;
    whenUI(function (UI) {
      loader = UI.ThinkingLoader(opts || {});
      try { container.appendChild(loader); } catch (_) {}
    });
    // Return a proxy with the common methods once ready
    var proxy = {};
    ['setDone', 'setPhase', 'reset', 'destroy'].forEach(function (m) {
      proxy[m] = function () {
        var a = arguments;
        if (loader && typeof loader[m] === 'function') return loader[m].apply(loader, a);
      };
    });
    proxy._ready = function (cb) { whenUI(function () { cb(loader); }); };
    return proxy;
  };

  /* ============ 2. ToolCallCard + ToolCallGroup ============
     Helpers for rendering tool calls as cards. Other patches call
     these; the group collects cards for one assistant turn. */
  window.jdToolCallCard = function (opts) {
    if (window.__jdAffectUI) return window.__jdAffectUI.ToolCallCard(opts || {});
    var card = null;
    whenUI(function (UI) { card = UI.ToolCallCard(opts || {}); });
    return {
      _pending: true,
      _ready: function (cb) { whenUI(function () { cb(card); }); },
      setStatus: function (s) { if (card) card.setStatus(s); },
      getStatus: function () { return card ? card.getStatus() : null; },
      el: function () { return card; }
    };
  };
  window.jdToolCallGroup = function (opts) {
    var grp = null, cards = [];
    whenUI(function (UI) { grp = UI.ToolCallGroup(opts || {}); });
    return {
      _ready: function (cb) { whenUI(function () { cb(grp); }); },
      addCard: function (cardOpts) {
        var h = window.jdToolCallCard(cardOpts);
        h._ready(function (el) {
          cards.push(el);
          if (grp && grp.appendChild) { try { grp.appendChild(el); } catch (_) {} }
        });
        return h;
      },
      el: function () { return grp; }
    };
  };

  /* ============ 3. CitedAnswer ============ */
  window.jdCitedAnswer = function (opts) {
    var el = null;
    whenUI(function (UI) { el = UI.CitedAnswer(opts || {}); });
    return { _ready: function (cb) { whenUI(function () { cb(el); }); }, el: function () { return el; } };
  };

  /* ============ 4. ContextWindow ============
     Helper + non-breaking injection: if the credits usage card
     (#jdUsageTokens) is present, append a small context bar under it
     showing today's token usage as a proportion of a 128k window. */
  window.jdContextBar = function (used, total, container) {
    var el = null;
    whenUI(function (UI) {
      el = UI.ContextWindow({ used: used || 0, total: total || 128000 });
      if (container) { try { container.appendChild(el); } catch (_) {} }
    });
    return { _ready: function (cb) { whenUI(function () { cb(el); }); }, el: function () { return el; } };
  };
  function tryInjectContextBar() {
    if (document.getElementById('jdCtxBarWrap')) return true;
    var tEl = document.querySelector('#jdUsageTokens');
    if (!tEl) return false;
    var wrap = document.createElement('div');
    wrap.id = 'jdCtxBarWrap';
    wrap.style.cssText = 'margin-top:10px;';
    var label = document.createElement('div');
    label.style.cssText = 'font-size:11px;opacity:.6;margin-bottom:4px;';
    label.textContent = 'Context window (today)';
    wrap.appendChild(label);
    var host = document.createElement('div');
    wrap.appendChild(host);
    // Insert after the usage card
    var card = tEl.closest('div');
    if (card && card.parentNode) card.parentNode.insertBefore(wrap, card.nextSibling);
    else return false;
    // Read token count and render
    var used = parseInt((tEl.textContent || '0').replace(/[^0-9]/g, ''), 10) || 0;
    window.jdContextBar(used, 128000, host);
    return true;
  }
  function watchContextBar() {
    if (tryInjectContextBar()) return;
    var obs = new MutationObserver(function () { if (tryInjectContextBar()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchContextBar);
  else watchContextBar();

  /* ============ 5. AgentInbox ============
     Runs registry in localStorage + viewer sheet. */
  var RUNS_KEY = 'jd_agent_runs';
  function getRuns() {
    try { return JSON.parse(localStorage.getItem(RUNS_KEY) || '[]'); }
    catch (_) { return []; }
  }
  function saveRuns(r) {
    try { localStorage.setItem(RUNS_KEY, JSON.stringify(r.slice(0, 20))); } catch (_) {}
  }
  window.jdLogAgentRun = function (run) {
    if (!run) return;
    var runs = getRuns();
    runs.unshift({
      id: run.id || ('run-' + Date.now()),
      title: run.title || 'Agent run',
      status: run.status || 'done',
      time: run.time || new Date().toISOString()
    });
    saveRuns(runs);
  };
  window.jdOpenAgentInbox = function () {
    var s = openSheet('📥 Agent Inbox', 'Recent agent runs.');
    whenUI(function (UI) {
      var inbox = UI.AgentInbox({
        runs: getRuns(),
        onSelect: function (r) { try { toast('Selected: ' + r.title); } catch (_) {} }
      });
      s.sheet.appendChild(inbox);
    });
  };
  // Seed hook: log browser-agent dry-runs if the loop is ever constructed
  // (non-breaking — only wraps if AgentLoop exists)
  function hookBrowseAgent() {
    if (!window.jdBrowseAgent || !window.jdBrowseAgent.AgentLoop || window.jdBrowseAgent.__jdHooked) return;
    try {
      window.jdBrowseAgent.__jdHooked = true;
      var Orig = window.jdBrowseAgent.AgentLoop;
      window.jdBrowseAgent.AgentLoop = function () {
        var inst = Orig.apply(this, arguments);
        try {
          window.jdLogAgentRun({ title: 'Browse agent run', status: 'running' });
        } catch (_) {}
        return inst;
      };
    } catch (_) {}
  }
  setTimeout(hookBrowseAgent, 3000);
  setTimeout(hookBrowseAgent, 10000);

  /* ============ 6. AgentSteering + AgentPlan ============ */
  window.jdAgentSteering = function (opts) {
    var el = null;
    whenUI(function (UI) { el = UI.AgentSteering(opts || {}); });
    return { _ready: function (cb) { whenUI(function () { cb(el); }); }, el: function () { return el; } };
  };
  window.jdAgentPlan = function (opts) {
    var el = null;
    whenUI(function (UI) { el = UI.AgentPlan(opts || {}); });
    return { _ready: function (cb) { whenUI(function () { cb(el); }); }, el: function () { return el; } };
  };
  /* Modal plan approval: shows steps, Approve/Reject, callback with decision */
  window.jdShowAgentPlanModal = function (steps, onDecision) {
    var s = openSheet('📋 Agent Plan', 'Review the plan before the agent runs.');
    whenUI(function (UI) {
      var plan = UI.AgentPlan({ steps: steps || [] });
      s.sheet.appendChild(plan);
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:10px;margin-top:14px;';
      var ok = document.createElement('button');
      ok.textContent = '✓ Approve';
      ok.style.cssText = 'flex:1;padding:12px;border:none;border-radius:12px;background:#22c55e;color:#fff;font-size:15px;font-weight:600;cursor:pointer;';
      var no = document.createElement('button');
      no.textContent = '✕ Reject';
      no.style.cssText = 'flex:1;padding:12px;border:none;border-radius:12px;background:#333;color:#eee;font-size:15px;font-weight:600;cursor:pointer;';
      ok.onclick = function () { s.close(); try { onDecision && onDecision(true); } catch (_) {} };
      no.onclick = function () { s.close(); try { onDecision && onDecision(false); } catch (_) {} };
      row.appendChild(ok); row.appendChild(no);
      s.sheet.appendChild(row);
    });
  };

  /* ============ 7. InlineDiff ============ */
  window.jdInlineDiff = function (original, suggested, onDone) {
    var s = openSheet('✏️ Suggested edit', 'Tap a change to accept or reject it.');
    whenUI(function (UI) {
      var d = UI.InlineDiff({
        original: original || '',
        suggested: suggested || '',
        onDone: function (text) { try { onDone && onDone(text); } catch (_) {} }
      });
      s.sheet.appendChild(d);
      var doneBtn = document.createElement('button');
      doneBtn.textContent = 'Done';
      doneBtn.style.cssText = 'width:100%;margin-top:12px;padding:12px;border:none;border-radius:12px;background:#3b82f6;color:#fff;font-size:15px;font-weight:600;cursor:pointer;';
      doneBtn.onclick = function () {
        var t = d.getResult();
        s.close();
        try { onDone && onDone(t); } catch (_) {}
      };
      s.sheet.appendChild(doneBtn);
    });
  };

  /* ============ 8. AIAnswer ============ */
  window.jdAIAnswer = function (opts) {
    var el = null;
    whenUI(function (UI) { el = UI.AIAnswer(opts || {}); });
    return { _ready: function (cb) { whenUI(function () { cb(el); }); }, el: function () { return el; } };
  };

  /* ============ 9. ModelPicker — SKIPPED ============
     The app already has a full model picker. No duplicate. */

  /* ============ EXTRA card: Agent Inbox ============ */
  function tryInjectInbox() {
    if (document.getElementById('jdInboxCard')) return true;
    var anchor = document.getElementById('jdPermCard');
    if (!anchor || !anchor.parentNode) return false;
    var card = document.createElement('div');
    card.className = 'jd-extra-ai-card';
    card.id = 'jdInboxCard';
    var n = getRuns().length;
    card.innerHTML =
      '<h4>📥 Agent Inbox</h4>' +
      '<p>Recent agent runs at a glance.' + (n ? ' <b>' + n + '</b> logged.' : ' No runs logged yet.') + '</p>' +
      '<button class="jd-extra-ai-facts" id="jdInboxOpenBtn">Open inbox</button>';
    anchor.parentNode.insertBefore(card, anchor.nextSibling);
    document.getElementById('jdInboxOpenBtn').addEventListener('click', function () {
      window.jdOpenAgentInbox();
    });
    return true;
  }
  function watchInbox() {
    if (tryInjectInbox()) return;
    var obs = new MutationObserver(function () { if (tryInjectInbox()) obs.disconnect(); });
    obs.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchInbox);
  else watchInbox();
})();
