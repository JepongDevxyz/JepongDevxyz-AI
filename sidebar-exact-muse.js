/* =========================================================
   JepongDevxyz AI — EXACT Muse app sidebar replica
   Runtime patch loaded by agent.js (additive only).

   Pixel-perfect frame-by-frame copy of the Muse app sidebar
   from the user's reference image (2026-10-03):
   - Pure black background
   - "Main chat" header with home icon (20px, white)
   - "Side chats" gray label (15px, #777) with archive icon right
   - Items: 17px white, 14px vertical padding, left-aligned
   - Selected item: #262626 rounded pill (12px radius)
   - Bottom: 56px dark circles (gear, pencil) + wide Search pill

   Ping ms and Words indicators are KEPT (per user instruction).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdExactSidebarLoaded) return;
  window.__jdExactSidebarLoaded = true;

  var CSS = [
    /* ---- Container: pure black like the image ---- */
    '.jd-sidebar, .sidebar, #sidebarDrawer, .drawer, .side-drawer{background:#000000!important;border-right:none!important}',

    /* ---- Account row -> "Main chat" style ---- */
    /* Hide the avatar, show home icon + text like the image */
    '.jd-sidebar-account{display:flex!important;align-items:center!important;gap:14px!important;padding:20px 20px 12px!important;background:transparent!important;border:0!important;width:100%!important;text-align:left!important;cursor:pointer!important}',
    '.jd-sidebar-avatar{display:none!important}',
    '.jd-sidebar-account::before{content:"";width:24px;height:24px;flex:none;background:none;border:2px solid #fff;border-radius:6px 6px 2px 2px;position:relative;opacity:.95}',
    /* Home icon via CSS: house shape */
    '.jd-sidebar-account-name{font-size:20px!important;font-weight:500!important;color:#ffffff!important;letter-spacing:-.01em!important}',

    /* ---- Dismiss button: hide (not in image) ---- */
    '.jd-sidebar-dismiss{display:none!important}',

    /* ---- Menu actions: hide (not in image) - kept in DOM for functionality ---- */
    /* Library/Plugins/etc stay functional via other entry points */
    '.jd-sidebar-menu-actions{display:none!important}',

    /* ---- Section heading -> "Side chats" style ---- */
    '.jd-sidebar-conversation-section{padding:0!important}',
    '.jd-sidebar-section-heading{display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;padding:18px 20px 10px!important;background:transparent!important;border:0!important;cursor:pointer!important}',
    '.jd-sidebar-section-heading span{font-size:15px!important;font-weight:400!important;color:#777777!important;letter-spacing:0!important}',
    '.jd-sidebar-section-heading svg, .jd-sidebar-section-heading i{width:20px!important;height:20px!important;color:#777777!important;opacity:1!important}',

    /* ---- Conversation list: exact Muse app style ---- */
    '.chat-history-list{display:flex!important;flex-direction:column!important;gap:0!important;padding:0 12px!important;background:transparent!important}',
    '.history-item{display:flex!important;align-items:center!important;min-height:52px!important;padding:13px 16px!important;margin:0!important;border-radius:12px!important;background:transparent!important;border:0!important;cursor:pointer!important}',
    '.history-item:hover{background:rgba(255,255,255,.04)!important}',
    '.history-item.active{background:#262626!important}',
    '.history-item-text{font-size:17px!important;font-weight:400!important;color:#ffffff!important;letter-spacing:-.01em!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
    /* Hide the per-item action trigger (long-press menu still works) */
    '.history-item .jd-history-actions-trigger{display:none!important}',
    '.history-item .history-actions-deck{display:none!important}',

    /* ---- Footer: keep ping/words, style like image ---- */
    '#sidebar-footer-settings{background:#000000!important;border-top:none!important;padding:12px 16px!important}',
    '.jd-sidebar-status-row{display:flex!important;align-items:center!important;justify-content:space-between!important}',

    /* ---- Light theme: not in image, keep readable ---- */
    'body.theme-light .jd-sidebar, body.theme-light .sidebar, body.theme-light #sidebarDrawer{background:#ffffff!important}',
    'body.theme-light .jd-sidebar-account-name, body.theme-light .history-item-text{color:#000!important}',
    'body.theme-light .history-item.active{background:#e8e8e8!important}',
    'body.theme-light .jd-sidebar-section-heading span{color:#666!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdExactSidebarCss')) return;
    var st = document.createElement('style');
    st.id = 'jdExactSidebarCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
