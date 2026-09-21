// Adapt Vercel Node.js IncomingMessage/ServerResponse to Fetch Request/Response.
// Edge-style route logic stays testable with a native Request in GitHub Actions.
import { json } from './_github_oauth.js';

async function webRequestFromNode(req){
  if(typeof req.headers?.get==='function')return req;
  const host=String(req.headers?.host||'').trim();
  if(!/^[a-z0-9.-]+(?::[0-9]{1,5})?$/i.test(host))
    throw Object.assign(new Error('Invalid request host.'),{status:400});
  const url=new URL(String(req.url||'/'),'https://'+host);
  const headers=new Headers();
  for(const [key,value] of Object.entries(req.headers||{})){
    if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):String(value));
  }
  const method=String(req.method||'GET').toUpperCase();
  const options={method,headers};
  if(!['GET','HEAD'].includes(method)){
    let n=0;const parts=[];
    for await(const part of req){
      n+=part.length;
      if(n>20000)throw Object.assign(new Error('Request too large.'),{status:413});
      parts.push(part);
    }
    options.body=Buffer.concat(parts);
  }
  return new Request(url,options);
}
async function replyNode(res,response){
  if(!res)return response;
  res.writeHead(response.status,Object.fromEntries(response.headers.entries()));
  res.end(await response.text());
}
export async function webCompatible(req,res,handle){
  if(typeof req.headers?.get==='function')return handle(req);
  try{return await replyNode(res,await handle(await webRequestFromNode(req)));}
  catch(e){return replyNode(res,json({error:e?.status?e.message:'Request failed.'},e?.status||500));}
}
