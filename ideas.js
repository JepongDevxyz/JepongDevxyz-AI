/* JepongDevxyz AI — Ideas Tab (2026-10-04)
   Muse-app-style Ideas tab with ACTUAL FUNCTION:
   - AI-generated idea cards personalized per user account, based on
     the user's projects, goals, and app context
   - Organized by category (Productivity, Financial Management,
     Relationships, Shopping, Health & Fitness, Development)
   - Each card: emoji, title, description; tap to discuss in main chat
   - Dismiss ideas (×); regenerate via refresh
   - Per-user cache in localStorage
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdIdeas) return;
  window.__jdIdeas = true;

  var LS_IDEAS = 'jd_ideas_v1';
  var LS_GEN = 'jd_ideas_generated_at_v1';
  var LS_DISMISSED = 'jd_ideas_dismissed_v1';

  var CSS = [
    '#jdIdeasPage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdIdeasPage[hidden]{display:none!important}',
    '.jdi-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdi-back,.jdi-refresh{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdi-back:active,.jdi-refresh:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdi-back svg,.jdi-refresh svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdi-title{font-size:1.05rem;font-weight:600}',
    '.jdi-scroll{flex:1;overflow-y:auto;padding:8px 0 100px;-webkit-overflow-scrolling:touch}',
    /* Category headers — large white text (Muse-app parity) */
    '.jdi-cat{font-size:1.35rem;font-weight:700;color:#fff;margin:24px 16px 6px;letter-spacing:-.01em}',
    '.jdi-cat:first-child{margin-top:8px}',
    /* Idea rows — FLAT, no cards, thin dividers */
    '.jdi-row{display:flex;gap:14px;padding:16px;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer}',
    '.jdi-row:active{background:rgba(255,255,255,.03)}',
    '.jdi-emoji{font-size:1.9rem;flex:0 0 auto;line-height:1.3}',
    '.jdi-row-body{flex:1;min-width:0}',
    '.jdi-row-title{font-size:1rem;font-weight:700;color:#fff;line-height:1.4;margin-bottom:6px}',
    '.jdi-row-desc{font-size:.88rem;color:#8e8e93;line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;',
    '-webkit-box-orient:vertical;overflow:hidden}',
    '.jdi-loading{text-align:center;padding:50px 20px;color:#888}',
    '.jdi-spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.12);border-top-color:#fff;',
    'border-radius:50%;margin:0 auto 14px;animation:jdispin 0.9s linear infinite}',
    '@keyframes jdispin{to{transform:rotate(360deg)}}',
    '.jdi-empty{text-align:center;padding:40px 20px;color:#8e8e93;font-size:.88rem;line-height:1.6}',
    '.jdi-pane-refresh{text-align:center;padding:6px 0 12px}',
    /* Light mode */
    'body.theme-light #jdIdeasPage{background:#f7f7f9;color:#111}',
    'body.theme-light .jdi-back,body.theme-light .jdi-refresh{color:#111}',
    'body.theme-light .jdi-cat{color:#999}',
    'body.theme-light .jdi-spinner{border-color:rgba(0,0,0,.1);border-top-color:#111}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.1h6c0-.7.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>'
  };

  function ensureCSS() {
    var old = document.getElementById('jdiCss');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'jdiCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function lsGet(k, fb) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? fb : v; } catch (e) { return fb; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function getIdeas() { return lsGet(ideasKey(), []); }
  function getDismissed() { return lsGet(dismissedKey(), []); }

  /* Per-account scoping — same scheme as the Feed. */
  function accountId() {
    try {
      if (typeof cloudUser !== 'undefined' && cloudUser && cloudUser.id) return 'a:' + cloudUser.id;
    } catch (e) {}
    try {
      if (window.__jdCloudUser && window.__jdCloudUser.id) return 'a:' + window.__jdCloudUser.id;
    } catch (e) {}
    try {
      var d = localStorage.getItem('jd_device_id_v1');
      if (!d) {
        d = 'd:' + Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem('jd_device_id_v1', d);
      }
      return d;
    } catch (e) { return 'd:guest'; }
  }
  function ideasKey() { return LS_IDEAS + ':' + accountId(); }
  function dismissedKey() { return LS_DISMISSED + ':' + accountId(); }
  function genKey() { return LS_GEN + ':' + accountId(); }

  function userContext() {
    var parts = [];
    try {
      var gs = (window.__jdGoalsList || []).filter(function (g) { return g.status === 'active'; });
      if (gs.length) parts.push('Active goals: ' + gs.map(function (g) { return g.title; }).join('; '));
    } catch (e) {}
    parts.push('User projects: JepongDevxyz AI (AI chatbot web app, needs production polish), DevxyzIDE (Android IDE), DevxyzBrowser (needs VPN + extensions), DevxyzCrate (video editor), Potato Corner POS web app, Website-to-APK builder.');
    return parts.join('\n');
  }

  var generating = false;
  async function generateIdeas() {
    if (generating) return;
    generating = true;
    renderLoading();
    var prompt =
      'Generate personalized idea cards for this user. Context:\n' + userContext() +
      '\n\nGenerate exactly 10 ideas across these categories: Productivity, Development, Financial Management, Health & Fitness, Relationships. ' +
      'Each idea must be concrete and actionable for THIS user\'s projects and life. ' +
      'Phrase the title as a capability ("I can ..."). Keep descriptions to 2 sentences, practical and specific. ' +
      'Return ONLY a JSON array, no other text, no markdown fences. ' +
      'Each item: {"emoji":"single emoji","category":"one of the categories above","title":"I can ...","description":"..."}';
    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          personalization: { customInstructions: '[jd-ideas-gen]\nRespond with ONLY the JSON array. No explanations.' }
        })
      });
      var data = await res.json();
      var text = typeof data === 'string' ? data : (data.text || data.content || data.message || '');
      var ideas = parseIdeas(text);
      if (ideas.length) {
        ideas = ideas.map(function (x, i) {
          return {
            id: 'idea_' + Date.now() + '_' + i,
            emoji: x.emoji || '💡', category: x.category || 'Productivity',
            title: String(x.title || '').slice(0, 120),
            description: String(x.description || '').slice(0, 400)
          };
        });
        lsSet(ideasKey(), ideas);
        lsSet(genKey(), Date.now());
        lsSet(dismissedKey(), []);
      }
    } catch (e) {}
    generating = false;
    renderIdeas();
  }

  function parseIdeas(text) {
    try {
      var t = String(text).trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      var arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.filter(function (x) { return x && x.title; });
      var m = t.match(/\[[\s\S]*\]/);
      if (m) { arr = JSON.parse(m[0]); if (Array.isArray(arr)) return arr.filter(function (x) { return x && x.title; }); }
    } catch (e) {}
    return [];
  }

  function renderLoading() {
    var box = document.getElementById('jdiBody');
    if (box) box.innerHTML = '<div class="jdi-loading"><div class="jdi-spinner"></div>Finding ideas for you…</div>';
  }

  function renderIdeas() {
    var box = document.getElementById('jdiBody');
    if (box) renderIdeasInto(box);
  }

  /* Pane API for Explore */
  function renderIdeasInto(box) {
    if (!box) return;
    var dismissed = getDismissed();
    var ideas = getIdeas().filter(function (x) { return dismissed.indexOf(x.id) < 0; });
    if (!ideas.length) {
      box.innerHTML = '<div class="jdi-empty">No ideas right now.<br>Tap refresh and I\'ll find some for you.</div>';
      return;
    }
    var cats = [];
    ideas.forEach(function (x) { if (cats.indexOf(x.category) < 0) cats.push(x.category); });
    var html = '';
    cats.forEach(function (c) {
      html += '<div class="jdi-cat">' + esc(c) + '</div>';
      ideas.filter(function (x) { return x.category === c; }).forEach(function (x) {
        html += '<div class="jdi-row" data-id="' + esc(x.id) + '">' +
          '<span class="jdi-emoji">' + esc(x.emoji) + '</span>' +
          '<div class="jdi-row-body">' +
          '<div class="jdi-row-title">' + esc(x.title) + '</div>' +
          '<div class="jdi-row-desc">' + esc(x.description) + '</div>' +
          '</div></div>';
      });
    });
    box.innerHTML = html;
    box.querySelectorAll('.jdi-row').forEach(function (row) {
      row.addEventListener('click', function () {
        var idea = getIdeas().find(function (x) { return x.id === row.getAttribute('data-id'); });
        if (idea) discussIdea(idea);
      });
    });
  }

  /* Mount ideas UI into an Explore pane */
  function mountPane(container) {
    ensureCSS();
    container.innerHTML = '<div class="jdi-pane-refresh"><button class="jdf-pane-btn" id="jdiPaneRefresh">↻ New ideas</button></div><div class="jdi-pane-list"></div>';
    var listBox = container.querySelector('.jdi-pane-list');
    function refresh() {
      if (!getIdeas().length) {
        listBox.innerHTML = '<div class="jdi-loading"><div class="jdi-spinner"></div>Finding ideas for you…</div>';
        generateIdeasInto(listBox);
      } else renderIdeasInto(listBox);
    }
    var rb = container.querySelector('#jdiPaneRefresh');
    if (rb) rb.addEventListener('click', function () { generateIdeasInto(listBox); });
    refresh();
    return refresh;
  }

  async function generateIdeasInto(listBox) {
    await generateIdeas();
    if (listBox) renderIdeasInto(listBox);
  }

  function discussIdea(idea) {
    closeIdeas();
    try { if (window.JDExplore) window.JDExplore.close(); } catch (e) {}
    try { if (window.JDMainChat) window.JDMainChat.open(); } catch (e) {}
    setTimeout(function () {
      try {
        var input = document.querySelector('textarea[jd-composer], #jdComposerInput, textarea[placeholder*="Message"]');
        if (input) {
          input.value = idea.title + ': ' + idea.description;
          input.focus();
        }
      } catch (e) {}
    }, 600);
  }

  function buildPage() {
    var p = document.getElementById('jdIdeasPage');
    if (p) { ensureCSS(); return; }
    p = document.createElement('div');
    p.id = 'jdIdeasPage';
    p.hidden = true;
    p.innerHTML =
      '<div class="jdi-header">' +
      '<button class="jdi-back" id="jdiBack" aria-label="Back">' + I.back + '</button>' +
      '<div class="jdi-title">Ideas</div>' +
      '<button class="jdi-refresh" id="jdiRefresh" aria-label="Refresh">' + I.refresh + '</button>' +
      '</div>' +
      '<div class="jdi-scroll" id="jdiBody"></div>';
    document.body.appendChild(p);
    document.getElementById('jdiBack').addEventListener('click', closeIdeas);
    document.getElementById('jdiRefresh').addEventListener('click', generateIdeas);
  }
  function openIdeas() {
    ensureCSS(); buildPage();
    document.getElementById('jdIdeasPage').hidden = false;
    if (!getIdeas().length) generateIdeas();
    else renderIdeas();
  }
  function closeIdeas() {
    var p = document.getElementById('jdIdeasPage');
    if (p) p.hidden = true;
  }

  var PATCH_VER = '20261004a67';

  function addSidebarEntry() {
    /* In Explore mode, the unified Explore button replaces individual entries */
    if (window.__jdExploreMode) return;
    function wire(btn) {
      var clone = btn.cloneNode(false);
      clone.id = 'jdIdeasBtn';
      clone.className = 'jd-sidebar-menu-item';
      clone.type = 'button';
      clone.setAttribute('aria-label', 'Open ideas');
      clone.setAttribute('data-jd-ver', PATCH_VER);
      clone.innerHTML = '<i data-lucide="lightbulb"></i><span>Ideas</span>';
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openIdeas();
      });
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
    }
    var existing = document.getElementById('jdIdeasBtn');
    if (existing) {
      if (existing.getAttribute('data-jd-ver') !== PATCH_VER) wire(existing);
      return;
    }
    var iv = setInterval(function () {
      var feed = document.getElementById('jdFeedBtn');
      if (!feed) return;
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdIdeasBtn';
      btn.setAttribute('aria-label', 'Open ideas');
      btn.setAttribute('data-jd-ver', PATCH_VER);
      btn.innerHTML = '<i data-lucide="lightbulb"></i><span>Ideas</span>';
      btn.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openIdeas();
      });
      feed.parentNode.insertBefore(btn, feed.nextSibling);
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
      clearInterval(iv);
    }, 1200);
    setTimeout(function () { clearInterval(iv); }, 30000);
  }

  /* Persistent self-heal */
  try {
    setInterval(function () {
      try {
        var b = document.getElementById('jdIdeasBtn');
        if (!b || b.getAttribute('data-jd-ver') !== PATCH_VER) addSidebarEntry();
      } catch (e) {}
    }, 10000);
  } catch (e) {}

  window.JDIdeas = { open: openIdeas, close: closeIdeas, regenerate: generateIdeas, ver: PATCH_VER, mountPane: mountPane };

  try {
    window.addEventListener('jd:account-changed', function () {
      var p = document.getElementById('jdIdeasPage');
      if (p && !p.hidden) {
        if (!getIdeas().length) generateIdeas();
        else renderIdeas();
      }
    });
  } catch (e) {}

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
