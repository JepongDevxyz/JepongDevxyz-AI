/* JepongDevxyz AI — Back Navigation (2026-10-01)
   Makes the Android/browser back button work inside the app: pressing back
   closes the current settings page/modal/view and returns to the previous
   screen — instead of jumping all the way back to the homepage.
   - Maintains a JS stack of open views (modals, overlays, sheets, pages).
   - Uses a single History API entry: back press -> close top view -> push
     a fresh entry so the next back press is also intercepted.
   - Detects views generically via MutationObserver (no per-view hooks).
   - Pure addition: no existing code changed. Idempotent. */
(function () {
  'use strict';
  if (window.__jdBackNav) return;
  window.__jdBackNav = true;

  /* Views are elements that act as screens: modals, overlays, sheets. */
  var VIEW_SELECTORS = [
    '#settingsModal',
    '#personalizationModalOverlay',
    '#accountModal',
    '#providerKeysModal',
    '#presetsModal',
    '#voiceModal',
    '#dolaModal',
    '.jd-modal-open',           /* generic marker some patches use */
    '[data-jd-view]'           /* opt-in marker for patch-built views */
  ];

  var viewStack = [];   /* [{el, name}] — top is last */
  var historyPushed = false;
  var suppressObserver = false;

  function nameOf(el) {
    return el.id || (el.className && el.className.split ? el.className.split(' ')[0] : 'view');
  }

  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    try {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    } catch (e) { return false; }
    // Modals typically use .open class; overlays use [hidden] removal
    if (el.classList.contains('open')) return true;
    if (el.hasAttribute('hidden')) return false;
    // If it has the view selector and is in DOM and not display:none, treat as open
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function pushHistory() {
    if (historyPushed) return;
    try {
      history.pushState({ jdBackNav: true }, '');
      historyPushed = true;
    } catch (e) {}
  }

  function onViewOpened(el) {
    var name = nameOf(el);
    // Don't duplicate the top
    if (viewStack.length && viewStack[viewStack.length - 1].el === el) return;
    // Remove if already in stack (re-opened)
    viewStack = viewStack.filter(function (v) { return v.el !== el; });
    viewStack.push({ el: el, name: name });
    pushHistory();
  }

  function onViewClosed(el) {
    viewStack = viewStack.filter(function (v) { return v.el !== el; });
    if (!viewStack.length && historyPushed) {
      // All views closed via UI — remove our history entry so back exits normally.
      // Use a flag so the resulting popstate doesn't try to close anything.
      historyPushed = false;
      try { history.back(); } catch (e) {}
    }
  }

  function closeTopView() {
    var top = viewStack[viewStack.length - 1];
    if (!top) return false;
    var el = top.el;
    suppressObserver = true;
    try {
      // Try known close mechanisms in order
      if (el.classList.contains('open')) el.classList.remove('open');
      el.setAttribute('hidden', '');
      // Also try a close button inside
      var cb = el.querySelector('[data-close], .jd-modal-close, .close-btn');
      if (cb && el.classList.contains('open')) {
        // Already handled via class removal above
      }
      // Dispatch a custom event so patches can react
      el.dispatchEvent(new CustomEvent('jd-back-close', { bubbles: true }));
    } catch (e) {}
    // Re-check after a tick (some views animate)
    setTimeout(function () {
      suppressObserver = false;
      if (!isVisible(el)) onViewClosed(el);
      else {
        // Still visible — force hide as last resort
        try { el.style.display = 'none'; } catch (e2) {}
        onViewClosed(el);
        setTimeout(function () { try { el.style.display = ''; } catch (e3) {} }, 50);
      }
      scanViews();
    }, 60);
    return true;
  }

  function scanViews() {
    if (suppressObserver) return;
    var found = [];
    VIEW_SELECTORS.forEach(function (sel) {
      var els;
      try { els = document.querySelectorAll(sel); } catch (e) { return; }
      els.forEach(function (el) {
        if (isVisible(el)) found.push(el);
      });
    });
    // Also catch patch-built modals: fixed-position full overlays with high z-index
    // (only if they look like app views, not toasts)
    try {
      document.querySelectorAll('div[id]').forEach(function (el) {
        if (found.indexOf(el) !== -1) return;
        var id = el.id || '';
        if (!/modal|overlay|sheet|drawer|page/i.test(id)) return;
        if (id === 'jdOfflineBar') return;
        if (isVisible(el)) {
          var cs = getComputedStyle(el);
          if (cs.position === 'fixed' && parseInt(cs.zIndex || '0', 10) >= 1000) found.push(el);
        }
      });
    } catch (e) {}

    // Sync stack with reality
    var current = viewStack.map(function (v) { return v.el; });
    found.forEach(function (el) {
      if (current.indexOf(el) === -1) onViewOpened(el);
    });
    current.forEach(function (el) {
      if (found.indexOf(el) === -1) onViewClosed(el);
    });
  }

  /* Back button (popstate): close the top view instead of leaving. */
  window.addEventListener('popstate', function () {
    historyPushed = false; // the entry was popped
    if (viewStack.length) {
      closeTopView();
      // Push a fresh entry so the NEXT back press is also intercepted
      // (only if views remain after closing)
      setTimeout(function () {
        if (viewStack.length) pushHistory();
      }, 80);
    }
    // If no views, the browser navigates back normally (homepage).
  });

  function init() {
    // Mark the app root so the first back press doesn't exit when views are open
    try { history.replaceState({ jdBackNavRoot: true }, ''); } catch (e) {}

    // Observe for view open/close
    var mo = new MutationObserver(function () { scanViews(); });
    mo.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['class', 'hidden', 'style']
    });

    scanViews();
    // Periodic re-scan (catches views the observer might miss)
    setInterval(scanViews, 2000);

    // Expose API for patches
    window.jdBackNav = {
      push: function (el) { if (el) onViewOpened(el); },
      pop: function (el) { if (el) onViewClosed(el); },
      stack: function () { return viewStack.map(function (v) { return v.name; }); }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
