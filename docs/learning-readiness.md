# Learning statistics and maternity readiness progress

The dashboard now displays Question Score, Qbank Usage, and Test Completion, followed by a readiness summary and existing learning shortcuts. The Performance page provides Overview, Subjects & Formats, and Test History views. Styling uses the existing Maternity Method palette and root fonts; no charting or other runtime dependencies were added. The uploaded statistics PDF was a visual/metric reference, not an import of its personal results or a specification of UWorld's proprietary scoring.

## Metric definitions

- **Question Score:** fully correct saved responses divided by all valid saved responses in completed exams, including omissions and repeats. Partial-credit items have their own outcome bucket.
- **Points Scored:** the sum of saved completed-exam earned points divided by saved possible points. This preserves existing NGN partial credit and historical overall grades, including older exams lacking response details. It is not the unweighted mean of exam percentages.
- **Qbank Usage:** distinct items with a nonempty saved answer in completed exams, intersected with the current published standalone bank and eligible complete published case-study items. Repeats and omissions do not inflate usage. Archived case snapshot IDs map back to stable source item IDs. Removed/unpublished items remain in historical performance but not in the current usage denominator.
- **Test Completion:** completed saved attempts divided by all saved attempts. Exited/unsubmitted attempts are labeled incomplete/unfinished. No resumable/suspended status is invented.
- **Question outcomes:** fully correct, partial credit, incorrect with zero credit, and omitted are mutually exclusive counts. Invalid/missing response scores are excluded and missing recorded question counts are reported. Null/empty-data percentages display a dash, not a fabricated zero or preparedness level.
- **Subject/format results:** archived metadata is preferred; older standalone results can use current bank metadata. Unavailable metadata stays Unclassified. Points, first-exposure scores, and unique usage are shown separately.
- **Time:** saved total duration and session duration per recorded item remain available for legacy exams, clearly distinct from newly measured question time. Future timing excludes pauses, hidden tabs, and revealed-rationale viewing. It is self-reported study telemetry, not proctored evidence.
- **Answer changes:** first valid selection compared with the submitted selection on ordinary single-answer items. The server evaluates correctness against the saved key; incremental SATA/grid selection is not miscounted as answer-changing. Correct→incorrect, incorrect→correct, and incorrect→incorrect counts are tracked for newly instrumented exams only.

All history is paginated through Supabase instead of restricting analytics to the latest 50 exams. Repeat case attempts use original source identity for unique usage and first-exposure statistics. Only completed, owned sessions contribute results. The stats response contains aggregates and owned review links; it never contains answer keys, solutions, raw answers, or another student's details.

## Readiness interpretation

This is a **maternity practice indicator**, not a validated overall NCLEX readiness exam or pass-probability model. The UI makes that distinction explicit. No UWorld percentile, peer average, NCLEX passing standard, or proprietary readiness thresholds are claimed.

Students can choose a personal practice target from 60–90% (default 70%, saved locally). The transparent study benchmarks are:

1. At least 100 unique answered maternity questions with identifiable source items.
2. At least three fully recorded, maternity-only completed timed exams with 20 or more items.
3. At least ten unique answered items in each of Antepartum, Intrapartum, Postpartum, and Newborn.
4. First answered maternity-exposure weighted points meet the selected target.
5. Weighted points across up to the latest five qualifying maternity-only timed exams meet the target.

Thresholds use unrounded points; a displayed rounded 70% from 69.6% does not falsely meet a 70% goal. Outcomes are Building your baseline, Focus your next review, or Meeting your practice target. This method is openly defined study guidance, not clinically validated outcome prediction. Peer percentile/timing remain unavailable until a reliable cohort and methodology exist.

## Optional proposed database change

Review `supabase/migrations/202611120001_learning_analytics.sql`. It has **not** been applied to production.

- Adds nullable `exam_attempts.study_analytics` JSONB; old rows remain null.
- Adds service-only `complete_exam_with_analytics`, which locks and verifies the owned attempt, calls the existing completion/scoring persistence RPC, then stores bounded ancillary telemetry in the same transaction.
- Existing completed-attempt retries return the original grade without overwriting telemetry. Existing RLS and no-student-write permissions remain.
- The existing completion RPC, questions, solutions, response tables, reveal rules, scores, and historical progress are not rewritten.
- If the optional function is missing, the application falls back to existing completion. Dashboard, points, usage, history, and readiness statistics already work without this migration; future per-question timing/answer-change persistence requires it.
- No new storage bucket or credentials are needed. Existing exam-review setup is a prerequisite.

Test this small migration against staging first, verify the branch preview with a student account, then coordinate SQL and release. No production deployment or production SQL was executed.

## Changed code and verification

- `components/learning-stats.tsx` and `.css`: branded metric cards, accessible SVG trend, readiness controls, subject/format tables, mode-filtered test history with numbered pages and owned review links, empty/error/retry/mobile states.
- `components/section-view.tsx` and the section server page: dashboard/performance integration; remove the unused 50-exam server read for those two sections.
- `lib/learning-analytics.mjs`, declarations, and `learning-analytics-server.ts`: documented calculation rules, paginated owner-scoped authenticated reads, stable case identity, legacy-data handling.
- `app/api/learning-stats/route.ts`: authenticated, private/no-store aggregated statistics; errors never masquerade as empty totals.
- `components/exam.tsx`, `lib/exam-analytics.mjs`, declarations, and exam submit route: optional timing/first-choice instrumentation and bounded server-derived ancillary statistics. Existing scoring and reveal are preserved.
- `tests/learning-analytics*.test.mjs`, existing API harness additions, and `tests/sql/learning-analytics-check.sql`: metric mathematics, pagination beyond row limits, authentication/ownership, missing-data treatment, NGN identity, partial points, readiness volume/thresholds, bounded telemetry, optional-setup fallback, transactional integrity and idempotency.

Validation: all repository Node test files, TypeScript, scoped ESLint, and Next.js production build; browser checks of dashboard, performance tabs/targets, history modes/pages/review links, empty/error/retry, 320/390/768/1440 widths, and the real existing Study/Timed player. Builds use temporary offline font fixtures because Google Fonts access is blocked. Browser APIs and sample accounts are synthetic. Local network-disabled PostgreSQL tests apply the existing migration chain and proposal, then verify owner-only access, safe retries, full rollback, and unchanged historical grades; existing standalone, 150-question and mixed/case SQL regressions also pass. No real student account or production Supabase was accessed.
