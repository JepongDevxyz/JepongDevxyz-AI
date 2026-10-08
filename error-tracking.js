/* error-tracking.js v20261008a146 — Lightweight client-side error tracking.
   Catches unhandled errors + promise rejections, stores locally (no external server).
   Sanitizes sensitive data (tokens, keys, card numbers) before storing.
   View via: window.jdErrorLog() or EXTRA → Error Log (if extra-settings.js integrates).
   Privacy: all data stays in localStorage, never sent anywhere. */
(function () {
  'use strict';
  var KEY = 'jd_error_log_v1';
  var MAX = 100;
  var enabled = true;

  /* Sanitize sensitive patterns from any string */
  function sanitize(s) {
    if (!s || typeof s !== 'string') return s;
    return s
      .replace(/(sk-[a-zA-Z0-9-_]{10,})/g, '[REDACTED_KEY]')
      .replace(/(Bearer\s+)[a-zA-Z0-9\-._~+/=]{10,}/gi, '$1[REDACTED]')
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[REDACTED_CARD]')
      .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[a-zA-Z0-9-_]{8,}/gi, '$1[REDACTED]')
      .replace(/(password["']?\s*[:=]\s*["']?)[^"'\s,}]{4,}/gi, '$1[REDACTED]')
      .replace(/(token["']?\s*[:=]\s*["']?)[a-zA-Z0-9\-._]{10,}/gi, '$1[REDACTED]');
  }

  function getLog() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function saveLog(arr) {
    try {
      localStorage.setItem(KEY, JSON.stringify(arr.slice(-MAX)));
    } catch (_) {}
  }

  function record(type, message, stack, extra) {
    if (!enabled) return;
    try {
      var entry = {
        t: new Date().toISOString(),
        type: sanitize(String(type || 'error')),
        msg: sanitize(String(message || '').slice(0, 500)),
        stack: sanitize(String(stack || '').slice(0, 1000)),
        url: sanitize(location.href.slice(0, 200)),
        ua: navigator.userAgent.slice(0, 150)
      };
      if (extra) entry.extra = sanitize(JSON.stringify(extra).slice(0, 300));
      var log = getLog();
      log.push(entry);
      saveLog(log);
    } catch (_) {}
  }

  /* Hook global error handlers (guard against double-install) */
  if (!window.__jdErrorTracking) {
    window.__jdErrorTracking = true;
    window.addEventListener('error', function (e) {
      record('js-error', e.message, e.error && e.error.stack, { file: e.filename, line: e.lineno });
    });
    window.addEventListener('unhandledrejection', function (e) {
      var reason = e.reason;
      var msg = reason && reason.message ? reason.message : String(reason);
      var stack = reason && reason.stack ? reason.stack : '';
      record('unhandled-rejection', msg, stack);
    });
  }

  /* Public API */
  window.jdErrorLog = function () { return getLog(); };
  window.jdErrorLogClear = function () { saveLog([]); return true; };
  window.jdErrorLogCount = function () { return getLog().length; };
  window.jdErrorTrackingSet = function (on) { enabled = !!on; return enabled; };
  window.jdErrorReport = function (label, detail) {
    record('manual', label, '', { detail: detail });
  };

  console.log('[error-tracking] loaded v20261008a146');
})();
