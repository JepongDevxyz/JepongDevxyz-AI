from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')


def sub1(pattern, repl, label, flags=re.S):
    global s
    s2, n = re.subn(pattern, repl, s, count=1, flags=flags)
    if n != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {n}')
    s = s2


sub1(r"(?ms)^\s*\.sidebar \{\s*position: absolute;\s*width: var\(--drawer-width\);\s*max-width: 85vw;\s*height: 100%;\s*top: 0;\s*background: #0f172a;\s*z-index: 901;\s*display: flex;\s*flex-direction: column;\s*padding: 18px 16px;\s*gap: 14px;\s*will-change: transform;\s*transition: transform 0\.3s cubic-bezier\(0\.2, 0, 0, 1\);\s*box-shadow: 0 0 35px rgba\(0,0,0,0\.6\);\s*\}", """
        .sidebar {
            position: absolute;
            width: var(--drawer-width);
            max-width: 85vw;
            height: 100%;
            min-height: 0;
            top: 0;
            background: #0f172a;
            z-index: 901;
            display: flex;
            flex-direction: column;
            padding: 18px 16px max(16px, env(safe-area-inset-bottom));
            gap: 14px;
            overflow: hidden;
            overscroll-behavior: contain;
            will-change: transform;
            transition: transform 0.3s cubic-bezier(0.2, 0, 0, 1);
            box-shadow: 0 0 35px rgba(0,0,0,0.6);
        }""", 'sidebar shell')

sub1(r"(?ms)^\s*\.sidebar\.drawer-bottom \{\s*top: auto; bottom: 0; left: 0; right: 0;\s*width: 100%; max-width: 100vw; height: 75vh;\s*border-top: 1px solid var\(--border-color\);\s*border-top-left-radius: 28px;\s*border-top-right-radius: 28px;\s*border-bottom-left-radius: 0;\s*border-bottom-right-radius: 0;\s*transform: translateY\(100%\);\s*\}", """
        .sidebar.drawer-bottom {
            top: auto; bottom: 0; left: 0; right: 0;
            width: 100%; max-width: 100vw;
            height: min(75dvh, calc(var(--jepong-vh, 100dvh) - 10px));
            max-height: calc(var(--jepong-vh, 100dvh) - 10px);
            border-top: 1px solid var(--border-color);
            border-top-left-radius: 28px;
            border-top-right-radius: 28px;
            border-bottom-left-radius: 0;
            border-bottom-right-radius: 0;
            transform: translateY(100%);
        }""", 'bottom drawer viewport clamp')

sub1(r"body\.theme-light \.search-chat-input \{ background: #e2e8f0; \}\s*\.chat-history-list \{ flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; \}", """body.theme-light .search-chat-input { background: #e2e8f0; }

        .sidebar-header,
        .new-chat-btn,
        .search-bar-wrap { flex-shrink: 0; }

        .chat-history-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 2px; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; }""", 'history scroll container')

sub1(r"(\.hist-action-btn\.pin-btn\.pinned \{ color: #f59e0b; \}\s*)(\.chat-viewport-wrapper \{)", r"""\1#sidebar-footer-settings {
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            flex-shrink:0;
            min-height:52px;
            padding:12px 2px 2px;
            border-top:1px solid var(--border-color);
            background:linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,.96) 24%);
        }
        body.theme-light #sidebar-footer-settings { background:linear-gradient(180deg, rgba(255,255,255,0), rgba(255,255,255,.98) 24%); }
        .sidebar-word-pill {
            display:inline-flex;
            align-items:center;
            gap:7px;
            min-width:0;
            padding:7px 10px;
            border-radius:999px;
            border:1px solid var(--border-color);
            background:rgba(255,255,255,.04);
            color:var(--text-muted);
            font-size:12px;
            white-space:nowrap;
        }
        .sidebar-word-pill b { color:var(--text-main); font-size:12px; }
        body.theme-light .sidebar-word-pill { background:rgba(15,23,42,.04); }

        \2""", 'pinned sidebar footer')

sub1(r"(?ms)(\.chat-input-pill \{.*?display: flex;\s*)align-items: center;", r"\1align-items: flex-end;", 'composer alignment')

sub1(r"(?ms)^\s*\.pill-input \{\s*flex: 1;\s*background: transparent;\s*border: none;\s*color: var\(--text-main\) !important;\s*font-size: 0\.95rem;\s*caret-color: #3b82f6;\s*padding: 6px 4px;\s*min-width: 0;\s*resize: none;\s*height: 28px;\s*max-height: 100px;\s*line-height: 1\.4;\s*overflow-y: auto;\s*scrollbar-width: none;\s*\}", """
        .pill-input {
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-main) !important;
            font-size: 0.95rem;
            caret-color: #3b82f6;
            padding: 7px 4px;
            min-width: 0;
            min-height: 28px;
            resize: none;
            height: 28px;
            max-height: 120px;
            line-height: 1.45;
            overflow-y: hidden;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            scrollbar-width: none;
        }""", 'composer internal scroll CSS')

sub1(r'''<div id="sidebar-footer-settings" style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var\(--border-color\); font-size: 11px;">\s*<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Words: <b id="word-count">0</b></span>\s*<button onclick="openSettingsModal\(\)" title="Settings" style="background: none; border: none; cursor: pointer; padding: 4px; display: flex; align-items: center;">''', '''<div id="sidebar-footer-settings">
              <span class="sidebar-word-pill" title="Saved conversation words"><span>Words</span><b id="word-count">0</b></span>
              <button onclick="openSettingsModal()" title="Settings" style="background: none; border: none; cursor: pointer; padding: 6px; display: flex; align-items: center; border-radius: 999px;">''', 'word count footer markup')

sub1(r"(?ms)\s*// Do not follow VisualViewport scroll events\. Only compensate the current\s*// viewport offset during resize so Chrome's keyboard cannot drag the app down\.\s*app\.style\.transform = offsetTop \? `translateY\(\$\{offsetTop\}px\)` : '';", """
                // Keep the fixed app anchored. Chrome Android may report a non-zero
                // visualViewport.offsetTop while the keyboard is open; translating the whole
                // app by that value causes the blank/"scrolled away" screen.
                app.style.transform = '';""", 'Android visual viewport anchoring')

sub1(r"(?ms)function autoResizeTextarea\(textarea\) \{\s*textarea\.style\.height = 'auto';\s*textarea\.style\.height = Math\.min\(textarea\.scrollHeight, 100\) \+ 'px';\s*\}", """function autoResizeTextarea(textarea) {
            if (!textarea) return;
            const maxHeight = 120;
            textarea.style.height = 'auto';
            const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
            textarea.style.height = nextHeight + 'px';
            const shouldScroll = textarea.scrollHeight > maxHeight;
            textarea.style.overflowY = shouldScroll ? 'auto' : 'hidden';
            if (shouldScroll) textarea.scrollTop = textarea.scrollHeight;
        }""", 'composer auto resize')

sub1(r"(?ms)function updateUsageUI\(\) \{\s*let words=parseInt\(localStorage\.getItem\('jepong_word_count'\)\|\|'0',10\);\s*if\(!Number\.isFinite\(words\)\|\|words<0\)words=0;\s*if\(words===0\)\{\s*const recovered=countSavedChatWords\(\);\s*if\(recovered>0\)\{words=recovered;localStorage\.setItem\('jepong_word_count',String\(words\)\);\}\s*\}\s*let queries=parseInt\(localStorage\.getItem\('jepong_query_count'\)\|\|'0',10\);\s*if\(!Number\.isFinite\(queries\)\|\|queries<0\)queries=0;\s*const tokens=Math\.ceil\(words\*1\.35\);\s*const w=document\.getElementById\('geminiWordCount'\);\s*const t=document\.getElementById\('geminiTokenCount'\);\s*const q=document\.getElementById\('geminiQueryCount'\);\s*const sidebarWordCount=document\.getElementById\('word-count'\);\s*if\(w\)w\.textContent=words\.toLocaleString\(\);\s*if\(t\)t\.textContent=tokens\.toLocaleString\(\);\s*if\(q\)q\.textContent=queries\.toLocaleString\(\);\s*if\(sidebarWordCount\)sidebarWordCount\.textContent=words\.toLocaleString\(\);\s*try\{renderUsageSyncUI\(\);\}catch\(_\)\{\}\s*try\{renderProviderStatus\(\);\}catch\(_\)\{\}\s*\}", """function updateUsageUI() {
            let words=parseInt(localStorage.getItem('jepong_word_count')||'0',10);
            if(!Number.isFinite(words)||words<0)words=0;
            const savedWords=countSavedChatWords();
            const sidebarWords=Math.max(words,savedWords);
            let queries=parseInt(localStorage.getItem('jepong_query_count')||'0',10);
            if(!Number.isFinite(queries)||queries<0)queries=0;
            const tokens=Math.ceil(words*1.35);
            const w=document.getElementById('geminiWordCount');
            const t=document.getElementById('geminiTokenCount');
            const q=document.getElementById('geminiQueryCount');
            const sidebarWordCount=document.getElementById('word-count');
            if(w)w.textContent=words.toLocaleString();
            if(t)t.textContent=tokens.toLocaleString();
            if(q)q.textContent=queries.toLocaleString();
            if(sidebarWordCount)sidebarWordCount.textContent=sidebarWords.toLocaleString();
            try{renderUsageSyncUI();}catch(_){}
            try{renderProviderStatus();}catch(_){}
        }""", 'word count recovery')

sub1(r"(function openMenuFromBrandIcon\(\) \{.*?isDrawerOpen = true;\s*renderSidebarHistory\(\);)(\s*\})", r"\1\n            updateUsageUI();\2", 'word count drawer refresh')

sub1(r"(\.live-pet\.sleeping \.live-pet-sleep-eyes i\{border-bottom-width:4px!important;filter:drop-shadow\(0 1px 1px rgba\(255,255,255,\.18\)\) drop-shadow\(0 1px 2px rgba\(0,0,0,\.35\)\)\}\s*)(</style>)", r"""\1        /* Image pets already include their own eyes; never draw a duplicate floating eye overlay. */
        .live-pet-visual img + .live-pet-sleep-eyes,
        .live-pet.sleeping .live-pet-visual img + .live-pet-sleep-eyes{
            display:none!important;
            opacity:0!important;
        }

\2""", 'pet duplicate eye guard')

p.write_text(s, encoding='utf-8')
print('mobile UI patch applied')
