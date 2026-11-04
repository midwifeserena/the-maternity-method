# Question images, visual explanations and nursing tips

This is a local, undeployed change. No production database or storage configuration has been modified. The existing study-answer and completed-exam reveal rules, submission flow, authentication and scores remain in use.

## Database changes for review

Apply only after approving these files, in this order, first in staging:

1. Existing archive setup: `supabase/migrations/20261104_exam_reviews.sql`, if not already installed.
2. `supabase/migrations/202611050001_question_education.sql`: adds nullable `question_image_url` and `question_image_alt` to questions; nullable `rationale_image_url`, `rationale_image_alt` and `nursing_tip` to protected question_solutions. Updates only the start RPC's public image metadata and adds a service-only atomic education-edit RPC. No existing question, key, rationale, response or score is rewritten.
3. `supabase/migrations/202611050002_question_media_storage.sql`: creates a private `question-media` bucket if absent, with PNG/JPEG/WebP and 3 MB limits. It refuses an existing public bucket with that name rather than silently changing it. A restrictive object policy prevents anonymous/authenticated direct access to this bucket even if another permissive storage policy exists. Other buckets are unaffected.

Question/solution JSON snapshots already capture these new fields. Stored media references remain immutable storage object paths; authorized display resolves fresh signed URLs, including when reopening old archives. Signed URLs last 24 hours, supporting untimed study sessions. Versioned UUID filenames prevent an upload from overwriting an image referenced by a completed exam. Do not manually overwrite/delete referenced storage objects. Asset bytes are not copied into each exam snapshot.

Solutions, nursing tips and rationale image metadata remain inaccessible through question payloads and learner solution-table reads. Public question payloads are explicitly whitelisted. Study feedback returns private education only where the existing study-check endpoint allows the explanation. Timed sessions with attempt IDs remain blocked from that feedback endpoint. Completed reviews still verify owner and completion before accessing solutions or signing rationale media. This feature does not change the existing standalone-study endpoint's authorization rules.

## Adding content

Sign in as an existing allowlisted administrator (`NGN_ADMIN_EMAILS`), then choose **Question Bank Studio** in the sidebar, or open `/admin/questions`. Students do not see this link and cannot access the page, edit APIs or upload API.

Search/select an existing question, upload an optional question image and/or rationale image, enter descriptive alt text, add an optional Nursing Tip, and choose **Save education**. Uploading alone does not attach the image; saving the form does. Both question and solution metadata save atomically. Existing question text, keys, rationale text and publication are unchanged. Leaving the page with unsaved edits prompts before discarding them.

You can also enter HTTPS image URLs or existing `storage://question-media/path/to/image.png` references. External/public images remain accessible to anyone who already has their URL; use the private uploader for rationale illustrations. Never use the public logo bucket for protected explanations. No new npm dependencies or per-question source edits are required. Existing SQL imports can use the new nullable fields, provided private education goes in question_solutions, not questions.

## Storage setup

Use the proposed storage migration above, or create an equivalent **private** bucket `question-media` in Supabase Storage with PNG/JPEG/WebP and a 3 MB limit, then apply the restrictive object policy from that migration. The existing server-side service key uploads files and signs permitted reads. No new credentials, public bucket policy or image-host configuration is needed. SVG uploads are deliberately excluded; use PNG/JPEG/WebP. The 3 MB upload limit fits Vercel request-size limits with multipart overhead.

## Changed code

- `components/exam.tsx`, `exam-review.tsx`, `exam-images.tsx`, `nursing-tip.tsx`, `exam.css`: reuse responsive aspect-preserving images and add an elegant brand-colored Nursing Tip only in revealed explanations.
- `lib/question-media-server.ts`, `question-education.mjs`, `exam-review.mjs`: private-object resolution, safe education validation, alt text and frozen/current review education.
- `/api/questions`, `/api/exams/start`, `/api/study/check`, `lib/exam-review-server.ts`: route authorized image/education data through existing flows without changing submission or grading.
- `/admin/questions`, `/api/admin/questions`, `/api/admin/questions/media`, `components/question-studio.tsx`, `sidebar.tsx`: administrator-only content management and uploads.
- The two proposed migrations above and automated education/API/PostgreSQL tests.

## Validation

TypeScript and the available unit/API suites pass. Tests verify no private education in question/start payloads, study reveal versus timed denial, no unauthorized editor/upload access, field/alt validation, PNG/JPEG/WebP signatures, SVG rejection, immutable upload names and no score changes.

Disposable PostgreSQL 17 checks verify additive migrations, unchanged original keys/rationale/legacy scores, hidden solution rows, service-only edits, no protected content in start payloads, frozen tips/media after live edits, original scoring, and private storage despite a broad permissive policy. Storage SQL uses test scaffolding for Supabase's storage tables; live Storage APIs are covered through isolated SDK mocks, not a production bucket.

Chromium uses actual exam/review components with isolated APIs: optional images and alt text, no pre-reveal media/tips, permitted study education and selected-answer lock, image-free questions, responsive mobile display, and the existing completion/review regression workflow. Live Supabase credentials were unavailable; staging verification with real administrator/student accounts is required. The normal build in this environment is limited by Google Fonts network access, as in the existing project.

## Staging check before deployment

Add one image-bearing question with a protected rationale image and tip, plus one image-free question. Start a Study test: only its question image should be visible until submitting the answer. Confirm the explanation image/tip then appear with the original score. Complete a Timed test: no private education appears before submission. Open Previous Tests, inspect both reviews, then edit current education and verify previously archived exams retain their saved version. Check phone layout and alt text. A student attempting `/admin/questions` or its APIs must be rejected.

Additional build verification: the exact proposed source passed Next.js route generation, TypeScript and an offline webpack production build using Next's Google Font test fixtures backed by a local system font. This verifies compilation and route output without changing the application's font configuration. A normal build fetching the actual Google Fonts remains unverified in this restricted network environment.
