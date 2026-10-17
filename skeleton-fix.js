/* JepongDevxyz AI — Skeleton selector fix (2026-10-18)
   Updates the chat skeleton selector in index.html to match the new
   affectUI shimmer-loader (.jd-skeleton-wrap instead of .jd-sk-msg).
   index.html is unpushable via API, so this patch fixes it at runtime.
*/
(function () {
  'use strict';
  if (window.__jdSkeletonFix) return;
  window.__jdSkeletonFix = true;

  // Patch the selector: old code looks for .jd-sk-msg[data-jd-sk="1"]
  // New skeleton uses .jd-skeleton-wrap[data-jd-sk="1"]
  // We monkey-patch querySelector on chatBox elements is too invasive.
  // Instead, ensure backwards compat: add jd-sk-msg class to new skeletons.

  var origShow = null;

  function patch() {
    if (!window.jdSkeleton || origShow) return;
    origShow = window.jdSkeleton.show;
    window.jdSkeleton.show = function (el, type, count) {
      var result = origShow.call(this, el, type, count);
      // Add legacy class for index.html compatibility
      if (result && type === 'chat') {
        result.classList.add('jd-sk-msg');
      }
      return result;
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patch);
  } else {
    patch();
  }

  // Also patch if jdSkeleton loads later
  var check = setInterval(function () {
    if (window.jdSkeleton && !origShow) {
      patch();
      clearInterval(check);
    }
  }, 500);
  setTimeout(function () { clearInterval(check); }, 10000);
})();
