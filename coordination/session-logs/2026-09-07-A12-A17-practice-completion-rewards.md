# A12/A17 practice-completion reward forward port

- Owner: A12/A17, task01a07b9f-f36b-7a23-b496-f320c502966f.
- Branch: codex/a17-practice-completion-rewards-20260907.
- Worktree: /Volumes/Starship/MAIS-MVP/.worktrees/a17-practice-completion-rewards-20260907.
- Base: 34c10c202972dd901fa72f2aad7b21a3432d387b. Source intent: 861b96afc690a9beec60def637c33c5eff23552b.
- Created2026-09-07; expectedcloseout2026-09-08; targetPRpending.
- Runtime scope exactly lib/server/userStore.ts, lib/server/userStore/gamificationRewardRedemptionPersistence.ts, lib/server/userStoreGamificationAutomaticRewardPersistence.test.ts. This log is lifecycle evidence.
- Objective: award lesson-completion points once for mastery and attempt-based completion, preserve topic fallback and three-language copy. Tests precede behavioral fix.
- Implementation complete as a bounded local/legacy userStore forward port; changes retained uncommitted for review. Original source worktree, branch and evidence remain untouched. No commit/push/merge/deploy/cleanup.

## Verification and scope

- Baseline automatic-reward tests:7/7 passed. After adding the source behavior regressions and a test seam exposing the existing two progress functions, RED7passed/2failed:both completed states had zero reward ledger entries instead of one. No award behavior had been changed at that RED point.
- Initial GREEN9/9 passed after the functional port. Complete existing gamification family:77/77 passed. Added both sequential orderings of legacy/practice completion, preserving a single ledger row/event and40points; final family78/78passed. These tests do not simulate simultaneous storage transactions.
- Full type-check passed; analytics58/58 passed. Final type-check passed again after the additional regression test.
- Native isolated targeted backend: npm run test:backend -- --grep 'Practice Arena adaptive set' passed1/1, including the owned production Next build. Port3421, runreward-regression-20260907, synthetic localSQLite. This is local related-route evidence, not a public reward/Postgres integration or release attestation.
- A12/A17/A11 independent SPEC:PASS for exactthree-file port. Independent A12/A17/A11 quality review:PASS for the bounded local/legacy port.

The new helper is called from both legacy lesson-progress paths via afterSubmitQuestionAttempt. It preserves the85 mastery threshold and existing attempt-accuracy rule, uses the existing lesson-complete:{userId}:{slug} key, and falls back to topic titles when a lesson record is absent. The daily lesson quest already consumes completed progress and is not claimed newly enabled by this change.

Important existing boundary: fast/Postgres /api/attempts uses practiceAttemptStore independently, and only persistenceMode=local calls the legacy submit function. The fast/Postgres path does not set lesson completion or invoke these helpers. This three-file port does not close that separate implementation gap; no whole-application or production reward-completeness claim is made. No provider,real database,realenvironment or publicdeployment was used.

Logs and normal isolated artifacts remain in this candidate .tmp/reward-verification and .tmp/china-lesson-e2e-runtime.
