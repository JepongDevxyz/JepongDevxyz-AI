import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

const chat=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function section(start,end){
  const s=chat.indexOf(start),e=chat.indexOf(end,s+start.length);
  assert(s>=0&&e>s,'Missing source contract: '+start);
  return chat.slice(s,e);
}
assert(chat.includes('autoFallback = body.autoFallback === true;'),
  'Emergency fallback flag must be an explicit boolean');
assert(chat.includes('smartRouter = autoFallback && body.smartRouter === true;'),
  'Smart router must be separately opted into');
assert(chat.includes('if(autoFallback&&fallbackable){'),'Emergency routes must require ON');
assert(index.includes('router.disabled=!autoProviderFallback;'));
assert(index.includes('syncStrictRoutingControls();'));

const helper=section('function providerCredentials(','\nfunction getProviderKeys(');
const select=new Function('API_GUARD',helper+'return providerCredentials;')(
  {maxProviderCredentialsPerRequest:8});
assert.deepEqual(select(['first','second'],false),['first','second'],
  'Multi-key rotation must work even when emergency fallback is OFF');
assert.deepEqual(select(['first','second'],true),['first','second']);
assert.deepEqual(select([{accountId:'a',apiToken:'x'},{accountId:'b',apiToken:'y'}],false)
  .map(x=>x.accountId),['a','b'],'Cloudflare account rotation must be retained');
assert.deepEqual(select(['first','first','second'],false),['first','second']);

const keyCode=section('function getProviderKeys(','\nfunction ');
const getKeys=new Function('rotateProviderKeys','parseKeys','API_GUARD',keyCode+'return getProviderKeys;')(
  (_provider,keys)=>keys.slice().reverse(),
  ()=>['first-key','second-key'],
  {maxProviderCredentialsPerRequest:8}
);
assert.deepEqual(getKeys('gemini',false),['first-key','second-key']);
assert.deepEqual(getKeys('gemini',true),['second-key','first-key']);

assert(!index.includes('data-provider="aihorde"'));
assert(!index.includes('aria-label="AI Horde"'));
assert(!index.includes('aihordeFourModelChoices'));
assert(chat.includes("if(provider==='aihorde')return {ok:false,status:400"),
 'Direct AI Horde chat must be disabled');
assert(chat.includes("const keys=anonymous?[AIHORDE_ANONYMOUS_KEY]:configuredKeys;"),
 'Registered Horde must never preempt the independent anonymous emergency route');
console.log('PASS: all selected-provider credentials precede gated registered/anonymous Horde; Cloudflare account rotation and no carousel.');
