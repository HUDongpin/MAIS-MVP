# A25 Owner Input Action Packet

Generated: 2026-07-02T15:48:19.368Z

Dirty map signature: `aab9818713f7df7ad2d9e281c7534227bc41a877b346ef4339ea49f3b0123cb2`

Expanded dirty entries: 3505

This packet is a current owner-input index only. It does not create the authorization file, does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Owner inputs ready: no
- Required input files: 3
- Missing input files: 0
- Pending canonical authorization rows: 67
- Pending Wave 01 authorization rows: 7
- Pending owner blocker report records: 10
- Authorization starter rows: 67
- Pending owner blocker reports: 10
- Next owner decision rows: 25
- Owner closure pending items: 140
- Cleanup-authorized rows: 0
- Executable rows: 0
- Source currentness failures: 0

## Required Inputs

| Input | Target/source file | Present | Total rows | Pending rows | Role |
| --- | --- | --- | ---: | ---: | --- |
| Canonical next-owner authorizations | `coordination/release-intake/latest-A25-next-owner-authorizations.json` | yes | 67 | 67 | canonical authorization input |
| Wave 01 package-resync owner authorizations | `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json` | yes | 7 | 7 | Wave 01 package-resync compatibility input |
| Owner package blocker report records | `coordination/release-intake/latest-A25-owner-package-blocker-report-records.json` | yes | 10 | 10 | owner blocker report records input |

## Authorization Groups

| Kind | Rows | Executable rows | Approval IDs |
| --- | ---: | ---: | --- |
| wave01-package-resync | 7 | 0 | wave01-resync-01-tsconfig-json, wave01-resync-02-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-json, wave01-resync-03-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t072027z-md, wave01-resync-04-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-json, wave01-resync-05-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t073137z-md, wave01-resync-06-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-json, wave01-resync-07-coordination-release-intake-2026-06-30-a25-dirty-tree-map-20260630t130221z-md |
| owner-package | 24 | 0 | a25-git-hygiene-and-release-intake, a22-production-reliability-and-release-engineering, a06-visualization-lead, a12-backend-api-platform, a11-qa-and-release-quality, a10-tooling-docs-and-report, a18-curriculum-qa-a21-content-pipeline, a05-lesson-lead, a21-content-pipeline-and-rag-operations, a04-practice-lead, a03-curriculum-roadmap-lead, a13-teacher-console, a01-app-shell-lead, a02-dashboard-lead, a20-game-design-and-game-based-learning, a07-ai-tutor-lead, a08-state-and-analytics-lead, a15-adaptive-engine-lead, a24-illustration-exact-layer, a14-parent-console, a16-research-and-learning-science, a09-copy-i18n-accessibility, a17-gamification-and-motivation, a23-integration-and-promotion-lead |
| physical-lifecycle | 33 | 0 | root-main, codex-a01-app-shell-closure, codex-a01-shell-lazy-load, codex-a02-a15-dashboard-adaptive-closure, codex-a03-roadmap-closure, codex-a04-practice-closure, codex-a05-lesson-closure, codex-a06-manim-three-closure, codex-a06-visualization-closure, codex-a07-a15-a08-ai-adaptive-types, codex-a07-ai-tutor-classroom-switches, codex-a07-ai-tutor-closure, codex-a08-a12-shared-contract-closure, codex-a09-copy-i18n-accessibility-closure, codex-a10-a22-a08-a12-a06-compose-20260628, codex-a10-a22-release-governance, codex-a11-regression-evidence-closure, codex-a12-google-oauth-login, codex-a12-userstore-storage-contract, codex-a13-a14-console-closure, codex-a16-research-evidence-closure, codex-a17-a20-game-motivation-closure, codex-a18-a21-content-evidence-closure, codex-a19-vercel-postgres-region, codex-a22-missing-module-release-slice, codex-a22-next-15-5-19-audit, codex-a22-p1-release-hygiene-security, codex-a22-us-region-alignment, codex-a25-dirty-closure-governance, codex-a25-full-dirty-compose-verification, codex-visualization-production-release, codex-california-practice-beta-clean, codex-s22-release-hygiene-2026-06-15 |
| a22-generated-artifact-residual-cleanup | 3 | 0 | a22-generated-residual-s11-parent-audit-next3, a22-generated-residual-s11-parent-audit-next4, a22-generated-residual-tmp |

## Pending Owner Blocker Reports

| Agent | Report ID | Owner | Package rows | Template |
| --- | --- | --- | ---: | --- |
| A06 | owner-package-blocker-report-a06 | A06 visualization lead | 14 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a06.md` |
| A13 | owner-package-blocker-report-a13 | A13 teacher console lead | 13 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a13.md` |
| A18 | owner-package-blocker-report-a18 | A18 curriculum QA and content quality lead | 4 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a18.md` |
| A03 | owner-package-blocker-report-a03 | A03 curriculum roadmap lead | 3 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a03.md` |
| A04 | owner-package-blocker-report-a04 | A04 practice lead | 2 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a04.md` |
| A20 | owner-package-blocker-report-a20 | A20 game design and game-based learning lead | 8 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a20.md` |
| A15 | owner-package-blocker-report-a15 | A15 adaptive engine lead | 2 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a15.md` |
| A11 | owner-package-blocker-report-a11 | A11 QA and release quality lead | 1 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a11.md` |
| A12 | owner-package-blocker-report-a12 | A12 backend/API platform lead | 2 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a12.md` |
| A07 | owner-package-blocker-report-a07 | A07 AI tutor lead | 1 | `coordination/release-intake/latest-A25-pending-owner-blocker-report-a07.md` |

## Post-Input Validation Commands

- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/generate-next-owner-authorization-execution-preview.mjs`
- `node coordination/release-intake/assert-next-owner-authorization-execution-preview-current.mjs`
- `node coordination/release-intake/assert-owner-package-blocker-report-records-current.mjs`
- `node coordination/release-intake/assert-owner-closure-input-readiness-current.mjs`
- `node coordination/release-intake/refresh-dirty-worktree-remediation-evidence.mjs --reason "owner input action packet post-input verification"`

## Boundary

Every row remains non-executable. The owner must fill the named input files before validators can convert this into reviewed evidence. A separate owner instruction naming exact approval IDs and exact commands is still required before any physical cleanup can run.
