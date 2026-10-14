/* =========================================================
   JepongDevxyz AI — Signup Agent (guided signup automation)
   Runtime patch loaded by agent.js (additive only).

   Chat command:  signup: <goal>
   Example:       signup: register me on openrouter.ai
   Marker:        [[JD_SIGNUP|<site-or-url>]] renders a "Start signup" pill.

   Flow (client-side, one HTTP call per step — no 25s limit issue):
     snapshot -> decide (/api/chat, _jdSignup) -> validate
     -> act (Steel backend wrapper) -> repeat, until DONE / BLOCKED /
     MAX_STEPS / Stop. Reuses BrowseLoop machinery (pause/resume,
     note, infra-flake retry) via SignupLoop subclass.

   Special ops (intercepted by the signup backend wrapper — the raw
   Steel backend never sees them):
     FILL_SECRET      — resolve via window.jdVault (secure capture card
                        if no entry yet), approval-gated, then TYPE_TEXT.
                        The secret value NEVER appears in the decision
                        prompt, history, logs, or chat.
     AWAITING_CONFIRM — pause + confirm card ("Review and confirm")
                        BEFORE the final account-creation submit click.
                        On approve the submit click runs automatically.
     FETCH_OTP        — fetch the code via the Gmail connector
                        (gmail:search op), type it directly into the
                        code field. Falls back to a user-paste card.

   SignupLoop swaps window.jdBrowseAgent for window.jdSignupDecision
   during its run (restored afterwards) so BrowseLoop.run() uses the
   signup decision prompt + parser without touching browse-loop.js.

   Gating: "signup:" fires only when the Signup Agent toggle
   (EXTRA > JepongDevxyz AI) is ON. Steel keys live server-side
   (STEEL_API_KEYS); calls go through POST /api/steel.

   Design: Muse-app style dark cards, Lucide-style inline SVG icons,
   no emojis in UI. Never invents user personal data (name/phone/
   address) — asks via card when a form requires it.
   ========================================================= */

/* ================= PURE LOGIC (no DOM — unit-testable) ================= */

var SIGNUP_CMD_RE = /^\s*signup\s*:\s*/i;

/* "signup: <goal>" — goal must be non-empty. Disjoint from "browse:". */
function matchSignupCommand(msg) {
  if (typeof msg !== 'string') return null;
  var m = SIGNUP_CMD_RE.exec(msg);
  if (!m) return null;
  var goal = msg.slice(m[0].length).trim();
  if (!goal) return null;
  return { goal: goal };
}

/* Short human label for the card pill, e.g. "openrouter.ai". */
function extractSiteLabel(goal) {
  var m = /(https?:\/\/[^\s,]+|www\.[^\s,]+|(?:[a-z0-9-]+\.)+[a-z]{2,})/i.exec(goal || '');
  if (!m) return 'signup';
  var u = m[1].replace(/[.,;!?)]+$/, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  return (u.split('/')[0] || 'signup').slice(0, 60);
}

/* Bare domain for OTP search queries, e.g. "openrouter.ai". */
function extractSiteDomain(goal) {
  var label = extractSiteLabel(goal);
  if (label === 'signup') return '';
  return label.split(':')[0];
}

function suExtractJson(raw) {
  var s = String(raw || '').trim();
  var m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (m) s = m[1].trim();
  var start = s.indexOf('{'), end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); } catch (_) { return null; }
}

function suParseTable(table) {
  /* index -> {role, label} — same shape as browser-agent.js */
  var map = Object.create(null);
  String(table || '').split('\n').forEach(function (line) {
    var m = line.match(/^\s*\[(\d+)\]\s+([\w-]+)\s+"?([^"|]*)"?/);
    if (m) map[m[1]] = { role: m[2].toLowerCase(), label: m[3] };
  });
  return map;
}

function validVaultId(s) {
  return typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.\-]{0,119}$/.test(s);
}

var SIGNUP_OPS = ['CLICK', 'TYPE_TEXT', 'SELECT', 'SCROLL_UP', 'SCROLL_DOWN', 'WAIT',
  'DONE', 'BLOCKED', 'FILL_SECRET', 'FETCH_OTP', 'AWAITING_CONFIRM'];
var SU_NO_TARGET_OPS = ['SCROLL_UP', 'SCROLL_DOWN', 'WAIT', 'DONE', 'BLOCKED'];
/* Which element roles accept which operations. */
var SU_ROLE_OPS = {
  button: ['CLICK'], link: ['CLICK'],
  textbox: ['CLICK', 'TYPE_TEXT', 'FILL_SECRET', 'FETCH_OTP'],
  searchbox: ['CLICK', 'TYPE_TEXT', 'FETCH_OTP'],
  combobox: ['CLICK', 'TYPE_TEXT', 'SELECT'],
  select: ['CLICK', 'SELECT'], listbox: ['CLICK', 'SELECT'],
  checkbox: ['CLICK'], radio: ['CLICK'], switch: ['CLICK'],
  menuitem: ['CLICK'], tab: ['CLICK']
};

/*
 * Validate one model decision. Returns {ok:true, action} or {ok:false, error}.
 * Security invariants:
 *  - FILL_SECRET carries only a vaultId reference; action.text is ALWAYS null
 *    so the secret value can never leak into history/prompts/logs.
 *  - AWAITING_CONFIRM requires a CLICK-compatible target (the submit button).
 */
function parseSignupDecision(raw, table) {
  var fail = function (error) { return { ok: false, error: error }; };
  var obj = suExtractJson(raw);
  if (!obj || typeof obj !== 'object') return fail('no-json');
  var op = String(obj.operation || '').toUpperCase().trim();
  if (SIGNUP_OPS.indexOf(op) === -1) return fail('bad-operation');
  if (SU_NO_TARGET_OPS.indexOf(op) !== -1) {
    return { ok: true, action: { operation: op, target: null, text: null } };
  }
  var tmap = suParseTable(table);
  var target = obj.target;
  if (target == null || target === '') return fail('missing-target');
  var tkey = String(target).trim();
  if (!/^\d+$/.test(tkey) || !tmap[tkey]) return fail('unknown-target');
  var role = tmap[tkey].role;
  var allowed = SU_ROLE_OPS[role] || [];

  if (op === 'FILL_SECRET') {
    if (allowed.indexOf('FILL_SECRET') === -1) return fail('incompatible-target');
    var vid = obj.vaultId;
    if (!validVaultId(vid)) return fail('bad-vaultId');
    var desc = String(obj.description == null ? '' : obj.description).slice(0, 200);
    return { ok: true, action: { operation: op, target: parseInt(tkey, 10), text: null, vaultId: vid, description: desc } };
  }
  if (op === 'AWAITING_CONFIRM') {
    /* Must target the submit control (button/link) — the confirmed click. */
    if (role !== 'button' && role !== 'link') return fail('incompatible-target');
    var summary = String(obj.summary == null ? '' : obj.summary).trim().slice(0, 300);
    if (!summary) return fail('missing-summary');
    return { ok: true, action: { operation: op, target: parseInt(tkey, 10), text: summary, summary: summary } };
  }
  if (op === 'FETCH_OTP') {
    if (allowed.indexOf('FETCH_OTP') === -1) return fail('incompatible-target');
    var q = String(obj.query == null ? '' : obj.query).trim().slice(0, 200);
    if (!q) return fail('missing-query');
    return { ok: true, action: { operation: op, target: parseInt(tkey, 10), text: null, query: q } };
  }
  if (allowed.indexOf(op) === -1) return fail('incompatible-target');
  var text = null;
  if (op === 'TYPE_TEXT' || op === 'SELECT') {
    text = String(obj.text == null ? '' : obj.text);
    if (!text.trim()) return fail('missing-text');
    text = text.slice(0, 200);
  }
  return { ok: true, action: { operation: op, target: parseInt(tkey, 10), text: text } };
}

/*
 * Signup-specific decision prompt. NOTE: this builder takes NO secret
 * parameters — secrets are resolved at execution time via the vault and
 * can never appear in the serialized prompt (see unit test).
 */
function buildSignupDecisionPrompt(goal, table, history, step, maxSteps, extra) {
  extra = extra || {};
  var knownEmail = String(extra.knownEmail || '');
  var siteDomain = String(extra.siteDomain || '');
  var hist = (history || []).map(function (h, i) {
    return (i + 1) + '. ' + h.operation + (h.target != null ? ' [' + h.target + ']' : '') +
      (h.text ? ' "' + String(h.text).slice(0, 80) + '"' : '') + ' -> ' + (h.result || 'ok');
  }).join('\n');
  var emailLine = knownEmail
    ? 'Operator email (use it for email fields): ' + knownEmail
    : 'Operator email: [unknown] — if a required email field cannot be filled, emit BLOCKED with note "email needed" and the operator will provide it.';
  return '[SIGNUP-AGENT] You are the decision module of a guided signup agent.\n' +
    'Goal: ' + String(goal || '').slice(0, 500) + '\n' +
    'Step ' + (step || 1) + ' of ' + (maxSteps || 25) + '.\n\n' +
    'You are creating a user account on a website. ' + emailLine + '\n' +
    (siteDomain ? 'Site domain (use it for OTP search queries): ' + siteDomain + '\n' : '') + '\n' +
    'FLOW:\n' +
    '1. Find the signup entry. PREFER "Continue with Google" / "Sign up with Google" / "Continue with GitHub" buttons when present (OAuth needs no password).\n' +
    '2. If there is no OAuth, fill the form. NEVER invent personal data (no fake names, phone numbers, addresses, birthdays). ' +
    'For PASSWORD fields: do NOT invent a password — emit FILL_SECRET on the password field instead.\n' +
    '3. BEFORE the final account-creation submit (the click that creates the account), you MUST emit AWAITING_CONFIRM on the submit button. The operator reviews it; on approval the click runs automatically.\n' +
    '4. If the site says a verification code was emailed: emit FETCH_OTP on the code input field. The code is fetched and typed automatically.\n' +
    '5. CAPTCHA / phone / SMS verification: you cannot solve these — emit BLOCKED with a clear note (e.g. "captcha needs human").\n' +
    '6. Emit DONE only when the account is visibly created (welcome screen, dashboard, or logged-in state).\n\n' +
    'ELEMENT TABLE (use ONLY these indexed targets):\n' + String(table || '(empty)') + '\n\n' +
    'ACTION HISTORY:\n' + (hist || '(none yet)') + '\n\n' +
    'OPERATIONS: CLICK, TYPE_TEXT, SELECT, SCROLL_UP, SCROLL_DOWN, WAIT, DONE, BLOCKED, FILL_SECRET, FETCH_OTP, AWAITING_CONFIRM.\n' +
    'Rules:\n' +
    '- Reply with EXACTLY ONE JSON object, no other text.\n' +
    '- FILL_SECRET: {"operation":"FILL_SECRET","target":3,"vaultId":"<service>_password","description":"<service> account password"} — target a password/text field; vaultId is lowercase letters/numbers/_/-/. only, max 120 chars. The secret VALUE is never in your reply.\n' +
    '- AWAITING_CONFIRM: {"operation":"AWAITING_CONFIRM","target":7,"summary":"Create account on <site> with <email>"} — target the submit button; summary is required (max 300 chars).\n' +
    '- FETCH_OTP: {"operation":"FETCH_OTP","target":4,"query":"from:<site-domain> newer_than:10m"} — target the code input; query is required.\n' +
    '- TYPE_TEXT only on textbox/searchbox/combobox (under 200 chars); SELECT on select/combobox/listbox; CLICK on buttons/links/checkboxes.\n' +
    '- Omit target for SCROLL_UP/SCROLL_DOWN/WAIT/DONE/BLOCKED.\n' +
    '- Never repeat a failed action; try a different target or operation.\n' +
    'JSON:';
}

/* Extract a 4–8 digit verification code from an email body. Contextual
   patterns first; no generic digit fallback (avoids matching years). */
var OTP_PATTERNS = [
  /(?:verification|verify|otp|2fa|two-factor|passcode|security|confirmation|activation)[^\d]{0,50}(\d{4,8})/i,
  /(\d{4,8})[^\d]{0,50}(?:verification|verify|otp|2fa|two-factor|passcode|security|confirmation|activation|code)/i,
  /(?:code|token)[^\d]{0,30}(?:is|:)?\s*(\d{4,8})/i,
  /\b(\d{6})\b/
];
function extractOtpCode(text) {
  var s = String(text || '');
  for (var i = 0; i < OTP_PATTERNS.length; i++) {
    var m = s.match(OTP_PATTERNS[i]);
    if (m && m[1]) return m[1];
  }
  return null;
}

/* Export pure logic for Node unit tests. */
var jdSignupPure = {
  matchSignupCommand: matchSignupCommand,
  extractSiteLabel: extractSiteLabel,
  extractSiteDomain: extractSiteDomain,
  parseSignupDecision: parseSignupDecision,
  buildSignupDecisionPrompt: buildSignupDecisionPrompt,
  extractOtpCode: extractOtpCode,
  validVaultId: validVaultId,
  SIGNUP_OPS: SIGNUP_OPS
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = jdSignupPure;
}

/* ================= BROWSER RUNTIME ================= */
if (typeof window !== 'undefined') (function () {
  'use strict';
  if (window.__jdSignupAgentLoaded) return;
  window.__jdSignupAgentLoaded = true;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------------- toggle ---------------- */
  var LS_KEY = 'jd_signup_agent';
  function signupEnabled() {
    try { return localStorage.getItem(LS_KEY) === '1'; } catch (_) { return false; }
  }
  function setSignupEnabled(on) {
    try { localStorage.setItem(LS_KEY, on ? '1' : '0'); } catch (_) {}
  }
  window.jdSignupAgentEnabled = signupEnabled;
  window.jdSetSignupAgent = setSignupEnabled;

  /* ---------------- decision engine (swapped in during signup runs) ---------------- */
  window.jdSignupDecision = {
    OPS: SIGNUP_OPS,
    buildDecisionPrompt: function (goal, table, history, step, maxSteps) {
      var email = '';
      try { email = window.__jdSignupEmail || ''; } catch (_) {}
      return buildSignupDecisionPrompt(goal, table, history, step, maxSteps,
        { knownEmail: email, siteDomain: extractSiteDomain(goal) });
    },
    parseDecision: parseSignupDecision
  };

  /* ---------------- SignupLoop: reuses BrowseLoop machinery ----------------
     BrowseLoop.run() reads window.jdBrowseAgent at run time, so we swap in
     the signup decision engine for the duration of the run (restored after).
     Pause/resume, operator notes, and infra-flake retries come free. */
  function SignupLoop(goal, backend, opts) {
    if (!window.jdBrowseLoop) throw new Error('BrowseLoop not loaded');
    window.jdBrowseLoop.call(this, goal, backend, opts);
    this.siteLabel = extractSiteLabel(goal);
    this.siteDomain = extractSiteDomain(goal);
  }
  /* Defensive: if browse-loop.js failed to load, don't throw at file-eval
     time (that would break the whole patch chain). startSignup() checks
     for BrowseLoop and reports gracefully instead. */
  if (window.jdBrowseLoop && window.jdBrowseLoop.prototype) {
    SignupLoop.prototype = Object.create(window.jdBrowseLoop.prototype);
    SignupLoop.prototype.constructor = SignupLoop;
  }
  SignupLoop.prototype.decide = function (prompt) {
    /* _jdSignup keeps our own fetch wrapper from intercepting decision calls.
       (browse's wrapper also skips: the prompt never starts with "browse:".) */
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, personalization: {}, _jdSignup: true })
    }).then(function (res) { return res.text(); });
  };
  SignupLoop.prototype.run = function () {
    var prevBA = window.jdBrowseAgent;
    window.jdBrowseAgent = window.jdSignupDecision;
    function restore(p) {
      return p.then(function (r) { window.jdBrowseAgent = prevBA; return r; },
        function (e) { window.jdBrowseAgent = prevBA; throw e; });
    }
    return restore(window.jdBrowseLoop.prototype.run.call(this));
  };
  window.jdSignupLoop = SignupLoop;

  /* ---------------- backend wrapper: signup special ops ---------------- */
  function wrapBackendForSignup(backend, ctx) {
    ctx.rawBackend = backend;
    ctx.rawAct = function (a) { return backend.act.call(backend, a); };
    var w = {
      act: function (action) {
        var op = action && action.operation;
        if (op === 'FILL_SECRET') return handleFillSecret(ctx, action);
        if (op === 'AWAITING_CONFIRM') return handleAwaitConfirm(ctx, action);
        if (op === 'FETCH_OTP') return handleFetchOtp(ctx, action);
        return backend.act.call(backend, action);
      }
    };
    ['isConfigured', 'connect', 'navigate', 'snapshot', 'release',
     'screenshot', 'listFiles', 'deleteFile', 'downloadFile', 'uploadFile'].forEach(function (m) {
      w[m] = function () {
        var fn = backend[m];
        if (typeof fn !== 'function') {
          if (m === 'listFiles') return Promise.resolve([]);
          if (m === 'screenshot' || m === 'downloadFile') return Promise.resolve(null);
          if (m === 'isConfigured') return false;
          return Promise.resolve();
        }
        return fn.apply(backend, arguments);
      };
    });
    return w;
  }

  /* FILL_SECRET: resolve via vault (secure capture if missing), approval-gated,
     then TYPE_TEXT. The secret value never touches prompts, history, or logs. */
  function handleFillSecret(ctx, action) {
    function fail(note) { return Promise.resolve({ ok: false, note: note }); }
    var vault = null;
    try { vault = window.jdVault || null; } catch (_) {}
    if (!vault) return fail('vault unavailable');
    var label = String(action.description || 'account secret').slice(0, 120) || 'account secret';
    function approvedFill(vaultId) {
      return vault.get(vaultId).then(function (secret) {
        if (secret == null || secret === '') return fail('empty secret');
        var req = (typeof window.jdApprovalRequest === 'function')
          ? window.jdApprovalRequest
          : function () { return Promise.resolve(true); };
        return req({
          type: 'Fill secret',
          description: 'Fill the saved secret "' + label + '" into the form field?',
          details: 'The value stays hidden — it is typed directly and never shown.'
        }).then(function (ok) {
          var out;
          if (!ok) {
            out = { ok: false, note: 'declined by user' };
          } else {
            return ctx.rawAct({ operation: 'TYPE_TEXT', target: action.target, xy: action.xy, text: secret })
              .then(function (r) {
                return { ok: !!(r && r.ok), note: (r && r.ok) ? 'secret filled' : ('fill failed: ' + ((r && r.note) || '')) };
              });
          }
          return out;
        });
      }).catch(function () { return fail('vault read failed'); });
    }
    return vault.get(action.vaultId).then(function (existing) {
      if (existing != null && existing !== '') return approvedFill(action.vaultId);
      /* No vault entry yet — secure capture card first, then continue. */
      try { ctx.emit && ctx.emit({ type: 'secret-needed', label: label }); } catch (_) {}
      return vault.requestSecret({
        service: ctx.siteLabel || 'Signup',
        label: label,
        kind: 'password',
        hint: 'Needed to create your account. Stored encrypted in your vault.'
      }).then(function (newId) {
        if (!newId) return fail('no secret provided');
        return approvedFill(newId);
      });
    }).catch(function () { return fail('vault read failed'); });
  }

  /* AWAITING_CONFIRM: intentional pause + confirm card BEFORE the final
     submit click. On approve the submit click runs; on decline the loop stops. */
  function handleAwaitConfirm(ctx, action) {
    var summary = String(action.summary || action.text || 'Create the account?').slice(0, 300);
    return showSignupConfirm(ctx.card, summary).then(function (approved) {
      if (!approved) {
        try { ctx.loop.stop(); } catch (_) {}
        try { ctx.emit && ctx.emit({ type: 'confirm-declined', summary: summary }); } catch (_) {}
        return { ok: false, note: 'declined by user' };
      }
      return ctx.rawAct({ operation: 'CLICK', target: action.target, xy: action.xy }).then(function (r) {
        return { ok: !!(r && r.ok), note: (r && r.ok) ? 'submitted' : ('submit failed: ' + ((r && r.note) || '')) };
      });
    });
  }

  /* ---------------- OTP auto-fetch ---------------- */
  function fetchOtpEmail(query) {
    /* Same proxy contract as connector-use.js: POST /api/connectors/proxy */
    return fetch('/api/connectors/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connector: 'gmail', op: 'search', q: String(query || ''), max: 3 })
    }).then(function (res) { return res.json(); })
      .catch(function () { return { ok: false }; });
  }
  window.__jdSignupFetchOtpEmail = fetchOtpEmail; /* for tests */

  function handleFetchOtp(ctx, action) {
    var query = String(action.query || '');
    function typeCode(code) {
      return ctx.rawAct({ operation: 'TYPE_TEXT', target: action.target, xy: action.xy, text: code })
        .then(function (r) {
          return { ok: !!(r && r.ok), note: (r && r.ok) ? 'code entered' : 'type failed' };
        });
    }
    function attempt(n) {
      return fetchOtpEmail(query).then(function (res) {
        var code = null;
        try {
          /* Proxy wraps op result: {ok:true, data:{ok:true, from, subject, body}} */
          var d = (res && res.data) || {};
          if (res && res.ok && d.ok !== false) {
            code = extractOtpCode((d.body || '') + '\n' + (d.subject || '') + '\n' + (d.snippet || ''));
          }
        } catch (_) {}
        if (code) return typeCode(code);
        if (n < 2) {
          try { ctx.emit && ctx.emit({ type: 'otp-retry', attempt: n }); } catch (_) {}
          return sleep(15000).then(function () { return attempt(n + 1); });
        }
        return askUserForOtp(ctx, action);
      }).catch(function () {
        if (n < 2) return sleep(15000).then(function () { return attempt(n + 1); });
        return askUserForOtp(ctx, action);
      });
    }
    return attempt(1);
  }

  /* ---------------- card UI (Muse-app style, dark) ---------------- */
  function svgIcon(paths) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' +
      ' style="width:15px;height:15px;flex:none;vertical-align:-2px">' + paths + '</svg>';
  }
  var ICONS = {
    userPlus: svgIcon('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/>'),
    eye: svgIcon('<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>'),
    camera: svgIcon('<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>'),
    stop: svgIcon('<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>'),
    play: svgIcon('<polygon points="6 3 20 12 6 21 6 3"/>'),
    check: svgIcon('<polyline points="20 6 9 17 4 12"/>'),
    x: svgIcon('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'),
    shield: svgIcon('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    key: svgIcon('<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>'),
    alert: svgIcon('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>'),
    send: svgIcon('<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'),
    mail: svgIcon('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>')
  };

  function ensureSignupCss() {
    if (document.getElementById('jdSignupCss')) return;
    var st = document.createElement('style');
    st.id = 'jdSignupCss';
    st.textContent =
      '.jd-su-card{margin:10px 12px;padding:14px;border-radius:16px;background:#141a26;' +
      'border:1px solid rgba(96,165,250,.35);font-size:13px;line-height:1.45;color:#e5e7eb}' +
      '.jd-su-pill{display:inline-flex;align-items:center;gap:8px;background:rgba(96,165,250,.12);' +
      'border:1px solid rgba(96,165,250,.45);border-radius:999px;padding:6px 14px;' +
      'font-weight:700;font-size:12.5px;color:#dbeafe}' +
      '.jd-su-dot{width:8px;height:8px;border-radius:50%;background:#60a5fa;animation:jdSuBlink 1s infinite alternate}' +
      '@keyframes jdSuBlink{from{opacity:1}to{opacity:.25}}' +
      '.jd-su-goal{opacity:.7;margin:8px 0;word-break:break-word;font-size:12.5px}' +
      '.jd-su-steps{max-height:180px;overflow-y:auto;margin:6px 0;font-family:monospace;font-size:11.5px;opacity:.92}' +
      '.jd-su-step{padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.08)}' +
      '.jd-su-foot{display:flex;align-items:center;gap:6px;margin-top:10px;flex-wrap:wrap}' +
      '.jd-su-btn{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.06);' +
      'border:1px solid rgba(255,255,255,.18);color:#e5e7eb;border-radius:9px;' +
      'padding:6px 12px;font-size:12px;cursor:pointer}' +
      '.jd-su-stop{display:inline-flex;align-items:center;gap:6px;background:rgba(239,68,68,.15);' +
      'border:1px solid rgba(239,68,68,.5);color:#fca5a5;border-radius:9px;padding:6px 12px;font-size:12px;cursor:pointer}' +
      '.jd-su-approve{display:inline-flex;align-items:center;gap:6px;background:rgba(52,211,153,.15);' +
      'border:1px solid rgba(52,211,153,.5);color:#6ee7b7;border-radius:9px;padding:7px 14px;font-size:12.5px;cursor:pointer;font-weight:700}' +
      '.jd-su-decline{display:inline-flex;align-items:center;gap:6px;background:rgba(239,68,68,.12);' +
      'border:1px solid rgba(239,68,68,.45);color:#fca5a5;border-radius:9px;padding:7px 14px;font-size:12.5px;cursor:pointer}' +
      '.jd-su-status{font-size:12px;opacity:.65;margin-left:auto}' +
      '.jd-su-shot{margin-top:8px;border-radius:10px;overflow:hidden;display:none}' +
      '.jd-su-shot img{width:100%;display:block}' +
      '.jd-su-steer{display:flex;gap:6px;margin-top:10px}' +
      '.jd-su-note{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);' +
      'border-radius:9px;padding:7px 10px;color:#e5e7eb;font-size:12px}' +
      '.jd-su-confirmbox{margin-top:10px;padding:12px;border-radius:12px;' +
      'background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.45)}' +
      '.jd-su-confirm-title{display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:6px;color:#fde68a}' +
      '.jd-su-confirm-summary{font-size:12.5px;opacity:.9;margin-bottom:4px;word-break:break-word}' +
      '.jd-su-confirm-note{font-size:11.5px;opacity:.6;margin-bottom:10px}' +
      '.jd-su-confirm-btns{display:flex;gap:8px;flex-wrap:wrap}' +
      '.jd-su-otpinput{width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.2);' +
      'border-radius:9px;padding:8px 10px;color:#e5e7eb;font-size:14px;letter-spacing:4px;text-align:center;margin-bottom:10px}' +
      '.jd-su-result{margin-top:10px;padding:9px;border-radius:10px;background:rgba(52,211,153,.08);' +
      'border:1px solid rgba(52,211,153,.3);word-break:break-word;font-size:12.5px}' +
      '.jd-su-markpill{display:inline-flex;align-items:center;gap:8px;margin-top:8px;' +
      'background:rgba(96,165,250,.14);border:1px solid rgba(96,165,250,.5);color:#dbeafe;' +
      'border-radius:999px;padding:8px 16px;font-size:13px;font-weight:700;cursor:pointer}' +
      '.jd-su-markpill:active{transform:scale(.97)}';
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Unload guard: release live Steel sessions on page exit (no credit leak). */
  var suLiveBackends = [];
  function suTrack(b) { try { if (suLiveBackends.indexOf(b) === -1) suLiveBackends.push(b); } catch (_) {} }
  function suUntrack(b) { try { var i = suLiveBackends.indexOf(b); if (i !== -1) suLiveBackends.splice(i, 1); } catch (_) {} }
  function suInstallUnloadGuard() {
    if (window.__jdSignupUnloadGuard) return;
    window.__jdSignupUnloadGuard = true;
    var fire = function () {
      try { window.__jdBrowseUnloading = true; } catch (_) {}
      suLiveBackends.slice().forEach(function (b) { try { b.release(); } catch (_) {} });
    };
    try {
      window.addEventListener('pagehide', fire);
      window.addEventListener('beforeunload', fire);
    } catch (_) {}
  }

  function createSignupCard(goal, site) {
    ensureSignupCss();
    suInstallUnloadGuard();
    var card = document.createElement('div');
    card.className = 'jd-su-card';
    card.innerHTML =
      '<div><span class="jd-su-pill"><span class="jd-su-dot"></span>' + ICONS.userPlus +
      '<span>Signup Agent — Working on ' + esc(site) + '</span></span></div>' +
      '<div class="jd-su-goal">' + esc(goal) + '</div>' +
      '<div class="jd-su-steps"></div>' +
      '<div class="jd-su-panels"></div>' +
      '<div class="jd-su-shot"><img alt="signup screenshot"></div>' +
      '<div class="jd-su-steer">' +
      '<input class="jd-su-note" placeholder="Sabihin sa agent…" aria-label="Message for the signup agent">' +
      '<button class="jd-su-btn jd-su-send">' + ICONS.send + '</button></div>' +
      '<div class="jd-su-foot">' +
      '<button class="jd-su-btn jd-su-watch" style="display:none">' + ICONS.eye + '<span>Watch live</span></button>' +
      '<button class="jd-su-btn jd-su-shotbtn" style="display:none">' + ICONS.camera + '<span>Screenshot</span></button>' +
      '<button class="jd-su-btn jd-su-resume" style="display:none">' + ICONS.play + '<span>Resume</span></button>' +
      '<button class="jd-su-stop">' + ICONS.stop + '<span>Stop</span></button>' +
      '<span class="jd-su-status"></span></div>' +
      '<div class="jd-su-result" style="display:none"></div>';
    try {
      var box = document.getElementById('chatBox');
      if (box) box.appendChild(card); else document.body.appendChild(card);
      if (box) box.scrollTop = box.scrollHeight;
    } catch (_) {}
    return card;
  }

  function suSetStatus(card, t) {
    try { var s = card.querySelector('.jd-su-status'); if (s) s.textContent = t; } catch (_) {}
  }
  function suAddStep(card, html) {
    try {
      var steps = card.querySelector('.jd-su-steps');
      if (!steps) return;
      var row = document.createElement('div');
      row.className = 'jd-su-step';
      row.innerHTML = html;
      steps.appendChild(row);
      steps.scrollTop = steps.scrollHeight;
    } catch (_) {}
  }
  function fmtSuAction(a) {
    return esc(a.operation) + (a.target != null ? ' [' + a.target + ']' : '') +
      (a.text ? ' "' + esc(String(a.text).slice(0, 60)) + '"' : '');
  }

  function onSignupEvent(card, loop, ev, backend) {
    if (ev.type === 'start') {
      suSetStatus(card, 'opening ' + ev.url);
    } else if (ev.type === 'connected') {
      suSetStatus(card, 'connected — working…');
      try {
        if (backend && backend.viewerUrl) {
          var w = card.querySelector('.jd-su-watch');
          if (w) w.style.display = '';
        }
      } catch (_) {}
    } else if (ev.type === 'step') {
      suSetStatus(card, 'step ' + ev.step + '…');
      suAddStep(card, '▸ step ' + ev.step + ': ' + fmtSuAction(ev.action));
    } else if (ev.type === 'acted') {
      suAddStep(card, '&nbsp;&nbsp;→ ' + (ev.ok ? 'ok' : 'failed: ' + esc(ev.note || '')));
    } else if (ev.type === 'retry') {
      suAddStep(card, '&nbsp;&nbsp;↻ retry (' + esc(ev.why || '') + ')');
    } else if (ev.type === 'secret-needed') {
      suAddStep(card, ICONS.key + ' kailangan ng secret: <b>' + esc(ev.label || '') + '</b> — magbubukas ang secure capture.');
    } else if (ev.type === 'otp-retry') {
      suAddStep(card, ICONS.mail + ' walang code sa email — uulitin ang paghahanap…');
    } else if (ev.type === 'confirm-declined') {
      suAddStep(card, ICONS.x + ' declined ng user: ' + esc(ev.summary || ''));
    } else if (ev.type === 'blocked') {
      suSetStatus(card, 'paused — kailangan ng tulong');
      suAddStep(card, ICONS.alert + ' <b>Kailangan mo akong tulungan dito.</b> Ayusin mo (hal. CAPTCHA / SMS code), tapos pindutin ang Resume.');
      try {
        var rb = card.querySelector('.jd-su-resume');
        if (rb) rb.style.display = '';
        var wb = card.querySelector('.jd-su-watch');
        if (wb) wb.style.display = '';
      } catch (_) {}
    }
  }

  function finishSignupCard(card, result, backend, finalShot) {
    try {
      if (backend) suUntrack(backend);
      var dot = card.querySelector('.jd-su-dot');
      if (dot) dot.style.animation = 'none';
      ['.jd-su-stop', '.jd-su-watch', '.jd-su-shotbtn', '.jd-su-resume', '.jd-su-steer'].forEach(function (sel) {
        var b = card.querySelector(sel);
        if (b) b.style.display = 'none';
      });
      if (finalShot) {
        try {
          var wrap = card.querySelector('.jd-su-shot');
          var im = card.querySelector('.jd-su-shot img');
          if (wrap && im) { im.src = 'data:image/png;base64,' + finalShot; wrap.style.display = 'block'; }
        } catch (_) {}
      }
      var msg = {
        DONE: 'Account created',
        BLOCKED: 'Huminto — may harang (login/captcha/SMS)',
        STOPPED: 'Stopped',
        MAX_STEPS: 'Max steps reached',
        GAVE_UP: 'Model unavailable — subukan ulit'
      }[result.status] || result.status;
      suSetStatus(card, msg);
      if (dot) dot.style.background = result.status === 'DONE' ? '#34d399' : '#f87171';
      var res = card.querySelector('.jd-su-result');
      if (res) {
        res.style.display = 'block';
        res.innerHTML = '<b>' + esc(msg) + '</b><br><span style="opacity:.7">Session auto-closed — walang tumatakbong browser, walang gastos.</span>';
      }
      var box = document.getElementById('chatBox');
      if (box) box.scrollTop = box.scrollHeight;
    } catch (_) {}
  }

  /* AWAITING_CONFIRM panel: always gates — never auto-approves. */
  function showSignupConfirm(card, summary) {
    return new Promise(function (resolve) {
      try {
        var panels = card.querySelector('.jd-su-panels');
        var box = document.createElement('div');
        box.className = 'jd-su-confirmbox';
        box.innerHTML =
          '<div class="jd-su-confirm-title">' + ICONS.shield + '<span>Review and confirm</span></div>' +
          '<div class="jd-su-confirm-summary">' + esc(summary) + '</div>' +
          '<div class="jd-su-confirm-note">Suriin sa Watch live kung gusto mo, tapos piliin.</div>' +
          '<div class="jd-su-confirm-btns">' +
          '<button class="jd-su-approve">' + ICONS.check + '<span>Approve &amp; run</span></button>' +
          '<button class="jd-su-decline">' + ICONS.x + '<span>Decline</span></button></div>';
        function done(ok) {
          try { box.remove(); } catch (_) {}
          resolve(ok);
        }
        box.querySelector('.jd-su-approve').addEventListener('click', function () { done(true); });
        box.querySelector('.jd-su-decline').addEventListener('click', function () { done(false); });
        panels.appendChild(box);
        try {
          var chatBox = document.getElementById('chatBox');
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        } catch (_) {}
      } catch (_) {
        resolve(false); /* fail-closed on UI break */
      }
    });
  }

  /* OTP fallback: user pastes the code when auto-fetch finds nothing. */
  function askUserForOtp(ctx, action) {
    return new Promise(function (resolve) {
      try {
        var card = ctx.card;
        var panels = card.querySelector('.jd-su-panels');
        var box = document.createElement('div');
        box.className = 'jd-su-confirmbox';
        box.innerHTML =
          '<div class="jd-su-confirm-title">' + ICONS.mail + '<span>Verification code</span></div>' +
          '<div class="jd-su-confirm-summary">Hindi ko mahanap ang code sa email. Pakilagay ang code na nareceive mo:</div>' +
          '<input class="jd-su-otpinput" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="••••••" aria-label="Verification code">' +
          '<div class="jd-su-confirm-btns">' +
          '<button class="jd-su-approve">' + ICONS.check + '<span>Submit code</span></button>' +
          '<button class="jd-su-decline">' + ICONS.x + '<span>Cancel</span></button></div>';
        var input = box.querySelector('.jd-su-otpinput');
        function done(code) {
          try { box.remove(); } catch (_) {}
          if (!code) {
            try { ctx.loop.stop(); } catch (_) {}
            resolve({ ok: false, note: 'cancelled by user' });
            return;
          }
          var clean = String(code).replace(/\D/g, '').slice(0, 8);
          if (!clean) {
            try { ctx.loop.stop(); } catch (_) {}
            resolve({ ok: false, note: 'invalid code' });
            return;
          }
          ctx.rawAct({ operation: 'TYPE_TEXT', target: action.target, xy: action.xy, text: clean }).then(function (r) {
            resolve({ ok: !!(r && r.ok), note: (r && r.ok) ? 'code entered' : 'type failed' });
          });
        }
        box.querySelector('.jd-su-approve').addEventListener('click', function () { done(input.value); });
        box.querySelector('.jd-su-decline').addEventListener('click', function () { done(null); });
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(input.value); });
        panels.appendChild(box);
        try { input.focus(); } catch (_) {}
        try {
          var chatBox = document.getElementById('chatBox');
          if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        } catch (_) {}
      } catch (_) {
        try { ctx.loop.stop(); } catch (_) {}
        resolve({ ok: false, note: 'otp panel failed' });
      }
    });
  }

  /* ---------------- signup: command ---------------- */
  function synth(text) {
    return Promise.resolve(new Response(text, { 'Content-Type': 'text/plain' }));
  }

  function steelReady() {
    try {
      if (window.jdSteelConfigured) return window.jdSteelConfigured();
    } catch (_) {}
    return Promise.resolve(false);
  }

  function handleSignupCommand(goal) {
    if (!goal) {
      return synth('Gamit: signup: <site o goal> — hal. "signup: register me on openrouter.ai"');
    }
    return steelReady().then(function (ready) {
      if (!ready) {
        return synth('Wala pang Steel API keys — ilagay mo ang STEEL_API_KEYS sa Vercel (comma-separated), tapos i-redeploy.');
      }
      if (!window.jdSteelBackend) {
        return synth('Hindi pa loaded ang Steel backend — mag-refresh ka muna.');
      }
      if (!window.jdBrowseLoop) {
        return synth('Hindi pa loaded ang browse loop — mag-refresh ka muna.');
      }
      return startSignup(goal);
    }).catch(function () {
      return synth('Hindi ma-check ang Steel pool — subukan ulit.');
    });
  }
  window.__jdSignupHandleCommand = handleSignupCommand; /* for tests */

  function startSignup(goal) {
    var site = extractSiteLabel(goal);
    var card = createSignupCard(goal, site);
    var backend = new window.jdSteelBackend();
    suTrack(backend);
    var finalShot = null;
    var ctx = { card: card, siteLabel: site, loop: null, rawAct: null, rawBackend: null };
    var wrapped = wrapBackendForSignup(backend, ctx);
    var loop = new SignupLoop(goal, wrapped, {
      maxSteps: 25,
      onEvent: function (ev) { onSignupEvent(card, loop, ev, backend); },
      onBeforeRelease: function (b) {
        return b.screenshot().then(function (img) { finalShot = img || null; }).catch(function () {});
      }
    });
    ctx.loop = loop;
    ctx.emit = function (ev) { try { onSignupEvent(card, loop, ev, backend); } catch (_) {} };

    try {
      var stopBtn = card.querySelector('.jd-su-stop');
      if (stopBtn) stopBtn.addEventListener('click', function () {
        loop.stop();
        suSetStatus(card, 'stopping…');
      });
      var resumeBtn = card.querySelector('.jd-su-resume');
      if (resumeBtn) resumeBtn.addEventListener('click', function () {
        resumeBtn.style.display = 'none';
        suSetStatus(card, 'resuming…');
        loop.resume();
      });
      var watchBtn = card.querySelector('.jd-su-watch');
      if (watchBtn) watchBtn.addEventListener('click', function () {
        try {
          window.__jdSignupLastBackend = backend;
          if (window.jdBrowseWatchLive) {
            window.jdBrowseWatchLive(backend.sessionId, backend.ki, goal);
          } else if (backend.viewerUrl) {
            window.open(backend.viewerUrl, '_blank', 'noopener');
          } else if (window.showModernToast) {
            window.showModernToast('Wala pang live view');
          }
        } catch (_) {}
      });
      var shotBtn = card.querySelector('.jd-su-shotbtn');
      if (shotBtn) shotBtn.addEventListener('click', function () {
        shotBtn.style.opacity = '.5';
        backend.screenshot().then(function (img) {
          shotBtn.style.opacity = '';
          try {
            var wrap = card.querySelector('.jd-su-shot');
            var im = card.querySelector('.jd-su-shot img');
            if (img && wrap && im) {
              im.src = 'data:image/png;base64,' + img;
              wrap.style.display = 'block';
            } else if (window.showModernToast) {
              window.showModernToast('Walang screenshot');
            }
          } catch (_) {}
        });
      });
      var sendBtn = card.querySelector('.jd-su-send');
      var noteInput = card.querySelector('.jd-su-note');
      function sendNote() {
        try {
          var v = (noteInput.value || '').trim();
          if (!v) return;
          noteInput.value = '';
          loop.note(v);
          suAddStep(card, '&raquo; ' + esc(v));
          if (window.showModernToast) window.showModernToast('Noted — susundin sa susunod na step');
        } catch (_) {}
      }
      if (sendBtn) sendBtn.addEventListener('click', sendNote);
      if (noteInput) noteInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') sendNote();
      });
    } catch (_) {}

    setTimeout(function () {
      try {
        ['.jd-su-shotbtn'].forEach(function (sel) {
          var b = card.querySelector(sel);
          if (b) b.style.display = '';
        });
      } catch (_) {}
      loop.run().then(function (result) {
        finishSignupCard(card, result, backend, finalShot);
      }).catch(function (err) {
        finishSignupCard(card, { status: 'GAVE_UP', history: [] }, backend, finalShot);
        suAddStep(card, 'error: ' + esc(String((err && err.message) || err)));
      });
    }, 400);
    window.jdStartSignup = startSignup;
    return synth('Signup Agent started — sundan ang progress sa card sa baba.');
  }

  /* ---------------- fetch wrapper: signup: intercept ----------------
     Loads after browse-loop.js, so this wrapper is outermost: it checks
     the signup: prefix first and passes everything else through to the
     previously wrapped fetch (browse's wrapper), which handles browse:. */
  function install() {
    if (typeof window.fetch !== 'function') return;
    if (window.fetch.__jdSignup) return;
    var origFetch = window.fetch;
    var wrapped = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        var method = ((init && init.method) || 'GET').toUpperCase();
        if (url.indexOf('/api/chat') !== -1 && method === 'POST' && init && typeof init.body === 'string') {
          var body = null;
          try { body = JSON.parse(init.body); } catch (_) { body = null; }
          if (body && typeof body === 'object' && !body.action && !body._jdBrowse && !body._jdSignup) {
            var msg = typeof body.message === 'string' ? body.message : '';
            var m = SIGNUP_CMD_RE.exec(msg);
            if (m) {
              var goal = msg.slice(m[0].length).trim();
              if (window.jdSignupAgentEnabled && window.jdSignupAgentEnabled()) {
                return handleSignupCommand(goal);
              }
              /* Toggle is OFF — tell the user how to enable instead of
                 sending "signup:" as a normal chat message. */
              return synth('Naka-OFF ang Signup Agent.\n\nI-ON mo muna:\nSettings → Extra → JepongDevxyz AI → Signup Agent BETA\n\nTapos subukan ulit: signup: <site>');
            }
          }
        }
      } catch (_) { /* fail-open */ }
      return origFetch.call(this, input, init);
    };
    wrapped.__jdSignup = true;
    try {
      /* Preserve other wrappers' guards (e.g. __jdBrowse) so they never double-wrap. */
      Object.keys(origFetch).forEach(function (k) {
        if (k.indexOf('__jd') === 0) wrapped[k] = true;
      });
    } catch (_) {}
    window.fetch = wrapped;
  }

  /* ---------------- [[JD_SIGNUP|<site>]] marker → Start signup pill ---------------- */
  var SIGNUP_MARK_RE = /\[\[JD_SIGNUP\|([\s\S]*?)\]\]/;
  var SIGNUP_MARK_ALL_RE = /\[\[JD_SIGNUP\|[\s\S]*?\]\]/g;
  function processSignupMarker(msg) {
    try {
      if (msg.__jdSignupMarkDone) return;
      var text = msg.textContent || '';
      SIGNUP_MARK_RE.lastIndex = 0;
      var m = SIGNUP_MARK_RE.exec(text);
      if (!m) return;
      msg.__jdSignupMarkDone = true;
      var site = (m[1] || '').trim() || 'signup';
      try {
        var walker = document.createTreeWalker(msg, NodeFilter.SHOW_TEXT, null);
        var nodes = [], n;
        while ((n = walker.nextNode())) nodes.push(n);
        nodes.forEach(function (tn) {
          try {
            SIGNUP_MARK_ALL_RE.lastIndex = 0;
            if (SIGNUP_MARK_ALL_RE.test(tn.nodeValue)) {
              SIGNUP_MARK_ALL_RE.lastIndex = 0;
              tn.nodeValue = tn.nodeValue.replace(SIGNUP_MARK_ALL_RE, '');
            }
          } catch (_) {}
        });
      } catch (_) {}
      var pill = document.createElement('button');
      pill.className = 'jd-su-markpill';
      pill.setAttribute('type', 'button');
      pill.innerHTML = ICONS.userPlus + '<span>Start signup</span>';
      pill.addEventListener('click', function () {
        if (!signupEnabled()) {
          if (window.showModernToast) window.showModernToast('I-ON mo muna ang Signup Agent (Settings → Extra → JepongDevxyz AI)');
          return;
        }
        startSignup(site);
      });
      try { msg.appendChild(pill); } catch (_) {}
    } catch (_) {}
  }
  function installMarkerWatcher() {
    if (window.__jdSignupMarkWatcher) return;
    window.__jdSignupMarkWatcher = true;
    try {
      var obs = new MutationObserver(function (muts) {
        muts.forEach(function (mut) {
          if (mut.type === 'characterData') {
            try {
              var p = mut.target && mut.target.parentElement;
              var cmsg = p && p.closest ? p.closest('.msg.bot') : null;
              if (cmsg) processSignupMarker(cmsg);
            } catch (_) {}
            return;
          }
          (mut.addedNodes || []).forEach(function (node) {
            if (!node.querySelectorAll) return;
            var msgs = [];
            if (node.classList && node.classList.contains('msg') && node.classList.contains('bot')) msgs.push(node);
            var desc = node.querySelectorAll('.msg.bot');
            for (var i = 0; i < desc.length; i++) msgs.push(desc[i]);
            msgs.forEach(processSignupMarker);
          });
        });
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (_) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { install(); installMarkerWatcher(); }, { once: true });
  } else {
    install();
    installMarkerWatcher();
  }
  setTimeout(function () { install(); installMarkerWatcher(); }, 1500);
})();
