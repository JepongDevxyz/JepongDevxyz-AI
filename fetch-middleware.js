/* =========================================================
   JepongDevxyz AI — Fetch Middleware Registry
   Replaces the fragile 23-file window.fetch wrapper chain
   with an explicit, order-independent middleware registry.

   Usage in patch files (instead of direct window.fetch wrapping):
     JDfetch.use('my-feature', async (input, init, next) => {
       // ... modify input/init or inspect ...
       const response = await next(input, init);
       // ... modify response ...
       return response;
     });

   Benefits:
   - Order-independent: middleware run in registration order
   - Debuggable: JDfetch.list() shows all registered middleware
   - Safe: each middleware isolated, can't break the chain
   - Idempotent: re-registering same name replaces, doesn't duplicate
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdFetchRegistry) return;
  window.__jdFetchRegistry = true;

  var middlewares = []; // [{name, fn}]
  var originalFetch = window.fetch.bind(window);
  var installed = false;

  function install() {
    if (installed) return;
    installed = true;
    window.fetch = function (input, init) {
      var idx = 0;
      function next(inp, ini) {
        if (idx >= middlewares.length) {
          return originalFetch(inp, ini);
        }
        var mw = middlewares[idx++];
        try {
          return mw.fn(inp, ini, next);
        } catch (e) {
          console.warn('[JDfetch] middleware "' + mw.name + '" threw:', e);
          return next(inp, ini);
        }
      }
      return next(input, init);
    };
    // Mark so legacy wrappers can detect us
    window.fetch.__jdRegistry = true;
  }

  window.JDfetch = {
    use: function (name, fn) {
      if (typeof fn !== 'function') return;
      install();
      // Replace if same name exists (idempotent)
      for (var i = 0; i < middlewares.length; i++) {
        if (middlewares[i].name === name) {
          middlewares[i].fn = fn;
          return;
        }
      }
      middlewares.push({ name: name, fn: fn });
    },
    remove: function (name) {
      middlewares = middlewares.filter(function (m) { return m.name !== name; });
    },
    list: function () {
      return middlewares.map(function (m) { return m.name; });
    },
    // For migration: get the original fetch
    original: function () {
      return originalFetch;
    }
  };
})();
