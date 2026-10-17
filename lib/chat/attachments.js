/* lib/chat/attachments.js — split from api/chat.js (mechanical move, no behavior change). */
import { configured, modelLabel, providerLabel } from './keys.js';
import { normalizeIntentText, readInternalProviderText } from './prompts.js';
import { runCloudflare, runGemini, runOpenAICompatible } from './providers.js';
import { activity, json } from './utils.js';

function textFromAttachment(file){
  try{
    if(typeof file?.extractedText==='string' && file.extractedText.trim()){
      return file.extractedText.slice(0,650000);
    }
    if(!file?.data)return '';
    const mime=String(file.mimeType||'').toLowerCase();
    const name=String(file.name||file.filename||'');
    const textual=/^(text\/|application\/(json|javascript|xml|x-yaml|yaml))/i.test(mime) ||
      /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|md|txt|csv|xml|svg|py|php|java|kt|kts|c|cpp|h|hpp|cs|sql|yaml|yml|sh|log|gradle|properties|toml|ini|cfg|conf|env|pro)$/i.test(name);
    if(!textual)return '';
    const bin=atob(String(file.data));
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder('utf-8',{fatal:false}).decode(bytes).slice(0,180000);
  }catch(_){return '';}
}

function sanitizeIncomingAttachments(files=[]){
  const input=Array.isArray(files)?files.slice(0,64):[];
  let totalBase64=0;
  let totalText=0;
  const out=[];

  for(const raw of input){
    if(!raw||typeof raw!=='object')continue;
    const f={
      name:String(raw.name||raw.filename||'Attachment').slice(0,220),
      parentName:String(raw.parentName||'').slice(0,220),
      mimeType:String(raw.mimeType||'application/octet-stream').slice(0,120),
      originalMimeType:String(raw.originalMimeType||raw.mimeType||'application/octet-stream').slice(0,120),
      kind:String(raw.kind||'file').slice(0,40),
      mediaRole:String(raw.mediaRole||'').slice(0,40),
      size:Math.max(0,Number(raw.size)||0),
      frameTimeSeconds:Number.isFinite(Number(raw.frameTimeSeconds))?Number(raw.frameTimeSeconds):null,
      pageNumber:Number.isFinite(Number(raw.pageNumber))?Number(raw.pageNumber):null,
      extractionError:String(raw.extractionError||'').slice(0,500),
      extractionWarning:String(raw.extractionWarning||'').slice(0,500),
      archiveFileCount:Math.max(0,Number(raw.archiveFileCount)||0),
      archiveReadableCount:Math.max(0,Number(raw.archiveReadableCount)||0),
      archiveBinaryCount:Math.max(0,Number(raw.archiveBinaryCount)||0),
      archiveSelectedCount:Math.max(0,Number(raw.archiveSelectedCount)||0),
      archiveSelectedChars:Math.max(0,Number(raw.archiveSelectedChars)||0),
      archivePriority:Number.isFinite(Number(raw.archivePriority))?Number(raw.archivePriority):0
    };

    if(typeof raw.extractedText==='string' && totalText<1150000){
      const remain=1150000-totalText;
      f.extractedText=raw.extractedText.slice(0,Math.min(650000,remain));
      totalText+=f.extractedText.length;
    }else f.extractedText='';

    if(typeof raw.data==='string' && totalBase64<2500000){
      const remain=2500000-totalBase64;
      if(raw.data.length<=remain && raw.data.length<=1500000){
        f.data=raw.data;
        totalBase64+=raw.data.length;
      }
    }

    out.push(f);
  }
  return out;
}

function attachmentRootName(file={}){
  return String(file.parentName||file.name||file.filename||'Attachment');
}

function userAttachmentCount(files=[]){
  const names=new Set();
  for(const f of Array.isArray(files)?files:[]){
    const root=attachmentRootName(f);
    if(root)names.add(root);
  }
  return names.size;
}

function buildAttachmentSourceContext(files=[], userMessage=''){
  if(!Array.isArray(files)||!files.length)return '';
  const grouped=new Map();

  for(const f of files){
    const root=attachmentRootName(f);
    if(!grouped.has(root))grouped.set(root,{root,items:[],texts:[],errors:[],warnings:[]});
    const g=grouped.get(root);
    g.items.push(f);

    const text=textFromAttachment(f);
    if(text && !f.mediaRole)g.texts.push(text);
    if(f.extractionError)g.errors.push(f.extractionError);
    if(f.extractionWarning)g.warnings.push(f.extractionWarning);
  }

  const roots=[...grouped.entries()];
  const t=normalizeIntentText(userMessage);
  const codeEditIntent=/\b(fix|ayusin|edit|modify|update|add|lagyan|implement|paganahin|make it work|working|gumagana|refactor|rewrite)\b/i.test(t);
  const singleCodeFile=roots.length===1 && /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|h|hpp|cs|sql|ya?ml|sh|gradle|properties|toml)$/i.test(roots[0]?.[0]||'');
  const hasProjectArchive=roots.some(([name])=>/\.(?:zip|apk|aab|jar|aar)$/i.test(String(name||'')));
  const sourceBudget=(codeEditIntent&&singleCodeFile)?650000:(hasProjectArchive?380000:320000);

  let out='\n\n[ATTACHED SOURCE CONTENT]\n';
  let used=0;
  for(const [name,g] of roots.slice(0,12)){
    if(used>=sourceBudget)break;
    const first=g.items[0]||{};
    const mediaItems=g.items.filter(x=>x?.data && /^(image|video)\//i.test(String(x.mimeType||''))).length;
    out+=`\n--- Attachment: ${name} ---\n`;
    out+=`Type: ${first.originalMimeType||first.mimeType||'unknown'}\n`;
    if(first.size)out+=`Size: ${first.size} bytes\n`;
    if(first.duration)out+=`Duration: ${first.duration}\n`;
    if(mediaItems)out+=`Prepared visual/media parts: ${mediaItems}\n`;

    const text=g.texts.join('\n\n');
    if(text){
      const remain=sourceBudget-used;
      const part=text.slice(0,remain);
      out+=`Extracted content:\n${part}\n`;
      used+=part.length;
    }else if(!mediaItems){
      out+='No readable text content was extracted from this attachment.\n';
    }

    if(g.warnings.length)out+=`Extraction note: ${[...new Set(g.warnings)].join(' | ').slice(0,700)}\n`;
    if(g.errors.length)out+=`Extraction error: ${[...new Set(g.errors)].join(' | ').slice(0,700)}\n`;
  }

  out+=
    '\nATTACHMENT GROUNDING RULES: When the user asks to summarize, extract, answer questions, review, edit, transform, or draft from these attachments, treat the attachment content as the requested source. Preserve its terminology and distinctions. Do not silently replace missing information with outside knowledge. If a requested fact is not supported by the attachment, say so. When multiple files are present, distinguish them by filename. If outside research is also requested, clearly separate attachment-derived information from outside information.' +
    '\nSOURCE EDITING RULES: If the user attaches a source file such as index.html, JavaScript, CSS, JSON, Python, or a project archive and asks you to make it work, fix it, or add features, inspect the supplied source first and implement the request against that exact source. Preserve working behavior unless the requested change requires otherwise. Do not answer with generic sample code when the user clearly wants their uploaded file modified. If the supplied source is truncated, unreadable, or incomplete, say exactly what could not be inspected instead of pretending the whole file was reviewed.';
  return out;
}

function mediaAttachments(files=[]){
  return (Array.isArray(files)?files:[]).filter(f=>{
    if(!f?.data)return false;
    const mime=String(f.mimeType||'').toLowerCase();
    return mime.startsWith('image/') || mime.startsWith('video/');
  }).slice(0,14);
}

function mediaGroundingPrompt(message='', files=[]){
  const media=mediaAttachments(files);
  const manifest=media.map((f,i)=>{
    let detail=`${i+1}. ${f.name}`;
    if(f.mediaRole==='video-frame' && f.frameTimeSeconds!=null)detail+=` at ${f.frameTimeSeconds}s`;
    if(f.mediaRole==='pdf-page' && f.pageNumber!=null)detail+=` (PDF page ${f.pageNumber})`;
    if(f.parentName)detail+=` from ${f.parentName}`;
    return detail;
  }).join('\n');

  return (
    'Analyze the attached media strictly for the user’s latest request. ' +
    'Describe only evidence that is actually visible/audible in the supplied media. ' +
    'For screenshots or documents, read visible text carefully. ' +
    'For sampled video frames, do not claim events between frames unless clearly inferable; do not invent audio. ' +
    'Group findings by source filename when there are multiple attachments. ' +
    'Return a concise factual media-analysis note for another assistant pass, not a conversational final answer.\n\n' +
    `User request: ${String(message||'').slice(0,8000)}\n\nMedia manifest:\n${manifest}`
  );
}

function usableMediaAnalysis(text=''){
  const t=String(text||'').replace(/\s+/g,' ').trim();
  if(t.length<24)return false;
  const refusal=/(?:can(?:not|'t)|unable to|don't have|do not have)\s+(?:see|view|access|open|inspect|analy[sz]e|process)\b.{0,80}\b(?:image|photo|picture|video|attachment|file)/i.test(t) ||
    /(?:no|without)\s+(?:image|photo|video|attachment)\s+(?:was\s+)?(?:provided|attached|available|visible)/i.test(t);
  return !refusal;
}

async function analyzeMediaForNonVisionProvider(files=[], message='', selectedProvider='', selectedModel='', emit, customApiKeys=null, responseEffort='Instant'){
  const media=mediaAttachments(files);
  if(!media.length)return '';

  // Gemini and the dedicated Cloudflare vision selection receive the original
  // media directly in the final request, so a bridge analysis would only
  // duplicate cost and context.
  if(selectedProvider==='gemini'||selectedProvider==='cloudflare-vision'){
    activity(emit,'attachment-media',`Prepared ${media.length} visual/media part${media.length===1?'':'s'} for ${providerLabel(selectedProvider)}`,'completed','file');
    return '';
  }

  const imageOnly=media.filter(f=>String(f.mimeType||'').startsWith('image/'));
  const videoFrames=media.filter(f=>f.mediaRole==='video-frame').length;
  const rootNames=[...new Set(media.map(f=>attachmentRootName(f)).filter(Boolean))];
  const attachmentLabel=rootNames.slice(0,2).join(', ').slice(0,110);
  activity(emit,'attachment-media',videoFrames
    ?`Reading ${videoFrames} sampled video frame${videoFrames===1?'':'s'}${attachmentLabel?' from '+attachmentLabel:''} for your request`
    :`Reading ${imageOnly.length||media.length} attached image${(imageOnly.length||media.length)===1?'':'s'}${attachmentLabel?' from '+attachmentLabel:''} for your request`,
    'running',videoFrames?'file':'image');

  const system =
    'You are an attachment analysis tool. Be literal and evidence-grounded. ' +
    'Read visible text when legible. Do not invent people, objects, events, audio, or details that are not present. ' +
    'Your output will be given to another response model as source context.';
  const prompt=mediaGroundingPrompt(message,media);

  // First try the user's selected OpenAI-compatible model with image/frame
  // parts. If that exact model supports vision, no provider switch is needed.
  // A refusal or unsupported multimodal response is not accepted as evidence.
  const openAICompatibleVision=new Set(['groq','openrouter','mistral','unorouter','nvidia','codecraft','hcnsec','seekai','bailucode']);
  if(imageOnly.length && openAICompatibleVision.has(selectedProvider) &&
     ((Array.isArray(customApiKeys)&&customApiKeys.length)||configured(selectedProvider))){
    activity(emit,'attachment-media-selected',`Checking attached media with ${providerLabel(selectedProvider)} • ${modelLabel(selectedModel||'selected model')}`,'running','image');
    try{
      const r=await runOpenAICompatible(selectedProvider,{
        model:selectedModel,
        history:[],
        files:imageOnly,
        message:mediaGroundingPrompt(message,imageOnly),
        systemInstruction:system,
        emit:null,
        autoFallback:false,
        customApiKeys,
        visionPayload:true,
        responseEffort
      });
      if(r.ok){
        const text=await readInternalProviderText(r.response,16000);
        if(usableMediaAnalysis(text)){
          activity(emit,'attachment-media-selected',`Read attached media with ${providerLabel(selectedProvider)} • ${modelLabel(selectedModel||'selected model')}`,'completed','image');
          activity(emit,'attachment-media','Attachment evidence is ready for the selected response model','completed','file');
          return `\n\n[MEDIA ATTACHMENT ANALYSIS — ${providerLabel(selectedProvider)}]\n${text}\nUse this only as evidence about the supplied media; the original user request still controls the task.`;
        }
      }
      activity(emit,'attachment-media-selected','Selected model did not return grounded visual evidence — trying a configured vision analyzer','warning','image');
    }catch(_){
      activity(emit,'attachment-media-selected','Selected model could not read the visual payload directly — trying a configured vision analyzer','warning','image');
    }
  }

  // Gemini is the strongest general bridge here because it can receive both
  // image frames and a small native video payload. This does not change the
  // model/provider that writes the final answer.
  if(configured('gemini')){
    activity(emit,'attachment-media-bridge','Using Gemini to read attachment evidence for the selected model','running','image');
    try{
      const r=await runGemini({
        model:'gemini-flash-latest',
        history:[],
        files:media,
        message:prompt,
        systemInstruction:system,
        emit:null,
        autoFallback:false,
        responseEffort
      });
      if(r.ok){
        const text=await readInternalProviderText(r.response,16000);
        if(usableMediaAnalysis(text)){
          activity(emit,'attachment-media-bridge','Gemini finished reading the attachment evidence','completed','image');
          activity(emit,'attachment-media','Attachment evidence is ready for the selected response model','completed','file');
          return `\n\n[MEDIA ATTACHMENT ANALYSIS — Gemini]\n${text}\nUse this only as evidence about the supplied media; the original user request still controls the task.`;
        }
      }
      activity(emit,'attachment-media-bridge','Gemini did not return grounded attachment evidence','warning','image');
    }catch(_){
      activity(emit,'attachment-media-bridge','Gemini attachment analysis was unavailable','warning','image');
    }
  }

  // Cloudflare is a second vision bridge for photos, screenshots, PDF page
  // renders, and sampled video frames.
  if(imageOnly.length && configured('cloudflare')){
    activity(emit,'attachment-media-cloudflare','Trying Cloudflare vision for the attachment evidence','running','image');
    try{
      const r=await runCloudflare({
        model:'@cf/google/gemma-4-26b-a4b-it',
        history:[],
        files:imageOnly,
        message:mediaGroundingPrompt(message,imageOnly),
        systemInstruction:system,
        emit:null,
        autoFallback:false,
        responseEffort
      });
      if(r.ok){
        const text=await readInternalProviderText(r.response,16000);
        if(usableMediaAnalysis(text)){
          activity(emit,'attachment-media-cloudflare','Cloudflare vision finished reading the attachment evidence','completed','image');
          activity(emit,'attachment-media','Attachment evidence is ready for the selected response model','completed','file');
          return `\n\n[MEDIA ATTACHMENT ANALYSIS — Cloudflare]\n${text}\nUse this only as evidence about the supplied media; the original user request still controls the task.`;
        }
      }
      activity(emit,'attachment-media-cloudflare','Cloudflare did not return grounded attachment evidence','warning','image');
    }catch(_){
      activity(emit,'attachment-media-cloudflare','Cloudflare attachment analysis was unavailable','warning','image');
    }
  }

  activity(emit,'attachment-media','No configured vision route could read the attached media','warning','file');
  return null;
}

export { textFromAttachment, sanitizeIncomingAttachments, attachmentRootName, userAttachmentCount, buildAttachmentSourceContext, mediaAttachments, mediaGroundingPrompt, usableMediaAnalysis, analyzeMediaForNonVisionProvider };
