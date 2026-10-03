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
      // Find the Mode settings page (the one with "Selected mode").
      var modePage = null;
      document.querySelectorAll('*').forEach(function (el) {
        if (el.textContent && el.textContent.indexOf('Selected mode') !== -1 &&
            el.textContent.indexOf('Custom Persona') !== -1) {
          // Find a suitable container.
          var container = el.closest('div');
          if (container && !modePage) modePage = container;
        }
      });
      if (!modePage) return;

      var existing = document.getElementById(SETTINGS_INPUT_ID);
      var mode = getCurrentMode();

      if (mode === 'custom') {
        if (!existing) {
          var wrapper = document.createElement('div');
          wrapper.id = SETTINGS_INPUT_ID + '-wrap';
          wrapper.style.cssText = 'margin:16px;padding:0';
          var label = document.createElement('div');
          label.textContent = 'Custom persona instructions';
          label.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:8px;color:#fff';
          var input = document.createElement('textarea');
          input.id = SETTINGS_INPUT_ID;
          input.placeholder = 'Type custom persona instructions here...';
          input.rows = 4;
          input.style.cssText = 'width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:#1a1a1a;color:#fff;font-size:15px;resize:vertical';
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
          // Insert after the "Selected mode" card.
          modePage.appendChild(wrapper);
        } else {
          existing.closest('div').style.display = 'block';
        }
      } else {
        if (existing) {
          var wrap = document.getElementById(SETTINGS_INPUT_ID + '-wrap');
          if (wrap) wrap.style.display = 'none';
        }
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
