/* ============================================================
   desktop-layout.js — Desktop (PC/laptop) layout polish.

   The app is mobile-first; on wide screens it looked like "a mobile
   app blown up". This patch constrains and tidies the desktop layout
   with pure CSS — no JS behavior changes, no DOM restructuring.

   Fixes (all desktop-only):
   1. Persistent sidebar: on >=1024px the nav drawer becomes a fixed
      280px left column (ChatGPT/Claude style) instead of an overlay
      drawer. The screen-dimming overlay, the drawer's internal X and
      the header hamburger are hidden (nothing left to open/close).
   (Boot-skeleton desktop fit moved to agent.js 2026-10-05: it must run
   synchronously right after HTML parse — no network wait — so the
   sidebar version shows from the very first paint.)
   2. Composer: widened from the 400px pill to 768px so it matches the
      message column; the mic/voice/send buttons get breathing room.
   3. Header: nav row + controls constrained to a centered 768px
      column instead of stretching edge-to-edge.
   4. Settings: the settings home panel is constrained to a centered
      760px column. (Root cause found: index.html's own
      @media(min-width:768px){.settings-home{max-width:560px...}} rule
      never applies — three dangling "#settingsModal .settings-toggle-row"
      selector lines with no declaration block swallow the whole @media
      block as an invalid selector prelude. This patch uses
      #settingsModal .settings-home with !important so it wins
      regardless.)
   5. Notify card: the "Get notified when AI responds" card can never
      intercept clicks while hidden (pointer-events:none + hidden), and
      stacking stays correct (drawer/sidebar above it).
   6. Sidebar Ping-ms and Words pills are KEPT (explicit user
      preference) — only guarded against wrapping at 280px.

   ALL rules live inside @media(min-width:1024px) (plus an optional
   1600px tier), so mobile/tablet-portrait rendering is 100% untouched.
   Theme-aware via existing CSS vars. Fail-open: CSS only, injection
   guarded in try/catch.
   ============================================================ */
(function () {
'use strict';
if (window.__jdDesktopLayout) return;
window.__jdDesktopLayout = true;

var STYLE_ID = 'jd-desktop-layout-css';

var CSS = [
'/* ---- Issue 1: persistent sidebar (ChatGPT/Claude style) ---- */',
'@media(min-width:1024px){',
'  /* Reserve the 280px lane inside the app column; the absolutely-',
'     positioned sidebar fills it. In-flow children (header, chat,',
'     composer) shrink to the remaining width automatically. */',
'  .app-container{padding-left:280px!important;}',
'  /* #sidebar (ID) beats .app-container .sidebar.drawer-left from',
'     reference-shell.css on specificity, !important beats the rest. */',
'  #sidebar{',
'    position:absolute!important;left:0!important;top:0!important;bottom:0!important;',
'    width:280px!important;max-width:280px!important;',
'    height:100%!important;max-height:100%!important;',
'    transform:none!important;',
'    transition:none!important;',
'    border-radius:0!important;',
'    border-right:1px solid var(--border-color)!important;',
'  }',
'  /* Overlay drawer is gone on desktop: no dimming, no stray clicks. */',
'  #sidebarOverlay{display:none!important;}',
'  /* Nothing left to open/close: hide the drawer X and hamburger. */',
'  .jd-sidebar-dismiss{display:none!important;}',
'  .jd-menu-btn{display:none!important;}',
'',
'/* ---- Issue 2: composer matches the message column ---- */',
'  .prompt-bar{--pb-w:768px;}',
'  /* Keep the right-side mic / voice / send buttons clear of the edge. */',
'  .prompt-bar__bar{padding-right:6px!important;overflow:visible!important;}',
'',
'/* ---- Issue 7: in-chat search icon aligns with the chat column ---- */',
'  /* The button is absolutely positioned inside the full-width viewport',
'     wrapper; on desktop that parks it far outside the centered column.',
'     Re-anchor it to the column\'s right edge (1040px, 1200px at 1600px+). */',
'  .floating-search-trigger-btn{',
'    right:max(14px, calc((100% - 1040px)/2 + 16px))!important;',
'  }',
'',
'/* ---- Issue 8: roomier buttons on desktop ---- */',
'  .prompt-bar__tool{width:34px!important;height:34px!important;border-radius:10px!important;}',
'  .prompt-bar__send{width:34px!important;height:34px!important;border-radius:10px!important;}',
'',
'/* ---- Issue 3: header content constrained + centered ---- */',
'  .jd-navigation{max-width:768px!important;margin-inline:auto!important;}',
'  /* The hamburger is display:none on desktop; without this the 3-track',
'     grid (54px 1fr 54px) auto-places .jd-nav-tabs into the 54px track and',
'     the tabs crush/overlap ("ImagiBeild"). Collapse to 2 tracks. */',
'  .jd-navigation{grid-template-columns:minmax(0,1fr) auto!important;}',
'  .jd-nav-tab{flex:none!important;white-space:nowrap!important;}',
'  .app-container .header-controls{max-width:768px!important;margin-inline:auto!important;}',
'',
'/* ---- Issue 4: settings panel centered column ---- */',
'  #settingsModal .settings-home{',
'    max-width:760px!important;',
'    margin-left:auto!important;margin-right:auto!important;',
'  }',
'',
'/* ---- Issue 5: notify card can never steal clicks while hidden ---- */',
'  .notify-permission-card:not(.visible){',
'    pointer-events:none!important;',
'    visibility:hidden!important;',
'  }',
'  /* Stacking is already correct when visible: card z-index 88 sits',
'     below the sidebar/drawer layer (901) and above chat content. */',
'',
'/* ---- Issue 6: Ping + Words pills stay tidy at 280px ---- */',
'  #sidebar .jd-sidebar-status-row{flex-wrap:nowrap!important;}',
'  #sidebar .network-status,#sidebar .sidebar-word-pill{flex:none!important;}',
'',
'/* ---- Issue 9: full-screen pages get centered columns on desktop ---- */',
'  /* Explore, Library and Plugins are position:fixed full-bleed panels;',
'     constrain their inner content so rows/bars don\'t stretch edge to edge. */',
'  #jdExplorePage .jdx-header,',
'  #jdExplorePage .jdx-content,',
'  #jdExplorePage .jdx-tabbar,',
'  #jdLibPage .jdl-header,',
'  #jdLibPage .jdl-tabs,',
'  #jdLibPage .jdl-scroll,',
'  .jdpg .jdpg-head,',
'  .jdpg .jdpg-scroll{',
'    max-width:760px!important;',
'    margin-left:auto!important;margin-right:auto!important;',
'  }',
'}',
'',
'/* ---- Wide tier: chat column grows at 1600px, composer follows ---- */',
'@media(min-width:1600px){',
'  .prompt-bar{--pb-w:860px;}',
'  .floating-search-trigger-btn{right:max(14px, calc((100% - 1200px)/2 + 16px))!important;}',
'  .jd-navigation{max-width:860px!important;}',
'  .app-container .header-controls{max-width:860px!important;}',
'}',
'',
'/* ---- Tablet tier (768-1023px): index.html\'s own @media(min-width:768px)',
'   settings rule is swallowed by dangling selectors, so re-declare it here.',
'   Sidebar stays an overlay drawer on tablets (desktop persistence is',
'   1024px+ only). ---- */',
'@media(min-width:768px) and (max-width:1023.98px){',
'  #settingsModal .settings-home{',
'    max-width:640px!important;',
'    margin-left:auto!important;margin-right:auto!important;',
'  }',
'}'
].join('\n');

function inject() {
  try {
    if (document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  } catch (_) {}
}

try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject, { once: true });
  } else {
    inject();
  }
} catch (_) { inject(); }
})();
