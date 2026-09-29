import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../reactbits-micro.css',import.meta.url),'utf8');

assert(/\.ai-activity-row\.completed \.ai-activity-icon\{[^}]*color:var\(--rb-success\)/.test(css),
  'Successful activity markers must be green in every activity timeline');
assert(/\.ai-activity-row\.error \.ai-activity-icon\{[^}]*color:var\(--rb-error\)/.test(css),
  'Failed activity markers must remain visibly distinct');
assert(/\.jd-reconnect-card\{[^}]*bottom:var\(--jd-composer-clearance,calc\(var\(--jd-composer-height/.test(html),
  'Reconnect notice must use the measured composer clearance with a legacy fallback');
assert(/\.jd-reconnect-card\{[^}]*min-width:0[^}]*box-sizing:border-box/.test(html),
  'Reconnect notice must constrain content width on narrow screens');
assert(/\.jd-reconnect-message\{[^}]*min-width:0/.test(html),
  'Reconnect notice must use a dedicated shrinkable message column');
assert(/id="jdReconnectCardToggle"[^>]*onchange="setReconnectCardEnabled\(this\.checked\)"/.test(html),
  'Reconnect notice must remain controlled by its Settings toggle');
assert(/function syncReconnectCardPosition\(\)[\s\S]*?window\.innerHeight-rect\.top\+12[\s\S]*?--jd-composer-clearance/.test(html),
  "Reconnect notice must track the composer's real on-screen top edge");

console.log('PASS: successful activity markers stay green and reconnect notice remains compact and settings-controlled.');
