import {SESSION_COOKIE,FLOW_COOKIE,cookie,clearCookies,configured,callbackUrl,requestOnCallbackOrigin,noStore,verifyFlow,exchangeCode,githubUser,encryptSession,sessionSeconds} from './_github-session.js';
export const config={runtime:'edge'};

// Register https://<your-site>/api/github-callback as the exact GitHub App callback URL.
// The browser never receives an OAuth token, code verifier or GitHub client secret.
export default async function handler(req){
  const headers=new Headers(noStore());
  headers.append('Set-Cookie',cookie(FLOW_COOKIE,'',0));
  const origin=new URL(req.url).origin;
  const redirect=outcome=>{
    headers.set('Location',origin+'/?github='+encodeURIComponent(outcome));
    return new Response(null,{status:303,headers});
  };
  if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers});
  if(!configured()||!requestOnCallbackOrigin(req)||new URL(req.url).pathname!==new URL(callbackUrl()).pathname)
    return redirect('unavailable');
  const url=new URL(req.url);
  if(url.searchParams.get('error'))return redirect('denied');
  const code=url.searchParams.get('code')||'';
  const state=url.searchParams.get('state')||'';
  const verifier=verifyFlow(req.headers.get('cookie'),state);
  if(!code||code.length>300||!verifier)return redirect('invalid_state');
  try{
    const data=await exchangeCode(code,verifier);
    const user=await githubUser(data.access_token);
    const seconds=sessionSeconds(data);
    const exp=Date.now()+seconds*1000;
    const sealed=await encryptSession({v:1,token:data.access_token,uid:user.id,login:user.login,exp});
    // Bound session cookies to the exact HTTPS host; no JS or third-party domain access.
    headers.append('Set-Cookie',cookie(SESSION_COOKIE,sealed,seconds));
    return redirect('connected');
  }catch(_){return redirect('error');}
}
