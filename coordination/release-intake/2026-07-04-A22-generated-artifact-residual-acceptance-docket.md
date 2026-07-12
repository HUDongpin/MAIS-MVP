# A22 Generated Artifact Residual Acceptance Docket

Generated: 2026-07-04T15:49:55.618Z

Dirty map signature: `0ed815279a9afc7897df7ef48f2e250da494e4a227adc0a6da14547ba9048571`

Expanded dirty entries: 4323

This docket is evidence-only. It summarizes the A22-owned generated-artifact residual cleanup decision surface for human review, but it does not create the authorization file, record owner approval, authorize cleanup, execute cleanup, delete files, run destructive Git, stage, commit, merge, push, deploy, remove worktrees, or modify generated artifacts.

## Summary

- Status: ready-for-owner-decision
- Residual targets: 2
- Total size: 45.35 GiB
- `.tmp` size: 45.08 GiB
- `.next` size: 0.26 GiB
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
| 1 | `a22-generated-residual-tmp` | `.tmp` | 45.08 | 18888 | 37624 | `50d3d48b4be77f67b33b9c355e8bbdd7ba6452766b4eda1cfc0607e98965d44b` | no | no |
| 2 | `a22-generated-residual-next` | `.next` | 0.26 | 49 | 170 | `c2a1554fe695b50b7c683da3e11e7ff282045bb0acb5da1341944e5f09326900` | no | no |

## Acceptance Checks

| # | Check | Status | Meaning | Evidence |
| ---: | --- | --- | --- | --- |
| 1 | `source-currentness-green` | pass | A22 residual authorization packet is current | sourceCurrentnessFailures=0 |
| 2 | `two-residual-targets` | pass | Exactly two generated-artifact residual targets are in scope | rows=2 paths=.next,.tmp |
| 3 | `large-byte-risk-visible` | pass | Large generated-artifact byte risk is visible before owner decision | totalGiB=45.35 |
| 4 | `cleanup-script-apply-only` | pass | Rows are limited to cleanup-generated-artifacts script apply | cleanupScriptApplyRows=2 exactDirectoryRemovalRows=0 |
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

### 1. `a22-generated-residual-tmp`

```text
Authorize approvalId=a22-generated-residual-tmp; target=.tmp; selectedAction=owner-approved-generated-artifact-cleanup-script-apply; command=node scripts/cleanup-generated-artifacts.mjs --apply --scope all; evidenceReviewed=coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json, coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json; approvedBy=<owner/A22>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```

### 2. `a22-generated-residual-next`

```text
Authorize approvalId=a22-generated-residual-next; target=.next; selectedAction=owner-approved-generated-artifact-cleanup-script-apply; command=node scripts/cleanup-generated-artifacts.mjs --apply --scope all; evidenceReviewed=coordination/release-intake/latest-A22-generated-artifact-residual-evidence.json, coordination/release-intake/latest-A22-generated-artifact-residual-authorization-packet.json; approvedBy=<owner/A22>; approvedAt=<ISO-8601>; notes=<scope, evidence reviewed, accepted risk>
```


## Post-Decision Validation Commands

- `node coordination/release-intake/assert-a22-generated-artifact-residual-acceptance-docket-current.mjs`
- `node coordination/release-intake/assert-next-owner-authorizations-current.mjs`
- `node coordination/release-intake/assert-dirty-worktree-remediation-current.mjs`
- `node coordination/release-intake/assert-no-staged-changes.mjs --json`

## Boundary

Every row remains non-executable. This acceptance docket does not create the authorization file and does not authorize cleanup apply, file deletion, destructive Git, merge, push, deploy, or worktree removal.
