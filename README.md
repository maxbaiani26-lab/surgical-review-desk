# Surgical Review Desk — CPU edition

App URL: https://maxbaiani26-lab.github.io/surgical-review-desk/

## What changed

The former WebLLM/WebGPU runtime was replaced with Transformers.js 3.8.1 and SmolLM2-1.7B-Instruct, quantized q4, explicitly using the WASM CPU backend. No GPU adapter is requested. No remote inference, API key, backend, or per-assessment API charge is required. Network/data and electricity costs can still apply.

The app retains the dependent specialty/procedure menus, complete fictional example, live PubMed retrieval, automatic inclusion of records, evidence/policy validation, and copy/download exports. This is an unvalidated clinical decision-support prototype; outputs require specialist review.

## Update GitHub Pages

1. Unzip `surgical-review-desk-cpu.zip` and open its `surgical-review-desk` folder.
2. Upload the folder CONTENTS to the root of `maxbaiani26-lab/surgical-review-desk`, replacing previous files. All six application files must be from this release:
   - index.html
   - app.js
   - procedures.js
   - pubmed.js
   - assessment.js
   - assessment-worker.mjs
3. Commit to your Pages branch (normally main). Settings → Pages should use main and / (root).
4. Visit the URL above and hard-refresh with Ctrl+F5. The header should show **CPU · Prototype**. The runtime script URLs are versioned to avoid stale application code.

No repository change or deployment was performed by this package.

## Use and CPU requirements

Choose a specialty and procedure or click **Fill all fields with an example**. Review the fictional policy and case or replace them with de-identified inputs and the actual applicable policy. Check the editable PubMed query, then click **Search evidence & assess coverage**.

- A modern desktop browser with WebAssembly and module Web Workers is required. HTTPS GitHub Pages is supported by design. WebGPU is not used.
- First use downloads about 1.41 GB of quantized model weights plus tokenizer/runtime/WASM assets. Several GB of free RAM are needed; exact memory and speed have not been measured here. A computer with 16 GB total RAM can still fail if browser memory or available RAM is insufficient.
- Model files may be cached by the browser. Cache eviction, private browsing or storage quotas may require downloading again. No patient case is stored in localStorage, IndexedDB or an application database.
- CPU execution is single-threaded deliberately: GitHub Pages does not supply the cross-origin isolation headers required for shared-memory WASM threading. A background worker keeps the interface responsive, but single-thread generation may take many minutes.
- First loading and generation each have a 20-minute deadline. Worker startup fails after 30 seconds without a response; subsequent inactivity fails after five minutes. Token/text-chunk progress is reported while generating. **Stop assessment** terminates the worker. A timer in the busy worker is not used to fabricate progress.
- The worker is terminated after a successful draft or failure, releasing the model and inference state; a later case reloads the model from cache where possible.
- Runtime/model hosts must be accessible: jsDelivr, Hugging Face, and its public artifact/CDN hosts. These downloads do not invoke an inference API. Offline use is not guaranteed even after caching.
- Clinical case and policy are passed only to the local worker. PubMed receives only the explicitly submitted query and filters. Do not put identifiers in queries. Dependency hosts receive download requests, not case prompts.

## Evidence and assessment limits

The app searches official NCBI E-utilities and includes up to ten returned PubMed records, with available metadata, abstracts, notices and source links. Full texts are not downloaded. A limited search is not a systematic review; search rank and indexing do not prove relevance or quality.

The CPU model has an 8,192-token context. In addition to existing character budgets (7,000 case/policy characters and 10,000 evidence/title characters), the worker tokenizes the entire prompt and schema and reserves 1,800 output tokens. Oversized inputs fail explicitly without silently truncating sources. Smaller policy excerpts or a narrower search may be needed. Complete abstracts that do not fit the character budget are listed as not analyzed, withholding directional conclusions.

SmolLM2 is a small general-purpose model, not a validated clinical assessment model. CPU generation uses a JSON schema as an instruction, not a constrained decoder. Complete JSON (optionally inside a whole markdown fence) is required; malformed, truncated, fabricated or nonmatching citations/quotes are rejected, with no fabricated fallback. This can result in an indeterminate assessment even if the runtime works.

PMID membership and exact abstract, policy and case quotes are validated. These checks cannot validate the interpretation, identify every policy condition, or establish clinical applicability. Missing policy, unsupported comparisons, omitted usable evidence and other uncertainty withhold a directional conclusion. Neither missing studies nor a failed model establishes noncoverage. Outputs are nonbinding drafts, not insurer authorizations, denials, or recommendations to undergo surgery.

## Procedure catalog

The menu contains 11 specialties and 30 curated entries, not an exhaustive procedure/CPT/HCPCS or coverage catalog. Each entry has an official U.S. source link in `procedures.js` and under the menu. Specialty assignments are editorial and overlap. Sources reviewed October 19, 2026:

- U.S. National Library of Medicine, MedlinePlus encyclopedia: https://medlineplus.gov/ency/encyclopedia_S.htm
- American College of Surgeons specialties: https://www.facs.org/for-medical-professionals/education/programs/so-you-want-to-be-a-surgeon/section-ii-surgical-specialties/
- ACS cholecystectomy: https://www.facs.org/for-patients/the-day-of-your-surgery/cholecystectomy/

## Technical sources

- Transformers.js CPU/WASM overview: https://huggingface.co/docs/transformers.js/en/index
- Runtime release: https://github.com/huggingface/transformers.js/tree/3.8.1
- Model card and license: https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct
- Quantized assets: https://huggingface.co/HuggingFaceTB/SmolLM2-1.7B-Instruct/tree/main/onnx
- NCBI E-utilities: https://www.nlm.nih.gov/dataguide/eutilities/utilities.html
- NCBI usage limits: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- NCBI disclaimer/copyright: https://www.ncbi.nlm.nih.gov/About/disclaimer.html

## Verification

32 automated tests passed using synthetic fixtures and mocked inference/network responses. Checks cover CPU-only configuration, local prompt handoff, context overflow, JSON rejection, worker release, cancellation, dependent menus, sample fill, NCBI request logic and quote validation. JavaScript syntax checks passed. See VERIFICATION.md for limitations.

Actual model download, CPU inference, performance, mobile rendering and live PubMed browser CORS remain unverified: this workspace blocks dependency downloads and browser installation. This package removes the GPU dependency in code; it does not promise successful loading or clinically correct output on every device.
