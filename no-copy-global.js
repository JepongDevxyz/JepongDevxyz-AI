/* JepongDevxyz AI — Global No-Copy Protection (2026-10-10)
   Prevents text selection/copying throughout the app EXCEPT in chat messages.
   - All UI text (Settings, Library, etc.) cannot be selected or copied
   - Chat messages (.msg.bot for AI, .msg.user for user) CAN be selected/copied
   - Prevents Google search overlay on long-press (Android)
   User's order: "hindi macopy ang settings word lahat basta ang allowed lang macopy response ng AI chat ng user"
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdNoCopyGlobal) return;
  window.__jdNoCopyGlobal = true;

  var CSS = [
    /* Disable text selection globally */
    'body{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}',
    'body *{-webkit-user-select:none!important;user-select:none!important}',
    /* Allow selection in chat messages (AI and user) */
    '.msg.bot, .msg.bot *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}',
    '.msg.user, .msg.user *{-webkit-user-select:text!important;user-select:text!important;-webkit-touch-callout:default!important}',
    /* Allow selection in input fields (so users can edit) */
    'input, textarea{-webkit-user-select:text!important;user-select:text!important}',
    'input *, textarea *{-webkit-user-select:text!important;user-select:text!important}'
  ].join('\n');

  function init() {
    if (document.getElementById('jdNoCopyCss')) return;
    var st = document.createElement('style');
    st.id = 'jdNoCopyCss';
    st.textContent = CSS;
    document.head.appendChild(st);

    // Prevent system context menu on long-press (except in chat)
    document.addEventListener('contextmenu', function (e) {
      var inChat = e.target.closest && (e.target.closest('.msg.bot') || e.target.closest('.msg.user'));
      if (!inChat) e.preventDefault();
    });

    // Prevent text selection start (except in chat and inputs)
    document.addEventListener('selectstart', function (e) {
      var t = e.target;
      var inChat = t.closest && (t.closest('.msg.bot') || t.closest('.msg.user'));
      var inInput = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || (t.closest && t.closest('input, textarea'));
      if (!inChat && !inInput) {
        e.preventDefault();
        return false;
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
