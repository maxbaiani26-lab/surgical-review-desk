# Surgical Review Desk — evidence workflow

Site: https://maxbaiani26-lab.github.io/surgical-review-desk/

This release follows the supplied video's coverage/documentation and evidence-review flow. It uses deterministic rules and public PubMed retrieval, with no GPU, CPU language model, API key or inference backend. It does not reproduce the video's entire design or infer what its unseen backend does. There is no documentation completeness percentage.

## Deploy

Unzip `surgical-review-desk-evidence.zip`. Upload the CONTENTS of its `surgical-review-desk` folder to the root of `maxbaiani26-lab/surgical-review-desk`, replacing files. Required files:

- index.html
- app.js
- procedures.js
- pubmed.js
- review.js

Commit to the configured Pages branch (normally main). Pages settings remain main and / (root). Hard-refresh the site with Ctrl+F5; the badge should read **Evidence workflow**. Old assessment.js and assessment-worker.mjs are no longer referenced and need not be deployed. They can remain in an existing repository unused. No remote deployment was performed here.

## Coverage & documentation

Choose specialty/procedure and enter de-identified case details. Fill policy payer, identifier/version, exact policy excerpt and document references. Add individual policy clauses with reviewer-reported alignment, supporting case fact and source document/page. Applicability remains unverified until the reviewer checks it. The example fills all intake fields with fictional details and a fictional policy; it does not assert verification.

Status rules distinguish incomplete retrieval, unverified policy, reported policy conflict, unfinished relevance screening, and criteria reported met. Even when entered criteria are reported met, specialist confirmation is required. These are rules about explicitly entered judgments; free-text clinical notes, policies and scientific results are not automatically interpreted. A documented criterion is not proof of medical necessity or authorization.

## Retrieve the full query result set

Review the draft PubMed query and add synonyms, alternative procedure names, population and comparator terms as appropriate. Optional date/type filters are explicit and restrict the search. There is no default date restriction and no first-ten cap. Clicking Retrieve is the sole request to send the displayed query and filters to NCBI; case details and policy stay local unless explicitly exported.

The app identifies every record matching the submitted query in ESearch pages of 200 identifiers and fetches full available metadata/abstracts in batches of 50. Calls are throttled and rate-limit/server errors receive bounded retries. If a query exceeds ESearch's 10,000-ID per-query retrieval window, it is recursively split into disjoint PMID/UID ranges. This follows the UID-range strategy described by NCBI staff:
https://ncbiinsights.ncbi.nlm.nih.gov/2022/11/22/updated-pubmed-eutilities-live/

Every returned PMID must be unique, every requested article must be returned, each page count must remain stable, and final unique/retrieved totals must equal the initial count before the search is marked complete. UID subdivision uses the range 0–999999999999; if matches ever fall outside it, final counts fail instead of silently claiming completeness. API count/index changes, missing records, unexpected IDs, access errors or cancellation leave the review explicitly incomplete. Stop waits for the in-flight request/backoff to finish; it prevents further batches and retains previously delivered records.

There is no application article-count cap. Very broad queries can still exceed available browser memory/time. Keep the tab open; use Stop and export partial work when needed. This is an in-memory static browser application, not an unlimited background research service. Reloading loses the case and records. A completed query is a retrieval reconciliation, not a guarantee of systematic review completeness or clinical relevance.

## Relevance screening and reporting

All fetched records enter the evidence register. Optional required phrases and exclusion-warning phrases (one per line) flag literal matches in titles/abstracts. Missing phrases, warning phrases, absent abstracts and available integrity notices remain visible; the app never automatically excludes studies using these signals. Literal matches do not interpret negation, establish applicability, score quality, or summarize study effects.

Reviewers record Include/Exclude/Needs screening and a reason with applicability/limitations. Include or Exclude without a reason remains pending in the overall count. Different publications of the same study are not automatically consolidated: PMID deduplication only prevents duplicate citation records. Full texts are linked where available, not retrieved or read by the app.

Display pagination shows 25 articles at a time; all records remain in memory and appear in text and full audit JSON exports. Exports include case details, policy comparisons, submitted query/filter/translation, search timestamps, partition log, completion state, per-record metadata and abstracts, phrase flags, and relevance decisions/reasons. This includes excluded and pending citations.

**All query matches does not mean all relevant literature.** Relevant studies can be missed by query wording, missing terms, indexing, source coverage, language, unpublished results or unavailable full texts. A broad search can also return many irrelevant records. The interface and report make these boundaries explicit instead of treating search rank as evidence selection.

## Validation

21 automated service, retrieval, rule and workflow tests passed with synthetic/mocked records. These cover >10 results, >10,000-ID subdivision, missing/duplicate records, count drift, cancellation, no-result/error behavior, literal screening, policy uncertainty, sample fill, stale case clearing and full export beyond display pages. Syntax checks passed for all four JavaScript files.

Live PubMed retrieval, HTTP(S) browser CORS, visual/mobile rendering and performance remain unverified in this workspace because external requests and browser downloads were blocked in this session. No clinical validation or coverage-decision validation is claimed. See VERIFICATION.md.

## Sources

- NLM API guide: https://www.nlm.nih.gov/dataguide/eutilities/utilities.html
- NCBI API/window update and UID-range explanation: https://ncbiinsights.ncbi.nlm.nih.gov/2022/11/22/updated-pubmed-eutilities-live/
- NCBI usage limits: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- NCBI attribution/disclaimer: https://www.ncbi.nlm.nih.gov/About/disclaimer.html
- Procedure catalog: each entry in procedures.js links to MedlinePlus (U.S. National Library of Medicine) or the American College of Surgeons. Eleven specialties/30 curated entries; not an exhaustive billing or coverage catalog.

Abstracts may be copyrighted. Data are supplied by NCBI, U.S. National Library of Medicine. Available correction/retraction metadata are not a complete research-integrity check.
