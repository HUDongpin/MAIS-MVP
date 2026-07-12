# 2026-07-06 A25 Worktree Hygiene Dashboard

Generated: 2026-07-06, 23:46:49 GMT+8

Baseline: `main` at `ce2ae5258`

Dirty map: `coordination/release-intake/latest-A25-dirty-tree-map.json`

Dirty map generated: 2026-07-06T15:46:12.434Z

Status signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

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
| A25 git hygiene and release intake | 3462 | docs/coordination evidence: 3461 | `coordination/release-intake/latest-A25-owner-a25-git-hygiene-and-release-intake.pathspec` | A25 refreshes dirty map, emits pathspecs, and records non-destructive intake evidence only. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A10 tooling, docs, and report | 473 | docs/coordination evidence: 466 | `coordination/release-intake/latest-A25-owner-a10-tooling-docs-and-report.pathspec` | A10 validates docs/config/tooling changes and preserves release coordination conventions. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A06 visualization lead | 460 | runtime app/API/data/public: 242 | `coordination/release-intake/latest-A25-owner-a06-visualization-lead.pathspec` | A06 validates focused visualization/Manim tests plus app type-check before packaging. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A12 backend/API platform | 175 | runtime app/API/data/public: 116 | `coordination/release-intake/latest-A25-owner-a12-backend-api-platform.pathspec` | A12 validates API/storage contract tests and confirms no provider/env secret exposure. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A05 lesson lead | 128 | runtime app/API/data/public: 116 | `coordination/release-intake/latest-A25-owner-a05-lesson-lead.pathspec` | A05 validates lesson route/content behavior and coordinates curriculum correctness with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A21 content pipeline and RAG operations | 74 | generated/content/RAG backlog: 65 | `coordination/release-intake/latest-A25-owner-a21-content-pipeline-and-rag-operations.pathspec` | A21 proves candidate package provenance and keeps raw/private corpus material out of tracked runtime surfaces. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A22 production reliability and release engineering | 68 | docs/coordination evidence: 51 | `coordination/release-intake/latest-A25-owner-a22-production-reliability-and-release-engineering.pathspec` | A22 verifies clean release source, release env guard, and deploy-size/build isolation before any publish. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A11 QA and release quality | 62 | tests/regression evidence: 62 | `coordination/release-intake/latest-A25-owner-a11-qa-and-release-quality.pathspec` | A11 runs or routes targeted regression evidence and records failing gates by owning product surface. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A04 practice lead | 59 | runtime app/API/data/public: 48 | `coordination/release-intake/latest-A25-owner-a04-practice-lead.pathspec` | A04 validates Practice Arena/question-bank behavior and coordinates content correctness with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A13 teacher console | 36 | runtime app/API/data/public: 35 | `coordination/release-intake/latest-A25-owner-a13-teacher-console.pathspec` | A13 validates teacher-console product flow and coordinates shared API/storage needs with A12. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A01 app shell lead | 31 | runtime app/API/data/public: 29 | `coordination/release-intake/latest-A25-owner-a01-app-shell-lead.pathspec` | A01 validates app shell/auth entry/navigation behavior and bilingual shell copy. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A03 curriculum roadmap lead | 30 | runtime app/API/data/public: 29 | `coordination/release-intake/latest-A25-owner-a03-curriculum-roadmap-lead.pathspec` | A03 validates roadmap/topic structure and coordinates content correctness with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A18 curriculum QA / A21 content pipeline | 30 | docs/coordination evidence: 28 | `coordination/release-intake/latest-A25-owner-a18-curriculum-qa-a21-content-pipeline.pathspec` | A18/A21 split candidate content from final QA signoff; no live promotion without A23/A11/A22 gates. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A02 dashboard lead | 22 | runtime app/API/data/public: 14 | `coordination/release-intake/latest-A25-owner-a02-dashboard-lead.pathspec` | A02 validates dashboard/progress UI behavior and coordinates adaptive semantics with A15. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A20 game design and game-based learning | 16 | runtime app/API/data/public: 15 | `coordination/release-intake/latest-A25-owner-a20-game-design-and-game-based-learning.pathspec` | A20 validates game-loop behavior and keeps reward economy changes coordinated with A17. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A07 AI tutor lead | 12 | runtime app/API/data/public: 9 | `coordination/release-intake/latest-A25-owner-a07-ai-tutor-lead.pathspec` | A07 validates tutor/provider behavior without logging secrets or changing env ownership. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A08 state and analytics lead | 11 | runtime app/API/data/public: 5 | `coordination/release-intake/latest-A25-owner-a08-state-and-analytics-lead.pathspec` | A08 validates shared type/state/analytics semantics and coordinates schema drift with A10/A22. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A15 adaptive engine lead | 9 | runtime app/API/data/public: 8 | `coordination/release-intake/latest-A25-owner-a15-adaptive-engine-lead.pathspec` | A15 validates adaptive-engine tests and coordinates LLM/provider behavior with A07. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A14 parent console | 7 | runtime app/API/data/public: 7 | `coordination/release-intake/latest-A25-owner-a14-parent-console.pathspec` | A14 validates parent-console behavior and coordinates shared storage/API needs with A12. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A24 illustration exact-layer | 6 | runtime app/API/data/public: 6 | `coordination/release-intake/latest-A25-owner-a24-illustration-exact-layer.pathspec` | A24 validates exact-layer assets and keeps final curriculum approval with A18. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A09 copy, i18n, accessibility | 5 | runtime app/API/data/public: 5 | `coordination/release-intake/latest-A25-owner-a09-copy-i18n-accessibility.pathspec` | A09 validates bilingual copy/accessibility selectors without changing business logic. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A17 gamification and motivation | 5 | runtime app/API/data/public: 3 | `coordination/release-intake/latest-A25-owner-a17-gamification-and-motivation.pathspec` | A17 validates reward economy/badge/streak logic and coordinates game loops with A20. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |
| A23 integration and promotion lead | 2 | docs/coordination evidence: 2 | `coordination/release-intake/latest-A25-owner-a23-integration-and-promotion-lead.pathspec` | Owning agent must define and run a targeted acceptance check before packaging. | commit reviewed slice, owner-approved discard, archive evidence, or defer with blocker |

## Worktree Lifecycle Ledger

| State | Branch | Dirty | Divergence | Path | Next action |
| --- | --- | ---: | --- | --- | --- |
| dirty-active-review-required | `main` | 5183 | behind 0, ahead 0 | `/Users/dongpinhu/Desktop/MAIS-MVP` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A01-app-shell-closure` | 26 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-app-shell-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A01-shell-lazy-load` | 8 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A01-shell-lazy-load` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A02-A15-dashboard-adaptive-closure` | 30 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A02-A15-dashboard-adaptive-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A03-roadmap-closure` | 30 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A03-roadmap-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A04-practice-closure` | 56 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A04-practice-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/A05-lesson-checklist-p0` | 0 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-checklist-p0` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| dirty-active-review-required | `codex/A05-lesson-closure` | 126 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/A05-lesson-pep-load` | 0 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-lesson-pep-load` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| clean-branch-diverged-review | `codex/A05-next-item-button-scroll` | 0 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A05-next-item-button-scroll` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| dirty-active-review-required | `codex/A06-manim-three-closure` | 351 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-manim-three-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A06-visualization-closure` | 437 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A06-visualization-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A07-A15-A08-ai-adaptive-types` | 30 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-A15-A08-ai-adaptive-types` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A07-ai-tutor-classroom-switches` | 82 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-classroom-switches` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A07-ai-tutor-closure` | 12 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A07-ai-tutor-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A08-A12-shared-contract-closure` | 185 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A08-A12-shared-contract-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A09-copy-i18n-accessibility-closure` | 5 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A09-copy-i18n-accessibility-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A10-A22-A08-A12-A06-compose-20260628` | 954 | behind 2, ahead 2 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-A08-A12-A06-compose-20260628` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/A10-A22-release-governance` | 0 | behind 2, ahead 2 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A10-A22-release-governance` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| dirty-active-review-required | `codex/A11-fix-126-128-129` | 41 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-fix-126-128-129` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A11-regression-evidence-closure` | 62 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A11-regression-evidence-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A12-google-oauth-login` | 16 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-google-oauth-login` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A12-userstore-storage-contract` | 170 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A12-userstore-storage-contract` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A13-A14-console-closure` | 43 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A13-A14-console-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A16-research-evidence-closure` | 6 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A16-research-evidence-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A17-A20-game-motivation-closure` | 21 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A17-A20-game-motivation-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A18-A21-content-evidence-closure` | 222 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A18-A21-content-evidence-closure` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/A19-vercel-postgres-region` | 0 | behind 2, ahead 8 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A19-vercel-postgres-region` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| dirty-active-review-required | `codex/A22-missing-module-release-slice` | 1016 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-missing-module-release-slice` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A22-next-15-5-19-audit` | 4 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-next-15-5-19-audit` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A22-p1-release-hygiene-security` | 27 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-p1-release-hygiene-security` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/A22-us-region-alignment` | 0 | behind 2, ahead 1 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| clean-branch-diverged-review | `codex/A25-ci-backup-workflow` | 0 | behind 1, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-ci-backup-workflow` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| dirty-active-review-required | `codex/A25-dirty-closure-governance` | 1012 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A25-full-dirty-compose-verification` | 2423 | behind 2, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-full-dirty-compose-verification` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/A14-profile-avatar-save` | 10 | behind 1, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/codex-A14-profile-avatar-save` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| dirty-active-review-required | `codex/visualization-production-release` | 16 | behind 14, ahead 0 | `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/visualization-production-release` | Owning agent must package, commit, archive patch, or explicitly discard after review. |
| clean-branch-diverged-review | `codex/california-practice-beta-clean` | 0 | behind 14, ahead 1 | `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/MAIS-MVP-california-practice-beta-clean` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |
| clean-branch-diverged-review | `codex/s22-release-hygiene-2026-06-15` | 0 | behind 14, ahead 1 | `/Users/dongpinhu/Desktop/MAIS-MVP-worktrees/s22-release-hygiene-2026-06-15` | Owning agent should convert the ahead commit to PR/archive tag or retire branch after review. |

## Artifact Quarantine

- Keep generated evidence in coordination/release-intake, coordination/reports, or ignored staging directories.
- Keep raw/private RAG material out of tracked runtime surfaces unless rights and owner approval are documented.
- Do not mix local/generated artifacts into runtime app/API/data/public pathspecs.

## Operating Rules

- Root `main` is an integration inventory until the dirty map is empty or all entries are owner-packaged.
- Every dirty package needs one owner, one pathspec, one acceptance check, and one final state.
- A25 may refresh maps and emit pathspecs; owning agents decide feature/content correctness.
- Stale worktree registry entries should be pruned only after dry-run evidence.
