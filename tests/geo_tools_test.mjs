/* JepongDevxyz AI — geo tools tests (mocked network, no real HTTP). */
import assert from 'node:assert/strict';
import {
  geocodePlace, getRoute, getWeather, getRadarTileUrl,
  buildRouteMapHtml, buildRadarMapHtml,
  wmoFilipino, isStormy, shortPlace, formatDuration, slugify,
} from '../lib/tools/geo.js';
import { executeUnifiedTool } from '../lib/tools/index.js';

function mockFetch(routes) {
  return async (url, _opts) => {
    const u = String(url);
    for (const [match, body, ok = true] of routes) {
      if (u.includes(match)) {
        return { ok, status: ok ? 200 : 500, json: async () => body };
      }
    }
    throw new Error('unexpected url: ' + u);
  };
}

const GEO = mockFetch([
  ['nominatim.openstreetmap.org', [{ display_name: 'Guimba, Nueva Ecija, Central Luzon, Philippines', lat: '15.66', lon: '120.77' }]],
  ['router.project-osrm.org', { routes: [{ distance: 185400, duration: 15120, geometry: { type: 'LineString', coordinates: [[120.59, 16.41], [120.77, 15.66]] } }] }],
  ['api.open-meteo.com', { current: { temperature_2m: 28.4, relative_humidity_2m: 89, precipitation: 12.4, weather_code: 65, wind_speed_10m: 22 } }],
  ['api.rainviewer.com', { radar: { past: [{ time: 1, path: '/v2/radar/1' }], nowcast: [{ time: 2, path: '/v2/radar/2' }] } }],
]);

// geocode
const g = await geocodePlace('Guimba', GEO);
assert.strictEqual(g.lat, 15.66);
assert.ok(g.name.includes('Guimba'));
assert.strictEqual(await geocodePlace('   ', GEO), null);

// route
const r = await getRoute({ lat: 16.41, lon: 120.59 }, { lat: 15.66, lon: 120.77 }, GEO);
assert.strictEqual(r.distanceKm, 185.4);
assert.strictEqual(r.durationText, '4 h 12 min');
assert.strictEqual(r.geometry.coordinates.length, 2);
assert.strictEqual(formatDuration(1500), '25 min');
assert.strictEqual(formatDuration(3600), '1 h');

// weather
const w = await getWeather(15.66, 120.77, GEO);
assert.strictEqual(w.temperatureC, 28.4);
assert.strictEqual(w.condition, 'Malakas na pag-ulan');
assert.strictEqual(w.stormy, true);
assert.strictEqual(wmoFilipino(0), 'Maaliwalas');
assert.strictEqual(wmoFilipino(95), 'Pagkidlat at pagkulog');
assert.strictEqual(isStormy(0, 0), false);
assert.strictEqual(isStormy(3, 15), true);

// radar
const radar = await getRadarTileUrl(GEO);
assert.ok(radar.includes('tilecache.rainviewer.com/v2/radar/2'), 'uses latest frame');

// html builders
const routeHtml = buildRouteMapHtml({
  fromName: 'Baguio City', toName: 'Guimba, Nueva Ecija',
  distanceKm: 185.4, durationText: '4 h 12 min',
  geometry: { type: 'LineString', coordinates: [[120.59, 16.41], [120.77, 15.66]] },
});
assert.ok(routeHtml.includes('leaflet'), 'leaflet included');
assert.ok(routeHtml.includes('L.polyline'), 'route drawn');
assert.ok(routeHtml.includes('185.4'), 'distance shown');

const radarHtml = buildRadarMapHtml({
  placeName: 'Guimba', condition: 'Malakas na pag-ulan', temperatureC: 28.4,
  radarTileUrl: radar, lat: 15.66, lon: 120.77,
});
assert.ok(radarHtml.includes('tilecache.rainviewer.com'), 'radar overlay');
assert.ok(radarHtml.includes('Himawari_AHI_Band13_Clean_Infrared'), 'satellite layer is available inside the map');
assert.ok(radarHtml.includes('L.control.layers'), 'map offers an in-place radar/satellite layer switch');
assert.ok(radarHtml.includes('jd-map-document'), 'generated map is marked for safe in-chat embedding');
assert.ok(radarHtml.includes('28.4°C'), 'temp shown');

// escaping
const evil = buildRadarMapHtml({ placeName: '<script>alert(1)</script>', condition: 'x', temperatureC: 1, radarTileUrl: null, lat: 0, lon: 0 });
assert.ok(!evil.includes('<script>alert(1)</script>'), 'place name escaped');

// shortPlace / slugify
assert.strictEqual(shortPlace('Guimba, Nueva Ecija, Central Luzon, Philippines'), 'Guimba, Nueva Ecija, Philippines');
assert.strictEqual(slugify('Baguio City!'), 'baguio-city');

console.log('PASS: geo unit');

// executor end-to-end (mocked fetch + mocked upload)
const fakeUpload = async ({ filename, mimeType }) => {
  assert.ok(filename.endsWith('.html'));
  assert.strictEqual(mimeType, 'text/html');
  return { ok: true, url: 'https://blob.test/' + filename };
};
const d = await executeUnifiedTool(
  { name: 'get_directions', args: { from: 'Baguio City', to: 'Guimba' } },
  { fetchImpl: GEO, uploadSharedFile: fakeUpload }
);
assert.strictEqual(d.ok, true);
assert.strictEqual(d.distance_km, 185.4);
assert.strictEqual(d.duration, '4 h 12 min');
assert.ok(d.map_url.startsWith('https://blob.test/route-'), 'route map uploaded');
assert.ok(d.directions_url.includes('google.com/maps/dir'), 'directions link');

const ww = await executeUnifiedTool(
  { name: 'get_weather', args: { place: 'Guimba' } },
  { fetchImpl: GEO, uploadSharedFile: fakeUpload }
);
assert.strictEqual(ww.ok, true);
assert.strictEqual(ww.condition, 'Malakas na pag-ulan');
assert.strictEqual(ww.stormy, true);
assert.ok(ww.radar_map_url.startsWith('https://blob.test/weather-'), 'radar map uploaded');

// failures
const dNoGeo = await executeUnifiedTool(
  { name: 'get_directions', args: { from: 'Baguio', to: 'Guimba' } },
  { fetchImpl: mockFetch([]) }
);
assert.strictEqual(dNoGeo.ok, false);
const wNoPlace = await executeUnifiedTool({ name: 'get_weather', args: { place: '' } }, {});
assert.strictEqual(wNoPlace.ok, false);

console.log('PASS: geo executor');
console.log('ALL GEO TOOL TESTS PASS');
