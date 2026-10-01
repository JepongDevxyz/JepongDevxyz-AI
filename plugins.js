/* ============================================================
   JepongDevxyz AI — Plugins (ChatGPT-style, 2026-10-01)
   Frame-by-frame match to the ChatGPT app Plugins screen:
   - Header: back arrow + "Plugins" + chevron
   - "Installed >" horizontal icon row (+N overflow)
   - "Popular >", "New & Noteworthy >", category sections
   - Rows: brand icon + name + tagline + [+]/[...]
   - Bottom "Search plugins" bar -> full search view
   - Detail page: icon + name + "Plugin", example @cards,
     description, Skills list, Information, "Try in chat"
   - Context menus: Chat / Manage / Uninstall
   REAL FUNCTION:
   - Install/uninstall persists to localStorage
   - "Try in chat" / "Chat" inserts @PluginName into chat input
   - contextForChat() detects @mentions and injects that
     plugin's skills into the AI request (real capability)
   API kept: window.JDPlugins.{open,close,ready,openAgent,
     stageAgentFiles,stageChange,contextForChat}
   ============================================================ */
(function () {
'use strict';
if (window.__jdPluginsV3) return;
window.__jdPluginsV3 = true;

/* ---------------- Real brand SVG icons ---------------- */
var IC = {
gmail: '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M8 12l16 12 16-12v-2H8z"/><path fill="#FBBC04" d="M8 10v26l12-9z"/><path fill="#34A853" d="M40 10v26l-12-9z"/><path fill="#188038" d="M20 27l-12 9h32l-12-9-4 3z"/></svg>',
github: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
gdrive: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M16 8h16l8 14H24z"/><path fill="#34A853" d="M8 22h16l8 14H16z"/><path fill="#4285F4" d="M32 8l8 14H24z"/></svg>',
slack: '<svg viewBox="0 0 48 48"><path fill="#36C5F0" d="M18 4a4 4 0 014 4v8h-8a4 4 0 010-8h4z"/><path fill="#2EB67D" d="M44 18a4 4 0 01-4 4h-8v-8a4 4 0 018 0z"/><path fill="#ECB22E" d="M30 44a4 4 0 01-4-4v-8h8a4 4 0 010 8h-4z"/><path fill="#E01E5A" d="M4 30a4 4 0 014-4h8v8a4 4 0 01-8 0z"/></svg>',
figma: '<svg viewBox="0 0 24 24"><path fill="#F24E1E" d="M8.5 2h3.5v7H8.5a3.5 3.5 0 010-7z"/><path fill="#FF7262" d="M12 2h3.5a3.5 3.5 0 010 7H12z"/><path fill="#A259FF" d="M8.5 9H12v7H8.5a3.5 3.5 0 010-7z"/><circle cx="15.5" cy="12.5" r="3.5" fill="#1ABCFE"/><path fill="#0ACF83" d="M8.5 16H12v5.5a3.5 3.5 0 01-3.5-3.5z"/></svg>',
notion: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M17.5 3h-11C4.6 3 3 4.6 3 6.5v11C3 19.4 4.6 21 6.5 21h11c1.9 0 3.5-1.6 3.5-3.5v-11C21 4.6 19.4 3 17.5 3zM8.2 16.6L6.6 15l-.2-1.3V8.9l.3-.5 4.5-.1.2.3-.3 1.4 2.1 5.4 2-5.3-.4-1.5.2-.3 2-.1.2.3-2.8 7.2-.4.2-.4-.2-2.4-6.1-2.1 6.1-.4.2z"/></svg>',
dropbox: '<svg viewBox="0 0 48 48"><path fill="#0061FF" d="M24 4l14 8-14 8-14-8z"/><path fill="#0061FF" d="M10 16l14 8v12l-14-8z"/><path fill="#0061FF" d="M38 16l-14 8v12l14-8z"/></svg>',
vercel: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2L2 20h20z"/></svg>',
canva: '<svg viewBox="0 0 48 48"><path fill="#00C4CC" d="M24 4C13 4 4 13 4 24s9 20 20 20c5 0 9.6-1.8 13.1-4.8L24 24l13.1-15.2C33.6 5.8 29 4 24 4z"/><path fill="#7D2AE8" d="M24 24l13.1-15.2C41.6 12.4 44 17.9 44 24s-2.4 11.6-6.9 15.2z"/></svg>',
adobe: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#FA0F00"/><path fill="#fff" d="M28 10L14 38h6l3-7h8l3 7h6L28 10zm-1.5 14h-5l2.5-6z"/></svg>',
health: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#EA4335"/><path fill="#fff" d="M24 38S12 29 12 20c0-5 4-8 8-8 3 0 5 2 6 3 1-1 3-3 6-3 4 0 8 3 8 8 0 9-12 18-12 18z"/></svg>',
tldraw: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#fff"/><path fill="#000" d="M18 12h12v5h-3.5v13a4.5 4.5 0 01-9 0V17H14v-5h4z"/><circle cx="33" cy="35" r="4.5" fill="#000"/></svg>',
gcal: '<svg viewBox="0 0 48 48"><rect x="6" y="10" width="36" height="32" rx="6" fill="#fff"/><path fill="#4285F4" d="M6 10a6 6 0 016-6h24a6 6 0 016 6v6H6z"/><text x="24" y="38" font-size="17" font-weight="bold" text-anchor="middle" fill="#1A73E8" font-family="Arial">31</text></svg>',
outlook: '<svg viewBox="0 0 48 48"><rect x="4" y="8" width="40" height="32" rx="6" fill="#0F6CBD"/><path fill="#fff" d="M10 16l14 10 14-10"/><path fill="#fff" d="M10 14v18l10-7zm28 0v18l-10-7z" opacity=".85"/></svg>',
teams: '<svg viewBox="0 0 48 48"><rect x="6" y="10" width="28" height="28" rx="6" fill="#5059C9"/><circle cx="38" cy="18" r="6" fill="#7B83EB"/><path fill="#fff" d="M16 20h12v12H16z"/></svg>',
hostinger: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#673DE6"/><path fill="#fff" d="M14 12h6v10h12V12h6v24h-6V28H20v8h-6z"/></svg>',
lovable: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#fff"/><path fill="#000" d="M24 36c-8 0-14-6-14-14 3 0 5 2 7 4 2-3 4-8 7-8 3 0 5 5 7 8 2-2 4-4 7-4 0 8-6 14-14 14z"/></svg>',
base44: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#111"/><path fill="#F97316" d="M14 34V14h8a8 8 0 010 16h-8z"/><circle cx="33" cy="24" r="7" fill="#F97316"/></svg>',
superpowers: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#1a1a1a"/><path fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" d="M20 30l-6 6a8 8 0 01-11-11l6-6M28 18l6-6a8 8 0 0111 11l-6 6M17 25l14-6"/></svg>',
productdesign: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#E8E0F0"/><circle cx="24" cy="24" r="12" fill="#B39DDB"/><circle cx="24" cy="24" r="6" fill="#7E57C2"/></svg>',
higgsfield: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#C6F24E"/><path d="M14 32c4-12 8-12 12 0 4-12 8-12 12 0" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
remotedesktop: '<svg viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#fff"/><rect x="10" y="12" width="28" height="18" rx="3" fill="none" stroke="#111" stroke-width="3"/><path fill="#111" d="M20 36h8v-4h-8z"/></svg>'
};

/* ---------------- Plugin catalog ---------------- */
var CATALOG = [
{id:'gmail',name:'Gmail',tagline:'Read and manage Gmail',icon:'gmail',bg:'#1a1a1a',cat:'Popular',
 desc:'Use Gmail with JepongDevxyz AI to read, search, draft and manage your email.',
 skills:[{n:'Read inbox',p:'Summarize my latest unread emails: sender, subject, and one-line gist each.'},{n:'Search email',p:'Search my email for: '},{n:'Draft email',p:'Draft a polite email about: '}],
 examples:['@Gmail summarize my unread emails','@Gmail find emails from my boss'],
 info:{cap:'Interactive, Read, and Write',dev:'Google',web:'gmail.com',ver:'2.1.0'}},
{id:'health',name:'Health',tagline:'Explore your health data in C…',icon:'health',bg:'#1a1a1a',cat:'Popular',
 desc:'Explore your health data with JepongDevxyz AI — activity, sleep and wellness trends.',
 skills:[{n:'Activity summary',p:'Summarize my recent activity and fitness trends.'},{n:'Sleep insights',p:'Analyze my sleep patterns and suggest improvements.'}],
 examples:['@Health how active was I this week'],
 info:{cap:'Interactive and Read',dev:'JepongDevxyz',web:'jepong-devxyz-ai.vercel.app',ver:'1.0.0'}},
{id:'gdrive',name:'Google Drive',tagline:'Drive, Docs, Sheets or Slides',icon:'gdrive',bg:'#1a1a1a',cat:'Popular',
 desc:'Work with your Drive files — summarize docs, analyze sheets, and find anything fast.',
 skills:[{n:'Summarize doc',p:'Summarize this Google Doc: '},{n:'Analyze sheet',p:'Analyze this spreadsheet and highlight key numbers: '}],
 examples:['@Google Drive summarize my project doc'],
 info:{cap:'Interactive and Read',dev:'Google',web:'drive.google.com',ver:'2.1.0'}},
{id:'github',name:'GitHub',tagline:'Triage PRs, issues, CI, and pu…',icon:'github',bg:'#1a1a1a',cat:'Popular',
 desc:'Use GitHub with JepongDevxyz AI to inspect repositories, triage PRs and issues, check CI, and draft code changes.',
 skills:[{n:'Triage PRs',p:'List the open PRs I should review and summarize each.'},{n:'Review code',p:'Review this code for bugs and improvements: '},{n:'Explain repo',p:'Explain the structure of this repository: '}],
 examples:['@GitHub triage my open PRs','@GitHub review this code'],
 info:{cap:'Interactive, Read, and Write',dev:'GitHub',web:'github.com',ver:'3.0.0'}},
{id:'adobe',name:'Adobe',tagline:'Design, combine, and edit',icon:'adobe',bg:'#1a1a1a',cat:'New & Noteworthy',
 desc:'Design, combine, and edit images with Adobe tools through chat.',
 skills:[{n:'Edit image',p:'Describe how to edit this image: '}],
 examples:['@Adobe help me design a poster'],
 info:{cap:'Interactive',dev:'Adobe',web:'adobe.com',ver:'1.4.0'}},
{id:'tldraw',name:'tldraw',tagline:'Draw and diagram with agents',icon:'tldraw',bg:'#1a1a1a',cat:'New & Noteworthy',
 desc:'Draw and diagram with agents — flowcharts, wireframes and sketches from chat.',
 skills:[{n:'Diagram plan',p:'Plan a diagram for: '}],
 examples:['@tldraw diagram my app flow'],
 info:{cap:'Interactive',dev:'tldraw',web:'tldraw.dev',ver:'1.2.0'}},
{id:'canva',name:'Canva',tagline:'Create, review, edit designs',icon:'canva',bg:'#1a1a1a',cat:'New & Noteworthy',
 desc:'Create, review, and edit designs with Canva through JepongDevxyz AI.',
 skills:[{n:'Design brief',p:'Write a design brief for: '}],
 examples:['@Canva design a thumbnail for my video'],
 info:{cap:'Interactive',dev:'Canva',web:'canva.com',ver:'1.8.0'}},
{id:'figma',name:'Figma',tagline:'Create designs, ship to code',icon:'figma',bg:'#1a1a1a',cat:'New & Noteworthy',
 desc:'Create designs and ship them to code with Figma.',
 skills:[{n:'Design review',p:'Review this UI design: '}],
 examples:['@Figma turn this into a component'],
 info:{cap:'Interactive, Read, and Write',dev:'Figma',web:'figma.com',ver:'2.0.0'}},
{id:'notion',name:'Notion',tagline:'Notion docs and workflows',icon:'notion',bg:'#1a1a1a',cat:'Productivity',
 desc:'Bring your Notion docs and workflows into chat — summarize, search and organize.',
 skills:[{n:'Summarize page',p:'Summarize this Notion page: '},{n:'Find doc',p:'Find my Notion doc about: '}],
 examples:['@Notion summarize my meeting notes'],
 info:{cap:'Interactive, Read, and Write',dev:'Notion',web:'notion.so',ver:'1.9.0'}},
{id:'gcal',name:'Google Calendar',tagline:'Manage Google Calendar eve…',icon:'gcal',bg:'#1a1a1a',cat:'Productivity',
 desc:'Manage your Google Calendar events — schedule, reschedule and get briefings.',
 skills:[{n:'Day briefing',p:'What is on my calendar today?'},{n:'Schedule',p:'Schedule a meeting: '}],
 examples:['@Google Calendar what is on today'],
 info:{cap:'Interactive, Read, and Write',dev:'Google',web:'calendar.google.com',ver:'2.1.0'}},
{id:'dropbox',name:'Dropbox',tagline:'Find, create, and take action',icon:'dropbox',bg:'#1a1a1a',cat:'Productivity',
 desc:'Find, create, and take action on your Dropbox files.',
 skills:[{n:'Find file',p:'Find this file in my Dropbox: '}],
 examples:['@Dropbox find my contract PDF'],
 info:{cap:'Interactive, Read, and Write',dev:'Dropbox',web:'dropbox.com',ver:'1.7.0'}},
{id:'outlookcal',name:'Outlook Calendar',tagline:'Manage Outlook schedules',icon:'outlook',bg:'#1a1a1a',cat:'Productivity',
 desc:'Manage your Outlook calendar schedules from chat.',
 skills:[{n:'Check schedule',p:'Check my Outlook schedule for: '}],
 examples:['@Outlook Calendar am I free Friday'],
 info:{cap:'Interactive and Read',dev:'Microsoft',web:'outlook.com',ver:'1.5.0'}},
{id:'outlookmail',name:'Outlook Email',tagline:'Triage Outlook inboxes',icon:'outlook',bg:'#1a1a1a',cat:'Communication',
 desc:'Triage your Outlook inboxes with AI help.',
 skills:[{n:'Triage inbox',p:'Triage my Outlook inbox.'}],
 examples:['@Outlook Email triage my inbox'],
 info:{cap:'Interactive, Read, and Write',dev:'Microsoft',web:'outlook.com',ver:'1.5.0'}},
{id:'slack',name:'Slack',tagline:'Read and manage Slack',icon:'slack',bg:'#1a1a1a',cat:'Communication',
 desc:'Read and manage Slack — catch up on channels and draft replies.',
 skills:[{n:'Catch up',p:'Summarize what I missed in: '},{n:'Draft reply',p:'Draft a Slack reply to: '}],
 examples:['@Slack catch me up on #general'],
 info:{cap:'Interactive, Read, and Write',dev:'Slack',web:'slack.com',ver:'1.6.0'}},
{id:'teams',name:'Teams',tagline:'Summarize Teams and follow…',icon:'teams',bg:'#1a1a1a',cat:'Communication',
 desc:'Summarize Teams chats and follow-ups.',
 skills:[{n:'Summarize chat',p:'Summarize this Teams thread: '}],
 examples:['@Teams summarize my team chat'],
 info:{cap:'Interactive and Read',dev:'Microsoft',web:'teams.microsoft.com',ver:'1.3.0'}},
{id:'hostingermail',name:'Hostinger Mail',tagline:'Use Hostinger Mail',icon:'hostinger',bg:'#1a1a1a',cat:'Communication',
 desc:'Use your Hostinger Mail account from chat.',
 skills:[{n:'Check mail',p:'Check my Hostinger mail.'}],
 examples:['@Hostinger Mail check inbox'],
 info:{cap:'Interactive, Read, and Write',dev:'Hostinger',web:'hostinger.com',ver:'1.1.0'}},
{id:'productdesign',name:'Product Design',tagline:'Explore and prototype ideas',icon:'productdesign',bg:'#1a1a1a',cat:'Creativity',
 desc:'Explore and prototype product ideas with AI guidance.',
 skills:[{n:'Prototype idea',p:'Prototype this product idea: '}],
 examples:['@Product Design prototype a habit app'],
 info:{cap:'Interactive',dev:'JepongDevxyz',web:'jepong-devxyz-ai.vercel.app',ver:'1.0.0'}},
{id:'higgsfield',name:'Higgsfield',tagline:'Every image and video model',icon:'higgsfield',bg:'#1a1a1a',cat:'Creativity',
 desc:'Every image and video model in one place — generate visuals from chat.',
 skills:[{n:'Image prompt',p:'Write an image prompt for: '}],
 examples:['@Higgsfield generate a sunset scene'],
 info:{cap:'Interactive',dev:'Higgsfield',web:'higgsfield.ai',ver:'1.0.0'}},
{id:'vercel',name:'Vercel',tagline:'Build and deploy web apps a…',icon:'vercel',bg:'#1a1a1a',cat:'Developer Tools',
 desc:'Build and deploy web apps and agents with Vercel from chat.',
 skills:[{n:'Deploy help',p:'Help me deploy: '},{n:'Debug deploy',p:'Debug this deployment error: '}],
 examples:['@Vercel deploy my Next.js app'],
 info:{cap:'Interactive, Read, and Write',dev:'Vercel',web:'vercel.com',ver:'2.2.0'}},
{id:'lovable',name:'Lovable',tagline:'Build full-stack apps by chat',icon:'lovable',bg:'#1a1a1a',cat:'Developer Tools',
 desc:'Build full-stack apps by chatting — describe it, get an app.',
 skills:[{n:'App idea',p:'Turn this idea into an app plan: '}],
 examples:['@Lovable build me a todo app'],
 info:{cap:'Interactive',dev:'Lovable',web:'lovable.dev',ver:'1.0.0'}},
{id:'base44',name:'Base44',tagline:'Build Apps & Websites with AI',icon:'base44',bg:'#1a1a1a',cat:'Developer Tools',
 desc:'Build apps and websites with AI assistance.',
 skills:[{n:'Build plan',p:'Plan this build: '}],
 examples:['@Base44 build a landing page'],
 info:{cap:'Interactive',dev:'Base44',web:'base44.com',ver:'1.0.0'}},
{id:'rdc',name:'Remote Desktop',tagline:'Build and automate, anywhere',icon:'remotedesktop',bg:'#1a1a1a',cat:'Developer Tools',
 desc:'Build and automate, anywhere — remote workflows from chat.',
 skills:[{n:'Automate',p:'Automate this task: '}],
 examples:['@Remote Desktop automate backups'],
 info:{cap:'Interactive',dev:'JepongDevxyz',web:'jepong-devxyz-ai.vercel.app',ver:'1.0.0'}},
{id:'superpowers',name:'Superpowers',tagline:'Make your agents better devs',icon:'superpowers',bg:'#1a1a1a',cat:'Developer Tools',
 desc:'Use Superpowers to guide agent work through brainstorming, implementation planning, test-driven development, systematic debugging, code review, and finishing workflows.',
 skills:[{n:'Brainstorming',p:'[Brainstorming] Clarify the goal, constraints and success criteria, then propose a concrete design for: '},{n:'Executing Plans',p:'[Executing Plans] Write a focused step-by-step implementation plan for: '},{n:'Test-Driven Development',p:'[TDD] Design tests first, then implement: '},{n:'Systematic Debugging',p:'[Debugging] Reproduce and narrow down this bug using the actual error: '},{n:'Requesting Code Review',p:'[Code Review] Review this code for bugs, risks and improvements: '},{n:'Dispatching Parallel Agents',p:'[Parallel] Break this into parallel workstreams: '}],
 examples:["@Superpowers I've got an idea for something I'd like to build.","@Superpowers Let's add a feature to this project."],
 info:{cap:'Interactive, Read, and Write',dev:'Jesse Vincent',web:'github.com',ver:'6.4.2'}}
];
var byId = {};
CATALOG.forEach(function (p) { byId[p.id] = p; });
var SECTIONS = ['Popular', 'New & Noteworthy', 'Productivity', 'Communication', 'Creativity', 'Developer Tools'];

/* ---------------- State ---------------- */
var LS = 'jd_plugins_v3_installed';
function loadInstalled() {
  try { var a = JSON.parse(localStorage.getItem(LS) || '[]'); return Array.isArray(a) ? a.filter(function (id) { return !!byId[id]; }) : []; }
  catch (_) { return []; }
}
function saveInstalled(a) { try { localStorage.setItem(LS, JSON.stringify(a)); } catch (_) {} }
var installed = loadInstalled();
function isInstalled(id) { return loadInstalled().indexOf(id) !== -1; }

/* ---------------- Styles ---------------- */
function injectCss() {
  if (document.getElementById('jdPlugV3Css')) return;
  var s = document.createElement('style');
  s.id = 'jdPlugV3Css';
  s.textContent =
  '.jdpg{position:fixed;inset:0;z-index:9990;background:#000;color:#fff;display:flex;flex-direction:column;font-family:inherit;animation:jdpgIn .18s ease-out}' +
  '@keyframes jdpgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
  '.jdpg-head{display:flex;align-items:center;justify-content:center;position:relative;height:60px;flex-shrink:0}' +
  '.jdpg-back{position:absolute;left:16px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:#1c1c1e;border:none;color:#fff;font-size:20px;display:flex;align-items:center;justify-content:center;cursor:pointer}' +
  '.jdpg-title{font-size:17px;font-weight:600;display:flex;align-items:center;gap:4px}' +
  '.jdpg-title svg{width:14px;height:14px;opacity:.7}' +
  '.jdpg-hbtn{position:absolute;right:16px;top:50%;transform:translateY(-50%);width:40px;height:40px;border-radius:50%;background:transparent;border:none;color:#fff;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer}' +
  '.jdpg-scroll{flex:1;overflow-y:auto;padding:4px 16px 100px;-webkit-overflow-scrolling:touch}' +
  '.jdpg-sec{font-size:14px;color:#8e8e93;margin:18px 0 10px;display:flex;align-items:center;gap:2px;cursor:pointer}' +
  '.jdpg-sec svg{width:12px;height:12px}' +
  '.jdpg-instrow{display:flex;gap:12px;overflow-x:auto;padding:2px 0 6px;scrollbar-width:none}' +
  '.jdpg-instrow::-webkit-scrollbar{display:none}' +
  '.jdpg-inst{width:56px;height:56px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;border:1px solid #2c2c2e}' +
  '.jdpg-inst svg{width:34px;height:34px}' +
  '.jdpg-more{min-width:56px;height:56px;border-radius:14px;background:#1c1c1e;color:#fff;font-size:15px;font-weight:600;flex-shrink:0;border:none;cursor:pointer}' +
  '.jdpg-row{display:flex;align-items:center;gap:12px;padding:10px 0;cursor:pointer}' +
  '.jdpg-ico{width:48px;height:48px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #2c2c2e}' +
  '.jdpg-ico svg{width:30px;height:30px}' +
  '.jdpg-meta{flex:1;min-width:0}' +
  '.jdpg-name{font-size:16px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
  '.jdpg-tag{font-size:13.5px;color:#8e8e93;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px}' +
  '.jdpg-plus{width:32px;height:32px;border-radius:50%;background:transparent;border:none;color:#8e8e93;font-size:26px;font-weight:300;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}' +
  '.jdpg-dots{width:32px;height:32px;border-radius:50%;background:transparent;border:none;color:#8e8e93;font-size:20px;letter-spacing:1px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}' +
  '.jdpg-searchbar{position:absolute;left:16px;right:16px;bottom:calc(20px + env(safe-area-inset-bottom));height:52px;border-radius:26px;background:#1c1c1e;border:none;color:#fff;font-size:16px;display:flex;align-items:center;gap:10px;padding:0 20px;cursor:text}' +
  '.jdpg-searchbar svg{width:18px;height:18px;opacity:.6;flex-shrink:0}' +
  '.jdpg-searchbar span{color:#8e8e93}' +
  '.jdpg-stitle{text-align:center;font-size:20px;font-weight:700;margin:14px 0 4px}' +
  '.jdpg-ssub{text-align:center;font-size:14px;color:#8e8e93;margin:0 0 16px}' +
  '.jdpg-sbox{display:flex;align-items:center;gap:8px;background:#1c1c1e;border-radius:24px;height:48px;padding:0 8px 0 16px;margin-bottom:16px}' +
  '.jdpg-sbox svg{width:18px;height:18px;opacity:.6;flex-shrink:0}' +
  '.jdpg-sbox input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-size:16px;min-width:0}' +
  '.jdpg-sbox input::placeholder{color:#8e8e93}' +
  '.jdpg-x{width:32px;height:32px;border-radius:50%;background:#3a3a3c;border:none;color:#fff;font-size:14px;display:none;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}' +
  '.jdpg-loading{text-align:center;color:#8e8e93;font-size:14px;margin:30px 0}' +
  '.jdpg-spin{width:28px;height:28px;border-radius:50%;border:3px solid #3a3a3c;border-top-color:#fff;margin:0 auto 10px;animation:jdpgSpin .8s linear infinite}' +
  '@keyframes jdpgSpin{to{transform:rotate(360deg)}}' +
  '.jdpg-dhead{display:flex;align-items:center;justify-content:center;position:relative;height:60px;flex-shrink:0}' +
  '.jdpg-dhero{display:flex;flex-direction:column;align-items:flex-start;padding:8px 0 0}' +
  '.jdpg-dico{width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #2c2c2e;margin-bottom:12px}' +
  '.jdpg-dico svg{width:40px;height:40px}' +
  '.jdpg-dname{font-size:26px;font-weight:700}' +
  '.jdpg-dkind{font-size:14px;color:#8e8e93;margin:2px 0 14px}' +
  '.jdpg-ex{background:linear-gradient(135deg,#dbeafe,#d1fae5);border-radius:16px;padding:16px;margin-bottom:12px;cursor:pointer}' +
  '.jdpg-ex p{color:#111;font-size:15px;margin:0 0 10px;font-weight:500}' +
  '.jdpg-ex .jdpg-exgo{display:flex;justify-content:flex-end}' +
  '.jdpg-exgo span{width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.7);display:flex;align-items:center;justify-content:center;color:#111;font-size:16px}' +
  '.jdpg-ddesc{font-size:15px;color:#d1d1d6;line-height:1.5;margin:6px 0 4px}' +
  '.jdpg-more-link{color:#0a84ff;font-size:15px;background:none;border:none;padding:0;cursor:pointer}' +
  '.jdpg-h2{font-size:17px;font-weight:700;margin:22px 0 10px}' +
  '.jdpg-skill{display:flex;align-items:center;gap:12px;background:#1c1c1e;border-radius:14px;padding:14px 16px;margin-bottom:8px;cursor:pointer}' +
  '.jdpg-skill svg{width:22px;height:22px;opacity:.85;flex-shrink:0}' +
  '.jdpg-skill span{flex:1;font-size:15.5px;font-weight:500}' +
  '.jdpg-skill i{color:#8e8e93;font-style:normal;font-size:18px}' +
  '.jdpg-info{margin:6px 0}' +
  '.jdpg-irow{display:flex;justify-content:space-between;gap:16px;padding:9px 0;font-size:14.5px}' +
  '.jdpg-irow b{color:#8e8e93;font-weight:400;flex-shrink:0}' +
  '.jdpg-irow span{text-align:right}' +
  '.jdpg-irow a{color:#0a84ff;text-decoration:none}' +
  '.jdpg-try{position:absolute;left:16px;right:16px;bottom:calc(20px + env(safe-area-inset-bottom));height:54px;border-radius:27px;background:#fff;color:#000;font-size:17px;font-weight:600;border:none;cursor:pointer}' +
  '.jdpg-menu{position:fixed;z-index:9999;background:#1c1c1e;border-radius:16px;min-width:220px;padding:6px;box-shadow:0 12px 40px rgba(0,0,0,.6);animation:jdpgIn .15s ease-out}' +
  '.jdpg-mi{display:flex;align-items:center;gap:12px;width:100%;background:none;border:none;color:#fff;font-size:16px;padding:12px 14px;border-radius:10px;cursor:pointer;text-align:left}' +
  '.jdpg-mi:active{background:#2c2c2e}' +
  '.jdpg-mi svg{width:20px;height:20px;opacity:.85}' +
  '.jdpg-mi.danger{color:#ff453a}' +
  '.jdpg-mask{position:fixed;inset:0;z-index:9998;background:transparent}';
  document.head.appendChild(s);
}
var CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 6l6 6-6 6"/></svg>';
var CHEVD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>';
var SEARCHIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>';
var CUBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8l-9-5-9 5v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>';

/* ---------------- Panel ---------------- */
var panel = null, view = 'dir', detailId = null, searchQ = '';

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function open() {
  injectCss();
  closeMenu();
  if (panel) { renderDir(); panel.style.display = 'flex'; return; }
  panel = document.createElement('div');
  panel.className = 'jdpg';
  panel.id = 'jdpgPanel';
  document.body.appendChild(panel);
  renderDir();
}

function close() {
  closeMenu();
  if (panel) panel.style.display = 'none';
}

function rowHtml(p) {
  var inst = isInstalled(p.id);
  var right = inst
    ? '<button class="jdpg-dots" data-act="menu" data-id="' + p.id + '" aria-label="Options">···</button>'
    : '<button class="jdpg-plus" data-act="install" data-id="' + p.id + '" aria-label="Install">+</button>';
  return '<div class="jdpg-row" data-act="detail" data-id="' + p.id + '">' +
    '<div class="jdpg-ico" style="background:' + p.bg + '">' + IC[p.icon] + '</div>' +
    '<div class="jdpg-meta"><div class="jdpg-name">' + esc(p.name) + '</div><div class="jdpg-tag">' + esc(p.tagline) + '</div></div>' +
    right + '</div>';
}

function renderDir() {
  view = 'dir';
  var h = '<div class="jdpg-head"><button class="jdpg-back" data-act="close" aria-label="Back">←</button>' +
    '<div class="jdpg-title">Plugins ' + CHEVD + '</div></div><div class="jdpg-scroll">';
  h += '<div class="jdpg-sec" data-act="noop">Installed ' + CHEV + '</div><div class="jdpg-instrow">';
  var instList = loadInstalled(); installed = instList;
  instList.slice(0, 4).forEach(function (id) {
    var p = byId[id]; if (!p) return;
    h += '<div class="jdpg-inst" style="background:' + p.bg + '" data-act="detail" data-id="' + p.id + '" title="' + esc(p.name) + '">' + IC[p.icon] + '</div>';
  });
  if (instList.length > 4) h += '<button class="jdpg-more" data-act="noop">+' + (instList.length - 4) + '</button>';
  if (!instList.length) h += '<div style="color:#8e8e93;font-size:14px;padding:8px 0">No plugins installed yet.</div>';
  h += '</div>';
  SECTIONS.forEach(function (sec) {
    var list = CATALOG.filter(function (p) { return p.cat === sec; });
    if (!list.length) return;
    h += '<div class="jdpg-sec" data-act="noop">' + esc(sec) + ' ' + CHEV + '</div>';
    list.forEach(function (p) { h += rowHtml(p); });
  });
  h += '</div><button class="jdpg-searchbar" data-act="search">' + SEARCHIC + '<span>Search plugins</span></button>';
  panel.innerHTML = h;
  bind();
}

function renderSearch() {
  view = 'search';
  var h = '<div class="jdpg-head"><button class="jdpg-back" data-act="backdir" aria-label="Back">←</button></div>' +
    '<div class="jdpg-scroll"><div class="jdpg-stitle">Search plugins</div>' +
    '<p class="jdpg-ssub">Find plugins in this directory.</p>' +
    '<div class="jdpg-sbox">' + SEARCHIC +
    '<input id="jdpgQ" type="text" placeholder="Search plugins" autocomplete="off" value="' + esc(searchQ) + '">' +
    '<button class="jdpg-x" id="jdpgClear" aria-label="Clear">✕</button></div>' +
    '<div id="jdpgResults"></div></div>';
  panel.innerHTML = h;
  bind();
  var q = document.getElementById('jdpgQ');
  var clr = document.getElementById('jdpgClear');
  var t = 0;
  function doSearch() {
    var v = q.value.trim();
    searchQ = v;
    clr.style.display = v ? 'flex' : 'none';
    var box = document.getElementById('jdpgResults');
    if (!v) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="jdpg-loading"><div class="jdpg-spin"></div>Searching plugins</div>';
    clearTimeout(t);
    t = setTimeout(function () {
      var vl = v.toLowerCase();
      var res = CATALOG.filter(function (p) {
        return p.name.toLowerCase().indexOf(vl) !== -1 || p.tagline.toLowerCase().indexOf(vl) !== -1;
      });
      box.innerHTML = res.length ? res.map(rowHtml).join('') : '<div class="jdpg-loading">No plugins found for "' + esc(v) + '"</div>';
      bind();
    }, 350);
  }
  q.addEventListener('input', doSearch);
  clr.addEventListener('click', function () { q.value = ''; doSearch(); q.focus(); });
  setTimeout(function () { try { q.focus(); } catch (_) {} }, 60);
  if (searchQ) doSearch();
}

function renderDetail(id) {
  var p = byId[id]; if (!p) return;
  view = 'detail'; detailId = id;
  var h = '<div class="jdpg-dhead"><button class="jdpg-back" data-act="backdir" aria-label="Back">←</button>' +
    '<div class="jdpg-title">' + esc(p.name) + '</div>' +
    '<button class="jdpg-hbtn" data-act="dmenu" data-id="' + p.id + '" aria-label="Options">⋮</button></div>' +
    '<div class="jdpg-scroll"><div class="jdpg-dhero">' +
    '<div class="jdpg-dico" style="background:' + p.bg + '">' + IC[p.icon] + '</div>' +
    '<div class="jdpg-dname">' + esc(p.name) + '</div><div class="jdpg-dkind">Plugin</div></div>';
  (p.examples || []).forEach(function (ex) {
    h += '<div class="jdpg-ex" data-act="trychat" data-id="' + p.id + '" data-ex="' + esc(ex) + '"><p>' + esc(ex) + '</p><div class="jdpg-exgo"><span>→</span></div></div>';
  });
  h += '<p class="jdpg-ddesc">' + esc(p.desc) + ' <button class="jdpg-more-link" data-act="noop">More</button></p>';
  if (p.skills && p.skills.length) {
    h += '<div class="jdpg-h2">Skills</div>';
    p.skills.forEach(function (sk, i) {
      h += '<div class="jdpg-skill" data-act="skill" data-id="' + p.id + '" data-i="' + i + '">' + CUBE + '<span>' + esc(sk.n) + '</span><i>›</i></div>';
    });
  }
  h += '<div class="jdpg-h2">Information</div><div class="jdpg-info">' +
    irow('Capabilities', esc(p.info.cap)) +
    irow('Developer', esc(p.info.dev)) +
    irow('Website', '<a href="#" data-act="noop">' + esc(p.info.web) + '</a>') +
    irow('Version', esc(p.info.ver)) +
    irow('Privacy Policy', '<a href="#" data-act="noop">' + esc(p.info.web) + '</a>') +
    irow('Terms of Service', '<a href="#" data-act="noop">' + esc(p.info.web) + '</a>') +
    '</div></div>' +
    '<button class="jdpg-try" data-act="trychat" data-id="' + p.id + '">Try in chat</button>';
  panel.innerHTML = h;
  bind();
}
function irow(k, v) { return '<div class="jdpg-irow"><b>' + k + '</b><span>' + v + '</span></div>'; }

/* ---------------- Actions ---------------- */
function bind() {
  panel.querySelectorAll('[data-act]').forEach(function (el) {
    if (el.__jdpgBound) return;
    el.__jdpgBound = true;
    el.addEventListener('click', function (e) {
      e.stopPropagation();
      var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
      if (act === 'close') close();
      else if (act === 'backdir') renderDir();
      else if (act === 'search') { searchQ = ''; renderSearch(); }
      else if (act === 'detail') renderDetail(id);
      else if (act === 'install') install(id);
      else if (act === 'menu') openMenu(el, id, false);
      else if (act === 'dmenu') openMenu(el, id, true);
      else if (act === 'trychat') tryInChat(id, el.getAttribute('data-ex'));
      else if (act === 'skill') useSkill(id, parseInt(el.getAttribute('data-i'), 10));
    });
  });
}

function install(id) {
  if (!byId[id]) return;
  var a = loadInstalled();
  if (a.indexOf(id) === -1) { a.push(id); saveInstalled(a); installed = a; }
  toast('Installed ' + byId[id].name);
  refresh();
}
function uninstall(id) {
  var a = loadInstalled().filter(function (x) { return x !== id; });
  saveInstalled(a); installed = a;
  toast('Uninstalled ' + (byId[id] ? byId[id].name : 'plugin'));
  closeMenu();
  refresh();
}
function refresh() {
  if (view === 'dir') renderDir();
  else if (view === 'detail' && detailId) renderDetail(detailId);
  else if (view === 'search') { var v = searchQ; renderSearch(); }
}

/* "Try in chat" / "Chat": real function — inserts @Plugin into chat input */
function tryInChat(id, ex) {
  var p = byId[id]; if (!p) return;
  close();
  var text = ex || ('@' + p.name + ' ');
  setTimeout(function () {
    try {
      var input = document.querySelector('#promptInput, #chatInput, textarea');
      if (input && 'value' in input) {
        input.focus();
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      var cb = document.getElementById('chatBox');
      if (cb) cb.scrollTop = cb.scrollHeight;
      toast('@' + p.name + ' ready — type your request');
    } catch (_) {}
  }, 60);
}
function useSkill(id, i) {
  var p = byId[id]; if (!p || !p.skills || !p.skills[i]) return;
  tryInChat(id, '@' + p.name + ' ' + p.skills[i].p);
}

/* Context menu */
function closeMenu() {
  ['jdpgMask', 'jdpgMenu'].forEach(function (x) { var e = document.getElementById(x); if (e && e.parentNode) e.parentNode.removeChild(e); });
}
function openMenu(anchor, id, isDetail) {
  closeMenu();
  var p = byId[id]; if (!p) return;
  var r = anchor.getBoundingClientRect();
  var mask = document.createElement('div');
  mask.className = 'jdpg-mask'; mask.id = 'jdpgMask';
  mask.addEventListener('click', closeMenu);
  var m = document.createElement('div');
  m.className = 'jdpg-menu'; m.id = 'jdpgMenu';
  m.innerHTML = isDetail
    ? '<button class="jdpg-mi" data-m="detail"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.1"/></svg>View plugin detail</button>' +
      '<button class="jdpg-mi danger" data-m="uninstall"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>Uninstall</button>'
    : '<button class="jdpg-mi" data-m="chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z"/></svg>Chat</button>' +
      '<button class="jdpg-mi" data-m="manage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>Manage</button>' +
      '<button class="jdpg-mi danger" data-m="uninstall"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>Uninstall</button>';
  document.body.appendChild(mask);
  document.body.appendChild(m);
  var mw = 230, mh = isDetail ? 120 : 176;
  m.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)) + 'px';
  m.style.top = Math.max(8, Math.min(window.innerHeight - mh - 8, r.bottom + 6)) + 'px';
  m.querySelectorAll('[data-m]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var k = b.getAttribute('data-m');
      if (k === 'uninstall') uninstall(id);
      else if (k === 'chat') { closeMenu(); tryInChat(id); }
      else { closeMenu(); renderDetail(id); }
    });
  });
}

function toast(msg) {
  try { if (typeof window.showModernToast === 'function') window.showModernToast(msg); } catch (_) {}
}

/* ---------------- REAL FUNCTION: @mention -> skills into AI request ---------------- */
function mentionedPlugins() {
  var out = [];
  try {
    var input = document.querySelector('#promptInput, #chatInput, textarea');
    var v = input && 'value' in input ? String(input.value || '').toLowerCase() : '';
    if (!v) return out;
    CATALOG.forEach(function (p) {
      if (!isInstalled(p.id)) return;
      var plain = '@' + p.name.toLowerCase();
      if (v.indexOf(plain) !== -1) out.push(p);
    });
  } catch (_) {}
  return out;
}
function contextForChat() {
  var ms = mentionedPlugins();
  return {
    plugins: ms.map(function (p) {
      return { id: p.id, name: p.name, skills: p.skills.map(function (s) { return { name: s.n, prompt: s.p }; }) };
    }),
    superpowers: { enabled: false, phase: 'auto' },
    skills: [],
    autoUse: true,
    github: { enabled: false }
  };
}

/* ---------------- Public API (kept) ---------------- */
window.JDPlugins = Object.freeze({
  open: open,
  close: close,
  ready: function () { return Promise.resolve(); },
  openAgent: function () { open(); },
  stageAgentFiles: function () { return false; },
  stageChange: function () {},
  contextForChat: contextForChat
});
})();
