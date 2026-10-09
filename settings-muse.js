/* JepongDevxyz AI — Muse-style Settings (2026-10-01)
   Pixel-perfect replica of the Muse app's Settings UI:
   - Full-screen black page, circular back button, centered "Settings" title
   - Usage card: credits with progress bars (real data)
   - Grouped dark cards with dividers
   - Clean rows: icon + title + chevron (no subtitles)
   - "Your account" section with Sign out (red)
   - NO "Learn more" link (per user request)
   Replaces the old settings modal content. All rows have real handlers.
   Pure addition. Idempotent. */
(function () {
  'use strict';
  if (window.__jdSettingsMuse) return;
  window.__jdSettingsMuse = true;

  var CSS = [
    /* Full-screen page */
    '#jdSetPage{position:fixed;inset:0;z-index:24000;background:#000;color:#fff;',
    'display:flex;flex-direction:column;font-family:inherit}',
    '#jdSetPage[hidden]{display:none!important}',
    /* Header */
    '.jdset-header{display:flex;align-items:center;justify-content:center;',
    'padding:12px 16px;position:relative;flex:0 0 auto}',
    '.jdset-back{position:absolute;left:16px;width:40px;height:40px;border-radius:50%;',
    'border:none;background:#1e1e1e;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jdset-back:active{transform:scale(.92)}',
    '.jdset-back svg{width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.jdset-title{font-size:1.05rem;font-weight:600}',
    /* Scrollable content */
    '.jdset-scroll{flex:1;overflow-y:auto;padding:8px 16px 40px;-webkit-overflow-scrolling:touch}',
    /* Usage card */
    '.jdset-usage{background:#1e1e1e;border-radius:16px;padding:18px;margin-bottom:16px}',
    '.jdset-urow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px}',
    '.jdset-uplan{font-size:.95rem;font-weight:600}',
    '.jdset-upct{font-size:.82rem;color:#999}',
    '.jdset-usub{font-size:.8rem;color:#888;margin-bottom:8px}',
    '.jdset-bar{height:6px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;margin-bottom:14px}',
    '.jdset-bar-fill{height:100%;background:#fff;border-radius:3px;transition:width .5s}',
    '.jdset-upgrade{color:#60a5fa;font-size:.92rem;font-weight:500;background:none;border:none;',
    'padding:0;cursor:pointer;text-align:left}',
    '.jdset-upgrade:active{opacity:.7}',
    /* Group cards */
    '.jdset-group{background:#1e1e1e;border-radius:16px;margin-bottom:16px;overflow:hidden}',
    '.jdset-row{display:flex;align-items:center;gap:14px;width:100%;border:none;background:none;',
    'color:#fff;padding:0 16px;min-height:56px;cursor:pointer;text-align:left;font-size:.95rem}',
    '.jdset-row:active{background:rgba(255,255,255,.05)}',
    '.jdset-row + .jdset-row{border-top:1px solid rgba(255,255,255,.07)}',
    '.jdset-row svg.jdset-ic{width:24px;height:24px;stroke:#fff;fill:none;stroke-width:2;',
    'stroke-linecap:round;stroke-linejoin:round;flex:0 0 auto}',
    '.jdset-row .jdset-label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.jdset-row svg.jdset-chev{width:18px;height:18px;stroke:#888;fill:none;stroke-width:2;flex:0 0 auto}',
    '.jdset-row.danger .jdset-label{color:#ef4444}',
    /* Section label */
    '.jdset-seclabel{font-size:.85rem;color:#999;padding:8px 4px}',
    /* Toggle switch */
    '.jdset-toggle{width:48px;height:28px;border-radius:14px;background:rgba(255,255,255,.15);',
    'position:relative;flex:0 0 auto;transition:background .2s;border:none;cursor:pointer}',
    '.jdset-toggle.on{background:#34c759}',
    '.jdset-toggle::after{content:"";position:absolute;top:2px;left:2px;width:24px;height:24px;',
    'border-radius:50%;background:#fff;transition:left .2s}',
    '.jdset-toggle.on::after{left:22px}',
    /* Light mode */
    '.theme-light #jdSetPage{background:#f2f2f5;color:#111}',
    '.theme-light .jdset-back{background:#e8e8e8;color:#111}',
    '.theme-light .jdset-usage,.theme-light .jdset-group{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.06)}',
    '.theme-light .jdset-row{color:#111}',
    '.theme-light .jdset-row svg.jdset-ic{stroke:#111}',
    '.jdpay-ov{z-index:26000!important}',
    '.theme-light .jdset-row + .jdset-row{border-top-color:rgba(0,0,0,.06)}',
    '.theme-light .jdset-bar{background:rgba(0,0,0,.08)}',
    '.theme-light .jdset-bar-fill{background:#111}',
    '.theme-light .jdset-toggle{background:rgba(0,0,0,.15)}',
    '.theme-light .jdset-toggle.on{background:#34c759}',
    '.jdset-skeleton{background:#1e1e1e;border-radius:16px;min-height:64px;margin-bottom:12px;',
    'animation:jdset-pulse 1.5s ease-in-out infinite}',
    '@keyframes jdset-pulse{0%,100%{opacity:.6}50%{opacity:.3}}',
    '.theme-light .jdset-skeleton{background:#e8e8e8}',
    '#jdSetPage.jdset-loading .jdset-scroll > *:not(.jdset-skeleton-wrap){display:none}',
    '#jdSetDetailSkeleton{position:fixed;inset:0;z-index:950;background:#000;display:flex;flex-direction:column;gap:12px;padding:76px 16px 20px}',
    '#jdSetDetailSkeleton[hidden]{display:none!important}',
    '.jdset-dskel{height:58px;border-radius:16px;background:#1c1c1e;animation:jdset-pulse 1.2s ease-in-out infinite}',
    '.jdset-dskel.tall{height:120px}',
    '.theme-light #jdSetDetailSkeleton{background:#fff}',
    '.theme-light .jdset-dskel{background:#e9e9ee}',
    '.jdset-skeleton-wrap{padding:8px 0}',
    '#jdSetPage:not(.jdset-loading) .jdset-skeleton-wrap{display:none}'
  ].join('\n');

  var I = {
    back: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
    chev: '<svg class="jdset-chev" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
    grid: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>',
    wallet: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/><path d="M16 13h.01"/><path d="M3 7l2-2"/></svg>',
    shield: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    hand: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>',
    chat: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z"/></svg>',
    devices: '<svg class="jdset-ic" viewBox="0 0 24 24"><rect x="2" y="5" width="14" height="10" rx="2"/><path d="M6 19h12"/><path d="M18 9h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3"/></svg>',
    bell: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    brush: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08"/><path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z"/></svg>',
    palette: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h2.356c2.063 0 3.74-1.67 3.74-3.732C21.5 6.5 17 2 12 2z"/></svg>',
    lock: '<svg class="jdset-ic" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    star: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/></svg>',
    home: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/></svg>',
    gift: '<svg class="jdset-ic" viewBox="0 0 24 24"><rect x="4" y="9" width="16" height="3"/><path d="M6 12v8h12v-8"/><path d="M12 9v11"/><path d="M12 9c-4 0-5-2-5-4a2 2 0 0 1 4 0c0 1 1 4 1 4zM12 9c4 0 5-2 5-4a2 2 0 0 0-4 0c0 1-1 4-1 4z"/></svg>',
    database: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
    info: '<svg class="jdset-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><circle cx="12" cy="8" r="0.8" fill="currentColor" stroke="none"/></svg>',
    help: '<svg class="jdset-ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.7c0 1.7-2.4 2.2-2.4 3.8"/><circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none"/></svg>',
    download: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
    shieldcheck: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>',
    user: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    logout: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
    book: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>',
    key: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
    plug: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M9 7V3M15 7V3"/><path d="M7 7h10v4a5 5 0 0 1-10 0V7z"/><line x1="12" y1="16" x2="12" y2="21"/></svg>',
    history: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 1 2.3 5.7"/><path d="M4 18v-5h5"/><path d="M12 8v4l3 2"/></svg>',
    heart: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    zap: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
    message: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    cpu: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/></svg>',
    layers: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>',
    folder: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
    test: '<svg class="jdset-ic" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    smile: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
    paw: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/></svg>',
    mic: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>',
    sliders: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/></svg>',
    import: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    globe: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M2 12h20"/></svg>',
    sparkles: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>',
    ellipsis: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    volume: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>',
    wifi: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>',
    shuffle: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>',
    route: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
    vibrate: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>',
    chart: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
    bot: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
    trash: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>',
    file: '<svg class="jdset-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  };

  /* Settings structure: groups of rows. */
  /* Each row: {icon, label, action} — action is a function name or 'toggle:KEY'. */
  var GROUPS = [
    { label: 'MY AI', rows: [
      { icon: 'user', label: 'Account', fn: 'openAccountModal' },
      { icon: 'smile', label: 'Personalization', fn: 'openPersonalizationSettings' },
      { icon: 'folder', label: 'Library', fn: 'openLibrary' },
      { icon: 'database', label: 'Memory', fn: 'openSettingsMemory' },
      { icon: 'paw', label: 'Pet', fn: 'openSettingsPet' },
      { icon: 'mic', label: 'Voice', fn: 'openSettingsVoice' }
    ]},
    { label: 'AI & TOOLS', rows: [
      { icon: 'sliders', label: 'Mode', fn: 'jdOpenModeSettings' },
      { icon: 'cpu', label: 'Models', fn: 'jdOpenModelsSettings' },
      { icon: 'bell', label: 'Reply Notifications', fn: 'openJdReplyNotifications' },
      { icon: 'hand', label: 'Permissions', fn: 'openJdPermissions' },
      { icon: 'grid', label: 'Connectors', fnPath: '__jdConnectors.open' },
      { icon: 'key', label: 'Custom API Keys', fn: 'openProviderKeysSettings' },
      { icon: 'import', label: 'Import Memory', fn: 'jdOpenImportMemory' },
      { icon: 'globe', label: 'Web Search', toggle: 'webSearch' },
      { icon: 'sparkles', label: 'Auto Temper', toggle: 'autoTemper' },
      { icon: 'ellipsis', label: 'Pure Mode', toggle: 'pureMode' },
      { icon: 'volume', label: 'Response Speech', toggle: 'responseSpeech' },
      { icon: 'wifi', label: 'Reconnect notice', toggle: 'reconnectNotice' },
      { icon: 'shuffle', label: 'Auto Provider Fallback', toggle: 'autoFallback' },
      { icon: 'route', label: 'Smart Model Router', toggle: 'smartRouter' }
    ]},
    { label: 'APP', rows: [
      { icon: 'brush', label: 'Appearance', fn: 'openJdAppearance' },
      { icon: 'vibrate', label: 'Haptics', fn: 'openJdHaptics' },
      { icon: 'chart', label: 'Usage & Limits', fn: 'openUsage' }
    ]},
    { label: 'EXTRA', rows: [
      { icon: 'bot', label: 'JepongDevxyz AI', fn: 'jdExtraOpenAiSheet' },
      { icon: 'trash', label: 'Cache', fn: 'jdExtraOpenCacheSheet' }
    ]},
    { label: 'LEGAL & PRIVACY', rows: [
      { icon: 'file', label: 'Terms of Service', fn: 'openJdLegalPolicy', arg: 'terms' },
      { icon: 'shield', label: 'Privacy Policy', fn: 'openJdLegalPolicy', arg: 'privacy' }
    ]}
  ];
  /* Toggle key -> {checkbox id in original settings, real global fn to call} */
  var TOGGLE_MAP = {
    webSearch:      { checkbox: 'settingsWebSearchToggle', call: 'setLiveWebSearchEnabled' },
    autoTemper:     { checkbox: 'jdAutoTemperToggle',      call: 'toggleJdAutoTemper' },
    pureMode:       { checkbox: 'jdPureModeToggle',         call: 'toggleJdPureMode' },
    responseSpeech: { checkbox: 'responseSpeechToggle',    call: 'toggleResponseSpeech' },
    reconnectNotice:{ checkbox: 'jdReconnectCardToggle',   call: 'setReconnectCardEnabled' },
    autoFallback:   { checkbox: 'autoFallbackToggle',       call: 'toggleAutoFallback' },
    smartRouter:    { checkbox: 'smartRouterToggle',        call: 'toggleSmartRouter' }
  };

  function buildPage() {
    if (document.getElementById('jdSetPage')) return;
    if (!document.getElementById('jdSetMuseCss')) {
      var st = document.createElement('style');
      st.id = 'jdSetMuseCss';
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var page = document.createElement('div');
    page.id = 'jdSetPage';
    page.setAttribute('hidden', '');

    var groupsHtml = GROUPS.map(function (group) {
      var rows = group.rows.map(function (r) {
        var right = I.chev;
        var tag = 'button';
        if (r.toggle) {
          tag = 'div'; // div (not button) to avoid nested-button layout break
          right = '<button class="jdset-toggle" data-toggle="' + r.toggle + '" aria-label="' + r.label + '"></button>';
        }
        var iconHtml = I[r.icon] || I.chev;
        return '<' + tag + ' class="jdset-row" data-fn="' + (r.fn || '') + '" data-fnpath="' + (r.fnPath || '') + '"' +
          ' data-arg="' + (r.arg || '') + '" data-toggle-key="' + (r.toggle || '') + '">' +
          iconHtml + '<span class="jdset-label">' + r.label + '</span>' + right + '</' + tag + '>';
      }).join('');
      return '<div class="jdset-seclabel">' + group.label + '</div><div class="jdset-group">' + rows + '</div>';
    }).join('');

    page.innerHTML =
      '<div class="jdset-header">' +
      '<button class="jdset-back" id="jdSetBack">' + I.back + '</button>' +
      '<div class="jdset-title">Settings</div>' +
      '</div>' +
      '<div class="jdset-scroll">' +
      '<div class="jdset-skeleton-wrap"><div class="jdset-skeleton"></div><div class="jdset-skeleton"></div><div class="jdset-skeleton"></div><div class="jdset-skeleton"></div><div class="jdset-skeleton"></div></div>' +
      '<div id="jdSetDetailSkeleton" hidden><div class="jdset-dskel tall"></div><div class="jdset-dskel"></div><div class="jdset-dskel"></div><div class="jdset-dskel"></div><div class="jdset-dskel"></div></div>' +
      '<div class="jdset-usage" id="jdSetUsage">' +
      '<div class="jdset-urow"><span class="jdset-uplan">Credits</span><span class="jdset-upct" id="jdSetPct">--</span></div>' +
      '<div class="jdset-usub" id="jdSetSub">Loading…</div>' +
      '<div class="jdset-bar"><div class="jdset-bar-fill" id="jdSetBar" style="width:0%"></div></div>' +
      '<button class="jdset-upgrade" id="jdSetTopup">Top up credits</button>' +
      '</div>' +
      groupsHtml +
      '<div class="jdset-seclabel">Your account</div>' +
      '<div class="jdset-group">' +
      '<button class="jdset-row danger" data-fn="jdMuseSignOut" data-fnpath="" data-arg="">' + I.logout + '<span class="jdset-label">Log out</span>' + I.chev + '</button>' +
      '</div>' +
      '<div class="jdset-version" id="jdSetVersion" style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">v20261008a202</div>' +
      '</div>';
    document.body.appendChild(page);

    // Back
    document.getElementById('jdSetBack').addEventListener('click', closeSettings);
    // Fetch live patch version for footer
    try {
      fetch('/patch-version.txt?ts='+Date.now(), {cache:'no-store'})
        .then(function(r){ return r.text(); })
        .then(function(v){
          var el = document.getElementById('jdSetVersion');
          if (el && v) el.textContent = 'v' + v.trim();
        }).catch(function(){});
    } catch(e) {}

    // Log out with user feedback (silent no-op if not signed in is confusing)
    window.jdMuseSignOut = function () {
      try {
        var signedIn = false;
        try { signedIn = !!(window.cloudUser && (window.cloudUser.email || window.cloudUser.id)); } catch (e) {}
        if (!signedIn && typeof window.showModernToast === 'function') {
          window.showModernToast('You are not signed in');
          return;
        }
        if (typeof window.cloudSignOut === 'function') window.cloudSignOut();
      } catch (err) {}
    };

    // Smooth detail navigation (user request 2026-10-09):
    // - Detail opens IMMEDIATELY above the Settings list (no homepage flash)
    // - Muse page drops below modal overlays so the detail is fully clickable
    // - On detail close, Settings returns at the exact scroll position
    // No auto-restore: when detail closes, settings is visible underneath.
    // User taps settings back button to close. Simple, freeze-proof.
    function stopDetailObs() {}

    // Lightweight detail-open check (no getComputedStyle — freeze-proof).
    // Covers: .modal-overlay.open (most modals), .jd-legal-policy.open
    // (Terms/Privacy), .jd-extra-ai-sheet (Cache, in-DOM = open),
    // [id$="Page"]:not([hidden]) (full-screen pages like Usage, Library).
    function detailOpen() {
      try {
        var els = document.querySelectorAll(
          '.modal-overlay.open,' +
          '.jd-legal-policy.open,' +
          '.jd-extra-ai-sheet,' +
          '.jdpay-ov,' +
          '[id$="Page"]:not([hidden]),' +
          '[id$="Overlay"].open'
        );
        for (var i = 0; i < els.length; i++) {
          var id = els[i].id;
          if (id === 'jdSetPage' || id === 'settingsModal' || id === 'jdSetDetailSkeleton') continue;
          return true;
        }
      } catch (e) {}
      return false;
    }

    function openDetailSmooth(openFn) {
      var page = document.getElementById('jdSetPage');
      var dskel = document.getElementById('jdSetDetailSkeleton');
      if (dskel) dskel.removeAttribute('hidden');
      window.__jdSetOpeningDetail = true;
      try { openFn(); } catch (e) {}
      window.__jdSetOpeningDetail = false;
      // Boost any opened detail above settings (z-24000 -> z-25000).
      // Retry for 2s in case detail opens late. Settings stays interactive.
      var boostCount = 0;
      var boostTimer = setInterval(function () {
        boostCount++;
        var details = document.querySelectorAll(
          '.modal-overlay.open,' +
          '.modal-overlay:not([style*="display: none"]),' +
          '.jd-legal-policy.open,' +
          '[id$="Page"]:not([hidden]),' +
          '[id$="Overlay"]:not([hidden])'
        );
        var boosted = false;
        details.forEach(function (d) {
          if (d.id !== 'jdSetPage' && d.id !== 'jdSetDetailSkeleton') {
            var cs = window.getComputedStyle(d);
            if (cs.display !== 'none' && cs.visibility !== 'hidden') {
              d.style.setProperty('z-index', '25000', 'important');
              boosted = true;
            }
          }
        });
        if (boostCount >= 10 || (boosted && boostCount >= 3)) {
          clearInterval(boostTimer);
          var ds = document.getElementById('jdSetDetailSkeleton');
          if (ds) ds.setAttribute('hidden', '');
        }
      }, 200);
    }

    // Row clicks: open the detail SMOOTHLY above the Settings list.
    // The Settings page stays open underneath (scroll saved); the detail
    // opens immediately with no homepage flash. On detail close, we return
    // to the exact spot in the Settings list.
    page.querySelectorAll('.jdset-row').forEach(function (row) {
      row.addEventListener('click', function (e) {
        // If it's a toggle button, don't trigger row action
        if (e.target.classList.contains('jdset-toggle')) return;
        var fnPath = row.dataset.fnpath;
        var fn = row.dataset.fn;
        var arg = row.dataset.arg;
        if (!fnPath && !fn) return;
        openDetailSmooth(function () {
          if (fnPath) {
            // Dotted path like __jdConnectors.open
            var parts = fnPath.split('.');
            var obj = window;
            for (var i = 0; i < parts.length; i++) { obj = obj ? obj[parts[i]] : undefined; }
            if (typeof obj === 'function') { obj(); return; }
          }
          if (fn && typeof window[fn] === 'function') {
            if (arg) window[fn](arg); else window[fn]();
          }
        });
      });
    });

    // Toggle switches — call the REAL app functions, read REAL state
    page.querySelectorAll('.jdset-toggle').forEach(function (tgl) {
      var key = tgl.dataset.toggle;
      var map = (typeof TOGGLE_MAP !== 'undefined' && TOGGLE_MAP[key]) || null;
      // Initial state: read the original settings checkbox if present
      var isOn = false;
      try {
        if (map && map.checkbox) {
          var cb = document.getElementById(map.checkbox);
          if (cb) isOn = !!cb.checked;
        }
        if (!isOn) {
          var s = JSON.parse(localStorage.getItem('jepong_personalization') || '{}');
          isOn = !!s[key];
        }
      } catch (e) {}
      tgl.classList.toggle('on', isOn);
      tgl.setAttribute('aria-pressed', isOn ? 'true' : 'false');
      tgl.addEventListener('click', function (e) {
        e.stopPropagation();
        var on = !tgl.classList.contains('on');
        tgl.classList.toggle('on', on);
        tgl.setAttribute('aria-pressed', on ? 'true' : 'false');
        try {
          // 1) Call the real app toggle function
          if (map && map.call && typeof window[map.call] === 'function') {
            window[map.call](on);
          }
          // 2) Mirror to the original checkbox so both stay in sync
          if (map && map.checkbox) {
            var cb2 = document.getElementById(map.checkbox);
            if (cb2 && cb2.checked !== on) {
              cb2.checked = on;
              // fire change for any listeners
              var ev = document.createEvent('HTMLEvents');
              ev.initEvent('change', true, false);
              cb2.dispatchEvent(ev);
            }
          }
          // 3) Persist
          var s2 = JSON.parse(localStorage.getItem('jepong_personalization') || '{}');
          s2[key] = on;
          localStorage.setItem('jepong_personalization', JSON.stringify(s2));
        } catch (e2) {}
      });
    });

    // Top up
    document.getElementById('jdSetTopup').addEventListener('click', function () {
      openDetailSmooth(function () {
        try {
          if (window.JDCredits && typeof window.JDCredits.openTopup === 'function') { window.JDCredits.openTopup(); return; }
          if (typeof window.openTopup === 'function') { window.openTopup(); return; }
          if (typeof window.openPaymongoTopup === 'function') { window.openPaymongoTopup(); return; }
          if (window.showModernToast) window.showModernToast('Top-up is not available right now');
        } catch (e) {}
      });
    });
  }

  function updateUsage() {
    // Get real credit data from JDCredits (credits.js)
    try {
      var pct = document.getElementById('jdSetPct');
      var sub = document.getElementById('jdSetSub');
      var bar = document.getElementById('jdSetBar');
      if (!pct || !sub || !bar) return;
      var shown = false;
      // Signed-in balance
      try {
        if (window.JDCredits && window.JDCredits.balance != null) {
          var bal = window.JDCredits.balance;
          var total = 500;
          var pctLeft = Math.round((bal / total) * 100);
          if (!isNaN(pctLeft)) {
            pct.textContent = pctLeft + '% left';
            sub.textContent = bal + ' of ' + total + ' credits';
            bar.style.width = Math.max(0, Math.min(100, pctLeft)) + '%';
            shown = true;
          }
        }
      } catch (e) {}
      // Guest credits fallback
      if (!shown) {
        try {
          var gbal = parseInt(localStorage.getItem('jd_guest_credit_mirror') || '100', 10);
          if (isNaN(gbal)) gbal = 100;
          var gpct = Math.round((gbal / 100) * 100);
          pct.textContent = gpct + '% left';
          sub.textContent = gbal + ' guest credits (resets daily)';
          bar.style.width = Math.max(0, Math.min(100, gpct)) + '%';
          shown = true;
        } catch (e2) {}
      }
      if (!shown) {
        pct.textContent = '--';
        sub.textContent = 'Sign in to see credits';
      }
    } catch (e) {}
  }

  function openSettings() {
    buildPage();
    var page = document.getElementById('jdSetPage');
    page.removeAttribute('hidden');
    // Skeleton loader shows immediately (no homepage visible), then reveals
    page.classList.add('jdset-loading');
    setTimeout(function () {
      page.classList.remove('jdset-loading');
      try { updateUsage(); } catch (e) {}
    }, 400);
    // Hide old modal
    var old = document.getElementById('settingsModal');
    if (old) old.classList.remove('open');
    if (window.jdBackNav) window.jdBackNav.push(page);
  }

  function closeSettings() {
    // Don't hide if we're in the middle of opening a detail
    // (the detail's openFn calls closeSettingsModal internally)
    if (window.__jdSetOpeningDetail) return;
    var page = document.getElementById('jdSetPage');
    if (!page) return;
    page.setAttribute('hidden', '');
    if (window.jdBackNav) { try { window.jdBackNav.pop(page); } catch (e) {} }
  }


  function init() {
    buildPage();
    // Override openSettingsModal to use our page
    window.openSettingsModal = openSettings;
    window.closeSettingsModal = closeSettings;
    // Back-nav integration
    document.addEventListener('jd-back-close', function (e) {
      var page = document.getElementById('jdSetPage');
      if (page && !page.hidden && (e.target === page || page.contains(e.target))) closeSettings();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
