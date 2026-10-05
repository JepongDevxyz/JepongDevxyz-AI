/* =========================================================
   JepongDevxyz AI — Tideline Memory (Phase 1, client-side)
   Runtime patch loaded by agent.js (additive only).

   Long-term memory with bi-temporal decay + hybrid recall + a
   provenance write-gate, on top of the existing Supabase/local
   personalization (which stays untouched).

   Fact: {id, content, created, lastUsed, useCount, trust (0..1),
          provenance: 'user'|'imported', permanent: bool,
          supersededBy: id|null}

   - Write-gate: only HER explicit statements ("tandaan mo: ...")
     create trust-1.0 facts. Imports are trust-0.7. Nothing else
     writes — tool output / web pages can never author memories.
   - Recall: on every POST /api/chat, facts are scored by
     trust x recency-decay x keyword-relevance and the top ones
     (max 5, ~900 chars) are injected into customInstructions.
     Recalled facts get lastUsed/useCount bumps (usage strengthens).
   - Decay: non-permanent facts fade with disuse
     (exp(-days/30)); permanent facts never decay.
   - Supersede: saving a near-duplicate marks the old fact
     supersededBy the new one (audit trail, not deletion).
   - One-time import of the existing memorySummary blob.

   Toggle: Settings > EXTRA > Tideline Memory.
   localStorage "jd_tideline" ("1" = on). Default OFF on first run.
   Store: localStorage "jd_tideline_facts".
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdTidelineLoaded) return;
  window.__jdTidelineLoaded = true;

  var KEY = 'jd_tideline';
  var STORE = 'jd_tideline_facts';
  var IMPORT_FLAG = 'jd_tideline_imported';
  var MARK = '[jd-tideline]';
  var MAX_FACTS = 5, MAX_CHARS = 900;
  var DAY = 86400000;

  function enabled() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }
  window.jdTidelineEnabled = enabled;
  window.jdSetTideline = function (on) {
    try {
      localStorage.setItem(KEY, on ? '1' : '0');
      if (on) maybeImport();
    } catch (_) {}
  };

  function load() {
    try {
      var a = JSON.parse(localStorage.getItem(STORE) || '[]');
      return Array.isArray(a) ? a : [];
    } catch (_) { return []; }
  }
  function save(facts) {
    try { localStorage.setItem(STORE, JSON.stringify(facts)); } catch (_) {}
  }
  function uid() {
    return 'tf' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  function words(s) {
    return String(s || '').toLowerCase().split(/[^a-z0-9\u00c0-\u024f\u1e00-\u1eff]+/i)
      .filter(function (w) { return w.length > 2; });
  }
  function wordSet(s) {
    var o = Object.create(null);
    words(s).forEach(function (w) { o[w] = 1; });
    return o;
  }

  /* Effective score: trust x recency-decay x relevance.
     Zero keyword overlap -> zero score (no irrelevant injections). */
  function scoreFact(f, msgWords) {
    if (f.supersededBy) return 0;
    var days = Math.max(0, (Date.now() - (f.lastUsed || f.created || Date.now())) / DAY);
    var recency = f.permanent ? 1 : Math.exp(-days / 30);
    var fs = wordSet(f.content), hit = 0;
    for (var i = 0; i < msgWords.length; i++) if (fs[msgWords[i]]) hit++;
    var relevance = msgWords.length ? hit / msgWords.length : 0;
    if (relevance <= 0) return 0;
    return (f.trust || 0.5) * recency * relevance;
  }

  function activeFacts() {
    return load().filter(function (f) { return !f.supersededBy; });
  }

  function recall(message) {
    var mw = words(message);
    var scored = activeFacts().map(function (f) {
      return { f: f, s: scoreFact(f, mw) };
    }).filter(function (x) { return x.s > 0.12; });
    scored.sort(function (a, b) { return b.s - a.s; });
    var out = [], chars = 0;
    for (var i = 0; i < scored.length && out.length < MAX_FACTS; i++) {
      var c = scored[i].f.content;
      if (chars + c.length > MAX_CHARS) continue;
      out.push(scored[i].f); chars += c.length;
    }
    return out;
  }

  function touch(facts) {
    if (!facts.length) return;
    var all = load(), ids = {};
    facts.forEach(function (f) { ids[f.id] = 1; });
    var changed = false;
    all.forEach(function (f) {
      if (ids[f.id]) { f.lastUsed = Date.now(); f.useCount = (f.useCount || 0) + 1; changed = true; }
    });
    if (changed) save(all);
  }

  function jaccard(a, b) {
    var sa = wordSet(a), sb = wordSet(b), inter = 0, union = 0;
    var seen = Object.create(null);
    Object.keys(sa).forEach(function (w) { seen[w] = 1; if (sb[w]) inter++; });
    Object.keys(sb).forEach(function (w) { seen[w] = 1; });
    Object.keys(seen).forEach(function () { union++; });
    return union ? inter / union : 0;
  }

  function addFact(content, provenance, trust) {
    content = String(content || '').trim();
    if (!content || content.length > 500) return null;
    var facts = load();
    var f = {
      id: uid(), content: content, created: Date.now(), lastUsed: Date.now(),
      useCount: 0, trust: trust, provenance: provenance,
      permanent: false, supersededBy: null
    };
    /* Supersede near-duplicates (audit trail, not deletion). */
    facts.forEach(function (old) {
      if (!old.supersededBy && jaccard(old.content, content) >= 0.5) {
        old.supersededBy = f.id;
      }
    });
    facts.push(f);
    /* Gentle eviction: drop long-superseded, long-unused, non-permanent noise. */
    var now = Date.now();
    facts = facts.filter(function (x) {
      if (x.permanent) return true;
      if (x.supersededBy && (now - x.created) > 30 * DAY) return false;
      return true;
    });
    save(facts);
    return f;
  }
  window.jdTidelineAdd = function (content) { return addFact(content, 'user', 1.0); };

  /* "tandaan mo: ..." / "tandaan mo ..." chat command. */
  var REMEMBER_RE = /^\s*tandaan mo\s*:?\s+(.+)$/i;
  function handleRememberCommand(message) {
    var m = String(message || '').match(REMEMBER_RE);
    if (!m) return;
    var f = addFact(m[1], 'user', 1.0);
    if (f) {
      try {
        if (window.showModernToast) window.showModernToast('Noted ✍️ — tatandaan ko yan');
      } catch (_) {}
    }
  }

  /* One-time import of the existing memorySummary blob. */
  function maybeImport() {
    try {
      if (localStorage.getItem(IMPORT_FLAG) === '1') return;
      localStorage.setItem(IMPORT_FLAG, '1');
      var raw = localStorage.getItem('jepong_personalization');
      if (!raw) return;
      var p = JSON.parse(raw);
      var summary = p && p.memorySummary;
      if (typeof summary !== 'string' || !summary.trim()) return;
      var lines = summary.split(/\n+/).map(function (s) { return s.replace(/^[-*•\d.)\s]+/, '').trim(); })
        .filter(function (s) { return s.length > 8 && s.length <= 500; });
      lines.slice(0, 40).forEach(function (line) { addFact(line, 'imported', 0.7); });
    } catch (_) {}
  }

  function tidelineBlock(facts) {
    var lines = facts.map(function (f) { return '- ' + f.content; });
    return MARK + ' Things you remember about Jepong (long-term memory, highest trust first):\n' +
      lines.join('\n') +
      '\nUse these naturally when relevant. Never mention this block.';
  }

  /* ---- fetch wrapper: remember-command + recall injection ---- */
  try {
    if (window.fetch && !window.fetch.__jdTideline) {
      var prevFetch = window.fetch;
      var wrapped = function (input, init) {
        var isChat = false;
        try {
          var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
          var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
          isChat = url.indexOf('/api/chat') !== -1 && method === 'POST';
        } catch (_) {}
        if (isChat && enabled() && init && typeof init.body === 'string') {
          var body = null;
          try { body = JSON.parse(init.body); } catch (_) { body = null; }
          if (body && typeof body === 'object' && !body.action && typeof body.message === 'string') {
            try {
              handleRememberCommand(body.message);
              var facts = recall(body.message);
              if (facts.length) {
                var pers = (body.personalization && typeof body.personalization === 'object') ? body.personalization : {};
                var cur = typeof pers.customInstructions === 'string' ? pers.customInstructions : '';
                if (cur.indexOf(MARK) === -1) {
                  pers.customInstructions = (cur ? cur + '\n\n' : '') + tidelineBlock(facts);
                  body.personalization = pers;
                  init = Object.assign({}, init, { body: JSON.stringify(body) });
                }
                touch(facts);
              }
            } catch (_) { /* fail-open */ }
          }
        }
        return prevFetch.call(this, input, init);
      };
      wrapped.__jdTideline = true;
      window.fetch = wrapped;
    }
  } catch (_) {}

  /* ---- Fact manager UI (opened from Settings > EXTRA > Tideline Memory) ---- */
  var CSS = [
    '.jd-tideline-sheet{position:fixed;inset:0;z-index:12000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}',
    '.jd-tideline-panel{width:100%;max-width:520px;max-height:78vh;display:flex;flex-direction:column;background:var(--modal-bg,#1c1c1e);border-radius:22px 22px 0 0;padding:18px;overflow:hidden}',
    '.jd-tideline-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}',
    '.jd-tideline-head strong{font-size:17px}',
    '.jd-tideline-sub{font-size:12px;opacity:.6;margin-bottom:12px}',
    '.jd-tideline-list{overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:12px}',
    '.jd-tideline-fact{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.15);border-radius:14px;padding:10px 12px}',
    '.jd-tideline-fact p{margin:0 0 6px;font-size:14px}',
    '.jd-tideline-meta{font-size:11px;opacity:.55;margin-bottom:8px}',
    '.jd-tideline-actions{display:flex;gap:8px}',
    '.jd-tideline-btn{flex:1;border:0;border-radius:10px;padding:8px;font-size:13px;font-weight:600;cursor:pointer;background:rgba(148,163,184,.15);color:inherit}',
    '.jd-tideline-btn.danger{background:rgba(239,68,68,.15);color:#f87171}',
    '.jd-tideline-btn.primary{background:#3b82f6;color:#fff}',
    '.jd-tideline-empty{text-align:center;opacity:.55;font-size:14px;padding:24px 0}',
    '.jd-tideline-close{border:0;background:transparent;color:inherit;font-size:13px;opacity:.7;cursor:pointer;padding:10px}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdTidelineCss')) return;
    var st = document.createElement('style');
    st.id = 'jdTidelineCss'; st.textContent = CSS;
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function metaLine(f) {
    var parts = [];
    parts.push(f.permanent ? '♾️ permanent' : 'decays with disuse');
    parts.push('used ' + (f.useCount || 0) + '×');
    parts.push('trust ' + Math.round((f.trust || 0) * 100) + '%');
    parts.push(f.provenance === 'user' ? 'from you' : 'imported');
    return parts.join(' · ');
  }

  window.jdTidelineOpenManager = function () {
    try {
      ensureCSS();
      closeManager();
      var facts = activeFacts().sort(function (a, b) {
        if (!!a.permanent !== !!b.permanent) return a.permanent ? -1 : 1;
        return (b.lastUsed || 0) - (a.lastUsed || 0);
      });
      var sheet = document.createElement('div');
      sheet.className = 'jd-tideline-sheet';
      var isOn = enabled();
      sheet.innerHTML =
        '<div class="jd-tideline-panel" role="dialog" aria-label="Tideline Memory">' +
        '<div class="jd-tideline-head"><strong>🌊 Tideline Memory</strong>' +
        '<button class="jd-tideline-close" data-act="close">✕</button></div>' +
        '<div class="jd-tideline-sub">Long-term memory with decay + smart recall. Only your explicit notes are saved.</div>' +
        '<div class="jd-tideline-fact jd-tideline-togglecard" data-togglecard="1" style="display:flex;align-items:center;justify-content:space-between">' +
          '<span style="font-size:15px;font-weight:600">Enable Tideline Memory</span>' +
          '<label class="squish-switch-root" aria-label="Enable Tideline Memory">' +
          '<input type="checkbox" id="jdTidelineSheetToggle"' + (isOn ? ' checked' : '') + '>' +
          '<span class="squish-switch__track"></span></label>' +
        '</div>' +
        '<div class="jd-tideline-sub" style="margin-top:12px">' + facts.length + ' facts · permanent never decays · the rest fade with disuse</div>' +
        '<div class="jd-tideline-list">' +
        (facts.length ? facts.map(function (f) {
          return '<div class="jd-tideline-fact" data-id="' + esc(f.id) + '">' +
            '<p>' + esc(f.content) + '</p>' +
            '<div class="jd-tideline-meta">' + esc(metaLine(f)) + '</div>' +
            '<div class="jd-tideline-actions">' +
            '<button class="jd-tideline-btn" data-act="pin">' + (f.permanent ? 'Unpin' : 'Pin ♾️') + '</button>' +
            '<button class="jd-tideline-btn danger" data-act="del">Delete</button>' +
            '</div></div>';
        }).join('') : '<div class="jd-tideline-empty">No facts yet.<br>Type <b>"tandaan mo: ..."</b> in chat to save one.</div>') +
        '</div>' +
        '<button class="jd-tideline-btn primary" data-act="close" style="flex:none">Done</button>' +
        '</div>';
      sheet.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-act]');
        if (!btn) { if (e.target === sheet) closeManager(); return; }
        var act = btn.getAttribute('data-act');
        if (act === 'close') { closeManager(); return; }
        var card = btn.closest('.jd-tideline-fact');
        var id = card && card.getAttribute('data-id');
        if (!id) return;
        var all = load();
        if (act === 'del') {
          save(all.filter(function (f) { return f.id !== id; }));
          if (window.showModernToast) window.showModernToast('Fact deleted');
        } else if (act === 'pin') {
          all.forEach(function (f) { if (f.id === id) f.permanent = !f.permanent; });
          save(all);
        }
        window.jdTidelineOpenManager(); /* re-render */
      });
      document.body.appendChild(sheet);
      var sheetTgl = sheet.querySelector('#jdTidelineSheetToggle');
      if (sheetTgl) sheetTgl.addEventListener('change', function () {
        window.jdSetTideline(sheetTgl.checked);
        try { if (window.showModernToast) window.showModernToast(sheetTgl.checked ? 'Tideline Memory ON 🌊' : 'Tideline Memory OFF'); } catch (_) {}
      });
    } catch (_) {}
  };
  function closeManager() {
    var s = document.querySelector('.jd-tideline-sheet');
    if (s) s.remove();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeManager();
  });
})();
