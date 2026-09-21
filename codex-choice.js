// Codex subscription is a separate authenticated coding-agent mode, NOT a
// regular provider/model ID. Never place it in the generic /api/chat route.
// A browser flag, GitHub login, or ChatGPT identity-only sign-in is not proof
// of an authorized Codex subscription.
(() => {
  'use strict';
  let status={connected:false,available:false};
  let buttons,option,accountMessage;
  const lookup=id=>document.getElementById(id);
  const label=(message)=>{
    if(accountMessage) accountMessage.textContent=message;
  };
  function sync(){
    const eligible=status.connected===true && status.authMode==='chatgpt'
      && status.codexEnabled===true && status.runnerReady===true;
    if(buttons?.work) buttons.work.hidden=!eligible;
    if(option) option.hidden=!eligible;
    for(const anchor of document.querySelectorAll('a[href="/codex.html"]')) {
      anchor.hidden=!eligible;
      if(!eligible) anchor.setAttribute('aria-hidden','true');
      else anchor.removeAttribute('aria-hidden');
    }
    label(eligible?'ChatGPT Codex subscription connected'+(status.planType?' · '+status.planType:'')
      :(status.available?'Connect your own ChatGPT account to enable Codex.':
        'ChatGPT Codex account connection is not configured. Other AI models remain available.'));
  }
  async function checkAccount(){
    try{
      const response=await fetch('/api/codex-account',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok) throw Error('Account status unavailable');
      const account=await response.json();
      // Only trust an authenticated backend response; never accept localStorage as authorization.
      status={
        connected:account.connected===true,available:account.available===true,
        authMode:account.authMode, codexEnabled:account.codexEnabled===true,
        runnerReady:account.runnerReady===true,
        planType:String(account.planType||'').slice(0,40)
      };
    }catch(_){status={connected:false,available:false};}
    sync();
  }
  function init(){
    const header=document.querySelector('.header-top')||document.querySelector('.header');
    if(header && !lookup('jdChatWorkTabs')){
      const tabs=document.createElement('div');
      tabs.id='jdChatWorkTabs';
      tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Conversation mode');
      const chat=document.createElement('button');chat.type='button';chat.className='jd-codex-tab jd-codex-current';
      chat.textContent='Chat';chat.setAttribute('aria-current','page');
      const work=document.createElement('a');work.className='jd-codex-tab';work.href='/codex.html';work.textContent='Work';work.hidden=true;
      tabs.append(chat,work);
      header.append(tabs);buttons={chat,work};
    }
    const picker=lookup('modelPickerModal');
    if(picker && !lookup('jdCodexProviderOption')){
      const section=document.createElement('section');section.id='jdCodexPickerSection';
      section.className='jd-codex-picker-section';
      const h=document.createElement('div');h.className='jd-codex-heading';h.textContent='ChatGPT account';
      const connect=document.createElement('button');connect.type='button';connect.className='jd-codex-connect';
      connect.textContent='Connect ChatGPT';
      connect.addEventListener('click',async()=>{
        connect.disabled=true;
        try {
          const res=await fetch('/api/codex-account',{method:'POST',credentials:'same-origin',
            headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connect'})});
          const data=await res.json().catch(()=>({}));
          if(!res.ok || !data.authUrl) {label(data.error||'ChatGPT Codex connection is not available yet.');return;}
          // Do not accept arbitrary redirect URLs returned by an untrusted service.
          const url=new URL(data.authUrl);
          if(url.protocol!=='https:' || !['chatgpt.com','auth.openai.com'].includes(url.hostname))
            throw Error('Unexpected sign-in destination.');
          window.location.assign(url.href);
        }catch(e){label(e.message||'Unable to start ChatGPT sign-in.');}
        finally{connect.disabled=false;}
      });
      accountMessage=document.createElement('p');accountMessage.id='jdCodexAccountMessage';accountMessage.setAttribute('role','status');
      option=document.createElement('a');option.id='jdCodexProviderOption';
      option.href='/codex.html';option.className='jd-codex-choice';
      option.textContent='ChatGPT Codex (subscription) — coding workspace';option.hidden=true;
      section.append(h,connect,accountMessage,option);picker.append(section);
    }
    sync();
    checkAccount();
    // Recheck on tab focus after an independent supported OAuth flow.
    addEventListener('focus',checkAccount);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
