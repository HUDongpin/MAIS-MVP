# A25 Wave 01 Package Resync Execution Packet

Generated: 2026-07-06T15:47:23.341Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Expanded dirty entries: 5183

Source approval requests: `coordination/release-intake/latest-A25-wave01-package-resync-approval-requests.json`

This is an execution-readiness packet, not authorization. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID, selected action, and command.

## Summary

- Execution rows: 1
- Rows requiring exact owner authorization: 1
- Cleanup-authorized rows: 0
- Executable rows: 0

## Execution Rows

| # | Approval ID | Owner | Path | Selected action | Exact command | Executable now |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `wave01-resync-01-tsconfig-json` | A10 tooling, docs, and report | `tsconfig.json` | owner-approved-package-restore | `git restore --source=HEAD -- tsconfig.json` | no |

## Execution Details

### 1. wave01-resync-01-tsconfig-json

- Owner: A10 tooling, docs, and report
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Branch: `codex/A25-dirty-closure-governance`
- Path: `tsconfig.json`
- Selected action: owner-approved-package-restore
- Exact command, if later authorized: `git restore --source=HEAD -- tsconfig.json`
- Cleanup authorized: false
- Executable now: false
- Required authorization:

```text
Authorize approvalId=wave01-resync-01-tsconfig-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=tsconfig.json; selectedAction=owner-approved-package-restore; command=git restore --source=HEAD -- tsconfig.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

- Pre-execution checks:
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-no-staged-changes.mjs --json`
  - `git -C /Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance status --short -- tsconfig.json`
- Post-execution checks:
  - `npm run release:dirty-map -- --reason "A25 Wave 01 resync execution wave01-resync-01-tsconfig-json"`
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-execution-packet.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-execution-packet-current.mjs`
  - `node coordination/release-intake/assert-no-staged-changes.mjs --json`
- Stop condition: Do not execute this row unless the owner authorizes this exact approvalId, selectedAction, exactCommand, worktreePath, path, approvedBy, and approvedAt.

