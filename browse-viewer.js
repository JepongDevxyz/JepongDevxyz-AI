/* ============================================================
   browse-viewer.js — Login-free live browser viewer (v20261005a102)
   Shows a live screenshot stream of the Steel session WITHOUT
   requiring a Steel login. Screenshots go through /api/steel
   (server holds the keys), refreshing every 2.5s.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdBrowseViewerLoaded) return;
  window.__jdBrowseViewerLoaded = true;

  var POLL_MS = 2500;
  var viewer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function apiSteel(action, sessionId, ki) {
    return fetch('/api/steel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action, sessionId: sessionId, ki: ki })
    }).then(function (res) { return res.json(); });
  }

  function closeViewer() {
    try {
      if (viewer && viewer.timer) clearInterval(viewer.timer);
      if (viewer && viewer.el && viewer.el.parentNode) viewer.el.parentNode.removeChild(viewer.el);
    } catch (_) {}
    viewer = null;
  }

  /* Open the login-free live viewer for a session. */
  window.jdBrowseWatchLive = function (sessionId, ki, goal) {
    if (!sessionId) {
      if (window.showModernToast) window.showModernToast('Wala pang live session');
      return;
    }
    closeViewer();

    var el = document.createElement('div');
    el.className = 'jd-browse-viewer';
    el.innerHTML =
      '<div class="jd-bv-backdrop"></div>' +
      '<div class="jd-bv-panel">' +
        '<div class="jd-bv-header">' +
          '<span class="jd-bv-title">👁 Live — ' + esc(goal || 'Browser') + '</span>' +
          '<button class="jd-bv-close" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="jd-bv-body">' +
          '<img class="jd-bv-img" alt="Live browser view" />' +
          '<div class="jd-bv-loading">⏳ Kumokonekta…</div>' +
        '</div>' +
        '<div class="jd-bv-footer"><span class="jd-bv-status">🔴 LIVE</span><span class="jd-bv-hint">Auto-refresh bawat 2.5s · walang login kailangan</span></div>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '.jd-browse-viewer{position:fixed;inset:0;z-index:99999}' +
      '.jd-bv-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.75)}' +
      '.jd-bv-panel{position:absolute;inset:12px;background:#111827;border:1px solid #374151;border-radius:12px;display:flex;flex-direction:column;overflow:hidden}' +
      '.jd-bv-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #374151;color:#f3f4f6;font-weight:600}' +
      '.jd-bv-close{background:#374151;border:0;color:#fff;border-radius:8px;width:32px;height:32px;font-size:16px;cursor:pointer}' +
      '.jd-bv-body{flex:1;position:relative;display:flex;align-items:center;justify-content:center;background:#000;min-height:0}' +
      '.jd-bv-img{max-width:100%;max-height:100%;object-fit:contain;display:none}' +
      '.jd-bv-loading{color:#9ca3af;font-size:14px}' +
      '.jd-bv-footer{display:flex;align-items:center;gap:10px;padding:8px 14px;border-top:1px solid #374151;color:#9ca3af;font-size:12px}' +
      '.jd-bv-status{color:#f87171;font-weight:700;animation:jdBvBlink 1.5s infinite}' +
      '@keyframes jdBvBlink{0%,100%{opacity:1}50%{opacity:.4}}';
    document.head.appendChild(css);
    document.body.appendChild(el);

    var img = el.querySelector('.jd-bv-img');
    var loading = el.querySelector('.jd-bv-loading');
    var status = el.querySelector('.jd-bv-status');
    var stopped = false;

    el.querySelector('.jd-bv-close').addEventListener('click', closeViewer);
    el.querySelector('.jd-bv-backdrop').addEventListener('click', closeViewer);

    function poll() {
      if (stopped) return;
      /* Use the backend's screenshot if available, else direct API call */
      var p;
      try {
        if (window.__jdBrowseLastBackend && window.__jdBrowseLastBackend.screenshot) {
          p = window.__jdBrowseLastBackend.screenshot();
        } else {
          p = apiSteel('screenshot', sessionId, ki).then(function (r) { return r.image || null; });
        }
      } catch (_) { p = Promise.resolve(null); }
      p.then(function (b64) {
        if (stopped || !b64) return;
        img.src = 'data:image/png;base64,' + b64;
        img.style.display = 'block';
        if (loading) loading.style.display = 'none';
      }).catch(function () {
        /* Session may have ended — show it once, keep last frame */
        if (status && !stopped) {
          status.textContent = '⚫ ENDED';
          status.style.color = '#9ca3af';
          status.style.animation = 'none';
        }
        stopped = true;
        if (viewer) { try { clearInterval(viewer.timer); } catch (_) {} }
      });
    }

    poll();
    var timer = setInterval(poll, POLL_MS);
    viewer = { el: el, timer: timer, stop: function () { stopped = true; clearInterval(timer); } };

    /* Track the backend so screenshots reuse the session */
    window.__jdBrowseViewerActive = true;
  };

  window.jdBrowseCloseViewer = closeViewer;
})();
