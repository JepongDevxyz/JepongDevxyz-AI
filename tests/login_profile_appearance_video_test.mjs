import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../account-appearance.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function getPart(start,end){
 const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing source boundary: '+start);
 return html.slice(a,b);
}
assert(html.includes('<link rel="stylesheet" href="/account-appearance.css">'));
for(const [provider,logo] of [
 ['google','jd-brand-mark'],['facebook','data-lucide="facebook"'],
 ['github','data-lucide="github"']
]){
 assert(html.includes("onclick=\"cloudOAuth('"+provider+"')\""),
  'Brand provider must connect to real existing auth: '+provider);
 assert(html.includes(logo),'Missing provider icon: '+provider);
}
assert(html.includes('onclick="showCloudEmailForm()"'));
const options=html.slice(html.indexOf('<div id="jdAuthProviderList"'),html.indexOf('<p class="jd-auth-last"'));
const ordered=["cloudOAuth('google')","cloudOAuth('facebook')","cloudOAuth('github')",'showCloudEmailForm()'];
let previous=-1;
for(const item of ordered){
 const position=options.indexOf(item);
 assert(position>previous,'Login providers must appear in order: Google, Facebook, GitHub, Email');
 previous=position;
}
assert(!options.includes("cloudOAuth('twitter')"));
assert(!options.includes("cloudOAuth('apple')"));
assert(!options.includes('jd-auth-secondary-provider'),'Facebook is a primary login, not hidden under a secondary option');
for(const id of ['cloudAccountModal','cloudSignedOut','cloudSignedIn','cloudAccountStatus','cloudEmailForm',
 'cloudEmail','cloudOtpRow','cloudOtpBox','cloudVerifyOtpBtn','cloudResendOtpBtn','cloudUserLabel',
 'jdAuthTitle','jdAuthLastProvider','jdEditProfileModal','jdProfileFullName','jdAppearanceModal',
 'jdTextSizeRange','jdTextPreviewAnswer','jdSettingsProfileName','jdSettingsProfileEmail']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Auth/appearance id must stay unique: '+id);
}
assert.equal((html.match(/class="otp-input"/g)||[]).length,6,'Keep original six-code email login flow');
for(const method of ['auth.signInWithOAuth','auth.signInWithOtp','auth.verifyOtp','auth.updateUser',
 'function openAccountModal','function resetCloudEmailFlow','function renderCloudAccount']){
 assert(html.includes(method),'Missing real auth / profile handler '+method);
}
assert(!html.includes("You last logged in with Google</"),'Last login method must derive from verified session, not fabricated.');
assert(html.includes("safeSetLocalStorage('jd_last_login_provider',provider,true)"));
assert(html.includes("const userName=cloudUser?.user_metadata?.full_name"));
assert(html.includes("data:{full_name:name}"),'Profile edit must persist via Supabase auth, not only local UI');
assert(html.includes("['system','foryou','dark','light']"));
for(const mode of ['system','foryou','dark','light']){
 assert(html.includes('data-jd-appearance="'+mode+'"'),'Missing appearance option '+mode);
}
assert(html.includes("prefers-color-scheme: light"),'System appearance must track device preference');
assert(css.includes('--jd-chat-scale'),'Persisted chat text size must be applied to actual messages');
assert(css.includes('#cloudAccountModal .jd-auth-choice'),'Login brands must have styled real buttons');
assert(css.includes('.jd-profile-home')&&css.includes('.jd-appearance-home'));
assert.equal((html.match(/<lottie-player\b/g)||[]).length,6,'Preserve all existing welcome Lottie players');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));
assert(backend.includes("if(autoFallback&&fallbackable){"),'Do not change API fallback as part of login UI');

const appearance=getPart("        const JD_APPEARANCE_KEY=","        function setLiveWebSearchEnabled(");
const store=new Map();
const els=new Map();
function elt(id){
 if(!els.has(id))els.set(id,{value:'',textContent:'',disabled:false,style:{},classList:{add(){}},setAttribute(){}});
 return els.get(id);
}
const bodyClasses=new Set();
const doc={
 body:{
   className:'',
   classList:{add(name){bodyClasses.add(name)}}
 },
 documentElement:{style:{setProperty(key,value){store.set(key,value)}}},
 getElementById:elt,
 querySelectorAll(query){return query.includes('data-jd-appearance')?['system','foryou','dark','light'].map(mode=>({
  dataset:{jdAppearance:mode},classList:{toggle(){}},setAttribute(){}
 })):[]}
};
const local={getItem:key=>store.get(key)||null,setItem:(key,val)=>store.set(key,val)};
let listener=null,systemIsLight=false;
const win={matchMedia:()=>({get matches(){return systemIsLight},addEventListener(_name,fn){listener=fn}})};
const api=new Function('document','localStorage','window','safeSetLocalStorage',
 'closeTransientSurfaces','requestAnimationFrame','refreshLucideIcons',appearance+
 '\nreturn {applyJdAppearance,setJdChatTextSize};')(
 doc,local,win,(k,v)=>{store.set(k,v);return true;},()=>{},fn=>fn(),()=>{}
);
api.applyJdAppearance('dark');
assert.equal(doc.body.className,'');
assert.equal(store.get('jd_appearance_mode'),'dark');
api.applyJdAppearance('light');
assert.equal(doc.body.className,'theme-light');
api.applyJdAppearance('foryou');
assert(bodyClasses.has('jd-appearance-foryou'),'For You must have a real theme accent');
api.applyJdAppearance('system');
systemIsLight=true;listener();
assert.equal(doc.body.className,'theme-light','System mode must follow device theme changes');
assert.equal(store.get('jd_appearance_mode'),'system');
api.setJdChatTextSize(115);
assert.equal(store.get('--jd-chat-scale'),'1.15');
assert.equal(store.get('jd_chat_text_size'),'115');
api.setJdChatTextSize(999);
assert.equal(store.get('jd_chat_text_size'),'120');
assert.equal(elt('jdTextSizeResetBtn').disabled,false);
api.setJdChatTextSize(100);
assert.equal(elt('jdTextSizeResetBtn').disabled,true);

const oauthSrc=getPart('        async function cloudOAuth(provider){','        async function sendEmailOtp(');
const calls=[],notices=[];
const signInWithOAuth=async options=>{calls.push(options);return {error:options.provider==='apple'?new Error('Provider not configured'):null}};
const login=new Function('cloudClient','showModernAlert','location',oauthSrc+'\nreturn cloudOAuth;')(
 {auth:{signInWithOAuth}},(...args)=>notices.push(args),{origin:'https://example.test',pathname:'/'}
);
await login('twitter');
assert.deepEqual(calls[0],{provider:'twitter',options:{redirectTo:'https://example.test/'}});
await login('apple');
assert.match(notices[0][0],/not configured/,'Unconfigured provider must not silently claim success');
console.log('PASS: branded real OAuth, six-digit email OTP, Supabase profile editor, device-aware themes, persisted chat text sizing, and Lottie/routing preserved.');
