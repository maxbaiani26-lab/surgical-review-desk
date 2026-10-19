# Surgical Review Desk — evidence-assisted coverage draft

App URL: https://maxbaiani26-lab.github.io/surgical-review-desk/

## Changes in this version

- Choose specialty first, then a procedure. Eleven specialties and 30 curated procedure entries have per-procedure links to U.S. National Library of Medicine MedlinePlus or ACS. The list is not exhaustive, is not a CPT/HCPCS coding catalog, and does not establish coverage. Specialty assignments are editorial and can overlap.
- The example button fills every case field, including a clearly fictional training policy and a manual-reference explanation, without transmitting anything or inventing studies.
- A status message near the main action now exposes PubMed search, article retrieval, GPU checks, and AI progress. Startup errors identify missing application files. Versioned script URLs reduce stale-cache mismatches.
- Bounded search, GPU and worker waits report stalls explicitly and retain retrieved references for export. These changes address silent waiting; they do not remove hardware or external-host requirements. The reported production failure could not be reproduced because this workspace blocks the live site and external services.


- Removed the documentation completeness checklist, checkboxes, scores, and readiness labels.
- One action now searches PubMed, includes all returned records automatically, and attempts a local AI coverage assessment using retrieved abstracts, case facts, and the supplied policy.
- No manual article selection is required. The app includes up to ten records from the submitted query.
- The draft may suggest **support coverage**, **policy does not support coverage**, or **indeterminate**. It includes policy comparisons, PMIDs, exact source quotes, uncertainties, and a next step.
- Input edits clear the prior assessment and retrieved records so an old recommendation is not presented against a new case.
- No insurer decision is made, no authorization request is submitted, and no clinical treatment is prescribed.

## Deploy the update

1. Unzip the package and open its `surgical-review-desk` directory.
2. Upload that directory's contents to the root of the existing `maxbaiani26-lab/surgical-review-desk` repository. Replace the old files. The following six files are required:
   - `index.html`
   - `app.js`
   - `procedures.js`
   - `pubmed.js`
   - `assessment.js`
   - `assessment-worker.mjs`
3. Commit to the configured GitHub Pages branch (normally `main`). In **Settings → Pages**, the branch configuration should be `main` and `/ (root)`.
4. After deployment, hard-refresh https://maxbaiani26-lab.github.io/surgical-review-desk/ . The main button should read **Search evidence & assess coverage**.

No GitHub deployment or repository write was performed as part of this delivery.

## Use

1. Enter a de-identified case, including procedure, indication, symptoms, objective findings, prior treatment, and relevant patient factors.
2. Paste the actual applicable coverage policy excerpt, identifying its plan, section, and version/date. Without an applicable policy, medical literature alone cannot establish coverage and the result remains indeterminate.
3. Review the query drafted from procedure and diagnosis. Optional query edits, publication dates, type filters, and sorting are available in the PubMed panel.
4. Click **Search evidence & assess coverage**. The app retrieves up to ten records, includes them without manual selection, then attempts to run the assessment model locally.
5. Review the draft's reasoning, citations, quotes, limitations, and listed abstracts not analyzed. Use Copy or Download to export the report with the clinical snapshot, evidence, abstracts, and query provenance.
6. Stop cancels model execution; clear discards the case. Reloading discards case information.

The button is the explicit request to transmit the displayed search query to NCBI. Typing never starts a network search. Intake controls are disabled while an assessment runs.

## Local AI requirements

The application remains a static GitHub Pages site with no backend, API key, paid API, or separate application. The assessment is actual language-model inference implemented with **WebLLM 0.2.85** and **Llama-3.2-3B-Instruct-q4f32_1-MLC**, running in a dedicated browser worker.

- Requires HTTPS, a WebGPU-capable browser/device, and several GB of available GPU memory. Exact requirements depend on hardware and model context. This is not guaranteed to work on every laptop or phone.
- The first use downloads large model artifacts and can take several minutes. Model assets may be cached by the browser; case prompts are not explicitly persisted.
- The pinned runtime is downloaded from jsDelivr. The runtime's model configuration downloads weights and compiled components from MLC's model hosts, including Hugging Face and GitHub-hosted assets.
- There is no remote inference API. Case content is passed to the local worker, not to NCBI or a model inference service. Only the query and filters go to NCBI; model hosts receive asset requests.
- The worker clears chat context after generation. Stop terminates it. Case content otherwise exists in page/worker memory until cleared or unloaded.
- If the model, GPU, CDN, or source access fails, the app shows a technical failure/indeterminate state and does not fake an AI result.
- Model initialization has a 3-minute deadline and generation a 3-minute deadline. An unresponsive worker fails after 30 seconds; subsequent lack of progress fails after 90 seconds. The GPU adapter check has a 10-second limit. The Stop button ends either.

Review the model's licensing and restrictions for any use beyond this prototype:
https://huggingface.co/mlc-ai/Llama-3.2-3B-Instruct-q4f32_1-MLC

## Evidence and validation rules

- The model receives full available abstracts that fit a bounded input, not article titles as substitute evidence. Missing-abstract and retracted/expression-of-concern records are included in the exported record list but not provided as evidentiary support to the model.
- The case/policy budget is 7,000 characters; the abstract/title budget is 10,000 characters. No partial abstract is silently substituted. The local model context is set to 8,192 tokens; character limits are only a conservative heuristic, and tokenization can still cause a visible failure.
- All records returned by the first retrieval are included in the report. Records skipped for model context are listed, and any context-omitted abstract withholds a directional recommendation.
- PMID membership and exact policy, case, and abstract quote presence are checked. Fabricated identifiers or nonmatching quotes reject the draft.
- Directional support requires cited supportive evidence and stated policy comparisons marked met. Negative support requires an explicit case-specific policy conflict with an actual quoted case fact. A missing policy, absent substantiated evidence, unaddressed supplied abstracts, or certain validation gaps produce indeterminate.
- These checks do **not** validate clinical reasoning, detect all missing policy conditions, prove applicability, or determine whether quoted text supports the model's interpretation. The small general-purpose model can make serious mistakes even when all formatting checks pass.
- A limited search of ten records is not a systematic review. PubMed indexing, search rank, recency, publication type, and absence of a notice establish neither reliability nor coverage.
- Manual references are labeled unverified; they are not independently retrieved. Full text is not fetched. A clinical specialist must verify the sources, policy, and patient-specific interpretation.
- This prototype is not clinically validated and must not be used as an autonomous approval/denial system or to withhold care.

## Verification

See `VERIFICATION.md`. Twenty-four automated service, validation, and workflow-state tests pass. They use synthetic test data and mocked AI/network responses; they do not establish actual model quality.

Live PubMed CORS, actual model download/inference, visual/mobile rendering, and end-to-end performance remain unverified in this workspace. NCBI and browser installation downloads were rejected by this workspace's network policy during the prior integration. No claim is made that the new model can load here or on every device.

Development checks (not required by deployed app):

```
node --check app.js
node --check pubmed.js
node --check assessment.js
node --check assessment-worker.mjs
node --test tests/*.test.cjs
```

## Procedure catalog sources

Reviewed October 19, 2026. Each entry in `procedures.js` contains its exact public source URL, also shown under the procedure menu. Source wording is normalized into concise menu labels. Specialty grouping is an editorial organization, not an official exhaustive taxonomy or an exclusive scope-of-practice claim.

- U.S. National Library of Medicine, MedlinePlus Medical Encyclopedia: https://medlineplus.gov/ency/encyclopedia_S.htm
- American College of Surgeons, specialty descriptions: https://www.facs.org/for-medical-professionals/education/programs/so-you-want-to-be-a-surgeon/section-ii-surgical-specialties/
- ACS cholecystectomy patient information: https://www.facs.org/for-patients/the-day-of-your-surgery/cholecystectomy/

## Technical sources and attribution

- WebLLM usage: https://webllm.mlc.ai/docs/user/basic_usage.html
- Web workers: https://webllm.mlc.ai/docs/user/advanced_usage.html
- API and context options: https://webllm.mlc.ai/docs/user/api_reference.html
- Official model registry: https://github.com/mlc-ai/web-llm/blob/main/src/config.ts
- NLM E-utilities: https://www.nlm.nih.gov/dataguide/eutilities/utilities.html
- NCBI usage: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- Data supplied by NCBI, U.S. National Library of Medicine: https://www.ncbi.nlm.nih.gov/
- NCBI Disclaimer and Copyright: https://www.ncbi.nlm.nih.gov/About/disclaimer.html

Abstracts may contain copyrighted material. API calls are batched and spaced within this page; other tabs/users sharing an IP can still exhaust quotas. No contact details, registrations, policy contents, citations, or clinical validation are fabricated.
