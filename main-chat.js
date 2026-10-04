/* JepongDevxyz AI — Notification Center (2026-10-05)
   Changed from persistent Main Chat to notification-only center per user order:
   - The "JepongDevxyz AI" home button opens a NOTIFICATION PANEL (read-only list)
   - It does NOT appear in the Conversations list (hidden via observer + CSS)
   - You CANNOT chat in it — it's notifications only, like Muse's notification center
   - All notifications (goals, battery, etc.) route here
   - "Let's do it" from Goals now opens a NEW conversation (not here)
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdMainChat) return;
  window.__jdMainChat = true;

  var MAIN_ID = 'jd_main_chat';
  var MAIN_TITLE = 'JepongDevxyz AI';
  var LS_NOTIFS = 'jd_notifications_v1';
  var LS_UNREAD = 'jd_main_chat_unread';

  var CSS = [
    '.jd-main-chat-btn{position:relative}',
    '.jd-main-chat-btn.jd-active{background:rgba(255,255,255,.12)!important;font-weight:700}',
    '.jd-main-chat-btn .jd-main-dot{position:absolute;top:10px;right:10px;width:8px;height:8px;',
    'border-radius:50%;background:#ff9f0a;display:none}',
    '.jd-main-chat-btn.jd-has-unread .jd-main-dot{display:block}',
    'body.theme-light .jd-main-chat-btn.jd-active{background:rgba(0,0,0,.07)!important}',
    /* Hide the jd_main_chat session from Conversations list */
    '[data-jd-hide-main-chat]{display:none!important}',
    '.jd-notif-panel{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;background:#000}',
    'body.theme-light .jd-notif-panel{background:#fff}',
    '.jd-notif-header{display:flex;align-items:center;gap:12px;padding:16px;border-bottom:1px solid rgba(255,255,255,.1)}',
    'body.theme-light .jd-notif-header{border-bottom-color:rgba(0,0,0,.1)}',
    '.jd-notif-header h2{margin:0;font-size:1.2rem;flex:1}',
    '.jd-notif-close{background:none;border:none;font-size:1.5rem;cursor:pointer;color:inherit}',
    '.jd-notif-list{flex:1;overflow-y:auto;padding:16px}',
    '.jd-notif-item{padding:12px;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer}',
    'body.theme-light .jd-notif-item{border-bottom-color:rgba(0,0,0,.08)}',
    '.jd-notif-item-title{font-weight:600;margin-bottom:4px}',
    '.jd-notif-item-body{font-size:.9rem;opacity:.8}',
    '.jd-notif-item-time{font-size:.75rem;opacity:.5;margin-top:4px}',
    '.jd-notif-empty{text-align:center;opacity:.5;padding:40px 20px}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdMainChatCss')) return;
    var st = document.createElement('style');
    st.id = 'jdMainChatCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function getNotifs() {
    try { return JSON.parse(localStorage.getItem(LS_NOTIFS) || '[]'); }
    catch (e) { return []; }
  }
  function setNotifs(list) {
    try { localStorage.setItem(LS_NOTIFS, JSON.stringify(list.slice(0, 100))); } catch (e) {}
  }

  /* Hide jd_main_chat from Conversations list */
  function hideFromSidebar() {
    try {
      /* Find conversation items and hide the one for jd_main_chat */
      var items = document.querySelectorAll('[onclick*="jd_main_chat"], [data-session-id="jd_main_chat"]');
      items.forEach(function (el) {
        /* Don't hide the main button itself, only conversation list items */
        if (el.id === 'jdMainChatBtn') return;
        el.setAttribute('data-jd-hide-main-chat', '1');
      });
      /* Also check by title text in conversations section */
      var convSection = document.querySelector('.conversations-list, #conversationsList, [class*="conversation-list"]');
      if (convSection) {
        var allItems = convSection.querySelectorAll('button, div[role="button"], li');
        allItems.forEach(function (el) {
          var txt = (el.textContent || '').trim();
          if (txt === MAIN_TITLE && el.id !== 'jdMainChatBtn') {
            /* Verify it's not the main button by checking parent */
            var isMainBtn = el.closest('#jdMainChatBtn') || el.id === 'jdMainChatBtn';
            if (!isMainBtn) el.setAttribute('data-jd-hide-main-chat', '1');
          }
        });
      }
    } catch (e) {}
  }

  function openNotifPanel() {
    closeNotifPanel();
    ensureCSS();
    var panel = document.createElement('div');
    panel.id = 'jdNotifPanel';
    panel.className = 'jd-notif-panel';
    var notifs = getNotifs();
    var html = '<div class="jd-notif-header">' +
      '<h2>🔔 Notifications</h2>' +
      '<button class="jd-notif-close" id="jdNotifClose">×</button></div>' +
      '<div class="jd-notif-list">';
    if (!notifs.length) {
      html += '<div class="jd-notif-empty">No notifications yet</div>';
    } else {
      notifs.forEach(function (n, i) {
        var time = new Date(n.at).toLocaleString();
        html += '<div class="jd-notif-item" data-idx="' + i + '">' +
          '<div class="jd-notif-item-title">' + escapeHtml(n.title) + '</div>' +
          '<div class="jd-notif-item-body">' + escapeHtml(n.body) + '</div>' +
          '<div class="jd-notif-item-time">' + escapeHtml(time) + '</div></div>';
      });
    }
    html += '</div>';
    panel.innerHTML = html;
    document.body.appendChild(panel);
    document.getElementById('jdNotifClose').addEventListener('click', closeNotifPanel);
    markRead();
  }

  function closeNotifPanel() {
    var p = document.getElementById('jdNotifPanel');
    if (p) p.remove();
  }

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function markRead() {
    var btn = document.getElementById('jdMainChatBtn');
    if (btn) btn.classList.remove('jd-has-unread');
    try { localStorage.setItem(LS_UNREAD, '0'); } catch (e) {}
  }
  function markUnread() {
    var btn = document.getElementById('jdMainChatBtn');
    if (btn) btn.classList.add('jd-has-unread');
    try { localStorage.setItem(LS_UNREAD, '1'); } catch (e) {}
  }

  function addButton() {
    if (document.getElementById('jdMainChatBtn')) return;
    ensureCSS();
    /* Find the sidebar menu and replace "New conversation" */
    var newConvBtn = document.querySelector('[onclick*="createNewChat"], [onclick*="newChat"]');
    if (!newConvBtn) return;
    var btn = document.createElement('button');
    btn.id = 'jdMainChatBtn';
    btn.className = newConvBtn.className + ' jd-main-chat-btn';
    btn.innerHTML = '<span class="jd-main-dot"></span>' +
      '<i data-lucide="home"></i><span>' + MAIN_TITLE + '</span>';
    btn.addEventListener('click', function () {
      openNotifPanel();
      if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
    });
    newConvBtn.parentNode.replaceChild(btn, newConvBtn);
    try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) {}
    if (localStorage.getItem(LS_UNREAD) === '1') btn.classList.add('jd-has-unread');
  }

  function init() {
    addButton();
    hideFromSidebar();
    /* Watch for sidebar re-renders */
    try {
      var obs = new MutationObserver(function () { hideFromSidebar(); });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
    /* Also hide on interval as backup */
    setInterval(hideFromSidebar, 2000);
  }

  window.JDMainChat = {
    open: openNotifPanel,
    notifyInChat: function (title, body) {
      /* Add to notification list (not a chat) */
      try {
        var notifs = getNotifs();
        notifs.unshift({ title: title, body: body, at: Date.now() });
        setNotifs(notifs);
        markUnread();
      } catch (e) {}
    },
    /* Legacy: sendAsUser now opens a NEW conversation (notification center is not chattable) */
    sendAsUser: function (text) {
      try {
        if (typeof window.createNewChat === 'function') {
          window.createNewChat();
          setTimeout(function () {
            var input = document.getElementById('userInput');
            if (input) {
              input.value = text;
              try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (e) {}
              if (typeof window.sendMessage === 'function') window.sendMessage();
            }
          }, 800);
        }
      } catch (e) {}
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
