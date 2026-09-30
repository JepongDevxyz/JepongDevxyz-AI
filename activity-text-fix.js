/* ============================================================
   JepongDevxyz AI — activity text fix (runtime, 2026-10-01)
   Keisha: the activity feed shows "[object Object]" rows when a
   provider fails (see the error video). Root cause: the server
   sometimes emits activity events whose label/detail is an OBJECT
   (e.g. detail:last.error where last.error is a parsed provider
   error object). normalizeActivityEventForUI() runs String(obj),
   which bakes the literal text "[object Object]" into the row.
   This patch wraps normalizeActivityEventForUI and coerces
   label/detail into readable text BEFORE that happens:
     object -> .message / .detail / .error / .text (nested too),
                else a truncated JSON snapshot, else fallback
     "[object Object]" string -> fallback (never rendered again)
   It also caps the activity list height while the keyboard is open
   so a long failure timeline can't overflow ("lumampas") the small
   viewport — the list scrolls internally instead.
   Additive only; idempotent; fail-open.
   ============================================================ */
(function () {
    'use strict';

    function activityText(v, fallback) {
        if (v == null) return fallback;
        if (typeof v === 'string') {
            return v.trim() === '[object Object]' ? fallback : v;
        }
        if (typeof v === 'object') {
            var cand = v.message || v.detail || v.error || v.text || v.label;
            if (typeof cand === 'string' && cand.trim()) return cand;
            if (cand != null && typeof cand === 'object') {
                var inner = cand.message || cand.detail || cand.text || cand.error;
                if (typeof inner === 'string' && inner.trim()) return inner;
            }
            try {
                var j = JSON.stringify(v);
                if (j && j !== '{}' && j !== '[]') return j.slice(0, 200);
            } catch (e) { /* fall through to fallback */ }
            return fallback;
        }
        return String(v);
    }

    function sanitize(evt) {
        if (!evt || typeof evt !== 'object') return evt;
        var label = activityText(evt.label, '');
        var detail = activityText(evt.detail, '');
        if (label === evt.label && detail === evt.detail) return evt;
        var out = {}, k;
        for (k in evt) out[k] = evt[k];
        out.label = label;
        out.detail = detail;
        return out;
    }

    function hook() {
        try {
            var orig = window.normalizeActivityEventForUI;
            if (typeof orig !== 'function' || orig.__jdTextFix) return true;
            var wrapped = function (evt) { return orig.call(this, sanitize(evt)); };
            wrapped.__jdTextFix = true;
            window.normalizeActivityEventForUI = wrapped;
            return true;
        } catch (e) { return false; }
    }

    function ensureCss() {
        try {
            if (document.getElementById('jdActivityTextFixCss')) return;
            var s = document.createElement('style');
            s.id = 'jdActivityTextFixCss';
            s.textContent =
                'html.keyboard-open #aiActivityList{max-height:34dvh;overflow-y:auto;overscroll-behavior:contain}';
            document.head.appendChild(s);
        } catch (e) { /* fail-open */ }
    }

    ensureCss();
    if (!hook()) {
        var tries = 0;
        var iv = setInterval(function () {
            tries++;
            if (hook() || tries > 40) clearInterval(iv);
        }, 250);
    }
})();
