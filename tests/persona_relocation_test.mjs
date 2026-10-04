import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../persona-relocate.js',import.meta.url),'utf8');
const settingsBlock=source.slice(source.indexOf('  function ensureSettingsInput()'),source.indexOf('  function init()'));

assert.match(settingsBlock,/getElementById\('jdModeSettingsPage'\)/,
  'persona field must target the actual Mode settings page');
assert.match(settingsBlock,/querySelectorAll\('\.settings-nav-row strong'\)/,
  'locate the Selected mode card inside that page');
assert.match(settingsBlock,/modePage\.insertBefore\(wrapper,\s*openModeButton\)/,
  'place persona instructions beneath Selected mode and before Open Mode');
assert.doesNotMatch(settingsBlock,/modePage\.appendChild\(wrapper\)/,
  'do not append the field to a broad container that can place it in a side column');
assert.match(settingsBlock,/home\.value\s*=\s*input\.value/,
  'keep the settings field synchronized with the value sent in chat requests');

console.log('PASS: custom persona instructions sit below Selected mode and remain synced to chat');
