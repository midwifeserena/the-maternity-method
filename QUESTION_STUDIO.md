# Full-page Question Bank Studio

This feature branch targets `main`. It is not merged and no production migration was applied. Existing scoring, submission, progress, exam ownership checks and authentication permissions are retained.

## What changed

- `/admin/questions` is a full-page searchable library, not a split editor. Category, format, publication and difficulty filters combine with topic/tag/text search. Exact counts, 25-item server pages and status indicators support libraries beyond 1,000 questions. Full stems/solutions are loaded only when editing; list excerpts are limited to 280 characters.
- Create and Edit open `/admin/questions/new` and `/admin/questions/[questionId]`. Five tabs retain one controlled draft: Question, Answers, Rationales, Preview and Settings.
- All existing standalone bank formats can be created/edited: single response, SATA, matrix multiple choice and matrix multiple response. Keys use existing option/row IDs; reordering changes presentation order without remapping answers. Changing format explicitly clears the key after confirmation. The unfolding NGN case library is linked separately and is unchanged.
- Question/clinical scenario text supports plain text or safe formatted text (bold, italic, bullets and numbered lists). The formatting toolbar inserts a small Markdown vocabulary; Preview displays the result. It is not a Word/HTML editor. Raw HTML, scripts and embedded markup never execute. Existing text defaults to plain and renders unchanged.
- Protected teaching includes overall rationale, per-choice correct/incorrect explanations, matrix row explanations, nursing tips, NCLEX test-taking tips and rationale images. Optional metadata includes category, topic/subtopic, difficulty and tags.
- Student Preview uses the existing answer controls, matrix component, scorer, image renderer and explanation components. It operates locally on the administrator's draft; it never calls student exam/study APIs or writes student scores. Viewport and light/dark controls help inspect phone/tablet/desktop layouts. Live question/review text rendering reuses the same formatting component; reveal timing is unchanged.
- Save as Draft permits incomplete content. Publish is an intentional action with strict validation. Editing a published question saves a draft first. If publishing fails after a save, the content remains a draft. Missing labels/keys/rationale and image descriptions are explained clearly.
- Duplicate creates an independent unpublished record with a new UUID and copied private solution; the source remains unchanged. Archive unpublishes without deleting or breaking relationships. Restore returns to draft. Editor revision checks reject stale saves by other new-studio actions.
- Existing questions retain stable IDs, chart data and extra option/row metadata. Saving updates only known editable columns; existing exam archives/responses are untouched. Legacy question-management endpoints remain available. Revision conflict protection applies to the new management RPC, not arbitrary SQL edits or old legacy writer RPCs.
- Navigation/reload/close guards warn about unsaved work. A failed initial question load never exposes an empty form that could overwrite the original record. Image uploads work before the first draft save; discarded uploads may remain unreferenced private objects and are not automatically deleted.

## Proposed database change

Review `supabase/migrations/202611070001_question_studio.sql` before applying it. It requires the existing archive, question-education/storage and matrix migrations.

Question metadata added: `clinical_scenario`, `content_format`, `topic`, `subtopic`, nullable `difficulty`, `tags`, nullable `archived_at`, `updated_at`, `editor_revision`, nullable `duplicated_from`. Private solution fields added: `rationale_format`, `answer_explanations`, `test_taking_tip`.

Defaults preserve existing question behavior: plain text, no archive flag, unset difficulty, empty tags/explanations. No question/solution rows are deleted or replaced by migration. No existing key, rationale, score or response is recalculated. Existing question/solution JSON snapshots automatically capture the new fields for future tests.

Two new service-role-only functions provide atomic management and a paginated/counting library query. The start RPC's whitelist adds only the public scenario and formatting flag. No RLS policies or authentication role permissions are changed. Teaching content remains in the existing protected solution table and only reaches the existing permitted feedback/review paths. The upload endpoint continues the existing administrator guard and private bucket; administrator-created unsaved drafts may upload under their preassigned UUID.

## Changed files

- UI: `components/question-studio.tsx`, `question-editor.tsx`, `question-studio.css`, `rich-text-input.tsx`, `question-preview.tsx`, `formatted-text.tsx`, `answer-explanations.tsx`, `nursing-tip.tsx`.
- Pages: `/admin/questions` page/layout, `/new`, `/[questionId]`.
- Admin APIs: `/api/admin/questions/library`, `/manage`, existing detail GET and media upload. No student endpoint authorization changes.
- Data/validation: `lib/question-authoring.mjs` and declarations; `questions.ts`, `exam-review.mjs`/declarations, `question-media-server.ts`; public helper declarations strip the new private fields.
- Student presentation: `components/exam.tsx`, `exam-review.tsx`, `exam.css` add optional safe formatting/scenario/teaching presentation under existing gates. The grading branches in `lib/scoring.mjs` are unchanged; only the public-payload stripping helper includes new private fields.
- Proposed migration above; authoring/API/PostgreSQL tests; preview screenshots under `docs/question-studio-*`.

## Testing performed

- TypeScript and all available test files: existing scoring, exam tools, matrix, review, media and admin tests; new validation, incomplete draft versus publish, stable-ID/revision handling, private payloads and safe formatting tests.
- Disposable PostgreSQL 17: migrations and rerun; preserved old question rows/responses; drafts/publish; unchanged option/key/chart metadata during partial edits; stale save rejection; copied private solution with new ID; archive visibility/restore-to-draft; atomic rollback; combined filters/exact counts; last-page retrieval beyond 1,000 records; service-only grants and hidden teaching fields in exam-start data. `tests/sql/question-studio-check.sql` is synthetic test code and must never run on production.
- Chromium with actual UI components and isolated APIs: full library/editor separation, five filters and pagination, existing question loading, reorder without changing key IDs, uploads before saving, rich-text preview, state retained across all tabs, persisted rationales/tips/tags, intentional publishing, unsaved navigation guards, duplicate/archive/restore, mobile fit, matrix MC/MR previews and no student API calls from admin preview.
- Existing live Study/Timed exam regression and completed-review workflow: scoring payloads, single/SATA/matrix selection, reveal, navigation, theme/settings, pause/timer retry and unchanged saved scores.
- The repository's `npm run lint` remains blocked by its pre-existing missing ESLint flat configuration. Targeted Next lint runs against the new code using a temporary config; only synchronous async-loading initialization and dynamic remote image optimization checks are excluded. No repo-wide lint configuration or dependency was added.
- A production build is checked with the existing offline Google Font fixtures because this environment cannot fetch the actual Google Fonts. No application font configuration is modified. Real Supabase credentials and Vercel build status are unavailable here; the final connected preview and staging database still require verification.

## Test the Vercel preview

1. Open the PR's Vercel preview after its build is Ready. Keep the PR unmerged while testing.
2. Point **Preview** environment variables to a separate Supabase staging project using its URL, publishable key and server-only service key; preserve Production values. Keep the existing `NGN_ADMIN_EMAILS` allowlist. If staging is empty, install the app's base `supabase/schema.sql` first, then the previous feature migrations in order, then this studio migration. Do not run `tests/sql/*` there unless it is a disposable test database.
3. Sign in as a staging administrator and open `/admin/questions`. Create one question of each bank format, add images/tips/explanations, save drafts, reload and inspect each tab/preview. Publish deliberately and check filters/counts. Duplicate and archive a sample; its source/old history must remain intact. Restore it and verify it remains a draft.
4. In a second administrator tab, edit the same question and verify a stale save is rejected. Refresh after reviewing/discarding unsaved changes. Confirm phone/tablet layout and keyboard tab navigation.
5. Sign in as a student. Admin pages/APIs must be blocked. Complete Study and Timed tests: question images/scenarios may display at start; protected tips/answers/explanations must follow existing reveal rules. Reopen each completed test, edit its source as admin, then verify archived content and original scores remain unchanged.

Clinical question content still requires your normal nursing/content review before publishing. The interface validates completeness and structure, not clinical accuracy. No production deployment or merge is performed by this change.


## Existing student questions missing from the admin library

The library now reads the existing `questions` table in authorized, view-only compatibility mode when the Studio function is missing, its columns are unavailable, its response is invalid, or its unfiltered zero count contradicts records in that table. This is not a second bank and does not re-import or change IDs. The fast SQL path remains in use when valid. Compatibility mode retrieves metadata in deterministic 500-row pages, applies supported filters before pagination, and never reads solutions or writes data. It may be slower for a large bank; installing setup restores the normal efficient query and management actions.

Missing difficulty metadata disables that filter instead of hiding all questions. View-only links keep save/publish/uploads disabled until setup is complete. An actual load/connection failure displays unavailable counts rather than fabricated zeroes. A truly empty connected project is identified separately, with guidance to verify the deployment's Supabase project. Student questions on another deployment/project cannot be copied automatically from here.

For an existing app database missing prior setup, `supabase/question_studio_setup.sql` combines the five prerequisite migrations into one transaction. It is proposed, not applied. Review it and run first in staging; it is not an initializer for an empty project and contains no question imports or table resets. The SQL header names the intended database. If a prerequisite fails, the whole transaction rolls back. Existing private-storage checks are retained. Do not run seed/test fixtures against your actual question bank.
