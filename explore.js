/* JepongDevxyz AI — Explore (2026-10-04) v2
   Pixel-perfect Muse-app parity:
   - Bottom tab bar with OUTLINE icons (Feed/Ideas/Goals/Library), exactly
     like the Muse app's bottom tabs — not top segmented, not emojis
   - Each tab's content fills the area above the tab bar
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdExplore) return;
  window.__jdExplore = true;

  var PATCH_VER = '20261004a72';
  var activeTab = 'feed';
  var mounted = {};

  var CSS = [
    '#jdExplorePage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdExplorePage[hidden]{display:none!important}',
    '.jdx-header{display:flex;align-items:center;padding:12px 16px 4px;flex:0 0 auto}',
    '.jdx-back{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer;margin-left:-8px}',
    '.jdx-back:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdx-back svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdx-content{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;position:relative}',
    '.jdx-pane{display:none;height:100%;overflow-y:auto;-webkit-overflow-scrolling:touch}',
    '.jdx-pane.on{display:block}',
    /* Bottom tab bar — Muse-app style */
    '.jdx-tabbar{display:flex;flex:0 0 auto;border-top:1px solid rgba(255,255,255,.08);',
    'padding:8px 4px calc(10px + env(safe-area-inset-bottom));background:#000}',
    '.jdx-tab{flex:1;border:none;background:transparent;color:#666;cursor:pointer;',
    'display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0}',
    '.jdx-tab svg{width:24px;height:24px;stroke:currentColor;fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}',
    '.jdx-tab span{font-size:.62rem;font-weight:500}',
    '.jdx-tab.on{color:#fff}',
    '.jdx-tab:active{transform:scale(.95)}',
    /* Light mode */
    'body.theme-light #jdExplorePage{background:#fff;color:#111}',
    'body.theme-light .jdx-back{color:#111}',
    'body.theme-light .jdx-tabbar{background:#fff;border-color:rgba(0,0,0,.08)}',
    'body.theme-light .jdx-tab{color:#999}',
    'body.theme-light .jdx-tab.on{color:#111}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    feed: '<svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V9"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>',
    ideas: '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.1h6c0-.7.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>',
    goals: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 12.5l2.5 2.5 5-5.5"/></svg>',
    library: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>'
  };

  var TABS = [
    { id: 'feed', label: 'Feed' },
    { id: 'ideas', label: 'Ideas' },
    { id: 'goals', label: 'Goals' },
    { id: 'library', label: 'Library' }
  ];

  function ensureCSS() {
    var old = document.getElementById('jdxCss');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'jdxCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function mountTab(id) {
    var pane = document.getElementById('jdxPane-' + id);
    if (!pane || mounted[id]) return;
    try {
      if (id === 'feed' && window.JDFeed && window.JDFeed.mountPane) {
        mounted[id] = window.JDFeed.mountPane(pane);
      } else if (id === 'ideas' && window.JDIdeas && window.JDIdeas.mountPane) {
        mounted[id] = window.JDIdeas.mountPane(pane);
      } else if (id === 'goals' && window.JDGoals && window.JDGoals.mountPane) {
        mounted[id] = window.JDGoals.mountPane(pane);
      } else if (id === 'library' && window.JDLibrary && window.JDLibrary.mountPane) {
        mounted[id] = window.JDLibrary.mountPane(pane);
      }
    } catch (e) {}
  }

  function switchTab(id) {
    activeTab = id;
    document.querySelectorAll('.jdx-tab').forEach(function (t) {
      t.classList.toggle('on', t.getAttribute('data-tab') === id);
    });
    document.querySelectorAll('.jdx-pane').forEach(function (p) {
      p.classList.toggle('on', p.id === 'jdxPane-' + id);
    });
    mountTab(id);
    try {
      if (mounted[id] && typeof mounted[id] === 'function') mounted[id]();
    } catch (e) {}
    /* scroll pane to top on tab switch */
    try {
      var pane = document.getElementById('jdxPane-' + id);
      if (pane) pane.scrollTop = 0;
    } catch (e) {}
  }

  function buildPage() {
    var p = document.getElementById('jdExplorePage');
    if (p) { ensureCSS(); return; }
    p = document.createElement('div');
    p.id = 'jdExplorePage';
    p.hidden = true;
    var tabsHtml = TABS.map(function (t) {
      return '<button class="jdx-tab' + (t.id === activeTab ? ' on' : '') + '" data-tab="' + t.id + '" aria-label="' + t.label + '">' +
        I[t.id] + '<span>' + t.label + '</span></button>';
    }).join('');
    var panesHtml = TABS.map(function (t) {
      return '<div class="jdx-pane' + (t.id === activeTab ? ' on' : '') + '" id="jdxPane-' + t.id + '"></div>';
    }).join('');
    p.innerHTML =
      '<div class="jdx-header">' +
      '<button class="jdx-back" id="jdxBack" aria-label="Back">' + I.back + '</button>' +
      '</div>' +
      '<div class="jdx-content">' + panesHtml + '</div>' +
      '<div class="jdx-tabbar">' + tabsHtml + '</div>';
    document.body.appendChild(p);
    document.getElementById('jdxBack').addEventListener('click', closeExplore);
    p.querySelectorAll('.jdx-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchTab(t.getAttribute('data-tab')); });
    });
  }

  function openExplore(tab) {
    ensureCSS(); buildPage();
    document.getElementById('jdExplorePage').hidden = false;
    switchTab(tab || activeTab);
  }
  function closeExplore() {
    var p = document.getElementById('jdExplorePage');
    if (p) p.hidden = true;
  }

  function addSidebarEntry() {
    try {
      ['jdFeedBtn', 'jdIdeasBtn', 'jdLibBtn'].forEach(function (id) {
        var b = document.getElementById(id);
        if (b) b.remove();
      });
    } catch (e) {}
    if (document.getElementById('jdExploreBtn')) return;
    var iv = setInterval(function () {
      var main = document.getElementById('jdMainChatBtn');
      if (!main) return;
      try {
        ['jdFeedBtn', 'jdIdeasBtn', 'jdLibBtn'].forEach(function (id) {
          var b = document.getElementById(id);
          if (b) b.remove();
        });
      } catch (e) {}
      if (document.getElementById('jdExploreBtn')) { clearInterval(iv); return; }
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdExploreBtn';
      btn.setAttribute('aria-label', 'Open explore');
      btn.setAttribute('data-jd-ver', PATCH_VER);
      btn.innerHTML = '<i data-lucide="compass"></i><span>Explore</span>';
      btn.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openExplore();
      });
      main.parentNode.insertBefore(btn, main.nextSibling);
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
      clearInterval(iv);
    }, 1200);
    setTimeout(function () { clearInterval(iv); }, 30000);
  }

  try {
    setInterval(function () {
      try {
        if (!document.getElementById('jdExploreBtn')) addSidebarEntry();
        ['jdFeedBtn', 'jdIdeasBtn', 'jdLibBtn'].forEach(function (id) {
          var b = document.getElementById(id);
          if (b) b.remove();
        });
      } catch (e) {}
    }, 10000);
  } catch (e) {}

  window.JDExplore = { open: openExplore, close: closeExplore, switchTab: switchTab, ver: PATCH_VER };

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
