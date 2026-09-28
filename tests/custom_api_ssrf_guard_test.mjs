import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const source=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
function between(src,start,end){
  const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'Missing source section: '+start);
  return src.slice(a,b);
}

const guard=between(source,'function isPrivateIpv4(','async function safePublicFetch(');
const {isSafePublicUrl}=new Function('URL',guard+'\nreturn {isSafePublicUrl};')(URL);
const strict={httpsOnly:true,standardPortsOnly:true,noQueryHash:true};

assert.equal(isSafePublicUrl('https://api.openai.com/v1',strict),true);
assert.equal(isSafePublicUrl('http://api.openai.com/v1',strict),false);
assert.equal(isSafePublicUrl('https://localhost/v1',strict),false);
assert.equal(isSafePublicUrl('https://127.0.0.1/v1',strict),false);
assert.equal(isSafePublicUrl('https://10.0.0.8/v1',strict),false);
assert.equal(isSafePublicUrl('https://192.168.1.1/v1',strict),false);
assert.equal(isSafePublicUrl('https://[::1]/v1',strict),false);
assert.equal(isSafePublicUrl('https://user:pass@api.openai.com/v1',strict),false);
assert.equal(isSafePublicUrl('https://api.openai.com:444/v1',strict),false);
assert.equal(isSafePublicUrl('https://api.openai.com/v1?debug=1',strict),false);
assert.equal(isSafePublicUrl('https://service.internal/v1',strict),false);

const custom=between(source,'async function runGenericCustomApi(','function chatCompletionsUrl(');
assert(custom.includes('safePublicFetch(url'),'Custom API chat must use the guarded public fetch helper');
assert(custom.includes('isSafePublicUrl(url,customApiPolicy)'),'Custom API chat must reject unsafe endpoints before sending credentials');
assert(!custom.includes('await fetch(url'),'Custom API chat must not bypass SSRF guards');

const action=between(source,"if(body.action==='custom-api-models'){","if(body.action==='provider-status')");
assert(action.includes('safePublicFetch(modelsUrl'),'Custom API model discovery must use the guarded public fetch helper');
assert(action.includes('isSafePublicUrl(modelsUrl,customApiPolicy)'),'Custom API model discovery must reject unsafe endpoints');
assert(!action.includes('await fetch(modelsUrl'),'Model discovery must not bypass SSRF guards');

console.log('PASS: Custom API server fetches reject private/local endpoints and never forward API keys across redirects.');
