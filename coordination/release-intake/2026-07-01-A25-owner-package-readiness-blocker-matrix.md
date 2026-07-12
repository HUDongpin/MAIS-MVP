# A25 Owner Package Readiness Blocker Matrix

Generated: 2026-07-01T15:52:55.579Z

Dirty map signature: `a3d53193f9c6629f27caf373e28dd1f70fe23a49596658b8c8fd09e4079b9c66`

Expanded dirty entries: 2923

This is readiness and blocker evidence only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, or any other physical cleanup.

## Summary

- Matrix rows: 16
- Ready rows: 1
- Blocked rows: 15
- Cleanup-authorized rows: 0
- Executable rows: 0
- Failed checks: 34
- Type-check error lines: 9907

| Wave | Package | Owners | Readiness | Status entries | Failed checks | Type errors | Uncovered |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `wave-01-governance-release-hygiene` | `wave-01-governance-release-hygiene` | A25 git hygiene and release intake, A22 production reliability and release engineering, A10 tooling, docs, and report | blocked | 1018 | 1 | 404 | 7 |
| `wave-02-shared-contracts` | `wave-02-shared-contracts` | A08 state and analytics lead, A12 backend/API platform | blocked | 185 | 4 | 689 | 0 |
| `wave-03-shell-dashboard-roadmap` | `a01-app-shell` | A01 app shell lead | blocked | 26 | 2 | 697 | 0 |
| `wave-03-shell-dashboard-roadmap` | `a02-a15-dashboard-adaptive` | A02 dashboard lead, A15 adaptive engine lead | blocked | 30 | 3 | 738 | 0 |
| `wave-03-shell-dashboard-roadmap` | `a03-roadmap` | A03 curriculum roadmap lead | blocked | 30 | 2 | 841 | 0 |
| `wave-04-practice-lesson-content` | `a04-practice` | A04 practice lead | blocked | 56 | 3 | 885 | 0 |
| `wave-04-practice-lesson-content` | `a05-lesson` | A05 lesson lead | blocked | 126 | 2 | 723 | 0 |
| `wave-04-practice-lesson-content` | `a18-a21-a23-a24-content-evidence` | A18 curriculum QA / A21 content pipeline, A21 content pipeline and RAG operations, A23 integration and promotion lead, A24 illustration exact-layer | blocked | 222 | 3 | 756 | 0 |
| `wave-05-visualization-ai-runtime` | `a06-visualization` | A06 visualization lead | blocked | 437 | 3 | 655 | 0 |
| `wave-05-visualization-ai-runtime` | `a07-ai-tutor` | A07 AI tutor lead | blocked | 12 | 2 | 680 | 0 |
| `wave-05-visualization-ai-runtime` | `a09-copy-i18n-accessibility` | A09 copy, i18n, accessibility | blocked | 5 | 1 | 654 | 0 |
| `wave-05-visualization-ai-runtime` | `a11-regression-evidence` | A11 QA and release quality | blocked | 62 | 2 | 697 | 0 |
| `wave-05-visualization-ai-runtime` | `a13-a14-console` | A13 teacher console, A14 parent console | blocked | 43 | 2 | 865 | 0 |
| `wave-05-visualization-ai-runtime` | `a16-research-evidence` | A16 research and learning science | ready | 6 | 0 | 0 | 0 |
| `wave-05-visualization-ai-runtime` | `a17-a20-game-motivation` | A17 gamification and motivation, A20 game design and game-based learning | blocked | 21 | 2 | 623 | 0 |
| `wave-06-final-root-and-compose-lifecycle` | `wave-06-final-root-and-compose-lifecycle` | A25 git hygiene and release intake, A22 production reliability and release engineering | blocked | 0 | 2 | 0 | 0 |

## A25/A10/A22 governance and release hygiene

- Matrix ID: `wave-01-governance-release-hygiene:wave-01-governance-release-hygiene`
- Source kind: owner-package-readiness
- Owners: A25 git hygiene and release intake, A22 production reliability and release engineering, A10 tooling, docs, and report
- Owner approval IDs: `a25-git-hygiene-and-release-intake`, `a22-production-reliability-and-release-engineering`, `a10-tooling-docs-and-report`
- Physical lifecycle approval IDs: `codex-a25-dirty-closure-governance`, `codex-a10-a22-release-governance`, `codex-a22-p1-release-hygiene-security`, `codex-a22-next-15-5-19-audit`, `codex-a22-us-region-alignment`, `codex-a22-missing-module-release-slice`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Branch: `codex/A25-dirty-closure-governance`
- Status entries: 1018
- Covered / uncovered: 1011 / 7
- Failed checks: typeCheck
- Type-check error lines: 404
- Blocking reasons: 7 dirty entries are outside the A25/A10/A22 pathspec union; npm run type-check failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec`
  - `coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec`
  - `coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec`
- Required authorization text:
  - Authorize approvalId=a25-git-hygiene-and-release-intake for owner=A25 git hygiene and release intake; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec, coordination/release-intake/latest-A25-effective-work-order-a25-git-hygiene-and-release-intake.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a22-production-reliability-and-release-engineering for owner=A22 production reliability and release engineering; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec, coordination/release-intake/latest-A25-effective-work-order-a22-production-reliability-and-release-engineering.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a10-tooling-docs-and-report for owner=A10 tooling, docs, and report; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec, coordination/release-intake/latest-A25-effective-work-order-a10-tooling-docs-and-report.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a25-dirty-closure-governance for branch=codex/A25-dirty-closure-governance; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A25-dirty-closure-governance.status.txt, coordination/release-intake/archive/codex-A25-dirty-closure-governance.diffstat.txt, coordination/release-intake/archive/codex-A25-dirty-closure-governance.patch, coordination/release-intake/archive/codex-A25-dirty-closure-governance.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a10-a22-release-governance for branch=codex/A10-A22-release-governance; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.status.txt, coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.name-status.txt, coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.diffstat.txt, coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.patch, coordination/release-intake/archive/codex-A10-A22-release-governance.clean-diverged.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a22-p1-release-hygiene-security for branch=codex/A22-p1-release-hygiene-security; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.status.txt, coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.diffstat.txt, coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.patch, coordination/release-intake/archive/codex-A22-p1-release-hygiene-security.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a22-next-15-5-19-audit for branch=codex/A22-next-15-5-19-audit; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A22-next-15-5-19-audit.status.txt, coordination/release-intake/archive/codex-A22-next-15-5-19-audit.diffstat.txt, coordination/release-intake/archive/codex-A22-next-15-5-19-audit.patch, coordination/release-intake/archive/codex-A22-next-15-5-19-audit.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a22-us-region-alignment for branch=codex/A22-us-region-alignment; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.status.txt, coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.name-status.txt, coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.diffstat.txt, coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.patch, coordination/release-intake/archive/codex-A22-us-region-alignment.clean-diverged.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a22-missing-module-release-slice for branch=codex/A22-missing-module-release-slice; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A22-missing-module-release-slice.status.txt, coordination/release-intake/archive/codex-A22-missing-module-release-slice.diffstat.txt, coordination/release-intake/archive/codex-A22-missing-module-release-slice.patch, coordination/release-intake/archive/codex-A22-missing-module-release-slice.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a25-git-hygiene-and-release-intake.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a25-git-hygiene-and-release-intake"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a22-production-reliability-and-release-engineering.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a22-production-reliability-and-release-engineering"`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a10-tooling-docs-and-report.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a10-tooling-docs-and-report"`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a25-dirty-closure-governance"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a10-a22-release-governance"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-p1-release-hygiene-security"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-next-15-5-19-audit"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-us-region-alignment"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a22-missing-module-release-slice"`

## A08/A12 shared contracts and storage/API stability

- Matrix ID: `wave-02-shared-contracts:wave-02-shared-contracts`
- Source kind: owner-package-readiness
- Owners: A08 state and analytics lead, A12 backend/API platform
- Owner approval IDs: `a08-state-and-analytics-lead`, `a12-backend-api-platform`
- Physical lifecycle approval IDs: `codex-a08-a12-shared-contract-closure`, `codex-a12-userstore-storage-contract`, `codex-a12-google-oauth-login`, `codex-a07-a15-a08-ai-adaptive-types`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure`
- Branch: `codex/A08-A12-shared-contract-closure`
- Status entries: 185
- Covered / uncovered: 185 / 0
- Failed checks: testAnalytics, testBackend, typeCheck, build
- Type-check error lines: 689
- Blocking reasons: testAnalytics failed; testBackend failed; typeCheck failed; build failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec`
  - `coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec`
- Required authorization text:
  - Authorize approvalId=a08-state-and-analytics-lead for owner=A08 state and analytics lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a08-state-and-analytics-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a08-state-and-analytics-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a12-backend-api-platform for owner=A12 backend/API platform; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec, coordination/release-intake/latest-A25-effective-work-order-a12-backend-api-platform.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a08-a12-shared-contract-closure for branch=codex/A08-A12-shared-contract-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.status.txt, coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.diffstat.txt, coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.patch, coordination/release-intake/archive/codex-A08-A12-shared-contract-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a12-userstore-storage-contract for branch=codex/A12-userstore-storage-contract; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A12-userstore-storage-contract.status.txt, coordination/release-intake/archive/codex-A12-userstore-storage-contract.diffstat.txt, coordination/release-intake/archive/codex-A12-userstore-storage-contract.patch, coordination/release-intake/archive/codex-A12-userstore-storage-contract.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a12-google-oauth-login for branch=codex/A12-google-oauth-login; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A12-google-oauth-login.status.txt, coordination/release-intake/archive/codex-A12-google-oauth-login.diffstat.txt, coordination/release-intake/archive/codex-A12-google-oauth-login.patch, coordination/release-intake/archive/codex-A12-google-oauth-login.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a07-a15-a08-ai-adaptive-types for branch=codex/A07-A15-A08-ai-adaptive-types; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.status.txt, coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.diffstat.txt, coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.patch, coordination/release-intake/archive/codex-A07-A15-A08-ai-adaptive-types.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a08-state-and-analytics-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a08-state-and-analytics-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a12-backend-api-platform.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a12-backend-api-platform"`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a08-a12-shared-contract-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a12-userstore-storage-contract"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a12-google-oauth-login"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a07-a15-a08-ai-adaptive-types"`

## A01 app shell

- Matrix ID: `wave-03-shell-dashboard-roadmap:a01-app-shell`
- Source kind: owner-package-readiness
- Owners: A01 app shell lead
- Owner approval IDs: `a01-app-shell-lead`
- Physical lifecycle approval IDs: `codex-a01-app-shell-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure`
- Branch: `codex/A01-app-shell-closure`
- Status entries: 26
- Covered / uncovered: 26 / 0
- Failed checks: typeCheck, appShellPlaywright
- Type-check error lines: 697
- Blocking reasons: A01 app shell typeCheck failed; A01 app shell appShellPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a01-app-shell-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a01-app-shell-lead for owner=A01 app shell lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a01-app-shell-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a01-app-shell-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a01-app-shell-closure for branch=codex/A01-app-shell-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A01-app-shell-closure.status.txt, coordination/release-intake/archive/codex-A01-app-shell-closure.diffstat.txt, coordination/release-intake/archive/codex-A01-app-shell-closure.patch, coordination/release-intake/archive/codex-A01-app-shell-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a01-app-shell-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a01-app-shell-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a01-app-shell-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A02/A15 dashboard adaptive

- Matrix ID: `wave-03-shell-dashboard-roadmap:a02-a15-dashboard-adaptive`
- Source kind: owner-package-readiness
- Owners: A02 dashboard lead, A15 adaptive engine lead
- Owner approval IDs: `a02-dashboard-lead`, `a15-adaptive-engine-lead`
- Physical lifecycle approval IDs: `codex-a02-a15-dashboard-adaptive-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure`
- Branch: `codex/A02-A15-dashboard-adaptive-closure`
- Status entries: 30
- Covered / uncovered: 30 / 0
- Failed checks: testAnalytics, typeCheck, dashboardAdaptivePlaywright
- Type-check error lines: 738
- Blocking reasons: A02/A15 dashboard adaptive testAnalytics failed; A02/A15 dashboard adaptive typeCheck failed; A02/A15 dashboard adaptive dashboardAdaptivePlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a02-dashboard-lead.pathspec`
  - `coordination/release-intake/latest-A25-owner-a15-adaptive-engine-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a02-dashboard-lead for owner=A02 dashboard lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a02-dashboard-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a02-dashboard-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a15-adaptive-engine-lead for owner=A15 adaptive engine lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a15-adaptive-engine-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a15-adaptive-engine-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a02-a15-dashboard-adaptive-closure for branch=codex/A02-A15-dashboard-adaptive-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.status.txt, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.diffstat.txt, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.patch, coordination/release-intake/archive/codex-A02-A15-dashboard-adaptive-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a02-dashboard-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a02-dashboard-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a15-adaptive-engine-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a15-adaptive-engine-lead"`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a02-a15-dashboard-adaptive-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A03 roadmap

- Matrix ID: `wave-03-shell-dashboard-roadmap:a03-roadmap`
- Source kind: owner-package-readiness
- Owners: A03 curriculum roadmap lead
- Owner approval IDs: `a03-curriculum-roadmap-lead`
- Physical lifecycle approval IDs: `codex-a03-roadmap-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure`
- Branch: `codex/A03-roadmap-closure`
- Status entries: 30
- Covered / uncovered: 30 / 0
- Failed checks: typeCheck, roadmapPlaywright
- Type-check error lines: 841
- Blocking reasons: A03 roadmap typeCheck failed; A03 roadmap roadmapPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a03-curriculum-roadmap-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a03-curriculum-roadmap-lead for owner=A03 curriculum roadmap lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a03-curriculum-roadmap-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a03-curriculum-roadmap-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a03-roadmap-closure for branch=codex/A03-roadmap-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A03-roadmap-closure.status.txt, coordination/release-intake/archive/codex-A03-roadmap-closure.diffstat.txt, coordination/release-intake/archive/codex-A03-roadmap-closure.patch, coordination/release-intake/archive/codex-A03-roadmap-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a03-curriculum-roadmap-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a03-curriculum-roadmap-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a03-roadmap-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A04 practice

- Matrix ID: `wave-04-practice-lesson-content:a04-practice`
- Source kind: owner-package-readiness
- Owners: A04 practice lead
- Owner approval IDs: `a04-practice-lead`
- Physical lifecycle approval IDs: `codex-a04-practice-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure`
- Branch: `codex/A04-practice-closure`
- Status entries: 56
- Covered / uncovered: 56 / 0
- Failed checks: testQuestionBank, typeCheck, practicePlaywright
- Type-check error lines: 885
- Blocking reasons: A04 practice testQuestionBank failed; A04 practice typeCheck failed; A04 practice practicePlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a04-practice-lead for owner=A04 practice lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a04-practice-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a04-practice-closure for branch=codex/A04-practice-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A04-practice-closure.status.txt, coordination/release-intake/archive/codex-A04-practice-closure.diffstat.txt, coordination/release-intake/archive/codex-A04-practice-closure.patch, coordination/release-intake/archive/codex-A04-practice-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a04-practice-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a04-practice-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a04-practice-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A05 lesson

- Matrix ID: `wave-04-practice-lesson-content:a05-lesson`
- Source kind: owner-package-readiness
- Owners: A05 lesson lead
- Owner approval IDs: `a05-lesson-lead`
- Physical lifecycle approval IDs: `codex-a05-lesson-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure`
- Branch: `codex/A05-lesson-closure`
- Status entries: 126
- Covered / uncovered: 126 / 0
- Failed checks: typeCheck, lessonPlaywright
- Type-check error lines: 723
- Blocking reasons: A05 lesson typeCheck failed; A05 lesson lessonPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a05-lesson-lead for owner=A05 lesson lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a05-lesson-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a05-lesson-closure for branch=codex/A05-lesson-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A05-lesson-closure.status.txt, coordination/release-intake/archive/codex-A05-lesson-closure.diffstat.txt, coordination/release-intake/archive/codex-A05-lesson-closure.patch, coordination/release-intake/archive/codex-A05-lesson-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a05-lesson-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a05-lesson-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a05-lesson-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A18/A21/A23/A24 content evidence

- Matrix ID: `wave-04-practice-lesson-content:a18-a21-a23-a24-content-evidence`
- Source kind: owner-package-readiness
- Owners: A18 curriculum QA / A21 content pipeline, A21 content pipeline and RAG operations, A23 integration and promotion lead, A24 illustration exact-layer
- Owner approval IDs: `a18-curriculum-qa-a21-content-pipeline`, `a21-content-pipeline-and-rag-operations`, `a23-integration-and-promotion-lead`, `a24-illustration-exact-layer`
- Physical lifecycle approval IDs: `codex-a18-a21-content-evidence-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure`
- Branch: `codex/A18-A21-content-evidence-closure`
- Status entries: 222
- Covered / uncovered: 222 / 0
- Failed checks: testRag, testQuestionBank, typeCheck
- Type-check error lines: 756
- Blocking reasons: A18/A21/A23/A24 content evidence testRag failed; A18/A21/A23/A24 content evidence testQuestionBank failed; A18/A21/A23/A24 content evidence typeCheck failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec`
  - `coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec`
  - `coordination/release-intake/latest-A25-owner-a23-integration-and-promotion-lead.pathspec`
  - `coordination/release-intake/latest-A25-owner-a24-illustration-exact-layer.pathspec`
- Required authorization text:
  - Authorize approvalId=a18-curriculum-qa-a21-content-pipeline for owner=A18 curriculum QA / A21 content pipeline; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec, coordination/release-intake/latest-A25-effective-work-order-a18-curriculum-qa-a21-content-pipeline.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a21-content-pipeline-and-rag-operations for owner=A21 content pipeline and RAG operations; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec, coordination/release-intake/latest-A25-effective-work-order-a21-content-pipeline-and-rag-operations.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a23-integration-and-promotion-lead for owner=A23 integration and promotion lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a23-integration-and-promotion-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a23-integration-and-promotion-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a24-illustration-exact-layer for owner=A24 illustration exact-layer; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a24-illustration-exact-layer.pathspec, coordination/release-intake/latest-A25-effective-work-order-a24-illustration-exact-layer.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a18-a21-content-evidence-closure for branch=codex/A18-A21-content-evidence-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.status.txt, coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.diffstat.txt, coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.patch, coordination/release-intake/archive/codex-A18-A21-content-evidence-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a18-curriculum-qa-a21-content-pipeline.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a18-curriculum-qa-a21-content-pipeline"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a21-content-pipeline-and-rag-operations.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a21-content-pipeline-and-rag-operations"`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a23-integration-and-promotion-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a23-integration-and-promotion-lead"`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a24-illustration-exact-layer.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a24-illustration-exact-layer"`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a18-a21-content-evidence-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A06 visualization

- Matrix ID: `wave-05-visualization-ai-runtime:a06-visualization`
- Source kind: owner-package-readiness
- Owners: A06 visualization lead
- Owner approval IDs: `a06-visualization-lead`
- Physical lifecycle approval IDs: `codex-a06-visualization-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure`
- Branch: `codex/A06-visualization-closure`
- Status entries: 437
- Covered / uncovered: 437 / 0
- Failed checks: typeCheck, visualizationNodeTests, visualizationPlaywright
- Type-check error lines: 655
- Blocking reasons: A06 visualization typeCheck failed; A06 visualization visualizationNodeTests failed; A06 visualization visualizationPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a06-visualization-lead for owner=A06 visualization lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a06-visualization-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a06-visualization-closure for branch=codex/A06-visualization-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A06-visualization-closure.status.txt, coordination/release-intake/archive/codex-A06-visualization-closure.diffstat.txt, coordination/release-intake/archive/codex-A06-visualization-closure.patch, coordination/release-intake/archive/codex-A06-visualization-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a06-visualization-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a06-visualization-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a06-visualization-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A07 AI tutor

- Matrix ID: `wave-05-visualization-ai-runtime:a07-ai-tutor`
- Source kind: owner-package-readiness
- Owners: A07 AI tutor lead
- Owner approval IDs: `a07-ai-tutor-lead`
- Physical lifecycle approval IDs: `codex-a07-ai-tutor-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure`
- Branch: `codex/A07-ai-tutor-closure`
- Status entries: 12
- Covered / uncovered: 12 / 0
- Failed checks: typeCheck, aiTutorPlaywright
- Type-check error lines: 680
- Blocking reasons: A07 AI tutor typeCheck failed; A07 AI tutor aiTutorPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec`
- Required authorization text:
  - Authorize approvalId=a07-ai-tutor-lead for owner=A07 AI tutor lead; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a07-ai-tutor-lead.pathspec, coordination/release-intake/latest-A25-effective-work-order-a07-ai-tutor-lead.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a07-ai-tutor-closure for branch=codex/A07-ai-tutor-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A07-ai-tutor-closure.status.txt, coordination/release-intake/archive/codex-A07-ai-tutor-closure.diffstat.txt, coordination/release-intake/archive/codex-A07-ai-tutor-closure.patch, coordination/release-intake/archive/codex-A07-ai-tutor-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a07-ai-tutor-lead.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a07-ai-tutor-lead"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a07-ai-tutor-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A09 copy/i18n/accessibility

- Matrix ID: `wave-05-visualization-ai-runtime:a09-copy-i18n-accessibility`
- Source kind: owner-package-readiness
- Owners: A09 copy, i18n, accessibility
- Owner approval IDs: `a09-copy-i18n-accessibility`
- Physical lifecycle approval IDs: `codex-a09-copy-i18n-accessibility-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A09-copy-i18n-accessibility-closure`
- Branch: `codex/A09-copy-i18n-accessibility-closure`
- Status entries: 5
- Covered / uncovered: 5 / 0
- Failed checks: typeCheck
- Type-check error lines: 654
- Blocking reasons: A09 copy/i18n/accessibility typeCheck failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a09-copy-i18n-accessibility.pathspec`
- Required authorization text:
  - Authorize approvalId=a09-copy-i18n-accessibility for owner=A09 copy, i18n, accessibility; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a09-copy-i18n-accessibility.pathspec, coordination/release-intake/latest-A25-effective-work-order-a09-copy-i18n-accessibility.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a09-copy-i18n-accessibility-closure for branch=codex/A09-copy-i18n-accessibility-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.status.txt, coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.diffstat.txt, coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.patch, coordination/release-intake/archive/codex-A09-copy-i18n-accessibility-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a09-copy-i18n-accessibility.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a09-copy-i18n-accessibility"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a09-copy-i18n-accessibility-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A11 regression evidence

- Matrix ID: `wave-05-visualization-ai-runtime:a11-regression-evidence`
- Source kind: owner-package-readiness
- Owners: A11 QA and release quality
- Owner approval IDs: `a11-qa-and-release-quality`
- Physical lifecycle approval IDs: `codex-a11-regression-evidence-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure`
- Branch: `codex/A11-regression-evidence-closure`
- Status entries: 62
- Covered / uncovered: 62 / 0
- Failed checks: typeCheck, regressionPlaywright
- Type-check error lines: 697
- Blocking reasons: A11 regression evidence typeCheck failed; A11 regression evidence regressionPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec`
- Required authorization text:
  - Authorize approvalId=a11-qa-and-release-quality for owner=A11 QA and release quality; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec, coordination/release-intake/latest-A25-effective-work-order-a11-qa-and-release-quality.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a11-regression-evidence-closure for branch=codex/A11-regression-evidence-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A11-regression-evidence-closure.status.txt, coordination/release-intake/archive/codex-A11-regression-evidence-closure.diffstat.txt, coordination/release-intake/archive/codex-A11-regression-evidence-closure.patch, coordination/release-intake/archive/codex-A11-regression-evidence-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a11-qa-and-release-quality.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a11-qa-and-release-quality"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a11-regression-evidence-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A13/A14 console

- Matrix ID: `wave-05-visualization-ai-runtime:a13-a14-console`
- Source kind: owner-package-readiness
- Owners: A13 teacher console, A14 parent console
- Owner approval IDs: `a13-teacher-console`, `a14-parent-console`
- Physical lifecycle approval IDs: `codex-a13-a14-console-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure`
- Branch: `codex/A13-A14-console-closure`
- Status entries: 43
- Covered / uncovered: 43 / 0
- Failed checks: typeCheck, consolePlaywright
- Type-check error lines: 865
- Blocking reasons: A13/A14 console typeCheck failed; A13/A14 console consolePlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec`
  - `coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec`
- Required authorization text:
  - Authorize approvalId=a13-teacher-console for owner=A13 teacher console; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec, coordination/release-intake/latest-A25-effective-work-order-a13-teacher-console.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a14-parent-console for owner=A14 parent console; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a14-parent-console.pathspec, coordination/release-intake/latest-A25-effective-work-order-a14-parent-console.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a13-a14-console-closure for branch=codex/A13-A14-console-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A13-A14-console-closure.status.txt, coordination/release-intake/archive/codex-A13-A14-console-closure.diffstat.txt, coordination/release-intake/archive/codex-A13-A14-console-closure.patch, coordination/release-intake/archive/codex-A13-A14-console-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a13-teacher-console.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a13-teacher-console"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a14-parent-console.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a14-parent-console"`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a13-a14-console-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A16 research evidence

- Matrix ID: `wave-05-visualization-ai-runtime:a16-research-evidence`
- Source kind: owner-package-readiness
- Owners: A16 research and learning science
- Owner approval IDs: `a16-research-and-learning-science`
- Physical lifecycle approval IDs: `codex-a16-research-evidence-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure`
- Branch: `codex/A16-research-evidence-closure`
- Status entries: 6
- Covered / uncovered: 6 / 0
- Failed checks: none
- Type-check error lines: 0
- Blocking reasons: none
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a16-research-and-learning-science.pathspec`
- Required authorization text:
  - Authorize approvalId=a16-research-and-learning-science for owner=A16 research and learning science; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec, coordination/release-intake/latest-A25-effective-work-order-a16-research-and-learning-science.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a16-research-evidence-closure for branch=codex/A16-research-evidence-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A16-research-evidence-closure.status.txt, coordination/release-intake/archive/codex-A16-research-evidence-closure.diffstat.txt, coordination/release-intake/archive/codex-A16-research-evidence-closure.patch, coordination/release-intake/archive/codex-A16-research-evidence-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a16-research-and-learning-science.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a16-research-and-learning-science"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a16-research-evidence-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## A17/A20 games and motivation

- Matrix ID: `wave-05-visualization-ai-runtime:a17-a20-game-motivation`
- Source kind: owner-package-readiness
- Owners: A17 gamification and motivation, A20 game design and game-based learning
- Owner approval IDs: `a17-gamification-and-motivation`, `a20-game-design-and-game-based-learning`
- Physical lifecycle approval IDs: `codex-a17-a20-game-motivation-closure`
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure`
- Branch: `codex/A17-A20-game-motivation-closure`
- Status entries: 21
- Covered / uncovered: 21 / 0
- Failed checks: typeCheck, gameMotivationPlaywright
- Type-check error lines: 623
- Blocking reasons: A17/A20 games and motivation typeCheck failed; A17/A20 games and motivation gameMotivationPlaywright failed
- Pathspecs:
  - `coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec`
  - `coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec`
- Required authorization text:
  - Authorize approvalId=a17-gamification-and-motivation for owner=A17 gamification and motivation; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a17-gamification-and-motivation.pathspec, coordination/release-intake/latest-A25-effective-work-order-a17-gamification-and-motivation.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=a20-game-design-and-game-based-learning for owner=A20 game design and game-based learning; selectedFinalState=<reviewed commit | owner-approved exact-path discard | evidence archive | blocker>; evidenceReviewed=coordination/release-intake/latest-A25-effective-owner-a20-game-design-and-game-based-learning.pathspec, coordination/release-intake/latest-A25-effective-work-order-a20-game-design-and-game-based-learning.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope and checks>.
  - Authorize approvalId=codex-a17-a20-game-motivation-closure for branch=codex/A17-A20-game-motivation-closure; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.status.txt, coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.diffstat.txt, coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.patch, coordination/release-intake/archive/codex-A17-A20-game-motivation-closure.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a17-gamification-and-motivation.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a17-gamification-and-motivation"`
  - `node coordination/release-intake/assert-owner-package-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `node coordination/release-intake/review-owner-pathspec.mjs coordination/release-intake/latest-A25-effective-owner-a20-game-design-and-game-based-learning.pathspec --status`
  - `npm run release:dirty-map -- --reason "A25 post-owner-approval a20-game-design-and-game-based-learning"`
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a17-a20-game-motivation-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`

## Final root and compose/legacy lifecycle closure

- Matrix ID: `wave-06-final-root-and-compose-lifecycle:wave-06-final-root-and-compose-lifecycle`
- Source kind: physical-lifecycle-readiness
- Owners: A25 git hygiene and release intake, A22 production reliability and release engineering
- Owner approval IDs: n/a
- Physical lifecycle approval IDs: `root-main`, `codex-a10-a22-a08-a12-a06-compose-20260628`, `codex-a25-full-dirty-compose-verification`, `codex-a19-vercel-postgres-region`, `codex-s22-release-hygiene-2026-06-15`
- Worktree: n/a
- Branch: n/a
- Status entries: 0
- Covered / uncovered: 0 / 0
- Failed checks: releaseSourceClean, strictWorktreeLifecycle
- Type-check error lines: 0
- Blocking reasons: A22 release-source clean gate failed; A25 strict worktree lifecycle gate failed
- Pathspecs:
  - n/a
- Required authorization text:
  - Authorize approvalId=root-main for branch=main; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/latest-A25-dirty-tree-map.md, coordination/release-intake/latest-A25-effective-disposition-queue.md, coordination/release-intake/latest-A25-owner-disposition-queue.md; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a10-a22-a08-a12-a06-compose-20260628 for branch=codex/A10-A22-A08-A12-A06-compose-20260628; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.status.txt, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.diffstat.txt, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.patch, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.untracked.txt, coordination/release-intake/archive/2026-06-30-A25-dirty-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.diffstat.txt, coordination/release-intake/archive/codex-A10-A22-A08-A12-A06-compose-20260628.dirty-diverged.patch; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a25-full-dirty-compose-verification for branch=codex/A25-full-dirty-compose-verification; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-linked-worktree-archive-manifest.md, coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.status.txt, coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.diffstat.txt, coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.patch, coordination/release-intake/archive/codex-A25-full-dirty-compose-verification.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-a19-vercel-postgres-region for branch=codex/A19-vercel-postgres-region; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.status.txt, coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.ahead-log.txt, coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.name-status.txt, coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.diffstat.txt, coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.patch, coordination/release-intake/archive/codex-A19-vercel-postgres-region.clean-diverged.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
  - Authorize approvalId=codex-s22-release-hygiene-2026-06-15 for branch=codex/s22-release-hygiene-2026-06-15; selectedFinalState=<one allowed final state in the physical lifecycle request>; evidenceReviewed=coordination/release-intake/archive/2026-06-30-A25-clean-diverged-branch-archive-manifest.md, coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.status.txt, coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.ahead-log.txt, coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.name-status.txt, coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.diffstat.txt, coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.patch, coordination/release-intake/archive/codex-s22-release-hygiene-2026-06-15.clean-diverged.untracked.txt; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, exact paths if discard/removal, and checks>.
- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval root-main"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a10-a22-a08-a12-a06-compose-20260628"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a25-full-dirty-compose-verification"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a19-vercel-postgres-region"`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-s22-release-hygiene-2026-06-15"`
