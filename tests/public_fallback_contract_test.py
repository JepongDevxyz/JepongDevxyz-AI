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

    # Puter fallback was intentionally removed. It must not load or execute.
    require('https://js.puter.com/v2/' not in INDEX, 'Puter.js loader still present')
    require('Trying Puter fallback' not in INDEX, 'Puter fallback activity/status copy still present')
    require('Puter · fallback' not in INDEX, 'Puter runtime fallback badge still present')
    require('function puterFallbackModel' not in INDEX, 'Puter model routing helper still present')
    require('function puterConversation' not in INDEX, 'Puter conversation helper still present')
    require('function tryPuterPublicFallback' not in INDEX, 'Puter execution fallback still present')

    # The 8-provider model picker must keep its swipe geometry in sync.
    require('width: 800%' in INDEX, 'model picker track is not sized for 8 provider pages')
    require('width: calc(100% / 8)' in INDEX, 'model picker page width is not sized for 8 providers')

    # Anonymous Horde should use the failed model name as a class/size hint.
    require("scoreAIHordeModel(item,message='',sourceModel='')" in CHAT,
            'AI Horde fallback scoring does not consider the failed model')
    require("model,history,files,message,systemInstruction" in CHAT[CHAT.index('runAnonymousAIHordeFallback'):],
            'anonymous fallback is not given the failed model as a hint')

    # Invalid Horde credentials should be eligible for provider fallback when fallback is enabled.
    classifier = CHAT[CHAT.index('function isFallbackableProviderFailure'):CHAT.index('function passthroughHeaders')]
    require('401,402,403' in classifier, 'credential HTTP statuses are not fallbackable')
    require('no user matching sent api key' in classifier, 'AI Horde rejected-key text is not fallbackable')
    require('summarizeAIHordeError' in CHAT, 'AI Horde user-facing error sanitizer missing')

    # Routing UI contract from the user's screenshot must remain unchanged.
    require('OFF = test only the selected model. ON = allow model/provider fallback.' in INDEX,
            'Auto Provider Fallback UI semantics changed')

    print('public fallback contract checks passed')


if __name__ == '__main__':
    main()
