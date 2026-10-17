// JepongDevxyz AI — Simple Todo list (lightweight todos, complements goals.js).
// localStorage persistence (key: jd_todos). Bottom-sheet UI, dark theme.
//
// Public API (window.jdTodos):
//   add(text)   — add a todo, returns its id (or '' if empty)
//   toggle(id)  — flip done flag, returns the todo or null
//   remove(id)  — delete a todo, returns true/false
//   list()      — array of todos (newest last), shape {id, text, done, createdAt}
//   open()      — open the bottom-sheet panel
//   clearDone() — remove all completed todos
(function () {
  'use strict';
  if (window.__jdTodos) return;
  window.__jdTodos = true;

  var LS_KEY = 'jd_todos';
  var CSS_ID = 'jdTodosCss';

  /* ---------------- styles ---------------- */
  function ensureCss() {
    if (document.getElementById(CSS_ID)) return;
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent =
      '.jd-todo-ov{position:fixed;inset:0;z-index:24950;background:rgba(0,0,0,.55);' +
      'display:flex;align-items:flex-end;justify-content:center;' +
      'opacity:0;transition:opacity .22s ease;}' +
      '.jd-todo-ov.jd-open{opacity:1;}' +
      '.jd-todo-sheet{width:100%;max-width:560px;max-height:78dvh;' +
      'background:#141416;color:#fff;border-radius:20px 20px 0 0;' +
      'display:flex;flex-direction:column;overflow:hidden;' +
      'transform:translateY(100%);transition:transform .25s ease;' +
      'border-top:1px solid rgba(255,255,255,.08);' +
      'font-family:inherit;}' +
      '.jd-todo-ov.jd-open .jd-todo-sheet{transform:translateY(0);}' +
      '.jd-todo-head{display:flex;align-items:center;gap:10px;padding:16px 16px 10px;}' +
      '.jd-todo-title{font-weight:700;font-size:1rem;flex:1;}' +
      '.jd-todo-x{width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.08);' +
      'color:#fff;font-size:16px;cursor:pointer;line-height:1;}' +
      '.jd-todo-x:active{background:rgba(255,255,255,.16);}' +
      '.jd-todo-add{display:flex;gap:8px;padding:4px 16px 12px;}' +
      '.jd-todo-input{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);' +
      'border-radius:12px;color:#fff;font-size:.92rem;padding:11px 12px;outline:none;}' +
      '.jd-todo-input:focus{border-color:#7c5cff;}' +
      '.jd-todo-addbtn{border:0;border-radius:12px;background:#7c5cff;color:#fff;' +
      'font-weight:700;font-size:.92rem;padding:0 18px;cursor:pointer;}' +
      '.jd-todo-addbtn:active{opacity:.85;}' +
      '.jd-todo-list{flex:1;overflow-y:auto;padding:2px 12px 12px;display:flex;' +
      'flex-direction:column;gap:6px;}' +
      '.jd-todo-item{display:flex;align-items:center;gap:10px;' +
      'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);' +
      'border-radius:12px;padding:10px 12px;}' +
      '.jd-todo-check{width:22px;height:22px;border-radius:50%;flex:0 0 auto;cursor:pointer;' +
      'border:2px solid rgba(255,255,255,.35);background:transparent;color:transparent;' +
      'font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;}' +
      '.jd-todo-check.jd-done{background:#7c5cff;border-color:#7c5cff;color:#fff;}' +
      '.jd-todo-text{flex:1;font-size:.9rem;line-height:1.4;word-break:break-word;}' +
      '.jd-todo-item.jd-done .jd-todo-text{text-decoration:line-through;color:#8a8a90;}' +
      '.jd-todo-del{border:0;background:none;color:#8a8a90;font-size:16px;cursor:pointer;' +
      'padding:4px 6px;border-radius:8px;}' +
      '.jd-todo-del:active{color:#ff6b6b;background:rgba(255,107,107,.12);}' +
      '.jd-todo-foot{display:flex;align-items:center;gap:10px;padding:10px 16px 18px;' +
      'border-top:1px solid rgba(255,255,255,.07);}' +
      '.jd-todo-count{flex:1;font-size:.78rem;color:#8a8a90;}' +
      '.jd-todo-clear{border:1px solid rgba(255,255,255,.14);background:none;color:#bbb;' +
      'border-radius:10px;padding:8px 12px;font-size:.8rem;cursor:pointer;}' +
      '.jd-todo-clear:active{background:rgba(255,255,255,.08);}' +
      '.jd-todo-empty{text-align:center;color:#8a8a90;font-size:.88rem;padding:26px 10px;}';
    document.head.appendChild(st);
  }

  /* ---------------- store ---------------- */
  function load() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function save(todos) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(todos)); } catch (e) {}
  }
  function uid() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  /* ---------------- public API ---------------- */
  function add(text) {
    var t = String(text || '').trim();
    if (!t) return '';
    var todos = load();
    var item = { id: uid(), text: t, done: false, createdAt: Date.now() };
    todos.push(item);
    save(todos);
    render();
    return item.id;
  }
  function toggle(id) {
    var todos = load();
    for (var i = 0; i < todos.length; i++) {
      if (todos[i].id === id) {
        todos[i].done = !todos[i].done;
        save(todos);
        render();
        return todos[i];
      }
    }
    return null;
  }
  function remove(id) {
    var todos = load();
    var next = todos.filter(function (t) { return t.id !== id; });
    if (next.length === todos.length) return false;
    save(next);
    render();
    return true;
  }
  function list() {
    return load();
  }
  function clearDone() {
    var todos = load().filter(function (t) { return !t.done; });
    save(todos);
    render();
    return todos;
  }

  /* ---------------- UI ---------------- */
  var overlay = null, listEl = null, countEl = null, inputEl = null;

  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function build() {
    ensureCss();
    overlay = el('div', 'jd-todo-ov');
    var sheet = el('div', 'jd-todo-sheet');

    var head = el('div', 'jd-todo-head');
    head.appendChild(el('div', 'jd-todo-title', '&#9745; Todos'));
    var x = el('button', 'jd-todo-x', '&times;');
    x.setAttribute('aria-label', 'Close');
    x.addEventListener('click', close);
    head.appendChild(x);
    sheet.appendChild(head);

    var addRow = el('div', 'jd-todo-add');
    inputEl = el('input', 'jd-todo-input');
    inputEl.type = 'text';
    inputEl.placeholder = 'Add a todo…';
    inputEl.setAttribute('maxlength', '300');
    var addBtn = el('button', 'jd-todo-addbtn', 'Add');
    function submit() {
      var v = inputEl.value;
      if (add(v)) inputEl.value = '';
      inputEl.focus();
    }
    addBtn.addEventListener('click', submit);
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') submit();
    });
    addRow.appendChild(inputEl);
    addRow.appendChild(addBtn);
    sheet.appendChild(addRow);

    listEl = el('div', 'jd-todo-list');
    sheet.appendChild(listEl);

    var foot = el('div', 'jd-todo-foot');
    countEl = el('div', 'jd-todo-count');
    var clearBtn = el('button', 'jd-todo-clear', 'Clear completed');
    clearBtn.addEventListener('click', clearDone);
    foot.appendChild(countEl);
    foot.appendChild(clearBtn);
    sheet.appendChild(foot);

    overlay.appendChild(sheet);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.parentNode) close();
    });
  }

  function render() {
    if (!overlay) return;
    var todos = load();
    listEl.innerHTML = '';
    var openCount = 0;
    todos.forEach(function (t) {
      if (!t.done) openCount++;
      var item = el('div', 'jd-todo-item' + (t.done ? ' jd-done' : ''));
      var check = el('button', 'jd-todo-check' + (t.done ? ' jd-done' : ''), t.done ? '&#10003;' : '');
      check.setAttribute('aria-label', t.done ? 'Mark open' : 'Mark done');
      (function (id) {
        check.addEventListener('click', function () { toggle(id); });
      })(t.id);
      var txt = el('div', 'jd-todo-text', esc(t.text));
      var del = el('button', 'jd-todo-del', '&times;');
      del.setAttribute('aria-label', 'Delete');
      (function (id) {
        del.addEventListener('click', function () { remove(id); });
      })(t.id);
      item.appendChild(check);
      item.appendChild(txt);
      item.appendChild(del);
      listEl.appendChild(item);
    });
    if (!todos.length) {
      listEl.appendChild(el('div', 'jd-todo-empty', 'No todos yet. Add one above.'));
    }
    countEl.textContent = openCount + ' open · ' + todos.length + ' total';
  }

  function open() {
    if (!overlay) build();
    render();
    if (!overlay.parentNode) document.body.appendChild(overlay);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { overlay.classList.add('jd-open'); });
    });
    setTimeout(function () { try { inputEl.focus(); } catch (e) {} }, 280);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('jd-open');
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 260);
  }

  window.jdTodos = {
    add: add,
    toggle: toggle,
    remove: remove,
    list: list,
    open: open,
    close: close,
    clearDone: clearDone
  };
})();
