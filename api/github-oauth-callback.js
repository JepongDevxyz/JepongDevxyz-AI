import {GITHUB_SESSION_COOKIE,GITHUB_STATE_COOKIE,GITHUB_RETURN_COOKIE,clearCookie,githubOAuthConfig,oauthCallbackUrl,readCookie,sanitizeReturnPath,sealSession,secureCookie,githubApi} from './_github_oauth.js';
export const config={runtime:'edge'};
function redirect(url,cookies=[]){const headers=new Headers({Location:url,'Cache-Control':'no-store'});for(const c of cookies)headers.append('Set-Cookie',c);return new Response(null,{status:302,headers});}
export default async function handler(request){
  if(request.method!=='GET')return new Response('Method not allowed.',{status:405});
  const current=new URL(request.url);
  const origin=current.origin;
  const returnTo=sanitizeReturnPath(readCookie(request,GITHUB_RETURN_COOKIE)||'/?github=connected');
  const cleanup=[clearCookie(GITHUB_STATE_COOKIE),clearCookie(GITHUB_RETURN_COOKIE)];
  try{
    const expected=readCookie(request,GITHUB_STATE_COOKIE);
    const state=current.searchParams.get('state')||'';
    const code=current.searchParams.get('code')||'';
    if(!expected||!state||expected!==state||!code)throw new Error('OAuth state validation failed.');
    const {clientId,clientSecret}=githubOAuthConfig();
    const response=await fetch('https://github.com/login/oauth/access_token',{
      method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},
      body:JSON.stringify({client_id:clientId,client_secret:clientSecret,code,redirect_uri:oauthCallbackUrl(request)}),
      redirect:'error',signal:AbortSignal.timeout(12_000)
    });
    const tokenData=await response.json().catch(()=>({}));
    if(!response.ok||!tokenData.access_token)throw new Error(tokenData.error_description||tokenData.error||'GitHub token exchange failed.');
    const userResponse=await githubApi('/user',tokenData.access_token,{signal:request.signal});
    if(!userResponse.ok)throw new Error('Could not read the authorized GitHub account.');
    const user=await userResponse.json();
    const session=await sealSession({
      token:tokenData.access_token,tokenType:tokenData.token_type||'bearer',
      scopes:String(tokenData.scope||'').split(',').map(x=>x.trim()).filter(Boolean),
      login:String(user.login||''),name:String(user.name||''),avatar:String(user.avatar_url||''),
      htmlUrl:String(user.html_url||''),createdAt:Date.now()
    });
    const target=new URL(returnTo,origin);target.searchParams.set('github','connected');
    return redirect(target.toString(),[secureCookie(GITHUB_SESSION_COOKIE,session,{maxAge:60*60*24*7}),...cleanup]);
  }catch(error){
    const target=new URL(returnTo,origin);target.searchParams.set('github','error');target.searchParams.set('github_error',String(error?.message||'OAuth failed').slice(0,140));
    return redirect(target.toString(),cleanup);
  }
}
