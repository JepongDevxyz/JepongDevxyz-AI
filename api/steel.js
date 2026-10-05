// JepongDevxyz AI — Steel cloud-browser pool proxy with key rotation.
//
//   POST /api/steel  {action:'status'}                              -> {configured, keys}
//   POST /api/steel  {action:'create'}                              -> {sessionId, targetId, ki}
//   POST /api/steel  {action:'navigate', sessionId, targetId, ki, url} -> {ok}
//   POST /api/steel  {action:'snapshot', sessionId, targetId, ki}   -> {elements:[{role,label,value,x,y}]}
//   POST /api/steel  {action:'act', sessionId, ki, op, x, y, text}  -> {ok, note}
//   POST /api/steel  {action:'release', sessionId, ki}              -> {ok}
//   POST /api/steel  {action:'list_files', sessionId, ki}          -> {files:[{path,size,lastModified}]}
//   POST /api/steel  {action:'download_file', sessionId, ki, path} -> binary (<=4MB)
//   POST /api/steel  {action:'delete_file', sessionId, ki, path}   -> {ok}
//   POST /api/steel?action=upload_file&sessionId=..&ki=.. (multipart, field 'file', optional 'path') -> {ok, path}
//   POST /api/steel  {action:'act', op:'ATTACH_FILE', x, y, text:filename, ...} -> {ok, note}
//
// The Steel API keys live in ONE Vercel env var, comma-separated:
//   STEEL_API_KEYS=key1,key2,key3
// Keys never reach the browser. Rotation: a random key is picked when a
// session is created; its index (ki) is pinned to that session so every
// later call for the session uses the same key.
//
// Control plane: Steel REST (create / computer / release) + CDP over
// WebSocket (navigate / snapshot). Each invocation is stateless and
// short-lived — the phone holds {sessionId, targetId, ki} in memory.
import { webCompatible } from './_node_web_bridge.js';

const BASE = 'https://api.steel.dev';

function getKeys() {
  return String(process.env.STEEL_API_KEYS || '')
    .split(',')
    .map(function (s) { return s.trim(); })
    .filter(Boolean);
}
function keyAt(ki) {
  const keys = getKeys();
  const i = Number(ki);
  if (!Number.isInteger(i) || i < 0 || i >= keys.length) return null;
  return keys[i];
}
function pickIndex() {
  const keys = getKeys();
  return Math.floor(Math.random() * keys.length);
}

async function steelRest(key, path, body) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'steel-api-key': key },
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error('steel-http-' + r.status);
  return r.json();
}

/* GET / DELETE helper for the Files API. */
async function steelGet(key, path, method) {
  const r = await fetch(BASE + path, {
    method: method || 'GET',
    headers: { 'steel-api-key': key },
  });
  if (!r.ok) throw new Error('steel-http-' + r.status);
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('application/json')) return r.json();
  return r.text();
}

/* ---------- minimal CDP over WebSocket (Node 20+ global) ---------- */
function wsConnect(url, timeoutMs) {
  return new Promise(function (resolve, reject) {
    const WS = globalThis.WebSocket;
    if (!WS) return reject(new Error('no-websocket'));
    let ws;
    try { ws = new WS(url); } catch (e) { return reject(e); }
    const to = setTimeout(function () {
      try { ws.close(); } catch (_) {}
      reject(new Error('ws-timeout'));
    }, timeoutMs || 15000);
    ws.onopen = function () { clearTimeout(to); resolve(ws); };
    ws.onerror = function () { clearTimeout(to); reject(new Error('ws-error')); };
  });
}

function cdpRpc(ws, timeoutMs) {
  let seq = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = function (ev) {
    let m;
    try { m = JSON.parse(ev.data); } catch (_) { return; }
    if (m.id != null && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (m.error) p.reject(new Error('cdp: ' + (m.error.message || 'error')));
      else p.resolve(m.result || {});
    } else if (m.method) {
      listeners.forEach(function (fn) { try { fn(m); } catch (_) {} });
    }
  };
  function send(method, params, sessionId) {
    const id = ++seq;
    const msg = { id, method, params: params || {} };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise(function (resolve, reject) {
      const to = setTimeout(function () {
        if (pending.has(id)) { pending.delete(id); reject(new Error('cdp-timeout:' + method)); }
      }, timeoutMs || 20000);
      pending.set(id, {
        resolve: function (v) { clearTimeout(to); resolve(v); },
        reject: function (e) { clearTimeout(to); reject(e); },
      });
      ws.send(JSON.stringify(msg));
    });
  }
  return { send, onEvent: function (fn) { listeners.push(fn); } };
}

function wsUrlFor(key, sessionId) {
  return 'wss://connect.steel.dev?apiKey=' + encodeURIComponent(key) +
    '&sessionId=' + encodeURIComponent(sessionId);
}

async function withPage(key, sessionId, targetId, fn) {
  const ws = await wsConnect(wsUrlFor(key, sessionId));
  try {
    const { send } = cdpRpc(ws, 20000);
    const attached = await send('Target.attachToTarget', { targetId, flatten: true });
    return await fn(send, attached.sessionId);
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

async function cdpCreateTarget(key, sessionId) {
  const ws = await wsConnect(wsUrlFor(key, sessionId));
  try {
    const { send } = cdpRpc(ws, 20000);
    const r = await send('Target.createTarget', { url: 'about:blank' });
    if (!r || !r.targetId) throw new Error('no-target');
    return r.targetId;
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

async function cdpNavigate(key, sessionId, targetId, url) {
  const ws = await wsConnect(wsUrlFor(key, sessionId));
  try {
    const rpc = cdpRpc(ws, 20000);
    const attached = await rpc.send('Target.attachToTarget', { targetId, flatten: true });
    const pageSid = attached.sessionId;
    let loaded = false;
    const loadP = new Promise(function (res) {
      const to = setTimeout(function () { if (!loaded) { loaded = true; res(); } }, 12000);
      rpc.onEvent(function (m) {
        if (m.method === 'Page.loadEventFired' && m.sessionId === pageSid && !loaded) {
          loaded = true; clearTimeout(to); res();
        }
      });
    });
    await rpc.send('Page.navigate', { url }, pageSid);
    await loadP;
    await new Promise(function (r) { setTimeout(r, 800); });
    return { ok: true };
  } finally {
    try { ws.close(); } catch (_) {}
  }
}

/* DOM walk runs INSIDE the cloud page; returns interactive elements + coords. */
function __jdSnapWalk() {
  var out = [];
  var els = document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]');
  for (var i = 0; i < els.length && out.length < 80; i++) {
    try {
      var el = els[i];
      var r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.right < 0) continue;
      var tag = el.tagName.toLowerCase();
      var type = (el.getAttribute('type') || '').toLowerCase();
      var role = tag;
      if (tag === 'a') role = 'link';
      else if (tag === 'button') role = 'button';
      else if (tag === 'select') role = 'select';
      else if (tag === 'textarea') role = 'textbox';
      else if (tag === 'input') {
        if (type === 'file') role = 'file-input';
        else if (type === 'text' || type === 'search' || type === '') role = 'textbox';
        else if (type === 'checkbox') role = 'checkbox';
        else if (type === 'radio') role = 'radio';
        else if (type === 'password' || type === 'email' || type === 'number' || type === 'tel' || type === 'url') role = 'textbox';
        else role = 'button';
      }
      var label = (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 50) ||
        (el.value || '').slice(0, 50) ||
        (el.getAttribute('placeholder') || '').slice(0, 50) ||
        (el.getAttribute('aria-label') || '').slice(0, 50) ||
        (el.getAttribute('title') || '').slice(0, 50);
      out.push({
        role: role,
        label: label,
        value: (el.value || '').slice(0, 60),
        x: Math.round(r.left + r.width / 2),
        y: Math.round(r.top + r.height / 2),
      });
    } catch (_) {}
  }
  return out;
}

async function cdpSnapshot(key, sessionId, targetId) {
  const expr = '(' + __jdSnapWalk.toString() + ')()';
  const els = await withPage(key, sessionId, targetId, async function (send, pageSid) {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }, pageSid);
    const v = r && r.result && r.result.value;
    return Array.isArray(v) ? v : [];
  });
  return els;
}

/* ATTACH_FILE: set a session file on an <input type=file> via CDP.
   Best-effort: Steel maps the session namespace root to / (docs: upload path
   'data/x' -> file:///data/x). Fails gracefully with a note when it doesn't apply. */
async function cdpAttachFile(key, sessionId, targetId, x, y, filename) {
  return withPage(key, sessionId, targetId, async function (send, pageSid) {
    const atPoint = '(function(){var el=document.elementFromPoint(' + x + ',' + y + ');' +
      'if(!el)return null;var inp=el.tagName==="INPUT"?el:el.closest("input");' +
      'return inp?inp:null;})()';
    const chk = await send('Runtime.evaluate', {
      expression: '(function(){var i=' + atPoint + ';return i?{tag:i.tagName,type:i.type}:null;})()',
      returnByValue: true
    }, pageSid);
    const info = chk && chk.result && chk.result.value;
    if (!info || info.tag !== 'INPUT' || String(info.type).toLowerCase() !== 'file') {
      return { ok: false, note: 'not-a-file-input' };
    }
    const ev = await send('Runtime.evaluate', { expression: atPoint }, pageSid);
    const objectId = ev && ev.result && ev.result.objectId;
    if (!objectId) return { ok: false, note: 'no-object' };
    const nd = await send('DOM.requestNode', { objectId }, pageSid);
    if (!nd || !nd.nodeId) return { ok: false, note: 'no-node' };
    const sessPath = '/' + String(filename || '').replace(/^\/+/, '');
    try {
      await send('DOM.setFileInputFiles', { nodeId: nd.nodeId, files: [sessPath] }, pageSid);
    } catch (e) {
      return { ok: false, note: 'set-files-failed' };
    }
    await send('Runtime.evaluate', {
      expression: '(function(){var i=' + atPoint + ';if(i)i.dispatchEvent(new Event("change",{bubbles:true}));return true;})()',
      returnByValue: true
    }, pageSid);
    return { ok: true, note: 'attached ' + sessPath };
  });
}

/* Map Jev-style ops to Steel /computer calls. */
async function doAct(key, sessionId, op, x, y, text) {
  const path = '/v1/sessions/' + encodeURIComponent(sessionId) + '/computer';
  async function computer(body) {
    const r = await steelRest(key, path, body);
    if (r && r.error) return { ok: false, note: String(r.error).slice(0, 200) };
    return { ok: true, note: (r && r.output) ? String(r.output).slice(0, 200) : 'ok' };
  }
  async function clickAt() {
    return computer({ action: 'click_mouse', coordinates: [x, y], button: 'left', click_type: 'click' });
  }
  let r;
  if (op === 'CLICK') {
    r = await clickAt();
  } else if (op === 'TYPE_TEXT') {
    r = await clickAt();
    if (r.ok) r = await computer({ action: 'type_text', text: String(text || '') });
  } else if (op === 'SELECT') {
    r = await clickAt();
    if (r.ok) r = await computer({ action: 'type_text', text: String(text || '') });
    if (r.ok) r = await computer({ action: 'press_key', keys: ['Enter'] });
  } else if (op === 'SCROLL_UP') {
    r = await computer({ action: 'scroll', delta_y: -800 });
  } else if (op === 'SCROLL_DOWN') {
    r = await computer({ action: 'scroll', delta_y: 800 });
  } else if (op === 'WAIT') {
    /* Server-side sleep — Steel's computer 'wait' hangs; a local pause is
       deterministic and costs no Steel API time. */
    await new Promise(function (res) { setTimeout(res, 2000); });
    r = { ok: true, note: 'waited 2s' };
  } else {
    return { ok: false, note: 'unsupported-op' };
  }
  await new Promise(function (res) { setTimeout(res, 1200); });
  return r;
}

/* Multipart file upload: phone POSTs FormData to
   /api/steel?action=upload_file&sessionId=..&ki=.. — raw body is proxied
   straight to Steel, no parsing needed. */
async function handleUpload(req) {
  const url = new URL(req.url, 'http://localhost');
  const keys = getKeys();
  if (!keys.length) return Response.json({ error: 'no-keys' }, { status: 503 });
  const key = keyAt(Number(url.searchParams.get('ki')));
  if (!key) return Response.json({ error: 'bad-key-index' }, { status: 400 });
  const sessionId = String(url.searchParams.get('sessionId') || '');
  if (!sessionId) return Response.json({ error: 'missing-session' }, { status: 400 });
  const ctype = req.headers.get('content-type') || '';
  if (!/multipart\/form-data/i.test(ctype)) {
    return Response.json({ error: 'need-multipart' }, { status: 400 });
  }
  let buf;
  try { buf = Buffer.from(await req.arrayBuffer()); }
  catch (_) { return Response.json({ error: 'read-failed' }, { status: 400 }); }
  if (buf.length > 4 * 1024 * 1024) {
    return Response.json({ error: 'file-too-large', max: '4MB' }, { status: 413 });
  }
  let r;
  try {
    r = await fetch(BASE + '/v1/sessions/' + encodeURIComponent(sessionId) + '/files', {
      method: 'POST',
      headers: { 'steel-api-key': key, 'content-type': ctype },
      body: buf,
    });
  } catch (e) {
    return Response.json({ error: 'steel-unreachable' }, { status: 502 });
  }
  if (!r.ok) {
    return Response.json({ error: 'steel-upload-failed', status: r.status }, { status: 502 });
  }
  const j = await r.json().catch(function () { return {}; });
  return Response.json({ ok: true, path: j.path || j.name || null });
}

async function dispatch(req) {
  const qUrl = new URL(req.url, 'http://localhost');
  if (qUrl.searchParams.get('action') === 'upload_file') {
    return handleUpload(req);
  }
  let body = null;
  try { body = await req.json(); } catch (_) { body = null; }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'bad-request' }, { status: 400 });
  }
  const action = String(body.action || '');

  if (action === 'status') {
    const keys = getKeys();
    return Response.json({ configured: keys.length > 0, keys: keys.length });
  }

  const keys = getKeys();
  if (!keys.length) {
    return Response.json({ error: 'no-keys' }, { status: 503 });
  }
  const ki = action === 'create' ? pickIndex() : Number(body.ki);
  const key = keyAt(ki);
  if (!key) {
    return Response.json({ error: 'bad-key-index' }, { status: 400 });
  }
  const sessionId = String(body.sessionId || '');

  try {
    if (action === 'create') {
      const sess = await steelRest(key, '/v1/sessions', { timeout: 600000, inactivityTimeout: 120000 });
      if (!sess || !sess.id) throw new Error('no-session-id');
      const targetId = await cdpCreateTarget(key, sess.id);
      return Response.json({
        sessionId: sess.id,
        targetId,
        ki,
        viewerUrl: sess.sessionViewerUrl || null,
      });
    }
    if (!sessionId) {
      return Response.json({ error: 'missing-session' }, { status: 400 });
    }
    if (action === 'navigate') {
      const url = String(body.url || '');
      if (!/^https?:\/\//i.test(url)) {
        return Response.json({ error: 'bad-url' }, { status: 400 });
      }
      const r = await cdpNavigate(key, sessionId, String(body.targetId || ''), url);
      return Response.json(r);
    }
    if (action === 'snapshot') {
      const elements = await cdpSnapshot(key, sessionId, String(body.targetId || ''));
      return Response.json({ elements });
    }
    if (action === 'screenshot') {
      const r = await steelRest(key,
        '/v1/sessions/' + encodeURIComponent(sessionId) + '/computer',
        { action: 'take_screenshot' });
      return Response.json({ image: (r && r.base64_image) || null });
    }
    if (action === 'act') {
      const op = String(body.op || '');
      if (op === 'ATTACH_FILE') {
        const r = await cdpAttachFile(key, sessionId, String(body.targetId || ''),
          Number(body.x) || 0, Number(body.y) || 0, String(body.text || ''));
        return Response.json(r);
      }
      if (op === 'READ_FILE') {
        /* Agent reads a text file from the session — parity with the assistant's file reading. */
        const p = String(body.text || '').replace(/^\/+/, '').split('/').pop().split('\\').pop();
        if (!p || p === '.' || p === '..') {
          return Response.json({ ok: false, note: 'bad-filename' });
        }
        let r;
        try {
          r = await fetch(BASE + '/v1/sessions/' + encodeURIComponent(sessionId) + '/files/' +
            encodeURIComponent(p), { headers: { 'steel-api-key': key } });
        } catch (_) {
          return Response.json({ ok: false, note: 'unreachable' });
        }
        if (!r.ok) return Response.json({ ok: false, note: 'not-found' });
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length > 200 * 1024) return Response.json({ ok: false, note: 'too-large-to-read' });
        const text = buf.toString('utf8');
        if (text.indexOf('\u0000') !== -1) {
          return Response.json({ ok: false, note: 'binary-file (text files only)' });
        }
        return Response.json({ ok: true, note: 'FILE "' + p + '":\n' + text.slice(0, 4000) });
      }
      const r = await doAct(key, sessionId, op,
        Number(body.x) || 0, Number(body.y) || 0, body.text);
      return Response.json(r);
    }
    if (action === 'release') {
      try { await steelRest(key, '/v1/sessions/' + encodeURIComponent(sessionId) + '/release', {}); } catch (_) {}
      return Response.json({ ok: true });
    }
    if (action === 'list_files') {
      const r = await steelGet(key, '/v1/sessions/' + encodeURIComponent(sessionId) + '/files', 'GET');
      const files = Array.isArray(r) ? r : (r && r.files) || [];
      return Response.json({
        files: files.map(function (f) {
          return { path: f.path || f.name || '', size: f.size || 0, lastModified: f.lastModified || null };
        })
      });
    }
    if (action === 'delete_file') {
      const p = String(body.path || '').replace(/^\/+/, '');
      if (!p) return Response.json({ error: 'missing-path' }, { status: 400 });
      await steelGet(key, '/v1/sessions/' + encodeURIComponent(sessionId) + '/files/' + p.split('/').map(encodeURIComponent).join('/'), 'DELETE');
      return Response.json({ ok: true });
    }
    if (action === 'download_file') {
      const p = String(body.path || '').replace(/^\/+/, '');
      if (!p) return Response.json({ error: 'missing-path' }, { status: 400 });
      let r;
      try {
        r = await fetch(BASE + '/v1/sessions/' + encodeURIComponent(sessionId) + '/files/' +
          p.split('/').map(encodeURIComponent).join('/'), {
          headers: { 'steel-api-key': key },
        });
      } catch (_) {
        return Response.json({ error: 'steel-unreachable' }, { status: 502 });
      }
      if (!r.ok) return Response.json({ error: 'steel-download-failed', status: r.status }, { status: 502 });
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 4 * 1024 * 1024) {
        return Response.json({ error: 'file-too-large', max: '4MB' }, { status: 413 });
      }
      const ct = r.headers.get('content-type') || 'application/octet-stream';
      const name = p.split('/').pop();
      return new Response(buf, {
        headers: {
          'content-type': ct,
          'content-disposition': 'attachment; filename="' + name.replace(/"/g, '') + '"',
          'content-length': String(buf.length),
        }
      });
    }
    return Response.json({ error: 'unknown-action' }, { status: 400 });
  } catch (e) {
    return Response.json({ error: String((e && e.message) || e).slice(0, 160) }, { status: 502 });
  }
}

export default (req, res) => webCompatible(req, res, dispatch);
