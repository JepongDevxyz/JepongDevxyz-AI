import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../library-chatgpt.js',import.meta.url),'utf8');
const section=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing Library section: ${start}`);
  return source.slice(a,b);
};
const load=section('async function loadItems() {','/* ---------- Render ---------- */');
assert.doesNotMatch(load,/localStorage/,'folder names must not be stored only on this device');
assert.match(load,/libraryStore\.listFolders\(\)/,'folders must be loaded from the signed-in account');
assert.match(load,/libraryStore\.accountId\(\)/,'late responses must be checked against the current account');

const actions=section('async function itemAction(item, act) {','/* ---------- Init:');
assert.match(actions,/updateItemMetadata\(/,'Favorites and Move must use the account-scoped storage bridge');
assert.match(actions,/deleteItem\(/,'Delete must await private Storage and row deletion');
assert.match(actions,/getFile\(/,'Add to chat must retrieve actual saved file bytes');
assert.doesNotMatch(actions,/setTimeout\(loadItems/,'Delete must reload from the actual result, not a timer');

const plus=section('function plusAction(act) {','function showItemMenu(');
assert.doesNotMatch(plus,/prompt\(/,'New folder must use a keyboard-safe in-page dialog');
assert.match(plus,/createFolder\(/,'New folder must await the account-scoped write');
const markup=section('function buildPage() {','function isLibraryPlusTarget(');
assert.match(markup,/jdLibFolderDialog/,'Library must include its own folder name dialog');
assert.match(markup,/jdLibSelectedActions/,'multi-select must expose working actions');
const folderSource=section('async function submitFolderDialog(event){','function showLibraryError(');
let writes=0, reloads=0, errors=0, closed=0;
const input={value:'Projects'};
const create={disabled:false};
const document={
  getElementById:id=>id==='jdLibFolderName'?input:create,
  querySelectorAll:()=>[{dataset:{tab:'folders'},classList:{toggle(){}}}]
};
const state={folders:[],tab:'suggested',currentFolder:'old'};
const submit=new Function('document','state','window','showLibraryError','closeFolderDialog','loadItems',
  folderSource+'\nreturn submitFolderDialog;')(
  document,state,{JDLibraryStorage:{createFolder:async()=>{writes++;return {error:null};}}},
  ()=>errors++,()=>closed++,async()=>reloads++);
await submit({preventDefault(){}});
assert.equal(writes,1);assert.equal(reloads,1);assert.equal(closed,1);
assert.equal(state.tab,'folders');assert.equal(state.currentFolder,null);
input.value='Projects';state.folders=[{name:'Projects'}];
await submit({preventDefault(){}});
assert.equal(writes,1,'duplicate folder must not be written');assert.equal(errors,1);
console.log('PASS: Library account persistence and actionable controls');
