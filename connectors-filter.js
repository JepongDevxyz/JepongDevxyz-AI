/* ============================================================
   JepongDevxyz AI — connector visibility filter (runtime, 2026-10-01)
   Jepong: "Alisin na natin yung iba, ito lang itira mo muna —
   GitHub at Vercel (+ Browser/Web, builtin, no setup needed)."
   2026-10-01: Google trio added (gmail, gcalendar, gdrive) so the
   owner can enter the Google OAuth client ID/secret in-app
   (Settings → Connectors → Google setup) for plugin "Connect".

   Hides every connector card except the KEEP list in the
   Connectors panel. Client-side only (server registry untouched), so
   restoring the rest later is just deleting this file + agent.js entry.
   Additive only; fail-open; idempotent.
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdConnFilter) return;
  window.__jdConnFilter = true;

  var KEEP = { github: 1, vercel: 1, browser: 1, gmail: 1, gcalendar: 1, gdrive: 1 };
  window.__jdConnVisible = KEEP;

  function applyFilter(root) {
    try {
      var scope = root || document;
      var cards = scope.querySelectorAll('.jd-conn-card[data-card]');
      for (var i = 0; i < cards.length; i++) {
        var id = cards[i].getAttribute('data-card');
        if (KEEP[id]) continue;
        cards[i].style.display = 'none';
        var nxt = cards[i].nextElementSibling;
        if (nxt && nxt.classList && nxt.classList.contains('jd-conn-setup')) {
          nxt.style.display = 'none';
        }
      }
      /* Hide section headers (Connected/Available) that have no visible cards. */
      var secs = scope.querySelectorAll('.jd-conn-sec[data-sec]');
      for (var j = 0; j < secs.length; j++) {
        var vis = 0, el = secs[j].nextElementSibling;
        while (el && !(el.classList && el.classList.contains('jd-conn-sec'))) {
          if (el.classList && el.classList.contains('jd-conn-card') &&
              el.style.display !== 'none') vis++;
          el = el.nextElementSibling;
        }
        secs[j].style.display = vis ? '' : 'none';
      }
    } catch (_) { /* fail-open */ }
  }

  window.__jdConnFilterApply = applyFilter;

  try {
    applyFilter(document);
    if (typeof MutationObserver === 'function') {
      var obs = new MutationObserver(function () { applyFilter(document); });
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (_) {}
})();
