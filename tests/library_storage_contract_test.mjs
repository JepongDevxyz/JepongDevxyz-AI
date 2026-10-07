import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const extractorStart=html.indexOf('async function extractLibrarySearchText(file){');
const extractorEnd=html.indexOf('window.JDLibraryStorage={',extractorStart);
assert(extractorStart>=0&&extractorEnd>extractorStart,'Library upload needs a real text indexer');
const extract=new Function(html.slice(extractorStart,extractorEnd)+'\nreturn extractLibrarySearchText;')();
assert.equal(await extract({name:'notes.md',type:'text/markdown',text:async()=> 'Useful research notes'}),'Useful research notes');
assert.equal(await extract({name:'photo.png',type:'image/png',text:async()=>{throw Error('binary must not be decoded')}}),'');
const migration=readFileSync(new URL('../supabase/migrations/20261007_library_folders.sql',import.meta.url),'utf8');
assert.match(migration,/create table if not exists public\.library_folders/i);
assert.match(migration,/unique\s*\(user_id,name\)/i);
assert.match(migration,/library_folders enable row level security/i);
assert.match(migration,/library_items for update to authenticated[\s\S]*?using\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)[\s\S]*?with check\s*\(\s*\(select auth\.uid\(\)\)\s*=\s*user_id\s*\)/i);

const start=html.indexOf('window.JDLibraryStorage={');
const end=html.indexOf('async function searchPrivateLibraryForChat(',start);
assert(start>=0&&end>start,'Library storage bridge must exist');
const source=html.slice(start,end);
const calls=[];
const query=(table)=>({
  select(columns){calls.push(['select',table,columns]);return this;},
  insert(value){calls.push(['insert',table,value]);return Promise.resolve({data:value,error:null});},
  update(value){calls.push(['update',table,value]);return this;},
  delete(){calls.push(['delete',table]);return this;},
  eq(field,value){calls.push(['eq',field,value]);return this;},
  order(){return this;},limit(){return Promise.resolve({data:[],error:null});},
  range(from,to){calls.push(['range',table,from,to]);return Promise.resolve({data:table==='library_items'?(from===0?Array.from({length:200},(_,i)=>({id:String(i)})):[{id:'last'}]):[],error:null});},
  then(resolve){return Promise.resolve({data:[],error:null}).then(resolve);}
});
const cloudClient={from:query,storage:{from:()=>({download:async(path)=>({data:new Blob(['file']),error:null})})}};
const window={};
new Function('window','cloudUser','cloudClient','saveFileToLibrary','renderFilePreviews',
  source+'\nreturn window.JDLibraryStorage;')(window,{id:'user-a'},cloudClient,async()=>({data:true,error:null}),()=>{});
const store=window.JDLibraryStorage;
assert.equal(store.isSignedIn(),true);
assert.equal(store.accountId(),'user-a');
await store.createFolder('Notes');
assert(calls.some(c=>c[0]==='insert'&&c[1]==='library_folders'&&c[2].user_id==='user-a'&&c[2].name==='Notes'));
calls.length=0;
await store.updateItemMetadata('item-a',{favorite:true});
assert(calls.some(c=>c[0]==='update'&&c[1]==='library_items'&&c[2].metadata.favorite===true));
assert(calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='user-a'));
calls.length=0;
await store.listFolders();
assert(calls.some(c=>c[0]==='select'&&c[1]==='library_folders'));
calls.length=0;
const all=await store.listItems();
assert.equal(all.data.length,201,'Library browse must not silently hide files beyond the first 200');
const file=await store.getFile({storage_path:'user-a/a.txt',file_name:'a.txt',mime_type:'text/plain'});
assert.equal(file.name,'a.txt');
console.log('PASS: account-scoped Library folder, metadata and file bridge');
