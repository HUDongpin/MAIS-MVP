# 2026-06-21 S25 Dirty-Tree Map

Generated at: 2026-06-21T01:25:14.259Z
Sessions: S25 git hygiene and release intake; S22 production reliability and release engineering; S10 tooling, docs, and report
Reason: runtime release preflight
Status signature: `a667b57f768680d75497eb6852e41a7ad0900edb593206bac644c89a190c4627`

## Counts

- Collapsed status entries: 661
- Expanded status entries: 810
- Tracked modified: 333
- Tracked deleted: 0
- Untracked status entries: 328
- Untracked files: 477

## Owner Buckets

| Owner bucket | Dirty entries |
| --- | ---: |
| S06 visualization lead | 169 |
| S12 backend/API platform | 104 |
| Unmapped runtime owner review needed | 98 |
| S18 curriculum QA / S21 content pipeline | 91 |
| S21 content pipeline and RAG operations | 78 |
| S11 QA and release quality | 57 |
| S10 tooling, docs, and report | 52 |
| S01 app shell lead | 26 |
| S13 teacher console | 25 |
| S04 practice lead | 23 |
| Unmapped/manual owner needed | 12 |
| S20 game design and game-based learning | 11 |
| S22 production reliability and release engineering | 11 |
| S07 AI tutor lead | 8 |
| S25 git hygiene and release intake | 8 |
| S02 dashboard lead | 7 |
| S03 curriculum roadmap lead | 6 |
| S14 parent console | 5 |
| S05 lesson lead | 4 |
| S15 adaptive engine lead | 4 |
| S16 research and learning science | 3 |
| S17 gamification and motivation | 3 |
| S08 state and analytics lead | 2 |
| S24 illustration exact-layer | 2 |
| S09 copy, i18n, accessibility | 1 |

## Slice Buckets

| Slice | Dirty entries |
| --- | ---: |
| runtime app/API/data/public | 386 |
| tests/regression evidence | 175 |
| docs/coordination evidence | 161 |
| generated/content/RAG backlog | 69 |
| release hygiene tooling/config | 12 |
| unmapped/manual | 6 |
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

