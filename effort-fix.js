/* =========================================================
   JepongDevxyz AI — Effort Level System Fix
   Runtime patch loaded by agent.js (additive only).

   Ensures the 6 effort levels (Instant/Low/Medium/High/Extra/Max)
   actually work by injecting explicit speed/depth instructions
   into every /api/chat call based on the selected effort.

   - Instant: Fastest, direct, minimal reasoning
   - Low: Quick with light verification
   - Medium: Balanced speed and depth
   - High: Deliberate, thorough reasoning
   - Extra: Deep analysis and verification
   - Max: Maximum deliberation, most thorough
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdEffortFixLoaded) return;
  window.__jdEffortFixLoaded = true;

  var EFFORT_INSTRUCTIONS = {
    'instant': [
      'EFFORT LEVEL: INSTANT (fastest).',
      'Respond IMMEDIATELY with the most direct answer.',
      'No lengthy reasoning, no overthinking. Be concise.',
      'If tools are needed, use them quickly and answer directly.',
      'Prioritize speed over exhaustive detail.'
    ].join(' '),
    'low': [
      'EFFORT LEVEL: LOW.',
      'Respond quickly with light reasoning.',
      'Do a quick verification of key facts, then answer.',
      'Be helpful but don\'t overthink.'
    ].join(' '),
    'medium': [
      'EFFORT LEVEL: MEDIUM (balanced).',
      'Balance speed and depth. Think through the question,',
      'provide a solid answer with reasonable detail.'
    ].join(' '),
    'high': [
      'EFFORT LEVEL: HIGH.',
      'Be deliberate and thorough. Reason carefully,',
      'check your work, provide detailed explanations.',
      'Quality over speed.'
    ].join(' '),
    'extra': [
      'EFFORT LEVEL: EXTRA.',
      'Deep analysis and verification. Think step-by-step,',
      'consider edge cases, verify facts, provide comprehensive answers.'
    ].join(' '),
    'max': [
      'EFFORT LEVEL: MAX (maximum).',
      'Maximum deliberation and verification.',
      'Think very carefully, analyze deeply, verify everything,',
      'provide the most thorough and accurate answer possible.'
    ].join(' ')
  };

  function getEffortLevel() {
    try {
      // Try multiple sources
      if (typeof window.currentResponseEffort !== 'undefined' && window.currentResponseEffort) {
        return String(window.currentResponseEffort).toLowerCase();
      }
      if (typeof personalizationSettings !== 'undefined' && personalizationSettings) {
        var intel = personalizationSettings.intelligence;
        if (intel) return String(intel).toLowerCase();
      }
      try {
        var saved = localStorage.getItem('jepong_effort_level');
        if (saved) return String(saved).toLowerCase();
      } catch (e) {}
      return 'instant';
    } catch (e) { return 'instant'; }
  }

  // Patch fetch to inject effort instructions
  var origFetch = window.fetch;
  window.fetch = function (url, opts) {
    try {
      var urlStr = String(url || '');
      if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body) {
        var body = null;
        try { body = JSON.parse(opts.body); } catch (e) {}
        if (body && typeof body === 'object') {
          body.personalization = body.personalization || {};
          var existing = body.personalization.customInstructions || '';
          var effort = getEffortLevel();
          var effortInstr = EFFORT_INSTRUCTIONS[effort] || EFFORT_INSTRUCTIONS['instant'];
          // Append effort instruction if not already present
          if (existing.indexOf('EFFORT LEVEL:') === -1) {
            body.personalization.customInstructions =
              (existing ? existing + '\n\n' : '') + effortInstr;
            opts.body = JSON.stringify(body);
          }
        }
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };
})();
