(function(){
  function pick(provider='',model='',prompt=''){
    const p=String(provider||'').toLowerCase();
    const m=String(model||'').toLowerCase();
    const text=String(prompt||'').toLowerCase();
    const coding=/\b(code|coding|debug|javascript|html|css|python|node|api|typescript|php|java|react|sql|github|vercel|backend|frontend)\b/i.test(text);
    if(p==='gemini'||m.includes('gemini'))return 'google/gemini-3.8-flash';
    if(p==='mistral'||m.includes('mistral')||m.includes('codestral'))return 'mistralai/mistral-large-2512';
    if(p==='cohere'||m.includes('command')||m.includes('aya'))return 'cohere/command-r-plus-08-2024';
    if(coding||m.includes('qwen'))return 'qwen/qwen3.8-flash';
    return 'openai/gpt-5.4-nano';
  }

  function conversation(history=[],prompt=''){
    const out=[];
    for(const item of (Array.isArray(history)?history:[]).slice(-20)){
      const role=item?.role==='bot'||item?.role==='model'||item?.role==='assistant'?'assistant':'user';
      const content=String(item?.text||item?.content||'').trim();
      if(content)out.push({role,content});
    }
    if(String(prompt||'').trim())out.push({role:'user',content:String(prompt).trim()});
    return out;
  }

  async function run({provider='',model='',prompt='',history=[],onToken}={}){
    if(!window.puter?.ai?.chat)return null;
    const selected=pick(provider,model,prompt);
    const stream=await window.puter.ai.chat(conversation(history,prompt),false,{model:selected,stream:true});
    let text='';
    for await(const part of stream){
      const chunk=typeof part?.text==='string'?part.text:(typeof part?.message?.content==='string'?part.message.content:'');
      if(!chunk)continue;
      text+=chunk;
      try{onToken?.(text,chunk);}catch(_){}
    }
    return text.trim()?{ok:true,text:text.trim(),provider:'puter',model:selected}:null;
  }

  window.JepongPuterFallback={run,pickModel:pick};
})();
