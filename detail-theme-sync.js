/* JepongDevxyz AI — Detail pages theme sync (2026-10-09)
   Light-mode overrides for all Settings detail page inner elements.
   Ensures every detail UI matches the app theme (dark/light).
   Pure CSS addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdDetailThemeSync) return;
  window.__jdDetailThemeSync = true;

  var CSS = [
    /* ===== Personalization (#jdPersPage) ===== */
    '.theme-light .jdpers-drop{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',
    '.theme-light .jdpers-tgl{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',
    '.theme-light .jdpers-text{background:#ffffff!important;border:1px solid rgba(0,0,0,.12)!important;color:#0f172a!important}',
    '.theme-light .jdpers-sheet{background:#ffffff!important;color:#0f172a!important}',
    '.theme-light .jdpers-sheet h3{color:#0f172a!important}',

    /* ===== Usage & Limits (#jdUsePage) ===== */
    '.theme-light .jduse-pcard{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important}',
    '.theme-light .jduse-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important}',
    '.theme-light .jduse-ptitle{color:#0f172a!important}',
    '.theme-light .jduse-ppct{color:#475569!important}',
    '.theme-light .jduse-row{color:#0f172a!important}',
    '.theme-light .jduse-rval{color:#0f172a!important}',
    '.theme-light .jduse-label{color:#64748b!important}',

    /* ===== Mode/Models (model-settings) ===== */
    '.theme-light .jd-model-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',
    '.theme-light .jd-mode-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',

    /* ===== Library (#jdLibPage) ===== */
    '.theme-light #jdLibPage{background:#f6f6f6!important;color:#0f172a!important}',

    /* ===== Memory ===== */
    '.theme-light .jd-mem-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',

    /* ===== Account modal ===== */
    '.theme-light #cloudAccountModal .modal-card{background:#ffffff!important;color:#0f172a!important}',

    /* ===== Custom API Keys ===== */
    '.theme-light #providerKeysModalOverlay .modal-card{background:#ffffff!important;color:#0f172a!important}',

    /* ===== Legal (Terms/Privacy) ===== */
    '.theme-light .jd-legal-policy{background:#ffffff!important;color:#0f172a!important}',
    '.theme-light .jd-legal-policy h1,.theme-light .jd-legal-policy h2{color:#0f172a!important}',
    '.theme-light .jd-legal-policy p{color:#334155!important}',

    /* ===== Extra sheets (JepongDevxyz AI, Cache) ===== */
    '.theme-light .jd-extra-ai-sheet{background:#ffffff!important;color:#0f172a!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdDetailThemeSync')) return;
    var st = document.createElement('style');
    st.id = 'jdDetailThemeSync';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  inject();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
