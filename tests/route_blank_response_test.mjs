import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {extractRouteRequest,buildNativeDirectionsAppendix} from '../api/location-tools.js';

assert.deepEqual(extractRouteRequest('Ipakita ang mapa at ruta mula Guimba, Nueva Ecija papuntang Baguio City.'),{
  origin:'Guimba, Nueva Ecija',destination:'Baguio City',travelMode:'driving'
});
const native={ok:true,from:'Guimba',to:'Baguio',distance_km:185,duration:'4 h 12 min',map_url:'data:text/html;base64,ZmFrZQ=='};
const appendix=buildNativeDirectionsAppendix(native);
assert.match(appendix,/Guimba.*Baguio/);
assert.match(appendix,/185 km/);
assert.match(appendix,/4 h 12 min/);
assert.match(appendix,/View route map inside the chat/);
const blockedBlob=buildNativeDirectionsAppendix({...native,map_url:'https://example.blob.vercel-storage.com/route-map.html'});
assert.match(blockedBlob,/Open driving directions in Google Maps/);
assert.doesNotMatch(blockedBlob,/View route map inside the chat/);
assert.equal(buildNativeDirectionsAppendix({ok:false,error:'unavailable'}),'');
const stream=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
assert.match(stream,/if\(call\.name==='get_directions'&&toolResult\.ok&&!result\.locationToolAppendix\)/);
assert.match(stream,/nativeDirectionsAppendix=buildNativeDirectionsAppendix\(toolResult\)/);
assert.match(stream,/generatedText\+=addition;\s*send\('text',\{text:addition\}\);/);
console.log('route blank response regression passed');
