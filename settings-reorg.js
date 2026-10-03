/* =========================================================
   JepongDevxyz AI — Settings reorganization (per user request)
   Runtime patch loaded by agent.js (additive only).

   1. Removes ALL subtitles (single-line items only)
   2. Makes UI 100% consistent (uniform size, weight, spacing)
   3. Reorders per user's specified order
   4. Removes: Codex, Prompt Presets, Chat History
   5. Adds: Mode, Models, Permissions, Connectors to AI & Tools

   My AI: Account, Personalization, Library, Memory, Pet, Voice
   AI & Tools: Mode, Models, Reply Notifications, Permissions,
     Connectors, Custom API Keys, Web Search, Response Speech,
     Reconnect notice, Auto Provider Fallback, Smart Model Router, Plugins
   App: (unchanged, minus Chat History)
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdSettingsReorgLoaded) return;
  window.__jdSettingsReorgLoaded = true;

  var CSS = [
    /* Hide ALL subtitles in settings */
    '.settings-nav-row small, .settings-toggle-row small{display:none!important}',
    /* Uniform UI: same size, weight, spacing for all items */
    '.settings-nav-row, .settings-toggle-row{min-height:64px!important;padding:12px 18px!important}',
    '.settings-nav-row strong, .settings-toggle-row strong{font-size:16px!important;font-weight:500!important;line-height:1.3!important}',
    '.settings-nav-row > i:first-child, .settings-toggle-row > i:first-child{width:22px!important;height:22px!important}',
    '.settings-section-label{font-size:13px!important;font-weight:600!important;text-transform:uppercase!important;letter-spacing:.05em!important;color:#888!important;margin:20px 16px 8px!important}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('jdSettingsReorgCss')) return;
    var st = document.createElement('style');
    st.id = 'jdSettingsReorgCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // Items to REMOVE (hide)
  var REMOVE_TITLES = ['Codex', 'ChatGPT & Codex', 'Prompt Presets', 'Chat History'];

  // Desired order for My AI section
  var MY_AI_ORDER = ['Account', 'Personalization', 'Library', 'Memory', 'Pet', 'Voice'];

  // Desired order for AI & Tools section (existing + added items)
  // Per user's corrected list (2026-10-03 19:46 PST)
  var AI_TOOLS_ORDER = [
    'Mode', 'Models', 'Reply Notifications', 'Permissions',
    'Connectors', 'Custom API Keys', 'Web Search', 'Auto Temper', 'Pure Mode',
    'Response Speech', 'Reconnect notice', 'Auto Provider Fallback',
    'Smart Model Router', 'Plugins'
  ];

  function getTitle(btn) {
    try {
      var strong = btn.querySelector('strong');
      return strong ? strong.textContent.trim() : '';
    } catch (e) { return ''; }
  }

  function normalizeTitle(title) {
    // "Pet & Luna" -> "Pet", "Voice & Read Aloud" -> "Voice"
    if (title.indexOf('Pet') === 0) return 'Pet';
    if (title.indexOf('Voice') === 0) return 'Voice';
    return title;
  }

  function reorganize() {
    try {
      injectCSS();

      // Find all settings sections
      var sections = document.querySelectorAll('.settings-card-group');
      if (!sections.length) return;

      sections.forEach(function (section) {
        var label = section.previousElementSibling;
        var sectionName = '';
        if (label && label.classList.contains('settings-section-label')) {
          sectionName = label.textContent.trim();
        }

        var items = Array.prototype.slice.call(section.querySelectorAll('.settings-nav-row, .settings-toggle-row'));

        // Remove unwanted items
        items.forEach(function (item) {
          var title = getTitle(item);
          if (REMOVE_TITLES.indexOf(title) !== -1) {
            item.style.display = 'none';
          }
          // Normalize Pet & Voice titles (remove subtitles already hidden, but update main title)
          var strong = item.querySelector('strong');
          if (strong) {
            var t = strong.textContent.trim();
            if (t === 'Pet & Luna') strong.textContent = 'Pet';
            if (t === 'Voice & Read Aloud') strong.textContent = 'Voice';
          }
        });

        // Reorder My AI section
        if (sectionName === 'My AI') {
          reorderSection(section, MY_AI_ORDER);
        }
        // Reorder AI & Tools section
        else if (sectionName === 'AI & tools' || sectionName === 'AI & Tools') {
          reorderSection(section, AI_TOOLS_ORDER);
          addMissingToolsItems(section);
        }
        // App section: just remove Chat History (already done above)
      });
    } catch (e) {}
  }

  function reorderSection(section, order) {
    try {
      var items = Array.prototype.slice.call(section.querySelectorAll('.settings-nav-row, .settings-toggle-row'));
      // Filter out hidden items
      items = items.filter(function (item) { return item.style.display !== 'none'; });

      // Sort by the desired order
      items.sort(function (a, b) {
        var ta = normalizeTitle(getTitle(a));
        var tb = normalizeTitle(getTitle(b));
        var ia = order.indexOf(ta);
        var ib = order.indexOf(tb);
        // Items not in order list go to the end
        if (ia === -1) ia = 999;
        if (ib === -1) ib = 999;
        return ia - ib;
      });

      // Re-append in sorted order
      items.forEach(function (item) { section.appendChild(item); });
    } catch (e) {}
  }

  function addMissingToolsItems(section) {
    try {
      // Remove any duplicates first (in case of multiple runs)
      var seen = {};
      section.querySelectorAll('[data-jd-custom-tool]').forEach(function (el) {
        var title = getTitle(el);
        if (seen[title]) {
          el.remove();
        } else {
          seen[title] = true;
        }
      });
      // Check if our custom items already exist (after dedup)
      if (section.querySelector('[data-jd-custom-tool="mode"]')) return;

      var items = [
        { key: 'mode', title: 'Mode', icon: 'sliders-horizontal', onclick: "toggleModal('modeModalOverlay', true)" },
        { key: 'models', title: 'Models', icon: 'cpu', onclick: "openModelPicker()" },
        { key: 'permissions', title: 'Permissions', icon: 'shield-check', onclick: "if(window.openJdPermissions)window.openJdPermissions()" },
        { key: 'connectors', title: 'Connectors', icon: 'plug', onclick: "if(window.openJdConnectors)window.openJdConnectors()" }
      ];

      // Insert in reverse order at the top so final order is Mode, Models, Permissions, Connectors
      for (var i = items.length - 1; i >= 0; i--) {
        var cfg = items[i];
        // Skip if already exists
        if (section.querySelector('[data-jd-custom-tool="' + cfg.key + '"]')) continue;
        var btn = document.createElement('button');
        btn.className = 'settings-nav-row';
        btn.type = 'button';
        btn.setAttribute('data-jd-custom-tool', cfg.key);
        btn.setAttribute('onclick', cfg.onclick);
        btn.innerHTML = '<i data-lucide="' + cfg.icon + '"></i><span><strong>' + cfg.title + '</strong></span><i data-lucide="chevron-right"></i>';
        section.insertBefore(btn, section.firstChild);
      }

      // Move Auto Temper and Pure Mode from My AI to AI & Tools if found there
      moveTogglesToTools();

      // Refresh Lucide icons
      if (window.refreshLucideIcons) {
        try { window.refreshLucideIcons(section); } catch (e) {}
      } else if (window.lucide && window.lucide.createIcons) {
        try { window.lucide.createIcons(); } catch (e) {}
      }
    } catch (e) {}
  }

  function moveTogglesToTools() {
    try {
      // Find the AI & Tools section
      var toolsSection = null;
      document.querySelectorAll('.settings-card-group').forEach(function (section) {
        var label = section.previousElementSibling;
        if (label && label.classList.contains('settings-section-label')) {
          var name = label.textContent.trim();
          if (name === 'AI & tools' || name === 'AI & Tools') toolsSection = section;
        }
      });
      if (!toolsSection) return;

      // Find Auto Temper and Pure Mode in My AI section and move them
      document.querySelectorAll('.settings-card-group').forEach(function (section) {
        var label = section.previousElementSibling;
        if (label && label.classList.contains('settings-section-label')) {
          var name = label.textContent.trim();
          if (name === 'My AI') {
            section.querySelectorAll('.settings-nav-row, .settings-toggle-row').forEach(function (item) {
              var title = getTitle(item);
              if (title === 'Auto Temper' || title === 'Pure Mode') {
                // Move to tools section (will be reordered by reorderSection)
                toolsSection.appendChild(item);
              }
            });
          }
        }
      });
    } catch (e) {}
  }

  // Run on load and periodically (settings re-renders)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(reorganize, 1000); });
  } else {
    setTimeout(reorganize, 1000);
  }
  setInterval(reorganize, 3000);
})();
