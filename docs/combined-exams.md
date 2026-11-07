# Combined standalone and NGN case exams

Create Exam keeps Question Mode and Question Category. Category buttons select ordinary standalone questions, standalone NGN questions, complete NGN case studies, or any combination. All Questions selects all three; the other buttons toggle individual formats. The extra content selector and manual case picker are removed.

Students enter one total question count, up to 150, and choose Study or Timed Test. The builder automatically selects complete published cases from the chosen subjects, with all six items kept together. Case-only totals must be multiples of six. Every selected format must have matching content and be represented; insufficient counts/content produce an actionable message instead of silently shortening the exam. Standard randomizes eligible pools; Custom uses their saved order. Standalone status filters retain their existing behavior; case studies currently use subject filters rather than pretending legacy case-answer history exists.

## One player, one score, saved history

All three choices use the existing Exam controller and shared NCLEX window: timer/pause, light/dark viewing, calculator, selected-text highlighting, strikeout, flags, and navigation. Standalone selections come first, followed by the selected complete case blocks. Case number and within-case position appear above each case question. Submission saves one overall point total and percentage in exam_attempts. Previous Exams and Performance include the completed combined or case-only session. Review uses the original frozen stem, choices, chart, keys, rationales, media references, answers, and points.

Standalone responses remain in exam_responses, preserving existing question-history filters and progress. NGN responses use the new exam_case_responses table, joined to the same frozen exam_review_items. The history/review reader combines both stores. NGN snapshots use fresh per-attempt UUIDs, so a case source ID cannot collide with a standalone question ID. No fake questions are inserted into the question bank and no source cases are moved or deleted.

Legacy NGN response keys are normalized for the existing interactive renderers while retaining the original case scorer. In particular, legacy matrix multiple response keeps its existing exact-match-per-row rule. Canonical numeric, ordered, paired-cloze, and other NGN formats keep their existing scorer. The normal standalone path remains unchanged.

## Reveal and security

Study-mode standalone items retain immediate permitted feedback. Case answers remain hidden until the entire exam is submitted, matching the existing case reveal rule. The study-check endpoint rejects requests for a pending case item even in Study mode. Timed exams retain their existing post-submission reveal rule. Students cannot read pending solution snapshots, supply scoring keys, edit scores, or access another student's attempt. New snapshot-start and completion RPCs are service-role-only; application handlers authenticate and supply the verified user ID.

Only published cases with exactly six published items numbered 1–6 can be selected. The server checks complete publication, solution availability, key configuration, duplicate IDs, and exam length before saving. SQL checks source availability and contiguous case order again. One transaction saves all responses and the completion score, or none. Repeat completion returns the original score.

## PROPOSED database change — not applied to production

Review supabase/migrations/202611100001_combined_exam_sessions.sql and then supabase/migrations/202611110001_exam_limit_150.sql before applying them to production. It requires the existing exam-review and NGN/question-format setup. A preflight check explains missing core prerequisites.

The combined-session migration:

1. Adds source_kind, source_id, and case_id metadata to exam_review_items. Existing snapshots default to ordinary questions.
2. Adds exam_case_responses with owner-only completed-session reads, read-only student access, and a foreign key to its archived item.
3. Adds the service-only start_mixed_exam_attempt function.
4. Extends the existing complete_exam_review_attempt function, with the same signature and service-only permission, to save standalone and case responses atomically into their respective tables.
5. Adds a private version marker used by the authenticated capabilities endpoint.

The 150-question upgrade expands the snapshot-position constraint and the standalone/mixed start RPC limits to 150. It preserves RPC authorization and snapshot contents. It requires the combined-session migration first. If that setup is already installed, apply only the new 150-question upgrade. Both migrations are transactional and can be rerun.

Neither migration imports/publishes questions or cases, alters existing answers, changes historical scores, or backfills imaginary NGN history. Past NGN practice that did not save responses cannot be reconstructed.

## Safe rollout

The application checks the marker before enabling case-only/combined exam generation. Without the migration, standalone exams continue working and the direct NGN library retains its existing practice player. Case choices remain visible but cannot generate a falsely incomplete exam. After the migration is reviewed and installed, reload Create Exam. Complete cases started from the NGN library then use the same saved Exam player as Create Exam. Non-six-item legacy groups retain their old practice path.

Test the SQL in a staging project first, review the authenticated Vercel preview, and coordinate applying this proposed migration and merging the branch. No production deployment or production SQL was executed during development.

## Verification

- Existing Node tests plus combined-format, private-key, eligibility, grouping, readiness, and API tests pass.
- TypeScript, scoped ESLint, and the production build pass; local builds use temporary offline font fixtures because Google Fonts is blocked.
- Disposable network-disabled Postgres 17 tests run the existing migration chain and this proposal. The previous standalone SQL regression passes unchanged. Combined SQL assertions verify ordered six-item blocks, hidden pending keys, owner-only history, frozen content, both response tables, one score, omitted answers, idempotency, completed-snapshot immutability, full rollback if a case response insert fails, and unchanged old scores.
- Browser tests with mocked APIs run all three choices, a seven-item mixed Study exam with partial credit across case formats, one 40% score, saved history/review, case-only Timed mode, the unified direct NGN Study player, readiness fallback, and mobile layouts.

For disposable SQL testing only: bootstrap auth roles, load schema.sql, load tests/sql/combined-exams-bootstrap.sql and the existing exam-review seed, apply the migration chain, then run tests/sql/combined-exams-check.sql. The new check wraps its synthetic data and edits in a rollback transaction. Never run test bootstrap/seed scripts in production.

Additional verification for the category redesign: exact-size planning tests cover all seven format combinations through 150, invalid counts, missing formats, limited availability, and complete-case preservation. API tests accept 150, reject 151 before database writes, and save all 150 responses. tests/sql/exam-limit-150-check.sql verifies standalone 150, 25 complete cases, mixed 150, saved scores/responses, ownership, 151 rejection, and unchanged historical scores in the disposable database. Larger exams require the new upgrade before production use.
