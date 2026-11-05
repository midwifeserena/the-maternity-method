# Standalone NGN Questions in the Qbank

The Question Bank / Create Exam builder has an **NGN Questions** button alongside All Questions and Standard Questions. This is a format/section filter, not a replacement for clinical subjects. Antepartum, Intrapartum, Postpartum and Newborn are retained. Matrix items are included in NGN even when created before this feature.

## Proposed database setup (not applied to production)

Review `supabase/migrations/202611080001_standalone_ngn.sql` and test it in staging before production. Prerequisites: the existing NGN case/item/answer tables and all migrations through Question Studio. `supabase/question_studio_setup.sql` is the earlier combined setup if those Question Studio prerequisites are missing; do not run any test/fixture SQL against production.

The new migration adds:

- `questions.bank_section` (`standard` by default), optional `ngn_format`, and public interaction-only `ngn_config`.
- `ngn_items.qbank_question_id`, an immutable transfer mapping with a unique destination and deletion protection.
- Updated service-only editor/library functions, the existing authenticated exam-start function with the new public fields, and the service-only atomic transfer function.
- Triggers that protect transferred case/item/answer source records, including requests from old admin tabs.

It **does not move or publish any questions**, delete records, change the question-type enum, or rewrite exam scores/history. Existing rows default to their previous behavior. No storage configuration or new dependencies are required. Review this SQL before running it in the intended project. Deploy the corresponding application code with the migration; older testing clients do not render the new interactions.

## Move approved standalone content

After setup is installed:

1. Open **Admin → Admin NGN Case Studies** and select a standalone group.
2. The **Move to Question Bank** panel appears for groups with a nonzero item count other than six. Check the title, count and content; an incomplete multi-item case must not be treated as standalone solely because its count differs from six.
3. Save any edits, approve every question, and keep both the questions and parent case unpublished. The panel lists any blocking approval/publication states and provides direct Approve/Unpublish buttons for the affected question or case. The transfer action explains remaining blockers instead of silently remaining disabled; only an operation already in progress disables it. Click **Move to Question Bank** and confirm the exact group/count.
4. Open **Admin Questions**, filter **NGN Questions · all formats** and **Draft**. Review each converted question and use its Student Preview, then deliberately publish when ready.

The transfer API rereads saved source records and converts known formats only. It preserves stable item IDs as question IDs, the clinical introduction/chart, choices, correct keys and rationale. A collision never overwrites existing Qbank content. The database locks/rechecks the source and commits destinations, private solutions and source mappings together. A failed group transfer rolls back completely. Repeated requests return the existing destination IDs. All source records remain intact; fully transferred groups disappear from the case-study admin list. Six-question cases are rejected by both the API and database. No automatic bulk move is based on draft status or item count.

Standalone single response, SATA and matrix items use their established Qbank renderers/scorers. Additional NGN formats are bowtie, highlight, drop-down cloze, drag-and-drop cloze, and drag-and-drop selection. Unsupported/incomplete/ambiguous source data blocks the whole group instead of inventing content or keys.

## Authoring and scoring

The existing Question editor offers the new formats in **Question type**. Its Question tab has form controls for headings, bowtie groups and counts, available choices per group/blank, and the cloze sentence. Use `{1}`, `{2}`, etc. for blanks; adding/removing/reordering clinical rows updates blank configuration and numbering. The Answers tab edits choice text and private correct selections. Settings retains the clinical subject and permits section assignment. No source-code edits are needed per question.

- Bowtie: 0/1 per correct box, constrained to the configured selections for each group, with partial credit. Over-limit, duplicate or invalid group selections earn zero for that group.
- Cloze: 0/1 per blank; drag-and-drop also has accessible menus for keyboard/touch input.
- Highlight and drag-selection: existing SATA +/- scoring, floored at zero.
- Matrix single and multiple: existing per-row 0/1 or per-row +/- rules are unchanged.

Protected correct answers and rationale remain exclusively in `question_solutions`. Public configuration uses an explicit allowlist, validated on authoring/transfer and sanitized for learner payloads. Study feedback, timed completion, ownership checks and saved snapshots use the existing exam architecture. Review highlights selections and correct answers using both labels and color; new saved exams retain format/configuration, chart, key, rationale and awarded points. No scoring or reveal changes are made to the separate six-question case-study player.

## Verification

Validated unit/API regressions, all 78 items in the supplied original import against the converter (without moving live records), TypeScript, scoped lint, and a production webpack build with offline font fixtures. Isolated Chromium checks covered five new formats at desktop/phone sizes, selection, reveal locking, timed concealment and read-only archived review. Disposable PostgreSQL tests covered all nine imported format names, private solutions, draft visibility, stable IDs, idempotency, source protection, snapshot retention, six-item protection, stale source rejection and full rollback on ID collisions. Existing question/scoring/review tests remain in the test suite.

Live Supabase records and production deployment have not been accessed or modified. Check staging with a completed Study and Timed exam before production rollout. Browser/API tests use isolated fixtures; the real Supabase/Vercel integration still needs verification in the intended project.

## Transfer button troubleshooting

The transfer panel shows each individual question's approval and publication state; the case badge alone is not sufficient. Resolve the listed blockers using the panel's per-question Approve/Unpublish controls and the parent-case Unpublish control when present. Save actual edits first, or explicitly discard them. Touched-and-reverted fields and reordered JSON object keys are not treated as unsaved edits. Clicking Move before requirements are met shows the exact reason and does not call the transfer API. Server approval, ownership, six-question protection and atomic-transfer checks are unchanged. This UI fix needs no additional SQL beyond the original standalone NGN migration.
