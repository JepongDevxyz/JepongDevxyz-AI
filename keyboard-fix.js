/* ============================================================
   JepongDevxyz AI — keyboard behavior + scroll-pill root-cause fix
   Rewritten 2026-10-01 (replaces the 2026-10-01 v2 patch; /tmp copy was
   wiped, reconstructed here).

   ChatGPT-style behavior (unchanged):
   - Messages stay PIXEL-IDENTICAL when the keyboard opens (no reflow).
   - ONLY the input bar moves, in perfect sync with the keyboard animation,
     sitting directly on top of the keyboard. Transform never triggers
     reflow, so messages can't move.

   ROOT CAUSE of the floating scroll pill (↓ stuck high with a shadow):
   index.html's syncChatComposerReserve() measured #inputContainer with
   getBoundingClientRect(), which INCLUDES this patch's GPU translateY.
   On keyboard CLOSE, visualViewport 'resize' fires BEFORE our rAF removes
   the transform (our listener was registered later than the inline one),
   so the old code read a stale translated rect.top and stored an inflated
   --jd-composer-reserve — and nothing ever re-ran it (ResizeObserver does
   not fire for transforms; window resize doesn't fire for keyboards), so
   the pill floated high FOREVER. Fix, two layers:
     1) Transform-immune measurement: subtract our own known translateY to
        recover the composer's natural top, and add the keyboard height
        explicitly. The reading is correct at EVERY moment, so no stale
        state can ever exist.
     2) Convergence: after every apply, re-run the reserve computation on a
        double rAF so a mid-transition reading can never stick.
   The patched function replaces window.syncChatComposerReserve globally,
   so the existing ResizeObserver / window-resize / vv-resize call sites all
   get the fix with no index.html change.

   Cross-browser keyboard detection:
   - kbH = fullH - visualViewport.height, where fullH is a no-keyboard
     layout-height baseline. The baseline never shrinks while an
     INPUT/TEXTAREA/contenteditable is focused (a shrunken innerHeight
     then is the keyboard in resizes-content browsers); it re-tracks when
     unfocused and resets on orientationchange.
   - Body lock uses a --jd-kb-full px var instead of 100vh (100vh locks are
     unreliable when the keyboard shrinks the layout viewport in
     non-Chrome browsers).

   Pure addition: no existing app code is modified in place.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdKeyboardFixV3) return;
  window.__jdKeyboardFixV3 = true;

  try {
    if (!('visualViewport' in window)) return;
    var vv = window.visualViewport;
    var root = document.documentElement;

    /* Remove legacy CSS from previous versions of this patch. */
    ['jdKeyboardCss', 'jdKeyboardCss2'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });

    /* CSS: lock body to the no-keyboard height (px var, not 100vh). */
    if (!document.getElementById('jdKeyboardCss3')) {
      var st = document.createElement('style');
      st.id = 'jdKeyboardCss3';
      /* Jepong 2026-10-01: no shadow on the scroll pill. */
      st.textContent =
        'html.jd-kb-open body{height:var(--jd-kb-full,100vh)!important;' +
        'min-height:var(--jd-kb-full,100vh)!important;' +
        'max-height:var(--jd-kb-full,100vh)!important}' +
        'html.jd-kb-open #inputContainer{will-change:transform;transition:none!important}' +
        '#scrollPill.floating-scroll-pill{box-shadow:none!important}';
      document.head.appendChild(st);
    }

    function inputEl() {
      return document.getElementById('inputContainer');
    }
    function isEditing() {
      var ae = document.activeElement;
      return !!(ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable));
    }

    /* ---------- no-keyboard layout-height baseline ---------- */
    var fullH = 0;
    function snapshotBaseline() {
      var h = window.innerHeight || document.documentElement.clientHeight || 0;
      if (!h) return;
      if (!fullH) {
        fullH = h;
      } else if (isEditing()) {
        // While editing, a smaller innerHeight is the keyboard (non-Chrome
        // resizes-content mode) — never shrink the baseline into it.
        if (h > fullH) fullH = h;
      } else {
        fullH = h; // no keyboard possible: track freely (URL-bar show/hide)
      }
      root.style.setProperty('--jd-kb-full', fullH + 'px');
    }

    function keyboardHeight() {
      snapshotBaseline();
      var vh = Math.ceil((vv && vv.height) || window.innerHeight || 0);
      return Math.max(0, fullH - vh);
    }

    /* ---------- transform-immune composer reserve ---------- */
    var lastY = 0; // our current translateY on #inputContainer (<= 0)

    function jdSyncReserve() {
      try {
        var input = inputEl();
        var rect = input && input.getBoundingClientRect ? input.getBoundingClientRect() : null;
        if (!rect || !rect.height) {
          // Composer not measurable: fall back to the CSS default instead of
          // writing a garbage value that would park the pill mid-screen.
          root.style.setProperty('--jd-composer-reserve', '92px');
          return;
        }
        // getBoundingClientRect() includes our translateY: remove it to get
        // the natural top, then add the keyboard height explicitly. Correct
        // in every state (open / closed / mid-animation).
        var naturalTop = rect.top - lastY;
        var layoutH = fullH || window.innerHeight || document.documentElement.clientHeight || 0;
        var vh = Math.ceil((vv && vv.height) || layoutH);
        var kbH = Math.max(0, layoutH - vh);
        var reserve = Math.max(72, Math.ceil(layoutH - naturalTop + kbH));
        root.style.setProperty('--jd-composer-reserve', reserve + 'px');
      } catch (_) {}
    }

    // Swap the global: all existing call sites (ResizeObserver, window
    // resize, visualViewport resize) pick up the fixed implementation.
    var reserveTries = 0;
    function installReservePatch() {
      reserveTries++;
      try {
        if (typeof window.syncChatComposerReserve === 'function') {
          if (!window.__jdReservePatched) {
            window.syncChatComposerReserve = jdSyncReserve;
            window.__jdReservePatched = true;
          }
          jdSyncReserve(); // heal any stale value left by the old version
          return;
        }
      } catch (_) {}
      if (reserveTries < 40) setTimeout(installReservePatch, 250);
    }

    /* ---------- transform driver ---------- */
    var rafId = 0;
    function scheduleApply() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(applyTransform);
    }

    function applyTransform() {
      try {
        var kbH = keyboardHeight();
        var open = kbH > 120;
        root.classList.toggle('jd-kb-open', open);
        var y = open ? -Math.round(kbH) : 0;
        if (y !== lastY) {
          lastY = y;
          var inp = inputEl();
          if (inp) inp.style.transform = y ? 'translateY(' + y + 'px)' : '';
        }
        if (!open) root.style.removeProperty('--jd-vv-h');
        // Convergence: recompute the reserve AFTER the transform settles
        // (double rAF), so a mid-transition reading can never stick.
        requestAnimationFrame(function () {
          requestAnimationFrame(jdSyncReserve);
        });
      } catch (_) {}
    }

    vv.addEventListener('resize', scheduleApply);
    vv.addEventListener('scroll', scheduleApply);
    window.addEventListener('resize', scheduleApply);
    window.addEventListener('orientationchange', function () {
      fullH = 0; // re-baseline for the new orientation
      setTimeout(function () { snapshotBaseline(); scheduleApply(); }, 300);
    });
    document.addEventListener('focusin', scheduleApply);
    document.addEventListener('focusout', function () { setTimeout(scheduleApply, 60); });

    snapshotBaseline();
    installReservePatch();
    scheduleApply();
  } catch (_) {}
})();
