const PANEL_HTML="\n<section class=\"jdplug-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugTitle\">\n<header class=\"jdplug-header\"><button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugBack\" aria-label=\"Back\">‹</button><h2 id=\"jdplugTitle\">Plugins</h2><button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugClose\" aria-label=\"Close\">×</button></header>\n<div class=\"jdplug-top-tabs\" id=\"jdplugTabs\"><button type=\"button\" class=\"jdplug-top-tab active\" id=\"jdplugTabPlugins\">Plugins</button><button type=\"button\" class=\"jdplug-top-tab\" id=\"jdplugTabSkills\">Skills</button></div>\n<div class=\"jdplug-scroll\">\n<section class=\"jdplug-view\" id=\"jdplugDirectory\">\n<h3 class=\"jdplug-heading\" id=\"jdplugDirectoryTitle\">Plugins</h3>\n<p class=\"jdplug-subtitle\" id=\"jdplugDirectoryHint\">Use developer tools with JepongDevxyz AI.</p>\n<label class=\"jdplug-search\"><span aria-hidden=\"true\">⌕</span><input id=\"jdplugSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Search plugins\" aria-label=\"Search plugins and skills\"></label>\n<p class=\"jdplug-group\" id=\"jdplugInstalledLabel\">Enabled</p>\n<div class=\"jdplug-list\" id=\"jdplugInstalled\"></div>\n<p class=\"jdplug-group\" id=\"jdplugAvailableLabel\">Available</p>\n<div class=\"jdplug-list\" id=\"jdplugAvailable\"></div>\n</section>\n<section class=\"jdplug-view\" id=\"jdplugDetail\" hidden>\n<div class=\"jdplug-hero\"><div class=\"jdplug-entry-icon\" id=\"jdplugHeroIcon\" aria-hidden=\"true\"></div><h3 id=\"jdplugHeroTitle\"></h3><p id=\"jdplugHeroTagline\"></p><div class=\"jdplug-hero-actions\"><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugTry\">Try in chat</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugManage\">Manage</button></div></div>\n<p class=\"jdplug-description\" id=\"jdplugDescription\"></p>\n<div id=\"jdplugGithubSummary\"><p class=\"jdplug-section-label\">Repository</p><div class=\"jdplug-card\"><strong id=\"jdplugCurrentRepo\">No repository selected</strong><p id=\"jdplugRepoSummary\">Open and select a public repository to make its source available for this chat.</p></div></div>\n<div id=\"jdplugSkillSummary\" hidden><p class=\"jdplug-section-label\">Included coding skills</p><div class=\"jdplug-list\" id=\"jdplugDetailSkillList\"></div></div>\n<div class=\"jdplug-hint\" id=\"jdplugDetailNote\"></div>\n</section>\n<section class=\"jdplug-view\" id=\"jdplugManageView\" hidden>\n<h3 class=\"jdplug-heading\" id=\"jdplugManageTitle\">Settings</h3><p class=\"jdplug-subtitle\" id=\"jdplugManageSubtitle\"></p>\n<div id=\"jdplugGithubManage\">\n<div class=\"jdplug-card\"><strong>GitHub repository</strong><p>Public repository access (read only). This is not GitHub account OAuth and does not support commits or merge from this panel.</p>\n<label class=\"jdplug-field\" for=\"jdplugRepoInput\">Repository URL or owner/repository</label>\n<div class=\"jdplug-row\"><input class=\"jdplug-input\" id=\"jdplugRepoInput\" autocomplete=\"off\" spellcheck=\"false\" maxlength=\"210\" placeholder=\"owner/repository\"><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugLoadRepo\">Open</button></div>\n<p id=\"jdplugRepoDescription\" class=\"jdplug-muted\"></p>\n<div class=\"jdplug-row\"><select class=\"jdplug-select\" id=\"jdplugBranch\" aria-label=\"GitHub branch\"></select><button type=\"button\" class=\"jdplug-button\" id=\"jdplugPRs\">Open PRs</button></div>\n<p class=\"jdplug-muted\" id=\"jdplugLocation\"></p><div class=\"jdplug-file-list\" id=\"jdplugResults\" aria-label=\"Repository files\"></div>\n<pre class=\"jdplug-preview\" id=\"jdplugPreview\" hidden></pre>\n<div class=\"jdplug-row\"><label for=\"jdplugGitEnabled\">Use selected repository/file in chat</label><input type=\"checkbox\" id=\"jdplugGitEnabled\"></div>\n<p class=\"jdplug-muted\" id=\"jdplugSelected\">Not included in chat.</p>\n</div>\n<div class=\"jdplug-card\"><strong>Permissions</strong><p>Public repository metadata, file contents, branch names and open pull requests. No account authorization, private repository access, or GitHub write operations.</p></div>\n</div>\n<div id=\"jdplugSuperManage\" hidden>\n<div class=\"jdplug-card\"><strong>Superpowers workflow</strong><p>Enable structured coding guidance during coding conversations. This does not run a separate autonomous agent or install official ChatGPT skills.</p><div class=\"jdplug-row\"><label for=\"jdplugSuperEnabled\">Enable coding workflow</label><input type=\"checkbox\" id=\"jdplugSuperEnabled\"></div>\n<label class=\"jdplug-field\" for=\"jdplugPhase\">Active coding skill</label><select class=\"jdplug-select\" id=\"jdplugPhase\"></select></div>\n<p class=\"jdplug-section-label\">Included skills</p><div class=\"jdplug-list\" id=\"jdplugManageSkillList\"></div>\n<div class=\"jdplug-card\"><strong>Permissions</strong><p>Guidance in this chat only. Superpowers does not access files, run tests, create branches, or push commits without a separate working tool.</p></div>\n</div>\n<p class=\"jdplug-status\" id=\"jdplugStatus\" role=\"status\" aria-live=\"polite\"></p>\n</section>\n</div></section>";

/* Mobile Plugins + Skills directory for JepongDevxyz AI. Two actual built-in capabilities; no fictitious OAuth, marketplace or agent execution. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY='jepong_plugins_directory_v2';
  const phases=[
    {id:'plan',name:'Brainstorming & planning',description:'Clarify the goal, inspect available evidence, and outline the implementation.'},
    {id:'implement',name:'Executing plans / TDD',description:'Write a focused implementation plan and specify tests before claiming it works.'},
    {id:'debug',name:'Diagnosing problems',description:'Reproduce and narrow down bugs using actual error messages and relevant source.'},
    {id:'review',name:'Reviewing & finishing',description:'Review the changed code, identify remaining risks, and verify before release.'}
  ];
  const catalogue={
    github:{name:'GitHub',tagline:'Browse repository code, branches and pull requests',description:'Explore public GitHub repositories, open source files, view branches and pull requests, and use the selected file as context in chat.',icon:'GH',className:'git'},
    superpowers:{name:'Superpowers',tagline:'Make your coding workflow more structured',description:'Built-in conversational coding skills for planning, implementation, debugging and review. Enable a workflow and choose its active phase before asking your coding question.',icon:'⚡',className:'super'}
  };
  const defaultState={repo:'',path:'',ref:'',directory:'',github:false,repoLoaded:false,superpowers:false,phase:'plan'};
  const state=Object.assign({},defaultState);
  let tab='plugins',view='directory',selected='github',busy=false;
  const history=[];
  function text(id,value){const el=$(id);if(el)el.textContent=String(value||'');}
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({repo:state.repo,github:state.github,superpowers:state.superpowers,phase:state.phase}));}catch(_){}}
  function restore(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(s&&typeof s==='object'){state.repo=typeof s.repo==='string'?s.repo:'';state.github=false;state.superpowers=s.superpowers===true;state.phase=phases.some(p=>p.id===s.phase)?s.phase:'plan';}}catch(_){}}
  restore();
  function notice(message,error=false){text('jdplugStatus',message);$('jdplugStatus')?.classList.toggle('error',!!error);}
  function setBusy(flag){busy=!!flag;document.querySelectorAll('#jdplugPanel .jdplug-button, #jdplugPanel .jdplug-entry').forEach(el=>{if(el.tagName==='BUTTON')el.disabled=busy;});}
  function makeButton(label,handler,className='jdplug-button'){const el=document.createElement('button');el.type='button';el.className=className;el.textContent=label;el.addEventListener('click',handler);return el;}
  function icon(className,character){const el=document.createElement('span');el.className='jdplug-entry-icon '+className;el.textContent=character;el.setAttribute('aria-hidden','true');return el;}
  function makeEntry(data,handler,small=''){const row=makeButton('',handler,'jdplug-entry');row.append(icon(data.className,data.icon));const copy=document.createElement('span');copy.className='jdplug-entry-copy';const strong=document.createElement('strong');strong.textContent=data.name;const desc=document.createElement('small');desc.textContent=small||data.tagline;copy.append(strong,desc);const trail=document.createElement('span');trail.className='jdplug-entry-trail';trail.textContent='›';row.append(copy,trail);return row;}
  function enabled(id){return id==='superpowers'?state.superpowers:state.github&&state.repoLoaded;}
  function catalogueItem(id){return makeEntry(catalogue[id],()=>openDetail(id),enabled(id)?'Enabled · '+catalogue[id].tagline:catalogue[id].tagline);}
  function renderDirectory(){
    const skills=tab==='skills';text('jdplugDirectoryTitle',skills?'Skills':'Plugins');
    text('jdplugDirectoryHint',skills?'Select a coding skill to guide this conversation.':'Work with developer tools in JepongDevxyz AI.');
    $('jdplugSearch').placeholder=skills?'Search skills':'Search plugins';
    const query=$('jdplugSearch').value.trim().toLowerCase();
    const installed=$('jdplugInstalled'),available=$('jdplugAvailable');
    installed.replaceChildren();available.replaceChildren();
    if(skills){
      for(const phase of phases){
        if(!(phase.name+' '+phase.description).toLowerCase().includes(query))continue;
        const data={name:phase.name,tagline:phase.description,className:'super',icon:'⚡'};
        const list=state.superpowers&&state.phase===phase.id?installed:available;
        list.append(makeEntry(data,()=>{state.phase=phase.id;persist();openDetail('superpowers');},phase.description));
      }
    }else{
      for(const id of ['github','superpowers']){
        const data=catalogue[id];
        if(!(data.name+' '+data.tagline+' '+data.description).toLowerCase().includes(query))continue;
        (enabled(id)?installed:available).append(catalogueItem(id));
      }
    }
    if(!installed.children.length){const empty=document.createElement('div');empty.className='jdplug-empty';empty.textContent=skills?'No active skill matches.':'No enabled plugins match.';installed.append(empty);}
    if(!available.children.length){const empty=document.createElement('div');empty.className='jdplug-empty';empty.textContent='Nothing else matches your search.';available.append(empty);}
    text('jdplugInstalledLabel',skills?'Active skill':'Enabled');
    text('jdplugAvailableLabel',skills?'Included skills':'Available');
    $('jdplugTabPlugins').classList.toggle('active',!skills);$('jdplugTabSkills').classList.toggle('active',skills);
  }
  function nav(next,id){if(view!==next||selected!==id)history.push({view,selected,tab});view=next;selected=id||selected;render();}
  function back(){if(history.length){const p=history.pop();view=p.view;selected=p.selected;tab=p.tab;render();}else if(view!=='directory'){view='directory';render();}else close();}
  function render(){
    $('jdplugDirectory').hidden=view!=='directory';$('jdplugDetail').hidden=view!=='detail';$('jdplugManageView').hidden=view!=='manage';
    $('jdplugTabs').hidden=view!=='directory';
    text('jdplugTitle',view==='directory'?(tab==='skills'?'Skills':'Plugins'):view==='detail'?catalogue[selected].name:'Settings');
    if(view==='directory'){renderDirectory();return;}
    if(view==='detail'){
      const c=catalogue[selected];text('jdplugHeroIcon',c.icon);
      $('jdplugHeroIcon').className='jdplug-entry-icon '+c.className;
      text('jdplugHeroTitle',c.name);text('jdplugHeroTagline',c.tagline);text('jdplugDescription',c.description);
      $('jdplugGithubSummary').hidden=selected!=='github';$('jdplugSkillSummary').hidden=selected!=='superpowers';
      if(selected==='github'){text('jdplugCurrentRepo',state.repoLoaded?state.repo:'No repository selected');
        text('jdplugRepoSummary',state.repoLoaded?(state.path?'Selected file: '+state.path:'Default branch: '+state.ref):'Open a public repository in Manage to browse its files.');}
      else renderSkillRows('jdplugDetailSkillList');
      text('jdplugDetailNote',selected==='github'?'Public repository explorer only. Account linking and repository write operations are not available here.':'These are built-in conversational skills, not the official Superpowers agent installation or a parallel execution environment.');
    }else{
      text('jdplugManageTitle',catalogue[selected].name+' settings');
      text('jdplugManageSubtitle',selected==='github'?'Choose a public repository, branch and file.':'Turn the coding workflow on or off and choose a skill.');
      $('jdplugGithubManage').hidden=selected!=='github';$('jdplugSuperManage').hidden=selected!=='superpowers';
      if(selected==='github'){text('jdplugRepoInput',state.repo);$('jdplugRepoInput').value=state.repo;selectedInfo();}
      else{$('jdplugSuperEnabled').checked=state.superpowers;$('jdplugPhase').value=state.phase;renderSkillRows('jdplugManageSkillList');}
    }
  }
  function renderSkillRows(id){const list=$(id);list.replaceChildren();
    for(const phase of phases){const row=makeEntry({name:phase.name,tagline:phase.description,className:'super',icon:'⚡'},()=>{
      state.phase=phase.id;state.superpowers=true;persist();$('jdplugPhase').value=phase.id;render();notice('Skill selected: '+phase.name);
    },phase.description+(state.superpowers&&state.phase===phase.id?' · Active':''));list.append(row);}
  }
  function openDetail(id){nav('detail',id);}
  function openManage(){nav('manage',selected);}
  function statusForChat(){text('jdplugSelected',state.github&&state.repoLoaded?'In chat: '+state.repo+(state.path?' / '+state.path:'')+(state.ref?' @ '+state.ref:''):'Not included in chat.');}
  function selectedInfo(){statusForChat();$('jdplugGitEnabled').checked=state.github&&state.repoLoaded;}
  async function call(action,extras={}){
    if(busy)return null;setBusy(true);notice('Reading GitHub…');
    try{const response=await fetch('/api/plugins',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({action,repo:state.repo},extras))});
      const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'GitHub request failed.');
      notice(action==='read'?'File loaded.':'GitHub '+action+' completed.');return data;
    }catch(error){notice(error.message||'GitHub unavailable.',true);return null;}
    finally{setBusy(false);}
  }
  function shortFileName(path){return String(path||'').split('/').pop()||'';}
  async function browse(path){
    const data=await call('list',{path,ref:state.ref});if(!data)return;
    state.directory=path;const area=$('jdplugResults');area.replaceChildren();text('jdplugLocation',state.repo+'/'+path);
    if(path)area.append(makeButton('‹ Parent folder',()=>browse(path.split('/').slice(0,-1).join('/'))));
    for(const entry of data.entries||[]){
      if(!['dir','file'].includes(entry.type))continue;
      const row=makeButton('',()=>entry.type==='dir'?browse(entry.path):read(entry.path),'jdplug-entry');
      const label=document.createElement('span');label.textContent=(entry.type==='dir'?'▣ ':'□ ')+entry.name;
      const hint=document.createElement('small');hint.textContent=entry.type==='dir'?'›':String(entry.size||0)+' B';
      row.append(label,hint);area.append(row);
    }
    if(!area.children.length)area.textContent='No files in this folder.';
  }
  async function read(path){const data=await call('read',{path,ref:state.ref});if(!data)return;
    state.path=data.path;state.github=true;persist();$('jdplugGitEnabled').checked=true;
    text('jdplugPreview',String(data.content||'').slice(0,8000));$('jdplugPreview').hidden=false;statusForChat();
    notice('Read '+data.path+'. The AI will request this source again for chat.');
  }
  async function openRepo(){
    const input=$('jdplugRepoInput').value.trim();
    if(!/^(?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/.test(input)){notice('Enter a public repository URL or owner/repository.',true);return;}
    state.repo=input.replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
    state.repoLoaded=false;state.github=false;state.path='';state.ref='';state.directory='';
    $('jdplugGitEnabled').checked=false;$('jdplugPreview').hidden=true;statusForChat();
    const info=await call('repo');if(!info)return;state.repoLoaded=true;state.repo=info.repo;
    $('jdplugRepoInput').value=info.repo;persist();
    text('jdplugRepoDescription',[info.description,'Default branch: '+info.defaultBranch].filter(Boolean).join(' · '));
    const branchData=await call('branches');const select=$('jdplugBranch');select.replaceChildren();
    for(const item of branchData?.branches||[]){const option=document.createElement('option');option.value=item.name;option.textContent=item.name;select.append(option);}
    state.ref=info.defaultBranch;select.value=info.defaultBranch;
    await browse('');
  }
  async function prs(){if(!state.repoLoaded){notice('Open a repository first.',true);return;}
    const data=await call('prs');if(!data)return;const area=$('jdplugResults');area.replaceChildren();
    text('jdplugLocation','Open PRs · '+state.repo);area.append(makeButton('‹ Files',()=>browse(state.directory)));
    for(const pr of data.pullRequests||[]){const link=document.createElement('a');link.className='jdplug-entry';link.textContent='#'+pr.number+' '+pr.title;link.href=pr.url;link.target='_blank';link.rel='noopener noreferrer';area.append(link);}
    if(!(data.pullRequests||[]).length)area.append(document.createTextNode('No open pull requests.'));
  }
  function tryInChat(){
    let prompt='';
    if(selected==='github'){
      if(!state.repoLoaded){openManage();notice('Open a public GitHub repository before trying it in chat.',true);return;}
      state.github=true;prompt='Inspect the selected GitHub repository '+state.repo+(state.path?' and the file '+state.path:'')+'. Explain the source and suggest next steps based only on code you actually read.';
    }else{
      state.superpowers=true;
      const phase=phases.find(p=>p.id===state.phase)||phases[0];
      prompt='Use the Superpowers '+phase.name.toLowerCase()+' workflow for my coding task. First ask what project or bug I want help with if I have not provided it.';
    }
    persist();close();
    const input=$('userInput');
    if(input){input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));if(typeof window.autoResizeTextarea==='function')window.autoResizeTextarea(input);input.focus();}
  }
  function init(){
    if($('jdplugPanel'))return;
    const overlay=document.createElement('div');overlay.id='jdplugPanel';overlay.className='jdplug-overlay';overlay.innerHTML=PANEL_HTML;document.body.append(overlay);
    $('jdplugClose').addEventListener('click',close);$('jdplugBack').addEventListener('click',back);
    overlay.addEventListener('click',e=>{if(e.target===overlay)close();});
    overlay.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
    $('jdplugTabPlugins').addEventListener('click',()=>{tab='plugins';$('jdplugSearch').value='';render();});
    $('jdplugTabSkills').addEventListener('click',()=>{tab='skills';$('jdplugSearch').value='';render();});
    $('jdplugSearch').addEventListener('input',renderDirectory);
    $('jdplugManage').addEventListener('click',openManage);$('jdplugTry').addEventListener('click',tryInChat);
    $('jdplugLoadRepo').addEventListener('click',openRepo);
    $('jdplugRepoInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openRepo();}});
    $('jdplugPRs').addEventListener('click',prs);
    $('jdplugBranch').addEventListener('change',e=>{state.ref=e.target.value;state.path='';$('jdplugPreview').hidden=true;statusForChat();browse('');});
    $('jdplugGitEnabled').addEventListener('change',e=>{state.github=e.target.checked&&state.repoLoaded;if(e.target.checked&&!state.repoLoaded){e.target.checked=false;notice('Open a repository first.',true);}persist();statusForChat();});
    $('jdplugSuperEnabled').addEventListener('change',e=>{state.superpowers=e.target.checked;persist();notice(state.superpowers?'Superpowers workflow enabled.':'Superpowers workflow disabled.');});
    const phaseSelect=$('jdplugPhase');for(const phase of phases){const option=document.createElement('option');option.value=phase.id;option.textContent=phase.name;phaseSelect.append(option);}
    phaseSelect.addEventListener('change',e=>{state.phase=e.target.value;persist();renderSkillRows('jdplugManageSkillList');notice('Active skill: '+(phases.find(p=>p.id===state.phase)?.name||state.phase));});
  }
  function open(tabName){
    if(typeof window.closeComposerTools==='function')window.closeComposerTools();
    if(typeof window.closeSettingsModal==='function')window.closeSettingsModal();
    init();tab=tabName==='skills'?'skills':'plugins';view='directory';history.length=0;render();
    $('jdplugPanel').classList.add('open');$('jdplugClose').focus();
    if(!state.repo)try{state.repo=localStorage.getItem('jepong_plugin_public_repo')||'';}catch(_){}
    $('jdplugRepoInput').value=state.repo;
  }
  function close(){$('jdplugPanel')?.classList.remove('open');}
  window.JDPlugins=Object.freeze({open,close,contextForChat(){
    return {superpowers:{enabled:state.superpowers,phase:state.phase},github:{enabled:state.github&&state.repoLoaded,repo:state.repo,path:state.path,ref:state.ref}};
  }});
})();
