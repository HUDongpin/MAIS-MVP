# A25 Next Owner Authorization Execution Preview

Generated: 2026-07-05T11:15:37.344Z

Dirty map signature: `fc405946dbb9033f749aa5e537f14edc23d82355d6b8e796759a4856fcbefeef`

Expanded dirty entries: 4737

Authorization file: `coordination/release-intake/latest-A25-next-owner-authorizations.json`

Authorization file present: yes

This is an evidence-only preview. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup. A separate owner instruction must name the exact approval ID and exact command before anything can execute.

## Summary

- Starter rows: 71
- Authorization rows in file: 7
- Valid authorization rows: 7
- Pending authorization rows: 64
- Invalid authorization rows: 0
- Pre-authorization ready rows: 71
- Pre-authorization attention rows: 0
- Evidence-complete rows: 71
- Worktree checks passed: 48/48
- Target path checks passed: 71/71
- Exact command target checks passed: 9/9
- Pathspec files present: 23/23
- Work-order files present: 25/25
- Command preview rows: 6
- Separate execution instruction required rows: 7
- Cleanup-authorized rows: 0
- Executable rows: 0

## Pre-Authorization Checks

These checks verify that evidence files, worktrees, pathspecs, work orders, target paths, and exact-command targets still point to current local facts. They do not make any row executable.

## Rows

| Approval ID | Kind | Owner | Authorization status | Pre-auth check | Command preview | Executable now |
| --- | --- | --- | --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | wave01-package-resync | A10 tooling, docs, and report | pending-authorization | preauthorization-evidence-ready | none | no |
| `wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json` | wave01-package-resync | A25 git hygiene and release intake | valid-recorded-authorization | preauthorization-evidence-ready | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json` | no |
| `wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md` | wave01-package-resync | A25 git hygiene and release intake | valid-recorded-authorization | preauthorization-evidence-ready | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md` | no |
| `wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json` | wave01-package-resync | A25 git hygiene and release intake | valid-recorded-authorization | preauthorization-evidence-ready | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json` | no |
| `wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md` | wave01-package-resync | A25 git hygiene and release intake | valid-recorded-authorization | preauthorization-evidence-ready | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md` | no |
| `wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json` | wave01-package-resync | A25 git hygiene and release intake | valid-recorded-authorization | preauthorization-evidence-ready | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json` | no |
| `wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md` | wave01-package-resync | A25 git hygiene and release intake | valid-recorded-authorization | preauthorization-evidence-ready | `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md` | no |
| `a25-git-hygiene-and-release-intake` | owner-package | A25 git hygiene and release intake | pending-authorization | preauthorization-evidence-ready | none | no |
| `a22-production-reliability-and-release-engineering` | owner-package | A22 production reliability and release engineering | pending-authorization | preauthorization-evidence-ready | none | no |
| `a06-visualization-lead` | owner-package | A06 visualization lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a12-backend-api-platform` | owner-package | A12 backend/API platform | pending-authorization | preauthorization-evidence-ready | none | no |
| `a11-qa-and-release-quality` | owner-package | A11 QA and release quality | pending-authorization | preauthorization-evidence-ready | none | no |
| `a10-tooling-docs-and-report` | owner-package | A10 tooling, docs, and report | pending-authorization | preauthorization-evidence-ready | none | no |
| `a05-lesson-lead` | owner-package | A05 lesson lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a21-content-pipeline-and-rag-operations` | owner-package | A21 content pipeline and RAG operations | pending-authorization | preauthorization-evidence-ready | none | no |
| `a04-practice-lead` | owner-package | A04 practice lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a03-curriculum-roadmap-lead` | owner-package | A03 curriculum roadmap lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a18-curriculum-qa-a21-content-pipeline` | owner-package | A18 curriculum QA / A21 content pipeline | pending-authorization | preauthorization-evidence-ready | none | no |
| `a13-teacher-console` | owner-package | A13 teacher console | pending-authorization | preauthorization-evidence-ready | none | no |
| `a01-app-shell-lead` | owner-package | A01 app shell lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a02-dashboard-lead` | owner-package | A02 dashboard lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a20-game-design-and-game-based-learning` | owner-package | A20 game design and game-based learning | pending-authorization | preauthorization-evidence-ready | none | no |
| `a07-ai-tutor-lead` | owner-package | A07 AI tutor lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a08-state-and-analytics-lead` | owner-package | A08 state and analytics lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a15-adaptive-engine-lead` | owner-package | A15 adaptive engine lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `a14-parent-console` | owner-package | A14 parent console | pending-authorization | preauthorization-evidence-ready | none | no |
| `a24-illustration-exact-layer` | owner-package | A24 illustration exact-layer | pending-authorization | preauthorization-evidence-ready | none | no |
| `a09-copy-i18n-accessibility` | owner-package | A09 copy, i18n, accessibility | pending-authorization | preauthorization-evidence-ready | none | no |
| `a17-gamification-and-motivation` | owner-package | A17 gamification and motivation | pending-authorization | preauthorization-evidence-ready | none | no |
| `a23-integration-and-promotion-lead` | owner-package | A23 integration and promotion lead | pending-authorization | preauthorization-evidence-ready | none | no |
| `root-main` | physical-lifecycle | A25, A10, A22, effective file owners | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a01-app-shell-closure` | physical-lifecycle | A01 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a01-shell-lazy-load` | physical-lifecycle | A01 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a02-a15-dashboard-adaptive-closure` | physical-lifecycle | A02, A15 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a03-roadmap-closure` | physical-lifecycle | A03 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a04-practice-closure` | physical-lifecycle | A04 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a05-lesson-checklist-p0` | physical-lifecycle | A05 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a05-lesson-closure` | physical-lifecycle | A05 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a05-lesson-pep-load` | physical-lifecycle | A05 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a05-next-item-button-scroll` | physical-lifecycle | A05 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a06-manim-three-closure` | physical-lifecycle | A06 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a06-visualization-closure` | physical-lifecycle | A06, A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a07-a15-a08-ai-adaptive-types` | physical-lifecycle | A07, A08, A15 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a07-ai-tutor-classroom-switches` | physical-lifecycle | A07 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a07-ai-tutor-closure` | physical-lifecycle | A07 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a08-a12-shared-contract-closure` | physical-lifecycle | A08, A12 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a09-copy-i18n-accessibility-closure` | physical-lifecycle | A09 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a10-a22-a08-a12-a06-compose-20260628` | physical-lifecycle | A06, A08, A10, A12, A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a10-a22-release-governance` | physical-lifecycle | A10, A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a11-fix-126-128-129` | physical-lifecycle | A11 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a11-regression-evidence-closure` | physical-lifecycle | A11 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a12-google-oauth-login` | physical-lifecycle | A12 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a12-userstore-storage-contract` | physical-lifecycle | A12 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a13-a14-console-closure` | physical-lifecycle | A13, A14 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a16-research-evidence-closure` | physical-lifecycle | A16 | valid-recorded-authorization | preauthorization-evidence-ready | none | no |
| `codex-a17-a20-game-motivation-closure` | physical-lifecycle | A17, A20 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a18-a21-content-evidence-closure` | physical-lifecycle | A18, A21 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a19-vercel-postgres-region` | physical-lifecycle | A19 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a22-missing-module-release-slice` | physical-lifecycle | A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a22-next-15-5-19-audit` | physical-lifecycle | A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a22-p1-release-hygiene-security` | physical-lifecycle | A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a22-us-region-alignment` | physical-lifecycle | A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a25-ci-backup-workflow` | physical-lifecycle | A25 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a25-dirty-closure-governance` | physical-lifecycle | A25 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a25-full-dirty-compose-verification` | physical-lifecycle | A25 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-a14-profile-avatar-save` | physical-lifecycle | A14 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-visualization-production-release` | physical-lifecycle | A06, A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-california-practice-beta-clean` | physical-lifecycle | A21, A18, A04, A22 | pending-authorization | preauthorization-evidence-ready | none | no |
| `codex-s22-release-hygiene-2026-06-15` | physical-lifecycle | A22, A10 | pending-authorization | preauthorization-evidence-ready | none | no |
| `a22-generated-residual-tmp` | a22-generated-artifact-residual-cleanup | A22 production reliability and release engineering | pending-authorization | preauthorization-evidence-ready | none | no |
| `a22-generated-residual-next` | a22-generated-artifact-residual-cleanup | A22 production reliability and release engineering | pending-authorization | preauthorization-evidence-ready | none | no |

## Recorded Authorization Details

### wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json

- Owner: A25 git hygiene and release intake
- Status: valid-recorded-authorization
- Selected final state: approve-wave01-a25-artifact-clean-only
- Command preview: `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.json`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md

- Owner: A25 git hygiene and release intake
- Status: valid-recorded-authorization
- Selected final state: approve-wave01-a25-artifact-clean-only
- Command preview: `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T072027Z.md`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json

- Owner: A25 git hygiene and release intake
- Status: valid-recorded-authorization
- Selected final state: approve-wave01-a25-artifact-clean-only
- Command preview: `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.json`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md

- Owner: A25 git hygiene and release intake
- Status: valid-recorded-authorization
- Selected final state: approve-wave01-a25-artifact-clean-only
- Command preview: `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T073137Z.md`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json

- Owner: A25 git hygiene and release intake
- Status: valid-recorded-authorization
- Selected final state: approve-wave01-a25-artifact-clean-only
- Command preview: `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.json`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md

- Owner: A25 git hygiene and release intake
- Status: valid-recorded-authorization
- Selected final state: approve-wave01-a25-artifact-clean-only
- Command preview: `git clean -f -- coordination/release-intake/2026-06-30-A25-dirty-tree-map-20260630T130221Z.md`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

### codex-a16-research-evidence-closure

- Owner: A16
- Status: valid-recorded-authorization
- Selected final state: owner-reviewed commit or package extraction
- Command preview: `none`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure`
- Separate execution instruction required: true
- Cleanup authorized: false
- Executable now: false
- Post-approval checks:
  - `node coordination/release-intake/worktree-hygiene-dashboard.mjs`
  - `npm run release:dirty-map -- --reason "A25 post-physical-approval codex-a16-research-evidence-closure"`
  - `node coordination/release-intake/assert-physical-lifecycle-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-worktree-lifecycle.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

