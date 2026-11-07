# Combined standalone and NGN case exams

Create Exam and Question Bank offer three content choices: Standalone Questions, NGN Case Studies, and Both Together. Students select a standalone question count and/or specific complete cases, then choose Study or Timed Test. Each case contributes all six ordered items as one contiguous block. The existing maximum of 50 questions applies to the entire exam. Both Together requires at least one standalone question and one case.

## One player, one score, saved history

All three choices use the existing Exam controller and shared NCLEX window: timer/pause, light/dark viewing, calculator, selected-text highlighting, strikeout, flags, and navigation. Standalone selections come first, followed by the selected complete case blocks. Case number and within-case position appear above each case question. Submission saves one overall point total and percentage in exam_attempts. Previous Exams and Performance include the completed combined or case-only session. Review uses the original frozen stem, choices, chart, keys, rationales, media references, answers, and points.

Standalone responses remain in exam_responses, preserving existing question-history filters and progress. NGN responses use the new exam_case_responses table, joined to the same frozen exam_review_items. The history/review reader combines both stores. NGN snapshots use fresh per-attempt UUIDs, so a case source ID cannot collide with a standalone question ID. No fake questions are inserted into the question bank and no source cases are moved or deleted.

Legacy NGN response keys are normalized for the existing interactive renderers while retaining the original case scorer. In particular, legacy matrix multiple response keeps its existing exact-match-per-row rule. Canonical numeric, ordered, paired-cloze, and other NGN formats keep their existing scorer. The normal standalone path remains unchanged.

## Reveal and security

Study-mode standalone items retain immediate permitted feedback. Case answers remain hidden until the entire exam is submitted, matching the existing case reveal rule. The study-check endpoint rejects requests for a pending case item even in Study mode. Timed exams retain their existing post-submission reveal rule. Students cannot read pending solution snapshots, supply scoring keys, edit scores, or access another student's attempt. New snapshot-start and completion RPCs are service-role-only; application handlers authenticate and supply the verified user ID.

Only published cases with exactly six published items numbered 1–6 can be selected. The server checks complete publication, solution availability, key configuration, duplicate IDs, and exam length before saving. SQL checks source availability and contiguous case order again. One transaction saves all responses and the completion score, or none. Repeat completion returns the original score.

## PROPOSED database change — not applied to production

Review supabase/migrations/202611100001_combined_exam_sessions.sql before applying it to production. It requires the existing exam-review and NGN/question-format setup. A preflight check explains missing core prerequisites.

The migration:

1. Adds source_kind, source_id, and case_id metadata to exam_review_items. Existing snapshots default to ordinary questions.
2. Adds exam_case_responses with owner-only completed-session reads, read-only student access, and a foreign key to its archived item.
3. Adds the service-only start_mixed_exam_attempt function.
4. Extends the existing complete_exam_review_attempt function, with the same signature and service-only permission, to save standalone and case responses atomically into their respective tables.
5. Adds a private version marker used by the authenticated capabilities endpoint.

It does not import/publish questions or cases, alter existing answers, change historical scores, or backfill imaginary NGN history. Past NGN practice that did not save responses cannot be reconstructed.

## Safe rollout

The application checks the marker before enabling case-only/combined exam generation. Without the migration, standalone exams continue working and the direct NGN library retains its existing practice player. Case choices remain visible but cannot generate a falsely incomplete exam. After the migration is reviewed and installed, reload Create Exam. Complete cases started from the NGN library then use the same saved Exam player as Create Exam. Non-six-item legacy groups retain their old practice path.

Test the SQL in a staging project first, review the authenticated Vercel preview, and coordinate applying this proposed migration and merging the branch. No production deployment or production SQL was executed during development.

## Verification

- Existing Node tests plus combined-format, private-key, eligibility, grouping, readiness, and API tests pass.
- TypeScript, scoped ESLint, and the production build pass; local builds use temporary offline font fixtures because Google Fonts is blocked.
- Disposable network-disabled Postgres 17 tests run the existing migration chain and this proposal. The previous standalone SQL regression passes unchanged. Combined SQL assertions verify ordered six-item blocks, hidden pending keys, owner-only history, frozen content, both response tables, one score, omitted answers, idempotency, completed-snapshot immutability, full rollback if a case response insert fails, and unchanged old scores.
- Browser tests with mocked APIs run all three choices, a seven-item mixed Study exam with partial credit across case formats, one 40% score, saved history/review, case-only Timed mode, the unified direct NGN Study player, readiness fallback, and mobile layouts.

For disposable SQL testing only: bootstrap auth roles, load schema.sql, load tests/sql/combined-exams-bootstrap.sql and the existing exam-review seed, apply the migration chain, then run tests/sql/combined-exams-check.sql. The new check wraps its synthetic data and edits in a rollback transaction. Never run test bootstrap/seed scripts in production.
