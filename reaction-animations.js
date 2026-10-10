/* JepongDevxyz AI — Animated reactions (2026-10-10)
   Makes message reactions float up with animation, like the Muse app.
   Each emoji has its own exact animation. AI auto-reactions also animate. */
(function () {
  'use strict';
  if (window.__jdReactionAnim) return;
  window.__jdReactionAnim = true;

  var CSS = [
    /* Remove the second (old floating) reaction - keep only the inline one */
    '.jd-reaction-chip{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}',
    /* Base floating animation */
    '@keyframes jdReactFloat{',
    '  0%{transform:translateY(0) scale(0.5);opacity:0;}',
    '  15%{transform:translateY(-10px) scale(1.2);opacity:1;}',
    '  100%{transform:translateY(-80px) scale(1);opacity:0;}',
    '}',
    /* Heart: pulse then float */
    '@keyframes jdReactHeart{',
    '  0%{transform:scale(0.3);opacity:0;}',
    '  25%{transform:scale(1.3);opacity:1;}',
    '  50%{transform:scale(1) translateY(-20px);opacity:1;}',
    '  100%{transform:scale(1) translateY(-80px);opacity:0;}',
    '}',
    /* Party: burst */
    '@keyframes jdReactBurst{',
    '  0%{transform:scale(0.3) rotate(-10deg);opacity:0;}',
    '  30%{transform:scale(1.5) rotate(5deg);opacity:1;}',
    '  100%{transform:scale(1) translateY(-50px) rotate(0deg);opacity:0;}',
    '}',
    /* Fire: flicker up */
    '@keyframes jdReactFire{',
    '  0%{transform:translateY(0) scale(0.6);opacity:0;}',
    '  20%{transform:translateY(-15px) scale(1.3) rotate(-5deg);opacity:1;}',
    '  40%{transform:translateY(-30px) scale(1.1) rotate(5deg);opacity:1;}',
    '  100%{transform:translateY(-90px) scale(1);opacity:0;}',
    '}',
    '.jd-react-float{',
    '  position:fixed;z-index:10002;pointer-events:none;',
    '  font-size:32px;line-height:1;',
    '  animation:jdReactFloat 0.9s cubic-bezier(.2,.7,.3,1) forwards;',
    '}',
    '.jd-react-float.jd-heart{animation:jdReactHeart 1s ease-out forwards;font-size:36px;}',
    '.jd-react-float.jd-burst{animation:jdReactBurst 1s ease-out forwards;font-size:42px;}',
    '.jd-react-float.jd-fire{animation:jdReactFire 1s ease-out forwards;font-size:36px;}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('jdReactAnimCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdReactAnimCSS';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function getAnimClass(emoji) {
    if (emoji === '❤️' || emoji === '💕' || emoji === '💖') return 'jd-heart';
    if (emoji === '🎉' || emoji === '🥳' || emoji === '🎊') return 'jd-burst';
    if (emoji === '🔥') return 'jd-fire';
    return '';
  }

  /* Show floating animation at position */
  function floatReaction(emoji, x, y) {
    var el = document.createElement('div');
    el.className = 'jd-react-float ' + getAnimClass(emoji);
    el.textContent = emoji;
    el.style.left = (x - 16) + 'px';
    el.style.top = (y - 16) + 'px';
    document.body.appendChild(el);
    setTimeout(function() { el.remove(); }, 1100);
  }

  function init() {
    injectCSS();
    // Single trigger: watch for chips being added (user taps AND AI reactions)
    // Using only MutationObserver prevents double animation
    var obs = new MutationObserver(function(muts) {
      muts.forEach(function(m) {
        m.addedNodes.forEach(function(n) {
          if (n.nodeType === 1 && n.classList && (n.classList.contains('jd-inline-reaction') || n.classList.contains('jd-manual-reaction'))) {
            // Get emoji from the span (just the emoji, not the label)
            var span = n.querySelector('span');
            var emoji = span ? (span.textContent || '').trim() : (n.textContent || '').trim().charAt(0);
            // Extract only the first emoji character
            var match = emoji.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/u);
            if (match) {
              var rect = n.getBoundingClientRect();
              if (rect.top > 0) floatReaction(match[0], rect.left + rect.width/2, rect.top);
            }
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
