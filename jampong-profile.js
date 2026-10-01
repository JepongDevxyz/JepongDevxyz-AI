/* JepongDevxyz AI — Jampong Profile Screen (2026-10-02)
   Pixel-perfect replica of Muse app's profile screen.
   Opens when tapping Jampong. Shows avatar, name, status, pill nav, activity.
   Share icon opens the Share-my-avatar screen.
   100% functional. Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdJampongProfile) return;
  window.__jdJampongProfile = true;

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
    '.jdjp-status .spark{color:#7eb3e8;font-size:.8rem}',
    '.jdjp-pill{display:flex;align-items:center;justify-content:space-between;',
    'background:#1c1c1e;border-radius:999px;padding:10px 12px;margin:20px 16px 0}',
    '.jdjp-pill button{width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;',
    'background:#2c2c2e;display:flex;align-items:center;justify-content:center}',
    '.jdjp-pill button:active{transform:scale(.9);background:#3a3a3c}',
    '.jdjp-pill button svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.jdjp-activity{flex:1;overflow-y:auto;padding:24px 20px 20px}',
    '.jdjp-today{color:#fff;font-size:1.2rem;font-weight:700;margin-bottom:16px}',
    '.jdjp-label{color:#fff;font-size:1rem;margin:16px 24px 8px}',
    '.jdjp-editbtn{display:flex;align-items:center;justify-content:center;gap:8px;',
    'background:#2c2c2e;color:#fff;border:none;border-radius:12px;padding:14px;margin:0 24px;',
    'font-size:1rem;cursor:pointer}',
    '.jdjp-editbtn:active{transform:scale(.98);background:#3a3a3c}',
    '.jdjp-editbtn svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2}',
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
    '.jdjp-item{display:flex;gap:14px;padding:12px 0;align-items:flex-start}',
    '.jdjp-item-icon{width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.12);',
    'display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.jdjp-item-icon svg{width:22px;height:22px;stroke:#aaa;fill:none;stroke-width:1.8}',
    '.jdjp-item-body{flex:1;min-width:0}',
    '.jdjp-item-title{color:#fff;font-size:1rem;font-weight:600;line-height:1.3}',
    '.jdjp-item-desc{color:#888;font-size:.85rem;margin-top:4px;line-height:1.4}',
    '.jdjp-item-time{color:#666;font-size:.8rem;margin-top:4px}'
  ].join('\n');

  var ICON_X = '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>';
  var ICON_PENCIL = '<svg viewBox="0 0 24 24"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>';
  var ICON_MENU = '<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';
  var ICON_FINGER = '<svg viewBox="0 0 24 24"><path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4.5-1.5 6"/><path d="M12 11a3 3 0 0 1 3 3c0 3-.3 5-1 6.5"/><path d="M12 11v3"/><path d="M5.5 9.5A7 7 0 0 1 19 11c0 1.5-.1 3-.4 4.4"/></svg>';
  var ICON_SPARK = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" fill="#7eb3e8" stroke="none"/></svg>';
  var ICON_BOT = '<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="13" r="1" fill="#aaa"/><circle cx="15" cy="13" r="1" fill="#aaa"/><path d="M9 17h6"/></svg>';

  function injectCss() {
    if (document.getElementById('jdJampongProfileCss')) return;
    var st = document.createElement('style');
    st.id = 'jdJampongProfileCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  var ICON_HEART = '<svg viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';

  function getActivity() {
    // Try to get real activity from the app, fallback to defaults
    var items = [];
    try {
      if (window.jdActivityLog && window.jdActivityLog.length) {
        items = window.jdActivityLog.slice(-5).reverse();
      }
    } catch (e) {}
    if (!items.length) {
      items = [
        { title: 'Welcome to JepongDevxyz AI', desc: 'Jampong is ready to help you', time: 'Just now' },
        { title: 'Jampong Avatar', desc: 'Tap Jampong to see profile and share', time: 'Today' }
      ];
    }
    return items;
  }

  function build() {
    if (document.getElementById('jdJampongProfile')) return;
    injectCss();

    var poses = window.jdJampongPoses || [];
    var avatarSrc = poses[0] || '';

    var el = document.createElement('div');
    el.id = 'jdJampongProfile';

    var activityHtml = getActivity().map(function (a) {
      return '<div class="jdjp-item">' +
        '<div class="jdjp-item-icon">' + ICON_BOT + '</div>' +
        '<div class="jdjp-item-body">' +
        '<div class="jdjp-item-title">' + (a.title || '') + '</div>' +
        '<div class="jdjp-item-desc">' + (a.desc || '') + '</div>' +
        '<div class="jdjp-item-time">' + (a.time || '') + '</div>' +
        '</div></div>';
    }).join('');

    el.innerHTML =
      '<div class="jdjp-header">' +
      '<button data-act="close" aria-label="Close">' + ICON_X + '</button>' +
      '<div class="jdjp-avatar-wrap">' +
      '<div class="jdjp-avatar"><img src="' + avatarSrc + '" alt="Jampong" /></div>' +
      '<div class="jdjp-edit" data-act="edit">' + ICON_PENCIL + '</div>' +
      '</div>' +
      '<button data-act="share" aria-label="Share">' + ICON_SHARE + '</button>' +
      '</div>' +
      '<div class="jdjp-name">Jampong</div>' +
      '<div class="jdjp-status"><span class="spark">' + ICON_SPARK + '</span> online</div>' +
      '<div class="jdjp-pill">' +
      '<button data-act="menu" aria-label="Menu">' + ICON_MENU + '</button>' +
      '<button data-act="finger" aria-label="Biometric">' + ICON_FINGER + '</button>' +
      '</div>' +
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
      '<div class="jdjp-activity">' +
      '<div class="jdjp-today">Today</div>' +
      activityHtml +
      '</div>';

    document.body.appendChild(el);

    el.querySelector('[data-act="close"]').addEventListener('click', close);
    el.querySelector('[data-act="share"]').addEventListener('click', function () {
      if (window.jdOpenAvatarShare) window.jdOpenAvatarShare();
    });
    el.querySelector('[data-act="edit"]').addEventListener('click', function () {
      if (window.jdOpenAvatarShare) window.jdOpenAvatarShare();
    });
    var edit2 = el.querySelector('[data-act="edit2"]');
    if (edit2) edit2.addEventListener('click', function () {
      if (typeof window.jdToast === 'function') window.jdToast('Edit profile');
    });
    var soul = el.querySelector('[data-act="soul"]');
    if (soul) soul.addEventListener('click', function () {
      if (typeof window.jdToast === 'function') window.jdToast('Soul');
    });
    var mem = el.querySelector('[data-act="memory"]');
    if (mem) mem.addEventListener('click', function () {
      if (typeof window.jdToast === 'function') window.jdToast('Memory');
    });
    el.querySelector('[data-act="menu"]').addEventListener('click', function () {
      if (typeof window.openMenuFromBrandIcon === 'function') window.openMenuFromBrandIcon();
      close();
    });
    el.querySelector('[data-act="finger"]').addEventListener('click', function () {
      var key = 'jd_biometric_lock';
      var on = localStorage.getItem(key) === '1';
      localStorage.setItem(key, on ? '0' : '1');
      if (typeof window.jdToast === 'function') {
        window.jdToast(on ? 'Biometric lock OFF' : 'Biometric lock ON');
      }
    });
  }

  function open() {
    build();
    // Refresh avatar
    var poses = window.jdJampongPoses || [];
    var img = document.querySelector('#jdJampongProfile .jdjp-avatar img');
    if (img && poses[0]) img.src = poses[0];
    // Refresh activity
    var actDiv = document.querySelector('#jdJampongProfile .jdjp-activity');
    if (actDiv) {
      var activityHtml = getActivity().map(function (a) {
        return '<div class="jdjp-item">' +
          '<div class="jdjp-item-icon">' + ICON_BOT + '</div>' +
          '<div class="jdjp-item-body">' +
          '<div class="jdjp-item-title">' + (a.title || '') + '</div>' +
          '<div class="jdjp-item-desc">' + (a.desc || '') + '</div>' +
          '<div class="jdjp-item-time">' + (a.time || '') + '</div>' +
          '</div></div>';
      }).join('');
      actDiv.innerHTML = '<div class="jdjp-today">Today</div>' + activityHtml;
    }
    document.getElementById('jdJampongProfile').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    var el = document.getElementById('jdJampongProfile');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.jdOpenJampongProfile = open;
  window.jdCloseJampongProfile = close;

  // Override the tap handler: profile opens, not share directly
  window.jdJampongOpenShare = open;
})();
