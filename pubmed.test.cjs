'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {buildQuery,makeURL,createClient} = require('../pubmed.js');
function response(status,body,headers={}) {return {status,ok:status>=200&&status<300,text:async()=>body,headers:{get:k=>headers[k] || null}};}
const criteria=buildQuery({query:'cholecystectomy AND cholelithiasis'});
test('query validation, dates, publication type, and syntax preservation',()=>{
  assert.throws(()=>buildQuery({query:' '}),/Enter a PubMed/);
  assert.throws(()=>buildQuery({query:'x',from:'2025',to:'2020'}),/starting year/);
  assert.throws(()=>buildQuery({query:'x',from:'abc'}),/publication years/);
  assert.throws(()=>buildQuery({query:'x',type:'invented'}),/supported/);
  assert.equal(buildQuery({query:'surgery[Title]',from:'2020',to:'2026',type:'Systematic Review'}).term,'(surgery[Title]) AND ("2020/01/01"[Date - Publication] : "2026/12/31"[Date - Publication]) AND "Systematic Review"[Publication Type]');
});
test('request URL encodes query and uses official API',()=>{
  const u=new URL(makeURL('esearch.fcgi',{term:'x & y'}));
  assert.equal(u.hostname,'eutils.ncbi.nlm.nih.gov'); assert.equal(u.searchParams.get('term'),'x & y');
  assert.equal(u.searchParams.get('db'),'pubmed'); assert.throws(()=>makeURL('external',{}));
});
test('search processes NCBI IDs, count, and translation; transmits no clinical fields',async()=>{
  const seen=[];
  const client=createClient({pause:async()=>{},fetchFn:async(url,options)=>{seen.push({url,options});return response(200,JSON.stringify({esearchresult:{count:'12',idlist:['123','456'],querytranslation:'translated',warninglist:{phrasesignored:['phrase']}}}));}});
  const result=await client.search({...criteria,patient:'SECRET CLINICAL NOTES'},10,10);
  assert.deepEqual(result.ids,['123','456']);assert.equal(result.count,12);assert.equal(result.translation,'translated');
  assert.ok(!seen[0].url.includes('SECRET'));assert.equal(new URL(seen[0].url).searchParams.get('retstart'),'10');
  assert.equal(seen[0].options.credentials,'omit'); assert.equal(seen[0].options.mode,'cors'); assert.equal(seen[0].options.referrerPolicy,'no-referrer');
});
test('no results; no article fetch for empty IDs',async()=>{
  let calls=0;const client=createClient({pause:async()=>{},fetchFn:async()=>{calls++;return response(200,'{"esearchresult":{"count":"0","idlist":[]}}');}});
  assert.equal((await client.search(criteria)).count,0);assert.deepEqual(await client.fetchRecords([]),[]);assert.equal(calls,1);
});
test('rate limits retry with bounded backoff and eventually recover',async()=>{
  let calls=0;const waits=[], retries=[];
  const client=createClient({pause:async ms=>waits.push(ms),onRetry:(status,delay)=>retries.push([status,delay]),fetchFn:async()=>++calls<3 ? response(429,'',{'Retry-After':'2'}) : response(200,'{"esearchresult":{"count":"0","idlist":[]}}')});
  await client.search(criteria);assert.equal(calls,3);assert.deepEqual(retries,[[429,2000],[429,2000]]);assert.ok(waits.includes(2000));
});
test('persistent rate limits, unavailable servers, blocked network, malformed payloads fail clearly',async()=>{
  for (const [status,message] of [[429,/rate limit/],[503,/temporarily unavailable/],[403,/rejected/]]) {
    const client=createClient({pause:async()=>{},fetchFn:async()=>response(status,'')});await assert.rejects(client.search(criteria),message);
  }
  const network=createClient({pause:async()=>{},fetchFn:async()=>{throw new TypeError('Failed to fetch');}});
  await assert.rejects(network.search(criteria),/cross-origin/);
  const malformed=createClient({pause:async()=>{},fetchFn:async()=>response(200,'invalid')});await assert.rejects(malformed.search(criteria),/invalid search/);
  const badIDs=createClient({pause:async()=>{},fetchFn:async()=>response(200,'{"esearchresult":{"count":"1","idlist":["bad-id"]}}')});await assert.rejects(badIDs.search(criteria),/invalid article identifiers/);
});
test('client spaces requests and rejects unsafe or oversized ID lists',async()=>{
  const waits=[];const client=createClient({now:()=>1000,pause:async ms=>waits.push(ms),fetchFn:async()=>response(200,'{"esearchresult":{"count":"0","idlist":[]}}')});
  await Promise.all([client.search(criteria),client.search(criteria)]);assert.ok(waits.includes(450));
  await assert.rejects(client.fetchRecords(['not-a-pmid']),/Invalid article request/);await assert.rejects(client.fetchRecords(Array(51).fill('1')),/Invalid article request/);
});
