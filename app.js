'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textFields=['procedure','specialty','urgency','diagnosis','setting','symptoms','findings','treatment','factors','criteria','literature','reviewNotes'];
const fieldLabels={procedure:'Procedure',specialty:'Specialty',urgency:'Requested timing',diagnosis:'Indication',setting:'Planned setting',symptoms:'Symptoms and functional impact',findings:'Objective findings',treatment:'Prior treatment and response',factors:'Patient-specific factors',criteria:'User-supplied coverage policy',literature:'Manual references (unverified)',reviewNotes:'Reviewer notes'};
const articles=new Map();
let assessment=null, assessmentInput=null, runFields=null, currentSearch=null, busy=false, queryTouched=false, revision=0, worker=null, workerReject=null;
const readFields=()=>Object.fromEntries(textFields.map(id=>[id,$(id).value.trim()]));
function notice(message,error=false){$('searchStatus').textContent=message;$('searchStatus').className='search-status'+(error?' error':'');}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2000);}
function draftQuery(force=false){
  if(queryTouched&&!force)return;
  $('pubmedQuery').value=[$('procedure').value.trim(),$('diagnosis').value.trim()].filter(Boolean).map(s=>'('+s+')').join(' AND ');
}
function sourceText(ref){return `${ref.title}\nAuthors: ${ref.authors.join('; ')||'Unavailable'}\nYear: ${ref.year||'Unavailable'} | Journal: ${ref.journal||'Unavailable'}\nPMID: ${ref.pmid}\nDOI: ${ref.doi||'Unavailable'}\nPublication types: ${ref.types.join('; ')||'Unavailable'}\nPubMed: ${ref.pubmedURL}${ref.doi?'\nPublisher link: https://doi.org/'+encodeURI(ref.doi):''}${ref.pmc?'\nPMC link: https://pmc.ncbi.nlm.nih.gov/articles/'+ref.pmc+'/':''}\nRetrieved: ${ref.retrievedAt}\nNotices: ${ref.notices.map(n=>n.type+(n.pmid?' (PMID '+n.pmid+')':'')).join('; ')||'None supplied; not a complete integrity check'}\nAutomatically included. ${ref.abstracts.length?'Abstract available':'No abstract supplied'}; full text not retrieved.\nModel use: ${assessment?.analyzedPMIDs.includes(ref.pmid)?'Supplied for analysis':assessmentInput?.skipped.find(s=>s.pmid===ref.pmid)?.reason||'No completed analysis'}\nABSTRACT:\n${Coverage.abstractText(ref)||'Unavailable'}`;}
function buildBrief(){
  const fields=runFields||readFields(),s=currentSearch;
  const result=assessment?`DRAFT COVERAGE ASSESSMENT\n${Coverage.labels[assessment.recommendation]}\n${assessment.summary}\n\nPOLICY ANALYSIS\n${assessment.policy_analysis.map(p=>`Policy clause: "${p.clause_quote}"\nCase fact: "${p.case_quote||'Unknown'}"\nAlignment: ${p.alignment}\nReason: ${p.reason}`).join('\n\n')||'No substantiated clause comparison.'}\n\nEVIDENCE ANALYSIS\n${assessment.evidence_analysis.map(e=>`PMID ${e.pmid} | ${e.direction}\nAbstract quote: "${e.abstract_quote}"\nInterpretation: ${e.interpretation}`).join('\n\n')||'No completed abstract analysis.'}\n\nUNCERTAINTIES\n${assessment.uncertainties.map(s=>'- '+s).join('\n')}\n\nNEXT STEP\n${assessment.next_step}\n\nModel: ${assessment.model}\nGenerated at: ${assessment.generatedAt}\nValidation: ${assessment.validation}\nSupplied for model analysis: ${assessment.analyzedPMIDs.join(', ')||'None'}\nNot supplied: ${assessment.skipped.map(s=>s.pmid+' — '+s.reason).join('; ')||'None'}\n`:'No AI coverage assessment has been completed. This is a case/evidence export only.\n';
  return `SURGIREVIEW — EVIDENCE-ASSISTED COVERAGE DRAFT\nExported at: ${new Date().toISOString()}\n\n${result}\nCASE SNAPSHOT\n${textFields.map(id=>`${fieldLabels[id]}: ${fields[id]||'Not supplied'}`).join('\n\n')}\n\nPUBMED SEARCH\n${s?`Submitted query: ${s.criteria.query}\nExact search term: ${s.criteria.term}\nFilters: from ${s.criteria.from||'any'} through ${s.criteria.to||'any'}; type ${s.criteria.type||'all'}; sort ${s.criteria.sort}\nNCBI translation: ${s.translation||'Unavailable'}\nRetrieved at: ${s.retrievedAt||'Not retrieved'}\nTotal matches: ${s.count??'Unavailable'}\nRecords included: ${articles.size}\nNCBI messages: ${s.messages.join('; ')||'None'}\nStatus: ${s.status}${s.error?'\nError: '+s.error:''}`:'No search completed.'}\n\nAUTOMATICALLY INCLUDED PUBMED RECORDS\n${[...articles.values()].map(sourceText).join('\n\n---\n\n')||'None'}\n\nLIMITATIONS\nThis unvalidated, nonbinding draft is not an insurer authorization or treatment recommendation. Clinical evidence and policy eligibility are distinct. A limited search of up to ten records is not a systematic review. Source quote presence does not verify clinical correctness or policy interpretation. Evidence absence never establishes noncoverage. A qualified specialist must review the full sources and applicable plan. The model retrieves no full text.\n\nApp: https://maxbaiani26-lab.github.io/surgical-review-desk/\nNCBI data: https://www.ncbi.nlm.nih.gov/\nNCBI Disclaimer and Copyright: https://www.ncbi.nlm.nih.gov/About/disclaimer.html\n`;
}
function renderAssessment(){
  const r=assessment;
  if(!r){$('resultArea').innerHTML='<div class="result-body"><div class="empty-panel">No current coverage assessment. Enter the case and policy, then choose Search evidence &amp; assess coverage. Editing the inputs clears the previous assessment.</div></div>';return;}
  const state=r.recommendation==='support_coverage'?'ready':'gaps';
  $('resultArea').innerHTML=`<div class="result-top"><div class="result-label">Nonbinding assessment draft</div><div class="status ${state}"><span class="dot"></span><span>${Coverage.labels[r.recommendation]}</span></div></div><div class="result-body"><p style="font-size:13px">${esc(r.summary)}</p><div class="rule"></div><h3>Why: policy and case</h3>${r.policy_analysis.map(p=>`<div class="assessment-block"><p><b>${esc(p.alignment.replace('_',' '))}</b> — ${esc(p.reason)}</p><blockquote>Policy: ${esc(p.clause_quote)}</blockquote><p>Case: ${esc(p.case_quote||'Not established from the case')}</p></div>`).join('')||'<p class="disclaimer">No substantiated policy comparison is available.</p>'}<div class="rule"></div><h3>Why: retrieved PubMed evidence</h3>${r.evidence_analysis.map(e=>`<div class="assessment-block"><p><a href="https://pubmed.ncbi.nlm.nih.gov/${e.pmid}/" target="_blank" rel="noopener noreferrer"><b>PMID ${e.pmid}</b></a> · ${esc(e.direction)}</p><p>${esc(e.interpretation)}</p><blockquote>${esc(e.abstract_quote)}</blockquote></div>`).join('')||'<p class="disclaimer">No substantiated abstract analysis is available.</p>'}<div class="rule"></div><h3>Uncertainty and limitations</h3><ul style="padding-left:18px;font-size:12px">${r.uncertainties.map(u=>'<li>'+esc(u)+'</li>').join('')}</ul><p class="disclaimer">${esc(r.validation)}</p><p class="disclaimer" style="margin-top:8px">Limited search of up to ten records; not a systematic review. Model interpretation can be wrong even when quotes match.</p><div class="rule"></div><h3>Next step</h3><p style="font-size:12px">${esc(r.next_step)}</p><p class="assessment-footer">Model: ${esc(r.model)}<br>${esc(r.generatedAt)}<br>Abstracts supplied for analysis: ${r.analyzedPMIDs.length}<br>${r.skipped.length?'Not analyzed: '+r.skipped.map(s=>esc(s.pmid+' — '+s.reason)).join('; '):''}</p><div class="actions" style="margin-top:16px"><button type="button" class="btn secondary" id="copyBtn">Copy assessment</button><button type="button" class="btn secondary" id="downloadBtn">Download report</button></div></div>`;
  $('copyBtn').addEventListener('click',copyBrief);$('downloadBtn').addEventListener('click',downloadBrief);
}
function articleHTML(ref){
  const notices=ref.notices.filter(n=>/retract|correct|errat|concern/i.test(n.type));
  const note=assessmentInput?.skipped.find(s=>s.pmid===ref.pmid)?.reason;
  return `<article class="article"><h4>${esc(ref.title)}</h4><p class="authors">${esc(ref.authors.join('; ')||'Authors unavailable')}</p><p>${esc(ref.journal||'Journal unavailable')} · ${esc(ref.year||'Year unavailable')}<br>Types: ${esc(ref.types.join('; ')||'Unavailable')}<br>PMID ${ref.pmid}${ref.doi?' · DOI '+esc(ref.doi):' · DOI unavailable'}</p>${notices.length?'<div class="flags">'+notices.map(n=>esc(n.type)+(n.pmid?' — PMID '+esc(n.pmid):'')).join('<br>')+'</div>':''}<div class="article-links"><a href="${ref.pubmedURL}" target="_blank" rel="noopener noreferrer">PubMed record ↗</a>${ref.doi?`<a href="https://doi.org/${esc(encodeURI(ref.doi))}" target="_blank" rel="noopener noreferrer">Publisher / DOI ↗</a>`:''}${ref.pmc?`<a href="https://pmc.ncbi.nlm.nih.gov/articles/${ref.pmc}/" target="_blank" rel="noopener noreferrer">PMC full text ↗</a>`:''}</div><p class="disclaimer">Automatically included in report. ${note?'Not supplied to AI: '+esc(note):assessment?.analyzedPMIDs.includes(ref.pmid)?'Abstract supplied to AI.':'AI analysis not completed.'} Full text not retrieved.</p><details><summary>${ref.abstracts.length?'Read retrieved abstract':'No abstract supplied'}</summary>${ref.abstracts.map(a=>`<p>${a.label?'<b>'+esc(a.label)+':</b> ':''}${esc(a.text)}</p>`).join('')||'<p>No abstract is available; no clinical conclusion is inferred from the title.</p>'}${ref.copyright?'<p class="disclaimer">'+esc(ref.copyright)+'</p>':''}</details></article>`;
}
function renderRecords(){
  $('includedCount').textContent=articles.size;
  $('searchResults').innerHTML=articles.size?[...articles.values()].map(articleHTML).join(''):'<div class="empty-panel">No PubMed records retrieved.</div>';
  const s=currentSearch;$('searchMeta').classList.toggle('hidden',!s);
  if(s)$('searchMeta').innerHTML=`<b>Submitted term:</b> ${esc(s.criteria.term)}<br><b>NCBI translation:</b> ${esc(s.translation||'Unavailable')}<br><b>Matches:</b> ${s.count??'Unknown'} · <b>Records automatically included:</b> ${articles.size}<br><b>Retrieved at:</b> ${esc(s.retrievedAt||'None')}<br>${esc(s.messages.join('; '))}<br>First batch only. Search rank is not evidence quality.`;
}
function setBusy(value){
  busy=value;
  for(const formID of ['reviewForm','searchForm']) $(formID).querySelectorAll('input,textarea,select,button').forEach(el=>el.disabled=value);
  $('cancelBtn').classList.toggle('hidden',!value);
  $('assessBtn').textContent=value?'Working…':'Search evidence & assess coverage →';
  $('searchResults').setAttribute('aria-busy',String(value));
}
function invalidate(){
  if(busy)return;
  assessment=null;assessmentInput=null;runFields=null;currentSearch=null;articles.clear();
  renderAssessment();renderRecords();notice('Inputs changed. Start a new assessment to retrieve and analyze evidence.');
}
async function localInference(payload,token){
  if(!window.isSecureContext||!navigator.gpu)throw new Error('Local AI needs a secure HTTPS page and a WebGPU-compatible browser/device. PubMed evidence is available below, but no AI assessment was generated.');
  const adapter=await navigator.gpu.requestAdapter();
  if(!adapter)throw new Error('No suitable WebGPU adapter is available. No AI assessment was generated.');
  if(token!==revision)throw new Error('Assessment stopped.');
  if(!worker)worker=new Worker('./assessment-worker.mjs',{type:'module'});
  return new Promise((resolve,reject)=>{
    let timer;
    const cleanup=()=>{clearTimeout(timer);workerReject=null;if(worker){worker.onmessage=null;worker.onerror=null;}};
    const fail=message=>{cleanup();worker?.terminate();worker=null;reject(new Error(message));};
    const deadline=ms=>{clearTimeout(timer);timer=setTimeout(()=>fail('Local AI timed out. No coverage conclusion was generated.'),ms);};
    workerReject=()=>fail('Assessment stopped.');deadline(15*60*1000);
    worker.onerror=()=>fail('The local AI worker or model download could not load. Check network access, WebGPU support, available GPU memory, and model-host access. No coverage conclusion was generated.');
    worker.onmessage=event=>{
      const msg=event.data;
      if(token!==revision){fail('Assessment stopped.');return;}
      if(msg.type==='progress'||msg.type==='generating'){notice(msg.message);if(msg.type==='generating')deadline(3*60*1000);}
      if(msg.type==='error')fail('Local AI failed: '+msg.message);
      if(msg.type==='result'){cleanup();resolve(msg.text);}
    };
    worker.postMessage({type:'assess',model:Coverage.MODEL,messages:Coverage.prompt(payload),schema:Coverage.schema});
  });
}
const client=PubMed.createClient({onRetry:(code,wait)=>{if(busy)notice(`NCBI returned HTTP ${code}. Retrying in ${Math.ceil(wait/1000)} seconds…`);}});
async function assess(event){
  event?.preventDefault();if(busy)return;
  if(!$('procedure').value.trim()||!$('diagnosis').value.trim()){notice('Enter a procedure and clinical indication before starting.',true);return;}
  draftQuery();let criteria;
  try{criteria=PubMed.buildQuery({query:$('pubmedQuery').value,from:$('fromYear').value,to:$('toYear').value,type:$('pubType').value,sort:$('sortBy').value});}
  catch(error){notice(error.message,true);return;}
  const token=++revision;
  assessment=null;assessmentInput=null;articles.clear();runFields=readFields();
  currentSearch={criteria,count:null,translation:'',retrievedAt:'',messages:[],status:'Searching',error:''};
  renderAssessment();renderRecords();setBusy(true);notice('Searching PubMed. Retrieved evidence will be included and analyzed automatically…');
  try{
    const result=await client.search(criteria,0,10);if(token!==revision)return;
    Object.assign(currentSearch,{count:result.count,translation:result.translation,messages:result.messages});
    const records=await client.fetchRecords(result.ids);if(token!==revision)return;
    currentSearch.retrievedAt=new Date().toISOString();currentSearch.status='Retrieved';
    records.forEach(ref=>articles.set(ref.pmid,{...ref,retrievedAt:currentSearch.retrievedAt}));
    const missing=result.ids.filter(id=>!articles.has(id));if(missing.length)currentSearch.messages.push('Missing records for PMIDs '+missing.join(', '));
    renderRecords();assessmentInput=Coverage.prepare(runFields,[...articles.values()]);
    if(!assessmentInput.evidence.length){
      assessment=Coverage.indeterminate(records.length?'No usable abstract evidence was available for the local model. Metadata and notices are included below.':'The PubMed query returned no usable records. Lack of search results does not establish noncoverage.',assessmentInput);
      notice('Evidence retrieval finished. Coverage is indeterminate; no usable abstract evidence.');
    }else{
      const raw=await localInference(assessmentInput,token);if(token!==revision)return;
      assessment=Coverage.validate(raw,assessmentInput);
      notice('Assessment draft generated. PubMed records are included automatically; verify the interpretation with a specialist.');
    }
    if(missing.length&&assessment.recommendation!=='indeterminate'){
      assessment.recommendation='indeterminate';assessment.summary='Coverage remains indeterminate because some requested PubMed records were not returned.';assessment.uncertainties.unshift('Some requested PubMed records were not returned; source retrieval is incomplete.');
    }
    renderAssessment();renderRecords();
  }catch(error){
    if(token!==revision)return;
    if(currentSearch){currentSearch.error=error.message;currentSearch.status='Assessment blocked';}
    assessment=Coverage.indeterminate('Assessment could not be completed: '+error.message,assessmentInput);
    notice(error.message,true);renderAssessment();renderRecords();
  }finally{if(token===revision)setBusy(false);}
}
async function copyBrief(){
  const text=buildBrief();
  try{if(!navigator.clipboard)throw new Error();await navigator.clipboard.writeText(text);toast('Assessment report copied');}
  catch{const el=document.createElement('textarea');el.value=text;document.body.append(el);el.select();const ok=document.execCommand('copy');el.remove();toast(ok?'Report copied':'Clipboard blocked. Use Download report.');}
}
function downloadBrief(){const url=URL.createObjectURL(new Blob([buildBrief()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='surgireview-coverage-assessment.txt';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('reviewForm').addEventListener('submit',assess);
$('searchForm').addEventListener('submit',assess);
$('reviewForm').addEventListener('input',()=>{draftQuery();invalidate();});
$('reviewForm').addEventListener('change',invalidate);
$('searchForm').addEventListener('input',event=>{if(event.target.id==='pubmedQuery')queryTouched=true;invalidate();});
$('searchForm').addEventListener('change',invalidate);
$('buildQuery').addEventListener('click',()=>{queryTouched=false;draftQuery(true);invalidate();$('pubmedQuery').focus();});
$('cancelBtn').addEventListener('click',()=>{
  revision++;workerReject?.();worker?.terminate();worker=null;setBusy(false);
  assessment=Coverage.indeterminate('Assessment stopped by the user. No directional coverage conclusion generated.',assessmentInput);renderAssessment();renderRecords();notice('Assessment stopped.');
});
$('clearBtn').addEventListener('click',()=>{
  if(!confirm('Clear the case, PubMed records, and coverage draft?'))return;
  revision++;worker?.terminate();worker=null;$('reviewForm').reset();$('searchForm').reset();queryTouched=false;invalidate();notice('No assessment started.');
});
$('sampleBtn').addEventListener('click',()=>{
  if($('procedure').value.trim()&&!confirm('Replace the case with a fictional example?'))return;
  const example={procedure:'Laparoscopic cholecystectomy',specialty:'General surgery',urgency:'Routine',diagnosis:'Symptomatic cholelithiasis',setting:'Outpatient / ambulatory',symptoms:'FICTIONAL CASE: recurrent right upper quadrant pain after meals for five months, interfering with daily activities.',findings:'FICTIONAL CASE: ultrasound reports gallstones without common bile duct dilation.',treatment:'FICTIONAL CASE: symptoms persist despite dietary modification. Alternatives and procedure rationale require specialist review.',factors:'FICTIONAL CASE: no additional patient risk information supplied. Confirm patient goals and anesthesia assessment.',criteria:'',reviewNotes:'Fictional example; no real insurance policy is supplied. Coverage should remain indeterminate.'};
  textFields.forEach(id=>$(id).value=example[id]||'');$('searchForm').reset();queryTouched=false;draftQuery(true);invalidate();notice('Fictional case loaded. Review the search terms, then start the assessment.');
});
$('caseId').textContent='Unsaved local case';
