export const config = { runtime: 'edge' };

/* =========================================================
   JEPONGDEVXYZ AI — MULTI PROVIDER / MULTI KEY / ACTIVITY SSE
   High-level execution activity only. No hidden reasoning is exposed.
========================================================= */

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    models: ['gemini-flash-latest','gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash-lite'],
    defaultModel: 'gemini-flash-latest'
  },
  cloudflare: {
    label: 'Cloudflare',
    models: ['@cf/zai-org/glm-4.7-flash','@cf/google/gemma-4-26b-a4b-it','@cf/nvidia/nemotron-3-120b-a12b'],
    defaultModel: '@cf/zai-org/glm-4.7-flash'
  },
  groq: {
    label: 'Groq',
    models: ['openai/gpt-oss-120b','openai/gpt-oss-20b','llama-3.3-70b-versatile','llama-3.1-8b-instant','qwen/qwen3.6-27b','groq/compound-mini'],
    defaultModel: 'openai/gpt-oss-20b'
  },
  openrouter: {
    label: 'OpenRouter',
    models: ['openrouter/auto','openrouter/free','openai/gpt-oss-120b','deepseek/deepseek-v3.2','google/gemini-3.1-pro-preview'],
    defaultModel: 'openrouter/auto'
  },
  mistral: {
    label: 'Mistral',
    models: ['mistral-small-latest','mistral-small-2603','mistral-large-latest','mistral-large-2512','codestral-latest','ministral-8b-latest'],
    defaultModel: 'mistral-small-latest'
  },
  cohere: {
    label: 'Cohere',
    models: ['command-a-plus-05-2026','command-a-03-2025','command-a-reasoning-08-2025','command-r7b-12-2024'],
    defaultModel: 'command-a-03-2025'
  }
};

const FALLBACK_ORDER = ['cloudflare','groq','mistral','cohere','openrouter','gemini'];
const RETRYABLE = new Set([401,402,403,408,409,425,429,500,502,503,504]);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders }
  });
}

function parseKeys(pluralName, singleName) {
  const raw = process.env[pluralName] || process.env[singleName] || '';
  return raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}

function shuffle(input) {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getProviderKeys(provider) {
  if (provider === 'gemini') return parseKeys('GEMINI_API_KEYS','GEMINI_API_KEY');
  if (provider === 'groq') return parseKeys('GROQ_API_KEYS','GROQ_API_KEY');
  if (provider === 'openrouter') return parseKeys('OPENROUTER_API_KEYS','OPENROUTER_API_KEY');
  if (provider === 'mistral') return parseKeys('MISTRAL_API_KEYS','MISTRAL_API_KEY');
  if (provider === 'cohere') return parseKeys('COHERE_API_KEYS','COHERE_API_KEY');
  return [];
}

function getCloudflareAccounts() {
  const accounts = [];
  const raw = process.env.CLOUDFLARE_ACCOUNTS || '';
  for (const entry of raw.split(/[\n,]+/).map(x => x.trim()).filter(Boolean)) {
    const separator = entry.indexOf(':');
    if (separator < 1) continue;
    const accountId = entry.slice(0, separator).trim();
    const apiToken = entry.slice(separator + 1).trim();
    if (accountId && apiToken) accounts.push({ accountId, apiToken });
  }

  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const apiToken = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
  if (accountId && apiToken && !accounts.some(x => x.accountId === accountId && x.apiToken === apiToken)) {
    accounts.push({ accountId, apiToken });
  }
  return accounts;
}

function credentialCount(provider) {
  return provider === 'cloudflare' ? getCloudflareAccounts().length : getProviderKeys(provider).length;
}

function configured(provider) {
  return credentialCount(provider) > 0;
}

function providerLabel(provider) {
  return PROVIDERS[provider]?.label || provider;
}

function modelLabel(model = '') {
  return String(model)
    .replace(/^@cf\//,'')
    .replace(/^openai\//,'')
    .replace(/^google\//,'')
    .replace(/^deepseek\//,'')
    .replace(/^groq\//,'')
    .replace(/[-_]/g,' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function safeEmit(emit, event) {
  try { emit?.(event); } catch (_) {}
}

function activity(emit, id, label, state = 'running', kind = 'process', detail = '') {
  safeEmit(emit, { type:'activity', id, label, state, kind, detail, at:Date.now() });
}


function wantsCompleteCode(message='') {
  const text=String(message||'').toLowerCase().replace(/\s+/g,' ').trim();
  return [
    /paki\s*(?:bigay|ibigay)(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /bigay(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /ibigay(?:\s+mo)?(?:\s+sa\s*akin|\s+sakin)?\s+(?:ang\s+)?buong\s+code/i,
    /\bbuong\s+code\b/i,
    /\bfull\s+(?:source\s+)?code\b/i,
    /\bcomplete\s+(?:source\s+)?code\b/i,
    /\bwhole\s+(?:source\s+)?code\b/i,
    /\bentire\s+(?:source\s+)?code\b/i,
    /\bdo\s+not\s+(?:split|truncate)\b/i,
    /\b(?:don't|dont)\s+(?:split|truncate)\b/i
  ].some(rx=>rx.test(text));
}

function outputBudgetFor(message='') {
  // Larger budget only when the user explicitly requests the complete code.
  // Providers may enforce a smaller hard limit; streaming still prevents us
  // from buffering the whole answer before sending it to the browser.
  return wantsCompleteCode(message) ? 16384 : 4096;
}

function responseQualityInstruction(message='') {
  const full=wantsCompleteCode(message);
  let text =
    ' Before sending the final answer, silently proofread it for spelling, grammar, punctuation, naming consistency, syntax mistakes, missing brackets, and accidental omissions. ' +
    'Do not claim absolute perfection; prioritize correctness and clear natural language.';

  if(full){
    text +=
      ' The user explicitly requested the complete code. Return the entire requested code in this single response whenever the provider output limit permits. ' +
      'Do not intentionally split it into Part 1/Part 2, do not omit unchanged sections, do not use placeholders such as "rest of code here", and do not tell the user to press Continue. ' +
      'Use one complete fenced code block per requested file and preserve all required imports, functions, styles, markup, configuration, and closing syntax.';
  }else{
    text +=
      ' If the answer would be unusually long, you may stop only at a clean logical boundary rather than forcing everything into one response. ' +
      'Do not cut a code block, function, HTML tag structure, JSON object, or sentence in the middle. This allows the interface Continue button to request the next portion.';
  }
  return text;
}


function detectArtifactRequest(message='') {
  const text=String(message||'').trim();
  if(!text) return null;

  const lower=text.toLowerCase();
  const explicitExt=(text.match(/(?:^|[\s"'`(])([a-zA-Z0-9._-]{1,80}\.([a-zA-Z0-9]{1,10}))(?=$|[\s"'`),.!?])/i)||[]);
  const filename=explicitExt[1] || '';
  const ext=(explicitExt[2] || '').toLowerCase();

  const imperative =
    /\b(?:download|downloadable|i-download|idownload|gawan|gumawa|create|generate|export|bigay|ibigay|bigyan|send|save)\b/i.test(text) &&
    /\b(?:file|zip|pdf|document|doc|download)\b/i.test(text);

  const directType =
    /\b(?:\.zip|zip file|\.pdf|pdf file|download file|downloadable file)\b/i.test(text);

  if(!imperative && !directType && !filename) return null;

  let kind='file';
  let wantedExt=ext;

  if(ext==='zip' || /\b(?:\.zip|zip file)\b/i.test(text)) {
    kind='zip'; wantedExt='zip';
  } else if(ext==='pdf' || /\b(?:\.pdf|pdf file|pdf document)\b/i.test(text)) {
    kind='pdf'; wantedExt='pdf';
  } else if(!wantedExt) {
    const words=[
      ['html','html'],['javascript','js'],['js','js'],['css','css'],['python','py'],
      ['json','json'],['markdown','md'],['text','txt'],['txt','txt'],['csv','csv'],
      ['xml','xml'],['svg','svg'],['sql','sql'],['typescript','ts'],['tsx','tsx'],
      ['jsx','jsx'],['php','php'],['java','java'],['c++','cpp'],['cpp','cpp'],
      ['c#','cs'],['yaml','yaml'],['yml','yml']
    ];
    for(const [word,x] of words){
      const rx=new RegExp(`\\b${word.replace(/[+]/g,'\\+')}\\s+(?:file|code)\\b`,'i');
      if(rx.test(text)){wantedExt=x;break;}
    }
    if(!wantedExt) wantedExt='txt';
  }

  const safeName=(filename || `JepongDevxyz-output.${wantedExt}`)
    .replace(/[^\w.\- ()]/g,'_')
    .slice(0,100);

  return {kind,ext:wantedExt,filename:safeName};
}

function artifactInstruction(message='') {
  const req=detectArtifactRequest(message);
  if(!req) return '';

  let text =
    ' The user requested a real downloadable artifact. Generate the complete final content that should go inside that artifact. ' +
    'Do not merely explain how to create the file and do not invent a fake download URL. ';

  if(req.kind==='zip'){
    text +=
      'For a ZIP request, if the answer contains multiple project files, put each file in its own fenced code block and immediately precede it with a line exactly like "FILE: path/filename.ext". ' +
      'Include every required project file; do not use placeholders for omitted code. ';
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

function bytesToBase64(bytes){
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  }
  return btoa(binary);
}

function crc32(bytes){
  let crc=0 ^ (-1);
  for(let i=0;i<bytes.length;i++){
    crc=(crc>>>8)^CRC32_TABLE[(crc^bytes[i])&0xff];
  }
  return (crc ^ (-1))>>>0;
}

const CRC32_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  return table;
})();

function dosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
  const day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}

function writeU16(view,offset,value){ view.setUint16(offset,value,true); }
function writeU32(view,offset,value){ view.setUint32(offset,value>>>0,true); }

function makeZip(entries=[]){
  const safeEntries=entries
    .filter(e=>e&&e.name!=null)
    .map((e,i)=>({
      name:String(e.name||`file-${i+1}.txt`).replace(/^\/+/,'').replace(/\.\.(\/|\\)/g,''),
      data:e.data instanceof Uint8Array?e.data:utf8Bytes(e.data||'')
    }));

  const locals=[];
  const centrals=[];
  let localOffset=0;
  const stamp=dosDateTime();

  for(const e of safeEntries){
    const nameBytes=utf8Bytes(e.name);
    const crc=crc32(e.data);

    const local=new Uint8Array(30+nameBytes.length+e.data.length);
    const lv=new DataView(local.buffer);
    writeU32(lv,0,0x04034b50);
    writeU16(lv,4,20);
    writeU16(lv,6,0x0800);
    writeU16(lv,8,0); // store
    writeU16(lv,10,stamp.time);
    writeU16(lv,12,stamp.day);
    writeU32(lv,14,crc);
    writeU32(lv,18,e.data.length);
    writeU32(lv,22,e.data.length);
    writeU16(lv,26,nameBytes.length);
    writeU16(lv,28,0);
    local.set(nameBytes,30);
    local.set(e.data,30+nameBytes.length);
    locals.push(local);

    const central=new Uint8Array(46+nameBytes.length);
    const cv=new DataView(central.buffer);
    writeU32(cv,0,0x02014b50);
    writeU16(cv,4,20);
    writeU16(cv,6,20);
    writeU16(cv,8,0x0800);
    writeU16(cv,10,0);
    writeU16(cv,12,stamp.time);
    writeU16(cv,14,stamp.day);
    writeU32(cv,16,crc);
    writeU32(cv,20,e.data.length);
    writeU32(cv,24,e.data.length);
    writeU16(cv,28,nameBytes.length);
    writeU16(cv,30,0);
    writeU16(cv,32,0);
    writeU16(cv,34,0);
    writeU16(cv,36,0);
    writeU32(cv,38,0);
    writeU32(cv,42,localOffset);
    central.set(nameBytes,46);
    centrals.push(central);

    localOffset+=local.length;
  }

  const centralSize=centrals.reduce((n,x)=>n+x.length,0);
  const end=new Uint8Array(22);
  const ev=new DataView(end.buffer);
  writeU32(ev,0,0x06054b50);
  writeU16(ev,4,0); writeU16(ev,6,0);
  writeU16(ev,8,safeEntries.length);
  writeU16(ev,10,safeEntries.length);
  writeU32(ev,12,centralSize);
  writeU32(ev,16,localOffset);
  writeU16(ev,20,0);

  const total=localOffset+centralSize+end.length;
  const out=new Uint8Array(total);
  let p=0;
  for(const x of locals){out.set(x,p);p+=x.length;}
  for(const x of centrals){out.set(x,p);p+=x.length;}
  out.set(end,p);
  return out;
}

function asciiPdfText(text=''){
  return String(text)
    .replace(/\r/g,'')
    .replace(/[“”]/g,'"')
    .replace(/[‘’]/g,"'")
    .replace(/[—–]/g,'-')
    .replace(/…/g,'...')
    .replace(/•/g,'*')
    .replace(/→/g,'->')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g,'?');
}

function wrapPdfLines(text='',width=92){
  const out=[];
  for(const raw of asciiPdfText(text).split('\n')){
    if(!raw){out.push('');continue;}
    let line=raw;
    while(line.length>width){
      let cut=line.lastIndexOf(' ',width);
      if(cut<30) cut=width;
      out.push(line.slice(0,cut));
      line=line.slice(cut).trimStart();
    }
    out.push(line);
  }
  return out;
}

function pdfEscape(s=''){ return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }

function makePdf(text=''){
  const lines=wrapPdfLines(text,92);
  const perPage=48;
  const pages=[];
  for(let i=0;i<Math.max(1,Math.ceil(lines.length/perPage));i++){
    pages.push(lines.slice(i*perPage,(i+1)*perPage));
  }

  const pageCount=pages.length;
  const firstPageObj=4;
  const firstContentObj=firstPageObj+pageCount;
  const objects=[];

  objects[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objects[2]=`<< /Type /Pages /Kids [${pages.map((_,i)=>`${firstPageObj+i} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objects[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';

  for(let i=0;i<pageCount;i++){
    const pageObj=firstPageObj+i;
    const contentObj=firstContentObj+i;
    objects[pageObj]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObj} 0 R >>`;

    let stream='BT\n/F1 10 Tf\n50 750 Td\n13 TL\n';
    for(const line of pages[i]){
      stream+=`(${pdfEscape(line)}) Tj\nT*\n`;
    }
    stream+='ET\n';
    const len=utf8Bytes(stream).length;
    objects[contentObj]=`<< /Length ${len} >>\nstream\n${stream}endstream`;
  }

  const enc=new TextEncoder();
  const chunks=[enc.encode('%PDF-1.4\n')];
  const offsets=[0];
  let pos=chunks[0].length;
  const maxObj=objects.length-1;

  for(let i=1;i<=maxObj;i++){
    offsets[i]=pos;
    const chunk=enc.encode(`${i} 0 obj\n${objects[i]}\nendobj\n`);
    chunks.push(chunk);
    pos+=chunk.length;
  }

  const xrefPos=pos;
  let xref=`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`;
  for(let i=1;i<=maxObj;i++) xref+=`${String(offsets[i]).padStart(10,'0')} 00000 n \n`;
  xref+=`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  chunks.push(enc.encode(xref));

  const total=chunks.reduce((n,c)=>n+c.length,0);
  const out=new Uint8Array(total);
  let p=0; for(const c of chunks){out.set(c,p);p+=c.length;}
  return out;
}

function extensionFromFence(lang=''){
  const map={
    html:'html',javascript:'js',js:'js',typescript:'ts',ts:'ts',tsx:'tsx',jsx:'jsx',
    css:'css',python:'py',py:'py',json:'json',markdown:'md',md:'md',csv:'csv',
    xml:'xml',svg:'svg',sql:'sql',php:'php',java:'java',cpp:'cpp',c:'c',csharp:'cs',
    cs:'cs',yaml:'yaml',yml:'yml',bash:'sh',shell:'sh',sh:'sh'
  };
  return map[String(lang||'').toLowerCase()]||'txt';
}

function extractZipEntries(responseText='',requestedFilename=''){
  const text=String(responseText||'');
  const entries=[];
  const named=/(?:^|\n)\s*(?:FILE|Filename|File)\s*:\s*([^\n`]+)\n```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/gi;
  let m;
  while((m=named.exec(text))){
    const name=m[1].trim().replace(/[^\w./\- ()]/g,'_').replace(/^\/+/,'');
    entries.push({name:name||`file-${entries.length+1}.${extensionFromFence(m[2])}`,data:m[3]});
  }

  if(!entries.length){
    const fence=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
    while((m=fence.exec(text))){
      const ext=extensionFromFence(m[1]);
      const base=requestedFilename && !requestedFilename.toLowerCase().endsWith('.zip')
        ? requestedFilename
        : `file-${entries.length+1}.${ext}`;
      entries.push({name:base,data:m[2]});
    }
  }

  if(!entries.length) entries.push({name:'response.md',data:text});
  if(!entries.some(e=>e.name.toLowerCase()==='readme.md')) entries.push({name:'README.md',data:text});
  return entries;
}

function extractPrimaryFileContent(responseText='',ext='txt'){
  const text=String(responseText||'');
  const codeLike=new Set(['html','js','css','py','json','xml','svg','sql','ts','tsx','jsx','php','java','cpp','c','cs','yaml','yml','sh']);
  if(codeLike.has(ext)){
    const fence=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
    let m;
    while((m=fence.exec(text))){
      const fenceExt=extensionFromFence(m[1]);
      if(fenceExt===ext || !m[1]) return m[2].replace(/\s+$/,'')+'\n';
    }
    const first=text.match(/```[a-zA-Z0-9_+#.-]*\n([\s\S]*?)```/);
    if(first) return first[1].replace(/\s+$/,'')+'\n';
  }
  return text;
}

function mimeForExtension(ext='txt'){
  const map={
    txt:'text/plain;charset=utf-8',md:'text/markdown;charset=utf-8',
    html:'text/html;charset=utf-8',css:'text/css;charset=utf-8',
    js:'text/javascript;charset=utf-8',ts:'text/plain;charset=utf-8',
    json:'application/json;charset=utf-8',csv:'text/csv;charset=utf-8',
    xml:'application/xml;charset=utf-8',svg:'image/svg+xml;charset=utf-8',
    pdf:'application/pdf',zip:'application/zip',py:'text/x-python;charset=utf-8',
    sql:'application/sql;charset=utf-8'
  };
  return map[ext]||'application/octet-stream';
}

function buildGeneratedArtifact(message='',responseText=''){
  const req=detectArtifactRequest(message);
  if(!req) return null;

  let bytes;
  let filename=req.filename;
  let mimeType=mimeForExtension(req.ext);

  if(req.kind==='zip'){
    filename=filename.toLowerCase().endsWith('.zip')?filename:`${filename.replace(/\.[^.]+$/,'')}.zip`;
    bytes=makeZip(extractZipEntries(responseText,''));
    mimeType='application/zip';
  }else if(req.kind==='pdf'){
    filename=filename.toLowerCase().endsWith('.pdf')?filename:`${filename.replace(/\.[^.]+$/,'')}.pdf`;
    bytes=makePdf(responseText);
    mimeType='application/pdf';
  }else{
    const content=extractPrimaryFileContent(responseText,req.ext);
    bytes=utf8Bytes(content);
  }

  // Keep SSE payloads comfortably bounded. This still supports typical full-code files.
  if(bytes.length>3_000_000){
    return {
      error:'Generated file is too large to send through the chat stream.',
      filename,
      size:bytes.length
    };
  }

  return {
    filename,
    mimeType,
    size:bytes.length,
    base64:bytesToBase64(bytes),
    kind:req.kind,
    label:req.kind==='zip'?'ZIP project':req.kind==='pdf'?'PDF document':`${req.ext.toUpperCase()} file`
  };
}

function buildSystemInstruction(mode, customPrompt, liveWebContext, studyTool, personalization, userMessage='') {
  let text = 'You are JepongDevxyz AI. Your creator and developer is Jepong Devxyz (Jay-Ar Lee Espiritu). Be accurate, helpful, and concise when possible. Put programming code inside fenced Markdown code blocks.';

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
    if (p.fastAnswers) text += ' Prefer concise answers first; expand only when the task needs detail.';
    if (p.referenceWritingStyle) text += " Match the user's general writing tone and phrasing from the current conversation without copying long passages.";

    const pet = safe(p.pet);
    const petDescription = safe(p.petDescription);
    if (p.showPetInChat !== false && pet && pet !== 'None') text += ` The user selected a companion persona called ${pet}; let it subtly influence friendliness without becoming distracting or roleplay-heavy.`;
    if (p.showPetInChat !== false && pet && pet !== 'None' && petDescription) text += ` Companion preference: ${petDescription}.`;

    const lang = safe(p.language);
    if (lang === 'Filipino') text += ' Prefer Filipino/Tagalog unless technical English is clearer.';
    else if (lang === 'English') text += ' Prefer English.';
    else if (lang && lang !== 'Auto-detect') text += ` Prefer ${lang} when practical.`;

    if (p.intelligence === 'Instant') text += ' For voice-style interactions, answer quickly and directly.';
    else if (p.intelligence === 'Deep') text += ' For voice-style interactions, favor deeper reasoning and fuller explanations.';
    else if (p.intelligence === 'Balanced') text += ' For voice-style interactions, balance speed and depth.';

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

  if (studyTool === 'quiz') text += ' STUDY TOOL: Create a short quiz from the current topic. Ask questions first and do not reveal all answers immediately.';
  else if (studyTool === 'reviewer') text += ' STUDY TOOL: Produce a structured reviewer with headings, key ideas, definitions, examples, and a quick recap.';
  else if (studyTool === 'flashcards') text += ' STUDY TOOL: Produce concise flashcards in Q: / A: format, one card per pair.';
  else if (studyTool === 'explain') text += ' STUDY TOOL: Explain the topic simply using short steps, analogies, and one concrete example.';
  text += responseQualityInstruction(userMessage);
  text += artifactInstruction(userMessage);
  text += ' When tool results are supplied in bracketed LIVE/VERIFICATION/PROVIDED LINK sections, use them only when relevant to the user request and distinguish actual fetched/tested results from inference. Never say you searched, tested, ran, compiled, inspected an environment, or opened a website unless the supplied tool context confirms that action. For code, report static verification as static verification—not successful execution. Keep the final answer tightly aligned to the user\'s actual task, attached files, provided URLs, and requested output.';
  return text;
}


/* =========================================================
   SMART REAL-TIME RESEARCH + SAFE VERIFICATION TOOLS
   High-level, auditable tools only. No hidden reasoning.
   ========================================================= */

function shouldAutoResearch(message=''){
  const t=String(message||'').toLowerCase();
  return /\b(latest|current|currently|today|tonight|this week|this month|now|real[- ]?time|news|update|updated|price|presyo|weather|panahon|forecast|status|outage|release|released|version|available|availability|schedule|result|score|standing|search|research|verify online|check online|hanapin|maghanap|tingnan online|web)\b/i.test(t);
}

function shouldVerifyTask(message='', files=[]){
  const t=String(message||'').toLowerCase();
  if(Array.isArray(files) && files.length && /\b(test|verify|check|inspect|validate|debug|run|working|gumagana|subukan|i-test|itest|suriin|ayusin|error|bug|build|compile|deploy)\b/i.test(t)) return true;
  return /\b(test|verify|check|inspect|validate|debug|run|working|gumagana|subukan|i-test|itest|suriin|build|compile|deploy|endpoint|website|url|api)\b/i.test(t);
}

function htmlDecode(s=''){
  return String(s)
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/&#x2F;/gi,'/').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)||32));
}

function stripHtml(s=''){
  return htmlDecode(String(s)
    .replace(/<script\b[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
  ).trim();
}

function extractPublicUrl(text=''){
  const matches=String(text||'').match(/https?:\/\/[^\s<>"'`)\]]+/gi)||[];
  return matches.map(x=>x.replace(/[.,!?;:]+$/,''));
}

function isPrivateIpv4(host=''){
  const m=host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if(!m)return false;
  const [a,b,c,d]=m.slice(1).map(Number);
  if([a,b,c,d].some(n=>n<0||n>255))return true;
  return a===10 || a===127 || a===0 || (a===169&&b===254) ||
    (a===172&&b>=16&&b<=31) || (a===192&&b===168) ||
    (a===100&&b>=64&&b<=127) || a>=224;
}

function isSafePublicUrl(raw=''){
  try{
    const u=new URL(raw);
    if(!['http:','https:'].includes(u.protocol))return false;
    const h=u.hostname.toLowerCase().replace(/\.$/,'');
    if(!h || h==='localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal'))return false;
    if(h==='::1' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:'))return false;
    if(isPrivateIpv4(h))return false;
    return true;
  }catch(_){return false;}
}

async function safePublicFetch(url, options={}, maxRedirects=3){
  let current=url;
  for(let i=0;i<=maxRedirects;i++){
    if(!isSafePublicUrl(current))throw new Error('Blocked non-public URL');
    const res=await fetch(current,{...options,redirect:'manual'});
    if(res.status>=300&&res.status<400){
      const loc=res.headers.get('location');
      if(!loc)return res;
      current=new URL(loc,current).toString();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

function decodeDuckDuckGoHref(href=''){
  try{
    const decoded=htmlDecode(href);
    const u=new URL(decoded,'https://duckduckgo.com');
    const uddg=u.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : u.toString();
  }catch(_){return htmlDecode(href);}
}

async function duckDuckGoHtmlSearch(query, emit){
  activity(emit,'web-search','Searching the live web','running','web',query.slice(0,120));
  try{
    const res=await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,{
      headers:{
        'User-Agent':'Mozilla/5.0 (compatible; JepongDevxyzAI/1.0; +https://vercel.app)',
        'Accept':'text/html,application/xhtml+xml'
      },
      signal:AbortSignal.timeout(8000)
    });
    if(!res.ok)throw new Error(`Search HTTP ${res.status}`);
    const html=await res.text();
    const results=[];
    const rx=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1800}?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>)/gi;
    let m;
    while((m=rx.exec(html)) && results.length<5){
      const url=decodeDuckDuckGoHref(m[1]);
      if(!isSafePublicUrl(url))continue;
      const title=stripHtml(m[2]).slice(0,180);
      const snippet=stripHtml(m[3]).slice(0,500);
      if(title)results.push({title,url,snippet});
    }

    // Fallback parser when DDG changes snippet markup.
    if(!results.length){
      const arx=/<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while((m=arx.exec(html)) && results.length<5){
        const url=decodeDuckDuckGoHref(m[1]);
        if(!isSafePublicUrl(url))continue;
        const title=stripHtml(m[2]).slice(0,180);
        if(title)results.push({title,url,snippet:''});
      }
    }

    activity(emit,'web-search',results.length?`Searched ${results.length} live web results`:'No live web results found',results.length?'completed':'warning','web');
    return results;
  }catch(e){
    activity(emit,'web-search','Live web search was unavailable — continuing with available context','warning','web',String(e?.message||e).slice(0,140));
    return [];
  }
}

async function enrichSearchResults(results=[], emit){
  const enriched=[];
  for(let i=0;i<Math.min(results.length,3);i++){
    const r=results[i];
    activity(emit,`web-source-${i}`,`Reading source ${i+1}: ${r.title.slice(0,62)}`,'running','web');
    try{
      const res=await safePublicFetch(r.url,{
        method:'GET',
        headers:{'User-Agent':'Mozilla/5.0 (compatible; JepongDevxyzAI/1.0)','Accept':'text/html,text/plain,application/json'},
        signal:AbortSignal.timeout(7000)
      },2);
      const type=(res.headers.get('content-type')||'').toLowerCase();
      let extract='';
      if(res.ok && (type.includes('text/')||type.includes('json')||!type)){
        const raw=(await res.text()).slice(0,180000);
        extract=stripHtml(raw).slice(0,2500);
      }
      enriched.push({...r,status:res.status,extract});
      activity(emit,`web-source-${i}`,`Reviewed source ${i+1}`,'completed','web');
    }catch(_){
      enriched.push(r);
      activity(emit,`web-source-${i}`,`Could not open source ${i+1}; using search snippet`,'warning','web');
    }
  }
  return enriched;
}

function buildLiveSourceContext(results=[]){
  if(!results.length)return '';
  const now=new Date().toISOString();
  let out=`\n\n[LIVE WEB RESEARCH — fetched ${now}]\n`;
  results.forEach((r,i)=>{
    out+=`\nSource ${i+1}: ${r.title}\nURL: ${r.url}\n`;
    if(r.snippet)out+=`Search snippet: ${r.snippet}\n`;
    if(r.extract)out+=`Page extract: ${r.extract}\n`;
  });
  out+=`\nUse these live sources only for claims they support. If sources conflict or are incomplete, say so. Mention source names/URLs in the answer when live facts matter.`;
  return out;
}

function textFromAttachment(file){
  try{
    if(!file?.data)return '';
    const mime=String(file.mimeType||'').toLowerCase();
    const name=String(file.name||file.filename||'');
    const textual=/^(text\/|application\/(json|javascript|xml|x-yaml|yaml))/i.test(mime) ||
      /\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|md|txt|csv|xml|svg|py|php|java|c|cpp|cs|sql|yaml|yml|sh)$/i.test(name);
    if(!textual)return '';
    const bin=atob(String(file.data));
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder('utf-8',{fatal:false}).decode(bytes).slice(0,120000);
  }catch(_){return '';}
}

function extractCodeBlocks(text=''){
  const out=[];
  const rx=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
  let m;
  while((m=rx.exec(String(text||''))) && out.length<8){
    out.push({lang:(m[1]||'').toLowerCase(),code:m[2]});
  }
  return out;
}

function balanceReport(text='', pairs=[['{','}'],['[',']'],['(',')']]){
  const clean=String(text||'').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,'');
  const errors=[];
  for(const [a,b] of pairs){
    let n=0;
    for(const ch of clean){ if(ch===a)n++; else if(ch===b)n--; if(n<0){errors.push(`unexpected ${b}`);break;} }
    if(n>0)errors.push(`missing ${b} ×${n}`);
  }
  return errors;
}

function staticVerifyText(name='input', text='', hint=''){
  const lower=(hint||name||'').toLowerCase();
  const findings=[];
  let status='passed';

  if(/\bjson\b|\.json$/.test(lower)){
    try{JSON.parse(text);findings.push('JSON parses successfully.');}
    catch(e){status='failed';findings.push(`JSON parse error: ${String(e.message).slice(0,180)}`);}
  }else if(/\bhtml\b|\.html?$/.test(lower)){
    const tags=[...String(text).matchAll(/<\/?([a-z][\w:-]*)\b[^>]*>/gi)]
      .map(m=>({name:m[1].toLowerCase(),close:m[0][1]==='/',self:/\/>$/.test(m[0])}));
    const voids=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const stack=[];
    for(const t of tags){
      if(voids.has(t.name)||t.self)continue;
      if(!t.close)stack.push(t.name);
      else{
        const idx=stack.lastIndexOf(t.name);
        if(idx===-1){findings.push(`Closing </${t.name}> has no matching opener.`);status='warning';}
        else stack.splice(idx,1);
      }
    }
    if(stack.length){findings.push(`Possible unclosed HTML tags: ${[...new Set(stack.slice(-8))].join(', ')}.`);status='warning';}
    if(!findings.length)findings.push('Basic HTML tag structure looks balanced.');
  }else if(/\bcss\b|\.css$/.test(lower)){
    const errs=balanceReport(text,[['{','}']]);
    if(errs.length){status='failed';findings.push(`CSS structure issue: ${errs.join(', ')}.`);}
    else findings.push('CSS braces are balanced.');
  }else if(/\b(js|javascript|typescript|tsx|jsx)\b|\.(m?js|cjs|ts|tsx|jsx)$/.test(lower)){
    const errs=balanceReport(text);
    if(errs.length){status='failed';findings.push(`Bracket structure issue: ${errs.join(', ')}.`);}
    else findings.push('Basic JavaScript/TypeScript bracket structure is balanced.');
    if(/\b(eval|new Function)\s*\(/.test(text))findings.push('Dynamic code execution pattern detected; not executed by the verifier.');
  }else{
    const errs=balanceReport(text);
    if(errs.length){status='warning';findings.push(`Possible delimiter issue: ${errs.join(', ')}.`);}
    else findings.push('No obvious delimiter-balance issue found.');
  }

  return {name,status,findings};
}

async function probeRequestedUrls(message='', emit){
  const urls=[...new Set(extractPublicUrl(message))].filter(isSafePublicUrl).slice(0,3);
  const results=[];
  for(let i=0;i<urls.length;i++){
    const url=urls[i];
    activity(emit,`url-test-${i}`,`Testing requested URL: ${linkLabel(url)}`,'running','test',url.slice(0,100));
    const started=Date.now();
    try{
      const res=await safePublicFetch(url,{
        method:'GET',
        headers:{'User-Agent':'JepongDevxyzAI/1.0','Accept':'text/html,application/json,text/plain,*/*'},
        signal:AbortSignal.timeout(10000)
      },2);
      const elapsed=Date.now()-started;
      results.push({url,status:res.status,ok:res.ok,elapsedMs:elapsed,contentType:res.headers.get('content-type')||''});
      activity(emit,`url-test-${i}`,`${res.ok?'URL responded':'URL returned an error'} • HTTP ${res.status} • ${elapsed} ms`,res.ok?'completed':'warning','test');
    }catch(e){
      results.push({url,ok:false,error:String(e?.message||e)});
      activity(emit,`url-test-${i}`,'URL test failed','warning','test',String(e?.message||e).slice(0,120));
    }
  }
  return results;
}

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

function shortTaskSubject(message=''){
  let t=cleanTaskText(message)
    .replace(/^(paki\s+)?(gawan|gumawa|ayusin|i-?test|itest|test|verify|check|suriin|review|hanapin|maghanap|create|build|make|fix|please)\s+(mo\s+)?(ako\s+|kami\s+|naman\s+|ito\s+|itong\s+)?/i,'')
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
  const hasCodeFiles=fileNames.some(n=>/\.(html?|css|js|mjs|cjs|ts|tsx|jsx|json|py|php|java|c|cpp|cs|sql|yaml|yml|sh)$/i.test(n));
  const hasImages=(Array.isArray(files)?files:[]).some(f=>String(f?.mimeType||'').startsWith('image/'));

  let kind='general';
  if(/\b(apk|android|web\s*to\s*apk|webview|gradle|manifest)\b/i.test(t))kind='android';
  else if(/\b(vercel|deployment|deploy|serverless|edge function)\b/i.test(t))kind='deployment';
  else if(/\b(github|repository|repo|pull request|workflow|actions)\b/i.test(t))kind='github';
  else if(/\b(api|endpoint|backend|webhook|server|database)\b/i.test(t))kind='backend';
  else if(/\b(html|css|javascript|typescript|frontend|website|web app|ui|responsive)\b/i.test(t)||hasCodeFiles)kind='web';
  else if(/\b(pdf|document|report|reviewer|essay|worksheet|notes)\b/i.test(t))kind='document';
  else if(/\b(image|photo|picture|logo|design|larawan)\b/i.test(t)||hasImages)kind='image';
  else if(/\b(research|latest|current|today|news|compare|comparison|hanapin|maghanap)\b/i.test(t))kind='research';
  else if(/\b(math|equation|solve|school|study|lesson|explain|homework)\b/i.test(t))kind='study';

  const intent={
    create:/\b(gawan|gumawa|create|make|build|generate|implement|develop)\b/i.test(t),
    edit:/\b(ayusin|fix|edit|update|modify|refactor|repair)\b/i.test(t),
    test:/\b(test|i-?test|itest|verify|validate|check|suriin|debug|working|gumagana)\b/i.test(t),
    research:shouldAutoResearch(message),
    download:Boolean(detectArtifactRequest(message))
  };

  return {kind,intent,urls,fileNames,subject:shortTaskSubject(message)};
}

function contextActivityPlan(message='', files=[]){
  const p=taskProfile(message,files);
  const steps=[];

  steps.push({
    id:'task-context',
    label:`Understanding request: ${p.subject}`,
    kind:'process'
  });

  if(p.fileNames.length){
    const sample=p.fileNames.slice(0,2).join(', ');
    steps.push({
      id:'task-files',
      label:`Reviewing ${p.fileNames.length} attached file${p.fileNames.length>1?'s':''}${sample?`: ${sample}`:''}`,
      kind:'file'
    });
  }

  const byKind={
    android:[
      ['task-domain','Mapping Web-to-APK / Android project requirements','process'],
      ['task-structure','Preparing Android project structure, manifest, and WebView flow','process']
    ],
    deployment:[
      ['task-domain','Reviewing deployment and runtime requirements','process'],
      ['task-structure','Checking frontend, API routes, and deployment integration','process']
    ],
    github:[
      ['task-domain','Reviewing repository and workflow requirements','process'],
      ['task-structure','Preparing repository-compatible changes','process']
    ],
    backend:[
      ['task-domain','Mapping API, backend, and data-flow requirements','process'],
      ['task-structure','Checking routes, request handling, and error paths','process']
    ],
    web:[
      ['task-domain','Reviewing website and interface requirements','process'],
      ['task-structure','Preparing frontend structure and responsive behavior','process']
    ],
    document:[
      ['task-domain','Organizing the requested document content','process'],
      ['task-structure','Preparing document sections and formatting','process']
    ],
    image:[
      ['task-domain','Reviewing visual requirements and supplied image context','image'],
      ['task-structure','Preparing the requested visual changes','image']
    ],
    research:[
      ['task-domain','Identifying facts that need current sources','research'],
      ['task-structure','Preparing source-backed findings','research']
    ],
    study:[
      ['task-domain','Identifying the topic and learning goal','process'],
      ['task-structure','Preparing a clear step-by-step explanation','process']
    ],
    general:[
      ['task-domain',`Planning the best way to complete: ${p.subject}`,'process']
    ]
  };

  for(const [id,label,kind] of (byKind[p.kind]||byKind.general)){
    steps.push({id,label,kind});
  }

  if(p.intent.edit)steps.push({id:'task-edit',label:'Preparing targeted changes while preserving working parts',kind:'process'});
  if(p.intent.create)steps.push({id:'task-create',label:`Building the requested ${p.kind==='general'?'output':p.kind+' solution'}`,kind:p.kind==='image'?'image':'process'});
  if(p.intent.test)steps.push({id:'task-test-plan',label:'Preparing checks that match the requested test',kind:'test'});
  if(p.intent.download)steps.push({id:'task-artifact-plan',label:'Preparing the final result as a downloadable file',kind:'file'});

  return {profile:p,steps:steps.slice(0,7)};
}

function emitContextActivityStart(message='', files=[], emit){
  const plan=contextActivityPlan(message,files);
  for(let i=0;i<plan.steps.length;i++){
    const step=plan.steps[i];
    activity(
      emit,
      step.id,
      step.label,
      i===0?'completed':'running',
      step.kind,
      ''
    );
    // Only one plan item stays "running" at a time; later actual tools
    // and provider events take over the timeline.
    if(i===1)break;
  }
  return plan;
}

function completeContextPlan(plan, emit){
  if(!plan?.steps?.length)return;
  for(const step of plan.steps.slice(1)){
    activity(emit,step.id,step.label,'completed',step.kind,'');
  }
}

function linkLabel(raw=''){
  try{
    const u=new URL(raw);
    const host=u.hostname.replace(/^www\./,'');
    const path=u.pathname==='/'?'':u.pathname.split('/').filter(Boolean).slice(0,2).join('/');
    return path?`${host}/${path}`:host;
  }catch(_){return String(raw).slice(0,80);}
}

function linkPurpose(url='', message=''){
  let host='';
  try{host=new URL(url).hostname.toLowerCase();}catch(_){}
  const t=String(message||'').toLowerCase();

  if(host.includes('github.com'))return 'repository';
  if(host.includes('vercel.app')||host.includes('vercel.com'))return 'deployment';
  if(host.includes('docs.')||host.includes('developer.')||/\b(documentation|docs|guide|reference)\b/i.test(t))return 'documentation';
  if(/\b(api|endpoint|webhook)\b/i.test(t))return 'API endpoint';
  return 'website';
}

async function inspectProvidedLinks(message='', emit){
  const urls=[...new Set(extractPublicUrl(message))].filter(isSafePublicUrl).slice(0,4);
  if(!urls.length)return '';

  let context=`\n\n[PROVIDED LINK INSPECTION — fetched ${new Date().toISOString()}]\n`;

  for(let i=0;i<urls.length;i++){
    const url=urls[i];
    const label=linkLabel(url);
    const purpose=linkPurpose(url,message);
    activity(emit,`provided-link-${i}`,`Opening provided ${purpose}: ${label}`,'running','web');

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

      activity(
        emit,
        `provided-link-${i}`,
        `Reviewed ${purpose}: ${label} • HTTP ${res.status}`,
        res.ok?'completed':'warning',
        'web',
        `${elapsed} ms${type?` • ${type.split(';')[0]}`:''}`
      );

      context+=`\nLink ${i+1}: ${url}\nPurpose: ${purpose}\nHTTP: ${res.status}\nResponse time: ${elapsed} ms\nContent type: ${type||'unknown'}\n`;
      if(extract)context+=`Relevant page text: ${extract}\n`;
    }catch(e){
      activity(emit,`provided-link-${i}`,`Could not open ${purpose}: ${label}`,'warning','web',String(e?.message||e).slice(0,130));
      context+=`\nLink ${i+1}: ${url}\nOpen failed: ${String(e?.message||e).slice(0,300)}\n`;
    }
  }

  context+=`\nUse link content only when it is relevant to the user's request. Do not claim a link was reviewed unless a successful inspection result appears above.`;
  return context;
}


async function performVerification(message='', files=[], emit){
  if(!shouldVerifyTask(message,files))return '';

  activity(emit,'verification','Preparing safe verification checks','running','test');
  const reports=[];

  const promptBlocks=extractCodeBlocks(message);
  promptBlocks.forEach((b,i)=>reports.push(staticVerifyText(`Prompt code block ${i+1}`,b.code,b.lang)));

  if(Array.isArray(files)){
    for(let i=0;i<files.length && reports.length<10;i++){
      const txt=textFromAttachment(files[i]);
      if(!txt)continue;
      const name=files[i]?.name||files[i]?.filename||`Attachment ${i+1}`;
      reports.push(staticVerifyText(name,txt,name));
    }
  }

  const urlResults=await probeRequestedUrls(message,emit);

  const env=executionEnvironmentContext(message);
  let context=env;

  if(reports.length){
    const failed=reports.filter(r=>r.status==='failed').length;
    const warnings=reports.filter(r=>r.status==='warning').length;
    activity(emit,'verification',`Static verification complete • ${reports.length} item${reports.length===1?'':'s'}${failed?` • ${failed} issue${failed===1?'':'s'}`:''}${warnings?` • ${warnings} warning${warnings===1?'':'s'}`:''}`,failed?'warning':'completed','test');
    context+=`\n\n[SAFE STATIC VERIFICATION]\n`;
    for(const r of reports)context+=`${r.name}: ${r.status.toUpperCase()} — ${r.findings.join(' ')}\n`;
    context+=`These are static checks, not proof that the program executed successfully.`;
  }else{
    activity(emit,'verification','No testable attached/source-code text found; capability check completed','completed','test');
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

async function getEnhancedLiveWebContext(message, webSearch, emit){
  if(!message)return '';

  const wantsLive=Boolean(webSearch)||shouldAutoResearch(message);
  if(!wantsLive)return '';

  const isWeather=/(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i.test(message);
  if(isWeather){
    activity(emit,'web-search','Checking live weather data','running','web');
    try{
      const match=message.match(/(?:sa|in|for|at)\s+([a-zA-Z\s,.-]+)/i);
      const location=(match?match[1].trim():'Guimba').slice(0,100);
      const res=await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`,{
        headers:{'User-Agent':'JepongDevxyz-AI/1.0'},signal:AbortSignal.timeout(7000)
      });
      if(res.ok){
        const d=await res.json();
        const c=d.current_condition?.[0]||{};
        const n=d.nearest_area?.[0]||{};
        activity(emit,'web-search',`Live weather ready for ${n.areaName?.[0]?.value||location}`,'completed','web');
        return `\n\n[REAL-TIME WEATHER — fetched ${new Date().toISOString()}]\nLocation: ${n.areaName?.[0]?.value||location}\nTemperature: ${c.temp_C||'N/A'}°C\nFeels like: ${c.FeelsLikeC||'N/A'}°C\nCondition: ${c.weatherDesc?.[0]?.value||'Unknown'}\nHumidity: ${c.humidity||'N/A'}%\nWind: ${c.windspeedKmph||'N/A'} km/h\nRain: ${c.precipMM||'N/A'} mm.\nState clearly that this is live fetched data.`;
      }
    }catch(_){}
  }

  // Optional Brave Search API, if the owner configures it later.
  const braveKey=(process.env.BRAVE_SEARCH_API_KEY||'').trim();
  if(braveKey){
    activity(emit,'web-search','Searching live web with Brave Search','running','web');
    try{
      const res=await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(message)}&count=5`,{
        headers:{'Accept':'application/json','X-Subscription-Token':braveKey},
        signal:AbortSignal.timeout(8000)
      });
      if(res.ok){
        const d=await res.json();
        const basic=(d?.web?.results||[]).slice(0,5).map(x=>({
          title:String(x.title||'').slice(0,180),
          url:String(x.url||''),
          snippet:stripHtml(String(x.description||'')).slice(0,500)
        })).filter(x=>x.title&&isSafePublicUrl(x.url));
        activity(emit,'web-search',`Searched ${basic.length} live web results`,'completed','web');
        return buildLiveSourceContext(await enrichSearchResults(basic,emit));
      }
    }catch(_){}
  }

  const results=await duckDuckGoHtmlSearch(message,emit);
  return buildLiveSourceContext(await enrichSearchResults(results,emit));
}


async function getLiveWebContext(message, webSearch, emit) {
  if (!webSearch || !message) return '';
  activity(emit,'web-search','JepongDevxyz is checking live web context','running','web');
  try {
    const isWeather = /(weather|panahon|ulan|init|bagyo|temperatura|forecast)/i.test(message);
    if (isWeather) {
      const match = message.match(/(?:sa|in|for|at)\s+([a-zA-Z\s,.-]+)/i);
      const location = match ? match[1].trim() : 'Guimba';
      const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
        headers: {'User-Agent':'JepongDevxyz-AI/1.0'}, signal: AbortSignal.timeout(3500)
      });
      if (res.ok) {
        const d = await res.json();
        const c = d.current_condition?.[0] || {};
        const n = d.nearest_area?.[0] || {};
        activity(emit,'web-search',`Live weather context ready for ${n.areaName?.[0]?.value || location}`,'completed','web');
        return `\n\n[REAL-TIME WEATHER]\nLocation: ${n.areaName?.[0]?.value || location}\nTemperature: ${c.temp_C || 'N/A'}°C\nFeels like: ${c.FeelsLikeC || 'N/A'}°C\nCondition: ${c.weatherDesc?.[0]?.value || 'Unknown'}\nHumidity: ${c.humidity || 'N/A'}%\nWind: ${c.windspeedKmph || 'N/A'} km/h\nRain: ${c.precipMM || 'N/A'} mm.`;
      }
    } else {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(message)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const d = await res.json();
        if (d.AbstractText) {
          activity(emit,'web-search','Live web context found','completed','web');
          return `\n\n[LIVE WEB RESULT]\n${d.AbstractText}\nSource: ${d.AbstractURL || 'Internet'}`;
        }
      }
    }
    activity(emit,'web-search','No instant web result found — continuing normally','warning','web');
  } catch (_) {
    activity(emit,'web-search','Live web lookup timed out — continuing normally','warning','web');
  }
  return '';
}

function normalizeHistory(history = []) {
  return history.filter(x => x && (x.text || x.parts)).map(x => ({
    role: x.role === 'bot' || x.role === 'model' ? 'assistant' : 'user',
    content: x.text || (Array.isArray(x.parts) ? x.parts.map(p => p.text || '').join('\n') : '')
  })).filter(x => x.content);
}

function buildOpenAIMessages(history, message, systemInstruction) {
  const messages = [{ role:'system', content:systemInstruction }, ...normalizeHistory(history)];
  if (messages.length > 1 && messages.at(-1).role === 'user') messages.pop();
  if (message?.trim()) messages.push({ role:'user', content:message.trim() });
  return messages;
}

function smartRoute(mode, files, message) {
  const hasImage = Array.isArray(files) && files.some(f => f?.mimeType?.startsWith('image/') && f?.data);
  if (hasImage) {
    if (configured('cloudflare')) return {provider:'cloudflare',model:'@cf/google/gemma-4-26b-a4b-it',reason:'vision'};
    if (configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'vision'};
  }
  const coding = mode === 'coder' || /\b(code|coding|debug|javascript|html|css|python|node|api|bug|error|typescript|php|java|react|sql)\b/i.test(message || '');
  if (coding) {
    if (configured('groq')) return {provider:'groq',model:'openai/gpt-oss-120b',reason:'coding'};
    if (configured('mistral')) return {provider:'mistral',model:'codestral-latest',reason:'coding'};
  }
  if (mode === 'school') {
    if (configured('gemini')) return {provider:'gemini',model:'gemini-flash-latest',reason:'school'};
    if (configured('cohere')) return {provider:'cohere',model:'command-a-03-2025',reason:'school'};
  }
  return null;
}

function isRetryableStatus(status) { return RETRYABLE.has(Number(status)); }

function passthroughHeaders(upstream, provider, model, fallbackFrom = '', routedReason = '', keyIndex = 0, keyCount = 1) {
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

function openAIStreamToText(body) {
  const decoder = new TextDecoder(); const encoder = new TextEncoder();
  return body.pipeThrough(new TransformStream({
    start(){ this.buffer=''; },
    transform(chunk, controller){
      this.buffer += decoder.decode(chunk,{stream:true});
      const lines = this.buffer.split('\n'); this.buffer = lines.pop() || '';
      for (const line of lines) {
        const t=line.trim(); if (!t.startsWith('data:')) continue;
        const s=t.slice(5).trim(); if (!s || s==='[DONE]') continue;
        try {
          const p=JSON.parse(s);
          const text=p.choices?.[0]?.delta?.content ?? p.choices?.[0]?.message?.content;
          if (typeof text==='string' && text) controller.enqueue(encoder.encode(text));
        } catch(_){}
      }
    }
  }));
}

function cohereStreamToText(body) {
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
          const text=p?.delta?.message?.content?.text;
          if(p?.type==='content-delta' && text) controller.enqueue(encoder.encode(text));
        }catch(_){}
      }
    }
  }));
}

function retryLabel(provider, status, hasNext) {
  if (status === 429) return `${providerLabel(provider)} rate limit reached${hasNext ? ' — rotating credential' : ''}`;
  if (status === 402) return `${providerLabel(provider)} billing/model access is unavailable${hasNext ? ' — trying another option' : ' — checking fallback'}`;
  if (status === 401 || status === 403) return `${providerLabel(provider)} credential was rejected${hasNext ? ' — trying another' : ''}`;
  if (status >= 500) return `${providerLabel(provider)} is temporarily busy${hasNext ? ' — trying another credential' : ''}`;
  return `${providerLabel(provider)} request failed${hasNext ? ' — retrying' : ''}`;
}

async function runGemini({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const keys = shuffle(getProviderKeys('gemini'));
  if (!keys.length) return {ok:false,status:500,error:'Gemini API key is not configured.'};
  const target = PROVIDERS.gemini.models.includes(model) ? model : PROVIDERS.gemini.defaultModel;

  const currentParts=[];
  if(Array.isArray(files)) for(const f of files) if(f?.data&&f?.mimeType) currentParts.push({inline_data:{mime_type:f.mimeType,data:f.data}});
  if(message?.trim()) currentParts.push({text:message.trim()});
  const contents=[];
  for(const h of history||[]) {
    const role=h.role==='bot'||h.role==='model'?'model':'user';
    const text=h.text || (Array.isArray(h.parts) ? h.parts.map(p=>p.text||'').join('\n') : '');
    if(text?.trim()) contents.push({role,parts:[{text:text.trim()}]});
  }
  if(currentParts.length && contents.at(-1)?.role==='user') contents.pop();
  if(currentParts.length) contents.push({role:'user',parts:currentParts});
  if(!contents.length) return {ok:false,status:400,error:'No prompt provided.'};

  let last=''; let status=500;
  for(let i=0;i<keys.length;i++) {
    activity(emit,`gemini-key-${i}`,`Connecting to Gemini • ${modelLabel(target)}${keys.length>1?` • credential ${i+1}/${keys.length}`:''}`,'running','provider');
    try {
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(target)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(keys[i])}`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_instruction:{parts:[{text:systemInstruction}]},contents,generationConfig:{maxOutputTokens:outputBudgetFor(message)}}),signal:AbortSignal.timeout(90000)
      });
      if(res.ok) {
        activity(emit,`gemini-key-${i}`,`Gemini connected • ${modelLabel(target)}`,'completed','provider');
        const decoder=new TextDecoder(), encoder=new TextEncoder();
        const stream=res.body.pipeThrough(new TransformStream({
          start(){this.buffer='';},
          transform(chunk,controller){
            this.buffer+=decoder.decode(chunk,{stream:true});
            const lines=this.buffer.split('\n');this.buffer=lines.pop()||'';
            for(const line of lines){
              const t=line.trim();if(!t.startsWith('data:'))continue;
              try{const p=JSON.parse(t.slice(5).trim());for(const part of p.candidates?.[0]?.content?.parts||[])if(part.text)controller.enqueue(encoder.encode(part.text));}catch(_){}
            }
          }
        }));
        return {ok:true,response:new Response(stream,{headers:passthroughHeaders(res,'gemini',target,fallbackFrom,routedReason,i,keys.length)})};
      }
      status=res.status; last=await res.text().catch(()=>`Gemini ${status}`);
      activity(emit,`gemini-key-${i}`,retryLabel('gemini',status,i<keys.length-1),i<keys.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status)) break;
    } catch(e) {
      status=502; last=e?.message||String(e);
      activity(emit,`gemini-key-${i}`,`Gemini connection timed out${i<keys.length-1?' — trying another credential':''}`,i<keys.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||'Gemini unavailable'};
}

async function runCloudflare({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const accounts = shuffle(getCloudflareAccounts());
  if(!accounts.length) return {ok:false,status:500,error:'Cloudflare credentials are not configured.'};
  let target=PROVIDERS.cloudflare.models.includes(model)?model:PROVIDERS.cloudflare.defaultModel;
  const hasImage=Array.isArray(files)&&files.some(f=>f?.data&&f?.mimeType?.startsWith('image/'));
  if(hasImage) target='@cf/google/gemma-4-26b-a4b-it';
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  if(hasImage){
    const last=messages.pop();
    const content=[{type:'text',text:last?.content||message||'Analyze this image.'}];
    for(const f of files)if(f?.data&&f?.mimeType?.startsWith('image/'))content.push({type:'image_url',image_url:{url:`data:${f.mimeType};base64,${f.data}`}});
    messages.push({role:'user',content});
  }

  let last=''; let status=500;
  for(let i=0;i<accounts.length;i++) {
    activity(emit,`cloudflare-key-${i}`,`Connecting to Cloudflare • ${modelLabel(target)}${accounts.length>1?` • account ${i+1}/${accounts.length}`:''}`,'running','provider');
    try {
      const a=accounts[i];
      const res=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(a.accountId)}/ai/v1/chat/completions`,{
        method:'POST',headers:{Authorization:`Bearer ${a.apiToken}`,'Content-Type':'application/json'},body:JSON.stringify({model:target,messages,stream:true,max_completion_tokens:outputBudgetFor(message),temperature:.7}),signal:AbortSignal.timeout(120000)
      });
      if(res.ok){
        activity(emit,`cloudflare-key-${i}`,`Cloudflare connected • ${modelLabel(target)}`,'completed','provider');
        return {ok:true,response:new Response(openAIStreamToText(res.body),{headers:passthroughHeaders(res,'cloudflare',target,fallbackFrom,routedReason,i,accounts.length)})};
      }
      status=res.status; last=await res.text().catch(()=>`Cloudflare ${status}`);
      activity(emit,`cloudflare-key-${i}`,retryLabel('cloudflare',status,i<accounts.length-1),i<accounts.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status)) break;
    }catch(e){
      status=502;last=e?.message||String(e);
      activity(emit,`cloudflare-key-${i}`,`Cloudflare connection timed out${i<accounts.length-1?' — trying another account':''}`,i<accounts.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||'Cloudflare unavailable'};
}

async function runOpenAICompatible(provider,{model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const cfg={
    groq:{url:'https://api.groq.com/openai/v1/chat/completions'},
    openrouter:{url:'https://openrouter.ai/api/v1/chat/completions'},
    mistral:{url:'https://api.mistral.ai/v1/chat/completions'}
  }[provider];
  if(!cfg) return {ok:false,status:400,error:'Unsupported provider.'};

  const keys=shuffle(getProviderKeys(provider));
  if(!keys.length) return {ok:false,status:500,error:`${providerLabel(provider)} API key is not configured.`};

  const requested=PROVIDERS[provider].models.includes(model)?model:PROVIDERS[provider].defaultModel;
  const messages=buildOpenAIMessages(history,message,systemInstruction);

  let modelCandidates=[requested];

  if(provider==='groq'){
    if(requested==='llama-3.3-70b-versatile'){
      modelCandidates=['openai/gpt-oss-120b','qwen/qwen3.6-27b'];
    } else if(requested==='llama-3.1-8b-instant'){
      modelCandidates=['openai/gpt-oss-20b'];
    }
  }

  if(provider==='mistral'){
    if(requested==='mistral-small-latest'){
      modelCandidates=['mistral-small-latest','mistral-small-2603'];
    } else if(requested==='mistral-large-latest'){
      modelCandidates=['mistral-large-latest','mistral-large-2512'];
    }
  }

  if(provider==='openrouter' && requested==='google/gemini-3.1-pro-preview'){
    modelCandidates=['google/gemini-3.1-pro-preview','openrouter/free'];
  }

  let last='';
  let status=500;

  for(let mi=0; mi<modelCandidates.length; mi++){
    const target=modelCandidates[mi];

    for(let i=0;i<keys.length;i++) {
      const repaired = target!==requested;
      activity(
        emit,
        `${provider}-model-${mi}-key-${i}`,
        `Connecting to ${providerLabel(provider)} • ${modelLabel(requested)}${repaired?` • using ${modelLabel(target)}`:''}${keys.length>1?` • credential ${i+1}/${keys.length}`:''}`,
        'running',
        'provider'
      );

      const headers={
        Authorization:`Bearer ${keys[i]}`,
        'Content-Type':'application/json',
        'Accept':'text/event-stream'
      };

      if(provider==='openrouter'){
        headers['HTTP-Referer']=process.env.SITE_URL || 'https://jepongdevxyz.ai';
        headers['X-Title']='JepongDevxyz AI';
      }

      try{
        const res=await fetch(cfg.url,{
          method:'POST',
          headers,
          body:JSON.stringify({
            model:target,
            messages,
            stream:true,
            max_tokens:outputBudgetFor(message),
            temperature:.7
          }),
          signal:AbortSignal.timeout(120000)
        });

        if(res.ok){
          activity(
            emit,
            `${provider}-model-${mi}-key-${i}`,
            `${providerLabel(provider)} connected • ${modelLabel(target)}${repaired?' • compatible replacement':''}`,
            'completed',
            'provider'
          );

          return {
            ok:true,
            response:new Response(
              openAIStreamToText(res.body),
              {
                headers:passthroughHeaders(
                  res,
                  provider,
                  target,
                  fallbackFrom || (repaired ? requested : ''),
                  routedReason || (repaired ? 'model-repair' : ''),
                  i,
                  keys.length
                )
              }
            )
          };
        }

        status=res.status;
        last=await res.text().catch(()=>`${provider} ${status}`);

        const hasAnotherKey=i<keys.length-1;
        const hasAnotherModel=mi<modelCandidates.length-1;

        activity(
          emit,
          `${provider}-model-${mi}-key-${i}`,
          retryLabel(provider,status,hasAnotherKey || hasAnotherModel),
          (hasAnotherKey || hasAnotherModel)?'warning':'error',
          'provider'
        );

        const modelFallbackStatuses=[400,402,404,410,422,429,500,502,503,504];
        if(!hasAnotherKey && !modelFallbackStatuses.includes(Number(status))) break;
      }catch(e){
        status=502;
        last=e?.message||String(e);
        activity(
          emit,
          `${provider}-model-${mi}-key-${i}`,
          `${providerLabel(provider)} connection timed out${i<keys.length-1?' — rotating credential':mi<modelCandidates.length-1?' — trying compatible model':''}`,
          (i<keys.length-1 || mi<modelCandidates.length-1)?'warning':'error',
          'provider'
        );
      }
    }
  }

  return {ok:false,status,error:last||`${providerLabel(provider)} unavailable`};
}

async function runCohere({model,history,message,systemInstruction,fallbackFrom='',routedReason='',emit}) {
  const keys=shuffle(getProviderKeys('cohere'));
  if(!keys.length)return {ok:false,status:500,error:'Cohere API key is not configured.'};
  const target=PROVIDERS.cohere.models.includes(model)?model:PROVIDERS.cohere.defaultModel;
  const messages=buildOpenAIMessages(history,message,systemInstruction);
  let last='';let status=500;
  for(let i=0;i<keys.length;i++) {
    activity(emit,`cohere-key-${i}`,`Connecting to Cohere • ${modelLabel(target)}${keys.length>1?` • credential ${i+1}/${keys.length}`:''}`,'running','provider');
    try{
      const res=await fetch('https://api.cohere.com/v2/chat',{method:'POST',headers:{Authorization:`Bearer ${keys[i]}`,'Content-Type':'application/json',Accept:'text/event-stream'},body:JSON.stringify({model:target,messages,stream:true,max_tokens:outputBudgetFor(message),temperature:.7}),signal:AbortSignal.timeout(120000)});
      if(res.ok){
        activity(emit,`cohere-key-${i}`,`Cohere connected • ${modelLabel(target)}`,'completed','provider');
        return {ok:true,response:new Response(cohereStreamToText(res.body),{headers:passthroughHeaders(res,'cohere',target,fallbackFrom,routedReason,i,keys.length)})};
      }
      status=res.status;last=await res.text().catch(()=>`Cohere ${status}`);
      activity(emit,`cohere-key-${i}`,retryLabel('cohere',status,i<keys.length-1),i<keys.length-1?'warning':'error','provider');
      if(!isRetryableStatus(status))break;
    }catch(e){
      status=502;last=e?.message||String(e);
      activity(emit,`cohere-key-${i}`,`Cohere connection timed out${i<keys.length-1?' — rotating credential':''}`,i<keys.length-1?'warning':'error','provider');
    }
  }
  return {ok:false,status,error:last||'Cohere unavailable'};
}

async function runProvider(provider,args){
  if(provider==='gemini')return runGemini(args);
  if(provider==='cloudflare')return runCloudflare(args);
  if(provider==='cohere')return runCohere(args);
  if(['groq','openrouter','mistral'].includes(provider))return runOpenAICompatible(provider,args);
  return {ok:false,status:400,error:'Unknown provider'};
}

function responseMeta(response) {
  const num = name => {
    const raw=response.headers.get(name); if(raw==null)return null;
    const n=Number(raw); return Number.isFinite(n)?n:null;
  };
  return {
    provider:response.headers.get('x-ai-provider')||'',
    model:response.headers.get('x-ai-model')||'',
    fallbackFrom:response.headers.get('x-ai-fallback-from')||'',
    routeReason:response.headers.get('x-ai-route-reason')||'',
    keyIndex:num('x-ai-key-index'),
    keyCount:num('x-ai-key-count'),
    remainingRequests:num('x-ratelimit-remaining-requests'),
    limitRequests:num('x-ratelimit-limit-requests'),
    remainingTokens:num('x-ratelimit-remaining-tokens'),
    limitTokens:num('x-ratelimit-limit-tokens'),
    retryAfter:response.headers.get('retry-after')||''
  };
}

async function processChat(body, emit) {
  let {message,history=[],files=[],provider='gemini',model,mode,customPrompt,webSearch,autoFallback=true,smartRouter=false,studyTool,personalization} = body;
  const startedAt=Date.now();
  const contextPlan=emitContextActivityStart(message,files,emit);

  if(Array.isArray(files)&&files.length){
    const images=files.filter(f=>f?.mimeType?.startsWith('image/')).length;
    activity(emit,'attachments',images?`Reviewing ${images} attached image${images>1?'s':''}`:`Reviewing ${files.length} attached file${files.length>1?'s':''}`,'completed','file');
  }

  let routedReason='';
  if(smartRouter){
    activity(emit,'router','Smart Router is choosing the best provider','running','route');
    const route=smartRoute(mode,files,message);
    if(route&&configured(route.provider)){
      provider=route.provider;model=route.model;routedReason=route.reason;
      activity(emit,'router',`Smart Router selected ${providerLabel(provider)} • ${modelLabel(model)} for ${route.reason}`,'completed','route');
    } else {
      activity(emit,'router','Smart Router kept your selected provider','completed','route');
    }
  }

  if(!PROVIDERS[provider])provider='gemini';
  model=PROVIDERS[provider].models.includes(model)?model:PROVIDERS[provider].defaultModel;
  const providedLinkContext=await inspectProvidedLinks(message,emit);
  const verificationContext=await performVerification(message,files,emit);
  const liveWebContext=await getEnhancedLiveWebContext(message,webSearch,emit);
  const combinedToolContext=`${providedLinkContext||''}${liveWebContext||''}${verificationContext||''}`;
  const systemInstruction=buildSystemInstruction(mode,customPrompt,combinedToolContext,studyTool,personalization,message);
  completeContextPlan(contextPlan,emit);
  activity(emit,'prepare',`Request context ready for: ${contextPlan.profile.subject}`,'completed','process');

  const first=await runProvider(provider,{model,history,files,message,systemInstruction,routedReason,emit});
  if(first.ok){
    const usedProvider=providerLabel(first.response.headers.get('x-ai-provider')||provider);
    activity(emit,'generation',`${usedProvider} is creating the response for: ${contextPlan.profile.subject}`,'running','generate');
    return {ok:true,response:first.response,startedAt};
  }

  const fallbackable=isRetryableStatus(first.status);
  if(autoFallback&&fallbackable){
    activity(emit,'fallback',`${providerLabel(provider)} is unavailable — Auto Fallback is checking alternatives`,'warning','fallback');
    for(const p of FALLBACK_ORDER){
      if(p===provider||!configured(p))continue;
      const hasImage=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/'));
      if(hasImage&&!['gemini','cloudflare'].includes(p))continue;
      const fallbackModel=PROVIDERS[p].defaultModel;
      activity(emit,'fallback',`Switching to ${providerLabel(p)} • ${modelLabel(fallbackModel)}`,'running','fallback');
      const r=await runProvider(p,{model:fallbackModel,history,files,message,systemInstruction,fallbackFrom:provider,routedReason:routedReason||'fallback',emit});
      if(r.ok){
        activity(emit,'fallback',`Fallback connected to ${providerLabel(p)}`,'completed','fallback');
        activity(emit,'generation',`${providerLabel(p)} is creating the response for: ${contextPlan.profile.subject}`,'running','generate');
        return {ok:true,response:r.response,startedAt};
      }
    }
    activity(emit,'fallback','No fallback provider was available','error','fallback');
  }

  return {ok:false,status:first.status||500,error:first.error||'AI provider unavailable.',provider,startedAt};
}

async function providerUsageSnapshot(){
  const providers={};
  for(const p of Object.keys(PROVIDERS)) providers[p]={configured:configured(p),status:configured(p)?'ready':'not-configured',credentials:credentialCount(p)};
  providers.cloudflare.freeDailyNeurons=10000;

  const openRouterKeys=getProviderKeys('openrouter');
  if(openRouterKeys.length){
    try{
      const r=await fetch('https://openrouter.ai/api/v1/key',{headers:{Authorization:`Bearer ${openRouterKeys[0]}`},signal:AbortSignal.timeout(5000)});
      if(r.ok){
        const d=(await r.json()).data||{};
        providers.openrouter.usage={limit:d.limit,limit_remaining:d.limit_remaining,limit_reset:d.limit_reset,usage:d.usage,usage_daily:d.usage_daily,usage_weekly:d.usage_weekly,usage_monthly:d.usage_monthly,is_free_tier:d.is_free_tier};
      }
    }catch(_){}
  }
  return providers;
}

function sseEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function activityStreamResponse(body) {
  const encoder=new TextEncoder();
  return new Response(new ReadableStream({
    start(controller){
      const send=(event,data)=>controller.enqueue(encoder.encode(sseEvent(event,data)));
      const emit=data=>send('activity',data);
      // Flush immediately so Vercel/browser sees an active streaming response.
      send('activity',{type:'activity',id:'stream-open',label:'Response stream opened',state:'completed',kind:'process',at:Date.now()});
      const keepAlive=setInterval(()=>{
        try{controller.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`));}catch(_){}
      },10000);
      (async()=>{
        try{
          const result=await processChat(body,emit);
          if(!result.ok){
            send('error',{message:result.error||'AI provider unavailable.',status:result.status||500,provider:result.provider||body.provider||'gemini'});
            clearInterval(keepAlive);
            controller.close();
            return;
          }

          const meta=responseMeta(result.response);
          send('meta',meta);
          const reader=result.response.body.getReader();
          const decoder=new TextDecoder();
          let generatedText='';
          while(true){
            const {done,value}=await reader.read();
            if(done)break;
            const text=decoder.decode(value,{stream:true});
            if(text){ generatedText+=text; send('text',{text}); }
          }
          const tail=decoder.decode(); if(tail){ generatedText+=tail; send('text',{text:tail}); }

          if(shouldVerifyTask(body.message||'',body.files||[])){
            const generatedBlocks=extractCodeBlocks(generatedText);
            if(generatedBlocks.length){
              const postReports=generatedBlocks.slice(0,8).map((b,i)=>staticVerifyText(`Generated code block ${i+1}`,b.code,b.lang));
              const failed=postReports.filter(r=>r.status==='failed').length;
              const warnings=postReports.filter(r=>r.status==='warning').length;
              send('activity',{
                type:'activity',
                id:'output-verification',
                label:failed
                  ? `Generated code static check found ${failed} issue${failed===1?'':'s'}`
                  : warnings
                    ? `Generated code static check completed with ${warnings} warning${warnings===1?'':'s'}`
                    : `Generated code passed ${postReports.length} basic static check${postReports.length===1?'':'s'}`,
                state:failed?'warning':'completed',
                kind:'test',
                detail:'Static verification only; code was not arbitrarily executed.',
                at:Date.now()
              });
            }
          }

          const artifact=buildGeneratedArtifact(body.message||'',generatedText);
          if(artifact){
            if(artifact.error){
              send('activity',{type:'activity',id:'artifact',label:artifact.error,state:'warning',kind:'file',at:Date.now()});
            }else{
              send('activity',{type:'activity',id:'artifact',label:`Generated ${artifact.filename}`,state:'completed',kind:'file',at:Date.now()});
              send('artifact',artifact);
            }
          }

          const elapsedMs=Math.max(1,Date.now()-result.startedAt);
          send('activity',{type:'activity',id:'generation',label:`Response complete in ${(elapsedMs/1000).toFixed(elapsedMs>=1000?1:2)}s`,state:'completed',kind:'generate',at:Date.now()});
          send('done',{elapsedMs,...meta});
          clearInterval(keepAlive);
          controller.close();
        }catch(e){
          send('error',{message:e?.message||String(e),status:500});
          clearInterval(keepAlive);
          controller.close();
        }
      })();
    }
  }),{
    headers:{
      'Content-Type':'text/event-stream; charset=utf-8',
      'Cache-Control':'no-cache, no-transform',
      'Connection':'keep-alive'
    }
  });
}


const CLOUDFLARE_TTS_MODEL = '@cf/myshell-ai/melotts';
const MELOTTS_LANGUAGE_ALIASES = {
  en:['en'],
  es:['es'],
  fr:['fr'],
  zh:['zh'],
  ja:['jp','ja'],
  ko:['kr','ko']
};

function normalizeTTSLanguage(input='en-US'){
  const raw=String(input||'en-US').toLowerCase().replace('_','-');
  const base=raw.split('-')[0];
  if(base==='jp') return 'ja';
  if(base==='kr') return 'ko';
  return base;
}

function decodeBase64Audio(base64){
  try{
    const clean=String(base64||'').replace(/^data:audio\/[^;]+;base64,/i,'').trim();
    if(!clean) return null;
    const bin=atob(clean);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return bytes;
  }catch(_){return null;}
}

function extractAudioBytesFromCloudflareJson(payload){
  const candidates=[
    payload?.result?.audio,
    payload?.result?.audio_base64,
    payload?.result?.audioBase64,
    payload?.result?.mp3,
    payload?.audio,
    payload?.audio_base64,
    payload?.audioBase64,
    payload?.mp3
  ];
  for(const value of candidates){
    if(typeof value==='string'){
      const bytes=decodeBase64Audio(value);
      if(bytes?.length) return bytes;
    }
  }
  return null;
}

async function cloudflareTTS(body={}){
  const text=String(body.text||body.prompt||'').replace(/\s+/g,' ').trim().slice(0,1800);
  if(!text) return json({error:'No text provided for speech.'},400);

  const base=normalizeTTSLanguage(body.language||body.lang||'en-US');
  const languageAttempts=MELOTTS_LANGUAGE_ALIASES[base];
  if(!languageAttempts){
    return json({
      error:'Neural voice is not available for this language in MeloTTS.',
      code:'unsupported_tts_language',
      fallback:'browser',
      language:base
    },422);
  }

  const accounts=shuffle(getCloudflareAccounts());
  if(!accounts.length){
    return json({
      error:'Cloudflare Workers AI is not configured.',
      code:'tts_not_configured',
      fallback:'browser'
    },503);
  }

  let lastError='Cloudflare TTS unavailable.';
  let lastStatus=502;

  for(let ai=0; ai<accounts.length; ai++){
    const account=accounts[ai];
    for(const lang of languageAttempts){
      try{
        const endpoint=`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(account.accountId)}/ai/run/${CLOUDFLARE_TTS_MODEL}`;
        const res=await fetch(endpoint,{
          method:'POST',
          headers:{
            'Authorization':`Bearer ${account.apiToken}`,
            'Content-Type':'application/json',
            'Accept':'audio/mpeg, application/json'
          },
          body:JSON.stringify({prompt:text,lang}),
          signal:AbortSignal.timeout(90000)
        });

        const contentType=(res.headers.get('content-type')||'').toLowerCase();

        if(res.ok){
          if(contentType.includes('audio/') || contentType.includes('application/octet-stream')){
            return new Response(res.body,{
              status:200,
              headers:{
                'Content-Type':contentType.includes('audio/') ? contentType.split(';')[0] : 'audio/mpeg',
                'Cache-Control':'no-store',
                'X-TTS-Engine':'cloudflare-melotts',
                'X-TTS-Language':lang,
                'X-TTS-Model':CLOUDFLARE_TTS_MODEL
              }
            });
          }

          const payload=await res.json().catch(()=>null);
          const audioBytes=extractAudioBytesFromCloudflareJson(payload);
          if(audioBytes?.length){
            return new Response(audioBytes,{
              status:200,
              headers:{
                'Content-Type':'audio/mpeg',
                'Cache-Control':'no-store',
                'X-TTS-Engine':'cloudflare-melotts',
                'X-TTS-Language':lang,
                'X-TTS-Model':CLOUDFLARE_TTS_MODEL
              }
            });
          }

          lastStatus=502;
          lastError='Cloudflare returned an unexpected TTS response.';
          continue;
        }

        lastStatus=res.status;
        lastError=await res.text().catch(()=>`Cloudflare TTS HTTP ${res.status}`);
        if(!isRetryableStatus(res.status) && res.status!==400) break;
      }catch(e){
        lastStatus=502;
        lastError=e?.message||String(e);
      }
    }
  }

  return json({
    error:'Neural voice is temporarily unavailable.',
    detail:String(lastError).slice(0,500),
    code:'tts_unavailable',
    fallback:'browser'
  },lastStatus||502);
}


export default async function handler(req){
  if(req.method==='HEAD')return new Response(null,{status:200});
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  try{
    const body=await req.json();
    if(body.action==='tts') return cloudflareTTS(body);
    if(body.action==='provider-status') return json({providers:await providerUsageSnapshot(),cloudflare:{freeDailyNeurons:10000,reset:'00:00 UTC'}});
    if(body.activityStream===true) return activityStreamResponse(body);

    const result=await processChat(body,null);
    if(result.ok)return result.response;
    return json({error:result.error||'AI provider unavailable',provider:result.provider,status:result.status,rateLimited:result.status===429},result.status||500,{'X-AI-Provider':result.provider||body.provider||'gemini'});
  }catch(e){return json({error:e?.message||String(e)},500);}
}
