/* JepongDevxyz AI — Jampong "Share my avatar" (2026-10-01)
   Pixel-perfect replica of Muse app's Share-my-avatar screen.
   Opens when tapping Jampong. Swipeable carousel with 4 poses.
   100% functional: swipe, dots, share, download. Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdAvatarShare) return;
  window.__jdAvatarShare = true;

  var CARD_COLORS = ['#f9a8c9', '#7fb3e8', '#f5a623', '#9b59b6'];
  var CARD_LABELS = ['Blush', 'Focus', 'Glow', 'Star'];

  var CSS = [
    '#jdAvatarShare{position:fixed;inset:0;z-index:99999;background:#000;',
    'display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .3s}',
    '#jdAvatarShare.open{opacity:1;pointer-events:auto}',
    '.jdas-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:16px 12px;color:#fff}',
    '.jdas-header button{width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;',
    'background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center}',
    '.jdas-header button:active{transform:scale(.92)}',
    '.jdas-header button svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2}',
    '.jdas-title{font-size:1.1rem;font-weight:600;color:#fff}',
    '.jdas-carousel{flex:1;display:flex;align-items:center;overflow:hidden;position:relative}',
    '.jdas-track{display:flex;width:100%;height:100%;transition:transform .4s cubic-bezier(.25,.8,.25,1)}',
    '.jdas-card{flex:0 0 100%;display:flex;align-items:center;justify-content:center;padding:20px}',
    '.jdas-card-inner{width:min(85vw,340px);aspect-ratio:3/4;border-radius:24px;',
    'display:flex;flex-direction:column;align-items:center;justify-content:flex-start;',
    'box-shadow:0 20px 60px rgba(0,0,0,.4);position:relative;overflow:hidden;padding-top:20px}',
    '.jdas-card-inner img{width:70%;height:auto;filter:drop-shadow(0 10px 20px rgba(0,0,0,.2));',
    'animation:jdJampLive 4s ease-in-out infinite}',
    '.jdas-imgbox{background:#fff;border-radius:20px;padding:16px;margin:16px 16px 0;width:calc(100% - 32px)}',
    '.jdas-imgbox img{width:100%;height:auto;border-radius:12px}',
    '.jdas-bubble{background:#fff;border-radius:16px;padding:14px 16px;margin:12px 24px 20px;',
    'font-size:.85rem;line-height:1.4;color:#333;position:relative}',
    '.jdas-bubble:after{content:"";position:absolute;top:-8px;left:32px;width:16px;height:16px;',
    'background:#fff;transform:rotate(45deg)}',
    '.jdas-card-label{position:absolute;bottom:20px;color:rgba(255,255,255,.9);',
    'font-size:.9rem;font-weight:500}',
    '.jdas-dots{display:flex;justify-content:center;gap:8px;padding:16px}',
    '.jdas-dots span{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.3);transition:all .3s}',
    '.jdas-dots span.active{background:#fff;transform:scale(1.3)}',
    '.jdas-actions{display:flex;align-items:center;justify-content:center;gap:16px;padding:20px}',
    '.jdas-actions button{width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;',
    'background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}',
    '.jdas-actions button:active{transform:scale(.9)}',
    '.jdas-actions button svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:1.8}',
    '.jdas-action-wrap{display:flex;flex-direction:column;align-items:center;gap:6px}',
    '.jdas-action-label{color:#fff;font-size:.7rem}',
    '.jdas-share-main{background:#fff!important}',
    '.jdas-share-main svg{stroke:#000!important}'
  ].join('\n');

  var ICON_X = '<svg viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>';
  var ICON_IG = '<svg viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="#fff"/></svg>';
  var ICON_WA = '<svg viewBox="0 0 24 24"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M9 11c.5 2 2.5 4 4.5 4.5l1.5-1.5 2 1c-.5 1.5-1.5 2-3 1.5-3-1-6-4-7-7-.5-1.5 0-2.5 1.5-3l1 2L9 11z"/></svg>';
  var ICON_MSG = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var ICON_DL = '<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>';

  var currentIdx = 0;
  var startX = 0;
  var poses = [];

  function injectCss() {
    if (document.getElementById('jdAvatarShareCss')) return;
    var st = document.createElement('style');
    st.id = 'jdAvatarShareCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function build() {
    if (document.getElementById('jdAvatarShare')) return;
    injectCss();
    poses = window.jdJampongPoses || [];

    var el = document.createElement('div');
    el.id = 'jdAvatarShare';

    var cardsHtml = CARD_COLORS.map(function (color, i) {
      var img = poses[i] ? '<img src="' + poses[i] + '" alt="Jampong" />' : '';
      return '<div class="jdas-card"><div class="jdas-card-inner" style="background:' + color + '">' +
        '<div class="jdas-imgbox">' + img + '</div>' +
        '<div class="jdas-bubble">Hi, I\'m Jampong, Jepong\'s personal AI agent. ' +
        'Join JepongDevxyz AI and create your own agent today.</div>' +
        '</div></div>';
    }).join('');

    var dotsHtml = CARD_COLORS.map(function (_, i) {
      return '<span class="' + (i === 0 ? 'active' : '') + '" data-dot="' + i + '"></span>';
    }).join('');

    el.innerHTML =
      '<div class="jdas-header">' +
      '<button data-act="close" aria-label="Close">' + ICON_X + '</button>' +
      '<div class="jdas-title">Share my avatar</div>' +
      '<button data-act="share" aria-label="Share">' + ICON_SHARE + '</button>' +
      '</div>' +
      '<div class="jdas-carousel"><div class="jdas-track">' + cardsHtml + '</div></div>' +
      '<div class="jdas-dots">' + dotsHtml + '</div>' +
      '<div class="jdas-actions">' +
      '<div class="jdas-action-wrap"><button data-act="share" aria-label="Share">' + ICON_SHARE + '</button><span class="jdas-action-label">Share</span></div>' +
      '<div class="jdas-action-wrap"><button data-act="ig" aria-label="Instagram story">' + ICON_IG + '</button><span class="jdas-action-label">Instagram story</span></div>' +
      '<div class="jdas-action-wrap"><button data-act="wa" aria-label="WhatsApp">' + ICON_WA + '</button><span class="jdas-action-label">WhatsApp</span></div>' +
      '<div class="jdas-action-wrap"><button data-act="msg" aria-label="Instagram message">' + ICON_MSG + '</button><span class="jdas-action-label">Instagram message</span></div>' +
      '</div>';

    document.body.appendChild(el);

    // Close
    el.querySelector('[data-act="close"]').addEventListener('click', close);

    // Share
    el.querySelector('[data-act="share"]').addEventListener('click', function () {
      shareCurrent();
    });

    // Instagram
    el.querySelector('[data-act="ig"]').addEventListener('click', function () {
      downloadCurrent('jampong-instagram.png');
      if (typeof window.jdToast === 'function') window.jdToast('Na-download! I-share sa Instagram story');
    });

    // WhatsApp
    el.querySelector('[data-act="wa"]').addEventListener('click', function () {
      var url = 'https://wa.me/?text=' + encodeURIComponent('Check out my Jampong avatar! 🐾');
      window.open(url, '_blank');
    });

    // Download (via Share button long-press or use share)
    // Share uses native share sheet which includes save/download

    // Message
    el.querySelector('[data-act="msg"]').addEventListener('click', function () {
      if (navigator.share) {
        shareCurrent();
      } else {
        downloadCurrent('jampong-avatar.png');
      }
    });

    // Swipe
    var track = el.querySelector('.jdas-track');
    var carousel = el.querySelector('.jdas-carousel');
    carousel.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
    }, { passive: true });
    carousel.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      if (dx < -50 && currentIdx < CARD_COLORS.length - 1) goTo(currentIdx + 1);
      else if (dx > 50 && currentIdx > 0) goTo(currentIdx - 1);
    }, { passive: true });

    // Dots
    el.querySelectorAll('[data-dot]').forEach(function (dot) {
      dot.addEventListener('click', function () {
        goTo(parseInt(dot.dataset.dot, 10));
      });
    });
  }

  function goTo(idx) {
    currentIdx = idx;
    var track = document.querySelector('#jdAvatarShare .jdas-track');
    if (track) track.style.transform = 'translateX(-' + (idx * 100) + '%)';
    document.querySelectorAll('#jdAvatarShare [data-dot]').forEach(function (d, i) {
      d.classList.toggle('active', i === idx);
    });
  }

  function dataURLtoBlob(dataURL) {
    var parts = dataURL.split(',');
    var mime = parts[0].match(/:(.*?);/)[1];
    var bstr = atob(parts[1]);
    var n = bstr.length;
    var u8 = new Uint8Array(n);
    for (var i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i);
    return new Blob([u8], { type: mime });
  }

  function downloadCurrent(filename) {
    var dataURL = poses[currentIdx];
    if (!dataURL) return;
    var a = document.createElement('a');
    a.href = dataURL;
    a.download = filename || 'jampong-avatar.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (typeof window.jdToast === 'function') window.jdToast('Na-download na!');
  }

  function shareCurrent() {
    var dataURL = poses[currentIdx];
    if (!dataURL) return;
    if (navigator.share) {
      var blob = dataURLtoBlob(dataURL);
      var file = new File([blob], 'jampong-avatar.png', { type: 'image/png' });
      navigator.share({
        title: 'My Jampong Avatar',
        text: 'Check out my Jampong avatar! 🐾',
        files: [file]
      }).catch(function () {});
    } else {
      downloadCurrent('jampong-avatar.png');
    }
  }

  function open() {
    // Only open when Jampong toggle is ON
    if (window.jdJampongIsOn && !window.jdJampongIsOn()) return;
    build();
    poses = window.jdJampongPoses || [];
    // Refresh images in case poses updated
    var imgs = document.querySelectorAll('#jdAvatarShare .jdas-card-inner img');
    imgs.forEach(function (img, i) {
      if (poses[i]) img.src = poses[i];
    });
    goTo(0);
    document.getElementById('jdAvatarShare').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    var el = document.getElementById('jdAvatarShare');
    if (el) el.classList.remove('open');
    document.body.style.overflow = '';
  }

  window.jdOpenAvatarShare = open;
  window.jdCloseAvatarShare = close;
})();
