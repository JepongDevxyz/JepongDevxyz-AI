from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAT = (ROOT / 'api' / 'chat.js').read_text(encoding='utf-8')
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    # AI Horde remains a registered emergency provider, never a carousel choice.
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

    # Neither the registered nor anonymous emergency path is user-selectable.
    require('data-provider="aihorde"' not in INDEX and 'aria-label="AI Horde"' not in INDEX,
            'AI Horde still appears in the carousel')
    require('aihordeFourModelChoices' not in INDEX and 'refreshAIHordePickerModels' not in INDEX,
            'Legacy AI Horde model picker remains in frontend')
    require("if(provider==='aihorde')return {ok:false,status:400" in CHAT,
            'Direct AI Horde selection must not be routable')
    require("autoFallback: autoProviderFallback" in INDEX, 'frontend no longer sends emergency fallback state')

    # Puter fallback was intentionally removed. It must not load or execute.
    require('https://js.puter.com/v2/' not in INDEX, 'Puter.js loader still present')
    require('Trying Puter fallback' not in INDEX, 'Puter fallback activity/status copy still present')
    require('Puter · fallback' not in INDEX, 'Puter runtime fallback badge still present')
    require('function puterFallbackModel' not in INDEX, 'Puter model routing helper still present')
    require('function puterConversation' not in INDEX, 'Puter conversation helper still present')
    require('function tryPuterPublicFallback' not in INDEX, 'Puter execution fallback still present')

    # The model picker uses a viewport-width flex carousel. Each provider page is
    # exactly one viewport wide and renderProviderPage advances by one page (100%).
    # This remains correct as PROVIDER_ORDER grows; do not hard-code a provider count.
    require('.model-pages-track { display: flex; width: 100%' in INDEX,
            'model picker track is not using viewport-width flex geometry')
    require('.model-provider-page { width: 100%; flex: 0 0 100%' in INDEX,
            'model picker page is not exactly one viewport wide')
    require('currentProviderPage*100' in INDEX,
            'model picker transform is not synchronized to viewport-width pages')

    # Only after primary quota/key exhaustion, call registered Horde before anonymous.
    gate = CHAT.index("if(autoFallback&&fallbackable)")
    registered = CHAT.index("const registeredHorde=await runAIHorde(",gate)
    anonymous = CHAT.index("const publicHorde=await runAnonymousAIHordeFallback(",registered)
    require(gate < registered < anonymous, 'Two emergency routes have the wrong order')
    require("model:'auto',history,files,message,systemInstruction" in CHAT[registered:anonymous],
            'registered Horde fallback should choose a live model internally')

    # Exhausted quota or rejected credentials can reach emergency fallback, but
    # unrelated HTTP 500 and malformed requests cannot switch the model.
    classifier = CHAT[CHAT.index('function isProviderQuotaFailure'):CHAT.index('function passthroughHeaders')]
    require('401,403' in classifier and '402,429' in classifier,
            'quota and credential HTTP statuses are not covered')
    require('no user matching sent api key' in classifier, 'AI Horde rejected-key text is not fallbackable')
    require('summarizeAIHordeError' in CHAT, 'AI Horde user-facing error sanitizer missing')

    # Every key is attempted within the selected provider even with emergency fallback OFF.
    require('All your configured keys are tried first.' in INDEX,
            'Fallback switch description does not explain same-provider key rotation')
    require("const keys=anonymous?[AIHORDE_ANONYMOUS_KEY]:configuredKeys;" in CHAT,
            'Anonymous route must be a distinct emergency attempt')
    require('smartRouter = autoFallback && body.smartRouter === true;' in CHAT,
            'Smart Router must remain an independent opt-in')

    print('public fallback contract checks passed')


if __name__ == '__main__':
    main()
