# A25 Strict Worktree Lifecycle Blocker Evidence

Generated: 2026-07-10T17:12:12.222Z

Strict lifecycle gate command: `node coordination/release-intake/assert-worktree-lifecycle.mjs --strict --json`

This is A25 release-intake evidence for the strict worktree lifecycle blocker. It records worktree state, branch names, paths, counts, divergence numbers, and hashes only. It does not copy file contents and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Strict lifecycle clean: no
- Strict lifecycle blocked: yes
- Worktrees: 39
- Dirty open decisions: 31
- Clean diverged open decisions: 8
- Open decision rows: 39
- Prunable worktrees: 0
- Cleanup-authorized rows: 0
- Executable rows: 0
- Worktree-removal-authorized rows: 0
- Branch-deletion-authorized rows: 0
- Content-captured rows: 0

## Physical Queue Snapshot

- Owner package approvals needed: 26
- Physical lifecycle approvals needed: 39
- Total approvals needed: 65
- Cleanup-authorized rows: 0
- Executable rows: 0

## Gate Output

| Gate output |
| --- |
| `A25 worktree lifecycle gate failed.` |
| `- open lifecycle decision: main: dirty (7636 entries)` |
| `- open lifecycle decision: codex/A01-app-shell-closure: dirty (26 entries)` |
| `- open lifecycle decision: codex/A01-shell-lazy-load: dirty (8 entries)` |
| `- open lifecycle decision: codex/A02-A15-dashboard-adaptive-closure: dirty (30 entries)` |
| `- open lifecycle decision: codex/A03-roadmap-closure: dirty (30 entries)` |
| `- open lifecycle decision: codex/A04-practice-closure: dirty (56 entries)` |
| `- open lifecycle decision: codex/A05-lesson-checklist-p0: behind 2, ahead 0` |
| `- open lifecycle decision: codex/A05-lesson-closure: dirty (126 entries)` |
| `- open lifecycle decision: codex/A05-lesson-pep-load: behind 2, ahead 0` |
| `- open lifecycle decision: codex/A05-next-item-button-scroll: behind 2, ahead 0` |
| `- open lifecycle decision: codex/A06-manim-three-closure: dirty (351 entries)` |
| `- open lifecycle decision: codex/A06-visualization-closure: dirty (437 entries)` |
| `- open lifecycle decision: codex/A07-A15-A08-ai-adaptive-types: dirty (30 entries)` |
| `- open lifecycle decision: codex/A07-ai-tutor-classroom-switches: dirty (82 entries)` |
| `- open lifecycle decision: codex/A07-ai-tutor-closure: dirty (12 entries)` |
| `- open lifecycle decision: codex/A08-A12-shared-contract-closure: dirty (186 entries)` |
| `- open lifecycle decision: codex/A09-copy-i18n-accessibility-closure: dirty (5 entries)` |
| `- open lifecycle decision: codex/A10-A22-A08-A12-A06-compose-20260628: dirty (954 entries)` |
| `- open lifecycle decision: codex/A10-A22-release-governance: behind 2, ahead 2` |
| `- open lifecycle decision: codex/A11-fix-126-128-129: dirty (41 entries)` |
| `- open lifecycle decision: codex/A11-regression-evidence-closure: dirty (62 entries)` |
| `- open lifecycle decision: codex/A12-google-oauth-login: dirty (16 entries)` |
| `- open lifecycle decision: codex/A12-userstore-storage-contract: dirty (170 entries)` |
| `- open lifecycle decision: codex/A13-A14-console-closure: dirty (43 entries)` |
| `- open lifecycle decision: codex/A16-research-evidence-closure: dirty (6 entries)` |
| `- open lifecycle decision: codex/A17-A20-game-motivation-closure: dirty (21 entries)` |
| `- open lifecycle decision: codex/A18-A21-content-evidence-closure: dirty (222 entries)` |
| `- open lifecycle decision: codex/A19-vercel-postgres-region: behind 2, ahead 8` |
| `- open lifecycle decision: codex/A22-missing-module-release-slice: dirty (1017 entries)` |
| `- open lifecycle decision: codex/A22-next-15-5-19-audit: dirty (4 entries)` |
| `- open lifecycle decision: codex/A22-p1-release-hygiene-security: dirty (27 entries)` |
| `- open lifecycle decision: codex/A22-us-region-alignment: dirty (7 entries)` |
| `- open lifecycle decision: codex/A25-ci-backup-workflow: behind 1, ahead 0` |
| `- open lifecycle decision: codex/A25-dirty-closure-governance: dirty (1012 entries)` |
| `- open lifecycle decision: codex/A25-full-dirty-compose-verification: dirty (2423 entries)` |
| `- open lifecycle decision: codex/A14-profile-avatar-save: dirty (10 entries)` |
| `- open lifecycle decision: codex/visualization-production-release: dirty (16 entries)` |
| `- open lifecycle decision: codex/california-practice-beta-clean: behind 14, ahead 1` |
| `- open lifecycle decision: codex/s22-release-hygiene-2026-06-15: behind 14, ahead 1` |
| `{` |
| `  "checkedAt": "2026-07-10T17:12:12.213Z",` |
| `  "root": "/Users/dongpinhu/Desktop/MAIS-MVP",` |
| `  "strict": true,` |

## Open Lifecycle Decisions

- Row signature: `f7baf0484d2a9598023b7bcfbe87c950eedd9d948dd82575337906cd8f68f1a1`
- Dirty-map signature: `e30d647e1b51432945713f42ac78b0a2466fcb17192de0235a801ac877a0801f`

| # | Branch | State | Status entries | Behind/Ahead | Executable now |
| ---: | --- | --- | ---: | --- | --- |
| 1 | `main` | dirty-open-decision | 7636 | 0/0 | no |
| 2 | `codex/A01-app-shell-closure` | dirty-open-decision | 26 | 2/0 | no |
| 3 | `codex/A01-shell-lazy-load` | dirty-open-decision | 8 | 2/0 | no |
| 4 | `codex/A02-A15-dashboard-adaptive-closure` | dirty-open-decision | 30 | 2/0 | no |
| 5 | `codex/A03-roadmap-closure` | dirty-open-decision | 30 | 2/0 | no |
| 6 | `codex/A04-practice-closure` | dirty-open-decision | 56 | 2/0 | no |
| 7 | `codex/A05-lesson-checklist-p0` | clean-diverged-open-decision | 0 | 2/0 | no |
| 8 | `codex/A05-lesson-closure` | dirty-open-decision | 126 | 2/0 | no |
| 9 | `codex/A05-lesson-pep-load` | clean-diverged-open-decision | 0 | 2/0 | no |
| 10 | `codex/A05-next-item-button-scroll` | clean-diverged-open-decision | 0 | 2/0 | no |
| 11 | `codex/A06-manim-three-closure` | dirty-open-decision | 351 | 2/0 | no |
| 12 | `codex/A06-visualization-closure` | dirty-open-decision | 437 | 2/0 | no |
| 13 | `codex/A07-A15-A08-ai-adaptive-types` | dirty-open-decision | 30 | 2/0 | no |
| 14 | `codex/A07-ai-tutor-classroom-switches` | dirty-open-decision | 82 | 2/0 | no |
| 15 | `codex/A07-ai-tutor-closure` | dirty-open-decision | 12 | 2/0 | no |
| 16 | `codex/A08-A12-shared-contract-closure` | dirty-open-decision | 186 | 2/0 | no |
| 17 | `codex/A09-copy-i18n-accessibility-closure` | dirty-open-decision | 5 | 2/0 | no |
| 18 | `codex/A10-A22-A08-A12-A06-compose-20260628` | dirty-open-decision | 954 | 2/2 | no |
| 19 | `codex/A10-A22-release-governance` | clean-diverged-open-decision | 0 | 2/2 | no |
| 20 | `codex/A11-fix-126-128-129` | dirty-open-decision | 41 | 2/0 | no |
| 21 | `codex/A11-regression-evidence-closure` | dirty-open-decision | 62 | 2/0 | no |
| 22 | `codex/A12-google-oauth-login` | dirty-open-decision | 16 | 2/0 | no |
| 23 | `codex/A12-userstore-storage-contract` | dirty-open-decision | 170 | 2/0 | no |
| 24 | `codex/A13-A14-console-closure` | dirty-open-decision | 43 | 2/0 | no |
| 25 | `codex/A16-research-evidence-closure` | dirty-open-decision | 6 | 2/0 | no |
| 26 | `codex/A17-A20-game-motivation-closure` | dirty-open-decision | 21 | 2/0 | no |
| 27 | `codex/A18-A21-content-evidence-closure` | dirty-open-decision | 222 | 2/0 | no |
| 28 | `codex/A19-vercel-postgres-region` | clean-diverged-open-decision | 0 | 2/8 | no |
| 29 | `codex/A22-missing-module-release-slice` | dirty-open-decision | 1017 | 2/0 | no |
| 30 | `codex/A22-next-15-5-19-audit` | dirty-open-decision | 4 | 2/0 | no |
| 31 | `codex/A22-p1-release-hygiene-security` | dirty-open-decision | 27 | 2/0 | no |
| 32 | `codex/A22-us-region-alignment` | dirty-open-decision | 7 | 2/1 | no |
| 33 | `codex/A25-ci-backup-workflow` | clean-diverged-open-decision | 0 | 1/0 | no |
| 34 | `codex/A25-dirty-closure-governance` | dirty-open-decision | 1012 | 2/0 | no |
| 35 | `codex/A25-full-dirty-compose-verification` | dirty-open-decision | 2423 | 2/0 | no |
| 36 | `codex/A14-profile-avatar-save` | dirty-open-decision | 10 | 1/0 | no |
| 37 | `codex/visualization-production-release` | dirty-open-decision | 16 | 14/0 | no |
| 38 | `codex/california-practice-beta-clean` | clean-diverged-open-decision | 0 | 14/1 | no |
| 39 | `codex/s22-release-hygiene-2026-06-15` | clean-diverged-open-decision | 0 | 14/1 | no |

## Boundary

Every row remains non-executable. This evidence preserves why the A25 strict worktree lifecycle gate is blocked; it does not make any root entry, linked worktree, branch, or lifecycle decision eligible for cleanup, discard, staging, commit, branch deletion, deploy, prune, or worktree removal.
