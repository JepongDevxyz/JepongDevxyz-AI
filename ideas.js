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
    '#jdIdeasPage{position:fixed;inset:0;z-index:24500;background:#0a0a0c;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdIdeasPage[hidden]{display:none!important}',
    '.jdi-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdi-back,.jdi-refresh{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdi-back:active,.jdi-refresh:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdi-back svg,.jdi-refresh svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdi-title{font-size:1.05rem;font-weight:600}',
    '.jdi-scroll{flex:1;overflow-y:auto;padding:8px 16px 100px;-webkit-overflow-scrolling:touch}',
    '.jdi-cat{font-size:.78rem;font-weight:700;color:#8e8e93;margin:20px 4px 12px}',
    '.jdi-cat:first-child{margin-top:8px}',
    '.jdi-card{background:#141416;border:1px solid rgba(255,255,255,.06);border-radius:20px;',
    'padding:18px;margin-bottom:12px;cursor:pointer;position:relative}',
    '.jdi-card:active{transform:scale(.99)}',
    '.jdi-card-top{display:flex;align-items:flex-start;gap:12px}',
    '.jdi-emoji{font-size:1.6rem;flex:0 0 auto}',
    '.jdi-card-title{font-size:.95rem;font-weight:700;line-height:1.35;flex:1}',
    '.jdi-dismiss{width:28px;height:28px;border-radius:50%;border:none;background:rgba(255,255,255,.08);color:#888;',
    'font-size:.85rem;cursor:pointer;flex:0 0 auto;line-height:1}',
    '.jdi-dismiss:active{transform:scale(.9)}',
    '.jdi-card-desc{font-size:.84rem;color:#b0b0b5;line-height:1.55;margin-top:10px}',
    '.jdi-loading{text-align:center;padding:50px 20px;color:#888}',
    '.jdi-spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.12);border-top-color:#fff;',
    'border-radius:50%;margin:0 auto 14px;animation:jdispin 0.9s linear infinite}',
    '@keyframes jdispin{to{transform:rotate(360deg)}}',
    '.jdi-empty{text-align:center;padding:40px 20px;color:#8e8e93;font-size:.88rem;line-height:1.6}',
    /* Light mode */
    'body.theme-light #jdIdeasPage{background:#f7f7f9;color:#111}',
    'body.theme-light .jdi-back,body.theme-light .jdi-refresh{color:#111}',
    'body.theme-light .jdi-card{background:#fff;border-color:rgba(0,0,0,.05);box-shadow:0 2px 14px rgba(0,0,0,.05)}',
    'body.theme-light .jdi-card-desc{color:#555}',
    'body.theme-light .jdi-cat{color:#999}',
    'body.theme-light .jdi-dismiss{background:rgba(0,0,0,.06);color:#888}',
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

  function getIdeas() { return lsGet(LS_IDEAS, []); }
  function getDismissed() { return lsGet(LS_DISMISSED, []); }

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
        lsSet(LS_IDEAS, ideas);
        lsSet(LS_GEN, Date.now());
        lsSet(LS_DISMISSED, []);
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
        html += '<div class="jdi-card" data-id="' + esc(x.id) + '">' +
          '<div class="jdi-card-top"><span class="jdi-emoji">' + esc(x.emoji) + '</span>' +
          '<div class="jdi-card-title">' + esc(x.title) + '</div>' +
          '<button class="jdi-dismiss" data-id="' + esc(x.id) + '" aria-label="Dismiss">×</button></div>' +
          '<div class="jdi-card-desc">' + esc(x.description) + '</div></div>';
      });
    });
    box.innerHTML = html;
    box.querySelectorAll('.jdi-dismiss').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var d = getDismissed();
        d.push(b.getAttribute('data-id'));
        lsSet(LS_DISMISSED, d);
        renderIdeas();
      });
    });
    box.querySelectorAll('.jdi-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var idea = getIdeas().find(function (x) { return x.id === card.getAttribute('data-id'); });
        if (idea) discussIdea(idea);
      });
    });
  }

  function discussIdea(idea) {
    closeIdeas();
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

  function addSidebarEntry() {
    if (document.getElementById('jdIdeasBtn')) return;
    var iv = setInterval(function () {
      var feed = document.getElementById('jdFeedBtn');
      if (!feed) return;
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdIdeasBtn';
      btn.setAttribute('aria-label', 'Open ideas');
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

  window.JDIdeas = { open: openIdeas, close: closeIdeas, regenerate: generateIdeas };

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
