/* =========================================================
   JepongDevxyz AI — geo tools (server side)
   Free, keyless data sources only:
     - Nominatim (OpenStreetMap) : place -> coordinates
     - OSRM public server        : driving route + time
     - Open-Meteo                : current weather
     - RainViewer                : live radar/satellite tiles
   Pure functions; fetch is injectable for tests. The chat API
   uploads the generated Leaflet map pages through the existing
   share_file Blob pipeline, so every model on every provider
   hands the user the same interactive map link.
   ========================================================= */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const RAINVIEWER_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const UA = { 'User-Agent': 'JepongDevxyz-AI/1.0 (chat map tools)' };

function withTimeout(ms = 8000) {
  return AbortSignal.timeout(ms);
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* JSON string safe to embed inside an HTML <script> block. */
function jsStr(s) {
  return JSON.stringify(String(s ?? '')).replace(/<\//g, '<\\/');
}

/* Shorten a Nominatim display_name to "Town, Province/State, Country". */
export function shortPlace(displayName) {
  const parts = String(displayName || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return 'ang lugar';
  if (parts.length <= 3) return parts.join(', ');
  return [parts[0], parts[1], parts[parts.length - 1]].join(', ');
}

export function slugify(s) {
  return String(s || 'map')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'map';
}

/* Geocode a place name -> { name, lat, lon } | null
   Includes in-memory cache (5 min TTL) to speed up repeat queries. */
const _geoCache = new Map();
const GEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function geocodePlace(query, fetchImpl = fetch) {
  const q = String(query || '').trim().slice(0, 200);
  if (!q) return null;

  // Check cache first
  const cacheKey = q.toLowerCase();
  const cached = _geoCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < GEO_CACHE_TTL) {
    return cached.data;
  }

  const url = NOMINATIM_URL + '?format=json&limit=1&q=' + encodeURIComponent(q);
  const res = await fetchImpl(url, { headers: UA, signal: withTimeout() });
  if (!res.ok) return null;
  const arr = await res.json();
  const hit = Array.isArray(arr) ? arr[0] : null;
  if (!hit || hit.lat == null || hit.lon == null) return null;
  const result = { name: String(hit.display_name || q).slice(0, 160), lat: Number(hit.lat), lon: Number(hit.lon) };

  // Cache the result
  _geoCache.set(cacheKey, { data: result, ts: Date.now() });
  // Prevent unbounded growth
  if (_geoCache.size > 200) {
    const firstKey = _geoCache.keys().next().value;
    _geoCache.delete(firstKey);
  }

  return result;
}

/* Driving route between two coordinates -> { distanceKm, durationText, geometry } | null */
export async function getRoute(from, to, fetchImpl = fetch) {
  const url =
    OSRM_URL + '/' + from.lon + ',' + from.lat + ';' + to.lon + ',' + to.lat +
    '?overview=full&geometries=geojson';
  const res = await fetchImpl(url, { signal: withTimeout(10000) });
  if (!res.ok) return null;
  const data = await res.json();
  const route = data && Array.isArray(data.routes) ? data.routes[0] : null;
  if (!route) return null;
  return {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationText: formatDuration(route.duration),
    geometry: route.geometry,
  };
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h <= 0) return m + ' min';
  return h + ' h' + (m ? ' ' + m + ' min' : '');
}

/* WMO weather code -> Filipino description */
export function wmoFilipino(code) {
  const c = Number(code);
  if (c === 0) return 'Maaliwalas';
  if (c === 1) return 'Bahagyang maulap';
  if (c === 2) return 'Medyo maulap';
  if (c === 3) return 'Maulap';
  if (c === 45 || c === 48) return 'Maulap na may hamog';
  if (c === 51 || c === 53 || c === 55) return 'Mahinang ambon';
  if (c === 56 || c === 57) return 'Nagyeyelong ambon';
  if (c === 61) return 'Mahinang ulan';
  if (c === 63) return 'Katamtamang ulan';
  if (c === 65) return 'Malakas na pag-ulan';
  if (c === 66 || c === 67) return 'Nagyeyelong ulan';
  if (c === 71 || c === 73 || c === 75 || c === 77 || c === 85 || c === 86) return 'Niyebe';
  if (c === 80) return 'Mahinang pag-ulan';
  if (c === 81) return 'Katamtamang pag-ulan';
  if (c === 82) return 'Malakas na pag-ulan';
  if (c === 95) return 'Pagkidlat at pagkulog';
  if (c === 96 || c === 99) return 'Malakas na bagyo na may pagkulog';
  return 'Hindi matukoy';
}

export function isStormy(code, precipMm) {
  const c = Number(code);
  return c >= 95 || c === 65 || c === 82 || Number(precipMm) >= 10;
}

/* Current weather at coordinates */
export async function getWeather(lat, lon, fetchImpl = fetch) {
  const url =
    OPEN_METEO_URL + '?latitude=' + lat + '&longitude=' + lon +
    '&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&timezone=auto';
  const res = await fetchImpl(url, { signal: withTimeout() });
  if (!res.ok) return null;
  const data = await res.json();
  const cur = data && data.current;
  if (!cur) return null;
  const code = Number(cur.weather_code);
  const precip = Number(cur.precipitation ?? 0);
  return {
    temperatureC: Math.round(Number(cur.temperature_2m) * 10) / 10,
    condition: wmoFilipino(code),
    weatherCode: code,
    precipitationMm: precip,
    humidity: Math.round(Number(cur.relative_humidity_2m)),
    windKph: Math.round(Number(cur.wind_speed_10m) * 10) / 10,
    stormy: isStormy(code, precip),
  };
}

/* Latest RainViewer radar tile URL template (or null) */
export async function getRadarTileUrl(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(RAINVIEWER_URL, { signal: withTimeout() });
    if (!res.ok) return null;
    const data = await res.json();
    const radar = data && data.radar;
    const frames = [].concat(radar?.past || [], radar?.nowcast || []);
    const last = frames[frames.length - 1];
    if (!last || !last.path) return null;
    return 'https://tilecache.rainviewer.com' + last.path + '/256/{z}/{x}/{y}/2/1_1.png';
  } catch {
    return null;
  }
}

const LEAFLET_HEAD =
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="jd-map-document" content="v1">' +
  '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">' +
  '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>' +
  '<style>html,body{margin:0;height:100%;font-family:system-ui,sans-serif;overflow:hidden}' +
  'body{display:flex;flex-direction:column}' +
  '#map{flex:1 1 0;min-height:0;width:100%}' +
  '.bar{box-sizing:border-box;min-height:64px;height:auto;display:flex;flex-direction:column;align-items:stretch;gap:7px;padding:12px 14px;background:#0b0f19;color:#fff;font-size:14px;line-height:1.4}' +
  '.route-summary{display:flex;flex-direction:column;gap:5px;min-width:0;overflow-wrap:anywhere}' +
  '.route-names{display:block;min-width:0;overflow-wrap:anywhere}' +
  '.route-meta{display:flex;flex-wrap:wrap;gap:4px 9px;min-width:0;color:#f8fafc}' +
  '.bar b{color:#ffd75e}.brand{margin:0;max-width:none;font-size:11px;line-height:1.35;overflow-wrap:anywhere;opacity:.7}' +
  '@media(max-width:520px){.bar{gap:6px;padding:11px 12px;font-size:14px}.brand{font-size:11px}}</style>';

/* Interactive route map page (Leaflet). geometry = GeoJSON LineString. */
export function buildRouteMapHtml({ fromName, toName, distanceKm, durationText, geometry }) {
  const coords = geometry && Array.isArray(geometry.coordinates) ? geometry.coordinates : [];
  // Simplify: keep max 200 points to keep the HTML small for slow networks.
  // Take every Nth point to preserve the route shape.
  let simplified = coords;
  if (coords.length > 200) {
    const step = Math.ceil(coords.length / 200);
    simplified = coords.filter((_, i) => i % step === 0 || i === coords.length - 1);
  }
  const latlngs = simplified.map(([lng, lat]) => [lat, lng]);
  const mid = latlngs.length
    ? latlngs[Math.floor(latlngs.length / 2)]
    : [14.5995, 120.9842];
  const html =
    '<!doctype html><html><head><meta charset="utf-8">' + LEAFLET_HEAD +
    '<title>' + esc(fromName) + ' papuntang ' + esc(toName) + '</title></head><body>' +
    '<div class="bar"><div class="route-summary"><span class="route-names"><b>' + esc(fromName) + '</b> papuntang <b>' + esc(toName) + '</b></span>' +
    '<span class="route-meta"><span>' + esc(distanceKm) + ' km</span><span>' + esc(durationText) + '</span></span></div>' +
    '<span class="brand">Powered by Jepong Devxyz</span></div>' +
    '<div id="map"></div>' +
    '<script>' +
    'var map=L.map("map").setView([' + mid[0] + ',' + mid[1] + '],10);' +
    'L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",' +
    '{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(map);' +
    'var pts=' + JSON.stringify(latlngs) + ';' +
    'if(pts.length){' +
    'var line=L.polyline(pts,{color:"#2563eb",weight:5,opacity:.9}).addTo(map);' +
    'L.marker(pts[0]).addTo(map).bindPopup(' + jsStr('Simula: ' + fromName) + ').openPopup();' +
    'L.marker(pts[pts.length-1]).addTo(map).bindPopup(' + jsStr('Dulo: ' + toName) + ');' +
    'map.fitBounds(line.getBounds().pad(0.15));' +
    '}' +
    '<\/script></body></html>';
  return html;
}

/* Interactive radar/satellite map page (Leaflet + RainViewer overlay). */
export function buildRadarMapHtml({ placeName, condition, temperatureC, radarTileUrl, lat, lon, satelliteDate = new Date().toISOString().slice(0, 10) }) {
  const radarLayerJs = radarTileUrl
    ? 'var radar=L.tileLayer(' + JSON.stringify(radarTileUrl) + ',{opacity:0.65,maxZoom:12,attribution:"Radar: RainViewer"});'
    : 'var radar=null;';
  const satelliteUrl = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/Himawari_AHI_Band13_Clean_Infrared/default/' +
    encodeURIComponent(String(satelliteDate).slice(0, 10)) + '/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png';
  const html =
    '<!doctype html><html><head><meta charset="utf-8">' + LEAFLET_HEAD +
    '<title>Panahon sa ' + esc(placeName) + '</title></head><body>' +
    '<div class="bar"><span><b>' + esc(placeName) + '</b> &nbsp;•&nbsp; ' + esc(condition) +
    ' &nbsp;•&nbsp; ' + esc(temperatureC) + '°C</span>' +
    '<span class="brand">Powered by Jepong Devxyz</span></div>' +
    '<div id="map"></div>' +
    '<script>' +
    'var map=L.map("map").setView([' + lat + ',' + lon + '],8);' +
    'var street=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",' +
    '{maxZoom:19,attribution:"© OpenStreetMap contributors"}).addTo(map);' +
    'var satellite=L.tileLayer(' + JSON.stringify(satelliteUrl) +
    ',{maxNativeZoom:9,maxZoom:12,attribution:"Satellite: NASA GIBS / Himawari"});' +
    radarLayerJs +
    'var bases={"Street map":street,"Himawari satellite":satellite};' +
    'var overlays={};if(radar){radar.addTo(map);overlays["RainViewer radar"]=radar;}' +
    'L.control.layers(bases,overlays,{collapsed:false}).addTo(map);' +
    'L.marker([' + lat + ',' + lon + ']).addTo(map).bindPopup(' +
    jsStr(placeName + ' — ' + condition) + ').openPopup();' +
    '<\/script></body></html>';
  return html;
}
