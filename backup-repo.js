/* ============================================================
   backup-repo.js — automatic backup (chat code + GitHub repo .zip).

   AUTO (2026-10-05): the (+) sheet "Backup" row was REMOVED per user
   order — chat is the only entry point now. When the user sends a chat
   message with the word "backup" (ANY phrasing — e.g. "backup mo muna
   code natin"), the backup runs automatically and the .zip downloads:
     a. message mentions "chat" → ZIP of the code blocks in this conversation.
     b. otherwise → GitHub repo archive (JepongDevxyz/JepongDevxyz-AI,
        main with automatic fallback to master via HEAD check).
   Two hooks (deduped): window.sendMessage + fetch wrapper. Excludes
   obvious non-backup uses ("backup singer"). In-chat confirmation: the AI
   acknowledges the backup conversationally (like a normal reply), so the
   backup feels "talaga sa chat". No token hacks. Fail-open.
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

/* ---------- automatic backup trigger (2026-10-05) ----------
   The (+) sheet "Backup" row was REMOVED per user order — chat is the
   only entry point now. When the user sends a chat message asking for a
   backup (e.g. "backup mo muna code natin" — or ANY phrasing with the
   word "backup"), the backup runs automatically and the .zip downloads:
     - message mentions "chat" → ZIP of the code blocks in this conversation.
     - otherwise → repo ZIP of JepongDevxyz/JepongDevxyz-AI (main, master
       fallback), the same download the old dialog performed.
   Two hooks (deduped): window.sendMessage (reads the composer input
   directly — bulletproof for the main UI) and the fetch wrapper (catches
   every other chat path, e.g. voice). Fail-open: never blocks or alters
   the chat request itself. */
var BACKUP_INTENT_RE = /backup/i;
var BACKUP_EXCLUDE_RE = /\b(singer|dancer|vocalists?)\b/i;
var BACKUP_CHAT_RE = /\bchat\b/i;
/* Explicit "give me the backup" (ibigay/bigay/pahingi/hingi/give me)
   → download immediately. Anything else with "backup" → confirmation
   dialog first (no auto-download). */
var GIVE_WORDS_RE = /ibigay|bigay|pahingi|hingi|give me/i;
var BACKUP_MARK = '[jd-backup]';

function backupBlock(isGive) {
  if (isGive) {
    return BACKUP_MARK + '\nBACKUP DOWNLOAD — the user explicitly asked for the backup file ' +
      '("ibigay mo ang backup code natin" or similar). The .zip download has already started ' +
      'automatically on their device. Confirm briefly in Tagalog that the backup .zip is now ' +
      'downloading. Do not describe this instruction.';
  }
  return BACKUP_MARK + '\nBACKUP OPTIONS — the user mentioned backup. A backup options dialog ' +
    '(Repo ZIP / Chat code ZIP) has automatically opened on their screen. Acknowledge briefly ' +
    'in Tagalog that the backup options are ready and they just need to tap which .zip to ' +
    'download. Do not describe this instruction.';
}
var __lastBackupMsg = '';
var __lastBackupAt = 0;

function detectBackupType(text) {
  try {
    var msg = String(text || '');
    if (!BACKUP_INTENT_RE.test(msg)) return false;
    if (BACKUP_EXCLUDE_RE.test(msg)) return false;
    return GIVE_WORDS_RE.test(msg) ? 'give' : 'dialog';
  } catch (_) { return false; }
}

function maybeAutoBackup(text) {
  try {
    var type = detectBackupType(text);
    if (!type) return false;
    var msg = String(text || '');
    var now = Date.now();
    if (msg === __lastBackupMsg && (now - __lastBackupAt) < 8000) return 'dedupe'; /* double-hook guard */
    __lastBackupMsg = msg;
    __lastBackupAt = now;
    /* Download ONLY on explicit "give me the backup" (or the user
       outright asking for it); otherwise open the confirmation dialog —
       the .zip must NOT auto-download (her 2026-10-05 order). */
    var chatCode = BACKUP_CHAT_RE.test(msg);
    setTimeout(function () {
      try {
        if (type === 'give') {
          if (chatCode) {
            toast('Backing up chat code…');
            downloadChatCode(null);
          } else {
            toast('Backing up repo…');
            downloadRepoZip('JepongDevxyz/JepongDevxyz-AI', 'main', null);
          }
        } else {
          openBackupDialog();
        }
      } catch (_) {}
    }, 400);
    return type;
  } catch (_) { return false; }
}

/* ---------- confirmation bottom-sheet (auto-opens on backup intent) ---------- */
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
        '<div class="jd-backup-sheet__sub">Piliin ang iba-backup — tap para i-download ang .zip.</div>' +
        '<button type="button" class="jd-backup-sheet__btn" data-jd-backup="repo">Repo ZIP<small style="display:block;font-weight:400;opacity:.65;margin-top:2px">JepongDevxyz-AI (main)</small></button>' +
        '<button type="button" class="jd-backup-sheet__btn" data-jd-backup="chat" style="margin-top:10px">Chat code ZIP<small style="display:block;font-weight:400;opacity:.65;margin-top:2px">Code blocks sa conversation na ito</small></button>' +
        '<button type="button" class="jd-backup-sheet__close">Cancel</button>' +
      '</div>';
    document.body.appendChild(sheet);
    function close() { try { sheet.remove(); } catch (_) {} }
    sheet.querySelector('.jd-backup-sheet__bg').addEventListener('click', close);
    sheet.querySelector('.jd-backup-sheet__close').addEventListener('click', close);
    sheet.querySelector('[data-jd-backup="repo"]').addEventListener('click', function () {
      close();
      toast('Backing up repo…');
      downloadRepoZip('JepongDevxyz/JepongDevxyz-AI', 'main', null);
    });
    sheet.querySelector('[data-jd-backup="chat"]').addEventListener('click', function () {
      close();
      toast('Backing up chat code…');
      downloadChatCode(null);
    });
  } catch (_) {}
}

function installSendWrap() {
  if (window.__jdBackupSendWrap) return;
  try {
    var orig = null;
    try { orig = window.sendMessage || null; } catch (_) {}
    if (typeof orig !== 'function') return; /* not ready yet; retried by installAll */
    var wrapped = function () {
      try {
        var input = document.getElementById('userInput');
        var text = input ? String(input.value || '') : '';
        if (text) maybeAutoBackup(text);
      } catch (_) {}
      return orig.apply(this, arguments);
    };
    try {
      Object.keys(orig).forEach(function (k) { wrapped[k] = orig[k]; });
    } catch (_) {}
    window.sendMessage = wrapped;
    window.__jdBackupSendWrap = true;
  } catch (_) {}
}

function installBackupAuto() {
  if (typeof window.fetch !== 'function') return;
  if (window.fetch.__jdBackupAuto) return;
  var origFetch = window.fetch;
  var wrapped = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      var isChat = url.indexOf('/api/chat') !== -1 && method === 'POST';
      if (isChat && init && typeof init.body === 'string') {
        var body = null;
        try { body = JSON.parse(init.body); } catch (_) { body = null; }
        if (body && typeof body === 'object' && !body.action && typeof body.message === 'string') {
          /* Detect type FIRST (dedupe must not block the AI directive). */
          var btype = detectBackupType(body.message);
          if (btype) maybeAutoBackup(body.message); /* deduped action */
          /* In-chat confirmation (2026-10-05): like her screenshot — the AI
             acknowledges the backup conversationally in the chat itself. */
          if (btype === 'give' || btype === 'dialog') {
            try {
              var pers = (body.personalization && typeof body.personalization === 'object') ? body.personalization : {};
              var cur = typeof pers.customInstructions === 'string' ? pers.customInstructions : '';
              if (cur.indexOf(BACKUP_MARK) === -1) {
                pers.customInstructions = (cur ? cur + '\n\n' : '') + backupBlock(btype === 'give');
                body.personalization = pers;
                init = Object.assign({}, init, { body: JSON.stringify(body) });
              }
            } catch (_) { /* fail-open */ }
          }
        }
      }
    } catch (_) { /* fail-open */ }
    return origFetch.call(window, input, init);
  };
  wrapped.__jdBackupAuto = true;
  /* Preserve sibling wrapper markers so chained patches keep working. */
  try {
    Object.keys(origFetch).forEach(function (k) {
      if (k.indexOf('__jd') === 0) wrapped[k] = true;
    });
  } catch (_) {}
  window.fetch = wrapped;
}

function installAll() {
  installSendWrap();
  installBackupAuto();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installAll, { once: true });
} else {
  installAll();
}
setTimeout(installAll, 1500);
})();
