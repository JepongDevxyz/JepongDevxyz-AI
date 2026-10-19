/* =========================================================
   JepongDevxyz AI — Chat Style Cleanup
   Removes leftover robot avatar styles that cause
   misaligned ("tabingi") chat responses.
   
   The robot avatar feature was reverted, but its CSS
   (padding-left:44px on .msg.bot, absolute positioning)
   may still be cached or applied. This restores the
   original chat message styling.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdChatCleanup) return;
  window.__jdChatCleanup = true;

  function cleanup() {
    // Remove any robot avatar elements
    document.querySelectorAll('.jd-robot-avatar, .jd-robot-chat-avatar, [data-robot-avatar]').forEach(function(el) {
      el.remove();
    });

    // Remove robot avatar styles
    document.querySelectorAll('style').forEach(function(st) {
      var txt = st.textContent || '';
      if (txt.indexOf('jd-robot') !== -1 || txt.indexOf('robot-avatar') !== -1) {
        st.remove();
      }
    });

    // Restore original .msg.bot styling
    var css = document.createElement('style');
    css.id = 'jdChatStyleRestore';
    css.textContent = [
      /* Restore original message layout - remove robot avatar padding */
      '.msg.bot {',
      '  padding-left: 0 !important;',
      '  position: static !important;',
      '}',
      '.msg.bot .jd-robot-avatar,',
      '.msg.bot [data-robot-avatar] {',
      '  display: none !important;',
      '}',
      /* Ensure proper text alignment */
      '.msg.bot .msg-content,',
      '.msg.bot .message-content,',
      '.msg.bot > div {',
      '  margin-left: 0 !important;',
      '  padding-left: 0 !important;',
      '}',
    ].join('\n');
    
    // Remove old restore CSS if exists
    var old = document.getElementById('jdChatStyleRestore');
    if (old) old.remove();
    
    document.head.appendChild(css);

    // Clear robot avatar localStorage
    try {
      localStorage.removeItem('jampong.robot');
    } catch (e) {}
  }

  // Run immediately and on DOM changes
  if (document.body) {
    cleanup();
  } else {
    document.addEventListener('DOMContentLoaded', cleanup);
  }

  // Watch for dynamically added robot elements
  if (window.MutationObserver && document.body) {
    var obs = new MutationObserver(function(mutations) {
      var needsCleanup = false;
      mutations.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1) {
            if (n.classList && (n.classList.contains('jd-robot-avatar') || n.hasAttribute('data-robot-avatar'))) {
              needsCleanup = true;
            }
            if (n.querySelector && n.querySelector('.jd-robot-avatar, [data-robot-avatar]')) {
              needsCleanup = true;
            }
          }
        });
      });
      if (needsCleanup) cleanup();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Stop observing after 30 seconds
    setTimeout(function() { obs.disconnect(); }, 30000);
  }

  // Also run on load
  window.addEventListener('load', cleanup);
})();
