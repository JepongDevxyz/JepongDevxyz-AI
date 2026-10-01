/* JepongDevxyz AI — Model & mode moved to Settings (v1, 2026-10-01)
   - Hides the two header selector pills (Mode + AI Model). The model carousel
     modal (modelModalOverlay) and mode modal are 100% untouched.
   - Adds a "Model & mode" section in Settings (before "AI & tools") with two
     rows that open the EXISTING modals — zero logic changes, pure move.
   - New animations: spinning gradient orb on the AI Model row + staggered
     entrance when Settings opens. Idempotent. */
(function () {
  'use strict';
  if (window.__jdModelSettings) return;
  window.__jdModelSettings = true;

  var CSS = [
    '/* 1) Header pills moved to Settings — hide them in the chat header */',
    '.header-controls .selector-wrapper{display:none!important}',
    '',
    '/* 2) New animation: spinning gradient orb for the AI Model row */',
    '.settings-nav-row .jd-model-orb{position:relative;width:24px;height:24px;flex:0 0 auto;align-self:center;border-radius:50%;padding:3px;',
    'background:conic-gradient(#818cf8,#c084fc,#f0abfc,#67e8f9,#818cf8);',
    '-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;',
    'animation:jdOrbSpin 3s linear infinite;box-shadow:0 0 12px rgba(168,85,247,.45)}',
    '@keyframes jdOrbSpin{to{transform:rotate(360deg)}}',
    '',
    '/* 3) New animation: staggered entrance when Settings opens */',
    '#jdModelSection.jd-in .settings-nav-row{animation:jdRowIn .5s cubic-bezier(.2,.9,.3,1.15) backwards}',
    '#jdModelSection.jd-in .settings-nav-row:nth-child(2){animation-delay:.09s}',
    '@keyframes jdRowIn{from{opacity:0;transform:translateY(12px) scale(.97)}}',
    '',
    '@media (prefers-reduced-motion:reduce){',
    '.settings-nav-row .jd-model-orb{animation:none;box-shadow:none}',
    '#jdModelSection.jd-in .settings-nav-row{animation:none}}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('jd-model-settings-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-model-settings-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function findAiToolsLabel() {
    var labels = document.querySelectorAll('#settingsModal h3.settings-section-label');
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim().toLowerCase() === 'ai & tools') return labels[i];
    }
    return null;
  }

  function mirror(srcId, dstId) {
    var src = document.getElementById(srcId), dst = document.getElementById(dstId);
    if (!src || !dst) return;
    var sync = function () {
      var parts = [];
      for (var i = 0; i < src.childNodes.length; i++) {
        var t = (src.childNodes[i].textContent || '').replace(/\s+/g, ' ').trim();
        if (t) parts.push(t);
      }
      if (parts.length) dst.textContent = parts.join(' ');
    };
    sync();
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(sync).observe(src, { childList: true, characterData: true, subtree: true });
    }
  }

  function build() {
    if (document.getElementById('jdModelSection')) return true;
    var anchor = findAiToolsLabel();
    if (!anchor || !anchor.parentNode) return false;

    var label = document.createElement('h3');
    label.className = 'settings-section-label';
    label.textContent = 'Model & mode';

    var group = document.createElement('div');
    group.className = 'settings-card-group';
    group.id = 'jdModelSection';
    group.innerHTML =
      '<button class="settings-nav-row" type="button" id="jdSettingsModeRow" aria-label="Change mode">' +
        '<i data-lucide="bot"></i>' +
        '<span><strong>Mode</strong><small id="jdSettingsModeLabel">General AI</small></span>' +
        '<i data-lucide="chevron-right"></i>' +
      '</button>' +
      '<button class="settings-nav-row" type="button" id="jdSettingsModelRow" aria-label="Change AI model">' +
        '<span class="jd-model-orb" aria-hidden="true"></span>' +
        '<span><strong>AI Model</strong><small id="jdSettingsModelLabel">Choose model</small></span>' +
        '<i data-lucide="chevron-right"></i>' +
      '</button>';

    anchor.parentNode.insertBefore(label, anchor);
    anchor.parentNode.insertBefore(group, anchor);

    document.getElementById('jdSettingsModeRow').addEventListener('click', function () {
      if (typeof closeSettingsModal === 'function') closeSettingsModal();
      setTimeout(function () {
        if (typeof toggleModal === 'function') toggleModal('modeModalOverlay', true);
      }, 30);
    });
    document.getElementById('jdSettingsModelRow').addEventListener('click', function () {
      if (typeof closeSettingsModal === 'function') closeSettingsModal();
      setTimeout(function () {
        if (typeof openModelPicker === 'function') openModelPicker();
      }, 30);
    });

    if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(group); } catch (e) {} }
    mirror('selectedModeText', 'jdSettingsModeLabel');
    mirror('selectedModelText', 'jdSettingsModelLabel');
    return true;
  }

  function hookEntrance() {
    var modal = document.getElementById('settingsModal');
    if (!modal || typeof MutationObserver === 'undefined') return;
    var wasOpen = modal.classList.contains('open');
    new MutationObserver(function () {
      var isOpen = modal.classList.contains('open');
      if (isOpen && !wasOpen) {
        var sec = document.getElementById('jdModelSection');
        if (sec) {
          sec.classList.remove('jd-in');
          void sec.offsetWidth;
          sec.classList.add('jd-in');
        }
      }
      wasOpen = isOpen;
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  function init() {
    injectCSS();
    if (!build()) {
      var tries = 0;
      var timer = setInterval(function () {
        if (build() || ++tries > 20) clearInterval(timer);
      }, 250);
    }
    hookEntrance();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
