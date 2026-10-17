/* lib/chat/prompts.js — split from api/chat.js (mechanical move, no behavior change). */
import { runConfiguredWebSearch } from '../../api/web-search.js';
import { userAttachmentCount } from './attachments.js';
import { configured } from './keys.js';
import { sanitizeAssistantOutput } from './sanitize.js';
import { buildLiveSourceContext, enrichSearchResults, isSafePublicUrl, noKeyWebSearch, relevantWebResults, shouldAutoResearch } from './search.js';
import { taskSpecificActivityCopy } from './task.js';
import { activity, json } from './utils.js';

function normalizeIntentText(input=''){
  return String(input||'')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/\s+/g,' ')
    .replace(/\bpano\b/g,'paano')
    .replace(/\bbat\b/g,'bakit')
    .replace(/\bbkt\b/g,'bakit')
    .replace(/\bpwedi\b/g,'pwede')
    .replace(/\bpede\b/g,'pwede')
    .replace(/\bpuedi\b/g,'pwede')
    .replace(/\bayosin\b/g,'ayusin')
    .replace(/\bgawn\b/g,'gawin')
    .replace(/\bgawinm\b/g,'gawin')
    .replace(/\bgumana\b/g,'gumagana')
    .replace(/\bdiko\b/g,'di ko')
    .replace(/\bdi\s+ko\b/g,'hindi ko')
    .replace(/\bsya\b/g,'siya')
    .replace(/\bganon\b/g,'ganoon')
    .replace(/\bganto\b/g,'ganito')
    .replace(/\beto\b/g,'ito')
    .replace(/\byan\b/g,'iyan')
    .replace(/\byung\b/g,'iyong')
    .replace(/\bpls\b/g,'please')
    .replace(/\bplz\b/g,'please')
    .replace(/\bthx\b/g,'thanks')
    .trim();
}

function classifyUserTask(message='', files=[]){
  const raw=String(message||'');
  const t=normalizeIntentText(raw);
  const hasFiles=Array.isArray(files)&&files.length>0;
  const hasImage=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/'));
  const hasVideo=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('video/')||f?.mediaRole==='video-frame');
  const hasDocument=Array.isArray(files)&&files.some(f=>/\b(pdf|docx|pptx|spreadsheet|epub|zip|rtf|text)\b/i.test(String(f?.kind||'')));
  const hasCodeFile=Array.isArray(files)&&files.some(f=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|h|hpp|cs|sql|ya?ml|sh|gradle|properties|toml)$/i.test(String(f?.name||f?.filename||'')));

  if(hasVideo || /\b(video|clip|recording)\b/i.test(t)) return 'video';
  if(hasImage || /\b(image|photo|picture|larawan|screenshot|logo|design)\b/i.test(t)) return 'image';
  if(hasDocument && /\b(summarize|summary|review|read|extract|document|file|pdf|docx|pptx|spreadsheet)\b/i.test(t)) return 'file';
  if(hasCodeFile || /\b(code|coding|debug|bug|error|javascript|typescript|html|css|python|node|api|backend|frontend|react|php|java|sql|github|vercel|deploy|build|compile)\b/i.test(t)) return 'coding';
  if(shouldAutoResearch(raw) || /\b(research|search|verify online|check online|hanapin|maghanap|tingnan online)\b/i.test(t)) return 'research';
  if(/\b(homework|school|study|lesson|explain|solve|equation|quiz|reviewer|flashcard|assignment)\b/i.test(t)) return 'study';
  if(/\b(write|rewrite|grammar|caption|script|email|message|essay|summarize|summary|translate|translation)\b/i.test(t)) return 'writing';
  if(/\b(fix|ayusin|problem|issue|not working|hindi gumagana|gumagana ba|troubleshoot|bakit)\b/i.test(t)) return 'troubleshooting';
  if(/\b(compare|choose|recommend|best|alin|which|budget|plan|planning)\b/i.test(t)) return 'decision';
  if(/^(hi|hello|hey|kumusta|kamusta|sino ka|who are you|thanks|thank you|salamat)[!?.\s]*$/i.test(t)) return 'casual';
  if(hasFiles) return 'file';
  return 'general';
}

function looksReferential(message=''){
  const t=normalizeIntentText(message);
  return /\b(ito|iyan|iyon|iyong|yung|ganito|ganyan|same|same as before|ulit|again|yung nauna|iyong nauna|doon|diyan|dito|this|that|these|those|above|previous|earlier)\b/i.test(t);
}

function looksAmbiguousButLowRisk(message=''){
  const t=normalizeIntentText(message);
  if(!t) return false;
  const words=t.split(/\s+/).filter(Boolean);
  return words.length<=5 && !/[?]/.test(message) && !/\b(delete|send|buy|pay|password|account|medical|legal|financial)\b/i.test(t);
}

function helpfulnessCoreInstruction(userMessage='', history=[], files=[]){
  const task=classifyUserTask(userMessage,files);
  const referential=looksReferential(userMessage);
  const typoish=/\b(pano|bat|bkt|pwedi|pede|puedi|ayosin|gawn|diko|sya|ganon|ganto|eto|yan|pls|plz)\b/i.test(String(userMessage||''));
  const historyCount=Array.isArray(history)?history.length:0;
  const fileCount=userAttachmentCount(files);

  let text =
    ' CORE RESPONSE BEHAVIOR: Be highly helpful, practical, context-aware, and easy to talk to. ' +
    'Infer the user’s intended meaning from ordinary typos, misspellings, shorthand, missing punctuation, phonetic spelling, Taglish, and casual chat style. ' +
    'Do not get stuck analyzing a typo or slang term when the intended request is reasonably clear. Answer the intended request directly. ' +
    'Do not scold the user for grammar or spelling. Only mention a correction when the correction itself is useful to the task. ' +
    'Use the latest user message as the primary instruction, while using prior conversation context to resolve references and preserve ongoing decisions. ' +
    'If the user says “ito”, “iyan”, “ganito”, “same”, “ulit”, “this”, “that”, or similar references, connect them to the most recent relevant message, file, code, link, setting, or result when the context makes that clear. ' +
    'Do not ask the user to repeat information that is already present in the conversation or attached files. ' +
    'When a request has one obvious likely interpretation, proceed with that interpretation. If an assumption materially affects the answer, state it briefly. ' +
    'Ask a clarifying question only when genuinely necessary because two or more plausible interpretations would lead to meaningfully different answers, or required information is missing. ' +
    'For low-risk everyday ambiguity, make a reasonable assumption and help immediately instead of blocking on clarification. ' +
    'Never invent facts, test results, file contents, web searches, or actions. Distinguish verified information from inference. ' +
    'Think through complex tasks internally, but give the user only the useful answer, explanation, result, or high-level progress—not hidden chain-of-thought. ' +
    'Prefer concrete next steps, exact fixes, examples, and actionable details over generic filler. ' +
    'Avoid repetitive disclaimers, unnecessary preambles, and restating the entire question. ' +
    'Keep simple questions simple; give fuller detail only when the task benefits from it. ';

  if(typoish){
    text += ' The latest message contains likely shorthand or typos. Interpret them by context and respond to the intended meaning without making the typo itself the topic.';
  }

  if(referential && historyCount){
    text += ' The latest message is referential. Resolve its pronouns/deictic words against the recent conversation before deciding that context is missing.';
  }

  if(fileCount){
    text += ` The user supplied ${fileCount} file${fileCount===1?'':'s'}. When the request concerns those files, ground the answer in their actual content and do not substitute unrelated general knowledge for unseen file details.`;
  }

  if(task==='casual'){
    text += ' This is casual conversation. Reply naturally and briefly; do not over-explain ordinary greetings or slang.';
  } else if(task==='coding'){
    text +=
      ' For coding work: act like a careful senior engineer. Identify the actual failure mode, preserve working code, make the smallest correct fix when possible, and explain only the important tradeoffs. ' +
      'When code or logs are supplied, inspect those exact details before giving a generic solution. If complete code is requested, provide complete runnable code without placeholder omissions.';
  } else if(task==='troubleshooting'){
    text +=
      ' For troubleshooting: prioritize the most likely cause, give checks in a sensible order, separate confirmed symptoms from guesses, and avoid sending the user through unnecessary steps.';
  } else if(task==='research'){
    text +=
      ' For research/current-information tasks: rely on supplied live-source/tool context when available, prefer recent authoritative evidence, and do not present stale model knowledge as current fact.';
  } else if(task==='study'){
    text +=
      ' For learning tasks: explain at the user’s level, build intuition before jargon, show a worked example when useful, and help the user learn rather than merely dumping an answer.';
  } else if(task==='writing'){
    text +=
      ' For writing tasks: preserve the user’s intended meaning and voice, improve clarity and grammar naturally, and return polished copy rather than discussing every edit unless asked.';
  } else if(task==='decision'){
    text +=
      ' For decisions/comparisons: identify the user’s real constraint, compare the factors that matter, and give a clear recommendation with the main reason and tradeoff.';
  } else if(task==='image'){
    text +=
      ' For image/screenshot tasks: focus on visible evidence and the user’s requested change or question. Do not invent details that are not visible.';
  } else if(task==='video'){
    text +=
      ' For video tasks: use native video analysis when supplied; otherwise use sampled frames and metadata. Do not invent unsampled events or audio/transcript details. Follow the user’s requested transformation, review, or question as closely as the available media evidence permits.';
  }

  if(looksAmbiguousButLowRisk(userMessage)){
    text += ' The request is short and low-risk; infer the most natural meaning from context and answer rather than forcing a clarification.';
  }

  return text;
}

function universalCapabilityInstruction(userMessage='', files=[]) {
  const task=classifyUserTask(userMessage,files);
  const hasAttachments=Array.isArray(files)&&files.length>0;
  const hasProjectArchive=(Array.isArray(files)?files:[]).some(f=>
    /\.(?:zip|apk|aab|jar|aar)$/i.test(String(f?.parentName||f?.name||f?.filename||'')) ||
    ['zip','archive','archive-entry'].includes(String(f?.kind||''))
  );

  let text =
    ' UNIVERSAL CAPABILITY PIPELINE: The application has already normalized conversation context, attachments, available tool evidence, and task-specific verification before this response reaches the selected model. ' +
    'Use that supplied evidence regardless of which provider/model is selected. Do not downgrade the answer merely because your provider normally lacks a particular file parser; if parsed attachment/tool context is present, use it. ' +
    'For every task, first identify the concrete requested outcome and constraints from the latest message plus relevant recent context; then inspect available evidence; then solve or implement; then check the result against the request before answering. ' +
    'Never substitute a generic tutorial when the user supplied concrete files, code, screenshots, links, logs, or project context. ' +
    'Never claim inaccessible evidence was inspected. If evidence is partial, use the inspected portions precisely and say only what remains unverified. ' +
    'Do not expose hidden chain-of-thought; communicate concise conclusions, high-level progress, concrete changes, and verification evidence. ';

  if(hasAttachments){
    text +=
      ' ATTACHMENT TASK RULE: Treat supplied attachment content as first-class task input. Cross-reference filenames, declarations, imports, configuration, callers, resources, and errors when relevant instead of judging a file in isolation.';
  }
  if(hasProjectArchive){
    text +=
      ' PROJECT ARCHIVE RULE: A project archive may be represented by a complete file index plus a task-ranked set of source/config entries. Inspect the actual supplied entries before diagnosing. ' +
      'For Android projects, cross-check Gradle configuration, namespace/applicationId, manifests, Java/Kotlin package declarations, component names, relevant resources, and bundled library paths when those files are available. ' +
      'Do not infer a critical package mismatch, missing class, or successful build merely from filenames or IDE metadata. ' +
      'When asked to fix/update the project, make the smallest evidence-backed changes, preserve unrelated working files, output complete contents for every changed text file, and use exact project-relative paths.';
  }

  if(['coding','troubleshooting'].includes(task)){
    text +=
      ' ENGINEERING CHECK: Trace the failure across the relevant code/config boundary, distinguish root cause from symptom, and ensure the proposed change does not contradict supplied build/configuration evidence.';
  } else if(task==='research'){
    text += ' RESEARCH CHECK: Ground time-sensitive claims in supplied live-source results and separate evidence from inference.';
  } else if(task==='file'){
    text += ' FILE CHECK: Answer from the actual extracted document/archive content and preserve source-specific terminology.';
  } else if(task==='image'||task==='video'){
    text += ' MEDIA CHECK: Ground claims only in supplied visual/media evidence and do not invent unsampled events or audio.';
  }
  return text;
}

function responseDepthInstruction(message='', files=[]){
  const t=normalizeIntentText(message);
  const task=classifyUserTask(message,files);
  const complex =
    task==='coding' || task==='research' || task==='troubleshooting' ||
    /\b(full|complete|buong|step by step|detailed|breakdown|compare|analyze|review|verify|architecture|production)\b/i.test(t);

  if(complex){
    return ' RESPONSE DEPTH: Give enough detail to solve the task completely. Organize the answer clearly, but do not pad it with generic background the user did not need.';
  }
  return ' RESPONSE DEPTH: Be concise and conversational. Answer the question first, then add only the most useful supporting detail.';
}

function isVisualWebUiRequest(message='', files=[]){
  const t=normalizeIntentText(message);
  const hasWebFile=Array.isArray(files)&&files.some(f=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx)$/i.test(String(f?.name||f?.filename||'')));
  const buildVerb=/\b(build|create|make|design|redesign|remodel|generate|gawan|gumawa|gawin|ayusin|implement|develop)\b/i.test(t);
  const uiNoun=/\b(ui|ux|interface|website|web app|webapp|frontend|landing page|dashboard|chatbot|chat app|single html|html app|responsive|mobile layout|preview)\b/i.test(t);
  const reference=/\b(reference|screenshot|image|video|katulad|gaya|ganito|ganyan|same|match|replicate|carbon copy|pixel)\b/i.test(t);
  return hasWebFile || (buildVerb&&uiNoun) || (uiNoun&&reference);
}

function visualUiQualityInstruction(message='', files=[]){
  if(!isVisualWebUiRequest(message,files))return '';
  return (
    ' VISUAL UI IMPLEMENTATION CONTRACT: Treat the requested interface as a real product UI, not a bare HTML demo. ' +
    'Return polished, complete, responsive code with deliberate visual hierarchy, spacing, typography, surfaces, controls, states, and mobile behavior. ' +
    'For a single-file HTML preview, make the visual styling self-contained with substantial inline CSS and working JavaScript; do not rely on an external CSS framework unless the user explicitly asks for one. ' +
    'Do not output an unstyled stack of headings, default buttons, default inputs, or emoji-as-icons when a proper interface was requested. Use consistent CSS variables, intentional sizing, rounded surfaces where appropriate, accessible contrast, focus/hover/active states, and inline SVG icons when icons are needed. ' +
    'If the user supplied a screenshot/video/reference, match its layout hierarchy, proportions, spacing, visual density, component placement, colors, and interaction pattern as closely as the available source context supports instead of merely taking loose inspiration. ' +
    'If the requested app is a chat/AI interface, include a finished shell: navigation/header, empty/welcome state, message area, composer, action controls, responsive mobile layout, and any requested tool/settings/history surfaces. ' +
    'Keep all requested functionality intact while improving presentation. The code must still be understandable and maintainable. ' +
    'Before finalizing, visually audit the markup/CSS in text form: verify there is a complete design system, no obvious browser-default controls left unstyled, no missing responsive rules, and no dependency that the built-in preview would silently block.'
  );
}

function taskSpecificAccuracyInstruction(message='', files=[]){
  const task=classifyUserTask(message,files);
  let text=' ACCURACY DISCIPLINE: If you are uncertain, do not fabricate. State the uncertainty briefly and give the best supported answer or next check.';
  if(task==='coding'){
    text += ' Never claim code was executed, compiled, deployed, or tested unless tool context explicitly confirms that action.';
  }
  if(task==='research'){
    text += ' Never claim information is current merely because it sounds plausible; current claims should come from live tool/source context when available.';
  }
  return text;
}

/* =========================================================
   QUALITY ORCHESTRATOR
   Complex requests get a compact same-model preflight brief
   before the final answer. No silent provider/model switching.
   ========================================================= */

function reasoningComplexityScore(message='', files=[], mode=''){
  const t=normalizeIntentText(message);
  let score=0;
  if(Array.isArray(files) && files.length) score+=2;
  if(mode==='coder' || mode==='school') score+=1;
  if(/\b(debug|bug|error|fix|ayusin|troubleshoot|architecture|production|deploy|build|compile|api|backend|frontend)\b/i.test(t)) score+=3;
  if(/\b(research|verify|compare|analyze|analysis|review|current|latest|real time|web|source)\b/i.test(t)) score+=3;
  if(/\b(full|complete|buong|step by step|detailed|breakdown|plan|strategy|multiple|several)\b/i.test(t)) score+=2;
  if(t.length>500) score+=2;
  else if(t.length>220) score+=1;
  return score;
}

function shouldUseQualityOrchestrator(message='', files=[], mode=''){
  const task=classifyUserTask(message,files);
  if(task==='casual') return false;
  if(/^(hi|hello|hey|kumusta|kamusta|thanks|thank you|salamat)[!?.\s]*$/i.test(String(message||'').trim())) return false;
  return reasoningComplexityScore(message,files,mode)>=3;
}

function temperatureFor(message='', files=[]){
  const task=classifyUserTask(message,files);
  if(task==='coding' || task==='troubleshooting' || task==='research') return 0.35;
  if(task==='study' || task==='decision') return 0.45;
  if(task==='writing') return 0.65;
  if(task==='casual') return 0.7;
  return 0.5;
}

function cleanActivityLabel(value='',max=96){
  return String(value||'')
    .replace(/\[\[\/?JD_[A-Z_]+\]\]/g,'')
    .replace(/\s*\/\s*Follow-up\s*:\s*.*$/i,'')
    .replace(/^[-*•\s]+/,'')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}

function taskPlanningCopy(profile={}){
  const kind=String(profile?.kind||'general');
  const subtype=String(profile?.subtype||'general');
  const key=kind+':'+subtype;
  const exact={
    'github:github-client':{start:'Planning the GitHub client',done:'Planned the GitHub client',checkpoint:'Chose the GitHub implementation'},
    'github:repository-edit':{start:'Planning the repository changes',done:'Planned the repository changes',checkpoint:'Chose the repository update path'},
    'android:android-build':{start:'Planning the Android app',done:'Planned the Android app',checkpoint:'Chose the Android implementation'},
    'android:android-repair':{start:'Planning the Android repair',done:'Planned the Android repair',checkpoint:'Narrowed the Android fix'},
    'web:game':{start:'Planning the game',done:'Planned the game',checkpoint:'Chose the game structure'},
    'web:ui':{start:'Planning the interface',done:'Planned the interface',checkpoint:'Chose the interface structure'},
    'backend:api':{start:'Planning the API',done:'Planned the API',checkpoint:'Chose the API structure'},
    'backend:webhook':{start:'Planning the webhook',done:'Planned the webhook',checkpoint:'Chose the webhook flow'},
    'study:math':{start:'Planning the solution',done:'Planned the solution',checkpoint:'Set the solution method'},
    'decision:compare':{start:'Planning the comparison',done:'Planned the comparison',checkpoint:'Set the comparison criteria'}
  };
  if(exact[key])return exact[key];
  const generic={
    app:{start:'Planning the app',done:'Planned the app',checkpoint:'Chose the app structure'},
    github:{start:'Planning the repository work',done:'Planned the repository work',checkpoint:'Chose the repository approach'},
    android:{start:'Planning the Android work',done:'Planned the Android work',checkpoint:'Chose the Android approach'},
    web:{start:'Planning the web implementation',done:'Planned the web implementation',checkpoint:'Chose the web structure'},
    backend:{start:'Planning the backend work',done:'Planned the backend work',checkpoint:'Chose the backend approach'},
    deployment:{start:'Planning the deployment work',done:'Planned the deployment work',checkpoint:'Chose the deployment approach'},
    research:{start:'Planning the research',done:'Planned the research',checkpoint:'Narrowed the useful evidence'},
    document:{start:'Planning the document work',done:'Planned the document work',checkpoint:'Organized the document evidence'},
    image:{start:'Planning the image analysis',done:'Planned the image analysis',checkpoint:'Organized the visible evidence'},
    video:{start:'Planning the video analysis',done:'Planned the video analysis',checkpoint:'Organized the video evidence'},
    writing:{start:'Planning the response',done:'Planned the response',checkpoint:'Set the response structure'},
    study:{start:'Planning the explanation',done:'Planned the explanation',checkpoint:'Set the explanation path'},
    decision:{start:'Planning the comparison',done:'Planned the comparison',checkpoint:'Set the decision criteria'},
    troubleshooting:{start:'Planning the diagnosis',done:'Planned the diagnosis',checkpoint:'Narrowed the likely cause'},
    general:{start:'Thinking through the request',done:'Planned the response',checkpoint:'Set the response approach'}
  };
  return generic[kind]||generic.general;
}

function cleanPlannedResearchQuery(value=''){
  const t=String(value||'').replace(/\s+/g,' ').trim();
  if(!t||/^(?:none|n\/a|not needed|no search|-+)$/i.test(t))return '';
  if(/^(?:RESEARCH_QUERY|RESEARCH_DOMAIN)_\d+\s*:/i.test(t))return '';
  return t.slice(0,240);
}

function cleanPlannedResearchDomain(value=''){
  let t=String(value||'').trim().toLowerCase();
  if(!t||/^(?:none|n\/a|any|-+)$/i.test(t))return '';
  try{
    if(/^https?:\/\//i.test(t))t=new URL(t).hostname.toLowerCase();
  }catch(_){return ''}
  t=t.replace(/^www\./,'').replace(/\/$/,'');
  if(!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t))return '';
  if(!isSafePublicUrl('https://'+t))return '';
  return t.slice(0,120);
}

function defaultActivityBlueprint(profile={}){
  const context=taskSpecificActivityCopy(profile,'context');
  const analysis=taskSpecificActivityCopy(profile,'prepared');
  const approach=taskSpecificActivityCopy(profile,'prepared2');
  const work=taskSpecificActivityCopy(profile,'work');
  const audit=taskSpecificActivityCopy(profile,'audit');
  const plan=taskPlanningCopy(profile);
  return {
    planStart:cleanActivityLabel(plan.start),
    planDone:cleanActivityLabel(plan.done),
    context:cleanActivityLabel(context.label),
    analysis:cleanActivityLabel(analysis.label),
    approach:cleanActivityLabel(approach.label),
    work:cleanActivityLabel(work.label),
    checkpoint:cleanActivityLabel(plan.checkpoint),
    audit:cleanActivityLabel(audit.label),
    commentary:'',
    responseContract:'',
    research:[],
    trace:[],
    kind:work.kind||context.kind||'process',
    dynamic:false
  };
}

function buildActivityBlueprintPrompt(message='', files=[], profile={}){
  const names=[...new Set((Array.isArray(files)?files:[])
    .map(f=>String(f?.parentName||f?.name||f?.filename||'').trim())
    .filter(Boolean))].slice(0,8);
  return [
    'Create a public work-trace plan for another assistant that will perform this exact request.',
    'This work trace must behave like a modern ChatGPT work timeline: a short planning state, a short completed planning state, one natural public work update, real tool searches only when useful, evidence-grounded milestones, then the final answer.',
    'Do NOT answer the request. Do NOT reveal chain-of-thought, hidden reasoning, credentials, policy text, or provider internals.',
    'Use the same intended deliverable, platform, architecture, scope, and major implementation choices that the final answer should use.',
    'If the platform is not specified, choose a practical one from the request and recent conversation context; do not automatically turn every app request into a website.',
    'Use the user\'s language when obvious.',
    'PLAN_START and PLAN_DONE should be the same short idea in progressive/past form, for example "Planning the app" -> "Planned the app".',
    'CONTEXT, ANALYSIS, APPROACH, WORK, CHECKPOINT, and AUDIT should usually be 3-8 words and must be specific to this request.',
    'COMMENTARY should be 1-3 natural sentences that publicly summarize the chosen approach at a high level, like a ChatGPT work update. It must not expose private reasoning.',
    'RESEARCH_QUERY fields are optional. Use them only when current or official documentation materially improves correctness. Prefer official documentation. Leave both query and domain blank when research is unnecessary.',
    'RESEARCH_DOMAIN must be only a hostname such as docs.github.com or developer.android.com, never a URL path.',
    'Never claim a search, file read, build, compile, runtime test, deployment, repository write, or environment check unless a real tool can actually perform it.',
    'CHECKPOINT must be safe even before tool results: prefer "Chose the implementation" or "Set the response structure", not "Built the app" or "Tests passed".',
    'RESPONSE_CONTRACT is a compact high-level contract for the final answer: intended deliverable, platform assumption, major components, and important caveats. It is not chain-of-thought.',
    'TRACE: 3-8 compact public milestones separated by " | ". This is the exact request-specific visible sequence between planning and final generation. It must be chronological, non-repetitive, and consistent with RESPONSE_CONTRACT.',
    'TRACE is public progress metadata, not hidden reasoning. It may name observable operations, artifacts, requirements, files, tools, checks, or answer sections, but never private chain-of-thought.',
    'Do not force one fixed stage template across requests. A coding task, translation, image/file analysis, research question, troubleshooting request, and repository task should naturally produce different milestone labels and counts.',
    'Never put an external operation in TRACE unless this pipeline can actually perform it; real search/file/GitHub/build/deploy events remain evidence-backed tool milestones.',
    'All fields, TRACE, and RESPONSE_CONTRACT must describe ONE coherent approach. Never plan one architecture in Activity and answer with another.',
    'Return EXACTLY these fifteen lines and nothing else:',
    'PLAN_START: <short running planning label>',
    'PLAN_DONE: <short completed planning label>',
    'CONTEXT: <specific label>',
    'ANALYSIS: <specific label>',
    'APPROACH: <specific label>',
    'WORK: <specific label>',
    'CHECKPOINT: <specific evidence-safe milestone>',
    'AUDIT: <specific label>',
    'COMMENTARY: <1-3 sentence public work update>',
    'RESEARCH_QUERY_1: <query or blank>',
    'RESEARCH_DOMAIN_1: <hostname or blank>',
    'RESEARCH_QUERY_2: <query or blank>',
    'RESEARCH_DOMAIN_2: <hostname or blank>',
    'RESPONSE_CONTRACT: <one-line high-level answer contract>',
    'TRACE: <milestone 1> | <milestone 2> | <milestone 3> ...',
    'Task type: '+String(profile?.kind||classifyUserTask(message,files))+'/'+String(profile?.subtype||'general'),
    names.length?'Attachments: '+names.join(', '):'Attachments: none',
    'User request: '+String(message||'').slice(0,8000)
  ].join('\n');
}

function parseActivityBlueprintOutput(raw='', profile={}){
  const fallback=defaultActivityBlueprint(profile);
  const text=sanitizeAssistantOutput(String(raw||'')).trim();
  if(!text)return fallback;
  const value=(name,max=150)=>{
    const rx=new RegExp('(?:^|\\n)\\s*'+name+'\\s*:\\s*(.*?)(?=\\n\\s*[A-Z0-9_]+\\s*:|$)','i');
    return cleanActivityLabel(text.match(rx)?.[1]||'',max);
  };
  const planStart=value('PLAN_START');
  const planDone=value('PLAN_DONE');
  const context=value('CONTEXT');
  const analysis=value('ANALYSIS');
  const approach=value('APPROACH');
  const work=value('WORK');
  const checkpoint=value('CHECKPOINT');
  const audit=value('AUDIT');
  const commentary=value('COMMENTARY',1000);
  const responseContract=value('RESPONSE_CONTRACT',2500);
  const traceRaw=value('TRACE',2400);
  const trace=traceRaw.split(/\s*\|\s*/).map(x=>cleanActivityLabel(x,150)).filter(Boolean).slice(0,8);
  const research=[
    {
      query:cleanPlannedResearchQuery(value('RESEARCH_QUERY_1',240)),
      domain:cleanPlannedResearchDomain(value('RESEARCH_DOMAIN_1',160))
    },
    {
      query:cleanPlannedResearchQuery(value('RESEARCH_QUERY_2',240)),
      domain:cleanPlannedResearchDomain(value('RESEARCH_DOMAIN_2',160))
    }
  ].filter(item=>item.query);
  const valid=[planStart,planDone,context,analysis,approach,work,audit].filter(Boolean).length>=5;
  if(!valid)return {
    ...fallback,
    commentary:commentary||fallback.commentary,
    responseContract:responseContract||fallback.responseContract,
    research,
    trace:trace.length?trace:fallback.trace
  };
  return {
    planStart:planStart||fallback.planStart,
    planDone:planDone||fallback.planDone,
    context:context||fallback.context,
    analysis:analysis||fallback.analysis,
    approach:approach||fallback.approach,
    work:work||fallback.work,
    checkpoint:checkpoint||fallback.checkpoint,
    audit:audit||fallback.audit,
    commentary,
    responseContract,
    research,
    trace,
    kind:fallback.kind,
    dynamic:true
  };
}

function shouldUseDynamicActivityPlanner(message='', files=[]){
  const t=String(message||'').trim();
  if(!t)return false;
  if(/^(?:hi|hello|hey|yo|kumusta|kamusta|thanks|thank you|salamat)[!?.\s]*$/i.test(t))return false;
  return true;
}

function shouldRunPlannedActivityResearch(profile={},message='',webSearch=false,research=[]){
  if(!Array.isArray(research)||!research.length)return false;
  return webSearch===true;
}

function resultMatchesPlannedDomain(result={},domain=''){
  if(!domain)return true;
  try{
    const host=new URL(String(result?.url||'')).hostname.toLowerCase().replace(/^www\./,'');
    return host===domain||host.endsWith('.'+domain);
  }catch(_){return false}
}

function fallbackPlannedActivityResearch(blueprint={},profile={},message=''){
  const out=[];
  const t=[message,blueprint?.responseContract,blueprint?.commentary].map(x=>String(x||'')).join(' ');
  const kind=String(profile?.kind||'general');
  const intent=profile?.intent||{};
  if(kind==='github' && (intent.create||intent.edit||intent.test||/\b(commit|push|clone|pull|branch|token|oauth|git)\b/i.test(t))){
    out.push({
      query:'GitHub REST API Git database blobs trees commits refs authentication fine-grained token',
      domain:'docs.github.com'
    });
  }
  if((kind==='android'||/\bnative Android\b|\bAndroid app\b|\bKotlin\b/i.test(t))){
    out.push({
      query:'Android app architecture networking secure credential storage permissions',
      domain:'developer.android.com'
    });
  }
  if(kind==='deployment' || /\bVercel\b/i.test(t)){
    out.push({
      query:'Vercel deployment project configuration serverless functions',
      domain:'vercel.com'
    });
  }
  return out.slice(0,2);
}

async function runPlannedActivityResearch(blueprint={},emit,{profile={},message='',webSearch=false}={}){
  const candidates=[
    ...(Array.isArray(blueprint?.research)?blueprint.research:[]),
    ...fallbackPlannedActivityResearch(blueprint,profile,message)
  ];
  const seen=new Set();
  const planned=candidates.filter(item=>{
    const key=(String(item?.domain||'')+'|'+String(item?.query||'')).toLowerCase();
    if(!key||seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,2);
  if(!shouldRunPlannedActivityResearch(profile,message,webSearch,planned))return '';
  const contexts=[];
  for(let i=0;i<planned.length;i++){
    const item=planned[i];
    const query=cleanPlannedResearchQuery(item?.query);
    const domain=cleanPlannedResearchDomain(item?.domain);
    if(!query)continue;
    const id='planned-web-'+i;
    activity(emit,id,domain?`Searching ${domain}`:'Searching the web','running','web',query.slice(0,120));
    const scopedQuery=domain?`${query} site:${domain}`:query;
    let results=[];
    let usedPublicFallback=true;
    let configuredAttempted=false;
    try{
      const outcome=await runConfiguredWebSearch(scopedQuery,{
        env:process.env,fetchImpl:fetch,timeoutMs:7000,maxResults:5,isSafePublicUrl,relevantWebResults,
        onProviderAttempt:({state,httpStatus,resultCount})=>{
          if(state!=='unconfigured')configuredAttempted=true;
          const label=state==='unconfigured'
            ?'No configured Web Search API found • checking public sources'
            :state==='completed'
              ?`Found ${resultCount} relevant results`
              :state==='warning'
                ?`Web Search API unavailable or returned no relevant results${httpStatus?` • HTTP ${httpStatus}`:''} • trying another source`
                :'Searching the web';
          activity(emit,id,label,state==='unconfigured'?'running':state,'web',domain||query.slice(0,120));
        }
      });
      results=outcome.results;
      if(outcome.provider)usedPublicFallback=false;
      if(!results.length){
        const reason=configuredAttempted
          ?'configured Web Search APIs returned no usable results'
          :'no Web Search API is configured';
        results=await noKeyWebSearch(scopedQuery,null,{fallbackReason:reason});
        usedPublicFallback=true;
      }
    }catch(_){results=[]}
    if(domain){
      const official=results.filter(result=>resultMatchesPlannedDomain(result,domain));
      if(official.length)results=official;
    }
    const selected=results.slice(0,3);
    let enriched=[];
    try{
      enriched=await enrichSearchResults(selected,null,Math.min(2,selected.length));
    }catch(_){enriched=selected}
    const usable=enriched.length?enriched:selected;
    if(usable.length){
      activity(emit,id,`Searched ${usable.length} website${usable.length===1?'':'s'}${usedPublicFallback?' • public fallback':''}`,'completed','web',domain||query.slice(0,100));
      const ctx=buildLiveSourceContext(usable);
      if(ctx)contexts.push(ctx);
    }else{
      activity(emit,id,domain?`Could not find a usable source on ${domain}`:'No usable web source found','warning','web',query.slice(0,120));
    }
  }
  return contexts.join('\n');
}

function compactActivityEvidence(parts=[]){
  const clean=(Array.isArray(parts)?parts:[])
    .map(x=>String(x||'').trim())
    .filter(Boolean);
  if(!clean.length)return '';
  const per=Math.max(1200,Math.floor(14000/clean.length));
  return clean.map((x,i)=>`Evidence ${i+1}:\n${x.slice(0,per)}`).join('\n\n').slice(0,14000);
}

function buildEvidenceActivityUpdatePrompt(message='',blueprint={},evidence=''){
  return [
    'Update the public work trace after real tool/file/research evidence was gathered.',
    'Do NOT answer the user. Do NOT reveal chain-of-thought or private reasoning.',
    'Use only the evidence below. Never claim a build, compile, runtime test, deployment, repository write, file read, or search unless the evidence actually says it happened.',
    'CHECKPOINT: 3-8 words, past tense, summarizing what the evidence established or what implementation choice is now justified.',
    'COMMENTARY: 1-3 natural user-facing sentences explaining what the evidence changed, confirmed, or narrowed. This should read like a ChatGPT work update, not a final answer.',
    'WORK: 3-8 words describing the next answer-construction step. It may say preparing/structuring/drafting/building the response, but must not pretend an external action ran.',
    'RESPONSE_CONTRACT: update the high-level final-answer contract so it stays consistent with the evidence.',
    'Return EXACTLY these four lines and nothing else:',
    'CHECKPOINT: <short evidence-grounded milestone>',
    'COMMENTARY: <1-3 sentence public work update>',
    'WORK: <short next response-construction step>',
    'RESPONSE_CONTRACT: <updated one-line final-answer contract>',
    'User request: '+String(message||'').slice(0,7000),
    'Existing response contract: '+String(blueprint?.responseContract||'').slice(0,2500),
    'Evidence:',
    String(evidence||'').slice(0,14000)
  ].join('\n');
}

function parseEvidenceActivityUpdate(raw='',blueprint={}){
  const text=sanitizeAssistantOutput(String(raw||'')).trim();
  if(!text)return null;
  const value=(name,max=1000)=>{
    const rx=new RegExp('(?:^|\\n)\\s*'+name+'\\s*:\\s*(.*?)(?=\\n\\s*[A-Z0-9_]+\\s*:|$)','i');
    return cleanActivityLabel(text.match(rx)?.[1]||'',max);
  };
  const checkpoint=value('CHECKPOINT',140);
  const commentary=value('COMMENTARY',1200);
  const work=value('WORK',140);
  const responseContract=value('RESPONSE_CONTRACT',2500);
  if(!checkpoint&&!commentary&&!work&&!responseContract)return null;
  return {
    checkpoint:checkpoint||blueprint?.checkpoint||'',
    commentary,
    work:work||blueprint?.work||'',
    responseContract:responseContract||blueprint?.responseContract||''
  };
}

function buildInternalTaskBriefPrompt(message='', files=[], profile={}){
  const task=classifyUserTask(message,files);
  return [
    'Prepare a compact quality preflight for another assistant pass.',
    'Do not write the final answer to the user.',
    'Do not provide hidden chain-of-thought or private step-by-step reasoning.',
    'Also create concise request-specific Activity labels.',
    'Use EXACTLY these sections in this order:',
    'ACTIVITY_CONTEXT: concise label for understanding/inspecting this exact task.',
    'ACTIVITY_ANALYSIS: concise label for organizing the concrete requirements/evidence.',
    'ACTIVITY_APPROACH: concise label for the implementation/answer structure being prepared.',
    'ACTIVITY_WORK: concise label for what the final-answer pass will actively build/solve/analyze/draft.',
    'ACTIVITY_AUDIT: concise label for checking the produced answer against the request; no fake runtime claims.',
    'PUBLIC_UPDATE: one short natural paragraph (1-2 sentences) in the user\'s language describing the concrete approach. It must sound like a polished ChatGPT work update, not a generic promise.',
    'RESPONSE_CONTRACT: one compact high-level answer contract stating the intended deliverable, platform assumptions (or that platform is unspecified), major components, and important caveats. The final answer must follow the same approach as the Activity labels.',
    'INTERNAL_BRIEF: concise structured notes covering the intended user goal, hard constraints, relevant verified evidence, likely mistakes to avoid, and the best final-answer approach. Mark uncertain items as uncertain. Do not include private reasoning.',
    'Activity labels should normally be 3-10 words, specific to this exact request, and should not repeat the whole user prompt.',
    isVisualWebUiRequest(message,files)
      ? 'UI_QUALITY_CHECK: identify the target visual structure, responsive/mobile requirements, required styled components, interaction states, and whether the final single-file preview must avoid external styling dependencies. Explicitly reject a bare/default-browser-looking implementation.'
      : 'UI_QUALITY_CHECK: Not applicable.',
    'Task category: '+task+'.',
    'Task subtype: '+String(profile?.subtype||'general')+'.',
    'Latest user request: '+String(message||'').slice(0,12000)
  ].join('\n');
}

function parseQualityPreflightOutput(raw='', profile={}){
  const text=sanitizeAssistantOutput(String(raw||'')).trim();
  if(!text)return {publicUpdate:'',brief:'',activityBlueprint:defaultActivityBlueprint(profile)};
  const line=(name,max=150)=>{
    const rx=new RegExp('(?:^|\\n)\\s*'+name+'\\s*:\\s*(.+?)(?=\\n\\s*[A-Z_]+\\s*:|$)','i');
    return cleanActivityLabel(text.match(rx)?.[1]||'',max);
  };
  const publicMatch=text.match(/PUBLIC_UPDATE\s*:\s*([\s\S]*?)(?=\n\s*(?:RESPONSE_CONTRACT|INTERNAL_BRIEF)\s*:|$)/i);
  const briefMatch=text.match(/INTERNAL_BRIEF\s*:\s*([\s\S]*)$/i);
  const cleanPublic=String(publicMatch?.[1]||'')
    .replace(/\s+/g,' ').trim().slice(0,900);
  const brief=String(briefMatch?.[1]||text)
    .replace(/^ACTIVITY_[A-Z_]+\s*:[^\n]*\n?/gim,'')
    .replace(/^PUBLIC_UPDATE\s*:[\s\S]*?(?=\n\s*INTERNAL_BRIEF\s*:)/i,'')
    .replace(/^\s*INTERNAL_BRIEF\s*:\s*/i,'')
    .trim().slice(0,12000);
  const fallback=defaultActivityBlueprint(profile);
  const context=line('ACTIVITY_CONTEXT');
  const analysis=line('ACTIVITY_ANALYSIS');
  const approach=line('ACTIVITY_APPROACH');
  const work=line('ACTIVITY_WORK');
  const audit=line('ACTIVITY_AUDIT');
  const responseContract=line('RESPONSE_CONTRACT',2200);
  const activityBlueprint={
    context:context||fallback.context,
    analysis:analysis||fallback.analysis,
    approach:approach||fallback.approach,
    work:work||fallback.work,
    audit:audit||fallback.audit,
    commentary:cleanPublic,
    responseContract:responseContract||fallback.responseContract,
    kind:fallback.kind,
    dynamic:Boolean(context||analysis||approach||work||audit)
  };
  return {publicUpdate:cleanPublic,brief,activityBlueprint};
}

async function readInternalProviderText(response, maxChars=9000){
  if(!response?.body) return '';
  try{
    const reader=response.body.getReader();
    const decoder=new TextDecoder();
    let text='';
    while(true){
      const {done,value}=await reader.read();
      if(done) break;
      text+=decoder.decode(value,{stream:true});
      if(text.length>=maxChars){
        text=text.slice(0,maxChars);
        try{await reader.cancel();}catch(_){}
        break;
      }
    }
    text+=decoder.decode();
    return text.trim();
  }catch(_){
    return '';
  }
}

export { normalizeIntentText, classifyUserTask, looksReferential, looksAmbiguousButLowRisk, helpfulnessCoreInstruction, universalCapabilityInstruction, responseDepthInstruction, isVisualWebUiRequest, visualUiQualityInstruction, taskSpecificAccuracyInstruction, reasoningComplexityScore, shouldUseQualityOrchestrator, temperatureFor, cleanActivityLabel, taskPlanningCopy, cleanPlannedResearchQuery, cleanPlannedResearchDomain, defaultActivityBlueprint, buildActivityBlueprintPrompt, parseActivityBlueprintOutput, shouldUseDynamicActivityPlanner, shouldRunPlannedActivityResearch, resultMatchesPlannedDomain, fallbackPlannedActivityResearch, runPlannedActivityResearch, compactActivityEvidence, buildEvidenceActivityUpdatePrompt, parseEvidenceActivityUpdate, buildInternalTaskBriefPrompt, parseQualityPreflightOutput, readInternalProviderText };
