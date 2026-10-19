# SurgiReview / surgical-review-desk

Static surgical-request documentation assistant with an implemented PubMed E-utilities client. No build step, server, account, API key, or paid service. It retrieves metadata and abstracts, never makes an authorization decision, and is not an AI assessment system.

## Upload to your existing GitHub repository

1. Unzip the download. Open its `surgical-review-desk` folder.
2. In your existing `surgical-review-desk` repository, choose **Add file → Upload files**.
3. Upload the contents of that folder into the repository root. Replace `index.html` and upload both `app.js` and `pubmed.js`; all three are required. Upload README and tests as well if desired. Do not upload the enclosing folder as an extra nested directory.
4. Commit to `main`.
5. Under **Settings → Pages**, choose **Deploy from a branch → main → / (root)**, then save. If already configured, the commit triggers a new deployment.
6. GitHub shows the actual address in **Settings → Pages**:

   `https://YOUR-GITHUB-USERNAME.github.io/surgical-review-desk/`

No deployment has been performed by this delivery. Relative asset paths support the `/surgical-review-desk/` deployment path. If the old page persists after deployment, perform a hard refresh.

## Workflow

1. Enter de-identified procedure and indication details. A draft query is assembled locally until you edit it yourself.
2. Review and edit the PubMed query. Optionally select publication years, publication type, and sort order.
3. Click **Search PubMed**. The app sends that query and those filters to official NCBI E-utilities. Editing fields alone never sends a request.
4. Inspect article metadata, publication types, available abstract, and any notices supplied in the record. DOI links may require publisher payment; PMC links are offered when a PMC identifier is returned. The app retrieves no full text.
5. Include relevant records in the brief and document their relevance and limitations. Selected references are deduplicated by PMID and remain selected across searches.
6. Generate the brief. Intake edits and reference notes update it. Copy or download it as plain text. Export includes manual references, selected PubMed references, retrieval dates, query history, filters, available counts, and missing documentation.
7. Clear the form to discard the in-memory session.

## Network behavior and limitations

- Uses `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi` and `efetch.fcgi` via ordinary CORS GET requests.
- Retrieves batches of 10 records, starts requests at least 450 ms apart within this page, and retries HTTP 429/5xx twice with bounded backoff. Each request times out after 15 seconds. Other tabs or users sharing your network can still exhaust NCBI's IP-level quota.
- Does not use JSONP, a proxy, or simulated fallback records. Live failures are shown explicitly.
- PubMed exposes the first 10,000 search results through this pagination method. Refine broad searches. Results may change between pages because no fixed history snapshot is used.
- Does not automatically classify evidence strength or judge study applicability. Returned retraction/correction metadata is not a complete integrity check.
- Does not store data in localStorage, cookies, analytics, or a server. Reloading loses the session. Queries go to NCBI; copying, downloading, or opening article links is user initiated. Do not enter identifiers into query text.
- Manual policy and citation text is not independently validated.
- This prototype has not been clinically validated.

## Verification and current blocker

See `VERIFICATION.md`. Syntax checks and 10 automated service/state tests passed. Tests use explicitly synthetic fixtures only in the test files; production searches do not.

**Live PubMed functionality is implemented but not verified end to end.** This workspace rejected NCBI requests with HTTP 403 and the explicit response `Forbidden. Calls to this URL are not allowed.` It also blocked downloading the browser needed for browser tests. This is a workspace access limitation; it does not establish whether NCBI permits CORS from your deployed site. A live API query, browser-origin CORS behavior, XML parsing in a browser, and visual/mobile rendering remain unverified. If CORS is denied from your deployed origin, this implementation will show a connection error; a static-only solution under these constraints cannot be certified until the deployed-origin check succeeds.

## Test commands (development only)

The deployed app does not need Node or Python. If available locally, run:

```
node --check app.js
node --check pubmed.js
node --test tests/*.test.cjs
```

For an HTTP origin test locally, serve the parent directory containing the `surgical-review-desk` folder:

```
python3 -m http.server 8000
```

Open `http://localhost:8000/surgical-review-desk/` and perform the deployment acceptance checks in `VERIFICATION.md`.

## Official API documentation and attribution

- NLM E-utilities guide: https://www.nlm.nih.gov/dataguide/eutilities/utilities.html
- NCBI API documentation: https://www.ncbi.nlm.nih.gov/books/NBK25499/
- NCBI usage requirements: https://www.ncbi.nlm.nih.gov/books/NBK25497/
- Data supplied by NCBI, U.S. National Library of Medicine: https://www.ncbi.nlm.nih.gov/
- NCBI Disclaimer and Copyright: https://www.ncbi.nlm.nih.gov/About/disclaimer.html

Abstracts may contain copyrighted material. If operating a shared production service, review NCBI's current usage requirements, developer identification/registration guidance, and institutional requirements. No contact information or registration is fabricated in this prototype.
