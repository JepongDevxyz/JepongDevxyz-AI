const PANEL_HTML="\n<section class=\"jdplug-dialog\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugTitle\">\n<header class=\"jdplug-header\"><button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugBack\" aria-label=\"Back\">‹</button><h2 id=\"jdplugTitle\">Plugins</h2><button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugClose\" aria-label=\"Close\">×</button></header>\n<div class=\"jdplug-top-tabs\" id=\"jdplugTabs\"><button type=\"button\" class=\"jdplug-top-tab active\" id=\"jdplugTabPlugins\">Plugins</button><button type=\"button\" class=\"jdplug-top-tab\" id=\"jdplugTabSkills\">Skills</button></div>\n<div class=\"jdplug-scroll\">\n<section class=\"jdplug-view\" id=\"jdplugDirectory\">\n<h3 class=\"jdplug-heading\" id=\"jdplugDirectoryTitle\">Plugins</h3>\n<p class=\"jdplug-subtitle\" id=\"jdplugDirectoryHint\">Work with JepongDevxyz AI across your favorite tools.</p>\n<label class=\"jdplug-search\"><span aria-hidden=\"true\">⌕</span><input id=\"jdplugSearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Search plugins\" aria-label=\"Search plugins and skills\"></label>\n<p class=\"jdplug-group jdplug-group-inline\" id=\"jdplugInstalledLabel\">Installed</p>\n<div class=\"jdplug-installed-strip\" id=\"jdplugInstalledStrip\" role=\"list\" aria-label=\"Installed plugins\"></div>\n<div class=\"jdplug-list jdplug-installed-fallback\" id=\"jdplugInstalled\" hidden></div>\n<p class=\"jdplug-group\" id=\"jdplugAvailableLabel\">Popular</p>\n<div class=\"jdplug-list\" id=\"jdplugAvailable\"></div>\n<p class=\"jdplug-directory-footer\">Install a plugin to use it in chat. Available tools are built for JepongDevxyz AI; other ChatGPT apps are not connected automatically.</p>\n</section>\n<section class=\"jdplug-view\" id=\"jdplugDetail\" hidden>\n<div class=\"jdplug-detail-header\">\n  <div class=\"jdplug-entry-icon jdplug-detail-icon\" id=\"jdplugHeroIcon\" aria-hidden=\"true\"></div>\n  <div class=\"jdplug-detail-title\"><h3 id=\"jdplugHeroTitle\"></h3><p id=\"jdplugHeroTagline\"></p></div>\n  <button type=\"button\" class=\"jdplug-icon-btn jdplug-detail-more\" id=\"jdplugDetailMore\" aria-label=\"Plugin actions\">⋯</button>\n  <button type=\"button\" class=\"jdplug-button primary jdplug-detail-try\" id=\"jdplugTry\">Install</button>\n  <div class=\"jdplug-entry-menu jdplug-detail-menu\" id=\"jdplugDetailMenu\" hidden>\n    <button type=\"button\" class=\"jdplug-menu-action\" id=\"jdplugDetailMenuManage\">Manage</button>\n    <button type=\"button\" class=\"jdplug-menu-action danger\" id=\"jdplugDetailMenuUninstall\">Uninstall</button>\n  </div>\n</div>\n<div class=\"jdplug-preview-stage\" id=\"jdplugPreviewStage\">\n  <button type=\"button\" class=\"jdplug-preview-message\" id=\"jdplugExampleOne\">Inspect the repository I selected <span aria-hidden=\"true\">➜</span></button>\n  <button type=\"button\" class=\"jdplug-preview-message\" id=\"jdplugExampleTwo\">Help me understand this code <span aria-hidden=\"true\">➜</span></button>\n</div>\n<div class=\"jdplug-hero-actions jdplug-detail-secondary\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugManage\" hidden>Manage</button></div>\n<p class=\"jdplug-description\" id=\"jdplugDescription\"></p>\n<div id=\"jdplugGithubSummary\"><p class=\"jdplug-section-label\">Repository</p><div class=\"jdplug-card\"><strong id=\"jdplugCurrentRepo\">No repository selected</strong><p id=\"jdplugRepoSummary\">Open and select a public repository to make its source available for this chat.</p></div></div>\n<div id=\"jdplugSkillSummary\" hidden><p class=\"jdplug-section-label\">Included coding skills</p><div class=\"jdplug-list\" id=\"jdplugDetailSkillList\"></div></div>\n<div class=\"jdplug-hint\" id=\"jdplugDetailNote\"></div>\n<p class=\"jdplug-section-label\">Information</p>\n<div class=\"jdplug-info\" id=\"jdplugInfo\">\n  <div><span>Capabilities</span><strong id=\"jdplugInfoCapability\">Read</strong></div>\n  <div><span>Developer</span><strong>JepongDevxyz AI</strong></div>\n  <div><span>Category</span><strong id=\"jdplugInfoCategory\">Developer tools</strong></div>\n  <div><span>Connection</span><strong id=\"jdplugInfoConnection\">Not connected</strong></div>\n  <div><span>Version</span><strong>1.0</strong></div>\n  <div><span>Source</span><strong id=\"jdplugInfoSource\">Built-in integration</strong></div>\n</div>\n</section>\n<section class=\"jdplug-view\" id=\"jdplugManageView\" hidden>\n<div class=\"jdplug-settings-top\"><strong>Settings</strong><button type=\"button\" class=\"jdplug-icon-btn\" id=\"jdplugSettingsClose\" aria-label=\"Back to plugin\">×</button></div>\n<div class=\"jdplug-settings-search\"><span aria-hidden=\"true\">⌕</span><input type=\"search\" id=\"jdplugSettingsSearch\" placeholder=\"Search settings\" aria-label=\"Search plugin settings\"></div>\n<div class=\"jdplug-settings-tabs\"><span>General</span><span>Notifications</span><span>Personalization</span></div>\n<div class=\"jdplug-settings-back\"><span aria-hidden=\"true\">‹</span> <span id=\"jdplugManageTitle\">GitHub</span></div>\n<p class=\"jdplug-subtitle\" id=\"jdplugManageSubtitle\"></p>\n<div id=\"jdplugGithubManage\">\n<div class=\"jdplug-card jdplug-account-card\">\n  <div id=\"jdplugGithubSignedOut\">\n    <strong>GitHub account</strong>\n    <p>Connect your GitHub account with the official OAuth web flow. The access token stays server-side in an encrypted HttpOnly session cookie.</p>\n    <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugConnectGithub\">Connect GitHub</button>\n  </div>\n  <div id=\"jdplugGithubSignedIn\" hidden>\n    <div class=\"jdplug-account-row\">\n      <img id=\"jdplugGithubAvatar\" class=\"jdplug-account-avatar\" alt=\"\" referrerpolicy=\"no-referrer\">\n      <div class=\"jdplug-account-copy\"><strong id=\"jdplugGithubLogin\">GitHub</strong><p id=\"jdplugGithubScopes\">Connected</p></div>\n    </div>\n    <div class=\"jdplug-row\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugRefreshRepos\">Refresh repositories</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugDisconnectGithub\">Disconnect</button></div>\n  </div>\n</div>\n<div class=\"jdplug-card\" id=\"jdplugAccountReposCard\" hidden>\n  <strong>Your repositories</strong><p>Select a repository from the connected account. Private repositories appear only when the OAuth app was granted repository scope.</p>\n  <select class=\"jdplug-select\" id=\"jdplugAccountRepos\" aria-label=\"Connected GitHub repositories\"></select>\n</div>\n<div class=\"jdplug-card\"><strong>GitHub repository</strong><p>Browse public repositories without signing in, or use your connected account for repositories it is authorized to access.</p>\n<label class=\"jdplug-field\" for=\"jdplugRepoInput\">Repository URL or owner/repository</label>\n<div class=\"jdplug-row\"><input class=\"jdplug-input\" id=\"jdplugRepoInput\" autocomplete=\"off\" spellcheck=\"false\" maxlength=\"210\" placeholder=\"owner/repository\"><button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugLoadRepo\">Open</button></div>\n<p id=\"jdplugRepoDescription\" class=\"jdplug-muted\"></p>\n<div class=\"jdplug-row\"><select class=\"jdplug-select\" id=\"jdplugBranch\" aria-label=\"GitHub branch\"></select><button type=\"button\" class=\"jdplug-button\" id=\"jdplugPRs\">Open PRs</button></div>\n<div class=\"jdplug-issue-actions\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugIssues\">Open issues</button><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCi\">CI runs</button></div>\n<p class=\"jdplug-muted\" id=\"jdplugLocation\"></p><div class=\"jdplug-file-list\" id=\"jdplugResults\" aria-label=\"Repository files\"></div>\n<pre class=\"jdplug-preview\" id=\"jdplugPreview\" hidden></pre>\n<div class=\"jdplug-row\"><label for=\"jdplugGitEnabled\">Use selected repository/file in chat</label><input type=\"checkbox\" id=\"jdplugGitEnabled\"></div>\n<p class=\"jdplug-muted\" id=\"jdplugSelected\">Not included in chat.</p>\n</div>\n<div class=\"jdplug-card\"><strong>Permissions</strong><p>The app only performs repository reads in this UI. OAuth authorization is handled by GitHub. Private repository visibility depends on the scopes you grant. This panel still does not commit, push, merge, delete, or modify repositories.</p></div>\n</div>\n<div id=\"jdplugSuperManage\" hidden>\n<div class=\"jdplug-card\"><strong>Superpowers workflow</strong><p>Enable structured coding guidance during coding conversations. This does not run a separate autonomous agent or install official ChatGPT skills.</p><div class=\"jdplug-row\"><label for=\"jdplugSuperEnabled\">Enable coding workflow</label><input type=\"checkbox\" id=\"jdplugSuperEnabled\"></div>\n<label class=\"jdplug-field\" for=\"jdplugPhase\">Active coding skill</label><select class=\"jdplug-select\" id=\"jdplugPhase\"></select></div>\n<p class=\"jdplug-section-label\">Included skills</p><div class=\"jdplug-list\" id=\"jdplugManageSkillList\"></div>\n<div class=\"jdplug-card\"><strong>Permissions</strong><p>Guidance in this chat only. Superpowers does not access files, run tests, create branches, or push commits without a separate working tool.</p></div>\n</div>\n<button type=\"button\" class=\"jdplug-button jdplug-danger jdplug-uninstall\" id=\"jdplugUninstall\" hidden>Uninstall plugin</button>\n<p class=\"jdplug-status\" id=\"jdplugStatus\" role=\"status\" aria-live=\"polite\"></p>\n</section>\n</div>\n<div class=\"jdplug-confirm\" id=\"jdplugConfirm\" hidden role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"jdplugConfirmTitle\">\n  <div class=\"jdplug-confirm-card\"><div class=\"jdplug-entry-icon\" id=\"jdplugConfirmIcon\" aria-hidden=\"true\"></div>\n    <h3 id=\"jdplugConfirmTitle\">Install plugin?</h3><p id=\"jdplugConfirmDescription\"></p>\n    <div class=\"jdplug-confirm-actions\"><button type=\"button\" class=\"jdplug-button\" id=\"jdplugCancelInstall\">Cancel</button>\n      <button type=\"button\" class=\"jdplug-button primary\" id=\"jdplugConfirmInstall\">Install</button></div>\n  </div>\n</div></section>";

/* Mobile Plugins + Skills marketplace for JepongDevxyz AI. GitHub uses an official OAuth web flow; Superpowers remains a built-in conversational workflow. */
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
    github:{name:'GitHub',tagline:'Connect your account and browse repositories',description:'Connect GitHub with the official OAuth web flow, browse repositories your account can access, inspect source files, branches and pull requests, and use selected source as chat context.',icon:'GH',className:'git'},
    superpowers:{name:'Superpowers',tagline:'Make your coding workflow more structured',description:'Built-in conversational coding skills for planning, implementation, debugging and review. Enable a workflow and choose its active phase before asking your coding question.',icon:'⚡',className:'super'}
  };
  const defaultState={repo:'',path:'',ref:'',directory:'',item:null,github:false,repoLoaded:false,superpowers:false,phase:'plan',installed:{github:false,superpowers:false},accountConnected:false,accountUser:null,accountScopes:[],accountRepos:[]};
  const state=Object.assign({},defaultState);
  let tab='plugins',view='directory',selected='github',busy=false,pendingPluginAction=null;
  const history=[];
  function text(id,value){const el=$(id);if(el)el.textContent=String(value||'');}
  function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({repo:state.repo,installed:{github:!!state.installed.github,superpowers:!!state.installed.superpowers},github:!!state.installed.github&&state.github,superpowers:!!state.installed.superpowers&&state.superpowers,phase:state.phase}));}catch(_){}}
  function restore(){try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(s&&typeof s==='object'){state.repo=typeof s.repo==='string'?s.repo:'';state.installed={github:s.installed?.github===true,superpowers:s.installed?.superpowers===true};state.github=false;state.superpowers=state.installed.superpowers&&s.superpowers===true;state.phase=phases.some(p=>p.id===s.phase)?s.phase:'plan';}}catch(_){}}
  restore();
  function notice(message,error=false){text('jdplugStatus',message);$('jdplugStatus')?.classList.toggle('error',!!error);}
  function setBusy(flag){busy=!!flag;document.querySelectorAll('#jdplugPanel .jdplug-button, #jdplugPanel .jdplug-entry').forEach(el=>{if(el.tagName==='BUTTON')el.disabled=busy;});}
  function makeButton(label,handler,className='jdplug-button'){const el=document.createElement('button');el.type='button';el.className=className;el.textContent=label;el.addEventListener('click',handler);return el;}
  function icon(className,character){
    const el=document.createElement('span');el.className='jdplug-entry-icon '+className;
    if(className==='git'){
      el.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" width="25" height="25"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.76-.24.76-.54v-2.05c-3.1.67-3.75-1.31-3.75-1.31-.5-1.28-1.24-1.62-1.24-1.62-1.01-.69.08-.67.08-.67 1.12.08 1.71 1.15 1.71 1.15.99 1.7 2.6 1.21 3.23.93.1-.72.39-1.21.7-1.49-2.48-.28-5.09-1.24-5.09-5.53 0-1.22.44-2.22 1.15-3-.12-.29-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.14a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.14 3.08-1.14.61 1.54.23 2.67.11 2.96.72.78 1.15 1.78 1.15 3 0 4.3-2.62 5.24-5.12 5.52.4.35.75 1.03.75 2.08v3.1c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg>';
    }else el.textContent=character;
    el.setAttribute('aria-hidden','true');return el;
  }
  function makeEntry(data,handler,small=''){const row=makeButton('',handler,'jdplug-entry');row.append(icon(data.className,data.icon));const copy=document.createElement('span');copy.className='jdplug-entry-copy';const strong=document.createElement('strong');strong.textContent=data.name;const desc=document.createElement('small');desc.textContent=small||data.tagline;copy.append(strong,desc);const trail=document.createElement('span');trail.className='jdplug-entry-trail';trail.textContent='›';row.append(copy,trail);return row;}
  function showPluginConfirmation(id,action='install'){
    if(!catalogue[id])return;
    if(action==='install'&&installed(id)){selected=id;openDetail(id);return;}
    if(action==='uninstall'&&!installed(id))return;
    pendingPluginAction={id,action};
    const c=catalogue[id];
    const uninstall=action==='uninstall';
    text('jdplugConfirmIcon',c.icon);
    $('jdplugConfirmIcon').className='jdplug-entry-icon '+c.className;
    text('jdplugConfirmTitle',(uninstall?'Uninstall ':'Install ')+c.name+'?');
    text('jdplugConfirmDescription',uninstall
      ? id==='github'
        ? 'This removes GitHub from this browser and disconnects the linked GitHub account. Repository context will stop being sent to chat.'
        : 'This removes the Superpowers coding workflow from this browser and disables its skills in chat.'
      : id==='github'
        ? 'Adds the GitHub repository browser to your installed plugins. You can inspect public repositories or connect your GitHub account separately. This step does not authorize account access.'
        : 'Adds the Superpowers coding workflow and makes its planning, implementation, debugging and review skills available in chat. No code is executed by installing.');
    text('jdplugConfirmInstall',uninstall?'Uninstall':'Install');
    $('jdplugConfirmInstall').disabled=false;
    $('jdplugConfirm').hidden=false;
    $('jdplugConfirmInstall').focus();
  }
  function hidePluginConfirmation(){
    pendingPluginAction=null;
    const confirm=$('jdplugConfirm');if(confirm)confirm.hidden=true;
  }
  async function confirmPluginAction(){
    if(!pendingPluginAction)return;
    const {id,action}=pendingPluginAction;
    const control=$('jdplugConfirmInstall');if(control)control.disabled=true;
    if(action==='uninstall'){
      if(id==='github'&&state.accountConnected){
        try{
          const result=await fetch('/api/github-oauth-session',{method:'DELETE',credentials:'same-origin',headers:{Accept:'application/json'}});
          if(!result.ok)throw new Error('Could not disconnect the GitHub account. Try again.');
        }catch(error){
          if(control)control.disabled=false;
          notice(error?.message||'Could not disconnect GitHub. Try again.',true);
          text('jdplugConfirmDescription','GitHub could not be disconnected. Check your connection and try Uninstall again.');
          return;
        }
      }
      state.installed[id]=false;
      if(id==='github'){
        state.github=false;state.repoLoaded=false;state.repo='';state.path='';state.ref='';state.directory='';state.item=null;
        state.accountConnected=false;state.accountUser=null;state.accountScopes=[];state.accountRepos=[];
        $('jdplugResults')?.replaceChildren();
        $('jdplugPreview').hidden=true;
        $('jdplugGitEnabled').checked=false;
      }else{state.superpowers=false;}
      persist();hidePluginConfirmation();view='directory';history.length=0;render();
      notice(catalogue[id].name+' uninstalled.');
      if(typeof window.showModernToast==='function')window.showModernToast(catalogue[id].name+' uninstalled');
      return;
    }
    state.installed[id]=true;
    if(id==='superpowers')state.superpowers=true;
    persist();hidePluginConfirmation();render();
    notice(catalogue[id].name+' installed. You can now use it in chat.');
    if(typeof window.showModernToast==='function')window.showModernToast(catalogue[id].name+' installed');
  }
  function installed(id){return state.installed?.[id]===true;}
  function enabled(id){return installed(id);}
  function catalogueItem(id){
    const container=document.createElement('div');container.className='jdplug-list-item';
    container.append(makeEntry(catalogue[id],()=>openDetail(id),catalogue[id].tagline));
    const trailing=makeButton(installed(id)?'⋯':'+',installed(id)?()=>{
      document.querySelectorAll('.jdplug-entry-menu').forEach(item=>{if(item!==menu)item.hidden=true;});
      menu.hidden=!menu.hidden;
    }:()=>showPluginConfirmation(id,'install'),'jdplug-entry-trailing');
    trailing.setAttribute('aria-label',(installed(id)?'Manage ':'Install ')+catalogue[id].name);
    const menu=document.createElement('div');menu.className='jdplug-entry-menu';menu.hidden=true;
    if(installed(id)){
      menu.append(makeButton('Manage',()=>{menu.hidden=true;selected=id;openManage();},'jdplug-menu-action'));
      menu.append(makeButton('Uninstall',()=>{menu.hidden=true;showPluginConfirmation(id,'uninstall');},'jdplug-menu-action danger'));
    }
    container.append(trailing,menu);
    return container;
  }
  function renderDirectory(){
    const skills=tab==='skills';text('jdplugDirectoryTitle',skills?'Skills':'Plugins');
    text('jdplugDirectoryHint',skills?'Choose a coding skill to guide the next chat.':'Work with JepongDevxyz AI across your favorite tools.');
    $('jdplugSearch').placeholder=skills?'Search skills':'Search plugins';
    const query=$('jdplugSearch').value.trim().toLowerCase();
    const installedList=$('jdplugInstalled'),strip=$('jdplugInstalledStrip'),available=$('jdplugAvailable');
    installedList.replaceChildren();strip.replaceChildren();available.replaceChildren();
    $('jdplugInstalledLabel').hidden=skills;$('jdplugInstalledStrip').hidden=skills;
    $('jdplugAvailableLabel').hidden=false;
    if(skills){
      for(const phase of phases){
        if(!(phase.name+' '+phase.description).toLowerCase().includes(query))continue;
        const data={name:phase.name,tagline:phase.description,className:'super',icon:'⚡'};
        const list=installed('superpowers')&&state.superpowers&&state.phase===phase.id?installedList:available;
        list.append(makeEntry(data,()=>{
          if(!installed('superpowers')){selected='superpowers';showPluginConfirmation('superpowers','install');return;}
          state.phase=phase.id;state.superpowers=true;persist();openDetail('superpowers');
        },phase.description));
      }
    }else{
      for(const id of ['github','superpowers']){
        const data=catalogue[id];
        if(!(data.name+' '+data.tagline+' '+data.description).toLowerCase().includes(query))continue;
        if(installed(id)){
          // Installed tools stay discoverable under Popular, with Manage in their overflow menu.
          installedList.append(catalogueItem(id));
          const chip=makeButton('',()=>openDetail(id),'jdplug-installed-chip');
          chip.append(icon(data.className,data.icon));
          const name=document.createElement('span');name.textContent=data.name;chip.append(name);
          chip.setAttribute('role','listitem');chip.setAttribute('aria-label','Open installed '+data.name);
          strip.append(chip);
        }
        available.append(catalogueItem(id));
      }
      if(!strip.children.length){
        const empty=document.createElement('p');empty.className='jdplug-installed-empty';
        empty.textContent=query?'No installed plugins match.':'Install a plugin to find it here.';
        strip.append(empty);
      }
    }
    if(!installedList.children.length){
      const empty=document.createElement('div');empty.className='jdplug-empty';
      empty.textContent=skills?'No active skill matches.':'No plugins installed yet.';
      installedList.append(empty);
    }
    if(!available.children.length){
      const empty=document.createElement('div');empty.className='jdplug-empty';
      empty.textContent='Nothing else matches your search.';available.append(empty);
    }
    text('jdplugInstalledLabel',skills?'Active skill':'Installed');
    text('jdplugAvailableLabel',skills?'Skills':'Popular');
    $('jdplugTabPlugins').classList.toggle('active',!skills);$('jdplugTabSkills').classList.toggle('active',skills);
  }
  function nav(next,id){if(view!==next||selected!==id)history.push({view,selected,tab});view=next;selected=id||selected;render();}
  function back(){if(pendingPluginAction){hidePluginConfirmation();return;}if(history.length){const p=history.pop();view=p.view;selected=p.selected;tab=p.tab;render();}else if(view!=='directory'){view='directory';render();}else close();}
  function render(){
    $('jdplugDirectory').hidden=view!=='directory';$('jdplugDetail').hidden=view!=='detail';$('jdplugManageView').hidden=view!=='manage';
    $('jdplugTabs').hidden=view!=='directory';
    text('jdplugTitle',view==='directory'?(tab==='skills'?'Skills':'Plugins'):view==='detail'?catalogue[selected].name:'Settings');
    if(view==='directory'){renderDirectory();return;}
    if(view==='detail'){
      const c=catalogue[selected];
      const existingIcon=$('jdplugHeroIcon');existingIcon.replaceChildren();
      const renderIcon=icon(c.className,c.icon);
      while(renderIcon.firstChild)existingIcon.append(renderIcon.firstChild);
      if(!existingIcon.children.length)existingIcon.textContent=c.icon;
      existingIcon.className='jdplug-entry-icon jdplug-detail-icon '+c.className;
      text('jdplugHeroTitle',c.name);text('jdplugHeroTagline',c.tagline);
      text('jdplugDescription',selected==='github'
        ? 'Read the repositories, pull requests, and source files available to your connected GitHub account. Select a repository and file to use its actual content in chat.'
        : 'Use a structured coding workflow for brainstorming, implementation, debugging, and review. The guidance adapts to your chosen skill, with clear verification and no unverified execution claims.');
      $('jdplugDetailMenu').hidden=true;
      text('jdplugExampleOne',selected==='github'?'Explain how authentication works in my repository ↗':'I have a project idea. Help me plan it ↗');
      text('jdplugExampleTwo',selected==='github'?'Review this source file with me ↗':'Help me diagnose a bug in my code ↗');
      text('jdplugInfoCapability',selected==='github'?'Interactive, Read':'Interactive, Guidance');
      text('jdplugInfoCategory','Developer tools');
      text('jdplugInfoConnection',selected==='github'?(state.accountConnected?'GitHub connected':'GitHub account optional'):(state.superpowers?'Enabled':'Not installed'));
      text('jdplugInfoSource',selected==='github'?'GitHub OAuth / REST API':'Built-in coding workflow');
      $('jdplugGithubSummary').hidden=selected!=='github';$('jdplugSkillSummary').hidden=selected!=='superpowers';
      const isInstalled=installed(selected);
      $('jdplugTry').textContent=isInstalled?'Try in chat':'Install';
      $('jdplugManage').hidden=!isInstalled;
      $('jdplugDetailMore').hidden=!isInstalled;
      $('jdplugDetailMenu').hidden=true;
      $('jdplugUninstall').hidden=!isInstalled;
      if(selected==='github'){text('jdplugCurrentRepo',state.repoLoaded?state.repo:'No repository selected');
        text('jdplugRepoSummary',state.repoLoaded?(state.item?'Selected '+state.item.kind+' #'+state.item.id:state.path?'Selected file: '+state.path:'Default branch: '+state.ref):'Open a repository in Manage to browse its actual source.');}
      else renderSkillRows('jdplugDetailSkillList');
      text('jdplugDetailNote',selected==='github'?(state.accountConnected?'GitHub account connected through OAuth. Repository browsing is read-only in JepongDevxyz AI.':'You can browse public repositories immediately or connect GitHub through OAuth for account-authorized repositories.'):'These are built-in conversational skills, not the official Superpowers agent installation or a parallel execution environment.');
    }else{
      text('jdplugManageTitle',catalogue[selected].name);
      text('jdplugManageSubtitle',selected==='github'?'Connect GitHub or choose a repository, branch and file.':'Turn the coding workflow on or off and choose a skill.');
      $('jdplugGithubManage').hidden=selected!=='github';$('jdplugSuperManage').hidden=selected!=='superpowers';
      $('jdplugUninstall').hidden=!installed(selected);
      if(selected==='github'){$('jdplugRepoInput').value=state.repo;selectedInfo();renderGithubAccount();}
      else{$('jdplugSuperEnabled').checked=state.superpowers;$('jdplugPhase').value=state.phase;renderSkillRows('jdplugManageSkillList');}
    }
  }
  function renderSkillRows(id){const list=$(id);list.replaceChildren();
    for(const phase of phases){const row=makeEntry({name:phase.name,tagline:phase.description,className:'super',icon:'⚡'},()=>{
      if(!installed('superpowers')){selected='superpowers';showPluginConfirmation('superpowers','install');return;}
      state.phase=phase.id;state.superpowers=true;persist();$('jdplugPhase').value=phase.id;render();notice('Skill selected: '+phase.name);
    },phase.description+(installed('superpowers')&&state.superpowers&&state.phase===phase.id?' · Active':''));list.append(row);}
  }
  function openDetail(id){nav('detail',id);}
  function openManage(){if(!installed(selected)){showPluginConfirmation(selected,'install');return;}
    $('jdplugDetailMenu').hidden=true;nav('manage',selected);
    $('jdplugSettingsSearch').value='';
  }
  function statusForChat(){text('jdplugSelected',installed('github')&&state.github&&state.repoLoaded
    ?'In chat: '+state.repo+(state.item?' / '+state.item.kind+' #'+state.item.id:state.path?' / '+state.path:'')+(state.ref?' @ '+state.ref:'')
    :'Not included in chat.');}
  function selectedInfo(){statusForChat();$('jdplugGitEnabled').checked=installed('github')&&state.github&&state.repoLoaded;}
  function renderGithubAccount(){
    const signedOut=$('jdplugGithubSignedOut'), signedIn=$('jdplugGithubSignedIn'), reposCard=$('jdplugAccountReposCard');
    if(!signedOut||!signedIn)return;
    if(!installed('github')){signedOut.hidden=true;signedIn.hidden=true;if(reposCard)reposCard.hidden=true;return;}
    signedOut.hidden=!!state.accountConnected;signedIn.hidden=!state.accountConnected;
    if(reposCard)reposCard.hidden=!state.accountConnected;
    if(state.accountConnected&&state.accountUser){
      text('jdplugGithubLogin',state.accountUser.login||'GitHub');
      text('jdplugGithubScopes',state.accountScopes.length?'Scopes: '+state.accountScopes.join(', '):'Connected with account identity access');
      const avatar=$('jdplugGithubAvatar');if(avatar){avatar.src=state.accountUser.avatar||'';avatar.alt=(state.accountUser.login||'GitHub')+' avatar';}
    }
    const select=$('jdplugAccountRepos');
    if(select&&state.accountConnected){
      select.replaceChildren();
      const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=state.accountRepos.length?'Choose repository…':'No repositories loaded';select.append(placeholder);
      for(const item of state.accountRepos){
        const option=document.createElement('option');option.value=item.repo;option.textContent=(item.private?'🔒 ':'')+item.repo;select.append(option);
      }
      if(state.repo)select.value=state.repo;
    }
  }
  async function refreshGithubSession({loadRepos=false}={}){
    try{
      const response=await fetch('/api/github-oauth-session',{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'}});
      const data=await response.json().catch(()=>({connected:false}));
      state.accountConnected=!!(response.ok&&data.connected);
      state.accountUser=state.accountConnected?(data.user||null):null;
      state.accountScopes=state.accountConnected&&Array.isArray(data.scopes)?data.scopes:[];
      if(!state.accountConnected)state.accountRepos=[];
      renderGithubAccount();renderDirectory();
      if(state.accountConnected&&loadRepos)await loadAccountRepos();
      return state.accountConnected;
    }catch(_){state.accountConnected=false;state.accountUser=null;state.accountScopes=[];state.accountRepos=[];renderGithubAccount();return false;}
  }
  function connectGithub(){
    if(!installed('github')){showPluginConfirmation('github','install');return;}
    const returnTo=location.pathname+location.search+location.hash;
    location.href='/api/github-oauth-start?return_to='+encodeURIComponent(returnTo);
  }
  async function disconnectGithub(){
    setBusy(true);notice('Disconnecting GitHub…');
    try{
      await fetch('/api/github-oauth-session',{method:'DELETE',credentials:'same-origin',headers:{Accept:'application/json'}});
      state.accountConnected=false;state.accountUser=null;state.accountScopes=[];state.accountRepos=[];state.github=false;persist();renderGithubAccount();renderDirectory();statusForChat();notice('GitHub disconnected.');
    }catch(_){notice('Could not disconnect GitHub.',true);}
    finally{setBusy(false);}
  }
  async function loadAccountRepos(){
    if(!installed('github')){showPluginConfirmation('github','install');return;}
    if(!state.accountConnected){notice('Connect GitHub first.',true);return;}
    const data=await call('repos');if(!data)return;
    state.accountRepos=Array.isArray(data.repositories)?data.repositories:[];
    renderGithubAccount();
    notice(state.accountRepos.length+' repositories loaded.');
  }
  async function call(action,extras={}){
    if(!installed('github')){notice('Install GitHub before using its tools.',true);return null;}
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
    state.path=data.path;state.item=null;state.github=true;persist();$('jdplugGitEnabled').checked=true;
    text('jdplugPreview',String(data.content||'').slice(0,8000));$('jdplugPreview').hidden=false;statusForChat();
    notice('Read '+data.path+'. The AI will request this source again for chat.');
  }
  async function openRepo(){
    if(!installed('github')){showPluginConfirmation('github','install');return;}
    const input=$('jdplugRepoInput').value.trim();
    if(!/^(?:https:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/.test(input)){notice('Enter a public repository URL or owner/repository.',true);return;}
    state.repo=input.replace(/^https:\/\/github\.com\//,'').replace(/\/$/,'');
    state.repoLoaded=false;state.github=false;state.path='';state.ref='';state.directory='';state.item=null;
    $('jdplugGitEnabled').checked=false;$('jdplugPreview').hidden=true;statusForChat();
    const info=await call('repo');if(!info)return;state.repoLoaded=true;state.repo=info.repo;
    $('jdplugRepoInput').value=info.repo;persist();
    text('jdplugRepoDescription',[info.description,'Default branch: '+info.defaultBranch].filter(Boolean).join(' · '));
    const branchData=await call('branches');const select=$('jdplugBranch');select.replaceChildren();
    for(const item of branchData?.branches||[]){const option=document.createElement('option');option.value=item.name;option.textContent=item.name;select.append(option);}
    state.ref=info.defaultBranch;select.value=info.defaultBranch;
    await browse('');
  }
  async function showGitHubItems(kind){
    if(!state.repoLoaded){notice('Open a repository first.',true);return;}
    if(!['prs','issues','ci'].includes(kind))return;
    const data=await call(kind);if(!data)return;
    const area=$('jdplugResults');area.replaceChildren();
    const label=kind==='prs'?'Pull requests':kind==='issues'?'Open issues':'CI runs';
    text('jdplugLocation',label+' · '+state.repo);
    area.append(makeButton('‹ Files',()=>browse(state.directory),'jdplug-entry'));
    const items=kind==='prs'?data.pullRequests||[]:kind==='issues'?data.issues||[]:data.runs||[];
    for(const item of items){
      const row=document.createElement('div');row.className='jdplug-item-row';
      const labelLink=document.createElement('a');labelLink.className='jdplug-item-link';
      labelLink.textContent=kind==='ci'?(item.name+' — '+(item.conclusion||item.status||'unknown')):'#'+item.number+' '+item.title;
      labelLink.href=item.url;labelLink.target='_blank';labelLink.rel='noopener noreferrer';
      const use=makeButton('Use in chat',()=>{
        state.item={kind:kind==='prs'?'pr':kind==='issues'?'issue':'ci',id:kind==='ci'?item.id:item.number};
        state.path='';state.github=true;persist();
        $('jdplugGitEnabled').checked=true;
        statusForChat();
        notice('Selected '+state.item.kind+' #'+state.item.id+'. Try in chat will load this exact item.');
      },'jdplug-button jdplug-use-item');
      row.append(labelLink,use);area.append(row);
    }
    if(!items.length){
      const empty=document.createElement('p');empty.className='jdplug-empty';
      empty.textContent='No '+label.toLowerCase()+' returned by GitHub.';area.append(empty);
    }
  }
  async function prs(){return showGitHubItems('prs');}
  function tryInChat(example=0){
    if(!installed(selected)){showPluginConfirmation(selected,'install');return;}
    let prompt='';
    if(selected==='github'){
      if(!state.repoLoaded&&!state.accountConnected){
        openManage();
        notice('Connect GitHub or open a public repository to use this plugin in chat.',true);
        return;
      }
      state.github=true;
      if(!state.repoLoaded){
        prompt='Show me the GitHub repositories my connected account can access and help me choose one to inspect.';
        persist();close();
        const input=$('userInput');
        if(input){input.value=prompt;input.dispatchEvent(new Event('input',{bubbles:true}));if(typeof window.autoResizeTextarea==='function')window.autoResizeTextarea(input);input.focus();}
        return;
      }
      const source=state.repo+(state.item?' / '+state.item.kind+' #'+state.item.id:state.path?' / '+state.path:'');
      prompt=state.item
        ? 'Summarize the actual GitHub '+state.item.kind+' #'+state.item.id+' in '+state.repo+'. Explain the evidence, current status, and concrete next steps.'
        : example===1
        ? 'Explain how authentication works in '+source+'. Only use the repository source you actually read; request the relevant file if needed.'
        : example===2
          ? 'Review the selected source in '+source+'. Identify concrete bugs and improvements based on the actual content.'
          : 'Inspect the selected GitHub repository '+state.repo+(state.path?' and the file '+state.path:'')+'. Explain the source and suggest next steps based only on code you actually read.';
    }else{
      state.superpowers=true;
      if(example===1)state.phase='plan';
      else if(example===2)state.phase='debug';
      const phase=phases.find(p=>p.id===state.phase)||phases[0];
      prompt=example===1?'I have a project idea. Use the Superpowers brainstorming and planning workflow to help me design it.'
        :example===2?'Help me diagnose a bug in my code. Ask for the relevant error and source, then use a systematic debugging workflow.'
        :'Use the Superpowers '+phase.name.toLowerCase()+' workflow for my coding task. First ask what project or bug I want help with if I have not provided it.';
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
    $('jdplugManage').addEventListener('click',openManage);
    $('jdplugTry').addEventListener('click',()=>tryInChat());
    $('jdplugExampleOne').addEventListener('click',()=>tryInChat(1));
    $('jdplugExampleTwo').addEventListener('click',()=>tryInChat(2));
    $('jdplugDetailMore').addEventListener('click',()=>{$('jdplugDetailMenu').hidden=!$('jdplugDetailMenu').hidden;});
    $('jdplugDetailMenuManage').addEventListener('click',openManage);
    $('jdplugDetailMenuUninstall').addEventListener('click',()=>{$('jdplugDetailMenu').hidden=true;showPluginConfirmation(selected,'uninstall');});
    $('jdplugSettingsClose').addEventListener('click',()=>{view='detail';render();});
    $('jdplugSettingsSearch').addEventListener('input',e=>{
      const term=e.target.value.trim().toLowerCase();
      let matches=0;
      document.querySelectorAll('#jdplugManageView .jdplug-card').forEach(card=>{
        const match=!term||card.textContent.toLowerCase().includes(term);
        card.hidden=!match;if(match)matches++;
      });
      if(term&&!matches)notice('No plugin settings match your search.');
      else notice('');
    });
    $('jdplugUninstall').addEventListener('click',()=>showPluginConfirmation(selected,'uninstall'));
    $('jdplugCancelInstall').addEventListener('click',hidePluginConfirmation);
    $('jdplugConfirmInstall').addEventListener('click',confirmPluginAction);
    $('jdplugConnectGithub').addEventListener('click',connectGithub);
    $('jdplugDisconnectGithub').addEventListener('click',disconnectGithub);
    $('jdplugRefreshRepos').addEventListener('click',loadAccountRepos);
    $('jdplugAccountRepos').addEventListener('change',e=>{if(e.target.value){$('jdplugRepoInput').value=e.target.value;openRepo();}});
    $('jdplugLoadRepo').addEventListener('click',openRepo);
    $('jdplugRepoInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();openRepo();}});
    $('jdplugPRs').addEventListener('click',prs);
    $('jdplugIssues').addEventListener('click',()=>showGitHubItems('issues'));
    $('jdplugCi').addEventListener('click',()=>showGitHubItems('ci'));
    $('jdplugBranch').addEventListener('change',e=>{state.ref=e.target.value;state.path='';state.item=null;$('jdplugPreview').hidden=true;statusForChat();browse('');});
    $('jdplugGitEnabled').addEventListener('change',e=>{state.github=installed('github')&&e.target.checked&&state.repoLoaded;if(e.target.checked&&(!installed('github')||!state.repoLoaded)){e.target.checked=false;notice(installed('github')?'Open a repository first.':'Install GitHub first.',true);}persist();statusForChat();});
    $('jdplugSuperEnabled').addEventListener('change',e=>{if(!installed('superpowers')){e.target.checked=false;showPluginConfirmation('superpowers','install');return;}state.superpowers=e.target.checked;persist();notice(state.superpowers?'Superpowers workflow enabled.':'Superpowers workflow disabled.');});
    const phaseSelect=$('jdplugPhase');for(const phase of phases){const option=document.createElement('option');option.value=phase.id;option.textContent=phase.name;phaseSelect.append(option);}
    phaseSelect.addEventListener('change',e=>{state.phase=e.target.value;persist();renderSkillRows('jdplugManageSkillList');notice('Active skill: '+(phases.find(p=>p.id===state.phase)?.name||state.phase));});
  }
  function open(tabName){
    if(typeof window.closeComposerTools==='function')window.closeComposerTools();
    if(typeof window.closeSettingsModal==='function')window.closeSettingsModal();
    init();tab=tabName==='skills'?'skills':'plugins';view='directory';history.length=0;render();
    $('jdplugPanel').classList.add('open');$('jdplugClose').focus();
    refreshGithubSession({loadRepos:false});
    if(!state.repo)try{state.repo=localStorage.getItem('jepong_plugin_public_repo')||'';}catch(_){}
    $('jdplugRepoInput').value=state.repo;
  }
  function close(){hidePluginConfirmation();$('jdplugPanel')?.classList.remove('open');}
  window.JDPlugins=Object.freeze({open,close,contextForChat(){
    return {superpowers:{enabled:installed('superpowers')&&state.superpowers,phase:state.phase},github:{enabled:installed('github')&&state.github&&(state.repoLoaded||state.accountConnected),repo:state.repoLoaded?state.repo:'',path:state.repoLoaded&&!state.item?state.path:'',ref:state.ref,item:state.repoLoaded&&state.item?{kind:state.item.kind,id:state.item.id}:null}};
  }});

  // Complete the OAuth round trip without leaving stale query parameters in the chat URL.
  try{
    const params=new URLSearchParams(location.search);
    const githubResult=params.get('github');
    const githubError=params.get('github_error')||'GitHub authorization failed.';
    if(githubResult==='connected'||githubResult==='error'){
      setTimeout(async()=>{
        open('plugins');selected='github';view='manage';render();
        await refreshGithubSession({loadRepos:githubResult==='connected'});
        if(githubResult==='connected')notice('GitHub account connected.');
        else notice(githubError,true);
      },0);
      params.delete('github');params.delete('github_error');
      const clean=location.pathname+(params.toString()?'?'+params.toString():'')+location.hash;
      window.history.replaceState(window.history.state,'',clean);
    }
  }catch(_){}
})();
