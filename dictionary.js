/* =========================================================
   JepongDevxyz AI — Merriam-Webster Dictionary (runtime patch)
   Loaded by agent.js (additive only).

   - Opened from the composer (+) sheet -> "Dictionary".
   - Bottom sheet with word search.
   - Primary: Merriam-Webster Collegiate API
     (https://www.dictionaryapi.com — free key, 1000 lookups/day).
     The key is saved on the phone (localStorage); a setup row
     with a link is shown until a key is saved.
   - Fallback: free dictionaryapi.dev (no key) so the dictionary
     works immediately even before she registers a MW key.
   - Shows headword, pronunciation, part of speech, definitions.
   - Reads the pronunciation aloud (MW audio when available,
     app TTS as fallback) — like the old Dictate feature.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdDictionaryLoaded) return;
  window.__jdDictionaryLoaded = true;

  var MW_KEY_LS = 'jd_mw_api_key';
  var MW_ENDPOINT = 'https://www.dictionaryapi.com/api/v3/references/collegiate/json/';
  var MW_AUDIO_BASE = 'https://media.merriam-webster.com/audio/prons/en/us/mp3/';
  var FREE_ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

  /* ---------------- utils ---------------- */
  function esc(s) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function getKey() {
    try { return (localStorage.getItem(MW_KEY_LS) || '').trim(); } catch (e) { return ''; }
  }
  function setKey(k) {
    try { localStorage.setItem(MW_KEY_LS, String(k || '').trim()); } catch (e) {}
  }
  function speakWord(word, audioUrl) {
    if (audioUrl) {
      try {
        var a = new Audio(audioUrl);
        a.play().catch(function () { fallbackSpeak(word); });
        return;
      } catch (e) {}
    }
    fallbackSpeak(word);
  }
  function fallbackSpeak(word) {
    try {
      if (typeof window.speakRawText === 'function') { window.speakRawText(word, true); return; }
    } catch (e) {}
    try {
      var u = new SpeechSynthesisUtterance(String(word));
      u.lang = 'en-US';
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e2) {}
  }

  /* ---------------- styles ---------------- */
  var CSS = [
    '.jd-mw-backdrop{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;animation:jdMwFadeIn .18s ease-out}',
    '@keyframes jdMwFadeIn{from{opacity:0}}',
    '.jd-mw-sheet{width:100%;max-width:560px;background:#1c1c21;color:#f5f5f5;border-radius:24px 24px 0 0;padding:10px 20px calc(20px + env(safe-area-inset-bottom,0px));animation:jdMwSheetUp .22s ease-out;max-height:78vh;overflow-y:auto}',
    '@keyframes jdMwSheetUp{from{transform:translateY(40px);opacity:.6}}',
    '.jd-mw-grab{width:36px;height:4px;border-radius:999px;background:rgba(255,255,255,.25);margin:2px auto 10px}',
    '.jd-mw-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}',
    '.jd-mw-title{font-size:17px;font-weight:700;display:flex;align-items:center;gap:8px}',
    '.jd-mw-title svg{width:20px;height:20px;color:#b39dff}',
    '.jd-mw-close{background:none;border:0;color:inherit;font-size:24px;cursor:pointer;padding:6px;opacity:.7;line-height:1}',
    '.jd-mw-searchrow{display:flex;gap:8px;margin-bottom:10px;width:100%;box-sizing:border-box}',
    '.jd-mw-input{flex:1;min-width:0;box-sizing:border-box;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);border-radius:14px;color:inherit;font-size:16px;padding:12px 14px;outline:none}',
    '.jd-mw-input:focus{border-color:#7c5cff}',
    '.jd-mw-btn{flex:none;box-sizing:border-box;background:#7c5cff;border:0;color:#fff;font-size:15px;font-weight:600;border-radius:14px;padding:0 18px;cursor:pointer}',
    '.jd-mw-btn:active{transform:scale(.97)}',
    '.jd-mw-btn.ghost{background:rgba(255,255,255,.1)}',
    '.jd-mw-keyrow{background:rgba(124,92,255,.1);border:1px solid rgba(124,92,255,.35);border-radius:14px;padding:12px;margin-bottom:10px;font-size:13px;line-height:1.5}',
    '.jd-mw-keyrow a{color:#b39dff}',
    '.jd-mw-keyrow .jd-mw-searchrow{margin:8px 0 0}',
    '.jd-mw-keyrow .jd-mw-input{font-size:14px;padding:10px 12px}',
    '.jd-mw-src{font-size:11px;opacity:.5;margin-bottom:8px}',
    '.jd-mw-word{font-size:28px;font-weight:700;margin:4px 0 2px}',
    '.jd-mw-phon{font-size:15px;opacity:.65;margin-bottom:4px}',
    '.jd-mw-pos{font-size:12px;font-weight:700;color:#b39dff;text-transform:uppercase;letter-spacing:.05em;margin:14px 0 6px}',
    '.jd-mw-def{font-size:15px;line-height:1.65;opacity:.92;margin-bottom:6px;padding-left:18px;position:relative}',
    '.jd-mw-def:before{content:"•";position:absolute;left:4px;opacity:.5}',
    '.jd-mw-say{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:16px;padding:15px;border:0;border-radius:16px;background:#7c5cff;color:#fff;font-size:16px;font-weight:600;cursor:pointer}',
    '.jd-mw-say svg{width:20px;height:20px}',
    '.jd-mw-say:active{transform:scale(.98)}',
    '.jd-mw-loading,.jd-mw-empty{text-align:center;opacity:.6;font-size:14px;padding:24px 0;line-height:1.6}',
    '.jd-mw-suggest{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}',
    '.jd-mw-suggest button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:inherit;border-radius:999px;padding:8px 14px;font-size:14px;cursor:pointer}',
    'body.theme-light .jd-mw-sheet{background:#fff;color:#18181b}',
    'body.theme-light .jd-mw-grab{background:rgba(0,0,0,.2)}',
    'body.theme-light .jd-mw-input{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.12)}',
    'body.theme-light .jd-mw-btn.ghost{background:rgba(0,0,0,.07)}',
    'body.theme-light .jd-mw-suggest button{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.1)}'
  ].join('\n');
  function injectCSS() {
    if (document.getElementById('jdMwCss')) return;
    var st = document.createElement('style');
    st.id = 'jdMwCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------- MW parsing ---------------- */
  function mwAudioSubdir(filename) {
    if (/^bix/i.test(filename)) return 'bix';
    if (/^gg/i.test(filename)) return 'gg';
    if (/^[^a-z]/i.test(filename)) return 'number';
    return filename.charAt(0).toLowerCase();
  }
  function mwAudioUrl(audio) {
    if (!audio) return '';
    return MW_AUDIO_BASE + mwAudioSubdir(audio) + '/' + audio + '.mp3';
  }
  function cleanHw(hw) {
    return String(hw || '').replace(/\*/g, '');
  }
  function parseMW(arr) {
    // Returns {word, phonetic, audio, pos, defs[]} or {suggestions[]} or null.
    if (!Array.isArray(arr) || !arr.length) return null;
    if (typeof arr[0] === 'string') return { suggestions: arr.slice(0, 8) };
    var out = [];
    for (var i = 0; i < arr.length && out.length < 3; i++) {
      var e = arr[i] || {};
      var hwi = e.hwi || {};
      var prs = (hwi.prs || [])[0] || {};
      var sound = (prs.sound || {}).audio || '';
      out.push({
        word: cleanHw(hwi.hw || ''),
        phonetic: prs.mw || '',
        audio: mwAudioUrl(sound),
        pos: e.fl || '',
        defs: Array.isArray(e.shortdef) ? e.shortdef.slice(0, 5) : []
      });
    }
    return out.length ? { entries: out } : null;
  }
  function parseFree(arr) {
    if (!Array.isArray(arr) || !arr.length) return null;
    var e = arr[0] || {};
    var audio = '';
    var phon = e.phonetic || '';
    (e.phonetics || []).forEach(function (p) {
      if (!phon && p.text) phon = p.text;
      if (!audio && p.audio) audio = p.audio;
    });
    var defs = [];
    var pos = '';
    (e.meanings || []).slice(0, 3).forEach(function (m) {
      if (!pos && m.partOfSpeech) pos = m.partOfSpeech;
      (m.definitions || []).slice(0, 3).forEach(function (d) {
        if (d.definition && defs.length < 6) defs.push(d.definition);
      });
    });
    return { entries: [{ word: e.word || '', phonetic: phon, audio: audio, pos: pos, defs: defs }] };
  }

  /* ---------------- lookup ----------------
     Order: (1) server proxy /api/dictionary (uses the Vercel
     MW_API_KEY, key never leaves the server); (2) localStorage
     MW key -> direct MW call; (3) free dictionaryapi.dev. */
  var state = { word: '', audioUrl: '', source: '' };
  var serverHasKey = null; // null = unknown, checked on open
  function checkServerKey() {
    if (serverHasKey !== null) return Promise.resolve(serverHasKey);
    return fetch('/api/dictionary').then(function (r) {
      return r.ok ? r.json() : { hasKey: false };
    }).then(function (j) {
      serverHasKey = !!(j && j.hasKey);
      return serverHasKey;
    }).catch(function () {
      serverHasKey = false;
      return false;
    });
  }
  function lookup(word) {
    word = String(word || '').trim().toLowerCase();
    if (!word) return;
    state = { word: word, audioUrl: '', source: '' };
    renderLoading(word);
    // 1) Server proxy first.
    fetch('/api/dictionary?word=' + encodeURIComponent(word)).then(function (r) {
      if (!r.ok) throw new Error('server-' + r.status);
      return r.json();
    }).then(function (j) {
      var parsed = parseMW(j && j.data);
      if (!parsed) throw new Error('empty');
      if (parsed.suggestions) { renderSuggestions(word, parsed.suggestions); return; }
      useEntries(word, parsed.entries, 'Merriam-Webster');
    }).catch(function () {
      // 2) Local key -> direct MW; 3) free fallback.
      var key = getKey();
      var url = key
        ? MW_ENDPOINT + encodeURIComponent(word) + '?key=' + encodeURIComponent(key)
        : FREE_ENDPOINT + encodeURIComponent(word);
      fetch(url).then(function (r2) {
        if (!r2.ok) throw new Error('http-' + r2.status);
        return r2.json();
      }).then(function (data) {
        var parsed = key ? parseMW(data) : parseFree(data);
        if (!parsed) throw new Error('empty');
        if (parsed.suggestions) { renderSuggestions(word, parsed.suggestions); return; }
        useEntries(word, parsed.entries, key ? 'Merriam-Webster' : 'Free Dictionary API');
      }).catch(function () {
        renderError(word, !!key);
      });
    });
  }
  function useEntries(word, entries, source) {
    var first = entries[0];
    state.audioUrl = first.audio || '';
    state.source = source;
    renderEntries(entries, source);
    // Read the pronunciation aloud, like the old Dictate feature.
    speakWord(first.word || word, first.audio || '');
  }

  /* ---------------- rendering ---------------- */
  var BOOK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>';
  var SPK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';

  function sheetHTML() {
    var key = getKey();
    return '' +
      '<div class="jd-mw-grab"></div>' +
      '<div class="jd-mw-head"><div class="jd-mw-title">' + BOOK_SVG + '<span>Dictionary</span></div>' +
      '<button type="button" class="jd-mw-close" aria-label="Close">×</button></div>' +
      '<div class="jd-mw-searchrow">' +
      '<input type="text" class="jd-mw-input" id="jdMwInput" placeholder="Type a word…" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search">' +
      '<button type="button" class="jd-mw-btn" id="jdMwGo">Search</button></div>' +
      '<div class="jd-mw-keyrow" id="jdMwKeyRow">' +
      (key ? '<div class="jd-mw-src" style="margin-bottom:8px">✓ Merriam-Webster key saved. <a href="https://www.dictionaryapi.com/" target="_blank" rel="noopener">dictionaryapi.com</a></div>'
           : 'Using the free dictionary. For <b>Merriam-Webster</b>, ' +
             '<a href="https://www.dictionaryapi.com/" target="_blank" rel="noopener">get a free API key</a> ' +
             '(1000 lookups/day), then paste it here:') +
      '<div class="jd-mw-searchrow"><input type="text" class="jd-mw-input" id="jdMwKeyInput" placeholder="MW API key" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" value="' + esc(key) + '">' +
      '<button type="button" class="jd-mw-btn ghost" id="jdMwKeySave">Save</button></div>' +
      '<div class="jd-mw-src">Tip: you can also set the MW_API_KEY env var on Vercel — then no key is needed here.</div></div>' +
      '<div id="jdMwBody"><div class="jd-mw-empty">Type a word above to look it up.</div></div>';
  }
  function open(initialWord) {
    close();
    // Force-close the composer (+) sheet — it must not stay open
    // behind the Dictionary (bug reported 2026-10-03).
    try {
      var sheet = document.getElementById('composerToolSheet');
      if (sheet) sheet.hidden = true;
      var plus = document.getElementById('composerPlusBtn');
      if (plus) { plus.removeAttribute('data-on'); plus.setAttribute('aria-expanded', 'false'); }
      if (typeof window.closeComposerTools === 'function') window.closeComposerTools();
    } catch (e) {}
    injectCSS();
    var bd = document.createElement('div');
    bd.className = 'jd-mw-backdrop';
    bd.id = 'jdMwBackdrop';
    bd.innerHTML = '<div class="jd-mw-sheet" role="dialog" aria-label="Dictionary">' + sheetHTML() + '</div>';
    document.body.appendChild(bd);
    bd.addEventListener('pointerdown', function (e) { if (e.target === bd) close(); });
    bd.querySelector('.jd-mw-close').addEventListener('click', close);
    var input = bd.querySelector('#jdMwInput');
    var go = function () { lookup(input.value); };
    bd.querySelector('#jdMwGo').addEventListener('click', go);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    var keySave = bd.querySelector('#jdMwKeySave');
    if (keySave) {
      keySave.addEventListener('click', function () {
        var k = bd.querySelector('#jdMwKeyInput').value;
        setKey(k);
        if (k.trim()) {
          try { if (window.showModernToast) window.showModernToast('Merriam-Webster key saved'); } catch (e) {}
          open(input.value); // re-open to hide the key row
        }
      });
    }
    document.addEventListener('keydown', onEsc);
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) {} }, 250);
    // If the server already has a MW key, hide the manual key row.
    checkServerKey().then(function (has) {
      if (has) {
        var kr = document.getElementById('jdMwKeyRow');
        if (kr) kr.style.display = 'none';
      }
    });
    if (initialWord) { input.value = initialWord; lookup(initialWord); }
  }
  function onEsc(e) { if (e.key === 'Escape') close(); }
  function close() {
    var bd = document.getElementById('jdMwBackdrop');
    if (bd) bd.remove();
    document.removeEventListener('keydown', onEsc);
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  function bodyEl() { return document.getElementById('jdMwBody'); }
  function renderLoading(word) {
    var b = bodyEl();
    if (b) b.innerHTML = '<div class="jd-mw-loading">Looking up &ldquo;' + esc(word) + '&rdquo;…</div>';
  }
  function renderEntries(entries, source) {
    var b = bodyEl();
    if (!b) return;
    var html = '<div class="jd-mw-src">Source: ' + esc(source) + '</div>';
    entries.forEach(function (en) {
      html += '<div class="jd-mw-word">' + esc(en.word) + '</div>';
      if (en.phonetic) html += '<div class="jd-mw-phon">/' + esc(en.phonetic) + '/</div>';
      if (en.pos) html += '<div class="jd-mw-pos">' + esc(en.pos) + '</div>';
      (en.defs || []).forEach(function (d) {
        html += '<div class="jd-mw-def">' + esc(d) + '</div>';
      });
    });
    html += '<button type="button" class="jd-mw-say" id="jdMwSay">' + SPK_SVG +
      '<span>Pakinggan ang pronunciation</span></button>';
    b.innerHTML = html;
    var say = document.getElementById('jdMwSay');
    if (say) say.addEventListener('click', function () { speakWord(state.word, state.audioUrl); });
  }
  function renderSuggestions(word, suggestions) {
    var b = bodyEl();
    if (!b) return;
    b.innerHTML = '<div class="jd-mw-empty">Walang nakita para sa &ldquo;' + esc(word) +
      '&rdquo;. Baka ibig mong sabihin:</div><div class="jd-mw-suggest">' +
      suggestions.map(function (s) {
        return '<button type="button" data-w="' + esc(s) + '">' + esc(s) + '</button>';
      }).join('') + '</div>';
    b.querySelectorAll('.jd-mw-suggest button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var inp = document.getElementById('jdMwInput');
        if (inp) inp.value = btn.getAttribute('data-w');
        lookup(btn.getAttribute('data-w'));
      });
    });
  }
  function renderError(word, usedMW) {
    var b = bodyEl();
    if (!b) return;
    b.innerHTML = '<div class="jd-mw-empty">Walang nahanap na definition para sa &ldquo;' + esc(word) + '&rdquo;.' +
      (usedMW ? '<br>Check kung tama ang API key mo.' : '') + '</div>';
    speakWord(word, '');
  }

  /* ---------------- boot ---------------- */
  injectCSS();
  window.__jdDictionary = {
    open: open,
    close: close,
    lookup: lookup,
    getKey: getKey,
    setKey: setKey,
    parseMW: parseMW,
    mwAudioUrl: mwAudioUrl
  };
})();
