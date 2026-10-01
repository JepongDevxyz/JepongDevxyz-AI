/* Jampong Activity Logger - real-time activity feed (like Muse app)
   Logs real app actions to localStorage, displayed in profile Today/Yesterday.
   Also auto-updates SOUL/MEMORY when user tells AI to remember something.
*/
(function () {
  'use strict';
  if (window.__jdActivity) return;
  window.__jdActivity = true;

  var KEY = 'jd_jampong_activity';
  var SOUL_KEY = 'jd_jampong_soul';
  var MEM_KEY = 'jd_jampong_memory';

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50))); } catch (e) {}
  }

  // Log an activity: {title, desc, status, duration, steps, cmd, time}
  window.jdLogActivity = function (title, desc, opts) {
    opts = opts || {};
    var now = new Date();
    var list = load();
    list.unshift({
      title: title,
      desc: desc,
      status: opts.status || 'Allowed',
      duration: opts.duration || '00:01',
      cmd: opts.cmd || '',
      steps: opts.steps || [{ text: title, done: true }],
      ts: now.getTime()
    });
    save(list);
  };

  // Get activities grouped by Today/Yesterday
  window.jdGetActivity = function () {
    var list = load();
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var yestStart = todayStart - 86400000;
    var today = [], yesterday = [];
    list.forEach(function (a) {
      var d = new Date(a.ts);
      var h = d.getHours(), m = d.getMinutes();
      var ampm = h >= 12 ? 'pm' : 'am';
      h = h % 12 || 12;
      a.time = h + ':' + (m < 10 ? '0' + m : m) + ampm;
      if (a.ts >= todayStart) today.push(a);
      else if (a.ts >= yestStart) yesterday.push(a);
    });
    return { today: today, yesterday: yesterday };
  };

  // Auto MEMORY: detect "tandaan mo" / "remember" in user messages
  function checkAutoMemory(text) {
    if (!text) return;
    var lower = text.toLowerCase();
    var patterns = [
      /tandaan mo(?: na)?\s+(.+)/i,
      /remember(?: that)?\s+(.+)/i,
      /alalahanin mo\s+(.+)/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m && m[1] && m[1].trim().length > 3) {
        var mem = m[1].trim();
        try {
          var cur = localStorage.getItem(MEM_KEY) || '';
          var entry = '\n- ' + mem + ' (' + new Date().toLocaleDateString() + ')';
          if (cur.indexOf(mem.substring(0, 20)) === -1) {
            localStorage.setItem(MEM_KEY, cur + entry);
            window.jdLogActivity('Updated MEMORY.md', 'Auto-saved: "' + mem.substring(0, 40) + '..."', {
              status: 'Allowed',
              steps: [{ text: 'Detected remember request', done: true }, { text: 'Appended to MEMORY.md', done: true }]
            });
            if (typeof window.jdToast === 'function') window.jdToast('Saved to MEMORY.md');
          }
        } catch (e) {}
        break;
      }
    }
  }

  // Auto SOUL: detect preference statements
  function checkAutoSoul(text) {
    if (!text) return;
    var lower = text.toLowerCase();
    var patterns = [
      /gusto ko\s+(.+)/i,
      /i (?:like|prefer|want)\s+(.+)/i,
      /ayoko\s+(?:ng\s+)?(.+)/i
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = text.match(patterns[i]);
      if (m && m[1] && m[1].trim().length > 5 && lower.indexOf('tandaan') === -1) {
        // Only for clear preference statements, not questions
        if (lower.indexOf('?') === -1 && m[1].split(' ').length > 2) {
          var pref = m[1].trim();
          try {
            var cur = localStorage.getItem(SOUL_KEY) || '';
            if (cur.indexOf(pref.substring(0, 20)) === -1) {
              var entry = '\n- User preference: ' + pref;
              localStorage.setItem(SOUL_KEY, cur + entry);
              window.jdLogActivity('Updated SOUL.md', 'Auto-saved preference', {
                status: 'Allowed',
                steps: [{ text: 'Detected preference', done: true }, { text: 'Appended to SOUL.md', done: true }]
              });
            }
          } catch (e) {}
        }
        break;
      }
    }
  }

  // Hook into chat: watch for user messages
  function hookChat() {
    // Watch for sent messages via MutationObserver on chat container
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          // Check if it's a user message
          var isUser = node.classList && (
            node.classList.contains('user-msg') ||
            node.classList.contains('user-message') ||
            node.getAttribute('data-role') === 'user'
          );
          if (isUser) {
            var text = node.textContent || '';
            checkAutoMemory(text);
            checkAutoSoul(text);
          }
        });
      });
    });

    // Observe chat container when available
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      var chat = document.querySelector('#chatMessages, .chat-messages, #messages, main');
      if (chat || tries > 30) {
        if (chat) observer.observe(chat, { childList: true, subtree: true });
        clearInterval(iv);
      }
    }, 1000);

    // Also hook into send button if identifiable
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('#mainActionBtn, [data-action="send"], .send-btn');
      if (btn) {
        setTimeout(function () {
          var input = document.querySelector('#chatInput, textarea, [contenteditable]');
          if (input) {
            var text = input.value || input.textContent || '';
            if (text.trim()) {
              checkAutoMemory(text);
              checkAutoSoul(text);
            }
          }
        }, 500);
      }
    });
  }

  // Log key Jampong actions
  window.jdLogJampong = function (action) {
    var map = {
      'profile_open': ['Opened Jampong Profile', 'Viewed profile screen'],
      'share_open': ['Opened Share Avatar', 'Viewed avatar share cards'],
      'soul_view': ['Viewed SOUL.md', 'Opened SOUL file viewer'],
      'memory_view': ['Viewed MEMORY.md', 'Opened MEMORY file viewer'],
      'soul_save': ['Saved SOUL.md', 'Updated SOUL file content'],
      'memory_save': ['Saved MEMORY.md', 'Updated MEMORY file content']
    };
    var m = map[action];
    if (m) window.jdLogActivity(m[0], m[1], { status: 'Allowed' });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookChat);
  } else {
    hookChat();
  }
})();
