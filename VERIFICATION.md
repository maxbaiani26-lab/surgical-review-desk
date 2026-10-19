# CPU release verification — October 19, 2026

## Completed

- JavaScript syntax checks on all five executable JavaScript/module files.
- 32 Node tests passed (synthetic data; mocked network/model). The CPU runner explicitly selects device: wasm and dtype: q4, configures one WASM thread, attaches schema instructions, checks actual prompt token length, accepts only complete JSON, and reports model asset failures without substitutes.
- Main workflow starts without navigator.gpu, terminates the worker on success/error/cancel, and exports retained PubMed records if inference fails.
- Dependent specialty/procedure selection, per-entry official source links, complete fictional example without transmission, stale-input clearing, timeout wrapper and prior assessment validation tests pass.
- Source review confirmed the model's q4 ONNX artifact (about 1.41 GB) and maximum 8,192-token context. Asset download size is not runtime RAM consumption.

## Unverified

- Actual Transformers.js/WASM/model downloads and first real CPU generation. This workspace restricts outbound network access; browser installation was also blocked during prior work.
- Live HTTP(S) browser CORS access to NCBI, mobile rendering, cache reuse/quota behavior, actual latency/RAM and end-to-end performance on the user's machine.
- Clinical reasoning, policy interpretation, and adequacy of the small general-purpose model. This is not a clinically validated system.

## Manual acceptance on the deployed site

1. Upload all six app files together. Hard-refresh; confirm CPU · Prototype.
2. Fill the example. Confirm all intake fields, fictional policy and PubMed query appear; no search runs automatically.
3. Start assessment. Confirm PubMed records appear, then CPU asset download progress. No GPU prompt/error should be needed.
4. Keep the tab open through model download/initialization and generation. Confirm valid assessments include quoted sources; malformed responses fail explicitly.
5. Test Stop during loading and generation; confirm controls restore and no partial recommendation is presented.
6. Verify citation and policy reasoning manually. Test export even when AI fails. Edit a case field; confirm previous results clear.
7. Inspect network requests if needed: only public model/runtime assets and submitted NCBI queries should be sent, with no clinical prompt sent to a remote inference service.

Development commands:

```
node --check app.js
node --check procedures.js
node --check pubmed.js
node --check assessment.js
node --check assessment-worker.mjs
node --test tests/*.test.cjs
```
