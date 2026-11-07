# Annotatable PDF notebooks

PDF import now creates real notebook pages instead of attaching a file beside a blank board. The document library/editor use The Maternity Method palette and root fonts, inspired by the owner's layout references. This implements PDF annotation and mixed pages; it is not a claim of complete Goodnotes parity.

## Student workflow

1. Open Study Studio → Notebook. The Documents grid includes covers, search, Favorites, recent/name sorting, New notebook and Import PDF.
2. Import an unlocked PDF from the device, or select an already uploaded private PDF. Each source page becomes a notebook page, with its aspect ratio preserved. Imported source PDFs stay unchanged and private.
3. Draw/highlight over the page, choose ink colors/width, add editable text and images, move/resize inserted objects, and use undo/redo, pan/zoom or full screen.
4. Blank before / Blank after inserts an editable blank canvas at that exact position. Page navigation, move earlier/later and confirmed deletion support mixed PDF/blank notebooks. Add PDF pages inserts another PDF after the active page.
5. Save notebook persists page order, PDF source/page identity and separate editable annotation objects. Reopening restores them. Existing explicit Save, local-draft recovery, revision conflict and Save as new protections are retained. Original PDF download and JSON notebook export remain available. JSON export is not a flattened annotated PDF or standalone bundled-file export.

Existing notebook pages without explicit dimensions continue using their original 1200×850 coordinate system. New blank notebooks use portrait pages. New blank pages inserted into a document inherit the current page size. New PDFs normalize dimensions while preserving aspect ratio. Notes now allow up to 100 total pages; the existing 500-elements-per-page and document-size bounds still apply. Drawing supports pointer input from mouse, touch or stylus; pressure sensitivity/OCR are not included.

## Local, free PDF rendering

One free Apache-2.0 dependency, `pdfjs-dist` 6.5.438, renders the PDF in the student's browser. No AI API, paid PDF service, document conversion server or external CDN is used. PDF JavaScript actions/XFA are not rendered as interactive application code. The application displays static page content with its own SVG annotation overlay.

Dependency installation, `npm run build` and `npm run dev` automatically prepare the pinned, same-origin worker, standard fonts, CMaps and WASM decoding assets through `scripts/prepare-pdfjs.mjs`. Generated assets live in ignored `public/pdfjs/`; the worker matches the installed package and its license is copied alongside it. No manual file upload or API key is required. The project now declares Node 22.13+ for package compatibility; use a supported Node 22/24 runtime for builds. Google Fonts were mocked locally for the test build because that domain is blocked in the execution environment.

PDF documents/decoded bytes are scoped to the mounted view and destroyed when its owner/source changes or the view unmounts. There is no global private-document cache. Worker code is reusable; private source data is not shared across accounts. Library covers load only near the viewport. Page changes cancel old renders, and source/worker errors show a retry control rather than silently substituting another document.

## Data and privacy

**No new SQL migration is required** beyond the existing Study Studio setup. Existing notes already store JSON; the API's backward-compatible validator now supports optional page dimensions and `background: {kind:'pdf',assetId,sourcePage}`. Original files continue using the private upload endpoint/bucket and existing owner checks, quotas and restrictive policies. The 3 MB PDF upload limit and 50 MB personal upload allowance are unchanged. Do not delete a source PDF from My Uploads if it is still needed by a notebook.

Import validates page count and parses page sizes before uploading. Password-protected, malformed and over-limit PDFs are rejected without uploading a new source. Reusing a private upload does not upload another copy. The original file is retained once; pages are rendered on demand instead of saved as separate page-image files. Course resources, personal flashcards, exams, scores and reveal logic are unchanged.

## Files

- `components/studio-notebook.tsx`: document library integration, PDF import/reuse, variable page dimensions, editable overlays, mixed-page insertion/reorder/delete and existing save safeguards.
- `components/notebook-library.tsx`: Documents/Favorites, covers, search/sort and actions.
- `components/notebook-pdf-picker.tsx`: upload or reuse an owned source PDF.
- `components/notebook-pdf-page.tsx`, `lib/notebook-pdf.ts`: browser-only PDF.js loading, cancellation, rendering, private source fetch and import inspection.
- `lib/notebook-pages.mjs` / declarations: page sizing, bounded insertion/reordering, source-page descriptors.
- `lib/study-studio.mjs` and personal-content API validation message: compatible schema validation and 100-page bound.
- `components/study-studio.css`: branded library and editor/page rail, annotation paper, PDF layers, full screen/mobile layout.
- `package.json`, `.gitignore`, `scripts/prepare-pdfjs.mjs`: pinned free library and generated local assets.
- `tests/notebook-pages.test.mjs`, updated Studio model fixture: mixed-page identity/order, aspect ratio, preserved annotations, legacy content and validation limits.

## Verification

Repository tests, TypeScript, scoped ESLint and production build pass. Automated Chromium checks use real generated two-page PDFs and the actual local PDF.js worker, while personal API storage is mocked. Tests verify actual nonwhite PDF pixels, portrait/landscape dimensions, highlights/ink/text/images and undo/redo, blank insertion between source pages, reordering, save/reopen, document covers/favorites, source reuse without upload duplication, and 320/390/768 mobile layouts. Encrypted, malformed and 101-page documents fail before uploading. Preview images contain synthetic sample content. Real production credentials and student data were not accessed.

Prepared on `codex/annotatable-pdf-notebooks`. No production deployment or SQL was performed. Merging the code requires a successful new build so the local PDF.js assets are generated and deployed.
