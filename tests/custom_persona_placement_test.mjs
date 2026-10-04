import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const modeControls=html.slice(html.indexOf('<div class="header-controls">'),html.indexOf('<div class="chat-viewport-wrapper">'));
const promptField=modeControls.indexOf('id="customPromptField"');
const modeButton=modeControls.indexOf('id="selectedModeText"');
const modelButton=modeControls.indexOf('id="selectedModelText"');
const prompt=modeControls.indexOf('id="customPromptInput"');
const selectMode=html.slice(html.indexOf('        function selectMode(key, name) {'),html.indexOf('        syncJdNavigation();',html.indexOf('        function selectMode(key, name) {')));
const request=html.slice(html.indexOf('customPrompt: document.getElementById',html.indexOf('const aiRequestStartedAt')),
  html.indexOf('customPrompt: document.getElementById',html.indexOf('const aiRequestStartedAt'))+120);

assert(modeButton>=0 && promptField>modeButton && promptField<modelButton,
  'persona instructions must sit under the selected mode and before the model picker');
assert.equal((modeControls.match(/id="customPromptInput"/g)||[]).length,1,
  'keep one functional persona input');
assert.match(modeControls,/id="customPromptInput"[^>]*\bhidden\b|<textarea[^>]*id="customPromptInput"/,
  'persona instructions should be an accessible multiline textarea');
assert.match(selectMode,/customPromptField[^\n]*hidden\s*=\s*key\s*!==\s*'custom'/,
  'show persona instructions only while Custom Persona is selected');
assert.match(request,/customPrompt:\s*document\.getElementById\('customPromptInput'\)\.value/,
  'chat requests must continue to receive the saved persona instructions');

console.log('PASS: persona instructions appear under the selected mode and remain wired to chat requests');
