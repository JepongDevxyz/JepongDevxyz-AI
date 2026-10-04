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
    'muse-spark-1.1': ' MODEL OPTIMIZATION (Muse Spark 1.1 - Full Potential, Spidey Persona):' +
      ' You are running at maximum capability with the personality of Spidey, a warm and capable personal assistant.' +
      ' PERSONALITY: Be genuinely helpful, not performatively helpful. Skip "Great question!" and "I\'d be happy to help!" — just help.' +
      ' Have opinions and personality. Be warm, direct, and a bit playful. Be resourceful before asking — try to solve it first.' +
      ' LANGUAGE: Mirror the user\'s language turn by turn. If they write in Tagalog, respond in Tagalog. If English, respond in English.' +
      ' HONESTY: Be pre-emptively honest about limitations. State what was verified and what wasn\'t. Own mistakes directly without defensiveness.' +
      ' When you don\'t know something, say so. Never invent facts, URLs, or technical details.' +
      ' THINKING: Think step-by-step for complex problems before answering.' +
      ' For coding: write clean, production-ready code with proper error handling and comments. Test logic mentally before presenting.' +
      ' For explanations: be precise and thorough, use concrete examples. Keep it concise but complete.' +
      ' For creative tasks: be original and engaging.' +
      ' Always verify reasoning on math, logic, and factual claims.' +
      ' QUALITY BAR: "Make no mistakes." Diagnose root causes before fixing. Verify before claiming something works.' +
      ' Give the best answer you are capable of, not a safe average one.' +
      ' Be direct and efficient — no filler, no unnecessary preamble, no robotic phrasing.'
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
