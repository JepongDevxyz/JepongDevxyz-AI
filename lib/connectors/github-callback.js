/* ============================================================
   JepongDevxyz AI — GitHub connector OAuth callback
   GET /api/connectors/github-callback?code=...&state=<nonce>

   - Redeems the one-time nonce to find the signed-in user.
   - Exchanges the code for a token, fetches the GitHub login,
     stores the token in connector_tokens (provider 'github').
   - Then shows the repository-access page (like the Muse app):
     "All repositories" or "Only select repositories" + Save.
     The page talks to /api/connectors/github-repos with a
     single-use setup token (never the GitHub token itself).
   ============================================================ */


import {
  fail,
  redeemLinkNonce,
  mintLinkNonce,
  saveTokenRow,
  providerGet,
} from './_db.js';
import { GITHUB_OAUTH, githubOAuthConfig } from './_providers.js';

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function failPage(message) {
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>GitHub connection failed</title><style>body{font-family:system-ui,sans-serif;display:flex;min-height:100dvh;' +
    'align-items:center;justify-content:center;background:#101014;color:#eee;margin:0}' +
    '.card{text-align:center;padding:32px;max-width:340px}.msg{opacity:.8;line-height:1.5}' +
    'button{margin-top:20px;padding:10px 22px;border-radius:999px;border:0;background:#f59e0b;color:#111;' +
    'font-weight:700;cursor:pointer}</style></head><body><div class="card"><h2>Connection failed</h2>' +
    '<p class="msg">' + escHtml(message) + '</p><button onclick="window.close()">Close</button></div>' +
    '<script>try{if(window.opener)window.opener.postMessage({jdConnector:"github",ok:false},"*");}catch(e){}</script>' +
    '</body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

function accessPage(login, setupToken) {
  const tokJs = JSON.stringify(setupToken);
  return new Response(
    '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>GitHub repository access</title><style>' +
    'body{font-family:system-ui,sans-serif;background:#101014;color:#eee;margin:0;padding:24px}' +
    '.card{max-width:420px;margin:0 auto}.ok{font-size:40px}' +
    'h2{margin:8px 0 4px}.sub{opacity:.7;font-size:.9rem;margin:0 0 16px}' +
    '.opt{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid #333;border-radius:12px;margin-bottom:10px;cursor:pointer}' +
    '.opt input{margin-top:3px}.opt b{display:block}.opt small{opacity:.65}' +
    '#repolist{max-height:260px;overflow-y:auto;border:1px solid #333;border-radius:12px;padding:8px;margin:-2px 0 12px}' +
    '#repolist label{display:flex;gap:10px;align-items:center;padding:7px 8px;border-radius:8px;font-size:.88rem;cursor:pointer}' +
    '#repolist label:hover{background:#1c1c22}.loading{opacity:.6;padding:12px;text-align:center;font-size:.85rem}' +
    '#save{width:100%;padding:12px;border:0;border-radius:999px;background:#f59e0b;color:#111;font-weight:700;' +
    'font-size:.95rem;cursor:pointer;margin-top:4px}#save:disabled{opacity:.5}' +
    '.done{text-align:center;padding:20px}.err{color:#f87171;font-size:.85rem;margin-top:8px;min-height:1.2em}' +
    '</style></head><body><div class="card" id="main">' +
    '<div class="ok">&#10003;</div><h2>GitHub connected</h2>' +
    '<p class="sub">Signed in as <b>' + escHtml(login) + '</b>. Choose which repositories the AI can access:</p>' +
    '<label class="opt"><input type="radio" name="mode" value="all" checked><span><b>All repositories</b>' +
    '<small>Current and future repositories you can access.</small></span></label>' +
    '<label class="opt"><input type="radio" name="mode" value="selected"><span><b>Only select repositories</b>' +
    '<small>Pick exactly which repositories are visible.</small></span></label>' +
    '<div id="repolist" hidden><div class="loading">Loading repositories…</div></div>' +
    '<div class="err" id="err"></div>' +
    '<button id="save">Save</button></div>' +
    '<script>' +
    'var SETUP_TOKEN=' + tokJs + ';' +
    'var list=document.getElementById("repolist"),err=document.getElementById("err");' +
    'var radios=document.querySelectorAll(\'input[name="mode"]\');' +
    'function selMode(){for(var i=0;i<radios.length;i++)if(radios[i].checked)return radios[i].value;return "all";}' +
    'function toggleList(){list.hidden=selMode()!=="selected";}' +
    'for(var i=0;i<radios.length;i++)radios[i].addEventListener("change",toggleList);' +
    'var loaded=false;' +
    'function loadRepos(){' +
    ' if(loaded)return;loaded=true;' +
    ' fetch("/api/connectors/github-repos?setup_token="+encodeURIComponent(SETUP_TOKEN))' +
    ' .then(function(r){return r.json();}).then(function(d){' +
    '  if(!d||!d.ok)throw new Error((d&&d.error)||"failed");' +
    '  var repos=d.repos||[],cur=d.selection||{mode:"all",repos:[]};' +
    '  if(cur.mode==="selected"){for(var i=0;i<radios.length;i++)radios[i].value==="selected"&&(radios[i].checked=true);toggleList();}' +
    '  list.innerHTML=repos.map(function(r){' +
    '   var checked=cur.repos.indexOf(r.full_name)!==-1?" checked":"";' +
    '   return \'<label><input type="checkbox" value="\'+r.full_name.replace(/"/g,"&quot;")+\'"+checked+">"+r.full_name.replace(/</g,"&lt;")+"</label>";' +
    '  }).join("")||\'<div class="loading">No repositories found.</div>\';' +
    ' }).catch(function(e){list.innerHTML=\'<div class="loading">Could not load repositories.</div>\';});' +
    '}' +
    'document.querySelector(\'input[value="selected"]\').addEventListener("change",loadRepos);' +
    'document.getElementById("save").addEventListener("click",function(){' +
    ' var btn=this;btn.disabled=true;err.textContent="";' +
    ' var mode=selMode(),repos=[];' +
    ' if(mode==="selected"){var c=list.querySelectorAll("input:checked");for(var i=0;i<c.length;i++)repos.push(c[i].value);}' +
    ' fetch("/api/connectors/github-repos",{method:"POST",headers:{"Content-Type":"application/json"},' +
    ' body:JSON.stringify({setup_token:SETUP_TOKEN,mode:mode,repos:repos})})' +
    ' .then(function(r){return r.json();}).then(function(d){' +
    '  if(d&&d.ok){' +
    '   document.getElementById("main").innerHTML=\'<div class="done"><div class="ok">&#10003;</div><h2>Saved!</h2><p class="sub">You can close this window.</p></div>\';' +
    '   try{if(window.opener)window.opener.postMessage({jdConnector:"github",ok:true},"*");}catch(e){}' +
    '   setTimeout(function(){try{window.close();}catch(e){}},1200);' +
    '  }else{err.textContent=(d&&d.error)||"Could not save.";btn.disabled=false;}' +
    ' }).catch(function(){err.textContent="Network error.";btn.disabled=false;});' +
    '});' +
    '</script></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function handle(req) {
  if (req.method !== 'GET') return new Response('Method not allowed.', { status: 405 });
  const u = new URL(req.url, 'http://x');
  const code = u.searchParams.get('code') || '';
  const state = u.searchParams.get('state') || '';
  if (!code || !state) return failPage('The sign-in was cancelled or invalid.');
  try {
    const userId = await redeemLinkNonce(state, 'github');
    const cfg = githubOAuthConfig();
    if (!cfg) return failPage('GitHub OAuth is not configured.');
    const tr = await fetch(GITHUB_OAUTH.tokenUrl, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: cfg.clientId, client_secret: cfg.clientSecret, code }),
      signal: AbortSignal.timeout(15000),
    });
    const tdata = await tr.json().catch(() => null);
    if (!tr.ok || !tdata || !tdata.access_token) {
      fail(502, 'GitHub did not return a token.');
    }
    const me = await providerGet(GITHUB_OAUTH.userUrl, tdata.access_token, {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'JepongDevxyz-AI-Connectors',
    });
    const login = me.ok && me.data && me.data.login ? String(me.data.login) : '';
    if (!login) fail(502, 'Could not read your GitHub profile.');
    await saveTokenRow(userId, 'github', {
      access_token: tdata.access_token,
      refresh_token: null,
      expires_at: null,
      scope: tdata.scope || GITHUB_OAUTH.scopes.join(','),
      label: '@' + login,
    });
    const setupToken = await mintLinkNonce(userId, 'github-setup');
    return accessPage('@' + login, setupToken);
  } catch (e) {
    return failPage((e && e.message) || 'Something went wrong. Close this window and try again.');
  }
}

export { handle };