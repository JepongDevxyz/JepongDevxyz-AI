/* ============================================================
   opendots-features.js — OpenDots-inspired features for JepongDevxyz AI
   Version: v20261007a145
   
   Three features (all OFF by default, toggles in EXTRA → JepongDevxyz AI):
   1. Specialist Dots — custom AI agents with name, role, instructions
   2. Approval Cards — human-in-the-loop approve/decline for Agent Browse
   3. Spaces — document workspace (save chats as pages, searchable library)
   
   Storage: localStorage (jd_dots_*, jd_approval_*, jd_spaces_*)
   ============================================================ */
(function () {
  'use strict';

  /* ============ TOGGLE STATE ============ */
  function getToggle(key) {
    try { return localStorage.getItem(key) === '1'; } catch (_) { return false; }
  }
  function setToggle(key, on) {
    try { localStorage.setItem(key, on ? '1' : '0'); } catch (_) {}
  }

  window.jdDotsEnabled = function () { return getToggle('jd_dots_enabled'); };
  window.jdSetDots = function (on) { setToggle('jd_dots_enabled', !!on); };
  window.jdApprovalEnabled = function () { return getToggle('jd_approval_enabled'); };
  window.jdSetApproval = function (on) { setToggle('jd_approval_enabled', !!on); };
  window.jdSpacesEnabled = function () { return getToggle('jd_spaces_enabled'); };
  window.jdSetSpaces = function (on) { setToggle('jd_spaces_enabled', !!on); };

  /* Self-contained toast (does not depend on window.showModernToast) */
  function jdToast(msg) {
    try {
      if (typeof window.showModernToast === 'function') {
        window.showModernToast(msg);
        return;
      }
    } catch (_) {}
    try {
      var t = document.createElement('div');
      t.className = 'jd-od-toast';
      t.textContent = msg;
      document.body.appendChild(t);
      ensureToastCSS();
      setTimeout(function () { t.classList.add('show'); }, 10);
      setTimeout(function () {
        t.classList.remove('show');
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
      }, 2200);
    } catch (_) {}
  }
  window.jdOdToast = jdToast;

  /* ============================================================
     1. SPECIALIST DOTS
     Custom AI agents: name, role, instructions, tools.
     Active dot injects its instructions into the system prompt.
     ============================================================ */
  var DOTS_KEY = 'jd_specialist_dots';
  var ACTIVE_DOT_KEY = 'jd_active_dot';

  function loadDots() {
    try {
      var raw = localStorage.getItem(DOTS_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
  function saveDots(dots) {
    try { localStorage.setItem(DOTS_KEY, JSON.stringify(dots)); } catch (_) {}
  }
  function getActiveDotId() {
    try { return localStorage.getItem(ACTIVE_DOT_KEY) || null; } catch (_) { return null; }
  }
  function setActiveDotId(id) {
    try {
      if (id) localStorage.setItem(ACTIVE_DOT_KEY, id);
      else localStorage.removeItem(ACTIVE_DOT_KEY);
    } catch (_) {}
  }
  function getActiveDot() {
    var id = getActiveDotId();
    if (!id) return null;
    var dots = loadDots();
    for (var i = 0; i < dots.length; i++) {
      if (dots[i].id === id) return dots[i];
    }
    return null;
  }

  window.jdDotsList = loadDots;
  window.jdDotsGetActive = getActiveDot;
  window.jdDotsSetActive = setActiveDotId;

  // Inject active dot instructions into outgoing chat requests
  // Hooks the fetch to /api/chat and appends dot context
  (function hookChatForDots() {
    if (window.__jdDotsHooked) return;
    window.__jdDotsHooked = true;
    var origFetch = window.fetch;
    window.fetch = function (url, opts) {
      try {
        var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
        if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body && window.jdDotsEnabled()) {
          var dot = getActiveDot();
          if (dot && dot.instructions) {
            var body = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
            // Skip if a skill was already injected (skill takes precedence over dot)
            if (body && typeof body === 'object' && !body.__dotInjected && !body.__skillInjected) {
              body.__dotInjected = true;
              var dotCtx = '[Specialist Dot: ' + dot.name + ' | Role: ' + (dot.role || 'assistant') + ']\n' +
                           'Instructions: ' + dot.instructions + '\n' +
                           '---\n';
              if (body.message) body.message = dotCtx + body.message;
              if (body.messages && Array.isArray(body.messages) && body.messages.length) {
                // Prepend to first user message
                for (var i = 0; i < body.messages.length; i++) {
                  if (body.messages[i].role === 'user') {
                    body.messages[i].content = dotCtx + body.messages[i].content;
                    break;
                  }
                }
              }
              opts = Object.assign({}, opts, { body: typeof opts.body === 'string' ? JSON.stringify(body) : body });
            }
          }
        }
      } catch (_) {}
      return origFetch.call(this, url, opts);
    };
  })();

  // Dot Manager UI
  window.jdDotsOpenManager = function () {
    try {
      var overlay = document.createElement('div');
      overlay.className = 'jd-dots-overlay';
      overlay.innerHTML =
        '<div class="jd-dots-panel" role="dialog" aria-label="Specialist Dots">' +
        '<div class="jd-dots-head"><strong>🎯 Specialist Dots</strong>' +
        '<button class="jd-dots-close" data-act="close">✕</button></div>' +
        '<div class="jd-dots-sub">Custom AI specialists — each with its own name, role, and instructions.</div>' +
        '<div class="jd-dots-list" id="jdDotsList"></div>' +
        '<button class="jd-dots-add" data-act="add">+ New Dot</button>' +
        '<button class="jd-dots-done" data-act="close">Done</button>' +
        '</div>';

      function renderList() {
        var list = overlay.querySelector('#jdDotsList');
        var dots = loadDots();
        var activeId = getActiveDotId();
        if (!dots.length) {
          list.innerHTML = '<div class="jd-dots-empty">No dots yet. Create one to get started.</div>';
          return;
        }
        list.innerHTML = dots.map(function (d) {
          var isActive = d.id === activeId;
          return '<div class="jd-dot-card' + (isActive ? ' active' : '') + '" data-id="' + d.id + '">' +
            '<div class="jd-dot-info"><strong>' + escapeHtml(d.name) + '</strong>' +
            '<span class="jd-dot-role">' + escapeHtml(d.role || '') + '</span></div>' +
            '<div class="jd-dot-actions">' +
            (isActive
              ? '<button data-act="deactivate">Deactivate</button>'
              : '<button data-act="activate">Activate</button>') +
            '<button data-act="edit">Edit</button>' +
            '<button data-act="delete">Delete</button>' +
            '</div></div>';
        }).join('');
      }

      function openEditor(dot) {
        var isNew = !dot;
        dot = dot || { id: 'dot_' + Date.now(), name: '', role: '', instructions: '' };
        var ed = document.createElement('div');
        ed.className = 'jd-dots-editor-overlay';
        ed.innerHTML =
          '<div class="jd-dots-editor" role="dialog">' +
          '<div class="jd-dots-head"><strong>' + (isNew ? 'New Dot' : 'Edit Dot') + '</strong>' +
          '<button class="jd-dots-close" data-act="close">✕</button></div>' +
          '<label>Name<input type="text" id="jdDotName" value="' + escapeHtml(dot.name) + '" placeholder="e.g. Researcher" maxlength="50"></label>' +
          '<label>Role<input type="text" id="jdDotRole" value="' + escapeHtml(dot.role || '') + '" placeholder="e.g. Deep research specialist" maxlength="100"></label>' +
          '<label>Instructions<textarea id="jdDotInstr" rows="6" placeholder="How should this dot behave? What are its expertise and constraints?">' + escapeHtml(dot.instructions || '') + '</textarea></label>' +
          '<div class="jd-dots-editor-btns">' +
          '<button data-act="save">Save</button>' +
          '<button data-act="close">Cancel</button>' +
          '</div></div>';
        ed.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-act]');
          if (e.target === ed) { document.body.removeChild(ed); return; }
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'close') { document.body.removeChild(ed); return; }
          if (act === 'save') {
            var name = ed.querySelector('#jdDotName').value.trim();
            var role = ed.querySelector('#jdDotRole').value.trim();
            var instr = ed.querySelector('#jdDotInstr').value.trim();
            if (!name) {
              try { window.showModernToast && window.showModernToast('Name is required'); } catch (_) {}
              return;
            }
            var dots = loadDots();
            var found = false;
            for (var i = 0; i < dots.length; i++) {
              if (dots[i].id === dot.id) {
                dots[i].name = name; dots[i].role = role; dots[i].instructions = instr;
                found = true; break;
              }
            }
            if (!found) dots.push({ id: dot.id, name: name, role: role, instructions: instr });
            saveDots(dots);
            document.body.removeChild(ed);
            renderList();
            try { window.showModernToast && window.showModernToast('Dot saved ✓'); } catch (_) {}
          }
        });
        document.body.appendChild(ed);
      }

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { document.body.removeChild(overlay); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'close') { document.body.removeChild(overlay); return; }
        if (act === 'add') { openEditor(null); return; }
        var card = e.target.closest('.jd-dot-card');
        if (!card) return;
        var id = card.getAttribute('data-id');
        var dots = loadDots();
        if (act === 'activate') {
          setActiveDotId(id);
          renderList();
          try { window.showModernToast && window.showModernToast('Dot activated 🎯'); } catch (_) {}
        } else if (act === 'deactivate') {
          setActiveDotId(null);
          renderList();
          try { window.showModernToast && window.showModernToast('Dot deactivated'); } catch (_) {}
        } else if (act === 'edit') {
          var dot = null;
          for (var i = 0; i < dots.length; i++) if (dots[i].id === id) dot = dots[i];
          if (dot) openEditor(dot);
        } else if (act === 'delete') {
          if (!confirm('Delete this dot?')) return;
          saveDots(dots.filter(function (d) { return d.id !== id; }));
          if (getActiveDotId() === id) setActiveDotId(null);
          renderList();
        }
      });

      renderList();
      document.body.appendChild(overlay);
      ensureDotsCSS();
    } catch (_) {}
  };

  function escapeHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ============================================================
     2. APPROVAL CARDS
     Human-in-the-loop for Agent Browse: pause before each action,
     show Approve & Run / Decline card in chat.
     ============================================================ */
  var approvalQueue = [];
  var approvalResolvers = {};

  window.jdApprovalRequest = function (action) {
    // action: { id, type, description, details }
    return new Promise(function (resolve) {
      if (!window.jdApprovalEnabled()) { resolve(true); return; }
      var id = 'appr_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
      approvalResolvers[id] = resolve;
      showApprovalCard(id, action);
    });
  };

  function showApprovalCard(id, action) {
    try {
      var card = document.createElement('div');
      card.className = 'jd-approval-card';
      card.setAttribute('data-approval-id', id);
      card.innerHTML =
        '<div class="jd-approval-head">🛡️ Approval Required</div>' +
        '<div class="jd-approval-type">' + escapeHtml(action.type || 'Action') + '</div>' +
        '<div class="jd-approval-desc">' + escapeHtml(action.description || '') + '</div>' +
        (action.details ? '<div class="jd-approval-details">' + escapeHtml(action.details) + '</div>' : '') +
        '<div class="jd-approval-btns">' +
        '<button class="jd-approval-yes" data-id="' + id + '">✓ Approve & Run</button>' +
        '<button class="jd-approval-no" data-id="' + id + '">✕ Decline</button>' +
        '</div>';

      card.querySelector('.jd-approval-yes').addEventListener('click', function () {
        resolveApproval(id, true);
        card.remove();
      });
      card.querySelector('.jd-approval-no').addEventListener('click', function () {
        resolveApproval(id, false);
        card.remove();
      });

      // Insert into chat — try to find the messages container
      var chat = document.querySelector('[class*="messages"], [class*="chat-list"], main');
      if (chat) chat.appendChild(card);
      else document.body.appendChild(card);

      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      ensureApprovalCSS();
    } catch (_) {
      resolveApproval(id, true); // fail-open if UI breaks
    }
  }

  function resolveApproval(id, approved) {
    var r = approvalResolvers[id];
    if (r) { delete approvalResolvers[id]; r(approved); }
  }

  // Hook into Agent Browse: wrap its action executor if present
  (function hookBrowseForApproval() {
    // Poll for the browse agent's step function and wrap it
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (tries > 100) { clearInterval(iv); return; }
      // Look for known browse agent executors
      if (window.jdBrowseAgent && window.jdBrowseAgent.executeStep && !window.jdBrowseAgent.__approvalHooked) {
        window.jdBrowseAgent.__approvalHooked = true;
        var orig = window.jdBrowseAgent.executeStep;
        window.jdBrowseAgent.executeStep = function (step) {
          var self = this, args = arguments;
          if (!window.jdApprovalEnabled()) return orig.apply(self, args);
          var desc = (step && (step.description || step.action || JSON.stringify(step))) || 'Browse action';
          return window.jdApprovalRequest({ type: 'Browse: ' + ((step && step.type) || 'step'), description: desc })
            .then(function (ok) {
              if (!ok) throw new Error('Declined by user');
              return orig.apply(self, args);
            });
        };
        clearInterval(iv);
      }
    }, 500);
  })();

  /* ============================================================
     3. SPACES
     Document workspace: save chats as pages, searchable library,
     visual editor with formatting.
     ============================================================ */
  var PAGES_KEY = 'jd_spaces_pages';

  function loadPages() {
    try {
      var raw = localStorage.getItem(PAGES_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }
  function savePages(pages) {
    try { localStorage.setItem(PAGES_KEY, JSON.stringify(pages)); } catch (_) {}
  }

  window.jdSpacesList = loadPages;
  window.jdSpacesSave = function (title, content) {
    var pages = loadPages();
    var page = {
      id: 'pg_' + Date.now(),
      title: title || 'Untitled',
      content: content || '',
      created: Date.now(),
      updated: Date.now()
    };
    pages.unshift(page);
    savePages(pages);
    return page;
  };

  window.jdSpacesOpenLibrary = function () {
    try {
      ensureSpacesCSS();
      var overlay = document.createElement('div');
      overlay.className = 'jd-spaces-overlay';
      overlay.innerHTML =
        '<div class="jd-spaces-panel" role="dialog" aria-label="Spaces">' +
        '<div class="jd-spaces-head"><strong>📄 Spaces</strong>' +
        '<button class="jd-spaces-close" data-act="close">✕</button></div>' +
        '<div class="jd-spaces-sub">Your document workspace — save chats as pages.</div>' +
        '<input type="text" class="jd-spaces-search" id="jdSpacesSearch" placeholder="🔍 Search pages...">' +
        '<div class="jd-spaces-list" id="jdSpacesList"></div>' +
        '<div class="jd-spaces-btns">' +
        '<button data-act="new">+ New Page</button>' +
        '<button data-act="close">Done</button>' +
        '</div></div>';

      function renderList(filter) {
        var list = overlay.querySelector('#jdSpacesList');
        var pages = loadPages();
        if (filter) {
          var f = filter.toLowerCase();
          pages = pages.filter(function (p) {
            return (p.title || '').toLowerCase().indexOf(f) !== -1 ||
                   (p.content || '').toLowerCase().indexOf(f) !== -1;
          });
        }
        if (!pages.length) {
          list.innerHTML = '<div class="jd-spaces-empty">' + (filter ? 'No matches.' : 'No pages yet.') + '</div>';
          return;
        }
        list.innerHTML = pages.map(function (p) {
          var dt = new Date(p.updated || p.created);
          return '<div class="jd-space-card" data-id="' + p.id + '">' +
            '<div class="jd-space-title">' + escapeHtml(p.title) + '</div>' +
            '<div class="jd-space-meta">' + dt.toLocaleDateString() + ' · ' + escapeHtml((p.content || '').substring(0, 60)) + '...</div>' +
            '<div class="jd-space-actions">' +
            '<button data-act="open">Open</button>' +
            '<button data-act="delete">Delete</button>' +
            '</div></div>';
        }).join('');
      }

      function openEditor(page) {
        var isNew = !page;
        page = page || { id: 'pg_' + Date.now(), title: '', content: '', created: Date.now(), updated: Date.now() };
        var ed = document.createElement('div');
        ed.className = 'jd-spaces-editor-overlay';
        ed.innerHTML =
          '<div class="jd-spaces-editor" role="dialog">' +
          '<div class="jd-spaces-head"><strong>' + (isNew ? 'New Page' : 'Edit Page') + '</strong>' +
          '<button class="jd-spaces-close" data-act="close">✕</button></div>' +
          '<input type="text" id="jdPageTitle" class="jd-page-title" value="' + escapeHtml(page.title) + '" placeholder="Page title">' +
          '<div class="jd-page-toolbar">' +
          '<button data-fmt="bold" title="Bold"><b>B</b></button>' +
          '<button data-fmt="italic" title="Italic"><i>I</i></button>' +
          '<button data-fmt="h1" title="Heading">H1</button>' +
          '<button data-fmt="h2" title="Heading 2">H2</button>' +
          '<button data-fmt="list" title="List">• List</button>' +
          '<button data-fmt="code" title="Code">&lt;/&gt;</button>' +
          '</div>' +
          '<textarea id="jdPageContent" class="jd-page-content" rows="14" placeholder="Write here... (Markdown supported)">' + escapeHtml(page.content) + '</textarea>' +
          '<div class="jd-spaces-editor-btns">' +
          '<button data-act="save">💾 Save</button>' +
          '<button data-act="close">Cancel</button>' +
          '</div></div>';

        ed.addEventListener('click', function (e) {
          var fmt = e.target.closest('[data-fmt]');
          if (fmt) {
            var ta = ed.querySelector('#jdPageContent');
            var f = fmt.getAttribute('data-fmt');
            var s = ta.selectionStart, en = ta.selectionEnd;
            var sel = ta.value.substring(s, en) || 'text';
            var rep = sel;
            if (f === 'bold') rep = '**' + sel + '**';
            else if (f === 'italic') rep = '*' + sel + '*';
            else if (f === 'h1') rep = '\n# ' + sel;
            else if (f === 'h2') rep = '\n## ' + sel;
            else if (f === 'list') rep = '\n- ' + sel;
            else if (f === 'code') rep = '`' + sel + '`';
            ta.value = ta.value.substring(0, s) + rep + ta.value.substring(en);
            ta.focus();
            return;
          }
          var btn = e.target.closest('[data-act]');
          if (e.target === ed) { document.body.removeChild(ed); return; }
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'close') { document.body.removeChild(ed); return; }
          if (act === 'save') {
            page.title = ed.querySelector('#jdPageTitle').value.trim() || 'Untitled';
            page.content = ed.querySelector('#jdPageContent').value;
            page.updated = Date.now();
            var pages = loadPages();
            var found = false;
            for (var i = 0; i < pages.length; i++) {
              if (pages[i].id === page.id) { pages[i] = page; found = true; break; }
            }
            if (!found) pages.unshift(page);
            savePages(pages);
            document.body.removeChild(ed);
            renderList(overlay.querySelector('#jdSpacesSearch').value);
            try { window.showModernToast && window.showModernToast('Page saved ✓'); } catch (_) {}
          }
        });
        document.body.appendChild(ed);
      }

      overlay.querySelector('#jdSpacesSearch').addEventListener('input', function (e) {
        renderList(e.target.value);
      });

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) { document.body.removeChild(overlay); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'close') { document.body.removeChild(overlay); return; }
        if (act === 'new') { openEditor(null); return; }
        var card = e.target.closest('.jd-space-card');
        if (!card) return;
        var id = card.getAttribute('data-id');
        var pages = loadPages();
        if (act === 'open') {
          var pg = null;
          for (var i = 0; i < pages.length; i++) if (pages[i].id === id) pg = pages[i];
          if (pg) openEditor(pg);
        } else if (act === 'delete') {
          if (!confirm('Delete this page?')) return;
          savePages(pages.filter(function (p) { return p.id !== id; }));
          renderList(overlay.querySelector('#jdSpacesSearch').value);
        }
      });

      renderList('');
      document.body.appendChild(overlay);
    } catch (_) {}
  };

  // "Save as page" — callable from chat (e.g. long-press menu or command)
  window.jdSpacesSaveChat = function (title, content) {
    if (!window.jdSpacesEnabled()) return null;
    return window.jdSpacesSave(title, content);
  };

  /* ============ CSS ============ */
  function ensureToastCSS() {
    if (document.getElementById('jdOdToastCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdOdToastCSS';
    st.textContent = '.jd-od-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px);' +
      'background:rgba(20,20,35,.95);color:#fff;padding:10px 18px;border-radius:24px;font-size:13px;' +
      'z-index:10001;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;' +
      'border:1px solid rgba(255,255,255,.12);box-shadow:0 4px 16px rgba(0,0,0,.4);white-space:nowrap}' +
      '.jd-od-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}';
    document.head.appendChild(st);
  }

  function ensureDotsCSS() {
    if (document.getElementById('jdDotsCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdDotsCSS';
    st.textContent = '.jd-dots-overlay,.jd-dots-editor-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.jd-dots-panel,.jd-dots-editor{background:var(--bg,#1a1a2e);border-radius:16px;padding:20px;max-width:480px;width:100%;max-height:85vh;overflow-y:auto;color:var(--text,#fff)}' +
      '.jd-dots-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}' +
      '.jd-dots-sub{font-size:12px;opacity:.6;margin-bottom:14px}' +
      '.jd-dots-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}' +
      '.jd-dot-card{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;display:flex;justify-content:space-between;align-items:center}' +
      '.jd-dot-card.active{border-color:#7c5cff;background:rgba(124,92,255,.08)}' +
      '.jd-dot-role{display:block;font-size:11px;opacity:.55}' +
      '.jd-dot-actions{display:flex;gap:6px}' +
      '.jd-dot-actions button,.jd-dots-add,.jd-dots-done,.jd-dots-editor-btns button{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font-size:13px}' +
      '.jd-dots-add{width:100%;margin-bottom:8px}' +
      '.jd-dots-done{width:100%}' +
      '.jd-dots-empty{text-align:center;opacity:.5;padding:20px;font-size:13px}' +
      '.jd-dots-editor label{display:block;margin-bottom:10px;font-size:13px}' +
      '.jd-dots-editor input,.jd-dots-editor textarea{width:100%;margin-top:4px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;font-size:14px;box-sizing:border-box}' +
      '.jd-dots-editor-btns{display:flex;gap:8px;margin-top:4px}';
    document.head.appendChild(st);
  }

  function ensureApprovalCSS() {
    if (document.getElementById('jdApprovalCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdApprovalCSS';
    st.textContent = '.jd-approval-card{border:2px solid #f5a623;border-radius:12px;padding:14px;margin:10px 0;background:rgba(245,166,35,.07)}' +
      '.jd-approval-head{font-weight:700;margin-bottom:6px}' +
      '.jd-approval-type{font-size:12px;opacity:.6;margin-bottom:4px}' +
      '.jd-approval-desc{font-size:14px;margin-bottom:6px}' +
      '.jd-approval-details{font-size:12px;opacity:.55;background:rgba(0,0,0,.2);padding:6px 8px;border-radius:6px;margin-bottom:10px;word-break:break-all}' +
      '.jd-approval-btns{display:flex;gap:8px}' +
      '.jd-approval-yes{flex:1;padding:10px;border-radius:8px;border:none;background:#22c55e;color:#fff;font-weight:600;cursor:pointer}' +
      '.jd-approval-no{flex:1;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:transparent;color:inherit;cursor:pointer}';
    document.head.appendChild(st);
  }

  function ensureSpacesCSS() {
    if (document.getElementById('jdSpacesCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdSpacesCSS';
    st.textContent = '.jd-spaces-overlay,.jd-spaces-editor-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.jd-spaces-panel,.jd-spaces-editor{background:var(--bg,#1a1a2e);border-radius:16px;padding:20px;max-width:520px;width:100%;max-height:88vh;overflow-y:auto;color:var(--text,#fff)}' +
      '.jd-spaces-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}' +
      '.jd-spaces-sub{font-size:12px;opacity:.6;margin-bottom:12px}' +
      '.jd-spaces-search{width:100%;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;margin-bottom:12px;box-sizing:border-box}' +
      '.jd-spaces-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px;max-height:40vh;overflow-y:auto}' +
      '.jd-space-card{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px}' +
      '.jd-space-title{font-weight:600;margin-bottom:2px}' +
      '.jd-space-meta{font-size:11px;opacity:.5;margin-bottom:6px}' +
      '.jd-space-actions{display:flex;gap:6px}' +
      '.jd-space-actions button,.jd-spaces-btns button,.jd-spaces-editor-btns button{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font-size:13px}' +
      '.jd-spaces-btns{display:flex;gap:8px}.jd-spaces-btns button{flex:1}' +
      '.jd-spaces-empty{text-align:center;opacity:.5;padding:20px;font-size:13px}' +
      '.jd-page-title{width:100%;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;margin-bottom:8px;box-sizing:border-box;font-size:15px;font-weight:600}' +
      '.jd-page-toolbar{display:flex;gap:6px;margin-bottom:8px}' +
      '.jd-page-toolbar button{padding:5px 10px;border-radius:6px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font-size:13px}' +
      '.jd-page-content{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;box-sizing:border-box;font-size:14px;line-height:1.5;resize:vertical}' +
      '.jd-spaces-editor-btns{display:flex;gap:8px;margin-top:10px}.jd-spaces-editor-btns button{flex:1}';
    document.head.appendChild(st);
  }

  console.log('[opendots-features] loaded v20261007a145');
})();
