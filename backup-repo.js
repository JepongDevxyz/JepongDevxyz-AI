/* ============================================================
   backup-repo.js — in-app backup (chat code + GitHub repo .zip).

   1. Adds a "Backup" row to the composer (+) tool sheet. Tapping it
      opens a bottom-sheet dialog with two sections:
      a. "Code sa chat na ito" — scans the current conversation's
         assistant `pre code` blocks, names them snippet-N.<ext>
         (ext from the language class, default txt), zips them with
         JSZip (same CDN loader as import-memory.js) and downloads
         chat-code-backup-YYYYMMDD-HHmm.zip.
      b. "GitHub repo" — owner/repo input (prefilled
         JepongDevxyz/JepongDevxyz-AI) + branch (default main, with
         automatic fallback to master via HEAD check), downloads the
         repo archive as repo-backup-{owner}-{repo}-{branch}-stamp.zip.
         On 404/403 the user is told the repo may be private or
         missing and to connect GitHub in Settings → Connectors.
   No token hacks. Fail-open everywhere.
   ============================================================ */
(function () {
'use strict';
if (window.__jdBackupRepo) return;
window.__jdBackupRepo = true;

function toast(msg) {
  try {
    if (typeof window.showModernToast === 'function') window.showModernToast(msg);
  } catch (_) {}
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function stamp() {
  try {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
  } catch (_) {
    return '00000000-0000';
  }
}

function safeName(s) {
  return String(s == null ? '' : s).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
}

/* ---------- CSS (injected once, theme via CSS vars) ---------- */
function ensureCss() {
  try {
    if (document.getElementById('jd-backup-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-backup-css';
    st.textContent =
      '.jd-backup-sheet{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center}\n' +
      '.jd-backup-sheet__bg{position:absolute;inset:0;background:rgba(0,0,0,.45)}\n' +
      '.jd-backup-sheet__panel{position:relative;width:100%;max-width:520px;background:var(--modal-bg);' +
      'border:1px solid var(--border-color);border-bottom:none;border-radius:18px 18px 0 0;padding:18px 18px 22px;' +
      'max-height:86vh;overflow-y:auto}\n' +
      '.jd-backup-sheet__grab{width:40px;height:4px;border-radius:2px;background:var(--border-color);margin:0 auto 14px}\n' +
      '.jd-backup-sheet__h{font-size:16px;font-weight:600;color:var(--text-main);margin-bottom:4px}\n' +
      '.jd-backup-sheet__sub{font-size:12px;color:var(--text-main);opacity:.6;margin-bottom:6px}\n' +
      '.jd-backup-sheet__sec{margin-top:16px;padding:14px;border:1px solid var(--border-color);border-radius:14px}\n' +
      '.jd-backup-sheet__sec-h{font-size:14px;font-weight:600;color:var(--text-main)}\n' +
      '.jd-backup-sheet__sec-d{font-size:12px;color:var(--text-main);opacity:.6;margin:4px 0 12px}\n' +
      '.jd-backup-sheet__label{display:block;font-size:12px;color:var(--text-main);opacity:.7;margin:10px 0 6px}\n' +
      '.jd-backup-sheet__input{width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid var(--border-color);' +
      'border-radius:10px;background:transparent;color:var(--text-main);font-size:14px}\n' +
      '.jd-backup-sheet__input:focus{outline:none;border-color:var(--text-main)}\n' +
      '.jd-backup-sheet__btn{display:block;width:100%;padding:12px 0;margin-top:12px;border-radius:12px;font-size:14px;' +
      'font-weight:600;cursor:pointer;background:var(--text-main);border:1px solid var(--text-main);color:var(--modal-bg)}\n' +
      '.jd-backup-sheet__btn:active{transform:scale(.98)}\n' +
      '.jd-backup-sheet__btn:disabled{opacity:.5;cursor:default}\n' +
      '.jd-backup-sheet__close{display:block;width:100%;padding:12px 0;margin-top:14px;border-radius:12px;font-size:14px;' +
      'font-weight:600;cursor:pointer;background:transparent;border:1px solid var(--border-color);color:var(--text-main)}\n' +
      '.jd-backup-sheet__note{font-size:11px;color:var(--text-main);opacity:.5;margin-top:10px;line-height:1.5}\n';
    document.head.appendChild(st);
  } catch (_) {}
}

var SVG_ARCHIVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>';

/* ---------- JSZip loader (same CDN as import-memory.js) ---------- */
function loadJsZip(cb, onErr) {
  try {
    if (window.JSZip) { cb(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = cb;
    s.onerror = function () { if (typeof onErr === 'function') onErr(); else toast('Could not load zip library. Check your connection.'); };
    document.head.appendChild(s);
  } catch (_) {
    if (typeof onErr === 'function') { try { onErr(); } catch (_) {} }
  }
}

/* ---------- download helper ---------- */
function downloadBlob(blob, name) {
  try {
    var U = window.URL || window.webkitURL;
    if (!U || typeof U.createObjectURL !== 'function') return false;
    var url = U.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    try { a.click(); } catch (_) { return false; }
    setTimeout(function () {
      try { a.remove(); U.revokeObjectURL(url); } catch (_) {}
    }, 4000);
    return true;
  } catch (_) {
    return false;
  }
}

/* ---------- section A: scan chat code blocks ---------- */
var EXT_MAP = {
  js: 'js', javascript: 'js', jsx: 'js', mjs: 'js',
  ts: 'ts', typescript: 'ts', tsx: 'ts',
  py: 'py', python: 'py',
  html: 'html', xml: 'xml', css: 'css', scss: 'css',
  json: 'json', java: 'java', kt: 'kt', kotlin: 'kt',
  c: 'c', h: 'h', cpp: 'cpp', cc: 'cpp', cs: 'cs',
  php: 'php', rb: 'rb', go: 'go', rs: 'rs', swift: 'swift',
  sh: 'sh', bash: 'sh', shell: 'sh', zsh: 'sh',
  sql: 'sql', md: 'md', markdown: 'md',
  yml: 'yml', yaml: 'yaml', toml: 'toml', ini: 'ini',
  txt: 'txt', text: 'txt', plaintext: 'txt', vue: 'vue'
};

function extFromClass(className) {
  try {
    var m = /(?:^|\s)language-([A-Za-z0-9+#-]+)/.exec(String(className || ''));
    if (!m) return 'txt';
    var tok = m[1].toLowerCase();
    if (EXT_MAP[tok]) return EXT_MAP[tok];
    var clean = tok.replace(/[^a-z0-9]/g, '');
    return clean || 'txt';
  } catch (_) {
    return 'txt';
  }
}

function scanCodeBlocks() {
  var out = [];
  try {
    var nodes = document.querySelectorAll('#chatBox .msg.bot pre code');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var text = String(el.textContent || '').replace(/^\s+|\s+$/g, '');
      if (!text) continue;
      out.push({ name: 'snippet-' + (out.length + 1) + '.' + extFromClass(el.className), text: text });
    }
  } catch (_) {}
  return out;
}

function downloadChatCode(btn) {
  try {
    var blocks = scanCodeBlocks();
    if (!blocks.length) { toast('Walang code blocks sa chat na ito.'); return; }
    if (btn) btn.disabled = true;
    toast('Zipping ' + blocks.length + ' code file(s)…');
    loadJsZip(function () {
      try {
        var zip = new window.JSZip();
        blocks.forEach(function (b) { zip.file(b.name, b.text); });
        zip.generateAsync({ type: 'blob' }).then(function (blob) {
          var ok = downloadBlob(blob, 'chat-code-backup-' + stamp() + '.zip');
          toast(ok ? 'Na-download: ' + blocks.length + ' code file(s).' : 'Download failed.');
          if (btn) btn.disabled = false;
        }, function () {
          toast('Could not build the zip.');
          if (btn) btn.disabled = false;
        });
      } catch (_) {
        toast('Could not build the zip.');
        if (btn) btn.disabled = false;
      }
    }, function () {
      toast('Could not load zip library. Check your connection.');
      if (btn) btn.disabled = false;
    });
  } catch (_) {
    toast('Scan failed.');
  }
}

/* ---------- section B: GitHub repo archive ---------- */
function archiveUrl(owner, repo, branch) {
  return 'https://github.com/' + encodeURIComponent(owner) + '/' +
    encodeURIComponent(repo) + '/archive/refs/heads/' + encodeURIComponent(branch) + '.zip';
}

function headCheck(url) {
  try {
    return window.fetch(url, { method: 'HEAD' }).then(function (res) {
      return { ok: !!(res && res.ok), status: res ? res.status : 0 };
    }, function () {
      return { ok: false, status: 0 };
    });
  } catch (_) {
    return Promise.resolve({ ok: false, status: 0 });
  }
}

function parseRepoInput(raw) {
  var s = String(raw || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$/i, '');
  var parts = s.split('/').map(function (x) { return x.trim(); }).filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0], repo: parts[1] };
}

function downloadRepoZip(ownerInput, branchInput, btn) {
  try {
    var parsed = parseRepoInput(ownerInput);
    if (!parsed) { toast('Ilagay ang repo bilang owner/name.'); return; }
    var branch = String(branchInput || '').trim() || 'main';
    if (btn) btn.disabled = true;
    toast('Checking repo…');
    var url = archiveUrl(parsed.owner, parsed.repo, branch);
    headCheck(url).then(function (chk) {
      function fail(status) {
        if (btn) btn.disabled = false;
        if (status === 404 || status === 403) {
          toast('Private repo o hindi mahanap — i-connect ang GitHub sa Settings → Connectors.');
        } else {
          toast('Download failed' + (status ? ' (' + status + ')' : '') + '. Check your connection.');
        }
      }
      function proceed(finalBranch, finalUrl) {
        window.fetch(finalUrl).then(function (res) {
          if (!res || !res.ok) throw new Error('http-' + (res && res.status));
          return res.blob();
        }).then(function (blob) {
          var name = 'repo-backup-' + safeName(parsed.owner) + '-' + safeName(parsed.repo) +
            '-' + safeName(finalBranch) + '-' + stamp() + '.zip';
          var ok = downloadBlob(blob, name);
          if (btn) btn.disabled = false;
          if (ok) {
            toast('Repo backup downloaded.');
          } else {
            /* fallback: plain navigation lets the browser handle it */
            try {
              var a = document.createElement('a');
              a.href = finalUrl; a.target = '_blank'; a.rel = 'noopener';
              document.body.appendChild(a); a.click(); a.remove();
              toast('Opening download…');
            } catch (_) { toast('Download failed.'); }
          }
        }, function () { fail(0); });
      }
      if (chk.ok) { proceed(branch, url); return; }
      if (branch === 'main') {
        /* auto-fallback: maybe the default branch is master */
        var mUrl = archiveUrl(parsed.owner, parsed.repo, 'master');
        headCheck(mUrl).then(function (chk2) {
          if (chk2.ok) { proceed('master', mUrl); } else { fail(chk2.status || chk.status); }
        });
        return;
      }
      fail(chk.status);
    });
  } catch (_) {
    toast('Download failed.');
    try { if (btn) btn.disabled = false; } catch (_) {}
  }
}

/* ---------- bottom-sheet dialog ---------- */
function openBackupDialog() {
  try {
    ensureCss();
    if (document.querySelector('.jd-backup-sheet')) return;
    var sheet = document.createElement('div');
    sheet.className = 'jd-backup-sheet';
    sheet.innerHTML =
      '<div class="jd-backup-sheet__bg"></div>' +
      '<div class="jd-backup-sheet__panel" role="dialog" aria-label="Backup">' +
        '<div class="jd-backup-sheet__grab"></div>' +
        '<div class="jd-backup-sheet__h">Backup</div>' +
        '<div class="jd-backup-sheet__sub">I-save ang code o ang buong repo bilang .zip.</div>' +
        '<div class="jd-backup-sheet__sec">' +
          '<div class="jd-backup-sheet__sec-h">Code sa chat na ito</div>' +
          '<div class="jd-backup-sheet__sec-d">I-scan ang code blocks ng AI sa kasalukuyang usapan at i-download as .zip.</div>' +
          '<button type="button" class="jd-backup-sheet__btn" data-act="scan">Scan &amp; download code</button>' +
        '</div>' +
        '<div class="jd-backup-sheet__sec">' +
          '<div class="jd-backup-sheet__sec-h">GitHub repo</div>' +
          '<div class="jd-backup-sheet__sec-d">I-download ang buong repo bilang .zip archive.</div>' +
          '<label class="jd-backup-sheet__label" for="jdBackupRepo">Repo (owner/name)</label>' +
          '<input id="jdBackupRepo" class="jd-backup-sheet__input" type="text" value="' + esc('JepongDevxyz/JepongDevxyz-AI') + '" autocomplete="off" spellcheck="false">' +
          '<label class="jd-backup-sheet__label" for="jdBackupBranch">Branch</label>' +
          '<input id="jdBackupBranch" class="jd-backup-sheet__input" type="text" value="main" autocomplete="off" spellcheck="false">' +
          '<button type="button" class="jd-backup-sheet__btn" data-act="repo">Download repo .zip</button>' +
          '<div class="jd-backup-sheet__note">Public repos lang ang gumagana dito. Para sa private repos, i-connect ang GitHub sa Settings &rarr; Connectors.</div>' +
        '</div>' +
        '<button type="button" class="jd-backup-sheet__close" data-act="close">Isara</button>' +
      '</div>';
    document.body.appendChild(sheet);
    function close() { try { document.removeEventListener('keydown', onKey); } catch (_) {} try { sheet.remove(); } catch (_) {} }
    function onKey(e) { try { if (e && (e.key === 'Escape' || e.keyCode === 27)) close(); } catch (_) {} }
    try { document.addEventListener('keydown', onKey); } catch (_) {}
    sheet.querySelector('.jd-backup-sheet__bg').addEventListener('click', close);
    sheet.querySelector('[data-act="close"]').addEventListener('click', close);
    sheet.querySelector('[data-act="scan"]').addEventListener('click', function () {
      downloadChatCode(this);
    });
    sheet.querySelector('[data-act="repo"]').addEventListener('click', function () {
      var btn = this, repoV = '', branchV = '';
      try {
        repoV = sheet.querySelector('#jdBackupRepo').value;
        branchV = sheet.querySelector('#jdBackupBranch').value;
      } catch (_) {}
      downloadRepoZip(repoV, branchV, btn);
    });
  } catch (_) {}
}

/* ---------- (+) sheet row ---------- */
function injectSheetRow() {
  try {
    var sheet = document.getElementById('composerToolSheet');
    if (!sheet) return;
    if (sheet.querySelector('[data-prompt-source="backup"]')) return; /* once */
    var row = document.createElement('button');
    row.type = 'button';
    row.className = 'prompt-bar__row';
    row.setAttribute('role', 'option');
    row.setAttribute('data-prompt-source', 'backup');
    row.innerHTML =
      '<span class="prompt-bar__row-icon">' + SVG_ARCHIVE + '</span>' +
      '<span class="prompt-bar__row-name">Backup</span>' +
      '<span class="prompt-bar__row-desc">Save chat code or repo</span>';
    row.addEventListener('mousedown', function (e) { try { e.preventDefault(); } catch (_) {} });
    row.addEventListener('click', function () {
      try {
        sheet.hidden = true; /* close the (+) sheet */
        openBackupDialog();
      } catch (_) {}
    });
    try { sheet.insertBefore(row, sheet.firstChild); }
    catch (_) { try { sheet.appendChild(row); } catch (_) {} }
  } catch (_) {}
}

function installAll() {
  injectSheetRow();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAll, { once: true });
} else {
  installAll();
}
setTimeout(installAll, 1500);
setTimeout(injectSheetRow, 3000);
})();
