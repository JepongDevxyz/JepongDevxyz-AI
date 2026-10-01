/* ============================================================
   JepongDevxyz AI — Connectors panel (v3).
   Renders every connector card from REGISTRY (mirrors the
   server's _providers.js), with search, Connected/Available
   sections, per-provider setup guides, API-key forms, device
   notes, and the Custom Connector builder.
   ============================================================ */
(function () {
  'use strict';

  var MODAL_ID = 'jdConnectorsModal';
  var CSS_ID = 'jdConnectorsCss';

  var REGISTRY = [
    { id: 'browser', provider: null, kind: 'builtin', name: 'Browser', icon: 'globe', desc: 'Web search and page reading — built into the app' },
    { id: 'gmail', provider: 'google', kind: 'oauth', name: 'Gmail', icon: 'mail', desc: 'Read and search your emails' },
    { id: 'gcalendar', provider: 'google', kind: 'oauth', name: 'Google Calendar', icon: 'calendar-days', desc: 'See your upcoming schedule' },
    { id: 'gcontacts', provider: 'google', kind: 'oauth', name: 'Google Contacts', icon: 'contact', desc: 'Your contacts and people' },
    { id: 'gdrive', provider: 'google', kind: 'oauth', name: 'Google Drive', icon: 'folder', desc: 'Files and folders' },
    { id: 'gdocs', provider: 'google', kind: 'oauth', name: 'Google Docs', icon: 'file-text', desc: 'Documents' },
    { id: 'gsheets', provider: 'google', kind: 'oauth', name: 'Google Sheets', icon: 'table', desc: 'Spreadsheets' },
    { id: 'gslides', provider: 'google', kind: 'oauth', name: 'Google Slides', icon: 'presentation', desc: 'Presentations' },
    { id: 'gforms', provider: 'google', kind: 'oauth', name: 'Google Forms', icon: 'clipboard-list', desc: 'Forms and responses' },
    { id: 'gtasks', provider: 'google', kind: 'oauth', name: 'Google Tasks', icon: 'list-todo', desc: 'Task lists' },
    { id: 'spotify', provider: 'spotify', kind: 'oauth', name: 'Spotify', icon: 'music', desc: 'Your playlists and top tracks' },
    { id: 'github', provider: 'github', kind: 'github', name: 'GitHub', icon: 'github', desc: 'Repositories and code' },
    { id: 'facebook', provider: 'meta', kind: 'oauth', name: 'Facebook', icon: 'facebook', desc: 'Profile and pages' },
    { id: 'instagram', provider: 'meta', kind: 'oauth', name: 'Instagram', icon: 'instagram', desc: 'Profile and media' },
    { id: 'instagram_msgs', provider: 'meta', kind: 'oauth', name: 'Instagram Messages', icon: 'send', desc: 'Instagram direct messages' },
    { id: 'messenger', provider: 'meta', kind: 'oauth', name: 'Messenger', icon: 'message-circle', desc: 'Conversations' },
    { id: 'threads', provider: 'meta', kind: 'oauth', name: 'Threads', icon: 'at-sign', desc: 'Profile and posts' },
    { id: 'threads_msgs', provider: 'meta', kind: 'oauth', name: 'Threads Messages', icon: 'at-sign', desc: 'Threads direct messages' },
    { id: 'meta_biz', provider: 'meta', kind: 'oauth', name: 'Meta Business Manager', icon: 'briefcase', desc: 'Business assets and pages' },
    { id: 'meta_ads', provider: 'meta', kind: 'oauth', name: 'Meta Ads', icon: 'megaphone', desc: 'Ad accounts and campaigns' },
    { id: 'outlook_mail', provider: 'microsoft', kind: 'oauth', name: 'Outlook Mail', icon: 'inbox', desc: 'Outlook emails' },
    { id: 'outlook_calendar', provider: 'microsoft', kind: 'oauth', name: 'Outlook Calendar', icon: 'calendar-days', desc: 'Outlook calendar events' },
    { id: 'outlook_contacts', provider: 'microsoft', kind: 'oauth', name: 'Outlook Contacts', icon: 'contact', desc: 'Outlook people' },
    { id: 'dropbox', provider: 'dropbox', kind: 'oauth', name: 'Dropbox', icon: 'cloud', desc: 'Files and folders' },
    { id: 'box', provider: 'box', kind: 'oauth', name: 'Box', icon: 'box', desc: 'Files and folders' },
    { id: 'notion', provider: 'notion', kind: 'oauth', name: 'Notion', icon: 'notebook', desc: 'Pages and databases' },
    { id: 'slack', provider: 'slack', kind: 'oauth', name: 'Slack', icon: 'slack', desc: 'Channels and messages' },
    { id: 'figma', provider: 'figma', kind: 'oauth', name: 'Figma', icon: 'figma', desc: 'Design files' },
    { id: 'zoom', provider: 'zoom', kind: 'oauth', name: 'Zoom', icon: 'video', desc: 'Meetings' },
    { id: 'linear', provider: 'linear', kind: 'oauth', name: 'Linear', icon: 'activity', desc: 'Issues and projects' },
    { id: 'todoist', provider: 'todoist', kind: 'oauth', name: 'Todoist', icon: 'list-checks', desc: 'Tasks' },
    { id: 'asana', provider: 'asana', kind: 'oauth', name: 'Asana', icon: 'target', desc: 'Tasks and projects' },
    { id: 'canva', provider: 'canva', kind: 'oauth', name: 'Canva', icon: 'palette', desc: 'Designs' },
    { id: 'quickbooks', provider: 'quickbooks', kind: 'oauth', name: 'QuickBooks', icon: 'calculator', desc: 'Accounting and invoices' },
    { id: 'withings', provider: 'withings', kind: 'oauth', name: 'Withings', icon: 'watch', desc: 'Health metrics and devices' },
    { id: 'vercel', provider: 'vercel', kind: 'oauth', name: 'Vercel', icon: 'triangle', desc: 'Projects and deployments' },
    { id: 'plaid', provider: null, kind: 'apikey', name: 'Finances (Plaid)', icon: 'landmark', desc: 'Bank accounts and balances',
      fields: [{ key: 'client_id', label: 'Client ID' }, { key: 'secret', label: 'Secret', secret: true }, { key: 'access_token', label: 'Access token', secret: true }, { key: 'env', label: 'Environment', options: ['production', 'sandbox'] }] },
    { id: 'stripe', provider: null, kind: 'apikey', name: 'Stripe', icon: 'credit-card', desc: 'Payments and balances',
      fields: [{ key: 'secret_key', label: 'Secret key (sk_…)', secret: true }] },
    { id: 'shopify', provider: null, kind: 'apikey', name: 'Shopify', icon: 'shopping-bag', desc: 'Store products and orders',
      fields: [{ key: 'shop', label: 'Shop domain (mystore.myshopify.com)' }, { key: 'access_token', label: 'Admin API access token', secret: true }] },
    { id: 'calendly', provider: null, kind: 'apikey', name: 'Calendly', icon: 'calendar-clock', desc: 'Events and scheduling',
      fields: [{ key: 'api_token', label: 'Personal access token', secret: true }] },
    { id: 'klaviyo', provider: null, kind: 'apikey', name: 'Klaviyo', icon: 'send', desc: 'Email lists and campaigns',
      fields: [{ key: 'api_key', label: 'Private API key', secret: true }] },
    { id: 'highlevel', provider: null, kind: 'apikey', name: 'HighLevel', icon: 'trending-up', desc: 'Contacts and pipelines',
      fields: [{ key: 'api_key', label: 'API key', secret: true }] },
    { id: 'tessie', provider: null, kind: 'apikey', name: 'Tessie', icon: 'car', desc: 'Tesla fleet telemetry',
      fields: [{ key: 'api_token', label: 'API token', secret: true }] },
    { id: 'tailscale', provider: null, kind: 'apikey', name: 'Tailscale', icon: 'network', desc: 'Devices and tailnet',
      fields: [{ key: 'api_key', label: 'API access token', secret: true }] },
    { id: 'printify', provider: null, kind: 'apikey', name: 'Printify', icon: 'printer', desc: 'Shops and products',
      fields: [{ key: 'api_token', label: 'Personal access token', secret: true }] },
    { id: 'flightaware', provider: null, kind: 'apikey', name: 'FlightAware', icon: 'plane', desc: 'Live flight status and tracking',
      fields: [{ key: 'api_key', label: 'AeroAPI key', secret: true }] },
    { id: 'device_calendar', provider: null, kind: 'device', name: 'Calendar', icon: 'calendar-days', desc: 'From this device' },
    { id: 'call_log', provider: null, kind: 'device', name: 'Call Log', icon: 'phone-call', desc: 'From this device' },
    { id: 'device_contacts', provider: null, kind: 'device', name: 'Contacts', icon: 'contact', desc: 'From this device' },
    { id: 'health_connect', provider: null, kind: 'device', name: 'Health Connect', icon: 'heart-pulse', desc: 'From this device' },
    { id: 'device_messages', provider: null, kind: 'device', name: 'Messages', icon: 'message-square', desc: 'From this device' },
    { id: 'notifications', provider: null, kind: 'device', name: 'Notifications', icon: 'bell', desc: 'From this device' },
    { id: 'phone_dialer', provider: null, kind: 'device', name: 'Phone dialer', icon: 'phone', desc: 'From this device' },
    { id: 'cs_granola', provider: null, kind: 'customsuggest', name: 'Granola', icon: 'notebook-pen', desc: 'AI notepad — via Custom Connector', hint: 'Granola has no public API yet. If they publish one, add it here as a Custom Connector.' },
    { id: 'cs_function_health', provider: null, kind: 'customsuggest', name: 'Function Health', icon: 'heart-pulse', desc: 'Lab results — via Custom Connector', hint: 'Function Health has no public API. If they publish one, add it here as a Custom Connector.' },
    { id: 'cs_healthex', provider: null, kind: 'customsuggest', name: 'HealthEx', icon: 'stethoscope', desc: 'Health data — via Custom Connector', hint: 'Add the HealthEx API base URL and your API key as a Custom Connector.' },
    { id: 'cs_lovable', provider: null, kind: 'customsuggest', name: 'Lovable', icon: 'heart', desc: 'App builder — via Custom Connector', hint: 'Lovable has no public API. If they publish one, add it here as a Custom Connector.' },
    { id: 'cs_replit', provider: null, kind: 'customsuggest', name: 'Replit', icon: 'terminal', desc: 'Repls — via Custom Connector', hint: 'Replit has no public personal API. If they publish one, add it here as a Custom Connector.' },
    { id: 'cs_opentable', provider: null, kind: 'customsuggest', name: 'OpenTable', icon: 'utensils', desc: 'Reservations — via Custom Connector', hint: 'OpenTable has no public API. If they publish one, add it here as a Custom Connector.' },
    { id: 'cs_peloton', provider: null, kind: 'customsuggest', name: 'Peloton', icon: 'bike', desc: 'Workouts — via Custom Connector', hint: 'Peloton has no official public API; a Custom Connector can target a community API.' },
    { id: 'cs_hue', provider: null, kind: 'customsuggest', name: 'Philips Hue', icon: 'lightbulb', desc: 'Smart lights — via Custom Connector', hint: 'Hue lives on your local network — point a Custom Connector at your bridge IP (http://<bridge-ip>/api/<username>).' },
    { id: 'cs_zapier', provider: null, kind: 'customsuggest', name: 'Zapier', icon: 'zap', desc: 'Automations — via Custom Connector', hint: 'Create a Zap with a Webhooks trigger, then add its webhook URL here as a Custom Connector.' },
    { id: 'cs_evernote', provider: null, kind: 'customsuggest', name: 'Evernote', icon: 'notebook', desc: 'Notes — via Custom Connector', hint: 'Evernote closed new OAuth apps; use a developer token via a Custom Connector.' }
  ];

  var SETUP_GUIDES = {
    google: { label: 'Google', steps: [
      'Go to the Google Cloud Console and create a project.',
      'APIs & Services > OAuth consent screen — set it up (External).',
      'Enable the APIs you need (Gmail, Calendar, Drive…).',
      'Credentials > Create Credentials > OAuth client ID > Web application.',
      'Add this Authorized redirect URI:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    spotify: { label: 'Spotify', steps: [
      'Go to developer.spotify.com/dashboard and log in.',
      'Create an app (any name/description).',
      'Open Settings and add this Redirect URI:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    meta: { label: 'Meta', steps: [
      'Go to developers.facebook.com and create an app.',
      'Add the Facebook Login product (and the products you need: Instagram, Threads, Ads).',
      'Under Facebook Login > Settings, add this Valid OAuth Redirect URI:', '{redirect}',
      'Paste the App ID and App secret below, then Save.' ] },
    microsoft: { label: 'Microsoft', steps: [
      'Go to portal.azure.com > Microsoft Entra ID > App registrations.',
      'New registration > Web redirect URI:', '{redirect}',
      'API permissions > add Microsoft Graph delegated: Mail.Read, Calendars.Read, Contacts.Read, User.Read, offline_access.',
      'Grant admin consent, then Certificates & secrets > New client secret.',
      'Paste the Application (client) ID and secret below, then Save.' ] },
    dropbox: { label: 'Dropbox', steps: [
      'Go to dropbox.com/developers/apps and create an app (Scoped access).',
      'Under Permissions, check files.metadata.read.',
      'Add this Redirect URI:', '{redirect}',
      'Paste the App key and App secret below, then Save.' ] },
    box: { label: 'Box', steps: [
      'Go to app.box.com/developers/console and create a Custom App (User Authentication / OAuth 2.0).',
      'Set the Redirect URI to:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    notion: { label: 'Notion', steps: [
      'Go to notion.so/my-integrations and create an integration.',
      'Under OAuth settings, add this Redirect URI:', '{redirect}',
      'Paste the OAuth client ID and client secret below, then Save.' ] },
    slack: { label: 'Slack', steps: [
      'Go to api.slack.com/apps and create an app (From scratch).',
      'OAuth & Permissions > add this Redirect URL:', '{redirect}',
      'Under Scopes > Bot Token Scopes add users:read and channels:read.',
      'Paste the Client ID and Client secret below, then Save.' ] },
    figma: { label: 'Figma', steps: [
      'Go to figma.com/developers/apps and create an app.',
      'Set the Redirect URI to:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    zoom: { label: 'Zoom', steps: [
      'Go to marketplace.zoom.us > Develop > Build App > OAuth.',
      'Add this Redirect URL:', '{redirect}',
      'Add the user:read scope and activate the app.',
      'Paste the Client ID and Client secret below, then Save.' ] },
    linear: { label: 'Linear', steps: [
      'Go to linear.app/settings/api and create an OAuth application.',
      'Set the Redirect URI to:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    todoist: { label: 'Todoist', steps: [
      'Go to developer.todoist.com/appconsole.html and create an app.',
      'Set the OAuth redirect URL to:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    asana: { label: 'Asana', steps: [
      'Go to app.asana.com/0/my-apps and create an app.',
      'Under OAuth, add this Redirect URL:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    canva: { label: 'Canva', steps: [
      'Go to canva.com/developers and create an integration.',
      'Under Authentication, add this Redirect URL:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] },
    quickbooks: { label: 'QuickBooks', steps: [
      'Go to developer.intuit.com/appconsole and create an app.',
      'Under Keys & credentials, add this Redirect URI:', '{redirect}',
      'Select the com.intuit.quickbooks.accounting scope.',
      'Paste the Client ID and Client secret below, then Save.' ] },
    withings: { label: 'Withings', steps: [
      'Go to developer.withings.com and register an application.',
      'Set the Callback URL to:', '{redirect}',
      'Paste the Client ID and Consumer secret below, then Save.' ] },
    vercel: { label: 'Vercel', steps: [
      'Go to vercel.com/dashboard > Settings > Integrations > Create Integration.',
      'Set the Redirect URL to:', '{redirect}',
      'Paste the Client ID and Client secret below, then Save.' ] }
  };

  /* ---------------- utils ---------------- */

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function token() {
    try {
      var fn = window.JDCloudAuthToken;
      if (typeof fn !== 'function') return Promise.resolve('');
      return Promise.resolve(fn()).catch(function () { return ''; });
    } catch (_) { return Promise.resolve(''); }
  }

  function api(path, opts) {
    opts = opts || {};
    return token().then(function (t) {
      var headers = { 'Content-Type': 'application/json' };
      if (t) headers.Authorization = 'Bearer ' + t;
      return fetch(path, {
        method: opts.method || 'GET',
        headers: headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: 'same-origin'
      }).then(function (r) {
        return r.json().catch(function () { return null; }).then(function (d) {
          return { ok: r.ok, status: r.status, data: d };
        });
      });
    });
  }

  function toast(msg) {
    try {
      if (typeof window.jdToast === 'function') { window.jdToast(msg); return; }
      var t = document.createElement('div');
      t.className = 'jd-conn-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.classList.add('show'); }, 30);
      setTimeout(function () { t.classList.remove('show'); setTimeout(function(){ t.remove(); }, 400); }, 2600);
    } catch (e) {}
  }

  /* ---------------- styles ---------------- */

  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    var s = document.createElement('style');
    s.id = CSS_ID;
    s.textContent =
      '.jd-conn-modal{position:relative;width:min(560px,94vw);max-height:88dvh;display:flex;flex-direction:column;' +
      'background:var(--card-bg,#17171c);color:var(--text-color,inherit);border-radius:20px;' +
      'border:1px solid var(--border-color,rgba(128,128,128,.25));overflow:hidden}' +
      '.jd-conn-head{display:flex;align-items:flex-start;gap:10px;padding:18px 18px 10px}' +
      '.jd-conn-head h2{margin:0;font-size:1.15rem}' +
      '.jd-conn-head p{margin:4px 0 0;font-size:.82rem;opacity:.65}' +
      '.jd-conn-x{margin-left:auto;border:0;background:transparent;color:inherit;font-size:1.3rem;cursor:pointer;opacity:.7}' +
      '.jd-conn-search{margin:0 18px 6px;position:relative}' +
      '.jd-conn-search input{width:100%;box-sizing:border-box;padding:10px 14px 10px 38px;border-radius:14px;' +
      'border:1px solid var(--border-color,rgba(128,128,128,.25));background:rgba(128,128,128,.08);color:inherit;font-size:.85rem}' +
      '.jd-conn-search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:16px;height:16px;opacity:.55}' +
      '.jd-conn-list{overflow-y:auto;padding:6px 14px 10px;display:flex;flex-direction:column;gap:10px}' +
      '.jd-conn-sec{font-size:.78rem;font-weight:700;opacity:.6;text-transform:uppercase;letter-spacing:.06em;margin:8px 2px -2px}' +
      '.jd-conn-card{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;' +
      'border:1px solid var(--border-color,rgba(128,128,128,.22));background:rgba(128,128,128,.06)}' +
      '.jd-conn-card.disabled{opacity:.55}' +
      '.jd-conn-ic{width:40px;height:40px;flex:0 0 40px;display:flex;align-items:center;justify-content:center;' +
      'border-radius:12px;background:rgba(128,128,128,.14)}' +
      '.jd-conn-ic svg{width:22px;height:22px}' +
      '.jd-conn-meta{flex:1;min-width:0}' +
      '.jd-conn-meta strong{display:flex;align-items:center;gap:8px;font-size:.95rem}' +
      '.jd-conn-meta small{display:block;font-size:.78rem;opacity:.65;margin-top:2px}' +
      '.jd-conn-dot{width:8px;height:8px;border-radius:50%;background:#888;display:inline-block;flex:0 0 8px}' +
      '.jd-conn-dot.on{background:#22c55e;box-shadow:0 0 6px #22c55e}' +
      '.jd-conn-label{font-size:.75rem;opacity:.7;font-weight:400}' +
      '.jd-conn-badge{font-size:.68rem;font-weight:700;padding:3px 10px;border-radius:999px;' +
      'background:rgba(34,197,94,.15);color:#4ade80;flex:0 0 auto}' +
      '.jd-conn-btn{flex:0 0 auto;padding:8px 16px;border-radius:999px;border:1px solid var(--border-color,rgba(128,128,128,.3));' +
      'background:transparent;color:inherit;font-weight:600;font-size:.82rem;cursor:pointer}' +
      '.jd-conn-btn.primary{background:#f59e0b;border-color:#f59e0b;color:#111}' +
      '.jd-conn-btn:disabled{opacity:.5;cursor:default}' +
      '.jd-conn-setup{padding:10px 12px;border-radius:12px;background:rgba(128,128,128,.1);font-size:.8rem}' +
      '.jd-conn-setup ol{margin:6px 0 10px;padding-left:20px;line-height:1.55}' +
      '.jd-conn-setup code{font-size:.72rem;word-break:break-all;background:rgba(128,128,128,.18);' +
      'padding:2px 6px;border-radius:6px;display:inline-block;margin:2px 0}' +
      '.jd-conn-setup input,.jd-conn-setup select,.jd-conn-setup textarea{width:100%;box-sizing:border-box;margin:4px 0;' +
      'padding:8px 10px;border-radius:10px;border:1px solid var(--border-color,rgba(128,128,128,.3));' +
      'background:transparent;color:inherit;font-size:.82rem;font-family:inherit}' +
      '.jd-conn-setup textarea{resize:vertical;min-height:52px}' +
      '.jd-conn-row2{display:flex;gap:8px}.jd-conn-row2>*{flex:1;min-width:0}' +
      '.jd-conn-foot{padding:12px 18px 18px;border-top:1px solid var(--border-color,rgba(128,128,128,.18))}' +
      '.jd-conn-foot button{width:100%;padding:10px;border-radius:12px;border:1px solid var(--border-color,rgba(128,128,128,.3));' +
      'background:transparent;color:inherit;font-weight:600;cursor:pointer}' +
      '.jd-conn-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(20px);' +
      'background:#222;color:#fff;padding:10px 18px;border-radius:999px;font-size:.85rem;opacity:0;' +
      'transition:all .3s;z-index:99999;pointer-events:none;max-width:90vw;text-align:center}' +
      '.jd-conn-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}';
    document.head.appendChild(s);
  }

  /* ---------------- state ---------------- */

  var statusCache = null;
  var statusLoading = false;
  var searchTerm = '';

  function loadStatus(force) {
    if (statusLoading) return Promise.resolve(statusCache);
    if (statusCache && !force) return Promise.resolve(statusCache);
    statusLoading = true;
    return api('/api/connectors/status').then(function (r) {
      statusLoading = false;
      if (r.ok && r.data) {
        statusCache = r.data;
        try {
          window.__jdConnectorStatus = {
            connectors: r.data.connectors || null,
            custom: (r.data.custom || []).map(function (c) { return { id: c.id, name: c.name }; })
          };
        } catch (e) {}
      }
      renderCards();
      return statusCache;
    }).catch(function () { statusLoading = false; return statusCache; });
  }

  /* ---------------- panel ---------------- */

  function setupGuideHtml(provider) {
    var g = SETUP_GUIDES[provider];
    if (!g) return '';
    var redirect = location.origin + '/api/connectors/callback';
    var steps = g.steps.map(function (s) {
      var parts = s.split('{redirect}');
      var html = esc(parts[0]);
      for (var i = 1; i < parts.length; i++) html += '<code>' + esc(redirect) + '</code>' + esc(parts[i]);
      return '<li>' + html + '</li>';
    }).join('');
    return '<div class="jd-conn-setup" data-setup="' + provider + '" hidden>' +
      '<div><b>One-time owner setup</b> for ' + esc(g.label) + ':</div>' +
      '<ol>' + steps + '</ol>' +
      '<input type="text" id="jdCfgId_' + provider + '" placeholder="Client ID" autocomplete="off">' +
      '<input type="password" id="jdCfgSecret_' + provider + '" placeholder="Client secret" autocomplete="off">' +
      '<button type="button" class="jd-conn-btn primary" data-act="config-save" data-provider="' + provider + '">Save</button>' +
      '</div>';
  }

  function apikeySetupHtml(c) {
    var inputs = (c.fields || []).map(function (f) {
      var fid = 'jdKey_' + c.id + '_' + f.key;
      if (f.options) {
        return '<select id="' + fid + '">' + f.options.map(function (o) {
          return '<option value="' + esc(o) + '">' + esc(o) + '</option>';
        }).join('') + '</select>';
      }
      return '<input type="' + (f.secret ? 'password' : 'text') + '" id="' + fid + '" placeholder="' + esc(f.label) + '" autocomplete="off">';
    }).join('');
    return '<div class="jd-conn-setup" data-setup="key-' + c.id + '" hidden>' +
      '<div>Enter your <b>' + esc(c.name) + '</b> credentials — they are verified before saving.</div>' +
      inputs +
      '<button type="button" class="jd-conn-btn primary" data-act="key-save" data-id="' + c.id + '">Connect</button></div>';
  }

  function cardHtml(c) {
    var st = statusCache && statusCache.connectors ? statusCache.connectors[c.id] : null;
    var prov = statusCache && statusCache.providers ? statusCache.providers[c.provider] : null;
    var connected = !!(st && st.connected);
    var label = st && st.label ? '<span class="jd-conn-label">' + esc(st.label) + '</span>' : '';
    var btn, extra = '';
    if (connected && c.kind !== 'builtin') {
      btn = '<button type="button" class="jd-conn-btn" data-act="disconnect" data-id="' + c.id + '">Disconnect</button>';
    } else if (c.kind === 'builtin') {
      btn = '<span class="jd-conn-badge">On</span>';
    } else if (c.kind === 'device') {
      btn = '<button type="button" class="jd-conn-btn" disabled>Mobile only</button>';
      extra = '<div class="jd-conn-setup"><div>This connector reads data on your phone and needs the mobile app.</div></div>';
    } else if (c.kind === 'customsuggest') {
      btn = '<button type="button" class="jd-conn-btn primary" data-act="cs-setup" data-id="' + c.id + '">Set up</button>';
    } else if (c.kind === 'oauth') {
      if (!prov || !prov.configured) {
        btn = '<button type="button" class="jd-conn-btn" data-act="setup" data-id="' + c.id + '">Set up</button>';
        extra = setupGuideHtml(c.provider);
      } else {
        btn = '<button type="button" class="jd-conn-btn primary" data-act="oauth" data-id="' + c.id + '">Connect</button>';
      }
    } else if (c.kind === 'github') {
      if (prov && prov.configured) {
        btn = '<button type="button" class="jd-conn-btn primary" data-act="github-oauth" data-id="github">Connect</button>';
      } else {
        btn = '<button type="button" class="jd-conn-btn" disabled>Not configured</button>';
        extra = '<div class="jd-conn-setup"><div>The owner needs to set ' +
          '<code>GITHUB_OAUTH_CLIENT_ID</code> and <code>GITHUB_OAUTH_CLIENT_SECRET</code> on Vercel first.</div></div>';
      }
    } else if (c.kind === 'apikey') {
      btn = '<button type="button" class="jd-conn-btn primary" data-act="keysetup" data-id="' + c.id + '">Connect</button>';
      extra = apikeySetupHtml(c);
    } else {
      btn = '<button type="button" class="jd-conn-btn primary" data-act="oauth" data-id="' + c.id + '">Connect</button>';
    }
    var cls = 'jd-conn-card' + (c.kind === 'device' ? ' disabled' : '') + '" data-card="' + c.id + '" data-name="' + esc(c.name.toLowerCase()) + '"';
    return '<div class="' + cls + '">' +
      '<span class="jd-conn-ic"><i data-lucide="' + c.icon + '"></i></span>' +
      '<span class="jd-conn-meta"><strong><span class="jd-conn-dot' + (connected ? ' on' : '') + '"></span>' +
      esc(c.name) + label + '</strong><small>' + esc(c.desc) + '</small></span>' +
      btn + '</div>' + extra;
  }

  function customSectionHtml() {
    var customs = (statusCache && statusCache.custom) || [];
    var cards = customs.map(function (cc) {
      return '<div class="jd-conn-card" data-card="custom-' + esc(cc.id) + '" data-name="' + esc(String(cc.name || '').toLowerCase()) + '">' +
        '<span class="jd-conn-ic"><i data-lucide="plug-zap"></i></span>' +
        '<span class="jd-conn-meta"><strong><span class="jd-conn-dot on"></span>' + esc(cc.name) + '</strong>' +
        '<small>' + esc(cc.description || cc.base_url) + '</small></span>' +
        '<button type="button" class="jd-conn-btn" data-act="custom-test" data-id="' + esc(cc.id) + '">Test</button>' +
        '<button type="button" class="jd-conn-btn" data-act="custom-del" data-id="' + esc(cc.id) + '">Delete</button>' +
        '</div>';
    }).join('');
    return '<div class="jd-conn-sec" data-sec="custom">Custom connectors</div>' + cards +
      '<div class="jd-conn-setup" data-setup="custom-new" hidden>' +
      '<div id="jdCcHint" style="margin-bottom:6px;opacity:.75"></div>' +
      '<input type="text" id="jdCcName" placeholder="Name (e.g. My API)" maxlength="60">' +
      '<input type="text" id="jdCcDesc" placeholder="Description (optional)" maxlength="200">' +
      '<input type="text" id="jdCcBase" placeholder="Base URL (https://api.example.com)" autocomplete="off">' +
      '<div class="jd-conn-row2"><select id="jdCcAuth">' +
      '<option value="bearer">Bearer token</option><option value="header">API key header</option>' +
      '<option value="xapikey">x-api-key</option><option value="query">Query param</option>' +
      '<option value="basic">Basic (user:pass)</option><option value="none">No auth</option></select>' +
      '<input type="text" id="jdCcHeader" placeholder="Header name (if API key header)"></div>' +
      '<input type="password" id="jdCcValue" placeholder="Token / key value" autocomplete="off">' +
      '<input type="text" id="jdCcTest" placeholder="Test path (e.g. /status)" autocomplete="off">' +
      '<button type="button" class="jd-conn-btn primary" data-act="custom-save">Save custom connector</button></div>' +
      '<button type="button" class="jd-conn-btn" data-act="custom-new" style="align-self:center">+ Add custom connector</button>';
  }

  function isConnected(c) {
    var st = statusCache && statusCache.connectors ? statusCache.connectors[c.id] : null;
    return !!(st && st.connected);
  }

  function renderCards() {
    var list = document.querySelector('#' + MODAL_ID + ' .jd-conn-list');
    if (!list) return;
    var connected = REGISTRY.filter(isConnected);
    var available = REGISTRY.filter(function (c) { return !isConnected(c); });
    var html = '<div class="jd-conn-sec" data-sec="connected">Connected</div>' +
      (connected.length ? connected.map(cardHtml).join('') : '<div style="font-size:.82rem;opacity:.6;padding:0 4px">Nothing connected yet.</div>') +
      '<div class="jd-conn-sec" data-sec="available">Available</div>' +
      available.map(cardHtml).join('') +
      customSectionHtml();
    list.innerHTML = html;
    applySearch();
    if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(list); } catch (e) {} }
  }

  function applySearch() {
    var list = document.querySelector('#' + MODAL_ID + ' .jd-conn-list');
    if (!list) return;
    var q = searchTerm.trim().toLowerCase();
    var cards = list.querySelectorAll('.jd-conn-card');
    var visibleInSec = {};
    cards.forEach(function (card) {
      var show = !q || (card.getAttribute('data-name') || '').indexOf(q) !== -1;
      card.style.display = show ? '' : 'none';
      var sec = card.previousElementSibling;
      while (sec && !sec.hasAttribute('data-sec')) sec = sec.previousElementSibling;
      var key = sec ? sec.getAttribute('data-sec') : '';
      if (show) visibleInSec[key] = (visibleInSec[key] || 0) + 1;
    });
    list.querySelectorAll('[data-sec]').forEach(function (sec) {
      sec.style.display = (!q || visibleInSec[sec.getAttribute('data-sec')]) ? '' : 'none';
    });
  }

  function buildModal() {
    if (document.getElementById(MODAL_ID)) return;
    ensureCss();
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = MODAL_ID;
    ov.innerHTML =
      '<div class="jd-conn-modal" role="dialog" aria-label="Connectors">' +
      '<div class="jd-conn-head"><div><h2>Connectors</h2>' +
      '<p>Link your accounts so the AI can use them. Tokens are stored securely, never on this device.</p></div>' +
      '<button type="button" class="jd-conn-x" aria-label="Close">&times;</button></div>' +
      '<div class="jd-conn-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input type="text" id="jdConnSearch" placeholder="Search connectors" autocomplete="off"></div>' +
      '<div class="jd-conn-list"></div>' +
      '<div class="jd-conn-foot"><button type="button" id="jdOpenPlugins">Coding plugins (Superpowers)</button></div>' +
      '</div>';
    ov.addEventListener('click', function (e) {
      if (e.target === ov) close();
    });
    ov.querySelector('.jd-conn-x').addEventListener('click', close);
    ov.querySelector('#jdConnSearch').addEventListener('input', function (e) {
      searchTerm = e.target.value || '';
      applySearch();
    });
    ov.querySelector('#jdOpenPlugins').addEventListener('click', function () {
      try { if (window.JDPlugins && typeof window.JDPlugins.open === 'function') window.JDPlugins.open(); } catch (e) {}
    });
    ov.querySelector('.jd-conn-list').addEventListener('click', onCardClick);
    document.body.appendChild(ov);
  }

  function onCardClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn || btn.disabled) return;
    var act = btn.getAttribute('data-act');
    var id = btn.getAttribute('data-id');
    if (act === 'disconnect') return doDisconnect(id, btn);
    if (act === 'oauth') return doOAuth(id, btn);
    if (act === 'github-oauth') return doGithubOAuth(btn);
    if (act === 'setup') {
      var c = REGISTRY.find(function (x) { return x.id === id; });
      if (c) toggleSetup(c.provider);
      return;
    }
    if (act === 'keysetup') return toggleSetup('key-' + id);
    if (act === 'key-save') return doKeySave(id, btn);
    if (act === 'cs-setup') return doCustomSuggest(id);
    if (act === 'config-save') return doConfigSave(btn.getAttribute('data-provider'), btn);
    if (act === 'custom-new') return toggleSetup('custom-new');
    if (act === 'custom-save') return doCustomSave(btn);
    if (act === 'custom-test') return doCustomTest(id, btn);
    if (act === 'custom-del') return doCustomDel(id, btn);
  }

  function toggleSetup(key) {
    var list = document.querySelector('#' + MODAL_ID + ' .jd-conn-list');
    if (!list) return;
    var panel = list.querySelector('[data-setup="' + key + '"]');
    if (panel) panel.hidden = !panel.hidden;
  }

  function open() {
    buildModal();
    var ov = document.getElementById(MODAL_ID);
    ov.classList.add('open');
    renderCards();
    loadStatus(true);
  }

  function close() {
    var ov = document.getElementById(MODAL_ID);
    if (ov) ov.classList.remove('open');
  }

  window.__jdConnectors = { open: open, close: close, refresh: function () { loadStatus(true); },
    registry: REGISTRY,
    /* Trigger the same connect flow the card buttons use (for the Browse view). */
    connect: function (id) {
      var c = REGISTRY.find(function (x) { return x.id === id; });
      if (!c) return false;
      var fakeBtn = { disabled: false, textContent: 'Connect' };
      if (c.kind === 'oauth') { doOAuth(id, fakeBtn); return true; }
      if (c.kind === 'github') { doGithubOAuth(fakeBtn); return true; }
      if (c.kind === 'apikey') { close(); open(); toggleSetup('key-' + id); return true; }
      if (c.kind === 'customsuggest') { doCustomSuggest(id); return true; }
      if (c.kind === 'builtin') return true;
      return false;
    } };

  /* ---------------- actions ---------------- */

  function doDisconnect(id, btn) {
    btn.disabled = true;
    api('/api/connectors/disconnect', { method: 'POST', body: { connector: id } }).then(function (r) {
      btn.disabled = false;
      if (r.ok) { toast('Disconnected.'); loadStatus(true); }
      else toast((r.data && r.data.error) || 'Could not disconnect.');
    });
  }

  function doOAuth(id, btn) {
    var c = REGISTRY.find(function (x) { return x.id === id; });
    if (!c) return;
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = '…';
    api('/api/connectors/auth-url?provider=' + encodeURIComponent(c.provider) + '&connector=' + encodeURIComponent(c.id))
      .then(function (r) {
        btn.disabled = false;
        btn.textContent = old;
        if (!r.ok || !r.data) { toast((r.data && r.data.error) || 'Could not start sign-in.'); return; }
        if (r.data.configured === false) { toggleSetup(c.provider); loadStatus(true); return; }
        if (r.data.url) trackPopup(window.open(r.data.url, 'jd_oauth', 'width=520,height=680,menubar=no,toolbar=no'));
        else toast((r.data && r.data.error) || 'Could not start sign-in.');
      });
  }

  function doGithubOAuth(btn) {
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = '…';
    api('/api/connectors/github-auth').then(function (r) {
      btn.disabled = false;
      btn.textContent = old;
      if (!r.ok || !r.data) { toast('Could not start GitHub sign-in.'); return; }
      if (r.data.configured === false) { toast('GitHub OAuth is not configured on the server.'); return; }
      if (r.data.url) trackPopup(window.open(r.data.url, 'jd_oauth', 'width=520,height=680,menubar=no,toolbar=no'));
      else toast('Could not start GitHub sign-in.');
    });
  }

  function doConfigSave(provider, btn) {
    var idEl = document.getElementById('jdCfgId_' + provider);
    var secEl = document.getElementById('jdCfgSecret_' + provider);
    var cid = idEl ? idEl.value.trim() : '';
    var sec = secEl ? secEl.value.trim() : '';
    if (!cid || !sec) { toast('Enter the Client ID and secret.'); return; }
    btn.disabled = true;
    api('/api/connectors/config', { method: 'POST', body: { provider: provider, client_id: cid, client_secret: sec } })
      .then(function (r) {
        btn.disabled = false;
        if (r.ok) {
          toast('Saved. You can now connect.');
          if (secEl) secEl.value = '';
          loadStatus(true);
        } else {
          toast((r.data && r.data.error) || 'Could not save.');
        }
      });
  }

  function doKeySave(id, btn) {
    var c = REGISTRY.find(function (x) { return x.id === id; });
    if (!c || !c.fields) return;
    var body = { connector: id };
    for (var i = 0; i < c.fields.length; i++) {
      var f = c.fields[i];
      var el = document.getElementById('jdKey_' + id + '_' + f.key);
      var v = el ? el.value.trim() : '';
      if (!v && !f.options) { toast('Enter ' + f.label + '.'); return; }
      body[f.key] = v || (f.options ? f.options[0] : '');
    }
    btn.disabled = true;
    api('/api/connectors/store', { method: 'POST', body: body }).then(function (r) {
      btn.disabled = false;
      if (r.ok) {
        toast(c.name + ' connected.');
        for (var i = 0; i < c.fields.length; i++) {
          var f = c.fields[i];
          if (!f.secret) continue;
          var el = document.getElementById('jdKey_' + id + '_' + f.key);
          if (el) el.value = '';
        }
        loadStatus(true);
      } else {
        toast((r.data && r.data.error) || 'The credentials were rejected.');
      }
    });
  }

  function doCustomSuggest(id) {
    var c = REGISTRY.find(function (x) { return x.id === id; });
    toggleSetup('custom-new');
    if (!c) return;
    var hint = document.getElementById('jdCcHint');
    var name = document.getElementById('jdCcName');
    var desc = document.getElementById('jdCcDesc');
    if (hint) hint.textContent = c.hint || '';
    if (name && !name.value) name.value = c.name;
    if (desc && !desc.value) desc.value = 'Via Custom Connector';
    if (name) name.focus();
  }

  function doCustomSave(btn) {
    var v = function (id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var body = {
      name: v('jdCcName'), description: v('jdCcDesc'), base_url: v('jdCcBase'),
      auth_type: v('jdCcAuth') || 'bearer', auth_header: v('jdCcHeader'),
      auth_value: v('jdCcValue'), test_path: v('jdCcTest') || '/'
    };
    if (!body.name || !body.base_url) { toast('Name and base URL are required.'); return; }
    btn.disabled = true;
    api('/api/connectors/custom', { method: 'POST', body: body }).then(function (r) {
      btn.disabled = false;
      if (r.ok) { toast('Custom connector saved.'); loadStatus(true); }
      else toast((r.data && r.data.error) || 'Could not save.');
    });
  }

  function doCustomTest(id, btn) {
    btn.disabled = true;
    var old = btn.textContent;
    btn.textContent = '…';
    api('/api/connectors/proxy', { method: 'POST', body: { connector: 'custom', custom_id: id, path: '' } })
      .then(function (r) {
        btn.disabled = false;
        btn.textContent = old;
        toast(r.ok ? 'Working — the API answered.' : ((r.data && r.data.error) || 'Test failed.'));
      });
  }

  function doCustomDel(id, btn) {
    btn.disabled = true;
    api('/api/connectors/custom', { method: 'DELETE', body: { id: id } }).then(function (r) {
      btn.disabled = false;
      if (r.ok) { toast('Deleted.'); loadStatus(true); }
      else toast((r.data && r.data.error) || 'Could not delete.');
    });
  }

  // Popup result -> refresh the panel (handles both postMessage shapes).
  var oauthPopups = [];
  function trackPopup(p) { if (p) oauthPopups.push(p); }
  window.addEventListener('message', function (e) {
    try {
      if (e.origin !== location.origin) return;
      var d = e.data || {};
      var ok = false;
      if (typeof d.jdConnector === 'string') {
        if (d.ok) toast('Connected.');
        ok = true;
      } else if (d.type === 'jd-connector-connected') {
        toast('Connected.');
        ok = true;
      }
      if (ok) {
        oauthPopups.forEach(function (p) { try { p.close(); } catch (_) {} });
        oauthPopups = [];
        loadStatus(true);
      }
    } catch (_) {}
  });

  /* ---------------- settings row rewrite ---------------- */

  function rewriteRow() {
    try {
      var btns = document.querySelectorAll('button.settings-nav-row');
      for (var i = 0; i < btns.length; i++) {
        var b = btns[i];
        var oc = b.getAttribute('onclick') || '';
        if (oc.indexOf('JDPlugins') === -1) continue;
        var strong = b.querySelector('strong');
        var done = strong && strong.textContent.trim() === 'Connectors';
        if (!done) {
          if (strong) strong.textContent = 'Connectors';
          var small = b.querySelector('small');
          if (small) small.textContent = 'Gmail, Calendar, Spotify, GitHub and more';
          var svg = b.querySelector('svg');
          if (svg) {
            var ic = document.createElement('i');
            ic.setAttribute('data-lucide', 'cable');
            svg.replaceWith(ic);
          }
          b.setAttribute('onclick', 'window.__jdConnectors.open()');
          if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(b); } catch (e) {} }
        }
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---------------- chat context hook ---------------- */

  function hookContext() {
    try {
      if (typeof window.getChatPluginContext !== 'function') return false;
      if (window.__jdConnectorsCtxHooked) return true;
      var orig = window.getChatPluginContext;
      window.getChatPluginContext = function () {
        var ctx = orig.apply(this, arguments) || {};
        try {
          if (window.__jdConnectorStatus) ctx.connectors = window.__jdConnectorStatus;
        } catch (e) {}
        return ctx;
      };
      window.__jdConnectorsCtxHooked = true;
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- init ---------------- */

  function init() {
    rewriteRow();
    hookContext();
    try {
      var mo = new MutationObserver(function () { rewriteRow(); });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    token().then(function (t) { if (t) loadStatus(false); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
