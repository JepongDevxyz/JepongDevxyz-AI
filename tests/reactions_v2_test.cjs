/* jsdom test for reactions-v2.js + word-dictate.js (popup removed) */
const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');

const html = `<!DOCTYPE html><html><head></head><body>
<div id="chatBox">
  <div class="msg user has-bubble" data-message-index="0">
    <div class="user-bubble-body">Salamat sa tulong mo!</div>
    <div class="user-actions"><button class="user-action-btn">Edit</button><button class="user-action-btn">Copy</button></div>
  </div>
  <div class="msg bot" data-message-index="1">
    <div><p>Walang anuman! [USER_REACTION:❤️]</p></div>
    <div class="bot-actions">
      <button class="bot-action-btn" title="Copy">copy</button>
      <button class="bot-action-btn" title="More">more</button>
    </div>
  </div>
  <div class="msg user has-bubble" data-message-index="2">
    <div class="user-bubble-body">Ang bobo mo naman</div>
    <div class="user-actions"><button class="user-action-btn">Edit</button></div>
  </div>
  <div class="msg bot" data-message-index="3">
    <div><p>Pasensya na, susubukan kong ayusin. [USER_REACTION:😢]</p></div>
    <div class="bot-actions"><button class="bot-action-btn" title="Copy">copy</button></div>
  </div>
</div>
</body></html>`;

const dom = new JSDOM(html, { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window;
global.document = window.document;
global.NodeFilter = window.NodeFilter;
global.MutationObserver = window.MutationObserver;

// Load word-dictate.js FIRST (as agent.js does), then reactions-v2.js
let capturedBody = null;
window.fetch = async (url, opts) => {
  capturedBody = opts && opts.body ? JSON.parse(opts.body) : null;
  return { ok: true };
};

let pass = 0, fail = 0;
function assert(cond, name) {
  if (cond) { pass++; console.log('  ok:', name); }
  else { fail++; console.log('  FAIL:', name); }
}

dom.window.eval(fs.readFileSync('/tmp/jai-react2/word-dictate.js', 'utf8'));
dom.window.eval(fs.readFileSync('/tmp/jai-react2/reactions-v2.js', 'utf8'));

const R = window.__jdReactionsV2;
const WD = window.__jdWordDictate;
assert(!!R, 'reactions-v2 hook exposed');
assert(!!WD, 'word-dictate hook exposed');

setTimeout(() => {
  console.log('\n-- word popup restored (tap-and-hold) --');
  // The trigger listeners are BACK in wire(); system popup is
  // suppressed via user-select:none on .msg.bot.
  const src = fs.readFileSync('/tmp/jai-react2/word-dictate.js', 'utf8');
  assert(src.includes("addEventListener('touchstart'"), 'touchstart trigger present in source');
  assert(src.includes("addEventListener('contextmenu'"), 'contextmenu trigger present in source');
  assert(src.includes('user-select:none'), 'system popup suppressed via user-select:none');
    // store still works (needed by reactions-v2)
    const bot1 = document.querySelector('.msg.bot[data-message-index="1"]');
    WD.toggleReaction(bot1, '👍');
    assert(WD.getReaction(bot1) === '👍', 'word-dictate store still functional');
    WD.toggleReaction(bot1, '👍');

    console.log('\n-- Part 1: react button + picker --');
    const btns = document.querySelectorAll('.bot-actions > .jd-react-btn');
    assert(btns.length === 2, 'react button injected into each .bot-actions');
    btns[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const picker = document.querySelector('.jd-react-picker');
    assert(!!picker, 'picker opens on button tap');
    assert(picker.querySelectorAll('button').length === 6, 'picker has 6 emojis');
    picker.querySelectorAll('button')[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert(WD.getReaction(bot1) === '😂', 'manual reaction stored via picker');
    const inlineChip = document.querySelector('.msg.bot[data-message-index="1"] .bot-actions > .jd-manual-reaction');
    assert(!!inlineChip && inlineChip.textContent === '😂', 'inline chip rendered in action bar');
    inlineChip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert(!WD.getReaction(bot1), 'reaction removed when chip tapped');

    console.log('\n-- Part 2: AI auto-reaction --');
    assert(!bot1.textContent.includes('[USER_REACTION'), 'marker stripped from bot 1');
    const aiChip0 = document.querySelector('.msg.user[data-message-index="0"] .user-actions > .jd-ai-reaction');
    assert(!!aiChip0 && aiChip0.textContent === '❤️', 'AI heart chip on user msg');
    const bot3 = document.querySelector('.msg.bot[data-message-index="3"]');
    assert(!bot3.textContent.includes('[USER_REACTION'), 'marker stripped from bot 3');
    const aiChip2 = document.querySelector('.msg.user[data-message-index="2"] .user-actions > .jd-ai-reaction');
    assert(!!aiChip2 && aiChip2.textContent === '😢', 'AI sad chip on user msg');
    aiChip2.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert(document.querySelector('.msg.user[data-message-index="2"] .user-actions > .jd-ai-reaction') === aiChip2, 'AI reaction remains on the user message when tapped');
    const savedAiReactions = JSON.parse(window.localStorage.getItem('jd_ai_reactions') || '{}');
    assert(savedAiReactions.default && savedAiReactions.default['2'] === '😢', 'tapping keeps the AI reaction persisted');

    console.log('\n-- Part 2a: fetch wrapper --');
    (async () => {
      await window.fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'hello', mode: 'general', personalization: {} })
      });
      const ci = (capturedBody.personalization.customInstructions || '');
      assert(ci.includes('[USER_REACTION:X]'), 'REACTION instruction injected');
      assert(ci.includes('TASK COMPLETION'), 'TASK instruction injected');
      console.log(`\n${pass} passed, ${fail} failed`);
      process.exit(fail ? 1 : 0);
    })();
}, 300);
