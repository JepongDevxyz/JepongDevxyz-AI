/* JepongDevxyz AI — Full-screen Settings (2026-10-10)
   Clean version: only essential rules, no stacking. */
(function () {
  'use strict';
  if (window.__jdFullscreenSettings) return;
  window.__jdFullscreenSettings = true;

  var CSS = [
    /* Overlay: solid background (not transparent) */
    '#personalizationModalOverlay.open{background:#0a0a0a!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;}',
    '.theme-light #personalizationModalOverlay.open{background:#ffffff!important;}',
    /* Pet page: solid background, no transition, force GPU layer (mobile fix) */
    '#personalizationPetPage{background:#0a0a0a!important;transition:none!important;animation:none!important;transform:translateZ(0)!important;will-change:transform!important;backface-visibility:hidden!important;-webkit-backface-visibility:hidden!important;}',
    '.theme-light #personalizationPetPage{background:#ffffff!important;}',
    /* Voice page: solid background, no transition, force GPU layer (mobile fix) */
    '#personalizationVoicePage{background:#0a0a0a!important;transition:none!important;animation:none!important;transform:translateZ(0)!important;will-change:transform!important;backface-visibility:hidden!important;-webkit-backface-visibility:hidden!important;}',
    '.theme-light #personalizationVoicePage{background:#ffffff!important;}',
    /* Toolbars: solid */
    '.ps-pet-toolbar{background:#0a0a0a!important;}',
    '.theme-light .ps-pet-toolbar{background:#ffffff!important;}',
    '.ps-voice-toolbar{background:#0a0a0a!important;}',
    '.theme-light .ps-voice-toolbar{background:#ffffff!important;}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdFullscreenSettingsCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdFullscreenSettingsCSS';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
