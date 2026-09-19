import {GITHUB_STATE_COOKIE,GITHUB_RETURN_COOKIE,githubOAuthConfig,oauthCallbackUrl,randomState,sanitizeReturnPath,secureCookie,json} from './_github_oauth.js';
export const config={runtime:'edge'};
export default async function handler(request){
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  try{
    const {clientId}=githubOAuthConfig();
    const url=new URL(request.url);
    const state=randomState();
    const returnTo=sanitizeReturnPath(url.searchParams.get('return_to')||'/?github=connected');
    const callback=oauthCallbackUrl(request);
    const scope=String(process.env.GITHUB_OAUTH_SCOPES||'read:user user:email').trim();
    const authorize=new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id',clientId);
    authorize.searchParams.set('redirect_uri',callback);
    authorize.searchParams.set('state',state);
    if(scope)authorize.searchParams.set('scope',scope);
    const headers=new Headers({Location:authorize.toString(),'Cache-Control':'no-store'});
    headers.append('Set-Cookie',secureCookie(GITHUB_STATE_COOKIE,state,{maxAge:600}));
    headers.append('Set-Cookie',secureCookie(GITHUB_RETURN_COOKIE,returnTo,{maxAge:600}));
    return new Response(null,{status:302,headers});
  }catch(error){return json({error:error?.message||'GitHub OAuth is unavailable.'},503);}
}
