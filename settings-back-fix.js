/* JepongDevxyz AI — Settings Back Navigation Fix (2026-10-09)
   Ensures proper back navigation in Settings:
   - Detail page back → Settings list
   - Settings list back → Chat (not homepage)
   - Android system back button handled correctly
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdSettingsBackFix) return;
  window.__jdSettingsBackFix = true;

  // Track Settings navigation stack
  var settingsStack = [];

  function isSettingsOpen() {
    var modal = document.getElementById('settingsModal');
    return modal && modal.classList.contains('open');
  }

  function isDetailPageOpen() {
    // Check if a detail page is open over Settings
    var details = document.querySelectorAll('.settings-detail-page, .jd-settings-detail');
    for (var i = 0; i < details.length; i++) {
      if (!details[i].hidden && details[i].offsetParent !== null) {
        return details[i];
      }
    }
    return null;
  }

  // Intercept back button clicks in Settings
  document.addEventListener('click', function (e) {
    var backBtn = e.target.closest('.settings-back, .jdset-back, [data-action="back"]');
    if (!backBtn) return;

    var detailPage = isDetailPageOpen();
    if (detailPage) {
      // If in detail page, go back to Settings list (don't close Settings)
      e.preventDefault();
      e.stopPropagation();
      detailPage.hidden = true;
      if (detailPage.style) detailPage.style.display = 'none';
      // Show Settings list again
      var modal = document.getElementById('settingsModal');
      if (modal) {
        var list = modal.querySelector('.settings-home-scroll, .settings-list');
        if (list) list.style.display = '';
      }
    }
    // If in Settings list, let the default close behavior happen
  }, true);

  // Handle Android system back button via history
  var originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(history, arguments);
    // Track when Settings is opened
    if (isSettingsOpen()) {
      settingsStack.push('settings');
    }
  };

  window.addEventListener('popstate', function (e) {
    var detailPage = isDetailPageOpen();
    if (detailPage && isSettingsOpen()) {
      // Prevent going to homepage, stay in Settings list
      e.preventDefault();
      detailPage.hidden = true;
      if (detailPage.style) detailPage.style.display = 'none';
      history.pushState({ settings: true }, '');
    }
  });

  console.log('[jdSettingsBackFix] Initialized');
})();
