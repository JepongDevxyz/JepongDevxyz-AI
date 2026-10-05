/* ============================================================
   lyrics.js — AI lyrics cards + Lyrics (+) sheet row.

   1. Injects an instruction block (MARK '[jd-lyrics]') into
      body.personalization.customInstructions on every POST /api/chat
      whose JSON body has no `action` field.
   2. Taps the response stream: when the model emits
        [[JD_LYRICS|artist|title]]
      the patch strips the marker from the displayed text (the user
      never sees raw markers), fetches the lyrics from the free,
      keyless, CORS-enabled https://api.lyrics.ovh endpoint, and
      appends a lyrics card (header, scrollable lyrics body, Copy /
      Read aloud buttons) to the finished assistant message.
   3. Adds a "Lyrics" row to the composer (+) tool sheet. Tapping it
      opens a small bottom-sheet dialog (song title + artist) that
      sends `Lyrics ng "<title>" by <artist>` through the real chat
      pipeline, so the marker protocol above does the rest.

   Marker fields: never contain '|' (the instruction says so).

   Fail-open and idempotent: never blocks or alters the request/
   response when anything is unavailable; the MARK guard keeps the
   instruction appended exactly once per request.
   ============================================================ */
(function () {
'use strict';
if (window.__jdLyrics) return;
window.__jdLyrics = true;

var MARK = '[jd-lyrics]';
var LYRICS_MARK_RE = /\[\[JD_LYRICS\|([^|\]]*)\|([^|\]]*)\]\]/;
var LEFTOVER_RE = /\[\[JD_LYRICS\|[^|\]]*\|[^|\]]*\]\]/g;

function lyricsBlock() {
  return MARK + '\n' +
    'LYRICS CARDS — when the user asks for song lyrics (e.g. "lyrics ng ...", ' +
    '"lyrics of ...", "kanta lyrics", "patingin ng lyrics"), reply conversationally ' +
    'AND emit EXACTLY one marker on its own line: [[JD_LYRICS|artist|title]]. ' +
    'Never put the pipe character | inside the artist or title. Never describe the ' +
    'marker to the user. The app fetches the lyrics and shows them as a card under ' +
    'your reply.';
}

function toast(msg) {
  try {
    if (typeof window.showModernToast === 'function') window.showModernToast(msg);
  } catch (_) {}
}

/* ---------- CSS (injected once, theme via CSS vars) ---------- */
function ensureCss() {
  try {
    if (document.getElementById('jd-lyrics-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-lyrics-css';
    st.textContent =
      '.jd-lyrics-card{margin:10px 0 2px;border:1px solid var(--border-color);border-radius:14px;' +
      'background:var(--modal-bg);overflow:hidden;max-width:100%}\n' +
      '.jd-lyrics-card__head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border-color)}\n' +
      '.jd-lyrics-card__head svg{width:20px;height:20px;flex:0 0 auto;color:var(--text-main);opacity:.8}\n' +
      '.jd-lyrics-card__title{font-size:14px;font-weight:600;color:var(--text-main);line-height:1.3}\n' +
      '.jd-lyrics-card__artist{font-size:12px;color:var(--text-main);opacity:.6;margin-top:2px}\n' +
      '.jd-lyrics-card__body{padding:12px 14px;max-height:320px;overflow-y:auto;white-space:pre-wrap;' +
      'font-size:13px;line-height:1.65;color:var(--text-main)}\n' +
      '.jd-lyrics-card__foot{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--border-color)}\n' +
      '.jd-lyrics-card__btn{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 0;' +
      'border:1px solid var(--border-color);border-radius:10px;background:transparent;color:var(--text-main);' +
      'font-size:13px;cursor:pointer}\n' +
      '.jd-lyrics-card__btn:active{transform:scale(.97)}\n' +
      '.jd-lyrics-card__btn svg{width:15px;height:15px}\n' +
      '.jd-lyrics-card__via{padding:0 14px 10px;font-size:10px;color:var(--text-main);opacity:.4}\n' +
      '.jd-lyrics-card.is-loading .jd-lyrics-card__body{opacity:.6}\n' +
      /* bottom-sheet dialog */
      '.jd-lyrics-sheet{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center}\n' +
      '.jd-lyrics-sheet__bg{position:absolute;inset:0;background:rgba(0,0,0,.45)}\n' +
      '.jd-lyrics-sheet__panel{position:relative;width:100%;max-width:520px;background:var(--modal-bg);' +
      'border:1px solid var(--border-color);border-bottom:none;border-radius:18px 18px 0 0;padding:18px 18px 22px}\n' +
      '.jd-lyrics-sheet__grab{width:40px;height:4px;border-radius:2px;background:var(--border-color);margin:0 auto 14px}\n' +
      '.jd-lyrics-sheet__h{font-size:16px;font-weight:600;color:var(--text-main);margin-bottom:4px}\n' +
      '.jd-lyrics-sheet__sub{font-size:12px;color:var(--text-main);opacity:.6;margin-bottom:14px}\n' +
      '.jd-lyrics-sheet__label{display:block;font-size:12px;color:var(--text-main);opacity:.7;margin:10px 0 6px}\n' +
      '.jd-lyrics-sheet__input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--border-color);' +
      'border-radius:10px;background:transparent;color:var(--text-main);font-size:14px}\n' +
      '.jd-lyrics-sheet__input:focus{outline:none;border-color:var(--text-main)}\n' +
      '.jd-lyrics-sheet__actions{display:flex;gap:10px;margin-top:18px}\n' +
      '.jd-lyrics-sheet__btn{flex:1;padding:12px 0;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer}\n' +
      '.jd-lyrics-sheet__btn--cancel{background:transparent;border:1px solid var(--border-color);color:var(--text-main)}\n' +
      '.jd-lyrics-sheet__btn--go{background:var(--text-main);border:1px solid var(--text-main);color:var(--modal-bg)}\n' +
      '.jd-lyrics-sheet__btn:active{transform:scale(.98)}\n';
    document.head.appendChild(st);
  } catch (_) {}
}

var SVG_MUSIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
var SVG_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
var SVG_SPK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------- lyrics card ---------- */
function buildCard(artist, title) {
  var card = document.createElement('div');
  card.className = 'jd-lyrics-card is-loading';
  card.setAttribute('data-jd-lyrics', '1');
  card.innerHTML =
    '<div class="jd-lyrics-card__head">' + SVG_MUSIC +
      '<div><div class="jd-lyrics-card__title">' + esc(title || 'Lyrics') + '</div>' +
      '<div class="jd-lyrics-card__artist">' + esc(artist || 'Unknown artist') + '</div></div>' +
    '</div>' +
    '<div class="jd-lyrics-card__body">Loading lyrics&hellip;</div>' +
    '<div class="jd-lyrics-card__foot">' +
      '<button type="button" class="jd-lyrics-card__btn" data-act="copy">' + SVG_COPY + '<span>Copy</span></button>' +
      '<button type="button" class="jd-lyrics-card__btn" data-act="read">' + SVG_SPK + '<span>Read aloud</span></button>' +
    '</div>' +
    '<div class="jd-lyrics-card__via">via lyrics.ovh</div>';
  return card;
}

function wireCard(card, lyricsText) {
  try {
    var body = card.querySelector('.jd-lyrics-card__body');
    var btns = card.querySelectorAll('.jd-lyrics-card__btn');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.getAttribute('data-act');
        try {
          if (act === 'copy') {
            var done = function () { toast('Lyrics copied'); };
            var clip = window.navigator && window.navigator.clipboard;
            if (clip && typeof clip.writeText === 'function') {
              clip.writeText(lyricsText).then(done, function () { toast('Copy failed'); });
            } else { toast('Copy not available'); }
          } else if (act === 'read') {
            if (typeof window.speakSmartVoice === 'function') {
              window.speakSmartVoice(lyricsText);
            } else { toast('Read aloud not available'); }
          }
        } catch (_) {}
      });
    });
    if (body) { /* keep textContent to avoid HTML injection from lyrics API */ }
  } catch (_) {}
}

function fillCard(card, ok, text) {
  try {
    card.classList.remove('is-loading');
    var body = card.querySelector('.jd-lyrics-card__body');
    if (body) {
      if (ok) { body.textContent = text; }
      else { body.textContent = 'Lyrics not found — check the spelling of the artist/title.'; }
    }
    wireCard(card, ok ? text : '');
  } catch (_) {}
}

function fetchLyrics(artist, title) {
  var url = 'https://api.lyrics.ovh/v1/' +
    encodeURIComponent(String(artist || '').trim()) + '/' +
    encodeURIComponent(String(title || '').trim());
  return window.fetch(url, { method: 'GET' }).then(function (res) {
    if (!res || !res.ok) throw new Error('lyrics-http-' + (res && res.status));
    return res.json();
  }).then(function (data) {
    if (!data || typeof data.lyrics !== 'string' || !data.lyrics.trim()) throw new Error('lyrics-empty');
    return data.lyrics.trim();
  });
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

/* ---------- attach the card once the assistant message settles ---------- */
function attachWhenReady(artist, title) {
  try {
    artist = String(artist || '').trim();
    title = String(title || '').trim();
    if (!artist || !title) return;
    ensureCss();
    var tries = 0, lastLen = -1, stable = 0;
    var timer = setInterval(function () {
      try {
        tries++;
        var bots = document.querySelectorAll('#chatBox .msg.bot');
        var msg = bots && bots.length ? bots[bots.length - 1] : null;
        if (!msg || msg.querySelector('[data-jd-lyrics]')) {
          if (!msg && tries < 25) return; /* keep waiting for the message */
          clearInterval(timer);
          return;
        }
        if (msg.querySelector('.cursor,.typing,.streaming-cursor,.jd-stream-cursor')) { stable = 0; lastLen = -1; return; }
        var len = (msg.textContent || '').length;
        if (len === lastLen && len > 0) { stable++; } else { stable = 0; }
        lastLen = len;
        if (stable >= 2 || tries >= 25) {
          clearInterval(timer);
          if (msg.querySelector('[data-jd-lyrics]')) return;
          var card = buildCard(artist, title);
          try { msg.appendChild(card); } catch (_) { return; }
          scrubLeftovers(msg);
          fetchLyrics(artist, title).then(
            function (lyrics) { fillCard(card, true, lyrics); },
            function () { fillCard(card, false, ''); }
          );
        }
      } catch (_) { try { clearInterval(timer); } catch (_) {} }
    }, 200);
  } catch (_) {}
}

/* ---------- stream tap: strip markers, remember the payload ---------- */
function tapResponse(res, onLyrics, onDone) {
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
              while ((m = LYRICS_MARK_RE.exec(rest))) {
                cleaned += rest.slice(0, m.index);
                if (onLyrics) { try { onLyrics(m[1], m[2]); } catch (_) {} }
                rest = rest.slice(m.index + m[0].length);
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
            var hold = 120; /* tail holdback for split markers */
            var scan = buf.length > hold ? buf.slice(0, buf.length - hold) : '';
            var tail = buf.length > hold ? buf.slice(buf.length - hold) : buf;
            var rest2 = scan;
            while ((mm = LYRICS_MARK_RE.exec(rest2))) {
              out2 += rest2.slice(0, mm.index);
              if (onLyrics) { try { onLyrics(mm[1], mm[2]); } catch (_) {} }
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

/* ---------- (+) sheet row + bottom-sheet dialog ---------- */
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

function openLyricsDialog() {
  try {
    ensureCss();
    if (document.querySelector('.jd-lyrics-sheet')) return;
    var sheet = document.createElement('div');
    sheet.className = 'jd-lyrics-sheet';
    sheet.innerHTML =
      '<div class="jd-lyrics-sheet__bg"></div>' +
      '<div class="jd-lyrics-sheet__panel" role="dialog" aria-label="Get song lyrics">' +
        '<div class="jd-lyrics-sheet__grab"></div>' +
        '<div class="jd-lyrics-sheet__h">Song lyrics</div>' +
        '<div class="jd-lyrics-sheet__sub">The AI will fetch the lyrics and show them as a card.</div>' +
        '<label class="jd-lyrics-sheet__label" for="jdLyricsTitle">Song title</label>' +
        '<input id="jdLyricsTitle" class="jd-lyrics-sheet__input" type="text" placeholder="e.g. Tahanan" autocomplete="off">' +
        '<label class="jd-lyrics-sheet__label" for="jdLyricsArtist">Artist</label>' +
        '<input id="jdLyricsArtist" class="jd-lyrics-sheet__input" type="text" placeholder="e.g. El Manu" autocomplete="off">' +
        '<div class="jd-lyrics-sheet__actions">' +
          '<button type="button" class="jd-lyrics-sheet__btn jd-lyrics-sheet__btn--cancel">Cancel</button>' +
          '<button type="button" class="jd-lyrics-sheet__btn jd-lyrics-sheet__btn--go">Get lyrics</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(sheet);
    function close() { try { sheet.remove(); } catch (_) {} }
    sheet.querySelector('.jd-lyrics-sheet__bg').addEventListener('click', close);
    sheet.querySelector('.jd-lyrics-sheet__btn--cancel').addEventListener('click', close);
    sheet.querySelector('.jd-lyrics-sheet__btn--go').addEventListener('click', function () {
      var t = '', a = '';
      try {
        t = sheet.querySelector('#jdLyricsTitle').value.trim();
        a = sheet.querySelector('#jdLyricsArtist').value.trim();
      } catch (_) {}
      if (!t) { toast('Enter a song title'); return; }
      if (!a) { toast('Enter the artist'); return; }
      close();
      sendThroughPipeline('Lyrics ng "' + t + '" by ' + a);
    });
    try { sheet.querySelector('#jdLyricsTitle').focus({ preventScroll: true }); } catch (_) {}
  } catch (_) {}
}

function injectSheetRow() {
  try {
    var sheet = document.getElementById('composerToolSheet');
    if (!sheet) return;
    if (sheet.querySelector('[data-prompt-source="lyrics"]')) return; /* once */
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'prompt-bar__row';
    row.setAttribute('role', 'option');
    row.setAttribute('data-prompt-source', 'lyrics');
    row.innerHTML =
      '<span class="prompt-bar__row-icon">' + SVG_MUSIC + '</span>' +
      '<span class="prompt-bar__row-name">Lyrics</span>' +
      '<span class="prompt-bar__row-desc">Get song lyrics</span>';
    row.addEventListener('mousedown', function (e) { try { e.preventDefault(); } catch (_) {} });
    row.addEventListener('click', function () {
      try {
        sheet.hidden = true; /* close the (+) sheet */
        openLyricsDialog();
      } catch (_) {}
    });
    try { sheet.insertBefore(row, sheet.firstChild); }
    catch (_) { try { sheet.appendChild(row); } catch (_) {} }
  } catch (_) {}
}

/* ---------- fetch wrap ---------- */
function install() {
  if (typeof window.fetch !== 'function') return;
  if (window.fetch.__jdLyrics) return;
  /* NOTE: kept unbound (not .bind(window)) so sibling __jd* marker
     properties survive on the function object for the chain below. */
  var origFetch = window.fetch;
  var wrapped = function (input, init) {
    var isChat = false;
    var pending = null;
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
            pers.customInstructions = (cur ? cur + '\n\n' : '') + lyricsBlock();
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
          function (artist, title) {
            if (pending === null) pending = { artist: artist, title: title }; /* first marker wins */
          },
          function () {
            if (pending !== null) {
              var q = pending;
              pending = null;
              setTimeout(function () { attachWhenReady(q.artist, q.title); }, 150);
            }
          });
      });
    }
    return p;
  };
  wrapped.__jdLyrics = true;
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
  injectSheetRow();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAll, { once: true });
} else {
  installAll();
}
setTimeout(installAll, 1500);
setTimeout(injectSheetRow, 3000);
})();
