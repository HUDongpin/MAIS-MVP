# A25 Dirty-Worktree Closure Execution Sequence

Generated: 2026-07-09T14:10:36.992Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This is a sequencing artifact only. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID, selected final state, and exact Git operation.

## Summary

- Waves: 6
- Total approval IDs: 64
- Owner package approval IDs: 25
- Physical lifecycle approval IDs: 39
- Owner package entries: 6604
- Executable rows now: 0
- Cleanup-authorized rows now: 0

| Wave | Wave ID | Name | Owner approvals | Physical approvals | Owner entries |
| ---: | --- | --- | ---: | ---: | ---: |
| 1 | `wave-01-governance-release-hygiene` | A25/A10/A22 governance and release hygiene | 3 | 7 | 5422 |
| 2 | `wave-02-shared-contracts` | A08/A12 shared contracts and storage/API stability | 2 | 4 | 186 |
| 3 | `wave-03-shell-dashboard-roadmap` | A01/A02/A03/A15 student shell, dashboard, and roadmap | 4 | 4 | 92 |
| 4 | `wave-04-practice-lesson-content` | A04/A05/A18/A21/A23/A24 practice, lesson, and content evidence | 7 | 7 | 300 |
| 5 | `wave-05-visualization-ai-runtime` | A06/A07/A09/A11/A13/A14/A16/A17/A20 runtime and QA surfaces | 9 | 12 | 604 |
| 6 | `wave-06-final-root-and-compose-lifecycle` | Final root and compose/legacy lifecycle closure | 0 | 5 | 0 |

## 1. A25/A10/A22 governance and release hygiene

Plan tasks: Task 3

Purpose: Close the governance, release-hygiene, and clean-release-control package before runtime features.

Blocked until: Owner authorizes every selected final state and exact Git operation needed for this wave.

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
| `a25-git-hygiene-and-release-intake` | A25 git hygiene and release intake | P1 | 4872 |
| `a22-production-reliability-and-release-engineering` | A22 production reliability and release engineering | P1 | 68 |
| `a10-tooling-docs-and-report` | A10 tooling, docs, and report | P3 | 482 |

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
| `codex-a25-dirty-closure-governance` | `codex/A25-dirty-closure-governance` | dirty-open-decision | dirty 1012 |
| `codex-a10-a22-release-governance` | `codex/A10-A22-release-governance` | clean-diverged-open-decision | behind 2, ahead 2 |
| `codex-a22-p1-release-hygiene-security` | `codex/A22-p1-release-hygiene-security` | dirty-open-decision | dirty 27 |
| `codex-a22-next-15-5-19-audit` | `codex/A22-next-15-5-19-audit` | dirty-open-decision | dirty 4 |
| `codex-a22-us-region-alignment` | `codex/A22-us-region-alignment` | dirty-open-decision | dirty 7 |
| `codex-a22-missing-module-release-slice` | `codex/A22-missing-module-release-slice` | dirty-open-decision | dirty 1016 |
| `codex-a25-ci-backup-workflow` | `codex/A25-ci-backup-workflow` | clean-diverged-open-decision | behind 1, ahead 0 |

## 2. A08/A12 shared contracts and storage/API stability

Plan tasks: Task 4

Purpose: Stabilize shared type, provider, analytics, storage, and backend contracts before dependent runtime packages.

Blocked until: Owner authorizes every selected final state and exact Git operation needed for this wave.

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
| `a08-state-and-analytics-lead` | A08 state and analytics lead | P4 | 11 |
| `a12-backend-api-platform` | A12 backend/API platform | P2 | 175 |

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
| `codex-a08-a12-shared-contract-closure` | `codex/A08-A12-shared-contract-closure` | dirty-open-decision | dirty 185 |
| `codex-a12-userstore-storage-contract` | `codex/A12-userstore-storage-contract` | dirty-open-decision | dirty 170 |
| `codex-a12-google-oauth-login` | `codex/A12-google-oauth-login` | dirty-open-decision | dirty 16 |
| `codex-a07-a15-a08-ai-adaptive-types` | `codex/A07-A15-A08-ai-adaptive-types` | dirty-open-decision | dirty 30 |

## 3. A01/A02/A03/A15 student shell, dashboard, and roadmap

Plan tasks: Task 5 Step 1; Task 5 Step 2; Task 5 Step 3

Purpose: Close student entry, dashboard, adaptive UI, and roadmap packages after shared contracts are stable.

Blocked until: Owner authorizes every selected final state and exact Git operation needed for this wave.

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
| `a01-app-shell-lead` | A01 app shell lead | P4 | 31 |
| `a02-dashboard-lead` | A02 dashboard lead | P4 | 22 |
| `a03-curriculum-roadmap-lead` | A03 curriculum roadmap lead | P3 | 30 |
| `a15-adaptive-engine-lead` | A15 adaptive engine lead | P4 | 9 |

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
| `codex-a01-app-shell-closure` | `codex/A01-app-shell-closure` | dirty-open-decision | dirty 26 |
| `codex-a01-shell-lazy-load` | `codex/A01-shell-lazy-load` | dirty-open-decision | dirty 8 |
| `codex-a02-a15-dashboard-adaptive-closure` | `codex/A02-A15-dashboard-adaptive-closure` | dirty-open-decision | dirty 30 |
| `codex-a03-roadmap-closure` | `codex/A03-roadmap-closure` | dirty-open-decision | dirty 30 |

## 4. A04/A05/A18/A21/A23/A24 practice, lesson, and content evidence

Plan tasks: Task 5 Step 4; Task 5 Step 5; Task 6 Step 1

Purpose: Close practice, lesson, content QA, RAG, integration, and exact-layer packages without unreviewed live promotion.

Blocked until: Owner authorizes every selected final state and exact Git operation needed for this wave.

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
| `a04-practice-lead` | A04 practice lead | P3 | 59 |
| `a05-lesson-lead` | A05 lesson lead | P3 | 128 |
| `a18-curriculum-qa-a21-content-pipeline` | A18 curriculum QA / A21 content pipeline | P3 | 30 |
| `a18-curriculum-qa-and-content-quality-lead` | A18 curriculum QA and content quality lead | P4 | 1 |
| `a21-content-pipeline-and-rag-operations` | A21 content pipeline and RAG operations | P3 | 74 |
| `a23-integration-and-promotion-lead` | A23 integration and promotion lead | P4 | 2 |
| `a24-illustration-exact-layer` | A24 illustration exact-layer | P4 | 6 |

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
| `codex-california-practice-beta-clean` | `codex/california-practice-beta-clean` | clean-diverged-open-decision | behind 14, ahead 1 |
| `codex-a04-practice-closure` | `codex/A04-practice-closure` | dirty-open-decision | dirty 56 |
| `codex-a05-lesson-checklist-p0` | `codex/A05-lesson-checklist-p0` | clean-diverged-open-decision | behind 2, ahead 0 |
| `codex-a05-lesson-closure` | `codex/A05-lesson-closure` | dirty-open-decision | dirty 126 |
| `codex-a05-lesson-pep-load` | `codex/A05-lesson-pep-load` | clean-diverged-open-decision | behind 2, ahead 0 |
| `codex-a05-next-item-button-scroll` | `codex/A05-next-item-button-scroll` | clean-diverged-open-decision | behind 2, ahead 0 |
| `codex-a18-a21-content-evidence-closure` | `codex/A18-A21-content-evidence-closure` | dirty-open-decision | dirty 222 |

## 5. A06/A07/A09/A11/A13/A14/A16/A17/A20 runtime and QA surfaces

Plan tasks: Task 5 Step 6; Task 5 Step 7; Task 5 Step 8; Task 5 Step 9; Task 6 Step 2

Purpose: Close the remaining visualization, AI tutor, copy, QA, console, research, motivation, and game packages.

Blocked until: Owner authorizes every selected final state and exact Git operation needed for this wave.

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
| `a06-visualization-lead` | A06 visualization lead | P2 | 460 |
| `a07-ai-tutor-lead` | A07 AI tutor lead | P4 | 12 |
| `a09-copy-i18n-accessibility` | A09 copy, i18n, accessibility | P4 | 5 |
| `a11-qa-and-release-quality` | A11 QA and release quality | P2 | 62 |
| `a13-teacher-console` | A13 teacher console | P4 | 36 |
| `a14-parent-console` | A14 parent console | P4 | 7 |
| `a17-gamification-and-motivation` | A17 gamification and motivation | P4 | 5 |
| `a20-game-design-and-game-based-learning` | A20 game design and game-based learning | P4 | 16 |
| `a13-teacher-console-lead` | A13 teacher console lead | P4 | 1 |

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
| `codex-a06-manim-three-closure` | `codex/A06-manim-three-closure` | dirty-open-decision | dirty 351 |
| `codex-a06-visualization-closure` | `codex/A06-visualization-closure` | dirty-open-decision | dirty 437 |
| `codex-visualization-production-release` | `codex/visualization-production-release` | dirty-open-decision | dirty 16 |
| `codex-a07-ai-tutor-classroom-switches` | `codex/A07-ai-tutor-classroom-switches` | dirty-open-decision | dirty 82 |
| `codex-a07-ai-tutor-closure` | `codex/A07-ai-tutor-closure` | dirty-open-decision | dirty 12 |
| `codex-a09-copy-i18n-accessibility-closure` | `codex/A09-copy-i18n-accessibility-closure` | dirty-open-decision | dirty 5 |
| `codex-a11-fix-126-128-129` | `codex/A11-fix-126-128-129` | dirty-open-decision | dirty 41 |
| `codex-a11-regression-evidence-closure` | `codex/A11-regression-evidence-closure` | dirty-open-decision | dirty 62 |
| `codex-a14-profile-avatar-save` | `codex/A14-profile-avatar-save` | dirty-open-decision | dirty 10 |
| `codex-a13-a14-console-closure` | `codex/A13-A14-console-closure` | dirty-open-decision | dirty 43 |
| `codex-a16-research-evidence-closure` | `codex/A16-research-evidence-closure` | dirty-open-decision | dirty 6 |
| `codex-a17-a20-game-motivation-closure` | `codex/A17-A20-game-motivation-closure` | dirty-open-decision | dirty 21 |

## 6. Final root and compose/legacy lifecycle closure

Plan tasks: Task 7

Purpose: Close root main and remaining compose or legacy physical lifecycle records after owner packages are resolved.

Blocked until: Owner authorizes every selected final state and exact Git operation needed for this wave.

### Owner Package Approvals

| Approval ID | Owner | Priority | Entries |
| --- | --- | ---: | ---: |
| _none_ |  |  |  |

### Physical Lifecycle Approvals

| Approval ID | Branch | State | Current blocker |
| --- | --- | --- | --- |
| `root-main` | `main` | dirty-open-decision | dirty 6604 |
| `codex-a10-a22-a08-a12-a06-compose-20260628` | `codex/A10-A22-A08-A12-A06-compose-20260628` | dirty-open-decision | dirty 954 |
| `codex-a25-full-dirty-compose-verification` | `codex/A25-full-dirty-compose-verification` | dirty-open-decision | dirty 2423 |
| `codex-a19-vercel-postgres-region` | `codex/A19-vercel-postgres-region` | clean-diverged-open-decision | behind 2, ahead 8 |
| `codex-s22-release-hygiene-2026-06-15` | `codex/s22-release-hygiene-2026-06-15` | clean-diverged-open-decision | behind 14, ahead 1 |

