# SDS Citation Generator — web app

A zero-install, **client-side** web app that turns a chemical Safety Data
Sheet (SDS) into an **ACS citation** and an **RIS file** for Zotero, EndNote
and Mendeley.

* **Private by design.** PDFs are parsed in your browser with
  [pdf.js](https://mozilla.github.io/pdf.js/). Nothing is uploaded to a server.
* **Paste a link or drop a PDF.** Link-paste works where a supplier allows
  cross-site downloads; otherwise download the PDF and drop it in.
* **Generalised parsing.** Field extraction follows the GHS "Section 1:
  Identification" structure shared by all compliant SDS, plus a small supplier
  registry for canonical names, locations and SDS URLs — so adding a supplier
  is usually a one-line registry entry, not a new parser.
* **Editable.** Every parsed field can be corrected before export; extraction
  is a starting point, not the last word.
* **Optional name check.** "Verify names (PubChem)" looks each CAS number up
  against the free [PubChem](https://pubchem.ncbi.nlm.nih.gov/) API to fill a
  missing name or flag a mismatch. It is opt-in and fails soft if PubChem is
  unreachable.

## Run locally

ES modules need to be served over HTTP (not opened as a `file://` URL):

```
cd webapp
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (free)

It is fully static — host `webapp/` on GitHub Pages, Netlify or Vercel. No
build step and no server code.

## Supplier coverage

* **Full** (verified against real SDS PDFs): Sigma-Aldrich, Alfa Aesar /
  Thermo Fisher.
* **Beta** (recognised and parsed via the generic GHS extractor, not yet
  verified against a real PDF for that vendor): TCI, VWR, Honeywell / Fluka,
  Acros Organics, Oakwood, Strem, Spectrum, Merck (EMD Millipore).
* Unrecognised suppliers are still parsed generically and flagged for review.
  Use **Request a supplier** in the app to add one.

## Tests

The parser is pure logic and is tested in Node against text extracted from the
sample SDS PDFs:

```
node webapp/test/run.mjs
```

Fixtures in `test/fixtures/` are the pdf.js text extractions of the sample
PDFs, so the tests exercise the same input the browser produces.
