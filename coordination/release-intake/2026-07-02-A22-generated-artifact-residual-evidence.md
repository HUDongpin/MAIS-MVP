# A22 Generated Artifact Residual Evidence

Generated: 2026-07-02T15:58:54.930Z

Cleanup dry-run command: `node scripts/cleanup-generated-artifacts.mjs --dry-run --json`

This is A25 release-intake evidence for A22-owned generated-artifact cleanup. It records only residual target structure, byte counts, and manifest hashes. It does not copy file contents into this report and does not authorize staging, committing, discarding, tagging, pushing, pruning, deploying, branch deletion, reset, clean, restore, worktree removal, file deletion, cleanup apply, or any other physical cleanup.

## Summary

- Residual targets: 3
- Total bytes: 0
- Dataless targets: 3
- Content-captured rows: 0
- Cleanup-authorized rows: 0
- Executable rows: 0

## Residual Rows

| # | Path | Type | Bytes | Directories | Files | Manifest SHA-256 | Executable now |
| ---: | --- | --- | ---: | ---: | ---: | --- | --- |
| 1 | `.s11-parent-audit-next3` | directory | 0 | 2 | 0 | `174e139bea1ac59948cf49be782d880c5b713bbbc727a0dae19aba5046273336` | no |
| 2 | `.s11-parent-audit-next4` | directory | 0 | 2 | 0 | `174e139bea1ac59948cf49be782d880c5b713bbbc727a0dae19aba5046273336` | no |
| 3 | `.tmp` | directory | 0 | 0 | 0 | `4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945` | no |

## Boundary

Every row remains non-executable. The `.s11-parent-audit-next*` rows are still evidence-protected anomalous dataless generated directories, and `.tmp` is an empty scratch directory recreated by the cleanup script after apply.
