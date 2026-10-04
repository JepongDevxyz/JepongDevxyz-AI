import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../map-autoembed.js',import.meta.url),'utf8');

function runEmbed(url, event='none'){
  const inserted=[];
  const link={href:url,dataset:{},nextSibling:null,parentNode:{insertBefore(node){inserted.push(node);}}};
  function makeElement(tag){
    return {
      tagName:String(tag).toUpperCase(),dataset:{},attrs:{},style:{},children:[],listeners:{},hidden:false,
      setAttribute(name,value){this.attrs[name]=value;},
      appendChild(child){child.parentNode=this;this.children.push(child);return child;},
      addEventListener(name,fn){this.listeners[name]=fn;},
      dispatch(name){this.listeners[name]?.({});},
    };
  }
  const document={
    body:{},head:{appendChild(){}},
    querySelectorAll:selector=>selector==='a[href]'?[link]:[],
    createElement:makeElement
  };
  class MutationObserver{observe(){}}
  vm.runInNewContext(source,{
    window:{},document,MutationObserver,
    atob:value=>Buffer.from(value,'base64').toString('binary'),
    setTimeout:(fn,delay=0)=>{if(delay<10000)fn();return 1;},setInterval:()=>{}
  });
  if(event!=='none'&&inserted[0]) {
    const frame=inserted[0].children.find(item=>item.tagName==='IFRAME');
    frame?.dispatch(event);
  }
  return inserted;
}

const safeHtml='<!doctype html><html><head><meta name="jd-map-document" content="v1"></head><body><div id="map"></div></body></html>';
const dataUrl='data:text/html;base64,'+Buffer.from(safeHtml).toString('base64');
const embedded=runEmbed(dataUrl);
assert.equal(embedded.length,1,'trusted generated map fallback should render inline');
const card=embedded[0];
assert.equal(card.tagName,'DIV','map has a visible loading card instead of an empty iframe gap');
const frame=card.children.find(item=>item.tagName==='IFRAME');
const status=card.children.find(item=>item.className==='jd-map-loading');
const fallback=card.children.find(item=>item.className==='jd-map-open-fallback');
assert.ok(frame,'map iframe is inside the loading card');
assert.equal(frame.src,dataUrl);
assert.equal(frame.attrs.loading,'eager','map loading starts immediately');
assert.equal(frame.attrs.sandbox,'allow-scripts','embedded HTML must not share the app origin');
assert.equal(frame.attrs.referrerpolicy,'no-referrer');
assert.ok(status && !status.hidden,'users see a loading state instead of a blank area');
assert.ok(fallback && fallback.hidden,'open-map fallback stays hidden while loading');

const loaded=runEmbed(dataUrl,'load')[0];
const loadedFrame=loaded.children.find(item=>item.tagName==='IFRAME');
assert.equal(loaded.dataset.state,'ready','loaded map transitions to ready state');
assert.equal(loaded.children.find(item=>item.className==='jd-map-loading').hidden,true);
assert.equal(loadedFrame.style.opacity,'1');

const failed=runEmbed(dataUrl,'error')[0];
assert.equal(failed.dataset.state,'error','failed map transitions to error state');
assert.equal(failed.children.find(item=>item.className==='jd-map-open-fallback').hidden,false,
  'failed map leaves a direct link instead of a blank gap');

assert.equal(runEmbed('data:text/html;base64,'+Buffer.from('<script>alert(1)</script>').toString('base64')).length,0,
  'unmarked model-provided HTML must never become an iframe');
assert.equal(runEmbed('https://public.blob.vercel-storage.com/jai-share/route-guimba-to-baguio.html').length,1,
  'uploaded route map pages should render inline');

console.log('PASS: maps load eagerly with loading/error states and retain iframe isolation');