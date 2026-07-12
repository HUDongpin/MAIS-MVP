# 2026-06-28 A05 Lesson Image Display Fidelity

## Agent

- Agent ID: A05
- Role: Lesson lead

## Objective

Investigate why the Grade 1 Lesson concept image still looked soft after the source PNG was enlarged, then implement a scoped display-setting fix.

## Scope

- Write scope: `components/lesson/LessonView.tsx`, `components/lesson/lessonVisualPlacement.test.ts`, `data/usCaliforniaLessonIllustrations.ts`, this A05 session log.
- Forbidden scope: API routes, shared provider state, practice/dashboard/visualization modules, real environment files, Git staging/commits/branches.

## Analysis

- The source image is already `2368x1536`.
- Browser inspection before this fix showed the page requesting `/_next/image?...add-subtract-stories-single-panel-reference.png&w=2048&q=75`.
- The optimized response served to Chromium was `image/webp` with `content-length: 87908`, which is too lossy for a text-heavy math illustration with small labels, number-line ticks, and formulas.
- Root cause is the display pipeline's lossy Next/Image optimization, not simply source-image dimensions.

## Changes

- Added optional `preserveRasterFidelity` metadata for lesson illustrations.
- Marked the Add & Subtract Stories concept PNG with `preserveRasterFidelity: true`.
- Updated `LessonView` to pass `unoptimized` only when that flag is true, so this specific text-heavy PNG is served directly instead of recompressed through the Next optimizer.
- Added a focused regression assertion in `lessonVisualPlacement.test.ts`.

## Verification

- `npx tsx --test components/lesson/lessonVisualPlacement.test.ts` passed: 3 tests.
- `npm run type-check` passed.
- Browser smoke on `http://127.0.0.1:3007/student/lessons/us-ca-math-p1-1-oa-add-subtract` after API login as the California Grade 1 demo student passed with no page errors.
- After the fix, the rendered image uses `currentSrc: http://127.0.0.1:3007/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-reference.png`, `naturalWidth: 2368`, `naturalHeight: 1536`, `renderedWidth: 868`, `renderedHeight: 563`, `content-type: image/png`, and `content-length: 2563123`.
