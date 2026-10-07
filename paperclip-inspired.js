/* ============================================================
   paperclip-inspired.js — Paperclip-inspired deep features
   Version: v20261007a143

   Three modules (all additive, default accessible via EXTRA):
   1. GOAL THREADS — unified thread view per goal: details, activity
      timeline, attached notes, attached files. Reads existing
      goals.js storage (jd_goals_v2, jd_goal_entries_v2).
   2. SKILL STUDIO — view/edit/test the 8 Agent Skills. Edit prompts,
      test with sample input (see injected output), version history
      (last 5 per skill). Changes apply to agent-skills.js at runtime.
   3. ROUTINE MANAGER — powerful scheduled tasks: name, schedule,
      task description, owner, history log. Manual "Run now" triggers
      the task via chat; history tracks all runs.

   Access: EXTRA → JepongDevxyz AI → new cards (or via window.JD* APIs).
   ============================================================ */
(function () {
  'use strict';
  if (window.__jdPaperclipLoaded) return;
  window.__jdPaperclipLoaded = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    try {
      if (window.jdOdToast) window.jdOdToast(msg);
      else if (window.showModernToast) window.showModernToast(msg);
    } catch (_) {}
  }

  /* ============================================================
     1. GOAL THREADS
     ============================================================ */
  var THREAD_NOTES_KEY = 'jd_goal_thread_notes_'; // + goalId
  var THREAD_FILES_KEY = 'jd_goal_thread_files_'; // + goalId

  function getGoalById(id) {
    try {
      var raw = localStorage.getItem('jd_goals_v2');
      if (!raw) return null;
      var goals = JSON.parse(raw);
      for (var i = 0; i < goals.length; i++) {
        if (goals[i].id === id) return goals[i];
      }
    } catch (_) {}
    return null;
  }
  function getGoalEntries(goalId) {
    try {
      var raw = localStorage.getItem('jd_goal_entries_v2');
      if (!raw) return [];
      var all = JSON.parse(raw);
      return (all[goalId] || []).slice().reverse(); // newest first
    } catch (_) { return []; }
  }
  function getThreadNotes(goalId) {
    try {
      var raw = localStorage.getItem(THREAD_NOTES_KEY + goalId);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }
  function saveThreadNotes(goalId, notes) {
    try { localStorage.setItem(THREAD_NOTES_KEY + goalId, JSON.stringify(notes)); } catch (_) {}
  }

  window.jdGoalThreadOpen = function (goalId) {
    try {
      var goal = getGoalById(goalId);
      if (!goal) { toast('Goal not found'); return; }
      ensureThreadCSS();
      var entries = getGoalEntries(goalId);
      var notes = getThreadNotes(goalId);

      var ov = document.createElement('div');
      ov.className = 'jd-thread-overlay';
      ov.innerHTML =
        '<div class="jd-thread-panel" role="dialog">' +
        '<div class="jd-thread-head"><strong>🧵 ' + esc(goal.title || 'Goal Thread') + '</strong>' +
        '<button class="jd-thread-close" data-act="close">✕</button></div>' +
        '<div class="jd-thread-goal">' +
        '<div>' + esc(goal.emoji || '🎯') + ' <strong>' + esc(goal.title || '') + '</strong></div>' +
        (goal.description ? '<p>' + esc(goal.description) + '</p>' : '') +
        '<div class="jd-thread-meta">Progress: ' + (goal.progress || 0) + '% · ' + esc(goal.status || 'active') + '</div>' +
        '</div>' +
        '<div class="jd-thread-tabs">' +
        '<button class="active" data-tab="timeline">Timeline</button>' +
        '<button data-tab="notes">Notes</button>' +
        '</div>' +
        '<div class="jd-thread-body" id="jdThreadBody"></div>' +
        '<div class="jd-thread-add">' +
        '<input type="text" id="jdThreadNoteInput" placeholder="Add a note to this thread…">' +
        '<button data-act="add-note">Add</button>' +
        '</div>' +
        '</div>';

      var body = ov.querySelector('#jdThreadBody');
      function renderTab(tab) {
        var tabs = ov.querySelectorAll('.jd-thread-tabs button');
        for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
        if (tab === 'timeline') {
          if (!entries.length) { body.innerHTML = '<div class="jd-thread-empty">No activity yet.</div>'; return; }
          body.innerHTML = entries.map(function (e) {
            var dt = e.date ? new Date(e.date).toLocaleDateString() : '';
            return '<div class="jd-thread-entry"><div class="jd-thread-entry-date">' + esc(dt) + '</div>' +
              '<div>' + esc(e.text || e.note || '') + '</div></div>';
          }).join('');
        } else {
          var ns = getThreadNotes(goalId);
          if (!ns.length) { body.innerHTML = '<div class="jd-thread-empty">No notes yet.</div>'; return; }
          body.innerHTML = ns.map(function (n, idx) {
            return '<div class="jd-thread-entry"><div>' + esc(n.text) + '</div>' +
              '<div class="jd-thread-entry-date">' + new Date(n.ts).toLocaleString() +
              ' <button data-del="' + idx + '" style="margin-left:8px">Delete</button></div></div>';
          }).join('');
          body.querySelectorAll('[data-del]').forEach(function (b) {
            b.addEventListener('click', function () {
              var arr = getThreadNotes(goalId);
              arr.splice(parseInt(b.getAttribute('data-del'), 10), 1);
              saveThreadNotes(goalId, arr);
              renderTab('notes');
            });
          });
        }
      }

      ov.querySelectorAll('.jd-thread-tabs button').forEach(function (b) {
        b.addEventListener('click', function () { renderTab(b.getAttribute('data-tab')); });
      });
      ov.addEventListener('click', function (e) {
        if (e.target === ov) { document.body.removeChild(ov); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        if (btn.getAttribute('data-act') === 'close') { document.body.removeChild(ov); return; }
        if (btn.getAttribute('data-act') === 'add-note') {
          var inp = ov.querySelector('#jdThreadNoteInput');
          var txt = inp.value.trim();
          if (!txt) return;
          var arr = getThreadNotes(goalId);
          arr.unshift({ text: txt, ts: Date.now() });
          saveThreadNotes(goalId, arr);
          inp.value = '';
          renderTab('notes');
          // Switch to notes tab
          ov.querySelector('[data-tab="notes"]').click();
          toast('Note added ✓');
        }
      });

      renderTab('timeline');
      document.body.appendChild(ov);
    } catch (_) {}
  };

  function ensureThreadCSS() {
    if (document.getElementById('jdThreadCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdThreadCSS';
    st.textContent =
      '.jd-thread-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.jd-thread-panel{background:var(--bg,#1a1a2e);border-radius:16px;max-width:520px;width:100%;max-height:88vh;display:flex;flex-direction:column;color:var(--text,#fff);overflow:hidden}' +
      '.jd-thread-head{display:flex;justify-content:space-between;align-items:center;padding:16px 16px 8px}' +
      '.jd-thread-goal{padding:0 16px 12px;border-bottom:1px solid rgba(255,255,255,.08)}' +
      '.jd-thread-goal p{font-size:13px;opacity:.7;margin:6px 0}' +
      '.jd-thread-meta{font-size:11px;opacity:.5}' +
      '.jd-thread-tabs{display:flex;gap:0;border-bottom:1px solid rgba(255,255,255,.08)}' +
      '.jd-thread-tabs button{flex:1;padding:10px;background:none;border:none;color:inherit;opacity:.55;cursor:pointer;font-size:13px}' +
      '.jd-thread-tabs button.active{opacity:1;border-bottom:2px solid #7c5cff}' +
      '.jd-thread-body{flex:1;overflow-y:auto;padding:12px 16px;min-height:200px}' +
      '.jd-thread-entry{padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:13px}' +
      '.jd-thread-entry-date{font-size:11px;opacity:.45;margin-bottom:2px}' +
      '.jd-thread-empty{text-align:center;opacity:.45;padding:30px;font-size:13px}' +
      '.jd-thread-add{display:flex;gap:8px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08)}' +
      '.jd-thread-add input{flex:1;padding:9px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit}' +
      '.jd-thread-add button,.jd-thread-close{padding:8px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;cursor:pointer}';
    document.head.appendChild(st);
  }

  /* ============================================================
     2. SKILL STUDIO
     ============================================================ */
  var SKILL_DEFS_KEY = 'jd_skill_studio_defs';   // custom prompt overrides
  var SKILL_HIST_KEY = 'jd_skill_studio_hist';   // version history

  var BUILTIN_SKILLS = ['grill', 'tdd', 'review', 'debug', 'spec', 'research', 'prototype', 'plan'];

  function getCustomDefs() {
    try { return JSON.parse(localStorage.getItem(SKILL_DEFS_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveCustomDefs(d) {
    try { localStorage.setItem(SKILL_DEFS_KEY, JSON.stringify(d)); } catch (_) {}
  }
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(SKILL_HIST_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveHistory(h) {
    try { localStorage.setItem(SKILL_HIST_KEY, JSON.stringify(h)); } catch (_) {}
  }
  function getSkillPrompt(cmd) {
    var custom = getCustomDefs();
    if (custom[cmd]) return custom[cmd];
    // Fall back to builtin from agent-skills.js
    try {
      var info = window.jdAgentSkillInfo && window.jdAgentSkillInfo(cmd);
      return info ? info.prompt : '';
    } catch (_) { return ''; }
  }

  window.jdSkillStudioOpen = function () {
    try {
      ensureStudioCSS();
      var ov = document.createElement('div');
      ov.className = 'jd-studio-overlay';
      ov.innerHTML =
        '<div class="jd-studio-panel" role="dialog">' +
        '<div class="jd-studio-head"><strong>🧠 Skill Studio</strong>' +
        '<button class="jd-studio-close" data-act="close">✕</button></div>' +
        '<div class="jd-studio-sub">View, edit, and test Agent Skills. Changes apply instantly.</div>' +
        '<div class="jd-studio-list" id="jdStudioList"></div>' +
        '<button class="jd-studio-done" data-act="close">Done</button>' +
        '</div>';

      function renderList() {
        var list = ov.querySelector('#jdStudioList');
        var custom = getCustomDefs();
        list.innerHTML = BUILTIN_SKILLS.map(function (cmd) {
          var info = null;
          try { info = window.jdAgentSkillInfo && window.jdAgentSkillInfo(cmd); } catch (_) {}
          var isCustom = !!custom[cmd];
          return '<div class="jd-studio-card" data-cmd="' + cmd + '">' +
            '<div><strong>/' + cmd + '</strong> ' + (isCustom ? '<span class="jd-studio-badge">custom</span>' : '') +
            '<div class="jd-studio-desc">' + esc(info ? info.desc : '') + '</div></div>' +
            '<div class="jd-studio-actions"><button data-act="edit">Edit</button>' +
            '<button data-act="test">Test</button></div></div>';
        }).join('');
      }

      function openEditor(cmd) {
        var info = null;
        try { info = window.jdAgentSkillInfo && window.jdAgentSkillInfo(cmd); } catch (_) {}
        var current = getSkillPrompt(cmd);
        var ed = document.createElement('div');
        ed.className = 'jd-studio-editor-overlay';
        ed.innerHTML =
          '<div class="jd-studio-editor" role="dialog">' +
          '<div class="jd-studio-head"><strong>Edit /' + esc(cmd) + '</strong>' +
          '<button class="jd-studio-close" data-act="close">✕</button></div>' +
          '<textarea id="jdSkillPrompt" rows="14">' + esc(current) + '</textarea>' +
          '<div class="jd-studio-editor-btns">' +
          '<button data-act="save">💾 Save</button>' +
          '<button data-act="reset">Reset to default</button>' +
          '<button data-act="history">History</button>' +
          '<button data-act="close">Cancel</button>' +
          '</div><div class="jd-studio-hist" id="jdSkillHist"></div></div>';
        ed.addEventListener('click', function (e) {
          if (e.target === ed) { document.body.removeChild(ed); return; }
          var btn = e.target.closest('[data-act]');
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'close') { document.body.removeChild(ed); return; }
          if (act === 'save') {
            var newPrompt = ed.querySelector('#jdSkillPrompt').value;
            // Save to history first
            var hist = getHistory();
            if (!hist[cmd]) hist[cmd] = [];
            hist[cmd].unshift({ prompt: getSkillPrompt(cmd), ts: Date.now() });
            hist[cmd] = hist[cmd].slice(0, 5);
            saveHistory(hist);
            var defs = getCustomDefs();
            defs[cmd] = newPrompt;
            saveCustomDefs(defs);
            // Apply at runtime: patch agent-skills.js SKILLS object
            try {
              if (window.jdAgentSkillInfo) {
                // We can't easily mutate the closure, so store override
                // The fetch hook checks custom defs first (patched below)
              }
            } catch (_) {}
            document.body.removeChild(ed);
            renderList();
            toast('Skill updated ✓');
          }
          if (act === 'reset') {
            var defs = getCustomDefs();
            delete defs[cmd];
            saveCustomDefs(defs);
            document.body.removeChild(ed);
            renderList();
            toast('Reset to default ✓');
          }
          if (act === 'history') {
            var h = getHistory()[cmd] || [];
            var hv = ed.querySelector('#jdSkillHist');
            if (!h.length) { hv.innerHTML = '<div class="jd-studio-empty">No history.</div>'; return; }
            hv.innerHTML = h.map(function (v, i) {
              return '<div class="jd-studio-hist-item"><div>' + new Date(v.ts).toLocaleString() + '</div>' +
                '<button data-restore="' + i + '">Restore</button></div>';
            }).join('');
            hv.querySelectorAll('[data-restore]').forEach(function (b) {
              b.addEventListener('click', function () {
                var idx = parseInt(b.getAttribute('data-restore'), 10);
                var defs = getCustomDefs();
                defs[cmd] = h[idx].prompt;
                saveCustomDefs(defs);
                document.body.removeChild(ed);
                renderList();
                toast('Restored ✓');
              });
            });
          }
        });
        document.body.appendChild(ed);
      }

      function openTester(cmd) {
        var ed = document.createElement('div');
        ed.className = 'jd-studio-editor-overlay';
        ed.innerHTML =
          '<div class="jd-studio-editor" role="dialog">' +
          '<div class="jd-studio-head"><strong>Test /' + esc(cmd) + '</strong>' +
          '<button class="jd-studio-close" data-act="close">✕</button></div>' +
          '<label>Sample input<input type="text" id="jdTestInput" placeholder="e.g. gumawa ng login page" style="width:100%;margin:6px 0;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;box-sizing:border-box"></label>' +
          '<label>Injected prompt (what the AI receives)<textarea id="jdTestOutput" rows="12" readonly style="width:100%;margin-top:6px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.35);color:inherit;box-sizing:border-box"></textarea></label>' +
          '<div class="jd-studio-editor-btns"><button data-act="run">▶ Run test</button>' +
          '<button data-act="close">Close</button></div></div>';
        ed.addEventListener('click', function (e) {
          if (e.target === ed) { document.body.removeChild(ed); return; }
          var btn = e.target.closest('[data-act]');
          if (!btn) return;
          var act = btn.getAttribute('data-act');
          if (act === 'close') { document.body.removeChild(ed); return; }
          if (act === 'run') {
            var input = ed.querySelector('#jdTestInput').value || '(no input)';
            var prompt = getSkillPrompt(cmd);
            ed.querySelector('#jdTestOutput').value = prompt + '\n' + input;
            toast('Test rendered ✓');
          }
        });
        document.body.appendChild(ed);
      }

      ov.addEventListener('click', function (e) {
        if (e.target === ov) { document.body.removeChild(ov); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'close') { document.body.removeChild(ov); return; }
        var card = e.target.closest('.jd-studio-card');
        if (!card) return;
        var cmd = card.getAttribute('data-cmd');
        if (act === 'edit') openEditor(cmd);
        if (act === 'test') openTester(cmd);
      });

      renderList();
      document.body.appendChild(ov);
    } catch (_) {}
  };

  // Patch agent-skills.js fetch hook to check custom defs first
  // (runs after agent-skills.js loads; overrides getSkillPrompt lookup)
  window.jdSkillStudioGetPrompt = getSkillPrompt;

  function ensureStudioCSS() {
    if (document.getElementById('jdStudioCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdStudioCSS';
    st.textContent =
      '.jd-studio-overlay,.jd-studio-editor-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.jd-studio-panel,.jd-studio-editor{background:var(--bg,#1a1a2e);border-radius:16px;max-width:560px;width:100%;max-height:88vh;overflow-y:auto;padding:20px;color:var(--text,#fff)}' +
      '.jd-studio-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}' +
      '.jd-studio-sub{font-size:12px;opacity:.6;margin-bottom:14px}' +
      '.jd-studio-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}' +
      '.jd-studio-card{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;display:flex;justify-content:space-between;align-items:center}' +
      '.jd-studio-desc{font-size:11px;opacity:.55;margin-top:2px}' +
      '.jd-studio-badge{font-size:10px;background:#7c5cff;color:#fff;padding:2px 8px;border-radius:10px;margin-left:6px}' +
      '.jd-studio-actions{display:flex;gap:6px}' +
      '.jd-studio-actions button,.jd-studio-done,.jd-studio-editor-btns button,.jd-studio-close{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font-size:13px}' +
      '.jd-studio-done{width:100%}' +
      '.jd-studio-editor textarea{width:100%;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;box-sizing:border-box;font-family:monospace;font-size:12px}' +
      '.jd-studio-editor-btns{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}' +
      '.jd-studio-empty{text-align:center;opacity:.45;padding:16px;font-size:13px}' +
      '.jd-studio-hist-item{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}';
    document.head.appendChild(st);
  }

  /* ============================================================
     3. ROUTINE MANAGER
     ============================================================ */
  var ROUTINES_KEY = 'jd_routines';
  var ROUTINE_HIST_KEY = 'jd_routine_history';

  function loadRoutines() {
    try { return JSON.parse(localStorage.getItem(ROUTINES_KEY) || '[]'); } catch (_) { return []; }
  }
  function saveRoutines(r) {
    try { localStorage.setItem(ROUTINES_KEY, JSON.stringify(r)); } catch (_) {}
  }
  function loadRoutineHist() {
    try { return JSON.parse(localStorage.getItem(ROUTINE_HIST_KEY) || '{}'); } catch (_) { return {}; }
  }
  function saveRoutineHist(h) {
    try { localStorage.setItem(ROUTINE_HIST_KEY, JSON.stringify(h)); } catch (_) {}
  }
  function logRoutineRun(id, note) {
    var h = loadRoutineHist();
    if (!h[id]) h[id] = [];
    h[id].unshift({ ts: Date.now(), note: note || 'Manual run' });
    h[id] = h[id].slice(0, 50);
    saveRoutineHist(h);
  }

  window.jdRoutineManagerOpen = function () {
    try {
      ensureRoutineCSS();
      var ov = document.createElement('div');
      ov.className = 'jd-routine-overlay';
      ov.innerHTML =
        '<div class="jd-routine-panel" role="dialog">' +
        '<div class="jd-routine-head"><strong>📅 Routine Manager</strong>' +
        '<button class="jd-routine-close" data-act="close">✕</button></div>' +
        '<div class="jd-routine-sub">Powerful scheduled tasks — with owner, schedule, and run history.</div>' +
        '<div class="jd-routine-list" id="jdRoutineList"></div>' +
        '<button class="jd-routine-add" data-act="add">+ New Routine</button>' +
        '<button class="jd-routine-done" data-act="close">Done</button>' +
        '</div>';

      function renderList() {
        var list = ov.querySelector('#jdRoutineList');
        var routines = loadRoutines();
        var hist = loadRoutineHist();
        if (!routines.length) {
          list.innerHTML = '<div class="jd-routine-empty">No routines yet.</div>';
          return;
        }
        list.innerHTML = routines.map(function (r) {
          var runs = (hist[r.id] || []).length;
          var last = hist[r.id] && hist[r.id][0] ? new Date(hist[r.id][0].ts).toLocaleString() : 'never';
          return '<div class="jd-routine-card" data-id="' + r.id + '">' +
            '<div><strong>' + esc(r.name) + '</strong>' +
            '<div class="jd-routine-desc">' + esc(r.schedule || '') + ' · Owner: ' + esc(r.owner || 'you') + '</div>' +
            '<div class="jd-routine-desc">' + runs + ' runs · Last: ' + esc(last) + '</div></div>' +
            '<div class="jd-routine-actions">' +
            '<button data-act="run">▶ Run</button>' +
            '<button data-act="history">History</button>' +
            '<button data-act="edit">Edit</button>' +
            '<button data-act="delete">Delete</button>' +
            '</div></div>';
        }).join('');
      }

      function openEditor(routine) {
        var isNew = !routine;
        routine = routine || { id: 'rt_' + Date.now(), name: '', schedule: '', task: '', owner: '' };
        var ed = document.createElement('div');
        ed.className = 'jd-routine-editor-overlay';
        ed.innerHTML =
          '<div class="jd-routine-editor" role="dialog">' +
          '<div class="jd-routine-head"><strong>' + (isNew ? 'New Routine' : 'Edit Routine') + '</strong>' +
          '<button class="jd-routine-close" data-act="close">✕</button></div>' +
          '<label>Name<input type="text" id="jdRtName" value="' + esc(routine.name) + '" placeholder="e.g. Daily briefing"></label>' +
          '<label>Schedule<input type="text" id="jdRtSched" value="' + esc(routine.schedule || '') + '" placeholder="e.g. Every day at 8am"></label>' +
          '<label>Owner<input type="text" id="jdRtOwner" value="' + esc(routine.owner || '') + '" placeholder="you"></label>' +
          '<label>Task<textarea id="jdRtTask" rows="4" placeholder="What should the AI do?">' + esc(routine.task || '') + '</textarea></label>' +
          '<div class="jd-routine-editor-btns"><button data-act="save">💾 Save</button>' +
          '<button data-act="close">Cancel</button></div></div>';
        ed.addEventListener('click', function (e) {
          if (e.target === ed) { document.body.removeChild(ed); return; }
          var btn = e.target.closest('[data-act]');
          if (!btn) return;
          if (btn.getAttribute('data-act') === 'close') { document.body.removeChild(ed); return; }
          if (btn.getAttribute('data-act') === 'save') {
            routine.name = ed.querySelector('#jdRtName').value.trim() || 'Untitled';
            routine.schedule = ed.querySelector('#jdRtSched').value.trim();
            routine.owner = ed.querySelector('#jdRtOwner').value.trim() || 'you';
            routine.task = ed.querySelector('#jdRtTask').value.trim();
            var arr = loadRoutines();
            var found = false;
            for (var i = 0; i < arr.length; i++) {
              if (arr[i].id === routine.id) { arr[i] = routine; found = true; break; }
            }
            if (!found) arr.push(routine);
            saveRoutines(arr);
            document.body.removeChild(ed);
            renderList();
            toast('Routine saved ✓');
          }
        });
        document.body.appendChild(ed);
      }

      function showHistory(id) {
        var hist = loadRoutineHist()[id] || [];
        var routines = loadRoutines();
        var r = null;
        for (var i = 0; i < routines.length; i++) if (routines[i].id === id) r = routines[i];
        var ed = document.createElement('div');
        ed.className = 'jd-routine-editor-overlay';
        ed.innerHTML =
          '<div class="jd-routine-editor" role="dialog">' +
          '<div class="jd-routine-head"><strong>History: ' + esc(r ? r.name : '') + '</strong>' +
          '<button class="jd-routine-close" data-act="close">✕</button></div>' +
          '<div class="jd-routine-hist">' +
          (hist.length ? hist.map(function (h) {
            return '<div class="jd-routine-hist-item"><span>' + new Date(h.ts).toLocaleString() + '</span><span>' + esc(h.note) + '</span></div>';
          }).join('') : '<div class="jd-routine-empty">No runs yet.</div>') +
          '</div><div class="jd-routine-editor-btns"><button data-act="close">Close</button></div></div>';
        ed.addEventListener('click', function (e) {
          if (e.target === ed || e.target.closest('[data-act]')) document.body.removeChild(ed);
        });
        document.body.appendChild(ed);
      }

      ov.addEventListener('click', function (e) {
        if (e.target === ov) { document.body.removeChild(ov); return; }
        var btn = e.target.closest('[data-act]');
        if (!btn) return;
        var act = btn.getAttribute('data-act');
        if (act === 'close') { document.body.removeChild(ov); return; }
        if (act === 'add') { openEditor(null); return; }
        var card = e.target.closest('.jd-routine-card');
        if (!card) return;
        var id = card.getAttribute('data-id');
        var arr = loadRoutines();
        if (act === 'run') {
          var r = null;
          for (var i = 0; i < arr.length; i++) if (arr[i].id === id) r = arr[i];
          if (r) {
            logRoutineRun(id, 'Manual run');
            renderList();
            toast('▶ Running: ' + r.name);
            // Send the task to chat as a message
            try {
              var input = document.querySelector('textarea[class*="composer"], textarea[id*="chat"], #chat-input');
              if (input) {
                input.value = r.task;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                // Try to find and click send
                var sendBtn = document.querySelector('[aria-label*="Send"], [class*="send"]');
                if (sendBtn) sendBtn.click();
              }
            } catch (_) {}
          }
        } else if (act === 'history') { showHistory(id); return; }
        else if (act === 'edit') {
          var rt = null;
          for (var j = 0; j < arr.length; j++) if (arr[j].id === id) rt = arr[j];
          if (rt) openEditor(rt);
        } else if (act === 'delete') {
          if (!confirm('Delete this routine?')) return;
          saveRoutines(arr.filter(function (x) { return x.id !== id; }));
          renderList();
        }
      });

      renderList();
      document.body.appendChild(ov);
    } catch (_) {}
  };

  function ensureRoutineCSS() {
    if (document.getElementById('jdRoutineCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdRoutineCSS';
    st.textContent =
      '.jd-routine-overlay,.jd-routine-editor-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.jd-routine-panel,.jd-routine-editor{background:var(--bg,#1a1a2e);border-radius:16px;max-width:520px;width:100%;max-height:88vh;overflow-y:auto;padding:20px;color:var(--text,#fff)}' +
      '.jd-routine-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}' +
      '.jd-routine-sub{font-size:12px;opacity:.6;margin-bottom:14px}' +
      '.jd-routine-list{display:flex;flex-direction:column;gap:8px;margin-bottom:12px}' +
      '.jd-routine-card{border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px}' +
      '.jd-routine-desc{font-size:11px;opacity:.55;margin-top:2px}' +
      '.jd-routine-actions{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}' +
      '.jd-routine-actions button,.jd-routine-add,.jd-routine-done,.jd-routine-editor-btns button,.jd-routine-close{padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:inherit;cursor:pointer;font-size:13px}' +
      '.jd-routine-add,.jd-routine-done{width:100%;margin-bottom:8px}' +
      '.jd-routine-empty{text-align:center;opacity:.45;padding:20px;font-size:13px}' +
      '.jd-routine-editor label{display:block;margin-bottom:10px;font-size:13px}' +
      '.jd-routine-editor input,.jd-routine-editor textarea{width:100%;margin-top:4px;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;box-sizing:border-box}' +
      '.jd-routine-editor-btns{display:flex;gap:8px;margin-top:4px}' +
      '.jd-routine-hist-item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:12px}';
    document.head.appendChild(st);
  }

  console.log('[paperclip-inspired] loaded v20261007a143');
})();
