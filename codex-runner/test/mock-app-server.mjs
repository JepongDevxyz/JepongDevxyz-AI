import { createInterface } from 'node:readline';

let connected=false;
const respond=(id,result)=>process.stdout.write(JSON.stringify({id,result})+'\n');
const notify=(method,params)=>process.stdout.write(JSON.stringify({method,params})+'\n');
const io=createInterface({input:process.stdin,crlfDelay:Infinity});
io.on('line',line=>{
  let packet;
  try{packet=JSON.parse(line);}catch(_){return;}
  if(packet.id===undefined)return;
  switch(packet.method){
    case 'initialize':respond(packet.id,{serverInfo:{name:'mock'}});break;
    case 'account/read':
      respond(packet.id,{requiresOpenaiAuth:true,account:connected?
        {type:'chatgpt',email:'private@example.test',planType:'plus'}:null});break;
    case 'account/login/start':
      if(packet.params?.type!=='chatgptDeviceCode'){
        process.stdout.write(JSON.stringify({id:packet.id,error:{message:'Unsupported login'}})+'\n');
        return;
      }
      respond(packet.id,{type:'chatgptDeviceCode',loginId:'fixture-login',
        verificationUrl:'https://auth.openai.com/codex/device',userCode:'ABCD-1234'});
      connected=true;
      notify('account/login/completed',{loginId:'fixture-login',success:true});
      break;
    case 'account/login/cancel':respond(packet.id,{status:'cancelled'});break;
    case 'account/logout':connected=false;respond(packet.id,{});break;
    default:process.stdout.write(JSON.stringify({id:packet.id,error:{message:'Unknown request'}})+'\n');
  }
});
