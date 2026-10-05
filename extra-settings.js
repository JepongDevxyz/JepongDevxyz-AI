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
  }

  window.jdExtraOpenAiSheet = function () {
    try {
      ensureAiSheetCSS();
      closeAiSheet();
      var slopOn = !!(window.jdSlopGateEnabled && window.jdSlopGateEnabled());
      var tideOn = !!(window.jdTidelineEnabled && window.jdTidelineEnabled());
      var browseOn = !!(window.jdBrowseAgentEnabled && window.jdBrowseAgentEnabled());
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
