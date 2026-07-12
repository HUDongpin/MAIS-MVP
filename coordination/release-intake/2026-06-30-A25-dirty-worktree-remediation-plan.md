# Dirty Worktree Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every dirty MAIS-MVP root and linked worktree entry into a reviewed commit, owner-approved discard, evidence archive, or blocker so `main` and all retained worktrees are clean and release-safe.

**Architecture:** Treat `/Users/dongpinhu/Desktop/MAIS-MVP` on `main` as read-only inventory until closure. A25 owns inventory and lifecycle gates, A10 owns coordination/report packaging, A22 owns clean release-source verification, and feature/content owners decide correctness for their own pathspecs. Cleanup happens through owner-scoped packages in clean worktrees or owner-approved discard/archive actions, never through a broad root reset.

**Tech Stack:** Git worktrees, `npm` scripts, Next.js/TypeScript checks, MAIS-MVP `coordination/release-intake` governance scripts, A01-A25 ownership contract.

---

## Current Evidence Baseline

This baseline was captured before this plan and session-log artifact were added.

- Repository: `/Users/dongpinhu/Desktop/MAIS-MVP`
- Branch: `main`
- HEAD: `cef544e09`
- Dirty map: `coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T064000Z.md`
- Status signature: `0f8d9e71d0fcf29fd133bd238be6ba0683ba43e0a802b663a49647d59af1d0c1`
- Collapsed status entries: `1207`
- Expanded status entries: `2045`
- Tracked modified: `385`
- Tracked deleted: `1`
- Untracked status entries: `821`
- Untracked files: `1659`
- Largest owner buckets: A25 `613`, A06 `433`, A10 `209`, A12 `166`, A18/A21 `136`, unmapped runtime `113`
- Slice buckets: docs/coordination evidence `987`, runtime app/API/data/public `589`, tests/regression evidence `371`, generated/content/RAG backlog `65`, release hygiene tooling/config `17`, unmapped/manual `15`, secret/env quarantine `1`
- Worktree lifecycle: `19` worktrees, `12` dirty open decisions, `5` clean-diverged open decisions, `0` prunable entries
- Passing gates: dirty-map current, secret/env quarantine, disposition evidence current, normal worktree lifecycle inventory
- Failing gates: owner pathspecs current, unmapped runtime proposals current, effective owner overlay current, unmapped manual proposals current, release-source clean, strict worktree lifecycle, lifecycle decision requests current, owner approval matrix current, lifecycle closure runbook current

## Completion Definition

The dirty-worktree issue is completely fixed only when all of these are true in the current state:

- `git status --short` in `/Users/dongpinhu/Desktop/MAIS-MVP` returns no entries except owner-approved local-only ignored files.
- `npm run release:dirty-map -- --assert-current --max-age-minutes 60` passes and reports `0` expanded dirty entries for the retained release source.
- `node coordination/release-intake/assert-release-source-clean.mjs` passes in the release source.
- `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict` passes.
- `node coordination/release-intake/assert-owner-pathspecs-current.mjs` passes or reports no dirty owner pathspecs because there are no dirty entries.
- `node coordination/release-intake/assert-effective-owner-overlay-current.mjs` passes.
- `node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs` passes with no unmapped runtime entries.
- `node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs` passes with no unmapped manual entries.
- `node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs` passes.
- `node coordination/release-intake/assert-owner-approval-matrix-current.mjs` passes.
- `node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs` passes.
- Every retained dirty package has one final state recorded: reviewed commit, owner-approved discard, evidence archive, or blocker.
- No preview or production deploy has used the dirty root.

## Files And Responsibilities

- `coordination/release-intake/latest-A25-dirty-tree-map.*`: A25 current inventory and status signature.
- `coordination/release-intake/latest-A25-owner-*.pathspec`: A25 pathspecs used by owning agents for focused review.
- `coordination/release-intake/latest-A25-owner-disposition-queue.*`: A25 queue of owner packages and final states.
- `coordination/release-intake/latest-A25-worktree-hygiene-dashboard.*`: A25 lifecycle ledger for root and linked worktrees.
- `coordination/release-intake/latest-A25-lifecycle-*.{json,md}`: A25 lifecycle decisions, closure runbook, and owner approvals.
- `coordination/reports/`: A10/A22/A11 evidence reports for release readiness and regression evidence.
- `coordination/session-logs/YYYY-MM-DD-Axx.md`: owning-session handoff records.
- Runtime files under `app/`, `components/`, `data/`, `lib/`, `public/`, `types/`: feature/content owners only.
- Config and release files such as `.vercelignore`, `next.config.ts`, `package.json`, `playwright.config.ts`, `scripts/release-*`, `scripts/deploy-*`: A10/A22 only.

## Task 1: Freeze Root And Refresh A25 Governance Artifacts

**Files:**
- Modify: `coordination/release-intake/latest-A25-dirty-tree-map.json`
- Modify: `coordination/release-intake/latest-A25-dirty-tree-map.md`
- Modify: `coordination/release-intake/latest-A25-owner-*.pathspec`
- Modify: `coordination/release-intake/latest-A25-worktree-hygiene-dashboard.*`
- Modify: `coordination/release-intake/latest-A25-owner-disposition-queue.*`
- Modify: `coordination/release-intake/latest-A25-lifecycle-*.{json,md}`

- [ ] **Step 1: Announce freeze**

  Record in `coordination/session-logs/YYYY-MM-DD-A25.md`:

  ```markdown
  ## Dirty-Worktree Closure Freeze

  - Agent ID: A25
  - Scope: Non-destructive dirty-tree and linked-worktree closure
  - Rule: Root `main` is inventory-only. No feature edits, staging, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy from root until closure gates pass.
  - Release source: clean worktree, clean clone, reviewed clean release slice, or owner-approved pruned staging only.
  ```

- [ ] **Step 2: Refresh dirty map**

  Run:

  ```bash
  npm run release:dirty-map -- --reason "A25 dirty-worktree closure baseline"
  npm run release:dirty-map -- --assert-current --max-age-minutes 60
  ```

  Expected: both commands exit `0`; the output names the latest A25 dirty map and expanded status count.

- [ ] **Step 3: Regenerate lifecycle dashboard and owner queue**

  Run:

  ```bash
  node coordination/release-intake/worktree-hygiene-dashboard.mjs
  node coordination/release-intake/generate-owner-disposition-queue.mjs
  node coordination/release-intake/generate-lifecycle-decision-requests.mjs
  node coordination/release-intake/generate-lifecycle-decision-ledger.mjs
  node coordination/release-intake/generate-lifecycle-closure-runbook.mjs
  node coordination/release-intake/generate-owner-approval-matrix.mjs
  ```

  Expected: each command exits `0` and refreshes `latest-A25-*` artifacts against the current dirty-map signature.

- [ ] **Step 4: Refresh unmapped proposals and effective overlay**

  Run:

  ```bash
  node coordination/release-intake/propose-unmapped-runtime-owners.mjs
  node coordination/release-intake/propose-unmapped-manual-owners.mjs
  node coordination/release-intake/generate-effective-owner-overlay.mjs
  node coordination/release-intake/generate-effective-disposition-queue.mjs
  ```

  Expected: commands exit `0`; every unmapped runtime/manual path has a proposed owner, or the output names the exact path that still needs manual owner decision.

- [ ] **Step 5: Verify governance currentness**

  Run:

  ```bash
  node coordination/release-intake/assert-owner-pathspecs-current.mjs
  node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs
  node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs
  node coordination/release-intake/assert-effective-owner-overlay-current.mjs
  node coordination/release-intake/assert-effective-disposition-queue-current.mjs
  node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs
  node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs
  node coordination/release-intake/assert-owner-approval-matrix-current.mjs
  node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs
  node coordination/release-intake/assert-secret-env-quarantine.mjs
  node coordination/release-intake/assert-disposition-evidence-current.mjs
  ```

  Expected: all commands exit `0`. If a command fails, stop closure packaging and fix only the stale A25/A10 governance artifact named by the output.

## Task 2: Resolve P0 Unmapped Ownership

**Files:**
- Modify: `coordination/release-intake/latest-A25-unmapped-runtime-owner-proposals.*`
- Modify: `coordination/release-intake/latest-A25-unmapped-manual-owner-proposals.*`
- Modify: `coordination/release-intake/latest-A25-effective-owner-overlay.*`
- Modify: `coordination/release-intake/latest-A25-owner-disposition-queue.*`

- [ ] **Step 1: Review current unmapped runtime paths**

  Run:

  ```bash
  node - <<'NODE'
  const fs = require('fs');
  const map = JSON.parse(fs.readFileSync('coordination/release-intake/latest-A25-dirty-tree-map.json', 'utf8'));
  for (const entry of map.entries.filter((item) => item.owner.includes('Unmapped runtime'))) {
    console.log(`${entry.status.trim() || 'M'} ${entry.path}`);
  }
  NODE
  ```

  Expected: output lists only paths that do not yet have a reliable A01-A25 owner.

- [ ] **Step 2: Assign owners with the existing contract**

  Apply these owner rules first:

  ```text
  app/student/lessons/* -> A05 lesson lead
  app/student/assessments/* -> A13 teacher console plus A12 API if route contracts are touched
  app/student/assignments/* -> A13 teacher console plus A12 API if route contracts are touched
  app/student/roadmap/* -> A03 curriculum roadmap lead
  app/forum/*, components/forum/*, data/forum.ts, lib/forum.ts -> A12 backend/API platform plus A13/A14 consumer review if teacher/parent surfaces consume it
  components/providers/AppProviders.tsx -> A08 state and analytics lead
  components/math/* -> A09 copy/accessibility if formatting only, otherwise A08 shared utilities
  data/grades.ts, data/topics.ts, data/*Topics.ts, data/*Roadmap.ts -> A03 curriculum roadmap lead
  data/questions.ts, data/*Questions.ts -> A04 practice lead with A18 QA signoff
  data/*Lessons.ts, data/*LessonIllustrations.ts -> A05 lesson lead with A18/A24 review
  lib/gameBasedLearning.ts, data/gameBasedLearning.ts, public/games/* -> A20 game design and game-based learning
  lib/questionBankSolvability.ts and question-bank tests -> A18 curriculum QA plus A04 practice owner
  public/lesson-illustrations/* -> A24 exact-layer if deterministic overlay, otherwise A21 asset production plus A18 QA
  ```

  Expected: every formerly unmapped runtime path is assigned to one owning package and one verifier.

- [ ] **Step 3: Review current unmapped manual paths**

  Run:

  ```bash
  node - <<'NODE'
  const fs = require('fs');
  const map = JSON.parse(fs.readFileSync('coordination/release-intake/latest-A25-dirty-tree-map.json', 'utf8'));
  for (const entry of map.entries.filter((item) => item.owner.includes('Unmapped/manual'))) {
    console.log(`${entry.status.trim() || 'M'} ${entry.path}`);
  }
  NODE
  ```

  Expected: output is limited to coordination, script, TypeScript config, or manually classified evidence files.

- [ ] **Step 4: Assign manual paths**

  Apply these owner rules:

  ```text
  next-env.d.ts -> A10 tooling/docs; usually owner-approved discard if generated by Next and unchanged from expected output
  coordination/integration/* -> A23 integration and promotion lead
  design-qa.md -> A10 tooling/docs unless it documents a feature-specific QA decision
  scripts/ai-tutor-live-latency-smoke.mjs -> A07 AI tutor lead plus A22 release smoke evidence
  scripts/dashboard-*.mjs and dashboard smoke tests -> A02 dashboard lead plus A22 release smoke evidence
  scripts/next-clean-build.mjs and test -> A22 release engineering
  scripts/refresh-dirty-tree-map.mjs -> A25 git hygiene and release intake
  scripts/resend-local-smoke.mjs -> A19 API environment if provider config, otherwise A22 release smoke
  scripts/run-analytics-tests.mjs and tsconfig.analytics.json -> A08 state and analytics lead
  ```

  Expected: no manual path remains without a named A01-A25 owner.

- [ ] **Step 5: Regenerate and verify overlay**

  Run:

  ```bash
  node coordination/release-intake/generate-effective-owner-overlay.mjs
  node coordination/release-intake/generate-effective-disposition-queue.mjs
  node coordination/release-intake/assert-effective-owner-overlay-current.mjs
  node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs
  node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs
  ```

  Expected: all commands exit `0`.

## Task 3: Close A25/A10/A22 Governance And Release-Hygiene Packages First

**Files:**
- Modify: `coordination/release-intake/`
- Modify: `coordination/reports/`
- Modify: `coordination/session-logs/`
- Modify: `.vercelignore`
- Modify: `next.config.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `playwright.config.ts`
- Modify: `scripts/cleanup-generated-artifacts.mjs`
- Modify: `scripts/cleanup-generated-artifacts.test.mjs`
- Modify: `scripts/deploy-vercel-preview.mjs`
- Modify: `scripts/deploy-vercel-preview.test.mjs`
- Modify: `scripts/deploy-vercel-production.mjs`
- Modify: `scripts/deploy-vercel-production.test.mjs`
- Modify: `scripts/prepare-vercel-staging.mjs`
- Modify: `scripts/release-build-gate.mjs`
- Modify: `scripts/release-build-gate.test.mjs`
- Modify: `scripts/release-env-guard.mjs`
- Modify: `scripts/release-env-guard.test.mjs`
- Modify: `tsconfig.next.json`

- [ ] **Step 1: Create clean A25/A10/A22 packaging worktree**

  Run from root:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance -b codex/A25-dirty-closure-governance main
  ```

  Expected: a new clean worktree is created at the path above.

- [ ] **Step 2: Copy only governance and release-hygiene pathspecs**

  Run:

  ```bash
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance/
  ```

  Expected: only A25/A10/A22 governance and release-hygiene files become dirty in the clean worktree.

- [ ] **Step 3: Verify governance package**

  Run in the clean worktree:

  ```bash
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance
  npm ci
  npm run release:dirty-map -- --reason "A25 governance package verification"
  node coordination/release-intake/assert-secret-env-quarantine.mjs
  node --test scripts/cleanup-generated-artifacts.test.mjs scripts/deploy-vercel-preview.test.mjs scripts/deploy-vercel-production.test.mjs scripts/release-build-gate.test.mjs scripts/release-env-guard.test.mjs
  npm run type-check
  npm run build
  ```

  Expected: all commands exit `0`. If `npm audit` remediation is part of this package, also run `npm audit --audit-level=high` and record the result.

- [ ] **Step 4: Commit reviewed governance package**

  Run only after review:

  ```bash
  git status --short
  git add --pathspec-from-file=/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec
  git add --pathspec-from-file=/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec
  git add --pathspec-from-file=/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec
  git diff --cached --stat
  git commit -m "chore: add dirty worktree closure governance"
  ```

  Expected: commit contains only reviewed A25/A10/A22 files. No runtime feature files are staged.

## Task 4: Package Shared Contracts Before Runtime Features

**Files:**
- Modify: `types/index.ts`
- Modify: `components/providers/AppProviders.tsx`
- Modify: `lib/utils.ts`
- Modify: `lib/learningAnalytics.ts`
- Modify: `lib/learningAnalytics.test.ts`
- Modify: `lib/difficulty.ts`
- Modify: `lib/difficulty.test.ts`
- Modify: `lib/server/userStore.ts`
- Modify: `lib/server/userStore/`
- Modify: `lib/server/*test.ts`
- Modify: app-wide API/storage contract files owned by A08/A12

- [ ] **Step 1: Create A08/A12 clean worktree**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure -b codex/A08-A12-shared-contract-closure main
  ```

  Expected: clean worktree is created.

- [ ] **Step 2: Copy A08 and A12 pathspecs**

  Run:

  ```bash
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure/
  ```

  Expected: dirty worktree contains only A08/A12 pathspec files.

- [ ] **Step 3: Verify shared contracts**

  Run in the clean worktree:

  ```bash
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure
  npm ci
  npm run test:analytics
  npm run test:backend
  npm run type-check
  npm run build
  ```

  Expected: all commands exit `0`. If `npm run test:backend` depends on browser setup, record the browser dependency and run the narrower Node tests named in the changed A12 files.

- [ ] **Step 4: Commit shared contract package**

  Run only after A08/A12 review:

  ```bash
  git status --short
  git add --pathspec-from-file=/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec
  git add --pathspec-from-file=/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec
  git diff --cached --stat
  git commit -m "refactor: stabilize shared storage and analytics contracts"
  ```

  Expected: commit contains A08/A12 contract slice only.

## Task 5: Close Runtime Owner Packages In Dependency Order

**Files:**
- Modify: owner pathspec files generated under `coordination/release-intake/latest-A25-owner-*.pathspec`
- Modify: owner-specific runtime files copied into clean owner worktrees
- Modify: owner session logs under `coordination/session-logs/YYYY-MM-DD-Axx.md`

- [ ] **Step 1: Package A01 app shell**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure -b codex/A01-app-shell-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a01-app-shell-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; dirty files match A01 pathspec only.

- [ ] **Step 2: Package A02/A15 dashboard and adaptive UI**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure -b codex/A02-A15-dashboard-adaptive-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a02-dashboard-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a15-adaptive-engine-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure
  npm ci
  npm run test:analytics
  npm run type-check
  npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; adaptive behavior is not changed without A15 approval.

- [ ] **Step 3: Package A03 curriculum roadmap**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure -b codex/A03-roadmap-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a03-curriculum-roadmap-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/mainland-hjb-roadmaps.spec.ts tests/e2e/mainland-pep-roadmaps.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; roadmap data does not include unreviewed question-bank promotion.

- [ ] **Step 4: Package A04 practice and question runtime**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure -b codex/A04-practice-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure
  npm ci
  npm run test:question-bank
  npm run type-check
  npx playwright test tests/e2e/practice-pager.spec.ts tests/e2e/student-smoke.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; A18 approves question correctness for changed live question data.

- [ ] **Step 5: Package A05 lessons**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure -b codex/A05-lesson-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/lesson-all.spec.ts tests/e2e/mainland-pep-high-lessons.spec.ts tests/e2e/california-k5-textbook-lessons.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; A18/A24 approvals exist for changed lesson content and exact-layer assets.

- [ ] **Step 6: Package A06 visualization**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure -b codex/A06-visualization-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure
  npm ci
  npm run type-check
  node --test components/visualizations/configuredVisualizationLabRegressions.test.ts components/visualizations/three/threeDCanvasContract.test.ts components/visualizations/visualizationDiagnostics.test.ts
  npx playwright test tests/e2e/visualization-values.spec.ts tests/e2e/visualization-overlap.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; A06 does not include lesson/practice/content packages.

- [ ] **Step 7: Package A07 AI tutor**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure -b codex/A07-ai-tutor-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; no real credential values are printed, staged, or committed.

- [ ] **Step 8: Package A13/A14 teacher, parent, forum**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure -b codex/A13-A14-console-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/teacher-workspace.spec.ts tests/e2e/parent-console.spec.ts tests/e2e/class-forum.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; backend contract changes are already in A12 package or explicitly coordinated.

- [ ] **Step 9: Package A17/A20 games and motivation**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure -b codex/A17-A20-game-motivation-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/adventure-island.spec.ts tests/e2e/fishing-game.spec.ts tests/e2e/gamification.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: checks exit `0`; A20 owns game loops and A17 owns reward economy.

- [ ] **Step 10: Commit each runtime package after owner review**

  Use the exact pathspec and commit message for the reviewed package:

  | Package | Pathspec | Commit message |
  | --- | --- | --- |
  | A01 app shell | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a01-app-shell-lead.pathspec` | `feat: close A01 app shell dirty slice` |
  | A02/A15 dashboard adaptive | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a02-dashboard-lead.pathspec` and `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a15-adaptive-engine-lead.pathspec` | `feat: close dashboard adaptive dirty slice` |
  | A03 roadmap | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a03-curriculum-roadmap-lead.pathspec` | `feat: close roadmap dirty slice` |
  | A04 practice | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec` | `feat: close practice dirty slice` |
  | A05 lesson | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec` | `feat: close lesson dirty slice` |
  | A06 visualization | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec` | `feat: close visualization dirty slice` |
  | A07 AI tutor | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec` | `feat: close ai tutor dirty slice` |
  | A13/A14 consoles | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec` and `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec` | `feat: close teacher parent console dirty slice` |
  | A17/A20 games and motivation | `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec` and `/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec` | `feat: close games motivation dirty slice` |

  Example for the A06 package after A06 review:

  ```bash
  git status --short
  git add --pathspec-from-file=/Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec
  git diff --cached --stat
  git commit -m "feat: close visualization dirty slice"
  ```

  Expected: each commit contains one owner package, has passing targeted checks, and names its rollback boundary in the session log.

## Task 6: Close Content, RAG, QA, And Evidence Packages

**Files:**
- Modify: `coordination/content-qa/`
- Modify: `data/generated-content/`
- Modify: `data/rag/`
- Modify: `lib/rag/`
- Modify: `public/question-illustrations/`
- Modify: `tests/e2e/`
- Modify: `coordination/reports/`

- [ ] **Step 1: Package A18/A21/A23/A24 content evidence separately from live data**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure -b codex/A18-A21-content-evidence-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure/
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a24-illustration-exact-layer.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure
  npm ci
  npm run test:rag
  npm run test:question-bank
  npm run type-check
  git status --short
  ```

  Expected: candidate evidence is separated from live runtime promotion; no raw private corpus text is committed.

- [ ] **Step 2: Package A11 regression evidence**

  Run:

  ```bash
  git worktree add /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure -b codex/A11-regression-evidence-closure main
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  rsync -R --files-from=coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec ./ /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure/
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure
  npm ci
  npm run type-check
  npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome
  git status --short
  ```

  Expected: A11 evidence is route-owner split; failing product assertions are routed to owning agents, not committed as unresolved generic QA.

- [ ] **Step 3: Commit content and QA packages after review**

  Run:

  ```bash
  git status --short
  git diff --stat
  git commit -m "docs: archive reviewed content and regression evidence"
  ```

  Expected: commit contains only the reviewed evidence package in that worktree.

## Task 7: Apply Owner-Approved Discards And Evidence Archives To Root

**Files:**
- Modify: root working tree paths named by approved discard/archive decisions
- Modify: `coordination/release-intake/latest-A25-lifecycle-*.{json,md}`
- Modify: `coordination/session-logs/YYYY-MM-DD-A25.md`

- [ ] **Step 1: Record final state for each package**

  Append this concrete ledger shape to the A25 session log, replacing only the status value with the reviewed outcome:

  ```markdown
  ## Dirty-Worktree Closure Final-State Ledger

  - Final state: `A25-governance` -> reviewed commit
    - Evidence: commit hash recorded after `git commit -m "chore: add dirty worktree closure governance"`
    - Owner: A25/A10/A22
    - Checks: release-intake governance gates, release-helper tests, `npm run type-check`, `npm run build`
  - Final state: `A08-A12-shared-contracts` -> reviewed commit
    - Evidence: commit hash recorded after `git commit -m "refactor: stabilize shared storage and analytics contracts"`
    - Owner: A08/A12
    - Checks: `npm run test:analytics`, `npm run test:backend`, `npm run type-check`, `npm run build`
  - Final state: `A01-app-shell` -> reviewed commit
    - Evidence: commit hash recorded after `git commit -m "feat: close A01 app shell dirty slice"`
    - Owner: A01
    - Checks: `npm run type-check`, `npx playwright test tests/e2e/app-shell-auth.spec.ts tests/e2e/home-functional.spec.ts --project=desktop-chrome`
  - Final state: `A06-visualization` -> reviewed commit
    - Evidence: commit hash recorded after `git commit -m "feat: close visualization dirty slice"`
    - Owner: A06
    - Checks: `npm run type-check`, visualization Node tests, visualization Playwright tests
  ```

  Expected: every package in `latest-A25-owner-disposition-queue.md` has a final state.

- [ ] **Step 2: Archive patches for packages not committed**

  Run concrete archive commands for packages that the owner chooses not to commit. These commands write evidence only:

  ```bash
  mkdir -p coordination/release-intake/archive
  node coordination/release-intake/archive-owner-pathspec.mjs coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec --label A06-visualization
  node coordination/release-intake/archive-owner-pathspec.mjs coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec --label A11-regression-evidence
  ```

  Expected: archive summary, status, diffstat, tracked patch, and untracked path-list files exist and are recorded in the lifecycle ledger. The helper writes evidence only; it does not stage, commit, restore, clean, delete, or archive untracked file payloads.

- [ ] **Step 3: Discard only owner-approved root paths**

  Run only after the owner or owning agent explicitly approves discard for the exact package. For the currently observed generated/manual candidates, the concrete discard commands are:

  ```bash
  git restore --source=HEAD -- next-env.d.ts
  git restore --source=HEAD -- app/student/lessons/page.tsx
  git clean -fd -- coordination/reports/.~26-06-30-president-report.docx
  ```

  Expected: discarded paths disappear from `git status --short`; no path outside the approved pathspec changes.

- [ ] **Step 4: Verify no accidental path loss**

  Run:

  ```bash
  git status --short
  npm run release:dirty-map -- --reason "A25 post-disposition root closure"
  ```

  Expected: remaining dirty entries are only unresolved packages with blocker records.

## Task 8: Close Linked Worktrees

**Files:**
- Modify: `coordination/release-intake/latest-A25-worktree-hygiene-dashboard.*`
- Modify: `coordination/release-intake/latest-A25-lifecycle-closure-runbook.*`

- [ ] **Step 1: Refresh lifecycle ledger**

  Run:

  ```bash
  node coordination/release-intake/worktree-hygiene-dashboard.mjs
  node coordination/release-intake/generate-lifecycle-closure-runbook.mjs
  node coordination/release-intake/assert-worktree-lifecycle.mjs
  ```

  Expected: output lists every dirty or diverged worktree and the exact next action.

- [ ] **Step 2: For each dirty worktree, archive or commit**

  Current dirty worktree archive commands:

  ```bash
  mkdir -p /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A01-shell-lazy-load.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-manim-three-closure && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A06-manim-three-closure.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-A15-A08-ai-adaptive-types && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A07-ai-tutor-classroom-switches.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628 && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-google-oauth-login && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A12-google-oauth-login.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-userstore-storage-contract && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A12-userstore-storage-contract.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-missing-module-release-slice && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A22-missing-module-release-slice.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-next-15-5-19-audit && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A22-next-15-5-19-audit.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-p1-release-hygiene-security && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.patch
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release && git status --short && git diff --stat && git diff --binary > /Users/dongpinhu/Desktop/MAIS-MVP/coordination/release-intake/archive/codex-visualization-production-release.patch
  ```

  Expected: dirty worktree has patch evidence before any removal or discard decision.

- [ ] **Step 3: For each clean diverged branch, choose PR, archive tag, or retirement**

  Current clean-diverged branch inspection commands:

  ```bash
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-release-governance
  git log --oneline main..HEAD
  git diff --stat main...HEAD
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region
  git log --oneline main..HEAD
  git diff --stat main...HEAD
  cd /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment
  git log --oneline main..HEAD
  git diff --stat main...HEAD
  cd /Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean
  git log --oneline main..HEAD
  git diff --stat main...HEAD
  cd /Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15
  git log --oneline main..HEAD
  git diff --stat main...HEAD
  ```

  Expected: A25 records one owner-approved final state for the branch.

- [ ] **Step 4: Remove only closed worktrees**

  Run only after the lifecycle closure runbook names the worktree as closed:

  ```bash
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-manim-three-closure
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-A15-A08-ai-adaptive-types
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-release-governance
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-google-oauth-login
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-userstore-storage-contract
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-missing-module-release-slice
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-next-15-5-19-audit
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-p1-release-hygiene-security
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment
  git worktree remove /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release
  git worktree remove /Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean
  git worktree remove /Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15
  git worktree prune --dry-run
  git worktree prune
  ```

  Expected: removed worktree no longer appears in `git worktree list`; dry run shows no unexpected prunable path before prune.

- [ ] **Step 5: Verify strict lifecycle**

  Run:

  ```bash
  node coordination/release-intake/assert-worktree-lifecycle.mjs --strict
  ```

  Expected: command exits `0`.

## Task 9: Final Release-Source Verification

**Files:**
- Modify: `coordination/release-intake/latest-A25-dirty-tree-map.*`
- Modify: `coordination/reports/YYYY-MM-DD-A22-clean-source-verification.md`
- Modify: `coordination/session-logs/YYYY-MM-DD-A25.md`

- [ ] **Step 1: Verify root is clean**

  Run:

  ```bash
  cd /Users/dongpinhu/Desktop/MAIS-MVP
  git status --short
  ```

  Expected: no output.

- [ ] **Step 2: Verify A25 dirty map and release source**

  Run:

  ```bash
  npm run release:dirty-map -- --reason "A25 final dirty-worktree closure verification"
  npm run release:dirty-map -- --assert-current --max-age-minutes 60
  node coordination/release-intake/assert-release-source-clean.mjs
  ```

  Expected: all commands exit `0`; release-source clean gate passes.

- [ ] **Step 3: Verify lifecycle and governance gates**

  Run:

  ```bash
  node coordination/release-intake/assert-owner-pathspecs-current.mjs
  node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs
  node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs
  node coordination/release-intake/assert-effective-owner-overlay-current.mjs
  node coordination/release-intake/assert-effective-disposition-queue-current.mjs
  node coordination/release-intake/assert-lifecycle-decision-requests-current.mjs
  node coordination/release-intake/assert-lifecycle-decision-ledger-current.mjs
  node coordination/release-intake/assert-owner-approval-matrix-current.mjs
  node coordination/release-intake/assert-lifecycle-closure-runbook-current.mjs
  node coordination/release-intake/assert-secret-env-quarantine.mjs
  node coordination/release-intake/assert-disposition-evidence-current.mjs
  node coordination/release-intake/assert-worktree-lifecycle.mjs --strict
  ```

  Expected: all commands exit `0`.

- [ ] **Step 4: Verify product build and regression gate from clean source**

  Run:

  ```bash
  npm ci
  npm run type-check
  npm run build
  npm run test:analytics
  npm run test:backend
  npm run test:question-bank
  npm run test:rag
  npx playwright test tests/e2e/student-smoke.spec.ts tests/e2e/backend-api.spec.ts --project=desktop-chrome
  ```

  Expected: all commands exit `0`, or A11/A22 write a blocker report naming exact failing test, owner, and route.

- [ ] **Step 5: Write closure report**

  Generate the closure report from current command output:

  ```bash
  node - <<'NODE'
  const fs = require('fs');
  const { execFileSync } = require('child_process');
  const reportPath = 'coordination/reports/2026-06-30-A25-A22-dirty-worktree-closure.md';
  const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
  const map = JSON.parse(fs.readFileSync('coordination/release-intake/latest-A25-dirty-tree-map.json', 'utf8'));
  const branch = sh('git', ['branch', '--show-current']);
  const head = sh('git', ['rev-parse', '--short', 'HEAD']);
  const worktrees = sh('git', ['worktree', 'list']);
  const status = sh('git', ['status', '--short']);
  const content = `# A25/A22 Dirty Worktree Closure Report

  - Date: 2026-06-30
  - Root branch: ${branch}
  - Root HEAD: ${head}
  - Final dirty-map signature: ${map.statusSignature}
  - Final expanded dirty entries: ${map.statusCounts.expandedStatusEntries}
  - Worktrees retained:

  \`\`\`text
  ${worktrees || 'none'}
  \`\`\`

  - Root status:

  \`\`\`text
  ${status || 'clean'}
  \`\`\`

  - Release-source clean gate: paste command result from \`node coordination/release-intake/assert-release-source-clean.mjs\`
  - Strict worktree lifecycle gate: paste command result from \`node coordination/release-intake/assert-worktree-lifecycle.mjs --strict\`
  - Product checks: paste final command list and result
  - Production deploy status: Not deployed from dirty root.
  `;
  fs.writeFileSync(reportPath, content);
  console.log(reportPath);
  NODE
  ```

  Expected: report has concrete values, no blank fields, and links to every package evidence artifact.

## Task 10: Prevent Recurrence

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `package.json`
- Modify: `scripts/refresh-dirty-tree-map.mjs`
- Modify: `coordination/release-intake/`

- [ ] **Step 1: Add a daily closure check**

  Add or confirm this command in `package.json`:

  ```json
  {
    "scripts": {
      "release:dirty-map": "node scripts/refresh-dirty-tree-map.mjs"
    }
  }
  ```

  Expected: existing script remains available.

- [ ] **Step 2: Add pre-release policy check**

  Confirm A22 release commands call:

  ```bash
  node coordination/release-intake/assert-release-source-clean.mjs
  node coordination/release-intake/assert-worktree-lifecycle.mjs --strict
  ```

  Expected: preview/production release refuses dirty root and unresolved linked worktrees.

- [ ] **Step 3: Require end-of-session final state**

  Add to the session handoff checklist:

  ```markdown
  - Dirty state final action: reviewed commit | owner-approved discard | evidence archive | blocker
  - Worktree lifecycle action: retained clean | PR opened | archived | removed | blocker
  ```

  Expected: no session can stop with unclassified dirty files.

- [ ] **Step 4: Weekly worktree audit**

  Run every week:

  ```bash
  git worktree list
  node coordination/release-intake/worktree-hygiene-dashboard.mjs
  node coordination/release-intake/assert-worktree-lifecycle.mjs --strict
  ```

  Expected: strict gate stays green, or the owner receives one decision list with exact branch/path/final-state choices.

## Stop Conditions

- Stop before any `git restore`, `git clean`, `git worktree remove`, `git tag`, `git push`, `git reset`, branch deletion, or production/preview deploy unless the owner explicitly authorizes that exact action.
- Stop if a package pathspec contains files from two unrelated owner domains.
- Stop if a package check fails in a way that requires feature-code changes outside that owner package.
- Stop if a content/RAG package may contain raw private or copyrighted corpus text.
- Stop if any command would print or commit real secret values.

## Self-Review

- Spec coverage: the plan covers root dirty state, stale governance artifacts, owner package slicing, linked worktree lifecycle closure, release-source verification, and recurrence prevention.
- Placeholder scan: the plan avoids future-fill markers, blank report fields, and angle-bracket command variables.
- Type and command consistency: commands use existing MAIS-MVP scripts and A25 release-intake gate names observed in the current repo.
- Remaining risk: this is a plan, not execution. Destructive cleanup steps are intentionally gated behind explicit owner approval and package evidence.
