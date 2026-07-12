# A25 A16 Post-Extraction Verification Report

Generated: 2026-07-08T14:14:16.856Z

Dirty map signature: `4892e406613fc3846378621b84ba0f486bb8ebf371c35837eae544472596f318`

Expanded dirty entries: 6130

Lifecycle status: `post-extraction-verified`

This report is verification only. It does not authorize staging, committing, merging, cleanup, worktree removal, branch deletion, reset, clean, push, deploy, or any physical lifecycle command.

## Summary

- Package file rows: 6
- Package fingerprint rows: 6
- Package fingerprint sha256: `005a792e0e2438bbade0462d03c740dc6a542b8152935a0ed5e6b11caf5a9fac`
- Package status rows: 0
- Staged package rows: 0
- Valid execution instruction rows: 1
- Post-extraction verified: yes
- Checks passed: 7/7
- Cleanup-authorized rows: 0
- Executable rows: 0

## Package Fingerprints

| Path | Bytes | Lines | SHA256 |
| --- | ---: | ---: | --- |
| `coordination/research/2026-06-20-3blue1brown-skill-distillation-handbook.md` | 22526 | 668 | `643a27210a59980749e25e12b26d7afb705f13fcd225785ee5f9bf2ca2265a10` |
| `coordination/research/2026-06-20-3blue1brown-skill-distillation-handbook.provenance.md` | 2548 | 42 | `bdc11b6350ba02ff316505c850b250cc3f3d220a36fd13032498b150d86a08bf` |
| `coordination/research/2026-06-20-3blue1brown-style-visualization-effects-report.md` | 35064 | 349 | `11525e88659340ab2bf16a6f03fecb04b48c40f5c8a7fc2c651eed101112d158` |
| `coordination/research/2026-06-21-ke-to-mais-behavior-event-dictionary.csv` | 48645 | 100 | `311b2388210d526dcb308d55eee1011c1c298e921eca66e5e9256a60bae5fb5c` |
| `coordination/research/2026-06-21-ke-to-mais-stealth-assessment-integration-spec.md` | 26095 | 653 | `e902192f6e607c2e6a0c53581b2c994a37bc17a3a6a41c6a670abda85b5400d7` |
| `coordination/research/2026-06-21-ke-to-mais-stealth-assessment-integration-spec.provenance.md` | 1689 | 36 | `96bb772676f89f1364e729b66a28cf787bbc724f12e83209b4f2b1b0c7f3c6d5` |

## Current Package Status

- no package status rows

## Checks

| Check | Status | Detail |
| --- | --- | --- |
| `source-dirty-map-current` | pass | A16 source artifacts point at the current dirty-map signature. |
| `source-expanded-entry-count-current` | pass | A16 source artifacts point at the current expanded dirty entry count. |
| `pre-execution-fingerprint-manifest-ready` | pass | A16 pre-execution validation has a six-file package fingerprint manifest. |
| `no-package-staged-changes` | pass | No A16 package file is currently staged. |
| `pending-or-verified-state-is-coherent` | pass | lifecycleStatus=post-extraction-verified |
| `post-extraction-commit-shape` | pass | If extracted, the latest package commit must contain exactly the six A16 package files. |
| `post-extraction-fingerprint-match` | pass | If extracted, committed file fingerprints must match the approved pre-execution manifest. |

## Boundary

- Records owner approval: false.
- Records execution instruction: false.
- Stage authorized: false.
- Commit authorized: false.
- Merge authorized: false.
- Cleanup authorized: false.
- Executable now: false.
- Destructive Git authorized: false.
- Deploy authorized: false.
