import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

const safe = (value, n=220) => String(value ?? '').slice(0,n);

export class CodexAccountBridge {
  constructor({home, cli=process.env.CODEX_BIN || join(process.cwd(),'node_modules','.bin','codex'),
    start=spawn, timeout=15000}={}) {
    if (!home) throw new Error('A dedicated, persistent Codex home is required.');
    this.home=home;this.cli=cli;this.start=start;this.timeout=timeout;
    this.child=null;this.pending=new Map();this.sequence=0;this.login=null;this.ready=null;
    this.loginOutcome=null;
  }
  send(message) {
    if (!this.child || !this.child.stdin.writable) throw new Error('Codex app-server is unavailable.');
    this.child.stdin.write(JSON.stringify(message)+'\n');
  }
  async request(method,params,timeout=this.timeout) {
    const id=++this.sequence;
    return await new Promise((resolve,reject)=>{
      const timeoutId=setTimeout(()=>{this.pending.delete(id);reject(new Error(method+' timed out.'));},timeout);
      this.pending.set(id,{resolve,reject,timeoutId});
      try{this.send({id,method,...(params===undefined?{}:{params})});}
      catch(e){clearTimeout(timeoutId);this.pending.delete(id);reject(e);}
    });
  }
  consume(line) {
    if(line.length>200000) {this.close();return;}
    let packet;
    try{packet=JSON.parse(line);}catch(_){return;}
    if(packet.id!==undefined){
      const entry=this.pending.get(packet.id);
      if(!entry)return;
      this.pending.delete(packet.id);clearTimeout(entry.timeoutId);
      if(packet.error)entry.reject(new Error(safe(packet.error.message || 'Codex protocol error.')));
      else entry.resolve(packet.result);
      return;
    }
    if(packet.method==='account/login/completed' && this.login &&
        packet.params?.loginId===this.login.loginId) {
      this.loginOutcome=packet.params.success===true?'completed':'failed';
    }
  }
  async initialize(){
    if(this.ready) return this.ready;
    this.ready=(async()=>{
      const child=this.start(this.cli,['app-server'],{
        cwd:this.home,
        env:{PATH:process.env.PATH||'/usr/local/bin:/usr/bin:/bin',
          HOME:this.home,CODEX_HOME:join(this.home,'.codex'),
          LANG:'C.UTF-8',TMPDIR:process.env.TMPDIR||'/tmp'},
        stdio:['pipe','pipe','ignore']
      });
      this.child=child;
      child.on('error',()=>this.close());
      child.on('exit',()=>this.close());
      const lines=createInterface({input:child.stdout,crlfDelay:Infinity});
      lines.on('line',line=>this.consume(line));
      await this.request('initialize',{clientInfo:{
        name:'jepongdevxyz_ai',title:'JepongDevxyz AI Codex Workspace',version:'0.1.0'
      }});
      this.send({method:'initialized'});
      return true;
    })().catch(e=>{this.close();throw e;});
    return this.ready;
  }
  close(){
    const child=this.child;this.child=null;this.ready=null;
    if(child && child.exitCode===null) child.kill('SIGTERM');
    for(const entry of this.pending.values()){
      clearTimeout(entry.timeoutId);entry.reject(new Error('Codex app-server disconnected.'));
    }
    this.pending.clear();
  }
  async account(){
    await this.initialize();
    const response=await this.request('account/read',{refreshToken:false});
    const account=response?.account;
    // A session from the site's API key is not a subscriber's ChatGPT login.
    const connected=account?.type==='chatgpt';
    return {
      connected,
      authMode:connected?'chatgpt':null,
      planType:connected ? safe(account.planType||'',40) : null,
      codexEnabled:connected
    };
  }
  async connect(){
    const current=await this.account();
    if(current.connected) return {connected:true,...current};
    if(this.login && this.loginOutcome!=='failed')
      return {connected:false,...this.login};
    const response=await this.request('account/login/start',{type:'chatgptDeviceCode'});
    if(response?.type!=='chatgptDeviceCode' ||
       typeof response.verificationUrl!=='string' ||
       !/^https:\/\/auth\.openai\.com\/codex\/device\/?(?:\?.*)?$/i.test(response.verificationUrl) ||
       !/^[A-Z0-9-]{4,32}$/i.test(String(response.userCode||'')) ||
       typeof response.loginId!=='string') {
       throw new Error('Unsupported Codex device-code login response.');
    }
    this.login={loginId:safe(response.loginId,120),
      verificationUrl:response.verificationUrl,userCode:response.userCode};
    this.loginOutcome='pending';
    return {connected:false,verificationUrl:this.login.verificationUrl,userCode:this.login.userCode};
  }
  async disconnect(){
    await this.initialize();
    if(this.login){
      try{await this.request('account/login/cancel',{loginId:this.login.loginId},4000);}
      catch(_){}
    }
    await this.request('account/logout');
    this.login=null;this.loginOutcome=null;
    return {connected:false,authMode:null,codexEnabled:false};
  }
}
