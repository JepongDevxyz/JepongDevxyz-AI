/* Fix blurry sidebar: keep background blur, ensure sidebar stays sharp */
(function() {
  'use strict';
  if (window.__jdSidebarBlurFix) return;
  window.__jdSidebarBlurFix = true;
  
  var css = document.createElement('style');
  css.id = 'jdSidebarBlurFixCss';
  css.textContent = `
    /* Ensure sidebar is in its own compositing layer, above the blur */
    .sidebar {
      isolation: isolate !important;
      transform: translateZ(0) !important;
    }
    .sidebar.drawer-left.open,
    .sidebar.drawer-right.open,
    .sidebar.drawer-bottom.open {
      transform: translateZ(0) !important;
    }
    /* Keep the overlay blur for background, but ensure it doesn't affect sidebar */
    .sidebar-overlay {
      isolation: isolate !important;
    }
  `;
  document.head.appendChild(css);
})();
