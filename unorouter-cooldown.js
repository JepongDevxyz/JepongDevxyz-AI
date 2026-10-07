/* =========================================================
   JepongDevxyz AI — UnoRouter free-model 60s cooldown (2026-10-06)
   Her order: UnoRouter free models allow 1 send per minute.
   After sending with an UnoRouter free model:
     - the send button locks for 60 seconds
     - a live "wait 60s" countdown ticks inside the composer textbox
   Also (2026-10-06): triggers the app's syncDynamicProviderModels()
   (defined in index.html but never called) so the picker shows ALL
   live UnoRouter models incl. the 107 free ones, not just 'auto'.
   Loaded by agent.js. Idempotent.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdUnoCooldownLoaded) return;
  window.__jdUnoCooldownLoaded = true;

  var COOLDOWN_MS = 60000;
  var cooldownUntil = 0;
  var tickId = null;

  function isUnoFreeModel(model) {
    if (!model) return false;
    var m = String(model).toLowerCase();
    return m.indexOf(':free') !== -1 || m.indexOf('/free') !== -1 || /-free$/.test(m);
  }

  function sendBtn() { return document.getElementById('mainActionBtn'); }
  function input() { return document.getElementById('userInput'); }

  function inCooldown() { return Date.now() < cooldownUntil; }
  function remainingSec() { return Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)); }

  function ensureBadge() {
    var badge = document.getElementById('jd-uno-cooldown-badge');
    if (badge) return badge;
    var ta = input();
    if (!ta) return null;
    var host = ta.closest ? (ta.closest('.prompt-bar') || ta.parentElement) : ta.parentElement;
    if (!host) return null;
    var cs = window.getComputedStyle(host);
    if (cs.position === 'static') host.style.position = 'relative';
    badge = document.createElement('div');
    badge.id = 'jd-uno-cooldown-badge';
    badge.setAttribute('aria-live', 'polite');
    badge.style.cssText =
      'position:absolute;top:6px;right:10px;z-index:30;pointer-events:none;' +
      'background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.55);color:#fbbf24;' +
      'font-size:12px;font-weight:700;padding:3px 10px;border-radius:999px;' +
      'font-family:inherit;white-space:nowrap;';
    host.appendChild(badge);
    return badge;
  }

  function paint() {
    var btn = sendBtn();
    var badge = document.getElementById('jd-uno-cooldown-badge');
    if (!inCooldown()) {
      if (btn) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.title = 'Send';
      }
      if (badge && badge.parentElement) badge.parentElement.removeChild(badge);
      if (tickId) { clearInterval(tickId); tickId = null; }
      cooldownUntil = 0;
      return;
    }
    var s = remainingSec();
    guardSendFn(); /* re-apply in case the app redefined the send fn */
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.35';
      btn.style.cursor = 'not-allowed';
      btn.title = 'UnoRouter free limit — wait ' + s + 's before sending again';
    }
    var b = ensureBadge();
    if (b) b.textContent = '\u23F3 wait ' + s + 's';
  }

  function startCooldown() {
    if (inCooldown()) return; /* already cooling down — don't restart */
    cooldownUntil = Date.now() + COOLDOWN_MS;
    paint();
    if (tickId) clearInterval(tickId);
    tickId = setInterval(paint, 250);
  }

  /* Block Enter-to-send during cooldown (capture phase, before app handler). */
  document.addEventListener('keydown', function (e) {
    if (!inCooldown()) return;
    var ta = input();
    if (ta && e.target === ta && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* Bulletproof: guard the app's own send function. The button's
     onclick calls the global handleMainAction(); wrapping it blocks
     sends during cooldown no matter how the click is triggered,
     even if the button is re-rendered or disabled is overridden. */
  function guardSendFn() {
    try {
      var fn = window.handleMainAction;
      if (typeof fn === 'function' && !fn.__jdUnoGuarded) {
        var orig = fn;
        var wrapped = function () {
          if (inCooldown()) return false;
          return orig.apply(this, arguments);
        };
        wrapped.__jdUnoGuarded = true;
        window.handleMainAction = wrapped;
      }
    } catch (e) {}
  }
  guardSendFn();

  /* Belt-and-suspenders: block send-button clicks during cooldown even if
     the app overrides the disabled property (capture phase). */
  document.addEventListener('click', function (e) {
    if (!inCooldown()) return;
    var t = e.target;
    if (t && t.closest && t.closest('#mainActionBtn')) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  /* ---------- UnoRouter model list sync ----------
     The app defines syncDynamicProviderModels() in index.html but never
     calls it, so the picker only shows the static 'auto'. Trigger it so
     ALL live UnoRouter models (incl. the 107 free ones) appear. */
  function triggerUnoSync() {
    try {
      if (typeof syncDynamicProviderModels === 'function') syncDynamicProviderModels();
      else if (window.syncDynamicProviderModels) window.syncDynamicProviderModels();
    } catch (e) {}
  }
  if (document.readyState === 'complete') triggerUnoSync();
  else window.addEventListener('load', triggerUnoSync);
  setTimeout(triggerUnoSync, 10000); /* retry in case keys weren't ready */

  /* ---------- UnoRouter picker: FREE MODELS ONLY + dead removed ----------
     Jepong's order (2026-10-07): the UnoRouter picker must show ONLY free
     models (no paid), and dead models (404) are removed.
     Implemented by filtering the provider-models response: keep 'auto'
     (bootstrap placeholder) + models ending in ':free', minus denylist. */
  var JD_UNO_DEAD = ['nemotron-nano-9b-v2:free']; /* 404s; add more as found */
  function filterUnoModels(data) {
    try {
      var prov = data && data.providers && data.providers.unorouter;
      if (prov && Array.isArray(prov.models)) {
        prov.models = prov.models.filter(function (m) {
          var id = m && m.id ? String(m.id) : '';
          if (!id) return false;
          var low = id.toLowerCase();
          if (low === 'auto') return true;
          if (JD_UNO_DEAD.indexOf(low) !== -1) return false;
          return low.endsWith(':free');
        });
      }
    } catch (e) {}
    return data;
  }

  /* Detect UnoRouter free-model sends via the chat request. */
  var origFetch = window.fetch;
  window.fetch = function (url, opts) {
    try {
      var urlStr = String(url || '');
      if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body) {
        var body = null;
        try { body = JSON.parse(opts.body); } catch (e) {}
        if (body && typeof body === 'object') {
          /* Filter the model catalog: free-only + dead removed. */
          if (body.action === 'provider-models') {
            return origFetch.apply(this, arguments).then(function (resp) {
              try {
                return resp.clone().json().then(function (data) {
                  var filtered = filterUnoModels(data);
                  return new Response(JSON.stringify(filtered), {
                    status: resp.status,
                    statusText: resp.statusText,
                    headers: resp.headers
                  });
                }).catch(function () { return resp; });
              } catch (e) { return resp; }
            });
          }
          if (String(body.provider || '').toLowerCase() === 'unorouter') {
          /* Fix (2026-10-06): 'auto' is a bootstrap placeholder, not a real
             UnoRouter model (sending it 404s). Resolve to the first live
             model from the dynamic catalog before the request goes out. */
          if (String(body.model || '').toLowerCase() === 'auto' && !body.__jdUnoResolved) {
            return resolveUnoAuto(url, opts, body);
          }
          if (isUnoFreeModel(body.model)) startCooldown();
          }
        }
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  var unoCatalogCache = null;
  var unoCatalogAt = 0;
  function resolveUnoAuto(url, opts, body) {
    /* Async: fetch the live catalog, substitute the first real model. */
    return (async function () {
      try {
        var now = Date.now();
        if (!unoCatalogCache || now - unoCatalogAt > 60000) {
          var r = await origFetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'provider-models' })
          });
          var j = await r.json();
          var list = j && j.providers && j.providers.unorouter && j.providers.unorouter.models;
          if (Array.isArray(list) && list.length) {
            unoCatalogCache = list;
            unoCatalogAt = now;
          }
        }
        var first = (unoCatalogCache || []).find(function (m) {
          var id = m && m.id ? String(m.id) : '';
          return id && id.toLowerCase() !== 'auto';
        });
        if (first) {
          body.model = first.id;
          body.__jdUnoResolved = true;
          opts.body = JSON.stringify(body);
          if (isUnoFreeModel(first.id)) startCooldown();
          return origFetch.call(this, url, opts);
        }
      } catch (e) {}
      /* Catalog unavailable — let the original request go through so the
         server returns its clear error (better than silently hanging). */
      return origFetch.apply(this, arguments);
    })();
  }
})();
