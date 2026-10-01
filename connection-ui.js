/* JepongDevxyz AI — Connection Error UI (2026-10-01)
   Gemini-style friendly error card when the connection fails or the AI
   is unreachable. Shows a rounded card with a wifi-off icon and a clear
   message, instead of a raw error or silent failure.
   - Wraps window.fetch: detects network failures on /api/chat calls.
   - Listens to online/offline events: shows a banner when offline.
   - Message follows the user's language (Filipino/English).
   - Pure addition: no existing code changed. Idempotent. */
(function () {
  'use strict';
  if (window.__jdConnUI) return;
  window.__jdConnUI = true;

  var CSS = [
    '.jd-conn-err{display:flex;gap:14px;align-items:flex-start;background:#1e1e20;border-radius:20px;',
    'padding:18px 16px;margin:12px 0;max-width:100%}',
    '.jd-conn-err-ic{flex:0 0 auto;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.08);',
    'display:flex;align-items:center;justify-content:center}',
    '.jd-conn-err-ic svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jd-conn-err-tx{flex:1;min-width:0;color:#ececec;font-size:.95rem;line-height:1.5}',
    '.jd-conn-err-tx b{display:block;color:#fff;font-size:1rem;margin-bottom:2px}',
    '.jd-conn-err-retry{flex:0 0 auto;align-self:center;border:1px solid rgba(255,255,255,.2);background:none;',
    'color:#fff;border-radius:20px;padding:8px 16px;font-size:.85rem;font-weight:600;cursor:pointer}',
    '.jd-conn-err-retry:active{transform:scale(.95)}',
    /* Offline banner */
    '.jd-offline-bar{position:fixed;top:0;left:0;right:0;z-index:30000;background:#b91c1c;color:#fff;',
    'text-align:center;font-size:.85rem;font-weight:600;padding:10px 16px;display:none}',
    'body.jd-is-offline .jd-offline-bar{display:block}',
    /* Light mode */
    'body.theme-light .jd-conn-err{background:#f0f0f2}',
    'body.theme-light .jd-conn-err-ic{background:rgba(0,0,0,.06)}',
    'body.theme-light .jd-conn-err-ic svg{stroke:#111}',
    'body.theme-light .jd-conn-err-tx{color:#333}',
    'body.theme-light .jd-conn-err-tx b{color:#111}',
    'body.theme-light .jd-conn-err-retry{border-color:rgba(0,0,0,.2);color:#111}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdConnUiCss')) return;
    var st = document.createElement('style');
    st.id = 'jdConnUiCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* User's language: Filipino or English. */
  function userLang() {
    try {
      var s = JSON.parse(localStorage.getItem('personalizationSettings') || '{}');
      var l = (s.language || '').toLowerCase();
      if (l.indexOf('fil') === 0 || l.indexOf('tag') === 0 || l.indexOf('tl') === 0) return 'fil';
      if (l.indexOf('en') === 0) return 'en';
    } catch (e) {}
    try {
      var nav = (navigator.language || 'en').toLowerCase();
      if (nav.indexOf('fil') === 0 || nav.indexOf('tl') === 0) return 'fil';
    } catch (e2) {}
    return 'fil'; /* default: Filipino (user's primary language) */
  }

  var STR = {
    fil: {
      title: 'Walang koneksyon',
      body: "Sorry, hindi maabot ang JepongDevxyz AI ngayon. Pakisuri ang internet connection mo at subukang muli.",
      retry: 'Subukan ulit'
    },
    en: {
      title: 'No connection',
      body: "Sorry, JepongDevxyz AI isn't available right now. Check your internet connection and try again.",
      retry: 'Try again'
    }
  };

  var WIFI_OFF_SVG = '<svg viewBox="0 0 24 24"><line x1="1" y1="1" x2="23" y2="23"/>' +
    '<path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>' +
    '<path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>' +
    '<path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>' +
    '<path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>' +
    '<path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>' +
    '<line x1="12" y1="20" x2="12.01" y2="20"/></svg>';

  /* Show the error card in the chat. */
  function showConnError() {
    ensureCSS();
    var lang = userLang();
    var s = STR[lang] || STR.fil;
    // Find the chat container
    var chatBox = document.getElementById('chatBox') || document.querySelector('.chat-box');
    if (!chatBox) return;
    // Don't spam: if the last error card is already there, skip
    var last = chatBox.lastElementChild;
    if (last && last.classList && last.classList.contains('jd-conn-err-wrap')) return;

    var wrap = document.createElement('div');
    wrap.className = 'jd-conn-err-wrap';
    wrap.innerHTML =
      '<div class="jd-conn-err">' +
      '<div class="jd-conn-err-ic">' + WIFI_OFF_SVG + '</div>' +
      '<div class="jd-conn-err-tx"><b>' + s.title + '</b>' + s.body + '</div>' +
      '<button class="jd-conn-err-retry" type="button">' + s.retry + '</button>' +
      '</div>';
    chatBox.appendChild(wrap);
    try { chatBox.scrollTop = chatBox.scrollHeight; } catch (e) {}

    var btn = wrap.querySelector('.jd-conn-err-retry');
    if (btn) btn.addEventListener('click', function () {
      try { wrap.remove(); } catch (e) {}
      // Refocus input so the user can retry
      var inp = document.getElementById('userInput');
      if (inp) inp.focus();
    });
  }

  /* Offline banner. */
  function updateOffline() {
    var offline = false;
    try { offline = !navigator.onLine; } catch (e) {}
    document.body.classList.toggle('jd-is-offline', offline);
    var bar = document.getElementById('jdOfflineBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'jdOfflineBar';
      bar.className = 'jd-offline-bar';
      document.body.appendChild(bar);
    }
    var lang = userLang();
    bar.textContent = lang === 'fil'
      ? 'Walang internet connection — hindi makakapagpadala ng mensahe.'
      : 'No internet connection — messages cannot be sent.';
  }

  /* Wrap fetch to catch chat API network failures. */
  function wrapFetch() {
    if (window.fetch && !window.fetch.__jdConnWrapped) {
      var origFetch = window.fetch;
      var wrapped = function (url, opts) {
        var u = '';
        try { u = typeof url === 'string' ? url : url.url || ''; } catch (e) {}
        var isChat = u.indexOf('/api/chat') !== -1;
        return origFetch.apply(this, arguments).then(function (resp) {
          return resp;
        }).catch(function (err) {
          // Network failure on the chat API -> show friendly card
          if (isChat) {
            try { showConnError(); } catch (e2) {}
          }
          throw err;
        });
      };
      wrapped.__jdConnWrapped = true;
      try { Object.defineProperty(wrapped, 'name', { value: 'fetch' }); } catch (e) {}
      window.fetch = wrapped;
    }
  }

  function init() {
    ensureCSS();
    updateOffline();
    wrapFetch();
    window.addEventListener('online', updateOffline);
    window.addEventListener('offline', updateOffline);
    // Re-wrap if something else replaced fetch
    setInterval(wrapFetch, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  // Expose for manual triggering
  window.jdShowConnError = showConnError;
})();
