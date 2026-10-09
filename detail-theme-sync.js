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
    'body.theme-light .jdpers-drop{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',
    'body.theme-light .jdpers-tgl{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',
    'body.theme-light .jdpers-text{background:#ffffff!important;border:1px solid rgba(0,0,0,.12)!important;color:#0f172a!important}',
    'body.theme-light .jdpers-sheet{background:#ffffff!important;color:#0f172a!important}',
    'body.theme-light .jdpers-sheet h3{color:#0f172a!important}',

    /* ===== Usage & Limits (#jdUsePage) ===== */
    'body.theme-light .jduse-pcard{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important}',
    'body.theme-light .jduse-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important}',
    'body.theme-light .jduse-ptitle{color:#0f172a!important}',
    'body.theme-light .jduse-ppct{color:#475569!important}',
    'body.theme-light .jduse-row{color:#0f172a!important}',
    'body.theme-light .jduse-rval{color:#0f172a!important}',
    'body.theme-light .jduse-label{color:#64748b!important}',

    /* ===== Mode/Models (model-settings) ===== */
    'body.theme-light .jd-model-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',
    'body.theme-light .jd-mode-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',

    /* ===== Library (#jdLibPage) ===== */
    'body.theme-light #jdLibPage{background:#f6f6f6!important;color:#0f172a!important}',

    /* ===== Memory ===== */
    'body.theme-light .jd-mem-card{background:#ffffff!important;border:1px solid rgba(0,0,0,.08)!important;color:#0f172a!important}',

    /* ===== Account modal ===== */
    'body.theme-light #cloudAccountModal .modal-card{background:#ffffff!important;color:#0f172a!important}',

    /* ===== Custom API Keys ===== */
    'body.theme-light #providerKeysModalOverlay .modal-card{background:#ffffff!important;color:#0f172a!important}',

    /* ===== Legal (Terms/Privacy) ===== */
    'body.theme-light .jd-legal-policy{background:#ffffff!important;color:#0f172a!important}',
    'body.theme-light .jd-legal-policy h1,body.theme-light .jd-legal-policy h2{color:#0f172a!important}',
    'body.theme-light .jd-legal-policy p{color:#334155!important}',

    /* ===== Extra sheets (JepongDevxyz AI, Cache) ===== */
    'body.theme-light .jd-extra-ai-sheet{background:#ffffff!important;color:#0f172a!important}'
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
