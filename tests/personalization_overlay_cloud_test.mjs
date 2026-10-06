import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../personalization-chatgpt.js',import.meta.url),'utf8');
const canonicalOptions = {
 style:['Default','Professional','Friendly','Candid','Quirky','Efficient','Cynical'],
 warmth:['More','Default','Less'],enthusiasm:['More','Default','Less'],
 headers:['More','Default','Less'],emoji:['More','Default','Less']
};
const optionsStart=source.indexOf('var DROPS = {');
const optionsEnd=source.indexOf('\n  };',optionsStart);
assert(optionsStart>=0&&optionsEnd>optionsStart,'the redesigned page must define its dropdown choices');
const dropdowns=new Function(source.slice(optionsStart,optionsEnd+5)+'\nreturn DROPS;')();
assert.deepEqual(dropdowns,canonicalOptions,'every dropdown must use values accepted by the canonical app');
assert.doesNotMatch(source,/localStorage\.(?:getItem|setItem)\(['"]jepong_personalization/,
 'the redesigned page must not keep a browser-local copy of account personalization');
const start=source.indexOf('const FIELD_MAP = Object.freeze(');
const end=source.indexOf('\n\n  var currentDrop = null;',start);
assert(start>=0&&end>start,'the overlay must define cloud field mapping and save helpers');
const helpers=source.slice(start,end);
const createApi=new Function('personalizationSettings','savePersonalizationField','setPersonalizationToggle',
 helpers+'\nreturn {FIELD_MAP,getSettings,saveSettings};');
const canonical={
 baseStyle:'Friendly',warm:'More',enthusiastic:'Default',headersLists:'Default',emoji:'Default',
 fastAnswers:true,suggestedPrompts:false,librarySearch:false,customInstructions:'Accurate'
};
const actions=[];
const api=createApi(canonical,(key,value)=>actions.push(['field',key,value]),(key,value)=>actions.push(['toggle',key,value]));
assert.deepEqual(api.getSettings(),canonical,'the overlay must load values from the canonical app state');
const draft={baseStyle:'Candid',warm:'Less',enthusiastic:'More',headersLists:'Less',emoji:'More',
 fastAnswers:false,suggestedPrompts:true,librarySearch:true,customInstructions:'  Keep answers concise.  '};
api.saveSettings(draft);
assert.deepEqual(actions,[
 ['field','baseStyle','Candid'],['field','warm','Less'],['field','enthusiastic','More'],
 ['field','headersLists','Less'],['field','emoji','More'],
 ['toggle','fastAnswers',false],['toggle','suggestedPrompts',true],['toggle','librarySearch',true],
 ['field','customInstructions','Keep answers concise.']
],'the Save action must write every draft field through the app cloud-sync helpers');
const dropdown=source.slice(source.indexOf('function openDropSheet('),source.indexOf('function loadValues()'));
assert.match(dropdown,/draftSettings\[FIELD_MAP\[currentDrop\]\]\s*=\s*btn\.dataset\.opt/,
 'dropdown selections must stay in the draft until Save');
const loading=source.slice(source.indexOf('function loadValues()'),source.indexOf('function saveAndClose()'));
assert.match(loading,/draftSettings\s*=\s*getSettings\(\)/,
 'opening the page must start from the current canonical app settings');
assert.match(source.slice(source.indexOf('function saveAndClose()'),source.indexOf('function openPers()')),
 /saveSettings\(draftSettings\)/,'the visible Save control must commit the complete draft');
console.log('PASS: redesigned personalization reads and writes canonical cloud state');
