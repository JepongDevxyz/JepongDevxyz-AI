/* =========================================================
   JepongDevxyz AI — unified model tools
   One canonical tool registry for EVERY provider ("itulad mo
   sayo lahat ng models"): the same tools work on all models,
   translated to each provider family's native function-calling
   format (OpenAI / Gemini / Anthropic).

   Families without native function calling (AI Horde, Cohere,
   custom APIs) keep working through the server-side artifact
   pipeline in api/chat.js — the tools degrade gracefully,
   never break the chat.
   ========================================================= */

export const TOOL_FAMILY_OPENAI = 'openai';
export const TOOL_FAMILY_GEMINI = 'gemini';
export const TOOL_FAMILY_ANTHROPIC = 'anthropic';

export const MAX_TOOL_ROUNDS = 3;

import {
  geocodePlace,
  getRoute,
  getWeather,
  getRadarTileUrl,
  buildRouteMapHtml,
  buildRadarMapHtml,
  slugify,
  shortPlace,
} from './geo.js';

/* Canonical tool definitions (JSON-schema parameters). */
export const UNIFIED_TOOLS = [
  {
    name: 'share_file',
    description:
      'Create a downloadable file for the user and get a public download link. ' +
      'Call it with the COMPLETE file content. You will receive a public URL back — ' +
      'paste that exact URL in your reply so the user can tap it, like handing them a link. ' +
      'Use when the user asks for something downloadable (report, document, code file, HTML page, CSV, markdown). ' +
      'Never invent or print a download URL yourself.',
    parameters: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'File name with extension, e.g. report.md' },
        content: { type: 'string', description: 'Complete final file content' },
        mimeType: { type: 'string', description: 'MIME type, e.g. text/markdown' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'create_session',
    description:
      'Create a new chat session. You MUST ask the user for permission first in your reply ' +
      '(e.g. \'Gagawa ako ng bagong session na "<title>". Payag ka ba?\') and only call this tool ' +
      'AFTER they explicitly agree. Never call it without their agreement.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the new session, max 60 chars' },
      },
      required: ['title'],
    },
  },
  {
    name: 'web_search',
    description:
      'Search the live web when you need current or external information to answer well. ' +
      'Returns titles, URLs and snippets you can cite. Use it when the user asks about recent events, ' +
      'facts you are unsure of, or anything beyond your training.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'string', description: 'How many results (1-8, default 5)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch_webpage',
    description:
      'Read the text content of a public web page (up to ~6000 characters). ' +
      'Use it when the user shares a URL and asks about its content, or when a search result looks relevant.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Public http(s) URL to read' },
      },
      required: ['url'],
    },
  },
  {
    name: 'generate_image',
    description:
      'Generate an image from a text description. Returns a public image URL — ' +
      'share it in your reply as a Markdown image so the user sees it.',
    parameters: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Detailed image description' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'get_directions',
    description:
      'Get the driving route between two places anywhere in the world. Returns distance, ' +
      'travel time, and a public link to an interactive map with the exact route drawn. ' +
      'Use when the user asks how to get somewhere / anong daan papunta.',
    parameters: {
      type: 'object',
      properties: {
        from: { type: 'string', description: 'Origin place, e.g. "Baguio City"' },
        to: { type: 'string', description: 'Destination place, e.g. "Guimba, Nueva Ecija"' },
      },
      required: ['from', 'to'],
    },
  },
  {
    name: 'get_weather',
    description:
      'Get the current weather for any place in the world. Returns temperature, condition ' +
      '(in Filipino), precipitation, wind, and a public link to a live satellite/radar map. ' +
      'Use when the user asks about the weather / may bagyo ba / uulan ba.',
    parameters: {
      type: 'object',
      properties: {
        place: { type: 'string', description: 'Place name, e.g. "Guimba, Nueva Ecija"' },
      },
      required: ['place'],
    },
  },
];

/* ---------- family converters ---------- */

export function toOpenAITools(tools) {
  return (Array.isArray(tools) ? tools : []).map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export function toGeminiTools(tools) {
  return [
    {
      functionDeclarations: (Array.isArray(tools) ? tools : []).map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      })),
    },
  ];
}

export function toAnthropicTools(tools) {
  return (Array.isArray(tools) ? tools : []).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));
}

export function toolsForFamily(family, tools) {
  if (family === TOOL_FAMILY_OPENAI) return toOpenAITools(tools);
  if (family === TOOL_FAMILY_GEMINI) return toGeminiTools(tools);
  if (family === TOOL_FAMILY_ANTHROPIC) return toAnthropicTools(tools);
  return null;
}

/* ---------- streaming tool-call accumulators ---------- */

function safeParseArgs(text) {
  try {
    const v = JSON.parse(String(text || ''));
    return v && typeof v === 'object' ? v : {};
  } catch (_) {
    return {};
  }
}

/* OpenAI chat-completions streaming: delta.tool_calls[] with index. */
export function accumulateOpenAIToolDeltas(finishState, deltas) {
  if (!Array.isArray(deltas) || !finishState) return;
  finishState._toolDeltas = finishState._toolDeltas || [];
  for (const tc of deltas) {
    const idx = Number.isInteger(tc?.index) ? tc.index : 0;
    let call = finishState._toolDeltas.find((c) => c.index === idx);
    if (!call) {
      call = { index: idx, id: '', name: '', argsText: '' };
      finishState._toolDeltas.push(call);
    }
    if (tc?.id) call.id = tc.id;
    if (tc?.function?.name) call.name += tc.function.name;
    if (typeof tc?.function?.arguments === 'string') call.argsText += tc.function.arguments;
  }
}

function finalizeOpenAIToolCalls(finishState) {
  return (finishState?._toolDeltas || [])
    .filter((c) => c.name)
    .map((c) => ({ id: c.id || 'call_' + c.index, name: c.name, args: safeParseArgs(c.argsText) }));
}

/* Gemini: functionCall parts arrive as complete objects. */
export function recordGeminiFunctionCall(finishState, fnCall) {
  if (!finishState || !fnCall?.name) return;
  finishState._toolDeltas = finishState._toolDeltas || [];
  finishState._toolDeltas.push({
    id: 'gemini_' + finishState._toolDeltas.length,
    name: String(fnCall.name),
    args: fnCall.args && typeof fnCall.args === 'object' ? fnCall.args : {},
  });
}

function finalizeGeminiToolCalls(finishState) {
  return (finishState?._toolDeltas || [])
    .filter((c) => c.name)
    .map((c) => ({ id: c.id, name: c.name, args: c.args || {} }));
}

/* Anthropic: content_block_start(tool_use) + input_json_delta stream. */
export function accumulateAnthropicEvent(finishState, p) {
  if (!finishState || !p) return;
  if (p.type === 'content_block_start' && p.content_block?.type === 'tool_use') {
    finishState._toolDeltas = finishState._toolDeltas || [];
    finishState._toolDeltas.push({
      index: p.index,
      id: String(p.content_block.id || ''),
      name: String(p.content_block.name || ''),
      json: '',
    });
  } else if (p.type === 'content_block_delta' && p.delta?.type === 'input_json_delta') {
    const call = (finishState._toolDeltas || []).find((c) => c.index === p.index);
    if (call && typeof p.delta.partial_json === 'string') call.json += p.delta.partial_json;
  }
}

function finalizeAnthropicToolCalls(finishState) {
  return (finishState?._toolDeltas || [])
    .filter((c) => c.name)
    .map((c) => ({ id: c.id || 'ant_' + c.index, name: c.name, args: safeParseArgs(c.json) }));
}

export function finalizeToolCalls(family, finishState) {
  if (!finishState) return [];
  if (family === TOOL_FAMILY_OPENAI) return finalizeOpenAIToolCalls(finishState);
  if (family === TOOL_FAMILY_GEMINI) return finalizeGeminiToolCalls(finishState);
  if (family === TOOL_FAMILY_ANTHROPIC) return finalizeAnthropicToolCalls(finishState);
  return [];
}

/* ---------- follow-up message builders (native formats) ---------- */

function geminiResponseObject(result) {
  if (result && typeof result === 'object' && !Array.isArray(result)) return result;
  return { result: String(result ?? '') };
}

export function buildToolFollowUp(family, nativeMessages, calls, results) {
  const msgs = Array.isArray(nativeMessages) ? nativeMessages : [];
  if (family === TOOL_FAMILY_OPENAI) {
    const assistantMsg = {
      role: 'assistant',
      content: null,
      tool_calls: calls.map((c) => ({
        id: c.id,
        type: 'function',
        function: { name: c.name, arguments: JSON.stringify(c.args || {}) },
      })),
    };
    const toolMsgs = results.map((r) => ({
      role: 'tool',
      tool_call_id: r.call.id,
      content: JSON.stringify(r.result).slice(0, 4000),
    }));
    return { messages: [...msgs, assistantMsg, ...toolMsgs] };
  }
  if (family === TOOL_FAMILY_GEMINI) {
    const modelMsg = {
      role: 'model',
      parts: calls.map((c) => ({ functionCall: { name: c.name, args: c.args || {} } })),
    };
    const userMsg = {
      role: 'user',
      parts: results.map((r) => ({
        functionResponse: { name: r.call.name, response: geminiResponseObject(r.result) },
      })),
    };
    return { contents: [...msgs, modelMsg, userMsg] };
  }
  if (family === TOOL_FAMILY_ANTHROPIC) {
    const assistantMsg = {
      role: 'assistant',
      content: calls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.args || {} })),
    };
    const userMsg = {
      role: 'user',
      content: results.map((r) => ({
        type: 'tool_result',
        tool_use_id: r.call.id,
        content: JSON.stringify(r.result).slice(0, 4000),
      })),
    };
    return { messages: [...msgs, assistantMsg, userMsg] };
  }
  return null;
}

/* ---------- server-side tool executor ---------- */

export async function executeUnifiedTool(call, ctx = {}) {
  const name = String(call?.name || '');
  const args = call?.args && typeof call.args === 'object' ? call.args : {};
  try {
    if (name === 'share_file') {
      const content = typeof args.content === 'string' ? args.content : '';
      if (!content.trim()) {
        return { ok: false, error: 'share_file needs the complete file content in the content parameter.' };
      }
      const bytes = new TextEncoder().encode(content);
      const up = await ctx.uploadSharedFile({
        filename: args.filename || 'JepongDevxyz-output.txt',
        bytes,
        mimeType: args.mimeType || '',
      });
      if (up && up.ok && up.url) {
        if (typeof ctx.onShared === 'function') ctx.onShared(up);
        return {
          ok: true,
          url: up.url,
          filename: up.filename,
          message: 'File uploaded successfully. Paste this exact public download URL in your reply so the user can tap it.',
        };
      }
      return {
        ok: false,
        error:
          'Upload failed (' + ((up && up.reason) || 'unknown') + '). ' +
          'Put the COMPLETE file content in a fenced code block in your reply instead; the server will attach it as a download.',
      };
    }
    if (name === 'create_session') {
      const title = String(args.title || 'New session').slice(0, 60).trim() || 'New session';
      if (typeof ctx.onCreateSession === 'function') ctx.onCreateSession(title);
      return { ok: true, message: 'The new chat session "' + title + '" will be created.' };
    }
    if (name === 'web_search') {
      const query = String(args.query || '').trim().slice(0, 300);
      if (!query) return { ok: false, error: 'web_search needs a query.' };
      const count = Math.min(8, Math.max(1, Number(args.count) || 5));
      if (typeof ctx.webSearch !== 'function') return { ok: false, error: 'Web search is not available.' };
      const results = await ctx.webSearch(query, count);
      if (!results || !results.length) return { ok: false, error: 'No web results found for that query.' };
      return { ok: true, results };
    }
    if (name === 'fetch_webpage') {
      const url = String(args.url || '').trim();
      if (!url) return { ok: false, error: 'fetch_webpage needs a url.' };
      if (typeof ctx.fetchWebpage !== 'function') return { ok: false, error: 'Page fetching is not available.' };
      return await ctx.fetchWebpage(url);
    }
    if (name === 'generate_image') {
      const prompt = String(args.prompt || '').trim().slice(0, 500);
      if (!prompt) return { ok: false, error: 'generate_image needs a prompt.' };
      const seed = Math.floor(Math.random() * 1000000);
      const imageUrl =
        'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) +
        '?seed=' + seed + '&width=1024&height=1024&nologo=true';
      return {
        ok: true,
        imageUrl,
        message: 'Image generated. Share it in your reply as a Markdown image: ![description](' + imageUrl + ')',
      };
    }
    if (name === 'get_directions') {
      const fromQ = String(args.from || '').trim().slice(0, 120);
      const toQ = String(args.to || '').trim().slice(0, 120);
      if (!fromQ || !toQ) return { ok: false, error: 'get_directions needs from and to places.' };
      const fetchImpl = ctx.fetchImpl || fetch;
      // Geocode both in parallel (with cache, this is fast for repeat queries).
      // Stagger by 300ms to be polite to Nominatim, but don't wait 1.1s.
      const fromP = geocodePlace(fromQ, fetchImpl).catch(() => null);
      await new Promise((r) => setTimeout(r, 300));
      const toP = geocodePlace(toQ, fetchImpl).catch(() => null);
      const [from, to] = await Promise.all([fromP, toP]);
      if (!from) return { ok: false, error: 'Hindi ko mahanap ang lugar na "' + fromQ + '". Pakisubukang muli o gumamit ng mas specific na pangalan.' };
      if (!to) return { ok: false, error: 'Hindi ko mahanap ang lugar na "' + toQ + '". Pakisubukang muli o gumamit ng mas specific na pangalan.' };
      const route = await getRoute(from, to, fetchImpl).catch(() => null);
      if (!route) return { ok: false, error: 'Walang mahanap na driving route mula ' + from.name + ' papuntang ' + to.name + '.' };
      let mapUrl = '';
      if (typeof ctx.uploadSharedFile === 'function') {
        const htmlFile = buildRouteMapHtml({
          fromName: shortPlace(from.name), toName: shortPlace(to.name),
          distanceKm: route.distanceKm, durationText: route.durationText, geometry: route.geometry,
        });
        // Timeout the upload after 8s — don't let it block the response.
        // If it fails, we still return the route info.
        const uploadP = ctx.uploadSharedFile({
          filename: 'route-' + slugify(fromQ) + '-to-' + slugify(toQ) + '.html',
          bytes: htmlFile, mimeType: 'text/html',
        }).catch(() => null);
        const timeoutP = new Promise((r) => setTimeout(() => r(null), 8000));
        const up = await Promise.race([uploadP, timeoutP]);
        if (up && up.ok) mapUrl = up.url;
      }
      const directionsUrl =
        'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(from.lat + ',' + from.lon) +
        '&destination=' + encodeURIComponent(to.lat + ',' + to.lon);
      return {
        ok: true, from: shortPlace(from.name), to: shortPlace(to.name),
        distance_km: route.distanceKm, duration: route.durationText,
        map_url: mapUrl, directions_url: directionsUrl,
      };
    }
    if (name === 'get_weather') {
      const placeQ = String(args.place || '').trim().slice(0, 120);
      if (!placeQ) return { ok: false, error: 'get_weather needs a place.' };
      const fetchImpl = ctx.fetchImpl || fetch;
      const place = await geocodePlace(placeQ, fetchImpl).catch(() => null);
      if (!place) return { ok: false, error: 'Hindi ko mahanap ang lugar na "' + placeQ + '".' };
      const [wx, radarTileUrl] = await Promise.all([
        getWeather(place.lat, place.lon, fetchImpl).catch(() => null),
        getRadarTileUrl(fetchImpl).catch(() => null),
      ]);
      if (!wx) return { ok: false, error: 'Hindi ko makuha ang panahon sa ' + place.name + ' ngayon.' };
      let mapUrl = '';
      if (typeof ctx.uploadSharedFile === 'function') {
        const htmlFile = buildRadarMapHtml({
          placeName: shortPlace(place.name), condition: wx.condition,
          temperatureC: wx.temperatureC, radarTileUrl,
          lat: place.lat, lon: place.lon,
        });
        const up = await ctx.uploadSharedFile({
          filename: 'weather-' + slugify(placeQ) + '.html',
          bytes: htmlFile, mimeType: 'text/html',
        }).catch(() => null);
        if (up && up.ok) mapUrl = up.url;
      }
      return {
        ok: true, place: shortPlace(place.name),
        temperature_c: wx.temperatureC, condition: wx.condition,
        precipitation_mm: wx.precipitationMm, humidity: wx.humidity,
        wind_kph: wx.windKph, stormy: wx.stormy,
        radar_map_url: mapUrl,
      };
    }
    return { ok: false, error: 'Unknown tool: ' + name };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 200) };
  }
}
