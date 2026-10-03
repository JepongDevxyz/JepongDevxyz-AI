// Test api/dictionary.js dispatch logic (mock webCompatible + env)
const fs = require('fs');
let pass = 0, fail = 0;
function assert(c, n) { if (c) { pass++; console.log('  ok:', n); } else { fail++; console.log('  FAIL:', n); } }

process.env.MW_API_KEY = 'server-key-abc';
let mwCalls = 0;
global.fetch = async (url) => {
  mwCalls++;
  assert(String(url).includes('key=server-key-abc'), 'server key used in MW call');
  return { ok: true, json: async () => [{ meta: { id: 'hi:1' }, hwi: { hw: 'hi' }, fl: 'interjection', shortdef: ['hello'] }] };
};
global.Response = { json: (data, init) => ({ data, status: (init && init.status) || 200 }) };

// Stub the bridge import by evaluating with a module loader hack
const Module = require('module');
const origResolve = Module._resolveFilename;
const code = fs.readFileSync('/tmp/jai-react2/api/dictionary.js', 'utf8')
  .replace("import { webCompatible } from './_node_web_bridge.js';", "const webCompatible = (req,res,fn)=>fn(req);");

const m = new Module('dict-test', null);
m._compile(code, '/tmp/jai-react2/api/dictionary.js');

(async () => {
  const handler = m.exports.default;
  // status check
  let r = await handler({ url: 'http://x/api/dictionary' }, {});
  assert(r.data.hasKey === true, 'status: hasKey true');
  // word lookup
  r = await handler({ url: 'http://x/api/dictionary?word=hello' }, {});
  assert(r.status === 200 && r.data.source === 'mw', 'word lookup returns mw data');
  assert(mwCalls === 1, 'MW called once');
  // cached second call
  r = await handler({ url: 'http://x/api/dictionary?word=hello' }, {});
  assert(r.data.cached === true && mwCalls === 1, 'second call served from cache (quota saved)');
  // invalid word
  r = await handler({ url: 'http://x/api/dictionary?word=!!!' }, {});
  assert(r.status === 400, 'invalid word rejected');

  // no key (via temp file require to avoid _compile ESM quirks)
  delete process.env.MW_API_KEY;
  let codeNoKey = fs.readFileSync('/tmp/jai-react2/api/dictionary.js', 'utf8')
    .replace("import { webCompatible } from './_node_web_bridge.js';", "")
    .replace('export default (req, res) => webCompatible(req, res, dispatch);', 'module.exports = { dispatch };')
    .replace("process.env.MW_API_KEY || ''", "''");
  fs.writeFileSync('/tmp/dict_nokey_test.cjs', codeNoKey);
  delete require.cache['/tmp/dict_nokey_test.cjs'];
  const m2 = require('/tmp/dict_nokey_test.cjs');
  let fetchCalled = false;
  const savedFetch = global.fetch;
  global.fetch = async () => { fetchCalled = true; return { ok: true, json: async () => [] }; };
  r = await m2.dispatch({ url: 'http://x/api/dictionary?word=hi' });
  global.fetch = savedFetch;
  assert(r.status === 501 && r.data.error === 'no-key', 'no key -> 501 (client falls back)');
  assert(!fetchCalled, 'no MW fetch when no key');

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
