import assert from 'node:assert/strict';
import fs from 'node:fs';

const api=fs.readFileSync('api/chat.js','utf8');
const html=fs.readFileSync('index.html','utf8');

const requiredBackend=[
  "Searching GitHub repository metadata:",
  "Read GitHub repository metadata:",
  "Exploring GitHub repository structure:",
  "Explored repository structure •",
  "Inspecting repository API implementation:",
  "Inspecting uploaded project archive:",
  "Inspecting Gradle configuration and dependencies",
  "Inspecting Android manifest and component declarations",
  "Inspecting Java/Kotlin project sources",
  "Running static checks on ",
  "Reading selected GitHub repository source",
  "Checking GitHub Actions and pull request status",
  "Checking current GitHub issues",
  "label:'Checking the response against your request'",
  "label:\`Checking \${Math.min(generatedBlocks.length,10)} generated code block"
];
for(const token of requiredBackend){
  assert(api.includes(token),'Missing truthful tool-trace milestone: '+token);
}

assert(api.includes("activity(emit,'plugin-github','Read selected GitHub source','completed','github')"),
  'GitHub source read needs an explicit completion event');
assert(api.includes("activity(emit,'plugin-github-actions','Read real GitHub Actions and PR status','completed','github')"),
  'GitHub Actions inspection needs an explicit completion event');
assert(api.includes("activity(emit,'plugin-github-issues','Read current GitHub issues','completed','github')"),
  'GitHub issue inspection needs an explicit completion event');

assert(html.includes("github:'github'") && html.includes("plugin:'plug'"),
  'GitHub/plugin activity needs recognizable tool icons');
assert(html.includes("if(row && normalized.state!=='running')")&&html.includes('previousLabel!==nextLabel'),
  'Every real activity kind must preserve changed start-to-result lifecycle labels');
assert(html.includes("if(id==='response-audit')")&&html.includes("if(id==='output-verification')"),
  'Audit/verification IDs must remain recognized as real operation milestones');
assert(!html.includes("['thinking','generation','router','response-audit','output-verification'].includes(id)"),
  'Audit/verification must not be hidden inside an internal-stage bucket');

console.log('PASS: truthful ChatGPT-style Activity trace keeps real GitHub, project, audit, and verification start-to-result milestones.');
