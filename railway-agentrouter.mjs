import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';

const PORT=Number(process.env.PORT||3000);
const MODEL='deepseek-v4-flash';
const base=String(process.env.AGENTROUTER_BASE_URL||'https://agentrouter.org/').trim()
  .replace(/\/+$/,'').replace(/\/v1\/messages$/i,'').replace(/\/v1$/i,'');
const url=base+'/v1/messages';
const keys=()=>String(process.env.AGENTROUTER_API_KEYS||process.env.AGENTROUTER_API_KEY||'')
  .split(/[\n,]+/).map(x=>x.trim()).filter(Boolean).slice(0,8);
const json=(res,status,data)=>{
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});
  res.end(JSON.stringify(data));
};
const sameToken=(supplied,expected)=>{
  if(!supplied||!expected)return false;
  const a=Buffer.from(supplied),b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
};
let egress={state:'pending'};
async function inspectNetwork(){
  try{
    // Invalid throwaway token tests the outbound route, never key validity.
    const r=await fetch(url,{method:'POST',redirect:'manual',
      headers:{authorization:'Bearer invalid-diagnostic-token','anthropic-version':'2023-06-01','content-type':'application/json','accept':'application/json'},
      body:JSON.stringify({model:MODEL,max_tokens:1,messages:[{role:'user',content:'Ping'}],stream:false}),
      signal:AbortSignal.timeout(12000)});
    const ct=String(r.headers.get('content-type')||'').toLowerCase();
    egress={state:'completed',status:r.status,contentType:ct.slice(0,100),kind:ct.includes('text/html')?'html':ct.includes('json')?'json':'other',
      redirected:r.status>=300&&r.status<400};
  }catch(err){egress={state:'failed',networkError:err?.name||'fetch_error'};}
  console.log('[egress-check]',JSON.stringify(egress));
}
function responseText(raw,ct){
  if(/text\/html/i.test(ct)||/^\s*(?:<!doctype|<html)/i.test(raw))return {kind:'html',text:''};
  let obj;
  try{obj=JSON.parse(raw);}catch{return {kind:'unknown',text:''};}
  const content=Array.isArray(obj.content)?obj.content:[];
  return {kind:'json',text:content.filter(b=>b?.type==='text').map(b=>String(b.text||'')).join(''),
    upstreamError:obj?.error?.message||obj?.msg||obj?.message||''};
}
function sseText(raw){
  let output='',stopped=false;
  for(const block of raw.split(/\r?\n\r?\n/)){
    const lines=block.split(/\r?\n/).filter(x=>x.startsWith('data:'));
    if(!lines.length)continue;
    let evt;try{evt=JSON.parse(lines.map(x=>x.slice(5).trimStart()).join('\n'));}catch{continue;}
    if(evt?.type==='content_block_start'&&evt.content_block?.type==='text')output+=String(evt.content_block.text||'');
    if(evt?.type==='content_block_delta'&&evt.delta?.type==='text_delta')output+=String(evt.delta.text||'');
    if(evt?.type==='message_stop')stopped=true;
  }
  return {kind:'sse',text:output,stopped};
}
async function callProvider(body,{singleCredential=false}={}){
  const list=singleCredential?keys().slice(0,1):keys();
  if(!list.length)return {status:503,result:{error:'AGENTROUTER_API_KEYS is not configured on Railway.'}};
  const messages=Array.isArray(body.messages)?body.messages.filter(x=>['user','assistant'].includes(x?.role)&&typeof x.content==='string')
    .slice(-20).map(x=>({role:x.role,content:x.content.slice(0,12000)})):[];
  if(!messages.length)return {status:400,result:{error:'messages must include text.'}};
  const prompt={model:MODEL,max_tokens:Math.max(32,Math.min(4096,Number(body.max_tokens)||512)),messages,stream:true};
  if(typeof body.system==='string'&&body.system.trim())prompt.system=body.system.slice(0,24000);
  let last={status:502,result:{error:'AgentRouter did not return a model response.'}};
  for(let i=0;i<list.length;i++){
    try{
      const upstream=await fetch(url,{method:'POST',
        headers:{authorization:'Bearer '+list[i],'x-api-key':list[i],'anthropic-version':'2023-06-01',
          'content-type':'application/json','accept':'text/event-stream'},
        body:JSON.stringify(prompt),signal:AbortSignal.timeout(45000)});
      const ct=String(upstream.headers.get('content-type')||'').toLowerCase();
      const raw=(await upstream.text()).slice(0,2000000);
      const parsed=ct.includes('event-stream')?sseText(raw):responseText(raw,ct);
      if(parsed.kind==='html'){
        console.warn('[upstream-html]',JSON.stringify({status:upstream.status,contentType:ct.slice(0,80),host:new URL(url).hostname}));
        return {status:502,result:{error:'AgentRouter returned HTML rather than an API response.',upstreamStatus:upstream.status,kind:'html'}};
      }
      if(upstream.ok&&parsed.text.trim()){
        return {status:200,result:{model:MODEL,response:parsed.text,upstreamStatus:upstream.status,kind:parsed.kind}};
      }
      last={status:upstream.ok?502:upstream.status,result:{error:upstream.ok?'Empty model response.':'AgentRouter request failed.',
        upstreamStatus:upstream.status,kind:parsed.kind}};
      if(upstream.status!==401&&upstream.status!==429&&upstream.status<500)break;
    }catch(err){
      last={status:502,result:{error:'AgentRouter network request failed.',kind:'network',reason:err?.name||'network_error'}};
    }
  }
  return last;
}
async function inspectConfigured(){
  if(!keys().length)return;
  try{
    const response=await callProvider({messages:[{role:'user',content:'Reply exactly OK'}],max_tokens:32},{singleCredential:true});
    // Log metadata only: never write API keys or response text.
    console.log('[credential-probe]',JSON.stringify({status:response.status,kind:response.result?.kind||'unknown',
      textGenerated:response.status===200&&typeof response.result?.response==='string'&&!!response.result.response.trim(),
      upstreamStatus:Number(response.result?.upstreamStatus)||0}));
  }catch(error){
    console.warn('[credential-probe]',JSON.stringify({status:0,kind:'internal',errorType:error?.name||'Error'}));
  }
}
const server=http.createServer(async(req,res)=>{
  const pathname=new URL(req.url||'/', 'http://localhost').pathname;
  if(req.method==='GET'&&pathname==='/health'){
    return json(res,200,{service:'agentrouter-isolated',status:'running',credentialsConfigured:keys().length>0,
      bridgeAuthenticationConfigured:!!process.env.BRIDGE_SHARED_TOKEN,egress});
  }
  if(req.method!=='POST'||(pathname!=='/test'&&pathname!=='/chat'))
    return json(res,404,{error:'Not found.'});
  if(!sameToken(String(req.headers['x-bridge-token']||''),String(process.env.BRIDGE_SHARED_TOKEN||'')))
    return json(res,401,{error:'Bridge authentication required.'});
  let raw='';
  try{for await(const chunk of req){raw+=chunk;if(raw.length>120000)return json(res,413,{error:'Request too large.'});}}
  catch{return json(res,400,{error:'Invalid body.'});}
  let body;try{body=JSON.parse(raw);}catch{return json(res,400,{error:'Invalid JSON.'});}
  if(pathname==='/test')body={messages:[{role:'user',content:'Reply exactly OK'}],max_tokens:32};
  const result=await callProvider(body);
  return json(res,result.status,result.result);
});
server.listen(PORT,'0.0.0.0',()=>{console.log('[bridge] listening on '+PORT);void inspectNetwork();void inspectConfigured();});
