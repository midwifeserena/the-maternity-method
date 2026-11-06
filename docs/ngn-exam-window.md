# NGN case-study exam window

Starting a published case now opens a full-screen modal using the Qbank exam colors and controls. The patient chart and its tabs appear on the left; the current question appears on the right. Desktop panes scroll independently. Small screens stack the chart above the question in a scrolling content area. Previous, Next, and Navigator preserve the in-session answers. The existing NGN endpoint still submits the case as a whole, and solutions appear only after successful submission. Case studies remain untimed, with an elapsed-time display.

Settings provides light and dark viewing using the existing Qbank preference. Mark for review is a local study flag. End offers submission or explicitly discarding an unfinished session; Escape opens that panel rather than silently closing the window. An unfinished case is not a resumable saved exam.

## Study annotations

In NGN and Qbank exam windows, select text in a question stem or chart, then right-click or press Highlight selected text / Highlight selection. Qbank clinical scenario text is also supported. Clear highlights removes that item's text annotations. NGN rationale text can be highlighted after submission. Highlights remain when navigating within the current window, including chart tabs, and are discarded when the window closes. They are not saved to Supabase.

Text highlighting uses the browser's CSS Custom Highlight API, without rewriting question HTML. Use a current Chrome, Edge, Firefox, or Safari release that supports that API. Unsupported browsers receive a notice rather than changing question content. The existing whole-stem Highlight control in Qbank is retained.

Double-click a multiple-choice answer to cross it out or restore it. The handler restores the response from before the first click of the gesture, so crossing out does not answer the question or replace a prior answer. NGN also has explicit Cross out / Restore buttons for touch and keyboard use; Qbank retains its Strike options controls. A single click still selects an answer, including a previously crossed-out choice. Strikeout is an annotation, not an answer restriction. Answer changes and strikeout are disabled after reveal. NGN Highlight question interactions remain actual answer selections, separate from study highlighting.

## Scope and data

No database migration, scoring change, authentication change, or production database operation is required. Existing server-side scoring, solution access checks, submitted responses, and content-protection copy restrictions remain in place. Study annotations are not included in submission payloads. The multiple-choice renderer is shared with existing extended-format questions.

## Verification

Run `npm test`, `npx tsc --noEmit`, a scoped ESLint check, and the production build. Browser checks should include legacy MCQ/SATA/matrix/cloze/highlight/bowtie and extended-format controls, in-session navigation, text annotations across chart tabs, both viewing themes, mobile sizing, double-click answer preservation in NGN and Qbank, submission, and read-only reveal. Browser tests in the managed workspace use mocked exam APIs and do not create student records or change real scores. Font downloads are blocked in the environment, so the local production build uses temporary offline font fixtures outside the repository.

No automatic production deployment is part of this change. Review the Vercel preview and test one published case with a student account before merging.
