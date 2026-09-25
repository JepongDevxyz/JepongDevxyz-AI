import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function between(src,from,to){
 const a=src.indexOf(from),b=src.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'Missing function segment: '+from);
 return src.slice(a,b);
}
const profileSrc=between(api,"function taskProfile(message='', files=[]){","\nfunction contextActivityPlan(");
const taskProfile=new Function('extractPublicUrl','shouldAutoResearch','detectArtifactRequest','shortTaskSubject',
 profileSrc+'\nreturn taskProfile;')(()=>[],()=>false,()=>null,text=>text.slice(0,82));
const meme='Build a meme generator where users upload images and add draggable text';
assert.equal(taskProfile(meme,[]).kind,'web','App creation must outrank incidental image keyword');
assert.equal(taskProfile('Review the image I attached',[{mimeType:'image/png'}]).kind,'image');
const contextSrc=between(api,"function contextActivityPlan(message='', files=[]){","\nfunction emitContextActivityStart(");
const plan=new Function('taskProfile','shortTaskSubject','extractPublicUrl','isSafePublicUrl','isWebsiteSecurityRequest','URL',
 contextSrc+'\nreturn contextActivityPlan;')(taskProfile,m=>m.slice(0,82),()=>[],()=>false,()=>false,URL);
assert.match(plan(meme,[]).steps[0].label,/app or website build/i);
const uploadPlan=plan('Analyze this clip',[
 {name:'clip.mp4',mimeType:'video/mp4',kind:'video'},
 {name:'frame 1',parentName:'clip.mp4',mimeType:'image/jpeg',mediaRole:'video-frame'}
]);
assert(uploadPlan.steps[0].label.includes('clip.mp4'));
assert(uploadPlan.steps[0].label.includes('Analyze this clip'));

const sanitizeSrc=between(api,'function sanitizeIncomingAttachments(files=[]){','\nfunction attachmentRootName(');
const sanitize=new Function(sanitizeSrc+'\nreturn sanitizeIncomingAttachments;')();
const longCode='x'.repeat(400000);
const sanitized=sanitize([{name:'index.html',kind:'text',mimeType:'text/html',extractedText:longCode}]);
assert.equal(sanitized[0].extractedText.length,400000,'Large supplied source must no longer truncate silently at 180k');
const mediaSrc=between(api,'function mediaAttachments(files=[]){','\nfunction extractCodeBlocks(');
const activities=[],called=[];
let geminiReady=true;
const deps={
 providerLabel:name=>name,
 modelLabel:name=>name,
 attachmentRootName:file=>String(file?.parentName||file?.name||'Attachment'),
 activity:(_emit,id,label,state,kind)=>activities.push({id,label,state,kind}),
 configured:name=>name==='gemini'?geminiReady:false,
 runOpenAICompatible:async args=>{called.push({provider:'selected',args});return {ok:false,status:415};},
 runGemini:async args=>{called.push({provider:'gemini',args});return {ok:true,response:{body:'mock'}};},
 runCloudflare:async args=>{called.push({provider:'cloudflare',args});return {ok:false,status:503};},
 readInternalProviderText:async()=> 'At 1.5 seconds, a blue button appears.',
 mediaGroundingPrompt:null
};
const analysis=new Function(...Object.keys(deps),mediaSrc+
 '\nreturn {mediaAttachments,analyzeMediaForNonVisionProvider};')(
 ...Object.values({...deps,mediaGroundingPrompt:undefined})
);
// Functions close over mediaGroundingPrompt inside same extracted block.
const video=[{name:'clip.mp4 — frame 1',parentName:'clip.mp4',mimeType:'image/jpeg',
 mediaRole:'video-frame',frameTimeSeconds:1.5,data:'abc'}];
const text=await analysis.analyzeMediaForNonVisionProvider(video,
 'Read the clip for button placement','codecraft','gpt-5.6-luna',()=>{},null);
assert.match(text,/MEDIA ATTACHMENT ANALYSIS — Gemini/);
assert.match(text,/blue button/);
assert.equal(called[0].provider,'gemini');
assert.equal(called[0].args.message.includes('button placement'),true);
assert(activities.some(x=>x.id==='attachment-media'&&/video frame/.test(x.label)&&x.state==='running'));
assert(activities.some(x=>x.id==='attachment-media'&&x.state==='completed'));
assert.equal(await analysis.analyzeMediaForNonVisionProvider(video,'Review','gemini','gemini-flash-latest',()=>{},null),'');
geminiReady=false;
assert.equal(await analysis.analyzeMediaForNonVisionProvider(video,'Review','codecraft','gpt-5.6-luna',()=>{},null),null,
 'No configured vision analyzer must fail clearly, not fabricate description');
assert(activities.some(x=>x.state==='warning'&&/No configured vision route could read/i.test(x.label)));

const process=between(api,'async function processChat(body, emit) {','\nasync function providerUsageSnapshot(');
assert(process.includes('const mediaAnalysisContext=visualParts.length'));
assert(!process.includes('const mediaAnalysisContext=autoFallback?'));
assert(process.includes("mediaAnalysisContext===null"),'Missing explicit visual-analysis error');
assert(process.includes('Your selected response model was not changed'));
assert(process.includes('const attachmentSourceContext=buildAttachmentSourceContext(files,taskMessage);'));
assert(process.includes("activity(emit,id,`Prepared ${videoFrames}"),'Video frame milestones must be factual');

const startup=between(html,"function initialActivityForRequest(promptText='',files=[]){",
 '        function normalizeActivityEventForUI(');
const initial=new Function(startup+'\nreturn initialActivityForRequest;')();
assert.match(initial(meme,[]).label,/Working on: Build a meme generator/);
const local=initial('Read video and screenshot',[{name:'clip.mp4',kind:'video',mimeType:'video/mp4'},
 {name:'frame.jpg',parentName:'clip.mp4',mediaRole:'video-frame',mimeType:'image/jpeg'}]);
assert.match(local.label,/Reviewing uploaded video/);
assert.equal(local.detail,'clip.mp4');
const renderer=between(html,'function showAIIndicator(','function toggleActivityDetails(');
assert(!renderer.includes("appendActivityEvent({id:'request-submitted'"));
assert(renderer.includes("const initialTask=initialActivityForRequest(promptText,files)"));
assert(html.includes("if(id==='task-context')"),'Actual backend task status remains visible');
assert(html.includes("label:label||'Checking configured fallback'"));
assert.equal((html.match(/<lottie-player\b/g)||[]).length,6);
console.log('PASS: app task classification, truthful task/file activity, 400k source, vision bridge independent of provider fallback, direct vision and clear unavailable-media status, original Lottie.');
