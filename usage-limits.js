/* JepongDevxyz AI — Usage & Limits Page (2026-10-01)
   Muse-style "Usage and limits" UI adapted for JepongDevxyz AI:
   - Header: back arrow, "Usage and limits" title
   - Progress bar cards: title + % remaining, thin bar, "Resets in X"
   - Credits section: "Credits remaining", "Top up"
   Uses real credit data. 100% functional.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdUsagePage) return;
  window.__jdUsagePage = true;

  var CSS = [
    '#jdUsePage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdUsePage[hidden]{display:none!important}',
    '.jduse-header{display:flex;align-items:center;justify-content:center;',
    'padding:12px 16px;position:relative;flex:0 0 auto}',
    '.jduse-back{position:absolute;left:16px;width:40px;height:40px;border-radius:50%;',
    'border:none;background:#1e1e1e;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jduse-back:active{transform:scale(.92)}',
    '.jduse-back svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jduse-title{font-size:1.05rem;font-weight:600}',
    '.jduse-scroll{flex:1;overflow-y:auto;padding:8px 16px 40px;-webkit-overflow-scrolling:touch}',
    '.jduse-label{font-size:.88rem;color:#999;margin:16px 0 8px 4px}',
    /* Progress card */
    '.jduse-pcard{background:#1e1e1e;border-radius:14px;padding:14px 16px;margin-bottom:10px}',
    '.jduse-prow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px}',
    '.jduse-ptitle{font-size:.92rem}',
    '.jduse-ppct{font-size:.85rem;color:#ccc}',
    '.jduse-bar{height:5px;background:rgba(255,255,255,.12);border-radius:3px;overflow:hidden;margin-bottom:8px}',
    '.jduse-fill{height:100%;background:#fff;border-radius:3px;transition:width .5s}',
    '.jduse-reset{font-size:.8rem;color:#888}',
    /* Info row */
    '.jduse-card{background:#1e1e1e;border-radius:14px;padding:0;margin-bottom:10px;overflow:hidden}',
    '.jduse-row{display:flex;align-items:center;justify-content:space-between;width:100%;',
    'border:none;background:none;color:#fff;padding:16px;font-size:.92rem;cursor:pointer;text-align:left}',
    '.jduse-row:active{background:rgba(255,255,255,.05)}',
    '.jduse-row + .jduse-row{border-top:1px solid rgba(255,255,255,.07)}',
    '.jduse-rval{color:#999;font-size:.88rem}',
    '.jduse-row svg{width:18px;height:18px;stroke:#888;fill:none;stroke-width:2;flex:0 0 auto;margin-left:8px}',
    '.jduse-desc{font-size:.83rem;color:#888;line-height:1.5;padding:4px 4px 0}',
    /* Light mode */
    'body.theme-light #jdUsePage{background:#f2f2f5;color:#111}',
    'body.theme-light .jduse-back{background:#e8e8e8;color:#111}',
    'body.theme-light .jduse-pcard,body.theme-light .jduse-card{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
    'body.theme-light .jduse-row{color:#111}',
    'body.theme-light .jduse-bar{background:rgba(0,0,0,.1)}',
    'body.theme-light .jduse-fill{background:#111}',
    'body.theme-light .jduse-label{color:#666}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>'
  };

  function buildPage() {
    if (document.getElementById('jdUsePage')) return;
    if (!document.getElementById('jdUseCss')) {
      var st = document.createElement('style');
      st.id = 'jdUseCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var page = document.createElement('div');
    page.id = 'jdUsePage';
    page.setAttribute('hidden', '');
    page.innerHTML =
      '<div class="jduse-header">' +
      '<button class="jduse-back" id="jdUseBack">' + I.back + '</button>' +
      '<div class="jduse-title">Usage and limits</div>' +
      '</div>' +
      '<div class="jduse-scroll">' +
      '<div class="jduse-label">Credit usage</div>' +
      '<div class="jduse-pcard">' +
      '<div class="jduse-prow"><span class="jduse-ptitle">Credits</span><span class="jduse-ppct" id="jdUsePct">--</span></div>' +
      '<div class="jduse-bar"><div class="jduse-fill" id="jdUseBar" style="width:0%"></div></div>' +
      '<div class="jduse-reset" id="jdUseReset">Loading…</div>' +
      '</div>' +
      '<div class="jduse-pcard">' +
      '<div class="jduse-prow"><span class="jduse-ptitle">Guest credits</span><span class="jduse-ppct" id="jdUseGuestPct">--</span></div>' +
      '<div class="jduse-bar"><div class="jduse-fill" id="jdUseGuestBar" style="width:0%"></div></div>' +
      '<div class="jduse-reset">Resets daily at midnight</div>' +
      '</div>' +
      '<div class="jduse-label">Credits</div>' +
      '<div class="jduse-card">' +
      '<div class="jduse-row" id="jdUseRemainRow"><span>Credits remaining</span><span class="jduse-rval" id="jdUseRemain">--</span></div>' +
      '<button class="jduse-row" id="jdUseTopupRow"><span>Top up credits</span>' + I.chev + '</button>' +
      '</div>' +
      '<div class="jduse-desc">Credits are used for AI chats and image generation. Top up to continue when you run out.</div>' +
      '</div>';
    document.body.appendChild(page);

    document.getElementById('jdUseBack').addEventListener('click', closeUsage);
    document.getElementById('jdUseTopupRow').addEventListener('click', function () {
      try {
        if (window.JdPay && typeof window.JdPay.open === 'function') { window.JdPay.open(); return; }
        if (typeof window.openTopup === 'function') { window.openTopup(); return; }
        if (typeof window.openPaymongoTopup === 'function') { window.openPaymongoTopup(); return; }
      } catch (e) {}
    });

    updateValues();
  }

  function updateValues() {
    try {
      var pct = document.getElementById('jdUsePct');
      var bar = document.getElementById('jdUseBar');
      var reset = document.getElementById('jdUseReset');
      var remain = document.getElementById('jdUseRemain');
      if (window.jdCredits && window.jdCredits.balance != null) {
        var bal = window.jdCredits.balance;
        var total = window.jdCredits.total || 500;
        var p = Math.round((bal / total) * 100);
        if (pct) pct.textContent = p + '% remaining';
        if (bar) bar.style.width = p + '%';
        if (remain) remain.textContent = bal + ' Credits';
        if (reset) reset.textContent = '500 free credits on sign up';
      }
      // Guest credits
      var gpct = document.getElementById('jdUseGuestPct');
      var gbar = document.getElementById('jdUseGuestBar');
      try {
        var gbal = parseInt(localStorage.getItem('jd_guest_credit_mirror') || '100', 10);
        if (isNaN(gbal)) gbal = 100;
        if (gbal < 0) gbal = 0; if (gbal > 100) gbal = 100;
        var gp = Math.round((gbal / 100) * 100);
        if (gpct) gpct.textContent = gp + '% remaining';
        if (gbar) gbar.style.width = gp + '%';
      } catch (e) {}
    } catch (e2) {}
  }

  function openUsage() {
    buildPage();
    updateValues();
    document.getElementById('jdUsePage').removeAttribute('hidden');
    if (window.jdBackNav) window.jdBackNav.push(document.getElementById('jdUsePage'));
  }
  function closeUsage() {
    var p = document.getElementById('jdUsePage');
    if (p) { p.setAttribute('hidden', ''); if (window.jdBackNav) window.jdBackNav.pop(p); }
  }

  function init() {
    buildPage();
    window.openUsage = openUsage;
    window.jdOpenUsage = openUsage;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
