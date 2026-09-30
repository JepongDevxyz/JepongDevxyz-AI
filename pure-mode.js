/* ============================================================
   JepongDevxyz AI — Pure Mode (runtime, 2026-10-01)
   Jepong: a Settings toggle named "Pure Mode". When ON, no
   activity statuses are shown while the AI works — only a
   simple three-dot typing indicator (like the Muse app).

   - Settings toggle row in the "My AI" section (same pattern
     as the app's own toggle rows). Persisted in localStorage
     (jd_pure_mode).
   - When ON: body.jd-pure-mode hides #activeAiIndicator (the
     whole activity card) and a .jd-pure-typing bubble (three
     animated dots) is shown in its place while the request is
     in flight. Wraps showAIIndicator / removeAIIndicator /
     finishAIIndicator so the dots track the real lifecycle.
   - Toggling mid-request swaps immediately.

   Additive only; fail-open; idempotent.
   ============================================================ */
(function () {
  'use strict';

  var ROW_ID = 'jdPureModeRow';
  var TOGGLE_ID = 'jdPureModeToggle';
  var DOTS_ID = 'jdPureTyping';
  var CSS_ID = 'jdPureModeCss';
  var LS_KEY = 'jd_pure_mode';

  function pureOn() {
    try { return localStorage.getItem(LS_KEY) === '1'; }
    catch (e) { return false; }
  }
  window.jdPureModeOn = pureOn;

  function ensureCss() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var s = document.createElement('style');
      s.id = CSS_ID;
      s.textContent =
        'body.jd-pure-mode #activeAiIndicator{display:none!important}' +
        '.jd-pure-typing{display:inline-flex;align-items:center;gap:7px;' +
        'padding:12px 18px;border-radius:18px;margin:10px 0;align-self:flex-start;' +
        'background:rgba(128,128,128,.14);color:inherit}' +
        '.jd-pure-typing i{width:8px;height:8px;border-radius:50%;' +
        'background:currentColor;opacity:.3;animation:jdPureDot 1.3s infinite}' +
        '.jd-pure-typing i:nth-child(2){animation-delay:.18s}' +
        '.jd-pure-typing i:nth-child(3){animation-delay:.36s}' +
        '@keyframes jdPureDot{0%,60%,100%{opacity:.25;transform:translateY(0)}' +
        '30%{opacity:1;transform:translateY(-3px)}}';
      document.head.appendChild(s);
    } catch (e) {}
  }

  function showDots() {
    try {
      ensureCss();
      if (document.getElementById(DOTS_ID)) return;
      var anchor = document.getElementById('activeAiIndicator');
      var bubble = document.createElement('div');
      bubble.id = DOTS_ID;
      bubble.className = 'jd-pure-typing';
      bubble.setAttribute('role', 'status');
      bubble.setAttribute('aria-label', 'Muse is working');
      bubble.innerHTML = '<i></i><i></i><i></i>';
      if (anchor && anchor.parentElement) {
        anchor.parentElement.insertBefore(bubble, anchor.nextSibling);
        // The card carries inline display:block !important, which beats
        // stylesheets — hide it via an inline override instead.
        try { anchor.style.setProperty('display', 'none', 'important'); } catch (e2) {}
      } else {
        var box = document.querySelector('.chat-box') || document.body;
        box.appendChild(bubble);
      }
    } catch (e) {}
  }

  function hideDots() {
    try {
      var b = document.getElementById(DOTS_ID);
      if (b) b.remove();
    } catch (e) {}
  }

  function applyPureMode(on) {
    try {
      document.body.classList.toggle('jd-pure-mode', !!on);
      var card = document.getElementById('activeAiIndicator');
      if (on) {
        if (card) showDots();
      } else {
        hideDots();
        // restore the card if pure was switched off mid-request
        if (card) {
          try { card.style.setProperty('display', 'block', 'important'); } catch (e2) {}
        }
      }
    } catch (e) {}
  }

  window.toggleJdPureMode = function (on) {
    try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (e) {}
    applyPureMode(on);
    syncPureModeToggle();
  };

  /* ---------- Settings toggle row ---------- */
  function findMyAiGroup() {
    try {
      var modal = document.getElementById('settingsModal');
      if (!modal) return null;
      var heads = modal.querySelectorAll('h3.settings-section-label');
      for (var i = 0; i < heads.length; i++) {
        if (heads[i].textContent.trim() === 'My AI') {
          var sib = heads[i].nextElementSibling;
          while (sib) {
            if (sib.classList && sib.classList.contains('settings-card-group')) return sib;
            sib = sib.nextElementSibling;
          }
        }
      }
    } catch (e) {}
    return null;
  }

  function syncPureModeToggle() {
    try {
      var tgl = document.getElementById(TOGGLE_ID);
      if (!tgl) return;
      var on = pureOn();
      if (tgl.checked !== on) tgl.checked = on;
      var root = tgl.closest('.squish-switch-root');
      if (root) {
        var want = on ? 'true' : 'false';
        if (root.getAttribute('data-on') !== want) root.setAttribute('data-on', want);
      }
    } catch (e) {}
  }

  function insertPureModeRow() {
    try {
      if (document.getElementById(ROW_ID)) { syncPureModeToggle(); return true; }
      var group = findMyAiGroup();
      if (!group) return false;
      var row = document.createElement('label');
      row.className = 'settings-toggle-row';
      row.id = ROW_ID;
      row.innerHTML =
        '<i data-lucide="ellipsis"></i>' +
        '<span><strong>Pure Mode</strong>' +
        '<small>Hide activity statuses &mdash; show only a typing indicator</small></span>' +
        '<label class="squish-switch-root"><input id="' + TOGGLE_ID + '" type="checkbox" ' +
        'onchange="toggleJdPureMode(this.checked)"><span></span></label>';
      // keep it right after the Auto Temper row when present
      var temper = document.getElementById('jdAutoTemperRow');
      if (temper && temper.parentElement === group && temper.nextSibling) {
        group.insertBefore(row, temper.nextSibling);
      } else {
        group.appendChild(row);
      }
      if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(row); } catch (e) {} }
      syncPureModeToggle();
      return true;
    } catch (e) { return false; }
  }

  /* ---------- hooks ---------- */
  function hook() {
    try {
      if (typeof window.showAIIndicator !== 'function') return false;
      if (window.__jdPureModeHooked) return true;

      var origShow = window.showAIIndicator;
      var origRemove = window.removeAIIndicator;
      var origFinish = window.finishAIIndicator;

      window.showAIIndicator = function () {
        var out = origShow.apply(this, arguments);
        try { if (pureOn()) showDots(); } catch (e) {}
        return out;
      };
      if (typeof origRemove === 'function') {
        window.removeAIIndicator = function () {
          var out = origRemove.apply(this, arguments);
          try { hideDots(); } catch (e) {}
          return out;
        };
      }
      if (typeof origFinish === 'function') {
        window.finishAIIndicator = function () {
          var out = origFinish.apply(this, arguments);
          try { hideDots(); } catch (e) {}
          return out;
        };
      }

      window.__jdPureModeHooked = true;
      ensureCss();
      applyPureMode(pureOn());

      try {
        insertPureModeRow();
        var mo = new MutationObserver(function () { insertPureModeRow(); });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        window.__jdPureModeObserver = mo;
      } catch (e) {}
      return true;
    } catch (e) { return false; }
  }

  if (!hook()) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (hook() || tries > 40) clearInterval(iv);
    }, 250);
  }
})();
