# S22 Release Blocker - California Middle School Downlist

## Scope

- Responsible release owner: S22 production reliability and release engineering.
- Consuming content owner: S21 content pipeline.
- Related owners: S18 curriculum QA, S23 promotion, S05 lesson integration, S11 regression QA, S19 environment readiness.
- Intended deployable runtime change: downlist the student-facing California middle-school textbook routes while keeping the noindex QA review route and candidate artifacts out of production release scope.

## Release Slice

Runtime files in the intended downlist slice:

- `app/lesson/california-middle-school-textbook/page.tsx`
- `app/student/lessons/california-middle-school-textbook/page.tsx`

Regression evidence file:

- `tests/e2e/california-middle-school-textbook-english-only.spec.ts`

Candidate content package, not deployable live textbook content:

- `coordination/content-qa/us-ca-math-middle-school-textbooks-v2/`

## Checks Run

- `node coordination/content-qa/us-ca-math-middle-school-textbooks-v2/generate-us-ca-middle-school-textbooks-v2.mjs`: pass.
- `node /Users/dongpinhu/.codex/skills/california-math-common-core/scripts/audit-mais-california-pack.mjs coordination/content-qa/us-ca-math-middle-school-textbooks-v2/lessons.json`: pass, 0 errors, 0 warnings.
- `npm run type-check`: pass.
- `npx playwright test tests/e2e/california-middle-school-textbook-english-only.spec.ts --project=desktop-chrome`: pass, 2 tests.
- `npm run build`: pass.
- `npm run release:preflight -- --json`: pass.
- `npm run release:env-preflight -- --json`: pass; production required variable names present, missing count 0.
- `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id california-middle-school-downlist-dry-run`: pass, but broad staging bundle includes 3,020 deployable files and 700,653,889 bytes.

## Blocker

`npm run release:publish-preflight -- --json` failed because direct production publish is blocked by dirty-root state:

- Status entries: 1,731.
- Tracked modified: 297.
- Tracked deleted: 48.
- Untracked status entries: 1,386.
- Untracked files: 2,731.

The existing S22 pruned staging script excludes forbidden local/secret/generated roots, but it still stages the current deployable `app/`, `components/`, `data/`, `lib/`, `types/`, and selected `public/` folders from the dirty working tree. Because that dry-run bundle contains thousands of unrelated deployable files, it cannot be treated as a California-middle-school-downlist-only production slice.

## Decision

Production deploy to `www.mais.hk` is blocked for this slice until one of these release paths exists:

1. S22/S25 prepare a clean reviewed release worktree or pruned staging package that contains only the approved runtime downlist slice plus known-good baseline files.
2. The owner explicitly approves an emergency dirty-root deploy override after accepting the unrelated-file risk.
3. The unrelated dirty work is sliced/merged/cleared enough that production publish preflight passes without override.

The replacement textbook package remains `candidate-only` and must not be promoted to the student-facing California middle-school route until S18/S23/S05/S11/S22 gates are green for that exact content scope.
