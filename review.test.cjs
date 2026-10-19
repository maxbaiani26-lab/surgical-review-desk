const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../review.js');
const record={pmid:'1',title:'Synthetic lumbar surgery',abstracts:[{text:'Adults undergoing decompression; fictional animal comparator.'}],types:[],notices:[]};
test('phrase flags are explicit and do not auto-exclude or claim clinical inference',()=>{
 const r=R.screen(record,'lumbar\nadults','animal');assert.deepEqual(r.missing,[]);assert.deepEqual(r.flags,['animal']);assert.equal(r.status,'Manual relevance check');assert.equal(r.decision,undefined);
 assert.equal(R.screen({...record,abstracts:[]}).status,'No abstract — manual review');assert.equal(R.screen({...record,types:['Retracted Publication']}).integrity,true);
});
test('inclusion and exclusion require reasons; missing reasons stay pending',()=>{
 const rows=[record,{...record,pmid:'2'},{...record,pmid:'3'}];const s=R.summarize(rows,{'1':{decision:'include',reason:'Relevant fictional population'},'2':{decision:'exclude',reason:'Wrong fictional procedure'},'3':{decision:'exclude',reason:''}},[],false,true);assert.equal(s.included,1);assert.equal(s.excluded,1);assert.equal(s.pending,1);
});
test('partial search, unverified policy and undocumented comparisons never imply criteria met',()=>{
 const p=[{clause:'Exact fictional policy',status:'met',fact:'Reported fact',document:'Source p1'}];const reviewed={'1':{decision:'include',reason:'Fictional relevance'}};
 assert.match(R.summarize([record],reviewed,p,true,false).outcome,/Search incomplete/);
 assert.match(R.summarize([record],reviewed,p,false,true).outcome,/Policy unverified/);
 assert.equal(R.summarize([record],reviewed,[{...p[0],document:''}],true,true).allMet,false);
 assert.match(R.summarize([record],reviewed,p,true,true).outcome,/reported met/);
 assert.match(R.summarize([record],reviewed,[{...p[0],status:'not_met'}],true,true).outcome,/Reported policy conflict/);
});
