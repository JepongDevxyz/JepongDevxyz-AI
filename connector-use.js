/* ============================================================
   JepongDevxyz AI — Connector Use Bridge (runtime, 2026-10-01)
   Jepong: when the user asks about a connected service, fetch
   live data via /api/connectors/proxy BEFORE the chat request,
   show an accurate activity status (like the Muse app), and
   inject the data as context so the AI answers with real data.

   - Wraps window.fetch for POST /api/chat (same pattern as
     credits.js). Chains safely if credits.js already wrapped it.
   - Intent detection: explicit service-name keywords only, to
     avoid false triggers. Read ops only (no params needed).
   - Connection check: uses window.__jdConnectorStatus cache from
     connectors.js; skips silently when unknown/disconnected.
   - Activity: own #jdConnectorActivity rows AFTER #activeAiIndicator (video style).
   - Permission: Allow/Deny prompt (like the Muse app) before first use
     of each connector per session, with an "Always allow" option.
     Mode is respected automatically — body.jd-pure-mode hides
     #activeAiIndicator via CSS, and we also skip DOM work when
     window.jdPureModeOn() is true.
   - Fail-open: any error falls through to the original request
     untouched. Never blocks chat.

   Additive only; idempotent.
   ============================================================ */
(function () {
  'use strict';

  /* connector, op, activity label, keyword regex (explicit names only).
     Covers every connector with a read op, so each one gets an accurate
     Muse-style activity status when the user asks about it. */
  var INTENTS = [
    { connector: 'gmail', op: 'unread', label: 'Checking Gmail',
      re: /\bgmail\b/i },
    { connector: 'gcalendar', op: 'upcoming', label: 'Checking Google Calendar',
      re: /\bgoogle\s*calendar\b/i },
    { connector: 'gcontacts', op: 'list', label: 'Checking Google Contacts',
      re: /\bgoogle\s*contacts\b/i },
    { connector: 'gdrive', op: 'recent', label: 'Checking Google Drive',
      re: /\bgoogle\s*drive\b/i },
    { connector: 'gdocs', op: 'list', label: 'Checking Google Docs',
      re: /\bgoogle\s*docs\b/i },
    { connector: 'gsheets', op: 'list', label: 'Checking Google Sheets',
      re: /\bgoogle\s*sheets\b/i },
    { connector: 'gslides', op: 'list', label: 'Checking Google Slides',
      re: /\bgoogle\s*slides\b/i },
    { connector: 'gforms', op: 'list', label: 'Checking Google Forms',
      re: /\bgoogle\s*forms\b/i },
    { connector: 'gtasks', op: 'tasks', label: 'Checking Google Tasks',
      re: /\bgoogle\s*tasks\b/i },
    { connector: 'outlook_mail', op: 'unread', label: 'Checking Outlook Mail',
      re: /\boutlook\s*mail\b/i },
    { connector: 'outlook_calendar', op: 'upcoming', label: 'Checking Outlook Calendar',
      re: /\boutlook\s*calendar\b/i },
    { connector: 'outlook_contacts', op: 'list', label: 'Checking Outlook Contacts',
      re: /\boutlook\s*contacts\b/i },
    { connector: 'spotify', op: 'playlists', label: 'Checking Spotify',
      re: /\bspotify\b/i },
    { connector: 'github', op: 'repos', label: 'Accessing GitHub',
      re: /\bgithub\b/i },
    { connector: 'facebook', op: 'profile', label: 'Checking Facebook',
      re: /\bfacebook\b/i },
    { connector: 'instagram', op: 'profile', label: 'Checking Instagram',
      re: /\binstagram\b(?!\s*messages)/i },
    { connector: 'instagram_msgs', op: 'profile', label: 'Checking Instagram Messages',
      re: /\binstagram\s*messages\b/i },
    { connector: 'messenger', op: 'profile', label: 'Checking Messenger',
      re: /\bmessenger\b/i },
    { connector: 'threads', op: 'profile', label: 'Checking Threads',
      re: /\bthreads\b(?!\s*messages)/i },
    { connector: 'meta_biz', op: 'businesses', label: 'Checking Meta Business',
      re: /\bmeta\s*business\b|\bbusiness\s*manager\b/i },
    { connector: 'meta_ads', op: 'accounts', label: 'Checking Meta Ads',
      re: /\bmeta\s*ads\b/i },
    { connector: 'dropbox', op: 'files', label: 'Checking Dropbox',
      re: /\bdropbox\b/i },
    { connector: 'box', op: 'items', label: 'Checking Box',
      re: /\bbox\s*(files|drive)?\b/i },
    { connector: 'notion', op: 'search', label: 'Searching Notion',
      re: /\bnotion\b/i },
    { connector: 'slack', op: 'channels', label: 'Checking Slack',
      re: /\bslack\b/i },
    { connector: 'figma', op: 'me', label: 'Checking Figma',
      re: /\bfigma\b/i },
    { connector: 'zoom', op: 'meetings', label: 'Checking Zoom',
      re: /\bzoom\b/i },
    { connector: 'linear', op: 'issues', label: 'Checking Linear',
      re: /\blinear\b/i },
    { connector: 'todoist', op: 'tasks', label: 'Checking Todoist',
      re: /\btodoist\b/i },
    { connector: 'asana', op: 'me', label: 'Checking Asana',
      re: /\basana\b/i },
    { connector: 'canva', op: 'me', label: 'Checking Canva',
      re: /\bcanva\b/i },
    { connector: 'quickbooks', op: 'company', label: 'Checking QuickBooks',
      re: /\bquickbooks\b/i },
    { connector: 'withings', op: 'devices', label: 'Checking Withings',
      re: /\bwithings\b/i },
    { connector: 'vercel', op: 'projects', label: 'Checking Vercel',
      re: /\bvercel\b/i },
    { connector: 'plaid', op: 'balance', label: 'Checking bank accounts',
      re: /\bplaid\b|\bbank\s*accounts\b/i },
    { connector: 'stripe', op: 'balance', label: 'Checking Stripe',
      re: /\bstripe\b/i },
    { connector: 'shopify', op: 'products', label: 'Checking Shopify',
      re: /\bshopify\b/i },
    { connector: 'calendly', op: 'events', label: 'Checking Calendly',
      re: /\bcalendly\b/i },
    { connector: 'klaviyo', op: 'lists', label: 'Checking Klaviyo',
      re: /\bklaviyo\b/i },
    { connector: 'highlevel', op: 'me', label: 'Checking GoHighLevel',
      re: /\bgohighlevel\b|\bhighlevel\b/i },
    { connector: 'tessie', op: 'vehicles', label: 'Checking Tessie',
      re: /\btessie\b/i },
    { connector: 'tailscale', op: 'devices', label: 'Checking Tailscale',
      re: /\btailscale\b/i },
    { connector: 'printify', op: 'shops', label: 'Checking Printify',
      re: /\bprintify\b/i },
    { connector: 'flightaware', op: 'track', label: 'Tracking flight',
      re: /\bflightaware\b|\btrack\s*(my\s*)?flight\b/i },
  ];

  /* Same background-message prefixes as credits.js — never intercept. */
  var BG_PREFIXES = [
    'Summarize this conversation for context preservation.',
    'Create a concise 3 to 6 word chat title.',
    'Look at the attached image carefully'
  ];

  function isBackground(msg) {
    if (typeof msg !== 'string') return true;
    for (var i = 0; i < BG_PREFIXES.length; i++) {
      if (msg.indexOf(BG_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function detectIntent(message) {
    if (typeof message !== 'string' || !message) return null;
    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].re.test(message)) return INTENTS[i];
    }
    return null;
  }

  function isConnected(connectorId) {
    try {
      var st = window.__jdConnectorStatus;
      if (st && st.connectors && st.connectors[connectorId]) {
        return !!st.connectors[connectorId].connected;
      }
    } catch (_) {}
    return false;
  }

  function pureModeOn() {
    try { return window.jdPureModeOn && window.jdPureModeOn(); }
    catch (_) { return false; }
  }

  /* Video-style rows in their OWN container, inserted AFTER the normal
     #activeAiIndicator. 100% additive: the existing activity statuses are
     never touched, reordered, or restyled. */
  var CSS_ID = 'jdConnectorActivityCss';
  var CONTAINER_ID = 'jdConnectorActivity';

  /* present participle -> past tense (video pattern) */
  var TENSE_MAP = [
    [/^Checking\b/i, 'Checked'], [/^Searching\b/i, 'Searched'],
    [/^Accessing\b/i, 'Accessed'], [/^Inspecting\b/i, 'Inspected'],
    [/^Listing\b/i, 'Listed'], [/^Fetching\b/i, 'Fetched'],
    [/^Reading\b/i, 'Read'], [/^Loading\b/i, 'Loaded'],
    [/^Connecting\b/i, 'Connected'], [/^Updating\b/i, 'Updated'],
    [/^Testing\b/i, 'Tested'], [/^Reviewing\b/i, 'Reviewed'],
    [/^Tracking\b/i, 'Tracked'],
  ];
  function toPastTense(label) {
    var str = String(label || '').replace(/\.*\s*$/, '');
    for (var i = 0; i < TENSE_MAP.length; i++) {
      if (TENSE_MAP[i][0].test(str)) return str.replace(TENSE_MAP[i][0], TENSE_MAP[i][1]);
    }
    return str;
  }
  function toRunning(label) { return String(label || '').replace(/\.*\s*$/, ''); }

  function ensureCss() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var st = document.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '#' + CONTAINER_ID + '{background:transparent!important;border:none!important;' +
        'padding:2px 0 6px!important;margin:0!important}' +
        '#' + CONTAINER_ID + ' .jd-ca-row{display:flex!important;align-items:flex-start!important;' +
        'gap:10px!important;padding:7px 2px!important}' +
        '#' + CONTAINER_ID + ' .jd-ca-icon{width:22px!important;height:22px!important;flex:0 0 22px!important;' +
        'margin-top:1px!important;opacity:.85!important;color:#9a9a9a!important}' +
        '#' + CONTAINER_ID + ' .jd-ca-icon svg{width:20px!important;height:20px!important;display:block}' +
        '#' + CONTAINER_ID + ' .jd-ca-label{font-size:15px!important;line-height:1.45!important;' +
        'font-weight:400!important;color:#d7d7d7!important}' +
        '#' + CONTAINER_ID + ' .jd-ca-row.running .jd-ca-label{color:#ececec!important}' +
        'body.jd-pure-mode #' + CONTAINER_ID + '{display:none!important}';
      document.head.appendChild(st);
    } catch (_) {}
  }

  function ensureContainer() {
    try {
      ensureCss();
      var c = document.getElementById(CONTAINER_ID);
      if (c) return c;
      var anchor = document.getElementById('activeAiIndicator');
      c = document.createElement('div');
      c.id = CONTAINER_ID;
      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(c, anchor.nextSibling);
      } else if (document.body) {
        document.body.appendChild(c);
      } else { return null; }
      return c;
    } catch (_) { return null; }
  }

  var ICON_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>';

  function showActivity(label) {
    if (pureModeOn()) return null;
    try {
      var c = ensureContainer();
      if (!c) return null;
      var id = 'jdca-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      var row = document.createElement('div');
      row.className = 'jd-ca-row running';
      row.dataset.caId = id;
      var icon = document.createElement('div');
      icon.className = 'jd-ca-icon';
      icon.innerHTML = ICON_SVG;
      var lab = document.createElement('div');
      lab.className = 'jd-ca-label';
      lab.textContent = toRunning(label);
      row.appendChild(icon);
      row.appendChild(lab);
      c.appendChild(row);
      return id;
    } catch (_) { return null; }
  }
  function completeActivity(id, label) {
    if (!id || pureModeOn()) return;
    try {
      var row = document.querySelector('#' + CONTAINER_ID + ' [data-ca-id="' + id + '"]');
      if (!row) return;
      row.classList.remove('running');
      row.classList.add('done');
      var lab = row.querySelector('.jd-ca-label');
      if (lab) lab.textContent = toPastTense(label);
    } catch (_) {}
  }

  function formatData(intent, data) {
    var lines = [];
    try {
      var items = Array.isArray(data) ? data : [data];
      items.slice(0, 10).forEach(function (it, idx) {
        if (it && typeof it === 'object') {
          var parts = [];
          ['subject', 'title', 'name', 'summary'].forEach(function (k) {
            if (it[k]) parts.push(it[k]);
          });
          ['from', 'author', 'start', 'date', 'updated', 'state'].forEach(function (k) {
            if (it[k]) parts.push('(' + k + ': ' + it[k] + ')');
          });
          if (it.url) parts.push(it.url);
          lines.push((idx + 1) + '. ' + (parts.join(' ') || JSON.stringify(it).slice(0, 120)));
        } else if (it !== null && it !== undefined) {
          lines.push((idx + 1) + '. ' + String(it).slice(0, 120));
        }
      });
    } catch (_) {}
    return lines.join('\n');
  }

  function injectContext(body, intent, dataText) {
    var header = '[Live data from ' + intent.label + ' — fetched just now]';
    var ctx = header + '\n' + dataText + '\n\n';
    if (typeof body.message === 'string') {
      body.message = ctx + body.message;
    }
    return body;
  }

  /* ---------- Allow / Deny permission system (Muse-app style) ---------- */
  var PERM_CSS_ID = 'jdConnectorPermCss';
  var PERM_MODAL_ID = 'jdConnectorPermModal';

  /* Permission resolution order:
     1. Per-connector override from Permissions settings (jdPermConnector.<id>)
     2. Legacy always-allow checkbox (jdConnectorAlways.<id>)
     3. Global connector default (jdPermDefaults.connector): ask_some | always_ask */
  function resolvePermission(connector) {
    try {
      var per = window.localStorage.getItem('jdPermConnector.' + connector);
      if (per === 'allow' || per === 'ask' || per === 'deny') return per;
      if (window.localStorage.getItem('jdConnectorAlways.' + connector) === '1') return 'allow';
      var def = window.localStorage.getItem('jdPermDefaults.connector') || 'ask_some';
      if (def === 'always_ask') return 'ask';
    } catch (_) {}
    return 'ask'; // ask_some default: prompt (first use offers always-allow)
  }
  function setAlwaysAllowed(connector) {
    try { window.localStorage.setItem('jdConnectorAlways.' + connector, '1'); } catch (_) {}
  }
  /* Exposed for the Permissions settings page. */
  window.jdConnectorPerm = {
    get: resolvePermission,
    setConnector: function (id, v) {
      try {
        if (v === 'inherit' || !v) window.localStorage.removeItem('jdPermConnector.' + id);
        else window.localStorage.setItem('jdPermConnector.' + id, v);
      } catch (_) {}
    },
    getDefault: function () {
      try { return window.localStorage.getItem('jdPermDefaults.connector') || 'ask_some'; }
      catch (_) { return 'ask_some'; }
    },
    setDefault: function (v) {
      try { window.localStorage.setItem('jdPermDefaults.connector', v); } catch (_) {}
    },
    getWebDefault: function () {
      try { return window.localStorage.getItem('jdPermDefaults.web') || 'ask_some'; }
      catch (_) { return 'ask_some'; }
    },
    setWebDefault: function (v) {
      try { window.localStorage.setItem('jdPermDefaults.web', v); } catch (_) {}
    }
  };

  function ensurePermCss() {
    try {
      if (document.getElementById(PERM_CSS_ID)) return;
      var st = document.createElement('style');
      st.id = PERM_CSS_ID;
      st.textContent =
        '#' + PERM_MODAL_ID + '{position:fixed!important;inset:0!important;z-index:99999!important;' +
        'display:flex!important;align-items:flex-end!important;justify-content:center!important;' +
        'background:rgba(0,0,0,.55)!important;padding:0!important;box-sizing:border-box!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-sheet{background:#1e1e20!important;border-radius:24px 24px 0 0!important;' +
        'width:100%!important;max-width:520px!important;padding:22px 20px calc(20px + env(safe-area-inset-bottom))!important;' +
        'box-shadow:0 -12px 48px rgba(0,0,0,.5)!important;box-sizing:border-box!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-head{display:flex!important;gap:14px!important;align-items:flex-start!important;margin-bottom:14px!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-icon{width:52px!important;height:52px!important;border-radius:14px!important;' +
        'background:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;' +
        'flex:0 0 52px!important;overflow:hidden!important;font-weight:700!important;font-size:22px!important;color:#111!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-icon svg{width:32px!important;height:32px!important}' +
        '#' + PERM_MODAL_ID + ' h3{margin:2px 0 0!important;font-size:19px!important;font-weight:700!important;' +
        'line-height:1.3!important;color:#fff!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-desc{margin:0 0 14px!important;font-size:15px!important;' +
        'line-height:1.5!important;color:#d4d4d4!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-details{background:#2a2a2d!important;border-radius:16px!important;' +
        'padding:16px!important;margin-bottom:18px!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-details div{font-size:14px!important;line-height:1.9!important;color:#d4d4d4!important;' +
        'overflow-wrap:anywhere!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-details b{color:#fff!important;font-weight:600!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-always{display:flex!important;align-items:center!important;gap:9px!important;' +
        'margin-bottom:16px!important;font-size:14px!important;color:#a1a1a1!important;cursor:pointer!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-always input{width:17px!important;height:17px!important;accent-color:#3b82f6!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-btn{width:100%!important;padding:15px!important;border-radius:16px!important;' +
        'font-size:16px!important;font-weight:700!important;cursor:pointer!important;border:none!important;margin-bottom:10px!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-btn.allow{background:#3b82f6!important;color:#fff!important}' +
        '#' + PERM_MODAL_ID + ' .jd-perm-btn.deny{background:#2a2a2d!important;color:#fff!important;margin-bottom:0!important}';
      document.head.appendChild(st);
    } catch (_) {}
  }

  var CONNECTOR_NAMES = {
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
    printify: 'Printify', flightaware: 'FlightAware'
  };
  function connectorName(id) {
    return CONNECTOR_NAMES[id] || String(id).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }
  /* Human-readable action description per op (for the details card). */
  var OP_DESCRIPTIONS = {
    unread: 'Read unread emails', upcoming: 'Read upcoming events', list: 'List items',
    recent: 'Read recent files', tasks: 'Read tasks', playlists: 'Read playlists',
    repos: 'List repositories', profile: 'Read profile', businesses: 'List businesses',
    accounts: 'List ad accounts', files: 'List files', items: 'List items',
    search: 'Search content', channels: 'List channels', me: 'Read account info',
    meetings: 'List meetings', issues: 'List issues', company: 'Read company info',
    devices: 'List devices', projects: 'List projects', balance: 'Read balance',
    products: 'List products', events: 'List events', lists: 'List mailing lists',
    vehicles: 'List vehicles', shops: 'List shops', track: 'Track flight',
    'pr-files': 'Read PR files', 'create-issue': 'Create issue', 'create-pr': 'Create pull request',
    merge: 'Merge pull request', branches: 'List branches', file: 'Read file',
    commit: 'Commit file', review: 'Review pull request', comment: 'Post comment', prs: 'List pull requests'
  };
  function opDescription(op) { return OP_DESCRIPTIONS[op] || String(op); }
  function connectorInitial(name) {
    var w = String(name || '?').trim();
    return w.charAt(0).toUpperCase();
  }

  /* Effective read permission for the bridge: detail-level (from the
     connector's detail page) wins, then connector-level, then default. */
  function effectiveReadPerm(connector) {
    try {
      var d = window.jdConnectorPermDetail;
      if (d && typeof d.get === 'function' && typeof d.firstReadKey === 'function') {
        var key = d.firstReadKey(connector);
        var v = d.get(connector, key);
        /* A stored detail value always wins over connector-level. */
        try {
          var stored = window.localStorage.getItem('jdPermDetail.' + connector + '.' + key);
          if (stored === 'allow' || stored === 'ask' || stored === 'deny') return stored;
        } catch (_) {}
        if (v === 'deny') return 'deny';
        if (v === 'allow') return 'allow';
      }
    } catch (_) {}
    return resolvePermission(connector);
  }

  /* Returns a Promise<boolean>: true = allowed, false = denied. */
  function requestPermission(intent) {
    var perm = effectiveReadPerm(intent.connector);
    if (perm === 'allow') return Promise.resolve(true);
    if (perm === 'deny') return Promise.resolve(false);
    return new Promise(function (resolve) {
      try {
        ensurePermCss();
        var old = document.getElementById(PERM_MODAL_ID);
        if (old && old.parentNode) old.parentNode.removeChild(old);
        var name = connectorName(intent.connector);
        var action = opDescription(intent.op);
        var ov = document.createElement('div');
        ov.id = PERM_MODAL_ID;
        ov.innerHTML =
          '<div class="jd-perm-sheet" role="dialog" aria-modal="true" aria-label="Connector permission">' +
          '<div class="jd-perm-head"><div class="jd-perm-icon">' + connectorInitial(name) + '</div>' +
          '<h3>Allow JepongDevxyz AI to perform this action on your ' + name + ' account?</h3></div>' +
          '<p class="jd-perm-desc">Your assistant wants to <b style="color:#fff">' + action.toLowerCase() +
          '</b> on your ' + name + ' account.</p>' +
          '<div class="jd-perm-details">' +
          '<div><b>Action:</b> ' + action + '</div>' +
          '<div><b>Connector:</b> ' + name + '</div>' +
          '<div><b>Access:</b> Read-only for this request</div>' +
          '</div>' +
          '<label class="jd-perm-always"><input type="checkbox" id="jdPermAlways"> Always allow ' + name + '</label>' +
          '<button class="jd-perm-btn allow" id="jdPermAllow" type="button">Allow</button>' +
          '<button class="jd-perm-btn deny" id="jdPermDeny" type="button">Deny</button>' +
          '</div>';
        document.body.appendChild(ov);
        var done = function (allowed) {
          try {
            if (allowed && ov.querySelector('#jdPermAlways').checked) setAlwaysAllowed(intent.connector);
          } catch (_) {}
          try { if (ov.parentNode) ov.parentNode.removeChild(ov); } catch (_) {}
          resolve(allowed);
        };
        ov.querySelector('#jdPermAllow').addEventListener('click', function () { done(true); });
        ov.querySelector('#jdPermDeny').addEventListener('click', function () { done(false); });
      } catch (_) { resolve(false); }
    });
  }

  function installBridge() {
    if (typeof window.fetch !== 'function') return;
    if (window.fetch.__jdConnectorBridge) return;
    var origFetch = window.fetch.bind(window);

    var bridged = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if (url.indexOf('/api/chat') !== -1 && method === 'POST' &&
            init && typeof init.body === 'string') {
          var body = null;
          try { body = JSON.parse(init.body); } catch (_) { body = null; }
          // Only user-initiated chat messages (same classification as credits.js).
          if (body && !body.action && typeof body.message === 'string' &&
              !body.customApiProfile && !isBackground(body.message)) {
            var intent = detectIntent(body.message);
            if (intent && isConnected(intent.connector)) {
              // Async: ask Allow/Deny first (Muse-app style), then fetch,
              // show activity, inject, and send.
              return (async function () {
                var allowed = await requestPermission(intent);
                if (!allowed) return origFetch(input, init); // Deny: send as-is
                var actId = showActivity(intent.label);
                try {
                  var res = await origFetch('/api/connectors/proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ connector: intent.connector, op: intent.op })
                  });
                  if (res && res.ok) {
                    var payload = await res.json().catch(function () { return null; });
                    var data = payload && payload.data;
                    if (data !== undefined && data !== null) {
                      var text = formatData(intent, data);
                      if (text) {
                        var newBody = JSON.parse(init.body);
                        injectContext(newBody, intent, text);
                        init = Object.assign({}, init, { body: JSON.stringify(newBody) });
                      }
                    }
                    // Video style: mark the activity completed (past tense).
                    completeActivity(actId, intent.label);
                  }
                } catch (_) { /* fail-open: send original */ }
                return origFetch(input, init);
              })();
            }
          }
        }
      } catch (_) { /* fall through */ }
      return origFetch(input, init);
    };
    bridged.__jdConnectorBridge = true;
    // Preserve credits.js marker if it wrapped first.
    if (origFetch.__jdCreditsGated) bridged.__jdCreditsGated = true;
    window.fetch = bridged;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installBridge, { once: true });
  } else {
    installBridge();
  }
  // Re-install after other patches (load order safety).
  setTimeout(installBridge, 1500);
})();
