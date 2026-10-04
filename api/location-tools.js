const WEATHER_TERMS=/\b(?:weather|forecast|temperature|rain|rainfall|storm|typhoon)\b|(?:panahon|ulan|temperatura|bagyo|forecast)/iu;
const CURRENT_LOCATION_TERMS=/\b(?:my\s+(?:current\s+)?(?:location|area)|current\s+location|near\s+me|around\s+me|where\s+i\s+am|here)\b|\b(?:dito|rito)\s+(?:sa\s+)?(?:location|kinaroroonan|lugar)\s+ko\b|\bsa\s+kinaroroonan\s+ko\b/iu;

function finiteNumber(value){
  const number=Number(value);
  return Number.isFinite(number)?number:null;
}

function plainLocationLabel(value,max=100){
  return String(value||'').normalize('NFKC').replace(/[\r\n<>`*_~|\[\]{}]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}

function escapeMarkdown(value){
  return plainLocationLabel(value,100).replace(/[\\`*_{}\[\]()#+.!|>~-]/g,'\\$&');
}

// Map HTML must be served inline: Vercel Blob intentionally blocks HTML framing
// with a restrictive CSP/X-Frame-Options policy. Generated maps are trusted,
// size-limited documents and are separately validated before iframe rendering.
export function buildInlineMapDataUrl(html){
  const bytes=new TextEncoder().encode(String(html||''));
  if(!bytes.length||bytes.length>110000)return '';
  let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  const dataUrl='data:text/html;base64,'+btoa(binary);
  return dataUrl.length<=150000?dataUrl:'';
}

export function detectLocationWeatherIntent(message=''){
  const text=String(message||'').normalize('NFKC');
  return {
    weather:WEATHER_TERMS.test(text),
    currentLocation:WEATHER_TERMS.test(text)&&CURRENT_LOCATION_TERMS.test(text)
  };
}

export function normalizeClientLocation(raw,now=Date.now()){
  if(!raw||typeof raw!=='object')return null;
  const latitude=finiteNumber(raw.latitude);
  const longitude=finiteNumber(raw.longitude);
  const accuracyMeters=finiteNumber(raw.accuracyMeters??raw.accuracy);
  const timestamp=finiteNumber(raw.timestamp);
  if(latitude===null||latitude< -90||latitude>90||longitude===null||longitude< -180||longitude>180)return null;
  if(accuracyMeters===null||accuracyMeters<0||accuracyMeters>50000)return null;
  if(timestamp===null||timestamp>now+60000||now-timestamp>15*60*1000)return null;
  return {latitude,longitude,accuracyMeters};
}

function cleanRoutePoint(value){
  return plainLocationLabel(value,100)
    .replace(/\s+(?:map|directions?|route|please|by\s+(?:car|road)|driving|walking)$/iu,'')
    .replace(/[?.!,;:]+$/g,'').trim();
}

export function extractRouteRequest(message=''){
  let text=String(message||'').normalize('NFKC').replace(/\s+/g,' ').trim();
  if(!text||WEATHER_TERMS.test(text)||/\b(?:translate|translation|convert|rewrite|rephrase|change|compare|send|explain)\b/iu.test(text))return null;

  let travelMode='driving';
  if(/\b(?:walk|walking|on foot)\b/iu.test(text))travelMode='walking';
  else if(/\b(?:bike|bicycle|cycling|cycle)\b/iu.test(text))travelMode='bicycling';
  else if(/\b(?:bus|train|public transit|commute)\b/iu.test(text))travelMode='transit';

  text=text.replace(/^(?:hey\s+)?(?:can|could|would)\s+you\s+/iu,'')
    .replace(/^(?:please\s+)?(?:show\s+me\s+(?:a\s+)?(?:map|route|directions?)|give\s+me\s+(?:a\s+)?(?:map|route|directions?)|find\s+(?:a\s+)?route|map|route|directions?|navigate|driving\s+directions|walking\s+directions|how\s+do\s+i\s+get|how\s+to\s+get|distance)\s*/iu,'')
    .replace(/^(?:from|between)\s+/iu,'')
    .replace(/[?.!]+$/g,'').trim();

  const fromMatch=/\bfrom\s+(.+?)\s+(?:to|towards|→)\s+(.+)$/iu.exec(text);
  const pair=fromMatch||/^(.+?)\s+(?:to|towards|→)\s+(.+)$/iu.exec(text);
  if(!pair)return null;
  const origin=cleanRoutePoint(pair[1]);
  const destination=cleanRoutePoint(pair[2]);
  if(origin.length<2||destination.length<2||origin.length>100||destination.length>100)return null;
  if(/^(?:weather|translate|translation|convert|rewrite|rephrase|explain|compare|send|change|what|how|why|when|the|a|an)$/iu.test(origin))return null;
  if(/^(?:weather|translate|translation|convert|rewrite|rephrase|explain|compare|send|change|the|a|an)$/iu.test(destination))return null;
  return {origin,destination,travelMode};
}

export function buildLocationMapLinks(location=null,route=null,now=new Date()){
  const links={};
  if(route?.origin&&route?.destination){
    const directions=new URL('https://www.google.com/maps/dir/');
    directions.searchParams.set('api','1');
    directions.searchParams.set('origin',plainLocationLabel(route.origin));
    directions.searchParams.set('destination',plainLocationLabel(route.destination));
    directions.searchParams.set('travelmode',['driving','walking','bicycling','transit'].includes(route.travelMode)?route.travelMode:'driving');
    links.routeUrl=directions.toString();
  }

  const latitude=finiteNumber(location?.latitude);
  const longitude=finiteNumber(location?.longitude);
  if(latitude===null||longitude===null||latitude< -90||latitude>90||longitude< -180||longitude>180)return links;

  const radar=new URL('https://www.rainviewer.com/weather-radar-map-live.html');
  radar.searchParams.set('loc',`${latitude},${longitude},8`);
  links.radarUrl=radar.toString();

  const radius=2.5;
  const minLon=Math.max(-180,longitude-radius);
  const maxLon=Math.min(180,longitude+radius);
  const minLat=Math.max(-89,latitude-radius);
  const maxLat=Math.min(89,latitude+radius);
  const date=now.toISOString().slice(0,10);
  const satellite=new URL('https://worldview.earthdata.nasa.gov/');
  satellite.searchParams.set('p','geographic');
  satellite.searchParams.set('v',[minLon,minLat,maxLon,maxLat].join(','));
  satellite.searchParams.set('l','Himawari_AHI_Band13_Clean_Infrared');
  satellite.searchParams.set('lg','true');
  satellite.searchParams.set('t',date);
  links.satelliteUrl=satellite.toString();
  return links;
}

function pickText(value){
  if(Array.isArray(value))return plainLocationLabel(value[0]?.value,100);
  return plainLocationLabel(value,100);
}

export async function fetchLiveWeather({location=null,place='',fetchImpl=fetch,timeoutMs=6500,now=()=>new Date()}={}){
  const coordinates=location&&finiteNumber(location.latitude)!==null&&finiteNumber(location.longitude)!==null;
  const query=coordinates
    ?`${Number(location.latitude).toFixed(6)},${Number(location.longitude).toFixed(6)}`
    :plainLocationLabel(place,100);
  if(!query)return null;

  const url=`https://wttr.in/${encodeURIComponent(query)}?format=j1`;
  const init={headers:{'User-Agent':'JepongDevxyz-AI/1.0','Accept':'application/json'}};
  if(typeof AbortSignal!=='undefined'&&typeof AbortSignal.timeout==='function')init.signal=AbortSignal.timeout(timeoutMs);
  const response=await fetchImpl(url,init);
  if(!response?.ok)throw new Error(`Weather source returned HTTP ${response?.status||502}`);
  const data=await response.json();
  const current=data?.current_condition?.[0];
  if(!current||finiteNumber(current.temp_C)===null)throw new Error('Weather source returned no current observation.');
  const nearest=data?.nearest_area?.[0]||{};
  const weather=data?.weather?.[0]||{};
  const hourly=Array.isArray(weather.hourly)?weather.hourly:[];
  const rainChances=hourly.map(x=>finiteNumber(x.chanceofrain)).filter(x=>x!==null);
  const observationTime=pickText(current.observation_time);
  return {
    fetchedAt:now().toISOString(),
    locationName:[pickText(nearest.areaName),pickText(nearest.region),pickText(nearest.country)].filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).join(', ')||plainLocationLabel(place)||'Nearest reporting area',
    nearestLatitude:finiteNumber(nearest.latitude),
    nearestLongitude:finiteNumber(nearest.longitude),
    temperatureC:finiteNumber(current.temp_C),
    feelsLikeC:finiteNumber(current.FeelsLikeC),
    condition:pickText(current.weatherDesc)||'Current condition unavailable',
    humidityPercent:finiteNumber(current.humidity),
    windKph:finiteNumber(current.windspeedKmph),
    precipitationMm:finiteNumber(current.precipMM),
    chanceOfRainPercent:rainChances.length?Math.max(...rainChances):null,
    observationTime,
    requestedFix:coordinates?{
      latitude:Number(location.latitude),longitude:Number(location.longitude),
      accuracyMeters:finiteNumber(location.accuracyMeters)
    }:null
  };
}

function displayNumber(value,digits=0){
  const number=finiteNumber(value);
  return number===null?'not available':`${Number(number.toFixed(digits))}`;
}

export function buildRouteMapAppendix(route,mapUrl=''){
  if(!route?.origin||!route?.destination)return '';
  const links=buildLocationMapLinks(null,route);
  const title=`${escapeMarkdown(route.origin)} → ${escapeMarkdown(route.destination)}`;
  const mode={driving:'driving',walking:'walking',bicycling:'bicycling',transit:'transit'}[route.travelMode]||'driving';
  const lines=[
    '> [!STATUS info|Route map]',
    `> ### ${title}`
  ];
  if(mapUrl){
    // The map embed replaces this source link in the chat. Avoid a second,
    // redundant Google Maps action under an already visible interactive map.
    lines.push(`> [View route map inside the chat](${mapUrl})`);
  }else{
    lines.push(`> Open the ${mode} route in Google Maps to see the live map and current directions.`);
    lines.push(`> [Open ${mode} directions in Google Maps](${links.routeUrl})`);
  }
  return lines.join('\n');
}

export function buildWeatherMapAppendix({location=null,weather=null,weatherError='',mapUrl='',now=new Date()}={}){
  const links=buildLocationMapLinks(location,null,now);
  if(!links.radarUrl||!links.satelliteUrl)return '';
  const locationName=weather?.locationName||'your device location';
  const lines=[
    '> [!STATUS info|Live weather maps]',
    `> ### ${escapeMarkdown(locationName)}`
  ];
  if(weather){
    lines.push(`> Current: ${escapeMarkdown(weather.condition)} · ${displayNumber(weather.temperatureC)}°C · feels like ${displayNumber(weather.feelsLikeC)}°C`);
    lines.push(`> Humidity: ${displayNumber(weather.humidityPercent)}% · Wind: ${displayNumber(weather.windKph)} km/h · Rain: ${displayNumber(weather.precipitationMm,1)} mm${weather.chanceOfRainPercent===null?'':` · rain chance up to ${displayNumber(weather.chanceOfRainPercent)}% in the returned forecast slots`}`);
    lines.push(`> Weather checked ${escapeMarkdown(weather.fetchedAt)}${weather.observationTime?` · provider observation ${escapeMarkdown(weather.observationTime)}`:''}.`);
  }else{
    lines.push(`> Current weather data could not be retrieved${weatherError?`: ${escapeMarkdown(weatherError)}`:''}. The following links still open at the device coordinates.`);
  }
  if(mapUrl)lines.push(`> [View radar and satellite map inside the chat](${mapUrl})`);
  if(location?.accuracyMeters!==null&&location?.accuracyMeters!==undefined){
    lines.push(`> Map center uses the device GPS fix (reported accuracy ±${displayNumber(location.accuracyMeters)} m); the weather reading is from the nearest provider reporting area.`);
  }else{
    lines.push('> Map center uses the nearest reporting-area coordinates returned by the weather source.');
  }
  lines.push(`> [Open live radar map (RainViewer)](${links.radarUrl})`);
  lines.push(`> [Open Himawari satellite cloud view (NASA Worldview)](${links.satelliteUrl})`);
  lines.push('> Weather source: [wttr.in](https://wttr.in/) · Radar by [RainViewer](https://www.rainviewer.com/) · Satellite imagery by [NASA Worldview](https://worldview.earthdata.nasa.gov/).');
  return lines.join('\n');
}
