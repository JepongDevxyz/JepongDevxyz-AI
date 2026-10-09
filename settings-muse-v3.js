/* =========================================================
   JepongDevxyz AI - Muse-style Settings v3 (2026-10-09)

   Full-screen Muse-style Settings page that REPLACES the
   original settings modal. Deliberately SIMPLE:

   - Nav row tap:  hide this page, then call the ORIGINAL global
                   function (60ms later). Nothing else.
   - Back tap:     hide this page.
   - NO return-to-settings after a detail closes (same as the
     original modal's behavior).
   - NO z-index boosting, NO polling, NO MutationObserver,
     NO auto-restore, NO complex back-nav logic.
   - Toggle rows reuse the app's own .squish-switch styles and
     call the REAL global toggle functions; their state is
     synced from the original modal's checkboxes when present.

   Icons are the verified official Lucide paths (previously
   tested). If this file fails to load, the original modal
   is untouched and still works.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSettingsMuseV3) return;
  window.__jdSettingsMuseV3 = true;

  var PAGE_ID = 'jdmSetPage';
  var CSS_ID = 'jdmSetCss';

  /* Verified Lucide icon paths (stroke=currentColor). */
  var I = {
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    chev: '<svg class="jdset-chev" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    user: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    smile: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
    folder: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    database: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
    paw: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>',
    mic: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>',
    sliders: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>',
    cpu: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/></svg>',
    bell: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    hand: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    grid: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    key: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    import: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    globe: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>',
    sparkles: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    ellipsis: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    volume: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    wifi: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>',
    shuffle: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>',
    route: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    brush: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
    vibrate: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    chart: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    bot: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    trash: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    file: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
    receipt: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    shield: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    logout: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
  };

  /* Smooth slide transitions (Muse app style) */
  var TRANSITION_CSS = [
    '#' + PAGE_ID + '{transition:transform .28s cubic-bezier(.32,.72,0,1),opacity .28s ease}',
    '#' + PAGE_ID + '.jdm-entering{transform:translateX(100%);opacity:0}',
    '#' + PAGE_ID + '.jdm-exiting{transform:translateX(30%);opacity:0}',
    '#' + PAGE_ID + '[hidden]{display:none!important}'
  ].join('\n');

  /* Details opened from Settings: full-screen immediately via body class (no flicker) */
  var DETAIL_CSS = [
    'body.jdm-settings-open [role="dialog"]:not(#' + PAGE_ID + '):not(#settingsModal){',
    'position:fixed!important;inset:0!important;width:100%!important;height:100dvh!important;',
    'max-width:none!important;margin:0!important;border-radius:0!important;',
    'background:#000!important;z-index:1001!important}',
    'body.jdm-settings-open [role="dialog"]:not(#' + PAGE_ID + '):not(#settingsModal) .settings-home{',
    'width:100%!important;height:100dvh!important;max-width:none!important;margin:0!important;border-radius:0!important}',
    'body.theme-light.jdm-settings-open [role="dialog"]:not(#' + PAGE_ID + '):not(#settingsModal){background:#fff!important}'
  ].join('\n');

  var CSS = [
    '#jdmSetPage{position:fixed;inset:0;z-index:999;background:#000;color:#f5f5f5;display:flex;flex-direction:column;font-family:inherit;-webkit-tap-highlight-color:transparent}',
    '#jdmSetPage[hidden]{display:none!important}',
    '#jdmSetPage svg{flex-shrink:0}',
    '.jdm-head{display:flex;align-items:center;justify-content:center;position:relative;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}',
    '.jdm-back{width:38px;height:38px;border:none;background:none;color:#f5f5f5;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
    '.jdm-back svg{width:20px;height:20px}',
    '.jdm-headtxt{flex:1;min-width:0;text-align:center}.jdm-head .jdm-back{position:absolute;left:16px;top:50%;transform:translateY(-50%)}',
    '.jdm-headtxt strong{display:block;font-size:17px;font-weight:600;line-height:1.25}',
    '.jdm-headtxt small{display:block;font-size:12px;color:#a1a1aa}',
    '.jdm-scroll{flex:1;overflow-y:auto;padding:14px 0 40px;-webkit-overflow-scrolling:touch}',
    '.jdm-credits{margin:2px 16px 18px;background:#1c1c1e;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px 16px}',
    '.jdm-crow{display:flex;justify-content:space-between;align-items:baseline;font-size:15px;font-weight:600}',
    '#jdmPct{color:#f5f5f5}',
    '.jdm-csub{font-size:12px;color:#a1a1aa;margin-top:2px}',
    '.jdm-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);margin:10px 0;overflow:hidden}',
    '#jdmFill{height:100%;width:0%;border-radius:3px;background:#f5b73f}',
    '.jdm-topup{width:100%;padding:10px;border:0;border-radius:10px;background:#f5b73f;color:#1a1a1a;font-size:14px;font-weight:700;cursor:pointer}',
    '.jdm-seclabel{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#71717a;padding:0 32px 8px}',
    '.jdm-group{background:#1c1c1e;border:1px solid rgba(255,255,255,.06);border-radius:16px;overflow:hidden;margin:0 16px 20px}',
    '.jdm-row{display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;background:none;border:0;border-bottom:1px solid rgba(255,255,255,.06);color:#f5f5f5;font-size:16px;cursor:pointer;text-align:left;font-family:inherit;box-sizing:border-box}',
    '.jdm-row:last-child{border-bottom:none}',
    '.jdm-row>svg{width:22px;height:22px;color:#a1a1aa}',
    '.jdm-row .jdm-t{flex:1;min-width:0;font-weight:500}',
    '.jdm-row .jdm-chev{width:20px;height:20px;color:#71717a}',
    '.jdm-row.danger{color:#f87171}',
    '.jdm-row.danger>svg{color:#f87171}',
    '.jdm-row .squish-switch-root{margin-left:auto}',
    'body.theme-light #jdmSetPage{background:#fff;color:#111}',
    'body.theme-light .jdm-head{border-bottom-color:rgba(0,0,0,.08)}',
    'body.theme-light .jdm-back{background:none;border:none;color:#111}',
    'body.theme-light .jdm-headtxt small{color:#6b7280}',
    'body.theme-light .jdm-credits{background:#f5f5f7;border-color:rgba(0,0,0,.06)}',
    'body.theme-light #jdmPct{color:#111}',
    'body.theme-light .jdm-csub{color:#6b7280}',
    'body.theme-light .jdm-bar{background:rgba(0,0,0,.1)}',
    'body.theme-light .jdm-seclabel{color:#6b7280}',
    'body.theme-light .jdm-group{background:#f5f5f7;border-color:rgba(0,0,0,.06)}',
    'body.theme-light .jdm-row{color:#111;border-bottom-color:rgba(0,0,0,.06)}',
    'body.theme-light .jdm-row>svg{color:#6b7280}',
    'body.theme-light .jdm-row .jdm-chev{color:#9ca3af}'
  ].join('\n');

  /* label, icon key, action. fn = window function name;
     fnPath = dotted path; arg = optional argument;
     toggle = toggle key; code = special-case. */
  var GROUPS = [
    { label: 'MY AI', rows: [
      { icon: 'user',     label: 'Account',         fn: 'openAccountModal' },
      { icon: 'smile',    label: 'Personalization', fn: 'openPersonalizationSettings' },
      { icon: 'folder',   label: 'Library',         fn: 'openLibrary' },
      { icon: 'database', label: 'Memory',          fn: 'openSettingsMemory' },
      { icon: 'paw',      label: 'Pet',             fn: 'openSettingsPet' },
      { icon: 'mic',      label: 'Voice',           fn: 'openSettingsVoice' }
    ]},
    { label: 'AI & TOOLS', rows: [
      { icon: 'sliders',  label: 'Mode',                   code: 'mode' },
      { icon: 'cpu',      label: 'Models',                 fn: 'openModelPicker' },
      { icon: 'hand',     label: 'Permissions',            fn: 'openJdPermissions' },
      { icon: 'grid',     label: 'Connectors',             fnPath: '__jdConnectors.open' },
      { icon: 'key',      label: 'Custom API Keys',        fn: 'openProviderKeysSettings' },
      { icon: 'import',   label: 'Import Memory',          fn: 'jdOpenImportMemory' },
      { icon: 'bell',     label: 'Reply Notifications',    fn: 'openJdReplyNotifications' },
      { icon: 'globe',    label: 'Web Search',             toggle: 'webSearch' },
      { icon: 'sparkles', label: 'Auto Temper',            toggle: 'autoTemper' },
      { icon: 'ellipsis', label: 'Pure Mode',              toggle: 'pureMode' },
      { icon: 'volume',   label: 'Response Speech',        toggle: 'responseSpeech' },
      { icon: 'wifi',     label: 'Reconnect notice',       toggle: 'reconnectNotice' },
      { icon: 'shuffle',  label: 'Auto Provider Fallback', toggle: 'autoFallback' },
      { icon: 'route',    label: 'Smart Model Router',     toggle: 'smartRouter' }
    ]},
    { label: 'APP', rows: [
      { icon: 'brush',   label: 'Appearance',     fn: 'openJdAppearance' },
      { icon: 'vibrate', label: 'Haptics',        fn: 'openJdHaptics' },
      { icon: 'chart',   label: 'Usage & Limits', fn: 'openUsage' }
    ]},
    { label: 'EXTRA', rows: [
      { icon: 'bot',   label: 'JepongDevxyz AI', fn: 'jdExtraOpenAiSheet' },
      { icon: 'trash', label: 'Cache',           fn: 'jdExtraOpenCacheSheet' }
    ]},
    { label: 'LEGAL & PRIVACY', rows: [
      { icon: 'file',   label: 'Terms of Service', fn: 'openJdLegalPolicy', arg: 'terms' },
      { icon: 'shield', label: 'Privacy Policy',   fn: 'openJdLegalPolicy', arg: 'privacy' },
      { icon: 'receipt', label: 'Refund Policy',    fn: 'openJdTopupTerms' }
    ]}
  ];

  /* toggle key -> {original checkbox id, real global fn, localStorage fallback} */
  var TOGGLE_MAP = {
    webSearch:       { checkbox: 'settingsWebSearchToggle', call: 'setLiveWebSearchEnabled',  ls: 'jepong_last_websearch' },
    autoTemper:      { checkbox: 'jdAutoTemperToggle',       call: 'toggleJdAutoTemper' },
    pureMode:        { checkbox: 'jdPureModeToggle',         call: 'toggleJdPureMode' },
    responseSpeech:  { checkbox: 'responseSpeechToggle',     call: 'toggleResponseSpeech' },
    reconnectNotice: { checkbox: 'jdReconnectCardToggle',    call: 'setReconnectCardEnabled' },
    autoFallback:    { checkbox: 'autoFallbackToggle',        call: 'toggleAutoFallback' },
    smartRouter:     { checkbox: 'smartRouterToggle',        call: 'toggleSmartRouter' },
    replyNotify:     { checkbox: 'settingsNotifyToggle',     call: 'toggleResponseNotifications' }
  };

  function injectCss() {
    // Remove old CSS first (prevents cached broken styles)
    var old = document.getElementById(CSS_ID);
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS + '\n' + TRANSITION_CSS;
    document.head.appendChild(st);
  }

  /* Current on/off for a toggle: original modal checkbox first,
     then localStorage fallback, then default OFF. */
  function getToggleState(key) {
    var map = TOGGLE_MAP[key];
    if (!map) return false;
    try {
      var orig = document.getElementById(map.checkbox);
      if (orig && typeof orig.checked === 'boolean') return orig.checked;
    } catch (e) {}
    try {
      if (map.ls) {
        var raw = localStorage.getItem(map.ls);
        if (raw != null) return raw === 'true' || raw === '1';
      }
    } catch (e2) {}
    return false;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function buildPage() {
    if (document.getElementById(PAGE_ID)) return;
    injectCss();

    var html = '<div class="jdm-head">' +
      '<button class="jdm-back" id="jdmBack" type="button" aria-label="Back">' + I.back + '</button>' +
      '<div class="jdm-headtxt"><strong>JepongDevxyz</strong><small>JepongDevxyz AI settings</small></div>' +
      '</div>' +
      '<div class="jdm-scroll">' +
      '<div class="jdm-credits">' +
        '<div class="jdm-crow"><span>Credits</span><span id="jdmPct">--</span></div>' +
        '<div class="jdm-csub" id="jdmSub">Loading&hellip;</div>' +
        '<div class="jdm-bar"><div id="jdmFill"></div></div>' +
        '<button class="jdm-topup" id="jdmTopup" type="button">Top up credits</button>' +
      '</div>';

    GROUPS.forEach(function (g) {
      html += '<div class="jdm-seclabel">' + esc(g.label) + '</div><div class="jdm-group">';
      g.rows.forEach(function (r) {
        var icon = I[r.icon] || I.chev;
        if (r.toggle) {
          html += '<div class="jdm-row" role="switch" aria-checked="false" data-toggle-key="' + esc(r.toggle) + '">' +
            icon + '<span class="jdm-t">' + esc(r.label) + '</span>' +
            '<label class="squish-switch-root" aria-label="' + esc(r.label) + '">' +
            '<input type="checkbox" data-jdm-toggle="' + esc(r.toggle) + '">' +
            '<span class="squish-switch__track"></span></label></div>';
        } else {
          html += '<button class="jdm-row" type="button"' +
            ' data-fn="' + esc(r.fn || '') + '"' +
            ' data-fnpath="' + esc(r.fnPath || '') + '"' +
            ' data-code="' + esc(r.code || '') + '"' +
            ' data-arg="' + esc(r.arg || '') + '">' +
            icon + '<span class="jdm-t">' + esc(r.label) + '</span>' +
            '<span class="jdm-chev">' + I.chev + '</span></button>';
        }
      });
      html += '</div>';
    });

    // "Your account" / Log out removed - Account page already has Sign out
    html += '<div id="jdmVersion" style="text-align:center;padding:16px 0 8px;color:#71717a;font-size:12px">v…</div>';
    html += '</div>';

    var page = document.createElement('div');
    page.id = PAGE_ID;
    page.setAttribute('hidden', '');
    page.innerHTML = html;
    document.body.appendChild(page);

    document.getElementById('jdmBack').addEventListener('click', closeSettings);

    document.getElementById('jdmTopup').addEventListener('click', function () {
      try {
        if (window.JDCredits && typeof window.JDCredits.openTopup === 'function') { window.JDCredits.openTopup(); return; }
        if (typeof window.openTopup === 'function') { window.openTopup(); return; }
        if (typeof window.openPaymongoTopup === 'function') { window.openPaymongoTopup(); return; }
        if (typeof window.showModernToast === 'function') window.showModernToast('Top-up is not available right now');
      } catch (e) {}
    });

    // Log out handler removed

    /* Nav: HIDE Settings (not close), open detail, show Settings when detail closes.
       This ensures back from detail returns to Settings, not homepage. */
    var navRows = page.querySelectorAll('.jdm-row[data-fn], .jdm-row[data-fnpath], .jdm-row[data-code]');
    Array.prototype.forEach.call(navRows, function (btn) {
      btn.addEventListener('click', function () {
        var fn = btn.getAttribute('data-fn');
        var fnPath = btn.getAttribute('data-fnpath');
        var code = btn.getAttribute('data-code');
        var arg = btn.getAttribute('data-arg');
        window.__jdNavTime = Date.now();
        setTimeout(function () {
          try {
            if (code === 'mode') {
              if (window.toggleModal) window.toggleModal('modeModalOverlay', true);
            } else if (fnPath) {
              var parts = fnPath.split('.');
              var obj = window;
              for (var i = 0; i < parts.length && obj; i++) obj = obj[parts[i]];
              if (typeof obj === 'function') obj();
            } else if (fn) {
              var f = window[fn];
              if (typeof f === 'function') { if (arg) f(arg); else f(); }
            }
          } catch (e) {}
        }, 60);
      });
    });

    /* Watcher removed - Muse app style: details open on top, no hide/show needed */

    /* Toggles: call the real global function; mirror the original
       modal's checkbox so both stay in sync. */
    var toggles = page.querySelectorAll('input[data-jdm-toggle]');
    Array.prototype.forEach.call(toggles, function (inp) {
      inp.addEventListener('change', function () {
        var key = inp.getAttribute('data-jdm-toggle');
        var map = TOGGLE_MAP[key];
        if (!map) return;
        var on = !!inp.checked;
        try {
          var row = inp.closest('.jdm-row');
          if (row) row.setAttribute('aria-checked', on ? 'true' : 'false');
          var orig = document.getElementById(map.checkbox);
          if (orig && orig !== inp) { try { orig.checked = on; } catch (e) {} }
          var f = window[map.call];
          if (typeof f === 'function') f(on);
        } catch (err) {}
      });
    });

    syncToggles();
    updateCredits();
  }

  function syncToggles() {
    try {
      var page = document.getElementById(PAGE_ID);
      if (!page) return;
      var inputs = page.querySelectorAll('input[data-jdm-toggle]');
      Array.prototype.forEach.call(inputs, function (inp) {
        var key = inp.getAttribute('data-jdm-toggle');
        var on = getToggleState(key);
        inp.checked = on;
        var row = inp.closest('.jdm-row');
        if (row) row.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    } catch (e) {}
  }

  function updateCredits() {
    try {
      var pct = document.getElementById('jdmPct');
      var sub = document.getElementById('jdmSub');
      var fill = document.getElementById('jdmFill');
      if (!pct || !sub || !fill) return;
      var shown = false;
      try {
        if (window.JDCredits && window.JDCredits.balance != null) {
          var bal = parseInt(window.JDCredits.balance, 10);
          if (!isNaN(bal) && bal >= 0) {
            var total = 500;
            // Cap percentage at 100% to avoid 6936% bug
            var left = Math.min(100, Math.round((bal / total) * 100));
            pct.textContent = left + '% left';
            // If balance exceeds total, just show balance (not "X of 500")
            if (bal > total) {
              sub.textContent = bal + ' credits';
            } else {
              sub.textContent = bal + ' of ' + total + ' credits';
            }
            fill.style.width = left + '%';
            shown = true;
          }
        }
      } catch (e) {}
      if (!shown) {
        try {
          var gbal = parseInt(localStorage.getItem('jd_guest_credit_mirror') || '100', 10);
          if (isNaN(gbal)) gbal = 100;
          var gleft = Math.round((gbal / 100) * 100);
          pct.textContent = gleft + '% left';
          sub.textContent = gbal + ' guest credits (resets daily)';
          fill.style.width = Math.max(0, Math.min(100, gleft)) + '%';
          shown = true;
        } catch (e2) {}
      }
      if (!shown) {
        pct.textContent = '--';
        sub.textContent = 'Sign in to see credits';
      }
    } catch (e3) {}
  }

  var isOpen = false;

  function openSettings() {
    buildPage();
    var page = document.getElementById(PAGE_ID);
    if (!page) return;
    syncToggles();
    updateCredits();
    // Your account hide logic removed

    // Slide in from right (Muse app style)
    page.classList.add('jdm-entering');
    page.removeAttribute('hidden');
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        page.classList.remove('jdm-entering');
      });
    });
    isOpen = true;
    if (window.jdBackNav) { try { window.jdBackNav.push(page); } catch (e) {} }
  }

  function closeSettings() {
    var page = document.getElementById(PAGE_ID);
    if (!page || !isOpen) return;
    // Ignore if called within 100ms of a nav tap (Pet/Voice internal close)
    if (window.__jdNavTime && (Date.now() - window.__jdNavTime) < 1000) return;
    isOpen = false;
    // Slide out to right
    page.classList.add('jdm-exiting');
    setTimeout(function() {
      page.setAttribute('hidden', '');
      page.classList.remove('jdm-exiting');
    }, 280);
    if (window.jdBackNav) { try { window.jdBackNav.pop(page); } catch (e) {} }
  }

  /* Replace the original settings modal. */
  window.openSettingsModal = openSettings;
  window.closeSettingsModal = closeSettings;

  function updateVersion() {
    var el = document.getElementById('jdmVersion');
    if (!el) return;
    fetch('/patch-version.txt', {cache: 'no-store'})
      .then(function(r) { return r.text(); })
      .then(function(t) { el.textContent = 'v' + t.trim(); })
      .catch(function() {});
  }

  /* Refund and Cancellation Policy (global) */
  window.openJdTopupTerms = function() {
    var overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:1000;background:#0a0a0a;color:#f5f5f5;overflow-y:auto;';
    overlay.innerHTML =
      '<div style="padding:16px;max-width:600px;margin:0 auto;">' +
      '<button id="jdTopupTermsBack" style="background:none;border:none;color:#f5f5f5;font-size:16px;cursor:pointer;margin-bottom:16px;">\u2190 Back</button>' +
      '<h2 style="font-size:20px;margin-bottom:4px;">Refund and Cancellation Policy</h2>' +
      '<p style="font-size:12px;color:#71717a;margin-bottom:16px;">Last updated: September 30, 2026</p>' +
      '<div style="font-size:14px;line-height:1.7;color:#d4d4d8;">' +
      '<p>Thank you for using JepongDevxyz AI. Because our platform utilizes a manual, top-up framework exclusively via QR Ph, we maintain a straightforward billing policy. Please review our rules regarding purchases and credit tokens below:</p>' +
      '<h3 style="font-size:16px;margin:16px 0 8px;color:#f5f5f5;">1. One-Time Prepaid Top-Ups</h3>' +
      '<p>All credit tiers available on JepongDevxyz AI (Starter, Pro, and Max) are processed strictly as one-time, manual prepaid top-ups.</p>' +
      '<ul style="padding-left:20px;"><li>There are no automated recurring subscriptions active on our platform.</li>' +
      '<li>You will never be automatically charged or auto-renewed. You only pay when you intentionally choose to buy a top-up package.</li></ul>' +
      '<h3 style="font-size:16px;margin:16px 0 8px;color:#f5f5f5;">2. Strict Non-Refundable Policy</h3>' +
      '<p>All transactions processed through our active payment gateway via QR Ph (GCash, Maya, or mobile banking apps) are permanent and immediate.</p>' +
      '<ul style="padding-left:20px;"><li><strong>All payments made to JepongDevxyz AI are strictly non-refundable.</strong></li>' +
      '<li>Because our system does not feature an automated refund mechanism for QR Ph payments, we do not provide cash returns, credit reversals, or manual chargebacks under any circumstances.</li>' +
      '<li>Purchased credits hold no monetary value and cannot be redeemed, exchanged, or transferred back into real currency (PHP).</li></ul>' +
      '<h3 style="font-size:16px;margin:16px 0 8px;color:#f5f5f5;">3. Credit Allocation & Delivery</h3>' +
      '<p>Your purchased credits (1,000 for Starter, 5,000 for Pro, and 12,000 for Max) will be credited to your account profile immediately after a successful QR Ph scan. These tokens do not expire as long as your account is active and will stay securely in your pool until spent on text chats (10 credits each) or image generations (50 credits each). Unused credits cannot be refunded if you decide to stop using the application.</p>' +
      '<h3 style="font-size:16px;margin:16px 0 8px;color:#f5f5f5;">4. Technical Issues & Support</h3>' +
      '<p>If your payment went through your mobile wallet but your credits failed to appear on your dashboard due to a network delay, please contact us immediately through our official repository support or communication channels with your transaction reference slip. We will verify the transaction logs manually and manually credit the missing tokens to your account.</p>' +
      '<h3 style="font-size:16px;margin:16px 0 8px;color:#f5f5f5;">5. Policy Updates</h3>' +
      '<p>JepongDevxyz AI reserves the right to update this policy at any time to align with new features or changes introduced by our payment gateway providers.</p>' +
      '</div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('#jdTopupTermsBack').onclick = function() { overlay.remove(); };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { buildPage(); updateVersion(); });
  } else {
    buildPage(); updateVersion();
  }
})();
