// JEPONGDEVXYZ AI — Quality orchestrator
// Extracted from api/chat.js (lines 1238-1930)

import { runConfiguredWebSearch } from './shared.js';
import { providerLabel, modelLabel, activity, normalizeResponseEffort, responseQualityInstruction, artifactInstruction } from './guard.js';
import { modelToolsInstruction } from './tools.js';
import { normalizeIntentText, classifyUserTask, helpfulnessCoreInstruction, universalCapabilityInstruction, responseDepthInstruction, isVisualWebUiRequest, visualUiQualityInstruction, taskSpecificAccuracyInstruction } from './helpfulness.js';
import { isSafePublicUrl, noKeyWebSearch, enrichSearchResults, buildLiveSourceContext } from './research.js';
import { taskSpecificActivityCopy } from './activity.js';
/* =========================================================
   QUALITY ORCHESTRATOR
   Complex requests get a compact same-model preflight brief
   before the final answer. No silent provider/model switching.
   ========================================================= */

export function reasoningComplexityScore(message='', files=[], mode=''){
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

export function shouldUseQualityOrchestrator(message='', files=[], mode=''){
  const task=classifyUserTask(message,files);
  if(task==='casual') return false;
  if(/^(hi|hello|hey|kumusta|kamusta|thanks|thank you|salamat)[!?.\s]*$/i.test(String(message||'').trim())) return false;
  return reasoningComplexityScore(message,files,mode)>=3;
}

export function temperatureFor(message='', files=[]){
  const task=classifyUserTask(message,files);
  if(task==='coding' || task==='troubleshooting' || task==='research') return 0.35;
  if(task==='study' || task==='decision') return 0.45;
  if(task==='writing') return 0.65;
  if(task==='casual') return 0.7;
  return 0.5;
}


export function cleanActivityLabel(value='',max=96){
  return String(value||'')
    .replace(/\[\[\/?JD_[A-Z_]+\]\]/g,'')
    .replace(/\s*\/\s*Follow-up\s*:\s*.*$/i,'')
    .replace(/^[-*•\s]+/,'')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,max);
}

export function taskPlanningCopy(profile={}){
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

export function cleanPlannedResearchQuery(value=''){
  const t=String(value||'').replace(/\s+/g,' ').trim();
  if(!t||/^(?:none|n\/a|not needed|no search|-+)$/i.test(t))return '';
  if(/^(?:RESEARCH_QUERY|RESEARCH_DOMAIN)_\d+\s*:/i.test(t))return '';
  return t.slice(0,240);
}

export function cleanPlannedResearchDomain(value=''){
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

export function defaultActivityBlueprint(profile={}){
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

export function buildActivityBlueprintPrompt(message='', files=[], profile={}){
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

export function parseActivityBlueprintOutput(raw='', profile={}){
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

export function shouldUseDynamicActivityPlanner(message='', files=[]){
  const t=String(message||'').trim();
  if(!t)return false;
  if(/^(?:hi|hello|hey|yo|kumusta|kamusta|thanks|thank you|salamat)[!?.\s]*$/i.test(t))return false;
  return true;
}

export function shouldRunPlannedActivityResearch(profile={},message='',webSearch=false,research=[]){
  if(!Array.isArray(research)||!research.length)return false;
  return webSearch===true;
}

export function resultMatchesPlannedDomain(result={},domain=''){
  if(!domain)return true;
  try{
    const host=new URL(String(result?.url||'')).hostname.toLowerCase().replace(/^www\./,'');
    return host===domain||host.endsWith('.'+domain);
  }catch(_){return false}
}

export function fallbackPlannedActivityResearch(blueprint={},profile={},message=''){
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

export async function runPlannedActivityResearch(blueprint={},emit,{profile={},message='',webSearch=false}={}){
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

export function compactActivityEvidence(parts=[]){
  const clean=(Array.isArray(parts)?parts:[])
    .map(x=>String(x||'').trim())
    .filter(Boolean);
  if(!clean.length)return '';
  const per=Math.max(1200,Math.floor(14000/clean.length));
  return clean.map((x,i)=>`Evidence ${i+1}:\n${x.slice(0,per)}`).join('\n\n').slice(0,14000);
}

export function buildEvidenceActivityUpdatePrompt(message='',blueprint={},evidence=''){
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

export function parseEvidenceActivityUpdate(raw='',blueprint={}){
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

export function buildInternalTaskBriefPrompt(message='', files=[], profile={}){
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

export function parseQualityPreflightOutput(raw='', profile={}){
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


export async function readInternalProviderText(response, maxChars=9000){
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

export function sanitizeAssistantOutput(text='') {
  let out=String(text||'');
  // Strip provider/router diagnostics that must never become the conversational answer.
  out=out.replace(/^\s*(?:User\s*Safety|Safety\s*(?:classification|status)?|Moderation\s*(?:result|status)?|Policy\s*(?:result|status)?)\s*:\s*(?:safe|unsafe|allowed|blocked|pass(?:ed)?|ok)\s*$/gim,'');
  out=out.replace(/^\s*(?:internal\s*)?(?:route|router|provider|classification)\s*:\s*[^\n]{1,160}\s*$/gim,'');
  return out.replace(/\n{3,}/g,'\n\n').trim();
}

export function finalAnswerAuditInstruction(){
  return (
    ' FINAL ANSWER AUDIT: Before sending, silently check that the response ' +
    '(1) answers the latest request, ' +
    '(2) uses relevant conversation/file/tool context correctly, ' +
    '(3) interprets obvious typos and shorthand without derailing, ' +
    '(4) does not invent facts, actions, tests, searches, or results, ' +
    '(5) gives concrete useful help, ' +
    '(6) uses natural grammar in the user’s language, and ' +
    '(7) for code, preserves syntax and requested functionality. ' +
    'Output only the polished final answer.'
  );
}

export function languageQualityInstruction(userMessage='', personalization=null) {
  const msg=String(userMessage||'').trim();
  const preferred=String(personalization?.language||'Auto-detect').trim();

  let text =
    ' Match the primary language of the user’s latest message unless the user explicitly requests another language. ' +
    'Before sending the final response, silently proofread spelling, grammar, punctuation, agreement, word choice, and sentence clarity. ' +
    'Avoid broken mixed-language phrases, awkward literal translations, unexplained fragments, and unnatural wording. ' +
    'Do not expose provider/internal safety labels, hidden reasoning metadata, or internal classification text unless the user explicitly asks about it. ' +
    'Technical terms may remain in standard English when that is clearer. ';

  if(/[\u3040-\u30ff]/.test(msg)) text += 'Use natural, grammatically correct Japanese.';
  else if(/[\uac00-\ud7af]/.test(msg)) text += 'Use natural, grammatically correct Korean.';
  else if(/[\u0600-\u06ff]/.test(msg)) text += 'Use clear, grammatically correct Arabic.';
  else if(/[\u4e00-\u9fff]/.test(msg)) text += 'Use natural Chinese wording and punctuation.';
  else if(/[ñáéíóúü¿¡]/i.test(msg) || /\b(hola|gracias|por favor|cómo|quiero|puedes)\b/i.test(msg)) text += 'Use natural, grammatically correct Spanish.';
  else if(/\b(ako|ikaw|ka|ko|mo|ang|mga|ito|iyan|yun|yan|eto|ano|bakit|bat|bkt|paano|pano|pwede|puwede|pwedi|pede|gusto|sana|naman|nga|salamat|kumusta|kamusta|paki|bigay|gawin|gawn|ayusin|ayosin|lang|rin|din|po|opo|sakin|sa akin|diko|di ko|ganon|ganto|ganito|ganyan)\b/i.test(msg)) {
    text += ' The latest message is Filipino/Tagalog. Reply in natural Filipino/Tagalog with correct grammar and spelling. Use natural Taglish only when technical English terms make the explanation clearer. Avoid stiff or machine-translated Filipino.';
  } else if(/[A-Za-z]/.test(msg)) text += ' Use natural, grammatically correct English.';

  if(preferred && preferred!=='Auto-detect') {
    // A manually selected language is authoritative. This keeps both text output and TTS accent aligned.
    text += ` LANGUAGE LOCK: The user explicitly selected ${preferred}. Reply entirely in ${preferred} unless the user explicitly asks for a translation or a different language in this message. Do not switch to another language because of detected script, locale, provider defaults, or conversation history. Keep proper nouns and unavoidable technical terms unchanged when necessary.`;
  } else {
    text += ' LANGUAGE AUTO-DETECT: Use the primary language of the latest user message. Do not infer an accent/language from provider, device locale, or older messages when the latest message clearly establishes one.';
  }
  return text;
}

export function cleanUpstreamError(raw='', status=500, provider='', model='') {
  let text=String(raw||'').trim();
  try{
    const parsed=JSON.parse(text);
    text=parsed?.error?.message || parsed?.message || parsed?.detail || text;
  }catch(_){}
  if(Number(status)===402 && provider==='mistral'){
    return `${modelLabel(model)} could not be used because this Mistral account currently has no usable quota/access for the request (HTTP 402). Auto Provider Fallback is OFF, so no other model was used.`;
  }
  if(Number(status)===429) return `${providerLabel(provider)} rate limit reached for ${modelLabel(model)} (HTTP 429). ${text.slice(0,260)}`;
  if(Number(status)===404 || Number(status)===400) return `${providerLabel(provider)} could not use ${modelLabel(model)} (HTTP ${status}). ${text.slice(0,320)}`;
  return text.slice(0,700) || `${providerLabel(provider)} request failed with HTTP ${status}.`;
}


export function safeClientTimeZone(value='') {
  const candidate=String(value||'').trim().slice(0,100);
  if(!candidate)return 'UTC';
  try{
    new Intl.DateTimeFormat('en-US',{timeZone:candidate}).format(new Date());
    return candidate;
  }catch(_){return 'UTC';}
}

export function buildCurrentDateContext({clientTimeZone=''}={}) {
  const now=new Date();
  const timeZone=safeClientTimeZone(clientTimeZone);
  let localText='';
  let currentYear=now.getUTCFullYear();
  try{
    localText=new Intl.DateTimeFormat('en-US',{
      timeZone,
      weekday:'long',year:'numeric',month:'long',day:'numeric',
      hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,
      timeZoneName:'short'
    }).format(now);
    currentYear=Number(new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric'}).format(now))||currentYear;
  }catch(_){
    localText=now.toISOString();
  }
  return `

[CURRENT DATE/TIME CONTEXT]
Server UTC: ${now.toISOString()}
User time zone: ${timeZone}
User-local date/time: ${localText}
Current year: ${currentYear}
Treat this server instant as authoritative for words such as today, now, current, this week, this month, and this year. If the user explicitly names a different year, answer for that requested year instead of silently substituting ${currentYear}. For claims that can change over time (news, prices, current office-holders, releases, availability, schedules, scores, outages, or service status), use live research context when available and do not present stale model knowledge as current fact.`;
}

export function buildSystemInstruction(mode, customPrompt, liveWebContext, studyTool, personalization, userMessage='', history=[], files=[], voiceResponseLanguage='') {
  let text =
    'You are JepongDevxyz AI, a capable general-purpose conversational assistant. ' +
    'Hold yourself to the highest standard on every task. ' +
    'Be genuinely creative and original: offer fresh ideas, vivid explanations, and inventive solutions instead of generic filler. ' +
    'For coding, write clean, correct, production-minded code — diagnose root causes, handle edge cases, and make it runnable. ' +
    'For problem-solving, reason carefully step by step, verify important details, and never hand-wave. ' +
    'For anything depending on current information (news, prices, releases, schedules, availability), use the supplied live web research context when present, and be honest when it is absent instead of presenting stale knowledge as fact. ' +
    'Your job is to answer the user directly, understand what they are actually trying to accomplish, and help them reach that goal efficiently. ' +
    'Respond like a polished modern chat assistant: natural, context-aware, concise by default, thorough when the task needs it, and never robotic. Give the direct answer first, then the most useful reasoning, evidence, steps, examples, or code. Fully satisfy every explicit requirement before ending; do not abandon an answer mid-sentence, mid-code-block, or before requested deliverables are complete. Prefer correctness over confident guessing, reconcile contradictions, and make technical answers executable and specific. ' +
    'For greetings and casual conversation, reply conversationally instead of exposing analysis or classifications. For technical tasks, be precise and actionable. ' +
    'Internal safety checks, moderation labels, routing decisions, provider names, hidden analysis, quality briefs, and classification metadata are never the final answer and must never replace the answer to the user. ' +
    'Be accurate, useful, natural, and honest about uncertainty. Do not claim knowledge you do not have; use conversation, supplied files, tools, or model knowledge appropriately. Put programming code inside fenced Markdown code blocks.';

  if (personalization && typeof personalization === 'object') {
    const p = personalization;
    const safe = v => typeof v === 'string' ? v.trim().slice(0, 4000) : '';
    if (safe(p.nickname)) text += ` Address the user as ${safe(p.nickname)} when natural, but do not overuse the name.`;
    if (safe(p.occupation)) text += ` The user describes their occupation/role as: ${safe(p.occupation)}.`;
    if (safe(p.moreAbout)) text += ` User-provided preferences/context: ${safe(p.moreAbout)}.`;
    if (p.memoryEnabled && safe(p.memorySummary)) text += ` User-controlled memory summary: ${safe(p.memorySummary)}.`;
    if (safe(p.customInstructions)) text += ` Custom personalization instructions: ${safe(p.customInstructions)}.`;

    const style = safe(p.baseStyle);
    if (style && style !== 'Default') text += ` Use a ${style.toLowerCase()} communication style.`;
    if (p.warm === 'More') text += ' Use a warmer, supportive tone.';
    else if (p.warm === 'Less') text += ' Keep warmth restrained and matter-of-fact.';
    if (p.enthusiastic === 'More') text += ' Be more energetic and enthusiastic.';
    else if (p.enthusiastic === 'Less') text += ' Keep enthusiasm low-key.';
    if (p.headersLists === 'More') text += ' Prefer clear headings and structured lists when useful.';
    else if (p.headersLists === 'Less') text += ' Avoid unnecessary headings and lists.';
    if (p.emoji === 'More') text += ' Emoji may be used a little more often when appropriate.';
    else if (p.emoji === 'Less') text += ' Avoid emoji unless clearly useful.';
    const responseEffort=normalizeResponseEffort(p.intelligence,p.fastAnswers);
    if (responseEffort==='Instant') text += ' RESPONSE EFFORT: Instant. Start answering immediately. Be direct and concise, avoid unnecessary preamble, and complete the request correctly with the minimum useful deliberation.';
    else if (responseEffort==='Low') text += ' RESPONSE EFFORT: Low. Use light reasoning, perform a quick correctness check, and keep the response efficient and focused.';
    else if (responseEffort==='Medium') text += ' RESPONSE EFFORT: Medium. Balance speed with careful reasoning, verify important details, and provide enough depth to complete the task well.';
    else if (responseEffort==='High') text += ' RESPONSE EFFORT: High. Use deliberate reasoning, check assumptions and important details, consider likely edge cases, and favor a thorough but relevant answer.';
    else if (responseEffort==='Extra') text += ' RESPONSE EFFORT: Extra. Perform deeper analysis before answering, compare plausible approaches when useful, verify important details and constraints, and resolve inconsistencies before the final response.';
    else if (responseEffort==='Max') text += ' RESPONSE EFFORT: Max. Use the maximum practical deliberation available for this request: audit assumptions, constraints, edge cases, and likely failure modes; cross-check important conclusions; and only then produce the clearest final response without padding.';
    if (p.referenceWritingStyle) text += " Match the user's general writing tone and phrasing from the current conversation without copying long passages.";

    const pet = safe(p.pet);
    const petDescription = safe(p.petDescription);
    if (p.showPetInChat !== false && pet && pet !== 'None') text += ` The user selected a companion persona called ${pet}; let it subtly influence friendliness without becoming distracting or roleplay-heavy.`;
    if (p.showPetInChat !== false && pet && pet !== 'None' && petDescription) text += ` Companion preference: ${petDescription}.`;

    const lang = safe(p.language);
    if (lang && lang !== 'Auto-detect') text += ` Selected response language: ${lang}. Treat this as a strict language lock unless the current user explicitly requests another language or translation.`;


    const voicePersona = safe(p.voicePersona);
    if (voicePersona) text += ` Spoken-response personality preference: ${voicePersona}.`;
    const voiceSpeed = Number(p.voiceSpeed);
    const voicePitch = Number(p.voicePitch);
    if (Number.isFinite(voiceSpeed) && voiceSpeed !== 1) text += ` The user prefers spoken responses at about ${voiceSpeed.toFixed(2)}x speed.`;
    if (Number.isFinite(voicePitch) && voicePitch !== 1) text += ` The user prefers a spoken pitch profile near ${voicePitch.toFixed(2)}x.`;
  }
  if (liveWebContext) text += liveWebContext;
  if (mode === 'school') text += ' Act as an academic assistant for students. Explain concepts clearly, teach step-by-step, and prioritize learning.';
  else if (mode === 'coder') text += ' Act as a senior software engineer. Diagnose bugs, explain tradeoffs, and provide clean production-minded code.';
  else if (mode === 'tagalog') text += ' Reply naturally in Filipino/Tagalog unless technical English terms are clearer.';
  else if (mode === 'affiliate') text += ' Act as a digital marketing writing assistant for safe, age-appropriate products and content.';
  else if (mode === 'custom' && customPrompt) text += ` ${customPrompt}`;

  const supportedVoiceLanguages=new Set([
    'Filipino/Tagalog','English','Spanish','Japanese','Korean','Arabic','Bengali','Cebuano','Chinese',
    'Danish','Dutch','Finnish','French','German','Greek','Gujarati','Hebrew','Hindi','Hungarian',
    'Indonesian','Italian','Kannada','Kazakh','Latvian','Lithuanian','Macedonian','Malay','Malayalam',
    'Marathi','Mongolian','Nepali','Norwegian','Persian','Polish','Portuguese','Punjabi','Romanian',
    'Russian','Serbian','Slovak','Slovenian','Swahili','Swedish','Tamil','Telugu','Thai','Turkish',
    'Ukrainian','Urdu','Vietnamese'
  ]);
  if (typeof voiceResponseLanguage === 'string' && supportedVoiceLanguages.has(voiceResponseLanguage.trim())) {
    text += ` In this voice conversation, respond naturally in ${voiceResponseLanguage.trim()} to match the language of the user's latest spoken message. If they switch languages, follow the new language.`;
  }

  if (studyTool === 'quiz') text += ' STUDY TOOL: Create a short quiz from the current topic. Ask questions first and do not reveal all answers immediately.';
  else if (studyTool === 'reviewer') text += ' STUDY TOOL: Produce a structured reviewer with headings, key ideas, definitions, examples, and a quick recap.';
  else if (studyTool === 'flashcards') text += ' STUDY TOOL: Produce concise flashcards in Q: / A: format, one card per pair.';
  else if (studyTool === 'explain') text += ' STUDY TOOL: Explain the topic simply using short steps, analogies, and one concrete example.';
  text += helpfulnessCoreInstruction(userMessage, history, files);
  text += universalCapabilityInstruction(userMessage, files);
  text += responseDepthInstruction(userMessage, files);
  text += taskSpecificAccuracyInstruction(userMessage, files);
  text += visualUiQualityInstruction(userMessage, files);
  text += finalAnswerAuditInstruction();
  text += responseQualityInstruction(userMessage);
  text += languageQualityInstruction(userMessage, personalization);
  text += artifactInstruction(userMessage, files);
  text += modelToolsInstruction();
  text += ' When tool results are supplied in bracketed LIVE/VERIFICATION/PROVIDED LINK sections, use them only when relevant to the user request and distinguish actual fetched/tested results from inference. Never say you searched, tested, ran, compiled, inspected an environment, or opened a website unless the supplied tool context confirms that action. For code, report static verification as static verification—not successful execution. Keep the final answer tightly aligned to the user\'s actual task, attached files, provided URLs, and requested output.';
  text += ' When reporting a concrete VERIFIED software/project result (for example CI passed, deployment status, PR status, build verification, or repository work), you may use at most two compact status cards. A card must be a Markdown blockquote whose first line is exactly > [!STATUS success|Badge text], > [!STATUS info|Badge text], > [!STATUS warning|Badge text], or > [!STATUS error|Badge text]. Put a short heading, optional metadata such as Repository:/Commit:/Branch:, a concise checklist, and at most one normal Markdown link inside the same blockquote. Use success only for facts actually verified by tool context. Do not use status cards for ordinary chat, explanations, guesses, or unverified claims.';

  // Contextual interactive UI. These markers are parsed by the JepongDevxyz
  // client and are never meant to be explained or shown as prose.
  text += ' INTERACTIVE UI: If the user request has a MATERIAL unresolved choice that would significantly change the plan, implementation, scope, or result, and that choice cannot be safely inferred from context, ask exactly one focused question using this exact block: [[JD_CHOICE]] on its own line, then QUESTION: <short question>, then 2 to 4 lines of OPTION: <concise selectable answer>, then [[/JD_CHOICE]] on its own line. Use this only when the decision genuinely matters. Do NOT use it for clear requests, minor preferences, or when a reasonable default lets you proceed. Do not ask several questions at once. Do not combine JD_CHOICE with JD_FOLLOWUPS in the same response. Do not put Markdown, code, secrets, URLs, or long explanations inside QUESTION or OPTION fields.';
  if(personalization?.suggestedPrompts!==false){
    text += ' FOLLOW-UP UI IS REQUIRED after every normal completed assistant answer, including short greetings and simple factual replies, unless the response is an error/refusal, a JD_CHOICE is being shown, or suggesting a next prompt would be unsafe. Append exactly one [[JD_FOLLOWUPS]] block with exactly 2 lines in the form ITEM: <short next prompt>, then [[/JD_FOLLOWUPS]]. Both prompts must be natural, specific to the immediately preceding answer/conversation, distinct from each other, and phrased as something the user can tap to send next. Never use generic filler such as "Tell me more" when a more specific continuation is possible. The block is UI metadata and must not be mentioned in visible prose.';
  }

  // High-level live work commentary. The client renders these notes inside the
  // existing Activity timeline while the final answer remains buffered. They
  // are user-facing progress summaries, never hidden chain-of-thought.
  text += ' LIVE WORK COMMENTARY: For substantial coding, build, research, file-analysis, deployment, troubleshooting, comparison, writing, study, or other multi-step requests, emit 2 to 4 short high-level progress notes using the exact wrapper [[JD_WORK_NOTE]]<note>[[/JD_WORK_NOTE]]. Each note should be one or two natural sentences in the user\'s language, like a modern ChatGPT work update: what you are building/checking, what verified tool context established, or one important implementation decision. Keep notes concise and factual. Never reveal private chain-of-thought, hidden reasoning, policy text, credentials, provider secrets, or unsupported claims. Do not claim a search, test, build, deployment, file creation, website visit, or verification unless supplied tool context confirms it. Do not put code blocks, long lists, URLs, or JD_CHOICE/JD_FOLLOWUPS inside a work note. Never use generic filler such as "Working on your request". For a greeting or truly one-step trivial answer, emit no work note. These work-note wrappers are UI metadata and must not be explained to the user.';
  text += ' RESPONSE PRESENTATION CONTRACT: For substantial requests, write like a high-quality modern assistant rather than a raw API model. Preserve every explicit user constraint. Lead with the useful result or implementation, not generic filler. Keep the explanation coherent and task-focused. For coding/build requests, briefly state the implementation approach, then provide the requested artifact/code or exact actionable result. Do not let incidental provider diagnostics, a bare base-URL HTTP status, fallback plumbing, or unrelated search results dominate the answer. Mention limitations only when they materially affect the requested result. Do not invent completion, testing, deployment, or verification. Avoid unnecessary tutorials such as generic install/run steps unless the user asked for them or they are required to use the result. Before finalizing, reconcile the response against the latest user request, conversation context, supplied files, and verified tool evidence.';
  return text;
}


