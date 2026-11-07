# Document audio reviews

Podcast accepts PDF, PPTX, DOCX, UTF-8 TXT and MD files and creates an editable script from selected source sections. Students can include PowerPoint speaker notes. Presentation order and note relationships are read from the archive. Older PPT files must be exported as PPTX or PDF.

Extraction runs in the browser. Source files are not uploaded. Only explicitly saved scripts use the existing authenticated Study Studio notes API and owner policies. No new SQL, bucket, API key or paid AI/voice provider is needed. Existing Study Studio database setup is still required to save scripts.

Limits: 10 MB source files; 100 PDF pages; 200 slides; 500,000 extracted characters; 100,000 script characters. Selected XML archive entries have bounded sizes. External XML entities and external relationships are rejected. Images are not decompressed from Office archives.

This organizes source text, rather than generating an AI summary. Images, charts, handwriting and scanned pages are not interpreted. DOCX headers, footnotes and comments are excluded. Students should check extracted tables, units, abbreviations and reading order before playback. Source text preserves Unicode clinical symbols. Changing section selection requires rebuilding or editing the script before playback/save.

## Voice

Native browser speech synthesis is free to this application. An available English female voice is preferred using known voice names or explicit labels, with device voices preferred. The browser API has no standard gender attribute, so this is a suggestion rather than a guarantee. Students can preview all available voices and select one; their selection is remembered in browser local storage. When no female voice can be identified, the interface explains how to choose or enable one. Voice lists that load asynchronously are supported.

Some browser-provided voices may use the browser vendor's online service. Extraction itself is local; this does not guarantee that every native voice works offline. No paid API is called by this feature. Scripts can be downloaded as text; this feature does not produce MP3 recordings.

## Validation

Unit tests cover clinical text preservation, source ordering, script bounds and voice selection. Chromium tests use real PDF.js and Office extraction, with mocked authenticated notes and speech output. They cover PPTX order and speaker notes, PDF/DOCX/TXT import, selection/rebuild, private script save, no source upload, female preference, preview, saved manual selection, missing female voices, unsafe XML rejection and mobile widths. Audible quality and voice gender must be checked on the target device.

Existing repository tests, TypeScript, scoped ESLint and a production build are run. No production database or deployment changes are applied.
