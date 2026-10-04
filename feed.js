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
  var CACHE_VER = 'v3-images'; /* bump when post schema changes */
  var DEFAULT_BRIEF = 'Make me a feed about my interests. Keep the tone clear and direct. Ensure it is quick to skim. Try to avoid clickbait.';

  var CSS = [
    '#jdFeedPage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
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
    '.jdf-scroll{flex:1;overflow-y:auto;padding:8px 0 100px;-webkit-overflow-scrolling:touch}',
    /* Post rows — FLAT, no cards, thin dividers (Muse-app pixel parity) */
    '.jdf-post{padding:0 0 18px;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer}',
    '.jdf-post:active{background:rgba(255,255,255,.03)}',
    '.jdf-post-hero{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#1a1a1c}',
    '.jdf-post-hero-wrap{margin:0 0 14px;overflow:hidden}',
    '.jdf-post-pad{padding:0 16px}',
    '.jdf-post-top{display:flex;align-items:flex-start;gap:12px;margin-bottom:8px}',
    '.jdf-post-emoji{font-size:1.9rem;flex:0 0 auto;line-height:1.2}',
    '.jdf-post-headwrap{flex:1;min-width:0}',
    '.jdf-post-kicker{font-size:.68rem;font-weight:600;color:#888;margin-bottom:4px}',
    '.jdf-post-headline{font-size:1.02rem;font-weight:700;line-height:1.35;letter-spacing:-.01em;color:#fff}',
    '.jdf-post-time{font-size:.72rem;color:#666;flex:0 0 auto;margin-top:2px}',
    '.jdf-post-body{font-size:.9rem;color:#a0a0a5;line-height:1.6;margin:0 0 0 0;padding-left:0}',
    '.jdf-post-body a{color:#5eb0ff;text-decoration:underline}',
    /* Action icon row: comment, bookmark, idea, check, share */
    '.jdf-post-actions{display:flex;align-items:center;gap:26px;margin-top:14px;padding-left:2px}',
    '.jdf-act-btn{background:none;border:none;color:#888;cursor:pointer;padding:4px;display:flex;align-items:center}',
    '.jdf-act-btn:active{transform:scale(.9);color:#fff}',
    '.jdf-act-btn svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.jdf-act-btn.on{color:#fff}',
    '.jdf-act-btn.on svg{fill:currentColor}',
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
    /* Pane styles for Explore embedding */
    '.jdf-pane-refresh{text-align:center;padding:6px 0 12px}',
    '.jdf-pane-btn{border:1px solid rgba(255,255,255,.15);background:transparent;color:#fff;font-size:.8rem;',
    'font-weight:600;border-radius:20px;padding:8px 18px;cursor:pointer}',
    '.jdf-pane-btn:active{transform:scale(.96)}',
    'body.theme-light .jdf-pane-btn{border-color:rgba(0,0,0,.15);color:#111}',
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
    tune: '<svg viewBox="0 0 24 24"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    bookmark: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>',
    bulb: '<svg viewBox="0 0 24 24"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.1h6c0-.7.4-1.6 1-2.1A7 7 0 0 0 12 2z"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>'
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

  function getBrief() { return lsGet(briefKey(), DEFAULT_BRIEF) || DEFAULT_BRIEF; }
  function getPosts() {
    var posts = lsGet(postsKey(), []);
    if (!posts.length) return posts;
    /* migrate: old cached posts lack hero images → force regeneration */
    if (!posts[0].image) return [];
    var cv = null;
    try { cv = localStorage.getItem(postsKey() + ':cver'); } catch (e) {}
    if (cv !== CACHE_VER) return [];
    return posts;
  }

  /* Per-account scoping: every cache key is namespaced by the signed-in
     account (Supabase cloudUser.id). Guests fall back to a device id.
     When the account changes, keys change too — no cross-account leaks. */
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
  function briefKey() { return LS_BRIEF + ':' + accountId(); }
  function postsKey() { return LS_POSTS + ':' + accountId(); }
  function genKey() { return LS_GEN + ':' + accountId(); }
  function userKey() { return accountId(); } /* compat */

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

  /* Build a Pollinations hero image URL (free, no API key — same fallback
     the app itself uses for image generation). Deterministic per prompt. */
  function heroImageUrl(imagePrompt) {
    try {
      var q = encodeURIComponent(String(imagePrompt || '').slice(0, 200));
      if (!q) return '';
      return 'https://image.pollinations.ai/prompt/' + q +
        '?width=800&height=450&nologo=true&model=flux&seed=' +
        (hashStr(q) % 100000);
    } catch (e) { return ''; }
  }
  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) - h + s.charCodeAt(i)) | 0; }
    return Math.abs(h);
  }
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
      '"headline":"clear direct headline, no clickbait","body":"2-3 sentence body, plain text, no markdown links",' +
      '"image_prompt":"short visual description for a hero image, e.g. \'futuristic AI chip glowing blue\'"}.';
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
            image: heroImageUrl(p.image_prompt || (p.category + ' ' + p.headline)),
            at: now - i * 3600000
          };
        });
        lsSet(postsKey(), posts);
        try { localStorage.setItem(postsKey() + ':cver', CACHE_VER); } catch (e) {}
        lsSet(genKey(), now);
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
    var gen = lsGet(genKey(), 0);
    return (Date.now() - gen) > 20 * 3600000; /* ~20h */
  }

  /* ---------- Rendering ---------- */
  function renderLoading() {
    var box = document.getElementById('jdfBody');
    if (box) box.innerHTML = '<div class="jdf-loading"><div class="jdf-spinner"></div>Generating your feed…</div>';
  }

  function renderPosts() {
    var box = document.getElementById('jdfBody');
    if (box) renderPostsInto(box);
  }

  /* Pane API for the unified Explore page: renders feed UI into any container */
  function renderPostsInto(box) {
    if (!box) return;
    var posts = getPosts();
    var brief = getBrief();
    var html = '<div class="jdf-brief-bar" id="jdfBriefBar" title="Edit feed instructions">⚙️ ' + esc(brief) + '</div>';
    if (!posts.length) {
      html += '<div class="jdf-empty">Your feed is empty.<br>Tap refresh to generate posts.</div>';
    } else {
      posts.forEach(function (p, i) {
        var heroHtml = '';
        if (p.image) {
          heroHtml = '<div class="jdf-post-hero-wrap"><img class="jdf-post-hero" src="' + esc(p.image) + '" loading="lazy" alt=""/></div>';
        }
        html += '<div class="jdf-post" data-i="' + i + '">' + heroHtml +
          '<div class="jdf-post-pad"><div class="jdf-post-top"><span class="jdf-post-emoji">' + esc(p.emoji) + '</span>' +
          '<div class="jdf-post-headwrap">' +
          '<div class="jdf-post-kicker">' + esc(p.category) + '</div>' +
          '<div class="jdf-post-headline">' + esc(p.headline) + '</div>' +
          '</div>' +
          '<span class="jdf-post-time">' + esc(timeAgo(p.at)) + '</span></div>' +
          '<div class="jdf-post-body">' + esc(p.body) + '</div>' +
          '<div class="jdf-post-actions">' +
          '<button class="jdf-act-btn" data-act="discuss" data-i="' + i + '" aria-label="Discuss">' + I.comment + '</button>' +
          '<button class="jdf-act-btn" data-act="save" data-i="' + i + '" aria-label="Save">' + I.bookmark + '</button>' +
          '<button class="jdf-act-btn" data-act="idea" data-i="' + i + '" aria-label="Ideas">' + I.bulb + '</button>' +
          '<button class="jdf-act-btn" data-act="done" data-i="' + i + '" aria-label="Mark done">' + I.check + '</button>' +
          '<button class="jdf-act-btn" data-act="share" data-i="' + i + '" aria-label="Share">' + I.share + '</button>' +
          '</div></div></div>';
      });
    }
    box.innerHTML = html;
    var bb = box.querySelector('#jdfBriefBar, .jdf-brief-bar');
    if (bb) bb.addEventListener('click', openBriefSheet);
    box.querySelectorAll('.jdf-act-btn').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var idx = Number(b.getAttribute('data-i'));
        var act = b.getAttribute('data-act');
        var p = getPosts()[idx];
        if (!p) return;
        if (act === 'discuss') discussPost(p);
        else if (act === 'save') { b.classList.toggle('on'); toast(b.classList.contains('on') ? 'Saved' : 'Unsaved'); }
        else if (act === 'idea') discussPost(p);
        else if (act === 'done') { b.classList.toggle('on'); toast('Marked done'); }
        else if (act === 'share') sharePost(p);
      });
    });
    /* tapping the post body also opens discussion */
    box.querySelectorAll('.jdf-post').forEach(function (el) {
      el.addEventListener('click', function () {
        var p = getPosts()[Number(el.getAttribute('data-i'))];
        if (p) discussPost(p);
      });
    });
  }

  function toast(msg) {
    try {
      if (typeof window.showModernToast === 'function') window.showModernToast(msg);
    } catch (e) {}
  }

  function sharePost(p) {
    try {
      var text = p.headline + '\n\n' + p.body;
      if (navigator.share) navigator.share({ title: p.headline, text: text }).catch(function () {});
      else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () { toast('Copied to clipboard'); });
      }
    } catch (e) {}
  }

  /* Mount feed UI into an Explore pane. Returns a refresh function. */
  function mountPane(container) {
    ensureCSS();
    container.innerHTML = '<div class="jdf-pane-refresh"><button class="jdf-pane-btn" id="jdfPaneRefresh">↻ Regenerate feed</button></div><div class="jdf-pane-posts"></div>';
    var postsBox = container.querySelector('.jdf-pane-posts');
    function refresh() {
      var posts = getPosts();
      if (!posts.length || needsRefresh()) generatePostsInto(postsBox);
      else renderPostsInto(postsBox);
    }
    var rb = container.querySelector('#jdfPaneRefresh');
    if (rb) rb.addEventListener('click', function () { generatePostsInto(postsBox); });
    refresh();
    return refresh;
  }

  async function generatePostsInto(postsBox) {
    if (postsBox) postsBox.innerHTML = '<div class="jdf-loading"><div class="jdf-spinner"></div>Generating your feed…</div>';
    await generatePosts();
    if (postsBox) renderPostsInto(postsBox);
  }

  function discussPost(p) {
    closeFeed();
    try { if (window.JDExplore) window.JDExplore.close(); } catch (e) {}
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
      lsSet(briefKey(), v);
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

  var PATCH_VER = '20261004a68';

  function addSidebarEntry() {
    /* In Explore mode, the unified Explore button replaces individual entries */
    if (window.__jdExploreMode) return;
    /* Self-healing: if a button from an older patch version exists, re-wire
       it to THIS version's openFeed (fixes stale-upgrade closure bug where
       the old button kept calling the old version's functions). */
    function wire(btn) {
      var clone = btn.cloneNode(false);
      clone.id = 'jdFeedBtn';
      clone.className = 'jd-sidebar-menu-item';
      clone.type = 'button';
      clone.setAttribute('aria-label', 'Open feed');
      clone.setAttribute('data-jd-ver', PATCH_VER);
      clone.innerHTML = '<i data-lucide="newspaper"></i><span>Feed</span>';
      btn.parentNode.replaceChild(clone, btn);
      clone.addEventListener('click', function () {
        try { if (typeof window.closeAllDrawers === 'function') window.closeAllDrawers(); } catch (e) {}
        openFeed();
      });
      try {
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      } catch (e) {}
      return clone;
    }
    var existing = document.getElementById('jdFeedBtn');
    if (existing) {
      if (existing.getAttribute('data-jd-ver') !== PATCH_VER) wire(existing);
      return;
    }
    var iv = setInterval(function () {
      var main = document.getElementById('jdMainChatBtn');
      if (!main) return;
      var btn = document.createElement('button');
      btn.className = 'jd-sidebar-menu-item';
      btn.type = 'button';
      btn.id = 'jdFeedBtn';
      btn.setAttribute('aria-label', 'Open feed');
      btn.setAttribute('data-jd-ver', PATCH_VER);
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

  /* Persistent self-heal: every 10s, verify our button exists and is wired
     to this version. Recovers from sidebar re-renders or partial upgrades. */
  try {
    setInterval(function () {
      try {
        var b = document.getElementById('jdFeedBtn');
        var main = document.getElementById('jdMainChatBtn');
        if (!b && main) addSidebarEntry();
        else if (b && b.getAttribute('data-jd-ver') !== PATCH_VER) addSidebarEntry();
      } catch (e) {}
    }, 10000);
  } catch (e) {}

  window.JDFeed = { open: openFeed, close: closeFeed, render: renderPosts, regenerate: generatePosts, ver: PATCH_VER, mountPane: mountPane };

  /* On account switch, the per-account keys change automatically; if the
     feed page is open, re-render so the new account sees their own feed. */
  try {
    window.addEventListener('jd:account-changed', function () {
      var p = document.getElementById('jdFeedPage');
      if (p && !p.hidden) {
        if (!getPosts().length) generatePosts();
        else renderPosts();
      }
    });
  } catch (e) {}

  ensureCSS();
  buildPage();
  addSidebarEntry();
})();
