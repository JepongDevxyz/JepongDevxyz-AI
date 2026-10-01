/* JepongDevxyz AI — ChatGPT-style Personalization Page (2026-10-01)
   Pixel-perfect replica of ChatGPT's Personalization UI:
   - Header: back arrow, "Personalization" title, checkmark (save)
   - Dropdown cards: Base style and tone, Warmth, Enthusiasm, Headers and Lists, Emoji
   - Toggle cards: Fast answers, Suggested prompts (+ descriptions)
   - Custom instructions textarea
   - Advanced (collapsible): Library search toggle
   - NO Reference photos, NO Pet (per user request)
   All controls save to the real personalization system. 100% functional.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdPersonalPage) return;
  window.__jdPersonalPage = true;

  var CSS = [
    '#jdPersPage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdPersPage[hidden]{display:none!important}',
    '.jdpers-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 16px;flex:0 0 auto}',
    '.jdpers-back,.jdpers-save{width:40px;height:40px;border-radius:50%;border:none;',
    'background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdpers-back:active,.jdpers-save:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdpers-back svg,.jdpers-save svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdpers-title{font-size:1.05rem;font-weight:600}',
    '.jdpers-scroll{flex:1;overflow-y:auto;padding:8px 16px 40px;-webkit-overflow-scrolling:touch}',
    /* Dropdown cards */
    '.jdpers-drop{background:#1e1e1e;border-radius:16px;padding:14px 16px;margin-bottom:12px;',
    'display:flex;align-items:center;justify-content:space-between;cursor:pointer;border:none;width:100%;color:#fff;text-align:left}',
    '.jdpers-drop:active{background:#2a2a2a}',
    '.jdpers-drop .jdpers-dt{font-size:.92rem;font-weight:500;display:block}',
    '.jdpers-drop .jdpers-dv{font-size:.85rem;color:#999;display:block;margin-top:2px}',
    '.jdpers-drop svg{width:20px;height:20px;stroke:#888;fill:none;stroke-width:2;flex:0 0 auto}',
    /* Toggle cards */
    '.jdpers-tgl{background:#1e1e1e;border-radius:16px;padding:14px 16px;margin-bottom:4px;',
    'display:flex;align-items:center;justify-content:space-between}',
    '.jdpers-tgl span{font-size:.92rem}',
    '.jdpers-toggle{width:52px;height:30px;border-radius:15px;background:rgba(255,255,255,.15);',
    'position:relative;flex:0 0 auto;transition:background .2s;border:none;cursor:pointer}',
    '.jdpers-toggle.on{background:#fff}',
    '.jdpers-toggle::after{content:"";position:absolute;top:2px;left:2px;width:26px;height:26px;',
    'border-radius:50%;background:#888;transition:all .2s}',
    '.jdpers-toggle.on::after{left:24px;background:#000}',
    '.jdpers-desc{font-size:.83rem;color:#999;line-height:1.5;padding:10px 4px 16px}',
    /* Custom instructions */
    '.jdpers-label{font-size:.9rem;color:#fff;margin:0 0 8px 4px;display:block}',
    '.jdpers-text{width:100%;background:#1e1e1e;border:none;border-radius:14px;',
    'padding:14px 16px;font-size:.9rem;color:#fff;margin-bottom:20px;box-sizing:border-box;',
    'min-height:120px;resize:vertical;font-family:inherit;line-height:1.5}',
    '.jdpers-text:focus{outline:1px solid rgba(255,255,255,.2)}',
    /* Advanced */
    '.jdpers-adv{display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 4px;cursor:pointer;font-size:.9rem;color:#fff;border:none;background:none;width:100%}',
    '.jdpers-adv svg{width:18px;height:18px;stroke:#888;fill:none;stroke-width:2;transition:transform .2s}',
    '.jdpers-adv.open svg{transform:rotate(180deg)}',
    '#jdpersAdvBody{display:none}',
    '#jdpersAdvBody.open{display:block}',
    /* Dropdown sheet */
    '#jdpersSheet{position:fixed;inset:0;z-index:24600;background:rgba(0,0,0,.6);',
    'display:flex;align-items:flex-end;justify-content:center}',
    '#jdpersSheet[hidden]{display:none!important}',
    '.jdpers-sheet{background:#1e1e1e;width:100%;max-width:600px;border-radius:24px 24px 0 0;',
    'padding:12px 0 24px;max-height:60vh;overflow-y:auto}',
    '.jdpers-opt{display:flex;align-items:center;justify-content:space-between;width:100%;',
    'border:none;background:none;color:#fff;padding:14px 20px;font-size:.95rem;cursor:pointer;text-align:left}',
    '.jdpers-opt:active{background:rgba(255,255,255,.08)}',
    '.jdpers-opt.sel{color:#fff;font-weight:600}',
    '.jdpers-opt svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2}',
    /* Light mode */
    'body.theme-light #jdPersPage{background:#f2f2f5;color:#111}',
    'body.theme-light .jdpers-back,body.theme-light .jdpers-save{color:#111}',
    'body.theme-light .jdpers-drop,body.theme-light .jdpers-tgl,body.theme-light .jdpers-text{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
    'body.theme-light .jdpers-label,body.theme-light .jdpers-adv{color:#111}',
    'body.theme-light .jdpers-desc{color:#666}',
    'body.theme-light .jdpers-toggle{background:rgba(0,0,0,.15)}',
    'body.theme-light .jdpers-toggle.on{background:#34c759}',
    'body.theme-light .jdpers-toggle::after{background:#fff}',
    'body.theme-light .jdpers-sheet{background:#fff}',
    'body.theme-light .jdpers-opt{color:#111}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
    chevD: '<svg viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>'
  };

  /* Dropdown options */
  var DROPS = {
    style: ['Professional', 'Casual', 'Friendly', 'Formal', 'Playful', 'Concise'],
    warmth: ['Default', 'Warm', 'Neutral', 'Cool'],
    enthusiasm: ['Default', 'High', 'Moderate', 'Low'],
    headers: ['Default', 'Always use headers', 'Never use headers', 'Use lists often'],
    emoji: ['Default', 'Never use emoji', 'Use sparingly', 'Use freely']
  };

  var DROP_LABELS = {
    style: 'Base style and tone',
    warmth: 'Warmth',
    enthusiasm: 'Enthusiasm',
    headers: 'Headers and Lists',
    emoji: 'Emoji'
  };

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('jepong_personalization') || '{}'); }
    catch (e) { return {}; }
  }
  function saveSettings(s) {
    try { localStorage.setItem('jepong_personalization', JSON.stringify(s)); }
    catch (e) {}
  }

  var currentDrop = null;

  function buildPage() {
    if (document.getElementById('jdPersPage')) return;
    if (!document.getElementById('jdPersCss')) {
      var st = document.createElement('style');
      st.id = 'jdPersCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var page = document.createElement('div');
    page.id = 'jdPersPage';
    page.setAttribute('hidden', '');

    var dropsHtml = Object.keys(DROPS).map(function (k) {
      return '<button class="jdpers-drop" data-drop="' + k + '">' +
        '<span><span class="jdpers-dt">' + DROP_LABELS[k] + '</span>' +
        '<span class="jdpers-dv" id="jdpersVal_' + k + '">Default</span></span>' +
        I.chevD + '</button>';
    }).join('');

    page.innerHTML =
      '<div class="jdpers-header">' +
      '<button class="jdpers-back" id="jdPersBack">' + I.back + '</button>' +
      '<div class="jdpers-title">Personalization</div>' +
      '<button class="jdpers-save" id="jdPersSave">' + I.check + '</button>' +
      '</div>' +
      '<div class="jdpers-scroll">' +
      dropsHtml +
      '<div class="jdpers-tgl"><span>Fast answers</span>' +
      '<button class="jdpers-toggle" id="jdPersFast" aria-label="Fast answers"></button></div>' +
      '<div class="jdpers-desc">JepongDevxyz AI can sometimes use its general knowledge to give fast, in-depth answers. These aren\'t personalized and don\'t use your memory.</div>' +
      '<div class="jdpers-tgl"><span>Suggested prompts</span>' +
      '<button class="jdpers-toggle" id="jdPersSugg" aria-label="Suggested prompts"></button></div>' +
      '<div class="jdpers-desc">JepongDevxyz AI can generate suggestions based on searching connected plugins.</div>' +
      '<label class="jdpers-label">Custom instructions</label>' +
      '<textarea class="jdpers-text" id="jdPersCustom" placeholder="What would you like the AI to know about you?"></textarea>' +
      '<button class="jdpers-adv" id="jdPersAdvBtn"><span>Advanced</span>' + I.chev + '</button>' +
      '<div id="jdpersAdvBody">' +
      '<div class="jdpers-tgl"><span>Library search</span>' +
      '<button class="jdpers-toggle" id="jdPersLib" aria-label="Library search"></button></div>' +
      '<div class="jdpers-desc">Allow JepongDevxyz AI to automatically search Library files for answers.</div>' +
      '</div>' +
      '</div>';

    // Dropdown sheet
    var sheet = document.createElement('div');
    sheet.id = 'jdpersSheet';
    sheet.setAttribute('hidden', '');
    sheet.innerHTML = '<div class="jdpers-sheet" id="jdpersSheetBody"></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet) sheet.setAttribute('hidden', '');
    });

    document.body.appendChild(page);

    document.getElementById('jdPersBack').addEventListener('click', closePers);
    document.getElementById('jdPersSave').addEventListener('click', saveAndClose);

    page.querySelectorAll('.jdpers-drop').forEach(function (btn) {
      btn.addEventListener('click', function () { openDropSheet(btn.dataset.drop); });
    });
    ['jdPersFast', 'jdPersSugg', 'jdPersLib'].forEach(function (id) {
      document.getElementById(id).addEventListener('click', function () {
        this.classList.toggle('on');
      });
    });
    document.getElementById('jdPersAdvBtn').addEventListener('click', function () {
      this.classList.toggle('open');
      document.getElementById('jdpersAdvBody').classList.toggle('open');
    });

    loadValues();
  }

  function openDropSheet(key) {
    currentDrop = key;
    var body = document.getElementById('jdpersSheetBody');
    var s = getSettings();
    var cur = s['pers_' + key] || 'Default';
    body.innerHTML = DROPS[key].map(function (opt) {
      var sel = opt === cur ? ' sel' : '';
      var check = opt === cur ? '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' : '';
      return '<button class="jdpers-opt' + sel + '" data-opt="' + opt + '"><span>' + opt + '</span>' + check + '</button>';
    }).join('');
    body.querySelectorAll('.jdpers-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var s2 = getSettings();
        s2['pers_' + currentDrop] = btn.dataset.opt;
        saveSettings(s2);
        document.getElementById('jdpersVal_' + currentDrop).textContent = btn.dataset.opt;
        document.getElementById('jdpersSheet').setAttribute('hidden', '');
      });
    });
    document.getElementById('jdpersSheet').removeAttribute('hidden');
  }

  function loadValues() {
    var s = getSettings();
    Object.keys(DROPS).forEach(function (k) {
      var el = document.getElementById('jdpersVal_' + k);
      if (el) el.textContent = s['pers_' + k] || 'Default';
    });
    var f = document.getElementById('jdPersFast');
    if (f) f.classList.toggle('on', !!s.fastAnswers);
    var sg = document.getElementById('jdPersSugg');
    if (sg) sg.classList.toggle('on', !!s.suggestedPrompts);
    var lb = document.getElementById('jdPersLib');
    if (lb) lb.classList.toggle('on', !!s.librarySearch);
    var cu = document.getElementById('jdPersCustom');
    if (cu) cu.value = s.customInstructions || '';
  }

  function saveAndClose() {
    var s = getSettings();
    s.fastAnswers = document.getElementById('jdPersFast').classList.contains('on');
    s.suggestedPrompts = document.getElementById('jdPersSugg').classList.contains('on');
    s.librarySearch = document.getElementById('jdPersLib').classList.contains('on');
    s.customInstructions = document.getElementById('jdPersCustom').value.trim();
    saveSettings(s);
    try { if (typeof window.showToast === 'function') window.showToast('Personalization saved'); } catch (e) {}
    closePers();
  }

  function openPers() {
    buildPage();
    loadValues();
    document.getElementById('jdPersPage').removeAttribute('hidden');
    if (window.jdBackNav) window.jdBackNav.push(document.getElementById('jdPersPage'));
  }
  function closePers() {
    var p = document.getElementById('jdPersPage');
    if (p) { p.setAttribute('hidden', ''); if (window.jdBackNav) window.jdBackNav.pop(p); }
    var sh = document.getElementById('jdpersSheet');
    if (sh) sh.setAttribute('hidden', '');
  }

  function init() {
    buildPage();
    window.openPersonalizationSettings = openPers;
    window.jdOpenPersonalization = openPers;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
