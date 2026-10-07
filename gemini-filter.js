/* =========================================================
   JepongDevxyz AI — Gemini Model Filter (2026-10-07)
   Per user order: only show gemini-1.5-flash-lite and
   gemini-3.5-flash-lite in the Gemini provider. Removes all
   other Gemini models from the picker.
   Loaded by agent.js. Idempotent.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdGeminiFilterLoaded) return;
  window.__jdGeminiFilterLoaded = true;

  var ALLOWED = ['gemini-1.5-flash-lite', 'gemini-3.5-flash-lite'];

  function isGeminiModel(name) {
    if (!name) return false;
    var n = String(name).toLowerCase();
    return n.indexOf('gemini') !== -1;
  }

  function isAllowed(name) {
    if (!name) return false;
    var n = String(name).toLowerCase().trim();
    return ALLOWED.indexOf(n) !== -1;
  }

  function filterPicker() {
    try {
      /* Find model picker options */
      var options = document.querySelectorAll('[data-model], [data-model-id], .model-option, [role="option"]');
      options.forEach(function (el) {
        var modelName = el.getAttribute('data-model') ||
                        el.getAttribute('data-model-id') ||
                        (el.textContent || '').trim().split('\n')[0];
        if (isGeminiModel(modelName) && !isAllowed(modelName)) {
          el.style.display = 'none';
          el.setAttribute('data-jd-hidden-gemini', '1');
        }
      });
    } catch (e) {}
  }

  /* Run on interval to catch dynamically rendered pickers */
  setInterval(filterPicker, 1500);
  setTimeout(filterPicker, 800);

  /* Also filter via MutationObserver for immediate response */
  try {
    var obs = new MutationObserver(function () { filterPicker(); });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}
})();
