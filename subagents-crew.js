/* ============================================================
   subagents-crew.js — hybrid sub-agent crew (Brigade-inspired).

   1. Injects an instruction block (MARK '[jd-crew]') into
      body.personalization.customInstructions on every POST /api/chat
      whose JSON body has no `action` field. Sub-agent fan-out calls
      carry `_jdCrewSub:true` and are SKIPPED entirely (no MARK
      injection, no stream tap) so they stay clean scoped workers.
   2. Taps the response stream: when the model emits
        [[JD_CREW|role1: task1|role2: task2|...]]
      (2-4 subtasks max, no '|' inside fields) the marker is stripped
      from the displayed text (the user never sees raw markers) and a
      "Crew plan" card is appended to the finished assistant message:
      role badges + task rows, a credit estimate line, and TWO buttons:
      "Hatiin sa N" (parallel client-side fan-out — one POST /api/chat
      per sub-agent, since Vercel Edge can't do background work) and
      "Isang bagsakan" (one normal single-agent request).
   3. "Hatiin" shows live per-agent status rows, fires the calls with
      Promise.allSettled + ~60s per-call timeout, then sends a merge
      request through the real chat pipeline. Failed sub-agents are
      noted in the merge; the rest still merge. Fail-open everywhere.

   Marker fields never contain '|' (the instruction says so).
   ============================================================ */
(function () {
'use strict';
if (window.__jdCrew) return;
window.__jdCrew = true;

var MARK = '[jd-crew]';
var CREW_MARK_RE = /\[\[JD_CREW((?:\|[^|\]]+)+)\]\]/;
var CREW_LEFTOVER_RE = /\[\[JD_CREW(?:\|[^|\]]+)+\]\]/g;
var FANOUT_TIMEOUT_MS = 60000;
var HOLDBACK = 600; /* tail holdback so split markers never flash on screen */

function crewBlock() {
  return MARK + '\n' +
    'SUB-AGENT CREW — only when the user\'s request genuinely contains 2 or more ' +
    'INDEPENDENT, parallelizable subtasks (e.g. "research X, write code for Y, then ' +
    'summarize" — separate jobs that can run at the same time). In that case, reply ' +
    'with one short conversational line AND emit EXACTLY one marker on its own line: ' +
    '[[JD_CREW|role1: task1|role2: task2|...]] with 2 to 4 subtasks max. Use short role ' +
    'names (Researcher, Coder, Writer, Planner). Never put the | character inside a role ' +
    'or task. Never describe or explain the marker to the user — the app turns it into ' +
    'a crew plan card with a choice. For simple questions, single tasks, or plain ' +
    'conversation, NEVER emit the marker — just answer normally.';
}

function toast(msg) {
  try {
    if (typeof window.showModernToast === 'function') window.showModernToast(msg);
  } catch (_) {}
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- CSS (injected once, theme via CSS vars) ---------- */
function ensureCss() {
  try {
    if (document.getElementById('jd-crew-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-crew-css';
    st.textContent =
      '.jd-crew-card{margin:10px 0 2px;border:1px solid var(--border-color);border-radius:14px;' +
      'background:var(--modal-bg);overflow:hidden;max-width:100%}\n' +
      '.jd-crew-card__head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border-color)}\n' +
      '.jd-crew-card__head svg{width:20px;height:20px;flex:0 0 auto;color:var(--text-main);opacity:.8}\n' +
      '.jd-crew-card__title{font-size:14px;font-weight:600;color:var(--text-main);line-height:1.3}\n' +
      '.jd-crew-card__sub{font-size:12px;color:var(--text-main);opacity:.6;margin-top:2px}\n' +
      '.jd-crew-card__rows{padding:10px 14px 4px;display:flex;flex-direction:column;gap:8px}\n' +
      '.jd-crew-card__row{display:flex;align-items:flex-start;gap:10px}\n' +
      '.jd-crew-card__badge{flex:0 0 auto;font-size:11px;font-weight:700;color:var(--text-main);' +
      'border:1px solid var(--border-color);border-radius:999px;padding:3px 10px;white-space:nowrap}\n' +
      '.jd-crew-card__task{font-size:13px;color:var(--text-main);opacity:.85;line-height:1.5;padding-top:2px}\n' +
      '.jd-crew-card__credits{padding:10px 14px 0;font-size:11px;color:var(--text-main);opacity:.55}\n' +
      '.jd-crew-card__actions{display:flex;gap:10px;padding:12px 14px 14px}\n' +
      '.jd-crew-card__btn{flex:1;padding:11px 0;border-radius:12px;font-size:13px;font-weight:600;cursor:pointer}\n' +
      '.jd-crew-card__btn--split{background:var(--text-main);border:1px solid var(--text-main);color:var(--modal-bg)}\n' +
      '.jd-crew-card__btn--single{background:transparent;border:1px solid var(--border-color);color:var(--text-main)}\n' +
      '.jd-crew-card__btn:disabled{opacity:.45;cursor:default}\n' +
      '.jd-crew-card__btn:active:not(:disabled){transform:scale(.98)}\n' +
      '.jd-crew-card__status{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px}\n' +
      '.jd-crew-card__srow{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--text-main);opacity:.75}\n' +
      '.jd-crew-card__dot{width:9px;height:9px;border-radius:50%;background:#fbbf24;flex:0 0 auto;' +
      'animation:jd-crew-pulse 1.1s ease-in-out infinite}\n' +
      '.jd-crew-card__srow.is-done{opacity:.9}\n' +
      '.jd-crew-card__srow.is-done .jd-crew-card__dot{background:#4ade80;animation:none}\n' +
      '.jd-crew-card__srow.is-fail .jd-crew-card__dot{background:#f87171;animation:none}\n' +
      '@keyframes jd-crew-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.8)}}\n';
    document.head.appendChild(st);
  } catch (_) {}
}

var SVG_USERS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

/* ---------- plan parsing ---------- */
function parsePlan(inner) {
  try {
    var parts = String(inner || '').split('|');
    var plan = [];
    for (var i = 0; i < parts.length && plan.length < 4; i++) {
      var p = parts[i].trim();
      if (!p) continue;
      var ci = p.indexOf(':');
      var role = (ci > 0 ? p.slice(0, ci) : p).trim().slice(0, 24) || 'Agent';
      var task = (ci > 0 ? p.slice(ci + 1) : p).trim().slice(0, 220);
      if (!task) continue;
      plan.push({ role: role, task: task });
    }
    return plan.length >= 2 ? plan : null;
  } catch (_) {
    return null;
  }
}

function captureUserText(body) {
  try {
    var t = body.message || body.text || body.prompt || '';
    if (!t && Array.isArray(body.history)) {
      for (var i = body.history.length - 1; i >= 0; i--) {
        var h = body.history[i];
        if (h && h.role === 'user' && (h.text || h.content)) { t = h.text || h.content; break; }
      }
    }
    return String(t || '').slice(0, 2000);
  } catch (_) {
    return '';
  }
}

/* ---------- scrub leftover markers from a message element ---------- */
function scrubLeftovers(msg) {
  try {
    CREW_LEFTOVER_RE.lastIndex = 0;
    var walker = document.createTreeWalker(msg, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      try {
        if (CREW_LEFTOVER_RE.test(tn.nodeValue)) {
          CREW_LEFTOVER_RE.lastIndex = 0;
          tn.nodeValue = tn.nodeValue.replace(CREW_LEFTOVER_RE, '');
        }
      } catch (_) {}
    });
  } catch (_) {}
}

/* ---------- stream tap: strip markers, remember the plan ---------- */
var pendingPlan = null;

function tapResponse(res, userText, onPlan, onDone) {
  try {
    if (!res || !res.body || typeof res.body.getReader !== 'function') return res;
    /* never touch non-text responses */
    try {
      var ct = res.headers && typeof res.headers.get === 'function'
        ? String(res.headers.get('content-type') || '').toLowerCase() : '';
      if (ct && ct.indexOf('text') === -1 && ct.indexOf('json') === -1 && ct.indexOf('event-stream') === -1) return res;
    } catch (_) {}
    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var encoder = new TextEncoder();
    var buf = '';
    var stream = new ReadableStream({
      start: function (controller) {
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) {
              var m, out = buf;
              buf = '';
              var cleaned = '';
              var rest = out;
              CREW_MARK_RE.lastIndex = 0;
              while ((m = CREW_MARK_RE.exec(rest))) {
                cleaned += rest.slice(0, m.index);
                var plan = parsePlan(m[1]);
                if (plan && onPlan) { try { onPlan(plan, userText); } catch (_) {} }
                rest = rest.slice(m.index + m[0].length);
                CREW_MARK_RE.lastIndex = 0;
              }
              cleaned += rest;
              if (cleaned) controller.enqueue(encoder.encode(cleaned));
              controller.close();
              if (typeof onDone === 'function') { try { onDone(); } catch (_) {} }
              return;
            }
            buf += decoder.decode(r.value, { stream: true });
            var out2 = '';
            var mm;
            var scan = buf.length > HOLDBACK ? buf.slice(0, buf.length - HOLDBACK) : '';
            var tail = buf.length > HOLDBACK ? buf.slice(buf.length - HOLDBACK) : buf;
            var rest2 = scan;
            CREW_MARK_RE.lastIndex = 0;
            while ((mm = CREW_MARK_RE.exec(rest2))) {
              out2 += rest2.slice(0, mm.index);
              var plan2 = parsePlan(mm[1]);
              if (plan2 && onPlan) { try { onPlan(plan2, userText); } catch (_) {} }
              rest2 = rest2.slice(mm.index + mm[0].length);
              CREW_MARK_RE.lastIndex = 0;
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

/* ---------- crew card ---------- */
function buildCard(plan) {
  var card = document.createElement('div');
  card.className = 'jd-crew-card';
  card.setAttribute('data-jd-crew-card', '1');
  var rows = plan.map(function (p) {
    return '<div class="jd-crew-card__row" data-jd-crew-row>' +
      '<span class="jd-crew-card__badge">' + esc(p.role) + '</span>' +
      '<span class="jd-crew-card__task">' + esc(p.task) + '</span></div>';
  }).join('');
  card.innerHTML =
    '<div class="jd-crew-card__head">' + SVG_USERS +
      '<div><div class="jd-crew-card__title">Crew plan</div>' +
      '<div class="jd-crew-card__sub">Pwedeng hatiin sa ' + plan.length + ' sub-agents — ikaw ang pipili.</div></div>' +
    '</div>' +
    '<div class="jd-crew-card__rows">' + rows + '</div>' +
    '<div class="jd-crew-card__credits">Hatiin &asymp; ' + plan.length + '&times;10 credits &middot; Isang bagsakan &asymp; 10 credits</div>' +
    '<div class="jd-crew-card__actions">' +
      '<button type="button" class="jd-crew-card__btn jd-crew-card__btn--split" data-jd-crew-split>Hatiin sa ' + plan.length + '</button>' +
      '<button type="button" class="jd-crew-card__btn jd-crew-card__btn--single" data-jd-crew-single>Isang bagsakan</button>' +
    '</div>';
  return card;
}

function sendThroughPipeline(text) {
  try {
    var input = document.getElementById('userInput');
    var sm = null;
    try { sm = window.sendMessage || null; } catch (_) {}
    if (!sm) { try { if (typeof sendMessage === 'function') sm = sendMessage; } catch (_) {} }
    if (!input || typeof sm !== 'function') { toast('Could not start chat'); return; }
    input.value = text;
    try { input.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try {
      var r = sm();
      if (r && typeof r.catch === 'function') r.catch(function () {});
    } catch (_) { toast('Could not send'); }
  } catch (_) { toast('Could not send'); }
}

function fetchWithTimeout(url, init, ms) {
  var ctrl = null;
  try { ctrl = new AbortController(); } catch (_) { return window.fetch(url, init); }
  var timer = setTimeout(function () { try { ctrl.abort(); } catch (_) {} }, ms);
  var p = window.fetch(url, Object.assign({}, init, { signal: ctrl.signal }));
  return p.then(function (r) { clearTimeout(timer); return r; },
    function (e) { clearTimeout(timer); throw e; });
}

function runSubAgent(p, userText) {
  var scoped = 'You are the ' + p.role + ' sub-agent. Complete ONLY this subtask: ' + p.task +
    ' Original request: ' + userText +
    ' Reply with ONLY the result — no preamble, no explanation of the process, no markers.';
  var body = {
    _jdCrewSub: true,
    message: p.task,
    history: [],
    files: [],
    mode: 'general',
    webSearch: false,
    personalization: { customInstructions: scoped }
  };
  try {
    if (typeof window.currentSelectedProvider !== 'undefined' && window.currentSelectedProvider) {
      body.provider = window.currentSelectedProvider;
    }
    if (typeof window.currentSelectedModel !== 'undefined' && window.currentSelectedModel) {
      body.model = window.currentSelectedModel;
    }
  } catch (_) {}
  return fetchWithTimeout('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }, FANOUT_TIMEOUT_MS).then(function (res) {
    if (!res || !res.ok) throw new Error('http-' + (res && res.status));
    return res.text();
  }).then(function (t) {
    t = String(t || '').trim();
    if (!t) throw new Error('empty');
    return t;
  });
}

function sendMerge(results, userText) {
  try {
    var parts = [
      'I-synthesize mo sa isang final answer ang mga resulta mula sa sub-agents sa ibaba. ' +
      'Huwag nang mag-emit ng [[JD_CREW]] marker — isang sagot lang, walang crew card.',
      '',
      'Original request: ' + userText,
      ''
    ];
    results.forEach(function (r) {
      if (r.ok && r.text) {
        parts.push('--- Result mula kay ' + r.role + ' ---');
        parts.push(r.text);
        parts.push('');
      } else {
        parts.push('(Si ' + r.role + ' ay nag-fail — i-note mo ito sa final answer kung relevant.)');
        parts.push('');
      }
    });
    sendThroughPipeline(parts.join('\n'));
    toast('Crew results merged — synthesizing…');
  } catch (_) {}
}

function runCrew(card, plan, userText) {
  try {
    var actions = card.querySelector('.jd-crew-card__actions');
    var status = document.createElement('div');
    status.className = 'jd-crew-card__status';
    status.setAttribute('data-jd-crew-status', '1');
    var rowEls = plan.map(function (p) {
      var row = document.createElement('div');
      row.className = 'jd-crew-card__srow';
      row.innerHTML = '<span class="jd-crew-card__dot"></span><span>' +
        esc(p.role) + ' — <span data-jd-crew-slabel>working…</span></span>';
      status.appendChild(row);
      return row;
    });
    if (actions) actions.replaceWith(status);
    function setStatus(i, cls, label) {
      try {
        var row = rowEls[i];
        if (!row) return;
        row.classList.add(cls);
        var lab = row.querySelector('[data-jd-crew-slabel]');
        if (lab) lab.textContent = label;
      } catch (_) {}
    }
    var calls = plan.map(function (p, i) {
      return runSubAgent(p, userText).then(
        function (text) { setStatus(i, 'is-done', 'done'); return { role: p.role, ok: true, text: text }; },
        function () { setStatus(i, 'is-fail', 'failed'); return { role: p.role, ok: false, text: '' }; }
      );
    });
    var all = (typeof Promise.allSettled === 'function')
      ? Promise.allSettled(calls)
      : Promise.all(calls.map(function (c) { return c.then(function (v) { return { status: 'fulfilled', value: v }; }, function (e) { return { status: 'rejected', reason: e }; }); }));
    all.then(function (settled) {
      var results = settled.map(function (s, i) {
        if (s && s.status === 'fulfilled' && s.value) return s.value;
        return { role: plan[i].role, ok: false, text: '' };
      });
      sendMerge(results, userText);
    });
  } catch (_) {
    toast('Crew run failed');
  }
}

function wireCard(card, plan, userText) {
  try {
    var splitBtn = card.querySelector('[data-jd-crew-split]');
    var singleBtn = card.querySelector('[data-jd-crew-single]');
    function lock() {
      try {
        if (splitBtn) splitBtn.disabled = true;
        if (singleBtn) singleBtn.disabled = true;
      } catch (_) {}
    }
    if (splitBtn) splitBtn.addEventListener('click', function () {
      lock();
      runCrew(card, plan, userText);
    });
    if (singleBtn) singleBtn.addEventListener('click', function () {
      lock();
      sendThroughPipeline(
        'Paki-gawa ng buo, isang bagsakan lang (walang sub-agents). ' +
        'Huwag mag-emit ng [[JD_CREW]] marker. Request: ' + userText
      );
    });
  } catch (_) {}
}

/* ---------- attach the card once the assistant message settles ---------- */
function attachWhenReady(ctx) {
  try {
    var plan = ctx.plan, userText = ctx.userText;
    if (!plan || !plan.length) return;
    ensureCss();
    function targetMsg() {
      try {
        if (ctx.msg && ctx.msg.isConnected) return ctx.msg;
      } catch (_) {}
      try {
        var bots = document.querySelectorAll('#chatBox .msg.bot');
        return bots && bots.length ? bots[bots.length - 1] : null;
      } catch (_) { return null; }
    }
    var tries = 0, lastLen = -1, stable = 0;
    var timer = setInterval(function () {
      try {
        tries++;
        var msg = targetMsg();
        if (!msg || msg.querySelector('[data-jd-crew-card]')) {
          if (!msg && tries < 25) return;
          clearInterval(timer);
          return;
        }
        if (msg.querySelector('.cursor,.typing,.streaming-cursor,.jd-stream-cursor')) { stable = 0; lastLen = -1; return; }
        var len = (msg.textContent || '').length;
        if (len === lastLen && len > 0) { stable++; } else { stable = 0; }
        lastLen = len;
        if (stable >= 2 || tries >= 25) {
          clearInterval(timer);
          if (msg.querySelector('[data-jd-crew-card]')) return;
          scrubLeftovers(msg);
          var card = buildCard(plan);
          try { msg.appendChild(card); } catch (_) { return; }
          wireCard(card, plan, userText);
          try {
            if (typeof msg.scrollIntoView === 'function') {
              card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          } catch (_) {}
        }
      } catch (_) { try { clearInterval(timer); } catch (_) {} }
    }, 200);
  } catch (_) {}
}

/* ---------- fetch wrap ---------- */
function install() {
  if (typeof window.fetch !== 'function') return;
  if (window.fetch.__jdCrew) return;
  /* NOTE: kept unbound (not .bind(window)) so sibling __jd* marker
     properties survive on the function object for the chain below. */
  var origFetch = window.fetch;
  var wrapped = function (input, init) {
    var isChat = false;
    var shouldTap = false;
    var userText = '';
    try {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      isChat = url.indexOf('/api/chat') !== -1 && method === 'POST';
      if (isChat && init && typeof init.body === 'string') {
        var body = null;
        try { body = JSON.parse(init.body); } catch (_) { body = null; }
        if (body && typeof body === 'object' && !body.action && !body._jdCrewSub) {
          shouldTap = true;
          userText = captureUserText(body);
          var pers = (body.personalization && typeof body.personalization === 'object') ? body.personalization : {};
          var cur = typeof pers.customInstructions === 'string' ? pers.customInstructions : '';
          if (cur.indexOf(MARK) === -1) {
            pers.customInstructions = (cur ? cur + '\n\n' : '') + crewBlock();
            body.personalization = pers;
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      }
    } catch (_) { /* fail-open */ }
    var p = origFetch.call(window, input, init);
    if (shouldTap && p && typeof p.then === 'function') {
      return p.then(function (res) {
        return tapResponse(res, userText,
          function (plan) {
            if (pendingPlan !== null) return; /* first marker wins */
            var msg = null;
            try {
              var bots = document.querySelectorAll('#chatBox .msg.bot');
              msg = bots && bots.length ? bots[bots.length - 1] : null;
            } catch (_) {}
            pendingPlan = { plan: plan, userText: userText, msg: msg };
          },
          function () {
            if (pendingPlan !== null) {
              var q = pendingPlan;
              pendingPlan = null;
              setTimeout(function () { attachWhenReady(q); }, 150);
            }
          });
      });
    }
    return p;
  };
  wrapped.__jdCrew = true;
  /* Preserve sibling wrapper markers so chained patches keep working. */
  try {
    Object.keys(origFetch).forEach(function (k) {
      if (k.indexOf('__jd') === 0) wrapped[k] = true;
    });
  } catch (_) {}
  window.fetch = wrapped;
}

function installAll() {
  install();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAll, { once: true });
} else {
  installAll();
}
setTimeout(installAll, 1500);
})();
