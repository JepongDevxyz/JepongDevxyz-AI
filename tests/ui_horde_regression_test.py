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
    req('canRetry=(isRetryableStatus(status)||credentialFailure)' in CHAT,
        'AI Horde invalid credential does not rotate to another configured key')
    req('last=summarizeAIHordeError(status,data,raw);' in CHAT,
        'AI Horde raw upstream errors are not summarized')
    req('No server fallback provider was available' in CHAT and 'browser may try Puter fallback' not in CHAT,
        'server still tells the browser to use Puter')

    req('function sanitizeUiErrorMessage' in INDEX, 'frontend provider error sanitizer missing')
    req('AI Horde API key was rejected. Check or replace AIHORDE_API_KEY' in INDEX,
        'frontend does not convert the raw AI Horde key error to concise copy')
    req("else if(state==='error') normalizedLabel=`${providerName} request failed`;" in INDEX,
        'provider timeline error row is not normalized')
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
