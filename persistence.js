/* ============================================================
   persistence.js — "never give up" directive for JepongDevxyz AI.

   Appends a persistence block to body.personalization.customInstructions
   on every POST /api/chat. The server appends customInstructions to the
   system prompt for every provider, so the directive works identically
   on all models (GPT, Claude, Gemini, Grok, etc.).

   What it does: when a tool call, API call, or requested action FAILS,
   the AI must diagnose the error and try a DIFFERENT approach — an
   alternative tool, a different endpoint or method, a workaround through
   another route — instead of stopping at the first error. It only reports
   failure after all reasonable alternatives are exhausted.

   What it does NOT do: it never expands permission. Trying another WAY
   is not trying without approval — the user's approval gates
   (push/commit/branch, purchases, sends) still apply to every attempt.

   Fail-open and idempotent: never blocks or alters the request when
   anything is missing or unparsable; the MARK guard keeps it appended
   exactly once per request no matter how many patches wrap fetch.
   ============================================================ */
(function () {
if (window.__jdPersistence) return;
window.__jdPersistence = true;

var MARK = '[jd-persistence]';
var BLOCK = MARK + '\n' +
  'PERSISTENCE RULE — never stop at the first failure. When a tool call, API call, or requested action FAILS: ' +
  '(1) read the error and diagnose the root cause instead of retrying blindly; ' +
  '(2) try a DIFFERENT approach using a DIFFERENT tool — use your FULL toolbox, the way a resourceful assistant would: ' +
  'built-in tools, connectors (GitHub, Vercel, Browser), web search to research the error and find workarounds, ' +
  'and the browser to work through the web UI when an API route is blocked. ' +
  'Cycle through them instead of hammering the same failing tool: if the direct API call fails, try the connector; ' +
  'if the connector fails, try the browser; if an error is unclear, search the web for its cause. ' +
  '(3) verify each attempt actually succeeded before moving on. ' +
  'Keep trying reasonable alternatives. Only tell the user something failed after every reasonable alternative is exhausted, ' +
  'and when you do, list what you tried and what specifically blocked each attempt. ' +
  'Persistence means finding another WAY, never expanding permission: every attempt still needs the approvals the user gave, ' +
  'and you must never do anything the user did not ask for.';

function install() {
  if (typeof window.fetch !== 'function') return;
  if (window.fetch.__jdPersistence) return;
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
          var pers = (body.personalization && typeof body.personalization === 'object') ? body.personalization : {};
          var cur = typeof pers.customInstructions === 'string' ? pers.customInstructions : '';
          if (cur.indexOf(MARK) === -1) {
            pers.customInstructions = (cur ? cur + '\n\n' : '') + BLOCK;
            body.personalization = pers;
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      }
    } catch (_) { /* fail-open: send the request untouched */ }
    return origFetch(input, init);
  };
  wrapped.__jdPersistence = true;
  /* Preserve sibling wrapper markers so chained patches keep working. */
  if (origFetch.__jdCreditsGated) wrapped.__jdCreditsGated = true;
  if (origFetch.__jdConnectorBridge) wrapped.__jdConnectorBridge = true;
  if (origFetch.__jdPluginInject) wrapped.__jdPluginInject = true;
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
