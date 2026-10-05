/* =========================================================
   JepongDevxyz AI — Browse loop driver (chat-driven agent loop)
   Runtime patch loaded by agent.js (additive only). Load LAST so its
   fetch wrapper is outermost.

   Chat command:  browse: <goal>
   Example:       browse: hanapin mo presyo ng Honor 400

   Flow (all client-side, one HTTP call per step — no 25s limit issue):
     snapshot -> decide (/api/chat) -> validate (browser-agent.js)
     -> act (backend) -> repeat, until DONE / BLOCKED / MAX_STEPS / Stop.

   Backends implement window.jdBrowserBackend:
     connect(), navigate(url), snapshot()->{table,coords},
     act(action)->{ok,note}, release(), isConfigured()
   SteelBackend (steel-backend.js) is the real one; MockBackend below
   is for zero-cost tests.

   Gating: the "browse:" command only fires when the Agent Browse
   toggle (EXTRA > JepongDevxyz AI) is ON. The Steel API keys live in
   the Vercel env var STEEL_API_KEYS (shared pool, server rotation) —
   they never reach the phone; all calls go through POST /api/steel.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdBrowseLoopLoaded) return;
  window.__jdBrowseLoopLoaded = true;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---------------- MockBackend (tests, zero cost) ---------------- */
  function MockBackend(script) {
    this.script = script || [{ table: '(empty)', coords: {} }];
    this.i = 0;
    this.acted = [];
    this.released = false;
    this.url = null;
  }
  MockBackend.prototype.isConfigured = function () { return true; };
  MockBackend.prototype.connect = function () { return Promise.resolve(); };
  MockBackend.prototype.navigate = function (url) { this.url = url; return Promise.resolve(); };
  MockBackend.prototype.snapshot = function () {
    var s = this.script[Math.min(this.i, this.script.length - 1)];
    return Promise.resolve({ table: s.table, coords: s.coords || {} });
  };
  MockBackend.prototype.act = function (a) {
    this.acted.push(a.operation + (a.target != null ? '[' + a.target + ']' : ''));
    if (this.i < this.script.length - 1) this.i++;
    return Promise.resolve({ ok: true, note: 'mock-ok' });
  };
  MockBackend.prototype.release = function () { this.released = true; return Promise.resolve(); };
  window.jdMockBackend = MockBackend;

  /* ---------------- BrowseLoop ---------------- */
  function BrowseLoop(goal, backend, opts) {
    this.goal = String(goal || '');
    this.backend = backend;
    opts = opts || {};
    this.onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : function () {};
    this.onBeforeRelease = typeof opts.onBeforeRelease === 'function' ? opts.onBeforeRelease : null;
    this.maxSteps = opts.maxSteps || 25;
    this.stopped = false;
    this.paused = false;
    this.operatorNote = null;
    this._resumeResolve = null;
    this.sessionFiles = [];
  }
  BrowseLoop.prototype.stop = function () {
    this.stopped = true;
    if (this._resumeResolve) {
      var r = this._resumeResolve;
      this._resumeResolve = null;
      try { r(); } catch (_) {}
    }
  };
  BrowseLoop.prototype.resume = function () {
    if (this._resumeResolve) {
      this.paused = false;
      var r = this._resumeResolve;
      this._resumeResolve = null;
      try { r(); } catch (_) {}
    }
  };
  BrowseLoop.prototype.note = function (text) {
    this.operatorNote = String(text || '').slice(0, 300);
  };

  BrowseLoop.prototype.decide = function (prompt) {
    return fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: prompt, personalization: {}, _jdBrowse: true })
    }).then(function (res) { return res.text(); });
  };

  function extractStartUrl(goal) {
    var m = /(https?:\/\/[^\s,]+|www\.[^\s,]+)/i.exec(goal || '');
    if (!m) return null;
    var u = m[1].replace(/[.,;!?)]+$/, '');
    if (/^www\./i.test(u)) u = 'https://' + u;
    return u;
  }
  BrowseLoop.extractStartUrl = extractStartUrl;

  function isInfraFlake(raw) {
    return raw.indexOf('FUNCTION_INVOCATION_TIMEOUT') !== -1 ||
      raw.indexOf('high demand') !== -1 ||
      raw.indexOf('"code": 503') !== -1 ||
      raw.indexOf('An error occurred with your deployment') !== -1;
  }

  BrowseLoop.prototype.run = function () {
    var self = this;
    var BA = window.jdBrowseAgent;
    if (!BA) return Promise.reject(new Error('no-decision-engine'));
    var history = [];
    var step = 0;
    var coords = {};
    var startUrl = extractStartUrl(this.goal) || 'https://www.google.com';

    self.onEvent({ type: 'start', url: startUrl });

    function decideWithRetry(prompt, table, attempt) {
      return self.decide(prompt).then(function (raw) {
        if (isInfraFlake(raw)) {
          if (attempt < 3) {
            history.push({ operation: '?', target: null, text: null, result: 'backend hiccup, retrying…' });
            self.onEvent({ type: 'retry', step: step, why: 'hiccup' });
            return sleep(10000).then(function () { return decideWithRetry(prompt, table, attempt + 1); });
          }
          return null;
        }
        var parsed = BA.parseDecision(raw, table);
        if (parsed.ok) return parsed;
        if (attempt < 3) {
          history.push({ operation: '?', target: null, text: null, result: 'invalid (' + parsed.error + '), retrying…' });
          self.onEvent({ type: 'retry', step: step, why: parsed.error });
          return decideWithRetry(prompt, table, attempt + 1);
        }
        return null;
      }, function () {
        if (attempt < 3) {
          return sleep(10000).then(function () { return decideWithRetry(prompt, table, attempt + 1); });
        }
        return null;
      });
    }

    function refreshSessionFiles() {
      if (!self.backend || typeof self.backend.listFiles !== 'function') return Promise.resolve();
      return self.backend.listFiles().then(function (files) {
        self.sessionFiles = (files || []).map(function (f) { return f.path || ''; }).filter(Boolean);
      }).catch(function () {});
    }

    function loopStep() {
      if (self.stopped) return Promise.resolve({ status: 'STOPPED', history: history });
      if (self.paused) {
        return new Promise(function (resolve) {
          self._resumeResolve = function () { resolve(loopStep()); };
        });
      }
      if (step >= self.maxSteps) return Promise.resolve({ status: 'MAX_STEPS', history: history });
      step++;
      return self.backend.snapshot().then(function (snap) {
        coords = (snap && snap.coords) || {};
        var table = (snap && snap.table) || '(empty)';
        var effGoal = self.goal;
        if (self.operatorNote) {
          effGoal += '\n\nOPERATOR NOTE (highest priority — follow it on this step): ' + self.operatorNote;
          history.push({ operation: '💬', target: null, text: self.operatorNote, result: 'noted' });
          self.operatorNote = null;
        }
        if (self.sessionFiles.length) {
          effGoal += '\n\nSESSION FILES (use READ_FILE with one of these names when the goal needs file contents): ' +
            self.sessionFiles.join(', ');
        }
        var prompt = BA.buildDecisionPrompt(effGoal, table, history, step, self.maxSteps);
        return decideWithRetry(prompt, table, 0);
      }).then(function (decided) {
        if (!decided) return { status: 'GAVE_UP', history: history };
        var action = decided.action;
        history.push({ operation: action.operation, target: action.target, text: action.text, result: 'decided' });
        self.onEvent({ type: 'step', step: step, action: action });
        if (action.operation === 'DONE') return { status: 'DONE', history: history };
        if (action.operation === 'BLOCKED') {
          /* pause — user may resolve it via Watch live, then Resume (or Stop) */
          self.paused = true;
          self.onEvent({ type: 'blocked' });
          return new Promise(function (resolve) {
            self._resumeResolve = function () { resolve(loopStep()); };
          });
        }
        var xy = coords[action.target];
        if (!xy && action.operation === 'READ_FILE') xy = [0, 0]; /* no target needed */
        if (!xy) {
          history[history.length - 1].result = 'no-coordinates, re-scanning…';
          return loopStep();
        }
        action.xy = xy;
        return self.backend.act(action).then(function (res) {
          history[history.length - 1].result = res.ok ? 'ok' : ('failed: ' + res.note);
          if (res.ok && res.note && action.operation === 'READ_FILE') {
            /* file contents land in history so the model can use them next step */
            history[history.length - 1].result = String(res.note).slice(0, 4200);
          }
          self.onEvent({ type: 'acted', step: step, action: action, ok: res.ok, note: res.note });
          return refreshSessionFiles().then(loopStep);
        });
      });
    }

    function finishRun(result) {
      var pre = self.onBeforeRelease
        ? self.onBeforeRelease(self.backend).catch(function () {})
        : Promise.resolve();
      return pre.then(function () {
        return self.backend.release().catch(function () {}).then(function () { return result; });
      });
    }

    return self.backend.connect()
      .then(function () {
        self.onEvent({ type: 'connected' });
        return refreshSessionFiles();
      })
      .then(function () {
        return self.backend.navigate(startUrl);
      })
      .then(loopStep)
      .then(finishRun, function (err) {
        return finishRun({ status: 'ERROR', history: history }).then(function () { throw err; });
      });
  };
  window.jdBrowseLoop = BrowseLoop;

  /* Track live backends so a page unload can still release them (no credit leak). */
  var liveBackends = [];
  function trackBackend(b) {
    try {
      if (liveBackends.indexOf(b) === -1) liveBackends.push(b);
    } catch (_) {}
  }
  function untrackBackend(b) {
    try {
      var i = liveBackends.indexOf(b);
      if (i !== -1) liveBackends.splice(i, 1);
    } catch (_) {}
  }
  function installUnloadGuard() {
    if (window.__jdBrowseUnloadGuard) return;
    window.__jdBrowseUnloadGuard = true;
    var fire = function () {
      try { window.__jdBrowseUnloading = true; } catch (_) {}
      liveBackends.slice().forEach(function (b) {
        try { b.release(); } catch (_) {}
      });
    };
    try {
      window.addEventListener('pagehide', fire);
      window.addEventListener('beforeunload', fire);
    } catch (_) {}
  }

  /* ---------------- agent card UI ---------------- */
  function ensureCss() {
    if (document.getElementById('jdBrowseCss')) return;
    var st = document.createElement('style');
    st.id = 'jdBrowseCss';
    st.textContent =
      '.jd-browse-card{margin:10px 12px;padding:12px 14px;border-radius:14px;' +
      'background:rgba(255,255,255,.04);border:1px solid rgba(251,191,36,.35);' +
      'font-size:13px;line-height:1.45}' +
      '.jd-browse-head{display:flex;align-items:center;gap:8px;font-weight:700;margin-bottom:4px}' +
      '.jd-browse-dot{width:8px;height:8px;border-radius:50%;background:#fbbf24;' +
      'animation:jdBlink 1s infinite alternate}' +
      '@keyframes jdBlink{from{opacity:1}to{opacity:.25}}' +
      '.jd-browse-goal{opacity:.75;margin-bottom:8px;word-break:break-word}' +
      '.jd-browse-steps{max-height:180px;overflow-y:auto;margin:6px 0;' +
      'font-family:monospace;font-size:11.5px;opacity:.9}' +
      '.jd-browse-step{padding:2px 0;border-bottom:1px dashed rgba(255,255,255,.08)}' +
      '.jd-browse-foot{display:flex;align-items:center;justify-content:space-between;margin-top:8px;gap:6px;flex-wrap:wrap}' +
      '.jd-browse-stop{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.5);' +
      'color:#fca5a5;border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer}' +
      '.jd-browse-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);' +
      'color:inherit;border-radius:8px;padding:5px 12px;font-size:12px;cursor:pointer}' +
      '.jd-browse-status{font-size:12px;opacity:.7}' +
      '.jd-browse-shot{margin-top:8px;border-radius:10px;overflow:hidden;display:none}' +
      '.jd-browse-shot img{width:100%;display:block}' +
      '.jd-browse-title{font-size:15px;font-weight:700}' +
      '.jd-browse-sub{font-size:12px;opacity:.6;margin-top:1px}' +
      '.jd-browse-files{margin-top:8px;display:none;border:1px solid rgba(255,255,255,.12);' +
      'border-radius:10px;overflow:hidden}' +
      '.jd-browse-file{display:flex;align-items:center;justify-content:space-between;' +
      'padding:7px 10px;font-size:12px;border-top:1px solid rgba(255,255,255,.06)}' +
      '.jd-browse-file:first-child{border-top:none}' +
      '.jd-browse-dl{background:rgba(52,211,153,.15);border:1px solid rgba(52,211,153,.4);' +
      'color:#6ee7b7;border-radius:6px;padding:3px 10px;font-size:11px;cursor:pointer}' +
      '.jd-browse-result{margin-top:8px;padding:8px;border-radius:8px;' +
      'background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.3);word-break:break-word}';
    document.head.appendChild(st);
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function createCard(goal) {
    ensureCss();
    installUnloadGuard();
    var card = document.createElement('div');
    card.className = 'jd-browse-card';
    var shortGoal = goal.length > 28 ? goal.slice(0, 28) + '…' : goal;
    card.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px">' +
      '<span class="jd-browse-dot" style="width:10px;height:10px"></span>' +
      '<div><div class="jd-browse-title">🌐 Browser</div>' +
      '<div class="jd-browse-sub jd-browse-status">Working…</div></div></div>' +
      '<div class="jd-browse-goal" style="margin-top:8px">' + esc(goal) + '</div>' +
      '<div class="jd-browse-steps"></div>' +
      '<div class="jd-browse-shot"><img alt="browser screenshot"></div>' +
      '<div class="jd-browse-files"></div>' +
      '<input type="file" class="jd-browse-picker" style="display:none">' +
      '<div class="jd-browse-steer" style="display:flex;gap:6px;margin-top:8px">' +
      '<input class="jd-browse-note" placeholder="Sabihin sa agent…" ' +
      'style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);' +
      'border-radius:8px;padding:6px 10px;color:inherit;font-size:12px">' +
      '<button class="jd-browse-btn jd-browse-send">Send</button></div>' +
      '<div class="jd-browse-foot">' +
      '<button class="jd-browse-btn jd-browse-watch" style="display:none">👁 Watch live</button>' +
      '<button class="jd-browse-btn jd-browse-shotbtn" style="display:none">📷 Screenshot</button>' +
      '<button class="jd-browse-btn jd-browse-attach" style="display:none">📎 Attach</button>' +
      '<button class="jd-browse-btn jd-browse-filesbtn" style="display:none">📥 Files</button>' +
      '<button class="jd-browse-btn jd-browse-resume" style="display:none">▶ Resume</button>' +
      '<button class="jd-browse-stop">Stop</button>' +
      '<span class="jd-browse-status jd-browse-count"></span></div>' +
      '<div class="jd-browse-result" style="display:none"></div>';
    card.setAttribute('data-goal-short', shortGoal);
    try {
      var box = document.getElementById('chatBox');
      if (box) box.appendChild(card);
      else document.body.appendChild(card);
      if (box) box.scrollTop = box.scrollHeight;
    } catch (_) {}
    return card;
  }

  function setStatus(card, t) {
    try {
      var s = card.querySelector('.jd-browse-status');
      if (s) s.textContent = t;
    } catch (_) {}
  }

  function addStepRow(card, html) {
    try {
      var steps = card.querySelector('.jd-browse-steps');
      if (!steps) return;
      var row = document.createElement('div');
      row.className = 'jd-browse-step';
      row.innerHTML = html;
      steps.appendChild(row);
      steps.scrollTop = steps.scrollHeight;
    } catch (_) {}
  }

  function fmtAction(a) {
    return esc(a.operation) + (a.target != null ? ' [' + a.target + ']' : '') +
      (a.text ? ' "' + esc(String(a.text).slice(0, 60)) + '"' : '');
  }

  function fmtSize(n) {
    n = Number(n) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  function fileRow(f, getBlob) {
    var row = document.createElement('div');
    row.className = 'jd-browse-file';
    var nm = document.createElement('span');
    nm.textContent = (f.path || '').split('/').pop() + ' · ' + fmtSize(f.size);
    nm.style.overflow = 'hidden';
    nm.style.textOverflow = 'ellipsis';
    nm.style.whiteSpace = 'nowrap';
    var dl = document.createElement('button');
    dl.className = 'jd-browse-dl';
    dl.textContent = '⬇ Download';
    dl.addEventListener('click', function () {
      dl.textContent = '⏳…';
      dl.disabled = true;
      Promise.resolve(getBlob(f)).then(function (blob) {
        dl.textContent = '⬇ Download';
        dl.disabled = false;
        if (!blob) {
          if (window.showModernToast) window.showModernToast('Download failed');
          return;
        }
        try {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = (f.path || 'file').split('/').pop();
          document.body.appendChild(a);
          a.click();
          setTimeout(function () {
            try { URL.revokeObjectURL(a.href); a.remove(); } catch (_) {}
          }, 4000);
        } catch (_) {}
      });
    });
    row.appendChild(nm);
    row.appendChild(dl);
    return row;
  }

  function renderFilesPanel(card, files, getBlob) {
    var panel = card.querySelector('.jd-browse-files');
    var btn = card.querySelector('.jd-browse-filesbtn');
    if (!panel) return;
    try {
      if (btn) btn.textContent = '📥 Files' + (files.length ? ' (' + files.length + ')' : '');
      panel.innerHTML = '';
      if (!files.length) {
        panel.innerHTML = '<div class="jd-browse-file"><span style="opacity:.6">Walang files sa session na ito.</span></div>';
      } else {
        files.forEach(function (f) { panel.appendChild(fileRow(f, getBlob)); });
      }
    } catch (_) {}
  }

  function refreshFiles(card, backend) {
    if (!backend) return Promise.resolve([]);
    return backend.listFiles().then(function (files) {
      renderFilesPanel(card, files || [], function (f) { return backend.downloadFile(f.path); });
      return files || [];
    });
  }

  function onLoopEvent(card, loop, ev, backend) {
    if (ev.type === 'start') {
      setStatus(card, 'opening ' + ev.url);
    } else if (ev.type === 'connected') {
      setStatus(card, 'connected — working…');
      try {
        if (backend && backend.viewerUrl) {
          var w = card.querySelector('.jd-browse-watch');
          if (w) w.style.display = '';
        }
      } catch (_) {}
    } else if (ev.type === 'step') {
      setStatus(card, 'step ' + ev.step + '…');
      addStepRow(card, '▸ step ' + ev.step + ': ' + fmtAction(ev.action));
      var c = card.querySelector('.jd-browse-count');
      if (c) c.textContent = 'step ' + ev.step + ' / ' + loop.maxSteps;
    } else if (ev.type === 'acted') {
      addStepRow(card, '&nbsp;&nbsp;→ ' + (ev.ok ? 'ok' : 'failed: ' + esc(ev.note || '')));
    } else if (ev.type === 'retry') {
      addStepRow(card, '&nbsp;&nbsp;↻ retry (' + esc(ev.why || '') + ')');
    } else if (ev.type === 'blocked') {
      setStatus(card, 'paused — blocked');
      addStepRow(card, '⛔ <b>Blocked.</b> Ikaw ang mag-ayos via 👁 Watch live (hal. mag-login), tapos pindutin ang ▶ Resume.');
      try {
        var rb = card.querySelector('.jd-browse-resume');
        if (rb) rb.style.display = '';
        var wb2 = card.querySelector('.jd-browse-watch');
        if (wb2) wb2.style.display = '';
      } catch (_) {}
    }
  }

  function finishCard(card, result, backend, finalShot, finalFiles) {
    try {
      if (backend) untrackBackend(backend);
      var dot = card.querySelector('.jd-browse-dot');
      if (dot) dot.style.animation = 'none';
      var stop = card.querySelector('.jd-browse-stop');
      if (stop) stop.style.display = 'none';
      ['.jd-browse-watch', '.jd-browse-shotbtn', '.jd-browse-resume',
       '.jd-browse-attach', '.jd-browse-filesbtn', '.jd-browse-steer'].forEach(function (sel) {
        var b = card.querySelector(sel);
        if (b) b.style.display = 'none';
      });
      /* final screenshot (captured before auto-close) — like the Muse app card */
      if (finalShot) {
        try {
          var wrap = card.querySelector('.jd-browse-shot');
          var im = card.querySelector('.jd-browse-shot img');
          if (wrap && im) {
            im.src = 'data:image/png;base64,' + finalShot;
            wrap.style.display = 'block';
          }
        } catch (_) {}
      }
      /* files that survived to the end — bytes cached before auto-close, still downloadable */
      if (finalFiles && finalFiles.length) {
        try {
          renderFilesPanel(card, finalFiles, function (f) { return f._blob || null; });
          var fp = card.querySelector('.jd-browse-files');
          if (fp) fp.style.display = 'block';
        } catch (_) {}
      }
      var shortGoal = card.getAttribute('data-goal-short') || '';
      var msg = {
        DONE: 'Completed · ' + shortGoal,
        BLOCKED: 'Blocked — may harang (login/captcha/paywall)',
        STOPPED: 'Stopped',
        MAX_STEPS: 'Max steps reached',
        GAVE_UP: 'Model unavailable — subukan ulit'
      }[result.status] || result.status;
      setStatus(card, msg);
      if (dot) {
        dot.style.background = result.status === 'DONE' ? '#34d399' : '#f87171';
        if (result.status === 'DONE') dot.style.animation = 'none';
      }
      var res = card.querySelector('.jd-browse-result');
      if (res) {
        var n = 0;
        (result.history || []).forEach(function (h) {
          if (h.operation !== '?') n++;
        });
        res.style.display = 'block';
        var detail = result.status === 'DONE'
          ? 'Nakumpleto ang goal. Session auto-closed — walang tumatakbong browser, walang gastos.'
          : 'Session auto-closed — walang tumatakbong browser, walang gastos.';
        if (finalFiles && finalFiles.length) {
          detail += ' 📥 ' + finalFiles.length + ' file(s) sa baba — pindutin ang Download.';
        }
        res.innerHTML = '<b>' + esc(msg) + '</b><br><span style="opacity:.7">' +
          n + ' actions. ' + esc(detail) + '</span>';
      }
      var box = document.getElementById('chatBox');
      if (box) box.scrollTop = box.scrollHeight;
    } catch (_) {}
  }

  /* ---------------- browse: command interception ---------------- */
  function synth(text) {
    return Promise.resolve(new Response(text, { headers: { 'Content-Type': 'text/plain' } }));
  }

  function steelReady() {
    try {
      if (window.jdSteelConfigured) return window.jdSteelConfigured();
    } catch (_) {}
    return Promise.resolve(false);
  }

  function handleBrowseCommand(goal) {
    if (!goal) {
      return synth('⚠️ Gamit: browse: <goal> — hal. "browse: hanapin mo presyo ng Honor 400"');
    }
    return steelReady().then(function (ready) {
      if (!ready) {
        return synth('⚠️ Wala pang Steel API keys — ilagay mo ang STEEL_API_KEYS sa Vercel (comma-separated), tapos i-redeploy.');
      }
      if (!window.jdSteelBackend) {
        return synth('⚠️ Hindi pa loaded ang Steel backend — mag-refresh ka muna.');
      }
      return startBrowse(goal);
    }).catch(function () {
      return synth('⚠️ Hindi ma-check ang Steel pool — subukan ulit.');
    });
  }

  function startBrowse(goal) {
    var card = createCard(goal);
    var backend = new window.jdSteelBackend();
    trackBackend(backend);
    var finalShot = null;
    var finalFiles = [];
    var loop = new BrowseLoop(goal, backend, {
      onEvent: function (ev) { onLoopEvent(card, loop, ev, backend); },
      onBeforeRelease: function (b) {
        /* final screenshot + file bytes BEFORE auto-close (session files vanish on release) */
        return b.screenshot().then(function (img) { finalShot = img || null; })
          .then(function () { return b.listFiles(); })
          .then(function (files) {
            finalFiles = files || [];
            return Promise.all(finalFiles.map(function (f) {
              return b.downloadFile(f.path).then(function (blob) { f._blob = blob || null; })
                .catch(function () { f._blob = null; });
            }));
          });
      }
    });
    try {
      var stopBtn = card.querySelector('.jd-browse-stop');
      if (stopBtn) stopBtn.addEventListener('click', function () {
        loop.stop();
        setStatus(card, 'stopping…');
      });
      var resumeBtn = card.querySelector('.jd-browse-resume');
      if (resumeBtn) resumeBtn.addEventListener('click', function () {
        resumeBtn.style.display = 'none';
        setStatus(card, 'resuming…');
        loop.resume();
      });
      var watchBtn = card.querySelector('.jd-browse-watch');
      if (watchBtn) watchBtn.addEventListener('click', function () {
        try {
          if (backend.viewerUrl) window.open(backend.viewerUrl, '_blank', 'noopener');
          else if (window.showModernToast) window.showModernToast('Wala pang live view');
        } catch (_) {}
      });
      var shotBtn = card.querySelector('.jd-browse-shotbtn');
      if (shotBtn) shotBtn.addEventListener('click', function () {
        shotBtn.textContent = '⏳…';
        backend.screenshot().then(function (img) {
          shotBtn.textContent = '📷 Screenshot';
          try {
            var wrap = card.querySelector('.jd-browse-shot');
            var im = card.querySelector('.jd-browse-shot img');
            if (img && wrap && im) {
              im.src = 'data:image/png;base64,' + img;
              wrap.style.display = 'block';
            } else if (window.showModernToast) {
              window.showModernToast('Walang screenshot');
            }
          } catch (_) {}
        });
      });
      var sendBtn = card.querySelector('.jd-browse-send');
      var noteInput = card.querySelector('.jd-browse-note');
      function sendNote() {
        try {
          var v = (noteInput.value || '').trim();
          if (!v) return;
          noteInput.value = '';
          loop.note(v);
          addStepRow(card, '💬 ' + esc(v));
          if (window.showModernToast) window.showModernToast('Noted — susundin sa susunod na step');
        } catch (_) {}
      }
      if (sendBtn) sendBtn.addEventListener('click', sendNote);
      if (noteInput) noteInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') sendNote();
      });
      /* 📎 Attach: phone file -> Steel session -> agent notified */
      var picker = card.querySelector('.jd-browse-picker');
      var attachBtn = card.querySelector('.jd-browse-attach');
      if (attachBtn) attachBtn.addEventListener('click', function () {
        try { picker.click(); } catch (_) {}
      });
      if (picker) picker.addEventListener('change', function () {
        try {
          var f = picker.files && picker.files[0];
          if (!f) return;
          picker.value = '';
          if (f.size > 4 * 1024 * 1024) {
            if (window.showModernToast) window.showModernToast('Max 4MB ang file');
            return;
          }
          attachBtn.textContent = '⏳ Uploading…';
          backend.uploadFile(f).then(function (up) {
            attachBtn.textContent = '📎 Attach';
            if (up && up.path) {
              var nm = (up.path || '').split('/').pop();
              addStepRow(card, '📎 uploaded <b>' + esc(nm) + '</b> (' + fmtSize(f.size) + ')');
              loop.note('File "' + nm + '" is uploaded to the session. ' +
                'If the goal needs this file, use ATTACH_FILE on the file-input target with text "' + nm + '".');
              refreshFiles(card, backend);
            } else if (window.showModernToast) {
              window.showModernToast('Upload failed');
            }
          });
        } catch (_) {}
      });
      /* 📥 Files: list + download session files */
      var filesBtn = card.querySelector('.jd-browse-filesbtn');
      var filesPanel = card.querySelector('.jd-browse-files');
      if (filesBtn) filesBtn.addEventListener('click', function () {
        try {
          var hidden = filesPanel.style.display === 'none' || !filesPanel.style.display;
          if (hidden) {
            filesBtn.textContent = '⏳…';
            refreshFiles(card, backend).then(function () {
              filesPanel.style.display = 'block';
            });
          } else {
            filesPanel.style.display = 'none';
          }
        } catch (_) {}
      });
    } catch (_) {}
    setTimeout(function () {
      /* screenshot/attach/files buttons are live immediately; watch appears on connect */
      try {
        ['.jd-browse-shotbtn', '.jd-browse-attach', '.jd-browse-filesbtn'].forEach(function (sel) {
          var b = card.querySelector(sel);
          if (b) b.style.display = '';
        });
      } catch (_) {}
      loop.run().then(function (result) {
        finishCard(card, result, backend, finalShot, finalFiles);
      }).catch(function (err) {
        finishCard(card, { status: 'GAVE_UP', history: [] }, backend, finalShot, finalFiles);
        addStepRow(card, 'error: ' + esc(String((err && err.message) || err)));
      });
    }, 400);
    return synth('🌐 Agent Browse started — sundan ang progress sa card sa baba.');
  }

  function install() {
    if (typeof window.fetch !== 'function') return;
    if (window.fetch.__jdBrowse) return;
    var origFetch = window.fetch;
    var wrapped = function (input, init) {
      try {
        var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
        var method = ((init && init.method) || 'GET').toUpperCase();
        if (url.indexOf('/api/chat') !== -1 && method === 'POST' && init && typeof init.body === 'string') {
          var body = null;
          try { body = JSON.parse(init.body); } catch (_) { body = null; }
          if (body && typeof body === 'object' && !body.action && !body._jdBrowse) {
            var msg = typeof body.message === 'string' ? body.message : '';
            var m = /^\s*browse\s*:\s*/i.exec(msg);
            if (m && window.jdBrowseAgentEnabled && window.jdBrowseAgentEnabled()) {
              return handleBrowseCommand(msg.slice(m[0].length).trim());
            }
          }
        }
      } catch (_) { /* fail-open */ }
      return origFetch.call(this, input, init);
    };
    wrapped.__jdBrowse = true;
    try {
      Object.keys(origFetch).forEach(function (k) {
        if (k.indexOf('__jd') === 0) wrapped[k] = true;
      });
    } catch (_) {}
    window.fetch = wrapped;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install);
  } else {
    install();
  }
  window.__jdBrowseHandleCommand = handleBrowseCommand; /* for tests */
})();
