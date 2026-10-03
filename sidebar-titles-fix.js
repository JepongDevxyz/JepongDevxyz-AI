/* =========================================================
   JepongDevxyz AI — sidebar history titles fix (2026-10-03)
   Runtime patch loaded by agent.js (additive only).

   The conversation titles in the sidebar were truncated with
   "..." (white-space:nowrap + text-overflow:ellipsis), unlike
   the Muse app where titles show fully. This patch makes the
   titles wrap to up to 2 lines so they remain fully readable,
   matching the Muse app's clean look.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSidebarTitlesFixLoaded) return;
  window.__jdSidebarTitlesFixLoaded = true;

  var CSS = [
    /* Show full titles: wrap to max 2 lines instead of truncating */
    '.history-item-text{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;',
    'display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;',
    'line-height:1.35!important;max-height:2.7em!important}',
    /* Keep the row layout tidy with wrapped text */
    '.history-item{align-items:center!important}',
    '.history-item .history-item-text{flex:1!important;min-width:0!important;text-align:left!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdSidebarTitlesFixCss')) return;
    var st = document.createElement('style');
    st.id = 'jdSidebarTitlesFixCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
