/* Fix blurry sidebar: remove backdrop blur from overlay */
(function() {
  'use strict';
  if (window.__jdSidebarBlurFix) return;
  window.__jdSidebarBlurFix = true;
  
  var css = document.createElement('style');
  css.id = 'jdSidebarBlurFixCss';
  css.textContent = '.sidebar-overlay { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }';
  document.head.appendChild(css);
})();
