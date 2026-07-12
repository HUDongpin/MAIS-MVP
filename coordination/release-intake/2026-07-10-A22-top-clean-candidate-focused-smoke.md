# A22 Top Clean Candidate Focused Smoke

Generated: 2026-07-10T15:58:35.872Z

Dirty map signature: `37c9d353a7710b8e92d3d766006b7230936ca194044a47770a99ab12d7c6cef1`

Expanded dirty entries: 7221

This evidence runs only the focused A22 Vercel region smoke in the top clean candidate worktree. It does not run type-check, run build, select a release source, stage, commit, merge, push, deploy, delete, reset, restore, clean, prune, record owner approval, record execution instruction, or authorize cleanup.

## Summary

- Smoke status: passed
- Top candidate branch: `codex/A22-us-region-alignment`
- Top candidate path: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Script present: yes
- Command: `/usr/local/bin/node scripts/vercel-region-config.test.mjs`
- Command cwd: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Tests: 2
- Pass: 2
- Fail: 0
- Worktree status entries before smoke: 7
- Worktree status entries after smoke: 7
- Bounded dirty accepted: yes
- Worktree status allowed before smoke: yes
- Worktree status allowed after smoke: yes
- Mutation detected: no
- Promotion eligible now: no
- Release source selected: no
- Cleanup-authorized rows: 0
- Executable rows: 0

## Validation Rows

| ID | Owner | Status | Passed | Detail |
| --- | --- | --- | --- | --- |
| `focused-smoke-script-present` | A22 production reliability and release engineering | passed | yes | Focused Vercel region smoke script exists in the top candidate worktree. |
| `focused-smoke-command-passed` | A22 production reliability and release engineering | passed | yes | Node test exit=0; tests=2; pass=2; fail=0. |
| `focused-smoke-no-mutation` | A25 git hygiene and release intake | passed | yes | Candidate worktree status stayed within allowed bounds before/after smoke; mutationDetected=false. |

## Boundary

Focused smoke passing makes one validation row stronger. It does not make the candidate deployable: candidate-specific type-check, build, clean-source selection, and merge authorization remain required.
