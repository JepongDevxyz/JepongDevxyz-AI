import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const section=(source,start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,`Missing source section: ${start}`);
  return source.slice(a,b);
};

const historyPolicySource=section(html,'function personalizationWithHistoryPolicy(', 'function persistPersonalization(');
const historyPolicy=new Function('PERSONALIZATION_DEFAULTS',historyPolicySource+'\nreturn personalizationWithHistoryPolicy;')({
  voicePersona:'Jepong',voiceModel:'Live',language:'Auto-detect',voiceSpeed:1,voicePitch:1,voiceAutoPreview:true
});
const voiceSettings={referenceRecordHistory:true,voicePersona:'Luna',voiceModel:'Azure',language:'Filipino',voiceSpeed:1.2,voicePitch:.8,voiceAutoPreview:false};
assert.equal(historyPolicy(voiceSettings).voicePersona,'Luna','ON must retain the selected voice preference');
assert.equal(historyPolicy({...voiceSettings,referenceRecordHistory:false}).voicePersona,'Jepong','OFF must not retain the selected voice preference');
assert.equal(historyPolicy({...voiceSettings,referenceRecordHistory:false}).voiceSpeed,1,'OFF must restore the default tuning');
assert(html.includes('personalizationSettings=personalizationWithHistoryPolicy({...PERSONALIZATION_DEFAULTS,...personalizationSettings,...remote})'),'Cloud settings hydration must enforce the OFF policy before local persistence');
assert(html.includes("localStorage.setItem('jepong_personalization',JSON.stringify(personalizationWithHistoryPolicy()))"),'Cloud memory hydration must persist only policy-approved preferences');

const executeSource=section(html,'function executeSnippetFromButton(btn) {','function openCodeFullscreenFromButton(btn) {');
const execute= new Function('personalizationSettings','snippetFromButton','document','closeTransientSurfaces','buildRunnableSnippetDocument','showModernToast',executeSource+'\nreturn executeSnippetFromButton;');
const runState={calls:0,modal:{classList:{add(){runState.calls++;}}},iframe:{srcdoc:''}};
const runButton={};
const snippetFromButton=()=>({code:'<h1>preview</h1>',lang:'html'});
const runWhenOn=execute({canvasPreview:true},snippetFromButton,{getElementById:id=>id==='codeRunnerModal'?runState.modal:runState.iframe},()=>{},code=>code,()=>{});
runWhenOn(runButton);
assert.equal(runState.calls,1,'Canvas ON must open runnable code');
assert.equal(runState.iframe.srcdoc,'<h1>preview</h1>','Canvas ON must populate the real preview');
runState.calls=0;runState.iframe.srcdoc='';let denied='';
const runWhenOff=execute({canvasPreview:false},snippetFromButton,{getElementById:id=>id==='codeRunnerModal'?runState.modal:runState.iframe},()=>{},code=>code,msg=>denied=msg);
runWhenOff(runButton);
assert.equal(runState.calls,0,'Canvas OFF must not run or open preview');
assert.equal(runState.iframe.srcdoc,'','Canvas OFF must not populate preview code');
assert(denied,'Canvas OFF should explain why the action is unavailable');

const filesSource=section(html,'async function addSelectedFiles(fileList){','async function handleFileSelect(e){');
const addFiles=new Function('personalizationSettings','showModernToast','selectedFilesData',filesSource+'\nreturn addSelectedFiles;');
const selected=[];let fileNotice='';
await addFiles({librarySearch:false},msg=>fileNotice=msg,selected)([{name:'private.txt'}]);
assert.equal(selected.length,0,'File search OFF must reject attachments before processing');
assert(fileNotice,'File search OFF should tell the user how to enable attachments');

const gateStart=api.indexOf('function applyChatFeatureSettings(');
const gateEnd=api.indexOf('\nfunction ',gateStart+10);
assert(gateStart>=0&&gateEnd>gateStart,'API must expose a request-boundary settings gate');
const featureGate=new Function(api.slice(gateStart,gateEnd)+'\nreturn applyChatFeatureSettings;')();
const gated=featureGate({message:'hello',files:[{name:'private.txt'}],plugins:{github:{enabled:true}},personalization:{librarySearch:false,connectorSearch:false}});
assert.deepEqual(gated.files,[],'API must not pass attachments while File search is OFF');
assert.equal(gated.plugins.github,undefined,'API must not query connectors while Connector search is OFF');
const internalPlugins={superpowers:{enabled:true},skills:['tdd'],autoUse:true};
const frontendPluginContext={...internalPlugins,plugins:[{id:'gmail',name:'Gmail'}],github:{enabled:true,repo:'owner/repo'}};
assert.deepEqual(featureGate({plugins:frontendPluginContext,personalization:{connectorSearch:false}}).plugins,{...internalPlugins,plugins:[]},'Connector OFF must preserve internal skills but strip connected-plugin mentions and connector context');
const enabled=featureGate({message:'hello',files:[{name:'private.txt'}],plugins:{github:{enabled:true}},personalization:{librarySearch:true,connectorSearch:true}});
assert.equal(enabled.files.length,1,'File search ON must preserve attachments');
assert.equal(enabled.plugins.github.enabled,true,'Connector search ON must preserve connected-service context');

const pluginContextSource=section(html,'function getChatPluginContext(){','function getHistoryForRequest(history)');
const getChatPluginContext=new Function('window','personalizationSettings',pluginContextSource+'\nreturn getChatPluginContext;');
const allPluginContext={...internalPlugins,github:{enabled:true,repo:'owner/repo'}};
assert.deepEqual(getChatPluginContext({JDPlugins:{contextForChat:()=>allPluginContext}},{connectorSearch:false})(),internalPlugins,'Connector OFF must preserve internal skills but omit connected services');
assert.equal(getChatPluginContext({JDPlugins:{contextForChat:()=>allPluginContext}},{connectorSearch:true})().github.repo,'owner/repo','Connector ON must provide connected service context');

const effortApi=section(api,"const RESPONSE_EFFORT_LEVELS=['Instant'",'function geminiThinkingConfig(');
const effort=new Function('outputBudgetFor',effortApi+'\nreturn {normalizeResponseEffort,responseEffortRank,responseEffortPolicy,effortOutputBudgetFor,nativeEffortFields};')(()=>4096);
const levels=['Instant','Low','Medium','High','Extra','Max'];
const ranks=levels.map(level=>effort.responseEffortRank(level));
assert.deepEqual(ranks,[0,1,2,3,4,5],'Every effort label must select its own backend rank');
const budgets=levels.map(level=>effort.effortOutputBudgetFor('hello',level));
assert.equal(new Set(budgets).size,6,'Every effort tier must change the actual output/reasoning budget');
const native=levels.map(level=>effort.nativeEffortFields('openrouter','openai/gpt-5',level).reasoning.effort);
assert.deepEqual(native,['none','minimal','low','medium','high','xhigh'],'Every effort tier must reach the provider request distinctly');

const setterSource=section(html,'function setResponseEffort(level, options={}){','function setResponseEffortByIndex(');
const persisted=[];const selectedEffort={};
const setEffort=new Function('normalizeResponseEffortClient','personalizationSettings','persistPersonalization','renderPersonalizationSettings','updateResponseEffortUI','closeResponseEffortMenu','showModernToast',setterSource+'\nreturn setResponseEffort;')(
  value=>levels.includes(value)?value:'Instant',selectedEffort,()=>persisted.push(selectedEffort.intelligence),()=>{},()=>{},()=>{},()=>{}
);
for(const level of levels)setEffort(level,{toast:false});
assert.deepEqual(persisted,levels,'Selecting each effort tier must persist and send that exact selection');
assert.equal(selectedEffort.fastAnswers,false,'Non-Instant tiers must not be overridden by the fast-answer boolean');
console.log('PASS: toggle ON/OFF gates Canvas, files, connectors, record history; all six effort levels alter real request policy.');
