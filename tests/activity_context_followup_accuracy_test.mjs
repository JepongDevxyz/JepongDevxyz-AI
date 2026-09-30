import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import vm from 'node:vm';

const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'missing section: '+start);
  return src.slice(a,b);
}

// Evaluate the intent/context block with only its harmless dependencies.
const contextSource=between(api,'function normalizeIntentText(input=', '\nfunction contextActivityPlan(');
const researchSource=between(api,'function shouldAutoResearchCore(message=', '\nfunction isWebsiteSecurityRequest(');
const plannedResearchGateSource=between(api,'function shouldRunPlannedActivityResearch(', '\nfunction resultMatchesPlannedDomain(');
const plannedResearchRunnerSource=between(api,'async function runPlannedActivityResearch(', '\nfunction isSimpleCasualMessage(');
const webToggleGateSource=between(api,'function shouldRunLiveWebSearch(', '\nfunction extractWeatherLocation(');
const weatherLocationSource=between(api,'function extractWeatherLocation(message=', '\nasync function getEnhancedLiveWebContext(');
const source=contextSource+'\n'+researchSource;
const sandbox={
  extractPublicUrl:text=>String(text||'').match(/https?:\/\/\S+/g)||[],
  detectArtifactRequest:()=>false,
  userAttachmentCount:()=>0,
  responseLengthPreference:()=>null,
  normalizeResponseEffort:()=> 'Medium'
};
const exported=vm.runInNewContext(source+`
;({
  normalizeIntentText,
  looksReferential,
  contextualTaskMessage,
  splitContextualTaskMessage,
  isVagueFreshnessFollowUp,
  isAcknowledgementFollowUp,
  activityTaskSubject,
  taskProfile,
  shouldAutoResearch
})`,sandbox);

assert.equal(exported.shouldAutoResearch('Yung latest ngayon ang gawin mo'),false,
  'vague freshness follow-up must not launch live web research');
assert.equal(exported.shouldAutoResearch('Ano ang latest ChatGPT model ngayon?'),true,
  'a freshness request with a concrete subject should still be live-research eligible');
assert.equal(exported.shouldAutoResearch('Search mo latest ChatGPT model'),true,
  'explicit search request must still search');
assert.equal(exported.shouldAutoResearch('Anong oras na sa Guimba?'),true,
  'a current local-time question must enter the live lookup path');
assert.equal(exported.shouldAutoResearch('Anong oras na sa Manila ngayon?'),true,
  'an explicit present-time question must remain live-research eligible');
assert.equal(exported.shouldAutoResearch('Ano ang presyo ng bigas?'),true,
  'a live price request in Filipino must use live search');
assert.equal(exported.shouldAutoResearch('Maghanap ka ng recipe ng adobo'),true,
  'a broad Filipino search request must use configured search providers');
const extractWeatherLocation=new Function(weatherLocationSource+'\nreturn extractWeatherLocation;')();
assert.equal(extractWeatherLocation('Anong panahon sa Cebu ngayon?'),'Cebu',
  'weather location extraction must use the user-requested Philippine city');
assert.equal(extractWeatherLocation('Guimba Nueva Ecija weather today forecast'),'Guimba Nueva Ecija',
  'weather location extraction must handle a place written before the weather keyword');
assert.equal(extractWeatherLocation("What's the weather like in New York City today?"),'New York City',
  'weather location extraction must handle multi-word international locations');
assert.equal(extractWeatherLocation('Ano ang weather ngayon?'),'',
  'weather without a named location must never silently default to Guimba');
const shouldRunPlannedActivityResearch=new Function('normalizeIntentText',plannedResearchGateSource+'\nreturn shouldRunPlannedActivityResearch;')(value=>String(value||''));
assert.equal(shouldRunPlannedActivityResearch({kind:'backend'},'Check this API version',false,[{query:'latest API',domain:'example.com'}]),false,
  'planned research must never access the web when the toggle is off');
assert.equal(shouldRunPlannedActivityResearch({kind:'general'},'Find current documentation',true,[{query:'current docs',domain:'example.com'}]),true,
  'the enabled toggle must activate relevant planned web research');
const shouldRunLiveWebSearch=new Function('isSimpleCasualMessage',webToggleGateSource+'\nreturn shouldRunLiveWebSearch;')(text=>/^(?:hello|hi)$/i.test(String(text||'').trim()));
assert.equal(shouldRunLiveWebSearch('How does photosynthesis work?',true),true,
  'the enabled Web Search toggle must search ordinary substantive questions');
assert.equal(shouldRunLiveWebSearch('Search for photosynthesis',false),false,
  'the disabled Web Search toggle must block even explicit search requests');
assert.equal(shouldRunLiveWebSearch('Hello',true),false,
  'the enabled Web Search toggle must not search simple greetings');
assert.equal(shouldRunLiveWebSearch('Hello',true,true),true,
  'an explicit Search the web action must force a search when it also enables the toggle');

const history=[
  {role:'user',text:'Paki ayos ang statuses activity ng JepongDevxyz AI UI para accurate sa actual coding task.'},
  {role:'assistant',text:'Sige.'},
  {role:'user',text:'Gawin mong katulad ng Grok at ChatGPT ang activity timeline.'}
];
assert.equal(exported.contextualTaskMessage('Hello',history),'Hello',
  'a greeting must remain the active task instead of inheriting the previous request');
assert.equal(exported.contextualTaskMessage('What is photosynthesis?',history),'What is photosynthesis?',
  'a self-contained question must not inherit an older task');
const dynamicPlannerSource=between(api,'function shouldUseDynamicActivityPlanner(message=', '\nfunction shouldRunPlannedActivityResearch(');
const shouldUseDynamicActivityPlanner=new Function(dynamicPlannerSource+'\nreturn shouldUseDynamicActivityPlanner;')();
assert.equal(shouldUseDynamicActivityPlanner('Hello',[]),false,
  'a greeting must not trigger a stale-task metadata call');

const contextualQuestion=exported.contextualTaskMessage('Why is that still broken?',history);
assert(contextualQuestion.includes('Follow-up: Why is that still broken?'),
  'a genuinely referential question must still inherit recent task context');
assert(exported.contextualTaskMessage('security?',history).includes('Follow-up: security?'),
  'short follow-up fragments must still inherit recent task context');

const contextual=exported.contextualTaskMessage('Yung latest ngayon ang gawin mo',history);
assert(contextual.includes('Follow-up: Yung latest ngayon ang gawin mo'));
assert(/status|activity|Grok|ChatGPT/i.test(contextual),'concrete prior task must be carried into vague follow-up');

const profile=exported.taskProfile(contextual,[]);
assert.notEqual(profile.kind,'research','contextual latest follow-up must keep project/task classification');
assert.equal(profile.freshnessFollowUp,true,'vague freshness follow-up should be marked as continuation');
assert(!/Yung latest ngayon ang gawin mo/i.test(profile.subject),
  'activity subject should use the concrete prior task instead of the vague follow-up');
assert.equal(shouldUseDynamicActivityPlanner(contextual),true,
  'a real coding follow-up must retain the dynamic task planner');

assert.equal(exported.isAcknowledgementFollowUp('Sige'),true,
  'short acknowledgement follow-ups must be recognized');
const acknowledged='Gawan mo ako ng HTML snake game / Follow-up: Sige';
assert.equal(exported.activityTaskSubject(acknowledged),'HTML snake game',
  'Sige/OK must never leak into the Activity subject or every subsequent status row');

assert(api.includes("getEnhancedLiveWebContext(message,webSearch,emit,{fast:fastAnswers,contextMessage:taskMessage,forceWebSearch:body.forceWebSearch===true})"),
  'live-web gate must evaluate the literal current message and use context only for query construction');
const liveWebSource=between(api,'async function getEnhancedLiveWebContext(', '\n\nfunction normalizeHistory(');
assert(liveWebSource.indexOf('runConfiguredWebSearch(searchQuery') < liveWebSource.indexOf('if(isWeather){'),
  'weather must use configured web search providers before any dedicated-weather fallback');
assert(!/Searching the web with \$\{name\}/.test(liveWebSource),
  'search activity must not expose configured provider names');
assert(liveWebSource.indexOf('runConfiguredWebSearch(searchQuery') < liveWebSource.indexOf('noKeyWebSearch(searchQuery'),
  'all configured APIs must be attempted before public-source fallbacks');
assert(liveWebSource.includes('No configured Web Search API found • checking public sources'),
  'when no configured API exists, Activity must say so and identify the public-source fallback');
assert(liveWebSource.includes('state===\'completed\'')&&liveWebSource.includes('Found ${resultCount} relevant result'),
  'a provider status must distinguish a real successful result from just attempting an API');
assert(!/Found \$\{resultCount\} relevant result\$\{resultCount===1\?'':'s'\} • \$\{name\}/.test(liveWebSource),
  'successful result activity must not expose the Web Search API provider name');
assert(liveWebSource.includes('Found ${resultCount} relevant result${resultCount===1?\'\':\'s\'}'),
  'successful result activity must retain the relevant result count');
assert(liveWebSource.includes('wttr.in (${attemptedSummary})'),
  'weather fallback completion must retain whether configured APIs were tried first');
assert(liveWebSource.includes('shouldRunLiveWebSearch(message,webSearch,forceWebSearch)'),
  'the main web search pipeline must be strictly controlled by the on/off toggle');
assert(plannedResearchRunnerSource.indexOf('runConfiguredWebSearch(') < plannedResearchRunnerSource.indexOf('noKeyWebSearch('),
  'planned research must try configured APIs before public fallback sources');
assert(!/Searching the web with \$\{name\}|Found \$\{resultCount\} relevant results? • \$\{name\}/.test(plannedResearchRunnerSource),
  'planned research activity must not expose configured provider names');
assert(html.includes('<strong>Web Search</strong>')&&html.includes('aria-label="Web Search"'),
  'the settings switch must be named Web Search');
assert(html.includes('id="modelProviderTitle">JepongDevxyz AI</div>'),
  'the model carousel header must use the JepongDevxyz AI brand before rendering');
assert(/if\(title\)\s*title\.textContent\s*=\s*['"]JepongDevxyz AI['"]/.test(html),
  'every provider/model carousel page must retain the JepongDevxyz AI header');
const modelDisplaySource=between(html,'const MODEL_DISPLAY_NAMES = {','\n        function providerLabel(');
const getModelDisplayName=new Function(modelDisplaySource+'\nreturn getModelDisplayName;')();
assert.equal(getModelDisplayName('DeepSeek-V4-Flash'),'DeepSeek V4 Flash',
  'model IDs with provider-specific casing must display the canonical DeepSeek V4 Flash name');
assert.equal(getModelDisplayName('deepseek-ai/DeepSeek-V4-Flash-0731'),'DeepSeek V4 Flash 0731',
  'provider namespaces must not leak into the selected model name');
assert.equal(getModelDisplayName('deepseek-v4.1-flash'),'DeepSeek V4.1 Flash',
  'versioned DeepSeek names must retain the correct version');
assert.equal(getModelDisplayName('custom/team-assistant-2.5','Team Assistant 2.5'),'Team Assistant 2.5',
  'friendly dynamic/custom names must be preserved');
assert(html.includes('getModelDisplayName(currentSelectedModel'),
  'the selected model header must use the canonical model-name resolver');
assert(html.includes('getModelDisplayName(id,model.name||id)'),
  'dynamically loaded provider catalogs must use the same canonical model-name resolver');
assert(api.includes('forceWebSearch===true'),
  'manual Search the web requests must bypass intent detection and force the configured web search');
assert(html.includes('regenerateAnswer(btn,true)')&&html.includes('forceWebSearch: forceWebSearch'),
  'the message menu Search the web action must send an explicit force-search flag');
assert(api.includes("if(!terms.length)return false;"),
  'empty/generic search terms must not accept arbitrary Wikipedia results');

assert(html.includes("if(summary)summary.textContent='Thinking';"),
  'activity header should remain Thinking instead of provider connection text');
assert(html.includes("card.dataset.taskSummary=String(normalized.label||'').slice(0,220)"),
  'server task context should be retained separately from header plumbing');
assert(!html.includes("if(summary&&normalized.label)summary.textContent=String(normalized.label).slice(0,88);"),
  'task-context must not overwrite the ChatGPT/Grok-like header');

console.log('PASS: vague latest follow-ups stay bound to the real task, irrelevant web research is suppressed, and activity header remains task-neutral.');
