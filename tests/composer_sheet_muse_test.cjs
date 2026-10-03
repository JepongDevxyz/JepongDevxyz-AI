const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');
const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body>
<div class="prompt-bar__menu" id="composerToolSheet" role="listbox">
  <button type="button" class="prompt-bar__row" data-prompt-source="camera" onclick="composerToolAction('camera')">
    <span class="prompt-bar__row-icon"><i data-lucide="camera"></i></span>
    <span class="prompt-bar__row-name">Camera</span>
  </button>
  <button type="button" class="prompt-bar__row" data-prompt-source="photos" onclick="composerToolAction('photos')">
    <span class="prompt-bar__row-icon"><i data-lucide="image"></i></span>
    <span class="prompt-bar__row-name">Photos</span>
  </button>
  <button type="button" class="prompt-bar__row" data-prompt-source="files" onclick="composerToolAction('files')">
    <span class="prompt-bar__row-icon"><i data-lucide="paperclip"></i></span>
    <span class="prompt-bar__row-name">Files</span>
  </button>
</div>
</body></html>`, { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window; global.document = window.document;
global.MutationObserver = window.MutationObserver;

// Mock composerToolAction and closeComposerTools
let videoClicked = false;
window.composerToolAction = function (a) { window.__lastAction = a; };
window.closeComposerTools = function () {};
window.handleFileSelect = function () {};

let pass = 0, fail = 0;
function assert(c, n) { if (c) { pass++; console.log('  ok:', n); } else { fail++; console.log('  FAIL:', n); } }

dom.window.eval(fs.readFileSync('/tmp/jai-react2/composer-sheet-muse.js', 'utf8'));

setTimeout(() => {
  const sheet = document.getElementById('composerToolSheet');
  const videosRow = sheet.querySelector('[data-prompt-source="videos"]');
  assert(!!videosRow, 'Videos row injected');
  assert(videosRow.querySelector('.prompt-bar__row-name').textContent === 'Videos', 'Videos label correct');
  assert(videosRow.querySelector('[data-lucide="circle-play"]'), 'Videos icon is play circle');
  // Order: Camera, Photos, Videos, Files (Muse app order)
  const rows = Array.from(sheet.querySelectorAll('.prompt-bar__row')).map(r => r.getAttribute('data-prompt-source'));
  assert(JSON.stringify(rows) === JSON.stringify(['camera', 'photos', 'videos', 'files']),
    'Row order matches Muse app: ' + rows.join(','));
  // Videos action creates video-only input
  assert(typeof window.composerToolAction === 'function', 'composerToolAction wrapped');
  assert(window.composerToolAction.__jdMuseWrapped === true, 'wrapper flagged');
  window.composerToolAction('videos');
  const vi = document.getElementById('jdVideoInput');
  assert(!!vi, 'video input created');
  assert(vi.accept === 'video/*', 'video input accepts video/* only');
  // Other actions still pass through
  window.composerToolAction('camera');
  assert(window.__lastAction === 'camera', 'non-video actions pass through');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 500);
