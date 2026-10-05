/* ============================================================
   browse-viewer.js — Login-free LIVE browser viewer + TAKEOVER (v20261005a103)
   Muse-style: live screenshot stream (no Steel login) + "Take control"
   for interactive tap-to-click, typing, and scrolling.
   Screenshots & actions go through /api/steel (server holds keys).
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

  function apiSteel(payload) {
    return fetch('/api/steel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) { return res.json(); });
  }

  function closeViewer() {
    try {
      if (viewer && viewer.timer) clearInterval(viewer.timer);
      if (viewer && viewer.el && viewer.el.parentNode) viewer.el.parentNode.removeChild(viewer.el);
    } catch (_) {}
    viewer = null;
    try { window.__jdBrowseViewerActive = false; } catch (_) {}
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
        '<div class="jd-bv-control-banner" style="display:none">' +
          '<span class="jd-bv-check">✓</span>' +
          '<div><div class="jd-bv-cb-title">You\'re in control</div>' +
          '<div class="jd-bv-cb-sub">Tap the page to click · type below · scroll with buttons</div></div>' +
        '</div>' +
        '<div class="jd-bv-header">' +
          '<span class="jd-bv-title">👁 Live — ' + esc(goal || 'Browser') + '</span>' +
          '<button class="jd-bv-close" aria-label="Close">✕</button>' +
        '</div>' +
        '<div class="jd-bv-body">' +
          '<img class="jd-bv-img" alt="Live browser view" />' +
          '<div class="jd-bv-cursor" style="display:none"></div>' +
          '<div class="jd-bv-loading">⏳ Kumokonekta…</div>' +
          '<div class="jd-bv-toast" style="display:none"></div>' +
        '</div>' +
        '<div class="jd-bv-typebar" style="display:none">' +
          '<input class="jd-bv-input" type="text" placeholder="Type text…" enterkeyhint="send" />' +
          '<button class="jd-bv-send">Send</button>' +
        '</div>' +
        '<div class="jd-bv-footer">' +
          '<span class="jd-bv-status">🔴 LIVE</span>' +
          '<span class="jd-bv-hint">Auto-refresh bawat 2.5s · walang login kailangan</span>' +
        '</div>' +
        '<div class="jd-bv-actions">' +
          '<button class="jd-bv-take">Take control of the browser</button>' +
          '<button class="jd-bv-stop" style="display:none">Stop the task</button>' +
        '</div>' +
      '</div>';

    var css = document.createElement('style');
    css.textContent =
      '.jd-browse-viewer{position:fixed;inset:0;z-index:99999;font-family:inherit}' +
      '.jd-bv-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.8)}' +
      '.jd-bv-panel{position:absolute;inset:0;background:#0b0e14;display:flex;flex-direction:column;overflow:hidden}' +
      '@media(min-width:700px){.jd-bv-panel{inset:24px;border:1px solid #374151;border-radius:14px}}' +
      '.jd-bv-control-banner{display:flex;align-items:center;gap:10px;background:#111827;border-bottom:1px solid #1f2937;padding:10px 16px;color:#f3f4f6}' +
      '.jd-bv-check{width:28px;height:28px;border-radius:50%;background:#374151;display:flex;align-items:center;justify-content:center;font-size:16px;flex:none}' +
      '.jd-bv-cb-title{font-weight:700;font-size:14px}' +
      '.jd-bv-cb-sub{font-size:12px;color:#9ca3af}' +
      '.jd-bv-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid #1f2937;color:#f3f4f6;font-weight:600;font-size:14px}' +
      '.jd-bv-close{background:#1f2937;border:0;color:#fff;border-radius:8px;width:32px;height:32px;font-size:16px;cursor:pointer}' +
      '.jd-bv-body{flex:1;position:relative;display:flex;align-items:center;justify-content:center;background:#000;min-height:0;overflow:hidden;touch-action:none}' +
      '.jd-bv-img{max-width:100%;max-height:100%;object-fit:contain;display:none;user-select:none;-webkit-user-select:none}' +
      '.jd-bv-img.controlling{cursor:crosshair}' +
      '.jd-bv-cursor{position:absolute;width:18px;height:18px;border:2px solid #60a5fa;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 8px rgba(96,165,250,.8);z-index:5}' +
      '.jd-bv-loading{color:#9ca3af;font-size:14px}' +
      '.jd-bv-toast{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(17,24,39,.92);color:#f3f4f6;padding:8px 14px;border-radius:20px;font-size:13px;z-index:6;white-space:nowrap}' +
      '.jd-bv-typebar{display:flex;gap:8px;padding:10px 14px;background:#111827;border-top:1px solid #1f2937}' +
      '.jd-bv-input{flex:1;background:#1f2937;border:1px solid #374151;color:#f3f4f6;border-radius:10px;padding:10px 12px;font-size:14px;outline:none}' +
      '.jd-bv-input:focus{border-color:#3b82f6}' +
      '.jd-bv-send{background:#2563eb;border:0;color:#fff;border-radius:10px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer}' +
      '.jd-bv-footer{display:flex;align-items:center;gap:10px;padding:8px 14px;color:#9ca3af;font-size:12px;background:#111827}' +
      '.jd-bv-status{color:#f87171;font-weight:700;animation:jdBvBlink 1.5s infinite}' +
      '@keyframes jdBvBlink{0%,100%{opacity:1}50%{opacity:.4}}' +
      '.jd-bv-actions{padding:12px 14px 16px;background:#111827;display:flex;flex-direction:column;gap:10px}' +
      '.jd-bv-take{background:#2563eb;border:0;color:#fff;border-radius:12px;padding:14px;font-size:15px;font-weight:700;cursor:pointer}' +
      '.jd-bv-take:active{background:#1d4ed8}' +
      '.jd-bv-stop{background:#1f2937;border:1px solid #374151;color:#f3f4f6;border-radius:12px;padding:14px;font-size:15px;font-weight:600;cursor:pointer}' +
      '.jd-bv-scrollrow{display:flex;gap:8px;justify-content:center}' +
      '.jd-bv-scrollbtn{background:#1f2937;border:1px solid #374151;color:#e5e7eb;border-radius:10px;padding:8px 18px;font-size:14px;cursor:pointer}';
    document.head.appendChild(css);
    document.body.appendChild(el);

    var img = el.querySelector('.jd-bv-img');
    var loading = el.querySelector('.jd-bv-loading');
    var status = el.querySelector('.jd-bv-status');
    var cursor = el.querySelector('.jd-bv-cursor');
    var toastEl = el.querySelector('.jd-bv-toast');
    var banner = el.querySelector('.jd-bv-control-banner');
    var takeBtn = el.querySelector('.jd-bv-take');
    var stopBtn = el.querySelector('.jd-bv-stop');
    var typebar = el.querySelector('.jd-bv-typebar');
    var input = el.querySelector('.jd-bv-input');
    var sendBtn = el.querySelector('.jd-bv-send');
    var body = el.querySelector('.jd-bv-body');

    var stopped = false;
    var controlling = false;
    var busy = false;
    var toastTimer = null;

    function toast(msg) {
      try {
        toastEl.textContent = msg;
        toastEl.style.display = 'block';
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.style.display = 'none'; }, 2200);
      } catch (_) {}
    }

    el.querySelector('.jd-bv-close').addEventListener('click', closeViewer);
    el.querySelector('.jd-bv-backdrop').addEventListener('click', closeViewer);

    /* ---------- backend screenshot ---------- */
    function getScreenshot() {
      try {
        if (window.__jdBrowseLastBackend && window.__jdBrowseLastBackend.screenshot) {
          return window.__jdBrowseLastBackend.screenshot();
        }
      } catch (_) {}
      return apiSteel({ action: 'screenshot', sessionId: sessionId, ki: ki })
        .then(function (r) { return r.image || null; });
    }

    function doAct(op, x, y, text) {
      /* Prefer backend.act({operation, xy, text}) when available (has targetId) */
      try {
        if (window.__jdBrowseLastBackend && window.__jdBrowseLastBackend.act) {
          return window.__jdBrowseLastBackend.act({ operation: op, xy: [x || 0, y || 0], text: text || '' });
        }
      } catch (_) {}
      var payload = { action: 'act', sessionId: sessionId, ki: ki, op: op, x: x || 0, y: y || 0, text: text || '' };
      return apiSteel(payload).then(function (r) { return r; });
    }

    function poll() {
      if (stopped) return;
      getScreenshot().then(function (b64) {
        if (stopped || !b64) return;
        img.src = 'data:image/png;base64,' + b64;
        img.style.display = 'block';
        if (loading) loading.style.display = 'none';
      }).catch(function () {
        if (status && !stopped) {
          status.textContent = '⚫ ENDED';
          status.style.color = '#9ca3af';
          status.style.animation = 'none';
        }
        stopped = true;
        if (viewer) { try { clearInterval(viewer.timer); } catch (_) {} }
        toast('Natapos ang session');
      });
    }

    /* ---------- takeover: tap-to-click ---------- */
    function tapToViewport(clientX, clientY) {
      var r = img.getBoundingClientRect();
      var fx = (clientX - r.left) / r.width;
      var fy = (clientY - r.top) / r.height;
      if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return null;
      var vw = img.naturalWidth || 1920;
      var vh = img.naturalHeight || 1080;
      return { x: Math.round(fx * vw), y: Math.round(fy * vh), fx: fx, fy: fy };
    }

    function showCursor(clientX, clientY) {
      try {
        var br = body.getBoundingClientRect();
        cursor.style.left = (clientX - br.left) + 'px';
        cursor.style.top = (clientY - br.top) + 'px';
        cursor.style.display = 'block';
        setTimeout(function () { cursor.style.display = 'none'; }, 900);
      } catch (_) {}
    }

    img.addEventListener('click', function (ev) {
      if (!controlling || busy || stopped) return;
      var p = tapToViewport(ev.clientX, ev.clientY);
      if (!p) return;
      showCursor(ev.clientX, ev.clientY);
      busy = true;
      toast('Click…');
      doAct('CLICK', p.x, p.y, '').then(function () {
        busy = false;
        setTimeout(poll, 900); /* refresh after the click lands */
      }).catch(function () { busy = false; toast('Click failed'); });
    });

    /* ---------- takeover: typing ---------- */
    function sendType() {
      var t = input.value.trim();
      if (!t || busy || stopped) return;
      busy = true;
      sendBtn.textContent = '…';
      doAct('TYPE_TEXT', 0, 0, t).then(function () {
        busy = false;
        sendBtn.textContent = 'Send';
        input.value = '';
        toast('Typed ✓');
        setTimeout(poll, 900);
      }).catch(function () { busy = false; sendBtn.textContent = 'Send'; toast('Type failed'); });
    }
    sendBtn.addEventListener('click', sendType);
    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') sendType();
    });

    /* ---------- takeover: scroll ---------- */
    function addScrollRow() {
      var row = document.createElement('div');
      row.className = 'jd-bv-scrollrow';
      row.innerHTML = '<button class="jd-bv-scrollbtn" data-d="up">▲ Scroll up</button>' +
                      '<button class="jd-bv-scrollbtn" data-d="down">▼ Scroll down</button>';
      row.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-d]');
        if (!b || busy || stopped) return;
        busy = true;
        doAct(b.getAttribute('data-d') === 'up' ? 'SCROLL_UP' : 'SCROLL_DOWN', 0, 0, '')
          .then(function () { busy = false; setTimeout(poll, 900); })
          .catch(function () { busy = false; });
      });
      el.querySelector('.jd-bv-actions').insertBefore(row, stopBtn);
    }

    /* ---------- take control / stop ---------- */
    takeBtn.addEventListener('click', function () {
      controlling = true;
      takeBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      banner.style.display = 'flex';
      typebar.style.display = 'flex';
      img.classList.add('controlling');
      addScrollRow();
      toast('Ikaw na ang may control 👆');
      try {
        /* Pause the agent loop so it doesn't fight the user.
           Session stays alive for manual driving. */
        if (window.__jdBrowseLastLoop && window.__jdBrowseLastLoop.stop) {
          window.__jdBrowseLastLoop.stop();
        }
      } catch (_) {}
    });

    stopBtn.addEventListener('click', function () {
      /* "Stop the task" — end the session entirely */
      try {
        if (window.__jdBrowseLastBackend && window.__jdBrowseLastBackend.release) {
          window.__jdBrowseLastBackend.release();
        } else {
          apiSteel({ action: 'release', sessionId: sessionId, ki: ki });
        }
      } catch (_) {}
      toast('Task stopped — session closed');
      setTimeout(closeViewer, 800);
    });

    poll();
    var timer = setInterval(poll, POLL_MS);
    viewer = { el: el, timer: timer, stop: function () { stopped = true; clearInterval(timer); } };
    window.__jdBrowseViewerActive = true;
  };

  window.jdBrowseCloseViewer = closeViewer;
})();
