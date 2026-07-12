# 2026-06-04 S15 Adaptive Engine 100-Student Bug Audit

## Executive Summary

S15 simulated 100 synthetic students across HK and mainland-track local data, using the real adaptive engine functions and real `data/topics.ts` / `data/questions.ts` content. Result: the platform can return deterministic adaptive recommendations without crashing, but the recommendation quality is not fully healthy.

No P0 blocker was found. The app type-checks, builds, and every simulated student received a non-null deterministic decision with at least one question.

Three P1 adaptive-engine bugs were found:

1. Zero-history/new students are frequently routed to `repair` instead of a lesson, diagnostic, or normal first practice.
2. LLM rerank validation deadlocks when `due-review` and `repair-required` candidates coexist.
3. Advanced students can receive a `challenge` action on a `foundation` skill, often with only Foundation/Core questions.

A fourth P1 QA harness issue was found in the adaptive LLM E2E: direct SQLite seeding is hidden by the server read cache, causing the mocked LLM alternative test to fail with stale/no seeded adaptive states.

## Checks Run

- `npm run test:analytics`: pass, 21/21 tests.
- `npm run type-check`: pass.
- `npm run build`: pass; `/adaptive-learning` and `/api/adaptive-learning/*` built successfully.
- 100-student one-off simulation against compiled local code: pass for availability, fail for P1 quality issues.
- `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/adaptive-llm-smoke.spec.ts --project=desktop-chrome --grep-invert @live`: fail, 1 passed / 1 failed / 2 did not run. Live LLM was not called.

## 100-Student Simulation Result

Simulation matrix:

- Tracks: `HK`, `MAINLAND_PEP_HIGH`.
- Grades: P1-S6 where local topics/questions exist.
- Profiles: new, struggling, weak prerequisite, due review, due review plus repair, mixed state, advanced all-mastered, invalid numeric/date edge state.
- Engine mode tested: deterministic candidate generation and local LLM recommendation validation.

Aggregate result:

| Metric | Result |
| --- | ---: |
| Synthetic students | 100 |
| Thrown errors | 0 |
| Null decisions | 0 |
| Decisions with zero questions | 0 |
| Deterministic-as-LLM validation failures | 25 |
| Due-review + repair validation deadlocks | 25 |
| Advanced challenge on foundation skill | 12 |
| Advanced challenge without Challenge/Exam questions | 8 |

Action distribution:

| Action | Count |
| --- | ---: |
| repair | 63 |
| review | 25 |
| challenge | 12 |
| lesson | 0 |
| practice | 0 |

Interpretation: the engine is available, but `repair` dominates too strongly. In this matrix, normal first lesson/practice never became the deterministic top action.

## P1-1: New Students Are Misclassified As Repair

Severity: P1.

Evidence:

- HK P1, no adaptive states, no attempts.
- Generated deterministic candidate: `repair:p1-counting-number-bonds:foundation`.
- Guard flags: `weak-prerequisite`, `repair-required`.
- Student-facing explanation says the skill "needs a repair step" despite no evidence of a misconception.

Root cause:

- `prerequisiteRepairSummary()` in `lib/adaptiveLearning.ts:311` treats the default mastery prior `0.35` as a weak prerequisite.
- It does not require attempt evidence before declaring a repair.
- It runs before `lessonSummary()` and `practiceSummary()`, so zero-history students can be routed to repair.

Relevant code:

- `lib/adaptiveLearning.ts:311`
- `lib/adaptiveLearning.ts:327`
- `lib/adaptiveLearning.ts:336`

Recommended fix:

- Add an evidence predicate, for example `hasAdaptiveEvidence(state) = state.attemptCount > 0 || state.correctStreak > 0 || state.wrongStreak > 0 || Boolean(state.lastPracticedAt)`.
- `prerequisiteRepairSummary()` should only return a repair when either the target skill or weak prerequisite has real evidence.
- Add a unit test: zero states for a valid grade/topic must not produce `repair-required`; expected action should be `lesson` or `practice` depending on current product choice.

## P1-2: LLM Guardrail Deadlock With Due Review Plus Repair

Severity: P1.

Evidence:

- 25/100 simulations produced a candidate set containing both `due-review` and `repair-required`.
- Even when the LLM recommendation selected the deterministic `review` candidate, validation returned `{ valid: false, reason: "repair-required" }`.

Minimal reproduced candidate set:

- `review:p5-fractions-operations:foundation`, guard `due-review`
- `repair:p5-fractions-operations:fluency`, guards `weak-prerequisite`, `repair-required`
- deterministic candidate: `review:p5-fractions-operations:foundation`
- validation result: `repair-required`

Root cause:

- `validateLLMAdaptiveRecommendation()` applies global guard checks independently.
- If any candidate has `due-review`, selected action must be `review`.
- If any candidate has `repair-required`, selected action must be `repair`.
- When both are present, no single selected candidate can satisfy both checks.

Relevant code:

- `lib/adaptiveLearning.ts:901`
- `lib/adaptiveLearning.ts:905`

Recommended fix:

- Treat guardrails as a priority ladder, not simultaneous action requirements.
- For example: if any `due-review` exists, only enforce `review`; otherwise if any `repair-required` exists, enforce `repair`.
- Always allow the deterministic candidate when its own guard flags match the highest-priority guard.
- Add a regression test where due review and repair coexist and deterministic review validates successfully.

## P1-3: Challenge Can Select Foundation Skill And Easy Questions

Severity: P1.

Evidence:

- 12/12 advanced all-mastered profiles in the simulation selected a `challenge:*:foundation` deterministic candidate.
- 8/12 advanced challenge decisions had no Challenge/Exam questions.
- HK S1 all-mastered repro:
  - deterministic candidate: `challenge:integers:foundation`
  - skill difficulty: `Foundation`
  - selected question difficulties: `Core`, `Foundation`

Root cause:

- `sortSkillSummaries()` sorts lower difficulty first.
- `challengeSummary()` returns the first mastered skill from that ascending order, so foundation is selected before fluency/transfer.
- `selectAdaptiveQuestions()` prefers `skill.questionIds`; for a foundation skill, that linked set often contains only Foundation/Core questions, even when the action is `challenge`.

Relevant code:

- `lib/adaptiveLearning.ts:250`
- `lib/adaptiveLearning.ts:270`
- `lib/adaptiveLearning.ts:344`

Recommended fix:

- Make `challengeSummary()` prefer transfer/Challenge/Exam-level skills, for example by sorting eligible mastered skills by `difficultyRanks` descending.
- For `action === "challenge"`, if linked skill questions do not contain Challenge/Exam items, fall back to topic-level Challenge/Exam questions before falling back to easier linked questions.
- Add a regression test: all stages mastered should select transfer or harder questions; challenge decisions should include at least one Challenge/Exam question when available.

## P1-4: Adaptive LLM E2E Seeding Is Hidden By Server Read Cache

Severity: P1 for QA/release confidence, not a confirmed student runtime blocker.

Evidence:

- Mocked adaptive E2E failed at `tests/e2e/adaptive-llm-smoke.spec.ts:679`.
- Expected `ready`, received `rejected`.
- SQLite cache row recorded `error: "repair-required"`, `error_kind: "guardrail"`.
- The test wrote high-mastery states directly into SQLite after app registration, but the app server had already cached the database object.

Root cause:

- `readSqliteDatabase()` returns an in-memory cached database when present.
- The E2E helper mutates SQLite out of process, bypassing `mutateDatabase()` and therefore bypassing `clearSqliteReadCache()`.

Relevant code:

- `lib/server/userStore.ts:3254`
- `tests/e2e/adaptive-llm-smoke.spec.ts:670`

Recommended fix:

- Prefer seeding adaptive states through app-owned API/mutation paths.
- If direct DB seeding remains necessary, restart the isolated app after seeding or add a test-only cache invalidation hook guarded by test env.
- Re-run the adaptive LLM smoke after fixing P1-1, because the same new-student repair issue is visible in the first E2E test's deterministic baseline.

## Final Assessment

The local student adaptive path is not P0-broken: it returns decisions and questions under the tested matrix. However, it should not be considered recommendation-quality-ready until the three P1 engine issues above are fixed and covered by regression tests.

Recommended next implementation order:

1. Fix new-student repair misclassification.
2. Fix LLM guardrail priority deadlock.
3. Fix challenge skill/question escalation.
4. Repair the E2E seeding harness and re-run mocked adaptive LLM smoke.
