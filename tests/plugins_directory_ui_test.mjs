import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('plugins.js','utf8');
const css=fs.readFileSync('plugins.css','utf8');
const page=fs.readFileSync('index.html','utf8');

for(const id of ['jdplugTabPlugins','jdplugTabSkills','jdplugDirectory','jdplugSearch',
  'jdplugInstalled','jdplugAvailable','jdplugDetail','jdplugTry','jdplugManage',
  'jdplugManageView','jdplugRepoInput','jdplugResults','jdplugSuperEnabled',
  'jdplugPhase','jdplugGitEnabled']){
  assert(ui.includes('id="'+id+'"'),'missing directory component '+id);
}
for(const term of ['function renderDirectory(', 'function tryInChat(', 'function openRepo(',
  "call('repo')", "call('read'", "call('prs')", 'function renderSkillRows(', 'function persist()',
  'window.JDPlugins=Object.freeze({open,close,contextForChat()']){
  assert(ui.includes(term),'missing functional plugin behavior: '+term);
}
assert(ui.includes('state.repoLoaded'),'GitHub chat access must be scoped to an inspected repo');
assert(ui.includes('textContent=pr.title')===false,'PR names must be combined in safe textContent rather than HTML');
assert(ui.includes('link.textContent=') && ui.includes("link.rel='noopener noreferrer'"),
  'external PR links must be safe and use textContent');
assert(!/GitHub connected account|OAuth connected|automatic push|unlimited apps/i.test(ui),
  'UI must not claim unavailable third-party authorization');
assert(css.includes('@media(max-width:590px)')&&css.includes('94dvh'),
  'mobile bottom-sheet responsive layout is required');
assert(page.includes('src="/plugins.js"')&&page.includes('href="/plugins.css"'),
  'directory assets must remain wired to the current app');
assert(page.includes('window.JDPlugins?.open()')&&page.includes('window.JDPlugins?.contextForChat?.()'),
  'settings/composer and chat request must continue using the real plugin object');
console.log('PASS: Plugins + Skills directory UI contracts');
