import handler from '../api/chat.js';

async function call(body, {method='POST', raw=false}={}) {
  const init={method};
  if(method==='POST'){
    init.headers={'content-type':'application/json'};
    init.body=raw ? body : JSON.stringify(body);
  }
  const res=await handler(new Request('https://example.test/api/chat',init));
  return {status:res.status,text:await res.text()};
}

const malformed=await call('{',{raw:true});
if(malformed.status!==400) throw new Error(`malformed JSON must be 400, got ${malformed.status}: ${malformed.text}`);
for(const value of [null,[],"x",123]){
  const r=await call(value);
  if(r.status!==400) throw new Error(`non-object JSON must be 400 for ${JSON.stringify(value)}, got ${r.status}: ${r.text}`);
}
for(const value of [{}, {message:'   '}, {message:'',files:[]}]){
  const r=await call(value);
  if(r.status!==400) throw new Error(`empty chat request must be 400 for ${JSON.stringify(value)}, got ${r.status}: ${r.text}`);
}
const head=await call(null,{method:'HEAD'});
if(head.status!==200) throw new Error(`HEAD expected 200, got ${head.status}`);
const get=await call(null,{method:'GET'});
if(get.status!==405) throw new Error(`GET expected 405, got ${get.status}`);
console.log('backend request validation checks passed');
