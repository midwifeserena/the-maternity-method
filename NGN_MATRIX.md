# Matrix/grid multiple-choice and multiple-response

This second local commit builds on `codex/question-education`. Neither feature has been pushed or deployed and no production SQL has run.

## What inspection found

The question bank already had `type='matrix'`, options as column IDs/labels, matrix_rows as row IDs/labels, and a protected answer_key mapping each row to one option. Existing matrix multiple choice earns 0/1 per row. The separate NGN case-study player has its own schema/scorer and is deliberately unchanged.

The extension retains the existing question type enum. A new `matrix_mode` distinguishes single and multiple selection, and a protected `row_explanations` map supplies row-specific teaching. Existing clients/archives with no mode use single selection. Only the new multiple-response mode gets new scoring logic; existing single-choice, SATA and matrix multiple-choice grading formulas are retained.

## Proposed migration

After the approved archive and education/storage migrations, apply `supabase/migrations/202611060001_matrix_multiple_response.sql` first in staging. It adds:

- `questions.matrix_mode`: text, default `single`, allowing `single`/`multiple`. Existing types and keys are not converted.
- `question_solutions.row_explanations`: JSON object, default `{}`, protected by the existing solution-table RLS.
- The public start RPC includes selection mode but excludes answer keys, explanations, rationale media and nursing tips.
- Service-only transactional RPCs create new matrix drafts and edit matrix content. Editing content saves as draft; publication is a separate validated administrator action. Failed solution writes roll back their associated question writes.

No existing question is deleted/replaced by the migration, and no score, response or student progress is recomputed. Existing JSON exam archives automatically preserve the new mode/explanation fields for future tests. Selected arrays remain in the existing exam_responses.response JSON, so no exam-history schema change is needed.

## Formats and scoring

**Matrix multiple choice:** exactly one option per row; correct row earns one point. Existing missing-mode questions retain this behavior.

**Matrix multiple response:** one or more independently selectable options per row. Within each row, add one point per correct selected option and subtract one per incorrect selected option, with a minimum of zero for that row. Sum the row scores. Possible points are the total distinct correct selections. Unselected options earn nothing; duplicates cannot add credit. A row whose selections are absent or malformed earns zero. Extra response row IDs are ignored, as in existing matrix scoring.

Example: row 1 has two correct choices and the student selects those plus one wrong choice: +2−1 = 1/2. Row 2 has one correct choice selected: 1/1. Total: 2/3. This documented practice scoring rule is implemented only for the new mode; this app is not an official NCLEX CAT scoring engine.

Study mode's existing completeness check requires an answer in each row before checking the question. Timed exams can still submit incomplete/unanswered items and award only earned points. Original item/overall points and review filters continue using recorded scores; review never rewrites results. Older exams using current-bank fallback remain clearly labelled and keep their original recorded classifications even if a current key differs.

## Authoring

Use **Question Bank Studio → Create matrix/grid question**. Add a clinical scenario, category, 2–8 answer columns, 1–20 clinical rows, one/multiple selection format, the answer key, optional row explanations and the overall rationale. Save as draft, review, then publish explicitly. Every row must have a valid key; new multiple-response rows require at least one correct choice. Row/column IDs stay stable when labels are edited.

Existing matrix questions expose the same editor below their image/tip fields. Structural/content changes save as drafts. Save education and matrix content separately; unsaved work warns before leaving. Public question image and protected rationale image/tip editing remain available after creating the draft. Do not publish a matrix until its clinical wording, key and explanations have been checked by a qualified reviewer.

For SQL imports, a multiple-response example uses:

```json
{
  "type": "matrix",
  "matrix_mode": "multiple",
  "options": [{"id":"a","label":"Assess"},{"id":"b","label":"Monitor"}],
  "matrix_rows": [{"id":"r1","label":"Initial finding"}]
}
```

The associated protected question_solutions row contains `answer_key={"r1":["a","b"]}`, `row_explanations={"r1":"Assess and monitor relevant findings."}`, and the overall rationale. Single-selection matrices use string-valued keys such as `{"r1":"a"}`. Never put keys or explanations in the public row/column objects.

## Reveal, accessibility and design

The shared `QuestionMatrix` component renders both live tests and completed reviews. Live controls use radios or checkboxes; completed/revealed controls lock. Green indicates correct cells and red indicates wrong selections, with visible “Your answer”/“Correct answer” labels. Row explanations are shown only when a solution has been revealed by the existing authorized flow. Overall rationale and optional image/tip sections follow that same gate.

The NCLEX exam layout is retained. Admin cards use existing brand colors. Tables have row/column headers, descriptive control labels, a keyboard-focusable horizontal scroll region and 44 px touch targets. Wide grids scroll inside the table region rather than widening the page. Light/dark viewing remains available.

## Changed code

- `lib/matrix.mjs`, `matrix-authoring.mjs` and declarations: new-mode scoring, selection helpers and administrator validation.
- `lib/scoring.mjs`, `exam-tools.mjs`, declarations and `questions.ts`: an explicit multiple-response branch and completeness/type support. Existing scoring branches are retained.
- `components/question-matrix.tsx`, `exam.tsx`, `exam-review.tsx`, `exam.css`: shared accessible controls, revealed cell feedback and row explanations.
- `lib/exam-review.mjs`, `question-media-server.ts`, `/api/study/check`, `/api/exams/submit`: carry mode/explanations while retaining ownership, submission, reveal gates and stored scores. Media resolution touches only image fields, never answer IDs or scoring data.
- `components/matrix-question-editor.tsx`, `question-studio.tsx`, `/api/admin/questions`: create/edit/draft/publish workflow, preserving education fields and enforcing existing administrator auth.
- The proposed migration and unit/API/PostgreSQL regression tests.

## Validation and limitations

TypeScript and the available unit/API suites pass, including all existing scoring regressions. New tests cover selection independence, both formats, row-level floors and partial credit, duplicates, unknown choices, incomplete responses, persisted arrays, protected explanation fields, frozen reviews, draft validation, role restrictions and media signing without transforming answer identifiers.

Disposable PostgreSQL 17 tests verify old scores/keys remain intact, existing matrices default to single selection, new matrices begin as drafts, RPC grants/ownership/RLS, mode in start payload without protected answers, saved arrays/points, archived keys/explanations after current edits, cross-student denial and failed create/edit rollback. Migrations were also rerun locally. Use `tests/sql/matrix-check.sql` only in the disposable test setup after the existing exam-review/education fixtures, never in production.

Chromium with actual components and isolated API fixtures covers both Study and Timed multiple-response flows, optional media/tips, no premature reveal, row explanations, submission and review with unchanged saved scores, plus the existing single/SATA/matrix-MC exam regression. Admin UI checks cover draft creation, key/explanation editing, image/tip editing, explicit publication and mobile layout. These are synthetic test sessions, not live student accounts; staging checks against the real Supabase project remain necessary. The cloud environment cannot download the existing Google Fonts for a normal production build.

Additional build verification: the exact proposed source passed Next.js route generation, TypeScript and an offline webpack production build using Next's Google Font test fixtures backed by a local system font. This verifies compilation and route output without changing the application's font configuration. A normal build fetching the actual Google Fonts remains unverified in this restricted network environment.
