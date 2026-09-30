/* ============================================================
   JepongDevxyz AI — Auto effort mode (runtime, 2026-10-01)
   Jepong: like Muse, the app should pick the response effort
   automatically — but using the existing six levels
   (Instant / Low / Medium / High / Extra / Max).

   Control: a Settings toggle named "Auto Temper" (in the
   "My AI" section). When ON, personalizationSettings.
   intelligence is stored as 'Auto' (persisted by the app's own
   persistPersonalization()).

   Mechanics:
   - Wraps normalizeResponseEffortClient to pass 'Auto' through,
     wraps currentResponseEffort so the amber effort tag shows
     "Auto · <resolved>" while thinking, wraps
     responseEffortIndex so the slider keeps the last manual
     position, and wraps updateResponseEffortUI to render the
     Auto state + sync the Settings toggle.
   - Wraps window.fetch (outside the credits.js wrapper): for
     POST /api/chat JSON bodies with intelligence 'Auto', a
     lightweight heuristic classifies the user's message and
     substitutes the concrete level before the request is sent —
     so the server only ever sees the six known levels and the
     whole existing effort chain works unchanged.
   - Picking any concrete level (slider) while Auto is ON turns
     Auto OFF automatically.

   Additive only; fail-open; idempotent.
   ============================================================ */
(function () {
  'use strict';

  var ROW_ID = 'jdAutoTemperRow';
  var TOGGLE_ID = 'jdAutoTemperToggle';
  var LS_MANUAL = 'jd_effort_manual';

  function autoOn() {
    try {
      return typeof personalizationSettings !== 'undefined' &&
        personalizationSettings &&
        String(personalizationSettings.intelligence || '').toLowerCase() === 'auto';
    } catch (e) { return false; }
  }

  function manualLevel() {
    try {
      var m = window.__jdAutoEffortManual;
      if (m) return m;
      m = null;
      try { m = localStorage.getItem(LS_MANUAL); } catch (e) {}
      return m || 'Instant';
    } catch (e) { return 'Instant'; }
  }

  function setManualLevel(lvl) {
    window.__jdAutoEffortManual = lvl;
    try { localStorage.setItem(LS_MANUAL, lvl); } catch (e) {}
  }

  /* ---------- heuristic classifier (English + Tagalog cues) ---------- */
  function classifyEffort(text) {
    var t = String(text == null ? '' : text);
    var len = t.length;
    var low = t.toLowerCase().trim();
    if (!low) return 'Instant';
    // trivial: greetings / thanks / acknowledgements
    if (len <= 40 && /^(hi|hello|hey|yo|kumusta|kamusta|musta|salamat|thank|thanks|ok|okay|sige|oo|hindi|noted|gets|ge)\b/.test(low)) {
      return 'Instant';
    }
    var code = /(```|function\s*\(|=>|import\s+[\w{]|class\s+\w+|def\s+\w+|<\/?[a-z][^>]*>|select\s+\w+\s+from|npm\s|git\s|traceback|exception|error\b|bug\b|debug)/i.test(t);
    var build = /(gawan mo|gumawa ka|buuin|build|create|generate).{0,50}(app|web|site|code|program|script|system)/i.test(t);
    var deep = /(\bstep by step\b|\bhakbang\b|\bdetailed\b|\bdetalyado\b|\bin detail\b|\bthorough\b|\bpros and cons\b|\bpagkakaiba\b|\bihambing\b|\bkumpara\b|\bcompare\b|\bcontrast\b|\banaly[sz]e\b|\banalysis\b|\bpagsusuri\b|\bessay\b|\bsanaysay\b|\bthesis\b|\bresearch\b|\bpananaliksik\b|explain.*why|\bbakit\b)/i.test(t);
    var questions = (t.match(/\?/g) || []).length;
    if (build || (code && len > 400) || len > 1500) {
      return /(sobrang|napaka|extremely|very complex|\bbuong\b|entire|full|complete)/i.test(t) || len > 3000 ? 'Max' : 'Extra';
    }
    if (code) return 'High';
    if (deep || questions >= 3 || len > 600) return 'High';
    if (questions >= 1 || len > 150) return 'Medium';
    if (len > 60) return 'Low';
    return 'Instant';
  }
  window.__jdClassifyEffort = classifyEffort;

  function lastUserText(body) {
    try {
      var msgs = body && body.messages;
      if (!Array.isArray(msgs)) return '';
      for (var i = msgs.length - 1; i >= 0; i--) {
        var m = msgs[i];
        if (m && m.role === 'user') {
          var c = m.content;
          if (typeof c === 'string') return c;
          if (Array.isArray(c)) {
            return c.map(function (p) {
              return p && (p.text || (p.type === 'text' ? p.content : '')) || '';
            }).join('\n');
          }
          return '';
        }
      }
    } catch (e) {}
    return '';
  }

  /* ---------- Settings toggle ("Auto Temper") ---------- */
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

  function syncAutoTemperToggle() {
    try {
      var tgl = document.getElementById(TOGGLE_ID);
      if (!tgl) return;
      var on = autoOn();
      if (tgl.checked !== on) tgl.checked = on;
      var root = tgl.closest('.squish-switch-root');
      if (root) {
        var want = on ? 'true' : 'false';
        if (root.getAttribute('data-on') !== want) root.setAttribute('data-on', want);
      }
    } catch (e) {}
  }

  function insertAutoTemperRow() {
    try {
      if (document.getElementById(ROW_ID)) { syncAutoTemperToggle(); return true; }
      var group = findMyAiGroup();
      if (!group) return false;
      var row = document.createElement('label');
      row.className = 'settings-toggle-row';
      row.id = ROW_ID;
      row.innerHTML =
        '<i data-lucide="sparkles"></i>' +
        '<span><strong>Auto Temper</strong>' +
        '<small>Automatically pick the effort level (Instant&ndash;Max) for each question</small></span>' +
        '<label class="squish-switch-root"><input id="' + TOGGLE_ID + '" type="checkbox" ' +
        'onchange="toggleJdAutoTemper(this.checked)"><span></span></label>';
      group.appendChild(row);
      if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(row); } catch (e) {} }
      syncAutoTemperToggle();
      return true;
    } catch (e) { return false; }
  }

  window.toggleJdAutoTemper = function (on) {
    try {
      if (typeof window.setResponseEffort !== 'function') return;
      if (on === undefined || on === null) on = !autoOn();
      if (on) {
        try {
          if (typeof personalizationSettings !== 'undefined' && personalizationSettings) {
            var cur = String(personalizationSettings.intelligence || 'Instant');
            if (cur.toLowerCase() !== 'auto') setManualLevel(cur);
          }
        } catch (e) {}
        window.setResponseEffort('Auto');
      } else {
        window.setResponseEffort(manualLevel());
      }
    } catch (e) {}
  };
  // legacy alias (effort-menu button era)
  window.toggleJdAutoEffort = window.toggleJdAutoTemper;

  /* ---------- hooks ---------- */
  function hook() {
    try {
      if (typeof window.normalizeResponseEffortClient !== 'function') return false;
      if (typeof window.currentResponseEffort !== 'function') return false;
      if (typeof window.responseEffortIndex !== 'function') return false;
      if (typeof window.setResponseEffort !== 'function') return false;
      if (typeof window.updateResponseEffortUI !== 'function') return false;
      if (window.__jdAutoEffortHooked) return true;

      var origNorm = window.normalizeResponseEffortClient;
      var origCurrent = window.currentResponseEffort;
      var origIndex = window.responseEffortIndex;
      var origSet = window.setResponseEffort;
      var origUpdate = window.updateResponseEffortUI;

      window.normalizeResponseEffortClient = function (value) {
        if (String(value == null ? '' : value).trim().toLowerCase() === 'auto') return 'Auto';
        return origNorm.apply(this, arguments);
      };

      window.currentResponseEffort = function () {
        if (autoOn()) {
          var r = window.__jdAutoEffortResolved;
          return r ? 'Auto · ' + r : 'Auto';
        }
        return origCurrent.apply(this, arguments);
      };

      window.responseEffortIndex = function (level) {
        if (autoOn()) return origIndex.call(this, manualLevel());
        return origIndex.apply(this, arguments);
      };

      window.setResponseEffort = function (level, options) {
        var raw = String(level == null ? '' : level).trim().toLowerCase();
        if (raw === 'auto') {
          window.__jdAutoEffortResolved = null;
        } else {
          try { setManualLevel(origNorm.call(this, level)); } catch (e) {}
          window.__jdAutoEffortResolved = null;
        }
        return origSet.apply(this, arguments);
      };

      window.updateResponseEffortUI = function () {
        var out = origUpdate.apply(this, arguments);
        try {
          var auto = autoOn();
          if (auto) {
            var label = document.getElementById('responseEffortLabel');
            var menuLevel = document.getElementById('responseEffortMenuLevel');
            var pick = document.getElementById('responseEffortBtn');
            var track = document.getElementById('responseEffortTrack');
            if (label) label.textContent = '✨ Auto';
            if (menuLevel) menuLevel.textContent = '✨ Auto';
            if (pick) pick.title = 'Response effort: Auto (automatic)';
            if (track) track.setAttribute('aria-valuetext', 'Auto');
          }
          syncAutoTemperToggle();
        } catch (e) {}
        return out;
      };

      // Resolve Auto -> concrete level at send time (outside the
      // credits.js fetch wrapper so both compose).
      try {
        var prevFetch = window.fetch;
        if (typeof prevFetch === 'function' && !prevFetch.__jdAutoEffort) {
          var wrappedFetch = function (url, opts) {
            var o = opts;
            try {
              var u = String(url == null ? '' : url);
              if (u.indexOf('/api/chat') !== -1 && o && o.method === 'POST' && typeof o.body === 'string') {
                var b = null;
                try { b = JSON.parse(o.body); } catch (e) {}
                if (b && b.personalization &&
                    String(b.personalization.intelligence || '').toLowerCase() === 'auto') {
                  var lvl = classifyEffort(lastUserText(b));
                  b.personalization.intelligence = lvl;
                  window.__jdAutoEffortResolved = lvl;
                  o = Object.assign({}, o, { body: JSON.stringify(b) });
                }
              }
            } catch (e) {}
            return prevFetch.call(this, url, o);
          };
          wrappedFetch.__jdAutoEffort = true;
          window.fetch = wrappedFetch;
        }
      } catch (e) {}

      window.__jdAutoEffortHooked = true;

      // The settings panel renders lazily — keep the row inserted.
      try {
        insertAutoTemperRow();
        var mo = new MutationObserver(function () { insertAutoTemperRow(); });
        mo.observe(document.documentElement, { childList: true, subtree: true });
        window.__jdAutoTemperObserver = mo;
      } catch (e) {}

      try {
        if (typeof window.updateResponseEffortUI === 'function') window.updateResponseEffortUI();
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
