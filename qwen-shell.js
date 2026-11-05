/* =========================================================
   JepongDevxyz AI — Qwen-style Shell (Phase 2, 2026-11-06)

   Rebuilds/restyles the app shell to the live-measured
   chat.qwen.ai main-UI spec (~/workspace/qwen-transform-jepong/
   main-ui-spec.md): white-card frame, 240px sidebar / ~60px
   rail, Qwen top bar, centred "How can I help you?" home,
   pill composer, 715px chat column.

   SYNCED + WIRED, never display-only — everything calls the
   app's REAL flows:
   - New Chat        -> createNewChat()
   - History list    -> the app's own #chatHistoryList element
                        (moved, not recreated), rendered by
                        renderSidebarHistory(); rows keep their
                        real loadChatSession() onclick; this file
                        only groups them by date + adds <mark>
                        search highlighting and a "..." menu.
   - Search pill     -> the app's own #searchChatInput /
                        filterChatHistory()
   - Pin/Rename/Export/Delete (chat "..." menu)
                     -> togglePinSession / renameChatSession /
                        exportSpecificChat / deleteChatSession
                        (delete confirmed via showModernConfirm)
   - Model picker    -> the app's own model selector button /
                        openModelPicker() (moved, not cloned)
   - Temporary Chat  -> toggleJdPrivateMode() — the app's real
                        incognito mode, which is never saved to
                        history (saveSessions() early-returns
                        while it is active)
   - Upgrade         -> JDCredits.openTopup() (fallback openUsage)
   - Mode popover    -> the app's real effort control
                        (#responseEffortBtn / setResponseEffort):
                        Instant="Fast", Low/Medium="Auto",
                        High/Extra/Max="Thinking"
   - "+" tools       -> the app's own #composerToolSheet rows
                        (composerToolAction) + two real rows the
                        sheet was missing: Web Research
                        (composerToolAction('web')) and Create
                        Image (selectMode('imagen'))
   - Mic / voice     -> the app's own #micBtn (dictation) and
                        voice-mode.js send-slot voice entry
   - Assistant actions -> the app's own .bot-actions buttons
                        (copyText / voteMessage /
                        shareAssistantMessage /
                        regenerateAnswer / read aloud), only
                        restyled and re-ordered with CSS.

   Qwen items with NO real counterpart in this app are NOT
   faked — see phase2-report.md "Gaps" (Projects backend,
   chat Archive/Clone/Select, Community/Coder/Create tabs,
   model-picker panel clone, Thinking drawer).

   Rules honoured: theme surfaces via CSS variables aliased to
   this app's own live tokens (a bare var(--card) is undefined
   in this app and would render transparent); Qwen's measured
   light hexes appear ONLY inside body.theme-light rules;
   NO alert()/confirm()/prompt(); no feature removed — the
   Ask/Imagine/Build tabs, mode selector, Library, Plugins,
   network status and clear-chat all stay reachable.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdQwenShell) return;
  window.__jdQwenShell = true;

  var CSS_ID = 'jdQwenShellCss';

  /* ---------- tiny helpers (same pattern as qwen-settings.js) ---------- */
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function callFn(name, args) {
    try {
      var f = window[name];
      if (typeof f === 'function') { f.apply(null, args || []); return true; }
    } catch (e) { warn(name, e); }
    return false;
  }
  function warn(what, e) { try { console.warn('[qwen-shell] ' + what + ':', e && e.message || e); } catch (_) {} }
  /* Script-level `let` globals are not window properties. */
  function lex(name) {
    try { return eval(name); } catch (e) { return undefined; }
  }
  function getSessions() {
    var s = lex('chatSessions');
    if (s && typeof s === 'object') return s;
    try { return JSON.parse(lsGet('jepong_ai_chats') || '{}') || {}; } catch (e) { return {}; }
  }
  function isTemp() { return lex('isIncognito') === true; }
  function toast(msg) {
    if (callFn('showModernToast', [msg])) return;
    callFn('showModernAlert', [msg, 'JepongDevxyz AI']);
  }
  function refreshIcons(root) {
    try { if (typeof window.refreshLucideIcons === 'function') window.refreshLucideIcons(root || document); } catch (e) {}
  }

  /* ---------- icons (Lucide paths, stroke=currentColor) ---------- */
  function ic(p, size) {
    return '<svg viewBox="0 0 24 24" width="' + (size || 18) + '" height="' + (size || 18) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }
  var I = {
    panel: ic('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>'),
    plus: ic('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    pen: ic('<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>'),
    search: ic('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>'),
    chevD: ic('<path d="m6 9 6 6 6-6"/>', 14),
    folder: ic('<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>'),
    dots: ic('<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>', 16),
    x: ic('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 14),
    globe: ic('<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>'),
    image: ic('<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>'),
    library: ic('<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>'),
    blocks: ic('<rect width="7" height="7" x="14" y="3" rx="1"/><path d="M10 21V8a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2"/>'),
    zap: ic('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>', 14),
    pin: ic('<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1z"/>', 15),
    download: ic('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>', 15),
    trash: ic('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', 15),
    clock: ic('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', 16),
    spark: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>'
  };

  /* =========================================================
     CSS — variables first. Dark (default) uses ONLY the app's
     own tokens; Qwen light hexes live under body.theme-light.
     ========================================================= */
  var CSS = [
    ':root{--qs-outer:var(--bg-color);--qs-main:var(--card-bg);--qs-side:var(--modal-bg);--qs-ink:var(--text-main);--qs-muted:var(--text-muted);--qs-line:var(--border-color);--qs-chip:var(--input-bg);--qs-bubble:var(--user-msg);--qs-accent:var(--bar-fill);--qs-onaccent:var(--bg-color);--qs-hover:var(--input-bg)}',
    'body.theme-light{--qs-outer:#ECECF0;--qs-main:#FFFFFF;--qs-side:#F7F7F9;--qs-ink:#16181D;--qs-muted:#6B7280;--qs-line:#E7E7EA;--qs-chip:#F1F1F4;--qs-bubble:#EBF5FF;--qs-accent:#1A1A1A;--qs-onaccent:#FFFFFF;--qs-hover:#EFEFF2}',
    'html.jdqs{background:var(--qs-outer)}',
    'html.jdqs body{background:var(--qs-outer)}',

    /* ---------- frame: main card inset ~8px, radius ~14px ---------- */
    '.jdqs .header,.jdqs .chat-viewport-wrapper,.jdqs #inputContainer{background:var(--qs-main)}',
    '.jdqs .header{margin:8px 8px 0;border-radius:14px 14px 0 0;border-bottom:1px solid var(--qs-line);min-height:52px;display:flex;align-items:center;gap:6px;padding:6px 10px;box-sizing:border-box}',
    '.jdqs .chat-viewport-wrapper{margin:0 8px}',
    '.jdqs #inputContainer{margin:0 8px 8px;border-radius:0 0 14px 14px;padding:4px 12px 12px;box-sizing:border-box}',
    '.jdqs #livePetLayer{display:none!important}',

    /* ---------- sidebar base ---------- */
    '.jdqs #sidebar{background:var(--qs-side);color:var(--qs-ink)}',
    '.jdqs-hidden{display:none!important}',
    '.jdqs-side{display:flex;flex-direction:column;height:100%;min-height:0;padding:10px 10px 8px;box-sizing:border-box;gap:2px}',
    '.jdqs-side-head{display:flex;align-items:center;gap:8px;padding:2px 4px 8px}',
    '.jdqs-logo{width:26px;height:26px;border-radius:8px;background:var(--qs-accent);color:var(--qs-onaccent);display:flex;align-items:center;justify-content:center;flex:0 0 auto}',
    '.jdqs-brand{font-size:14px;font-weight:600;color:var(--qs-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0}',
    '.jdqs-iconbtn{width:30px;height:30px;border-radius:8px;border:0;background:transparent;color:var(--qs-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.jdqs-iconbtn:hover{background:var(--qs-hover);color:var(--qs-ink)}',
    '.jdqs-newchat{display:flex;align-items:center;gap:9px;width:100%;height:40px;padding:0 10px;border:0;border-radius:10px;background:transparent;color:var(--qs-ink);font-size:14px;font-weight:500;cursor:pointer;text-align:left}',
    '.jdqs-newchat:hover{background:var(--qs-hover)}',
    '.jdqs-newchat svg{color:var(--qs-muted)}',

    /* search pill — wraps the app's real #searchChatInput */
    '.jdqs-search{display:flex;align-items:center;gap:7px;height:36px;margin:6px 0 4px;padding:0 8px 0 11px;border-radius:999px;background:var(--qs-chip);color:var(--qs-muted)}',
    '.jdqs-search svg{flex:0 0 auto}',
    '.jdqs-search #searchChatInput{flex:1;min-width:0;border:0!important;background:transparent!important;color:var(--qs-ink)!important;font-size:13px;outline:none;height:100%;padding:0!important}',
    '.jdqs-search .jdqs-search-x{display:none;width:20px;height:20px;border-radius:50%;border:0;background:var(--qs-line);color:var(--qs-ink);align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto;padding:0}',
    '.jdqs-search.has-q .jdqs-search-x{display:flex}',
    '.jdqs #chatHistoryList mark{background:transparent;color:#2F7CF6;font-weight:600;padding:0}',

    '.jdqs-navrow{display:flex;align-items:center;gap:9px;width:100%;height:40px;padding:0 10px;border:0;border-radius:10px;background:transparent;color:var(--qs-ink);font-size:14px;cursor:pointer;text-align:left}',
    '.jdqs-navrow:hover{background:var(--qs-hover)}',
    '.jdqs-navrow svg{color:var(--qs-muted)}',

    /* sections */
    '.jdqs-sec{margin-top:8px;display:flex;flex-direction:column;min-height:0}',
    '.jdqs-sec.jdqs-grow{flex:1}',
    '.jdqs-sec-head{display:flex;align-items:center;gap:6px;width:100%;padding:5px 10px;border:0;background:transparent;color:var(--qs-muted);font-size:12.5px;font-weight:600;cursor:pointer;text-align:left;border-radius:8px}',
    '.jdqs-sec-head:hover{color:var(--qs-ink)}',
    '.jdqs-sec-head .jdqs-sec-chev{margin-left:auto;transition:transform .15s;display:flex}',
    '.jdqs-sec.closed .jdqs-sec-chev{transform:rotate(-90deg)}',
    '.jdqs-sec.closed .jdqs-sec-body{display:none}',
    '.jdqs-sec-body{min-height:0;overflow-y:auto}',
    '.jdqs-grow .jdqs-sec-body{flex:1}',
    '.jdqs-newproj{display:flex;align-items:center;gap:9px;width:100%;height:38px;padding:0 10px;border:0;border-radius:10px;background:transparent;color:var(--qs-ink);font-size:13.5px;cursor:pointer;text-align:left}',
    '.jdqs-newproj:hover{background:var(--qs-hover)}',
    '.jdqs-newproj svg{color:var(--qs-muted)}',

    /* the app's real history list, regrouped */
    '.jdqs #chatHistoryList{display:flex;flex-direction:column;gap:1px;padding:0}',
    '.jdqs-grouplabel{font-size:12px;color:var(--qs-muted);padding:9px 10px 3px}',
    '.jdqs #chatHistoryList .history-item{position:relative;display:flex;align-items:center;min-height:40px;border-radius:10px;padding:6px 30px 6px 10px;color:var(--qs-ink);cursor:pointer}',
    '.jdqs #chatHistoryList .history-item:hover{background:var(--qs-hover)}',
    '.jdqs #chatHistoryList .history-item.active{background:var(--qs-chip)}',
    '.jdqs #chatHistoryList .history-item-text{font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdqs #chatHistoryList .history-actions-deck{display:none!important}',
    '.jdqs-itemore{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--qs-muted);display:none;align-items:center;justify-content:center;cursor:pointer}',
    '.jdqs #chatHistoryList .history-item:hover .jdqs-itemore{display:flex}',
    '.jdqs-itemore:hover{background:var(--qs-line);color:var(--qs-ink)}',
    '.jdqs-empty{font-size:12.5px;color:var(--qs-muted);padding:6px 10px}',

    /* status row (app's real network/words, restyled subtle) */
    '.jdqs-statusrow{padding:6px 4px 0}',
    '.jdqs-statusrow .jd-sidebar-status-row{display:flex;align-items:center;gap:10px;font-size:11.5px;color:var(--qs-muted)}',

    /* profile block (wraps the app's real account button) */
    '.jdqs-profile{position:relative;display:flex;align-items:center;gap:6px;margin-top:8px;padding:6px 4px 2px;border-top:1px solid var(--qs-line)}',
    '.jdqs-profile .jd-sidebar-account{display:flex;align-items:center;gap:9px;flex:1;min-width:0;border:0;background:transparent;cursor:pointer;text-align:left;padding:4px 6px;border-radius:10px;color:var(--qs-ink)}',
    '.jdqs-profile .jd-sidebar-account:hover{background:var(--qs-hover)}',
    '.jdqs-profile .jd-sidebar-avatar{width:32px;height:32px;border-radius:50%;background:var(--qs-accent);color:var(--qs-onaccent);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex:0 0 auto}',
    '.jdqs-profile-text{display:flex;flex-direction:column;min-width:0}',
    '.jdqs-profile .jd-sidebar-account-name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdqs-profile-sub{font-size:12px;color:var(--qs-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdqs-upgrade{flex:0 0 auto;border:1px solid var(--qs-line);background:transparent;color:var(--qs-ink);border-radius:999px;padding:5px 11px;font-size:12.5px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:5px}',
    '.jdqs-upgrade:hover{background:var(--qs-hover)}',

    /* menus (profile + chat "...") */
    '.jdqs-menu{position:fixed;z-index:1200;min-width:190px;background:var(--qs-main);border:1px solid var(--qs-line);border-radius:14px;box-shadow:0 12px 34px rgba(0,0,0,.18);padding:5px;display:none}',
    '.jdqs-menu.open{display:block}',
    '.jdqs-menu-head{padding:8px 10px 6px;border-bottom:1px solid var(--qs-line);margin-bottom:4px}',
    '.jdqs-menu-head b{display:block;font-size:13.5px;color:var(--qs-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:230px}',
    '.jdqs-menu-head span{font-size:12px;color:var(--qs-muted)}',
    '.jdqs-menu-item{display:flex;align-items:center;gap:9px;width:100%;min-height:37px;padding:6px 10px;border:0;border-radius:9px;background:transparent;color:var(--qs-ink);font-size:13.5px;cursor:pointer;text-align:left}',
    '.jdqs-menu-item:hover{background:var(--qs-hover)}',
    '.jdqs-menu-item svg{color:var(--qs-muted)}',
    '.jdqs-menu-item.danger{color:#E5484D}',
    '.jdqs-menu-item.danger svg{color:#E5484D}',
    '.jdqs-menu-sep{height:1px;background:var(--qs-line);margin:4px 6px}'
  ];

  CSS.push.apply(CSS, [
    /* ---------- desktop frame + sidebar column (>=1024, same breakpoint as desktop-layout.js) ---------- */
    '@media(min-width:1024px){',
    '.jdqs .app-container{padding-left:256px;box-sizing:border-box}',
    '.jdqs #sidebar{position:fixed!important;left:8px;top:8px;bottom:8px;width:240px!important;border-radius:14px;z-index:60;transform:none!important;visibility:visible!important;opacity:1!important}',
    '.jdqs.jdqs-temp .app-container{padding-left:0}',
    '.jdqs.jdqs-temp #sidebar{display:none!important}',
    /* collapsed rail ~60px */
    '.jdqs.jdqs-rail .app-container{padding-left:84px}',
    '.jdqs.jdqs-rail #sidebar{width:60px!important}',
    '.jdqs.jdqs-rail .jdqs-brand,.jdqs.jdqs-rail .jdqs-newchat span,.jdqs.jdqs-rail .jdqs-navrow span,.jdqs.jdqs-rail .jdqs-sec,.jdqs.jdqs-rail .jdqs-statusrow,.jdqs.jdqs-rail .jdqs-profile-text,.jdqs.jdqs-rail .jdqs-upgrade{display:none!important}',
    '.jdqs.jdqs-rail .jdqs-side{align-items:center;padding:10px 6px 8px}',
    '.jdqs.jdqs-rail .jdqs-side-head{flex-direction:column;padding:2px 0 8px}',
    '.jdqs.jdqs-rail .jdqs-newchat,.jdqs.jdqs-rail .jdqs-navrow{width:40px;height:40px;padding:0;justify-content:center;border-radius:12px}',
    '.jdqs.jdqs-rail .jdqs-search{width:40px;height:40px;border-radius:12px;padding:0;justify-content:center;cursor:pointer}',
    '.jdqs.jdqs-rail .jdqs-search #searchChatInput,.jdqs.jdqs-rail .jdqs-search .jdqs-search-x{display:none!important}',
    '.jdqs.jdqs-rail .jdqs-profile{justify-content:center;width:100%}',
    '.jdqs.jdqs-rail .jdqs-profile .jd-sidebar-account{flex:0 0 auto;padding:2px}',
    '}',
    /* mobile drawer keeps the app mechanics; just narrower + inset */
    '@media(max-width:1023.98px){.jdqs #sidebar{width:min(300px,88vw)!important}}',

    /* ---------- top bar ---------- */
    '.jdqs .header .jd-navigation{display:flex;align-items:center;gap:4px;flex:1;min-width:0;background:transparent}',
    '.jdqs .header .jd-nav-tabs{display:flex;gap:2px;margin:0 auto;background:var(--qs-chip);border-radius:999px;padding:3px}',
    '.jdqs .header .jd-nav-tab{border:0;background:transparent;color:var(--qs-muted);font-size:13px;font-weight:600;padding:5px 13px;border-radius:999px;cursor:pointer}',
    '.jdqs .header .jd-nav-tab.active{background:var(--qs-main);color:var(--qs-ink);box-shadow:0 1px 4px rgba(0,0,0,.12)}',
    '.jdqs .header-controls{display:flex;align-items:center;gap:6px}',
    '.jdqs .header-controls .selector-wrapper{display:flex;align-items:center}',
    '.jdqs .header .dropdown-btn{display:flex;align-items:center;gap:6px;border:0;background:transparent;color:var(--qs-ink);font-size:15px;font-weight:600;padding:7px 9px;border-radius:10px;cursor:pointer;white-space:nowrap}',
    '.jdqs .header .dropdown-btn:hover{background:var(--qs-hover)}',
    '.jdqs .jdqs-modelwrap .dropdown-btn{font-size:15px}',
    '.jdqs .jdqs-modewrap .dropdown-btn{font-size:13px;color:var(--qs-muted);font-weight:500}',
    '.jdqs-top-right{display:flex;align-items:center;gap:6px;margin-left:2px}',
    '.jdqs-upgrade-top{background:var(--qs-accent);color:var(--qs-onaccent);border:0;border-radius:999px;height:32px;padding:0 14px;font-size:13.5px;font-weight:600;cursor:pointer;white-space:nowrap}',
    '.jdqs .jd-private-btn{width:32px;height:32px;border-radius:9px;border:1.5px dashed var(--qs-muted);background:transparent;color:var(--qs-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}',
    '.jdqs .jd-private-btn[aria-pressed="true"]{border-style:solid;border-color:var(--qs-ink);color:var(--qs-ink);background:var(--qs-chip)}',
    '.jdqs .jd-private-btn svg{width:17px;height:17px}',
    '.jdqs-topmore{display:none}',
    '.jdqs.jdqs-inchat .jdqs-topmore{display:flex}',
    /* temporary-chat banner (spec subtitle) */
    '.jdqs-tempbanner{display:none;margin:0 8px;padding:9px 14px;background:var(--qs-chip);color:var(--qs-muted);font-size:12.5px;text-align:center}',
    '.jdqs.jdqs-temp .jdqs-tempbanner{display:block}',
    '.jdqs-tempbanner b{color:var(--qs-ink);font-size:13px}',

    /* ---------- home ---------- */
    '.jdqs .welcome-screen{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:19vh;text-align:center}',
    '.jdqs .welcome-screen lottie-player{display:none!important}',
    '.jdqs .welcome-title{font-size:30px!important;font-weight:600;color:var(--qs-ink);background:none!important;-webkit-background-clip:initial!important;-webkit-text-fill-color:var(--qs-ink)!important;letter-spacing:-.01em}',
    '.jdqs.jdqs-home #promptSuggestions{display:none!important}',
    '.jdqs #userInput::placeholder{color:var(--qs-muted)}',

    /* ---------- composer (Qwen pill) ---------- */
    '.jdqs #promptBar{width:min(757px,100%);margin:2px auto 0;background:var(--qs-main);border:1px solid var(--qs-line);border-radius:28px;box-shadow:0 6px 24px rgba(15,15,20,.08);box-sizing:border-box}',
    'body:not(.theme-light) .jdqs #promptBar{box-shadow:0 6px 24px rgba(0,0,0,.35)}',
    '.jdqs .prompt-bar__field{display:flex;flex-direction:column}',
    '.jdqs #userInput{font-size:16px;color:var(--qs-ink);background:transparent;max-height:168px}',
    '.jdqs .prompt-bar__bar{display:flex;align-items:flex-end;gap:6px}',
    '.jdqs #composerPlusBtn{width:30px;height:30px;border-radius:50%;border:1px solid var(--qs-line);background:transparent;color:var(--qs-ink);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.jdqs #composerPlusBtn:hover{background:var(--qs-hover)}',
    /* tools sheet restyled as Qwen menu */
    '.jdqs #composerToolSheet{border-radius:16px;border:1px solid var(--qs-line);background:var(--qs-main);box-shadow:0 14px 40px rgba(0,0,0,.16);padding:6px}',
    '.jdqs #composerToolSheet .prompt-bar__row{min-height:46px;border-radius:10px;color:var(--qs-ink)}',
    '.jdqs #composerToolSheet .prompt-bar__row:hover{background:var(--qs-hover)}',
    /* effort button becomes the Auto/Thinking/Fast popover trigger */
    '.jdqs #responseEffortBtn{display:inline-flex;align-items:center;gap:5px;border:0;background:transparent;color:var(--qs-ink);font-size:14px;padding:6px 8px;border-radius:999px;cursor:pointer}',
    '.jdqs #responseEffortBtn:hover{background:var(--qs-hover)}',
    '.jdqs #responseEffortBtn::after{content:"";width:7px;height:7px;border-right:1.8px solid var(--qs-muted);border-bottom:1.8px solid var(--qs-muted);transform:rotate(45deg) translateY(-2px)}',
    '.jdqs #responseEffortMenu{border-radius:16px;border:1px solid var(--qs-line);background:var(--qs-main);box-shadow:0 14px 40px rgba(0,0,0,.16)}',
    /* mic: grey circle; hidden while typing (spec + app voice-slot logic) */
    '.jdqs #micBtn{width:30px;height:30px;border-radius:50%;background:var(--qs-chip);color:var(--qs-muted);flex:0 0 auto}',
    '.jdqs.jdqs-has-text #micBtn{display:none!important}',
    /* send / voice slot: grey idle, black with text; voice-mode swap = black voice circle */
    '.jdqs #mainActionBtn{width:33px;height:33px;border-radius:50%;border:0;background:var(--qs-chip);color:var(--qs-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.jdqs.jdqs-has-text #mainActionBtn,.jdqs.jdqs-has-files #mainActionBtn{background:var(--qs-accent);color:var(--qs-onaccent)}',
    '.jdqs #mainActionBtn.generating{background:#E5484D;color:#fff}',
    '.jdqs #mainActionSling .rb-sling-fx,.jdqs #mainActionSling .rb-sling-dots{display:none!important}',

    /* ---------- chat view: 715px column ---------- */
    '.jdqs #chatBox .msg{max-width:715px;width:100%;margin-left:auto;margin-right:auto;box-sizing:border-box}',
    '.jdqs #chatBox .msg.user{display:flex;flex-direction:column;align-items:flex-end}',
    '.jdqs #chatBox .msg.user .user-bubble-body{background:var(--qs-bubble);color:var(--qs-ink);border-radius:20px;padding:12px 16px;font-size:16px;line-height:1.5;max-width:78%}', /* spec max-w ~55% of column on desktop; 78% keeps mobile sane */
    '@media(min-width:1024px){.jdqs #chatBox .msg.user .user-bubble-body{max-width:55%}}',
    '.jdqs #chatBox .msg.user .user-actions{display:flex;gap:2px;margin-top:3px;opacity:0;transition:opacity .12s}',
    '.jdqs #chatBox .msg.user:hover .user-actions{opacity:1}',
    '.jdqs #chatBox .msg.bot{background:transparent;font-size:16px;line-height:1.65;color:var(--qs-ink)}',
    /* assistant action row: restyle + Qwen order Copy/Good/Bad/Share/ReadAloud/More (Regenerate lives in More as the app's real "Retry") */
    '.jdqs .bot-actions{display:flex;align-items:center;gap:4px;margin-top:6px}',
    '.jdqs .bot-actions .bot-action-btn{width:30px;height:30px;border-radius:8px;border:0;background:transparent;color:var(--qs-muted);display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdqs .bot-actions .bot-action-btn:hover{background:var(--qs-hover);color:var(--qs-ink)}',
    '.jdqs .bot-actions .bot-action-btn svg,.jdqs .bot-actions .bot-action-btn i{width:16px;height:16px}',
    '.jdqs .bot-actions [onclick*="copyText"]{order:1}',
    '.jdqs .bot-actions [onclick*="voteMessage(this, \'like\')"]{order:2}',
    '.jdqs .bot-actions [onclick*="voteMessage(this, \'dislike\')"]{order:3}',
    '.jdqs .bot-actions [onclick*="shareAssistantMessage"]{order:4}',
    '.jdqs .bot-actions .read-aloud-btn{order:5;width:auto;padding:0 8px;gap:5px;font-size:12px}',
    '.jdqs .bot-actions [onclick*="toggleMessageMore"]{order:6}',
    '.jdqs .bot-actions [onclick*="continueGenerating"]{order:7}',
    '.jdqs .bot-disclaimer{font-size:12px;color:var(--qs-muted);margin-top:5px}'
  ]);

  function injectCSS() {
    if ($(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = CSS.join('\n');
    document.head.appendChild(st);
  }

  /* =========================================================
     Menus (profile + chat "...") — one reusable popover
     ========================================================= */
  var menuEl = null;
  function ensureMenu() {
    if (menuEl) return menuEl;
    menuEl = document.createElement('div');
    menuEl.className = 'jdqs-menu';
    menuEl.setAttribute('role', 'menu');
    document.body.appendChild(menuEl);
    document.addEventListener('pointerdown', function (e) {
      if (menuEl.classList.contains('open') && !menuEl.contains(e.target)) closeMenu();
    }, true);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    return menuEl;
  }
  function closeMenu() { if (menuEl) menuEl.classList.remove('open'); }
  function openMenu(anchor, items, opts) {
    opts = opts || {};
    var m = ensureMenu();
    m.innerHTML = '';
    items.forEach(function (it) {
      if (it.sep) { var s = document.createElement('div'); s.className = 'jdqs-menu-sep'; m.appendChild(s); return; }
      if (it.head) {
        var h = document.createElement('div'); h.className = 'jdqs-menu-head';
        h.innerHTML = '<b>' + esc(it.head.title || '') + '</b>' + (it.head.sub ? '<span>' + esc(it.head.sub) + '</span>' : '');
        m.appendChild(h); return;
      }
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'jdqs-menu-item' + (it.danger ? ' danger' : '');
      b.innerHTML = (it.icon || '') + '<span>' + esc(it.label) + '</span>';
      b.addEventListener('click', function () { closeMenu(); if (it.fn) it.fn(); });
      m.appendChild(b);
    });
    m.classList.add('open');
    var r = anchor.getBoundingClientRect();
    var mw = m.offsetWidth || 200, mh = m.offsetHeight || 200;
    var left = Math.max(8, Math.min(r.left, window.innerWidth - mw - 8));
    var top = opts.up ? r.top - mh - 6 : r.bottom + 6;
    if (top < 8) top = r.bottom + 6;
    if (top + mh > window.innerHeight - 8) top = Math.max(8, window.innerHeight - mh - 8);
    m.style.left = left + 'px';
    m.style.top = top + 'px';
    refreshIcons(m);
    return m;
  }

  var I2 = {
    gear: ic('<circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M4.2 4.2l2.8 2.8m10 10 2.8 2.8M1 12h4m14 0h4M4.2 19.8l2.8-2.8m10-10 2.8-2.8"/>', 15),
    chart: ic('<path d="M3 3v18h18"/><path d="M7 15v-3m5 3V8m5 7v-6"/>', 15),
    out: ic('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>', 15),
    eraser: ic('<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>', 15)
  };

  function upgrade() {
    try {
      if (window.JDCredits && typeof window.JDCredits.openTopup === 'function') { window.JDCredits.openTopup(); return; }
    } catch (e) { warn('upgrade', e); }
    if (callFn('openUsage')) return;
    toast('Upgrade is not available right now.');
  }

  function confirmDeleteChat(id) {
    var done = function () { callFn('deleteChatSession', [id]); };
    try {
      if (typeof window.showModernConfirm === 'function') {
        window.showModernConfirm('Delete this chat? This cannot be undone.', 'Delete Chat', done);
        return;
      }
    } catch (e) { warn('confirmDelete', e); }
    done();
  }

  function openChatMenu(anchor, id, extra) {
    var sessions = lex('isBibleMode') === true ? (lex('bibleChatSessions') || {}) : getSessions();
    var s = sessions[id] || {};
    var items = [
      { label: s.pinned ? 'Unpin' : 'Pin', icon: I.pin, fn: function () { callFn('togglePinSession', [id]); } },
      { label: 'Rename', icon: I.pen, fn: function () { callFn('renameChatSession', [id]); } },
      { sep: true },
      { label: 'Download .txt', icon: I.download, fn: function () { callFn('exportSpecificChat', [id, null, 'txt']); } },
      { label: 'Download .md', icon: I.download, fn: function () { callFn('exportSpecificChat', [id, null, 'md']); } }
    ];
    if (extra && extra.length) { items.push({ sep: true }); items = items.concat(extra); }
    items.push({ sep: true });
    items.push({ label: 'Delete', icon: I.trash, danger: true, fn: function () { confirmDeleteChat(id); } });
    openMenu(anchor, items, {});
  }

  function profileSub() {
    var lbl = $('cloudUserLabel');
    var email = lbl && lbl.textContent ? lbl.textContent.trim() : '';
    return email || 'Free';
  }
  function openProfileMenu(anchor) {
    var nameEl = $('jdSidebarAccountName');
    var name = nameEl && nameEl.textContent ? nameEl.textContent.trim() : 'JepongDevxyz AI';
    var sub = profileSub();
    var signed = sub !== 'Free';
    var items = [
      { head: { title: name, sub: sub } },
      { label: 'Upgrade Plan', icon: I.zap, fn: upgrade },
      { label: 'Usage', icon: I2.chart, fn: function () { callFn('closeAllDrawers'); callFn('openUsage'); } },
      { label: 'Settings', icon: I2.gear, fn: function () { callFn('closeAllDrawers'); callFn('openSettingsModal'); } },
      { label: 'Library', icon: I.library, fn: function () { callFn('closeAllDrawers'); callFn('openLibrary'); } },
      { sep: true }
    ];
    if (signed) items.push({ label: 'Log out', icon: I2.out, danger: true, fn: function () { callFn('cloudSignOut'); } });
    else items.push({ label: 'Log in', icon: I2.out, fn: function () { callFn('openAccountModal'); } });
    openMenu(anchor, items, { up: true });
  }

  /* =========================================================
     History grouping + search highlight (operates on the
     app's own rendered .history-item nodes — moves only)
     ========================================================= */
  function sessionTs(id, s) {
    if (s && (s.updatedAt || s.createdAt)) return Number(s.updatedAt || s.createdAt) || 0;
    var m = String(id || '').match(/(\d{10,})/);
    return m ? Number(m[1]) : 0;
  }
  function decorateHistory() {
    var list = $('chatHistoryList');
    if (!list) return;
    var input = $('searchChatInput');
    var q = input && input.value ? input.value.trim().toLowerCase() : '';
    var items = Array.prototype.slice.call(list.querySelectorAll('.history-item'));
    /* "..." buttons on every row */
    items.forEach(function (item) {
      if (!item.querySelector('.jdqs-itemore')) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'jdqs-itemore';
        b.setAttribute('aria-label', 'Chat options');
        b.innerHTML = I.dots;
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          openChatMenu(b, item.dataset.sessionId);
        });
        item.appendChild(b);
      }
      /* search-match highlight (safe DOM rebuild) */
      var txt = item.querySelector('.history-item-text');
      if (txt) {
        var plain = txt.textContent || '';
        txt.textContent = plain;
        if (q) {
          var idx = plain.toLowerCase().indexOf(q);
          if (idx >= 0) {
            var mark = document.createElement('mark');
            mark.textContent = plain.slice(idx, idx + q.length);
            txt.textContent = '';
            txt.appendChild(document.createTextNode(plain.slice(0, idx)));
            txt.appendChild(mark);
            txt.appendChild(document.createTextNode(plain.slice(idx + q.length)));
          }
        }
      }
    });
    if (q) return; /* filtered view stays flat, like Qwen search results */
    /* group by date */
    list.querySelectorAll('.jdqs-grouplabel').forEach(function (n) { n.remove(); });
    if (!items.length) return;
    var sessions = lex('isBibleMode') === true ? (lex('bibleChatSessions') || {}) : getSessions();
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var today = now.getTime(), week = today - 6 * 864e5;
    var buckets = [
      { label: 'Pinned', test: function (s) { return !!(s && s.pinned); } },
      { label: 'Today', test: function (s, t) { return t >= today; } },
      { label: 'Previous 7 Days', test: function (s, t) { return t >= week && t < today; } },
      { label: 'Older', test: function () { return true; } }
    ];
    var placed = new Set();
    buckets.forEach(function (bk) {
      var group = items.filter(function (item) {
        if (placed.has(item)) return false;
        var s = sessions[item.dataset.sessionId];
        return bk.test(s, sessionTs(item.dataset.sessionId, s));
      });
      if (!group.length) return;
      var label = document.createElement('div');
      label.className = 'jdqs-grouplabel';
      label.textContent = bk.label;
      list.appendChild(label);
      group.forEach(function (item) { placed.add(item); list.appendChild(item); });
    });
  }

  /* =========================================================
     Sidebar rebuild — moves the app's REAL nodes into a
     Qwen layout (nothing is recreated: #chatHistoryList,
     #searchChatInput, the account button and the network
     status row are the same elements, so every existing
     handler and updater keeps working).
     ========================================================= */
  function makeSec(title, grow) {
    var sec = document.createElement('div');
    sec.className = 'jdqs-sec' + (grow ? ' jdqs-grow' : '');
    var head = document.createElement('button');
    head.type = 'button';
    head.className = 'jdqs-sec-head';
    head.innerHTML = '<span>' + esc(title) + '</span><span class="jdqs-sec-chev">' + I.chevD + '</span>';
    head.setAttribute('aria-expanded', 'true');
    head.addEventListener('click', function () {
      var closed = sec.classList.toggle('closed');
      head.setAttribute('aria-expanded', String(!closed));
    });
    var body = document.createElement('div');
    body.className = 'jdqs-sec-body';
    sec.appendChild(head); sec.appendChild(body);
    return { sec: sec, body: body };
  }

  function buildSidebar() {
    var sidebar = $('sidebar');
    if (!sidebar || sidebar.querySelector('.jdqs-side')) return;
    var accountBtn = sidebar.querySelector('.jd-sidebar-account');
    var searchInput = $('searchChatInput');
    var historyList = $('chatHistoryList');
    var statusRow = sidebar.querySelector('.jd-sidebar-status-row');

    var side = document.createElement('div');
    side.className = 'jdqs-side';

    /* head: logo + name + collapse */
    var head = document.createElement('div');
    head.className = 'jdqs-side-head';
    head.innerHTML = '<span class="jdqs-logo">' + I.spark + '</span><span class="jdqs-brand">JepongDevxyz AI</span>';
    var collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'jdqs-iconbtn jdqs-collapse';
    collapseBtn.setAttribute('aria-label', 'Toggle sidebar');
    collapseBtn.innerHTML = I.panel;
    collapseBtn.addEventListener('click', function () {
      if (window.innerWidth >= 1024) {
        var on = document.body.classList.toggle('jdqs-rail');
        lsSet('jdqs_rail', on ? '1' : '0');
      } else {
        callFn('closeAllDrawers');
      }
    });
    head.appendChild(collapseBtn);
    side.appendChild(head);

    /* New Chat — real flow */
    var nc = document.createElement('button');
    nc.type = 'button';
    nc.className = 'jdqs-newchat';
    nc.innerHTML = I.pen + '<span>New Chat</span>';
    nc.addEventListener('click', function () { callFn('createNewChat'); });
    side.appendChild(nc);

    /* Search pill — the app's real input/filter */
    var pill = document.createElement('div');
    pill.className = 'jdqs-search';
    pill.innerHTML = I.search;
    if (searchInput) {
      searchInput.setAttribute('placeholder', 'Search Chats');
      pill.appendChild(searchInput);
      searchInput.addEventListener('input', function () {
        pill.classList.toggle('has-q', !!searchInput.value.trim());
      });
    }
    var xBtn = document.createElement('button');
    xBtn.type = 'button';
    xBtn.className = 'jdqs-search-x';
    xBtn.setAttribute('aria-label', 'Clear search');
    xBtn.innerHTML = I.x;
    xBtn.addEventListener('click', function () {
      if (searchInput) { searchInput.value = ''; pill.classList.remove('has-q'); callFn('filterChatHistory'); }
    });
    pill.appendChild(xBtn);
    pill.addEventListener('click', function () {
      if (document.body.classList.contains('jdqs-rail')) {
        document.body.classList.remove('jdqs-rail');
        lsSet('jdqs_rail', '0');
        if (searchInput) setTimeout(function () { searchInput.focus(); }, 60);
      }
    });
    side.appendChild(pill);

    /* Real app rows Qwen's Community/Coder/Create slot maps to */
    [['Library', I.library, function () { callFn('closeAllDrawers'); callFn('openLibrary'); }],
     ['Plugins', I.blocks, function () { callFn('closeAllDrawers'); callFn('openPluginsFromComposer'); }]].forEach(function (row) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'jdqs-navrow';
      b.innerHTML = row[1] + '<span>' + row[0] + '</span>';
      b.addEventListener('click', row[2]);
      side.appendChild(b);
    });

    /* Projects — header + New Project row (no backend: honest toast, see report) */
    var proj = makeSec('Projects', false);
    var np = document.createElement('button');
    np.type = 'button';
    np.className = 'jdqs-newproj';
    np.innerHTML = I.plus + '<span>New Project</span>';
    np.addEventListener('click', function () {
      toast('Projects are not available in JepongDevxyz AI yet — all chats live under All chats.');
    });
    proj.body.appendChild(np);
    side.appendChild(proj.sec);

    /* All chats — the real history list element, moved */
    var chats = makeSec('All chats', true);
    if (historyList) chats.body.appendChild(historyList);
    side.appendChild(chats.sec);

    /* network / word status (real element, kept) */
    if (statusRow) {
      var sr = document.createElement('div');
      sr.className = 'jdqs-statusrow';
      sr.appendChild(statusRow);
      side.appendChild(sr);
    }

    /* profile block — real account button + Upgrade pill */
    var prof = document.createElement('div');
    prof.className = 'jdqs-profile';
    if (accountBtn) {
      accountBtn.removeAttribute('onclick');
      var nameEl = accountBtn.querySelector('.jd-sidebar-account-name');
      if (nameEl && nameEl.parentNode === accountBtn) {
        var tw = document.createElement('span');
        tw.className = 'jdqs-profile-text';
        accountBtn.insertBefore(tw, nameEl);
        tw.appendChild(nameEl);
        var sub = document.createElement('span');
        sub.className = 'jdqs-profile-sub';
        sub.id = 'jdqsProfileSub';
        sub.textContent = profileSub();
        tw.appendChild(sub);
      }
      accountBtn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        openProfileMenu(prof);
      });
      prof.appendChild(accountBtn);
    }
    var up = document.createElement('button');
    up.type = 'button';
    up.className = 'jdqs-upgrade';
    up.innerHTML = I.zap + '<span>Upgrade</span>';
    up.addEventListener('click', upgrade);
    prof.appendChild(up);
    side.appendChild(prof);

    /* sweep everything else (old quick actions, old section
       shell, footer shell, dismiss) into a hidden keeper so
       no node the app still references is destroyed */
    var hidden = document.createElement('div');
    hidden.className = 'jdqs-hidden';
    Array.prototype.slice.call(sidebar.childNodes).forEach(function (n) { hidden.appendChild(n); });
    sidebar.appendChild(hidden);
    sidebar.appendChild(side);
    window.addEventListener('jd:account-changed', function () {
      var s = $('jdqsProfileSub');
      if (s) s.textContent = profileSub();
    });
  }

  /* =========================================================
     Top bar — moves the real model selector + incognito
     (Temporary Chat) button; adds Upgrade + chat "..."
     ========================================================= */
  function buildTopbar() {
    var header = document.querySelector('.header');
    if (!header || header.querySelector('.jdqs-top-right')) return;
    var wraps = header.querySelectorAll('.header-controls .selector-wrapper');
    wraps.forEach(function (w) {
      if (w.querySelector('#selectedModelText')) { w.classList.add('jdqs-modelwrap'); w.style.order = '-1'; }
      else w.classList.add('jdqs-modewrap');
    });
    var right = document.createElement('div');
    right.className = 'jdqs-top-right';
    var up = document.createElement('button');
    up.type = 'button';
    up.className = 'jdqs-upgrade-top';
    up.textContent = 'Upgrade';
    up.addEventListener('click', upgrade);
    right.appendChild(up);
    var priv = $('jdPrivateBtn');
    if (priv) { priv.title = 'Temporary Chat'; right.appendChild(priv); }
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'jdqs-iconbtn jdqs-topmore';
    more.setAttribute('aria-label', 'Chat options');
    more.innerHTML = I.dots;
    more.addEventListener('click', function () {
      var id = lex('currentSessionId');
      if (id) openChatMenu(more, id, [{ label: 'Clear current chat', icon: I2.eraser, fn: function () { callFn('clearCurrentChat'); } }]);
    });
    right.appendChild(more);
    header.appendChild(right);

    var banner = document.createElement('div');
    banner.className = 'jdqs-tempbanner';
    banner.innerHTML = '<b>Temporary Chat</b><br>This chat won\'t appear in history and your messages will not be saved.';
    header.parentNode.insertBefore(banner, header.nextSibling);
  }

  function syncTemp() {
    document.body.classList.toggle('jdqs-temp', isTemp());
  }

  /* =========================================================
     Wraps — chain over the app's own functions (same
     pattern voice-mode.js uses), never replace behaviour
     ========================================================= */
  function wrapFn(name, after) {
    var orig = window[name];
    if (typeof orig !== 'function' || orig.__jdqsWrapped) return;
    var wrapped = function () {
      var r = orig.apply(this, arguments);
      try { after(); } catch (e) { warn('wrap:' + name, e); }
      return r;
    };
    wrapped.__jdqsWrapped = true;
    try { Object.defineProperty(wrapped, 'name', { value: name }); } catch (e) {}
    window[name] = wrapped;
  }

  function setHomeState() {
    var box = $('chatBox');
    var home = !!(box && box.querySelector('.welcome-screen'));
    document.body.classList.toggle('jdqs-home', home);
    document.body.classList.toggle('jdqs-inchat', !home);
    var input = $('userInput');
    if (input) input.setAttribute('placeholder', home ? 'How can I help you?' : 'How can I help you today?');
  }

  /* index.html's setTheme() assigns document.body.className
     wholesale (themeName only), wiping every shell state class
     on each theme flip. Re-assert the full set the shell owns,
     recomputed from live state exactly as init()/the syncs do. */
  function reassertBodyClasses() {
    if (!document.body) return;
    document.body.classList.add('jdqs');
    if (lsGet('jdqs_rail') === '1' && window.innerWidth >= 1024) document.body.classList.add('jdqs-rail');
    syncTemp();
    setHomeState();
    var input = $('userInput');
    var fc = $('filePreviewContainer');
    document.body.classList.toggle('jdqs-has-text', !!(input && input.value.trim()));
    document.body.classList.toggle('jdqs-has-files', !!(fc && !fc.hidden && fc.querySelector('.jd-upload-chip')));
  }

  function syncEffortLabel() {
    var lbl = $('responseEffortLabel');
    if (!lbl) return;
    var eff = '';
    try { if (typeof window.currentResponseEffort === 'function') eff = window.currentResponseEffort(); } catch (e) {}
    if (!eff) eff = lbl.textContent.trim();
    lbl.textContent = eff === 'Instant' ? 'Fast' : (eff === 'Low' || eff === 'Medium') ? 'Auto' : 'Thinking';
  }

  function installWraps() {
    wrapFn('renderSidebarHistory', decorateHistory);
    wrapFn('renderWelcomeScreen', function () {
      var t = document.querySelector('#chatBox .welcome-title');
      if (t && t.textContent.trim() === 'JepongDevxyz AI') t.textContent = 'How can I help you?';
      setHomeState();
    });
    wrapFn('loadChatSession', setHomeState);
    wrapFn('toggleJdPrivateMode', syncTemp);
    /* setTheme wipes body.className — re-assert shell classes after it */
    wrapFn('setTheme', reassertBodyClasses);
    wrapFn('updateResponseEffortUI', syncEffortLabel);
    /* Qwen composer grows to ~224px total; the app's cap was
       120px of textarea. Same logic, higher cap. */
    if (typeof window.autoResizeTextarea === 'function' && !window.autoResizeTextarea.__jdqsWrapped) {
      var wrappedResize = function (ta) {
        if (!ta) return;
        ta.style.height = 'auto';
        var nh = Math.min(ta.scrollHeight, 168);
        ta.style.height = nh + 'px';
        var over = ta.scrollHeight > 168;
        ta.style.overflowY = over ? 'auto' : 'hidden';
        if (over) ta.scrollTop = ta.scrollHeight;
        callFn('syncLivePetSafeLane');
      };
      wrappedResize.__jdqsWrapped = true;
      window.autoResizeTextarea = wrappedResize;
    }
  }

  /* =========================================================
     Composer additions — two real rows the sheet lacked
     ========================================================= */
  function composerAdditions() {
    var sheet = $('composerToolSheet');
    if (sheet && !sheet.querySelector('[data-jdqs-tool]')) {
      function row(key, iconName, name, desc, fn) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'prompt-bar__row';
        b.setAttribute('role', 'option');
        b.setAttribute('data-jdqs-tool', key);
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        b.innerHTML = '<span class="prompt-bar__row-icon"><i data-lucide="' + iconName + '"></i></span>' +
          '<span class="prompt-bar__row-name">' + esc(name) + '</span>' +
          '<span class="prompt-bar__row-desc">' + esc(desc) + '</span>';
        b.addEventListener('click', fn);
        sheet.appendChild(b);
      }
      row('web', 'globe', 'Web Research', 'Search the web for this chat', function () { callFn('composerToolAction', ['web']); });
      row('image', 'image', 'Create Image', 'Switch to the image generator', function () {
        callFn('closeComposerTools');
        callFn('selectMode', ['imagen', 'Image Generator']);
      });
      refreshIcons(sheet);
    }
    /* send-state classes (drives grey/black send + mic hide) */
    var input = $('userInput');
    var fc = $('filePreviewContainer');
    function sync() {
      var hasText = !!(input && input.value.trim());
      var hasFiles = !!(fc && !fc.hidden && fc.querySelector('.jd-upload-chip'));
      document.body.classList.toggle('jdqs-has-text', hasText);
      document.body.classList.toggle('jdqs-has-files', hasFiles);
    }
    if (input && !input.__jdqsSync) { input.__jdqsSync = true; input.addEventListener('input', sync); }
    if (fc && !fc.__jdqsSync && typeof MutationObserver !== 'undefined') {
      fc.__jdqsSync = true;
      new MutationObserver(sync).observe(fc, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    }
    sync();
  }

  /* ========================================================= */
  function init() {
    injectCSS();
    document.documentElement.classList.add('jdqs');
    document.body.classList.add('jdqs');
    if (lsGet('jdqs_rail') === '1' && window.innerWidth >= 1024) document.body.classList.add('jdqs-rail');
    buildSidebar();
    buildTopbar();
    installWraps();
    composerAdditions();
    syncTemp();
    syncEffortLabel();
    setHomeState();
    decorateHistory();
    var box = $('chatBox');
    if (box && typeof MutationObserver !== 'undefined' && !box.__jdqsObs) {
      box.__jdqsObs = true;
      var pending = false;
      new MutationObserver(function () {
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; setHomeState(); });
      }).observe(box, { childList: true });
    }
    refreshIcons(document);
  }

  window.__jdQwenShellApi = { decorateHistory: decorateHistory, openChatMenu: openChatMenu, openProfileMenu: openProfileMenu, version: 'phase2-20261106' };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { init(); } catch (e) { warn('init', e); } });
  else { try { init(); } catch (e) { warn('init', e); } }
})();
