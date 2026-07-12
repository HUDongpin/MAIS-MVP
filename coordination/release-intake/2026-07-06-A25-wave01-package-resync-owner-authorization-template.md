# A25 Wave 01 Package Resync Owner Authorization Template

Generated: 2026-07-06T15:47:23.663Z

Dirty map signature: `b26fe39c438a20cdbb9cf3943e3d000d9dc8dc04ccccedc13792c457c5942d3b`

Expanded dirty entries: 5183

Execution packet generated: 2026-07-06T15:47:23.341Z

This is a template, not authorization. To authorize any row, the owner must create or update `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json` with the exact approval ID, selected action, exact command, approvedBy, approvedAt, evidence reviewed, and notes. This template does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Template rows: 1
- Pending rows: 1
- Cleanup-authorized rows: 0
- Executable rows: 0

## Template Rows

| Approval ID | Owner | Path | Selected action | Status | Executable now |
| --- | --- | --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | A10 tooling, docs, and report | `tsconfig.json` | owner-approved-package-restore | pending | no |

## Authorization Details

### wave01-resync-01-tsconfig-json

- Owner: A10 tooling, docs, and report
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Branch: `codex/A25-dirty-closure-governance`
- Path: `tsconfig.json`
- Selected action: owner-approved-package-restore
- Exact command, if later authorized: `git restore --source=HEAD -- tsconfig.json`
- Approval status: pending
- Cleanup authorized: false
- Executable now: false
- Authorization text to paste after owner review:

```text
Authorize approvalId=wave01-resync-01-tsconfig-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=tsconfig.json; selectedAction=owner-approved-package-restore; command=git restore --source=HEAD -- tsconfig.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

