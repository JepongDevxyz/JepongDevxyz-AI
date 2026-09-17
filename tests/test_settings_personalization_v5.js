const fs=require('fs'); const h=fs.readFileSync(__dirname+'/../index.html','utf8');
function ok(v,m){if(!v){console.error('FAIL:',m);process.exit(1)}}
ok(/#speechSettingsGroup\s*\{[^}]*display\s*:\s*none\s*!important/s.test(h),'legacy speech controls must be force-hidden outside Voice page');
ok(/\.personalization-modal\.ps-reference-ui\s*\{[^}]*overflow\s*:\s*hidden/s.test(h),'personalization shell must clip child overflow');
ok(/#personalizationContent\s*\{[^}]*overflow-y\s*:\s*auto\s*!important/s.test(h),'personalization content must own vertical scrolling');
ok(/#psStyleSection\s*\.ps-ref-row\s*\{[^}]*grid-template-columns\s*:\s*minmax\(0,1fr\)\s+minmax\(96px,auto\)/s.test(h),'personalization rows need stable label/value columns');
ok(/#psStyleSection\s*\.ps-ref-choice\s*\{[^}]*white-space\s*:\s*nowrap/s.test(h),'personalization choices must not wrap');
console.log('PASS settings/personalization v5');
