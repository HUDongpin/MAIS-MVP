# A25 Root Type-Check Status

Generated: 2026-07-07T15:07:20.340Z

This is A25-owned verification evidence only. It separates the current dirty-root TypeScript gate from owner-package/worktree type-check frontiers. It does not authorize staging, committing, merging, cleanup, destructive Git, worktree removal, branch deletion, deploy, or dirty-root release.

## Summary

- Root type-check layer: dirty-root-current-install
- Root command: `npm run type-check -- --pretty false`
- Root type-check passed: yes
- Root type-check status: 0
- Root type-check error lines: 0
- Package/worktree type-check error lines: 9907
- Package frontier rows: 12
- Critical owner rows: 6
- Layer comparison: root-green-package-worktree-red
- Interpretation: Root type-check currently passes in the dirty root install, while owner-package/worktree gates still report type-check blockers. Treat these as separate evidence layers.
- Source currentness failures: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Root Top Errors

| File | Errors |
| --- | ---: |
| none | 0 |

## Root First Errors

- none

## Boundary

This artifact is evidence-only. A green root type-check does not make the dirty root a deploy source and does not override A22 release-source cleanliness, A25 strict lifecycle, owner authorization, execution-instruction, merge, or cleanup gates.
