# 2026-06-28 A05 Lesson Image Resolution

## Agent

- Agent ID: A05
- Role: Lesson lead

## Objective

Improve the low-pixel Lesson page "Add & Subtract Stories" concept image without generating a different illustration.

## Scope

- Write scope: `public/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-reference.png`, `data/usCaliforniaLessonIllustrations.ts`, this A05 session log.
- Forbidden scope: API routes, shared provider state, practice/dashboard/visualization modules, real environment files, Git staging/commits/branches.

## Plan

1. Inspect the owner-provided screenshot and trace the exact Lesson image source.
2. Upscale the existing image asset only, preserving the same picture and math content.
3. Update the lesson illustration metadata to the new intrinsic dimensions.
4. Run focused checks and visual smoke verification.

## Notes

- Root checkout was already dirty before this session. No staging, commits, branch creation, reset, or cleanup will be performed.
- The exact source image was `public/lesson-illustrations/us-ca-k5/grade1-operations-algebraic-thinking/add-subtract-stories-single-panel-reference.png`.
- The source image was `592x384`; it is now `2368x1536`.
- Updated `data/usCaliforniaLessonIllustrations.ts` so the concept illustration metadata uses `width: 2368` and `height: 1536`.
- `npx tsx --test components/lesson/lessonVisualPlacement.test.ts` passed: 2 tests.
- `npm run type-check` failed on an unrelated visualization test import: `components/visualizations/three/manim/mathSceneV2CompletionStatusSummary.test.ts` cannot find `./mathSceneV2CompletionStatusSummary`.
- Browser smoke on a fresh local dev server at `http://localhost:3002` passed after API login as the California Grade 1 demo student. The lesson page rendered the upgraded image with no page errors; Next selected `/_next/image?...add-subtract-stories-single-panel-reference.png&w=2048&q=75`, decoded at `1024x664`, and rendered at `868x563`.
