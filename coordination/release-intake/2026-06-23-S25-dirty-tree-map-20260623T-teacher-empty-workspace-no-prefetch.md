# 2026-06-23 S25 Dirty-Tree Map

Generated at: 2026-06-22T18:45:28.294Z
Sessions: S25 git hygiene and release intake; S22 production reliability and release engineering; S10 tooling, docs, and report
Reason: S22 teacher no-class client workspace no-prefetch production publish
Status signature: `b51c464874e2ec9b529ed75e00e0d3d16bccd1d621e73e1737e961da56e3975f`

## Counts

- Collapsed status entries: 855
- Expanded status entries: 1101
- Tracked modified: 357
- Tracked deleted: 0
- Untracked status entries: 498
- Untracked files: 744

## Owner Buckets

| Owner bucket | Dirty entries |
| --- | ---: |
| S06 visualization lead | 266 |
| S12 backend/API platform | 156 |
| S18 curriculum QA / S21 content pipeline | 130 |
| S10 tooling, docs, and report | 108 |
| Unmapped runtime owner review needed | 99 |
| S21 content pipeline and RAG operations | 74 |
| S11 QA and release quality | 60 |
| S13 teacher console | 35 |
| S25 git hygiene and release intake | 33 |
| S04 practice lead | 31 |
| S01 app shell lead | 25 |
| S22 production reliability and release engineering | 14 |
| S20 game design and game-based learning | 11 |
| S05 lesson lead | 8 |
| S07 AI tutor lead | 8 |
| S02 dashboard lead | 7 |
| S03 curriculum roadmap lead | 6 |
| S16 research and learning science | 6 |
| Unmapped/manual owner needed | 6 |
| S14 parent console | 5 |
| S15 adaptive engine lead | 4 |
| S17 gamification and motivation | 4 |
| S08 state and analytics lead | 2 |
| S24 illustration exact-layer | 2 |
| S09 copy, i18n, accessibility | 1 |

## Slice Buckets

| Slice | Dirty entries |
| --- | ---: |
| runtime app/API/data/public | 473 |
| docs/coordination evidence | 280 |
| tests/regression evidence | 263 |
| generated/content/RAG backlog | 65 |
| release hygiene tooling/config | 12 |
| unmapped/manual | 7 |
| secret/env quarantine | 1 |

## Release Hygiene Entries

| Status | Path | Owner |
| --- | --- | --- |
| `M` | `.vercelignore` | S22 production reliability and release engineering |
| `M` | `next.config.ts` | S10 tooling, docs, and report |
| `M` | `package-lock.json` | S10 tooling, docs, and report |
| `M` | `package.json` | S10 tooling, docs, and report |
| `M` | `playwright.config.ts` | S22 production reliability and release engineering |
| `??` | `scripts/cleanup-generated-artifacts.mjs` | S22 production reliability and release engineering |
| `??` | `scripts/deploy-vercel-preview.mjs` | S22 production reliability and release engineering |
| `??` | `scripts/deploy-vercel-production.mjs` | S22 production reliability and release engineering |
| `??` | `scripts/prepare-vercel-staging.mjs` | S22 production reliability and release engineering |
| `??` | `scripts/release-env-guard.mjs` | S22 production reliability and release engineering |
| `??` | `scripts/release-env-guard.test.mjs` | S22 production reliability and release engineering |
| `??` | `tsconfig.next.json` | S22 production reliability and release engineering |

## Runtime Release Rule

- Runtime preview/production release remains blocked until this map is current at preflight time.
- S22 must use pruned staging or a clean reviewed worktree; direct dirty-root deploy remains forbidden.
- S10/S22 release tooling/config changes are the only intended release-hygiene slice in this pass.
- S25 did not stage, commit, branch, push, reset, delete, revert, clean, preview deploy, or production deploy.

