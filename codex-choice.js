// Codex subscription is a separate authenticated coding-agent mode, NOT a
// regular provider/model ID. Never place it in the generic /api/chat route.
// A browser flag, GitHub login, or ChatGPT identity-only sign-in is not proof
// of an authorized Codex subscription.
(() => {
  'use strict';
  let status={connected:false,available:false};
  let buttons,option,accountMessage,connectButton,disconnectButton,loginDetails,pollTimer;
  const lookup=id=>document.getElementById(id);
  const stopPoll=()=>{if(pollTimer){clearTimeout(pollTimer);pollTimer=null;}};
  const poll=()=>{stopPoll();pollTimer=setTimeout(async()=>{await checkAccount();if(!status.connected && status.available)poll();},3500);};

  const label=(message)=>{
    if(accountMessage) accountMessage.textContent=message;
  };
  function sync(){
    const eligible=status.connected===true && status.authMode==='chatgpt'
      && status.codexEnabled===true && status.runnerReady===true;
    if(buttons?.work) buttons.work.hidden=!eligible;
    if(option) option.hidden=!eligible;
    if(disconnectButton) disconnectButton.hidden=!status.connected;
    if(status.connected){stopPoll();if(loginDetails)loginDetails.hidden=true;}

    if(connectButton){connectButton.disabled=!status.available||eligible;connectButton.textContent=eligible?'ChatGPT connected':(status.available?'Connect ChatGPT':'Connect ChatGPT (setup required)');}
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
      connectButton=connect;
      connect.addEventListener('click',async()=>{
        connect.disabled=true;
        try{
          const res=await fetch('/api/codex-account',{method:'POST',credentials:'same-origin',
            headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connect'})});
          const data=await res.json().catch(()=>({}));
          if(!res.ok)throw Error(data.error||'ChatGPT Codex connection unavailable.');
          if(data.connected===true){await checkAccount();return;}
          const url=new URL(String(data.verificationUrl||''));
          if(url.protocol!=='https:' || url.hostname!=='auth.openai.com' ||
            !['/codex/device','/codex/device/'].includes(url.pathname) ||
            !/^[A-Z0-9-]{4,32}$/i.test(String(data.userCode||'')))
            throw Error('Unsupported device login response.');
          loginDetails.replaceChildren();
          const code=document.createElement('strong');code.textContent=String(data.userCode);
          const link=document.createElement('a');link.href=url.href;link.target='_blank';
          link.rel='noopener noreferrer';link.textContent='Open official ChatGPT device sign-in';
          const instruction=document.createElement('p');
          instruction.textContent='Sign in to your own ChatGPT account at the official page, then enter this code:';
          loginDetails.append(instruction,code,document.createElement('br'),link);
          loginDetails.hidden=false;
          label('Waiting for your ChatGPT authorization. Never enter your password on this website.');
          poll();
        }catch(e){label(e.message||'Unable to start ChatGPT sign-in.');}
        finally{sync();}
      });
      accountMessage=document.createElement('p');accountMessage.id='jdCodexAccountMessage';accountMessage.setAttribute('role','status');
      option=document.createElement('a');option.id='jdCodexProviderOption';
      option.href='/codex.html';option.className='jd-codex-choice';
      option.textContent='ChatGPT Codex (subscription) — coding workspace';option.hidden=true;
      loginDetails=document.createElement('div');loginDetails.id='jdCodexLoginDetails';
      loginDetails.hidden=true;loginDetails.setAttribute('role','status');
      disconnectButton=document.createElement('button');disconnectButton.type='button';
      disconnectButton.className='jd-codex-connect';disconnectButton.textContent='Disconnect ChatGPT';
      disconnectButton.hidden=true;
      disconnectButton.addEventListener('click',async()=>{
        disconnectButton.disabled=true;
        try{
          const response=await fetch('/api/codex-account',{method:'POST',credentials:'same-origin',
            headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'disconnect'})});
          if(!response.ok)throw Error('Could not disconnect ChatGPT.');
          await checkAccount();
        }catch(e){label(e.message);}
        finally{disconnectButton.disabled=false;}
      });
      section.append(h,connect,accountMessage,loginDetails,option,disconnectButton);picker.append(section);
    }
    sync();
    checkAccount();
    // Recheck on tab focus after an independent supported OAuth flow.
    addEventListener('focus',checkAccount);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
