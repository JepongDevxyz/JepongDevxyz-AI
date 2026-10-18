/* =========================================================
   JepongDevxyz AI — Homepage-Exact Shimmer Loader
   Replaces the old generic boot skeleton with a shimmer
   loader that EXACTLY mirrors the homepage UI structure.
   Uses the exact AffectUI shimmer-loader classes (ui-shm)
   from skeleton.js for the shimmer effect.
   
   Layout mirrors homepage:
   - Header: hamburger, Ask/Imagine/Build tabs, action buttons
   - Sidebar: search, new chat, history list (desktop only)
   - Welcome: centered greeting area
   - Composer: rounded input with tool buttons
   
   The old #jdBootSkeleton is completely removed and replaced.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdHomepageShimmer) return;
  window.__jdHomepageShimmer = true;

  /* Hide and remove the old boot skeleton */
  function killOldSkeleton() {
    var old = document.getElementById('jdBootSkeleton');
    if (old) { old.style.display = 'none'; old.remove(); }
    ['jdBootSkeletonStyle', 'jdBootSkeletonFit', 'jdBootShimmerCss'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
  }

  /* Layout CSS only (shimmer effect comes from skeleton.js ui-shm) */
  var layoutCss = [
    '#jdHomepageShimmer{position:fixed;inset:0;z-index:2147483647;display:flex;background:#0f0f0f;transition:opacity .25s ease,visibility .25s ease;}',
    '#jdHomepageShimmer.hide{opacity:0;visibility:hidden;pointer-events:none;}',
    /* Force-hide old boot skeleton - never show it */
    '#jdBootSkeleton{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',
    'body.theme-light #jdHomepageShimmer{background:#f6f6f6;}',
    '.jhs-sidebar{display:none;}',
    '@media(min-width:1024px){',
    '  .jhs-sidebar{display:flex;flex-direction:column;width:280px;flex:0 0 280px;',
    '    border-right:1px solid rgba(255,255,255,.08);padding:16px 12px;gap:10px;}',
    '  body.theme-light .jhs-sidebar{border-right-color:rgba(0,0,0,.08);}',
    '}',
    '.jhs-main{flex:1;display:flex;flex-direction:column;min-width:0;}',
    '.jhs-header{height:60px;display:flex;align-items:center;justify-content:space-between;',
    '  padding:0 16px;border-bottom:1px solid rgba(255,255,255,.06);}',
    'body.theme-light .jhs-header{border-bottom-color:rgba(0,0,0,.06);}',
    '.jhs-header-left{display:flex;align-items:center;gap:12px;}',
    '.jhs-tabs{display:flex;gap:8px;}',
    '.jhs-header-right{display:flex;align-items:center;gap:8px;}',
    '.jhs-welcome{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;}',
    '.jhs-composer-wrap{padding:12px 16px 20px;max-width:768px;width:100%;margin:0 auto;}',
    '.jhs-composer{border:1px solid rgba(255,255,255,.1);border-radius:28px;padding:14px 16px;',
    '  display:flex;flex-direction:column;gap:12px;background:rgba(255,255,255,.03);}',
    'body.theme-light .jhs-composer{border-color:rgba(0,0,0,.1);background:rgba(0,0,0,.02);}',
    '.jhs-composer-tools{display:flex;align-items:center;justify-content:space-between;}',
    '.jhs-composer-left{display:flex;gap:8px;}',
    '.jhs-composer-right{display:flex;gap:8px;align-items:center;}',
  ].join('\n');

  function build() {
    killOldSkeleton();
    if (document.getElementById('jdHomepageShimmer')) return;

    var st = document.createElement('style');
    st.id = 'jdHomepageShimmerLayout';
    st.textContent = layoutCss;
    (document.head || document.documentElement).appendChild(st);

    var root = document.createElement('div');
    root.id = 'jdHomepageShimmer';
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('aria-busy', 'true');

    var isDesktop = window.matchMedia('(min-width:1024px)').matches;

    /* Use ui-shm (exact AffectUI class) for all shimmer blocks */
    var html = '';
    if (isDesktop) {
      html += '<div class="jhs-sidebar">' +
        '<span class="ui-shm" style="height:40px;border-radius:20px;margin-bottom:4px;"></span>' +
        '<span class="ui-shm" style="height:44px;border-radius:12px;margin-bottom:12px;"></span>' +
        '<span class="ui-shm" style="height:40px;border-radius:10px;width:92%;"></span>' +
        '<span class="ui-shm" style="height:40px;border-radius:10px;width:78%;"></span>' +
        '<span class="ui-shm" style="height:40px;border-radius:10px;width:85%;"></span>' +
        '<span class="ui-shm" style="height:40px;border-radius:10px;width:70%;"></span>' +
        '<span class="ui-shm" style="height:40px;border-radius:10px;width:88%;"></span>' +
      '</div>';
    }

    html += '<div class="jhs-main">' +
      '<div class="jhs-header">' +
        '<div class="jhs-header-left">' +
          '<span class="ui-shm" style="width:40px;height:40px;border-radius:50%;"></span>' +
          '<div class="jhs-tabs">' +
            '<span class="ui-shm" style="width:72px;height:32px;border-radius:16px;"></span>' +
            '<span class="ui-shm" style="width:72px;height:32px;border-radius:16px;"></span>' +
            '<span class="ui-shm" style="width:72px;height:32px;border-radius:16px;"></span>' +
          '</div>' +
        '</div>' +
        '<div class="jhs-header-right">' +
          '<span class="ui-shm" style="width:36px;height:36px;border-radius:50%;"></span>' +
          '<span class="ui-shm" style="width:36px;height:36px;border-radius:50%;"></span>' +
        '</div>' +
      '</div>' +
      '<div class="jhs-welcome">' +
        '<span class="ui-shm" style="width:120px;height:120px;border-radius:24px;"></span>' +
        '<span class="ui-shm" style="width:220px;height:28px;border-radius:14px;"></span>' +
        '<span class="ui-shm" style="width:160px;height:18px;border-radius:9px;"></span>' +
      '</div>' +
      '<div class="jhs-composer-wrap">' +
        '<div class="jhs-composer">' +
          '<span class="ui-shm" style="height:20px;width:45%;border-radius:10px;"></span>' +
          '<div class="jhs-composer-tools">' +
            '<div class="jhs-composer-left">' +
              '<span class="ui-shm" style="width:32px;height:32px;border-radius:50%;"></span>' +
              '<span class="ui-shm" style="width:32px;height:32px;border-radius:50%;"></span>' +
              '<span class="ui-shm" style="width:32px;height:32px;border-radius:50%;"></span>' +
            '</div>' +
            '<div class="jhs-composer-right">' +
              '<span class="ui-shm" style="width:32px;height:32px;border-radius:50%;"></span>' +
              '<span class="ui-shm" style="width:40px;height:40px;border-radius:50%;"></span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';

    root.innerHTML = html;
    document.body.appendChild(root);

    function hide() {
      root.classList.add('hide');
      setTimeout(function() {
        if (root.parentNode) root.remove();
        var c = document.getElementById('jdHomepageShimmerLayout');
        if (c && c.parentNode) c.remove();
      }, 300);
    }

    window.__jdHideInitSkeleton = hide;
    setTimeout(hide, 15000);
    if (document.readyState === 'complete') {
      setTimeout(hide, 3000);
    } else {
      window.addEventListener('load', function() { setTimeout(hide, 3000); });
    }
  }

  killOldSkeleton();
  if (document.body) {
    build();
  } else {
    document.addEventListener('DOMContentLoaded', build);
  }

  var obs = new MutationObserver(killOldSkeleton);
  if (document.body) {
    obs.observe(document.body, { childList: true });
    setTimeout(function() { obs.disconnect(); }, 5000);
  }
})();
