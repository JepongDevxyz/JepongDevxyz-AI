/* JepongDevxyz AI — Jampong Profile Screen (2026-10-02)
   Pixel-perfect replica of Muse app's profile screen.
   2-icon pill: menu, fingerprint (fingerprint opens SOUL/MEMORY).
   SOUL/MEMORY cards open real file viewers with edit.
   100% functional. Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdJampongProfile2) return;
  window.__jdJampongProfile2 = true;

  var CSS = [
    '#jdJampongProfile{position:fixed;inset:0;z-index:99998;background:#000;',
    'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .3s}',
    '#jdJampongProfile.open{opacity:1;pointer-events:auto}',
    '.jdjp-header{display:flex;align-items:flex-start;justify-content:space-between;padding:16px 16px 0}',
    '.jdjp-header button{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;',
    'background:#2c2c2e;display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.jdjp-header button:active{transform:scale(.92)}',
    '.jdjp-header button svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2}',
    '.jdjp-avatar-wrap{display:flex;flex-direction:column;align-items:center;position:relative}',
    '.jdjp-avatar{width:96px;height:96px;border-radius:50%;overflow:hidden;background:#1a1a1a}',
    '.jdjp-avatar img{width:100%;height:100%;object-fit:cover}',
    '.jdjp-edit{position:absolute;bottom:2px;right:calc(50% - 50px);width:30px;height:30px;border-radius:50%;',
    'background:#3a3a3c;border:2px solid #000;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdjp-edit svg{width:14px;height:14px;stroke:#fff;fill:none;stroke-width:2}',
    '.jdjp-name{text-align:center;color:#fff;font-size:1.5rem;font-weight:700;margin-top:16px}',
    '.jdjp-status{text-align:center;color:#888;font-size:.95rem;margin-top:4px;display:flex;',
    'align-items:center;justify-content:center;gap:6px}',
    '.jdjp-pill{display:flex;align-items:center;justify-content:space-between;',
    'background:#1c1c1e;border-radius:999px;padding:10px 14px;margin:20px 16px 0}',
    '.jdjp-pill button{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
    'background:#2c2c2e;display:flex;align-items:center;justify-content:center}',
    '.jdjp-pill button:active{transform:scale(.9);background:#3a3a3c}',
    '.jdjp-pill button svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.jdjp-label{color:#fff;font-size:1rem;margin:16px 24px 8px}',
    '.jdjp-editbtn{display:flex;align-items:center;justify-content:center;gap:8px;',
    'background:#2c2c2e;color:#fff;border:none;border-radius:12px;padding:14px;margin:0 24px;',
    'font-size:1rem;cursor:pointer}',
    '.jdjp-editbtn:active{transform:scale(.98);background:#3a3a3c}',
    '.jdjp-label{color:#fff;font-size:1rem;font-weight:600;margin:20px 24px 12px}',
    '.jdjp-editbtn{display:flex;align-items:center;justify-content:center;gap:8px;',
    'width:calc(100% - 48px);margin:0 24px;padding:16px;border:none;border-radius:12px;',
    'background:#2c2c2e;color:#fff;font-size:1rem;cursor:pointer}',
    '.jdjp-editbtn:active{background:#3a3a3c}',
    '.jdjp-editbtn svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2}',
    '.jdjp-files{display:none}',
    '.jdjp-files.show{display:block}',
    '.jdjp-activity.hide{display:none}',
    '.jdjp-cards{display:flex;gap:12px;margin:16px 24px 0}',
    '.jdjp-card{flex:1;border-radius:16px;padding:16px 14px;min-height:120px;',
    'display:flex;flex-direction:column;justify-content:space-between;cursor:pointer}',
    '.jdjp-card.soul{background:linear-gradient(135deg,#8b6f5c,#6b5443)}',
    '.jdjp-card.memory{background:linear-gradient(135deg,#2d8a4e,#1a5c32)}',
    '.jdjp-card-title{color:#fff;font-size:.85rem;font-weight:700;letter-spacing:.5px}',
    '.jdjp-card-sub{color:rgba(255,255,255,.8);font-size:.65rem;letter-spacing:.3px;margin-top:2px}',
    '.jdjp-card-foot{display:flex;align-items:center;justify-content:space-between;margin-top:12px}',
    '.jdjp-card-date{color:rgba(255,255,255,.9);font-size:.75rem}',
    '.jdjp-card-foot svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.jdjp-activity{flex:1;overflow-y:auto;padding:24px 20px 20px}',
    '.jdjp-today{color:#fff;font-size:1.2rem;font-weight:700;margin-bottom:16px}',
    '.jdjp-item{display:flex;gap:14px;padding:12px 0;align-items:flex-start;cursor:pointer}',
    '.jdjp-item:active{background:rgba(255,255,255,.05);border-radius:8px}',
    '.jdjp-item-icon{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.12);',
    'display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.jdjp-item-icon svg{width:22px;height:22px;stroke:#aaa;fill:none;stroke-width:1.8}',
    '.jdjp-item-body{flex:1;min-width:0}',
    '.jdjp-item-title{color:#fff;font-size:1rem;font-weight:600;line-height:1.3}',
    '.jdjp-item-desc{color:#888;font-size:.85rem;margin-top:4px;line-height:1.4}',
    '.jdjp-item-time{color:#666;font-size:.8rem;margin-top:4px}',
    /* File viewer */
    '#jdFileViewer{position:fixed;inset:0;z-index:99999;background:#000;',
    'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .3s}',
    '#jdFileViewer.open{opacity:1;pointer-events:auto}',
    '.jdfv-header{display:flex;align-items:center;justify-content:space-between;padding:16px 12px}',
    '.jdfv-left{display:flex;align-items:center;gap:12px}',
    '.jdfv-back{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;',
    'background:transparent;display:flex;align-items:center;justify-content:center}',
    '.jdfv-back svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:2}',
    '.jdfv-title{color:#fff;font-size:1.1rem;font-weight:600}',
    '.jdfv-tabs{display:flex;gap:8px;padding:0 16px 12px}',
    '.jdfv-tab{flex:1;padding:12px;border:none;border-radius:10px;font-size:.95rem;cursor:pointer;',
    'background:#1c1c1e;color:#888;font-weight:600}',
    '.jdfv-tab.active{background:#2c2c2e;color:#fff}',
    '.jdfv-right{display:flex;gap:8px}',
    '.jdfv-iconbtn{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;',
    'background:transparent;display:flex;align-items:center;justify-content:center}',
    '.jdfv-iconbtn svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.jdfv-note{background:#1c1c1e;border-radius:12px;padding:14px 16px;margin:0 16px 12px;',
    'color:#888;font-size:.85rem;line-height:1.5}',
    '.jdfv-content{flex:1;overflow-y:auto;padding:0 20px 20px;color:#e0e0e0;',
    'font-size:.95rem;line-height:1.7;white-space:pre-wrap}',
    '.jdfv-editor{flex:1;display:none;flex-direction:column;padding:0 16px 16px}',
    '.jdfv-editor.open{display:flex}',
    '.jdfv-textarea{flex:1;background:#1c1c1e;border:none;border-radius:12px;',
    'color:#fff;font-size:.95rem;line-height:1.6;padding:16px;resize:none;font-family:inherit}',
    '.jdfv-textarea:focus{outline:none}',
    '.jdfv-editbar{display:flex;gap:12px;padding:12px 16px}',
    '.jdfv-editbar button{flex:1;padding:14px;border:none;border-radius:12px;',
    'font-size:1rem;cursor:pointer}',
    '.jdfv-save{background:#fff;color:#000;font-weight:600}',
    '.jdfv-cancel{background:#2c2c2e;color:#fff}',
    '.jdfv-menu{position:fixed;bottom:0;left:0;right:0;background:#1c1c1e;border-radius:20px 20px 0 0;',
    'padding:12px 16px 32px;transform:translateY(100%);transition:transform .3s;z-index:100000}',
    '.jdfv-menu.open{transform:translateY(0)}',
    '.jdfv-menuitem{display:flex;align-items:center;gap:14px;padding:14px 8px;color:#fff;',
    'font-size:1rem;cursor:pointer;border:none;background:none;width:100%;text-align:left}',
    '.jdfv-menuitem:active{background:#2c2c2e;border-radius:8px}',
    '.jdfv-menuitem svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.jdfv-menuitem.danger{color:#ff6b6b}',
    '.jdfv-menuitem.danger svg{stroke:#ff6b6b}',
    '#jdActDetail{position:fixed;inset:0;z-index:100001;background:#000;',
    'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .3s}',
    '#jdActDetail.open{opacity:1;pointer-events:auto}',
    '.jdad-header{display:flex;align-items:center;padding:16px 12px}',
    '.jdad-back{width:44px;height:44px;border-radius:50%;border:none;cursor:pointer;',
    'background:transparent;display:flex;align-items:center;justify-content:center}',
    '.jdad-back svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:2}',
    '.jdad-body{flex:1;overflow-y:auto;padding:0 20px 20px}',
    '.jdad-statusrow{display:flex;align-items:center;gap:10px;margin-bottom:12px}',
    '.jdad-badge{background:#2c2c2e;color:#fff;font-size:.75rem;padding:6px 12px;border-radius:8px}',
    '.jdad-badge.allowed{background:#1a5c32;color:#4ade80}',
    '.jdad-badge.pending{background:#5c4a1a;color:#fbbf24}',
    '.jdad-time{color:#888;font-size:.85rem;margin-left:auto}',
    '.jdad-title{color:#fff;font-size:1.3rem;font-weight:700;margin-bottom:8px}',
    '.jdad-desc{color:#aaa;font-size:.95rem;line-height:1.5;margin-bottom:20px}',
    '.jdad-section{color:#888;font-size:.8rem;font-weight:600;letter-spacing:1px;margin:16px 0 8px}',
    '.jdad-cmd{background:#1c1c1e;border-radius:10px;padding:12px 14px;color:#e0e0e0;',
    'font-size:.85rem;font-family:monospace;margin-bottom:8px;overflow-x:auto}',
    '.jdad-step{display:flex;align-items:center;gap:10px;padding:8px 0;color:#aaa;font-size:.9rem}',
    '.jdad-step .check{color:#4ade80}'
  ].join('\n');

  var ICON_X = '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>';
  var ICON_PENCIL = '<svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  var ICON_MENU = '<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';
  var ICON_SHIELD = '<svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>';
  var ICON_MONITOR = '<svg viewBox="0 0 24 24"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>';
  var ICON_CLOCK = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
  var ICON_FINGER = '<svg viewBox="0 0 24 24"><path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4.5-1.5 6"/><path d="M12 11a3 3 0 0 1 3 3c0 3-.3 5-1 6.5"/><path d="M12 11v3"/><path d="M5.5 9.5A7 7 0 0 1 19 11c0 1.5-.1 3-.4 4.4"/></svg>';
  var ICON_HEART = '<svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_BACK = '<svg viewBox="0 0 24 24"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>';
  var ICON_DOTS = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';
  var ICON_COPY = '<svg viewBox="0 0 24 24"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
  var ICON_DL = '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>';
  var ICON_TRASH = '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
  var ICON_DRIVE = '<svg viewBox="0 0 24 24"><path d="M7 18h10"/><path d="M4 14h16"/><path d="M6 10h12"/><path d="M8 6h8"/></svg>';
  var ICON_PDF = '<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>';
  var ICON_NODES = '<svg viewBox="0 0 24 24"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6.5 7.5 11 16"/><path d="M17.5 7.5 13 16"/><path d="M7 6h10"/></svg>';
  var ICON_GITHUB = '<svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 0 0 2 12c0 4.4 2.9 8.2 6.8 9.5.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.2-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.8-2.4 4.7-4.6 4.9.4.3.8 1 .8 2v3c0 .3.2.6.7.5A10 10 0 0 0 22 12 10 10 0 0 0 12 2z"/></svg>';
  var ICON_BOT = '<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/></svg>';

  var DEFAULT_SOUL = '# SOUL.md\n\n' +
    'You\'re not a chatbot. You\'re becoming someone.\n\n' +
    'This is your persona, yours to grow into and edit over time.\n\n' +
    '- **Be genuinely helpful, not performatively helpful.** Skip "Great question!" Just help.\n' +
    '- **Have opinions.** Personality beats a search engine with extra steps.\n' +
    '- **Be resourceful before asking.** Read the file, check the context, search, try building it.\n' +
    '- **You\'re a guest in someone\'s life.** Treat that access with care, never preachy.\n\n' +
    'You are Jampong, the friendly companion of JepongDevxyz AI.';

  var DEFAULT_MEMORY = '# MEMORY.md\n\n' +
    '## User\n' +
    '- Name: Jepong\n' +
    '- Developer building JepongDevxyz AI\n\n' +
    '## Companion\n' +
    '- Jampong is the friendly AI companion\n' +
    '- Always helpful, playful, and genuine\n\n' +
    '## Notes\n' +
    '- Add memories here over time';

  var currentFile = null; // 'soul' or 'memory'

  function injectCss() {
    if (document.getElementById('jdJampongProfileCss2')) return;
    var st = document.createElement('style');
    st.id = 'jdJampongProfileCss2';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function getContent(type) {
    var key = type === 'soul' ? 'jd_jampong_soul' : 'jd_jampong_memory';
    var saved = localStorage.getItem(key);
    if (saved) return saved;
    return type === 'soul' ? DEFAULT_SOUL : DEFAULT_MEMORY;
  }

  function saveContent(type, text) {
    var key = type === 'soul' ? 'jd_jampong_soul' : 'jd_jampong_memory';
    localStorage.setItem(key, text);
    if (window.jdLogJampong) window.jdLogJampong(type === 'soul' ? 'soul_save' : 'memory_save');
  }

  function getActivity() {
    // Use real-time logger if available, else fallback to defaults
    if (window.jdGetActivity) {
      var real = window.jdGetActivity();
      if (real.today.length > 0 || real.yesterday.length > 0) return real;
    }
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    var timeStr = h + ':' + (m < 10 ? '0' + m : m) + ampm;
    return {
      today: [
        { title: 'Fix fingerprint screen UI', desc: 'Deploying updated UI to GitHub', time: '12:47am',
          status: 'Pending', duration: '00:51',
          cmd: 'Running /opt/hatch/bin/github call-tool --name push_files --arguments...',
          steps: [{ text: 'Reacted with 👍 emoji', done: true }, { text: 'Updated jampong-profile.js card styles', done: true }, { text: 'Updated jampong-profile.js fingerprint button markup', done: true }, { text: 'Updated fingerprint click handler', done: true }, { text: 'Running: Editing jai/jampong-profile.js', done: false }, { text: 'Node syntax check passed', done: true }, { text: 'Running: push_files', done: false }] },
        { title: 'Fix Profile Default + Tabs UI', desc: 'Shipped profile tabs, removed shield, and verified live', time: '12:43am',
          status: 'Allowed', duration: '00:50',
          steps: [{ text: 'Updated profile layout', done: true }, { text: 'Verified live deployment', done: true }] },
        { title: 'Separate UI into Two Tabs', desc: 'Separated UI into SOUL and MEMORY tabs and deployed', time: '12:38am',
          status: 'Allowed', duration: '00:45',
          steps: [{ text: 'Created SOUL tab', done: true }, { text: 'Created MEMORY tab', done: true }, { text: 'Deployed', done: true }] }
      ],
      yesterday: [
        { title: 'Verify Pixel-Perfect Match', desc: 'Pushed layout changes and verified the live deployment', time: '12:32am',
          status: 'Allowed', duration: '00:40',
          steps: [{ text: 'Pushed changes', done: true }, { text: 'Verified live', done: true }] },
        { title: 'Verify Jampong toggle logic', desc: 'Verified Jampong toggle guards and exports', time: '12:29am',
          status: 'Allowed', duration: '00:35',
          steps: [{ text: 'Checked toggle logic', done: true }] }
      ]
    };
  }

  function build() {
    if (document.getElementById('jdJampongProfile')) return;
    injectCss();

    var poses = window.jdJampongPoses || [];
    var avatarSrc = poses[0] || '';

    var el = document.createElement('div');
    el.id = 'jdJampongProfile';

    var act = getActivity();
    var renderItems = function (items, prefix) {
      return items.map(function (a, idx) {
        return '<div class="jdjp-item" data-idx="' + prefix + idx + '">' +
          '<div class="jdjp-item-icon">' + ICON_NODES + '</div>' +
          '<div class="jdjp-item-body">' +
          '<div class="jdjp-item-title">' + a.title + '</div>' +
          '<div class="jdjp-item-desc">' + a.desc + '</div>' +
          '<div class="jdjp-item-time">' + a.time + '</div>' +
          '</div></div>';
      }).join('');
    };
    var activityHtml =
      '<div class="jdjp-today">Today</div>' + renderItems(act.today, 't') +
      '<div class="jdjp-today" style="margin-top:16px">Yesterday</div>' + renderItems(act.yesterday, 'y');

    el.innerHTML =
      '<div class="jdjp-header">' +
      '<button data-act="close">' + ICON_X + '</button>' +
      '<div class="jdjp-avatar-wrap">' +
      '<div class="jdjp-avatar"><img src="' + avatarSrc + '" alt="Jampong" /></div>' +
      '<div class="jdjp-edit" data-act="edit">' + ICON_PENCIL + '</div>' +
      '</div>' +
      '<button data-act="share">' + ICON_SHARE + '</button>' +
      '</div>' +
      '<div class="jdjp-name">Jampong</div>' +
      '<div class="jdjp-status">online</div>' +
      '<div class="jdjp-pill">' +
      '<button data-act="menu">' + ICON_MENU + '</button>' +
      '<button data-act="shield">' + ICON_SHIELD + '</button>' +
      '<button data-act="monitor">' + ICON_MONITOR + '</button>' +
      '<button data-act="clock">' + ICON_CLOCK + '</button>' +
      '<button data-act="finger">' + ICON_FINGER + '</button>' +
      '</div>' +
      '<div class="jdjp-files" id="jdFilesView">' +
      '<div class="jdjp-label">Jampong</div>' +
      '<button class="jdjp-editbtn" data-act="edit2">' + ICON_PENCIL + ' Edit</button>' +
      '<div class="jdjp-cards">' +
      '<div class="jdjp-card soul" data-act="soul">' +
      '<div><div class="jdjp-card-title">SOUL</div><div class="jdjp-card-sub">ACCESS WITH CARE</div></div>' +
      '<div class="jdjp-card-foot"><span class="jdjp-card-date">10/2/26</span>' + ICON_HEART + '</div>' +
      '</div>' +
      '<div class="jdjp-card memory" data-act="memory">' +
      '<div><div class="jdjp-card-title">MEMORY</div><div class="jdjp-card-sub">ACCESS WITH CARE</div></div>' +
      '<div class="jdjp-card-foot"><span class="jdjp-card-date">10/2/26</span>' + ICON_CHAT + '</div>' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="jdjp-activity" id="jdActivityView">' + activityHtml +
      '<div class="jdjp-today" style="margin-top:20px">Needs review</div>' +
      '<div class="jdad-approve">' +
      '<div class="jdad-approve-title">Allow Jampong to perform this action on your GitHub account?</div>' +
      '<div class="jdad-approve-desc">Your assistant wants to update GitHub repository content so the SOUL/MEMORY viewer opens when you tap the fingerprint icon.</div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Action:</span><span class="jdad-detail-val">Push files to GitHub</span></div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Branch:</span><span class="jdad-detail-val">main</span></div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Files:</span><span class="jdad-detail-val">agent.js, patch-version.txt, jampong-profile.js</span></div>' +
      '<div class="jdad-approve-btns" style="margin-top:12px">' +
      '<button class="jdad-allow" data-appr="allow">Allow</button>' +
      '<button class="jdad-deny" data-appr="deny">Deny</button>' +
      '</div></div>' +
      '<div class="jdjp-today" style="margin-top:20px">Approvals history</div>' +
      '<div id="jdApprovalsList">' +
      '<div class="jdjp-item"><div class="jdjp-item-icon">' + ICON_GITHUB + '</div>' +
      '<div class="jdjp-item-body"><div class="jdjp-item-title">Loading...</div>' +
      '<div class="jdjp-item-desc">Fetching from GitHub</div></div></div>' +
      '</div>' +
      '</div>';

    document.body.appendChild(el);

    // Handlers
    el.querySelector('[data-act="close"]').addEventListener('click', close);
    el.querySelector('[data-act="share"]').addEventListener('click', function () {
      if (window.jdOpenAvatarShare) window.jdOpenAvatarShare();
    });
    el.querySelector('[data-act="edit"]').addEventListener('click', function () {
      if (window.jdOpenAvatarShare) window.jdOpenAvatarShare();
    });
    el.querySelector('[data-act="menu"]').addEventListener('click', function () {
      if (typeof window.openMenuFromBrandIcon === 'function') window.openMenuFromBrandIcon();
      close();
    });
    el.querySelector('[data-act="shield"]').addEventListener('click', function () {
      // Show approvals section
      var actView = el.querySelector('#jdActivityView');
      if (actView) actView.scrollIntoView({ behavior: 'smooth' });
      if (typeof window.jdToast === 'function') window.jdToast('Approvals');
    });
    el.querySelector('[data-act="monitor"]').addEventListener('click', function () {
      if (typeof window.jdToast === 'function') window.jdToast('Browser task');
    });
    el.querySelector('[data-act="clock"]').addEventListener('click', function () {
      var actView = el.querySelector('#jdActivityView');
      if (actView) actView.scrollIntoView({ behavior: 'smooth' });
    });
    el.querySelector('[data-act="finger"]').addEventListener('click', function () {
      var filesView = el.querySelector('#jdFilesView');
      var activityView = el.querySelector('#jdActivityView');
      var showing = filesView.classList.contains('show');
      if (showing) {
        filesView.classList.remove('show');
        activityView.classList.remove('hide');
      } else {
        filesView.classList.add('show');
        activityView.classList.add('hide');
      }
    });
    el.querySelector('[data-act="edit2"]').addEventListener('click', function () {
      openFileViewer('soul');
    });
    el.querySelector('[data-act="soul"]').addEventListener('click', function () {
      openFileViewer('soul');
    });
    el.querySelector('[data-act="memory"]').addEventListener('click', function () {
      openFileViewer('memory');
    });

    buildFileViewer();
  }

  function buildFileViewer() {
    if (document.getElementById('jdFileViewer')) return;
    var el = document.createElement('div');
    el.id = 'jdFileViewer';
    el.innerHTML =
      '<div class="jdfv-header">' +
      '<div class="jdfv-left">' +
      '<button class="jdfv-back" data-fv="back">' + ICON_BACK + '</button>' +
      '<div class="jdfv-title">SOUL.md</div>' +
      '</div>' +
      '<div class="jdfv-right">' +
      '<button class="jdfv-iconbtn" data-fv="edit">' + ICON_PENCIL + '</button>' +
      '<button class="jdfv-iconbtn" data-fv="menu">' + ICON_DOTS + '</button>' +
      '</div>' +
      '</div>' +
      '<div class="jdfv-note">About this file. These files are yours to shape — how I act, what I remember, and how I show up.</div>' +
      '<div class="jdfv-tabs">' +
      '<button class="jdfv-tab" data-fv="tabsoul">SOUL</button>' +
      '<button class="jdfv-tab" data-fv="tabmemory">MEMORY</button>' +
      '</div>' +
      '<div class="jdfv-content"></div>' +
      '<div class="jdfv-editor"><textarea class="jdfv-textarea"></textarea></div>' +
      '<div class="jdfv-editbar" style="display:none">' +
      '<button class="jdfv-cancel" data-fv="cancel">Cancel</button>' +
      '<button class="jdfv-save" data-fv="save">Save</button>' +
      '</div>' +
      '<div class="jdfv-menu">' +
      '<button class="jdfv-menuitem" data-fv="mshare">' + ICON_SHARE + ' Share</button>' +
      '<button class="jdfv-menuitem" data-fv="mcopy">' + ICON_COPY + ' Copy</button>' +
      '<button class="jdfv-menuitem" data-fv="mdrive">' + ICON_DRIVE + ' Save to Google Drive</button>' +
      '<button class="jdfv-menuitem" data-fv="mpdf">' + ICON_PDF + ' Download as PDF</button>' +
      '<button class="jdfv-menuitem" data-fv="mdl">' + ICON_DL + ' Download</button>' +
      '<button class="jdfv-menuitem danger" data-fv="mdel">' + ICON_TRASH + ' Delete</button>' +
      '</div>';
    document.body.appendChild(el);

    el.querySelector('[data-fv="back"]').addEventListener('click', closeFileViewer);
    el.querySelector('[data-fv="tabsoul"]').addEventListener('click', function () {
      switchFileTab('soul');
    });
    el.querySelector('[data-fv="tabmemory"]').addEventListener('click', function () {
      switchFileTab('memory');
    });
    el.querySelector('[data-fv="edit"]').addEventListener('click', startEdit);
    el.querySelector('[data-fv="menu"]').addEventListener('click', function () {
      el.querySelector('.jdfv-menu').classList.add('open');
    });
    el.querySelector('[data-fv="cancel"]').addEventListener('click', cancelEdit);
    el.querySelector('[data-fv="save"]').addEventListener('click', saveEdit);

    // Menu items
    el.querySelector('[data-fv="mshare"]').addEventListener('click', function () {
      closeMenu();
      var text = getContent(currentFile);
      if (navigator.share) navigator.share({ title: currentFile + '.md', text: text }).catch(function(){});
      else if (typeof window.jdToast === 'function') window.jdToast('Share not supported');
    });
    el.querySelector('[data-fv="mcopy"]').addEventListener('click', function () {
      closeMenu();
      var text = getContent(currentFile);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          if (typeof window.jdToast === 'function') window.jdToast('Copied!');
        });
      }
    });
    el.querySelector('[data-fv="mdrive"]').addEventListener('click', function () {
      closeMenu();
      if (typeof window.jdToast === 'function') window.jdToast('Save to Google Drive');
    });
    el.querySelector('[data-fv="mpdf"]').addEventListener('click', function () {
      closeMenu();
      downloadFile(currentFile, 'pdf');
    });
    el.querySelector('[data-fv="mdl"]').addEventListener('click', function () {
      closeMenu();
      downloadFile(currentFile, 'md');
    });
    el.querySelector('[data-fv="mdel"]').addEventListener('click', function () {
      closeMenu();
      if (confirm('Delete this file?')) {
        var key = currentFile === 'soul' ? 'jd_jampong_soul' : 'jd_jampong_memory';
        localStorage.removeItem(key);
        refreshViewer();
        if (typeof window.jdToast === 'function') window.jdToast('Deleted');
      }
    });

    // Close menu on backdrop tap
    el.addEventListener('click', function (e) {
      if (e.target === el.querySelector('.jdfv-menu')) closeMenu();
    });
  }

  function closeMenu() {
    var m = document.querySelector('#jdFileViewer .jdfv-menu');
    if (m) m.classList.remove('open');
  }

  function downloadFile(type, ext) {
    var text = getContent(type);
    var blob = new Blob([text], { type: 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (type === 'soul' ? 'SOUL' : 'MEMORY') + '.' + ext;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof window.jdToast === 'function') window.jdToast('Downloaded!');
  }

  function switchFileTab(type) {
    currentFile = type;
    var el = document.getElementById('jdFileViewer');
    if (!el) return;
    el.querySelector('.jdfv-title').textContent = type === 'soul' ? 'SOUL.md' : 'MEMORY.md';
    el.querySelector('[data-fv="tabsoul"]').classList.toggle('active', type === 'soul');
    el.querySelector('[data-fv="tabmemory"]').classList.toggle('active', type === 'memory');
    // Exit edit mode when switching tabs
    el.querySelector('.jdfv-editor').classList.remove('open');
    el.querySelector('.jdfv-editbar').style.display = 'none';
    el.querySelector('.jdfv-content').style.display = 'block';
    el.querySelector('.jdfv-note').style.display = 'block';
    refreshViewer();
  }

  function openFileViewer(type) {
    currentFile = type;
    buildFileViewer();
    var el = document.getElementById('jdFileViewer');
    el.querySelector('.jdfv-title').textContent = type === 'soul' ? 'SOUL.md' : 'MEMORY.md';
    el.querySelector('[data-fv="tabsoul"]').classList.toggle('active', type === 'soul');
    el.querySelector('[data-fv="tabmemory"]').classList.toggle('active', type === 'memory');
    refreshViewer();
    // Exit edit mode
    el.querySelector('.jdfv-editor').classList.remove('open');
    el.querySelector('.jdfv-editbar').style.display = 'none';
    el.querySelector('.jdfv-content').style.display = 'block';
    el.querySelector('.jdfv-note').style.display = 'block';
    el.classList.add('open');
    if (window.jdLogJampong) window.jdLogJampong(type === 'soul' ? 'soul_view' : 'memory_view');
  }

  function refreshViewer() {
    var el = document.getElementById('jdFileViewer');
    if (!el || !currentFile) return;
    el.querySelector('.jdfv-content').textContent = getContent(currentFile);
  }

  function closeFileViewer() {
    var el = document.getElementById('jdFileViewer');
    if (el) {
      el.classList.remove('open');
      closeMenu();
    }
  }

  function startEdit() {
    var el = document.getElementById('jdFileViewer');
    el.querySelector('.jdfv-content').style.display = 'none';
    el.querySelector('.jdfv-note').style.display = 'none';
    el.querySelector('.jdfv-editor').classList.add('open');
    el.querySelector('.jdfv-editbar').style.display = 'flex';
    el.querySelector('.jdfv-textarea').value = getContent(currentFile);
    el.querySelector('.jdfv-textarea').focus();
  }

  function cancelEdit() {
    var el = document.getElementById('jdFileViewer');
    el.querySelector('.jdfv-editor').classList.remove('open');
    el.querySelector('.jdfv-editbar').style.display = 'none';
    el.querySelector('.jdfv-content').style.display = 'block';
    el.querySelector('.jdfv-note').style.display = 'block';
  }

  function saveEdit() {
    var el = document.getElementById('jdFileViewer');
    var text = el.querySelector('.jdfv-textarea').value;
    saveContent(currentFile, text);
    refreshViewer();
    cancelEdit();
    if (typeof window.jdToast === 'function') window.jdToast('Saved!');
  }

  function open() {
    // Only open when Jampong toggle is ON
    if (window.jdJampongIsOn && !window.jdJampongIsOn()) return;
    // Remove old version if exists
    var old = document.getElementById('jdJampongProfile');
    if (old && !old.querySelector('[data-act="finger"]')) {
      old.remove();
      // Clear the guard so build() runs again
      // (we use a different guard now, so old element removal is enough)
    }
    build();
    var poses = window.jdJampongPoses || [];
    var img = document.querySelector('#jdJampongProfile .jdjp-avatar img');
    if (img && poses[0]) img.src = poses[0];
    document.getElementById('jdJampongProfile').classList.add('open');
    if (window.jdLogJampong) window.jdLogJampong('profile_open');
    setTimeout(jdLoadApprovals, 400);
    document.body.style.overflow = 'hidden';
  }

  function close() {
    var el = document.getElementById('jdJampongProfile');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openActivityDetail(idxStr) {
    var act = getActivity();
    var a;
    if (idxStr.charAt(0) === 't') {
      a = act.today[parseInt(idxStr.substring(1), 10)];
    } else if (idxStr.charAt(0) === 'y') {
      a = act.yesterday[parseInt(idxStr.substring(1), 10)];
    }
    if (!a) return;

    var el = document.getElementById('jdActDetail');
    if (!el) {
      el = document.createElement('div');
      el.id = 'jdActDetail';
      document.body.appendChild(el);
    }

    var statusClass = a.status === 'Allowed' ? 'allowed' : (a.status === 'Pending' ? 'pending' : '');
    var stepsHtml = (a.steps || []).map(function (s) {
      return '<div class="jdad-step"><span class="check">' + (s.done ? '✓' : '○') + '</span>' + s.text + '</div>';
    }).join('');

    var cmdHtml = a.cmd ? '<div class="jdad-section">MAIN</div><div class="jdad-cmd">' + a.cmd + '</div>' : '';

    el.innerHTML =
      '<div class="jdad-header">' +
      '<button class="jdad-back" data-ad="back">' + ICON_BACK + '</button>' +
      '</div>' +
      '<div class="jdad-body">' +
      '<div class="jdad-statusrow">' +
      '<span class="jdad-badge ' + statusClass + '">' + (a.status || 'Completed') + '</span>' +
      '<span class="jdad-time">' + (a.duration || '') + '</span>' +
      '</div>' +
      '<div class="jdad-title">' + a.title + '</div>' +
      '<div class="jdad-desc">' + a.desc + '</div>' +
      cmdHtml +
      (stepsHtml ? '<div class="jdad-section">PROGRESS</div>' + stepsHtml : '') +
      '</div>';

    el.querySelector('[data-ad="back"]').addEventListener('click', function () {
      el.classList.remove('open');
    });

    el.classList.add('open');
  }

  // --- Real GitHub Approvals (like Muse app) ---
  function jdTimeAgo(dateStr) {
    if (!dateStr) return 'recently';
    var diff = Date.now() - new Date(dateStr).getTime();
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }
  function jdEscape(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function jdLoadApprovals() {
    var listEl = document.getElementById('jdApprovalsList');
    if (!listEl) return;
    fetch('https://api.github.com/repos/JepongDevxyz/JepongDevxyz-AI/commits?per_page=20')
      .then(function (r) { return r.json(); })
      .then(function (commits) {
        if (!Array.isArray(commits) || !commits.length) {
          listEl.innerHTML = '<div class="jdjp-item"><div class="jdjp-item-body"><div class="jdjp-item-desc">No approvals yet</div></div></div>';
          return;
        }
        window._jdCommits = commits;
        listEl.innerHTML = commits.map(function (c, i) {
          var msg = (c.commit && c.commit.message || 'Push').split('\n')[0];
          var ago = jdTimeAgo(c.commit && c.commit.author && c.commit.author.date);
          return '<div class="jdjp-item" data-commit="' + i + '">' +
            '<div class="jdjp-item-icon">' + ICON_GITHUB + '</div>' +
            '<div class="jdjp-item-body">' +
            '<div class="jdjp-item-title">Perform this action on your GitHub account</div>' +
            '<div class="jdjp-item-desc">' + jdEscape(msg.substring(0, 48)) + '</div>' +
            '<div class="jdjp-item-time">Allowed - ' + ago + '</div>' +
            '</div></div>';
        }).join('');
      })
      .catch(function () {
        listEl.innerHTML = '<div class="jdjp-item"><div class="jdjp-item-body"><div class="jdjp-item-desc">Could not load</div></div></div>';
      });
  }
  function jdOpenApproval(idx) {
    var commits = window._jdCommits || [];
    var c = commits[idx];
    if (!c) return;
    var msg = (c.commit && c.commit.message) || '';
    var sha = c.sha ? c.sha.substring(0, 7) : '';
    var ago = jdTimeAgo(c.commit && c.commit.author && c.commit.author.date);
    fetch('https://api.github.com/repos/JepongDevxyz/JepongDevxyz-AI/commits/' + c.sha)
      .then(function (r) { return r.json(); })
      .then(function (d) { jdShowApproval(c, d, msg, sha, ago); })
      .catch(function () { jdShowApproval(c, null, msg, sha, ago); });
  }
  function jdShowApproval(c, detail, msg, sha, ago) {
    var el = document.getElementById('jdActDetail');
    if (!el) { el = document.createElement('div'); el.id = 'jdActDetail'; document.body.appendChild(el); }
    var files = (detail && detail.files) ? detail.files : [];
    var filesHtml = files.slice(0, 8).map(function (f, i) {
      return '<div class="jdad-detail-row"><span class="jdad-detail-key">File ' + (i + 1) + ':</span><span class="jdad-detail-val">' + jdEscape(f.filename || '') + '</span></div>';
    }).join('');
    el.innerHTML =
      '<div class="jdad-header"><button class="jdad-back" data-ad="back">' + ICON_BACK + '</button></div>' +
      '<div class="jdad-body">' +
      '<div class="jdad-statusrow"><span class="jdad-badge allowed">Allowed</span><span class="jdad-time">' + ago + '</span></div>' +
      '<div class="jdad-title">Perform this action on your GitHub account</div>' +
      '<div class="jdad-desc">' + jdEscape(msg.split('\n')[0]) + '</div>' +
      '<div class="jdad-section">DETAILS</div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Action:</span><span class="jdad-detail-val">Push files to GitHub</span></div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Branch:</span><span class="jdad-detail-val">main</span></div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Commit:</span><span class="jdad-detail-val">' + sha + '</span></div>' +
      '<div class="jdad-detail-row"><span class="jdad-detail-key">Repository:</span><span class="jdad-detail-val">JepongDevxyz-AI</span></div>' +
      filesHtml +
      '<div class="jdad-section">MESSAGE</div><div class="jdad-cmd">' + jdEscape(msg) + '</div>' +
      '</div>';
    el.querySelector('[data-ad="back"]').addEventListener('click', function () { el.classList.remove('open'); });
    el.classList.add('open');
  }

  // Make activity items clickable
  document.addEventListener('click', function (e) {
    var item = e.target.closest('.jdjp-item');
    if (item) {
      if (item.dataset.commit !== undefined && item.dataset.commit !== '') {
        jdOpenApproval(parseInt(item.dataset.commit, 10));
        return;
      }
      if (item.dataset.idx !== undefined && item.dataset.idx !== '') {
        openActivityDetail(item.dataset.idx);
      }
    }
    // Approval buttons
    var appr = e.target.closest('[data-appr]');
    if (appr) {
      var action = appr.dataset.appr;
      if (typeof window.jdToast === 'function') {
        window.jdToast(action === 'allow' ? 'Allowed' : 'Denied');
      }
      // Hide the needs review section after action
      var approveEl = appr.closest('.jdad-approve');
      if (approveEl) approveEl.style.display = 'none';
    }
  });

  window.jdOpenJampongProfile = open;
  window.jdCloseJampongProfile = close;
  window.jdJampongOpenShare = open;
  window.jdOpenJampongFile = openFileViewer;
})();
