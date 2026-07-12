# A25 Physical Closure Authorization Queue

Generated: 2026-07-09T14:10:26.104Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This artifact is authorization support only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID and selected final state.

## Summary

- Owner package approval IDs: 25
- Physical lifecycle approval IDs: 39
- Total approval IDs: 64
- Executable rows now: 0
- Cleanup-authorized rows now: 0
- Remaining strict blockers: A22 release-source clean gate; A25 strict worktree lifecycle gate

## Root Owner Package Queue

| Order | Approval ID | Owner | Priority | Entries | Pathspec |
| ---: | --- | --- | ---: | ---: | --- |
| 1 | `a25-git-hygiene-and-release-intake` | A25 git hygiene and release intake | P1 | 4872 | `coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec` |
| 2 | `a22-production-reliability-and-release-engineering` | A22 production reliability and release engineering | P1 | 68 | `coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec` |
| 3 | `a06-visualization-lead` | A06 visualization lead | P2 | 460 | `coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec` |
| 4 | `a12-backend-api-platform` | A12 backend/API platform | P2 | 175 | `coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec` |
| 5 | `a11-qa-and-release-quality` | A11 QA and release quality | P2 | 62 | `coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec` |
| 6 | `a10-tooling-docs-and-report` | A10 tooling, docs, and report | P3 | 482 | `coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec` |
| 7 | `a05-lesson-lead` | A05 lesson lead | P3 | 128 | `coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec` |
| 8 | `a21-content-pipeline-and-rag-operations` | A21 content pipeline and RAG operations | P3 | 74 | `coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec` |
| 9 | `a04-practice-lead` | A04 practice lead | P3 | 59 | `coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec` |
| 10 | `a03-curriculum-roadmap-lead` | A03 curriculum roadmap lead | P3 | 30 | `coordination/release-intake/latest-A25-effective-owner-a03-curriculum-roadmap-lead.pathspec` |
| 11 | `a18-curriculum-qa-a21-content-pipeline` | A18 curriculum QA / A21 content pipeline | P3 | 30 | `coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` |
| 12 | `a13-teacher-console` | A13 teacher console | P4 | 36 | `coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec` |
| 13 | `a01-app-shell-lead` | A01 app shell lead | P4 | 31 | `coordination/release-intake/latest-A25-effective-owner-a01-app-shell-lead.pathspec` |
| 14 | `a02-dashboard-lead` | A02 dashboard lead | P4 | 22 | `coordination/release-intake/latest-A25-effective-owner-a02-dashboard-lead.pathspec` |
| 15 | `a20-game-design-and-game-based-learning` | A20 game design and game-based learning | P4 | 16 | `coordination/release-intake/latest-A25-effective-owner-a20-game-design-and-game-based-learning.pathspec` |
| 16 | `a07-ai-tutor-lead` | A07 AI tutor lead | P4 | 12 | `coordination/release-intake/latest-A25-effective-owner-a07-ai-tutor-lead.pathspec` |
| 17 | `a08-state-and-analytics-lead` | A08 state and analytics lead | P4 | 11 | `coordination/release-intake/latest-A25-effective-owner-a08-state-and-analytics-lead.pathspec` |
| 18 | `a15-adaptive-engine-lead` | A15 adaptive engine lead | P4 | 9 | `coordination/release-intake/latest-A25-effective-owner-a15-adaptive-engine-lead.pathspec` |
| 19 | `a14-parent-console` | A14 parent console | P4 | 7 | `coordination/release-intake/latest-A25-effective-owner-a14-parent-console.pathspec` |
| 20 | `a24-illustration-exact-layer` | A24 illustration exact-layer | P4 | 6 | `coordination/release-intake/latest-A25-effective-owner-a24-illustration-exact-layer.pathspec` |
| 21 | `a09-copy-i18n-accessibility` | A09 copy, i18n, accessibility | P4 | 5 | `coordination/release-intake/latest-A25-effective-owner-a09-copy-i18n-accessibility.pathspec` |
| 22 | `a17-gamification-and-motivation` | A17 gamification and motivation | P4 | 5 | `coordination/release-intake/latest-A25-effective-owner-a17-gamification-and-motivation.pathspec` |
| 23 | `a23-integration-and-promotion-lead` | A23 integration and promotion lead | P4 | 2 | `coordination/release-intake/latest-A25-effective-owner-a23-integration-and-promotion-lead.pathspec` |
| 24 | `a13-teacher-console-lead` | A13 teacher console lead | P4 | 1 | `coordination/release-intake/latest-A25-effective-owner-a13-teacher-console-lead.pathspec` |
| 25 | `a18-curriculum-qa-and-content-quality-lead` | A18 curriculum QA and content quality lead | P4 | 1 | `coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-and-content-quality-lead.pathspec` |

## Physical Lifecycle Queue

| Order | Approval ID | Branch | Kind | Current blocker | Owner hints |
| ---: | --- | --- | --- | --- | --- |
| 1 | `root-main` | `main` | root-owner-package | dirty 6604 | A25, A10, A22, effective file owners |
| 2 | `codex-a01-app-shell-closure` | `codex/A01-app-shell-closure` | dirty-diverged-worktree | dirty 26 | A01 |
| 3 | `codex-a01-shell-lazy-load` | `codex/A01-shell-lazy-load` | dirty-diverged-worktree | dirty 8 | A01 |
| 4 | `codex-a02-a15-dashboard-adaptive-closure` | `codex/A02-A15-dashboard-adaptive-closure` | dirty-diverged-worktree | dirty 30 | A02, A15 |
| 5 | `codex-a03-roadmap-closure` | `codex/A03-roadmap-closure` | dirty-diverged-worktree | dirty 30 | A03 |
| 6 | `codex-a04-practice-closure` | `codex/A04-practice-closure` | dirty-diverged-worktree | dirty 56 | A04 |
| 7 | `codex-a05-lesson-checklist-p0` | `codex/A05-lesson-checklist-p0` | clean-diverged-branch | behind 2, ahead 0 | A05 |
| 8 | `codex-a05-lesson-closure` | `codex/A05-lesson-closure` | dirty-diverged-worktree | dirty 126 | A05 |
| 9 | `codex-a05-lesson-pep-load` | `codex/A05-lesson-pep-load` | clean-diverged-branch | behind 2, ahead 0 | A05 |
| 10 | `codex-a05-next-item-button-scroll` | `codex/A05-next-item-button-scroll` | clean-diverged-branch | behind 2, ahead 0 | A05 |
| 11 | `codex-a06-manim-three-closure` | `codex/A06-manim-three-closure` | dirty-diverged-worktree | dirty 351 | A06 |
| 12 | `codex-a06-visualization-closure` | `codex/A06-visualization-closure` | dirty-diverged-worktree | dirty 437 | A06, A22 |
| 13 | `codex-a07-a15-a08-ai-adaptive-types` | `codex/A07-A15-A08-ai-adaptive-types` | dirty-diverged-worktree | dirty 30 | A07, A08, A15 |
| 14 | `codex-a07-ai-tutor-classroom-switches` | `codex/A07-ai-tutor-classroom-switches` | dirty-diverged-worktree | dirty 82 | A07 |
| 15 | `codex-a07-ai-tutor-closure` | `codex/A07-ai-tutor-closure` | dirty-diverged-worktree | dirty 12 | A07 |
| 16 | `codex-a08-a12-shared-contract-closure` | `codex/A08-A12-shared-contract-closure` | dirty-diverged-worktree | dirty 185 | A08, A12 |
| 17 | `codex-a09-copy-i18n-accessibility-closure` | `codex/A09-copy-i18n-accessibility-closure` | dirty-diverged-worktree | dirty 5 | A09 |
| 18 | `codex-a10-a22-a08-a12-a06-compose-20260628` | `codex/A10-A22-A08-A12-A06-compose-20260628` | dirty-diverged-worktree | dirty 954 | A06, A08, A10, A12, A22 |
| 19 | `codex-a10-a22-release-governance` | `codex/A10-A22-release-governance` | clean-diverged-branch | behind 2, ahead 2 | A10, A22 |
| 20 | `codex-a11-fix-126-128-129` | `codex/A11-fix-126-128-129` | dirty-diverged-worktree | dirty 41 | A11 |
| 21 | `codex-a11-regression-evidence-closure` | `codex/A11-regression-evidence-closure` | dirty-diverged-worktree | dirty 62 | A11 |
| 22 | `codex-a12-google-oauth-login` | `codex/A12-google-oauth-login` | dirty-diverged-worktree | dirty 16 | A12 |
| 23 | `codex-a12-userstore-storage-contract` | `codex/A12-userstore-storage-contract` | dirty-diverged-worktree | dirty 170 | A12 |
| 24 | `codex-a13-a14-console-closure` | `codex/A13-A14-console-closure` | dirty-diverged-worktree | dirty 43 | A13, A14 |
| 25 | `codex-a16-research-evidence-closure` | `codex/A16-research-evidence-closure` | dirty-diverged-worktree | dirty 6 | A16 |
| 26 | `codex-a17-a20-game-motivation-closure` | `codex/A17-A20-game-motivation-closure` | dirty-diverged-worktree | dirty 21 | A17, A20 |
| 27 | `codex-a18-a21-content-evidence-closure` | `codex/A18-A21-content-evidence-closure` | dirty-diverged-worktree | dirty 222 | A18, A21 |
| 28 | `codex-a19-vercel-postgres-region` | `codex/A19-vercel-postgres-region` | clean-diverged-branch | behind 2, ahead 8 | A19 |
| 29 | `codex-a22-missing-module-release-slice` | `codex/A22-missing-module-release-slice` | dirty-diverged-worktree | dirty 1016 | A22 |
| 30 | `codex-a22-next-15-5-19-audit` | `codex/A22-next-15-5-19-audit` | dirty-diverged-worktree | dirty 4 | A22 |
| 31 | `codex-a22-p1-release-hygiene-security` | `codex/A22-p1-release-hygiene-security` | dirty-diverged-worktree | dirty 27 | A22 |
| 32 | `codex-a22-us-region-alignment` | `codex/A22-us-region-alignment` | dirty-diverged-worktree | dirty 7 | A22 |
| 33 | `codex-a25-ci-backup-workflow` | `codex/A25-ci-backup-workflow` | clean-diverged-branch | behind 1, ahead 0 | A25 |
| 34 | `codex-a25-dirty-closure-governance` | `codex/A25-dirty-closure-governance` | dirty-diverged-worktree | dirty 1012 | A25 |
| 35 | `codex-a25-full-dirty-compose-verification` | `codex/A25-full-dirty-compose-verification` | dirty-diverged-worktree | dirty 2423 | A25 |
| 36 | `codex-a14-profile-avatar-save` | `codex/A14-profile-avatar-save` | dirty-diverged-worktree | dirty 10 | A14 |
| 37 | `codex-visualization-production-release` | `codex/visualization-production-release` | dirty-diverged-worktree | dirty 16 | A06, A22 |
| 38 | `codex-california-practice-beta-clean` | `codex/california-practice-beta-clean` | clean-diverged-branch | behind 14, ahead 1 | A21, A18, A04, A22 |
| 39 | `codex-s22-release-hygiene-2026-06-15` | `codex/s22-release-hygiene-2026-06-15` | clean-diverged-branch | behind 14, ahead 1 | A22, A10 |

## First Owner Package Authorization Details

### a25-git-hygiene-and-release-intake

- Owner: A25 git hygiene and release intake
- Entries: 4872
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md`
- Authorization text:

```text
Authorize approvalId=a25-git-hygiene-and-release-intake for owner=A25 git hygiene and release intake; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec, coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a25-git-hygiene-and-release-intake"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a22-production-reliability-and-release-engineering

- Owner: A22 production reliability and release engineering
- Entries: 68
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md`
- Authorization text:

```text
Authorize approvalId=a22-production-reliability-and-release-engineering for owner=A22 production reliability and release engineering; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec, coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a22-production-reliability-and-release-engineering"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a06-visualization-lead

- Owner: A06 visualization lead
- Entries: 460
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md`
- Authorization text:

```text
Authorize approvalId=a06-visualization-lead for owner=A06 visualization lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a06-visualization-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a12-backend-api-platform

- Owner: A12 backend/API platform
- Entries: 175
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md`
- Authorization text:

```text
Authorize approvalId=a12-backend-api-platform for owner=A12 backend/API platform; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec, coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a12-backend-api-platform"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a11-qa-and-release-quality

- Owner: A11 QA and release quality
- Entries: 62
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md`
- Authorization text:

```text
Authorize approvalId=a11-qa-and-release-quality for owner=A11 QA and release quality; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec, coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a11-qa-and-release-quality"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a10-tooling-docs-and-report

- Owner: A10 tooling, docs, and report
- Entries: 482
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md`
- Authorization text:

```text
Authorize approvalId=a10-tooling-docs-and-report for owner=A10 tooling, docs, and report; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec, coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a10-tooling-docs-and-report"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a05-lesson-lead

- Owner: A05 lesson lead
- Entries: 128
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a05-lesson-lead.md`
- Authorization text:

```text
Authorize approvalId=a05-lesson-lead for owner=A05 lesson lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a05-lesson-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a05-lesson-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### a21-content-pipeline-and-rag-operations

- Owner: A21 content pipeline and RAG operations
- Entries: 74
- Pathspec: `coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec`
- Work order: `coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md`
- Authorization text:

```text
Authorize approvalId=a21-content-pipeline-and-rag-operations for owner=A21 content pipeline and RAG operations; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec, coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a21-content-pipeline-and-rag-operations"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`


## First Physical Lifecycle Authorization Details

### root-main

- Branch: `main`
- Path: `/Users/dongpinhu/Desktop/MAIS-MVP`
- Current blocker: dirty 6604
- Owner hints: A25, A10, A22, effective file owners
- Authorization text:

```text
Authorize approvalId=root-main for branch=main; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/latest-A25-dirty-tree-map.md, coordination/release-intake/latest-A25-effective-disposition-queue.md, coordination/release-intake/latest-A25-owner-disposition-queue.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval root-main"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a01-app-shell-closure

- Branch: `codex/A01-app-shell-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure`
- Current blocker: dirty 26
- Owner hints: A01
- Authorization text:

```text
Authorize approvalId=codex-a01-app-shell-closure for branch=codex/A01-app-shell-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A01-app-shell-closure.status.txt, coordination/release-intake/archive/codex-A01-app-shell-closure.diffstat.txt, coordination/release-intake/archive/codex-A01-app-shell-closure.patch, coordination/release-intake/archive/codex-A01-app-shell-closure.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A01-app-shell-closure.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A01-app-shell-closure.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A01-app-shell-closure.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a01-app-shell-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a01-shell-lazy-load

- Branch: `codex/A01-shell-lazy-load`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load`
- Current blocker: dirty 8
- Owner hints: A01
- Authorization text:

```text
Authorize approvalId=codex-a01-shell-lazy-load for branch=codex/A01-shell-lazy-load; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A01-shell-lazy-load.status.txt, coordination/release-intake/archive/codex-A01-shell-lazy-load.diffstat.txt, coordination/release-intake/archive/codex-A01-shell-lazy-load.patch, coordination/release-intake/archive/codex-A01-shell-lazy-load.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A01-shell-lazy-load.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A01-shell-lazy-load.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A01-shell-lazy-load.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a01-shell-lazy-load"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a02-a15-dashboard-adaptive-closure

- Branch: `codex/A02-A15-dashboard-adaptive-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure`
- Current blocker: dirty 30
- Owner hints: A02, A15
- Authorization text:

```text
Authorize approvalId=codex-a02-a15-dashboard-adaptive-closure for branch=codex/A02-A15-dashboard-adaptive-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.status.txt, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.diffstat.txt, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.patch, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a02-a15-dashboard-adaptive-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a03-roadmap-closure

- Branch: `codex/A03-roadmap-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure`
- Current blocker: dirty 30
- Owner hints: A03
- Authorization text:

```text
Authorize approvalId=codex-a03-roadmap-closure for branch=codex/A03-roadmap-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A03-roadmap-closure.status.txt, coordination/release-intake/archive/codex-A03-roadmap-closure.diffstat.txt, coordination/release-intake/archive/codex-A03-roadmap-closure.patch, coordination/release-intake/archive/codex-A03-roadmap-closure.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A03-roadmap-closure.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A03-roadmap-closure.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A03-roadmap-closure.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a03-roadmap-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a04-practice-closure

- Branch: `codex/A04-practice-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure`
- Current blocker: dirty 56
- Owner hints: A04
- Authorization text:

```text
Authorize approvalId=codex-a04-practice-closure for branch=codex/A04-practice-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A04-practice-closure.status.txt, coordination/release-intake/archive/codex-A04-practice-closure.diffstat.txt, coordination/release-intake/archive/codex-A04-practice-closure.patch, coordination/release-intake/archive/codex-A04-practice-closure.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A04-practice-closure.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A04-practice-closure.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A04-practice-closure.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a04-practice-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a05-lesson-checklist-p0

- Branch: `codex/A05-lesson-checklist-p0`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-checklist-p0`
- Current blocker: behind 2, ahead 0
- Owner hints: A05
- Authorization text:

```text
Authorize approvalId=codex-a05-lesson-checklist-p0 for branch=codex/A05-lesson-checklist-p0; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A05-lesson-checklist-p0.clean-diverged.status.txt, coordination/release-intake/archive/codex-A05-lesson-checklist-p0.clean-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A05-lesson-checklist-p0.clean-diverged.name-status.txt, coordination/release-intake/archive/codex-A05-lesson-checklist-p0.clean-diverged.diffstat.txt, coordination/release-intake/archive/codex-A05-lesson-checklist-p0.clean-diverged.patch, coordination/release-intake/archive/codex-A05-lesson-checklist-p0.clean-diverged.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-lesson-checklist-p0"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a05-lesson-closure

- Branch: `codex/A05-lesson-closure`
- Path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure`
- Current blocker: dirty 126
- Owner hints: A05
- Authorization text:

```text
Authorize approvalId=codex-a05-lesson-closure for branch=codex/A05-lesson-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A05-lesson-closure.status.txt, coordination/release-intake/archive/codex-A05-lesson-closure.diffstat.txt, coordination/release-intake/archive/codex-A05-lesson-closure.patch, coordination/release-intake/archive/codex-A05-lesson-closure.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A05-lesson-closure.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A05-lesson-closure.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A05-lesson-closure.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
```

- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-lesson-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

