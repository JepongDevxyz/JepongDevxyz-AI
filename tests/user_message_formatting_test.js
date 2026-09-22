const fs=require('fs');
const html=fs.readFileSync('index.html','utf8');
function assert(ok,msg){if(!ok)throw new Error(msg);}
assert(/\.user-bubble-body\s*\{[\s\S]*?white-space:pre-wrap!important;[\s\S]*?\}/.test(html),'sent user bubbles must preserve composer line breaks');
assert(html.includes("const message = input.value.trim();"),'send path must keep textarea text rather than flattening whitespace');
assert(html.includes('${escapeHTML(message)}${fileHTML}'),'send renderer must escape text without whitespace normalization');
assert(html.includes('${escapeHTML(msg.text)}'),'history renderer must preserve stored user text');
console.log('PASS composer formatting preserved in sent and restored user messages');
