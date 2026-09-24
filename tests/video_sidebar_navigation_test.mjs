import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../reference-shell.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const before=(s,e)=>{
 const i=html.indexOf(s),j=html.indexOf(e,i+s.length);
 assert(i>=0&&j>i,'Missing UI logic boundary: '+s);
 return html.slice(i,j);
};
assert(!html.includes('id="jdWelcomeActions"'),'Old landing shortcuts must not render');
assert(!html.includes('class="header-top"'),'Duplicate branding row must not render');
assert(html.includes('<span id="brandTitleText" hidden>JepongDevxyz AI</span>'),
 'Keep incognito/Bible brand title target for existing handlers');
assert(html.includes('class="sidebar drawer-left" id="sidebar"'),
 'Video-reference menu should be a left drawer');
for(const id of ['sidebarOverlay','chatHistoryList','searchChatInput','networkStatus',
 'pingText','bar1','bar2','bar3','bar4','word-count','jdSidebarAccountName',
 'jdSidebarAvatar','jdSidebarConversationsToggle','livePetLayer','userInput','mainActionBtn']){
 assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
  'Existing/new selector must remain unique: '+id);
}
for(const label of ['New conversation','Library','Plugins','Clear current chat','Conversations']){
 assert(html.includes('>'+label+'</span>')||html.includes('>'+label+'</button>'),
  'The menu is missing a real action: '+label);
}
for(const fn of ['createNewChat','openLibrary','openPluginsFromComposer','clearCurrentChat',
 'openAccountModal','openSettingsModal','filterChatHistory','renderSidebarHistory',
 'togglePinSession','renameChatSession','exportSpecificChat','deleteChatSession']){
 assert(html.includes('function '+fn+'(')||html.includes('async function '+fn+'('),
  'Preserved existing menu action missing: '+fn);
}
assert(html.includes("activeDrawerMode = 'left';\n            sidebar.className = 'sidebar drawer-left open';"),
 'The menu button must open the correct drawer geometry');
assert(html.includes("const maxW = Math.min(window.innerWidth - 32, 410);"),
 'Edge swipe must use the left drawer width');
assert(html.includes('function toggleJdSidebarConversations(){'));
assert(html.includes('function toggleJdHistoryActions(event,trigger){'));
assert(html.includes('refreshLucideIcons(list);'),
 'The dynamically added history overflow icons must be hydrated');
assert(css.includes('.app-container .header-top{display:none!important}'));
assert(css.includes('#sidebar .jd-sidebar-menu-actions'));
assert(css.includes('#sidebar .jd-sidebar-footer-actions'));
assert(css.includes('#sidebar .history-actions-deck.open{display:grid!important}'));
assert(css.includes('body.theme-light .app-container .sidebar.drawer-left'));
assert(!html.includes('onclick="jdQuickAction('),
 'The previous landing cards must no longer have visible handlers');

const picker=before('function toggleJdSidebarConversations(){',
                    'function toggleJdHistoryActions(event,trigger){');
const section={collapsed:false,classList:{toggle(key){assert.equal(key,'collapsed');section.collapsed=!section.collapsed;return section.collapsed;}}};
const label={attrs:{},setAttribute(key,value){label.attrs[key]=value;}};
const toggle=new Function('document',picker+'return toggleJdSidebarConversations;')({
 querySelector:key=>key==='.jd-sidebar-conversation-section'?section:null,
 getElementById:key=>key==='jdSidebarConversationsToggle'?label:null
});
toggle();
assert.equal(section.collapsed,true);
assert.equal(label.attrs['aria-expanded'],'false');
toggle();
assert.equal(section.collapsed,false);
assert.equal(label.attrs['aria-expanded'],'true');

const lottie=[...html.matchAll(/<lottie-player\b[^>]*>/g)].map(m=>m[0]);
assert.equal(lottie.length,6);
assert(lottie.every(x=>x.includes('speed="1" loop autoplay')),
 'All existing animation settings must remain unmodified');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));
assert(backend.includes('if(autoFallback&&fallbackable){'),
 'Frontend-only redesign must not affect provider quota fallback');
console.log('PASS: video-reference left drawer, functional controls, no arrowed duplicate UI, preserved Lottie, chat history, swipe, and routing.');
