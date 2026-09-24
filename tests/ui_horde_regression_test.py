from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
CHAT = (ROOT / 'api' / 'chat.js').read_text(encoding='utf-8')

def req(condition, message):
    if not condition:
        raise AssertionError(message)

def main():
    combined = (INDEX + '\n' + CHAT).lower()
    req('puter' not in combined, 'Puter client/fallback code still exists')

    req('function isAIHordeCredentialFailure' in CHAT, 'AI Horde credential failure classifier missing')
    req('[401,403,406].includes(code)' in CHAT, 'AI Horde 406 credential rejection is not classified')
    # The new Horde handler rotates configured keys inside the provider and
    # keeps its public anonymous route as the final key. The legacy canRetry
    # assignment belonged to a previous implementation and must not be required.
    req("const keys=anonymous?[AIHORDE_ANONYMOUS_KEY]:autoFallback?[...configuredKeys,AIHORDE_ANONYMOUS_KEY]:configuredKeys;" in CHAT,
        'AI Horde anonymous route must be added only when fallback is enabled')
    req("if(!keys.length)return {ok:false,status:503,error:'AI Horde API key is not configured. Anonymous fallback is OFF.'};" in CHAT,
        'AI Horde without configured keys must not silently use anonymous when fallback is OFF')
    req('const credentialFailure=isAIHordeCredentialFailure(status,last);' in CHAT
        and 'const hasNextKey=i<keys.length-1;' in CHAT
        and 'if(credentialFailure && hasNextKey){' in CHAT,
        'AI Horde credential rejection does not rotate to the next Horde route')
    req('if(generationFailure && hasNextKey && !isAnonymousKey){' in CHAT
        and 'if(generationFailure && hasNextModel){' in CHAT,
        'AI Horde generation failure cannot retry another key/model')
    req('last=summarizeAIHordeError(status,data,raw);' in CHAT,
        'AI Horde raw upstream errors are not summarized')
    req('No server fallback provider was available' in CHAT and 'browser may try Puter fallback' not in CHAT,
        'server still tells the browser to use Puter')

    req('function sanitizeUiErrorMessage' in INDEX, 'frontend provider error sanitizer missing')
    req('AI Horde API key was rejected. Check or replace AIHORDE_API_KEY' in INDEX,
        'frontend does not convert the raw AI Horde key error to concise copy')
    # The current activity normalizer hides routine provider plumbing and
    # sanitizes only real warning/error milestones before displaying them.
    req("if(state==='warning'||state==='error')" in INDEX
        and "sanitizeUiErrorMessage(label||'Provider issue')" in INDEX
        and "return null;" in INDEX,
        'provider timeline warning/error sanitation is missing')
    req('-webkit-line-clamp:3' in INDEX and 'overflow-y:auto!important' in INDEX,
        'activity detail can still grow into an oversized mobile block')

    req('Ask anything…' in INDEX and 'function syncComposerPlaceholder' in INDEX,
        'compact mobile composer placeholder missing')
    req('function getLivePetWalkBottom()' in INDEX and 'layerRect.bottom - inputRect.top + 12' in INDEX and 'syncLivePetSafeLane()' in INDEX,
        'pet safe lane is not dynamically anchored above the composer')
    req("document.documentElement.classList.toggle('keyboard-open', keyboardOpen)" in INDEX,
        'keyboard-open viewport state is missing')

    req('.live-pet.sleeping' not in INDEX,
        'legacy sleeping pet state was reintroduced')
    req('live-pet-sleep-eyes' not in INDEX and '--pet-sleep-lid' not in INDEX,
        'legacy sleeping-eye visuals were reintroduced')

    req('speech-mini-player' in INDEX and 'function toggleSpeechMiniPlayback' in INDEX,
        'read-aloud mini player is missing')
    req('function updateSpeakingUI' in INDEX and 'setLivePetSpeaking(true,text)' in INDEX,
        'read-aloud state is not connected to the pet / floating player')
    req('Code block ${idx+1} omitted.' in INDEX,
        'read aloud still reads raw code blocks instead of skipping them cleanly')

    req('ChatGPT-style code card' in INDEX and '.code-block-header{position:sticky' in INDEX,
        'code response card does not have the requested compact sticky toolbar')

    print('UI / AI Horde regression checks passed')

if __name__ == '__main__':
    main()
