/* ============================================================
   JepongDevxyz AI — Delete account (runtime patch, 2026-09-30)
   Adds a "Danger zone" section at the bottom of Settings with a
   Delete account row. Tapping it opens a type-to-confirm dialog;
   confirming calls POST /api/delete-account, then signs the user
   out locally. Guests never see the section.
   Fail-open and idempotent: safe to load twice, never breaks the
   page when elements or globals are missing.
   ============================================================ */
(function () {
    'use strict';
    if (window.__jdAccountDeleteLoaded) return;
    window.__jdAccountDeleteLoaded = true;

    function token() {
        try {
            var fn = window.JDCloudAuthToken;
            if (typeof fn !== 'function') return Promise.resolve('');
            return Promise.resolve(fn()).catch(function () { return ''; });
        } catch (_) { return Promise.resolve(''); }
    }

    function toast(msg) {
        try { if (typeof window.showModernToast === 'function') window.showModernToast(msg); } catch (_) {}
    }

    function haptic(kind) {
        try { if (typeof window.triggerHaptic === 'function') window.triggerHaptic(kind || 'light'); } catch (_) {}
    }

    function refreshIcons(root) {
        try { if (typeof window.refreshLucideIcons === 'function') window.refreshLucideIcons(root || document); } catch (_) {}
    }

    function injectStyles() {
        if (document.getElementById('jdDeleteAccountCss')) return;
        var s = document.createElement('style');
        s.id = 'jdDeleteAccountCss';
        s.textContent =
            '.jd-danger-row{--jd-danger:#f87171;}' +
            '.jd-danger-row>strong,.jd-danger-row strong{color:var(--jd-danger)!important;}' +
            '.jd-danger-row>i[data-lucide]:first-child{color:var(--jd-danger)!important;}' +
            '.jd-delete-modal .settings-card-group{margin:0;}' +
            '.jd-delete-warn{font-size:13px;line-height:1.55;opacity:.85;margin:0 0 12px;}' +
            '.jd-delete-warn b{color:var(--jd-danger,#f87171);}' +
            '.jd-delete-input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;' +
            'border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);color:inherit;' +
            'font-size:14px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;}' +
            '.jd-delete-input:focus{outline:none;border-color:var(--jd-danger,#f87171);}' +
            '.jd-delete-actions{display:flex;gap:10px;justify-content:flex-end;}' +
            '.jd-delete-btn{padding:10px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.14);' +
            'background:transparent;color:inherit;font-size:14px;font-weight:600;cursor:pointer;}' +
            '.jd-delete-btn.danger{background:#dc2626;border-color:#dc2626;color:#fff;}' +
            '.jd-delete-btn:disabled{opacity:.45;cursor:not-allowed;}' +
            '.jd-delete-error{font-size:13px;color:var(--jd-danger,#f87171);margin:0 0 12px;display:none;}';
        document.head.appendChild(s);
    }

    // The Settings scroll that holds the "Legal & privacy" label.
    function findSettingsScroll() {
        var labels = document.querySelectorAll('.settings-section-label');
        for (var i = 0; i < labels.length; i++) {
            if (labels[i].textContent.trim() === 'Legal & privacy') {
                var scroll = labels[i].closest('.settings-home-scroll');
                if (scroll) return scroll;
            }
        }
        return null;
    }

    function ensureDangerZone() {
        if (document.getElementById('jdDeleteAccountRow')) { refreshDangerVisibility(); return; }
        var scroll = findSettingsScroll();
        if (!scroll) return;
        injectStyles();
        var foot = scroll.querySelector('.settings-home-foot');

        var label = document.createElement('h3');
        label.className = 'settings-section-label';
        label.id = 'jdDangerZoneLabel';
        label.textContent = 'Danger zone';

        var group = document.createElement('div');
        group.className = 'settings-card-group';
        group.id = 'jdDangerZoneGroup';
        group.innerHTML =
            '<button class="settings-nav-row jd-danger-row" id="jdDeleteAccountRow" type="button" ' +
            'aria-label="Delete account">' +
            '<i data-lucide="trash-2"></i>' +
            '<span><strong>Delete account</strong>' +
            '<small>Permanently remove your account and all its data</small></span>' +
            '<i data-lucide="chevron-right"></i></button>';

        if (foot) { scroll.insertBefore(label, foot); scroll.insertBefore(group, foot); }
        else { scroll.appendChild(label); scroll.appendChild(group); }

        var btn = document.getElementById('jdDeleteAccountRow');
        if (btn) btn.addEventListener('click', function () { haptic('medium'); openDeleteModal(); });
        refreshIcons(group);
        refreshDangerVisibility();
    }

    function refreshDangerVisibility() {
        var label = document.getElementById('jdDangerZoneLabel');
        var group = document.getElementById('jdDangerZoneGroup');
        if (!label || !group) return;
        token().then(function (t) {
            var show = !!t;
            label.style.display = show ? '' : 'none';
            group.style.display = show ? '' : 'none';
        }).catch(function () {});
    }

    function buildDeleteModal() {
        if (document.getElementById('jdDeleteModal')) return;
        injectStyles();
        var ov = document.createElement('div');
        ov.className = 'modal-overlay jd-delete-modal';
        ov.id = 'jdDeleteModal';
        ov.setAttribute('onclick', 'if(event.target===this&&!window.__jdDeleting)closeJdDeleteModal()');
        ov.innerHTML =
            '<section class="settings-home" role="dialog" aria-modal="true" aria-labelledby="jdDeleteTitle" style="max-width:520px">' +
            '<header class="settings-home-header">' +
            '<button class="settings-back" type="button" onclick="if(!window.__jdDeleting)closeJdDeleteModal()" aria-label="Back"><i data-lucide="arrow-left"></i></button>' +
            '<div class="settings-profile"><div><h2 id="jdDeleteTitle">Delete account?</h2>' +
            '<p>This cannot be undone</p></div></div>' +
            '</header>' +
            '<div class="settings-home-scroll">' +
            '<div class="settings-card-group"><div style="padding:14px 16px">' +
            '<p class="jd-delete-warn">Buburahin nang <b>permanente</b> ang account mo at lahat ng data nito: ' +
            'credits at top-up history, usage stats, Library files, memories, at settings. ' +
            'Hindi na ito maibabalik.</p>' +
            '<p class="jd-delete-error" id="jdDeleteError"></p>' +
            '<input class="jd-delete-input" id="jdDeleteConfirmInput" type="text" ' +
            'placeholder="Type DELETE to confirm" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
            '<div class="jd-delete-actions">' +
            '<button class="jd-delete-btn" type="button" id="jdDeleteCancel">Cancel</button>' +
            '<button class="jd-delete-btn danger" type="button" id="jdDeleteConfirm" disabled>Delete account</button>' +
            '</div></div></div>' +
            '</div></section>';
        document.body.appendChild(ov);
        refreshIcons(ov);

        var input = ov.querySelector('#jdDeleteConfirmInput');
        var confirmBtn = ov.querySelector('#jdDeleteConfirm');
        input.addEventListener('input', function () {
            confirmBtn.disabled = input.value.trim().toUpperCase() !== 'DELETE';
        });
        ov.querySelector('#jdDeleteCancel').addEventListener('click', function () {
            if (!window.__jdDeleting) closeJdDeleteModal();
        });
        confirmBtn.addEventListener('click', doDeleteAccount);
    }

    function showDeleteError(msg) {
        var el = document.getElementById('jdDeleteError');
        if (!el) return;
        el.textContent = msg;
        el.style.display = 'block';
    }

    async function doDeleteAccount() {
        var confirmBtn = document.getElementById('jdDeleteConfirm');
        var cancelBtn = document.getElementById('jdDeleteCancel');
        var input = document.getElementById('jdDeleteConfirmInput');
        window.__jdDeleting = true;
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting…'; }
        if (cancelBtn) cancelBtn.disabled = true;
        if (input) input.disabled = true;
        try {
            var t = await token();
            if (!t) throw new Error('Mag-sign in muna.');
            var r = await fetch('/api/delete-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t },
                credentials: 'same-origin',
                body: JSON.stringify({ confirm: 'DELETE' })
            });
            var d = null;
            try { d = await r.json(); } catch (_) { d = null; }
            if (!r.ok) throw new Error((d && d.error) || 'Hindi natanggal ang account. Subukan ulit.');
            // Server wiped everything: sign out locally and return to guest state.
            closeJdDeleteModal();
            try { if (typeof window.cloudSignOut === 'function') await window.cloudSignOut(); } catch (_) {}
            try { window.dispatchEvent(new Event('jd:account-changed')); } catch (_) {}
            try {
                if (typeof window.closeTransientSurfaces === 'function') window.closeTransientSurfaces();
            } catch (_) {}
            toast('Na-delete na ang account mo.');
        } catch (e) {
            showDeleteError((e && e.message) || 'May nangyaring mali. Subukan ulit.');
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Delete account'; }
            if (cancelBtn) cancelBtn.disabled = false;
            if (input) input.disabled = false;
        } finally {
            window.__jdDeleting = false;
        }
    }

    window.openJdDeleteModal = function () {
        buildDeleteModal();
        var ov = document.getElementById('jdDeleteModal');
        if (!ov) return;
        var err = document.getElementById('jdDeleteError');
        var input = document.getElementById('jdDeleteConfirmInput');
        var confirmBtn = document.getElementById('jdDeleteConfirm');
        if (err) { err.style.display = 'none'; err.textContent = ''; }
        if (input) { input.value = ''; input.disabled = false; }
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Delete account'; }
        var cancelBtn = document.getElementById('jdDeleteCancel');
        if (cancelBtn) cancelBtn.disabled = false;
        ov.classList.add('open');
        refreshIcons(ov);
        setTimeout(function () { try { input.focus(); } catch (_) {} }, 60);
    };

    window.closeJdDeleteModal = function () {
        var ov = document.getElementById('jdDeleteModal');
        if (ov) ov.classList.remove('open');
    };

    function openDeleteModal() { window.openJdDeleteModal(); }

    // Keep the section in place across settings re-renders; hide for guests.
    function observeSettings() {
        try {
            var mo = new MutationObserver(function () { ensureDangerZone(); });
            mo.observe(document.body, { childList: true, subtree: true });
        } catch (_) {}
    }

    ensureDangerZone();
    observeSettings();
    window.addEventListener('jd:account-changed', refreshDangerVisibility);
})();
