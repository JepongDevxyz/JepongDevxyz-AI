import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

function extractFunction(name,nextName){
  const start=html.indexOf(`function ${name}(`);
  const end=html.indexOf(`\n        function ${nextName}(`,start);
  assert(start>=0&&end>start,`${name} must be present in the carousel controller`);
  return html.slice(start,end);
}

const nextPageSource=extractFunction('nextProviderPageIndex','shouldAnimateProviderPageTransition');
const animateSource=extractFunction('shouldAnimateProviderPageTransition','setProviderPage');
const nextProviderPageIndex=new Function(nextPageSource+'\nreturn nextProviderPageIndex;')();
const shouldAnimateProviderPageTransition=new Function(animateSource+'\nreturn shouldAnimateProviderPageTransition;')();

assert.equal(nextProviderPageIndex(6,1,14),7,'next advances exactly one provider');
assert.equal(nextProviderPageIndex(6,-1,14),5,'previous moves exactly one provider');
assert.equal(nextProviderPageIndex(13,1,14),13,'next at the last provider stays there');
assert.equal(nextProviderPageIndex(0,-1,14),0,'previous at the first provider stays there');
assert.equal(shouldAnimateProviderPageTransition(6,7),true,'neighboring pages animate normally');
assert.equal(shouldAnimateProviderPageTransition(13,0),false,'a direct jump across the carousel snaps instead of sweeping through every page');
assert.equal(shouldAnimateProviderPageTransition(4,4),false,'selecting the active page does not animate');

const setPage=extractFunction('setProviderPage','changeProviderPage');
const changePage=extractFunction('changeProviderPage','openModelPicker');
assert(setPage.includes('shouldAnimateProviderPageTransition(currentProviderPage,nextPage)'),
  'dot navigation must animate only to adjacent slides');
assert(changePage.includes('nextProviderPageIndex(currentProviderPage,direction,PROVIDER_ORDER.length)'),
  'arrow and swipe navigation must clamp at carousel edges instead of wrapping');
assert(html.includes("leftButton.disabled=currentProviderPage===0")&&html.includes("rightButton.disabled=currentProviderPage===PROVIDER_ORDER.length-1"),
  'arrow controls must expose their disabled state at the first and last provider');
assert(html.includes("document.addEventListener('touchcancel'"),
  'canceled mobile gestures must reset carousel swipe tracking');
assert.match(html,/\.model-page-dot:hover::before/,'hover should highlight a provider dot');
assert.match(html,/\.model-page-dot:focus-visible::before/,'keyboard focus should highlight a provider dot');
assert.match(html,/\.model-page-dot:focus-visible\s*\{[^}]*outline/s,'keyboard focus should be visible');
assert.match(html,/addEventListener\(['"]pointerover['"],event=>/,'hovering a provider dot should navigate immediately');
assert.match(html,/event\.pointerType!=='mouse'/,'touch and pen pointers must not trigger hover navigation');
assert.match(html,/setProviderPage\(index\)/,'hover should use the same real provider navigation handler as click');
assert.match(html,/\.model-page-dot::after\s*\{[^}]*content:\s*attr\(aria-label\)/s,'dot hover should show the provider name');
assert.match(html,/modelPageDots\?\.addEventListener\(['"]touchstart['"],event=>/,'touching a dot should start drag navigation');
assert.match(html,/document\.addEventListener\(['"]touchmove['"],event=>/,'dragging across the dots should track the finger');
assert.match(html,/document\.elementFromPoint\(touch\.clientX,touch\.clientY\)/,'drag navigation should identify the dot under the finger');
assert.match(html,/suppressModelDotClick/,'drag navigation should prevent the release click from jumping back');
assert.match(html,/modelDotTouchMoved/,'touch release should only suppress click after a drag');

console.log('PASS: model carousel navigation, mouse hover, mobile drag-across dots, accessible focus, and swipe cancellation.');
