'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {retrieveAll,buildQuery}=require('../pubmed.js');
const criteria=buildQuery({query:'Synthetic procedure'});
function fake(total){
 const calls=[];return {calls,async search(c,offset,size){calls.push({term:c.term,offset,size});const m=c.term.match(/\((\d+):(\d+)\[UID\]\)/);const lo=m?Math.max(1,+m[1]):1,hi=m?Math.min(total,+m[2]):total;const count=Math.max(0,hi-lo+1);return {count,ids:Array.from({length:Math.max(0,Math.min(size,count-offset))},(_,i)=>String(lo+offset+i)),messages:[],translation:'Synthetic search'};},async fetchRecords(ids){assert.ok(ids.length<=50);return ids.map(pmid=>({pmid,title:'Synthetic test record'}));}};
}
test('retrieves every page and every article, not first ten; display is independent',async()=>{
 const c=fake(437),all=[],progress=[];
 const r=await retrieveAll(c,criteria,{onBatch:b=>all.push(...b),onProgress:p=>progress.push(p)});
 assert.equal(r.count,437);assert.equal(all.length,437);assert.equal(new Set(all.map(x=>x.pmid)).size,437);assert.ok(c.calls.some(x=>x.offset===400));assert.equal(progress.at(-1).retrieved,437);
});
test('UID subdivision retrieves >10,000 records without ESearch truncation',async()=>{
 const c=fake(10013);let count=0;const r=await retrieveAll(c,criteria,{onBatch:b=>count+=b.length});
 assert.equal(count,10013);assert.equal(r.retrieved,10013);assert.ok(r.partitions.length>1);assert.ok(r.partitions.every(p=>p.count<=10000));assert.ok(c.calls.every(x=>x.offset<10000));
});
test('zero results completes without article requests',async()=>{const c=fake(0);c.fetchRecords=()=>{throw new Error('Must not fetch')};assert.equal((await retrieveAll(c,criteria)).retrieved,0);});
test('missing records and duplicate PMID pages fail, never report complete',async()=>{
 const c=fake(201);c.fetchRecords=async ids=>ids.slice(1).map(pmid=>({pmid}));await assert.rejects(retrieveAll(c,criteria),/not returned/);
 const d=fake(201),original=d.search;d.search=async(...args)=>{const r=await original(...args);if(args[1])r.ids=['1'];return r;};await assert.rejects(retrieveAll(d,criteria),/Duplicate PMID/);
});
test('count drift, truncated identifier page and API failure remain incomplete',async()=>{
 for(const kind of ['count','page','failure']){const c=fake(201),original=c.search;c.search=async(...args)=>{const r=await original(...args);if(args[1]){if(kind==='count')r.count++;if(kind==='page')r.ids=[];if(kind==='failure')throw new Error('Synthetic API failure');}return r;};await assert.rejects(retrieveAll(c,criteria),/changed|incomplete|failure/);}
});
test('cancellation retains already delivered records and prevents more batches',async()=>{
 const c=fake(437),controller=new AbortController();let count=0;
 await assert.rejects(retrieveAll(c,criteria,{signal:controller.signal,onBatch:b=>{count+=b.length;controller.abort();}}),/stopped/);assert.equal(count,50);
});
test('unexpected records cannot enter a completed review',async()=>{const c=fake(1);c.fetchRecords=async()=>[{pmid:'999'}];await assert.rejects(retrieveAll(c,criteria),/Unexpected/);});
