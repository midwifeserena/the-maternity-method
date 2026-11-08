# Video-only lesson workspace

`/video-lessons` now opens the published course library in a full-window branded workspace, replacing the generic card list on that route. Its burgundy playlist, cream background, serif headings and rose controls follow the supplied Maternity Method reference. It contains no checkpoint quizzes, quiz filters, AI chat, generated transcripts or fabricated video controls.

The sidebar has title/duration, search, subject filtering, the active lesson, real completion checkmarks and course completion count. Desktop collapse and a mobile drawer keep the player usable at narrow widths. The workspace has a visible exit/back control and keyboard Escape support. Below the player are Overview, Transcript and My Notes, plus a linked course PDF where available. Previous/Next browse lessons; Complete & Continue marks a lesson complete and advances. Completion can be undone. Merely watching or skipping a lesson does not imply completion. Video completion is independent of all exam scores, usage and readiness calculations.

Existing YouTube and Vimeo URL forms, including unlisted Vimeo hashes, keep their embedded players. HTTPS direct video files use native video controls. Playback speed, captions and fullscreen are supplied by those players, when supported by the host. The UI does not display unsupported custom controls. Unsupported HTTPS hosts retain an Open original video link; invalid or unsafe URLs show an unavailable message.

Direct video files save playback position about every 15 playback seconds and on pause/end, and restore the saved position when reopened. The last recently saved unfinished lesson opens by default. The direct host must support normal browser playback/byte ranges and the codec must work on the target device. YouTube/Vimeo embeds do not report position to this implementation; they retain their native controls. No iframe watch percentage or resume position is invented.

## Proposed Supabase setup

Review `supabase/migrations/202611150001_video_lesson_workspace.sql` and test it in staging first. It adds four optional metadata columns to `lessons` and a separate `lesson_progress` table. Existing lessons, URLs, published state, exam tables and scores are not overwritten. It is rerunnable. No new storage bucket, service key or dependency is required. No SQL or deployment was applied to production during development.

`lesson_progress` has one private row per authenticated user/lesson: notes, manual completion, actual direct-file position/duration, revision and update time. RLS includes a restrictive owner guard. Direct browser writes are denied; an authenticated RPC derives the owner from auth.uid(), checks publication, bounds fields and rejects stale revisions. A per-owner/lesson transaction lock serializes concurrent saves. The API ignores client-supplied owner/score fields. Auth changes remount private UI state. Reads are no-store. Notes are limited to 20,000 characters.

The layout and published videos work before this SQL is installed; notes/completion controls remain unavailable with a clear message. After reviewing, copy the SQL-only TXT publication copy into a new Supabase SQL Editor query and run it. Success shows `video_workspace_ready = true`. Then merge the application change and wait for Vercel Ready.

## Managing lessons without source edits

Continue using Supabase Table Editor > lessons. Existing title, category, description, video_url and published fields remain the source of the library. Optional new fields:

- `sort_order`: a lesson's sequence (1, 2, 3…). Unspecified lessons retain their existing newest-first relative order.
- `duration_seconds`: verified length in seconds; leave blank if unknown. Native file duration can also appear after saving playback progress.
- `transcript`: instructor-provided transcript text. If blank, the tab explains that no transcript was supplied and suggests available player captions.
- `study_guide_slug`: the bundled study sheet to link; for example `12-placental-bleeding` for placental abruption. Valid slugs are in lib/study-guide-catalog.mjs. Exact guide titles and a few unambiguous aliases also match automatically. Otherwise the resource links to the course-sheet library.

Do not add placeholder lessons or clinical claims to fill the playlist. Only published records appear. There is no new video-administration screen in this change.

## Notes and failure handling

Notes are explicitly saved with Save notes; leaving/switching with edited notes first attempts a save and stays on the lesson on failure. Direct-video checkpoints also save the current note draft. Reload progress is disabled while notes are unsaved. Copy notes before a browser reload if a conflict occurs. Browser unload warnings help with unsaved notes, but forced closure/offline operation cannot guarantee the final edit is synced. No offline or local-storage copy of private lesson notes is created.

## Validation

Unit tests cover embed URL safety, Vimeo hashes, direct files, explicit/unambiguous PDF linking and bounded progress. API tests cover authentication, owner-scoped reads, publication checks, whitelisted writes and revision conflicts. Disposable PostgreSQL checks cover migration reruns, own-row access despite a broad policy, independent accounts, stale revisions, unpublished lessons, and anonymous/direct-write rejection. No exam tables are needed by these tests.

Chromium tests use actual UI, stubbed provider frames/private APIs and a real byte-range-served MP4. They exercise notes/save failures/reload/account switching, completion and undo, filters, PDF links, supplied/missing transcripts, direct-video resume, desktop collapse, mobile drawer and 320/390/768/1450 widths, empty libraries and missing setup. Actual YouTube/Vimeo playback and production credentials are not tested. Screenshots use a clearly marked player placeholder, not fabricated course video content. TypeScript, scoped ESLint, the repository Node suite and a production build are checked.
