/* JepongDevxyz AI — activity status calmness fix (2026-09-30).
 *
 * Root causes found (verified against the live index.html activity system
 * with a jsdom event-sequence simulation):
 *
 * 1. BLINK — renderActivityEventNow() restarts the `.ai-activity-enter`
 *    fade-in animation on EVERY render, including updates to rows that
 *    already exist (provider retries "Connecting to Gemini" -> "Retrying
 *    Gemini" -> "Gemini connected", web-search running -> completed, ...).
 *    Each restart flashes the row from 16% opacity, so statuses visibly
 *    blink, and the retry label churn looks like statuses re-appearing
 *    ("paulit-ulit").
 * 2. DISAPPEAR — the startup "Thinking" row (id `client-thinking`) is
 *    REMOVED from the DOM when the first server event arrives, then the
 *    server's own `thinking` event ADDS a new "Thinking" row: a visible
 *    remove+add flicker; on fast sequences the status looks like it
 *    vanished ("nawawala agad").
 * 3. INVISIBLE EFFORT — the six response-effort levels (Instant / Low /
 *    Medium / High / Extra / Max) all work server-side (system instruction,
 *    native reasoning knobs, token budgets, planner/preflight gates), but
 *    nothing on screen tells which level is active, so they feel dead.
 *
 * Fixes (runtime patches; no existing code is edited):
 *  - Patch 1: after each render, strip `ai-activity-enter` from rows that
 *    already existed before that render. New rows keep their fade-in;
 *    updates apply instantly with no flash. State/icon/label updates are
 *    untouched — only the restart of the enter animation is suppressed.
 *  - Patch 2: rename the startup row to id `thinking` right after the
 *    indicator is created, so the server's thinking event updates it in
 *    place instead of remove+add.
 *  - Patch 3: show the active response-effort level as a small tag next
 *    to the Thinking label (sibling of #aiActivitySummary, so server
 *    textContent updates can't wipe it). Every level is now visibly
 *    distinct per request; the tag is removed with the indicator.
 *
 * Guards: no-ops when the host functions are absent, idempotent when
 * loaded twice, and fail-open (any error leaves the original behavior).
 */
(function(){
  'use strict';

  // --- Patch 3 helpers: read the selected effort, render the tag. ---
  function currentEffort(){
    try{
      if(typeof window.currentResponseEffort==='function'){
        var viaFn=window.currentResponseEffort();
        if(viaFn)return String(viaFn);
      }
    }catch(_){}
    try{
      if(typeof personalizationSettings!=='undefined'&&
         personalizationSettings&&personalizationSettings.intelligence){
        return String(personalizationSettings.intelligence);
      }
    }catch(_){}
    return 'Instant';
  }

  function injectEffortTagStyles(){
    if(document.getElementById('jdEffortTagCss'))return;
    var s=document.createElement('style');
    s.id='jdEffortTagCss';
    s.textContent=
      '.jd-effort-tag{display:inline-block;margin-left:8px;padding:2px 9px;'+
      'border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.04em;'+
      'line-height:1.6;vertical-align:1px;white-space:nowrap;'+
      'color:#f59e0b;border:1px solid rgba(245,158,11,.45);'+
      'background:rgba(245,158,11,.10)}';
    document.head.appendChild(s);
  }

  function renderEffortTag(){
    try{
      injectEffortTagStyles();
      var effort=currentEffort();
      var summary=document.getElementById('aiActivitySummary');
      if(!summary||!summary.parentNode)return;
      var tag=document.getElementById('jdEffortTag');
      if(!tag||!summary.parentNode.contains(tag)){
        tag=document.createElement('span');
        tag.id='jdEffortTag';
        tag.className='jd-effort-tag';
        summary.parentNode.insertBefore(tag,summary.nextSibling);
      }
      if(tag.textContent!==effort)tag.textContent=effort;
      tag.setAttribute('aria-label','Response effort: '+effort);
    }catch(_){}
  }

  function patch(){
    try{
      var pending=false;
      // --- Patch 1: calm updates — no enter-animation restart on existing rows.
      var origRender=window.renderActivityEventNow;
      if(typeof origRender==='function'&&!origRender.__jdCalmPatched){
        var calmRender=function(evt){
          var list=document.getElementById('aiActivityList');
          var before=list?new Set(list.querySelectorAll('.ai-activity-row')):null;
          var out=origRender.apply(this,arguments);
          if(before){
            before.forEach(function(row){
              if(row.isConnected)row.classList.remove('ai-activity-enter');
            });
          }
          return out;
        };
        calmRender.__jdCalmPatched=true;
        window.renderActivityEventNow=calmRender;
      }else if(typeof origRender!=='function'){
        pending=true;
      }

      // --- Patch 2: stable startup row — server updates it in place.
      var origShow=window.showAIIndicator;
      if(typeof origShow==='function'&&!origShow.__jdCalmPatched){
        var calmShow=function(){
          var out=origShow.apply(this,arguments);
          try{
            var startup=document.querySelector('#activeAiIndicator [data-activity-id="client-thinking"]');
            if(startup)startup.dataset.activityId='thinking';
          }catch(_){}
          // --- Patch 3: tag the Thinking line with the active effort level.
          renderEffortTag();
          return out;
        };
        calmShow.__jdCalmPatched=true;
        window.showAIIndicator=calmShow;
      }else if(typeof origShow!=='function'){
        pending=true;
      }
      return !pending;
    }catch(_){
      return false;
    }
  }

  if(!patch()){
    // Host script not ready yet (shouldn't happen via the deferred
    // bootstrap, but stay safe): retry once the DOM is complete.
    document.addEventListener('DOMContentLoaded',patch,{once:true});
  }
})();
