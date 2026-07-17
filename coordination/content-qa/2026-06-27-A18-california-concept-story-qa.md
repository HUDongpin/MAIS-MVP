# A18 California Concept Story QA

Date: 2026-06-27

## Scope

- A05 live lesson integration with A18 content QA.
- Curriculum track: `US_CA_MATH`.
- Student-facing English concept explanation story rewrite:
  - 29 California K-G5 textbook lessons in `us-ca-math-k-g5-textbooks-v1`.
  - 12 Grade 1 H/L micro-lessons in `us-ca-math-grade1-h-l-micro-lessons-v1`.
  - 15 California middle-school replacement textbook lessons in `us-ca-math-middle-school-textbooks-v2`.

## Files Checked

- `data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json`
- `coordination/content-qa/us-ca-math-k-g5-textbooks-v1/lessons.json`
- `data/usCaliforniaMicroLessons.ts`
- `coordination/content-qa/us-ca-math-grade1-h-l-micro-lessons-v1/lessons.json`
- `data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json`
- `coordination/content-qa/us-ca-math-middle-school-textbooks-v2/lessons.json`

## Result

- Total concept story rows checked: 56.
- K-G5 package validator: 29/29 pass, 0 repair rows.
- Cross-surface validation: 56/56 pass for row counts, minimum story length, duplicate story scan, and blocked old/generic phrasing scan.
- Source policy: no copied official standards prose, IXL item text, raw corpus text, provider names, or secret material added.

## Checks Run

- `node coordination/content-qa/us-ca-math-k-g5-textbooks-v1/update-concept-explanations.mjs`
- `node coordination/content-qa/us-ca-math-k-g5-textbooks-v1/validate-concept-explanations.mjs`
- `node --import tsx --test data/usCaliforniaLessons.test.ts`
- JSON parse and row-count validation for the K-G5, Grade 1 micro-lesson, and middle-school lesson mirrors.
- Blocked phrase scan for the owner's quoted old Grade 1 concept paragraph and middle-school generic scaffold phrases.

## Verdict

Status: approved-for-integration-review for the English concept-story copy in the scoped lesson surfaces.

This QA does not expand public claims beyond the existing California lesson/textbook beta and replacement-lesson scopes. S11/A22 release checks remain required before any deployment or production-readiness claim.

## Expanded Scope Follow-Up

Date: 2026-06-27

### Additional Scope

- A05 rendered California concept blocks from `data/usCaliforniaLessons.ts`.
- A21 California textbook/candidate packages that still contain `conceptExplanation` fields:
  - `data/generated-content/us-ca-math-textbooks-v1/textbook-pack.json`
  - `coordination/content-qa/us-ca-math-rag-v2-candidate/s05-lesson-candidate-pack.json`
- A21 generators that could recreate stale concept text:
  - `coordination/content-qa/us-ca-math-k-g5-textbooks-v1/generate-us-ca-k-g5-textbooks-v1.mjs`
  - `coordination/content-qa/us-ca-math-middle-school-textbooks-v2/generate-us-ca-middle-school-textbooks-v2.mjs`

### Additional Result

- Rewrote 105 P6-S6 textbook-pack `conceptExplanation` fields across `en`, `zh`, and `zhHans`.
- Rewrote 68 A21 RAG-derived S05 lesson-candidate `lessonModule.conceptExplanation` fields.
- Replaced the computed P6-S6 rendered concept block with story-style student copy and removed student-facing standards/alignment metadata language from the concept explanation.
- Patched K-G5 and middle-school candidate generators so regenerated packages use a student-facing story frame instead of the old generic scaffold.

### Additional Checks Run

- Parsed 273 California JSON `conceptExplanation` fields across seven lesson/candidate package files: 273/273 unique, substantive, and free of the blocked old/generic phrases.
- Imported `usCaliforniaLessonSeeds` and checked 76 rendered concept blocks: 76/76 unique, substantive, and free of blocked textbook/internal-source wording.
- Source-policy scan found no copied standards prose, IXL item text, raw corpus text, provider names, or secret material in the revised concept explanations.
- `node coordination/content-qa/us-ca-math-k-g5-textbooks-v1/update-concept-explanations.mjs && node coordination/content-qa/us-ca-math-k-g5-textbooks-v1/validate-concept-explanations.mjs` passed; 29/29 K-G5 rows, 0 repair rows.
- `node --import tsx --test data/usCaliforniaLessons.test.ts` passed; 10/10 tests.
- `node --import tsx --test --test-name-pattern 'California|roadmap lesson links use slugs served by the lesson API route|production-ready lesson seeds do not use generic placeholder phrasing' lib/mvpReadiness.test.ts` passed; 3/3 targeted tests.
- Runtime API check for `/api/lessons/us-ca-math-p1-1-oa-add-subtract` on `127.0.0.1:3000` returned the rewritten Lena sticker story and no blocked old phrases.
- Runtime API check for `/api/lessons/us-ca-math-p6-chapter-01` on `127.0.0.1:3000` returned story-style rendered concept text and no standards/alignment metadata in the concept block.
- Final ESM audit checked JSON package fields, live `data/usCaliforniaMicroLessons.ts` specs, and rendered `usCaliforniaLessonSeeds` concept blocks: 325 concept-source rows/blocks checked, 325 unique, 0 blocked-phrase or minimum-substance issues.

### Checks With Known External Failures

- Full `node --import tsx --test lib/mvpReadiness.test.ts` was run for broader import coverage and failed outside this California concept-story slice on pre-existing release-readiness items: missing mainland PEP/HJB and Arkansas illustration assets, a visualization mapping assertion, and a parent console API/hook assertion.
- Fresh `npm run type-check` and `npm run build` remain A22-owned release-hygiene blockers from stale generated Next validator artifacts referencing deleted `app/student/lessons/page.js`.

### Follow-Up Verdict

Status: approved-for-integration-review for the expanded California concept-story copy. This remains content QA evidence only; A11 regression and A22 release gates are still required for release-ready claims.
