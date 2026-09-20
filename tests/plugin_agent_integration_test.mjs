import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('agent.js','utf8');
const page=fs.readFileSync('index.html','utf8');
const plugins=fs.readFileSync('plugins.js','utf8');
assert(page.includes('src="/agent.js" defer'));
assert(page.includes("window.JDPlugins?.openAgent?.(message.slice(6).trim())"));
assert(page.includes('window.getJDPluginActiveModel = () =>'));
assert(plugins.includes('stageAgentFiles(files)'));

const elements=new Map(),calls=[];
class Element{
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.handlers={};
  this.hidden=false;this.disabled=false;this.value='';this.textContent='';
 }
 set id(value){this._id=value;elements.set(value,this);}
 get id(){return this._id;}
 set innerHTML(html){
  this._html=html;this.children=[];
  for(const match of html.matchAll(/<([a-z][\w-]*)\b[^>]*\bid="([^"]+)"[^>]*>/gi)){
   const node=new Element(match[1]);node.id=match[2];
   node.hidden=/\shidden(?:\s|>|=)/.test(match[0]);
  }
 }
 addEventListener(event,handler){this.handlers[event]=handler;}
 querySelector(selector){return elements.get(selector.slice(1))||null;}
 replaceChildren(...children){this.children=[...children];}
 append(...children){this.children.push(...children);}
 focus(){}
 click(){return this.handlers.click?.({target:this});}
 setAttribute(){}
}
const doc={createElement:tag=>new Element(tag),body:new Element('body')};
const ctx={github:{enabled:true,repo:'owner/project',ref:'main'},superpowers:{enabled:true,phase:'auto'}};
let staged=null,chatCalls=0,mutatingCalls=0;
const sandbox={
 document:doc,window:{
  JDPlugins:{
   contextForChat:()=>ctx,
   stageAgentFiles:files=>{staged=files;return true;}
  },
  getJDPluginActiveModel:()=>({provider:'groq',model:'openai/gpt-oss-20b'})
 },
 AbortController,TextEncoder,console,
 fetch:async(url,options={})=>{
  calls.push({url,body:JSON.parse(options.body||'{}')});
  if(options.method!=='POST')mutatingCalls++;
  const data=JSON.parse(options.body||'{}');
  if(url==='/api/plugins'){
   if(data.action==='list'&&data.path==='')return Response.json({entries:[
    {type:'file',name:'README.md',path:'README.md',size:600},
    {type:'dir',name:'src',path:'src',size:0}
   ]});
   if(data.action==='list'&&data.path==='src')return Response.json({entries:[
    {type:'file',name:'app.js',path:'src/app.js',size:26},
    {type:'file',name:'other.js',path:'src/other.js',size:80}
   ]});
   if(data.action==='read'&&data.path==='src/app.js')return Response.json({content:'export const version = 1;\n'});
   throw Error('Unexpected repository operation: '+data.action+' '+data.path);
  }
  if(url==='/api/chat'){
   chatCalls++;
   assert.equal(data.provider,'groq');
   assert.equal(data.model,'openai/gpt-oss-20b');
   assert.deepEqual(data.plugins,ctx);
   return Response.json(chatCalls===1?
    {paths:['src/app.js'],plan:'Fix source version'}:
    {summary:'Update source version',files:[{path:'src/app.js',content:'export const version = 2;\n'}]});
  }
  throw Error('Unexpected network request: '+url);
 }
};
const vmContext=vm.createContext(sandbox);
vm.runInContext(source,vmContext,{filename:'agent.js'});
const agent=sandbox.window.JDCodingAgent;
assert(agent);
agent.open('Fix the version in src/app.js');
const get=id=>elements.get(id);
assert.equal(get('jdAgentTask').value,'Fix the version in src/app.js');
await get('jdAgentStart').click();
assert.equal(chatCalls,2,'agent must inspect, plan and draft through the selected model; status: '+get('jdAgentStatus').textContent+'; calls: '+JSON.stringify(calls.map(x=>x.url)));
assert.equal(get('jdAgentReview').hidden,false);
assert.match(get('jdAgentStatus').textContent,/Draft ready/);
assert.equal(staged,null,'AI must not directly write to GitHub');
assert.equal(mutatingCalls,0);
assert.equal(calls.filter(x=>x.url==='/api/plugins'&&x.body.action==='read').length,1);
get('jdAgentStage').click();
assert.equal(staged.length,1);
assert.equal(staged[0].path,'src/app.js');
assert.equal(staged[0].content,'export const version = 2;\n');
assert.equal(get('jdAgentOverlay').hidden,true);
console.log('PASS: selected-model repository inspection, bounded AI draft, full-source preview and user-staged PR action');
