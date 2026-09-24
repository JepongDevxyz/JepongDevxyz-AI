import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../activity-reference.css',import.meta.url),'utf8');
const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const between=(src,start,end)=>{
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing source section '+start);
 return src.slice(a,b);
};
const normalizer=between(html,'        function normalizeActivityEventForUI(','        function shouldShowAIActivity(');
const normalize=new Function('sanitizeUiErrorMessage',
 normalizer+'\nreturn normalizeActivityEventForUI;')(
 msg=>String(msg||'').slice(0,180));
const events=[
 {id:'task-context',label:'Reviewing image task: build a meme generator with draggable text',kind:'image',state:'completed'},
 {id:'provider-codecraft',label:'Connecting to CodeCraftAPI',kind:'provider',state:'running',
  detail:'GPT 5.6 Luna • credential 2/3'},
 {id:'provider-codecraft',label:'CodeCraftAPI connected',kind:'provider',state:'completed'},
 {id:'thinking',label:'Thinking',kind:'thinking',state:'running'},
 {id:'generation',label:'Generating response',kind:'generate',state:'running'},
 {id:'output-verification',label:'Generated code static check completed with 1 warning',kind:'test',state:'completed',
  detail:'Static verification only; code was not arbitrarily executed.'},
 {id:'artifact',label:'Generated JepongDevxyz-output.txt',kind:'file',state:'completed'}
];
for(const event of events){
 const result=normalize(event);
 assert(result, 'Real server status must remain visible: '+event.id);
 assert.equal(result.id,event.id,'Do not overwrite generation with duplicate Thinking');
}
assert(!normalize({id:'client-start',label:'fake',state:'running'}));
assert(!normalize({id:'progress-heartbeat-1',label:'fake',state:'running'}));
assert(!normalize({id:'stream-open',label:'fake',state:'running'}));
assert(normalize(events[1]).detail.includes('configured API key'),
 'Credential slots should not be displayed in public Activity');
assert(!normalize(events[1]).detail.includes('2/3'));
assert(normalize({id:'provider-a',label:'Key exhausted',state:'warning',kind:'provider'}));
assert(normalize({id:'quality-orchestrator',label:'Intent requirements checked',state:'completed',kind:'process'}));
assert(normalize({id:'router',label:'Smart Router selected a model',state:'completed',kind:'route'}));
assert(html.includes("const lead=card.querySelector('.ai-activity-lead')"));
assert(html.includes("if(id==='task-context')"));
assert(html.includes("card.querySelector('.ai-activity-summary-text')"));
assert(html.includes("card.classList.contains('collapsed')"));
const finish=between(html,'        function finishAIIndicator(','        function removeAIIndicator(');
assert(!finish.includes("card.classList.add('collapsed')"),
 'Finishing used to hide all task-specific statuses at the moment the reply appeared');
assert(finish.includes("toggle?.setAttribute('aria-expanded',String(!card.classList.contains('collapsed')))"));
assert(finish.includes("completeRunningActivityRows('',success?'completed':'warning')"));
const append=between(html,'        function appendActivityEvent(','        function finishAIIndicator(');
assert(!append.includes("if(state==='running') completeRunningActivityRows(id)"),
 'Beginning a new step must not falsely mark the preceding step completed');
assert(append.includes('row.dataset.activityKind='));
assert(css.includes('.ai-activity-card.complete:not(.collapsed) .ai-activity-list'));
assert(css.includes('.ai-activity-row.running:not(.ai-activity-current)'));

const stream=between(html,'        async function consumeSSEPacket(','        function sanitizeVisibleAssistantResponse(');
const io=new Function(stream+'\nreturn {consumeSSEPacket,readActivitySSE};')();
const received=[];
const packets=[
 ': stream-open\n\n',
 'event: activity\ndata: '+JSON.stringify({type:'activity',...events[0]})+'\n\n',
 'event: activity\ndata: '+JSON.stringify({type:'activity',...events[1]})+'\n\n',
 ': keepalive\n\n',
 'event: activity\ndata: '+JSON.stringify({type:'activity',...events[4]})+'\n\n',
 'event: done\ndata: {"elapsedMs":41600}\n\n'
].join('');
const raw=new TextEncoder().encode(packets);
let n=0;
await io.readActivitySSE({body:{getReader(){return {async read(){
 if(n>=raw.length)return {done:true};
 const end=Math.min(raw.length,n+17);
 const value=raw.slice(n,end);n=end;return {done:false,value};
}};}}},{
 activity:evt=>received.push(normalize(evt)),
 done:evt=>received.push({done:evt.elapsedMs})
});
assert.deepEqual(received.map(x=>x.id||'done'),['task-context','provider-codecraft','generation','done'],
 'Real statuses must survive split SSE chunks, comments, and normalizer');
assert.equal(received.at(-1).done,41600);

const helper=between(html,'        function captureJdActivitySnapshot(){','        function loadChatSession(');
assert(helper.includes("id:clean(row.dataset.activityId,64)"));
assert(helper.includes('.slice(-12)'),'Saved activity must be size bounded');
assert(helper.includes("escapeHTML(String(value||'').slice(0,max))"),
 'Restored activity must escape model/provider strings before inserting HTML');
const restored=between(html,'        function loadChatSession(','        function saveSessions(');
assert(restored.includes('const savedActivity=renderJdStoredActivity(m.activity)'));
assert(restored.includes('if(savedActivity)chatBox.appendChild(savedActivity)'));
assert(html.includes("text: fullResponse, activity:captureJdActivitySnapshot()"));
assert.equal((html.match(/<lottie-player\b/g)||[]).length,6,
 'Preserve every original Lottie animation and welcome title');
assert(html.includes('<div class="welcome-title">JepongDevxyz AI</div>'));
assert(backend.includes('emitContextActivityStart(taskMessage,files,emit)'),
 'Task-based activity must originate from the user request on the server');
assert(backend.includes("send('activity',data)"));
assert(backend.includes("send('done',{elapsedMs"));
console.log('PASS: real prompt-specific SSE statuses appear, remain expanded, restore after reload, and preserve Thoughts, Lottie and backend routing.');
