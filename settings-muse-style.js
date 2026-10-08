/* JepongDevxyz AI — Muse App Style Settings (2026-10-08)
   Pure CSS override to make Settings look like the Muse app.
   DOES NOT change functionality — only visual appearance.
   - Preserves all existing settings items and handlers
   - Dark/Light mode synced via body.theme-light
   - Rounded cards, clean spacing, Muse-style toggles
   Idempotent. */
(function () {
  'use strict';
  if (window.__jdSettingsMuseStyle) return;
  window.__jdSettingsMuseStyle = true;

  var CSS = [
    /* ===== Muse App Style Settings ===== */
    /* Card groups - rounded, clean */
    '.settings-card-group{background:#1c1c1e!important;border-radius:16px!important;',
    'overflow:hidden;margin:0 16px 20px!important;border:none!important;',
    'box-shadow:0 1px 3px rgba(0,0,0,.3)!important}',
    'body.theme-light .settings-card-group{background:#ffffff!important;',
    'box-shadow:0 1px 3px rgba(0,0,0,.08)!important}',

    /* Section labels - Muse style (small, uppercase, muted) */
    '.settings-section-label{font-size:.75rem!important;font-weight:600!important;',
    'text-transform:uppercase!important;letter-spacing:.05em!important;',
    'color:#8e8e93!important;margin:24px 32px 8px!important}',
    'body.theme-light .settings-section-label{color:#8e8e93!important}',

    /* Navigation rows - clean with dividers */
    '.settings-nav-row,.settings-entry{display:flex!important;align-items:center!important;',
    'padding:14px 16px!important;min-height:52px!important;',
    'border-bottom:1px solid rgba(255,255,255,.06)!important}',
    '.settings-nav-row:last-child,.settings-entry:last-child{border-bottom:none!important}',
    'body.theme-light .settings-nav-row,body.theme-light .settings-entry{',
    'border-bottom-color:rgba(0,0,0,.06)!important}',

    /* Icons - consistent size */
    '.settings-nav-row > svg:first-child,.settings-nav-row > i:first-child,',
    '.settings-entry > svg:first-child,.settings-entry > i:first-child{',
    'width:22px!important;height:22px!important;margin-right:14px!important;',
    'color:#0a84ff!important;flex-shrink:0!important}',
    'body.theme-light .settings-nav-row > svg:first-child,',
    'body.theme-light .settings-entry > svg:first-child{color:#007aff!important}',

    /* Labels */
    '.settings-nav-row .settings-label,.settings-entry .settings-label{',
    'font-size:1rem!important;font-weight:400!important;flex:1!important}',

    /* Chevrons - iOS style */
    '.settings-nav-row .settings-chevron,.settings-entry .settings-chevron{',
    'color:#8e8e93!important;width:16px!important;height:16px!important}',

    /* Toggles - iOS style */
    '.settings-toggle{width:51px!important;height:31px!important;border-radius:16px!important}',
    '.settings-toggle.on{background:#34c759!important}',
    'body.theme-light .settings-toggle{background:#e9e9ea!important}',
    '.settings-toggle:not(.on){background:#3a3a3c!important}',
    'body.theme-light .settings-toggle:not(.on){background:#e9e9ea!important}',

    /* Profile card */
    '.settings-profile-card{background:#1c1c1e!important;border-radius:16px!important;',
    'margin:16px!important;padding:16px!important;border:none!important}',
    'body.theme-light .settings-profile-card{background:#ffffff!important;',
    'box-shadow:0 1px 3px rgba(0,0,0,.08)!important}',

    /* Header */
    '.settings-home-header{padding:16px!important}',
    '.settings-title{font-size:1.25rem!important;font-weight:700!important}',

    /* Scroll area */
    '.settings-home-scroll{background:#000000!important}',
    'body.theme-light .settings-home-scroll{background:#f2f2f7!important}'
  ].join('\n');

  function inject() {
    if (document.getElementById('jdSettingsMuseStyle')) return;
    var st = document.createElement('style');
    st.id = 'jdSettingsMuseStyle';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // Inject immediately and on DOM ready
  inject();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
