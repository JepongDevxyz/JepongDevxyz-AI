/* =========================================================
   JepongDevxyz AI — Steel backend (thin /api/steel client)
   Runtime patch loaded by agent.js (additive only).

   The Steel API keys live in the Vercel env var STEEL_API_KEYS
   (single var, comma-separated: key1,key2,key3) — shared pool for
   ALL users, with server-side rotation. Keys never reach the phone:
   every call goes through POST /api/steel, which picks a rotated key
   per session (pinned via ki) and proxies to Steel's REST + CDP.

   Implements the window.jdBrowserBackend interface:
     connect(), navigate(url), snapshot() -> {table, coords},
     act(action) -> {ok, note}, release()
   window.jdSteelConfigured() -> Promise<boolean> (pool status).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSteelBackendLoaded) return;
  window.__jdSteelBackendLoaded = true;

  function apiCall(action, params) {
    var body = { action: action };
    if (params) {
      for (var k in params) {
        if (Object.prototype.hasOwnProperty.call(params, k)) body[k] = params[k];
      }
    }
    return fetch('/api/steel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) { return res.json(); });
  }
  window.__jdSteelApiCall = apiCall; /* for tests */

  window.jdSteelConfigured = function () {
    return apiCall('status').then(function (s) {
      return !!(s && s.configured);
    }).catch(function () { return false; });
  };
  window.jdSteelPoolInfo = function () {
    return apiCall('status').catch(function () { return { configured: false, keys: 0 }; });
  };

  function tableFromElements(els) {
    var lines = [];
    var coords = {};
    (els || []).forEach(function (el, i) {
      var idx = i + 1;
      var line = '[' + idx + '] ' + el.role + ' "' + String(el.label || '').replace(/"/g, "'") + '"';
      if (el.role === 'textbox') line += ' | value="' + String(el.value || '').replace(/"/g, "'") + '"';
      lines.push(line);
      coords[idx] = [el.x | 0, el.y | 0];
    });
    return { table: lines.join('\n') || '(no interactive elements)', coords: coords };
  }
  window.__jdSteelTableFromElements = tableFromElements; /* for tests */

  function SteelBackend() {
    this.sessionId = null;
    this.targetId = null;
    this.ki = null;
    this.viewerUrl = null;
    this.currentUrl = null;
  }

  SteelBackend.prototype.connect = function () {
    var self = this;
    return apiCall('create').then(function (r) {
      if (!r || !r.sessionId) throw new Error((r && r.error) || 'no-session');
      self.sessionId = r.sessionId;
      self.targetId = r.targetId;
      self.ki = r.ki;
      self.viewerUrl = r.viewerUrl || null;
    });
  };

  SteelBackend.prototype.navigate = function (url) {
    var self = this;
    return apiCall('navigate', {
      sessionId: this.sessionId, targetId: this.targetId, ki: this.ki, url: url
    }).then(function (r) {
      if (!r || r.error) throw new Error((r && r.error) || 'navigate-failed');
      self.currentUrl = url; /* track for viewer URL bar */
    });
  };

  SteelBackend.prototype.snapshot = function () {
    return apiCall('snapshot', {
      sessionId: this.sessionId, targetId: this.targetId, ki: this.ki
    }).then(function (r) {
      if (!r || r.error) throw new Error((r && r.error) || 'snapshot-failed');
      return tableFromElements(r.elements);
    });
  };

  SteelBackend.prototype.act = function (action) {
    var op = action.operation;
    var xy = action.xy || [0, 0];
    return apiCall('act', {
      sessionId: this.sessionId, ki: this.ki, targetId: this.targetId,
      op: op, x: xy[0], y: xy[1], text: action.text || ''
    }).then(function (r) {
      if (!r) return { ok: false, note: 'empty-response' };
      if (r.error) return { ok: false, note: String(r.error).slice(0, 200) };
      return { ok: !!r.ok, note: (r.note || 'ok').slice(0, 200) };
    });
  };

  SteelBackend.prototype.release = function () {
    var self = this;
    if (!this.sessionId) return Promise.resolve();
    var unloading = false;
    try { unloading = !!window.__jdBrowseUnloading; } catch (_) {}
    var p;
    if (unloading) {
      /* fire-and-forget: survives page unload so sessions never leak credits */
      try {
        p = fetch('/api/steel', {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'release', sessionId: this.sessionId, ki: this.ki })
        }).catch(function () {});
      } catch (_) { p = Promise.resolve(); }
    } else {
      p = apiCall('release', { sessionId: this.sessionId, ki: this.ki }).catch(function () {});
    }
    return p.then(function () {
      self.sessionId = null; self.targetId = null; self.ki = null; self.viewerUrl = null;
    });
  };

  SteelBackend.prototype.screenshot = function () {
    if (!this.sessionId) return Promise.resolve(null);
    return apiCall('screenshot', { sessionId: this.sessionId, ki: this.ki }).then(function (r) {
      return (r && r.image) || null;
    }).catch(function () { return null; });
  };

  SteelBackend.prototype.listFiles = function () {
    if (!this.sessionId) return Promise.resolve([]);
    return apiCall('list_files', { sessionId: this.sessionId, ki: this.ki }).then(function (r) {
      return (r && r.files) || [];
    }).catch(function () { return []; });
  };

  SteelBackend.prototype.deleteFile = function (path) {
    if (!this.sessionId) return Promise.resolve(false);
    return apiCall('delete_file', { sessionId: this.sessionId, ki: this.ki, path: path })
      .then(function (r) { return !!(r && r.ok); })
      .catch(function () { return false; });
  };

  /* Download a session file -> Blob (caller triggers the phone download). */
  SteelBackend.prototype.downloadFile = function (path) {
    if (!this.sessionId) return Promise.resolve(null);
    return fetch('/api/steel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'download_file', sessionId: this.sessionId, ki: this.ki, path: path })
    }).then(function (res) {
      if (!res.ok) return null;
      var ct = '';
      try { ct = res.headers.get('content-type') || ''; } catch (_) {}
      if (ct.indexOf('application/json') !== -1) return null; /* error payload */
      return res.blob();
    }).catch(function () { return null; });
  };

  /* Upload a phone File into the Steel session (multipart passthrough). */
  SteelBackend.prototype.uploadFile = function (file) {
    var self = this;
    if (!this.sessionId || !file) return Promise.resolve(null);
    var fd;
    try {
      fd = new FormData();
      fd.append('file', file, file.name || 'upload.bin');
      fd.append('path', file.name || 'upload.bin');
    } catch (_) { return Promise.resolve(null); }
    var url = '/api/steel?action=upload_file&sessionId=' + encodeURIComponent(this.sessionId) +
      '&ki=' + encodeURIComponent(this.ki);
    return fetch(url, { method: 'POST', body: fd }).then(function (res) {
      return res.json().catch(function () { return null; });
    }).then(function (r) {
      return (r && r.ok) ? { path: r.path || (file.name || '') } : null;
    }).catch(function () { return null; });
  };

  window.jdSteelBackend = SteelBackend;
})();
