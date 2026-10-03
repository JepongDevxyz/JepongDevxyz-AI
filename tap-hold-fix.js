/* =========================================================
   JepongDevxyz AI — Fix tap-and-hold text selection
   Runtime patch loaded by agent.js (additive only).

   The word-dictate.js sets user-select:none on .msg.bot to suppress
   the "Tap to see search results" popup, but this breaks normal
   tap-and-hold text selection. This patch restores normal selection.

   The system popup is a Chrome/Android feature, not our bug to fix.
   Users expect tap-and-hold to work normally.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdTapHoldFixLoaded) return;
  window.__jdTapHoldFixLoaded = true;

  // Override the user-select:none with user-select:text
  // This must come AFTER word-dictate.js loads, so we use !important
  // and a more specific selector.
  try {
    var style = document.createElement('style');
    style.textContent = [
      '.msg.bot, .msg.bot * {',
      '  user-select: text !important;',
      '  -webkit-user-select: text !important;',
      '  -webkit-touch-callout: default !important;',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  } catch (e) {}
})();
