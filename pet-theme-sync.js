/* JepongDevxyz AI — Pet/Voice theme sync (2026-10-09)
   Forces the Pet and Voice pages to match the app theme (dark/light).
   Pure CSS addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdPetThemeSync) return;
  window.__jdPetThemeSync = true;

  var CSS = [
    /* Pet page: force theme-aware background */
    '#personalizationPetPage{background:var(--modal-bg,#151d2d)!important;color:var(--text-main)!important}',
    '.theme-light #personalizationPetPage{background:#ffffff!important;color:#0f172a!important}',
    /* Voice page: same */
    '#personalizationVoicePage{background:var(--modal-bg,#151d2d)!important;color:var(--text-main)!important}',
    '.theme-light #personalizationVoicePage{background:#ffffff!important;color:#0f172a!important}',
    /* Pet list items: ensure text is readable in light mode */
    '.theme-light .ps-pet-copy strong{color:#0f172a!important}',
    '.theme-light .ps-pet-copy small{color:#64748b!important}',
    /* Modal container: ensure theme applies */
    '.theme-light #personalizationModalOverlay .personalization-modal.ps-reference-ui{background:#f6f6f6!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdPetThemeSync')) return;
    var st = document.createElement('style');
    st.id = 'jdPetThemeSync';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  inject();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
