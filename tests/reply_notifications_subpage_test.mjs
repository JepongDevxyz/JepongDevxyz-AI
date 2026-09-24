import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../haptics-notifications.css',import.meta.url),'utf8');
const sw=readFileSync(new URL('../jd-notification-sw.js',import.meta.url),'utf8');
function bodyBetween(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Expected HTML section '+start);
 return html.slice(a,b);
}
const root=bodyBetween('<div id="settingsModal"','<!-- Video-reference profile editor');
const modal=bodyBetween('id="jdReplyNotificationsModal"','<!-- Reference-video Haptics screen');
assert(root.includes('onclick="openJdReplyNotifications()"'),'Main settings row must navigate to actual notification subpage');
assert(root.includes('id="jdReplyNotifyDescription"'),'Main settings shows concise permission state');
assert(!root.includes('jdNotifyTestButton'),'Test button must not clutter main settings');
assert(!root.includes('id="settingsNotifyToggle"'),'Master notifications switch belongs inside its subpage');
assert(modal.includes('id="settingsNotifyToggle"'),'Notification subpage contains functional switch');
assert(modal.includes('onchange="toggleResponseNotifications(this.checked)"'));
assert(modal.includes('id="jdNotifyTestButton"')&&modal.includes('onclick="testResponseNotification()"'));
assert(modal.includes('id="jdReplyNotifyDetailStatus"'),'Notification testing has live status in same panel');
assert(modal.includes('class="jd-reply-notify-test"'),'Modern test row exists in subpage');
for(const id of ['jdReplyNotificationsModal','jdNotifyTestButton','settingsNotifyToggle','jdReplyNotifyDescription','jdReplyNotifyDetailStatus']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Selector must be unique: '+id);
}
assert(css.includes('.jd-reply-notify-home')&&css.includes('.jd-reply-notify-test:disabled'));
assert(css.includes('#settingsModal .jd-notify-settings-entry'));
assert(!css.includes('#settingsModal .jd-notify-test-row'),'Removed obsolete outer settings test button styling');
assert(html.includes("worker.showNotification(title,options)"),'Android notifications must retain service worker delivery');
assert(sw.includes("self.addEventListener('notificationclick'"));
assert.equal((html.match(/<lottie-player\b/g)||[]).length,6,'Preserve all original welcome animations');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));

const openSource=bodyBetween('        function openJdReplyNotifications(){','        function syncReplyNotificationSettings(');
const calls=[],classes=new Map();
for(const id of ['jdReplyNotificationsModal','settingsModal']){
 let opened=false;
 classes.set(id,{id,classList:{add(name){assert.equal(name,'open');opened=true;calls.push(id+' opened');},
 remove(name){assert.equal(name,'open');opened=false;calls.push(id+' closed');},
 contains(name){return name==='open'&&opened;}}});
}
const nav=new Function('document','closeTransientSurfaces','syncReplyNotificationSettings',
 'requestAnimationFrame','refreshLucideIcons','openSettingsModal',openSource+
 '\nreturn {openJdReplyNotifications,closeJdReplyNotifications};')(
 {getElementById:id=>classes.get(id)||null},
 id=>{assert.equal(id,'jdReplyNotificationsModal');calls.push('other modals closed');},
 ()=>calls.push('notification toggle hydrated'),
 fn=>fn(),()=>{},
 ()=>calls.push('settings reopened')
);
nav.openJdReplyNotifications();
assert(classes.get('jdReplyNotificationsModal').classList.contains('open'));
assert(calls.includes('notification toggle hydrated'));
nav.closeJdReplyNotifications();
assert(!classes.get('jdReplyNotificationsModal').classList.contains('open'));
assert(calls.includes('settings reopened'));

const testCode=bodyBetween('        async function testResponseNotification(){','        function notifyResponseReady(');
const ui=new Map([
 ['jdNotifyTestButton',{disabled:false}],
 ['jdReplyNotifyDetailStatus',{textContent:''}]
]);
let sent=0,enabled=true;
const tester=new Function('document','jdShowReplyNotification','syncReplyNotificationSettings',testCode+
 '\nreturn testResponseNotification;')(
 {getElementById:id=>ui.get(id)||null},
 async()=>{sent++;return enabled;},
 message=>{ui.get('jdNotifyTestButton').disabled=false;if(message)ui.get('jdReplyNotifyDetailStatus').textContent=message;}
);
assert.equal(await tester(),true);
assert.equal(sent,1);
assert.match(ui.get('jdReplyNotifyDetailStatus').textContent,/Test notification sent/);
enabled=false;
assert.equal(await tester(),false);
assert.equal(sent,2);
assert.match(ui.get('jdReplyNotifyDetailStatus').textContent,/could not be displayed/);
ui.get('jdNotifyTestButton').disabled=true;
assert.equal(await tester(),false);
assert.equal(sent,2,'Disabled test must never silently send a notification');
console.log('PASS: modern Reply Notifications subpage, real navigation, test enabled/success/error feedback, Android worker retained, and existing Lottie preserved.');
