/* =========================================================
   JepongDevxyz AI — Robot Avatar (robot-heads integration)

   Customizable AI avatar powered by fayazara/robot-heads (MIT).
   - Settings → MY AI → AI Avatar: full customization panel
     (shapes, preview states, shell/trim/screen colors + color lab,
      antenna, speed, reset). Persisted to localStorage.
   - Live activity pill: robot avatar + real AI status text,
     driven by the app's own #aiActivitySummary element.
   - Depends on /robot-head.js (window.RobotHead).

   Guards: no-ops when RobotHead is absent, idempotent on
   double-load, fail-open (any error leaves the app untouched).
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdRobotAvatar) return;
  window.__jdRobotAvatar = true;

  /* ---------- state ---------- */
  var ROBOT_DEFAULTS = { shape: 'rectangle', color: '#2b49a3', trimColor: '#93a6c8', screenColor: '#e8f2ff', antenna: true, speed: 1 };
  var LS_KEY = 'jampong.robot';
  var robot = loadRobot();

  function loadRobot() {
    var r = { shape: ROBOT_DEFAULTS.shape, color: ROBOT_DEFAULTS.color, trimColor: ROBOT_DEFAULTS.trimColor, screenColor: ROBOT_DEFAULTS.screenColor, antenna: ROBOT_DEFAULTS.antenna, speed: ROBOT_DEFAULTS.speed };
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        ['shape', 'color', 'trimColor', 'screenColor'].forEach(function (k) { if (typeof saved[k] === 'string' && saved[k]) r[k] = saved[k]; });
        if (typeof saved.antenna === 'boolean') r.antenna = saved.antenna;
        if (typeof saved.speed === 'number' && saved.speed > 0) r.speed = saved.speed;
      }
    } catch (e) {}
    return r;
  }
  function saveRobot() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(robot)); } catch (e) {}
  }

  var ROBOT_SWATCHES = {
    color: [['Cobalt', '#2b49a3'], ['Tomato', '#c8372d'], ['Tangerine', '#e2762a'], ['Mustard', '#e0ad1f'], ['Mint', '#2f8f58'], ['Teal', '#1f8189'], ['Grape', '#6a45b8'], ['Bubblegum', '#d9558f'], ['Graphite', '#3a3d44'], ['Porcelain', '#e6e6ea']],
    trimColor: [['Steel', '#93a6c8'], ['Silver', '#c4c9d2'], ['Brass', '#c9a45c'], ['Copper', '#c27a52'], ['Black', '#2a2c31']],
    screenColor: [['White', '#e8f2ff'], ['Ice', '#7fe7ff'], ['Matrix', '#7dff9a'], ['Amber', '#ffc46b'], ['Neon', '#ff8fd0']]
  };
  var ROBOT_ROW_LABELS = { color: 'Shell', trimColor: 'Trim', screenColor: 'Screen' };
  var ROBOT_SPEEDS = [0.5, 1, 1.5, 2];
  var ROBOT_STATES = ['idle', 'thinking', 'searching', 'listening', 'speaking', 'working', 'happy', 'error', 'sleeping'];
  var ROBOT_STATE_HINTS = {
    idle: 'Looks around, blinks, hops now and then.', thinking: 'Ponders deeply, screen shows thought ripples.',
    searching: 'Scans the horizon for answers.', listening: 'Ears perked, waiting for you.',
    speaking: 'Talks it out, mouth moves.', working: 'Busy building, gears turning.',
    happy: 'Job done — celebrates!', error: 'Something went wrong.', sleeping: 'Powered down for a nap.'
  };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* ---------- CSS (scoped, theme-aware via body classes) ---------- */
  var CSS_ID = 'jdRobotAvatarCss';
  function injectCss() {
    if (document.getElementById(CSS_ID)) return;
    var css =
      '.jd-ra{--ra-tray:#f4f4f5;--ra-card:#fff;--ra-line:#e4e4e7;--ra-ink:#18181b;--ra-muted:#71717a;--ra-accent:#4469fc}' +
      'body.theme-dark .jd-ra,body.dark .jd-ra{--ra-tray:#1d1d20;--ra-card:#1b1b1e;--ra-line:#2d2d30;--ra-ink:#f4f4f5;--ra-muted:#a1a1aa;--ra-accent:#6d8bff}' +
      /* activity pill */
      '.jd-ra-pill{position:fixed;top:14px;left:50%;transform:translate(-50%,-8px);z-index:60;display:flex;align-items:center;gap:10px;' +
      'background:var(--ra-card);border:1px solid var(--ra-line);border-radius:999px;padding:6px 16px 6px 8px;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.12);opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease;max-width:min(92vw,480px)}' +
      '.jd-ra-pill[data-show]{opacity:1;transform:translate(-50%,0);pointer-events:auto}' +
      '.jd-ra-ava{width:40px;height:40px;border-radius:50%;overflow:hidden;flex:none;background:var(--ra-tray);display:flex;align-items:center;justify-content:center}' +
      '.jd-ra-ava>span{display:block;transform:scale(.42);transform-origin:center}' +
      '.jd-ra-txt{min-width:0}.jd-ra-name{font-size:13px;font-weight:700;color:var(--ra-ink);line-height:1.2;white-space:nowrap}' +
      '.jd-ra-status{font-size:12px;color:var(--ra-muted);line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}' +
      /* settings panel */
      '.jd-ra-panel{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center}' +
      '.jd-ra-panel[data-show]{display:flex}' +
      '.jd-ra-back{position:absolute;inset:0;background:rgba(0,0,0,.45)}' +
      '.jd-ra-card{position:relative;background:var(--ra-card);color:var(--ra-ink);border-radius:18px;width:min(560px,calc(100vw - 32px));' +
      'max-height:calc(100vh - 48px);display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,.25);' +
      'animation:jd-ra-in .22s ease}' +
      '@keyframes jd-ra-in{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:none}}' +
      '.jd-ra-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0}' +
      '.jd-ra-head h2{font-size:17px;font-weight:700;margin:0}' +
      '.jd-ra-x{width:32px;height:32px;border-radius:50%;border:0;background:var(--ra-tray);color:var(--ra-ink);font-size:16px;cursor:pointer}' +
      '.jd-ra-body{overflow-y:auto;padding:6px 20px 20px;-webkit-overflow-scrolling:touch}' +
      '.jd-ra-label{font-size:12px;font-weight:700;letter-spacing:.06em;color:var(--ra-muted);margin:18px 0 10px;text-transform:uppercase}' +
      '.jd-ra-stage{background:var(--ra-tray);border-radius:14px;min-height:190px;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
      '.jd-ra-hint{font-size:12px;color:var(--ra-muted);margin:8px 2px 0}' +
      '.jd-ra-shapes{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}' +
      '.jd-ra-shape{border:1.5px solid var(--ra-line);background:var(--ra-card);border-radius:12px;padding:6px 4px 8px;cursor:pointer;' +
      'display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--ra-ink)}' +
      '.jd-ra-shape[data-on]{border-color:var(--ra-accent);box-shadow:0 0 0 1px var(--ra-accent)}' +
      '.jd-ra-shape .jd-ra-mini{width:56px;height:56px;pointer-events:none}' +
      '.jd-ra-shape small{font-size:11px;color:var(--ra-muted)}' +
      '.jd-ra-states{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}' +
      '.jd-ra-state{border:1.5px solid var(--ra-line);background:var(--ra-card);border-radius:12px;padding:6px 4px 8px;cursor:pointer;' +
      'display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--ra-ink)}' +
      '.jd-ra-state[data-on]{border-color:var(--ra-accent);box-shadow:0 0 0 1px var(--ra-accent)}' +
      '.jd-ra-state .jd-ra-mini{width:56px;height:56px;pointer-events:none}' +
      '.jd-ra-state small{font-size:11px;color:var(--ra-muted)}' +
      '.jd-ra-swrow{display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap}' +
      '.jd-ra-swname{font-size:13px;font-weight:600;width:54px;flex:none}' +
      '.jd-ra-swatches{display:flex;gap:6px;flex-wrap:wrap;flex:1}' +
      '.jd-ra-sw{width:28px;height:28px;border-radius:50%;border:2px solid transparent;cursor:pointer;padding:0;flex:none}' +
      '.jd-ra-sw[data-on]{border-color:var(--ra-accent);box-shadow:0 0 0 1px var(--ra-card),0 0 0 2px var(--ra-accent)}' +
      '.jd-ra-custom{position:relative;width:28px;height:28px;border-radius:50%;overflow:hidden;flex:none;' +
      'border:1.5px dashed var(--ra-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px}' +
      '.jd-ra-custom input{position:absolute;inset:-8px;width:60px;height:60px;opacity:0;cursor:pointer}' +
      '.jd-ra-labbtn{width:28px;height:28px;border-radius:50%;cursor:pointer;flex:none;border:1px solid var(--ra-line);' +
      'background:var(--ra-card);font-size:14px;display:flex;align-items:center;justify-content:center;padding:0}' +
      '.jd-ra-lab{flex:1 1 100%;margin:4px 0 6px 62px;background:var(--ra-tray);border-radius:12px;padding:12px 14px}' +
      '.jd-ra-labgrid{display:flex;flex-direction:column;gap:8px}' +
      '.jd-ra-labgrid label{display:flex;align-items:center;gap:10px;font-size:12px;font-weight:700;color:var(--ra-muted);width:100%}' +
      '.jd-ra-labgrid input[type=range]{flex:1;accent-color:var(--ra-accent);cursor:pointer}' +
      '.jd-ra-labhex{display:flex;align-items:center;gap:10px;margin-top:10px}' +
      '.jd-ra-labprev{width:34px;height:34px;border-radius:10px;flex:none;border:1px solid var(--ra-line)}' +
      '.jd-ra-labhex input[type=text]{flex:1;height:34px;border:1px solid var(--ra-line);border-radius:10px;background:var(--ra-card);' +
      'color:var(--ra-ink);font-size:13px;font-family:monospace;padding:0 12px;outline:none}' +
      '.jd-ra-seg{display:flex;background:var(--ra-tray);border-radius:12px;padding:3px;gap:2px}' +
      '.jd-ra-segbtn{flex:1;border:0;background:transparent;color:var(--ra-muted);font-size:13px;font-weight:600;' +
      'padding:8px 4px;border-radius:9px;cursor:pointer}' +
      '.jd-ra-segbtn[data-on]{background:var(--ra-card);color:var(--ra-ink);box-shadow:0 1px 4px rgba(0,0,0,.12)}' +
      '.jd-ra-reset{width:100%;margin-top:18px;padding:12px;border-radius:12px;border:1px solid var(--ra-line);' +
      'background:var(--ra-card);color:var(--ra-ink);font-size:14px;font-weight:600;cursor:pointer}' +
      '.jd-ra-reset:hover{border-color:var(--ra-accent)}' +
      /* chat message avatars */
      '.jd-ra-msgava{width:32px;height:32px;border-radius:50%;overflow:hidden;flex:none;' +
      'background:var(--ra-tray);display:inline-flex;align-items:center;justify-content:center;' +
      'margin-right:8px;vertical-align:top}' +
      '.jd-ra-msgava>span{display:block;transform:scale(.34);transform-origin:center}' +
      '.msg.bot{display:flex;align-items:flex-start}' +
      '.msg.bot>.jd-ra-msgava{margin-top:2px}';
    var st = document.createElement('style');
    st.id = CSS_ID;
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ---------- robot mount helper ---------- */
  function mountRobot(box, opts) {
    if (!window.RobotHead || !box) return null;
    box.innerHTML = '';
    var o = {
      shape: robot.shape, size: (opts && opts.size) || 160, speed: robot.speed,
      color: robot.color, trimColor: robot.trimColor, screenColor: robot.screenColor,
      antenna: robot.antenna, interactive: !!(opts && opts.interactive),
      floorShadow: !!(opts && opts.floorShadow), seed: (opts && opts.seed) || 0.5,
      state: (opts && opts.state) || 'idle', paused: false
    };
    try { return window.RobotHead.mount(box, o); }
    catch (e) { return null; }
  }

  /* ---------- activity pill ---------- */
  var pill = null, pillCtl = null, pillHideT = 0;
  function ensurePill() {
    if (pill) return pill;
    injectCss();
    pill = document.createElement('div');
    pill.className = 'jd-ra jd-ra-pill';
    pill.id = 'jdRaPill';
    pill.setAttribute('aria-live', 'polite');
    pill.innerHTML = '<div class="jd-ra-ava" id="jdRaAva"></div>' +
      '<div class="jd-ra-txt"><div class="jd-ra-name">JepongDevxyz AI</div>' +
      '<div class="jd-ra-status" id="jdRaStatus">Thinking…</div></div>';
    document.body.appendChild(pill);
    pillCtl = mountRobot(document.getElementById('jdRaAva'), { size: 96, seed: 0.42, interactive: false, floorShadow: false });
    return pill;
  }

  /* Map the app's real activity text to a robot face state. */
  function robotStateFor(text) {
    var t = (text || '').toLowerCase();
    if (/search|web|brows/i.test(t)) return 'searching';
    if (/think|reason|plan/i.test(t)) return 'thinking';
    if (/writ|generat|stream|typ/i.test(t)) return 'speaking';
    if (/connect|retry|load/i.test(t)) return 'working';
    if (/error|fail/i.test(t)) return 'error';
    if (/done|complete|finish/i.test(t)) return 'happy';
    return 'thinking';
  }

  function showPill(statusText, forceState) {
    ensurePill();
    clearTimeout(pillHideT);
    var st = document.getElementById('jdRaStatus');
    if (st && statusText) st.textContent = statusText;
    if (pillCtl) {
      try { pillCtl.setState(forceState || robotStateFor(statusText)); } catch (e) {}
    }
    pill.setAttribute('data-show', '');
  }
  function hidePill(delay) {
    clearTimeout(pillHideT);
    pillHideT = setTimeout(function () {
      if (pill) pill.removeAttribute('data-show');
    }, delay == null ? 1200 : delay);
  }
  /* Public API for other patches / console. */
  window.__jdRobotStatus = function (text, state) {
    if (!text) { hidePill(0); return; }
    showPill(text, state);
  };

  /* Drive the pill from the app's own activity summary element. */
  function watchActivity() {
    var target = document.getElementById('aiActivitySummary');
    if (!target) {
      setTimeout(watchActivity, 1500);
      return;
    }
    var last = '';
    new MutationObserver(function () {
      var t = (target.textContent || '').trim();
      if (t === last) return;
      last = t;
      if (!t) { hidePill(800); return; }
      showPill(t);
    }).observe(target, { childList: true, characterData: true, subtree: true });
    /* also watch for the indicator being removed = run finished */
    new MutationObserver(function () {
      if (!document.getElementById('aiActivitySummary')) hidePill(600);
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- settings panel ---------- */
  var panel = null, previewCtl = null, minis = [];
  var ROBOT_SHAPES = ['rectangle', 'square', 'circle', 'hexagon'];

  function refreshPreview() {
    if (previewCtl) {
      try {
        previewCtl.setShape(robot.shape);
        previewCtl.setColors({ color: robot.color, trimColor: robot.trimColor, screenColor: robot.screenColor });
        previewCtl.setSpeed(robot.speed);
        previewCtl.setAntenna(robot.antenna);
      } catch (e) {}
    }
    minis.forEach(function (m) {
      try {
        m.ctl.setShape(robot.shape);
        m.ctl.setColors({ color: robot.color, trimColor: robot.trimColor, screenColor: robot.screenColor });
        m.ctl.setSpeed(robot.speed);
        m.ctl.setAntenna(robot.antenna);
        m.ctl.setState(m.state);
      } catch (e) {}
    });
    /* re-mount the pill avatar so it picks up the new look */
    pillCtl = null;
    var ava = document.getElementById('jdRaAva');
    if (ava) { try { pillCtl = mountRobot(ava, { size: 96, seed: 0.42, interactive: false, floorShadow: false }); } catch (e) {} }
  }

  function paintColors() {
    if (!panel) return;
    var rows = panel.querySelectorAll('[data-crow]');
    rows.forEach(function (row) {
      var key = row.getAttribute('data-crow');
      var cIn = row.querySelector('[data-custom]');
      if (cIn) cIn.value = robot[key];
      row.querySelectorAll('.jd-ra-sw').forEach(function (b) {
        if ((b.getAttribute('data-hex') || '').toLowerCase() === (robot[key] || '').toLowerCase()) b.setAttribute('data-on', '');
        else b.removeAttribute('data-on');
      });
    });
  }

  function hexToRgb(h) {
    h = (h || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(function (v) { return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join('');
  }

  function buildPanel() {
    injectCss();
    panel = document.createElement('div');
    panel.className = 'jd-ra jd-ra-panel';
    panel.id = 'jdRaPanel';
    panel.innerHTML =
      '<div class="jd-ra-back" data-close></div>' +
      '<div class="jd-ra-card" role="dialog" aria-label="AI Avatar settings">' +
      '<div class="jd-ra-head"><h2>AI Avatar</h2><button class="jd-ra-x" data-close aria-label="Close">✕</button></div>' +
      '<div class="jd-ra-body">' +
      '<div class="jd-ra-label">Preview</div>' +
      '<div class="jd-ra-stage" id="jdRaStage"></div>' +
      '<p class="jd-ra-hint" id="jdRaHint"></p>' +
      '<div class="jd-ra-label">Shape</div><div class="jd-ra-shapes" id="jdRaShapes"></div>' +
      '<div class="jd-ra-label">Preview state</div><div class="jd-ra-states" id="jdRaStates"></div>' +
      '<div class="jd-ra-label">Colors</div><div id="jdRaColors"></div>' +
      '<div class="jd-ra-label">Antenna</div><div class="jd-ra-seg" id="jdRaAntenna"></div>' +
      '<div class="jd-ra-label">Animation speed</div><div class="jd-ra-seg" id="jdRaSpeed"></div>' +
      '<button class="jd-ra-reset" id="jdRaReset">Reset to defaults</button>' +
      '</div></div>';
    document.body.appendChild(panel);

    panel.querySelectorAll('[data-close]').forEach(function (el) {
      el.addEventListener('click', closePanel);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel && panel.hasAttribute('data-show')) closePanel();
    });

    /* stage preview */
    var hintEl = panel.querySelector('#jdRaHint');
    previewCtl = mountRobot(panel.querySelector('#jdRaStage'), { size: 150, seed: 0.7, interactive: true, floorShadow: true, state: 'idle' });
    function setHint(st) { hintEl.textContent = cap(st) + ' — ' + ROBOT_STATE_HINTS[st]; }
    setHint('idle');

    /* shapes */
    var shapeBox = panel.querySelector('#jdRaShapes');
    ROBOT_SHAPES.forEach(function (sh) {
      var b = document.createElement('button');
      b.className = 'jd-ra-shape';
      b.type = 'button';
      b.innerHTML = '<span class="jd-ra-mini" data-mini></span><small>' + cap(sh) + '</small>';
      if (robot.shape === sh) b.setAttribute('data-on', '');
      b.addEventListener('click', function () {
        robot.shape = sh; saveRobot(); refreshPreview();
        shapeBox.querySelectorAll('.jd-ra-shape').forEach(function (x) { x.removeAttribute('data-on'); });
        b.setAttribute('data-on', '');
      });
      shapeBox.appendChild(b);
      var ctl = mountRobot(b.querySelector('[data-mini]'), { size: 56, seed: 0.3, state: 'idle', interactive: false, floorShadow: false });
      if (ctl) minis.push({ ctl: ctl, state: 'idle' });
    });

    /* states */
    var stateBox = panel.querySelector('#jdRaStates');
    ROBOT_STATES.forEach(function (st) {
      var b = document.createElement('button');
      b.className = 'jd-ra-state';
      b.type = 'button';
      b.innerHTML = '<span class="jd-ra-mini" data-mini></span><small>' + cap(st) + '</small>';
      if (st === 'idle') b.setAttribute('data-on', '');
      b.addEventListener('click', function () {
        if (previewCtl) { try { previewCtl.setState(st); } catch (e) {} }
        setHint(st);
        stateBox.querySelectorAll('.jd-ra-state').forEach(function (x) { x.removeAttribute('data-on'); });
        b.setAttribute('data-on', '');
      });
      stateBox.appendChild(b);
      var ctl = mountRobot(b.querySelector('[data-mini]'), { size: 56, seed: 0.3, state: st, interactive: false, floorShadow: false });
      if (ctl) minis.push({ ctl: ctl, state: st });
    });

    /* colors + lab */
    var colorBox = panel.querySelector('#jdRaColors');
    Object.keys(ROBOT_SWATCHES).forEach(function (key) {
      var row = document.createElement('div');
      row.className = 'jd-ra-swrow';
      row.setAttribute('data-crow', key);
      row.innerHTML = '<span class="jd-ra-swname">' + ROBOT_ROW_LABELS[key] + '</span>' +
        '<span class="jd-ra-swatches" data-sw></span>' +
        '<span class="jd-ra-custom" title="Custom color">🎨<input type="color" value="' + robot[key] + '" data-custom aria-label="' + ROBOT_ROW_LABELS[key] + ' custom color"></span>' +
        '<button class="jd-ra-labbtn" data-labbtn type="button" aria-label="Experiment with ' + ROBOT_ROW_LABELS[key] + ' color" title="Color lab">🧪</button>';
      var swBox = row.querySelector('[data-sw]');
      ROBOT_SWATCHES[key].forEach(function (sw) {
        var b = document.createElement('button');
        b.className = 'jd-ra-sw';
        b.type = 'button';
        b.style.background = sw[1];
        b.title = sw[0];
        b.setAttribute('data-hex', sw[1]);
        b.setAttribute('aria-label', ROBOT_ROW_LABELS[key] + ' ' + sw[0]);
        if ((robot[key] || '').toLowerCase() === sw[1].toLowerCase()) b.setAttribute('data-on', '');
        b.addEventListener('click', function () {
          robot[key] = sw[1]; saveRobot(); refreshPreview(); paintColors(); syncLab();
        });
        swBox.appendChild(b);
      });
      row.querySelector('[data-custom]').addEventListener('input', function (e) {
        robot[key] = e.target.value; saveRobot(); refreshPreview(); paintColors(); syncLab();
      });
      /* color lab */
      var lab = document.createElement('div');
      lab.className = 'jd-ra-lab';
      lab.hidden = true;
      lab.innerHTML =
        '<div class="jd-ra-labgrid">' +
        '<label>R <input type="range" min="0" max="255" value="0" data-r></label>' +
        '<label>G <input type="range" min="0" max="255" value="0" data-g></label>' +
        '<label>B <input type="range" min="0" max="255" value="0" data-b></label>' +
        '</div>' +
        '<div class="jd-ra-labhex"><span class="jd-ra-labprev" data-prev></span>' +
        '<input type="text" data-hex maxlength="7" spellcheck="false" aria-label="' + ROBOT_ROW_LABELS[key] + ' hex color" placeholder="#2b49a3"></div>';
      row.appendChild(lab);
      var rIn = lab.querySelector('[data-r]'), gIn = lab.querySelector('[data-g]'), bIn = lab.querySelector('[data-b]');
      var hexIn = lab.querySelector('[data-hex]'), prev = lab.querySelector('[data-prev]');
      function syncLab() {
        var rgb = hexToRgb(robot[key]) || [43, 73, 163];
        rIn.value = rgb[0]; gIn.value = rgb[1]; bIn.value = rgb[2];
        hexIn.value = robot[key];
        prev.style.background = robot[key];
      }
      lab._sync = syncLab;
      function applyLab() {
        var hex = rgbToHex(+rIn.value, +gIn.value, +bIn.value);
        hexIn.value = hex;
        prev.style.background = hex;
        robot[key] = hex; saveRobot(); refreshPreview(); paintColors();
      }
      [rIn, gIn, bIn].forEach(function (inp) { inp.addEventListener('input', applyLab); });
      hexIn.addEventListener('input', function () {
        var rgb = hexToRgb(hexIn.value.trim());
        if (!rgb) return;
        rIn.value = rgb[0]; gIn.value = rgb[1]; bIn.value = rgb[2];
        prev.style.background = hexIn.value;
        robot[key] = rgbToHex(rgb[0], rgb[1], rgb[2]); saveRobot(); refreshPreview(); paintColors();
      });
      row.querySelector('[data-labbtn]').addEventListener('click', function () {
        lab.hidden = !lab.hidden;
        if (!lab.hidden) syncLab();
      });
      colorBox.appendChild(row);
    });

    /* antenna */
    var antBox = panel.querySelector('#jdRaAntenna');
    [true, false].forEach(function (v) {
      var b = document.createElement('button');
      b.className = 'jd-ra-segbtn';
      b.type = 'button';
      b.textContent = v ? 'On' : 'Off';
      if (robot.antenna === v) b.setAttribute('data-on', '');
      b.addEventListener('click', function () {
        robot.antenna = v; saveRobot(); refreshPreview();
        antBox.querySelectorAll('.jd-ra-segbtn').forEach(function (x) { x.removeAttribute('data-on'); });
        b.setAttribute('data-on', '');
      });
      antBox.appendChild(b);
    });

    /* speed */
    var spBox = panel.querySelector('#jdRaSpeed');
    ROBOT_SPEEDS.forEach(function (s) {
      var b = document.createElement('button');
      b.className = 'jd-ra-segbtn';
      b.type = 'button';
      b.textContent = s + '×';
      if (robot.speed === s) b.setAttribute('data-on', '');
      b.addEventListener('click', function () {
        robot.speed = s; saveRobot(); refreshPreview();
        spBox.querySelectorAll('.jd-ra-segbtn').forEach(function (x) { x.removeAttribute('data-on'); });
        b.setAttribute('data-on', '');
      });
      spBox.appendChild(b);
    });

    /* reset */
    panel.querySelector('#jdRaReset').addEventListener('click', function () {
      robot = { shape: ROBOT_DEFAULTS.shape, color: ROBOT_DEFAULTS.color, trimColor: ROBOT_DEFAULTS.trimColor, screenColor: ROBOT_DEFAULTS.screenColor, antenna: ROBOT_DEFAULTS.antenna, speed: ROBOT_DEFAULTS.speed };
      saveRobot(); refreshPreview(); paintColors();
      /* repaint selectors */
      shapeBox.querySelectorAll('.jd-ra-shape').forEach(function (x, i) {
        if (ROBOT_SHAPES[i] === robot.shape) x.setAttribute('data-on', ''); else x.removeAttribute('data-on');
      });
      antBox.querySelectorAll('.jd-ra-segbtn').forEach(function (x, i) {
        if ((i === 0) === robot.antenna) x.setAttribute('data-on', ''); else x.removeAttribute('data-on');
      });
      spBox.querySelectorAll('.jd-ra-segbtn').forEach(function (x, i) {
        if (ROBOT_SPEEDS[i] === robot.speed) x.setAttribute('data-on', ''); else x.removeAttribute('data-on');
      });
      panel.querySelectorAll('.jd-ra-lab').forEach(function (l) { if (l._sync && !l.hidden) l._sync(); });
    });
  }

  function openPanel() {
    if (!window.RobotHead) {
      if (typeof window.showModernToast === 'function') window.showModernToast('Avatar engine still loading…');
      return;
    }
    if (!panel) buildPanel();
    panel.setAttribute('data-show', '');
    try { document.body.style.overflow = 'hidden'; } catch (e) {}
  }
  function closePanel() {
    if (!panel) return;
    panel.removeAttribute('data-show');
    try { document.body.style.overflow = ''; } catch (e) {}
  }
  window.openRobotAvatarSettings = openPanel;

  /* ---------- boot ---------- */
  /* ---------- chat message avatars ---------- */
  var msgAvatarCtls = [];
  function addMsgAvatar(msgEl) {
    if (!msgEl || msgEl.querySelector(':scope > .jd-ra-msgava')) return;
    try {
      var ava = document.createElement('span');
      ava.className = 'jd-ra jd-ra-msgava';
      ava.setAttribute('aria-hidden', 'true');
      msgEl.insertBefore(ava, msgEl.firstChild);
      var ctl = mountRobot(ava, { size: 96, seed: 0.42, interactive: false, floorShadow: false, state: 'idle' });
      if (ctl) msgAvatarCtls.push(ctl);
    } catch (e) {}
  }
  function scanMsgAvatars(root) {
    try {
      var els = (root || document).querySelectorAll('.msg.bot');
      for (var i = 0; i < els.length; i++) addMsgAvatar(els[i]);
    } catch (e) {}
  }
  function watchChat() {
    scanMsgAvatars(document);
    /* new AI replies arrive as .msg.bot nodes */
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains('msg') && n.classList.contains('bot')) addMsgAvatar(n);
          else if (n.querySelectorAll) {
            var els = n.querySelectorAll('.msg.bot');
            for (var i = 0; i < els.length; i++) addMsgAvatar(els[i]);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* refresh all mounted avatars (pill + chat) when customization changes */
  var _origRefresh = refreshPreview;
  refreshPreview = function () {
    _origRefresh();
    msgAvatarCtls = msgAvatarCtls.filter(function (ctl) {
      try {
        if (!ctl.el || !document.contains(ctl.el)) return false;
        ctl.setShape(robot.shape);
        ctl.setColors({ color: robot.color, trimColor: robot.trimColor, screenColor: robot.screenColor });
        ctl.setSpeed(robot.speed);
        ctl.setAntenna(robot.antenna);
        return true;
      } catch (e) { return false; }
    });
  };

  function boot() {
    injectCss();
    /* wait for RobotHead (loaded as a separate patch) */
    if (!window.RobotHead) {
      setTimeout(boot, 500);
      return;
    }
    watchActivity();
    watchChat();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
