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
 *
 * Fixes (runtime patches; no existing code is edited):
 *  - Patch 1: after each render, strip `ai-activity-enter` from rows that
 *    already existed before that render. New rows keep their fade-in;
 *    updates apply instantly with no flash. State/icon/label updates are
 *    untouched — only the restart of the enter animation is suppressed.
 *  - Patch 2: rename the startup row to id `thinking` right after the
 *    indicator is created, so the server's thinking event updates it in
 *    place instead of remove+add.
 *
 * Guards: no-ops when the host functions are absent, idempotent when
 * loaded twice, and fail-open (any error leaves the original behavior).
 */
(function(){
  'use strict';

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
