/* ============================================================
   JepongDevxyz AI — credits frontend module
   - Balance badge + top-up button (injected into .header-controls)
   - ensure(kind): gate before an AI generation; opens the
     QR Ph top-up modal when the signed-in user's balance is
     insufficient. Guests (not signed in) keep current behavior.
   - spend(kind, idempotencyKey): deduct after a successful
     generation (fire-and-forget, idempotent server-side).
   - Claims the one-time welcome credits on sign-in.
   Depends on: window.JDCloudAuthToken (index.html),
               window.JdPay.open (paymongo-topup.js).
   ============================================================ */
(function () {
    'use strict';

    var COSTS = { chat: 10, image: 50 };
    var LOW_THRESHOLD = 50;

    var balance = null;      // null = unknown / not signed in
    var refreshing = null;

    function token() {
        try {
            var fn = window.JDCloudAuthToken;
            if (typeof fn !== 'function') return Promise.resolve('');
            return Promise.resolve(fn()).catch(function () { return ''; });
        } catch (_) { return Promise.resolve(''); }
    }

    function fmt(n) {
        try { return Number(n).toLocaleString('en-US'); }
        catch (_) { return String(n); }
    }

    /* ---------- badge ---------- */

    function injectStyles() {
        if (document.getElementById('jdCreditsStyles')) return;
        var s = document.createElement('style');
        s.id = 'jdCreditsStyles';
        s.textContent =
            '#jdCreditsBadge{display:none;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;' +
            'border:1px solid var(--border-color,rgba(128,128,128,.35));background:var(--card-bg,rgba(128,128,128,.12));' +
            'color:var(--text-color,inherit);font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap}' +
            '#jdCreditsBadge.show{display:inline-flex}' +
            '#jdCreditsBadge:hover{filter:brightness(1.2)}' +
            '#jdCreditsBadge .jd-bolt{color:#fbbf24;font-size:.9rem;line-height:1}' +
            '#jdCreditsBadge.low{border-color:rgba(239,68,68,.65)}' +
            '#jdCreditsBadge .jd-plus{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;' +
            'border-radius:50%;background:#16a34a;color:#fff;font-size:.75rem;font-weight:800;line-height:1}';
        document.head.appendChild(s);
    }

    function injectBadge() {
        injectStyles();
        if (document.getElementById('jdCreditsBadge')) return;
        var host = document.querySelector('.header-controls');
        if (!host) return;
        var b = document.createElement('button');
        b.id = 'jdCreditsBadge';
        b.type = 'button';
        b.title = 'Credits — tap to top up';
        b.setAttribute('aria-label', 'Credits — tap to top up');
        b.addEventListener('click', function () { JDCredits.openTopup(); });
        host.appendChild(b);
        renderBadge();
    }

    function renderBadge() {
        var b = document.getElementById('jdCreditsBadge');
        if (!b) return;
        if (balance === null) {
            b.classList.remove('show');
            return;
        }
        b.innerHTML = '<span class="jd-bolt">⚡</span><span>' + fmt(balance) + '</span>' +
            '<span class="jd-plus">+</span>';
        b.classList.toggle('low', balance < LOW_THRESHOLD);
        b.classList.add('show');
    }

    /* ---------- api ---------- */

    function refresh() {
        if (refreshing) return refreshing;
        refreshing = token().then(function (t) {
            if (!t) { balance = null; renderBadge(); return null; }
            return fetch('/api/credits-balance', {
                headers: { 'Authorization': 'Bearer ' + t },
                credentials: 'same-origin'
            }).then(function (r) {
                if (r.status === 401) { balance = null; renderBadge(); return null; }
                return r.json().catch(function () { return null; });
            }).then(function (d) {
                if (d && typeof d.balance === 'number') balance = d.balance;
                renderBadge();
                return balance;
            }).catch(function () { return balance; });
        }).finally(function () { refreshing = null; });
        return refreshing;
    }

    function openTopup() {
        if (window.JdPay && typeof window.JdPay.open === 'function') {
            window.JdPay.open();
        } else if (window.showModernAlert) {
            window.showModernAlert('Hindi pa available ang top-up. Subukang muli mamaya.', 'Top-up');
        }
    }

    /* ---------- public ---------- */

    var JDCredits = {
        COSTS: COSTS,
        get balance() { return balance; },

        refresh: refresh,
        openTopup: openTopup,
        renderBadge: renderBadge,

        // Gate: call BEFORE starting a generation. Returns true when the
        // send may proceed. Opens the top-up modal and returns false when
        // the signed-in user cannot afford it.
        ensure: function (kind) {
            var cost = COSTS[kind] || COSTS.chat;
            return token().then(function (t) {
                if (!t) return true; // guest: keep current behavior
                var check = function (bal) {
                    if (bal !== null && bal >= cost) return true;
                    // Local copy may be stale (e.g. paid in another tab) — refresh once.
                    return refresh().then(function (fresh) {
                        if (fresh !== null && fresh >= cost) return true;
                        openTopup();
                        if (window.showModernAlert) {
                            window.showModernAlert(
                                'Naubos na ang credits mo (' + fmt(fresh === null ? 0 : fresh) + '). ' +
                                'Mag-top up para magpatuloy.',
                                'Insufficient credits'
                            );
                        }
                        return false;
                    });
                };
                return check(balance);
            }).catch(function () { return true; }); // fail open, never brick the app
        },

        // Deduct AFTER a successful generation. Fire-and-forget; the
        // server key makes retries safe.
        spend: function (kind, idempotencyKey) {
            if (!idempotencyKey) return Promise.resolve();
            return token().then(function (t) {
                if (!t) return;
                return fetch('/api/credits-spend', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + t
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ action: kind, idempotency_key: idempotencyKey })
                }).then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { r: r, d: d }; }); })
                    .then(function (pair) {
                        var d = pair.d;
                        if (d && typeof d.balance === 'number') {
                            balance = d.balance;
                            renderBadge();
                        }
                        if (pair.r.status === 402) openTopup();
                    });
            }).catch(function () { /* never break the chat UX */ });
        },

        claimWelcome: function () {
            return token().then(function (t) {
                if (!t) return null;
                return fetch('/api/credits-welcome', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + t },
                    credentials: 'same-origin'
                }).then(function (r) { return r.json().catch(function () { return null; }); })
                    .then(function (d) {
                        if (d && typeof d.balance === 'number') {
                            balance = d.balance;
                            renderBadge();
                        }
                        return d;
                    });
            }).catch(function () { return null; });
        }
    };

    window.JDCredits = JDCredits;

    /* ---------- wiring ---------- */

    function initAccount() {
        token().then(function (t) {
            if (!t) { balance = null; renderBadge(); return; }
            JDCredits.claimWelcome().then(function () { refresh(); });
        });
    }

    injectBadge();
    initAccount(); // in case the initial auth event already fired
    window.addEventListener('jd:account-changed', initAccount);
    window.addEventListener('jdpay:paid', function () { refresh(); });
})();
