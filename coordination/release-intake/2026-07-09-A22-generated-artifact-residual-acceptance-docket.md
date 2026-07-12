# A22 Generated Artifact Residual Acceptance Docket

Generated: 2026-07-09T14:00:26.239Z

Dirty map signature: `b3d232fd2b9ef81d4efc95903d2e3b316db664d6e9ec6ab366181395b3966be7`

Expanded dirty entries: 6604

This docket is evidence-only. It summarizes the A22-owned generated-artifact residual cleanup decision surface for human review, but it does not create the authorization file, record owner approval, authorize cleanup, execute cleanup, delete files, run destructive Git, stage, commit, merge, push, deploy, remove worktrees, or modify generated artifacts.

## Summary

- Status: ready-for-owner-decision
- Residual targets: 2
- Total size: 2.21 GiB
- `.tmp` size: 0.18 GiB
- `.next` size: 2.03 GiB
- Cleanup-script apply rows: 2
- Exact directory-removal rows: 0
- Copyable authorization texts: 2
- Acceptance checks: 9/9
- Source currentness failures: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Residual Digest

| # | Approval ID | Path | GiB | Directories | Files | Manifest SHA-256 | Cleanup authorized | Executable |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | `a22-generated-residual-next` | `.next` | 2.03 | 981 | 1936 | `9e984847977a0a603a21fe3ded7bede613009911aba0f6748c3fa426250376b6` | no | no |
| 2 | `a22-generated-residual-tmp` | `.tmp` | 0.18 | 821 | 2689 | `6cd360673ac843e0338496061f65f7b2febd564b4fd9bc37124395c16c7f854d` | no | no |

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | `source-currentness-green` | pass | A22 residual authorization packet is current | sourceCurrentnessFailures=0 |
| 2 | `supported-residual-targets` | pass | Generated-artifact residual targets are limited to supported cleanup surfaces | rows=2 paths=.next,.tmp |
| 3 | `byte-risk-visible` | pass | Generated-artifact byte risk is visible before owner decision | totalGiB=2.21 |
| 4 | `bounded-cleanup-actions` | pass | Rows are limited to cleanup script apply or exact evidence-protected directory removal | cleanupScriptApplyRows=2 exactDirectoryRemovalRows=0 |
| 5 | `non-executable-boundary` | pass | No residual cleanup row is executable or cleanup-authorized | cleanup=0 executable=0 |
| 6 | `required-authorization-texts-present` | pass | Each row has copyable owner/A22 authorization text | texts=2/2 |
| 7 | `prechecks-present` | pass | Each row requires dry-run, residual evidence, and no-staged checks first | rowsWithPrechecks=2/2 |
| 8 | `post-approval-validation-present` | pass | Each row names post-approval refresh/currentness checks | rowsWithPostChecks=2/2 |
| 9 | `evidence-only-boundary` | pass | Authorization packet boundary is evidence-only | evidenceOnly=true fileDeletion=false |

## Owner Decision Docket

Target authorization file: `coordination/release-intake/latest-A25-next-owner-authorizations.json`

Owner: A22 production reliability and release engineering

Caution: This docket is for owner review only. It does not authorize cleanup apply, file deletion, destructive Git, deploy, or execution instructions.

## Copyable Authorization Texts

These texts are review templates only. They become active only after the owner records approval in the canonical owner-authorization input and validators accept them. They still do not run cleanup by themselves.

### 1. `a22-generated-residual-next`

```text
Authorize approvalId=a22-generated-residual-next; target=.next; selectedAction=owner-approved-generated-artifact-cleanup-script-apply; command=node scripts/cleanup-generated-artifacts.mjs --apply --scope all; evidenceReviewed=coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json, coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json; approvedBy=<owner/A22>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 2. `a22-generated-residual-tmp`

```text
Authorize approvalId=a22-generated-residual-tmp; target=.tmp; selectedAction=owner-approved-generated-artifact-cleanup-script-apply; command=node scripts/cleanup-generated-artifacts.mjs --apply --scope all; evidenceReviewed=coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json, coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json; approvedBy=<owner/A22>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```


## Post-Decision Validation Commands

- `node coordination/release-intake/assert-a22-generated-artifact-residual-acceptance-docket-current.mjs`
- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/assert-no-staged-changes.mjs --json`

## Boundary

Every row remains non-executable. This acceptance docket does not create the authorization file and does not authorize cleanup apply, file deletion, destructive Git, merge, push, deploy, or worktree removal.
