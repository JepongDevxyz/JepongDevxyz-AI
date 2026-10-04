/* JepongDevxyz AI — Feed / Daily Digest (2026-10-04)
   Muse-style Feed tab for the web app:
   - Sidebar "Feed" entry (below the main chat button) opens a full-screen
     digest page
   - Sections: Today's briefing, Goal progress, Streaks, Recent activity,
     Notifications log
   - All data is computed locally from goals + timeline entries
   - Theme-aware (dark/light), pull-to-refresh via the refresh button
   - Tapping a goal card opens it in the Goals page
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdFeed) return;
  window.__jdFeed = true;

  var CSS = [
    '#jdFeedPage{position:fixed;inset:0;z-index:24500;background:#0a0a0c;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdFeedPage[hidden]{display:none!important}',
    '.jdf-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdf-back,.jdf-refresh{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdf-back:active,.jdf-refresh:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdf-back svg,.jdf-refresh svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdf-title{font-size:1.05rem;font-weight:600}',
    '.jdf-date{font-size:.75rem;color:#888;text-align:center;margin-top:-6px;padding-bottom:8px}',
    '.jdf-scroll{flex:1;overflow-y:auto;padding:8px 16px 100px;-webkit-overflow-scrolling:touch}',
    '.jdf-sec{font-size:.8rem;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.06em;margin:18px 0 10px}',
    '.jdf-card{background:#1e1e1e;border-radius:16px;padding:14px 16px;margin-bottom:10px}',
    '.jdf-card-title{font-size:.92rem;font-weight:600;margin-bottom:4px}',
    '.jdf-card-body{font-size:.84rem;color:#bbb;line-height:1.5;white-space:pre-line}',
    '.jdf-goalrow{display:flex;align-items:center;gap:10px;background:#1e1e1e;border-radius:14px;',
    'padding:12px 14px;margin-bottom:8px;cursor:pointer}',
    '.jdf-goal-emoji{font-size:1.4rem}',
    '.jdf-goal-info{flex:1;min-width:0}',
    '.jdf-goal-title{font-size:.88rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdf-goal-sub{font-size:.74rem;color:#888;margin-top:2px}',
    '.jdf-mini-bar{height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:6px}',
    '.jdf-mini-fill{height:100%;border-radius:3px;background:#fff}',
    '.jdf-streak{display:inline-flex;align-items:center;gap:6px;background:rgba(255,159,10,.12);color:#ff9f0a;',
    'border-radius:20px;padding:8px 14px;font-size:.84rem;font-weight:700;margin:0 8px 8px 0}',
    '.jdf-empty{color:#777;font-size:.85rem;padding:8px 4px}',
    '.jdf-notif{display:flex;gap:10px;background:#1e1e1e;border-radius:14px;padding:12px 14px;margin-bottom:8px}',
    '.jdf-notif-ico{font-size:1.2rem;flex:0 0 auto}',
    '.jdf-notif-body{flex:1;min-width:0}',
    '.jdf-notif-title{font-size:.85rem;font-weight:600;margin-bottom:2px}',
    '.jdf-notif-text{font-size:.8rem;color:#aaa;line-height:1.4}',
    /* Light mode */
    'body.theme-light #jdFeedPage{background:#f2f2f5;color:#111}',
    'body.theme-light .jdf-back,body.theme-light .jdf-refresh{color:#111}',
    'body.theme-light .jdf-card,body.theme-light .jdf-goalrow,body.theme-light .jdf-notif{background:#fff;color:#111;box-shadow:0 1px 6px rgba(0,0,0,.07)}',
    'body.theme-light .jdf-card-body,body.theme-light .jdf-goal-sub{color:#666}',
    'body.theme-light .jdf-notif-text{color:#777}',
    'body.theme-light .jdf-mini-bar{background:rgba(0,0,0,.08)}',
    'body.theme-light .jdf-mini-fill{background:#111}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    news: '<svg viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V9"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>'
  };

  function ensureCSS() {
    if (document.getElementById('jdfCss')) return;
    var st = document.createElement('style');
    st.id = 'jdfCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function goals() {
    try { return (window.__jdGoalsList || []).slice(); } catch (e) { return []; }
  }
  function entries() {
    try { return JSON.parse(localStorage.getItem('jd_goal_entries_v2') || '[]'); }
    catch (e) { return []; }
  }
  function notifLog() {
    /* main-chat notification messages double as the notification log */
    try {
      var cs = (typeof chatSessions !== 'undefined' && chatSessions) ? chatSessions : (window.chatSessions || {});
      var s = cs['jd_main_chat'];
      if (s && s.messages) {
        return s.messages.filter(function (m) { return m.isNotification; }).slice(-20).reverse();
      }
    } catch (e) {}
    return [];
  }
  function streakOf(gid) {
    try {
      if (window.__jdProactiveApi) return window.__jdProactiveApi.streakOf(gid);
    } catch (e) {}
    return 0;
  }
  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }

  function render() {
    var box = document.getElementById('jdfBody');
    if (!box) return;
    var list = goals();
    var act = list.filter(function (g) { return g.status === 'active'; });
    var done = list.filter(function (g) { return g.status === 'completed'; });
    var es = entries().sort(function (a, b) { return new Date(b.effective_at) - new Date(a.effective_at); }).slice(0, 5);
    var notifs = notifLog();
    var habits = act.map(function (g) { return { g: g, s: streakOf(g.id) }; }).filter(function (x) { return x.s > 0; });

    var totalProg = act.length
      ? Math.round(act.reduce(function (a, g) { return a + (g.progress || 0); }, 0) / act.length)
      : 0;

    var html = '';

    /* Overview */
    html += '<div class="jdf-sec">Today</div>';
    html += '<div class="jdf-card"><div class="jdf-card-title">' + esc(greeting()) + ' ☀️</div>' +
      '<div class="jdf-card-body">' +
      '📋 ' + act.length + ' active goal' + (act.length === 1 ? '' : 's') + '\n' +
      '✅ ' + done.length + ' completed\n' +
      '📊 Average progress: ' + totalProg + '%' +
      '</div></div>';

    /* Streaks */
    if (habits.length) {
      html += '<div class="jdf-sec">Streaks</div><div>';
      habits.forEach(function (x) {
        html += '<span class="jdf-streak">🔥 ' + x.s + 'd · ' + esc(x.g.title) + '</span>';
      });
      html += '</div>';
    }

    /* Goals */
    html += '<div class="jdf-sec">Goals</div>';
    if (!act.length) {
      html += '<div class="jdf-empty">No active goals. Create one from the Goals page.</div>';
    } else {
      act.forEach(function (g) {
        html += '<div class="jdf-goalrow" data-id="' + esc(g.id) + '">' +
          '<span class="jdf-goal-emoji">' + esc(g.emoji || '🎯') + '</span>' +
          '<div class="jdf-goal-info"><div class="jdf-goal-title">' + esc(g.title) + '</div>' +
          '<div class="jdf-goal-sub">' + (g.progress || 0) + '% complete' +
          (g.target_date ? ' · 🎯 ' + esc(g.target_date) : '') + '</div>' +
          '<div class="jdf-mini-bar"><div class="jdf-mini-fill" style="width:' + (g.progress || 0) + '%"></div></div>' +
          '</div></div>';
      });
    }

    /* Recent activity */
    html += '<div class="jdf-sec">Recent activity</div>';
    if (!es.length) {
      html += '<div class="jdf-empty">No activity logged yet.</div>';
    } else {
      es.forEach(function (e) {
        var g = list.find(function (x) { return x.id === e.goal_id; });
        var dstr = '';
        try {
          dstr = new Date(e.effective_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        } catch (x) {}
        html += '<div class="jdf-card"><div class="jdf-card-title">' + esc(e.title) + '</div>' +
          '<div class="jdf-card-body">' + (g ? esc(g.title) + ' · ' : '') + esc(dstr) +
          (e.description ? '\n' + esc(e.description) : '') + '</div></div>';
      });
    }

    /* Notifications */
    html += '<div class="jdf-sec">Notifications</div>';
    if (!notifs.length) {
      html += '<div class="jdf-empty">No notifications yet.</div>';
    } else {
      notifs.forEach(function (m) {
        var txt = String(m.text || '').replace(/^🔔\s*\*\*/, '').replace(/\*\*/g, '');
        var title = 'Notification';
        var body = txt;
        var nl = txt.indexOf('\n');
        if (nl > 0) { title = txt.slice(0, nl).trim(); body = txt.slice(nl).trim(); }
        html += '<div class="jdf-notif"><span class="jdf-notif-ico">🔔</span>' +
          '<div class="jdf-notif-body"><div class="jdf-notif-title">' + esc(title) + '</div>' +
          '<div class="jdf-notif-text">' + esc(body).slice(0, 200) + '</div></div></div>';
      });
    }

    box.innerHTML = html;
    box.querySelectorAll('.jdf-goalrow').forEach(function (el) {
      el.addEventListener('click', function () {
        closeFeed();
        if (window.JDGoals) window.JDGoals.open();
      });
    });
  }

  function buildPage() {
    if (document.getElementById('jdFeedPage')) return;
    var p = document.createElement('div');
    p.id = 'jdFeedPage';
    p.hidden = true;
    var datestr = '';
    try {
      datestr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    } catch (e) {}
    p.innerHTML =
      '<div class="jdf-header">' +
      '<button class="jdf-back" id="jdfBack" aria-label="Back">' + I.back + '</button>' +
      '<div class="jdf-title">Feed</div>' +
      '<button class="jdf-refresh" id="jdfRefresh" aria-label="Refresh">' + I.refresh + '</button>' +
      '</div><div class="jdf-date">' + esc(datestr) + '</div>' +
      '<div class="jdf-scroll" id="jdfBody"></div>';
    document.body.appendChild(p);
    document.getElementById('jdfBack').addEventListener('click', closeFeed);
    document.getElementById('jdfRefresh').addEventListener('click', render);
  }
  function openFeed() {
    ensureCSS(); buildPage();
    document.getElementById('jdFeedPage').hidden = false;
    render();
  }
  function closeFeed() {
    var p = document.getElementById('jdFeedPage');
    if (p) p.hidden = true;
  }

  /* Sidebar entry under the main chat button */
  function addSidebarEntry() {
    if (document.getElementById('jdFeedBtn')) return;
    var iv = setInterval(function () {
      var main = document.getElementById('jdMainChatBtn');
      if (!main) return;
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdFeedBtn';
      btn.setAttribute('aria-label', 'Open feed');
      btn.innerHTML = '<i data-lucide="newspaper"></i><span>Feed</span>';
      btn.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openFeed();
      });
      main.parentNode.insertBefore(btn, main.nextSibling);
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
      clearInterval(iv);
    }, 1200);
    setTimeout(function () { clearInterval(iv); }, 30000);
  }

  window.JDFeed = { open: openFeed, close: closeFeed, render: render };

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
