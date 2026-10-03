/* jsdom test: word-dictate patch (menu, reactions, dictionary, actions) */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const assert = require('node:assert/strict');

const path = require('path');
const patchSrc = fs.readFileSync(path.join(__dirname, '..', 'word-dictate.js'), 'utf8');

function boot(setup) {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body>' +
    '<div id="chatBox">' +
    '<div class="msg bot" data-message-index="0"><div><p>Hello beautiful world</p></div>' +
    '<div class="bot-actions"><button>copy</button></div></div>' +
    '</div>' +
    '<textarea id="userInput"></textarea>' +
    '</body></html>',
    { url: 'https://localhost/', pretendToBeVisual: true }
  );
  const window = dom.window;
  if (typeof setup === 'function') setup(window);
  window.fetch = async (url) => {
    if (String(url).includes('dictionaryapi.dev') && String(url).endsWith('/hello')) {
      return {
        ok: true,
        json: async () => [{
          word: 'hello', phonetic: '/həˈloʊ/',
          phonetics: [{ text: '/həˈloʊ/', audio: 'https://audio.example/hello.mp3' }],
          meanings: [{ partOfSpeech: 'interjection', definitions: [{ definition: 'A greeting.' }] }],
        }],
      };
    }
    return { ok: false };
  };
  window.__playedAudio = [];
  window.Audio = function (src) { window.__playedAudio.push(src); return { play: async () => {} }; };
  const run = new window.Function(
    'window', 'document', 'navigator', 'localStorage', 'fetch', 'Audio',
    'SpeechSynthesisUtterance', 'setTimeout', 'clearTimeout', 'setInterval', 'MutationObserver',
    patchSrc + '\nreturn window.__jdWordDictate;'
  );
  const api = run(
    window, window.document, window.navigator, window.localStorage, window.fetch, window.Audio,
    window.SpeechSynthesisUtterance, window.setTimeout.bind(window), window.clearTimeout.bind(window),
    window.setInterval.bind(window), window.MutationObserver
  );
  window.__jdWordDictate = api;
  return window;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1. expandWord unit checks
  {
    const w = boot().__jdWordDictate;
    assert.deepStrictEqual(w.expandWord('Hello beautiful world', 7), { word: 'beautiful', start: 6, end: 15 });
    assert.deepStrictEqual(w.expandWord('Hello world', 0), { word: 'Hello', start: 0, end: 5 });
    assert.deepStrictEqual(w.expandWord('hi!', 2), { word: 'hi', start: 0, end: 2 });
    assert.strictEqual(w.expandWord('a b', 1), null);
    assert.deepStrictEqual(w.expandWord("don't stop", 2), { word: "don't", start: 0, end: 5 });
    assert.strictEqual(w.expandWord('Kumusta ka', 3).word, 'Kumusta');
    console.log('PASS: expandWord');
  }
  // 2. reactions
  {
    const window = boot();
    const w = window.__jdWordDictate;
    const msg = window.document.querySelector('.msg.bot');
    w.toggleReaction(msg, '👍');
    const chip = msg.querySelector('.jd-reaction-chip');
    assert.ok(chip, 'chip added');
    assert.strictEqual(chip.textContent, '👍');
    assert.strictEqual(w.getReaction(msg), '👍');
    const stored = JSON.parse(window.localStorage.getItem('jd_msg_reactions'));
    assert.strictEqual(stored[Object.keys(stored)[0]]['0'], '👍');
    w.toggleReaction(msg, '👍');
    assert.strictEqual(msg.querySelector('.jd-reaction-chip'), null, 'chip removed');
    w.toggleReaction(msg, '❤️');
    assert.strictEqual(msg.querySelector('.jd-reaction-chip').textContent, '❤️');
    console.log('PASS: reactions');
  }
  // 3. dictionary: API hit -> fills + auto-plays audio
  {
    const window = boot();
    const w = window.__jdWordDictate;
    w.openDictionary('hello');
    await sleep(60);
    const bd = window.document.getElementById('jdDictBackdrop');
    assert.ok(bd, 'sheet opened');
    assert.ok(bd.querySelector('.jd-dict-word').textContent.includes('hello'));
    assert.ok(bd.querySelector('.jd-dict-phon').textContent.includes('həˈloʊ'));
    assert.ok(bd.querySelector('.jd-dict-def').textContent.includes('greeting'));
    assert.deepStrictEqual(window.__playedAudio, ['https://audio.example/hello.mp3']);
    bd.querySelector('.jd-dict-close').click();
    assert.strictEqual(window.document.getElementById('jdDictBackdrop'), null);
    console.log('PASS: dictionary (API hit)');
  }
  // 4. dictionary fallback: unknown word -> graceful + TTS
  {
    const spoken = [];
    const window = boot((win) => {
      win.SpeechSynthesisUtterance = function (t) { this.text = t; };
      win.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u.text); } };
    });
    const w = window.__jdWordDictate;
    w.openDictionary('kumusta');
    await sleep(60);
    const bd = window.document.getElementById('jdDictBackdrop');
    assert.ok(bd.querySelector('.jd-dict-def').textContent.includes('Walang English definition'));
    assert.deepStrictEqual(spoken, ['kumusta']);
    console.log('PASS: dictionary (fallback)');
  }
  console.log('ALL WORD-DICTATE TESTS PASS');
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
