/* JepongDevxyz AI — Feed v3 (2026-10-04)
   Real editorial feed with ACTUAL FUNCTION (Muse-app parity):
   - Feed brief editor ("Feed instructions") — user-editable prompt that
     powers generation, like the video
   - AI-generated posts via /api/chat: personalized per user account,
     based on the brief + the user's goals/projects
   - Editorial post cards: emoji, kicker category, headline, body,
     timestamp, Discuss button (opens main chat about the post)
   - Per-user cache in localStorage; regenerates daily or on demand
   - Pull the refresh button to regenerate
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdFeedV3) return;
  window.__jdFeedV3 = true;
  window.__jdFeed = true; /* compat */

  var LS_BRIEF = 'jd_feed_brief_v1';
  var LS_POSTS = 'jd_feed_posts_v1';
  var LS_GEN = 'jd_feed_generated_at_v1';
  var DEFAULT_BRIEF = 'Make me a feed about my interests. Keep the tone clear and direct. Ensure it is quick to skim. Try to avoid clickbait.';

  var CSS = [
    '#jdFeedPage{position:fixed;inset:0;z-index:24500;background:#0a0a0c;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdFeedPage[hidden]{display:none!important}',
    '.jdf-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;flex:0 0 auto}',
    '.jdf-back,.jdf-refresh,.jdf-tune{width:40px;height:40px;border-radius:50%;border:none;background:transparent;color:#fff;',
    'display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdf-back:active,.jdf-refresh:active,.jdf-tune:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdf-back svg,.jdf-refresh svg,.jdf-tune svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdf-title{font-size:1.05rem;font-weight:600}',
    '.jdf-head-actions{display:flex;gap:4px}',
    '.jdf-brief-bar{margin:0 16px 8px;background:#1c1c1e;border-radius:16px;padding:12px 16px;font-size:.82rem;',
    'color:#a0a0a5;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:0 0 auto}',
    '.jdf-scroll{flex:1;overflow-y:auto;padding:8px 16px 100px;-webkit-overflow-scrolling:touch}',
    /* Post cards — editorial */
    '.jdf-post{background:#141416;border-radius:22px;padding:20px;margin-bottom:16px;border:1px solid rgba(255,255,255,.06)}',
    '.jdf-post-top{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
    '.jdf-post-emoji{font-size:1.5rem}',
    '.jdf-post-kicker{font-size:.66rem;font-weight:700;text-transform:uppercase;letter-spacing:.14em;color:#8e8e93}',
    '.jdf-post-time{font-size:.7rem;color:#666;margin-left:auto;flex:0 0 auto}',
    '.jdf-post-headline{font-size:1.12rem;font-weight:800;line-height:1.3;letter-spacing:-.01em;margin-bottom:10px}',
    '.jdf-post-body{font-size:.88rem;color:#c5c5c9;line-height:1.6}',
    '.jdf-post-body a{color:#5eb0ff;text-decoration:underline}',
    '.jdf-post-actions{display:flex;gap:8px;margin-top:14px}',
    '.jdf-discuss{border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;font-size:.8rem;',
    'font-weight:600;border-radius:20px;padding:8px 18px;cursor:pointer}',
    '.jdf-discuss:active{transform:scale(.96);background:rgba(255,255,255,.08)}',
    /* Brief editor sheet */
    '#jdfBriefSheet{position:fixed;inset:0;z-index:24600;display:none}',
    '#jdfBriefSheet.open{display:block}',
    '.jdf-bs-bg{position:absolute;inset:0;background:rgba(0,0,0,.6)}',
    '.jdf-bs-body{position:absolute;left:0;right:0;bottom:0;background:#1c1c1e;border-radius:24px 24px 0 0;',
    'padding:22px 20px 34px}',
    '.jdf-bs-title{font-size:1.02rem;font-weight:700;margin-bottom:6px}',
    '.jdf-bs-desc{font-size:.82rem;color:#999;line-height:1.5;margin-bottom:14px}',
    '.jdf-bs-text{width:100%;min-height:110px;background:#2c2c2e;border:none;border-radius:14px;padding:14px 16px;',
    'font-size:.9rem;color:#fff;font-family:inherit;resize:vertical;box-sizing:border-box;margin-bottom:16px}',
    '.jdf-bs-text:focus{outline:1px solid rgba(255,255,255,.25)}',
    '.jdf-bs-row{display:flex;gap:10px}',
    '.jdf-bs-btn{flex:1;border:none;border-radius:16px;padding:14px;font-size:.92rem;font-weight:700;cursor:pointer}',
    '.jdf-bs-btn.cancel{background:#2c2c2e;color:#fff}',
    '.jdf-bs-btn.save{background:#fff;color:#000}',
    '.jdf-bs-btn:active{transform:scale(.98)}',
    /* Loading */
    '.jdf-loading{text-align:center;padding:50px 20px;color:#888}',
    '.jdf-spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.12);border-top-color:#fff;',
    'border-radius:50%;margin:0 auto 14px;animation:jdfspin 0.9s linear infinite}',
    '@keyframes jdfspin{to{transform:rotate(360deg)}}',
    '.jdf-empty{text-align:center;padding:40px 20px;color:#8e8e93;font-size:.88rem;line-height:1.6}',
    /* Light mode */
    'body.theme-light #jdFeedPage{background:#f7f7f9;color:#111}',
    'body.theme-light .jdf-back,body.theme-light .jdf-refresh,body.theme-light .jdf-tune{color:#111}',
    'body.theme-light .jdf-brief-bar{background:#fff;color:#666;box-shadow:0 1px 6px rgba(0,0,0,.06)}',
    'body.theme-light .jdf-post{background:#fff;border-color:rgba(0,0,0,.05);box-shadow:0 2px 14px rgba(0,0,0,.05)}',
    'body.theme-light .jdf-post-body{color:#444}',
    'body.theme-light .jdf-discuss{border-color:rgba(0,0,0,.15);color:#111}',
    'body.theme-light .jdf-bs-body{background:#fff;color:#111}',
    'body.theme-light .jdf-bs-desc{color:#777}',
    'body.theme-light .jdf-bs-text{background:#f0f0f2;color:#111}',
    'body.theme-light .jdf-bs-btn.cancel{background:#f0f0f2;color:#111}',
    'body.theme-light .jdf-bs-btn.save{background:#111;color:#fff}',
    'body.theme-light .jdf-spinner{border-color:rgba(0,0,0,.1);border-top-color:#111}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
    tune: '<svg viewBox="0 0 24 24"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>'
  };

  function ensureCSS() {
    var old = document.getElementById('jdfCss');
    if (old) old.remove();
    var st = document.createElement('style');
    st.id = 'jdfCss';
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

  function getBrief() { return lsGet(LS_BRIEF, DEFAULT_BRIEF) || DEFAULT_BRIEF; }
  function getPosts() { return lsGet(LS_POSTS, []); }
  function userKey() {
    /* per-user scoping: tie cache to the signed-in account when known */
    try {
      var em = localStorage.getItem('jepong_user_email') || localStorage.getItem('jd_user_email') || '';
      return em ? 'u:' + em : 'u:guest';
    } catch (e) { return 'u:guest'; }
  }

  function userContext() {
    var parts = [];
    try {
      var gs = (window.__jdGoalsList || []).filter(function (g) { return g.status === 'active'; });
      if (gs.length) parts.push('Active goals: ' + gs.map(function (g) { return g.title; }).join('; '));
    } catch (e) {}
    parts.push('User is a developer building: JepongDevxyz AI (AI chatbot web app), DevxyzIDE (Android IDE), DevxyzBrowser (Android browser), DevxyzCrate (video editor), Potato Corner POS web app.');
    parts.push('Interests: Android development, web development, AI assistants, gaming (Spider-Man, Dota 2, GTA V).');
    return parts.join('\n');
  }

  function timeAgo(ts) {
    try {
      var d = Math.floor((Date.now() - ts) / 3600000);
      if (d < 1) return 'just now';
      if (d === 1) return '1 hr';
      if (d < 24) return d + ' hr';
      var days = Math.floor(d / 24);
      return days === 1 ? '1 day' : days + ' days';
    } catch (e) { return ''; }
  }

  /* ---------- Generation ---------- */
  var generating = false;
  async function generatePosts() {
    if (generating) return;
    generating = true;
    renderLoading();
    var brief = getBrief();
    var prompt =
      'You are writing a personal news/ideas feed. Follow this brief:\n' + brief +
      '\n\nUser context (personalize to this user):\n' + userContext() +
      '\n\nGenerate exactly 6 feed posts. Mix: 3 tech/AI/developer news posts relevant to their interests, ' +
      '3 actionable idea posts (things the assistant can do for them, phrased as "I can ..."). ' +
      'Return ONLY a JSON array, no other text, no markdown fences. ' +
      'Each item: {"emoji":"single emoji","category":"short category like AI News or Productivity",' +
      '"headline":"clear direct headline, no clickbait","body":"2-3 sentence body, plain text, no markdown links"}.';
    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          personalization: { customInstructions: '[jd-feed-gen]\nRespond with ONLY the JSON array. No explanations.' }
        })
      });
      var data = await res.json();
      var text = '';
      if (typeof data === 'string') text = data;
      else text = data.text || data.content || data.message || JSON.stringify(data);
      var posts = parsePosts(text);
      if (posts.length) {
        var now = Date.now();
        posts = posts.map(function (p, i) {
          return {
            emoji: p.emoji || '📰', category: p.category || 'Feed',
            headline: String(p.headline || '').slice(0, 160),
            body: String(p.body || '').slice(0, 600),
            at: now - i * 3600000
          };
        });
        lsSet(LS_POSTS, posts);
        lsSet(LS_GEN, now);
        lsSet(LS_POSTS + '_' + userKey(), posts);
      }
    } catch (e) {}
    generating = false;
    renderPosts();
  }

  function parsePosts(text) {
    try {
      var t = String(text).trim();
      /* strip markdown fences if present */
      t = t.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
      var arr = JSON.parse(t);
      if (Array.isArray(arr)) return arr.filter(function (x) { return x && x.headline; });
      /* try to find an array inside */
      var m = t.match(/\[[\s\S]*\]/);
      if (m) {
        arr = JSON.parse(m[1] ? m[0] : m[0]);
        if (Array.isArray(arr)) return arr.filter(function (x) { return x && x.headline; });
      }
    } catch (e) {}
    return [];
  }

  function needsRefresh() {
    var gen = lsGet(LS_GEN, 0);
    return (Date.now() - gen) > 20 * 3600000; /* ~20h */
  }

  /* ---------- Rendering ---------- */
  function renderLoading() {
    var box = document.getElementById('jdfBody');
    if (box) box.innerHTML = '<div class="jdf-loading"><div class="jdf-spinner"></div>Generating your feed…</div>';
  }

  function renderPosts() {
    var box = document.getElementById('jdfBody');
    if (!box) return;
    var posts = getPosts();
    var brief = getBrief();
    var html = '<div class="jdf-brief-bar" id="jdfBriefBar" title="Edit feed instructions">⚙️ ' + esc(brief) + '</div>';
    if (!posts.length) {
      html += '<div class="jdf-empty">Your feed is empty.<br>Tap refresh to generate posts.</div>';
    } else {
      posts.forEach(function (p, i) {
        html += '<div class="jdf-post" data-i="' + i + '">' +
          '<div class="jdf-post-top"><span class="jdf-post-emoji">' + esc(p.emoji) + '</span>' +
          '<span class="jdf-post-kicker">' + esc(p.category) + '</span>' +
          '<span class="jdf-post-time">' + esc(timeAgo(p.at)) + '</span></div>' +
          '<div class="jdf-post-headline">' + esc(p.headline) + '</div>' +
          '<div class="jdf-post-body">' + esc(p.body) + '</div>' +
          '<div class="jdf-post-actions"><button class="jdf-discuss" data-i="' + i + '">Discuss</button></div>' +
          '</div>';
      });
    }
    box.innerHTML = html;
    var bb = document.getElementById('jdfBriefBar');
    if (bb) bb.addEventListener('click', openBriefSheet);
    box.querySelectorAll('.jdf-discuss').forEach(function (b) {
      b.addEventListener('click', function () {
        var p = getPosts()[Number(b.getAttribute('data-i'))];
        if (p) discussPost(p);
      });
    });
  }

  function discussPost(p) {
    closeFeed();
    /* route into the main chat with the post as context */
    try {
      if (window.JDMainChat) window.JDMainChat.open();
    } catch (e) {}
    setTimeout(function () {
      try {
        var box = document.querySelector('[id*="chatBox"], #chatBox, .jd-chat-box');
        var input = document.querySelector('textarea[jd-composer], #jdComposerInput, textarea[placeholder*="Message"]');
        if (input) {
          input.value = 'Tell me more about: ' + p.headline;
          input.focus();
        }
      } catch (e) {}
    }, 600);
  }

  /* ---------- Brief editor ---------- */
  function openBriefSheet() {
    var sh = document.getElementById('jdfBriefSheet');
    if (!sh) {
      sh = document.createElement('div');
      sh.id = 'jdfBriefSheet';
      document.body.appendChild(sh);
    }
    sh.innerHTML =
      '<div class="jdf-bs-bg" id="jdfBsBg"></div>' +
      '<div class="jdf-bs-body">' +
      '<div class="jdf-bs-title">Feed instructions</div>' +
      '<div class="jdf-bs-desc">Your feed is powered by the instructions below. Any edits you make to this prompt will apply to future posts on the feed.</div>' +
      '<textarea class="jdf-bs-text" id="jdfBsText">' + esc(getBrief()) + '</textarea>' +
      '<div class="jdf-bs-row">' +
      '<button class="jdf-bs-btn cancel" id="jdfBsCancel">Cancel</button>' +
      '<button class="jdf-bs-btn save" id="jdfBsSave">Save</button>' +
      '</div></div>';
    sh.classList.add('open');
    document.getElementById('jdfBsBg').addEventListener('click', closeBriefSheet);
    document.getElementById('jdfBsCancel').addEventListener('click', closeBriefSheet);
    document.getElementById('jdfBsSave').addEventListener('click', function () {
      var v = document.getElementById('jdfBsText').value.trim() || DEFAULT_BRIEF;
      lsSet(LS_BRIEF, v);
      closeBriefSheet();
      generatePosts(); /* regenerate with the new brief */
    });
  }
  function closeBriefSheet() {
    var sh = document.getElementById('jdfBriefSheet');
    if (sh) sh.classList.remove('open');
  }

  /* ---------- Page shell ---------- */
  function buildPage() {
    var p = document.getElementById('jdFeedPage');
    if (p) { ensureCSS(); return; }
    p = document.createElement('div');
    p.id = 'jdFeedPage';
    p.hidden = true;
    p.innerHTML =
      '<div class="jdf-header">' +
      '<button class="jdf-back" id="jdfBack" aria-label="Back">' + I.back + '</button>' +
      '<div class="jdf-title">Feed</div>' +
      '<div class="jdf-head-actions">' +
      '<button class="jdf-tune" id="jdfTune" aria-label="Feed instructions">' + I.tune + '</button>' +
      '<button class="jdf-refresh" id="jdfRefresh" aria-label="Refresh">' + I.refresh + '</button>' +
      '</div></div>' +
      '<div class="jdf-scroll" id="jdfBody"></div>';
    document.body.appendChild(p);
    document.getElementById('jdfBack').addEventListener('click', closeFeed);
    document.getElementById('jdfRefresh').addEventListener('click', generatePosts);
    document.getElementById('jdfTune').addEventListener('click', openBriefSheet);
  }
  function openFeed() {
    ensureCSS(); buildPage();
    document.getElementById('jdFeedPage').hidden = false;
    var posts = getPosts();
    if (!posts.length || needsRefresh()) generatePosts();
    else renderPosts();
  }
  function closeFeed() {
    var p = document.getElementById('jdFeedPage');
    if (p) p.hidden = true;
  }

  function addSidebarEntry() {
    if (document.getElementById('jdFeedBtn')) return;
    var iv = setInterval(function () {
      var main = document.getElementById('jdMainChatBtn');
      if (!main) return;
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdFeedBtn';
      btn.setAttribute('aria-label', 'Open feed');
      btn.innerHTML = '<i data-lucide="newspaper"></i><span>Feed</span>';
      btn.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openFeed();
      });
      main.parentNode.insertBefore(btn, main.nextSibling);
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
      clearInterval(iv);
    }, 1200);
    setTimeout(function () { clearInterval(iv); }, 30000);
  }

  window.JDFeed = { open: openFeed, close: closeFeed, render: renderPosts, regenerate: generatePosts };

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
