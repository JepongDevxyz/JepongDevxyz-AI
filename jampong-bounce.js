/* JepongDevxyz AI — Jampong bouncy animation (2026-10-02)
   Gives the floating Jampong avatar a playful jelly-bounce idle animation:
   squash & stretch, slow side-to-side wobble, dynamic bobbing with
   personality — a smooth 4s organic cycle (per the reference video).
   Pure CSS override of the jampong.js idle animations. Pure addition,
   idempotent. Pose cycling, tap-to-profile, and the toggle are untouched.
   The AI working state (amber glow ring from jampong-ai-status.js) is
   preserved: it uses !important on the img animation, so it still wins
   while the AI is working. */
(function () {
  'use strict';
  if (window.__jdJampBounce) return;
  window.__jdJampBounce = true;

  var CSS = [
    /* Jelly bounce on the avatar image: squash & stretch + dynamic bob. */
    /* Same selector as jampong.js; this file loads later so it wins. */
    /* NOTE: no !important here — the working-state animation uses */
    /* !important and must keep winning while the AI is working. */
    '#jdJampong .jdj-stage img{animation:jdJampBounce 4s ease-in-out infinite}',
    '@keyframes jdJampBounce{',
    '0%,100%{transform:translateY(0) translateX(0) scale(1,1);',
    'box-shadow:0 6px 20px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.2)}',
    /* anticipation crouch */
    '12%{transform:translateY(3px) translateX(-1px) scale(1.1,.88);',
    'box-shadow:0 4px 16px rgba(0,0,0,.32),0 2px 5px rgba(0,0,0,.22)}',
    /* hop up, stretched tall */
    '30%{transform:translateY(-14px) translateX(1px) scale(.93,1.09);',
    'box-shadow:0 18px 30px rgba(0,0,0,.2),0 5px 12px rgba(0,0,0,.13)}',
    /* land with a squash */
    '45%{transform:translateY(0) translateX(0) scale(1.07,.93);',
    'box-shadow:0 6px 20px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.2)}',
    /* little rebound hop */
    '60%{transform:translateY(-6px) translateX(-1px) scale(.97,1.05);',
    'box-shadow:0 12px 24px rgba(0,0,0,.24),0 3px 8px rgba(0,0,0,.16)}',
    '75%{transform:translateY(0) translateX(1px) scale(1.02,.98);',
    'box-shadow:0 6px 20px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.2)}',
    '88%{transform:translateY(-2px) translateX(0) scale(1,1);',
    'box-shadow:0 8px 22px rgba(0,0,0,.27),0 2px 7px rgba(0,0,0,.18)}',
    '}',
    /* Slow side-to-side wobble on the whole avatar. */
    /* Keyframes keep translateX(-50%) so centering never breaks. */
    '#jdJampong{transform-origin:50% 18%;animation:jdJampWobble 4s ease-in-out infinite}',
    '@keyframes jdJampWobble{',
    '0%,100%{transform:translateX(-50%) rotate(0deg)}',
    '25%{transform:translateX(-50%) rotate(3.5deg)}',
    '50%{transform:translateX(-50%) rotate(0deg)}',
    '75%{transform:translateX(-50%) rotate(-3.5deg)}',
    '}',
    /* The label hops along with the bounce. */
    '#jdJampong .jdj-label{animation:jdJampLabelHop 4s ease-in-out infinite}',
    '@keyframes jdJampLabelHop{',
    '0%,100%{transform:translateY(0)}',
    '30%{transform:translateY(-10px)}',
    '45%{transform:translateY(0)}',
    '60%{transform:translateY(-4px)}',
    '75%,100%{transform:translateY(0)}',
    '}',
    /* Respect reduced motion. */
    '@media (prefers-reduced-motion: reduce){',
    '#jdJampong,#jdJampong .jdj-stage img,#jdJampong .jdj-label{animation:none}',
    '}'
  ].join('\n');

  function ensureCSS() {
    if (document.getElementById('jdJampBounceCss')) return;
    var st = document.createElement('style');
    st.id = 'jdJampBounceCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  ensureCSS();
})();
