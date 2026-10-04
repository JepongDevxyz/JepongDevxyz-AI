/* JepongDevxyz AI — Explore (2026-10-04)
   Unified Explore page (Muse-app parity): Feed, Ideas, Goals, and Library
   in ONE place with tab navigation — exactly like the Muse app's tabs.
   Replaces the individual Feed / Ideas / Library sidebar buttons with a
   single "Explore" entry (window.__jdExploreMode flag in agent.js).
   Each section mounts via its module's mountPane(container) API.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdExplore) return;
  window.__jdExplore = true;

  var PATCH_VER = '20261004a68';
  var activeTab = 'feed';
  var mounted = {}; /* tab -> refresh fn */

  var CSS = [
    '#jdExplorePage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdExplorePage[hidden]{display:none!important}',
    '.jdx-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdx-back{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdx-back:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdx-back svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdx-title{font-size:1.1rem;font-weight:700;letter-spacing:-.01em}',
    '.jdx-tabs{display:flex;background:#1c1c1e;border-radius:22px;padding:4px;margin:2px 16px 12px;flex:0 0 auto}',
    '.jdx-tab{flex:1;border:none;background:transparent;color:#999;font-size:.8rem;font-weight:600;',
    'border-radius:18px;padding:10px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px}',
    '.jdx-tab .jdx-ico{font-size:1.15rem}',
    '.jdx-tab.on{background:#2c2c2e;color:#fff}',
    '.jdx-tab:active{transform:scale(.97)}',
    '.jdx-content{flex:1;overflow-y:auto;padding:4px 16px 100px;-webkit-overflow-scrolling:touch}',
    '.jdx-pane{display:none}',
    '.jdx-pane.on{display:block}',
    /* Light mode */
    'body.theme-light #jdExplorePage{background:#f7f7f9;color:#111}',
    'body.theme-light .jdx-back{color:#111}',
    'body.theme-light .jdx-tabs{background:#ececf0}',
    'body.theme-light .jdx-tab{color:#888}',
    'body.theme-light .jdx-tab.on{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,.08)}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>'
  };

  var TABS = [
    { id: 'feed', label: 'Feed', ico: '📰' },
    { id: 'ideas', label: 'Ideas', ico: '💡' },
    { id: 'goals', label: 'Goals', ico: '🎯' },
    { id: 'library', label: 'Library', ico: '📁' }
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
    /* refresh the tab's content when switching to it */
    try {
      if (mounted[id] && typeof mounted[id] === 'function') mounted[id]();
    } catch (e) {}
  }

  function buildPage() {
    var p = document.getElementById('jdExplorePage');
    if (p) { ensureCSS(); return; }
    p = document.createElement('div');
    p.id = 'jdExplorePage';
    p.hidden = true;
    var tabsHtml = TABS.map(function (t) {
      return '<button class="jdx-tab' + (t.id === activeTab ? ' on' : '') + '" data-tab="' + t.id + '">' +
        '<span class="jdx-ico">' + t.ico + '</span><span>' + t.label + '</span></button>';
    }).join('');
    var panesHtml = TABS.map(function (t) {
      return '<div class="jdx-pane' + (t.id === activeTab ? ' on' : '') + '" id="jdxPane-' + t.id + '"></div>';
    }).join('');
    p.innerHTML =
      '<div class="jdx-header">' +
      '<button class="jdx-back" id="jdxBack" aria-label="Back">' + I.back + '</button>' +
      '<div class="jdx-title">Explore</div>' +
      '<div style="width:40px"></div>' +
      '</div>' +
      '<div class="jdx-tabs">' + tabsHtml + '</div>' +
      '<div class="jdx-content">' + panesHtml + '</div>';
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
    /* Remove any stray individual buttons from older versions */
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
      /* double-check strays are gone */
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

  /* Persistent self-heal: keep single Explore button, remove strays */
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
