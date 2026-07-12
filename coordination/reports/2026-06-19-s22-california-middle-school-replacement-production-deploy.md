# S22 Production Deploy - California Middle School Replacement Textbook

## Scope

- Responsible release owner: S22 production reliability and release engineering.
- Content owners: S21 generation, S18 full-scope QA, S23 promotion, S05 lesson route integration, S11 regression.
- Owner instruction: publish automatically when QA finds no problems; dirty-worktree risk previously accepted.
- Runtime change: replace the temporary downlist page with the reviewed text-only California middle-school replacement lesson surface.

## Content And QA Evidence

- Candidate package: `coordination/content-qa/us-ca-math-middle-school-textbooks-v2/`.
- Live runtime data copy: `data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json`.
- S18 full-scope reviewer:
  - `node coordination/content-qa/us-ca-math-middle-school-textbooks-v2/review-us-ca-middle-school-textbooks-v2.mjs`: pass.
  - Result: `approved-for-integration-review`.
  - Lessons reviewed: 15.
  - Accepted rows: 15.
  - Blocker rows: 0.
  - Deterministic pass rows: 15.
  - Unique standard IDs: 81.
- California standards audit:
  - `node /Users/dongpinhu/.codex/skills/california-math-common-core/scripts/audit-mais-california-pack.mjs data/generated-content/us-ca-math-middle-school-textbooks-v2/live-lessons.json`: pass, 0 errors, 0 warnings.
- Visible text safety scan:
  - Candidate/internal/generator/source-policy blocked text hits: 0.

## Local Release Checks

- `npm run type-check`: pass.
- `npx playwright test tests/e2e/california-middle-school-textbook-english-only.spec.ts --project=desktop-chrome`: pass, 2 tests.
- `npm run build`: pass.
- `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 npm run release:publish-preflight -- --json`: pass.
  - Dirty override active.
  - Status entries: 1,737.
  - Tracked modified: 296.
  - Tracked deleted: 48.
  - Untracked status entries: 1,393.
  - Untracked files: 2,743.
  - Production required environment variable names present: 7/7.
  - Missing production required environment variable names: 0.
  - Secret values were not printed or recorded.

## Deploy Evidence

- Command:
  - `MAIS_ALLOW_DIRTY_ROOT_DEPLOY=1 node scripts/deploy-vercel-production.mjs --json --run-id california-middle-school-replacement-owner-override-20260619`
- Deployment ID:
  - `dpl_GhBcPXiRiTawaxAKrSy6UKH1LcwY`
- Deployment URL:
  - `https://mais-9px3s5n1t-peter-dongpin-hu-s-projects.vercel.app`
- Target:
  - `production`
- Staging directory:
  - `.tmp/vercel-staging/california-middle-school-replacement-owner-override-20260619`
- Staging file count:
  - 3,022
- Staging total bytes:
  - 700,780,906
- Vercel inspect:
  - Ready after polling.
  - Production aliases included `https://mais.hk` and `https://www.mais.hk`.

## Live Smoke Evidence

Smoke timestamp: 2026-06-19T10:59Z.

- `https://www.mais.hk/lesson/california-middle-school-textbook?smoke=ca-middle-replacement-20260619`
  - Response flow: HTTP 308 to `/student/lessons/california-middle-school-textbook`, then HTTP 200.
  - `x-matched-path`: `/student/lessons/california-middle-school-textbook`.
  - Found expected text: `Replacement Grade 6-8 Lessons`.
  - Found expected text: `Grade 6 Ratios and Proportional Relationships: Ratios`.
  - Found expected text: `Function A has rate 3`.
  - Downlist text `Replacement lessons are in QA` was not returned by the smoke match.
- `https://www.mais.hk/student/lessons/california-middle-school-textbook?smoke=ca-middle-replacement-20260619`
  - Response: HTTP 200.
  - `x-matched-path`: `/student/lessons/california-middle-school-textbook`.
  - Found expected text: `Replacement Grade 6-8 Lessons`.
  - Found expected text: `Grade 6 Ratios and Proportional Relationships: Ratios`.
  - Found expected text: `Function A has rate 3`.
  - Downlist text `Replacement lessons are in QA` was not returned by the smoke match.
- English-only scan:
  - CJK characters found: false.
  - Downlist text found: false.
  - Replacement lesson content found: true.

## Public Claim Limits

Allowed public framing:

- California standards-aligned Grade 6-8 replacement lessons.
- Text-only middle-school lesson coverage with worked examples and checkpoints.

Not allowed public framing:

- Official California course.
- Complete California curriculum.
- IXL-equivalent exercises.

## Notes

- This production deploy used an owner-approved dirty-root override. It should not be treated as a clean release precedent.
- The old noindex review route remains available for internal comparison unless separately retired.
- Future answer-critical visuals, coordinate graphs, geometry diagrams, dense math labels, or exact-layer demonstrations still require deterministic `math-svg` or equivalent exact-rendering QA before public visual release.
