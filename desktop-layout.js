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
   10. Boot skeleton: the static first-paint loader (#jdBootSkeleton) is
      full-width; on desktop it is re-fit to mirror the homepage —
      280px sidebar skeleton + centered 768px header/composer and a
      900px chat column. Tiny DOM wrap/inject (idempotent, desktop-only).
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
   guarded in try/catch. (Issue 10 adds one tiny idempotent DOM
   wrap/inject for the boot skeleton; everything else is pure CSS.)
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
'',
'/* ---- Issue 10: boot skeleton fits the desktop homepage ---- */',
'  /* The static first-paint loader (#jdBootSkeleton) is edge-to-edge;',
'     on desktop the real homepage has a 280px sidebar plus a centered',
'     768px header/composer and a 900px chat column. Mirror that here so',
'     the loader looks like the page it is loading. The sidebar column',
'     (.jd-boot-side) and the .jd-boot-main wrapper are injected by the',
'     small script at the bottom of this file. */',
'  #jdBootSkeleton{flex-direction:row!important;padding:0!important;}',
'  .jd-boot-side{',
'    flex:0 0 280px!important;width:280px!important;min-height:0;',
'    display:flex;flex-direction:column;gap:10px;',
'    padding:18px 14px;overflow:hidden;',
'    background:var(--boot-surface);border-right:1px solid var(--boot-line);',
'  }',
'  .jd-boot-main{flex:1 1 auto;min-width:0;min-height:0;display:flex;flex-direction:column;}',
'  .jd-boot-main .jd-boot-header{max-width:768px!important;width:100%!important;margin-inline:auto!important;}',
'  .jd-boot-main .jd-boot-conversation{max-width:900px!important;width:100%!important;margin-inline:auto!important;}',
'  .jd-boot-main .jd-boot-composer{width:min(100% - 32px,768px)!important;}',
'}',
'',
'/* ---- Wide tier: chat column grows at 1600px, composer follows ---- */',
'@media(min-width:1600px){',
'  .prompt-bar{--pb-w:860px;}',
'  .floating-search-trigger-btn{right:max(14px, calc((100% - 1200px)/2 + 16px))!important;}',
'  .jd-navigation{max-width:860px!important;}',
'  .app-container .header-controls{max-width:860px!important;}',
'  .jd-boot-main .jd-boot-header{max-width:860px!important;}',
'  .jd-boot-main .jd-boot-composer{width:min(100% - 32px,860px)!important;}',
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

/* Issue 10 (DOM half): re-fit the static boot skeleton (#jdBootSkeleton)
   to the desktop homepage. Wraps the skeleton rows in .jd-boot-main and
   prepends a 280px sidebar skeleton so the loader mirrors the real
   desktop layout (sidebar + centered 768px header/composer, 900px chat
   column). Desktop-only, idempotent, no-ops if the skeleton is gone. */
(function () {
'use strict';
function fit() {
  try {
    if (!window.matchMedia('(min-width:1024px)').matches) return;
    var sk = document.getElementById('jdBootSkeleton');
    if (!sk || sk.querySelector('.jd-boot-side') || sk.querySelector('.jd-boot-main')) return;
    var main = document.createElement('div');
    main.className = 'jd-boot-main';
    main.setAttribute('aria-hidden', 'true');
    while (sk.firstChild) main.appendChild(sk.firstChild);
    var side = document.createElement('div');
    side.className = 'jd-boot-side';
    side.setAttribute('aria-hidden', 'true');
    var rows = '';
    for (var i = 0; i < 6; i++) {
      rows += '<div class="jd-boot-shape" style="height:38px;border-radius:10px"></div>';
    }
    side.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">' +
        '<div class="jd-boot-shape" style="width:36px;height:36px;border-radius:12px;flex:0 0 auto"></div>' +
        '<div class="jd-boot-shape" style="height:16px;width:55%;border-radius:8px"></div>' +
      '</div>' +
      '<div class="jd-boot-shape" style="height:40px;border-radius:12px"></div>' +
      '<div class="jd-boot-shape" style="height:14px;width:42%;border-radius:7px;margin-top:10px"></div>' +
      rows +
      '<div style="flex:1"></div>' +
      '<div class="jd-boot-shape" style="height:48px;border-radius:12px"></div>';
    sk.appendChild(side);
    sk.appendChild(main);
  } catch (_) {}
}
try {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fit, { once: true });
  } else {
    fit();
  }
} catch (_) { fit(); }
})();
