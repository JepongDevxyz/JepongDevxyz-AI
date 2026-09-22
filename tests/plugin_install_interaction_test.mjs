import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Lightweight DOM interaction harness: no extra npm dependencies on the Vercel project.
const source=fs.readFileSync('plugins.js','utf8');
const store=new Map(), elements=new Map();
let oauthConnected=false,disconnected=false;
class FakeElement {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};
    this.className='';this.hidden=false;this.value='';this.checked=false;this.textContent='';
    this.attributes={};this.classList={
      add:()=>{},remove:()=>{},toggle:()=>{},contains:()=>false
    };
  }
  set id(value){this._id=value;elements.set(value,this);}
  get id(){return this._id||'';}
  set innerHTML(html){this._html=html;this.children=[];
    // This harness only needs stable ID-bearing controls from static trusted PANEL_HTML.
    for(const m of html.matchAll(/<([a-z][a-z0-9-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)){
      const el=new FakeElement(m[1]);el.id=m[2];el.hidden=/\shidden(?:\s|>|=)/.test(m[0]);
    }
  }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=[...items];}
  addEventListener(name,handler){this.handlers[name]=handler;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  focus(){}
  click(){return this.handlers.click?.({target:this});}
  get parentNode(){return null;}
}
const doc={
  createElement:tag=>new FakeElement(tag),
  getElementById:id=>elements.get(id)||null,
  querySelectorAll:selector=>selector==='.jdplug-entry-menu'?[]:[],
  body:new FakeElement('body')
};
const win={};
const sandbox={
  document:doc,window:win,
  localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
  location:{search:'',pathname:'/',hash:''},
  URLSearchParams,URL,Event:class Event{constructor(type){this.type=type;}},
  setTimeout:()=>{throw new Error('Unexpected OAuth timer.');},
  fetch:async (url,options={})=>{
    if(url==='/api/github-oauth-session'&&options.method==='DELETE'){
      disconnected=true;oauthConnected=false;return {ok:true,json:async()=>({connected:false})};
    }
    if(url==='/api/github-oauth-session'&&(!options.method||options.method==='GET'))
      return {ok:true,json:async()=>({connected:oauthConnected,user:{login:'test-user',avatar:''},scopes:['read:user']})};
    throw new Error('Unexpected network access during local install flow: '+url);
  },
  console
};
vm.runInNewContext(source,sandbox,{filename:'plugins.js'});
const get=id=>elements.get(id);
const currentPlus=label=>{
  const available=get('jdplugAvailable').children;
  const wrapper=available.find(x=>x.children.some(c=>c.attributes['aria-label']==='Install '+label));
  assert(wrapper,'missing install plus for '+label);
  return wrapper.children.find(x=>x.attributes['aria-label']==='Install '+label);
};

assert.equal(win.JDPlugins.contextForChat().github.enabled,false);
assert.equal(win.JDPlugins.contextForChat().superpowers.enabled,false);
win.JDPlugins.open('plugins');
assert.equal(get('jdplugInstalled').children[0].textContent,'No plugins installed yet.');
currentPlus('GitHub').click();
assert.equal(get('jdplugConfirm').hidden,false);
assert.equal(get('jdplugConfirmTitle').textContent,'Install GitHub?');
assert.equal(win.JDPlugins.contextForChat().github.enabled,false,'consent step must not install yet');
get('jdplugCancelInstall').click();
assert.equal(get('jdplugConfirm').hidden,true,'cancel must close confirmation');
assert.notEqual(JSON.parse(store.get('jepong_plugins_directory_v2')||'{}').installed?.github,true,'cancel should not install');

currentPlus('GitHub').click();
get('jdplugConfirmInstall').click();
assert.equal(get('jdplugConfirm').hidden,true);
let saved=JSON.parse(store.get('jepong_plugins_directory_v2'));
assert.equal(saved.installed.github,true,'confirm must actually persist GitHub installation');
assert.equal(win.JDPlugins.contextForChat().github.enabled,false,'install without repository must not falsely attach GitHub context');

currentPlus('Superpowers').click();
get('jdplugConfirmInstall').click();
saved=JSON.parse(store.get('jepong_plugins_directory_v2'));
assert.equal(saved.installed.superpowers,true);
assert.equal(win.JDPlugins.contextForChat().superpowers.enabled,true,'installed Superpowers can be used');

const installedRows=get('jdplugInstalled').children;
const superRow=installedRows.find(x=>x.children[0]?.children[1]?.children[0]?.textContent==='Superpowers');
assert(superRow,'installed Superpowers must be listed under Installed');
superRow.children[0].click();
assert.equal(get('jdplugTry').textContent,'Installed');
assert.equal(get('jdplugTry').disabled,true,'installed plugin is automatically available and needs no manual Try action');
assert.equal(get('jdplugManage').hidden,true,'detail page keeps Manage behind the overflow action');
assert.equal(get('jdplugOverflow').hidden,false,'installed detail must expose overflow management');
get('jdplugOverflow').click();
assert.equal(get('jdplugManageView').hidden,false,'overflow opens Manage');
get('jdplugManageUninstall').click();
assert.equal(get('jdplugConfirmTitle').textContent,'Uninstall Superpowers?');
get('jdplugConfirmInstall').click();
saved=JSON.parse(store.get('jepong_plugins_directory_v2'));
assert.equal(saved.installed.superpowers,false);
assert.equal(win.JDPlugins.contextForChat().superpowers.enabled,false,'uninstall must immediately revoke workflow from chat');
assert.equal(saved.installed.github,true,'uninstalling one plugin must preserve the other');

// A linked GitHub session must be disconnected when the plugin is uninstalled.
oauthConnected=true;
win.JDPlugins.open('plugins');
await new Promise(resolve=>setTimeout(resolve,0));
const githubRow=get('jdplugInstalled').children.find(x=>x.children[0]?.children[1]?.children[0]?.textContent==='GitHub');
assert(githubRow,'installed GitHub should remain in the installed list');
githubRow.children[0].click();
assert.equal(get('jdplugTry').textContent,'Installed');
assert.equal(get('jdplugTry').disabled,true,'installed plugin needs no manual chat activation');
get('jdplugOverflow').click();
get('jdplugManageUninstall').click();
await get('jdplugConfirmInstall').click();
saved=JSON.parse(store.get('jepong_plugins_directory_v2'));
assert.equal(disconnected,true,'uninstall must call backend disconnect for a connected account');
assert.equal(saved.installed.github,false,'uninstall must persist removal');
assert.equal(win.JDPlugins.contextForChat().github.enabled,false,'GitHub must be disabled immediately');
console.log('PASS: interactive install/cancel/installed-list/uninstall/OAuth-disconnect/chat gates');
