/* ============================================================
   JepongDevxyz AI — subscription about patch (runtime, 2026-10-01)
   Keisha: the Settings > Usage & Limits panel must explain the
   subscription / in-app purchases — how much the plans are and
   how they work.
   This patch inserts a "Tungkol sa plans" expandable section
   right after the credits card (#jdCreditsCard). Copy matches the
   live PayMongo plans (paymongo-topup.js) and credit costs
   (credits.js). Tagalog, like the top-up modal.
   Additive only; fail-open; idempotent.
   ============================================================ */
(function () {
  'use strict';

  var CSS_ID = 'jdSubsAboutStyles';
  var SECTION_ID = 'jdSubsAbout';

  function ensureStyles() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var s = document.createElement('style');
      s.id = CSS_ID;
      s.textContent =
        '.jd-subs-about{margin:12px 0 0;padding:4px 16px 6px;border-radius:16px;' +
        'border:1px solid var(--border-color,rgba(128,128,128,.25));' +
        'background:var(--card-bg,#1e1e22);color:var(--text-color,inherit);font-family:inherit}' +
        '.jd-subs-about summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;' +
        'font-size:.95rem;font-weight:700;padding:10px 0;outline:none}' +
        '.jd-subs-about summary::-webkit-details-marker{display:none}' +
        '.jd-subs-about summary::after{content:"\\203A";margin-left:auto;opacity:.5;transition:transform .2s}' +
        '.jd-subs-about[open] summary::after{transform:rotate(90deg)}' +
        '.jd-subs-about .jd-ico{color:#fbbf24}' +
        '.jd-subs-plans{display:flex;flex-direction:column;gap:8px;margin:2px 0 12px}' +
        '.jd-subs-plan{display:flex;justify-content:space-between;align-items:center;gap:8px;' +
        'padding:10px 12px;border-radius:12px;background:rgba(128,128,128,.12)}' +
        '.jd-subs-plan b{font-size:.9rem}' +
        '.jd-subs-plan span{font-size:.85rem;font-weight:700;color:#8b5cf6}' +
        '.jd-subs-how{font-size:.85rem;font-weight:700;margin:0 0 6px;opacity:.85}' +
        '.jd-subs-about ul{margin:0 0 10px;padding-left:18px;font-size:.83rem;line-height:1.55;opacity:.85}' +
        '.jd-subs-about ul b{opacity:1}';
      document.head.appendChild(s);
    } catch (e) { /* fail-open */ }
  }

  function buildSection() {
    var d = document.createElement('details');
    d.className = 'jd-subs-about';
    d.id = SECTION_ID;
    d.innerHTML =
      '<summary><span class="jd-ico">\u2139</span> Tungkol sa plans</summary>' +
      '<div class="jd-subs-plans">' +
      '<div class="jd-subs-plan"><b>Starter</b><span>\u20B129 \u2192 1,000 credits</span></div>' +
      '<div class="jd-subs-plan"><b>Pro</b><span>\u20B199 \u2192 5,000 credits</span></div>' +
      '<div class="jd-subs-plan"><b>Max</b><span>\u20B1199 \u2192 12,000 credits</span></div>' +
      '</div>' +
      '<p class="jd-subs-how">Paano gumagana:</p>' +
      '<ul>' +
      '<li><b>500 libreng credits</b> kapag nag-sign in ka (isang beses lang).</li>' +
      '<li>Bawat chat = <b>10 credits</b>, bawat image = <b>50 credits</b>.</li>' +
      '<li>Kapag naubos, pindutin ang <b>Top up</b> at i-scan ang QR Ph gamit ang GCash, Maya, o bank app.</li>' +
      '<li>One-time payment lang, <b>walang auto-renew</b>. Monthly subscription, darating soon.</li>' +
      '<li>Guest mode: libre ang chat, walang credits.</li>' +
      '</ul>';
    return d;
  }

  function insert() {
    try {
      if (document.getElementById(SECTION_ID)) return true;
      var card = document.getElementById('jdCreditsCard');
      if (!card || !card.parentNode) return false;
      ensureStyles();
      card.parentNode.insertBefore(buildSection(), card.nextSibling);
      return true;
    } catch (e) { return false; }
  }

  // the Usage & Limits panel is built lazily by credits.js; watch for it
  var done = false;
  function tryInsert() {
    if (done) return;
    if (insert()) { done = true; if (obs) obs.disconnect(); }
  }
  var obs = null;
  try {
    tryInsert();
    if (!done && typeof MutationObserver === 'function') {
      obs = new MutationObserver(tryInsert);
      obs.observe(document.documentElement, { childList: true, subtree: true });
    }
  } catch (e) { /* fail-open */ }
})();
