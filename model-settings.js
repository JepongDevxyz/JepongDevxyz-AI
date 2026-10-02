/* JepongDevxyz AI — Mode and model settings pages */
(function () {
  'use strict';
  if (window.__jdModelSettings) return;
  window.__jdModelSettings = true;

  var CSS = [
    '#jdSettingsModeRow>i:first-child,#jdSettingsModelsRow>i:first-child{width:24px;height:24px;color:#f8fafc}',
    'body.theme-light #jdSettingsModeRow>i:first-child,body.theme-light #jdSettingsModelsRow>i:first-child{color:#111827}',
    '#jdSettingsModeLabel,#jdSettingsModelLabel,#jdModePageValue,#jdModelsPageValue{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.jd-choice-settings-home .settings-home-header{grid-template-columns:52px minmax(0,1fr) 52px}',
    '.jd-choice-settings-home .settings-profile{grid-column:2;justify-content:flex-start}',
    '.jd-choice-settings-home .settings-home-scroll{padding-top:24px}',
    '.jd-choice-settings-intro{margin:4px 10px 18px;color:var(--text-muted);font-size:.88rem;line-height:1.55}',
    '.jd-choice-settings-home .settings-section-label{margin-top:20px}',
    '.jd-choice-settings-open{margin-top:18px;border-radius:18px!important;background:#2563eb!important;color:#fff!important;min-height:58px!important;border:0!important;display:flex!important;justify-content:center!important;text-align:center!important;font-weight:600!important}',
    '.jd-choice-settings-open:active{background:#1d4ed8!important}',
    '.jd-settings-picker-overlay{z-index:10020!important}',
    'body.theme-light .jd-choice-settings-open{color:#fff!important}'
  ].join('\n');
  var nav = window.__jdSettingsNavigation || (window.__jdSettingsNavigation = {
    active: false,
    restoring: false,
    returnId: null,
    scrollTop: 0,
    restoreTimer: 0
  });

  function injectCSS() {
    if (document.getElementById('jd-model-settings-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-model-settings-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function findAiToolsGroup() {
    var labels = document.querySelectorAll('#settingsModal h3.settings-section-label');
    for (var i = 0; i < labels.length; i++) {
      if (labels[i].textContent.trim().toLowerCase() === 'ai & tools') {
        var group = labels[i].nextElementSibling;
        return group && group.classList.contains('settings-card-group') ? group : null;
      }
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

  function makePage(id, title, description, valueId, valueLabel, openLabel, icon, clickHandler) {
    if (document.getElementById(id)) return;
    var overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'modal-overlay settings-home-overlay jd-choice-settings-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closePage(id);
    });
    overlay.innerHTML =
      '<section class="settings-home jd-choice-settings-home" role="dialog" aria-modal="true" aria-labelledby="' + id + 'Title">' +
        '<header class="settings-home-header">' +
          '<button class="settings-back" type="button" data-jd-back aria-label="Back to Settings"><i data-lucide="arrow-left"></i></button>' +
          '<div class="settings-profile"><div><h2 id="' + id + 'Title">' + title + '</h2><p>JepongDevxyz AI settings</p></div></div>' +
        '</header>' +
        '<div class="settings-home-scroll">' +
          '<p class="jd-choice-settings-intro">' + description + '</p>' +
          '<h3 class="settings-section-label">Current selection</h3>' +
          '<div class="settings-card-group"><div class="settings-nav-row settings-static-row"><i data-lucide="' + icon + '"></i><span><strong>' + valueLabel + '</strong><small id="' + valueId + '">Loading…</small></span></div></div>' +
          '<button class="settings-nav-row jd-choice-settings-open" type="button" data-jd-open><span><strong>' + openLabel + '</strong></span></button>' +
        '</div>' +
      '</section>';
    document.body.appendChild(overlay);
    overlay.querySelector('[data-jd-back]').addEventListener('click', function () { closePage(id); });
    overlay.querySelector('[data-jd-open]').addEventListener('click', clickHandler);
  }

  function closePage(id) {
    var page = document.getElementById(id);
    if (page) {
      page.classList.remove('open');
      page.setAttribute('aria-hidden', 'true');
    }
    nav.returnId = 'settingsModal';
    if (typeof openSettingsModal === 'function') openSettingsModal();
  }

  function openPage(id) {
    var page = document.getElementById(id);
    if (!page) return;
    if (typeof closeTransientSurfaces === 'function') closeTransientSurfaces(id);
    page.removeAttribute('hidden');
    page.classList.add('open');
    page.setAttribute('aria-hidden', 'false');
    if (typeof refreshLucideIcons === 'function') refreshLucideIcons(page);
  }

  function saveSettingsPosition() {
    var scroll = document.querySelector('#settingsModal .settings-home-scroll');
    if (scroll) nav.scrollTop = scroll.scrollTop;
  }

  function restoreSettingsPosition() {
    var scroll = document.querySelector('#settingsModal .settings-home-scroll');
    if (scroll) scroll.scrollTop = nav.scrollTop || 0;
  }

  function restoreDestination() {
    if (!nav.active) return;
    var destination = nav.returnId || 'settingsModal';
    if (destination === 'jdModeSettingsPage' || destination === 'jdModelsSettingsPage') {
      openPage(destination);
      nav.returnId = 'settingsModal';
      requestAnimationFrame(restoreSettingsPosition);
      return;
    }
    nav.restoring = true;
    if (typeof openSettingsModal === 'function') openSettingsModal();
    nav.restoring = false;
    nav.active = false;
    nav.returnId = null;
    requestAnimationFrame(restoreSettingsPosition);
    setTimeout(function () {
      if (window.jdBackNav) window.jdBackNav.push(document.getElementById('settingsModal'));
    }, 0);
  }

  function hasOtherOpenScreen() {
    var overlays = document.querySelectorAll('.modal-overlay.open');
    for (var i = 0; i < overlays.length; i++) {
      if (overlays[i].id !== 'settingsModal') return true;
    }
    var library = document.getElementById('jdLibPage');
    return !!(library && !library.hidden);
  }

  function scheduleDestinationRestore() {
    clearTimeout(nav.restoreTimer);
    nav.restoreTimer = setTimeout(function () {
      if (nav.active && !hasOtherOpenScreen()) restoreDestination();
    }, 90);
  }

  function installNavigation() {
    if (window.__jdSettingsNavigationInstalled) return;
    window.__jdSettingsNavigationInstalled = true;

    if (typeof window.openSettingsModal === 'function' && !window.openSettingsModal.__jdSettingsWrapped) {
      var originalOpenSettings = window.openSettingsModal;
      var wrappedOpenSettings = function () {
        var isReturn = nav.restoring;
        if (!isReturn) {
          nav.active = false;
          nav.returnId = null;
        }
        var result = originalOpenSettings.apply(this, arguments);
        var settings = document.getElementById('settingsModal');
        if (settings) settings.removeAttribute('hidden');
        requestAnimationFrame(restoreSettingsPosition);
        return result;
      };
      wrappedOpenSettings.__jdSettingsWrapped = true;
      window.openSettingsModal = wrappedOpenSettings;
    }

    if (typeof window.toggleModal === 'function' && !window.toggleModal.__jdSettingsWrapped) {
      var originalToggleModal = window.toggleModal;
      var wrappedToggleModal = function (id, show) {
        if (show) document.getElementById(id)?.removeAttribute('hidden');
        var parentId = nav.pickerParent;
        var isModePicker = id === 'modeModalOverlay' && parentId === 'jdModeSettingsPage';
        var isModelPicker = id === 'modelModalOverlay' && parentId === 'jdModelsSettingsPage';
        if (show && (isModePicker || isModelPicker)) {
          var parent = document.getElementById(parentId);
          var picker = document.getElementById(id);
          if (parent && picker) {
            if (typeof closeTransientSurfaces === 'function') closeTransientSurfaces(id);
            parent.removeAttribute('hidden');
            parent.classList.add('open');
            parent.setAttribute('aria-hidden', 'false');
            picker.removeAttribute('hidden');
            picker.classList.add('jd-settings-picker-overlay', 'open');
            picker.setAttribute('aria-hidden', 'false');
            if (typeof refreshLucideIcons === 'function') refreshLucideIcons(picker);
            return;
          }
        }
        var result = originalToggleModal.apply(this, arguments);
        if (!show && (id === 'modeModalOverlay' || id === 'modelModalOverlay') && nav.pickerParent) {
          var settingsParent = document.getElementById(nav.pickerParent);
          var closedPicker = document.getElementById(id);
          if (closedPicker) {
            closedPicker.classList.remove('jd-settings-picker-overlay');
            closedPicker.setAttribute('aria-hidden', 'true');
          }
          if (settingsParent && settingsParent.classList.contains('open')) {
            settingsParent.setAttribute('aria-hidden', 'false');
            nav.returnId = 'settingsModal';
          }
          nav.pickerParent = null;
        }
        return result;
      };
      wrappedToggleModal.__jdSettingsWrapped = true;
      window.toggleModal = wrappedToggleModal;
    }

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      var settings = document.getElementById('settingsModal');
      if (settings && settings.classList.contains('open')) {
        if (target.closest('#settingsModal .settings-nav-row')) {
          nav.active = true;
          nav.returnId = 'settingsModal';
          saveSettingsPosition();
          return;
        }
        if (target.closest('#settingsModal .settings-back') || target === settings) {
          nav.active = false;
          nav.returnId = null;
        }
      }
      var settingsAction = target.closest('.jd-choice-settings-open');
      if (settingsAction) {
        var page = settingsAction.closest('.jd-choice-settings-overlay');
        if (page) {
          nav.active = true;
          nav.returnId = page.id;
          saveSettingsPosition();
        }
      }
      if (target.closest('.jd-choice-settings-overlay [data-jd-back]')) {
        nav.returnId = 'settingsModal';
      }
    }, true);

    document.addEventListener('jd-back-close', function (event) {
      if (!nav.active) return;
      if (event.target && event.target.id === nav.returnId && nav.returnId !== 'settingsModal') {
        nav.returnId = 'settingsModal';
      }
      restoreDestination();
    });

    var observer = new MutationObserver(scheduleDestinationRestore);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'style']
    });
  }

  function build() {
    if (document.getElementById('jdSettingsModeRow')) return true;
    var group = findAiToolsGroup();
    if (!group) return false;

    var rows = document.createElement('div');
    rows.innerHTML =
      '<button class="settings-nav-row" type="button" id="jdSettingsModeRow" aria-label="Mode settings">' +
        '<i data-lucide="sliders-horizontal" aria-hidden="true"></i>' +
        '<span><strong>Mode</strong><small id="jdSettingsModeLabel">General AI</small></span>' +
        '<i data-lucide="chevron-right" aria-hidden="true"></i>' +
      '</button>' +
      '<button class="settings-nav-row" type="button" id="jdSettingsModelsRow" aria-label="Model settings">' +
        '<i data-lucide="cpu" aria-hidden="true"></i>' +
        '<span><strong>Models</strong><small id="jdSettingsModelLabel">Choose model</small></span>' +
        '<i data-lucide="chevron-right" aria-hidden="true"></i>' +
      '</button>';

    var modeRow = rows.firstElementChild;
    var modelsRow = rows.lastElementChild;
    group.insertBefore(modelsRow, group.firstChild);
    group.insertBefore(modeRow, group.firstChild);

    makePage('jdModeSettingsPage', 'Mode', 'Choose how JepongDevxyz AI should respond. Your selected mode is used for new messages.', 'jdModePageValue', 'Selected mode', 'Open Mode', 'sliders-horizontal', function () {
      nav.active = true;
      nav.returnId = 'jdModeSettingsPage';
      nav.pickerParent = 'jdModeSettingsPage';
      if (typeof toggleModal === 'function') toggleModal('modeModalOverlay', true);
    });
    makePage('jdModelsSettingsPage', 'Models', 'Choose the AI provider and model used for your conversation.', 'jdModelsPageValue', 'Selected model', 'Open Models', 'cpu', function () {
      nav.active = true;
      nav.returnId = 'jdModelsSettingsPage';
      nav.pickerParent = 'jdModelsSettingsPage';
      if (typeof openModelPicker === 'function') openModelPicker();
    });

    modeRow.addEventListener('click', function () { openPage('jdModeSettingsPage'); });
    modelsRow.addEventListener('click', function () { openPage('jdModelsSettingsPage'); });

    if (typeof refreshLucideIcons === 'function') { try { refreshLucideIcons(group); } catch (e) {} }
    mirror('selectedModeText', 'jdSettingsModeLabel');
    mirror('selectedModelText', 'jdSettingsModelLabel');
    mirror('selectedModeText', 'jdModePageValue');
    mirror('selectedModelText', 'jdModelsPageValue');
    installNavigation();
    return true;
  }

  function init() {
    injectCSS();
    if (!build()) {
      var tries = 0;
      var timer = setInterval(function () {
        if (build() || ++tries > 20) clearInterval(timer);
      }, 250);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
