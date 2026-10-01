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
              // Async: fetch connector data, show activity, inject, then send.
              return (async function () {
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
