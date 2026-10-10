/* JepongDevxyz AI — Animated reactions (2026-10-10)
   Makes message reactions float up with animation, like the Muse app.
   When a reaction is tapped, the emoji floats up from the message
   and fades out, with a nice spring animation. */
(function () {
  'use strict';
  if (window.__jdReactionAnim) return;
  window.__jdReactionAnim = true;

  var CSS = [
    /* Floating reaction animation */
    '@keyframes jdReactFloat{',
    '  0%{transform:translateY(0) scale(0.5);opacity:0;}',
    '  15%{transform:translateY(-10px) scale(1.2);opacity:1;}',
    '  100%{transform:translateY(-80px) scale(1);opacity:0;}',
    '}',
    '.jd-react-float{',
    '  position:fixed;z-index:10002;pointer-events:none;',
    '  font-size:32px;line-height:1;',
    '  animation:jdReactFloat 0.9s cubic-bezier(.2,.7,.3,1) forwards;',
    '}',
    /* Party popper burst for 🎉 */
    '@keyframes jdReactBurst{',
    '  0%{transform:scale(0.3);opacity:0;}',
    '  30%{transform:scale(1.4);opacity:1;}',
    '  100%{transform:scale(1) translateY(-40px);opacity:0;}',
    '}',
    '.jd-react-float.jd-burst{animation:jdReactBurst 1s ease-out forwards;font-size:40px;}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('jdReactAnimCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdReactAnimCSS';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* Show floating animation at the tap position */
  function floatReaction(emoji, x, y) {
    var el = document.createElement('div');
    el.className = 'jd-react-float' + (emoji === '🎉' ? ' jd-burst' : '');
    el.textContent = emoji;
    el.style.left = (x - 16) + 'px';
    el.style.top = (y - 16) + 'px';
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 1000);
  }

  /* Hook into reaction taps */
  function init() {
    injectCSS();
    // Listen for taps on reaction chips and emoji picker
    document.addEventListener('click', function(e) {
      var chip = e.target.closest('.jd-reaction-inline, .jd-emoji-grid button, .jd-quick-react');
      if (chip) {
        var emoji = chip.textContent.trim() || chip.getAttribute('data-emoji');
        if (emoji) {
          var rect = chip.getBoundingClientRect();
          floatReaction(emoji, rect.left + rect.width/2, rect.top);
        }
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
