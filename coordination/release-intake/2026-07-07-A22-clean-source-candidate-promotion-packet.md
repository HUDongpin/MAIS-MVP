# A22 Clean Source Candidate Promotion Packet

Generated: 2026-07-07T15:31:19.188Z

Dirty map signature: `84e0553381630f5c29322b7cd071032a65d4d5b479cd222bba15314f9269b4e0`

Expanded dirty entries: 5717

This packet is evidence-only. It ranks clean worktree candidates for review order, but it does not select a release source, create a clone, create or remove a worktree, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, or authorize cleanup.

## Summary

- Promotion status: blocked-before-clean-source-promotion
- Promotion eligible now: no
- Release source selected: no
- Candidate rows: 9
- Reviewable clean-slice rows: 5
- Stale clean-branch rows: 4
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate lane: clean-diverged-slice-review
- Pending canonical authorization rows: 39
- Current focus rows: 0
- Package/worktree type-check error lines: 9907
- Cleanup-authorized rows: 0
- Executable rows: 0

## Candidate Ranking

Clean does not mean deployable. A clean-diverged slice still needs owner review, candidate-specific type/build/regression gates, A22 clean-source selection evidence, and a separate owner merge instruction.

| Rank | Branch | Promotion lane | Divergence | Promotion eligible now | Blockers | Recommended review action |
| ---: | --- | --- | --- | --- | ---: | --- |
| 1 | `codex/A22-us-region-alignment` | clean-diverged-slice-review | behind 2, ahead 1 | no | 8 | Review as a clean diverged slice candidate only after owner-package authorization backlog and candidate-specific gates are green. |
| 2 | `codex/A10-A22-release-governance` | clean-diverged-slice-review | behind 2, ahead 2 | no | 8 | Review as a clean diverged slice candidate only after owner-package authorization backlog and candidate-specific gates are green. |
| 3 | `codex/A19-vercel-postgres-region` | clean-diverged-slice-review | behind 2, ahead 8 | no | 8 | Review as a clean diverged slice candidate only after owner-package authorization backlog and candidate-specific gates are green. |
| 4 | `codex/california-practice-beta-clean` | clean-diverged-slice-review | behind 14, ahead 1 | no | 8 | Review as a clean diverged slice candidate only after owner-package authorization backlog and candidate-specific gates are green. |
| 5 | `codex/s22-release-hygiene-2026-06-15` | clean-diverged-slice-review | behind 14, ahead 1 | no | 8 | Review as a clean diverged slice candidate only after owner-package authorization backlog and candidate-specific gates are green. |
| 6 | `codex/A25-ci-backup-workflow` | stale-clean-branch-review | behind 1, ahead 0 | no | 9 | Review for archive or retirement before treating it as release-source evidence. |
| 7 | `codex/A05-lesson-checklist-p0` | stale-clean-branch-review | behind 2, ahead 0 | no | 9 | Review for archive or retirement before treating it as release-source evidence. |
| 8 | `codex/A05-lesson-pep-load` | stale-clean-branch-review | behind 2, ahead 0 | no | 9 | Review for archive or retirement before treating it as release-source evidence. |
| 9 | `codex/A05-next-item-button-scroll` | stale-clean-branch-review | behind 2, ahead 0 | no | 9 | Review for archive or retirement before treating it as release-source evidence. |

## Promotion Blockers

| ID | Owner | Status | Count | Detail |
| --- | --- | --- | ---: | --- |
| `no-selected-clean-source` | A22 production reliability and release engineering | blocked | 1 | No clean worktree, clean clone, reviewed clean slice, or owner-approved pruned staging package has been selected. |
| `candidate-specific-gates-missing` | A22 production reliability and release engineering | blocked | 9 | No candidate-specific type/build/regression gate is recorded for any clean worktree candidate. |
| `canonical-authorization-backlog` | A25 git hygiene and release intake | blocked | 39 | Canonical authorization rows remain before validate-to-merge can advance. |
| `merge-not-authorized` | Owner | not-authorized | 1 | No separate owner merge instruction is recorded. |

## Safe Validation Commands

- `npm run release:dirty-map -- --assert-current --max-age-minutes 60`
- `node coordination/release-intake/assert-a22-clean-release-source-runway-current.mjs`
- `node coordination/release-intake/assert-worktree-lifecycle.mjs`
- `node coordination/release-intake/assert-validate-to-merge-exit-criteria-current.mjs`
- `node coordination/release-intake/assert-a22-clean-source-candidate-promotion-packet-current.mjs`

## Boundary

Every candidate remains non-executable. This packet does not authorize clean-source promotion, cleanup, merge, deploy, destructive Git, dirty-root deploy, or physical lifecycle cleanup.
