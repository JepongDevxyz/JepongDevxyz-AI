import {SESSION_COOKIE,cookie,configured,githubSession,beginFlow,requireSameOrigin,requestOnCallbackOrigin,noStore} from './_github-session.js';
export const config={runtime:'edge'};

// This is a real GitHub App web authorization flow, not an API-key prompt or a simulated connection.
// GET /api/github-auth?action=start  -> github.com/login/oauth/authorize
// GET /api/github-auth?action=status -> status without disclosing OAuth token
// POST /api/github-auth?action=logout -> clear this site's encrypted session cookie
export default async function handler(req){
  const url=new URL(req.url);
  const action=url.searchParams.get('action')||'status';
  const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{
    status,headers:noStore({'Content-Type':'application/json; charset=utf-8',...headers})
  });
  if(!requestOnCallbackOrigin(req))
    return response({error:'Open the configured primary site URL to connect GitHub.'},403);
  if(action==='status'&&req.method==='GET'){
    const session=await githubSession(req.headers.get('cookie'));
    return response({configured:configured(),connected:!!session,
      account:session?{login:session.login,id:session.uid}:null,
      expiresAt:session?new Date(session.exp).toISOString():null,
      provider:'GitHub App',permissions:'App permissions configured on GitHub; read-only API routes in this website.'});
  }
  if(action==='start'&&req.method==='GET'){
    if(!configured())return response({error:'GitHub App connection is not configured by the site owner.'},503);
    const {url:authUrl,setCookie}=await beginFlow();
    const h=new Headers(noStore({Location:authUrl}));
    h.append('Set-Cookie',setCookie);
    return new Response(null,{status:302,headers:h});
  }
  if(action==='logout'&&req.method==='POST'){
    if(!requireSameOrigin(req))return response({error:'Origin not allowed.'},403);
    const h=new Headers(noStore({'Content-Type':'application/json; charset=utf-8'}));
    h.append('Set-Cookie',cookie(SESSION_COOKIE,'',0));
    return new Response(JSON.stringify({connected:false,disconnected:true}),{status:200,headers:h});
  }
  return response({error:'Method or GitHub action not allowed.'},405);
}
