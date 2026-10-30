# Student content protection strategy

## Implemented in this starter
- Student-linked repeating watermark on authenticated platform content, using a shortened auth user ID, not their private email.
- Browser-side deterrents for copying, cutting, right-click context menu, drag-and-drop and common keyboard shortcuts inside the authenticated course area.
- Text inputs remain editable. Prints hide protected course content.

**Limits:** None of these prevent operating-system screenshots, third-party screen recording, browser devtools, network extraction, or photographs of the screen. `Permissions-Policy: display-capture=()` only restricts capture initiated by a page using the Screen Capture API; it does not prevent outside capture. Never claim otherwise. Watermarks can be cropped or removed; their purpose is accountability/deterrence, not guaranteed attribution.

## Production priorities (not yet implemented)
1. Supabase private Storage buckets with row-level security and **short-lived** server-generated URLs for authorized PDF and media access. URLs are still reusable until expiry and should not be treated as DRM.
2. Keep answer keys, full rationales, unpublished questions and scoring logic server-side, returning them only when study answers are submitted or tests are finalized.
3. Add video playback with signed tokens, domain restrictions, per-viewer overlays and optional reputable DRM streaming for valuable lesson media (note DRM cannot prevent all screen capture).
4. Offer an in-app study-sheet viewer for restricted sheets; only allow PDF download for resources explicitly designated downloadable. Preventing PDF download and allowing download are mutually inconsistent policies.
5. Rate limits, per-account session/device policies, detection of bulk question scraping, audit logs, and clear terms for fair student use.
6. Accessibility review: selection restrictions can harm assistive technology, copying accommodations and study habits; provide accessible authorized alternatives and an exception path.
7. Do not attempt screenshot detection via focus/visibility changes: it is unreliable and creates false accusations.

Security controls must be evaluated separately from visual deterrents.
