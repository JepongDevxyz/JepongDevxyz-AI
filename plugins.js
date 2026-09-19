const PANEL_HTML="<section class=\"jdplug-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugTitle\">\n<header class=\"jdplug-header\"><div><h2 id=\"jdplugTitle\">Plugins</h2><p>Developer tools for JepongDevxyz AI</p></div>\n<button type=\"button\" class=\"jdplug-close\" id=\"jdplugClose\" aria-label=\"Close plugins\">×</button></header>\n<div class=\"jdplug-scroll\">\n<section class=\"jdplug-card\">\n<div class=\"jdplug-title\"><strong>⚡ Superpowers workflow</strong><span class=\"jdplug-pill\">Coding skills</span></div>\n<p class=\"jdplug-muted\">Guided planning, test-driven implementation, debugging and review in coding replies. Workflow adaptation; not a locally installed agent or automatic code executor.</p>\n<label class=\"jdplug-row\"><input type=\"checkbox\" class=\"jdplug-switch\" id=\"jdplugSuperEnabled\"><span>Enable for coding conversations</span></label>\n<select class=\"jdplug-select\" id=\"jdplugPhase\" aria-label=\"Coding workflow phase\"></select></section>\n<section class=\"jdplug-card\">\n<div class=\"jdplug-title\"><strong>GitHub</strong><span class=\"jdplug-pill\">Public · read only</span></div>\n<p class=\"jdplug-muted\">Inspect real public repositories, branches, files and open PRs. No GitHub account connection or write permissions. The AI backend reads selected source again for chat.</p>\n<div class=\"jdplug-row\"><input class=\"jdplug-input\" id=\"jdplugRepoInput\" aria-label=\"GitHub repository\" placeholder=\"owner/repository\" maxlength=\"210\"><button class=\"jdplug-btn primary\" type=\"button\" id=\"jdplugLoadRepo\">Open</button></div>\n<p class=\"jdplug-muted\" id=\"jdplugRepoDescription\"></p>\n<div class=\"jdplug-row\"><select class=\"jdplug-select\" id=\"jdplugBranch\" aria-label=\"GitHub branch\"></select><button class=\"jdplug-btn\" type=\"button\" id=\"jdplugPRs\">Open PRs</button></div>\n<p class=\"jdplug-muted\" id=\"jdplugLocation\"></p><div class=\"jdplug-results\" id=\"jdplugResults\" aria-label=\"GitHub repository files\"></div>\n<pre class=\"jdplug-preview\" id=\"jdplugPreview\" hidden></pre>\n<label class=\"jdplug-row\"><input type=\"checkbox\" class=\"jdplug-switch\" id=\"jdplugGitEnabled\"><span>Use selected repository/file as context in chat</span></label>\n<p class=\"jdplug-muted\" id=\"jdplugSelected\">Not included in chat.</p></section>\n<p class=\"jdplug-status\" id=\"jdplugStatus\" role=\"status\" aria-live=\"polite\"></p></div></section>";
/* JepongDevxyz AI GitHub and Superpowers plugin interface. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const state = {repo:'',path:'',ref:'',directory:'',github:false,repoLoaded:false,
    superpowers:false,phase:'plan',busy:false};
  const phases = [['plan','Plan / design'],['implement','Implement / TDD'],
    ['debug','Debug / root cause'],['review','Review / verify']];
  function button(label, fn) {
    const el=document.createElement('button');
    el.type='button';el.className='jdplug-btn';el.textContent=label;
    el.addEventListener('click',fn);return el;
  }
  function status(text,error=false) {
    const el=$('jdplugStatus');
    if(el){el.textContent=text;el.classList.toggle('error',error);}
  }
  function loading(on) {
    state.busy=on;
    document.querySelectorAll('#jdplugPanel .jdplug-btn').forEach(x=>{x.disabled=on;});
  }
  async function call(action, extras={}) {
    if(state.busy)return null;
    loading(true);status('Reading GitHub…');
    try {
      const response=await fetch('/api/plugins',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action,repo:state.repo,...extras})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'GitHub request failed.');
      status('GitHub: '+action+' completed.');return data;
    }catch(error){status(error.message||'GitHub unavailable.',true);return null;}
    finally{loading(false);}
  }
  function selected() {
    $('jdplugSelected').textContent=state.github&&state.repoLoaded
      ? state.repo+(state.path?' / '+state.path:'')+(state.ref?' @ '+state.ref:'')
      : 'Not included in chat.';
  }
  async function browse(path) {
    const data=await call('list',{path,ref:state.ref});if(!data)return;
    state.directory=path;
    const area=$('jdplugResults');area.replaceChildren();
    $('jdplugLocation').textContent=state.repo+'/'+path;
    if(path)area.append(button('↩ Parent folder',()=>browse(path.split('/').slice(0,-1).join('/'))));
    for(const entry of data.entries){
      if(!['dir','file'].includes(entry.type))continue;
      const row=document.createElement('button');row.type='button';row.className='jdplug-entry';
      const name=document.createElement('span');
      name.textContent=(entry.type==='dir'?'📁 ':'📄 ')+entry.name;
      const hint=document.createElement('span');
      hint.textContent=entry.type==='dir'?'›':String(entry.size||0)+' B';
      row.append(name,hint);
      row.addEventListener('click',()=>entry.type==='dir'?browse(entry.path):read(entry.path));
      area.append(row);
    }
    if(!data.entries.length)area.textContent='No files in this folder.';
  }
  async function read(path) {
    const data=await call('read',{path,ref:state.ref});if(!data)return;
    state.path=data.path;state.github=true;$('jdplugGitEnabled').checked=true;
    $('jdplugPreview').textContent=data.content.slice(0,4500);
    $('jdplugPreview').hidden=false;selected();
    status('Read '+data.path+'. The AI backend will verify this public file again.');
  }
  async function openRepo() {
    const input=$('jdplugRepoInput').value.trim();
    if(!/^(?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/.test(input)){
      status('Enter a repository URL or owner/repository.',true);return;
    }
    state.repo=input.replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
    state.repoLoaded=false;state.github=false;state.path='';state.ref='';state.directory='';
    $('jdplugGitEnabled').checked=false;$('jdplugPreview').hidden=true;selected();
    const info=await call('repo');if(!info)return;
    state.repoLoaded=true;state.repo=info.repo;
    $('jdplugRepoInput').value=info.repo;
    $('jdplugRepoDescription').textContent=[info.description,'Default branch: '+info.defaultBranch].filter(Boolean).join(' · ');
    try{localStorage.setItem('jepong_plugin_public_repo',info.repo);}catch(_){}
    const branchData=await call('branches');
    const selector=$('jdplugBranch');selector.replaceChildren();
    for(const item of branchData?.branches||[]){
      const option=document.createElement('option');
      option.value=item.name;option.textContent=item.name;selector.append(option);
    }
    selector.value=info.defaultBranch;state.ref=selector.value||info.defaultBranch;
    await browse('');
  }
  async function prs() {
    if(!state.repoLoaded){status('Open a repository first.',true);return;}
    const data=await call('prs');if(!data)return;
    const area=$('jdplugResults');area.replaceChildren();
    $('jdplugLocation').textContent='Open PRs · '+state.repo;
    area.append(button('↩ Files',()=>browse(state.directory)));
    for(const pr of data.pullRequests){
      const a=document.createElement('a');a.className='jdplug-entry';
      a.textContent='#'+pr.number+' '+pr.title;a.href=pr.url;
      a.target='_blank';a.rel='noopener noreferrer';area.append(a);
    }
    if(!data.pullRequests.length)area.append(document.createTextNode('No open pull requests.'));
  }
  function init() {
    if($('jdplugPanel'))return;
    const overlay=document.createElement('div');
    overlay.id='jdplugPanel';overlay.className='jdplug-overlay';
    overlay.innerHTML=PANEL_HTML;document.body.append(overlay);
    const selector=$('jdplugPhase');
    for(const [value,label] of phases){
      const option=document.createElement('option');
      option.value=value;option.textContent=label;selector.append(option);
    }
    selector.value=state.phase;
    $('jdplugSuperEnabled').checked=state.superpowers;
    $('jdplugSuperEnabled').addEventListener('change',e=>{
      state.superpowers=e.target.checked;
      status(state.superpowers?'Coding workflow enabled.':'Coding workflow disabled.');
    });
    selector.addEventListener('change',e=>{state.phase=e.target.value;});
    $('jdplugGitEnabled').addEventListener('change',e=>{
      state.github=e.target.checked&&state.repoLoaded;
      if(e.target.checked&&!state.repoLoaded){e.target.checked=false;status('Open a repository first.',true);}
      selected();
    });
    $('jdplugLoadRepo').addEventListener('click',openRepo);
    $('jdplugPRs').addEventListener('click',prs);
    $('jdplugBranch').addEventListener('change',e=>{
      state.ref=e.target.value;state.path='';$('jdplugPreview').hidden=true;selected();browse('');
    });
    $('jdplugClose').addEventListener('click',close);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  }
  function open() {
    if(typeof window.closeComposerTools==='function')window.closeComposerTools();
    if(typeof window.closeSettingsModal==='function')window.closeSettingsModal();
    init();$('jdplugPanel').classList.add('open');$('jdplugClose').focus();
    if(!state.repo)try{state.repo=localStorage.getItem('jepong_plugin_public_repo')||'';}catch(_){}
    $('jdplugRepoInput').value=state.repo;
  }
  function close(){$('jdplugPanel')?.classList.remove('open');}
  window.JDPlugins=Object.freeze({open,close,contextForChat(){
    return {superpowers:{enabled:state.superpowers,phase:state.phase},
      github:{enabled:state.github&&state.repoLoaded,repo:state.repo,path:state.path,ref:state.ref}};
  }});
})();