/* =========================================================
   JepongDevxyz AI — Custom Persona input relocation
   Runtime patch loaded by agent.js (additive only).

   1. Hides the "Type custom persona..." input from the homepage.
   2. Adds a custom persona input in Settings > Mode, visible
      ONLY when "Custom Persona" mode is selected.
   3. Keeps both in sync so the chat request still works.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdPersonaRelocLoaded) return;
  window.__jdPersonaRelocLoaded = true;

  var SETTINGS_INPUT_ID = 'jdSettingsPersonaInput';

  function hideHomepageInput() {
    try {
      var input = document.getElementById('customPromptInput');
      if (input) input.style.display = 'none';
    } catch (e) {}
  }

  function getCurrentMode() {
    try {
      if (typeof window.currentSelectedMode !== 'undefined' && window.currentSelectedMode) {
        return window.currentSelectedMode;
      }
      return localStorage.getItem('jepong_last_mode') || 'general';
    } catch (e) { return 'general'; }
  }

  function ensureSettingsInput() {
    try {
      // Use the real Mode settings page and its scroll column. Searching all
      // text ancestors can select the outer two-column panel and place the
      // instructions beside the selection card instead of below it.
      var page = document.getElementById('jdModeSettingsPage');
      var modePage = page && page.querySelector('.settings-home-scroll');
      if (!modePage) return;

      var selectedModeLabel = Array.prototype.slice.call(
        modePage.querySelectorAll('.settings-nav-row strong')
      ).find(function (el) { return el.textContent.trim() === 'Selected mode'; });
      var selectedModeCard = selectedModeLabel && selectedModeLabel.closest('.settings-card-group');
      var openModeButton = modePage.querySelector('[data-jd-open]');
      if (!selectedModeCard || !openModeButton) return;

      var existing = document.getElementById(SETTINGS_INPUT_ID);
      var wrapper = document.getElementById(SETTINGS_INPUT_ID + '-wrap');
      var mode = getCurrentMode();

      if (mode === 'custom') {
        if (!existing) {
          wrapper = document.createElement('div');
          wrapper.id = SETTINGS_INPUT_ID + '-wrap';
          wrapper.style.cssText = 'margin:12px 0 16px;padding:0;width:100%;box-sizing:border-box';
          var label = document.createElement('div');
          label.textContent = 'Custom persona instructions';
          label.style.cssText = 'font-size:14px;font-weight:600;margin:0 0 8px;color:#fff';
          var input = document.createElement('textarea');
          input.id = SETTINGS_INPUT_ID;
          input.placeholder = 'Type custom persona instructions here...';
          input.rows = 4;
          input.style.cssText = 'display:block;width:100%;min-width:0;min-height:96px;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:#1a1a1a;color:#fff;font-size:15px;line-height:1.45;resize:vertical';
          // Load existing value.
          try {
            var homeInput = document.getElementById('customPromptInput');
            if (homeInput && homeInput.value) input.value = homeInput.value;
          } catch (e) {}
          // Sync to the hidden homepage input on change.
          input.addEventListener('input', function () {
            try {
              var home = document.getElementById('customPromptInput');
              if (home) home.value = input.value;
              localStorage.setItem('jepong_custom_persona', input.value);
            } catch (e) {}
          });
          wrapper.appendChild(label);
          wrapper.appendChild(input);
        }
        if (!wrapper && existing) wrapper = existing.parentNode;
        if (!wrapper) return;
        wrapper.style.display = 'block';
        // Keep the field directly after the Selected mode card and before
        // Open Mode, within the same responsive scroll column.
        modePage.insertBefore(wrapper, openModeButton);
      } else {
        if (wrapper) wrapper.style.display = 'none';
      }
    } catch (e) {}
  }

  function init() {
    hideHomepageInput();
    ensureSettingsInput();
    // Restore saved persona.
    try {
      var saved = localStorage.getItem('jepong_custom_persona');
      var home = document.getElementById('customPromptInput');
      if (saved && home && !home.value) home.value = saved;
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1000); });
  } else {
    setTimeout(init, 1000);
  }
  setInterval(function () { hideHomepageInput(); ensureSettingsInput(); }, 3000);
})();
