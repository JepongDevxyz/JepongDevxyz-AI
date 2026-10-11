/* =========================================================
   JepongDevxyz AI — floating buttons fix (2026-10-03)
   Runtime patch loaded by agent.js (additive only).

   The in-chat search trigger and the scroll-to-bottom pill used
   position:absolute, so they scrolled WITH the message content
   and overlapped the text mid-screen. Like the Muse app, they
   are now position:fixed — pinned to the viewport:
   - search trigger: top-right, below the header
   - scroll pill: bottom-center, above the composer input
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdFloatingBtnFixLoaded) return;
  window.__jdFloatingBtnFixLoaded = true;

  var CSS = [
    '.floating-search-trigger-btn{position:fixed!important;top:64px!important;right:12px!important;z-index:60!important}',
    '.floating-scroll-pill{position:fixed!important;left:50%!important;right:auto!important;bottom:96px!important;transform:translateX(-50%)!important;z-index:60!important}',
    '@media (max-width:360px){',
    '  .floating-scroll-pill{bottom:88px!important}',
    '}',
    /* 2026-10-11: keep scroll pill above the suggestion chips row when visible */
    'body:has(.prompt-suggestions .prompt-chip){--jd-pill-lift:56px}',
    'body:has(.prompt-suggestions .prompt-chip) .floating-scroll-pill{bottom:calc(96px + var(--jd-pill-lift,56px))!important}',
    '@media (max-width:360px){',
    '  body:has(.prompt-suggestions .prompt-chip) .floating-scroll-pill{bottom:calc(88px + var(--jd-pill-lift,56px))!important}',
    '}',
    /* 2026-10-11: thinking-trace text must not clip behind the suggestions row */
    '.thought-line__head{position:relative!important;z-index:5!important}',
    /* 2026-10-11: voice pill must not be squeezed over the input edge */
    'button#micBtn.voice-pill{flex:none!important;margin-right:2px!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdFloatingBtnFixCss')) return;
    var st = document.createElement('style');
    st.id = 'jdFloatingBtnFixCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
