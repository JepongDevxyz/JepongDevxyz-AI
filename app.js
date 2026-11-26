/* JepongDevxyz AI — rebuilt from zero 2026-11-26 (round-9 reset).
   UI rebuilt fresh to the 2026-11-26 grok.com review (passes A–E).
   ENGINE contracts preserved exactly from the pre-reset build: storage
   keys jepongQwenReset.*, send queue, streaming, refresh-proofing,
   trash, branch, voice, attachments, deterministic self-answers.
   No alert()/confirm()/prompt() anywhere — custom dialogs only.
   No visible "Grok" wording in user-facing strings; "JepongDevxyz AI".
   All user data lives in localStorage; private chats are never saved. */
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

/* ---------- icons (Lucide-style stroke paths) ---------- */
const ICONS={
'panel-left':'<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="9" y1="4" x2="9" y2="20"/>',
'panel-right':'<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="15" y1="4" x2="15" y2="20"/>',
'search':'<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.5" y2="16.5"/>',
'plus':'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
'x':'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
'chevron-down':'<path d="m6 9 6 6 6-6"/>',
'chevron-right':'<polyline points="9 18 15 12 9 6"/>',
'arrow-left':'<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
'arrow-up':'<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
'arrow-down':'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
'ellipsis':'<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
'mic':'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="17" x2="12" y2="22"/>',
'audio-lines':'<path d="M2 10v4"/><path d="M6 7v10"/><path d="M10 4v16"/><path d="M14 7v10"/><path d="M18 10v4"/><path d="M22 10v4"/>',
'smile':'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
'clock':'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
'check':'<polyline points="20 6 9 17 4 12"/>',
'copy':'<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
'pencil':'<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
'trash-2':'<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
'pin':'<path d="M12 17v5"/><path d="M9 3h6l1 7 3 3H5l3-3Z"/>',
'share':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/>',
'git-branch':'<line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
'volume-2':'<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.6 5.4a9 9 0 0 1 0 13.2"/>',
'download':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
'rotate-ccw':'<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
'flag':'<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>',
'image':'<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
'camera':'<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
'file':'<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/>',
'folder':'<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
'upload':'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
'external-link':'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
'thumbs-up':'<path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3Z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>',
'thumbs-down':'<path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3Z"/><path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>',
'more-horizontal':'<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
'message-square':'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
'bell':'<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
'archive':'<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>',
'settings':'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
'help-circle':'<circle cx="12" cy="12" r="9"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
'log-out':'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
'user':'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
'grid':'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
'layout-grid':'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
'library':'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
'bot':'<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><circle cx="12" cy="3" r="1"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17h6"/>',
'mail':'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
'calendar':'<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
'code':'<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
'sliders':'<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
'paperclip':'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
'play':'<polygon points="6 3 20 12 6 21 6 3"/>',
'pause':'<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
'wand':'<path d="M15 4V2"/><path d="M15 10V8"/><path d="M12.5 7h-2"/><path d="M19.5 7h-2"/><path d="m17.8 3.2 1.4-1.4"/><path d="m17.8 10.8 1.4 1.4"/><path d="m12.2 3.2-1.4-1.4"/><path d="m12.2 10.8-1.4 1.4"/><path d="M3 21 14 10"/>',
'sparkles':'<path d="M12 3l1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3L12 3Z"/>',
'globe':'<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a13.5 13.5 0 0 1 3.5 9 13.5 13.5 0 0 1-3.5 9 13.5 13.5 0 0 1-3.5-9A13.5 13.5 0 0 1 12 3z"/>',
'refresh-cw':'<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
'plus-circle':'<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
'book':'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
'book-open':'<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
'file-text':'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
'presentation':'<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
'table':'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>',
'sun':'<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
'moon':'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
'cpu':'<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 20v3"/><path d="M15 20v3"/><path d="M20 9h3"/><path d="M20 14h3"/><path d="M1 9h3"/><path d="M1 14h3"/>',
'zap':'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
'heart':'<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
'music':'<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
'video':'<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
'trending-up':'<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
'briefcase':'<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
'home':'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
'key':'<path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
'shield':'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
'star':'<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
'coffee':'<path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>',
'brain':'<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M12 18v4"/>',
'plug':'<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
'gauge':'<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
'monitor':'<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
'link':'<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
'unlock':'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
'phone':'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
'stethoscope':'<path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6 6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6 6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>',
'hourglass':'<path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>',
'umbrella':'<path d="M22 12a10.06 10.06 0 0 0-20 0Z"/><path d="M12 12v8a2 2 0 0 0 4 0"/><path d="M12 2v1"/>',
'leaf':'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
'bug':'<path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>',
'flask-conical':'<path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/>',
'rocket':'<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
'plane':'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
'car':'<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
'headphones':'<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
'microscope':'<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22v-4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4"/><path d="M14 13.5V7a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v6.5"/><path d="M18 8a2 2 0 0 0 0-4h-2"/><path d="M8 22v-4a2 2 0 0 1 2-2v0a2 2 0 0 1 2 2v4"/>',
'wrench':'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
'sticky-note':'<path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
'scale':'<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
'film':'<rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/>',
'palette':'<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
'calculator':'<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/>',
'laptop':'<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>',
'clipboard-list':'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
'building':'<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
'flame':'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
'database':'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
'shirt':'<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
'gem':'<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
'gamepad':'<line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>',
'chef-hat':'<path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z"/><path d="M6 17h12"/>',
'dollar-sign':'<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
'graduation-cap':'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
'compass':'<circle cx="12" cy="12" r="9"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>',
'box':'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
'bookmark':'<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
};
function icon(name,size){ size=size||18; const p=ICONS[name]||ICONS['file']; return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
function hydrateIcons(root){ (root||document).querySelectorAll('[data-icon]').forEach(el=>{ if(!el.dataset.done){ el.innerHTML=icon(el.dataset.icon, parseInt(el.dataset.size||'18',10)); el.dataset.done='1'; } }); }
/* Geometric "J" mark — the product's own mark. */
const J_MARK='<svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 9h22"/><path d="M29 9v21a9 9 0 0 1-18 0v-3"/></svg>';
const J_MARK_SM='<svg width="16" height="16" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 9h22"/><path d="M29 9v21a9 9 0 0 1-18 0v-3"/></svg>';

/* ---------- models (9 real APINEX free models; picker shows real names) ---------- */
const MODELS=[
 {id:'free/deepseek-v4.1-flash', name:'DeepSeek V4.1 Flash', short:'DeepSeek V4.1', tiny:'V4.1 Flash', sub:'Fastest answers for everyday questions', desc:'Fast and capable', icon:'sparkles'},
 {id:'free/deepseek-v4-flash-0731', name:'DeepSeek V4 Flash', short:'DeepSeek V4', tiny:'V4 Flash', sub:'Fast answers, everyday questions', desc:'Balanced everyday model', icon:'zap'},
 {id:'free/deepseek-v4-pro-0813', name:'DeepSeek V4 Pro', short:'DeepSeek V4 Pro', tiny:'V4 Pro', sub:'Deeper reasoning, expert answers', desc:'Stronger reasoning', icon:'cpu'},
 {id:'free/gemini-4-hydrogen', name:'Gemini 4 Hydrogen', short:'Gemini 4', tiny:'Gemini 4', sub:'Fast answers with search and images', desc:'Google — multimodal', icon:'sparkles'},
 {id:'free/glm-5.3-flash', name:'GLM 5.3 Flash', short:'GLM 5.3', tiny:'GLM 5.3', sub:'Fast answers, long conversations', desc:'Fast general model', icon:'zap'},
 {id:'free/glm-5.3-flashx', name:'GLM 5.3 FlashX', short:'GLM 5.3X', tiny:'GLM 5.3X', sub:'Extra-fast answers', desc:'Faster variant', icon:'zap'},
 {id:'free/gpt-6-luna', name:'GPT-6 Luna', short:'GPT-6 Luna', tiny:'Luna', sub:'Creative writing and conversation', desc:'Creative and conversational', icon:'sparkles'},
 {id:'free/minimax-m3.1-flash', name:'MiniMax M3.1 Flash', short:'MiniMax M3.1', tiny:'M3.1 Flash', sub:'Fast answers, long context', desc:'Fast and versatile', icon:'zap'},
 {id:'free/qwen-3.8-max', name:'Qwen 3.8 Max', short:'Qwen 3.8', tiny:'Qwen 3.8', sub:'Strong coding and reasoning', desc:'Largest Qwen chat model', icon:'cpu'},
];
const DEFAULT_MODEL='free/deepseek-v4.1-flash';
const modelById=id=>MODELS.find(m=>m.id===id)||MODELS[0];

/* ---------- suggestion pool (rotates per load; grok's pool) ---------- */
const SUGGESTIONS=[
 {icon:'sparkles', label:'Create an image'},
 {icon:'pencil', label:'Write or edit'},
 {icon:'search', label:'Search the web'},
 {icon:'code', label:'Make a website'},
 {icon:'lightbulb', label:'Explain a concept'},
 {icon:'presentation', label:'Design a presentation'},
 {icon:'calendar', label:'Plan my day'},
 {icon:'book-open', label:'Help me learn something new'},
 {icon:'mail', label:'Check email and calendar'},
];
ICONS['lightbulb']='<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/>';

/* ---------- automations (16 templates, pass-C exact texts + categories) ---------- */
const AUTOMATIONS=[
 {name:'Morning Brief', cat:'News', icon:'sun', desc:'Start the day with the most important headlines and weather.', sched:'Every day at 7:30 am', instructions:'Summarize the top headlines and the weather for today.'},
 {name:'News Tracker', cat:'News', icon:'globe', desc:'Track specific topics in the news and get a summary when they appear.', sched:'Every day at 9:00 am', instructions:''},
 {name:'Crypto Watch', cat:'Finance', icon:'trending-up', desc:'Track a crypto asset and get alerts on significant moves.', sched:'Every hour', instructions:''},
 {name:'Stocks Tracker', cat:'Finance', icon:'trending-up', desc:'Follow a stock and get a digest when it moves.', sched:'Every day at 5:00 pm', instructions:''},
 {name:'Email Auto-Responder', cat:'Featured', icon:'mail', desc:'Draft replies to your unread emails based on your style.', sched:'Every day at 8:00 am', instructions:''},
 {name:'Inbox Triage', cat:'Productivity', icon:'mail', desc:'Sort and summarize your inbox each morning.', sched:'Every day at 8:00 am', instructions:''},
 {name:'Calendar Prep', cat:'Productivity', icon:'calendar', desc:'Get a briefing on tomorrow\'s meetings the night before.', sched:'Every day at 9:00 pm', instructions:''},
 {name:'Research Digest', cat:'Research', icon:'search', desc:'Get a weekly digest of new papers on a topic you follow.', sched:'Every Monday at 9:00 am', instructions:''},
 {name:'Competitor Watch', cat:'Research', icon:'search', desc:'Track what competitors are saying and doing.', sched:'Every day at 10:00 am', instructions:''},
 {name:'Workout Reminder', cat:'Lifestyle', icon:'heart', desc:'A gentle nudge to move, with a short workout plan.', sched:'Every day at 6:00 pm', instructions:''},
 {name:'Meal Planner', cat:'Lifestyle', icon:'coffee', desc:'Plan the week\'s meals and build a shopping list.', sched:'Every Sunday at 10:00 am', instructions:''},
 {name:'Bill Reminder', cat:'Finance', icon:'bell', desc:'Remind me before bills are due.', sched:'Every day at 9:00 am', instructions:''},
 {name:'Travel Deals', cat:'Lifestyle', icon:'globe', desc:'Watch for cheap flights to a destination you love.', sched:'Every day at 12:00 pm', instructions:''},
 {name:'Habit Check-in', cat:'Lifestyle', icon:'check', desc:'A daily check-in on the habit you are building.', sched:'Every day at 8:00 pm', instructions:''},
 {name:'Weekly Review', cat:'Productivity', icon:'file-text', desc:'A summary of your week: chats, files, and next steps.', sched:'Every Sunday at 6:00 pm', instructions:''},
 {name:'Learning Reminder', cat:'Research', icon:'book-open', desc:'A daily bite of learning on a topic you choose.', sched:'Every day at 7:00 am', instructions:''},
];
const AUTO_CATS=['All','News','Productivity','Finance','Research','Lifestyle'];

/* ---------- connect apps (38 rows, 33 unique — Finance + GitHub +
     Gmail + Google Drive + Google Calendar each appear twice; pass C) ---------- */
const CONNECT_APPS=[
 {name:'Gmail', cat:'Recommended', color:'#d93025', desc:'Search inbox, summarize, and draft.'},
 {name:'Google Drive', cat:'Recommended', color:'#0f9d58', desc:'Find files and answers in your docs.'},
 {name:'Google Calendar', cat:'Recommended', color:'#4285f4', desc:'Check your schedule and plan meetings.'},
 {name:'GitHub', cat:'Recommended', color:'#24292f', desc:'Look up code, issues, and pull requests.'},
 {name:'Finance', cat:'Recommended', color:'#6e6e6a', desc:'Securely connect financial accounts'},
 {name:'Notion', cat:'Recommended', color:'#111110', desc:'Search your pages, docs, and databases.'},
 {name:'X Ads', cat:'Advertising', color:'#111110', desc:'Advertising'},
 {name:'Google Cloud BigQuery', cat:'Analytics', color:'#4285f4', desc:'Analytics'},
 {name:'Expensify', cat:'Apps', color:'#03a99d', desc:'Apps'},
 {name:'Paypal', cat:'Apps', color:'#003087', desc:'Look up transactions and activity.'},
 {name:'Zapier', cat:'Apps', color:'#ff4a00', desc:'Apps'},
 {name:'Datadog', cat:'Developer', color:'#632ca6', desc:'Developer'},
 {name:'Excalidraw', cat:'Developer', color:'#6965db', desc:'Developer'},
 {name:'Mixpanel', cat:'Developer', color:'#7856ff', desc:'Developer'},
 {name:'Netlify', cat:'Developer', color:'#00ad9f', desc:'Developer'},
 {name:'Vercel', cat:'Developer', color:'#111110', desc:'Developer'},
 {name:'GitHub', cat:'Developer', color:'#24292f', desc:'Developer'},
 {name:'Bigdata.com', cat:'Finance', color:'#6e6e6a', desc:'Finance'},
 {name:'Coinbase', cat:'Finance', color:'#0052ff', desc:'Finance'},
 {name:'Daloopa', cat:'Finance', color:'#6e6e6a', desc:'Finance'},
 {name:'Finary', cat:'Finance', color:'#6e6e6a', desc:'Finance'},
 {name:'IBKR', cat:'Finance', color:'#d50000', desc:'Finance'},
 {name:'Finance', cat:'Finance', color:'#6e6e6a', desc:'Finance'},
 {name:'Gmail', cat:'Google Workspace', color:'#d93025', desc:'Google Workspace'},
 {name:'Google Calendar', cat:'Google Workspace', color:'#4285f4', desc:'Google Workspace'},
 {name:'Google Drive', cat:'Google Workspace', color:'#0f9d58', desc:'Google Workspace'},
 {name:'Stripe', cat:'Payments', color:'#635bff', desc:'Payments'},
 {name:'Outlook', cat:'Productivity', color:'#0078d4', desc:'Productivity'},
 {name:'Outlook Calendar', cat:'Productivity', color:'#0078d4', desc:'Productivity'},
 {name:'Asana', cat:'Productivity', color:'#f06a6a', desc:'Productivity'},
 {name:'Atlassian', cat:'Productivity', color:'#0052cc', desc:'Productivity'},
 {name:'Calendly', cat:'Productivity', color:'#006bff', desc:'Productivity'},
 {name:'Canva', cat:'Productivity', color:'#00c4cc', desc:'Productivity'},
 {name:'HubSpot', cat:'Sales', color:'#ff7a59', desc:'Sales'},
 {name:'Meltwater', cat:'Sales', color:'#6e6e6a', desc:'Sales'},
 {name:'Buffer', cat:'Social Media', color:'#231f20', desc:'Social Media'},
 {name:'Metricool', cat:'Social Media', color:'#6e6e6a', desc:'Social Media'},
 {name:'Box', cat:'Storage', color:'#0061d5', desc:'Storage'},
];
const CONNECT_CATS=['All','Advertising','Analytics','Apps','Developer','Finance','More'];
const CONNECT_MORE_CATS=['Google Workspace','Payments','Productivity','Sales','Social Media','Storage'];

/* ---------- skills (pass-C SHORT list texts) ---------- */
const SKILLS=[
 {id:'docx', name:'docx', icon:'file-text', desc:'Create, edit, and update .docx files with word processing tools.'},
 {id:'pdf', name:'pdf', icon:'file-text', desc:'Read, search, summarize, create and edit PDFs.'},
 {id:'pptx', name:'pptx', icon:'presentation', desc:'Create and edit presentation slides with charts, tables, and speaker notes.'},
 {id:'xlsx', name:'xlsx', icon:'table', desc:'Create and edit spreadsheets with formulas, charts, and data analysis.'},
];

/* ---------- upgrade plans (pass-C word-for-word benefit lists;
     prices struck through + Free, per the no-payment decision) ---------- */
const UPGRADE_PLANS={
 Plus:{intro:'Our introductory plan:', intro2:'Shared', intro3:'AI usage pool across all products', price:'Free', was:'₱490 monthly', yearly:'₱4,900 yearly', yearlyPer:'₱409/month', save:'Save 17%', btn:'Upgrade to Plus', ai:['JepongDevxyz AI Chat, Voice, Imagine, and Build','JepongDevxyz AI API','Cursor'], x:['Fewer timeline ads','Premium checkmark','Enhanced creator tools','Advanced Analytics','Get paid to post','Edit posts','Customize your experience','Create longer posts','Write Articles','Media Studio','1080p video uploads','Post longer videos','Higher posting limits','Bookmark folders','Download videos','Higher DM limits']},
 Premium:{intro:'Everything in Plus, and:', mult:'4x more usage compared to Plus', price:'Free', was:'₱2,090', billed:'Billed once for 2 months', then:'Then ₱2,090 monthly', renew:'Renews at ₱2,090 a month after offer ends, cancel anytime', btn:'Claim limited-time offer', ai:['JepongDevxyz AI Bot','Latest JepongDevxyz AI models','Faster Chat responses','Make stunning AI images & videos','Cloud agents & automations','Code hosting & AI code reviews'], x:['Ad-free scrolling on most surfaces','Preferred @handle','Higher reply boost']},
 Super:{intro:'Everything in Premium, and:', mult:'15x more usage compared to Plus', price:'Free', was:'₱7,090 monthly', yearly:'₱70,900 yearly', yearlyPer:'₱5,909/month', save:'Save 17%', btn:'Upgrade to Super', ai:['Priority model access at peak times','Faster responses & generations'], x:['Ad-free scrolling on most surfaces','Preferred @handle','Higher reply boost']},
 Ultra:{intro:'Everything in Super, and:', mult:'50x more usage compared to Plus', price:'Free', was:'₱13,990 monthly', yearly:'₱139,900 yearly', yearlyPer:'₱11,659/month', save:'Save 17%', btn:'Upgrade to Ultra', ai:['Most powerful Chat models','Earliest access to all products & models','Fastest responses & generations'], x:['Ad-free scrolling on most surfaces','Preferred @handle','Higher reply boost']},
};

/* ---------- voices (30 grok voice names; device TTS voices do the speaking) ---------- */
/* Grok's 30 voice names, exactly — Ara selected by default. These are
   grok's server-voice names; on this device the spoken audio still uses
   the device TTS engine — the name is the preference shown and stored. */
const GROK_VOICES=[
 {name:'Ara', desc:'Warm and friendly'},
 {name:'Eve', desc:'Calm and clear'},
 {name:'Leo', desc:'Deep and confident'},
 {name:'Rex', desc:'Bold and energetic'},
 {name:'Sal', desc:'Smooth and relaxed'},
 {name:'Gork', desc:'Lazy.', badge:'18+'},
 {name:'Carina', desc:'Bright and upbeat'},
 {name:'Zagan', desc:'Dark and brooding'},
 {name:'Helix', desc:'Quick and curious'},
 {name:'Orion', desc:'Strong and steady'},
 {name:'Luna', desc:'Soft and dreamy'},
 {name:'Iris', desc:'Clear and precise'},
 {name:'Altair', desc:'Cool and composed'},
 {name:'Zenith', desc:'Calm and centred'},
 {name:'Perseus', desc:'Brave and bold'},
 {name:'Helios', desc:'Warm and radiant'},
 {name:'Lux', desc:'Light and lively'},
 {name:'Kepler', desc:'Thoughtful and measured'},
 {name:'Rigel', desc:'Sharp and focused'},
 {name:'Cosmo', desc:'Playful and open'},
 {name:'Celeste', desc:'Gentle and airy'},
 {name:'Ursa', desc:'Deep and grounded'},
 {name:'Sirius', desc:'Bright and direct'},
 {name:'Lumen', desc:'Clear and even'},
 {name:'Castor', desc:'Friendly and easy'},
 {name:'Naksh', desc:'Soft and steady'},
 {name:'Atlas', desc:'Solid and sure'},
 {name:'Aurora', desc:'Warm and glowing'},
 {name:'Liora', desc:'Sweet and calm'},
 {name:'Claudia', desc:'Elegant and poised'},
];
const SPEEDS=['0.5×','0.75×','0.9×','Normal','1.1×','1.25×','1.5×','2×'];
const SPEED_VAL={'0.5×':0.5,'0.75×':0.75,'0.9×':0.9,'Normal':1,'1.1×':1.1,'1.25×':1.25,'1.5×':1.5,'2×':2};
const PERSONALITIES=['Custom…','Assistant','Storyteller','Kids Story Time','Kids Trivia Game','Meditation','Conspiracy'];
const DICTATIONS=[
 {name:'No refinement', desc:'Exact transcription with no changes'},
 {name:'Tidy up', desc:'Fix grammar, filler words, and punctuation'},
 {name:'Fully refine', desc:'Rewrite for clarity and conciseness'},
];
const RESPONSE_MODES=['Default','Custom','Concise','Formal','Tutor','Comprehensive'];

/* ---------- storage ---------- */
const LS={ get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } }, set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }, del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
const K={ sessions:'jepongQwenReset.sessions.v1', settings:'jepongQwenReset.settings.v1', projects:'jepongQwenReset.projects.v1', extra:'jepongQwenReset.extra.v1', drafts:'jepongQwenReset.drafts.v1', pending:'jepongQwenReset.pending.v1', library:'jepongQwenReset.library.v1' };
function defaultSettings(){ return { theme:'system', profileName:'Jepong', profileEmail:'', provider:'apinex', model:DEFAULT_MODEL, responseMode:'Auto', responseLang:{code:'auto', label:'Auto'}, personalization:{style:'Default', custom:'', refHistory:true}, advanced:{updateMemory:true}, behavior:{ctrlEnter:false,autoScroll:true}, notifications:{browser:false,updates:'Off'}, data:{improveModel:true,personalizeX:true,allowShare:true}, plan:'Free', interface:{wrapCode:false,reduceMotion:false,showSuggestions:true,titleAuto:true}, voice:{grokVoice:'Ara', rate:1, personality:'Assistant', dictation:'Tidy up', voiceURI:'', name:'', micDeviceId:'', lang:'', pitch:1} }; }
function defaultExtra(){ return { usage:{chat:0,image:0,voice:0}, trash:[], automations:[], sharedLinks:[], skills:[], connectRequested:[], customConnectors:[], feedback:[], reports:[], lastSessionId:null }; }
let settings=Object.assign(defaultSettings(), LS.get(K.settings,{}));
settings.behavior=Object.assign(defaultSettings().behavior, settings.behavior||{});
settings.notifications=Object.assign(defaultSettings().notifications, settings.notifications||{});
settings.data=Object.assign(defaultSettings().data, settings.data||{});
settings.interface=Object.assign(defaultSettings().interface, settings.interface||{});
settings.voice=Object.assign(defaultSettings().voice, settings.voice||{});
settings.personalization=Object.assign(defaultSettings().personalization, settings.personalization||{});
settings.advanced=Object.assign(defaultSettings().advanced, settings.advanced||{});
settings.responseLang=Object.assign(defaultSettings().responseLang, settings.responseLang||{});
let extra=Object.assign(defaultExtra(), LS.get(K.extra,{}));
extra.usage=Object.assign({chat:0,image:0,voice:0}, extra.usage||{});
['trash','automations','sharedLinks','skills','connectRequested','customConnectors','feedback','reports'].forEach(k=>{ if(!Array.isArray(extra[k])) extra[k]=[]; });
let sessions=LS.get(K.sessions,[]);
let projects=LS.get(K.projects,[]);
let drafts=LS.get(K.drafts,{});
let pending=LS.get(K.pending,[]);
let library=LS.get(K.library,[]);
function saveSettings(){ LS.set(K.settings,settings); }
function saveExtra(){ LS.set(K.extra,extra); }
function saveSessions(){ LS.set(K.sessions, sessions.filter(s=>!s.temporary)); }
function saveProjects(){ LS.set(K.projects,projects); }
function saveDrafts(){ LS.set(K.drafts,drafts); }
const DRAFT_MAX_JSON=2000000;
function draftKey(){ return currentId||'home'; }
function saveDraft(){
  /* Drafts persist the composer text AND the staged attachments (name/kind
     only in storage for big files — base64 is dropped over the cap, with an
     honest toast on restore). Round-8 format was a bare string; restore
     accepts both. */
  const input=$('#composerInput'); if(!input) return;
  const text=input.value||'';
  const rec={text, attachments:attachments.map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0, data:a.data||undefined}))};
  if(JSON.stringify(rec).length>DRAFT_MAX_JSON){
    rec.attachments=rec.attachments.map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0}));
    rec.attachmentsDropped=true;
  }
  if(!text&&!rec.attachments.length){ delete drafts[draftKey()]; }
  else drafts[draftKey()]=rec;
  saveDrafts();
}
function restoreDraft(){
  const input=$('#composerInput'); if(!input) return;
  const rec=drafts[draftKey()];
  if(!rec){ input.value=''; attachments=[]; autosize(); renderAttachBar(); return; }
  if(typeof rec==='string'){ input.value=rec; attachments=[]; autosize(); renderAttachBar(); return; }
  input.value=rec.text||'';
  attachments=(rec.attachments||[]).map(a=>({name:a.name, kind:a.kind, mimeType:a.mimeType||'', size:a.size||0, data:a.data||undefined}));
  autosize(); renderAttachBar();
  if(rec.attachmentsDropped) toast('Your message was restored — please re-attach your files.');
}
function savePending(){ LS.set(K.pending,pending); }
function saveLibrary(){ LS.set(K.library,library); }
function purgeTrash(){ const now=Date.now(), cut=30*24*3600*1000; const before=extra.trash.length; extra.trash=extra.trash.filter(t=>now-(t.deletedAt||now)<cut); if(extra.trash.length!==before) saveExtra(); }

/* ---------- app state ---------- */
let currentId=null, privateMode=false, streaming=false, abortCtrl=null, currentProjectId=null;
let scrollState={atBottom:true};
let attachments=[], sendQueue=[], draining=false, currentThinking=null, lastScrollAt=0;
let freshFollowups={}, lastFreshReplyId=null; /* §14: follow-up pills are EPHEMERAL — in-memory only, never saved; only the reply generated in this session shows them. */
let sidebarChatsExpanded=true, sidebarProjectsExpanded=true, sidebarShowAll=false;
let sidebarOpen=false, sidebarCollapsed={};
let settingsPage='list', settingsSub=null, libraryTab='all', libraryView='list', librarySort='newest';
let currentModelId=settings.model||DEFAULT_MODEL;
let voiceState={active:false, listening:false, muted:false, recognition:null, stream:null, analyser:null, raf:0, speakUtterance:null};
let voicesCache=null, editingSessionId=null, renamingId=null;
let upgTab='Premium', upgBilling='monthly', palTab='all', projTab='suggested';
let autoTimer=null, countdownTimer=null, promoTimer=null;

function curSession(){ return sessions.find(s=>s.id===currentId)||null; }
function getSession(id){ return sessions.find(s=>s.id===id)||null; }
function newSessionId(){ return uid(); }
function createSession(opts){ opts=opts||{}; const s={id:newSessionId(), title:opts.title||'New chat', createdAt:Date.now(), updatedAt:Date.now(), messages:[], projectId:opts.projectId||null, archived:false, pinned:false, temporary:!!opts.temporary, titleAutoPending:true, titleRequested:false}; sessions.unshift(s); return s; }

/* ---------- toast / warnings / dialogs ---------- */
let toastTimer=null;
function toast(msg){ const t=$('#toast'); if(!t) return; t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },2600); }
function warnToast(msg){ const stack=$('#warnStack'); if(!stack) return; const card=document.createElement('div'); card.className='warn-card'; const sp=document.createElement('span'); sp.textContent=msg; const b=document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Dismiss'); b.innerHTML=icon('x',16); b.addEventListener('click',()=>card.remove()); card.appendChild(sp); card.appendChild(b); stack.appendChild(card); setTimeout(()=>{ if(card.parentNode) card.remove(); },6000); }
function copyText(t){ if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(()=>fallbackCopy(t)); return Promise.resolve(fallbackCopy(t)); }
function fallbackCopy(t){ try{ const ta=document.createElement('textarea'); ta.value=t; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); return true; }catch(e){ return false; } }
function showConfirm(o){ return new Promise(res=>{ const m=$('#confirmModal'); $('#confirmTitle').textContent=o.title||'Are you sure?'; $('#confirmText').textContent=o.text||''; const ok=$('#confirmOk'), cancel=$('#confirmCancel'); ok.textContent=o.okLabel||'Delete'; cancel.textContent=o.cancelLabel||'Cancel'; m.hidden=false; const done=v=>{ ok.removeEventListener('click',onOk); cancel.removeEventListener('click',onCancel); m.hidden=true; res(v); }; const onOk=()=>done(true); const onCancel=()=>done(false); ok.addEventListener('click',onOk); cancel.addEventListener('click',onCancel); setTimeout(()=>{ try{ ok.focus(); }catch(e){} },60); }); }
function showInfo(title,text,okLabel){ return new Promise(res=>{ const m=$('#infoModal'); $('#infoModalTitle').textContent=title; const body=$('#infoModalText'); body.innerHTML=''; const p=document.createElement('p'); p.textContent=text; body.appendChild(p); const ok=$('#infoModalOk'); ok.textContent=okLabel||'OK'; const cancel=$('#infoModalCancel'); cancel.hidden=true; m.hidden=false; const done=()=>{ ok.removeEventListener('click',onOk); m.hidden=true; body.innerHTML=''; res(true); }; const onOk=()=>done(); ok.addEventListener('click',onOk); }); }
function promptDialog(title,label,initial,multiline){ return new Promise(res=>{ const m=$('#infoModal'); $('#infoModalTitle').textContent=title; const body=$('#infoModalText'); body.innerHTML=''; const lab=document.createElement('label'); lab.className='field-label'; lab.textContent=label; const inp=document.createElement(multiline?'textarea':'input'); inp.className='field'; inp.value=initial||''; if(!multiline) inp.maxLength=60; else inp.rows=4; inp.style.cssText='width:100%;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--surface);resize:vertical;outline:none'; body.appendChild(lab); body.appendChild(inp); const ok=$('#infoModalOk'); ok.textContent='Save'; const cancel=$('#infoModalCancel'); if(cancel) cancel.hidden=false; m.hidden=false; const done=v=>{ ok.removeEventListener('click',onOk); if(cancel) cancel.removeEventListener('click',onCancel); if(cancel) cancel.hidden=true; m.hidden=true; body.innerHTML=''; res(v); }; const onOk=()=>done(inp.value); const onCancel=()=>done(null); ok.addEventListener('click',onOk); if(cancel) cancel.addEventListener('click',onCancel); setTimeout(()=>{ try{ inp.focus(); }catch(e){} },50); }); }

/* ---------- sheets / menus ---------- */
let openSheets=[];
function sheetId(sel){ return String(sel||'').replace(/^#/,''); }
function openSheet(sel){ const id=sheetId(sel); const el=document.getElementById(id); if(!el) return;
  document.querySelectorAll('.sheet').forEach(s=>{ if(s.id!==id&&!(id==='projIconSheet'&&s.id==='projectDialog')) s.hidden=true; });
  openSheets=openSheets.filter(x=>x!==id&&!(id==='projIconSheet'&&x==='projectDialog'));
  el.hidden=false; if(!openSheets.includes(id)) openSheets.push(id); }
function closeSheet(sel){ const id=sheetId(sel); const el=document.getElementById(id); if(!el) return; el.hidden=true; openSheets=openSheets.filter(x=>x!==id); }
function closeAllSheets(){ openSheets.slice().forEach(closeSheet); closeMenu(); }
let suppressMenuClose=false;
function closeMenu(){ const m=$('#menuPop'); if(m) m.remove(); }
function showMenu(x,y,items,opts){ opts=opts||{}; closeMenu(); const pop=document.createElement('div'); pop.id='menuPop'; pop.className='menu-pop'; pop.setAttribute('role','menu'); renderMenuItems(pop,items,x,y,opts); suppressMenuClose=true; document.body.appendChild(pop); requestAnimationFrame(()=>positionMenu(pop,x,y,opts)); return pop; }
function renderMenuItems(pop,items,x,y,opts){ pop.innerHTML=''; items.forEach(it=>{ if(typeof it==='string'){ if(it==='divider'){ const hr=document.createElement('hr'); hr.className='menu-divider'; pop.appendChild(hr); } return; } if(it.header){ const h=document.createElement('div'); h.className='menu-sub'; h.textContent=it.header; pop.appendChild(h); return; } if(it.divider){ const hr=document.createElement('hr'); hr.className='menu-divider'; pop.appendChild(hr); return; } if(it.note){ const n=document.createElement('div'); n.className='menu-note'; n.textContent=it.note; pop.appendChild(n); return; } if(it.account){ const a=document.createElement('div'); a.className='menu-account'; const b=document.createElement('b'); b.textContent=it.account.name; const s=document.createElement('span'); s.textContent=it.account.sub; a.appendChild(b); a.appendChild(s); pop.appendChild(a); return; } const b=document.createElement('button'); b.type='button'; if(it.danger) b.className='danger'; if(it.icon){ const ic=document.createElement('span'); ic.className='menu-ic'; ic.innerHTML=icon(it.icon,17); b.appendChild(ic); } const tx=document.createElement('span'); tx.className='menu-row-tx'; const lab=document.createElement('span'); lab.textContent=it.label; tx.appendChild(lab); if(it.sub){ const sb=document.createElement('span'); sb.className='menu-row-sub'; sb.textContent=it.sub; tx.appendChild(sb); } b.appendChild(tx); if(it.hint){ const hn=document.createElement('span'); hn.className='menu-hint'; hn.textContent=it.hint; b.appendChild(hn); } if(it.checked){ const ck=document.createElement('span'); ck.className='menu-ic'; ck.innerHTML=icon('check',16); b.appendChild(ck); } if(it.chevron){ const ch=document.createElement('span'); ch.className='menu-hint'; ch.textContent='›'; b.appendChild(ch); } b.addEventListener('click',ev=>{ ev.stopPropagation(); if(it.items){ renderMenuItems(pop,it.items,x,y,opts); requestAnimationFrame(()=>positionMenu(pop,x,y,opts)); return; } if(!it.keepOpen) closeMenu(); if(it.onClick) it.onClick(); }); pop.appendChild(b); }); }
function positionMenu(pop,x,y,opts){ const r=pop.getBoundingClientRect(); let left=clamp(x,8,window.innerWidth-r.width-8); let top=y; if(opts.above){ top=y-r.height; } else if(top+r.height>window.innerHeight-8){ top=Math.max(8,window.innerHeight-r.height-8); } if(top<8) top=8; pop.style.left=left+'px'; pop.style.top=top+'px'; }
document.addEventListener('click',ev=>{ if(suppressMenuClose){ suppressMenuClose=false; return; } const m=$('#menuPop'); if(m&&!m.contains(ev.target)) closeMenu(); });

/* ---------- theme ---------- */
function applyTheme(){ const t=settings.theme||'system'; document.documentElement.setAttribute('data-theme',t); document.documentElement.classList.toggle('wrap-code', !!(settings.interface&&settings.interface.wrapCode)); document.documentElement.classList.toggle('reduce-motion', !!(settings.interface&&settings.interface.reduceMotion)); const meta=document.querySelector('meta[name="theme-color"]'); if(meta) meta.content=t==='dark'?'#101011':(t==='light'?'#fafaf8':'#fafaf8'); }
function setTheme(t){ settings.theme=t; saveSettings(); applyTheme(); }

/* ---------- sidebar ---------- */
function sidebarVisibleChats(){ return sessions.filter(s=>!s.temporary&&!s.archived); }
function renderSidebar(){
  const list=$('#chatList'); if(!list) return;
  list.classList.toggle('collapsed',!sidebarChatsExpanded);
  $('#sbChatsChev').classList.toggle('closed',!sidebarChatsExpanded);
  $('#projList').classList.toggle('collapsed',!sidebarProjectsExpanded);
  $('#sbProjChev').classList.toggle('closed',!sidebarProjectsExpanded);
  list.innerHTML='';
  const seenIds=new Set();
  const chats=sidebarVisibleChats().filter(s=>{ if(seenIds.has(s.id)) return false; seenIds.add(s.id); return true; });
  const pinned=chats.filter(s=>s.pinned), rest=chats.filter(s=>!s.pinned);
  const ordered=pinned.concat(rest);
  const shown=sidebarShowAll?ordered:ordered.slice(0,5);
  shown.forEach(s=>{ list.appendChild(chatRow(s)); });
  if(!chats.length){ const em=document.createElement('div'); em.className='sb-empty'; em.textContent='No chats yet. Start a new one.'; list.appendChild(em); }
  if(ordered.length>5&&!sidebarShowAll){ const more=document.createElement('button'); more.type='button'; more.id='sbMore'; more.className='sb-more'; more.innerHTML=icon('chevron-down',15)+'<span>Show more</span>'; more.addEventListener('click',()=>{ sidebarShowAll=true; renderSidebar(); }); list.appendChild(more); }
  const pl=$('#projList'); pl.innerHTML='';
  projects.forEach(p=>{ pl.appendChild(projectRow(p)); });
  const np=document.createElement('button'); np.type='button'; np.className='sb-item sb-new-proj-row';
  np.innerHTML='<span class="sb-item-ic">'+icon('plus',15)+'</span><span class="sb-item-title">New Project</span>';
  np.addEventListener('click',()=>{ closeSidebar(); openProjectDialog(); });
  pl.appendChild(np);
  $('#profileNameLabel').textContent=settings.profileName||'Jepong';
  const av=$('#profileAvatar'); if(av) av.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2c-3.6 0-8 1.8-8 4.5V20h16v-1.5c0-2.7-4.4-4.5-8-4.5z"/></svg>';
  renderTopTitle();
}
function chatRow(s){
  const row=document.createElement('div'); row.className='sb-item'+(s.id===currentId?' active':''); row.setAttribute('data-id', s.id);
  const t=document.createElement('span'); t.className='sb-item-title'; t.textContent=s.title||'New chat'; row.appendChild(t);
  const m=document.createElement('button'); m.type='button'; m.className='sb-item-menu'; m.setAttribute('aria-label','Chat options'); m.innerHTML=icon('ellipsis',15);
  m.addEventListener('click',ev=>{ ev.stopPropagation(); chatItemMenu(s,m); }); row.appendChild(m);
  row.addEventListener('click',()=>openSession(s.id));
  return row;
}
function projectRow(p){
  const row=document.createElement('div'); row.className='sb-item proj';
  const chev=document.createElement('span'); chev.className='sb-item-chev'; chev.innerHTML=icon('chevron-right',14); row.appendChild(chev);
  const ic=document.createElement('span'); ic.className='proj-item-ic'; ic.style.background=p.color||'#6e6e6a'; ic.innerHTML=icon(p.icon||'folder',15); row.appendChild(ic);
  const t=document.createElement('span'); t.className='sb-item-title'; t.textContent=p.name||'Untitled Project'; row.appendChild(t);
  const plus=document.createElement('button'); plus.type='button'; plus.className='sb-item-plus'; plus.setAttribute('aria-label','Add to project'); plus.innerHTML=icon('plus',14);
  plus.addEventListener('click',ev=>{ ev.stopPropagation(); projectAddMenu(p,plus); }); row.appendChild(plus);
  const m=document.createElement('button'); m.type='button'; m.className='sb-item-menu'; m.setAttribute('aria-label','Project options'); m.innerHTML=icon('ellipsis',15);
  m.addEventListener('click',ev=>{ ev.stopPropagation(); projectItemMenu(p,m); }); row.appendChild(m);
  row.addEventListener('click',()=>openProject(p.id));
  return row;
}
function chatItemMenu(s,anchor){
  const r=anchor.getBoundingClientRect();
  showMenu(Math.min(r.left,window.innerWidth-210), r.bottom+6, [
    {icon:'pin', label:s.pinned?'Unpin':'Pin', onClick:()=>{ s.pinned=!s.pinned; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); }},
    {icon:'pencil', label:'Rename', onClick:()=>renameChat(s)},
    {icon:'share', label:'Share', onClick:()=>{ copyText(location.origin+location.pathname).then(()=>toast('Link copied')); }},
    {icon:'archive', label:'Archive', onClick:()=>{ s.archived=true; s.updatedAt=Date.now(); saveSessions(); if(currentId===s.id){ currentId=null; } renderAll(); }},
    {divider:true},
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteChat(s.id)},
  ]);
}
function projectItemMenu(p,anchor){
  const r=anchor.getBoundingClientRect();
  showMenu(Math.min(r.left,window.innerWidth-210), r.bottom+6, [
    {icon:'pencil', label:'Rename', onClick:()=>renameProject(p)},
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteProject(p.id)},
  ]);
}
function projectAddMenu(p,anchor){
  const r=anchor.getBoundingClientRect();
  showMenu(Math.min(r.left,window.innerWidth-210), r.bottom+6, [
    {header:'Add to '+p.name},
    {header:'Add Context'},
    {icon:'file', label:'Files', onClick:()=>{ openProject(p.id); projTab='files'; renderProjectPage(); }},
    {icon:'pencil', label:'Instructions', onClick:()=>{ openProject(p.id); projTab='instructions'; renderProjectPage(); }},
  ]);
}
function openSidebar(){ sidebarOpen=true; $('#sidebar').classList.add('open'); const sc=$('#scrim'); if(sc) sc.hidden=false; sidebarShowAll=false; renderSidebar(); }
function closeSidebar(){ sidebarOpen=false; sidebarShowAll=false; $('#sidebar').classList.remove('open'); const sc=$('#scrim'); if(sc) sc.hidden=true; renderSidebar(); }

/* ---------- top bar / title / rename ---------- */
function renderTopTitle(){
  const el=$('#topTitle'); if(!el) return;
  if(renamingId){ return; }
  const s=curSession();
  const hasChat=!!s&&!!currentId;
  const label=hasChat?(s.title||'New chat'):'JepongDevxyz AI';
  const showBadge=!hasChat||privateMode;
  el.classList.toggle('chat-title', hasChat);
  el.classList.toggle('has-badge', showBadge);
  el.innerHTML='<span class="top-title-tx">'+(hasChat?'':'<span class="top-smiley">'+icon('smile',18)+'</span>')+'<span>'+esc(label)+'</span></span>'
    +(showBadge?'<button type="button" class="private-badge'+(privateMode?' on':'')+'" id="topPrivateBadge" aria-label="Private chat" aria-pressed="'+(privateMode?'true':'false')+'"><span class="pb-ring"></span><span class="pb-tx">Private</span></button>':'');
  const badge=$('#topPrivateBadge');
  if(badge) badge.addEventListener('click',e=>{ e.stopPropagation(); setPrivateMode(!privateMode); });
  const cab=$('#convActionsBtn'); if(cab) cab.hidden=!hasChat;
}
function updateTopbar(){
  renderTopTitle();
  const banner=$('#appBanner'); if(banner) banner.hidden=false;
}
function startInlineRename(){
  const s=curSession(); if(!s) return;
  const el=$('#topTitle'); if(!el) return;
  renamingId=s.id;
  el.innerHTML='';
  const box=document.createElement('div'); box.className='rename-box';
  const inp=document.createElement('input'); inp.type='text'; inp.value=s.title||'New chat'; inp.setAttribute('aria-label','Rename conversation'); inp.maxLength=60;
  const cancel=document.createElement('button'); cancel.type='button'; cancel.className='icon-btn'; cancel.setAttribute('aria-label','Cancel rename'); cancel.innerHTML=icon('x',16);
  const ok=document.createElement('button'); ok.type='button'; ok.className='icon-btn ok'; ok.setAttribute('aria-label','Save name'); ok.innerHTML=icon('check',16);
  box.appendChild(inp); box.appendChild(cancel); box.appendChild(ok); el.appendChild(box);
  const done=save=>{ renamingId=null; if(save){ const v=inp.value.trim(); if(v){ s.title=v; s.updatedAt=Date.now(); saveSessions(); } } renderTopTitle(); renderSidebar(); };
  cancel.addEventListener('click',ev=>{ ev.stopPropagation(); done(false); });
  ok.addEventListener('click',ev=>{ ev.stopPropagation(); done(true); });
  inp.addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); done(true); } else if(ev.key==='Escape'){ ev.preventDefault(); done(false); } ev.stopPropagation(); });
  inp.addEventListener('click',ev=>ev.stopPropagation());
  setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} },30);
}
async function renameChat(s){
  const next=await promptDialog('Rename conversation','Name', s.title||'New chat');
  if(next===null||next===undefined) return;
  const v=next.trim(); if(!v) return;
  s.title=v; s.updatedAt=Date.now(); saveSessions(); renderAll();
}
async function renameProject(p){
  const next=await promptDialog('Rename project','Name', p.name||'Untitled Project');
  if(next===null||next===undefined) return;
  const v=next.trim(); if(!v) return;
  p.name=v; saveProjects(); renderSidebar(); if(currentProjectId===p.id) renderProjectPage();
}
function convActionsMenu(){
  const s=curSession(); if(!s) return;
  const btn=$('#convActionsBtn'); const r=btn.getBoundingClientRect();
  showMenu(Math.min(r.left-140,window.innerWidth-210), r.bottom+6, [
    {icon:'share', label:'Share', onClick:()=>shareCurrentChat()},
    {icon:'pin', label:s.pinned?'Unpin':'Pin', onClick:()=>{ s.pinned=!s.pinned; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); }},
    {icon:'pencil', label:'Rename', onClick:()=>startInlineRename()},
    {icon:'folder', label:'Add to Project', chevron:true, items:projectPickItems(s)},
    {icon:'flag', label:'Send Feedback', onClick:()=>openFeedback()},
    {divider:true},
    {icon:'copy', label:'Copy Conversation ID', onClick:()=>{ copyText(s.id).then(()=>toast('Conversation ID copied')); }},
    {icon:'external-link', label:'Open in new tab', onClick:()=>{ try{ window.open(location.href,'_blank'); }catch(e){ toast('Could not open a new tab'); } }},
    {icon:'archive', label:'Archive', onClick:()=>{ s.archived=true; s.updatedAt=Date.now(); saveSessions(); currentId=null; renderAll(); toast('Chat archived'); }},
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteChat(s.id)},
  ]);
}
function projectPickItems(s){
  const items=projects.map(p=>({icon:'folder', label:p.name||'Untitled Project', onClick:()=>{ s.projectId=p.id; s.updatedAt=Date.now(); saveSessions(); renderAll(); toast('Added to '+(p.name||'project')); }}));
  items.push({icon:'plus', label:'New project', onClick:()=>openProjectDialog()});
  return items;
}
function shareCurrentChat(){
  const s=curSession(); if(!s) return;
  const link={id:uid(), title:s.title||'New chat', createdAt:Date.now(), sessionId:s.id};
  extra.sharedLinks.unshift(link); saveExtra();
  copyText(location.origin+location.pathname).then(()=>toast('Link copied'));
}
async function deleteChat(id){
  const s=getSession(id); if(!s) return;
  const ok=await showConfirm({title:'Delete conversation?', text:'This conversation will be permanently deleted. This cannot be undone.', okLabel:'Delete conversation'});
  if(!ok) return;
  await trashChat(s);
  sessions=sessions.filter(x=>x.id!==id);
  if(currentId===id){ currentId=null; }
  saveSessions(); renderAll();
  toast('Moved to Deleted Conversations');
}
async function trashChat(s){
  extra.trash.unshift({id:s.id, title:s.title||'New chat', deletedAt:Date.now(), messages:s.messages||[], projectId:s.projectId||null});
  saveExtra();
}
function restoreChat(trashId){
  const t=extra.trash.find(x=>x.id===trashId); if(!t) return;
  extra.trash=extra.trash.filter(x=>x.id!==trashId); saveExtra();
  const s={id:t.id, title:t.title, createdAt:Date.now(), updatedAt:Date.now(), messages:t.messages||[], projectId:t.projectId||null, archived:false, pinned:false, temporary:false, titleAutoPending:false, titleRequested:true};
  sessions.unshift(s); saveSessions(); openSession(s.id); toast('Chat restored');
}
async function deleteProject(id){
  const p=projects.find(x=>x.id===id); if(!p) return;
  const ok=await showConfirm({title:'Delete project?', text:'"'+(p.name||'Untitled Project')+'" will be deleted. Chats in it are kept.', okLabel:'Delete'});
  if(!ok) return;
  projects=projects.filter(x=>x.id!==id); saveProjects();
  sessions.forEach(s=>{ if(s.projectId===id) s.projectId=null; }); saveSessions();
  if(currentProjectId===id){ currentProjectId=null; $('#projectPage').hidden=true; }
  renderAll();
}

/* ---------- home / suggestions / autocomplete ---------- */
function shuffled(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const t=a[i]; a[i]=a[j]; a[j]=t; } return a; }
function renderHome(){
  const wrap=$('#homeSugg'); if(!wrap) return;
  wrap.innerHTML='';
  if(privateMode){ $('#greetLine1').textContent="What's on your mind today?"; $('#homeView').classList.add('priv'); $('.home-greet').classList.add('priv'); $('#privateNote').hidden=false; $('#composer').classList.add('private'); wrap.hidden=true; return; }
  $('#greetLine1').textContent="What's on the agenda today?";
  $('#homeView').classList.remove('priv'); $('.home-greet').classList.remove('priv'); $('#privateNote').hidden=true; $('#composer').classList.remove('private');
  if(!settings.interface.showSuggestions){ wrap.hidden=true; return; }
  wrap.hidden=false;
  shuffled(SUGGESTIONS).slice(0,3).forEach(sg=>{
    const b=document.createElement('button'); b.type='button';
    const ic=document.createElement('span'); ic.className='sugg-ic'; ic.innerHTML=icon(sg.icon,18); b.appendChild(ic);
    b.appendChild(document.createTextNode(sg.label));
    b.addEventListener('click',()=>suggestionAction(sg.label));
    wrap.appendChild(b);
  });
}
function suggestionAction(label){
  /* §14: "Create an image" does NOT send and does NOT open the image
     sheet — it pre-fills the composer with "Create an image of " and
     focuses it with the caret at the end. All other suggestions send. */
  if(label==='Create an image'){ const inp=$('#composerInput'); inp.value='Create an image of '; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.focus(); const len=inp.value.length; try{ inp.setSelectionRange(len,len); }catch(e){} return; }
  const inp=$('#composerInput'); inp.value=label; inp.dispatchEvent(new Event('input',{bubbles:true})); inp.focus();
}
const AUTO_TOPICS=['help with writing','help with coding','help with planning','help with research','help with email','help with learning'];
function renderAutocomplete(){
  const box=$('#autoComplete'); const inp=$('#composerInput'); const v=inp.value.trim();
  if(!v){ box.hidden=true; box.innerHTML=''; return; }
  const topics=AUTO_TOPICS.filter(t=>t.toLowerCase().includes(v.toLowerCase())).slice(0,3);
  const rows=topics.length?topics:['help with '+v,'help with '+v+' ideas','help with '+v+' planning'];
  box.innerHTML='';
  const head=document.createElement('div'); head.className='ac-head'; head.textContent='Prompt suggestions'; box.appendChild(head);
  rows.slice(0,3).forEach(r=>{
    const b=document.createElement('button'); b.type='button';
    /* The typed text is shown in the lighter prefix style WHERE it
       actually occurs in the row — the old code blindly sliced the
       first v.length chars off the row, so typing "draft check 12345"
       rendered the garbled "draft check 12345heck 12345". */
    const idx=r.toLowerCase().indexOf(v.toLowerCase());
    if(idx>=0){
      if(idx>0) b.appendChild(document.createTextNode(r.slice(0,idx)));
      const pre=document.createElement('span'); pre.className='ac-prefix'; pre.textContent=r.slice(idx,idx+v.length); b.appendChild(pre);
      b.appendChild(document.createTextNode(r.slice(idx+v.length)));
    }else{
      b.appendChild(document.createTextNode(r));
    }
    b.addEventListener('click',()=>{ inp.value=r; inp.dispatchEvent(new Event('input',{bubbles:true})); box.hidden=true; inp.focus(); });
    box.appendChild(b);
  });
  box.hidden=false;
}

/* ---------- composer ---------- */
function composerHasText(){ return ($('#composerInput').value||'').trim().length>0; }
function autosize(){
  const input=$('#composerInput'); if(!input) return;
  input.style.height='auto'; input.style.height=Math.min(input.scrollHeight,140)+'px';
}
function syncComposer(){
  const inp=$('#composerInput');
  inp.style.height='auto'; inp.style.height=Math.min(inp.scrollHeight,180)+'px';
  const has=composerHasText()||attachments.length>0;
  const send=$('#sendBtn'), stop=$('#stopBtn'), voice=$('#voiceBtn'), mic=$('#micBtn');
  /* §14: while streaming the Send button is GONE — replaced by the square
     Stop. + / mic / model / voice stay visible; there is no queue
     placeholder or queue input. Typed text stays in the composer (doSend
     refuses while streaming) until the user taps Send after the run ends. */
  if(streaming){ send.hidden=true; send.disabled=true; stop.hidden=false; voice.hidden=privateMode; mic.hidden=false; }
  else if(privateMode){ voice.hidden=true; send.hidden=false; send.disabled=!has; stop.hidden=true; mic.hidden=false; }
  else { stop.hidden=true; send.hidden=!has; send.disabled=!has; voice.hidden=has; mic.hidden=false; }
  /* Private mode: grey up-arrow Send (no circle) while the composer is
     empty — blue circle again once there is text; the model label loses
     its pill background. */
  send.classList.toggle('private-send', privateMode&&!has&&!streaming);
  const mb=$('#modelBtn'); if(mb) mb.classList.toggle('private', privateMode);
  if(has) renderAutocomplete(); else { const box=$('#autoComplete'); box.hidden=true; box.innerHTML=''; }
  saveDraft();
}
function setPrivateMode(on){
  privateMode=!!on;
  if(privateMode){ currentId=null; }
  renderAll();
}
function currentModel(){ return modelById(currentModelId); }
function renderModelBtn(){
  const m=currentModel();
  $('#modelName').textContent=m.tiny||m.name;
  $('#modelMark').innerHTML=J_MARK_SM;
  $('#bannerMark').innerHTML=J_MARK_SM;
}
function openModelSheet(){
  const list=$('#modelSheetList'); list.innerHTML='';
  MODELS.forEach(m=>{
    const b=document.createElement('button'); b.type='button'; b.className='sheet-list-btn'; b.setAttribute('data-model',m.id);
    const main=document.createElement('span'); main.className='row-main';
    const nm=document.createElement('span'); nm.textContent=m.name; main.appendChild(nm);
    const sb=document.createElement('span'); sb.className='row-sub'; sb.textContent=m.sub||m.desc||''; main.appendChild(sb);
    b.appendChild(main);
    if(m.id===currentModelId){ const ck=document.createElement('span'); ck.className='check'; ck.innerHTML=icon('check',18); b.appendChild(ck); }
    b.addEventListener('click',()=>{ setModel(m.id); closeSheet('modelSheet'); toast(m.name+' selected'); });
    list.appendChild(b);
  });
  const prem=document.createElement('button'); prem.type='button'; prem.className='sheet-list-btn'; prem.setAttribute('data-premium-row','');
  const main=document.createElement('span'); main.className='row-main';
  const nm=document.createElement('span'); nm.textContent='Premium'; main.appendChild(nm);
  const sb=document.createElement('span'); sb.className='row-sub'; sb.textContent='Unlock extended capabilities'; main.appendChild(sb);
  prem.appendChild(main);
  const pill=document.createElement('span'); pill.className='ub-pill'; pill.textContent='Free'; prem.appendChild(pill);
  prem.addEventListener('click',()=>{ closeSheet('modelSheet'); openUpgradeSheet('Premium'); });
  list.appendChild(prem);
  openSheet('modelSheet');
}
function setModel(id){ currentModelId=id; settings.model=id; saveSettings(); renderModelBtn(); }
function renderPlusList(items){
  const list=$('#plusSheetList');
  list.innerHTML=items.map((it,i)=>'<button class="sheet-list-btn" data-plus-idx="'+i+'" type="button"><span data-icon="'+(it.icon||'info')+'" data-size="18"></span><span class="row-main"><span>'+esc(it.label)+'</span>'+(it.sub?'<span class="row-sub">'+esc(it.sub)+'</span>':'')+'</span>'+(it.chevron?'<span class="chev">'+icon('chevron-right',16)+'</span>':'')+'</button>').join('');
  hydrateIcons(list);
  list.querySelectorAll('[data-plus-idx]').forEach(b=>b.addEventListener('click',()=>{
    const it=items[parseInt(b.getAttribute('data-plus-idx'),10)];
    if(it.submenu){ renderPlusList([{label:'Back', icon:'arrow-left', onClick:()=>openPlusSheet()}, ...it.submenu()]); return; }
    closeSheet('plusSheet');
    if(it.onClick) it.onClick();
  }));
  openSheet('plusSheet');
}
function openPlusSheet(){
  /* Grok's "+" menu, exactly 5 items in order. Submenus swap in place
     with a Back row (pass A: no sideways slide). */
  renderPlusList([
    {icon:'file', label:'Upload a file', onClick:()=>pickFile('files')},
    {icon:'folder', label:'Projects', chevron:true, submenu:()=>[
      ...projects.map(p=>({icon:'folder', label:p.name, onClick:()=>openProject(p.id)})),
      {icon:'plus', label:'New project', onClick:()=>openProjectDialog()}
    ]},
    {icon:'zap', label:'Skills', chevron:true, submenu:()=>[
      ...SKILLS.map(s=>({icon:s.icon, label:s.name, sub:'Create a '+s.id+' file', onClick:()=>openSkillFileDialog(s)})),
      ...extra.skills.map(s=>({icon:'zap', label:s.name, sub:'Personal skill', onClick:()=>runPersonalSkill(s)})),
      {icon:'plus', label:'New Skill', onClick:()=>newPersonalSkill()}
    ]},
    {icon:'plug', label:'Add connector', onClick:()=>openSettings('connectors')},
    {icon:'file', label:'Files', chevron:true, submenu:()=>[
      ...library.slice(0,8).map(f=>({icon:f.kind==='image'?'image':'file', label:f.name, sub:fmtBytes(f.size||0), onClick:()=>openFileInPane(f)})),
      {icon:'plus', label:'Upload files', onClick:()=>$('#libFileInput').click()}
    ]}
  ]);
}
function runPersonalSkill(s){
  const inp=$('#composerInput'); if(!inp) return;
  inp.value=(s.instructions||s.name||'');
  syncComposer(); inp.focus();
  toast('Skill ready — edit the prompt, then send');
}
function pickFile(kind){
  const fi=$('#fileInput');
  if(kind==='camera'){ fi.setAttribute('accept','image/*'); fi.setAttribute('capture','environment'); }
  else if(kind==='library'){ fi.setAttribute('accept','image/*,video/*,audio/*'); fi.removeAttribute('capture'); }
  else { fi.removeAttribute('accept'); fi.removeAttribute('capture'); }
  fi.dataset.kind=kind||'files';
  fi.click();
}
function handleFileInput(ev){
  const files=Array.from(ev.target.files||[]);
  ev.target.value='';
  files.forEach(f=>{
    if(f.size>1.1*1024*1024){ warnToast('"'+f.name+'" is over the 1.1 MB limit and was skipped.'); return; }
    const rd=new FileReader();
    rd.onload=()=>{ const raw=String(rd.result||'').split(',')[1]||''; attachments.push({name:f.name, mimeType:f.type||'application/octet-stream', size:f.size, data:raw}); renderAttachBar(); syncComposer(); };
    rd.readAsDataURL(f);
  });
}
function renderAttachBar(){
  const bar=$('#attachBar'); bar.innerHTML='';
  if(!attachments.length){ bar.hidden=true; return; }
  bar.hidden=false;
  attachments.forEach((a,i)=>{
    const chip=document.createElement('span'); chip.className='att att-chip';
    const nm=document.createElement('span'); nm.textContent=a.name; chip.appendChild(nm);
    const x=document.createElement('button'); x.type='button'; x.setAttribute('aria-label','Remove attachment'); x.setAttribute('data-att-del', String(i)); x.innerHTML=icon('x',13);
    x.addEventListener('click',()=>{ attachments.splice(i,1); renderAttachBar(); syncComposer(); });
    chip.appendChild(x); bar.appendChild(chip);
  });
}

/* ---------- text cleaning / sources ---------- */
function cleanAssistantText(t){
  let s=String(t||'');
  s=s.replace(/\[\[JD_WORK_NOTE\]\][\s\S]*?\[\[\/JD_WORK_NOTE\]\]/g,'');
  s=s.replace(/\[\[JD_[A-Z_]+\]\][\s\S]*?\[\[\/JD_[A-Z_]+\]\]/g,'');
  s=s.replace(/\[\[JD_[A-Z_]+\]\]/g,'');
  return s.trim();
}
function stripSourcesBlock(t){
  const m=String(t||'').match(/\n\s*Sources:\s*\n([\s\S]*)$/);
  if(!m) return String(t||'');
  return String(t||'').slice(0,m.index).trimEnd();
}
function extractUrls(t){
  const urls=[]; const seen=new Set();
  const re=/https?:\/\/[^\s)>\]]+/g; let m;
  while((m=re.exec(String(t||'')))){ let u=m[0].replace(/[.,;]+$/,''); if(!seen.has(u)){ seen.add(u); urls.push(u); } }
  return urls;
}
function hostOf(u){ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return u; } }
function favColor(h){ let n=0; for(let i=0;i<h.length;i++) n=(n*31+h.charCodeAt(i))>>>0; const cols=['#7c3aed','#0e7490','#b45309','#15803d','#be185d','#1d4ed8','#9f1239']; return cols[n%cols.length]; }
function isInternalStep(label){
  const l=String(label||'').toLowerCase();
  return /^(connecting to|using|model|provider|audit|response complete|checked the response)/.test(l);
}
/* absorbWorkNotes lives inside runChatStream as a closure (absorbChunk) —
   it needs the stream's buffer, because a note can split across chunks. */

/* ---------- markdown ---------- */
function inlineMd(s){
  let h=esc(s);
  h=h.replace(/`([^`\n]+)`/g,'<code>$1</code>');
  h=h.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  h=h.replace(/\*([^*]+)\*/g,'<em>$1</em>');
  /* Markdown images MUST come before links: without this rule
     "![alt](url)" degraded to a literal "!" + a link (seen live
     2026-11-26 — the "!" marker before the image link). data: URLs
     (what runImageGeneration emits) and https: URLs both render. */
  h=h.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img src="$2" alt="$1" style="max-width:100%;border-radius:12px">');
  h=h.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  h=h.replace(/(?<!["'=])((?:https?:\/\/)[^\s<]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
  return h;
}
function highlightCode(code,lang){
  /* Lightweight syntax tint (Grok colors its code; ours was plain mono).
     One regex pass over the raw code: comments, strings, numbers, keywords.
     Each token is escaped separately, so markup can never leak into output.
     (Sequential replaces corrupt each other — the keyword pass rewrote the
     span tags the string pass had just inserted.) */
  const re=/(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(\d+(?:\.\d+)?)\b|\b(const|let|var|function|return|if|else|elif|for|while|do|switch|case|break|continue|class|extends|new|try|catch|finally|throw|import|from|export|default|async|await|typeof|instanceof|def|print|and|or|not|None|True|False|lambda|with|as|pass|raise|yield|public|private|static|void|null|true|false|this|self|fn|struct|impl|use|pub|match|loop|int|str|float|bool)\b/g;
  let out='', last=0, m;
  while((m=re.exec(code))){
    out+=esc(code.slice(last,m.index));
    const t=m[0];
    if(m[1]) out+='<span class="tk-c">'+esc(t)+'</span>';
    else if(m[2]) out+='<span class="tk-s">'+esc(t)+'</span>';
    else if(m[3]) out+='<span class="tk-n">'+esc(t)+'</span>';
    else out+='<span class="tk-k">'+esc(t)+'</span>';
    last=m.index+t.length;
  }
  return out+esc(code.slice(last));
}
function langBadge(lang){
  const l=(lang||'').toLowerCase();
  const map={python:['Py','#3776ab'],javascript:['JS','#f7df1e'],js:['JS','#f7df1e'],typescript:['TS','#3178c6'],ts:['TS','#3178c6'],html:['<>','#e34f26'],css:['#','#1572b6'],json:['{}','#6e6e6a'],bash:['$','#4eaa25'],shell:['$','#4eaa25'],sql:['SQL','#e38c00'],java:['Jv','#b07219'],go:['Go','#00add8'],rust:['Rs','#dea584'],c:['C','#555555'],cpp:['C+','#00599c']};
  const m=map[l]||[l?l.slice(0,2).toUpperCase():'<>','#6e6e6a'];
  /* Pass D: the badge is the brand logo glyph (J mark), NOT a text
     abbreviation — a 'Py' text badge is round-8 behavior. The badge sits
     OUTSIDE .code-lang (sibling), so .code-lang still reads 'python'. */
  return '<span class="code-badge" style="background:'+m[1]+'">'+J_MARK_SM+'</span>';
}
function mdToHtml(s){ return renderMarkdown(s); }
function renderMarkdown(t){
  const src=String(t||'');
  const lines=src.split('\n');
  let html='', i=0;
  while(i<lines.length){
    const line=lines[i];
    if(line.trim().startsWith('```')){
      const lang=line.trim().slice(3).trim()||'code';
      const buf=[]; i++;
      while(i<lines.length&&!lines[i].trim().startsWith('```')){ buf.push(lines[i]); i++; }
      i++;
      const code=buf.join('\n');
      html+='<div class="code-block"><div class="code-head">'+langBadge(lang)+'<span class="code-lang">'+esc(lang||'code')+'</span><button type="button" data-copy-code aria-label="Copy code">'+icon('copy',14)+'</button></div><div class="code-body"><pre><code data-code="'+esc(code)+'">'+highlightCode(code,lang)+'</code></pre></div></div>';
      continue;
    }
    if(/^\s*\|.*\|\s*$/.test(line)&&i+1<lines.length&&/^\s*\|[\s:|-]+\|\s*$/.test(lines[i+1])){
      const headCells=line.split('|').slice(1,-1).map(c=>c.trim());
      i+=2; const rows=[];
      while(i<lines.length&&/^\s*\|.*\|\s*$/.test(lines[i])){ rows.push(lines[i].split('|').slice(1,-1).map(c=>c.trim())); i++; }
      html+='<div class="table-wrap"><table><thead><tr>'+headCells.map(c=>'<th>'+inlineMd(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+inlineMd(c)+'</td>').join('')+'</tr>').join('')+'</tbody></table><div class="table-foot"><button type="button" data-table-copy aria-label="Copy table">'+icon('copy',15)+'</button><button type="button" data-table-open aria-label="Open as file">'+icon('external-link',15)+'</button></div></div>';
      continue;
    }
    if(/^#{1,3}\s/.test(line)){ const lvl=line.match(/^#+/)[0].length; html+='<h'+lvl+'>'+inlineMd(line.replace(/^#+\s*/,''))+'</h'+lvl+'>'; i++; continue; }
    if(/^\s*[-*]\s+/.test(line)){ const items=[]; while(i<lines.length&&/^\s*[-*]\s+/.test(lines[i])){ items.push(lines[i].replace(/^\s*[-*]\s+/,'')); i++; } html+='<ul>'+items.map(x=>'<li>'+inlineMd(x)+'</li>').join('')+'</ul>'; continue; }
    if(/^\s*\d+[.)]\s+/.test(line)){ const items=[]; while(i<lines.length&&/^\s*\d+[.)]\s+/.test(lines[i])){ items.push(lines[i].replace(/^\s*\d+[.)]\s+/,'') ); i++; } html+='<ol>'+items.map(x=>'<li>'+inlineMd(x)+'</li>').join('')+'</ol>'; continue; }
    if(line.trim().startsWith('>')){ html+='<blockquote>'+inlineMd(line.replace(/^\s*>\s?/,''))+'</blockquote>'; i++; continue; }
    if(line.trim()==='---'){ html+='<hr>'; i++; continue; }
    if(line.trim()===''){ i++; continue; }
    const para=[]; while(i<lines.length&&lines[i].trim()!==''&&!lines[i].trim().startsWith('```')&&!/^\s*\|.*\|\s*$/.test(lines[i])&&!/^#{1,3}\s/.test(lines[i])&&!/^\s*[-*]\s+/.test(lines[i])&&!/^\s*\d+[.)]\s+/.test(lines[i])){ para.push(lines[i]); i++; }
    html+='<p>'+para.map(inlineMd).join('<br>')+'</p>';
  }
  return html;
}

/* ---------- message rendering ---------- */
function fmtStamp(ts){ const d=new Date(ts||Date.now()); return d.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}); }
function thinkMs(m){ return (m.thinkMs==null?0:m.thinkMs); }
function renderMessages(){
  const wrap=$('#messages'); if(!wrap) return;
  const liveThink=wrap.querySelector('#liveThink');
  wrap.innerHTML='';
  const s=curSession();
  if(!s){ return; }
  s.messages.forEach(m=>{
    if(m.role==='user'){
      const div=document.createElement('div'); div.className='msg user'; div.dataset.mid=m.id;
      const row=document.createElement('div'); row.className='msg-user-row';
      const acts=document.createElement('div'); acts.className='msg-user-actions';
      const eb=document.createElement('button'); eb.type='button'; eb.className='icon-btn'; eb.setAttribute('aria-label','Edit message'); eb.dataset.uAct='edit'; eb.dataset.mid=m.id; eb.innerHTML=icon('pencil',15);
      const cb=document.createElement('button'); cb.type='button'; cb.className='icon-btn'; cb.setAttribute('aria-label','Copy message'); cb.dataset.uAct='copy'; cb.dataset.mid=m.id; cb.innerHTML=icon('copy',15);
      eb.addEventListener('click',ev=>{ ev.stopPropagation(); userMsgAction('edit',m.id); });
      cb.addEventListener('click',ev=>{ ev.stopPropagation(); userMsgAction('copy',m.id); });
      acts.appendChild(eb); acts.appendChild(cb);
      const txt=document.createElement('div'); txt.className='msg-user-text';
      if(m.attachments&&m.attachments.length){ m.attachments.forEach(a=>{ const chip=document.createElement('span'); chip.className='att-chip'; chip.textContent=a.name||'file'; txt.appendChild(chip); }); }
      txt.appendChild(document.createTextNode(m.text||''));
      txt.addEventListener('click',()=>{ div.classList.toggle('show-actions'); });
      row.appendChild(acts); row.appendChild(txt); div.appendChild(row);
      wrap.appendChild(div);
    } else {
      const div=document.createElement('div'); div.className='msg asst'; div.dataset.mid=m.id;
      const bodyText=cleanAssistantText(m.text||'');
      const displayText=stripSourcesBlock(bodyText);
      const thinkMs=(m.thinkMs!=null)?m.thinkMs:((m.streamStartedAt&&m.streamEndedAt)?(m.streamEndedAt-m.streamStartedAt):null);
      const thinkSecs=thinkMs!=null?Math.round(thinkMs/1000):0;
      if(thinkMs!=null&&thinkSecs>=1&&!m.deterministic){
        const tr=document.createElement('div'); tr.className='think-row';
        const sp=document.createElement('span'); sp.className='spin'; sp.style.visibility='hidden'; tr.appendChild(sp);
        const lab=document.createElement('span'); lab.className='think-label'; lab.textContent=m.stopped?'Stopped':'Thought for '+thinkSecs+'s'; tr.appendChild(lab);
        const ch=document.createElement('span'); ch.innerHTML=icon('chevron-down',14); tr.appendChild(ch);
        tr.addEventListener('click',()=>{ const next=tr.nextElementSibling; if(next&&next.classList.contains('think-divider')) next.hidden=!next.hidden; });
        div.appendChild(tr);
        const dv=document.createElement('div'); dv.className='think-divider'; dv.hidden=true; div.appendChild(dv);
      }
      const body=document.createElement('div'); body.className='msg-asst'; body.innerHTML=renderMarkdown(displayText)||'<p></p>';
      div.appendChild(body);
      const urls=extractUrls(bodyText);
      const foot=document.createElement('div'); foot.className='reply-foot';
      let footHas=false;
      if(urls.length){
        const btn=document.createElement('button'); btn.type='button'; btn.className='sources-btn';
        const chips=document.createElement('span'); chips.className='src-chips';
        urls.slice(0,3).forEach(u=>{ const c=document.createElement('span'); c.className='src-chip'; c.style.background=favColor(hostOf(u)); c.textContent=(hostOf(u)[0]||'?').toUpperCase(); chips.appendChild(c); });
        btn.appendChild(chips);
        btn.appendChild(document.createTextNode(urls.length+(urls.length===1?' source':' sources')));
        btn.addEventListener('click',()=>openSources(urls));
        foot.appendChild(btn); footHas=true;
      }
      if(!m.pending){
        const bar=document.createElement('div'); bar.className='action-bar';
        [['copy','Copy', 'copy'],['good','Good response','thumbs-up'],['bad','Bad response','thumbs-down'],['more','More options','ellipsis']].forEach(([act,label,ic])=>{
          const b=document.createElement('button'); b.type='button'; b.className='icon-btn'+(m.feedback===act?' active':''); b.setAttribute('aria-label',label); b.dataset.aAct=act; b.dataset.mid=m.id; b.innerHTML=icon(ic,16);
          b.addEventListener('click',()=>asstAction(act,m.id));
          bar.appendChild(b);
        });
        foot.appendChild(bar); footHas=true;
      }
      if(footHas) div.appendChild(foot);
      /* §14: follow-up pills under the FRESH reply only — right-aligned,
         stacked one per line, blue play-triangle on hover/focus. Ephemeral:
         freshFollowups lives in memory only, so re-opened threads and
         post-reload renders never show them. Tapping a pill sends it. */
      const fups=freshFollowups[m.id];
      if(fups&&fups.length&&lastFreshReplyId===m.id){
        const fu=document.createElement('div'); fu.className='followups';
        fups.forEach(q=>{
          const b=document.createElement('button'); b.type='button'; b.className='follow-pill';
          const tri=document.createElement('span'); tri.className='follow-tri'; tri.innerHTML=icon('play',10); b.appendChild(tri);
          b.appendChild(document.createTextNode(q));
          b.addEventListener('click',()=>{ sendMessage(q); });
          fu.appendChild(b);
        });
        div.appendChild(fu);
      }
      wrap.appendChild(div);
    }
  });
  if(liveThink) wrap.appendChild(liveThink);
  wireCodeButtons(wrap);
  wireTableButtons(wrap);
}
function wireCodeButtons(wrap){
  wrap.querySelectorAll('[data-copy-code]').forEach(btn=>{
    btn.addEventListener('click',()=>{ const code=btn.closest('.code-block').querySelector('code'); const raw=code.getAttribute('data-code')||code.textContent; copyText(raw).then(()=>toast('Copied')); });
  });
}
function wireTableButtons(wrap){
  wrap.querySelectorAll('[data-table-copy]').forEach(btn=>{
    btn.addEventListener('click',()=>{ const t=btn.closest('.table-wrap').querySelector('table'); if(!t) return; const rows=Array.from(t.querySelectorAll('tr')).map(r=>Array.from(r.querySelectorAll('th,td')).map(c=>c.textContent.trim()).join(' | ')).join('\n'); copyText(rows).then(()=>toast('Table copied')); });
  });
  wrap.querySelectorAll('[data-table-open]').forEach(btn=>{
    btn.addEventListener('click',()=>{ const t=btn.closest('.table-wrap').querySelector('table'); if(!t) return; openTableInPane(t); });
  });
}
function openSources(urls){
  const list=$('#sourcesList'); list.innerHTML='';
  urls.forEach(u=>{
    const a=document.createElement('a'); a.href=u; a.target='_blank'; a.rel='noopener';
    const dot=document.createElement('span'); dot.className='src-dot'; dot.style.background=favColor(hostOf(u)); dot.textContent=(hostOf(u)[0]||'?').toUpperCase(); a.appendChild(dot);
    const meta=document.createElement('span'); meta.style.minWidth='0';
    const h=document.createElement('span'); h.style.display='block'; h.style.fontSize='14px'; h.textContent=hostOf(u); meta.appendChild(h);
    const uel=document.createElement('span'); uel.className='src-url'; uel.style.display='block'; uel.textContent=u; meta.appendChild(uel);
    a.appendChild(meta); list.appendChild(a);
  });
  openSheet('sourcesDialog');
}
function openTableInPane(table){
  openPane();
  const body=$('#paneBody'); body.innerHTML='';
  const wrap=document.createElement('div'); wrap.className='pane-file-body';
  const h=document.createElement('h3'); h.style.margin='0 0 8px'; h.textContent='Table'; wrap.appendChild(h);
  const tw=document.createElement('div'); tw.className='pane-table-wrap'; tw.innerHTML=table.outerHTML; wrap.appendChild(tw);
  const dl=document.createElement('button'); dl.type='button'; dl.textContent='Download .md';
  dl.addEventListener('click',()=>{
    const rows=Array.from(table.querySelectorAll('tr')).map(r=>'| '+Array.from(r.querySelectorAll('th,td')).map(c=>c.textContent.trim()).join(' | ')+' |');
    if(rows.length>1) rows.splice(1,0,'|'+Array.from(table.querySelectorAll('th')).map(()=> '---').join('|')+'|');
    const blob=new Blob([rows.join('\n')],{type:'text/markdown'});
    const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='table.md'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  });
  wrap.appendChild(dl); body.appendChild(wrap);
}

/* ---------- user message actions ---------- */
function userMsgAction(act,mid){
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  if(act==='copy'){ copyText(m.text).then(()=>toast('Copied')); }
  else if(act==='edit'){ editUserMessage(s,m); }
}
async function editUserMessage(s,m){
  let draft=m.text||'';
  for(;;){
    const next=await promptDialog('Edit message','Message', draft);
    if(next===null||next===undefined) return;
    const idx=s.messages.indexOf(m);
    if(idx<0) return;
    const trimmed=next.trim();
    if(!trimmed) return;
    const laterUsers=s.messages.slice(idx+1).filter(x=>x.role==='user').length;
    if(laterUsers>0){
      const ok=await showConfirm({title:'Edit this message?', text:'There are '+laterUsers+' more exchange'+(laterUsers>1?'s':'')+' after this one. Editing will remove them and start a new answer from here.', okLabel:'Edit anyway'});
      if(!ok){ draft=trimmed; continue; }
    }
    s.messages=s.messages.slice(0,idx);
    s.updatedAt=Date.now(); saveSessions();
    const userMsg={id:uid(), role:'user', text:trimmed, createdAt:Date.now(), attachments:[]};
    s.messages.push(userMsg); saveSessions(); renderAll();
    await runChatStream(s,userMsg,[]);
    return;
  }
}
function asstAction(act,mid){
  const s=curSession(); if(!s) return;
  const m=s.messages.find(x=>x.id===mid); if(!m) return;
  if(act==='copy'){ copyText(m.text||'').then(()=>toast('Copied')); }
  else if(act==='good'||act==='bad'){ m.feedback=(m.feedback===act)?null:act; s.updatedAt=Date.now(); saveSessions(); renderMessages(); if(m.feedback) toast('Thanks for the feedback'); }
  else if(act==='read'){ readAloud(m); }
  else if(act==='more'){ asstMoreMenu(m,mid); }
}
function asstMoreMenu(m,mid){
  const btn=document.querySelector('[data-a-act="more"][data-mid="'+mid+'"]');
  const r=btn?btn.getBoundingClientRect():{left:120,bottom:200};
  showMenu(Math.min(r.left,window.innerWidth-210), Math.max(8,r.top-190), [
    {header:fmtStamp(m.createdAt||Date.now())},
    {icon:'git-branch', label:'Branch in new chat', onClick:()=>branchFrom(mid)},
    {icon:'share', label:'Share', onClick:()=>{ copyText(location.origin+location.pathname).then(()=>toast('Link copied')); }},
    {icon:'volume-2', label:'Read aloud', onClick:()=>readAloud(m)},
    {icon:'download', label:'Export to PDF', onClick:()=>{ try{ window.print(); }catch(e){ toast('Print is not available'); } }},
    {icon:'rotate-ccw', label:'Regenerate', onClick:()=>{ const s2=curSession(); if(s2) regenerate(s2,m); }},
    {icon:'image', label:'Create image', onClick:()=>{ const s=curSession(); if(!s) return; const userMsg={id:uid(), role:'user', text:String(m.text||'').slice(0,500), createdAt:Date.now(), attachments:[]}; s.messages.push(userMsg); saveSessions(); runImageGeneration(s,userMsg); }},
    {icon:'flag', label:'Report message', onClick:()=>{ extra.reports.push({id:uid(), mid:mid, at:Date.now()}); saveExtra(); toast('Thanks — your report was sent'); }},
    {icon:'trash-2', label:'Delete', danger:true, onClick:async()=>{ const ok=await showConfirm({title:'Delete message?', text:'This answer will be deleted.', okLabel:'Delete'}); if(!ok) return; const s=curSession(); if(!s) return; s.messages=s.messages.filter(x=>x.id!==mid); s.updatedAt=Date.now(); saveSessions(); renderMessages(); }},
  ]);
}
function readAloud(m){
  const btn=document.querySelector('[data-a-act="read"][data-mid="'+m.id+'"]');
  if(btn&&btn.classList.contains('active')){ stopSpeak(); btn.classList.remove('active'); return; }
  if(!('speechSynthesis' in window)){ toast('Read aloud is not supported in this browser'); return; }
  loadVoices();
  if(speak(m.text||'')){ if(btn) btn.classList.add('active'); setTimeout(()=>{ if(btn) btn.classList.remove('active'); }, Math.min(60000, Math.max(4000,(m.text||'').length*90))); }
  else toast('Read aloud is not supported in this browser');
}
function branchFrom(mid){
  const s=curSession(); if(!s) return;
  const idx=s.messages.findIndex(x=>x.id===mid); if(idx<0) return;
  const copy={id:uid(), title:(s.title||'New chat')+' (branch)', createdAt:Date.now(), updatedAt:Date.now(), messages:JSON.parse(JSON.stringify(s.messages.slice(0,idx+1))), titleAutoPending:false, titleRequested:true, projectId:s.projectId||null};
  sessions.unshift(copy); saveSessions(); openSession(copy.id); toast('Branched into a new chat');
}
function regenerate(s,m){
  const idx=s.messages.findIndex(x=>x.id===m.id); if(idx<0) return;
  const userIdx=idx-1; if(userIdx<0||s.messages[userIdx].role!=='user') return;
  s.messages=s.messages.slice(0,idx); saveSessions(); renderMessages();
  runChatStream(s,s.messages[userIdx],[]);
}

/* ---------- send / stream ---------- */
function historyFor(s,beforeId){
  const msgs=s.messages.filter(m=>m.role==='user'||m.role==='assistant');
  const upto=beforeId?msgs.filter(m=>m.id!==beforeId):msgs;
  return upto.slice(-20).map(m=>({role:m.role, content:m.text||''}));
}
let voiceStyleOverride=null;
function enqueueSend(fn){ return new Promise(res=>{ sendQueue.push(async()=>{ try{ await fn(); }catch(e){ console.error(e); } res(); }); drainSendQueue(); }); }
async function drainSendQueue(){
  if(draining) return; draining=true;
  while(sendQueue.length){ const fn=sendQueue.shift(); try{ await fn(); }catch(e){ console.error(e); } }
  draining=false;
}
async function sendMessage(presetText){
  const inp=$('#composerInput');
  if(presetText!==undefined) inp.value=presetText;
  return doSend();
}
function ensureSessionForSend(){
  let s=curSession();
  if(!s){
    s=createSession({temporary:privateMode});
    if(privateMode){ /* private chats are never saved */ }
    else { saveSessions(); }
    currentId=s.id;
  }
  return s;
}
function doSend(){
  const inp=$('#composerInput');
  const text=(inp.value||'').trim();
  if(!text&&!attachments.length) return Promise.resolve();
  if(streaming) return Promise.resolve(); /* §14: no queue — typed text stays in the composer until the stream ends and the user taps Send. Only explicitly-sent messages use sendQueue. */
  const atts=attachments.slice(); attachments=[]; renderAttachBar();
  inp.value=''; syncComposer();
  const s=ensureSessionForSend();
  const userMsg={id:uid(), role:'user', text:text, createdAt:Date.now(), attachments:(atts||[]).map(a=>({name:a.name, kind:(a.mimeType||'').startsWith('image/')?'image':'file'}))};
  s.messages.push(userMsg); s.updatedAt=Date.now(); saveSessions();
  if(!privateMode){ extra.lastSessionId=s.id; saveExtra(); }
  pending.push({sessionId:s.id, userMsgId:userMsg.id, atts:atts.map(a=>({data:a.data,mimeType:a.mimeType,size:a.size,name:a.name}))});
  savePending();
  renderAll();
  return enqueueSend(async()=>{
    const styleOverride=voiceStyleOverride; voiceStyleOverride=null;
    await runChatStream(s,userMsg,atts,styleOverride);
    pending=pending.filter(p=>p.userMsgId!==userMsg.id); savePending();
  });
}
async function runChatStream(s,userMsg,atts,styleOverride){
  const start=Date.now();
  streaming=true; abortCtrl=new AbortController();
  clearFreshFollowups(); /* a new reply begins — the previous reply's pills go away */
  const asstMsg={id:uid(), role:'assistant', text:'', createdAt:Date.now(), thinkMs:null, stopped:false, deterministic:false, pending:true};
  s.messages.push(asstMsg); saveSessions();
  const thinkRow=showLiveThinking(s,asstMsg);
  syncComposer();
  const payload={message:userMsg.text, history:historyFor(s,userMsg.id), files:(atts||[]).map(a=>({data:a.data, mimeType:a.mimeType, size:a.size, name:a.name})), provider:settings.provider||'apinex', model:currentModelId, mode:'general', customPrompt:customPromptText(), webSearch:false, forceWebSearch:false, autoFallback:true, smartRouter:false, activityStream:true, autoTools:true, clientTimeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Manila', clientUtcOffsetMinutes:-new Date().getTimezoneOffset(), personalization:{intelligence:effortValue(), fastAnswers:false}};
  if(styleOverride) payload.personalization.style=styleOverride;
  let fullText='', gotAny=false, errMsg=null, wnBuf='';
  const absorbChunk=chunk=>{
    /* The backend asks the model to emit [[JD_WORK_NOTE]]…[[/JD_WORK_NOTE]]
       progress notes. They are UI metadata: they are stripped from the
       reply and never render (grok shows no step lines). A chunk can split
       a note, so an open fragment buffers. */
    wnBuf+=String(chunk||'');
    let out='';
    for(;;){
      const open=wnBuf.indexOf('[[JD_WORK_NOTE]]');
      if(open<0){ out+=wnBuf; wnBuf=''; break; }
      out+=wnBuf.slice(0,open);
      const close=wnBuf.indexOf('[[/JD_WORK_NOTE]]',open);
      if(close<0){ wnBuf=wnBuf.slice(open); break; }
      wnBuf=wnBuf.slice(close+'[[/JD_WORK_NOTE]]'.length);
    }
    return out;
  };
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload), signal:abortCtrl.signal});
    const ct=(res.headers&&res.headers.get?res.headers.get('content-type'):null)||'';
    if(!res.ok){
      let detail=''; try{ detail=await res.text(); }catch(e){}
      throw new Error('Request failed ('+res.status+')'+(detail?' — '+detail.slice(0,200):''));
    }
    if(ct.includes('text/event-stream')&&res.body&&res.body.getReader){
      const reader=res.body.getReader(); const dec=new TextDecoder(); let buf='';
      const handleBlock=block=>{
        let evName='message', data='';
        block.split('\n').forEach(line=>{ if(line.startsWith(':')) return; if(line.startsWith('event:')) evName=line.slice(6).trim(); else if(line.startsWith('data:')) data+=line.slice(5).trim(); });
        if(!data||data==='[DONE]') return;
        let ev=null; try{ ev=JSON.parse(data); }catch(e){ return; }
        const type=evName!=='message'?evName:(ev.type||'message');
        if(type==='text'&&typeof ev.text==='string'){
          gotAny=true;
          const raw=absorbChunk(ev.text).replace(/\[\[JD_[A-Z_]+\]\][\s\S]*?\[\[\/JD_[A-Z_]+\]\]/g,'').replace(/\[\[JD_[A-Z_]+\]\]/g,'');
          if(raw){ fullText+=raw; }
          asstMsg.text=fullText;
          renderMessages(); scrollToBottomIfNeeded();
        } else if(type==='activity'){
          gotAny=true;
          if(ev.label&&!isInternalStep(ev.label)) updateLiveThinking(thinkRow,ev.label);
        } else if(type==='artifact'){
          gotAny=true;
        } else if(type==='error'){
          errMsg=ev.message||ev.error||'Something went wrong.';
        } else if(type==='done'){
          /* end of stream */
        }
      };
      for(;;){
        const {done,value}=await reader.read();
        if(done) break;
        buf+=dec.decode(value,{stream:true});
        let idx; while((idx=buf.indexOf('\n\n'))>=0){ const block=buf.slice(0,idx); buf=buf.slice(idx+2); if(block.trim()) handleBlock(block); }
      }
      if(buf.trim()) handleBlock(buf);
    } else {
      const data=await readChatResponse(res);
      const t=data.reply||data.text||data.message||'';
      gotAny=!!t;
      fullText=cleanAssistantText(t);
      asstMsg.text=fullText;
      renderMessages();
    }
  }catch(e){
    if(e&&e.name==='AbortError'){ asstMsg.stopped=true; asstMsg.text=(asstMsg.text?asstMsg.text:'')+'\n\n_Stopped._'; }
    else { errMsg=e&&e.message?e.message:'Something went wrong.'; }
  }
  const elapsed=Date.now()-start;
  streaming=false; abortCtrl=null; asstMsg.pending=false;
  if(errMsg&&!fullText){
    asstMsg.text='Sorry — I couldn\'t finish that. ('+errMsg+')';
  }
  asstMsg.text=cleanAssistantText(asstMsg.text||'');
  /* Think time is kept as-is: the render rule rounds it (Math.round), so a
     ~600ms reply shows "Thought for 1s" and an instant reply (0 rounded
     seconds) shows no row at all. */
  asstMsg.thinkMs=elapsed;
  if(!fullText&&!errMsg){ asstMsg.text=asstMsg.text||''; }
  s.updatedAt=Date.now(); saveSessions();
  removeLiveThinking();
  renderMessages(); scrollToBottomIfNeeded(); syncComposer();
  if(fullText&&!errMsg&&!asstMsg.stopped) requestFollowups(s,asstMsg); /* §14: pills under this fresh reply only */
  if(s.titleAutoPending!==false&&!s.titleRequested&&settings.interface.titleAuto!==false){
    s.titleRequested=true; saveSessions();
    generateTitle(s);
  }
  if(!privateMode){ extra.usage.chat=(extra.usage.chat||0)+1; saveExtra(); }
}
function clearFreshFollowups(){ freshFollowups={}; lastFreshReplyId=null; }
async function readChatResponse(res){
  /* The backend's non-stream chat path returns the reply as PLAIN TEXT
     (passthroughHeaders sets Content-Type: text/plain) — NOT JSON.
     The old code called res.json() here, which throws on a text body and
     silently killed follow-up pills AND title generation live (the rig
     mocked JSON, so it never caught it — proven by two live curls
     2026-11-26, both HTTP 200 text/plain). Read the body once as text;
     parse JSON when it actually is JSON, otherwise use the raw text. */
  const raw=await res.text();
  try{ const d=JSON.parse(raw); if(d&&typeof d==='object') return d; }catch(_){}
  return {reply:raw};
}
async function requestFollowups(s,asstMsg){
  /* §14: grok shows follow-up pills under FRESH replies only (never under
     re-opened old threads or after reload). The pills come from the model,
     never invented here: a separate short request (the backend's self-answer
     detector skips prompts starting "Suggest 2 short", so this reaches the
     model). The prompt is constrained to things THIS app can actually do —
     no directions/weather/maps/news/live-data suggestions. Fire-and-forget:
     pills appear when the call lands, nothing blocks on it. */
  if(!settings.interface.showSuggestions) return;
  if(!s||!asstMsg||asstMsg.stopped) return;
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:'Suggest 2 short follow-up questions IN THIS APP for the user to ask next, based on this conversation. The app can: answer questions, write text/code, translate, do math, explain its own features/models, discuss an attached file/image. Never suggest directions, weather, maps, locations, news, or anything needing live data, an account, or tools the app does not have. Reply with only the 2 questions, one per line, no numbering, no quotes, no preamble.', history:historyFor(s,asstMsg.id), provider:settings.provider||'apinex', model:currentModelId, mode:'general', autoFallback:true})});
    const data=await readChatResponse(res);
    const t=cleanAssistantText(data.reply||data.text||'');
    const qs=t.split('\n').map(x=>x.trim().replace(/^[\d\-•·.)\s]+/,'').replace(/^["'“”]+|["'“”]+$/g,'')).filter(x=>x.length>3&&x.length<140&&!/(follow-up|here are|below are)/i.test(x)&&!x.includes('http')&&!x.includes('|')&&!x.startsWith('#')&&!x.startsWith('```')).slice(0,2);
    if(qs.length<1) return;
    if(s.id!==currentId) return;
    const cur=curSession(); if(!cur||cur.id!==s.id) return;
    const lastAsst=[...s.messages].reverse().find(m=>m.role==='assistant');
    if(!lastAsst||lastAsst.id!==asstMsg.id) return;
    freshFollowups[asstMsg.id]=qs; lastFreshReplyId=asstMsg.id;
    renderMessages();
  }catch(e){ /* no pills on failure — silent, never an error state */ }
}
function showLiveThinking(s,asstMsg){
  /* §14: while a reply runs, grok shows "Thinking" + ONE step line
     "Planning next moves" with a dotted spinner — NO seconds, NO
     "Working for Ns" timer. Streamed work steps replace the step line
     as they arrive (updateLiveThinking); the status stays "Thinking". */
  const wrap=$('#messages');
  const div=document.createElement('div'); div.className='msg asst'; div.id='liveThink';
  const tr=document.createElement('div'); tr.className='think-row live';
  const sp=document.createElement('span'); sp.className='spin-dots'; sp.innerHTML='<i></i><i></i><i></i>'; tr.appendChild(sp);
  const tx=document.createElement('span'); tx.className='think-tx';
  const st=document.createElement('span'); st.className='think-status'; st.textContent='Thinking'; tx.appendChild(st);
  const step=document.createElement('span'); step.className='think-step'; step.textContent='Planning next moves'; tx.appendChild(step);
  tr.appendChild(tx);
  div.appendChild(tr);
  /* The live row carries its own collapsed divider, like a completed row —
     grok shows a divider only, never step lines, even mid-stream. */
  const dv=document.createElement('div'); dv.className='think-divider'; dv.hidden=true; div.appendChild(dv); wrap.appendChild(div);
  scrollToBottomIfNeeded();
  return div;
}
function updateLiveThinking(row,label){
  if(!row) return;
  const step=row.querySelector('.think-step'); if(step) step.textContent=label;
}
function removeLiveThinking(){
  const el=$('#liveThink'); if(el) el.remove();
}
function effortValue(){
  const m=settings.responseMode||'Auto';
  return m==='Auto'?1:m==='Concise'?0.5:1.2;
}
function customPromptText(){
  const mode=settings.responseMode||'Auto';
  if(mode==='Auto'||mode==='Default') return '';
  return 'Respond in a '+mode.toLowerCase()+' style.';
}
function titleCase(t){
  /* Fallback titles come from the raw prompt: cut at a word boundary and strip
     trailing punctuation, so a title never ends mid-word with a stray comma. */
  const s=String(t||'').trim().split(/\s+/).map(w=>w? w[0].toUpperCase()+w.slice(1):w).join(' ');
  if(s.length<=48) return s.replace(/[,.;:!?]+$/,'');
  return s.slice(0,48).replace(/\s+\S*$/,'').replace(/[,.;:!?]+$/,'');
}
function resetFallbackTitles(){
  /* A refresh before the title call landed left titleRequested=true with the
     raw-prompt fallback stuck forever. Reset it wherever the title is still
     the fallback, and re-run the title call for chats that already have a
     reply. */
  for(const s of sessions){
    if(!s.titleAutoPending) continue;
    const first=s.messages.find(m=>m.role==='user');
    if(first&&s.title===titleCase(first.text||'')){
      s.titleRequested=false;
      if(s.messages.length>=2&&s.messages.some(m=>m.role==='assistant')){
        const sid=s.id; setTimeout(()=>{ const t=getSession(sid); if(t) generateTitle(t).catch(()=>{}); },1500);
      }
    }
  }
  saveSessions();
}
async function generateTitle(s){
  if(!s||!s.messages.length) return;
  const firstUser=s.messages.find(m=>m.role==='user');
  if(!firstUser) return;
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:'Write a 3-6 word Title Case title for this conversation. Reply with only the title, no quotes: '+(firstUser.text||'').slice(0,300), history:[], provider:settings.provider||'apinex', model:DEFAULT_MODEL, mode:'general', autoFallback:true})});
    const data=await readChatResponse(res);
    const t=cleanAssistantText(data.reply||data.text||'').replace(/^["']|["']$/g,'').trim();
    if(t&&t.length<=60){ s.title=t; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); renderTopTitle(); }
  }catch(e){ /* title stays as-is */ }
}
async function runImageGeneration(s,userMsg){
  const prompt=(userMsg.text||'').trim();
  if(!prompt){ openSheet('imageSheet'); return; }
  streaming=true; syncComposer();
  const asstMsg={id:uid(), role:'assistant', text:'', createdAt:Date.now(), thinkMs:null, imagePrompt:prompt};
  s.messages.push(asstMsg); saveSessions(); renderMessages();
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:prompt, history:historyFor(s,userMsg.id), action:'generate-image', provider:settings.provider||'apinex', model:currentModelId, mode:'general', autoFallback:true})});
    const data=await res.json();
    /* The backend's generate-image success field is imageDataUrl, NOT
       imageUrl/url — the old read missed it, so every successful
       generation still showed "Sorry — image generation failed." */
    const url=data.imageUrl||data.url||data.imageDataUrl||'';
    asstMsg.text=url?('![Generated image]('+url+')'):'Sorry — image generation failed.';
    if(url){ extra.usage.image=(extra.usage.image||0)+1; saveExtra(); }
  }catch(e){ asstMsg.text='Sorry — image generation failed.'; }
  streaming=false; s.updatedAt=Date.now(); saveSessions(); renderMessages(); syncComposer();
}

/* ---------- scroll ---------- */
function scrollToBottomIfNeeded(){
  if(settings.behavior&&settings.behavior.autoScroll===false) return;
  const v=$('#chatView'); if(v) v.scrollTop=v.scrollHeight;
}
let scrollBtnFadeTimer=null;
function updateScrollBtn(){
  /* Grok's home has no scroll button — show it only inside a chat, and
     only once the user has scrolled up from the bottom. It fades out after
     3s idle so it never sits on message text persistently, and returns on
     the next scroll. */
  const cv=$('#chatView'); if(!cv) return;
  const dist=cv.scrollHeight-cv.scrollTop-cv.clientHeight;
  const hv=$('#homeView'); const onHome=hv&&!hv.hidden;
  const btn=$('#scrollBottom');
  const show=!!(curSession()&&!onHome&&dist>240);
  btn.hidden=!show;
  if(scrollBtnFadeTimer){ clearTimeout(scrollBtnFadeTimer); scrollBtnFadeTimer=null; }
  if(show){ btn.classList.remove('faded'); scrollBtnFadeTimer=setTimeout(()=>{ btn.classList.add('faded'); },3000); }
  else btn.classList.remove('faded');
}

/* ---------- command palette ---------- */
function openPalette(){
  palTab='all';
  renderPalette('');
  openSheet('paletteSheet');
  setTimeout(()=>{ const p=$('#paletteInput'); if(p){ p.value=''; p.focus(); } },80);
}
function renderPalette(q){
  const res=$('#paletteResults'); res.innerHTML='';
  const query=(q!==undefined?q:(palQ||'')).toLowerCase().trim();
  $$('#paletteTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.palTab===palTab));
  const match=s=>(!query||s.toLowerCase().includes(query));
  if(palTab==='imagine'){
    const em=document.createElement('div'); em.className='pal-empty'; em.textContent='Nothing generated in Imagine yet.'; res.appendChild(em); return;
  }
  if(palTab==='all'||palTab==='apps'){
    if(palTab==='all'){ res.appendChild(palSec('Quick actions')); }
    [['New Chat','Ctrl J',()=>{ closeSheet('paletteSheet'); newChat(); }],['New Project','',()=>{ closeSheet('paletteSheet'); openProjectDialog(); }],['New Automation','',()=>{ closeSheet('paletteSheet'); openSettingsPage('automations'); newAutomation(); }],['Open settings','Ctrl ,',()=>{ closeSheet('paletteSheet'); openSettingsPage('list'); }]].forEach(([label,hint,fn])=>{
      if(!match(label)) return;
      const b=palRow('plus',label,hint); b.addEventListener('click',fn); res.appendChild(b);
    });
  }
  if(palTab==='all'||palTab==='automations'){
    if(palTab==='all') res.appendChild(palSec('Automations'));
    AUTOMATIONS.forEach(a=>{
      if(!match(a.name)) return;
      const b=palRow(a.icon,a.name,'Every day at 7:30 am'); b.addEventListener('click',()=>{ closeSheet('paletteSheet'); openSettingsPage('automations'); openAutomationDetail(a.name); }); res.appendChild(b);
    });
    extra.automations.forEach(a=>{
      if(!match(a.name)) return;
      const b=palRow('zap',a.name,a.sched||'Daily at 7:30 am'); b.addEventListener('click',()=>{ closeSheet('paletteSheet'); openSettingsPage('automations'); openAutomationDetail(a.name); }); res.appendChild(b);
    });
  }
  if(palTab==='all'||palTab==='files'){
    if(palTab==='all') res.appendChild(palSec('Projects'));
    projects.forEach(p=>{
      if(!match(p.name||'')) return;
      const b=palRow('folder',p.name||'Untitled Project',''); b.addEventListener('click',()=>{ closeSheet('paletteSheet'); openProject(p.id); }); res.appendChild(b);
    });
    if(palTab==='files'){
      library.forEach(f=>{
        if(!match(f.name||'')) return;
        const b=palRow('file',f.name||'file',''); b.addEventListener('click',()=>{ closeSheet('paletteSheet'); openLibrary('files'); }); res.appendChild(b);
      });
    }
  }
  if(palTab==='all'){
    res.appendChild(palSec('Recent chats'));
    sidebarVisibleChats().slice(0,5).forEach(s=>{
      const hay=((s.title||'')+' '+((s.messages||[]).map(m=>m.text||'').join(' '))).toLowerCase();
      if(query&&!hay.includes(query)) return;
      const b=palRow('message-square',s.title||'New chat',relTime(s.updatedAt)); b.setAttribute('data-pal-chat',s.id); b.addEventListener('click',()=>{ closeSheet('paletteSheet'); openSession(s.id); }); res.appendChild(b);
    });
  }
  if(!res.children.length){ const em=document.createElement('div'); em.className='pal-empty'; em.textContent='No results'; res.appendChild(em); }
}
function palSec(t){ const d=document.createElement('div'); d.className='pal-sec'; d.textContent=t; return d; }
function palRow(ic,name,hint){
  const b=document.createElement('button'); b.type='button'; b.className='pal-row';
  const i=document.createElement('span'); i.className='pal-ic'; i.innerHTML=icon(ic,17); b.appendChild(i);
  const n=document.createElement('span'); n.className='pal-name'; n.textContent=name; b.appendChild(n);
  if(hint){ const h=document.createElement('span'); h.className='pal-hint'; h.textContent=hint; b.appendChild(h); }
  return b;
}
function relTime(ts){
  const d=Date.now()-(ts||Date.now()); const m=Math.floor(d/60000);
  if(m<1) return 'just now'; if(m<60) return m+'m ago';
  const h=Math.floor(m/60); if(h<24) return h+'h ago';
  const days=Math.floor(h/24); if(days<7) return days+'d ago';
  return new Date(ts).toLocaleDateString();
}

/* ---------- right pane ---------- */
function openPane(){
  const p=$('#rightPane'); p.hidden=false;
  renderPaneHome();
}
function closePane(){ $('#rightPane').hidden=true; }
function renderPaneHome(){
  const body=$('#paneBody'); body.innerHTML='';
  const a=document.createElement('button'); a.type='button'; a.className='pane-empty-row'; a.innerHTML=icon('image',18)+'<span>App preview</span>';
  a.addEventListener('click',()=>{ body.innerHTML=''; const n=document.createElement('div'); n.className='pal-empty'; n.textContent='Nothing to preview yet.'; body.appendChild(n); });
  const b=document.createElement('button'); b.type='button'; b.className='pane-empty-row'; b.innerHTML=icon('file',18)+'<span>Open a file… Ctrl O</span>';
  b.addEventListener('click',()=>{ openLibrary('files'); });
  body.appendChild(a); body.appendChild(b);
}

/* ---------- helpers ---------- */
function cap(s){ return s? s[0].toUpperCase()+s.slice(1):s; }
function fmtBytes(n){ n=n||0; if(n<1024) return n+' B'; if(n<1024*1024) return (n/1024).toFixed(1)+' KB'; return (n/1024/1024).toFixed(1)+' MB'; }
function libraryBytes(){ return library.reduce((a,f)=>a+(f.size||0),0); }
function libraryImages(){ return library.filter(f=>f.kind==='image'||(f.mimeType||'').startsWith('image/')); }
function voiceLabel(){ return settings.voice.grokVoice||'Ara'; }
function downloadBlob(blob,name){ try{ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),2000); }catch(e){ toast('Download is not available'); } }

/* ---------- Library ---------- */
let libTab='all';
const EXAMPLE_PROJECTS=[
 {name:'Legal Document Reviewer', desc:'Get expert analysis of U.S. legal documents', instructions:'You are a legal document reviewer. **Read every clause carefully** and explain each one in plain language. **Flag risks** and suggest clearer wording.'},
 {name:'Cover Letter Writer', desc:'Craft tailored cover letters that align your experience with the job description', instructions:'You write cover letters. **Match the applicant\'s experience** to the job description and keep the tone confident and concise.'},
 {name:'Writing Assistant', desc:'Polish and improve any text for clarity, conciseness, and style.', instructions:'You polish writing. **Improve clarity, conciseness, and style** without changing the meaning. Offer a short note on what changed.'},
 {name:'Fitness Advice', desc:'Plan workouts, nutrition, and fitness goals with evidence-based guidance', instructions:'You are a fitness coach. **Give evidence-based guidance** on workouts, nutrition, and goals. Ask about limits before prescribing.'}
];
function openLibrary(tab){ libTab=tab||'all'; renderLibrary(); $('#libraryPage').hidden=false; }
function closeLibrary(){ $('#libraryPage').hidden=true; const b=$('#appBanner'); if(b) b.hidden=false; }
function renderLibrary(){
  $$('#libTabs .tab').forEach(t=>t.classList.toggle('active', t.getAttribute('data-lib-tab')===libTab));
  const up=$('#libraryUpload'); if(up) up.textContent=libTab==='apps'?'Create app':'Upload files';
  const q=(($('#libSearch').value||'').trim().toLowerCase());
  const body=$('#libBody');
  const match=f=>!q||(f.name||'').toLowerCase().includes(q);
  const empty=(ic,title,sub)=>'<div class="lib-empty"><span class="lib-empty-ic">'+icon(ic,26)+'</span><div class="lib-empty-title">'+esc(title)+'</div><p>'+esc(sub)+'</p></div>';
  const fileRow=f=>'<div class="lib-file"><span class="lib-file-ic">'+icon(f.kind==='image'?'image':'file',18)+'</span><span class="lib-file-tx"><span>'+esc(f.name)+'</span><span class="lib-file-sub">'+fmtBytes(f.size||0)+'</span></span><button type="button" class="lib-del" data-lib-del="'+esc(f.id)+'" aria-label="Delete file">'+icon('trash-2',15)+'</button></div>';
  let html='';
  if(libTab==='all'){
    const items=library.filter(match);
    html=items.length?items.map(fileRow).join(''):empty('image','Your library is empty','Upload files to keep them within reach.');
  } else if(libTab==='media'){
    const imgs=libraryImages().filter(match);
    html=imgs.length?imgs.map(f=>f.data?'<img class="lib-img" src="data:'+(f.mimeType||'image/png')+';base64,'+esc(f.data)+'" alt="Image">':fileRow(f)).join(''):empty('image','No media yet','Upload images, videos, or audio to see them here.');
  } else if(libTab==='files'){
    const items=library.filter(f=>f.kind!=='image').filter(match);
    html=items.length?items.map(fileRow).join(''):empty('file','No files yet','Upload files to see them here.');
  } else if(libTab==='projects'){
    const items=projects.filter(p=>!q||p.name.toLowerCase().includes(q));
    html=(items.length?items.map(p=>'<button class="lib-file" data-lib-proj="'+p.id+'" type="button"><span class="lib-file-ic" style="background:'+esc(p.color||'#6e6e6a')+';color:#fff;padding:5px;border-radius:8px">'+icon(p.icon||'folder',18)+'</span><span class="lib-file-tx"><span>'+esc(p.name)+'</span><span class="lib-file-sub">'+esc(p.desc||'')+'</span></span></button>').join(''):empty('folder','Get started by creating a new project','Projects help you set common instructions and attach files for conversations.')+'<button id="libNewProjBtn" class="btn-primary" type="button">New project</button>')
      +'<div class="lib-sec">Example projects</div><div class="lib-grid">'+EXAMPLE_PROJECTS.map((p,i)=>'<button class="lib-card" data-lib-example="'+i+'" type="button"><div class="lib-card-ic">'+icon('folder',18)+'</div><div class="lib-card-title">'+esc(p.name)+'</div><div class="lib-card-desc">'+esc(p.desc)+'</div></button>').join('')+'</div>';
  } else if(libTab==='apps'){
    html=empty('layout-grid','No apps yet','Create an app with JepongDevxyz AI to see it here.');
  }
  body.innerHTML=html;
  const np=$('#libNewProjBtn'); if(np) np.addEventListener('click',()=>openProjectDialog());
  body.querySelectorAll('[data-lib-del]').forEach(b=>b.addEventListener('click',async()=>{
    const id=b.getAttribute('data-lib-del');
    const ok=await showConfirm({title:'Delete file?', text:'This file will be removed from your library.', okLabel:'Delete'});
    if(!ok) return;
    library=library.filter(f=>f.id!==id); saveLibrary(); renderLibrary();
  }));
  body.querySelectorAll('[data-lib-proj]').forEach(b=>b.addEventListener('click',()=>{ $('#libraryPage').hidden=true; openProject(b.getAttribute('data-lib-proj')); }));
  body.querySelectorAll('[data-lib-example]').forEach(b=>b.addEventListener('click',()=>{
    const p=EXAMPLE_PROJECTS[parseInt(b.getAttribute('data-lib-example'),10)];
    const proj={id:uid(), name:p.name, desc:p.desc, instructions:p.instructions, color:PROJ_COLORS[0].hex, icon:'folder', folders:[], files:[], createdAt:Date.now()};
    projects.unshift(proj); saveProjects(); renderSidebar();
    $('#libraryPage').hidden=true; openProject(proj.id);
  }));
  body.querySelectorAll('.lib-file').forEach(row=>{
    if(row.hasAttribute('data-lib-proj')) return;
    row.addEventListener('click',e=>{ if(e.target.closest('[data-lib-del]')) return; const id=row.querySelector('[data-lib-del]')?.getAttribute('data-lib-del'); const f=library.find(x=>x.id===id); if(f) openFileInPane(f); });
  });
}
function libViewMenu(){
  const btn=$('#libViewBtn'); const r=btn.getBoundingClientRect();
  showMenu(Math.min(r.left-160,window.innerWidth-210), r.bottom+6, [
    {icon:'grid', label:'View Grid', checked:libraryView==='grid', onClick:()=>{ libraryView='grid'; renderLibrary(); }},
    {icon:'layout-grid', label:'View List', checked:libraryView==='list', onClick:()=>{ libraryView='list'; renderLibrary(); }},
    {icon:'sliders', label:'Sort by — Date created', chevron:true, items:[
      {label:'Date created', checked:librarySort==='newest', onClick:()=>{ librarySort='newest'; }},
      {label:'Name', checked:librarySort==='name', onClick:()=>{ librarySort='name'; }},
      {label:'Size', checked:librarySort==='size', onClick:()=>{ librarySort='size'; }},
    ]},
    {icon:'sliders', label:'Order — Newest', chevron:true, items:[
      {label:'Newest', checked:true, onClick:()=>{}},
      {label:'Oldest', onClick:()=>{}},
    ]},
    {icon:'sliders', label:'Show Only — All', chevron:true, items:[
      {label:'All', checked:true, onClick:()=>{}},
      {label:'Images', onClick:()=>{ openLibrary('media'); }},
      {label:'Documents', onClick:()=>{ openLibrary('files'); }},
    ]},
  ]);
}
let projUploadTarget=null;
function uploadLibraryFiles(files){
  const MAX_BYTES=1100000;
  let done=0, added=0;
  const finish=()=>{ done++; if(done===files.length){ saveLibrary(); const t=projUploadTarget; projUploadTarget=null; renderLibrary(); if(currentProjectId) renderProjectPage(); if(added) toast(added+' file(s) added to your library'); } };
  files.forEach(f=>{
    if(f.size>MAX_BYTES){ toast('"'+f.name+'" is too large (max ~1 MB)'); finish(); return; }
    const isImage=f.type&&f.type.startsWith('image/');
    const entry={id:uid(), name:f.name, kind:isImage?'image':'file', mimeType:f.type||'', size:f.size||0, createdAt:Date.now(), projectId:projUploadTarget||null};
    if(!window.FileReader){ library.unshift(entry); added++; finish(); return; }
    const rd=new FileReader();
    rd.onload=()=>{ try{ const url=String(rd.result||''); entry.data=url.indexOf(',')>=0?url.split(',')[1]:url; }catch(err){} library.unshift(entry); added++; finish(); };
    rd.onerror=()=>{ toast('Could not read "'+f.name+'"'); finish(); };
    rd.readAsDataURL(f);
  });
}
function openFileInPane(f){
  openPane();
  const body=$('#paneBody'); body.innerHTML='';
  const wrap=document.createElement('div'); wrap.className='pane-file-body';
  const h=document.createElement('h3'); h.style.margin='0 0 8px'; h.textContent=f.name||'File'; wrap.appendChild(h);
  if(f.data&&(f.mimeType||'').startsWith('image/')){
    const img=document.createElement('img'); img.style.maxWidth='100%'; img.style.borderRadius='12px'; img.src='data:'+f.mimeType+';base64,'+f.data; wrap.appendChild(img);
  } else {
    const p=document.createElement('p'); p.className='set-note'; p.style.textAlign='left'; p.textContent=(f.mimeType||'File')+' · '+fmtBytes(f.size||0); wrap.appendChild(p);
  }
  body.appendChild(wrap);
}

/* ---------- Projects: dialog + icon picker + page ---------- */
const PROJ_COLORS=[
 {name:'Default', hex:'#6e6e6a'},
 {name:'Blue', hex:'#3178c6'},
 {name:'Orange', hex:'#f97316'},
 {name:'Pink', hex:'#ec4899'},
 {name:'Purple', hex:'#8b5cf6'},
 {name:'Teal', hex:'#14b8a6'},
 {name:'Red', hex:'#ef4444'},
 {name:'Green', hex:'#22c55e'}
];
const PROJ_ICONS=['Folder','Flag','Home','Star','Heart','Globe','Unlock','Smile','Shield','Bell','Mail','Phone','User','Stethoscope','Calendar','Clock','Hourglass','Sun','Moon','Monitor','Umbrella','Leaf','Bug','Flask Conical','Rocket','Plane','Car','Camera','Video','Music','Headphones','Microscope','Archive','Book Open','Zap','Wrench','Sticky Note','Scale','Film','Palette','CPU','Calculator','Laptop','Briefcase','Clipboard List','Building','Flame','Play','Database','Shirt','Gem','Gamepad','Chef Hat','Dollar Sign','Tag','Graduation Cap','Pin','Compass','Code','Box','Sparkles','Key','Lightbulb','Bookmark'];
let projColorIdx=0, projIconName='folder', projFolders=[];
function projIconKey(name){ return String(name||'folder').toLowerCase().replace(/ /g,'-'); }
function renderProjFolders(){
  const box=$('#projFolders');
  box.innerHTML=projFolders.map((f,i)=>'<span class="proj-folder-chip">'+esc(f)+'<button type="button" data-proj-folder-del="'+i+'" aria-label="Remove folder">'+icon('x',13)+'</button></span>').join('')+'<button id="projAddFolder" class="proj-add-folder" type="button">Add Folder</button>';
  box.querySelectorAll('[data-proj-folder-del]').forEach(b=>b.addEventListener('click',()=>{ projFolders.splice(parseInt(b.getAttribute('data-proj-folder-del'),10),1); renderProjFolders(); }));
  box.querySelector('#projAddFolder').addEventListener('click',async()=>{
    const name=await promptDialog('Add folder','Folder name','');
    if(name===null||!name.trim()) return;
    projFolders.push(name.trim()); renderProjFolders();
  });
}
function openProjectDialog(){
  projColorIdx=0; projIconName='folder'; projFolders=[];
  $('#projNameInput').value=''; $('#projDescInput').value='';
  syncProjIconBtn();
  renderProjFolders();
  openSheet('projectDialog');
  setTimeout(()=>{ try{ $('#projNameInput').focus(); }catch(e){} },60);
}
function syncProjIconBtn(){
  const b=$('#projIconBtn'); if(!b) return;
  b.innerHTML=icon(projIconKey(projIconName),26);
  b.style.background=PROJ_COLORS[projColorIdx].hex;
  b.style.color='#fff';
}
function openProjIconSheet(){
  renderProjIconSheet();
  const sh=$('#projIconSheet'); if(sh) sh.hidden=false;
  if(!openSheets.includes('projIconSheet')) openSheets.push('projIconSheet');
}
function renderProjIconSheet(){
  const sh=$('#projIconSubhead'); if(sh) sh.textContent='Icon and color · '+PROJ_COLORS[projColorIdx].name;
  $('#projColorRow').innerHTML=PROJ_COLORS.map((c,i)=>'<button class="proj-color-dot'+(i===projColorIdx?' sel':'')+'" type="button" style="--dot:'+c.hex+';background:'+c.hex+'" data-proj-color="'+i+'" aria-label="'+esc(c.name)+'" title="'+esc(c.name)+'"></button>').join('');
  $('#projIconGrid').innerHTML=PROJ_ICONS.map(n=>{ const k=projIconKey(n); return '<button class="proj-icon-cell'+(projIconName===k?' sel':'')+'" type="button" data-proj-icon="'+k+'" aria-label="'+esc(n)+'" title="'+esc(n)+'">'+icon(k,22)+'</button>'; }).join('');
  $('#projColorRow').querySelectorAll('[data-proj-color]').forEach(b=>b.addEventListener('click',()=>{ projColorIdx=+b.getAttribute('data-proj-color'); syncProjIconBtn(); renderProjIconSheet(); }));
  $('#projIconGrid').querySelectorAll('[data-proj-icon]').forEach(b=>b.addEventListener('click',()=>{ projIconName=b.getAttribute('data-proj-icon'); syncProjIconBtn(); renderProjIconSheet(); }));
}
function createProjectFromDialog(){
  const name=$('#projNameInput').value.trim()||'Untitled Project';
  const desc=$('#projDescInput').value.trim();
  const proj={id:uid(), name, desc, instructions:'', color:PROJ_COLORS[projColorIdx].hex, icon:projIconName, folders:projFolders.slice(), files:[], createdAt:Date.now()};
  projects.unshift(proj); saveProjects(); renderSidebar();
  closeSheet('projectDialog');
  openProject(proj.id); toast('Project created');
}
function openProject(id){
  const p=projects.find(x=>x.id===id); if(!p) return;
  currentProjectId=id;
  $('#projectTitle').textContent=p.name||'Untitled Project';
  projTab='suggested';
  renderProjectPage();
  $('#projectPage').hidden=false;
}
function closeProjectPage(){ $('#projectPage').hidden=true; currentProjectId=null; const b=$('#appBanner'); if(b) b.hidden=false; }
function projectPageMenu(){
  const p=projects.find(x=>x.id===currentProjectId); if(!p) return;
  const btn=$('#projectMenuBtn'); const r=btn?btn.getBoundingClientRect():{left:200,bottom:80};
  showMenu(Math.min(r.left-120,window.innerWidth-210), r.bottom+6, [
    {icon:'pencil', label:'Rename', onClick:()=>renameProject(p)},
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteProject(p.id)},
  ]);
}
function renderProjectPage(){
  const p=projects.find(x=>x.id===currentProjectId); if(!p) return;
  $$('#projectTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.projTab===projTab));
  const body=$('#projectBody');
  const chats=sessions.filter(s=>s.projectId===p.id&&!s.temporary&&!s.archived);
  const files=library.filter(f=>f.projectId===p.id);
  let html='';
  if(projTab==='suggested'){
    html='<div class="proj-composer"><div class="composer"><textarea id="projComposerInput" rows="1" placeholder="Ask anything in this project…" aria-label="Ask anything in this project…"></textarea><button id="projSendBtn" class="send-btn" type="button" aria-label="Send">'+icon('arrow-up',18)+'</button></div></div>'
      +'<h3>Suggested</h3>'
      +'<button class="proj-card" data-proj-sugg="instructions" type="button"><span class="proj-card-ic">'+icon('pencil',18)+'</span><span><span class="proj-card-title">Edit instructions</span><span class="proj-card-sub" style="display:block">Tell JepongDevxyz AI how to work in this project</span></span></button>'
      +'<button class="proj-card" data-proj-sugg="files" type="button"><span class="proj-card-ic">'+icon('file',18)+'</span><span><span class="proj-card-title">Add file</span><span class="proj-card-sub" style="display:block">Attach files as project context</span></span></button>'
      +(chats.length?'<h3>Chats ('+chats.length+')</h3>'+chats.map(s=>'<button class="lib-row" data-proj-chat="'+s.id+'" type="button"><span class="lib-ic">'+icon('message-square',16)+'</span><span class="lib-meta"><span class="lib-name">'+esc(s.title||'New chat')+'</span></span></button>').join(''):'');
  } else if(projTab==='instructions'){
    const instr=(p.instructions||'').trim();
    html='<h3>Instructions</h3>'
      +'<button class="proj-card" data-proj-edit-instr type="button"><span class="proj-card-ic">'+icon('pencil',18)+'</span><span><span class="proj-card-title">Edit project instructions</span><span class="proj-card-sub" style="display:block">'+esc(instr?instr.slice(0,120)+(instr.length>120?'…':''):'No instructions yet.')+'</span></span></button>';
  } else if(projTab==='automations'){
    const mine=(extra.automations||[]).filter(a=>a.projectId===p.id);
    html='<h3>Automations</h3>'+(mine.length?mine.map(a=>'<div class="proj-card"><span class="proj-card-ic">'+icon('clock',18)+'</span><span><span class="proj-card-title">'+esc(a.name)+'</span><span class="proj-card-sub" style="display:block">'+esc(a.sched||'Daily at 7:30 am')+'</span></span></div>').join(''):'<p class="set-note">No automations in this project yet.</p>');
  } else if(projTab==='files'){
    html='<h3>Files</h3>'
      +(files.length?files.map(f=>'<button class="lib-row" data-proj-file="'+f.id+'" type="button"><span class="lib-ic">'+icon(f.kind==='image'?'image':'file',16)+'</span><span class="lib-meta"><span class="lib-name">'+esc(f.name)+'</span><span class="lib-sub">'+fmtBytes(f.size||0)+'</span></span></button>').join(''):'')
      +'<div class="proj-drop">Drag and drop files here<button class="btn-ghost" id="projAddFilesBtn" type="button">Add project files. Drag and drop files to here, or click to browse.</button></div>';
  }
  body.innerHTML=html;
  const pc=$('#projComposerInput');
  if(pc){ pc.addEventListener('input',()=>{ pc.style.height='auto'; pc.style.height=Math.min(pc.scrollHeight,120)+'px'; });
    const send=()=>{ const t=(pc.value||'').trim(); if(!t) return; const s=createSession({projectId:p.id}); currentId=s.id; closeProjectPage(); const inp=$('#composerInput'); inp.value=t; renderAll(); doSend(); };
    $('#projSendBtn').addEventListener('click',send);
    pc.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); } });
  }
  body.querySelectorAll('[data-proj-sugg]').forEach(b=>b.addEventListener('click',()=>{ projTab=b.getAttribute('data-proj-sugg'); renderProjectPage(); }));
  const ei=body.querySelector('[data-proj-edit-instr]');
  if(ei) ei.addEventListener('click',async()=>{
    const next=await promptDialog('Edit project instructions','Instructions', p.instructions||'', true);
    if(next===null||next===undefined) return;
    p.instructions=next; saveProjects(); renderProjectPage();
  });
  body.querySelectorAll('[data-proj-chat]').forEach(b=>b.addEventListener('click',()=>{ closeProjectPage(); openSession(b.getAttribute('data-proj-chat')); }));
  body.querySelectorAll('[data-proj-file]').forEach(b=>b.addEventListener('click',()=>{ const f=library.find(x=>x.id===b.getAttribute('data-proj-file')); if(f) openFileInPane(f); }));
  const af=body.querySelector('#projAddFilesBtn');
  if(af) af.addEventListener('click',()=>{ projUploadTarget=p.id; $('#libFileInput').click(); });
}

/* ---------- Upgrade (free per Q2) ---------- */
function openUpgradeSheet(tab){
  upgTab=tab||settings.plan&&UPGRADE_PLANS[settings.plan]?settings.plan:'Premium';
  if(!UPGRADE_PLANS[upgTab]) upgTab='Premium';
  renderUpgrade();
  openSheet('upgradeSheet');
  startUpgCountdown();
}
function closeUpgradeSheet(){ closeSheet('upgradeSheet'); stopUpgCountdown(); }
function upgCountdownText(){
  const end=new Date('2026-12-02T16:00:00+08:00').getTime();
  let d=Math.max(0,end-Date.now());
  const days=Math.floor(d/86400000); d-=days*86400000;
  const hrs=Math.floor(d/3600000); d-=hrs*3600000;
  const min=Math.floor(d/60000); d-=min*60000;
  const sec=Math.floor(d/1000);
  const p=n=>String(n).padStart(2,'0');
  return p(days)+' DAYS : '+p(hrs)+' HR : '+p(min)+' MIN : '+p(sec)+' SEC';
}
function startUpgCountdown(){
  stopUpgCountdown();
  const tick=()=>{ const el=$('#upgCountdown'); if(el) el.textContent=upgCountdownText(); };
  tick(); countdownTimer=setInterval(tick,1000);
}
function stopUpgCountdown(){ if(countdownTimer){ clearInterval(countdownTimer); countdownTimer=null; } }
function renderUpgrade(){
  $$('#upgTabs .tab').forEach(t=>t.classList.toggle('active',t.dataset.upgTab===upgTab));
  const plan=UPGRADE_PLANS[upgTab];
  const body=$('#upgBody');
  let html='';
  if(upgTab==='Premium'){
    html+='<div class="upg-promo">Pay for 1 month, get 1 free</div><div class="upg-countdown" id="upgCountdown"></div><div class="upg-offer-end">Offer ends Dec 2, 2026, 4:00 PM</div>';
  }
  html+='<div class="upg-plan-sub">'+esc(plan.intro)+'</div>';
  if(plan.intro2) html+='<div class="upg-plan-sub" style="font-weight:700;color:var(--ink)">'+esc(plan.intro2)+'</div><div class="upg-plan-sub">'+esc(plan.intro3)+'</div>';
  if(plan.mult) html+='<div class="upg-plan-sub" style="font-weight:700;color:var(--ink)">'+esc(plan.mult)+'</div>';
  if(upgTab==='Premium') html+='<span class="upg-deal">'+icon('clock',12)+'Black friday deal</span>';
  if(upgTab==='Plus'||upgTab==='Super'||upgTab==='Ultra'){
    html+='<div class="upg-toggle"><button class="chip-btn'+(upgBilling==='monthly'?' active':'')+'" data-bill="monthly" type="button">'+esc(plan.was)+'</button><button class="chip-btn'+(upgBilling==='yearly'?' active':'')+'" data-bill="yearly" type="button">'+esc(plan.yearly)+'</button></div>';
  }
  html+='<div class="upg-price">'+esc(plan.price)+(plan.was?'<span class="upg-was">'+esc(upgBilling==='yearly'&&plan.yearly?plan.yearly:plan.was)+'</span>':'')+'</div>';
  if(plan.yearly) html+='<div class="upg-price-sub">Yearly <span class="upg-was">'+esc(plan.yearly)+'</span> ('+esc(plan.yearlyPer)+') · <strong>Save 17%</strong></div>';
  if(upgTab==='Premium') html+='<div class="upg-price-sub">'+esc(plan.billed)+'</div><div class="upg-price-sub">'+esc(plan.then)+'</div><div class="upg-price-sub">'+esc(plan.renew)+'</div>';
  html+='<div class="upg-benefits">AI Benefits</div><ul class="upg-benefits-list">'+plan.ai.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>';
  if(plan.x&&plan.x.length) html+='<div class="upg-benefits">𝕏 Benefits</div><ul class="upg-benefits-list">'+plan.x.map(b=>'<li>'+esc(b)+'</li>').join('')+'</ul>';
  html+='<button class="btn-primary" id="upgClaimBtn" type="button">'+esc(plan.btn)+'</button>';
  body.innerHTML=html;
  body.querySelectorAll('[data-bill]').forEach(b=>b.addEventListener('click',()=>{ upgBilling=b.getAttribute('data-bill'); renderUpgrade(); startUpgCountdown(); }));
  const claim=body.querySelector('#upgClaimBtn');
  if(claim) claim.addEventListener('click',()=>{
    settings.plan=upgTab; saveSettings();
    closeUpgradeSheet();
    toast(upgTab+' plan set — Free on this device');
  });
  startUpgCountdown();
}

/* ---------- Black Friday promo dialog (pass E) ---------- */
function openPromoSheet(){
  openSheet('promoSheet');
  const tick=()=>{ const el=$('#promoCountdown'); if(!el) return; const end=new Date('2026-12-02T16:00:00+08:00').getTime(); let d=Math.max(0,end-Date.now()); const days=Math.floor(d/86400000); d-=days*86400000; const hrs=Math.floor(d/3600000); d-=hrs*3600000; const min=Math.floor(d/60000); d-=min*60000; const sec=Math.floor(d/1000); el.textContent=days+'D '+hrs+'H '+min+'M '+sec+'S'; };
  tick(); promoTimer=setInterval(tick,1000);
}
function closePromoSheet(){ closeSheet('promoSheet'); if(promoTimer){ clearInterval(promoTimer); promoTimer=null; } }

/* ---------- account menu / sign out ---------- */
function openAccountMenu(anchor){
  const r=anchor.getBoundingClientRect();
  showMenu(Math.min(r.left,window.innerWidth-220), r.bottom+6, [
    {account:{name:settings.profileName||'Jepong', sub:'Free on this device'}},
    {icon:'external-link', label:'Dashboard', onClick:()=>{ try{ window.open('https://jepong-devxyz-ai.vercel.app/','_blank'); }catch(e){ toast('Could not open the dashboard'); } }},
    {icon:'settings', label:'Settings', onClick:()=>openSettings('list')},
    {icon:'help-circle', label:'Help', chevron:true, items:[
      {label:'FAQ', onClick:()=>openInfoPage('faq')},
      {label:'Community', onClick:()=>openInfoPage('community')},
      {label:'Changelog', onClick:()=>openInfoPage('changelog')},
      {label:'Send Feedback', onClick:()=>openFeedback()},
      {divider:true},
      {label:'Shared Links', onClick:()=>openInfoPage('sharedlinks')},
    ]},
    {icon:'sparkles', label:'Upgrade plan', onClick:()=>openUpgradeSheet()},
    {icon:'log-out', label:'Sign out', onClick:()=>signOut()},
  ]);
}
function openHelpMenu(){
  /* The Help submenu as a standalone menu (same items as the account menu's
     Help fly-out): FAQ / Community / Changelog / Send Feedback / Shared Links. */
  const anchor=$('#profileBtn')||$('#menuBtn');
  const r=anchor?anchor.getBoundingClientRect():{left:8, bottom:100};
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+6, [
    {label:'FAQ', onClick:()=>openInfoPage('faq')},
    {label:'Community', onClick:()=>openInfoPage('community')},
    {label:'Changelog', onClick:()=>openInfoPage('changelog')},
    {label:'Send Feedback', onClick:()=>openFeedback()},
    {divider:true},
    {label:'Shared Links', onClick:()=>openInfoPage('sharedlinks')},
  ]);
}
async function signOut(){
  const ok=await showConfirm({title:'Sign out?', text:'Your local profile and session data will be cleared from this browser.', okLabel:'Sign out'});
  if(!ok) return;
  [K.sessions,K.settings,K.projects,K.extra,K.drafts,K.pending,K.library].forEach(k=>LS.del(k));
  location.reload();
}

/* ---------- info pages / feedback ---------- */
function openInfoPage(key){
  const page=$('#infoPage'), title=$('#infoTitle'), body=$('#infoBody');
  const set=(t,html)=>{ title.textContent=t; body.innerHTML=html; };
  if(key==='faq'){ set('FAQ','<div class="set-card"><h3>What is JepongDevxyz AI?</h3><p>A chat app that runs on your device and talks to the JepongDevxyz AI backend.</p></div><div class="set-card"><h3>Where is my data stored?</h3><p>Chats, settings, projects and library files are stored in this browser on your device. Nothing is uploaded to a JepongDevxyz AI server for storage.</p></div><div class="set-card"><h3>Is there an account?</h3><p>No. There is no JepongDevxyz AI account — everything is local to this device, and the plan is Free.</p></div>'); }
  else if(key==='community'){ set('Community','<p class="set-note">There is no community forum for JepongDevxyz AI yet.</p>'); }
  else if(key==='changelog'){ set('Changelog','<div class="set-card"><h3>Rebuilt from zero — 2026-11-26</h3><p>Fresh rebuild to match grok.com corner by corner: new home, composer, sidebar, Library, Projects, Settings, Upgrade and voice mode.</p></div>'); }
  else if(key==='sharedlinks'){ set('Shared Links','<p class="set-note">Shared links can be viewed by anyone with the link.</p>'+(extra.sharedLinks.length?extra.sharedLinks.map(l=>'<div class="set-card"><h3>'+esc(l.title||'Shared chat')+'</h3><p>'+esc(new Date(l.createdAt).toLocaleDateString())+'</p><button class="btn-ghost" data-unshare="'+l.id+'" type="button">Unshare</button></div>').join(''):'<p class="set-note">No shared links yet.</p>'));
    body.querySelectorAll('[data-unshare]').forEach(b=>b.addEventListener('click',()=>{ extra.sharedLinks=extra.sharedLinks.filter(x=>x.id!==b.getAttribute('data-unshare')); saveExtra(); openInfoPage('sharedlinks'); toast('Link unshared'); }));
  }
  else if(key==='archived'){ const items=sessions.filter(s=>s.archived); set('Archived Conversations', items.length?items.map(s=>'<button class="lib-row" data-arch="'+s.id+'" type="button"><span class="lib-ic">'+icon('archive',16)+'</span><span class="lib-meta"><span class="lib-name">'+esc(s.title||'New chat')+'</span></span></button>').join(''):'<p class="set-note">No archived conversations.</p>');
    body.querySelectorAll('[data-arch]').forEach(b=>b.addEventListener('click',()=>{ const s=getSession(b.getAttribute('data-arch')); if(s){ s.archived=false; saveSessions(); page.hidden=true; openSession(s.id); } }));
  }
  else if(key==='deleted'){ set('Deleted Conversations','<p class="set-note">Deleted conversations are permanently removed after 30 days.</p>'+(extra.trash.length?extra.trash.map(t=>'<div class="set-card"><h3>'+esc(t.title||'New chat')+'</h3><p>Deleted '+esc(relTime(t.deletedAt))+'</p><button class="btn-ghost" data-restore="'+t.id+'" type="button">Restore</button></div>').join(''):'<p class="set-note">You have no recently deleted conversations.</p>'));
    body.querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>{ page.hidden=true; restoreChat(b.getAttribute('data-restore')); }));
  }
  else if(key==='files'){ set('Files and Assets','<p class="set-note">'+fmtBytes(libraryBytes())+' used of 1.0 GB</p>'+(library.length?library.map(f=>'<div class="lib-row"><span class="lib-ic">'+icon(f.kind==='image'?'image':'file',16)+'</span><span class="lib-meta"><span class="lib-name">'+esc(f.name)+'</span><span class="lib-sub">'+fmtBytes(f.size||0)+'</span></span></div>').join(''):'<p class="set-note">No files are stored for this account.</p>')); }
  else if(key==='terms'){ set('Terms of Service','<div class="set-card"><h3>Terms of Service</h3><p>JepongDevxyz AI is provided as-is for personal use. Messages you send are processed by the chat backend to generate replies. Be kind, and don\'t use the app to harm others.</p></div>'); }
  else if(key==='privacy'){ set('Privacy Policy','<div class="set-card"><h3>Privacy Policy</h3><p>Your chats, settings and projects are stored in this browser on your device. There is no JepongDevxyz AI account and nothing is uploaded to a JepongDevxyz AI server for storage. Messages you send are processed by the chat backend to generate replies. Voice input uses your device speech recognition and voices.</p></div>'); }
  else if(key==='acceptable'){ set('Acceptable Use Policy','<div class="set-card"><h3>Acceptable Use Policy</h3><p>Don\'t use JepongDevxyz AI for anything illegal, to deceive people, or to generate harmful content.</p></div>'); }
  else if(key==='cookiesPage'){ set('Cookie Policy','<div class="set-card"><h3>Cookie Policy</h3><p>JepongDevxyz AI stores its data in this browser\'s local storage, not in cookies. No tracking cookies are set.</p></div>'); }
  else if(key==='cookies'){ set('Cookie Settings','<p class="set-note">JepongDevxyz AI does not use tracking cookies. Data is stored in this browser only.</p>'); }
  else { set('Page','<p class="set-note">Nothing here yet.</p>'); }
  page.hidden=false;
}
function closeInfoPage(){ $('#infoPage').hidden=true; const b=$('#appBanner'); if(b) b.hidden=false; }
async function openFeedback(){
  const text=await promptDialog('Send Feedback','Your feedback','', true);
  if(text===null||text===undefined) return;
  const t=text.trim(); if(!t) return;
  extra.feedback.push({id:uid(), text:t, at:Date.now()}); saveExtra();
  toast('Thanks for the feedback');
}
async function newPersonalSkill(){
  const name=await promptDialog('New Skill','Skill name','');
  if(name===null||!name.trim()) return;
  const instr=await promptDialog('New Skill','What should this skill do?','', true);
  if(instr===null) return;
  extra.skills.push({id:uid(), name:name.trim(), instructions:instr.trim(), on:true}); saveExtra();
  renderSettingsPage(); toast('Skill saved');
}
function openSkillFileDialog(s){
  showInfo(s.name, s.desc+'\n\nFiles with .'+(s.ext||s.id||'')+' are created when you ask JepongDevxyz AI to make one.', 'OK');
}

/* ---------- Settings ---------- */
const SETTING_ROWS=[
 {key:'account', icon:'user', label:'Account'},
 {key:'appearance', icon:'moon', label:'Appearance'},
 {key:'behavior', icon:'brain', label:'Behavior'},
 {key:'notifications', icon:'bell', label:'Notifications'},
 {key:'customize', icon:'sliders', label:'Customize'},
 {key:'connectors', icon:'plug', label:'Connect Apps'},
 {key:'skills', icon:'zap', label:'Skills'},
 {key:'automations', icon:'clock', label:'Automations'},
 {key:'data', icon:'shield', label:'Data Controls'},
];
function switchHtml(on, id, label){
  return '<button id="'+id+'" class="switch'+(on?' on':'')+'" type="button" aria-label="'+esc(label)+'"></button>';
}
function toggleRow(id, title, sub, on){
  return '<div class="set-toggle-row"><div class="set-toggle-text"><h3>'+esc(title)+'</h3>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'+switchHtml(on, id, title)+'</div>';
}
function openSettings(key){
  settingsPage=key||'list';
  if(settingsPage==='connect') settingsPage='connectors';
  renderSettingsPage();
  $('#settingsPage').hidden=false;
}
function closeSettings(){ $('#settingsPage').hidden=true; settingsPage='list'; const b=$('#appBanner'); if(b) b.hidden=false; }
function renderSettingsPage(){
  const body=$('#settingsBody'), title=$('#settingsTitle');
  const sb=$('#settingsBack'); if(sb) sb.style.display=settingsPage==='list'?'none':'';
  const wrap=$('.set-search-wrap'); if(wrap) wrap.style.display=settingsPage==='list'?'':'none';
  const rowHtml=r=>'<button class="set-row" data-set="'+r.key+'"><span class="set-ic">'+icon(r.icon,18)+'</span><span class="set-label">'+esc(r.label)+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>';
  if(settingsPage==='list'){
    title.textContent='Settings';
    body.innerHTML='<div class="set-list plain">'+SETTING_ROWS.map(rowHtml).join('')+'</div>';
    body.querySelectorAll('[data-set]').forEach(b=>b.addEventListener('click',()=>{ settingsPage=b.getAttribute('data-set'); renderSettingsPage(); }));
    return;
  }
  if(settingsPage==='account'){
    title.textContent='Account';
    body.innerHTML='<div class="set-card"><div class="set-acct"><span class="sb-avatar">'+icon('user',28)+'</span><span class="set-acct-meta"><span class="set-acct-name">'+esc(settings.profileName||'Jepong')+'</span><span class="set-acct-mail">Free on this device</span></span></div></div>'
      +'<div class="set-list">'
      +'<button class="set-row" id="accManage"><span class="set-ic">'+icon('user',18)+'</span><span class="set-label">Manage Account</span><span class="chev">↗</span></button>'
      +'<button class="set-row" id="accSignOut"><span class="set-ic">'+icon('log-out',18)+'</span><span class="set-label">Sign Out</span></button>'
      +'<button class="set-row" id="accDashboard"><span class="set-ic">'+icon('layout-grid',18)+'</span><span class="set-label">JepongDevxyz AI dashboard</span><span class="set-sub">Your JepongDevxyz AI and Cursor accounts are linked</span><span class="set-value">Open ↗</span></button>'
      +'<button class="set-row" id="accX"><span class="set-ic">'+icon('share',18)+'</span><span class="set-label">𝕏 Account</span><span class="set-value">Not connected</span></button>'
      +'<button class="set-row" id="accBirth"><span class="set-ic">'+icon('calendar',18)+'</span><span class="set-label">Birth Year</span><span class="set-value">Not set</span></button>'
      +'</div>'
      +'<div class="set-subhead">App</div>'
      +'<button class="set-row" id="accLangRow"><span class="set-ic">'+icon('globe',18)+'</span><span class="set-label">Language</span><span class="set-value">'+esc((settings.responseLang&&settings.responseLang.label)||'Auto')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<div class="set-subhead">Plan</div>'
      +'<div class="set-card"><h3>'+esc(settings.plan||'Free')+'</h3><p>Free on this device — no payment is taken.</p><button id="accUpgrade" class="btn-primary" type="button">Upgrade</button></div>';
    body.querySelector('#accManage').addEventListener('click',()=>{ settingsPage='profile'; renderSettingsPage(); });
    body.querySelector('#accSignOut').addEventListener('click',()=>signOut());
    body.querySelector('#accDashboard').addEventListener('click',()=>{ try{ window.open('https://jepong-devxyz-ai.vercel.app/','_blank'); }catch(e){ toast('Could not open the dashboard'); } });
    body.querySelector('#accX').addEventListener('click',()=>{ showInfo('𝕏 Account','No 𝕏 account is connected on this device.','OK'); });
    body.querySelector('#accBirth').addEventListener('click',()=>{ showInfo('Birth Year','No birth year is set on this device.','OK'); });
    body.querySelector('#accLangRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      const langs=[{code:'auto',label:'Auto'},{code:'en',label:'English'},{code:'fil',label:'Filipino'},{code:'es',label:'Spanish'},{code:'fr',label:'French'},{code:'de',label:'German'},{code:'ja',label:'Japanese'},{code:'ko',label:'Korean'},{code:'zh',label:'Chinese'}];
      showMenu(Math.min(r.left,window.innerWidth-220), r.bottom+4, langs.map(l=>({label:l.label+(((settings.responseLang&&settings.responseLang.code)||'auto')===l.code?' ✓':''), onClick:()=>{ settings.responseLang={code:l.code,label:l.label}; saveSettings(); renderSettingsPage(); toast('Language updated'); }})));
    });
    body.querySelector('#accUpgrade').addEventListener('click',()=>{ $('#settingsPage').hidden=true; openUpgradeSheet(); });
    return;
  }
  if(settingsPage==='profile'){
    title.textContent='Profile';
    body.innerHTML='<label class="field-label" for="pfName">Name</label><input id="pfName" class="field" value="'+esc(settings.profileName||'')+'" maxlength="40">'
      +'<label class="field-label" for="pfEmail">Email</label><input id="pfEmail" class="field" value="'+esc(settings.profileEmail||'')+'" maxlength="80" placeholder="Optional">'
      +'<button id="pfSave" class="btn-primary" type="button">Save</button>';
    body.querySelector('#pfSave').addEventListener('click',()=>{
      settings.profileName=body.querySelector('#pfName').value.trim()||'Jepong';
      settings.profileEmail=body.querySelector('#pfEmail').value.trim();
      saveSettings(); renderAll(); toast('Profile saved'); settingsPage='account'; renderSettingsPage();
    });
    return;
  }
  if(settingsPage==='appearance'){
    title.textContent='Appearance';
    const cur=settings.theme||'system';
    body.innerHTML='<div class="set-card">'
      +'<button class="set-row" id="themeRow"><span class="set-ic">'+icon('monitor',18)+'</span><span class="set-label">Theme</span><span class="theme-pill">'+esc(cap(cur))+' ⌄</span></button>'
      +toggleRow('wrapCodeSw','Wrap Long Code Blocks','Wrap code that is wider than the screen instead of scrolling it.', !!(settings.interface&&settings.interface.wrapCode))
      +toggleRow('reduceMotionSw','Reduce motion','Minimize animations and transitions.', !!(settings.interface&&settings.interface.reduceMotion))
      +toggleRow('showSuggSw','Show suggestions','Starter prompts on new chats and follow-ups under replies.', settings.interface.showSuggestions!==false)
      +'</div>';
    body.querySelector('#themeRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['light','dark','system'].map(t=>({label:cap(t)+(cur===t?' ✓':''), onClick:()=>{ settings.theme=t; saveSettings(); applyTheme(); renderSettingsPage(); }})));
    });
    body.querySelector('#wrapCodeSw').addEventListener('click',e=>{ settings.interface.wrapCode=!settings.interface.wrapCode; saveSettings(); applyTheme(); e.currentTarget.classList.toggle('on', settings.interface.wrapCode); });
    body.querySelector('#reduceMotionSw').addEventListener('click',e=>{ settings.interface.reduceMotion=!settings.interface.reduceMotion; saveSettings(); applyTheme(); e.currentTarget.classList.toggle('on', settings.interface.reduceMotion); });
    body.querySelector('#showSuggSw').addEventListener('click',e=>{ settings.interface.showSuggestions=settings.interface.showSuggestions===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.interface.showSuggestions!==false); renderHome(); });
    return;
  }
  if(settingsPage==='behavior'){
    title.textContent='Behavior';
    body.innerHTML='<div class="set-subhead">Sending</div><div class="set-card">'
      +toggleRow('behCtrlSw','Require Ctrl+Enter to send','Press Ctrl+Enter to send a message.', !!(settings.behavior&&settings.behavior.ctrlEnter))
      +toggleRow('behScrollSw','Auto-Scroll','Follow each reply to the bottom as it streams. Turn off to keep your message at the top.', !(settings.behavior&&settings.behavior.autoScroll===false))
      +'</div>'
      +'<div class="set-subhead">Voice</div><div class="set-list">'
      +'<button class="set-row" id="behVoiceRow"><span class="set-ic">'+icon('volume-2',18)+'</span><span class="set-label">Voice</span><span class="set-value">'+esc(voiceLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="behSpeedRow"><span class="set-ic">'+icon('gauge',18)+'</span><span class="set-label">Speed</span><span class="set-value">'+esc(vmSpeedLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="behPersRow"><span class="set-ic">'+icon('user',18)+'</span><span class="set-label">Personality</span><span class="set-value">'+esc(vmPersonalityLabel())+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" id="behDictRow"><span class="set-ic">'+icon('mic',18)+'</span><span class="set-label">Dictation Refinement</span><span class="set-value">'+esc(settings.voice.dictation||'Tidy up')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'</div><p class="set-note">Changes apply from JepongDevxyz AI\'s next reply, even during a call.</p>';
    body.querySelector('#behCtrlSw').addEventListener('click',e=>{ settings.behavior.ctrlEnter=!settings.behavior.ctrlEnter; saveSettings(); e.currentTarget.classList.toggle('on', settings.behavior.ctrlEnter); });
    body.querySelector('#behScrollSw').addEventListener('click',e=>{ settings.behavior.autoScroll=settings.behavior.autoScroll===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.behavior.autoScroll!==false); });
    body.querySelector('#behVoiceRow').addEventListener('click',()=>openVoicePickerDialog());
    body.querySelector('#behSpeedRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, VM_SPEEDS.map(sp=>({label:sp.l+((settings.voice.rate||1)===sp.v?' ✓':''), onClick:()=>{ settings.voice.rate=sp.v; saveSettings(); renderSettingsPage(); toast('Speed updated'); }})));
    });
    body.querySelector('#behPersRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, VM_PERSONALITIES.map(p=>({label:p+(vmPersonalityLabel()===p?' ✓':''), onClick:async()=>{
        if(p==='Custom…'){
          const cur2=settings.personalization.custom||'';
          const next=await promptDialog('Custom personality','Custom instruction', cur2);
          if(next===null) return;
          settings.personalization.custom=next.trim(); settings.voice.personality='Custom…';
        } else {
          settings.voice.personality=p;
        }
        saveSettings(); renderSettingsPage(); toast('Personality updated');
      }})));
    });
    body.querySelector('#behDictRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      const dictOpts=DICTATIONS.map(d=>({label:d.name+((settings.voice.dictation||'Tidy up')===d.name?' ✓':''), sub:d.desc, onClick:()=>{ settings.voice.dictation=d.name; saveSettings(); renderSettingsPage(); toast('Dictation refinement updated'); }}));
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, dictOpts);
    });
    return;
  }
  if(settingsPage==='notifications'){
    title.textContent='Notifications';
    body.innerHTML='<div class="set-card">'
      +toggleRow('notifBrowserSw','Browser Notifications','When a long answer finishes, when a Bot finishes a turn, and when JepongDevxyz AI checks in on a chat.', !!(settings.notifications&&settings.notifications.browser))
      +'</div>'
      +'<div class="set-subhead">Email</div>'
      +'<button class="set-row" id="notifUpdatesRow"><span class="set-ic">'+icon('bell',18)+'</span><span class="set-label">Product Updates</span><span class="set-value">'+esc((settings.notifications&&settings.notifications.updates)||'Off')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>';
    body.querySelector('#notifBrowserSw').addEventListener('click',async e=>{
      if(!settings.notifications.browser){
        if(!('Notification' in window)){ toast('Notifications are not supported in this browser'); return; }
        try{
          const perm=await Notification.requestPermission();
          if(perm!=='granted'){ toast('Notification permission denied'); return; }
        }catch(err){ toast('Notification permission denied'); return; }
      }
      settings.notifications.browser=!settings.notifications.browser; saveSettings();
      e.currentTarget.classList.toggle('on', settings.notifications.browser);
    });
    body.querySelector('#notifUpdatesRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['On','Off'].map(u=>({label:u+((settings.notifications.updates||'Off')===u?' ✓':''), onClick:()=>{ settings.notifications.updates=u; saveSettings(); renderSettingsPage(); }})));
    });
    return;
  }
  if(settingsPage==='customize'){
    title.textContent='Customize';
    body.innerHTML='<button class="set-row" id="custRow"><span class="set-ic">'+icon('sliders',18)+'</span><span class="set-label">Customize JepongDevxyz AI\'s Response</span><span class="set-sub">Personalize how JepongDevxyz AI responds to you.</span><span class="set-value">'+esc(settings.personalization.style||'Default')+'</span><span class="chev">'+icon('chevron-right',16)+'</span></button>';
    body.querySelector('#custRow').addEventListener('click',e=>{
      const r=e.currentTarget.getBoundingClientRect();
      showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, RESPONSE_MODES.map(m=>({label:m+((settings.personalization.style||'Default')===m?' ✓':''), onClick:()=>{ settings.personalization.style=m; saveSettings(); renderSettingsPage(); toast('Response style updated'); }})));
    });
    return;
  }
  if(settingsPage==='connectors'){
    title.textContent='Connect Apps';
    body.innerHTML='<button class="set-subhead" id="connYourApps" type="button">Your apps</button>'
      +'<button class="set-row" id="connManageRow" type="button"><span class="set-label">0 connected</span><span class="chev">›</span></button>'
      +'<p class="set-note">Connections need an app account; requests are saved on this device.</p>'
      +'<div class="conn-search"><span>'+icon('search',16)+'</span><input id="connSearch" type="text" placeholder="Search apps" autocomplete="off"></div>'
      +'<div class="conn-chips" id="connChips"></div>'
      +'<div id="connList"></div>'
      +'<button id="connCustom" class="btn-ghost" type="button" style="border:1px solid var(--line);margin-top:12px">Add a custom connector</button>';
    let connCat='All', connQ='';
    const cats=['All','Advertising','Analytics','Apps','Developer','Finance','More'];
    const renderConn=()=>{
      $$('#connChips .conn-chip').forEach(c=>c.classList.toggle('active', c.getAttribute('data-conn-cat')===connCat));
      const list=$('#connList');
      const apps=CONNECT_APPS.filter(a=>{
        if(connQ&&!(a.name.toLowerCase().includes(connQ)||(a.desc||'').toLowerCase().includes(connQ))) return false;
        if(connCat==='All') return true;
        if(connCat==='More') return ['Google Workspace','Payments','Productivity','Sales','Social Media','Storage','Custom'].includes(a.cat);
        return a.cat===connCat;
      });
      const byCat={}; apps.forEach(a=>{ (byCat[a.cat]=byCat[a.cat]||[]).push(a); });
      let html='';
      Object.keys(byCat).forEach(cat=>{
        html+='<div class="set-subhead">'+esc(cat)+'</div>'+byCat[cat].map(a=>{
          const req=extra.connectRequested.includes(a.name);
          return '<button class="conn-row" data-conn="'+esc(a.name)+'" type="button"><span class="conn-logo" style="background:'+a.color+'">'+esc(a.name[0])+'</span><span class="conn-tx"><span class="conn-name">'+esc(a.name)+'</span><span class="conn-desc">'+esc(a.desc)+'</span></span><span class="conn-pill'+(req?' requested':'')+'">'+(req?'Requested':'Connect '+esc(a.name))+'</span></button>';
        }).join('');
      });
      list.innerHTML=html||'<div class="src-empty">No apps match.</div>';
      list.querySelectorAll('[data-conn]').forEach(b=>b.addEventListener('click',()=>{
        const name=b.getAttribute('data-conn');
        if(extra.connectRequested.includes(name)){ toast('Already requested — saved on this device'); return; }
        extra.connectRequested.push(name); saveExtra();
        toast(name+' requested — real connections need an app account');
        renderConn();
      }));
    };
    body.querySelector('#connChips').innerHTML=cats.map(c=>'<button class="conn-chip'+(c===connCat?' active':'')+'" data-conn-cat="'+c+'" type="button">'+esc(c)+'</button>').join('');
    body.querySelectorAll('#connChips .conn-chip').forEach(b=>b.addEventListener('click',()=>{
      const cat=b.getAttribute('data-conn-cat');
      if(cat==='More'){
        const r=b.getBoundingClientRect();
        showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, CONNECT_MORE_CATS.map(c=>({label:c, onClick:()=>{ connCat=c; renderConn(); }})));
        return;
      }
      connCat=cat; renderConn();
    }));
    body.querySelector('#connSearch').addEventListener('input',e=>{ connQ=e.target.value.toLowerCase(); renderConn(); });
    body.querySelector('#connCustom').addEventListener('click',async()=>{
      const name=await promptDialog('Add a custom connector','Connector name','');
      if(name===null||!name.trim()) return;
      const url=await promptDialog('Add a custom connector','Connector URL', 'https://');
      if(url===null) return;
      CONNECT_APPS.push({name:name.trim(), desc:url.trim(), cat:'Custom', color:'#6e6e6a'});
      extra.customConnectors.push({name:name.trim(), url:url.trim()});
      saveExtra(); renderConn(); toast('Custom connector saved');
    });
    const openManage=()=>{ settingsPage='manage-apps'; renderSettingsPage(); };
    body.querySelector('#connYourApps').addEventListener('click',openManage);
    body.querySelector('#connManageRow').addEventListener('click',openManage);
    renderConn();
    return;
  }
  if(settingsPage==='manage-apps'){
    title.textContent='Connect Apps › Manage';
    body.innerHTML='<h3 style="font-size:17px;margin:4px 0 10px">Manage apps</h3><div class="set-subhead">Installed</div>'
      +(extra.customConnectors.length?extra.customConnectors.map(c=>'<div class="conn-row"><span class="conn-logo" style="background:#6e6e6a">'+esc(c.name[0]||'?')+'</span><span class="conn-tx"><span class="conn-name">'+esc(c.name)+'</span><span class="conn-desc">'+esc(c.url)+'</span></span></div>').join(''):'<p class="set-note">Nothing installed yet. Find apps in Connect Apps.</p>');
    return;
  }
  if(settingsPage==='skills'){
    title.textContent='Skills';
    const personal=extra.skills||[];
    body.innerHTML='<div class="set-subhead">Personal</div>'
      +'<p class="set-note">Teach JepongDevxyz AI a repeatable task it follows whenever a request matches.</p>'
      +(personal.length?personal.map(s2=>'<div class="skill-row"><span class="skill-ic">'+icon('zap',18)+'</span><span class="skill-name">'+esc(s2.name)+'</span><button type="button" class="skill-on'+(s2.on?' on':'')+'" data-skill-toggle="'+s2.id+'">'+(s2.on?'On':'Off')+'</button><button type="button" class="mini-btn danger" data-skill-del="'+s2.id+'">Delete</button></div>').join(''):'<div class="empty-dash">No personal skills yet</div>')
      +'<button id="newSkillBtn" class="btn-primary" type="button">New Skill</button>'
      +'<div class="set-subhead">Built-in</div>'
      +SKILLS.map(s2=>'<button class="skill-row" data-builtin-skill="'+s2.id+'" type="button"><span class="skill-ic">'+icon(s2.icon,18)+'</span><span class="skill-tx"><span class="skill-name">'+esc(s2.name)+'</span><span class="skill-desc">'+esc(s2.desc)+'</span></span><span class="skill-on on">On</span></button>').join('');
    body.querySelector('#newSkillBtn').addEventListener('click',()=>newPersonalSkill());
    body.querySelectorAll('[data-skill-toggle]').forEach(b=>b.addEventListener('click',()=>{
      const s2=extra.skills.find(x=>x.id===b.getAttribute('data-skill-toggle')); if(!s2) return;
      s2.on=!s2.on; saveExtra(); renderSettingsPage();
    }));
    body.querySelectorAll('[data-skill-del]').forEach(b=>b.addEventListener('click',async()=>{
      const ok=await showConfirm({title:'Delete skill?', text:'This personal skill will be removed.', okLabel:'Delete'});
      if(!ok) return;
      extra.skills=extra.skills.filter(x=>x.id!==b.getAttribute('data-skill-del')); saveExtra(); renderSettingsPage();
    }));
    body.querySelectorAll('[data-builtin-skill]').forEach(b=>b.addEventListener('click',()=>{
      const s2=SKILLS.find(x=>x.id===b.getAttribute('data-builtin-skill')); if(s2) openSkillFileDialog(s2);
    }));
    return;
  }
  if(settingsPage==='automations'){
    title.textContent='Automations';
    renderAutomationsPage(body);
    return;
  }
  if(settingsPage==='automation-detail'){
    title.textContent='Automations › '+(settingsSub&&settingsSub.name?settingsSub.name:'New Automation');
    renderAutomationEditor(body);
    return;
  }
  if(settingsPage==='your-automations'){
    title.textContent='Automations › Your automations';
    const mine=extra.automations||[];
    body.innerHTML='<h3 style="font-size:17px;margin:4px 0 10px">Your automations</h3>'
      +(mine.length?mine.map((a,i)=>'<div class="auto-card"><span class="auto-ic" style="background:#f59e0b">'+icon('sun',18)+'</span><span class="auto-tx"><span class="auto-name">'+esc(a.name)+'</span><span class="auto-desc">'+esc(a.sched||'Daily at 7:30 am')+'</span></span><button type="button" class="mini-btn" data-auto-pause="'+i+'">'+(a.paused?'Resume':'Pause')+'</button><button type="button" class="mini-btn" data-auto-opts="'+i+'" aria-label="Automation options">···</button></div>').join(''):'<p class="set-note">You have no automations yet.</p>');
    body.querySelectorAll('[data-auto-pause]').forEach(b=>b.addEventListener('click',()=>{ const a=mine[parseInt(b.getAttribute('data-auto-pause'),10)]; if(!a) return; a.paused=!a.paused; saveExtra(); renderSettingsPage(); }));
    body.querySelectorAll('[data-auto-opts]').forEach(b=>b.addEventListener('click',()=>{
      const i=parseInt(b.getAttribute('data-auto-opts'),10); const a=mine[i]; if(!a) return;
      const r=b.getBoundingClientRect();
      showMenu(Math.min(r.left-120,window.innerWidth-210), r.bottom+6, [
        {icon:'pencil', label:'Edit', onClick:()=>openAutomationDetail(a.name)},
        {icon:'trash-2', label:'Delete', danger:true, onClick:async()=>{ const ok=await showConfirm({title:'Delete automation?', text:'"'+a.name+'" will be removed.', okLabel:'Delete'}); if(!ok) return; extra.automations.splice(i,1); saveExtra(); renderSettingsPage(); }},
      ]);
    }));
    return;
  }
  if(settingsPage==='data'){
    title.textContent='Data Controls';
    const used=fmtBytes(libraryBytes());
    body.innerHTML='<div class="set-subhead">Personalization</div><div class="set-card">'
      +toggleRow('dataImproveSw','Improve the Model','By allowing your data to be used for training our models, you help enhance your own experience and improve the quality of the model for all users. We take measures to ensure your privacy is protected throughout the process.', settings.advanced.updateMemory!==false)
      +toggleRow('dataXSw','Personalize JepongDevxyz AI Using 𝕏','Allow your 𝕏 data to be used for personalizing and enhancing your JepongDevxyz AI experience. This data includes: 𝕏 user profile, 𝕏 account information and location, 𝕏 settings, 𝕏 preferences, posts viewable on your 𝕏 account.', settings.data.personalizeX!==false)
      +toggleRow('dataHistSw','Personalize With Conversation History','Allow JepongDevxyz AI to remember details from your previous conversations. Private chats are never stored.', settings.personalization.refHistory!==false)
      +'</div><p class="set-note">These settings apply to your JepongDevxyz AI account across all devices.</p>'
      +'<div class="set-subhead">Sharing</div><div class="set-card">'
      +toggleRow('dataShareSw','Allow Chat Link Sharing','Let chats be shared as links.', settings.data.allowShare!==false)
      +'</div>'
      +'<div class="set-subhead">Account Data</div><div class="set-list">'
      +'<button class="set-row" data-data-view="files"><span class="set-ic">'+icon('file',18)+'</span><span class="set-label">File Storage</span><span class="set-value">'+esc(used)+' used of 1.0 GB</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="sharedlinks"><span class="set-ic">'+icon('link',18)+'</span><span class="set-label">Shared Links</span><span class="set-value">View</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="archived"><span class="set-ic">'+icon('archive',18)+'</span><span class="set-label">Archived Conversations</span><span class="set-value">View</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row" data-data-view="deleted"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Deleted Conversations</span><span class="set-value">View</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'<button class="set-row danger" data-data-act="deleteAll"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete All Conversations</span><span class="set-value">Delete All</span></button>'
      +'<button class="set-row danger" data-data-act="deleteImagine"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete All Imagine Data</span><span class="set-value">Delete All</span></button>'
      +'<button class="set-row" data-data-act="export"><span class="set-ic">'+icon('download',18)+'</span><span class="set-label">Export Account Data</span><span class="set-value">Export ↗</span></button>'
      +'<button class="set-row danger" data-data-act="deleteAccount"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Delete Account</span><span class="set-value">Delete ↗</span></button>'
      +'</div>'
      +'<p class="set-note">Deleted conversations are permanently removed after 30 days.</p>'
      +'<div class="set-subhead">Browsing Data</div><div class="set-list">'
      +'<button class="set-row" data-data-act="clearCache"><span class="set-ic">'+icon('trash-2',18)+'</span><span class="set-label">Clear Cache</span><span class="set-value">Clear</span></button>'
      +'</div>'
      +'<div class="set-subhead">Legal</div><div class="set-list">'
      +'<button class="set-row" data-data-view="terms"><span class="set-label">Terms of Service</span><span class="chev">↗</span></button>'
      +'<button class="set-row" data-data-view="privacy"><span class="set-label">Privacy Policy</span><span class="chev">↗</span></button>'
      +'<button class="set-row" data-data-view="acceptable"><span class="set-label">Acceptable Use Policy</span><span class="chev">↗</span></button>'
      +'<button class="set-row" data-data-view="cookiesPage"><span class="set-label">Cookie Policy</span><span class="chev">↗</span></button>'
      +'<button class="set-row" data-data-view="cookies"><span class="set-label">Cookie Settings</span><span class="set-value">Manage cookie settings</span><span class="chev">'+icon('chevron-right',16)+'</span></button>'
      +'</div>';
    body.querySelector('#dataImproveSw').addEventListener('click',e=>{ settings.advanced.updateMemory=settings.advanced.updateMemory===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.advanced.updateMemory!==false); });
    body.querySelector('#dataXSw').addEventListener('click',e=>{ settings.data.personalizeX=settings.data.personalizeX===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.data.personalizeX!==false); });
    body.querySelector('#dataHistSw').addEventListener('click',e=>{ settings.personalization.refHistory=settings.personalization.refHistory===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.personalization.refHistory!==false); });
    body.querySelector('#dataShareSw').addEventListener('click',e=>{ settings.data.allowShare=settings.data.allowShare===false?true:false; saveSettings(); e.currentTarget.classList.toggle('on', settings.data.allowShare!==false); });
    body.querySelectorAll('[data-data-view]').forEach(b=>b.addEventListener('click',()=>{
      const k=b.getAttribute('data-data-view');
      const crumbs={files:'Data Controls › Files and Assets', sharedlinks:'Data Controls › Shared Links', deleted:'Data Controls › Deleted Conversations', archived:'Data Controls › Archived Conversations', terms:'Data Controls › Terms of Service', privacy:'Data Controls › Privacy Policy', acceptable:'Data Controls › Acceptable Use Policy', cookiesPage:'Data Controls › Cookie Policy', cookies:'Data Controls › Cookie Settings'};
      $('#settingsPage').hidden=true; openInfoPage(k, crumbs[k]);
    }));
    body.querySelectorAll('[data-data-act]').forEach(b=>b.addEventListener('click',async()=>{
      const act=b.getAttribute('data-data-act');
      if(act==='export'){
        const payload={exportedAt:new Date().toISOString(), app:'JepongDevxyz AI', sessions, projects, library:library.map(f=>({id:f.id,name:f.name,kind:f.kind,size:f.size,createdAt:f.createdAt}))};
        downloadBlob(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), 'jepongdevxyz-ai-export.json');
        toast('Account data exported'); return;
      }
      if(act==='clearCache'){
        LS.del(K.drafts); LS.del(K.pending);
        drafts={}; pending=[];
        toast('Cache cleared'); return;
      }
      if(act==='deleteImagine'){
        const ok=await showConfirm({title:'Delete all Imagine data?', text:'All generated images will be removed from your chats.', okLabel:'Delete'});
        if(!ok) return;
        sessions.forEach(s=>s.messages.forEach(m=>{ if(m.image) delete m.image; }));
        saveSessions(); renderAll(); toast('Imagine data deleted'); return;
      }
      if(act==='deleteAll'){
        const ok=await showConfirm({title:'Delete all conversations?', text:'All chats will be moved to Deleted Conversations, where you can restore them.', okLabel:'Delete'});
        if(!ok) return;
        for(const s of sessions.slice()){ await trashChat(s); }
        sessions=[]; currentId=null; saveSessions(); renderAll(); toast('All chats deleted'); return;
      }
      if(act==='deleteAccount'){
        const ok=await showConfirm({title:'Delete account?', text:'Chats, settings, projects, library and usage data will be deleted from this browser.', okLabel:'Delete'});
        if(!ok) return;
        [K.sessions,K.settings,K.projects,K.extra,K.drafts,K.pending,K.library].forEach(k=>LS.del(k));
        location.reload(); return;
      }
    }));
    return;
  }
  title.textContent='Settings'; settingsPage='list'; renderSettingsPage();
}

/* ---------- Automations pages ---------- */
let autoCat='All', autoQ='';
function renderAutomationsPage(body){
  body.innerHTML='<div class="set-search"><span>'+icon('search',16)+'</span><input id="autoSearch" type="text" placeholder="Search automations" autocomplete="off"></div>'
    +'<div class="auto-chips-wrap"><div class="conn-chips" id="autoChips"></div><button class="auto-scroll-chev" id="autoScrollChev" type="button" aria-label="Scroll right">'+icon('chevron-right',16)+'</button></div>'
    +'<div id="autoList"></div>';
  const renderAuto=()=>{
    $$('#autoChips .conn-chip').forEach(c=>c.classList.toggle('active', c.getAttribute('data-auto-cat')===autoCat));
    const list=$('#autoList');
    let html='';
    const mine=extra.automations||[];
    if(autoCat==='All'){
      html+='<div class="set-subhead">Your automations</div>';
      if(mine.length){
        html+=mine.map((a,i)=>'<div class="auto-card"><span class="auto-ic" style="background:#f59e0b">'+icon('sun',18)+'</span><span class="auto-tx"><span class="auto-name">'+esc(a.name)+'</span><span class="auto-desc">'+esc(a.sched||'Daily at 7:30 am')+'</span></span><button type="button" class="mini-btn" data-auto-open="'+i+'">Open</button></div>').join('');
      } else {
        html+='<p class="set-note">No automations yet. Add one below.</p>';
      }
      html+='<button class="btn-ghost" id="autoManageBtn" type="button">Manage</button>';
    }
    html+='<div class="auto-card featured"><span class="auto-ic" style="background:var(--chip);color:var(--ink)">'+icon('plus',18)+'</span><span class="auto-tx"><span class="auto-name">Create your own automation from scratch</span><span class="auto-desc">Build a custom automation</span></span><button type="button" class="mini-btn" data-auto-custom="1">Add</button></div>';
    const groups={};
    AUTOMATIONS.forEach(a=>{ if(autoQ&&!a.name.toLowerCase().includes(autoQ)&&!a.desc.toLowerCase().includes(autoQ)) return; if(autoCat==='All'||a.cat===autoCat) (groups[a.cat]=groups[a.cat]||[]).push(a); });
    Object.keys(groups).forEach(cat=>{
      html+='<div class="set-subhead">'+esc(cat)+'</div>'+groups[cat].map(a=>{
        const saved=mine.some(x=>x.name===a.name);
        return '<div class="auto-card"><span class="auto-ic" style="background:#6e6e6a">'+icon(a.icon||'clock',18)+'</span><span class="auto-tx"><span class="auto-name">'+esc(a.name)+'</span><span class="auto-desc">'+esc(a.desc)+'</span></span><button type="button" class="mini-btn" data-auto-add="'+esc(a.name)+'" '+(saved?'disabled':'')+'>'+(saved?'Added':'Add')+'</button></div>';
      }).join('');
    });
    list.innerHTML=html||'<div class="src-empty">No automations in this category.</div>';
    const mg=list.querySelector('#autoManageBtn');
    if(mg) mg.addEventListener('click',()=>{ settingsPage='your-automations'; renderSettingsPage(); });
    list.querySelectorAll('[data-auto-open]').forEach(b=>b.addEventListener('click',()=>{ const a=mine[parseInt(b.getAttribute('data-auto-open'),10)]; if(a) openAutomationDetail(a.name); }));
    list.querySelectorAll('[data-auto-add]').forEach(b=>b.addEventListener('click',()=>{
      const name=b.getAttribute('data-auto-add');
      const tpl=AUTOMATIONS.find(x=>x.name===name); if(!tpl) return;
      if(!extra.automations.some(x=>x.name===name)){
        /* §14 grok semantics: "Add" CREATES the automation immediately
           (default Daily 7:30 am) and opens its detail — Cancel on the
           detail only navigates back and does NOT delete it. */
        extra.automations.push({name:tpl.name, cat:tpl.cat, sched:tpl.sched||'Daily at 7:30 am', instructions:tpl.instructions||'', at:Date.now()});
        saveExtra();
        toast('Automation created — '+name);
      }
      openAutomationDetail(name);
    }));
    list.querySelectorAll('[data-auto-custom]').forEach(b=>b.addEventListener('click',()=>newAutomation()));
  };
  body.querySelector('#autoChips').innerHTML=AUTO_CATS.map(c=>'<button class="conn-chip'+(c===autoCat?' active':'')+'" data-auto-cat="'+c+'" type="button">'+esc(c)+'</button>').join('');
  body.querySelectorAll('#autoChips .conn-chip').forEach(b=>b.addEventListener('click',()=>{ autoCat=b.getAttribute('data-auto-cat'); renderAuto(); }));
  body.querySelector('#autoScrollChev').addEventListener('click',()=>{ const chips=body.querySelector('#autoChips'); if(chips) chips.scrollBy({left:120, behavior:'smooth'}); });
  body.querySelector('#autoSearch').addEventListener('input',e=>{ autoQ=e.target.value.toLowerCase(); renderAuto(); });
  renderAuto();
}
function newAutomation(){
  /* §14 grok semantics: the Custom card's "Add" also CREATES immediately
     ("My Automation", default Daily 7:30 am) and opens the editor — Cancel
     only navigates back, it does not delete. Save updates the created one. */
  if(!extra.automations.some(x=>x.name==='My Automation')){
    extra.automations.push({name:'My Automation', cat:'News', sched:'Daily at 7:30 am', instructions:'', at:Date.now()});
    saveExtra();
  }
  toast('Automation created — My Automation');
  settingsSub={name:'My Automation', sched:'Daily at 7:30 am', instructions:'', isNew:true};
  settingsPage='automation-detail'; renderSettingsPage();
}
function openAutomationDetail(name){
  const saved=(extra.automations||[]).find(x=>x.name===name);
  const tpl=AUTOMATIONS.find(x=>x.name===name);
  settingsSub={name:name, sched:(saved&&saved.sched)||(tpl&&tpl.sched)||'Daily at 7:30 am', instructions:(saved&&saved.instructions)||(tpl&&tpl.instructions)||'', isNew:!saved, tpl:tpl||null};
  settingsPage='automation-detail'; renderSettingsPage();
}
function renderAutomationEditor(body){
  const a=settingsSub||{name:'My Automation', sched:'Daily at 7:30 am', instructions:'', isNew:true};
  body.innerHTML='<div class="auto-crumb">Automations › '+(a.isNew?'New Automation':esc(a.name))+'</div>'
    +'<div class="auto-icon-row"><button class="proj-icon" id="autoIconBtn" type="button" aria-label="Change icon">'+icon('sun',26)+'</button><span class="proj-icon-label">Change icon</span></div>'
    +'<label class="field-label" for="autoName">Automation name</label><input id="autoName" class="field" value="'+esc(a.name)+'" maxlength="60">'
    +'<div class="set-subhead">Triggers</div><div class="set-card"><button class="set-row" id="autoAddTrigger" type="button"><span class="set-ic">'+icon('plus',18)+'</span><span class="set-label">Add Trigger</span></button></div>'
    +'<label class="field-label" for="autoInstr">Instructions</label><textarea id="autoInstr" class="field" rows="3" placeholder="Read my unread emails and summarize…">'+esc(a.instructions||'')+'</textarea>'
    +'<button class="set-row" id="autoAttach" type="button"><span class="set-ic">'+icon('plus',18)+'</span><span class="set-label">Attach</span></button>'
    +'<div class="set-list"><button class="set-row" id="autoConnRow" type="button"><span class="set-label">Connectors</span><span class="set-value">0</span></button>'
    +'<button class="set-row" id="autoSkillsRow" type="button"><span class="set-label">Skills</span><span class="set-value">0</span></button>'
    +'<button class="set-row" id="autoModeRow" type="button"><span class="set-label">Mode</span><span class="set-value">Fast</span><span class="chev">'+icon('chevron-down',16)+'</span></button>'
    +'<button class="set-row" id="autoNotifRow" type="button"><span class="set-label">Notification</span><span class="set-value">Email + App</span><span class="chev">'+icon('chevron-down',16)+'</span></button></div>'
    +'<div class="auto-actions"><button id="autoCancel" class="btn-ghost" type="button">Cancel</button><button id="autoSave" class="btn-primary" type="button">Save</button></div>'
    +'<button id="autoPromoBar" class="settings-banner" type="button" style="margin:12px 0 0"><span><span class="ub-title">Get 50% off Premium</span><span class="ub-sub">Free on this device</span></span><span class="ub-pill">Upgrade</span></button>';
  body.querySelector('#autoAddTrigger').addEventListener('click',()=>{ toast('Trigger added — Daily at 7:30 am'); });
  body.querySelector('#autoAttach').addEventListener('click',()=>pickFile('files'));
  body.querySelector('#autoConnRow').addEventListener('click',()=>openSettings('connectors'));
  body.querySelector('#autoSkillsRow').addEventListener('click',()=>openSettings('skills'));
  body.querySelector('#autoModeRow').addEventListener('click',e=>{
    const r=e.currentTarget.getBoundingClientRect();
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['Fast','Balanced','Thorough'].map(m=>({label:m, onClick:()=>{ const v=body.querySelector('#autoModeRow .set-value'); if(v) v.textContent=m; }})));
  });
  body.querySelector('#autoNotifRow').addEventListener('click',e=>{
    const r=e.currentTarget.getBoundingClientRect();
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, ['Email + App','App only','Email only'].map(m=>({label:m, onClick:()=>{ const v=body.querySelector('#autoNotifRow .set-value'); if(v) v.textContent=m; }})));
  });
  body.querySelector('#autoPromoBar').addEventListener('click',()=>openUpgradeSheet());
  body.querySelector('#autoCancel').addEventListener('click',()=>{ settingsPage='automations'; settingsSub=null; renderSettingsPage(); });
  body.querySelector('#autoSave').addEventListener('click',()=>{
    const name=body.querySelector('#autoName').value.trim()||'My Automation';
    const instr=body.querySelector('#autoInstr').value.trim();
    const ex=(extra.automations||[]).find(x=>x.name===a.name);
    if(ex){ ex.name=name; ex.instructions=instr; }
    else extra.automations.push({name:name, cat:(a.tpl&&a.tpl.cat)||'News', sched:a.sched||'Daily at 7:30 am', instructions:instr, at:Date.now()});
    saveExtra();
    toast('Automation saved on this device — automations do not run yet (no server to run them)');
    settingsPage='automations'; settingsSub=null; renderSettingsPage();
  });
}

/* ---------- Voice picker dialog (Behavior → Voice) ---------- */
function openVoicePickerDialog(){
  let sh=document.getElementById('voicePickerSheet');
  if(!sh){
    sh=document.createElement('div'); sh.id='voicePickerSheet'; sh.className='sheet'; sh.hidden=true;
    sh.innerHTML='<div class="sheet-card"><div class="sheet-grip" aria-hidden="true"></div><div class="sheet-head"><div class="sheet-title">Voice</div><button class="icon-btn" data-close-sheet aria-label="Close">'+icon('x',18)+'</button></div><div class="voice-search"><span>'+icon('search',16)+'</span><input id="voicePickerSearch" type="text" placeholder="Search voices" autocomplete="off" aria-label="Search voices"></div><div id="voicePickerList" class="set-list"></div></div>';
    document.body.appendChild(sh);
    sh.querySelector('[data-close-sheet]').addEventListener('click',()=>{ sh.hidden=true; });
    sh.querySelector('#voicePickerSearch').addEventListener('input',()=>renderVoicePickerList());
  }
  renderVoicePickerList();
  sh.hidden=false;
  if(!openSheets.includes('voicePickerSheet')) openSheets.push('voicePickerSheet');
}
function renderVoicePickerList(){
  const sh=document.getElementById('voicePickerSheet'); if(!sh) return;
  const q=(sh.querySelector('#voicePickerSearch').value||'').toLowerCase();
  const list=sh.querySelector('#voicePickerList');
  const cur=settings.voice.grokVoice||'Ara';
  const row=v=>'<button class="voice-row" data-voice-pick="'+esc(v.name)+'" type="button"><span class="v-meta"><span class="v-name">'+esc(v.name)+(v.badge?' <span class="badge-18">'+esc(v.badge)+'</span>':'')+(v.name===cur?' <span class="menu-ic">'+icon('check',15)+'</span>':'')+'</span><span class="v-desc">'+esc(v.desc)+'</span></span></button>';
  const first=GROK_VOICES.slice(0,6), rest=GROK_VOICES.slice(6);
  const f=arr=>arr.filter(v=>!q||v.name.toLowerCase().includes(q)||v.desc.toLowerCase().includes(q));
  const ff=f(first), fr=f(rest);
  list.innerHTML=(ff.length?ff.map(row).join(''):'')+(fr.length?'<div class="set-subhead">More voices</div>'+fr.map(row).join(''):'')||'<div class="pal-empty">No voices match.</div>';
  list.querySelectorAll('[data-voice-pick]').forEach(b=>b.addEventListener('click',()=>{
    settings.voice.grokVoice=b.getAttribute('data-voice-pick'); saveSettings();
    sh.hidden=true; openSheets=openSheets.filter(x=>x!=='voicePickerSheet');
    renderSettingsPage(); toast('Voice updated');
  }));
}

/* ---------- Voice engine ---------- */
const VM_SPEEDS=[{l:'0.5×',v:0.5},{l:'0.75×',v:0.75},{l:'0.9×',v:0.9},{l:'Normal',v:1},{l:'1.1×',v:1.1},{l:'1.25×',v:1.25},{l:'1.5×',v:1.5},{l:'2×',v:2}];
const VM_PERSONALITIES=['Custom…','Assistant','Storyteller','Kids Story Time','Kids Trivia Game','Meditation','Conspiracy'];
let vmState='idle', vmAudioCtx=null, vmAnalyser=null, vmRAF=null, vmListening=false, vmRecog=null, vmLastHeard='', vmMicStream=null;
function vmSpeedLabel(){ const r=(settings.voice.rate||1); const hit=VM_SPEEDS.find(s=>s.v===r); return hit?hit.l:'Normal'; }
function vmPersonalityLabel(){ return settings.voice.personality||'Assistant'; }
function vmPersonalityStyle(){ const p=vmPersonalityLabel(); if(p==='Assistant') return 'Default'; if(p==='Custom…') return 'Custom'; return p; }
function vmVoiceTitle(){ return 'Device default · '+(vmPersonalityLabel()==='Custom…'?'Custom':vmPersonalityLabel()); }
function cleanVoice(v){
  /* Split "English (United States)" into title + sub — the parenthetical is
     the sub-line (grok shows it), not the language name. */
  let raw=String(v.name||'').trim();
  const script=/#(Cyrl|Latn)/.exec(raw);
  raw=raw.replace(/\s*#(Cyrl|Latn)\s*/g,'').trim();
  let title=raw, sub='';
  const m=raw.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if(m){ title=m[1].trim(); sub=m[2].trim(); }
  if(!sub) sub=langNameOf(v.lang||'');
  if(script) sub+=' · '+(script[1]==='Cyrl'?'Cyrillic':'Latin');
  if(v.default) sub+=' · Default';
  return {label:title, lang:(v.lang||''), voice:v, langName:sub};
}
function langNameOf(code){
  if(!code) return 'Unknown';
  try{ return new Intl.DisplayNames(['en'],{type:'language'}).of(code.split('-')[0])||code; }catch(e){ return code; }
}
function voiceCatalog(){
  const vs=window.speechSynthesis?window.speechSynthesis.getVoices():[];
  const seen=new Map();
  vs.forEach(v=>{ const c=cleanVoice(v); if(!c.label) return; if(!seen.has(c.label)) seen.set(c.label,c); });
  return [...seen.values()].sort((a,b)=>a.langName.localeCompare(b.langName)||a.label.localeCompare(b.label));
}
function resolveVoiceEntry(){
  const saved=(settings.voice.voiceURI||'');
  if(saved){ const hit=voiceCatalog().find(c=>c.voice&&c.voice.voiceURI===saved); if(hit) return hit; }
  if(settings.voice.voiceName){ const hit=voiceCatalog().find(c=>c.voice&&c.voice.name===settings.voice.voiceName); if(hit) return hit; }
  const cat=voiceCatalog();
  const want=(settings.responseLang.code||'en');
  const hit=cat.find(c=>(c.voice.lang||'').toLowerCase().startsWith(want.toLowerCase()))||cat[0];
  return hit||null;
}
function speak(text, opts){
  const o=opts||{};
  if(!window.speechSynthesis||!text) return false;
  try{
    window.speechSynthesis.cancel();
    const utt=new SpeechSynthesisUtterance(text.slice(0,1200));
    const entry=resolveVoiceEntry();
    if(entry){ try{ utt.voice=entry.voice; }catch(e){ /* mock/plain-object voices are not real SpeechSynthesisVoice instances — Chrome throws on assignment; the utterance still speaks with the default voice */ } try{ utt.lang=entry.voice.lang||'en'; }catch(e){} }
    utt.rate=typeof o.rate==='number'?o.rate:(settings.voice.rate||1);
    utt.pitch=typeof o.pitch==='number'?o.pitch:(settings.voice.pitch||1);
    if(o.onEnd) utt.onend=o.onEnd;
    window.speechSynthesis.speak(utt);
    return true;
  }catch(e){ return false; }
}
function speakAsync(text, opts){
  return new Promise(res=>{
    if(!window.speechSynthesis){ res(false); return; }
    const done=()=>res(true);
    let settled=false;
    const t=setTimeout(()=>{ if(!settled){ settled=true; res(true); } }, 90000);
    speak(text,{...opts, onEnd:()=>{ clearTimeout(t); if(!settled){ settled=true; done(); } }});
  });
}
function stopSpeak(){ try{ window.speechSynthesis&&window.speechSynthesis.cancel(); }catch(e){} }
function refineDictation(text){
  const mode=settings.voice.dictation||'Tidy up';
  if(mode==='No refinement') return text;
  const t=text.trim();
  if(mode==='Tidy up') return t.replace(/\b(um|uh|like|you know|basically)\b/gi,'').replace(/\s{2,}/g,' ').replace(/^[a-z]/,c=>c.toUpperCase()).replace(/([^.!?])$/,'$1.');
  return t.replace(/\s{2,}/g,' ').replace(/^[a-z]/,c=>c.toUpperCase()).replace(/([^.!?])$/,'$1.');
}
function SR(){
  return window.SpeechRecognition||window.webkitSpeechRecognition||null;
}
function toggleVoice(){
  if(SR()){
    const inp=$('#composerInput'); if(!inp) return;
    const Recog=SR();
    try{
      const rec=new Recog();
      rec.lang=(settings.responseLang&&settings.responseLang.code)||'en';
      rec.interimResults=false; rec.continuous=false;
      rec.onresult=ev=>{
        const txt=ev.results[0][0].transcript;
        inp.value=(inp.value?inp.value+' ':'')+refineDictation(txt);
        syncComposer(); inp.focus();
        toast('Dictation added');
      };
      rec.onerror=ev=>{ if(ev.error==='not-allowed') warnToast('Microphone access denied. Check your browser settings.'); else toast('Could not hear you — try again'); };
      rec.start(); toast('Listening… speak now');
    }catch(e){ toast('Voice input is not available right now'); }
  } else {
    warnToast('Voice input is not supported in this browser');
  }
}
function vmSetState(st, msg){
  vmState=st;
  const stEl=$('#vmState')||$('#vmStatus'); if(stEl) stEl.textContent=msg||'';
  const stopBtn=$('#vmStop');
  if(stopBtn) stopBtn.style.display=(st==='speaking')?'':'none';
  const layer=$('#voiceMode'); if(layer) layer.setAttribute('data-state', st);
}
function vmTickDots(active){
  const dots=$('#vmDots'); if(!dots) return;
  const bars=dots.querySelectorAll('.vm-dot');
  const t=Date.now()/120;
  bars.forEach((b,i)=>{ b.style.transform='scaleY('+Math.max(0.25, Math.min(1, (active?0.55:0.25)+0.35*Math.sin(t+i*0.9)))+')'; });
  if(vmState==='listening'||vmState==='speaking') vmRAF=requestAnimationFrame(()=>vmTickDots(active));
}
function vmAcquireMic(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia) return Promise.resolve(false);
  return navigator.mediaDevices.getUserMedia({audio:true}).then(stream=>{
    vmMicStream=stream;
    try{
      vmAudioCtx=vmAudioCtx||new (window.AudioContext||window.webkitAudioContext)();
      const src=vmAudioCtx.createMediaStreamSource(stream);
      vmAnalyser=vmAudioCtx.createAnalyser(); vmAnalyser.fftSize=256; src.connect(vmAnalyser);
    }catch(e){}
    return true;
  });
}
function vmStartRecog(){
  const Recog=SR(); if(!Recog){ return; }
  try{
    const rec=new Recog();
    rec.lang=(settings.responseLang&&settings.responseLang.code)||'en';
    rec.interimResults=true; rec.continuous=true;
    rec.onresult=ev=>{
      let finalTxt='';
      for(let i=ev.resultIndex;i<ev.results.length;i++){ if(ev.results[i].isFinal) finalTxt+=ev.results[i][0].transcript+' '; }
      if(finalTxt.trim()){
        vmLastHeard=finalTxt.trim();
        vmSetState('heard', 'Heard: '+vmLastHeard);
        vmHandleHeard();
      } else {
        let interim='';
        for(let i=ev.resultIndex;i<ev.results.length;i++){ interim+=ev.results[i][0].transcript+' '; }
        if(interim.trim()) vmSetState('listening', 'Hearing: '+interim.trim());
      }
    };
    rec.onerror=ev=>{ if(ev.error==='not-allowed'){ warnToast('Microphone access denied. Check your browser settings.'); closeVoiceMode(); } };
    rec.onend=()=>{ if(vmState==='listening'||vmState==='heard'){ try{ rec.start(); }catch(e){} } };
    vmRecog=rec; rec.start();
  }catch(e){}
}
async function vmHandleHeard(){
  if(!vmLastHeard) return;
  const text=vmLastHeard; vmLastHeard='';
  vmSetState('answering', 'Answering…');
  try{
    if(vmRecog){ vmRecog.stop(); vmRecog=null; }
  }catch(e){}
  const composer=$('#composerInput');
  if(composer){ composer.value=text; syncComposer(); }
  voiceStyleOverride=vmPersonalityStyle();
  await doSend();
  const s=getSession(currentId);
  const last=s&&s.messages.filter(m=>m.role==='assistant').pop();
  if(last){
    vmSetState('speaking', 'Speaking');
    vmTickDots(true);
    await speakAsync(last.text||'');
  }
  vmSetState('listening', 'Listening');
  vmTickDots(true);
  vmStartRecog();
}
function vmUpdateSel(){
  /* Update ONLY the label span — setting textContent on the whole button
     destroys the #vmVoiceLabel span (and the chevron) inside it. */
  const l=$('#vmVoiceLabel'); if(l) l.textContent=vmVoiceTitle();
}
async function openVoiceMode(){
  if(!SR()){ toast('Voice input is not supported in this browser'); return; }
  const layer=$('#voiceMode'); if(!layer) return;
  layer.hidden=false;
  vmSetState('listening', 'Listening');
  vmUpdateSel();
  try{ await vmAcquireMic(); }
  catch(e){
    if(e&&e.name==='NotAllowedError'){ warnToast('Microphone access denied. Check your browser settings.'); closeVoiceMode(); return; }
    vmMicStream=null; vmAnalyser=null;
  }
  vmTickDots(true);
  vmStartRecog();
}
function closeVoiceMode(){
  const layer=$('#voiceMode'); if(layer) layer.hidden=true;
  try{ if(vmRecog){ vmRecog.abort(); } }catch(e){}
  vmRecog=null; vmListening=false;
  if(vmRAF) cancelAnimationFrame(vmRAF);
  if(vmMicStream){ try{ vmMicStream.getTracks().forEach(t=>t.stop()); }catch(e){} vmMicStream=null; }
  stopSpeak();
  vmSetState('idle','');
}
function openVoiceSheet(){
  const sh=$('#voiceSheet'); if(!sh) return;
  const list=$('#voiceSheetList');
  const cat=voiceCatalog();
  const cur=resolveVoiceEntry();
  list.innerHTML=cat.length?cat.map(c=>{
    const sel=cur&&c.label===cur.label;
    return '<button class="radio-row" data-voice-device="'+esc(c.voice&&c.voice.voiceURI?c.voice.voiceURI:c.label)+'" type="button"><span class="radio'+(sel?' on':'')+'"></span><span class="radio-tx"><span class="radio-title">'+esc(c.label)+'</span><span class="radio-sub">'+esc(c.langName)+'</span></span></button>';
  }).join(''):'<div class="src-empty">No voices available on this device.</div>';
  list.querySelectorAll('[data-voice-device]').forEach(b=>b.addEventListener('click',()=>{
    const uri=b.getAttribute('data-voice-device');
    const entry=voiceCatalog().find(c=>(c.voice&&c.voice.voiceURI===uri)||c.label===uri);
    if(entry){
      settings.voice.voiceURI=entry.voice?entry.voice.voiceURI:''; settings.voice.voiceName=entry.label; saveSettings();
      speak('Hello, this is '+entry.label);
      toast('Voice selected'); openVoiceSheet(); vmUpdateSel();
    }
  }));
  const setPill=(id, val, menuFn)=>{ const el=$(id); if(!el) return; el.innerHTML=esc(val)+' '+icon('chevron-down',14); el.onclick=e=>{ e.stopPropagation(); menuFn(); }; };
  setPill('#vsPersonality', vmPersonalityLabel(), ()=>vmPersonalityMenu());
  setPill('#vsSpeed', vmSpeedLabel(), ()=>vmSpeedMenu());
  setPill('#vsMic', vmMicLabel(), ()=>vmMicMenu());
  const rowWire=(rowId, fn)=>{ const r=$(rowId); if(r) r.addEventListener('click',fn); };
  rowWire('#vsPersonalityRow', ()=>vmPersonalityMenu());
  rowWire('#vsSpeedRow', ()=>vmSpeedMenu());
  rowWire('#vsMicRow', ()=>vmMicMenu());
  openSheet('voiceSheet');
}
function vmMicLabel(){ return settings.voice.micLabel||'Microphone'; }
function vmListMics(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices) return Promise.resolve([]);
  return navigator.mediaDevices.enumerateDevices().then(ds=>ds.filter(d=>d.kind==='audioinput')).catch(()=>[]);
}
function vmPersonalityMenu(){
  const pill=$('#vsPersonality'); if(!pill) return;
  const r=pill.getBoundingClientRect();
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, VM_PERSONALITIES.map(p=>({label:p+(vmPersonalityLabel()===p?' ✓':''), onClick:()=>{
    settings.voice.personality=p; saveSettings(); openVoiceSheet(); vmUpdateSel();
  }})));
}
function vmSpeedMenu(){
  const pill=$('#vsSpeed'); if(!pill) return;
  const r=pill.getBoundingClientRect();
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-200)), r.bottom+4, VM_SPEEDS.map(sp=>({label:sp.l+((settings.voice.rate||1)===sp.v?' ✓':''), onClick:()=>{
    settings.voice.rate=sp.v; saveSettings(); openVoiceSheet();
  }})));
}
function vmMicMenu(){
  const pill=$('#vsMic'); if(!pill) return;
  const r=pill.getBoundingClientRect();
  vmListMics().then(ds=>{
    const items=ds.map(d=>({label:(d.label||'Microphone')+(settings.voice.micDeviceId===(d.deviceId||'')?' ✓':''), onClick:()=>{ settings.voice.micDeviceId=d.deviceId||''; settings.voice.micLabel=d.label||'Microphone'; settings.voice.lang=(d.label||'').toLowerCase().includes('filipino')?'fil':'en'; saveSettings(); openVoiceSheet(); }}));
    if(!items.length) items.push({label:'Microphone', onClick:()=>{}});
    showMenu(Math.max(8,Math.min(r.left,window.innerWidth-220)), r.bottom+4, items);
  });
}

/* ---------- Navigation ---------- */
function newChat(){
  currentId=null; privateMode=false; setActiveSession(null);
  clearFreshFollowups();
  try{ extra.lastSessionId=null; saveExtra(); }catch(e){}
  closeSidebar(); renderAll();
}
function openSession(id){
  const s=getSession(id); if(!s) return;
  /* Save the outgoing draft under the OLD session first, then load the
     target draft BEFORE any render: renderAll() ends with syncComposer()
     → saveDraft(), so restoring after renderAll() would save the stale
     composer text under the NEW id and destroy the target's real draft. */
  syncComposer();
  currentId=id; privateMode=false; setActiveSession(id);
  clearFreshFollowups();
  restoreDraft();
  closeSidebar(); renderAll();
  const s2=getSession(id); if(s2) renderMessages(s2);
  const cv=$('#chatView'); if(cv) cv.scrollTop=cv.scrollHeight;
  /* Drafts are stored as {text, attachments} records — assign the record
     itself and the composer shows "[object Object]". restoreDraft() reads
     the record properly (and clears the composer when there is none). */
  restoreDraft(); syncComposer();
}
function openRightPane(){ openPane(); }
function closeRightPane(){ closePane(); }
function renderAll(){
  renderSidebar(); renderModelBtn(); renderHome(); renderMessages(getSession(currentId));
  const inp=$('#composerInput'); if(inp&&!inp.value) restoreDraft();
  syncComposer();
  updateTopbar();
  const cv=$('#chatView'), hv=$('#homeView'), tw=$('#topbarWrap');
  if(cv) cv.hidden=!currentId;
  if(hv) hv.hidden=!!currentId;
  if(tw) tw.classList.toggle('at-home', !currentId);
  const sb=$('#sidebar'); if(sb) sb.classList.toggle('open', sidebarOpen);
  const scr=$('#scrim'); if(scr) scr.hidden=!sidebarOpen;
  if(settings&&settings.interface){
    document.documentElement.classList.toggle('wrap-code', !!settings.interface.wrapCode);
    document.documentElement.classList.toggle('reduce-motion', !!settings.interface.reduceMotion);
  }
}
function recoverPending(){
  if(!pending.length) return;
  const items=pending.slice(); pending=[]; savePending();
  items.forEach(it=>{
    const s=getSession(it.sessionId); if(!s) return;
    const userMsg=s.messages.find(m=>m.id===it.userMsgId); if(!userMsg) return;
    const idx=s.messages.indexOf(userMsg);
    s.messages=s.messages.filter((m,i)=>!(i>idx&&m.role==='assistant'&&!cleanAssistantText(m.text||'')));
    saveSessions();
    enqueueSend(()=>runChatStream(s,userMsg,it.atts||[],null));
  });
}
function checkProductUpdates(){ return; }

/* ---------- missing helpers (referenced by wire/menus) ---------- */
function toggleBotCard(){ const c=$('#botCard'); if(c) c.classList.toggle('closed'); }
function stopStreaming(){ if(abortCtrl){ try{ abortCtrl.abort(); }catch(e){} } }
function loadVoices(){ if(window.speechSynthesis){ try{ window.speechSynthesis.getVoices(); }catch(e){} } }
function addAttachments(files){
  (files||[]).forEach(f=>{
    if(f.size>1.1*1024*1024){ warnToast('"'+f.name+'" is over the 1.1 MB limit and was skipped.'); return; }
    const rd=new FileReader();
    rd.onload=()=>{ const raw=String(rd.result||'').split(',')[1]||''; attachments.push({name:f.name, mimeType:f.type||'application/octet-stream', size:f.size, data:raw}); renderAttachBar(); syncComposer(); };
    rd.readAsDataURL(f);
  });
}
const getProject=id=>projects.find(p=>p.id===id);
function openSettingsPage(key){ openSettings(key); }
function togglePin(id){ const s=getSession(id); if(!s) return; s.pinned=!s.pinned; s.updatedAt=Date.now(); saveSessions(); renderSidebar(); }
function archiveChat(id){ const s=getSession(id); if(!s) return; s.archived=true; s.updatedAt=Date.now(); saveSessions(); if(currentId===id){ currentId=null; } renderAll(); toast('Chat archived'); }
function shareChat(id){
  const s=getSession(id); if(!s) return;
  extra.sharedLinks.unshift({id:uid(), title:s.title||'New chat', createdAt:Date.now(), sessionId:s.id});
  saveExtra();
  copyText(location.origin+location.pathname).then(()=>toast('Link copied'));
}
function moveChatToProject(chatId, projectId){
  const s=getSession(chatId); const p=getProject(projectId); if(!s||!p) return;
  s.projectId=projectId; s.updatedAt=Date.now(); saveSessions(); renderAll(); toast('Added to '+(p.name||'project'));
}
function startTopRename(s){ startInlineRename(); }

/* ---------- Init & wiring ---------- */
function wire(){
  const on=(id, ev, fn)=>{ const el=$(id); if(el) el.addEventListener(ev, fn); };
  on('#menuBtn','click',openSidebar);
  on('#sbClose','click',closeSidebar);
  on('#scrim','click',closeSidebar);
  on('#sbSearchIcon','click',openPalette);
  on('#topSearchBtn','click',openPalette);
  on('#paneSearchBtn','click',openPalette);
  on('#paneSearchPill','click',openPalette);
  on('#newChatBtn','click',newChat);
  on('#sbNewPlus','click',newChat);
  on('#sbChatsMore','click',()=>openMenuAt('#sbChatsMore', [
    {icon:'plus', label:'New chat', onClick:()=>newChat()},
    {icon:'chevron-down', label:sidebarChatsExpanded?'Collapse chats':'Expand chats', onClick:()=>{ sidebarChatsExpanded=!sidebarChatsExpanded; renderSidebar(); }},
  ]));
  on('#sbProjMore','click',()=>openMenuAt('#sbProjMore', [
    {icon:'plus', label:'New project', onClick:()=>openProjectDialog()},
  ]));
  on('#sbNewProj','click',openProjectDialog);
  on('#sbChatsChev','click',()=>toggleSidebarSection('chats'));
  on('#sbProjChev','click',()=>toggleSidebarSection('projects'));
  on('#sbRecentsChev','click',()=>toggleSidebarSection('recents'));
  on('#sbLibraryRow','click',()=>openLibrary('all'));
  on('#sbBlackFriday','click',openPromoSheet);
  on('#profileBtn','click',e=>openAccountMenu(e.currentTarget));
  on('#sbConnectApps','click',()=>openSettings('connectors'));
  on('#botCardHead','click',toggleBotCard);
  $$('#upgTabs .tab').forEach(t=>t.addEventListener('click',()=>{ upgTab=t.getAttribute('data-upg-tab'); renderUpgrade(); }));
  on('#botCreate','click',()=>openSheet('botSheet'));
  on('#botUpgradeBtn','click',()=>{ closeSheet('botSheet'); openUpgradeSheet(); });
  on('#botCloseBtn','click',()=>closeSheet('botSheet'));
  on('#bannerClose','click',()=>{ const b=$('#appBanner'); if(b) b.hidden=true; });
  on('#bannerOpen','click',()=>{ toast('You are already in the JepongDevxyz app'); });
  on('#topTitle','click',()=>{ const s=getSession(currentId); if(s) openConversationActions(s, $('#topTitle')); });
  on('#convActionsBtn','click',()=>{ const s=getSession(currentId); if(s) openConversationActions(s, $('#convActionsBtn')); });
  on('#paneBtn','click',()=>{ const p=$('#rightPane'); if(p&&p.hidden) openPane(); else closePane(); });
  on('#paneSidebarBtn','click',openSidebar);
  on('#paneNewTab','click',newChat);
  on('#paneClose','click',closePane);
  on('#plusBtn','click',openPlusSheet);
  on('#modelBtn','click',openModelSheet);
  on('#micBtn','click',toggleVoice);
  on('#voiceBtn','click',openVoiceMode);
  on('#sendBtn','click',()=>{ doSend(); });
  on('#stopBtn','click',stopStreaming);
  on('#scrollBottom','click',()=>{ const cv=$('#chatView'); if(cv){ cv.scrollTop=cv.scrollHeight; updateScrollBtn(); } });
  on('#settingsClose','click',closeSettings);
  on('#settingsBack','click',()=>{ if(settingsPage==='list') closeSettings(); else if(settingsPage==='profile'||settingsPage==='manage-apps') { settingsPage=settingsPage==='profile'?'account':'connectors'; renderSettingsPage(); } else if(settingsPage==='automation-detail'){ settingsPage='automations'; renderSettingsPage(); } else if(settingsPage==='your-automations'){ settingsPage='automations'; renderSettingsPage(); } else { settingsPage='list'; renderSettingsPage(); } });
  on('#setSearch','input',e=>{
    const q=e.target.value.toLowerCase();
    $$('#settingsBody [data-set]').forEach(r=>{ const lab=(r.querySelector('.set-label')||r).textContent.toLowerCase(); r.style.display=q&&!lab.includes(q)?'none':''; });
  });
  on('#settingsBanner','click',()=>openUpgradeSheet('Premium'));
  on('#infoBack','click',closeInfoPage);
  on('#infoClose','click',closeInfoPage);
  on('#libraryBack','click',closeLibrary);
  on('#libraryClose','click',closeLibrary);
  on('#libraryUpload','click',()=>{
    if(libraryTab==='apps'){ newChat(); const inp=$('#composerInput'); if(inp) inp.focus(); return; }
    if(libraryTab==='projects'){ openProjectDialog(); return; }
    pickFile('files');
  });
  on('#libSearch','input',e=>{ libQ=e.target.value.toLowerCase(); renderLibrary(); });
  on('#libViewBtn','click',()=>libViewMenu($('#libViewBtn')));
  on('#libFileInput','change',e=>{
    const files=Array.from(e.target.files||[]);
    files.forEach(f=>{
      if(f.size>1150000){ toast(f.name+' is too large (1.1 MB limit)'); return; }
      const id=uid();
      library.unshift({id:id, name:f.name, kind:f.type.startsWith('image/')?'image':'file', size:f.size, createdAt:Date.now()});
      const r=new FileReader();
      r.onload=()=>{ const item=library.find(x=>x.id===id); if(item) item.data=r.result; saveLibrary(); };
      r.readAsDataURL(f);
    });
    saveLibrary(); renderLibrary(); e.target.value='';
  });
  on('#projectBack','click',closeProjectPage);
  on('#projectClose','click',closeProjectPage);
  on('#projectMenuBtn','click',e=>{ const p=getProject(projectPageId); if(p) projectPageMenu(p, e.currentTarget); });
  on('#projAddBtn','click',()=>{ const p=getProject(projectPageId); if(p) projectAddMenu(p, $('#projAddBtn')); });
  on('#projIconBtn','click',()=>{ openProjIconSheet(); });
  on('#projCreateBtn','click',createProjectFromDialog);
  on('#upgClose','click',()=>{ closeUpgradeSheet(); });
  on('#promoClose','click',closePromoSheet);
  on('#promoClaimBtn','click',()=>{ settings.plan='Premium'; saveSettings(); closePromoSheet(); toast('Premium plan set — Free on this device'); });
  on('#vmVoiceSel','click',openVoiceSheet);
  on('#vmMic','click',e=>{ const b=e.currentTarget; b.classList.toggle('muted'); if(b.classList.contains('muted')){ try{ if(vmRecog) vmRecog.stop(); }catch(err){} } else { vmStartRecog(); } });
  on('#vmStop','click',closeVoiceMode);
  on('#vmPlus','click',openPlusSheet);
  on('#attachFilesBtn','click',()=>pickFile('files'));
  on('#attachImagesBtn','click',()=>pickFile('images'));
  on('#fileInput','change',e=>{ const files=Array.from(e.target.files||[]); addAttachments(files); e.target.value=''; });
  on('#imageGenerateBtn','click',()=>{ const p=$('#imagePrompt'); const prompt=(p&&p.value||'').trim(); if(!prompt) return; const s=curSession()||ensureSessionForSend(); if(!s) return; const userMsg={id:uid(), role:'user', text:prompt, createdAt:Date.now(), attachments:[]}; s.messages.push(userMsg); s.updatedAt=Date.now(); saveSessions(); if(!privateMode){ extra.lastSessionId=s.id; saveExtra(); } if(p) p.value=''; closeSheet('imageSheet'); renderAll(); runImageGeneration(s,userMsg); });
  on('#paletteInput','input',e=>{ palQ=e.target.value.toLowerCase(); renderPalette(); });
  document.querySelectorAll('.pal-tab').forEach(t=>t.addEventListener('click',()=>{ palTab=t.getAttribute('data-pal-tab'); renderPalette(); }));
  document.querySelectorAll('#libTabs .tab').forEach(t=>t.addEventListener('click',()=>{ libTab=t.getAttribute('data-lib-tab'); renderLibrary(); }));
  document.querySelectorAll('.proj-tab').forEach(t=>t.addEventListener('click',()=>{ projectTab=t.getAttribute('data-proj-tab'); renderProjectPage(); }));
  document.querySelectorAll('.upg-tab').forEach(t=>t.addEventListener('click',()=>{ upgTab=t.getAttribute('data-upg-tab'); renderUpgrade(); }));
  document.querySelectorAll('.proj-color-dot').forEach(d=>d.addEventListener('click',()=>{
    projectDialogState.color=parseInt(d.getAttribute('data-proj-color'),10);
    $$('.proj-color-dot').forEach(x=>x.classList.toggle('sel', x===d));
    const ib=$('#projIconBtn'); if(ib) ib.style.background=PROJ_COLORS[projectDialogState.color]||'#6e6e6a';
    const sub=$('#projIconSub'); if(sub) sub.textContent='Icon and color · '+(PROJ_COLORS[projectDialogState.color]==='#ec4899'?'Pink':PROJ_COLORS[projectDialogState.color]==='#6e6e6a'?'Default':PROJ_COLORS[projectDialogState.color]);
  }));
  document.querySelectorAll('.proj-icon-cell').forEach(c=>c.addEventListener('click',()=>{
    projectDialogState.icon=c.getAttribute('data-proj-icon');
    $$('.proj-icon-cell').forEach(x=>x.classList.toggle('sel', x===c));
    const ib=$('#projIconBtn'); if(ib) ib.innerHTML=icon(projectDialogState.icon,26);
  }));
  document.addEventListener('click',e=>{
    const cls=e.target.closest('[data-close-sheet]');
    if(cls){ const sh=cls.closest('.sheet'); if(sh){ if(sh.id==='projIconSheet') closeSheet('projIconSheet'); else closeSheet(sh.id); } }
  });
  document.addEventListener('click',e=>{
    const p=e.target.closest('[data-voice-btn]');
    if(p){ closeSheet('voiceSheet'); openVoicePickerDialog(); }
  });
  const ci=$('#composerInput');
  if(ci){
    ci.addEventListener('input',syncComposer);
    ci.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){
        if(settings.behavior.ctrlEnter){ if(e.ctrlKey){ e.preventDefault(); doSend(); } }
        else { e.preventDefault(); doSend(); }
      }
      if(e.key==='Escape'){ closeSheet('plusSheet'); }
    });
  }
  const cv=$('#chatView');
  if(cv) cv.addEventListener('scroll',()=>{ scrollState.atBottom=cv.scrollTop+cv.clientHeight>=cv.scrollHeight-40; updateScrollBtn(); });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const open=openSheets.filter(x=>!$(x)||!$(x).hidden);
      if(open.length){ const top=open[open.length-1]; closeSheet(top); if(top==='plusSheet'){ const pb=$('#plusBtn'); if(pb) pb.focus(); } return; }
      if(document.querySelector('#menuPop')){ closeMenu(); return; }
      if(sidebarOpen){ closeSidebar(); return; }
      const vm=$('#voiceMode'); if(vm&&!vm.hidden){ closeVoiceMode(); return; }
      const pane=$('#rightPane'); if(pane&&!pane.hidden){ closePane(); return; }
    }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='j'){ e.preventDefault(); openPalette(); }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='o'){ e.preventDefault(); openPane(); }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='n'){ e.preventDefault(); newChat(); }
    if((e.ctrlKey||e.metaKey)&&e.key===','){ e.preventDefault(); openSettings('list'); }
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); }
  });
  window.addEventListener('beforeunload',()=>{ saveDraft(); saveSessions(); });
  window.addEventListener('resize',()=>{ const cv2=$('#chatView'); if(cv2&&scrollState.atBottom) cv2.scrollTop=cv2.scrollHeight; });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden){ saveDraft(); } });
}
function openConversationActions(s, anchor){
  openMenuAt(anchor, [
    {icon:'share', label:'Share', onClick:()=>shareChat(s.id)},
    {icon:'pin', label:'Pin', onClick:()=>togglePin(s.id)},
    {icon:'pencil', label:'Rename', onClick:()=>startTopRename(s)},
    {label:'Add to Project', chevron:true, items:projectOptions(s)},
    {icon:'message-square', label:'Send Feedback', onClick:()=>openFeedback()},
    {divider:true},
    {icon:'copy', label:'Copy Conversation ID', onClick:()=>copyText(s.id)},
    {icon:'external-link', label:'Open in new tab', onClick:()=>{ try{ window.open(location.href,'_blank'); }catch(e){ toast('Could not open a new tab'); } }},
    {icon:'archive', label:'Archive', onClick:()=>archiveChat(s.id)},
    {icon:'trash-2', label:'Delete', danger:true, onClick:()=>deleteChat(s.id)},
  ]);
}
function projectOptions(s){
  const list=projects.map(p=>({icon:'folder', label:p.name, onClick:()=>{ moveChatToProject(s.id,p.id); }}));
  list.push({icon:'plus', label:'New project…', onClick:()=>openProjectDialog()});
  return list;
}
function openMenuAt(selOrEl, items){
  const el=typeof selOrEl==='string'?$(selOrEl):selOrEl; if(!el) return;
  const r=el.getBoundingClientRect();
  const w=Math.max(180,Math.min(240,window.innerWidth-32));
  showMenu(Math.max(8,Math.min(r.left,window.innerWidth-w-8)), r.bottom+6, items, {width:w});
}
function setActiveSession(id){ /* sidebar active marker handled by renderSidebar */ }
function toggleSidebarSection(key){
  if(key==='chats'){ sidebarChatsExpanded=!sidebarChatsExpanded; renderSidebar(); return; }
  if(key==='projects'){ sidebarProjectsExpanded=!sidebarProjectsExpanded; renderSidebar(); return; }
  sidebarCollapsed[key]=!sidebarCollapsed[key];
  const ids={recents:'#sbRecentsList'};
  const el=$(ids[key]); if(el) el.style.display=sidebarCollapsed[key]?'none':'';
  const chevIds={recents:'#sbRecentsChev'};
  const ch=$(chevIds[key]); if(ch) ch.classList.toggle('collapsed', !!sidebarCollapsed[key]);
}
function init(){
  if(!settings.voice) settings.voice={grokVoice:'Ara', rate:1, personality:'Assistant', dictation:'Tidy up'};
  applyTheme();
  wire();
  purgeTrash();
  resetFallbackTitles();
  const last=extra.lastSessionId;
  if(last&&getSession(last)){ currentId=last; }
  renderAll();
  renderHome();
  recoverPending();
  checkProductUpdates();
  if(window.speechSynthesis&&window.speechSynthesis.getVoices){ window.speechSynthesis.getVoices(); }
  if(window.speechSynthesis) window.speechSynthesis.onvoiceschanged=()=>{ /* voices loaded lazily */ };
  const cv=$('#chatView'); if(cv) cv.scrollTop=cv.scrollHeight;
}
if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', init); } else { init(); }
