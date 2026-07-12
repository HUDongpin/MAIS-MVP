# 2026-06-30 A22 P0 Lesson Checklist Release Candidate

## Objective

Prepare a safe release path for the P0 lesson checklist bug on:

- `https://mais.hk/student/lessons/us-ca-math-p1-1-oa-add-subtract`
- `https://mais.hk/api/lessons/us-ca-math-p1-1-oa-add-subtract`

## Current Production State

Live production was rechecked after preparing the candidate.

- `POST https://mais.hk/api/auth/login` as the California P1 demo student: `200`, total `1.881s`.
- `GET https://mais.hk/api/lessons/us-ca-math-p1-1-oa-add-subtract`: `200`, total `3.909s`.
- Production API still returns:
  - checklist title: `Guided practice`
  - 4 generated checklist items
  - raw generated text containing `Expected move`
  - raw generated text containing `representation`

Conclusion: production is not fixed yet. The fix is prepared in the candidate below and still requires owner-approved production publish.

## Candidate Source

- Source root: current dirty `/Users/dongpinhu/Desktop/MAIS-MVP`
- Staging candidate: `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630`
- Files after P0 patch: `2,184`
- Size after P0 patch: `205.2 MiB`
- Forbidden scan: `0`
- Excluded by staging policy: `.env*`, `.git`, `.local`, `.tmp`, `.vercel`, `coordination`, `node_modules`, tests/spec files, `data/ease`, and `public/question-illustrations`

This candidate is a pruned staging package with a small A05/A12 P0 overlay. Root feature files were not modified for this P0 continuation.

## P0 Overlay

Patched inside the staging candidate:

- `components/lesson/lessonCompletionChecklist.ts`
  - Adds `normalizeLessonCompletionChecklistForLesson`.
  - Elementary lessons retain one checklist block titled `Quick self-check`.
  - Elementary checklist items are:
    - `I can draw it or use objects.`
    - `I can write the number sentence.`
    - `I can check that my answer fits the story.`
- `components/lesson/StudentLessonPage.tsx`
  - Normalizes the initial lesson payload.
  - Removes the blocking server-side `getRoadmapData` call from first render.
- `components/lesson/LessonView.tsx`
  - Normalizes client-fetched lessons.
  - Loads grade roadmap data lazily after the lesson is visible.
- `app/api/lessons/[slug]/route.ts`
  - Normalizes student lesson API payloads before JSON response.

## Verification

Verification copy:

- `/tmp/mais-a22-p0-checklist-verify-tiMhAF`

Commands and results:

- `npm ci`: passed in verification copy.
  - Existing audit status remains `1 moderate`, `1 high`.
- `npm run type-check`: passed.
- `NEXT_DIST_DIR=.tmp/a22-p0-checklist-next NEXT_TELEMETRY_DISABLED=1 npm run build`: passed.
  - Generated `222` static pages.
  - Dynamic route `/student/lessons/[lessonSlug]` present.
- Built-server API smoke on `127.0.0.1:3097`:
  - `POST /api/auth/login`: `200`, total `0.023s`.
  - `GET /api/lessons/us-ca-math-p1-1-oa-add-subtract`: `200`, total `0.700s`.
  - API returned `access: "full"`.
  - API returned one checklist block titled `Quick self-check`.
  - API returned exactly 3 checklist items.
  - API checklist text did not contain `Expected move`.
  - API checklist text did not contain `representation`.
- Built-server browser DOM smoke on `127.0.0.1:3097`:
  - Page status: `200`.
  - First visible checklist appeared in `191ms`.
  - Checklist heading count for `Quick self-check`: `1`.
  - Checklist checkbox count: `3`.
  - Checklist text contained `0/3 quick checks done`.
  - Checklist text did not contain `Expected move`.
  - Checklist text did not contain `representation`.

## Release Boundary

No Vercel preview, production deploy, alias promotion, Git staging, commit, branch, push, reset, revert, deletion, or destructive cleanup was performed.

`npm run release:staged-publish-preflight -- --json` still fails protectively from the dirty root with `2473` expanded status entries. This is expected; the deployable artifact is the reviewed pruned staging candidate, not the repository root.

## Owner Decision Needed

Production publish requires explicit owner approval for this specific candidate. Suggested wording:

> approve A22 production deploy of `.tmp/vercel-staging/a22-p0-lesson-checklist-20260630` to `www.mais.hk` and `www.mais.ac`

After approval, A22 should deploy the staging candidate with `--skip-domain` first, inspect readiness, run the same authenticated lesson API/page smoke on the deployment URL, then promote aliases only after the smoke passes.
