import assert from 'node:assert/strict';
import fs from 'node:fs';
const ui=fs.readFileSync('plugins.js','utf8');
const css=fs.readFileSync('plugins.css','utf8');
const page=fs.readFileSync('index.html','utf8');
for(const id of ["id:'gmail'","id:'superpowers'","id:'vercel'","id:'spotify'"])
  assert(ui.includes(id),'current marketplace catalog missing '+id);
for(const term of ['function renderDir()','function renderDetail(id)','function install(id)','function uninstall(id)',
  'function connectPluginAccount(id, btn)','function contextForChat()','data-act=\"install\"',
  'data-act=\"detail\"','data-act=\"skill\"'])
  assert(ui.includes(term),'current marketplace behavior missing '+term);
assert(ui.includes("var LS = 'jd_plugins_v3_installed'"));
assert(ui.includes("'.jdpg{"),'current marketplace styles are injected by plugins.js');
assert(css.includes('.jdplug-dialog')&&css.includes('100dvh'),'shared plugin styles retain full-height responsive layout');
assert(page.includes('src="/plugins.js"')&&page.includes('href="/plugins.css"'));
assert(page.includes('window.JDPlugins?.contextForChat?.()'));
console.log('PASS: current plugin marketplace, install actions, skills, responsive styling and page wiring');
