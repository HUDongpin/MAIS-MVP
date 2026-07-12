# A22 Owner-Remediation Candidate Dirty Allowlist

- Artifact kind: `a22-owner-remediation-candidate-dirty-allowlist`
- Target worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A22-us-region-alignment`
- Allowlist rows: 3
- Verified rows: 3
- Current candidate status rows: 7
- Allowed dirty status rows: 3
- Ready for promotion allowlist: true
- Cleanup-authorized rows: 0
- Executable rows: 0

## Rows

| Unit ID | Owner | Verification kind | Candidate target | Status row | Verification | Contract/root match | Owner scope allowed | Status row present |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `a20-math-match-quest-data-parity` | `A20` | `same-path-copy` | `data/gameBasedLearning.ts` | `?? data/gameBasedLearning.ts` | verified | yes | yes | yes | |
| `a10-a22-package-json-dependency-parity` | `A10` | `package-json-dependency-contract` | `package.json` | ` M package.json` | verified | yes | yes | yes | |
| `a10-a22-package-lock-dependency-parity` | `A10` | `package-lock-dependency-contract` | `package-lock.json` | ` M package-lock.json` | verified | yes | yes | yes | |

## Boundary

This artifact only explains bounded A20-owned and A10/A22 package-dependency owner-remediation dirty rows already present in the A22 candidate. It does not authorize staging, commit, merge, cleanup, deploy, destructive Git, or physical lifecycle cleanup.
