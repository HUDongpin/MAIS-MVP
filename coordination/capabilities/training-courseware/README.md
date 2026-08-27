# MAIS training-courseware capability

Status: implemented and locally verified on the feature worktree. This document does not claim deployment or production verification.

## Product entry point

The capability extends the existing authenticated Teacher Lesson Kit instead of creating a second courseware store.

- Teacher UI: `components/teacher/TeacherPrepViews.tsx`
- Export API: `GET /api/teacher/lesson-kits/:kitId/exports?format=json|html|pptx|pdf`
- Canonical manifest: `lib/server/teacherCoursewareManifest.ts`
- Renderers: `lib/server/teacherCoursewareExports.ts`

## Canonical contract

Every export is generated from one deterministic `mais-courseware-manifest@1` object. The manifest records:

- the lesson-kit identity and source revision;
- learning objectives, activities, practice and assessment evidence;
- source-ledger entries and review status;
- objective/activity/assessment alignment;
- a quality rubric and blocking warnings.

Alignment derived only from the kit structure is labelled `kit-level-inference`. It is not presented as an externally reviewed curriculum claim. Unreviewed generated questions remain visible in both the source ledger and quality rubric.

HTML, PPTX, PDF and JSON responses carry the same manifest SHA-256. The PPTX is an actual Open XML presentation and the PDF is an actual paginated PDF document; neither is a renamed HTML or text file. PDF generation uses PDFKit and embeds a Unicode Noto Sans CJK subset so Chinese text does not depend on a viewer-installed font. Simplified and Traditional Chinese select separate SC/TC font assets; Next.js output tracing explicitly includes both assets for the export route.

The bundled fonts are stored under `assets/fonts/` with the upstream SIL Open Font License 1.1 text in `assets/fonts/Noto-CJK-OFL.txt`. The fonts remain third-party assets governed by that license.

## Access and cache boundary

The export route uses the existing Teacher Lesson Kit authentication and ownership checks. Responses are private and `no-store`; the route does not publish artifacts or write to an LMS.

## Verification

Focused tests:

```text
./node_modules/.bin/tsx --test \
  lib/server/teacherCoursewareManifest.test.ts \
  lib/server/teacherCoursewareExports.test.ts
```

The focused suite checks determinism, substantive-change hashing, rubric blocking, source-ledger visibility, cross-format manifest identity, embedded-font PDF structure, and real PPTX packaging. Delivery QA additionally renders every PPTX and PDF page, runs presentation overflow checks, checks PDF metadata/fonts/text extraction with Poppler, and exercises the self-contained HTML in a browser. These checks prove the local artifacts only; they are not production-route evidence.

## Deliberate non-claims

- No production deployment is implied.
- A generated export is not automatically approved teaching content.
- The current quality rubric is a release aid, not a substitute for the MAIS content promotion chain or teacher review.
- No live LMS, SCORM runtime or LTI write occurs in this capability.
