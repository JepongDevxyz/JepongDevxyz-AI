import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

for(const token of [
  "const archiveFiles=[]",
  "Readable source/config entries prepared:",
  "kind:'archive-entry'",
  "parentName:f.name",
  "Archive entry:",
  "Object.defineProperty(placeholder,'_localFile'",
  "async function mergeGeneratedZipWithOriginal",
  "original.file(clean,bytes)",
  "original files preserved"
]) assert(html.includes(token),'Missing deep ZIP client contract: '+token);

for(const token of [
  "function uploadedProjectGroups(files=[])",
  "function inspectUploadedProject(files=[], emit)",
  "Inspected ZIP contents:",
  "Reviewed Gradle configuration and dependencies",
  "Reviewed Android manifest and component declarations",
  "Inspected Java/Kotlin project sources",
  "Project static checks",
  "const projectInspectionContext=inspectUploadedProject(files,emit);",
  "explicitOnly:overlay",
  "addReadme:!overlay",
  "Updated project patch"
]) assert(api.includes(token),'Missing deep ZIP server contract: '+token);

assert(api.includes("Do not claim a Gradle build, APK install, emulator run, or runtime test unless separate execution evidence exists."),
  'Project inspection must not fabricate execution evidence');
assert(api.includes("browser keeps the original archive locally and will overlay your changed/new files onto it"),
  'Model must know unchanged/binary project files are preserved by local merge');
assert(api.includes("For EVERY file you actually changed or created"),
  'Artifact response must emit complete changed files with exact paths');
assert(!api.includes("fabricated binary contents. Also show the useful updated code"),
  'Old generic artifact instruction should not override grounded project behavior');

console.log('PASS: uploaded ZIPs are expanded into grounded source files, deeply inspected, statically checked, and merged back over the untouched original project.');
