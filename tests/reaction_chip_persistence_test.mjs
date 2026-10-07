import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=readFileSync(new URL('../reactions-v2.js',import.meta.url),'utf8');
const start=source.indexOf('  function renderAiChip(userEl) {');
const end=source.indexOf('\n  function removeMarkerText',start);
assert(start>=0&&end>start,'real AI reaction renderer is present');
const renderSource=source.slice(start,end).trim();

function makeElement(tag){
  const node={
    tagName:String(tag).toUpperCase(),className:'',title:'',style:{},attrs:{},children:[],listeners:{},
    parentNode:null,_text:'',
    get textContent(){return this._text+this.children.map(child=>child.textContent).join('');},
    set textContent(value){this._text=String(value);this.children=[];},
    setAttribute(name,value){this.attrs[name]=value;},
    addEventListener(name,fn){this.listeners[name]=fn;},
    appendChild(child){child.parentNode=this;this.children.push(child);return child;},
    remove(){if(this.parentNode){const i=this.parentNode.children.indexOf(this);if(i>=0)this.parentNode.children.splice(i,1);this.parentNode=null;}},
    dispatch(name){this.listeners[name]?.({stopPropagation(){}});}
  };
  return node;
}
const actions={children:[],querySelector(selector){return selector===':scope > .jd-ai-reaction'?this.children.find(child=>child.className.indexOf('jd-ai-reaction')!==-1)||null:null;},
  appendChild(child){child.parentNode=this;this.children.push(child);return child;}};
const userEl={querySelector(selector){return selector===':scope > .user-actions'?actions:null;}};
const state={emoji:'❤️',dismissed:false};
const document={createElement:makeElement};
const renderAiChip=new Function('AI_EMOJI_ALLOW','document','isAiDismissed','getAiReaction','setAiDismissed','setAiReaction',
  'return ('+renderSource+');')(
  ['❤️','👍','😂','😮','😢','🔥','🎉','🤔','👏','🙏'],
  document,
  ()=>state.dismissed,
  ()=>state.emoji,
  ()=>{state.dismissed=true;},
  (_user,emoji)=>{state.emoji=emoji;}
);

renderAiChip(userEl);
const chip=actions.querySelector(':scope > .jd-ai-reaction');
assert.ok(chip,'AI reaction appears in the user message');
assert.equal(chip.textContent,'❤️');
chip.dispatch('click');
assert.equal(actions.querySelector(':scope > .jd-ai-reaction'),chip,
  'tapping the AI reaction must not remove the user-message chip');
assert.equal(state.emoji,'❤️','tapping preserves the stored reaction');
assert.equal(state.dismissed,false,'tapping does not mark the reaction dismissed');
console.log('PASS: tapping an AI reaction leaves it visible and persisted on the user message');