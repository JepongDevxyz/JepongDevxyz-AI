/* JepongDevxyz AI — Library Tab (2026-10-04)
   Muse-app-style Library with ACTUAL FUNCTION:
   - Artifacts tab: HTML files and documents generated or shared in chats
   - Media tab: images and videos from chat sessions (grid view)
   - Scans all chat sessions per user; tap an item to view/open it
   - List/Grid toggle, sort options (last modified, name)
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdLibrary) return;
  window.__jdLibrary = true;

  var tab = 'artifacts'; /* artifacts | media */
  var viewMode = 'list'; /* list | grid */
  var sortBy = 'modified'; /* modified | name */

  var CSS = [
    '#jdLibPage{position:fixed;inset:0;z-index:24500;background:#0a0a0c;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdLibPage[hidden]{display:none!important}',
    '.jdl-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdl-back,.jdl-menu{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdl-back:active,.jdl-menu:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdl-back svg,.jdl-menu svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdl-tabs{display:flex;background:#1c1c1e;border-radius:20px;padding:4px;margin:0 16px 12px;flex:0 0 auto}',
    '.jdl-tab{flex:1;border:none;background:transparent;color:#999;font-size:.88rem;font-weight:600;',
    'border-radius:16px;padding:10px;cursor:pointer}',
    '.jdl-tab.on{background:#2c2c2e;color:#fff}',
    '.jdl-tab:active{transform:scale(.98)}',
    '.jdl-scroll{flex:1;overflow-y:auto;padding:4px 16px 100px;-webkit-overflow-scrolling:touch}',
    /* Artifact list */
    '.jdl-file{display:flex;align-items:center;gap:14px;padding:13px 6px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer}',
    '.jdl-file:active{background:rgba(255,255,255,.04)}',
    '.jdl-file-ico{width:38px;height:38px;border-radius:10px;background:rgba(255,255,255,.08);display:flex;',
    'align-items:center;justify-content:center;flex:0 0 auto}',
    '.jdl-file-ico svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:1.6}',
    '.jdl-file-ico .jdl-ext{font-size:.55rem;font-weight:800;color:#fff;letter-spacing:.02em}',
    '.jdl-file-info{flex:1;min-width:0}',
    '.jdl-file-name{font-size:.92rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdl-file-sub{font-size:.74rem;color:#8e8e93;margin-top:2px;text-transform:uppercase;letter-spacing:.06em}',
    '.jdl-file-more{color:#666;font-size:1.1rem;padding:6px;flex:0 0 auto}',
    /* Media grid */
    '.jdl-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}',
    '.jdl-media{aspect-ratio:1;border-radius:14px;overflow:hidden;background:#1c1c1e;cursor:pointer;position:relative}',
    '.jdl-media img,.jdl-media video{width:100%;height:100%;object-fit:cover}',
    '.jdl-media-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}',
    '.jdl-media-play span{width:34px;height:34px;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;',
    'display:flex;align-items:center;justify-content:center;font-size:.8rem}',
    '.jdl-empty{text-align:center;padding:50px 20px;color:#8e8e93;font-size:.88rem;line-height:1.6}',
    /* Menu sheet */
    '#jdlMenuSheet{position:fixed;inset:0;z-index:24600;display:none}',
    '#jdlMenuSheet.open{display:block}',
    '.jdl-ms-bg{position:absolute;inset:0;background:rgba(0,0,0,.5)}',
    '.jdl-ms-body{position:absolute;left:12px;right:12px;bottom:12px;background:#1c1c1e;border-radius:20px;padding:8px}',
    '.jdl-ms-item{display:flex;align-items:center;gap:12px;width:100%;border:none;background:transparent;color:#fff;',
    'font-size:.92rem;padding:14px 16px;cursor:pointer;border-radius:12px;text-align:left}',
    '.jdl-ms-item:active{background:rgba(255,255,255,.07)}',
    '.jdl-ms-item svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2}',
    '.jdl-ms-item .ck{margin-left:auto;color:#fff;font-weight:700}',
    '.jdl-ms-sep{height:1px;background:rgba(255,255,255,.08);margin:4px 12px}',
    /* Light mode */
    'body.theme-light #jdLibPage{background:#f7f7f9;color:#111}',
    'body.theme-light .jdl-back,body.theme-light .jdl-menu{color:#111}',
    'body.theme-light .jdl-tabs{background:#ececf0}',
    'body.theme-light .jdl-tab{color:#888}',
    'body.theme-light .jdl-tab.on{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,.08)}',
    'body.theme-light .jdl-file{border-color:rgba(0,0,0,.05)}',
    'body.theme-light .jdl-file-ico{background:rgba(0,0,0,.05)}',
    'body.theme-light .jdl-file-ico svg{stroke:#333}',
    'body.theme-light .jdl-file-ico .jdl-ext{color:#333}',
    'body.theme-light .jdl-file-sub{color:#999}',
    'body.theme-light .jdl-ms-body{background:#fff;color:#111}',
    'body.theme-light .jdl-ms-item{color:#111}',
    'body.theme-light .jdl-media{background:#ececf0}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    file: '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    list: '<svg viewBox="0 0 24 24"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>'
  };

  function ensureCSS() {
    var old = document.getElementById('jdlCss');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'jdlCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function sessions() {
    try {
      if (typeof chatSessions !== 'undefined' && chatSessions) return chatSessions;
    } catch (e) {}
    try { return window.chatSessions || {}; } catch (e) { return {}; }
  }

  /* Scan all sessions for artifacts (HTML/docs) and media (images/videos) */
  function scan() {
    var arts = [], media = [];
    var ss = sessions();
    Object.keys(ss).forEach(function (sid) {
      var s = ss[sid];
      if (!s || !s.messages) return;
      s.messages.forEach(function (m, mi) {
        var at = m.at || m.ts || Date.now();
        /* attachments */
        var atts = m.attachments || m.files || [];
        atts.forEach(function (a) {
          var name = a.name || a.filename || 'file';
          var url = a.url || a.dataUrl || a.src || '';
          var kind = (a.kind || a.type || '').toLowerCase();
          var isImg = kind === 'image' || /\.(png|jpe?g|gif|webp)$/i.test(name) || /^data:image/.test(url);
          var isVid = kind === 'video' || /\.(mp4|webm|mov)$/i.test(name) || /^data:video/.test(url);
          if (isImg || isVid) {
            media.push({ name: name, url: url, kind: isVid ? 'video' : 'image', at: at, sid: sid, mi: mi });
          } else if (url || name) {
            var ext = (name.split('.').pop() || 'FILE').toUpperCase().slice(0, 4);
            arts.push({ name: name, ext: ext, url: url, at: at, sid: sid, mi: mi });
          }
        });
        /* inline data-url images in text */
        var txt = String(m.text || m.content || '');
        var m2 = txt.match(/data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]{100,}/);
        if (m2) media.push({ name: 'image.png', url: m2[0].slice(0, 200000), kind: 'image', at: at, sid: sid, mi: mi });
      });
    });
    arts.sort(function (a, b) { return b.at - a.at; });
    media.sort(function (a, b) { return b.at - a.at; });
    return { artifacts: arts, media: media };
  }

  function fmtDate(ts) {
    try { return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
    catch (e) { return ''; }
  }

  function render() {
    var box = document.getElementById('jdlBody');
    if (!box) return;
    var data = scan();
    /* tabs active state */
    document.querySelectorAll('.jdl-tab').forEach(function (t) {
      t.classList.toggle('on', t.getAttribute('data-tab') === tab);
    });
    var html = '';
    if (tab === 'artifacts') {
      var arts = data.artifacts.slice();
      if (sortBy === 'name') arts.sort(function (a, b) { return a.name.localeCompare(b.name); });
      if (!arts.length) {
        html = '<div class="jdl-empty">No artifacts yet.<br>HTML files and documents from your chats will appear here.</div>';
      } else {
        arts.forEach(function (a, i) {
          html += '<div class="jdl-file" data-i="' + i + '">' +
            '<div class="jdl-file-ico"><span class="jdl-ext">' + esc(a.ext) + '</span></div>' +
            '<div class="jdl-file-info"><div class="jdl-file-name">' + esc(a.name) + '</div>' +
            '<div class="jdl-file-sub">' + esc(a.ext) + ' · ' + esc(fmtDate(a.at)) + '</div></div>' +
            '<div class="jdl-file-more">⋮</div></div>';
        });
      }
    } else {
      var med = data.media.slice();
      if (!med.length) {
        html = '<div class="jdl-empty">No media yet.<br>Images and videos from your chats will appear here.</div>';
      } else {
        html = '<div class="jdl-grid">';
        med.forEach(function (m, i) {
          html += '<div class="jdl-media" data-i="' + i + '">';
          if (m.kind === 'video') {
            html += '<video src="' + esc(m.url) + '" preload="metadata"></video>' +
              '<div class="jdl-media-play"><span>▶</span></div>';
          } else {
            html += '<img src="' + esc(m.url) + '" loading="lazy" alt=""/>';
          }
          html += '</div>';
        });
        html += '</div>';
      }
    }
    box.innerHTML = html;

    /* wire taps */
    if (tab === 'artifacts') {
      var arts2 = data.artifacts.slice();
      if (sortBy === 'name') arts2.sort(function (a, b) { return a.name.localeCompare(b.name); });
      box.querySelectorAll('.jdl-file').forEach(function (el) {
        el.addEventListener('click', function () {
          var a = arts2[Number(el.getAttribute('data-i'))];
          if (a && a.url) { try { window.open(a.url, '_blank'); } catch (e) {} }
        });
      });
    } else {
      var med2 = data.media;
      box.querySelectorAll('.jdl-media').forEach(function (el) {
        el.addEventListener('click', function () {
          var m = med2[Number(el.getAttribute('data-i'))];
          if (m && m.url) { try { window.open(m.url, '_blank'); } catch (e) {} }
        });
      });
    }
  }

  function openMenu() {
    var sh = document.getElementById('jdlMenuSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'jdlMenuSheet';
      document.body.appendChild(sh);
    }
    function row(id, icon, label, checked) {
      return '<button class="jdl-ms-item" data-act="' + id + '">' + icon +
        '<span>' + label + '</span>' + (checked ? '<span class="ck">✓</span>' : '') + '</button>';
    }
    sh.innerHTML =
      '<div class="jdl-ms-bg" id="jdlMsBg"></div><div class="jdl-ms-body">' +
      row('grid', I.grid, 'Show as Grid', viewMode === 'grid') +
      row('list', I.list, 'Show as List', viewMode === 'list') +
      '<div class="jdl-ms-sep"></div>' +
      row('sort-modified', '', 'Sort by last modified', sortBy === 'modified') +
      row('sort-name', '', 'Sort by name', sortBy === 'name') +
      '</div>';
    sh.classList.add('open');
    document.getElementById('jdlMsBg').addEventListener('click', closeMenu);
    sh.querySelectorAll('.jdl-ms-item').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        if (act === 'grid') viewMode = 'grid';
        else if (act === 'list') viewMode = 'list';
        else if (act === 'sort-modified') sortBy = 'modified';
        else if (act === 'sort-name') sortBy = 'name';
        closeMenu(); render();
      });
    });
  }
  function closeMenu() {
    var sh = document.getElementById('jdlMenuSheet');
    if (sh) sh.classList.remove('open');
  }

  function buildPage() {
    var p = document.getElementById('jdLibPage');
    if (p) { ensureCSS(); return; }
    p = document.createElement('div');
    p.id = 'jdLibPage';
    p.hidden = true;
    p.innerHTML =
      '<div class="jdl-header">' +
      '<button class="jdl-back" id="jdlBack" aria-label="Back">' + I.back + '</button>' +
      '<div style="width:40px"></div>' +
      '<button class="jdl-menu" id="jdlMenu" aria-label="View options">' + I.dots + '</button>' +
      '</div>' +
      '<div class="jdl-tabs">' +
      '<button class="jdl-tab on" data-tab="artifacts">Artifacts</button>' +
      '<button class="jdl-tab" data-tab="media">Media</button>' +
      '</div>' +
      '<div class="jdl-scroll" id="jdlBody"></div>';
    document.body.appendChild(p);
    document.getElementById('jdlBack').addEventListener('click', closeLib);
    document.getElementById('jdlMenu').addEventListener('click', openMenu);
    p.querySelectorAll('.jdl-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        tab = t.getAttribute('data-tab');
        render();
      });
    });
  }
  function openLib() {
    ensureCSS(); buildPage();
    document.getElementById('jdLibPage').hidden = false;
    render();
  }
  function closeLib() {
    var p = document.getElementById('jdLibPage');
    if (p) p.hidden = true;
  }

  function addSidebarEntry() {
    if (document.getElementById('jdLibBtn')) return;
    var iv = setInterval(function () {
      var ideas = document.getElementById('jdIdeasBtn');
      if (!ideas) return;
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdLibBtn';
      btn.setAttribute('aria-label', 'Open library');
      btn.innerHTML = '<i data-lucide="folder-open"></i><span>Library</span>';
      btn.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openLib();
      });
      ideas.parentNode.insertBefore(btn, ideas.nextSibling);
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
      clearInterval(iv);
    }, 1200);
    setTimeout(function () { clearInterval(iv); }, 30000);
  }

  window.JDLibrary = { open: openLib, close: closeLib };

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
