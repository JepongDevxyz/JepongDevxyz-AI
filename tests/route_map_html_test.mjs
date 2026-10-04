import assert from 'node:assert/strict';
import {buildRouteMapHtml} from '../lib/tools/geo.js';

const html=buildRouteMapHtml({
  fromName:'Guimba, Nueva Ecija, Philippines',
  toName:'Baguio, Cordillera Administrative Region, Philippines',
  distanceKm:123.3,
  durationText:'2 h 13 min',
  geometry:{type:'LineString',coordinates:[[120.7,15.6],[120.8,16.4]]}
});

assert.match(html,/class="route-summary"/,
  'route metadata should occupy a dedicated flexible summary column');
assert.match(html,/grid-template-columns:minmax\(0,1fr\)/,
  'narrow maps should move attribution onto its own row');
assert.match(html,/\.bar\{[^}]*height:auto/,
  'the map header must grow to fit wrapped route details instead of clipping them');
assert.match(html,/\.brand\{[^}]*line-height:/,
  'attribution text needs its own line spacing');
assert.doesNotMatch(html,/Open driving directions in Google Maps/,
  'the map page should not reintroduce the removed duplicate directions link');

console.log('PASS: route-map header wraps cleanly on narrow screens');
