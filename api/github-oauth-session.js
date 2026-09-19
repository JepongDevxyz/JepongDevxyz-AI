import {GITHUB_SESSION_COOKIE,clearCookie,getGitHubSession,githubApi,githubOAuthConfig,json} from './_github_oauth.js';
export const config={runtime:'edge'};
function sameOrigin(request){const origin=request.headers.get('origin');return !origin||origin===new URL(request.url).origin;}
export default async function handler(request){
  if(!sameOrigin(request)||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Origin not allowed.'},403);
  const session=await getGitHubSession(request);
  if(request.method==='GET'){
    if(!session)return json({connected:false});
    const userRes=await githubApi('/user',session.token,{signal:request.signal}).catch(()=>null);
    if(!userRes||!userRes.ok)return json({connected:false,expired:true},401,{'Set-Cookie':clearCookie(GITHUB_SESSION_COOKIE)});
    const user=await userRes.json();
    return json({connected:true,user:{login:user.login,name:user.name||'',avatar:user.avatar_url||'',url:user.html_url||''},scopes:session.scopes||[]});
  }
  if(request.method==='DELETE'){
    if(session){
      try{
        const {clientId,clientSecret}=githubOAuthConfig();
        const basic=btoa(clientId+':'+clientSecret);
        await fetch('https://api.github.com/applications/'+encodeURIComponent(clientId)+'/token',{
          method:'DELETE',headers:{Accept:'application/vnd.github+json',Authorization:'Basic '+basic,'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
          body:JSON.stringify({access_token:session.token}),redirect:'error',signal:AbortSignal.timeout(10_000)
        });
      }catch(_){}
    }
    return json({connected:false},200,{'Set-Cookie':clearCookie(GITHUB_SESSION_COOKIE)});
  }
  return json({error:'Method not allowed.'},405);
}
