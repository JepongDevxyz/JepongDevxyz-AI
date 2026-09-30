import {githubAppStatus} from '../../api/_github_app.js';
import {json} from '../../api/_github_oauth.js';

export async function handler(request){
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  if(request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Cross-site request blocked.'},403);
  try{
    return json(await githubAppStatus(request));
  }catch(error){
    return json({error:error?.status?String(error.message):'Cannot verify GitHub App installation.'},error?.status||502);
  }
}
