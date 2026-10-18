/* =========================================================
   JepongDevxyz AI — Homepage-Exact Shimmer Loader
   Replaces the old generic boot skeleton with a shimmer
   loader that EXACTLY mirrors the homepage UI structure:
   - Header: hamburger, Ask/Imagine/Build tabs, action buttons
   - Sidebar: search, new chat, history list (desktop)
   - Welcome: centered greeting with Lottie placeholders
   - Composer: rounded input with tool buttons
   
   The old #jdBootSkeleton is completely hidden and replaced.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdHomepageShimmer) return;
  window.__jdHomepageShimmer = true;

  /* Hide the old boot skeleton immediately */
  function killOldSkeleton() {
    var old = document.getElementById('jdBootSkeleton');
    if (old) {
      old.style.display = 'none';
      old.remove();
    }
    var oldCss = document.getElementById('jdBootSkeletonStyle');
    if (oldCss) oldCss.remove();
    var oldFit = document.getElementById('jdBootSkeletonFit');
    if (oldFit) oldFit.remove();
  }

  /* Shimmer CSS */
  var css = document.createElement('style');
  css.id = 'jdHomepageShimmerCss';
  css.textContent = [
    '#jdHomepageShimmer{position:fixed;inset:0;z-index:2147483647;display:flex;background:var(--bg-main,#0f0f0f);color:#fff;transition:opacity .25s ease,visibility .25s ease;}',
    '#jdHomepageShimmer.hide{opacity:0;visibility:hidden;pointer-events:none;}',
    'body.theme-light #jdHomepageShimmer{background:#f6f6f6;}',
    '',
    /* Shimmer block base */
    '.jhs-shimmer{position:relative;overflow:hidden;background:rgba(255,255,255,.06);border-radius:8px;}',
    'body.theme-light .jhs-shimmer{background:rgba(0,0,0,.06);}',
    '.jhs-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.12) 50%,transparent 80%);background-size:200% 100%;animation:jhs-sweep 1.8s ease-in-out infinite;}',
    'body.theme-light .jhs-shimmer::after{background:linear-gradient(100deg,transparent 20%,rgba(255,255,255,.9) 50%,transparent 80%);}',
    '@keyframes jhs-sweep{0%{background-position:180% 0;}100%{background-position:-80% 0;}}',
    '@media(prefers-reduced-motion:reduce){.jhs-shimmer::after{animation:none;display:none;}}',
    '',
    /* Layout: matches homepage exactly */
    '.jhs-sidebar{display:none;}',
    '@media(min-width:1024px){.jhs-sidebar{display:flex;flex-direction:column;width:280px;flex:0 0 280px;border-right:1px solid rgba(255,255,255,.08);padding:16px 12px;gap:10px;}}',
    'body.theme-light .jhs-sidebar{border-right-color:rgba(0,0,0,.08);}',
    '.jhs-main{flex:1;display:flex;flex-direction:column;min-width:0;}',
    '',
    /* Header: hamburger | tabs | buttons */
    '.jhs-header{height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid rgba(255,255,255,.06);}',
    'body.theme-light .jhs-header{border-bottom-color:rgba(0,0,0,.06);}',
    '.jhs-header-left{display:flex;align-items:center;gap:12px;}',
    '.jhs-hamburger{width:40px;height:40px;border-radius:50%;}',
    '.jhs-tabs{display:flex;gap:8px;}',
    '.jhs-tab{width:72px;height:32px;border-radius:16px;}',
    '.jhs-tab.active{background:rgba(255,255,255,.12);}',
    '.jhs-header-right{display:flex;align-items:center;gap:8px;}',
    '.jhs-icon-btn{width:36px;height:36px;border-radius:50%;}',
    '',
    /* Sidebar content */
    '.jhs-side-search{height:40px;border-radius:20px;margin-bottom:4px;}',
    '.jhs-side-new{height:44px;border-radius:12px;margin-bottom:12px;}',
    '.jhs-side-item{height:40px;border-radius:10px;}',
    '.jhs-side-item:nth-child(odd){width:92%;}',
    '.jhs-side-item:nth-child(even){width:78%;}',
    '',
    /* Welcome area */
    '.jhs-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;}',
    '.jhs-welcome-anim{width:120px;height:120px;border-radius:24px;}',
    '.jhs-welcome-title{width:220px;height:28px;border-radius:14px;}',
    '.jhs-welcome-sub{width:160px;height:18px;border-radius:9px;}',
    '',
    /* Composer: matches homepage composer exactly */
    '.jhs-composer-wrap{padding:12px 16px 20px;max-width:768px;width:100%;margin:0 auto;}',
    '.jhs-composer{border:1px solid rgba(255,255,255,.1);border-radius:28px;padding:14px 16px;display:flex;flex-direction:column;gap:12px;background:rgba(255,255,255,.03);}',
    'body.theme-light .jhs-composer{border-color:rgba(0,0,0,.1);background:rgba(0,0,0,.02);}',
    '.jhs-composer-input{height:20px;width:45%;border-radius:10px;}',
    '.jhs-composer-tools{display:flex;align-items:center;justify-content:space-between;}',
    '.jhs-composer-left{display:flex;gap:8px;}',
    '.jhs-tool-btn{width:32px;height:32px;border-radius:50%;}',
    '.jhs-composer-right{display:flex;gap:8px;align-items:center;}',
    '.jhs-send-btn{width:40px;height:40px;border-radius:50%;}',
  ].join('\n');

  function build() {
    killOldSkeleton();
    if (document.getElementById('jdHomepageShimmer')) return;

    // Inject CSS
    (document.head || document.documentElement).appendChild(css);

    // Build skeleton matching homepage
    var root = document.createElement('div');
    root.id = 'jdHomepageShimmer';
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('aria-busy', 'true');

    var isDesktop = window.matchMedia('(min-width:1024px)').matches;

    root.innerHTML =
      (isDesktop ?
        '<div class="jhs-sidebar">' +
          '<div class="jhs-shimmer jhs-side-search"></div>' +
          '<div class="jhs-shimmer jhs-side-new"></div>' +
          '<div class="jhs-shimmer jhs-side-item"></div>' +
          '<div class="jhs-shimmer jhs-side-item"></div>' +
          '<div class="jhs-shimmer jhs-side-item"></div>' +
          '<div class="jhs-shimmer jhs-side-item"></div>' +
          '<div class="jhs-shimmer jhs-side-item"></div>' +
        '</div>' : '') +
      '<div class="jhs-main">' +
        '<div class="jhs-header">' +
          '<div class="jhs-header-left">' +
            '<div class="jhs-shimmer jhs-hamburger"></div>' +
            '<div class="jhs-tabs">' +
              '<div class="jhs-shimmer jhs-tab active"></div>' +
              '<div class="jhs-shimmer jhs-tab"></div>' +
              '<div class="jhs-shimmer jhs-tab"></div>' +
            '</div>' +
          '</div>' +
          '<div class="jhs-header-right">' +
            '<div class="jhs-shimmer jhs-icon-btn"></div>' +
            '<div class="jhs-shimmer jhs-icon-btn"></div>' +
          '</div>' +
        '</div>' +
        '<div class="jhs-welcome">' +
          '<div class="jhs-shimmer jhs-welcome-anim"></div>' +
          '<div class="jhs-shimmer jhs-welcome-title"></div>' +
          '<div class="jhs-shimmer jhs-welcome-sub"></div>' +
        '</div>' +
        '<div class="jhs-composer-wrap">' +
          '<div class="jhs-composer">' +
            '<div class="jhs-shimmer jhs-composer-input"></div>' +
            '<div class="jhs-composer-tools">' +
              '<div class="jhs-composer-left">' +
                '<div class="jhs-shimmer jhs-tool-btn"></div>' +
                '<div class="jhs-shimmer jhs-tool-btn"></div>' +
                '<div class="jhs-shimmer jhs-tool-btn"></div>' +
              '</div>' +
              '<div class="jhs-composer-right">' +
                '<div class="jhs-shimmer jhs-tool-btn"></div>' +
                '<div class="jhs-shimmer jhs-send-btn"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    // Hide function (replaces the old __jdHideInitSkeleton)
    function hide() {
      root.classList.add('hide');
      setTimeout(function() { if (root.parentNode) root.remove(); }, 300);
      var c = document.getElementById('jdHomepageShimmerCss');
      if (c) setTimeout(function() { if (c.parentNode) c.remove(); }, 300);
    }

    // Override the old hide function
    window.__jdHideInitSkeleton = hide;

    // Auto-hide fallbacks (same as before)
    setTimeout(hide, 15000);
    if (document.readyState === 'complete') {
      setTimeout(hide, 3000);
    } else {
      window.addEventListener('load', function() { setTimeout(hide, 3000); });
    }
  }

  // Run immediately (before old skeleton shows)
  killOldSkeleton();
  if (document.body) {
    build();
  } else {
    document.addEventListener('DOMContentLoaded', build);
  }

  // Keep killing old skeleton if it reappears
  var observer = new MutationObserver(function() {
    killOldSkeleton();
  });
  if (document.body) {
    observer.observe(document.body, { childList: true });
    setTimeout(function() { observer.disconnect(); }, 5000);
  }
})();
