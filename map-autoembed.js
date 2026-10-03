/* =========================================================
   JepongDevxyz AI — Auto-embed maps client-side
   Runtime patch loaded by agent.js (additive only).

   Automatically converts map links in AI responses to embedded
   iframes. Works for:
   - Route maps (route-*.html)
   - Weather/radar maps (weather-*.html)

   The user sees the map directly, no need to tap a link.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdMapAutoEmbedLoaded) return;
  window.__jdMapAutoEmbedLoaded = true;

  function isMapUrl(url) {
    if (!url) return false;
    var u = String(url).toLowerCase();
    // Match Vercel Blob storage URLs with HTML files
    // (route maps, weather/radar maps are uploaded as .html)
    if (u.indexOf('blob.vercel-storage.com') !== -1 && u.indexOf('.html') !== -1) {
      return true;
    }
    // Match by filename patterns
    if ((u.indexOf('route-') !== -1 || u.indexOf('weather-') !== -1) && u.indexOf('.html') !== -1) {
      return true;
    }
    return false;
  }

  function embedMap(link) {
    try {
      var url = link.href;
      if (!isMapUrl(url)) return;
      // Don't double-embed
      if (link.dataset.jdMapEmbedded) return;
      link.dataset.jdMapEmbedded = '1';

      // Create iframe
      var iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.cssText = 'width:100%;height:400px;border:0;border-radius:12px;margin:12px 0;display:block';
      iframe.setAttribute('loading', 'lazy');
      iframe.title = 'Map';

      // Replace the link with the iframe, or insert after
      // Keep the link text but add the map below it
      link.parentNode.insertBefore(iframe, link.nextSibling);
    } catch (e) {}
  }

  function scanForMaps() {
    try {
      // Find all links in bot messages - use broader selectors
      var selectors = [
        '.msg.bot a[href]',
        '.msg a[href]',
        '[class*="bot"] a[href]',
        '.chat-message a[href]'
      ];
      var links = [];
      selectors.forEach(function (sel) {
        try {
          document.querySelectorAll(sel).forEach(function (a) {
            if (links.indexOf(a) === -1) links.push(a);
          });
        } catch (e) {}
      });
      links.forEach(embedMap);
    } catch (e) {}
  }

  // Watch for new messages
  try {
    var observer = new MutationObserver(function (mutations) {
      var shouldScan = false;
      mutations.forEach(function (m) {
        if (m.addedNodes && m.addedNodes.length) shouldScan = true;
      });
      if (shouldScan) setTimeout(scanForMaps, 500);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  // Initial scan
  setTimeout(scanForMaps, 2000);
  setInterval(scanForMaps, 5000);
})();
