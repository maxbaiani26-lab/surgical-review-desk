'use strict';
/* State regression tests with a minimal DOM stub. These are not browser or layout tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
function setup() {
  const nodes=new Map();
  function node(id) {if(!nodes.has(id)) nodes.set(id,{id,value:id==='urgency'?'Routine':'',checked:false,innerHTML:'',textContent:'',dataset:{},disabled:false,events:{},className:'',classList:{add(){},remove(){},toggle(){}},addEventListener(type,fn){this.events[type]=fn},setAttribute(){},focus(){},reset(){},append(){},select(){},remove(){}});return nodes.get(id);}
  let clientCalls=0;
  const context={console,URL,Blob,Map,Set,Date,setTimeout,clearTimeout,PubMed:{...require('../pubmed.js'),createClient:()=>{clientCalls++;return {search:async()=>({ids:[],count:0,translation:'',messages:[]}),fetchRecords:async()=>[]}}},document:{getElementById:node,querySelector:()=>null,body:{append(){}},createElement:()=>({select(){},remove(){},click(){}}),execCommand:()=>true},navigator:{},confirm:()=>true};
  vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
  return {context,node,run:code=>vm.runInContext(code,context),clientCalls};
}
const fixture={pmid:'123456',title:'TEST FIXTURE — not a clinical citation',authors:['Fixture A'],year:'2020',journal:'Test journal',types:['Randomized Controlled Trial'],doi:'',pmc:'',abstracts:[],notices:[],pubmedURL:'https://pubmed.ncbi.nlm.nih.gov/123456/',retrievedAt:'2026-10-19T00:00:00Z',searchTerm:'test'};
test('intake editing drafts query locally; repeated generation and exports use fresh data',()=>{
  const t=setup();t.node('procedure').value='Test surgery';t.node('diagnosis').value='Test indication';t.node('reviewForm').events.input();
  assert.equal(t.node('pubmedQuery').value,'(Test surgery) AND (Test indication)');assert.equal(t.run('searches.length'),0);
  t.run('generate()');t.run('generate()');
  t.node('reviewNotes').value='Unresolved question';t.node('reviewForm').events.input();assert.match(t.run('buildBrief()'),/Unresolved question/);
  assert.match(t.run('buildBrief()'),/not an AI assessment/);
});
test('selected reference toggles, deduplicates by PMID, saves notes, exports and removes',()=>{
  const t=setup();t.context.fixture=fixture;t.run('articles.set(fixture.pmid,fixture)');
  const select=()=>t.node('searchResults').events.click({target:{closest:()=>({dataset:{select:fixture.pmid}})}});
  select();assert.equal(t.run('selected.size'),1);select();assert.equal(t.run('selected.size'),0);select();
  t.run('articles.set(fixture.pmid,{...fixture});');assert.equal(t.run('articles.size'),1);
  t.node('selectedRefs').events.input({target:{dataset:{pmid:fixture.pmid,note:'relevance'},value:'Reviewer test note'}});
  t.node('selectedRefs').events.input({target:{dataset:{pmid:fixture.pmid,note:'limitations'},value:'Abstract unavailable'}});
  const brief=t.run('buildBrief()');assert.match(brief,/Reviewer test note/);assert.match(brief,/Abstract unavailable/);assert.match(brief,/PMID: 123456/);assert.match(brief,/metadata and no abstract retrieved/);assert.match(brief,/full text not retrieved/);
  assert.match(t.run('articleHTML(fixture)'),/No abstract supplied/);
  t.node('selectedRefs').events.click({target:{closest:()=>({dataset:{remove:fixture.pmid}})}});assert.equal(t.run('selected.size'),0);
});
test('empty query makes no search session; no-result response is visible',async()=>{
  const t=setup();await t.run('runSearch()');assert.equal(t.run('searches.length'),0);assert.match(t.node('searchStatus').textContent,/Enter a PubMed query/);
  t.node('pubmedQuery').value='test';await t.run('runSearch()');assert.equal(t.run('searches.length'),1);assert.match(t.node('searchStatus').textContent,/No results/);
  assert.match(t.run('buildBrief()'),/Submitted: test/);assert.match(t.run('buildBrief()'),/Result count: 0/);
});
