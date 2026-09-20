import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('plugins.js','utf8');
const css=fs.readFileSync('plugins.css','utf8');
const panel=JSON.parse(source.split('\n')[0].replace(/^const PANEL_HTML=/,'').replace(/;$/,''));

for(const id of ['jdplugConfirm','jdplugConfirmTitle','jdplugConfirmDescription','jdplugConfirmInstall',
  'jdplugCancelInstall','jdplugUninstall','jdplugTry','jdplugManage']){
  assert(panel.includes('id="'+id+'"'),'missing installation UI '+id);
}
for(const marker of ['function showPluginConfirmation(', 'function confirmPluginAction(',
  'function hidePluginConfirmation(', 'installed:{github:false,superpowers:false}',
  "if(!installed(selected)){showPluginConfirmation(selected,'install');return;}",
  "if(!installed('github')){notice('Install GitHub before using its tools.',true);return null;}",
  "enabled:installed('superpowers')&&state.superpowers",
  "enabled:installed('github')&&state.github&&state.repoLoaded",
  "state.installed[id]=false", "state.installed[id]=true",
  "method:'DELETE',credentials:'same-origin'"]){
  assert(source.includes(marker),'missing explicit install / uninstall enforcement: '+marker);
}
assert(css.includes('.jdplug-list-item')&&css.includes('.jdplug-confirm[hidden]'));
assert(!source.includes("const installed=$('jdplugInstalled')"),'local DOM variable must not shadow installed() predicate');

function boot(saved){
  const store=new Map();
  if(saved!==null)store.set('jepong_plugins_directory_v2',JSON.stringify(saved));
  const sandbox={
    window:{},document:{getElementById(){return null;}},
    localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    location:{search:'',pathname:'/',hash:''},URLSearchParams,
    setTimeout(){throw new Error('Unexpected OAuth callback timer.');},
    console
  };
  vm.runInNewContext(source,sandbox,{filename:'plugins.js'});
  return sandbox.window.JDPlugins.contextForChat();
}

const none=boot(null);
assert.equal(none.superpowers.enabled,false,'Superpowers starts uninstalled');
assert.equal(none.github.enabled,false,'GitHub starts uninstalled');
const legacy=boot({superpowers:true,github:true,phase:'implement'});
assert.equal(legacy.superpowers.enabled,false,'legacy enabled setting must not silently install Superpowers');
assert.equal(legacy.github.enabled,false,'legacy enabled setting must not silently install GitHub');
const explicit=boot({installed:{github:false,superpowers:true},superpowers:true,phase:'debug'});
assert.equal(explicit.superpowers.enabled,true,'installed Superpowers should be eligible for chat');
assert.equal(explicit.superpowers.phase,'debug');
assert.equal(explicit.github.enabled,false,'uninstalled GitHub cannot attach context');
console.log('PASS: plugin install-first gates, OAuth disconnect and legacy settings migration');
