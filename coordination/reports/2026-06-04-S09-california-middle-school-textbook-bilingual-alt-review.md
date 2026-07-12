# S09 Review: California Middle School Textbook Bilingual And Alt Text

- Date: 2026-06-04
- Session: S09
- Reviewed route: `/lesson/california-middle-school-textbook/review`
- Review type: bilingual/copy/accessibility review after layout integration

## Decision

`PASS_FOR_REVIEW_LAYOUT_WITH_RELEASE_CAVEATS`

The review page now exposes English, Traditional Chinese, and Simplified Chinese for the visible textbook title, course labels, chapter titles, concept explanations, exit tickets, and content-hold notice.

The page also provides meaningful `alt` text for each concept image and deterministic exact-layer image. The current route displays all three languages on the same review page, so the image `alt` text includes the English, Traditional Chinese, and Simplified Chinese chapter title in one string rather than selecting one locale.

## Checks

- Verified the route uses `California Math Practice Beta` wording, not full launch wording.
- Verified chapter images have non-empty alt text generated from grade and localized chapter title.
- Verified visible captions distinguish concept opener art from deterministic exact math layers.
- Verified unapproved worked examples/practice are held with trilingual copy.
- Verified no visible page copy claims final California curriculum/lesson launch status.

## Caveats

- For a future production lesson route, use the app language setting and localized `alt: { en, zh, zhHans }` data records, mirroring existing lesson illustration data files.
- Exact-layer PNGs still contain English visible labels inside the image. They are acceptable for this review layout, but final bilingual student release should localize or explicitly approve those labels.
- S18 still blocks final textbook/lesson release until chapter-specific examples and practice are repaired.
