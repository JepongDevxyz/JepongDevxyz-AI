/* turnstile-guard.js v20261008a150 — Cloudflare Turnstile anti-bot.
   - Shows Turnstile ONCE per device (localStorage flag).
   - Guests: before first chat message. Login: before OTP send.
   - Server-side verification via /api/turnstile (cannot be bypassed).
   - Invisible mode: most users won't see anything. */
(function () {
  'use strict';
  if (window.__jdTurnstileGuard) return;
  window.__jdTurnstileGuard = true;

  var SITE_KEY = '0x4AAAAAAFQ8gRPQtT55yI1E';
  var FLAG = 'jd_turnstile_passed_v1';
  var WIDGET_ID = 'jd-turnstile-widget';

  function isPassed() {
    try { return localStorage.getItem(FLAG) === '1'; } catch (_) { return false; }
  }
  function setPassed() {
    try { localStorage.setItem(FLAG, '1'); } catch (_) {}
  }

  function loadScript(cb) {
    if (window.turnstile) return cb();
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    s.onload = cb;
    s.onerror = function () { cb(new Error('Turnstile script failed to load')); };
    document.head.appendChild(s);
  }

  function ensureWidget() {
    var el = document.getElementById(WIDGET_ID);
    if (el) return el;
    // Full-screen blocking overlay
    el = document.createElement('div');
    el.id = WIDGET_ID;
    el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:10002;background:rgba(0,0,0,.7);display:none;align-items:center;justify-content:center;';
    el.innerHTML = '<div style="background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.3);text-align:center;max-width:320px;">' +
      '<div style="font-weight:600;margin-bottom:12px;color:#333;">Verify you are human</div>' +
      '<div id="jd-turnstile-inner"></div>' +
      '<div style="font-size:12px;color:#888;margin-top:12px;">One-time check to protect against bots</div>' +
      '</div>';
    document.body.appendChild(el);
    return el;
  }

  /* Show Turnstile, verify server-side, then call onPass(). */
  function challenge(onPass, onFail) {
    if (isPassed()) return onPass();
    loadScript(function (err) {
      if (err || !window.turnstile) {
        // Fail open if Cloudflare is unreachable (don't block legit users)
        console.warn('[turnstile] script failed, allowing through');
        return onPass();
      }
      var el = ensureWidget();
      el.style.display = 'flex';
      var inner = document.getElementById('jd-turnstile-inner');
      if (inner) inner.innerHTML = '';
      try {
        window.turnstile.render(inner || el, {
          sitekey: SITE_KEY,
          callback: function (token) {
            // Verify server-side first, THEN hide modal and set flag
            fetch('/api/turnstile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token })
            })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (d && d.ok) {
                  setPassed();
                  el.style.display = 'none';
                  try { window.turnstile.reset(); } catch (_) {}
                  onPass();
                } else {
                  // Server rejected but client passed — fail open for UX, log it
                  console.warn('[turnstile] server verify failed, allowing through (fail-open)');
                  try { window.jdErrorReport && window.jdErrorReport('turnstile-server-reject', JSON.stringify(d).slice(0, 200)); } catch (_) {}
                  setPassed();
                  el.style.display = 'none';
                  try { window.turnstile.reset(); } catch (_) {}
                  onPass();
                }
              })
              .catch(function () {
                // Fail open on network error
                console.warn('[turnstile] verify network error, allowing through');
                setPassed();
                el.style.display = 'none';
                onPass();
              });
          },
          'expired-callback': function () {
            el.style.display = 'none';
            if (onFail) onFail();
          },
          'error-callback': function () {
            el.style.display = 'none';
            // Fail open on widget error
            console.warn('[turnstile] widget error, allowing through');
            onPass();
          }
        });
      } catch (e) {
        el.style.display = 'none';
        onPass();
      }
    });
  }

  function toast(msg) {
    try {
      if (window.jdOdToast) window.jdOdToast(msg);
      else if (window.showModernToast) window.showModernToast(msg);
      else alert(msg);
    } catch (_) {}
  }

  /* ---- Guest: block composer until verified ---- */
  function blockComposer() {
    try {
      // Disable send buttons and composer inputs
      var selectors = [
        'button[type="submit"]',
        '[data-testid="send-button"]',
        '.jd-send-btn',
        '#jd-composer-send',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="ask"]',
        '[contenteditable="true"]'
      ];
      selectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el) {
          if (el.tagName === 'BUTTON') {
            el.disabled = true;
            el.style.opacity = '0.5';
            el.setAttribute('data-jd-turnstile-blocked', '1');
          } else if (el.tagName === 'TEXTAREA' || el.isContentEditable) {
            el.setAttribute('data-jd-turnstile-blocked', '1');
            el.style.opacity = '0.7';
          }
        });
      });
    } catch (_) {}
  }

  function unblockComposer() {
    try {
      document.querySelectorAll('[data-jd-turnstile-blocked]').forEach(function (el) {
        if (el.tagName === 'BUTTON') {
          el.disabled = false;
          el.style.opacity = '';
        } else {
          el.style.opacity = '';
        }
        el.removeAttribute('data-jd-turnstile-blocked');
      });
    } catch (_) {}
  }

  function hookChat() {
    if (window.__jdTurnstileChatHooked) return;
    window.__jdTurnstileChatHooked = true;

    // Show challenge immediately on load if not passed (don't wait for first message)
    if (!isPassed()) {
      // Block composer right away
      blockComposer();
      // Re-block periodically in case new elements render (SPA)
      var blockInterval = setInterval(function () {
        if (isPassed()) {
          clearInterval(blockInterval);
          unblockComposer();
        } else {
          blockComposer();
        }
      }, 1000);

      // Wait a bit for the app to render, then challenge
      setTimeout(function () {
        if (!isPassed() && !window.__jdTurnstileChallenging) {
          window.__jdTurnstileChallenging = true;
          challenge(function () {
            window.__jdTurnstileChallenging = false;
            clearInterval(blockInterval);
            unblockComposer();
          }, function () {
            window.__jdTurnstileChallenging = false;
          });
        }
      }, 2000);
    }

    // Also intercept fetch as a backup (in case composer is bypassed)
    if (!window.fetch) return;
    var origFetch = window.fetch;
    window.fetch = function (url, opts) {
      try {
        var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
        if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body && !isPassed() && !window.__jdTurnstileChallenging) {
          window.__jdTurnstileChallenging = true;
          var self = this, args = arguments;
          challenge(function () {
            window.__jdTurnstileChallenging = false;
            origFetch.apply(self, args);
          }, function () {
            window.__jdTurnstileChallenging = false;
          });
          return new Promise(function () {});
        }
      } catch (_) {}
      return origFetch.apply(this, arguments);
    };
  }

  /* ---- Login: intercept Send Code button ---- */
  function hookLogin() {
    // Watch for send-code buttons (works with email-guard.js)
    document.addEventListener('click', function (e) {
      if (isPassed()) return;
      var t = e.target;
      // Find if this is a send-code/OTP button
      var btn = t.closest ? t.closest('button') : null;
      if (!btn) return;
      var txt = (btn.textContent || '').toLowerCase();
      if (txt.indexOf('send') === -1 && txt.indexOf('code') === -1 && txt.indexOf('otp') === -1) return;
      // Don't double-handle if email-guard already blocked it
      e.preventDefault();
      e.stopPropagation();
      challenge(function () {
        // Re-trigger the click after passing
        btn.click();
      });
    }, true);
  }

  /* Init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hookChat(); hookLogin(); });
  } else {
    hookChat(); hookLogin();
  }

  /* Public API */
  window.jdTurnstilePassed = isPassed;
  window.jdTurnstileReset = function () { try { localStorage.removeItem(FLAG); } catch (_) {} };

  console.log('[turnstile-guard] loaded v20261008a150');
})();
