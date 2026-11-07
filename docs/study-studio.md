# Student Study Studio

Study Studio groups Notebook, Flashcards, Video Lessons, Podcast and Study Sheets in the student sidebar. Existing logo/name, verified Student/Admin switch, Dashboard, Question Bank menus and administrator studios are preserved. Legacy `/flashcards`, `/video-lessons` and `/study-guides` routes stay available and highlight the Study Studio menu.

## No paid AI services

No AI model, paid voice service, paid API, new subscription or new runtime package is introduced. Podcast is an **audio recap**: the student chooses/edits typed text and plays it through native browser speech synthesis. It does not generate an AI summary, transcribe handwriting or images, extract PDF text, or produce an audio download. Scripts can be saved privately and downloaded as plain text. The browser/device determines available voices. Existing Supabase and hosting infrastructure are reused; this is not a promise that hosting/storage usage has no limits or costs.

## Personal tools

- **Notebook:** multipage white canvas (up to 20 pages), mouse/touch/stylus pointer drawing, pen/highlighter/whole-object eraser, typed text boxes, editable text size, selection/moving text and images, image scaling, pan/zoom, undo/redo, uploaded images, separate typed notes and uploaded PDF/text attachments. Images can be drawn over; PDFs open as attached source documents rather than native editable/annotatable PDF pages. This implements the requested core note-taking interactions, not full Goodnotes feature parity.
- **Saving:** Save notebook syncs the document to the authenticated account; this is not cloud autosave. Unsaved drafts are retained locally under a user-and-document-specific key and can be explicitly restored. Restored drafts retain their original revision. Conflicting cloud edits return 409 instead of overwriting; Save as new notebook preserves both versions. Local drafts are not a substitute for saving to sync devices. Export notebook downloads JSON with document data and image references, not a standalone PDF or bundled image backup.
- **Personal flashcards:** private create/edit/delete workflow with topics and high-yield marking. Reuses the same Flashcards/Learn/Test/read-aloud workspace as the course library. The existing course `/flashcards` page retains its published/approved library scope. Personal cards do not alter course content, exam scores or readiness calculations. Existing browser-local Know it/star ratings remain local, while personal card content is saved privately in Supabase.
- **Study Sheets:** My Uploads holds private PDF, PNG, JPEG, WebP and UTF-8 text files. Course Sheets reuses the existing 19-sheet library. Uploaded files can be previewed where the browser supports them, downloaded, or explicitly deleted. Removing a notebook retains uploaded source files; removing a source file makes any notebook reference to it unavailable.
- **Video Lessons:** existing video lesson workflow remains unchanged and is linked under Study Studio.
- **Podcast:** chooses saved notebook typed text or a saved recap, supports editing, playback/stop/speed, private script save and script download. Images/drawings and PDF contents are not transcribed. It uses the existing native speech hook with no AI calls or voice billing.

The Study Studio component rechecks browser authentication and remounts private tool state on account changes. Server endpoints always verify the session themselves. Private notebook drafts are namespaced to the authenticated owner and note ID.

## Proposed database and storage setup

Review `supabase/migrations/202611130001_study_studio.sql` before production. It has been tested only in a disposable local PostgreSQL database; no production SQL was applied.

The additive migration creates:

- `studio_notes`: owned notebooks/recap scripts, JSON content, revisions and timestamps.
- `studio_flashcards`: owned topic/front/back/high-yield content, revisions and timestamps.
- `studio_assets`: owned private upload metadata with strict owner/asset paths, allowed MIME types and bounded sizes.
- Private `student-study-studio` Storage bucket: 3 MB per file. A serialized quota trigger limits each owner to 50 MB of reserved upload metadata. Source bytes and signatures are checked by the authenticated upload endpoint. The API reserves quota before storage upload.

All personal tables enforce owner-only RLS with a restrictive guard in addition to ordinary owner policies. Supplied owner IDs and non-whitelisted record fields are ignored by the API. Updates match the current owner and revision. Assets cannot be updated or directly deleted by browser clients; this prevents metadata deletion from orphaning files to evade quota.

Direct anonymous/authenticated access to the private bucket is blocked even if broader old storage policies exist. Upload/read/delete endpoints authenticate and check owned metadata, then use the app's existing server-only Supabase service role for file operations. No public bucket or public/signed sharing link is generated. Paths are constrained to `<owner UUID>/<asset UUID>.<allowed extension>` to prevent traversal or cross-user key substitution. Downloads carry private/no-store and nosniff headers with a sandboxed content policy. No new credential/service is required beyond the existing server-only `SUPABASE_SERVICE_ROLE_KEY` already used for privileged exam operations. Browser bundles never receive that key.

Existing course tables, question/solution data, score/reveal functions, study guide files, brand bucket and other storage policies are not rewritten. If the new setup is absent, personal tools show a setup/unavailable message; course resources still work. The SQL refuses to reuse a public bucket of this name rather than silently changing its visibility.

## Validation and rollout

Node tests cover notebook validation and text extraction, allowed upload signatures/paths, endpoint authentication/owner scoping, field whitelisting, revision conflicts and private download ownership checks. Sidebar tests cover Study Studio and legacy resource deep links. Existing repository tests pass, along with TypeScript, scoped ESLint and the production build.

Browser tests with mocked personal APIs and speech exercise notebook creation, typing, drawing, undo/redo, image upload/moving, multiple pages, save/reload, local-draft recovery, conflict copies, personal card creation in the existing study player, native recap playback/script saving, personal uploads, the 19 course sheets and 320/390/768/1600 layouts. Speech engine output and production credentials are not exercised. Builds use temporary offline font fixtures because Google Fonts access is blocked.

Disposable local SQL tests verify notes/cards ownership, rejection of cross-owner edits/inserts, the 50 MB quota, immutable asset metadata, prohibition on direct browser storage access, private bucket visibility, anonymous isolation and survival of unrelated storage policies. Tests intentionally include a broad pre-existing storage policy to verify the restrictive guard. The migration is rerunnable.

Review the code preview and SQL in a Supabase staging project first. Actual upload/preview behavior and audible browser voice output should be checked on the target phone/browser before release. Nothing has been merged, deployed, or applied to production as part of this development work.
