import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');

const between=(src,start,end)=>{
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing source boundary: '+start);
  return src.slice(a,b);
};

// Regression: sending immediately after choosing a file must wait for browser
// extraction/compression/frame sampling before serializing request files.
const send=between(html,'        async function sendMessage() {','        /* 7. REAL-TIME PING');
const wait=send.indexOf('await waitForAttachmentJobs();');
const snapshot=send.indexOf('const selectedAttachmentSnapshot = [...selectedFilesData];');
const validate=send.indexOf('const failedAttachments=selectedFilesData.filter');
assert(wait>=0&&validate>wait&&snapshot>validate,
  'attachment jobs and readability validation must finish before request serialization');
assert(send.includes("if(file?.kind==='video')")&&send.includes('!sampled&&!file?.nativeData'),
  'a video with neither native data nor sampled frames must never be sent as readable');
assert(send.includes("if(file?.kind==='image')return !file?.data"),
  'an image without compressed visual data must never be sent as readable');

// Regression for the exact prompt visible in the reported screenshots: a build
// request mentioning image upload is a BUILD task, not an image-analysis task.
const planSource=between(api,'function cleanTaskText(message=','\nfunction linkLabel(');
const sandbox={
  extractPublicUrl:()=>[],
  isSafePublicUrl:()=>false,
  isWebsiteSecurityRequest:()=>false,
  shouldAutoResearch:()=>false,
  detectArtifactRequest:()=>null,
  activity:()=>{}
};
vm.createContext(sandbox);
vm.runInContext(planSource,sandbox);
const memePrompt='Build a meme generator where users upload or pick an image, add draggable top and bottom text, and adjust font size and outline.';
const profile=sandbox.taskProfile(memePrompt,[]);
assert.equal(profile.kind,'web','build/generator intent must win over incidental image words');
const plan=sandbox.contextActivityPlan(memePrompt,[]);
assert.match(plan.steps[0].label,/requested app or website build/i);
assert.doesNotMatch(plan.steps[0].label,/image task/i);
const work=sandbox.taskWorkingActivity(plan);
assert.match(work.label,/requested implementation/i);
assert.match(work.label,/meme generator/i);

// The browser's temporary lead must also stay literal instead of keyword
// classifying the prompt before server Activity arrives.
const initialSource=between(html,"        function initialActivityForRequest(promptText='',files=[]){",
  '\n        function normalizeActivityEventForUI(');
const initial=new Function(initialSource+'\nreturn initialActivityForRequest;')();
const firstLead=initial(memePrompt,[]);
assert.match(firstLead.label,/Working on: Build a meme generator/i);
assert.doesNotMatch(firstLead.label,/image task/i);
const fileLead=initial('Please review this and tell me what changed',[
  {name:'clip.mp4',mimeType:'video/mp4',kind:'video'},
  {name:'clip.mp4 — frame 1',parentName:'clip.mp4',mimeType:'image/jpeg',mediaRole:'video-frame'}
]);
assert.match(fileLead.label,/uploaded video/i);
assert.match(fileLead.label,/Please review this and tell me what changed/i);

// OpenAI-compatible models such as CodeCraft/NVIDIA/OpenRouter can be tried
// with real image/frame parts for evidence. Unsupported selected models fall
// through to configured Gemini/Cloudflare analyzers in production.
const visionSource=between(api,'function buildOpenAIMessages(history, message, systemInstruction) {',
  '\nfunction smartRoute(');
const buildVision=new Function('normalizeHistory',
  visionSource+'\nreturn buildOpenAIVisionMessages;')(()=>[]);
const messages=buildVision([],'Read what is visible','system',[
  {mimeType:'image/jpeg',data:'AAA'},
  {mimeType:'image/jpeg',data:'BBB',mediaRole:'video-frame'},
  {mimeType:'video/mp4',data:'CCC'}
]);
const user=messages.at(-1);
assert.equal(user.role,'user');
assert(Array.isArray(user.content));
assert.equal(user.content.filter(x=>x.type==='image_url').length,2,
  'photo and sampled video frame must be sent as visual parts; raw video is not mislabelled as image_url');
assert.equal(user.content[0].type,'text');

const usableSource=between(api,"function usableMediaAnalysis(text=''){",
  '\nasync function analyzeMediaForNonVisionProvider(');
const usable=new Function(usableSource+'\nreturn usableMediaAnalysis;')();
assert.equal(usable("I can't see the attached image, please upload it."),false,
  'a model refusal must not be accepted as visual evidence');
assert.equal(usable('The screenshot shows a dark chat interface with an Ask tab and a model selector.'),true);

const analyzer=between(api,'async function analyzeMediaForNonVisionProvider(',
  '\nfunction extractCodeBlocks(');
assert(analyzer.includes('runOpenAICompatible(selectedProvider')&&analyzer.includes('visionPayload:true'),
  'selected compatible model must get a real vision attempt first');
assert(analyzer.includes("configured('gemini')")&&analyzer.includes("configured('cloudflare')"),
  'configured vision bridges must remain available for text-only response models');
assert(analyzer.includes('usableMediaAnalysis(text)'),
  'refusal text must never be injected as if it were grounded attachment evidence');

// All response providers still receive the extracted/vision evidence through
// the common system context rather than silently losing media on text models.
const process=between(api,'async function processChat(','\nasync function providerUsageSnapshot');
assert(process.includes('const mediaAnalysisContext=visualParts.length'));
assert(process.includes('const combinedToolContext='));
assert(process.includes("activity(emit,'thinking',taskWork.label,'running',taskWork.kind)"));
assert(process.includes("activity(emit,'generation',taskGeneration.label,'running',taskGeneration.kind)"));

assert.equal((html.match(/<lottie-player\b/g)||[]).length,6,'unrelated welcome animations must remain untouched');
console.log('PASS: prepared attachments cannot race Send; selected vision + bridge evidence reaches all response models; exact build prompt gets task-accurate Activity.');
