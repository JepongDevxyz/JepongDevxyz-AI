import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('async function measureNetworkPing()');
const end=html.indexOf('/* TEXT TO SPEECH ENGINE */',start);
assert(start>=0&&end>start,'real network monitor function must exist');
const monitorSource=html.slice(start,end);

async function runMonitor({online=true,fetchImpl=async()=>({ok:true})}={}){
  const reconnect=[];
  const pingText={innerText:'Checking...',style:{}};
  const bars=Array.from({length:4},()=>({
    style:{},
    active:true,
    classList:{
      add(){this.owner.active=true},
      remove(){this.owner.active=false},
      owner:null
    }
  }));
  bars.forEach(bar=>{bar.classList.owner=bar});
  const context={
    document:{getElementById(id){return id==='pingText'?pingText:bars[Number(id.slice(3))-1]}},
    navigator:{onLine:online},
    fetch:fetchImpl,
    performance:{now:()=>100},
    setReconnectVisible:visible=>reconnect.push(visible)
  };
  await vm.runInNewContext(`(async()=>{${monitorSource}\nawait measureNetworkPing()})()`,context);
  return {pingText,bars,reconnect};
}

const failed=await runMonitor({fetchImpl:async()=>{throw new Error('Failed to fetch')}});
assert.equal(failed.pingText.innerText,'Offline','failed connectivity probe must report offline');
assert(failed.bars.every(bar=>!bar.active&&bar.style.backgroundColor==='var(--sig-bad)'),
  'failed connectivity probe must not paint healthy signal bars');
assert.equal(failed.reconnect.at(-1),true,'failed connectivity probe must show reconnect card');

const restored=await runMonitor();
assert.equal(restored.reconnect.at(-1),false,'successful connectivity probe must dismiss reconnect card');

console.log('PASS: failed connection probes show Offline + reconnect; successful probes restore the online state.');
