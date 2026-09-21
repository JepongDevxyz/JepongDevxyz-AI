// Adapt Vercel Node.js IncomingMessage/ServerResponse to Fetch Request/Response.
// Edge-style route logic stays testable with a native Request in GitHub Actions.
import { json } from './_github_oauth.js';

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
      for await(const part of req){
        const chunk=Buffer.isBuffer(part)?part:Buffer.from(part);
        n+=chunk.length;
        if(n>20000)throw Object.assign(new Error('Request too large.'),{status:413});
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
  res.end(await response.text());
}
export async function webCompatible(req,res,handle){
  // Native Fetch Request in tests/Fetch runtimes.
  if(req instanceof Request)return handle(req);
  // Vercel Node runtime: always normalize the IncomingMessage, even if a
  // framework/proxy happens to attach a headers.get helper.
  try{return await replyNode(res,await handle(await webRequestFromNode(req)));}
  catch(e){return replyNode(res,json({error:e?.status?e.message:'Request failed.'},e?.status||500));}
}
