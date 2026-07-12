# 2026-06-20 S25/S22 Root Release Hygiene Map

Date/time: 2026-06-20 18:29 HKT
Sessions: S25 git hygiene and release intake lead; S22 production reliability and release engineering lead
Assignment: root deploy is guard-blocked; produce a dirty-tree ownership map and a clean staging/release slice before any further release discussion.

## Executive Decision

Do not deploy from the repository root.

`npm run release:root-deploy-preflight -- --json` failed protectively:

- Direct root deploy blocked because the worktree is dirty.
- Status entries: 543.
- Tracked modified: 325.
- Tracked deleted: 0.
- Untracked status entries: 218.
- Untracked files: 326.
- Guard instruction: use the S22 pruned staging path or a clean reviewed release worktree instead.

After additional read-only/staging checks, the live dirty tree moved slightly, likely from concurrent work:

- `git status --porcelain=v1`: 545 collapsed entries.
- `git status --porcelain=v1 -uall`: 653 file entries.
- Tracked modified files: 325.
- Untracked files from `git ls-files --others --exclude-standard`: 328.

Post-write verification after adding this S25/S22 report set:

- `npm run release:root-deploy-preflight -- --json` still failed protectively.
- Status entries: 546.
- Tracked modified: 325.
- Tracked deleted: 0.
- Untracked status entries: 221.
- Untracked files: 330.
- `git status --porcelain=v1 -uall`: 655 file entries.

S25/S22 did not stage, commit, branch, push, reset, delete, revert, clean, or deploy.

## Ownership Map

This is a path-based triage map, not final code ownership approval. Files with shared contracts still need the named owner plus any coordination owners from `AGENTS.md`.

| Owner bucket | Dirty entries | Release interpretation |
| --- | ---: | --- |
| S21 content pipeline/RAG | 162 | Candidate/generated content and RAG work. Keep outside runtime release until S18/S23 gates finish. |
| S11 QA/regression | 109 | Regression specs and test harness work. Evidence slice, not runtime slice. |
| Unmapped / manual owner needed | 81 | Mixed account/auth pages, regional question/topic files, session-log backfills, and assets needing manual routing. |
| S06 visualization | 66 | Visualization Lab and Manim/3D changes. Needs S06/S11/S22 gate before release. |
| S12 backend/API | 48 | API/auth/storage/forum/attempts routes and server storage. Needs S12-owned validation. |
| S04 practice | 27 | Practice routes, practice UI, question data entry points, practice assets. |
| S13 teacher console | 25 | Teacher console pages/components. |
| S22 release engineering | 23 | Release tooling, `.vercelignore`, staging/deploy scripts, S11 release evidence. |
| S01 app shell/home | 20 | Home, layout, shell, navigation, homepage assets. |
| S05 lessons | 20 | Lesson pages/data/components. |
| S03 curriculum roadmap | 13 | Roadmap/grade/topic surfaces. |
| S02 dashboard | 11 | Dashboard/adaptive display surfaces. |
| S10 docs/tooling/config | 9 | Shared config/docs/package changes; coordinate with S22 before release. |
| S20 game design | 9 | Games and game data/assets. |
| S08 state/analytics/types | 6 | Shared providers/types/adaptive state utilities. |
| S09 i18n/accessibility | 5 | i18n/accessibility selector/copy surfaces. |
| S14 parent console | 5 | Parent console and notices surfaces. |
| S07 AI tutor | 4 | AI tutor/provider UI/API surfaces; `.env.local.example` overlaps S19. |
| S25 release intake/git hygiene | 4 | Intake artifacts only. |
| S17 gamification | 3 | Rewards/gamification surfaces. |
| S16 research | 2 | Research reports only. |
| S24 illustration layers | 1 | Question illustration candidate asset. |

## Slice Map

| Slice | Dirty entries | Release rule |
| --- | ---: | --- |
| Runtime app/API/data/public | 435 | Too broad for direct release. Must be split by owner and validated in clean worktree/staging. |
| Generated/content backlog | 95 | Exclude from runtime release until S21/S18/S23 promotion approval. |
| Tests/regression | 59 | Keep as evidence/regression slice; do not mix with app runtime. |
| Docs/coordination/video | 30 | Keep out of deploy package; coordination evidence only. |
| Release hygiene | 26 | Candidate first clean PR/slice after S10/S22 review. |
| Unmapped/manual | 7 | Route manually before any release package. |
| `.env.local.example` | 1 | S07/S19 coordination; contains variable names only, no real secrets. |

## Clean Staging Evidence

S22 prepared a pruned staging package under ignored local output:

`/Users/dongpinhu/Desktop/MAIS-MVP/.tmp/vercel-staging/s25-s22-current-root-slice-20260620`

Manifest:

`/Users/dongpinhu/Desktop/MAIS-MVP/.tmp/vercel-staging/s25-s22-current-root-slice-20260620/vercel-staging-manifest.json`

Staging summary:

- Dry-run passed: 1,978 files, 146,103,181 bytes, forbiddenPathCount 0.
- Materialized package passed: 1,979 files, 146,106,298 bytes, forbiddenPathCount 0.
- Manifest validation found 0 forbidden deploy paths.
- Explicit exclusions verified: `.env.local`, `coordination/`, `node_modules/`, `.git/`, and `public/question-illustrations/` are absent.
- Top staged roots: `public` 1,157 files; `app` 280; `components` 253; `lib` 146; `data` 132.

Important: this package is path-clean, not release-approved. It still reflects the mixed dirty runtime tree, so it is an audit/staging artifact only until owners approve a narrower release slice.

## Recommended Release Slices

1. Release hygiene slice first:
   - `.vercelignore`
   - `scripts/release-env-guard.mjs`
   - `scripts/prepare-vercel-staging.mjs`
   - `scripts/deploy-vercel-preview.mjs`
   - `scripts/deploy-vercel-production.mjs`
   - `playwright.config.ts`
   - `tsconfig.next.json`
   - package/config deltas only after S10/S22 review
   - Acceptance: guard blocks dirty root, staging manifest excludes forbidden paths, env preflight can reach Vercel, type/build checks pass in a clean worktree.

2. Runtime performance/backend slice:
   - Start from the existing teacher-dashboard/login handoff and patch artifact in `coordination/release-intake/`.
   - Primary owners: S12 backend/API, S22 release engineering, S11 regression.
   - Do not mix with homepage redesign, content/RAG, forum, games, or visualization work.

3. S01 homepage/app-shell slice:
   - Home/layout/navigation/login-adjacent UI only after separating from S12 auth behavior.
   - Include production smoke evidence if homepage is release target.

4. S06 visualization slice:
   - Visualization Lab/Manim/Three.js files plus related S11 specs.
   - Keep apart from generated-content/RAG packages unless import dependencies require a coordinated gate.

5. S21/S18/S23 content and RAG backlog:
   - Candidate/generated content, live adapters, RAG wrappers, validation reports, and promotion decisions.
   - Must not go straight into runtime release without S18 QA, S23 promotion, S11 regression, and S22 readiness.

6. S20 games and S17 gamification:
   - Game data/assets/components separately from reward economy.
   - Require S20/S17/S11 gates as relevant.

7. S12 forum/parent/API extension slice:
   - Forum routes, notices, server stores, and API tests.
   - Keep separate from teacher/student dashboard work.

## Current Blockers

- Dirty root deploy remains blocked by guard and policy.
- The pruned staging package is clean of forbidden paths but includes mixed, unapproved runtime changes.
- S19/Vercel env parity could not be checked because `vercel env ls` failed before loading the user: TLS socket disconnected before secure connection.
- Concurrent work appears active; two visualization entries appeared while this pass was running. Rerun status immediately before any future release action.

## Checks Run

- Read `AGENTS.md`.
- Read MAIS release hygiene workflow, checklist, and stop conditions.
- `git status --porcelain=v1 -uall`.
- `git status --porcelain=v1`.
- `git diff --stat`.
- `git diff --name-status`.
- `git diff --numstat`.
- `git ls-files --others --exclude-standard`.
- `npm run release:root-deploy-preflight -- --json` failed protectively on dirty root.
- `npm run release:preflight -- --json` passed disk/e2e/staging-root checks.
- `node scripts/prepare-vercel-staging.mjs --dry-run --json --run-id s25-s22-current-root-slice` passed.
- `node scripts/prepare-vercel-staging.mjs --json --run-id s25-s22-current-root-slice-20260620` passed.
- Manifest validation and explicit forbidden-path checks passed.
- `npm run release:env-preflight -- --json` failed on Vercel CLI TLS/user-load error before env names could be listed.

## Checks Not Run

- No `npm run type-check`, `npm run build`, Playwright, preview deploy, production deploy, or publish preflight was run from the dirty root.
- No Git operation beyond read-only status/diff commands was performed.
