/* =========================================================
   JepongDevxyz AI — Qwen-style Settings (Phase 1, 2026-11-06)

   Consolidated full-page Settings modelled on chat.qwen.ai:
   header "<- Settings", left nav of 8 sections (General,
   Usage & Billing, Interface, Models, Chats, Personalization,
   Account, About), active section = grey pill, content column
   ~800px. Replaces window.openSettingsModal (wins over
   settings-muse-v3.js when loaded after it).

   SYNCED + WIRED, never display-only:
   - Every control reads LIVE app state when the page renders
     (original modal checkboxes, localStorage, the app's
     personalizationSettings / chatSessions globals, the live
     model-picker DOM, JDCredits).
   - Every control writes through the app's REAL functions:
     applyJdAppearance, setLiveWebSearchEnabled and the other
     TOGGLE_MAP globals, setPersonalizationToggle,
     setJdHaptics, selectProviderModel, saveSessions,
     showModernConfirm, and the original open* page functions.
   - Qwen items with NO real counterpart in this app are NOT
     rendered (see phase1-report.md "not wired" list) instead
     of being faked.

   Rules honoured: CSS variables only (the --card/--ink/--line/
   --muted/--accent/--chip names are aliased to this app's own
   live theme tokens, because this app does not define the bare
   names at :root — a bare var(--card) would render
   transparent); NO alert()/confirm()/prompt() — the app's
   showModernConfirm / showModernToast are used; toggles show
   the app's existing saved values (the app defaults new
   toggles OFF); Settings back REMOVES the page from the DOM
   and returns to the previous screen.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdQwenSettings) return;

  var PAGE_ID = 'jdQwenSetPage';
  var CSS_ID = 'jdQwenSetCss';

  /* ---------- tiny helpers ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function callFn(name, args) {
    try {
      var f = window[name];
      if (typeof f === 'function') { f.apply(null, args || []); return true; }
    } catch (e) {}
    return false;
  }
  function callPath(path) {
    try {
      var parts = path.split('.'), obj = window;
      for (var i = 0; i < parts.length && obj; i++) obj = obj[parts[i]];
      if (typeof obj === 'function') { obj(); return true; }
    } catch (e) {}
    return false;
  }
  function toast(msg) {
    if (callFn('showModernToast', [msg])) return;
    if (callFn('showJdToast', [msg])) return;
    callFn('showModernAlert', [msg, 'JepongDevxyz AI']);
  }
  /* The app's personalization state is a script-level `let`
     (global lexical binding), not a window property. */
  function getPS() {
    try { if (typeof personalizationSettings !== 'undefined' && personalizationSettings) return personalizationSettings; } catch (e) {}
    return window.personalizationSettings || null;
  }
  function getSessions() {
    try { if (typeof chatSessions !== 'undefined' && chatSessions) return chatSessions; } catch (e) {}
    try { return JSON.parse(lsGet('jepong_ai_chats') || '{}') || {}; } catch (e) { return {}; }
  }

  /* ---------- icons (Lucide paths, stroke=currentColor) ---------- */
  function ic(p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; }
  var I = {
    back: ic('<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>'),
    chev: ic('<path d="m9 18 6-6-6-6"/>'),
    check: ic('<path d="M20 6 9 17l-5-5"/>'),
    sun: ic('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>'),
    globe: ic('<circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/>'),
    mic: ic('<path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/>'),
    brush: ic('<path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/>'),
    chart: ic('<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
    card: ic('<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>'),
    sliders: ic('<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>'),
    cpu: ic('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>'),
    msg: ic('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
    smile: ic('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>'),
    user: ic('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    info: ic('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
    database: ic('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/>'),
    folder: ic('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
    paw: ic('<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>'),
    key: ic('<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>'),
    grid: ic('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'),
    hand: ic('<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>'),
    bell: ic('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
    imp: ic('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
    exp: ic('<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>'),
    trash: ic('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>'),
    file: ic('<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
    shield: ic('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>'),
    receipt: ic('<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>'),
    vibrate: ic('<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>'),
    volume: ic('<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>'),
    wifi: ic('<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>'),
    logout: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>')
  };

  /* ---------- CSS (variables only; names aliased to app tokens) ---------- */
  var CSS = [
    '#' + PAGE_ID + '{--card:var(--modal-bg);--ink:var(--text-main);--line:var(--border-color);--muted:var(--text-muted);--accent:var(--bar-fill);--chip:var(--input-bg);position:fixed;inset:0;z-index:990;background:var(--bg-color);color:var(--ink);display:flex;flex-direction:column;font-family:inherit;-webkit-tap-highlight-color:transparent}',
    '#' + PAGE_ID + ' svg{width:20px;height:20px;flex-shrink:0}',
    '.jdq-head{display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--line)}',
    '.jdq-back{width:38px;height:38px;border:0;background:none;color:var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;border-radius:10px}',
    '.jdq-head h1{font-size:19px;font-weight:700;margin:0}',
    '.jdq-body{flex:1;display:flex;min-height:0}',
    '.jdq-nav{width:236px;flex-shrink:0;padding:16px 10px;overflow-y:auto;border-right:1px solid var(--line)}',
    '.jdq-nav button{display:flex;align-items:center;gap:11px;width:100%;padding:10px 12px;margin-bottom:2px;border:0;border-radius:10px;background:none;color:var(--ink);font-size:15px;font-weight:500;cursor:pointer;text-align:left;font-family:inherit}',
    '.jdq-nav button svg{width:19px;height:19px;color:var(--muted)}',
    '.jdq-nav button[aria-current="page"]{background:var(--chip)}',
    '.jdq-nav button[aria-current="page"] svg{color:var(--ink)}',
    '.jdq-main{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}',
    '.jdq-col{max-width:800px;margin:0 auto;padding:22px 20px 48px}',
    '.jdq-col h2{font-size:21px;font-weight:700;margin:0 0 6px}',
    '.jdq-helper{font-size:13.5px;color:var(--muted);line-height:1.5;margin:0 0 14px}',
    '.jdq-group{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin:0 0 18px}',
    '.jdq-row{display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;background:none;border:0;border-bottom:1px solid var(--line);color:var(--ink);font-size:15.5px;cursor:pointer;text-align:left;font-family:inherit;box-sizing:border-box}',
    '.jdq-row:last-child{border-bottom:none}',
    '.jdq-row>svg{color:var(--muted)}',
    '.jdq-row .jdq-t{flex:1;min-width:0;font-weight:500}',
    '.jdq-row .jdq-sub{display:block;font-size:12.5px;color:var(--muted);font-weight:400;margin-top:1px}',
    '.jdq-row .jdq-val{font-size:13.5px;color:var(--muted);max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.jdq-row .jdq-chev{width:18px;height:18px;color:var(--muted)}',
    '.jdq-row.danger{color:var(--sig-bad,#e5484d)}',
    '.jdq-row.danger>svg{color:var(--sig-bad,#e5484d)}',
    '.jdq-row.static{cursor:default}',
    '.jdq-pills{display:flex;gap:8px;padding:4px 16px 16px}',
    '.jdq-pill{flex:1;padding:9px 0;border-radius:999px;border:1px solid var(--line);background:var(--chip);color:var(--ink);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}',
    '.jdq-pill[aria-pressed="true"]{background:var(--ink);color:var(--bg-color);border-color:var(--ink)}',
    '.jdq-seclabel{font-size:12.5px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:18px 2px 8px}',
    '.jdq-seclabel:first-child{margin-top:0}',
    '.jdq-bar{height:6px;border-radius:3px;background:var(--bar-track,var(--chip));overflow:hidden;margin:10px 0}',
    '.jdq-fill{height:100%;border-radius:3px;background:var(--accent)}',
    '.jdq-primary{width:100%;padding:11px;border:0;border-radius:11px;background:var(--ink);color:var(--bg-color);font-size:14.5px;font-weight:700;cursor:pointer;font-family:inherit}',
    '.jdq-outline{padding:8px 14px;border-radius:9px;border:1px solid var(--line);background:none;color:var(--ink);font-size:13.5px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0}',
    '.jdq-outline.danger{color:var(--sig-bad,#e5484d);border-color:var(--sig-bad,#e5484d)}',
    '.jdq-switch{position:relative;width:46px;height:27px;border-radius:999px;border:1px solid var(--line);background:var(--chip);cursor:pointer;padding:0;flex-shrink:0;font-family:inherit}',
    '.jdq-switch .jdq-knob{position:absolute;top:2px;left:2px;width:21px;height:21px;border-radius:50%;background:var(--muted);transition:left .18s ease,background .18s ease}',
    '.jdq-switch[aria-checked="true"]{background:var(--ink);border-color:var(--ink)}',
    '.jdq-switch[aria-checked="true"] .jdq-knob{left:21px;background:var(--bg-color)}',
    '.jdq-acc{border:1px solid var(--line);border-radius:14px;background:var(--card);margin:0 0 10px;overflow:hidden}',
    '.jdq-acc-head{display:flex;align-items:center;gap:10px;width:100%;padding:13px 16px;background:none;border:0;color:var(--ink);font-size:15.5px;font-weight:600;cursor:pointer;text-align:left;font-family:inherit}',
    '.jdq-acc-head .jdq-chev{margin-left:auto;transition:transform .2s ease}',
    '.jdq-acc.open .jdq-acc-head .jdq-chev{transform:rotate(90deg)}',
    '.jdq-acc-body{display:none;border-top:1px solid var(--line);padding:6px 16px 12px}',
    '.jdq-acc.open .jdq-acc-body{display:block}',
    '.jdq-model{display:flex;align-items:center;gap:10px;width:100%;padding:9px 0;background:none;border:0;border-bottom:1px solid var(--line);color:var(--ink);font-size:14.5px;cursor:pointer;text-align:left;font-family:inherit}',
    '.jdq-model:last-child{border-bottom:none}',
    '.jdq-model .jdq-t{flex:1;min-width:0}',
    '.jdq-model .jdq-sub{display:block;font-size:12.5px;color:var(--muted)}',
    '.jdq-model .jdq-cur{font-size:11.5px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:.04em}',
    '.jdq-model .jdq-check{color:var(--accent)}',
    '.jdq-model .jdq-check svg{width:17px;height:17px}',
    '.jdq-profile{display:flex;align-items:center;gap:14px;padding:16px}',
    '.jdq-avatar{width:52px;height:52px;border-radius:50%;background:var(--chip);color:var(--ink);display:flex;align-items:center;justify-content:center;font-size:21px;font-weight:700;flex-shrink:0;overflow:hidden}',
    '.jdq-avatar img{width:100%;height:100%;object-fit:cover}',
    '.jdq-version{text-align:center;color:var(--muted);font-size:12.5px;padding:10px 0 0}',
    '@media (max-width:760px){.jdq-body{flex-direction:column}.jdq-nav{width:auto;display:flex;gap:4px;padding:10px 12px;overflow-x:auto;overflow-y:hidden;border-right:0;border-bottom:1px solid var(--line)}.jdq-nav button{width:auto;white-space:nowrap;margin-bottom:0;padding:8px 12px}.jdq-col{padding:18px 14px 40px}}'
  ].join('\n');

  /* ---------- toggle wiring (same real targets as settings-muse-v3) ---------- */
  var TOGGLE_MAP = {
    webSearch:       { checkbox: 'settingsWebSearchToggle', call: 'setLiveWebSearchEnabled', ls: 'jepong_last_websearch' },
    autoTemper:      { checkbox: 'jdAutoTemperToggle',       call: 'toggleJdAutoTemper' },
    pureMode:        { checkbox: 'jdPureModeToggle',         call: 'toggleJdPureMode' },
    responseSpeech:  { checkbox: 'responseSpeechToggle',     call: 'toggleResponseSpeech' },
    reconnectNotice: { checkbox: 'jdReconnectCardToggle',    call: 'setReconnectCardEnabled' },
    autoFallback:    { checkbox: 'autoFallbackToggle',       call: 'toggleAutoFallback' },
    smartRouter:     { checkbox: 'smartRouterToggle',        call: 'toggleSmartRouter' }
  };
  function mapToggleState(key) {
    var map = TOGGLE_MAP[key];
    if (!map) return false;
    /* Canonical persisted value first when one exists: the setter
       itself writes it (e.g. setLiveWebSearchEnabled writes
       jepong_last_websearch), while the original modal checkbox is
       only a display that other app sync passes can leave stale. */
    if (map.ls) {
      var raw = lsGet(map.ls);
      if (raw != null) { try { return JSON.parse(raw) === true; } catch (e2) { return raw === 'true' || raw === '1'; } }
    }
    if (key === 'webSearch') {
      var ps = getPS();
      if (ps && typeof ps.advancedWebSearch === 'boolean') return ps.advancedWebSearch;
    }
    try {
      var orig = document.getElementById(map.checkbox);
      if (orig && typeof orig.checked === 'boolean') return !!orig.checked;
    } catch (e) {}
    return false;
  }
  function mapToggleSet(key, on) {
    var map = TOGGLE_MAP[key];
    if (!map) return;
    try {
      var orig = document.getElementById(map.checkbox);
      if (orig) orig.checked = on;
      callFn(map.call, [on]);
    } catch (e) {}
  }
  function psToggleState(key) {
    var ps = getPS();
    if (ps && typeof ps[key] === 'boolean') return ps[key];
    try {
      var saved = JSON.parse(lsGet('jepong_personalization') || '{}');
      if (typeof saved[key] === 'boolean') return saved[key];
    } catch (e) {}
    return false;
  }
  function psToggleSet(key, on) { callFn('setPersonalizationToggle', [key, on]); }

  function switchHtml(id, on, label) {
    /* Deliberately a <button role="switch">, NOT a checkbox input:
       toggles-off.js runs a permanent MutationObserver that unchecks
       (and fires change on) any checkbox added to the DOM while
       checked, which fights every settings UI in this app. A button
       switch is invisible to it. State changes still go through the
       app's REAL setter functions — the button is only the control. */
    return '<button type="button" class="jdq-switch" role="switch" data-jdq-toggle="' + esc(id) + '" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '"><span class="jdq-knob"></span></button>';
  }
  function toggleRow(icon, label, sub, id, on) {
    return '<div class="jdq-row" data-jdq-toggrow="' + esc(id) + '">' +
      icon + '<span class="jdq-t">' + esc(label) + (sub ? '<span class="jdq-sub">' + esc(sub) + '</span>' : '') + '</span>' +
      switchHtml(id, on, label) + '</div>';
  }
  function navRow(icon, label, sub, val, action, arg) {
    return '<button class="jdq-row" type="button" data-jdq-nav="' + esc(action) + '" data-jdq-arg="' + esc(arg || '') + '">' +
      icon + '<span class="jdq-t">' + esc(label) + (sub ? '<span class="jdq-sub">' + esc(sub) + '</span>' : '') + '</span>' +
      (val ? '<span class="jdq-val">' + esc(val) + '</span>' : '') +
      '<span class="jdq-chev">' + I.chev + '</span></button>';
  }
  function btnRow(icon, label, sub, action, danger) {
    return '<button class="jdq-row' + (danger ? ' danger' : '') + '" type="button" data-jdq-act="' + esc(action) + '">' +
      icon + '<span class="jdq-t">' + esc(label) + (sub ? '<span class="jdq-sub">' + esc(sub) + '</span>' : '') + '</span>' +
      '<span class="jdq-chev">' + I.chev + '</span></button>';
  }

  /* ---------- section renderers (read live state every render) ---------- */
  function themeMode() {
    var m = lsGet('jd_appearance_mode') || '';
    return m || 'dark';
  }
  function renderGeneral() {
    var mode = themeMode();
    var ps = getPS();
    var pills = ['system', 'light', 'dark'].map(function (m) {
      var label = m === 'system' ? 'System' : (m === 'light' ? 'Light' : 'Dark');
      return '<button class="jdq-pill" type="button" data-jdq-theme="' + m + '" aria-pressed="' + (mode === m ? 'true' : 'false') + '">' + label + '</button>';
    }).join('');
    var html = '<h2>General</h2>' +
      '<div class="jdq-seclabel">Theme</div>' +
      '<div class="jdq-group"><div class="jdq-pills">' + pills + '</div>' +
      (mode === 'foryou' ? '<p class="jdq-helper" style="padding:0 16px 14px;margin:0">A “For You” theme is active from Appearance — picking a pill above switches the theme right away.</p>' : '') +
      '</div>' +
      '<div class="jdq-group">' +
      navRow(I.globe, 'Language', 'Used for voice and personalization', ps && ps.language ? ps.language : 'Auto-detect', 'openPersonalizationSettings') +
      navRow(I.mic, 'Voice', 'Spoken replies and voice persona', ps && ps.voicePersona ? ps.voicePersona : '', 'openSettingsVoice') +
      navRow(I.brush, 'Appearance', 'Text size and theme extras', '', 'openJdAppearance') +
      '</div>';
    return html;
  }

  function creditsData() {
    try {
      if (window.JDCredits && window.JDCredits.balance != null) {
        var bal = parseInt(window.JDCredits.balance, 10);
        if (!isNaN(bal) && bal >= 0) {
          var total = 500;
          var left = Math.min(100, Math.round((bal / total) * 100));
          return { pct: left + '% left', sub: bal > total ? (bal + ' credits') : (bal + ' of ' + total + ' credits'), width: left };
        }
      }
    } catch (e) {}
    var g = parseInt(lsGet('jd_guest_credit_mirror') || '100', 10);
    if (isNaN(g)) g = 100;
    return { pct: Math.round((g / 100) * 100) + '% left', sub: g + ' guest credits (resets daily)', width: Math.max(0, Math.min(100, g)) };
  }
  function renderUsage() {
    var c = creditsData();
    return '<h2>Usage &amp; Billing</h2>' +
      '<div class="jdq-group"><div style="padding:16px">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;font-size:15.5px;font-weight:600"><span>Credits</span><span>' + esc(c.pct) + '</span></div>' +
      '<div style="font-size:12.5px;color:var(--muted);margin-top:2px">' + esc(c.sub) + '</div>' +
      '<div class="jdq-bar"><div class="jdq-fill" style="width:' + c.width + '%"></div></div>' +
      '<button class="jdq-primary" type="button" data-jdq-act="topup">Top up credits</button>' +
      '</div></div>' +
      '<div class="jdq-group">' +
      navRow(I.chart, 'Usage & Limits', 'Words, tokens and queries used', '', 'openUsage') +
      navRow(I.receipt, 'Refund Policy', '', '', 'legal', 'refund') +
      '</div>';
  }

  function renderInterface() {
    var haptics = lsGet('jd_haptics_enabled') === 'true';
    try { if (typeof jdHapticsEnabled === 'boolean') haptics = jdHapticsEnabled; } catch (e) {}
    return '<h2>Interface</h2>' +
      '<div class="jdq-seclabel">Chat</div>' +
      '<div class="jdq-group">' +
      toggleRow(I.vibrate, 'Haptics', 'Vibration feedback on buttons and responses', 'haptics', haptics) +
      toggleRow(I.wifi, 'Reconnect notice', 'Show the reconnect card when the connection drops', 'map:reconnectNotice', mapToggleState('reconnectNotice')) +
      toggleRow(I.volume, 'Response Speech', 'Read AI responses aloud', 'map:responseSpeech', mapToggleState('responseSpeech')) +
      '</div>' +
      '<p class="jdq-helper">Changes apply instantly and are saved by the app itself.</p>';
  }

  function renderModels() {
    var curP = lsGet('jepong_last_provider') || '';
    var curM = lsGet('jepong_last_model') || '';
    var pages = document.querySelectorAll('#modelPagesTrack .model-provider-page');
    var html = '<h2>Models</h2>' +
      '<p class="jdq-helper">Every model JepongDevxyz AI can use right now, read live from the model picker. Tap a model to use it — the chat picker stays in sync.</p>';
    if (!pages.length) {
      html += '<div class="jdq-group">' + navRow(I.cpu, 'Open model picker', '', '', 'openModelPicker') + '</div>';
      return html;
    }
    Array.prototype.forEach.call(pages, function (page) {
      var provider = page.getAttribute('data-provider') || '';
      var badge = page.querySelector('.provider-badge');
      var title = badge ? badge.textContent.replace(/\s+/g, ' ').trim() : provider;
      var items = page.querySelectorAll('.option-item[data-model]');
      if (!items.length) return;
      var hasCurrent = false;
      var rows = '';
      Array.prototype.forEach.call(items, function (btn) {
        var model = btn.getAttribute('data-model') || '';
        var nameEl = btn.querySelector('.option-name');
        var descEl = btn.querySelector('.option-desc');
        var name = nameEl ? nameEl.textContent.trim() : model;
        var desc = descEl ? descEl.textContent.trim() : '';
        var route = btn.getAttribute('data-bailu-route') || '';
        var isCur = provider === curP && model === curM && (!route || route === (lsGet('jepong_bailu_route') || 'normal'));
        if (isCur) hasCurrent = true;
        rows += '<button class="jdq-model" type="button" data-jdq-model="' + esc(provider) + '" data-jdq-modelid="' + esc(model) + '" data-jdq-modelname="' + esc(name) + '" data-jdq-route="' + esc(route) + '">' +
          '<span class="jdq-t">' + esc(name) + (desc ? '<span class="jdq-sub">' + esc(desc) + '</span>' : '') + '</span>' +
          (isCur ? '<span class="jdq-cur">Current</span><span class="jdq-check">' + I.check + '</span>' : '') +
          '</button>';
      });
      html += '<div class="jdq-acc' + (hasCurrent ? ' open' : '') + '"><button class="jdq-acc-head" type="button">' + esc(title) +
        '<span class="jdq-chev">' + I.chev + '</span></button><div class="jdq-acc-body">' + rows + '</div></div>';
    });
    return html;
  }

  function renderChats() {
    var sessions = getSessions();
    var count = Object.keys(sessions).length;
    return '<h2>Chats</h2>' +
      '<p class="jdq-helper">' + count + (count === 1 ? ' conversation' : ' conversations') + ' stored on this device' + (lsGet('jepong_chats_updated_at') ? '' : '') + '.</p>' +
      '<div class="jdq-group">' +
      btnRow(I.imp, 'Import Chats', 'Restore chats and memory from a backup file', 'importChats') +
      btnRow(I.exp, 'Export Chats', 'Download all chats as a JSON file', 'exportChats') +
      '</div>' +
      '<div class="jdq-group">' +
      btnRow(I.trash, 'Delete All Chats', 'Permanently remove every conversation', 'deleteAllChats', true) +
      '</div>';
  }

  function renderPersonalization() {
    var ps = getPS();
    var memOn = psToggleState('memoryEnabled');
    var advKeys = [
      ['webSearch', 'Web search', 'Let the AI search the live web'],
      ['autoTemper', 'Auto Temper', 'Automatic response tempering'],
      ['pureMode', 'Pure Mode', 'Minimal, distraction-free responses'],
      ['autoFallback', 'Auto Provider Fallback', 'Switch provider when one fails'],
      ['smartRouter', 'Smart Model Router', 'Route each request to a fitting model']
    ];
    var adv = advKeys.map(function (a) {
      return toggleRow(I.sliders, a[1], a[2], 'map:' + a[0], mapToggleState(a[0]));
    }).join('');
    return '<h2>Personalization</h2>' +
      '<div class="jdq-group">' +
      navRow(I.database, 'Memory', ps && ps.memorySummary ? 'Saved memory is on file' : 'What the AI remembers about you', memOn ? 'On' : 'Off', 'openSettingsMemory') +
      toggleRow(I.database, 'Reference saved memories', 'Save and reference memories when generating replies', 'ps:memoryEnabled', memOn) +
      toggleRow(I.msg, 'Reference the chat history', 'Reference earlier conversations when generating responses', 'ps:referenceChatHistory', psToggleState('referenceChatHistory')) +
      navRow(I.smile, 'Customize', 'Nickname, about you, response style and instructions', '', 'openPersonalizationSettings') +
      navRow(I.folder, 'Library', 'Your saved files and documents', '', 'openLibrary') +
      navRow(I.paw, 'Pet', 'Companion pet settings', '', 'openSettingsPet') +
      '</div>' +
      '<div class="jdq-seclabel">Advanced</div>' +
      '<div class="jdq-group">' + adv + '</div>' +
      '<div class="jdq-group">' +
      navRow(I.key, 'Custom API Keys', '', '', 'openProviderKeysSettings') +
      navRow(I.grid, 'Connectors', '', '', '__jdConnectors.open') +
      navRow(I.hand, 'Permissions', '', '', 'openJdPermissions') +
      navRow(I.bell, 'Reply Notifications', '', '', 'openJdReplyNotifications') +
      navRow(I.imp, 'Import Memory', '', '', 'jdOpenImportMemory') +
      '</div>';
  }

  function accountName() {
    var el = document.getElementById('jdSidebarAccountName');
    if (el && el.textContent.trim()) return el.textContent.trim();
    var ps = getPS();
    if (ps && ps.nickname) return ps.nickname;
    return 'JepongDevxyz AI';
  }
  function renderAccount() {
    var name = accountName();
    var initial = name.charAt(0).toUpperCase() || 'J';
    return '<h2>Account</h2>' +
      '<div class="jdq-group"><div class="jdq-profile">' +
      '<div class="jdq-avatar">' + esc(initial) + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:16.5px;font-weight:600">' + esc(name) + '</div>' +
      '<div style="font-size:13px;color:var(--muted)">JepongDevxyz AI account</div></div>' +
      '<button class="jdq-outline" type="button" data-jdq-nav="openJdEditProfile">Edit account</button>' +
      '</div></div>' +
      '<div class="jdq-group">' +
      navRow(I.user, 'Account', 'Sign-in, plan and account details', '', 'openAccountModal') +
      navRow(I.logout, 'Sign out', 'Opens Account, where sign-out lives', '', 'signOut') +
      '</div>' +
      '<div class="jdq-seclabel">Account Management</div>' +
      '<div class="jdq-group">' +
      btnRow(I.trash, 'Delete Account', 'Permanently delete your account and its data', 'deleteAccount', true) +
      '</div>';
  }

  function renderAbout() {
    return '<h2>About</h2>' +
      '<div class="jdq-group">' +
      '<div class="jdq-row static"><span class="jdq-t">JepongDevxyz AI Version</span><span class="jdq-val" id="jdqVersionVal">…</span></div>' +
      '</div>' +
      '<p class="jdq-helper">JepongDevxyz AI is an AI assistant app built by Jepong Devxyz, with chat, image generation, voice, memory and tools in one place.</p>' +
      '<div class="jdq-group">' +
      navRow(I.file, 'Terms of Service', '', '', 'legal', 'terms') +
      navRow(I.shield, 'Privacy Policy', '', '', 'legal', 'privacy') +
      navRow(I.receipt, 'Refund Policy', '', '', 'legal', 'refund') +
      '</div>' +
      '<div class="jdq-version">JepongDevxyz AI</div>';
  }

  var SECTIONS = [
    { id: 'general', label: 'General', icon: I.sliders, render: renderGeneral },
    { id: 'usage', label: 'Usage & Billing', icon: I.card, render: renderUsage },
    { id: 'interface', label: 'Interface', icon: I.msg, render: renderInterface },
    { id: 'models', label: 'Models', icon: I.cpu, render: renderModels },
    { id: 'chats', label: 'Chats', icon: I.msg, render: renderChats },
    { id: 'personalization', label: 'Personalization', icon: I.smile, render: renderPersonalization },
    { id: 'account', label: 'Account', icon: I.user, render: renderAccount },
    { id: 'about', label: 'About', icon: I.info, render: renderAbout }
  ];
  var activeSection = 'general';

  /* ---------- actions ---------- */
  function doTopup() {
    try {
      if (window.JDCredits && typeof window.JDCredits.openTopup === 'function') { window.JDCredits.openTopup(); return; }
      if (callFn('openTopup')) return;
      if (callFn('openPaymongoTopup')) return;
      toast('Top-up is not available right now');
    } catch (e) {}
  }
  function doExportChats() {
    try {
      var data = { app: 'JepongDevxyz AI', exportedAt: new Date().toISOString(), sessions: getSessions() };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'jepongdevxyz-chats.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 4000);
      toast('Export conversation successful');
    } catch (e) {
      toast('Export failed on this browser');
    }
  }
  function doDeleteAllChats() {
    var done = function () {
      try { chatSessions = {}; } catch (e) {}
      try { localStorage.removeItem('jepong_ai_chats'); } catch (e) {}
      if (!callFn('saveSessions')) { try { localStorage.removeItem('jepong_ai_chats'); } catch (e) {} }
      callFn('createNewChat');
      renderSection();
      toast('All chats deleted');
    };
    if (typeof window.showModernConfirm === 'function') {
      window.showModernConfirm('Are you sure? Every conversation will be permanently deleted.', 'Delete All Chats', done);
    } else {
      /* No app confirm dialog available: do nothing rather than
         falling back to a native confirm(). */
      toast('Delete is unavailable right now');
    }
  }
  function doDeleteAccount() {
    callFn('openAccountModal');
    setTimeout(function () {
      var btn = document.getElementById('jdDeleteAccountBtn');
      if (btn) { try { btn.click(); } catch (e) {} }
    }, 400);
  }
  function doSignOut() {
    callFn('openAccountModal');
    setTimeout(function () {
      var si = document.getElementById('cloudSignedIn');
      var btn = si ? si.querySelector('.jd-auth-signout') : null;
      if (btn) { try { btn.click(); } catch (e) {} }
    }, 400);
  }
  function doLegal(which) {
    if (callFn('openJdLegalPolicy', [which])) return;
    var url = which === 'privacy' ? '/privacy.html' : which === 'refund' ? '/refund.html' : '/terms.html';
    try { window.open(url, '_blank'); } catch (e) {}
  }

  /* ---------- page lifecycle ---------- */
  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function renderSection() {
    var page = document.getElementById(PAGE_ID);
    if (!page) return;
    var navBtns = page.querySelectorAll('.jdq-nav button[data-jdq-section]');
    Array.prototype.forEach.call(navBtns, function (b) {
      if (b.getAttribute('data-jdq-section') === activeSection) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    var main = page.querySelector('.jdq-col');
    var sec = SECTIONS.filter(function (s) { return s.id === activeSection; })[0] || SECTIONS[0];
    main.innerHTML = sec.render();
    main.parentNode.scrollTop = 0;
    wireContent(page);
    if (activeSection === 'about') {
      try {
        fetch('/patch-version.txt', { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
          var el = document.getElementById('jdqVersionVal');
          if (el) el.textContent = t.trim();
        }).catch(function () {});
      } catch (e) {}
    }
  }

  function wireContent(page) {
    Array.prototype.forEach.call(page.querySelectorAll('[data-jdq-theme]'), function (btn) {
      btn.addEventListener('click', function () {
        callFn('applyJdAppearance', [btn.getAttribute('data-jdq-theme')]);
        renderSection(); /* re-read saved mode so the pill reflects real state */
      });
    });
    Array.prototype.forEach.call(page.querySelectorAll('[data-jdq-toggrow]'), function (row) {
      row.addEventListener('click', function () {
        var id = row.getAttribute('data-jdq-toggrow');
        var btn = row.querySelector('[data-jdq-toggle]');
        if (!btn) return;
        var on = btn.getAttribute('aria-checked') !== 'true';
        btn.setAttribute('aria-checked', on ? 'true' : 'false');
        if (id.indexOf('map:') === 0) mapToggleSet(id.slice(4), on);
        else if (id.indexOf('ps:') === 0) psToggleSet(id.slice(3), on);
        else if (id === 'haptics') callFn('setJdHaptics', [on]);
      });
    });
    Array.prototype.forEach.call(page.querySelectorAll('[data-jdq-nav]'), function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-jdq-nav');
        var arg = btn.getAttribute('data-jdq-arg');
        if (action === 'legal') { doLegal(arg || 'terms'); return; }
        if (action === 'signOut') { doSignOut(); return; }
        if (action.indexOf('.') !== -1) { callPath(action); return; }
        if (arg) callFn(action, [arg]); else callFn(action);
      });
    });
    Array.prototype.forEach.call(page.querySelectorAll('[data-jdq-act]'), function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-jdq-act');
        if (act === 'topup') doTopup();
        else if (act === 'importChats') callFn('jdOpenImportMemory');
        else if (act === 'exportChats') doExportChats();
        else if (act === 'deleteAllChats') doDeleteAllChats();
        else if (act === 'deleteAccount') doDeleteAccount();
      });
    });
    Array.prototype.forEach.call(page.querySelectorAll('.jdq-acc-head'), function (head) {
      head.addEventListener('click', function () {
        var acc = head.closest('.jdq-acc');
        var wasOpen = acc.classList.contains('open');
        Array.prototype.forEach.call(page.querySelectorAll('.jdq-acc.open'), function (a) { a.classList.remove('open'); });
        if (!wasOpen) acc.classList.add('open');
      });
    });
    Array.prototype.forEach.call(page.querySelectorAll('[data-jdq-model]'), function (btn) {
      btn.addEventListener('click', function () {
        var p = btn.getAttribute('data-jdq-model');
        var m = btn.getAttribute('data-jdq-modelid');
        var n = btn.getAttribute('data-jdq-modelname');
        var r = btn.getAttribute('data-jdq-route');
        if (typeof window.selectProviderModel === 'function') {
          if (r) window.selectProviderModel(p, m, n, r); else window.selectProviderModel(p, m, n);
        }
        renderSection(); /* re-read jepong_last_provider/model so "Current" moves */
      });
    });
  }

  function openSettings() {
    injectCss();
    closeSettings(); /* never stack two copies */
    var page = document.createElement('div');
    page.id = PAGE_ID;
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-label', 'Settings');
    var nav = SECTIONS.map(function (s) {
      return '<button type="button" data-jdq-section="' + s.id + '">' + s.icon + '<span>' + esc(s.label) + '</span></button>';
    }).join('');
    page.innerHTML =
      '<div class="jdq-head"><button class="jdq-back" type="button" id="jdqBack" aria-label="Back">' + I.back + '</button><h1>Settings</h1></div>' +
      '<div class="jdq-body"><nav class="jdq-nav" aria-label="Settings sections">' + nav + '</nav>' +
      '<div class="jdq-main"><div class="jdq-col"></div></div></div>';
    document.body.appendChild(page);
    page.querySelector('#jdqBack').addEventListener('click', function () { closeSettings(); });
    Array.prototype.forEach.call(page.querySelectorAll('[data-jdq-section]'), function (btn) {
      btn.addEventListener('click', function () {
        activeSection = btn.getAttribute('data-jdq-section');
        renderSection();
      });
    });
    renderSection();
    if (window.jdBackNav && typeof window.jdBackNav.push === 'function') {
      try { window.jdBackNav.push(page); } catch (e) {}
    }
  }

  function closeSettings() {
    var page = document.getElementById(PAGE_ID);
    if (!page) return;
    if (window.jdBackNav && typeof window.jdBackNav.pop === 'function') {
      try { window.jdBackNav.pop(page); } catch (e) {}
    }
    page.remove(); /* totally closed — removed from the DOM, not hidden */
  }

  /* Win the Settings opening path (loaded after settings-muse-v3). */
  var api = { open: openSettings, close: closeSettings, version: 'phase1' };
  window.__jdQwenSettings = api;
  window.openSettingsModal = openSettings;
  window.closeSettingsModal = closeSettings;
  /* If another patch loaded earlier re-asserts its own opener on
     DOMContentLoaded, take the path back (one guarded retry). */
  document.addEventListener('DOMContentLoaded', function () {
    if (window.openSettingsModal !== openSettings) {
      window.openSettingsModal = openSettings;
      window.closeSettingsModal = closeSettings;
    }
  });
})();
