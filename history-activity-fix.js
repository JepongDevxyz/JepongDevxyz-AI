/* =========================================================
   JepongDevxyz AI — history activity fix (2026-10-03)
   Runtime patch loaded by agent.js (additive only).

   Bug: after page refresh, saved activity statuses (Thinking,
   Checking, etc.) are rendered from chat history, but the
   message TEXT is missing. In Pure Mode, activity should never
   show at all.

   Fix: wrap renderJdStoredActivity to return null when Pure
   Mode is on. Activity statuses are transient — they describe
   a past request, not content — so they should not persist
   across refreshes in Pure Mode.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdHistoryActivityFixLoaded) return;
  window.__jdHistoryActivityFixLoaded = true;

  function pureOn() {
    try {
      if (typeof window.jdPureModeOn === 'function') return window.jdPureModeOn();
      return localStorage.getItem('jd_pure_mode') === '1';
    } catch (e) { return false; }
  }

  function hook() {
    try {
      if (typeof window.renderJdStoredActivity !== 'function') return false;
      if (window.renderJdStoredActivity.__jdHooked) return true;
      var orig = window.renderJdStoredActivity;
      var wrapped = function (saved) {
        // In Pure Mode, never render saved activity statuses.
        if (pureOn()) return null;
        return orig.apply(this, arguments);
      };
      wrapped.__jdHooked = true;
      window.renderJdStoredActivity = wrapped;
      return true;
    } catch (e) { return false; }
  }

  if (!hook()) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (hook() || tries > 40) clearInterval(iv);
    }, 250);
  }

  // Also hide any activity cards that were already rendered
  // before this patch loaded (race with history restore).
  function cleanupExisting() {
    try {
      if (!pureOn()) return;
      document.querySelectorAll('.ai-activity-card.ai-activity-archived').forEach(function (el) {
        el.style.display = 'none';
      });
    } catch (e) {}
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(cleanupExisting, 500); });
  } else {
    setTimeout(cleanupExisting, 500);
  }
})();
