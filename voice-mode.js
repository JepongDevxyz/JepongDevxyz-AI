/* JepongDevxyz AI — Voice Mode (v1, 2026-10-01)
   ChatGPT-style full-screen voice conversation: talk to the AI, it talks back.
   - Animated orb (breathes, reacts to mic volume, pulses while speaking)
   - Loop: listen (speech recognition in the USER's language) -> send via the
     real chat pipeline -> speak the reply (existing smart TTS, auto-detects
     the reply language) -> listen again. UI chrome is always English;
     the AI's response follows the user's language.
   - Tap the orb to interrupt while it's speaking; mute + speaker toggles
   - Pure addition: reuses sendMessage/isAIGenerating/speakSmartVoice/
     stopAllSpeech from the app. No existing code changed. Idempotent. */
(function () {
  'use strict';
  if (window.__jdVoiceMode) return;
  window.__jdVoiceMode = true;

  var CSS = [
    '.jd-vm{position:fixed;inset:0;z-index:20000;background:#000;color:#fff;display:flex;flex-direction:column;align-items:center;overflow:hidden}',
    '.jd-vm[hidden]{display:none!important}',
    'body.jd-vm-open{overflow:hidden!important}',
    '.jd-vm-top{width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;flex:0 0 auto}',
    '.jd-vm-title{font-weight:700;font-size:17px;letter-spacing:.02em}',
    '.jd-vm-x{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.07);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jd-vm-x:active{transform:scale(.94)}',
    '.jd-vm-stage{flex:1 1 auto;width:100%;min-height:0;display:flex;align-items:center;justify-content:center;position:relative}',
    '.jd-vm-orb{width:min(64vw,300px);aspect-ratio:1/1;border-radius:50%;position:relative;overflow:hidden;cursor:pointer;flex:0 0 auto;',
    'background:radial-gradient(circle at 50% 118%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 56%),radial-gradient(circle at 50% -22%, #8db4ff 0%, #3f74e8 46%, #0d1838 100%);',
    'box-shadow:0 0 70px rgba(80,130,255,.4), inset 0 0 60px rgba(20,40,120,.35);',
    'animation:jdVmBreathe 4.2s ease-in-out infinite;transition:transform .12s linear}',
    '.jd-vm-orb::before{content:"";position:absolute;inset:-28%;',
    'background:radial-gradient(ellipse 42% 24% at 30% 60%, rgba(255,255,255,.9), transparent 70%),radial-gradient(ellipse 48% 26% at 66% 68%, rgba(255,255,255,.75), transparent 70%),radial-gradient(ellipse 36% 20% at 50% 80%, rgba(255,255,255,.95), transparent 70%);',
    'filter:blur(7px);animation:jdVmCloud 9s ease-in-out infinite alternate}',
    '.jd-vm-orb::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 -18px 40px rgba(255,255,255,.25)}',
    '@keyframes jdVmBreathe{0%,100%{transform:scale(1)}50%{transform:scale(1.035)}}',
    '@keyframes jdVmCloud{from{transform:translateX(-6%)}to{transform:translateX(6%)}}',
    '.jd-vm[data-state="listening"] .jd-vm-orb{transform:scale(calc(1 + var(--jd-vol,0)*.3))}',
    '.jd-vm[data-state="thinking"] .jd-vm-orb{animation-duration:1.8s;filter:saturate(1.25)}',
    '.jd-vm[data-state="speaking"] .jd-vm-orb{animation:jdVmBreathe 1.5s ease-in-out infinite}',
    '.jd-vm-ring{position:absolute;width:min(64vw,300px);aspect-ratio:1/1;border-radius:50%;border:2px solid rgba(141,180,255,.55);opacity:0;pointer-events:none}',
    '.jd-vm[data-state="listening"] .jd-vm-ring{animation:jdVmRing 1.9s ease-out infinite}',
    '@keyframes jdVmRing{0%{transform:scale(1);opacity:.75}100%{transform:scale(1.38);opacity:0}}',
    '.jd-vm-status{flex:0 0 auto;min-height:26px;margin-top:2px;font-size:15px;color:rgba(255,255,255,.88);text-align:center;padding:0 28px}',
    '.jd-vm-interim{flex:0 0 auto;min-height:22px;font-size:13.5px;color:rgba(255,255,255,.55);font-style:italic;text-align:center;padding:0 28px;max-width:560px}',
    '.jd-vm-transcript{flex:0 1 auto;width:100%;max-width:560px;max-height:20vh;overflow-y:auto;padding:8px 20px;display:flex;flex-direction:column;gap:6px;min-height:0}',
    '.jd-vm-line{font-size:13.5px;line-height:1.55;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);padding:8px 12px;border-radius:12px;overflow-wrap:anywhere}',
    '.jd-vm-line.ai{border-color:rgba(129,140,248,.4);background:rgba(129,140,248,.12)}',
    '.jd-vm-controls{flex:0 0 auto;display:flex;gap:16px;padding:16px 0 8px;align-items:center}',
    '.jd-vm-ctl{width:56px;height:56px;border-radius:50%;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}',
    '.jd-vm-ctl:active{transform:scale(.93)}',
    '.jd-vm-ctl.off{background:rgba(229,72,77,.25);border-color:rgba(229,72,77,.6)}',
    '.jd-vm-end{background:#e5484d;border-color:#e5484d;width:64px;height:64px}',
    '.jd-vm-hint{flex:0 0 auto;font-size:12px;color:rgba(255,255,255,.45);padding:6px 0 calc(20px + env(safe-area-inset-bottom))}',
    '.jd-vm-entry{width:42px;height:42px;flex:0 0 auto;border-radius:50%;border:1px solid rgba(127,127,127,.25);background:rgba(127,127,127,.1);color:inherit;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px}',
    '.jd-vm-entry:active{transform:scale(.93)}',
    '@media (prefers-reduced-motion:reduce){.jd-vm-orb,.jd-vm-orb::before{animation:none}.jd-vm[data-state="listening"] .jd-vm-ring{animation:none}}'
  ].join('\n');

  /* ---------- UI strings: always English (product decision, 2026-10-01) ----------
     Inside JepongDevxyz AI, the voice-mode chrome — every label, status line,
     hint, and toast — is English by default, all of it. The AI's RESPONSE is
     what follows the user's language: speech recognition uses the user's own
     language setting (recogLang) and the reply is spoken with automatic
     language detection (the app's speakSmartVoice/detectSpeechLanguage). */
  var STR = {
    title: 'Voice',
    hint: 'Tap the orb to interrupt the AI',
    you: 'You', ai: 'AI',
    entryTitle: 'Voice mode — talk to the AI', entryAria: 'Open voice mode',
    closeAria: 'Close voice mode', orbAria: 'Tap to interrupt speech',
    muteAria: 'Mute the microphone', speakerAria: 'Toggle the speaker', endAria: 'End voice mode',
    errNoSR: "This browser doesn't support voice input. Try Chrome.",
    errNoTTS: "This browser doesn't support voice output.",
    errMic: 'Allow microphone access to use voice mode.',
    errBusy: 'Wait for the current answer to finish.',
    errSend: "Couldn't send. Try again.",
    errStopped: 'Listening stopped. Tap the voice button to start again.'
  };

  function t(key) {
    return STR[key] != null ? STR[key] : key;
  }

  /* ---------- activity status: follows the USER's language ----------
     Per Jepong: the only things that change with the user's language are the
     AI's message response, the Activity status, and the voice. So the
     voice-mode status line (listening/thinking/speaking/muted) follows the
     user's language setting, while every other chrome string stays English. */
  var STATUS_STR = {
    fil: {
      idle: 'Voice mode',
      listening: 'Nakikinig… magsalita ka',
      thinking: 'Nag-iisip…',
      speaking: 'Nagsasalita… i-tap ang orb para putulin',
      muted: 'Naka-mute ang mic'
    },
    en: {
      idle: 'Voice mode',
      listening: 'Listening… speak now',
      thinking: 'Thinking…',
      speaking: 'Speaking… tap the orb to interrupt',
      muted: 'Mic muted'
    }
  };
  function statusLang() {
    try {
      var s = (typeof personalizationSettings !== 'undefined' && personalizationSettings && personalizationSettings.language) || '';
      if (/filipino|tagalog/i.test(s)) return 'fil';
      if (/^english$/i.test(s)) return 'en';
      if (s && s !== 'Auto-detect') return 'en';
      var nav = String((navigator && navigator.language) || '').toLowerCase();
      if (nav.indexOf('fil') === 0 || nav.indexOf('tl') === 0) return 'fil';
      if (nav.indexOf('en') === 0) return 'en';
      return 'fil';
    } catch (e) { return 'fil'; }
  }
  function statusText(key) {
    var pack = STATUS_STR[statusLang()] || STATUS_STR.en;
    return pack[key] != null ? pack[key] : (STATUS_STR.en[key] || key);
  }
  function recogLang() {
    try { if (typeof preferredLanguageCode === 'function') return preferredLanguageCode() || 'fil-PH'; } catch (e) {}
    return 'fil-PH';
  }

  var S = {
    open: false, state: 'idle', rec: null, recToken: 0, restarts: 0,
    stream: null, actx: null, analyser: null, raf: 0,
    poll: 0, muted: false, speaker: true
  };

  function $(id) { return document.getElementById(id); }
  function toast(msg) {
    try { if (typeof showModernToast === 'function') return showModernToast(msg); } catch (e) {}
    try { alert(msg); } catch (_) {}
  }
  function srClass() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

  function injectCSS() {
    if ($('jd-voice-mode-css')) return;
    var st = document.createElement('style');
    st.id = 'jd-voice-mode-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function icon(name, size) {
    return '<i data-lucide="' + name + '"' + (size ? ' width="' + size + '" height="' + size + '"' : '') + '></i>';
  }
  function refreshIcons(root) {
    try { if (typeof refreshLucideIcons === 'function') refreshLucideIcons(root || document); } catch (e) {}
  }

  function buildUI() {
    if ($('jdVoiceMode')) return;
    var ov = document.createElement('div');
    ov.id = 'jdVoiceMode';
    ov.className = 'jd-vm';
    ov.setAttribute('hidden', '');
    ov.setAttribute('data-state', 'idle');
    ov.innerHTML =
      '<div class="jd-vm-top">' +
        '<button type="button" class="jd-vm-x" id="jdVmClose" aria-label="' + t('closeAria') + '">' + icon('x', 20) + '</button>' +
        '<div class="jd-vm-title">' + t('title') + '</div>' +
        '<div style="width:42px"></div>' +
      '</div>' +
      '<div class="jd-vm-stage">' +
        '<div class="jd-vm-orb" id="jdVmOrb" role="button" aria-label="' + t('orbAria') + '" tabindex="0"></div>' +
        '<div class="jd-vm-ring" aria-hidden="true"></div>' +
      '</div>' +
      '<div class="jd-vm-status" id="jdVmStatus">' + statusText('idle') + '</div>' +
      '<div class="jd-vm-interim" id="jdVmInterim"></div>' +
      '<div class="jd-vm-transcript" id="jdVmTranscript" aria-live="polite"></div>' +
      '<div class="jd-vm-controls">' +
        '<button type="button" class="jd-vm-ctl" id="jdVmMute" aria-label="' + t('muteAria') + '">' + icon('mic', 22) + '</button>' +
        '<button type="button" class="jd-vm-ctl jd-vm-end" id="jdVmEnd" aria-label="' + t('endAria') + '">' + icon('phone-off', 24) + '</button>' +
        '<button type="button" class="jd-vm-ctl" id="jdVmSpeaker" aria-label="' + t('speakerAria') + '">' + icon('volume-2', 22) + '</button>' +
      '</div>' +
      '<div class="jd-vm-hint">' + t('hint') + '</div>';
    document.body.appendChild(ov);
    refreshIcons(ov);

    $('jdVmClose').addEventListener('click', close);
    $('jdVmEnd').addEventListener('click', close);
    var orb = $('jdVmOrb');
    orb.addEventListener('click', function () {
      if (S.state === 'speaking') {
        try { if (typeof stopAllSpeech === 'function') stopAllSpeech(); } catch (e) {}
        setState('listening');
        startListening();
      }
    });
    orb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); orb.click(); }
    });
    $('jdVmMute').addEventListener('click', function () {
      S.muted = !S.muted;
      this.classList.toggle('off', S.muted);
      this.innerHTML = icon(S.muted ? 'mic-off' : 'mic', 22);
      refreshIcons(this);
      if (S.muted) { stopRec(); setState('muted'); }
      else if (S.open) { setState('listening'); startListening(); }
    });
    $('jdVmSpeaker').addEventListener('click', function () {
      S.speaker = !S.speaker;
      this.classList.toggle('off', !S.speaker);
      this.innerHTML = icon(S.speaker ? 'volume-2' : 'volume-x', 22);
      refreshIcons(this);
      if (!S.speaker && S.state === 'speaking') {
        try { if (typeof stopAllSpeech === 'function') stopAllSpeech(); } catch (e) {}
        setState('listening');
        startListening();
      }
    });

    /* composer entry button (addition only, after the dictation mic) */
    var mic = $('micBtn');
    if (mic && !$('jdVmEntry') && mic.parentNode) {
      var b = document.createElement('button');
      b.type = 'button';
      b.id = 'jdVmEntry';
      b.className = 'jd-vm-entry';
      b.title = t('entryTitle');
      b.setAttribute('aria-label', t('entryAria'));
      b.innerHTML = icon('audio-lines', 20);
      b.addEventListener('click', function () { open(); });
      mic.parentNode.insertBefore(b, mic.nextSibling);
      refreshIcons(b);
    }
  }

  /* ---------- ChatGPT-style send/voice swap (2026-10-01) ----------
     Empty composer -> the voice button sits in the send slot (rightmost).
     Typing text, attaching a file, or generating -> the send button takes
     its place and the voice button hides. Exactly like the reference video:
     the swap happens on any input, and the voice button only returns when
     the composer is fully empty and idle. */
  function jdSyncSendVoice() {
    var entry = $('jdVmEntry');
    var send = document.getElementById('mainActionBtn');
    if (!entry || !send) return;
    var generating = false;
    try { generating = !!isAIGenerating; } catch (e) {}
    try { if (window.__jdBibleAbort) generating = true; } catch (e) {}
    var inp = $('userInput');
    var hasText = !!(inp && inp.value.trim());
    var fc = document.getElementById('filePreviewContainer');
    var hasFiles = !!(fc && !fc.hidden && fc.querySelector('.jd-upload-chip'));
    var showSend = generating || hasText || hasFiles;
    entry.style.display = showSend ? 'none' : '';
    /* Never fight the app's own busy styling — only toggle visibility. */
    if (send.style.display === 'none' && showSend) send.style.display = '';
    else if (send.style.display !== 'none' && !showSend) send.style.display = 'none';
  }

  function jdInitSendVoiceSwap() {
    var inp = $('userInput');
    if (inp && !inp.__jdSwapHooked) {
      inp.__jdSwapHooked = true;
      inp.addEventListener('input', jdSyncSendVoice);
    }
    var fc = document.getElementById('filePreviewContainer');
    if (fc && !fc.__jdSwapHooked && typeof MutationObserver !== 'undefined') {
      fc.__jdSwapHooked = true;
      new MutationObserver(jdSyncSendVoice).observe(fc, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    }
    /* Generation start/stop funnels through updateGenerationActionButton —
       chain-wrap it (same pattern as stopgen-fix) so the stop button always wins. */
    try {
      if (typeof window.updateGenerationActionButton === 'function' && !window.updateGenerationActionButton.__jdSwapWrapped) {
        var orig = window.updateGenerationActionButton;
        var wrapped = function () {
          var r = orig.apply(this, arguments);
          try { jdSyncSendVoice(); } catch (e) {}
          return r;
        };
        wrapped.__jdSwapWrapped = true;
        try { Object.defineProperty(wrapped, 'name', { value: 'updateGenerationActionButton' }); } catch (e) {}
        window.updateGenerationActionButton = wrapped;
      }
    } catch (e) {}
    jdSyncSendVoice();
  }

  function setState(state) {
    S.state = state;
    var ov = $('jdVoiceMode');
    if (ov) ov.setAttribute('data-state', state);
    var el = $('jdVmStatus');
    if (el) el.textContent = statusText(state);
  }

  function setTranscript(who, text) {
    var box = $('jdVmTranscript');
    if (!box) return;
    var div = document.createElement('div');
    div.className = 'jd-vm-line ' + who;
    div.textContent = (who === 'user' ? t('you') + ': ' : t('ai') + ': ') + text;
    box.appendChild(div);
    while (box.children.length > 6) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  function setInterim(text) {
    var el = $('jdVmInterim');
    if (el) el.textContent = text ? '“' + text + '…”' : '';
  }

  /* ---------- mic level -> orb animation ---------- */
  function startMicLevel() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        if (!S.open) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        S.stream = stream;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        S.actx = new AC();
        var src = S.actx.createMediaStreamSource(stream);
        S.analyser = S.actx.createAnalyser();
        S.analyser.fftSize = 512;
        src.connect(S.analyser);
        var buf = new Uint8Array(S.analyser.fftSize);
        var loop = function () {
          if (!S.open || !S.analyser) return;
          S.analyser.getByteTimeDomainData(buf);
          var sum = 0;
          for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
          var rms = Math.sqrt(sum / buf.length);
          var ov = $('jdVoiceMode');
          if (ov) ov.style.setProperty('--jd-vol', Math.min(1, rms * 3.2).toFixed(2));
          S.raf = requestAnimationFrame(loop);
        };
        loop();
      }).catch(function () { /* mic level is decorative; recognition still works */ });
    } catch (e) {}
  }
  function stopMicLevel() {
    try { cancelAnimationFrame(S.raf); } catch (e) {}
    S.raf = 0; S.analyser = null;
    try { if (S.actx) S.actx.close(); } catch (e) {}
    S.actx = null;
    try { if (S.stream) S.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
    S.stream = null;
  }

  /* ---------- speech recognition ---------- */
  function stopRec() {
    S.recToken++;
    var r = S.rec;
    S.rec = null;
    try { if (r) r.abort(); } catch (e) {}
  }

  function startListening() {
    if (!S.open || S.muted) return;
    if (S.state !== 'listening' && S.state !== 'muted') return;
    var SR = srClass();
    if (!SR) return;
    stopRec();
    var token = ++S.recToken;
    var rec;
    try { rec = new SR(); } catch (e) { return; }
    S.rec = rec;
    S.restarts = 0;
    rec.lang = recogLang();
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = function (event) {
      if (token !== S.recToken || !S.open) return;
      var finalText = '', interim = '';
      try {
        var res = event.results;
        for (var i = 0; i < res.length; i++) {
          var t = (res[i] && res[i][0] && res[i][0].transcript) || '';
          if (res[i].isFinal) finalText += t + ' ';
          else interim += t + ' ';
        }
      } catch (e) {}
      finalText = finalText.trim(); interim = interim.trim();
      if (interim && !finalText) setInterim(interim);
      if (finalText) {
        setInterim('');
        stopRec();
        handleUtterance(finalText);
      }
    };
    rec.onerror = function (event) {
      if (token !== S.recToken || !S.open) return;
      var code = (event && event.error) || '';
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        stopRec();
        setState('idle');
        toast(t('errMic'));
        return;
      }
      /* no-speech / network / aborted: just let onend restart the loop */
    };
    rec.onend = function () {
      if (token !== S.recToken || !S.open) return;
      if (S.muted) return;
      if (S.state !== 'listening') return;
      if (++S.restarts > 10) {
        setState('idle');
        toast(t('errStopped'));
        return;
      }
      setTimeout(function () {
        if (token === S.recToken && S.open && S.state === 'listening' && !S.muted) startListening();
      }, 250);
    };
    try { rec.start(); }
    catch (e) { /* will retry via onend or next cycle */ }
  }

  /* ---------- send through the real chat pipeline ---------- */
  function handleUtterance(text) {
    text = (text || '').trim();
    if (!text || !S.open) { if (S.open) startListening(); return; }
    setTranscript('user', text);
    var generating = false;
    try { generating = !!isAIGenerating; } catch (e) {}
    if (generating) {
      toast(t('errBusy'));
      setState('listening');
      startListening();
      return;
    }
    setState('thinking');
    try {
      var input = $('userInput');
      if (!input || typeof sendMessage !== 'function') throw new Error('no-pipeline');
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      var r = sendMessage();
      if (r && typeof r.catch === 'function') r.catch(function () {});
    } catch (e) {
      toast(t('errSend'));
      setState('listening');
      startListening();
      return;
    }
    var wasGen = false, waited = 0;
    var startBots = 0;
    try { startBots = document.querySelectorAll('#chatBox .msg.bot').length; } catch (e) {}
    try { clearInterval(S.poll); } catch (e) {}
    var tick = function () {
      if (!S.open) { try { clearInterval(S.poll); } catch (e) {} return; }
      var g = false;
      try { g = !!isAIGenerating; } catch (e) {}
      var bots = startBots;
      try { bots = document.querySelectorAll('#chatBox .msg.bot').length; } catch (e) {}
      if (g) { wasGen = true; waited = 0; return; }
      /* fast/instant reply: generation flag never observed, but a new bot
         message already landed */
      if (wasGen || bots > startBots) { try { clearInterval(S.poll); } catch (e) {} onReplyReady(); return; }
      if (++waited > 40) {
        try { clearInterval(S.poll); } catch (e) {}
        setState('listening');
        startListening();
      }
    };
    S.poll = setInterval(tick, 300);
  }

  function onReplyReady() {
    if (!S.open) return;
    var bots = document.querySelectorAll('#chatBox .msg.bot');
    var el = bots[bots.length - 1];
    var text = el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
    if (!text) { setState('listening'); startListening(); return; }
    setTranscript('ai', text.length > 220 ? text.slice(0, 220) + '…' : text);
    if (!S.speaker) { setState('listening'); startListening(); return; }
    speak(text);
  }

  function speak(text) {
    if (!S.open) return;
    setState('speaking');
    try {
      speakSmartVoice(text, {
        onend: function () {
          if (!S.open) return;
          if (S.state === 'speaking') { setState('listening'); startListening(); }
        },
        onerror: function () {
          if (!S.open) return;
          setState('listening');
          startListening();
        }
      });
    } catch (e) {
      setState('listening');
      startListening();
    }
  }

  /* ---------- open / close ---------- */
  function open() {
    if (S.open) return;
    if (!srClass()) {
      toast(t('errNoSR'));
      return;
    }
    if (!('speechSynthesis' in window) || typeof speakSmartVoice !== 'function') {
      toast(t('errNoTTS'));
      return;
    }
    buildUI();
    try { if (typeof stopSpeechRecognition === 'function') stopSpeechRecognition('voice-mode'); } catch (e) {}
    try { if (typeof stopAllSpeech === 'function') stopAllSpeech(); } catch (e) {}
    S.open = true;
    S.muted = false;
    var m = $('jdVmMute');
    if (m) { m.classList.remove('off'); m.innerHTML = icon('mic', 22); refreshIcons(m); }
    var ov = $('jdVoiceMode');
    ov.removeAttribute('hidden');
    document.body.classList.add('jd-vm-open');
    setState('listening');
    startMicLevel();
    startListening();
  }

  function close() {
    if (!S.open) return;
    S.open = false;
    S.recToken++;
    stopRec();
    try { clearInterval(S.poll); } catch (e) {}
    try { if (typeof stopAllSpeech === 'function') stopAllSpeech(); } catch (e) {}
    stopMicLevel();
    setInterim('');
    var ov = $('jdVoiceMode');
    if (ov) { ov.setAttribute('hidden', ''); ov.setAttribute('data-state', 'idle'); }
    document.body.classList.remove('jd-vm-open');
    S.state = 'idle';
  }

  function init() {
    injectCSS();
    buildUI();
    jdInitSendVoiceSwap();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.JDVoiceMode = { open: open, close: close, isOpen: function () { return S.open; } };
})();
