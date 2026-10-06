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
    '.jd-vm-entry{width:56px;height:56px;flex:0 0 auto;border-radius:50%;border:0;background:color-mix(in srgb,var(--pb-ink) 12%,var(--pb-bg));color:color-mix(in srgb,var(--pb-ink) 55%,var(--pb-bg));display:inline-flex;align-items:center;justify-content:center;cursor:pointer;margin-left:8px}',
    '.jd-vm-entry:active{transform:scale(.93)}',
    '@media(max-width:520px){.jd-vm-entry{width:32px;height:32px}}',
    '.jd-vm-entry svg{width:40%;height:40%}',
    /* Theme-uniform send button (2026-10-01): dark mode = dark button, light mode = light button. */
    'body:not(.theme-light) #mainActionBtn.prompt-bar__send,body:not(.theme-light) #mainActionBtn.prompt-bar__send[data-armed]{background:#2b2b30!important;color:#e8e8e8!important}',
    'body.theme-light #mainActionBtn.prompt-bar__send,body.theme-light #mainActionBtn.prompt-bar__send[data-armed]{background:#ececf0!important;color:#55555d!important}',
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
    if (S.lastSpokenLanguage) return S.lastSpokenLanguage;
    try { if (typeof preferredLanguageCode === 'function') { var preferred = preferredLanguageCode(); if (preferred) return preferred; } } catch (e) {}
    return navigator.language || 'en-US';
  }

  function detectUserLanguage(text) {
    var value = String(text || '');
    if (/[\u3040-\u30ff]/.test(value)) return 'ja-JP';
    if (/[\uac00-\ud7af]/.test(value)) return 'ko-KR';
    if (/[\u4e00-\u9fff]/.test(value)) return 'zh-CN';
    if (/\b(ang|mga|ako|ikaw|siya|kami|tayo|sila|ito|salamat|kumusta|paano|bakit|hindi|oo|po|opo|gusto|kasi|naman|yung|iyan|iyon)\b/i.test(value)) return 'fil-PH';
    if (/\b(hola|gracias|cómo|quiero|ayuda|por favor)\b/i.test(value)) return 'es-ES';
    if (/\b(bonjour|merci|comment|vous|avec)\b/i.test(value)) return 'fr-FR';
    if (/\b(hallo|danke|bitte|ich|nicht)\b/i.test(value)) return 'de-DE';
    if (/\b(ciao|grazie|sono|questo|perché)\b/i.test(value)) return 'it-IT';
    if (/\b(olá|obrigado|obrigada|você|não)\b/i.test(value)) return 'pt-BR';
    if (/\b(hai|halo|saya|kamu|terima kasih|tidak|bisa)\b/i.test(value)) return 'id-ID';
    if (/\b(helo|saya|anda|terima kasih|tidak|boleh)\b/i.test(value)) return 'ms-MY';
    if (/\b(xin chào|cảm ơn|tôi|bạn|không|được)\b/i.test(value)) return 'vi-VN';
    try {
      var setting = (typeof personalizationSettings !== 'undefined' && personalizationSettings.language) || '';
      if ((!setting || setting === 'Auto-detect') && typeof detectSpeechLanguage === 'function') return detectSpeechLanguage(value) || 'en-US';
      if (setting && typeof preferredLanguageCode === 'function') return preferredLanguageCode() || 'en-US';
    } catch (e) {}
    return navigator.language || 'en-US';
  }

  function languageNameFor(code) {
    var names = {
      'fil-PH':'Filipino/Tagalog','en-US':'English','es-ES':'Spanish','fr-FR':'French','de-DE':'German',
      'it-IT':'Italian','pt-BR':'Portuguese','ja-JP':'Japanese','ko-KR':'Korean','zh-CN':'Chinese',
      'ar-SA':'Arabic','bn-BD':'Bengali','ceb-PH':'Cebuano','da-DK':'Danish','nl-NL':'Dutch',
      'fi-FI':'Finnish','el-GR':'Greek','gu-IN':'Gujarati','he-IL':'Hebrew','hi-IN':'Hindi',
      'hu-HU':'Hungarian','id-ID':'Indonesian','kn-IN':'Kannada','kk-KZ':'Kazakh','lv-LV':'Latvian',
      'lt-LT':'Lithuanian','mk-MK':'Macedonian','ms-MY':'Malay','ml-IN':'Malayalam','mr-IN':'Marathi',
      'mn-MN':'Mongolian','ne-NP':'Nepali','nb-NO':'Norwegian','fa-IR':'Persian','pl-PL':'Polish',
      'pa-IN':'Punjabi','ro-RO':'Romanian','ru-RU':'Russian','sr-RS':'Serbian','sk-SK':'Slovak',
      'sl-SI':'Slovenian','sw-KE':'Swahili','sv-SE':'Swedish','ta-IN':'Tamil','te-IN':'Telugu',
      'th-TH':'Thai','tr-TR':'Turkish','uk-UA':'Ukrainian','ur-PK':'Urdu','vi-VN':'Vietnamese'
    };
    return names[code] || 'English';
  }

  var S = {
    open: false, state: 'idle', rec: null, recToken: 0, restarts: 0,
    stream: null, actx: null, analyser: null, raf: 0,
    poll: 0, muted: false, speaker: true, lastSpokenLanguage: '', idlePromptTimer: 0
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

    /* The send button itself is the voice entry (see jdSyncSendVoice) —
       no separate composer button needed. */
  }

  /* ---------- ChatGPT-style send/voice swap (2026-10-01) ----------
     The SEND BUTTON ITSELF becomes the voice button when the composer is
     empty: we swap its icon to audio-lines and its click to open voice mode.
     This guarantees pixel-perfect position/style — it is literally the same
     button, same DOM node, same CSS. Typing text, attaching a file, or
     generating restores the normal send/stop button. The app owns the button
     during generation; we never fight it. */
  var jdOrigSendFaceHTML = null;
  var jdOrigSendClick = null;

  function jdVoiceSlotClick(e) {
    if (e) { try { e.preventDefault(); e.stopPropagation(); } catch (err) {} }
    open();
  }

  function jdRefreshVoiceSlotState() {
    try { window.JDReactBits?.syncPrompt?.(); } catch (e) {}
  }

  function jdSyncSendVoice() {
    var send = document.getElementById('mainActionBtn');
    if (!send) return;
    var face = send.querySelector('.rb-sling-face');
    if (!face) return;
    /* Retire the separate entry button — the send slot IS the voice button now. */
    var retired = $('jdVmEntry');
    if (retired) retired.style.display = 'none';
    /* During generation the app owns this button (stop icon) — hands off. */
    var generating = false;
    try { generating = !!isAIGenerating; } catch (e) {}
    try { if (window.__jdBibleAbort) generating = true; } catch (e) {}
    if (generating) {
      if (send.__jdVoiceSwapped) {
        send.__jdVoiceSwapped = false;
        if (jdOrigSendFaceHTML !== null) face.innerHTML = jdOrigSendFaceHTML;
        if (jdOrigSendClick) send.onclick = jdOrigSendClick;
        send.setAttribute('aria-label', 'Send');
      }
      var sling = document.getElementById('mainActionSling');
      if (sling) sling.toggleAttribute('data-voice-entry', !!send.__jdVoiceSwapped);
      jdRefreshVoiceSlotState();
      return;
    }
    var inp = $('userInput');
    var hasText = !!(inp && inp.value.trim());
    var fc = document.getElementById('filePreviewContainer');
    var hasFiles = !!(fc && !fc.hidden && fc.querySelector('.jd-upload-chip'));
    var showVoice = !hasText && !hasFiles;
    if (showVoice) {
      if (jdOrigSendFaceHTML === null) {
        jdOrigSendFaceHTML = face.innerHTML;
        jdOrigSendClick = send.onclick;
      }
      if (!send.__jdVoiceSwapped) {
        send.__jdVoiceSwapped = true;
        face.innerHTML = icon('audio-lines', 20);
        refreshIcons(face);
        send.onclick = jdVoiceSlotClick;
        send.setAttribute('aria-label', t('entryAria'));
        send.title = t('entryTitle');
      }
    } else if (send.__jdVoiceSwapped) {
      send.__jdVoiceSwapped = false;
      if (jdOrigSendFaceHTML !== null) face.innerHTML = jdOrigSendFaceHTML;
      if (jdOrigSendClick) send.onclick = jdOrigSendClick;
      send.setAttribute('aria-label', 'Send');
      send.title = 'Send';
    }
    var sling = document.getElementById('mainActionSling');
    if (sling) sling.toggleAttribute('data-voice-entry', !!send.__jdVoiceSwapped);
    jdRefreshVoiceSlotState();
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
    /* The ReactBits Sling button binds its own click listener and calls
       handleMainAction directly, so swapping the element's onclick property
       alone cannot open voice mode. Intercept the click before that listener. */
    var send = $('mainActionBtn');
    if (send && !send.__jdVoiceClickCaptureBound) {
      send.__jdVoiceClickCaptureBound = true;
      send.addEventListener('click', function (event) {
        if (!send.__jdVoiceSwapped) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        open();
      }, true);
    }
    /* Sling dispatches handleMainAction() directly from pointerup before a
       native click exists. Route that path through the same voice/send state
       check so both touch and mouse gestures open Voice mode when empty. */
    try {
      var currentAction = window.handleMainAction;
      if (typeof currentAction === 'function' && !currentAction.__jdVoiceModeWrapped) {
        var wrappedHandleMainAction = function () {
          var currentSend = $('mainActionBtn');
          if (currentSend && currentSend.__jdVoiceSwapped) {
            open();
            return;
          }
          return currentAction.apply(this, arguments);
        };
        wrappedHandleMainAction.__jdVoiceModeWrapped = true;
        try { Object.defineProperty(wrappedHandleMainAction, 'name', { value: 'handleMainAction' }); } catch (e) {}
        window.handleMainAction = wrappedHandleMainAction;
      }
    } catch (e) {}
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
        scheduleIdleNudge();
        return;
      }
      setTimeout(function () {
        if (token === S.recToken && S.open && S.state === 'listening' && !S.muted) startListening();
      }, 250);
    };
    try { rec.start(); }
    catch (e) { /* will retry via onend or next cycle */ }
    scheduleIdleNudge();
  }

  /* ---------- send through the real chat pipeline ---------- */
  function handleUtterance(text) {
    text = (text || '').trim();
    if (!text || !S.open) { if (S.open) startListening(); return; }
    setTranscript('user', text);
    S.lastSpokenLanguage = detectUserLanguage(text);
    clearTimeout(S.idlePromptTimer);
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
      var previousVoiceLanguage = window.__jdVoiceResponseLanguage;
      window.__jdVoiceResponseLanguage = languageNameFor(S.lastSpokenLanguage);
      var r = sendMessage();
      if (r && typeof r.finally === 'function') r.finally(function () { window.__jdVoiceResponseLanguage = previousVoiceLanguage; });
      else window.__jdVoiceResponseLanguage = previousVoiceLanguage;
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

  function scheduleIdleNudge() {
    clearTimeout(S.idlePromptTimer);
    if (!S.open || S.muted || !S.speaker) return;
    S.idlePromptTimer = setTimeout(function () {
      if (!S.open || S.state === 'speaking' || S.state === 'thinking' || S.muted) return;
      var followups = /^fil|^tl/i.test(S.lastSpokenLanguage)
        ? ['Nandito lang ako. Sabihin mo lang kung paano kita matutulungan.', 'Handa akong makinig. Ano ang gusto mong itanong?', 'Pwede ka nang magsalita kapag handa ka na.']
        : ['I’m here. Just tell me how I can help.', 'I’m listening. What would you like to ask?', 'Whenever you’re ready, you can speak.'];
      stopRec();
      speak(followups[Math.min(S.idleNudges++, followups.length - 1)]);
    }, 12000);
  }

  function speak(text, languageOverride) {
    if (!S.open) return;
    setState('speaking');
    try {
      speakSmartVoice(text, {
        languageOverride: languageOverride || S.lastSpokenLanguage || undefined,
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
    /* 2026-10-06 FIX for "walang pumapasok na voice": explicitly request mic permission */
    /* This triggers the browser prompt and ensures mic is available before starting */
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        try { stream.getTracks().forEach(function (tr) { tr.stop(); }); } catch (e) {}
        openAfterMic();
      }).catch(function () {
        toast(t('errMic'));
      });
      return;
    }
    openAfterMic();
  }

  function openAfterMic() {
    buildUI();
    try { if (typeof stopSpeechRecognition === 'function') stopSpeechRecognition('voice-mode'); } catch (e) {}
    try { if (typeof stopAllSpeech === 'function') stopAllSpeech(); } catch (e) {}
    S.open = true;
    S.muted = false;
    S.lastSpokenLanguage = '';
    S.idleNudges = 0;
    window.__jdVoiceResponseLanguage = '';
    var m = $('jdVmMute');
    if (m) { m.classList.remove('off'); m.innerHTML = icon('mic', 22); refreshIcons(m); }
    var ov = $('jdVoiceMode');
    ov.removeAttribute('hidden');
    document.body.classList.add('jd-vm-open');
    setState('speaking');
    startMicLevel();
    setTranscript('ai', 'Hello, I\'m JepongDevxyz AI. How can I help you today?');
    speak('Hello, I\'m JepongDevxyz AI. How can I help you today?', 'en-US');
  }

  function close() {
    if (!S.open) return;
    S.open = false;
    clearTimeout(S.idlePromptTimer);
    window.__jdVoiceResponseLanguage = '';
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
