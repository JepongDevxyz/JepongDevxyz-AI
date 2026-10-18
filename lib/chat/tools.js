// JEPONGDEVXYZ AI — Model tools (share_file, create_session)
// Extracted from api/chat.js (lines 615-1001)

import { runConfiguredWebSearch } from '../api/web-search.js';
import { detectArtifactRequest, utf8Bytes } from './guard.js';
import { htmlDecode, stripHtml, isSafePublicUrl, safePublicFetch } from './research.js';

/* =========================================================
   MODEL TOOLS — share_file + create_session
   The chat API invokes these server-side (artifact pipeline),
   so they work uniformly across every provider. The model only
   needs to follow the ask-first protocol and the marker format.
   ========================================================= */
/* Server-side implementations behind the unified web_search / fetch_webpage
   tools. Read-only, bounded, and safe: URLs are validated the same way as
   the existing link-inspection pipeline. */
export async function toolWebSearch(query, maxResults = 5) {
  try {
    const r = await runConfiguredWebSearch(query, {
      maxResults: Math.min(8, Math.max(1, Number(maxResults) || 5)),
      fast: true,
    });
    const results = Array.isArray(r?.results) ? r.results.slice(0, 8) : [];
    return results.map((x) => ({
      title: String(x?.title || x?.name || '').slice(0, 120),
      url: String(x?.url || x?.link || ''),
      snippet: String(x?.snippet || x?.description || '').slice(0, 300),
    })).filter((x) => x.url);
  } catch (_) {
    return [];
  }
}

export async function toolFetchWebpage(url) {
  try {
    if (!isSafePublicUrl(url)) return { ok: false, error: 'That URL is not allowed.' };
    const res = await safePublicFetch(url, {}, 2);
    if (!res.ok) return { ok: false, error: 'Fetch failed with status ' + res.status + '.' };
    const html = await res.text();
    const text = stripHtml(htmlDecode(String(html || ''))).replace(/\s+/g, ' ').trim().slice(0, 6000);
    if (!text) return { ok: false, error: 'No readable text found on that page.' };
    return { ok: true, url: String(url), text };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 160) };
  }
}

export function modelToolsInstruction(){
  return (
    ' MODEL TOOLS. You have native function-calling tools, the same on every model:' +
    ' (1) share_file — when the user asks for something downloadable (report, document, code file, HTML page, CSV, markdown), CALL share_file with the COMPLETE file content (parameters: filename, content, mimeType). You will receive a public download URL back as the tool result; paste that exact URL in your reply so the user can tap it, like handing them a link. Never invent or print a download URL yourself. If tools are unavailable, generate the complete file content in a fenced code block instead and the server will attach a public download link below your reply automatically.' +
    ' (2) create_session — when the user asks you to create/open a new chat session, you MUST ask for permission first in your reply (e.g. \'Gagawa ako ng bagong session na "<title>". Payag ka ba?\'). NEVER call it without the user explicitly agreeing. Only after they agree, CALL create_session with the title (max 60 chars).' +
    ' (3) web_search — CALL it when you need current or external information to answer well (recent events, facts you are unsure of). Cite the returned titles/URLs.' +
    ' (4) fetch_webpage — CALL it to read the text of a public web page the user shared or that a search returned.' +
    ' (5) generate_image — CALL it with a detailed prompt to create an image; share the returned image URL in your reply as a Markdown image.' +
    ' (6) get_directions — CALL it when the user asks for the way / directions between two places (e.g. "anong daan papunta sa Baguio to Guimba"). After the result, summarize in the user\'s language (e.g. "Ito ang tamang daan papunta sa Guimba — mga 4 h 12 min ang biyahe, 185 km.") and share the map_url so they can open the interactive map with the exact route drawn. Works for any places in the world.' +
    ' (7) get_weather — CALL it when the user asks about the weather anywhere (e.g. "may bagyo ba sa Guimba"). Answer honestly from the returned data only — say "Oo" only when the data shows rain/storm (stormy=true or malakas na pag-ulan), otherwise say the real condition. Then share the radar_map_url so they can see the live satellite/radar map. Never invent a storm that is not in the data.'
  );
}

export function bytesToBase64(bytes){
  let binary='';
  const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  }
  return btoa(binary);
}

export function crc32(bytes){
  let crc=0 ^ (-1);
  for(let i=0;i<bytes.length;i++){
    crc=(crc>>>8)^CRC32_TABLE[(crc^bytes[i])&0xff];
  }
  return (crc ^ (-1))>>>0;
}

export const CRC32_TABLE=(()=>{
  const table=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);
    table[n]=c>>>0;
  }
  return table;
})();

export function dosDateTime(date=new Date()){
  const year=Math.max(1980,date.getFullYear());
  const time=((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((Math.floor(date.getSeconds()/2))&31);
  const day=((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate();
  return {time,day};
}

export function writeU16(view,offset,value){ view.setUint16(offset,value,true); }
export function writeU32(view,offset,value){ view.setUint32(offset,value>>>0,true); }

export function makeZip(entries=[]){
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

export function asciiPdfText(text=''){
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

export function wrapPdfLines(text='',width=92){
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

export function pdfEscape(s=''){ return s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)'); }

export function makePdf(text=''){
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

export function extensionFromFence(lang=''){
  const map={
    html:'html',javascript:'js',js:'js',typescript:'ts',ts:'ts',tsx:'tsx',jsx:'jsx',
    css:'css',python:'py',py:'py',json:'json',markdown:'md',md:'md',csv:'csv',
    xml:'xml',svg:'svg',sql:'sql',php:'php',java:'java',cpp:'cpp',c:'c',csharp:'cs',
    cs:'cs',yaml:'yaml',yml:'yml',bash:'sh',shell:'sh',sh:'sh'
  };
  return map[String(lang||'').toLowerCase()]||'txt';
}

export function extractZipEntries(responseText='',requestedFilename='',options={}){
  const text=String(responseText||'');
  const entries=[];
  const explicitOnly=options?.explicitOnly===true;
  const addReadme=options?.addReadme!==false;
  const named=/(?:^|\n)\s*(?:#{1,6}\s*)?(?:\*\*)?(?:(?:FILE|Filename|File)\s*:\s*)?([\w.@+()\-\/\\ ]+\.(?:html?|css|m?js|cjs|ts|tsx|jsx|json|py|php|java|kt|kts|c|cpp|h|hpp|cs|xml|svg|sql|ya?ml|sh|gradle|properties|md|txt))(?:\*\*)?\s*\n```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/gi;
  let m;
  while((m=named.exec(text))){
    const name=m[1].trim().replace(/[^\w./\- ()]/g,'_').replace(/^\/+/,'');
    entries.push({name:name||`file-${entries.length+1}.${extensionFromFence(m[2])}`,data:m[3]});
  }

  if(!entries.length && !explicitOnly){
    const fence=/```([a-zA-Z0-9_+#.-]*)\n([\s\S]*?)```/g;
    while((m=fence.exec(text))){
      const ext=extensionFromFence(m[1]);
      const base=requestedFilename && !requestedFilename.toLowerCase().endsWith('.zip')
        ? requestedFilename
        : `file-${entries.length+1}.${ext}`;
      entries.push({name:base,data:m[2]});
    }
  }

  if(!entries.length && !explicitOnly) entries.push({name:'response.md',data:text});
  if(addReadme && entries.length && !entries.some(e=>e.name.toLowerCase()==='readme.md')){
    entries.push({name:'README.md',data:text});
  }
  return entries;
}

export function extractPrimaryFileContent(responseText='',ext='txt'){
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

export function mimeForExtension(ext='txt'){
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

export function buildGeneratedArtifact(message='',responseText='',files=[]){
  const req=detectArtifactRequest(message,files);
  if(!req) return null;

  let bytes;
  let filename=req.filename;
  let mimeType=mimeForExtension(req.ext);
  let entryCount=1;
  let overlay=false;

  if(req.kind==='zip'){
    filename=filename.toLowerCase().endsWith('.zip')?filename:`${filename.replace(/\.[^.]+$/,'')}.zip`;
    overlay=(Array.isArray(files)?files:[]).some(f=>/\.zip$/i.test(String(f?.parentName||f?.name||f?.filename||'')));
    const entries=extractZipEntries(responseText,'',{
      explicitOnly:overlay,
      addReadme:!overlay
    });
    if(overlay && !entries.length){
      return {
        error:'The model did not return any complete FILE: path blocks to overlay onto the uploaded project ZIP.',
        filename,
        size:0
      };
    }
    entryCount=entries.length;
    bytes=makeZip(entries);
    mimeType='application/zip';
  }else if(req.kind==='pdf'){
    filename=filename.toLowerCase().endsWith('.pdf')?filename:`${filename.replace(/\.[^.]+$/,'')}.pdf`;
    bytes=makePdf(responseText);
    mimeType='application/pdf';
  }else{
    const content=extractPrimaryFileContent(responseText,req.ext);
    bytes=utf8Bytes(content);
  }

  // Keep SSE payloads comfortably bounded. Existing uploaded ZIPs are merged in
  // the browser, so this payload carries only changed/new text files.
  if(bytes.length>6_000_000){
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
    entryCount,
    overlay,
    label:req.kind==='zip'
      ? (overlay
          ? `Updated project patch · ${entryCount} changed file${entryCount===1?'':'s'}`
          : `ZIP project · ${entryCount} file${entryCount===1?'':'s'}`)
      : req.kind==='pdf'?'PDF document':`${req.ext.toUpperCase()} file`
  };
}


