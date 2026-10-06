/* ============================================================
   email-guard.js — Strict email validation for login.
   Per her order 2026-10-06: "mahigpit na di gagana ang mga
   tempmail at gmail lang talaga ang gagana @gmail.com"
   - ONLY @gmail.com addresses are allowed
   - Blocks tempmail/disposable email domains
   - Intercepts the "Send code" button and validates before
     the OTP request is sent.
   ============================================================ */
(function () {
'use strict';
if (window.__jdEmailGuard) return;
window.__jdEmailGuard = true;

/* Common tempmail/disposable domains (partial list — covers the popular ones) */
var TEMP_DOMAINS = [
  'tempmail.com', 'temp-mail.org', 'guerrillamail.com', '10minutemail.com',
  'mailinator.com', 'yopmail.com', 'throwawaymail.com', 'fakeinbox.com',
  'getnada.com', 'maildrop.cc', 'trashmail.com', 'sharklasers.com',
  'dispostable.com', 'tempail.com', 'tempmailo.com', 'mailnesia.com'
];

function isGmail(email) {
  return /@gmail\.com$/i.test(String(email || '').trim());
}

function isTempMail(email) {
  var e = String(email || '').trim().toLowerCase();
  var domain = e.split('@')[1] || '';
  for (var i = 0; i < TEMP_DOMAINS.length; i++) {
    if (domain === TEMP_DOMAINS[i] || domain.endsWith('.' + TEMP_DOMAINS[i])) return true;
  }
  return false;
}

function toast(msg) {
  try {
    if (typeof window.showModernToast === 'function') window.showModernToast(msg);
    else alert(msg);
  } catch (_) {}
}

function validateEmail(email) {
  email = String(email || '').trim();
  if (!email) return { ok: false, msg: 'Please enter your email address.' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, msg: 'Please enter a valid email address.' };
  }
  if (isTempMail(email)) {
    return { ok: false, msg: 'Temporary emails are not allowed. Please use your Gmail address.' };
  }
  if (!isGmail(email)) {
    return { ok: false, msg: 'Only Gmail addresses (@gmail.com) are allowed.' };
  }
  return { ok: true };
}

/* Intercept Send code button clicks */
function install() {
  try {
    document.addEventListener('click', function (e) {
      try {
        var btn = e.target && e.target.closest ? e.target.closest('button') : null;
        if (!btn) return;
        var label = (btn.textContent || '').trim().toLowerCase();
        /* Match "Send code" button (also handles "Sending code…" disabled state) */
        if (label.indexOf('send code') === -1 && label.indexOf('sending code') === -1) return;
        /* Find the email input in the same dialog/container */
        var container = btn.closest('[role="dialog"]') || btn.closest('form') || document;
        var input = container.querySelector('input[type="email"], input[placeholder*="email" i], input[placeholder*="@" i]');
        if (!input) {
          /* Fallback: find any visible email input */
          var inputs = document.querySelectorAll('input');
          for (var i = 0; i < inputs.length; i++) {
            if (inputs[i].offsetParent !== null && /email|@/i.test(inputs[i].placeholder || inputs[i].type || '')) {
              input = inputs[i];
              break;
            }
          }
        }
        if (!input) return;
        var result = validateEmail(input.value);
        if (!result.ok) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          toast(result.msg);
          try { input.focus(); } catch (_) {}
          return false;
        }
      } catch (_) {}
    }, true); /* capture phase to intercept before the app's handler */
  } catch (_) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}
setTimeout(install, 1500);
})();
