/* =========================================================
   JepongDevxyz AI — Slop Filter (anti-slop quality gate, Layer 1)
   Runtime patch loaded by agent.js (additive only).

   Deterministic post-generation filter: runs AFTER the model finishes
   writing (never in the prompt — priming backfire: naming a banned
   phrase in the instruction raises its probability).

   Surgical, tag-safe fixes on settled assistant messages:
     1. strips leading banned openers ("As an AI...", "Great question!")
     2. removes "as an AI language model" clauses mid-text
     3. collapses 4+ consecutive emoji runs to 2
   Zero token cost, <100ms. Never touches PRE/CODE blocks.

   Toggle: Settings > EXTRA > Slop Filter.
   localStorage key "jd_slop_gate" ("1" = on). Default OFF on first run
   (her standing rule: all toggles off by default).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSlopGateLoaded) return;
  window.__jdSlopGateLoaded = true;

  var KEY = 'jd_slop_gate';
  function enabled() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }
  window.jdSlopGateEnabled = enabled;
  window.jdSetSlopGate = function (on) {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) {}
  };

  /* Leading banned openers — the whole matched prefix is removed. */
  var OPENER_RE = /^(as an ai( language model)?,?\s+|great question!?\s+|excellent question!?\s+|that's a (great|good) question!?\s+|good question!?\s+|i'm glad you asked!?\s+)/i;
  /* Mid-text identity disclaimers. */
  var AI_CLAUSE_RE = /[,.\s]*\bas an ai( language model)?\b[,.\s]*/gi;

  function isEmojiChar(cp) {
    return (cp >= 0x1F300 && cp <= 0x1FAFF) ||
           (cp >= 0x2600 && cp <= 0x27BF) ||
           (cp >= 0x2B00 && cp <= 0x2BFF) ||
           cp === 0xFE0F || cp === 0x200D ||
           (cp >= 0x1F1E6 && cp <= 0x1F1FF);
  }

  /* Collapse runs of 4+ emojis to the first 2 (code-point safe). */
  function collapseEmojiRuns(s) {
    var chars = Array.from(s);
    var out = [], run = [];
    function flush() {
      if (run.length >= 4) out.push(run.slice(0, 2).join(''));
      else out.push(run.join(''));
      run = [];
    }
    for (var i = 0; i < chars.length; i++) {
      var cp = chars[i].codePointAt(0);
      if (isEmojiChar(cp)) run.push(chars[i]);
      else { flush(); out.push(chars[i]); }
    }
    flush();
    return out.join('');
  }

  function textNodes(el) {
    var out = [];
    try {
      var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentElement;
          while (p && p !== el) {
            var t = p.tagName;
            if (t === 'PRE' || t === 'CODE' || t === 'SCRIPT' || t === 'STYLE') return NodeFilter.FILTER_REJECT;
            p = p.parentElement;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n;
      while ((n = walker.nextNode())) out.push(n);
    } catch (_) {}
    return out;
  }

  /* Returns number of fixes applied. */
  function cleanContent(contentEl) {
    var fixes = 0;
    var nodes = textNodes(contentEl);
    if (!nodes.length) return 0;

    /* 1. Leading banned opener — first non-empty text node only. */
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].nodeValue;
      if (!t || !t.trim()) continue;
      var m = t.match(OPENER_RE);
      if (m) {
        /* Only strip when the opener is at the very start of the message. */
        var before = '';
        for (var j = 0; j < i; j++) before += nodes[j].nodeValue;
        if (!before.trim()) {
          nodes[i].nodeValue = t.slice(m[0].length).replace(/^\s+/, '');
          /* Capitalize the new first letter for a clean look. */
          nodes[i].nodeValue = nodes[i].nodeValue.replace(/^[a-z]/, function (c) { return c.toUpperCase(); });
          fixes++;
        }
      }
      break;
    }

    /* 2 + 3. Mid-text AI clauses + emoji runs, all text nodes. */
    nodes.forEach(function (n) {
      var v = n.nodeValue, nv = v;
      nv = nv.replace(AI_CLAUSE_RE, ' ');
      if (nv !== v) fixes++;
      v = nv;
      nv = collapseEmojiRuns(v);
      if (nv !== v) fixes++;
      if (nv !== n.nodeValue) n.nodeValue = nv;
    });
    return fixes;
  }

  function botContentEl(botEl) {
    if (!botEl || !botEl.querySelector) return null;
    return botEl.querySelector(':scope > div:not(.bot-actions):not(.jd-ai-interaction):not(.jd-message-more)');
  }

  function sig(el) {
    var t = el.textContent || '';
    return t.length + ':' + t.slice(0, 64);
  }

  function maybeClean(botEl) {
    if (!enabled()) return;
    if (!botEl || botEl.nodeType !== 1) return;
    try {
      if (botEl.__jdSlopSig === sig(botEl)) return; /* already cleaned this version */
      var content = botContentEl(botEl);
      if (!content || !content.textContent || content.textContent.trim().length < 20) return;
      var fixes = cleanContent(content);
      botEl.__jdSlopSig = sig(botEl);
      if (fixes > 0 && window.__jdDebug) console.log('[slop-gate] cleaned', fixes, 'issue(s)');
    } catch (_) { /* fail-open: never break rendering */ }
  }

  function schedule(botEl) {
    try {
      if (botEl.__jdSlopTimer) clearTimeout(botEl.__jdSlopTimer);
      /* 2.2s after the last mutation = streaming settled. */
      botEl.__jdSlopTimer = setTimeout(function () { maybeClean(botEl); }, 2200);
    } catch (_) {}
  }

  function wire() {
    var box = document.getElementById('chatBox');
    if (!box || box.__jdSlopWired) return;
    box.__jdSlopWired = true;
    function handle(el) {
      if (!el || el.nodeType !== 1) return;
      if (el.classList && el.classList.contains('msg') && el.classList.contains('bot')) { schedule(el); return; }
      if (el.querySelectorAll) {
        var bots = el.querySelectorAll('.msg.bot');
        for (var i = 0; i < bots.length; i++) schedule(bots[i]);
      }
    }
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.type === 'childList') {
            m.addedNodes.forEach(handle);
          } else if (m.type === 'characterData') {
            var t = m.target.parentElement;
            var bot = t && t.closest ? t.closest('.msg.bot') : null;
            if (bot) schedule(bot);
          }
        });
      }).observe(box, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
    /* Clean anything already settled (restored history). */
    try {
      var existing = box.querySelectorAll('.msg.bot');
      for (var i = 0; i < existing.length; i++) schedule(existing[i]);
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else { wire(); }
  /* The chat box may mount late — retry wiring on an interval until found. */
  var bootTries = 0;
  var bootTimer = setInterval(function () {
    if (document.getElementById('chatBox')) { wire(); clearInterval(bootTimer); }
    else if (++bootTries > 40) clearInterval(bootTimer);
  }, 500);
})();
