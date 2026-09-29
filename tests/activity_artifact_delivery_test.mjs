import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api=fs.readFileSync('api/chat.js','utf8');
const ui=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('reactbits-micro.css','utf8');

function between(src,start,end){
  const a=src.indexOf(start), b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing section: '+start);
  return src.slice(a,b);
}

const artifactDetect=between(api,'function wantsCompleteCode(message=','\nconst RESPONSE_EFFORT_LEVELS');
const detectSection=between(api,'function detectArtifactRequest(message=','\nfunction artifactInstruction');
const sandbox={Set,RegExp,String,Boolean};
vm.createContext(sandbox);
vm.runInContext(artifactDetect+'\n'+detectSection+'\nthis.detectArtifactRequest=detectArtifactRequest;',sandbox);
const detect=sandbox.detectArtifactRequest;

const implicit=detect('Ayusin mo ito at ibigay ang updated code para ready to import sa AIDE.',[
  {name:'Zen Injector.zip',kind:'zip'}
]);
assert(implicit,'Attached project update should request a real artifact');
assert.equal(implicit.kind,'zip');
assert.equal(implicit.filename,'Zen Injector_updated.zip');

const explicit=detect('Paki bigay ang buong updated code at .zip ng project.',[]);
assert(explicit&&explicit.kind==='zip','Explicit updated project ZIP should be detected');
assert.equal(detect('Explain what this code does.',[]),null,'Ordinary code explanation must not fabricate a download');

assert(api.includes('artifactInstruction(userMessage, files)'),'Artifact instruction must see attachments');
assert(api.includes("buildGeneratedArtifact(body.message||'',generatedText,body.files||[])"),
  'Artifact builder must see the project attachments');
assert(api.includes("'Packaging updated code into a ZIP'"),
  'ZIP packaging must emit a truthful activity milestone');
assert(api.includes('FILE: path/filename.ext') || api.includes('FILE: relative/path/filename.ext'),
  'Project artifact prompt must require exact file paths');

const render=between(ui,'const renderLiveResponse = (force=false) => {','const revealFinalResponse = async (elapsedMs=null) => {');
assert(render.includes('pendingArtifacts.forEach(artifact=>{void attachGeneratedArtifact(botMsgElem,artifact,historyFiles);})'),
  'Generated files must be attached after response innerHTML is rendered');
const sse=between(ui,"if (contentType.includes('text/event-stream')) {",'                } else {');
assert(sse.includes('pendingArtifacts.push(payload)'),
  'Artifact SSE events must be buffered instead of being erased by final render');
assert(!sse.includes('attachGeneratedArtifact(botMsgElem, payload)'),
  'Do not append an artifact before the final innerHTML replacement');

assert(ui.includes('downloadSnippetFromButton(this)'),'Every rendered code block needs a Download action');
assert(ui.includes('function downloadSnippetFromButton'),'Code download handler missing');
assert(ui.includes('container.dataset.filename = inferredFilename'),'Code blocks must preserve an inferred filename');

assert(ui.includes('class="rb-lattice-loader"'),'Requested 3x3 Lattice activity status missing');
assert(css.includes('.lattice-loader__run .lattice-loader__cell'),'Lattice activity styling missing');
assert(!css.includes('.thought-line::after'),'Thought Line must not restore the unwanted horizontal divider');

console.log('PASS: requested Lattice activity status plus durable code/ZIP artifact delivery contract.');
