import {githubAppStatus,githubAppInstallUrl} from './_github_app.js';
import {json} from './_github_oauth.js';
export const config={runtime:'edge'};
export default async function handler(request){
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  try{
    const status=await githubAppStatus(request);
    if(!status.configured)return json({error:'GitHub App registration is not configured on this site.'},503);
    return new Response(null,{status:302,headers:{Location:githubAppInstallUrl(),'Cache-Control':'no-store'}});
  }catch(error){return json({error:error?.message||'GitHub App installation unavailable.'},error?.status||503);}
}
