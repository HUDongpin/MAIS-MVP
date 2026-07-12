# 2026-06-29 A25/A22 Root-Parity Release Slice Enterprise Solution

Generated: 2026-06-29 18:14 HKT
Responsible agents: A25 git hygiene and release intake; A22 production reliability and release engineering; A10 tooling/docs coordination; A11 regression quality as downstream gate.

## Executive Decision

Do not stage, commit, merge, push, preview deploy, or production deploy this dirty root as one release slice. Treat `/Users/dongpinhu/Desktop/MAIS-MVP` on `main` as the authoritative inventory only, then promote reviewable packages through clean worktrees or a clean clone.

The immediate release-control goal is not "make the root clean in place." The goal is to convert the root-parity slice into a controlled release train with small owner-scoped packages, each with its own evidence, rollback boundary, and explicit acceptance gate.

## Verified Baseline

- Branch: `main`
- Head: `cef544e09bee8118ddcf3bf3005e570bdf4977e3`
- A25 dirty-map report: `coordination/release-intake/2026-06-29-A25-dirty-tree-map-20260629T101226Z.md`
- Collapsed status entries: 1199
- Expanded status entries: 2027
- Tracked modified: 384
- Tracked deleted: 1
- Untracked status entries: 814
- Untracked files: 1642
- Tracked diff observed by `git diff --stat`: 385 files, 88907 insertions, 32122 deletions
- No staging, commit, branch, push, reset, delete, revert, cleanup, preview deploy, or production deploy was performed.

## Risk Model

| Risk | Severity | Owner | Control |
| --- | --- | --- | --- |
| Dirty-root deploy could publish unrelated or unreviewed changes | P0 | A22 | Production and preview deploys are blocked from root. Only clean worktree, clean clone, reviewed release slice, or pruned staging may deploy. |
| One giant review hides regressions and ownership conflicts | P0 | A25/A10 | Split into owner-scoped packages with path manifests and acceptance gates. |
| Shared schema/storage/API changes can break unrelated surfaces | P0 | A08/A12/A10/A22 | Promote shared contract package before feature surfaces; require type-check and backend tests. |
| A06 visualization changes dominate diff size and need specialized QA | P1 | A06/A11/A22 | Isolate visualization runtime and assets from app shell/API/content packages. |
| Content/RAG/generated artifacts may contain unapproved or oversized material | P1 | A18/A21/A23/A24 | Keep candidate-to-live gates; do not promote raw/generated content directly. |
| npm audit still reports 1 high and 1 moderate vulnerability | P1 | A22/A10 | Separate dependency-security package; remove high finding first; track moderate PostCSS finding as exception or canary decision. |
| Untracked evidence files could bloat PRs and Vercel payloads | P1 | A25/A22 | Quarantine docs/evidence/generated outputs; run cleanup dry-run before any apply action. |

## Release Train Packages

### P0 - Freeze And Inventory Gate

Owner: A25, with A10 visibility.

Scope:
- `coordination/release-intake/`
- release-intake reports under `coordination/reports/`

Actions:
- Refresh `npm run release:dirty-map -- --reason "<release package reason>"`.
- Record status signature, counts, owner buckets, and unmapped paths.
- Lock the rule that root remains inventory-only.

Acceptance:
- Dirty-map report exists and names A25/A22/A10.
- No root staging or deploy happened.
- Every package below has a proposed owner and pathspec.

### P1 - Release Hygiene And Dependency Security

Owner: A22, coordinated with A10.

Scope:
- `.vercelignore`
- `playwright.config.ts`
- `next.config.ts`
- `package.json`
- `package-lock.json`
- `tsconfig.next.json`
- `scripts/cleanup-generated-artifacts.mjs`
- `scripts/release-env-guard.mjs`
- `scripts/release-build-gate.mjs`
- Vercel deploy helper scripts and their tests

Actions:
- Create a clean worktree from `main`.
- Copy only P1 files from the dirty root.
- Run `npm ci`.
- Apply conservative dependency remediation: bump Next from the current locked `15.5.15` line to `15.5.19` first.
- Run `npm audit --audit-level=high`.
- If full `npm audit` still reports only nested `postcss` moderate via Next, open an explicit security exception with mitigation and monitoring.
- Do not move to `next@canary` unless the owner explicitly accepts canary framework risk.

Acceptance:
- `npm ci` succeeds.
- High audit finding is gone or the package is blocked.
- Full audit result is recorded, including whether the remaining moderate PostCSS finding persists.
- `npm run release:preflight` and `npm run release:build-gate` pass or produce a named blocker.

### P2 - Shared Contracts And Backend Storage

Owner: A08/A12, coordinated with A10 and A22.

Scope:
- `types/index.ts`
- `lib/server/userStore.ts`
- `lib/server/userStore/`
- `lib/server/*Store*.test.ts`
- `lib/difficulty.ts`
- `lib/difficulty.test.ts`
- app-wide API contract helpers

Actions:
- Promote shared type/storage changes before feature UI packages.
- Split `userStore` changes by domain if needed: auth/session, teacher ops, parent access, learning events, gamification, AI governance.
- Require tests around persistence and domain boundaries before UI packages consume these contracts.

Acceptance:
- `npm run type-check` passes in the clean worktree.
- Backend/domain tests for touched modules pass.
- A22 can build against the package without feature-surface patches.

### P3 - Core Student Runtime Package

Owner: A01/A02/A04/A05/A15, with A11 routing.

Scope:
- Home/app shell/auth entry where owned by A01.
- Dashboard/adaptive display where owned by A02/A15.
- Practice Arena and question runtime where owned by A04.
- Lesson entry and lesson runtime where owned by A05.

Actions:
- Split into student-path subpackages instead of one app package.
- Each package must depend only on already accepted P1/P2 contracts.
- Keep route fixes and UI copy together only when they are necessary for a single user journey.

Acceptance:
- Focused unit tests for touched modules.
- A11 student smoke package passes for the affected journey.
- No teacher/parent/content/RAG expansion sneaks into this package.

### P4 - Teacher, Parent, And Forum Runtime

Owner: A13/A14/A12, with A11 QA.

Scope:
- `app/teacher/`
- `components/teacher/`
- `app/parent/`
- `components/parent/`
- `app/forum/`
- `components/forum/`
- `data/forum.ts`
- `lib/forum.ts`
- forum public assets

Actions:
- Separate teacher ops, parent notices/messages, and forum into independent packages.
- Keep backend API contract changes in P2 or a tightly scoped A12 package.

Acceptance:
- Teacher/parent/forum E2E tests pass for touched surfaces.
- Backend tests pass for touched API routes.

### P5 - Visualization Lab And 3D/Manim Runtime

Owner: A06, with A11/A22 release evidence.

Scope:
- `app/visualization-lab/`
- `app/student/tools/visualizations/`
- `components/visualizations/`
- `data/visualizationLabs.ts`
- visualization tests

Actions:
- Split into subpackages: lab catalog/data, configured lab runtime, 3D canvas contract, Manim/math scene runtime, assets.
- Do not combine with lesson/practice/content packages.
- Use Playwright screenshots or pixel checks for visible 3D/canvas surfaces before release readiness.

Acceptance:
- Visualization unit/contract tests pass.
- A11 visualization smoke passes.
- A22 build succeeds from a clean worktree.

### P6 - Content, RAG, Generated Assets, And Candidate Promotion

Owner: A18/A21/A23/A24.

Scope:
- `coordination/content-qa/`
- `data/generated-content/`
- `data/rag/`
- `lib/rag/`
- `public/question-illustrations/`
- curriculum data files only with explicit owning-agent promotion

Actions:
- Keep candidate packages out of live runtime until A18 QA, A23 promotion plan, owning live-surface implementation, A11 regression, and A22 release readiness all exist.
- Separate content evidence from runtime data promotion.
- Do not commit raw private/copyrighted corpus text.

Acceptance:
- QA decision exists for each promoted candidate.
- Live data edits are explicitly assigned to the owning runtime agent.
- RAG/content tests pass for promoted packages.

### P7 - Regression Harness And Evidence

Owner: A11, with A22 harness coordination.

Scope:
- `tests/e2e/`
- non-feature test helpers
- QA reports under `coordination/reports/`

Actions:
- Split red gates by owner route rather than one broad suite.
- Stabilize helpers separately from product assertions.
- Attach each E2E package to its owning runtime package.

Acceptance:
- Each package has a named smoke/regression command.
- Failures are routed to the owning agent, not treated as generic QA debt.

### P8 - Docs, Coordination Evidence, And Local Quarantine

Owner: A25/A10, with A22 cleanup review.

Scope:
- `coordination/`
- `docs/`
- `video-plan/`
- generated reports and screenshots

Actions:
- Separate durable coordination reports from generated evidence.
- Run `node scripts/cleanup-generated-artifacts.mjs --dry-run` before any apply cleanup.
- Preserve evidence explicitly needed by A11/A22 release reports; quarantine everything else.

Acceptance:
- No generated or local-only artifact is bundled into runtime packages.
- A22 confirms Vercel payload hygiene before deploy.

## Clean Worktree Promotion Procedure

For each package:

1. A25 refreshes the dirty map and exports a path list for the package.
2. Create a clean worktree from `main` with a branch such as `codex/A22-release-hygiene` or `codex/A06-visualization-runtime`.
3. Copy only the package path list from root inventory into the clean worktree, preserving paths.
4. Run `git status --short` in the clean worktree and verify only the package files changed.
5. Run package-specific checks.
6. Commit only the package slice from the clean worktree.
7. A22 builds and deploys only from a clean worktree, clean clone, reviewed clean release slice, or pruned staging directory.

Root remains read-only inventory throughout this process.

## Dependency Security Decision

Current audit source:
- Direct package: `next`
- Nested package: `next/node_modules/postcss`
- Current lock observed: `next 15.5.15`, nested `postcss 8.4.31`
- `npm audit --json` reports 1 high and 1 moderate vulnerability bucket.
- `npm audit fix --dry-run --json` proposes `next 15.5.19`, but still reports the nested PostCSS moderate bucket.
- `next@15.5.19` is the conservative stable-line candidate.
- `next@16.3.0-canary.70` currently bundles `postcss 8.5.10`, but canary framework adoption is not recommended for production without explicit owner acceptance.

Enterprise policy:
- P1 must remove high/critical audit findings before release.
- A remaining moderate finding may proceed only with a dated A22/A10 security exception, exploitability notes, owner acceptance, and a watch to upgrade when a stable Next release bundles patched PostCSS.
- Canary Next is an emergency path only, not the default fix.

## Stop Conditions

- Any package requires staging from the dirty root.
- Any package requires deploying from the dirty root.
- `npm audit --audit-level=high` remains red after the P1 package.
- P2 shared contracts fail type-check.
- A06 visualization package cannot render nonblank canvas/3D surfaces in smoke checks.
- A18/A23 gates are missing for live content promotion.
- A22 cleanup dry-run identifies evidence needed by A11/A22 that would be deleted by apply cleanup.

## Recommended Next Command Sequence

Run from the root inventory only:

```bash
npm run release:dirty-map -- --reason "pre-slicing A25 inventory refresh"
```

Then start P1 in a clean worktree and keep root unchanged:

```bash
git worktree add ../MAIS-MVP-a22-release-hygiene -b codex/A22-release-hygiene main
```

After copying only P1 files into that worktree, verify:

```bash
git status --short
npm ci
npm audit --audit-level=high
npm run type-check
npm run release:preflight
```

Do not run preview or production deploy until the P1/P2 gates are green and the target runtime package has A11/A22 evidence.
