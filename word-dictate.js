/* =========================================================
   JepongDevxyz AI — word tools + dictionary + reactions
   Runtime patch loaded by agent.js (additive only).

   1) Tap-and-hold a WORD in an AI response -> floating menu:
      Reply | Copy | Select | Dictate (+ emoji reaction row).
      Native text selection is suppressed (user-select:none) so
      only OUR menu appears — no Android system popup.
   2) Dictate -> dictionary bottom sheet (Merriam-Webster via
      server proxy, free dictionaryapi.dev fallback) with phonetic
      + definition, and it READS the word aloud so the user learns
      the correct pronunciation (API audio when available, app
      TTS as fallback).
   3) Message reactions like the Muse app: pick an emoji, it
      sticks to the message as a chip; tap the chip to remove.
      Persisted per session in localStorage.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdWordDictateLoaded) return;
  window.__jdWordDictateLoaded = true;

  /* ---------------- utils ---------------- */
  function esc(s) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function toast(msg) {
    try {
      if (typeof window.showModernToast === 'function') { window.showModernToast(msg); return; }
      if (typeof window.showToast === 'function') { window.showToast(msg); return; }
    } catch (e) {}
    try {
      var t = document.createElement('div');
      t.textContent = String(msg);
      t.style.cssText = 'position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#323236;color:#fff;padding:10px 16px;border-radius:999px;font-size:14px;z-index:12000;box-shadow:0 8px 24px rgba(0,0,0,.4)';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 1800);
    } catch (e2) {}
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
    '.msg.bot{position:relative;-webkit-touch-callout:none;user-select:none;-webkit-user-select:none}',
    '.msg.bot.jd-allow-select,.msg.bot.jd-allow-select *{user-select:text!important;-webkit-user-select:text!important}',
    '.jd-wordmenu{position:fixed;z-index:9999;min-width:210px;max-width:250px;background:#232328;color:#f5f5f5;border-radius:18px;box-shadow:0 18px 45px -12px rgba(0,0,0,.55),0 2px 6px rgba(0,0,0,.2);padding:8px;animation:jdWordMenuPop .16s ease-out}',
    '@keyframes jdWordMenuPop{from{opacity:0;transform:scale(.94) translateY(4px)}}',
    '.jd-wordmenu__reacts{display:flex;gap:2px;justify-content:space-between;padding:4px 2px 8px;border-bottom:1px solid rgba(255,255,255,.09);margin-bottom:4px}',
    '.jd-wordmenu__react{font-size:22px;line-height:1;background:none;border:0;cursor:pointer;padding:7px 5px;border-radius:12px}',
    '.jd-wordmenu__react[data-on]{background:rgba(255,255,255,.14)}',
    '.jd-wordmenu__word{padding:6px 12px 6px;font-size:12px;opacity:.55;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}',
    '.jd-wordmenu__row{display:flex;align-items:center;gap:12px;width:100%;padding:0 12px;height:46px;background:none;border:0;border-radius:12px;color:inherit;font-size:15px;font-weight:500;cursor:pointer;text-align:left}',
    '.jd-wordmenu__row:active{background:rgba(255,255,255,.09)}',
    '.jd-wordmenu__row svg{width:20px;height:20px;flex:none;opacity:.85}',
    'body.theme-light .jd-wordmenu{background:#fff;color:#18181b;box-shadow:0 18px 45px -12px rgba(20,20,40,.25),0 2px 6px rgba(0,0,0,.1)}',
    'body.theme-light .jd-wordmenu__reacts{border-bottom-color:rgba(0,0,0,.08)}',
    'body.theme-light .jd-wordmenu__react[data-on]{background:rgba(0,0,0,.07)}',
    'body.theme-light .jd-wordmenu__row:active{background:rgba(0,0,0,.06)}',
    '.jd-dict-backdrop{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center;animation:jdFadeIn .18s ease-out}',
    '@keyframes jdFadeIn{from{opacity:0}}',
    '.jd-dict-sheet{width:100%;max-width:520px;background:#1c1c21;color:#f5f5f5;border-radius:24px 24px 0 0;padding:10px 20px calc(20px + env(safe-area-inset-bottom,0px));animation:jdSheetUp .22s ease-out;max-height:72vh;overflow-y:auto}',
    '@keyframes jdSheetUp{from{transform:translateY(40px);opacity:.6}}',
    '.jd-dict-grab{width:36px;height:4px;border-radius:999px;background:rgba(255,255,255,.25);margin:2px auto 10px}',
    '.jd-dict-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
    '.jd-dict-word{font-size:30px;font-weight:700;margin:2px 0}',
    '.jd-dict-phon{font-size:15px;opacity:.6;margin-bottom:6px}',
    '.jd-dict-close{background:none;border:0;color:inherit;font-size:22px;cursor:pointer;padding:6px;opacity:.7;line-height:1}',
    '.jd-dict-pos{font-size:12px;font-weight:700;color:#b39dff;text-transform:uppercase;letter-spacing:.05em;margin:12px 0 4px}',
    '.jd-dict-def{font-size:15px;line-height:1.6;opacity:.92}',
    '.jd-dict-say{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:18px;padding:15px;border:0;border-radius:16px;background:#7c5cff;color:#fff;font-size:16px;font-weight:600;cursor:pointer}',
    '.jd-dict-say svg{width:20px;height:20px}',
    '.jd-dict-say:active{transform:scale(.98)}',
    'body.theme-light .jd-dict-sheet{background:#fff;color:#18181b}',
    'body.theme-light .jd-dict-grab{background:rgba(0,0,0,.2)}',
    '.jd-reaction-chip{position:absolute;right:10px;bottom:-12px;background:#2c2c33;border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:3px 9px;font-size:15px;line-height:1.4;box-shadow:0 4px 12px rgba(0,0,0,.35);cursor:pointer;z-index:3}',
    'body.theme-light .jd-reaction-chip{background:#fff;border-color:rgba(0,0,0,.1)}'
  ].join('\n');
  function injectCSS() {
    if (document.getElementById('jdWordDictateCss')) return;
    var st = document.createElement('style');
    st.id = 'jdWordDictateCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---------------- word detection ---------------- */
  var WORD_CHAR = /[\p{L}\p{N}'’\-]/u;
  // Pure: expand offset to word bounds. Returns {word,start,end} or null.
  function expandWord(text, offset) {
    text = String(text == null ? '' : text);
    if (!text) return null;
    var i = Math.max(0, Math.min(offset, text.length));
    // If cursor sits on a non-word char, try the char before it.
    if (i < text.length && !WORD_CHAR.test(text[i])) {
      if (i > 0 && WORD_CHAR.test(text[i - 1])) i = i - 1;
      else return null;
    }
    if (i >= text.length || !WORD_CHAR.test(text[i])) return null;
    var s = i, e = i;
    while (s > 0 && WORD_CHAR.test(text[s - 1])) s--;
    while (e < text.length && WORD_CHAR.test(text[e])) e++;
    var word = text.slice(s, e).replace(/^['’\-]+|['’\-]+$/g, '');
    if (word.length < 2) return null;
    // Recompute bounds after trimming quotes/dashes.
    var ts = text.indexOf(word, s);
    if (ts < 0) return null;
    return { word: word, start: ts, end: ts + word.length };
  }
  function wordAtPoint(x, y) {
    var range = null;
    try {
      if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(x, y);
      else if (document.caretPositionFromPoint) {
        var pos = document.caretPositionFromPoint(x, y);
        if (pos && pos.offsetNode) {
          range = document.createRange();
          range.setStart(pos.offsetNode, pos.offset);
          range.collapse(true);
        }
      }
    } catch (e) { return null; }
    if (!range || !range.startContainer || range.startContainer.nodeType !== 3) return null;
    // Skip UI chrome inside the bubble (action buttons etc.)
    var el = range.startContainer.parentElement;
    if (el && el.closest && el.closest('.bot-actions,button')) return null;
    var hit = expandWord(range.startContainer.textContent, range.startOffset);
    if (!hit) return null;
    hit.node = range.startContainer;
    return hit;
  }

  /* ---------------- reactions ---------------- */
  var LSKEY = 'jd_msg_reactions';
  var EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
  function getStore() {
    try { return JSON.parse(localStorage.getItem(LSKEY) || '{}'); } catch (e) { return {}; }
  }
  function saveStore(o) {
    try { localStorage.setItem(LSKEY, JSON.stringify(o)); } catch (e) {}
  }
  function sessionId() {
    try { return localStorage.getItem('jepong_last_session_id') || 'default'; } catch (e) { return 'default'; }
  }
  function msgKey(msgEl) { return msgEl.getAttribute('data-message-index') || ''; }
  function getReaction(msgEl) {
    var store = getStore();
    return (store[sessionId()] || {})[msgKey(msgEl)] || '';
  }
  function toggleReaction(msgEl, emoji) {
    var store = getStore();
    var sid = sessionId();
    store[sid] = store[sid] || {};
    var k = msgKey(msgEl);
    if (store[sid][k] === emoji) delete store[sid][k];
    else store[sid][k] = emoji;
    saveStore(store);
    renderReaction(msgEl);
  }
  function renderReaction(msgEl) {
    if (!msgEl || !msgEl.getAttribute) return;
    var emoji = getReaction(msgEl);
    var chip = msgEl.querySelector(':scope > .jd-reaction-chip');
    if (emoji) {
      if (!chip) {
        chip = document.createElement('span');
        chip.className = 'jd-reaction-chip';
        chip.title = 'Tap to remove reaction';
        msgEl.appendChild(chip);
      }
      chip.textContent = emoji;
      chip.onclick = function (ev) { ev.stopPropagation(); toggleReaction(msgEl, emoji); };
    } else if (chip) {
      chip.remove();
    }
  }
  function reapplyReactions(root) {
    (root.querySelectorAll('.msg.bot')).forEach(renderReaction);
  }

  /* ---------------- floating menu ---------------- */
  var openMenu = null;
  var ICONS = {
    reply: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>',
    dictate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
  };
  function closeMenu() {
    if (openMenu) { openMenu.remove(); openMenu = null; }
    document.removeEventListener('pointerdown', onDocDown, true);
  }
  function onDocDown(e) {
    if (openMenu && !openMenu.contains(e.target)) closeMenu();
  }
  function showMenu(x, y, ctx) {
    closeMenu();
    var menu = document.createElement('div');
    menu.className = 'jd-wordmenu';
    menu.setAttribute('role', 'menu');
    var current = ctx.msgEl ? getReaction(ctx.msgEl) : '';
    var html = '<div class="jd-wordmenu__reacts">' + EMOJIS.map(function (em) {
      return '<button type="button" class="jd-wordmenu__react" data-emoji="' + em + '"' +
        (current === em ? ' data-on="1"' : '') + '>' + em + '</button>';
    }).join('') + '</div>';
    if (ctx.word) {
      html += '<div class="jd-wordmenu__word">&ldquo;' + esc(ctx.word) + '&rdquo;</div>';
      html += '<button type="button" class="jd-wordmenu__row" data-act="reply">' + ICONS.reply + '<span>Reply</span></button>';
      html += '<button type="button" class="jd-wordmenu__row" data-act="copy">' + ICONS.copy + '<span>Copy</span></button>';
      html += '<button type="button" class="jd-wordmenu__row" data-act="select">' + ICONS.select + '<span>Select</span></button>';
      html += '<button type="button" class="jd-wordmenu__row" data-act="dictate">' + ICONS.dictate + '<span>Dictate</span></button>';
    }
    menu.innerHTML = html;
    document.body.appendChild(menu);
    // Clamp inside viewport, prefer below the press point.
    var w = menu.offsetWidth, h = menu.offsetHeight;
    var left = Math.max(10, Math.min(x - w / 2, window.innerWidth - w - 10));
    var top = y + 14;
    if (top + h > window.innerHeight - 10) top = Math.max(10, y - h - 14);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.addEventListener('click', function (e) {
      var rbtn = e.target.closest('.jd-wordmenu__react');
      if (rbtn && ctx.msgEl) {
        toggleReaction(ctx.msgEl, rbtn.getAttribute('data-emoji'));
        closeMenu();
        return;
      }
      var abtn = e.target.closest('.jd-wordmenu__row');
      if (!abtn) return;
      var act = abtn.getAttribute('data-act');
      closeMenu();
      runAction(act, ctx);
    });
    openMenu = menu;
    setTimeout(function () { document.addEventListener('pointerdown', onDocDown, true); }, 0);
  }

  /* ---------------- actions ---------------- */
  function runAction(act, ctx) {
    var word = ctx.word || '';
    if (act === 'copy' && word) {
      var done = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(word).then(function () { toast('Copied'); }, function () {});
          done = true;
        }
      } catch (e) {}
      if (!done) {
        try {
          var ta = document.createElement('textarea');
          ta.value = word; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); ta.remove(); toast('Copied');
        } catch (e2) {}
      }
    } else if (act === 'reply' && word) {
      var input = document.getElementById('userInput');
      if (input) {
        var q = '> "' + word + '"\n\n';
        var s = input.selectionStart || 0, e2pos = input.selectionEnd || 0;
        input.value = input.value.slice(0, s) + q + input.value.slice(e2pos);
        input.focus();
        try { input.setSelectionRange(s + q.length, s + q.length); } catch (e3) {}
        toast('Replying to "' + word + '"');
      }
    } else if (act === 'select' && ctx.node) {
      // User explicitly asked to select: temporarily allow native selection.
      var msgEl = ctx.msgEl;
      try {
        if (msgEl && msgEl.classList) msgEl.classList.add('jd-allow-select');
        var sel = window.getSelection();
        sel.removeAllRanges();
        var r = document.createRange();
        r.setStart(ctx.node, ctx.start);
        r.setEnd(ctx.node, ctx.end);
        sel.addRange(r);
      } catch (e) {}
      // Re-suppress after a few seconds so the system popup stays away.
      setTimeout(function () {
        try { if (msgEl && msgEl.classList) msgEl.classList.remove('jd-allow-select'); } catch (e2) {}
      }, 4000);
    } else if (act === 'dictate' && word) {
      openDictionary(word);
    }
  }

  /* ---------------- dictionary ---------------- */
  var dictState = { word: '', audioUrl: '' };
  function openDictionary(word) {
    closeMenu();
    closeDictionary();
    // Force-close the composer (+) sheet too (same bug as Dictionary).
    try {
      var csheet = document.getElementById('composerToolSheet');
      if (csheet) csheet.hidden = true;
      if (typeof window.closeComposerTools === 'function') window.closeComposerTools();
    } catch (e) {}
    dictState = { word: word, audioUrl: '' };
    var bd = document.createElement('div');
    bd.className = 'jd-dict-backdrop';
    bd.id = 'jdDictBackdrop';
    bd.innerHTML =
      '<div class="jd-dict-sheet" role="dialog" aria-label="Dictionary">' +
      '<div class="jd-dict-grab"></div>' +
      '<div class="jd-dict-head"><div>' +
      '<div class="jd-dict-word">' + esc(word) + '</div>' +
      '<div class="jd-dict-phon" id="jdDictPhon">…</div>' +
      '</div><button type="button" class="jd-dict-close" aria-label="Close">×</button></div>' +
      '<div id="jdDictBody"><div class="jd-dict-def" style="opacity:.6">Looking up…</div></div>' +
      '<button type="button" class="jd-dict-say" id="jdDictSay">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>' +
      '<span>Pakinggan ang pronunciation</span></button>' +
      '</div>';
    document.body.appendChild(bd);
    bd.addEventListener('pointerdown', function (e) { if (e.target === bd) closeDictionary(); });
    bd.querySelector('.jd-dict-close').addEventListener('click', closeDictionary);
    bd.querySelector('#jdDictSay').addEventListener('click', function () {
      speakWord(dictState.word, dictState.audioUrl);
    });
    lookupWord(word);
  }
  function closeDictionary() {
    var bd = document.getElementById('jdDictBackdrop');
    if (bd) bd.remove();
    try { window.speechSynthesis.cancel(); } catch (e) {}
  }
  /* Merriam-Webster support (shared key with dictionary.js: jd_mw_api_key).
     Uses MW Collegiate API when a key is saved, otherwise falls back
     to the free dictionaryapi.dev — same as the Dictionary sheet. */
  function mwAudioSubdir(filename) {
    if (/^bix/i.test(filename)) return 'bix';
    if (/^gg/i.test(filename)) return 'gg';
    if (/^[^a-z]/i.test(filename)) return 'number';
    return filename.charAt(0).toLowerCase();
  }
  function lookupWord(word) {
    var w = String(word || '').toLowerCase();
    // 1) Server proxy (Vercel MW_API_KEY) -> 2) localStorage key -> direct MW
    // -> 3) free dictionaryapi.dev. Shared with dictionary.js.
    fetch('/api/dictionary?word=' + encodeURIComponent(w)).then(function (r) {
      if (!r.ok) throw new Error('server-' + r.status);
      return r.json();
    }).then(function (j) {
      renderDictateMW(j && j.data);
    }).catch(function () {
      var mwKey = '';
      try { mwKey = (localStorage.getItem('jd_mw_api_key') || '').trim(); } catch (e) {}
      var url = mwKey
        ? 'https://www.dictionaryapi.com/api/v3/references/collegiate/json/' + encodeURIComponent(w) + '?key=' + encodeURIComponent(mwKey)
        : 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w);
      fetch(url).then(function (r2) {
        if (!r2.ok) throw new Error('not found');
        return r2.json();
      }).then(function (data) {
        if (mwKey) renderDictateMW(data);
        else renderDictateFree(data);
      }).catch(function () {
        renderDictateError();
      });
    });
  }
  function renderDictateMW(data) {
    var arr = Array.isArray(data) ? data : [];
    var e = null;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] && typeof arr[i] === 'object') { e = arr[i]; break; }
    }
    if (!e) { renderDictateError(); return; }
    var prs = (((e.hwi || {}).prs) || [])[0] || {};
    var phon = prs.mw || '';
    var snd = ((prs.sound || {}).audio) || '';
    var audio = snd ? 'https://media.merriam-webster.com/audio/prons/en/us/mp3/' + mwAudioSubdir(snd) + '/' + snd + '.mp3' : '';
    var pos = e.fl || '';
    var def = ((e.shortdef || [])[0]) || '';
    renderDictateResult(phon, audio, pos, def);
  }
  function renderDictateFree(data) {
    var entry = Array.isArray(data) ? data[0] : null;
    if (!entry) { renderDictateError(); return; }
    var phon = entry.phonetic || '';
    var audio = '';
    (entry.phonetics || []).forEach(function (p) {
      if (!phon && p.text) phon = p.text;
      if (!audio && p.audio) audio = p.audio;
    });
    var meaning = (entry.meanings || [])[0] || {};
    var def = ((meaning.definitions || [])[0] || {}).definition || '';
    var pos = meaning.partOfSpeech || '';
    renderDictateResult(phon, audio, pos, def);
  }
  function renderDictateResult(phon, audio, pos, def) {
    dictState.audioUrl = audio;
    var phonEl = document.getElementById('jdDictPhon');
    if (phonEl) phonEl.textContent = phon || '';
    var body = document.getElementById('jdDictBody');
    if (body) {
      body.innerHTML =
        (pos ? '<div class="jd-dict-pos">' + esc(pos) + '</div>' : '') +
        (def ? '<div class="jd-dict-def">' + esc(def) + '</div>'
             : '<div class="jd-dict-def" style="opacity:.6">Walang nahanap na definition.</div>');
    }
    // Read it aloud so the user learns the correct pronunciation.
    speakWord(dictState.word, audio);
  }
  function renderDictateError() {
    var body = document.getElementById('jdDictBody');
    if (body) body.innerHTML = '<div class="jd-dict-def" style="opacity:.6">Walang English definition para sa salitang ito — pakinggan pa rin ang pronunciation.</div>';
    var phonEl = document.getElementById('jdDictPhon');
    if (phonEl) phonEl.textContent = '';
    speakWord(dictState.word, '');
  }

  /* ---------------- long-press wiring ----------------
     RESTORED 2026-10-03: the tap-and-hold word popup is back per
     user correction — the system "Tap to see search results" bar
     (arrow) is suppressed via user-select:none, so only our menu
     appears. */
  var lpTimer = null, lpStart = null;
  function findChatBox() { return document.getElementById('chatBox'); }
  function clearLp() {
    if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
    lpStart = null;
  }
  function onPressStart(x, y, msgEl) {
    clearLp();
    lpStart = { x: x, y: y, msgEl: msgEl };
    lpTimer = setTimeout(function () {
      lpTimer = null;
      var s = lpStart; lpStart = null;
      if (!s) return;
      var hit = wordAtPoint(s.x, s.y);
      // Only show word menu if a word was hit; message long-press
      // is handled by reactions-v2.js (the keeper menu with Dictate)
      if (!hit || !hit.word) return;
      showMenu(s.x, s.y, {
        msgEl: s.msgEl,
        word: hit ? hit.word : '',
        node: hit ? hit.node : null,
        start: hit ? hit.start : 0,
        end: hit ? hit.end : 0
      });
    }, 450);
  }
  function onPressMove(x, y) {
    if (lpStart && lpTimer) {
      var dx = x - lpStart.x, dy = y - lpStart.y;
      if (dx * dx + dy * dy > 144) clearLp(); // moved >12px: it's a scroll
    }
  }
  function wire() {
    var chatBox = findChatBox();
    if (!chatBox || chatBox.__jdWordDictateWired) return;
    chatBox.__jdWordDictateWired = true;
    // Long-press on touch + right-click/long-press on desktop.
    /* DISABLED: message long-press is handled by reactions-v2.js (keeper menu)
    chatBox.addEventListener('touchstart', function (e) {
      var t = (e.touches && e.touches[0]) || null;
      var msgEl = e.target && e.target.closest ? e.target.closest('.msg.bot') : null;
      if (t && msgEl) onPressStart(t.clientX, t.clientY, msgEl);
    }, { passive: true }); */
    chatBox.addEventListener('touchmove', function (e) {
      var t = (e.touches && e.touches[0]) || null;
      if (t) onPressMove(t.clientX, t.clientY);
    }, { passive: true });
    chatBox.addEventListener('touchend', clearLp, { passive: true });
    chatBox.addEventListener('touchcancel', clearLp, { passive: true });
/* DISABLED: message contextmenu is handled by reactions-v2.js (keeper menu)
    chatBox.addEventListener('contextmenu', function (e) {
      var msgEl = e.target && e.target.closest ? e.target.closest('.msg.bot') : null;
      if (!msgEl) return;
      var hit = wordAtPoint(e.clientX, e.clientY);
      // Only show word menu if a word was actually hit; message long-press
      // is handled by reactions-v2.js (the keeper menu with Dictate)
      if (!hit || !hit.word) return;
      e.preventDefault();
      showMenu(e.clientX, e.clientY, {
        msgEl: msgEl,
        word: hit ? hit.word : '',
        node: hit ? hit.node : null,
        start: hit ? hit.start : 0,
        end: hit ? hit.end : 0
      });
    }); */
    // Re-apply saved reactions whenever messages render.
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          (m.addedNodes || []).forEach(function (n) {
            if (n.nodeType === 1 && n.classList && n.classList.contains('msg') && n.classList.contains('bot')) renderReaction(n);
          });
        });
      }).observe(chatBox, { childList: true });
    } catch (e) {}
    reapplyReactions(chatBox);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { closeMenu(); closeDictionary(); } });
  }

  /* ---------------- boot ---------------- */
  injectCSS();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
  // Late boot safety (chatBox may mount after patches load).
  var tries = 0;
  var bootTimer = setInterval(function () {
    if (findChatBox()) { wire(); clearInterval(bootTimer); }
    else if (++tries > 40) clearInterval(bootTimer);
  }, 500);

  /* test hook */
  window.__jdWordDictate = {
    expandWord: expandWord,
    toggleReaction: toggleReaction,
    getReaction: getReaction,
    renderReaction: renderReaction,
    openDictionary: openDictionary,
    closeDictionary: closeDictionary,
    EMOJIS: EMOJIS
  };
})();
