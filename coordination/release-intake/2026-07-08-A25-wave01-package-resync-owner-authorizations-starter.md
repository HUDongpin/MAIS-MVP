# A25 Wave 01 Package Resync Owner Authorizations Starter

Generated: 2026-07-08T14:13:18.240Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

Source template generated: 2026-07-08T14:13:18.153Z

Target authorization file: `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorizations.json`

This is a starter artifact only, not authorization. It does not create or update the target authorization file. It does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, or any physical cleanup.

## Summary

- Starter rows: 1
- Blank approval rows: 1
- Cleanup-authorized rows: 0
- Executable rows: 0

## Starter Rows

| Approval ID | Owner | Path | Selected action | Approval fields | Executable now |
| --- | --- | --- | --- | --- | --- |
| `wave01-resync-01-tsconfig-json` | A10 tooling, docs, and report | `tsconfig.json` | owner-approved-package-restore | blank | no |

## Starter Details

### wave01-resync-01-tsconfig-json

- Owner: A10 tooling, docs, and report
- Worktree: `/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance`
- Branch: `codex/A25-dirty-closure-governance`
- Path: `tsconfig.json`
- Selected action: owner-approved-package-restore
- Exact command: `git restore --source=HEAD -- tsconfig.json`
- Approval fingerprint: `cc775f9bb55a3102e8030b6ede30d728470f806791e2608a9651dd24b4453183`
- Approved by: (blank)
- Approved at: (blank)
- Cleanup authorized: false
- Executable now: false
- Required evidence reviewed:
  - `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template.json`
  - `coordination/release-intake/latest-A25-wave01-package-resync-execution-packet.json`
  - `coordination/release-intake/latest-A25-wave01-package-resync-owner-authorization-template-current-gate.json`
  - `coordination/release-intake/latest-A25-wave01-package-resync-execution-packet-current-gate.json`
- Authorization text:

```text
Authorize approvalId=wave01-resync-01-tsconfig-json; worktree=/Users/dongpinhu/.config/superpowers/worktrees/MAIS-MVP/A25-dirty-closure-governance; path=tsconfig.json; selectedAction=owner-approved-package-restore; command=git restore --source=HEAD -- tsconfig.json; approvedBy=<owner>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

