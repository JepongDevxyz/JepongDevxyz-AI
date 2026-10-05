/* ============================================================
   followups-restore-fix.js — strip leftover JD_FOLLOWUPS / JD_CHOICE
   markers from restored conversations.

   Root cause: messages saved before the strip logic existed still carry
   raw [[JD_FOLLOWUPS]] / [[JD_CHOICE]] blocks in their stored text with
   no interaction object, so restoring the conversation prints the raw
   protocol markup and shows no chips.

   This patch sanitizes the session DATA (not the DOM): it wraps the
   global loadChatSession() so every restore first strips leftover
   markers and rebuilds the interaction object, and it also cleans all
   in-memory sessions at load plus re-renders the active session once if
   raw markers are already visible. The existing render path
   (renderJdAssistantInteraction) then draws the chips normally.

   Self-contained (own parser copy mirroring parseJdAssistantInteraction),
   idempotent, fail-open. Additive only — no existing behavior removed.
   ============================================================ */
(function () {
'use strict';
if (window.__jdFollowupRestoreFix) return;
window.__jdFollowupRestoreFix = true;

var MARK_RE = /\[\[\/?JD_(?:FOLLOWUPS|CHOICE)/i;

/* Mirror of parseJdAssistantInteraction's choice + followups rules. */
function parseLegacyInteraction(raw) {
  var text = String(raw == null ? '' : raw);
  var choice = null;
  var followups = [];
  var i, lines, ln, m, v;
  var cm = text.match(/\[\[JD_CHOICE\]\]([\s\S]*?)\[\[\/JD_CHOICE\]\]/i);
  if (cm) {
    lines = String(cm[1] || '').split(/\r?\n/);
    var qLine = null, opts = [];
    for (i = 0; i < lines.length; i++) {
      ln = lines[i];
      if (/^QUESTION\s*:/i.test(ln)) qLine = ln;
      m = ln.match(/^(?:OPTION\s*:\s*|\d+[.)]\s*)(.+)$/i);
      if (m) {
        v = String(m[1] || '').trim().slice(0, 180);
        if (v && opts.indexOf(v) < 0) opts.push(v);
        if (opts.length >= 4) break;
      }
    }
    var q = qLine ? String(qLine).replace(/^QUESTION\s*:\s*/i, '').trim().slice(0, 240) : '';
    if (q && opts.length >= 2) choice = { question: q, options: opts, dismissed: false };
    text = text.replace(cm[0], '');
  }
  var fm = text.match(/\[\[JD_FOLLOWUPS\]\]([\s\S]*?)\[\[\/JD_FOLLOWUPS\]\]/i);
  if (fm) {
    lines = String(fm[1] || '').split(/\r?\n/);
    for (i = 0; i < lines.length; i++) {
      ln = String(lines[i] || '').trim();
      if (!ln) continue;
      m = ln.match(/^(?:ITEM\s*:\s*|[-*]\s+|\d+[.)]\s*)(.+)$/i);
      if (!m) continue;
      v = String(m[1] || '').trim().slice(0, 160);
      if (v && followups.indexOf(v) < 0) followups.push(v);
      if (followups.length >= 2) break;
    }
    text = text.replace(fm[0], '');
  }
  text = text
    .replace(/\[\[\/?JD_(?:CHOICE|FOLLOWUPS)\]\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  var interaction = (choice || followups.length) ? { choice: choice, followups: followups } : null;
  return { text: text, interaction: interaction };
}

function sanitizeMessage(m) {
  try {
    if (!m || m.role !== 'bot') return false;
    var t = String(m.text || '');
    if (!MARK_RE.test(t)) return false;
    var p = parseLegacyInteraction(t);
    m.text = p.text;
    var it = m.interaction || null;
    var hasStored = !!(it && (((it.followups || []).length) || (it.choice && it.choice.question)));
    if (!hasStored) m.interaction = p.interaction;
    return true;
  } catch (_) { return false; }
}

function sanitizeSession(id) {
  try {
    if (typeof chatSessions === 'undefined') return false;
    var s = chatSessions[id];
    var changed = false;
    ((s && s.messages) || []).forEach(function (m) { if (sanitizeMessage(m)) changed = true; });
    return changed;
  } catch (_) { return false; }
}

function sanitizeAllSessions() {
  try {
    if (typeof chatSessions === 'undefined') return;
    Object.keys(chatSessions).forEach(sanitizeSession);
  } catch (_) {}
}

/* Wrap the global session renderer so every future restore is clean. */
function wrapLoader() {
  try {
    if (typeof loadChatSession !== 'function') return false;
    if (loadChatSession.__jdFollowupWrapped) return true;
    var orig = loadChatSession;
    var w = function (id) {
      try { sanitizeSession(id); } catch (_) {}
      return orig.apply(this, arguments);
    };
    w.__jdFollowupWrapped = true;
    window.loadChatSession = w;
    return true;
  } catch (_) { return false; }
}

/* If the app already rendered a session before this patch loaded and raw
   markers are visible, re-render the active session once (now sanitized). */
function maybeRerenderActive() {
  try {
    var box = document.getElementById('chatBox');
    if (!box) return;
    if (!MARK_RE.test(box.textContent || '')) return;
    if (typeof currentSessionId === 'undefined' || !currentSessionId) return;
    if (typeof window.loadChatSession === 'function') window.loadChatSession(currentSessionId);
  } catch (_) {}
}

function boot() {
  try {
    sanitizeAllSessions();
    if (!wrapLoader()) {
      /* Main script not ready yet — retry briefly, then give up quietly. */
      var tries = 0;
      var timer = setInterval(function () {
        try {
          tries++;
          sanitizeAllSessions();
          if (wrapLoader() || tries >= 20) { clearInterval(timer); maybeRerenderActive(); }
        } catch (_) { clearInterval(timer); }
      }, 500);
      return;
    }
    maybeRerenderActive();
    /* Late cloud-sync merges can reintroduce legacy data — sweep twice more. */
    setTimeout(sanitizeAllSessions, 4000);
    setTimeout(sanitizeAllSessions, 12000);
  } catch (_) {}
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
})();
