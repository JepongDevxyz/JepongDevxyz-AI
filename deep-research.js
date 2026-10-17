/* Deep Research Mode for JepongDevxyz AI (v20261008a354)
 * Orchestrates multi-step autonomous research:
 * 1. Takes a research query
 * 2. Generates 3-5 sub-queries (angles)
 * 3. Fans out parallel chat requests with web search
 * 4. Merges results with citations into a structured report
 *
 * Exposes: window.jdDeepResearch(query), window.jdOpenResearch()
 */
(function () {
  'use strict';
  if (window.__jdDeepResearch) return;
  window.__jdDeepResearch = true;

  /* ---------------- styles ---------------- */
  function ensureCss() {
    if (document.getElementById('jdDeepResearchCss')) return;
    var st = document.createElement('style');
    st.id = 'jdDeepResearchCss';
    st.textContent =
      '.jd-research-modal{position:fixed;inset:0;z-index:24960;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,.6)}' +
      '.jd-research-sheet{background:#1c1c1e;color:#fff;width:100%;max-width:640px;max-height:88dvh;border-radius:20px 20px 0 0;display:flex;flex-direction:column;overflow:hidden}' +
      '.jd-research-head{display:flex;align-items:center;gap:10px;padding:16px;border-bottom:1px solid rgba(255,255,255,.08)}' +
      '.jd-research-head h3{margin:0;font-size:16px;flex:1}' +
      '.jd-research-close{background:none;border:0;color:#999;font-size:22px;cursor:pointer}' +
      '.jd-research-body{padding:16px;overflow-y:auto;flex:1}' +
      '.jd-research-input{width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#2c2c2e;color:#fff;font-size:14px;box-sizing:border-box;margin-bottom:12px}' +
      '.jd-research-btn{background:#0a84ff;color:#fff;border:0;border-radius:12px;padding:12px 20px;font-size:14px;font-weight:600;cursor:pointer;width:100%}' +
      '.jd-research-btn:disabled{opacity:.5;cursor:default}' +
      '.jd-research-progress{margin:12px 0;font-size:13px;color:#999}' +
      '.jd-research-step{padding:8px 12px;margin:6px 0;background:rgba(255,255,255,.04);border-radius:8px;font-size:13px}' +
      '.jd-research-step.done{border-left:3px solid #30d158}' +
      '.jd-research-step.active{border-left:3px solid #0a84ff}' +
      '.jd-research-result{margin-top:16px;padding:14px;background:rgba(255,255,255,.03);border-radius:12px;font-size:14px;line-height:1.6}' +
      '.jd-research-result h4{margin:0 0 8px;font-size:15px}' +
      '.jd-research-cite{font-size:12px;color:#0a84ff;margin-top:8px}' +
      'body.theme-light .jd-research-sheet{background:#fff;color:#111}' +
      'body.theme-light .jd-research-input{background:#f2f2f7;color:#111;border-color:#ddd}' +
      'body.theme-light .jd-research-step{background:rgba(0,0,0,.04)}';
    document.head.appendChild(st);
  }

  /* ---------------- sub-query generation ---------------- */
  function generateSubQueries(query) {
    // Generate 4 research angles from the main query
    var q = query.trim();
    return [
      q + ' overview and key facts',
      q + ' latest developments 2026',
      q + ' expert analysis and opinions',
      q + ' practical implications'
    ];
  }

  /* ---------------- parallel research ---------------- */
  async function researchQuery(subQuery) {
    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Research this thoroughly with web search and provide key findings with sources: ' + subQuery }],
          webSearch: true,
          stream: false
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      var data = await res.json();
      return {
        query: subQuery,
        answer: data.text || data.answer || data.content || JSON.stringify(data),
        sources: data.sources || data.citations || []
      };
    } catch (e) {
      return { query: subQuery, answer: '', error: String(e && e.message || e), sources: [] };
    }
  }

  /* ---------------- main API ---------------- */
  async function jdDeepResearch(query, onProgress) {
    ensureCss();
    var subQueries = generateSubQueries(query);
    var results = [];

    for (var i = 0; i < subQueries.length; i++) {
      if (onProgress) onProgress(i, subQueries.length, subQueries[i], 'active');
      var r = await researchQuery(subQueries[i]);
      results.push(r);
      if (onProgress) onProgress(i, subQueries.length, subQueries[i], 'done');
    }

    // Merge into structured report
    var report = '# Research: ' + query + '\n\n';
    var allSources = [];
    results.forEach(function (r, idx) {
      report += '## ' + (idx + 1) + '. ' + r.query + '\n\n';
      report += (r.answer || '*No results*') + '\n\n';
      (r.sources || []).forEach(function (s) {
        if (allSources.indexOf(s) === -1) allSources.push(s);
      });
    });
    if (allSources.length) {
      report += '## Sources\n\n';
      allSources.forEach(function (s, i) {
        report += (i + 1) + '. ' + s + '\n';
      });
    }

    return { query: query, report: report, results: results, sources: allSources };
  }

  /* ---------------- UI ---------------- */
  function openResearch() {
    ensureCss();
    closeResearch();

    var overlay = document.createElement('div');
    overlay.className = 'jd-research-modal';
    overlay.id = 'jdResearchModal';
    overlay.innerHTML =
      '<div class="jd-research-sheet">' +
      '<div class="jd-research-head"><h3>🔬 Deep Research</h3>' +
      '<button class="jd-research-close" id="jdResearchClose">×</button></div>' +
      '<div class="jd-research-body">' +
      '<input class="jd-research-input" id="jdResearchInput" placeholder="What do you want to research?">' +
      '<button class="jd-research-btn" id="jdResearchBtn">Start Research</button>' +
      '<div id="jdResearchProgress"></div>' +
      '<div id="jdResearchOutput"></div>' +
      '</div></div>';

    document.body.appendChild(overlay);

    document.getElementById('jdResearchClose').onclick = closeResearch;
    overlay.onclick = function (e) { if (e.target === overlay) closeResearch(); };
    document.addEventListener('keydown', escHandler);

    var btn = document.getElementById('jdResearchBtn');
    var input = document.getElementById('jdResearchInput');
    btn.onclick = async function () {
      var q = input.value.trim();
      if (!q) return;
      btn.disabled = true;
      btn.textContent = 'Researching...';
      var progEl = document.getElementById('jdResearchProgress');
      var outEl = document.getElementById('jdResearchOutput');
      progEl.innerHTML = '';
      outEl.innerHTML = '';

      try {
        var result = await jdDeepResearch(q, function (idx, total, query, status) {
          var steps = progEl.querySelectorAll('.jd-research-step');
          if (status === 'active') {
            var div = document.createElement('div');
            div.className = 'jd-research-step active';
            div.textContent = '⏳ ' + query;
            progEl.appendChild(div);
          } else {
            var last = progEl.querySelector('.jd-research-step.active');
            if (last) {
              last.className = 'jd-research-step done';
              last.textContent = '✅ ' + query;
            }
          }
        });

        // Render report (basic markdown)
        var html = '<div class="jd-research-result"><h4>📋 Research Report</h4>';
        html += escapeHtml(result.report)
          .replace(/^# (.+)$/gm, '<h4>$1</h4>')
          .replace(/^## (.+)$/gm, '<h4>$1</h4>')
          .replace(/\n/g, '<br>');
        html += '</div>';
        outEl.innerHTML = html;

        // Offer export
        if (window.jdExportArtifact) {
          var expBtn = document.createElement('button');
          expBtn.className = 'jd-research-btn';
          expBtn.style.marginTop = '12px';
          expBtn.textContent = '📄 Export as Document';
          expBtn.onclick = function () {
            window.jdExportArtifact('docx', 'Research - ' + q, result.report);
          };
          outEl.appendChild(expBtn);
        }
      } catch (e) {
        outEl.innerHTML = '<div class="jd-research-result">❌ Error: ' + escapeHtml(String(e)) + '</div>';
      }

      btn.disabled = false;
      btn.textContent = 'Start Research';
    };

    input.focus();
  }

  function escHandler(e) {
    if (e.key === 'Escape') closeResearch();
  }

  function closeResearch() {
    var m = document.getElementById('jdResearchModal');
    if (m) m.remove();
    document.removeEventListener('keydown', escHandler);
  }

  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  window.jdDeepResearch = jdDeepResearch;
  window.jdOpenResearch = openResearch;
})();
