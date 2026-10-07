import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../map-autoembed.js',import.meta.url),'utf8');

function runEmbed(url, event='none', linkCount=1, separateMessages=false){
  const inserted=[];
  function makeElement(tag){
    return {
      tagName:String(tag).toUpperCase(),dataset:{},attrs:{},style:{},children:[],listeners:{},hidden:false,
      setAttribute(name,value){this.attrs[name]=value;},
      appendChild(child){child.parentNode=this;this.children.push(child);return child;},
      addEventListener(name,fn){this.listeners[name]=fn;},
      dispatch(name){this.listeners[name]?.({});},
    };
  }
  const messages=[];
  function makeMessage(){
    const message={className:'msg bot',textContent:'Route map: Guimba → Baguio',children:[],embeds:[],insertBefore(node,reference){
      const index=reference?this.children.indexOf(reference):this.children.length;
      this.children.splice(index<0?this.children.length:index,0,node);
      node.parentNode=this;
      inserted.push(node);
      if(node.className==='jd-map-embed')this.embeds.push(node);
    },removeChild(node){node.removed=true;this.children=this.children.filter(child=>child!==node);},querySelectorAll(selector){
      return selector==='.jd-map-embed'?this.embeds:[];
    }};
    messages.push(message);
    return message;
  }
  const sharedMessage=makeMessage();
  const links=Array.from({length:linkCount},(_,index)=>{
    const message=separateMessages&&index?makeMessage():sharedMessage;
    const parent={tagName:'P',parentNode:message,textContent:'View route map inside the chat',children:[],insertBefore(node,reference){
      inserted.push(node);
      node.parentNode=message;
      if(node.className==='jd-map-embed')message.embeds.push(node);
    },removeChild(node){node.removed=true;this.children=this.children.filter(child=>child!==node);}};
    const link={href:url,dataset:{},textContent:'View route map inside the chat',nextSibling:null,parentNode:parent,closest(selector){
      return selector==='.msg.bot'?message:null;
    }};
    parent.children.push(link);
    message.children.push(parent);
    return link;
  });
  const document={
    body:{},head:{appendChild(){}},
    querySelectorAll:selector=>selector==='a[href]'?[
      ...links,
      ...inserted.flatMap(card=>card.children.filter(item=>item.tagName==='A'&&item.href))
    ]:[],
    createElement:makeElement
  };
  let onMutation;
  class MutationObserver{constructor(callback){onMutation=callback;}observe(){}}
  vm.runInNewContext(source,{
    window:{},document,MutationObserver,
    atob:value=>Buffer.from(value,'base64').toString('binary'),TextDecoder,
    setTimeout:(fn,delay=0)=>{if(delay<10000)fn();return 1;},setInterval:()=>{}
  });
  if(onMutation&&inserted.length)onMutation([{addedNodes:[inserted[0]]}]);
  if(event!=='none'&&inserted[0]) {
    const frame=inserted[0].children.find(item=>item.tagName==='IFRAME');
    frame?.dispatch(event);
  }
  inserted.sourceLinks=links;
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
assert.equal(frame.srcdoc,safeHtml,'trusted map HTML renders as srcdoc in the chat');
assert.equal(frame.src,undefined,'no data URL navigation is needed');
assert.equal(frame.attrs.loading,'eager','map loading starts immediately');
assert.equal(frame.attrs.sandbox,'allow-scripts','embedded HTML must not share the app origin');
assert.equal(frame.attrs.referrerpolicy,'strict-origin-when-cross-origin',
  'map tile requests need an identifying origin Referer under the OSM tile policy');
assert.match(frame.style.cssText,/height:clamp\(340px,56vh,500px\)/,
  'the map card should use the enlarged responsive map height');
assert.ok(status && !status.hidden,'users see a loading state instead of a blank area');
assert.ok(fallback && fallback.hidden,'open-map fallback stays hidden while loading');
assert.equal(fallback.dataset.jdMapEmbedded,undefined,'the fallback link remains a link and is never recursively embedded');
assert.equal(embedded.sourceLinks[0].parentNode.removed,true,
  'the visible source link should be replaced by the embedded map');

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
assert.equal(runEmbed('https://public.blob.vercel-storage.com/jai-share/route-guimba-to-baguio.html','none',2).length,1,
  'the same route URL should create only one map card inside a single assistant message');
assert.equal(runEmbed('https://public.blob.vercel-storage.com/jai-share/route-guimba-to-baguio.html','none',2,true).length,2,
  'separate assistant messages can each show the same route map');

console.log('PASS: maps load eagerly with loading/error states and retain iframe isolation');
