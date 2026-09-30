/* ============================================================
   JepongDevxyz AI — onboarding order patch (runtime, 2026-10-01)
   Keisha: the first-run flow must be
     Welcome -> Start Chat -> Terms/Privacy consent -> Agree
     -> "Create your account".
   The app already has all three screens; it just skipped the
   account step after consent (guests landed straight in the app).
   This patch hooks consent acceptance and opens the account modal
   in sign-up mode ("Create your account" / "Already have an
   account? Log in"). Dismissing it keeps the free guest flow.
   Additive only: no existing code above is modified. Fail-open:
   if anything is missing, the original consent flow runs as-is.
   ============================================================ */
(function () {
  'use strict';
  var CREATE_TITLE = 'Create your account';
  var CREATE_SUB = 'Sign in to sync Memory, Library, settings and chats across devices.';
  var DEFAULT_SUB_RE = /securely sync chats and settings/i;

  function ensureSignUpMode() {
    try {
      var title = document.getElementById('jdAuthTitle');
      if (!title) return;
      // switchJdAuthMode() toggles; at most two calls land on sign-up mode
      for (var i = 0; i < 2; i++) {
        if (title.textContent.trim() === CREATE_TITLE) break;
        if (typeof switchJdAuthMode === 'function') switchJdAuthMode();
        else break;
      }
    } catch (e) { /* fail-open */ }
  }

  function applyCreateCopy() {
    try {
      var sub = document.getElementById('cloudAccountStatus');
      // only replace the default subtitle, never a live status message
      if (sub && DEFAULT_SUB_RE.test(sub.textContent)) sub.textContent = CREATE_SUB;
    } catch (e) { /* fail-open */ }
  }

  function signedIn() {
    try { return !!window.cloudUser; } catch (e) { return false; }
  }

  function hook() {
    try {
      if (typeof jdAcceptLegalConsent !== 'function' || jdAcceptLegalConsent.__jdOrderHooked) return true;
      var original = jdAcceptLegalConsent;
      var wrapped = function () {
        var result = original.apply(this, arguments);
        try {
          // show "Create your account" right after consent — guests only
          if (!signedIn() && typeof openAccountModal === 'function') {
            ensureSignUpMode();
            openAccountModal();
            ensureSignUpMode(); // renderCloudAccount runs inside open; re-assert after
            applyCreateCopy();
          }
        } catch (e) { /* fail-open: consent already accepted above */ }
        return result;
      };
      wrapped.__jdOrderHooked = true;
      jdAcceptLegalConsent = wrapped; // global function declaration -> writable window prop
      return true;
    } catch (e) { return false; }
  }

  // deferred patch scripts run after the inline app script, but retry
  // briefly in case load order ever changes
  var tries = 0;
  var timer = setInterval(function () {
    if (hook() || ++tries > 40) clearInterval(timer);
  }, 250);
})();
