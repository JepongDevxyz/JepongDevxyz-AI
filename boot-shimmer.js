/* =========================================================
   JepongDevxyz AI — Boot Skeleton Shimmer Enhancement
   Replaces the static boot skeleton placeholders with
   animated shimmer loader effect (affectUI style).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdBootShimmer) return;
  window.__jdBootShimmer = true;

  // Add shimmer animation CSS for boot skeleton
  var css = document.createElement('style');
  css.id = 'jdBootShimmerCss';
  css.textContent = [
    /* Shimmer sweep animation for all boot skeleton blocks */
    '#jdBootSkeleton [class*="jd-boot-"] > div,',
    '#jdBootSkeleton .jd-boot-bar,',
    '#jdBootSkeleton .jd-boot-circle,',
    '#jdBootSkeleton .jd-boot-line {',
    '  position: relative;',
    '  overflow: hidden;',
    '  background-color: var(--boot-surface, #222) !important;',
    '}',
    '#jdBootSkeleton [class*="jd-boot-"] > div::after,',
    '#jdBootSkeleton .jd-boot-bar::after,',
    '#jdBootSkeleton .jd-boot-circle::after,',
    '#jdBootSkeleton .jd-boot-line::after {',
    '  content: "";',
    '  position: absolute;',
    '  inset: 0;',
    '  background: linear-gradient(100deg, transparent 20%, var(--boot-hi, rgba(255,255,255,.13)) 50%, transparent 80%);',
    '  background-size: 200% 100%;',
    '  animation: jd-boot-shimmer 1.8s ease-in-out infinite;',
    '}',
    '@keyframes jd-boot-shimmer {',
    '  0% { background-position: 180% 0; }',
    '  100% { background-position: -80% 0; }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  #jdBootSkeleton [class*="jd-boot-"] > div::after,',
    '  #jdBootSkeleton .jd-boot-bar::after,',
    '  #jdBootSkeleton .jd-boot-circle::after,',
    '  #jdBootSkeleton .jd-boot-line::after {',
    '    animation: none;',
    '    display: none;',
    '  }',
    '}',
  ].join('\n');
  
  // Inject as early as possible
  if (document.head) {
    document.head.appendChild(css);
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      document.head.appendChild(css);
    });
  }
})();
