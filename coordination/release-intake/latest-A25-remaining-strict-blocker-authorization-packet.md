# A25 Remaining Strict Blocker Authorization Packet

Generated: 2026-07-10T17:08:26.119Z

Dirty map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

Expanded dirty entries: 7636

Strict remediation status: fail

Strict checks: 2/4

This packet is an authorization request, not authorization. It does not approve staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, or any other physical cleanup. A25/A22 must keep the dirty root out of release use until the strict gates pass.

## Remaining Strict Blockers

| Blocker | Owner | Status | Authorization needed |
| --- | --- | --- | --- |
| A22 release-source clean gate | A22 production reliability and release engineering | blocked | Root must become clean through reviewed owner-package commits, exact-path discards, archives, or retained blockers before any release-source use. |
| A25 strict worktree lifecycle gate | A25 git hygiene and release intake | blocked | Every live dirty or diverged worktree needs owner-approved commit/extraction, archive, retirement, removal, or continued blocker disposition. |

## Physical Lifecycle Decisions Still Requiring Action

| Ledger ID | Branch | State | Current blocker | Authorization needed |
| --- | --- | --- | --- | --- |
| `physical:root-main` | main | dirty-open-decision | dirty 7636 | Owner packages must be reviewed, committed/extracted, archived, or explicitly discarded before root can become a clean release source. |
| `physical:codex-a01-app-shell-closure` | codex/A01-app-shell-closure | dirty-open-decision | dirty 26 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a01-shell-lazy-load` | codex/A01-shell-lazy-load | dirty-open-decision | dirty 8 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a02-a15-dashboard-adaptive-closure` | codex/A02-A15-dashboard-adaptive-closure | dirty-open-decision | dirty 30 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a03-roadmap-closure` | codex/A03-roadmap-closure | dirty-open-decision | dirty 30 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a04-practice-closure` | codex/A04-practice-closure | dirty-open-decision | dirty 56 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a05-lesson-checklist-p0` | codex/A05-lesson-checklist-p0 | clean-diverged-open-decision | behind 2, ahead 0 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-a05-lesson-closure` | codex/A05-lesson-closure | dirty-open-decision | dirty 126 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a05-lesson-pep-load` | codex/A05-lesson-pep-load | clean-diverged-open-decision | behind 2, ahead 0 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-a05-next-item-button-scroll` | codex/A05-next-item-button-scroll | clean-diverged-open-decision | behind 2, ahead 0 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-a06-manim-three-closure` | codex/A06-manim-three-closure | dirty-open-decision | dirty 351 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a06-visualization-closure` | codex/A06-visualization-closure | dirty-open-decision | dirty 437 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a07-a15-a08-ai-adaptive-types` | codex/A07-A15-A08-ai-adaptive-types | dirty-open-decision | dirty 30 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a07-ai-tutor-classroom-switches` | codex/A07-ai-tutor-classroom-switches | dirty-open-decision | dirty 82 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a07-ai-tutor-closure` | codex/A07-ai-tutor-closure | dirty-open-decision | dirty 12 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a08-a12-shared-contract-closure` | codex/A08-A12-shared-contract-closure | dirty-open-decision | dirty 186 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a09-copy-i18n-accessibility-closure` | codex/A09-copy-i18n-accessibility-closure | dirty-open-decision | dirty 5 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a10-a22-a08-a12-a06-compose-20260628` | codex/A10-A22-A08-A12-A06-compose-20260628 | dirty-open-decision | dirty 954 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a10-a22-release-governance` | codex/A10-A22-release-governance | clean-diverged-open-decision | behind 2, ahead 2 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-a11-fix-126-128-129` | codex/A11-fix-126-128-129 | dirty-open-decision | dirty 41 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a11-regression-evidence-closure` | codex/A11-regression-evidence-closure | dirty-open-decision | dirty 62 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a12-google-oauth-login` | codex/A12-google-oauth-login | dirty-open-decision | dirty 16 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a12-userstore-storage-contract` | codex/A12-userstore-storage-contract | dirty-open-decision | dirty 170 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a13-a14-console-closure` | codex/A13-A14-console-closure | dirty-open-decision | dirty 43 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a16-research-evidence-closure` | codex/A16-research-evidence-closure | dirty-open-decision | dirty 6 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a17-a20-game-motivation-closure` | codex/A17-A20-game-motivation-closure | dirty-open-decision | dirty 21 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a18-a21-content-evidence-closure` | codex/A18-A21-content-evidence-closure | dirty-open-decision | dirty 222 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a19-vercel-postgres-region` | codex/A19-vercel-postgres-region | clean-diverged-open-decision | behind 2, ahead 8 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-a22-missing-module-release-slice` | codex/A22-missing-module-release-slice | dirty-open-decision | dirty 1017 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a22-next-15-5-19-audit` | codex/A22-next-15-5-19-audit | dirty-open-decision | dirty 4 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a22-p1-release-hygiene-security` | codex/A22-p1-release-hygiene-security | dirty-open-decision | dirty 27 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a22-us-region-alignment` | codex/A22-us-region-alignment | dirty-open-decision | dirty 7 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a25-ci-backup-workflow` | codex/A25-ci-backup-workflow | clean-diverged-open-decision | behind 1, ahead 0 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-a25-dirty-closure-governance` | codex/A25-dirty-closure-governance | dirty-open-decision | dirty 1012 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a25-full-dirty-compose-verification` | codex/A25-full-dirty-compose-verification | dirty-open-decision | dirty 2423 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-a14-profile-avatar-save` | codex/A14-profile-avatar-save | dirty-open-decision | dirty 10 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-visualization-production-release` | codex/visualization-production-release | dirty-open-decision | dirty 16 | Owning agent must review dirty changes, then choose commit/package extraction, exact-path discard, retained evidence archive, approved worktree removal after closure, or continued blocker handling. |
| `physical:codex-california-practice-beta-clean` | codex/california-practice-beta-clean | clean-diverged-open-decision | behind 14, ahead 1 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |
| `physical:codex-s22-release-hygiene-2026-06-15` | codex/s22-release-hygiene-2026-06-15 | clean-diverged-open-decision | behind 14, ahead 1 | Owner must choose PR/review package, archive-state record, branch/worktree retirement, or continued blocker handling for the diverged branch. |

## Required Approval Shape

For any physical cleanup action, the owner must name the exact approval ID, branch/worktree/pathspec scope, selected action, evidence reviewed, approver, timestamp, and accepted risk. Commands must be executed only after that exact approval and only inside the approved scope.
