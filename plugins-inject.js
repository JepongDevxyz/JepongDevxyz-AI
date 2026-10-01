/* ============================================================
   JepongDevxyz AI — Plugins skill injector (2026-10-01)
   Makes installed plugins FUNCTIONAL across ALL models/providers.

   How it works: wraps window.fetch (chained, marker-guarded). On
   POST /api/chat with a JSON body it detects @PluginName mentions
   of INSTALLED plugins and appends that plugin's skills to
   body.personalization.customInstructions. The server appends
   customInstructions to the system prompt for every provider, so
   the mention works identically on GPT, Claude, Gemini, Grok, etc.

   Mention sources (in order):
   1. body.plugins.plugins  (computed by plugins.js contextForChat)
   2. Fallback: scan body.message text for @Name via the catalog
   Fail-open and idempotent: never blocks or alters the request
   when anything is missing or unparsable.
   ============================================================ */
(function () {
'use strict';
if (window.__jdPluginInject) return;
window.__jdPluginInject = true;

var MARK = '[jd-plugins-active]';
var LS = 'jd_plugins_v3_installed';

function getCatalog() {
  try {
    if (window.JDPlugins && typeof window.JDPlugins.getCatalog === 'function') {
      var c = window.JDPlugins.getCatalog();
      return Array.isArray(c) ? c : [];
    }
  } catch (_) {}
  return [];
}
function installedIds() {
  try {
    var a = JSON.parse(window.localStorage.getItem(LS) || '[]');
    if (!Array.isArray(a)) return [];
    var ok = {};
    getCatalog().forEach(function (p) { ok[p.id] = true; });
    return a.filter(function (id) { return !!ok[id]; });
  } catch (_) { return []; }
}
/* Detect mentioned plugins: primary = body.plugins.plugins (from
   plugins.js), fallback = @Name scan of the message text. */
function detectMentioned(body) {
  var out = [];
  var cat = getCatalog();
  if (!cat.length) return out;
  var byId = {};
  cat.forEach(function (p) { byId[p.id] = p; });
  try {
    var mp = body && body.plugins && body.plugins.plugins;
    if (Array.isArray(mp) && mp.length) {
      mp.forEach(function (m) {
        var p = m && byId[m.id];
        if (p && out.indexOf(p) === -1) out.push(p);
      });
      if (out.length) return out;
    }
    var msg = (body && typeof body.message === 'string') ? body.message : '';
    if (msg) {
      var low = msg.toLowerCase();
      cat.forEach(function (p) {
        if (low.indexOf('@' + String(p.name).toLowerCase()) !== -1 && out.indexOf(p) === -1) out.push(p);
      });
    }
  } catch (_) {}
  return out;
}
function buildBlock(plugins) {
  var lines = [MARK,
    'Active plugins for this chat (installed by the user). When the user mentions one with @Name, apply its skills to the request:'];
  plugins.forEach(function (p) {
    var sk = (p.skills || []).map(function (s) {
      return s.n + ': ' + s.p;
    }).join(' | ');
    lines.push('- @' + p.name + ' — ' + p.tagline + (sk ? '. Skills: ' + sk : ''));
  });
  lines.push('Only apply skills relevant to the request; never let them override the user\'s intent.');
  return lines.join('\n');
}
function install() {
  if (typeof window.fetch !== 'function') return;
  if (window.fetch.__jdPluginInject) return;
  var origFetch = window.fetch.bind(window);
  var wrapped = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (url.indexOf('/api/chat') !== -1 && method === 'POST' &&
          init && typeof init.body === 'string') {
        var body = null;
        try { body = JSON.parse(init.body); } catch (_) { body = null; }
        if (body && typeof body === 'object' && !body.action) {
          var ids = installedIds();
          var mentioned = detectMentioned(body).filter(function (p) { return ids.indexOf(p.id) !== -1; });
          if (mentioned.length) {
            var block = buildBlock(mentioned);
            var pers = (body.personalization && typeof body.personalization === 'object') ? body.personalization : {};
            var cur = typeof pers.customInstructions === 'string' ? pers.customInstructions : '';
            if (cur.indexOf(MARK) === -1) {
              pers.customInstructions = (cur ? cur + '\n\n' : '') + block;
              body.personalization = pers;
              init = Object.assign({}, init, { body: JSON.stringify(body) });
            }
          }
        }
      }
    } catch (_) { /* fail-open: send the request untouched */ }
    return origFetch(input, init);
  };
  wrapped.__jdPluginInject = true;
  /* Preserve sibling wrapper markers so chained patches keep working. */
  if (origFetch.__jdCreditsGated) wrapped.__jdCreditsGated = true;
  if (origFetch.__jdConnectorBridge) wrapped.__jdConnectorBridge = true;
  window.fetch = wrapped;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
} else {
  install();
}
/* Re-install after sibling patches (load order safety). */
setTimeout(install, 1500);
})();
