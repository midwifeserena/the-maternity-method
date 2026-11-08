# Incomplete exams: save and resume

Students can pause or use Save & close / Save and exit. A successful save returns to Previous Exams, where an Incomplete · No score card offers Resume Exam. Existing completed cards remain available for read-only review. Resuming loads the same owned attempt and original question snapshots, preserving answers, current question, timer, review flags, strikeouts, highlights, and question timing. Study answers already checked remain locked and their permitted feedback is reconstructed server-side. Timed feedback and NGN case keys remain hidden until submission. The resumed exam opens paused; time away is excluded.

Progress autosaves after edits/navigation (800 ms debounce) and every 15 seconds while the exam is open. Hidden-page events also attempt a checkpoint with keepalive for small payloads. Unsaved navigation uses the browser's unload warning. Students should wait for Progress saved or use Save & close before leaving. Network failure, force termination, browser crashes and offline closure cannot guarantee saving the final change. Save and exit keeps the viewer open on failure; conflicting tabs receive a reopen message instead of silently overwriting progress.

## Proposed database change

Review `supabase/migrations/202611140001_exam_drafts.sql` before applying it. It creates owner-readable `exam_drafts` with JSON progress and revision numbers, adds `exam_attempts.analytics_exempt`, and adds a service-only save RPC. The RPC locks the owned attempt, rejects completed attempts and stale revisions, and writes no scored responses or earned/possible values. Owner RLS has a restrictive guard against broad pre-existing policies. Authenticated clients cannot write drafts or execute the privileged RPC directly. Server endpoints authenticate and validate ownership, public frozen snapshots, bounded progress and revision numbers. No question content is modified.

Saved incomplete attempts are excluded from score, usage, readiness and test-completion percentage calculations. Completed attempts are included normally, even if their earlier draft was exempt. Completed drafts are excluded from the incomplete list; their ungraded checkpoint record can remain as an audit copy. Existing incomplete sessions without a saved checkpoint cannot have missing answers reconstructed. Snapshots are required for saving; unsupported legacy sessions show an actionable error.

## Setup and release

1. Review the SQL in staging with the existing exam-review/combined-exam tables installed.
2. Run the migration once in Supabase SQL Editor. It is rerunnable. The publication folder includes an identical SQL-only TXT copy for easier copying.
3. Merge the application changes and wait for Vercel to finish deploying.
4. Create a Study and a Timed test, answer questions, save and close, reopen from Previous Exams, then submit. Confirm grades/usage do not change before submission.

No production SQL, merge or deployment was performed during development.

## Validation

Node tests cover bounded drafts, foreign identifiers, ownership, forbidden feedback, conflict responses and analytics isolation. Disposable PostgreSQL checks cover migration reruns, owner RLS (including a broad existing SELECT policy), service-only saves, revision conflicts, ungraded saves and completed score protection. Chromium uses mocked data APIs with real player/components to exercise automatic checkpoints, save failure/retry, mixed-case Study save/close/resume, preserved checked feedback and flags, timed resume with paused countdown, final submission, existing NGN scoring/reveal/review and mobile layouts. TypeScript, scoped ESLint and production build are checked. Audible/native browser shutdown behavior and production credentials are outside these mocks.
