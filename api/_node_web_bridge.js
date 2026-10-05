// Adapt Vercel Node.js IncomingMessage/ServerResponse to Fetch Request/Response.
// Edge-style route logic stays testable with a native Request in GitHub Actions.
import { json } from './_github_oauth.js';
import { CHAT_IDENTITY_INSTRUCTION } from './_identity.js';

// Scoped identity overlay for the chat endpoint (2026-09-30). The main chat
// file (api/chat.js, ~370KB) cannot be pushed through the available GitHub
// tooling (128KB single-argument limit), so the identity lock + excellence
// bar is injected here at the request edge instead of inside
// buildSystemInstruction(). The text lands in
// body.personalization.customInstructions, which chat.js unconditionally
// appends to the system prompt it sends to every provider.
//
// Strictly scoped: only POST /api/chat with a JSON body is touched. Every
// other endpoint passes through byte-identical — including the PayMongo
// webhook, which needs byte-exact raw bodies for HMAC verification.
// Fail-open: any error returns the request untouched.
async function withChatIdentity(request){
  try{
    const url=new URL(request.url,'http://localhost');
    if(!/^\/api\/chat\/?$/.test(url.pathname))return request;
    if(String(request.method||'').toUpperCase()!=='POST')return request;
    if(!(request.headers.get('content-type')||'').includes('application/json'))return request;
    const body=await request.clone().json().catch(()=>null);
    if(!body||typeof body!=='object'||Array.isArray(body))return request;
    const p=(body.personalization&&typeof body.personalization==='object')
      ?body.personalization
      :(body.personalization={});
    const existing=typeof p.customInstructions==='string'?p.customInstructions:'';
    if(!existing.includes('JepongDevxyz AI')){
      p.customInstructions=CHAT_IDENTITY_INSTRUCTION+(existing?'\n\n'+existing:'');
    }
    return new Request(request,{body:JSON.stringify(body)});
  }catch(_){return request;}
}

async function webRequestFromNode(req){
  if(typeof req.headers?.get==='function')return req;
  const rawHeaders=req.headers&&typeof req.headers==='object'?req.headers:{};
  const forwardedHost=String(rawHeaders['x-forwarded-host']||'').split(',')[0].trim();
  const host=forwardedHost||String(rawHeaders.host||'').trim();
  if(!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(host))
    throw Object.assign(new Error('Invalid request host.'),{status:400});
  const proto=String(rawHeaders['x-forwarded-proto']||'https').split(',')[0].trim().toLowerCase();
  const scheme=proto==='http'?'http':'https';
  const url=new URL(String(req.url||'/'),scheme+'://'+host);
  const headers=new Headers();
  for(const [key,value] of Object.entries(rawHeaders)){
    if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):String(value));
  }
  const method=String(req.method||'GET').toUpperCase();
  const options={method,headers};
  if(!['GET','HEAD'].includes(method)){
    // Vercel may parse the Node request body before the handler runs. Preserve it
    // instead of trying to iterate a consumed/non-iterable request object.
    if(req.body!==undefined&&req.body!==null){
      if(Buffer.isBuffer(req.body)||typeof req.body==='string')options.body=req.body;
      else options.body=JSON.stringify(req.body);
    }else if(req&&typeof req[Symbol.asyncIterator]==='function'){
      let n=0;const parts=[];
      // Steel file uploads (multipart) need headroom; everything else keeps the 20KB cap.
      const ctype=String(rawHeaders['content-type']||'');
      const bigOk=url.pathname==='/api/steel'&&ctype.includes('multipart/form-data');
      const cap=bigOk?4*1024*1024:20000;
      for await(const part of req){
        const chunk=Buffer.isBuffer(part)?part:Buffer.from(part);
        n+=chunk.length;
        if(n>cap)throw Object.assign(new Error('Request too large.'),{status:413});
        parts.push(chunk);
      }
      options.body=Buffer.concat(parts);
    }
  }
  return new Request(url,options);
}
async function replyNode(res,response){
  if(!res)return response;
  if(typeof res.writeHead!=='function'||typeof res.end!=='function')return response;
  res.writeHead(response.status,Object.fromEntries(response.headers.entries()));
  const ct=String(response.headers.get('content-type')||'');
  // Binary-safe: only text-ish responses go through .text().
  if(ct===''||/^(text\/|application\/(json|.*\+json))/i.test(ct)) res.end(await response.text());
  else res.end(Buffer.from(await response.arrayBuffer()));
}
export async function webCompatible(req,res,handle){
  // Native Fetch Request in tests/Fetch runtimes.
  if(req instanceof Request)return handle(await withChatIdentity(req));
  // Vercel Node runtime: always normalize the IncomingMessage, even if a
  // framework/proxy happens to attach a headers.get helper.
  try{return await replyNode(res,await handle(await withChatIdentity(await webRequestFromNode(req))));}
  catch(e){return replyNode(res,json({error:e?.status?e.message:'Request failed.'},e?.status||500));}
}
