/* lib/chat/tools.js — split from api/chat.js (mechanical move, no behavior change). */
import { runConfiguredWebSearch } from '../../api/web-search.js';
import { htmlDecode, isSafePublicUrl, safePublicFetch, stripHtml } from './search.js';

async function toolWebSearch(query, maxResults = 5) {
  try {
    const r = await runConfiguredWebSearch(query, {
      maxResults: Math.min(8, Math.max(1, Number(maxResults) || 5)),
      fast: true,
    });
    const results = Array.isArray(r?.results) ? r.results.slice(0, 8) : [];
    return results.map((x) => ({
      title: String(x?.title || x?.name || '').slice(0, 120),
      url: String(x?.url || x?.link || ''),
      snippet: String(x?.snippet || x?.description || '').slice(0, 300),
    })).filter((x) => x.url);
  } catch (_) {
    return [];
  }
}

async function toolFetchWebpage(url) {
  try {
    if (!isSafePublicUrl(url)) return { ok: false, error: 'That URL is not allowed.' };
    const res = await safePublicFetch(url, {}, 2);
    if (!res.ok) return { ok: false, error: 'Fetch failed with status ' + res.status + '.' };
    const html = await res.text();
    const text = stripHtml(htmlDecode(String(html || ''))).replace(/\s+/g, ' ').trim().slice(0, 6000);
    if (!text) return { ok: false, error: 'No readable text found on that page.' };
    return { ok: true, url: String(url), text };
  } catch (e) {
    return { ok: false, error: String(e?.message || e).slice(0, 160) };
  }
}

function modelToolsInstruction(){
  return (
    ' MODEL TOOLS. You have native function-calling tools, the same on every model:' +
    ' (1) share_file — when the user asks for something downloadable (report, document, code file, HTML page, CSV, markdown), CALL share_file with the COMPLETE file content (parameters: filename, content, mimeType). You will receive a public download URL back as the tool result; paste that exact URL in your reply so the user can tap it, like handing them a link. Never invent or print a download URL yourself. If tools are unavailable, generate the complete file content in a fenced code block instead and the server will attach a public download link below your reply automatically.' +
    ' (2) create_session — when the user asks you to create/open a new chat session, you MUST ask for permission first in your reply (e.g. \'Gagawa ako ng bagong session na "<title>". Payag ka ba?\'). NEVER call it without the user explicitly agreeing. Only after they agree, CALL create_session with the title (max 60 chars).' +
    ' (3) web_search — CALL it when you need current or external information to answer well (recent events, facts you are unsure of). Cite the returned titles/URLs.' +
    ' (4) fetch_webpage — CALL it to read the text of a public web page the user shared or that a search returned.' +
    ' (5) generate_image — CALL it with a detailed prompt to create an image; share the returned image URL in your reply as a Markdown image.' +
    ' (6) get_directions — CALL it when the user asks for the way / directions between two places (e.g. "anong daan papunta sa Baguio to Guimba"). After the result, summarize in the user\'s language (e.g. "Ito ang tamang daan papunta sa Guimba — mga 4 h 12 min ang biyahe, 185 km.") and share the map_url so they can open the interactive map with the exact route drawn. Works for any places in the world.' +
    ' (7) get_weather — CALL it when the user asks about the weather anywhere (e.g. "may bagyo ba sa Guimba"). Answer honestly from the returned data only — say "Oo" only when the data shows rain/storm (stormy=true or malakas na pag-ulan), otherwise say the real condition. Then share the radar_map_url so they can see the live satellite/radar map. Never invent a storm that is not in the data.'
  );
}

export { toolWebSearch, toolFetchWebpage, modelToolsInstruction };
