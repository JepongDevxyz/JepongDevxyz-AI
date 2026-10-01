/* ============================================================
   JepongDevxyz AI — Permissions settings page (runtime, 2026-10-01)
   Frame-by-frame match of the official Muse app Permissions UI:
   - Permissions main: Connector defaults / Web access defaults /
     Manage permissions (Connectors with count, Artifacts row)
   - Connectors list: real connector icons, chevron opens detail page
   - Connector detail: Read permissions / Write and delete permissions
     sections, per-permission Allow/Ask/Deny dropdown, Reset to defaults
   Storage (localStorage):
     jdPermDefaults.connector / .web = 'ask_some' | 'always_ask'
     jdPermConnector.<id>            = 'allow' | 'ask' | 'deny'
     jdPermDetail.<id>.<permKey>     = 'allow' | 'ask' | 'deny'
   Read live by connector-use.js via window.jdConnectorPerm.
   Additive only; fail-open; idempotent.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdPermissionsPatch) return;
  window.__jdPermissionsPatch = true;

  var CSS_ID = 'jdPermPageCss';
  var ROW_ID = 'jdPermissionsRow';
  var MODAL_ID = 'jdPermissionsModal';

  /* ---------- connector icons (SVG, Muse-app style) ---------- */
  var ICONS = {
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>',
    vercel: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 2 21h20L12 2z"/></svg>',
    browser: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z"/></svg>',
    gmail: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 7L4 6v12h16V6l-8 5z" opacity=".95"/></svg>',
    spotify: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34a.75.75 0 0 1-1.03.25c-2.83-1.73-6.39-2.12-10.58-1.16a.75.75 0 0 1-.34-1.46c4.54-1.04 8.44-.59 11.62 1.34.35.21.46.68.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.24-1.98-8.18-2.55-12.01-1.4a.94.94 0 1 1-.54-1.8c4.36-1.32 9.76-.68 13.46 1.6.44.27.58.85.31 1.29zm.13-3.4C15.24 8.4 8.82 8.16 5.16 9.28a1.13 1.13 0 1 1-.65-2.16c4.18-1.27 11.26-1 15.7 1.62a1.13 1.13 0 0 1-1.16 1.93z"/></svg>',
    slack: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.04 15.17a2.34 2.34 0 1 1-2.33-2.34h2.33v2.34zm.96 0a2.34 2.34 0 1 0 4.68 0v-3.5H6v3.5zm0-6.84a2.34 2.34 0 1 1 0-4.68v2.34h-2.34v2.34H6zm0 .96a2.34 2.34 0 1 0 0 4.68h3.5V9.29H6zm6.84 0a2.34 2.34 0 1 1 4.68 0v-2.34h-2.34V9.29h-2.34zm0 .96a2.34 2.34 0 1 0 0 4.68v3.5h4.68v-3.5h-2.34v-2.34h-2.34zm0 6.84a2.34 2.34 0 1 1 0 4.68v-2.34h2.34v-2.34h-2.34zm0-.96a2.34 2.34 0 1 0 0-4.68h-3.5v4.68h3.5z"/></svg>',
    notion: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 3.5h12.6l4.4 4.4v12.6H4.5V3.5zm2.3 2.3v12.4h12.4V9.1l-2.8-2.8H6.8v-.5zm3.4 3.2h5.6v1.4h-1.4v5.1l1.4.3v1.1l-3.9.1v-1l1.3-.3V10.4H10.2V9z"/></svg>',
    dropbox: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3 7.5 12 13l9-5.5-9-5.5zM3 12.5l9 5.5 9-5.5v4L12 22l-9-5.5v-4z" opacity=".95"/></svg>',
    figma: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 2H7a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h2V2zm2 0v8h2a3 3 0 0 0 3-3V5a3 3 0 0 0-3-3H11zm0 10H9v3a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-3h-5zm7-2a3 3 0 0 0-3 3v3h3a3 3 0 0 0 3-3v-3h-3z"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="13" height="12" rx="3"/><path d="M15 10.5l7-3.5v10l-7-3.5v-3z"/></svg>',
    linear: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/><path d="M8 8l8 8M8 8h5v5" stroke="#fff" stroke-width="1.6" fill="none"/></svg>',
    todoist: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="#fff" stroke-width="1.8" fill="none"/></svg>'
  };
  function iconFor(id, name) {
    if (ICONS[id]) return '<span class="jd-pp-ic">' + ICONS[id] + '</span>';
    var ch = String(name || '?').trim().charAt(0).toUpperCase();
    return '<span class="jd-pp-ic jd-pp-ic-letter">' + esc(ch) + '</span>';
  }

  /* ---------- permission definitions per connector ---------- */
  /* read:  [[key, label]]   write: [[key, label]] */
  var GEN_READ = [['read_data', 'Read data']];
  var GEN_WRITE = [['write_data', 'Create and modify data']];
  var PERMS = {
    browser: {
      read: [['visit', 'Visit websites']],
      write: [['fill_credentials', 'Fill saved credentials'], ['download', 'Download files'],
              ['submit_forms', 'Submit a form or POST request'], ['upload', 'Upload files']]
    },
    gmail: {
      read: [['read_emails', 'Read emails']],
      write: [['send_emails', 'Send emails']]
    },
    github: {
      read: [['read_repos', 'Read repositories'], ['read_prs', 'Read pull requests'], ['read_issues', 'Read issues']],
      write: [['push_files', 'Push files'], ['create_prs', 'Create pull requests'], ['merge_prs', 'Merge pull requests']]
    },
    gdrive: {
      read: [['read_files', 'Read files']],
      write: [['write_files', 'Create and modify files']]
    },
    gcalendar: {
      read: [['read_events', 'Read events']],
      write: [['write_events', 'Create and modify events']]
    },
    spotify: {
      read: [['read_library', 'Read library and playlists']],
      write: [['control_playback', 'Control playback']]
    },
    notion: {
      read: [['read_pages', 'Read pages']],
      write: [['write_pages', 'Create and modify pages']]
    },
    slack: {
      read: [['read_messages', 'Read messages']],
      write: [['send_messages', 'Send messages']]
    }
  };
  function permsFor(id) {
    return PERMS[id] || { read: GEN_READ, write: GEN_WRITE };
  }

  var NAMES = {
    gmail: 'Gmail', gcalendar: 'Google Calendar', gcontacts: 'Google Contacts',
    gdrive: 'Google Drive', gdocs: 'Google Docs', gsheets: 'Google Sheets',
    gslides: 'Google Slides', gforms: 'Google Forms', gtasks: 'Google Tasks',
    outlook_mail: 'Outlook Mail', outlook_calendar: 'Outlook Calendar',
    outlook_contacts: 'Outlook Contacts', spotify: 'Spotify', github: 'GitHub',
    facebook: 'Facebook', instagram: 'Instagram', instagram_msgs: 'Instagram Messages',
    messenger: 'Messenger', threads: 'Threads', meta_biz: 'Meta Business',
    meta_ads: 'Meta Ads', dropbox: 'Dropbox', box: 'Box', notion: 'Notion',
    slack: 'Slack', figma: 'Figma', zoom: 'Zoom', linear: 'Linear',
    todoist: 'Todoist', asana: 'Asana', canva: 'Canva', quickbooks: 'QuickBooks',
    withings: 'Withings', vercel: 'Vercel', plaid: 'Bank accounts',
    stripe: 'Stripe', shopify: 'Shopify', calendly: 'Calendly', klaviyo: 'Klaviyo',
    highlevel: 'GoHighLevel', tessie: 'Tessie', tailscale: 'Tailscale',
    printify: 'Printify', flightaware: 'FlightAware', browser: 'Browser'
  };
  function connName(id) {
    return NAMES[id] || String(id).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------- storage API (shared with connector-use.js) ---------- */
  function detailKey(id, key) { return 'jdPermDetail.' + id + '.' + key; }
  function getDetail(id, key) {
    try { return localStorage.getItem(detailKey(id, key)); } catch (_) { return null; }
  }
  function setDetail(id, key, v) {
    try {
      if (!v) localStorage.removeItem(detailKey(id, key));
      else localStorage.setItem(detailKey(id, key), v);
    } catch (_) {}
  }
  function resetConnector(id) {
    try {
      var defs = permsFor(id), k;
      for (k = 0; k < defs.read.length; k++) localStorage.removeItem(detailKey(id, defs.read[k][0]));
      for (k = 0; k < defs.write.length; k++) localStorage.removeItem(detailKey(id, defs.write[k][0]));
      localStorage.removeItem('jdPermConnector.' + id);
    } catch (_) {}
  }
  function permLabel(v) {
    if (v === 'allow') return 'Allow';
    if (v === 'deny') return 'Deny';
    return 'Ask';
  }
  /* Effective value for one permission: detail > connector-level > 'ask'. */
  function effectivePerm(id, key) {
    var d = getDetail(id, key);
    if (d === 'allow' || d === 'deny' || d === 'ask') return d;
    try {
      var c = localStorage.getItem('jdPermConnector.' + id);
      if (c === 'allow' || c === 'deny' || c === 'ask') return c;
    } catch (_) {}
    return 'ask';
  }
  /* Expose for connector-use.js bridge. */
  try {
    window.jdConnectorPermDetail = {
      get: effectivePerm,
      firstReadKey: function (id) {
        var p = permsFor(id);
        return p.read.length ? p.read[0][0] : 'read_data';
      }
    };
  } catch (_) {}

  function connectedIds() {
    var ids = [];
    try {
      var st = window.__jdConnectorStatus;
      var map = st && (st.connectors || st);
      if (map) {
        for (var k in map) {
          if (Object.prototype.hasOwnProperty.call(map, k) && map[k] && map[k].connected) ids.push(k);
        }
      }
    } catch (_) {}
    return ids.sort();
  }

  /* ---------- CSS ---------- */
  function ensureCss() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var st = document.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '#' + MODAL_ID + ' .jd-pp-back{width:34px!important;height:34px!important;border-radius:50%!important;' +
        'background:#2c2c2e!important;border:none!important;color:#fff!important;display:flex!important;' +
        'align-items:center!important;justify-content:center!important;cursor:pointer!important;flex:0 0 34px!important}' +
        '#' + MODAL_ID + ' .jd-pp-back svg{width:18px!important;height:18px!important}' +
        '#' + MODAL_ID + ' .jd-pp-head{display:flex!important;align-items:center!important;gap:12px!important;' +
        'padding:14px 16px 6px!important}' +
        '#' + MODAL_ID + ' .jd-pp-head h2{margin:0!important;font-size:17px!important;font-weight:600!important;color:#fff!important}' +
        '#' + MODAL_ID + ' .jd-pp-label{font-size:13px!important;color:#8e8e93!important;margin:16px 20px 8px!important}' +
        '#' + MODAL_ID + ' .jd-pp-card{background:#1e1e20!important;border-radius:14px!important;' +
        'margin:0 16px!important;position:relative!important}' +
        '#' + MODAL_ID + ' .jd-pp-card > :first-child{border-top-left-radius:14px!important;border-top-right-radius:14px!important}' +
        '#' + MODAL_ID + ' .jd-pp-card > :last-child{border-bottom-left-radius:14px!important;border-bottom-right-radius:14px!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt{width:100%!important;display:flex!important;align-items:center!important;' +
        'justify-content:space-between!important;gap:12px!important;padding:13px 16px!important;background:transparent!important;' +
        'border:none!important;cursor:pointer!important;text-align:left!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt + .jd-pp-opt{border-top:1px solid rgba(255,255,255,.07)!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt b{display:block!important;font-size:15px!important;font-weight:400!important;color:#fff!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt small{display:block!important;font-size:13px!important;color:#8e8e93!important;margin-top:3px!important;' +
        'line-height:1.35!important}' +
        '#' + MODAL_ID + ' .jd-pp-check{color:#fff!important;font-size:17px!important;flex:0 0 auto!important;visibility:hidden!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt.sel .jd-pp-check{visibility:visible!important}' +
        '#' + MODAL_ID + ' .jd-pp-row{width:100%!important;display:flex!important;align-items:center!important;' +
        'justify-content:space-between!important;padding:13px 16px!important;background:transparent!important;border:none!important;' +
        'cursor:pointer!important;color:#fff!important;font-size:15px!important}' +
        '#' + MODAL_ID + ' .jd-pp-row + .jd-pp-row{border-top:1px solid rgba(255,255,255,.07)!important}' +
        '#' + MODAL_ID + ' .jd-pp-row .jd-pp-meta{color:#8e8e93!important;font-size:14px!important}' +
        '#' + MODAL_ID + ' .jd-pp-connrow{width:100%!important;display:flex!important;align-items:center!important;gap:12px!important;' +
        'padding:11px 16px!important;background:transparent!important;border:none!important;cursor:pointer!important;text-align:left!important}' +
        '#' + MODAL_ID + ' .jd-pp-connrow + .jd-pp-connrow{border-top:1px solid rgba(255,255,255,.07)!important}' +
        '#' + MODAL_ID + ' .jd-pp-ic{width:30px!important;height:30px!important;border-radius:8px!important;background:#fff!important;' +
        'display:flex!important;align-items:center!important;justify-content:center!important;flex:0 0 30px!important;' +
        'color:#111!important;overflow:hidden!important}' +
        '#' + MODAL_ID + ' .jd-pp-ic svg{width:20px!important;height:20px!important}' +
        '#' + MODAL_ID + ' .jd-pp-ic-letter{font-weight:700!important;font-size:15px!important}' +
        '#' + MODAL_ID + ' .jd-pp-connname{flex:1!important;font-size:15px!important;color:#fff!important}' +
        '#' + MODAL_ID + ' .jd-pp-chev{color:#8e8e93!important;font-size:16px!important}' +
        '#' + MODAL_ID + ' .jd-pp-permrow{display:flex!important;align-items:center!important;justify-content:space-between!important;' +
        'gap:10px!important;padding:12px 16px!important}' +
        '#' + MODAL_ID + ' .jd-pp-permrow + .jd-pp-permrow{border-top:1px solid rgba(255,255,255,.07)!important}' +
        '#' + MODAL_ID + ' .jd-pp-permname{font-size:15px!important;color:#fff!important;flex:1!important}' +
        '#' + MODAL_ID + ' .jd-pp-dd{position:relative!important}' +
        '#' + MODAL_ID + ' .jd-pp-ddbtn{display:flex!important;align-items:center!important;gap:4px!important;' +
        'background:transparent!important;border:none!important;color:#8e8e93!important;font-size:14px!important;' +
        'cursor:pointer!important;padding:6px 2px!important}' +
        '#' + MODAL_ID + ' .jd-pp-menu{position:absolute!important;right:0!important;top:calc(100% + 4px)!important;' +
        'background:#2c2c2e!important;border-radius:12px!important;min-width:110px!important;z-index:50!important;' +
        'box-shadow:0 12px 32px rgba(0,0,0,.65)!important;display:none!important;overflow:hidden!important;' +
        'border:1px solid rgba(255,255,255,.1)!important}' +
        '#' + MODAL_ID + ' .jd-pp-dd.open .jd-pp-menu{display:block!important}' +
        '#' + MODAL_ID + ' .jd-pp-menu button{display:block!important;width:100%!important;text-align:left!important;' +
        'padding:11px 14px!important;background:transparent!important;border:none!important;color:#fff!important;' +
        'font-size:14px!important;cursor:pointer!important}' +
        '#' + MODAL_ID + ' .jd-pp-menu button:active{background:rgba(255,255,255,.12)!important}' +
        '#' + MODAL_ID + ' .jd-pp-reset{display:block!important;width:100%!important;text-align:center!important;' +
        'padding:18px!important;background:transparent!important;border:none!important;color:#ff453a!important;' +
        'font-size:15px!important;cursor:pointer!important}' +
        '#' + MODAL_ID + ' .jd-pp-empty{padding:16px!important;color:#8e8e93!important;font-size:14px!important}' +
        '#' + MODAL_ID + ' .jd-pp-view{display:none}' +
        '#' + MODAL_ID + ' .jd-pp-view.active{display:block}' +
        /* Light-mode theme overrides (2026-10-01). */
        'body.theme-light #' + MODAL_ID + ' .jd-pp-card{background:#ffffff!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-head h2{color:#111!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-opt b{color:#111!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-connname{color:#111!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-permname{color:#111!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-check{color:#111!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-menu button{color:#111!important}' +
        'body.theme-light #' + MODAL_ID + ' .jd-pp-menu button:active{background:rgba(0,0,0,.08)!important}';
      document.head.appendChild(st);
    } catch (_) {}
  }

  /* ---------- views ---------- */
  var currentDetail = null;

  function ddHtml(id, key, cur) {
    return '<div class="jd-pp-dd"><button type="button" class="jd-pp-ddbtn" data-id="' + esc(id) +
      '" data-key="' + esc(key) + '"><span>' + esc(permLabel(cur)) +
      '</span><span style="font-size:10px">\u25BE</span></button>' +
      '<div class="jd-pp-menu"><button type="button" data-v="allow">Allow</button>' +
      '<button type="button" data-v="ask">Ask</button>' +
      '<button type="button" data-v="deny">Deny</button></div></div>';
  }

  function renderMain() {
    var def = 'ask_some', wdef = 'ask_some';
    try {
      if (window.jdConnectorPerm) {
        def = window.jdConnectorPerm.getDefault();
        wdef = window.jdConnectorPerm.getWebDefault();
      } else {
        def = localStorage.getItem('jdPermDefaults.connector') || 'ask_some';
        wdef = localStorage.getItem('jdPermDefaults.web') || 'ask_some';
      }
    } catch (_) {}
    var n = connectedIds().length;
    return '<div class="jd-pp-head"><button type="button" class="jd-pp-back" onclick="closeJdPermissions()" aria-label="Back">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<h2>Permissions</h2></div>' +
      '<div class="jd-pp-label">Connector defaults</div>' +
      '<div class="jd-pp-card">' +
      '<button type="button" class="jd-pp-opt' + (def === 'ask_some' ? ' sel' : '') + '" data-def="ask_some">' +
      '<span><b>Ask for some actions</b><small>Before actions that may share your information or make important changes</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button>' +
      '<button type="button" class="jd-pp-opt' + (def === 'always_ask' ? ' sel' : '') + '" data-def="always_ask">' +
      '<span><b>Always ask</b><small>Before any action</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button></div>' +
      '<div class="jd-pp-label">Web access defaults</div>' +
      '<div class="jd-pp-card">' +
      '<button type="button" class="jd-pp-opt' + (wdef === 'ask_some' ? ' sel' : '') + '" data-wdef="ask_some">' +
      '<span><b>Ask for some actions</b><small>When your information may be shared or the website is unfamiliar</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button>' +
      '<button type="button" class="jd-pp-opt' + (wdef === 'always_ask' ? ' sel' : '') + '" data-wdef="always_ask">' +
      '<span><b>Always ask</b><small>Ask before accessing any website</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button></div>' +
      '<div class="jd-pp-label">Manage permissions</div>' +
      '<div class="jd-pp-card">' +
      '<button type="button" class="jd-pp-row" id="jdPpOpenConns"><span>Connectors</span>' +
      '<span class="jd-pp-meta"><span id="jdPpConnCount">' + n + '</span> <span class="jd-pp-chev">\u203A</span></span></button>' +
      '<button type="button" class="jd-pp-row" id="jdPpOpenArtifacts"><span>Artifacts and scheduled tasks</span>' +
      '<span class="jd-pp-chev">\u203A</span></button></div>' +
      '<div style="height:24px"></div>';
  }

  function renderConnList() {
    var ids = connectedIds();
    var html = '<div class="jd-pp-head"><button type="button" class="jd-pp-back" onclick="jdPpGoMain()" aria-label="Back">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<h2>Connectors</h2></div><div style="height:8px"></div><div class="jd-pp-card">';
    if (!ids.length) {
      html += '<div class="jd-pp-empty">No connectors connected yet.</div>';
    } else {
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i], name = connName(id);
        html += '<button type="button" class="jd-pp-connrow" data-conn="' + esc(id) + '">' +
          iconFor(id, name) + '<span class="jd-pp-connname">' + esc(name) + '</span>' +
          '<span class="jd-pp-chev">\u203A</span></button>';
      }
    }
    return html + '</div><div style="height:24px"></div>';
  }

  function renderDetail(id) {
    var name = connName(id);
    var defs = permsFor(id);
    var html = '<div class="jd-pp-head"><button type="button" class="jd-pp-back" onclick="jdPpGoList()" aria-label="Back">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<h2>' + esc(name) + '</h2></div>';
    html += '<div class="jd-pp-label">Read permissions</div><div class="jd-pp-card">';
    for (var i = 0; i < defs.read.length; i++) {
      var r = defs.read[i];
      html += '<div class="jd-pp-permrow"><span class="jd-pp-permname">' + esc(r[1]) + '</span>' +
        ddHtml(id, r[0], effectivePerm(id, r[0])) + '</div>';
    }
    html += '</div><div class="jd-pp-label">Write and delete permissions</div><div class="jd-pp-card">';
    for (var j = 0; j < defs.write.length; j++) {
      var w = defs.write[j];
      html += '<div class="jd-pp-permrow"><span class="jd-pp-permname">' + esc(w[1]) + '</span>' +
        ddHtml(id, w[0], effectivePerm(id, w[0])) + '</div>';
    }
    html += '</div><button type="button" class="jd-pp-reset" id="jdPpReset">Reset to defaults</button>' +
      '<div style="height:24px"></div>';
    return html;
  }

  function renderArtifacts() {
    return '<div class="jd-pp-head"><button type="button" class="jd-pp-back" onclick="jdPpGoMain()" aria-label="Back">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 18l-6-6 6-6"/></svg></button>' +
      '<h2>Artifacts and scheduled tasks</h2></div><div style="height:8px"></div>' +
      '<div class="jd-pp-card"><div class="jd-pp-empty">No artifacts or scheduled tasks yet.</div></div>';
  }

  /* ---------- modal plumbing ---------- */
  function showView(which) {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      var views = m.querySelectorAll('.jd-pp-view');
      for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
      var map = { main: 'jdPpViewMain', list: 'jdPpViewList', detail: 'jdPpViewDetail', artifacts: 'jdPpViewArtifacts' };
      var v = m.querySelector('#' + (map[which] || 'jdPpViewMain'));
      if (v) v.classList.add('active');
      var sc = m.querySelector('.settings-home-scroll');
      if (sc) sc.scrollTop = 0;
    } catch (_) {}
  }

  function wireDropdowns(root) {
    try {
      var btns = root.querySelectorAll('.jd-pp-ddbtn');
      for (var i = 0; i < btns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var dd = btn.closest('.jd-pp-dd');
            var was = dd.classList.contains('open');
            var all = root.querySelectorAll('.jd-pp-dd.open');
            for (var k = 0; k < all.length; k++) all[k].classList.remove('open');
            if (!was) dd.classList.add('open');
          });
        })(btns[i]);
      }
      var opts = root.querySelectorAll('.jd-pp-menu button');
      for (var j = 0; j < opts.length; j++) {
        (function (opt) {
          opt.addEventListener('click', function (e) {
            e.stopPropagation();
            var dd = opt.closest('.jd-pp-dd');
            var btn = dd.querySelector('.jd-pp-ddbtn');
            var id = btn.getAttribute('data-id'), key = btn.getAttribute('data-key');
            var v = opt.getAttribute('data-v');
            setDetail(id, key, v);
            btn.querySelector('span').textContent = permLabel(v);
            dd.classList.remove('open');
          });
        })(opts[j]);
      }
    } catch (_) {}
  }

  function refreshMain() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      m.querySelector('#jdPpViewMain').innerHTML = renderMain();
      var api = window.jdConnectorPerm;
      var opts = m.querySelectorAll('#jdPpViewMain .jd-pp-opt[data-def]');
      for (var i = 0; i < opts.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            if (api) api.setDefault(btn.getAttribute('data-def'));
            else { try { localStorage.setItem('jdPermDefaults.connector', btn.getAttribute('data-def')); } catch (_) {} }
            refreshMain();
          });
        })(opts[i]);
      }
      var wopts = m.querySelectorAll('#jdPpViewMain .jd-pp-opt[data-wdef]');
      for (var j = 0; j < wopts.length; j++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            if (api) api.setWebDefault(btn.getAttribute('data-wdef'));
            else { try { localStorage.setItem('jdPermDefaults.web', btn.getAttribute('data-wdef')); } catch (_) {} }
            refreshMain();
          });
        })(wopts[j]);
      }
      var oc = m.querySelector('#jdPpOpenConns');
      if (oc) oc.addEventListener('click', function () { refreshList(); showView('list'); });
      var oa = m.querySelector('#jdPpOpenArtifacts');
      if (oa) oa.addEventListener('click', function () { refreshArtifacts(); showView('artifacts'); });
    } catch (_) {}
  }

  function refreshList() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      var el = m.querySelector('#jdPpViewList');
      el.innerHTML = renderConnList();
      var rows = el.querySelectorAll('.jd-pp-connrow');
      for (var i = 0; i < rows.length; i++) {
        (function (row) {
          row.addEventListener('click', function () {
            currentDetail = row.getAttribute('data-conn');
            refreshDetail();
            showView('detail');
          });
        })(rows[i]);
      }
    } catch (_) {}
  }

  function refreshDetail() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m || !currentDetail) return;
      var el = m.querySelector('#jdPpViewDetail');
      el.innerHTML = renderDetail(currentDetail);
      wireDropdowns(el);
      var rs = el.querySelector('#jdPpReset');
      if (rs) rs.addEventListener('click', function () {
        resetConnector(currentDetail);
        refreshDetail();
      });
    } catch (_) {}
  }

  function refreshArtifacts() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      m.querySelector('#jdPpViewArtifacts').innerHTML = renderArtifacts();
    } catch (_) {}
  }

  function buildModal() {
    if (document.getElementById(MODAL_ID)) { refreshMain(); return; }
    ensureCss();
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = MODAL_ID;
    ov.setAttribute('onclick', 'if(event.target===this)closeJdPermissions()');
    ov.innerHTML =
      '<section class="settings-home" role="dialog" aria-modal="true" aria-label="Permissions" style="max-width:560px">' +
      '<div class="settings-home-scroll">' +
      '<div class="jd-pp-view active" id="jdPpViewMain"></div>' +
      '<div class="jd-pp-view" id="jdPpViewList"></div>' +
      '<div class="jd-pp-view" id="jdPpViewDetail"></div>' +
      '<div class="jd-pp-view" id="jdPpViewArtifacts"></div>' +
      '</div></section>';
    document.body.appendChild(ov);
    /* close open dropdowns on outside tap */
    ov.addEventListener('click', function () {
      var all = ov.querySelectorAll('.jd-pp-dd.open');
      for (var k = 0; k < all.length; k++) all[k].classList.remove('open');
    });
    refreshMain();
  }

  window.openJdPermissions = function () {
    try {
      buildModal();
      var m = document.getElementById(MODAL_ID);
      if (m) { m.classList.add('open'); showView('main'); }
    } catch (_) {}
  };
  window.closeJdPermissions = function () {
    try {
      var m = document.getElementById(MODAL_ID);
      if (m) m.classList.remove('open');
    } catch (_) {}
  };
  window.jdPpGoMain = function () { refreshMain(); showView('main'); };
  window.jdPpGoList = function () { refreshList(); showView('list'); };

  /* Insert the "Permissions" row right after the Connectors settings row. */
  function insertRow() {
    try {
      if (document.getElementById(ROW_ID)) return true;
      var btns = document.querySelectorAll('button.settings-nav-row');
      var anchor = null;
      for (var i = 0; i < btns.length; i++) {
        var oc = btns[i].getAttribute('onclick') || '';
        if (oc.indexOf('__jdConnectors.open') !== -1) { anchor = btns[i]; break; }
      }
      if (!anchor || !anchor.parentNode) return false;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = ROW_ID;
      btn.className = 'settings-nav-row';
      btn.setAttribute('onclick', 'openJdPermissions()');
      btn.setAttribute('aria-label', 'Permissions');
      btn.innerHTML = '<i data-lucide="shield-check"></i><span>Permissions</span><i data-lucide="chevron-right"></i>';
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(btn); } catch (_) {} }
      return true;
    } catch (_) { return false; }
  }

  var done = false, obs = null;
  function tryInsert() {
    if (done) return;
    if (insertRow()) { done = true; if (obs) obs.disconnect(); }
  }
  try {
    tryInsert();
    if (!done && typeof MutationObserver === 'function') {
      obs = new MutationObserver(tryInsert);
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (_) {}
})();
