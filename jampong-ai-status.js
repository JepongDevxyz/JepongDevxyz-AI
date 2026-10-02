/* JepongDevxyz AI — Jampong AI Activity Status (2026-10-02)
   Beautiful real-time AI action tracking like the Muse app.
   Hooks into /api/chat requests and logs beautiful step-by-step activities:
   - 💭 Thinking... (spinner while AI processes)
   - 🔧 Using tools (when detected in response)
   - ✅ Done (with summary)
*/
(function () {
  'use strict';
  if (window.__jdAiStatus) return;
  window.__jdAiStatus = true;

  var origFetch = window.fetch;

  // Beautiful status emojis like Muse app
  function getStatusEmoji(action) {
    var a = (action || '').toLowerCase();
    if (a.indexOf('think') >= 0) return '💭';
    if (a.indexOf('search') >= 0) return '🔍';
    if (a.indexOf('tool') >= 0 || a.indexOf('using') >= 0) return '🔧';
    if (a.indexOf('edit') >= 0 || a.indexOf('writ') >= 0) return '📝';
    if (a.indexOf('push') >= 0 || a.indexOf('commit') >= 0) return '📤';
    if (a.indexOf('deploy') >= 0) return '🚀';
    if (a.indexOf('done') >= 0 || a.indexOf('complete') >= 0) return '✅';
    if (a.indexOf('error') >= 0 || a.indexOf('fail') >= 0) return '❌';
    return '⚡';
  }

  // Track active AI request
  var activeRequest = null;

  window.fetch = function (url, opts) {
    var urlStr = typeof url === 'string' ? url : (url && url.url) || '';
    var isChat = urlStr.indexOf('/api/chat') !== -1;

    if (!isChat) {
      return origFetch.apply(this, arguments);
    }

    // AI request started - log beautiful "Thinking..." activity
    var startTime = Date.now();
    var userMsg = '';
    try {
      if (opts && opts.body) {
        var body = JSON.parse(opts.body);
        if (body.messages && body.messages.length > 0) {
          var lastUser = body.messages.filter(function (m) { return m.role === 'user'; }).pop();
          if (lastUser) {
            userMsg = typeof lastUser.content === 'string' ? lastUser.content : '[media]';
            if (userMsg.length > 60) userMsg = userMsg.substring(0, 60) + '...';
          }
        }
      }
    } catch (e) {}

    activeRequest = {
      startTime: startTime,
      userMsg: userMsg,
      steps: []
    };

    // Log "Thinking..." with spinner (like Muse app)
    if (window.jdLogActivity) {
      window.jdLogActivity('💭 Thinking...', userMsg || 'Processing your request', {
        status: 'Running',
        running: true
      });
    }

    // Update Jampong profile status in real-time
    updateProfileStatus('💭 Thinking...');

    return origFetch.apply(this, arguments).then(function (response) {
      // Clone response to read it without breaking the original
      var clone = response.clone();

      // Monitor streaming response for tool calls and actions
      if (clone.body) {
        var reader = clone.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';

        (function readChunk() {
          reader.read().then(function (result) {
            if (result.done) {
              // Request complete - log beautiful "Done" activity
              var duration = ((Date.now() - startTime) / 1000).toFixed(1);
              if (window.jdLogActivity) {
                window.jdLogActivity(
                  '✅ Responded',
                  (userMsg || 'AI response') + ' (' + duration + 's)',
                  { status: 'Allowed' }
                );
              }
              // Show "✅ Done" briefly on avatar, then back to normal (like Muse app)
              updateProfileStatus('✅ Done');
              setTimeout(function () { updateProfileStatus('online'); }, 2000);
              activeRequest = null;
              return;
            }
            buffer += decoder.decode(result.value, { stream: true });
            // Detect tool calls or actions in the stream
            detectActions(buffer);
            readChunk();
          }).catch(function () {});
        })();
      }

      return response;
    }).catch(function (err) {
      // Request failed
      if (window.jdLogActivity) {
        window.jdLogActivity('❌ Request failed', 'Could not reach AI', { status: 'Denied' });
      }
      updateProfileStatus('online');
      activeRequest = null;
      throw err;
    });
  };

  // Detect interesting actions in the AI response stream
  var detectedActions = {};
  function detectActions(text) {
    // Look for tool call patterns
    var patterns = [
      { re: /search/i, label: '🔍 Searching...' },
      { re: /tool|function/i, label: '🔧 Using tool...' },
      { re: /edit|write|creat/i, label: '📝 Writing...' }
    ];
    patterns.forEach(function (p) {
      if (p.re.test(text) && !detectedActions[p.label]) {
        detectedActions[p.label] = true;
        updateProfileStatus(p.label);
      }
    });
  }

  function updateProfileStatus(text) {
    var el = document.getElementById('jdJampongStatus');
    if (el) el.textContent = text;
    // ALSO update the floating Jampong avatar label (like Muse app status)
    updateAvatarStatus(text);
  }

  // Real-time avatar status - like Muse app's live status indicator
  function updateAvatarStatus(text) {
    var avatar = document.getElementById('jdJampong');
    if (!avatar) return;
    // Only show when Jampong is ON
    if (avatar.hasAttribute('hidden')) return;
    var label = avatar.querySelector('.jdj-label');
    if (!label) return;

    if (text === 'online' || text === 'Jampong') {
      // Back to normal
      label.textContent = 'Jampong';
      label.classList.remove('jdj-working');
      avatar.classList.remove('jdj-working');
    } else {
      // Show real-time activity (like Muse app)
      label.textContent = text;
      label.classList.add('jdj-working');
      avatar.classList.add('jdj-working');
    }
  }

  // Add working-state CSS for the avatar (pulsing glow like Muse app)
  function ensureAvatarStatusCSS() {
    if (document.getElementById('jdJampongStatusCss')) return;
    var st = document.createElement('style');
    st.id = 'jdJampongStatusCss';
    st.textContent = [
      '#jdJampong.jdj-working .jdj-stage img{',
      'box-shadow:0 0 0 3px #f59e0b,0 0 24px rgba(245,158,11,.7),0 8px 24px rgba(0,0,0,.4)!important;',
      'animation:jdJampWork3D 1.2s ease-in-out infinite!important}',
      '@keyframes jdJampWork3D{',
      '0%,100%{transform:translateY(0) translateZ(0) rotateX(0deg) rotateY(0deg) scale(1)}',
      '25%{transform:translateY(-6px) translateZ(15px) rotateX(10deg) rotateY(-12deg) scale(1.06)}',
      '50%{transform:translateY(-10px) translateZ(25px) rotateX(-8deg) rotateY(10deg) scale(1.1)}',
      '75%{transform:translateY(-6px) translateZ(15px) rotateX(8deg) rotateY(12deg) scale(1.06)}}',
      '#jdJampong .jdj-label.jdj-working{',
      'background:rgba(245,158,11,.92)!important;color:#000!important;',
      'font-weight:700!important;max-width:200px;white-space:nowrap;',
      'overflow:hidden;text-overflow:ellipsis}'
    ].join('\n');
    document.head.appendChild(st);
  }
  ensureAvatarStatusCSS();

  // Reset detected actions on new request
  var origLog = window.jdLogActivity;
  if (origLog) {
    window.jdLogActivity = function (title, desc, opts) {
      if (title && title.indexOf('💭') === 0) detectedActions = {};
      return origLog(title, desc, opts);
    };
  }
})();
