import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui=fs.readFileSync('plugins.js','utf8');
const panel=JSON.parse(ui.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));
const css=fs.readFileSync('plugins.css','utf8');
const page=fs.readFileSync('index.html','utf8');

for(const id of ['jdplugTabPlugins','jdplugTabSkills','jdplugDirectory','jdplugSearch',
  'jdplugInstalled','jdplugAvailable','jdplugDetail','jdplugTry','jdplugManage',
  'jdplugManageView','jdplugRepoInput','jdplugResults','jdplugSuperEnabled',
  'jdplugPhase','jdplugGitEnabled','jdplugConnectGithub','jdplugDisconnectGithub',
  'jdplugGithubSignedIn','jdplugGithubSignedOut','jdplugAccountRepos','jdplugRefreshRepos',
  'jdplugIconStrip','jdplugDemo','jdplugOverflow','jdplugManageUninstall']){
  assert(panel.includes('id="'+id+'"'),'missing directory component '+id);
}
for(const term of ['function renderDirectory(', 'function tryInChat(', 'function openRepo(',
  "call('repo')", "call('read'", "call('prs')", "call('repos')", 'function renderSkillRows(', 'function persist()',
  'function connectGithub(', 'function disconnectGithub(', 'function refreshGithubSession(',
  'window.JDPlugins=Object.freeze({open,close,contextForChat()']){
  assert(ui.includes(term),'missing functional plugin behavior: '+term);
}
assert(ui.includes('state.repoLoaded'),'GitHub chat access must be scoped to an inspected repo');
assert(ui.includes('textContent=pr.title')===false,'PR names must be combined in safe textContent rather than HTML');
assert(ui.includes('link.textContent=') && ui.includes("link.rel='noopener noreferrer'"),
  'external PR links must be safe and use textContent');
assert(ui.includes('/api/github-oauth-start')&&ui.includes('/api/github-oauth-session'),
  'official GitHub OAuth start/session endpoints must be wired to the marketplace');
assert(!/automatic push|unlimited apps/i.test(ui),
  'UI must not claim unsupported repository write automation or fictitious unlimited apps');
assert(css.includes('@media(max-width:590px)')&&css.includes('100dvh'),
  'full-screen mobile marketplace layout is required');
assert(css.includes('.jdplug-top-tabs')&&css.includes('border-radius:999px')&&css.includes('.jdplug-demo'),
  'reference segmented tabs and plugin demo surface must remain present');
assert(page.includes('src="/plugins.js"')&&page.includes('href="/plugins.css"'),
  'directory assets must remain wired to the current app');
assert(page.includes('window.JDPlugins?.open()')&&page.includes('window.JDPlugins?.contextForChat?.()'),
  'settings/composer and chat request must continue using the real plugin object');
console.log('PASS: Plugins + Skills directory UI contracts');
