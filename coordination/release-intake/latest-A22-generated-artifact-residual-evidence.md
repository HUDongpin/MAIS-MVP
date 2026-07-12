# A22 Generated Artifact Residual Evidence

Generated: 2026-07-10T17:02:26.261Z

Cleanup dry-run command: `node scripts/cleanup-generated-artifacts.mjs --dry-run --json`

This is A25 release-intake evidence for A22-owned generated-artifact cleanup. It records only residual target structure, byte counts, and manifest hashes. It does not copy file contents into this report and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Residual targets: 2
- Scratch baseline targets: 0
- Known stable bytes: 4110108661
- Active-writer blocked rows: 0
- Active-writer paths: none
- Dataless targets: 0
- Content-captured rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Residual Rows

| # | Path | Type | Bytes | Directories | Files | Manifest SHA-256 | Active writer | Executable now |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| 1 | `.next` | directory | 3210619565 | 49 | 227 | `e4f00e9d1b15244f36435a2780b744f8e8a6546c743b805a619cd4a5a94193d0` | no | no |
| 2 | `.tmp` | directory | 899489096 | 520 | 1818 | `ebac55551b51c8b7c3f75a2d09ec3065b1dc6fea3774fcb09958486f1e66593a` | no | no |

## Boundary

Every row remains non-executable. The `.s11-parent-audit-next*` rows are still evidence-protected anomalous dataless generated directories. Active-writer rows keep only path/process metadata and intentionally omit changing size/hash manifests until the writer exits or A22/owner explicitly confirms cleanup handling.

An empty top-level `.tmp` directory with no active writer is treated as scratch baseline because the cleanup script recreates it after apply. Any files, nested directories, or active writers under `.tmp` remain residual evidence.
