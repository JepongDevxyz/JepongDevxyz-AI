/* =========================================================
   JepongDevxyz AI — model tools UI (share_file + create_session)
   Runtime patch loaded by agent.js (additive only).

   1) share_file: when the server attaches a public Blob URL to a
      generated-artifact card (artifact.url), append a tappable
      public-link row with a Copy button under the card. The
      existing Download button is untouched.

   2) create_session: listens for the `create_session` SSE event.
      The model must ask permission first; only after the user
      agrees does it emit the marker, so the client creates the
      new session right after the turn finishes (in `done`).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdModelToolsLoaded) return;
  window.__jdModelToolsLoaded = true;

  function esc(s) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(String(t)).catch(function () {});
        return;
      }
    } catch (e) {}
    try {
      var ta = document.createElement('textarea');
      ta.value = String(t);
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    } catch (e) {}
  }

  function toast(msg) {
    try {
      if (typeof window.showModernToast === 'function') window.showModernToast(msg);
    } catch (e) {}
  }

  /* ---------- 1) share_file: public link row ---------- */

  function addPublicLinkRow(card, url) {
    if (!card || card.querySelector('.jd-public-link-row')) return;
    var safeUrl = String(url).replace(/"/g, '&quot;');
    var row = document.createElement('div');
    row.className = 'jd-public-link-row';
    row.style.cssText = 'flex:1 1 100%;display:flex;align-items:center;gap:8px;margin-top:2px;padding:8px 10px;border-radius:10px;background:rgba(127,127,127,.08);font-size:.74rem;min-width:0;';
    row.innerHTML =
      '<span style="white-space:nowrap;opacity:.75">🔗 Public link:</span>' +
      '<a href="' + safeUrl + '" target="_blank" rel="noopener" style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--accent,#4f8cff)">' + esc(url) + '</a>' +
      '<button type="button" class="bot-action-btn jd-copy-link-btn" style="padding:6px 10px;font-size:.72rem;white-space:nowrap;flex:none">Copy</button>';
    var btn = row.querySelector('.jd-copy-link-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        copyText(url);
        var orig = btn.textContent;
        btn.textContent = 'Copied ✓';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      });
    }
    card.appendChild(row);
    try {
      if (typeof window.refreshLucideIcons === 'function') window.refreshLucideIcons(row);
    } catch (e) {}
  }

  function wrapAttach() {
    if (typeof window.attachGeneratedArtifact !== 'function') return false;
    if (window.attachGeneratedArtifact.__jdToolsWrapped) return true;
    var orig = window.attachGeneratedArtifact;
    var wrapped = async function (botMsgElem, artifact, sourceAttachments) {
      await orig.call(this, botMsgElem, artifact, sourceAttachments);
      try {
        if (artifact && artifact.url && botMsgElem) {
          var cards = botMsgElem.querySelectorAll('.generated-artifact-card');
          var card = cards[cards.length - 1];
          if (card) addPublicLinkRow(card, artifact.url);
        }
      } catch (e) {}
    };
    wrapped.__jdToolsWrapped = true;
    window.attachGeneratedArtifact = wrapped;
    return true;
  }

  /* ---------- 2) create_session: new chat after turn ---------- */

  var pendingSession = null;

  function handleCreateSession(payload) {
    var title = String((payload && payload.title) || 'New session').slice(0, 60).trim() || 'New session';
    try {
      if (typeof window.createNewChat === 'function') {
        window.createNewChat();
        var ctx = typeof window.getActiveContext === 'function' ? window.getActiveContext() : null;
        if (ctx && ctx.id && ctx.sessions && ctx.sessions[ctx.id]) {
          ctx.sessions[ctx.id].title = title;
          if (typeof window.saveSessions === 'function') {
            try { window.saveSessions(); } catch (e) {}
          }
          if (typeof window.renderSidebarHistory === 'function') {
            try { window.renderSidebarHistory(); } catch (e) {}
          }
        }
      }
    } catch (e) {}
    toast('Gumawa ng bagong session: ' + title);
  }

  function wrapReader() {
    if (typeof window.readActivitySSE !== 'function') return false;
    if (window.readActivitySSE.__jdToolsWrapped) return true;
    var orig = window.readActivitySSE;
    var wrapped = async function (response, handlers) {
      handlers = Object.assign({}, handlers || {});
      var origDone = handlers.done;
      handlers.done = async function (payload) {
        if (typeof origDone === 'function') await origDone(payload);
        if (pendingSession) {
          var p = pendingSession;
          pendingSession = null;
          handleCreateSession(p);
        }
      };
      handlers.create_session = async function (payload) {
        pendingSession = payload || {};
      };
      return orig.call(this, response, handlers);
    };
    wrapped.__jdToolsWrapped = true;
    window.readActivitySSE = wrapped;
    return true;
  }

  // agent.js loads patches after index.html; retry briefly in case the
  // main script parsed after this patch on a slow device.
  var tries = 0;
  var timer = setInterval(function () {
    var a = wrapAttach();
    var r = wrapReader();
    if ((a && r) || ++tries > 80) clearInterval(timer);
  }, 250);
  wrapAttach();
  wrapReader();
})();
