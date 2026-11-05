# Calculation, ordered-response and paired-rationale questions

The existing Qbank now supports Calculation (numeric answer), Ordered response, and NGN paired rationale cloze without changing the underlying question-type enum. The canonical public interaction fields remain `ngn_format` and `ngn_config`; correct responses, rationales and nursing tips remain private solution data.

## Behavior and authoring

- **Calculation:** Question tab sets unit and decimal places (0–6); Answers sets the numeric key. Learners enter a number only. Exact fixed-point comparison accepts equivalent trailing zeros, but rejects extra nonzero decimals, units, scientific notation and invalid numbers. No loose floating-point tolerance or silent rounding of a wrong submission.
- **Ordered response:** Answers edits/adds/removes actions and establishes the private correct sequence. Learners use up/down buttons or drag actions and confirm. The initial display is not automatically a response. The whole sequence must match for the point; duplicates, missing steps, extra steps and partial sequences earn zero. Import presentation order is shuffled deterministically without changing the correct sequence.
- **Paired rationale cloze:** Two linked blanks are configured like cloze questions, with exactly one correct choice per blank. Both must be correct to earn one point. Ordinary cloze remains one point per blank.
- **Bowtie:** Existing questions default to their established per-box scoring. An optional explicit plus/minus setting preserves the uploaded standalone bowties' declared rule, floored at zero separately within each group. Limits on selections still apply.

Updated student clients request an explicit extended-format capability; older open clients are not offered the newly introduced Qbank formats or canonical case payloads they cannot render. Refreshing after deployment enables them. Student Study/Timed testing, permitted answer reveal, navigation/completion, private start snapshots and owned read-only exam review reuse the existing architecture. Calculation/ordered items remain in Standard Questions unless their section is explicitly NGN. Numeric and ordered answer rendering uses labels as well as correctness colors. Existing single/SATA/matrix behavior is retained.

## Six-question cases

Legacy case items continue using their existing controls/scorer. Newly converted items contain an allowlisted canonical public question under `content.question`, plus safe source/clinical-judgment metadata. Their private keys stay in `ngn_answers.answer.answer_key`. The authenticated NGN endpoint sanitizes canonical question payloads and reveals keys/tips only after the existing case-submission checks. It scores canonical items using the same canonical scorer as the Qbank. Each imported item has its own cumulative chart version; returning to an earlier item restores its earlier notes instead of displaying later clinical updates. The endpoint still delivers the case's published items together; this is UI progression, not a server lock on later question navigation.

## Database setup and rollout

Proposed migration: `supabase/migrations/202611090001_extended_question_formats.sql`, after the existing standalone NGN migration. It expands the optional format check, updates library filters, adds an administrator-only import receipt table and version marker, and retains private solution-table access with restrictive guards. It imports/publishes nothing and does not rewrite existing scores/history.

1. Review/merge and deploy this feature code. Verify its Vercel deployment is Ready and points to the intended Supabase project. Do not run the content import while older application code is serving exams.
2. Review and validate the schema migration in staging first. For an existing app missing prior setup, the privately generated bundle also contains `SETUP_EXTENDED_FORMATS.sql`, combining the prerequisite additive migrations into one transaction. Existing NGN tables are required; this is not an empty-project initializer. No test fixture belongs in production.
3. Run `IMPORT_AND_PUBLISH_ALL.sql` from the private content bundle in the intended Supabase SQL Editor. Copy actual SQL only. The user explicitly authorized publishing the whole revised batch during import; it creates 524 published Qbank questions and 25 approved/published six-item cases (150 items) in one transaction. No further per-item publish action is required.
4. Verify the returned receipt counts and test one calculation, ordered response, paired case item and bowtie in Study/Timed/review. Existing completed exams must retain their scores and snapshots.

No automatic deployment or live production database access was performed in this workspace. All-at-once publication is implemented in the supplied import; it has not been executed on the live project. Native voice/flashcard and unrelated features are unchanged.

## Import generation and repeat behavior

`node scripts/build-publication-import.mjs SOURCE_DIRECTORY OUTPUT_DIRECTORY` reads the revised CSV and original NGN JSON, validates the full source and all perfect-answer scores, and generates a canonical JSON manifest and SQL. The source directory must contain `maternity_method_question_bank_REVISED.csv` and `ngn_items.json`. Clinical source data/answer keys are kept out of this code branch; use the privately delivered source bundle.

The requested deletions MM-INT-060 and MM-PP-006 are excluded. The earlier MM-NB-116 wording edit remains in the revised CSV. All other source clinical wording is preserved. Source IDs map to deterministic UUIDs, clinical subjects remain intact, and client needs/tags, difficulty, subtopic, memory tips and clinical-judgment metadata are retained. Twenty-eight exhibit updates are included at the corresponding item stages. Two source cases have nonstandard clinical-judgment step labels/order; those labels/questions are retained rather than silently rewritten.

The import locks relevant content tables, checks destination IDs, exact normalized Qbank stems and case source keys, then inserts both public content and private solutions and commits one receipt. No `ON CONFLICT DO UPDATE` overwrites existing questions. A collision stops the entire batch for review. Repeating the exact same batch is a no-op even if administrators later edit/unpublish its records. Changed source content yields a new batch hash but retains source IDs, so it intentionally conflicts rather than silently replacing older imports. Live semantic duplicates beyond the exact checks cannot be ruled out from source files alone.

## Validation

Unit/API regressions cover exact numeric comparison, ordered completeness/all-or-nothing scoring, linked-pair scoring, bowtie scoring compatibility, private public payloads and canonical case grading, plus the existing question/reveal/history/security tests. TypeScript and scoped lint pass. A production webpack build uses offline font fixtures; real remote font fetching is outside that local check.

Actual-component Chromium checks cover the three new formats in Study, Timed submission and archived read-only review at desktop/phone sizes, and complete six-question case submission/reveal with stage-appropriate chart views. Disposable PostgreSQL checks apply the schema and entire 674-item publication, verify private answers and published counts, repeat the import without changes, and intentionally fail the final answer insert to prove rollback leaves only the original records/scores. Production integration and clinical accuracy beyond the earlier source spot-checks are not certified by fixture tests.
