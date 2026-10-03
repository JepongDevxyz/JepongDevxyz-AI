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
    'you MUST embed the map directly in your response using an iframe.',
    'Do NOT just provide a text link like "Pindutin dito".',
    '',
    'Use this exact HTML format:',
    '<iframe src="MAP_URL_HERE" width="100%" height="400" style="border:0;border-radius:12px" loading="lazy"></iframe>',
    '',
    'Replace MAP_URL_HERE with the actual map_url from the tool result.',
    'The map must be visible immediately without tapping any link.',
    '',
    'Same rule for get_weather: when you receive radar_map_url,',
    'embed it directly with an iframe using the same format.',
    'For satellite views, embed them the same way.'
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
