# 2026-06-24 A25 Dirty-Tree Map

Generated at: 2026-06-24T06:15:14.390Z
Agents: A25 git hygiene and release intake; A22 production reliability and release engineering; A10 tooling, docs, and report
Reason: A25 root inventory worktree policy implementation after handoff
Status signature: `c87e74b6c99c8a04922f146ef2306310378059a54dabe39f451b20800ba1fb1e`

## Counts

- Collapsed status entries: 892
- Expanded status entries: 1147
- Tracked modified: 362
- Tracked deleted: 0
- Untracked status entries: 530
- Untracked files: 785

## Owner Buckets

| Owner bucket | Dirty entries |
| --- | ---: |
| A06 visualization lead | 283 |
| A12 backend/API platform | 160 |
| A18 curriculum QA / A21 content pipeline | 130 |
| A10 tooling, docs, and report | 119 |
| Unmapped runtime owner review needed | 99 |
| A21 content pipeline and RAG operations | 74 |
| A11 QA and release quality | 61 |
| A25 git hygiene and release intake | 42 |
| A13 teacher console | 35 |
| A04 practice lead | 32 |
| A01 app shell lead | 25 |
| A22 production reliability and release engineering | 16 |
| A20 game design and game-based learning | 11 |
| A05 lesson lead | 8 |
| A07 AI tutor lead | 8 |
| A02 dashboard lead | 7 |
| Unmapped/manual owner needed | 7 |
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
| runtime app/API/data/public | 483 |
| docs/coordination evidence | 302 |
| tests/regression evidence | 276 |
| generated/content/RAG backlog | 65 |
| release hygiene tooling/config | 12 |
| unmapped/manual | 8 |
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

