'use strict';
/* Workflow-state tests with a minimal DOM stub, not browser or AI inference tests. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const Coverage=require('../assessment.js');const PubMed=require('../pubmed.js');
const fixture={pmid:'123456',title:'SYNTHETIC TEST RECORD — not a clinical citation',authors:['Fixture A'],year:'2020',journal:'Test journal',types:[],doi:'',pmc:'',abstracts:[{text:'Synthetic abstract describes a favorable outcome in a simulated study population.'}],notices:[],pubmedURL:'https://pubmed.ncbi.nlm.nih.gov/123456/'};
function setup({records=[fixture],networkError=false}={}){
 const nodes=new Map(),requests=[];
 const node=id=>{if(!nodes.has(id))nodes.set(id,{id,value:id==='urgency'?'Routine':'',checked:false,innerHTML:'',textContent:'',disabled:false,events:{},className:'',classList:{add(){},remove(){},toggle(){}},addEventListener(t,f){this.events[t]=f},setAttribute(){},querySelectorAll(){return[]},focus(){},reset(){}});return nodes.get(id)};
 const context={Coverage,PubMed:{...PubMed,createClient:()=>({search:async criteria=>{requests.push(criteria);if(networkError)throw new Error('Network blocked');return {ids:records.map(r=>r.pmid),count:records.length,translation:'synthetic translation',messages:[]}},fetchRecords:async()=>records})},window:{isSecureContext:true},navigator:{},console,URL,Blob,Map,Set,Date,setTimeout,clearTimeout,document:{getElementById:node},confirm:()=>true};
 vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),context);
 return {context,node,requests,run:code=>vm.runInContext(code,context)};
}
function fill(t){t.node('procedure').value='Test procedure';t.node('diagnosis').value='Test indication';t.node('findings').value='Synthetic clinical fact for testing.';t.node('criteria').value='The synthetic policy requires an established test indication.';}
test('typing drafts local query, never starts network; completeness checklist is absent',()=>{
 const t=setup();fill(t);t.node('reviewForm').events.input();assert.equal(t.requests.length,0);assert.equal(t.node('pubmedQuery').value,'(Test procedure) AND (Test indication)');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');assert.ok(!html.includes('Completeness checks'));assert.ok(!html.includes('id="specialist"'));
});
test('one action includes every returned record; model-unavailable state never invents a recommendation',async()=>{
 const t=setup();fill(t);await t.run('assess()');assert.equal(t.requests.length,1);assert.equal(t.run('articles.size'),1);assert.equal(t.run('assessment.recommendation'),'indeterminate');
 assert.match(t.node('searchStatus').textContent,/WebGPU/);const report=t.run('buildBrief()');assert.match(report,/PMID: 123456/);assert.match(report,/Automatically included/);assert.match(report,/No model assessment generated/);
});
test('successful mocked local generation is grounded; editing case clears assessment and evidence',async()=>{
 const t=setup();fill(t);
 t.run(`localInference=async payload=>JSON.stringify({recommendation:'support_coverage',summary:'Synthetic draft',policy_analysis:[{clause_quote:payload.policy,case_quote:'Synthetic clinical fact for testing.',alignment:'met',reason:'Synthetic interpretation'}],evidence_analysis:[{pmid:'123456',abstract_quote:'Synthetic abstract describes a favorable outcome in a simulated study population.',direction:'supports',interpretation:'Synthetic interpretation'}],uncertainties:['Abstract only'],next_step:'Specialist review required'})`);
 await t.run('assess()');assert.equal(t.run('assessment.recommendation'),'support_coverage');assert.match(t.run('buildBrief()'),/Synthetic draft/);
 t.node('findings').value='Changed';t.node('reviewForm').events.input();assert.equal(t.run('assessment'),null);assert.equal(t.run('articles.size'),0);assert.match(t.run('buildBrief()'),/No AI coverage assessment has been completed/);
});
test('no results and API failure remain indeterminate and do not invoke model',async()=>{
 for(const options of [{records:[]},{networkError:true}]){const t=setup(options);fill(t);t.run('localInference=async()=>{throw new Error("MODEL MUST NOT RUN")}');await t.run('assess()');assert.equal(t.run('assessment.recommendation'),'indeterminate');assert.ok(!t.node('searchStatus').textContent.includes('MODEL MUST NOT RUN'));}
});
test('empty procedure or indication starts no network request',async()=>{
 const t=setup();await t.run('assess()');assert.equal(t.requests.length,0);assert.match(t.node('searchStatus').textContent,/procedure and clinical indication/);
});
