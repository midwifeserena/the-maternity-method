# Flashcard Studio and student flashcards

This update adds `/admin/flashcards` for administrators and replaces the student
placeholder at `/flashcards` with a working study page. The existing personal
`flashcards` and `flashcard_decks` tables are preserved; shared course content
uses `public.flashcard_library`.

## Enable the feature

1. Deploy the code update to the production branch connected to Vercel.
2. In Supabase SQL Editor, run only the SQL in
   [flashcard_library_setup.sql](supabase/flashcard_library_setup.sql).
   This creates the shared library and its access rules without adding cards or
   publishing content. It is safe to rerun if the corrected import already
   created the library. Do not rerun the app's entire schema.sql.
3. Sign in using the same administrator email listed in `NGN_ADMIN_EMAILS`.
   Choose **Flashcard Studio** from the sidebar, or visit `/admin/flashcards`.
   The existing Supabase server service-role binding is required, as for NGN.
4. To import the 412 supplied cards, upload the original flashcard SQL `.txt` or
   `.sql` file in **Import flashcards**, or paste its full text into **Import
   content**. Click **Import as drafts**. The app extracts card rows only; it
   does not execute the supplied SQL or its CREATE/DROP commands.
5. Review questions and answers. **Save draft** saves changes and unpublishes
   the edited card. Choose **Approve & publish card** for an individual card.
   After reviewing an entire batch, clear the search and select **All cards**,
   then choose **Approve & publish N filtered cards** to publish that set.
6. Open `/flashcards` as a student to study the published content.

If the 412-card library SQL was already imported, the cards appear in the admin
list immediately. Reimporting matching IDs skips existing cards and preserves
editorial changes. A file without IDs generates new ones; include stable IDs
for repeat imports. There is no delete action; use Unpublish to hide content.

## Import formats

- CSV headers: `card_number,topic,front,back`; optional `id,high_yield`.
  Quoted commas, doubled quotes and embedded newlines are supported.
- JSON: an array of objects with those fields.
- SQL: recognized `INSERT INTO flashcards` or `INSERT INTO
  public.flashcard_library` rows with the columns
  `(id, card_number, topic, front, back, high_yield)` and ordinary quoted or
  dollar-quoted literal values. This includes the supplied 412-card source file.
  Other database commands are ignored, not run.
- Up to 1,000 cards per import, with a request size under 1 MB. All imported cards
  start as `needs_review` and unpublished, regardless of file publication flags.

## Student experience

The student page loads approved, published library cards with stable pagination.
Learners can filter by topic, search questions, select high-yield cards, flip
between front/back, move through the deck, shuffle, and restart. Empty libraries,
no-match searches, expired sign-in and load errors have explicit states.
This version does not persist spaced-repetition schedules or mastery scores.

## Access and validation

Admin pages and GET/POST/PATCH routes require the existing server-verified
administrator allowlist. The service role is used only server-side. Student
access uses the normal authenticated Supabase client and RLS; draft cards are
not readable and student writes are not permitted. Importing card text is not
clinical or licensing approval; review before publication.

Tests cover unauthorized requests, SQL/CSV/JSON extraction and validation,
preservation of matching IDs, publication invalidation on edits, scoped admin
publication and unpublication, and missing-library errors. Chromium workflow
checks exercise the actual admin UI and route code with isolated database/auth
fixtures, including a full 412-card SQL import. The actual student component was
checked for paginated loading, filters, flip/navigation/shuffle, empty/error/retry
states and mobile layout. PostgreSQL tests cover the real schema, student RLS,
repeat imports and scoped 412-card publication. TypeScript and the repository
suite pass. Live authenticated Supabase operations remain unverified; no live
database was changed. Local production builds have an existing Google Fonts
network restriction, so verify the Vercel deployment after merging.
