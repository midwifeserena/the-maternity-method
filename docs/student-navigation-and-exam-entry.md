# Student navigation and exam content choices

## Sidebar

The student sidebar retains the existing logo/name and server-verified Student/Admin portal switch. The top-level links are Dashboard, Question Bank, Video Lessons, Study Guides, Flashcards, and Account & Subscription.

Clicking Question Bank opens its page and expands a submenu containing Create Exam, NGN Case Studies, Previous Exams, and Performance. Its chevron can expand/collapse without navigation. The submenu opens automatically on a direct question-bank, exam-builder, case-study, performance, or previous-exam/review URL. Selecting a child closes the mobile drawer. The existing /previous-tests routes and data remain; their user-facing label is now Previous Exams.

Administrator navigation retains the same three studios. The switch and admin menu still require the existing isAdmin prop verified by the server layout; no authorization logic was changed.

## Create Exam

QuestionBuilder offers two content choices:

- Standalone Questions: the existing standard and standalone NGN bank, filters, Study/Timed modes, scoring, submissions, saved history, and review.
- NGN Case Studies: the same published case library and NgnBuilder used by /ngn-case-studies. A case keeps its ordered items together and opens the same case player from either entry point. The section labels its current behavior as untimed practice, with whole-case submission and review.

This implementation uses one format per session. It does not mix the two content sources in one scored/saved exam. Existing NGN case practice does not write Previous Exams history; the change does not claim otherwise or alter that behavior. A combined exam/history feature would require a separately reviewed extension to the existing question/session schema and scoring architecture.

NGN Case Studies is retained as a direct shortcut inside Question Bank while also being available through Create Exam. Removing that shortcut later would not require changing the case library or its player.

## Shared player presentation

components/exam-window.tsx provides the native full-screen dialog frame, NCLEX header with brand/time/progress, and footer used by both Exam and NgnExamWindow. The existing controllers retain their answer handling, timing, reveal rules, scoring, annotations, and navigation. Light/dark styling remains shared through exam.css and the existing preference key. NGN-specific chart/interaction controls are preserved.

No API, database migration, student data, or production configuration changes are required. The change does not deploy automatically.

## Verification

The test suite, TypeScript, scoped ESLint, and production build pass. New server-rendered component tests check that students never receive admin controls, the admin studios/switch remain intact, and deep-linked reviews expand/highlight the correct menu.

Chromium fixtures using actual components and production CSS check desktop/mobile submenu behavior, keyboard interaction, admin/student mode, all published case cards, launching the same case player from Create Exam and the NGN route, timed standalone answer submission, and deep-link active state. The existing player browser regression checks cover legacy NGN formats, extended MCQ, highlighting under content protection, double-click answer preservation, navigation persistence, dark viewing, mobile sizes, submission, and read-only reveal. APIs/auth data are mocked; no student records are created by those tests.

Local builds use temporary offline font responses because Google Fonts downloads are blocked in this environment. Those fixtures are not included in the branch. Review the authenticated Vercel preview before merging.
