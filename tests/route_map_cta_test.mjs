import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('        function suppressEmbeddedRouteMapCta(text) {');
const end=html.indexOf('        function renderCustomMarkdown(',start);
assert(start>=0&&end>start,'route map CTA filter must exist');
const source=html.slice(start,end);
const suppress=new Function(source+'\nreturn suppressEmbeddedRouteMapCta;')();
const generated='Directions are below.\n\n[Pindutin dito para sa live map](https://maps.google.com)';
const routeAnswer='> [!STATUS info|Route map]\n> ### Guimba → Baguio\n> [View route map inside the chat](data:text/html;base64,abc)\n\n'+generated;
const clean=suppress(routeAnswer);
assert.doesNotMatch(clean,/Pindutin dito para sa live map/i,
  'the standalone live-map CTA must not remain in a response with an embedded route map');
assert.match(clean,/View route map inside the chat/,
  'the internal map marker must stay available for the map embed renderer');
assert.match(suppress(generated),/Pindutin dito para sa live map/,
  'unrelated responses without an embedded route map must not be altered');

console.log('PASS: embedded route responses hide duplicate map call-to-action text');
