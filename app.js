'use strict';
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const textFields = ['procedure','specialty','urgency','diagnosis','setting','symptoms','findings','treatment','factors','criteria','literature','reviewNotes'];
const selected = new Map(), articles = new Map(), searches = [];
let currentSearch = null, busy = false, briefGenerated = false, latestBrief = '', revision = 0, queryTouched = false;
const checks = [
  ['Procedure is identified', () => !!$('procedure').value.trim()],
  ['Diagnosis or clinical indication is recorded', () => !!$('diagnosis').value.trim()],
  ['Symptoms, duration, or functional impact are described', () => !!$('symptoms').value.trim()],
  ['Objective findings or relevant test results are summarized', () => !!$('findings').value.trim()],
  ['Prior treatment and response are documented, or rationale is recorded', () => !!$('treatment').value.trim()],
  ['Patient-specific risk and benefit considerations are recorded', () => !!$('factors').value.trim()],
  ['Applicable coverage criteria are cited', () => !!$('criteria').value.trim()],
  ['A manual reference or retrieved PubMed record is included', () => !!$('literature').value.trim() || selected.size > 0],
  ['Appropriate specialist involvement is confirmed', () => $('specialist').checked],
  ['Risks, benefits, and alternatives are documented', () => $('consent').checked],
  ['Relevant supporting records are available', () => $('records').checked],
  ['Policy and evidence versions are identified', () => $('version').checked]
];
function notice(message, error = false) {
  $('searchStatus').textContent = message;
  $('searchStatus').className = 'search-status' + (error ? ' error' : '');
}
function statusFor(gaps) {
  return $('urgency').value === 'Urgent' ? 'Urgent specialist review needed' : gaps.length ? 'More documentation needed' : 'Ready for specialist review';
}
function sourceText(ref) {
  return `${ref.title}\nAuthors: ${ref.authors.join('; ') || 'Unavailable'}\nYear: ${ref.year || 'Unavailable'} | Journal: ${ref.journal || 'Unavailable'}\nPMID: ${ref.pmid}\nDOI: ${ref.doi || 'Unavailable'}\nPublication types: ${ref.types.join('; ') || 'Unavailable'}\nPubMed: ${ref.pubmedURL}${ref.doi ? '\nPublisher / DOI: https://doi.org/' + encodeURI(ref.doi) : ''}${ref.pmc ? '\nPMC full text link: https://pmc.ncbi.nlm.nih.gov/articles/' + ref.pmc + '/' : ''}\nSource: PubMed E-utilities; metadata and ${ref.abstracts.length ? 'abstract' : 'no abstract'} retrieved, full text not retrieved.\nRetrieved at: ${ref.retrievedAt}\nSearch used: ${ref.searchTerm}\nRelevance: ${ref.relevance || 'Not assessed'}\nLimitations: ${ref.limitations || 'Not assessed'}\nRecord notices: ${ref.notices.map(n => n.type + (n.pmid ? ' (PMID ' + n.pmid + ')' : '')).join('; ') || 'None supplied; this is not a comprehensive integrity check.'}`;
}
function buildBrief() {
  const fields = Object.fromEntries(textFields.map(id => [id, $(id).value.trim()]));
  const gaps = checks.filter(c => !c[1]()).map(c => c[0]);
  const history = searches.map((s,i) => `Search ${i+1}\nSubmitted: ${s.criteria.query}\nFilters: from ${s.criteria.from || 'any'} through ${s.criteria.to || 'any'}; type ${s.criteria.type || 'all'}; sort ${s.criteria.sort}\nSubmitted term: ${s.criteria.term}\nNCBI translation: ${s.translation || 'Unavailable'}\nStarted at: ${s.startedAt}\nLast successful retrieval: ${s.retrievedAt || 'None'}\nResult count: ${s.count ?? 'Unavailable'}; distinct records retrieved: ${s.recordIDs.size}; IDs processed: ${s.offset}\nStatus: ${s.status}${s.error ? '\nError: ' + s.error : ''}${s.messages.length ? '\nNCBI messages: '+s.messages.join('; ') : ''}`).join('\n\n');
  return `SURGIREVIEW — CLINICAL REQUEST REVIEW\nGenerated: ${new Date().toISOString()}\nDocumentation status: ${statusFor(gaps)}\n\n${[['procedure','Procedure'],['specialty','Specialty'],['urgency','Requested timing'],['diagnosis','Diagnosis / indication'],['setting','Planned setting'],['symptoms','Symptoms / functional impact'],['findings','Objective findings'],['treatment','Prior treatment and response'],['factors','Patient factors'],['criteria','USER-SUPPLIED COVERAGE CRITERIA'],['literature','MANUALLY ENTERED REFERENCES (not retrieved or verified)'],['reviewNotes','REVIEWER NOTES / UNRESOLVED QUESTIONS']].map(([id,label]) => `${label}: ${fields[id] || 'Not documented'}`).join('\n\n')}\n\nMISSING DOCUMENTATION\n${gaps.length ? gaps.map(g => '- '+g).join('\n') : 'No missing items in this documentation checklist.'}\n\nCOMPLETENESS CONFIRMATIONS\n${['specialist','consent','records','version'].map(id => `${{specialist:'Specialist involvement',consent:'Risks / benefits / alternatives',records:'Supporting records',version:'Policy and evidence versions'}[id]}: ${$(id).checked ? 'Confirmed by user' : 'Not confirmed'}`).join('\n')}\n\nPUBMED SEARCH HISTORY\n${history || 'No PubMed search submitted.'}\n\nSELECTED PUBMED REFERENCES\n${[...selected.values()].map((ref,i) => `${i+1}. ${sourceText(ref)}`).join('\n\n') || 'None selected.'}\n\nREQUIRES SPECIALIST VERIFICATION\nVerify the clinical indication, applicability and currency of coverage policy, patient-specific benefits and risks, full-text evidence, and relevance and limitations of selected references. Review any retraction or correction notices.\n\nThis is a documentation and literature retrieval aid, not an AI assessment, clinical recommendation, medical-necessity determination, or coverage authorization. No full text is retrieved by this app. The prototype has not been clinically validated.\n\nNCBI data attribution: https://www.ncbi.nlm.nih.gov/\nNCBI Disclaimer and Copyright: https://www.ncbi.nlm.nih.gov/About/disclaimer.html\n`;
}
function renderBrief() {
  if (!briefGenerated) return;
  const gaps = checks.filter(c => !c[1]()).map(c => c[0]), complete = checks.length-gaps.length;
  const state = $('urgency').value === 'Urgent' ? 'urgent' : gaps.length ? 'gaps' : 'ready';
  const details = [['procedure','Procedure'],['specialty','Specialty'],['diagnosis','Indication'],['symptoms','Symptoms / impact'],['findings','Objective findings'],['treatment','Prior treatment'],['factors','Patient factors'],['criteria','User-supplied coverage criteria'],['literature','Manual references'],['reviewNotes','Reviewer notes']].filter(([id]) => $(id).value.trim()).map(([id,label]) => `<div class="result-item"><span class="bullet">•</span><span><b>${label}:</b> ${esc($(id).value.trim()).replace(/\n/g,'<br>')}</span></div>`).join('');
  $('resultArea').innerHTML = `<div class="result-top"><div class="result-label">Documentation status</div><div class="status ${state}"><span class="dot"></span><span>${statusFor(gaps)}</span></div></div><div class="result-body"><div class="readiness"><span>Documentation checklist</span><b>${complete} / ${checks.length}</b></div><div class="bar"><span style="width:${Math.round(complete/checks.length*100)}%"></span></div><div class="rule"></div><h3>Case summary</h3><div class="result-list">${details}</div><div class="rule"></div><h3>Items to complete or verify</h3><div class="result-list">${gaps.map(g => `<div class="result-item gap"><span class="bullet">!</span><span>${esc(g)}</span></div>`).join('') || '<p class="disclaimer">All checklist fields are present. Clinical appropriateness and policy applicability still need specialist review.</p>'}</div><div class="rule"></div><h3>Selected PubMed references (${selected.size})</h3>${[...selected.values()].map(ref => `<p class="disclaimer"><b>${esc(ref.title)}</b> (${esc(ref.year || 'Year unavailable')}) — PMID ${ref.pmid}<br>Relevance: ${esc(ref.relevance || 'Not assessed')}<br>Limitations: ${esc(ref.limitations || 'Not assessed')}</p>`).join('<br>') || '<p class="disclaimer">None selected.</p>'}<p class="disclaimer" style="margin-top:12px">Export includes full citation metadata, search history, and reviewer notes. Verify clinical applicability and full sources.</p><div class="actions" style="margin-top:16px"><button type="button" class="btn secondary" id="copyBtn">Copy brief</button><button type="button" class="btn secondary" id="downloadBtn">Download brief</button></div></div>`;
  latestBrief = buildBrief();
  $('copyBtn').addEventListener('click', copyBrief);
  $('downloadBtn').addEventListener('click', downloadBrief);
}
function generate(event) {
  event?.preventDefault();
  if (!$('procedure').value.trim()) { $('procedure').focus(); return; }
  briefGenerated = true;
  renderBrief();
}
function toast(message) {
  $('toast').textContent=message; $('toast').classList.add('show');
  setTimeout(() => $('toast').classList.remove('show'), 2000);
}
async function copyBrief() {
  latestBrief = buildBrief();
  try {
    if (!navigator.clipboard) throw new Error('Clipboard unavailable');
    await navigator.clipboard.writeText(latestBrief); toast('Review brief copied');
  } catch {
    const area=document.createElement('textarea'); area.value=latestBrief; document.body.append(area); area.select();
    const success=document.execCommand('copy'); area.remove();
    toast(success ? 'Review brief copied' : 'Clipboard blocked. Use Download brief.');
  }
}
function downloadBrief() {
  latestBrief = buildBrief();
  const url=URL.createObjectURL(new Blob([latestBrief], {type:'text/plain;charset=utf-8'}));
  const a=document.createElement('a'); a.href=url; a.download='surgireview-brief.txt'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function draftQuery(force=false) {
  if (queryTouched && !force) return;
  const parts=[$('procedure').value.trim(), $('diagnosis').value.trim()].filter(Boolean);
  $('pubmedQuery').value=parts.map(p => '('+p+')').join(' AND ');
}
function articleHTML(ref) {
  const flags=ref.notices.filter(n => /retract|concern|correct|errat/i.test(n.type));
  const flaggedTypes=ref.types.filter(t => /retract|concern|errat/i.test(t));
  return `<article class="article"><h4>${esc(ref.title)}</h4><p class="authors">${esc(ref.authors.join('; ') || 'Authors unavailable')}</p><p>${esc(ref.journal || 'Journal unavailable')} · ${esc(ref.year || 'Year unavailable')}<br>Types: ${esc(ref.types.join('; ') || 'Unavailable')}<br>PMID ${ref.pmid}${ref.doi ? ' · DOI '+esc(ref.doi) : ' · DOI unavailable'}</p>${flags.length || flaggedTypes.length ? `<div class="flags"><b>Publication notices / flags</b><br>${[...flaggedTypes.map(esc), ...flags.map(n => `${esc(n.type)}${n.pmid ? ` — <a href="https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(n.pmid)}/" target="_blank" rel="noopener noreferrer">related PMID ${esc(n.pmid)}</a>` : ''}${n.source ? ': '+esc(n.source) : ''}`)].join('<br>')}</div>` : '<p class="disclaimer">No retraction or correction flag supplied in this record. This is not a comprehensive integrity check.</p>'}<div class="article-links"><a href="${ref.pubmedURL}" target="_blank" rel="noopener noreferrer">PubMed record ↗</a>${ref.doi ? `<a href="https://doi.org/${esc(encodeURI(ref.doi))}" target="_blank" rel="noopener noreferrer">Publisher / DOI ↗</a>` : ''}${ref.pmc ? `<a href="https://pmc.ncbi.nlm.nih.gov/articles/${ref.pmc}/" target="_blank" rel="noopener noreferrer">PMC full text ↗</a>` : ''}</div><p class="disclaimer">Full text is not retrieved by this app. Publisher access may require payment.</p><details><summary>${ref.abstracts.length ? 'Read retrieved abstract' : 'No abstract supplied'}</summary>${ref.abstracts.length ? ref.abstracts.map(a => `<p>${a.label ? '<b>'+esc(a.label)+':</b> ' : ''}${esc(a.text)}</p>`).join('') : '<p>This PubMed record did not supply an abstract. Do not infer study findings from the title.</p>'}${ref.copyright ? '<p class="disclaimer">'+esc(ref.copyright)+'</p>' : ''}</details><button type="button" class="btn ${selected.has(ref.pmid) ? 'secondary' : 'primary'}" data-select="${ref.pmid}" aria-pressed="${selected.has(ref.pmid)}">${selected.has(ref.pmid) ? 'Remove from brief' : 'Include in brief'}</button></article>`;
}
function renderResults() {
  $('searchResults').innerHTML=articles.size ? [...articles.values()].map(articleHTML).join('') : '<div class="empty-panel">No records retrieved for this search.</div>';
  updateSearchMeta();
}
function renderSelected() {
  $('selectedCount').textContent=selected.size;
  $('selectedRefs').innerHTML=selected.size ? [...selected.values()].map(ref => `<article class="article"><h4>${esc(ref.title)}</h4><p>PubMed-retrieved · ${esc(ref.year || 'Year unavailable')} · PMID ${ref.pmid}</p><p class="disclaimer">${ref.abstracts.length ? 'Abstract and metadata retrieved' : 'Metadata only; no abstract available'}. Full text not retrieved.</p><div class="field"><label for="relevance-${ref.pmid}">Why is this relevant?</label><textarea id="relevance-${ref.pmid}" data-note="relevance" data-pmid="${ref.pmid}" placeholder="Describe applicability to the case">${esc(ref.relevance || '')}</textarea></div><div class="field"><label for="limitations-${ref.pmid}">Limitations and uncertainties</label><textarea id="limitations-${ref.pmid}" data-note="limitations" data-pmid="${ref.pmid}" placeholder="Study limitations, indirect evidence, unresolved questions">${esc(ref.limitations || '')}</textarea></div><button type="button" class="btn secondary" style="margin-top:10px" data-remove="${ref.pmid}">Remove reference</button></article>`).join('') : '<div class="empty-panel">Select articles to include in the review brief.</div>';
  renderBrief();
}
function updateSearchMeta() {
  if (!currentSearch) { $('searchMeta').classList.add('hidden'); return; }
  const s=currentSearch;
  $('searchMeta').classList.remove('hidden');
  $('searchMeta').innerHTML=`<b>Submitted query:</b> ${esc(s.criteria.query)}<br><b>Filters:</b> ${esc(s.criteria.from || 'Any year')} – ${esc(s.criteria.to || 'Any year')} · ${esc(s.criteria.type || 'All publication types')} · Sort: ${esc(s.criteria.sort)}<br><b>Submitted term:</b> ${esc(s.criteria.term)}<br><b>NCBI query translation:</b> ${esc(s.translation || 'Unavailable')}<br><b>Last successful retrieval:</b> ${esc(s.retrievedAt || 'None')}<br><b>Matches:</b> ${s.count ?? 'Unknown'} · <b>Records displayed:</b> ${articles.size}${s.messages.length ? '<br><b>NCBI messages:</b> '+esc(s.messages.join('; ')) : ''}<br><span>Search rank does not establish evidence quality. PubMed pagination is limited to the first 10,000 results; refine broad searches.</span>`;
}
function setBusy(value) {
  busy=value;
  for (const id of ['searchBtn','moreBtn','buildQuery','pubmedQuery','fromYear','toYear','pubType','sortBy','sampleBtn']) $(id).disabled=value;
  $('searchBtn').textContent=value ? 'Retrieving…' : 'Search PubMed';
  $('searchResults').setAttribute('aria-busy', String(value));
}
const client=PubMed.createClient({onRetry: (code, wait) => notice(`NCBI returned HTTP ${code}. Retrying in ${Math.ceil(wait/1000)} seconds…`)});
async function runSearch(event, more=false) {
  event?.preventDefault();
  if (busy) return;
  let criteria;
  try {
    criteria=more && currentSearch ? currentSearch.criteria : PubMed.buildQuery({query:$('pubmedQuery').value, from:$('fromYear').value, to:$('toYear').value, type:$('pubType').value, sort:$('sortBy').value});
  } catch (error) { notice(error.message, true); return; }
  if (!more) {
    currentSearch={criteria, startedAt:new Date().toISOString(), retrievedAt:'', count:null, translation:'', offset:0, recordIDs:new Set(), messages:[], status:'Retrieving', error:''};
    searches.push(currentSearch); articles.clear();
    $('searchResults').innerHTML='<div class="empty-panel">Searching NCBI…</div>';
    $('moreBtn').classList.add('hidden');
  }
  const session=currentSearch, token=revision;
  setBusy(true); notice('Searching PubMed and retrieving available abstracts…'); updateSearchMeta();
  try {
    const result=await client.search(criteria, session.offset, 10);
    if (token!==revision) return;
    session.count=result.count; session.translation=result.translation; session.messages=result.messages;
    const records=await client.fetchRecords(result.ids);
    if (token!==revision) return;
    session.retrievedAt=new Date().toISOString(); session.offset+=result.ids.length;
    records.forEach(ref => {
      ref.retrievedAt=session.retrievedAt; ref.searchTerm=criteria.term;
      articles.set(ref.pmid, ref); session.recordIDs.add(ref.pmid);
    });
    session.status='Retrieved'; session.error='';
    const missing=result.ids.filter(id => !records.some(r => r.pmid===id));
    if (missing.length) session.messages.push(`NCBI did not return records for PMIDs: ${missing.join(', ')}`);
    if (!result.ids.length && session.offset<session.count) session.messages.push('No more identifiers returned for this query.');
    notice(result.count ? `Retrieved ${articles.size} distinct records from ${result.count} matches. Review abstracts and limitations before selecting references.` : 'No results found. Broaden or revise the query or filters.');
    $('moreBtn').classList.toggle('hidden', !result.ids.length || session.offset>=Math.min(session.count,10000));
    renderResults();
  } catch (error) {
    if (token!==revision) return;
    session.status='Failed'; session.error=error.message;
    notice(error.message + (more ? ' Previously retrieved records remain available. Click Load more results to retry this page.' : ' No results have been substituted.'), true);
    if (!more) $('searchResults').innerHTML='<div class="empty-panel">No records retrieved. Live PubMed access failed.</div>';
    updateSearchMeta();
  } finally {
    setBusy(false);
    renderBrief();
  }
}
$('reviewForm').addEventListener('submit', generate);
$('reviewForm').addEventListener('input', () => { draftQuery(); renderBrief(); });
$('reviewForm').addEventListener('change', renderBrief);
$('pubmedQuery').addEventListener('input', () => { queryTouched=true; });
$('buildQuery').addEventListener('click', () => {
  if (queryTouched && $('pubmedQuery').value.trim() && !confirm('Replace the current query with procedure and diagnosis terms?')) return;
  queryTouched=false; draftQuery(true); $('pubmedQuery').focus();
});
$('searchForm').addEventListener('submit', event => { queryTouched=true; runSearch(event); });
$('moreBtn').addEventListener('click', event => runSearch(event, true));
$('searchResults').addEventListener('click', event => {
  const button=event.target.closest('[data-select]'); if (!button) return;
  const id=button.dataset.select;
  if (selected.has(id)) selected.delete(id);
  else if (articles.has(id)) selected.set(id, {...articles.get(id), relevance:'', limitations:''});
  renderResults(); renderSelected();
  document.querySelector(`[data-select="${id}"]`)?.focus();
});
$('selectedRefs').addEventListener('click', event => {
  const button=event.target.closest('[data-remove]'); if (!button) return;
  selected.delete(button.dataset.remove); renderResults(); renderSelected();
});
$('selectedRefs').addEventListener('input', event => {
  const {pmid, note}=event.target.dataset;
  if (selected.has(pmid) && ['relevance','limitations'].includes(note)) { selected.get(pmid)[note]=event.target.value; renderBrief(); }
});
$('clearBtn').addEventListener('click', () => {
  if (!confirm('Clear all case details, searches, and selected references?')) return;
  revision++; $('reviewForm').reset(); $('searchForm').reset(); selected.clear(); articles.clear(); searches.length=0;
  currentSearch=null; queryTouched=false; briefGenerated=false; latestBrief='';
  $('resultArea').innerHTML='<div class="result-body"><div class="empty-panel">Complete the request details, then generate a structured brief for specialist review.</div></div>';
  $('searchResults').innerHTML='<div class="empty-panel">No search submitted.</div>'; $('moreBtn').classList.add('hidden');
  renderSelected(); updateSearchMeta(); notice('No search submitted.');
});
$('sampleBtn').addEventListener('click', () => {
  if (textFields.some(id => $(id).value.trim()) && !confirm('Replace the clinical intake with a fictional example? Existing PubMed references will be cleared.')) return;
  const data={procedure:'Laparoscopic cholecystectomy',specialty:'General surgery',urgency:'Routine',diagnosis:'Symptomatic cholelithiasis',setting:'Outpatient / ambulatory',symptoms:'FICTIONAL EXAMPLE: recurrent right upper quadrant pain after meals for 5 months, affecting work.',findings:'FICTIONAL EXAMPLE: ultrasound reports gallstones without gallbladder wall thickening or common bile duct dilation.',treatment:'FICTIONAL EXAMPLE: symptoms persist despite dietary modification. Review alternatives and rationale with specialist.',factors:'FICTIONAL EXAMPLE: confirm patient goals and anesthesia risk assessment.'};
  textFields.forEach(id => $(id).value=data[id] || '');
  ['specialist','consent','records','version'].forEach(id => $(id).checked=false);
  revision++; selected.clear(); articles.clear(); searches.length=0; currentSearch=null; $('searchForm').reset(); $('moreBtn').classList.add('hidden'); notice('Fictional example loaded. No search submitted.'); renderSelected(); renderResults(); queryTouched=false; draftQuery(true); generate();
});
$('caseId').textContent='Unsaved session';
