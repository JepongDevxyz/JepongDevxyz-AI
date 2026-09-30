/* ============================================================
   JepongDevxyz AI — credits frontend module
   - Credits card injected into Settings > Usage & Limits
     (NOT the header): balance, "% used" progress bar, Top up
     button. Styled like the app's own usage cards.
   - ensure(kind): gate before an AI generation; opens the
     QR Ph top-up modal when the signed-in user's balance is
     insufficient. Guests (not signed in) keep current behavior.
   - spend(kind, idempotencyKey): deduct after a successful
     generation (fire-and-forget, idempotent server-side).
   - Claims the one-time welcome credits on sign-in.
   Depends on: window.JDCloudAuthToken (index.html),
               window.JdPay.open (paymongo-topup.js).
   Fetch gate: wraps window.fetch so every POST to /api/chat is gated
   on credits and spends exactly once per successful generation —
   without touching index.html. Control calls (provider-status,
   provider-models, custom-api-models, tts) and background calls
   (auto-summary, AI title, vision sub-step, settings tester) pass
   through untouched.
   ============================================================ */
(function () {
    'use strict';

    var COSTS = { chat: 10, image: 50 };

    var balance = null;       // null = unknown / not signed in
    var totalCredited = 0;    // sum of all positive credit grants
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

    /* ---------- credits card (Settings > Usage & Limits) ---------- */

    function injectStyles() {
        if (document.getElementById('jdCreditsStyles')) return;
        var s = document.createElement('style');
        s.id = 'jdCreditsStyles';
        s.textContent =
            '.jd-credits-card{margin:10px 0 0;padding:14px 16px;border-radius:16px;' +
            'border:1px solid var(--border-color,rgba(128,128,128,.25));' +
            'background:var(--card-bg,#1e1e22);color:var(--text-color,inherit);font-family:inherit}' +
            '.jd-credits-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}' +
            '.jd-credits-title{font-size:1.05rem;font-weight:700;display:flex;align-items:center;gap:6px}' +
            '.jd-credits-title .jd-bolt{color:#fbbf24}' +
            '.jd-credits-pct{font-size:1.05rem;font-weight:700}' +
            '.jd-credits-bar{height:10px;border-radius:999px;background:rgba(128,128,128,.25);overflow:hidden}' +
            '.jd-credits-fill{display:block;height:100%;width:0%;border-radius:999px;' +
            'background:linear-gradient(90deg,#3b82f6,#8b5cf6);transition:width .4s ease}' +
            '.jd-credits-foot{display:flex;justify-content:space-between;align-items:center;margin-top:10px}' +
            '.jd-credits-bal{font-size:.85rem;opacity:.75}' +
            '.jd-credits-topup{border:none;border-radius:999px;padding:8px 18px;background:#3b82f6;color:#fff;' +
            'font-weight:700;font-size:.85rem;cursor:pointer;font-family:inherit}' +
            '.jd-credits-topup:hover{filter:brightness(1.1)}';
        document.head.appendChild(s);
    }

    // The "Usage & Limits" static row in Settings (has #geminiQueryCount).
    function findUsageRow() {
        var q = document.getElementById('geminiQueryCount');
        if (!q || !q.closest) return null;
        return q.closest('.settings-static-row');
    }

    function injectCreditsCard() {
        injectStyles();
        if (document.getElementById('jdCreditsCard')) return;
        var row = findUsageRow();
        if (!row || !row.parentNode) return;
        var card = document.createElement('div');
        card.id = 'jdCreditsCard';
        card.className = 'jd-credits-card';
        card.hidden = true;
        card.innerHTML =
            '<div class="jd-credits-head">' +
            '<span class="jd-credits-title"><span class="jd-bolt">⚡</span> Credits</span>' +
            '<span class="jd-credits-pct" id="jdCreditsPct">0% used</span>' +
            '</div>' +
            '<div class="jd-credits-bar"><span class="jd-credits-fill" id="jdCreditsFill"></span></div>' +
            '<div class="jd-credits-foot">' +
            '<span class="jd-credits-bal" id="jdCreditsBal"></span>' +
            '<button type="button" class="jd-credits-topup" id="jdCreditsTopup">Top up</button>' +
            '</div>';
        card.querySelector('#jdCreditsTopup').addEventListener('click', function () {
            JDCredits.openTopup();
        });
        row.parentNode.insertBefore(card, row.nextSibling);
        renderCredits();
    }

    function renderCredits() {
        var card = document.getElementById('jdCreditsCard');
        if (!card) return;
        if (balance === null) { card.hidden = true; return; }
        card.hidden = false;
        var total = totalCredited > 0 ? totalCredited : 0;
        var used = Math.max(0, total - balance);
        var pct = total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0;
        card.querySelector('#jdCreditsPct').textContent = pct + '% used';
        card.querySelector('#jdCreditsFill').style.width = pct + '%';
        card.querySelector('#jdCreditsBal').innerHTML =
            '<b>' + fmt(balance) + '</b> credits';
    }

    // Re-inject if the Settings panel is re-rendered.
    function observeSettings() {
        injectCreditsCard();
        if (typeof MutationObserver !== 'function') return;
        var mo = new MutationObserver(function () { injectCreditsCard(); });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    /* ---------- api ---------- */

    function refresh() {
        if (refreshing) return refreshing;
        refreshing = token().then(function (t) {
            if (!t) { balance = null; renderCredits(); return null; }
            return fetch('/api/credits-balance', {
                headers: { 'Authorization': 'Bearer ' + t },
                credentials: 'same-origin'
            }).then(function (r) {
                if (r.status === 401) { balance = null; renderCredits(); return null; }
                return r.json().catch(function () { return null; });
            }).then(function (d) {
                if (d && typeof d.balance === 'number') balance = d.balance;
                if (d && typeof d.total_credited === 'number') totalCredited = d.total_credited;
                renderCredits();
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
        renderCredits: renderCredits,

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
                            renderCredits();
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
                            renderCredits();
                        }
                        return d;
                    });
            }).catch(function () { return null; });
        }
    };

    window.JDCredits = JDCredits;

    /* ---------- fetch gate ---------- */
    /* Wraps window.fetch so POSTs to /api/chat are credit-gated and
       spend exactly once per successful generation. This is the
       no-index.html-edit alternative to surgical hooks: verified
       against every /api/chat call site in index.html (2026-09-30).
       - 'image': action generate-image / generate-pet-image (50)
       - 'chat': user-initiated message calls incl. Bible Scholar mode (10)
       - pass-through: provider-status, provider-models,
         custom-api-models, tts, vision sub-step (covered by the image
         charge), auto-summary, AI title, settings tester. */

    var BG_PREFIXES = [
        'Summarize this conversation for context preservation.',
        'Create a concise 3 to 6 word chat title.',
        'Look at the attached image carefully' // vision sub-step of image gen
    ];

    function classifyChatBody(body) {
        if (!body || typeof body !== 'object') return null;
        var action = body.action;
        if (action === 'generate-image' || action === 'generate-pet-image') return 'image';
        if (action) return null;
        if (typeof body.message !== 'string') return null;
        if (body.customApiProfile) return null; // settings tester call
        for (var i = 0; i < BG_PREFIXES.length; i++) {
            if (body.message.indexOf(BG_PREFIXES[i]) === 0) return null;
        }
        return 'chat';
    }

    function gatedChatFetch(kind, doFetch) {
        return JDCredits.ensure(kind).then(function (ok) {
            if (!ok) {
                // Top-up modal is already open; return a synthetic 402 so
                // the app's normal error UI shows instead of hanging.
                if (typeof Response === 'function') {
                    return new Response(JSON.stringify({ error: 'insufficient_credits' }), {
                        status: 402,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                return Promise.reject(new Error('insufficient_credits'));
            }
            return doFetch().then(function (res) {
                if (res && res.ok) {
                    var key = kind + ':' + Date.now().toString(36) + ':' +
                        Math.random().toString(36).slice(2, 10);
                    JDCredits.spend(kind, key);
                }
                return res;
            });
        });
    }

    function installFetchGate() {
        if (typeof window.fetch !== 'function') return;
        if (window.fetch.__jdCreditsGated) return;
        var origFetch = window.fetch.bind(window);
        var gated = function (input, init) {
            try {
                var url = typeof input === 'string' ? input :
                    (input && input.url ? input.url : '');
                var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
                if (url.indexOf('/api/chat') !== -1 && method === 'POST' &&
                    init && typeof init.body === 'string') {
                    var kind = null;
                    try { kind = classifyChatBody(JSON.parse(init.body)); }
                    catch (_) { kind = null; }
                    if (kind) {
                        return gatedChatFetch(kind, function () { return origFetch(input, init); });
                    }
                }
            } catch (_) { /* fall through to the original fetch */ }
            return origFetch(input, init);
        };
        gated.__jdCreditsGated = true;
        window.fetch = gated;
    }

    /* ---------- wiring ---------- */

    function initAccount() {
        token().then(function (t) {
            if (!t) { balance = null; renderCredits(); return; }
            JDCredits.claimWelcome().then(function () { refresh(); });
        });
    }

    observeSettings(); // credits card in Settings > Usage & Limits
    installFetchGate(); // gate /api/chat generations on credits
    initAccount(); // in case the initial auth event already fired
    window.addEventListener('jd:account-changed', initAccount);
    window.addEventListener('jdpay:paid', function () { refresh(); });
})();
