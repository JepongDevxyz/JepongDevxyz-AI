import assert from 'node:assert/strict';

process.env.GITHUB_SESSION_SECRET='test-secret-0123456789-test-secret-abcdef';
process.env.GITHUB_OAUTH_CLIENT_ID='Iv1.testclient';
process.env.GITHUB_OAUTH_CLIENT_SECRET='test-client-secret';
process.env.GITHUB_OAUTH_CALLBACK_URL='https://example.test/api/github-oauth-callback';
process.env.GITHUB_OAUTH_SCOPES='read:user user:email';

const helper=await import('../api/_github_oauth.js');
const start=(await import('../api/github-oauth-start.js')).default;
const callback=(await import('../api/github-oauth-callback.js')).default;
const sessionHandler=(await import('../api/github-oauth-session.js')).default;

assert.equal(helper.sanitizeReturnPath('/chat?x=1'),'/chat?x=1');
assert.equal(helper.sanitizeReturnPath('https://evil.test/'),'/');
assert.equal(helper.sanitizeReturnPath('//evil.test/'),'/');

const sealed=await helper.sealSession({token:'gho_secret_token',login:'tester'});
assert(!sealed.includes('gho_secret_token'),'encrypted OAuth cookie must not expose access token');
const opened=await helper.openSession(sealed);
assert.equal(opened.token,'gho_secret_token');

const startResponse=await start(new Request('https://example.test/api/github-oauth-start?return_to=%2Fchat'));
assert.equal(startResponse.status,302);
const authUrl=new URL(startResponse.headers.get('location'));
assert.equal(authUrl.origin,'https://github.com');
assert.equal(authUrl.pathname,'/login/oauth/authorize');
assert.equal(authUrl.searchParams.get('client_id'),'Iv1.testclient');
assert.equal(authUrl.searchParams.get('redirect_uri'),'https://example.test/api/github-oauth-callback');
assert.equal(authUrl.searchParams.get('scope'),'read:user user:email');
const state=authUrl.searchParams.get('state');
assert(state&&state.length>20);
const setCookie=startResponse.headers.get('set-cookie')||'';
assert(setCookie.includes('HttpOnly')&&setCookie.includes('SameSite=Lax')&&setCookie.includes('Secure'));

const savedFetch=globalThis.fetch;
let sawTokenExchange=false,sawUser=false,sawRevoke=false;
globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u==='https://github.com/login/oauth/access_token'){
    sawTokenExchange=true;
    const body=JSON.parse(options.body||'{}');
    assert.equal(body.client_secret,'test-client-secret');
    assert.equal(body.code,'abc123');
    return Response.json({access_token:'gho_mock_access_token',token_type:'bearer',scope:'read:user,user:email'});
  }
  if(u==='https://api.github.com/user'){
    sawUser=true;
    assert.equal(options.headers.Authorization,'Bearer gho_mock_access_token');
    return Response.json({login:'octocat',name:'Octo Cat',avatar_url:'https://avatars.example/octo.png',html_url:'https://github.com/octocat'});
  }
  if(u.includes('/applications/Iv1.testclient/token')&&options.method==='DELETE'){
    sawRevoke=true;
    assert(String(options.headers.Authorization||'').startsWith('Basic '));
    return new Response(null,{status:204});
  }
  throw new Error('Unexpected fetch '+u);
};

try{
  const callbackRequest=new Request('https://example.test/api/github-oauth-callback?code=abc123&state='+encodeURIComponent(state),{
    headers:{Cookie:'jdgh_state='+encodeURIComponent(state)+'; jdgh_return='+encodeURIComponent('/chat')}
  });
  const callbackResponse=await callback(callbackRequest);
  assert.equal(callbackResponse.status,302);
  assert.equal(new URL(callbackResponse.headers.get('location')).pathname,'/chat');
  assert.equal(new URL(callbackResponse.headers.get('location')).searchParams.get('github'),'connected');
  const callbackCookies=callbackResponse.headers.get('set-cookie')||'';
  const match=callbackCookies.match(/jdgh_session=([^;,]+)/);
  assert(match,'encrypted GitHub session cookie missing');
  const sessionCookie=decodeURIComponent(match[1]);
  assert(!sessionCookie.includes('gho_mock_access_token'),'OAuth token leaked into cookie');

  const sessionResponse=await sessionHandler(new Request('https://example.test/api/github-oauth-session',{
    headers:{Cookie:'jdgh_session='+encodeURIComponent(sessionCookie),Origin:'https://example.test'}
  }));
  assert.equal(sessionResponse.status,200);
  const session=await sessionResponse.json();
  assert.equal(session.connected,true);
  assert.equal(session.user.login,'octocat');
  assert.deepEqual(session.scopes,['read:user','user:email']);

  const disconnectResponse=await sessionHandler(new Request('https://example.test/api/github-oauth-session',{
    method:'DELETE',headers:{Cookie:'jdgh_session='+encodeURIComponent(sessionCookie),Origin:'https://example.test'}
  }));
  assert.equal(disconnectResponse.status,200);
  assert((disconnectResponse.headers.get('set-cookie')||'').includes('Max-Age=0'));
  assert(sawTokenExchange&&sawUser&&sawRevoke);
  console.log('PASS: encrypted GitHub OAuth web flow, account session and disconnect');
} finally {
  globalThis.fetch=savedFetch;
}
