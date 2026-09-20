import {githubAppStatus} from './_github_app.js';
export const config={runtime:'edge'};
// GitHub's setup_url includes an untrusted installation_id. Ignore that query
// parameter completely; verify the current signed-in user's own installation
// server-side via /users/{login}/installation.
export default async function handler(request){
  if(request.method!=='GET')return new Response('Method not allowed.',{status:405});
  const url=new URL(request.url);
  try{
    const status=await githubAppStatus(request);
    url.pathname='/';url.search='';url.hash='';
    url.searchParams.set('github_app',status.installed?'installed':'not_installed');
    return new Response(null,{status:302,headers:{Location:url.toString(),'Cache-Control':'no-store'}});
  }catch(_){
    url.pathname='/';url.search='';url.hash='';
    url.searchParams.set('github_app','verify');
    return new Response(null,{status:302,headers:{Location:url.toString(),'Cache-Control':'no-store'}});
  }
}
