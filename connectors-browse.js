/* ============================================================
   JepongDevxyz AI — Claude-style Browse + Add custom connector
   (runtime patch, 2026-10-01)
   Jepong: "Same ba kayo ni Claude ng Connectors? Kung same gusto ko
   sana ganyan ang ilagay mong custom connectors sa JepongDevxyz AI"

   Adds, Claude-app style:
   - "+" button in the Connectors header -> menu:
     "Browse connectors" / "Add custom connector"
   - Browse view: search, category chips, rows with icon + name +
     category + description + "Connect" pill (uses the existing
     OAuth / API-key / builtin connect flows — nothing reimplemented).
   - Add custom connector view: Name + Server URL + auth, posts to
     the existing /api/connectors/custom backend.
   Additive only; fail-open; idempotent. Respects the visibility
   filter (window.__jdConnVisible) when present.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdConnBrowse) return;
  window.__jdConnBrowse = true;

  var MODAL_ID = 'jdConnectorsModal';

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
        method: opts.method || 'GET', headers: headers,
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
      t.className = 'jd-conn-toast'; t.textContent = msg;
      document.body.appendChild(t);
      setTimeout(function () { t.classList.add('show'); }, 30);
      setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 400); }, 2600);
    } catch (e) {}
  }

  /* ---------------- categories ---------------- */
  var CATS = {
    browser: 'Web',
    github: 'Developer tools', vercel: 'Developer tools', linear: 'Developer tools',
    tailscale: 'Developer tools',
    gmail: 'Communication', outlook_mail: 'Communication', slack: 'Communication',
    zoom: 'Communication', messenger: 'Communication', instagram_msgs: 'Communication',
    threads_msgs: 'Communication', gcontacts: 'Communication', outlook_contacts: 'Communication',
    gcalendar: 'Productivity', outlook_calendar: 'Productivity', calendly: 'Productivity',
    gforms: 'Productivity', notion: 'Productivity',
    gtasks: 'Task management', todoist: 'Task management', asana: 'Task management',
    gdrive: 'File storage', gdocs: 'File storage', gsheets: 'File storage',
    gslides: 'File storage', dropbox: 'File storage', box: 'File storage',
    spotify: 'Media',
    facebook: 'Social', instagram: 'Social', threads: 'Social',
    meta_biz: 'Advertising', meta_ads: 'Advertising',
    figma: 'Design', canva: 'Design',
    quickbooks: 'Finance', plaid: 'Finance', stripe: 'Finance',
    shopify: 'Commerce', printify: 'Commerce',
    klaviyo: 'Marketing', highlevel: 'Marketing',
    withings: 'Health', health_connect: 'Health',
    tessie: 'Devices', flightaware: 'Travel',
    device_calendar: 'Device', call_log: 'Device', device_contacts: 'Device',
    device_messages: 'Device', notifications: 'Device', phone_dialer: 'Device'
  };
  function catOf(c) { return CATS[c.id] || 'Other'; }

  function visibleList() {
    var reg = (window.__jdConnectors && window.__jdConnectors.registry) || [];
    var vis = window.__jdConnVisible; /* from connectors-filter.js */
    return reg.filter(function (c) {
      if (c.kind === 'customsuggest') return false;
      if (vis && !vis[c.id]) return false;
      return true;
    });
  }

  /* ---------------- css ---------------- */
  function ensureCss() {
    if (document.getElementById('jdBrowseCss')) return;
    var st = document.createElement('style');
    st.id = 'jdBrowseCss';
    st.textContent =
      '#' + MODAL_ID + ' .jd-conn-plus{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.16);' +
      'background:rgba(255,255,255,.06);color:#fff;font-size:20px;line-height:1;cursor:pointer;flex:0 0 auto}' +
      '#' + MODAL_ID + ' .jd-plus-menu{position:absolute;top:52px;right:14px;z-index:60;background:#1c1c1e;' +
      'border:1px solid rgba(255,255,255,.12);border-radius:14px;min-width:220px;overflow:hidden;' +
      'box-shadow:0 12px 32px rgba(0,0,0,.6)}' +
      '#' + MODAL_ID + ' .jd-plus-menu button{display:flex;align-items:center;gap:12px;width:100%;padding:13px 16px;' +
      'background:none;border:0;color:#fff;font-size:.92rem;cursor:pointer;text-align:left}' +
      '#' + MODAL_ID + ' .jd-plus-menu button:active{background:rgba(255,255,255,.08)}' +
      '#' + MODAL_ID + ' .jd-plus-menu button svg{width:18px;height:18px;opacity:.85}' +
      '#' + MODAL_ID + ' .jd-browse, #' + MODAL_ID + ' .jd-addcustom{position:absolute;inset:0;background:#0a0a0c;' +
      'display:flex;flex-direction:column;z-index:40}' +
      '#' + MODAL_ID + ' .jd-br-head{display:flex;align-items:center;gap:8px;padding:14px 12px 6px}' +
      '#' + MODAL_ID + ' .jd-br-back{width:36px;height:36px;border-radius:50%;border:0;background:none;color:#fff;' +
      'font-size:20px;cursor:pointer}' +
      '#' + MODAL_ID + ' .jd-br-title{flex:1;text-align:center;font-size:1.02rem;font-weight:600}' +
      '#' + MODAL_ID + ' .jd-br-filter{width:36px;height:36px;border-radius:50%;border:0;background:none;color:#fff;' +
      'cursor:pointer;display:flex;align-items:center;justify-content:center}' +
      '#' + MODAL_ID + ' .jd-br-filter svg{width:20px;height:20px}' +
      '#' + MODAL_ID + ' .jd-br-search{margin:8px 16px 4px;display:flex;align-items:center;gap:8px;' +
      'background:#1c1c1e;border-radius:12px;padding:10px 12px}' +
      '#' + MODAL_ID + ' .jd-br-search svg{width:18px;height:18px;opacity:.6;flex:0 0 auto}' +
      '#' + MODAL_ID + ' .jd-br-search input{flex:1;background:none;border:0;outline:0;color:#fff;font-size:.92rem}' +
      '#' + MODAL_ID + ' .jd-br-search input::placeholder{color:rgba(255,255,255,.4)}' +
      '#' + MODAL_ID + ' .jd-br-search .jd-br-x{border:0;background:none;color:rgba(255,255,255,.6);font-size:16px;cursor:pointer}' +
      '#' + MODAL_ID + ' .jd-br-cats{display:flex;gap:8px;overflow-x:auto;padding:10px 16px 4px;scrollbar-width:none}' +
      '#' + MODAL_ID + ' .jd-br-cats::-webkit-scrollbar{display:none}' +
      '#' + MODAL_ID + ' .jd-br-cat{flex:0 0 auto;border:1px solid rgba(255,255,255,.14);background:none;color:#fff;' +
      'border-radius:20px;padding:7px 14px;font-size:.83rem;cursor:pointer;white-space:nowrap}' +
      '#' + MODAL_ID + ' .jd-br-cat.on{background:#fff;color:#000;border-color:#fff;font-weight:600}' +
      '#' + MODAL_ID + ' .jd-br-list{flex:1;overflow-y:auto;padding:6px 0 20px}' +
      '#' + MODAL_ID + ' .jd-br-row{display:flex;align-items:center;gap:12px;padding:13px 16px;' +
      'border-bottom:1px solid rgba(255,255,255,.06)}' +
      '#' + MODAL_ID + ' .jd-br-ic{width:44px;height:44px;border-radius:12px;background:#1c1c1e;flex:0 0 auto;' +
      'display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      '#' + MODAL_ID + ' .jd-br-ic svg{width:24px;height:24px}' +
      '#' + MODAL_ID + ' .jd-br-ic i{width:24px;height:24px}' +
      '#' + MODAL_ID + ' .jd-br-meta{flex:1;min-width:0}' +
      '#' + MODAL_ID + ' .jd-br-name{font-size:.93rem;font-weight:600}' +
      '#' + MODAL_ID + ' .jd-br-sub{font-size:.74rem;color:rgba(255,255,255,.45);margin-top:1px}' +
      '#' + MODAL_ID + ' .jd-br-desc{font-size:.8rem;color:rgba(255,255,255,.6);margin-top:3px;' +
      'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
      '#' + MODAL_ID + ' .jd-br-connect{flex:0 0 auto;background:#fff;color:#000;border:0;border-radius:20px;' +
      'padding:8px 18px;font-size:.85rem;font-weight:600;cursor:pointer}' +
      '#' + MODAL_ID + ' .jd-br-connect:active{opacity:.75}' +
      '#' + MODAL_ID + ' .jd-br-empty{text-align:center;color:rgba(255,255,255,.5);padding:40px 20px;font-size:.9rem}' +
      '#' + MODAL_ID + ' .jd-ac-body{flex:1;overflow-y:auto;padding:6px 18px 24px}' +
      '#' + MODAL_ID + ' .jd-ac-org{font-size:.92rem;margin:10px 0 14px}' +
      '#' + MODAL_ID + ' .jd-ac-field{background:#1c1c1e;border:1px solid rgba(255,255,255,.1);border-radius:12px;' +
      'padding:13px 14px;width:100%;color:#fff;font-size:.92rem;outline:0;box-sizing:border-box}' +
      '#' + MODAL_ID + ' .jd-ac-field::placeholder{color:rgba(255,255,255,.35)}' +
      '#' + MODAL_ID + ' .jd-ac-field:focus{border-color:rgba(255,255,255,.35)}' +
      '#' + MODAL_ID + ' .jd-ac-hint{font-size:.78rem;color:rgba(255,255,255,.5);margin:6px 2px 14px}' +
      '#' + MODAL_ID + ' .jd-ac-warn{display:flex;gap:10px;font-size:.8rem;color:rgba(255,255,255,.6);' +
      'margin:4px 2px 18px;line-height:1.45}' +
      '#' + MODAL_ID + ' .jd-ac-warn svg{width:18px;height:18px;flex:0 0 auto;opacity:.7}' +
      '#' + MODAL_ID + ' .jd-ac-continue{width:100%;background:#3a3a3c;color:#fff;border:0;border-radius:24px;' +
      'padding:14px;font-size:.95rem;font-weight:600;cursor:pointer}' +
      '#' + MODAL_ID + ' .jd-ac-continue.ready{background:#fff;color:#000}' +
      '#' + MODAL_ID + ' .jd-ac-continue:disabled{opacity:.55;cursor:default}' +
      '#' + MODAL_ID + ' .jd-ac-row2{display:flex;gap:8px}' +
      '#' + MODAL_ID + ' .jd-ac-row2 select{flex:0 0 44%;background:#1c1c1e;border:1px solid rgba(255,255,255,.1);' +
      'border-radius:12px;padding:13px 10px;color:#fff;font-size:.85rem;outline:0}' +
      '#' + MODAL_ID + ' .jd-conn-modal{position:relative}';
    document.head.appendChild(st);
  }

  /* Brand SVGs for the closest frame-by-frame match (github/vercel/browser). */
  var BRAND = {
    github: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.2.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"/></svg>',
    vercel: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2 1 21h22L12 2z"/></svg>',
    browser: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  };
  function iconHtml(c) {
    if (BRAND[c.id]) return BRAND[c.id];
    return '<i data-lucide="' + esc(c.icon || 'plug') + '"></i>';
  }
  function refreshIcons(root) {
    try {
      if (typeof window.lucide !== 'undefined' && window.lucide.createIcons) {
        window.lucide.createIcons();
      } else if (typeof refreshLucideIcons === 'function') {
        refreshLucideIcons(root || document);
      }
    } catch (_) {}
  }

  /* ---------------- views ---------------- */
  var curCat = 'All', curQ = '';

  function modal() { return document.getElementById(MODAL_ID); }

  function mainParts() {
    var m = modal(); if (!m) return [];
    return ['.jd-conn-head', '.jd-conn-search', '.jd-conn-list', '.jd-conn-foot'].map(function (s) {
      return m.querySelector(s);
    }).filter(Boolean);
  }

  function showMain() {
    var m = modal(); if (!m) return;
    mainParts().forEach(function (el) { el.style.display = ''; });
    ['.jd-browse', '.jd-addcustom', '.jd-plus-menu'].forEach(function (s) {
      var el = m.querySelector(s); if (el) el.remove();
    });
  }

  function showBrowse() {
    ensureCss();
    var m = modal(); if (!m) return;
    showMain();
    mainParts().forEach(function (el) { el.style.display = 'none'; });
    var wrap = document.createElement('div');
    wrap.className = 'jd-browse';
    wrap.innerHTML =
      '<div class="jd-br-head"><button type="button" class="jd-br-back" aria-label="Back">←</button>' +
      '<div class="jd-br-title">Browse connectors</div>' +
      '<button type="button" class="jd-br-filter" aria-label="Filter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M7 12h10M10 18h4"/></svg></button></div>' +
      '<div class="jd-br-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
      '<input type="text" id="jdBrQ" placeholder="Search connectors" autocomplete="off">' +
      '<button type="button" class="jd-br-x" hidden>✕</button></div>' +
      '<div class="jd-br-cats"></div>' +
      '<div class="jd-br-list"></div>';
    m.querySelector('.jd-conn-modal').appendChild(wrap);
    curCat = 'All'; curQ = '';
    renderCats(wrap); renderRows(wrap);
    wrap.querySelector('.jd-br-back').addEventListener('click', showMain);
    var q = wrap.querySelector('#jdBrQ'), x = wrap.querySelector('.jd-br-x');
    q.addEventListener('input', function () {
      curQ = q.value || ''; x.hidden = !curQ;
      renderRows(wrap);
    });
    x.addEventListener('click', function () { q.value = ''; curQ = ''; x.hidden = true; renderRows(wrap); });
    wrap.querySelector('.jd-br-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-connect]'); if (!b) return;
      var id = b.getAttribute('data-connect');
      showMain(); /* setup guides live in the main list */
      setTimeout(function () {
        try { window.__jdConnectors.connect(id); } catch (_) {}
      }, 60);
    });
    refreshIcons(wrap);
  }

  function renderCats(wrap) {
    var cats = ['All'];
    visibleList().forEach(function (c) {
      var k = catOf(c);
      if (cats.indexOf(k) === -1) cats.push(k);
    });
    cats.sort(function (a, b) { return a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b); });
    wrap.querySelector('.jd-br-cats').innerHTML = cats.map(function (k) {
      return '<button type="button" class="jd-br-cat' + (k === curCat ? ' on' : '') + '" data-cat="' + esc(k) + '">' + esc(k) + '</button>';
    }).join('');
    wrap.querySelector('.jd-br-cats').addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]'); if (!b) return;
      curCat = b.getAttribute('data-cat');
      wrap.querySelectorAll('.jd-br-cat').forEach(function (el) {
        el.classList.toggle('on', el.getAttribute('data-cat') === curCat);
      });
      renderRows(wrap);
    });
  }

  function renderRows(wrap) {
    var q = curQ.trim().toLowerCase();
    var rows = visibleList().filter(function (c) {
      if (curCat !== 'All' && catOf(c) !== curCat) return false;
      if (q && (c.name + ' ' + (c.desc || '')).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    var html = rows.map(function (c) {
      var connected = false;
      try {
        var st = window.__jdConnectorStatus && window.__jdConnectorStatus.connectors;
        connected = !!(st && st[c.id] && st[c.id].connected);
      } catch (_) {}
      return '<div class="jd-br-row">' +
        '<span class="jd-br-ic">' + iconHtml(c) + '</span>' +
        '<span class="jd-br-meta"><div class="jd-br-name">' + esc(c.name) + '</div>' +
        '<div class="jd-br-sub">' + esc(catOf(c)) + '</div>' +
        '<div class="jd-br-desc">' + esc(c.desc || '') + '</div></span>' +
        (connected
          ? '<button type="button" class="jd-br-connect" data-connect="' + esc(c.id) + '">Open</button>'
          : '<button type="button" class="jd-br-connect" data-connect="' + esc(c.id) + '">Connect</button>') +
        '</div>';
    }).join('');
    wrap.querySelector('.jd-br-list').innerHTML = html ||
      '<div class="jd-br-empty">No connectors found.</div>';
    refreshIcons(wrap);
  }

  /* ---------------- add custom ---------------- */
  function showAddCustom() {
    ensureCss();
    var m = modal(); if (!m) return;
    showMain();
    mainParts().forEach(function (el) { el.style.display = 'none'; });
    var wrap = document.createElement('div');
    wrap.className = 'jd-addcustom';
    wrap.innerHTML =
      '<div class="jd-br-head"><button type="button" class="jd-br-back" aria-label="Back">←</button>' +
      '<div class="jd-br-title">Add custom connector</div><span style="width:36px"></span></div>' +
      '<div class="jd-ac-body">' +
      '<div class="jd-ac-org">Adding to your JepongDevxyz AI account</div>' +
      '<input type="text" class="jd-ac-field" id="jdAcName" placeholder="Name" maxlength="60">' +
      '<div class="jd-ac-hint">Shown in the connectors list.</div>' +
      '<input type="text" class="jd-ac-field" id="jdAcUrl" placeholder="Server URL" autocomplete="off">' +
      '<div class="jd-ac-hint">The HTTPS address of your API, for example https://api.example.com</div>' +
      '<div class="jd-ac-row2" style="margin-bottom:14px"><select id="jdAcAuth">' +
      '<option value="bearer">Bearer token</option><option value="xapikey">x-api-key</option>' +
      '<option value="header">Custom header</option><option value="query">Query param</option>' +
      '<option value="basic">Basic (user:pass)</option><option value="none">No auth</option></select>' +
      '<input type="text" class="jd-ac-field" id="jdAcToken" placeholder="Token / key" autocomplete="off" style="flex:1"></div>' +
      '<div class="jd-ac-warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>' +
      '<span>Only use connectors from developers you trust. JepongDevxyz AI does not control which tools developers make available and cannot verify that they will work as intended or that they won\'t change.</span></div>' +
      '<button type="button" class="jd-ac-continue" id="jdAcGo" disabled>Continue</button>' +
      '</div>';
    m.querySelector('.jd-conn-modal').appendChild(wrap);
    wrap.querySelector('.jd-br-back').addEventListener('click', showMain);
    var nameEl = wrap.querySelector('#jdAcName'), urlEl = wrap.querySelector('#jdAcUrl'),
        go = wrap.querySelector('#jdAcGo');
    function valid() {
      var ok = nameEl.value.trim().length > 0 && /^https?:\/\//i.test(urlEl.value.trim());
      go.disabled = !ok;
      go.classList.toggle('ready', ok);
    }
    nameEl.addEventListener('input', valid); urlEl.addEventListener('input', valid);
    go.addEventListener('click', function () {
      if (go.disabled) return;
      go.disabled = true; go.textContent = 'Saving…';
      api('/api/connectors/custom', { method: 'POST', body: {
        name: nameEl.value.trim(), description: '',
        base_url: urlEl.value.trim(),
        auth_type: wrap.querySelector('#jdAcAuth').value,
        auth_header: '', auth_value: wrap.querySelector('#jdAcToken').value.trim(),
        test_path: '/'
      } }).then(function (r) {
        if (r.ok) {
          toast('Custom connector saved.');
          try { window.__jdConnectors.refresh(); } catch (_) {}
          showMain();
        } else {
          go.disabled = false; go.textContent = 'Continue'; valid();
          toast((r.data && r.data.error) || 'Could not save.');
        }
      }).catch(function () {
        go.disabled = false; go.textContent = 'Continue'; valid();
        toast('Could not save.');
      });
    });
  }

  /* ---------------- + button + menu ---------------- */
  function ensurePlus() {
    var m = modal(); if (!m) return;
    var head = m.querySelector('.jd-conn-head');
    if (!head || head.querySelector('.jd-conn-plus')) return;
    var plus = document.createElement('button');
    plus.type = 'button'; plus.className = 'jd-conn-plus';
    plus.setAttribute('aria-label', 'Add connector');
    plus.textContent = '+';
    var x = head.querySelector('.jd-conn-x');
    if (x) head.insertBefore(plus, x); else head.appendChild(plus);
    plus.addEventListener('click', function (e) {
      e.stopPropagation();
      var old = m.querySelector('.jd-plus-menu');
      if (old) { old.remove(); return; }
      ensureCss();
      var menu = document.createElement('div');
      menu.className = 'jd-plus-menu';
      menu.innerHTML =
        '<button type="button" data-m="browse"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>Browse connectors</button>' +
        '<button type="button" data-m="add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8zM12 18v4"/></svg>Add custom connector</button>';
      m.querySelector('.jd-conn-modal').appendChild(menu);
      menu.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-m]'); if (!b) return;
        menu.remove();
        if (b.getAttribute('data-m') === 'browse') showBrowse(); else showAddCustom();
      });
      setTimeout(function () {
        document.addEventListener('click', function h(ev) {
          if (!menu.isConnected) { document.removeEventListener('click', h); return; }
          if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', h); }
        });
      }, 30);
    });
  }

  /* Watch for the modal being built, then attach the + button. */
  try {
    var obs = new MutationObserver(function () {
      if (modal()) ensurePlus();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    if (modal()) ensurePlus();
  } catch (_) {}

  window.__jdConnBrowseApi = { showBrowse: showBrowse, showAddCustom: showAddCustom, showMain: showMain };
})();
