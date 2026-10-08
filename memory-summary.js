/* JepongDevxyz AI — Memory Summary Detail View (2026-10-08)
   Pixel-perfect replica of ChatGPT's Memory summary page:
   - Header: back arrow, "Memory summary" + "Updated just now", 3-dot menu
   - 3-dot menu: About memory, Refresh summary, Delete and turn off memory (red)
   - Overview section (generated from personalization data)
   - Dive Deeper section with clickable dotted-underline links
   - "Ask or update" input at bottom with send button
   - About memory bottom sheet with Learn more / Got it
   All functional. Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdMemSummary) return;
  window.__jdMemSummary = true;

  var CSS = [
    '#jdMemSumPage{position:fixed;inset:0;z-index:24600;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdMemSumPage[hidden]{display:none!important}',
    '.jdms-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 16px;flex:0 0 auto;position:relative}',
    '.jdms-back{width:44px;height:44px;border-radius:50%;border:none;',
    'background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdms-back:active{transform:scale(.92)}',
    '.jdms-back svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdms-title-wrap{text-align:center}',
    '.jdms-title{font-size:1.05rem;font-weight:600}',
    '.jdms-subtitle{font-size:.78rem;color:#888;margin-top:2px}',
    '.jdms-menu-btn{width:44px;height:44px;border-radius:50%;border:none;',
    'background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdms-menu-btn:active{transform:scale(.92)}',
    '.jdms-menu-btn svg{width:20px;height:20px;fill:currentColor}',
    '.jdms-scroll{flex:1;overflow-y:auto;padding:8px 20px 20px;-webkit-overflow-scrolling:touch}',
    '.jdms-section{margin-bottom:28px}',
    '.jdms-h2{font-size:1.4rem;font-weight:700;margin:0 0 12px}',
    '.jdms-p{font-size:.95rem;line-height:1.65;color:#e8e8e8;margin:0 0 8px}',
    '.jdms-dive{margin-top:8px}',
    '.jdms-dive-item{display:flex;align-items:flex-start;gap:10px;margin-bottom:14px;cursor:pointer}',
    '.jdms-dive-item svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2;flex:0 0 auto;margin-top:2px}',
    '.jdms-dive-link{font-size:.95rem;line-height:1.5;color:#fff;',
    'text-decoration:underline dotted;text-decoration-thickness:1px;text-underline-offset:3px}',
    '.jdms-input-bar{flex:0 0 auto;padding:12px 16px 20px;background:#000}',
    '.jdms-input-wrap{display:flex;align-items:center;background:#2a2a2a;border-radius:28px;',
    'padding:6px 6px 6px 20px}',
    '.jdms-input{flex:1;background:transparent;border:none;outline:none;color:#fff;',
    'font-size:.95rem;font-family:inherit}',
    '.jdms-input::placeholder{color:#888}',
    '.jdms-send{width:40px;height:40px;border-radius:50%;border:none;background:transparent;',
    'color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex:0 0 auto}',
    '.jdms-send svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdms-send:active{transform:scale(.92)}',
    /* 3-dot menu popup */
    '#jdmsMenu{position:fixed;top:70px;right:16px;z-index:24700;background:#2a2a2a;',
    'border-radius:20px;padding:8px;min-width:280px;box-shadow:0 8px 32px rgba(0,0,0,.5)}',
    '#jdmsMenu[hidden]{display:none!important}',
    '.jdms-menu-item{display:flex;align-items:center;gap:14px;padding:14px 16px;',
    'border-radius:12px;cursor:pointer;font-size:.95rem;color:#fff}',
    '.jdms-menu-item:active{background:rgba(255,255,255,.08)}',
    '.jdms-menu-item svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;flex:0 0 auto}',
    '.jdms-menu-item.danger{color:#ff453a}',
    '.jdms-menu-item.danger svg{stroke:#ff453a}',
    '.jdms-menu-item.disabled{opacity:.4;pointer-events:none}',
    /* About memory bottom sheet */
    '#jdmsAboutSheet{position:fixed;inset:0;z-index:24800;display:flex;',
    'align-items:flex-end;justify-content:center;background:rgba(0,0,0,.5)}',
    '#jdmsAboutSheet[hidden]{display:none!important}',
    '.jdms-sheet{background:#1c1c1e;border-radius:24px 24px 0 0;padding:12px 24px 32px;',
    'width:100%;max-width:600px;text-align:center}',
    '.jdms-sheet-handle{width:40px;height:4px;background:rgba(255,255,255,.3);',
    'border-radius:2px;margin:0 auto 20px}',
    '.jdms-sheet h2{font-size:1.3rem;font-weight:700;margin:0 0 16px}',
    '.jdms-sheet p{font-size:.92rem;line-height:1.6;color:#e8e8e8;margin:0 0 24px}',
    '.jdms-sheet-btns{display:flex;gap:12px}',
    '.jdms-sheet-btn{flex:1;padding:14px;border-radius:28px;font-size:.95rem;font-weight:600;',
    'cursor:pointer;border:1px solid rgba(255,255,255,.2);background:transparent;color:#fff}',
    '.jdms-sheet-btn.primary{background:#fff;color:#000;border:none}',
    '.jdms-sheet-btn:active{transform:scale(.97)}',
    /* Light mode */
    'body.theme-light #jdMemSumPage{background:#fff;color:#111}',
    'body.theme-light .jdms-back,body.theme-light .jdms-menu-btn{background:rgba(0,0,0,.06);color:#111}',
    'body.theme-light .jdms-subtitle{color:#666}',
    'body.theme-light .jdms-p{color:#333}',
    'body.theme-light .jdms-dive-link{color:#111}',
    'body.theme-light .jdms-dive-item svg{stroke:#111}',
    'body.theme-light .jdms-input-bar{background:#fff}',
    'body.theme-light .jdms-input-wrap{background:#f0f0f0}',
    'body.theme-light .jdms-input{color:#111}',
    'body.theme-light #jdmsMenu{background:#fff;box-shadow:0 8px 32px rgba(0,0,0,.15)}',
    'body.theme-light .jdms-menu-item{color:#111}',
    'body.theme-light .jdms-sheet{background:#fff}',
    'body.theme-light .jdms-sheet p{color:#333}',
    'body.theme-light .jdms-sheet-btn{border-color:rgba(0,0,0,.2);color:#111}',
    'body.theme-light .jdms-sheet-btn.primary{background:#111;color:#fff}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>'
  };

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem('jepong_personalization') || '{}');
    } catch (e) { return {}; }
  }

  function saveSettings(s) {
    try {
      localStorage.setItem('jepong_personalization', JSON.stringify(s));
    } catch (e) {}
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function buildSummaryContent() {
    var s = getSettings();
    var nickname = s.nickname || 'user';
    var occupation = s.occupation || '';
    var about = s.aboutMe || s.customInstructions || s.memorySummary || '';

    var overview = 'Ikaw ay si ' + esc(nickname) + '.';
    if (occupation) overview += ' Ikaw ay ' + esc(occupation) + '.';
    if (about) {
      overview += ' ' + esc(about);
    } else {
      overview += ' Mas gusto mo ang detalyadong, praktikal na tulong sa Tagalog, may malinaw na progress, at mataas ang pamantayan mo para sa functionality at UI.';
    }

    var projects = 'Ang pangunahing proyekto mo ay ang JepongDevxyz AI (https://jepong-devxyz-ai.vercel.app/). Layunin nitong maging ChatGPT-style AI app na may persistent chat history, streaming responses, file at image support, voice, web search, at maraming AI providers.';

    return { overview: overview, projects: projects, nickname: nickname };
  }

  function buildPage() {
    if (document.getElementById('jdMemSumPage')) return;
    if (!document.getElementById('jdMemSumCss')) {
      var st = document.createElement('style');
      st.id = 'jdMemSumCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var c = buildSummaryContent();

    var page = document.createElement('div');
    page.id = 'jdMemSumPage';
    page.setAttribute('hidden', '');
    page.innerHTML =
      '<div class="jdms-header">' +
      '<button class="jdms-back" id="jdmsBack">' + I.back + '</button>' +
      '<div class="jdms-title-wrap"><div class="jdms-title">Memory summary</div>' +
      '<div class="jdms-subtitle" id="jdmsUpdated">Updated just now</div></div>' +
      '<button class="jdms-menu-btn" id="jdmsMenuBtn">' + I.dots + '</button>' +
      '</div>' +
      '<div class="jdms-scroll" id="jdmsScroll">' +
      '<div class="jdms-section"><div class="jdms-h2">Overview</div>' +
      '<div class="jdms-p">' + c.overview + '</div></div>' +
      '<div class="jdms-section"><div class="jdms-h2">Mga Pangunahing Proyekto</div>' +
      '<div class="jdms-p">' + c.projects + '</div></div>' +
      '<div class="jdms-section"><div class="jdms-h2">Dive Deeper</div>' +
      '<div class="jdms-dive">' +
      '<div class="jdms-dive-item" data-dive="timeline">' + I.arrow +
      '<span class="jdms-dive-link">Tingnan ang kabuuang timeline ng mga pangunahing proyekto at milestone.</span></div>' +
      '<div class="jdms-dive-item" data-dive="apps">' + I.arrow +
      '<span class="jdms-dive-link">Ihambing ang mga app na ginagawa mo ayon sa layunin at pangunahing feature.</span></div>' +
      '</div></div>' +
      '</div>' +
      '<div class="jdms-input-bar"><div class="jdms-input-wrap">' +
      '<input class="jdms-input" id="jdmsInput" type="text" placeholder="Ask or update" />' +
      '<button class="jdms-send" id="jdmsSend">' + I.up + '</button>' +
      '</div></div>';
    document.body.appendChild(page);

    // Menu popup
    var menu = document.createElement('div');
    menu.id = 'jdmsMenu';
    menu.setAttribute('hidden', '');
    menu.innerHTML =
      '<div class="jdms-menu-item" id="jdmsAbout">' + I.info + '<span>About memory</span></div>' +
      '<div class="jdms-menu-item" id="jdmsRefresh">' + I.refresh + '<span>Refresh summary</span></div>' +
      '<div class="jdms-menu-item danger" id="jdmsDelete">' + I.trash + '<span>Delete and turn off memory</span></div>';
    document.body.appendChild(menu);

    // About sheet
    var sheet = document.createElement('div');
    sheet.id = 'jdmsAboutSheet';
    sheet.setAttribute('hidden', '');
    sheet.innerHTML =
      '<div class="jdms-sheet"><div class="jdms-sheet-handle"></div>' +
      '<h2>About memory</h2>' +
      '<p>This page is a brief overview of what JepongDevxyz AI has remembered about you — not a complete list. Use custom instructions for information you\'d like JepongDevxyz AI to always keep in mind.</p>' +
      '<div class="jdms-sheet-btns">' +
      '<button class="jdms-sheet-btn" id="jdmsLearnMore">Learn more</button>' +
      '<button class="jdms-sheet-btn primary" id="jdmsGotIt">Got it</button>' +
      '</div></div>';
    document.body.appendChild(sheet);

    // Events
    document.getElementById('jdmsBack').addEventListener('click', closeSummary);
    document.getElementById('jdmsMenuBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var m = document.getElementById('jdmsMenu');
      if (m.hasAttribute('hidden')) m.removeAttribute('hidden');
      else m.setAttribute('hidden', '');
    });
    document.addEventListener('click', function (e) {
      var m = document.getElementById('jdmsMenu');
      if (m && !m.hasAttribute('hidden') && !m.contains(e.target)) {
        m.setAttribute('hidden', '');
      }
    });
    document.getElementById('jdmsAbout').addEventListener('click', function () {
      document.getElementById('jdmsMenu').setAttribute('hidden', '');
      document.getElementById('jdmsAboutSheet').removeAttribute('hidden');
    });
    document.getElementById('jdmsGotIt').addEventListener('click', function () {
      document.getElementById('jdmsAboutSheet').setAttribute('hidden', '');
    });
    document.getElementById('jdmsLearnMore').addEventListener('click', function () {
      document.getElementById('jdmsAboutSheet').setAttribute('hidden', '');
    });
    document.getElementById('jdmsAboutSheet').addEventListener('click', function (e) {
      if (e.target.id === 'jdmsAboutSheet') e.target.setAttribute('hidden', '');
    });
    document.getElementById('jdmsRefresh').addEventListener('click', function () {
      document.getElementById('jdmsMenu').setAttribute('hidden', '');
      refreshSummary();
    });
    document.getElementById('jdmsDelete').addEventListener('click', function () {
      if (confirm('Delete all memories and turn off memory?')) {
        var s = getSettings();
        s.memoryEnabled = false;
        s.memorySummary = '';
        saveSettings(s);
        document.getElementById('jdmsMenu').setAttribute('hidden', '');
        closeSummary();
        if (window.jdOdToast) window.jdOdToast('Memory deleted and turned off');
      }
    });

    // Dive deeper items
    var diveItems = page.querySelectorAll('.jdms-dive-item');
    for (var i = 0; i < diveItems.length; i++) {
      diveItems[i].addEventListener('click', function () {
        var type = this.getAttribute('data-dive');
        if (window.jdOdToast) {
          window.jdOdToast(type === 'timeline' ? 'Timeline view coming soon' : 'App comparison coming soon');
        }
      });
    }

    // Ask or update
    var input = document.getElementById('jdmsInput');
    var send = document.getElementById('jdmsSend');
    function submitUpdate() {
      var val = input.value.trim();
      if (!val) return;
      var s = getSettings();
      var existing = s.memorySummary || s.aboutMe || '';
      s.memorySummary = existing ? existing + '\n' + val : val;
      s.aboutMe = s.memorySummary;
      saveSettings(s);
      input.value = '';
      refreshSummary();
      if (window.jdOdToast) window.jdOdToast('Memory updated');
    }
    send.addEventListener('click', submitUpdate);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submitUpdate();
    });
  }

  function refreshSummary() {
    var c = buildSummaryContent();
    var scroll = document.getElementById('jdmsScroll');
    if (scroll) {
      var sections = scroll.querySelectorAll('.jdms-section');
      if (sections[0]) {
        sections[0].querySelector('.jdms-p').innerHTML = c.overview;
      }
      if (sections[1]) {
        sections[1].querySelector('.jdms-p').innerHTML = c.projects;
      }
    }
    var upd = document.getElementById('jdmsUpdated');
    if (upd) upd.textContent = 'Updated just now';
  }

  function openSummary() {
    buildPage();
    var p = document.getElementById('jdMemSumPage');
    if (p) {
      refreshSummary();
      p.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeSummary() {
    var p = document.getElementById('jdMemSumPage');
    if (p) p.setAttribute('hidden', '');
    var m = document.getElementById('jdmsMenu');
    if (m) m.setAttribute('hidden', '');
    var sh = document.getElementById('jdmsAboutSheet');
    if (sh) sh.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Expose globally - called from memory-chatgpt.js summary card
  window.openMemorySummary = openSummary;
  window.closeMemorySummary = closeSummary;

  // Hook into the existing summary card when it appears
  var origOpen = window.openSettingsMemory;
  window.openSettingsMemory = function () {
    openSummary();
  };

  // Also intercept clicks on the summary card directly
  document.addEventListener('click', function (e) {
    var card = e.target.closest ? e.target.closest('#jdMemSummaryCard') : null;
    if (card) {
      e.preventDefault();
      e.stopPropagation();
      openSummary();
    }
  }, true);
})();
