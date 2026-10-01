/* ============================================================
   JepongDevxyz AI — Permissions settings page (runtime, 2026-10-01)
   Jepong: "Lagyan mo rin ng ganyan ang JepongDevxyz AI"
   (Muse-app style Permissions: Connector defaults + per-connector
   Allow/Ask/Deny management.)

   - Adds a "Permissions" row in Settings (after the Connectors row).
   - Permissions panel:
       Connector defaults: "Ask for some actions" | "Always ask"
       Manage permissions > Connectors: per-connector Allow / Ask / Deny
   - Storage: localStorage
       jdPermDefaults.connector = 'ask_some' | 'always_ask'
       jdPermConnector.<id>     = 'allow' | 'ask' | 'deny' (absent = inherit)
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

  function ensureCss() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var st = document.createElement('style');
      st.id = CSS_ID;
      st.textContent =
        '#' + MODAL_ID + ' .jd-pp-label{font-size:13px!important;color:#8e8e93!important;' +
        'margin:18px 4px 8px!important;font-weight:400!important}' +
        '#' + MODAL_ID + ' .jd-pp-label:first-of-type{margin-top:6px!important}' +
        '#' + MODAL_ID + ' .jd-pp-card{background:#1e1e20!important;border-radius:16px!important;' +
        'overflow:hidden!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt{width:100%!important;display:flex!important;align-items:center!important;' +
        'justify-content:space-between!important;gap:12px!important;padding:14px 16px!important;' +
        'background:transparent!important;border:none!important;cursor:pointer!important;text-align:left!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt + .jd-pp-opt{border-top:1px solid rgba(255,255,255,.08)!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt b{display:block!important;font-size:15px!important;font-weight:500!important;color:#fff!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt small{display:block!important;font-size:13px!important;color:#8e8e93!important;margin-top:2px!important}' +
        '#' + MODAL_ID + ' .jd-pp-check{color:#fff!important;font-size:18px!important;flex:0 0 auto!important;visibility:hidden!important}' +
        '#' + MODAL_ID + ' .jd-pp-opt.sel .jd-pp-check{visibility:visible!important}' +
        '#' + MODAL_ID + ' .jd-pp-row{width:100%!important;display:flex!important;align-items:center!important;' +
        'justify-content:space-between!important;padding:14px 16px!important;background:transparent!important;' +
        'border:none!important;cursor:pointer!important;color:#fff!important;font-size:15px!important}' +
        '#' + MODAL_ID + ' .jd-pp-row + .jd-pp-row{border-top:1px solid rgba(255,255,255,.08)!important}' +
        '#' + MODAL_ID + ' .jd-pp-row .jd-pp-count{color:#8e8e93!important;font-size:14px!important;margin-right:6px!important}' +
        '#' + MODAL_ID + ' .jd-pp-row .jd-pp-chev{color:#8e8e93!important}' +
        '#' + MODAL_ID + ' .jd-pp-conn{display:flex!important;align-items:center!important;gap:12px!important;' +
        'padding:12px 16px!important}' +
        '#' + MODAL_ID + ' .jd-pp-conn + .jd-pp-conn{border-top:1px solid rgba(255,255,255,.08)!important}' +
        '#' + MODAL_ID + ' .jd-pp-conn-ic{width:38px!important;height:38px!important;border-radius:10px!important;' +
        'background:#fff!important;color:#111!important;display:flex!important;align-items:center!important;' +
        'justify-content:center!important;font-weight:700!important;font-size:17px!important;flex:0 0 38px!important}' +
        '#' + MODAL_ID + ' .jd-pp-conn-name{flex:1!important;font-size:15px!important;color:#fff!important}' +
        '#' + MODAL_ID + ' .jd-pp-conn-perm{display:flex!important;align-items:center!important;gap:6px!important;' +
        'font-size:14px!important;color:#8e8e93!important;background:transparent!important;border:none!important;' +
        'cursor:pointer!important;padding:6px 4px!important}' +
        '#' + MODAL_ID + ' .jd-pp-menu{position:absolute!important;right:0!important;top:calc(100% + 4px)!important;' +
        'background:#2c2c2e!important;border-radius:12px!important;overflow:hidden!important;min-width:110px!important;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.5)!important;display:none!important;z-index:10!important}' +
        '#' + MODAL_ID + ' .jd-pp-dd.open .jd-pp-menu{display:block!important}' +
        '#' + MODAL_ID + ' .jd-pp-menu button{display:block!important;width:100%!important;text-align:left!important;' +
        'padding:11px 14px!important;background:transparent!important;border:none!important;color:#fff!important;' +
        'font-size:14px!important;cursor:pointer!important}' +
        '#' + MODAL_ID + ' .jd-pp-menu button:active{background:rgba(255,255,255,.1)!important}' +
        '#' + MODAL_ID + ' .jd-pp-view{display:none}' +
        '#' + MODAL_ID + ' .jd-pp-view.active{display:block}';
      document.head.appendChild(st);
    } catch (_) {}
  }

  var NAMES = null;
  function connName(id) {
    try {
      if (window.jdConnectorPerm && false) return id;
    } catch (_) {}
    if (!NAMES) {
      NAMES = {
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
    }
    return NAMES[id] || String(id).replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function permApi() {
    if (window.jdConnectorPerm) return window.jdConnectorPerm;
    /* Fallback if connector-use.js did not load yet. */
    return {
      get: function () { return 'ask'; },
      setConnector: function (id, v) {
        try {
          if (!v || v === 'inherit') localStorage.removeItem('jdPermConnector.' + id);
          else localStorage.setItem('jdPermConnector.' + id, v);
        } catch (_) {}
      },
      getDefault: function () {
        try { return localStorage.getItem('jdPermDefaults.connector') || 'ask_some'; }
        catch (_) { return 'ask_some'; }
      },
      setDefault: function (v) {
        try { localStorage.setItem('jdPermDefaults.connector', v); } catch (_) {}
      },
      getWebDefault: function () {
        try { return localStorage.getItem('jdPermDefaults.web') || 'ask_some'; }
        catch (_) { return 'ask_some'; }
      },
      setWebDefault: function (v) {
        try { localStorage.setItem('jdPermDefaults.web', v); } catch (_) {}
      }
    };
  }

  function connectedIds() {
    var ids = [];
    try {
      var st = window.__jdConnectorStatus;
      var map = st && (st.connectors || st);
      if (map) {
        for (var k in map) {
          if (Object.prototype.hasOwnProperty.call(map, k) &&
              map[k] && map[k].connected) ids.push(k);
        }
      }
    } catch (_) {}
    return ids.sort();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderDefaults() {
    var api = permApi();
    var def = api.getDefault();
    var wdef = api.getWebDefault();
    return '<div class="jd-pp-label">Connector defaults</div>' +
      '<div class="jd-pp-card">' +
      '<button type="button" class="jd-pp-opt' + (def === 'ask_some' ? ' sel' : '') +
      '" data-def="ask_some"><span><b>Ask for some actions</b>' +
      '<small>Before actions that may share your information or make important changes</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button>' +
      '<button type="button" class="jd-pp-opt' + (def === 'always_ask' ? ' sel' : '') +
      '" data-def="always_ask"><span><b>Always ask</b>' +
      '<small>Before any action</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button>' +
      '</div>' +
      '<div class="jd-pp-label">Web access defaults</div>' +
      '<div class="jd-pp-card">' +
      '<button type="button" class="jd-pp-opt' + (wdef === 'ask_some' ? ' sel' : '') +
      '" data-wdef="ask_some"><span><b>Ask for some actions</b>' +
      '<small>Before actions that may share your information or make important changes</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button>' +
      '<button type="button" class="jd-pp-opt' + (wdef === 'always_ask' ? ' sel' : '') +
      '" data-wdef="always_ask"><span><b>Always ask</b>' +
      '<small>Before any action</small></span>' +
      '<span class="jd-pp-check">\u2713</span></button>' +
      '</div>' +
      '<div class="jd-pp-label">Manage permissions</div>' +
      '<div class="jd-pp-card">' +
      '<button type="button" class="jd-pp-row" id="jdPpOpenConns"><span>Connectors</span>' +
      '<span><span class="jd-pp-count" id="jdPpConnCount"></span><span class="jd-pp-chev">\u203A</span></span></button>' +
      '<button type="button" class="jd-pp-row" id="jdPpOpenArtifacts" style="border-top:1px solid rgba(255,255,255,.08)">' +
      '<span>Artifacts and scheduled tasks</span>' +
      '<span><span class="jd-pp-chev">\u203A</span></span></button>' +
      '</div>';
  }

  function permLabel(v) {
    if (v === 'allow') return 'Allow';
    if (v === 'deny') return 'Deny';
    return 'Ask';
  }

  function renderConnList() {
    var ids = connectedIds();
    var html = '<div class="jd-pp-label">Connectors</div><div class="jd-pp-card">';
    if (!ids.length) {
      html += '<div class="jd-pp-conn"><span class="jd-pp-conn-name" style="color:#8e8e93">' +
        'No connectors connected yet.</span></div>';
    } else {
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        var name = connName(id);
        var cur = 'inherit';
        try {
          cur = localStorage.getItem('jdPermConnector.' + id) || 'inherit';
        } catch (_) {}
        var label = cur === 'inherit' ? 'Ask' : permLabel(cur);
        html += '<div class="jd-pp-conn" data-conn="' + esc(id) + '">' +
          '<div class="jd-pp-conn-ic">' + esc(name.charAt(0).toUpperCase()) + '</div>' +
          '<div class="jd-pp-conn-name">' + esc(name) + '</div>' +
          '<div class="jd-pp-dd" style="position:relative">' +
          '<button type="button" class="jd-pp-conn-perm" data-cur="' + esc(cur) + '">' +
          '<span>' + esc(label) + '</span><span style="font-size:11px">\u25BE</span></button>' +
          '<div class="jd-pp-menu">' +
          '<button type="button" data-v="allow">Allow</button>' +
          '<button type="button" data-v="ask">Ask</button>' +
          '<button type="button" data-v="deny">Deny</button>' +
          '</div></div></div>';
      }
    }
    html += '</div>';
    return html;
  }

  function showView(which) {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      var views = m.querySelectorAll('.jd-pp-view');
      for (var i = 0; i < views.length; i++) views[i].classList.remove('active');
      var sel = which === 'list' ? '#jdPpViewList' : (which === 'artifacts' ? '#jdPpViewArtifacts' : '#jdPpViewMain');
      var v = m.querySelector(sel);
      if (v) v.classList.add('active');
      var title = m.querySelector('#jdPpTitle');
      if (title) title.textContent = which === 'list' ? 'Connectors' :
        (which === 'artifacts' ? 'Artifacts and scheduled tasks' : 'Permissions');
      var back = m.querySelector('#jdPpBack');
      if (back) back.setAttribute('onclick', which === 'main' ? 'closeJdPermissions()' : 'jdPpGoMain()');
    } catch (_) {}
  }

  function refreshArtifacts() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      var el = m.querySelector('#jdPpViewArtifacts');
      if (el) el.innerHTML =
        '<div class="jd-pp-label">Artifacts and scheduled tasks</div>' +
        '<div class="jd-pp-card"><div class="jd-pp-conn">' +
        '<span class="jd-pp-conn-name" style="color:#8e8e93">No artifacts or scheduled tasks yet.</span>' +
        '</div></div>';
    } catch (_) {}
  }

  function refreshMain() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      var main = m.querySelector('#jdPpViewMain');
      if (main) main.innerHTML = renderDefaults();
      var ids = connectedIds();
      var c = m.querySelector('#jdPpConnCount');
      if (c) c.textContent = ids.length + ' ';
      wireMain(m);
    } catch (_) {}
  }

  function refreshList() {
    try {
      var m = document.getElementById(MODAL_ID);
      if (!m) return;
      var list = m.querySelector('#jdPpViewList');
      if (list) list.innerHTML = renderConnList();
      wireList(m);
    } catch (_) {}
  }

  function wireMain(m) {
    try {
      var api = permApi();
      var opts = m.querySelectorAll('.jd-pp-opt[data-def]');
      for (var i = 0; i < opts.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            api.setDefault(btn.getAttribute('data-def'));
            refreshMain();
          });
        })(opts[i]);
      }
      var wopts = m.querySelectorAll('.jd-pp-opt[data-wdef]');
      for (var j = 0; j < wopts.length; j++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            api.setWebDefault(btn.getAttribute('data-wdef'));
            refreshMain();
          });
        })(wopts[j]);
      }
      var open = m.querySelector('#jdPpOpenConns');
      if (open) open.addEventListener('click', function () {
        refreshList();
        showView('list');
      });
      var openArt = m.querySelector('#jdPpOpenArtifacts');
      if (openArt) openArt.addEventListener('click', function () {
        refreshArtifacts();
        showView('artifacts');
      });
    } catch (_) {}
  }

  function wireList(m) {
    try {
      /* Toggle dropdown */
      var btns = m.querySelectorAll('.jd-pp-conn-perm');
      for (var i = 0; i < btns.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var dd = btn.closest('.jd-pp-dd');
            var wasOpen = dd.classList.contains('open');
            var all = m.querySelectorAll('.jd-pp-dd.open');
            for (var k = 0; k < all.length; k++) all[k].classList.remove('open');
            if (!wasOpen) dd.classList.add('open');
          });
        })(btns[i]);
      }
      /* Pick an option */
      var opts = m.querySelectorAll('.jd-pp-menu button');
      for (var j = 0; j < opts.length; j++) {
        (function (opt) {
          opt.addEventListener('click', function (e) {
            e.stopPropagation();
            var dd = opt.closest('.jd-pp-dd');
            var row = opt.closest('.jd-pp-conn');
            var id = row && row.getAttribute('data-conn');
            var v = opt.getAttribute('data-v');
            if (id && v) {
              /* 'ask' == inherit (follow global default) */
              permApi().setConnector(id, v === 'ask' ? 'inherit' : v);
              var btn = dd.querySelector('.jd-pp-conn-perm');
              btn.querySelector('span').textContent = permLabel(v);
              btn.setAttribute('data-cur', v === 'ask' ? 'inherit' : v);
            }
            dd.classList.remove('open');
          });
        })(opts[j]);
      }
      /* Close dropdowns when tapping elsewhere in the modal */
      m.addEventListener('click', function () {
        var all = m.querySelectorAll('.jd-pp-dd.open');
        for (var k = 0; k < all.length; k++) all[k].classList.remove('open');
      });
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
      '<section class="settings-home" role="dialog" aria-modal="true" aria-labelledby="jdPpTitle" style="max-width:560px">' +
      '<header class="settings-home-header">' +
      '<button class="settings-back" id="jdPpBack" type="button" onclick="closeJdPermissions()" aria-label="Back">' +
      '<i data-lucide="arrow-left"></i></button>' +
      '<div class="settings-profile"><div><h2 id="jdPpTitle">Permissions</h2>' +
      '<p>Connector permissions</p></div></div>' +
      '</header>' +
      '<div class="settings-home-scroll">' +
      '<div class="jd-pp-view active" id="jdPpViewMain"></div>' +
      '<div class="jd-pp-view" id="jdPpViewList"></div>' +
      '<div class="jd-pp-view" id="jdPpViewArtifacts"></div>' +
      '</div></section>';
    document.body.appendChild(ov);
    if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(ov); } catch (_) {} }
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
  window.jdPpGoMain = function () { showView('main'); };

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
      ensureCss();
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
