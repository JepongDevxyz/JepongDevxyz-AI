'use strict';
/* JepongDevxyz AI — fresh Qwen-based frontend. Vanilla JS, no build step.
   Backend: POST /api/chat (see BLUEPRINT.md). Local stores only. */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,9);
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
/* Qwen icon set = official Lucide stroke glyphs (lucide-static, ISC) + a few custom glyphs
   drawn to the same 24x24 / stroke-2 grid (temp chat, agent bot, create video, usage,
   settings-general, folder-arrow, star4, stop). Sizes follow PIXEL-DIFF.md measurements. */
const ICONS={
  'panel-left':'<rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" />',
  'message-square-plus':'<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /><path d="M12 8v6" /><path d="M9 11h6" />',
  'search':'<path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" />',
  'circle-x':'<circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />',
  'layout-grid':'<rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />',
  'square-terminal':'<path d="m7 11 2-2-2-2" /><path d="M11 13h4" /><rect width="18" height="18" x="3" y="3" rx="2" ry="2" />',
  'sparkles':'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" /><path d="M20 2v4" /><path d="M22 4h-4" /><circle cx="4" cy="20" r="2" />',
  'sparkle':'<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />',
  'chevron-down':'<path d="m6 9 6 6 6-6" />',
  'chevron-left':'<path d="m15 18-6-6 6-6" />',
  'chevron-up':'<path d="m18 15-6-6-6 6" />',
  'chevron-right':'<path d="m9 18 6-6-6-6" />',
  'plus':'<path d="M5 12h14" /><path d="M12 5v14" />',
  'circle-plus':'<circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" />',
  'ellipsis':'<circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />',
  'user':'<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />',
  'settings':'<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" />',
  'archive':'<rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" />',
  'archive-restore':'<rect width="20" height="5" x="2" y="3" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h2" /><path d="M20 8v11a2 2 0 0 1-2 2h-2" /><path d="m9 15 3-3 3 3" /><path d="M12 12v9" />',
  'headset':'<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" /><path d="M21 16v2a4 4 0 0 1-4 4h-5" />',
  'log-out':'<path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />',
  'info':'<circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />',
  'monitor':'<rect width="20" height="14" x="2" y="3" rx="2" /><line x1="8" x2="16" y1="21" y2="21" /><line x1="12" x2="12" y1="17" y2="21" />',
  'eye':'<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />',
  'maximize':'<path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />',
  'smartphone':'<rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />',
  'layers':'<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" /><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" /><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />',
  'message-square':'<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />',
  'copy':'<rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />',
  'pencil':'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" />',
  'pencil-line':'<path d="M13 21h8" /><path d="m15 5 4 4" /><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />',
  'trash-2':'<path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  'share':'<path d="M12 2v13" /><path d="m16 6-4-4-4 4" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />',
  'forward':'<path d="m15 17 5-5-5-5" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" />',
  'rotate-ccw':'<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />',
  'thumbs-up':'<path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /><path d="M7 10v12" />',
  'thumbs-down':'<path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" /><path d="M17 14V2" />',
  'volume-2':'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" />',
  'git-branch':'<path d="M15 6a9 9 0 0 0-9 9V3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />',
  'lightbulb':'<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" />',
  'arrow-up':'<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />',
  'arrow-left':'<path d="m12 19-7-7 7-7" /><path d="M19 12H5" />',
  'download':'<path d="M12 15V3" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" />',
  'upload':'<path d="M12 3v12" /><path d="m17 8-5-5-5 5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />',
  'image-plus':'<path d="M16 5h6" /><path d="M19 2v6" /><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><circle cx="9" cy="9" r="2" />',
  'globe':'<circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />',
  'sun':'<circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />',
  'file-text':'<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" />',
  'shield':'<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />',
  'cookie':'<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M11 17v.01" /><path d="M7 14v.01" />',
  'mail':'<rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />',
  'graduation-cap':'<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" /><path d="M22 10v6" /><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />',
  'square-code':'<path d="m10 9-3 3 3 3" /><path d="m14 15 3-3-3-3" /><rect x="3" y="3" width="18" height="18" rx="2" />',
  'presentation':'<path d="M2 3h20" /><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" /><path d="m7 21 5-5 5 5" />',
  'box':'<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />',
  'book-open':'<path d="M12 5v16" /><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z" />',
  'send':'<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" />',
  'flask-conical':'<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" /><path d="M6.453 15h11.094" /><path d="M8.5 2h7" />',
  'pin':'<path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />',
  'list-checks':'<path d="M13 5h8" /><path d="M13 12h8" /><path d="M13 19h8" /><path d="m3 17 2 2 4-4" /><path d="m3 7 2 2 4-4" />',
  'message-square-warning':'<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /><path d="M12 15h.01" /><path d="M12 7v4" />',
  'mic':'<path d="M12 19v3" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><rect x="9" y="2" width="6" height="13" rx="3" />',
  'audio-lines':'<path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" />',
  'check':'<path d="M20 6 9 17l-5-5" />',
  'x':'<path d="M18 6 6 18" /><path d="m6 6 12 12" />',
  'temp-chat':'<rect class="temp-rect" x="3.5" y="3.5" width="17" height="15" rx="4" stroke-dasharray="4.5 3.5" /><path d="M8 18.5v2.8L12.2 18.5" />',
  'agent-bot':'<circle cx="11" cy="10.5" r="7.5" /><circle cx="8.3" cy="10" r="1" fill="currentColor" stroke="none" /><circle cx="13.7" cy="10" r="1" fill="currentColor" stroke="none" /><path d="M8.8 13.8h4.4" /><path d="M16.3 15.8l2.1 3.8-3.9-1.5" />',
  'create-video':'<rect x="2.5" y="5.5" width="15" height="13" rx="2.5" /><path d="M10 9.4l4.6 2.6-4.6 2.6z" /><path d="M19 2.6v4.8" /><path d="M16.6 5h4.8" />',
  'usage':'<rect x="3" y="5" width="18" height="14" rx="2" /><path d="M6.5 12.2h2.6l1.4-2.6 2.8 4.8 1.4-2.2h2.8" />',
  'settings-general':'<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><circle cx="12" cy="12" r="3" />',
  'star4':'<path d="M12 3c.75 4.6 2.15 6.9 9 9-6.85 2.1-8.25 4.4-9 9-.75-4.6-2.15-6.9-9-9C10.85 9.9 12.25 7.6 12 3Z" />',
  'folder-arrow':'<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="M12.5 15.2h6" /><path d="m16.4 12.9 2.3 2.3-2.3 2.3" />',
  'stop':'<rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" stroke="none" />',
};
const _CHEV=new Set(['chevron-down','chevron-up','chevron-right']);
const _FILL=new Set(['star4']);
const ic=(name,size=16)=>{ const inner=ICONS[name]||'';
  if(_FILL.has(name)) return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'+inner+'</svg>';
  return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'+(_CHEV.has(name)?1.5:2)+'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+inner+'</svg>'; };
/* hydrate static index.html icon slots: <span data-icon="name" data-size="N"></span> */
function hydrateIcons(root){ (root||document).querySelectorAll('[data-icon]').forEach(el=>{ el.innerHTML=ic(el.dataset.icon, parseFloat(el.dataset.size)||16); }); }
/* Strip ALL backend internal-marker blocks ([[JD_FOLLOWUPS]], [[JD_WORK_NOTE]], any
   [[JD_*]] ... [[/JD_*]] pair), unterminated trailing blocks, stray lone JD tags and
   ITEM: lines from assistant text. Applied in the renderer, on save and at load. */
function cleanAssistantText(t){
  let s=String(t??'');
  s=s.replace(/\[\[JD_[A-Z_]+\]\][\s\S]*?\[\[\/JD_[A-Z_]+\]\]/g,'');
  s=s.replace(/\[\[JD_[A-Z_]+\]\][\s\S]*$/g,'');
  s=s.replace(/\[\[\/?JD_[A-Z_]+\]\]/g,'');
  s=s.replace(/^[ \t]*ITEM:[^\n]*$/gm,'');
  return s.replace(/\n{3,}/g,'\n\n').trim();
}

const MODELS=[{"provider": "bailucode", "id": "bailu-apex", "name": "BAILU Apex", "desc": "Strongest normal route"}, {"provider": "bailucode", "id": "bailu-2.8", "name": "BAILU 2.8", "desc": "Normal + Anthropic routes"}, {"provider": "bailucode", "id": "bailu-2.7-1m", "name": "BaiLu 2.7 1M", "desc": "Normal + Anthropic routes \u00b7 1M context"}];
const PROVIDER_NAMES={bailucode:'Bailucode'};

const SESS_KEY='jepongQwenReset.sessions.v1', SET_KEY='jepongQwenReset.settings.v1', PROJ_KEY='jepongQwenReset.projects.v1', EXTRA_KEY='jepongQwenReset.extra.v1';
function loadJSON(k,f){ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):f; }catch(e){ return f; } }
function saveJSON(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }

const defaultSettings=()=>({
  theme:'system', profileName:'Jepong', profileEmail:'', profilePhoto:'',
  provider:'bailucode', model:'bailu-apex', bailuRoute:'',
  responseMode:'Auto', webSearch:false, toolsEnabled:true, advancedEnabled:true,
  responseLang:{code:'auto', label:'Auto'},
  interface:{titleAuto:true, autoCopy:false, pasteAsFile:true},
  personalization:{nickname:'', about:'', style:'Default', custom:'', enableNew:true, refMemory:true, refHistory:true, savedMemory:''},
  advanced:{webScraping:true, imageSearch:true, webSearchAdv:true, imageGeneration:true, codeInterpreter:true, retrieveMemory:true, imageEditing:true, updateMemory:true, localEnlarge:true},
  cookies:{analytics:false, personalization:true},
  voice:{voiceURI:'', name:'', lang:'', rate:1, pitch:1, voiceMode:false}
});
let settings=Object.assign(defaultSettings(), loadJSON(SET_KEY,{}));
settings.interface=Object.assign(defaultSettings().interface, settings.interface||{});
settings.personalization=Object.assign(defaultSettings().personalization, settings.personalization||{});
settings.advanced=Object.assign(defaultSettings().advanced, settings.advanced||{});
settings.cookies=Object.assign(defaultSettings().cookies, settings.cookies||{});
settings.voice=Object.assign(defaultSettings().voice, settings.voice||{});
settings.responseLang=Object.assign(defaultSettings().responseLang, settings.responseLang||{});
/* Bailu-only: a saved selection from the multi-provider era (or any pair not
   in MODELS) resolves to the default Bailu model at boot, so a stale Gemini
   selection lands on BAILU Apex instead of being sent to the backend. */
if(!MODELS.some(m=>m.provider===settings.provider&&m.id===settings.model)){
  settings.provider='bailucode'; settings.model='bailu-apex';
}
let sessions=loadJSON(SESS_KEY,[]); if(!Array.isArray(sessions)) sessions=[];
let projects=loadJSON(PROJ_KEY,[]); if(!Array.isArray(projects)) projects=[];
let extra=loadJSON(EXTRA_KEY,{feedback:[],reports:[]});

let currentId=null, temporary=false, tempSession=null;
let activeProjectId=null;           // project filter / assignment for new chats
let searchQuery='', searchTimer=null;
let manageMode=false; const manageSel=new Set();
let shareMode=false; const shareSel=new Set();
let attachments=[]; let activeTool=null;
let modelsExpanded=false; let settingsPageKey='profile'; const settingsStack=[];
let aborter=null, streaming=false, stickBottom=true;
let editingMsgId=null;

const saveSessions=()=>saveJSON(SESS_KEY,sessions);
const saveProjects=()=>saveJSON(PROJ_KEY,projects);
const saveSettings=()=>saveJSON(SET_KEY,settings);
const saveExtra=()=>saveJSON(EXTRA_KEY,extra);
const getSession=id=>sessions.find(s=>s.id===id)||null;
const currentSession=()=> temporary? tempSession : getSession(currentId);
const modelEntry=()=>MODELS.find(m=>m.provider===settings.provider&&m.id===settings.model)||MODELS[0];

/* ---------- theme ---------- */
function resolvedTheme(){ if(settings.theme==='dark') return 'dark'; if(settings.theme==='light') return 'light'; try{ return window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'; }catch(e){ return 'light'; } }
function applyTheme(){ document.documentElement.dataset.theme=resolvedTheme(); }
try{ window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(settings.theme==='system') applyTheme(); }); }catch(e){}

/* ---------- toast ---------- */
let toastTimer=null;
/* Toast placement (overlap fix, 2026-11-07): the fixed bottom:24px toast sat
   ON the docked composer — the overlap audit measured it covering the
   textarea by 119x17.5px and the mode button by 16.7x12.5px at 390x844.
   Anchor it 12px above the composer's top edge instead, measured on every
   call so it follows composer growth and the home/dock/temp placements.
   If the tools/mode menu is already open (it grows upward from the
   composer, into exactly that space), anchor above the menu instead; and
   any next tap dismisses the toast, so it can never sit on a menu the
   user opens right after the toast appears (measured: it covered the
   Tools toggle row by 139.7x35px in that sequence). */
function anchorToast(){ const t=$('#toast'); if(!t) return; const tm=$('#toolsMenu'), mm=$('#modeMenu'); const anchor=(tm&&!tm.hidden)?tm:((mm&&!mm.hidden)?mm:$('#composer')); if(!anchor) return; const r=anchor.getBoundingClientRect(); if(r.height>0) t.style.bottom=Math.max(24, Math.round(window.innerHeight-r.top+12))+'px'; }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; anchorToast(); clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },2600); }
document.addEventListener('pointerdown',()=>{ const t=$('#toast'); if(t&&!t.hidden){ t.hidden=true; clearTimeout(toastTimer); } },true);

/* ---------- generic modal / context menu ---------- */
function closeModal(){ $('#modalRoot').innerHTML=''; }
function openModal({title='',body='',actions=[],wide=false}={}){
  const root=$('#modalRoot');
  root.innerHTML=`<div class="modal-backdrop"><div class="modal${wide?' wide':''}" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><div class="modal-body"></div><div class="modal-actions"></div></div></div>`;
  const bodyEl=root.querySelector('.modal-body'); if(typeof body==='string') bodyEl.innerHTML=body; else if(body) bodyEl.appendChild(body);
  const actEl=root.querySelector('.modal-actions');
  actions.forEach(a=>{ const b=document.createElement('button'); b.type='button'; b.textContent=a.label; b.className=a.kind==='danger'?'danger-btn':a.kind==='primary'?'primary-btn':'white-pill'; b.addEventListener('click',()=>a.onClick&&a.onClick(b)); actEl.appendChild(b); });
  root.querySelector('.modal-backdrop').addEventListener('mousedown',e=>{ if(e.target.classList.contains('modal-backdrop')) closeModal(); });
  return {bodyEl, actEl, close:closeModal};
}
function confirmModal(title,text,confirmLabel,onConfirm){
  openModal({title, body:`<p>${esc(text)}</p>`, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:confirmLabel, kind:'danger', onClick:()=>{ closeModal(); onConfirm(); }}
  ]});
}
let ctxEl=null;
function closeCtx(){ if(ctxEl){ ctxEl.remove(); ctxEl=null; } }
function showCtx(x,y,items){
  closeCtx(); ctxEl=document.createElement('div'); ctxEl.className='context-menu'; ctxEl.setAttribute('role','menu');
  items.forEach(it=>{ if(it.sep){ const d=document.createElement('div'); d.className='menu-sep'; ctxEl.appendChild(d); return; }
    const b=document.createElement('button'); b.type='button'; b.innerHTML=`<span class="ctx-main">${it.icon?`<span class="ctx-ic">${ic(it.icon)}</span>`:''}<span>${esc(it.label)}</span></span>${it.arrow?`<span class="ctx-chev">${ic('chevron-right',14)}</span>`:''}`; if(it.danger) b.className='danger';
    b.addEventListener('click',()=>{ if(!it.keepOpen) closeCtx(); it.onClick&&it.onClick(); }); ctxEl.appendChild(b); });
  document.body.appendChild(ctxEl);
  const r=ctxEl.getBoundingClientRect(); ctxEl.style.left=clamp(x,8,innerWidth-r.width-8)+'px'; ctxEl.style.top=clamp(y,8,innerHeight-r.height-8)+'px';
}
document.addEventListener('click',e=>{ if(ctxEl&&!ctxEl.contains(e.target)) closeCtx(); });

/* ---------- sidebar: sessions / projects / search / manage ---------- */
function dateGroup(ts){
  const now=new Date(), d=new Date(ts);
  const startOfDay=x=>new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
  const diff=(startOfDay(now)-startOfDay(d))/86400000;
  if(diff<=0) return 'Today'; if(diff<7) return 'Previous 7 Days'; return 'Older';
}
function highlight(text,q){
  const t=String(text||''); if(!q) return esc(t);
  const i=t.toLowerCase().indexOf(q.toLowerCase()); if(i<0) return esc(t);
  return esc(t.slice(0,i))+'<mark>'+esc(t.slice(i,i+q.length))+'</mark>'+esc(t.slice(i+q.length));
}
function visibleSessions(){ return sessions.filter(s=>!s.archived&&(!activeProjectId||s.projectId===activeProjectId)); }

function chatRow(s,{archived=false,q=''}={}){
  const row=document.createElement('div'); row.className='chat-row'+(s.id===currentId&&!temporary?' selected':'');
  let inner='';
  if(manageMode&&!archived) inner+=`<input class="manage-check" type="checkbox" ${manageSel.has(s.id)?'checked':''} aria-label="Select chat">`;
  inner+=`<button class="chat-open" type="button">${highlight(s.title,q)}${q&&s._snippet?`<span class="snippet">${highlight(s._snippet,q)}</span>`:''}</button>`;
  if(!manageMode) inner+=`<button class="chat-menu-btn" type="button" aria-label="Chat menu">${ic('ellipsis')}</button>`;
  row.innerHTML=inner;
  const open=()=>{ if(manageMode&&!archived){ toggleManageSel(s.id); } else openSession(s.id); };
  row.querySelector('.chat-open').addEventListener('click',open);
  const chk=row.querySelector('.manage-check'); if(chk) chk.addEventListener('change',()=>toggleManageSel(s.id));
  const mb=row.querySelector('.chat-menu-btn'); if(mb) mb.addEventListener('click',e=>{ e.stopPropagation(); const r=mb.getBoundingClientRect(); showChatMenu(s,r.left-170,r.bottom+4,archived); });
  return row;
}
function renderHistory(){
  const list=$('#historyList'); list.innerHTML='';
  const vis=visibleSessions().slice().sort((a,b)=> (b.pinned-a.pinned) || b.updatedAt-a.updatedAt);
  if(!vis.length){ list.innerHTML='<div class="empty-note">No chats yet</div>'; }
  let lastGroup='';
  vis.forEach(s=>{ const g=s.pinned?'Pinned':dateGroup(s.updatedAt);
    if(g!==lastGroup){ const l=document.createElement('div'); l.className='group-label'; l.textContent=g; list.appendChild(l); lastGroup=g; }
    list.appendChild(chatRow(s)); });
  /* No Archived section in the sidebar (Qwen has none) — archived chats live in the
     Archived Chats modal (profile menu / Settings > Chats). */
  renderManageBar();
}
function renderSearch(){
  const box=$('#searchResults'); const q=searchQuery.trim();
  $('#historySections').hidden=!!q; box.innerHTML='';
  if(!q) return;
  const hits=sessions.filter(s=>!s.archived).map(s=>{
    const inTitle=s.title.toLowerCase().includes(q.toLowerCase());
    const msg=s.messages.find(m=>m.text&&m.text.toLowerCase().includes(q.toLowerCase()));
    if(!inTitle&&!msg) return null;
    return Object.assign({},s,{_snippet:msg?msg.text.slice(Math.max(0,msg.text.toLowerCase().indexOf(q.toLowerCase())-20), msg.text.toLowerCase().indexOf(q.toLowerCase())+q.length+40):''});
  }).filter(Boolean);
  if(!hits.length){ box.innerHTML='<div class="empty-note">No results</div>'; return; }
  hits.forEach(s=>box.appendChild(chatRow(s,{q})));
}
function renderProjects(){
  const el=$('#projectList'); el.innerHTML='';
  projects.forEach(p=>{
    const row=document.createElement('div'); row.className='project-row'+(p.id===activeProjectId?' selected':'');
    row.innerHTML=`<button class="project-open" type="button">${esc(p.icon||'▣')} ${esc(p.name)}</button><button class="project-menu-btn" type="button" aria-label="Project menu">${ic('ellipsis')}</button>`;
    row.querySelector('.project-open').addEventListener('click',()=>{ activeProjectId=activeProjectId===p.id?null:p.id; renderProjects(); renderAll(); toast(activeProjectId?('Project: '+p.name):'All chats'); });
    row.querySelector('.project-menu-btn').addEventListener('click',e=>{ e.stopPropagation(); const r=e.target.getBoundingClientRect(); showCtx(r.left-160,r.bottom+4,[
      {label:'Rename', icon:'pencil-line', onClick:()=>renameProject(p)},
      {label:'New Chat in Project', icon:'message-square-plus', onClick:()=>{ activeProjectId=p.id; newChat(); }},
      {sep:true},
      {label:'Delete', icon:'trash-2', danger:true, onClick:()=>confirmModal('Delete project?','Chats in this project will stay, unassigned.','Delete',()=>{ sessions.forEach(s=>{ if(s.projectId===p.id) delete s.projectId; }); projects=projects.filter(x=>x.id!==p.id); if(activeProjectId===p.id) activeProjectId=null; saveProjects(); saveSessions(); renderProjects(); renderAll(); })}
    ]); });
    el.appendChild(row);
  });
}
function toggleManageSel(id){ manageSel.has(id)?manageSel.delete(id):manageSel.add(id); renderHistory(); }
function renderManageBar(){
  $('#manageBar').hidden=!manageMode;
  if(manageMode){ $('#manageCount').textContent=`Selected ${manageSel.size}/${visibleSessions().length}`; $('#manageSelectAll').checked=manageSel.size>0&&manageSel.size===visibleSessions().length; }
}
function setManageMode(on){ manageMode=on; manageSel.clear(); $('#externalRows').style.display=on?'none':''; renderHistory(); }
function closeMobileDrawer(){ const sb=$('#sidebar'); if(sb) sb.classList.remove('mobile-open'); const sc=$('#sidebarScrim'); if(sc) sc.hidden=true; }
function openSession(id){ currentId=id; temporary=false; tempSession=null; exitShareMode(); closeMobileDrawer(); renderAll(); }
function newChat(){
  currentId=null; temporary=false; tempSession=null; exitShareMode(); closeMobileDrawer();
  const inp=$('#composerInput'); inp.value=''; attachments=[]; renderAttachments();
  renderAll(); autosize(); updateSend(); inp.focus();
}
function ensureSession(firstText){
  if(temporary){ if(!tempSession) tempSession={id:'temp', title:'Temporary Chat', messages:[], createdAt:Date.now(), updatedAt:Date.now()}; return tempSession; }
  let s=getSession(currentId);
  if(!s){ s={id:uid(), title:settings.interface.titleAuto? (firstText||'New Chat').slice(0,60)||'New Chat':'New Chat', createdAt:Date.now(), updatedAt:Date.now(), pinned:false, archived:false, messages:[], titleAutoPending:!!settings.interface.titleAuto, titleRequested:false};
    if(activeProjectId) s.projectId=activeProjectId;
    sessions.unshift(s); currentId=s.id; }
  return s;
}

/* ---------- chat "..." menu + actions on sessions ---------- */
function download(name, content, type){
  try{ const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); }
  catch(e){ toast('Download is not available here'); }
}
function showChatMenu(s,x,y,archived=false){
  const items=[];
  if(archived){
    items.push({label:'Unarchive', icon:'archive-restore', onClick:()=>{ s.archived=false; s.updatedAt=Date.now(); saveSessions(); renderAll(); }});
    items.push({label:'Delete', icon:'trash-2', danger:true, onClick:()=>confirmDeleteSession(s)});
  } else {
    items.push({label:s.pinned?'Unpin':'Pin', icon:'pin', onClick:()=>{ s.pinned=!s.pinned; s.updatedAt=Date.now(); saveSessions(); renderAll(); }});
    items.push({label:'Rename', icon:'pencil-line', onClick:()=>renameSession(s)});
    items.push({label:'Clone', icon:'copy', onClick:()=>{ const c=JSON.parse(JSON.stringify(s)); c.id=uid(); c.title=s.title+' copy'; c.createdAt=Date.now(); c.updatedAt=Date.now(); c.titleRequested=true; delete c.titleAutoPending; sessions.unshift(c); saveSessions(); renderAll(); toast('Chat cloned'); }});
    items.push({label:'Archive', icon:'archive', onClick:()=>{ s.archived=true; if(currentId===s.id) currentId=null; saveSessions(); renderAll(); }});
    items.push({label:'Share', icon:'forward', onClick:()=>{ openSession(s.id); enterShareMode(); }});
    items.push({label:'Select', icon:'list-checks', onClick:()=>{ setManageMode(true); }});
    items.push({label:'Download', icon:'download', arrow:true, onClick:()=>{ openModal({title:'Download chat', body:'<p>Choose a format.</p>', actions:[
      {label:'Export chat (.json)', onClick:()=>{ download(s.title.replace(/[^\w-]+/g,'_')+'.json', JSON.stringify(s,null,2),'application/json'); closeModal(); }},
      {label:'Plain text (.txt)', onClick:()=>{ download(s.title.replace(/[^\w-]+/g,'_')+'.txt', s.messages.map(m=>(m.role==='user'?'You: ':'JepongDevxyz AI: ')+m.text).join('\n\n'),'text/plain'); closeModal(); }},
      {label:'Cancel', onClick:()=>closeModal()} ]}); }});
    items.push({label:'Move to Project', icon:'folder-arrow', arrow:true, onClick:()=>{ const body=document.createElement('div');
      if(!projects.length) body.innerHTML='<p>No projects yet. Create one from the sidebar first.</p>';
      projects.forEach(p=>{ const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=p.name; b.addEventListener('click',()=>{ s.projectId=p.id; saveSessions(); closeModal(); renderAll(); toast('Moved to '+p.name); }); body.appendChild(b); });
      const none=document.createElement('button'); none.type='button'; none.className='chip'; none.textContent='No project'; none.addEventListener('click',()=>{ delete s.projectId; saveSessions(); closeModal(); renderAll(); }); body.appendChild(none);
      openModal({title:'Move to Project', body, actions:[{label:'Cancel', onClick:()=>closeModal()}]}); }});
    items.push({label:'Delete', icon:'trash-2', danger:true, onClick:()=>confirmDeleteSession(s)});
    items.push({sep:true});
    items.push({label:'Report Content', icon:'message-square-warning', onClick:()=>reportContent(s)});
  }
  showCtx(x,y,items);
}
function confirmDeleteSession(s){
  openModal({title:'Delete chat?', body:`<p>Delete "${esc(s.title)}"? This cannot be undone.</p>`, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Delete', kind:'danger', onClick:()=>{ sessions=sessions.filter(x=>x.id!==s.id); if(currentId===s.id) currentId=null; saveSessions(); closeModal(); renderAll(); }}
  ]});
}
function renameSession(s){
  const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Chat name</label><input class="text-input" id="renameInput" value="${esc(s.title)}" maxlength="120"></div>`;
  openModal({title:'Rename chat', body:wrap, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Save', kind:'primary', onClick:()=>{ const v=wrap.querySelector('#renameInput').value.trim(); if(v){ s.title=v; s.titleAutoPending=false; s.updatedAt=Date.now(); saveSessions(); renderAll(); } closeModal(); }}
  ]});
  setTimeout(()=>{ const i=wrap.querySelector('#renameInput'); i&&i.focus(); i&&i.select(); },30);
}
function renameProject(p){
  const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Project Name</label><input class="text-input" id="renameInput" value="${esc(p.name)}" maxlength="80"></div>`;
  openModal({title:'Rename project', body:wrap, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Save', kind:'primary', onClick:()=>{ const v=wrap.querySelector('#renameInput').value.trim(); if(v){ p.name=v; saveProjects(); renderProjects(); } closeModal(); }}
  ]});
}
function reportContent(s){
  const wrap=document.createElement('div'); wrap.innerHTML=`<div class="field"><label>Reason</label><textarea class="textarea-input" id="reportText" placeholder="Describe the problem" maxlength="1000"></textarea></div><p class="kbd-note">Reports are stored on this device only — the backend contract has no report endpoint.</p>`;
  openModal({title:'Report Content', body:wrap, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Submit', kind:'primary', onClick:()=>{ const v=wrap.querySelector('#reportText').value.trim(); if(!v){ toast('Add a reason first'); return; } extra.reports.push({chatId:s.id, reason:v, at:Date.now()}); saveExtra(); closeModal(); toast('Report saved on this device'); }}
  ]});
}

/* ---------- New Project dialog (local projects store) ---------- */
function newProjectModal(){
  const cats=['Investment','Homework','Writing','Health','Travel'];
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="icon-choice"><div class="project-icon" id="npIcon">▣</div><div class="chip-row" id="npIcons">${['▣','◆','●','▲','■','★','⬢','✚'].map((i,ix)=>`<button type="button" class="chip${ix===0?' active':''}" data-icon="${i}">${i}</button>`).join('')}</div></div>
    <div class="field"><label>Project Name</label><input class="text-input" id="npName" maxlength="80" placeholder="Project Name"></div>
    <div class="chip-row" id="npCats">${cats.map(c=>`<button type="button" class="chip" data-cat="${c}">${c}</button>`).join('')}</div>
    <button type="button" class="outline-btn" id="npAdvBtn">Advanced Settings ${ic('chevron-down',12)}</button>
    <div id="npAdv" hidden>
      <div class="field"><label>Memory</label><select class="select-input" id="npMemory"><option value="default">Default</option><option value="project-only">Project only</option><option value="off">Off</option></select></div>
      <div class="field"><label>Instructions <span class="counter" id="npCount">0/1000</span></label><textarea class="textarea-input" id="npInstr" maxlength="1000" placeholder="Instructions for this project"></textarea></div>
      <div class="field"><label>Files</label><button type="button" class="outline-btn" id="npFiles">+ Add Files</button> <span id="npFileNames" class="kbd-note"></span><input type="file" id="npFileInput" multiple hidden></div>
    </div>`;
  let icon='▣', cat='', fileNames=[];
  wrap.querySelectorAll('#npIcons .chip').forEach(b=>b.addEventListener('click',()=>{ wrap.querySelectorAll('#npIcons .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); icon=b.dataset.icon; wrap.querySelector('#npIcon').textContent=icon; }));
  wrap.querySelectorAll('#npCats .chip').forEach(b=>b.addEventListener('click',()=>{ cat=cat===b.dataset.cat?'':b.dataset.cat; wrap.querySelectorAll('#npCats .chip').forEach(x=>x.classList.toggle('active',x.dataset.cat===cat)); }));
  wrap.querySelector('#npAdvBtn').addEventListener('click',()=>{ const a=wrap.querySelector('#npAdv'); a.hidden=!a.hidden; });
  wrap.querySelector('#npInstr').addEventListener('input',e=>{ wrap.querySelector('#npCount').textContent=e.target.value.length+'/1000'; });
  wrap.querySelector('#npFiles').addEventListener('click',()=>wrap.querySelector('#npFileInput').click());
  wrap.querySelector('#npFileInput').addEventListener('change',e=>{ fileNames=Array.from(e.target.files).map(f=>f.name); wrap.querySelector('#npFileNames').textContent=fileNames.join(', '); });
  const m=openModal({title:'New Project', body:wrap, wide:true, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Create project', kind:'primary', onClick:()=>{
      const name=wrap.querySelector('#npName').value.trim(); if(!name){ toast('Enter a project name'); return; }
      const p={id:uid(), name, category:cat, icon, memory:wrap.querySelector('#npMemory').value, instructions:wrap.querySelector('#npInstr').value, files:fileNames, createdAt:Date.now()};
      projects.unshift(p); saveProjects(); activeProjectId=p.id; closeModal(); renderProjects(); renderAll(); toast('Project created');
    }}
  ]});
  const nameInput=wrap.querySelector('#npName');
  const createBtn=m.actEl.querySelectorAll('button')[1]; createBtn.disabled=true; createBtn.style.opacity='.5';
  nameInput.addEventListener('input',()=>{ const on=!!nameInput.value.trim(); createBtn.disabled=!on; createBtn.style.opacity=on?'1':'.5'; });
}

/* ---------- Archived Chats modal ---------- */
function archivedModal(){
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="search-wrap" style="margin-bottom:10px"><span class="search-icon">${ic('search')}</span><input id="archSearch" type="search" placeholder="Search Chats" style="flex:1;border:0;background:transparent;outline:0"></div><div class="scroll-area" id="archList"></div>`;
  const render=()=>{ const q=wrap.querySelector('#archSearch').value.trim().toLowerCase();
    const list=wrap.querySelector('#archList'); list.innerHTML='';
    const items=sessions.filter(s=>s.archived&&(!q||s.title.toLowerCase().includes(q)));
    if(!items.length){ list.innerHTML='<div class="empty-note" style="text-align:center;padding:34px">No archived tasks</div>'; return; }
    items.forEach(s=>{ const row=document.createElement('div'); row.className='chat-row';
      row.innerHTML=`<button class="chat-open" type="button">${esc(s.title)}</button><button class="white-pill" type="button" data-a="un">Unarchive</button><button class="white-pill" type="button" data-a="del">Delete</button>`;
      row.querySelector('.chat-open').addEventListener('click',()=>{ closeModal(); openSession(s.id); });
      row.querySelector('[data-a="un"]').addEventListener('click',()=>{ s.archived=false; saveSessions(); render(); renderAll(); });
      row.querySelector('[data-a="del"]').addEventListener('click',()=>{ sessions=sessions.filter(x=>x.id!==s.id); saveSessions(); render(); renderAll(); });
      list.appendChild(row); });
  };
  wrap.querySelector('#archSearch').addEventListener('input',render);
  openModal({title:'Archived Chats', body:wrap, wide:true, actions:[{label:'Close', onClick:()=>closeModal()}]});
  render();
}

/* ---------- rich text (safe markdown-lite) ---------- */
function inlineFmt(t){
  return esc(t).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g,'$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
}
const CODE_CONTROL=new Set(('if for while switch catch return typeof instanceof new delete await yield function with sizeof').split(' '));
/* Builtins highlight like keywords in One Dark (Qwen): print/len/etc. are purple, not function-blue. */
const CODE_BUILTINS=new Set(('print len range str int float bool list dict set frozenset tuple type open input enumerate zip map filter reversed sorted sum min max abs round isinstance issubclass hasattr getattr setattr delattr repr id hash chr ord hex bin oct pow divmod iter next super Exception ValueError TypeError KeyError IndexError AttributeError RuntimeError len require console Math JSON Object Array String Number Boolean Promise Error parseInt parseFloat isNaN encodeURIComponent decodeURIComponent setTimeout setInterval fetch alert document window').split(' '));
const CODE_KEYWORDS=new Set(('const let var function return if else elif for while do switch case break continue new class extends super this self typeof instanceof in of try catch finally throw async await yield static get set import from export default delete void true false null undefined None True False and or not is lambda pass def print require include echo fn pub struct impl enum match trait interface go package func var chan map range defer select type').split(' '));
function highlightCodeLine(line,state){
  let out='',i=0; const n=line.length;
  const push=(cls,txt)=>{ out+='<span class="'+cls+'">'+esc(txt)+'</span>'; };
  while(i<n){
    if(state.block){ const e=line.indexOf('*/',i); if(e<0){ push('tok-com',line.slice(i)); i=n; } else { push('tok-com',line.slice(i,e+2)); i=e+2; state.block=false; } continue; }
    const rest=line.slice(i); let m;
    if(rest.startsWith('//')){ push('tok-com',rest); break; }
    if(rest.startsWith('/*')){ const e=line.indexOf('*/',i+2); if(e<0){ push('tok-com',rest); state.block=true; i=n; } else { push('tok-com',line.slice(i,e+2)); i=e+2; } continue; }
    if((m=rest.match(/^(['"`])(?:\\.|(?!\1)[^\\])*\1/))){ push('tok-str',m[0]); i+=m[0].length; continue; }
    if((m=rest.match(/^\d+(?:\.\d+)?\b/))){ push('tok-num',m[0]); i+=m[0].length; continue; }
    if((m=rest.match(/^[A-Za-z_$][\w$]*/))){ const w=m[0];
      const callAfter=/^\s*\(/.test(line.slice(i+w.length));
      if(CODE_CONTROL.has(w)) push('tok-kw',w);
      else if(CODE_BUILTINS.has(w)) push('tok-kw',w);
      else if(callAfter) push('tok-fn',w);
      else if(CODE_KEYWORDS.has(w)) push('tok-kw',w);
      else out+=esc(w);
      i+=w.length; continue; }
    out+=esc(line[i]); i++;
  }
  return out;
}
function codeBlockHTML(code,lang){
  const state={block:false};
  const rows=String(code).replace(/\n+$/,'').split('\n').map((ln,ix)=>{
    const body=(/^\s*#/.test(ln)&&!state.block)?'<span class="tok-com">'+esc(ln)+'</span>':highlightCodeLine(ln,state);
    return '<span class="cl"><span class="ln">'+(ix+1)+'</span><span class="lc">'+(body||' ')+'</span></span>';
  }).join('');
  const isHtml=/^(html|xml|xhtml)$/i.test(String(lang||'').trim());
  return '<div class="code-block"><div class="code-head"><span class="code-lang">'+esc(lang||'code')+'</span><span class="code-actions">'
    +'<button type="button" data-code="copy" title="Copy code">'+ic('copy')+'</button>'
    +'<button type="button" data-code="download" title="Download code">'+ic('download')+'</button>'
    +'<button type="button" data-code="collapse" title="Collapse">'+ic('chevron-up',14)+'</button></span></div>'
    +'<pre class="code-pre"><code>'+rows+'</code></pre></div>'
    +(isHtml?'<button type="button" class="code-preview-btn" data-code="preview">'+ic('eye',15)+'<span>Preview</span></button>':'');
}
function wireCodeBlocks(root){
  if(!root||!root.querySelectorAll) return;
  root.querySelectorAll('.code-block').forEach(block=>{
    if(block.dataset.wired) return; block.dataset.wired='1';
    const codeText=()=>Array.from(block.querySelectorAll('.lc')).map(x=>x.textContent).join('\n');
    const copy=block.querySelector('[data-code="copy"]'); if(copy) copy.addEventListener('click',()=>copyText(codeText()));
    const dl=block.querySelector('[data-code="download"]'); if(dl) dl.addEventListener('click',()=>{ const lang=(block.querySelector('.code-lang')||{}).textContent||'txt'; const ext=({javascript:'js',js:'js',typescript:'ts',ts:'ts',python:'py',py:'py',html:'html',css:'css',json:'json',bash:'sh',shell:'sh',java:'java',c:'c',cpp:'cpp',go:'go',rust:'rs',php:'php',ruby:'rb',sql:'sql',text:'txt',code:'txt'})[String(lang).toLowerCase()]||'txt'; download('code.'+ext, codeText(), 'text/plain'); });
    const col=block.querySelector('[data-code="collapse"]'); if(col) col.addEventListener('click',()=>{ const pre=block.querySelector('.code-pre'); pre.hidden=!pre.hidden; col.title=pre.hidden?'Expand':'Collapse'; });
    const pv=block.nextElementSibling; if(pv&&pv.dataset&&pv.dataset.code==='preview'&&!pv.dataset.wired){ pv.dataset.wired='1'; pv.addEventListener('click',()=>openWebDev(codeText())); }
  });
}
/* Qwen-style table download: export THAT table as a .csv file. */
function wireTables(root){
  if(!root||!root.querySelectorAll) return;
  root.querySelectorAll('[data-table-dl]').forEach(btn=>{
    if(btn.dataset.wired) return; btn.dataset.wired='1';
    btn.addEventListener('click',()=>{
      const wrap=btn.closest('.md-table-wrap'); const table=wrap&&wrap.querySelector('table'); if(!table) return;
      const cellText=el=>el.textContent.replace(/\s+/g,' ').trim();
      const csvEsc=v=>/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
      const rows=[];
      table.querySelectorAll('tr').forEach(tr=>{ rows.push(Array.from(tr.querySelectorAll('th,td')).map(c=>csvEsc(cellText(c))).join(',')); });
      if(!rows.length){ toast('Nothing to download'); return; }
      download('table.csv', rows.join('\n'), 'text/csv');
    });
  });
}
function richText(text){
  text=cleanAssistantText(text);
  const lines=String(text||'').split('\n'); let html='', inCode=false, codeBuf=[], codeLang='';
  /* List stack: nested + ordered lists. Each level tracks whether its last
     <li> is still open so a deeper list nests INSIDE that <li> (valid HTML). */
  const listStack=[];
  const popList=()=>{ const l=listStack.pop(); if(l.liOpen) html+='</li>'; html+='</'+l.type+'>'; };
  const closeLists=()=>{ while(listStack.length) popList(); };
  const closeListsTo=indent=>{ while(listStack.length&&listStack[listStack.length-1].indent>indent) popList(); };
  const tableCells=line=>{ let t=line.trim(); if(t.startsWith('|')) t=t.slice(1); if(t.endsWith('|')) t=t.slice(0,-1); return t.split('|').map(x=>x.trim()); };
  const isTableSep=line=>{ if(!line.includes('|')) return false; const cells=tableCells(line); return cells.length>0&&cells.every(x=>/^:?-{3,}:?$/.test(x)); };
  for(let idx=0; idx<lines.length; idx++){
    const line=lines[idx];
    if(line.trim().startsWith('```')){ if(inCode){ html+=codeBlockHTML(codeBuf.join('\n'),codeLang); codeBuf=[]; inCode=false; } else { closeLists(); inCode=true; codeLang=line.trim().slice(3).trim(); } continue; }
    if(inCode){ codeBuf.push(line); continue; }
    if(line.includes('|')&&idx+1<lines.length&&isTableSep(lines[idx+1])){
      closeLists();
      const head=tableCells(line); idx++;
      html+='<div class="md-table-wrap"><button type="button" class="table-dl" data-table-dl title="Download table as CSV" aria-label="Download table as CSV">'+ic('download',14)+'</button><table><thead><tr>'+head.map(x=>`<th>${inlineFmt(x)}</th>`).join('')+'</tr></thead><tbody>';
      while(idx+1<lines.length&&lines[idx+1].includes('|')&&lines[idx+1].trim()){ idx++; const cells=tableCells(lines[idx]); html+='<tr>'+head.map((_,ci)=>`<td>${inlineFmt(cells[ci]||'')}</td>`).join('')+'</tr>'; }
      html+='</tbody></table></div>'; continue;
    }
    if(/^\s*>/.test(line)){ closeLists(); const qlines=[];
      while(idx<lines.length&&/^\s*>/.test(lines[idx])){ qlines.push(lines[idx].replace(/^\s*>\s?/,'')); idx++; }
      idx--;
      html+='<blockquote>'+qlines.filter(q=>q.trim()).map(q=>`<p>${inlineFmt(q)}</p>`).join('')+'</blockquote>'; continue; }
    const h=line.match(/^(#{1,6})\s+(.*)/); if(h){ closeLists(); const lvl=h[1].length; html+='<h'+lvl+'>'+inlineFmt(h[2])+'</h'+lvl+'>'; continue; }
    if(/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)){ closeLists(); html+='<hr>'; continue; }
    const li=line.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
    if(li){
      const indent=li[1].replace(/\t/g,'  ').length;
      const type=/^\d/.test(li[2])?'ol':'ul';
      closeListsTo(indent);
      let top=listStack[listStack.length-1];
      if(top&&top.indent===indent&&top.type!==type){ popList(); top=listStack[listStack.length-1]; }
      if(!top||top.indent<indent){ const start=type==='ol'?parseInt(li[2],10):1; html+='<'+type+(type==='ol'&&start!==1?` start="${start}"`:'')+'>'; listStack.push({type,indent,liOpen:false}); top=listStack[listStack.length-1]; }
      if(top.liOpen) html+='</li>';
      html+='<li>'+inlineFmt(li[3]); top.liOpen=true;
      continue;
    }
    closeLists();
    if(!line.trim()){ html+=''; } else html+=`<p>${inlineFmt(line)}</p>`;
  }
  if(inCode) html+=codeBlockHTML(codeBuf.join('\n'),codeLang);
  closeLists(); return html||'<p></p>';
}

/* ---------- messages ---------- */
function scrollChat(){ const sc=$('#chatScroller'); sc.scrollTop=sc.scrollHeight; }
function renderMessages(){
  const s=currentSession();
  const has=s&&s.messages.length>0;
  $('#temporaryBanner').hidden=!(temporary&&!has);
  $('#homeView').hidden=has||temporary;
  $('#messageColumn').hidden=!has;
  /* disclaimer visibility handled after composer placement below */
  $('#currentChatMenuBtn').hidden=!has;
  document.querySelector('.app-frame').classList.toggle('temp-on',temporary);
  // composer placement: home slot (empty home), centred temp slot (desktop temp), dock otherwise
  const composer=$('#composer');
  const isMobile=window.matchMedia&&window.matchMedia('(max-width: 767px)').matches;
  if(!has&&temporary&&!isMobile) $('#tempComposerSlot').appendChild(composer);
  else if(!has&&!temporary) $('#homeComposerSlot').appendChild(composer);
  else $('#dockComposerSlot').appendChild(composer);
  /* Qwen footer: the disclaimer sits directly under the composer in the
     docked and temporary placements (it follows the composer element).
     On the plain home view it stays in the dock as before — the home
     composer block is vertically centred, and moving the line under it
     would shift the calibrated home geometry. */
  const disc=$('#disclaimer');
  if(!has&&!temporary){ disc.hidden=true; const dk=$('#dock'); if(disc.parentElement!==dk) dk.appendChild(disc); }
  else { disc.hidden=false; if(composer.parentElement&&disc.parentElement!==composer.parentElement) composer.parentElement.appendChild(disc); }
  $('#dock').style.display=(has||(temporary&&isMobile))?'':'none';
  $('#topUpgradeBtn').style.display=has?'none':'';
  /* In-chat top bar (Qwen): only model name + More — hide the Temporary Chat icon
     while a normal chat is open; it stays on home/new-chat and in Temporary Chat. */
  $('#tempChatBtn').style.display=(has&&!temporary)?'none':'';
  /* "+" tools menu: opens DOWNWARD from the centred (desktop home/temp) composer,
     upward — with max-height + scroll — from the docked/bottom-anchored composer. */
  composer.classList.toggle('menu-down', !has && !isMobile);
  const _mbc=document.querySelector('#responseModeBtn .chev'); if(_mbc) _mbc.innerHTML=ic('chevron-down',12);
  const col=$('#messageColumn'); col.innerHTML='';
  document.querySelector('.main-card').classList.toggle('share-mode',shareMode);
  if(!s) return;
  s.messages.forEach(m=>col.appendChild(messageEl(s,m)));
  if(stickBottom) scrollChat();
}
function messageEl(s,m){
  const wrap=document.createElement('div'); wrap.className='message '+m.role; wrap.dataset.mid=m.id;
  if(shareMode){ const cb=document.createElement('input'); cb.type='checkbox'; cb.className='select-box'; cb.checked=shareSel.has(m.id);
    cb.addEventListener('change',()=>{ cb.checked?shareSel.add(m.id):shareSel.delete(m.id); updateShareBar(); }); wrap.appendChild(cb); }
  if(m.role==='user'){
    if(editingMsgId===m.id){
      wrap.innerHTML=`<div class="edit-box"><textarea>${esc(m.text)}</textarea><div class="edit-actions"><button type="button" class="white-pill" data-a="cancel">Cancel</button><button type="button" class="black-pill" data-a="send">Send</button></div></div>`;
      wrap.querySelector('[data-a="cancel"]').addEventListener('click',()=>{ editingMsgId=null; renderMessages(); });
      wrap.querySelector('[data-a="send"]').addEventListener('click',()=>{ const v=wrap.querySelector('textarea').value.trim(); if(!v||streaming) return; const idx=s.messages.findIndex(x=>x.id===m.id); if(idx<0) return; m.text=v; s.messages=s.messages.slice(0,idx+1); s.updatedAt=Date.now(); if(!temporary) saveSessions(); editingMsgId=null; renderAll(); runChatStream(s,m,[]); });
      return wrap;
    }
    const bub=document.createElement('div'); bub.className='user-bubble'; bub.textContent=m.text; wrap.appendChild(bub);
    const acts=document.createElement('div'); acts.className='hover-actions';
    acts.innerHTML=`<button type="button" title="Copy" data-a="copy">${ic('copy')}</button><button type="button" title="Edit" data-a="edit">${ic('pencil')}</button><button type="button" title="Delete" data-a="del">${ic('trash-2')}</button>`;
    acts.querySelector('[data-a="copy"]').addEventListener('click',()=>copyText(m.text));
    acts.querySelector('[data-a="edit"]').addEventListener('click',()=>{ editingMsgId=m.id; renderMessages(); });
    acts.querySelector('[data-a="del"]').addEventListener('click',()=>{ s.messages=s.messages.filter(x=>x.id!==m.id); s.updatedAt=Date.now(); if(!temporary) saveSessions(); renderAll(); });
    wrap.appendChild(acts);
    (m.attachments||[]).forEach(a=>{ const c=document.createElement('div'); c.className='file-chip'; c.innerHTML=`<span>${esc(a.name)}</span>`; wrap.appendChild(c); });
    return wrap;
  }
  // assistant
  if(rowWanted(m)){
    const row=document.createElement('div'); row.className='activity-row'+(m.pending?'':' done');
    const main=document.createElement('button'); main.type='button'; main.className='activity-main';
    main.innerHTML=`<span class="bulb">${ic('lightbulb')}</span><span class="activity-label">${esc(rowLabelFor(m))}</span><span class="chev">${ic('chevron-right',12)}</span>`;
    main.addEventListener('click',()=>openDrawer(m)); row.appendChild(main);
    if(m.pending){ const sk=document.createElement('button'); sk.type='button'; sk.className='activity-skip'; sk.textContent='Skip';
      sk.addEventListener('click',()=>skipActivityStep(m)); row.appendChild(sk); }
    wrap.appendChild(row);
  }
  const content=document.createElement('div'); content.className='message-content';
  if(m.image){ const img=document.createElement('img'); img.className='generated-image'; img.src=m.image; img.alt='Generated image'; wrap.appendChild(img); }
  content.innerHTML=richText(m.text); wireCodeBlocks(content); wireTables(content); wrap.appendChild(content);
  (m.artifacts||[]).forEach(a=>{ const card=document.createElement('div'); card.className='artifact-card';
    card.innerHTML=`<span>${esc(a.filename||'file')} <small class="kbd-note">${esc(a.label||'')} ${a.size?('· '+a.size+' bytes'):''}</small></span>`;
    const b=document.createElement('button'); b.type='button'; b.className='black-pill'; b.textContent='Download';
    b.addEventListener('click',()=>{ if(a.url){ const l=document.createElement('a'); l.href=a.url; l.target='_blank'; l.click(); }
      else if(a.base64){ try{ const bin=atob(a.base64); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); download(a.filename, bytes, a.mimeType||'application/octet-stream'); }catch(e){ toast('Download failed'); } } });
    card.appendChild(b); wrap.appendChild(card); });
  if(m.pending){ const cur=document.createElement('span'); cur.className='stream-cursor'; cur.innerHTML=ic('sparkle',14); content.appendChild(cur); }
  if(!m.pending){
    const row=document.createElement('div'); row.className='action-row';
    row.innerHTML=`
      <button type="button" title="Copy" data-a="copy">${ic('copy')}</button>
      <button type="button" title="Good Response" data-a="good" class="${m.feedback==='good'?'active':''}">${ic('thumbs-up')}</button>
      <button type="button" title="Bad Response" data-a="bad" class="${m.feedback==='bad'?'active':''}">${ic('thumbs-down')}</button>
      <button type="button" title="Share" data-a="share">${ic('forward')}</button>
      <button type="button" title="Regenerate" data-a="regen">${ic('rotate-ccw')}</button>
      <button type="button" title="More" data-a="more">${ic('ellipsis')}</button>`;
    row.querySelector('[data-a="copy"]').addEventListener('click',()=>copyText(m.text));
    row.querySelector('[data-a="good"]').addEventListener('click',()=>{ m.feedback=m.feedback==='good'?null:'good'; if(!temporary) saveSessions(); renderMessages(); });
    row.querySelector('[data-a="bad"]').addEventListener('click',()=>{ m.feedback=m.feedback==='bad'?null:'bad'; if(!temporary) saveSessions(); renderMessages(); });
    row.querySelector('[data-a="share"]').addEventListener('click',()=>{ shareSel.clear(); shareSel.add(m.id); enterShareMode(); });
    row.querySelector('[data-a="regen"]').addEventListener('click',()=>regenerate(s,m));
    row.querySelector('[data-a="more"]').addEventListener('click',e=>{ e.stopPropagation(); const r=e.currentTarget.getBoundingClientRect(); showCtx(r.left-150,r.bottom+4,[
      {label:'Read aloud', icon:'volume-2', onClick:()=>speak(m.text)},
      {label:'Branch in new chat', icon:'git-branch', onClick:()=>branchChat(s,m)},
      {sep:true},
      {label:'Delete', icon:'trash-2', danger:true, onClick:()=>{ s.messages=s.messages.filter(x=>x.id!==m.id); if(!temporary) saveSessions(); renderAll(); }}
    ]); });
    if(m.versions&&m.versions.length>1){
      const pg=document.createElement('span'); pg.className='version-pager';
      pg.innerHTML=`<button type="button" data-a="vprev" title="Previous version" ${(m.vIndex||0)<=0?'disabled':''}>${ic('chevron-left')}</button><span class="vp-label">${(m.vIndex||0)+1}/${m.versions.length}</span><button type="button" data-a="vnext" title="Next version" ${(m.vIndex||0)>=m.versions.length-1?'disabled':''}>${ic('chevron-right')}</button>`;
      pg.querySelector('[data-a="vprev"]').addEventListener('click',()=>switchVersion(s,m,-1));
      pg.querySelector('[data-a="vnext"]').addEventListener('click',()=>switchVersion(s,m,1));
      row.insertBefore(pg,row.firstChild); /* spec order: paginator first, then Copy/Good/Bad/Share/Regenerate/More */
    }
    wrap.appendChild(row);
  }
  return wrap;
}
function assistantContentEl(id){ const el=document.querySelector(`.message.assistant[data-mid="${id}"] .message-content`); return el; }
function paintAssistant(s,m){ const el=assistantContentEl(m.id); if(el){ el.innerHTML=richText(cleanAssistantText(m.text)); wireCodeBlocks(el); wireTables(el); const cur=document.createElement('span'); cur.className='stream-cursor'; cur.innerHTML=ic('sparkle',14); el.appendChild(cur); if(stickBottom) scrollChat(); syncActivityRow(m); if(drawerMsgId===m.id&&!$('#activityDrawer').hidden) fillDrawer(m); }
  else renderMessages(); }
/* Qwen thinking-row semantics (2026-11-07 behavior spec):
   - Auto / Thinking: the row appears on EVERY turn, even before the backend
     emits any activity step (live label "Thinking..."). Fast: NO row, ever.
   - Steps shown come only from real backend activity events; the client
     never invents step text.
   - Skip advances the displayed step label by one step only. It never ends
     thinking, never hides the row and never jumps to the answer.
   - Completed label is exactly "Thinking completed"; a turn stopped during
     the thinking phase (no answer text received) reads "Thought stopped". */
function rowWanted(m){
  if(!m||m.role!=='assistant') return false;
  if(m.thinkMode==='Fast') return false;
  if(m.thinkMode==='Auto'||m.thinkMode==='Thinking') return true;
  if(m.thoughtStopped) return true;
  return !!(m.activity&&m.activity.length); /* legacy messages without a recorded mode */
}
function labelStepIdx(m){
  const steps=m.activity||[]; if(!steps.length) return -1;
  let run=steps.findIndex(a=>a.state==='running'); if(run<0) run=steps.length-1;
  if(m.skipIdx!=null) return Math.max(Math.min(m.skipIdx,steps.length-1), run);
  return run;
}
function rowLabelFor(m){
  if(m.thoughtStopped&&!m.pending) return 'Thought stopped';
  if(!m.pending) return 'Thinking completed';
  const steps=m.activity||[]; if(!steps.length) return 'Thinking...';
  const st=steps[labelStepIdx(m)]||steps[steps.length-1];
  return (st&&(st.label||st.kind))||'Thinking...';
}
function skipActivityStep(m){
  const steps=m.activity||[]; if(!steps.length) return;
  m.skipIdx=Math.min(labelStepIdx(m)+1, steps.length-1);
  syncActivityRow(m);
}
function searchRanIn(m){
  return (m.activity||[]).some(a=>/search|web/i.test(String((a&&a.kind)||'')+' '+String((a&&a.label)||'')));
}
/* Keep the Qwen activity row in sync while streaming: it appears at the
   start of the turn (Auto/Thinking), its label follows the running step,
   and Skip only advances the displayed step label. */
function syncActivityRow(m){
  const wrap=document.querySelector(`.message.assistant[data-mid="${m.id}"]`); if(!wrap) return;
  const row=wrap.querySelector('.activity-row');
  if(!rowWanted(m)){ if(row) row.remove(); return; }
  if(!row){ renderMessages(); return; }
  const lab=row.querySelector('.activity-label'); if(!lab) return;
  lab.textContent=rowLabelFor(m);
}
function branchChat(s,m){
  const idx=s.messages.findIndex(x=>x.id===m.id);
  const c={id:uid(), title:s.title+' (branch)', createdAt:Date.now(), updatedAt:Date.now(), pinned:false, archived:false, titleRequested:true, messages:JSON.parse(JSON.stringify(s.messages.slice(0,idx+1)))};
  if(s.projectId) c.projectId=s.projectId;
  sessions.unshift(c); saveSessions(); openSession(c.id); toast('Branched in new chat');
}
function copyText(t){
  const done=()=>toast('Copied');
  if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t,done)); }
  else fallbackCopy(t,done);
}
function fallbackCopy(t,done){ try{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); done&&done(); }catch(e){ toast('Copy is not available here'); } }

/* ---------- share selection mode ---------- */
function enterShareMode(){ shareMode=true; $('#shareBar').hidden=false; renderMessages(); updateShareBar(); }
function exitShareMode(){ if(!shareMode) return; shareMode=false; shareSel.clear(); $('#shareBar').hidden=true; renderMessages(); }
function updateShareBar(){ $('#shareCount').textContent=shareSel.size+' selected'; $('#shareSelectAll').checked=shareSel.size>0&&currentSession()&&shareSel.size===currentSession().messages.length; }

/* ---------- activity steps (Qwen timeline; bottom sheet on mobile, drawer on desktop) ---------- */
let drawerMsgId=null;
function openDrawer(m){
  drawerMsgId=m.id; fillDrawer(m);
  $('#activityDrawer').hidden=false;
  const sc=$('#drawerScrim'); if(sc) sc.hidden=false;
}
function closeDrawer(){
  $('#activityDrawer').hidden=true;
  const sc=$('#drawerScrim'); if(sc) sc.hidden=true;
  drawerMsgId=null;
}
/* ---------- Web Dev panel (Qwen: HTML code blocks get a Preview button) ----------
   Side panel on desktop, full-screen sheet on mobile (CSS). Deploy is shown
   DISABLED — there is no deploy endpoint in the /api/chat contract. */
let webdevCodeText='';
function openWebDev(code){
  webdevCodeText=String(code||'');
  const p=$('#webdevPanel'); if(!p) return;
  p.hidden=false; const sc=$('#webdevScrim'); if(sc) sc.hidden=false;
  setWebDevTab('preview'); setWebDevDevice('desktop'); paintWebDevCode(); refreshWebDev();
}
function closeWebDev(){ const p=$('#webdevPanel'); if(p) p.hidden=true; const sc=$('#webdevScrim'); if(sc) sc.hidden=true; }
function refreshWebDev(){ const f=$('#webdevFrame'); if(f) f.srcdoc=webdevCodeText; }
function paintWebDevCode(){
  const c=$('#webdevCode'); if(!c) return;
  const state={block:false};
  c.innerHTML=String(webdevCodeText).replace(/\n+$/,'').split('\n').map((ln,ix)=>'<span class="cl"><span class="ln">'+(ix+1)+'</span><span class="lc">'+(highlightCodeLine(ln,state)||' ')+'</span></span>').join('');
}
function setWebDevTab(t){
  $$('#webdevPanel .wd-tab').forEach(b=>b.classList.toggle('active',b.dataset.wdTab===t));
  const pw=$('#webdevPreviewWrap'); if(pw) pw.hidden=t!=='preview';
  const cw=$('#webdevCodeWrap'); if(cw) cw.hidden=t!=='code';
  const foot=$('#webdevFoot'); if(foot) foot.style.visibility=t==='preview'?'':'hidden';
}
function setWebDevDevice(dev){
  const pw=$('#webdevPreviewWrap'); if(pw) pw.classList.toggle('mobile',dev==='mobile');
  const bd=$('#webdevDesktop'), bm=$('#webdevMobile');
  if(bd) bd.classList.toggle('active',dev==='desktop');
  if(bm) bm.classList.toggle('active',dev==='mobile');
}
function webdevFullscreen(){
  const p=$('#webdevPanel');
  try{
    if(document.fullscreenElement){ document.exitFullscreen(); return; }
    if(p&&p.requestFullscreen){ p.requestFullscreen(); return; }
  }catch(e){}
  toast('Fullscreen is not available here');
}

/* Steps come straight from the /api/chat activity stream: label = step title,
   detail (only when the backend sent one) = the grey description. Completed
   steps get the check; the running step pulses; a finished reply closes the
   timeline with the lightbulb "Thinking completed" row, like Qwen. */
function fillDrawer(m){
  const d=$('#activityDrawer'); d.querySelector('h2').textContent='Thinking and Search';
  const list=$('#activityList'); list.innerHTML='';
  (m.activity||[]).forEach(a=>{ const st=a.state||'completed'; const it=document.createElement('div'); it.className='activity-item '+st;
    const icHtml=st==='completed'?`<span class="step-check">${ic('check',11)}</span>`:st==='error'?ic('circle-x',18):'<span class="step-dot"></span>';
    it.innerHTML=`<span class="step-ic">${icHtml}</span><div class="step-copy"><div class="step-title">${esc(a.label||a.kind||'Activity')}</div>${a.detail?`<small class="step-desc">${esc(a.detail)}</small>`:''}</div>`;
    list.appendChild(it); });
  if(!m.pending&&rowWanted(m)){ const f=document.createElement('div'); f.className='activity-item final';
    const fin=m.thoughtStopped?'Thought stopped':(searchRanIn(m)?'Thinking and Searching Completed':'Thinking completed');
    f.innerHTML=`<span class="step-ic">${ic('lightbulb',16)}</span><div class="step-copy"><div class="step-title">${fin}</div></div>`; list.appendChild(f); }
  if(!list.children.length) list.innerHTML='<p class="kbd-note">No activity recorded for this reply.</p>';
}

/* ---------- reply versions (Qwen pager: < n/n >) ---------- */
function snapshotOf(m){ return { text:m.text||'', activity:JSON.parse(JSON.stringify(m.activity||[])), artifacts:m.artifacts?JSON.parse(JSON.stringify(m.artifacts)):undefined, image:m.image||undefined, thinkMode:m.thinkMode, thoughtStopped:!!m.thoughtStopped }; }
function applyVersion(m,v){ m.text=v.text||''; m.activity=JSON.parse(JSON.stringify(v.activity||[])); if(v.artifacts) m.artifacts=JSON.parse(JSON.stringify(v.artifacts)); else delete m.artifacts; if(v.image) m.image=v.image; else delete m.image; if(v.thinkMode) m.thinkMode=v.thinkMode; m.thoughtStopped=!!v.thoughtStopped; delete m.skipIdx; delete m.skipActivity; }
function switchVersion(s,m,dir){
  if(!m.versions||streaming) return;
  const cur=m.vIndex||0, n=cur+dir; if(n<0||n>=m.versions.length) return;
  m.versions[cur]=snapshotOf(m); m.vIndex=n; applyVersion(m,m.versions[n]);
  if(!temporary) saveSessions(); renderMessages();
}

/* ---------- chat request / streaming ---------- */
const EFFORT={Fast:'Instant', Auto:'Medium', Thinking:'High'};
const TOOL_PRESETS={
  'agent':{instruction:'Work as an agent: break the task into clear steps, use available tools and sources as needed, and carry it through to a completed result.'},
  'research':{instruction:'Research this using web sources and cite what you use.', web:true},
  'deep-research':{instruction:'Do deep research: compare multiple sources, note disagreements, and structure a thorough report.', web:true},
  'report':{instruction:'Write a polished, well-structured report on this.'},
  'code':{instruction:'Answer as an expert coding assistant with complete, working code.', mode:'coder'},
  'ppt':{instruction:'Create a presentation: produce slide-by-slide content with titles and bullet points, formatted as a downloadable PPT-style document if possible.'},
  'slides':{instruction:'Create slide-by-slide content with titles and concise bullets.'},
  'artifacts':{instruction:'Produce the requested result as a complete downloadable file.'},
  'learn':{instruction:'Teach this step by step with examples and a short check-for-understanding at the end.'},
  'travel':{instruction:'Act as a travel planner: build a practical day-by-day plan with logistics and budget notes.', web:true}
};
function buildPersonalization(){
  const p=settings.personalization, a=settings.advanced, en=settings.advancedEnabled!==false;
  let custom=p.custom||'';
  if(p.refMemory&&p.savedMemory) custom+=(custom?'\n':'')+'Saved memory: '+p.savedMemory;
  const proj=activeProjectId?projects.find(x=>x.id===activeProjectId):null;
  if(proj&&proj.instructions) custom+=(custom?'\n':'')+'Project instructions: '+proj.instructions;
  const rl=settings.responseLang||{code:'auto', label:'Auto'};
  return { nickname:p.nickname, moreAbout:p.about, customInstructions:p.enableNew?custom:'', baseStyle:p.style,
    responseLanguage: rl.code && rl.code!=='auto' ? rl.label : '',
    responseLanguageCode: rl.code && rl.code!=='auto' ? rl.code : '',
    advancedWebScraping:en&&a.webScraping, advancedImageSearch:en&&a.imageSearch, advancedWebSearch:en&&a.webSearchAdv,
    advancedImageGeneration:en&&a.imageGeneration, advancedCodeInterpreter:en&&a.codeInterpreter, advancedRetrieveMemory:en&&a.retrieveMemory,
    advancedImageEditing:en&&a.imageEditing, advancedUpdateMemory:en&&a.updateMemory, advancedLocalEnlarge:en&&a.localEnlarge };
}
function historyFor(s, uptoId){
  if(!settings.personalization.refHistory) return [];
  const msgs=uptoId? s.messages.slice(0, s.messages.findIndex(m=>m.id===uptoId)) : s.messages;
  return msgs.filter(m=>!m.pending).map(m=>({role:m.role==='assistant'?'bot':'user', text:m.text}));
}
async function sendCurrent(presetText){
  const input=$('#composerInput'); const text=(presetText!==undefined?presetText:input.value).trim();
  if(streaming) return;
  if(activeTool==='video'){ openModal({title:'Create Video', body:'<p>There is no video-generation endpoint in the /api/chat backend contract, so a video cannot be generated from this frontend yet.</p>', actions:[{label:'OK', kind:'primary', onClick:()=>closeModal()}]}); return; }
  if(!text&&!attachments.length) return;
  const s=ensureSession(text);
  const userMsg={id:uid(), role:'user', text, createdAt:Date.now(), attachments:attachments.map(a=>({name:a.name, kind:a.kind}))};
  const filePayload=attachments.slice();
  s.messages.push(userMsg); s.updatedAt=Date.now(); if(!temporary) saveSessions();
  attachments=[]; renderAttachments();
  if(presetText===undefined){ input.value=''; autosize(); updateSend(); }
  activeToolConsumed();
  renderAll();
  if(activeToolLast==='image'){ await runImageGeneration(s,userMsg); return; }
  await runChatStream(s,userMsg,filePayload);
}
let activeToolLast=null;
function activeToolConsumed(){ activeToolLast=activeTool; if(activeTool&&activeTool!=='image') { /* keep tool until changed */ } }
function setStreaming(on){ streaming=on; $('#stopBtn').hidden=!on; $('#sendBtn').hidden=on; }
async function runChatStream(s,userMsg,filePayload){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true, thinkMode:settings.responseMode};
  s.messages.push(asst); renderMessages();
  await streamInto(s,userMsg,asst,filePayload);
}
/* Streams one generation into an existing assistant message (fresh reply or a
   Regenerate version). On completion the message's current version snapshot
   is refreshed so the version pager always shows what was generated. */
async function streamInto(s,userMsg,asst,filePayload){
  setStreaming(true); aborter=('AbortController' in window)?new AbortController():null;
  asst.thinkMode=settings.responseMode; asst.thoughtStopped=false; asst.textReceived=false; delete asst.skipIdx;
  const preset=TOOL_PRESETS[activeToolLast]||{};
  const web=!!(settings.webSearch||preset.web||activeToolLast==='research'||activeToolLast==='deep-research')&&settings.advancedEnabled!==false&&settings.advanced.webSearchAdv;
  const body={ message:userMsg.text, history:historyFor(s,userMsg.id), files:filePayload||[],
    provider:settings.provider, model:settings.model, mode:preset.mode||'general',
    customPrompt:preset.instruction||'', webSearch:web, forceWebSearch:!!preset.web,
    autoFallback:true, smartRouter:false, activityStream:true, autoTools:settings.toolsEnabled,
    clientTimeZone:(Intl&&Intl.DateTimeFormat&&Intl.DateTimeFormat().resolvedOptions().timeZone)||'Asia/Manila',
    clientUtcOffsetMinutes:-new Date().getTimezoneOffset(),
    personalization:Object.assign(buildPersonalization(),{intelligence:EFFORT[settings.responseMode]||'Medium', fastAnswers:settings.responseMode==='Fast', advancedWebSearch:web}) };
  if(settings.provider==='bailucode'&&settings.bailuRoute) body.bailuRoute=settings.bailuRoute;
  trackRequest();
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body), signal:aborter?aborter.signal:undefined});
    if(!res.ok) throw new Error('Request failed ('+res.status+')');
    const ct=(res.headers&&res.headers.get&&res.headers.get('content-type'))||'';
    if(res.body&&res.body.getReader&&ct.includes('text/event-stream')){
      await readSSE(res.body.getReader(), s, asst);
    } else {
      const raw=await res.text();
      let data=null; try{ data=JSON.parse(raw); }catch(e){}
      asst.text=(data&&typeof data==='object'?(data.text||data.reply||data.message||data.content||''):raw)||'';
      if(asst.text) asst.textReceived=true;
    }
  }catch(err){
    if(err&&err.name==='AbortError'){
      /* Stopped during the thinking phase (no answer text received yet):
         the turn ends empty with the row reading "Thought stopped".
         Stopped mid-answer: the partial text stays with a Stopped note. */
      if(!asst.textReceived&&!asst.text){ asst.thoughtStopped=true; asst.text=''; }
      else asst.text+=(asst.text?'\n\n':'')+'_Stopped._';
    }
    else { asst.text=(asst.text?asst.text+'\n\n':'')+'⚠ '+(err&&err.message?err.message:'Something went wrong.'); asst.activity.push({label:'Request failed', state:'error', detail:String(err&&err.message||err), at:Date.now()}); }
  }finally{
    asst.text=cleanAssistantText(asst.text);
    asst.pending=false;
    if(asst.versions&&asst.versions.length) asst.versions[asst.vIndex||0]=snapshotOf(asst);
    s.updatedAt=Date.now(); if(!temporary) saveSessions();
    setStreaming(false); renderAll();
    if(drawerMsgId===asst.id&&!$('#activityDrawer').hidden) fillDrawer(asst);
    if(settings.voice.voiceMode&&asst.text) speak(asst.text);
    if(settings.interface.autoCopy&&asst.text) copyText(asst.text);
    /* Qwen-style AI title: after the FIRST exchange of a new chat, one silent
       background request replaces the truncated-prompt title. Never blocks the UI. */
    if(!temporary&&s.titleAutoPending&&!s.titleRequested&&s.messages.length===2&&s.messages[0].role==='user'&&asst.text&&!asst.activity.some(a=>a.state==='error')&&getSession(s.id)===s){
      const sid=s.id; setTimeout(()=>{ generateTitle(sid).catch(()=>{}); },3000);
    }
  }
}
/* One title request per chat, ever (titleRequested persists). Silent fallback:
   any failure keeps the default truncation title. */
async function generateTitle(sessionId){
  const s=getSession(sessionId);
  if(!s||s.titleRequested||!s.titleAutoPending||s.messages.length<2) return;
  if(!settings.interface.titleAuto) return; /* live gate: switch turned off after the chat was created */
  if(streaming){ setTimeout(()=>{ generateTitle(sessionId).catch(()=>{}); },2000); return; }
  s.titleRequested=true; saveSessions();
  const fast=MODELS.find(m=>m.id==='bailu-2.8')||MODELS[0];
  const u=s.messages.find(m=>m.role==='user'), a=s.messages.find(m=>m.role==='assistant');
  if(!u||!a) return;
  const prompt='Write a 3-6 word Title Case title for this conversation. Reply with only the title, no quotes, no punctuation at the end.\n\nUser: '+String(u.text||'').slice(0,500)+'\nAssistant: '+String(a.text||'').slice(0,500);
  let text='';
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ message:prompt, history:[], files:[], provider:fast.provider, model:fast.id, mode:'general', customPrompt:'You generate short chat titles. Reply with only the title.', webSearch:false, forceWebSearch:false, autoFallback:false, smartRouter:false, activityStream:false, autoTools:false, personalization:{intelligence:'Instant', fastAnswers:true} })});
    if(!res.ok) return;
    const ct=(res.headers&&res.headers.get&&res.headers.get('content-type'))||'';
    if(res.body&&res.body.getReader&&ct.includes('text/event-stream')){
      const reader=res.body.getReader(); const decoder=('TextDecoder' in window)?new TextDecoder():null; let buf='';
      const drain=block=>{ block.split('\n').forEach(line=>{ if(line.startsWith('data:')){ try{ const o=JSON.parse(line.slice(5).trim()); if(o&&typeof o.text==='string') text+=o.text; }catch(e){} } }); };
      for(;;){ const {done,value}=await reader.read(); if(done) break; buf+=decoder?decoder.decode(value,{stream:true}):String(value);
        let idx; while((idx=buf.indexOf('\n\n'))>=0){ const block=buf.slice(0,idx); buf=buf.slice(idx+2); drain(block); } }
      if(buf.trim()) drain(buf);
    } else {
      const raw=await res.text(); let data=null; try{ data=JSON.parse(raw); }catch(e){}
      text=(data&&typeof data==='object'?(data.text||data.reply||data.message||data.content||''):raw)||'';
    }
  }catch(e){ return; }
  let title=cleanAssistantText(text).split('\n').map(x=>x.trim()).find(x=>x)||'';
  title=title.replace(/^title\s*:\s*/i,'').replace(/^["'`]+|["'`]+$/g,'').replace(/\s+/g,' ').trim();
  if(title.split(' ').length>8) title=title.split(' ').slice(0,8).join(' ');
  if(title.length>60) title=title.slice(0,60).trim();
  if(!title||title.includes('[[JD_')||title.startsWith('⚠')) return;
  const cur=getSession(sessionId);
  if(!cur||!cur.titleAutoPending) return; /* user renamed meanwhile — keep theirs */
  cur.title=title; cur.titleAutoPending=false; saveSessions(); renderHistory(); renderSearch();
}
async function readSSE(reader,s,asst){
  const decoder=('TextDecoder' in window)?new TextDecoder():null;
  let buf='';
  const handleBlock=block=>{
    let ev='message', data='';
    block.split('\n').forEach(line=>{ if(line.startsWith(':')) return; if(line.startsWith('event:')) ev=line.slice(6).trim(); else if(line.startsWith('data:')) data+=line.slice(5).trim(); });
    if(!data) return; let obj=null; try{ obj=JSON.parse(data); }catch(e){}
    if(ev==='text'&&obj&&typeof obj.text==='string'){ asst.text+=obj.text; if(obj.text) asst.textReceived=true; paintAssistant(s,asst); }
    else if(ev==='activity'&&obj){ const ex=asst.activity.find(a=>a.id&&obj.id&&a.id===obj.id); if(ex) Object.assign(ex,obj); else asst.activity.push(obj); paintAssistant(s,asst); }
    else if(ev==='artifact'&&obj){ asst.artifacts=asst.artifacts||[]; asst.artifacts.push(obj); }
    else if(ev==='error'&&obj){ throw new Error(obj.message||'Stream error'); }
  };
  for(;;){
    const {done,value}=await reader.read(); if(done) break;
    buf+=decoder?decoder.decode(value,{stream:true}):String(value);
    let idx; while((idx=buf.indexOf('\n\n'))>=0){ const block=buf.slice(0,idx); buf=buf.slice(idx+2); if(block.trim()) handleBlock(block); }
  }
  if(buf.trim()) handleBlock(buf);
}
async function runImageGeneration(s,userMsg){
  const asst={id:uid(), role:'assistant', text:'', createdAt:Date.now(), activity:[], pending:true};
  s.messages.push(asst); renderMessages(); setStreaming(true);
  trackRequest();
  try{
    const res=await fetch('/api/chat',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'generate-image', prompt:userMsg.text, model:'auto'})});
    const data=await res.json().catch(()=>({}));
    if(data&&data.imageDataUrl){ asst.image=data.imageDataUrl; asst.text='Here is your image.'; }
    else throw new Error((data&&(data.error||data.detail))||'Image generation failed');
  }catch(err){ asst.text='⚠ '+(err&&err.message?err.message:'Image generation failed.'); }
  asst.pending=false; s.updatedAt=Date.now(); if(!temporary) saveSessions(); setStreaming(false); renderAll();
}
function regenerate(s,m){
  if(streaming) return;
  const idx=s.messages.findIndex(x=>x.id===m.id); if(idx<0) return;
  const userMsg=[...s.messages.slice(0,idx)].reverse().find(x=>x.role==='user'); if(!userMsg) return;
  /* Qwen keeps the previous reply as a version instead of discarding it. */
  if(!m.versions){ m.versions=[snapshotOf(m)]; m.vIndex=0; }
  else m.versions[m.vIndex||0]=snapshotOf(m);
  m.versions.push({text:'', activity:[]}); m.vIndex=m.versions.length-1;
  applyVersion(m,m.versions[m.vIndex]); m.pending=true; m.feedback=null;
  if(!temporary) saveSessions(); renderAll();
  streamInto(s,userMsg,m,[]);
}

/* ---------- attachments ---------- */
function renderAttachments(){
  const box=$('#attachmentChips'); box.innerHTML=''; box.hidden=!attachments.length;
  attachments.forEach((a,i)=>{ const c=document.createElement('span'); c.className='file-chip'; c.innerHTML=`<span>${esc(a.name)}</span>`;
    const b=document.createElement('button'); b.type='button'; b.textContent='×'; b.setAttribute('aria-label','Remove attachment');
    b.addEventListener('click',()=>{ attachments.splice(i,1); renderAttachments(); updateSend(); }); c.appendChild(b); box.appendChild(c); });
}
function readFileAs(file){
  return new Promise(resolve=>{
    const kind=(file.type.split('/')[0]||'file');
    const base={name:file.name, mimeType:file.type||'application/octet-stream', kind:file.type||kind, size:file.size};
    const reader=new FileReader();
    if(file.type.startsWith('image/')){ reader.onload=()=>resolve(Object.assign(base,{data:reader.result})); reader.onerror=()=>resolve(base); reader.readAsDataURL(file); }
    else if(file.type.startsWith('text/')||/\.(txt|md|json|csv|js|html|css)$/i.test(file.name)){ reader.onload=()=>resolve(Object.assign(base,{extractedText:String(reader.result).slice(0,200000)})); reader.onerror=()=>resolve(base); reader.readAsText(file); }
    else resolve(base);
  });
}
async function addFiles(fileList){ for(const f of Array.from(fileList||[])){ attachments.push(await readFileAs(f)); } renderAttachments(); updateSend(); }

/* ---------- voice ---------- */
function speak(text){
  try{
    if(!('speechSynthesis' in window)){ toast('Speech is not available in this browser'); return; }
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(String(text).replace(/[#*_`>]/g,'').slice(0,1200));
    const v=speechSynthesis.getVoices().find(x=>x.voiceURI===settings.voice.voiceURI); if(v) u.voice=v;
    if(settings.voice.lang) u.lang=settings.voice.lang; else if(v) u.lang=v.lang;
    u.rate=settings.voice.rate||1; u.pitch=settings.voice.pitch||1; speechSynthesis.speak(u);
  }catch(e){ toast('Speech is not available in this browser'); }
}
let recog=null;
function micUi(on){ const b=$('#micBtn'); if(b){ b.classList.toggle('listening',!!on); b.setAttribute('aria-pressed',String(!!on)); } }
function toggleMic(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ toast('Voice input is not available in this browser'); return; }
  if(recog){ try{ recog.stop(); }catch(e){} recog=null; micUi(false); return; }
  recog=new SR(); recog.lang='en-US'; recog.interimResults=true;
  recog.onresult=e=>{ let t=''; for(const r of e.results) t+=r[0].transcript; const inp=$('#composerInput'); inp.value=t; autosize(); updateSend(); };
  recog.onerror=e=>{ if(e&&(e.error==='not-allowed'||e.error==='service-not-allowed')) toast('Permission denied when accessing microphone'); recog=null; micUi(false); };
  recog.onend=()=>{ recog=null; micUi(false); };
  try{ recog.start(); micUi(true); toast('Listening…'); }catch(e){ recog=null; micUi(false); }
}

/* ---------- model picker ---------- */
function renderModelPanel(){
  const list=$('#modelList');
  const cur=modelEntry(); $('#selectedModelName').textContent=cur.name;
  const filtered=MODELS;
  const shown=modelsExpanded?filtered:filtered.slice(0,3);
  list.innerHTML=''; let lastProv='';
  shown.forEach(m=>{ if(m.provider!==lastProv){ const g=document.createElement('div'); g.className='model-group'; g.textContent=PROVIDER_NAMES[m.provider]||m.provider; list.appendChild(g); lastProv=m.provider; }
    const b=document.createElement('button'); b.type='button'; b.className='model-option'+(m.provider===settings.provider&&m.id===settings.model?' selected':'');
    b.innerHTML=`<span class="model-copy"><strong>${esc(m.name)}</strong><small>${esc(m.desc)}</small></span><span class="model-check">${ic('check',11)}</span>`;
    b.addEventListener('click',()=>{ settings.provider=m.provider; settings.model=m.id; if(m.provider!=='bailucode') settings.bailuRoute=''; saveSettings(); renderModelPanel(); $('#modelPanel').hidden=true; toast('Model: '+m.name); });
    list.appendChild(b); });
  if(!shown.length) list.innerHTML='<div class="empty-note">No models match</div>';
  $('#expandModelsBtn').style.display=(!modelsExpanded&&filtered.length>3)?'':'none';
  const cmp=$('#modelCompareToggle'); cmp.setAttribute('aria-checked','false'); cmp.disabled=true;
  // Bailu route row (real contract field) when a Bailu model is selected
  if(settings.provider==='bailucode'){
    const row=document.createElement('div'); row.className='field'; row.innerHTML='<label>Bailu route</label>';
    const sel=document.createElement('select'); sel.className='select-input';
    [['','Auto route'],['normal','Normal'],['anthropic','Anthropic']].forEach(([v,l])=>{ const o=document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); });
    sel.value=settings.bailuRoute||''; sel.addEventListener('change',()=>{ settings.bailuRoute=sel.value; saveSettings(); });
    row.appendChild(sel); list.appendChild(row);
  }
}

/* ---------- settings page (Qwen structure: grouped list -> dedicated pages) ---------- */
const PAGE_TITLES={profile:'Profile', account:'Account', upgrade:'Upgrade Plan', usage:'Credits Usage', language:'Language', theme:'Theme', personalization:'Personalization', voice:'Voice', interface:'Interface', model:'Model', terms:'Terms of Service', privacy:'Privacy Policy', cookie:'Cookie Notice', cookies:'Manage Cookies', about:'About', contact:'Contact Us'};
let usageTab='usage', voiceTab='all', langDropOpen=false;
function el(tag, cls, text){ const e=document.createElement(tag); if(cls) e.className=cls; if(text!==undefined&&text!==null) e.textContent=text; return e; }
function h2(t){ return el('h2',null,t); }
function rowEl(title, desc, control){
  const r=el('div','setting-row');
  const copy=el('div','copy'); copy.appendChild(el('strong',null,title));
  if(desc) copy.appendChild(el('p',null,desc));
  r.appendChild(copy); if(control) r.appendChild(control); return r;
}
function switchEl(on, onChange, label, cls){
  const b=el('button','switch'+(cls?' '+cls:'')+(on?' on':'')); b.type='button'; b.setAttribute('role','switch'); b.setAttribute('aria-checked',on?'true':'false'); if(label) b.setAttribute('aria-label',label);
  b.innerHTML='<span class="knob"></span>';
  b.addEventListener('click',()=>{ const now=!b.classList.contains('on'); b.classList.toggle('on',now); b.setAttribute('aria-checked',now?'true':'false'); onChange(now); });
  return b;
}
function groupLabel(t){ return el('div','set-group-label',t); }
function setCard(rows){ const card=el('div','set-card'); (rows||[]).forEach(r=>card.appendChild(r)); return card; }
function cardRow(title, desc, control){ const r=rowEl(title, desc, control); r.classList.add('card-row'); return r; }
function navRow(o){
  const b=el('button','set-row'+(o.danger?' danger':'')); b.type='button';
  if(o.page) b.dataset.page=o.page;
  if(o.active) b.classList.add('active');
  if(o.icon){ const s=el('span','set-ic'); s.innerHTML=ic(o.icon,20); b.appendChild(s); }
  b.appendChild(el('span','set-lbl',o.label));
  if(o.value) b.appendChild(el('span','set-val',o.value));
  if(o.chevron!==false){ const ch=el('span','set-chev'); ch.innerHTML=ic('chevron-right',18); b.appendChild(ch); }
  b.addEventListener('click',o.onClick);
  return b;
}
function pickRow(label, sub, selected, onClick, dataAttrs){
  const b=el('button','pick-row'); b.type='button';
  const main=el('span','pick-main'); main.appendChild(document.createTextNode(label));
  if(sub) main.appendChild(el('span','pick-sub',sub));
  b.appendChild(main);
  if(selected){ const c=el('span','pick-check'); c.innerHTML=ic('check',13); b.appendChild(c); b.classList.add('selected'); }
  if(dataAttrs) Object.keys(dataAttrs).forEach(k=>{ b.dataset[k]=dataAttrs[k]; });
  b.addEventListener('click',onClick);
  return b;
}
function mutedNote(text){ const p=el('p',null,text); p.style.cssText='color:var(--muted);font-size:13.5px;line-height:1.55;margin:12px 2px 0'; return p; }
function paintAvatarInto(node){
  node.innerHTML='';
  if(settings.profilePhoto){ const img=document.createElement('img'); img.src=settings.profilePhoto; img.alt=''; node.appendChild(img); }
  else node.textContent=(settings.profileName||'J').trim().charAt(0).toUpperCase()||'J';
}
function paintAvatars(){ const pa=$('#profileAvatar'); if(pa) paintAvatarInto(pa); }

/* ----- navigation state: settingsStack drives mobile list<->page and sub-pages ----- */
function isMobileLayout(){ return window.innerWidth<=767; }
function openSettings(page){
  if(page==='Usage & Billing') page='usage';
  if(page && PAGE_TITLES[page]){ settingsPageKey=page; settingsStack.length=0; settingsStack.push(page); }
  $('#settingsPage').hidden=false;
  renderSettings();
}
function openSettingsPage(key){ settingsPageKey=key; settingsStack.length=0; settingsStack.push(key); $('#settingsPage').hidden=false; renderSettings(); }
function openUpgrade(){ openSettingsPage('upgrade'); }
function closeSettings(){ $('#settingsPage').hidden=true; $('#settingsPage').classList.remove('section-open'); }
function enterPage(key){ settingsPageKey=key; settingsStack.length=0; settingsStack.push(key); renderSettings(); }
function gotoPage(key){ settingsPageKey=key; settingsStack.push(key); renderSettings(); }
function settingsGoBack(){
  if(settingsStack.length>1){ settingsStack.pop(); settingsPageKey=settingsStack[settingsStack.length-1]; renderSettings(); return; }
  if(isMobileLayout() && $('#settingsPage').classList.contains('section-open')){ settingsStack.length=0; renderSettings(); return; }
  closeSettings();
}
let lastSettingsPage='';
function renderSettings(){
  const nav=$('#settingsNav'), c=$('#settingsContent'); if(!nav||!c) return;
  const page=$('#settingsPage'), mobile=isMobileLayout();
  page.classList.toggle('section-open', mobile && settingsStack.length>0);
  const onUpgrade=settingsPageKey==='upgrade' && (!mobile || settingsStack.length>0);
  $('#settingsTitle').textContent=onUpgrade?'':((mobile && settingsStack.length===0)?'Settings':(PAGE_TITLES[settingsPageKey]||'Settings'));
  const bk=$('#settingsBack'); if(bk) bk.style.visibility=onUpgrade?'hidden':'';
  $('#settingsClose').hidden=!onUpgrade;
  renderSettingsList(nav, mobile);
  c.innerHTML=''; (PAGE_RENDER[settingsPageKey]||pageProfile)(c);
  const wrap=c.closest('.settings-content-wrap'); if(wrap && settingsPageKey!==lastSettingsPage) wrap.scrollTop=0;
  lastSettingsPage=settingsPageKey;
}
function renderSettingsList(nav, mobile){
  nav.innerHTML='';
  const row=(o)=>navRow(Object.assign({}, o, {active:(!mobile && settingsPageKey===o.page)}));
  /* (1) Profile card */
  const pc=setCard([]);
  const pb=el('button','set-profile'); pb.type='button'; pb.dataset.page='profile';
  const av=el('span','set-avatar'); paintAvatarInto(av); pb.appendChild(av);
  const nmWrap=el('div'); nmWrap.style.minWidth='0';
  nmWrap.appendChild(el('div','nm',settings.profileName||'Jepong'));
  nmWrap.appendChild(el('div','sub','Edit Profile'));
  pb.appendChild(nmWrap);
  const pch=el('span','set-chev'); pch.innerHTML=ic('chevron-right',18); pb.appendChild(pch);
  pb.addEventListener('click',()=>enterPage('profile'));
  pc.appendChild(pb); nav.appendChild(pc);
  /* (2) Account */
  nav.appendChild(setCard([
    row({icon:'user', label:'Account', value:settings.profileEmail||'', page:'account', onClick:()=>enterPage('account')})
  ]));
  /* (3) Upgrade + Usage */
  nav.appendChild(setCard([
    row({icon:'sparkles', label:'Upgrade Plan', value:'Free', page:'upgrade', onClick:()=>enterPage('upgrade')}),
    row({icon:'usage', label:'Usage & Billing', page:'usage', onClick:()=>enterPage('usage')})
  ]));
  /* (4) Language / Theme / Personalization / Voice */
  nav.appendChild(setCard([
    row({icon:'globe', label:'Language', value:settings.responseLang.label||'Auto', page:'language', onClick:()=>enterPage('language')}),
    row({icon:'sun', label:'Theme', value:resolvedTheme().charAt(0).toUpperCase()+resolvedTheme().slice(1), page:'theme', onClick:()=>enterPage('theme')}),
    row({icon:'layout-grid', label:'Personalization', page:'personalization', onClick:()=>enterPage('personalization')}),
    row({icon:'audio-lines', label:'Voice', value:settings.voice.name||'', page:'voice', onClick:()=>enterPage('voice')})
  ]));
  /* (5) Interface / Model / legal / About */
  nav.appendChild(setCard([
    row({icon:'monitor', label:'Interface', page:'interface', onClick:()=>enterPage('interface')}),
    row({icon:'box', label:'Model', page:'model', onClick:()=>enterPage('model')}),
    row({icon:'file-text', label:'Terms of Service', page:'terms', onClick:()=>enterPage('terms')}),
    row({icon:'shield', label:'Privacy Policy', page:'privacy', onClick:()=>enterPage('privacy')}),
    row({icon:'info', label:'About', page:'about', onClick:()=>enterPage('about')}),
    row({icon:'cookie', label:'Cookie Notice', page:'cookie', onClick:()=>enterPage('cookie')})
  ]));
  /* (6) Contact */
  nav.appendChild(setCard([
    row({icon:'message-square', label:'Contact Us', page:'contact', onClick:()=>enterPage('contact')})
  ]));
  /* (7) Log out */
  nav.appendChild(setCard([
    navRow({icon:'log-out', label:'Log out', chevron:false, onClick:()=>{ temporary=false; tempSession=null; currentId=null; closeSettings(); renderAll(); toast('Signed out of the local profile'); }})
  ]));
}

/* ----- Profile page ----- */
function pageProfile(c){
  let draftPhoto=settings.profilePhoto||'';
  const hero=el('div','profile-hero');
  const wrap=el('div','profile-avatar-wrap');
  const av=el('span','set-avatar profile-avatar-big');
  wrap.appendChild(av);
  const badge=el('button','avatar-badge'); badge.type='button'; badge.innerHTML=ic('plus',15); badge.setAttribute('aria-label','Change profile photo');
  const fileIn=document.createElement('input'); fileIn.type='file'; fileIn.accept='image/*'; fileIn.hidden=true;
  badge.addEventListener('click',()=>fileIn.click());
  fileIn.addEventListener('change',()=>{
    const f=fileIn.files[0]; if(!f) return;
    const rd=new FileReader();
    rd.onload=()=>{ const img=new Image(); img.onload=()=>{ const cv=document.createElement('canvas'); const s=Math.min(1,160/Math.max(img.width||1,img.height||1)); cv.width=Math.max(1,Math.round(img.width*s)); cv.height=Math.max(1,Math.round(img.height*s)); cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height); draftPhoto=cv.toDataURL('image/jpeg',0.85); paintDraft(); }; img.src=rd.result; };
    rd.readAsDataURL(f);
  });
  wrap.appendChild(badge); wrap.appendChild(fileIn); hero.appendChild(wrap); c.appendChild(hero);
  const f1=el('div','field');
  const l1=el('label'); l1.appendChild(document.createTextNode('Name')); f1.appendChild(l1);
  const nameInput=document.createElement('input'); nameInput.className='text-input'; nameInput.id='profileNameInput'; nameInput.maxLength=255; nameInput.value=settings.profileName||'';
  const cnt=el('span','char-count');
  const nameBox=el('div','field-box'); nameBox.appendChild(nameInput); nameBox.appendChild(cnt); f1.appendChild(nameBox);
  const updCnt=()=>{ cnt.textContent=nameInput.value.length+'/255'; };
  nameInput.addEventListener('input',()=>{ updCnt(); paintDraft(); });
  c.appendChild(f1);
  const f2=el('div','field'); f2.appendChild(el('label',null,'Email'));
  const emailInput=document.createElement('input'); emailInput.className='text-input'; emailInput.id='profileEmailInput'; emailInput.type='email'; emailInput.value=settings.profileEmail||''; emailInput.placeholder='you@example.com';
  f2.appendChild(emailInput); c.appendChild(f2);
  c.appendChild(mutedNote('Your name, email and photo are stored only on this device and shown in the app.'));
  const paintDraft=()=>{ av.innerHTML=''; if(draftPhoto){ const img=document.createElement('img'); img.src=draftPhoto; img.alt=''; av.appendChild(img); } else av.textContent=(nameInput.value||'J').trim().charAt(0).toUpperCase()||'J'; };
  updCnt(); paintDraft();
  const bar=el('div','page-bar pin-bottom');
  const cancel=el('button','cancel-btn','Cancel'); cancel.type='button';
  cancel.addEventListener('click',()=>{ if(isMobileLayout()) settingsGoBack(); else renderSettings(); });
  const confirm=el('button','confirm-btn','Confirm'); confirm.type='button';
  confirm.addEventListener('click',()=>{
    settings.profileName=nameInput.value.trim()||'Jepong';
    settings.profileEmail=emailInput.value.trim();
    settings.profilePhoto=draftPhoto;
    saveSettings(); paintAvatars(); renderAll(); toast('Profile saved');
    if(isMobileLayout()) settingsGoBack(); else renderSettings();
  });
  bar.appendChild(cancel); bar.appendChild(confirm); c.appendChild(bar);
}

/* ----- Account page ----- */
function actBtn(label, danger, fn){
  const b=el('button', danger?'danger-btn':'outline-btn', label); b.type='button';
  b.addEventListener('click',fn); return b;
}
function pageAccount(c){
  c.appendChild(setCard([
    navRow({label:'Email', value:settings.profileEmail||'Not set', onClick:()=>gotoPage('profile')})
  ]));
  c.appendChild(groupLabel('Chats data'));
  const data=el('div');
  data.appendChild(rowEl('Archived Chats','Review chats you archived.',actBtn('Open',false,()=>archivedModal())));
  data.appendChild(rowEl('Import Chats','Load chats from a JSON backup file.',actBtn('Import',false,()=>$('#importInput').click())));
  data.appendChild(rowEl('Export Chats','Download all chats as a JSON backup.',actBtn('Export',false,()=>{ download('jepongdevxyz-chats.json', JSON.stringify(sessions,null,2), 'application/json'); toast('Chats exported'); })));
  data.appendChild(rowEl('Archive All Chats','Move every chat to Archived.',actBtn('Archive All',false,()=>confirmModal('Archive all chats?','Every chat on this device will be archived.','Archive All',()=>{ sessions.forEach(s=>{ s.archived=true; }); currentId=null; saveSessions(); renderAll(); toast('All chats archived'); }))));
  c.appendChild(data);
  c.appendChild(setCard([
    navRow({label:'Delete All Chats', danger:true, chevron:false, onClick:()=>confirmModal('Delete all chats?','This permanently deletes every chat stored on this device.','Delete All',()=>{ sessions=[]; currentId=null; saveSessions(); renderAll(); toast('All chats deleted'); })})
  ]));
  const big=el('button','danger-btn big-danger','Delete All Data'); big.type='button';
  big.addEventListener('click',()=>confirmModal('Delete all data?','This deletes the local profile and ALL data stored by this app on this device. This cannot be undone.','Delete All Data',()=>{
    localStorage.removeItem(SESS_KEY); localStorage.removeItem(SET_KEY); localStorage.removeItem(PROJ_KEY); localStorage.removeItem(EXTRA_KEY);
    sessions=[]; projects=[]; settings=defaultSettings(); saveSettings(); applyTheme(); paintAvatars(); currentId=null; usageTab='usage';
    closeSettings(); renderAll(); toast('All local data deleted');
  }));
  c.appendChild(mutedNote('There is no server account in this frontend — your profile, chats and settings live only in this browser on this device.'));
  const pinWrap=el('div','pin-bottom'); pinWrap.appendChild(big); c.appendChild(pinWrap);
}

/* ----- Upgrade page (our plans, Qwen swipeable cards) ----- */
const PLANS=[
  {name:'Free', price:'$0', per:'', feats:[['box','Model access',['Access to all 21 models in the picker']],['agent-bot','Agent',['Agent Mode and tools: Deep Research, Create Image, Study and more']],['image-plus','AI image generation',['Image generation for everyday use']]]},
  {name:'Lite', price:'$4', per:'per month', feats:[['box','Model access',['Higher usage limits for everyday use']],['agent-bot','Agent',['Basic usage limits for Agent features (same as Free)']],['image-plus','AI image generation',['Higher image generation limits']]]},
  {name:'Plus', price:'$19', per:'per month', rec:true, feats:[['box','Model access',['Expanded usage limits for frequent use']],['agent-bot','Agent & Code',['Agent tasks across Agent Mode and Deep Research','A shared usage pool across Agent features']],['image-plus','AI image generation',['Expanded image generation limits']]]},
  {name:'Pro', price:'$99', per:'per month', feats:[['box','Model access',['Professional usage limits designed for intensive use']],['agent-bot','Agent & Code',['Agent tasks across Agent Mode and Deep Research','Highest usage limits, for heavy all-day use']],['image-plus','AI image generation',['High-volume image generation']]]}
];
function pageUpgrade(c){
  c.appendChild(el('div','plan-heading','Upgrade Plan'));
  const scroller=el('div','plan-scroll');
  PLANS.forEach(p=>{
    const card=el('div','plan-card'+(p.rec?' recommended':''));
    card.appendChild(el('div','plan-name',p.name));
    if(p.rec) card.appendChild(el('div','plan-rec','Recommended'));
    card.appendChild(el('div','plan-price',p.price));
    if(p.per) card.appendChild(el('div','plan-per',p.per));
    const isFree=p.name==='Free';
    const b=el('button',(isFree?'outline-btn':(p.rec?'primary-btn blue':'primary-btn'))+' plan-btn', isFree?'Current plan':'Upgrade to '+p.name);
    b.type='button';
    if(isFree) b.disabled=true;
    b.addEventListener('click',()=>{
      openModal({title:'Checkout unavailable', body:'<p>Checkout is not available in this frontend: the backend exposes no billing or PayMongo contract, so paid plans cannot be purchased here yet. Nothing was charged.</p>', actions:[{label:'OK', kind:'primary', onClick:()=>closeModal()}]});
    });
    card.appendChild(b);
    const feats=el('div','plan-feats');
    p.feats.forEach(f=>{
      const row=el('div','pf');
      const icn=el('span','set-ic'); icn.innerHTML=ic(f[0],16); row.appendChild(icn);
      const tx=el('div'); tx.appendChild(document.createTextNode(f[1]));
      (f[2]||[]).forEach(s=>tx.appendChild(el('div','pf-sub',s)));
      row.appendChild(tx); feats.appendChild(row);
    });
    card.appendChild(feats);
    scroller.appendChild(card);
  });
  c.appendChild(scroller);
  c.appendChild(mutedNote('Your current plan is Free. Paid plans are shown with the prices from our plan list — checkout is not wired up in this frontend yet, and nothing can be charged from this page.'));
}

/* ----- Credits Usage (real local counters) ----- */
function dayKey(d){ return d.toLocaleDateString('en-CA'); }
function trackRequest(){
  const today=dayKey(new Date());
  extra.usage=extra.usage||{day:today,count:0};
  if(extra.usage.day!==today) extra.usage={day:today,count:0};
  extra.usage.count++;
  extra.usageDays=extra.usageDays||{};
  /* seed/backfill today's bucket from the legacy counter so history starts consistent */
  extra.usageDays[today]=Math.max(extra.usageDays[today]||0, extra.usage.count);
  const keys=Object.keys(extra.usageDays).sort();
  while(keys.length>60) delete extra.usageDays[keys.shift()];
  saveExtra();
}
function requestsToday(){ const t=dayKey(new Date()); return extra.usage&&extra.usage.day===t?extra.usage.count:0; }
function usageVal(v){ const s=el('span','usage-value',v); return s; }
function pageUsage(c){
  const plan=setCard([]);
  const prow=el('div'); prow.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 0';
  const pl=el('div');
  const pt=el('strong',null,'Free'); pt.style.fontSize='16px'; pl.appendChild(pt);
  prow.appendChild(pl);
  const up=el('button','primary-btn','Upgrade'); up.type='button';
  up.addEventListener('click',()=>gotoPage('upgrade'));
  prow.appendChild(up); plan.appendChild(prow); c.appendChild(plan);
  const seg=el('div','segmented seg-block'); seg.style.margin='2px 0 16px';
  [['usage','Usage'],['history','History']].forEach(([k,l])=>{
    const b=el('button',usageTab===k?'active':'',l); b.type='button';
    b.addEventListener('click',()=>{ usageTab=k; renderSettings(); });
    seg.appendChild(b);
  });
  c.appendChild(seg);
  if(usageTab==='usage'){
    const limHead=el('p',null,'Plan limits'); limHead.style.cssText='font-weight:700;font-size:15px;margin:0 2px 6px';
    c.appendChild(limHead);
    const lim=el('p'); lim.style.cssText='color:var(--muted);font-size:13.5px;line-height:1.55;margin:0 2px 16px';
    lim.appendChild(document.createTextNode('Requests are counted locally on this device — there is no billing backend in this frontend, so plan limits are not enforced here. '));
    const link=el('button',null,'Upgrade your plan'); link.type='button';
    link.style.cssText='background:none;border:0;padding:0;font:inherit;color:var(--accent);cursor:pointer;text-decoration:underline';
    link.addEventListener('click',()=>gotoPage('upgrade'));
    lim.appendChild(link); c.appendChild(lim);
    const card=setCard([]);
    const head=el('div'); head.style.cssText='display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:10px 0 2px';
    const ht=el('strong',null,'Requests today'); ht.style.fontSize='15px'; head.appendChild(ht);
    const hn=el('span',null,String(requestsToday())); hn.style.cssText='font-size:22px;font-weight:700'; head.appendChild(hn);
    card.appendChild(head);
    const days=[]; for(let i=6;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(d); }
    const vals=days.map(d=>(extra.usageDays||{})[dayKey(d)]||0);
    const max=Math.max(1,...vals);
    const bars=el('div','usage-bars');
    days.forEach((d,i)=>{
      const col=el('div','ub-col');
      col.appendChild(el('div','ub-n',String(vals[i])));
      const bar=el('div','ub-bar'); bar.style.height=Math.max(3,Math.round(vals[i]/max*64))+'px'; col.appendChild(bar);
      col.appendChild(el('div','ub-d', i===6?'Today':d.toLocaleDateString('en-US',{weekday:'short'})));
      bars.appendChild(col);
    });
    card.appendChild(bars);
    const bn=el('p',null,'Requests per day for the last 7 days.'); bn.style.cssText='color:var(--muted);font-size:13px;margin:10px 0 8px';
    card.appendChild(bn);
    c.appendChild(card);
    const stats=el('div');
    const msgCount=sessions.reduce((n,s)=>n+s.messages.length,0);
    stats.appendChild(rowEl('Chats','Conversations stored on this device.',usageVal(String(sessions.filter(s=>!s.archived).length))));
    stats.appendChild(rowEl('Messages','Messages across all chats.',usageVal(String(msgCount))));
    stats.appendChild(rowEl('Archived chats','',usageVal(String(sessions.filter(s=>s.archived).length))));
    c.appendChild(stats);
  } else {
    const card=setCard([]);
    const entries=Object.entries(extra.usageDays||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,30);
    if(!entries.length) card.appendChild(el('div','empty-note','No usage history yet'));
    entries.forEach(([day,count])=>{
      const r=el('div','hist-row');
      const d=new Date(day+'T12:00:00');
      r.appendChild(el('span',null,d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})));
      r.appendChild(el('span','n',count+(count===1?' request':' requests')));
      card.appendChild(r);
    });
    c.appendChild(card);
    c.appendChild(mutedNote('Daily request counts stored on this device, kept for the last 60 days.'));
  }
}

/* ----- Language page (response language, wired to personalization) ----- */
const RESPONSE_LANGS=[
  ['auto','Auto (match my language)'],
  ['en-US','English (US)'],
  ['ar','Arabic (عربي)'],
  ['de','German (Deutsch)'],
  ['es','Spanish (Español)'],
  ['fr','French (France)'],
  ['it','Italian (Italiano)'],
  ['ja','Japanese (日本語)'],
  ['ko','Korean (한국어)'],
  ['pt-PT','Portuguese (Portugal)'],
  ['pt-BR','Portuguese (Brazil)'],
  ['ru','Russian (Russia)'],
  ['hi','Hindi (हिन्दी)'],
  ['fa','Persian (فارسی)'],
  ['tr','Turkish (Türkçe)'],
  ['uk','Ukrainian (Українська)'],
  ['id','Indonesian (Bahasa Indonesia)'],
  ['fil','Filipino (Filipino)'],
  ['zh-CN','Chinese (简体中文)'],
  ['zh-TW','Chinese (繁體中文)']
];
function pageLanguage(c){
  const card=setCard([]);
  RESPONSE_LANGS.forEach(([code,display])=>{
    card.appendChild(pickRow(display, null, settings.responseLang.code===code, ()=>{
      settings.responseLang={code, label:display}; saveSettings(); renderSettings();
      toast('Response language: '+display);
    }));
  });
  c.appendChild(card);
  c.appendChild(mutedNote('The assistant will answer in the selected language. Auto answers in the language you write in.'));
}

/* ----- Theme page ----- */
function pageTheme(c){
  const card=setCard([]);
  [['system','System'],['light','Light'],['dark','Dark']].forEach(([v,l])=>{
    card.appendChild(pickRow(l, null, settings.theme===v, ()=>{
      settings.theme=v; saveSettings(); applyTheme(); renderSettings();
    }, {themeOpt:v}));
  });
  c.appendChild(card);
  c.appendChild(mutedNote('Theme applies immediately across the whole app. System follows your device setting.'));
}

/* ----- Interface page ----- */
function pageInterface(c){
  const I=settings.interface;
  c.appendChild(groupLabel('Chat'));
  const r1=cardRow('Title Auto-Generation','',switchEl(I.titleAuto,v=>{ I.titleAuto=v; saveSettings(); },'Title Auto-Generation','blue')); r1.classList.add('tall'); c.appendChild(r1);
  const r2=cardRow('Auto-Copy Response to Clipboard','',switchEl(I.autoCopy,v=>{ I.autoCopy=v; saveSettings(); },'Auto-Copy Response to Clipboard','blue')); r2.classList.add('tall'); c.appendChild(r2);
  const r3=cardRow('Paste Large Text as File','',switchEl(I.pasteAsFile,v=>{ I.pasteAsFile=v; saveSettings(); },'Paste Large Text as File','blue')); r3.classList.add('tall'); c.appendChild(r3);
}

/* ----- Personalization page ----- */
function savedMemoryModal(){
  const P=settings.personalization;
  const wrap=document.createElement('div');
  wrap.innerHTML='<div class="field"><label>Saved Memory</label><textarea class="textarea-input" id="smText" placeholder="Facts the assistant should remember">'+esc(P.savedMemory)+'</textarea></div>';
  openModal({title:'Saved Memory', body:wrap, actions:[{label:'Cancel', onClick:()=>closeModal()},{label:'Save', kind:'primary', onClick:()=>{ P.savedMemory=wrap.querySelector('#smText').value; saveSettings(); closeModal(); toast('Memory saved'); }}]});
}
function customizeModal(){
  const P=settings.personalization;
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="field"><label>Nickname <span class="counter" id="czNickCount">${P.nickname.length}/128</span></label><input class="text-input" id="czNick" maxlength="128" value="${esc(P.nickname)}"></div>
    <div class="field"><label>About you <span class="counter" id="czAboutCount">${P.about.length}/500</span></label><textarea class="textarea-input" id="czAbout" maxlength="500">${esc(P.about)}</textarea></div>
    <div class="style-grid" id="czStyles">${[['Default','Balanced responses'],['Concise','Short and direct'],['Socratic','Guides with questions'],['Formal','Professional tone']].map(([n,d])=>`<button type="button" class="style-card${P.style===n?' active':''}" data-style="${n}"><strong>${n}</strong><span>${d}</span></button>`).join('')}</div>
    <div class="field"><label>Custom instruction <span class="counter" id="czCustomCount">${P.custom.length}/40960</span></label><textarea class="textarea-input" id="czCustom" maxlength="40960">${esc(P.custom)}</textarea></div>`;
  const enRow=rowEl('Enable in new chat','Apply this customization to new chats.',switchEl(P.enableNew,v=>{ P.enableNew=v; saveSettings(); }));
  wrap.appendChild(enRow);
  let style=P.style;
  wrap.querySelectorAll('#czStyles .style-card').forEach(b=>b.addEventListener('click',()=>{ style=b.dataset.style; wrap.querySelectorAll('#czStyles .style-card').forEach(x=>x.classList.toggle('active',x===b)); }));
  [['#czNick','#czNickCount',128],['#czAbout','#czAboutCount',500],['#czCustom','#czCustomCount',40960]].forEach(([i,ct,max])=>{ wrap.querySelector(i).addEventListener('input',e=>{ wrap.querySelector(ct).textContent=e.target.value.length+'/'+max; }); });
  openModal({title:'Customize', body:wrap, wide:true, actions:[
    {label:'Cancel', onClick:()=>closeModal()},
    {label:'Save', kind:'primary', onClick:()=>{ P.nickname=wrap.querySelector('#czNick').value; P.about=wrap.querySelector('#czAbout').value; P.custom=wrap.querySelector('#czCustom').value; P.style=style; saveSettings(); closeModal(); toast('Customization saved'); }}
  ]});
}
function pagePersonalization(c){
  const P=settings.personalization;
  c.appendChild(groupLabel('Memory'));
  c.appendChild(cardRow('Reference saved memories','JepongDevxyz AI will reference your saved memories when generating responses.',switchEl(P.refMemory,v=>{ P.refMemory=v; saveSettings(); },'Reference saved memories')));
  c.appendChild(cardRow('Reference the chat history','JepongDevxyz AI will reference your chat history when generating responses.',switchEl(P.refHistory,v=>{ P.refHistory=v; saveSettings(); },'Reference the chat history')));
  c.appendChild(setCard([ navRow({label:'Manage', onClick:()=>savedMemoryModal()}) ]));
  c.appendChild(groupLabel('Customize JepongDevxyz AI'));
  c.appendChild(setCard([ navRow({label:'Prompt Settings', onClick:()=>customizeModal()}) ]));
  c.appendChild(groupLabel('Cookie'));
  c.appendChild(setCard([ navRow({label:'Manage Cookies', onClick:()=>gotoPage('cookies')}) ]));
  const acc=el('div','accordion adv-acc');
  const head=el('div','accordion-head adv-head');
  const hLbl=el('span','adv-lbl','Advanced'); head.appendChild(hLbl);
  const chv=el('span','acc-chev'); chv.innerHTML=ic('chevron-down',18); head.appendChild(chv);
  head.appendChild(switchEl(settings.advancedEnabled!==false, v=>{ settings.advancedEnabled=v; saveSettings(); syncToolsAvailability(); },'Advanced tools master switch'));
  acc.appendChild(head);
  const body=el('div','accordion-body'); body.hidden=true; body.style.paddingTop='12px';
  head.addEventListener('click',e=>{ if(e.target.closest('.switch')) return; body.hidden=!body.hidden; chv.innerHTML=ic(body.hidden?'chevron-down':'chevron-up',18); });
  const ADV=[
    ['Web Scraping','webScraping','Fetches the web pages you share and extracts, summarizes, or analyzes their content, skipping page clutter.'],
    ['Image search','imageSearch','Searches the internet for images matching your keywords and returns images, source links, and descriptions.'],
    ['Web search','webSearchAdv','Retrieves the latest text information, news, and data from the internet so answers can use real-time information.'],
    ['Image generation','imageGeneration','Creates entirely new images from your text description.'],
    ['Code Interpreter','codeInterpreter','Works through programming and calculation problems step by step to reach an answer.'],
    ['Retrieve historical memory','retrieveMemory','Pulls in relevant details from your earlier conversations when they help answer.'],
    ['Image editing','imageEditing','Edits images you provide — changes, enhancements, and variations based on your instructions.'],
    ['Update memory','updateMemory','Lets the assistant save new facts you share into your saved memory for future chats.'],
    ['Local image enlargement','localEnlarge','Enlarges images on this device for a clearer, larger result.']
  ];
  ADV.forEach(([label,key,desc])=>{
    body.appendChild(cardRow(label, desc, switchEl(settings.advanced[key], v=>{ settings.advanced[key]=v; saveSettings(); if(key==='imageGeneration') syncToolsAvailability(); }, label)));
  });
  acc.appendChild(body);
  c.appendChild(acc);
  c.appendChild(mutedNote('The master switch turns every Advanced tool off at once. Individual choices are kept and apply again when it is turned back on.'));
}

/* ----- Manage Cookies page ----- */
function pageCookies(c){
  c.appendChild(mutedNote('Choose which optional storage this app may use on this device. Strictly necessary storage (your settings and chats) always stays on this device.'));
  c.appendChild(cardRow('Analytics cookies','Anonymous usage measurement on this device.',switchEl(settings.cookies.analytics,v=>{ settings.cookies.analytics=v; saveSettings(); },'Analytics cookies')));
  c.appendChild(cardRow('Personalization cookies','Remember personalization choices on this device.',switchEl(settings.cookies.personalization,v=>{ settings.cookies.personalization=v; saveSettings(); },'Personalization cookies')));
}

/* ----- Voice page ----- */
const SPOKEN_LANGS=[['en-US','English'],['de-DE','Deutsch'],['es-ES','Español'],['fr-FR','France'],['it-IT','Italiano'],['ja-JP','日本語'],['ko-KR','한국어'],['pt-PT','Portugal'],['ru-RU','Russia'],['zh-CN','中文'],['yue-Hant-HK','中文方言'],['id-ID','Indonesian'],['fil-PH','Filipino']];
function getVoices(){ try{ return ('speechSynthesis' in window)?speechSynthesis.getVoices():[]; }catch(e){ return []; } }
function voiceGender(v){
  const n=(v.name||'').toLowerCase();
  if(/female|zira|samantha|victoria|karen|moira|fiona|tessa|veena|susan|catherine|joanna|salli|kimberly|amy|emma|aria|jenny|michelle|lucia|elena|sofia|camille|amelie|yuki|kyoko|xiaoxiao|tingting|sin-ji|yuna|heami|paulina|monica|luciana|marisol|esperanza|penelope|laura|silvia|paola|alice|hannah|leah|aubrey|ashley|jessica|sarah|nicole|lisa|ana|rosa|hjortdis|hulda|ingrid|astrid|liv|ida|sigrid|freja|wilma|agnes|alva|ebba|otilia|kerstin|margareta|berit|gunilla|annika|sofie|mette|nynke|lotte|femke|sanne|lieke|eva/.test(n)) return 'f';
  if(/\bmale\b|david|daniel|alex|fred|thomas|guy|christopher|eric|roger|george|james|william|richard|stefan|klaus|jorge|diego|carlos|kenji|ichiro|pablo|miguel|hugo|arthur|theo|hamza|salim|tarik|dmitry|pavel|yuri|henrik|lars|pieter|tomasz|jakub|mads|kalle|juhani|anthony|brian|kevin|mark|paul|andrew|joshua|ryan|aaron|adam|nathan|owen|liam|noah|lucas|mateo|enrique|fernando|ricardo|alberto|juan|luis|manuel|antonio|francisco|rafael|sergio|andres|felipe|santiago|alejandro|roberto|eduardo|gonzalo|ignacio|marcos|adrian|ruben|oscar|hector|raul|victor|emilio|gustavo|leonardo|mauricio|flavio|bruno|filipe|goncalo|nuno|diogo|tiago|marco|luca|matteo|alessandro|lorenzo|stefano|francesco|giovanni|giuseppe|salvatore|mario|luigi|angelo|vincenzo|domenico|raffaele|pasquale|nicola|michele|pavel/.test(n)) return 'm';
  return null;
}
function rangeRow(label, val, min, max, step, onChange){
  const r=el('div','range-row');
  r.appendChild(el('label',null,label));
  const inp=document.createElement('input'); inp.type='range'; inp.min=min; inp.max=max; inp.step=step; inp.value=val; inp.setAttribute('aria-label',label);
  const rv=el('span','rv',Number(val).toFixed(1));
  inp.addEventListener('input',()=>{ rv.textContent=Number(inp.value).toFixed(1); onChange(Number(inp.value)); });
  r.appendChild(inp); r.appendChild(rv); return r;
}
function pageVoice(c){
  const V=settings.voice;
  const wrap=el('div','voice-wrap');
  const curLang=V.lang||'en-US';
  const langLabel=(SPOKEN_LANGS.find(x=>x[0]===curLang)||['','English'])[1];
  wrap.appendChild(setCard([ navRow({icon:'globe', label:'Spoken language', value:langLabel, onClick:()=>{ langDropOpen=!langDropOpen; renderSettings(); }}) ]));
  if(langDropOpen){
    const dd=el('div','voice-dropdown');
    SPOKEN_LANGS.forEach(([code,label])=>{
      const b=el('button', curLang===code?'sel':''); b.type='button';
      b.appendChild(document.createTextNode(label));
      if(curLang===code){ const ck=el('span'); ck.innerHTML=ic('check',14); b.appendChild(ck); }
      b.addEventListener('click',()=>{ V.lang=code; saveSettings(); langDropOpen=false; renderSettings(); });
      dd.appendChild(b);
    });
    wrap.appendChild(dd);
  }
  c.appendChild(wrap);
  const voices=getVoices();
  const genders=voices.map(voiceGender);
  const anyClassified=genders.some(Boolean);
  let shown=voices;
  if(anyClassified){
    const seg=el('div','segmented'); seg.style.margin='0 0 14px';
    [['all','All'],['f','Female'],['m','Male']].forEach(([k,l])=>{
      const b=el('button',voiceTab===k?'active':'',l); b.type='button';
      b.addEventListener('click',()=>{ voiceTab=k; renderSettings(); });
      seg.appendChild(b);
    });
    c.appendChild(seg);
    if(voiceTab!=='all') shown=voices.filter((v,i)=>genders[i]===voiceTab);
  }
  const card=setCard([]);
  card.appendChild(pickRow('Device default','System voice', !V.voiceURI, ()=>{ V.voiceURI=''; V.name=''; saveSettings(); renderSettings(); }));
  shown.forEach(v=>{
    card.appendChild(pickRow(v.name, v.lang+(v.default?' · Default':''), V.voiceURI===v.voiceURI, ()=>{ V.voiceURI=v.voiceURI; V.name=v.name; saveSettings(); renderSettings(); }));
  });
  if(!voices.length) card.appendChild(el('div','empty-note','No voices reported by this device yet — the list fills in when the browser provides them.'));
  else if(!shown.length) card.appendChild(el('div','empty-note','No voices in this group on this device.'));
  c.appendChild(card);
  const ctl=setCard([]);
  const inner=el('div'); inner.style.padding='8px 0';
  inner.appendChild(rangeRow('Rate', V.rate||1, 0.5, 2, 0.1, v=>{ V.rate=v; saveSettings(); }));
  inner.appendChild(rangeRow('Pitch', V.pitch===undefined?1:V.pitch, 0, 2, 0.1, v=>{ V.pitch=v; saveSettings(); }));
  const test=el('button','outline-btn','Test voice'); test.type='button'; test.style.margin='6px 0 10px';
  test.addEventListener('click',()=>speak('Hello, this is JepongDevxyz AI.'));
  inner.appendChild(test);
  ctl.appendChild(inner); c.appendChild(ctl);
  c.appendChild(cardRow('Voice mode','Read new replies aloud automatically.',switchEl(V.voiceMode,v=>{ V.voiceMode=v; saveSettings(); },'Voice mode')));
}

/* ----- Model page ----- */
function pageModel(c){
  if(settings.provider==='bailucode'){
    const card=setCard([]);
    const r=el('div','setting-row'); r.style.borderBottom='0';
    const copy=el('div','copy'); copy.appendChild(el('strong',null,'Bailu route')); copy.appendChild(el('p',null,'Applies to the selected Bailucode model.'));
    r.appendChild(copy);
    const seg=el('div','segmented');
    [['','Normal'],['anthropic','Anthropic']].forEach(([v,l])=>{
      const b=el('button',(settings.bailuRoute||'')===v?'active':'',l); b.type='button';
      b.addEventListener('click',()=>{ settings.bailuRoute=v; saveSettings(); renderSettings(); toast('Bailu route: '+l); });
      seg.appendChild(b);
    });
    r.appendChild(seg); card.appendChild(r); c.appendChild(card);
  }
  MODELS.forEach((m,idx)=>{
    const acc=el('div','accordion');
    const head=el('button','accordion-head'); head.type='button';
    head.appendChild(el('span',null,m.name));
    const chv=el('span','acc-chev'); chv.innerHTML=ic(idx===0?'chevron-up':'chevron-down',18); head.appendChild(chv);
    const body=el('div','accordion-body'); body.hidden=idx!==0;
    head.addEventListener('click',()=>{
      const willOpen=body.hidden;
      c.querySelectorAll('.accordion').forEach(a=>{ const b=a.querySelector('.accordion-body'); const cv=a.querySelector('.acc-chev'); if(b&&a!==acc){ b.hidden=true; if(cv) cv.innerHTML=ic('chevron-down',18); } });
      body.hidden=!willOpen; chv.innerHTML=ic(willOpen?'chevron-up':'chevron-down',18);
    });
    body.appendChild(el('p',null,m.desc));
    const lines=el('div'); lines.style.cssText='border-top:1px solid var(--line);margin-top:10px;padding-top:8px';
    const addLine=(k,v)=>{ lines.appendChild(el('div','meta-line',k+': '+v)); };
    addLine('Provider', PROVIDER_NAMES[m.provider]||m.provider);
    addLine('Model ID', m.id);
    if(/1M context/i.test(m.desc)) addLine('Maximum context length', '1,000,000 tokens');
    body.appendChild(lines);
    const sel=settings.provider===m.provider&&settings.model===m.id;
    const b=el('button', sel?'outline-btn':'primary-btn', sel?'Selected':'Use in chat'); b.type='button'; b.style.marginTop='12px';
    b.addEventListener('click',()=>{ settings.provider=m.provider; settings.model=m.id; saveSettings(); renderModelPanel(); renderSettings(); toast('Model set to '+m.name); });
    body.appendChild(b);
    acc.appendChild(head); acc.appendChild(body); c.appendChild(acc);
  });
}

/* ----- Legal pages: the app's real Terms / Privacy documents (repo terms.html / privacy.html) ----- */
const LEGAL_TERMS=[
  [null,["Welcome to JepongDevxyz AI (“Service”), operated by JepongDevxyz (“we”, “us”, “our”). This Service Agreement (“Agreement”) governs your access to and use of JepongDevxyz AI, including the website, web app, application programming interfaces, downloadable software, and any related services that link to this Agreement. By accessing or using the Service, you agree to be bound by this Agreement. If you do not agree, do not use the Service."]],
  ["1. Eligibility",["You must be at least 13 years old to use the Service (or the age of digital consent in your country, if higher). By using the Service, you represent that you have the legal capacity to enter into this Agreement."]],
  ["2. Accounts",["You are responsible for all activity under your account and for keeping your credentials secure. Notify us promptly of any unauthorized use. You must provide accurate information and keep it up to date."]],
  ["3. The Service",["JepongDevxyz AI provides AI-powered chat, content generation, coding assistance, productivity tools, and related features. Features may change, be added, or be removed at any time. Some features may be in preview or beta and are provided “as is”."]],
  ["4. Acceptable Use",["You agree not to: (a) violate any law or the rights of others; (b) generate or distribute unlawful, harmful, deceptive, infringing, or abusive content; (c) attempt to bypass security, quotas, or billing; (d) reverse engineer or disrupt the Service; (e) use the Service to build a competing model by automated extraction, except as allowed by law; (f) misrepresent AI output as human-generated where disclosure is required by law."]],
  ["5. Your Content",["You retain ownership of the content you submit and the outputs you generate, subject to the rights of any underlying model provider. You grant us a non-exclusive license to host, process, transmit, and display your content solely to operate and improve the Service, to comply with the law, and to enforce this Agreement. You are responsible for your content and for how you use outputs."]],
  ["6. AI Output and Accuracy",["Outputs are generated by automated systems and may be incorrect, incomplete, or similar to outputs for other users. Outputs are provided for informational purposes and do not constitute professional advice (including medical, legal, or financial). Verify important information independently."]],
  ["7. Plans, Billing, and Credits",["Some features may require a paid plan or credits. Prices are shown in Philippine Peso (₱) or as otherwise indicated. Taxes may apply. Except where required by law, payments are non-refundable. We may change prices with notice for the next billing cycle."]],
  ["8. Third-Party Services",["The Service may connect to third-party services (for example, AI model providers, file storage, or payment processors). Their terms and privacy policies govern your use of those services."]],
  ["9. Termination",["You may stop using the Service at any time. We may suspend or terminate access if you materially breach this Agreement or use the Service in a way that risks harm to the Service or others. Sections that by nature should survive termination will survive."]],
  ["10. Contact",["Questions about this Agreement: businessdevgithubjepong@gmail.com.","© 2026 JepongDevxyz AI · Powered by Jepong Devxyz."]]
];
const LEGAL_PRIVACY=[
  [null,["This Privacy Policy explains what information JepongDevxyz AI (“JepongDevxyz”, “we”, “us”) collects, uses, and shares when you use the app and related services (the “Service”). Our contact email is businessdevgithubjepong@gmail.com."]],
  ["1. Information we collect",["Account and profile: name, email, profile photo, and optional phone number.","Usage and device information: model picks, settings, diagnostics, crash data, and (where enabled) analytics.","Content from integrated services (email, calendar, files, and similar) only with your permission, processed to answer your request and not stored longer than needed.","Payment information handled by payment providers such as PayMongo or Stripe; we receive references, not full card numbers.","Guest use stores data locally in your browser (such as chat history) and may associate it with an anonymous identifier."]],
  ["2. How we use information",["To operate and provide the Service, including account features and personalization.","To improve reliability, safety, and model quality.","To secure accounts and prevent fraud or abuse.","To communicate service notices and, with your consent, marketing.","To comply with legal obligations."]],
  ["3. Model providers",["To answer your request we share the necessary conversation context with the model provider offered in the app (Bailucode). The provider processes data under its own terms and privacy policy."]],
  ["4. Cookies and local storage",["Strictly necessary cookies keep you signed in and remember preferences such as theme, orientation, wallpaper, and navigation bar style and order. Optional analytics cookies apply only if you enable them. Guest-mode data can be cleared from Account settings, and we honor browser-level clearing of site data."]],
  ["5. Sharing",["We do not sell personal information. We share data only with service providers that help us operate the app (hosting, storage, payments, analytics), when required by law, or to protect rights and safety."]],
  ["6. Retention",["Chat data is kept until you delete it or it is removed automatically under our data minimization policy for deleted content. Backups are rotated and expire."]],
  ["7. Your choices and rights",["Access, correct, export, or delete your data from the Account settings in the app, or contact us by email.","Withdraw consent for optional analytics and other optional processing at any time."]],
  ["8. Children",["The Service is not intended for children under 13. If we learn that such data was collected, we will delete it."]],
  ["9. Changes",["We may update this policy and will post the new version here with a new “Last updated” date; material changes may also be announced in the app."]],
  ["10. Contact",["Questions about this policy: businessdevgithubjepong@gmail.com. For more about the product, see the About page in the app.","© 2026 JepongDevxyz AI · Powered by Jepong Devxyz."]]
];
function legalPage(blocks){
  return function(c){
    const d=el('div','legal');
    const upd=el('p',null,'Last updated: October 1, 2026'); upd.style.cssText='color:var(--muted);font-size:13px;margin-bottom:6px'; d.appendChild(upd);
    blocks.forEach(([h,paras])=>{ if(h) d.appendChild(el('h3',null,h)); paras.forEach(p=>d.appendChild(el('p',null,p))); });
    c.appendChild(d);
  };
}
function pageCookieNotice(c){
  const d=el('div','legal');
  d.appendChild(el('h3',null,'How this app uses cookies and local storage'));
  d.appendChild(el('p',null,'JepongDevxyz AI does not use third-party advertising cookies, and no other company’s trackers run in this frontend.'));
  d.appendChild(el('p',null,'Almost everything the app remembers is kept in your browser’s local storage, on this device only: your chats and projects, your settings (theme, model, voice, personalization), your profile name, email and photo, a daily request counter used by Credits Usage, and any feedback you save from the Suggestions form. This data is not sold, and clearing the browser’s site data removes it.'));
  d.appendChild(el('p',null,'Two optional storage features can be switched off at any time: analytics cookies and personalization cookies. Turning them off does not delete your chats or settings.'));
  c.appendChild(d);
  c.appendChild(setCard([ navRow({label:'Manage Cookies', onClick:()=>gotoPage('cookies')}) ]));
}

/* ----- About ----- */
function suggestionsModal(){
  let cat='';
  const wrap=document.createElement('div');
  wrap.innerHTML=`
    <div class="field"><label>Category</label><div class="chip-row" id="sgCats">${['Bug','Feature','Design','Other'].map(x=>'<button type="button" class="chip" data-cat="'+x+'">'+x+'</button>').join('')}</div></div>
    <div class="field"><label>Suggestion <span class="counter" id="sgCount">0/1000</span></label><textarea class="textarea-input" id="sgText" maxlength="1000" placeholder="Tell us what to improve"></textarea></div>
    <div class="field"><label>Attach image (optional)</label><div><button type="button" class="outline-btn" id="sgImg">Choose image</button> <span id="sgImgName" class="muted-note"></span><input type="file" id="sgFile" accept="image/*" hidden></div></div>
    <p class="kbd-note">Suggestions are saved on this device — the backend contract has no feedback endpoint.</p>`;
  wrap.querySelectorAll('#sgCats .chip').forEach(b=>b.addEventListener('click',()=>{ cat=b.dataset.cat; wrap.querySelectorAll('#sgCats .chip').forEach(x=>x.classList.toggle('active',x===b)); validate(); }));
  wrap.querySelector('#sgText').addEventListener('input',e=>{ wrap.querySelector('#sgCount').textContent=e.target.value.length+'/1000'; validate(); });
  wrap.querySelector('#sgImg').addEventListener('click',()=>wrap.querySelector('#sgFile').click());
  wrap.querySelector('#sgFile').addEventListener('change',e=>{ wrap.querySelector('#sgImgName').textContent=e.target.files[0]?e.target.files[0].name:''; });
  const m=openModal({title:'Suggestions', body:wrap, actions:[{label:'Cancel', onClick:()=>closeModal()},{label:'Submit', kind:'primary', onClick:()=>{ extra.feedback.push({cat, text:wrap.querySelector('#sgText').value, at:Date.now()}); saveExtra(); closeModal(); toast('Suggestion saved on this device'); }}]});
  const submitBtn=m.actEl.querySelectorAll('button')[1];
  const validate=()=>{ const ok=!!cat&&!!wrap.querySelector('#sgText').value.trim(); submitBtn.disabled=!ok; submitBtn.style.opacity=ok?'1':'.5'; };
  validate();
}
function pageAbout(c){
  const card=setCard([]);
  const r=el('div','pick-row');
  r.appendChild(el('span','pick-main','APP Version'));
  const v=el('span',null,'1.0.0'); v.style.color='var(--muted)'; r.appendChild(v);
  card.appendChild(r);
  card.appendChild(el('div','set-divider'));
  const prose=el('div'); prose.style.cssText='padding:8px 0 4px;font-size:14.5px;line-height:1.65';
  prose.appendChild(el('p',null,'JepongDevxyz AI is an AI assistant app that gives you access to many leading language models in one place — for chat, coding help, study, research, and creating images.')); prose.lastChild.style.margin='0 0 10px';
  prose.appendChild(el('p',null,'Features include streaming chat with visible thinking steps, Agent Mode and tools, projects, and chat history stored locally on this device.')); prose.lastChild.style.margin='0 0 10px';
  prose.appendChild(el('p',null,'Created by Jay-Ar Lee Espiritu.')); prose.lastChild.style.margin='0';
  card.appendChild(prose);
  c.appendChild(card);
  const fb=setCard([]);
  fb.appendChild(el('div','about-line','Feedback email'));
  fb.appendChild(el('div','set-divider'));
  fb.appendChild(el('div','about-line','businessdevgithubjepong@gmail.com'));
  c.appendChild(fb);
  c.appendChild(setCard([ navRow({label:'Suggestions', onClick:()=>suggestionsModal()}) ]));
}

/* ----- Contact Us ----- */
function pageContact(c){
  c.appendChild(groupLabel('Feedback email'));
  const card=setCard([]);
  const top=el('div'); top.style.cssText='display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0 2px';
  const em=el('strong',null,'businessdevgithubjepong@gmail.com'); em.style.cssText='font-size:15px;min-width:0;overflow-wrap:anywhere';
  top.appendChild(em);
  const cp=el('button','icon-btn'); cp.type='button'; cp.setAttribute('aria-label','Copy email address'); cp.innerHTML=ic('copy',17);
  cp.addEventListener('click',async ()=>{
    const addr='businessdevgithubjepong@gmail.com';
    try{ await navigator.clipboard.writeText(addr); toast('Email address copied'); }
    catch(e){
      try{ const ta=document.createElement('textarea'); ta.value=addr; ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select(); const ok=document.execCommand('copy'); ta.remove(); if(ok) toast('Email address copied'); else toast('Copy failed — '+addr); }
      catch(e2){ toast('Copy failed — '+addr); }
    }
  });
  top.appendChild(cp); card.appendChild(top);
  const p=el('p',null,'If you encounter any issues or have any suggestions for improving JepongDevxyz AI, welcome to contact us.'); p.style.cssText='color:var(--muted);font-size:13.5px;margin:4px 0 10px;line-height:1.55';
  card.appendChild(p);
  c.appendChild(card);
}

const PAGE_RENDER={profile:pageProfile, account:pageAccount, upgrade:pageUpgrade, usage:pageUsage, language:pageLanguage, theme:pageTheme, personalization:pagePersonalization, voice:pageVoice, interface:pageInterface, model:pageModel, terms:legalPage(LEGAL_TERMS), privacy:legalPage(LEGAL_PRIVACY), cookie:pageCookieNotice, cookies:pageCookies, about:pageAbout, contact:pageContact};

/* ---------- composer + chrome wiring ---------- */
function autosize(){ const t=$('#composerInput'); t.style.height='auto'; if(!t.value){ $('#composer').classList.remove('multi'); return; } const sh=t.scrollHeight; t.style.height=Math.min(sh,120)+'px'; $('#composer').classList.toggle('multi',sh>44); }
function updateSend(){ const hasText=!!$('#composerInput').value.trim(); $('#sendBtn').disabled=!(hasText||attachments.length); $('#micBtn').style.display=hasText?'none':''; }
function syncToolsAvailability(){ const on=settings.advancedEnabled!==false&&settings.advanced.imageGeneration; const b=document.querySelector('[data-tool="image"]'); if(b){ b.disabled=!on; b.style.opacity=on?'1':'.45'; } }
function closePopovers(){ $('#toolsMenu').hidden=true; $('#modeMenu').hidden=true; $('#modelPanel').hidden=true; $('#profileMenu').hidden=true; $('#moreToolsMenu').hidden=true; }
function renderAll(){ renderHistory(); renderSearch(); renderProjects(); renderMessages(); renderModelPanel(); syncToolsAvailability();
  $('#tempChatBtn').setAttribute('aria-pressed',String(temporary));
  $('#profileName').textContent=settings.profileName||'Jepong';
  paintAvatars();
  $('#profileMenuHeader').textContent=settings.profileEmail||settings.profileName||'Local profile';
  $$('#modeMenu [data-response-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.responseMode===settings.responseMode));
  $('#responseModeLabel').textContent=settings.responseMode;
  $('#toolsEnabledToggle').setAttribute('aria-checked',String(!!settings.toolsEnabled));
  $$('#toolsMenu [data-tool]').forEach(b=>b.classList.toggle('selected',b.dataset.tool==='web'?!!settings.webSearch:b.dataset.tool===activeTool));
}

function init(){
  hydrateIcons();
  applyTheme();
  sessions.forEach(s=>{ (s.messages||[]).forEach(m=>{ if(m.role==='assistant'&&m.text) m.text=cleanAssistantText(m.text); }); });
  // sidebar
  $('#sidebarToggle').addEventListener('click',()=>{ const sb=$('#sidebar'); if(innerWidth<=767){ sb.classList.toggle('mobile-open'); $('#sidebarScrim').hidden=!sb.classList.contains('mobile-open'); } else sb.classList.toggle('rail'); });
  $('#mobileMenuBtn').addEventListener('click',()=>{ $('#sidebar').classList.add('mobile-open'); $('#sidebarScrim').hidden=false; });
  $('#sidebarScrim').addEventListener('click',closeMobileDrawer);
  $('#brandHome').addEventListener('click',newChat);
  $('#newChatBtn').addEventListener('click',newChat);
  $('#railSearchBtn').addEventListener('click',()=>{ const sb=$('#sidebar'); sb.classList.remove('rail'); if(innerWidth<=767){ sb.classList.add('mobile-open'); $('#sidebarScrim').hidden=false; } setTimeout(()=>$('#chatSearch').focus(),30); });
  $('#chatSearch').addEventListener('input',e=>{ clearTimeout(searchTimer); const v=e.target.value; $('#clearSearch').hidden=!v;
    searchTimer=setTimeout(()=>{ searchQuery=v; renderSearch(); },250); });
  $('#clearSearch').addEventListener('click',()=>{ $('#chatSearch').value=''; searchQuery=''; $('#clearSearch').hidden=true; renderSearch(); renderHistory(); });
  $('#projectsToggle').addEventListener('click',e=>{ const b=$('#projectsBody'); b.hidden=!b.hidden; e.currentTarget.setAttribute('aria-expanded',String(!b.hidden)); });
  $('#allChatsToggle').addEventListener('click',e=>{ const b=$('#historyList'); b.hidden=!b.hidden; e.currentTarget.setAttribute('aria-expanded',String(!b.hidden)); });
  $('#newProjectBtn').addEventListener('click',newProjectModal);
  $('#communityBtn').addEventListener('click',()=>window.open('https://chat.qwen.ai/community','_blank'));
  $('#coderBtn').addEventListener('click',()=>window.open('https://coder.qwen.ai','_blank'));
  $('#createBtn').addEventListener('click',()=>window.open('https://create.qwen.com','_blank'));
  // manage bar
  $('#manageSelectAll').addEventListener('change',e=>{ manageSel.clear(); if(e.target.checked) visibleSessions().forEach(s=>manageSel.add(s.id)); renderHistory(); });
  $('#manageCancel').addEventListener('click',()=>setManageMode(false));
  $('#manageDelete').addEventListener('click',()=>{ if(!manageSel.size){ toast('Select chats first'); return; }
    confirmModal('Delete selected chats?',manageSel.size+' chat(s) will be permanently deleted.','Delete',()=>{ sessions=sessions.filter(s=>!manageSel.has(s.id)); if(manageSel.has(currentId)) currentId=null; saveSessions(); setManageMode(false); renderAll(); }); });
  // profile
  $('#profileBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#profileMenu'); const was=m.hidden; closePopovers(); m.hidden=!was; });
  $('#profileMenu').addEventListener('click',e=>{ const b=e.target.closest('[data-profile-action]'); if(!b) return; closePopovers();
    const a=b.dataset.profileAction;
    if(a==='settings') openSettings(); else if(a==='usage') openSettingsPage('usage');
    else if(a==='upgrade') openUpgrade(); else if(a==='archived') archivedModal();
    else if(a==='support') openModal({title:'Customer Service Center', body:'<p>JepongDevxyz AI has no help-center backend yet. For account and app help, use Settings → About → Suggestions — your note is saved on this device.</p>', actions:[{label:'Close', kind:'primary', onClick:()=>closeModal()}]});
    else if(a==='logout'){ temporary=false; tempSession=null; currentId=null; renderAll(); toast('Signed out of the local profile'); } });
  $('#upgradeBtn').addEventListener('click',openUpgrade);
  $('#topUpgradeBtn').addEventListener('click',openUpgrade);
  // top bar
  $('#tempChatBtn').addEventListener('click',()=>{ temporary=!temporary; if(temporary) tempSession=null; exitShareMode(); renderAll(); /* Qwen shows no toast/pill for Temporary Chat — the banner explains it. */ });
  $('#currentChatMenuBtn').addEventListener('click',e=>{ e.stopPropagation(); const s=currentSession(); if(s&&!temporary){ const r=e.currentTarget.getBoundingClientRect(); showChatMenu(s,r.left-170,r.bottom+4); } });
  $('#modelBtn').addEventListener('click',e=>{ e.stopPropagation(); const p=$('#modelPanel'); const was=p.hidden; closePopovers(); p.hidden=!was; if(!p.hidden) renderModelPanel(); });
  $('#expandModelsBtn').addEventListener('click',()=>{ modelsExpanded=true; renderModelPanel(); });
  $('#modelPanel').addEventListener('click',e=>e.stopPropagation());
  // composer
  const form=$('#composer'), input=$('#composerInput');
  form.addEventListener('submit',e=>{ e.preventDefault(); sendCurrent(); });
  input.addEventListener('input',()=>{ autosize(); updateSend(); });
  input.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendCurrent(); } });
  input.addEventListener('paste',e=>{ if(!settings.interface.pasteAsFile) return; const t=(e.clipboardData||window.clipboardData); const txt=t&&t.getData?t.getData('text'):''; if(txt&&txt.length>1000){ e.preventDefault(); attachments.push({name:'pasted-text.txt', mimeType:'text/plain', kind:'text/plain', size:txt.length, extractedText:txt.slice(0,200000)}); renderAttachments(); updateSend(); toast('Large text attached as a file'); } });
  $('#stopBtn').addEventListener('click',()=>{ if(aborter) aborter.abort(); });
  $('#micBtn').addEventListener('click',toggleMic);
  $('#toolsBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#toolsMenu'); const was=m.hidden; closePopovers(); m.hidden=!was;
    /* Keep the open menu fully on screen: when it opens downward from the centred
       home composer, the CSS cap (100dvh - 110px) ignores the menu's top offset and
       lets its bottom run past the viewport. Clamp to the space actually available;
       the menu's own overflow-y:auto then scrolls (e.g. with More expanded). */
    if(!m.hidden){ const r=m.getBoundingClientRect(); const cap=parseFloat(getComputedStyle(m).maxHeight)||480; const avail=innerHeight-r.top-8; m.style.maxHeight=Math.max(180,Math.min(cap,avail))+'px'; } });
  $('#moreToolsBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#moreToolsMenu'); m.hidden=!m.hidden; e.currentTarget.setAttribute('aria-expanded',String(!m.hidden));
    if(!m.hidden){ m.style.left=''; m.style.right=''; let r=m.getBoundingClientRect();
      if(r.right>innerWidth-8){ m.style.left='auto'; m.style.right='calc(100% + 8px)'; r=m.getBoundingClientRect();
        /* Flipping left only helps when the flipped menu stays on screen;
           on narrow screens fall back to the in-menu placement (right:0). */
        if(r.left<8){ m.style.left='auto'; m.style.right='0'; } }
      else if(r.left<8){ m.style.left='0'; m.style.right='auto'; } } });
  $('#toolsMenu').addEventListener('click',e=>e.stopPropagation());
  $$('#toolsMenu [data-tool]').forEach(b=>b.addEventListener('click',()=>{ const t=b.dataset.tool;
    if(t==='upload'){ closePopovers(); $('#fileInput').click(); return; }
    if(t==='web'){ settings.webSearch=!settings.webSearch; saveSettings(); closePopovers(); renderAll(); toast(settings.webSearch?'Web search on':'Web search off'); return; }
    activeTool=activeTool===t?null:t; closePopovers(); renderAll();
    if(t==='image'&&!(settings.advancedEnabled!==false&&settings.advanced.imageGeneration)){ toast('Image generation is off in Settings → Personalization → Advanced'); activeTool=null; renderAll(); return; }
    if(activeTool) toast('Mode: '+(b.dataset.modeLabel||b.textContent.trim().replace(/\s+/g,' '))); input.focus(); }));
  $('#toolsEnabledToggle').addEventListener('click',e=>{ e.stopPropagation(); settings.toolsEnabled=!settings.toolsEnabled; saveSettings(); e.currentTarget.setAttribute('aria-checked',String(settings.toolsEnabled)); });
  $('#responseModeBtn').addEventListener('click',e=>{ e.stopPropagation(); const m=$('#modeMenu'); const was=m.hidden; closePopovers(); m.hidden=!was; });
  $('#modeMenu').addEventListener('click',e=>e.stopPropagation());
  $$('#modeMenu [data-response-mode]').forEach(b=>b.addEventListener('click',()=>{ settings.responseMode=b.dataset.responseMode; saveSettings(); closePopovers(); renderAll(); }));
  $('#fileInput').addEventListener('change',e=>{ addFiles(e.target.files); e.target.value=''; });
  // share bar
  $('#shareSelectAll').addEventListener('change',e=>{ const s=currentSession(); if(!s) return; shareSel.clear(); if(e.target.checked) s.messages.forEach(m=>shareSel.add(m.id)); renderMessages(); updateShareBar(); });
  $('#shareCancel').addEventListener('click',exitShareMode);
  $('#shareCopy').addEventListener('click',()=>{ const s=currentSession(); if(!s) return; const txt=s.messages.filter(m=>shareSel.has(m.id)).map(m=>(m.role==='user'?'You: ':'JepongDevxyz AI: ')+m.text).join('\n\n'); if(!txt){ toast('Select messages first'); return; } copyText(txt); exitShareMode(); });
  // drawer + settings chrome
  $('#drawerClose').addEventListener('click',closeDrawer);
  $('#drawerScrim').addEventListener('click',closeDrawer);
  // Web Dev panel chrome
  $('#webdevClose').addEventListener('click',closeWebDev);
  $('#webdevScrim').addEventListener('click',closeWebDev);
  $$('#webdevPanel .wd-tab').forEach(b=>b.addEventListener('click',()=>setWebDevTab(b.dataset.wdTab)));
  $('#webdevRefresh').addEventListener('click',refreshWebDev);
  $('#webdevFull').addEventListener('click',webdevFullscreen);
  $('#webdevDesktop').addEventListener('click',()=>setWebDevDevice('desktop'));
  $('#webdevMobile').addEventListener('click',()=>setWebDevDevice('mobile'));
  $('#settingsBack').addEventListener('click',()=>settingsGoBack());
  $('#settingsClose').addEventListener('click',()=>settingsGoBack());
  if('speechSynthesis' in window){ try{ speechSynthesis.addEventListener('voiceschanged',()=>{ if(!$('#settingsPage').hidden && settingsPageKey==='voice') renderSettings(); }); }catch(e){} }
  // import
  $('#importInput').addEventListener('change',e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ try{ const data=JSON.parse(String(r.result)); const arr=Array.isArray(data)?data:data.sessions; if(!Array.isArray(arr)) throw new Error('bad format');
      let n=0; arr.forEach(s=>{ if(s&&s.id&&Array.isArray(s.messages)&&!getSession(s.id)){ sessions.push(Object.assign({title:'Imported chat', createdAt:Date.now(), updatedAt:Date.now(), pinned:false, archived:false},s)); n++; } });
      saveSessions(); renderAll(); toast('Imported '+n+' chat(s)'); }catch(err){ toast('Import failed: not a valid chats file'); } };
    r.readAsText(f); });
  // scroller stickiness + global close
  $('#chatScroller').addEventListener('scroll',e=>{ const sc=e.target; stickBottom=sc.scrollHeight-sc.scrollTop-sc.clientHeight<120; });
  document.addEventListener('click',e=>{ if(!e.target.closest('.model-wrap')&&!e.target.closest('#toolsMenu')&&!e.target.closest('#composer')&&!e.target.closest('.profile-block')) closePopovers(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ closePopovers(); closeCtx(); } });
  renderAll(); updateSend(); autosize();
}
init();
