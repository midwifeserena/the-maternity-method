# Public launch page

The new page is `/launch` on the same domain as the existing website. It is outside the authenticated `(platform)` route group. No homepage or portal link was added.

## Content updates

Edit `app/launch/launch-config.ts`:

- `heroVideoUrl`: HTTPS YouTube, Vimeo, or MP4 URL. Empty shows a video placeholder.
- `founderPhotoPath`: a local `/...` path or image URL. Empty shows a clearly labeled founder placeholder.
- `questionBankCount`: a verified number, or `null` to omit the count.
- `testimonials`: replace the clearly labeled placeholder cards with approved real feedback.
- `contactEmail`: enables contact links in the FAQ and footer when supplied.
- `launchDate`, `kitFormUid`: launch date and the Kit form identifier.
- `siteUrl`: reads `NEXT_PUBLIC_SITE_URL`. Set this to the canonical public HTTPS domain in Vercel for absolute social-sharing image URLs.

The missing mockup HTML was replaced by the supplied screenshot as the visual reference. The original `public/logo.png` was not supplied; the existing repository stork artwork was copied to that path and compressed to `public/launch-logo.webp` (300 pixels wide, approximately 7 KB) for the header. Replace both assets together if a different logo is desired. Fonts are Fraunces and Nunito Sans, scoped to this page; existing fonts are unchanged.

## Email and video

Kit owns subscriptions. No database table or migration is required. The embed inserts the vendor script inside its own container, waits for a form/iframe, and supports retry after failure. Form appearance, fields, consent, and email automations are managed in Kit. Test a real subscription on the Vercel preview before launch. No application Content Security Policy was present to modify; if one is configured externally, allow the required Kit/ConvertKit script, style, frame, image, connection and form endpoints.

YouTube uses a privacy-enhanced embed; Vimeo supports unlisted-video hashes. Video requests begin after Play is pressed. MP4 uses native controls. No video URL has been invented.

## Shared change

`proxy.ts` adds an early return for exactly `/launch` and `/launch/`, before Supabase session refresh. All other paths retain their existing behavior. No authentication requirements on student or admin routes were changed.

## Validation and release

Run the existing tests, TypeScript check, and production build. Browser verification should cover anonymous direct access and refresh, mobile widths, anchor navigation, FAQ keyboard use, Kit loading/retry/Strict Mode, and optional video playback.

The managed environment blocks Google Fonts downloads. Local production-build validation used temporary offline font responses outside the repository; those fixtures are not shipped. Confirm the actual Fraunces/Nunito Sans rendering and live Kit embed in the Vercel preview.

Merge the feature branch only after reviewing the preview. No production deployment was performed. After release, share your existing public domain followed by `/launch`.

Optional later: place a small “Join the launch list” link beside the existing public Sign In link. This was not added because the request requires separate approval.
