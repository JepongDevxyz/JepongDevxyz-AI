/* ============================================================
   affect-ui.js — 12 AI UI components for JepongDevxyz AI (vanilla JS)
   ToolCallCard + ThinkingLoader adapted from affectUI public registry
   (MIT); the other 10 are original implementations built from the
   public API specs. No dependencies. Single IIFE.
   ============================================================ */
(function () {
'use strict';
if (window.__jdAffectUiLoaded) return;
window.__jdAffectUiLoaded = true;

/* ---------------- CSS ---------------- */
var CSS = [
'.jd-afx{--af-ink:#1a1a1a;--af-text:#555;--af-muted:#8a8a8a;--af-bg:#fff;--af-bg2:#fafafa;',
'--af-line:#e6e6e6;--af-hover:#f4f4f4;--af-tile:#f1f1f1;--af-code:#f8f8f8;',
'--af-red:#c8372d;--af-redbg:rgba(200,55,45,.07);--af-green:#18794e;--af-greenbg:rgba(24,121,78,.08);',
'--af-amber:#9a6200;--af-amberbg:rgba(154,98,0,.08);--af-blue:#0b5fff;--af-bluebg:rgba(11,95,255,.07);',
'--af-key:#1a1a1a;--af-str:#0f7b6c;--af-num:#b25b0c;--af-lit:#6e56cf;',
'--af-ease:cubic-bezier(.22,1,.36,1);--af-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace;',
'box-sizing:border-box;color:var(--af-text);',
'font-family:"Inter",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;',
'font-size:13.5px;line-height:1.45;letter-spacing:-.006em;-webkit-font-smoothing:antialiased;}',
':where(.dark,[data-theme="dark"]) .jd-afx{--af-ink:#ececec;--af-text:#a8a8a8;--af-muted:#777;',
'--af-bg:#17171a;--af-bg2:#1d1d21;--af-line:rgba(255,255,255,.1);--af-hover:#222227;--af-tile:#26262b;',
'--af-code:#1d1d21;--af-red:#e0685d;--af-redbg:rgba(224,104,93,.1);--af-green:#4cc38a;',
'--af-greenbg:rgba(76,195,138,.1);--af-amber:#d9a441;--af-amberbg:rgba(217,164,65,.12);',
'--af-blue:#5b8def;--af-bluebg:rgba(91,141,239,.12);--af-key:#ececec;--af-str:#4cc3ae;--af-num:#e09a4c;--af-lit:#a58cf2;}',
'.jd-afx *{box-sizing:border-box;}',
'.jd-afx button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;padding:0;}',
'.jd-afx-card{background:var(--af-bg);border:1px solid var(--af-line);border-radius:12px;overflow:hidden;}',
'.jd-afx-head{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;min-height:44px;text-align:left;border-radius:12px;transition:background .15s;}',
'.jd-afx-head:hover{background:var(--af-hover);}',
'.jd-afx-tile{display:grid;place-items:center;flex:none;width:28px;height:28px;border-radius:8px;background:var(--af-tile);border:1px solid var(--af-line);color:var(--af-ink);}',
'.jd-afx-tile svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-main{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;}',
'.jd-afx-mono{font-family:var(--af-mono);font-size:12.5px;color:var(--af-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
'.jd-afx-sub{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--af-muted);font-size:12.5px;}',
'.jd-afx-chev{flex:none;width:16px;height:16px;color:var(--af-muted);transition:transform .25s var(--af-ease);}',
'.jd-afx-chev svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx[data-open="1"] .jd-afx-chev{transform:rotate(180deg);}',
'.jd-afx-collapse{display:grid;grid-template-rows:0fr;transition:grid-template-rows .3s var(--af-ease);}',
'.jd-afx[data-open="1"] .jd-afx-collapse{grid-template-rows:1fr;}',
'.jd-afx-collapse>div{overflow:hidden;min-height:0;}',
'.jd-afx-body{padding:4px 12px 12px;}',
'.jd-afx-sec{margin-top:10px;}',
'.jd-afx-sec-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}',
'.jd-afx-label{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--af-muted);}',
'.jd-afx-code{margin:0;padding:10px 12px;background:var(--af-code);border:1px solid var(--af-line);border-radius:8px;',
'font-family:var(--af-mono);font-size:12px;line-height:1.55;color:var(--af-text);overflow:auto;white-space:pre-wrap;word-break:break-word;}',
'.jd-afx-code[data-capped="1"]{position:relative;overflow:hidden;}',
'.jd-afx-code[data-capped="1"]::after{content:"";position:absolute;left:0;right:0;bottom:0;height:44px;',
'background:linear-gradient(transparent,var(--af-code));pointer-events:none;}',
'.jd-afx-t-key{color:var(--af-key);}.jd-afx-t-str{color:var(--af-str);}.jd-afx-t-num{color:var(--af-num);}.jd-afx-t-lit{color:var(--af-lit);}',
'.jd-afx-copy{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--af-muted);padding:4px 8px;border-radius:6px;}',
'.jd-afx-copy:hover{background:var(--af-hover);color:var(--af-ink);}',
'.jd-afx-copy svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-more{display:block;margin:6px auto 0;font-size:12.5px;color:var(--af-muted);padding:4px 10px;border-radius:6px;}',
'.jd-afx-more:hover{color:var(--af-ink);background:var(--af-hover);}',
'.jd-afx-err{display:flex;gap:10px;align-items:flex-start;background:var(--af-redbg);border:1px solid var(--af-red);border-radius:8px;padding:10px 12px;margin-top:10px;}',
'.jd-afx-err svg{flex:none;width:16px;height:16px;color:var(--af-red);fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;}',
'.jd-afx-err p{margin:0;flex:1;font-size:12.5px;color:var(--af-text);word-break:break-word;}',
'.jd-afx-retry{flex:none;display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--af-ink);',
'border:1px solid var(--af-line);border-radius:8px;padding:6px 12px;background:var(--af-bg);}',
'.jd-afx-retry:hover{background:var(--af-hover);}',
'.jd-afx-retry svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-spin{width:15px;height:15px;flex:none;}',
'.jd-afx-spin circle{fill:none;stroke:var(--af-line);stroke-width:2.4;}',
'.jd-afx-spin path{fill:none;stroke:var(--af-ink);stroke-width:2.4;stroke-linecap:round;animation:jd-afx-rot .8s linear infinite;transform-origin:center;}',
'@keyframes jd-afx-rot{to{transform:rotate(360deg);}}',
'.jd-afx-ok{width:15px;height:15px;flex:none;color:var(--af-green);fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-time{font-size:12px;color:var(--af-muted);font-variant-numeric:tabular-nums;white-space:nowrap;}',
'.jd-afx-status{display:inline-flex;align-items:center;gap:7px;flex:none;}',
'.jd-afx-pill{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px;white-space:nowrap;}',
'.jd-afx-pill[data-k="run"]{background:var(--af-bluebg);color:var(--af-blue);}',
'.jd-afx-pill[data-k="ok"]{background:var(--af-greenbg);color:var(--af-green);}',
'.jd-afx-pill[data-k="err"]{background:var(--af-redbg);color:var(--af-red);}',
'.jd-afx-pill[data-k="wait"]{background:var(--af-tile);color:var(--af-muted);}',
'.jd-afx-pill[data-k="warn"]{background:var(--af-amberbg);color:var(--af-amber);}',
'.jd-afx-dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex:none;}',
'.jd-afx-dot[data-pulse="1"]{animation:jd-afx-pulse 1.2s ease-in-out infinite;}',
'@keyframes jd-afx-pulse{0%,100%{opacity:1;}50%{opacity:.35;}}',
'.jd-afx-row{display:flex;align-items:center;gap:10px;}',
'.jd-afx-list{list-style:none;margin:0;padding:0;}',
'.jd-afx-note{font-size:12px;color:var(--af-muted);}',
'.jd-afx-input{width:100%;background:var(--af-bg);border:1px solid var(--af-line);border-radius:8px;color:var(--af-ink);',
'font:inherit;font-size:13px;padding:8px 10px;outline:none;}',
'.jd-afx-input:focus{border-color:var(--af-blue);}',
'.jd-afx-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:600;',
'padding:8px 14px;border-radius:9px;border:1px solid var(--af-line);background:var(--af-bg);color:var(--af-ink);transition:background .15s;}',
'.jd-afx-btn:hover{background:var(--af-hover);}',
'.jd-afx-btn[data-p="1"]{background:var(--af-ink);color:var(--af-bg);border-color:var(--af-ink);}',
'.jd-afx-btn[data-p="1"]:hover{opacity:.88;background:var(--af-ink);}',
'.jd-afx-btn[data-d="1"]{color:var(--af-red);border-color:var(--af-red);}',
'.jd-afx-btn[data-d="1"]:hover{background:var(--af-redbg);}',
'.jd-afx-btn svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-btn:disabled{opacity:.45;cursor:default;}',
'.jd-afx-iconbtn{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:8px;color:var(--af-muted);flex:none;}',
'.jd-afx-iconbtn:hover{background:var(--af-hover);color:var(--af-ink);}',
'.jd-afx-iconbtn svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-iconbtn[data-on="1"]{color:var(--af-blue);background:var(--af-bluebg);}',
/* thinking loader */
'.jd-afx-tl{display:inline-flex;align-items:center;gap:9px;height:34px;padding:0 15px 0 12px;border-radius:999px;',
'background:var(--af-bg);border:1px solid var(--af-line);font-size:14px;color:var(--af-muted);vertical-align:middle;}',
'.jd-afx-tl[data-size="sm"]{height:28px;font-size:13px;padding:0 12px 0 10px;gap:7px;}',
'.jd-afx-tl[data-variant="plain"]{border:0;background:none;padding:0;}',
'.jd-afx-tl-ic{position:relative;flex:none;width:15px;height:15px;}',
'.jd-afx-tl[data-size="sm"] .jd-afx-tl-ic{width:13px;height:13px;}',
'.jd-afx-tl-ic svg{position:absolute;inset:0;width:100%;height:100%;transition:opacity .24s,transform .42s var(--af-ease);}',
'.jd-afx-tl-ic .jd-afx-rays line{stroke:var(--af-ink);stroke-width:1.6;stroke-linecap:round;opacity:.18;animation:jd-afx-ray .8s linear infinite;}',
'.jd-afx-tl-ic .jd-afx-ck{opacity:0;transform:scale(.6);fill:none;stroke:var(--af-green);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-tl-ic .jd-afx-ck path{stroke-dasharray:1;stroke-dashoffset:1;}',
'.jd-afx-tl[data-done="1"] .jd-afx-rays{opacity:0;transform:scale(.6) rotate(-45deg);}',
'.jd-afx-tl[data-done="1"] .jd-afx-ck{opacity:1;transform:none;}',
'.jd-afx-tl[data-done="1"] .jd-afx-ck path{animation:jd-afx-draw .36s var(--af-ease) .12s forwards;}',
'.jd-afx-tl-tx{position:relative;display:block;height:1.3em;overflow:hidden;transition:width .46s var(--af-ease);}',
'.jd-afx-tl-lb{position:absolute;top:0;left:0;line-height:1.3em;white-space:nowrap;}',
'.jd-afx-tl[data-done="1"] .jd-afx-tl-lb{color:var(--af-ink);}',
'.jd-afx-tl-in{animation:jd-afx-tlin .46s var(--af-ease) both;}',
'.jd-afx-tl-out{animation:jd-afx-tlout .32s var(--af-ease) both;}',
'.jd-afx-shine::after{content:attr(data-text);position:absolute;inset:0;white-space:nowrap;color:transparent;',
'background:linear-gradient(90deg,transparent 38%,rgba(255,255,255,.85) 50%,transparent 62%) 100% 0/300% 100% no-repeat;',
'-webkit-background-clip:text;background-clip:text;animation:jd-afx-sweep 1.8s linear infinite;pointer-events:none;}',
':where(.dark,[data-theme="dark"]) .jd-afx-shine::after{background-image:linear-gradient(90deg,transparent 38%,rgba(255,255,255,.95) 50%,transparent 62%);}',
'@keyframes jd-afx-ray{0%{opacity:1;}100%{opacity:.18;}}',
'@keyframes jd-afx-tlin{from{opacity:0;transform:translateY(70%);filter:blur(3px);}to{opacity:1;transform:none;filter:none;}}',
'@keyframes jd-afx-tlout{from{opacity:1;transform:none;filter:none;}to{opacity:0;transform:translateY(-70%);filter:blur(3px);}}',
'@keyframes jd-afx-draw{to{stroke-dashoffset:0;}}',
'@keyframes jd-afx-sweep{from{background-position:100% 0;}to{background-position:0% 0;}}',
/* steps */
'.jd-afx-step{display:flex;gap:10px;padding:8px 0;align-items:flex-start;}',
'.jd-afx-step-ic{flex:none;width:20px;height:20px;margin-top:1px;display:grid;place-items:center;color:var(--af-muted);}',
'.jd-afx-step-ic svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}',
'.jd-afx-step-tx{flex:1;min-width:0;}',
'.jd-afx-step-ti{font-weight:600;color:var(--af-ink);font-size:13px;}',
'.jd-afx-step-de{font-size:12.5px;color:var(--af-muted);margin-top:2px;}',
'.jd-afx-srcs{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}',
'.jd-afx-src{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--af-muted);',
'border:1px solid var(--af-line);border-radius:999px;padding:2px 9px;background:var(--af-bg2);cursor:default;}',
'.jd-afx-src svg{width:11px;height:11px;fill:none;stroke:currentColor;stroke-width:1.6;}',
/* citations */
'.jd-afx-cite{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 4px;border-radius:6px;',
'background:var(--af-bluebg);color:var(--af-blue);font-size:10.5px;font-weight:700;vertical-align:2px;cursor:pointer;margin:0 1px;}',
'.jd-afx-cite:hover{background:var(--af-blue);color:#fff;}',
'.jd-afx-pop{position:absolute;z-index:50;max-width:min(320px,86vw);background:var(--af-bg);border:1px solid var(--af-line);',
'border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.14);padding:10px 12px;font-size:12.5px;}',
'.jd-afx-pop b{color:var(--af-ink);display:block;margin-bottom:4px;font-size:12.5px;}',
'.jd-afx-pop a{color:var(--af-blue);font-size:12px;word-break:break-all;}',
/* diff */
'.jd-afx-diff{font-size:13px;line-height:1.7;color:var(--af-text);}',
'.jd-afx-del{background:var(--af-redbg);color:var(--af-red);border-radius:4px;padding:1px 3px;text-decoration:line-through;}',
'.jd-afx-ins{background:var(--af-greenbg);color:var(--af-green);border-radius:4px;padding:1px 3px;}',
'.jd-afx-chg{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--af-line);border-radius:9px;margin-top:8px;background:var(--af-bg2);}',
'.jd-afx-chg-tx{flex:1;min-width:0;}',
'.jd-afx-mini{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;padding:4px 9px;border-radius:7px;border:1px solid var(--af-line);color:var(--af-muted);}',
'.jd-afx-mini:hover{background:var(--af-hover);color:var(--af-ink);}',
'.jd-afx-mini[data-a="1"]{color:var(--af-green);border-color:var(--af-green);}',
'.jd-afx-mini[data-r="1"]{color:var(--af-red);border-color:var(--af-red);}',
/* dial */
'.jd-afx-dial{display:flex;gap:0;border:1px solid var(--af-line);border-radius:12px;overflow:hidden;}',
'.jd-afx-dial button{flex:1;padding:10px 6px;font-size:12px;font-weight:600;color:var(--af-muted);background:var(--af-bg2);transition:all .18s;}',
'.jd-afx-dial button+button{border-left:1px solid var(--af-line);}',
'.jd-afx-dial button[data-on="1"]{background:var(--af-ink);color:var(--af-bg);}',
'.jd-afx-dial small{display:block;font-weight:400;font-size:10.5px;opacity:.75;margin-top:2px;}',
'.jd-afx-risk{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;padding:2px 8px;border-radius:999px;}',
'.jd-afx-risk[data-r="low"]{background:var(--af-greenbg);color:var(--af-green);}',
'.jd-afx-risk[data-r="medium"]{background:var(--af-amberbg);color:var(--af-amber);}',
'.jd-afx-risk[data-r="high"]{background:var(--af-redbg);color:var(--af-red);}',
/* context bar */
'.jd-afx-ctxbar{height:9px;border-radius:999px;background:var(--af-tile);border:1px solid var(--af-line);overflow:hidden;}',
'.jd-afx-ctxfill{height:100%;border-radius:999px;background:var(--af-blue);transition:width .5s var(--af-ease);}',
'.jd-afx-ctxfill[data-w="1"]{background:var(--af-amber);}',
'.jd-afx-ctxfill[data-w="2"]{background:var(--af-red);}',
/* model picker */
'.jd-afx-mp{position:relative;display:inline-block;min-width:0;}',
'.jd-afx-mp-panel{position:absolute;z-index:60;top:calc(100% + 6px);left:0;min-width:250px;max-width:92vw;',
'background:var(--af-bg);border:1px solid var(--af-line);border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.14);overflow:hidden;}',
'.jd-afx-mp-item{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;padding:9px 12px;}',
'.jd-afx-mp-item:hover{background:var(--af-hover);}',
'.jd-afx-mp-item[data-on="1"]{background:var(--af-bluebg);}',
'.jd-afx-mp-item b{color:var(--af-ink);font-size:13px;font-weight:600;}',
'.jd-afx-mp-item span{font-size:11.5px;color:var(--af-muted);}',
/* misc */
'.jd-afx-q{font-size:15px;font-weight:700;color:var(--af-ink);margin:0 0 8px;}',
'.jd-afx-ans{font-size:13.5px;color:var(--af-text);line-height:1.65;}',
'.jd-afx-ans p{margin:0 0 10px;}',
'.jd-afx-fu{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;}',
'.jd-afx-fu button{font-size:12.5px;border:1px solid var(--af-line);border-radius:999px;padding:7px 13px;color:var(--af-text);background:var(--af-bg2);}',
'.jd-afx-fu button:hover{border-color:var(--af-blue);color:var(--af-blue);}',
'.jd-afx-foot{display:flex;align-items:center;gap:4px;margin-top:12px;padding-top:10px;border-top:1px solid var(--af-line);}',
'.jd-afx-foot .jd-afx-sp{flex:1;}',
'.jd-afx-reasons{position:absolute;z-index:60;background:var(--af-bg);border:1px solid var(--af-line);border-radius:10px;',
'box-shadow:0 8px 24px rgba(0,0,0,.13);padding:6px;min-width:200px;}',
'.jd-afx-reasons button{display:block;width:100%;text-align:left;font-size:12.5px;padding:8px 10px;border-radius:7px;color:var(--af-text);}',
'.jd-afx-reasons button:hover{background:var(--af-hover);color:var(--af-ink);}',
'.jd-afx-nchip{display:inline-flex;align-items:center;gap:6px;background:var(--af-bg2);border:1px solid var(--af-line);',
'border-radius:8px;padding:6px 10px;font-size:12.5px;margin:0 6px 6px 0;}',
'.jd-afx-nchip button{color:var(--af-muted);font-size:14px;line-height:1;}',
'.jd-afx-nchip button:hover{color:var(--af-red);}',
'.jd-afx-num{flex:none;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;',
'background:var(--af-tile);border:1px solid var(--af-line);color:var(--af-muted);}',
'.jd-afx-step[data-st="done"] .jd-afx-num{background:var(--af-greenbg);border-color:var(--af-green);color:var(--af-green);}',
'.jd-afx-step[data-st="active"] .jd-afx-num{background:var(--af-bluebg);border-color:var(--af-blue);color:var(--af-blue);}',
'.jd-afx-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}',
'@media (max-width:480px){.jd-afx{font-size:13px;}.jd-afx-q{font-size:14px;}.jd-afx-dial button{font-size:11px;}}',
'@media (prefers-reduced-motion:reduce){.jd-afx *,.jd-afx *::after{animation-duration:1ms!important;transition-duration:1ms!important;}}'
].join('\n');

function injectCSS() {
  if (document.getElementById('jdAfxCss')) return;
  var st = document.createElement('style');
  st.id = 'jdAfxCss';
  st.textContent = CSS;
  document.head.appendChild(st);
}

/* ---------------- helpers ---------------- */
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function fmtMs(ms, live) {
  ms = Math.max(0, ms || 0);
  if (!live && ms < 1000) return Math.max(1, Math.round(ms)) + 'ms';
  if (ms < 60000) return (Math.floor(ms / 100) / 10).toFixed(1) + 's';
  var s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
}
function fmtTokens(n) {
  n = n || 0;
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}
function pretty(v) {
  if (typeof v === 'string') {
    var t = v.trim();
    if ((t.charAt(0) === '{' || t.charAt(0) === '[')) {
      try { return { text: JSON.stringify(JSON.parse(t), null, 2), json: true }; } catch (e) {}
    }
    return { text: v, json: false };
  }
  try {
    var s = JSON.stringify(v, null, 2);
    return s === undefined ? { text: String(v), json: false } : { text: s, json: true };
  } catch (e) { return { text: String(v), json: false }; }
}
/* tiny JSON tokenizer -> spans (own implementation) */
function hlJson(text) {
  var out = '', re = /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, m, last = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out += esc(text.slice(last, m.index));
    var cls = null;
    if (m[1] && m[2]) { out += '<span class="jd-afx-t-key">' + esc(m[1]) + '</span>' + esc(m[2]); }
    else if (m[1]) cls = 'jd-afx-t-str';
    else if (m[3]) cls = 'jd-afx-t-lit';
    else cls = 'jd-afx-t-num';
    if (cls) out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}
function raf(fn) {
  if (typeof requestAnimationFrame === 'function') return requestAnimationFrame(fn);
  return setTimeout(fn, 16);
}
function copyText(t) {
  function fallback() {
    try {
      var a = document.createElement('textarea');
      a.value = t; a.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(a); a.select();
      var ok = document.execCommand('copy'); a.remove(); return ok;
    } catch (e) { return false; }
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(t).then(function () { return true; }, fallback);
    }
  } catch (e) {}
  return Promise.resolve(fallback());
}
function copyBtn(label, getText) {
  var b = el('button', 'jd-afx-copy', I.copy + '<span>Copy</span>');
  b.type = 'button'; b.title = 'Copy ' + label;
  b.addEventListener('click', function (ev) {
    ev.stopPropagation();
    copyText(getText()).then(function (ok) {
      if (!ok) return;
      b.querySelector('span').textContent = 'Copied';
      setTimeout(function () { b.querySelector('span').textContent = 'Copy'; }, 1400);
    });
  });
  return b;
}
/* stopwatch: ticks cb(ms) every 100ms while running */
function stopwatch(cb) {
  var start = null, base = 0, timer = null;
  function tick() { cb(base + (start != null ? Date.now() - start : 0)); }
  return {
    start: function (at) { if (start == null) { start = at || Date.now(); tick(); timer = setInterval(tick, 100); } },
    stop: function () { if (start != null) { base += Date.now() - start; start = null; } if (timer) { clearInterval(timer); timer = null; } tick(); },
    reset: function () { this.stop(); base = 0; start = null; },
    value: function () { return base + (start != null ? Date.now() - start : 0); }
  };
}

/* ---------------- icons ---------------- */
var I = {
  wrench: '<svg viewBox="0 0 16 16"><path d="M10.2 2.4a3.5 3.5 0 0 0-4.3 4.6L2.6 10.3a1.4 1.4 0 0 0 2 2L7.9 9a3.5 3.5 0 0 0 4.6-4.3l-2 2-1.6-.4-.4-1.6 1.7-2.3Z"/></svg>',
  check: '<svg viewBox="0 0 16 16"><path d="M3.5 8.4 6.6 11.3 12.5 4.9" pathLength="1"/></svg>',
  err: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.4M8 10.9v.1"/></svg>',
  chev: '<svg viewBox="0 0 16 16"><path d="M4.5 6.25 8 9.75l3.5-3.5"/></svg>',
  copy: '<svg viewBox="0 0 16 16"><rect x="5.25" y="5.25" width="8" height="8" rx="2"/><path d="M10.75 5.25v-1a1.5 1.5 0 0 0-1.5-1.5h-4.5a2 2 0 0 0-2 2v4.5a1.5 1.5 0 0 0 1.5 1.5h1"/></svg>',
  retry: '<svg viewBox="0 0 16 16"><path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.77"/><path d="M2.5 2.5v2.75h2.75"/></svg>',
  spin: '<svg class="jd-afx-spin" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.75"/><path d="M8 2.25a5.75 5.75 0 0 1 5.75 5.75"/></svg>',
  up: '<svg viewBox="0 0 16 16"><path d="M8 13.5v-9M4.5 7.5 8 4l3.5 3.5"/></svg>',
  down: '<svg viewBox="0 0 16 16"><path d="M8 2.5v9M4.5 8.5 8 12l3.5-3.5"/></svg>',
  pause: '<svg viewBox="0 0 16 16"><path d="M6 3.5v9M10 3.5v9"/></svg>',
  play: '<svg viewBox="0 0 16 16"><path d="M5.5 3.8v8.4L12.5 8Z"/></svg>',
  stop: '<svg viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8" rx="1.5"/></svg>',
  pin: '<svg viewBox="0 0 16 16"><path d="M9.5 2.5 13.5 6.5 9.8 7.6l-3.4 3.4-.7.7-.7-.7.7-.7 3.4-3.4Z"/><path d="M5 13.5c.8-2.4.4-4.6-.5-6.5"/></svg>',
  lock: '<svg viewBox="0 0 16 16"><rect x="4" y="7" width="8" height="6" rx="1.5"/><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7"/></svg>',
  search: '<svg viewBox="0 0 16 16"><circle cx="7" cy="7" r="4.5"/><path d="m10.5 10.5 3 3"/></svg>',
  link: '<svg viewBox="0 0 16 16"><path d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.54 3.54 0 0 0-5-5l-1 1"/><path d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.54 3.54 0 0 0 5 5l1-1"/></svg>',
  x: '<svg viewBox="0 0 16 16"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg>'
};

/* ---------------- 1. ToolCallCard ---------------- */
function codeSection(label, value, maxH) {
  var p = pretty(value);
  var sec = el('div', 'jd-afx-sec');
  var head = el('div', 'jd-afx-sec-h');
  head.appendChild(el('span', 'jd-afx-label', esc(label)));
  head.appendChild(copyBtn(label.toLowerCase(), function () { return p.text; }));
  sec.appendChild(head);
  var pre = el('pre', 'jd-afx-code');
  pre.innerHTML = '<code>' + (p.json ? hlJson(p.text) : esc(p.text)) + '</code>';
  sec.appendChild(pre);
  var full = false;
  function measure() {
    var capped = pre.scrollHeight > maxH + 24;
    pre.dataset.capped = capped && !full ? '1' : '';
    pre.style.maxHeight = capped ? (full ? pre.scrollHeight + 'px' : maxH + 'px') : '';
    more.style.display = capped ? '' : 'none';
  }
  var more = el('button', 'jd-afx-more', 'Show all');
  more.type = 'button';
  more.addEventListener('click', function () {
    full = !full; more.textContent = full ? 'Show less' : 'Show all'; measure();
  });
  sec.appendChild(more);
  raf(measure);
  return sec;
}

function ToolCallCard(o) {
  o = o || {};
  var maxH = o.maxCodeHeight || 220;
  var root = el('div', 'jd-afx jd-afx-card jd-afx-tc');
  var state = {
    status: o.status || 'running',
    duration: o.duration, startedAt: o.startedAt,
    open: !!o.defaultOpen, manual: false, autoOpened: false
  };
  if (state.status === 'error' && o.openOnError !== false && !state.open) { state.open = true; state.autoOpened = true; }
  root._tc = state;

  var head = el('button', 'jd-afx-head');
  head.type = 'button';
  head.appendChild(el('span', 'jd-afx-tile', o.icon || I.wrench));
  var main = el('span', 'jd-afx-main');
  main.appendChild(el('code', 'jd-afx-mono', esc(o.name || 'tool')));
  if (o.summary) main.appendChild(el('span', 'jd-afx-sub', esc(o.summary)));
  head.appendChild(main);
  var stWrap = el('span', 'jd-afx-status');
  var iconSlot = el('span', 'jd-afx-row');
  iconSlot.style.gap = '0';
  var timeEl = el('span', 'jd-afx-time');
  stWrap.appendChild(iconSlot);
  stWrap.appendChild(timeEl);
  head.appendChild(stWrap);
  head.appendChild(el('span', 'jd-afx-chev', I.chev));
  root.appendChild(head);

  var bodyWrap = el('div', 'jd-afx-collapse');
  var clip = el('div'); var body = el('div', 'jd-afx-body');
  clip.appendChild(body); bodyWrap.appendChild(clip); root.appendChild(bodyWrap);

  var sw = stopwatch(function (ms) { timeEl.textContent = fmtMs(ms, state.status === 'running'); });

  function renderBody() {
    body.innerHTML = '';
    if (state.status === 'error') {
      var eb = el('div', 'jd-afx-err', I.err + '<p>' + esc(state.error || o.error || 'The tool call failed.') + '</p>');
      if (typeof o.onRetry === 'function') {
        var rb = el('button', 'jd-afx-retry', I.retry + '<span>Retry</span>');
        rb.type = 'button';
        rb.addEventListener('click', function (ev) { ev.stopPropagation(); o.onRetry(); });
        eb.appendChild(rb);
      }
      body.appendChild(eb);
    }
    if (state.args !== undefined) body.appendChild(codeSection('Arguments', state.args, maxH));
    else if (o.args !== undefined) body.appendChild(codeSection('Arguments', o.args, maxH));
    if (state.result !== undefined) body.appendChild(codeSection('Result', state.result, maxH));
    else if (o.result !== undefined) body.appendChild(codeSection('Result', o.result, maxH));
    else if (state.status === 'running') {
      var sec = el('div', 'jd-afx-sec');
      sec.appendChild(el('div', 'jd-afx-label', 'Result'));
      sec.appendChild(el('p', 'jd-afx-note', 'Waiting for result…'));
      body.appendChild(sec);
    } else if (state.status === 'success' && o.args === undefined && o.result === undefined) {
      body.appendChild(el('p', 'jd-afx-note', 'No arguments or result.'));
    }
  }

  function paint() {
    root.dataset.status = state.status;
    root.dataset.open = state.open ? '1' : '';
    head.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    iconSlot.innerHTML = state.status === 'running' ? I.spin :
      state.status === 'success' ? I.check.replace('<svg', '<svg class="jd-afx-ok"') :
      I.err.replace('<svg', '<svg class="jd-afx-ok" style="color:var(--af-red)"');
    if (state.status === 'running') { sw.start(state.startedAt); timeEl.textContent = fmtMs(sw.value(), true); }
    else { sw.stop(); timeEl.textContent = state.status === 'error' ? 'Failed' : fmtMs(state.duration != null ? state.duration : sw.value(), false); }
    renderBody();
  }

  head.addEventListener('click', function () {
    state.manual = true; state.autoOpened = false;
    api.toggle();
  });

  var api = {
    el: root,
    toggle: function () { state.open = !state.open; paint(); return state.open; },
    open: function () { state.open = true; paint(); },
    close: function () { state.open = false; paint(); },
    setStatus: function (s, dur) {
      var prev = state.status;
      state.status = s;
      if (dur != null) state.duration = dur;
      if (!state.manual && o.openOnError !== false) {
        if (s === 'error' && !state.open) { state.open = true; state.autoOpened = true; }
        else if (prev === 'error' && state.autoOpened) { state.open = false; state.autoOpened = false; }
      }
      paint();
    },
    setArgs: function (v) { state.args = v; paint(); },
    setResult: function (v, dur) { state.result = v; if (dur != null) state.duration = dur; paint(); },
    setError: function (msg) { state.error = msg; this.setStatus('error'); },
    getStatus: function () { return state.status; },
    getDuration: function () { return state.duration != null ? state.duration : sw.value(); }
  };
  for (var _k in api) { if (api.hasOwnProperty(_k)) root[_k] = api[_k]; }
  paint();
  return root;
}

/* ---------------- 2. ToolCallGroup ---------------- */
function ToolCallGroup(o) {
  o = o || {};
  var defs = o.cards || [];
  var root = el('div', 'jd-afx jd-afx-card');
  var open = !!o.defaultOpen;
  var cards = defs.map(function (d) { return d && d.tagName ? d : ToolCallCard(d); });

  var head = el('button', 'jd-afx-head');
  head.type = 'button';
  var stack = el('span', 'jd-afx-row');
  stack.style.gap = '0';
  head.appendChild(stack);
  var titleEl = el('span', 'jd-afx-mono', '');
  titleEl.style.fontFamily = 'inherit'; titleEl.style.fontWeight = '600';
  head.appendChild(titleEl);
  var timeEl = el('span', 'jd-afx-time');
  head.appendChild(timeEl);
  head.appendChild(el('span', 'jd-afx-chev', I.chev));
  root.appendChild(head);

  var bodyWrap = el('div', 'jd-afx-collapse');
  var clip = el('div'); var list = el('div', 'jd-afx-body');
  list.style.display = 'grid'; list.style.gap = '8px';
  cards.forEach(function (c) { list.appendChild(c.el || c); });
  clip.appendChild(list); bodyWrap.appendChild(clip); root.appendChild(bodyWrap);

  var sw = stopwatch(function (ms) { timeEl.textContent = '· ' + fmtMs(ms, true); });
  function refresh() {
    var n = cards.length;
    var running = cards.some(function (c) { return (c._tc ? c._tc.status : 'success') === 'running'; });
    var failed = cards.filter(function (c) { return (c._tc ? c._tc.status : '') === 'error'; }).length;
    root.dataset.open = open ? '1' : '';
    root.dataset.running = running ? '1' : '';
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    var label = running ? (o.runningLabel || 'Using tools…') : (o.label || ('Used ' + n + ' tool' + (n === 1 ? '' : 's')));
    titleEl.innerHTML = esc(label) + (failed && !running ? ' <span style="color:var(--af-red)">· ' + failed + ' failed</span>' : '');
    stack.innerHTML = '';
    cards.slice(-3).forEach(function (c, i) {
      var t = el('span', 'jd-afx-tile', I.wrench);
      t.style.width = '24px'; t.style.height = '24px';
      t.style.marginLeft = i ? '-8px' : '0';
      stack.appendChild(t);
    });
    if (running) { sw.start(); } else { sw.stop(); timeEl.textContent = '· ' + fmtMs(cards.reduce(function (t, c) { return t + ((c._tc && c._tc.duration) || 0); }, 0) || sw.value(), false); }
  }
  head.addEventListener('click', function () { open = !open; refresh(); });
  var iv = setInterval(refresh, 300);
  refresh();
  root._group = { refresh: refresh, cards: cards, destroy: function () { clearInterval(iv); } };
  return root;
}

/* ---------------- 3. ThinkingLoader ---------------- */
function ThinkingLoader(o) {
  o = o || {};
  var phases = o.phases || ['Thinking', 'Searching the web', 'Reading sources', 'Writing response'];
  var interval = o.interval || 2200, loop = !!o.loop;
  var size = o.size || 'md', variant = o.variant || 'pill';

  var root = el('span', 'jd-afx jd-afx-tl');
  root.setAttribute('role', 'status');
  root.dataset.size = size; root.dataset.variant = variant;

  var rays = '';
  for (var i = 0; i < 8; i++) {
    rays += '<line x1="8" y1="1.75" x2="8" y2="4.75" transform="rotate(' + (i * 45) + ' 8 8)" style="animation-delay:' + ((i - 8) * 100) + 'ms"/>';
  }
  var ic = el('span', 'jd-afx-tl-ic');
  ic.innerHTML = '<svg class="jd-afx-rays" viewBox="0 0 16 16">' + rays + '</svg>' +
    '<svg class="jd-afx-ck" viewBox="0 0 16 16"><path d="M3.5 8.4 6.6 11.3 12.5 4.9" pathLength="1"/></svg>';
  root.appendChild(ic);

  var box = el('span', 'jd-afx-tl-tx');
  root.appendChild(box);

  var st = { step: 0, started: Date.now(), done: !!o.done, seconds: null, key: 0, leaving: null, timer: null };

  function label() {
    if (st.done) {
      var s = st.seconds != null ? st.seconds : Math.max(1, Math.round((Date.now() - st.started) / 1000));
      return typeof o.doneLabel === 'function' ? o.doneLabel(s) : (o.doneLabel || ('Thought for ' + s + 's'));
    }
    var idx = o.phase != null ? o.phase : st.step;
    idx = Math.min(Math.max(idx, 0), phases.length - 1);
    return phases[idx] || '';
  }
  function measure() {
    var cur = box.querySelector('[data-cur="1"]');
    if (cur) box.style.width = (cur.offsetWidth + 1) + 'px';
  }
  function render() {
    var t = label();
    var cur = box.querySelector('[data-cur="1"]');
    if (cur && cur.textContent === t) { measure(); return; }
    box.innerHTML = '';
    if (cur) {
      var out = el('span', 'jd-afx-tl-lb jd-afx-tl-out', esc(cur.textContent));
      out.setAttribute('aria-hidden', 'true');
      box.appendChild(out);
      setTimeout(function () { if (out.parentNode) out.parentNode.removeChild(out); }, 340);
    }
    var lb = el('span', 'jd-afx-tl-lb' + (st.key > 0 ? ' jd-afx-tl-in' : '') + (st.done ? '' : ' jd-afx-shine'), esc(t));
    lb.dataset.cur = '1'; lb.dataset.text = t;
    box.appendChild(lb);
    st.key++;
    raf(measure);
  }
  function tick() {
    if (st.done || o.phase != null || phases.length < 2) return;
    st.timer = setInterval(function () {
      if (st.step + 1 < phases.length) st.step++;
      else if (loop) st.step = 0;
      else { clearInterval(st.timer); return; }
      render();
    }, interval);
  }
  var api = {
    el: root,
    setDone: function (doneLabel) {
      if (doneLabel !== undefined) o.doneLabel = doneLabel;
      st.done = true;
      st.seconds = Math.max(1, Math.round((Date.now() - st.started) / 1000));
      if (st.timer) clearInterval(st.timer);
      root.dataset.done = '1';
      render();
    },
    setPhase: function (i) { o.phase = i; render(); },
    reset: function () {
      st.done = false; st.seconds = null; st.step = 0; st.started = Date.now();
      delete root.dataset.done; render(); tick();
    },
    destroy: function () { if (st.timer) clearInterval(st.timer); }
  };
  for (var _k2 in api) { if (api.hasOwnProperty(_k2)) root[_k2] = api[_k2]; }
  if (st.done) root.dataset.done = '1';
  render(); tick();
  return root;
}

/* ---------------- 4. AIAnswer ---------------- */
function AIAnswer(o) {
  o = o || {};
  var root = el('div', 'jd-afx jd-afx-card');
  var body = el('div', 'jd-afx-body');
  body.style.paddingTop = '14px';
  root.appendChild(body);

  if (o.question) body.appendChild(el('h3', 'jd-afx-q', esc(o.question)));

  if (o.sources && o.sources.length) {
    var srcs = el('div', 'jd-afx-srcs');
    srcs.style.marginBottom = '10px';
    o.sources.forEach(function (s, i) {
      var c = el('a', 'jd-afx-src', I.link + '<span>' + esc(s.title || ('Source ' + (i + 1))) + '</span>');
      c.href = s.url || '#';
      c.target = '_blank'; c.rel = 'noopener';
      c.style.textDecoration = 'none'; c.style.cursor = 'pointer';
      srcs.appendChild(c);
    });
    body.appendChild(srcs);
  }

  var ans = el('div', 'jd-afx-ans');
  if (o.answer) ans.innerHTML = o.answer;
  body.appendChild(ans);

  if (o.followUps && o.followUps.length) {
    var fu = el('div', 'jd-afx-fu');
    o.followUps.forEach(function (q) {
      var b = el('button', '', esc(q));
      b.type = 'button';
      b.addEventListener('click', function () { if (typeof o.onFollowUp === 'function') o.onFollowUp(q); });
      fu.appendChild(b);
    });
    body.appendChild(fu);
  }

  var foot = el('div', 'jd-afx-foot');
  var upB = el('button', 'jd-afx-iconbtn', I.up); upB.type = 'button'; upB.title = 'Good response';
  var downB = el('button', 'jd-afx-iconbtn', I.down); downB.type = 'button'; downB.title = 'Bad response';
  var fbWrap = el('span'); fbWrap.style.position = 'relative';
  fbWrap.appendChild(upB); fbWrap.appendChild(downB);
  foot.appendChild(fbWrap);
  foot.appendChild(el('span', 'jd-afx-sp'));

  function fb(which, reason) {
    upB.dataset.on = which === 'up' ? '1' : '';
    downB.dataset.on = which === 'down' ? '1' : '';
    if (typeof o.onFeedback === 'function') o.onFeedback(which, reason || null);
  }
  upB.addEventListener('click', function () { fb('up'); });
  downB.addEventListener('click', function () {
    var pop = el('div', 'jd-afx-reasons');
    ['Inaccurate', 'Too long', 'Too short', 'Off-topic', 'Other'].forEach(function (r) {
      var b = el('button', '', esc(r)); b.type = 'button';
      b.addEventListener('click', function () { fb('down', r); pop.remove(); });
      pop.appendChild(b);
    });
    pop.style.bottom = '36px'; pop.style.left = '0';
    fbWrap.appendChild(pop);
    setTimeout(function () {
      document.addEventListener('click', function h(ev) {
        if (!pop.contains(ev.target)) { pop.remove(); document.removeEventListener('click', h); }
      });
    }, 0);
  });

  var cpB = el('button', 'jd-afx-iconbtn', I.copy); cpB.type = 'button'; cpB.title = 'Copy answer';
  cpB.addEventListener('click', function () {
    copyText(ans.innerText || ans.textContent || '');
    if (typeof o.onCopy === 'function') o.onCopy();
  });
  var rgB = el('button', 'jd-afx-iconbtn', I.retry); rgB.type = 'button'; rgB.title = 'Regenerate';
  rgB.addEventListener('click', function () { if (typeof o.onRegenerate === 'function') o.onRegenerate(); });
  var stB = el('button', 'jd-afx-iconbtn', I.stop); stB.type = 'button'; stB.title = 'Stop';
  stB.style.display = 'none';
  stB.addEventListener('click', function () { if (typeof o.onStop === 'function') o.onStop(); });
  foot.appendChild(cpB); foot.appendChild(rgB); foot.appendChild(stB);
  body.appendChild(foot);

  return {
    el: root,
    stream: function (chunk) { ans.insertAdjacentHTML('beforeend', chunk); stB.style.display = ''; },
    setAnswer: function (html) { ans.innerHTML = html; },
    stopStreaming: function () { stB.style.display = 'none'; },
    setFeedback: fb
  };
}

/* ---------------- 8. CitedAnswer ---------------- */
function CitedAnswer(o) {
  o = o || {};
  var cites = {};
  (o.citations || []).forEach(function (c) { cites[String(c.id)] = c; });
  var root = el('div', 'jd-afx jd-afx-ans');
  root.style.position = 'relative';
  var html = esc(o.text || '').replace(/\[(\d+)\]/g, function (m, id) {
    return cites[id] ? '<button type="button" class="jd-afx-cite" data-cite="' + id + '">' + id + '</button>' : m;
  });
  root.innerHTML = '<p>' + html.split(/\n\n+/).join('</p><p>') + '</p>';

  var pop = null;
  function closePop() { if (pop) { pop.remove(); pop = null; } }
  root.addEventListener('click', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-cite]') : null;
    if (!b) { closePop(); return; }
    ev.stopPropagation();
    closePop();
    var c = cites[b.dataset.cite];
    if (!c) return;
    pop = el('div', 'jd-afx-pop',
      '<b>' + esc(c.title || ('Source ' + b.dataset.cite)) + '</b>' +
      (c.preview ? '<div>' + esc(c.preview) + '</div>' : '') +
      (c.url ? '<a href="' + esc(c.url) + '" target="_blank" rel="noopener">' + esc(c.url) + '</a>' : ''));
    root.appendChild(pop);
    var r = b.getBoundingClientRect(), pr = root.getBoundingClientRect();
    pop.style.left = Math.max(0, Math.min(r.left - pr.left, pr.width - 200)) + 'px';
    pop.style.top = (r.bottom - pr.top + 6) + 'px';
    setTimeout(function () {
      document.addEventListener('click', function h(e) {
        if (pop && !pop.contains(e.target)) { closePop(); document.removeEventListener('click', h); }
      });
    }, 0);
  });
  /* hover preview on desktop */
  var hoverT = null;
  root.addEventListener('mouseover', function (ev) {
    var b = ev.target.closest ? ev.target.closest('[data-cite]') : null;
    if (!b || !window.matchMedia('(hover:hover)').matches) return;
    clearTimeout(hoverT);
    hoverT = setTimeout(function () { b.click(); }, 350);
  });
  root.addEventListener('mouseout', function () { clearTimeout(hoverT); });
  return root;
}

/* ---------------- 5. ThinkingState ---------------- */
function ThinkingState(o) {
  o = o || {};
  var steps = (o.steps || []).map(function (s) {
    return { title: s.title || s.label || '', detail: s.detail || '', sources: s.sources || [], status: 'pending' };
  });
  var root = el('div', 'jd-afx jd-afx-card');
  var head = el('button', 'jd-afx-head');
  head.type = 'button';
  var icSlot = el('span', 'jd-afx-row'); icSlot.style.gap = '0';
  head.appendChild(icSlot);
  var main = el('span', 'jd-afx-main');
  main.appendChild(el('span', 'jd-afx-mono', esc(o.title || 'Thinking')));
  main.firstChild.style.fontFamily = 'inherit'; main.firstChild.style.fontWeight = '600';
  head.appendChild(main);
  var timeEl = el('span', 'jd-afx-time', '0.0s');
  head.appendChild(timeEl);
  head.appendChild(el('span', 'jd-afx-chev', I.chev));
  root.appendChild(head);

  var bodyWrap = el('div', 'jd-afx-collapse');
  var clip = el('div'); var list = el('ul', 'jd-afx-list jd-afx-body');
  list.style.paddingTop = '6px';
  clip.appendChild(list); bodyWrap.appendChild(clip); root.appendChild(bodyWrap);

  var open = o.defaultOpen !== false;
  var sw = stopwatch(function (ms) { timeEl.textContent = fmtMs(ms, !done); });
  var idx = -1, done = false, timer = null, started = Date.now();

  function stepIcon(st) {
    if (st === 'done') return '<span style="color:var(--af-green)">' + I.check.replace('<svg', '<svg style="width:15px;height:15px"') + '</span>';
    if (st === 'active') return I.spin;
    return '<span style="width:8px;height:8px;border-radius:50%;background:var(--af-line);display:block"></span>';
  }
  function render() {
    root.dataset.open = open ? '1' : '';
    head.setAttribute('aria-expanded', open ? 'true' : 'false');
    icSlot.innerHTML = done ? I.check.replace('<svg', '<svg class="jd-afx-ok"') : I.spin;
    list.innerHTML = '';
    steps.forEach(function (s, i) {
      var li = el('li', 'jd-afx-step');
      li.appendChild(el('span', 'jd-afx-step-ic', stepIcon(s.status)));
      var tx = el('div', 'jd-afx-step-tx');
      tx.appendChild(el('div', 'jd-afx-step-ti', esc(s.title)));
      if (s.detail && s.status !== 'pending') tx.appendChild(el('div', 'jd-afx-step-de', esc(s.detail)));
      if (s.sources.length && s.status !== 'pending') {
        var sr = el('div', 'jd-afx-srcs');
        s.sources.forEach(function (sc) {
          var chip = el('span', 'jd-afx-src', I.link + '<span>' + esc(sc.label || sc.title || 'source') + '</span>');
          if (sc.tip || sc.title) chip.title = sc.tip || sc.title;
          sr.appendChild(chip);
        });
        tx.appendChild(sr);
      }
      li.appendChild(tx);
      list.appendChild(li);
    });
  }
  function next() {
    if (done || idx + 1 >= steps.length) { complete(); return; }
    if (idx >= 0) steps[idx].status = 'done';
    idx++;
    steps[idx].status = 'active';
    render();
  }
  function complete() {
    steps.forEach(function (s) { if (s.status !== 'done') s.status = 'done'; });
    done = true; sw.stop();
    if (timer) clearInterval(timer);
    render();
    if (typeof o.onDone === 'function') o.onDone();
  }
  head.addEventListener('click', function () { open = !open; render(); });
  sw.start(started); render();
  if (steps.length) {
    next();
    timer = setInterval(function () {
      if (idx + 1 < steps.length) next(); else complete();
    }, o.interval || 1600);
  } else { complete(); }
  return { el: root, next: next, complete: complete,
    addStep: function (s) { steps.push({ title: s.title || '', detail: s.detail || '', sources: s.sources || [], status: 'pending' }); render(); } };
}

/* ---------------- 6. AgentSteering ---------------- */
function AgentSteering(o) {
  o = o || {};
  var steps = (o.steps || []).map(function (s) {
    return { label: s.label || s.title || '', status: s.status || 'pending' };
  });
  var notes = (o.notes || []).slice();
  var paused = false, stopped = false;

  var root = el('div', 'jd-afx jd-afx-card');
  var body = el('div', 'jd-afx-body'); body.style.paddingTop = '12px';
  root.appendChild(body);

  var top = el('div', 'jd-afx-row');
  top.style.justifyContent = 'space-between'; top.style.marginBottom = '10px';
  top.appendChild(el('div', 'jd-afx-mono', esc(o.title || 'Agent run')));
  top.firstChild.style.fontWeight = '700';
  if (o.agentName) {
    var ap = el('span', 'jd-afx-pill', '<span class="jd-afx-dot" data-pulse="1"></span>' + esc(o.agentName));
    ap.dataset.k = 'run'; top.appendChild(ap);
  }
  body.appendChild(top);

  var list = el('ul', 'jd-afx-list');
  body.appendChild(list);
  function paintSteps() {
    list.innerHTML = '';
    steps.forEach(function (s) {
      var li = el('li', 'jd-afx-step');
      var ic = s.status === 'done' ? '<span style="color:var(--af-green)">' + I.check.replace('<svg', '<svg style="width:15px;height:15px"') + '</span>'
        : s.status === 'active' ? I.spin
        : '<span style="width:8px;height:8px;border-radius:50%;background:var(--af-line);display:block"></span>';
      li.appendChild(el('span', 'jd-afx-step-ic', ic));
      var tx = el('div', 'jd-afx-step-tx');
      tx.appendChild(el('div', 'jd-afx-step-ti', esc(s.label)));
      if (s.status === 'active' && paused) tx.appendChild(el('div', 'jd-afx-note', 'Paused'));
      li.appendChild(tx);
      list.appendChild(li);
    });
  }

  var nq = el('div'); nq.style.marginTop = '12px';
  nq.appendChild(el('div', 'jd-afx-label', 'Steering notes'));
  var nlist = el('div'); nlist.style.margin = '8px 0';
  nq.appendChild(nlist);
  var nrow = el('div', 'jd-afx-row');
  var nin = el('input', 'jd-afx-input'); nin.placeholder = 'Add a note to steer the agent…'; nin.type = 'text';
  var nadd = el('button', 'jd-afx-btn', 'Queue note'); nadd.type = 'button'; nadd.style.flex = 'none';
  nrow.appendChild(nin); nrow.appendChild(nadd); nq.appendChild(nrow);
  body.appendChild(nq);
  function paintNotes() {
    nlist.innerHTML = '';
    notes.forEach(function (n, i) {
      var c = el('span', 'jd-afx-nchip', esc(n) + '<button type="button" aria-label="Remove">×</button>');
      c.querySelector('button').addEventListener('click', function () { notes.splice(i, 1); paintNotes(); });
      nlist.appendChild(c);
    });
    if (!notes.length) nlist.appendChild(el('span', 'jd-afx-note', 'No queued notes.'));
  }
  function addNote(t) {
    t = (t || '').trim(); if (!t) return;
    notes.push(t); paintNotes();
    if (typeof o.onNote === 'function') o.onNote(t, notes.slice());
  }
  nadd.addEventListener('click', function () { addNote(nin.value); nin.value = ''; });
  nin.addEventListener('keydown', function (e) { if (e.key === 'Enter') { addNote(nin.value); nin.value = ''; } });

  var ctrls = el('div', 'jd-afx-row'); ctrls.style.marginTop = '12px';
  var pb = el('button', 'jd-afx-btn', I.pause + '<span>Pause</span>'); pb.type = 'button';
  var ib = el('button', 'jd-afx-btn', I.stop + '<span>Interrupt</span>'); ib.type = 'button'; ib.dataset.d = '1';
  ctrls.appendChild(pb); ctrls.appendChild(ib);
  body.appendChild(ctrls);

  pb.addEventListener('click', function () {
    if (stopped) return;
    paused = !paused;
    pb.innerHTML = (paused ? I.play : I.pause) + '<span>' + (paused ? 'Resume' : 'Pause') + '</span>';
    paintSteps();
    if (typeof (paused ? o.onPause : o.onResume) === 'function') (paused ? o.onPause : o.onResume)();
  });
  ib.addEventListener('click', function () {
    stopped = true; paused = false;
    pb.disabled = true; ib.disabled = true;
    ib.innerHTML = I.stop + '<span>Interrupted</span>';
    paintSteps();
    if (typeof o.onInterrupt === 'function') o.onInterrupt(notes.slice());
  });

  paintSteps(); paintNotes();
  return { el: root,
    setStepStatus: function (i, s) { if (steps[i]) { steps[i].status = s; paintSteps(); } },
    addNote: addNote, getNotes: function () { return notes.slice(); },
    pause: function () { if (!paused) pb.click(); },
    resume: function () { if (paused) pb.click(); },
    interrupt: function () { ib.click(); } };
}

/* ---------------- 7. AgentInbox ---------------- */
function AgentInbox(o) {
  o = o || {};
  var root = el('div', 'jd-afx jd-afx-card');
  var body = el('div', 'jd-afx-body'); body.style.paddingTop = '8px';
  root.appendChild(body);
  if (o.title) {
    var h = el('div', 'jd-afx-label', esc(o.title)); h.style.margin = '6px 0 8px';
    body.appendChild(h);
  }
  var list = el('ul', 'jd-afx-list');
  body.appendChild(list);
  var KIND = { running: 'run', done: 'ok', success: 'ok', failed: 'err', error: 'err', queued: 'wait', paused: 'warn' };
  (o.runs || []).forEach(function (r) {
    var li = el('li');
    var b = el('button', 'jd-afx-head');
    b.type = 'button'; b.style.minHeight = '40px'; b.style.gap = '10px';
    var k = KIND[(r.status || '').toLowerCase()] || 'wait';
    var pill = el('span', 'jd-afx-pill', '<span class="jd-afx-dot"' + (k === 'run' ? ' data-pulse="1"' : '') + '></span>' + esc(r.status || 'queued'));
    pill.dataset.k = k;
    b.appendChild(pill);
    var tx = el('span', 'jd-afx-main');
    tx.appendChild(el('span', 'jd-afx-mono', esc(r.title || 'Untitled run')));
    tx.firstChild.style.fontFamily = 'inherit'; tx.firstChild.style.fontWeight = '600';
    if (r.agent) tx.appendChild(el('span', 'jd-afx-sub', esc(r.agent)));
    b.appendChild(tx);
    if (r.time) b.appendChild(el('span', 'jd-afx-time', esc(r.time)));
    b.addEventListener('click', function () { if (typeof o.onSelect === 'function') o.onSelect(r); });
    li.appendChild(b); list.appendChild(li);
  });
  if (!(o.runs || []).length) body.appendChild(el('p', 'jd-afx-note', 'No agent runs yet.'));
  return root;
}

/* ---------------- 9. AutonomyDial ---------------- */
function AutonomyDial(o) {
  o = o || {};
  var LEVELS = [
    { n: 0, t: 'Ask always', d: 'Confirm every action' },
    { n: 1, t: 'Ask if risky', d: 'Auto for safe steps' },
    { n: 2, t: 'Full auto', d: 'No confirmations' }
  ];
  var level = [0, 1, 2].indexOf(o.level) >= 0 ? o.level : 1;
  var actions = (o.actions || []).map(function (a) {
    return { label: a.label || '', risk: a.risk || 'low', pinned: !!a.pinned };
  });

  var root = el('div', 'jd-afx jd-afx-card');
  var body = el('div', 'jd-afx-body'); body.style.paddingTop = '12px';
  root.appendChild(body);
  body.appendChild(el('div', 'jd-afx-label', esc(o.title || 'Autonomy')));

  var dial = el('div', 'jd-afx-dial'); dial.style.margin = '8px 0 12px';
  dial.setAttribute('role', 'radiogroup');
  var btns = LEVELS.map(function (L) {
    var b = el('button', '', esc(L.t) + '<small>' + esc(L.d) + '</small>');
    b.type = 'button'; b.setAttribute('role', 'radio');
    b.addEventListener('click', function () { setLevel(L.n); });
    dial.appendChild(b);
    return b;
  });
  body.appendChild(dial);

  var list = el('ul', 'jd-afx-list');
  body.appendChild(list);
  function paint() {
    btns.forEach(function (b, i) {
      b.dataset.on = i === level ? '1' : '';
      b.setAttribute('aria-checked', i === level ? 'true' : 'false');
    });
    list.innerHTML = '';
    actions.forEach(function (a, i) {
      var li = el('li', 'jd-afx-row');
      li.style.padding = '7px 0'; li.style.justifyContent = 'space-between';
      var left = el('span', 'jd-afx-row');
      left.appendChild(el('span', '', esc(a.label)));
      var badge = el('span', 'jd-afx-risk', esc(a.risk));
      badge.dataset.r = a.risk;
      left.appendChild(badge);
      li.appendChild(left);
      var pin = el('button', 'jd-afx-iconbtn', (a.pinned ? I.lock : I.pin));
      pin.type = 'button';
      pin.title = a.pinned ? 'Pinned — always asks' : 'Pin — always ask for this action';
      pin.dataset.on = a.pinned ? '1' : '';
      pin.addEventListener('click', function () {
        a.pinned = !a.pinned;
        pin.dataset.on = a.pinned ? '1' : '';
        pin.innerHTML = a.pinned ? I.lock : I.pin;
        if (typeof o.onTogglePin === 'function') o.onTogglePin(i, a.pinned, a);
      });
      li.appendChild(pin);
      list.appendChild(li);
    });
  }
  function setLevel(n) {
    level = n; paint();
    if (typeof o.onChange === 'function') o.onChange(n, LEVELS[n]);
  }
  paint();
  return { el: root, setLevel: setLevel, getLevel: function () { return level; },
    setActions: function (a) { actions = a.map(function (x) { return { label: x.label || '', risk: x.risk || 'low', pinned: !!x.pinned }; }); paint(); } };
}

/* ---------------- 10. ContextWindow ---------------- */
function ContextWindow(o) {
  o = o || {};
  var used = o.used || 0, total = o.total || 1;
  var root = el('div', 'jd-afx');
  var top = el('div', 'jd-afx-row');
  top.style.justifyContent = 'space-between'; top.style.marginBottom = '6px';
  var lab = el('span', 'jd-afx-label', esc(o.label || 'Context window'));
  var val = el('span', 'jd-afx-time', '');
  top.appendChild(lab); top.appendChild(val);
  root.appendChild(top);
  var bar = el('div', 'jd-afx-ctxbar');
  var fill = el('div', 'jd-afx-ctxfill');
  bar.appendChild(fill);
  root.appendChild(bar);
  function paint() {
    var pct = Math.min(100, Math.max(0, (used / total) * 100));
    fill.style.width = pct + '%';
    fill.dataset.w = pct >= 90 ? '2' : pct >= 70 ? '1' : '';
    val.textContent = fmtTokens(used) + ' / ' + fmtTokens(total) + ' tokens · ' + pct.toFixed(1) + '%';
    root.title = used.toLocaleString() + ' of ' + total.toLocaleString() + ' tokens used';
  }
  paint();
  return { el: root, set: function (u, t) { used = u; total = t || total; paint(); }, get: function () { return { used: used, total: total }; } };
}

/* ---------------- 11. ModelPicker ---------------- */
function ModelPicker(o) {
  o = o || {};
  var models = o.models || [];
  var cur = o.value || (models[0] && models[0].id);
  var root = el('div', 'jd-afx jd-afx-mp');
  var btn = el('button', 'jd-afx-btn', '');
  btn.type = 'button';
  var panel = null;

  function curModel() { return models.filter(function (m) { return m.id === cur; })[0] || models[0] || { id: '', name: 'Select model' }; }
  function paintBtn() {
    var m = curModel();
    btn.innerHTML = '<span style="text-align:left"><b style="font-size:13px">' + esc(m.name) + '</b></span>' +
      '<span class="jd-afx-chev" style="width:14px;height:14px">' + I.chev + '</span>';
  }
  function close() { if (panel) { panel.remove(); panel = null; } }
  function openPanel() {
    close();
    panel = el('div', 'jd-afx-mp-panel');
    var sin = el('input', 'jd-afx-input');
    sin.placeholder = 'Search models…'; sin.type = 'search';
    var sw = el('div'); sw.style.padding = '8px'; sw.style.borderBottom = '1px solid var(--af-line)';
    sw.appendChild(sin); panel.appendChild(sw);
    var list = el('div'); list.style.maxHeight = '260px'; list.style.overflowY = 'auto'; list.style.padding = '4px';
    panel.appendChild(list);
    function draw(q) {
      list.innerHTML = '';
      var items = models.filter(function (m) {
        return !q || (m.name + ' ' + (m.desc || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0;
      });
      if (!items.length) list.appendChild(el('div', 'jd-afx-note', 'No models match.'));
      items.forEach(function (m) {
        var it = el('button', 'jd-afx-mp-item', '<b>' + esc(m.name) + '</b>' + (m.desc ? '<span>' + esc(m.desc) + '</span>' : ''));
        it.type = 'button';
        it.dataset.on = m.id === cur ? '1' : '';
        it.addEventListener('click', function () {
          cur = m.id; paintBtn(); close();
          if (typeof o.onChange === 'function') o.onChange(m.id, m);
        });
        list.appendChild(it);
      });
    }
    sin.addEventListener('input', function () { draw(sin.value); });
    draw('');
    root.appendChild(panel);
    setTimeout(function () { sin.focus(); }, 30);
    setTimeout(function () {
      document.addEventListener('click', function h(e) {
        if (panel && !root.contains(e.target)) { close(); document.removeEventListener('click', h); }
      });
    }, 0);
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); panel ? close() : openPanel(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  paintBtn();
  root.appendChild(btn);
  return { el: root, get: function () { return cur; },
    set: function (id) { cur = id; paintBtn(); },
    setModels: function (m) { models = m; if (!cur) cur = m[0] && m[0].id; paintBtn(); } };
}

/* ---------------- 12. AgentPlan ---------------- */
function AgentPlan(o) {
  o = o || {};
  var steps = (o.steps || []).map(function (s) {
    return { title: s.title || '', detail: s.detail || '', status: s.status || 'pending' };
  });
  var decided = null;
  var root = el('div', 'jd-afx jd-afx-card');
  var body = el('div', 'jd-afx-body'); body.style.paddingTop = '12px';
  root.appendChild(body);
  if (o.title) {
    var h = el('div', 'jd-afx-q', esc(o.title)); h.style.fontSize = '14px';
    body.appendChild(h);
  }
  var list = el('ol', 'jd-afx-list');
  body.appendChild(list);
  var ctrls = el('div', 'jd-afx-row'); ctrls.style.marginTop = '14px';
  var ab = el('button', 'jd-afx-btn', 'Approve plan'); ab.type = 'button'; ab.dataset.p = '1';
  var rb = el('button', 'jd-afx-btn', 'Reject'); rb.type = 'button'; rb.dataset.d = '1';
  ctrls.appendChild(ab); ctrls.appendChild(rb);
  body.appendChild(ctrls);

  function paint() {
    list.innerHTML = '';
    steps.forEach(function (s, i) {
      var li = el('li', 'jd-afx-step');
      li.dataset.st = s.status === 'done' || s.status === 'active' ? s.status : '';
      li.appendChild(el('span', 'jd-afx-num', String(i + 1)));
      var tx = el('div', 'jd-afx-step-tx');
      tx.appendChild(el('div', 'jd-afx-step-ti', esc(s.title)));
      if (s.detail) tx.appendChild(el('div', 'jd-afx-step-de', esc(s.detail)));
      li.appendChild(tx);
      list.appendChild(li);
    });
    ab.disabled = rb.disabled = decided !== null;
    if (decided) {
      ctrls.innerHTML = '<span class="jd-afx-pill" data-k="' + (decided === 'approved' ? 'ok' : 'err') + '">' +
        (decided === 'approved' ? 'Plan approved' : 'Plan rejected') + '</span>';
    }
  }
  ab.addEventListener('click', function () {
    decided = 'approved'; paint();
    if (typeof o.onApprove === 'function') o.onApprove(steps.slice());
  });
  rb.addEventListener('click', function () {
    decided = 'rejected'; paint();
    if (typeof o.onReject === 'function') o.onReject(steps.slice());
  });
  paint();
  return { el: root,
    setStep: function (i, s) { if (steps[i]) { steps[i].status = s; paint(); } },
    getDecision: function () { return decided; } };
}

/* ---------------- 13. InlineDiff ---------------- */
/* word-level LCS diff -> per-change accept/reject, accept-all/reject-all, undo */
function wordDiff(a, b) {
  var A = a.split(/(\s+)/), B = b.split(/(\s+)/);
  var n = A.length, m = B.length;
  if (n * m > 4000000) { /* too big: fall back to whole-block replace */
    return [{ del: A.join(''), ins: B.join('') }];
  }
  var dp = new Uint32Array((n + 1) * (m + 1));
  var i, j;
  for (i = n - 1; i >= 0; i--) for (j = m - 1; j >= 0; j--) {
    dp[i * (m + 1) + j] = A[i] === B[j] ? dp[(i + 1) * (m + 1) + j + 1] + 1
      : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
  }
  var ops = [];
  i = 0; j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ t: '=', x: A[i] }); i++; j++; }
    else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) { ops.push({ t: '-', x: A[i] }); i++; }
    else { ops.push({ t: '+', x: B[j] }); j++; }
  }
  while (i < n) { ops.push({ t: '-', x: A[i++] }); }
  while (j < m) { ops.push({ t: '+', x: B[j++] }); }
  /* Split into segments: alternating gaps (= runs) and changes (-/+ runs).
     result() concatenates: gap0 + pick(c1) + gap1 + pick(c2) + ... — exact. */
  var segs = [], gap = '', cur = null;
  ops.forEach(function (op) {
    if (op.t === '=') {
      if (cur) { segs.push(cur); cur = null; }
      gap += op.x;
    } else {
      if (!cur) { segs.push({ gap: gap }); gap = ''; cur = { del: '', ins: '' }; }
      if (op.t === '-') cur.del += op.x; else cur.ins += op.x;
    }
  });
  if (cur) segs.push(cur);
  segs.push({ gap: gap });
  function ctx(s) { /* trim context for display */
    if (s.length <= 130) return s;
    return '…' + s.slice(-125);
  }
  function ctxAfter(s) {
    if (s.length <= 130) return s;
    return s.slice(0, 125) + '…';
  }
  var changes = [], gaps = [];
  segs.forEach(function (sg) {
    if (sg.gap !== undefined) gaps.push(sg.gap);
    else changes.push(sg);
  });
  changes._gaps = gaps;
  changes.forEach(function (c, i) {
    c.before = ctx(gaps[i] || '');
    c.after = ctxAfter(gaps[i + 1] || '');
  });
  return changes;
}

function InlineDiff(o) {
  o = o || {};
  var changes = wordDiff(o.original || '', o.suggested || '');
  var state = changes.map(function () { return 'pending'; }); /* pending|accepted|rejected */
  var history = [];

  var root = el('div', 'jd-afx jd-afx-card');
  var body = el('div', 'jd-afx-body'); body.style.paddingTop = '12px';
  root.appendChild(body);
  if (o.title) {
    var h = el('div', 'jd-afx-q', esc(o.title)); h.style.fontSize = '14px';
    body.appendChild(h);
  }
  var bar = el('div', 'jd-afx-row'); bar.style.marginBottom = '4px';
  var aa = el('button', 'jd-afx-mini', 'Accept all'); aa.type = 'button';
  var ra = el('button', 'jd-afx-mini', 'Reject all'); ra.type = 'button';
  var un = el('button', 'jd-afx-mini', 'Undo'); un.type = 'button';
  var cnt = el('span', 'jd-afx-note', '');
  bar.appendChild(aa); bar.appendChild(ra); bar.appendChild(un);
  bar.appendChild(el('span', 'jd-afx-sp'));
  bar.appendChild(cnt);
  body.appendChild(bar);
  var list = el('div');
  body.appendChild(list);

  function snapshot() { history.push(state.slice()); if (history.length > 50) history.shift(); }
  function paint() {
    list.innerHTML = '';
    var pending = 0;
    changes.forEach(function (c, i) {
      if (state[i] === 'pending') pending++;
      var w = el('div', 'jd-afx-chg');
      w.style.opacity = state[i] === 'pending' ? '1' : '.55';
      var tx = el('div', 'jd-afx-chg-tx jd-afx-diff');
      var inner = '';
      if (state[i] === 'rejected') inner = esc(c.before + c.del + c.after);
      else if (state[i] === 'accepted') inner = esc(c.before + c.ins + c.after);
      else inner = esc(c.before) +
        (c.del ? '<span class="jd-afx-del">' + esc(c.del) + '</span>' : '') +
        (c.ins ? '<span class="jd-afx-ins">' + esc(c.ins) + '</span>' : '') +
        esc(c.after);
      tx.innerHTML = inner;
      w.appendChild(tx);
      if (state[i] === 'pending') {
        var ab = el('button', 'jd-afx-mini', 'Accept'); ab.type = 'button'; ab.dataset.a = '1';
        var rb = el('button', 'jd-afx-mini', 'Reject'); rb.type = 'button'; rb.dataset.r = '1';
        ab.addEventListener('click', function () { snapshot(); state[i] = 'accepted'; paint(); });
        rb.addEventListener('click', function () { snapshot(); state[i] = 'rejected'; paint(); });
        var br = el('div', 'jd-afx-row'); br.style.flexDirection = 'column'; br.style.gap = '6px';
        br.appendChild(ab); br.appendChild(rb);
        w.appendChild(br);
      } else {
        w.appendChild(el('span', 'jd-afx-note', state[i] === 'accepted' ? 'accepted' : 'rejected'));
      }
      list.appendChild(w);
    });
    cnt.textContent = pending ? pending + ' change' + (pending === 1 ? '' : 's') + ' pending' : 'All resolved';
    un.disabled = !history.length;
    aa.disabled = ra.disabled = !pending;
  }
  aa.addEventListener('click', function () { snapshot(); state = state.map(function () { return 'accepted'; }); paint(); });
  ra.addEventListener('click', function () { snapshot(); state = state.map(function () { return 'rejected'; }); paint(); });
  un.addEventListener('click', function () { var p = history.pop(); if (p) { state = p; paint(); } });

  function result() {
    var gaps = changes._gaps || [''];
    var out = gaps[0] || '';
    changes.forEach(function (c, i) {
      out += state[i] === 'accepted' ? c.ins : c.del; /* pending keeps original */
      out += gaps[i + 1] || '';
    });
    return out;
  }
  paint();
  return { el: root, getResult: result,
    getState: function () { return state.slice(); },
    acceptAll: function () { aa.click(); }, rejectAll: function () { ra.click(); }, undo: function () { un.click(); } };
}

/* ---------------- API ---------------- */
injectCSS();
window.__jdAffectUI = {
  AIAnswer: AIAnswer,
  ThinkingState: ThinkingState,
  ThinkingLoader: ThinkingLoader,
  AgentSteering: AgentSteering,
  AgentInbox: AgentInbox,
  AutonomyDial: AutonomyDial,
  CitedAnswer: CitedAnswer,
  ContextWindow: ContextWindow,
  ModelPicker: ModelPicker,
  ToolCallCard: ToolCallCard,
  ToolCallGroup: ToolCallGroup,
  AgentPlan: AgentPlan,
  InlineDiff: InlineDiff
};

/* ---------------- demo ---------------- */
window.__jdAffectUIDemo = function (mount) {
  var UI = window.__jdAffectUI;
  var wrap = el('div', 'jd-afx');
  wrap.style.cssText = 'max-width:720px;margin:0 auto;padding:16px;display:grid;gap:22px;';
  function sec(title, node) {
    var s = el('section');
    s.appendChild(el('h4', '', esc(title)));
    s.firstChild.style.cssText = 'margin:0 0 10px;color:var(--af-ink,#1a1a1a);font-size:13px;letter-spacing:.04em;text-transform:uppercase;';
    s.appendChild(node.el || node);
    wrap.appendChild(s);
    return node;
  }
  /* 1. tool cards */
  var card1 = UI.ToolCallCard({ name: 'search_web', summary: "Searched the web for 'CRM pricing 2026'", status: 'success',
    args: { query: 'CRM pricing 2026', limit: 5 }, result: { results: 5, top: 'hubspot.com' }, duration: 1240 });
  var card2 = UI.ToolCallCard({ name: 'fetch_page', summary: 'Fetching hubspot.com/pricing', status: 'running', startedAt: Date.now() - 1800,
    args: { url: 'https://hubspot.com/pricing' } });
  var card3 = UI.ToolCallCard({ name: 'parse_pdf', summary: 'Parsing report.pdf', status: 'error', error: 'Unsupported PDF version',
    onRetry: function () { card3.setStatus('running'); setTimeout(function () { card3.setResult({ pages: 12 }, 900); card3.setStatus('success', 900); }, 1500); } });
  sec('ToolCallGroup', UI.ToolCallGroup({ cards: [card1, card2, card3] }));
  setTimeout(function () { card2.setResult({ title: 'HubSpot Pricing', words: 1840 }, 2310); card2.setStatus('success', 2310); }, 2500);
  /* 2. thinking loader */
  var tl = UI.ThinkingLoader({});
  sec('ThinkingLoader', tl);
  setTimeout(function () { tl.setDone(); }, 7000);
  /* 3. ai answer */
  var aa = UI.AIAnswer({ question: 'What is the cheapest CRM in 2026?',
    sources: [{ title: 'hubspot.com', url: 'https://hubspot.com' }, { title: 'g2.com', url: 'https://g2.com' }],
    followUps: ['Compare top 3', 'Show pricing table'],
    onFollowUp: function (q) { aa.stream('<p><i>You asked: ' + esc(q) + '</i></p>'); },
    onFeedback: function (w, r) { console.log('feedback', w, r); } });
  sec('AIAnswer', aa);
  aa.stream('<p>Based on current pricing, <b>HubSpot</b> offers a free tier [1], while paid plans start low [2].</p>');
  /* 4. thinking state */
  sec('ThinkingState', UI.ThinkingState({ title: 'Researching', steps: [
    { title: 'Searching the web', detail: '3 queries issued', sources: [{ label: 'google.com', tip: 'Search engine' }] },
    { title: 'Reading sources', detail: '5 pages fetched' },
    { title: 'Writing response', detail: 'Composing answer' }
  ], interval: 1400 }));
  /* 5. agent steering */
  sec('AgentSteering', UI.AgentSteering({ title: 'Deep research', agentName: 'Researcher',
    steps: [{ label: 'Gather sources', status: 'done' }, { label: 'Draft outline', status: 'active' }, { label: 'Write report', status: 'pending' }],
    notes: ['Focus on pricing'], onNote: function (t) { console.log('note:', t); } }));
  /* 6. agent inbox */
  sec('AgentInbox', UI.AgentInbox({ title: 'Recent runs', runs: [
    { title: 'Q3 report draft', agent: 'Writer', status: 'done', time: '2m ago' },
    { title: 'Competitor scan', agent: 'Researcher', status: 'running', time: 'now' },
    { title: 'Broken link check', agent: 'QA', status: 'failed', time: '1h ago' }
  ], onSelect: function (r) { console.log('selected', r); } }));
  /* 7. autonomy dial */
  sec('AutonomyDial', UI.AutonomyDial({ level: 1, actions: [
    { label: 'Read files', risk: 'low' }, { label: 'Run tests', risk: 'medium' }, { label: 'Delete branch', risk: 'high', pinned: true }
  ], onChange: function (n) { console.log('level', n); } }));
  /* 8. cited answer */
  sec('CitedAnswer', UI.CitedAnswer({ text: 'HubSpot has a free tier [1] and paid plans from $20/mo [2].',
    citations: [
      { id: '1', title: 'HubSpot Pricing', preview: 'Free CRM with paid upgrades…', url: 'https://hubspot.com/pricing' },
      { id: '2', title: 'G2 Comparison', preview: 'CRM pricing compared…', url: 'https://g2.com' }
    ] }));
  /* 9. context window */
  var cw = UI.ContextWindow({ used: 18400, total: 128000 });
  sec('ContextWindow', cw);
  /* 10. model picker */
  sec('ModelPicker', UI.ModelPicker({ models: [
    { id: 'flash', name: 'Flash', desc: 'Fastest, cheapest' },
    { id: 'pro', name: 'Pro', desc: 'Best quality' },
    { id: 'lite', name: 'Lite', desc: 'Free tier' }
  ], onChange: function (id) { console.log('model', id); } }));
  /* 11. agent plan */
  sec('AgentPlan', UI.AgentPlan({ title: 'Migration plan', steps: [
    { title: 'Backup database', detail: 'Snapshot before changes' },
    { title: 'Run migration', detail: 'Apply schema v14' },
    { title: 'Verify', detail: 'Smoke-test critical paths' }
  ], onApprove: function () { console.log('approved'); }, onReject: function () { console.log('rejected'); } }));
  /* 12. inline diff */
  sec('InlineDiff', UI.InlineDiff({ title: 'Suggested edit',
    original: 'The quick brown fox jumps over the lazy dog near the river bank.',
    suggested: 'The quick red fox leaps over the lazy dog near the river bank today.' }));

  (mount || document.body).appendChild(wrap);
  return wrap;
};

})();
