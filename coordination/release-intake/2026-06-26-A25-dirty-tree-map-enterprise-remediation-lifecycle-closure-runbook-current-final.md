# 2026-06-26 A25 Dirty-Tree Map

Generated at: 2026-06-26T10:51:45.411Z
Agents: A25 git hygiene and release intake; A22 production reliability and release engineering; A10 tooling, docs, and report
Reason: A25 lifecycle closure runbook final current inventory
Status signature: `3082892a27af369cadf1e323ecfc226f4ed96dbad4a44510bfd03f3cc8e485cd`

## Counts

- Collapsed status entries: 964
- Expanded status entries: 1621
- Tracked modified: 367
- Tracked deleted: 0
- Untracked status entries: 597
- Untracked files: 1254

## Owner Buckets

| Owner bucket | Dirty entries |
| --- | ---: |
| A25 git hygiene and release intake | 444 |
| A06 visualization lead | 308 |
| A12 backend/API platform | 160 |
| A10 tooling, docs, and report | 149 |
| A18 curriculum QA / A21 content pipeline | 130 |
| Unmapped runtime owner review needed | 100 |
| A21 content pipeline and RAG operations | 74 |
| A11 QA and release quality | 61 |
| A13 teacher console | 35 |
| A04 practice lead | 32 |
| A01 app shell lead | 25 |
| A22 production reliability and release engineering | 24 |
| A05 lesson lead | 11 |
| A20 game design and game-based learning | 11 |
| A07 AI tutor lead | 10 |
| A02 dashboard lead | 9 |
| Unmapped/manual owner needed | 8 |
| A03 curriculum roadmap lead | 6 |
| A16 research and learning science | 6 |
| A14 parent console | 5 |
| A15 adaptive engine lead | 4 |
| A17 gamification and motivation | 4 |
| A08 state and analytics lead | 2 |
| A24 illustration exact-layer | 2 |
| A09 copy, i18n, accessibility | 1 |

## Slice Buckets

| Slice | Dirty entries |
| --- | ---: |
| docs/coordination evidence | 742 |
| runtime app/API/data/public | 501 |
| tests/regression evidence | 291 |
| generated/content/RAG backlog | 65 |
| release hygiene tooling/config | 12 |
| unmapped/manual | 9 |
| secret/env quarantine | 1 |

## Release Hygiene Entries

| Status | Path | Owner |
| --- | --- | --- |
| `M` | `.vercelignore` | A22 production reliability and release engineering |
| `M` | `next.config.ts` | A10 tooling, docs, and report |
| `M` | `package-lock.json` | A10 tooling, docs, and report |
| `M` | `package.json` | A10 tooling, docs, and report |
| `M` | `playwright.config.ts` | A22 production reliability and release engineering |
| `??` | `scripts/cleanup-generated-artifacts.mjs` | A22 production reliability and release engineering |
| `??` | `scripts/deploy-vercel-preview.mjs` | A22 production reliability and release engineering |
| `??` | `scripts/deploy-vercel-production.mjs` | A22 production reliability and release engineering |
| `??` | `scripts/prepare-vercel-staging.mjs` | A22 production reliability and release engineering |
| `??` | `scripts/release-env-guard.mjs` | A22 production reliability and release engineering |
| `??` | `scripts/release-env-guard.test.mjs` | A22 production reliability and release engineering |
| `??` | `tsconfig.next.json` | A22 production reliability and release engineering |

## Runtime Release Rule

- Runtime preview/production release remains blocked until this map is current at preflight time.
- A22 must use a clean worktree, clean clone, reviewed clean release slice, or pruned staging; direct dirty-root deploy remains forbidden.
- A10/A25 should slice the root inventory into runtime app/API/data, tests/regression evidence, docs/coordination evidence, content/RAG backlog, release hygiene tooling/config, and local/generated quarantine.
- A25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.

