const AIHORDE_STATUS_URL='https://aihorde.net/api/v2/status/models?type=text';
const AIHORDE_CHAT_URL='https://oai.aihorde.net/v1/chat/completions';
const AIHORDE_ANONYMOUS_KEY='0000000000';
const CLIENT_AGENT='JepongDevxyz-AI:1.0:https://github.com/JepongDevxyz/JepongDevxyz-AI';
const BLOCKED=[/nsfw/i,/hentai/i,/porn/i,/erotic/i,/sexual/i,/\bsex\b/i,/\badult\b/i,/\berp\b/i,/explicit/i,/fetish/i];

function allowed(name=''){
  const value=String(name||'').trim();
  return Boolean(value)&&!BLOCKED.some(rx=>rx.test(value));
}

function sizeHint(name=''){
  const hits=[...String(name).matchAll(/(?:^|[^0-9])(\d{1,3})\s*[bB](?:\b|[^a-z])/g)]
    .map(m=>Number(m[1])).filter(Number.isFinite);
  return hits.length?Math.max(...hits):0;
}

function score(item,prompt='',sourceModel=''){
  const name=String(item?.name||'');
  const text=`${String(prompt||'').toLowerCase()} ${String(sourceModel||'').toLowerCase()}`;
  const coding=/\b(code|coding|debug|javascript|html|css|python|node|api|typescript|php|java|react|sql|github|vercel|backend|frontend)\b/i.test(text);
  const reasoning=/\b(reason|reasoning|logic|strategy|plan|complex|architecture|analysis|research|compare|math)\b/i.test(text);
  const size=sizeHint(name);
  let points=(Number(item?.count??item?.workers??0)||0)*25 + Math.min(Number(item?.performance)||0,250)*0.4;
  points-=Math.min(Number(item?.eta)||0,1800)*0.05;
  points-=Math.min(Number(item?.queued)||0,500000)/25000;
  if(coding&&/(qwen|coder|code|deepseek|nemotron|llama)/i.test(name))points+=80;
  if(reasoning&&/(qwen|gemma|nemotron|llama|anubis|behemoth)/i.test(name))points+=55;
  if(size>=70)points+=reasoning?75:30;
  else if(size>=24)points+=45;
  else if(size>=7)points+=20;
  else if(size>0)points+=4;
  return points;
}

async function activeModels(signal){
  const res=await fetch(AIHORDE_STATUS_URL,{signal,headers:{Accept:'application/json','Client-Agent':CLIENT_AGENT}});
  if(!res.ok)throw new Error(`AI Horde model status returned HTTP ${res.status}`);
  const data=await res.json();
  if(!Array.isArray(data))throw new Error('Unexpected AI Horde model status response');
  return data.filter(x=>x&&allowed(x.name));
}

export async function chooseAIHordeModel({requested='auto',prompt='',signal}={}){
  const models=await activeModels(signal);
  if(!models.length)return null;
  if(requested&&requested!=='auto'){
    const exact=models.find(x=>x.name===requested);
    if(exact)return exact.name;
  }
  return [...models].sort((a,b)=>score(b,prompt,requested)-score(a,prompt,requested))[0]?.name||null;
}

export async function runAIHordeRequest({
  keys=[],anonymous=false,requested='auto',prompt='',messages=[],maxTokens=1024,temperature=0.4,timeoutMs
}={}){
  const credentialList=anonymous?[AIHORDE_ANONYMOUS_KEY]:[...new Set((keys||[]).map(String).map(x=>x.trim()).filter(Boolean))];
  if(!credentialList.length)return {ok:false,status:500,error:'AI Horde API key is not configured.'};

  let model;
  try{
    model=await chooseAIHordeModel({requested,prompt,signal:AbortSignal.timeout(12000)});
  }catch(error){
    return {ok:false,status:503,error:error?.message||'AI Horde model list is unavailable.'};
  }
  if(!model)return {ok:false,status:503,error:'No suitable AI Horde text model is currently active.'};

  let status=503,last='';
  for(let i=0;i<credentialList.length;i++){
    try{
      const res=await fetch(AIHORDE_CHAT_URL,{
        method:'POST',
        headers:{Authorization:`Bearer ${credentialList[i]}`,'Content-Type':'application/json','Client-Agent':CLIENT_AGENT},
        body:JSON.stringify({model,messages,stream:false,max_tokens:Math.max(64,Math.min(Number(maxTokens)||1024,anonymous?1024:4096)),temperature}),
        signal:AbortSignal.timeout(timeoutMs|| (anonymous?55000:70000))
      });
      status=res.status;
      const raw=await res.text();
      let data={};
      try{data=JSON.parse(raw);}catch(_){data={raw};}
      const text=data?.choices?.[0]?.message?.content??data?.choices?.[0]?.text??'';
      if(res.ok&&typeof text==='string'&&text.trim()){
        return {ok:true,status:res.status,text:text.trim(),model:data?.model||model,keyIndex:i,keyCount:credentialList.length};
      }
      last=data?.error?.message||data?.message||raw||`AI Horde HTTP ${status}`;
      if(![401,402,403,408,409,425,429,500,502,503,504].includes(status))break;
    }catch(error){
      status=503;
      last=error?.message||String(error);
    }
  }
  return {ok:false,status,error:last||'AI Horde unavailable',model,keyCount:credentialList.length};
}

export const AIHORDE_PUBLIC_KEY=AIHORDE_ANONYMOUS_KEY;
