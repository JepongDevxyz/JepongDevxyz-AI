import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source = readFileSync(new URL('../model-settings.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const aiToolsLabel = html.indexOf('<h3 class="settings-section-label">AI & tools</h3>');
const aiToolsGroupStart = html.indexOf('<div class="settings-card-group">', aiToolsLabel);
const nextSection = html.indexOf('<h3 class="settings-section-label">App</h3>', aiToolsGroupStart);
assert(aiToolsLabel >= 0 && aiToolsGroupStart > aiToolsLabel && nextSection > aiToolsGroupStart,
  'Settings must retain the AI & tools settings group');

assert.match(source, /findAiToolsGroup\(\)/, 'Mode and Models rows target the existing AI & tools card');
assert.match(source, /group\.insertBefore\(modelsRow, group\.firstChild\)/);
assert.match(source, /group\.insertBefore\(modeRow, group\.firstChild\)/);
assert.match(source, /<strong>Mode<\/strong>[\s\S]*?id="jdSettingsModeLabel"/);
assert.match(source, /<strong>Models<\/strong>[\s\S]*?id="jdSettingsModelLabel"/);
assert.match(source, /makePage\('jdModeSettingsPage', 'Mode'[\s\S]*?'Open Mode'/,
  'Mode row opens its dedicated settings page with an Open Mode action');
assert.match(source, /makePage\('jdModelsSettingsPage', 'Models'[\s\S]*?'Open Models'/,
  'Models row opens its dedicated settings page with an Open Models action');
assert.match(source, /nav\.pickerParent = 'jdModeSettingsPage'/,
  'The mode picker remembers the Mode page beneath it');
assert.match(source, /nav\.pickerParent = 'jdModelsSettingsPage'/,
  'The model picker remembers the Models page beneath it');
assert.match(source, /parent\.classList\.add\('open'\)[\s\S]*picker\.classList\.add\('jd-settings-picker-overlay', 'open'\)/,
  'Opening a picker keeps its Settings page open underneath');
assert.match(source, /\.jd-settings-picker-overlay\{z-index:10020!important\}/,
  'The picker is layered above the Settings subpage');
const pickerCallbacks = source.slice(source.indexOf("makePage('jdModeSettingsPage'"), source.indexOf('    modeRow.addEventListener'));
assert.doesNotMatch(pickerCallbacks, /classList\.remove\('open'\)/,
  'Opening the picker does not close the Settings subpage');
assert.match(source, /toggleModal\('modeModalOverlay', true\)/,
  'Open Mode launches the existing functional mode picker');
assert.match(source, /openModelPicker\(\)/,
  'Open Models launches the existing provider and model picker');
assert.match(source, /mirror\('selectedModeText', 'jdSettingsModeLabel'\)/,
  'Mode summary mirrors the live selected mode');
assert.match(source, /mirror\('selectedModelText', 'jdSettingsModelLabel'\)/,
  'Models summary mirrors the live selected model');
assert.match(source, /mirror\('selectedModeText', 'jdModePageValue'\)/);
assert.match(source, /mirror\('selectedModelText', 'jdModelsPageValue'\)/);
assert.match(source, /function closePage\(id\)[\s\S]*openSettingsModal\(\)/,
  'Back navigation returns from the dedicated page to Settings');
assert.match(source, /nav\.scrollTop\s*=\s*scroll\.scrollTop/,
  'Settings navigation stores the exact scroll position before opening a child screen');
assert.match(source, /restoreSettingsPosition\(\)/,
  'Returning from a child screen restores the Settings scroll position');
assert.match(source, /document\.addEventListener\('jd-back-close'[\s\S]*restoreDestination\(\)/,
  'Device/browser Back restores the saved Settings parent');
assert.match(source, /document\.addEventListener\('click'[\s\S]*#settingsModal \.settings-nav-row[\s\S]*nav\.returnId = 'settingsModal'/,
  'Entering a Settings row records Settings as its return destination');
assert.match(source, /jdLibPage/,
  'Settings return detection includes the custom Library screen');
assert.doesNotMatch(source, /header-controls\s+\.selector-wrapper\s*\{\s*display\s*:\s*none/i,
  'Settings integration must not hide the chat header selectors');

const backNavigation = readFileSync(new URL('../back-nav.js', import.meta.url), 'utf8');
assert.match(backNavigation, /scanViews\(\);\s*onViewClosed\(el\);/,
  'Back navigation registers a synchronously restored Settings parent before removing its child');
assert(backNavigation.indexOf("'#jdModelsSettingsPage'") < backNavigation.indexOf("document.querySelectorAll('div[id]')"),
  'Settings pages are ordered underneath dynamically detected picker modals');

console.log('PASS: Settings → Mode/Models → dedicated page → existing functional picker; live selections and Back navigation are wired.');
