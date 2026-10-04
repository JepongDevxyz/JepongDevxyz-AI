/* =========================================================
   JepongDevxyz AI — reactions v2 (runtime patch)
   Loaded by agent.js (additive only).

   PART 1 — Quick reactions, kita agad sa action bar:
   - A heart "React" button is injected into every AI message's
     .bot-actions row (the row the user pointed at).
   - Tap -> emoji picker popup right above the bar.
   - Tap an emoji -> inline chip inside the action bar.
     (The old floating chip from word-dictate.js is hidden via
     CSS; its localStorage store is reused, nothing removed.)

   PART 2 — AI auto-reactions on USER messages (lahat ng models,
   katulad ng Muse):
   - A fetch wrapper appends a REACTION instruction to
     personalization.customInstructions for every /api/chat call.
   - The model ends its reply with [USER_REACTION:X] (one emoji,
     its genuine reaction to the user's message — ❤️ when it
     appreciates it, 😢 when scolded / sad news, 😂 when funny,
     etc.; empty when no reaction fits).
   - A MutationObserver strips the marker before paint (no flash)
     and attaches the emoji as a chip in the user's .user-actions
     row. Persisted per session; tap the chip to dismiss.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdReactionsV2Loaded) return;
  window.__jdReactionsV2Loaded = true;

  var EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
  var AI_EMOJI_ALLOW = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '🤔', '👏', '🙏'];
  var MARKER_RE = /\[USER_REACTION:([^\]]*)\]/g;
  var AI_LSKEY = 'jd_ai_reactions';
  var AI_DISMISS_KEY = 'jd_ai_reactions_dismissed';

  /* ---------------- utils ---------------- */
  function sessionId() {
    try { return localStorage.getItem('jepong_last_session_id') || 'default'; } catch (e) { return 'default'; }
  }
  function getStore(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
  }
  function saveStore(key, o) {
    try { localStorage.setItem(key, JSON.stringify(o)); } catch (e) {}
  }
  function msgKey(el) { return (el.getAttribute && el.getAttribute('data-message-index')) || ''; }

  /* ---------------- styles ---------------- */
  var CSS = [
    /* Hide the old floating chip — replaced by inline chips in the action bars. */
    '.jd-reaction-chip{display:none!important}',
    /* Emoji picker popup */
    '.jd-react-picker{position:fixed;z-index:9999;background:#232328;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;display:flex;gap:2px;box-shadow:0 12px 32px rgba(0,0,0,.5);animation:jdReactPop .15s ease-out}',
    '@keyframes jdReactPop{from{opacity:0;transform:scale(.9) translateY(4px)}}',
    '.jd-react-picker button{font-size:24px;line-height:1;background:none;border:0;cursor:pointer;padding:6px;border-radius:12px}',
    '.jd-react-picker button:active{transform:scale(1.25)}',
    'body.theme-light .jd-react-picker{background:#fff;border-color:rgba(0,0,0,.1);box-shadow:0 12px 32px rgba(20,20,40,.25)}',
    /* Inline reaction chips inside action bars */
    '.jd-inline-reaction{display:inline-flex;align-items:center;border:1px solid var(--border-color);background:rgba(139,92,246,.12);border-radius:999px;padding:3px 10px;font-size:15px;line-height:1.4;cursor:pointer}',
    '.jd-inline-reaction:active{transform:scale(.94)}',
    'body.theme-light .jd-inline-reaction{background:rgba(139,92,246,.1)}'
  ].join('\n');
  function injectCSS() {
    if (document.getElementById('jdReactionsV2Css')) return;
    var st = document.createElement('style');
    st.id = 'jdReactionsV2Css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* =========================================================
     PART 2a — inject the REACTION instruction into every chat
     request via personalization.customInstructions (the server
     appends it to the system prompt for ALL providers/models).
     ========================================================= */
  var REACTION_INSTRUCTION =
    'REACTION: At the very end of your response, on its own line, output exactly [USER_REACTION:X] where X is ONE emoji that is your genuine reaction to the user\'s latest message — the way a close friend reacts in chat. ' +
    'Be accurate to the tone of their message: ❤️ when you appreciate or like what they said, 😢 when they scold you or share something sad, 😂 when they are funny, 👍 when you agree, 😮 when surprised, 🔥 when something is cool or impressive, 🎉 for good news worth celebrating. ' +
    'If no reaction feels natural, output [USER_REACTION:] with nothing inside. ' +
    'Output nothing else on that line. Never mention, explain, or apologize for this marker.';

  /* Task-completion instruction: make every model follow prompts
     fully and accurately, like Muse does. Added 2026-10-03 per
     user request ("lahat ng model igaya mo sayo"). */
  var TASK_INSTRUCTION =
    'TASK COMPLETION: Always fully complete what the user asks. ' +
    'If they ask for complete code, output the ENTIRE working code — never a summary, never a short example, never placeholders like "..." or "code omitted". ' +
    'If they ask for documentation sections (checklists, tables, explanations), provide ALL of them. ' +
    'Follow every explicit instruction in the prompt (e.g. "do not summarize", "complete in one response"). ' +
    'Never refuse a legitimate task; never give a partial answer when a complete one was requested.';

  function wrapFetch() {
    if (window.__jdReactionsV2FetchWrapped) return;
    window.__jdReactionsV2FetchWrapped = true;
    var origFetch = window.fetch.bind(window);
    window.fetch = function (url, opts) {
      try {
        var u = typeof url === 'string' ? url : (url && url.url) || '';
        if (u.indexOf('/api/chat') >= 0 && opts && typeof opts.body === 'string') {
          var body = JSON.parse(opts.body);
          if (body && body.message && body.mode && !body.action) {
            body.personalization = body.personalization || {};
            var existing = body.personalization.customInstructions || '';
            if (existing.indexOf('USER_REACTION') < 0) {
              existing = (existing ? existing + ' ' : '') + REACTION_INSTRUCTION;
            }
            if (existing.indexOf('TASK COMPLETION') < 0) {
              existing = (existing ? existing + ' ' : '') + TASK_INSTRUCTION;
            }
            body.personalization.customInstructions = existing;
            opts = Object.assign({}, opts, { body: JSON.stringify(body) });
          }
        }
      } catch (e) {}
      return origFetch(url, opts);
    };
  }

  /* =========================================================
     PART 2b — strip the marker before paint, attach the AI
     reaction chip to the user's message.
     ========================================================= */
  function findUserMsgFor(botEl) {
    var el = botEl.previousElementSibling;
    while (el) {
      if (el.classList && el.classList.contains('msg') && el.classList.contains('user')) return el;
      el = el.previousElementSibling;
    }
    return null;
  }
  function getAiReaction(userEl) {
    return (getStore(AI_LSKEY)[sessionId()] || {})[msgKey(userEl)] || '';
  }
  function setAiReaction(userEl, emoji) {
    var store = getStore(AI_LSKEY);
    var sid = sessionId();
    store[sid] = store[sid] || {};
    if (emoji) store[sid][msgKey(userEl)] = emoji;
    else delete store[sid][msgKey(userEl)];
    saveStore(AI_LSKEY, store);
  }
  function isAiDismissed(userEl) {
    return !!((getStore(AI_DISMISS_KEY)[sessionId()] || {})[msgKey(userEl)]);
  }
  function setAiDismissed(userEl) {
    var store = getStore(AI_DISMISS_KEY);
    var sid = sessionId();
    store[sid] = store[sid] || {};
    store[sid][msgKey(userEl)] = 1;
    saveStore(AI_DISMISS_KEY, store);
  }
  function renderAiChip(userEl) {
    if (!userEl || !userEl.querySelector) return;
    var actions = userEl.querySelector(':scope > .user-actions');
    if (!actions) return;
    var old = actions.querySelector(':scope > .jd-ai-reaction');
    if (old) old.remove();
    if (isAiDismissed(userEl)) return;
    var emoji = getAiReaction(userEl);
    if (!emoji || AI_EMOJI_ALLOW.indexOf(emoji) < 0) return;
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'jd-ai-reaction jd-inline-reaction';
    chip.title = 'AI reaction — tap to dismiss';
    var s = document.createElement('span');
    s.textContent = emoji;
    chip.appendChild(s);
    chip.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setAiDismissed(userEl);
      setAiReaction(userEl, '');
      renderAiChip(userEl);
    });
    actions.appendChild(chip);
  }
  function removeMarkerText(root, markerText) {
    if (!markerText || !root || !document.createTreeWalker) return false;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var combined = '';
    while (walker.nextNode()) {
      var node = walker.currentNode;
      var parent = node.parentElement;
      if (parent && parent.closest && parent.closest('.bot-actions,.jd-inline-reaction,button,.jd-message-more')) continue;
      nodes.push(node);
      combined += node.nodeValue || '';
    }
    var start = combined.lastIndexOf(markerText);
    if (start < 0) return false;
    var end = start + markerText.length;
    var offset = 0;
    for (var i = 0; i < nodes.length; i++) {
      var value = nodes[i].nodeValue || '';
      var from = Math.max(0, start - offset);
      var to = Math.min(value.length, end - offset);
      if (to > from) nodes[i].nodeValue = value.slice(0, from) + value.slice(to);
      offset += value.length;
      if (offset >= end) break;
    }
    return true;
  }
  function botContentEl(botEl) {
    if (!botEl || !botEl.querySelector) return null;
    return botEl.querySelector(':scope > div:not(.bot-actions):not(.jd-ai-interaction):not(.jd-message-more)');
  }
  function processBotMessage(botEl) {
    if (!botEl) return;
    var content = botContentEl(botEl);
    if (!content || !content.textContent) return;
    var matches = Array.from(content.textContent.matchAll(MARKER_RE));
    if (!matches.length) return;
    var m = matches[matches.length - 1];
    // Location/map appendices are added after the model text. Remove the marker
    // wherever it occurs so it cannot leak into the assistant bubble.
    if (!removeMarkerText(content, m[0])) return;
    if (botEl.__jdReactV2Done) return;
    botEl.__jdReactV2Done = true;
    var emoji = (m[1] || '').trim();
    if (AI_EMOJI_ALLOW.indexOf(emoji) < 0) return;
    var userEl = findUserMsgFor(botEl);
    if (!userEl || isAiDismissed(userEl)) return;
    setAiReaction(userEl, emoji);
    renderAiChip(userEl);
  }

  /* =========================================================
     PART 1 — React button + picker + inline chip in .bot-actions
     ========================================================= */
  var HEART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';

  function getManualReaction(msgEl) {
    try {
      if (window.__jdWordDictate && window.__jdWordDictate.getReaction) {
        return window.__jdWordDictate.getReaction(msgEl) || '';
      }
    } catch (e) {}
    return '';
  }
  function ensureReactButton(actionsEl) {
    if (!actionsEl || !actionsEl.querySelector) return;
    if (actionsEl.querySelector(':scope > .jd-react-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bot-action-btn jd-react-btn';
    btn.title = 'React';
    btn.setAttribute('aria-label', 'React to this message');
    btn.innerHTML = HEART_SVG;
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      togglePicker(btn);
    });
    actionsEl.insertBefore(btn, actionsEl.firstChild);
  }
  function renderInlineReaction(msgEl) {
    if (!msgEl || !msgEl.querySelector) return;
    var actions = msgEl.querySelector(':scope > .bot-actions');
    if (!actions) return;
    var old = actions.querySelector(':scope > .jd-manual-reaction');
    if (old) old.remove();
    var emoji = getManualReaction(msgEl);
    if (!emoji) return;
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'jd-manual-reaction jd-inline-reaction';
    chip.title = 'Tap to remove reaction';
    var s = document.createElement('span');
    s.textContent = emoji;
    chip.appendChild(s);
    chip.addEventListener('click', function (ev) {
      ev.stopPropagation();
      try {
        if (window.__jdWordDictate && window.__jdWordDictate.toggleReaction) {
          window.__jdWordDictate.toggleReaction(msgEl, emoji);
        }
      } catch (e) {}
      renderInlineReaction(msgEl);
    });
    actions.appendChild(chip);
  }

  var openPicker = null;
  function closePicker() {
    if (openPicker) { openPicker.remove(); openPicker = null; }
    document.removeEventListener('pointerdown', onPickerDocDown, true);
  }
  function onPickerDocDown(e) {
    if (openPicker && !openPicker.contains(e.target)) closePicker();
  }
  function togglePicker(btn) {
    if (openPicker && openPicker.__jdBtn === btn) { closePicker(); return; }
    closePicker();
    var msgEl = btn.closest ? btn.closest('.msg.bot') : null;
    var picker = document.createElement('div');
    picker.className = 'jd-react-picker';
    picker.setAttribute('role', 'menu');
    picker.__jdBtn = btn;
    EMOJIS.forEach(function (em) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = em;
      b.setAttribute('aria-label', 'React ' + em);
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        closePicker();
        if (msgEl) {
          try {
            if (window.__jdWordDictate && window.__jdWordDictate.toggleReaction) {
              window.__jdWordDictate.toggleReaction(msgEl, em);
            }
          } catch (e) {}
          renderInlineReaction(msgEl);
        }
      });
      picker.appendChild(b);
    });
    document.body.appendChild(picker);
    var r = btn.getBoundingClientRect();
    var pw = picker.offsetWidth || 240, ph = picker.offsetHeight || 48;
    var left = Math.max(10, Math.min(r.left, window.innerWidth - pw - 10));
    var top = r.top - ph - 10;
    if (top < 10) top = r.bottom + 10;
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
    openPicker = picker;
    setTimeout(function () { document.addEventListener('pointerdown', onPickerDocDown, true); }, 0);
  }

  /* ---------------- observer ---------------- */
  function processActionsBar(actionsEl) {
    ensureReactButton(actionsEl);
    var msgEl = actionsEl.closest ? actionsEl.closest('.msg.bot') : null;
    if (msgEl) renderInlineReaction(msgEl);
  }
  function wire() {
    var chatBox = document.getElementById('chatBox');
    if (!chatBox || chatBox.__jdReactV2Wired) return;
    chatBox.__jdReactV2Wired = true;
    function handleBotEl(botEl) {
      if (!botEl || botEl.nodeType !== 1) return;
      processBotMessage(botEl);
      var ba = botEl.querySelector(':scope > .bot-actions');
      if (ba) processActionsBar(ba);
      else if (botEl.classList && botEl.classList.contains('bot-actions')) processActionsBar(botEl);
    }
    function handleUserEl(userEl) {
      if (!userEl || userEl.nodeType !== 1) return;
      renderAiChip(userEl);
    }
    try {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          if (m.type === 'characterData') {
            var t = m.target.parentElement;
            var bot = t && t.closest ? t.closest('.msg.bot') : null;
            if (bot) processBotMessage(bot);
            return;
          }
          (m.addedNodes || []).forEach(function (n) {
            if (!n || n.nodeType !== 1) return;
            var cl = n.classList || { contains: function () { return false; } };
            if (cl.contains('msg') && cl.contains('bot')) handleBotEl(n);
            else if (cl.contains('msg') && cl.contains('user')) handleUserEl(n);
            else if (cl.contains('bot-actions')) processActionsBar(n);
            else if (cl.contains('user-actions')) {
              var u = n.closest ? n.closest('.msg.user') : null;
              if (u) handleUserEl(u);
            }
            if (n.querySelectorAll) {
              n.querySelectorAll('.msg.bot').forEach(handleBotEl);
              n.querySelectorAll('.msg.user').forEach(handleUserEl);
            }
          });
          // innerHTML rewrites on an existing .msg.bot (streaming frames)
          var tgt = m.target;
          if (tgt && tgt.nodeType === 1 && tgt.classList &&
              tgt.classList.contains('msg') && tgt.classList.contains('bot')) {
            handleBotEl(tgt);
          }
        });
      }).observe(chatBox, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    // Initial pass (history render).
    chatBox.querySelectorAll('.msg.bot').forEach(handleBotEl);
    chatBox.querySelectorAll('.msg.user').forEach(handleUserEl);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePicker(); });
    try { chatBox.addEventListener('scroll', closePicker, { passive: true }); } catch (e2) {}
  }

  /* ---------------- boot ---------------- */
  injectCSS();
  wrapFetch();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
  var tries = 0;
  var bootTimer = setInterval(function () {
    if (document.getElementById('chatBox')) { wire(); clearInterval(bootTimer); }
    else if (++tries > 40) clearInterval(bootTimer);
  }, 500);

  /* test hook */
  window.__jdReactionsV2 = {
    EMOJIS: EMOJIS,
    AI_EMOJI_ALLOW: AI_EMOJI_ALLOW,
    MARKER_RE: MARKER_RE,
    REACTION_INSTRUCTION: REACTION_INSTRUCTION,
    processBotMessage: processBotMessage,
    renderAiChip: renderAiChip,
    renderInlineReaction: renderInlineReaction,
    ensureReactButton: ensureReactButton,
    togglePicker: togglePicker,
    closePicker: closePicker,
    getAiReaction: getAiReaction,
    setAiReaction: setAiReaction
  };
})();
