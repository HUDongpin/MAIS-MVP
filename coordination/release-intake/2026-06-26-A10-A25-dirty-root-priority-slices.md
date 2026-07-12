# 2026-06-26 A10/A25 Dirty Root Priority Slice Plan

- Generated: 2026-06-26 11:07 HKT
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Assignment: slice the MAIS-MVP dirty root, prioritizing the Shirleen release slice and the A06 type-fix slice.
- Baseline: `main` at `cef544e0`
- Scope confirmation: root inventory/reporting only. A10/A25 did not edit runtime code, stage, commit, branch, merge, rebase, push, reset, revert, delete, clean, preview deploy, or production deploy.

## Fresh Dirty Map

- Latest A25 map: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T030506Z.md`
- Latest map JSON: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T030506Z.json`
- Status signature: `eb9426eb5f30f2457d53f73492b5f3c62c1245ee41616ed29799e2cbd5cb3160`
- Expanded status entries: `1227`
- Collapsed status entries: `948`
- Tracked modified: `365`
- Untracked status entries: `583`
- Untracked files: `862`

Post-report note: A25 reruns `npm run release:dirty-map` after writing coordination artifacts so `coordination/release-intake/latest-A25-dirty-tree-map.md` and `.json` remain the current handoff pointers. The counts above preserve the analysis snapshot used for this slice plan.

## Current-State Manifest Update - 2026-06-26 11:16 HKT

A10/A25 refreshed the current dirty map and emitted exact pathspec manifests for the two priority slices:

| Priority slice | Manifest | Pathspec | Current status |
| --- | --- | --- | --- |
| Shirleen release source-control closure | `coordination/release-intake/2026-06-26-A25-shirleen-release-slice-manifest.md` | `coordination/release-intake/2026-06-26-A25-shirleen-release-slice.pathspec` | Ready for exact clean/pruned review; 11 paths |
| A06 type-check closure | `coordination/release-intake/2026-06-26-A25-a06-type-fix-slice-manifest.md` | `coordination/release-intake/2026-06-26-A25-a06-type-fix-slice.pathspec` | Current type-check green; dependency closure is large at 149 paths |
| Remaining dirty root broad buckets | `coordination/release-intake/2026-06-26-A25-dirty-root-slice-buckets-manifest.md` | `coordination/release-intake/2026-06-26-A25-slice-*.pathspec` | Covers all 1,257 entries from dirty-map snapshot `20260626T032131Z` |

Current checks:

- `npm run type-check -- --pretty false`: passed.
- `node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts lib/server/userStoreStudentActivityPersistence.test.ts components/lesson/lessonAccessPolicy.test.ts tests/e2e/reported-bug-source-regressions.test.ts`: passed, 66/66.
- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts components/visualizations/three/manim/mathAlwaysRedraw.test.ts components/visualizations/three/manim/mathMobjectLayout.test.ts components/visualizations/three/manim/mathEvidenceHarness.test.ts`: passed with exit 0.
- Broad bucket pathspec count check: `1257` total paths across runtime, tests, docs, content/RAG, release hygiene, env quarantine, and unmapped/manual buckets.

This supersedes the earlier "fresh root type-check is red" note in this report. The A06 risk is no longer a red type gate; the current risk is review-package size because the A06 dependency closure is not small.

Largest owner buckets:

| Owner bucket | Dirty entries |
| --- | ---: |
| A06 visualization lead | 304 |
| A12 backend/API platform | 160 |
| A10 tooling, docs, and report | 143 |
| A18 curriculum QA / A21 content pipeline | 130 |
| Unmapped runtime owner review needed | 99 |
| A21 content pipeline and RAG operations | 74 |
| A25 git hygiene and release intake | 66 |
| A11 QA and release quality | 61 |

Slice buckets:

| Slice | Dirty entries |
| --- | ---: |
| runtime app/API/data/public | 496 |
| docs/coordination evidence | 356 |
| tests/regression evidence | 289 |
| generated/content/RAG backlog | 65 |
| release hygiene tooling/config | 12 |
| unmapped/manual | 8 |
| secret/env quarantine | 1 |

## Priority 1 - Shirleen Release Slice

Status: production fix is already live and smoke-tested by A22, but the review/commit package still needs to be sliced from the dirty root. A22 used an owner-approved dirty-root pruned staging exception for the production deployment, so this slice should be converted into a clean review package before any further release or merge decision.

Primary evidence:

- A22 production deploy report: `coordination/reports/2026-06-26-A22-shirleen-lesson-production-deploy.md`
- A22 readiness report: `coordination/reports/2026-06-26-A22-shirleen-lesson-production-readiness.md`
- A12/A08/A02/A05 bugfix log: `coordination/session-logs/2026-06-25-A12-A08-A02-A05-lesson-entry-bugfix.md`
- A22 production result: Shirleen Dashboard Lesson issue fixed on both `www.mais.ac` and `www.mais.hk`.

Recommended review package, exact files:

| Path | Owner | Slice |
| --- | --- | --- |
| `app/dashboard/page.tsx` | A02 | runtime app/API/data/public |
| `components/lesson/StudentLessonEntryPage.tsx` | A05 | runtime app/API/data/public |
| `lib/server/internalCaliforniaFastLogin.ts` | A12 | runtime app/API/data/public |
| `lib/server/userStore/studentActivityPersistence.ts` | A12 | runtime app/API/data/public |
| `lib/server/internalCaliforniaFastLogin.test.ts` | A12 | tests/regression evidence |
| `lib/server/userStoreStudentActivityPersistence.test.ts` | A12 | tests/regression evidence |
| `components/lesson/lessonAccessPolicy.test.ts` | A05 | tests/regression evidence |
| `tests/e2e/reported-bug-source-regressions.test.ts` | A11 | tests/regression evidence |
| `coordination/reports/2026-06-26-A22-shirleen-lesson-production-readiness.md` | A22 | docs/coordination evidence |
| `coordination/reports/2026-06-26-A22-shirleen-lesson-production-deploy.md` | A22 | docs/coordination evidence |
| `coordination/session-logs/2026-06-25-A12-A08-A02-A05-lesson-entry-bugfix.md` | coordination evidence | docs/coordination evidence |

Known slice risk:

- `app/dashboard/page.tsx` has a broad dirty diff, not just the Lesson shortcut. It should be reviewed by A02/A11 before being accepted as part of this Shirleen package.
- `lib/server/userStore/studentActivityPersistence.ts` is untracked and large. A12 should confirm whether it is a deliberate split/extraction that must travel with the Shirleen fix.
- Root type-check is currently green, but Shirleen acceptance should still use a clean/pruned slice so the already-live release fix can be reviewed without unrelated dirty-root changes.

Checks already reported by owning sessions:

- `node --import tsx --test lib/server/internalCaliforniaFastLogin.test.ts`: passed.
- `node --import tsx --test lib/server/userStoreStudentActivityPersistence.test.ts`: passed.
- `node --import tsx --test components/lesson/lessonAccessPolicy.test.ts`: passed.
- `node --import tsx --test tests/e2e/reported-bug-source-regressions.test.ts`: passed.
- `npm run type-check`: passed in the earlier Shirleen staging path.
- `npm run build` inside A22 pruned staging: passed.
- Production API and mobile Dashboard/Lesson click smoke: passed on both production domains.

Recommended next action:

1. Owner-approved Git operator or owning sessions should create a clean Shirleen review package containing only the exact files above.
2. Rerun the four focused node tests and `npm run build` in that clean/pruned package.
3. Treat this as the first commit/PR candidate because the fix is already live and needs source-control closure.

## Priority 2 - A06 Type-Fix Slice

Status: A06 fixed the earlier `mathEvidenceHarness.ts(4467,5)` TS2322 error. A later A10/A25 current-state check at 2026-06-26 11:13 HKT shows `npm run type-check -- --pretty false` now passes. The remaining A06 slice risk is package size: a clean review package for the focused A06 roots currently has a 149-path dirty dependency closure.

Completed A06 sub-slice from the A06 log:

| Path | Owner | Slice |
| --- | --- | --- |
| `components/visualizations/three/manim/mathEvidenceHarness.ts` | A06 | runtime app/API/data/public |
| `components/visualizations/three/manim/mathMobjectLayout.ts` | A06 | runtime app/API/data/public |
| `components/visualizations/three/manim/mathMobjectLayout.test.ts` | A06 | tests/regression evidence |
| `components/visualizations/three/manim/mathEvidenceHarness.test.ts` | A06 | tests/regression evidence |
| `components/visualizations/three/ThreeDLabCanvas.tsx` | A06 | runtime app/API/data/public |
| `components/visualizations/three/threeDCanvasContract.test.ts` | A06 | tests/regression evidence |
| `components/visualizations/three/threeDCanvasSurfaceContract.ts` | A06 | runtime app/API/data/public |
| `coordination/session-logs/2026-06-26-A06.md` | A06 | docs/coordination evidence |

A06 checks already reported:

- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathMobjectLayout.test.ts`: passed after RED/GREEN.
- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/threeDCanvasContract.test.ts`: passed after RED/GREEN.
- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathEvidenceHarness.test.ts components/visualizations/three/manim/mathSceneSmokeHook.test.ts`: passed.
- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/*.test.ts`: passed.
- `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/*.test.ts`: passed.
- `npm run type-check`: passed at A06 handoff time.
- `git diff --check` on the A06 file list: passed.

Current A10/A25 root check:

- Command: `npm run type-check -- --pretty false`
- Result: passed.
- Focused A06 command: `./node_modules/.bin/tsx --test --test-reporter=dot components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts components/visualizations/three/manim/mathAlwaysRedraw.test.ts components/visualizations/three/manim/mathMobjectLayout.test.ts components/visualizations/three/manim/mathEvidenceHarness.test.ts`
- Focused A06 result: passed with exit 0.

A06 type-check closure direct priority files:

| Path | Owner | Slice |
| --- | --- | --- |
| `components/visualizations/three/manim/mathAlwaysMethodUpdater.test.ts` | A06 | tests/regression evidence |
| `components/visualizations/three/manim/mathAlwaysRedraw.test.ts` | A06 | tests/regression evidence |
| `components/visualizations/three/manim/mathAlwaysMethodUpdater.ts` | A06 | runtime app/API/data/public |
| `components/visualizations/three/manim/mathAlwaysRedraw.ts` | A06 | runtime app/API/data/public |
| `components/visualizations/three/manim/mathUpdaterRegistry.ts` | A06 | runtime app/API/data/public |

Recommended next action:

1. A06 should review `coordination/release-intake/2026-06-26-A25-a06-type-fix-slice-manifest.md` and decide whether the 149-path dependency closure is acceptable as one Manim v2 feature/type-check package.
2. If the closure is too large, A06 should extract a smaller type-fix patch in an isolated worktree and rerun `npm run type-check -- --pretty false`.
3. A22 should still avoid dirty-root release and use a clean/pruned package for any release gate.

## Remaining Dirty Root Slices

After the two priority packages, A10/A25 recommend these review queues:

1. A22/A10 release hygiene tooling/config:
   - `.vercelignore`, `playwright.config.ts`, `next.config.ts`, `package.json`, `package-lock.json`, `tsconfig.next.json`, and release scripts under `scripts/`.
   - Must be reviewed separately from runtime fixes.
2. A11 regression evidence:
   - Keep Playwright specs and source-regression tests grouped by owning feature surface, not as one global test dump.
3. A18/A21/A23 content/RAG backlog:
   - Keep candidate/generated content out of live app surfaces until A18 QA, A23 promotion planning, A11 regression evidence, and A22 release readiness are complete.
4. A10 coordination docs:
   - President reports, release-intake maps, and session logs can be committed as documentation evidence after runtime slices are closed or explicitly linked.
5. Local/generated quarantine:
   - Use A22 cleanup flow only: `node scripts/cleanup-generated-artifacts.mjs --dry-run` before any `--apply`; do not use broad destructive cleanup.

The broad queue pathspecs are now generated in `coordination/release-intake/2026-06-26-A25-dirty-root-slice-buckets-manifest.md`; they are triage queues, not ready commits.

## Stop Conditions

- No direct root production deploy while the root remains dirty, except with explicit owner-approved dirty-root/pruned-staging wording for a named scope.
- No broad commit/stage from root.
- No release package may include raw local/private corpus, real secret files, local generated outputs, or unrelated public asset backlogs.
- Root release gate remains blocked until the A06 type-check drift is resolved or excluded by a clean/pruned release slice that proves it is unrelated.
