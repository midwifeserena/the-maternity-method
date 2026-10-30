# The Maternity Method

A branded Next.js App Router / Tailwind CSS 4 / Supabase starter application for maternity nursing education. **This is an implementable starter, not a production-certified or deployed service.**

## Included

- Responsive persistent navigation, dashboard, question bank, exam builder, NGN-style patient chart and matrix, video/guide catalog, attempts, performance and account screen.
- Auth with Supabase cookie-based SSR, login/signup, email confirmation callback.
- Server-side scoring: 0/1 single-response, independent 0/1 matrix rows and SATA +/- with zero floor; see `lib/scoring.mjs`.
- Timed practice mode (default 30 minutes) and study mode with feedback and rationales. Attempts and per-item responses persist to Postgres.
- RLS protected learner tables and restricted solutions in `question_solutions` accessible solely via server-only service-role queries.
- Sample educational content for development (not clinical/NCLEX endorsement).

## Run locally

1. Install Node.js 20.9+ and create an empty Supabase project.
2. In Supabase SQL Editor, execute `supabase/schema.sql`, then `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local`, fill in Supabase project URL, publishable key, and **server-only** service role key. Never expose the latter in browser code or public repositories.
4. In Supabase Auth → URL Configuration, set **Site URL** to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to allowed redirects. Configure production redirects for your real domain when deploying.
5. Run:

```bash
npm install
npm run test
npm run dev
```

6. Visit http://localhost:3000, create an account and confirm the email if required.

## Deploy to Vercel

1. Commit this directory to a **private GitHub repository** and import it into Vercel as a Next.js project. GitHub integration enables CI-based preview and production deployments.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), and `NEXT_PUBLIC_SITE_URL` in Vercel project environment variables.
3. Configure the deployed domain and `/auth/callback` redirect in Supabase Authentication settings.
4. Enable branch protection and run tests/build in GitHub Actions before promotion.
5. Publish lesson/guide metadata via the Supabase dashboard after verifying that externally hosted video/PDF URLs grant only intended access.

## Content schema

- `questions`: visible metadata, labels, optional chart, question category and item type.
- `question_solutions`: **secret** answer keys and multi-paragraph rationales.
- `exam_attempts` and `exam_responses`: stored scores and student responses.
- `lessons`, `guides`: published content catalog.
- `profiles`, `subscriptions`, `flashcard_decks`, `flashcards`: database-ready foundations; full billing and flashcard workflows are **not** implemented.

## Important remaining work before accepting paying students

- Add server-validated subscription entitlements to each content and exam API, and implement Stripe or alternative checkout with verified webhooks.
- Fix the pause policy for high-stakes-like testing: currently pause stops the **client** countdown only; implement server-issued attempt start/end times and expiry checks, server-validated timer/pause policy, recovery and idempotent submissions.
- Protect against duplicate submissions and partial persistence with a transactional database RPC. Current attempt and response writes are two steps.
- Implement admin/editor CMS, bulk imports, audit logs, content review and source attribution, content licensing, role-based access and protected media storage.
- Build a fuller NGN scoring taxonomy (matrix multiple-response, rationale pairs, bowtie, ordered response, cloze) separately; present matrix example uses matrix *multiple-choice*, not matrix MR.
- Add automated integration/E2E testing, rate limiting, telemetry, accessibility audit, usability testing on real devices, and security review (including RLS, auth and service-role boundaries).
- Current `Study Mode` reveals scoring on individual submission, but does not persist every per-question study check until end-of-session. Current 'NGN Case Studies' view shares the question bank rather than having ordered six-question clinical case workflows.
- Current sample category logic does not enforce NGN-only filtering; author case groups and enforce category/type filters when ready.
- Replace seed content with clinically reviewed, original and appropriately referenced questions. Avoid official NCLEX affiliation claims or copying proprietary questions. Scoring implementation is a *practice model*, not an official CAT or readiness predictor.
- Replace placeholder wordmark with licensed logo assets, and review branding typography on different screens.

## Tests

`npm run test` covers core scoring and redaction. `npm run build` validates production compilation. Do not consider either a substitute for integration or security tests.

## Documentation

- [Next.js App Router](https://nextjs.org/docs/app)
- [Tailwind CSS with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [Supabase SSR guide](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [NCSBN scoring models](https://ncsbn.zendesk.com/hc/en-us/articles/14690447982359-What-are-the-current-scoring-models)

## Phase 1 deliverable (October 2026)

- Original rose-gold stork/stethoscope SVG placeholder in `components/stork-logo.tsx`.
- Exact six brand tokens in `app/globals.css` using Tailwind CSS 4 `@theme inline`.
- Responsive mobile drawer and desktop sidebar in `components/sidebar.tsx` with active-page indication and all ten requested links.
- `ARCHITECTURE.md` compares Bubble and Next.js/Supabase, provides operating costs and production readiness requirements.

**Scope:** An existing prototype includes some Phase 2–5 screens and schema, but those features are not certified as complete, secure, or production-ready. Phase 1 work does not imply later phases are done.

## Content protection
The authenticated student area now includes a persistent account-linked watermark and casual-copy deterrents. See `CONTENT_PROTECTION.md` for technical limitations, privacy/accessibility considerations, and additional production security controls required. Browser screenshots and recordings **cannot be reliably blocked**.

## Public landing page (October 28 screenshot reference)

The public `/` route now contains a single responsive scrolling marketing page inspired by the seven supplied reference screenshots. It includes a header, stork hero, five feature cards, an interactive sample multiple-choice question, four pricing cards, expandable FAQs, and footer. The stork image is cropped from the supplied screenshot and is a reference image, not a clean vector master; replace `public/images/stork-reference.png` with the original licensed logo asset before launch.

Landing page sources: `app/page.tsx`, `components/landing-page.tsx`, `components/landing.css`, and `public/images/stork-reference.png`. The sample question is illustrative; pricing links lead to sign-in and do **not** charge students or grant paid plans. Plan text and sample-access wording are marketing proposals until backed by actual database access rules and Stripe billing. The screenshot editor's blue selection outlines are intentionally excluded.
