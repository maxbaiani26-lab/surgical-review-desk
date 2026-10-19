/* Deterministic review organization. No language model or clinical inference. */
(function(root){
  'use strict';
  const normalized=s=>String(s||'').toLowerCase().normalize('NFKC').replace(/\s+/g,' ').trim();
  const terms=s=>[...new Set(String(s||'').split('\n').map(normalized).filter(Boolean))];
  function screen(record,required='',excluded=''){
    const text=normalized([record.title,...(record.abstracts||[]).map(a=>a.text)].join(' '));
    const missing=terms(required).filter(t=>!text.includes(t));
    const flags=terms(excluded).filter(t=>text.includes(t));
    const integrity=(record.notices||[]).some(n=>/retract|concern/i.test(n.type))||(record.types||[]).some(t=>/retract|concern/i.test(t));
    return {status:integrity?'Integrity notice':!(record.abstracts||[]).length?'No abstract — manual review':missing.length||flags.length?'Manual relevance check':'Candidate for relevance review',missing,flags,integrity};
  }
  function summarize(records,reviews,policyRows,policyVerified,searchComplete){
    let included=0,excluded=0,pending=0;
    for(const record of records){const r=reviews[record.pmid];if(r?.decision==='include'&&r.reason?.trim())included++;else if(r?.decision==='exclude'&&r.reason?.trim())excluded++;else pending++;}
    const usable=policyRows.filter(r=>r.clause?.trim());
    const substantiated=r=>r.document?.trim()&&r.fact?.trim();
    const conflict=usable.some(r=>r.status==='not_met'&&substantiated(r));
    const allMet=usable.length>0&&usable.every(r=>r.status==='met'&&substantiated(r));
    const outcome=!searchComplete?'Search incomplete — specialist review required':!policyVerified?'Policy unverified — specialist review required':conflict?'Reported policy conflict — specialist review required':pending?'Evidence screening unfinished — specialist review required':allMet&&included?'Entered policy criteria reported met — specialist confirmation required':'Specialist review required';
    return {included,excluded,pending,outcome,allMet,conflict};
  }
  root.EvidenceReview={screen,summarize,terms};if(typeof module!=='undefined')module.exports=root.EvidenceReview;
})(globalThis);
