/* =========================================================
   JepongDevxyz AI — Browser Agent decision engine (Jev-style)
   Runtime patch loaded by agent.js (additive only).

   The "brain" of a Jev-like ultrafast browser agent, built for the
   app's CURRENT models (no new API needed):

     1. buildDecisionPrompt(goal, table, history) — element table +
        action history + strict JSON-only instructions.
     2. parseDecision(raw, table) — extracts JSON (even fenced),
        validates operation + target against the table.
     3. AgentLoop — step machine with plug-in points for the
        browser backend (snapshot/act), which is a later phase.

   Action space (Jev-style, dynamic + indexed):
     CLICK, TYPE_TEXT, SELECT, SCROLL_UP, SCROLL_DOWN, WAIT,
     DONE, BLOCKED. Only compatible targets are accepted.

   Element table format (one per line):
     [1] button "Search" | clickable
     [2] textbox "Where from?" | value=""

   Toggle: EXTRA > JepongDevxyz AI > Agent Browse.
   localStorage "jd_browse_agent" ("1" = on). Default OFF.
   Backend plug-in: window.jdBrowserBackend = { snapshot(), act(a) }.
   Until a backend is attached, the engine runs in validated
   dry-run (decisions are computed + validated, nothing executes).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdBrowseAgentLoaded) return;
  window.__jdBrowseAgentLoaded = true;

  var KEY = 'jd_browse_agent';
  function enabled() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
  }
  window.jdBrowseAgentEnabled = enabled;
  window.jdSetBrowseAgent = function (on) {
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (_) {}
  };

  var OPS = ['CLICK', 'TYPE_TEXT', 'SELECT', 'SCROLL_UP', 'SCROLL_DOWN', 'WAIT', 'DONE', 'BLOCKED'];
  /* Which element roles accept which operations. */
  var ROLE_OPS = {
    button: ['CLICK'], link: ['CLICK'],
    textbox: ['CLICK', 'TYPE_TEXT'], searchbox: ['CLICK', 'TYPE_TEXT'],
    combobox: ['CLICK', 'TYPE_TEXT', 'SELECT'],
    select: ['CLICK', 'SELECT'], listbox: ['CLICK', 'SELECT'],
    checkbox: ['CLICK'], radio: ['CLICK'], switch: ['CLICK'],
    menuitem: ['CLICK'], tab: ['CLICK']
  };
  var NO_TARGET_OPS = ['SCROLL_UP', 'SCROLL_DOWN', 'WAIT', 'DONE', 'BLOCKED'];

  function buildDecisionPrompt(goal, table, history, step, maxSteps) {
    var hist = (history || []).map(function (h, i) {
      return (i + 1) + '. ' + h.operation + (h.target != null ? ' [' + h.target + ']' : '') +
        (h.text ? ' "' + String(h.text).slice(0, 80) + '"' : '') + ' -> ' + (h.result || 'ok');
    }).join('\n');
    return '[BROWSER-AGENT] You are the decision module of a browser agent.\n' +
      'Goal: ' + String(goal || '').slice(0, 500) + '\n' +
      'Step ' + (step || 1) + ' of ' + (maxSteps || 25) + '.\n\n' +
      'ELEMENT TABLE (use ONLY these indexed targets):\n' + String(table || '(empty)') + '\n\n' +
      'ACTION HISTORY:\n' + (hist || '(none yet)') + '\n\n' +
      'OPERATIONS: CLICK, TYPE_TEXT, SELECT, SCROLL_UP, SCROLL_DOWN, WAIT, DONE, BLOCKED.\n' +
      'Rules:\n' +
      '- Reply with EXACTLY ONE JSON object, no other text: {"operation":"CLICK","target":3} or {"operation":"TYPE_TEXT","target":2,"text":"Manila"}\n' +
      '- target must be an index from the table above; omit target for SCROLL_UP/SCROLL_DOWN/WAIT/DONE/BLOCKED.\n' +
      '- TYPE_TEXT only on textbox/searchbox/combobox; SELECT only on select/combobox/listbox; CLICK on buttons/links/checkboxes.\n' +
      '- Keep TYPE_TEXT under 200 chars; type exactly what the field needs, nothing more.\n' +
      '- Choose DONE only when the goal is visibly achieved; BLOCKED when impossible (login wall, captcha, paywall).\n' +
      '- Never repeat a failed action; try a different target or operation.\n' +
      'JSON:';
  }

  function parseTable(table) {
    /* index -> {role, label} */
    var map = Object.create(null);
    String(table || '').split('\n').forEach(function (line) {
      var m = line.match(/^\s*\[(\d+)\]\s+(\w+)\s+"?([^"|]*)"?/);
      if (m) map[m[1]] = { role: m[2].toLowerCase(), label: m[3] };
    });
    return map;
  }

  function extractJson(raw) {
    var s = String(raw || '').trim();
    var m = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (m) s = m[1].trim();
    var start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try { return JSON.parse(s.slice(start, end + 1)); } catch (_) { return null; }
  }

  function parseDecision(raw, table) {
    var fail = function (error) { return { ok: false, error: error }; };
    var obj = extractJson(raw);
    if (!obj || typeof obj !== 'object') return fail('no-json');
    var op = String(obj.operation || '').toUpperCase().trim();
    if (OPS.indexOf(op) === -1) return fail('bad-operation');
    var tmap = parseTable(table);
    var target = obj.target;
    if (NO_TARGET_OPS.indexOf(op) !== -1) {
      return { ok: true, action: { operation: op, target: null, text: null } };
    }
    if (target == null || target === '') return fail('missing-target');
    var tkey = String(target).trim();
    if (!/^\d+$/.test(tkey) || !tmap[tkey]) return fail('unknown-target');
    var allowed = ROLE_OPS[tmap[tkey].role];
    if (!allowed || allowed.indexOf(op) === -1) return fail('incompatible-target');
    var text = null;
    if (op === 'TYPE_TEXT') {
      text = String(obj.text == null ? '' : obj.text);
      if (!text.trim()) return fail('missing-text');
      text = text.slice(0, 200);
    }
    if (op === 'SELECT') {
      text = String(obj.text == null ? '' : obj.text).slice(0, 200);
      if (!text.trim()) return fail('missing-text');
    }
    return { ok: true, action: { operation: op, target: parseInt(tkey, 10), text: text } };
  }

  /* ---- Loop controller (backend-agnostic) ---- */
  function AgentLoop(goal, decide) {
    this.goal = String(goal || '');
    this.decide = decide; /* function(prompt) -> Promise<string> (raw model text) */
    this.history = [];
    this.step = 0;
    this.maxSteps = 25;
    this.done = false;
    this.result = null;
  }
  AgentLoop.prototype.nextPrompt = function (table) {
    return buildDecisionPrompt(this.goal, table, this.history, this.step + 1, this.maxSteps);
  };
  AgentLoop.prototype.applyDecision = function (raw, table) {
    var parsed = parseDecision(raw, table);
    if (!parsed.ok) return parsed;
    this.step++;
    this.history.push({
      operation: parsed.action.operation,
      target: parsed.action.target,
      text: parsed.action.text,
      result: 'decided'
    });
    if (parsed.action.operation === 'DONE' || parsed.action.operation === 'BLOCKED') {
      this.done = true;
      this.result = parsed.action.operation;
    } else if (this.step >= this.maxSteps) {
      this.done = true;
      this.result = 'MAX_STEPS';
    }
    return parsed;
  };
  /* Dry-run: validate N canned model outputs against a table. */
  AgentLoop.prototype.dryRun = function (table, raws) {
    var out = [];
    for (var i = 0; i < raws.length && !this.done; i++) {
      out.push(this.applyDecision(raws[i], table));
    }
    return out;
  };

  /* Backend plug-in point (later phase: cloud browser or extension relay). */
  window.jdBrowserBackend = window.jdBrowserBackend || null;

  window.jdBrowseAgent = {
    OPS: OPS,
    enabled: enabled,
    buildDecisionPrompt: buildDecisionPrompt,
    parseDecision: parseDecision,
    parseTable: parseTable,
    AgentLoop: AgentLoop
  };
})();
