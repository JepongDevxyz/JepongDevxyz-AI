/* ChatGPT-style keyboard behavior (added 2026-10-01, Jepong request):
   When the keyboard opens, the chat content must NOT move up —
   only the input bar rises to sit on top of the keyboard.

   How it works:
   1. Sets `interactive-widget=resizes-content` on the viewport meta so
      Chrome shrinks the LAYOUT viewport (not just the visual one) when
      the keyboard opens. The flex layout then reflows: header stays,
      .chat-box shrinks (scroll pos kept), .input-container moves up.
   2. visualViewport listener adds `jd-kb-open` on <html> during the
      keyboard transition for a smooth, jump-free resize.
   Pure addition: no existing code changed. */
(function () {
  try {
    /* 1. Viewport meta: resizes-content */
    var meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      var c = meta.getAttribute('content') || '';
      if (c.indexOf('interactive-widget') === -1) {
        meta.setAttribute('content', c.replace(/\s*$/, '') + ', interactive-widget=resizes-content');
      }
    }

    /* 2. CSS for the keyboard-open state */
    if (!document.getElementById('jdKeyboardCss')) {
      var st = document.createElement('style');
      st.id = 'jdKeyboardCss';
      st.textContent =
        /* Lock body to the visual viewport height while the keyboard
           animates, so nothing jumps. */
        'html.jd-kb-open body{height:var(--jd-vv-h,100dvh)!important;' +
        'min-height:var(--jd-vv-h,100dvh)!important}' +
        /* Keep the message list from bouncing during the transition. */
        'html.jd-kb-open .chat-box{overscroll-behavior:contain}' +
        'html.jd-kb-open .chat-viewport-wrapper{overscroll-behavior:contain}';
      document.head.appendChild(st);
    }

    /* 3. visualViewport: toggle the class + set the height var */
    if (!('visualViewport' in window)) return;
    var vv = window.visualViewport;
    var root = document.documentElement;
    var raf = 0;
    function apply() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        try {
          var kbOpen = (window.innerHeight - vv.height) > 120;
          root.classList.toggle('jd-kb-open', kbOpen);
          if (kbOpen) {
            root.style.setProperty('--jd-vv-h', Math.round(vv.height) + 'px');
          } else {
            root.style.removeProperty('--jd-vv-h');
          }
        } catch (_) {}
      });
    }
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    apply();
  } catch (_) {}
})();
