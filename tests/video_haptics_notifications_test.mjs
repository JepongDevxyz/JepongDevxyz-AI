import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../haptics-notifications.css',import.meta.url),'utf8');
const worker=readFileSync(new URL('../jd-notification-sw.js',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function segment(begin,end){
 const a=html.indexOf(begin),b=html.indexOf(end,a+begin.length);
 assert(a>=0&&b>a,'Missing source segment '+begin);
 return html.slice(a,b);
}
for(const id of ['jdHapticsModal','jdHapticsToggle','jdHapticsButtonsToggle',
 'jdHapticsResponseToggle','jdHapticsCapabilityNote','settingsNotifyToggle',
 'jdReplyNotifyDescription','jdNotifyTestButton']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Unique control '+id);
}
for(const fn of ['openJdHaptics','closeJdHaptics','setJdHapticsEvent',
 'toggleResponseNotifications','testResponseNotification','notifyResponseReady']){
 assert(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),
   'Missing functional handler '+fn);
}
for(const name of ['Haptics','When is haptic needed','Pressing buttons','AI is responding']){
 assert(html.includes(name),'Reference video missing '+name);
}
assert(html.includes('onclick="openJdHaptics()"'),'Haptics must have its own real subpage');
assert(html.includes('onchange="setJdHapticsEvent(\'buttons\',this.checked)"'));
assert(html.includes('onchange="setJdHapticsEvent(\'response\',this.checked)"'));
assert(css.includes('.jd-haptics-home')&&css.includes('.jd-haptics-events'));
assert(worker.includes("self.addEventListener('notificationclick'"));
assert(worker.includes('clients.openWindow(destination.href)'));
assert(!worker.includes("addEventListener('fetch'"),'Dedicated notification worker must not intercept app requests');
assert(html.includes("navigator.serviceWorker.register(JD_NOTIFY_WORKER,{scope:'/'})"));
assert(html.includes('worker.showNotification(title,options)'),'Android should use ServiceWorkerRegistration.showNotification');
assert(html.includes('Notification.requestPermission()'),'User gesture should request browser permission');
assert(html.includes('jdHapticsResponseEnabled)jdHapticPulse(20)'));
assert(html.includes("jdResponseFeedbackSent=false;"),'Exactly one response feedback per request');
assert(html.includes('syncReplyNotificationSettings();'),'Settings must reflect actual permissions');
assert.equal((html.match(/<lottie-player\b/g)||[]).length,6);
assert(backend.includes('if(autoFallback&&fallbackable){'));

// Two independent event settings; master switch gates both.
const hapticSource=segment("        const JD_HAPTICS_KEY='jd_haptics_enabled';",
 '        function openJdAppearance(){');
const hapticStore=new Map();const pulses=[];let now=1000,clickHandler=null;
const switches=new Map([
 ['jdHapticsToggle',{checked:false}],['jdHapticsButtonsToggle',{checked:false,disabled:false}],
 ['jdHapticsResponseToggle',{checked:false,disabled:false}],
 ['jdHapticsDescription',{textContent:''}],['jdHapticsCapabilityNote',{textContent:''}]
]);
const doc={getElementById:id=>switches.get(id)||null,
 addEventListener:(type,handler)=>{assert.equal(type,'click');clickHandler=handler;}};
const nav={vibrate:v=>{pulses.push(v);return true;}};
const haptics=new Function('document','navigator','Date','localStorage',
 'safeSetLocalStorage','closeTransientSurfaces','requestAnimationFrame','refreshLucideIcons',
 'openSettingsModal',hapticSource+
 '\nreturn {setJdHaptics,setJdHapticsEvent,jdHapticPulse,syncJdHapticsUI};')(
 doc,nav,{now:()=>now},{getItem:k=>hapticStore.get(k)||null},
 (k,v)=>{hapticStore.set(k,v);},()=>{},fn=>fn(),()=>{},()=>{}
);
haptics.syncJdHapticsUI();
assert.equal(switches.get('jdHapticsButtonsToggle').disabled,true);
haptics.setJdHaptics(true);
haptics.setJdHapticsEvent('buttons',false);
haptics.setJdHapticsEvent('response',true);
now+=100;
const clickTarget={disabled:false,closest:key=>key==='button,[role="button"],input[type="checkbox"],input[type="radio"]'?clickTarget:null};
const count=pulses.length;clickHandler({isTrusted:true,target:clickTarget});
assert.equal(pulses.length,count,'Pressing buttons OFF must stop click vibration');
now+=100;haptics.jdHapticPulse(20);
assert.equal(pulses.length,count+1,'AI response setting should still allow a separate pulse');
haptics.setJdHaptics(false);
assert.equal(switches.get('jdHapticsResponseToggle').disabled,true);
now+=100;assert.equal(haptics.jdHapticPulse(20),false,'Master OFF must gate response vibrations');

// Android: Notification constructor may exist yet throw; worker must deliver.
const notifySource=segment('        let notifyPromptTimer = null;',
 '        function activityIconMarkup(');
const notificationStore=new Map();
const rendered=[],status={textContent:''},toggle={checked:false},testBtn={disabled:true};
const nDoc={getElementById:id=>({
 settingsNotifyToggle:toggle,jdReplyNotifyDescription:status,
 jdNotifyTestButton:testBtn,notifyPermissionCard:{classList:{remove(){}}}
}[id]||null)};
const NotificationMock=function(){throw new Error('Android does not support direct Notification constructor')};
NotificationMock.permission='default';
NotificationMock.requestPermission=()=>{NotificationMock.permission='granted';return Promise.resolve('granted');};
const reg={active:{},showNotification:async(title,options)=>{rendered.push({title,options});}};
const navigatorMock={serviceWorker:{register:async(path,options)=>{
 assert.equal(path,'/jd-notification-sw.js');assert.equal(options.scope,'/');
 return reg;},ready:Promise.resolve(reg)}};
const nWindow={isSecureContext:true};
const notificationApi=new Function('document','navigator','window','Notification','localStorage',
 'safeSetLocalStorage','jdHapticsEnabled','jdHapticsResponseEnabled',
 'jdHapticPulse','activeAIAbortController','clearTimeout','setTimeout',
 'refreshLucideIcons','location',notifySource+
 '\nreturn {toggleResponseNotifications,notifyResponseReady,testResponseNotification,syncReplyNotificationSettings,shouldOfferNotifyPrompt};')(
 nDoc,navigatorMock,nWindow,NotificationMock,
 {getItem:k=>notificationStore.get(k)||null},
 (k,v)=>{notificationStore.set(k,v);},
 false,false,()=>{},null,()=>{},()=>{},()=>{},
 {origin:'https://example.test',pathname:'/'}
);
notificationApi.toggleResponseNotifications(true);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(notificationStore.get('jepong_notify_enabled'),'true','Grant persists enabled setting');
assert.equal(toggle.checked,true,'Settings toggle accurately reflects granted permission');
assert.equal(testBtn.disabled,false);
await notificationApi.testResponseNotification();
assert.equal(rendered.length,1,'Android worker sends test notification');
notificationApi.notifyResponseReady(true);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(rendered.length,2,'Finished reply triggers actual worker notification');
notificationApi.notifyResponseReady(true);
await new Promise(resolve=>setImmediate(resolve));
assert.equal(rendered.length,2,'Duplicate completion must not notify twice');
notificationApi.toggleResponseNotifications(false);
assert.equal(toggle.checked,false);
assert.equal(notificationStore.get('jepong_notify_enabled'),'false');
assert.equal(testBtn.disabled,true);
console.log('PASS: video Haptics UI and independent switches; Android SW reply/test notification, user permission, dedupe, OFF behavior, Lottie/API preserved.');
