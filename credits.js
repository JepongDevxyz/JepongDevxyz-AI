/* ============================================================
   JepongDevxyz AI — credits frontend module
   - The Settings "Usage & Limits" row is converted into a
     clickable nav row (chevron). Tapping it opens a detail
     panel that shows the usage stats plus the credits card:
     balance, "% used" progress bar, Top up button. The card is
     NOT inline in the Settings list — it only appears inside
     the panel after the row is tapped.
   - ensure(kind): gate before an AI generation; opens the
     QR Ph top-up modal when the signed-in user's balance is
     insufficient. Guests (not signed in) get 100 free credits per
     UTC day, enforced SERVER-side per IP hash — clearing phone
     data cannot reset the quota. The phone only mirrors the
     remaining balance for instant display.
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
    var signedIn = null;      // null = unknown, true/false once known
    var totalCredited = 0;    // sum of all positive credit grants
    var refreshing = null;

    /* ---------- guest credits (100/day, server-enforced) ---------- */
    var guestBalance = null;  // remaining guest credits today (server is source of truth)
    var pendingGuestRefund = 0; // cost reserved for the in-flight guest request
    var GUEST_MIRROR = 'jd_guest_credit_mirror'; // phone-side mirror for instant display only

    function utcDay() {
        try { return new Date().toISOString().slice(0, 10); }
        catch (_) { return ''; }
    }
    function loadGuestMirror() {
        try {
            var m = JSON.parse(localStorage.getItem(GUEST_MIRROR) || 'null');
            if (m && m.day === utcDay() && typeof m.balance === 'number') {
                guestBalance = m.balance;
            } else if (m && m.day !== utcDay()) {
                guestBalance = null; // new day: re-fetch from server
            }
        } catch (_) {}
    }
    function saveGuestMirror() {
        try {
            localStorage.setItem(GUEST_MIRROR, JSON.stringify({ day: utcDay(), balance: guestBalance }));
        } catch (_) {}
    }
    // Calls the server guest-credits endpoint. Never throws.
    function guestApi(action, kind) {
        var body = { action: action };
        if (kind) body.kind = kind;
        return fetch('/api/guest-credits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        }).then(function (r) {
            return r.json().catch(function () { return null; }).then(function (d) {
                return { status: r.status, d: d };
            });
        });
    }
    function showGuestExhausted() {
        var msg = 'Naubos na ang 100 free credits mo ngayong araw. Mag-sign in para makakuha ng 500 credits at makapag-top up.';
        if (window.showModernAlert) window.showModernAlert(msg, 'Guest limit reached');
        else { try { alert(msg); } catch (_) {} }
    }
    // Refresh the guest balance from the server (source of truth).
    function guestStatusRefresh() {
        loadGuestMirror();
        renderCredits();
        guestApi('status').then(function (res) {
            var d = res.d;
            if (d && typeof d.balance === 'number' && !d.unenforced) {
                guestBalance = d.balance;
                saveGuestMirror();
                renderCredits();
            }
        }).catch(function () {});
    }
    // Guest gate: reserve credits on the server BEFORE the AI request.
    // Returns a promise of true when the send may proceed.
    function guestEnsure(kind) {
        loadGuestMirror();
        var cost = COSTS[kind] || COSTS.chat;
        // Fast-fail from the phone mirror; the server re-checks authoritatively.
        if (guestBalance !== null && guestBalance < cost) {
            renderCredits();
            showGuestExhausted();
            return Promise.resolve(false);
        }
        return guestApi('spend', kind).then(function (res) {
            var d = res.d;
            if (res.status === 402 || (d && d.error === 'insufficient')) {
                guestBalance = 0;
                saveGuestMirror();
                renderCredits();
                showGuestExhausted();
                return false;
            }
            if (d && d.ok === true && typeof d.balance === 'number' && !d.unenforced) {
                guestBalance = d.balance;
                saveGuestMirror();
                renderCredits();
                pendingGuestRefund = cost; // refund if the AI request itself fails
                return true;
            }
            pendingGuestRefund = 0;
            return true; // fail open: server not ready yet -> keep current behavior
        }).catch(function () {
            pendingGuestRefund = 0;
            return true; // fail open, never brick the app
        });
    }
    function guestRefund(kind, cost) {
        if (!cost) return;
        guestApi('refund', kind).then(function (res) {
            var d = res.d;
            if (d && typeof d.balance === 'number' && !d.unenforced) {
                guestBalance = d.balance;
                saveGuestMirror();
                renderCredits();
            }
        }).catch(function () {});
    }

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

    /* ---------- Usage & Limits detail panel ---------- */

    function injectStyles() {
        if (document.getElementById('jdCreditsStyles')) return;
        var s = document.createElement('style');
        s.id = 'jdCreditsStyles';
        s.textContent =
            '.jd-usage-stats{display:flex;gap:8px;padding:14px 16px}' +
            '.jd-usage-stats>div{flex:1;text-align:center;min-width:0}' +
            '.jd-usage-stats b{display:block;font-size:1.15rem;font-weight:700}' +
            '.jd-usage-stats span{font-size:.72rem;opacity:.65}' +
            '.jd-credits-card{margin:12px 0 0;padding:14px 16px;border-radius:16px;' +
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
            '.jd-credits-topup:hover{filter:brightness(1.1)}' +
            '.jd-credits-guest{margin:12px 0 0;font-size:.85rem;opacity:.75;text-align:center;padding:0 8px}';
        document.head.appendChild(s);
    }

    // The "Usage & Limits" static row in Settings. Located by its label text
    // (the old counters subtitle was removed 2026-09-30).
    function findStaticUsageRow() {
        var strongs = document.querySelectorAll('.settings-static-row strong');
        for (var i = 0; i < strongs.length; i++) {
            if (strongs[i].textContent.trim() === 'Usage & Limits' && strongs[i].closest) {
                return strongs[i].closest('.settings-static-row');
            }
        }
        return null;
    }

    // Turn the static row into a clickable nav row with a chevron.
    // The old "N words · M tokens · Q queries" subtitle is removed here —
    // usage now lives in Supabase and is shown inside the detail panel.
    function convertUsageRow() {
        var row = findStaticUsageRow();
        if (!row) return;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'settings-nav-row';
        btn.setAttribute('onclick', 'openJdUsageLimits()');
        btn.setAttribute('aria-label', 'Usage & Limits details');
        while (row.firstChild) btn.appendChild(row.firstChild);
        var small = btn.querySelector('small');
        if (small) small.remove();
        var chev = document.createElement('i');
        chev.setAttribute('data-lucide', 'chevron-right');
        btn.appendChild(chev);
        row.replaceWith(btn);
        if (typeof refreshLucideIcons === 'function') refreshLucideIcons(btn);
    }

    // Detail panel opened by tapping the row. Built once, reused.
    function buildUsageModal() {
        if (document.getElementById('jdUsageModal')) return;
        injectStyles();
        var ov = document.createElement('div');
        ov.className = 'modal-overlay';
        ov.id = 'jdUsageModal';
        ov.setAttribute('onclick', 'if(event.target===this)closeJdUsageLimits()');
        ov.innerHTML =
            '<section class="settings-home" role="dialog" aria-modal="true" aria-labelledby="jdUsageTitle" style="max-width:560px">' +
            '<header class="settings-home-header">' +
            '<button class="settings-back" type="button" onclick="closeJdUsageLimits()" aria-label="Back"><i data-lucide="arrow-left"></i></button>' +
            '<div class="settings-profile"><div><h2 id="jdUsageTitle">Usage &amp; Limits</h2>' +
            '<p>Credits and usage for your account</p></div></div>' +
            '</header>' +
            '<div class="settings-home-scroll">' +
            '<div class="settings-card-group" id="jdUsageStats"><div class="jd-usage-stats">' +
            '<div><b id="jdUsageWords">0</b><span>words</span></div>' +
            '<div><b id="jdUsageTokens">0</b><span>tokens</span></div>' +
            '<div><b id="jdUsageQueries">0</b><span>queries</span></div>' +
            '</div></div>' +
            '<div class="jd-credits-card" id="jdCreditsCard" hidden>' +
            '<div class="jd-credits-head">' +
            '<span class="jd-credits-title"><span class="jd-bolt">\u26a1</span> Credits</span>' +
            '<span class="jd-credits-pct" id="jdCreditsPct">0% used</span>' +
            '</div>' +
            '<div class="jd-credits-bar"><span class="jd-credits-fill" id="jdCreditsFill"></span></div>' +
            '<div class="jd-credits-foot">' +
            '<span class="jd-credits-bal" id="jdCreditsBal"></span>' +
            '<button type="button" class="jd-credits-topup" id="jdCreditsTopup">Top up</button>' +
            '</div></div>' +
            '<p class="jd-credits-guest" id="jdCreditsGuest" hidden>' +
            'Mag-sign in para makuha ang 500 free credits at makapag-top up gamit ang QR Ph.</p>' +
            '</div></section>';
        document.body.appendChild(ov);
        var topup = ov.querySelector('#jdCreditsTopup');
        if (topup) topup.addEventListener('click', function () { JDCredits.openTopup(); });
    }

    // Load the account's usage numbers from Supabase into the panel.
    // Guests have no Supabase row, so the stats block stays hidden for them.
    function syncUsageStats() {
        var wEl = document.getElementById('jdUsageWords');
        var tEl = document.getElementById('jdUsageTokens');
        var qEl = document.getElementById('jdUsageQueries');
        var block = document.getElementById('jdUsageStats');
        if (!wEl || !tEl || !qEl) return;
        token().then(function (t) {
            if (!t) { if (block) block.hidden = true; return; }
            if (block) block.hidden = false;
            return fetch('/api/usage-sync', {
                headers: { 'Authorization': 'Bearer ' + t },
                credentials: 'same-origin'
            }).then(function (r) {
                if (!r.ok) return null;
                return r.json().catch(function () { return null; });
            }).then(function (d) {
                if (!d) return;
                wEl.textContent = fmt(d.words || 0);
                tEl.textContent = fmt(d.tokens || 0);
                qEl.textContent = fmt(d.queries || 0);
            }).catch(function () {});
        }).catch(function () {});
    }

    // --- Supabase usage sync ---------------------------------------------
    // Wraps the page's incrementCounters() (chat, image, Bible Scholar all
    // funnel through it) so every generation also syncs its word/query
    // deltas to the usage_stats table. Batched + fail-open: the original
    // always runs first, and a failed sync never breaks the page.
    var usageQueue = { words: 0, queries: 0 };
    var usageFlushTimer = null;

    function flushUsageDelta() {
        usageFlushTimer = null;
        var w = usageQueue.words, q = usageQueue.queries;
        usageQueue.words = 0; usageQueue.queries = 0;
        if ((!w && !q) || typeof fetch !== 'function') return;
        token().then(function (t) {
            if (!t) return; // guests: no Supabase row
            return fetch('/api/usage-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + t
                },
                credentials: 'same-origin',
                body: JSON.stringify({ words_delta: w, queries_delta: q })
            }).catch(function () {});
        }).catch(function () {});
    }

    function queueUsageDelta(words, queries) {
        usageQueue.words += Math.max(0, words | 0);
        usageQueue.queries += Math.max(0, queries | 0);
        if (!usageFlushTimer) usageFlushTimer = setTimeout(flushUsageDelta, 5000);
    }

    function installUsageSync() {
        if (typeof window.incrementCounters !== 'function') return;
        if (window.incrementCounters.__jdUsageSynced) return;
        var orig = window.incrementCounters;
        var wrapped = function (text) {
            var ret;
            try { ret = orig.apply(this, arguments); }
            catch (e) { ret = undefined; }
            try {
                var clean = String(text == null ? '' : text).trim();
                var words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
                queueUsageDelta(words, 1);
            } catch (_) {}
            return ret;
        };
        wrapped.__jdUsageSynced = true;
        window.incrementCounters = wrapped;
        if (typeof window.addEventListener === 'function') {
            window.addEventListener('pagehide', flushUsageDelta);
        }
    }

    function ensureUsageStructure() {
        convertUsageRow();
        buildUsageModal();
        installUsageSync();
    }

    function ensureUsagePanel() {
        ensureUsageStructure();
        renderCredits();
    }

    window.openJdUsageLimits = function () {
        ensureUsagePanel();
        syncUsageStats();
        if (typeof closeTransientSurfaces === 'function') closeTransientSurfaces('jdUsageModal');
        var m = document.getElementById('jdUsageModal');
        if (m) {
            m.classList.add('open');
            if (typeof refreshLucideIcons === 'function') {
                requestAnimationFrame(function () { refreshLucideIcons(m); });
            }
        }
        JDCredits.refresh();
    };

    window.closeJdUsageLimits = function () {
        var m = document.getElementById('jdUsageModal');
        if (m) m.classList.remove('open');
        if (typeof openSettingsModal === 'function') openSettingsModal();
    };

    // Rendered-values cache: renderCredits() is also reachable from the
    // Settings MutationObserver, so it must NEVER write to the DOM when
    // nothing changed — otherwise the observer would refire forever and
    // freeze the page.
    var lastRenderKey = '';
    function renderCredits() {
        var card = document.getElementById('jdCreditsCard');
        var guest = document.getElementById('jdCreditsGuest');
        if (!card) return;
        var key;
        if (balance === null) {
            key = 'null:' + (signedIn === false ? 'guest' : 'unknown') + ':gb:' + guestBalance;
            if (key === lastRenderKey) return;
            lastRenderKey = key;
            card.hidden = true;
            if (guest) {
                guest.hidden = !(signedIn === false);
                if (signedIn === false) {
                    var rem = guestBalance === null ? '\u2026' : fmt(guestBalance);
                    guest.innerHTML =
                        'Guest mode: <b>' + rem + '</b> / 100 free credits ngayong araw.<br>' +
                        'Mag-sign in para makuha ang 500 free credits at makapag-top up gamit ang QR Ph.';
                }
            }
            return;
        }
        var total = totalCredited > 0 ? totalCredited : 0;
        var used = Math.max(0, total - balance);
        var pct = total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0;
        key = 'bal:' + balance + ':pct:' + pct;
        if (key === lastRenderKey) return;
        lastRenderKey = key;
        card.hidden = false;
        if (guest) guest.hidden = true;
        card.querySelector('#jdCreditsPct').textContent = pct + '% used';
        card.querySelector('#jdCreditsFill').style.width = pct + '%';
        card.querySelector('#jdCreditsBal').innerHTML =
            '<b>' + fmt(balance) + '</b> credits';
    }

    // Re-apply structure only (never re-render here) if Settings is re-rendered.
    function observeSettings() {
        ensureUsagePanel();
        if (typeof MutationObserver !== 'function') return;
        var mo = new MutationObserver(function () { ensureUsageStructure(); });
        mo.observe(document.documentElement, { childList: true, subtree: true });
    }

    /* ---------- api ---------- */

    function refresh() {
        if (refreshing) return refreshing;
        refreshing = token().then(function (t) {
            if (!t) { signedIn = false; balance = null; renderCredits(); return null; }
            signedIn = true;
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
                if (!t) return guestEnsure(kind); // guest: server-side daily quota
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
        pendingGuestRefund = 0;
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
            // Guest credits were reserved server-side in ensure(); refund
            // them if the AI request itself fails. Signed-in users spend
            // after success via JDCredits.spend (unchanged).
            var refundCost = pendingGuestRefund;
            pendingGuestRefund = 0;
            var doRefund = function () { guestRefund(kind, refundCost); };
            return doFetch().then(function (res) {
                if (res && res.ok) {
                    if (!refundCost) {
                        var key = kind + ':' + Date.now().toString(36) + ':' +
                            Math.random().toString(36).slice(2, 10);
                        JDCredits.spend(kind, key);
                    }
                } else {
                    doRefund();
                }
                return res;
            }, function (err) {
                doRefund();
                throw err;
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
            if (!t) { signedIn = false; balance = null; guestStatusRefresh(); return; }
            JDCredits.claimWelcome().then(function () { refresh(); });
        });
    }

    observeSettings(); // Usage & Limits row -> clickable + detail panel
    installFetchGate(); // gate /api/chat generations on credits
    initAccount(); // in case the initial auth event already fired
    window.addEventListener('jd:account-changed', initAccount);
    window.addEventListener('jdpay:paid', function () { refresh(); });
})();
