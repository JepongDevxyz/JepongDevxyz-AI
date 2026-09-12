from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAT = (ROOT / 'api' / 'chat.js').read_text(encoding='utf-8')
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    # AI Horde must be a first-class configured provider using the user's Vercel key(s).
    require("aihorde: {" in CHAT, 'AI Horde provider registry entry missing')
    require("AIHORDE_API_KEYS','AIHORDE_API_KEY" in CHAT, 'AI Horde env key rotation missing')
    require("https://oai.aihorde.net/v1/chat/completions" in CHAT, 'AI Horde OpenAI-compatible endpoint missing')
    require("async function runAIHorde" in CHAT, 'AI Horde provider runner missing')
    require("provider==='aihorde'" in CHAT, 'AI Horde is not wired into runProvider')

    # Anonymous Horde is emergency-only and must not be treated as a configured credential.
    require("const AIHORDE_ANONYMOUS_KEY='0000000000'" in CHAT, 'AI Horde anonymous key constant missing')
    require("async function runAnonymousAIHordeFallback" in CHAT, 'anonymous AI Horde fallback helper missing')
    require("if(autoFallback&&fallbackable)" in CHAT, 'Auto Provider Fallback gate missing')
    gate = CHAT.index("if(autoFallback&&fallbackable)")
    anon_call = CHAT.index("runAnonymousAIHordeFallback", gate)
    return_stmt = CHAT.index("return {ok:false", gate)
    require(gate < anon_call < return_stmt, 'anonymous AI Horde fallback is not gated by Auto Provider Fallback')

    # Public fallback should be observable and preserve provider metadata.
    require("AI Horde Anonymous" in CHAT, 'anonymous fallback provider label missing')
    require("fallback-public" in CHAT, 'public fallback route reason missing')

    # Frontend must expose the user's AI Horde provider and keep routing toggle semantics.
    require("'aihorde'" in INDEX, 'AI Horde provider is missing from frontend provider order/config')
    require("AI Horde" in INDEX, 'AI Horde provider label/page missing')
    require("AI Horde Auto" in INDEX, 'AI Horde auto model option missing')
    require("autoFallback: autoProviderFallback" in INDEX, 'frontend no longer sends Auto Provider Fallback state')

    # Puter is a keyless browser-side last resort, but only when Auto Provider Fallback is ON.
    require('https://js.puter.com/v2/' in INDEX, 'Puter.js loader missing')
    require('async function tryPuterPublicFallback' in INDEX, 'Puter public fallback helper missing')
    require('if(!autoProviderFallback)' in INDEX, 'Puter helper is not explicitly gated by Auto Provider Fallback')
    require('Puter fallback' in INDEX, 'Puter fallback activity/status copy missing')
    require("if(!autoProviderFallback) finishAIIndicator(false);" in INDEX,
            'SSE error handler finalizes the activity card before Puter fallback can run')

    # The 8-provider model picker must keep its swipe geometry in sync.
    require('width: 800%' in INDEX, 'model picker track is not sized for 8 provider pages')
    require('width: calc(100% / 8)' in INDEX, 'model picker page width is not sized for 8 providers')

    # Anonymous Horde should use the failed model name as a class/size hint.
    require("scoreAIHordeModel(item,message='',sourceModel='')" in CHAT,
            'AI Horde fallback scoring does not consider the failed model')
    require("model,history,files,message,systemInstruction" in CHAT[CHAT.index('runAnonymousAIHordeFallback'):],
            'anonymous fallback is not given the failed model as a hint')

    # Puter model IDs are pinned to currently documented routes.
    for token in (
        'google/gemini-3.8-flash',
        'mistralai/mistral-large-2512',
        'cohere/command-r-plus-08-2024',
        'qwen/qwen3.8-flash',
        'openai/gpt-5.4-nano',
    ):
        require(token in INDEX, f'documented Puter fallback model missing: {token}')

    # Routing UI contract from the user's screenshot must remain unchanged.
    require('OFF = test only the selected model. ON = allow model/provider fallback.' in INDEX,
            'Auto Provider Fallback UI semantics changed')

    print('public fallback contract checks passed')


if __name__ == '__main__':
    main()
