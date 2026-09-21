// ChatGPT subscription connection lives in Settings, not the model picker.
(() => {
  'use strict';
  const get=id=>document.getElementById(id);
  let state={available:false,connected:false},pollTimer=null,waiting=false;
  let sheet,message,connect,disconnect,codeBox,workTab,settingsRow,accountIdField,retryStatus;
  const token=async()=>typeof window.JDCloudAuthToken==='function'
    ? await window.JDCloudAuthToken().catch(()=>'') : '';
  const request=async(method='GET',action)=>{
    const bearer=await token();
    const opts={method,credentials:'same-origin',cache:'no-store',
      headers:{...(bearer?{Authorization:'Bearer '+bearer}:{}),
        ...(action?{'Content-Type':'application/json'}:{})}};
    if(action)opts.body=JSON.stringify({action});
    const res=await fetch('/api/codex-account',opts);
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw Error(data.error||'ChatGPT account service is unavailable.');
    return data;
  };
  const show=msg=>{if(message)message.textContent=msg;};
  const stopPoll=()=>{if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}};
  function refreshUI(){
    const ready=state.connected===true&&state.authMode==='chatgpt'
      &&state.codexEnabled===true&&state.runnerReady===true;
    const tabs=get('jdChatWorkTabs');if(tabs)tabs.hidden=!ready;
    if(workTab)workTab.hidden=!ready;
    if(disconnect)disconnect.hidden=!state.connected;
    if(accountIdField){
      const showId=state.reasonCode==='ACCOUNT_NOT_ENROLLED' &&
        /^[a-f0-9-]{36}$/i.test(String(state.accountId||''));
      accountIdField.hidden=!showId;
      if(showId)accountIdField.textContent=state.accountId;
    }
    if(connect){
      const needsAppLogin=state.requiresAccount===true;
      connect.disabled=ready||(!needsAppLogin&&!state.available);
      connect.textContent=ready?'ChatGPT connected':needsAppLogin?'Sign in to JepongDevxyz AI':
        state.available?'Connect ChatGPT':'ChatGPT connection unavailable';
    }
    for(const link of document.querySelectorAll('a[href="/codex.html"]')){
      link.hidden=!ready;
      if(!ready)link.setAttribute('aria-hidden','true');
      else link.removeAttribute('aria-hidden');
    }
    if(settingsRow){
      const sub=settingsRow.querySelector('small');
      if(sub)sub.textContent=ready?'Connected · Work is available':'Connect your ChatGPT account';
    }
    if(ready){waiting=false;stopPoll();if(codeBox)codeBox.hidden=true;}
    show(ready?'ChatGPT connected'+(state.planType?' · '+state.planType:'')+'. Work is available.':
      waiting?'Complete authorization on the official ChatGPT page. Checking connection…':
      state.requiresAccount?'Sign in to your JepongDevxyz AI account to keep your Codex session private. GitHub is not required.':
      state.available?'Connect ChatGPT to unlock Work. GitHub is optional until you open a repository.':
      ({
        SANDBOX_DISABLED:'Codex sandbox is disabled in Production. Enable CODEX_MULTIUSER_SANDBOX_ENABLED in Production.',
        SIGNING_SECRET_MISSING:'The Production Codex signing secret is missing or too short. Configure CODEX_RUNNER_SHARED_SECRET privately.',
        ACCOUNT_ALLOWLIST_EMPTY:'CODEX_ALLOWED_ACCOUNT_IDS is missing or contains no valid app-account UUID in Production. GitHub numeric IDs do not work here.',
        ACCOUNT_NOT_ENROLLED:'Your app account is signed in but is not in CODEX_ALLOWED_ACCOUNT_IDS. Copy your app account ID below and add it in Vercel Production. Do not share it in chat.',
        WORKSPACE_SERVICE_UNAVAILABLE:'Your account is enrolled, but the Codex sandbox service could not be reached. This is a server-side problem, not a ChatGPT password problem.',
        STATUS_REQUEST_FAILED:'The connection check failed. Retry the status check; do not change your credentials.',
        ACCOUNT_VERIFICATION_FAILED:'Your app account could not be verified. Sign in again if your app session has expired.'
      })[state.reasonCode]||'ChatGPT connection is not available yet. Tap Retry status to check the current server reason.');
  }
  async function refresh(){
    try{state=await request();}catch(_){state={available:false,connected:false,reasonCode:'STATUS_REQUEST_FAILED'};}
    refreshUI();
  }
  function poll(){
    stopPoll();
    pollTimer=setTimeout(async()=>{await refresh();if(waiting&&!state.connected&&state.available)poll();},3500);
  }
  function create(tag,cls,txt){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(txt)node.textContent=txt;
    return node;
  }
  async function connectAccount(){
    const bearer=await token();
    if(!bearer){
      show('Sign in to your JepongDevxyz AI account first. You can use email or Google; GitHub is not required.');
      sheet.hidden=true;
      const home=get('settingsModal');home?.classList.remove('open');
      if(typeof window.openAccountModal==='function')window.openAccountModal();
      return;
    }
    connect.disabled=true;
    try{
      const data=await request('POST','connect');
      if(data.connected){await refresh();return;}
      const url=new URL(String(data.verificationUrl||''));
      if(url.protocol!=='https:'||url.hostname!=='auth.openai.com'||
        !['/codex/device','/codex/device/'].includes(url.pathname)||
        !/^[A-Z0-9-]{4,32}$/i.test(String(data.userCode||'')))
        throw Error('Unsupported ChatGPT sign-in response.');
      codeBox.replaceChildren();
      codeBox.append(create('p','', 'Open the official ChatGPT sign-in page, then enter this code:'),
        create('strong','jd-codex-device-code',data.userCode));
      const link=create('a','jd-codex-connect','Open official ChatGPT sign-in');
      link.href=url.href;link.rel='noopener noreferrer';link.target='_blank';
      codeBox.append(link);codeBox.hidden=false;
      waiting=true;refreshUI();poll();
    }catch(e){waiting=false;show(e.message||'Unable to connect ChatGPT.');}
    finally{connect.disabled=state.connected||(!state.requiresAccount&&!state.available);}
  }
  async function disconnectAccount(){
    disconnect.disabled=true;
    try{await request('POST','disconnect');waiting=false;stopPoll();await refresh();}
    catch(e){show(e.message||'Unable to disconnect ChatGPT.');}
    finally{disconnect.disabled=false;}
  }
  function init(){
    const header=document.querySelector('.header-top')||document.querySelector('.header');
    if(header&&!get('jdChatWorkTabs')){
      const tabs=create('nav','jd-codex-tabs');tabs.id='jdChatWorkTabs';
      tabs.setAttribute('aria-label','Conversation mode');tabs.hidden=true;
      const chat=create('span','jd-codex-tab jd-codex-current','Chat');
      chat.setAttribute('aria-current','page');
      workTab=create('a','jd-codex-tab','Work');workTab.href='/codex.html';workTab.hidden=true;
      tabs.append(chat,workTab);header.append(tabs);
    }
    const home=get('settingsModal');
    const group=home?.querySelector('.settings-home-scroll .settings-card-group');
    const panel=home?.querySelector('.settings-home');
    if(!group||!panel)return;
    settingsRow=create('button','settings-nav-row');settingsRow.type='button';settingsRow.id='jdCodexSettingsRow';
    const icon=create('i');icon.dataset.lucide='bot';
    const middle=create('span');middle.append(create('strong','','ChatGPT & Codex'),
      create('small','','Connect your ChatGPT account'));
    const chevron=create('i');chevron.dataset.lucide='chevron-right';
    settingsRow.append(icon,middle,chevron);group.append(settingsRow);
    sheet=create('section','jd-codex-settings-sheet');sheet.id='jdCodexSettingsSheet';sheet.hidden=true;
    sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','ChatGPT and Codex settings');
    const head=create('div','jd-codex-sheet-header');
    const back=create('button','jd-codex-back','‹');back.type='button';
    back.setAttribute('aria-label','Back to Settings');
    const title=create('strong','','ChatGPT & Codex');head.append(back,title);
    const body=create('div','jd-codex-sheet-body');
    const card=create('div','jd-codex-account-card');
    card.append(create('h3','','ChatGPT account'),
      create('p','','Connect your own account to access Codex Work. Your other chat models are unchanged.'));
    connect=create('button','jd-codex-connect','Connect ChatGPT');connect.type='button';
    message=create('p','jd-codex-message');message.setAttribute('role','status');
    codeBox=create('div','jd-codex-device');codeBox.hidden=true;
    disconnect=create('button','jd-codex-connect','Disconnect ChatGPT');
    disconnect.type='button';disconnect.hidden=true;
    accountIdField=create('code','jd-codex-account-id');accountIdField.hidden=true;
    retryStatus=create('button','jd-codex-retry','Retry connection status');
    retryStatus.type='button';retryStatus.addEventListener('click',refresh);
    card.append(connect,message,accountIdField,retryStatus,codeBox,disconnect);
    const work=create('div','jd-codex-account-card');
    work.append(create('h3','','Work · Codex'),
      create('p','','Codex settings are applied automatically after you connect. GitHub is only needed when working with a repository.'));
    const openWork=create('a','jd-codex-connect','Open Work');openWork.id='jdCodexOpenWork';
    openWork.href='/codex.html';openWork.hidden=true;work.append(openWork);
    body.append(card,work);sheet.append(head,body);panel.append(sheet);
    const close=()=>{sheet.hidden=true;settingsRow.focus();};
    back.addEventListener('click',close);
    settingsRow.addEventListener('click',()=>{sheet.hidden=false;refresh();back.focus();});
    connect.addEventListener('click',connectAccount);
    disconnect.addEventListener('click',disconnectAccount);
    if(typeof window.lucide?.createIcons==='function')window.lucide.createIcons();
    refresh();
    addEventListener('focus',refresh);
    addEventListener('jd:account-changed',()=>{waiting=false;stopPoll();refresh();});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
