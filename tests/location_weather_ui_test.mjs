import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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
assert.match(api,/A route was calculated by the routing service and an interactive route map was generated/);
assert.match(api,/The interactive route service did not return a route/);
assert.match(api,/const locationToolAppendix=String\(result\.locationToolAppendix\|\|''\)\.trim\(\)/);
assert.match(api,/buildRouteMapHtml\(/);
assert.match(api,/buildRadarMapHtml\(/);
assert.match(api,/uploadInlineMapPage\(/);
assert.match(html,/safeDataMap/);
assert.match(mapEmbed,/setAttribute\('sandbox',\s*'allow-scripts'\)/);
assert.match(mapEmbed,/jd-map-document/);

console.log('PASS: user-triggered GPS permission, no coordinate persistence, and model-neutral location/map context');
