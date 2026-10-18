/* =========================================================
   JepongDevxyz AI — Shimmer Loader (exact AffectUI implementation)
   Source: https://www.affectui.com/motion/shimmer-loader
   Rebuilt as vanilla JS following the app's patch conventions.
   
   Key features (exact from AffectUI):
   - Viewport-pinned shimmer sweep: all skeleton blocks share ONE
     synchronized light sweep across the viewport (background-attachment: fixed)
   - ShimmerText: shimmering text for "Thinking..." / AI generating states
   - Dark mode: follows .dark class or data-theme="dark" (+ app's body.theme-light)
   - Reduced motion: static placeholders when prefers-reduced-motion
   - ARIA: skeletons are aria-hidden, containers get aria-busy="true"

   Public API:
   - window.jdSkeleton.show(el, type, count) / .hide(el) (backwards compatible)
   - window.jdShimmer.skeleton({width, height, radius, circle}) -> element
   - window.jdShimmer.text(label, duration) -> element (ShimmerText)
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdShimmerLoader) return;
  window.__jdShimmerLoader = true;

  /* ---------- Exact AffectUI CSS ---------- */
  var CSS = [
    '.ui-shm,',
    '.ui-shm-text {',
    '  --ui-shm-base: #ececec;',
    '  --ui-shm-glow: rgba(255, 255, 255, 0.9);',
    '  --ui-shm-text: #a3a3a3;',
    '  --ui-shm-text-glow: #ffffff;',
    '  --ui-shm-dur: 2.2s;',
    '}',
    '',
    '/* Skeleton: one fixed gradient for the whole viewport, so all blocks sweep together */',
    '.ui-shm {',
    '  display: block;',
    '  flex: none;',
    '  width: 100%;',
    '  height: 12px;',
    '  max-width: 100%;',
    '  border-radius: 6px;',
    '  background-color: var(--ui-shm-base);',
    '  background-image: linear-gradient(',
    '    100deg,',
    '    transparent 0%,',
    '    transparent 30%,',
    '    var(--ui-shm-glow) 50%,',
    '    transparent 70%,',
    '    transparent 100%',
    '  );',
    '  background-size: 150vw 100%;',
    '  background-repeat: repeat-x;',
    '  background-attachment: fixed;',
    '  animation: ui-shm-sweep var(--ui-shm-dur) linear infinite;',
    '}',
    '@keyframes ui-shm-sweep {',
    '  from { background-position: -50vw 0; }',
    '  to { background-position: 100vw 0; }',
    '}',
    '',
    '/* Text: a highlight band runs through the letters */',
    '.ui-shm-text {',
    '  display: inline-block;',
    '  color: var(--ui-shm-text);',
    '  background-image: linear-gradient(',
    '    90deg,',
    '    var(--ui-shm-text) 0%,',
    '    var(--ui-shm-text) 40%,',
    '    var(--ui-shm-text-glow) 50%,',
    '    var(--ui-shm-text) 60%,',
    '    var(--ui-shm-text) 100%',
    '  );',
    '  background-size: 300% 100%;',
    '  background-position: 100% 0;',
    '  -webkit-background-clip: text;',
    '  background-clip: text;',
    '  -webkit-text-fill-color: transparent;',
    '  animation: ui-shm-text var(--ui-shm-text-dur, 2s) linear infinite;',
    '}',
    '@keyframes ui-shm-text {',
    '  from { background-position: 100% 0; }',
    '  to { background-position: 0% 0; }',
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .ui-shm { animation: none; background-image: none; }',
    '  .ui-shm-text { animation: none; background-image: none; -webkit-text-fill-color: currentColor; }',
    '}',
    '',
    '/* Dark mode: follows .dark class or data-theme="dark" */',
    ':where(.dark, [data-theme="dark"]) .ui-shm,',
    ':where(.dark, [data-theme="dark"]) .ui-shm-text {',
    '  --ui-shm-base: #2f2f33;',
    '  --ui-shm-glow: rgba(255, 255, 255, 0.08);',
    '  --ui-shm-text: #6e6e73;',
    '  --ui-shm-text-glow: #f5f5f5;',
    '}',
    '/* App-specific: body.theme-light for light mode (app convention) */',
    'body.theme-light .ui-shm,',
    'body.theme-light .ui-shm-text {',
    '  --ui-shm-base: #ececec;',
    '  --ui-shm-glow: rgba(255, 255, 255, 0.9);',
    '  --ui-shm-text: #a3a3a3;',
    '  --ui-shm-text-glow: #ffffff;',
    '}',
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdShimmerCss')) return;
    var st = document.createElement('style');
    st.id = 'jdShimmerCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- Skeleton builder (exact AffectUI API) ---------- */
  function skeleton(opts) {
    opts = opts || {};
    ensureCSS();
    var el = document.createElement('span');
    el.className = 'ui-shm';
    el.setAttribute('aria-hidden', 'true');
    
    var w = opts.width;
    var h = opts.height;
    var r = opts.radius;
    
    function len(v) { return typeof v === 'number' ? v + 'px' : v; }
    
    if (w !== undefined) el.style.width = len(w);
    if (opts.circle) {
      el.style.height = len(w);
      el.style.borderRadius = '50%';
    } else {
      if (h !== undefined) el.style.height = len(h);
      if (r !== undefined) el.style.borderRadius = len(r);
    }
    
    return el;
  }

  /* ---------- ShimmerText builder (exact AffectUI API) ---------- */
  function shimmerText(label, duration) {
    ensureCSS();
    var el = document.createElement('span');
    el.className = 'ui-shm-text';
    el.textContent = label || '';
    if (duration) el.style.setProperty('--ui-shm-text-dur', duration + 's');
    return el;
  }

  /* ---------- Backwards-compatible jdSkeleton API ---------- */
  function show(el, type, count) {
    ensureCSS();
    if (!el) return;
    el.setAttribute('aria-busy', 'true');
    
    var html = '';
    count = count || 3;
    
    if (type === 'chat') {
      for (var i = 0; i < count; i++) {
        html += '<div style="display:flex;gap:12px;margin-bottom:16px;">' +
          '<span class="ui-shm" style="width:36px;height:36px;border-radius:50%;flex:none;"></span>' +
          '<div style="flex:1;">' +
            '<span class="ui-shm" style="width:92%;height:12px;margin-bottom:8px;"></span>' +
            '<span class="ui-shm" style="width:78%;height:12px;margin-bottom:8px;"></span>' +
            '<span class="ui-shm" style="width:60%;height:12px;"></span>' +
          '</div></div>';
      }
    } else if (type === 'list') {
      for (var j = 0; j < count; j++) {
        html += '<span class="ui-shm" style="height:48px;margin-bottom:8px;border-radius:12px;"></span>';
      }
    } else if (type === 'card') {
      for (var k = 0; k < count; k++) {
        html += '<span class="ui-shm" style="height:80px;margin-bottom:12px;border-radius:16px;"></span>';
      }
    } else {
      for (var m = 0; m < count; m++) {
        html += '<span class="ui-shm" style="margin-bottom:8px;"></span>';
      }
    }
    
    el.innerHTML = html;
  }

  function hide(el) {
    if (!el) return;
    el.removeAttribute('aria-busy');
    el.innerHTML = '';
  }

  window.jdShimmer = {
    skeleton: skeleton,
    text: shimmerText,
  };
  
  window.jdSkeleton = window.jdSkeleton || {};
  window.jdSkeleton.show = show;
  window.jdSkeleton.hide = hide;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureCSS);
  } else {
    ensureCSS();
  }
})();
