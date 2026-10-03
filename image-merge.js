/* =========================================================
   JepongDevxyz AI — Image mode merge patch
   Runtime patch loaded by agent.js (additive only).

   1. Removes "Image Generator" from the AI mode selector
      (the Imagine tab on homepage already auto-generates images).
   2. Merges "Auto Image" + "Flux Image" into one option:
      Default = Flux Image, fallback = Auto Image.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdImageMergeLoaded) return;
  window.__jdImageMergeLoaded = true;

  function mergeImageModels() {
    try {
      // 1. Hide "Image Generator" from the mode selector modal.
      var modeModal = document.getElementById('modeModalOverlay');
      if (modeModal) {
        modeModal.querySelectorAll('.option-item').forEach(function (btn) {
          var onclick = btn.getAttribute('onclick') || '';
          if (onclick.indexOf("'imagen'") !== -1 || onclick.indexOf('"imagen"') !== -1) {
            btn.style.display = 'none';
          }
        });
      }

      // 2. Merge Auto Image + Flux Image into one.
      // Hide the Auto Image button, keep Flux as the single option.
      document.querySelectorAll('[data-provider="image"][data-model="auto"]').forEach(function (btn) {
        btn.style.display = 'none';
      });
      // Update the Flux Image description to reflect the merge.
      document.querySelectorAll('[data-provider="image"][data-model="flux"]').forEach(function (btn) {
        var desc = btn.querySelector('.option-desc');
        if (desc) {
          desc.textContent = 'Flux first, Auto Image fallback';
        }
        var name = btn.querySelector('.option-name');
        if (name && name.textContent.trim() === 'Flux Image') {
          // Keep the name as "Flux Image" — it's the default.
        }
      });

      // 3. If the user had "auto" selected, switch to "flux" (the new default).
      try {
        var current = localStorage.getItem('jepong_image_model');
        if (current === 'auto') {
          localStorage.setItem('jepong_image_model', 'flux');
          if (typeof window.currentSelectedImageModel !== 'undefined') {
            window.currentSelectedImageModel = 'flux';
          }
        }
      } catch (e) {}
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(mergeImageModels, 1000); });
  } else {
    setTimeout(mergeImageModels, 1000);
  }
  // Re-apply when modals open (they re-render).
  setInterval(mergeImageModels, 3000);
})();
