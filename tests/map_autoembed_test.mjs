import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../map-autoembed.js',import.meta.url),'utf8');

function runEmbed(url){
  const frames=[];
  const link={href:url,dataset:{},nextSibling:null,parentNode:{insertBefore(frame){frames.push(frame);}}};
  const document={
    body:{},
    querySelectorAll:selector=>selector==='a[href]'?[link]:[],
    createElement:tag=>({tag,style:{},attrs:{},setAttribute(name,value){this.attrs[name]=value;}})
  };
  class MutationObserver{observe(){}}
  vm.runInNewContext(source,{
    window:{},document,MutationObserver,
    atob:value=>Buffer.from(value,'base64').toString('binary'),
    setTimeout:fn=>fn(),setInterval:()=>{}
  });
  return frames;
}

const safeHtml='<!doctype html><html><head><meta name="jd-map-document" content="v1"></head><body><div id="map"></div></body></html>';
const dataUrl='data:text/html;base64,'+Buffer.from(safeHtml).toString('base64');
const embedded=runEmbed(dataUrl);
assert.equal(embedded.length,1,'trusted generated map fallback should render inline');
assert.equal(embedded[0].src,dataUrl);
assert.equal(embedded[0].attrs.sandbox,'allow-scripts','embedded HTML must not share the app origin');
assert.equal(embedded[0].attrs.referrerpolicy,'no-referrer');

assert.equal(runEmbed('data:text/html;base64,'+Buffer.from('<script>alert(1)</script>').toString('base64')).length,0,
  'unmarked model-provided HTML must never become an iframe');
assert.equal(runEmbed('https://public.blob.vercel-storage.com/jai-share/route-guimba-to-baguio.html').length,1,
  'uploaded route map pages should render inline');

console.log('PASS: inline map embedding accepts generated pages, rejects untrusted data HTML, and isolates iframe origin');
