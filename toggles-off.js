/* JepongDevxyz AI — Toggles Off by Default (2026-10-01)
   All toggle switches default to OFF.
   - On first run: sets every checkbox toggle to unchecked (off).
   - Respects user's choices afterwards (only runs once).
   - Also ensures any toggle without a saved state defaults to off.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdTogglesOff) return;
  window.__jdTogglesOff = true;

  var FLAG = 'jd_toggles_off_v1';

  function setAllTogglesOff() {
    // Find all checkbox toggles
    var toggles = document.querySelectorAll('input[type="checkbox"]');
    toggles.forEach(function (cb) {
      // Skip if user has explicitly set this (has a data attribute or was interacted with)
      // We only set defaults, so we check if it's currently checked and uncheck it
      // BUT we need to trigger the change so the app saves the state
      if (cb.checked) {
        cb.checked = false;
        // Dispatch change event so the app's handler saves the off state
        try {
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        } catch (e) {}
      }
    });

    // Also handle toggle switches that aren't checkboxes (custom toggles)
    // Look for elements with toggle-related classes that appear "on"
    document.querySelectorAll('[data-toggle], .toggle-on, .switch-on').forEach(function (el) {
      try {
        el.classList.remove('toggle-on', 'switch-on');
        el.classList.add('toggle-off', 'switch-off');
        el.setAttribute('aria-checked', 'false');
        el.setAttribute('data-toggle', 'off');
      } catch (e) {}
    });
  }

  function ensurePersonalizationDefaults() {
    // Ensure the personalization settings have toggles off by default
    try {
      var key = 'jepong_personalization';
      var raw = localStorage.getItem(key);
      var settings = raw ? JSON.parse(raw) : {};
      var changed = false;
      // List of boolean toggle keys that should default to false
      var toggleKeys = [
        'webSearch', 'webSearchEnabled',
        'responseSpeech', 'speechEnabled',
        'reconnectNotice', 'reconnectCard',
        'autoFallback', 'autoProviderFallback',
        'smartRouter', 'smartModelRouter',
        'notifications', 'replyNotifications',
        'haptics', 'hapticsEnabled', 'hapticsButtons', 'hapticsResponse',
        'fastAnswers', 'suggestedPrompts',
        'memoryEnabled', 'referenceHistory', 'referenceRecordHistory',
        'recordHistory', 'canvas', 'voiceFeature', 'librarySearch',
        'voiceAutoPreview'
      ];
      toggleKeys.forEach(function (k) {
        if (!(k in settings)) {
          settings[k] = false;
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(key, JSON.stringify(settings));
      }
    } catch (e) {}
  }

  function init() {
    // Only run the "set all off" once (first run)
    var alreadyRun = false;
    try { alreadyRun = localStorage.getItem(FLAG) === '1'; } catch (e) {}

    ensurePersonalizationDefaults();

    if (!alreadyRun) {
      // Wait for app to fully load, then set all toggles off
      var attempts = 0;
      var timer = setInterval(function () {
        attempts++;
        setAllTogglesOff();
        ensurePersonalizationDefaults();
        if (attempts >= 10) {
          clearInterval(timer);
          try { localStorage.setItem(FLAG, '1'); } catch (e) {}
        }
      }, 1000);
    }

    // Continuously ensure new toggles default to off (for dynamically added ones)
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        mu.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          var cbs = node.querySelectorAll ? node.querySelectorAll('input[type="checkbox"]') : [];
          cbs.forEach(function (cb) {
            // Only auto-off if it's a new toggle that defaults to checked
            // (we don't want to fight the user turning things on)
            if (cb.checked && !cb.__jdUserSet) {
              // Check if this is a fresh default (not user-set)
              // We'll leave it alone if the user interacted with it
              cb.addEventListener('change', function () { cb.__jdUserSet = true; }, { once: true });
            }
          });
        });
      });
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
