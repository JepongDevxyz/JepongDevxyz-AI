/* =========================================================
   JepongDevxyz AI — Direct Map Embed
   Runtime patch loaded by agent.js (additive only).

   When the AI uses get_directions or get_weather tools and receives
   a map_url/radar_map_url, it must EMBED the map directly as an
   iframe in the chat — NOT just provide a link.

   The user wants to see the map immediately, not tap a link.
   Same for radar/satellite views.
   ========================================================= */
(function () {
  'use strict';
  if (window.__jdMapEmbedLoaded) return;
  window.__jdMapEmbedLoaded = true;

  var MAP_INSTRUCTIONS = [
    'MAP DISPLAY RULE (very important):',
    'When you use the get_directions tool and receive a map_url,',
    'you MUST include it in your response as a Markdown link.',
    'Use this exact format: [Pindutin dito para sa live map](MAP_URL_HERE)',
    'Replace MAP_URL_HERE with the actual map_url from the tool result.',
    'Do NOT use iframe HTML — just the Markdown link. The app will automatically',
    'convert it to an embedded visible map.',
    '',
    'Same rule for get_weather: when you receive radar_map_url,',
    'include it as: [Pindutin dito para sa radar map](RADAR_URL_HERE).',
    'For satellite views, use: [Pindutin dito para sa satellite map](SAT_URL_HERE).'
  ].join(' ');

  // Patch fetch to inject map instructions
  var origFetch = window.fetch;
  window.fetch = function (url, opts) {
    try {
      var urlStr = String(url || '');
      if (urlStr.indexOf('/api/chat') !== -1 && opts && opts.body) {
        var body = null;
        try { body = JSON.parse(opts.body); } catch (e) {}
        if (body && typeof body === 'object') {
          body.personalization = body.personalization || {};
          var existing = body.personalization.customInstructions || '';
          if (existing.indexOf('MAP DISPLAY RULE') === -1) {
            body.personalization.customInstructions =
              (existing ? existing + '\n\n' : '') + MAP_INSTRUCTIONS;
            opts.body = JSON.stringify(body);
          }
        }
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };
})();
