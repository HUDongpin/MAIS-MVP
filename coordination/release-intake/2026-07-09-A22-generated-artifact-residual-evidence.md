# A22 Generated Artifact Residual Evidence

Generated: 2026-07-09T14:00:25.349Z

Cleanup dry-run command: `node scripts/cleanup-generated-artifacts.mjs --dry-run --json`

This is A25 release-intake evidence for A22-owned generated-artifact cleanup. It records only residual target structure, byte counts, and manifest hashes. It does not copy file contents into this report and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Residual targets: 2
- Scratch baseline targets: 0
- Known stable bytes: 2372128553
- Active-writer blocked rows: 0
- Active-writer paths: none
- Dataless targets: 0
- Content-captured rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Residual Rows

| # | Path | Type | Bytes | Directories | Files | Manifest SHA-256 | Active writer | Executable now |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | `.next` | directory | 2180633134 | 981 | 1936 | `9e984847977a0a603a21fe3ded7bede613009911aba0f6748c3fa426250376b6` | no | no |
| 2 | `.tmp` | directory | 191495419 | 821 | 2689 | `6cd360673ac843e0338496061f65f7b2febd564b4fd9bc37124395c16c7f854d` | no | no |

## Boundary

Every row remains non-executable. The `.s11-parent-audit-next*` rows are still evidence-protected anomalous dataless generated directories. Active-writer rows keep only path/process metadata and intentionally omit changing size/hash manifests until the writer exits or A22/owner explicitly confirms cleanup handling.

An empty top-level `.tmp` directory with no active writer is treated as scratch baseline because the cleanup script recreates it after apply. Any files, nested directories, or active writers under `.tmp` remain residual evidence.
