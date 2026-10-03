/* jsdom test for dictionary.js (Merriam-Webster) */
const { JSDOM } = require('/tmp/node_modules/jsdom');
const fs = require('fs');

const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>',
  { url: 'https://jepong-devxyz-ai.vercel.app/', runScripts: 'outside-only' });
const { window } = dom;
global.window = window;
global.document = window.document;

// Mock fetch: MW API
const mwResponse = [
  {
    meta: { id: 'voluminous:1' },
    hwi: { hw: 'vo*lu*mi*nous', prs: [{ mw: 'və-ˈlü-mə-nəs', sound: { audio: 'volum001', ref: 'c', stat: '1' } }] },
    fl: 'adjective',
    shortdef: ['having or marked by great volume or bulk', 'full of volume']
  }
];
const mwSuggest = ['volume', 'volumes', 'volumed'];
let lastUrl = '';
window.fetch = async (url) => {
  lastUrl = String(url);
  if (lastUrl.includes('dictionaryapi.com')) {
    return { ok: true, json: async () => (lastUrl.includes('xyzqwe') ? mwSuggest : mwResponse) };
  }
  return { ok: false, status: 404 };
};
// Mock Audio
window.Audio = function () { this.play = async () => {}; };

let pass = 0, fail = 0;
function assert(cond, name) {
  if (cond) { pass++; console.log('  ok:', name); }
  else { fail++; console.log('  FAIL:', name); }
}

dom.window.eval(fs.readFileSync('/tmp/jai-react2/dictionary.js', 'utf8'));
const D = window.__jdDictionary;
assert(!!D, 'dictionary hook exposed');

console.log('\n-- MW parsing --');
const parsed = D.parseMW(mwResponse);
assert(parsed.entries.length === 1, 'one entry parsed');
assert(parsed.entries[0].word === 'voluminous', 'headword cleaned (asterisks removed)');
assert(parsed.entries[0].phonetic === 'və-ˈlü-mə-nəs', 'pronunciation parsed');
assert(parsed.entries[0].pos === 'adjective', 'part of speech parsed');
assert(parsed.entries[0].defs.length === 2, 'definitions parsed');
assert(D.parseMW(mwSuggest).suggestions.length === 3, 'suggestions parsed');
assert(D.parseMW([]) === null, 'empty -> null');

console.log('\n-- MW audio URL --');
assert(D.mwAudioUrl('volum001') === 'https://media.merriam-webster.com/audio/prons/en/us/mp3/v/volum001.mp3', 'audio url (letter subdir)');
assert(D.mwAudioUrl('bix001').includes('/bix/bix001.mp3'), 'audio url (bix subdir)');
assert(D.mwAudioUrl('gg001').includes('/gg/gg001.mp3'), 'audio url (gg subdir)');
assert(D.mwAudioUrl('4audio').includes('/number/4audio.mp3'), 'audio url (number subdir)');
assert(D.mwAudioUrl('') === '', 'empty audio -> empty');

console.log('\n-- sheet UI --');
D.open();
assert(!!document.getElementById('jdMwBackdrop'), 'sheet opens');
assert(!!document.getElementById('jdMwInput'), 'search input present');
assert(!!document.getElementById('jdMwKeyInput'), 'key setup row shown when no key');
assert(document.getElementById('jdMwBody').textContent.includes('Type a word'), 'empty state');
D.close();
assert(!document.getElementById('jdMwBackdrop'), 'sheet closes');

console.log('\n-- key management --');
D.setKey('test-key-123');
assert(D.getKey() === 'test-key-123', 'key saved');
D.open();
assert(!!document.getElementById('jdMwKeyInput'), 'key input shown for changing key');
assert(document.getElementById('jdMwKeyInput').value === 'test-key-123', 'key pre-filled');
assert(document.getElementById('jdMwBody'), 'body present');
D.close();
D.setKey('');

console.log('\n-- MW lookup flow --');
D.setKey('fake-mw-key');
D.open('voluminous');
setTimeout(() => {
  assert(lastUrl.includes('dictionaryapi.com/api/v3/references/collegiate/json/voluminous?key=fake-mw-key'), 'MW endpoint called with key');
  const body = document.getElementById('jdMwBody');
  assert(body.textContent.includes('voluminous'), 'word rendered');
  assert(body.textContent.includes('və-ˈlü-mə-nəs'), 'pronunciation rendered');
  assert(body.textContent.includes('adjective'), 'pos rendered');
  assert(body.textContent.includes('great volume'), 'definition rendered');
  assert(body.textContent.includes('Merriam-Webster'), 'source labeled MW');
  assert(!!document.getElementById('jdMwSay'), 'pronunciation button present');
  D.close();

  // suggestions
  D.open('xyzqwe');
  setTimeout(() => {
    const b2 = document.getElementById('jdMwBody');
    assert(b2.textContent.includes('Baka ibig mong sabihin'), 'suggestions shown (Tagalog)');
    assert(b2.querySelectorAll('.jd-mw-suggest button').length === 3, 'suggestion buttons');
    D.close();
    D.setKey('');
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exit(fail ? 1 : 0);
  }, 300);
}, 300);
