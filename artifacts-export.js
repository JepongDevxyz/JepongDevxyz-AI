/* JepongDevxyz AI — Artifacts Export (v1)
   Export chat content / Spaces pages to XLSX, DOCX, PPTX, HTML.
   Usage: jdExportArtifact('xlsx'|'docx'|'pptx'|'html', title, content)
   content: string | string[] | array-of-arrays | array-of-objects
*/
(function () {
  'use strict';
  if (window.__jdArtifactsExport) return;
  window.__jdArtifactsExport = true;

  var SCRIPT_CACHE = {};

  /* ---------- tiny helpers ---------- */

  function sanitizeFilename(title, ext) {
    var t = String(title || 'artifact').trim() || 'artifact';
    // strip characters illegal in filenames on Win/macOS/Android
    t = t.replace(/[\\/:*?"<>|#%{}&]/g, '').replace(/\s+/g, ' ').trim();
    if (t.length > 80) t = t.slice(0, 80).trim();
    if (!t) t = 'artifact';
    return t + '.' + ext;
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (e) {}
      try { a.remove(); } catch (e2) {}
    }, 4000);
  }

  // Promise-based CDN script loader with per-key dedupe + fallback URLs
  function loadScript(key, urls) {
    if (SCRIPT_CACHE[key]) return SCRIPT_CACHE[key];
    SCRIPT_CACHE[key] = new Promise(function (resolve, reject) {
      var i = 0;
      function next() {
        if (i >= urls.length) {
          reject(new Error('Could not load library: ' + key));
          return;
        }
        var src = urls[i++];
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.crossOrigin = 'anonymous';
        s.onload = function () { resolve(true); };
        s.onerror = function () { next(); };
        document.head.appendChild(s);
      }
      next();
    });
    return SCRIPT_CACHE[key];
  }

  function toLines(content) {
    if (content == null) return [''];
    if (Array.isArray(content)) {
      return content.map(function (x) {
        if (x == null) return '';
        if (typeof x === 'object') {
          try { return JSON.stringify(x); } catch (e) { return String(x); }
        }
        return String(x);
      });
    }
    return String(content).split(/\r?\n/);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function notify(msg, isErr) {
    try {
      if (typeof window.jdToast === 'function') { window.jdToast(msg); return; }
    } catch (e) {}
    (isErr ? console.error : console.log)('[artifacts-export] ' + msg);
  }

  /* ---------- XLSX (SheetJS) ---------- */

  var XLSX_URLS = [
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
  ];

  function exportXlsx(title, content) {
    function build(XLSX) {
      var wb = XLSX.utils.book_new();
      var ws;
      if (Array.isArray(content) && content.length &&
          typeof content[0] === 'object' && content[0] !== null && !Array.isArray(content[0])) {
        // array of objects -> column headers from keys
        ws = XLSX.utils.json_to_sheet(content);
      } else if (Array.isArray(content)) {
        // array of arrays (or scalars) -> rows
        ws = XLSX.utils.aoa_to_sheet(content.map(function (r) {
          return Array.isArray(r) ? r : [r == null ? '' : r];
        }));
      } else {
        // plain string -> one line per row
        ws = XLSX.utils.aoa_to_sheet(toLines(content).map(function (l) { return [l]; }));
      }
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      var out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      downloadBlob(
        new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        sanitizeFilename(title, 'xlsx')
      );
      notify('Spreadsheet downloaded');
    }
    // Reuse SheetJS if index.html's lazy loader already fetched it
    if (window.XLSX) { build(window.XLSX); return Promise.resolve(); }
    return loadScript('xlsx', XLSX_URLS).then(function () {
      if (!window.XLSX) throw new Error('Spreadsheet library failed to load.');
      build(window.XLSX);
    });
  }

  /* ---------- DOCX ---------- */

  var DOCX_URLS = [
    'https://unpkg.com/docx@9.1.0/build/index.umd.js',
    'https://cdn.jsdelivr.net/npm/docx@9.1.0/build/index.umd.js'
  ];

  function exportDocx(title, content) {
    return loadScript('docx', DOCX_URLS).then(function () {
      var docx = window.docx;
      if (!docx || !docx.Document) throw new Error('DOCX library failed to load.');
      var children = [];
      toLines(content).forEach(function (raw) {
        var line = String(raw);
        var mH1 = /^#\s+(.*)/.exec(line);
        var mH2 = /^##\s+(.*)/.exec(line);
        if (mH1) {
          children.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: mH1[1], bold: true, size: 32 })],
            spacing: { after: 160 }
          }));
        } else if (mH2) {
          children.push(new docx.Paragraph({
            children: [new docx.TextRun({ text: mH2[1], bold: true, size: 26 })],
            spacing: { after: 120 }
          }));
        } else if (/^\s*[-*•]\s+/.test(line)) {
          children.push(new docx.Paragraph({
            children: [new docx.TextRun(line.replace(/^\s*[-*•]\s+/, ''))],
            bullet: { level: 0 },
            spacing: { after: 60 }
          }));
        } else if (!line.trim()) {
          children.push(new docx.Paragraph({ children: [new docx.TextRun('')] }));
        } else {
          children.push(new docx.Paragraph({
            children: [new docx.TextRun(line)],
            spacing: { after: 80 }
          }));
        }
      });
      if (!children.length) children.push(new docx.Paragraph(''));
      var doc = new docx.Document({
        sections: [{ properties: {}, children: children }]
      });
      return docx.Packer.toBlob(doc);
    }).then(function (blob) {
      downloadBlob(blob, sanitizeFilename(title, 'docx'));
      notify('Document downloaded');
    });
  }

  /* ---------- PPTX (PptxGenJS) ---------- */

  var PPTX_URLS = [
    'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js',
    'https://unpkg.com/pptxgenjs@3.12.0/dist/pptxgen.bundle.js'
  ];

  // content: string (slides split on blank lines) |
  //          string[] (one slide per entry) |
  //          {title, body|bullets}[]
  function slidesFrom(content) {
    var slides = [];
    if (Array.isArray(content) &&
        content.length && typeof content[0] === 'object' && content[0] !== null) {
      content.forEach(function (s) {
        var bullets = s.bullets || s.body || s.text || '';
        if (!Array.isArray(bullets)) bullets = toLines(bullets);
        slides.push({ title: String(s.title || ''), bullets: bullets });
      });
    } else {
      var parts;
      if (Array.isArray(content)) {
        parts = content.map(String);
      } else {
        parts = String(content == null ? '' : content).split(/\n\s*\n/);
      }
      parts.forEach(function (p) {
        var lines = toLines(p).filter(function (l) { return l.trim(); });
        if (!lines.length) return;
        var first = lines[0].replace(/^#\s*/, '');
        var isHeading = /^#\s+/.test(lines[0]) || lines.length === 1;
        slides.push({
          title: isHeading ? first : '',
          bullets: isHeading ? lines.slice(1) : lines
        });
      });
    }
    if (!slides.length) slides.push({ title: '', bullets: [] });
    return slides;
  }

  function exportPptx(title, content) {
    return loadScript('pptxgenjs', PPTX_URLS).then(function () {
      var PptxGenJS = window.PptxGenJS;
      if (!PptxGenJS) throw new Error('Presentation library failed to load.');
      var pptx = new PptxGenJS();
      pptx.author = 'JepongDevxyz AI';
      pptx.title = String(title || 'Presentation');
      slidesFrom(content).forEach(function (s) {
        var slide = pptx.addSlide();
        var y = 0.5;
        if (s.title) {
          slide.addText(s.title, {
            x: 0.5, y: y, w: 9, h: 1,
            fontSize: 32, bold: true, color: '111111'
          });
          y += 1.2;
        }
        if (s.bullets && s.bullets.length) {
          slide.addText(s.bullets.map(function (b) {
            return { text: String(b).replace(/^\s*[-*•]\s+/, ''), options: { bullet: true } };
          }), { x: 0.7, y: y, w: 8.6, h: 4.5, fontSize: 18, color: '333333', valign: 'top' });
        }
      });
      return pptx.writeFile({ fileName: sanitizeFilename(title, 'pptx') });
    }).then(function () {
      notify('Presentation downloaded');
    });
  }

  /* ---------- HTML ---------- */

  function exportHtml(title, content) {
    var safeTitle = escapeHtml(String(title || 'Document'));
    var body = toLines(content).map(function (raw) {
      var line = String(raw);
      var mH1 = /^#\s+(.*)/.exec(line);
      var mH2 = /^##\s+(.*)/.exec(line);
      if (mH1) return '<h1>' + escapeHtml(mH1[1]) + '</h1>';
      if (mH2) return '<h2>' + escapeHtml(mH2[1]) + '</h2>';
      if (/^\s*[-*•]\s+/.test(line)) {
        return '<li>' + escapeHtml(line.replace(/^\s*[-*•]\s+/, '')) + '</li>';
      }
      if (!line.trim()) return '';
      // wrap consecutive list items in <ul>
      return '<p>' + escapeHtml(line) + '</p>';
    }).join('\n')
      // group consecutive <li> into <ul>
      .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>\n$1</ul>\n');

    var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + safeTitle + '</title>\n<style>\n' +
      'body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;' +
      'max-width:760px;margin:0 auto;padding:32px 20px;color:#1a1a1a;line-height:1.65;background:#fff}\n' +
      'h1{font-size:1.8rem;border-bottom:2px solid #eee;padding-bottom:.4rem}\n' +
      'h2{font-size:1.35rem;color:#333}\n' +
      'p{margin:.7em 0}\n' +
      'ul{margin:.7em 0;padding-left:1.4em}\n' +
      'li{margin:.3em 0}\n' +
      'footer{margin-top:2.5rem;padding-top:1rem;border-top:1px solid #eee;' +
      'font-size:.75rem;color:#999;text-align:center}\n' +
      '@media(prefers-color-scheme:dark){body{background:#111;color:#e8e8e8}' +
      'h2{color:#ccc}footer{border-color:#333}}\n' +
      '</style>\n</head>\n<body>\n<h1>' + safeTitle + '</h1>\n' + body +
      '\n<footer>Exported from JepongDevxyz AI</footer>\n</body>\n</html>';

    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }),
      sanitizeFilename(title, 'html'));
    notify('HTML document downloaded');
    return Promise.resolve();
  }

  /* ---------- public API ---------- */

  function jdExportArtifact(type, title, content) {
    type = String(type == null ? '' : type).toLowerCase().trim();
    var p;
    try {
      switch (type) {
        case 'xlsx': p = exportXlsx(title, content); break;
        case 'docx': p = exportDocx(title, content); break;
        case 'pptx': p = exportPptx(title, content); break;
        case 'html': p = exportHtml(title, content); break;
        default:
          p = Promise.reject(new Error(
            'Unsupported export type "' + type + '". Use xlsx, docx, pptx, or html.'));
      }
    } catch (e) {
      p = Promise.reject(e);
    }
    return p.catch(function (e) {
      notify('Export failed: ' + (e && e.message ? e.message : e), true);
      throw e;
    });
  }
  jdExportArtifact.types = ['xlsx', 'docx', 'pptx', 'html'];

  window.jdExportArtifact = jdExportArtifact;
})();
