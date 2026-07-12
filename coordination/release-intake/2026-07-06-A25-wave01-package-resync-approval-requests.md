# A25 Wave 01 Package Resync Approval Requests

Generated: 2026-07-06T15:47:23.289Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Expanded dirty entries: 5183

Wave 01 worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`

This is an approval-request artifact, not authorization. It does not approve staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, worktree removal, file restore, file deletion, or any other physical cleanup. Every row remains non-executable until the owner explicitly authorizes the exact approval ID and command.

## Summary

- Requests: 1
- Package-only requests: 1
- Cleanup-authorized rows: 0
- Executable rows: 0

## Requests

| Approval ID | Owner | Path | Action kind | Command hint |
| --- | --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | A10 tooling, docs, and report | `tsconfig.json` | owner-approved-package-restore | `git restore --source=HEAD -- tsconfig.json` |

## Approval Details

### wave01-resync-01-tsconfig-json

- Owner: A10 tooling, docs, and report
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Branch: `codex/A25-dirty-closure-governance`
- Path: `tsconfig.json`
- Action kind: owner-approved-package-restore
- Cleanup authorized: false
- Executable now: false
- Authorization text:

```text
Authorize approvalId=wave01-resync-01-tsconfig-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=tsconfig.json; selectedAction=owner-approved-package-restore; command=git restore --source=HEAD -- tsconfig.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

- Post-approval checks:
  - `node coordination/release-intake/generate-wave01-governance-readiness.mjs`
  - `node coordination/release-intake/assert-wave01-governance-readiness-current.mjs`
  - `node coordination/release-intake/generate-wave01-package-resync-approval-requests.mjs`
  - `node coordination/release-intake/assert-wave01-package-resync-approval-requests-current.mjs`
  - `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`

