# Verification — evidence workflow, October 19, 2026

21 tests passed using synthetic fixtures and mocked NCBI responses. No synthetic results are loaded by the deployed app. Tests are in tests/; run `node --test tests/*.test.cjs`.

Completed:

- Full retrieval over 437 matching records, not first ten.
- Recursive UID partitioning over 10,013 simulated records, with no partition exceeding the 10,000-ID retrieval window.
- Reconciliation of page counts, final totals, PMID uniqueness and requested/returned article identifiers.
- Explicit incomplete status for missing records, changed counts, truncated pages, API errors and cancellation.
- Throttling, retries and validated query/filter parameters from the existing NCBI client.
- Literal relevance flags do not produce automatic exclusions; reviewer reasons required for completed screening counts.
- Unverified policy, undocumented comparisons and incomplete evidence do not produce an authorization.
- Fictional sample fills all intake fields without requests. All HTML IDs unique.
- All 53 simulated records export even when only 25 appear on a display page.
- Case changes invalidate previous research. Partial results remain exportable.
- Syntax checks for app.js, pubmed.js, procedures.js and review.js.

Unverified:

- Live NCBI API access/CORS from a browser, real UID-range query behavior, provider count changes and large real searches.
- Browser rendering, mobile layout, actual throughput/RAM and sustained long retrievals.
- Clinical relevance/quality, completeness of literature discovery, insurance policy applicability, and correctness of reviewer-entered findings. No clinical validation.

The supplied video was inspected using extracted frames around its step 4 and results. It shows coverage/documentation fields, criteria/document references, cited evidence and a specialist-review-required state. It does not establish the implementation or correctness of the video's unseen analysis. This release implements an auditable deterministic workflow without claiming equivalent autonomous medical reasoning.

Manual deployment acceptance:

1. Upload all five app files; hard-refresh and confirm Evidence workflow.
2. Fill example; verify procedure menu, fictional policy, clause editor and editable PubMed query.
3. Run a small live query, compare total with PubMed, inspect real PMIDs/abstracts and reconciliation status.
4. Run a query exceeding 25 records; verify next/previous pages and that export contains every retrieved PMID.
5. Stop retrieval; verify incomplete state and retained partial records.
6. Enter relevance decisions/reasons and policy clause findings; inspect rule-driven status changes.
7. Export JSON and text, and verify all pending/included/excluded records and source provenance.
