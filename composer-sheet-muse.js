/* =========================================================
   JepongDevxyz AI — Muse-app attachment sheet (pixel-perfect)
   Runtime patch loaded by agent.js (additive only).

   Matches the Muse app popup from the user's screenshot
   (2026-10-03): Camera, Photos, Videos, Files — in that order,
   floating dark card above the input, left-aligned.

   - Injects the "Videos" row after Photos (video-only picker).
   - Wraps window.composerToolAction to handle 'videos'.
   - Existing rows (Library, Plugins, Vision, Dictionary) stay
     below, same actions — additions only.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdComposerSheetMuseLoaded) return;
  window.__jdComposerSheetMuseLoaded = true;

  function addVideosRow() {
    var sheet = document.getElementById('composerToolSheet');
    if (!sheet || sheet.querySelector('[data-prompt-source="videos"]')) return;
    var photosRow = sheet.querySelector('[data-prompt-source="photos"]');
    if (!photosRow) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'prompt-bar__row';
    btn.setAttribute('role', 'option');
    btn.setAttribute('onmousedown', 'event.preventDefault()');
    btn.setAttribute('data-prompt-source', 'videos');
    btn.setAttribute('onclick', "composerToolAction('videos')");
    btn.innerHTML =
      '<span class="prompt-bar__row-icon"><i data-lucide="circle-play"></i></span>' +
      '<span class="prompt-bar__row-name">Videos</span>' +
      '<span class="prompt-bar__row-desc">Choose videos</span>';
    photosRow.after(btn);
    // Render the Lucide icon if the app uses lucide.createIcons().
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    } catch (e) {}
  }

  function wrapAction() {
    if (typeof window.composerToolAction !== 'function') return false;
    if (window.composerToolAction.__jdMuseWrapped) return true;
    var orig = window.composerToolAction;
    var wrapped = function (action) {
      if (action === 'videos') {
        try {
          if (typeof closeComposerTools === 'function') closeComposerTools();
        } catch (e) {}
        var vi = document.getElementById('jdVideoInput');
        if (!vi) {
          vi = document.createElement('input');
          vi.type = 'file';
          vi.id = 'jdVideoInput';
          vi.hidden = true;
          vi.multiple = true;
          vi.accept = 'video/*';
          vi.onchange = function (ev) {
            try {
              if (typeof window.handleFileSelect === 'function') window.handleFileSelect(ev);
            } catch (e2) {}
          };
          document.body.appendChild(vi);
        }
        vi.click();
        return;
      }
      return orig.apply(this, arguments);
    };
    wrapped.__jdMuseWrapped = true;
    window.composerToolAction = wrapped;
    return true;
  }

  function boot() {
    addVideosRow();
    if (!wrapAction()) {
      // composerToolAction may be defined later — retry briefly.
      var tries = 0;
      var t = setInterval(function () {
        addVideosRow();
        if (wrapAction() || ++tries > 20) clearInterval(t);
      }, 500);
    }
    // Re-add the row if the sheet is re-rendered.
    try {
      new MutationObserver(function () { addVideosRow(); })
        .observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
