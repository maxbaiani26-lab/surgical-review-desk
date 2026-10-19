# Verification record

## Completed

- JavaScript syntax: `node --check app.js` and `node --check pubmed.js` passed.
- Ten automated Node tests passed, covering:
  - Empty query, invalid dates, publication-type validation, and query preservation.
  - Official endpoint URL generation and parameter encoding.
  - Search-result processing, offset pagination, and query-only request payloads.
  - No results and avoidance of empty article fetches.
  - Request spacing, bounded retry/backoff, and persistent rate-limit errors.
  - Rejected requests, server errors, blocked connections, and invalid JSON/IDs.
  - Local query drafting, repeated brief generation, and fresh export text.
  - Reference inclusion/removal, PMID deduplication, notes, missing-abstract display branch, and exported reference provenance.
- Service tests use mocked HTTP responses. App-state tests use a minimal DOM stub; they do not verify actual browser events, XML DOM parsing, or layout.
- Relative production script paths are `./pubmed.js` and `./app.js`, with no build-time root assumption.

## Attempted but blocked

A real ESearch query for `cholecystectomy` with an HTTP-origin header was attempted. The workspace network returned HTTP 403 and `Forbidden. Calls to this URL are not allowed.` No genuine record payload was obtained.

Playwright was available, but its browser executable was not installed. Browser download was also rejected with HTTP 403. Therefore an actual HTTP(S)-origin browser fetch and visual inspection could not run.

No working CORS capability or end-to-end live retrieval is claimed. The cause of the blocked requests cannot be attributed to NCBI CORS policy based on these observations.

## Remaining deployment acceptance checks

1. Visit the deployed `/surgical-review-desk/` page over HTTPS. Confirm both scripts load.
2. Open developer tools → Network. Editing intake fields or drafting a query must not create API requests.
3. Submit `cholecystectomy AND cholelithiasis`. Confirm a successful ESearch response followed by EFetch and that the browser can read both responses from the deployed origin. There must be no CORS error.
4. Match displayed title, authors, year, journal, PMID, DOI, abstract, and publication types against the returned XML and PubMed record. Open available DOI/PMC links.
5. Apply date/type filters and load another page. Check that query metadata, result counts, displayed-record counts, and retrieval timestamps reflect actual responses.
6. Select two records, write relevance and limitation notes, remove/reselect one, and export. Confirm the exact selected PMIDs appear once each; manual references remain separately labeled.
7. Test an empty query and a query returning no results. Confirm no false success state.
8. Open a record with no abstract and a record with notice metadata. Confirm missing content and notices are displayed accurately without implying a full-text review or comprehensive integrity check.
9. Simulate offline, a timeout, and API errors using developer tools. Confirm visible failure and no substitute results.
10. Check keyboard access and widths of 390, 768, and 1280 px for horizontal overflow, clipped controls, and readable abstracts. Confirm repeated brief generation and copy/download work.

These checks remain unperformed. The prototype has not been clinically validated or deployed by the author of this update.
