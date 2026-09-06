# 2026-08-09 A25 Dirty-Tree Map

Generated at: 2026-08-09T02:19:22.061Z
Agents: A25 git hygiene and release intake; A22 production reliability and release engineering; A10 tooling, docs, and report
Reason: preview-auth-secret-redeploy
Status signature: `903c302c73ca453bb0e983938067f4a35ec3dec66194b91c4ce5abe0fa41b431`

## Counts

- Collapsed status entries: 1
- Expanded status entries: 1
- Tracked modified: 1
- Tracked deleted: 0
- Untracked status entries: 0
- Untracked files: 0
- Unmapped owner entries: 0
- Strict unblocked unmapped entries: 0
- Ambiguous owner entries: 0
- Raw multi-match entries resolved by specificity: 0
- Secret quarantine entries: 0

## Owner Buckets

| Owner bucket | Dirty entries |
| --- | ---: |
| A22 Production reliability and isolated development | 1 |

## Slice Buckets

| Slice | Dirty entries |
| --- | ---: |
| release hygiene tooling/config | 1 |

## Release Hygiene Entries

| Status | Path | Owner |
| --- | --- | --- |
| `M` | `.claude/launch.json` | A22 Production reliability and isolated development |

## Unmapped Owner Entries

No release-hygiene entries detected.

## Runtime Release Rule

- Runtime preview/production release remains blocked until this map is current at preflight time.
- A22 must use a clean worktree, clean clone, reviewed clean release slice, or pruned staging; direct dirty-root deploy remains forbidden.
- A10/A25 should slice the root inventory into runtime app/API/data, tests/regression evidence, docs/coordination evidence, content/RAG backlog, release hygiene tooling/config, and local/generated quarantine.
- A25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.

