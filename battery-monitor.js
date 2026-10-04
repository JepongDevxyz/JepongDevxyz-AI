/* JepongDevxyz AI — Battery Monitor (2026-10-04)
   Proactive low-battery warnings, like the assistant's own battery alerts:
   - Watches navigator.getBattery() (Chrome/Android) while the app is open
   - Warns at 20%, 10%, and 5% (once per threshold per session)
   - Warns when the charger is unplugged below 20%
   - Uses the Notification API when granted, falls back to the in-app
     banner used by goals-notify.js
   - Silent when the Battery API is unavailable (fail-open)
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdBattery) return;
  window.__jdBattery = true;

  var warned = {};
  var THRESHOLDS = [20, 10, 5];

  function notify(title, body) {
    /* route to the main chat + log the notification there */
    try {
      if (window.JDMainChat) {
        window.JDMainChat.notifyInChat(title, body);
      }
    } catch (e) {}
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(function (reg) {
            reg.showNotification(title, { body: body, tag: 'jd-battery', data: { url: location.origin + location.pathname + '#main-chat' } });
          }).catch(function () { new Notification(title, { body: body, tag: 'jd-battery' }); });
        } else {
          new Notification(title, { body: body, tag: 'jd-battery' });
        }
        return;
      }
    } catch (e) {}
    /* in-app banner fallback (shared style with goals notifications) */
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
      b.addEventListener('click', function () { b.style.display = 'none'; });
    }
    b.querySelector('#jdgNbTitle').textContent = title;
    b.querySelector('#jdgNbBody').textContent = body;
    b.style.display = 'block';
    setTimeout(function () { b.style.display = 'none'; }, 9000);
  }

  function level(b) { return Math.round(b.level * 100); }

  function check(b) {
    var pct = level(b);
    var charging = b.charging;
    THRESHOLDS.forEach(function (th) {
      if (pct <= th && !warned[th]) {
        warned[th] = true;
        var extra = charging ? '' : ' at hindi naka-charge';
        notify('🪫 ' + pct + '% na lang ang battery mo' + extra + '!',
          pct <= 5
            ? 'Mag-save ka na ng work mo at i-charge na ang phone para hindi maputol ang session.'
            : 'I-charge mo na ang phone mo para hindi maputol ang session natin.');
      }
    });
    /* reset warnings when charged back above 25% */
    if (pct > 25) warned = {};
  }

  function init() {
    try {
      if (!('getBattery' in navigator)) return;
      navigator.getBattery().then(function (b) {
        check(b);
        b.addEventListener('levelchange', function () { check(b); });
        b.addEventListener('chargingchange', function () { check(b); });
      }).catch(function () {});
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  window.addEventListener('load', init);
})();
