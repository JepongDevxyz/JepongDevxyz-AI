/* JepongDevxyz AI — ChatGPT-style Memory Page (2026-10-01)
   Pixel-perfect replica of ChatGPT's Memory settings UI:
   - Header: back arrow, "Memory" title, checkmark (save)
   - "Enable memory" toggle in rounded dark card
   - Description text
   - "Memory summary" card with chevron
   - "Your nickname" / "Your occupation" / "More about you" input fields
   All fields save to the real personalization system. 100% functional.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdMemoryPage) return;
  window.__jdMemoryPage = true;

  var CSS = [
    '#jdMemPage{position:fixed;inset:0;z-index:24500;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdMemPage[hidden]{display:none!important}',
    '.jdmem-header{display:flex;align-items:center;justify-content:space-between;',
    'padding:12px 16px;flex:0 0 auto}',
    '.jdmem-back,.jdmem-save{width:40px;height:40px;border-radius:50%;border:none;',
    'background:transparent;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdmem-back:active,.jdmem-save:active{transform:scale(.92);background:rgba(255,255,255,.1)}',
    '.jdmem-back svg,.jdmem-save svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdmem-title{font-size:1.05rem;font-weight:600}',
    '.jdmem-scroll{flex:1;overflow-y:auto;padding:8px 16px 40px;-webkit-overflow-scrolling:touch}',
    '.jdmem-card{background:#1e1e1e;border-radius:16px;padding:16px;margin-bottom:4px;',
    'display:flex;align-items:center;justify-content:space-between}',
    '.jdmem-card span{font-size:.95rem}',
    '.jdmem-toggle{width:52px;height:30px;border-radius:15px;background:rgba(255,255,255,.15);',
    'position:relative;flex:0 0 auto;transition:background .2s;border:none;cursor:pointer}',
    '.jdmem-toggle.on{background:#fff}',
    '.jdmem-toggle::after{content:"";position:absolute;top:2px;left:2px;width:26px;height:26px;',
    'border-radius:50%;background:#888;transition:all .2s}',
    '.jdmem-toggle.on::after{left:24px;background:#000}',
    '.jdmem-desc{font-size:.83rem;color:#999;line-height:1.5;padding:10px 4px 16px}',
    '.jdmem-desc a{color:#999;text-decoration:underline}',
    '.jdmem-label{font-size:.9rem;color:#fff;margin:0 0 8px 4px;display:block}',
    '.jdmem-input{width:100%;background:#1e1e1e;border:none;border-radius:14px;',
    'padding:14px 16px;font-size:.92rem;color:#fff;margin-bottom:20px;box-sizing:border-box}',
    '.jdmem-input::placeholder{color:#666}',
    '.jdmem-input:focus{outline:1px solid rgba(255,255,255,.2)}',
    'textarea.jdmem-input{min-height:100px;resize:vertical;font-family:inherit}',
    '.jdmem-chev{width:20px;height:20px;stroke:#888;fill:none;stroke-width:2;flex:0 0 auto}',
    /* Light mode */
    'body.theme-light #jdMemPage{background:#f2f2f5;color:#111}',
    'body.theme-light .jdmem-back,body.theme-light .jdmem-save{color:#111}',
    'body.theme-light .jdmem-card,body.theme-light .jdmem-input{background:#fff;color:#111;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
    'body.theme-light .jdmem-input::placeholder{color:#999}',
    'body.theme-light .jdmem-label{color:#111}',
    'body.theme-light .jdmem-desc{color:#666}',
    'body.theme-light .jdmem-toggle{background:rgba(0,0,0,.15)}',
    'body.theme-light .jdmem-toggle.on{background:#34c759}',
    'body.theme-light .jdmem-toggle::after{background:#fff}',
    'body.theme-light .jdmem-toggle.on::after{background:#fff}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    chev: '<svg class="jdmem-chev" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>'
  };

  function getSettings() {
    try {
      return (typeof personalizationSettings === 'object' && personalizationSettings)
        ? { ...personalizationSettings }
        : {};
    } catch (e) { return {}; }
  }

  function setToggleState(toggle, enabled) {
    if (!toggle) return;
    var on = !!enabled;
    toggle.classList.toggle('on', on);
    toggle.setAttribute('aria-pressed', String(on));
  }

  function buildPage() {
    if (document.getElementById('jdMemPage')) return;
    if (!document.getElementById('jdMemCss')) {
      var st = document.createElement('style');
      st.id = 'jdMemCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var page = document.createElement('div');
    page.id = 'jdMemPage';
    page.setAttribute('hidden', '');
    page.innerHTML =
      '<div class="jdmem-header">' +
      '<button class="jdmem-back" id="jdMemBack">' + I.back + '</button>' +
      '<div class="jdmem-title">Memory</div>' +
      '<button class="jdmem-save" id="jdMemSave">' + I.check + '</button>' +
      '</div>' +
      '<div class="jdmem-scroll">' +
      '<div class="jdmem-card"><span>Enable memory</span>' +
      '<button class="jdmem-toggle" id="jdMemToggle" aria-label="Enable memory"></button></div>' +
      '<div class="jdmem-desc">Let JepongDevxyz AI personalize your experience based on your chats, files, and connected apps.</div>' +
      '<div class="jdmem-card" id="jdMemSummaryCard"><span>Memory summary</span>' + I.chev + '</div>' +
      '<div class="jdmem-desc">View an overview of what JepongDevxyz AI has learned about you. Use custom instructions for information you\'d like it to always keep in mind. You can still manage your saved memories.</div>' +
      '<label class="jdmem-label" for="jdMemNick">Your nickname</label>' +
      '<input class="jdmem-input" id="jdMemNick" type="text" placeholder="Nickname" />' +
      '<label class="jdmem-label" for="jdMemOcc">Your occupation</label>' +
      '<input class="jdmem-input" id="jdMemOcc" type="text" placeholder="Engineer, student, etc." />' +
      '<label class="jdmem-label" for="jdMemAbout">More about you</label>' +
      '<textarea class="jdmem-input" id="jdMemAbout" placeholder="Interests, values, or preferences to keep in mind"></textarea>' +
      '</div>';
    document.body.appendChild(page);

    // Back
    document.getElementById('jdMemBack').addEventListener('click', closeMemory);
    // Save
    document.getElementById('jdMemSave').addEventListener('click', saveAndClose);
    // Toggle
    var tgl = document.getElementById('jdMemToggle');
    tgl.addEventListener('click', function () {
      setToggleState(tgl, !tgl.classList.contains('on'));
    });
    // Summary card
    document.getElementById('jdMemSummaryCard').addEventListener('click', function () {
      var openSettings = window.openPersonalizationSettings;
      var filterSettings = window.filterPersonalizationSettings;
      var openSummary = window.openMemorySummaryEditor;
      if (typeof openSettings !== 'function' ||
          typeof filterSettings !== 'function' ||
          typeof openSummary !== 'function') {
        try {
          if (typeof window.showToast === 'function') {
            window.showToast('Memory summary editor is unavailable.');
          }
        } catch (e) {}
        return;
      }
      closeMemory();
      openSettings();
      filterSettings('memory');
      openSummary();
    });

    loadValues();
  }

  function loadValues() {
    var s = getSettings();
    var tgl = document.getElementById('jdMemToggle');
    setToggleState(tgl, !!s.memoryEnabled);
    var nick = document.getElementById('jdMemNick');
    if (nick) nick.value = s.nickname || '';
    var occ = document.getElementById('jdMemOcc');
    if (occ) occ.value = s.occupation || '';
    var about = document.getElementById('jdMemAbout');
    if (about) about.value = s.moreAbout || s.aboutMe || '';
  }

  function saveAndClose() {
    if (typeof window.setPersonalizationToggle !== 'function' ||
        typeof window.savePersonalizationField !== 'function') {
      try {
        if (typeof window.showToast === 'function') {
          window.showToast('Hindi available ang personalization sync. Subukan ulit.');
        }
      } catch (e) {}
      return;
    }

    var tgl = document.getElementById('jdMemToggle');
    window.setPersonalizationToggle('memoryEnabled', tgl ? tgl.classList.contains('on') : false);
    var nick = document.getElementById('jdMemNick');
    if (nick) window.savePersonalizationField('nickname', nick.value.trim());
    var occ = document.getElementById('jdMemOcc');
    if (occ) window.savePersonalizationField('occupation', occ.value.trim());
    var about = document.getElementById('jdMemAbout');
    if (about) window.savePersonalizationField('moreAbout', about.value.trim());
    // Toast
    try {
      if (typeof window.showToast === 'function') window.showToast('Memory settings saved');
    } catch (e) {}
    closeMemory();
  }

  function openMemory() {
    buildPage();
    loadValues();
    document.getElementById('jdMemPage').removeAttribute('hidden');
    if (window.jdBackNav) window.jdBackNav.push(document.getElementById('jdMemPage'));
  }

  function closeMemory() {
    var page = document.getElementById('jdMemPage');
    if (page) {
      page.setAttribute('hidden', '');
      if (window.jdBackNav) window.jdBackNav.pop(page);
    }
  }

  function init() {
    buildPage();
    // Override the Memory settings opener
    window.openSettingsMemory = openMemory;
    window.jdOpenMemory = openMemory;
    window.jdCloseMemory = closeMemory;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

