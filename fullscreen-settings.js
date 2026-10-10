/* JepongDevxyz AI — Full-screen Settings (2026-10-10)
   Forces all Settings detail pages/modals to be full-screen.
   This prevents flicker caused by non-fullscreen overlays showing
   the Settings behind them. */
(function () {
  'use strict';
  if (window.__jdFullscreenSettings) return;
  window.__jdFullscreenSettings = true;

  var CSS = [
    /* Pet page: full screen, no transition (prevents Credits card flicker) */
    '#personalizationPetPage.open{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;z-index:1001!important;background:var(--modal-bg,#0a0a0a)!important;overflow-y:auto!important;transition:none!important;animation:none!important;}',
    /* Voice page: full screen, no transition (prevents Credits card flicker) */
    '#personalizationVoicePage.open{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;z-index:1001!important;background:var(--modal-bg,#0a0a0a)!important;overflow-y:auto!important;transition:none!important;animation:none!important;}',
    /* Personalization main page: full screen when open */
    '#personalizationModalOverlay.open #personalizationMainPage{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;max-width:none!important;}',
    /* Account modal: full screen on mobile */
    '@media (max-width:768px){',
    '  #cloudAccountModal.open .modal-content{width:100%!important;max-width:none!important;height:100%!important;max-height:none!important;border-radius:0!important;}',
    '  #cloudAccountModal.open{padding:0!important;}',
    '}',
    /* JepongDevxyz AI sheet: full screen */
    '.jd-extra-ai-sheet{position:fixed!important;inset:0!important;}',
    '.jd-extra-ai-sheet .jd-extra-ai-panel{width:100%!important;max-width:none!important;height:100%!important;max-height:none!important;border-radius:0!important;}',
    /* Cache sheet: full screen */
    '.jd-extra-cache-sheet{position:fixed!important;inset:0!important;}',
    '.jd-extra-cache-sheet .jd-extra-cache-panel{width:100%!important;max-width:none!important;height:100%!important;max-height:none!important;border-radius:0!important;}'
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
