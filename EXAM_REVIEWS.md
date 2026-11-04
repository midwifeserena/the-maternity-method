# Previous Tests and exam review

Completed practice tests now have clickable history cards and a read-only NCLEX-style review. History shows the saved name/date, study or timed mode, question total, original points/percentage and correct/incorrect counts. Partial-credit and unanswered items are included in the incorrect count and explained separately. History loads 20 sessions at a time; it does not truncate the saved response set at Supabase's default row limit.

Review reuses the existing exam stylesheet, full-screen dialog and light/dark preference. It shows archived questions, choices, clinical chart, student selections, correct choices, rationale and associated image URLs. Inputs are disabled. Each question retains its original position and saved earned/possible points. Single choice, SATA and question-bank NGN matrices retain the existing scoring rules. All/Incorrect/Correct filters remember their own positions; the navigator can jump to any saved question and switches to All if necessary. Review performs no score/response writes.

## Proposed database change — not applied to production

Review [supabase/migrations/20261104_exam_reviews.sql](supabase/migrations/20261104_exam_reviews.sql) before applying it. This is an additive migration over the repository's existing schema, not a replacement schema or a question import.

| Change | Purpose |
| --- | --- |
| Three nullable columns on `exam_attempts`: `exam_name`, `question_count`, `snapshot_stage` | Name/total and whether content was captured at start or submission. No historical backfill. |
| New `exam_review_items` table | Ordered, versioned JSON snapshots of the original question and solution. Reuses existing `exam_responses` for selected answers/points, and existing `exam_attempts` for overall score. |
| Ownership RLS and grants | Authenticated students read only their own records. Solution snapshots are readable only after their owning attempt is completed. Direct student writes to attempts/responses/snapshots are denied. Restrictive policies guard against broader permissive SELECT policies. |
| `start_exam_review_attempt` authenticated RPC | Creates an owned pending attempt and snapshots the published questions/solutions in a transaction. Returns questions without answer keys/rationales. |
| `complete_exam_review_attempt` service-role-only RPC | Commits server-scored responses and the existing overall score atomically, locking the attempt. Repeated completion returns the original score. |
| Completed-snapshot trigger | Rejects updates/deletes of a completed attempt's snapshots. |

The migration changes no existing scores, response records, question-bank content, rationales, subscriptions or progress records. Pending attempts remain excluded from existing completed-session/progress queries. Policies apply to authenticated students; the existing server-side service role retains privileged access. The server explicitly checks authenticated ownership before any privileged snapshot read or completion.

## Fix for the empty legacy-review screen

The initial review release showed only archived content. That left older completed tests with answer identifiers but no visible questions or rationales. Deploy the `codex/legacy-exam-review` fix to enable the labelled current-bank fallback described below. No new database migration is needed for this fix.

For exact historical versions of future tests, the original `20261104_exam_reviews.sql` migration must still be installed. If it has not been applied, review that SQL file and run **only its SQL contents** in Supabase SQL Editor. This migration does not recreate earlier question versions. Start and submit a fresh Study test and a fresh Timed test afterward: their review should show archived content without the current-version notice. The screenshot alone cannot establish whether the migration is installed or whether a test predates it.

## Deployment

1. Review and merge the feature branch after preview checks. Review the migration above separately; **no production SQL was run during implementation**.
2. On a Supabase staging database matching production, run only `supabase/migrations/20261104_exam_reviews.sql` in SQL Editor. Do not paste this Markdown document, JSON file metadata, schema.sql, or the test SQL files into production.
3. Verify the flow below in staging. After approving the SQL, run that same migration in the production Supabase SQL Editor and deploy the application through the normal Vercel/GitHub workflow. Applying the migration before the new client is preferred. It is safe to rerun.
4. Keep the existing server-side `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel. It must never use a `NEXT_PUBLIC_` prefix. No new secrets are required.

If application code deploys before the migration, only a genuinely missing RPC activates compatibility mode: existing tests still save through the previous path, but detailed start snapshots are unavailable. A visible notice explains this. Other database errors do not silently bypass archival. These pre-migration submissions retain the previous two-step-save limitations; the atomic guarantee begins after the migration is installed. Older already-open clients can submit through the new server; their snapshots are explicitly labelled **submission-time** rather than claimed to be the original start version.

## Historical limits

Old sessions did not store question text, options, keys, rationale, original order or total. Where response records still link to existing questions, review now loads those questions and solutions from the current bank, including unpublished items, only after checking authenticated ownership and completion. This restores questions, choices, selected answers and explanations for both Study and Timed exams. It requires no additional SQL beyond the already proposed archival migration.

These items are explicitly labelled **Current question-bank version** with **Current correct answer** and **Current rationale**. Current content may have changed since the exam; it is not represented as an original archive. Saved response records, scores, correct/incorrect classifications and filters remain based on the original recorded result, even if a current key differs. The review endpoint does not write or backfill history. Archived exams always use their snapshots, without reading the current bank.

When saved answer identifiers no longer exist among the current choices/rows, review displays the original saved identifiers and explains that the original selection cannot be highlighted accurately. Missing current questions/solutions are labelled unavailable; no answers or rationale are invented. Sessions with only an overall score still show a missing-history message. Unknown counts remain unknown. An explicit saved empty response means unanswered; an absent response record means unavailable.

Question/solution JSON and image **URLs** are archived, not external image bytes. Use immutable/versioned storage object URLs and avoid deleting or overwriting assets referenced by completed tests. The repository's base question schema has no top-level image column; the renderer also accepts existing optional `images`, `image_url`, `image_urls`, `question_images`, `question_image_url`, `rationale_images`, `rationale_image_url`, `diagram_file` and per-option image fields when present. This migration does not invent media columns or assets.

The separate NGN case-study player currently does not persist exam attempts/responses. Its functionality is unchanged; unrecorded case-study sessions cannot appear as completed-test history. NGN matrix questions inside saved question-bank exams are supported here. Adding persistence for the separate case-study player is a distinct feature.

## Validation

- `npm test`: existing scoring and exam-tool suites plus new snapshot/legacy-data and authenticated API tests. API tests execute the actual route/helper code against isolated database mocks, including ownership, pending-review denial, frozen-key scoring, idempotent completion, no writes during review, paginated history response loading, legacy current-bank review for both modes, unpublished linked questions, missing solutions and query failure handling.
- `npx tsc --noEmit --incremental false`: type checking.
- PostgreSQL 17 disposable-container checks: migration syntax and rerun, unchanged legacy rows/scores, ordered public start payload with no solutions, pending-key hiding, authenticated write restrictions, service-only completion, exact stored partial points, original content after source edits, repeated completion, ownership despite broad permissive policies, snapshot immutability and failed-completion atomicity. SQL fixtures are in `tests/sql/exam-review-{bootstrap,seed,check}.sql`; **test database only**. Apply bootstrap, repository schema, seed, proposed migration, then check, using psql with `ON_ERROR_STOP=1`. Bootstrap creates synthetic auth roles/users and must never run against Supabase production.
- Chromium with actual Exam/ExamHistory/ExamReview components and isolated API fixtures: complete a timed practice exam, change the live question version, open its history/review, verify archived selections/content, correct/incorrect/unanswered statuses, SATA/matrix partial credit, images, remembered filters, navigator, readonly inputs, light/dark/mobile and missing legacy history. Compare the saved attempt and every response before/after review: unchanged, with exactly one submission write.
- Existing Chromium exam regression: generated study/timed tests, theme/font settings, calculator, highlight/strike, flags/navigation, single/SATA/matrix answers, study feedback, pause/resume, keyboard modal handling, mobile, duplicate-submit guard and timeout retry preserving responses.

These checks used synthetic completed exams. Live Supabase schema/credentials and real student accounts were not available in this environment; staging verification is still required. The normal production build was attempted; Google Fonts download restrictions in this cloud environment prevent that build from completing. No source font changes were made to bypass it.

### Staging verification

Use two student accounts. Complete a new mixed single/SATA/matrix study test and a timed test. Note scores, then open Previous Tests and review each. Check original answers, rationale/images, partial points, all three filters and navigator. Edit a source question/solution as an administrator, then reopen the completed test: its archived version and score must remain unchanged. A second student opening the first student's review URL must get “Exam not found”; a direct Supabase snapshot SELECT must return no rows. Pending solutions must remain hidden. Confirm previous overall scores and Performance totals are unchanged by review, and check that an old session with response records shows linked current questions/options/rationale with a current-version notice. A session with no saved responses must still show a missing-data notice.
