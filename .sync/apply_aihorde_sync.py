from pathlib import Path

root=Path.cwd()
chat_path=root/'api'/'chat.js'
index_path=root/'index.html'
chat=chat_path.read_text(encoding='utf-8')
index=index_path.read_text(encoding='utf-8')


def once(text, old, new, label):
    if new in text:
        return text
    if old not in text:
        raise SystemExit(f'{label} anchor not found')
    return text.replace(old,new,1)

chat=once(chat,
    "export const config = { runtime: 'edge' };",
    "import { runAIHordeRequest } from './_aihorde.js';\n\nexport const config = { runtime: 'edge' };",
    'AI Horde import')

chat=once(chat,
"""  cohere: {
    label: 'Cohere',
    models: ['command-a-plus-05-2026','command-a-03-2025','command-a-reasoning-08-2025','command-r7b-12-2024','tiny-aya-global','tiny-aya-water','c4ai-aya-expanse-32b'],
    defaultModel: 'command-a-03-2025'
  }
};

const FALLBACK_ORDER = ['cloudflare','groq','mistral','cohere','openrouter','gemini'];
""",
"""  cohere: {
    label: 'Cohere',
    models: ['command-a-plus-05-2026','command-a-03-2025','command-a-reasoning-08-2025','command-r7b-12-2024','tiny-aya-global','tiny-aya-water','c4ai-aya-expanse-32b'],
    defaultModel: 'command-a-03-2025'
  },
  aihorde: {
    label: 'AI Horde',
    models: ['auto'],
    defaultModel: 'auto'
  }
};

const FALLBACK_ORDER = ['cloudflare','groq','mistral','cohere','openrouter','gemini','aihorde'];
""",
    'provider registry')

chat=once(chat,
"""  if (provider === 'cohere') return parseKeys('COHERE_API_KEYS','COHERE_API_KEY');
  return [];
}""",
"""  if (provider === 'cohere') return parseKeys('COHERE_API_KEYS','COHERE_API_KEY');
  if (provider === 'aihorde') return parseKeys('AIHORDE_API_KEYS','AIHORDE_API_KEY');
  return [];
}""",
    'AI Horde env keys')

chat=once(chat,
"""function providerLabel(provider) {
  return PROVIDERS[provider]?.label || provider;
}""",
"""function providerLabel(provider) {
  if(provider==='aihorde-public') return 'AI Horde Anonymous';
  return PROVIDERS[provider]?.label || provider;
}""",
    'provider label')

adapter=r'''async function runAIHorde({model,history,files,message,systemInstruction,fallbackFrom='',routedReason='',emit},{anonymous=false}={}) {
  const runtimeProvider=anonymous?'aihorde-public':'aihorde';
  const keys=anonymous?[]:shuffle(getProviderKeys('aihorde'));
  if(!anonymous&&!keys.length)return {ok:false,status:500,error:'AI Horde API key is not configured.'};
  const hasImage=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/')&&f?.data);
  if(hasImage)return {ok:false,status:415,error:'AI Horde text route does not directly process image attachments.'};

  const requested=model||'auto';
  activity(emit,`${runtimeProvider}-connect`,`Connecting to ${providerLabel(runtimeProvider)}${requested!=='auto'?` • ${modelLabel(requested)}`:''}`,'running','provider');
  const result=await runAIHordeRequest({
    keys,
    anonymous,
    requested,
    prompt:message,
    messages:buildOpenAIMessages(history,message,systemInstruction),
    maxTokens:outputBudgetFor(message),
    temperature:temperatureFor(message,files),
    timeoutMs:anonymous?55000:70000
  });

  if(!result.ok){
    activity(emit,`${runtimeProvider}-connect`,`${providerLabel(runtimeProvider)} unavailable`,'error','provider',String(result.error||'').slice(0,180));
    return {ok:false,status:result.status||503,error:result.error||`${providerLabel(runtimeProvider)} unavailable`};
  }

  activity(emit,`${runtimeProvider}-connect`,`${providerLabel(runtimeProvider)} connected • ${modelLabel(result.model)}`,'completed','provider');
  const headers=new Headers({
    'Content-Type':'text/plain; charset=utf-8',
    'x-ai-provider':runtimeProvider,
    'x-ai-model':String(result.model||requested),
    'x-ai-key-index':String(result.keyIndex??0),
    'x-ai-key-count':String(result.keyCount??(anonymous?1:keys.length))
  });
  if(fallbackFrom)headers.set('x-ai-fallback-from',fallbackFrom);
  if(routedReason)headers.set('x-ai-route-reason',routedReason);
  return {ok:true,response:new Response(result.text,{headers}),finishState:{reason:'stop'}};
}

'''
run_provider_anchor="async function runProvider(provider,args){\n"
if 'async function runAIHorde(' not in chat:
    if run_provider_anchor not in chat: raise SystemExit('runProvider anchor missing')
    chat=chat.replace(run_provider_anchor,adapter+run_provider_anchor,1)

chat=once(chat,
"""async function runProvider(provider,args){
  if(provider==='gemini')return runGemini(args);
  if(provider==='cloudflare')return runCloudflare(args);
  if(provider==='cohere')return runCohere(args);
  if(['groq','openrouter','mistral'].includes(provider))return runOpenAICompatible(provider,args);
  return {ok:false,status:400,error:'Unknown provider'};
}""",
"""async function runProvider(provider,args){
  if(provider==='gemini')return runGemini(args);
  if(provider==='cloudflare')return runCloudflare(args);
  if(provider==='cohere')return runCohere(args);
  if(provider==='aihorde')return runAIHorde(args);
  if(['groq','openrouter','mistral'].includes(provider))return runOpenAICompatible(provider,args);
  return {ok:false,status:400,error:'Unknown provider'};
}""",
    'runProvider AI Horde wiring')

chat=once(chat,
"""    }
    activity(emit,'fallback','No fallback provider was available','error','fallback');
  }

  return {ok:false,status:first.status||500,error:first.error||'AI provider unavailable.',provider,startedAt};
}""",
"""    }

    const hasImageForPublicFallback=Array.isArray(files)&&files.some(f=>f?.mimeType?.startsWith('image/'));
    if(!hasImageForPublicFallback){
      activity(emit,'fallback','Configured providers exhausted — trying free public AI Horde','running','fallback');
      const publicHorde=await runAIHorde({
        model,history,files,message,systemInstruction,fallbackFrom:provider,
        routedReason:'fallback-public',emit,autoFallback:false
      },{anonymous:true});
      if(publicHorde.ok){
        activity(emit,'fallback','Free public fallback connected to AI Horde Anonymous','completed','fallback');
        activity(emit,'generation','Generating response','running','generate');
        return {
          ok:true,
          response:publicHorde.response,
          finishState:publicHorde.finishState||{reason:'stop'},
          startedAt,
          resolvedProvider:publicHorde.response.headers.get('x-ai-provider')||'aihorde-public',
          resolvedModel:publicHorde.response.headers.get('x-ai-model')||'auto',
          systemInstruction
        };
      }
    }
    activity(emit,'fallback','No server fallback provider was available — browser may try Puter fallback','error','fallback');
  }

  return {ok:false,status:first.status||500,error:first.error||'AI provider unavailable.',provider,startedAt};
}""",
    'anonymous fallback gate')

puter_scripts='    <script src="https://js.puter.com/v2/"></script>\n    <script src="assets/puter-fallback.js"></script>\n'
if 'assets/puter-fallback.js' not in index:
    if '</head>' not in index: raise SystemExit('head close missing')
    index=index.replace('</head>',puter_scripts+'</head>',1)

index=once(index,
    '.model-pages-track { display: flex; width: 700%;',
    '.model-pages-track { display: flex; width: 800%;',
    'model track width')
index=once(index,
    '.model-provider-page { width: calc(100% / 7); flex: 0 0 calc(100% / 7);',
    '.model-provider-page { width: calc(100% / 8); flex: 0 0 calc(100% / 8);',
    'model page width')
index=once(index,
    "['gemini','cloudflare','groq','openrouter','mistral','cohere','image'].indexOf(currentSelectedProvider)",
    "['gemini','cloudflare','groq','openrouter','mistral','cohere','aihorde','image'].indexOf(currentSelectedProvider)",
    'provider selected index')
index=once(index,
    "const PROVIDER_ORDER = ['gemini','cloudflare','groq','openrouter','mistral','cohere','image'];",
    "const PROVIDER_ORDER = ['gemini','cloudflare','groq','openrouter','mistral','cohere','aihorde','image'];",
    'provider order')
index=once(index,
    "const PROVIDER_LABELS = {gemini:'Gemini',cloudflare:'Cloudflare',groq:'Groq',openrouter:'OpenRouter',mistral:'Mistral',cohere:'Cohere',image:'Image'};",
    "const PROVIDER_LABELS = {gemini:'Gemini',cloudflare:'Cloudflare',groq:'Groq',openrouter:'OpenRouter',mistral:'Mistral',cohere:'Cohere',aihorde:'AI Horde','aihorde-public':'AI Horde Anonymous',puter:'Puter',image:'Image'};",
    'provider labels')
index=once(index,
    'track.style.transform=`translateX(-${currentProviderPage*(100/7)}%)`',
    'track.style.transform=`translateX(-${currentProviderPage*(100/8)}%)`',
    'provider page transform')

image_page='<section class="model-provider-page" data-provider="image">'
ai_page='<section class="model-provider-page" data-provider="aihorde"><div class="provider-badge"><span class="provider-badge-dot"></span> AI Horde · your API key</div><button class="option-item" data-provider="aihorde" data-model="auto" onclick="selectProviderModel(\'aihorde\',\'auto\',\'AI Horde Auto\')"><div class="option-info"><div><div class="option-name">AI Horde Auto</div><div class="option-desc">Uses AIHORDE_API_KEY · dynamically selects an active text model</div></div></div><div class="radio-icon"></div></button></section>'
if 'data-provider="aihorde"' not in index:
    if image_page not in index: raise SystemExit('image provider page anchor missing')
    index=index.replace(image_page,ai_page+image_page,1)

old_dot='<button class="model-page-dot" type="button" onclick="setProviderPage(6)" aria-label="Image"></button>'
new_dots='<button class="model-page-dot" type="button" onclick="setProviderPage(6)" aria-label="AI Horde"></button><button class="model-page-dot" type="button" onclick="setProviderPage(7)" aria-label="Image"></button>'
if 'aria-label="AI Horde"' not in index:
    if old_dot not in index: raise SystemExit('image dot anchor missing')
    index=index.replace(old_dot,new_dots,1)

index=once(index,
"""                            finishAIIndicator(false);
                            throw new Error(payload.message || 'AI provider unavailable');""",
"""                            if(!autoProviderFallback) finishAIIndicator(false);
                            throw new Error(payload.message || 'AI provider unavailable');""",
    'SSE fallback handoff')

old_catch="""                }else{
                    appendActivityEvent({ id:'client-catch', label:err.message || 'Request failed', state:'error', kind:'provider' });
                    finishAIIndicator(false);
                    botMsgElem.innerHTML = `<span style=\"color: #ef4444;\">⚠️ Error: ${escapeHTML(err.message)}</span>`;
                }
                scrollToBottom(true);
"""
new_catch="""                }else{
                    let publicFallback=null;
                    const hasImageFallback=Array.isArray(currentFiles)&&currentFiles.some(f=>String(f?.type||f?.mimeType||'').startsWith('image/'));
                    if(autoProviderFallback&&!hasImageFallback&&window.JepongPuterFallback?.run){
                        appendActivityEvent({id:'puter-fallback',label:'Trying Puter public fallback',state:'running',kind:'fallback'});
                        try{
                            publicFallback=await window.JepongPuterFallback.run({
                                provider:currentSelectedProvider,model:currentSelectedModel,prompt:promptText,history:continuousChatHistory,
                                onToken:(text)=>{botMsgElem.innerHTML=`<div>${renderCustomMarkdown(text)}</div>`;if(!userIsScrollingUp)scrollToBottom(false);}
                            });
                        }catch(puterError){
                            appendActivityEvent({id:'puter-fallback',label:'Puter fallback unavailable',state:'warning',kind:'fallback',detail:String(puterError?.message||puterError||'').slice(0,160)});
                        }
                    }
                    if(publicFallback?.ok){
                        appendActivityEvent({id:'puter-fallback',label:`Puter fallback connected • ${publicFallback.model}`,state:'completed',kind:'fallback'});
                        finishAIIndicator(true);
                        const runtimeBadge=document.getElementById('providerRuntimeBadge');
                        if(runtimeBadge){runtimeBadge.className='provider-runtime-badge ok';runtimeBadge.textContent=`Puter · fallback · ${publicFallback.model}`;}
                        if(ctx.id&&ctx.sessions[ctx.id]){
                            const savedBotIndex=ctx.sessions[ctx.id].messages.length;
                            ctx.sessions[ctx.id].messages.push({role:'bot',text:publicFallback.text});
                            botMsgElem.setAttribute('data-message-index',String(savedBotIndex));
                            if(!isIncognito&&!isBibleMode){saveSessions();maybeGenerateAITitle(ctx.sessions[ctx.id],promptText,publicFallback.text);}
                        }
                        incrementCounters(promptText+' '+publicFallback.text);
                        if(isResponseSpeechEnabled)speakRawText(publicFallback.text);
                    }else{
                        appendActivityEvent({ id:'client-catch', label:err.message || 'Request failed', state:'error', kind:'provider' });
                        finishAIIndicator(false);
                        botMsgElem.innerHTML = `<span style=\"color: #ef4444;\">⚠️ Error: ${escapeHTML(err.message)}</span>`;
                    }
                }
                scrollToBottom(true);
"""
if 'window.JepongPuterFallback?.run' not in index:
    if old_catch not in index: raise SystemExit('executeAICall catch anchor missing')
    index=index.replace(old_catch,new_catch,1)

chat_path.write_text(chat,encoding='utf-8')
index_path.write_text(index,encoding='utf-8')
print('AI Horde + public fallback patch applied')
