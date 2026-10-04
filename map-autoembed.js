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

  function isGeneratedMapDocument(url) {
    try {
      var match=String(url||'').match(/^data:text\/html;base64,([a-z0-9+/=]+)$/i);
      if(!match||match[1].length>150000)return false;
      return atob(match[1]).indexOf('<meta name="jd-map-document" content="v1">')!==-1;
    } catch (_) { return false; }
  }

  function isMapUrl(url) {
    if (!url) return false;
    var u = String(url).toLowerCase();
    // Data URLs (fallback when upload fails on slow networks)
    if (u.indexOf('data:text/html;base64,') === 0) {
      return isGeneratedMapDocument(url);
    }
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

  function findAssistantMessage(link) {
    var node = link;
    while (node && node !== document.body) {
      try {
        if ((node.matches && (node.matches('.msg.bot') || node.matches('.msg.user'))) ||
            (node.classList && node.classList.contains('msg') && (node.classList.contains('bot') || node.classList.contains('user')))) {
          return node;
        }
        var classes = typeof node.className === 'string' ? node.className.split(/\s+/) : [];
        if (classes.indexOf('msg') !== -1 && (classes.indexOf('bot') !== -1 || classes.indexOf('user') !== -1)) return node;
      } catch (_) {}
      node = node.parentNode;
    }
    return null;
  }

  function messageAlreadyHasMap(link, url) {
    var message = findAssistantMessage(link);
    if (!message || !message.querySelectorAll) return false;
    var maps = message.querySelectorAll('.jd-map-embed');
    for (var i = 0; i < maps.length; i++) {
      if (maps[i].dataset && maps[i].dataset.jdMapUrl === url) return true;
    }
    return false;
  }

  function isInsideMapEmbed(link) {
    var node = link.parentNode;
    while (node && node !== document.body) {
      try {
        if ((node.classList && node.classList.contains('jd-map-embed')) ||
            (typeof node.className === 'string' && node.className.split(/\s+/).indexOf('jd-map-embed') !== -1)) {
          return true;
        }
      } catch (_) {}
      node = node.parentNode;
    }
    return false;
  }

  function embedMap(link) {
    try {
      var url = link.href;
      if (!isMapUrl(url)) return;
      // STRICT: only embed maps when the message CLEARLY asks for directions.
      // The AI wrongly triggers get_directions on "→" arrows in ANY context
      // (goals, identity, etc.) — block all unless explicit directions intent.
      var msgNode = findAssistantMessage(link);
      if (msgNode) {
        var msgText = (msgNode.textContent || '').toLowerCase();
        var hasDirectionsIntent =
          msgText.indexOf('direction') !== -1 ||
          msgText.indexOf('route from') !== -1 ||
          msgText.indexOf('how to get to') !== -1 ||
          msgText.indexOf('navigate to') !== -1 ||
          msgText.indexOf('driving route') !== -1 ||
          msgText.indexOf('walking route') !== -1 ||
          msgText.indexOf('transit route') !== -1;
        if (!hasDirectionsIntent) return;
      }
      // The direct-open fallback inside each card also has a map URL. It must
      // stay a link and never be treated as a fresh map to embed.
      if (isInsideMapEmbed(link)) return;
      // Don't double-embed
      if (link.dataset.jdMapEmbedded) return;
      // A response can repeat its route link in multiple paragraphs. Keep the
      // textual links, but show only one full map for the same URL per answer.
      if (messageAlreadyHasMap(link, url)) {
        link.dataset.jdMapEmbedded = 'duplicate';
        return;
      }
      link.dataset.jdMapEmbedded = '1';

      // Keep the reserved map area visibly useful while network resources load.
      var card = document.createElement('div');
      card.className = 'jd-map-embed';
      card.dataset.state = 'loading';
      card.dataset.jdMapUrl = url;
      card.setAttribute('role', 'region');
      card.setAttribute('aria-label', 'Interactive map');
      card.setAttribute('aria-busy', 'true');
      card.style.cssText = 'position:relative;width:100%;min-height:280px;margin:12px 0;overflow:hidden;border-radius:12px;background:rgba(148,163,184,.08)';

      var status = document.createElement('div');
      status.className = 'jd-map-loading';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.textContent = 'Loading interactive map…';
      status.style.cssText = 'position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;padding:18px;color:var(--text-muted,#9ca3af);font:500 14px/1.45 system-ui,sans-serif;text-align:center;background:linear-gradient(110deg,rgba(148,163,184,.06) 8%,rgba(148,163,184,.14) 18%,rgba(148,163,184,.06) 33%);background-size:200% 100%;animation:jdMapShimmer 1.4s linear infinite';

      var fallback = document.createElement('a');
      fallback.className = 'jd-map-open-fallback';
      fallback.href = url;
      fallback.target = '_blank';
      fallback.rel = 'noopener noreferrer';
      fallback.textContent = 'Map is taking longer to load — open it directly';
      fallback.hidden = true;
      fallback.style.cssText = 'position:absolute;z-index:2;left:50%;bottom:12px;transform:translateX(-50%);max-width:calc(100% - 24px);padding:8px 12px;border-radius:999px;background:rgba(24,24,27,.92);color:#c4b5fd;font:500 13px/1.3 system-ui,sans-serif;text-align:center;text-decoration:underline;white-space:normal';

      var iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:relative;z-index:0;width:100%;height:clamp(340px,56vh,500px);min-height:340px;border:0;border-radius:12px;margin:0;display:block;opacity:0;transition:opacity .18s ease';
      iframe.setAttribute('loading', 'eager');
      iframe.setAttribute('sandbox', 'allow-scripts');
      iframe.setAttribute('referrerpolicy', 'no-referrer');
      iframe.title = 'Interactive map';

      var settled = false;
      function markReady() {
        settled = true;
        if (card.dataset) card.dataset.state = 'ready';
        card.setAttribute('aria-busy', 'false');
        status.hidden = true;
        fallback.hidden = true;
        iframe.style.opacity = '1';
      }
      function markError() {
        settled = true;
        if (card.dataset) card.dataset.state = 'error';
        card.setAttribute('aria-busy', 'false');
        status.textContent = 'The map could not load. Open it directly to view the route.';
        fallback.hidden = false;
        iframe.style.display = 'none';
      }

      if (iframe.addEventListener) {
        iframe.addEventListener('load', markReady);
        iframe.addEventListener('error', markError);
      } else {
        iframe.onload = markReady;
        iframe.onerror = markError;
      }

      card.appendChild(iframe);
      card.appendChild(status);
      card.appendChild(fallback);
      // The generated route appendix uses a standalone paragraph link as the
      // map source. Replace that line with the embedded card so it is not shown
      // twice. Other links are removed in place after their card is inserted.
      var sourceLine = link;
      var sourceParent = link.parentNode;
      if (sourceParent && String(sourceParent.tagName || '').toUpperCase() === 'P' &&
          String(sourceParent.textContent || '').trim() === String(link.textContent || '').trim()) {
        sourceLine = sourceParent;
      }
      var insertionParent = sourceLine.parentNode;
      insertionParent.insertBefore(card, sourceLine.nextSibling);
      if (insertionParent.removeChild) insertionParent.removeChild(sourceLine);
      else if (sourceLine.remove) sourceLine.remove();
      iframe.src = url;
      setTimeout(function () {
        if (settled) return;
        status.textContent = 'The map is taking longer to load. You can open it directly below.';
        fallback.hidden = false;
      }, 10000);
    } catch (e) {}
  }
  function scanForMaps() {
    try {
      // Search ALL links on the page (not just in bot messages)
      // The map links might be in a different container structure
      var allLinks = document.querySelectorAll('a[href]');
      allLinks.forEach(function (link) {
        try {
          if (isMapUrl(link.href)) {
            embedMap(link);
          }
        } catch (e) {}
      });
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

  // Keep the animated placeholder styling scoped to map embeds.
  try {
    if (!document.getElementById('jdMapEmbedStyles')) {
      var mapStyle = document.createElement('style');
      mapStyle.id = 'jdMapEmbedStyles';
      mapStyle.textContent = '@keyframes jdMapShimmer{to{background-position:-200% 0}} .jd-map-loading[hidden],.jd-map-open-fallback[hidden]{display:none!important}';
      document.head.appendChild(mapStyle);
    }
  } catch (e) {}

  // Initial scan
  setTimeout(scanForMaps, 2000);
  setInterval(scanForMaps, 5000);
})();
