import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing source boundary: '+start);
  return src.slice(a,b);
}

// Client: task-relevant project files must outrank IDE/cache metadata.
const prioritySrc=between(html,
  "        function archiveSourcePriority(name='', promptText=''){",
  "\n        async function extractArchiveAttachment");
const archiveSourcePriority=new Function(prioritySrc+'\nreturn archiveSourcePriority;')();
assert(
  archiveSourcePriority('app/build.gradle','fix this Android project') >
  archiveSourcePriority('.idea/openedFiles.json','fix this Android project'),
  'Build configuration must outrank IDE session metadata'
);
assert(
  archiveSourcePriority('app/src/main/java/com/example/MainActivity.java','fix MainActivity crash') >
  archiveSourcePriority('README.md','fix MainActivity crash'),
  'Prompt-matching source file must outrank generic documentation'
);
assert(html.includes('const MAX_SOURCE_FILES=80'),'Local project source bank should no longer stop at 30 files');
assert(html.includes('const MAX_ARCHIVE_REQUEST_FILES=56'),'Request-time source pack should support a broad project slice');
assert(html.includes('return requestFiles.slice(0,64)'),'Task-ranked source files must not be truncated by the old 36-item cap');
assert(html.includes('prepareAttachmentsForRequest(selectedAttachmentSnapshot, message)'),
  'Project source selection must use the actual user request');
assert(html.includes("['apk','aab','jar','aar'].includes(ext)"),
  'Common ZIP-compatible project/binary archives must be inspectable');
assert(html.includes("Object.defineProperty(placeholder,'_localFile'"),
  'Original project ZIP must remain available locally for source-preserving download merge');

// Server: all models share one provider-independent capability/system context.
assert(api.includes('function universalCapabilityInstruction(userMessage='),
  'Universal capability instruction missing');
assert(api.includes('text += universalCapabilityInstruction(userMessage, files);'),
  'Universal capability instruction must be wired into the common system prompt');
assert(api.includes('const input=Array.isArray(files)?files.slice(0,64):[];'),
  'Server must accept the expanded task-ranked evidence pack');
assert(api.includes('archiveSelectedCount:Math.max(0,Number(raw.archiveSelectedCount)||0)'),
  'Archive coverage metadata must survive server sanitization');
assert(api.includes("activity(emit,'task-prepared'"),
  'Every normal chat request must expose a truthful prepared-context Activity milestone');
assert(api.includes('responseEffortRank(responseEffort)>=2 || projectChangeIntent'),
  'Project archive fixes should receive quality preflight even in Instant/Low');
assert(api.includes('Do not infer a critical package mismatch'),
  'All models must be warned not to infer package failures from filenames/IDE metadata');

// Deterministic Android consistency evidence should agree with actual supplied files.
const helperSrc=between(api,'function uploadedProjectGroups(files=[]){','\nfunction inspectUploadedProject(files=[], emit){');
const androidProjectConsistencyEvidence=new Function(
  'attachmentRootName','textFromAttachment',
  helperSrc+'\nreturn androidProjectConsistencyEvidence;'
)(
  f=>String(f?.parentName||f?.name||''),
  f=>String(f?.extractedText||'')
);

const good=[
  {name:'app/build.gradle',extractedText:'android { namespace "com.example.app" compileSdk 36 defaultConfig { applicationId "com.example.app" minSdk 23 targetSdk 36 } }'},
  {name:'app/src/main/AndroidManifest.xml',extractedText:'<manifest package="com.example.app"><application><activity android:name=".MainActivity"/></application></manifest>'},
  {name:'app/src/main/java/com/example/app/MainActivity.java',extractedText:'package com.example.app; public class MainActivity {}'}
];
const evidence=androidProjectConsistencyEvidence(good);
assert.equal(evidence.namespace,'com.example.app');
assert.equal(evidence.applicationId,'com.example.app');
assert.equal(evidence.targetSdk,'36');
assert.equal(evidence.packagePathMismatches.length,0);
assert.equal(evidence.unresolvedComponents.length,0);

const bad=[
  ...good.slice(0,2),
  {name:'app/src/main/java/com/wrong/path/MainActivity.java',extractedText:'package com.example.app; public class MainActivity {}'}
];
const badEvidence=androidProjectConsistencyEvidence(bad);
assert.equal(badEvidence.packagePathMismatches.length,1,
  'Package/path mismatch must come from source evidence, not a guess');

assert(api.includes('whole-project inspection unless separate execution/full-coverage evidence exists'),
  'The response must remain honest when a huge project cannot fit one model request');

console.log('PASS: universal model-neutral capability pipeline, task-ranked project inspection, Android consistency evidence, source-preserving ZIP updates, and always-on truthful Activity.');
