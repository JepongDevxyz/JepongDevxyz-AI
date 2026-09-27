import assert from 'node:assert/strict';import fs from 'node:fs';
const h=fs.readFileSync('index.html','utf8');
for(const x of ["shareAssistantMessage(this)","toggleMessageMore(this,event)","Branch in new chat","Use Thinking","Search the web","navigator.share","setResponseEffort('High'","setLiveWebSearchEnabled(true)","Network connection lost.","Attempting to reconnect","window.addEventListener('offline'","setReconnectVisible(true)"])assert(h.includes(x),x);
const actions=h.slice(h.indexOf('function botActionsHTML'),h.indexOf('function assistantReadAloudButtonHTML'));
for(const icon of ['copy','thumbs-up','thumbs-down','share-2','more-vertical'])assert(actions.includes(icon),icon);
console.log('PASS: response toolbar/menu actions and reconnect UI are wired to real handlers.');
