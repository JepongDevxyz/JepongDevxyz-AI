/* ============================================================
   JepongDevxyz AI — pricing & policies patch (runtime, 2026-10-01)
   Keisha: Settings > Usage & Limits must have a CLICKABLE row
   ("Pricing & policies") that opens a detail view with the full
   Pricing & Credit Tiers + Refund and Cancellation Policy text.
   Copy is Keisha's own, kept verbatim (English).
   Additive only; fail-open; idempotent.
   ============================================================ */
(function () {
  'use strict';

  var CSS_ID = 'jdPolStyles';
  var ROW_ID = 'jdPoliciesRow';
  var MODAL_ID = 'jdPoliciesModal';

  function ensureStyles() {
    try {
      if (document.getElementById(CSS_ID)) return;
      var s = document.createElement('style');
      s.id = CSS_ID;
      s.textContent =
        '.jd-pol-row{width:100%}' +
        '.jd-pol-scroll h2{font-size:1.05rem;margin:18px 0 8px;font-weight:800}' +
        '.jd-pol-scroll h2:first-child{margin-top:2px}' +
        '.jd-pol-scroll h3{font-size:.92rem;margin:14px 0 8px;font-weight:700}' +
        '.jd-pol-scroll p,.jd-pol-scroll li{font-size:.85rem;line-height:1.6;opacity:.9}' +
        '.jd-pol-scroll p{margin:0 0 8px}' +
        '.jd-pol-scroll ul{margin:0 0 8px;padding-left:20px}' +
        '.jd-pol-scroll li{margin-bottom:6px}' +
        '.jd-pol-scroll hr{border:none;border-top:1px solid var(--border-color,rgba(128,128,128,.25));margin:16px 0}' +
        '.jd-pol-plans{display:flex;flex-direction:column;gap:8px;margin:2px 0 6px}' +
        '.jd-pol-plan{display:flex;justify-content:space-between;align-items:center;gap:10px;' +
        'padding:12px 14px;border-radius:12px;background:rgba(128,128,128,.12)}' +
        '.jd-pol-plan b{font-size:.92rem;display:block}' +
        '.jd-pol-plan small{opacity:.65;font-weight:400}' +
        '.jd-pol-plan span{font-size:.85rem;font-weight:700;color:#8b5cf6;white-space:nowrap}' +
        '.jd-pol-updated{font-size:.75rem !important;opacity:.55 !important;margin-top:10px}';
      document.head.appendChild(s);
    } catch (e) { /* fail-open */ }
  }

  function planRow(name, price, credits) {
    return '<div class="jd-pol-plan"><div><b>' + name + '</b>' +
      '<small>\u20B1' + price + ' (One-time payment)</small></div>' +
      '<span>' + credits + ' credits</span></div>';
  }

  function buildModal() {
    if (document.getElementById(MODAL_ID)) return;
    ensureStyles();
    var ov = document.createElement('div');
    ov.className = 'modal-overlay';
    ov.id = MODAL_ID;
    ov.setAttribute('onclick', 'if(event.target===this)closeJdPolicies()');
    ov.innerHTML =
      '<section class="settings-home" role="dialog" aria-modal="true" aria-labelledby="jdPolTitle" style="max-width:560px">' +
      '<header class="settings-home-header">' +
      '<button class="settings-back" type="button" onclick="closeJdPolicies()" aria-label="Back"><i data-lucide="arrow-left"></i></button>' +
      '<div class="settings-profile"><div><h2 id="jdPolTitle">Pricing &amp; policies</h2>' +
      '<p>Pricing &amp; Credit Tiers</p></div></div>' +
      '</header>' +
      '<div class="settings-home-scroll jd-pol-scroll">' +
      '<h2>Pricing &amp; Credit Tiers</h2>' +
      '<p>Choose the right plan to power your AI conversations. Find the option that best fits your workflow below:</p>' +
      '<h3>\uD83D\uDCA0 Available Credit Packages</h3>' +
      '<div class="jd-pol-plans">' +
      planRow('Starter Plan', '29', '1,000') +
      planRow('Pro Plan', '99', '5,000') +
      planRow('Max Plan', '199', '12,000') +
      '</div>' +
      '<hr>' +
      '<h3>\u2699\uFE0F How It Works</h3>' +
      '<ul>' +
      '<li><b>Welcome Bonus:</b> Get <b>500 free credits</b> immediately upon your very first sign-in (one-time bonus per account).</li>' +
      '<li><b>Credit Consumption Rates:</b><ul>' +
      '<li>Each text chat request = <b>10 credits</b></li>' +
      '<li>Each AI image generation request = <b>50 credits</b></li>' +
      '</ul></li>' +
      '<li><b>Guest Mode:</b> Want to test it out? Explore our Guest Mode for <b>free text chatting</b> without needing any credits or log-ins.</li>' +
      '<li><b>Easy Top-Ups:</b> When your balance runs out, simply tap <b>Top up</b> inside your dashboard. Scan the generated <b>QR Ph code</b> using <b>GCash, Maya</b>, or your preferred mobile banking app to instantly refill your balance.</li>' +
      '<li><b>No Hidden Fees:</b> All transactions are strict <b>one-time payments</b>. There is <b>no automatic renewal</b> or recurring credit card billing. <i>(Note: Automated monthly subscriptions are coming soon!)</i></li>' +
      '</ul>' +
      '<p class="jd-pol-updated">Last updated: September 30, 2026</p>' +
      '<hr>' +
      '<h2>Refund and Cancellation Policy</h2>' +
      '<p>Thank you for using JepongDevxyz AI. Because our platform utilizes a manual, top-up framework exclusively via QR Ph, we maintain a straightforward billing policy. Please review our rules regarding purchases and credit tokens below:</p>' +
      '<h3>1. One-Time Prepaid Top-Ups</h3>' +
      '<p>All credit tiers available on JepongDevxyz AI (Starter, Pro, and Max) are processed strictly as one-time, manual prepaid top-ups.</p>' +
      '<ul><li>There are no automated recurring subscriptions active on our platform.</li>' +
      '<li>You will never be automatically charged or auto-renewed. You only pay when you intentionally choose to buy a top-up package.</li></ul>' +
      '<h3>2. Strict Non-Refundable Policy</h3>' +
      '<p>All transactions processed through our active payment gateway via QR Ph (GCash, Maya, or mobile banking apps) are permanent and immediate.</p>' +
      '<ul><li><b>All payments made to JepongDevxyz AI are strictly non-refundable.</b></li>' +
      '<li>Because our system does not feature an automated refund mechanism for QR Ph payments, we do not provide cash returns, credit reversals, or manual chargebacks under any circumstances.</li>' +
      '<li>Purchased credits hold no monetary value and cannot be redeemed, exchanged, or transferred back into real currency (PHP).</li></ul>' +
      '<h3>3. Credit Allocation &amp; Delivery</h3>' +
      '<p>Your purchased credits (1,000 for Starter, 5,000 for Pro, and 12,000 for Max) will be credited to your account profile immediately after a successful QR Ph scan. These tokens do not expire as long as your account is active and will stay securely in your pool until spent on text chats (10 credits each) or image generations (50 credits each). Unused credits cannot be refunded if you decide to stop using the application.</p>' +
      '<h3>4. Technical Issues &amp; Support</h3>' +
      '<p>If your payment went through your mobile wallet but your credits failed to appear on your dashboard due to a network delay, please contact us immediately through our official repository support or communication channels with your transaction reference slip. We will verify the transaction logs manually and manually credit the missing tokens to your account.</p>' +
      '<h3>5. Policy Updates</h3>' +
      '<p>JepongDevxyz AI reserves the right to update this policy at any time to align with new features or changes introduced by our payment gateway providers.</p>' +
      '</div></section>';
    document.body.appendChild(ov);
    if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(ov); } catch (e) {} }
  }

  function insertRow() {
    try {
      if (document.getElementById(ROW_ID)) return true;
      var card = document.getElementById('jdCreditsCard');
      if (!card || !card.parentNode) return false;
      ensureStyles();
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.id = ROW_ID;
      btn.className = 'settings-nav-row jd-pol-row';
      btn.setAttribute('onclick', 'openJdPolicies()');
      btn.setAttribute('aria-label', 'Pricing and policies');
      btn.innerHTML = '<i data-lucide="gem"></i><span>Pricing &amp; policies</span><i data-lucide="chevron-right"></i>';
      card.parentNode.insertBefore(btn, card.nextSibling);
      if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(btn); } catch (e) {} }
      return true;
    } catch (e) { return false; }
  }

  window.openJdPolicies = function () {
    try {
      buildModal();
      var m = document.getElementById(MODAL_ID);
      if (m) { m.classList.add('open'); }
    } catch (e) { /* fail-open */ }
  };

  window.closeJdPolicies = function () {
    try {
      var m = document.getElementById(MODAL_ID);
      if (m) { m.classList.remove('open'); }
    } catch (e) { /* fail-open */ }
  };

  // the Usage & Limits panel is built lazily by credits.js; watch for it
  var done = false;
  function tryInsert() {
    if (done) return;
    if (insertRow()) { done = true; if (obs) obs.disconnect(); }
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
