const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="chatBox"></div></body></html>',
  { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window; global.document = window.document;
global.NodeFilter = window.NodeFilter; global.MutationObserver = window.MutationObserver;

const mwResponse = [{
  meta: { id: 'test:1' },
  hwi: { hw: 'test', prs: [{ mw: 'ˈtest', sound: { audio: 'test001' } }] },
  fl: 'noun',
  shortdef: ['a procedure for evaluation']
}];
let lastUrl = '';
window.fetch = async (url) => {
  lastUrl = String(url);
  return { ok: true, json: async () => mwResponse };
};
window.Audio = function () { this.play = async () => {}; };
window.speechSynthesis = { cancel: () => {}, speak: () => {} };

let pass = 0, fail = 0;
function assert(c, n) { if (c) { pass++; console.log('  ok:', n); } else { fail++; console.log('  FAIL:', n); } }

dom.window.eval(fs.readFileSync('/tmp/jai-react2/word-dictate.js', 'utf8'));
const WD = window.__jdWordDictate;

// With MW key
window.localStorage.setItem('jd_mw_api_key', 'my-mw-key');
WD.openDictionary('test');
setTimeout(() => {
  assert(lastUrl.includes('dictionaryapi.com/api/v3/references/collegiate/json/test?key=my-mw-key'), 'dictate uses MW API with key');
  const body = document.getElementById('jdDictBody');
  assert(body.textContent.includes('a procedure for evaluation'), 'MW definition shown in dictate');
  assert(body.textContent.includes('noun'), 'MW pos shown');
  assert(document.getElementById('jdDictPhon').textContent === 'ˈtest', 'MW phonetic shown');
  WD.closeDictionary();

  // Without key -> fallback
  window.localStorage.removeItem('jd_mw_api_key');
  window.fetch = async (url) => {
    lastUrl = String(url);
    return { ok: true, json: async () => [{ word: 'test', phonetic: 'test', phonetics: [], meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'free def' }] }] }] };
  };
  WD.openDictionary('test');
  setTimeout(() => {
    assert(lastUrl.includes('api.dictionaryapi.dev'), 'dictate falls back without key');
    assert(document.getElementById('jdDictBody').textContent.includes('free def'), 'fallback definition shown');
    WD.closeDictionary();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  }, 300);
}, 300);
