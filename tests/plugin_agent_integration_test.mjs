import assert from 'node:assert/strict';
import fs from 'node:fs';
const agent=fs.readFileSync('agent.js','utf8');
const page=fs.readFileSync('index.html','utf8');
assert(page.includes('src="/agent.js" defer'));
assert(page.includes('window.JDPlugins?.openAgent?.(message.slice(6).trim())'));
assert(agent.includes('Inspect and draft changes'));
assert(agent.includes('Review every full replacement before approving'));
assert(agent.includes('No code has been committed or tested yet'));
assert(agent.includes('window.JDPlugins?.stageAgentFiles?.(proposal)'));
assert(fs.readFileSync('plugins.js','utf8').includes('stageAgentFiles: function () { return false; }'),
  'current plugin UI must not falsely claim unsupported staged-file delivery');
console.log('PASS: current coding-agent UI makes review and unsupported staging limits explicit');
