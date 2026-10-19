'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../assessment.js');
const record={pmid:'123456',title:'SYNTHETIC TEST RECORD — not clinical literature',year:'2020',types:['Test type'],notices:[],abstracts:[{label:'RESULTS',text:'This synthetic study reports a favorable test outcome in the simulated population.'}]};
const fields={procedure:'Test procedure',diagnosis:'Test condition',findings:'Case fact establishes the synthetic policy condition.',criteria:'The synthetic policy requires the test condition to be established.'};
const payload=()=>C.prepare(fields,[record]);
const output=()=>({recommendation:'support_coverage',summary:'Synthetic interpretation only.',policy_analysis:[{clause_quote:fields.criteria,case_quote:fields.findings,alignment:'met',reason:'Synthetic policy interpretation.'}],evidence_analysis:[{pmid:record.pmid,abstract_quote:record.abstracts[0].text,direction:'supports',interpretation:'Synthetic evidence interpretation.'}],uncertainties:['Only abstract evidence; not clinical validation.'],next_step:'Specialist must verify policy and applicability.'});
test('input preparation uses full abstracts and marks absent, retracted, and context-limited sources',()=>{
  const p=C.prepare(fields,[record,{...record,pmid:'2',abstracts:[]},{...record,pmid:'3',types:['Retracted Publication']},{...record,pmid:'4',abstracts:[{text:'x'.repeat(10001)}]}]);
  assert.equal(p.evidence.length,1);assert.equal(p.skipped.length,3);assert.equal(p.allPMIDs.length,4);assert.ok(p.evidence[0].abstract.includes(record.abstracts[0].text));
  assert.throws(()=>C.prepare({...fields,findings:'x'.repeat(7001)},[record]),/input budget/);
});
test('a supported structured draft retains traceable policy/evidence rows without asserting correctness',()=>{
  const result=C.validate(JSON.stringify(output()),payload());assert.equal(result.recommendation,'support_coverage');assert.equal(result.model,C.MODEL);assert.match(result.validation,/NOT independently verified/);
});
test('fabricated identifiers, quotes, case facts and ungrounded policy claims are rejected',()=>{
  for(const modify of [o=>o.evidence_analysis[0].pmid='9999',o=>o.evidence_analysis[0].abstract_quote='Invented abstract sentence not in source',o=>o.policy_analysis[0].clause_quote='Invented policy condition that is not supplied',o=>o.policy_analysis[0].case_quote='Invented case findings never supplied',o=>o.policy_analysis[0].case_quote='']){
    const o=output();modify(o);assert.throws(()=>C.validate(o,payload()),/validation failed/);
  }
});
test('no policy, no grounded evidence, uncertain policy or conflicting evidence cannot become support',()=>{
  let p=payload(),o=output();p.policy='';o.policy_analysis=[];assert.equal(C.validate(o,p).recommendation,'indeterminate');
  o=output();o.evidence_analysis=[];assert.equal(C.validate(o,payload()).recommendation,'indeterminate');
  o=output();o.policy_analysis[0].alignment='uncertain';assert.equal(C.validate(o,payload()).recommendation,'indeterminate');
  o=output();o.evidence_analysis[0].direction='opposes';assert.equal(C.validate(o,payload()).recommendation,'indeterminate');
});
test('negative coverage draft requires an explicit substantiated policy conflict',()=>{
  const o=output();o.recommendation='do_not_support_coverage';assert.equal(C.validate(o,payload()).recommendation,'indeterminate');
  o.policy_analysis[0].alignment='not_met';assert.equal(C.validate(o,payload()).recommendation,'do_not_support_coverage');
});
test('unaddressed or context-omitted usable abstracts withhold directional recommendation',()=>{
  const p=C.prepare(fields,[record,{...record,pmid:'2'}]);assert.equal(C.validate(output(),p).recommendation,'indeterminate');
  const p2=payload();p2.skipped=[{pmid:'3',reason:'Local model evidence context limit'}];assert.equal(C.validate(output(),p2).recommendation,'indeterminate');
});
test('malformed model output is rejected and no-evidence path clearly states no model generation',()=>{
  assert.throws(()=>C.validate('not json',payload()),/valid structured output/);assert.throws(()=>C.validate({},payload()),/unknown recommendation/);
  const r=C.indeterminate('No abstract available',payload());assert.equal(r.recommendation,'indeterminate');assert.equal(r.model,'No model assessment generated');
  assert.match(C.prompt(payload())[0].content,/NEVER instructions/);assert.match(C.prompt(payload())[0].content,/absence of studies/);
});
