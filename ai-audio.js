/* ============================================================
   ai-audio.js — AI voice messages (voice-note bubbles).

   1. Injects an instruction block (MARK '[jd-ai-audio]') into
      body.personalization.customInstructions on every POST /api/chat
      whose JSON body has no `action` field (so the server TTS
      action:'tts' call itself is never touched).
   2. Taps the response stream: when the model emits
        [[JD_AUDIO|short spoken text]]
      the patch strips the marker from the displayed text (the user
      never sees raw markers), and after the response finishes it
      appends a voice-note bubble (play/pause, progress, time label)
      to the finished assistant message. The audio is fetched from
      the server TTS endpoint via XMLHttpRequest — deliberately NOT
      via fetch, so no sibling fetch-wrapper stream tap can run a
      TextDecoder over the binary audio bytes.

   Marker payload: plain text, max ~400 chars, no '|' and no ']]'.

   Fail-open and idempotent: never blocks or alters the request/
   response when anything is unavailable; the MARK guard keeps the
   instruction appended exactly once per request.
   ============================================================ */
(function () {
'use strict';
if (window.__jdAiAudio) return;
window.__jdAiAudio = true;

var MARK = '[jd-ai-audio]';
/* payload cannot contain ']]' (the instruction says so), so a
   non-greedy scan up to the first ']]' is exact. */
var AUDIO_MARK_RE = /\[\[JD_AUDIO\|([\s\S]*?)\]\]/;
var LEFTOVER_RE = /\[\[JD_AUDIO\|[\s\S]*?\]\]/g;

function audioBlock() {
  return MARK + '\n' +
    'AI VOICE MESSAGES — when the user asks you to say, speak, read, or sing ' +
    'something out loud — in English ("say this", "read it aloud", "speak", "sing it") ' +
    'or in Tagalog ("sabihin mo", "basahin mo", "kantahin mo", "pakinggan") — ' +
    'answer normally with your text reply AND emit EXACTLY one marker on its own line: ' +
    '[[JD_AUDIO|short spoken text]]. The spoken text is plain conversational text, ' +
    'at most 400 characters, and must never contain the pipe character | or the ' +
    'sequence ]]. Never describe the marker to the user. The app turns the marker ' +
    'into a playable voice-note bubble shown under your reply.';
}

/* ---------- one-at-a-time audio registry ---------- */
function ctl() {
  try {
    if (!window.__jdAiAudioCtl) {
      window.__jdAiAudioCtl = {
        items: [],
        add: function (it) { this.items.push(it); },
        remove: function (it) {
          var i = this.items.indexOf(it);
          if (i !== -1) this.items.splice(i, 1);
        },
        stopAll: function (except) {
          try {
            this.items.slice().forEach(function (it) {
              if (it !== except && it.pause) { try { it.pause(); } catch (_) {} }
            });
          } catch (_) {}
          try {
            if (typeof window.stopAllSpeech === 'function') window.stopAllSpeech();
          } catch (_) {}
        }
      };
    }
    return window.__jdAiAudioCtl;
  } catch (_) { return null; }
}

function toast(msg) {
  try {
    if (typeof window.showModernToast === 'function') window.showModernToast(msg);
  } catch (_) {}
}

/* ---------- language auto-detect (tl vs en) ---------- */
function detectLang(t) {
  try {
    var s = String(t || '').toLowerCase();
    if (/[áàâéèêíìîóòôúùûñ]/.test(s)) return 'tl';
    var hits = (s.match(/\b(ang|ng|mga|ako|ikaw|kami|tayo|sila|nila|amin|atin|iyong|niya|natin|kayo|ano|bakit|paano|saan|kailan|sino|oo|opo|lang|naman|talaga|kasi|dahil|pero|nang|para|kung|kapag|habang|mula|hanggang|tahanan|mahal|kita|puso|araw|gabi|buhay)\b/g) || []).length;
    var words = s.split(/\s+/).filter(Boolean).length || 1;
    if (hits >= 3 && hits / words > 0.12) return 'tl';
  } catch (_) {}
  return 'en';
}

/* ---------- CSS (injected once, theme via CSS vars) ---------- */
function ensureCss() {
  try {
    if (document.getElementById('jd-ai-audio-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-ai-audio-css';
    st.textContent =
      '.jd-ai-audio{display:flex;align-items:center;gap:10px;margin:10px 0 2px;padding:10px 12px;' +
      'border:1px solid var(--border-color);border-radius:14px;background:var(--modal-bg);max-width:100%}\n' +
      '.jd-ai-audio__play{flex:0 0 auto;width:38px;height:38px;border-radius:50%;border:1px solid var(--border-color);' +
      'background:transparent;color:var(--text-main);display:flex;align-items:center;justify-content:center;cursor:pointer}\n' +
      '.jd-ai-audio__play:active{transform:scale(.94)}\n' +
      '.jd-ai-audio__play svg{width:16px;height:16px}\n' +
      '.jd-ai-audio__mid{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:6px}\n' +
      '.jd-ai-audio__track{height:4px;border-radius:2px;background:var(--border-color);overflow:hidden}\n' +
      '.jd-ai-audio__fill{height:100%;width:0%;background:var(--text-main);border-radius:2px;transition:width .15s linear}\n' +
      '.jd-ai-audio__row{display:flex;align-items:center;justify-content:space-between;gap:8px}\n' +
      '.jd-ai-audio__time{font-size:11px;color:var(--text-main);opacity:.65;font-variant-numeric:tabular-nums}\n' +
      '.jd-ai-audio__cap{font-size:11px;color:var(--text-main);opacity:.55}\n' +
      '.jd-ai-audio.is-loading{opacity:.75}\n' +
      '.jd-ai-audio.is-loading .jd-ai-audio__track{background:linear-gradient(90deg,var(--border-color),var(--text-main),var(--border-color));' +
      'background-size:200% 100%;animation:jdAudioShimmer 1.2s linear infinite}\n' +
      '@keyframes jdAudioShimmer{to{background-position:-200% 0}}\n' +
      '.jd-ai-audio.is-error .jd-ai-audio__cap{opacity:.8}\n';
    document.head.appendChild(st);
  } catch (_) {}
}

var SVG_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
var SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  var m = Math.floor(sec / 60), s = sec % 60;
  return m + ':' + (s < 10 ? '0' + s : s);
}

/* ---------- TTS fetch via XHR (bypasses all fetch wrappers) ---------- */
function fetchTtsBlob(text, language, voice) {
  return new Promise(function (resolve, reject) {
    try {
      var XHR = window.XMLHttpRequest;
      if (!XHR) { reject(new Error('no-xhr')); return; }
      var xhr = new XHR();
      xhr.open('POST', '/api/chat', true);
      try { xhr.setRequestHeader('Content-Type', 'application/json'); } catch (_) {}
      try { xhr.responseType = 'blob'; } catch (_) {}
      xhr.onload = function () {
        try {
          if (xhr.status < 200 || xhr.status >= 300) { reject(new Error('TTS HTTP ' + xhr.status)); return; }
          var ct = '';
          try { ct = String(xhr.getResponseHeader('content-type') || '').toLowerCase(); } catch (_) {}
          if (ct && ct.indexOf('audio/') === -1 && ct.indexOf('octet-stream') === -1) {
            reject(new Error('non-audio')); return;
          }
          resolve(xhr.response);
        } catch (e) { reject(e); }
      };
      xhr.onerror = function () { reject(new Error('tts-network')); };
      xhr.ontimeout = function () { reject(new Error('tts-timeout')); };
      try { xhr.timeout = 45000; } catch (_) {}
      xhr.send(JSON.stringify({ action: 'tts', text: text, language: language, voice: voice }));
    } catch (e) { reject(e); }
  });
}

/* ---------- bubble ---------- */
function buildBubble() {
  var root = document.createElement('div');
  root.className = 'jd-ai-audio is-loading';
  root.setAttribute('data-jd-ai-audio', '1');
  root.innerHTML =
    '<button type="button" class="jd-ai-audio__play" aria-label="Play AI voice">' + SVG_PLAY + '</button>' +
    '<div class="jd-ai-audio__mid">' +
      '<div class="jd-ai-audio__track"><div class="jd-ai-audio__fill"></div></div>' +
      '<div class="jd-ai-audio__row">' +
        '<span class="jd-ai-audio__time">0:00 / 0:00</span>' +
        '<span class="jd-ai-audio__cap">Loading audio&hellip;</span>' +
      '</div>' +
    '</div>';
  return root;
}

function markError(root) {
  try {
    root.classList.remove('is-loading');
    root.classList.add('is-error');
    var cap = root.querySelector('.jd-ai-audio__cap');
    if (cap) cap.textContent = 'Audio unavailable';
    var play = root.querySelector('.jd-ai-audio__play');
    if (play) { play.disabled = true; play.style.opacity = '.4'; }
  } catch (_) {}
}

function wireBubble(root, blob) {
  try {
    var ctr = ctl();
    var audioUrl = '';
    try {
      var U = window.URL || URL;
      if (U && typeof U.createObjectURL === 'function') audioUrl = U.createObjectURL(blob);
    } catch (_) {}
    if (!audioUrl) { markError(root); return; }
    var ACtor = window.Audio;
    if (typeof ACtor !== 'function') { markError(root); return; }
    var audio;
    try { audio = new ACtor(audioUrl); } catch (_) { markError(root); return; }
    try { audio.preload = 'auto'; } catch (_) {}

    var playBtn = root.querySelector('.jd-ai-audio__play');
    var fill = root.querySelector('.jd-ai-audio__fill');
    var timeEl = root.querySelector('.jd-ai-audio__time');
    var cap = root.querySelector('.jd-ai-audio__cap');

    var entry = {
      pause: function () {
        try { audio.pause(); } catch (_) {}
        try { if (playBtn) { playBtn.innerHTML = SVG_PLAY; playBtn.setAttribute('aria-label', 'Play AI voice'); } } catch (_) {}
      }
    };

    function refreshTime() {
      try {
        var d = audio.duration, c = audio.currentTime;
        if (timeEl) timeEl.textContent = fmtTime(c) + ' / ' + fmtTime(d);
        if (fill && d > 0 && isFinite(d)) fill.style.width = Math.min(100, (c / d) * 100) + '%';
      } catch (_) {}
    }

    try {
      audio.addEventListener('loadedmetadata', refreshTime);
      audio.addEventListener('timeupdate', refreshTime);
      audio.addEventListener('ended', function () {
        try { audio.currentTime = 0; } catch (_) {}
        refreshTime();
        try { if (playBtn) { playBtn.innerHTML = SVG_PLAY; playBtn.setAttribute('aria-label', 'Play AI voice'); } } catch (_) {}
        try { if (ctr) ctr.remove(entry); } catch (_) {}
      });
      audio.addEventListener('error', function () { markError(root); });
    } catch (_) {}

    if (playBtn) {
      playBtn.addEventListener('click', function () {
        try {
          if (audio.paused) {
            if (ctr) ctr.stopAll(entry);
            var pr = audio.play();
            if (pr && typeof pr.catch === 'function') pr.catch(function () { markError(root); });
            playBtn.innerHTML = SVG_PAUSE;
            playBtn.setAttribute('aria-label', 'Pause AI voice');
            if (ctr) ctr.add(entry);
          } else {
            entry.pause();
            if (ctr) ctr.remove(entry);
          }
        } catch (_) { markError(root); }
      });
    }

    root.classList.remove('is-loading');
    if (cap) cap.textContent = 'AI voice';
    refreshTime();
  } catch (_) { markError(root); }
}

/* ---------- scrub any literal leftover markers from the message ---------- */
function scrubLeftovers(msg) {
  try {
    LEFTOVER_RE.lastIndex = 0;
    var walker = document.createTreeWalker(msg, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (tn) {
      try {
        if (LEFTOVER_RE.test(tn.nodeValue)) {
          LEFTOVER_RE.lastIndex = 0;
          tn.nodeValue = tn.nodeValue.replace(LEFTOVER_RE, '');
        }
      } catch (_) {}
    });
  } catch (_) {}
}

/* ---------- attach the bubble once the assistant message settles ---------- */
function attachWhenReady(spokenText) {
  try {
    var text = String(spokenText || '').trim().slice(0, 400);
    if (!text) return;
    ensureCss();
    var tries = 0, lastLen = -1, stable = 0, target = null;
    var timer = setInterval(function () {
      try {
        tries++;
        var bots = document.querySelectorAll('#chatBox .msg.bot');
        var msg = bots && bots.length ? bots[bots.length - 1] : null;
        if (!msg || msg.querySelector('[data-jd-ai-audio]')) {
          if (!msg && tries < 25) return; /* keep waiting for the message */
          clearInterval(timer);
          return;
        }
        /* skip while a streaming cursor is still present */
        if (msg.querySelector('.cursor,.typing,.streaming-cursor,.jd-stream-cursor')) { stable = 0; lastLen = -1; return; }
        var len = (msg.textContent || '').length;
        if (len === lastLen && len > 0) { stable++; } else { stable = 0; }
        lastLen = len;
        if (stable >= 2 || tries >= 25) {
          clearInterval(timer);
          target = msg;
          if (msg.querySelector('[data-jd-ai-audio]')) return;
          var bubble = buildBubble();
          try { msg.appendChild(bubble); } catch (_) { return; }
          scrubLeftovers(msg);
          var voice = 'Ember';
          try {
            var vp = window.personalizationSettings && window.personalizationSettings.voicePersona;
            if (vp) voice = vp;
          } catch (_) {}
          fetchTtsBlob(text, detectLang(text), voice).then(
            function (blob) { wireBubble(bubble, blob); },
            function () { markError(bubble); toast('Audio unavailable'); }
          );
        }
      } catch (_) { try { clearInterval(timer); } catch (_) {} }
    }, 200);
  } catch (_) {}
}

/* ---------- stream tap: strip markers, remember the payload ---------- */
function tapResponse(res, onAudio, onDone) {
  try {
    if (!res || !res.body || typeof res.body.getReader !== 'function') return res;
    /* never touch non-text responses (audio blobs etc.) */
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
              while ((m = AUDIO_MARK_RE.exec(rest))) {
                cleaned += rest.slice(0, m.index);
                if (onAudio && m[1]) { try { onAudio(m[1]); } catch (_) {} }
                rest = rest.slice(m.index + m[0].length);
              }
              cleaned += rest;
              if (cleaned) controller.enqueue(encoder.encode(cleaned));
              controller.close();
              /* the app has now received every byte of this response */
              if (typeof onDone === 'function') { try { onDone(); } catch (_) {} }
              return;
            }
            buf += decoder.decode(r.value, { stream: true });
            var out2 = '';
            var mm;
            var hold = 120; /* tail holdback for split markers */
            var scan = buf.length > hold ? buf.slice(0, buf.length - hold) : '';
            var tail = buf.length > hold ? buf.slice(buf.length - hold) : buf;
            var rest2 = scan;
            while ((mm = AUDIO_MARK_RE.exec(rest2))) {
              out2 += rest2.slice(0, mm.index);
              if (onAudio && mm[1]) { try { onAudio(mm[1]); } catch (_) {} }
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
  if (window.fetch.__jdAiAudio) return;
  /* NOTE: kept unbound (not .bind(window)) so sibling __jd* marker
     properties survive on the function object for the chain below. */
  var origFetch = window.fetch;
  var wrapped = function (input, init) {
    var isChat = false;
    var pendingAudio = null;
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
            pers.customInstructions = (cur ? cur + '\n\n' : '') + audioBlock();
            body.personalization = pers;
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      }
    } catch (_) { /* fail-open */ }
    var p = origFetch.call(window, input, init);
    if (isChat && p && typeof p.then === 'function') {
      return p.then(function (res) {
        return tapResponse(res,
          function (payload) {
            if (pendingAudio === null) pendingAudio = payload; /* first marker wins */
          },
          function () {
            /* stream fully consumed: the assistant message is done rendering */
            if (pendingAudio !== null) {
              var t = pendingAudio;
              pendingAudio = null;
              setTimeout(function () { attachWhenReady(t); }, 150);
            }
          });
      });
    }
    return p;
  };
  wrapped.__jdAiAudio = true;
  /* Preserve sibling wrapper markers so chained patches keep working. */
  try {
    Object.keys(origFetch).forEach(function (k) {
      if (k.indexOf('__jd') === 0) wrapped[k] = true;
    });
  } catch (_) {}
  window.fetch = wrapped;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', install, { once: true });
  document.addEventListener('DOMContentLoaded', installAudioDomWatcher, { once: true });
} else {
  install();
  installAudioDomWatcher();
}
setTimeout(install, 1500);
setTimeout(installAudioDomWatcher, 2000);

/* ---------- INDEPENDENT DOM watcher (robust fallback) ----------
   Watches for [[JD_AUDIO|text]] markers in rendered messages,
   strips them, and renders the voice bubble. Does NOT depend on
   the fetch wrapper chain. Added 2026-10-05 to fix raw markers. */
function installAudioDomWatcher() {
  try {
    if (window.__jdAudioDomWatcher) return;
    window.__jdAudioDomWatcher = true;
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mut) {
        mut.addedNodes.forEach(function (node) {
          if (!node.querySelectorAll) return;
          var msgs = [];
          if (node.classList && node.classList.contains('msg') && node.classList.contains('bot')) {
            msgs.push(node);
          }
          var descendants = node.querySelectorAll ? node.querySelectorAll('.msg.bot') : [];
          for (var i = 0; i < descendants.length; i++) msgs.push(descendants[i]);
          msgs.forEach(function (msg) {
            try {
              if (msg.__jdAudioDone) return;
              var text = msg.textContent || '';
              AUDIO_MARK_RE.lastIndex = 0;
              var m = AUDIO_MARK_RE.exec(text);
              if (m) {
                msg.__jdAudioDone = true;
                var spoken = m[1];
                /* Strip marker and render bubble */
                try {
                  LEFTOVER_RE.lastIndex = 0;
                  var walker = document.createTreeWalker(msg, NodeFilter.SHOW_TEXT, null);
                  var nodes = [], n;
                  while ((n = walker.nextNode())) nodes.push(n);
                  nodes.forEach(function (tn) {
                    try {
                      if (LEFTOVER_RE.test(tn.nodeValue)) {
                        LEFTOVER_RE.lastIndex = 0;
                        tn.nodeValue = tn.nodeValue.replace(LEFTOVER_RE, '');
                      }
                    } catch (_) {}
                  });
                } catch (_) {}
                setTimeout(function () {
                  try {
                    if (msg.querySelector('[data-jd-ai-audio]')) return;
                    var bubble = buildBubble();
                    try { msg.appendChild(bubble); } catch (_) { return; }
                    var voice = 'Ember';
                    try {
                      var vp = window.personalizationSettings && window.personalizationSettings.voicePersona;
                      if (vp) voice = vp;
                    } catch (_) {}
                    fetchTtsBlob(spoken, detectLang(spoken), voice).then(
                      function (blob) { wireBubble(bubble, blob); },
                      function () { markError(bubble); }
                    );
                  } catch (_) {}
                }, 100);
              }
            } catch (_) {}
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
}
})();
