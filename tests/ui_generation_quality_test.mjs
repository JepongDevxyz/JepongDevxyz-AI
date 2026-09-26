import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

assert(api.includes('function isVisualWebUiRequest('),'visual UI request detector missing');
assert(api.includes('function visualUiQualityInstruction('),'visual UI quality contract missing');
assert(api.includes('VISUAL UI IMPLEMENTATION CONTRACT:'),'visual UI system contract missing');
assert(api.includes('Do not output an unstyled stack of headings, default buttons, default inputs'),
  'must explicitly reject raw browser-default UI');
assert(api.includes('For a single-file HTML preview, make the visual styling self-contained'),
  'single-file preview must prefer self-contained styling');
assert(api.includes('function maybeRefineVisualUiResponse('),'second UI quality pass missing');
assert(api.includes("activity(emit,'ui-polish'"),'real UI polish activity missing');
assert(api.includes('first.response.clone()'),'UI refinement must preserve the original response as fallback');
assert(api.includes('buildUiRefinementPrompt(message,draft)'),'draft refinement prompt missing');

const detectorSrc=api.slice(
  api.indexOf("function isVisualWebUiRequest(message='', files=[]){"),
  api.indexOf("\nfunction visualUiQualityInstruction(",api.indexOf("function isVisualWebUiRequest(message='', files=[]){"))
);
const sandbox={
  normalizeIntentText:x=>String(x||'').toLowerCase()
};
vm.createContext(sandbox);
vm.runInContext(detectorSrc,sandbox);
assert.equal(sandbox.isVisualWebUiRequest('Create a responsive AI chatbot website in a single HTML file',[]),true);
assert.equal(sandbox.isVisualWebUiRequest('What is 2 + 2?',[]),false);
assert.equal(sandbox.isVisualWebUiRequest('Ayusin itong UI katulad ng screenshot',[{name:'index.html'}]),true);

assert(html.includes('https://cdn.tailwindcss.com'),'sandbox preview should support trusted Tailwind CDN when a model/user explicitly uses it');
assert(html.includes('https://fonts.googleapis.com'),'sandbox preview should support trusted Google Fonts styles');
assert(html.includes("connect-src 'none'"),'preview must keep network API connections disabled');
assert(html.includes('sandbox="allow-scripts allow-modals allow-forms"'),'runner iframe must remain sandboxed');

console.log('PASS: cross-model UI quality contract, same-model refinement pass, and trusted preview asset rendering.');
