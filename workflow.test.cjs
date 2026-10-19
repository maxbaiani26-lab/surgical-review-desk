const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function setup({fail=false}={}){
 const nodes=new Map(),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]));
 const node=id=>{if(!ids.has(id)&&!['copyBtn','downloadBtn','auditBtn'].includes(id))throw new Error('Missing HTML element '+id);if(!nodes.has(id))nodes.set(id,{id,value:'',checked:false,disabled:false,textContent:'',innerHTML:'',classList:{toggle(){},add(){},remove(){}},querySelectorAll(){return[]},events:{},addEventListener(type,fn){this.events[type]=fn},reset(){}});return nodes.get(id);};
 const records=Array.from({length:53},(_,i)=>({pmid:String(i+1),title:'SYNTHETIC study '+i,authors:['Fixture A'],year:'2020',journal:'Synthetic journal',types:[],notices:[],abstracts:[{text:'Synthetic abstract for workflow testing only.'}],pubmedURL:'https://pubmed.ncbi.nlm.nih.gov/'+(i+1)+'/'}));let requests=0;
 const PubMed={buildQuery:require('../pubmed.js').buildQuery,createClient:()=>({}),retrieveAll:async(c,criteria,options)=>{requests++;options.onProgress({total:53,translation:'Synthetic translation',partitions:[],retrieved:0,phase:'Testing'});options.onBatch(records);if(fail)throw new Error('Synthetic retrieval error');return {count:53,translation:'Synthetic translation',partitions:[],completedAt:'2026-10-19'};}};
 const ctx={ProcedureCatalog:require('../procedures.js'),EvidenceReview:require('../review.js'),PubMed,document:{getElementById:node},window:{},navigator:{},Map,Set,Date,AbortController,URL,Blob,setTimeout,clearTimeout,confirm:()=>true};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
 return {node,run:s=>vm.runInContext(s,ctx),requests:()=>requests};
}
test('HTML IDs are unique and example fills every intake field without a request',()=>{
 const all=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(all.length,new Set(all).size);
 const t=setup();t.node('sampleBtn').onclick();assert.equal(t.run('fieldIDs.every(k=>$(k).value.trim())'),true);assert.equal(t.node('policyVerified').checked,false);assert.equal(t.requests(),0);assert.match(t.node('criteria').value,/FICTIONAL/);assert.ok(!html.includes('assessment-worker'));assert.ok(!html.includes('CPU · Prototype'));
});
test('display pagination preserves every record in report and full audit',async()=>{
 const t=setup();t.node('sampleBtn').onclick();t.node('recordFilter').value='all';await t.run('assess()');assert.equal(t.run('articles.size'),53);assert.equal(t.run('search.complete'),true);assert.equal((t.node('searchResults').innerHTML.match(/<article /g)||[]).length,25);assert.match(t.run('report()'),/PMID 53/);assert.equal(t.run('audit().records.length'),53);assert.match(t.run('summary().outcome'),/Policy unverified/);
 t.node('nextPage').onclick();t.node('nextPage').onclick();assert.equal((t.node('searchResults').innerHTML.match(/<article /g)||[]).length,3);
});
test('partial results remain exportable with explicit incomplete status',async()=>{
 const t=setup({fail:true});t.node('sampleBtn').onclick();await t.run('assess()');assert.equal(t.run('search.complete'),false);assert.equal(t.run('articles.size'),53);assert.match(t.run('report()'),/Incomplete retrieval/);assert.match(t.run('summary().outcome'),/Search incomplete/);assert.equal(t.run('busy'),false);
});
test('clinical changes invalidate retrieved evidence and relevance decisions',async()=>{
 const t=setup();t.node('sampleBtn').onclick();await t.run('assess()');t.node('reviewForm').events.change({target:{id:'specialty'}});assert.equal(t.run('articles.size'),0);assert.equal(t.run('search'),null);
});
