/* =========================================================
   JepongDevxyz AI — Per-Model Optimizations (2026-10-05)
   Unlocks each model's full potential with tailored instructions.
   Patches fetch to /api/chat, appending model-specific optimization
   to the system prompt based on the selected model.
   Loaded by agent.js. Idempotent.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdModelOptimizeLoaded) return;
  window.__jdModelOptimizeLoaded = true;

  var OPTIMIZATIONS = {
    'muse-spark-1.1': ' MODEL OPTIMIZATION (Muse Spark 1.1 - Full Potential):' +
      ' You are running at maximum capability.' +
      ' Think step-by-step for complex problems before answering.' +
      ' For coding: write clean, production-ready code with proper error handling and comments.' +
      ' For explanations: be precise and thorough, use concrete examples.' +
      ' For creative tasks: be original and engaging.' +
      ' Always verify reasoning on math, logic, and factual claims.' +
      ' If uncertain, reason through alternatives explicitly before concluding.' +
      ' Match the user\'s language (Tagalog/English) naturally.' +
      ' Be direct and efficient — no filler, no unnecessary preamble.' +
      ' Give the best answer you are capable of, not a safe average one.'
  };

  function getOptimization(model) {
    if (!model) return '';
    var key = String(model).toLowerCase().trim();
    return OPTIMIZATIONS[key] || '';
  }

  var origFetch = window.fetch;
  window.fetch = function (url, opts) {
    try {
      var urlStr = String(url || '');
      if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body) {
        var body = null;
        try { body = JSON.parse(opts.body); } catch (e) {}
        if (body && typeof body === 'object' && body.model) {
          var opt = getOptimization(body.model);
          if (opt) {
            body.personalization = body.personalization || {};
            var existing = body.personalization.customInstructions || '';
            if (existing.indexOf('MODEL OPTIMIZATION') === -1) {
              body.personalization.customInstructions =
                (existing ? existing + '\n\n' : '') + opt;
              opts.body = JSON.stringify(body);
            }
          }
        }
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };
})();
