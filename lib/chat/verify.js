/* lib/chat/verify.js — split from api/chat.js (mechanical move, no behavior change). */
import { linkLabel } from './github-inspect.js';
import { normalizeIntentText } from './prompts.js';
import { extractPublicUrl, isSafePublicUrl, safePublicFetch } from './search.js';
import { activity, json } from './utils.js';

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

function shouldProbeRequestedUrl(url='',message=''){
  const raw=String(url||'').trim();
  const msg=normalizeIntentText(message);
  if(!raw)return false;
  let parsed;
  try{parsed=new URL(raw);}catch(_){return false;}
  const explicitProbe=/\b(test|probe|check|verify|open|fetch|inspect|status|reachable|working|gumagana|i-check|icheck|i-test|itest|subukan)\b/i.test(msg);
  const apiLike=/\bapi\b/i.test(parsed.hostname) || /^\/v\d+(?:\/)?$/i.test(parsed.pathname) ||
    /\/(?:v\d+\/)?(?:chat|responses?|completions?|messages?|generate)(?:\/|$)/i.test(parsed.pathname);
  // A base API URL inside a build prompt is configuration, not a webpage the
  // assistant should GET. Probing it creates misleading 404 activity/context.
  if(apiLike&&!explicitProbe)return false;
  return true;
}

async function probeRequestedUrls(message='', emit){
  const urls=[...new Set(extractPublicUrl(message))]
    .filter(isSafePublicUrl)
    .filter(url=>shouldProbeRequestedUrl(url,message))
    .slice(0,3);
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

export { extractCodeBlocks, balanceReport, staticVerifyText, shouldProbeRequestedUrl, probeRequestedUrls };
