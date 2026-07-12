# 2026-06-26 A22/A25 Post-Production Bug/UI Release Closure

- Date: 2026-06-26 19:55 HKT
- Agents: A22 production reliability and release engineering; A25 git hygiene and release intake; A10 tooling/docs/report; A11 QA and release quality; A19 API configuration readiness
- Objective: Implement the release-control recommendations from session `019f03a1-fc12-73f3-8471-1eb943d7adf2` without deploying from dirty root.
- Status: Release candidate prepared and verified from a clean/pruned runtime package. No staging, commit, branch, push, destructive cleanup, or production deploy was performed.

## Frozen Release Intent

Release scope is frozen as:

> Ship only the post-production bug/UI fixes selected in the A22 bug/UI overlay; do not ship the current dirty-root runtime behavior.

This release candidate is not a full dirty-root release and excludes broad coordination evidence, content/RAG backlog, generated assets, `.env*`, local temp outputs, and test-report directories.

## A25 Dirty-Tree Intake

- Initial refresh for new candidate:
  - Command: `npm run release:dirty-map -- --reason "new release candidate"`
  - Report: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T114443Z.md`
  - Expanded entries: `1656`
- Final refresh after source-control closure artifacts:
  - Command: `npm run release:dirty-map -- --reason "post-production bug-ui source-control closure"`
  - Report: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T115331Z.md`
  - Expanded entries: `1661`
- Direct dirty-root deploy remains blocked.

## Candidate Slicing

- Runtime deploy pathspec: `coordination/release-intake/2026-06-26-A22-post-production-bug-ui-runtime.pathspec`
  - Runtime paths: `15`
- Regression evidence pathspec: `coordination/release-intake/2026-06-26-A11-post-production-bug-ui-regression-evidence.pathspec`
  - Evidence paths: `6`
- Prior combined overlay retained for traceability:
  - `coordination/release-intake/2026-06-26-A22-post-production-bug-ui-overlay.pathspec`

## A22 Runtime Package

- Source baseline: `.tmp/vercel-staging/a22-post-production-bug-ui-20260626-1945`
- Runtime-only deploy package:
  - `.tmp/vercel-staging/a22-post-production-bug-ui-runtime-20260626-1950`
  - Size: about `162 MB`
  - File count: `2030` including `vercel-runtime-staging-manifest.json`
  - Removed regression/test files from deploy source: `272`
- Forbidden scan result: `0` matches for `.env*`, `All API Keys.docx`, `default accounts.md`, `.git`, `.local`, `coordination`, `node_modules`, `.next`, `tests`, `*.test.*`, or `*.spec.*`.

## Verification

- Verification copy:
  - `/var/folders/zr/vf0vw1p93rd19t00wbxpmnnh0000gn/T/mais-a22-bug-ui-runtime-verify-n4i7S5`
- `npm ci`: passed; npm audit still reports `1 moderate` and `1 high`.
- `NEXT_DIST_DIR=.tmp/a22-bug-ui-runtime-build NEXT_TELEMETRY_DISABLED=1 npm run build`: passed; generated `223` static pages.
- A11 focused source tests:
  - Command: `./node_modules/.bin/tsx --test --test-reporter=dot app/practice/practiceArenaPageRegressions.test.ts components/dashboard/studentProfileAvatarUpload.test.ts components/dashboard/studentRewardsPanelLayout.test.ts components/visualizations/visualizationLabPageRegressions.test.ts lib/server/userStoreTeacherOpsClassPersistence.test.ts`
  - Result: passed, `32` dot-reported assertions.
- A11 local HTTP smoke from built runtime candidate:
  - `/`: `200`
  - `/login`: `200`
  - `/dashboard`: `307` to `/login?next=%2Fdashboard`
  - `/practice`: `200`
  - `/lesson`: `308` to `/student/lessons`
  - `/student/lessons`: `307` to `/login?next=%2Fstudent%2Flessons`
  - `/student/tools/visualizations?grade=P1&track=US`: `200`
  - `/api/questions?grade=P1`: `200`
  - `/api/lesson-entry?grade=P1`: `401`
  - `/api/me`: `401`

## A19 Environment Parity

- Command: `npm run release:env-preflight -- --json`
- Vercel CLI: `54.9.0`
- Scope: `peter-dongpin-hu-s-projects`
- Target: `production`
- Required variable names present: `7/7`
- Missing variables: none
- Secret values were not printed, copied, stored, summarized, or logged.

## Publish Guard

- Command: `npm run release:publish-preflight -- --json`
- Result: failed protectively because the root worktree is dirty.
- Guard output counts:
  - Status entries: `965`
  - Tracked modified: `366`
  - Tracked deleted: `0`
  - Untracked status entries: `599`
  - Untracked files: `1295`
- Release must use the runtime staging package or another clean/pruned reviewed slice, not repository root.

## Source-Control Closure

Git staging/commit/branch/push were not performed because the owner did not explicitly approve those Git operations.

Prepared reviewable patch/overlay bundle:

- Bundle directory: `.tmp/release-bundles/a22-post-production-bug-ui-runtime-20260626-1950`
- Tracked patch: `.tmp/release-bundles/a22-post-production-bug-ui-runtime-20260626-1950/tracked-runtime.patch`
  - SHA-256: `343763b338d90b1835a027c1abc41e91001f221e0feeb8868d366c3c9c420bdd`
- Runtime overlay tarball: `.tmp/release-bundles/a22-post-production-bug-ui-runtime-20260626-1950/runtime-overlay-files.tar.gz`
  - SHA-256: `abaa33d44d8e4dd1e2bb48c6dc587ee3caeeb950b5ac352dfa7b7d2da36e446e`
- Manifest: `.tmp/release-bundles/a22-post-production-bug-ui-runtime-20260626-1950/manifest.json`
- Runtime source status in bundle: `8` tracked paths, `7` untracked paths.

## Rollback Evidence

Current production deployment before any new publish:

- Deployment id: `dpl_3vKBNELKAQA8K4CvVrk6GXPjd4Bs`
- Deployment URL: `https://mais-ca1joi9ae-peter-dongpin-hu-s-projects.vercel.app`
- Created: 2026-06-26 17:00:06 HKT
- Target: `production`
- Status: Ready
- Aliases include:
  - `https://mais.hk`
  - `https://www.mais.hk`
  - `https://mais.ac`
  - `https://www.mais.ac`

Rollback syntax confirmed from local Vercel CLI help:

```bash
vercel rollback dpl_3vKBNELKAQA8K4CvVrk6GXPjd4Bs --scope peter-dongpin-hu-s-projects
```

## Generated Artifact Hygiene

- Command: `node scripts/cleanup-generated-artifacts.mjs --dry-run`
- Result: passed dry run; no files were removed.
- Reported cleanup targets: `.next`, `.next-codex-run-3081`, `.tmp`
- Reclaimable estimate: `40.7 GB`

## Owner Decision Needed

Production publish remains blocked until the owner explicitly approves deploying the reviewed runtime package. Suggested approval wording:

> approve A22 production deploy of `.tmp/vercel-staging/a22-post-production-bug-ui-runtime-20260626-1950` to `www.mais.hk` and `www.mais.ac`

Recommended deploy command after approval:

```bash
vercel deploy .tmp/vercel-staging/a22-post-production-bug-ui-runtime-20260626-1950 -y --prod --scope peter-dongpin-hu-s-projects --project mais-mvp --no-wait
```

## Residual Risks

- Root remains heavily dirty and uncommitted.
- The candidate is a production-baseline-plus-overlay package, not a clean Git commit.
- npm audit still reports `1 moderate` and `1 high`.
- Source-control closure is a prepared patch/overlay bundle, pending owner approval for commit/PR or deployment.
