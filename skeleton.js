/* JepongDevxyz AI — Global Skeleton Loaders (2026-10-01)
   Beautiful shimmering skeleton placeholders throughout the app:
   - Chat: skeleton bubble while AI is generating (replaces plain "thinking")
   - Model picker: skeletons while models load
   - Connectors: skeletons while list loads
   - Plugins: skeletons while plugins load
   - Library: skeletons (unified with existing)
   - Image generation: skeleton while generating
   - Generic: window.jdSkeleton.show(el, type) / .hide(el)
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdSkeleton) return;
  window.__jdSkeleton = true;

  var CSS = [
    /* Base shimmer */
    '@keyframes jdSkShimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}',
    '.jd-sk{background:linear-gradient(90deg,rgba(128,128,128,.12) 25%,rgba(128,128,128,.22) 37%,rgba(128,128,128,.12) 63%);',
    'background-size:800px 100%;animation:jdSkShimmer 1.4s ease-in-out infinite;border-radius:8px}',
    'body.theme-light .jd-sk{background:linear-gradient(90deg,rgba(0,0,0,.06) 25%,rgba(0,0,0,.12) 37%,rgba(0,0,0,.06) 63%);background-size:800px 100%}',
    /* Chat bubble skeleton */
    '.jd-sk-chat{display:flex;gap:12px;padding:16px 0;max-width:100%}',
    '.jd-sk-avatar{width:32px;height:32px;border-radius:50%;flex:0 0 auto}',
    '.jd-sk-body{flex:1;min-width:0}',
    '.jd-sk-line{height:14px;margin-bottom:10px}',
    '.jd-sk-line:last-child{margin-bottom:0}',
    /* Card skeleton */
    '.jd-sk-card{border-radius:16px;padding:16px}',
    /* List row skeleton */
    '.jd-sk-row{display:flex;align-items:center;gap:12px;padding:12px 0}',
    '.jd-sk-row .jd-sk{border-radius:12px}',
    /* Grid skeleton */
    '.jd-sk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}',
    /* Image skeleton */
    '.jd-sk-img{width:100%;aspect-ratio:1;border-radius:12px}',
    /* Text block skeleton */
    '.jd-sk-text{padding:4px 0}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdSkeletonCss')) return;
    var st = document.createElement('style');
    st.id = 'jdSkeletonCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------- Builders ---------- */
  function chatSkeleton() {
    return '<div class="jd-sk-chat">' +
      '<div class="jd-sk jd-sk-avatar"></div>' +
      '<div class="jd-sk-body">' +
      '<div class="jd-sk jd-sk-line" style="width:92%"></div>' +
      '<div class="jd-sk jd-sk-line" style="width:78%"></div>' +
      '<div class="jd-sk jd-sk-line" style="width:85%"></div>' +
      '<div class="jd-sk jd-sk-line" style="width:60%"></div>' +
      '</div></div>';
  }

  function cardSkeleton(n) {
    n = n || 3;
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="jd-sk jd-sk-card" style="height:80px;margin-bottom:12px"></div>';
    }
    return h;
  }

  function listSkeleton(n) {
    n = n || 4;
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="jd-sk-row">' +
        '<div class="jd-sk" style="width:44px;height:44px"></div>' +
        '<div style="flex:1"><div class="jd-sk jd-sk-line" style="width:70%"></div>' +
        '<div class="jd-sk jd-sk-line" style="width:45%;height:11px"></div></div></div>';
    }
    return h;
  }

  function gridSkeleton(n) {
    n = n || 6;
    var h = '<div class="jd-sk-grid">';
    for (var i = 0; i < n; i++) h += '<div class="jd-sk jd-sk-img"></div>';
    h += '</div>';
    return h;
  }

  /* ---------- Initial page-load skeleton ---------- */
  /* Shows immediately on refresh, removed when app is ready. */
  function showPageSkeleton() {
    ensureCSS();
    if (document.getElementById('jdPageSkeleton')) return;
    var sk = document.createElement('div');
    sk.id = 'jdPageSkeleton';
    sk.innerHTML =
      '<style>' +
      '#jdPageSkeleton{position:fixed;inset:0;z-index:99999;background:var(--bg,#0a0a0c);' +
      'display:flex;flex-direction:column;padding:0;transition:opacity .3s}' +
      'body.theme-light #jdPageSkeleton{background:#fff}' +
      '#jdPageSkeleton .jdps-head{display:flex;align-items:center;gap:12px;padding:16px}' +
      '#jdPageSkeleton .jdps-chat{flex:1;padding:16px;overflow:hidden}' +
      '#jdPageSkeleton .jdps-comp{padding:16px}' +
      '#jdPageSkeleton.hide{opacity:0;pointer-events:none}' +
      '</style>' +
      '<div class="jdps-head">' +
      '<div class="jd-sk" style="width:40px;height:40px;border-radius:50%"></div>' +
      '<div style="flex:1"><div class="jd-sk jd-sk-line" style="width:40%;height:16px"></div></div>' +
      '<div class="jd-sk" style="width:40px;height:40px;border-radius:12px"></div>' +
      '</div>' +
      '<div class="jdps-chat">' +
      '<div class="jd-sk-chat"><div class="jd-sk jd-sk-avatar"></div>' +
      '<div class="jd-sk-body"><div class="jd-sk jd-sk-line" style="width:85%"></div>' +
      '<div class="jd-sk jd-sk-line" style="width:70%"></div></div></div>' +
      '<div class="jd-sk-chat" style="flex-direction:row-reverse"><div class="jd-sk-body">' +
      '<div class="jd-sk jd-sk-line" style="width:75%;margin-left:auto"></div></div></div>' +
      '<div class="jd-sk-chat"><div class="jd-sk jd-sk-avatar"></div>' +
      '<div class="jd-sk-body"><div class="jd-sk jd-sk-line" style="width:90%"></div>' +
      '<div class="jd-sk jd-sk-line" style="width:65%"></div>' +
      '<div class="jd-sk jd-sk-line" style="width:80%"></div></div></div>' +
      '</div>' +
      '<div class="jdps-comp"><div class="jd-sk" style="height:56px;border-radius:28px"></div></div>';
    document.documentElement.appendChild(sk);
  }

  function hidePageSkeleton() {
    var sk = document.getElementById('jdPageSkeleton');
    if (!sk) return;
    sk.classList.add('hide');
    setTimeout(function () { try { sk.remove(); } catch (e) {} }, 350);
  }

  /* ---------- Public API ---------- */
  window.jdSkeleton = {
    show: function (el, type, count) {
      ensureCSS();
      if (!el) return null;
      var sk = document.createElement('div');
      sk.className = 'jd-skeleton-wrap';
      sk.setAttribute('data-jd-sk', '1');
      if (type === 'chat') sk.innerHTML = chatSkeleton();
      else if (type === 'card') sk.innerHTML = cardSkeleton(count);
      else if (type === 'list') sk.innerHTML = listSkeleton(count);
      else if (type === 'grid') sk.innerHTML = gridSkeleton(count);
      else sk.innerHTML = '<div class="jd-sk" style="height:60px"></div>';
      el.appendChild(sk);
      return sk;
    },
    hide: function (el) {
      if (!el) return;
      el.querySelectorAll('[data-jd-sk]').forEach(function (s) { s.remove(); });
    },
    chat: chatSkeleton,
    card: cardSkeleton,
    list: listSkeleton,
    grid: gridSkeleton
  };

  /* ---------- Auto-apply to known loading states ---------- */

  /* 1. Chat: show skeleton bubble when AI starts generating */
  var chatSkEl = null;
  function keepActivityBeforeSkeleton(chatBox) {
    try {
      var activeIndicator = document.getElementById('activeAiIndicator');
      var skeleton = chatBox && chatBox.querySelector('.jd-sk-msg[data-jd-sk="1"]');
      if (!activeIndicator || !skeleton || activeIndicator.parentNode !== chatBox || skeleton.parentNode !== chatBox) return;
      var children = Array.prototype.slice.call(chatBox.children || []);
      if (children.indexOf(activeIndicator) > children.indexOf(skeleton)) {
        chatBox.insertBefore(activeIndicator, skeleton);
      }
    } catch (e) {}
  }

  function watchChat() {
    // Watch for the "thinking" indicator or generating state
    var mo = new MutationObserver(function () {
      try {
        var generating = false;
        if (typeof isAIGenerating !== 'undefined') generating = !!isAIGenerating;
        var chatBox = document.getElementById('chatBox') || document.querySelector('.chat-box');

        if (generating && chatBox) {
          if (!chatSkEl) {
            // Check if there's already a bot message being streamed
            var lastBot = chatBox.querySelector('.msg.bot:last-child');
            var isStreaming = lastBot && lastBot.textContent.trim().length > 0;
            if (!isStreaming) {
              chatSkEl = document.createElement('div');
              chatSkEl.className = 'msg bot jd-sk-msg';
              chatSkEl.setAttribute('data-jd-sk', '1');
              chatSkEl.innerHTML = chatSkeleton();
              // Activity is created by the chat renderer, not by this watcher.
              // Place the skeleton in a fixed slot below it regardless of which
              // async startup callback ran first, and let Activity own scrolling.
              var activeIndicator = document.getElementById('activeAiIndicator');
              if (activeIndicator && activeIndicator.parentNode === chatBox) {
                chatBox.insertBefore(chatSkEl, activeIndicator.nextSibling);
              } else {
                chatBox.appendChild(chatSkEl);
              }
            }
          }
          // Keep repairing the order for the whole generation, even after the
          // one skeleton node exists: activity updates can append/move it later.
          keepActivityBeforeSkeleton(chatBox);
        } else if (!generating && chatSkEl) {
          try { chatSkEl.remove(); } catch (e) {}
          chatSkEl = null;
        }
        // If a real bot message appeared, remove skeleton
        if (chatSkEl && chatBox) {
          var bots = chatBox.querySelectorAll('.msg.bot:not(.jd-sk-msg)');
          if (bots.length) {
            var lastReal = bots[bots.length - 1];
            if (lastReal.textContent.trim().length > 10) {
              try { chatSkEl.remove(); } catch (e2) {}
              chatSkEl = null;
            }
          }
        }
      } catch (e) {}
    });
    if (document.body) mo.observe(document.body, { childList: true, subtree: true });
    setInterval(function () {
      try {
        var gen = (typeof isAIGenerating !== 'undefined') ? !!isAIGenerating : false;
        if (!gen && chatSkEl) { try { chatSkEl.remove(); } catch (e) {} chatSkEl = null; }
      } catch (e2) {}
    }, 1000);
  }

  /* 2. Generic: add skeletons to empty containers that are loading */
  function watchContainers() {
    var selectors = [
      { sel: '#modelPagesTrack', type: 'card', count: 3 },
      { sel: '#connectorsList', type: 'list', count: 4 },
      { sel: '#pluginsGrid', type: 'grid', count: 6 }
    ];
    setInterval(function () {
      selectors.forEach(function (s) {
        try {
          var el = document.querySelector(s.sel);
          if (!el || el.querySelector('[data-jd-sk]')) return;
          // If empty and visible, show skeleton briefly
          if (el.children.length === 0 && el.offsetParent !== null) {
            window.jdSkeleton.show(el, s.type, s.count);
            setTimeout(function () { window.jdSkeleton.hide(el); }, 3000);
          } else if (el.children.length > 0) {
            window.jdSkeleton.hide(el);
          }
        } catch (e) {}
      });
    }, 1500);
  }

  function init() {
    ensureCSS();
    // Page skeleton DISABLED (2026-10-02): agent.js initial skeleton is the ONLY page skeleton now
    // showPageSkeleton(); // <-- disabled per user request
    watchChat();
    watchContainers();
    // Hide when app is ready
    var hideAttempts = 0;
    var hideTimer = setInterval(function () {
      hideAttempts++;
      // App is ready when chat box exists and has content, or after 5s max
      // (page skeleton hide logic kept for safety but showPageSkeleton is disabled above)
      var chatBox = document.getElementById('chatBox') || document.querySelector('.chat-box');
      var ready = (chatBox && chatBox.children.length > 0) || hideAttempts >= 25;
      if (ready) {
        clearInterval(hideTimer);
        // Small delay for smooth transition
        setTimeout(hidePageSkeleton, 400);
      }
    }, 200);
    // Failsafe: always hide after 8s
    setTimeout(function () {
      clearInterval(hideTimer);
      hidePageSkeleton();
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
