import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('async function addSelectedFiles(');
const end=html.indexOf('async function handleFileSelect(',start);
assert(start>=0&&end>start);
const body=html.slice(start,end);
const selectedFilesData=[];
const attachmentJobs=new Map();
const addSelectedFiles=new Function('personalizationSettings','showModernToast','selectedFilesData','MAX_SELECTED_ATTACHMENTS',
  'showModernAlert','attachmentId','attachmentKind','renderFilePreviews','requestAnimationFrame','processAttachmentFile','attachmentJobs','performance',
  body+'\nreturn addSelectedFiles;')(
    {librarySearch:false},()=>{},selectedFilesData,10,()=>{},()=>String(Math.random()),()=> 'text',()=>{},
    cb=>cb(),async()=>{},attachmentJobs,{now:()=>0});
const file={name:'saved.txt',type:'text/plain',size:4,lastModified:1,__jdFromLibrary:true};
await addSelectedFiles([file],{manualLibrary:true});
assert.equal(selectedFilesData.length,1,'manually chosen saved file must reach the composer even with automatic Library search OFF');
assert.match(html,/cloudUser\s*&&\s*!file\.__jdFromLibrary/,'reuse must not save a duplicate Library row');
assert.match(readFileSync(new URL('../library-chatgpt.js',import.meta.url),'utf8'),/getFile\(item\)[\s\S]*?addSelectedFiles\(\[file\],\{manualLibrary:true\}\)/);
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const gate=api.slice(api.indexOf('function applyChatFeatureSettings(body={}){'),api.indexOf('async function processChat('));
const applySettings=new Function(gate+'\nreturn applyChatFeatureSettings;')();
const processed=applySettings({files:[{name:'saved.txt'}],personalization:{librarySearch:false,libraryContext:[{fileName:'private',snippet:'hidden'}]}});
assert.equal(processed.files.length,1,'automatic Library search OFF must preserve manually attached files');
assert.deepEqual(processed.personalization.libraryContext,[],'automatic search OFF must still exclude automatic excerpts');
const settingsHandler=html.slice(html.indexOf("function setPersonalizationToggle("),html.indexOf("function setPersonalizationToggle(")+2600);
assert.doesNotMatch(settingsHandler,/key==='librarySearch'\s*&&\s*!value[\s\S]{0,150}selectedFilesData\.length\s*=\s*0/,
  'switching automatic Library search OFF must not remove manually attached files');
console.log('PASS: saved Library file reaches the real composer attachment path');
