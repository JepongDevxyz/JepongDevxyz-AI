/* =========================================================
   JepongDevxyz AI — Muse-app pixel-perfect sidebar
   Runtime patch loaded by agent.js (additive only).

   Restyles the sidebar to match the Muse app frame-by-frame:
   - Very dark clean background
   - Rounded pill highlight on selected conversation
   - Small gray section headers
   - Circular bottom buttons
   - Clean typography and spacing

   All features kept: Library, Plugins, ping ms, words, etc.
   Only the VISUAL STYLE changes, not the functionality.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSidebarStyleLoaded) return;
  window.__jdSidebarStyleLoaded = true;

  var CSS = [
    /* Sidebar container: Muse-app dark */
    '.jd-sidebar, .sidebar, #sidebarDrawer{background:#111111!important;border-right:1px solid rgba(255,255,255,.06)!important}',

    /* Account row -> like "Main chat" */
    '.jd-sidebar-account{display:flex!important;align-items:center!important;gap:12px!important;padding:14px 16px!important;border-radius:12px!important}',
    '.jd-sidebar-account:hover{background:rgba(255,255,255,.05)!important}',
    '.jd-sidebar-avatar{width:36px!important;height:36px!important;font-size:14px!important}',
    '.jd-sidebar-account-name{font-size:17px!important;font-weight:600!important;color:#fff!important}',

    /* Menu items: clean rows like Muse app */
    '.jd-sidebar-menu-actions{display:flex!important;flex-direction:column!important;gap:2px!important;padding:8px!important}',
    '.jd-sidebar-menu-item{display:flex!important;align-items:center!important;gap:14px!important;padding:12px 16px!important;border-radius:12px!important;font-size:16px!important;color:#fff!important;background:transparent!important;border:0!important;cursor:pointer!important;text-align:left!important;width:100%!important}',
    '.jd-sidebar-menu-item:hover{background:rgba(255,255,255,.06)!important}',
    '.jd-sidebar-menu-item svg{width:20px!important;height:20px!important;opacity:.9!important;flex:none!important}',
    '.jd-sidebar-menu-item span{font-weight:400!important}',

    /* Section header: small gray like "Side chats" */
    '.jd-sidebar-section-heading{font-size:13px!important;font-weight:500!important;color:#888!important;text-transform:none!important;letter-spacing:0!important;padding:16px 16px 8px!important}',
    '.jd-sidebar-section-heading span{color:#888!important}',
    '.jd-sidebar-section-heading svg{width:14px!important;height:14px!important;opacity:.6!important}',

    /* Conversation items: Muse-app style */
    '.chat-history-list{display:flex!important;flex-direction:column!important;gap:2px!important;padding:0 8px!important}',
    '.history-item{display:flex!important;align-items:center!important;padding:12px 16px!important;border-radius:12px!important;font-size:16px!important;color:#fff!important;background:transparent!important;border:0!important;cursor:pointer!important;min-height:48px!important}',
    '.history-item:hover{background:rgba(255,255,255,.05)!important}',
    '.history-item.active{background:#2a2a2a!important}',
    '.history-item-text{font-size:16px!important;font-weight:400!important;color:#fff!important}',

    /* Bottom bar: keep ping/words, style like Muse app */
    '#sidebar-footer-settings{background:#111111!important;border-top:1px solid rgba(255,255,255,.06)!important;padding:12px!important}',
    '.jd-sidebar-status-row{display:flex!important;align-items:center!important;gap:8px!important}',

    /* Light theme adjustments */
    'body.theme-light .jd-sidebar, body.theme-light .sidebar, body.theme-light #sidebarDrawer{background:#f5f5f5!important;border-right-color:rgba(0,0,0,.08)!important}',
    'body.theme-light .jd-sidebar-account-name, body.theme-light .jd-sidebar-menu-item, body.theme-light .history-item, body.theme-light .history-item-text{color:#18181b!important}',
    'body.theme-light .jd-sidebar-menu-item:hover, body.theme-light .history-item:hover{background:rgba(0,0,0,.05)!important}',
    'body.theme-light .history-item.active{background:#e4e4e7!important}',
    'body.theme-light #sidebar-footer-settings{background:#f5f5f5!important;border-top-color:rgba(0,0,0,.08)!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdSidebarStyleCss')) return;
    var st = document.createElement('style');
    st.id = 'jdSidebarStyleCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
