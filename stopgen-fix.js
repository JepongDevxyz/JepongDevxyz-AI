/* ============================================================
   JepongDevxyz AI — stop-generation wiring fixes (2026-10-01)
   https://jepong-devxyz-ai.vercel.app/

   Two bugs fixed (additive only, idempotent):

   1) Bible mode (processBiblePrompt) never called
      updateGenerationActionButton: no stop visual appeared on the send
      button, isAIGenerating stayed false, and the generation could not be
      cancelled at all. This patch wires it: the stop visual shows while a
      Bible answer streams, and tapping it aborts the in-flight fetch via
      an AbortController injected (chain-safe) into the Bible /api/chat
      request. Normal chat flow is untouched.

   2) Fallback stop visual: the send->stop morph normally comes from
      window.JDReactBits.setPromptBusy (reactbits-micro.js). If that file
      ever fails to load, updateGenerationActionButton still had no visual
      effect (the `generating` class has no CSS). The wrapper below applies
      the arrow->square morph + data-busy directly in that case only.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdStopGenFix) return;
  window.__jdStopGenFix = true;

  // Exact endpoints of reactbits-micro.js's arrow<->square morph
  // (PB_ARROW_UP / PB_SQUARE), used ONLY as a fallback visual.
  var ARROW_D = 'M12.00 4.50L18.50 11.00L14.25 11.00L14.25 19.50L9.75 19.50L9.75 11.00L5.50 11.00Z';
  var SQUARE_D = 'M12.00 6.00L18.00 6.00L18.00 12.00L18.00 18.00L6.00 18.00L6.00 12.00L6.00 6.00Z';

  function setStopVisual(active) {
    try {
      var bar = document.getElementById('promptBar');
      var path = document.getElementById('promptBarSendPath');
      if (bar) bar.toggleAttribute('data-busy', !!active);
      if (path) path.setAttribute('d', active ? SQUARE_D : ARROW_D);
    } catch (_) {}
  }

  function jdBitsMissing() {
    return !window.JDReactBits || typeof window.JDReactBits.setPromptBusy !== 'function';
  }

  /* ---------- 2) fallback visual on updateGenerationActionButton ---------- */
  function wrapUpdateBtn() {
    if (typeof window.updateGenerationActionButton !== 'function') return false;
    if (window.updateGenerationActionButton.__jdStopGenWrapped) return true;
    var orig = window.updateGenerationActionButton;
    var wrapped = function (active, stopping) {
      var r = orig.apply(this, arguments);
      // Only step in when the real morph provider is absent; otherwise the
      // ReactBits animation owns the glyph (no double-driving).
      if (jdBitsMissing()) setStopVisual(!!active);
      return r;
    };
    wrapped.__jdStopGenWrapped = true;
    window.updateGenerationActionButton = wrapped;
    return true;
  }

  /* ---------- 1) Bible mode wiring ---------- */
  var bibleController = null;

  function wrapCancel() {
    if (typeof window.cancelAIResponse !== 'function') return false;
    if (window.cancelAIResponse.__jdStopGenWrapped) return true;
    var orig = window.cancelAIResponse;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try { if (bibleController) bibleController.abort('user_cancelled'); } catch (_) {}
      return r;
    };
    wrapped.__jdStopGenWrapped = true;
    window.cancelAIResponse = wrapped;
    return true;
  }

  function wrapBible() {
    if (typeof window.processBiblePrompt !== 'function') return false;
    if (window.processBiblePrompt.__jdStopGenWrapped) return true;
    var orig = window.processBiblePrompt;
    var wrapped = function () {
      var self = this, args = arguments;
      bibleController = new AbortController();
      // The fetch wrapper below picks this up and attaches its signal.
      window.__jdBibleAbort = bibleController;
      try { window.updateGenerationActionButton(true, false); } catch (_) {}
      var done = function () {
        bibleController = null;
        window.__jdBibleAbort = null;
        try { window.updateGenerationActionButton(false, false); } catch (_) {}
      };
      var r;
      try {
        r = orig.apply(self, args);
      } catch (e) {
        done();
        throw e;
      }
      if (r && typeof r.then === 'function') {
        return r.then(
          function (v) { done(); return v; },
          function (e) { done(); throw e; }
        );
      }
      done();
      return r;
    };
    wrapped.__jdStopGenWrapped = true;
    window.processBiblePrompt = wrapped;
    return true;
  }

  // Chain-safe fetch wrapper: attaches the Bible abort signal to Bible-mode
  // /api/chat POSTs only. Preserves every sibling wrapper's marker.
  function wrapFetch() {
    if (typeof window.fetch !== 'function') return false;
    if (window.fetch.__jdStopGen) return true;
    var origFetch = window.fetch;
    var wrapped = function (input, init) {
      try {
        var ctl = window.__jdBibleAbort;
        if (ctl) {
          var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
          var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
          if (url.indexOf('/api/chat') !== -1 && method === 'POST' &&
              init && typeof init.body === 'string' && !init.signal &&
              init.body.indexOf('"mode":"custom"') !== -1 &&
              init.body.indexOf('Biblical Scholar') !== -1) {
            init = Object.assign({}, init, { signal: ctl.signal });
          }
        }
      } catch (_) {}
      return origFetch.call(this, input, init);
    };
    wrapped.__jdStopGen = true;
    if (origFetch.__jdCreditsGated) wrapped.__jdCreditsGated = true;
    if (origFetch.__jdConnectorBridge) wrapped.__jdConnectorBridge = true;
    if (origFetch.__jdPluginInject) wrapped.__jdPluginInject = true;
    if (origFetch.__jdAutoEffort) wrapped.__jdAutoEffort = true;
    window.fetch = wrapped;
    return true;
  }

  // index.html defines these globals in classic scripts; retry until wired.
  var tries = 0;
  function boot() {
    tries++;
    var a = wrapUpdateBtn();
    var b = wrapCancel();
    var c = wrapBible();
    var d = wrapFetch();
    if ((a && b && c && d) || tries > 120) return;
    setTimeout(boot, 250);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
