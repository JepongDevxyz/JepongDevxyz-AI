/* lib/chat/artifacts.js — split from api/chat.js (mechanical move, no behavior change). */
import { wantsCompleteCode } from './effort.js';
import { json } from './utils.js';

function detectArtifactRequest(message='', files=[]) {
  const text=String(message||'').trim();
  if(!text) return null;

  // Only create a downloadable artifact when the USER explicitly asks for one.
  // Dotted code identifiers (req.method, res.ok), URLs and ordinary filename mentions
  // must never be treated as download requests by themselves.
  const knownExts=new Set([
    'zip','pdf','txt','md','html','htm','js','mjs','cjs','css','py','json','csv','xml','svg',
    'sql','ts','tsx','jsx','php','java','c','cpp','h','hpp','cs','yaml','yml','sh'
  ]);

  const fileMatch=(text.match(/(?:^|[\s\"'`(])([a-zA-Z0-9_-][a-zA-Z0-9_.-]{0,79}\.([a-zA-Z0-9]{1,10}))(?=$|[\s\"'`),!?])/i)||[]);
  const candidateFilename=fileMatch[1]||'';
  const candidateExt=(fileMatch[2]||'').toLowerCase();
  const filename=knownExts.has(candidateExt) ? candidateFilename : '';
  const ext=filename ? candidateExt : '';

  const deliveryVerb=/\b(?:download|downloadable|i-download|idownload|export|save(?:\s+as)?|send(?:\s+me)?|pa[ -]?send|paki[ -]?send|bigay|ibigay|bigyan)\b/i.test(text);
  const createVerb=/\b(?:gawan|gumawa|create|generate)\b/i.test(text);
  const artifactNoun=/\b(?:file|zip|pdf|document|doc|docs|report|summary|summaries|ulat|archive|download|code|source|project)\b/i.test(text);
  const typedFile=/\b(?:html|javascript|js|css|python|json|markdown|text|txt|csv|xml|svg|sql|typescript|tsx|jsx|php|java|c\+\+|cpp|c#|yaml|yml|shell|bash)\s+(?:file|document|code)\b/i.test(text);
  const directType=/(?:^|\s)\.(?:zip|pdf|txt|md|html|js|css|py|json|csv|xml|svg|sql|ts|tsx|jsx|php|java|cpp|cs|yaml|yml|sh)\b/i.test(text) ||
    /\b(?:zip file|pdf file|downloadable file|download file)\b/i.test(text);

  const inputFiles=Array.isArray(files)?files:[];
  const rootNames=[...new Set(inputFiles.map(f=>String(f?.parentName||f?.name||f?.filename||'')).filter(Boolean))];
  const attachedZip=rootNames.find(name=>/\.zip$/i.test(name))||'';
  const codeDeliveryIntent=wantsCompleteCode(text) ||
    /\b(?:updated|fixed|complete|full|buong)\s+(?:source\s+)?(?:code|project)\b/i.test(text) ||
    /\b(?:bigay|ibigay|send|pa[ -]?send|export|download)\b[\s\S]{0,45}\b(?:code|source|project)\b/i.test(text);
  const projectEditIntent=/\b(?:ayusin|fix|update|modify|edit|refactor|convert|gawing|build|create|gumawa|gawan)\b/i.test(text) &&
    /\b(?:code|project|app|website|android|aide|gradle|source)\b/i.test(text);
  const implicitProjectArtifact=Boolean(attachedZip && (codeDeliveryIntent||projectEditIntent));

  const explicitlyRequested =
    (deliveryVerb && (artifactNoun || directType || !!filename || typedFile)) ||
    (createVerb && (artifactNoun || typedFile || directType)) ||
    codeDeliveryIntent ||
    implicitProjectArtifact;

  if(!explicitlyRequested) return null;

  let kind='file';
  let wantedExt=ext;

  if(ext==='zip' || /(?:^|\s)\.zip\b|\bzip file\b/i.test(text) || implicitProjectArtifact ||
     (codeDeliveryIntent && /\b(?:project|app|website|android|aide|gradle)\b/i.test(text))) {
    kind='zip'; wantedExt='zip';
  } else if(ext==='pdf' || /(?:^|\s)\.pdf\b|\bpdf (?:file|document)\b/i.test(text)) {
    kind='pdf'; wantedExt='pdf';
  } else if(!wantedExt) {
    const words=[
      ['html','html'],['javascript','js'],['js','js'],['css','css'],['python','py'],
      ['json','json'],['markdown','md'],['text','txt'],['txt','txt'],['csv','csv'],
      ['xml','xml'],['svg','svg'],['sql','sql'],['typescript','ts'],['tsx','tsx'],
      ['jsx','jsx'],['php','php'],['java','java'],['c++','cpp'],['cpp','cpp'],
      ['c#','cs'],['yaml','yaml'],['yml','yml'],['shell','sh'],['bash','sh']
    ];
    for(const [word,x] of words){
      const rx=new RegExp(`\\b${word.replace(/[+]/g,'\\+')}\\s+(?:file|document|code)\\b`,'i');
      if(rx.test(text)){wantedExt=x;break;}
    }
    if(!wantedExt) wantedExt='txt';
  }

  const zipBase=attachedZip
    ? attachedZip.replace(/\.zip$/i,'').replace(/[^\w.\- ()]/g,'_').slice(0,78)
    : '';
  const autoName=(kind==='zip' && zipBase)
    ? `${zipBase}_updated.zip`
    : `JepongDevxyz-output.${wantedExt}`;
  const safeName=(filename || autoName)
    .replace(/[^\w.\- ()]/g,'_')
    .slice(0,100);

  return {kind,ext:wantedExt,filename:safeName};
}

function artifactInstruction(message='', files=[]) {
  const req=detectArtifactRequest(message,files);
  if(!req) return '';

  const inputFiles=Array.isArray(files)?files:[];
  const attachedZip=inputFiles.find(f=>/\.zip$/i.test(String(f?.parentName||f?.name||f?.filename||'')));
  let text =
    ' The user requested a real downloadable artifact. Generate the complete final content that should go inside that artifact. ' +
    'Do not merely explain how to create the file and do not invent a fake download URL. ';

  if(req.kind==='zip' && attachedZip){
    text +=
      'The user uploaded an existing project ZIP. The browser keeps the original archive locally and will overlay your changed/new files onto it, so unchanged files and binary libraries remain intact. ' +
      'For EVERY file you actually changed or created, emit one line exactly "FILE: relative/path/filename.ext" immediately followed by a fenced code block containing the COMPLETE final contents of that file. ' +
      'Use the real archive-relative path. Never emit placeholders such as "same as before", "unchanged code here", "rest omitted", or fabricated binary contents. ' +
      'Do not rewrite files you did not need to change merely to make the ZIP look complete. ' +
      'In the visible final answer, be concise but concrete: state what you inspected, the real fixes made, what verification actually passed, any build/runtime limitation, and that the updated downloadable project ZIP contains the preserved original files plus your changed files. ';
  }else if(req.kind==='zip'){
    text +=
      'For a new ZIP/project request, put EVERY generated project file in its own fenced code block and immediately precede it with a line exactly like "FILE: path/filename.ext". ' +
      'Use real relative paths, not display labels. Include all source/config files required for the project to work; do not use placeholders such as "unchanged code here", "same as before", or "rest omitted". ';
  }else if(req.kind==='pdf'){
    text +=
      'For a PDF request, write polished document content with clear headings and readable prose; the server will convert your response into an actual PDF. ';
  }else{
    text +=
      `The server will package the response as a .${req.ext} file. If this is source code, return the complete source code in a fenced code block without placeholders. `;
  }
  return text;
}

function utf8Bytes(text=''){ return new TextEncoder().encode(String(text)); }

/* =========================================================
   MODEL TOOLS — share_file + create_session
   The chat API invokes these server-side (artifact pipeline),
   so they work uniformly across every provider. The model only
   needs to follow the ask-first protocol and the marker format.
   ========================================================= */
/* Server-side implementations behind the unified web_search / fetch_webpage
   tools. Read-only, bounded, and safe: URLs are validated the same way as
   the existing link-inspection pipeline. */

export { detectArtifactRequest, artifactInstruction, utf8Bytes };
