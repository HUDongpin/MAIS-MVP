# A25 Wave 01 Package Resync Owner Authorization Template

Generated: 2026-07-07T15:56:24.966Z

Dirty map signature: `21bf7897e245ce5bceb31315d088e7024d2e12aa53a9a098945ea69c3440b015`

Expanded dirty entries: 5728

Execution packet generated: 2026-07-07T15:56:24.644Z

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

