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
})();
