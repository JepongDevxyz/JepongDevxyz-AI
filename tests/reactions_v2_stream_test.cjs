const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');
const html = `<!DOCTYPE html><html><head></head><body><div id="chatBox">
  <div class="msg user has-bubble" data-message-index="0">
    <div class="user-bubble-body">Ang galing mo!</div>
    <div class="user-actions"><button>Edit</button></div>
  </div>
  <div class="msg bot" data-message-index="1"><div></div></div>
</div></body></html>`;
const dom = new JSDOM(html, { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window; global.document = window.document;
global.NodeFilter = window.NodeFilter; global.MutationObserver = window.MutationObserver;
window.__jdWordDictate = { getReaction: () => '', toggleReaction: () => {} };
window.fetch = async () => ({ ok: true });
dom.window.eval(fs.readFileSync('/tmp/jai-react2/word-dictate.js', 'utf8'));
dom.window.eval(fs.readFileSync('/tmp/jai-react2/reactions-v2.js', 'utf8'));
setTimeout(() => {
  const bot = document.querySelector('.msg.bot');
  const content = bot.querySelector(':scope > div');
  const frames = ['Salamat', 'Salamat!', 'Salamat! [USER_REACTION', 'Salamat! [USER_REACTION:🎉', 'Salamat! [USER_REACTION:🎉]'];
  frames.forEach((f, i) => {
    content.innerHTML = i === frames.length - 1
      ? '<p>Salamat! [USER_REACTION:🎉]</p><blockquote><p>Guimba → Baguio</p><p>View route map inside the chat</p></blockquote>'
      : `<p>${f}</p>`;
    if (i === frames.length - 1) {
      const ba = document.createElement('div');
      ba.className = 'bot-actions';
      ba.innerHTML = '<button class="bot-action-btn">copy</button>';
      bot.appendChild(ba);
    }
  });
  setTimeout(() => {
    const text = content.textContent;
    const chip = document.querySelector('.msg.user .user-actions > .jd-ai-reaction');
    const chips = document.querySelectorAll('.msg.user .user-actions > .jd-ai-reaction');
    const reactBtns = document.querySelectorAll('.bot-actions > .jd-react-btn');
    const pass = !text.includes('[USER_REACTION') && chip && chip.textContent === '🎉' && chips.length === 1 && reactBtns.length === 1;
    console.log('marker stripped:', !text.includes('[USER_REACTION'));
    console.log('AI chip:', chip ? chip.textContent : 'NONE');
    console.log(pass ? 'STREAM TEST PASSED' : 'STREAM TEST FAILED');
    process.exit(pass ? 0 : 1);
  }, 200);
}, 300);
