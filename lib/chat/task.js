/* lib/chat/task.js — split from api/chat.js (mechanical move, no behavior change). */
import { detectArtifactRequest } from './artifacts.js';
import { configured } from './keys.js';
import { cleanActivityLabel, defaultActivityBlueprint, looksAmbiguousButLowRisk, looksReferential, normalizeIntentText } from './prompts.js';
import { extractPublicUrl, isSafePublicUrl, isWebsiteSecurityRequest, shouldAutoResearch } from './search.js';
import { activity, json } from './utils.js';

function executionEnvironmentContext(message=''){
  const t=String(message||'').toLowerCase();
  if(/\b(apk|android studio|gradle|compile android|build android|xcode|ipa|docker|native build|npm install|pip install|gcc|clang|java compiler|run python|execute code)\b/i.test(t)){
    return `\n\n[EXECUTION ENVIRONMENT]\nThis API runs on Vercel Edge. It can perform HTTP checks, inspect text/code statically, validate JSON/basic markup structure, and research the live public web. It does NOT provide a full local Android/iOS compiler, Docker daemon, package installer, shell, or arbitrary-code execution sandbox. Never claim a native build or executable test ran unless an external configured service actually returned a result.`;
  }
  return '';
}

/* =========================================================
   DYNAMIC CONTEXT-AWARE ACTIVITY ENGINE
   Labels are based on the user's actual request/files/links.
   Search/read/test claims are emitted only after the action occurs.
   ========================================================= */

function cleanTaskText(message=''){
  return String(message||'')
    .replace(/https?:\/\/\S+/gi,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function historyMessageText(item={}){
  const direct=item?.text ?? item?.content ?? item?.message;
  if(typeof direct==='string' && direct.trim())return direct.replace(/\s+/g,' ').trim();
  if(Array.isArray(item?.parts)){
    return item.parts.map(part=>typeof part?.text==='string'?part.text:'')
      .join(' ').replace(/\s+/g,' ').trim();
  }
  return '';
}

function splitContextualTaskMessage(message=''){
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

function isVagueFreshnessFollowUp(message=''){
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

function isAcknowledgementFollowUp(message=''){
  const t=normalizeIntentText(message)
    .replace(/[.!?,…]+$/g,'')
    .replace(/\s+/g,' ')
    .trim();
  if(!t)return false;
  return /^(?:sige(?: po)?|ok(?:ay)?(?: po)?|oo(?: po)?|opo|yes|yep|yeah|go|go ahead|proceed|continue|tuloy|ituloy|gawin mo(?: na)?|do it|ayos|sure|fine|salamat|thanks|thank you)$/i.test(t);
}

function taskAnchorScore(text=''){
  const t=normalizeIntentText(text);
  let score=Math.min(5,t.split(/\s+/).filter(Boolean).length/4);
  if(extractPublicUrl(text).length)score+=6;
  if(/\b(github|repository|repo|vercel|deployment|app|website|ui|ux|code|api|backend|frontend|android|apk|model|provider|plugin|workflow|project|status activity|notification|chatbox|jepongdevxyz)\b/i.test(t))score+=5;
  if(/\b(ayusin|fix|edit|update|modify|build|create|implement|test|verify|review|research|search|hanapin|maghanap)\b/i.test(t))score+=2;
  return score;
}

function contextualTaskMessage(message='', history=[]){
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

function activityTaskSubject(message=''){
  const parts=splitContextualTaskMessage(message);
  if(parts.followUp && (isAcknowledgementFollowUp(parts.followUp)||looksReferential(parts.followUp)||isVagueFreshnessFollowUp(parts.followUp))){
    return shortTaskSubject(parts.anchor||parts.raw);
  }
  return shortTaskSubject(parts.raw);
}

function shortTaskSubject(message=''){
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

function taskProfile(message='', files=[]){
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

function taskSpecificActivityCopy(profile={}, phase='context'){
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

function contextActivityPlan(message='', files=[]){
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

function emitContextActivityStart(message='', files=[], emit){
  const plan=contextActivityPlan(message,files);
  const first=plan.steps[0];
  if(first)activity(emit,first.id,first.label,'running',first.kind,'');
  return plan;
}

function completeContextPlan(plan, emit){
  const first=plan?.steps?.[0];
  const blueprint=plan?.activityBlueprint||defaultActivityBlueprint(plan?.profile||{});
  if(first)activity(emit,first.id,blueprint.context||first.label,'completed',first.kind||blueprint.kind||'process','');
}

function taskWorkingActivity(plan={}){
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

function taskGenerationActivity(plan={}){
  const profile=plan?.profile||{};
  const subject=String(profile.subject||'your request').slice(0,110);
  return {label:'Finalizing the response for: '+subject,kind:'generate'};
}

function taskAuditActivity(message='',files=[],audit={},blueprint=null){
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

function taskCodeVerificationLabel(message='',files=[],failed=0,warnings=0,count=0,blueprint=null){
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

export { executionEnvironmentContext, cleanTaskText, historyMessageText, splitContextualTaskMessage, isVagueFreshnessFollowUp, isAcknowledgementFollowUp, taskAnchorScore, contextualTaskMessage, activityTaskSubject, shortTaskSubject, taskProfile, taskSpecificActivityCopy, contextActivityPlan, emitContextActivityStart, completeContextPlan, taskWorkingActivity, taskGenerationActivity, taskAuditActivity, taskCodeVerificationLabel };
