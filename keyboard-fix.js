/* ChatGPT-exact keyboard behavior (rewritten 2026-10-01, Jepong: "frame by frame"):
   Frame-by-frame match to the ChatGPT app video:
   - Messages stay PIXEL-IDENTICAL when the keyboard opens (no reflow).
   - ONLY the input bar moves, in perfect sync with the keyboard animation,
     sitting directly on top of the keyboard.

   How: body is kept at full layout-viewport height (100vh, NOT dvh, so it
   never shrinks), and the input container is moved with a GPU transform
   driven by visualViewport, which fires continuously during the keyboard
   animation. Transform never triggers reflow, so messages can't move.
   Pure addition: no existing code changed. */
(function () {
  try {
    if (!('visualViewport' in window)) return;
    var vv = window.visualViewport;
    var root = document.documentElement;

    /* CSS: lock body to full height so the layout never reflows. */
    if (!document.getElementById('jdKeyboardCss2')) {
      var st = document.createElement('style');
      st.id = 'jdKeyboardCss2';
      st.textContent =
        'html.jd-kb-open body{height:100vh!important;min-height:100vh!important;' +
        'max-height:100vh!important}' +
        'html.jd-kb-open #inputContainer{will-change:transform;' +
        'transition:none!important}';
      document.head.appendChild(st);
    }
    /* Remove the old approach's CSS if present. */
    var oldCss = document.getElementById('jdKeyboardCss');
    if (oldCss) oldCss.remove();

    function inputEl() {
      return document.getElementById('inputContainer');
    }

    var raf = 0, lastY = 0;
    function apply() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        try {
          var kbH = window.innerHeight - vv.height;
          var open = kbH > 120;
          root.classList.toggle('jd-kb-open', open);
          var y = open ? -Math.round(kbH) : 0;
          /* Only touch the DOM when the value actually changed. */
          if (y !== lastY) {
            lastY = y;
            var inp = inputEl();
            if (inp) inp.style.transform = y ? 'translateY(' + y + 'px)' : '';
          }
          /* Keep the old var clean. */
          if (!open) root.style.removeProperty('--jd-vv-h');
        } catch (_) {}
      });
    }

    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    /* Also re-apply after orientation changes / UI settles. */
    window.addEventListener('orientationchange', function () {
      setTimeout(apply, 300);
    });
    apply();
  } catch (_) {}
})();
