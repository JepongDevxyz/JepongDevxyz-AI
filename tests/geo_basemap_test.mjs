import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../geo.js',import.meta.url),'utf8');
const {buildRouteMapHtml,buildRadarMapHtml}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

const route=buildRouteMapHtml({fromName:'Guimba',toName:'Baguio',distanceKm:123,durationText:'2 h',geometry:{coordinates:[[120.8,15.7],[120.6,16.4]]}});
const radar=buildRadarMapHtml({placeName:'Baguio',condition:'Maulap',temperatureC:20,lat:16.4,lon:120.6});
for(const html of [route,radar]){
  assert.match(html,/https:\/\/[abc]\.tile\.opentopomap\.org\/\{z\}\/\{x\}\/\{y\}\.png/,
    'generated maps must request a usable street/topographic basemap');
  assert.match(html,/OpenTopoMap \(CC-BY-SA\)/,
    'the tile provider attribution must remain visible in Leaflet');
  assert.doesNotMatch(html,/tile\.openstreetmap\.org/,
    'blocked OpenStreetMap tile server must not be requested');
}
assert.match(route,/L\.polyline\(pts/,'route line remains interactive');
console.log('PASS: route and radar maps use the licensed basemap with attribution');
