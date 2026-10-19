/* Official NCBI E-utilities client. No credentials, proxy, or patient record input. */
(function (root) {
  'use strict';
  const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const TYPES = new Set(['', 'Randomized Controlled Trial', 'Systematic Review', 'Meta-Analysis', 'Practice Guideline', 'Clinical Trial', 'Review']);
  function buildQuery(input) {
    const query = String(input.query || '').trim();
    if (!query) throw new Error('Enter a PubMed query before searching.');
    const from = String(input.from || '').trim(), to = String(input.to || '').trim();
    for (const year of [from, to]) if (year && (!/^\d{4}$/.test(year) || +year < 1800 || +year > 2100)) throw new Error('Enter publication years between 1800 and 2100.');
    if (from && to && +from > +to) throw new Error('The starting year must not be later than the ending year.');
    const type = input.type || '';
    if (!TYPES.has(type)) throw new Error('Select a supported publication type.');
    const terms = [`(${query})`];
    if (from || to) terms.push(`("${from || '1800'}/01/01"[Date - Publication] : "${to || '2100'}/12/31"[Date - Publication])`);
    if (type) terms.push(`"${type}"[Publication Type]`);
    return {query, from, to, type, sort: input.sort === 'pub_date' ? 'pub_date' : 'relevance', term: terms.join(' AND ')};
  }
  function makeURL(endpoint, params) {
    if (!['esearch.fcgi', 'efetch.fcgi'].includes(endpoint)) throw new Error('Unsupported NCBI endpoint.');
    const url = new URL(endpoint, BASE);
    url.search = new URLSearchParams({db: 'pubmed', tool: 'surgical_review_desk', ...params}).toString();
    return url.toString();
  }
  function validPMID(value) { return /^\d+$/.test(String(value)); }
  const value = (el, selector) => el.querySelector(selector)?.textContent.trim().replace(/\s+/g, ' ') || '';
  function parseRecords(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('NCBI returned invalid article XML.');
    if (doc.querySelector('ERROR')) throw new Error('NCBI could not retrieve these article records.');
    if (!doc.querySelector('PubmedArticleSet')) throw new Error('NCBI returned an unexpected article format.');
    const records = [...doc.querySelectorAll('PubmedArticle, PubmedBookArticle')].map(node => {
      const citation = node.querySelector('MedlineCitation, BookDocument');
      if (!citation) return null;
      const pmid = value(citation, 'PMID');
      if (!validPMID(pmid)) return null;
      const article = citation.querySelector('Article') || citation;
      const authors = [...article.querySelectorAll('AuthorList > Author')].map(a => value(a, 'CollectiveName') || [value(a, 'LastName'), value(a, 'Initials') || value(a, 'ForeName')].filter(Boolean).join(' ')).filter(Boolean);
      const ids = [...node.querySelectorAll('ArticleIdList > ArticleId')];
      const doi = ids.find(id => id.getAttribute('IdType') === 'doi')?.textContent.trim() || [...article.querySelectorAll('ELocationID')].find(id => id.getAttribute('EIdType') === 'doi')?.textContent.trim() || '';
      const pmc = ids.find(id => id.getAttribute('IdType') === 'pmc')?.textContent.trim() || '';
      const date = article.querySelector('Journal > JournalIssue > PubDate') || article.querySelector('ArticleDate') || article.querySelector('Book > PubDate');
      const year = date ? value(date, 'Year') || (value(date, 'MedlineDate').match(/\b\d{4}\b/) || [])[0] || '' : '';
      const abstracts = [...article.querySelectorAll('Abstract > AbstractText')].map(a => ({label: a.getAttribute('Label') || '', text: a.textContent.trim()}));
      const types = [...article.querySelectorAll('PublicationTypeList > PublicationType')].map(t => t.textContent.trim());
      const notices = [...citation.querySelectorAll('CommentsCorrectionsList > CommentsCorrections')].map(n => ({type: n.getAttribute('RefType') || 'Related notice', pmid: value(n, 'PMID'), source: value(n, 'RefSource')}));
      return {pmid, title: value(article, 'ArticleTitle') || value(article, 'BookTitle') || 'Title unavailable', authors, year, journal: value(article, 'Journal > Title') || value(article, 'Book > BookTitle') || '', types, doi, pmc: /^PMC\d+$/.test(pmc) ? pmc : '', abstracts, notices, copyright: value(article, 'Abstract > CopyrightInformation'), pubmedURL: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`};
    }).filter(Boolean);
    return [...new Map(records.map(r => [r.pmid, r])).values()];
  }
  function createClient({fetchFn = (...args) => fetch(...args), pause = ms => new Promise(r => setTimeout(r, ms)), now = () => Date.now(), onRetry = () => {}} = {}) {
    let lastStart = 0, queue = Promise.resolve();
    const request = (endpoint, params) => {
      const job = queue.then(async () => {
        const url = makeURL(endpoint, params);
        for (let attempt = 0; attempt < 3; attempt++) {
          await pause(Math.max(0, 450 - (now() - lastStart)));
          lastStart = now();
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 15000);
          try {
            const response = await fetchFn(url, {method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: controller.signal});
            if (response.status === 429 || response.status >= 500) {
              if (attempt < 2) {
                const header = response.headers.get('Retry-After');
                const delay = header ? (/^\d+$/.test(header) ? +header * 1000 : Date.parse(header) - now()) : 1000 * (2 ** attempt);
                clearTimeout(timer);
                const wait = Math.min(30000, Math.max(1000, Number.isFinite(delay) ? delay : 1000));
                onRetry(response.status, wait);
                await pause(wait);
                continue;
              }
              throw new Error(response.status === 429 ? 'NCBI rate limit reached. Wait before trying again.' : `NCBI is temporarily unavailable (HTTP ${response.status}). Try again later.`);
            }
            if (!response.ok) throw new Error(`NCBI request was rejected (HTTP ${response.status}). Check network access and try again.`);
            return await response.text();
          } catch (error) {
            if (controller.signal.aborted) throw new Error('The NCBI request timed out after 15 seconds. Try again.');
            if (error instanceof TypeError) throw new Error('Could not reach NCBI. Check your connection. Your browser or network may be blocking cross-origin requests. No substitute results have been loaded.');
            throw error;
          } finally { clearTimeout(timer); }
        }
      });
      queue = job.catch(() => {});
      return job;
    };
    return {
      async search(criteria, offset = 0, size = 10) {
        const raw = await request('esearch.fcgi', {term: criteria.term, sort: criteria.sort, retmode: 'json', retstart: String(offset), retmax: String(size)});
        let body;
        try { body = JSON.parse(raw); } catch { throw new Error('NCBI returned an invalid search response.'); }
        const result = body.esearchresult;
        if (body.error || result?.ERROR || !result || !Array.isArray(result.idlist) || !/^\d+$/.test(String(result.count))) throw new Error('NCBI could not process this query. Check PubMed syntax.');
        const ids = result.idlist.filter(validPMID);
        if (ids.length !== result.idlist.length) throw new Error('NCBI returned invalid article identifiers.');
        const messages = [...Object.values(result.warninglist || {}), ...Object.values(result.errorlist || {})].flat().map(String);
        return {ids, count: Number(result.count), translation: result.querytranslation || '', messages};
      },
      async fetchRecords(ids) {
        if (!ids.length) return [];
        if (!ids.every(validPMID) || ids.length > 50) throw new Error('Invalid article request.');
        return parseRecords(await request('efetch.fcgi', {id: ids.join(','), retmode: 'xml'}));
      }
    };
  }
  async function retrieveAll(client,criteria,{signal,onProgress=()=>{},onBatch=()=>{},pageSize=200}={}){
    if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000)throw new Error('Invalid page size.');
    const check=()=>{if(signal?.aborted)throw new Error('Retrieval stopped. Search is incomplete.');};
    const seen=new Set(),partitions=[],messages=new Set();let fetched=0;
    const search=async(c,offset=0)=>{check();const r=await client.search(c,offset,pageSize);check();r.messages.forEach(m=>messages.add(m));return r;};
    const rootResult=await search(criteria);
    onProgress({total:rootResult.count,identified:0,retrieved:0,translation:rootResult.translation,partitions:[],phase:'Identifying all query matches'});
    async function collect(c,first,lo=0,hi=999999999999){
      check();
      if(first.count>10000){
        if(lo>=hi)throw new Error('NCBI partition cannot be subdivided. Search is incomplete.');
        const mid=Math.floor((lo+hi)/2);
        for(const [a,b] of [[lo,mid],[mid+1,hi]]){
          const term=`(${criteria.term}) AND (${a}:${b}[UID])`;
          const child={...criteria,term};const r=await search(child);await collect(child,r,a,b);
        }
        return;
      }
      partitions.push({term:c.term,count:first.count});let processed=0;
      for(let offset=0;offset<first.count;offset+=pageSize){
        const r=offset?await search(c,offset):first;
        if(r.count!==first.count)throw new Error('PubMed result count changed during pagination. Search is incomplete; rerun.');
        const expected=Math.min(pageSize,first.count-offset);
        if(r.ids.length!==expected)throw new Error('PubMed returned an incomplete identifier page. Search is incomplete.');
        for(const id of r.ids){if(seen.has(id))throw new Error('Duplicate PMID during pagination. Search is incomplete; rerun.');seen.add(id);processed++;}
        for(let i=0;i<r.ids.length;i+=50){
          check();const ids=r.ids.slice(i,i+50),records=await client.fetchRecords(ids);check();
          const returned=new Set(records.map(x=>x.pmid));
          if(records.some(x=>!ids.includes(x.pmid))||returned.size!==records.length)throw new Error('Unexpected article identifiers returned. Search is incomplete.');
          fetched+=records.length;onBatch(records);
          onProgress({total:rootResult.count,identified:seen.size,retrieved:fetched,translation:rootResult.translation,partitions:[...partitions],phase:'Retrieving every query match'});
          if(ids.some(id=>!returned.has(id)))throw new Error('Some PubMed article records were not returned. Search is incomplete.');
        }
      }
      if(processed!==first.count)throw new Error('Identifier count mismatch. Search is incomplete.');
    }
    await collect(criteria,rootResult);
    if(seen.size!==rootResult.count||fetched!==rootResult.count)throw new Error('Final count differs from initial PubMed matches. Search is incomplete; rerun.');
    return {count:rootResult.count,retrieved:fetched,translation:rootResult.translation,messages:[...messages],partitions,completedAt:new Date().toISOString()};
  }
  root.PubMed = {buildQuery, makeURL, parseRecords, createClient,retrieveAll};
  if (typeof module !== 'undefined') module.exports = root.PubMed;
})(typeof globalThis !== 'undefined' ? globalThis : window);
