/* JepongDevxyz AI — Proactive Suite (2026-10-04)
   Muse-style proactive capabilities for the web app:
   1. Morning briefing (once/day ~8am): today's reminders, due-soon goals,
      active streaks — delivered to the main chat + notification
   2. Inactivity nudges: active goals with no timeline entry in 3+ days
      get one gentle nudge per day
   3. Streak tracking: habit-kind goals count consecutive days with
      entries; streaks are celebrated in the briefing and on milestones
   All output routes to the main chat (window.JDMainChat.notifyInChat)
   and fires a notification via the shared notify path.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdProactive) return;
  window.__jdProactive = true;

  var LS_BRIEF = 'jd_brief_last_v1';
  var LS_NUDGE = 'jd_nudge_log_v1';
  var CHECK_MS = 5 * 60 * 1000;

  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function lsGet(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function notify(title, body) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(function (reg) {
            reg.showNotification(title, { body: body, tag: 'jd-proactive', data: { url: location.origin + location.pathname + '#main-chat' } });
          }).catch(function () { new Notification(title, { body: body, tag: 'jd-proactive' }); });
        } else {
          new Notification(title, { body: body, tag: 'jd-proactive' });
        }
      }
    } catch (e) {}
  }
  function toMainChat(title, body) {
    try {
      if (window.JDMainChat) window.JDMainChat.notifyInChat(title, body);
    } catch (e) {}
  }
  function announce(title, body) {
    notify(title, body);
    toMainChat(title, body);
  }

  function goals() {
    try { return (window.__jdGoalsList || []).slice(); }
    catch (e) { return []; }
  }
  function entries() {
    try { return JSON.parse(localStorage.getItem('jd_goal_entries_v2') || '[]'); }
    catch (e) { return []; }
  }
  function lastEntryDate(goalId) {
    var es = entries().filter(function (e) { return e.goal_id === goalId; });
    if (!es.length) return null;
    es.sort(function (a, b) { return new Date(b.effective_at) - new Date(a.effective_at); });
    return new Date(es[0].effective_at);
  }
  function daysSince(d) {
    if (!d) return Infinity;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }

  /* ---------- Streaks (habit goals: consecutive days with entries) ---------- */
  function streakOf(goalId) {
    var es = entries().filter(function (e) { return e.goal_id === goalId; });
    if (!es.length) return 0;
    var days = {};
    es.forEach(function (e) {
      try {
        var d = new Date(e.effective_at);
        days[d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate()] = true;
      } catch (x) {}
    });
    var streak = 0;
    var cur = new Date();
    /* allow today to be missing (streak still alive until tomorrow) */
    var key = function (d) { return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };
    if (!days[key(cur)]) cur.setDate(cur.getDate() - 1);
    while (days[key(cur)]) { streak++; cur.setDate(cur.getDate() - 1); }
    return streak;
  }

  /* ---------- Morning briefing ---------- */
  function briefing() {
    var last = lsGet(LS_BRIEF, '');
    var today = todayStr();
    if (last === today) return;
    var now = new Date();
    if (now.getHours() < 7) return; /* wait until morning */
    var act = goals().filter(function (g) { return g.status === 'active'; });
    if (!act.length) { lsSet(LS_BRIEF, today); return; }

    var lines = [];
    var dueSoon = act.filter(function (g) {
      if (!g.target_date) return false;
      try {
        var diff = Math.round((new Date(g.target_date + 'T00:00:00') - now) / 86400000);
        return diff >= 0 && diff <= 7;
      } catch (e) { return false; }
    });
    var withReminders = act.filter(function (g) { return g.reminder_time; });
    var habits = act.filter(function (g) { return g.goal_kind === 'habit'; });

    lines.push('☀️ Good morning! Here is your goals briefing for today:');
    lines.push('');
    lines.push('📋 ' + act.length + ' active goal' + (act.length === 1 ? '' : 's'));
    dueSoon.forEach(function (g) {
      lines.push('⏳ "' + g.title + '" is due ' + g.target_date + ' (' + (g.progress || 0) + '%)');
    });
    withReminders.forEach(function (g) {
      lines.push('🔔 "' + g.title + '" reminder at ' + String(g.reminder_time).slice(0, 5));
    });
    habits.forEach(function (g) {
      var s = streakOf(g.id);
      if (s > 0) lines.push('🔥 "' + g.title + '" — ' + s + '-day streak! Keep it going.');
    });
    var idle = act.filter(function (g) { return daysSince(lastEntryDate(g.id)) >= 3; });
    idle.forEach(function (g) {
      var last = lastEntryDate(g.id);
      var detail = last
        ? 'has had no updates in ' + daysSince(last) + ' days'
        : 'has no progress logged yet';
      lines.push('💤 "' + g.title + '" ' + detail + ' — a small step today counts.');
    });
    if (!dueSoon.length && !withReminders.length && !habits.length && !idle.length) {
      lines.push('Everything is on track. Have a great day!');
    }
    lsSet(LS_BRIEF, today);
    announce('☀️ Morning briefing', lines.join('\n'));
  }

  /* ---------- Inactivity nudges (one per goal per day) ---------- */
  function nudges() {
    var log = lsGet(LS_NUDGE, {});
    var today = todayStr();
    var act = goals().filter(function (g) { return g.status === 'active'; });
    act.forEach(function (g) {
      var last = lastEntryDate(g.id);
      var ds = daysSince(last);
      if (ds >= 3 && log[g.id] !== today) {
        log[g.id] = today;
        var detail = last
          ? 'has had no updates in ' + ds + ' days'
          : 'has no progress logged yet';
        announce('💤 Quick nudge',
          '"' + g.title + '" (' + (g.progress || 0) + '%) ' + detail + '. ' +
          'Even a tiny step today keeps the momentum.');
      }
    });
    lsSet(LS_NUDGE, log);
  }

  /* ---------- Streak milestones ---------- */
  var LS_STREAK = 'jd_streak_milestones_v1';
  function streakMilestones() {
    var seen = lsGet(LS_STREAK, {});
    goals().filter(function (g) { return g.status === 'active' && g.goal_kind === 'habit'; })
      .forEach(function (g) {
        var s = streakOf(g.id);
        var milestones = [7, 14, 30, 60, 100];
        milestones.forEach(function (m) {
          var k = g.id + ':' + m;
          if (s >= m && !seen[k]) {
            seen[k] = true;
            announce('🔥 ' + m + '-day streak!',
              '"' + g.title + '" — ' + m + ' days in a row. Incredible consistency!');
          }
        });
      });
    lsSet(LS_STREAK, seen);
  }

  function check() {
    try {
      briefing();
      nudges();
      streakMilestones();
    } catch (e) {}
  }

  window.__jdProactiveApi = {
    check: check,
    streakOf: streakOf,
    briefing: briefing
  };

  setInterval(check, CHECK_MS);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
  window.addEventListener('load', function () { setTimeout(check, 10000); });
  setTimeout(check, 15000);
})();
