# 2026-07-01 A05/A12 Lesson Attempt Feedback Bugfix

## Agents

- A05 lesson lead: reproduced the reported student lesson symptom and confirmed the affected lesson practice item is the US-CA P5 expressions/patterns checkpoint where `no` is the correct answer.
- A12 backend/API platform lead: fixed the attempt fast path so a persistence outage cannot block already-computed answer feedback.

## Assignment

Fix the reported production behavior on `/student/lessons/us-ca-math-p5-5-oa-expressions-patterns`: selecting `no` for "is 3 a factor of 20?" should show correct-answer feedback, not `Could not check this answer yet.`

## Scope

- Edited `lib/server/practiceAttemptStore.ts`.
- Edited `lib/server/practiceAttemptStore.test.ts`.
- Did not edit lesson UI, generated question content, real env files, credentials, Git staging, commits, branches, pushes, or deploy configuration.

## Root Cause

The exact US-CA question grades correctly in the fast attempt path. The failure mode was that row persistence happened after grading but before returning feedback. If Postgres attempt-row persistence was unavailable, the server threw after computing the correct result, causing the client card to show the generic fallback error.

## Fix

`submitQuestionAttemptFast` now treats Postgres row persistence as best-effort after grading. If the row write fails, it returns the computed `AttemptFeedback` and emits a redacted warning without secret values.

## Checks

- RED reproduced: `HK_MATH_STORAGE_PROVIDER=postgres POSTGRES_URL=postgres://user:pass@127.0.0.1:1/db ./node_modules/.bin/tsx -e ...submitQuestionAttemptFast(...)` failed with `connect ECONNREFUSED 127.0.0.1:1`.
- RED automated: `./node_modules/.bin/tsx --test lib/server/practiceAttemptStore.test.ts` failed on the new persistence-unavailable feedback regression.
- GREEN: `./node_modules/.bin/tsx --test lib/server/practiceAttemptStore.test.ts` passed 3/3.
- GREEN focused suite: `./node_modules/.bin/tsx --test app/api/attempts/routeFastPath.test.ts lib/server/practiceAttemptStore.test.ts lib/server/answerMatching.test.ts data/usCaliforniaLessons.test.ts` passed 21/21.
- GREEN exact failure mode: with invalid local Postgres env, the exact question ID and selected answer `no` returned `{"correct":true,...}`.
- GREEN whitespace: `git diff --check -- lib/server/practiceAttemptStore.ts lib/server/practiceAttemptStore.test.ts`.

## Residual Risk

- `npm run type-check` remains red in the dirty root due unrelated A06 visualization/manim test type drift and stale generated `tmp/.../types/validator.ts` paths referencing the deleted `app/student/lessons/page.js`.
- Production deploy was not attempted. A22 must release from a clean worktree, reviewed clean slice, or pruned staging directory.
