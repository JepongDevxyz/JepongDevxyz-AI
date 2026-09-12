from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
INDEX=(ROOT/'index.html').read_text(encoding='utf-8')
def req(c,m):
    if not c: raise AssertionError(m)
def main():
    req('sandbox="allow-scripts allow-modals allow-forms"' in INDEX,'runner sandbox permissions changed')
    req('allow-same-origin' not in INDEX,'runner still has same-origin access')
    req('function buildRunnableSnippetDocument' in INDEX,'runner document builder missing')
    req('function executeSnippetFromButton' in INDEX,'DOM based runner missing')
    req("new RegExp('</'+'script', 'gi')" in INDEX,'script close guard missing')
    req("new RegExp('</'+'style', 'gi')" in INDEX,'style close guard missing')
    req('Content-Security-Policy' in INDEX and "connect-src 'none'" in INDEX,'runner CSP/network isolation missing')
    req('window.executableSnippets.push' not in INDEX,'streaming render still grows global snippet registry')
    start=INDEX.index('function buildRunnableSnippetDocument')
    end=INDEX.index('function closeCodeRunner()',start)
    block=INDEX[start:end]
    req(len(block)<8000,f'runner implementation unexpectedly bloated: {len(block)} chars')
    req('#personalizationPetPage' not in block,'unrelated pet CSS leaked into runner')
    print('code runner regression checks passed')
if __name__=='__main__': main()
