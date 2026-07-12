# A25 Daily Release Intake

- Date: 2026-06-27 23:03 HKT
- Agent ID: A25
- Scope: Non-destructive dirty-tree and blocked-workstream intake requested by owner
- Commands run:
  - `npm run release:dirty-map -- --reason "2026-06-27 A25 blocked-workstream intake requested by owner"` - passed; wrote `coordination/release-intake/2026-06-27-A25-dirty-tree-map-20260627T150123Z.md`
  - `npm run type-check` - passed
  - `npm run release:preflight -- --json` - passed
  - `npm run release:root-deploy-preflight -- --json` - failed protectively; dirty root deploy blocked as expected
- Git status counts from the refreshed dirty map:
  - Modified: 381
  - Deleted: 1
  - Untracked status entries: 683
  - Untracked files: 1406
  - Expanded status entries: 1788
- Root deploy preflight after the map refresh saw 1066 collapsed status entries because the map artifacts were themselves new untracked files.

## Largest Dirty Top-Level Areas

| Area | Expanded dirty entries |
| --- | ---: |
| `coordination/` | 820 |
| `components/` | 436 |
| `lib/` | 185 |
| `app/` | 121 |
| `data/` | 81 |
| `tests/` | 61 |
| `public/` | 37 |
| `scripts/` | 23 |

## Shared Files Currently Dirty

- `types/index.ts` - A08-owned shared types, touched by A12/A08 LRS hardening.
- `components/providers/AppProviders.tsx` - A08-owned shared provider boundary.
- `lib/server/userStore.ts` and `lib/server/userStore/` - A12-owned storage contract/module split.
- `app/api/` route families - A12-owned general API, with A07-owned AI Tutor and A15-owned adaptive exceptions.
- `components/visualizations/` and `data/visualizationLabs.ts` - A06-owned visualization/Manim/Three.js package.
- `tests/e2e/` - A11-owned regression evidence.
- `.env.local.example` - A07/A19 coordination surface; no real secret values inspected or recorded.
- `.vercelignore`, `playwright.config.ts`, release scripts - A22-owned release hygiene.

## Ownership Map

| Owner bucket | Dirty entries |
| --- | ---: |
| A25 git hygiene and release intake | 501 |
| A06 visualization lead | 349 |
| A10 tooling, docs, and report | 171 |
| A12 backend/API platform | 164 |
| A18 curriculum QA / A21 content pipeline | 136 |
| Unmapped runtime owner review needed | 111 |
| A21 content pipeline and RAG operations | 74 |
| A11 QA and release quality | 61 |
| A13 teacher console | 35 |
| A04 practice lead | 33 |
| A22 production reliability and release engineering | 28 |
| A01 app shell lead | 26 |
| A05 lesson lead | 23 |
| A02 dashboard lead | 11 |
| A07 AI tutor lead | 11 |
| A20 game design and game-based learning | 11 |
| A15 adaptive engine lead | 4 |
| A08 state and analytics lead | 3 |
| A24 illustration exact-layer | 3 |

## Owner-Requested Blocked Workstreams

| Workstream | Current state | Correct next owner package |
| --- | --- | --- |
| A12 userStore.ts / API/storage contract | Not fixed. Current dirty map assigns 164 entries to A12. `lib/server/userStore.ts`, `lib/server/userStore/`, broad API routes, and many persistence tests remain a high-risk storage/API contract package. | Create isolated `codex/A12-userstore-storage-contract` worktree. A12 should first produce a minimal storage contract migration plan, then fix `userStore.ts` exports/module boundaries and run `npm run type-check`, `npm run test:backend`, and targeted `lib/server/userStore*.test.ts` checks. A08 joins only for shared type drift; A19 joins only if env naming is touched. |
| A06 visualization/Manim/Three.js | Partially advanced, not closed. A06 logs show many pure Manim contract slices passed, and today's fresh `npm run type-check` is now green. Dirty map still assigns 349 entries to A06, including runtime, tests, and untracked Manim modules. Browser/release evidence remains incomplete. | Create isolated `codex/A06-manim-three-closure` worktree or review slice. A06 should reduce the dirty package into reviewed commits or explicit blockers, then A11/A22 should run targeted visualization Playwright/browser evidence before release. |
| A07/A15/A08 AI/adaptive/shared types | Not split. Dirty map shows A07 11 entries, A15 4 entries, A08 3 entries, but they touch shared provider/type/env surfaces. Type-check is green, so the blocker is packaging/ownership, not current TypeScript failure. | Split into three packages: A07 AI Tutor/provider API, A15 adaptive engine/API semantics, A08 shared types/provider/difficulty. Any cross-file dependency should be recorded in an A08/A10 shared drift report before edits are merged. |
| A11 regression evidence owner routing | Routed in a new report. A11 produced source-corrected bug 52-87 verification and owner recommendations; this intake now adds `coordination/reports/2026-06-27-A11-student-regression-split.md` for confirmed/missing-source clusters. | Owning agents should consume the split: A01/A20/A04 for About game routing, A03 for primary P6 roadmap geometry, A04/A15 for handwriting/OCR only if artifact is supplied, A05/A07/A12 for lesson audio monitoring, A06 for any later low-end visualization evidence. |
| A18/A21/A23/A24 content/RAG candidate chain | Fresh A23 intake gate created, but not promoted to live integration. A18/A21/A24 have integration-review evidence for California concept stories and worked-example visuals; A23 now records that this evidence does not authorize broad live data/source promotion. A11/A22 gates remain required. | Use `coordination/integration/2026-06-27-A23-content-rag-candidate-chain-intake.md` as the current hold gate. Required chain remains: A21 candidate artifact -> A18 QA decision -> A24 exact-layer decision if answer-critical visual -> A23 integration plan -> A04/A05 live-surface owner -> A11 regression -> A22 clean release slice. |

## Conflict Risks

- Direct feature fixes from root would mix 1788 expanded entries and risk committing unrelated owner/agent work.
- A12 storage/API changes overlap A08 shared types, A07 provider code, A15 adaptive routes, and A22 backend/release gates.
- A06 visualization closure is large enough that runtime, source tests, and browser evidence should be separated.
- A11 E2E changes must not be used as feature fixes; A11's new split report routes failures to owning agents.
- Content/RAG packages must not bypass A18/A23/A11/A22 gates into live `data/questions.ts`, `data/topics.ts`, `data/lessons.ts`, app routes, or public release slices; A23's new gate keeps the current package set held.
- `.env.local.example` is dirty, but real `.env*` files and credential documents were not read or touched.

## Recommended PR/Commit Slices

- Runtime app/API/data:
  - A12 storage/API contract slice first, because it affects multiple routes and persistence tests.
  - A06 visualization runtime closure separately from source-test-only Manim modules.
  - A07, A15, and A08 split as three small packages with explicit shared-type handoff.
- Tests/regression evidence:
  - A11 student regression split artifact before broad E2E edits.
  - Focused E2E packages by owning surface, not one monolithic student gate.
- Docs/coordination evidence:
  - Keep A25 dirty maps, A11 verification, A18/A21/A24 QA, and A23 integration gates in separate evidence commits.
- Content/RAG backlog:
  - Keep generated-content/RAG packages candidate-only until A23 chooses a package and records live-surface owner routing.
- Release hygiene tooling/config:
  - A22 should continue from clean worktree or pruned staging; current root deploy remains blocked.
- Local/generated quarantine:
  - A22 cleanup, if needed, must start with `node scripts/cleanup-generated-artifacts.mjs --dry-run`. No cleanup was run in this A25 pass.

## Release-Safe Clean-Slice Candidates

- None approved directly from the dirty root.
- A22 may create a clean/pruned staging candidate after A25/A10 owner slicing and after the selected package has reviewed evidence.

## Files Or Directories That Must Not Be Staged

- Real `.env*` secret files, credential documents, cookies, or provider outputs.
- Raw/private corpus files and local `.local/rag/` outputs unless owner-approved rights policy exists.
- `.next/`, `.tmp/`, `node_modules/`, `tsconfig.tsbuildinfo`, generated validator/runtime outputs.
- Broad `coordination/` backlog unrelated to the selected package.
- Unreviewed generated-content/RAG candidates not selected by A23.

## A22 Clean Release Path

- Direct dirty-root deploy is blocked by `npm run release:root-deploy-preflight -- --json`.
- Required path remains clean worktree, clean clone, reviewed release slice, or pruned staging directory.
- `npm run type-check` passed and `npm run release:preflight -- --json` passed, but those checks do not override dirty-root release policy.

## A22 Generated Cleanup Status

- Dry run command: not run in this A25 pass.
- Apply command, if owner-approved: not run.
- Playwright traces/reports preserved: not inspected in this pass.

## Owner Decisions Needed

1. Choose whether A12 userStore/API storage contract is the next P0 implementation package.
2. Choose whether A06 Manim/Three closure should be review/commit slicing first or browser/release QA first.
3. Confirm the split order for A07/A15/A08: AI Tutor/provider, adaptive semantics, or shared types.
4. Provide the missing source attachment or exact bug cards if bugs 81-87 should be routed by A11.
5. Choose the first A18/A21/A23/A24 content/RAG candidate package to attempt live integration.
