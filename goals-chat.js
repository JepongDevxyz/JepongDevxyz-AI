/* ============================================================
   goals-chat.js v2 — Goals context + AI goal management.

   1. Injects the user's active goals into
      body.personalization.customInstructions on every POST /api/chat,
      plus the goal-management marker protocol.
   2. Taps the SSE response stream: when the AI emits
        [[JD_GOAL_CREATE|title|description|category]]
        [[JD_GOAL_ENTRY|goal_id_or_title|title|description]]
        [[JD_GOAL_PROGRESS|goal_id_or_title|percent]]
      the patch executes the operation through window.JDGoals
      (Supabase/localStorage with the user's own auth context),
      shows the branded toast, and strips the marker from the
      displayed text so the user never sees raw markers.

   Marker fields are pipe-separated; pipes inside fields must be
   avoided by the model (instruction says so).

   Fail-open and idempotent: never blocks or alters the request/
   response when goals are unavailable; the MARK guard keeps the
   instruction appended exactly once per request.
   ============================================================ */
(function () {
if (window.__jdGoalsChatV2) return;
window.__jdGoalsChatV2 = true;
window.__jdGoalsChat = true; /* compat flag for v1 consumers */

var MARK = '[jd-goals-context]';
var GOAL_MARK_RE = /\[\[JD_GOAL_(CREATE|ENTRY|PROGRESS)\|([^\]]*)\]\]/;

function goalsBlock() {
  try {
    if (window.JDGoals && typeof window.JDGoals.contextForChat === 'function') {
      var ctx = window.JDGoals.contextForChat();
      var proto =
        'GOAL MANAGEMENT — you can manage the user\'s goals directly. ' +
        'When the user states a new aspiration or durable outcome, first mention it conversationally ' +
        '(e.g. "Gagawa ako ng goal na ..."), then emit EXACTLY one marker on its own: ' +
        '[[JD_GOAL_CREATE|title|description|category]] where category is one of ' +
        'health, relationships, money, career, interests, productivity, something_else. ' +
        'When the user reports meaningful progress, emit [[JD_GOAL_ENTRY|goal title or id|entry title|details]]. ' +
        'When they give a new percentage, emit [[JD_GOAL_PROGRESS|goal title or id|percent]]. ' +
        'Never put the pipe character | inside a field. The app executes the marker and toasts a confirmation; ' +
        'do not describe the marker syntax to the user.';
      if (ctx) return MARK + '\n' + ctx + '\n' + proto;
      return MARK + '\n' + proto;
    }
  } catch (_) {}
  return '';
}

function handleMarker(kind, payload) {
  try {
    if (!window.JDGoals) return;
    var parts = String(payload).split('|');
    if (kind === 'CREATE') {
      window.JDGoals.aiCreate(parts[0] || '', parts[1] || '', parts[2] || '');
    } else if (kind === 'ENTRY') {
      window.JDGoals.aiLogEntry(parts[0] || '', parts[1] || '', parts[2] || '');
    } else if (kind === 'PROGRESS') {
      window.JDGoals.aiSetProgress(parts[0] || '', parts[1] || '');
    }
  } catch (_) {}
}

/* Stream tap: strip markers, execute goal ops, pass text through. */
function tapResponse(res) {
  try {
    if (!res || !res.body || typeof res.body.getReader !== 'function') return res;
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var encoder = new TextEncoder();
    var buf = '';
    var stream = new ReadableStream({
      start: function (controller) {
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              /* flush remainder (markers need full match; emit leftover as-is) */
              var m, out = buf;
              buf = '';
              /* one last scan in case a complete marker sits in the tail */
              var cleaned = '';
              var rest = out;
              while ((m = GOAL_MARK_RE.exec(rest))) {
                cleaned += rest.slice(0, m.index);
                handleMarker(m[1], m[2]);
                rest = rest.slice(m.index + m[0].length);
              }
              cleaned += rest;
              if (cleaned) controller.enqueue(encoder.encode(cleaned));
              controller.close();
              return;
            }
            buf += decoder.decode(r.value, { stream: true });
            var out2 = '';
            var mm;
            var hold = 120; /* tail holdback for split markers */
            var scan = buf.length > hold ? buf.slice(0, buf.length - hold) : '';
            var tail = buf.length > hold ? buf.slice(buf.length - hold) : buf;
            var rest2 = scan;
            while ((mm = GOAL_MARK_RE.exec(rest2))) {
              out2 += rest2.slice(0, mm.index);
              handleMarker(mm[1], mm[2]);
              rest2 = rest2.slice(mm.index + mm[0].length);
            }
            out2 += rest2;
            buf = tail;
            if (out2) controller.enqueue(encoder.encode(out2));
            return pump();
          }).catch(function () {
            try { controller.close(); } catch (_) {}
          });
        }
        return pump();
      }
    });
    return new Response(stream, {
      status: res.status, statusText: res.statusText,
      headers: res.headers
    });
  } catch (_) {
    return res;
  }
}

function install() {
  if (typeof window.fetch !== 'function') return;
  if (window.fetch.__jdGoalsChat) return;
  var origFetch = window.fetch.bind(window);
  var wrapped = function (input, init) {
    var isChat = false;
    try {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      isChat = url.indexOf('/api/chat') !== -1 && method === 'POST';
      if (isChat && init && typeof init.body === 'string') {
        var body = null;
        try { body = JSON.parse(init.body); } catch (_) { body = null; }
        if (body && typeof body === 'object' && !body.action) {
          var pers = (body.personalization && typeof body.personalization === 'object') ? body.personalization : {};
          var cur = typeof pers.customInstructions === 'string' ? pers.customInstructions : '';
          if (cur.indexOf(MARK) === -1) {
            var block = goalsBlock();
            if (block) {
              pers.customInstructions = (cur ? cur + '\n\n' : '') + block;
              body.personalization = pers;
              init = Object.assign({}, init, { body: JSON.stringify(body) });
            }
          }
        }
      }
    } catch (_) { /* fail-open */ }
    var p = origFetch(input, init);
    if (isChat && p && typeof p.then === 'function') {
      return p.then(function (res) { return tapResponse(res); });
    }
    return p;
  };
  wrapped.__jdGoalsChat = true;
  /* Preserve sibling wrapper markers so chained patches keep working. */
  if (origFetch.__jdPersistence) wrapped.__jdPersistence = true;
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
setTimeout(install, 1500);
})();
