# Flashcards: study, learn and test

The student flashcard page follows the owner's three-page layout reference using the existing Maternity Method colors, serif headings, sidebar and verified Student/Admin toggle. The attachment is a visual reference; no example clinical questions or definitions from it are imported into the library.

## Views

- **Flashcards:** large term/definition flip card, optional speaker, read-both-sides control, previous/next, shuffle, starred cards, subject/search/high-yield filters and Know it/Still learning ratings after revealing the definition.
- **Learn:** split term and hidden definition, topic mastery bars on larger screens, reveal then self-rate. Still learning cards move to the end of the queue; Know it cards leave the current round. Once the queue is empty, show a completed round. A repeat round may continue until the student marks every selected card known. Filters and Start again reset the round without deleting saved ratings.
- **Test:** choose a question count and multiple-choice or written recall. A test snapshots its selection/options in memory so switching study modes or adjusting filters cannot silently replace its questions or lose its answers. Numbered navigation, Previous/Next and submitted result review are included. Draft tests are retained while the page stays open, not across reloads or devices.

Multiple-choice choices come only from existing published flashcard definitions. Text-equivalent definitions are deduplicated; same-term distractors are excluded. The correct definition appears once, with up to three saved alternatives. No generated clinical distractors are invented. Small or ambiguous selections offer written recall instead. Multiple-choice scoring counts correct, incorrect and omitted items. Feedback appears only after submission. Submitted outcomes update Know it/Still learning ratings and can launch a learning round for missed cards.

Written recall is explicitly **self-graded**, not an exact-text matcher: students compare their typed recall to the saved definition after submitting, then mark each response. No percentage appears until every item is self-assessed. Omitted written answers cannot be marked Know it in the interface. These activities do not write exam attempts, exam scores or NCLEX readiness data.

## Read aloud

`useFlashcardSpeech` uses the browser's native speech synthesis; no new external service, dependency, credentials or audio storage is required. Students can read the term, the revealed definition, or both in order, choose a slower/normal/faster reading speed, and stop playback. Explicit Read both sides is available in ordinary flashcard mode; Learn requires reveal first. During an unfinished test, the speaker reads the term only. Submitted results can read term and definition.

Playback is chunked to avoid very long utterances, retains utterance references, invalidates late callbacks before cancellation, and stops when cards, filters, reveal state, study mode or the route changes. Unsupported browsers retain normal studying and show an unavailable message; synthesis failures show a recoverable audio message. Real pronunciation, available voices and audio output depend on the student's device/browser. Automated audio tests use a simulated speech engine; actual audible output is not verified by those tests.

## Progress and access

Know it/Still learning ratings and starred IDs are stored locally under `tmm:flashcards:v1:<authenticated-user-id>`. Accounts do not share the page's progress state. Authentication changes clear the current in-memory round/test before loading the new account's progress. Damaged saved values recover safely; blocked storage leaves a usable in-memory session with a clear message. Progress is **browser-local**, not synchronized to another device. No flashcard definitions or test responses are stored by this progress cache.

The library query is unchanged in scope: authenticated Supabase client, `flashcard_library`, `published=true`, `review_status=approved`, stable card-number/ID ordering and 500-row pagination, preserving existing RLS. Admin Studio, publication workflow, question bank, scoring and exams are unchanged. Existing card content is never rewritten. No SQL migration, bucket change or production data write is needed.

## Files

- `app/(platform)/flashcards/page.tsx`: library loading, branded study modes, filters, learning queue, local ratings/stars and topic progress.
- `components/flashcard-test.tsx`: snapshot test setup/navigation/submission/results, self-graded written recall, missed-card review and optional result speech.
- `components/flashcard-study.css`: responsive reference-inspired layout and accessible focus states.
- `components/use-flashcard-speech.ts`: optional native speech lifecycle and controls.
- `lib/flashcard-study.mjs` and declarations: deterministic-testable shuffle, definition deduplication, question construction, scoring, safe progress parsing and speech chunking.
- `tests/flashcard-study.test.mjs`: construction/scoring/omission rules, duplicate/ambiguous and small decks, self-assessment, input recovery, shuffle and speech chunks.

## Validation and rollout

All repository Node test files, TypeScript, scoped ESLint and production build pass. Browser checks exercise published/approved-only reads, card flipping, stars/filters, rating persistence and account isolation, Learn repeat/completion, frozen test mode across mode switches, correct/incorrect/omitted multiple-choice scoring, written self-assessment and missed-card review, audio read/stop/cancel/error/unsupported paths, blocked storage, empty/error/retry/unauthenticated states and loading over 500 cards. Layouts were checked at 320, 390, 768 and 1500 pixels. Browser data and speech engines are mocked. Builds use temporary offline font fixtures because Google Fonts access is blocked; previews use fallback serif/sans fonts and sample cards.

The implementation is prepared on `codex/flashcard-study-layout`. No production deployment or production SQL was executed. Review the branch preview on a real phone/browser for actual device voice output before release.
