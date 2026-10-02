/* JepongDevxyz AI — Mode UI + 3D Carousel (2026-10-01)
   1. Better Mode UI: the mode picker gets icons, descriptions, and modern
      card styling (was a plain text list).
   2. 3D carousel: the model provider carousel now uses a 3D cube/box
      rotation animation when switching pages (like the phone's screen
      transition effects) instead of a flat slide.
   Pure addition: no existing code changed. Idempotent. */
(function () {
  'use strict';
  if (window.__jdModeCarousel) return;
  window.__jdModeCarousel = true;

  /* ============ 1. MODE UI IMPROVEMENT ============ */
  var MODE_META = {
    general: { icon: 'bot',        desc: 'Everyday chat, questions & help' },
    school:  { icon: 'graduation-cap', desc: 'Homework, lessons & study help' },
    coder:   { icon: 'code-2',     desc: 'Programming, debugging & code review' },
    tagalog: { icon: 'message-circle', desc: 'Kausapin sa Tagalog, parang kaibigan' },
    imagen:  { icon: 'image',       desc: 'Generate images from text' },
    custom:  { icon: 'user-cog',    desc: 'Your own custom AI persona' }
  };

  var MODE_CSS = [
    '#modeModalOverlay .floating-modal{padding:12px!important;border-radius:24px!important}',
    '#modeModalOverlay .option-item{display:flex!important;align-items:center;gap:14px;',
    'padding:14px 16px!important;border-radius:16px!important;margin-bottom:8px!important;',
    'border:1px solid transparent;transition:all .2s ease}',
    '#modeModalOverlay .option-item:active{transform:scale(.97)}',
    '#modeModalOverlay .option-item.active{border-color:rgba(99,102,241,.4)!important;',
    'background:rgba(99,102,241,.08)!important}',
    '.jd-mode-ic{flex:0 0 auto;width:44px;height:44px;border-radius:14px;',
    'background:linear-gradient(135deg,#6366f1,#8b5cf6);display:flex;align-items:center;justify-content:center}',
    '.jd-mode-ic svg{width:22px;height:22px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jd-mode-tx{flex:1;min-width:0;text-align:left}',
    '.jd-mode-tx .option-name{font-size:1rem;font-weight:600;display:block;margin-bottom:2px}',
    '.jd-mode-tx .jd-mode-desc{font-size:.82rem;opacity:.65;display:block}',
    /* Light mode */
    'body.theme-light #modeModalOverlay .option-item.active{background:rgba(99,102,241,.06)!important}'
  ].join('\n');

  var ICONS = {
    'bot': '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    'graduation-cap': '<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/>',
    'code-2': '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
    'message-circle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
    'image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
    'user-cog': '<circle cx="18" cy="15" r="3"/><circle cx="9" cy="7" r="4"/><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="m21.7 16.4-.9-.3"/><path d="m15.2 13.9-.9-.3"/>'
  };

  function upgradeModeUI() {
    var modal = document.getElementById('modeModalOverlay');
    if (!modal || modal.__jdModeUpgraded) return;
    modal.__jdModeUpgraded = true;

    // Add CSS
    if (!document.getElementById('jdModeCss')) {
      var st = document.createElement('style');
      st.id = 'jdModeCss';
      st.textContent = MODE_CSS;
      document.head.appendChild(st);
    }

    // Upgrade each option
    modal.querySelectorAll('.option-item').forEach(function (btn) {
      var onclick = btn.getAttribute('onclick') || '';
      var m = onclick.match(/selectMode\('(\w+)'/);
      if (!m) return;
      var key = m[1];
      var meta = MODE_META[key];
      if (!meta || btn.querySelector('.jd-mode-ic')) return;

      var nameEl = btn.querySelector('.option-name');
      var name = nameEl ? nameEl.textContent : key;
      var iconSvg = '<svg viewBox="0 0 24 24">' + (ICONS[meta.icon] || ICONS['bot']) + '</svg>';

      btn.innerHTML =
        '<div class="jd-mode-ic">' + iconSvg + '</div>' +
        '<div class="jd-mode-tx">' +
        '<span class="option-name">' + name + '</span>' +
        '<span class="jd-mode-desc">' + meta.desc + '</span>' +
        '</div>' +
        '<div class="radio-icon"></div>';
    });
  }

  /* ============ 2. 3D CUBE CAROUSEL ============ */
  var CUBE_CSS = [
    '#modelPagesViewport{perspective:1400px!important}',
    '#modelPagesTrack{transform-style:preserve-3d!important}',
    '#modelPagesTrack.jd-cube .model-provider-page{',
    'backface-visibility:hidden}',
    /* Smooth cube rotation */
    '#modelPagesTrack{transition:transform .55s cubic-bezier(.25,.8,.25,1)!important}'
  ].join('\n');

  var cubeActive = false;
  var currentCubePage = 0;

  function setupCube() {
    var viewport = document.getElementById('modelPagesViewport');
    var track = document.getElementById('modelPagesTrack');
    if (!viewport || !track) return;
    // The picker now positions each provider page inside a single viewport.
    // The legacy cube transforms each page as a 3D face and makes both
    // providers visible side-by-side during mobile swipes, so do not apply it.
    if (track.dataset.jdPerPageLayout === 'true') return;
    if (track.__jdCube) return;
    track.__jdCube = true;

    if (!document.getElementById('jdCubeCss')) {
      var st = document.createElement('style');
      st.id = 'jdCubeCss';
      st.textContent = CUBE_CSS;
      document.head.appendChild(st);
    }

    var pages = track.querySelectorAll('.model-provider-page');
    if (!pages.length) return;

    var w = viewport.offsetWidth || viewport.clientWidth || 300;
    var half = w / 2;

    // Position pages in a 3D cube formation
    track.classList.add('jd-cube');
    pages.forEach(function (page, i) {
      page.style.position = 'absolute';
      page.style.top = '0';
      page.style.left = '0';
      page.style.width = '100%';
      page.style.height = '100%';
      page.style.transform = 'rotateY(' + (i * 90) + 'deg) translateZ(' + half + 'px)';
      page.style.backfaceVisibility = 'hidden';
    });

    // Set track to preserve-3d and position relative
    track.style.position = 'relative';
    track.style.transformStyle = 'preserve-3d';

    cubeActive = true;

    // Watch for the original code changing the transform (page switch)
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        if (mu.attributeName !== 'style') return;
        var t = track.style.transform || '';
        // Original sets: translate3d(-X%,0,0)
        var m = t.match(/translate3d\(-?(\d+(?:\.\d+)?)%/);
        if (m) {
          var pageIdx = Math.round(parseFloat(m[1]) / 100);
          applyCubeRotation(pageIdx);
        }
      });
    });
    mo.observe(track, { attributes: true, attributeFilter: ['style'] });
  }

  function applyCubeRotation(pageIdx) {
    var track = document.getElementById('modelPagesTrack');
    if (!track || !cubeActive) return;
    if (pageIdx === currentCubePage) return;
    currentCubePage = pageIdx;
    // Temporarily disable the observer's reaction by setting our own transform
    // Use a flag to avoid loop
    track.__jdCubeRotating = true;
    track.style.transition = 'transform .55s cubic-bezier(.25,.8,.25,1)';
    track.style.transform = 'translateZ(-' + ((track.parentElement.offsetWidth || 300) / 2) + 'px) rotateY(' + (-pageIdx * 90) + 'deg)';
    setTimeout(function () { track.__jdCubeRotating = false; }, 600);
  }

  window.__jdDisableModelCube = function () {
    var track = document.getElementById('modelPagesTrack');
    if (!track || !track.__jdCube) return;
    cubeActive = false;
    currentCubePage = 0;
    track.classList.remove('jd-cube');
    track.style.transform = '';
    track.style.transition = '';
    track.style.transformStyle = '';
    track.querySelectorAll('.model-provider-page').forEach(function (page) {
      page.style.backfaceVisibility = '';
    });
  };

  function init() {
    upgradeModeUI();
    // Re-check when modals open (in case DOM was rebuilt)
    var mo = new MutationObserver(function () {
      upgradeModeUI();
      var picker = document.getElementById('modelPickerModal');
      if (picker && picker.offsetParent !== null) {
        setupCube();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    // Also try on interval for the cube (viewport width needs layout)
    setInterval(function () {
      var picker = document.getElementById('modelPickerModal');
      if (picker && picker.offsetParent !== null) setupCube();
    }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
