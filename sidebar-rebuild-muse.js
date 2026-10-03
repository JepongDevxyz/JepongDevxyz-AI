/* =========================================================
   JepongDevxyz AI — EXACT Muse sidebar DOM rebuild
   Rebuilds the sidebar HTML to match the reference image
   frame-by-frame, not just CSS overrides.

   Structure (from reference):
   - "Main chat" with home icon
   - "Side chats" gray label + archive icon (right)
   - Conversation list (selected = dark pill)
   - Bottom: gear (circle) | Search (wide pill) | pencil (circle)
   - Ping ms + Words kept in a slim status strip

   All original elements are preserved in a hidden container
   so every feature keeps working.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSidebarRebuildLoaded) return;
  window.__jdSidebarRebuildLoaded = true;

  var HOME_SVG = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/></svg>';
  var ARCHIVE_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#777" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>';
  var GEAR_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var SEARCH_SVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var PENCIL_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';

  function build() {
    try {
      var drawer = document.querySelector('.jd-sidebar, .sidebar, #sidebarDrawer');
      if (!drawer || document.getElementById('jdMuseSidebar')) return;

      // Hide original content but keep it functional
      var originals = [];
      Array.prototype.forEach.call(drawer.children, function (child) {
        if (child.id !== 'jdMuseSidebar') {
          child.style.display = 'none';
          originals.push(child);
        }
      });

      // Build the Muse-style sidebar
      var root = document.createElement('div');
      root.id = 'jdMuseSidebar';
      root.style.cssText = 'display:flex;flex-direction:column;height:100%;background:#000;padding:0;position:relative';

      root.innerHTML =
        '<button id="jdMuseMainChat" type="button" style="display:flex;align-items:center;gap:14px;padding:22px 20px 14px;background:none;border:0;cursor:pointer;text-align:left;width:100%">' +
          HOME_SVG +
          '<span style="font-size:21px;font-weight:500;color:#fff;letter-spacing:-.01em">Main chat</span>' +
        '</button>' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 8px">' +
          '<span style="font-size:15px;color:#777;font-weight:400">Side chats</span>' +
          '<button id="jdMuseArchive" type="button" aria-label="Archived chats" style="background:none;border:0;cursor:pointer;padding:4px">' + ARCHIVE_SVG + '</button>' +
        '</div>' +
        '<div id="jdMuseList" style="flex:1;overflow-y:auto;padding:0 12px;display:flex;flex-direction:column"></div>' +
        '<div id="jdMuseStatus" style="display:flex;align-items:center;justify-content:space-between;padding:8px 20px;font-size:11px;color:#666"></div>' +
        '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px 20px">' +
          '<button id="jdMuseGear" type="button" aria-label="Settings" style="width:56px;height:56px;border-radius:50%;background:#2a2a2a;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none">' + GEAR_SVG + '</button>' +
          '<button id="jdMuseSearch" type="button" style="flex:1;height:56px;border-radius:28px;background:#2a2a2a;border:0;cursor:pointer;display:flex;align-items:center;gap:12px;padding:0 20px">' +
            SEARCH_SVG +
            '<span style="font-size:17px;color:#888">Search</span>' +
          '</button>' +
          '<button id="jdMuseNew" type="button" aria-label="New chat" style="width:56px;height:56px;border-radius:50%;background:#2a2a2a;border:0;cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none">' + PENCIL_SVG + '</button>' +
        '</div>';

      drawer.insertBefore(root, drawer.firstChild);
      drawer.style.background = '#000';

      wire(root);
      syncList();
      syncStatus();

      // Keep the list in sync when sessions change
      setInterval(syncList, 2000);
      setInterval(syncStatus, 5000);
    } catch (e) {}
  }

  function wire(root) {
    try {
      root.querySelector('#jdMuseMainChat').addEventListener('click', function () {
        if (typeof window.createNewChat === 'function') window.createNewChat();
        if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
      });
      root.querySelector('#jdMuseArchive').addEventListener('click', function () {
        var btn = document.getElementById('jdArchiveViewBtn');
        if (btn) btn.click();
      });
      root.querySelector('#jdMuseGear').addEventListener('click', function () {
        if (typeof window.openSettings === 'function') window.openSettings();
        else {
          var s = document.querySelector('[onclick*="openSettings"], [onclick*="Settings"]');
          if (s) s.click();
        }
        if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
      });
      root.querySelector('#jdMuseSearch').addEventListener('click', function () {
        var s = document.getElementById('inChatSearchInput');
        if (s) { s.focus(); }
        if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
      });
      root.querySelector('#jdMuseNew').addEventListener('click', function () {
        if (typeof window.createNewChat === 'function') window.createNewChat();
        if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
      });
    } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getSessions() {
    try {
      if (window.chatSessions) return Object.values(window.chatSessions);
      var raw = localStorage.getItem('jd_chat_sessions') || localStorage.getItem('chatSessions');
      if (raw) return Object.values(JSON.parse(raw));
    } catch (e) {}
    return [];
  }

  function syncList() {
    try {
      var list = document.getElementById('jdMuseList');
      if (!list) return;
      var sessions = getSessions().filter(function (s) { return s && !s.archived; });
      // Sort: pinned first, then by updatedAt desc
      sessions.sort(function (a, b) {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      });
      var currentId = null;
      try { currentId = window.currentSessionId || localStorage.getItem('jd_current_session'); } catch (e) {}

      var html = sessions.map(function (s) {
        var active = String(s.id) === String(currentId);
        return '<button type="button" data-sid="' + esc(s.id) + '" class="jd-muse-item' + (active ? ' active' : '') + '" ' +
          'style="display:block;width:100%;text-align:left;padding:14px 16px;border:0;cursor:pointer;border-radius:12px;background:' + (active ? '#262626' : 'transparent') + ';margin:0">' +
          '<span style="font-size:17px;color:#fff;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;letter-spacing:-.01em">' + esc(s.title || 'Untitled') + '</span>' +
        '</button>';
      }).join('');

      if (list.dataset.hash !== String(sessions.length) + '|' + currentId) {
        list.innerHTML = html || '<div style="padding:20px;text-align:center;color:#555;font-size:14px">No conversations yet</div>';
        list.dataset.hash = String(sessions.length) + '|' + currentId;
        Array.prototype.forEach.call(list.querySelectorAll('.jd-muse-item'), function (btn) {
          btn.addEventListener('click', function () {
            var sid = btn.getAttribute('data-sid');
            if (typeof window.switchChatSession === 'function') window.switchChatSession(sid);
            else if (typeof window.loadSession === 'function') window.loadSession(sid);
            if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
          });
          // Long-press -> original context menu
          var t = null;
          btn.addEventListener('pointerdown', function () {
            t = setTimeout(function () {
              if (window.__jdSideMenu) window.__jdSideMenu.show(window.innerWidth / 2, 200, sid);
            }, 450);
          });
          ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
            btn.addEventListener(ev, function () { if (t) clearTimeout(t); });
          });
        });
      }
    } catch (e) {}
  }

  function syncStatus() {
    try {
      var el = document.getElementById('jdMuseStatus');
      if (!el) return;
      var ping = '', words = '';
      try {
        var p = document.getElementById('pingText');
        if (p) ping = p.textContent.trim();
        var w = document.querySelector('.jd-word-count, #wordCount');
        if (w) words = w.textContent.trim();
      } catch (e) {}
      el.innerHTML = '<span>' + esc(ping) + '</span><span>' + esc(words) + '</span>';
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(build, 800); });
  } else {
    setTimeout(build, 800);
  }
})();
