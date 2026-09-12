from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = (ROOT / 'index.html').read_text(encoding='utf-8')


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def main():
    # Bottom drawer: only history list scrolls; footer/header stay pinned.
    require('height: min(75dvh, calc(var(--jepong-vh, 100dvh) - 10px))' in INDEX,
            'bottom drawer is not clamped to the visual viewport')
    require('.chat-history-list { flex: 1 1 auto; min-height: 0; overflow-y: auto;' in INDEX,
            'chat history is not the dedicated scroll container')
    require('#sidebar-footer-settings {' in INDEX and 'flex-shrink:0;' in INDEX,
            'sidebar footer is not pinned')

    # Composer: grow until max height, then scroll internally.
    require('const maxHeight = 120;' in INDEX,
            'composer auto-resize max height logic missing')
    require("textarea.style.overflowY = shouldScroll ? 'auto' : 'hidden';" in INDEX,
            'composer does not switch to internal scrolling only when needed')

    # Chrome Android visual viewport must never translate the whole app by offsetTop.
    require("app.style.transform = '';" in INDEX,
            'app is still allowed to translate with visualViewport offsetTop')
    require('translateY(${offsetTop}px)' not in INDEX,
            'visualViewport offsetTop still shifts the whole app')

    # Word counter refreshes from saved chat content and when opening the drawer.
    require('const savedWords=countSavedChatWords();' in INDEX,
            'word counter does not derive a saved-chat value')
    require('const sidebarWords=Math.max(words,savedWords);' in INDEX,
            'word counter does not use recovered saved-chat words')
    require('renderSidebarHistory();\n            updateUsageUI();' in INDEX,
            'opening chat history does not refresh the word count')

    # Built-in image pets already have eyes in the art; hide duplicate floating sleepy eyes.
    guard = '.live-pet-visual img + .live-pet-sleep-eyes{'
    require(guard in INDEX, 'image-pet duplicate eye overlay guard missing')
    block = INDEX[INDEX.index(guard):INDEX.index(guard) + 180]
    require('display:none!important;' in block,
            'image-pet eye overlay is not hidden')

    print('mobile UI contract checks passed')


if __name__ == '__main__':
    main()
