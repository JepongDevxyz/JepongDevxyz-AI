/* JepongDevxyz AI — Muse-style Profile Pill Nav (2026-10-01)
   Adds a pill navigation bar to the account modal, like the Muse app:
   [hamburger menu] ......... [fingerprint]
   Only the two arrowed icons — no middle icons.
   Hamburger: opens the app menu/drawer. Fingerprint: biometric app lock.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdProfilePill) return;
  window.__jdProfilePill = true;

  var CSS = [
    '.jd-pillnav{display:flex;align-items:center;justify-content:space-between;',
    'background:rgba(255,255,255,.08);border-radius:999px;padding:8px 10px;margin:12px 16px;}',
    '.jd-pillnav button{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;',
    'background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;',
    'transition:transform .15s,background .15s;}',
    '.jd-pillnav button:active{transform:scale(.92);background:rgba(255,255,255,.12)}',
    '.jd-pillnav button svg{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:1.8}',
    'body.theme-light .jd-pillnav{background:rgba(0,0,0,.06)}',
    'body.theme-light .jd-pillnav button{background:rgba(0,0,0,.05)}',
    'body.theme-light .jd-pillnav button svg{stroke:#111}',
    'body.theme-light .jd-pillnav button:active{background:rgba(0,0,0,.1)}'
  ].join('\n');

  var ICON_MENU = '<svg viewBox="0 0 24 24"><path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/></svg>';
  var ICON_FINGER = '<svg viewBox="0 0 24 24"><path d="M12 11a3 3 0 0 0-3 3c0 2.5-.5 4.5-1.5 6"/><path d="M12 11a3 3 0 0 1 3 3c0 3-.3 5-1 6.5"/><path d="M12 11v3"/><path d="M8.5 12.5c0-1 .5-2 1-2.7"/><path d="M15.5 12.5c0-1-.5-2-1-2.7"/><path d="M7 14c-.5 1.5-.8 3-1 4.5"/><path d="M17 14c.5 1.5.8 3 1 4.5"/><path d="M5.5 9.5A7 7 0 0 1 19 11c0 1.5-.1 3-.4 4.4"/></svg>';

  function injectCss() {
    if (document.getElementById('jdPillNavCss')) return;
    var st = document.createElement('style');
    st.id = 'jdPillNavCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function openMenu() {
    // Try to open the app's side menu/drawer
    if (typeof window.openMenuFromBrandIcon === 'function') {
      window.openMenuFromBrandIcon();
      return;
    }
    var drawer = document.querySelector('[data-drawer],.drawer,.side-menu,#sideMenu');
    if (drawer) {
      drawer.classList.toggle('open');
      return;
    }
    if (typeof window.jdToast === 'function') window.jdToast('Menu');
  }

  function toggleBiometric() {
    // Biometric app lock toggle
    var key = 'jd_biometric_lock';
    var on = localStorage.getItem(key) === '1';
    if (!on) {
      // Check if WebAuthn/biometric is available
      if (window.PublicKeyCredential) {
        localStorage.setItem(key, '1');
        if (typeof window.jdToast === 'function') window.jdToast('Biometric lock ON');
      } else {
        if (typeof window.jdToast === 'function') window.jdToast('Hindi supported ang biometric sa device na ito');
      }
    } else {
      localStorage.setItem(key, '0');
      if (typeof window.jdToast === 'function') window.jdToast('Biometric lock OFF');
    }
    syncFingerIcon();
  }

  function syncFingerIcon() {
    var btn = document.querySelector('.jd-pillnav [data-act="finger"]');
    if (!btn) return;
    var on = localStorage.getItem('jd_biometric_lock') === '1';
    btn.style.background = on ? 'rgba(52,199,89,.25)' : '';
  }

  function buildPill() {
    var nav = document.createElement('div');
    nav.className = 'jd-pillnav';
    nav.innerHTML =
      '<button data-act="menu" aria-label="Menu">' + ICON_MENU + '</button>' +
      '<button data-act="finger" aria-label="Biometric lock">' + ICON_FINGER + '</button>';

    nav.querySelector('[data-act="menu"]').addEventListener('click', function (e) {
      e.stopPropagation();
      openMenu();
    });
    nav.querySelector('[data-act="finger"]').addEventListener('click', function (e) {
      e.stopPropagation();
      toggleBiometric();
    });
    return nav;
  }

  function inject() {
    injectCss();
    // Find the account modal
    var modal = document.querySelector('#accountModal, .account-modal, [data-account-modal]');
    if (!modal) return;
    if (modal.querySelector('.jd-pillnav')) {
      syncFingerIcon();
      return;
    }
    // Insert after the profile header (avatar + name), or at the top
    var header = modal.querySelector('.profile-header, .account-header, .user-info');
    var pill = buildPill();
    if (header && header.parentNode) {
      header.parentNode.insertBefore(pill, header.nextSibling);
    } else {
      modal.insertBefore(pill, modal.firstChild);
    }
    syncFingerIcon();
  }

  // Watch for the account modal opening
  var obs = new MutationObserver(function () {
    var modal = document.querySelector('#accountModal, .account-modal, [data-account-modal]');
    if (modal && modal.offsetParent !== null) inject();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Also try on load
  if (document.readyState === 'complete') inject();
  else window.addEventListener('load', inject);

  window.jdProfilePillInject = inject;
})();
