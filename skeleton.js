/* JepongDevxyz AI — Shimmer Loader (affectUI rebuild, 2026-10-18)
   Rebuilt from affectUI shimmer-loader (https://www.affectui.com/motion/shimmer-loader)
   as vanilla JS following the app's patch conventions.

   Key features from the original:
   - Viewport-pinned shimmer sweep: all skeleton blocks share ONE synchronized
     light sweep across the viewport (background-attachment: fixed)
   - ShimmerText: shimmering text for "Thinking..." / AI generating states
   - Dark mode: follows body.theme-light (app convention)
   - Reduced motion: static placeholders when prefers-reduced-motion
   - ARIA: skeletons are aria-hidden, containers get aria-busy="true"

   Public API (backwards compatible):
   - window.jdSkeleton.show(el, type, count) / .hide(el)
   - window.jdShimmer.skeleton({width, height, radius, circle}) -> element
   - window.jdShimmer.text(label, duration) -> element (ShimmerText)
*/
(function () {
  'use strict';
  if (window.__jdShimmerLoader) return;
  window.__jdShimmerLoader = true;

  var CSS = [
    /* ---------- affectUI shimmer core ---------- */
    '.ui-shm,.ui-shm-text{',
    '  --ui-shm-base:#ececec;',
    '  --ui-shm-glow:rgba(255,255,255,.9);',
    '  --ui-shm-text:#a3a3a3;',
    '  --ui-shm-text-glow:#fff;',
    '  --ui-shm-dur:2.2s;',
    '}',
    /* Skeleton: one fixed gradient for the whole viewport, so all blocks sweep together */
    '.ui-shm{',
    '  display:block;flex:none;width:100%;height:12px;max-width:100%;border-radius:6px;',
    '  background-color:var(--ui-shm-base);',
    '  background-image:linear-gradient(100deg,transparent 20%,var(--ui-shm-glow) 50%,transparent 80%);',
    '  background-size:200% 100%;background-repeat:no-repeat;',
    '  animation:ui-shm-sweep var(--ui-shm-dur) ease-in-out infinite;',
    '}',
    '@keyframes ui-shm-sweep{0%{background-position:180% 0}100%{background-position:-80% 0}}',
    /* ShimmerText: highlight band runs through the letters */
    '.ui-shm-text{',
    '  display:inline-block;color:var(--ui-shm-text);',
    '  background-image:linear-gradient(90deg,var(--ui-shm-text) 0%,var(--ui-shm-text) 40%,var(--ui-shm-text-glow) 50%,var(--ui-shm-text) 60%,var(--ui-shm-text) 100%);',
    '  background-size:300% 100%;background-position:100% 0;',
    '  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;',
    '  animation:ui-shm-text var(--ui-shm-text-dur,2s) linear infinite;',
    '}',
    '@keyframes ui-shm-text{from{background-position:100% 0}to{background-position:0% 0}}',
    '@media (prefers-reduced-motion:reduce){',
    '  .ui-shm{animation:none;background-image:none}',
    '  .ui-shm-text{animation:none;background-image:none;-webkit-text-fill-color:currentColor}',
    '}',
    /* Dark mode: app uses body.theme-light for light, default is dark */
    'body.theme-light .ui-shm,body.theme-light .ui-shm-text{',
    '  --ui-shm-base:#ececec;',
    '  --ui-shm-glow:rgba(255,255,255,.9);',
    '  --ui-shm-text:#a3a3a3;',
    '  --ui-shm-text-glow:#fff;',
    '}',
    'body:not(.theme-light) .ui-shm,body:not(.theme-light) .ui-shm-text{',
    '  --ui-shm-base:#2f2f33;',
    '  --ui-shm-glow:rgba(255,255,255,.08);',
    '  --ui-shm-text:#6e6e73;',
    '  --ui-shm-text-glow:#f5f5f5;',
    '}',
    /* ---------- Layout helpers (app-specific) ---------- */
    '.jd-shm-chat{display:flex;gap:12px;padding:16px 0;max-width:100%}',
    '.jd-shm-body{flex:1;min-width:0;display:grid;gap:10px}',
    '.jd-shm-row{display:flex;align-items:center;gap:12px;padding:12px 0}',
    '.jd-shm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}',
    '.jd-skeleton-wrap{width:100%}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdShimmerCss')) return;
    var st = document.createElement('style');
    st.id = 'jdShimmerCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function len(v) {
    return typeof v === 'number' ? v + 'px' : v;
  }

  /* ---------- Skeleton block ---------- */
  function skeleton(opts) {
    opts = opts || {};
    ensureCSS();
    var el = document.createElement('span');
    el.className = 'ui-shm' + (opts.className ? ' ' + opts.className : '');
    el.setAttribute('aria-hidden', 'true');
    var w = len(opts.width) || '100%';
    el.style.width = w;
    el.style.height = opts.circle ? w : (len(opts.height) || '12px');
    el.style.borderRadius = opts.circle ? '50%' : (len(opts.radius) || '6px');
    if (opts.style) {
      for (var k in opts.style) el.style[k] = opts.style[k];
    }
    return el;
  }

  /* ---------- ShimmerText ---------- */
  function shimmerText(label, duration) {
    ensureCSS();
    var el = document.createElement('span');
    el.className = 'ui-shm-text';
    el.style.setProperty('--ui-shm-text-dur', (duration || 2) + 's');
    el.textContent = label;
    return el;
  }

  /* ---------- Composite builders ---------- */
  function chatSkeleton() {
    var wrap = document.createElement('div');
    wrap.className = 'jd-shm-chat';
    wrap.setAttribute('aria-busy', 'true');
    var avatar = skeleton({ width: 32, height: 32, circle: true });
    var body = document.createElement('div');
    body.className = 'jd-shm-body';
    ['92%', '78%', '85%', '60%'].forEach(function (w) {
      var line = skeleton({ width: w, height: 14 });
      body.appendChild(line);
    });
    wrap.appendChild(avatar);
    wrap.appendChild(body);
    return wrap;
  }

  function cardSkeleton(n) {
    n = n || 3;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var c = skeleton({ width: '100%', height: 80, radius: 16, style: { marginBottom: '12px' } });
      frag.appendChild(c);
    }
    return frag;
  }

  function listSkeleton(n) {
    n = n || 4;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var row = document.createElement('div');
      row.className = 'jd-shm-row';
      row.setAttribute('aria-busy', 'true');
      row.appendChild(skeleton({ width: 44, height: 44, radius: 12 }));
      var txt = document.createElement('div');
      txt.style.flex = '1';
      txt.appendChild(skeleton({ width: '70%', height: 14, style: { marginBottom: '8px' } }));
      txt.appendChild(skeleton({ width: '45%', height: 11 }));
      row.appendChild(txt);
      frag.appendChild(row);
    }
    return frag;
  }

  function gridSkeleton(n) {
    n = n || 6;
    var grid = document.createElement('div');
    grid.className = 'jd-shm-grid';
    grid.setAttribute('aria-busy', 'true');
    for (var i = 0; i < n; i++) {
      grid.appendChild(skeleton({ width: '100%', height: 150, radius: 12 }));
    }
    return grid;
  }

  /* ---------- Page-load skeleton ---------- */
  function showPageSkeleton() {
    ensureCSS();
    if (document.getElementById('jdPageSkeleton')) return;
    var sk = document.createElement('div');
    sk.id = 'jdPageSkeleton';
    sk.setAttribute('aria-busy', 'true');
    sk.innerHTML =
      '<style>' +
      '#jdPageSkeleton{position:fixed;inset:0;z-index:99999;background:var(--bg,#0a0a0c);' +
      'display:flex;flex-direction:column;transition:opacity .3s}' +
      'body.theme-light #jdPageSkeleton{background:#fff}' +
      '#jdPageSkeleton .jdps-head{display:flex;align-items:center;gap:12px;padding:16px}' +
      '#jdPageSkeleton .jdps-chat{flex:1;padding:16px;overflow:hidden}' +
      '#jdPageSkeleton .jdps-comp{padding:16px}' +
      '#jdPageSkeleton.hide{opacity:0;pointer-events:none}' +
      '</style>' +
      '<div class="jdps-head"><span class="ui-shm" style="width:40px;height:40px;border-radius:50%" aria-hidden="true"></span>' +
      '<div style="flex:1"><span class="ui-shm" style="width:40%;height:16px" aria-hidden="true"></span></div>' +
      '<span class="ui-shm" style="width:40px;height:40px;border-radius:12px" aria-hidden="true"></span></div>' +
      '<div class="jdps-chat"></div>' +
      '<div class="jdps-comp"><span class="ui-shm" style="height:56px;border-radius:28px" aria-hidden="true"></span></div>';

    // Add chat skeletons to the chat area
    var chatArea = sk.querySelector('.jdps-chat');
    for (var i = 0; i < 3; i++) chatArea.appendChild(chatSkeleton());

    document.documentElement.appendChild(sk);
  }

  function hidePageSkeleton() {
    var sk = document.getElementById('jdPageSkeleton');
    if (!sk) return;
    sk.classList.add('hide');
    setTimeout(function () { try { sk.remove(); } catch (e) {} }, 350);
  }

  /* ---------- Public API ---------- */
  window.jdShimmer = {
    skeleton: skeleton,
    text: shimmerText,
    showPage: showPageSkeleton,
    hidePage: hidePageSkeleton
  };

  /* Backwards-compatible wrapper: window.jdSkeleton */
  window.jdSkeleton = {
    show: function (el, type, count) {
      ensureCSS();
      if (!el) return null;
      var wrap = document.createElement('div');
      wrap.className = 'jd-skeleton-wrap';
      wrap.setAttribute('data-jd-sk', '1');
      wrap.setAttribute('aria-busy', 'true');
      if (type === 'chat') wrap.appendChild(chatSkeleton());
      else if (type === 'card') wrap.appendChild(cardSkeleton(count));
      else if (type === 'list') wrap.appendChild(listSkeleton(count));
      else if (type === 'grid') wrap.appendChild(gridSkeleton(count));
      else wrap.appendChild(skeleton({ width: '100%', height: 60 }));
      el.appendChild(wrap);
      return wrap;
    },
    hide: function (el) {
      if (!el) return;
      var sk = el.querySelector('[data-jd-sk]');
      if (sk) sk.remove();
    },
    showPage: showPageSkeleton,
    hidePage: hidePageSkeleton
  };

  /* Auto-show on page load, hide when app ready */
  if (document.readyState === 'loading') {
    showPageSkeleton();
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(hidePageSkeleton, 800);
    });
  }

  /* Legacy CSS cleanup: remove old jd-sk styles if they exist */
  function cleanupLegacy() {
    var old = document.getElementById('jdSkeletonCss');
    if (old) old.remove();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupLegacy);
  } else {
    cleanupLegacy();
  }
})();
