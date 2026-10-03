/* =========================================================
   JepongDevxyz AI — sidebar long-press menu (Muse app style)
   Runtime patch loaded by agent.js (additive only).

   Long-press (or right-click) a conversation in the sidebar
   to show a Muse-app-style context menu:
   - Timestamp header (e.g. "October 3, 2026 at 5:16 PM")
   - Rename | Pin/Unpin | Delete (red)

   Uses the app's existing renameChatSession / togglePinSession /
   deleteChatSession. Pin moves the conversation to the top with
   a pin indicator, like the Muse app. The ping-ms and words
   indicators are untouched.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSidebarMenuLoaded) return;
  window.__jdSidebarMenuLoaded = true;

  var CSS = [
    '.jd-side-menu{position:fixed;z-index:10001;min-width:220px;max-width:260px;background:#2c2c31;color:#f5f5f5;border-radius:16px;box-shadow:0 18px 45px -12px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.25);padding:8px;animation:jdSideMenuPop .16s ease-out;border:1px solid rgba(255,255,255,.08)}',
    '@keyframes jdSideMenuPop{from{opacity:0;transform:scale(.96) translateY(4px)}}',
    '.jd-side-menu__time{padding:10px 12px 8px;font-size:12px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jd-side-menu__row{display:flex;align-items:center;gap:12px;width:100%;padding:0 12px;height:48px;background:none;border:0;border-radius:10px;color:inherit;font-size:15px;cursor:pointer;text-align:left}',
    '.jd-side-menu__row:active{background:rgba(255,255,255,.09)}',
    '.jd-side-menu__row svg{width:18px;height:18px;flex:none;opacity:.85}',
    '.jd-side-menu__row.danger{color:#ef4444}',
    'body.theme-light .jd-side-menu{background:#fff;color:#18181b;box-shadow:0 18px 45px -12px rgba(20,20,40,.25);border-color:rgba(0,0,0,.08)}',
    'body.theme-light .jd-side-menu__row:active{background:rgba(0,0,0,.06)}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('jdSideMenuCss')) return;
    var st = document.createElement('style');
    st.id = 'jdSideMenuCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var ICONS = {
    rename: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>',
    del: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>'
  };

  var openMenu = null;
  function closeMenu() {
    if (openMenu) { openMenu.remove(); openMenu = null; }
    document.removeEventListener('pointerdown', onDocDown, true);
  }
  function onDocDown(e) {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  }

  function formatTime(ts) {
    try {
      var d = new Date(ts);
      var date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      var time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return date + ' at ' + time;
    } catch (e) { return ''; }
  }

  function getSession(id) {
    try {
      // Access the app's session stores via known globals.
      if (window.chatSessions && window.chatSessions[id]) return window.chatSessions[id];
      if (window.bibleChatSessions && window.bibleChatSessions[id]) return window.bibleChatSessions[id];
    } catch (e) {}
    return null;
  }

  function showMenu(x, y, sessionId) {
    closeMenu();
    injectCSS();
    var session = getSession(sessionId);
    var isPinned = !!(session && session.pinned);
    var ts = (session && (session.createdAt || session.updatedAt)) || Date.now();

    var menu = document.createElement('div');
    menu.className = 'jd-side-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML =
      '<div class="jd-side-menu__time">' + formatTime(ts) + '</div>' +
      '<button type="button" class="jd-side-menu__row" data-act="rename">' + ICONS.rename + '<span>Rename</span></button>' +
      '<button type="button" class="jd-side-menu__row" data-act="pin">' + ICONS.pin + '<span>' + (isPinned ? 'Unpin' : 'Pin') + '</span></button>' +
      '<button type="button" class="jd-side-menu__row danger" data-act="delete">' + ICONS.del + '<span>Delete</span></button>';
    document.body.appendChild(menu);

    var w = menu.offsetWidth, h = menu.offsetHeight;
    var left = Math.max(10, Math.min(x, window.innerWidth - w - 10));
    var top = Math.max(10, Math.min(y, window.innerHeight - h - 10));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';

    menu.addEventListener('click', function (e) {
      var btn = e.target.closest('.jd-side-menu__row');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      closeMenu();
      runAction(act, sessionId);
    });
    openMenu = menu;
    setTimeout(function () { document.addEventListener('pointerdown', onDocDown, true); }, 0);
  }

  function runAction(act, sessionId) {
    try {
      if (act === 'rename' && typeof window.renameChatSession === 'function') {
        window.renameChatSession(sessionId, null);
      } else if (act === 'pin') {
        togglePinAndRefresh(sessionId);
      } else if (act === 'delete' && typeof window.deleteChatSession === 'function') {
        window.deleteChatSession(sessionId, null);
      }
    } catch (e) {}
  }

  /* Pin like the Muse app: toggle the flag, persist, then re-render
     the sidebar so pinned items jump to the top with a pin badge. */
  function togglePinAndRefresh(sessionId) {
    try {
      if (typeof window.togglePinSession === 'function') {
        window.togglePinSession(sessionId, null);
      } else {
        var s = getSession(sessionId);
        if (s) {
          s.pinned = !s.pinned;
          if (typeof window.saveSessions === 'function') window.saveSessions();
        }
      }
      refreshSidebarList();
      var session = getSession(sessionId);
      if (typeof window.showModernToast === 'function') {
        window.showModernToast(session && session.pinned ? 'Pinned to top' : 'Unpinned');
      }
    } catch (e) {}
  }

  /* Re-render the sidebar list with pinned items on top. */
  function refreshSidebarList() {
    try {
      if (typeof window.renderSidebarHistory === 'function') {
        window.renderSidebarHistory();
      } else if (typeof window.renderChatHistory === 'function') {
        window.renderChatHistory();
      }
      // Ensure pinned-first ordering even if the app's renderer doesn't do it.
      setTimeout(orderPinnedFirst, 50);
    } catch (e) {}
  }

  function orderPinnedFirst() {
    try {
      var list = document.getElementById('chatHistoryList');
      if (!list) return;
      var items = Array.prototype.slice.call(list.querySelectorAll('.history-item'));
      if (!items.length) return;
      var pinned = [], rest = [];
      items.forEach(function (item) {
        var sid = item.getAttribute('data-session-id');
        var s = getSession(sid);
        if (s && s.pinned) pinned.push(item);
        else rest.push(item);
      });
      if (!pinned.length) return;
      pinned.concat(rest).forEach(function (item) { list.appendChild(item); });
      // Add a pin badge to pinned items.
      pinned.forEach(function (item) {
        if (!item.querySelector('.jd-pin-badge')) {
          var badge = document.createElement('span');
          badge.className = 'jd-pin-badge';
          badge.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/></svg>';
          badge.style.cssText = 'margin-left:6px;opacity:.6;flex:none;display:inline-flex';
          var text = item.querySelector('.history-item-text');
          if (text) text.appendChild(badge);
          else item.appendChild(badge);
        }
      });
      // Remove badges from unpinned items.
      rest.forEach(function (item) {
        var b = item.querySelector('.jd-pin-badge');
        if (b) b.remove();
      });
    } catch (e) {}
  }

  /* Long-press wiring on the sidebar history list.
     Also wires the ⋮ (three-dots) trigger button on each item to open
     the same Muse-style menu. */
  var lpTimer = null, lpPos = null;
  function clearLp() {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    lpPos = null;
  }
  function wireDots() {
    try {
      var list = document.getElementById('chatHistoryList');
      if (!list) return;
      list.querySelectorAll('.jd-history-actions-trigger').forEach(function (btn) {
        if (btn.__jdMenuWired) return;
        btn.__jdMenuWired = true;
        // Kill the old inline handler so the old action deck never opens.
        btn.removeAttribute('onclick');
        btn.onclick = null;
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          e.preventDefault();
          var item = btn.closest('.history-item');
          var sid = item && item.getAttribute('data-session-id');
          if (sid) {
            var r = btn.getBoundingClientRect();
            showMenu(Math.max(10, r.left - 200), r.bottom + 6, sid);
          }
        });
      });
    } catch (e) {}
  }
  function wire() {
    var list = document.getElementById('chatHistoryList');
    if (!list || list.__jdSideMenuWired) return;
    list.__jdSideMenuWired = true;

    list.addEventListener('touchstart', function (e) {
      var t = (e.touches && e.touches[0]) || null;
      var item = e.target && e.target.closest ? e.target.closest('.history-item') : null;
      if (!t || !item) return;
      var sid = item.getAttribute('data-session-id');
      if (!sid) return;
      clearLp();
      lpPos = { x: t.clientX, y: t.clientY, sid: sid };
      lpTimer = setTimeout(function () {
        lpTimer = null;
        var p = lpPos; lpPos = null;
        if (p) showMenu(p.x, p.y, p.sid);
      }, 450);
    }, { passive: true });
    list.addEventListener('touchmove', function (e) {
      var t = (e.touches && e.touches[0]) || null;
      if (t && lpPos && lpTimer) {
        var dx = t.clientX - lpPos.x, dy = t.clientY - lpPos.y;
        if (dx * dx + dy * dy > 144) clearLp();
      }
    }, { passive: true });
    list.addEventListener('touchend', clearLp, { passive: true });
    list.addEventListener('touchcancel', clearLp, { passive: true });
    list.addEventListener('contextmenu', function (e) {
      var item = e.target && e.target.closest ? e.target.closest('.history-item') : null;
      if (!item) return;
      e.preventDefault();
      var sid = item.getAttribute('data-session-id');
      if (sid) showMenu(e.clientX, e.clientY, sid);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
  // The list re-renders; re-wire when it appears and keep pinned on top.
  var tries = 0;
  var iv = setInterval(function () {
    wire();
    wireDots();
    orderPinnedFirst();
    if (++tries > 40) clearInterval(iv);
  }, 500);
  try {
    new MutationObserver(function () { wireDots(); orderPinnedFirst(); })
      .observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}

  window.__jdSideMenu = { show: showMenu, close: closeMenu };
})();
