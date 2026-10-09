/* Muse-style Settings THEME (CSS only, 2026-10-09)
   Pure visual restyle of the ORIGINAL settings modal.
   NO functional changes: no new navigation, no observers, no polling.
   Only makes the existing .settings-card-group / .settings-nav-row look like Muse app.
   Safe: if this fails, the original settings still works. */
(function () {
  'use strict';
  if (window.__jdSettingsMuseTheme) return;
  window.__jdSettingsMuseTheme = true;

  var css = [
    /* Muse app dark theme for settings */
    '#settingsModal .settings-card-group {',
    '  background: #1c1c1e !important;',
    '  border-radius: 16px !important;',
    '  overflow: hidden;',
    '  margin: 0 16px 20px !important;',
    '  border: none !important;',
    '  box-shadow: 0 1px 3px rgba(0,0,0,.3) !important;',
    '}',
    '#settingsModal .settings-nav-row,',
    '#settingsModal .settings-toggle-row {',
    '  padding: 14px 16px !important;',
    '  min-height: 52px !important;',
    '  border-bottom: 1px solid rgba(255,255,255,.06) !important;',
    '}',
    '#settingsModal .settings-nav-row:last-child,',
    '#settingsModal .settings-toggle-row:last-child {',
    '  border-bottom: none !important;',
    '}',
    '#settingsModal .settings-nav-row strong,',
    '#settingsModal .settings-toggle-row strong {',
    '  font-size: 16px !important;',
    '  font-weight: 500 !important;',
    '  color: #f5f5f5 !important;',
    '}',
    '#settingsModal .settings-nav-row svg,',
    '#settingsModal .settings-toggle-row svg {',
    '  width: 22px !important;',
    '  height: 22px !important;',
    '  stroke-width: 1.8 !important;',
    '  color: #a1a1aa !important;',
    '}',
    '#settingsModal .settings-section-label {',
    '  font-size: 13px !important;',
    '  font-weight: 600 !important;',
    '  text-transform: uppercase !important;',
    '  letter-spacing: .06em !important;',
    '  color: #71717a !important;',
    '  padding: 0 32px 8px !important;',
    '}'
  ].join('\n');

  var style = document.createElement('style');
  style.id = 'jdSettingsMuseThemeCss';
  style.textContent = css;
  document.head.appendChild(style);
})();
