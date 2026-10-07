import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const extract=(source,start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,`Missing source section: ${start}`);
 return source.slice(a,b);
};
const init=extract(html,'const PERSONALIZATION_DEFAULTS = {','let personalizationSettings =');
assert.doesNotMatch(init,/readLocalJSON\(['"]jepong_personalization/,
 'settings must initialize from canonical Supabase state, never stale browser storage');
const persist=extract(html,'function persistPersonalization() {','function personalizationElementMap()');
assert.doesNotMatch(persist,/localStorage\.(?:setItem|getItem)\(['"]jepong_personalization/,
 'editing a setting must not persist user preferences in localStorage');
assert.match(persist,/queueCloudSync\(\)/,'a setting edit must enqueue the authenticated Supabase write');
assert.doesNotMatch(html,/localStorage\.(?:setItem|getItem)\(['"]jepong_personalization/,'no settings value may be read from or written to localStorage');
const cloudWrite=extract(html,'async function syncCloudNow(','async function saveFileToLibrary(');
assert.match(cloudWrite,/from\('user_settings'\)\.upsert\(payload/,'the active account must be the durable settings store');
assert.doesNotMatch(cloudWrite,/localStorage\.(?:setItem|getItem)\(['"]jepong_personalization/);
const cloudLoad=extract(html,'async function loadCloudState()','async function syncCloudNow(');
assert.doesNotMatch(cloudLoad,/jepong_personalization_updated_at|localUpdated/,
 'a browser cache timestamp must never override the per-user Supabase row');
const libraryHelperStart=html.indexOf('async function searchPrivateLibraryForChat(');
assert(libraryHelperStart>=0,'Library search must have a real runtime handler');
const librarySearch=extract(html,'async function searchPrivateLibraryForChat(','async function openLibrary()');
const executeSearch=new Function('personalizationSettings','cloudUser','cloudClient',librarySearch+'\nreturn searchPrivateLibraryForChat;');
const calls=[];
const search=executeSearch({librarySearch:true},{id:'user-a'},
 {rpc:async(name,args)=>{calls.push({name,args});return {data:[{file_name:'notes.txt',snippet:'relevant private note'}],error:null};}});
assert.deepEqual(await search('where is my saved note?'),[{fileName:'notes.txt',snippet:'relevant private note'}]);
assert.equal(calls.length,1,'enabled Library search must query Supabase');
assert.equal(calls[0].name,'search_library_items','search must use the RLS-protected function');
const disabled=executeSearch({librarySearch:false},{id:'user-a'},{rpc:async()=>{throw new Error('must not query');}});
assert.deepEqual(await disabled('private prompt'),[],'Library search OFF must not query or attach private excerpts');
const signedOut=executeSearch({librarySearch:true},null,{rpc:async()=>{throw new Error('must not query');}});
assert.deepEqual(await signedOut('private prompt'),[],'signed-out sessions must not access account Library data');
assert.match(html,/search_text:String\(item\.extractedText\|\|''\)\.slice\(0,24000\)/,'new private Library files must receive a text-search index');
const chatRequest=extract(html,'const personalizationForRequest=getPersonalizationPayload();','plugins: getChatPluginContext()');
assert.match(chatRequest,/libraryContext=await searchPrivateLibraryForChat\(/,
 'chat requests must carry matched Library excerpts');
assert.match(chatRequest,/personalization: personalizationForRequest/,'chat requests must send the augmented settings object');
const featureSettings=extract(api,'function applyChatFeatureSettings(body={}){','async function processChat(');
const applyFeatures=new Function(featureSettings+'\nreturn applyChatFeatureSettings;')();
const enabled=applyFeatures({message:'x',files:[{name:'attached.png'}],personalization:{librarySearch:true,libraryContext:[{fileName:' note.txt ',snippet:' useful note '}]}});
assert.deepEqual(enabled.personalization.libraryContext,[{fileName:'note.txt',snippet:'useful note'}]);
assert.equal(enabled.files.length,1,'Library search context must coexist with current attachments when enabled');
const disabledFeatures=applyFeatures({message:'x',files:[{name:'attached.png'}],personalization:{librarySearch:false,libraryContext:[{fileName:'secret.txt',snippet:'private'}]}});
assert.deepEqual(disabledFeatures.personalization.libraryContext,[],'the API must drop private excerpts when Library search is OFF');
assert.equal(disabledFeatures.files.length,1,'automatic Library search OFF must preserve manual attachments');
assert.match(api,/p\.libraryContext/,'the system prompt must deliver Library context to the selected model');
const migrationPath=new URL('../supabase/migrations/20261006_personalization_library_search.sql',import.meta.url);
assert(existsSync(migrationPath),'the Supabase schema/RLS migration must be checked in');
const migration=readFileSync(migrationPath,'utf8');
assert.match(migration,/create table if not exists public\.user_settings/i);
assert.match(migration,/enable row level security/i);
assert.match(migration,/\(select auth\.uid\(\)\)\s*=\s*user_id/i);
assert.match(migration,/search_library_items/i);
assert.match(migration,/using\s+gin/i);
assert.match(migration,/security invoker/i,'the search function must not bypass RLS');
assert.match(migration,/from public, anon, service_role/i,'search RPC must not be callable by anonymous/service roles');
assert.match(migration,/for all to authenticated[\s\S]{0,140}\(select auth\.uid\(\)\)/i,'settings RLS must be authenticated-only and initplan optimized');
const hardeningPath=new URL('../supabase/migrations/20261006_personalization_library_search_hardening.sql',import.meta.url);
assert(existsSync(hardeningPath),'a follow-up migration must normalize existing policies and explicit grants');
const hardening=readFileSync(hardeningPath,'utf8');
assert.match(hardening,/drop policy if exists "Users can insert own settings"/i);
assert.match(hardening,/for all to authenticated/i);
assert.match(hardening,/from public, anon, service_role/i);
console.log('PASS: canonical Supabase personalization and private Library search are wired end to end');
