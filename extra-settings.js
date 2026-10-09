/* =========================================================
   JepongDevxyz AI — EXTRA settings section
   Runtime patch loaded by agent.js (additive only).

   Injects a new "Extra" section right below the App section
   (before "Legal & privacy") with two toggles, per her order
   (2026-10-05):

     - Slop Filter ...... anti-slop quality gate (slop-gate.js)
     - Tideline Memory ... long-term memory w/ decay (tideline.js)

   Both default OFF on first run (her standing rule: every toggle
   starts off). Tapping the Tideline row (outside the switch) opens
   the fact manager; tapping the Slop row toggles it.

   index.html can't be pushed (913KB > push limit), so the section
   is injected here. Idempotent. Inherits the settings-reorg
   uniform styling automatically.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Cache management (her order 2026-10-05) ----------
     jdClearAppCache(reload): clears CacheStorage (HTTP-cached files)
     without touching localStorage settings or chats.
     v2: Also forces a cache-busting navigation to truly bypass the
     browser HTTP cache (CacheStorage API alone can't clear <script>
     HTTP cache). */
  window.jdClearAppCache = function (reload) {
    function hardReload() {
      if (reload === false) return;
      try {
        /* Clear patch file cache from localStorage/sessionStorage */
        try {
          var keys = [];
          for (var i = 0; i < sessionStorage.length; i++) {
            var k = sessionStorage.key(i);
            if (k && (k.indexOf('jd_patch') !== -1 || k.indexOf('patch') !== -1)) keys.push(k);
          }
          keys.forEach(function(k) { try { sessionStorage.removeItem(k); } catch(_) {} });
        } catch (_) {}
        /* Navigate to a fresh URL to bypass ALL caches (HTTP + memory).
           The ?jd_fresh param is stripped by the app on boot.
           Also add cache-busting for patch files. */
        /* Use href (not replace) to break bfcache, add random param to defeat HTTP cache */
        var url = window.location.origin + window.location.pathname +
                  '?jd_fresh=' + Date.now() + '&jd_nocache=1&jd_cb=' +
                  Math.random().toString(36).slice(2) + window.location.hash;
        try { sessionStorage.setItem('jd_force_fresh', '1'); } catch (_) {}
        window.location.href = url;
      } catch (_) {
        try { location.reload(true); } catch (_) {}
      }
    }
    try {
      /* Clear CacheStorage */
      var cachePromise = Promise.resolve();
      if ('caches' in window && window.caches && window.caches.keys) {
        cachePromise = window.caches.keys().then(function (names) {
          return Promise.all(names.map(function (n) {
            return window.caches.delete(n).catch(function () {});
          }));
        }).catch(function() {});
      }
      /* Unregister service workers */
      var swPromise = Promise.resolve();
      if ('serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
        swPromise = navigator.serviceWorker.getRegistrations().then(function(regs) {
          return Promise.all(regs.map(function(r) { return r.unregister().catch(function(){}); }));
        }).catch(function() {});
      }
      Promise.all([cachePromise, swPromise]).then(hardReload).catch(hardReload);
      /* Safety: hard reload even if APIs hang */
      setTimeout(hardReload, 3000);
    } catch (_) { hardReload(); }
  };
  /* Strip the ?jd_fresh param on boot so it doesn't pollute the URL. */
  try {
    if (window.location.search.indexOf('jd_fresh=') !== -1) {
      var clean = window.location.pathname + window.location.hash;
      window.history.replaceState(null, '', clean);
      // Close any open sidebar/drawers after fresh reload
      setTimeout(function() {
        try {
          document.querySelectorAll('.sidebar.open, .drawer.open').forEach(function(el) {
            el.classList.remove('open');
          });
          var ov = document.querySelector('.sidebar-overlay.open');
          if (ov) ov.classList.remove('open');
          if (window.closeAllDrawers) window.closeAllDrawers();
        } catch(e) {}
      }, 500);
    }
  } catch (_) {}  'use strict';
  if (window.__jdExtraSettingsLoaded) return;
  window.__jdExtraSettingsLoaded = true;

  function inject() {
    try {
      if (document.getElementById('jdExtraSection')) return true;
      var labels = document.querySelectorAll('h3.settings-section-label');
      var legalLabel = null;
      for (var i = 0; i < labels.length; i++) {
        if (labels[i].textContent.trim().toLowerCase() === 'legal & privacy') { legalLabel = labels[i]; break; }
      }
      if (!legalLabel) return false;

      var h = document.createElement('h3');
      h.className = 'settings-section-label';
      h.id = 'jdExtraSectionLabel';
      h.textContent = 'Extra';

      var group = document.createElement('div');
      group.className = 'settings-card-group';
      group.id = 'jdExtraSection';
      /* ONE nav row: "JepongDevxyz AI" — tapping it opens the combined
         Slop Filter + Tideline Memory page (her order 2026-10-05:
         "EXTRA nga sa baba niya JepongDevxyz AI -> pag pinindot naman
         yon tsaka lalabas ang Slop Filter + Tideline Memory"). */
      group.innerHTML =
        '<button class="settings-nav-row" id="jdExtraAiRow" type="button" aria-label="JepongDevxyz AI extra features">' +
          '<i data-lucide="bot"></i>' +
          '<span><strong>JepongDevxyz AI</strong><small>Slop Filter &amp; Tideline Memory</small></span>' +
          '<i data-lucide="chevron-right"></i>' +
        '</button>' +
        '<button class="settings-nav-row" id="jdExtraCacheRow" type="button" aria-label="Cache settings">' +
          '<i data-lucide="trash-2"></i>' +
          '<span><strong>Cache</strong><small>Clear cache &amp; auto-clear</small></span>' +
          '<i data-lucide="chevron-right"></i>' +
        '</button>';

      legalLabel.parentNode.insertBefore(h, legalLabel);
      legalLabel.parentNode.insertBefore(group, legalLabel);

      /* Lucide icons for the new rows. */
      try { if (window.lucide && lucide.createIcons) lucide.createIcons(); } catch (_) {}

      /* Row tap opens the combined Slop Filter + Tideline Memory page. */
      var aiRow = document.getElementById('jdExtraAiRow');
      if (aiRow) aiRow.addEventListener('click', function () {
        try { window.jdExtraOpenAiSheet && window.jdExtraOpenAiSheet(); } catch (_) {}
      });
      /* Cache row opens the dedicated Cache sheet. */
      var cacheRow = document.getElementById('jdExtraCacheRow');
      if (cacheRow) cacheRow.addEventListener('click', function () {
        try { window.jdExtraOpenCacheSheet && window.jdExtraOpenCacheSheet(); } catch (_) {}
      });

      return true;
    } catch (_) { return false; }
  }

  /* ---- Combined page: JepongDevxyz AI -> Slop Filter + Tideline Memory ----
     One sheet, both toggles (default OFF), descriptions, and a shortcut
     into the Tideline fact manager. */
  var AI_SHEET_CSS = [
    '.jd-extra-ai-sheet{position:fixed;inset:0;z-index:12000;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.55)}',
    '.jd-extra-ai-panel{width:100%;max-width:520px;max-height:82vh;overflow-y:auto;background:var(--modal-bg,#1c1c1e);border-radius:22px 22px 0 0;padding:20px 18px}',
    '.jd-extra-ai-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:4px}',
    '.jd-extra-ai-head strong{font-size:17px}',
    '.jd-extra-ai-sub{font-size:12px;opacity:.6;margin-bottom:14px}',
    '.jd-extra-ai-card{background:rgba(148,163,184,.08);border:1px solid rgba(148,163,184,.15);border-radius:14px;padding:12px 14px;margin-bottom:10px}',
    '.jd-extra-ai-card h4{margin:0 0 4px;font-size:15px}',
    '.jd-extra-ai-card p{margin:0 0 10px;font-size:12.5px;opacity:.65;line-height:1.5}',
    '.jd-extra-ai-toggle{display:flex;align-items:center;justify-content:space-between}',
    '.jd-extra-ai-toggle span{font-size:14px;font-weight:600}',
    '.jd-extra-ai-facts{width:100%;border:0;border-radius:10px;padding:10px;font-size:13px;font-weight:700;cursor:pointer;background:rgba(59,130,246,.15);color:#60a5fa;margin-top:10px}',
    '.jd-extra-ai-close{border:0;background:transparent;color:inherit;font-size:13px;opacity:.7;cursor:pointer;padding:10px}',
    '.jd-extra-ai-done{width:100%;border:0;border-radius:12px;padding:12px;font-size:15px;font-weight:700;cursor:pointer;background:#3b82f6;color:#fff;margin-top:4px}'
  ].join('\n');

  function ensureAiSheetCSS() {
    if (document.getElementById('jdExtraAiCss')) return;
    var st = document.createElement('style');
    st.id = 'jdExtraAiCss'; st.textContent = AI_SHEET_CSS;
    document.head.appendChild(st);
  }
  function closeAiSheet() {
    var s = document.querySelector('.jd-extra-ai-sheet');
    if (s) s.remove();
    // Ensure Muse Settings page is visible (return to Settings, not homepage)
    try {
      var sp = document.getElementById('jdSetPage');
      if (sp) {
        sp.removeAttribute('hidden');
        // Re-push to back-nav so Android back works correctly
        if (window.jdBackNav) {
          var st = [];
          try { st = window.jdBackNav.stack() || []; } catch (e) {}
          if (st.indexOf('jdSetPage') === -1) {
            try { window.jdBackNav.push(sp); } catch (e2) {}
          }
        }
      }
    } catch (e) {}
  }

  window.jdExtraOpenAiSheet = function () {
    try {
      ensureAiSheetCSS();
      closeAiSheet();
      var slopOn = !!(window.jdSlopGateEnabled && window.jdSlopGateEnabled());
      var tideOn = !!(window.jdTidelineEnabled && window.jdTidelineEnabled());
      var browseOn = !!(window.jdBrowseAgentEnabled && window.jdBrowseAgentEnabled());
      var dotsOn = !!(window.jdDotsEnabled && window.jdDotsEnabled());
      var apprOn = !!(window.jdApprovalEnabled && window.jdApprovalEnabled());
      var spacesOn = !!(window.jdSpacesEnabled && window.jdSpacesEnabled());
      var skillsOn = !!(window.jdAgentSkillsEnabled && window.jdAgentSkillsEnabled());
      var sheet = document.createElement('div');
      sheet.className = 'jd-extra-ai-sheet';
      sheet.innerHTML =
        '<div class="jd-extra-ai-panel" role="dialog" aria-label="JepongDevxyz AI extra features">' +
        '<div class="jd-extra-ai-head"><strong>🤖 JepongDevxyz AI</strong>' +
        '<button class="jd-extra-ai-close" data-act="close">✕</button></div>' +
        '<div class="jd-extra-ai-sub">Extra AI features — all off by default</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>✨ Slop Filter</h4>' +
        '<p>Anti-slop quality gate. After the AI finishes writing, it silently cleans generic phrases (<i>"As an AI..."</i>, <i>"Great question!"</i>) and emoji spam. Zero token cost.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Slop Filter">' +
        '<input type="checkbox" id="jdExtraSlopToggle"' + (slopOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🌊 Tideline Memory</h4>' +
        '<p>Long-term memory with decay + smart recall. Only your explicit notes are saved — type <b>"tandaan mo: ..."</b> in chat. Unused facts fade; pinned ones never do.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Tideline Memory">' +
        '<input type="checkbox" id="jdExtraTidelineToggle"' + (tideOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '<button class="jd-extra-ai-facts" data-act="facts">Manage facts</button>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🤖 Agent Browse <span style="font-size:10px;opacity:.6;font-weight:400">BETA</span></h4>' +
        '<p>Jev-style browser agent — decides CLICK / TYPE / SELECT step by step using the app\'s current models. Type <b>"browse: &lt;goal&gt;"</b> in chat to start. Powered by the shared <b>Steel</b> pool (all users).</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Agent Browse">' +
        '<input type="checkbox" id="jdExtraBrowseToggle"' + (browseOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '<div class="jd-browse-status" id="jdSteelStatus" style="font-size:12px;opacity:.75;margin-top:10px">○ checking Steel pool…</div>' +
        '<div style="font-size:11px;opacity:.55;margin-top:4px">Keys: Vercel → STEEL_API_KEYS (comma-separated) → redeploy.</div>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🎯 Specialist Dots</h4>' +
        '<p>Custom AI specialists — each with its own name, role, and instructions. Activate one and it shapes every reply.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Specialist Dots">' +
        '<input type="checkbox" id="jdExtraDotsToggle"' + (dotsOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '<button class="jd-extra-ai-facts" data-act="dots">Manage dots</button>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🛡️ Approval Cards</h4>' +
        '<p>Human-in-the-loop for Agent Browse. Every browse action pauses for your <b>Approve & Run</b> / <b>Decline</b> decision in chat.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Approval Cards">' +
        '<input type="checkbox" id="jdExtraApprovalToggle"' + (apprOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>📄 Spaces</h4>' +
        '<p>Document workspace — save chats as pages, search your library, edit with formatting. All stored on your device.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Spaces">' +
        '<input type="checkbox" id="jdExtraSpacesToggle"' + (spacesOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '<button class="jd-extra-ai-facts" data-act="spaces">Open Spaces</button>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>⚡ Agent Skills</h4>' +
        '<p>Slash-command disciplines for the AI: <b>/grill</b> (ask first), <b>/tdd</b>, <b>/review</b>, <b>/debug</b>, <b>/spec</b>, <b>/research</b>, <b>/prototype</b>, <b>/plan</b>. Type <b>/skills</b> in chat for the list.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Enable Agent Skills">' +
        '<input type="checkbox" id="jdExtraAgentSkillsToggle"' + (skillsOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🧵 Goal Threads</h4>' +
        '<p>Unified thread per goal — timeline, notes, and history in one view. Inspired by Paperclip task threads.</p>' +
        '<button class="jd-extra-ai-facts" data-act="goal-threads">Open threads</button>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🧠 Skill Studio</h4>' +
        '<p>View, edit, and test Agent Skills. Changes apply instantly. Version history included.</p>' +
        '<button class="jd-extra-ai-facts" data-act="skill-studio">Open studio</button>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>📅 Routine Manager</h4>' +
        '<p>Powerful scheduled tasks — with owner, schedule, and run history. Inspired by Paperclip routines.</p>' +
        '<button class="jd-extra-ai-facts" data-act="routines">Open routines</button>' +
        '</div>' +

        '<button class="jd-extra-ai-done" data-act="close">Done</button>' +
        '</div>';
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) { closeAiSheet(); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'close') { closeAiSheet(); return; }
        if (act === 'facts') {
          closeAiSheet();
          try { window.jdTidelineOpenManager && window.jdTidelineOpenManager(); } catch (_) {}
        }
        if (act === 'dots') {
          closeAiSheet();
          try { window.jdDotsOpenManager && window.jdDotsOpenManager(); } catch (_) {}
        }
        if (act === 'spaces') {
          closeAiSheet();
          try { window.jdSpacesOpenLibrary && window.jdSpacesOpenLibrary(); } catch (_) {}
        }
        if (act === 'goal-threads') {
          closeAiSheet();
          try {
            // Pick first goal or prompt — for now open a goal picker
            var raw = localStorage.getItem('jd_goals_v2');
            var goals = raw ? JSON.parse(raw) : [];
            if (!goals.length) { try { window.jdOdToast && window.jdOdToast('No goals yet'); } catch (_) {} return; }
            // Open thread for the first active goal
            var g = goals[0];
            for (var i = 0; i < goals.length; i++) { if (goals[i].status !== 'completed') { g = goals[i]; break; } }
            window.jdGoalThreadOpen && window.jdGoalThreadOpen(g.id);
          } catch (_) {}
        }
        if (act === 'skill-studio') {
          closeAiSheet();
          try { window.jdSkillStudioOpen && window.jdSkillStudioOpen(); } catch (_) {}
        }
        if (act === 'routines') {
          closeAiSheet();
          try { window.jdRoutineManagerOpen && window.jdRoutineManagerOpen(); } catch (_) {}
        }
      });
      var slopT = sheet.querySelector('#jdExtraSlopToggle');
      if (slopT) slopT.addEventListener('change', function () {
        try { window.jdSetSlopGate && window.jdSetSlopGate(slopT.checked); } catch (_) {}
        try { if (window.showModernToast) window.showModernToast(slopT.checked ? 'Slop Filter ON ✨' : 'Slop Filter OFF'); } catch (_) {}
      });
      var tideT = sheet.querySelector('#jdExtraTidelineToggle');
      if (tideT) tideT.addEventListener('change', function () {
        try { window.jdSetTideline && window.jdSetTideline(tideT.checked); } catch (_) {}
        try { if (window.showModernToast) window.showModernToast(tideT.checked ? 'Tideline Memory ON 🌊' : 'Tideline Memory OFF'); } catch (_) {}
      });
      var browseT = sheet.querySelector('#jdExtraBrowseToggle');
      if (browseT) browseT.addEventListener('change', function () {
        try { window.jdSetBrowseAgent && window.jdSetBrowseAgent(browseT.checked); } catch (_) {}
        try { if (window.showModernToast) window.showModernToast(browseT.checked ? 'Agent Browse ON 🤖 — type "browse: <goal>" in chat' : 'Agent Browse OFF'); } catch (_) {}
      });
      var dotsT = sheet.querySelector('#jdExtraDotsToggle');
      if (dotsT) dotsT.addEventListener('change', function () {
        try { window.jdSetDots && window.jdSetDots(dotsT.checked); } catch (_) {}
        try { if (window.jdOdToast) window.jdOdToast(dotsT.checked ? 'Specialist Dots ON 🎯' : 'Specialist Dots OFF'); } catch (_) {}
      });
      var apprT = sheet.querySelector('#jdExtraApprovalToggle');
      if (apprT) apprT.addEventListener('change', function () {
        try { window.jdSetApproval && window.jdSetApproval(apprT.checked); } catch (_) {}
        try { if (window.jdOdToast) window.jdOdToast(apprT.checked ? 'Approval Cards ON 🛡️' : 'Approval Cards OFF'); } catch (_) {}
      });
      var spacesT = sheet.querySelector('#jdExtraSpacesToggle');
      if (spacesT) spacesT.addEventListener('change', function () {
        try { window.jdSetSpaces && window.jdSetSpaces(spacesT.checked); } catch (_) {}
        try { if (window.jdOdToast) window.jdOdToast(spacesT.checked ? 'Spaces ON 📄' : 'Spaces OFF'); } catch (_) {}
      });
      var askillsT = sheet.querySelector('#jdExtraAgentSkillsToggle');
      if (askillsT) askillsT.addEventListener('change', function () {
        try { window.jdSetAgentSkills && window.jdSetAgentSkills(askillsT.checked); } catch (_) {}
        try { if (window.jdOdToast) window.jdOdToast(askillsT.checked ? 'Agent Skills ON ⚡ — type /skills in chat' : 'Agent Skills OFF'); } catch (_) {}
      });
      document.body.appendChild(sheet);
      try {
        if (window.jdSteelPoolInfo) {
          window.jdSteelPoolInfo().then(function (info) {
            var st = sheet.querySelector('#jdSteelStatus');
            if (!st) return;
            if (info && info.configured) {
              st.textContent = '● Steel pool: ' + (info.keys || '?') + ' key' + ((info.keys || 0) === 1 ? '' : 's') + ' (shared, rotating)';
            } else {
              st.textContent = '○ Steel pool not configured';
            }
          }).catch(function () {});
        }
      } catch (_) {}
    } catch (_) {}
  };

  /* ---- Dedicated Cache sheet (her order 2026-10-05: separate row below
     JepongDevxyz AI, not inside the AI sheet) ---- */
  window.jdExtraOpenCacheSheet = function () {
    try {
      ensureAiSheetCSS();
      closeAiSheet();
      var autoOn = false;
      try { autoOn = localStorage.getItem('jd_auto_clear_cache') === '1'; } catch (_) {}
      var sheet = document.createElement('div');
      sheet.className = 'jd-extra-ai-sheet';
      sheet.innerHTML =
        '<div class="jd-extra-ai-panel" role="dialog" aria-label="Cache settings">' +
        '<div class="jd-extra-ai-head"><strong>🗑️ Cache</strong>' +
        '<button class="jd-extra-ai-close" data-act="close">✕</button></div>' +
        '<div class="jd-extra-ai-sub">JepongDevxyz AI cached files only — other sites are not affected</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🗑️ Clear Cache Now</h4>' +
        '<p>Clear JepongDevxyz AI\'s cached files immediately when updates don\'t appear. Only this app\'s cache is cleared — your settings, chats, and other websites are kept. The app will reload.</p>' +
        '<button class="jd-extra-ai-clearcache" data-act="clearcache" style="width:100%;padding:12px;border-radius:10px;border:1px solid #374151;background:#1f2937;color:#f3f4f6;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px">🗑️ Clear Cache Now</button>' +
        '</div>' +

        '<div class="jd-extra-ai-card">' +
        '<h4>🔄 Automatic Clear Cache</h4>' +
        '<p>When ON, JepongDevxyz AI\'s cached files are cleared every time the app loads — updates appear immediately without manual clearing. Only this app is affected.</p>' +
        '<div class="jd-extra-ai-toggle"><span>Enable</span>' +
        '<label class="squish-switch-root" aria-label="Automatic Clear Cache">' +
        '<input type="checkbox" id="jdExtraAutoClearToggle"' + (autoOn ? ' checked' : '') + '>' +
        '<span class="squish-switch__track"></span></label></div>' +
        '</div>' +

        '<button class="jd-extra-ai-done" data-act="close">Done</button>' +
        '</div>';
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet) { closeAiSheet(); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'close') { closeAiSheet(); return; }
        if (act === 'clearcache') {
          if (window.jdClearAppCache) {
            try { if (window.showModernToast) window.showModernToast('🗑️ Clearing cache…'); } catch (_) {}
            window.jdClearAppCache(true);
          }
          return;
        }
      });
      var autoT = sheet.querySelector('#jdExtraAutoClearToggle');
      if (autoT) autoT.addEventListener('change', function () {
        try { localStorage.setItem('jd_auto_clear_cache', autoT.checked ? '1' : '0'); } catch (_) {}
        try { if (window.showModernToast) window.showModernToast(autoT.checked ? 'Auto Clear Cache ON 🗑️ — clears on every load' : 'Auto Clear Cache OFF'); } catch (_) {}
      });
      document.body.appendChild(sheet);
    } catch (_) {}
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAiSheet();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { inject(); });
  } else { inject(); }
  /* Retry: settings HTML is static, but be safe if DOM was not ready. */
  var tries = 0;
  var timer = setInterval(function () {
    if (document.getElementById('jdExtraSection') || ++tries > 20) { clearInterval(timer); return; }
    inject();
  }, 500);
})();
