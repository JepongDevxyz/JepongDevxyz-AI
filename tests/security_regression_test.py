from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
INDEX=(ROOT/'index.html').read_text(encoding='utf-8')
CHAT=(ROOT/'api'/'chat.js').read_text(encoding='utf-8')

def req(cond,msg):
    if not cond: raise AssertionError(msg)

def main():
    req('function sanitizeRenderedMarkdown' in INDEX, 'markdown sanitizer missing')
    req("el.removeAttribute(attr.name)" in INDEX or 'removeAttribute(name)' in INDEX,
        'sanitizer does not strip unsafe attributes')
    req('marked.parse(' in INDEX and 'sanitizeRenderedMarkdown(tempDiv)' in INDEX,
        'renderCustomMarkdown does not sanitize parsed HTML')

    req('sandbox="allow-scripts allow-modals allow-forms"' in INDEX,
        'code runner sandbox is not isolated')
    req('sandbox="allow-scripts allow-modals allow-same-origin allow-forms"' not in INDEX,
        'code runner still permits same-origin access')

    req("replace(/^\[|\]$/g,'')" in CHAT,
        'URL hostname does not normalize IPv6 brackets')
    req("h==='::1'" in CHAT and "h.startsWith('fe80:')" in CHAT,
        'private IPv6 guards missing')
    req("h.startsWith('::ffff:')" in CHAT,
        'IPv4-mapped IPv6 guard missing')

    print('security regression checks passed')

if __name__=='__main__': main()
