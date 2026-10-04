/* JepongDevxyz AI — Main Chat (2026-10-04)
   Muse-app-style persistent Main chat, branded "JepongDevxyz AI":
   - Replaces the sidebar "New conversation" menu item with a
     "JepongDevxyz AI" main-chat entry (home icon, like Muse's Main chat)
   - The main chat is a persistent session (id 'jd_main_chat') that is
     never deleted and survives refreshes
   - All notifications (goals, battery, etc.) route here:
     notification taps navigate to the app with #main-chat, and the
     in-app banners call window.JDMainChat.open()
   - Exposes window.JDMainChat.open() for notification handlers
   Pure addition (one menu item replaced per explicit user order).
   Idempotent. */
(function () {
  'use strict';
  if (window.__jdMainChat) return;
  window.__jdMainChat = true;

  var MAIN_ID = 'jd_main_chat';
  var MAIN_TITLE = 'JepongDevxyz AI';

  var CSS = [
    '.jd-main-chat-btn{position:relative}',
    '.jd-main-chat-btn.jd-active{background:rgba(255,255,255,.12)!important;font-weight:700}',
    '.jd-main-chat-btn .jd-main-dot{position:absolute;top:10px;right:10px;width:8px;height:8px;',
    'border-radius:50%;background:#ff9f0a;display:none}',
    '.jd-main-chat-btn.jd-has-unread .jd-main-dot{display:block}',
    'body.theme-light .jd-main-chat-btn.jd-active{background:rgba(0,0,0,.07)!important}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdMainChatCss')) return;
    var st = document.createElement('style');
    st.id = 'jdMainChatCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function getSessions() {
    /* NOTE: the app declares `let chatSessions` (not window.chatSessions),
       so we must read the bare binding — window.chatSessions is undefined. */
    try {
      if (typeof chatSessions !== 'undefined' && chatSessions) return chatSessions;
    } catch (e) {}
    try { return window.chatSessions || {}; } catch (e) {}
    return {};
  }

  function ensureMainSession() {
    try {
      var sessions = getSessions();
      if (!sessions[MAIN_ID]) {
        sessions[MAIN_ID] = { id: MAIN_ID, title: MAIN_TITLE, messages: [], isMainChat: true };
        if (typeof window.saveSessions === 'function') window.saveSessions();
      } else {
        sessions[MAIN_ID].isMainChat = true;
        if (sessions[MAIN_ID].title !== MAIN_TITLE) sessions[MAIN_ID].title = MAIN_TITLE;
      }
      /* protect from cleanup routines that prune empty sessions */
      return sessions[MAIN_ID];
    } catch (e) { return null; }
  }

  function openMainChat() {
    ensureMainSession();
    try {
      if (typeof window.loadChatSession === 'function') {
        window.loadChatSession(MAIN_ID);
      } else if (typeof window.createNewChat === 'function') {
        /* fallback: create then rename — should not happen */
        window.createNewChat();
      }
      if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers();
      markRead();
      updateActive();
    } catch (e) {}
  }

  function markRead() {
    var btn = document.getElementById('jdMainChatBtn');
    if (btn) btn.classList.remove('jd-has-unread');
    try { localStorage.setItem('jd_main_chat_unread', '0'); } catch (e) {}
  }
  function markUnread() {
    var btn = document.getElementById('jdMainChatBtn');
    if (btn) btn.classList.add('jd-has-unread');
    try { localStorage.setItem('jd_main_chat_unread', '1'); } catch (e) {}
  }

  function currentId() {
    /* currentSessionId is also a `let` binding, not a window property */
    try {
      if (typeof currentSessionId !== 'undefined') return currentSessionId || null;
    } catch (e) {}
    try { return window.currentSessionId || null; } catch (e) {}
    return null;
  }

  function updateActive() {
    var btn = document.getElementById('jdMainChatBtn');
    if (!btn) return;
    btn.classList.toggle('jd-active', currentId() === MAIN_ID);
  }

  /* Default landing: fresh page loads open the main chat (like Muse's app).
     Respects deep links (#main-chat handled separately, other hashes left alone). */
  function defaultToMain() {
    try {
      if (location.hash && location.hash.length > 1) return;
      ensureMainSession();
      if (currentId() !== MAIN_ID && typeof window.loadChatSession === 'function') {
        window.loadChatSession(MAIN_ID);
      }
    } catch (e) {}
  }

  function replaceMenuItem() {
    if (document.getElementById('jdMainChatBtn')) return true;
    /* find the "New conversation" menu item inside .jd-sidebar-menu-actions */
    var actions = document.querySelector('.jd-sidebar-menu-actions');
    if (!actions) return false;
    var btns = actions.querySelectorAll('button.jd-sidebar-menu-item');
    var target = null;
    for (var i = 0; i < btns.length; i++) {
      var txt = (btns[i].textContent || '').toLowerCase();
      var oc = btns[i].getAttribute('onclick') || '';
      if (txt.indexOf('new conversation') >= 0 || oc.indexOf('createNewChat') >= 0) {
        target = btns[i];
        break;
      }
    }
    if (!target) return false;
    var btn = document.createElement('button');
    btn.className = 'jd-sidebar-menu-item jd-main-chat-btn';
    btn.type = 'button';
    btn.id = 'jdMainChatBtn';
    btn.setAttribute('aria-label', 'JepongDevxyz AI main chat');
    btn.innerHTML = '<i data-lucide="house"></i><span>' + MAIN_TITLE + '</span><span class="jd-main-dot"></span>';
    btn.addEventListener('click', openMainChat);
    target.parentNode.replaceChild(btn, target);
    /* refresh lucide icons for the new <i data-lucide> */
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {}
    if (localStorage.getItem('jd_main_chat_unread') === '1') btn.classList.add('jd-has-unread');
    updateActive();
    return true;
  }

  function init() {
    ensureCSS();
    ensureMainSession();
    /* default landing first, so the switch happens ASAP */
    defaultToMain();
    if (!replaceMenuItem()) {
      var iv = setInterval(function () {
        if (replaceMenuItem()) clearInterval(iv);
      }, 1200);
      setTimeout(function () { clearInterval(iv); }, 30000);
    }
    /* deep-link: #main-chat opens the main chat (used by notification taps) */
    function checkHash() {
      try {
        if (location.hash === '#main-chat') {
          openMainChat();
          history.replaceState(null, '', location.pathname + location.search);
        }
      } catch (e) {}
    }
    window.addEventListener('hashchange', checkHash);
    setTimeout(checkHash, 800);
    /* keep the active highlight in sync */
    setInterval(updateActive, 2000);
  }

  window.JDMainChat = {
    open: openMainChat,
    id: MAIN_ID,
    markUnread: markUnread,
    markRead: markRead,
    sendAsUser: function (text) {
      /* Programmatically send a user message in the main chat (e.g. from Goals "Let's do it") */
      try {
        openMainChat();
        setTimeout(function () {
          try {
            var input = document.querySelector('textarea[jd-composer], #jdComposerInput, textarea[placeholder*="Message"], textarea');
            var sendBtn = document.querySelector('[jd-send], #jdSendBtn, button[aria-label*="Send"], button[aria-label*="send"]');
            if (input) {
              input.value = text;
              /* trigger input event so the app picks up the value */
              try {
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              } catch (e) {}
              /* fallback: click send button */
              setTimeout(function () {
                try {
                  if (sendBtn && input.value) sendBtn.click();
                } catch (e) {}
              }, 300);
            }
          } catch (e) {}
        }, 800);
      } catch (e) {}
    },
    notifyInChat: function (title, body) {
      /* append a system note to the main chat so notifications have a home */
      try {
        ensureMainSession();
        var sessions = getSessions();
        var s = sessions[MAIN_ID];
        if (s) {
          s.messages.push({
            role: 'assistant',
            text: '🔔 **' + title + '**\n\n' + body,
            at: Date.now(),
            isNotification: true
          });
          if (typeof window.saveSessions === 'function') window.saveSessions();
          /* if the user is currently viewing the main chat, re-render */
          try {
            if (window.currentSessionId === MAIN_ID && typeof window.loadChatSession === 'function') {
              window.loadChatSession(MAIN_ID);
            }
          } catch (e) {}
          markUnread();
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
