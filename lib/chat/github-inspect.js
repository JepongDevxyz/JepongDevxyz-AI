/* lib/chat/github-inspect.js — split from api/chat.js (mechanical move, no behavior change). */
import { extractPublicUrl, isSafePublicUrl, isWebsiteSecurityRequest, safePublicFetch, stripHtml } from './search.js';
import { activity, json } from './utils.js';

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

// Public GitHub repository inspection is read-only. Report repository steps only
// when their HTTP requests are actually performed; private repos need an authorized connector.
async function inspectPublicGitHubRepository(message='', emit){
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
function publicSecurityHeaderObservations(response, requestedUrl=''){
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

async function inspectProvidedLinks(message='', emit){
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

export { linkLabel, linkPurpose, inspectPublicGitHubRepository, publicSecurityHeaderObservations, inspectProvidedLinks };
