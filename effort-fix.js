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

   SPECIAL RULES (per user request 2026-10-03):
   - Pure Mode ON: Everything is FAST even on Max (speed prioritized)
   - Instant + Fast Answer ON: REALLY fast (maximum speed mode)
   - Activity Status: effort instructions sync with activity display
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

  function isPureModeOn() {
    try {
      if (typeof window.isPureMode !== 'undefined') return !!window.isPureMode;
      try {
        var v = localStorage.getItem('jepong_pure_mode');
        if (v !== null) return v === 'true' || v === '1';
      } catch (e) {}
      // Check via personalizationSettings
      if (typeof personalizationSettings !== 'undefined' && personalizationSettings) {
        if (typeof personalizationSettings.pureMode !== 'undefined') {
          return !!personalizationSettings.pureMode;
        }
      }
      return false;
    } catch (e) { return false; }
  }

  function isFastAnswerOn() {
    try {
      if (typeof personalizationSettings !== 'undefined' && personalizationSettings) {
        return !!personalizationSettings.fastAnswers;
      }
      return false;
    } catch (e) { return false; }
  }

  function isActivityStatusOn() {
    try {
      // Activity status shows thinking process; sync effort with it
      if (typeof window.jdActivityStatusEnabled !== 'undefined') {
        return !!window.jdActivityStatusEnabled;
      }
      try {
        var v = localStorage.getItem('jepong_activity_status');
        if (v !== null) return v === 'true' || v === '1';
      } catch (e) {}
      return true; // Default: assume on (most users have it on)
    } catch (e) { return true; }
  }

  function getEffortInstruction() {
    var effort = getEffortLevel();
    var pureMode = isPureModeOn();
    var fastAnswer = isFastAnswerOn();

    // RULE 1: Pure Mode ON = everything FAST even on Max
    if (pureMode) {
      return [
        'EFFORT OVERRIDE: PURE MODE IS ON.',
        'Prioritize SPEED above all else, even on higher effort levels.',
        'Give direct, concise answers. Skip lengthy reasoning.',
        'Be fast and efficient. Quality matters but speed comes first in Pure Mode.'
      ].join(' ');
    }

    // RULE 2: Instant + Fast Answer = REALLY fast
    if (effort === 'instant' && fastAnswer) {
      return [
        'EFFORT LEVEL: INSTANT + FAST ANSWER (maximum speed mode).',
        'Respond AS FAST AS HUMANLY POSSIBLE.',
        'Absolute minimum reasoning. Direct answer only.',
        'No preamble, no fluff. Just the answer, immediately.'
      ].join(' ');
    }

    // Normal effort instructions
    return EFFORT_INSTRUCTIONS[effort] || EFFORT_INSTRUCTIONS['instant'];
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
          var effortInstr = getEffortInstruction();
          // Append effort instruction if not already present
          if (existing.indexOf('EFFORT LEVEL:') === -1 && existing.indexOf('EFFORT OVERRIDE:') === -1) {
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
