/* JepongDevxyz AI — Goals Notifications (2026-10-04)
   Reminder engine for goals:
   - Watches active goals with reminder_time (+ optional reminder_days)
   - Fires a local notification at the right time each day
   - Uses the Notification API directly; falls back to an in-app banner
     when permission is denied/unavailable
   - Dedupes: one notification per goal per day (localStorage log)
   - Also nudges for goals nearing their target_date (3 days out)
   - Exposes window.__jdGoalsNotify.reschedule() for goals.js to call
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdGoalsNotify) return;
  window.__jdGoalsNotify = true;

  var FIRED_KEY = 'jd_goal_notif_fired_v1';
  var CHECK_MS = 60 * 1000;
  var timer = null;

  function firedLog() {
    try { return JSON.parse(localStorage.getItem(FIRED_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function markFired(id, day) {
    try {
      var log = firedLog();
      log[id] = day;
      localStorage.setItem(FIRED_KEY, JSON.stringify(log));
    } catch (e) {}
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dayName() {
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
  }

  function notify(title, body) {
    /* route to the main chat + log the notification there */
    try {
      if (window.JDMainChat) {
        window.JDMainChat.notifyInChat(title, body);
      }
    } catch (e) {}
    var opts = {
      body: body,
      tag: 'jd-goal-' + Date.now(),
      data: { url: location.origin + location.pathname + '#main-chat' }
    };
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(function (reg) {
            reg.showNotification(title, opts);
          }).catch(function () { new Notification(title, opts); });
        } else {
          new Notification(title, opts);
        }
        return;
      }
    } catch (e) {}
    inAppBanner(title, body);
  }

  function inAppBanner(title, body) {
    var b = document.getElementById('jdgNotifBanner');
    if (!b) {
      b = document.createElement('div');
      b.id = 'jdgNotifBanner';
      b.style.cssText = [
        'position:fixed;top:12px;left:12px;right:12px;z-index:24800;',
        'background:#1c1c1e;color:#fff;border-radius:16px;padding:14px 16px;',
        'box-shadow:0 8px 30px rgba(0,0,0,.4);display:none;',
        'font-family:inherit;cursor:pointer'
      ].join('');
      b.innerHTML = '<div id="jdgNbTitle" style="font-weight:700;font-size:.9rem;margin-bottom:4px"></div>' +
        '<div id="jdgNbBody" style="font-size:.82rem;color:#bbb;line-height:1.4"></div>' +
        '<div style="font-size:.62rem;color:#777;margin-top:6px;text-align:center">Powered by Jepong Devxyz</div>';
      document.body.appendChild(b);
      b.addEventListener('click', function () {
        b.style.display = 'none';
        try { if (window.JDMainChat) window.JDMainChat.open(); }
        catch (e) { if (window.JDGoals) window.JDGoals.open(); }
      });
    }
    b.querySelector('#jdgNbTitle').textContent = title;
    b.querySelector('#jdgNbBody').textContent = body;
    b.style.display = 'block';
    setTimeout(function () { b.style.display = 'none'; }, 8000);
  }

  function ensurePermission() {
    try {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(function () {});
      }
    } catch (e) {}
  }

  function check() {
    var list = (window.__jdGoalsList || []);
    if (!list.length) return;
    var now = new Date();
    var hh = String(now.getHours()).padStart(2, '0');
    var mm = String(now.getMinutes()).padStart(2, '0');
    var cur = hh + ':' + mm;
    var day = todayStr();
    var dn = dayName();
    var log = firedLog();

    list.forEach(function (g) {
      if (g.status !== 'active') return;
      /* Daily reminder at reminder_time on selected days */
      if (g.reminder_time && log[g.id] !== day + '@rem') {
        var days = g.reminder_days ? g.reminder_days.split(',') : [];
        var dayOk = !days.length || days.indexOf(dn) >= 0;
        if (dayOk && g.reminder_time.slice(0, 5) === cur) {
          notify('🎯 Goal reminder', '"' + g.title + '" — ' + (g.progress || 0) + '% complete. Keep going!');
          markFired(g.id, day + '@rem');
        }
      }
      /* Target date approaching (3 days out), once per day */
      if (g.target_date && log[g.id] !== day + '@due') {
        try {
          var target = new Date(g.target_date + 'T00:00:00');
          var diffDays = Math.round((target - now) / 86400000);
          if (diffDays === 3 && (g.progress || 0) < 100) {
            notify('⏳ Goal due soon', '"' + g.title + '" is due in 3 days (' + g.target_date + '). ' +
              'You are at ' + (g.progress || 0) + '% — push a little more!');
            markFired(g.id, day + '@due');
          } else if (diffDays === 0 && (g.progress || 0) < 100) {
            notify('📅 Goal due today', '"' + g.title + '" is due today. Give it your best shot!');
            markFired(g.id, day + '@due');
          }
        } catch (e) {}
      }
    });
  }

  function reschedule() {
    if (timer) clearInterval(timer);
    timer = setInterval(check, CHECK_MS);
    check();
  }

  /* Prune old fired log entries (keep last 30 days) */
  function prune() {
    try {
      var log = firedLog();
      var cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      var changed = false;
      Object.keys(log).forEach(function (k) {
        var v = String(log[k]).split('@')[0];
        if (v < todayStr().slice(0, 8) + '00') { /* keep simple: drop if older than this month */ }
      });
    } catch (e) {}
  }

  window.__jdGoalsNotify = { reschedule: reschedule };

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) check();
  });
  window.addEventListener('load', function () {
    ensurePermission();
    reschedule();
  });
  ensurePermission();
  reschedule();
})();
