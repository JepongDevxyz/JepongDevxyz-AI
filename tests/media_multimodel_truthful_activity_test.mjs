import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const backend=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const frontend=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function segment(src,from,to){
 const a=src.indexOf(from),b=src.indexOf(to,a+from.length);
 assert(a>=0&&b>a,'Source segment missing: '+from);
 return src.slice(a,b);
}
const frontSource=segment(frontend,'        function prepareAttachmentsForRequest(files=[]){','        function historySafeAttachments(');
const prepare=new Function('requestSafeAttachmentSummary','MAX_REQUEST_BASE64_CHARS',
 frontSource+'\nreturn prepareAttachmentsForRequest;')(
 f=>({name:f.name,mimeType:f.mimeType||'video/mp4',originalMimeType:f.mimeType||'video/mp4',kind:f.kind,extractedText:f.extractedText||'',extractionError:'',extractionWarning:''}),2350000
);
const video={name:'demo.mp4',kind:'video',mimeType:'video/mp4',
 nativeData:'N'.repeat(1400000),frames:[0,1,2,3].map(i=>({name:'frame '+i,mimeType:'image/jpeg',data:'F'.repeat(180000),mediaRole:'video-frame',frameTimeSeconds:i*2}))};
const prepared=prepare([video]);
assert.equal(prepared.filter(f=>f.mediaRole==='video-frame').length,4,
 'Do not let original native video consume the frame budget before useful visual samples');
assert.equal(prepared.filter(f=>f.mediaRole==='video-native').length,0,
 'Do not add redundant original video if the visual frames are available');
assert(prepared.every(f=>f.mediaRole!=='video-frame'||f.parentName==='demo.mp4'));
const bad=prepare([{name:'bad.png',kind:'image',mimeType:'image/png'}]);
assert.match(bad[0].extractionError,/No readable visual data/,
 'Do not silently mark an image with missing pixels as readable');

const media=segment(backend,'function mediaAttachments(files=[]){','\nfunction extractCodeBlocks(');
const events=[],toolCalls=[];
let visionReady=true,cloudflareReady=true;
const deps={
 attachmentRootName:f=>f.parentName||f.name,
 configured:name=>name==='gemini'||name==='cloudflare',
 providerLabel:name=>name,
 activity:(_emit,id,label,state,kind,detail)=>events.push({id,label,state,kind,detail}),
 runGemini:async args=>{toolCalls.push({provider:'gemini',args});return visionReady?{ok:true,response:{body:1}}:{ok:false,status:429,error:'quota'};},
 runCloudflare:async args=>{toolCalls.push({provider:'cloudflare',args});return cloudflareReady?{ok:true,response:{body:1}}:{ok:false,status:429,error:'quota'};},
 readInternalProviderText:async response=>response?.body?'Observed actual UI elements from supplied image frames.':'',
};
const analyzer=new Function(...Object.keys(deps),media+
 '\nreturn {analyzeMediaForNonVisionProvider,mediaAttachments};')(...Object.values(deps));
const images=prepared.filter(f=>f.mediaRole==='video-frame');
const summary=await analyzer.analyzeMediaForNonVisionProvider(images,'Build a meme generator based on this uploaded clip','codecraft',()=>{});
assert.match(summary,/VISUAL REFERENCE ANALYSIS FROM ACTUAL UPLOADED MEDIA/);
assert.equal(toolCalls[0].provider,'gemini');
assert.equal(toolCalls[0].args.files.length,4);
assert(events.some(e=>/Reading visual reference: demo.mp4/.test(e.label)&&e.state==='running'));
assert(events.some(e=>/Gemini vision returned an analysis/.test(e.label)&&e.state==='completed'));
assert(events.every(e=>!/(executed tests|modified repository|built a working app)/i.test(e.label)));
const direct=await analyzer.analyzeMediaForNonVisionProvider(images,'Review clip','gemini',()=>{});
assert.equal(direct,'','Native vision models should receive actual frames rather than a forced second analysis');
assert.equal(toolCalls.length,1,'Direct Gemini vision should not call a second analyzer');
visionReady=false;
const cfSummary=await analyzer.analyzeMediaForNonVisionProvider(images,'Review clip','codecraft',()=>{});
assert.match(cfSummary,/Cloudflare/,'When Gemini vision cannot read the media, attempt available Cloudflare vision');
assert.equal(toolCalls.at(-1).provider,'cloudflare');
cloudflareReady=false;
const none=await analyzer.analyzeMediaForNonVisionProvider(images,'Review clip','codecraft',()=>{});
assert.equal(none,'','Failed vision must not invent fabricated descriptions');
assert(events.some(e=>e.state==='error'&&/Could not read/.test(e.label)));

const classifierSource=segment(backend,'function taskProfile(message=', '\nfunction contextActivityPlan(');
const classify=new Function('extractPublicUrl','shouldAutoResearch','detectArtifactRequest','shortTaskSubject',
 classifierSource+'\nreturn taskProfile;')(()=>[],()=>false,()=>null,message=>message);
assert.equal(classify('Build a meme generator where users upload images',[]).kind,'web');
assert.equal(classify('Describe this image',[]).kind,'image');
assert(backend.includes('const mediaAnalysisContext=await analyzeMediaForNonVisionProvider('),
 'Visual preprocessing must run independently of emergency provider fallback');
assert(backend.includes('files:answerFiles,message,systemInstruction'),
 'The selected text model must receive a grounded summary, not unsupported image binary');
assert(backend.includes('if(missingMedia || (visualFiles.length&&!directlyVisionCapable&&!mediaAnalysisContext))'),
 'Unanalyzable visual data must cause an honest error');
assert(!frontend.includes("if (['prepare','response-prep','response-generation','task-next'].includes(id)) return null;"),
 'Do not hide valid backend milestones in the Activity timeline');
assert.equal((frontend.match(/<lottie-player\b/g)||[]).length,6,'Preserve original Lottie elements');
console.log('PASS: 4 actual video frames before native payload; image attachment errors surfaced; independent Gemini/Cloudflare vision analysis with no fabricated evidence; media-aware activities and software task classification.');
