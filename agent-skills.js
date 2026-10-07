/* ============================================================
   agent-skills.js — Agent Skills for JepongDevxyz AI
   Version: v20261007a141
   Inspired by mattpocock/skills (MIT) — adapted as chat slash commands.

   Toggle: EXTRA → JepongDevxyz AI → "Agent Skills" (default OFF)

   Commands (type in chat):
     /grill <request>     — AI asks clarifying questions BEFORE building
     /tdd <task>          — test-driven: tests first, then code
     /review <code>       — code review (standards + logic)
     /debug <problem>     — disciplined debugging loop
     /spec                — turn conversation into formal spec
     /research <topic>    — research with citations
     /prototype <idea>    — quick throwaway prototype/mockup
     /plan <goal>         — break big goal into step-by-step plan
     /skills              — list all available skills

   How it works: intercepts /api/chat fetch, detects leading /command,
   strips it, and prepends the skill's system instructions to the message.
   Shows a badge in chat indicating the active skill mode.
   ============================================================ */
(function () {
  'use strict';

  /* ============ TOGGLE ============ */
  function isEnabled() {
    try { return localStorage.getItem('jd_agent_skills') === '1'; } catch (_) { return false; }
  }
  window.jdAgentSkillsEnabled = isEnabled;
  window.jdSetAgentSkills = function (on) {
    try { localStorage.setItem('jd_agent_skills', on ? '1' : '0'); } catch (_) {}
  };

  /* ============ SKILL DEFINITIONS ============
     Each skill: { name, desc, prompt } — prompt is injected as system context.
     Adapted from mattpocock/skills patterns (MIT licensed). */
  var SKILLS = {
    grill: {
      name: 'Grill',
      desc: 'Ask clarifying questions before building — no code until aligned.',
      prompt:
        '[AGENT SKILL: GRILL MODE]\n' +
        'You are in GRILLING mode. Do NOT write any code yet.\n' +
        'Your job: ask detailed, specific clarifying questions about the request below.\n' +
        'Ask about: exact requirements, edge cases, design preferences, tech constraints,\n' +
        'what "done" looks like, and anything ambiguous.\n' +
        'Ask the most important questions first (max 5 per round).\n' +
        'After the user answers, you may ask follow-ups OR say "Ready — say GO to build."\n' +
        'Never assume. Never build until the user says to proceed.\n' +
        '---\n'
    },
    tdd: {
      name: 'TDD',
      desc: 'Red-green-refactor: write failing test first, then make it pass.',
      prompt:
        '[AGENT SKILL: TDD MODE]\n' +
        'Follow strict test-driven development:\n' +
        '1. RED: write a failing test that captures the desired behavior. Show the test.\n' +
        '2. GREEN: write the MINIMAL code to make the test pass. Show the code.\n' +
        '3. REFACTOR: clean up while keeping tests green.\n' +
        'Do one small vertical slice at a time. Explain what you are testing and why.\n' +
        'If the task is not code, adapt: state the acceptance criteria first, then deliver.\n' +
        '---\n'
    },
    review: {
      name: 'Code Review',
      desc: 'Two-axis review: standards + spec compliance.',
      prompt:
        '[AGENT SKILL: CODE REVIEW MODE]\n' +
        'Review the provided code on two axes:\n' +
        '1. STANDARDS: naming, structure, error handling, security issues, code smells.\n' +
        '2. SPEC: does it do what it claims? Any logic bugs, edge cases missed?\n' +
        'Be specific — cite line numbers or exact snippets.\n' +
        'End with: ✅ what is good, ⚠️ what should change, 🔴 what must change.\n' +
        '---\n'
    },
    debug: {
      name: 'Debug',
      desc: 'Disciplined debugging: reproduce → hypothesize → fix → verify.',
      prompt:
        '[AGENT SKILL: DEBUGGING MODE]\n' +
        'Follow this loop strictly:\n' +
        '1. REPRODUCE: restate the bug precisely. What was expected vs what happened?\n' +
        '2. MINIMISE: narrow to the smallest case that triggers it.\n' +
        '3. HYPOTHESISE: list possible causes, most likely first. Do not guess wildly.\n' +
        '4. INSTRUMENT: suggest what to log/inspect to confirm the hypothesis.\n' +
        '5. FIX: propose the minimal fix addressing the root cause (not symptoms).\n' +
        '6. VERIFY: how to confirm the fix works and nothing regressed.\n' +
        'Ask for missing info (error messages, code, steps) before concluding.\n' +
        '---\n'
    },
    spec: {
      name: 'Spec Writer',
      desc: 'Turn the conversation into a formal specification.',
      prompt:
        '[AGENT SKILL: SPEC MODE]\n' +
        'Convert the discussion into a clear, structured specification:\n' +
        '# Goal\n# Requirements (functional)\n# Non-requirements (explicitly out of scope)\n' +
        '# Acceptance criteria (testable)\n# Open questions\n' +
        'Be precise and concrete. Flag anything ambiguous as an open question\n' +
        'instead of assuming. Keep it tight — no filler.\n' +
        '---\n'
    },
    research: {
      name: 'Research',
      desc: 'Investigate with cited, high-trust sources.',
      prompt:
        '[AGENT SKILL: RESEARCH MODE]\n' +
        'Research the topic thoroughly:\n' +
        '- Use high-trust primary sources (official docs, reputable publications).\n' +
        '- Present findings with inline citations or source links.\n' +
        '- Separate confirmed facts from inference and uncertainty.\n' +
        '- Note when sources disagree; do not paper over conflicts.\n' +
        '- End with a concise summary of what is known and what remains unclear.\n' +
        '---\n'
    },
    prototype: {
      name: 'Prototype',
      desc: 'Quick throwaway mockup to answer a design question.',
      prompt:
        '[AGENT SKILL: PROTOTYPE MODE]\n' +
        'Build a quick, throwaway prototype — NOT production code.\n' +
        'Goal: answer the design question as fast as possible.\n' +
        'Prefer a single self-contained HTML file when it is a UI question.\n' +
        'State your assumptions up front. Skip polish, error handling, and edge cases\n' +
        'unless they are the point. Label it clearly as a prototype.\n' +
        '---\n'
    },
    plan: {
      name: 'Planner',
      desc: 'Break a big goal into an ordered, actionable plan.',
      prompt:
        '[AGENT SKILL: PLANNING MODE]\n' +
        'Break the goal into a concrete step-by-step plan:\n' +
        '1. Order steps by dependency (what blocks what).\n' +
        '2. Each step: what to do, expected outcome, how to verify.\n' +
        '3. Flag risks and unknowns per step.\n' +
        '4. Keep steps small enough to do in one sitting.\n' +
        'Do NOT implement — only plan. Ask which step to start with at the end.\n' +
        '---\n'
    }
  };

  window.jdAgentSkillsList = function () { return Object.keys(SKILLS); };
  window.jdAgentSkillInfo = function (cmd) { return SKILLS[cmd] || null; };

  /* ============ FETCH HOOK ============
     Detect leading /command, inject skill prompt, show badge. */
  var activeSkill = null;
  window.jdActiveSkill = function () { return activeSkill; };

  function detectSkill(text) {
    if (!text || typeof text !== 'string') return null;
    var m = text.match(/^\s*\/([a-z]+)\b/);
    if (!m) return null;
    var cmd = m[1].toLowerCase();
    if (cmd === 'skills') return { cmd: 'skills' };
    if (SKILLS[cmd]) return { cmd: cmd, rest: text.slice(m[0].length).trim() };
    return null;
  }

  function skillsHelpText() {
    var lines = ['**Available Agent Skills:**', ''];
    Object.keys(SKILLS).forEach(function (k) {
      lines.push('/' + k + ' — ' + SKILLS[k].desc);
    });
    lines.push('', 'Example: /grill gumawa ng login page');
    return lines.join('\n');
  }

  function showSkillBadge(skillName) {
    try {
      // Remove old badge
      var old = document.querySelector('.jd-skill-badge');
      if (old && old.parentNode) old.parentNode.removeChild(old);
      if (!skillName) return;
      var b = document.createElement('div');
      b.className = 'jd-skill-badge';
      b.textContent = '⚡ ' + skillName + ' mode';
      document.body.appendChild(b);
      ensureSkillCSS();
      setTimeout(function () { b.classList.add('show'); }, 10);
      // Auto-hide after 4s (mode still active, badge is just an indicator)
      setTimeout(function () {
        b.classList.remove('show');
        setTimeout(function () { if (b.parentNode) b.parentNode.removeChild(b); }, 400);
      }, 4000);
    } catch (_) {}
  }

  (function hookChat() {
    if (window.__jdSkillsHooked) return;
    window.__jdSkillsHooked = true;
    var origFetch = window.fetch;
    window.fetch = function (url, opts) {
      try {
        var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
        if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body && isEnabled()) {
          var body = typeof opts.body === 'string' ? JSON.parse(opts.body) : opts.body;
          if (body && typeof body === 'object' && !body.__skillInjected) {
            var msgText = body.message || '';
            // Also check messages array for last user message
            var targetField = 'message';
            if (!msgText && body.messages && Array.isArray(body.messages)) {
              for (var i = body.messages.length - 1; i >= 0; i--) {
                if (body.messages[i].role === 'user') {
                  msgText = body.messages[i].content || '';
                  targetField = 'messages:' + i;
                  break;
                }
              }
            }
            var hit = detectSkill(msgText);
            if (hit) {
              body.__skillInjected = true;
              if (hit.cmd === 'skills') {
                // Short-circuit: answer locally with the skill list
                activeSkill = null;
                showSkillBadge(null);
                // Replace the message with a marker the UI can catch, and
                // inject a pre-written answer via a synthetic response.
                // Simplest: rewrite message to ask for the list; the model
                // will answer, but we ALSO show the list instantly via toast.
                try {
                  if (window.jdOdToast) window.jdOdToast('⚡ Agent Skills — see chat for list');
                  else if (window.showModernToast) window.showModernToast('⚡ Agent Skills');
                } catch (_) {}
                var helpMsg = 'List all available agent skills with their descriptions.';
                if (targetField === 'message') body.message = helpMsg;
                else {
                  var idx = parseInt(targetField.split(':')[1], 10);
                  body.messages[idx].content = helpMsg;
                }
                // Prepend the actual list so the model just formats it
                var prefix = '[List these agent skills exactly: ' +
                  Object.keys(SKILLS).map(function (k) { return '/' + k + ': ' + SKILLS[k].desc; }).join(' | ') +
                  '. Present as a clean list.]\n';
                if (targetField === 'message') body.message = prefix + body.message;
                else body.messages[idx].content = prefix + body.messages[idx].content;
              } else {
                var skill = SKILLS[hit.cmd];
                activeSkill = skill.name;
                showSkillBadge(skill.name);
                var injected = skill.prompt + (hit.rest || '(no additional details provided)');
                if (targetField === 'message') body.message = injected;
                else {
                  var j = parseInt(targetField.split(':')[1], 10);
                  body.messages[j].content = injected;
                }
              }
              opts = Object.assign({}, opts, { body: typeof opts.body === 'string' ? JSON.stringify(body) : body });
            } else {
              activeSkill = null;
            }
          }
        }
      } catch (_) {}
      return origFetch.call(this, url, opts);
    };
  })();

  function ensureSkillCSS() {
    if (document.getElementById('jdSkillCSS')) return;
    var st = document.createElement('style');
    st.id = 'jdSkillCSS';
    st.textContent =
      '.jd-skill-badge{position:fixed;top:14px;left:50%;transform:translateX(-50%) translateY(-12px);' +
      'background:linear-gradient(135deg,#7c5cff,#4a9eff);color:#fff;padding:7px 16px;border-radius:20px;' +
      'font-size:12px;font-weight:600;z-index:10002;opacity:0;transition:opacity .3s,transform .3s;' +
      'pointer-events:none;box-shadow:0 4px 14px rgba(124,92,255,.4);white-space:nowrap}' +
      '.jd-skill-badge.show{opacity:1;transform:translateX(-50%) translateY(0)}';
    document.head.appendChild(st);
  }

  console.log('[agent-skills] loaded v20261007a141');
})();
