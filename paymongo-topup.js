/* ============================================================
   JepongDevxyz AI — PayMongo QR Ph top-up modal (frontend drop-in)

   Usage:
     1. <script src="/paymongo-topup.js"></script>  (after index.html loads)
     2. <button onclick="JdPay.open()">Top up credits</button>

   Expects the page's Supabase client as `cloudClient`
   (falls back to window.cloudClient). Emits:
     window 'jdpay:paid' CustomEvent { plan_id, credits, amount_php }
   ============================================================ */
(function () {
  'use strict';

  var PLANS = [
    { id: 'starter', name: 'Starter Pack', blurb: '₱29 — 1,000 credits' },
    { id: 'pro',     name: 'Pro Pack',     blurb: '₱99 — 5,000 credits' },
    { id: 'max',     name: 'Max Pack',     blurb: '₱199 — 12,000 credits' },
  ];

  function token() {
    var c = (typeof cloudClient !== 'undefined' && cloudClient) || window.cloudClient;
    if (!c) return Promise.resolve(null);
    return c.auth.getSession().then(function (res) {
      return (res && res.data && res.data.session && res.data.session.access_token) || null;
    });
  }

  function api(path, opts, tok) {
    return fetch(path, Object.assign({
      headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
    }, opts || {})).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error((j && j.error) || ('Error ' + r.status));
        return j;
      });
    });
  }

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  var CSS = [
    '.jdpay-ov{position:fixed;top:0;left:0;right:0;height:100vh;height:100dvh;background:rgba(0,0,0,.6);z-index:9999;display:flex;padding:16px;overflow-y:auto;-webkit-overflow-scrolling:touch}',
    '.jdpay-box{background:#14181f;color:#eef2f7;border:1px solid #2a3340;border-radius:16px;max-width:380px;width:100%;margin:auto;padding:20px;box-shadow:0 20px 60px rgba(0,0,0,.5);max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain}',
    '.jdpay-box h3{margin:0 0 4px;font-size:18px}',
    '.jdpay-box p.sub{margin:0 0 14px;color:#9aa7b8;font-size:13px}',
    '.jdpay-plan{display:flex;justify-content:space-between;align-items:center;width:100%;background:#1d242e;border:1px solid #2a3340;color:#eef2f7;border-radius:12px;padding:12px 14px;margin:8px 0;cursor:pointer;font-size:15px}',
    '.jdpay-plan:hover{border-color:#3b82f6}',
    '.jdpay-plan b{font-size:15px}.jdpay-plan span{color:#9aa7b8;font-size:13px}',
    '.jdpay-qr{display:block;width:240px;height:240px;margin:12px auto;background:#fff;border-radius:12px;padding:8px}',
    '.jdpay-amt{text-align:center;font-size:22px;font-weight:700;margin:6px 0}',
    '.jdpay-timer{text-align:center;color:#fbbf24;font-size:14px;margin-bottom:8px}',
    '.jdpay-note{text-align:center;color:#9aa7b8;font-size:12px;line-height:1.5}',
    '.jdpay-close{display:block;margin:14px auto 0;background:transparent;border:1px solid #2a3340;color:#9aa7b8;border-radius:10px;padding:8px 18px;cursor:pointer}',
    '.jdpay-ok{text-align:center;padding:12px 0}.jdpay-ok .big{font-size:44px}.jdpay-ok h3{margin:8px 0 4px}',
    '.jdpay-err{color:#f87171;font-size:13px;text-align:center;margin-top:8px}',
    '.jdpay-spin{text-align:center;padding:24px;color:#9aa7b8;font-size:14px}',
    /* Light mode overrides (2026-10-02) */
    'body.theme-light .jdpay-box{background:#ffffff;color:#1a1a1a;border-color:#e0e0e0}',
    'body.theme-light .jdpay-box p.sub{color:#666}',
    'body.theme-light .jdpay-plan{background:#f5f5f5;border-color:#e0e0e0;color:#1a1a1a}',
    'body.theme-light .jdpay-plan span{color:#666}',
    'body.theme-light .jdpay-close{border-color:#e0e0e0;color:#666}',
    'body.theme-light .jdpay-note{color:#666}',
    'body.theme-light .jdpay-spin{color:#666}',
  ].join('');

  var overlay = null, pollTimer = null, countdownTimer = null;

  function close() {
    if (pollTimer) clearInterval(pollTimer);
    if (countdownTimer) clearInterval(countdownTimer);
    pollTimer = countdownTimer = null;
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  function show(html) {
    close();
    var st = document.createElement('style');
    st.textContent = CSS;
    overlay = el('<div class="jdpay-ov"><div class="jdpay-box">' + html + '</div></div>');
    overlay.insertBefore(st, overlay.firstChild);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.body.appendChild(overlay);
    return overlay.querySelector('.jdpay-box');
  }

  function open() {
    var box = show(
      '<h3>Pricing</h3><p class="sub">Magbayad via QR Ph — i-scan gamit ang GCash, Maya, o bank app.</p>' +
      '<div class="jdpay-err" style="display:none"></div>' +
      PLANS.map(function (p) {
        return '<button class="jdpay-plan" data-plan="' + p.id + '"><b>' + p.name + '</b><span>' + p.blurb + '</span></button>';
      }).join('') +
      '<button class="jdpay-close">Isara</button>'
    );
    box.querySelector('.jdpay-close').onclick = close;
    var errBox = box.querySelector('.jdpay-err');
    box.querySelectorAll('.jdpay-plan').forEach(function (btn) {
      btn.onclick = function () { start(btn.getAttribute('data-plan'), errBox); };
    });
  }

  function start(planId, errBox) {
    var box = show('<div class="jdpay-spin">Gumagawa ng QR code…</div>');
    token().then(function (tok) {
      if (!tok) throw new Error('Mag-sign in muna.');
      return api('/api/paymongo-create', { method: 'POST', body: JSON.stringify({ plan_id: planId }) }, tok)
        .then(function (res) { return { res: res, tok: tok }; });
    }).then(function (o) {
      renderQR(box, o.res, o.tok);
    }).catch(function (e) {
      close();
      var b2 = show('<h3>Top up credits</h3><p class="jdpay-err">' + escapeHtml(e.message) + '</p><button class="jdpay-close">Isara</button>');
      b2.querySelector('.jdpay-close').onclick = close;
    });
  }

  function renderQR(box, res, tok) {
    var left = res.expires_in_seconds || 1800;
    box.innerHTML =
      '<h3>' + escapeHtml(res.plan_name) + '</h3>' +
      '<p class="sub">I-scan ang QR para magbayad</p>' +
      '<img class="jdpay-qr" src="' + res.qr_image + '" alt="QR Ph code">' +
      '<div class="jdpay-amt">₱' + escapeHtml(res.amount_php) + '</div>' +
      '<div class="jdpay-timer"></div>' +
      '<p class="jdpay-note">Gamitin ang GCash, Maya, o kahit anong bank app.<br>Huwag i-refresh — hintayin ang confirmation.</p>' +
      '<button class="jdpay-close">Kanselahin</button>';
    box.querySelector('.jdpay-close').onclick = close;

    var timerEl = box.querySelector('.jdpay-timer');
    function tick() {
      var m = Math.floor(left / 60), s = left % 60;
      timerEl.textContent = 'Mag-e-expire sa ' + m + ':' + String(s).padStart(2, '0');
      if (left <= 0) {
        close();
        var b = show('<h3>Nag-expire ang QR</h3><p class="sub">Gumawa ulit ng bagong QR code.</p><button class="jdpay-close">Isara</button>');
        b.querySelector('.jdpay-close').onclick = close;
        return;
      }
      left--;
    }
    tick();
    countdownTimer = setInterval(tick, 1000);

    pollTimer = setInterval(function () {
      api('/api/paymongo-status?intent_id=' + encodeURIComponent(res.payment_intent_id), null, tok)
        .then(function (st) {
          if (st.status === 'paid') {
            close();
            var ok = show(
              '<div class="jdpay-ok"><div class="big">✅</div><h3>Bayad na!</h3>' +
              '<p class="sub">+' + Number(st.credits).toLocaleString() + ' credits ang nadagdag sa account mo.</p>' +
              '<button class="jdpay-close">Ayos!</button></div>'
            );
            ok.querySelector('.jdpay-close').onclick = close;
            window.dispatchEvent(new CustomEvent('jdpay:paid', {
              detail: { plan_id: st.plan_id, credits: st.credits, amount_php: st.amount_php },
            }));
          } else if (st.status === 'failed' || st.status === 'expired') {
            close();
            var f = show('<h3>Nabigo ang payment</h3><p class="sub">Subukan ulit gamit ang bagong QR code.</p><button class="jdpay-close">Isara</button>');
            f.querySelector('.jdpay-close').onclick = close;
          }
        })
        .catch(function () { /* keep polling on transient errors */ });
    }, 3000);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.JdPay = { open: open, close: close, plans: PLANS };
})();
