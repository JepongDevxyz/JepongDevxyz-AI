/* JepongDevxyz AI — Beautiful response UI (v1, 2026-10-01)
   Upgrades EVERY assistant response (any model/provider) with a modern,
   Tailwind-grade design system: rich typography, gradient accents, card
   tables, callout quotes, pill code, styled lists — and guarantees the full
   response is always shown (anti-putol: no clipping anywhere).
   Pure addition: wraps window.renderCustomMarkdown; original pipeline
   (marked -> sanitize -> code cards) is untouched. Idempotent. */
(function () {
  'use strict';
  if (window.__jdResponseUI) return;
  window.__jdResponseUI = true;

  var CSS = [
    '/* ===== jd-rich: beautiful response design system ===== */',
    '.jd-rich{line-height:1.72;overflow-wrap:anywhere;word-break:break-word;max-height:none!important;overflow:visible}',
    '.jd-rich>*:first-child{margin-top:0!important}',
    '.jd-rich>*:last-child{margin-bottom:0!important}',
    '.jd-rich p{margin:.7em 0}',
    '.jd-rich p,.jd-rich li,.jd-rich td,.jd-rich th,.jd-rich blockquote{-webkit-line-clamp:none!important;max-height:none!important}',
    '',
    '/* Headings with gradient accent bar */',
    '.jd-rich h1,.jd-rich h2,.jd-rich h3,.jd-rich h4{font-weight:700;letter-spacing:-.015em;line-height:1.35;margin:1.15em 0 .55em;display:flex;align-items:center;gap:.55em}',
    '.jd-rich h1{font-size:1.32em}',
    '.jd-rich h2{font-size:1.18em}',
    '.jd-rich h3{font-size:1.06em}',
    '.jd-rich h4{font-size:1em}',
    '.jd-rich h1::before,.jd-rich h2::before{content:"";width:5px;align-self:stretch;border-radius:5px;background:linear-gradient(180deg,#818cf8,#e879f9);box-shadow:0 0 10px rgba(168,85,247,.55);flex:0 0 auto}',
    '.jd-rich h3::before{content:"";width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#e879f9);flex:0 0 auto}',
    '',
    '/* Lists */',
    '.jd-rich ul,.jd-rich ol{margin:.7em 0;padding-left:0;display:grid;gap:.4em}',
    '.jd-rich ul{list-style:none}',
    '.jd-rich ul>li{position:relative;padding-left:1.5em}',
    '.jd-rich ul>li::before{content:"";position:absolute;left:.25em;top:.62em;width:7px;height:7px;border-radius:50%;background:linear-gradient(135deg,#818cf8,#e879f9);box-shadow:0 0 8px rgba(168,85,247,.5)}',
    '.jd-rich ul ul,.jd-rich ol ol,.jd-rich ul ol,.jd-rich ol ul{margin:.35em 0}',
    '.jd-rich ol{list-style:none;counter-reset:jdol}',
    '.jd-rich ol>li{position:relative;padding-left:2em;counter-increment:jdol}',
    '.jd-rich ol>li::before{content:counter(jdol);position:absolute;left:0;top:.15em;min-width:1.45em;height:1.45em;padding:0 .3em;border-radius:999px;background:rgba(129,140,248,.14);border:1px solid rgba(129,140,248,.35);color:#a5b4fc;font-size:.78em;font-weight:700;display:inline-flex;align-items:center;justify-content:center}',
    '.jd-rich li.task-list-item{list-style:none}',
    '.jd-rich li.task-list-item::before{display:none}',
    '.jd-rich input[type="checkbox"]{accent-color:#818cf8;width:1.05em;height:1.05em;margin-right:.5em;vertical-align:-.15em;cursor:default}',
    '',
    '/* Blockquote -> callout card */',
    '.jd-rich blockquote{margin:.9em 0;padding:.75em 1.05em;border-radius:0 14px 14px 0;background:rgba(129,140,248,.08);border-left:3px solid transparent;border-image:linear-gradient(180deg,#818cf8,#e879f9) 1;box-shadow:inset 0 0 24px rgba(129,140,248,.05)}',
    '.jd-rich blockquote p{margin:.35em 0}',
    '.jd-rich blockquote blockquote{margin:.5em 0}',
    '',
    '/* Links */',
    '.jd-rich a{color:#93a0f8;font-weight:500;text-decoration:none;border-bottom:1px solid rgba(147,160,248,.45);transition:border-color .2s,color .2s}',
    '.jd-rich a:hover{color:#c3cbff;border-bottom-color:#c3cbff}',
    '',
    '/* Inline code + kbd */',
    '.jd-rich :not(pre)>code{font-family:"Fira Code",ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em;padding:.16em .5em;border-radius:8px;background:rgba(129,140,248,.13);border:1px solid rgba(129,140,248,.28);color:#bcc6ff;white-space:nowrap}',
    '.jd-rich kbd{font-family:inherit;font-size:.8em;padding:.15em .5em;border-radius:7px;background:rgba(127,127,127,.14);border:1px solid rgba(127,127,127,.3);border-bottom-width:2px;white-space:nowrap}',
    '',
    '/* Tables -> card with scroll */',
    '.jd-rich .jd-table-wrap{overflow-x:auto;margin:.95em 0;border:1px solid rgba(127,127,127,.18);border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.18);-webkit-overflow-scrolling:touch}',
    '.jd-rich .jd-table-wrap table{margin:0!important;border:1px solid transparent!important;box-shadow:none!important;min-width:430px}',
    '.jd-rich th{background:rgba(129,140,248,.13);font-weight:700;text-align:left;padding:.65em .95em;white-space:nowrap;font-size:.88em;letter-spacing:.02em}',
    '.jd-rich td{padding:.6em .95em;border-top:1px solid rgba(127,127,127,.13);font-size:.9em;vertical-align:top}',
    '.jd-rich tbody tr:nth-child(even){background:rgba(127,127,127,.055)}',
    '.jd-rich tbody tr{transition:background .15s}',
    '.jd-rich tbody tr:hover{background:rgba(129,140,248,.07)}',
    '.jd-rich thead th:first-child{border-top-left-radius:13px}',
    '.jd-rich thead th:last-child{border-top-right-radius:13px}',
    '',
    '/* Divider, images, details */',
    '.jd-rich hr{border:none;height:2px;margin:1.25em 0;border-radius:2px;background:linear-gradient(90deg,transparent,rgba(129,140,248,.55),transparent)}',
    '.jd-rich img{max-width:100%;border-radius:14px;box-shadow:0 10px 28px rgba(0,0,0,.35);margin:.6em 0;display:block}',
    '.jd-rich details{margin:.8em 0;border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:.65em .95em;background:rgba(127,127,127,.05)}',
    '.jd-rich summary{cursor:pointer;font-weight:600;list-style:none;display:flex;align-items:center;gap:.5em}',
    '.jd-rich summary::-webkit-details-marker{display:none}',
    '.jd-rich summary::before{content:"▸";color:#a5b4fc;transition:transform .2s}',
    '.jd-rich details[open] summary::before{transform:rotate(90deg)}',
    '',
    '/* Code block header polish (existing .code-container-wrap kept) */',
    '.jd-rich .code-block-header{background:linear-gradient(135deg,rgba(129,140,248,.16),rgba(232,121,249,.07));border-bottom:1px solid rgba(127,127,127,.14)}',
    '.jd-rich .code-lang-label{background:rgba(129,140,248,.16);border:1px solid rgba(129,140,248,.3);border-radius:999px;padding:.15em .7em;font-weight:600}',
    '',
    '/* Light-mode legibility tweaks */',
    '@media (prefers-color-scheme:light){',
    '.jd-rich a{color:#4f46e5;border-bottom-color:rgba(79,70,229,.4)}',
    '.jd-rich a:hover{color:#4338ca;border-bottom-color:#4338ca}',
    '.jd-rich :not(pre)>code{color:#4f46e5}',
    '.jd-rich ol>li::before{color:#4f46e5}}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('jd-response-ui-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-response-ui-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function hook() {
    if (typeof window.renderCustomMarkdown !== 'function') return false;
    if (window.renderCustomMarkdown.__jdRich) return true;
    var orig = window.renderCustomMarkdown;
    var fn = function (md) {
      var html = orig.call(this, md);
      /* table -> scrollable card (string-level: fast enough for streaming).
         Only wrap COMPLETE tables so a mid-stream partial table never
         leaves an unclosed div. */
      html = String(html).replace(/<table(\s[^>]*)?>[\s\S]*?<\/table>/g, function (m) {
        return '<div class="jd-table-wrap">' + m + '</div>';
      });
      return '<div class="jd-rich">' + html + '</div>';
    };
    fn.__jdRich = true;
    try { window.renderCustomMarkdown = fn; } catch (e) { return false; }
    return true;
  }

  function init() {
    injectCSS();
    if (!hook()) {
      var tries = 0;
      var timer = setInterval(function () {
        if (hook() || ++tries > 40) clearInterval(timer);
      }, 250);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
