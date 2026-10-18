// JEPONGDEVXYZ AI — Helpfulness core
// Extracted from api/chat.js (lines 1002-1237)

import { shouldAutoResearch, userAttachmentCount } from './research.js';

/* =========================================================
   JEPONGDEVXYZ HELPFULNESS CORE
   Improves intent understanding, typo tolerance, context use,
   ambiguity handling, answer quality, and task-aware behavior.
   This does not change the underlying provider model itself.
   ========================================================= */

export function normalizeIntentText(input=''){
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

export function classifyUserTask(message='', files=[]){
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

export function looksReferential(message=''){
  const t=normalizeIntentText(message);
  return /\b(ito|iyan|iyon|iyong|yung|ganito|ganyan|same|same as before|ulit|again|yung nauna|iyong nauna|doon|diyan|dito|this|that|these|those|above|previous|earlier)\b/i.test(t);
}

export function looksAmbiguousButLowRisk(message=''){
  const t=normalizeIntentText(message);
  if(!t) return false;
  const words=t.split(/\s+/).filter(Boolean);
  return words.length<=5 && !/[?]/.test(message) && !/\b(delete|send|buy|pay|password|account|medical|legal|financial)\b/i.test(t);
}

export function helpfulnessCoreInstruction(userMessage='', history=[], files=[]){
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

export function universalCapabilityInstruction(userMessage='', files=[]) {
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

export function responseDepthInstruction(message='', files=[]){
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

export function isVisualWebUiRequest(message='', files=[]){
  const t=normalizeIntentText(message);
  const hasWebFile=Array.isArray(files)&&files.some(f=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx)$/i.test(String(f?.name||f?.filename||'')));
  const buildVerb=/\b(build|create|make|design|redesign|remodel|generate|gawan|gumawa|gawin|ayusin|implement|develop)\b/i.test(t);
  const uiNoun=/\b(ui|ux|interface|website|web app|webapp|frontend|landing page|dashboard|chatbot|chat app|single html|html app|responsive|mobile layout|preview)\b/i.test(t);
  const reference=/\b(reference|screenshot|image|video|katulad|gaya|ganito|ganyan|same|match|replicate|carbon copy|pixel)\b/i.test(t);
  return hasWebFile || (buildVerb&&uiNoun) || (uiNoun&&reference);
}

export function visualUiQualityInstruction(message='', files=[]){
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

export function taskSpecificAccuracyInstruction(message='', files=[]){
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



