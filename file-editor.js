// File Editor — in-app text file editor for JepongDevxyz AI (2026-10-17).
// Opens a full-screen editor modal: textarea-based editing with
// download (Save) and Save-to-Library options.
// Public API: window.jdOpenFileEditor(filename, content)
(function () {
  if (window.__jdFileEditor) return;
  window.__jdFileEditor = true;

  /* ---------------- styles ---------------- */
  function ensureCss() {
    if (document.getElementById('jdFileEditorCss')) return;
    var st = document.createElement('style');
    st.id = 'jdFileEditorCss';
    st.textContent =
      '#jdFileEditor{position:fixed;inset:0;z-index:29600;background:rgba(0,0,0,.55);' +
      'display:none;align-items:stretch;justify-content:center;padding:0}' +
      '#jdFileEditor.open{display:flex}' +
      '#jdFileEditor .fe-panel{background:#0e0e12;color:#eee;width:100%;height:100%;' +
      'display:flex;flex-direction:column;max-width:1000px;box-shadow:0 0 60px rgba(0,0,0,.5)}' +
      '#jdFileEditor .fe-bar{display:flex;align-items:center;gap:8px;padding:10px 12px;' +
      'border-bottom:1px solid rgba(255,255,255,.08);flex-wrap:wrap}' +
      '#jdFileEditor .fe-name{font-weight:700;font-size:.85rem;flex:1;min-width:120px;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '#jdFileEditor .fe-name input{background:#1a1a20;border:1px solid rgba(255,255,255,.12);' +
      'color:#eee;border-radius:8px;padding:6px 10px;font-size:.82rem;width:220px;max-width:60%}' +
      '#jdFileEditor .fe-btn{border:0;border-radius:10px;padding:8px 14px;font-size:.82rem;' +
      'font-weight:600;cursor:pointer;background:#24242c;color:#fff}' +
      '#jdFileEditor .fe-btn.primary{background:#3b82f6}' +
      '#jdFileEditor .fe-btn.ghost{background:transparent;border:1px solid rgba(255,255,255,.15)}' +
      '#jdFileEditor .fe-btn:active{transform:scale(.97)}' +
      '#jdFileEditor .fe-meta{font-size:.72rem;color:#888;padding:6px 12px;' +
      'border-bottom:1px solid rgba(255,255,255,.06);display:flex;gap:16px}' +
      '#jdFileEditor .fe-wrap{flex:1;display:flex;min-height:0}' +
      '#jdFileEditor .fe-lines{background:#131318;color:#555;font-size:13px;line-height:1.6;' +
      'padding:12px 8px 12px 12px;text-align:right;user-select:none;overflow:hidden;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre}' +
      '#jdFileEditor .fe-area{flex:1;background:#0e0e12;color:#e8e8ec;border:0;resize:none;' +
      'font-size:13px;line-height:1.6;padding:12px 14px;outline:none;min-width:0;' +
      'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;tab-size:2}' +
      '#jdFileEditor .fe-foot{display:flex;align-items:center;gap:8px;padding:8px 12px;' +
      'border-top:1px solid rgba(255,255,255,.08);font-size:.72rem;color:#888}' +
      '#jdFileEditor .fe-foot .fe-lang{background:#1a1a20;border:1px solid rgba(255,255,255,.12);' +
      'color:#ccc;border-radius:8px;padding:4px 8px;font-size:.72rem}' +
      'body.theme-light #jdFileEditor .fe-panel{background:#fff;color:#111}' +
      'body.theme-light #jdFileEditor .fe-area{background:#fff;color:#111}' +
      'body.theme-light #jdFileEditor .fe-lines{background:#f4f4f6;color:#aaa}' +
      'body.theme-light #jdFileEditor .fe-btn{background:#eee;color:#111}' +
      'body.theme-light #jdFileEditor .fe-btn.primary{background:#3b82f6;color:#fff}' +
      'body.theme-light #jdFileEditor .fe-name input{background:#f0f0f3;color:#111;' +
      'border-color:rgba(0,0,0,.12)}';
    document.head.appendChild(st);
  }

  /* ---------------- language detect ---------------- */
  var LANGS = {
    js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript',
    html: 'html', htm: 'html', css: 'css', json: 'json', md: 'markdown',
    py: 'python', java: 'java', kt: 'kotlin', c: 'c', cpp: 'cpp', cs: 'csharp',
    php: 'php', rb: 'ruby', go: 'go', rs: 'rust', sql: 'sql', sh: 'shell',
    xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml'
  };
  function detectLang(filename) {
    var ext = (String(filename || '').split('.').pop() || '').toLowerCase();
    return LANGS[ext] || 'text';
  }

  /* ---------------- modal ---------------- */
  var modal = null, area = null, linesEl = null, nameInput = null,
      charCount = null, curName = 'untitled.txt';

  function build() {
    ensureCss();
    if (modal) return;
    modal = document.createElement('div');
    modal.id = 'jdFileEditor';
    modal.innerHTML =
      '<div class="fe-panel">' +
        '<div class="fe-bar">' +
          '<button class="fe-btn ghost" data-fe="close" title="Close">✕</button>' +
          '<span class="fe-name"><input id="jdFeName" value="untitled.txt" spellcheck="false"></span>' +
          '<button class="fe-btn" data-fe="lib" title="Save to Library">📚 Library</button>' +
          '<button class="fe-btn primary" data-fe="save" title="Download file">⬇ Save</button>' +
        '</div>' +
        '<div class="fe-meta"><span id="jdFeLang">text</span><span id="jdFeChars">0 chars</span></div>' +
        '<div class="fe-wrap">' +
          '<div class="fe-lines" id="jdFeLines">1</div>' +
          '<textarea class="fe-area" id="jdFeArea" spellcheck="false" wrap="off"></textarea>' +
        '</div>' +
        '<div class="fe-foot"><span>Powered by Jepong Devxyz</span></div>' +
      '</div>';
    document.body.appendChild(modal);

    area = modal.querySelector('#jdFeArea');
    linesEl = modal.querySelector('#jdFeLines');
    nameInput = modal.querySelector('#jdFeName');
    charCount = modal.querySelector('#jdFeChars');

    // Buttons
    modal.querySelector('[data-fe="close"]').addEventListener('click', close);
    modal.querySelector('[data-fe="save"]').addEventListener('click', downloadFile);
    modal.querySelector('[data-fe="lib"]').addEventListener('click', saveToLibrary);

    // Line numbers + char count
    area.addEventListener('input', refreshMeta);
    area.addEventListener('scroll', function () {
      linesEl.scrollTop = area.scrollTop;
    });

    // Tab inserts two spaces
    area.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var s = area.selectionStart, en = area.selectionEnd;
        var v = area.value;
        area.value = v.slice(0, s) + '  ' + v.slice(en);
        area.selectionStart = area.selectionEnd = s + 2;
        refreshMeta();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    // Filename edits update language label
    nameInput.addEventListener('input', function () {
      modal.querySelector('#jdFeLang').textContent = detectLang(nameInput.value);
    });

    // Backdrop click closes (only when clicking the overlay itself)
    modal.addEventListener('click', function (e) {
      if (e.target === modal) close();
    });
  }

  function refreshMeta() {
    var n = area.value.split('\n').length;
    var nums = [];
    for (var i = 1; i <= n; i++) nums.push(i);
    linesEl.textContent = nums.join('\n');
    charCount.textContent = area.value.length + ' chars · ' + n + ' lines';
  }

  /* ---------------- actions ---------------- */
  function downloadFile() {
    var fname = (nameInput.value || curName || 'untitled.txt').trim() || 'untitled.txt';
    var blob = new Blob([area.value], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
    toast('Downloaded ' + fname);
  }

  function saveToLibrary() {
    var fname = (nameInput.value || curName || 'untitled.txt').trim() || 'untitled.txt';
    try {
      if (window.JDLibrary && typeof window.JDLibrary.saveFile === 'function') {
        window.JDLibrary.saveFile(fname, area.value);
        toast('Saved to Library');
        return;
      }
      // Fallback: stash in localStorage for the Library to pick up
      var key = 'jd_lib_draft_files';
      var drafts = {};
      try { drafts = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) {}
      drafts[fname] = { name: fname, content: area.value, ts: Date.now() };
      localStorage.setItem(key, JSON.stringify(drafts));
      toast('Saved — will appear in Library');
    } catch (e) {
      toast('Save failed');
    }
  }

  function toast(msg) {
    try {
      if (typeof window.jdToast === 'function') { window.jdToast(msg); return; }
    } catch (e) {}
    // Minimal fallback toast
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
      'background:#222;color:#fff;padding:10px 18px;border-radius:12px;font-size:.82rem;' +
      'z-index:29999;box-shadow:0 6px 20px rgba(0,0,0,.4)';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2200);
  }

  /* ---------------- public API ---------------- */
  function open(filename, content) {
    build();
    curName = filename || 'untitled.txt';
    nameInput.value = curName;
    area.value = content == null ? '' : String(content);
    modal.querySelector('#jdFeLang').textContent = detectLang(curName);
    refreshMeta();
    area.scrollTop = 0;
    linesEl.scrollTop = 0;
    modal.classList.add('open');
    setTimeout(function () { area.focus(); }, 50);
  }

  function close() {
    if (modal) modal.classList.remove('open');
  }

  function isOpen() {
    return !!(modal && modal.classList.contains('open'));
  }

  window.jdOpenFileEditor = open;
  window.jdCloseFileEditor = close;
  window.jdFileEditorOpen = isOpen;
})();
