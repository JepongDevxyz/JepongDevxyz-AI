// JEPONGDEVXYZ AI — Activity/task engine core
// Extracted from api/chat.js (lines 2777-4155)

import { runConfiguredWebSearch } from '../api/web-search.js';
import { accumulateOpenAIToolDeltas } from '../tools/index.js';
import { activity, configured, detectArtifactRequest, json, providerLabel } from './guard.js';
import { looksAmbiguousButLowRisk, looksReferential, normalizeIntentText } from './helpfulness.js';
import { cleanActivityLabel, defaultActivityBlueprint } from './orchestrator.js';
import { attachmentRootName, buildLiveSearchQuery, buildLiveSourceContext, enrichSearchResults, executionEnvironmentContext, extractCodeBlocks, extractPublicUrl, isSimpleCasualMessage, isWebsiteSecurityRequest, noKeyWebSearch, probeRequestedUrls, safeJsonResponse, safePublicFetch, shouldAutoResearch, shouldVerifyTask, staticVerifyText, stripHtml, textFromAttachment } from './research.js';
/* =========================================================
   DYNAMIC CONTEXT-AWARE ACTIVITY ENGINE
   Labels are based on the user's actual request/files/links.
   Search/read/test claims are emitted only after the action occurs.
   ========================================================= */

export function cleanTaskText(message=''){
  return String(message||'')
    .replace(/https?:\/\/\S+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export function historyMessageText(item={}){
  const direct=item?.text ?? item?.content ?? item?.message;
  if(typeof direct==='string' && direct.trim())return direct.replace(/\s+/g,' ').trim();
  if(Array.isArray(item?.parts)){
    return item.parts.map(part=>typeof part?.text==='string'?part.text:'')
      .join(' ').replace(/\s+/g,' ').trim();
  }
  return '';
}

export function splitContextualTaskMessage(message=''){
  const raw=String(message||'').replace(/\s+/g,' ').trim();
  const marker=' / Follow-up: ';
  const index=raw.lastIndexOf(marker);
  if(index<0)return {anchor:'',followUp:'',raw};
  return {
    anchor:raw.slice(0,index).trim(),
    followUp:raw.slice(index+marker.length).trim(),
    raw
  };
}

export function isVagueFreshnessFollowUp(message=''){
  const t=normalizeIntentText(message);
  if(!/\b(latest|current|currently|now|ngayon|kasalukuyan|updated|update|pinaka bago|newest)\b/i.test(t))return false;
  const words=t.split(/\s+/).filter(Boolean);
  if(words.length>10)return false;
  const stripped=t
    .replace(/\b(latest|current|currently|now|ngayon|kasalukuyan|updated|update|pinaka bago|newest)\b/gi,' ')
    .replace(/\b(iyong|yung|ito|iyan|iyon|ganito|ganyan|ang|na|naman|sana|please|paki|mo|ko|natin|gawin|gawing|use|do|make|it|that|this|the|one|version)\b/gi,' ')
    .replace(/[^a-z0-9]+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
  return !stripped || looksReferential(message);
}

export function isAcknowledgementFollowUp(message=''){
  const t=normalizeIntentText(message)
    .replace(/[.!?,…]+$/g,'')
    .replace(/\s+/g,' ')
    .trim();
  if(!t)return false;
  return /^(?:sige(?: po)?|ok(?:ay)?(?: po)?|oo(?: po)?|opo|yes|yep|yeah|go|go ahead|proceed|continue|tuloy|ituloy|gawin mo(?: na)?|do it|ayos|sure|fine|salamat|thanks|thank you)$/i.test(t);
}

export function taskAnchorScore(text=''){
  const t=normalizeIntentText(text);
  let score=Math.min(5,t.split(/\s+/).filter(Boolean).length/4);
  if(extractPublicUrl(text).length)score+=6;
  if(/\b(github|repository|repo|vercel|deployment|app|website|ui|ux|code|api|backend|frontend|android|apk|model|provider|plugin|workflow|project|status activity|notification|chatbox|jepongdevxyz)\b/i.test(t))score+=5;
  if(/\b(ayusin|fix|edit|update|modify|build|create|implement|test|verify|review|research|search|hanapin|maghanap)\b/i.test(t))score+=2;
  return score;
}

export function contextualTaskMessage(message='', history=[]){
  const current=String(message||'').replace(/\s+/g,' ').trim();
  if(!current)return current;

  const words=current.split(/\s+/).filter(Boolean);
  const independentGreeting=/^(?:hi|hello|hey|yo|kumusta|kamusta|thanks|thank you|salamat)[!?.\s]*$/i.test(current);
  const shortFollowUpFragment=/^(?:security|safe|working|gumagana|okay|ayos|fix|why|bakit|paano|how)[!?.\s]*$/i.test(current)||
    (/^what about\b/i.test(current)&&words.length<=5);
  const independentQuestion=current.includes('?')&&!looksReferential(current)&&!shortFollowUpFragment;
  const independentRequest=/^(?:tell me|explain|define|calculate|write|translate|summari[sz]e|search|find|give me|make|create|build)\b/i.test(current)&&
    words.length>=2&&!looksReferential(current);
  // Short, complete turns start fresh. Only fragments and references inherit context.
  if(independentGreeting||independentQuestion||independentRequest)return current;

  const vague=words.length<=9 || looksReferential(current) ||
    /^(?:ito|iyan|yan|yun|iyon|iyong|yung|ganito|ganyan|same|still|ulit|again|security|safe|working|gumagana|okay|ayos|fix|why|bakit|paano|how|what about|e kung|eh kung)\b/i.test(current);
  if(!vague)return current;

  const currentNorm=normalizeIntentText(current);
  const prior=(Array.isArray(history)?history:[])
    .filter(x=>String(x?.role||'').toLowerCase()==='user')
    .map(historyMessageText)
    .map(x=>String(x||'').replace(/\s+/g,' ').trim())
    .filter(Boolean)
    .filter(x=>normalizeIntentText(x)!==currentNorm)
    .slice(-6);

  if(!prior.length)return current;

  // Follow-up context must be RECENT before it is "important". An older long
  // repository/project prompt must never beat the user's immediately preceding
  // concrete task just because it contains more keywords.
  const reversed=[...prior].reverse();
  const anchor=reversed.find(text=>{
    const words=normalizeIntentText(text).split(/\s+/).filter(Boolean);
    return taskAnchorScore(text)>=2 && (words.length>5 || extractPublicUrl(text).length>0 || !looksAmbiguousButLowRisk(text));
  }) || prior.at(-1);
  const recent=prior.at(-1);
  // Include the latest user turn only when it adds concrete context. Tiny
  // acknowledgements such as "sige"/"okay" must not pollute the task subject.
  const recentUseful=recent && recent!==anchor && taskAnchorScore(recent)>=2 && !looksAmbiguousButLowRisk(recent);
  const context=(recentUseful?`${anchor} / ${recent}`:anchor).slice(-520);
  return `${context} / Follow-up: ${current}`;
}

export function activityTaskSubject(message=''){
  const parts=splitContextualTaskMessage(message);
  if(parts.followUp && (isAcknowledgementFollowUp(parts.followUp)||looksReferential(parts.followUp)||isVagueFreshnessFollowUp(parts.followUp))){
    return shortTaskSubject(parts.anchor||parts.raw);
  }
  return shortTaskSubject(parts.raw);
}

export function shortTaskSubject(message=''){
  let t=cleanTaskText(message)
    .replace(/^(paki\s+)?(gawan|gumawa|ayusin|i-?test|itest|test|verify|check|suriin|review|hanapin|maghanap|create|build|make|fix|please)\s+(mo\s+)?(ako\s+|kami\s+|naman\s+|ito\s+|itong\s+)?/i,'')
    .replace(/^(?:ang|ng)\s+/i,'')
    .replace(/\b(paki\s+)?(nga|naman|sana|please)\b/gi,' ')
    .replace(/\s+/g,' ')
    .trim();

  if(!t)t='your request';
  if(t.length>82)t=t.slice(0,79).replace(/\s+\S*$/,'')+'…';
  return t;
}

export function taskProfile(message='', files=[]){
  const t=String(message||'').toLowerCase();
  const urls=extractPublicUrl(message);
  const fileNames=(Array.isArray(files)?files:[]).map(f=>String(f?.name||f?.filename||'')).filter(Boolean);
  const hasCodeFiles=fileNames.some(n=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|cs|sql|yaml|yml|sh|gradle|properties|toml)$/i.test(n));
  const hasImages=(Array.isArray(files)?files:[]).some(f=>String(f?.mimeType||'').startsWith('image/'));
  const hasVideos=(Array.isArray(files)?files:[]).some(f=>String(f?.mimeType||'').startsWith('video/')||f?.mediaRole==='video-frame');

  let kind='general';
  // Classify the task's actual domain before the generic word "app".
  // A request such as "make an app that can edit/commit/push to GitHub"
  // is a GitHub client task, not automatically a website task.
  if(/\b(apk|android|web\s*to\s*apk|webview|gradle|manifest|kotlin)\b/i.test(t))kind='android';
  else if(/\b(github|repository|repo|pull request|workflow|actions|commit|push|branch|clone)\b/i.test(t))kind='github';
  else if(/\b(vercel|deployment|deploy|serverless|edge function)\b/i.test(t))kind='deployment';
  else if(/\b(api|endpoint|backend|webhook|server|database)\b/i.test(t))kind='backend';
  else if(/\b(?:build|create|make|gawan|gumawa|implement|develop)\b/i.test(t) &&
          /\b(?:app|application)\b/i.test(t) &&
          !/\b(?:website|web app|html|css|javascript|browser)\b/i.test(t))kind='app';
  else if(/\b(?:build|create|make|gawan|gumawa|implement|develop)\b/i.test(t) &&
          /\b(?:website|web app|generator|editor|game|tool)\b/i.test(t))kind='web';
  else if(/\b(html|css|javascript|typescript|frontend|website|web app|ui|responsive)\b/i.test(t)||hasCodeFiles)kind='web';
  else if(/\b(pdf|document|report|reviewer|essay|worksheet|notes|docx|pptx|spreadsheet)\b/i.test(t))kind='document';
  else if(/\b(video|clip|recording)\b/i.test(t)||hasVideos)kind='video';
  else if(/\b(image|photo|picture|logo|design|larawan)\b/i.test(t)||hasImages)kind='image';
  else if(shouldAutoResearch(message) || /\b(research|search|hanapin|maghanap|tingnan online)\b/i.test(t))kind='research';
  else if(/\b(math|equation|solve|school|study|lesson|explain|homework)\b/i.test(t))kind='study';
  else if(/\b(write|rewrite|email|message|caption|essay|story|script|translate|translation|summarize|summary|proofread|grammar)\b/i.test(t))kind='writing';
  else if(/\b(compare|comparison|choose|recommend|recommendation|best|which|alin|budget|plan|planning|pros and cons)\b/i.test(t))kind='decision';
  else if(/\b(error|bug|crash|issue|problem|not working|hindi gumagana|troubleshoot|why failing|bakit ayaw)\b/i.test(t))kind='troubleshooting';

  const intent={
    create:/\b(gawan|gumawa|create|make|build|generate|implement|develop)\b/i.test(t),
    edit:/\b(ayusin|fix|edit|update|modify|refactor|repair)\b/i.test(t),
    test:/\b(test|i-?test|itest|verify|validate|check|suriin|debug|working|gumagana)\b/i.test(t),
    research:shouldAutoResearch(message),
    download:Boolean(detectArtifactRequest(message,files))
  };

  let subtype='general';
  if(kind==='web'){
    subtype=/\b(game|snake|tetris|pong|platformer|quiz game|memory game)\b/i.test(t)?'game':
      /\b(generator|editor|tool|calculator|converter|dashboard)\b/i.test(t)?'tool':
      /\b(ui|ux|interface|layout|design|responsive)\b/i.test(t)?'ui':'website';
  }else if(kind==='app') subtype=intent.edit||intent.test?'app-change':'app-build';
  else if(kind==='android') subtype=intent.edit||intent.test?'android-repair':'android-build';
  else if(kind==='github') subtype=intent.create&&/\b(app|application|client|editor|tool)\b/i.test(t)?'github-client':
      intent.edit?'repository-edit':intent.test?'repository-check':'repository';
  else if(kind==='backend') subtype=/\bwebhook\b/i.test(t)?'webhook':/\b(database|sql|schema)\b/i.test(t)?'database':'api';
  else if(kind==='writing') subtype=/\b(translate|translation)\b/i.test(t)?'translation':/\b(summarize|summary)\b/i.test(t)?'summary':/\b(email|message)\b/i.test(t)?'message':'writing';
  else if(kind==='study') subtype=/\b(math|equation|solve|calculate)\b/i.test(t)?'math':/\b(quiz|reviewer|flashcard)\b/i.test(t)?'review':'explain';
  else if(kind==='research') subtype=/\b(news|latest|current|today|now|ngayon)\b/i.test(t)?'current':'research';
  else if(kind==='image') subtype=hasImages?'image-review':'image-task';
  else if(kind==='video') subtype=hasVideos?'video-review':'video-task';
  else if(kind==='document') subtype=/\b(summarize|summary)\b/i.test(t)?'document-summary':/\b(review|inspect|analyze|analyse)\b/i.test(t)?'document-review':'document';
  else if(kind==='decision') subtype=/\b(compare|comparison|pros and cons)\b/i.test(t)?'compare':'recommend';
  else if(kind==='troubleshooting') subtype='diagnose';

  const contextual=splitContextualTaskMessage(message);
  return {
    kind,subtype,intent,urls,fileNames,
    subject:activityTaskSubject(message),
    followUpText:contextual.followUp||'',
    contextualFollowUp:Boolean(contextual.followUp),
    freshnessFollowUp:Boolean(contextual.followUp&&isVagueFreshnessFollowUp(contextual.followUp)&&!shouldAutoResearch(contextual.followUp))
  };
}


export function taskSpecificActivityCopy(profile={}, phase='context'){
  const subject=String(profile.subject||'your request').slice(0,110);
  const kind=String(profile.kind||'general');
  const subtype=String(profile.subtype||'general');
  const intent=profile.intent||{};
  const key=kind+':'+subtype;

  const specific={
    'web:game':{
      context:'Planning the requested game',
      prepared:'Structuring the game mechanics and controls',
      prepared2:'Setting up the page, game loop, and interaction flow',
      work:'Building movement, collision, scoring, and UI behavior',
      audit:'Checking gameplay, controls, restart, and delivery',
      verify:'Checking the generated game code'
    },
    'web:ui':{
      context:'Reviewing the requested interface',
      prepared:'Mapping layout, hierarchy, and responsive behavior',
      prepared2:'Preparing interaction states and component structure',
      work:'Building the interface and interactions',
      audit:'Checking layout, responsiveness, and requested behavior',
      verify:'Checking the generated interface code'
    },
    'web:tool':{
      context:'Planning the requested web tool',
      prepared:'Mapping inputs, outputs, and interaction flow',
      prepared2:'Preparing the component and state structure',
      work:'Implementing the requested tool behavior',
      audit:'Checking the tool flow and requested functions',
      verify:'Checking the generated tool code'
    },
    'android:android-repair':{
      context:'Reviewing the Android issue',
      prepared:'Tracing affected app, manifest, and build configuration',
      prepared2:'Preparing the smallest evidence-backed repair',
      work:'Applying the Android fix',
      audit:'Checking app, manifest, build, and delivery requirements',
      verify:'Checking the generated Android code'
    },
    'android:android-build':{
      context:'Planning the Android implementation',
      prepared:'Mapping screens, app structure, and build requirements',
      prepared2:'Preparing manifest, resources, and source structure',
      work:'Building the Android implementation',
      audit:'Checking app structure and delivery requirements',
      verify:'Checking the generated Android code'
    },
    'backend:api':{
      context:'Reviewing the API task',
      prepared:'Mapping inputs, outputs, validation, and failure paths',
      prepared2:'Preparing endpoint and data-flow structure',
      work:'Implementing the requested API behavior',
      audit:'Checking API behavior, validation, and edge cases',
      verify:'Checking the generated backend code'
    },
    'backend:webhook':{
      context:'Reviewing the webhook task',
      prepared:'Mapping events, payloads, retries, and failure paths',
      prepared2:'Preparing webhook validation and response flow',
      work:'Implementing the requested webhook behavior',
      audit:'Checking webhook behavior and error handling',
      verify:'Checking the generated webhook code'
    },
    'backend:database':{
      context:'Reviewing the database task',
      prepared:'Mapping schema, constraints, and query behavior',
      prepared2:'Preparing data-flow and validation changes',
      work:'Working through the requested database changes',
      audit:'Checking data behavior and constraints',
      verify:'Checking the generated database code'
    },
    'github:github-client':{
      context:'Planning the GitHub client',
      prepared:'Mapping authentication, repository access, edit, commit, and push',
      prepared2:'Preparing files, branches, commits, and push flow',
      work:'Building the requested GitHub client flow',
      audit:'Checking authentication, editing, commit, and push behavior',
      verify:'Checking the generated GitHub client code'
    },
    'writing:translation':{
      context:'Reviewing the translation request',
      prepared:'Identifying meaning, tone, and target-language requirements',
      prepared2:'Preparing terminology and phrasing choices',
      work:'Translating while preserving meaning and tone',
      audit:'Checking meaning, tone, and consistency'
    },
    'writing:summary':{
      context:'Reviewing the summary request',
      prepared:'Identifying the key points and requested depth',
      prepared2:'Organizing the information into a concise structure',
      work:'Condensing the content',
      audit:'Checking coverage, clarity, and requested length'
    },
    'writing:message':{
      context:'Reviewing the message request',
      prepared:'Identifying purpose, audience, and tone',
      prepared2:'Preparing the message structure',
      work:'Drafting the requested message',
      audit:'Checking clarity, tone, and requested format'
    },
    'study:math':{
      context:'Reviewing the problem',
      prepared:'Identifying the givens, target, and method',
      prepared2:'Setting up the calculation',
      work:'Working through the solution',
      audit:'Checking the result against the question'
    },
    'decision:compare':{
      context:'Reviewing the comparison',
      prepared:'Identifying the criteria that matter',
      prepared2:'Organizing the tradeoffs consistently',
      work:'Comparing the options against the same criteria',
      audit:'Checking the comparison and tradeoffs'
    },
    'troubleshooting:diagnose':{
      context:'Reviewing the reported problem',
      prepared:'Tracing the symptom and likely failure boundary',
      prepared2:'Narrowing the root cause and safest fix',
      work:'Preparing the fix',
      audit:'Checking the fix against the reported symptom'
    }
  };

  const generic={
    app:{
      context:intent.edit?'Reviewing the requested app changes':'Planning the requested application',
      prepared:'Mapping features, data flow, and platform requirements',
      prepared2:'Preparing application structure and interaction flow',
      work:intent.edit?'Applying the requested application changes':'Building the requested application',
      audit:'Checking the application flow and requested features',
      verify:'Checking the generated application code'
    },
    web:{
      context:intent.edit?'Reviewing the requested website changes':'Planning the requested website',
      prepared:'Mapping structure, behavior, and responsive requirements',
      prepared2:'Preparing the implementation flow',
      work:intent.edit?'Applying the requested website changes':'Building the requested website',
      audit:'Checking structure, behavior, and requested features',
      verify:'Checking the generated web code'
    },
    research:{
      context:subtype==='current'?'Reviewing what needs current verification':'Reviewing the research question',
      prepared:'Identifying the evidence needed',
      prepared2:'Organizing the relevant source context',
      work:'Synthesizing the relevant evidence',
      audit:'Checking relevance and evidence alignment'
    },
    document:{
      context:'Reviewing the document task',
      prepared:subtype==='document-summary'?'Identifying the sections and key points to summarize':'Identifying the requested document focus',
      prepared2:'Organizing the document evidence',
      work:subtype==='document-summary'?'Condensing the document':'Working from the document evidence',
      audit:'Checking the response against the requested document scope'
    },
    image:{
      context:'Reviewing the image task',
      prepared:'Identifying the visual details relevant to the request',
      prepared2:'Organizing the visible evidence',
      work:'Analyzing the relevant visual details',
      audit:'Checking the response against visible evidence'
    },
    video:{
      context:'Reviewing the video task',
      prepared:'Identifying the relevant frames and timing',
      prepared2:'Organizing the available media evidence',
      work:'Analyzing the relevant video evidence',
      audit:'Checking the response against available media evidence'
    },
    writing:{
      context:'Reviewing the writing request',
      prepared:'Identifying tone, audience, and structure',
      prepared2:'Preparing the response outline',
      work:'Drafting and polishing the writing',
      audit:'Checking clarity, tone, and format'
    },
    study:{
      context:'Reviewing the learning task',
      prepared:'Identifying the concept and target',
      prepared2:'Preparing the explanation path',
      work:'Building the explanation step by step',
      audit:'Checking the explanation against the question'
    },
    decision:{
      context:'Reviewing the decision',
      prepared:'Identifying constraints and priorities',
      prepared2:'Organizing the tradeoffs',
      work:'Weighing the options',
      audit:'Checking the recommendation against the stated constraints'
    },
    github:{
      context:'Reviewing the repository task',
      prepared:'Mapping repository scope and requested changes',
      prepared2:'Preparing the repository workflow',
      work:'Working through the repository task',
      audit:'Checking the result against the requested GitHub work'
    },
    deployment:{
      context:'Reviewing the deployment task',
      prepared:'Checking target, configuration, and failure conditions',
      prepared2:'Preparing deployment steps and verification',
      work:'Working through the deployment task',
      audit:'Checking the deployment result against the requested outcome'
    },
    general:{
      context:'Reviewing the request',
      prepared:'Identifying the requested outcome and constraints',
      prepared2:'Preparing the response approach',
      work:'Working through the request',
      audit:'Checking the final response for relevance and completeness'
    }
  };

  const set=specific[key]||generic[kind]||generic.general;
  const base=set[phase]||set.work||'Working through the request';
  const activityKind=phase==='audit'||phase==='verify'?'test':
    kind==='backend'?'api':kind==='deployment'?'deploy':kind==='research'?'research':
    kind==='github'?'github':kind==='image'?'image':kind==='video'||kind==='document'?'file':
    kind==='web'||kind==='android'||kind==='app'?'build':'process';

  // Only the lead/context row repeats the task subject. The reference timeline
  // uses short changing milestones below it rather than restating the whole prompt.
  return {label:phase==='context'?(base+': '+subject):base,kind:activityKind};
}

export function contextActivityPlan(message='', files=[]){
  const profile=taskProfile(message,files);
  const list=Array.isArray(files)?files:[];
  const firstFile=list.find(f=>!['video-frame','pdf-page'].includes(f?.mediaRole))||list[0];
  const name=String(firstFile?.parentName||firstFile?.name||firstFile?.filename||'').slice(0,64);
  const subject=profile.subject||activityTaskSubject(message);
  const urls=extractPublicUrl(message);
  let label='Understanding your request';
  let kind='process';

  const firstPublicUrl=urls.find(isSafePublicUrl)||'';
  let host='';
  try{ host=firstPublicUrl?new URL(firstPublicUrl).hostname.replace(/^www\./,''):''; }catch(_){}

  if(list.length){
    const hasVideo=list.some(f=>f?.mediaRole==='video-frame'||f?.kind==='video'||String(f?.mimeType||'').startsWith('video/'));
    const hasImage=list.some(f=>f?.mediaRole==='image'||String(f?.mimeType||'').startsWith('image/'));
    const hasCode=list.some(f=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|c|cpp|cs|sql|ya?ml|sh)$/i.test(String(f?.name||f?.filename||'')));
    if(hasVideo){ label=`Preparing uploaded video${name?': '+name:''} for: ${subject}`; kind='file'; }
    else if(hasImage){ label=`Preparing uploaded image${name?': '+name:''} for: ${subject}`; kind='image'; }
    else if(hasCode){ label=`Reviewing attached code${name?': '+name:''} for: ${subject}`; kind='file'; }
    else { label=`Reviewing attached file${name?': '+name:''} for: ${subject}`; kind='file'; }
  }else if(profile.contextualFollowUp && profile.freshnessFollowUp){
    const noun=profile.kind==='android'?'Android implementation':
      profile.kind==='github'?'repository work':
      profile.kind==='deployment'?'deployment':
      profile.kind==='backend'?'API/backend work':
      profile.kind==='web'?'app/UI work':
      profile.kind==='document'?'document work':
      profile.kind==='video'?'video task':
      profile.kind==='image'?'image task':'requested work';
    label=`Updating the latest requested ${noun}: ${subject}`;
    kind=['deployment'].includes(profile.kind)?'deploy':
      profile.kind==='backend'?'api':
      profile.kind==='image'?'image':
      profile.kind==='video'||profile.kind==='document'?'file':
      profile.kind==='android'||profile.kind==='web'?'build':'process';
  }else if(isWebsiteSecurityRequest(message)){
    label=host
      ? `Checking website security for ${host}`
      : subject && subject!=='your request'
        ? `Checking website security: ${subject}`
        : 'Checking website security';
    kind='research';
  }else if(profile.kind==='github'){
    const repo=(()=>{
      try{
        const u=urls.map(x=>{try{return new URL(x)}catch(_){return null}}).find(x=>x?.hostname==='github.com');
        const parts=u?.pathname.split('/').filter(Boolean)||[];
        return parts.length>=2?`${parts[0]}/${parts[1].replace(/\.git$/i,'')}`:'';
      }catch(_){return ''}
    })();
    if(profile.intent.edit) label=repo?`Reviewing requested changes in ${repo}`:`Reviewing requested repository changes: ${subject}`;
    else if(profile.intent.test) label=repo?`Checking repository behavior in ${repo}`:`Checking repository task: ${subject}`;
    else label=repo?`Inspecting repository ${repo}`:`Inspecting repository task: ${subject}`;
    kind='process';
  }else if(profile.kind==='deployment'){
    label=profile.intent.test
      ? `Checking deployment status: ${subject}`
      : profile.intent.edit
        ? `Reviewing deployment fix: ${subject}`
        : `Reviewing deployment task: ${subject}`;
    kind='deploy';
  }else if(profile.kind==='backend'){
    label=profile.intent.test
      ? `Checking API/backend behavior: ${subject}`
      : profile.intent.edit
        ? `Analyzing backend fix: ${subject}`
        : `Analyzing API/backend task: ${subject}`;
    kind='api';
  }else if(['web','research','study','document','image','video','writing','decision','troubleshooting'].includes(profile.kind)){
    const copy=taskSpecificActivityCopy(profile,'context');
    label=copy.label;kind=copy.kind;
  }else if(subject && subject!=='your request'){
    const copy=taskSpecificActivityCopy(profile,'context');
    label=copy.label;kind=copy.kind;
  }

  return {profile,steps:[{id:'task-context',label,kind}]};
}

export function emitContextActivityStart(message='', files=[], emit){
  const plan=contextActivityPlan(message,files);
  const first=plan.steps[0];
  if(first)activity(emit,first.id,first.label,'running',first.kind,'');
  return plan;
}

export function completeContextPlan(plan, emit){
  const first=plan?.steps?.[0];
  const blueprint=plan?.activityBlueprint||defaultActivityBlueprint(plan?.profile||{});
  if(first)activity(emit,first.id,blueprint.context||first.label,'completed',first.kind||blueprint.kind||'process','');
}

export function taskWorkingActivity(plan={}){
  const profile=plan?.profile||{};
  const blueprint=plan?.activityBlueprint;
  if(blueprint?.work)return {label:blueprint.work,kind:blueprint.kind||'process'};
  if(profile.contextualFollowUp && profile.freshnessFollowUp){
    const subject=String(profile.subject||'your request').slice(0,110);
    const kind=profile.kind==='deployment'?'deploy':
      profile.kind==='backend'?'api':
      profile.kind==='image'?'image':
      profile.kind==='video'||profile.kind==='document'?'file':
      profile.kind==='android'||profile.kind==='web'?'build':'process';
    return {label:'Applying the latest requested changes: '+subject,kind};
  }
  return taskSpecificActivityCopy(profile,'work');
}

export function taskGenerationActivity(plan={}){
  const profile=plan?.profile||{};
  const subject=String(profile.subject||'your request').slice(0,110);
  return {label:'Finalizing the response for: '+subject,kind:'generate'};
}

export function taskAuditActivity(message='',files=[],audit={},blueprint=null){
  // Once a model-created public plan exists, never fall back to legacy
  // website/app/repository domain copy. The audit is a real server operation,
  // so keep its label universal and let the result detail carry the evidence.
  const dynamicPlan=Boolean(blueprint&&(
    (Array.isArray(blueprint.trace)&&blueprint.trace.length) ||
    blueprint.responseContract ||
    blueprint.planDone
  ));
  if(dynamicPlan){
    return {
      label:audit?.ok?'Checked the response against your request':'Response check found items to review',
      kind:'test'
    };
  }
  const profile=taskProfile(message,files);
  const copy=taskSpecificActivityCopy(profile,'audit');
  const label=cleanActivityLabel(copy.label)||'Checking the final response';
  return {label:label+(audit?.ok?'':' — review needed'),kind:copy.kind};
}

export function taskCodeVerificationLabel(message='',files=[],failed=0,warnings=0,count=0,blueprint=null){
  // Static code verification is evidence-backed, but its public label must not
  // guess "website", "Android", "GitHub", etc. from regex classification when
  // the selected model already supplied the coherent request plan.
  const dynamicPlan=Boolean(blueprint&&(
    (Array.isArray(blueprint.trace)&&blueprint.trace.length) ||
    blueprint.responseContract ||
    blueprint.planDone
  ));
  let noun='Checking the generated code';
  if(!dynamicPlan){
    const profile=taskProfile(message,files);
    const copy=taskSpecificActivityCopy(profile,'verify');
    noun=copy.label||noun;
  }
  if(failed)return noun+' — '+failed+' issue'+(failed===1?'':'s')+' found';
  if(warnings)return noun+' — '+warnings+' warning'+(warnings===1?'':'s');
  return noun+' — '+count+' static check'+(count===1?'':'s')+' passed';
}


export function linkLabel(raw=''){
  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,'');
    const path=u.pathname==='/'?'':u.pathname.split('/').filter(Boolean).slice(0,2).join('/');
    return path?`${host}/${path}`:host;
  }catch(_){return String(raw).slice(0,80);}
}

export function linkPurpose(url='', message=''){
  let host='';
  try{host=new URL(url).hostname.toLowerCase();}catch(_){}
  const t=String(message||'').toLowerCase();

  if(host.includes('github.com'))return 'repository';
  if(host.includes('vercel.app')||host.includes('vercel.com'))return 'deployment';
  if(host.includes('docs.')||host.includes('developer.')||/\b(documentation|docs|guide|reference)\b/i.test(t))return 'documentation';
  if(/\b(api|endpoint|webhook)\b/i.test(t))return 'API endpoint';
  return 'website';
}


// Public GitHub repository inspection is read-only. Report repository steps only
// when their HTTP requests are actually performed; private repos need an authorized connector.
export async function inspectPublicGitHubRepository(message='', emit){
  const urls=extractPublicUrl(message);
  const repos=[];
  for(const raw of urls){
    try{
      const url=new URL(raw);
      if(url.hostname.toLowerCase()!=='github.com')continue;
      const parts=url.pathname.split('/').filter(Boolean);
      if(parts.length<2||!/^[\w.-]{1,100}$/.test(parts[0])||!/^[\w.-]{1,100}$/.test(parts[1]))continue;
      const repoName=parts[1].replace(/\.git$/i,'');
      const key=`${parts[0]}/${repoName}`;
      if(!repos.includes(key))repos.push(key);
    }catch(_){}
  }
  if(!repos.length)return '';
  const context=[];
  for(const name of repos.slice(0,2)){
    const root=`https://api.github.com/repos/${name}`;
    const headers={'Accept':'application/vnd.github+json','User-Agent':'JepongDevxyz-AI/1.0'};
    const requestOptions=()=>({headers,signal:AbortSignal.timeout(9000)});
    const id=`github-${name.replace(/[^a-zA-Z0-9]/g,'-')}`;
    activity(emit,id,`Searching GitHub repository metadata: ${name}`,'running','github');
    try{
      const res=await safePublicFetch(root,requestOptions(),1);
      if(!res.ok){
        activity(emit,id,`Could not access GitHub repository: ${name} • HTTP ${res.status}`,'warning','github');
        context.push(`Repository ${name}: metadata unavailable (HTTP ${res.status}). Do not claim that its contents were inspected.`);
        continue;
      }
      const info=await res.json();
      activity(emit,id,`Read GitHub repository metadata: ${name}`,'completed','github');
      context.push(`Repository: ${name}\nDescription: ${String(info.description||'').slice(0,250)}\nDefault branch: ${String(info.default_branch||'unknown')}\nPublic repository URL: https://github.com/${name}`);
      const treeId=`github-files-${name.replace(/[^a-zA-Z0-9]/g,'-')}`;
      activity(emit,treeId,`Exploring GitHub repository structure: ${name}`,'running','github');
      const listing=await safePublicFetch(`${root}/contents`,requestOptions(),1);
      if(!listing.ok){
        activity(emit,treeId,`Could not list GitHub repository files: ${name} • HTTP ${listing.status}`,'warning','github');
        continue;
      }
      const entries=await listing.json();
      if(!Array.isArray(entries)){
        activity(emit,treeId,`GitHub repository listing unavailable: ${name}`,'warning','github');
        continue;
      }
      const files=entries.filter(x=>x.type==='file');
      const dirs=entries.filter(x=>x.type==='dir');
      activity(emit,treeId,`Explored repository structure • ${files.length} files • ${dirs.length} folders`,'completed','github',name);
      context.push(`Top-level files: ${files.map(x=>x.name).slice(0,45).join(', ')}\nTop-level folders: ${dirs.map(x=>x.name).slice(0,20).join(', ')}`);
      const task=String(message).toLowerCase();
      const relevant=files.filter(x=>/^(readme(?:\.md)?|index\.html|package\.json|vercel\.json)$/i.test(x.name));
      if(/\b(api|backend|chat|webhook|activity|status)\b/i.test(task) && dirs.some(x=>x.name==='api')){
        const apiId=`github-api-${name.replace(/[^a-zA-Z0-9]/g,'-')}`;
        activity(emit,apiId,`Inspecting repository API implementation: ${name}`,'running','github');
        const apiList=await safePublicFetch(`${root}/contents/api`,requestOptions(),1);
        if(apiList.ok){
          const apiFiles=await apiList.json();
          if(Array.isArray(apiFiles)){
            context.push(`API files: ${apiFiles.map(x=>x.name).slice(0,30).join(', ')}`);
            for(const candidate of apiFiles.filter(x=>/^(chat|webhook)\.(?:js|mjs)$/i.test(x.name)).slice(0,1)) relevant.push(candidate);
            activity(emit,apiId,`Inspected repository API implementation • ${apiFiles.length} entries`,'completed','github',name);
          }
        }
      }
      const chosen=[...new Map(relevant.map(x=>[x.path,x])).values()].slice(0,2);
      for(const [index,file] of chosen.entries()){
        if(!file.download_url || !/^https:\/\/raw\.githubusercontent\.com\//.test(file.download_url) || Number(file.size)>750000)continue;
        const fileId=`github-source-${name.replace(/[^a-zA-Z0-9]/g,'-')}-${index}`;
        activity(emit,fileId,`Reading repository file: ${file.path}`,'running','file');
        try{
          const source=await safePublicFetch(file.download_url,{headers:{'User-Agent':'JepongDevxyz-AI/1.0'},signal:AbortSignal.timeout(9000)},1);
          if(!source.ok)throw new Error(`HTTP ${source.status}`);
          const completeText=await source.text();
          const excerpt=completeText.slice(0,16000);
          context.push(`Repository file ${file.path} (only the first ${excerpt.length} of ${completeText.length} characters are supplied for context):\n${excerpt}`);
          activity(emit,fileId,`Read ${completeText.length>excerpt.length?'excerpt from':'repository file'}: ${file.path}`,'completed','file');
        }catch(err){
          activity(emit,fileId,`Could not read repository file: ${file.path}`,'warning','file',String(err?.message||err).slice(0,100));
        }
      }
    }catch(err){
      activity(emit,id,`Could not inspect GitHub repository: ${name}`,'warning','github',String(err?.message||err).slice(0,100));
      context.push(`Repository ${name}: inspection unavailable. Do not claim repository code was read.`);
    }
  }
  return context.length?`\n\n[ACTUALLY FETCHED PUBLIC GITHUB REPOSITORY CONTEXT]\n${context.join('\n\n')}\n[/ACTUALLY FETCHED PUBLIC GITHUB REPOSITORY CONTEXT]`:'';
}


// Passive, non-invasive site-specific observations; a successful HTTP request
// or the presence of some headers cannot prove a website is secure.
export function publicSecurityHeaderObservations(response, requestedUrl=''){
  const h=response.headers;
  const finalUrl=String(response.url||requestedUrl);
  const https=finalUrl.startsWith('https://');
  const checks=[
    ['Strict-Transport-Security',https&&Boolean(h.get('strict-transport-security'))],
    ['Content-Security-Policy',Boolean(h.get('content-security-policy'))],
    ['X-Content-Type-Options: nosniff',/\bnosniff\b/i.test(h.get('x-content-type-options')||'')],
    ['Referrer-Policy',Boolean(h.get('referrer-policy'))],
    ['Permissions-Policy',Boolean(h.get('permissions-policy'))],
    ['Frame protection',Boolean(h.get('x-frame-options'))||/\bframe-ancestors\b/i.test(h.get('content-security-policy')||'')]
  ];
  return {
    finalUrl,
    https,
    checks,
    observed:checks.filter(([,present])=>present).length,
    notes:[
      'This is a passive HTTP/response-header observation, not a penetration test, malware scan, code review, or proof the site is safe.',
      'A missing header is a configuration item to review; not a confirmed exploitable vulnerability.',
      'HTTPS alone does not prove overall website safety. Do not give an overall safety verdict from HTTP 200 or these headers.'
    ]
  };
}

export async function inspectProvidedLinks(message='', emit){
  const urls=[...new Set(extractPublicUrl(message))].filter(isSafePublicUrl)
    .filter(raw=>{try{const u=new URL(raw);return !(u.hostname==='github.com' && u.pathname.split('/').filter(Boolean).length===2);}catch(_){return true;}})
    .slice(0,4);
  if(!urls.length)return '';

  const securityRequest=isWebsiteSecurityRequest(message);
  let context=`\n\n[PROVIDED LINK INSPECTION — fetched ${new Date().toISOString()}]\n`;

  for(let i=0;i<urls.length;i++){
    const url=urls[i];
    const label=linkLabel(url);
    const purpose=linkPurpose(url,message);
    activity(emit,`provided-link-${i}`,securityRequest
      ? `Checking website security response: ${label}`
      : `Opening provided ${purpose}: ${label}`,'running','web');

    const started=Date.now();
    try{
      const res=await safePublicFetch(url,{
        method:'GET',
        headers:{
          'User-Agent':'Mozilla/5.0 (compatible; JepongDevxyzAI/1.0)',
          'Accept':'text/html,text/plain,application/json,application/xml,*/*'
        },
        signal:AbortSignal.timeout(10000)
      },2);

      const elapsed=Date.now()-started;
      const type=(res.headers.get('content-type')||'').toLowerCase();
      let extract='';
      if(res.ok && (type.includes('text/')||type.includes('json')||type.includes('xml')||!type)){
        const raw=(await res.text()).slice(0,220000);
        extract=stripHtml(raw).slice(0,4500);
      }

      const security=securityRequest?publicSecurityHeaderObservations(res,url):null;
      activity(
        emit,
        `provided-link-${i}`,
        security
          ? `Checked security headers for ${label} • ${security.observed}/${security.checks.length} observed`
          : `Reviewed ${purpose}: ${label} • HTTP ${res.status}`,
        res.ok?'completed':'warning',
        'web',
        security?`HTTP ${res.status} • ${elapsed} ms • passive inspection only`:`${elapsed} ms${type?` • ${type.split(';')[0]}`:''}`
      );

      context+=`\nLink ${i+1}: ${url}\nPurpose: ${purpose}\nHTTP: ${res.status}\nResponse time: ${elapsed} ms\nContent type: ${type||'unknown'}\n`;
      if(security){
        context+=`[PASSIVE WEBSITE SECURITY OBSERVATIONS]\nFinal URL: ${security.finalUrl}\nHTTPS connection: ${security.https?'observed':'not observed'}\n`;
        for(const [name,present] of security.checks)context+=`${name}: ${present?'observed':'not observed in this HTTP response'}\n`;
        context+=security.notes.join(' ')+'\n';
      }
      if(extract)context+=`Relevant page text: ${extract}\n`;
    }catch(e){
      activity(emit,`provided-link-${i}`,`Could not open ${purpose}: ${label}`,'warning','web',String(e?.message||e).slice(0,130));
      context+=`\nLink ${i+1}: ${url}\nOpen failed: ${String(e?.message||e).slice(0,300)}\n`;
    }
  }

  context+=`\nUse link content only when it is relevant to the user's request. Do not claim a link was reviewed unless a successful inspection result appears above.`;
  return context;
}


export function uploadedProjectGroups(files=[]){
  const groups=new Map();
  for(const f of (Array.isArray(files)?files:[])){
    const root=attachmentRootName(f);
    if(!/\.(?:zip|apk|aab|jar|aar)$/i.test(root))continue;
    if(!groups.has(root))groups.set(root,[]);
    groups.get(root).push(f);
  }
  return groups;
}

export function archiveEntryBody(file={}){
  const text=textFromAttachment(file);
  return text.replace(/^Archive entry:\s*[^\n]+\n/i,'');
}

export function firstRegexValue(text='',patterns=[]){
  for(const rx of patterns){
    const m=String(text||'').match(rx);
    if(m?.[1])return String(m[1]).trim();
  }
  return '';
}

export function androidProjectConsistencyEvidence(sourceEntries=[]){
  const entries=sourceEntries.map(file=>({
    file,
    name:String(file?.name||'').replace(/\\/g,'/'),
    body:archiveEntryBody(file)
  }));
  const gradle=entries.filter(e=>/(?:^|\/)(?:build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradle\.properties|libs\.versions\.toml)$/i.test(e.name));
  const manifests=entries.filter(e=>/(?:^|\/)AndroidManifest\.xml$/i.test(e.name));
  const code=entries.filter(e=>/\.(?:java|kt|kts)$/i.test(e.name));

  const gradleText=gradle.map(e=>e.body).join('\n');
  const namespace=firstRegexValue(gradleText,[
    /\bnamespace\s*(?:=\s*)?["']([^"']+)["']/i
  ]);
  const applicationId=firstRegexValue(gradleText,[
    /\bapplicationId\s*(?:=\s*)?["']([^"']+)["']/i
  ]);
  const compileSdk=firstRegexValue(gradleText,[
    /\bcompileSdk(?:Version)?\s*(?:=\s*)?["']?([0-9]{2,3})/i
  ]);
  const targetSdk=firstRegexValue(gradleText,[
    /\btargetSdk(?:Version)?\s*(?:=\s*)?["']?([0-9]{2,3})/i
  ]);
  const minSdk=firstRegexValue(gradleText,[
    /\bminSdk(?:Version)?\s*(?:=\s*)?["']?([0-9]{1,3})/i
  ]);

  const sourceClasses=new Set();
  const packagePathMismatches=[];
  for(const e of code){
    const pkg=firstRegexValue(e.body,[/^\s*package\s+([A-Za-z_][\w.]*)\s*;?/m]);
    const base=e.name.split('/').pop()?.replace(/\.(?:java|kt|kts)$/i,'')||'';
    if(pkg&&base)sourceClasses.add(`${pkg}.${base}`);
    const marker=e.name.match(/\/(?:java|kotlin)\/(.+)\/[^/]+\.(?:java|kt|kts)$/i);
    if(pkg&&marker?.[1]){
      const pathPkg=marker[1].replace(/\//g,'.');
      if(pathPkg!==pkg)packagePathMismatches.push({name:e.name,declared:pkg,pathPackage:pathPkg});
    }
  }

  const manifestComponents=[];
  let manifestPackage='';
  for(const e of manifests){
    if(!manifestPackage)manifestPackage=firstRegexValue(e.body,[
      /<manifest\b[^>]*\bpackage\s*=\s*["']([^"']+)["']/i
    ]);
    for(const m of e.body.matchAll(/<(activity|activity-alias|service|receiver|provider)\b[^>]*\bandroid:name\s*=\s*["']([^"']+)["']/gi)){
      manifestComponents.push({type:m[1].toLowerCase(),name:m[2]});
    }
  }
  const basePackage=manifestPackage||namespace||applicationId;
  const unresolvedComponents=[];
  for(const c of manifestComponents){
    if(!c.name||/^(?:android|androidx|com\.google)\./i.test(c.name))continue;
    const fqcn=c.name.startsWith('.')&&basePackage
      ? basePackage+c.name
      : (!c.name.includes('.')&&basePackage?basePackage+'.'+c.name:c.name);
    if(fqcn&&sourceClasses.size&&!sourceClasses.has(fqcn)){
      unresolvedComponents.push({...c,fqcn});
    }
  }

  const dependencyLines=gradleText.split('\n')
    .map(x=>x.trim())
    .filter(x=>/^(?:implementation|api|compileOnly|runtimeOnly|kapt|ksp|annotationProcessor|testImplementation|androidTestImplementation)\b/.test(x));
  const duplicateDependencies=[...new Set(dependencyLines.filter((line,i,a)=>a.indexOf(line)!==i))];

  return {
    namespace,applicationId,manifestPackage,compileSdk,targetSdk,minSdk,
    sourceClassCount:sourceClasses.size,
    manifestComponentCount:manifestComponents.length,
    packagePathMismatches,
    unresolvedComponents,
    duplicateDependencies
  };
}

export function inspectUploadedProject(files=[], emit){
  const groups=uploadedProjectGroups(files);
  if(!groups.size)return '';

  let context='\n\n[UPLOADED PROJECT INSPECTION]\n';
  let groupIndex=0;
  for(const [root,parts] of groups){
    const sourceEntries=parts.filter(p=>String(p?.kind||'')==='archive-entry' && textFromAttachment(p));
    const rootMeta=parts.find(p=>attachmentRootName(p)===root && String(p?.name||'')===root) || parts[0];
    const manifestText=String(rootMeta?.extractedText||'');
    const indexedCount=Math.max(0,Number(rootMeta?.archiveFileCount)||0);
    const readableCount=Math.max(0,Number(rootMeta?.archiveReadableCount)||0);
    const names=[
      ...new Set([
        ...sourceEntries.map(p=>String(p?.name||'')),
        ...manifestText.split('\n').filter(line=>/[/.]/.test(line)&&line.length<240)
      ].filter(Boolean))
    ];
    const idBase=`project-${groupIndex++}`;
    const coverage=readableCount?Math.min(100,Math.round((sourceEntries.length/readableCount)*100)):100;
    activity(emit,`${idBase}-archive`,`Inspecting uploaded project archive: ${root}`,'running','file');
    activity(emit,`${idBase}-archive`,
      `Indexed project archive: ${root} • ${indexedCount||names.length} files • loaded ${sourceEntries.length}${readableCount?`/${readableCount}`:''} readable source/config files`,
      sourceEntries.length?'completed':'warning','file',
      readableCount&&sourceEntries.length<readableCount
        ?`Task-ranked source coverage: ${coverage}% by file count; build/manifest/app sources and request-matching paths are prioritized.`
        :'Readable project sources available for inspection.');

    const gradle=sourceEntries.filter(p=>/(?:^|\/)(?:build\.gradle(?:\.kts)?|settings\.gradle(?:\.kts)?|gradle\.properties|libs\.versions\.toml)$/i.test(String(p.name||'')));
    const manifests=sourceEntries.filter(p=>/(?:^|\/)AndroidManifest\.xml$/i.test(String(p.name||'')));
    const java=sourceEntries.filter(p=>/\.(?:java|kt|kts)$/i.test(String(p.name||'')));
    const resources=sourceEntries.filter(p=>/(?:^|\/)res\//i.test(String(p.name||'')) || /\.(?:xml)$/i.test(String(p.name||'')));
    const nativeNames=names.filter(name=>/\.(?:so|jar|aar)$/i.test(name));

    if(gradle.length){
      activity(emit,`${idBase}-gradle`,'Inspecting Gradle configuration and dependencies','running','build',root);
      activity(emit,`${idBase}-gradle`,
        `Reviewed Gradle configuration and dependencies • ${gradle.length} build/config file${gradle.length===1?'':'s'}`,
        'completed','build');
    }
    if(manifests.length){
      activity(emit,`${idBase}-manifest`,'Inspecting Android manifest and component declarations','running','file',root);
      activity(emit,`${idBase}-manifest`,
        `Reviewed Android manifest and component declarations • ${manifests.length} manifest${manifests.length===1?'':'s'}`,
        'completed','file');
    }
    if(java.length){
      activity(emit,`${idBase}-source`,'Inspecting Java/Kotlin project sources','running','file',root);
      activity(emit,`${idBase}-source`,
        `Inspected Java/Kotlin project sources • ${java.length} file${java.length===1?'':'s'}`,
        'completed','file');
    }
    if(resources.length){
      activity(emit,`${idBase}-resources`,'Inspecting Android resources and configuration','running','file',root);
      activity(emit,`${idBase}-resources`,
        `Inspected Android resources/configuration • ${resources.length} readable file${resources.length===1?'':'s'}`,
        'completed','file');
    }
    if(nativeNames.length){
      activity(emit,`${idBase}-bundled-libs`,
        `Located bundled library/native artifacts • ${nativeNames.length} file${nativeNames.length===1?'':'s'}`,
        'completed','file',
        'Binary contents are preserved locally; this status does not claim binary decompilation.');
    }

    const verificationTargets=[...gradle,...manifests,...java,...resources]
      .filter((p,i,a)=>a.indexOf(p)===i)
      .slice(0,28);
    if(verificationTargets.length){
      activity(emit,`${idBase}-static`,`Running static checks on ${verificationTargets.length} project file${verificationTargets.length===1?'':'s'}`,'running','test',root);
    }
    const reports=verificationTargets.map(p=>staticVerifyText(String(p.name||'Archive entry'),archiveEntryBody(p),String(p.name||'')));
    const failed=reports.filter(r=>r.status==='failed').length;
    const warnings=reports.filter(r=>r.status==='warning').length;
    if(reports.length){
      activity(emit,`${idBase}-static`,
        failed
          ? `Project static checks found ${failed} issue${failed===1?'':'s'} across ${reports.length} inspected file${reports.length===1?'':'s'}`
          : warnings
            ? `Project static checks completed with ${warnings} warning${warnings===1?'':'s'} across ${reports.length} file${reports.length===1?'':'s'}`
            : `Project static checks passed • ${reports.length} inspected file${reports.length===1?'':'s'}`,
        failed?'warning':'completed','test');
    }

    const androidEvidence=(gradle.length||manifests.length||java.length)
      ?androidProjectConsistencyEvidence(sourceEntries):null;
    if(androidEvidence){
      const facts=[];
      if(androidEvidence.namespace)facts.push(`namespace ${androidEvidence.namespace}`);
      if(androidEvidence.applicationId)facts.push(`applicationId ${androidEvidence.applicationId}`);
      if(androidEvidence.targetSdk)facts.push(`targetSdk ${androidEvidence.targetSdk}`);
      if(androidEvidence.packagePathMismatches.length)facts.push(`${androidEvidence.packagePathMismatches.length} package/path mismatch${androidEvidence.packagePathMismatches.length===1?'':'es'}`);
      if(androidEvidence.duplicateDependencies.length)facts.push(`${androidEvidence.duplicateDependencies.length} duplicate dependency declaration${androidEvidence.duplicateDependencies.length===1?'':'s'}`);
      activity(emit,`${idBase}-android-consistency`,
        facts.length?`Cross-checked Android project consistency • ${facts.join(' • ')}`:'Cross-checked Android package/component consistency',
        (androidEvidence.packagePathMismatches.length||androidEvidence.duplicateDependencies.length)?'warning':'completed',
        'test',
        androidEvidence.unresolvedComponents.length
          ?`${androidEvidence.unresolvedComponents.length} manifest component name(s) were not found in the supplied source pack; omitted project files may account for them.`
          :`Checked ${androidEvidence.manifestComponentCount} manifest component declaration${androidEvidence.manifestComponentCount===1?'':'s'} against ${androidEvidence.sourceClassCount} supplied source class path${androidEvidence.sourceClassCount===1?'':'s'}.`);
    }

    context+=`Project archive: ${root}\n`;
    context+=`Archive files indexed: ${indexedCount||names.length}\n`;
    context+=`Readable source/config files in archive: ${readableCount||sourceEntries.length}\n`;
    context+=`Task-ranked readable files supplied to this request: ${sourceEntries.length}\n`;
    if(readableCount&&sourceEntries.length<readableCount){
      context+=`Coverage note: not every readable file body fits one model request. Selection is task-ranked; do not say the whole project body was read. Do not infer defects from uninspected files.\n`;
    }
    if(gradle.length)context+=`Gradle/build files inspected: ${gradle.map(p=>p.name).join(', ')}\n`;
    if(manifests.length)context+=`Android manifests inspected: ${manifests.map(p=>p.name).join(', ')}\n`;
    if(java.length)context+=`Java/Kotlin files inspected: ${java.map(p=>p.name).slice(0,60).join(', ')}\n`;
    if(resources.length)context+=`Resources/config files inspected: ${resources.map(p=>p.name).slice(0,60).join(', ')}\n`;
    if(nativeNames.length)context+=`Bundled binary/library paths indexed: ${nativeNames.slice(0,60).join(', ')}\n`;
    if(androidEvidence){
      context+='Android consistency evidence:\n';
      if(androidEvidence.namespace)context+=`- namespace: ${androidEvidence.namespace}\n`;
      if(androidEvidence.applicationId)context+=`- applicationId: ${androidEvidence.applicationId}\n`;
      if(androidEvidence.manifestPackage)context+=`- manifest package: ${androidEvidence.manifestPackage}\n`;
      if(androidEvidence.compileSdk)context+=`- compileSdk: ${androidEvidence.compileSdk}\n`;
      if(androidEvidence.minSdk)context+=`- minSdk: ${androidEvidence.minSdk}\n`;
      if(androidEvidence.targetSdk)context+=`- targetSdk: ${androidEvidence.targetSdk}\n`;
      context+=`- supplied source classes indexed: ${androidEvidence.sourceClassCount}\n`;
      context+=`- manifest components parsed: ${androidEvidence.manifestComponentCount}\n`;
      if(androidEvidence.packagePathMismatches.length){
        for(const x of androidEvidence.packagePathMismatches.slice(0,12)){
          context+=`- SOURCE PACKAGE/PATH MISMATCH: ${x.name} declares ${x.declared}, path implies ${x.pathPackage}\n`;
        }
      }else context+='- no Java/Kotlin package-vs-source-path mismatch detected in supplied source files\n';
      if(androidEvidence.duplicateDependencies.length){
        context+=`- duplicate Gradle dependency declarations: ${androidEvidence.duplicateDependencies.join(' | ')}\n`;
      }
      if(androidEvidence.unresolvedComponents.length){
        context+=`- manifest component names not found in supplied source pack (not necessarily missing from full project): ${androidEvidence.unresolvedComponents.slice(0,12).map(x=>x.fqcn).join(', ')}\n`;
      }
    }
    if(reports.length){
      context+='Static inspection results:\n';
      for(const r of reports)context+=`- ${r.name}: ${r.status.toUpperCase()} — ${r.findings.join(' ')}\n`;
    }
    context+=
      'Grounding rule: only claim file bodies listed above were inspected. Binary .so/.jar/.aar contents were not decompiled on the server. ' +
      'Do not claim a Gradle build, APK install, emulator run, runtime test, or whole-project inspection unless separate execution/full-coverage evidence exists. ' +
      'When proposing changes, preserve unrelated working project files and use exact archive-relative paths in FILE blocks.\n';
  }
  return context+'[/UPLOADED PROJECT INSPECTION]\n';
}

export async function performVerification(message='', files=[], emit){
  if(!shouldVerifyTask(message,files))return '';
  const reports=[];

  const promptBlocks=extractCodeBlocks(message);
  promptBlocks.forEach((b,i)=>reports.push(staticVerifyText(`Prompt code block ${i+1}`,b.code,b.lang)));

  if(Array.isArray(files)){
    for(let i=0;i<files.length && reports.length<16;i++){
      if(['zip','archive'].includes(String(files[i]?.kind||'')))continue;
      const txt=textFromAttachment(files[i]);
      if(!txt)continue;
      const name=files[i]?.name||files[i]?.filename||`Attachment ${i+1}`;
      reports.push(staticVerifyText(name,txt,name));
    }
  }

  const explicitUrls=extractPublicUrl(message).filter(isSafePublicUrl);
  // Do not show a "verification" step when there is no source/code to check.
  // URLs are probed by the existing real URL-checking function below.
  if(!reports.length && !explicitUrls.length)return executionEnvironmentContext(message);
  if(reports.length)activity(emit,'verification',`Checking ${reports.length} supplied code item${reports.length===1?'':'s'}`,'running','test');

  // A website-safety request already receives a targeted HTTP inspection above.
  // Avoid the duplicate generic GET probe and its misleading second status row.
  const urlResults=isWebsiteSecurityRequest(message)?[]:await probeRequestedUrls(message,emit);

  const env=executionEnvironmentContext(message);
  let context=env;

  if(reports.length){
    const failed=reports.filter(r=>r.status==='failed').length;
    const warnings=reports.filter(r=>r.status==='warning').length;
    activity(emit,'verification',`Static verification complete • ${reports.length} item${reports.length===1?'':'s'}${failed?` • ${failed} issue${failed===1?'':'s'}`:''}${warnings?` • ${warnings} warning${warnings===1?'':'s'}`:''}`,failed?'warning':'completed','test');
    context+=`\n\n[SAFE STATIC VERIFICATION]\n`;
    for(const r of reports)context+=`${r.name}: ${r.status.toUpperCase()} — ${r.findings.join(' ')}\n`;
    context+=`These are static checks, not proof that the program executed successfully.`;
  }

  if(urlResults.length){
    context+=`\n\n[REAL PUBLIC URL TEST RESULTS]\n`;
    for(const r of urlResults){
      context+=r.ok
        ? `${r.url} — HTTP ${r.status}, ${r.elapsedMs} ms, ${r.contentType||'unknown content type'}\n`
        : `${r.url} — FAILED: ${r.error||`HTTP ${r.status}`}\n`;
    }
    context+=`These URL checks were actually performed during this request.`;
  }

  return context;
}

export function shouldRunLiveWebSearch(message='',enabled=false,force=false){
  return enabled===true && (force===true || !isSimpleCasualMessage(message));
}

export function extractWeatherLocation(message=''){
  const text=String(message||'').normalize('NFKC').replace(/\s+/g,' ').trim();
  if(!text)return '';
  const locationPattern='([\\p{L}\\p{M}0-9][\\p{L}\\p{M}0-9 .,’\'-]{0,98}?)';
  const endings='(?:\\s+(?:right now|now|today|tonight|tomorrow|ngayon|mamaya|bukas|forecast|weather|panahon|ulan|init|bagyo|temperatura)\\b.*|[?.!,;:]*$)';
  const candidates=[];
  const afterWeather=new RegExp('(?:weather|panahon|forecast|temperatura|ulan|init|bagyo)(?:\\s+(?:like|today|tonight|now|ngayon|today|right now))*\\s+(?:in|at|for|near|around|sa|ng|nang|para sa)\\s+'+locationPattern+endings,'iu').exec(text);
  if(afterWeather)candidates.push(afterWeather[1]);
  const beforeWeather=new RegExp('(?:^|\\s)(?:in|at|for|near|around|sa|ng|nang|para sa)\\s+'+locationPattern+'\\s+(?:weather|panahon|forecast|temperatura|ulan|init|bagyo)\\b','iu').exec(text);
  if(beforeWeather)candidates.push(beforeWeather[1]);
  const locationFirst=new RegExp('^(.+?)\\s+(?:weather|panahon|forecast)\\b','iu').exec(text);
  if(locationFirst)candidates.push(locationFirst[1]);
  const ignored=/^(?:(?:what(?: is|'s)?(?: the)?|how(?:'s| is)?(?: the)?|anong|ano ang|kumusta ang|the|weather|panahon|forecast|ngayon|today|tonight|now|dito|diyan|there|here)\s*)+$/iu;
  for(const raw of candidates){
    const location=String(raw||'').replace(/[?.!,;:]+$/g,'').replace(/\s+/g,' ').trim()
      .replace(/\s+(?:right now|now|today|tonight|tomorrow|ngayon|mamaya|bukas)$/iu,'').trim();
    if(!location||ignored.test(location))continue;
    return location.slice(0,100);
  }
  return '';
}

export async function getEnhancedLiveWebContext(message, webSearch, emit, options={}){
  if(!message)return '';

  const fast=Boolean(options.fast);
  const forceWebSearch=options.forceWebSearch===true;
  const contextMessage=String(options.contextMessage||'').trim();
  const vagueFreshFollowUp=isVagueFreshnessFollowUp(message);
  const wantsLive=shouldRunLiveWebSearch(message,webSearch,forceWebSearch);
  if(!wantsLive)return '';

  const useContextQuery=contextMessage && (looksReferential(message)||vagueFreshFollowUp||String(message).trim().split(/\s+/).length<=6);
  const searchQuery=buildLiveSearchQuery(useContextQuery?contextMessage:message);
  if(!searchQuery || (isVagueFreshnessFollowUp(searchQuery)&&!forceWebSearch))return '';

  const sourcePages=fast?1:3;
  let configuredSearchApiAttempted=false;
  const searchOutcome=await runConfiguredWebSearch(searchQuery,{
    env:process.env,fetchImpl:fetch,timeoutMs:fast?5000:8000,
    fast,maxResults:fast?3:5,isSafePublicUrl,relevantWebResults,
    onProviderAttempt:({state,httpStatus,resultCount})=>{
      if(state!=='unconfigured')configuredSearchApiAttempted=true;
      const label=state==='completed'
        ?`Found ${resultCount} relevant result${resultCount===1?'':'s'}`
        :state==='warning'
          ?`Web Search API ${httpStatus?'unavailable':resultCount===0?'returned no relevant results':'search failed'}${httpStatus?` • HTTP ${httpStatus}`:''} • trying another source`
          :'Searching the web';
      activity(emit,'web-search',state==='unconfigured'
        ?'No configured Web Search API found • checking public sources'
        :label,state==='unconfigured'?'running':state,'web');
    }
  });
  if(searchOutcome.results.length){
    return buildLiveSourceContext(await enrichSearchResults(searchOutcome.results,emit,sourcePages));
  }

  const attemptedSummary=configuredSearchApiAttempted
    ?'configured Web Search APIs were tried'
    :'no configured Web Search API is available';

  // Weather has a dedicated live-data fallback, but only after configured
  // Web Search APIs are tried and their actual provider status is emitted.
  const isWeather=/(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i.test(message);
  if(isWeather){
    const location=extractWeatherLocation(message);
    if(location){
    activity(emit,'web-search',`Configured Web Search APIs had no usable weather results • checking wttr.in for ${location}`,'running','web');
      try{
      const res=await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`,{
        headers:{'User-Agent':'JepongDevxyz-AI/1.0'},signal:AbortSignal.timeout(fast?4500:7000)
      });
      if(res.ok){
        const d=await safeJsonResponse(res);
        if(!d)throw new Error('Weather source returned invalid JSON');
        const c=d.current_condition?.[0]||{};
        const n=d.nearest_area?.[0]||{};
        activity(emit,'web-search',`Live weather ready for ${n.areaName?.[0]?.value||location} • wttr.in (${attemptedSummary})`,'completed','web');
        return `\n\n[REAL-TIME WEATHER — fetched ${new Date().toISOString()}]\nLocation: ${n.areaName?.[0]?.value||location}\nTemperature: ${c.temp_C||'N/A'}°C\nFeels like: ${c.FeelsLikeC||'N/A'}°C\nCondition: ${c.weatherDesc?.[0]?.value||'Unknown'}\nHumidity: ${c.humidity||'N/A'}%\nWind: ${c.windspeedKmph||'N/A'} km/h\nRain: ${c.precipMM||'N/A'} mm.\nState clearly that this is live fetched data.`;
      }
      }catch(_){}
    }
  }

  const fallbackReason=configuredSearchApiAttempted
    ?'configured Web Search APIs returned no usable results'
    :'no Web Search API is configured';
  const results=await noKeyWebSearch(searchQuery,emit,{fallbackReason});
  return buildLiveSourceContext(await enrichSearchResults(results,emit,sourcePages));
}


export function normalizeHistory(history = []) {
  return (Array.isArray(history)?history:[])
    .filter(x => x && (x.text || x.parts))
    .map(x => {
      const role=x.role === 'bot' || x.role === 'model' || x.role === 'assistant' ? 'assistant' : 'user';
      let content=x.text || (Array.isArray(x.parts) ? x.parts.map(p => p?.text || '').join('\n') : '');
      content=String(content||'').trim();
      return {role,content};
    })
    .filter(x => x.content)
    .slice(-40);
}

export function buildOpenAIMessages(history, message, systemInstruction) {
  const messages = [{ role:'system', content:systemInstruction }, ...normalizeHistory(history)];
  if (messages.length > 1 && messages.at(-1).role === 'user') messages.pop();
  if (message?.trim()) messages.push({ role:'user', content:message.trim() });
  return messages;
}

export function buildOpenAIVisionMessages(history, message, systemInstruction, files=[]){
  const messages=[{role:'system',content:systemInstruction},...normalizeHistory(history)];
  if(messages.length>1 && messages.at(-1).role==='user')messages.pop();
  const content=[];
  if(message?.trim())content.push({type:'text',text:message.trim()});
  for(const f of (Array.isArray(files)?files:[]).slice(0,10)){
    if(!f?.data||!String(f?.mimeType||'').toLowerCase().startsWith('image/'))continue;
    content.push({type:'image_url',image_url:{url:`data:${f.mimeType};base64,${f.data}`}});
  }
  if(content.length)messages.push({role:'user',content});
  return messages;
}

export function smartRoute(mode, files, message) {
  const intentText=normalizeIntentText(message);
  const hasImage = Array.isArray(files) && files.some(f => f?.mimeType?.startsWith('image/') && f?.data);
  if (hasImage) {
    if (configured('cloudflare')) return {provider:'cloudflare',model:'@cf/google/gemma-4-26b-a4b-it',reason:'vision'};
    if (configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'vision'};
  }
  const coding = mode === 'coder' || /\b(code|coding|debug|javascript|javscript|html|hmtl|css|python|pyton|node|api|bug|error|typescript|php|java|react|sql|github|vercel|deploy|backend|frontend)\b/i.test(intentText);
  if (coding) {
    if (configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'coding'};
    if (configured('mistral')) return {provider:'mistral',model:'codestral-latest',reason:'coding'};
  }
  if (mode === 'school') {
    if (configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'school'};
    if (configured('cohere')) return {provider:'cohere',model:'command-a-03-2025',reason:'school'};
  }

  const research=shouldAutoResearch(message) || /\b(research|verify online|check online|source search|web research)\b/i.test(intentText);
  if(research){
    if(configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'research synthesis'};
    if(configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'research synthesis'};
  }

  const reasoning=/\b(reason|reasoning|logic|strategy|plan|complex|architecture|decision|tradeoff)\b/i.test(intentText);
  if(reasoning){
    if(configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'complex reasoning'};
    if(configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'complex reasoning'};
  }

  return null;
}

export function isRetryableStatus(status) { return RETRYABLE.has(Number(status)); }

export function isProviderQuotaFailure(status,error=''){
  const code=Number(status)||0;
  const text=String(error||'').toLowerCase();
  return [402,429].includes(code) ||
    /quota[ _-]?(?:exceeded|exhausted|reached)|(?:insufficient|exhausted|out of) (?:credits?|balance|quota)|rate[ _-]?limit[ _-]?(?:exceeded|reached)|resource_exhausted|insufficient_quota|(?:daily|monthly|usage|billing hard) limit (?:exceeded|reached)|credits? (?:exhausted|depleted)|credit balance (?:exhausted|insufficient)/.test(text);
}
export function captureProviderStreamError(finishState,errorPayload={}){
  const payload=errorPayload&&typeof errorPayload==='object'?errorPayload:{message:String(errorPayload||'')};
  const nested=payload.error&&typeof payload.error==='object'?payload.error:{};
  const status=Number(payload.status||payload.status_code||payload.statusCode||payload.code||nested.status||nested.code)||0;
  const message=String(payload.message||payload.detail||payload.type||nested.message||nested.type||errorPayload||'Provider stream failed').slice(0,900);
  const codeText=String(payload.status||payload.code||nested.status||nested.code||'');
  const creditExhausted=status===402||/RESOURCE_EXHAUSTED|INSUFFICIENT_QUOTA/i.test(codeText)||
    (status===429&&/quota|credit|billing/i.test(`${codeText} ${message}`))||
    /(?:credit(?:s)?\s+(?:exhausted|depleted|insufficient|balance)|insufficient[_ ]quota|resource_exhausted|quota\s+(?:exhausted|exceeded|reached)|billing.{0,30}(?:limit|quota|credit)|(?:limit|quota).{0,30}(?:billing|credit))/i.test(message);
  finishState.creditExhausted=creditExhausted;
  finishState.reason=creditExhausted?'credit_exhausted':'provider_error';
  finishState.status=status||(creditExhausted?402:502);
  finishState.error=message;
}
export function isFallbackableProviderFailure(status,error=''){
  const code=Number(status)||0;
  if([401,403].includes(code)||isProviderQuotaFailure(code,error))return true;
  return /no user matching sent api key|credential was rejected|invalid api key/.test(String(error||'').toLowerCase());
}
export function shouldRetryProviderCredential(status,error=''){
  return isRetryableStatus(status)||isProviderQuotaFailure(status,error);
}


export function passthroughHeaders(upstream, provider, model, fallbackFrom = '', routedReason = '', keyIndex = 0, keyCount = 1) {
  const h = {
    'Content-Type':'text/plain; charset=utf-8',
    'Cache-Control':'no-cache, no-transform',
    'X-AI-Provider':provider,
    'X-AI-Model':model,
    'X-AI-Fallback-From':fallbackFrom,
    'X-AI-Route-Reason':routedReason,
    'X-AI-Key-Index':String(keyIndex + 1),
    'X-AI-Key-Count':String(keyCount),
    'Access-Control-Expose-Headers':'X-AI-Provider, X-AI-Model, X-AI-Fallback-From, X-AI-Route-Reason, X-AI-Key-Index, X-AI-Key-Count, X-RateLimit-Limit-Requests, X-RateLimit-Remaining-Requests, X-RateLimit-Reset-Requests, X-RateLimit-Limit-Tokens, X-RateLimit-Remaining-Tokens, X-RateLimit-Reset-Tokens, Retry-After'
  };
  for (const name of ['x-ratelimit-limit-requests','x-ratelimit-remaining-requests','x-ratelimit-reset-requests','x-ratelimit-limit-tokens','x-ratelimit-remaining-tokens','x-ratelimit-reset-tokens','retry-after']) {
    const v = upstream?.headers?.get(name);
    if (v) h[name] = v;
  }
  return h;
}

export function openAIStreamToText(body, finishState={reason:''}) {
  const decoder = new TextDecoder(); const encoder = new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){ this.buffer=''; },
    transform(chunk, controller){
      this.buffer += decoder.decode(chunk,{stream:true});
      const lines = this.buffer.split('\n'); this.buffer = lines.pop() || '';
      for (const line of lines) {
        const t=line.trim(); if (!t.startsWith('data:')) continue;
        const s=t.slice(5).trim();
        if (!s) continue;
        if (s==='[DONE]') {
          if(!finishState.reason) finishState.reason='stop';
          continue;
        }
        try {
          const p=JSON.parse(s);
          if(p?.error){captureProviderStreamError(finishState,p.error);continue;}
          const choice=p.choices?.[0];
          // Unified tools: capture native tool calls without disturbing text.
          if(choice?.delta?.tool_calls) accumulateOpenAIToolDeltas(finishState,choice.delta.tool_calls);
          if(Array.isArray(choice?.message?.tool_calls)&&choice.message.tool_calls.length){
            accumulateOpenAIToolDeltas(finishState,choice.message.tool_calls.map((tc,i)=>({index:i,id:tc.id,function:tc.function})));
          }
          const rawText=choice?.delta?.content ?? choice?.message?.content;
          const text=typeof rawText==='string'
            ? rawText
            : (Array.isArray(rawText)
                ? rawText.map(part=>typeof part==='string'?part:(part?.text||part?.content||'')).join('')
                : '');
          const reason=choice?.finish_reason ?? choice?.finishReason ?? p?.finish_reason;
          if(reason) finishState.reason=String(reason).toLowerCase();
          if(text) controller.enqueue(encoder.encode(text));
        } catch(_){}
      }
    },
    flush(){
      if(!finishState.reason) finishState.reason='unknown';
    }
  }));
}

export function cohereStreamToText(body, finishState={reason:''}) {
  const decoder=new TextDecoder(); const encoder=new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){this.buffer='';},
    transform(chunk,controller){
      this.buffer += decoder.decode(chunk,{stream:true});
      const lines=this.buffer.split('\n'); this.buffer=lines.pop()||'';
      for(const line of lines){
        const t=line.trim(); if(!t.startsWith('data:')) continue;
        try{
          const p=JSON.parse(t.slice(5).trim());
          if(p?.error||p?.type==='error'){captureProviderStreamError(finishState,p.error||p);continue;}
          const text=p?.delta?.message?.content?.text;
          const reason=p?.delta?.finish_reason ?? p?.finish_reason ?? p?.finishReason;
          if(reason) finishState.reason=String(reason).toLowerCase();
          if(p?.type==='message-end' && !finishState.reason) finishState.reason='stop';
          if(p?.type==='content-delta' && text) controller.enqueue(encoder.encode(text));
        }catch(_){}
      }
    },
    flush(){
      if(!finishState.reason) finishState.reason='unknown';
    }
  }));
}

export function retryLabel(provider, status, hasNext) {
  if (status === 429) return `${providerLabel(provider)} rate limit reached${hasNext ? ' — rotating credential' : ''}`;
  if (status === 402) return `${providerLabel(provider)} billing/model access is unavailable${hasNext ? ' — trying another option' : ' — checking fallback'}`;
  if (status === 401 || status === 403) return `${providerLabel(provider)} credential was rejected${hasNext ? ' — trying another' : ''}`;
  if (status >= 500) return `${providerLabel(provider)} is temporarily busy${hasNext ? ' — trying another credential' : ''}`;
  return `${providerLabel(provider)} request failed${hasNext ? ' — retrying' : ''}`;
}

