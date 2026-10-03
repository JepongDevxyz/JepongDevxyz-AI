const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');
const dom = new JSDOM(`<!DOCTYPE html><html><head><style>
.history-item-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left; }
</style></head><body>
<div class="history-item"><span class="history-item-text">Create a complete, production-quality app</span></div>
</body></html>`, { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window; global.document = window.document;

let pass = 0, fail = 0;
function assert(c, n) { if (c) { pass++; console.log('  ok:', n); } else { fail++; console.log('  FAIL:', n); } }

dom.window.eval(fs.readFileSync('/tmp/jai-react2/sidebar-titles-fix.js', 'utf8'));

setTimeout(() => {
  const style = document.getElementById('jdSidebarTitlesFixCss');
  assert(!!style, 'fix CSS injected');
  const css = style.textContent;
  assert(css.includes('white-space:normal'), 'nowrap removed');
  assert(css.includes('-webkit-line-clamp:2'), 'max 2 lines');
  assert(!css.includes('text-overflow:ellipsis'), 'ellipsis removed');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 300);
