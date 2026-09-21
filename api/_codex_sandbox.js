// A private Firecracker VM per GitHub account; no shared Codex home or runner process.
// Opt-in only: creating persistent sandboxes has compute and snapshot charges.
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { Sandbox } from '@vercel/sandbox';

const FILES = [
  'package.json', 'server.mjs', 'account-bridge.mjs', 'worker.mjs', 'events.mjs'
];
const ROOT='/vercel/sandbox/jd-codex';
const AUTH_HOME='/vercel/sandbox/jd-auth';
const PORT=8080;

export function settings(env=process.env) {
  const secret=String(env.CODEX_RUNNER_SHARED_SECRET||'');
  const enabled=env.CODEX_MULTIUSER_SANDBOX_ENABLED==='true';
  if (!enabled || secret.length < 32)
    return {enabled:false,reason:'Codex isolated sandboxes are not configured.'};
  const allowlist=new Set(String(env.CODEX_ALLOWED_GITHUB_IDS||'').split(',').map(x=>x.trim()).filter(x=>/^[1-9][0-9]{0,15}$/.test(x)));
  return {enabled:allowlist.size>0,secret,allowlist,reason:'No authorized sandbox users configured.'};
}
export function tenantIdentity(actor, secret) {
  if(!Number.isSafeInteger(actor?.id) || actor.id < 1 ||
     !/^[A-Za-z0-9-]{1,39}$/.test(String(actor.login||'')) ||
     typeof secret!=='string' || secret.length < 32)
    throw Object.assign(new Error('Invalid authenticated user or sandbox configuration.'),{status:403});
  const id=String(actor.id);
  const digest=createHmac('sha256',secret).update('tenant-name:v1:'+id).digest('hex');
  const key=createHmac('sha256',secret).update('tenant-signing:v1:'+id).digest('hex');
  return {name:'jd-codex-'+digest.slice(0,32),secret:key,login:actor.login};
}
function gatewayError(message,status=502){
  return Object.assign(new Error(message),{status});
}
function isMissing(error){
  return error?.status===404 || error?.statusCode===404 ||
    error?.response?.status===404 || error?.code==='NOT_FOUND';
}
async function installRuntime(sbx) {
  // Use fixed, repository-owned entrypoints. Never fetch arbitrary user code
  // or copy a GitHub installation token into the sandbox installation stage.
  const directory=await sbx.runCommand({cmd:'mkdir',args:['-p',ROOT]});
  if(directory.exitCode!==0) throw gatewayError('Unable to initialize Codex directory.',503);
  const sources=await Promise.all(FILES.map(async file=>({
    path:ROOT+'/'+file,
    content:Buffer.from(await readFile(new URL('../codex-runner/'+file,import.meta.url)))
  })));
  await sbx.writeFiles(sources);
  const result=await sbx.runCommand({
    cmd:'npm',args:['install','--no-audit','--no-fund','--omit=dev'],
    cwd:ROOT
  });
  if(result.exitCode!==0) throw gatewayError('Codex runner dependencies could not be installed.',503);
}
async function launchRuntime(sbx,tenant) {
  await sbx.runCommand({
    cmd:'node',args:['server.mjs'],cwd:ROOT,detached:true,
    env:{
      CODEX_RUNNER_SHARED_SECRET:tenant.secret,
      RUNNER_ALLOWED_GITHUB_LOGIN:tenant.login,
      RUNNER_CODEX_AUTH_HOME:AUTH_HOME,
      PORT:String(PORT),
      RUNNER_LISTEN_HOST:'0.0.0.0',
      NODE_ENV:'production'
    }
  });
}
async function locateSandbox(tenant,create) {
  if(!create){
    try{
      await Sandbox.get({name:tenant.name,resume:false});
    }catch(error){
      if(isMissing(error)) return null;
      throw gatewayError('Unable to check your Codex workspace.',503);
    }
  }
  return Sandbox.getOrCreate({
    name:tenant.name,runtime:'node24',ports:[PORT],persistent:true,
    timeout:600000,
    onCreate:installRuntime,
    onResume:sbx=>launchRuntime(sbx,tenant)
  });
}
function signedPayload(payload,tenant) {
  const body=JSON.stringify({...payload,issuedAt:Date.now(),nonce:crypto.randomUUID()});
  const mac=createHmac('sha256',tenant.secret).update(body).digest('hex');
  return {body,mac};
}
async function requestRunner(sbx,tenant,payload,timeoutMs) {
  const url=new URL(sbx.domain(PORT));
  if(url.protocol!=='https:') throw gatewayError('Sandbox runner URL is not HTTPS.',503);
  const signed=signedPayload(payload,tenant);
  let response;
  try {
    response=await fetch(url.origin+'/rpc',{
      method:'POST',redirect:'error',
      headers:{'Content-Type':'application/json','X-JD-Signature':signed.mac},
      body:signed.body,signal:AbortSignal.timeout(Math.min(120000,Math.max(2000,timeoutMs)))
    });
  }catch(_){throw gatewayError('Your Codex workspace is still starting or unavailable.',503);}
  const body=await response.text();
  if(body.length>240000) throw gatewayError('Codex output exceeded the response limit.');
  let data;
  try{data=JSON.parse(body);}catch(_){throw gatewayError('Codex workspace returned invalid JSON.');}
  if(!response.ok) throw gatewayError(
    response.status===401?'Your ChatGPT Codex account needs authorization.':
    String(data?.error||'Codex workspace request failed.').slice(0,400),
    response.status>=400&&response.status<500?response.status:502
  );
  return data;
}
export async function sandboxRpc(payload,actor,timeoutMs=20000) {
  const cfg=settings();
  if(!cfg.enabled) throw gatewayError(cfg.reason,503);
  const tenant=tenantIdentity(actor,cfg.secret);
  if(!cfg.allowlist.has(String(actor.id))) throw gatewayError('Your account is not enrolled in the Codex workspace beta.',403);
  const create=payload.action==='account-connect';
  const sbx=await locateSandbox(tenant,create);
  if(!sbx){
    if(payload.action==='account-status')return {
      available:true,runnerReady:true,connected:false,codexEnabled:false,
      authMode:null,planType:null
    };
    throw gatewayError('Connect your own ChatGPT account to initialize your workspace.',401);
  }
  return requestRunner(sbx,tenant,payload,timeoutMs);
}
export async function sandboxAccountStatus(actor) {
  const cfg=settings();
  if(!cfg.enabled || !cfg.allowlist.has(String(actor?.id)))
    return {available:false,connected:false,codexEnabled:false,runnerReady:false};
  return sandboxRpc({action:'account-status',actor},actor,12000);
}
