/* JepongDevxyz AI — Muse-style Animations (2026-10-01)
   Brings the Muse app's smooth animations to JepongDevxyz AI:
   - Page transitions: slide in from right, slide out
   - Progress bars: smooth fill animations
   - Buttons: scale press feedback
   - Modals/sheets: slide up from bottom
   - Cards: subtle entrance animations
   - Toggles: smooth slide
   Global, automatic. Respects prefers-reduced-motion.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdAnimations) return;
  window.__jdAnimations = true;

  var CSS = [
    /* Respect reduced motion */
    '@media (prefers-reduced-motion: reduce){',
    '*{animation-duration:.01ms!important;transition-duration:.01ms!important}}',
    /* Page transitions */
    '.jd-page-enter{animation:jdPageIn .28s cubic-bezier(.32,.72,0,1)}',
    '@keyframes jdPageIn{from{transform:translateX(40px);opacity:0}to{transform:translateX(0);opacity:1}}',
    '.jd-page-exit{animation:jdPageOut .22s ease-in}',
    '@keyframes jdPageOut{from{transform:translateX(0);opacity:1}to{transform:translateX(40px);opacity:0}}',
    /* Button press */
    'button{transition:transform .12s ease,opacity .12s ease}',
    'button:active{transform:scale(.97)}',
    '.jdset-back:active,.jdmem-back:active,.jduse-back:active{transform:scale(.9)!important}',
    /* Cards entrance */
    '.jd-anim-in{animation:jdFadeUp .35s cubic-bezier(.32,.72,0,1) both}',
    '@keyframes jdFadeUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}',
    /* Stagger children */
    '.jd-stagger > *{animation:jdFadeUp .4s cubic-bezier(.32,.72,0,1) both}',
    '.jd-stagger > *:nth-child(1){animation-delay:.03s}',
    '.jd-stagger > *:nth-child(2){animation-delay:.06s}',
    '.jd-stagger > *:nth-child(3){animation-delay:.09s}',
    '.jd-stagger > *:nth-child(4){animation-delay:.12s}',
    '.jd-stagger > *:nth-child(5){animation-delay:.15s}',
    '.jd-stagger > *:nth-child(6){animation-delay:.18s}',
    '.jd-stagger > *:nth-child(7){animation-delay:.21s}',
    '.jd-stagger > *:nth-child(8){animation-delay:.24s}',
    /* Progress bars */
    '.jdset-bar-fill,.jduse-fill,.jd-sk{transition:width .6s cubic-bezier(.32,.72,0,1)}',
    /* Toggle smooth */
    '.jdset-toggle,.jdmem-toggle,.jdpers-toggle{transition:background .25s ease}',
    '.jdset-toggle::after,.jdmem-toggle::after,.jdpers-toggle::after{transition:left .25s cubic-bezier(.32,.72,0,1),background .25s}',
    /* Modal sheets slide up */
    '#jdGuideModal .jd-guide-sheet{animation:jdSheetUp .32s cubic-bezier(.32,.72,0,1)}',
    '@keyframes jdSheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '#jdpersSheet .jdpers-sheet{animation:jdSheetUp .32s cubic-bezier(.32,.72,0,1)}',
    /* Skeleton shimmer (already in skeleton.js, ensure smooth) */ 
    '.jd-sk{animation:jdSkShimmer 1.6s ease-in-out infinite}',
    /* Chat messages */
    '.msg{animation:jdMsgIn .25s ease-out}',
    '@keyframes jdMsgIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}',
    /* Settings rows */
    '.jdset-row,.jdmem-card,.jdpers-drop,.jdpers-tgl{transition:background .15s,transform .12s}',
    /* Header */
    '.jdset-header,.jdmem-header,.jdpers-header,.jduse-header{animation:jdFadeDown .3s ease-out}',
    '@keyframes jdFadeDown{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdAnimCss')) return;
    var st = document.createElement('style');
    st.id = 'jdAnimCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* Auto-apply page transition when our pages open */
  function watchPages() {
    var pages = ['jdSetPage', 'jdMemPage', 'jdPersPage', 'jdUsePage', 'jdGuideModal'];
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (mu) {
        if (mu.attributeName === 'hidden') {
          var el = mu.target;
          if (pages.indexOf(el.id) >= 0) {
            if (!el.hidden) {
              el.classList.remove('jd-page-exit');
              el.classList.add('jd-page-enter');
              // Add stagger to groups
              var scroll = el.querySelector('.jdset-scroll,.jdmem-scroll,.jdpers-scroll,.jduse-scroll,.jd-guide-body');
              if (scroll) {
                scroll.classList.add('jd-stagger');
                setTimeout(function () { scroll.classList.remove('jd-stagger'); }, 800);
              }
            }
          }
        }
      });
    });
    // Watch after pages are built
    setInterval(function () {
      pages.forEach(function (id) {
        var el = document.getElementById(id);
        if (el && !el.__jdAnimWatch) {
          el.__jdAnimWatch = true;
          mo.observe(el, { attributes: true, attributeFilter: ['hidden'] });
        }
      });
    }, 1000);
  }

  function init() {
    ensureCSS();
    watchPages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
