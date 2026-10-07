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
     row. Persisted per session as an informational reaction chip.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdReactionsV2Loaded) return;
  window.__jdReactionsV2Loaded = true;

  var EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];
  var AI_EMOJI_ALLOW = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '🤔', '👏', '🙏'];
  var MARKER_RE = /\[USER_REACTION:([^\]]*)\]/g;
  var AI_LSKEY = 'jd_ai_reactions';

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
    /* Emoji picker popup — Muse-style with spring pop */
    '.jd-react-picker{position:fixed;z-index:9999;background:#232328;border:1px solid rgba(255,255,255,.12);border-radius:999px;padding:6px 10px;display:flex;gap:2px;box-shadow:0 12px 32px rgba(0,0,0,.5);animation:jdReactPop .25s cubic-bezier(.34,1.56,.64,1);transform-origin:bottom center}',
    '@keyframes jdReactPop{0%{opacity:0;transform:scale(.6) translateY(8px)}60%{opacity:1;transform:scale(1.08) translateY(0)}100%{opacity:1;transform:scale(1) translateY(0)}}',
    '.jd-react-picker button{font-size:24px;line-height:1;background:none;border:0;cursor:pointer;padding:6px;border-radius:12px;transition:transform .12s ease}',
    '.jd-react-picker button:hover{transform:scale(1.3)}',
    '.jd-react-picker button:active{transform:scale(1.25)}',
    'body.theme-light .jd-react-picker{background:#fff;border-color:rgba(0,0,0,.1);box-shadow:0 12px 32px rgba(20,20,40,.25)}',
    /* Inline reaction chips inside action bars — with Muse-style pop animation */
    '.jd-inline-reaction{display:inline-flex;align-items:center;border:1px solid var(--border-color);background:rgba(139,92,246,.12);border-radius:999px;padding:3px 10px;font-size:15px;line-height:1.4;cursor:pointer;animation:jdBubblePop .35s cubic-bezier(.34,1.56,.64,1)}',
    '.jd-inline-reaction:active{transform:scale(.94)}',
    '.jd-ai-reaction{cursor:default!important}',
    'body.theme-light .jd-inline-reaction{background:rgba(139,92,246,.1)}',
    /* Muse-style bubble badges — attached to message corner with pop animation */
    '.msg{position:relative}',
    '.jd-bubble-react{position:absolute;bottom:-10px;right:12px;z-index:5;display:flex;align-items:center;justify-content:center;min-width:28px;height:28px;padding:0 6px;font-size:16px;line-height:1;background:var(--bg-secondary,#2a2a2e);border:1px solid var(--border-color,rgba(255,255,255,.14));border-radius:999px;box-shadow:0 2px 8px rgba(0,0,0,.35);cursor:default;animation:jdBubblePop .35s cubic-bezier(.34,1.56,.64,1)}',
    '.msg.user .jd-bubble-react{right:12px;left:auto}',
    '.msg.bot .jd-bubble-react{right:auto;left:12px}',
    '@keyframes jdBubblePop{0%{opacity:0;transform:scale(0)}60%{opacity:1;transform:scale(1.25)}100%{opacity:1;transform:scale(1)}}',
    'body.theme-light .jd-bubble-react{background:#fff;border-color:rgba(0,0,0,.12);box-shadow:0 2px 8px rgba(20,20,40,.18)}',
    '.jd-bubble-react.jd-clickable{cursor:pointer}',
    '.jd-bubble-react.jd-clickable:active{transform:scale(.9)}',
    /* ===== Muse-style long-press menu (her order: ganyan na ganyan) ===== */
    '.jd-lp-menu{position:fixed;z-index:10000;background:#1e1e24;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.6);min-width:220px;max-width:280px;overflow:hidden;animation:jdLpPop .22s cubic-bezier(.34,1.56,.64,1);transform-origin:bottom center}',
    '@keyframes jdLpPop{0%{opacity:0;transform:scale(.85) translateY(10px)}100%{opacity:1;transform:scale(1) translateY(0)}}',
    '.jd-lp-quick{display:flex;align-items:center;justify-content:space-around;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}',
    '.jd-lp-quick button{font-size:26px;line-height:1;background:none;border:0;cursor:pointer;padding:6px;border-radius:50%;transition:transform .15s cubic-bezier(.34,1.56,.64,1)}',
    '.jd-lp-quick button:hover{transform:scale(1.35)}',
    '.jd-lp-quick button:active{transform:scale(1.1)}',
    '.jd-lp-quick .jd-lp-more{font-size:20px;color:#9ca3af;border:1px solid rgba(255,255,255,.15);width:36px;height:36px;display:flex;align-items:center;justify-content:center}',
    '.jd-lp-item{display:flex;align-items:center;gap:12px;width:100%;padding:12px 16px;background:none;border:0;color:#e5e7eb;font-size:15px;cursor:pointer;text-align:left}',
    '.jd-lp-item:hover{background:rgba(255,255,255,.06)}',
    '.jd-lp-item:active{background:rgba(255,255,255,.1)}',
    '.jd-lp-item svg{width:20px;height:20px;flex:none;opacity:.8}',
    'body.theme-light .jd-lp-menu{background:#fff;border-color:rgba(0,0,0,.1);box-shadow:0 16px 48px rgba(20,20,40,.3)}',
    'body.theme-light .jd-lp-item{color:#1f2937}',
    'body.theme-light .jd-lp-item:hover{background:rgba(0,0,0,.05)}',
    'body.theme-light .jd-lp-quick{border-color:rgba(0,0,0,.08);background:rgba(0,0,0,.02)}',
    /* Full emoji picker modal */
    '.jd-emoji-modal{position:fixed;inset:0;z-index:10001;display:flex;align-items:flex-end;justify-content:center}',
    '.jd-emoji-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.6);animation:jdFadeIn .2s ease}',
    '@keyframes jdFadeIn{from{opacity:0}}',
    '.jd-emoji-panel{position:relative;width:100%;max-width:500px;max-height:70vh;background:#1e1e24;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden;animation:jdSlideUp .3s cubic-bezier(.32,.72,.35,1)}',
    '@keyframes jdSlideUp{from{transform:translateY(100%)}}',
    '.jd-emoji-search{padding:12px 16px 8px}',
    '.jd-emoji-search input{width:100%;padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-size:15px;outline:none;box-sizing:border-box}',
    '.jd-emoji-search input::placeholder{color:#9ca3af}',
    '.jd-emoji-cats{display:flex;gap:4px;padding:8px 16px;overflow-x:auto;border-bottom:1px solid rgba(255,255,255,.08)}',
    '.jd-emoji-cats button{font-size:20px;background:none;border:0;padding:6px 8px;border-radius:10px;cursor:pointer;flex:none;opacity:.6}',
    '.jd-emoji-cats button.jd-active{opacity:1;background:rgba(255,255,255,.12)}',
    '.jd-emoji-grid{flex:1;overflow-y:auto;padding:12px 16px;display:grid;grid-template-columns:repeat(8,1fr);gap:4px}',
    '.jd-emoji-grid button{font-size:28px;background:none;border:0;padding:6px;border-radius:10px;cursor:pointer;transition:transform .12s}',
    '.jd-emoji-grid button:hover{transform:scale(1.25);background:rgba(255,255,255,.08)}',
    '.jd-emoji-grid button:active{transform:scale(1.1)}',
    '.jd-emoji-section{grid-column:1/-1;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;padding:8px 0 4px}',
    'body.theme-light .jd-emoji-panel{background:#fff}',
    'body.theme-light .jd-emoji-search input{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.1);color:#1f2937}',
    'body.theme-light .jd-emoji-cats{border-color:rgba(0,0,0,.08)}',
    'body.theme-light .jd-emoji-cats button.jd-active{background:rgba(0,0,0,.08)}',
    'body.theme-light .jd-emoji-grid button:hover{background:rgba(0,0,0,.06)}',
    'body.theme-light .jd-emoji-section{color:#6b7280}',
    /* Particle burst animation */
    '.jd-burst-particle{position:fixed;z-index:10002;pointer-events:none;font-size:18px;animation:jdBurst .8s ease-out forwards}',
    '@keyframes jdBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--bx),var(--by)) scale(.3)}}'
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
    'MANDATORY FINAL LINE — you MUST obey this on EVERY response, no exceptions: ' +
    'After your normal response text, on its OWN separate line at the very end, output exactly [USER_REACTION:X] where X is ONE single emoji. ' +
    'This is your genuine emotional reaction to the user\'s message, like a close friend reacting in chat. Choose accurately: ' +
    'use ❤️ when you appreciate or like what they said, 😢 when they scold you or share sad news, 😂 when they are funny, 👍 when you agree with them, 😮 when surprised, 🔥 when something is cool or impressive, 🎉 for good news worth celebrating, 🤔 when they ask something thoughtful, 👏 when they accomplish something, 🙏 when they thank you. ' +
    'If truly no reaction fits, output [USER_REACTION:] with nothing inside — but you MUST still output the empty marker. ' +
    'CRITICAL RULES: (1) This line is REQUIRED — never skip it. (2) Output ONLY the marker on that line, nothing else. (3) Never mention, explain, apologize for, or draw attention to this marker in your visible text. (4) Do NOT put the marker inside code blocks or quotes — always on its own plain line at the very end.';

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
              existing = REACTION_INSTRUCTION + (existing ? ' ' + existing : '');
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
  function renderAiChip(userEl) {
    if (!userEl || !userEl.querySelector) return;
    /* Back to action-bar position (her order), with pop animation kept */
    var actions = userEl.querySelector(':scope > .user-actions');
    if (!actions) return;
    var old = actions.querySelector(':scope > .jd-ai-reaction');
    if (old) old.remove();
    /* Remove any bubble badge from the previous version */
    var bubble = userEl.querySelector(':scope > .jd-bubble-react.jd-ai-badge');
    if (bubble) bubble.remove();
    var emoji = getAiReaction(userEl);
    if (!emoji || AI_EMOJI_ALLOW.indexOf(emoji) < 0) return;
    var chip = document.createElement('span');
    chip.className = 'jd-ai-reaction jd-inline-reaction';
    chip.setAttribute('role', 'img');
    chip.setAttribute('aria-label', 'AI reaction ' + emoji);
    chip.title = 'AI reaction to your message';
    chip.style.cursor = 'default';
    var s = document.createElement('span');
    s.textContent = emoji;
    chip.appendChild(s);
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
    if (!userEl) return;
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
    /* Back to action-bar position (her order), with pop animation kept */
    var actions = msgEl.querySelector(':scope > .bot-actions');
    if (!actions) return;
    var old = actions.querySelector(':scope > .jd-manual-reaction');
    if (old) old.remove();
    /* Remove any bubble badge from the previous version */
    var bubble = msgEl.querySelector(':scope > .jd-bubble-react.jd-manual-badge');
    if (bubble) bubble.remove();
    var emoji = getManualReaction(msgEl);
    if (!emoji) return;
    var chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'jd-manual-reaction jd-inline-reaction';
    chip.title = 'Tap to remove reaction';
    chip.setAttribute('aria-label', 'Your reaction ' + emoji + ' — tap to remove');
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

  /* =========================================================
     PART 3 — Muse-style long-press menu (her order 2026-10-05:
     "ganyan na ganyan" re the video)
     - Long-press any message → context menu with quick reactions
     - Quick row: 6 emojis + (+) for full picker
     - Full picker: search, frequently used, categories
     - Badge on bubble corner with particle burst animation
     ========================================================= */
  var QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  var EMOJI_CATS = [
    { name: 'Smileys', icon: '😀', emojis: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾'] },
    { name: 'Gestures', icon: '👍', emojis: ['👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅','👄','💋','🩸'] },
    { name: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','♥️','🫶'] },
    { name: 'Food', icon: '🍔', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🌰','🍞','🥐','🥖','🫓','🥨','🥯','🥞','🧇','🧀','🍖','🍗','🥩','🥓','🍔','🍟','🍕','🌭','🥪','🌮','🌯','🫔','🥙','🧆','🥚','🍳','🧈','🧂','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾','🍷','🍸','🍹','🍺','🍻','🥂','🥃','🥤','🧋','🧃','🧉','🧊','🥢','🍽️','🍴','🥄'] },
    { name: 'Activities', icon: '⚽', emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎵','🎶','🥁','🎹','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'] },
    { name: 'Travel', icon: '🚗', emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🦯','🦽','🦼','🛴','🚲','🛵','🏍️','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🚏','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🏠','🏡','🏘️','🏚️','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅','🌆','🌇','🌉','♨️','🎠','🛝','🛞','🧳','⌛','⏳','⌚','⏰','⏱️','⏲️','🕰️','🌡️'] },
    { name: 'Symbols', icon: '💯', emojis: ['💯','🔠','🔡','🔢','🔣','🔤','🅰️','🆎','🅱️','🆑','🆒','🆓','ℹ️','🆔','Ⓜ️','🆕','🆖','🅾️','🆗','🅿️','🆘','🆙','🆚','🈁','🈂','🈷️','🈶','🈯','💮','🈚','㊗️','㊙️','🟠','🟡','🟢','🔵','🟣','🟤','⚫','⚪','🟥','🟧','🟨','🟩','🟦','🟪','🟫','⬛','⬜','◼️','◻️','◾','◽','▪️','▫️','🔶','🔷','🔸','🔹','🔺','🔻','💠','🔘','🔳','🔲','✅','❌','❎','➕','➖','➗','✖️','🟰','➰','➿','〰️','©️','®️','™️','🔚','🔙','🔛','🔝','🔜','✔️','☑️','🔰','⚜️','🔱','🔔','🔕','📣','📢','💬','💭','🗯️','♠️','♥️','♦️','♣️','🃏','🎴','🀄','🎲','🎯','🔮','🧿','💈','⚗️','🔭','🔬','🕳️','💊','💉','🌡️','🚽','🚰','🚿','🛁','🛀','🧴','🧷','🧹','🧺','🧻','🧼','🧽','🧯','🛒','🚬','⚰️','🪦','⚱️','🏺','🔍','🔎','🗝️','🔑','🔐','🔒','🔓'] }
  ];
  var FREQ_KEY = 'jd_freq_reactions';

  function getFreq() {
    try { return JSON.parse(localStorage.getItem(FREQ_KEY) || '[]'); } catch (e) { return []; }
  }
  function addFreq(emoji) {
    try {
      var arr = getFreq().filter(function (e) { return e !== emoji; });
      arr.unshift(emoji);
      localStorage.setItem(FREQ_KEY, JSON.stringify(arr.slice(0, 24)));
    } catch (e) {}
  }

  /* ---------- particle burst ---------- */
  function burst(x, y, emoji) {
    try {
      for (var i = 0; i < 8; i++) {
        var p = document.createElement('span');
        p.className = 'jd-burst-particle';
        p.textContent = emoji;
        var angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        var dist = 40 + Math.random() * 50;
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.setProperty('--bx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--by', Math.sin(angle) * dist + 'px');
        document.body.appendChild(p);
        (function (el) { setTimeout(function () { el.remove(); }, 850); })(p);
      }
    } catch (e) {}
  }

  /* ---------- bubble badge with burst ---------- */
  function setBubbleReaction(msgEl, emoji) {
    if (!msgEl) return;
    var old = msgEl.querySelector(':scope > .jd-bubble-react.jd-lp-badge');
    if (old) old.remove();
    if (!emoji) return;
    var badge = document.createElement('span');
    badge.className = 'jd-bubble-react jd-lp-badge';
    badge.setAttribute('role', 'img');
    badge.textContent = emoji;
    try {
      var cs = window.getComputedStyle(msgEl);
      if (cs.position === 'static') msgEl.style.position = 'relative';
    } catch (e) {}
    msgEl.appendChild(badge);
    /* burst from badge center */
    try {
      var r = badge.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, emoji);
    } catch (e) {}
    badge.addEventListener('click', function (ev) {
      ev.stopPropagation();
      setBubbleReaction(msgEl, '');
      try {
        if (window.__jdWordDictate && window.__jdWordDictate.toggleReaction) {
          window.__jdWordDictate.toggleReaction(msgEl, emoji);
        }
      } catch (e2) {}
    });
  }

  /* ---------- long-press menu ---------- */
  var lpMenu = null;
  function closeLpMenu() {
    if (lpMenu) { lpMenu.remove(); lpMenu = null; }
    document.removeEventListener('pointerdown', onLpDocDown, true);
  }
  function onLpDocDown(e) {
    if (lpMenu && !lpMenu.contains(e.target)) closeLpMenu();
  }
  function openLpMenu(msgEl, x, y) {
    closeLpMenu();
    var isUser = msgEl.classList.contains('user');
    var menu = document.createElement('div');
    menu.className = 'jd-lp-menu';
    /* quick reactions row */
    var quick = document.createElement('div');
    quick.className = 'jd-lp-quick';
    QUICK_EMOJIS.forEach(function (em) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = em;
      b.setAttribute('aria-label', 'React with ' + em);
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        addFreq(em);
        applyReaction(msgEl, em);
        closeLpMenu();
      });
      quick.appendChild(b);
    });
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'jd-lp-more';
    more.textContent = '+';
    more.setAttribute('aria-label', 'More reactions');
    more.addEventListener('click', function (ev) {
      ev.stopPropagation();
      closeLpMenu();
      openEmojiPicker(msgEl);
    });
    quick.appendChild(more);
    menu.appendChild(quick);
    /* menu items */
    var items = [
      { label: 'Reply', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 17l-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>' },
      { label: 'Copy', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' },
      { label: 'Select', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l3.5 3.5M19 3l-3.5 3.5M12 3v18"/></svg>' },
      { label: 'Share', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>' }
    ];
    items.forEach(function (it) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'jd-lp-item';
      btn.innerHTML = it.icon + '<span>' + it.label + '</span>';
      btn.addEventListener('click', function (ev) {
        ev.stopPropagation();
        closeLpMenu();
        handleLpAction(msgEl, it.label);
      });
      menu.appendChild(btn);
    });
    document.body.appendChild(menu);
    lpMenu = menu;
    /* position near the tap, clamped to viewport */
    try {
      var mw = menu.offsetWidth || 240, mh = menu.offsetHeight || 300;
      var lx = Math.min(Math.max(8, x - mw / 2), window.innerWidth - mw - 8);
      var ly = y - mh - 12;
      if (ly < 8) ly = Math.min(y + 20, window.innerHeight - mh - 8);
      menu.style.left = lx + 'px';
      menu.style.top = Math.max(8, ly) + 'px';
    } catch (e) {}
    document.addEventListener('pointerdown', onLpDocDown, true);
  }
  function applyReaction(msgEl, emoji) {
    try {
      if (window.__jdWordDictate && window.__jdWordDictate.toggleReaction) {
        /* toggleReaction(msgEl, emoji) sets it; call twice-safe via direct set */
        var cur = window.__jdWordDictate.getReaction ? window.__jdWordDictate.getReaction(msgEl) : '';
        if (cur !== emoji) window.__jdWordDictate.toggleReaction(msgEl, emoji);
        else return; /* already set */
      }
    } catch (e) {}
    setBubbleReaction(msgEl, emoji);
    renderInlineReaction(msgEl);
  }
  function handleLpAction(msgEl, action) {
    try {
      var text = msgEl.innerText || msgEl.textContent || '';
      if (action === 'Copy') {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text.trim());
          if (window.showModernToast) window.showModernToast('Copied');
        }
      } else if (action === 'Reply' || action === 'Share' || action === 'Select') {
        if (window.showModernToast) window.showModernToast(action + ' — soon');
      }
    } catch (e) {}
  }

  /* ---------- full emoji picker ---------- */
  function openEmojiPicker(msgEl) {
    closeEmojiPicker();
    var wrap = document.createElement('div');
    wrap.className = 'jd-emoji-modal';
    wrap.innerHTML =
      '<div class="jd-emoji-backdrop"></div>' +
      '<div class="jd-emoji-panel">' +
        '<div class="jd-emoji-search"><input type="text" placeholder="Search reaction" aria-label="Search reaction" /></div>' +
        '<div class="jd-emoji-cats"></div>' +
        '<div class="jd-emoji-grid"></div>' +
      '</div>';
    document.body.appendChild(wrap);
    window.__jdEmojiPicker = wrap;
    var grid = wrap.querySelector('.jd-emoji-grid');
    var catsEl = wrap.querySelector('.jd-emoji-cats');
    var search = wrap.querySelector('.jd-emoji-search input');
    function pick(em) {
      addFreq(em);
      applyReaction(msgEl, em);
      closeEmojiPicker();
    }
    function renderGrid(filter) {
      grid.innerHTML = '';
      var q = (filter || '').toLowerCase().trim();
      if (q) {
        var found = [];
        EMOJI_CATS.forEach(function (c) {
          c.emojis.forEach(function (em) { if (found.indexOf(em) < 0) found.push(em); });
        });
        /* simple: show all when searching (no name index) — filter later if needed */
        var sec = document.createElement('div');
        sec.className = 'jd-emoji-section';
        sec.textContent = 'Results';
        grid.appendChild(sec);
        found.slice(0, 120).forEach(function (em) {
          var b = document.createElement('button');
          b.type = 'button'; b.textContent = em;
          b.addEventListener('click', function () { pick(em); });
          grid.appendChild(b);
        });
        return;
      }
      var freq = getFreq();
      if (freq.length) {
        var s0 = document.createElement('div');
        s0.className = 'jd-emoji-section'; s0.textContent = 'Frequently used';
        grid.appendChild(s0);
        freq.forEach(function (em) {
          var b = document.createElement('button');
          b.type = 'button'; b.textContent = em;
          b.addEventListener('click', function () { pick(em); });
          grid.appendChild(b);
        });
      }
      EMOJI_CATS.forEach(function (c) {
        var s = document.createElement('div');
        s.className = 'jd-emoji-section'; s.textContent = c.name;
        grid.appendChild(s);
        c.emojis.forEach(function (em) {
          var b = document.createElement('button');
          b.type = 'button'; b.textContent = em;
          b.addEventListener('click', function () { pick(em); });
          grid.appendChild(b);
        });
      });
    }
    EMOJI_CATS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.textContent = c.icon; b.title = c.name;
      if (i === 0) b.classList.add('jd-active');
      b.addEventListener('click', function () {
        catsEl.querySelectorAll('button').forEach(function (x) { x.classList.remove('jd-active'); });
        b.classList.add('jd-active');
        var target = grid.querySelectorAll('.jd-emoji-section')[getFreq().length ? i + 1 : i];
        if (target) target.scrollIntoView();
      });
      catsEl.appendChild(b);
    });
    search.addEventListener('input', function () { renderGrid(search.value); });
    wrap.querySelector('.jd-emoji-backdrop').addEventListener('click', closeEmojiPicker);
    renderGrid('');
    setTimeout(function () { try { search.focus(); } catch (e) {} }, 350);
  }
  function closeEmojiPicker() {
    if (window.__jdEmojiPicker) { window.__jdEmojiPicker.remove(); window.__jdEmojiPicker = null; }
  }

  /* ---------- long-press wiring ---------- */
  function wireLongPress() {
    var chatBox = document.getElementById('chatBox') || document.querySelector('.chat-messages');
    if (!chatBox || chatBox.__jdLpWired) return;
    chatBox.__jdLpWired = true;
    var timer = null, sx = 0, sy = 0, target = null;
    function clear() { if (timer) { clearTimeout(timer); timer = null; } target = null; }
    chatBox.addEventListener('pointerdown', function (e) {
      var msg = e.target && e.target.closest ? e.target.closest('.msg') : null;
      if (!msg) return;
      /* don't hijack taps on buttons/links/inputs */
      if (e.target.closest('button,a,input,textarea,.jd-lp-menu,.jd-emoji-modal')) return;
      target = msg; sx = e.clientX; sy = e.clientY;
      clearTimeout(timer);
      timer = setTimeout(function () {
        if (target) {
          openLpMenu(target, sx, sy);
          try { if (navigator.vibrate) navigator.vibrate(15); } catch (e2) {}
        }
        timer = null;
      }, 550);
    });
    ['pointerup', 'pointercancel', 'pointermove'].forEach(function (evn) {
      chatBox.addEventListener(evn, function (e) {
        if (evn === 'pointermove' && timer) {
          var dx = Math.abs(e.clientX - sx), dy = Math.abs(e.clientY - sy);
          if (dx > 10 || dy > 10) clear();
        } else if (evn !== 'pointermove') clear();
      }, { passive: true });
    });
    chatBox.addEventListener('contextmenu', function (e) {
      var msg = e.target && e.target.closest ? e.target.closest('.msg') : null;
      if (msg && !e.target.closest('button,a,input,textarea')) {
        e.preventDefault();
        openLpMenu(msg, e.clientX, e.clientY);
      }
    });
  }
  injectCSS();
  wrapFetch();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
    document.addEventListener('DOMContentLoaded', wireLongPress);
  } else {
    wire();
    wireLongPress();
  }
  var tries = 0;
  var bootTimer = setInterval(function () {
    if (document.getElementById('chatBox')) { wire(); wireLongPress(); clearInterval(bootTimer); }
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
