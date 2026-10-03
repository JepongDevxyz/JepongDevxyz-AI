import assert from 'node:assert/strict';
import {
  buildLocationMapLinks,
  buildRouteMapAppendix,
  buildWeatherMapAppendix,
  detectLocationWeatherIntent,
  extractRouteRequest,
  normalizeClientLocation,
  fetchLiveWeather
} from '../api/location-tools.js';

assert.deepEqual(detectLocationWeatherIntent('What is the weather in my location?'), {
  weather:true,currentLocation:true
});
assert.deepEqual(detectLocationWeatherIntent('Anong panahon dito sa location ko?'), {
  weather:true,currentLocation:true
});
assert.equal(detectLocationWeatherIntent('Weather in Guimba, Nueva Ecija').currentLocation,false);
assert.equal(detectLocationWeatherIntent('Hello there').weather,false);

assert.deepEqual(extractRouteRequest('Guimba to Baguio'), {
  origin:'Guimba',destination:'Baguio',travelMode:'driving'
});
assert.deepEqual(extractRouteRequest('Show me directions from Guimba, Nueva Ecija to Baguio City'), {
  origin:'Guimba, Nueva Ecija',destination:'Baguio City',travelMode:'driving'
});
assert.deepEqual(extractRouteRequest('Walk from Guimba to Baguio'), {
  origin:'Guimba',destination:'Baguio',travelMode:'walking'
});
assert.equal(extractRouteRequest('Translate this to Tagalog'),null);
assert.equal(extractRouteRequest('Weather from Guimba to Baguio'),null);

const fix=normalizeClientLocation({latitude:15.6678,longitude:120.7562,accuracy:18.4,timestamp:Date.now()});
assert.deepEqual(fix,{latitude:15.6678,longitude:120.7562,accuracyMeters:18.4});
assert.equal(normalizeClientLocation({latitude:91,longitude:120,accuracy:3,timestamp:Date.now()}),null);
assert.equal(normalizeClientLocation({latitude:15,longitude:120,accuracy:180000,timestamp:Date.now()}),null);
assert.equal(normalizeClientLocation({latitude:15,longitude:120,accuracy:20,timestamp:Date.now()-3600000}),null);

const links=buildLocationMapLinks({latitude:15.6678,longitude:120.7562},{origin:'Guimba',destination:'Baguio'},new Date('2026-10-03T16:00:00.000Z'));
assert.match(links.routeUrl,/google\.com\/maps\/dir/);
assert.match(links.routeUrl,/origin=Guimba/);
assert.match(links.routeUrl,/destination=Baguio/);
const routeCard=buildRouteMapAppendix({origin:'Guimba',destination:'Baguio',travelMode:'driving'},'https://maps.example/route-guimba-to-baguio.html');
assert.match(routeCard,/\[View route map inside the chat\]\(https:\/\/maps\.example\/route-guimba-to-baguio\.html\)/);
assert.match(links.radarUrl,/rainviewer\.com\/weather-radar-map-live\.html\?loc=15\.6678%2C120\.7562%2C8/);
const satellite=new URL(links.satelliteUrl);
assert.equal(satellite.hostname,'worldview.earthdata.nasa.gov');
assert.match(satellite.searchParams.get('l'),/Himawari_AHI_Band13_Clean_Infrared/);
assert.equal(satellite.searchParams.get('t'),'2026-10-03');
const bounds=satellite.searchParams.get('v').split(',').map(Number);
assert.equal((bounds[0]+bounds[2])/2,120.7562);
assert.equal((bounds[1]+bounds[3])/2,15.6678);

const fetches=[];
const weather=await fetchLiveWeather({
  location:fix,
  fetchImpl:async (url,init)=>{
    fetches.push({url:String(url),init});
    return {ok:true,status:200,json:async()=>({
      current_condition:[{temp_C:'29',FeelsLikeC:'34',weatherDesc:[{value:'Partly cloudy'}],humidity:'72',windspeedKmph:'11',precipMM:'0.1',observation_time:'11:40 AM'}],
      nearest_area:[{areaName:[{value:'Guimba'}],region:[{value:'Central Luzon'}],country:[{value:'Philippines'}],latitude:'15.67',longitude:'120.75'}],
      weather:[{hourly:[{time:'1200',chanceofrain:'45'}]}]
    })};
  },now:()=>new Date('2026-10-03T16:00:00.000Z')
});
assert.equal(fetches.length,1);
assert.match(fetches[0].url,/wttr\.in\/15\.667800%2C120\.756200\?format=j1/);
assert.equal(weather.locationName,'Guimba, Central Luzon, Philippines');
assert.equal(weather.temperatureC,29);
assert.equal(weather.feelsLikeC,34);
assert.equal(weather.chanceOfRainPercent,45);
assert.deepEqual(weather.requestedFix,fix);

const appendix=buildWeatherMapAppendix({
  location:fix,weather,mapUrl:'https://maps.example/weather-guimba.html',
  now:new Date('2026-10-03T16:00:00.000Z')
});
assert.match(appendix,/29°C/);
assert.match(appendix,/±18 m/);
assert.match(appendix,/Open live radar map/);
assert.match(appendix,/Open Himawari satellite cloud view/);
assert.match(appendix,/\[View radar and satellite map inside the chat\]\(https:\/\/maps\.example\/weather-guimba\.html\)/);
assert.match(appendix,/rainviewer\.com/);
assert.match(appendix,/worldview\.earthdata\.nasa\.gov/);

console.log('PASS: route links, GPS validation, weather fetching, and exact-location radar/satellite maps');
