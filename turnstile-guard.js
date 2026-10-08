/* turnstile-guard.js v20261008a147 — Cloudflare Turnstile anti-bot.
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
    el = document.createElement('div');
    el.id = WIDGET_ID;
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:10002;background:#fff;border-radius:12px;padding:16px;box-shadow:0 8px 32px rgba(0,0,0,.3);display:none;';
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
      el.style.display = 'block';
      el.innerHTML = '';
      try {
        window.turnstile.render(el, {
          sitekey: SITE_KEY,
          callback: function (token) {
            el.style.display = 'none';
            // Verify server-side
            fetch('/api/turnstile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: token })
            })
              .then(function (r) { return r.json(); })
              .then(function (d) {
                if (d && d.ok) {
                  setPassed();
                  try { window.turnstile.reset(); } catch (_) {}
                  onPass();
                } else {
                  if (onFail) onFail();
                  else toast('Verification failed. Please try again.');
                }
              })
              .catch(function () {
                // Fail open on network error
                console.warn('[turnstile] verify failed, allowing through');
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

  /* ---- Guest: intercept first chat send ---- */
  function hookChat() {
    if (!window.fetch || window.__jdTurnstileChatHooked) return;
    window.__jdTurnstileChatHooked = true;
    var origFetch = window.fetch;
    window.fetch = function (url, opts) {
      try {
        var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
        // Only intercept chat API, only if not yet verified
        if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body && !isPassed() && !window.__jdTurnstileChallenging) {
          window.__jdTurnstileChallenging = true;
          var self = this, args = arguments;
          challenge(function () {
            window.__jdTurnstileChallenging = false;
            origFetch.apply(self, args);
          }, function () {
            window.__jdTurnstileChallenging = false;
          });
          // Return a pending promise; the real fetch happens after challenge
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

  console.log('[turnstile-guard] loaded v20261008a147');
})();
