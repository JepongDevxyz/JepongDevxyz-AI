/* ============================================================
   browse-improvements.js — Agent Browse improvements (Jev-like)
   Version: v20261007a142

   4 improvements (all additive, no changes to existing files):
   1. LIVE STEP FEED — each browse step renders a compact card in chat:
      "Step 3: Clicked 'Search' ✓" with timestamp. Makes it feel alive.
   2. GOAL CLARIFICATION — if the goal is vague (< 4 words or no verb),
      ask 1-2 quick clarifying questions before starting the loop.
   3. SMART RETRY — if a CLICK/TYPE fails, auto-retry with SCROLL into
      view first, then the original action. Max 2 retries per step.
   4. SESSION SUMMARY — on DONE/BLOCKED, render a summary card:
      goal, steps taken, result, duration, final screenshot if available.

   Hooks into window.jdBrowseLoop events (browse-loop.js onEvent).
   Toggle: same as Agent Browse (EXTRA → JepongDevxyz AI).
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdBrowseImprovementsLoaded) return;
  window.__jdBrowseImprovementsLoaded = true;

  /* ============ 1. LIVE STEP FEED ============ */
  var stepFeedEl = null;

  function ensureFeedCSS() {
    if (document.getElementById('jdBrowseFeedCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdBrowseFeedCSS';
    st.textContent =
      '.jd-browse-feed{margin:8px 0;border:1px solid rgba(124,92,255,.25);border-radius:12px;' +
      'background:rgba(124,92,255,.05);overflow:hidden}' +
      '.jd-browse-feed-head{padding:8px 12px;font-size:12px;font-weight:700;' +
      'background:rgba(124,92,255,.1);display:flex;justify-content:space-between;align-items:center}' +
      '.jd-browse-feed-steps{max-height:220px;overflow-y:auto;padding:4px 0}' +
      '.jd-browse-step{padding:6px 12px;font-size:13px;display:flex;gap:8px;align-items:baseline;' +
      'border-bottom:1px solid rgba(255,255,255,.05)}' +
      '.jd-browse-step:last-child{border-bottom:none}' +
      '.jd-browse-step-num{font-weight:700;color:#7c5cff;min-width:52px;font-size:11px}' +
      '.jd-browse-step-desc{flex:1}' +
      '.jd-browse-step-time{font-size:10px;opacity:.45}' +
      '.jd-browse-step.ok .jd-browse-step-desc::after{content:" ✓";color:#22c55e}' +
      '.jd-browse-step.fail .jd-browse-step-desc::after{content:" ✗";color:#ef4444}' +
      '.jd-browse-step.retry .jd-browse-step-desc::after{content:" ↻";color:#f5a623}' +
      '.jd-browse-summary{margin:8px 0;border:2px solid rgba(34,197,94,.35);border-radius:12px;' +
      'padding:12px;background:rgba(34,197,94,.06)}' +
      '.jd-browse-summary.blocked{border-color:rgba(239,68,68,.35);background:rgba(239,68,68,.06)}' +
      '.jd-browse-summary h4{margin:0 0 6px;font-size:14px}' +
      '.jd-browse-summary p{margin:4px 0;font-size:13px;opacity:.85}' +
      '.jd-browse-summary .jd-bs-meta{font-size:11px;opacity:.55;margin-top:8px}' +
      '.jd-browse-clarify{margin:8px 0;border:1px solid rgba(245,166,35,.35);border-radius:12px;' +
      'padding:12px;background:rgba(245,166,35,.06)}' +
      '.jd-browse-clarify h4{margin:0 0 6px;font-size:14px}' +
      '.jd-browse-clarify p{margin:4px 0;font-size:13px}';
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function findChat() {
    return document.querySelector('[class*="messages"], [class*="chat-list"], main') || document.body;
  }

  function startFeed(goal) {
    try {
      ensureFeedCSS();
      stopFeed();
      stepFeedEl = document.createElement('div');
      stepFeedEl.className = 'jd-browse-feed';
      stepFeedEl.innerHTML =
        '<div class="jd-browse-feed-head"><span>🤖 Browsing: ' + esc(String(goal).slice(0, 60)) + '</span>' +
        '<span class="jd-bf-status">running…</span></div>' +
        '<div class="jd-browse-feed-steps"></div>';
      findChat().appendChild(stepFeedEl);
      stepFeedEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (_) {}
  }

  function addStep(num, desc, status) {
    try {
      if (!stepFeedEl) return;
      var steps = stepFeedEl.querySelector('.jd-browse-feed-steps');
      if (!steps) return;
      var d = document.createElement('div');
      d.className = 'jd-browse-step ' + (status || '');
      var now = new Date();
      var t = ('0' + now.getHours()).slice(-2) + ':' + ('0' + now.getMinutes()).slice(-2) + ':' + ('0' + now.getSeconds()).slice(-2);
      d.innerHTML = '<span class="jd-browse-step-num">Step ' + num + '</span>' +
        '<span class="jd-browse-step-desc">' + esc(desc) + '</span>' +
        '<span class="jd-browse-step-time">' + t + '</span>';
      steps.appendChild(d);
      steps.scrollTop = steps.scrollHeight;
    } catch (_) {}
  }

  function stopFeed(finalStatus) {
    try {
      if (stepFeedEl) {
        var st = stepFeedEl.querySelector('.jd-bf-status');
        if (st && finalStatus) st.textContent = finalStatus;
      }
    } catch (_) {}
  }

  function describeAction(op, target, text, label) {
    var t = target != null ? ' [' + target + ']' : '';
    var lbl = label ? ' "' + String(label).slice(0, 40) + '"' : '';
    switch (op) {
      case 'CLICK': return 'Clicked' + lbl + t;
      case 'TYPE_TEXT': return 'Typed "' + String(text || '').slice(0, 40) + '"' + lbl + t;
      case 'SELECT': return 'Selected "' + String(text || '').slice(0, 30) + '"' + t;
      case 'SCROLL_UP': return 'Scrolled up';
      case 'SCROLL_DOWN': return 'Scrolled down';
      case 'WAIT': return 'Waited';
      case 'ATTACH_FILE': return 'Attached file "' + String(text || '').slice(0, 30) + '"';
      case 'READ_FILE': return 'Read file "' + String(text || '').slice(0, 30) + '"';
      default: return op + t;
    }
  }

  /* ============ 4. SESSION SUMMARY ============ */
  function showSummary(goal, steps, outcome, durationMs, screenshotUrl) {
    try {
      ensureFeedCSS();
      stopFeed(outcome === 'DONE' ? 'done ✓' : 'stopped');
      var el = document.createElement('div');
      el.className = 'jd-browse-summary' + (outcome === 'BLOCKED' ? ' blocked' : '');
      var secs = Math.round((durationMs || 0) / 1000);
      el.innerHTML =
        '<h4>' + (outcome === 'DONE' ? '✅ Browse complete' : outcome === 'BLOCKED' ? '🛑 Browse blocked' : '🏁 Browse finished') + '</h4>' +
        '<p><strong>Goal:</strong> ' + esc(goal) + '</p>' +
        '<p><strong>Steps:</strong> ' + steps + ' actions in ' + secs + 's</p>' +
        (screenshotUrl ? '<p><img src="' + esc(screenshotUrl) + '" style="max-width:100%;border-radius:8px;margin-top:6px" alt="Final state"></p>' : '') +
        '<div class="jd-bs-meta">Powered by Agent Browse 🤖</div>';
      findChat().appendChild(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      stepFeedEl = null;
    } catch (_) {}
  }

  /* ============ 2. GOAL CLARIFICATION ============ */
  function needsClarification(goal) {
    if (!goal) return true;
    var words = String(goal).trim().split(/\s+/);
    if (words.length < 4) return true;
    // No verb-like word? Very rough heuristic for Tagalog/English
    var verbs = /^(hanapin|hanap|buksan|open|find|search|go to|pumunta|click|i-click|type|ilagay|kunin|get|check|tingnan|compare|ikukumpara)/i;
    if (!verbs.test(String(goal).trim())) return true;
    return false;
  }

  function clarifyGoal(goal) {
    return new Promise(function (resolve) {
      try {
        ensureFeedCSS();
        var el = document.createElement('div');
        el.className = 'jd-browse-clarify';
        el.innerHTML =
          '<h4>🤔 Quick check before browsing</h4>' +
          '<p>Your goal: "<strong>' + esc(goal) + '</strong>" is a bit vague.</p>' +
          '<p>What exactly should I do? (e.g. which site, what to find/click)</p>' +
          '<div style="display:flex;gap:8px;margin-top:8px">' +
          '<input type="text" class="jd-clarify-input" placeholder="Clarify your goal…" style="flex:1;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.25);color:inherit">' +
          '<button class="jd-clarify-go" style="padding:8px 16px;border-radius:8px;border:none;background:#7c5cff;color:#fff;font-weight:600;cursor:pointer">Go</button>' +
          '<button class="jd-clarify-skip" style="padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;cursor:pointer">Skip</button>' +
          '</div>';
        var input = el.querySelector('.jd-clarify-input');
        function done(val) {
          if (el.parentNode) el.parentNode.removeChild(el);
          resolve(val || goal);
        }
        el.querySelector('.jd-clarify-go').addEventListener('click', function () { done(input.value.trim()); });
        el.querySelector('.jd-clarify-skip').addEventListener('click', function () { done(goal); });
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') done(input.value.trim()); });
        findChat().appendChild(el);
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        input.focus();
      } catch (_) { resolve(goal); }
    });
  }

  window.jdBrowseClarifyGoal = function (goal) {
    if (!needsClarification(goal)) return Promise.resolve(goal);
    return clarifyGoal(goal);
  };

  /* ============ 3. SMART RETRY ============
     Wrap backend.act: on failure of CLICK/TYPE, scroll then retry. */
  window.jdBrowseWrapSmartRetry = function (backend) {
    if (!backend || backend.__smartRetryWrapped) return backend;
    backend.__smartRetryWrapped = true;
    var origAct = backend.act.bind(backend);
    backend.act = function (action) {
      var self = this;
      return origAct(action).then(function (res) {
        if (res && res.ok === false && (action.operation === 'CLICK' || action.operation === 'TYPE_TEXT')) {
          // Smart retry: scroll down a bit, then retry the action
          addStep('↻', 'Retrying ' + describeAction(action.operation, action.target, action.text) + ' after scroll', 'retry');
          return origAct({ operation: 'SCROLL_DOWN' }).then(function () {
            return origAct(action);
          });
        }
        return res;
      });
    };
    return backend;
  };

  /* ============ HOOK INTO BROWSE LOOP EVENTS ============
     The loop calls onEvent({type, ...}). We attach our UI. */
  var origBrowseStart = null;
  var sessionStart = 0;
  var stepCount = 0;

  // Wrap the global browse starter if it exists
  (function hookBrowseStarter() {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (tries > 120) { clearInterval(iv); return; }
      // Hook 1: wrap backend factory for smart retry
      if (window.jdSteelBackend && !window.jdSteelBackend.__improvementsHooked) {
        window.jdSteelBackend.__improvementsHooked = true;
        var OrigBackend = window.jdSteelBackend;
        window.jdSteelBackend = function () {
          var b = new OrigBackend();
          return window.jdBrowseWrapSmartRetry(b);
        };
        // Preserve prototype
        window.jdSteelBackend.prototype = OrigBackend.prototype;
      }
      // Hook 2: listen for browse loop events via a global event bus
      if (window.jdBrowseLoopEvents && !window.__jdBrowseEventsHooked) {
        window.__jdBrowseEventsHooked = true;
        var origEmit = window.jdBrowseLoopEvents.emit;
        if (typeof origEmit === 'function') {
          window.jdBrowseLoopEvents.emit = function (evt) {
            handleBrowseEvent(evt);
            return origEmit.apply(this, arguments);
          };
        }
        clearInterval(iv);
      }
      // Hook 3: fallback — poll for active loop via window.__jdBrowseActive
      if (window.__jdBrowseActive && !window.__jdBrowsePollHooked) {
        window.__jdBrowsePollHooked = true;
        // The loop itself will call our handlers if it checks for them
      }
    }, 500);
  })();

  function handleBrowseEvent(evt) {
    if (!evt) return;
    switch (evt.type) {
      case 'start':
        sessionStart = Date.now();
        stepCount = 0;
        startFeed(evt.goal);
        break;
      case 'step':
        stepCount++;
        addStep(stepCount, describeAction(evt.operation, evt.target, evt.text, evt.label), evt.ok === false ? 'fail' : 'ok');
        break;
      case 'done':
        showSummary(evt.goal, stepCount, 'DONE', Date.now() - sessionStart, evt.screenshot);
        break;
      case 'blocked':
        showSummary(evt.goal, stepCount, 'BLOCKED', Date.now() - sessionStart, evt.screenshot);
        break;
      case 'error':
        addStep(stepCount + 1, 'Error: ' + (evt.message || 'unknown'), 'fail');
        break;
    }
  }

  // Expose for the loop to call directly (if event bus not available)
  window.jdBrowseUI = {
    start: function (goal) { sessionStart = Date.now(); stepCount = 0; startFeed(goal); },
    step: function (op, target, text, label, ok) {
      stepCount++;
      addStep(stepCount, describeAction(op, target, text, label), ok === false ? 'fail' : 'ok');
    },
    done: function (goal, screenshot) { showSummary(goal, stepCount, 'DONE', Date.now() - sessionStart, screenshot); },
    blocked: function (goal, screenshot) { showSummary(goal, stepCount, 'BLOCKED', Date.now() - sessionStart, screenshot); }
  };

  console.log('[browse-improvements] loaded v20261007a142');
})();
