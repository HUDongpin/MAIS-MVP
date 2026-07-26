# Root Dirty-Tree Stream Map — 2026-07-25

- Scope: non-destructive inventory of the primary root (`/Users/dongpinhu/Desktop/MAIS-MVP`) working tree, A25-style, produced during the 2026-07-25 burn-down.
- Counts: 213 dirty paths at start of inventory → 204 after removing 9 untracked files byte-identical to merged `origin/main` (content-safety residue from PR #34) → 64 coordination artifacts preserved on `docs/coordination-evidence-20260725` (root copies left in place).
- The remaining paths belong to LIVE concurrent session streams. Do not stage or commit them from the root; each stream should be sliced onto its own branch from a worktree by its owning session, import-closure style, verified with isolated `tsc` before push.

## Streams identified

| # | Stream | Key paths | Owning lane |
| --- | --- | --- | --- |
| 1 | AI-tutor transcript visibility (namesake of PR #32) | `app/api/teacher/ai-tutor-transcript-access/`, `lib/server/userStore/aiTutorTranscriptAccessPersistence.ts` (+test), `components/ai/AITutorProvider.tsx`, `lib/server/aiGovernance.ts`, `app/api/ai-tutor/resolve/route.ts` | A07/A13 |
| 2 | Tutor moderation gate | `lib/server/tutorModeration.ts` (+test), `lib/server/usMathTutorStandards.ts`, `tsconfig.tutor-moderation.json`, `scripts/run-tutor-moderation-tests.mjs` | A07 |
| 3 | Teacher ops / console | `lib/server/userStore/teacherOps*` (6 modules + 3 tests), `components/teacher/*` (8 files), `app/api/teacher/{students,classroom-sessions/roster,nav-signals}` | A13/A12 |
| 4 | Lesson / CCSS textbook port | `components/lesson/*` (34 modified + 4 untracked, incl. `ccss/lessons/*`) | A05 |
| 5 | Adaptive placement | `app/api/adaptive-learning/placement/` | A15 |
| 6 | Login/perf keep-warm | `app/api/warm/`, `lib/server/authPasswordAsync.test.ts`, `lib/server/userStore/authSessionPersistence.ts` | A12/A22 |
| 7 | Visualization polish | `components/visualizations/*` (5 modified) | A06 |
| 8 | Session-contract guardrail copies (working copies of merged/pending PR #41 content) | `CLAUDE.md`, `.claude/settings.json`, `scripts/claude-root-git-guard.mjs` | A10 |

## Shared/aggregator files currently dirty (multi-stream hotspots)

`lib/server/userStore.ts`, `types/index.ts`, `package.json`, `lib/server/userStore/domainContracts.ts`, `.github/workflows/ci.yml`, `vercel.json`, `.claude/launch.json`.

## Recommended slice order

1. Streams 2, 5, 6 look self-contained → slice first when their sessions are quiescent.
2. Stream 3 drags the `teacherOps*` userStore slice; slice as one package.
3. Streams 1 + 4 overlap PR #32's declared bundle scope — coordinate with the bundle-evaporation plan (split streams out of #32, close it unmerged when empty).
4. Stream 8 resolves itself when PR #41 merges: delete the three root copies right before the root next syncs a main that contains them ("untracked working tree files would be overwritten" guard).

## Final states to record per package

`reviewed commit | owner-approved discard | evidence archive | blocker report` (per AGENTS.md release-intake rules).
