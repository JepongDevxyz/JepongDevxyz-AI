/* =========================================================
   credential-vault.js — JepongDevxyz AI
   Encrypted client-side credential vault + Muse-app-style
   secure capture card + Settings UI.

   - WebCrypto only (AES-GCM-256, PBKDF2-SHA256 100k). No deps.
   - Values are encrypted at rest in localStorage; the raw key
     lives ONLY in sessionStorage (wiped on lock / tab close).
   - Public API on window.jdVault (see contract below).
   - Plain JS, Lucide-style inline SVGs, no emojis in UI.
   ========================================================= */
(function () {
  'use strict';

  var G = typeof globalThis !== 'undefined' ? globalThis : this;
  if (G.__jdVaultLoaded) return;
  G.__jdVaultLoaded = true;

  /* ---------------- constants ---------------- */
  var LS_KEY = 'jd_credential_vault_v1';
  var SS_KEY = 'jd_vault_key';
  var VERIFIER_TEXT = 'jd-vault-verifier-v1';
  var PBKDF2_ITER = 100000;
  var SALT_LEN = 16;
  var IV_LEN = 12;
  var KINDS = ['api_key', 'password', 'token'];
  var KIND_LABELS = { api_key: 'API Key', password: 'Password', token: 'Token' };

  /* ---------------- tiny helpers ---------------- */
  function b64encode(bytes) {
    var u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (typeof btoa === 'function') {
      var bin = '';
      for (var i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
      return btoa(bin);
    }
    return Buffer.from(u8).toString('base64');
  }
  function b64decode(b64) {
    if (typeof atob === 'function') {
      var bin = atob(String(b64));
      var u8 = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      return u8;
    }
    return new Uint8Array(Buffer.from(String(b64), 'base64'));
  }
  function utf8encode(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    return new Uint8Array(Buffer.from(str, 'utf8'));
  }
  function utf8decode(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytes);
    return Buffer.from(bytes).toString('utf8');
  }
  function getSubtle() {
    var c = G.crypto || (typeof crypto !== 'undefined' ? crypto : null);
    if (!c || !c.subtle) throw new Error('WebCrypto subtle is not available');
    return c.subtle;
  }
  function randomBytes(n) {
    var c = G.crypto || (typeof crypto !== 'undefined' ? crypto : null);
    if (!c || !c.getRandomValues) throw new Error('Secure random is not available');
    var u8 = new Uint8Array(n);
    c.getRandomValues(u8);
    return u8;
  }
  function newId() {
    var b = randomBytes(8);
    var s = '';
    for (var i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2);
    return 'v_' + s;
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeLS() {
    try { return G.localStorage || null; } catch (e) { return null; }
  }
  function safeSS() {
    try { return G.sessionStorage || null; } catch (e) { return null; }
  }
  function toast(msg) {
    try {
      if (typeof G.showModernToast === 'function') { G.showModernToast(msg); return; }
      if (G.window && typeof G.window.showModernToast === 'function') { G.window.showModernToast(msg); return; }
    } catch (e) {}
  }

  /* ---------------- crypto core ---------------- */
  async function deriveKey(passphrase, saltBytes) {
    var subtle = getSubtle();
    var base = await subtle.importKey('raw', utf8encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITER, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }
  async function encryptString(key, plaintext) {
    var subtle = getSubtle();
    var iv = randomBytes(IV_LEN);
    var ct = await subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, utf8encode(plaintext));
    return { iv: b64encode(iv), ciphertext: b64encode(new Uint8Array(ct)) };
  }
  async function decryptString(key, ivB64, ctB64) {
    var subtle = getSubtle();
    var pt = await subtle.decrypt(
      { name: 'AES-GCM', iv: b64decode(ivB64) },
      key,
      b64decode(ctB64)
    );
    return utf8decode(new Uint8Array(pt));
  }
  function constEq(a, b) {
    var x = String(a), y = String(b);
    if (x.length !== y.length) return false;
    var d = 0;
    for (var i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return d === 0;
  }

  /* ---------------- store ---------------- */
  function readStore() {
    var ls = safeLS();
    if (!ls) return null;
    try {
      var raw = ls.getItem(LS_KEY);
      if (!raw) return null;
      var o = JSON.parse(raw);
      if (!o || typeof o !== 'object' || !o.salt || !o.verifier || !Array.isArray(o.items)) return null;
      return o;
    } catch (e) { return null; }
  }
  function writeStore(o) {
    var ls = safeLS();
    if (!ls) throw new Error('localStorage is not available');
    ls.setItem(LS_KEY, JSON.stringify(o));
  }

  /* ---------------- session key ---------------- */
  var _keyCache = null;
  async function importSessionKey() {
    if (_keyCache) return _keyCache;
    var ss = safeSS();
    if (!ss) return null;
    var raw;
    try { raw = ss.getItem(SS_KEY); } catch (e) { return null; }
    if (!raw) return null;
    try {
      var bytes = b64decode(raw);
      if (bytes.length !== 32) return null;
      var key = await getSubtle().importKey('raw', bytes, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
      _keyCache = key;
      return key;
    } catch (e) { return null; }
  }
  async function persistSessionKey(key) {
    var raw = new Uint8Array(await getSubtle().exportKey('raw', key));
    var ss = safeSS();
    if (ss) { try { ss.setItem(SS_KEY, b64encode(raw)); } catch (e) {} }
    _keyCache = key;
    raw.fill(0);
  }
  function clearSessionKey() {
    _keyCache = null;
    var ss = safeSS();
    if (ss) { try { ss.removeItem(SS_KEY); } catch (e) {} }
  }
  function looksUnlocked() {
    if (_keyCache) return true;
    var ss = safeSS();
    if (!ss) return false;
    try {
      var raw = ss.getItem(SS_KEY);
      if (!raw) return false;
      return b64decode(raw).length === 32;
    } catch (e) { return false; }
  }

  /* ---------------- public API ---------------- */
  function normKind(k) {
    k = String(k || '').toLowerCase();
    return KINDS.indexOf(k) >= 0 ? k : 'api_key';
  }

  var api = {
    isUnlocked: function () { return looksUnlocked(); },

    unlock: async function (passphrase) {
      try {
        if (typeof passphrase !== 'string' || !passphrase) return false;
        var store = readStore();
        if (!store) {
          // First run: create the vault with a fresh salt.
          var salt = randomBytes(SALT_LEN);
          var key = await deriveKey(passphrase, salt);
          var ver = await encryptString(key, VERIFIER_TEXT);
          writeStore({ salt: b64encode(salt), verifier: ver, items: [] });
          await persistSessionKey(key);
          return true;
        }
        var saltBytes = b64decode(store.salt);
        var key2 = await deriveKey(passphrase, saltBytes);
        var plain = await decryptString(key2, store.verifier.iv, store.verifier.ciphertext);
        if (!constEq(plain, VERIFIER_TEXT)) return false;
        await persistSessionKey(key2);
        return true;
      } catch (e) { return false; }
    },

    lock: function () { clearSessionKey(); },

    /* The secret VALUE is captured via the secure capture card —
       never passed as a function argument in plain code paths. */
    save: async function (opts) {
      opts = opts || {};
      if (!looksUnlocked()) throw new Error('Vault is locked');
      return requestSecret({
        service: opts.service, label: opts.label, kind: opts.kind, hint: opts.hint,
      });
    },

    get: async function (id) {
      try {
        var key = await importSessionKey();
        if (!key) return null;
        var store = readStore();
        if (!store) return null;
        var item = null;
        for (var i = 0; i < store.items.length; i++) {
          if (store.items[i] && store.items[i].id === id) { item = store.items[i]; break; }
        }
        if (!item) return null;
        return await decryptString(key, item.iv, item.ciphertext);
      } catch (e) { return null; }
    },

    list: async function () {
      var store = readStore();
      if (!store) return [];
      return store.items.map(function (it) {
        return { id: it.id, service: it.service, label: it.label, kind: it.kind, createdAt: it.createdAt };
      });
    },

    remove: async function (id) {
      if (!looksUnlocked()) throw new Error('Vault is locked');
      var store = readStore();
      if (!store) return;
      store.items = store.items.filter(function (it) { return it && it.id !== id; });
      writeStore(store);
    },

    requestSecret: function (opts) { return requestSecret(opts || {}); },

    /* Test-only hooks (not part of the public contract). */
    _testOnly: {
      deriveKey: deriveKey,
      encryptString: encryptString,
      decryptString: decryptString,
      readStore: readStore,
      writeStore: writeStore,
      setCaptureStub: function (fn) { _captureStub = (typeof fn === 'function') ? fn : null; },
    },
  };

  var _captureStub = null;

  async function storeSecret(opts, value) {
    var key = await importSessionKey();
    if (!key) throw new Error('Vault is locked');
    var store = readStore();
    if (!store) throw new Error('Vault store is missing');
    var enc = await encryptString(key, value);
    var item = {
      id: newId(),
      service: String(opts.service || 'Credential').slice(0, 80),
      label: String(opts.label || '').slice(0, 160),
      kind: normKind(opts.kind),
      iv: enc.iv,
      ciphertext: enc.ciphertext,
      createdAt: new Date().toISOString(),
    };
    // Ensure id uniqueness.
    var seen = {};
    store.items.forEach(function (it) { if (it) seen[it.id] = 1; });
    while (seen[item.id]) item.id = newId();
    store.items.push(item);
    writeStore(store);
    return item.id;
  }

  async function requestSecret(opts) {
    opts = opts || {};
    if (!looksUnlocked()) return null;
    var service = String(opts.service || 'Credential').slice(0, 80) || 'Credential';
    var label = String(opts.label || '').slice(0, 160);
    var kind = normKind(opts.kind);
    var hint = String(opts.hint || '').slice(0, 200);

    var value = null;
    if (_captureStub) {
      try { value = await _captureStub({ service: service, label: label, kind: kind, hint: hint }); }
      catch (e) { value = null; }
      if (value == null || String(value) === '') return null;
      return storeSecret({ service: service, label: label, kind: kind }, String(value));
    }

    var captured = await showCaptureCard({ service: service, label: label, kind: kind, hint: hint });
    if (!captured || captured.value == null || String(captured.value) === '') return null;
    return storeSecret({ service: service, label: label, kind: kind }, String(captured.value));
  }

  /* ---------------- theme ---------------- */
  function isLightTheme() {
    try {
      if (G.localStorage && G.localStorage.getItem('jepong_theme') === 'theme-light') return true;
      if (typeof document !== 'undefined' && document.documentElement &&
          document.documentElement.getAttribute('data-theme') === 'light') return true;
    } catch (e) {}
    return false;
  }

  /* ---------------- styles (lazy) ---------------- */
  var _stylesInjected = false;
  function ensureStyles() {
    if (_stylesInjected || typeof document === 'undefined') return;
    _stylesInjected = true;
    var st = document.createElement('style');
    st.id = 'jdv-styles';
    st.textContent = [
      '.jdv-overlay{position:fixed;inset:0;z-index:99990;display:flex;align-items:center;justify-content:center;',
      'background:rgba(8,8,12,.55);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);',
      'padding:24px;animation:jdv-fade .18s ease-out}',
      '@keyframes jdv-fade{from{opacity:0}to{opacity:1}}',
      '.jdv-card{background:#1e1e23;border:1px solid rgba(255,255,255,.09);border-radius:18px;',
      'padding:24px 22px;width:100%;max-width:340px;box-shadow:0 24px 64px rgba(0,0,0,.55);',
      'text-align:center;color:#f2f2f4;animation:jdv-pop .22s cubic-bezier(.2,.9,.3,1.2)}',
      '@keyframes jdv-pop{from{opacity:0;transform:scale(.94) translateY(8px)}to{opacity:1;transform:none}}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-card{background:#ffffff;color:#17171b;',
      'border-color:rgba(20,20,30,.1);box-shadow:0 24px 64px rgba(20,20,40,.18)}',
      '.jdv-ico{width:58px;height:58px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;',
      'background:rgba(10,132,255,.14);border:1px solid rgba(10,132,255,.3)}',
      '.jdv-ico svg{width:26px;height:26px;stroke:#0a84ff}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-ico{background:rgba(10,132,255,.1)}',
      '.jdv-ico.saved{background:rgba(48,209,88,.15);border-color:rgba(48,209,88,.45)}',
      '.jdv-ico.saved svg{stroke:#30d158}',
      '.jdv-title{font-size:17px;font-weight:700;margin:0 0 4px;letter-spacing:-.01em}',
      '.jdv-sub{font-size:13px;line-height:1.45;color:rgba(235,235,240,.62);margin:0 0 16px;word-break:break-word}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-sub{color:rgba(30,30,40,.6)}',
      '.jdv-kind{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;',
      'padding:3px 10px;border-radius:999px;background:rgba(10,132,255,.14);color:#5aa9ff;margin-bottom:12px}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-kind{background:rgba(10,132,255,.1);color:#0a84ff}',
      '.jdv-field{position:relative;margin:0 0 16px}',
      '.jdv-input{width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);',
      'border-radius:12px;color:#f2f2f4;font-size:15px;padding:12px 44px 12px 14px;outline:none;-webkit-appearance:none}',
      '.jdv-input:focus{border-color:#0a84ff;box-shadow:0 0 0 3px rgba(10,132,255,.25)}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-input{background:rgba(20,20,40,.05);border-color:rgba(20,20,40,.12);color:#17171b}',
      '.jdv-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);border:0;background:transparent;',
      'padding:8px;cursor:pointer;color:rgba(235,235,240,.5);display:flex}',
      '.jdv-eye svg{width:18px;height:18px}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-eye{color:rgba(30,30,40,.5)}',
      '.jdv-row{display:flex;gap:10px}',
      '.jdv-pill{flex:1;border:0;border-radius:999px;padding:12px 0;font-size:15px;font-weight:700;cursor:pointer;',
      'transition:transform .12s ease,opacity .12s ease}',
      '.jdv-pill:active{transform:scale(.97)}',
      '.jdv-pill.save{background:#0a84ff;color:#fff;box-shadow:0 6px 18px rgba(10,132,255,.4)}',
      '.jdv-pill.save:disabled{opacity:.45;box-shadow:none;cursor:default}',
      '.jdv-pill.cancel{background:rgba(255,255,255,.08);color:#f2f2f4}',
      '.jdv-overlay[data-jdv-theme="light"] .jdv-pill.cancel{background:rgba(20,20,40,.07);color:#17171b}',
      '.jdv-err{font-size:12.5px;color:#ff6b6b;margin:-8px 0 12px;min-height:18px}',
      '.jdv-saved-label{font-size:16px;font-weight:700;margin-top:2px}',
      /* vault modal */
      '.jdv-vault-head{display:flex;align-items:center;gap:12px;margin-bottom:6px}',
      '.jdv-vault-ico{width:44px;height:44px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;',
      'background:rgba(10,132,255,.13);border:1px solid rgba(10,132,255,.28)}',
      '.jdv-vault-ico svg{width:22px;height:22px;stroke:#0a84ff}',
      '.jdv-vault-title{font-size:16px;font-weight:700}',
      '.jdv-vault-sub{font-size:12.5px;opacity:.6}',
      '.jdv-grid{display:grid;gap:10px;margin-top:12px}',
      '.jdv-item{border:1px solid rgba(127,127,140,.22);border-radius:14px;padding:12px 14px;display:flex;gap:12px;align-items:center}',
      '.jdv-item-ico{width:38px;height:38px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;',
      'background:rgba(127,127,140,.14)}',
      '.jdv-item-ico svg{width:18px;height:18px;stroke:currentColor;opacity:.85}',
      '.jdv-item-main{flex:1;min-width:0}',
      '.jdv-item-svc{font-weight:700;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.jdv-item-meta{font-size:12px;opacity:.6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.jdv-badge{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:3px 9px;border-radius:999px;',
      'background:rgba(10,132,255,.13);color:#5aa9ff;flex:none}',
      '.jdv-item-actions{display:flex;gap:6px;flex:none}',
      '.jdv-mini{border:1px solid rgba(127,127,140,.3);background:transparent;border-radius:999px;padding:7px 12px;',
      'font-size:12.5px;font-weight:700;cursor:pointer;color:inherit;display:inline-flex;align-items:center;gap:5px}',
      '.jdv-mini svg{width:14px;height:14px}',
      '.jdv-mini.danger{color:#ff6b6b;border-color:rgba(255,107,107,.4)}',
      '.jdv-mini:active{transform:scale(.96)}',
      '.jdv-add{margin-top:14px;width:100%;border:1px dashed rgba(127,127,140,.4);background:transparent;border-radius:14px;',
      'padding:13px;font-size:14px;font-weight:700;cursor:pointer;color:inherit;display:flex;align-items:center;justify-content:center;gap:8px}',
      '.jdv-add svg{width:16px;height:16px}',
      '.jdv-form{display:grid;gap:10px;margin-top:12px}',
      '.jdv-form label{font-size:12.5px;font-weight:700;opacity:.75;text-align:left}',
      '.jdv-form input,.jdv-form select{width:100%;box-sizing:border-box;border-radius:12px;padding:11px 13px;font-size:14.5px;',
      'background:rgba(127,127,140,.12);border:1px solid rgba(127,127,140,.25);color:inherit;outline:none}',
      '.jdv-form input:focus,.jdv-form select:focus{border-color:#0a84ff}',
      '.jdv-note{font-size:12px;opacity:.55;line-height:1.5;margin-top:12px}',
      '.jdv-lock-row{display:flex;justify-content:flex-end;margin-bottom:2px}',
      '@media (max-width:420px){.jdv-card{padding:20px 18px}.jdv-item{flex-wrap:wrap}}',
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------------- Lucide-style icons ---------------- */
  var IC = {
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    key: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.4 10.4 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61"/><path d="m2 2 20 20"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  };

  /* ---------------- secure capture card ---------------- */
  function showCaptureCard(opts) {
    return new Promise(function (resolve) {
      if (typeof document === 'undefined') { resolve(null); return; }
      ensureStyles();
      var done = false;
      function finish(val) {
        if (done) return;
        done = true;
        document.removeEventListener('keydown', onKey);
        resolve(val);
      }

      var ov = document.createElement('div');
      ov.className = 'jdv-overlay';
      ov.setAttribute('data-jdv-theme', isLightTheme() ? 'light' : 'dark');

      var card = document.createElement('div');
      card.className = 'jdv-card';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-modal', 'true');

      var iconHtml = '<div class="jdv-ico">' + (opts.kind === 'password' ? IC.lock : IC.key) + '</div>';
      card.innerHTML =
        iconHtml +
        '<div class="jdv-kind">' + esc(KIND_LABELS[opts.kind] || 'API Key') + '</div>' +
        '<h3 class="jdv-title">' + esc(opts.service) + '</h3>' +
        (opts.label || opts.hint
          ? '<p class="jdv-sub">' + esc(opts.label) + (opts.label && opts.hint ? ' · ' : '') + esc(opts.hint) + '</p>'
          : '<p class="jdv-sub">Enter the secret — it is encrypted on this device only.</p>') +
        '<div class="jdv-field">' +
          '<input class="jdv-input" type="password" autocomplete="new-password" spellcheck="false" ' +
            'placeholder="Paste or type the secret" aria-label="Secret value">' +
          '<button class="jdv-eye" type="button" aria-label="Show secret">' + IC.eye + '</button>' +
        '</div>' +
        '<div class="jdv-err"></div>' +
        '<div class="jdv-row">' +
          '<button class="jdv-pill cancel" type="button">Cancel</button>' +
          '<button class="jdv-pill save" type="button">Save</button>' +
        '</div>';

      var input = card.querySelector('.jdv-input');
      var eyeBtn = card.querySelector('.jdv-eye');
      var errBox = card.querySelector('.jdv-err');
      var saveBtn = card.querySelector('.jdv-pill.save');
      var cancelBtn = card.querySelector('.jdv-pill.cancel');

      function setErr(m) { errBox.textContent = m || ''; }
      eyeBtn.addEventListener('click', function () {
        var show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        eyeBtn.innerHTML = show ? IC.eyeOff : IC.eye;
        eyeBtn.setAttribute('aria-label', show ? 'Hide secret' : 'Show secret');
        input.focus();
      });
      function doSave() {
        var v = input.value;
        // Never log the value. Trim accidental pasted whitespace.
        v = v.replace(/^[\s\uFEFF]+|[\s\uFEFF]+$/g, '');
        if (!v) { setErr('Please enter a value first.'); input.focus(); return; }
        setErr('');
        saveBtn.disabled = true;
        // Morph to the "Saved" state (Muse-app Secure Store style).
        card.innerHTML =
          '<div class="jdv-ico saved">' + IC.check + '</div>' +
          '<div class="jdv-saved-label">Saved</div>' +
          '<p class="jdv-sub">' + esc(opts.service) + ' · encrypted on this device</p>';
        setTimeout(function () {
          if (ov.parentNode) ov.parentNode.removeChild(ov);
          finish({ value: v });
          v = '';
        }, 1200);
      }
      function doCancel() {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        finish(null);
      }
      saveBtn.addEventListener('click', doSave);
      cancelBtn.addEventListener('click', doCancel);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); doSave(); }
      });
      ov.addEventListener('mousedown', function (e) { if (e.target === ov) doCancel(); });
      function onKey(e) { if (e.key === 'Escape') doCancel(); }
      document.addEventListener('keydown', onKey);

      ov.appendChild(card);
      document.body.appendChild(ov);
      setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
    });
  }

  /* ---------------- vault settings modal ---------------- */
  var _modalEl = null;

  function closeVaultSettings() {
    if (_modalEl && _modalEl.parentNode) _modalEl.parentNode.removeChild(_modalEl);
    _modalEl = null;
  }

  function openVaultSettings() {
    if (typeof document === 'undefined') return;
    ensureStyles();
    try {
      if (typeof G.closeSettingsModal === 'function') G.closeSettingsModal();
      else if (G.window && typeof G.window.closeSettingsModal === 'function') G.window.closeSettingsModal();
    } catch (e) {}
    closeVaultSettings();
    _modalEl = document.createElement('div');
    _modalEl.className = 'modal-overlay open';
    _modalEl.id = 'jdVaultModalOverlay';
    _modalEl.innerHTML =
      '<section class="settings-home" role="dialog" aria-modal="true" style="max-width:560px">' +
        '<header class="settings-home-header">' +
          '<button class="settings-back" type="button" data-jdv-act="back" aria-label="Back">' + IC.back + '</button>' +
          '<div class="settings-profile"><div><h2>Credential Vault</h2><p>Encrypted secrets · stored only on this device</p></div></div>' +
        '</header>' +
        '<div class="settings-home-scroll"><div id="jdv-vault-body"></div>' +
        '<p class="settings-home-foot jdv-note">Values are encrypted with AES-256-GCM using a key derived from your passphrase (PBKDF2, 100k rounds). ' +
        'The passphrase never leaves this device. Lock the vault when you are done.</p></div>' +
      '</section>';
    _modalEl.addEventListener('mousedown', function (e) { if (e.target === _modalEl) closeVaultSettings(); });
    _modalEl.querySelector('[data-jdv-act="back"]').addEventListener('click', closeVaultSettings);
    document.body.appendChild(_modalEl);
    renderVaultBody();
  }

  function vaultBody() { return _modalEl ? _modalEl.querySelector('#jdv-vault-body') : null; }

  async function renderVaultBody() {
    var host = vaultBody();
    if (!host) return;
    var hasVault = !!readStore();
    if (!api.isUnlocked()) { renderUnlock(host, hasVault); return; }
    renderItems(host);
  }

  function renderUnlock(host, hasVault) {
    host.innerHTML =
      '<div style="text-align:center;padding:18px 6px 6px">' +
        '<div class="jdv-vault-ico" style="margin:0 auto 12px">' + IC.shield + '</div>' +
        '<div class="jdv-vault-title">' + (hasVault ? 'Unlock Credential Vault' : 'Create your vault passphrase') + '</div>' +
        '<div class="jdv-vault-sub" style="margin:4px 0 14px">' +
          (hasVault ? 'Enter your passphrase to decrypt your secrets.'
                    : 'Choose a passphrase. It encrypts everything and cannot be recovered if lost.') +
        '</div>' +
        '<div class="jdv-form" style="max-width:320px;margin:0 auto;text-align:left">' +
          '<label>Passphrase<input type="password" data-jdv="pw1" autocomplete="new-password" placeholder="••••••••"></label>' +
          (hasVault ? '' : '<label>Confirm passphrase<input type="password" data-jdv="pw2" autocomplete="new-password" placeholder="••••••••"></label>') +
          '<div class="jdv-err" data-jdv="err"></div>' +
          '<button class="jdv-pill save" type="button" data-jdv="go" style="flex:none">' +
            (hasVault ? 'Unlock' : 'Create Vault') + '</button>' +
        '</div>' +
      '</div>';
    var pw1 = host.querySelector('[data-jdv="pw1"]');
    var pw2 = host.querySelector('[data-jdv="pw2"]');
    var err = host.querySelector('[data-jdv="err"]');
    var go = host.querySelector('[data-jdv="go"]');
    function fail(m) { err.textContent = m; }
    async function submit() {
      err.textContent = '';
      var p1 = pw1.value;
      if (!p1 || p1.length < 4) { fail('Passphrase must be at least 4 characters.'); return; }
      if (!hasVault && pw2 && p1 !== pw2.value) { fail('Passphrases do not match.'); return; }
      go.disabled = true;
      go.textContent = 'Working…';
      var ok = await api.unlock(p1);
      pw1.value = ''; if (pw2) pw2.value = ''; p1 = '';
      if (!ok) { fail('Wrong passphrase. Try again.'); go.disabled = false; go.textContent = hasVault ? 'Unlock' : 'Create Vault'; return; }
      renderVaultBody();
    }
    go.addEventListener('click', submit);
    pw1.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    setTimeout(function () { try { pw1.focus(); } catch (e) {} }, 60);
  }

  function fmtDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return ''; }
  }

  async function renderItems(host) {
    var items = await api.list();
    var html =
      '<div class="jdv-lock-row"><button class="jdv-mini" type="button" data-jdv="lock">' + IC.lock + '<span>Lock vault</span></button></div>';
    if (!items.length) {
      html += '<p class="settings-home-foot" style="text-align:center;padding:14px 0">No credentials yet. Add your first one below.</p>';
    } else {
      html += '<div class="jdv-grid">';
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        html +=
          '<div class="jdv-item" data-jdv-id="' + esc(it.id) + '">' +
            '<div class="jdv-item-ico">' + (it.kind === 'password' ? IC.lock : IC.key) + '</div>' +
            '<div class="jdv-item-main">' +
              '<div class="jdv-item-svc">' + esc(it.service) + '</div>' +
              '<div class="jdv-item-meta">' + esc(it.label || KIND_LABELS[it.kind] || '') +
                (it.createdAt ? ' · ' + esc(fmtDate(it.createdAt)) : '') + '</div>' +
            '</div>' +
            '<span class="jdv-badge">' + esc(KIND_LABELS[it.kind] || it.kind) + '</span>' +
            '<div class="jdv-item-actions">' +
              '<button class="jdv-mini" type="button" data-jdv-act="copy">' + IC.copy + '<span>Copy</span></button>' +
              '<button class="jdv-mini danger" type="button" data-jdv-act="del">' + IC.trash + '</button>' +
            '</div>' +
          '</div>';
      }
      html += '</div>';
    }
    html +=
      '<button class="jdv-add" type="button" data-jdv="add">' + IC.plus + '<span>Add manually</span></button>' +
      '<div class="jdv-form" data-jdv="addform" style="display:none">' +
        '<label>Service<input type="text" data-jdv="f-service" placeholder="e.g. OpenRouter" maxlength="80"></label>' +
        '<label>Label (optional)<input type="text" data-jdv="f-label" placeholder="e.g. Main key" maxlength="160"></label>' +
        '<label>Kind<select data-jdv="f-kind">' +
          '<option value="api_key">API Key</option><option value="password">Password</option><option value="token">Token</option>' +
        '</select></label>' +
        '<button class="jdv-pill save" type="button" data-jdv="f-go" style="flex:none">Continue</button>' +
      '</div>';
    host.innerHTML = html;

    host.querySelector('[data-jdv="lock"]').addEventListener('click', function () {
      api.lock();
      toast('Vault locked');
      renderVaultBody();
    });

    var addForm = host.querySelector('[data-jdv="addform"]');
    host.querySelector('[data-jdv="add"]').addEventListener('click', function () {
      addForm.style.display = addForm.style.display === 'none' ? 'grid' : 'none';
    });
    host.querySelector('[data-jdv="f-go"]').addEventListener('click', async function () {
      var service = host.querySelector('[data-jdv="f-service"]').value.trim();
      if (!service) { toast('Service name is required'); return; }
      var label = host.querySelector('[data-jdv="f-label"]').value.trim();
      var kind = host.querySelector('[data-jdv="f-kind"]').value;
      var id = await api.requestSecret({ service: service, label: label, kind: kind });
      if (id) renderVaultBody(); // null = user cancelled; stay on the list
    });

    host.querySelectorAll('.jdv-item').forEach(function (el) {
      var id = el.getAttribute('data-jdv-id');
      var copyBtn = el.querySelector('[data-jdv-act="copy"]');
      var delBtn = el.querySelector('[data-jdv-act="del"]');
      if (copyBtn) copyBtn.addEventListener('click', function () { copyValue(id); });
      if (delBtn) delBtn.addEventListener('click', async function () {
        var items2 = await api.list();
        var it2 = null;
        for (var i = 0; i < items2.length; i++) if (items2[i].id === id) it2 = items2[i];
        var name = it2 ? it2.service : 'this credential';
        if (!G.confirm('Delete "' + name + '" from the vault?')) return;
        await api.remove(id);
        toast('Deleted');
        renderVaultBody();
      });
    });
  }

  async function copyValue(id) {
    var v = null;
    try {
      v = await api.get(id); // temp in-memory only; never written to the DOM
      if (v == null) { toast('Copy failed'); return; }
      if (G.navigator && G.navigator.clipboard && G.navigator.clipboard.writeText) {
        await G.navigator.clipboard.writeText(v);
      } else if (typeof document !== 'undefined') {
        var ta = document.createElement('textarea');
        ta.value = v;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      } else { toast('Copy not supported here'); return; }
      toast('Copied to clipboard');
    } catch (e) { toast('Copy failed'); }
    finally { v = ''; v = null; }
  }

  /* ---------------- expose ---------------- */
  G.jdVault = api;
  G.jdVaultOpenSettings = openVaultSettings;
  G.jdVaultCloseSettings = closeVaultSettings;

})();
