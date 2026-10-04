/* =========================================================
   JepongDevxyz AI — Import Memory
   Runtime patch loaded by agent.js (additive only).

   Like the Muse app's "Import memory" feature:
   1. Copy the migration prompt, paste into another AI,
      paste the response back, tap "Add memory".
   2. Import chats: upload a .zip export from ChatGPT, Claude,
      Gemini, or Meta AI to import conversations.

   Placed in Settings > AI & Tools between Custom API Keys
   and Web Search (per user order 2026-10-05).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdImportMemoryLoaded) return;
  window.__jdImportMemoryLoaded = true;

  var MIGRATION_PROMPT = [
    'You are helping me migrate context from one AI assistant to another.',
    'Your job is to compile, from our past conversations, a portable memory snapshot of what you reliably know about me.',
    '',
    'Rules:',
    '- Output ONLY durable facts about me: name and what to call me, timezone/location, work/projects, devices, preferences, goals, and important people.',
    '- Group them under short headings (Identity, Work, Preferences, etc.).',
    '- Use concise bullet points. No fluff, no greetings, no explanations.',
    '- Do NOT include anything you are unsure about. Do NOT invent details.',
    '- Keep it under 1500 words.',
    '',
    'The output goes verbatim into a new AI\'s memory, so make every line something worth remembering.'
  ].join('\n');

  /* ---------------- styles ---------------- */
  function injectCss() {
    if (document.getElementById('jd-import-memory-css')) return;
    var s = document.createElement('style');
    s.id = 'jd-import-memory-css';
    s.textContent = [
      '.jd-im-page{position:fixed;inset:0;z-index:9995;background:var(--bg,#0f0f12);overflow-y:auto;padding:0 0 40px}',
      '.jd-im-header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;background:var(--bg,#0f0f12);z-index:2}',
      '.jd-im-back{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.14);background:transparent;color:inherit;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '.jd-im-title{font-size:17px;font-weight:600}',
      '.jd-im-body{padding:18px 16px;max-width:640px;margin:0 auto}',
      '.jd-im-h{font-size:15px;font-weight:600;margin:0 0 6px}',
      '.jd-im-sub{font-size:13.5px;opacity:.65;line-height:1.5;margin:0 0 12px}',
      '.jd-im-promptbox{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:12px;font-size:13px;line-height:1.55;max-height:180px;overflow-y:auto;white-space:pre-wrap;margin-bottom:10px}',
      '.jd-im-copybtn{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px 14px;font-size:14px;font-weight:500;color:inherit;cursor:pointer;width:100%;justify-content:center;margin-bottom:26px}',
      '.jd-im-copybtn:active{background:rgba(255,255,255,.12)}',
      '.jd-im-label{font-size:13px;font-weight:600;margin:0 0 8px}',
      '.jd-im-ta{width:100%;min-height:110px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:12px;font-size:14px;color:inherit;resize:vertical;font-family:inherit;margin-bottom:12px;box-sizing:border-box}',
      '.jd-im-ta::placeholder{opacity:.4}',
      '.jd-im-addbtn{width:100%;padding:13px;border:0;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;background:var(--accent-gradient,#7c5cff);color:#fff;margin-bottom:8px}',
      '.jd-im-note{font-size:12.5px;opacity:.55;line-height:1.5;margin:0 0 30px}',
      '.jd-im-divider{border:0;border-top:1px solid rgba(255,255,255,.08);margin:0 0 22px}',
      '.jd-im-upload{display:flex;align-items:center;justify-content:space-between;gap:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:14px;margin-bottom:8px}',
      '.jd-im-upload-info{flex:1}',
      '.jd-im-upload-t{font-size:14.5px;font-weight:600;margin:0 0 4px}',
      '.jd-im-upload-s{font-size:12.5px;opacity:.6;line-height:1.45;margin:0}',
      '.jd-im-addsmall{min-width:64px;padding:9px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.07);color:inherit;font-size:14px;font-weight:500;cursor:pointer}',
      '.jd-im-addsmall:active{background:rgba(255,255,255,.13)}',
      '.jd-im-status{font-size:13px;padding:10px 12px;border-radius:10px;margin:10px 0;display:none}',
      '.jd-im-status.ok{display:block;background:rgba(52,211,153,.12);border:1px solid rgba(52,211,153,.3);color:#6ee7b7}',
      '.jd-im-status.err{display:block;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.3);color:#fca5a5}',
      'body.theme-light .jd-im-page{background:#fff}',
      'body.theme-light .jd-im-header{background:#fff;border-bottom-color:rgba(0,0,0,.08)}',
      'body.theme-light .jd-im-promptbox,body.theme-light .jd-im-ta{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.1)}',
      'body.theme-light .jd-im-copybtn,body.theme-light .jd-im-addsmall{background:rgba(0,0,0,.05);border-color:rgba(0,0,0,.1)}',
      'body.theme-light .jd-im-upload{background:rgba(0,0,0,.03);border-color:rgba(0,0,0,.08)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ---------------- toast ---------------- */
  function toast(msg) {
    try {
      if (typeof window.showJdToast === 'function') { window.showJdToast(msg); return; }
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#222;color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;z-index:99999;opacity:0;transition:opacity .25s';
      document.body.appendChild(t);
      requestAnimationFrame(function () { t.style.opacity = '1'; });
      setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 2200);
    } catch (e) {}
  }

  function setStatus(ok, msg) {
    var el = document.getElementById('jdImStatus');
    if (!el) return;
    el.className = 'jd-im-status ' + (ok ? 'ok' : 'err');
    el.textContent = msg;
  }

  /* ---------------- Add memory ---------------- */
  function addMemory() {
    var ta = document.getElementById('jdImTextarea');
    if (!ta) return;
    var text = ta.value.trim();
    if (!text) { setStatus(false, 'Paste the AI response first.'); return; }
    try {
      // Append to the app's memory summary (jepong_personalization)
      var raw = null;
      try { raw = localStorage.getItem('jepong_personalization'); } catch (e) {}
      var p = {};
      try { p = raw ? JSON.parse(raw) : {}; } catch (e) { p = {}; }
      var existing = (p.memorySummary || '').trim();
      var header = '\n\n--- Imported memory (' + new Date().toLocaleDateString() + ') ---\n';
      p.memorySummary = (existing ? existing + header : text);
      if (existing) p.memorySummary = existing + header + text;
      try { localStorage.setItem('jepong_personalization', JSON.stringify(p)); } catch (e) {}
      // Also update the live settings object if present
      try {
        if (window.personalizationSettings) window.personalizationSettings.memorySummary = p.memorySummary;
      } catch (e) {}
      ta.value = '';
      setStatus(true, 'Memory added! JepongDevxyz AI will remember these facts.');
      toast('Memory imported');
    } catch (e) {
      setStatus(false, 'Could not save memory. Please try again.');
    }
  }

  function copyPrompt() {
    var done = function () {
      toast('Prompt copied');
      var b = document.getElementById('jdImCopyBtn');
      if (b) { var orig = b.innerHTML; b.innerHTML = 'Copied!'; setTimeout(function () { b.innerHTML = orig; }, 1500); }
    };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(MIGRATION_PROMPT).then(done, function () { fallbackCopy(done); });
      } else fallbackCopy(done);
    } catch (e) { fallbackCopy(done); }
  }

  function fallbackCopy(done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = MIGRATION_PROMPT;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      done();
    } catch (e) { toast('Copy failed — long-press the prompt to copy'); }
  }

  /* ---------------- Import chats (.zip) ---------------- */
  function loadJsZip(cb) {
    if (window.JSZip) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = cb;
    s.onerror = function () { setStatus(false, 'Could not load zip reader. Check your connection.'); };
    document.head.appendChild(s);
  }

  function importChats(file) {
    if (!file) return;
    if (!/\.zip$/i.test(file.name)) { setStatus(false, 'Please choose a .zip file.'); return; }
    setStatus(true, 'Reading ' + file.name + '...');
    loadJsZip(function () {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          window.JSZip.loadAsync(reader.result).then(function (zip) {
            // ChatGPT: conversations.json — Claude: conversations.json — try common names
            var names = Object.keys(zip.files);
            var convFile = names.find(function (n) { return /conversations\.json$/i.test(n); })
              || names.find(function (n) { return /\.json$/i.test(n) && n.toLowerCase().indexOf('chat') !== -1; });
            if (!convFile) { setStatus(false, 'No conversations.json found in the zip.'); return; }
            zip.files[convFile].async('string').then(function (text) {
              try { parseAndImport(text); }
              catch (e) { setStatus(false, 'Could not parse the export file.'); }
            });
          }).catch(function () { setStatus(false, 'Could not read the zip file.'); });
        } catch (e) { setStatus(false, 'Could not read the zip file.'); }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  function parseAndImport(text) {
    var data = JSON.parse(text);
    var convs = Array.isArray(data) ? data : (data.conversations || data.items || []);
    if (!convs.length) { setStatus(false, 'No conversations found in the file.'); return; }

    var sessions = {};
    try { sessions = JSON.parse(localStorage.getItem('jepong_ai_chats') || '{}'); } catch (e) { sessions = {}; }

    var imported = 0;
    convs.forEach(function (c) {
      try {
        var msgs = extractMessages(c);
        if (!msgs.length) return;
        var id = 'imported_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        var title = (c.title || msgs[0].text || 'Imported chat').toString().slice(0, 60);
        sessions[id] = {
          id: id,
          title: title,
          messages: msgs.slice(0, 200),
          pinned: false,
          importedAt: Date.now(),
          importedFrom: 'zip'
        };
        imported++;
      } catch (e) {}
    });

    try { localStorage.setItem('jepong_ai_chats', JSON.stringify(sessions)); } catch (e) {
      setStatus(false, 'Not enough storage to import chats.');
      return;
    }
    // Refresh sidebar if the function exists
    try { if (typeof window.renderHistoryList === 'function') window.renderHistoryList(); } catch (e) {}
    try { if (typeof window.loadChatSessions === 'function') window.loadChatSessions(); } catch (e) {}
    setStatus(true, 'Imported ' + imported + ' conversation' + (imported === 1 ? '' : 's') + '! Check your sidebar.');
    toast(imported + ' chats imported');
  }

  function extractMessages(c) {
    var out = [];
    try {
      // ChatGPT format: mapping of nodes with message.author.role + message.content.parts
      if (c.mapping && typeof c.mapping === 'object') {
        Object.keys(c.mapping).forEach(function (k) {
          var node = c.mapping[k];
          var m = node && node.message;
          if (!m || !m.content) return;
          var role = m.author && m.author.role;
          var parts = m.content.parts;
          var text = Array.isArray(parts) ? parts.filter(function (p) { return typeof p === 'string'; }).join('\n') : '';
          if (!text.trim()) return;
          if (role === 'user') out.push({ role: 'user', text: text });
          else if (role === 'assistant') out.push({ role: 'bot', text: text });
        });
      }
      // Generic: messages array with role/content
      else if (Array.isArray(c.messages)) {
        c.messages.forEach(function (m) {
          var role = m.role || (m.sender === 'human' ? 'user' : 'bot');
          var text = m.content || m.text || '';
          if (typeof text !== 'string') return;
          if (!text.trim()) return;
          out.push({ role: role === 'user' ? 'user' : 'bot', text: text });
        });
      }
      // Claude/Gemini-ish: array of turns
      else if (Array.isArray(c.chat_messages)) {
        c.chat_messages.forEach(function (m) {
          var text = m.text || m.content || '';
          if (typeof text !== 'string' || !text.trim()) return;
          out.push({ role: /human|user/i.test(m.sender || m.role || '') ? 'user' : 'bot', text: text });
        });
      }
    } catch (e) {}
    return out;
  }

  /* ---------------- page ---------------- */
  function openPage() {
    injectCss();
    closePage();
    var page = document.createElement('div');
    page.className = 'jd-im-page';
    page.id = 'jdImportMemoryPage';
    page.innerHTML =
      '<div class="jd-im-header">' +
        '<button class="jd-im-back" id="jdImBack" aria-label="Back">&#8592;</button>' +
        '<div class="jd-im-title">Import memory to JepongDevxyz AI</div>' +
      '</div>' +
      '<div class="jd-im-body">' +
        '<p class="jd-im-h">Copy this prompt into a chat with your other AI provider, then paste the response below.</p>' +
        '<p class="jd-im-sub">Works with ChatGPT, Claude, Gemini, Meta AI, or any assistant you have history with.</p>' +
        '<div class="jd-im-promptbox" id="jdImPromptBox"></div>' +
        '<button class="jd-im-copybtn" id="jdImCopyBtn">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
          'Copy prompt' +
        '</button>' +
        '<p class="jd-im-label">Paste the response here</p>' +
        '<textarea class="jd-im-ta" id="jdImTextarea" placeholder="Paste your info here..."></textarea>' +
        '<button class="jd-im-addbtn" id="jdImAddBtn">Add memory</button>' +
        '<p class="jd-im-note">JepongDevxyz AI will read this and remember the durable facts. This is not a verbatim copy — only lasting facts are kept.</p>' +
        '<div class="jd-im-status" id="jdImStatus"></div>' +
        '<hr class="jd-im-divider">' +
        '<p class="jd-im-h">Import chats</p>' +
        '<p class="jd-im-sub">Export your chats from a supported AI assistant and upload the .zip file.</p>' +
        '<div class="jd-im-upload">' +
          '<div class="jd-im-upload-info">' +
            '<p class="jd-im-upload-t">Chat export file</p>' +
            '<p class="jd-im-upload-s">Supported: ChatGPT, Claude, Gemini, Meta AI (.zip)</p>' +
          '</div>' +
          '<button class="jd-im-addsmall" id="jdImAddFile">Add</button>' +
          '<input type="file" id="jdImFileInput" accept=".zip" style="display:none">' +
        '</div>' +
      '</div>';
    document.body.appendChild(page);
    document.getElementById('jdImPromptBox').textContent = MIGRATION_PROMPT;
    document.getElementById('jdImBack').addEventListener('click', closePage);
    document.getElementById('jdImCopyBtn').addEventListener('click', copyPrompt);
    document.getElementById('jdImAddBtn').addEventListener('click', addMemory);
    document.getElementById('jdImAddFile').addEventListener('click', function () {
      document.getElementById('jdImFileInput').click();
    });
    document.getElementById('jdImFileInput').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importChats(e.target.files[0]);
      e.target.value = '';
    });
  }

  function closePage() {
    var p = document.getElementById('jdImportMemoryPage');
    if (p) p.remove();
  }

  window.jdOpenImportMemory = openPage;
  window.jdCloseImportMemory = closePage;

  /* ---------------- settings button ---------------- */
  // Insert the "Import Memory" row into AI & Tools between
  // "Custom API Keys" and "Web Search". Runs on an interval
  // because settings DOM is built lazily.
  function titleOf(row) {
    try {
      var s = row.querySelector('strong');
      return s ? s.textContent.trim() : '';
    } catch (e) { return ''; }
  }

  function ensureButton() {
    try {
      if (document.querySelector('[data-jd-import-memory-row]')) return;
      var rows = Array.prototype.slice.call(document.querySelectorAll('.settings-nav-row, button.settings-row'));
      var anchor = null;
      rows.forEach(function (r) {
        var t = titleOf(r);
        if (t === 'Custom API Keys') anchor = r;
      });
      if (!anchor || !anchor.parentNode) return;
      var btn = document.createElement('button');
      btn.className = anchor.className;
      btn.type = 'button';
      btn.setAttribute('data-jd-import-memory-row', '1');
      btn.innerHTML = '<i data-lucide="brain"></i><span><strong>Import Memory</strong></span><i data-lucide="chevron-right"></i>';
      btn.addEventListener('click', function () {
        try { if (typeof closeSettingsModal === 'function') closeSettingsModal(); } catch (e) {}
        setTimeout(openPage, 60);
      });
      anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) {}
    } catch (e) {}
  }

  setInterval(ensureButton, 1500);
  setTimeout(ensureButton, 800);
})();
