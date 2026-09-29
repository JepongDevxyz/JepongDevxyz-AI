import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync('index.html','utf8');
const css=readFileSync('reactbits-micro.css','utf8');

assert(/id="jdReconnectCardToggle"[^>]*onchange="setReconnectCardEnabled\(this\.checked\)"/.test(html),
  'Settings must expose an on/off toggle for the network reconnect card');
assert(/function isReconnectCardEnabled\(\)[\s\S]*?localStorage\.getItem\('jd_reconnect_card_enabled'\)[\s\S]*?!==\s*'false'/.test(html),
  'The reconnect card setting must persist and default to enabled');
assert(/function setReconnectCardEnabled\(enabled\)[\s\S]*?localStorage\.setItem\('jd_reconnect_card_enabled',JSON\.stringify\(checked\)\)[\s\S]*?jdReconnectRequested/.test(html),
  'Turning the card back on must restore a still-pending reconnect notice');
assert(/function setReconnectVisible\(show\)[\s\S]*?jdReconnectRequested=!!show[\s\S]*?isReconnectCardEnabled\(\)/.test(html),
  'The preference may hide the reconnect notice without disabling reconnect state');
assert(/id="jdReconnectCardToggle"[^<]*|id="jdReconnectCardToggle"/.test(html),
  'Reconnect setting control is missing');
assert(/function syncReconnectCardPosition\(\)[\s\S]*?--jd-composer-height/.test(html),
  'Reconnect card must position itself from the current composer height');
assert(/\.jd-reconnect-card\{[^}]*bottom:var\(--jd-composer-clearance,calc\(var\(--jd-composer-height/.test(html),
  'Reconnect notice must sit above the composer instead of covering the center of chat');
assert(/function syncReconnectCardPosition\(\)[\s\S]*?window\.innerHeight-rect\.top\+12[\s\S]*?--jd-composer-clearance/.test(html),
  'Reconnect notice must use the composer actual position after viewport changes');
assert(/\.thought-line__glyph\{[^}]*color:var\(--rb-success\)/.test(css),
  'The Thought Line sparkle marker must use the green status color');
assert(/\.thought-line__step-marker\{[^}]*color:var\(--rb-success\)/.test(css),
  'Completed and active Thought Line markers must use the green status color');
assert(/\.thought-line__step-marker--error\{color:var\(--rb-error\)\}/.test(css),
  'Failed activity markers must retain the error color');

console.log('PASS: reconnect card setting, composer-safe position, and green successful Thought Line markers.');
