# The Maternity Method — architecture, operating cost, and delivery plan

**Status (October 2026):** Phase 1 visual foundation implemented in the starter, and some Phase 2–5 prototype code is present from the preceding starter. Neither the complete platform nor a production deployment has been verified. All costs are USD estimates, not quotes.

## Why Next.js + Supabase instead of Bubble?

| Criterion | Custom Next.js / Supabase | Bubble |
|---|---|---|
| Exam compute | Server-side score functions and SQL aggregates can be optimized and tested independently, with explicit indexes and execution metrics | Logic typically expressed using workflows and platform-specific capacity constraints |
| Data ownership | PostgreSQL schema and export paths permit migration to another provider | Export possible, but app behavior and workflows have greater platform lock-in |
| Complex NGN interaction | Complete control of input components, accessibility, server validation, and timed attempts | Fast prototyping with limitations that may require plugins/custom code for complex exams |
| Operating cost | Hosting/database/media billed separately, requiring careful usage monitoring | Bundled plan plus workload, storage and plugin pricing; can be quicker to start |
| Development effort | Higher upfront engineering, QA and security responsibility | Lower barrier for nontechnical authoring and first pilot |

**Recommendation:** Custom code is a good long-term match for high-volume, interactive question practice and fine-grained student metrics *if maintained well*. It is **not inherently cheaper or faster** at low usage. Bubble may be more economical for rapid early validation and nontechnical edits. Build a friendly admin CMS to preserve no-code editorial workflows.

## Reference architecture

- **Next.js App Router**: React UI, nested routes, server-rendered protected views, server-only action handlers.
- **Tailwind 4**: single token system declared in `app/globals.css`; responsive navigation shell and accessible controls.
- **Supabase Auth**: email verification, password resets, refreshable cookie sessions through `@supabase/ssr`.
- **Postgres + RLS**: students can access only their own progress/attempts; admin policies explicitly separate editing rights. Keep question keys and rationales private until allowed by mode and attempt status.
- **Supabase Storage**: private buckets for downloadable PDFs / course-owned assets with short-lived signed URLs, and an external video CDN/transcoding platform for scale.
- **Exam API**: score only on the server; session timers validated using server-authoritative start and expiry times; transactional finalization and idempotency.
- **CMS**: role-gated `/admin` forms, upload validation, audit logs, drafts/publishing and clinical review workflow.

## Cost estimates and plan restrictions

| Service | Development / hobby | Commercial pilot baseline | Scaling factors |
|---|---|---|---|
| Vercel | Hobby $0, intended for personal/non-commercial use | Pro starts at **$20/month per seat**, with included usage credit | bandwidth, edge/server execution, team seats and add-ons |
| Supabase | Free tier available with platform limits | Pro typically starts around **$25/month per organization/project billing context**, verify live quote | database size, compute, egress, storage, MAUs, backups |
| Domain | About $10–25/year | About $10–25/year | domain/TLD and renewals |
| Video delivery | Unlisted external videos usable for initial testing, not strong paywall | CDN/video host usage varies | minutes encoded, storage, streaming egress, access control |
| Email delivery | Trial allowances | Often $0–25+/month | transactional sends and deliverability |
| Error monitoring | Free starter tiers | Approximately $0–30+/month | volume, retention and seats |
| Payments | None in Phase 1 | Processor fees per transaction + optional billing fees | disputes, tax, currency conversion |

**Indicative monthly starting infrastructure:** ~$45 before domain, storage, video traffic, paid email, payment processing, taxes, and overages. This excludes ongoing developer, designer, and clinician-review labor. Costs rise with real student usage; set usage alerts and budgets. Verify on vendor pricing pages before committing.

Reference: https://vercel.com/pricing , https://supabase.com/pricing . Vercel Hobby is explicitly non-commercial; use a commercial-eligible plan before accepting paying students.

## Maintenance and production gates

1. Daily: automated availability/error monitoring and backup verification; check billing/usage alerts.
2. Weekly: dependency advisory review, regression tests, restore drill schedule, and content analytics checks.
3. Monthly: dependency upgrades, security/RLS policy tests, accessibility scan and real-device smoke testing.
4. Before launch: real email/password-reset flows, authenticated access boundaries, media entitlements, tested payment webhooks, admin authorization, clinically reviewed content, secure rate limits, privacy/terms, fully tested exam recovery and timer integrity.
5. Before publishing NCLEX practice material: confirm NCSBN scoring taxonomy and current test-plan details, preserve original questions and source attribution, and avoid suggesting official NCSBN endorsement.

## Delivery phases

- **Phase 1 — UI foundation:** brand palette, vector placeholder stork logo, fluid responsive navigation, app routing. Implemented.
- **Phase 2 — Student accounts:** finish validating auth, session management, personal dashboard analytics and study-calendar persistence.
- **Phase 3 — Editorial CMS:** role-based `/admin`, safe upload and question authoring with clinical review/audit trails.
- **Phase 4 — Lessons:** uploaded video metadata, playback event tracking and watch-percent/completion persistence.
- **Phase 5 — Exams:** fully server-authoritative timers, NGN case sets and complete scoring taxonomy, transactionally persisted results, accessibility and E2E tests.
