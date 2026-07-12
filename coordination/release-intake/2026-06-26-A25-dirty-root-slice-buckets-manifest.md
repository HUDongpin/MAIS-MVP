
# 2026-06-26 A25 Dirty Root Slice Buckets Manifest

- Generated: 2026-06-26 11:22:54 HKT
- Agents: A10 tooling/docs/report; A25 git hygiene/release intake
- Baseline: `main` at `cef544e0`
- Dirty map snapshot: `coordination/release-intake/2026-06-26-A25-dirty-tree-map-20260626T032131Z.json`
- Moving latest pointer: `coordination/release-intake/latest-A25-dirty-tree-map.json`
- Status signature: `c8c133649f8784377ba9ad3da651f82400150120ffd2b7bc3cc5ec58276a9f9f`
- Status: broad current-state bucket pathspecs for release-intake triage. Do not commit a bucket wholesale without owner review.

## Bucket Pathspecs

| Slice bucket | Paths | Pathspec |
| --- | ---: | --- |
| docs/coordination evidence | 386 | `coordination/release-intake/2026-06-26-A25-slice-docs-coordination-evidence.pathspec` |
| generated/content/RAG backlog | 65 | `coordination/release-intake/2026-06-26-A25-slice-generated-content-rag-backlog.pathspec` |
| release hygiene tooling/config | 12 | `coordination/release-intake/2026-06-26-A25-slice-release-hygiene-tooling-config.pathspec` |
| runtime app/API/data/public | 496 | `coordination/release-intake/2026-06-26-A25-slice-runtime-app-api-data-public.pathspec` |
| secret/env quarantine | 1 | `coordination/release-intake/2026-06-26-A25-slice-secret-env-quarantine.pathspec` |
| tests/regression evidence | 289 | `coordination/release-intake/2026-06-26-A25-slice-tests-regression-evidence.pathspec` |
| unmapped/manual | 8 | `coordination/release-intake/2026-06-26-A25-slice-unmapped-manual.pathspec` |

## Use Notes

- These buckets are broad release-intake queues, not ready commits.
- Use the Shirleen and A06 priority manifests for the first two concrete packages.
- Content/RAG, env quarantine, generated/local artifacts, and release hygiene remain separate by design.
