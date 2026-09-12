from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')
CHAT = (ROOT / 'api' / 'chat.js').read_text(encoding='utf-8')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    require("span.innerHTML = node.nodeValue.replace" not in INDEX,
            'in-chat search still converts text-node content back into HTML')
    require("document.createElement('mark')" in INDEX,
            'in-chat search does not build highlight marks with DOM nodes')
    require("document.createTextNode" in INDEX,
            'in-chat search does not preserve unmatched text as text nodes')

    require('function isFallbackableProviderFailure' in CHAT,
            'model-unavailable fallback classifier missing')
    helper_start = CHAT.index('function isFallbackableProviderFailure')
    helper_block = CHAT[helper_start:helper_start + 1400]
    for status in ('400', '404', '410', '422'):
        require(status in helper_block, f'model-unavailable status {status} is not considered')
    for phrase in ('model', 'not found', 'unsupported'):
        require(phrase in helper_block.lower(), f'model-unavailable classifier missing phrase: {phrase}')
    require('const fallbackable=isFallbackableProviderFailure(first.status,first.error);' in CHAT,
            'cross-provider fallback does not use the model-unavailable classifier')

    print('resilience regression checks passed')


if __name__ == '__main__':
    main()
