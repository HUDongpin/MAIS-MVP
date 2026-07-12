# 2026-07-11 A25 Owner Disposition Queue

Generated: 2026-07-10T17:08:14.952Z

Dirty map: `coordination/release-intake/latest-A25-dirty-tree-map.json`

Expanded status entries: 7636

Status signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

## Required Gates

- dirty map current: `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- owner pathspecs current: `node coordination/release-intake/assert-owner-pathspecs-current.mjs`
- unmapped runtime owner proposals current: `node coordination/release-intake/assert-unmapped-owner-proposals-current.mjs`
- effective owner overlay current: `node coordination/release-intake/assert-effective-owner-overlay-current.mjs`
- unmapped manual owner proposals current: `node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs`
- secret/env quarantine: `node coordination/release-intake/assert-secret-env-quarantine.mjs`
- disposition evidence current: `node coordination/release-intake/assert-disposition-evidence-current.mjs`
- worktree lifecycle normal: `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- release source clean: `node coordination/release-intake/assert-release-source-clean.mjs`
- worktree lifecycle strict closure: `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict`

## Queue

| Priority | Owner | Entries | Dominant slice | Pathspec | Required final state | Reason |
| ---: | --- | ---: | --- | --- | --- | --- |
| P0 | Unmapped runtime owner review needed | 3 | runtime app/API/data/public: 2 | `coordination/release-intake/latest-A25-owner-unmapped-runtime-owner-review-needed.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Assign owner before any release or commit package. |
| P1 | A25 git hygiene and release intake | 5702 | docs/coordination evidence: 5701 | `coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Release-intake evidence should be reviewed/committed as one coordination package. |
| P1 | A22 production reliability and release engineering | 68 | docs/coordination evidence: 51 | `coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Release gate and deploy-source hygiene. |
| P2 | A06 visualization lead | 460 | runtime app/API/data/public: 242 | `coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Largest dirty owner package; also linked to dirty visualization worktree. |
| P2 | A12 backend/API platform | 178 | runtime app/API/data/public: 119 | `coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | High-risk API/storage surface; requires contract tests. |
| P2 | A11 QA and release quality | 64 | tests/regression evidence: 64 | `coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Regression evidence should be split by owning product surface. |
| P3 | A10 tooling, docs, and report | 490 | docs/coordination evidence: 482 | `coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Shared coordination/config surface. |
| P3 | A21 content pipeline and RAG operations | 76 | generated/content/RAG backlog: 67 | `coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Generated/RAG backlog requires provenance review. |
| P3 | A18 curriculum QA / A21 content pipeline | 45 | docs/coordination evidence: 43 | `coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Content QA and generation pipeline must stay separated. |
| P3 | Unmapped/manual owner needed | 6 | unmapped/manual: 6 | `coordination/release-intake/latest-A25-owner-unmapped-manual-owner-needed.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Manual classification required. |
| P4 | A24 illustration exact-layer | 168 | runtime app/API/data/public: 168 | `coordination/release-intake/latest-A25-owner-a24-illustration-exact-layer.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A05 lesson lead | 129 | runtime app/API/data/public: 117 | `coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A04 practice lead | 60 | runtime app/API/data/public: 49 | `coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A13 teacher console | 37 | runtime app/API/data/public: 36 | `coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A01 app shell lead | 31 | runtime app/API/data/public: 29 | `coordination/release-intake/latest-A25-owner-a01-app-shell-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A03 curriculum roadmap lead | 30 | runtime app/API/data/public: 29 | `coordination/release-intake/latest-A25-owner-a03-curriculum-roadmap-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A02 dashboard lead | 22 | runtime app/API/data/public: 14 | `coordination/release-intake/latest-A25-owner-a02-dashboard-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A20 game design and game-based learning | 16 | runtime app/API/data/public: 15 | `coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A07 AI tutor lead | 12 | runtime app/API/data/public: 9 | `coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A08 state and analytics lead | 11 | runtime app/API/data/public: 5 | `coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A15 adaptive engine lead | 9 | runtime app/API/data/public: 8 | `coordination/release-intake/latest-A25-owner-a15-adaptive-engine-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A14 parent console | 7 | runtime app/API/data/public: 7 | `coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A09 copy, i18n, accessibility | 5 | runtime app/API/data/public: 5 | `coordination/release-intake/latest-A25-owner-a09-copy-i18n-accessibility.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A17 gamification and motivation | 5 | runtime app/API/data/public: 3 | `coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |
| P4 | A23 integration and promotion lead | 2 | docs/coordination evidence: 2 | `coordination/release-intake/latest-A25-owner-a23-integration-and-promotion-lead.pathspec` | reviewed commit, owner-approved discard, evidence archive, or blocker | Standard owner review package. |

## Usage

- Start with P0/P1 packages.
- Use each row's pathspec for focused review only.
- Do not mix neighboring dirty files into a package.
- Every package must end as reviewed commit, owner-approved discard, evidence archive, or blocker.
