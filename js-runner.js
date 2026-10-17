/* ============================================================
 * js-runner.js — Sandboxed JavaScript runner for JepongDevxyz AI
 * v20261008a354 (2026-10-17)
 *
 * Exposes:
 *   window.jdRunJS(code)        -> Promise<{output, error}>  (headless API)
 *   window.jdOpenJSRunner()     -> opens the runner modal UI
 *
 * Security: code executes in a hidden iframe with
 *   sandbox="allow-scripts" (NO allow-same-origin) so the
 *   untrusted code is origin-opaque and cannot touch the DOM,
 *   localStorage, cookies, or the parent page.
 *
 * Communication: the iframe overrides console.log / console.error /
 *   console.warn and forwards them to the parent via postMessage.
 *   The parent listens for messages with type 'jd-js-runner'.
 *
 * Timeout: 5 seconds. On timeout the iframe is destroyed.
 * ============================================================ */
(function () {
  'use strict';
  if (window.__jdJSRunner) return;
  window.__jdJSRunner = true;

  var RUN_TIMEOUT_MS = 5000;
  var runSeq = 0;
  var pending = {}; // id -> {resolve, timer, iframe}

  /* ---------------- styles ---------------- */
  function ensureCss() {
    if (document.getElementById('jdJSRunnerCss')) return;
    var st = document.createElement('style');
    st.id = 'jdJSRunnerCss';
    st.textContent =
      '.jdjs-overlay{position:fixed;inset:0;z-index:24850;background:rgba(0,0,0,.55);' +
      'display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.jdjs-modal{background:#151517;color:#eee;border-radius:16px;max-width:640px;width:100%;' +
      'max-height:88dvh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5);' +
      'border:1px solid rgba(255,255,255,.08);font-family:inherit}' +
      '.jdjs-head{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;font-weight:700;font-size:15px}' +
      '.jdjs-head .x{margin-left:auto;background:none;border:0;color:#aaa;font-size:20px;cursor:pointer;padding:4px 8px}' +
      '.jdjs-code{margin:0 16px;min-height:150px;resize:vertical;background:#0c0c0e;color:#d7e3f4;' +
      'border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.5}' +
      '.jdjs-bar{display:flex;gap:10px;padding:12px 16px;align-items:center}' +
      '.jdjs-run{background:#7c3aed;color:#fff;border:0;border-radius:10px;padding:10px 20px;' +
      'font-size:14px;font-weight:700;cursor:pointer}' +
      '.jdjs-run:disabled{opacity:.5;cursor:default}' +
      '.jdjs-hint{font-size:12px;color:#888}' +
      '.jdjs-out{margin:0 16px 16px;background:#0c0c0e;border:1px solid rgba(255,255,255,.1);' +
      'border-radius:10px;padding:10px 12px;min-height:90px;max-height:260px;overflow:auto;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;' +
      'white-space:pre-wrap;word-break:break-word}' +
      '.jdjs-out .lg{color:#d7e3f4}' +
      '.jdjs-out .warn{color:#fbbf24}' +
      '.jdjs-out .err{color:#f87171}' +
      '.jdjs-out .ret{color:#6ee7b7}' +
      '.jdjs-out .sys{color:#888;font-style:italic}';
    document.head.appendChild(st);
  }

  /* ---------------- iframe payload ---------------- */
  // Runs inside the sandbox. Overrides console methods to postMessage back,
  // executes user code (supporting top-level return via new Function),
  // and reports uncaught errors.
  var IFRAME_SRC =
    '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>' +
    '(function(){' +
    '"use strict";' +
    'var q=location.hash.slice(1);' +
    'var id=q.split("=")[1]||"";' +
    'function send(kind,args){' +
    'try{parent.postMessage({type:"jd-js-runner",id:id,kind:kind,' +
    'args:Array.prototype.map.call(args,function(a){' +
    'try{return typeof a==="object"?JSON.stringify(a):String(a);}' +
    'catch(e){return String(a);}})}, "*");}catch(e){}}' +
    '["log","info","debug"].forEach(function(m){console[m]=function(){send("log",arguments);};});' +
    'console.warn=function(){send("warn",arguments);};' +
    'console.error=function(){send("error",arguments);};' +
    'window.onerror=function(msg){send("error",[msg]);};' +
    'window.addEventListener("message",function(e){' +
    'if(!e.data||e.data.type!=="jd-js-exec")return;' +
    'try{' +
    'var fn=new Function(e.data.code);' +
    'var r=fn();' +
    'if(r!==undefined){send("return",[r]);}' +
    'send("done",[]);' +
    '}catch(err){send("error",[err&&err.stack||String(err)]);}' +
    '});' +
    '})();' +
    '</' + 'script></body></html>';

  /* ---------------- parent message listener ---------------- */
  function onMessage(e) {
    try {
      var d = e.data;
      if (!d || d.type !== 'jd-js-runner' || !d.id) return;
      var job = pending[d.id];
      if (!job) return;
      if (d.kind === 'log') job.lines.push({ cls: 'lg', text: d.args.join(' ') });
      else if (d.kind === 'warn') job.lines.push({ cls: 'warn', text: d.args.join(' ') });
      else if (d.kind === 'error') job.lines.push({ cls: 'err', text: d.args.join(' ') });
      else if (d.kind === 'return') job.lines.push({ cls: 'ret', text: '=> ' + d.args.join(' ') });
      else if (d.kind === 'done') finish(d.id, null);
    } catch (_) {}
  }
  window.addEventListener('message', onMessage);

  function finish(id, err) {
    var job = pending[id];
    if (!job) return;
    delete pending[id];
    if (job.timer) { clearTimeout(job.timer); job.timer = null; }
    try { if (job.iframe && job.iframe.parentNode) job.iframe.parentNode.removeChild(job.iframe); }
    catch (_) {}
    job.resolve({ output: job.lines, error: err });
  }

  /* ---------------- public API: jdRunJS ---------------- */
  window.jdRunJS = function (code) {
    return new Promise(function (resolve) {
      code = String(code == null ? '' : code);
      if (!code.trim()) {
        resolve({ output: [], error: 'No code to run.' });
        return;
      }
      var id = 'r' + (++runSeq) + '_' + Date.now();
      var job = { lines: [], timer: null, iframe: null, resolve: resolve };
      pending[id] = job;

      var iframe = document.createElement('iframe');
      iframe.setAttribute('sandbox', 'allow-scripts'); // NO allow-same-origin
      iframe.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;';
      iframe.setAttribute('aria-hidden', 'true');
      // Origin-opaque payload: hash carries the run id (location.hash is
      // readable inside sandbox; srcdoc would also work but hash is simpler).
      iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(IFRAME_SRC) + '#id=' + encodeURIComponent(id);
      job.iframe = iframe;

      job.timer = setTimeout(function () {
        finish(id, 'Timed out after ' + (RUN_TIMEOUT_MS / 1000) + 's.');
      }, RUN_TIMEOUT_MS);

      iframe.onload = function () {
        try {
          iframe.contentWindow.postMessage({ type: 'jd-js-exec', code: code }, '*');
        } catch (err) {
          finish(id, 'Failed to start sandbox: ' + String(err && err.message || err));
        }
      };
      iframe.onerror = function () {
        finish(id, 'Sandbox iframe failed to load.');
      };
      document.body.appendChild(iframe);
    });
  };

  /* ---------------- modal UI ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderOutput(el, lines) {
    el.innerHTML = lines.map(function (l) {
      return '<div class="' + l.cls + '">' + esc(l.text) + '</div>';
    }).join('') || '<div class="sys">No output.</div>';
    el.scrollTop = el.scrollHeight;
  }

  window.jdOpenJSRunner = function () {
    ensureCss();
    if (document.getElementById('jdjsOverlay')) return; // already open

    var ov = document.createElement('div');
    ov.className = 'jdjs-overlay';
    ov.id = 'jdjsOverlay';
    ov.innerHTML =
      '<div class="jdjs-modal" role="dialog" aria-label="JavaScript Runner">' +
      '<div class="jdjs-head"><span>\u25b6\ufe0f JS Runner</span>' +
      '<button class="x" id="jdjsClose" aria-label="Close">&times;</button></div>' +
      '<textarea class="jdjs-code" id="jdjsCode" spellcheck="false" ' +
      'placeholder="// Write JavaScript here, then tap Run.\n// console.log output appears below.\nconsole.log(\'Hello from sandbox!\');"></textarea>' +
      '<div class="jdjs-bar"><button class="jdjs-run" id="jdjsRun">Run</button>' +
      '<span class="jdjs-hint">Sandboxed &middot; 5s timeout &middot; no DOM/network access</span></div>' +
      '<div class="jdjs-out" id="jdjsOut"><div class="sys">Output will appear here.</div></div>' +
      '</div>';
    document.body.appendChild(ov);

    var codeEl = ov.querySelector('#jdjsCode');
    var outEl = ov.querySelector('#jdjsOut');
    var runBtn = ov.querySelector('#jdjsRun');
    var running = false;

    function close() {
      try { ov.parentNode.removeChild(ov); } catch (_) {}
    }
    ov.querySelector('#jdjsClose').onclick = close;
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function esc2(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); }
    });

    runBtn.onclick = function () {
      if (running) return;
      running = true;
      runBtn.disabled = true;
      outEl.innerHTML = '<div class="sys">Running\u2026</div>';
      window.jdRunJS(codeEl.value).then(function (res) {
        running = false;
        runBtn.disabled = false;
        var lines = res.output.slice();
        if (res.error) lines.push({ cls: 'err', text: 'Error: ' + res.error });
        renderOutput(outEl, lines);
      });
    };
  };

  /* ---------------- self-test (console only, non-blocking) ---------------- */
  try {
    if (location.hash === '#jdjs-selftest') {
      window.jdRunJS('console.log("selftest", 1+1); 42;').then(function (r) {
        /* eslint-disable-next-line no-console */
        console.log('[js-runner selftest]', JSON.stringify(r));
      });
    }
  } catch (_) {}
})();
