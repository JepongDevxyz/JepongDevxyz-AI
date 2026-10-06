import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildInlineMapDataUrl,buildRouteMapContext} from '../api/location-tools.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const api=readFileSync(new URL('../api/chat.js',import.meta.url),'utf8');
const mapEmbed=readFileSync(new URL('../map-autoembed.js',import.meta.url),'utf8');
const promptStart=html.indexOf('function isCurrentLocationWeatherPrompt(');
const promptEnd=html.indexOf('\n        function requestPreciseLocationForWeather(',promptStart);
const geoStart=promptEnd;
const geoEnd=html.indexOf('\n        async function sendMessage()',geoStart);
assert(promptStart>=0&&promptEnd>promptStart&&geoEnd>geoStart,'the location permission helpers must be installed before sending messages');
const locationPrompt=new Function(html.slice(promptStart,promptEnd)+'\nreturn isCurrentLocationWeatherPrompt;')();
assert.equal(locationPrompt('Weather near me'),true);
assert.equal(locationPrompt('Anong panahon dito sa location ko?'),true);
assert.equal(locationPrompt('What is the weather in Guimba?'),false,'named places must not trigger a GPS permission prompt');
assert.equal(locationPrompt('How do I get from Guimba to Baguio?'),false,'route lookups must not request the user’s location');
const geoSource=html.slice(geoStart,geoEnd);
assert.match(geoSource,/enableHighAccuracy:true,maximumAge:60000,timeout:10000/);
assert.match(geoSource,/error\?\.code===1\?'permission-denied'/);
assert.match(html,/isCurrentLocationWeatherPrompt\(message\)[\s\S]{0,180}\?requestPreciseLocationForWeather\(\):null/,
  'the browser must request location directly from the user send action');
assert.match(html,/currentLocation: currentLocationFix \|\| undefined/);
assert.match(html,/currentLocationError: currentLocationError \|\| undefined/);
assert(!/localStorage\.(?:setItem|getItem)\([^\n]*(?:currentLocation|weatherLocation)/i.test(html),
  'precise device coordinates must not be persisted in browser storage');

assert.match(api,/detectLocationWeatherIntent\(message\)/);
assert.match(api,/fetchLiveWeather\(\{location:locationFix,place,timeoutMs:fastAnswers\?4500:6500\}\)/);
assert.match(api,/normalizeClientLocation\(body\.currentLocation\)/);
assert.match(api,/\[CURRENT-LOCATION WEATHER TOOL — unavailable\]/);
assert.match(api,/buildRouteMapContext\\(routeRequest,routeMapUrl,calculatedRoute\\)/,
  'chat route handling must pass the calculated route context from the location helper');
const routeRequest={origin:'Guimba',destination:'Baguio',travelMode:'driving'};
const generatedRouteContext=buildRouteMapContext(routeRequest,'data:text/html;base64,ZmFrZQ==',{distanceKm:185,durationText:'4 h 12 min'});
assert.match(generatedRouteContext,/A route was calculated and an interactive map is automatically embedded in the response/);
assert.match(generatedRouteContext,/Driving distance: 185 km/);
assert.match(generatedRouteContext,/Estimated drive time from the routing service: 4 h 12 min/);
assert.doesNotMatch(generatedRouteContext,/Google Maps directions URL|click here/i,
  'a verified in-chat map must not suggest a redundant external map action');
const fallbackRouteContext=buildRouteMapContext(routeRequest,'',null);
assert.match(fallbackRouteContext,/The interactive route service did not return a route/);
assert.match(fallbackRouteContext,/Google Maps directions URL:/);
assert.match(fallbackRouteContext,/Do not invent distance or ETA/);
assert.doesNotMatch(fallbackRouteContext,/Driving distance:|Estimated drive time/,
  'a missing route must not invent distance or ETA');
assert.match(api,/const locationToolAppendix=String\(result\.locationToolAppendix\|\|''\)\.trim\(\)/);
assert.match(api,/buildRouteMapHtml\(/);
assert.match(api,/buildRadarMapHtml\(/);
assert.match(api,/inlineMapPageUrl\(mapHtml\)/);
assert.doesNotMatch(api,/uploadInlineMapPage\(/,'generated map pages must not be served from Vercel Blob');
const generatedMap='<!doctype html><meta name="jd-map-document" content="v1"><div id="map"></div>';
const inlineMap=buildInlineMapDataUrl(generatedMap);
assert.ok(inlineMap.startsWith('data:text/html;base64,'));
assert.equal(Buffer.from(inlineMap.split(',')[1],'base64').toString(),generatedMap);
assert.equal(buildInlineMapDataUrl('x'.repeat(110001)),'','oversized documents must fail closed rather than produce a blank embed');
assert.match(html,/safeDataMap/);
assert.match(mapEmbed,/setAttribute\('sandbox',\s*'allow-scripts'\)/);
assert.match(mapEmbed,/jd-map-document/);

console.log('PASS: user-triggered GPS permission, no coordinate persistence, and model-neutral location/map context');
