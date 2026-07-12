# 2026-06-26 A25 Worktree Hygiene Dashboard

Generated: 2026-06-26, 19:15:05 GMT+8

Baseline: `main` at `cef544e0`

Dirty map: `coordination/release-intake/latest-A25-dirty-tree-map.json`

Dirty map generated: 2026-06-26T11:14:52.368Z

Status signature: `ad33e80de3e1e213eaec9b4d2357a4bb9dfe72de91ba552e65c8ff0679e28c50`

## Release Rule

- A22 must not deploy from a dirty source. Allowed release sources are clean worktree, clean clone, reviewed clean slice, or owner-approved pruned staging package.
- Verifier: `node coordination/release-intake/assert-release-source-clean.mjs`
- Direct dirty-root preview or production deploy remains blocked.

## Worktree Lifecycle Gate

- A25 worktree registry must have no prunable or missing-path entries. Strict mode additionally fails on dirty/diverged open decisions.
- Verifier: `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- Strict verifier: `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict`

## Governance Integrity Gates

- owner pathspec currency: `node coordination/release-intake/assert-owner-pathspecs-current.mjs`
- secret/env quarantine: `node coordination/release-intake/assert-secret-env-quarantine.mjs`
- disposition evidence currency: `node coordination/release-intake/assert-disposition-evidence-current.mjs`
- effective owner overlay currency: `node coordination/release-intake/assert-effective-owner-overlay-current.mjs`
- unmapped manual owner proposal currency: `node coordination/release-intake/assert-unmapped-manual-proposals-current.mjs`

## Owner Intake Board

| Owner | Dirty entries | Dominant slice | Pathspec | Acceptance check | Final states |
| --- | ---: | --- | --- | --- | --- |
| A25 git hygiene and release intake | 471 | docs/coordination evidence: 471 | `coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec` | A25 refreshes dirty map, emits pathspecs, and records non-destructive intake evidence only. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A06 visualization lead | 307 | runtime app/API/data/public: 163 | `coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec` | A06 validates focused visualization/Manim tests plus app type-check before packaging. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A12 backend/API platform | 160 | runtime app/API/data/public: 104 | `coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec` | A12 validates API/storage contract tests and confirms no provider/env secret exposure. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A10 tooling, docs, and report | 149 | docs/coordination evidence: 145 | `coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec` | A10 validates docs/config/tooling changes and preserves release coordination conventions. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A18 curriculum QA / A21 content pipeline | 130 | docs/coordination evidence: 130 | `coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` | A18/A21 split candidate content from final QA signoff; no live promotion without A23/A11/A22 gates. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| Unmapped runtime owner review needed | 100 | runtime app/API/data/public: 90 | `coordination/release-intake/latest-A25-owner-unmapped-runtime-owner-review-needed.pathspec` | A10/A25 must assign an owner before packaging or release. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A21 content pipeline and RAG operations | 74 | generated/content/RAG backlog: 65 | `coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec` | A21 proves candidate package provenance and keeps raw/private corpus material out of tracked runtime surfaces. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A11 QA and release quality | 61 | tests/regression evidence: 61 | `coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec` | A11 runs or routes targeted regression evidence and records failing gates by owning product surface. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A13 teacher console | 35 | runtime app/API/data/public: 34 | `coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec` | A13 validates teacher-console product flow and coordinates shared API/storage needs with A12. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A04 practice lead | 32 | runtime app/API/data/public: 27 | `coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec` | A04 validates Practice Arena/question-bank behavior and coordinates content correctness with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A01 app shell lead | 25 | runtime app/API/data/public: 25 | `coordination/release-intake/latest-A25-owner-a01-app-shell-lead.pathspec` | A01 validates app shell/auth entry/navigation behavior and bilingual shell copy. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A22 production reliability and release engineering | 24 | docs/coordination evidence: 15 | `coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec` | A22 verifies clean release source, release env guard, and deploy-size/build isolation before any publish. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A05 lesson lead | 11 | runtime app/API/data/public: 8 | `coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec` | A05 validates lesson route/content behavior and coordinates curriculum correctness with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A20 game design and game-based learning | 11 | runtime app/API/data/public: 11 | `coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec` | A20 validates game-loop behavior and keeps reward economy changes coordinated with A17. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A02 dashboard lead | 10 | runtime app/API/data/public: 8 | `coordination/release-intake/latest-A25-owner-a02-dashboard-lead.pathspec` | A02 validates dashboard/progress UI behavior and coordinates adaptive semantics with A15. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A07 AI tutor lead | 10 | runtime app/API/data/public: 8 | `coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec` | A07 validates tutor/provider behavior without logging secrets or changing env ownership. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| Unmapped/manual owner needed | 8 | unmapped/manual: 7 | `coordination/release-intake/latest-A25-owner-unmapped-manual-owner-needed.pathspec` | A10/A25 must classify manually before packaging or release. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A03 curriculum roadmap lead | 6 | runtime app/API/data/public: 6 | `coordination/release-intake/latest-A25-owner-a03-curriculum-roadmap-lead.pathspec` | A03 validates roadmap/topic structure and coordinates content correctness with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A16 research and learning science | 6 | docs/coordination evidence: 6 | `coordination/release-intake/latest-A25-owner-a16-research-and-learning-science.pathspec` | A16 records source-backed research evidence without implying feature-code approval. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A14 parent console | 5 | runtime app/API/data/public: 5 | `coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec` | A14 validates parent-console behavior and coordinates shared storage/API needs with A12. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A15 adaptive engine lead | 4 | runtime app/API/data/public: 3 | `coordination/release-intake/latest-A25-owner-a15-adaptive-engine-lead.pathspec` | A15 validates adaptive-engine tests and coordinates LLM/provider behavior with A07. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A17 gamification and motivation | 4 | runtime app/API/data/public: 3 | `coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec` | A17 validates reward economy/badge/streak logic and coordinates game loops with A20. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A08 state and analytics lead | 2 | runtime app/API/data/public: 2 | `coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec` | A08 validates shared type/state/analytics semantics and coordinates schema drift with A10/A22. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A24 illustration exact-layer | 2 | docs/coordination evidence: 1 | `coordination/release-intake/latest-A25-owner-a24-illustration-exact-layer.pathspec` | A24 validates exact-layer assets and keeps final curriculum approval with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A09 copy, i18n, accessibility | 1 | runtime app/API/data/public: 1 | `coordination/release-intake/latest-A25-owner-a09-copy-i18n-accessibility.pathspec` | A09 validates bilingual copy/accessibility selectors without changing business logic. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |

## Worktree Lifecycle Ledger

| State | Branch | Dirty | Divergence | Path | Next action |
| --- | --- | ---: | --- | --- | --- |
| dirty-active-review-required | `main` | 1648 | behind 0, ahead 0 | `/Users/dongpinhu/Desktop/MAIS-MVP` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/visualization-production-release` | 16 | behind 12, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/california-practice-beta-clean` | 0 | behind 12, ahead 1 | `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| clean-branch-diverged-review | `codex/s22-release-hygiene-2026-06-15` | 0 | behind 12, ahead 1 | `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |

## Artifact Quarantine

- Keep generated evidence in coordination/release-intake, coordination/reports, or ignored staging directories.
- Keep raw/private RAG material out of tracked runtime surfaces unless rights and owner approval are documented.
- Do not mix local/generated artifacts into runtime app/API/data/public pathspecs.

## Operating Rules

- Root `main` is an integration inventory until the dirty map is empty or all entries are owner-packaged.
- Every dirty package needs one owner, one pathspec, one acceptance check, and one final state.
- A25 may refresh maps and emit pathspecs; owning agents decide feature/content correctness.
- Stale worktree registry entries should be pruned only after dry-run evidence.
