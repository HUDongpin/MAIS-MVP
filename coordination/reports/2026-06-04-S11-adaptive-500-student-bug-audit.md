# S11 Adaptive Learning 500-Student Bug Audit

- Date: 2026-06-04
- Session: S11 QA and release quality
- Scope: Local MAIS-MVP student-facing adaptive recommendation engine
- Write scope used: report/log only
- Feature code changes: none by S11

## Executive Summary

The current local adaptive engine can produce deterministic recommendations for HK and mainland curriculum profiles. In the latest 500-student simulation, 400/500 simulated students received a decision, and no P0 crash, guardrail bypass, cross-topic question leak, or due-review/repair ordering violation was reproduced.

Two P1-level risks remain:

1. P1 confirmed: US_CA_MATH and US_NC_MATH students receive no adaptive recommendation because the live seed topic/question aggregates contain 0 US-matched topics/questions. This affects the current US demo profile as well.
2. P1 candidate / product-semantics risk: high-mastery students can receive `challenge` actions whose selected questions are entirely Foundation/Core in curriculum-grade areas with no Challenge/Exam question coverage. If MAIS defines `challenge` as high-difficulty work, this is a recommendation-quality bug; if this fallback is intentional, the UI copy should make the fallback explicit and the severity can be downgraded.

## Method

I used the systematic-debugging flow: inspect data flow, reproduce with deterministic local evidence, isolate root causes, and only then write remediation guidance.

Coverage:

- 500 simulated students:
  - HK: 100
  - Mainland PEP: 100
  - Mainland BNU: 100
  - Mainland HJB: 100
  - US_CA: 50
  - US_NC: 50
- Scenarios:
  - cold-start
  - struggling
  - prerequisite-gap
  - due-review
  - advanced-all-mastered
  - mixed-history
  - topic-focus
  - edge-empty-state
- Additional exhaustive profile-grade scan:
  - 6 curriculum profiles x 12 grades
  - Advanced mastery condition for each profile-grade pair
- API-level isolated database check:
  - HK demo student
  - Mainland demo student
  - US demo student

No live LLM provider calls were made.

## Evidence Summary

500-student run after recompiling the current local tree:

```text
simulatedStudents: 500
decisionsAvailable: 400
missingDecisions: 100
P0 issues: 0
P1 issues: 116

actionCounts:
  challenge: 48
  lesson: 100
  none: 100
  repair: 152
  review: 100

P1 issueCounts:
  missing-content-no-decision: 100
  advanced-challenge-easy-question-mix: 16
```

API-level isolated check:

```text
HK student / S3 / HK: decision=true, action=lesson, topic=trigonometry-basics, questions=2
Mainland student / S4 / MAINLAND_PEP_HIGH: decision=true, action=lesson, topic=pep-high-s4-sets-logic, questions=5
US student / S3 / US_CA_MATH: decision=false
```

Exhaustive advanced profile-grade scan:

```text
content profile-grade rows with decisions: 48
advanced challenge rows with Challenge/Exam questions: 29
advanced challenge rows with only Foundation/Core questions: 19
US_CA rows without decision: 12/12 grades
US_NC rows without decision: 12/12 grades
```

## P0 Findings

No P0 was reproduced.

Specifically, the simulation did not reproduce:

- Runtime exceptions in candidate generation.
- A decision missing required top-level skill/topic/engine objects when content exists.
- Selected skill/topic mismatch.
- Cross-topic question leakage.
- Due-review guard producing a non-review decision.
- Repair-required guard producing a non-repair decision.
- LLM validation accepting a challenge while an active repair guard blocks it.

## P1-1: US Students Have No Adaptive Recommendation

Severity: P1 confirmed

Impact:

- Any US_CA_MATH or US_NC_MATH student can load a student dashboard without an adaptive next-step recommendation.
- The current US demo student reproduces the issue in an isolated local database.
- Student-facing code turns an invalid/missing adaptive response into `adaptiveDecision=null`, so the recommendation surface disappears or cannot show the intended adaptive route.

Reproduction:

```text
NODE_PATH=/Users/dongpinhu/Desktop/MAIS-MVP/node_modules \
HK_MATH_DB_DIR=/tmp/mais-adaptive-db \
node isolated getAdaptiveLearningDecision smoke

student-shirleen-us / S3 / US_CA_MATH => hasDecision=false
```

Root cause:

- `lib/curriculumProfile.ts` maps US tracks to `US_CA_MATH` or `US_NC_MATH` and requires matching content.
- `data/topics.ts` imports HK and mainland topic sets, but no US topic set.
- `data/questions.ts` imports HK and mainland question sets, but no live US question set.
- `lib/server/userStore.ts` builds adaptive context by filtering topics/questions by curriculum profile and grade. For US profiles, the filtered topic/question sets are empty, so `generateAdaptiveCandidates` returns no candidates and the API returns no decision.
- `components/dashboard/AdaptiveLearningContent.tsx` treats a missing decision as null and does not have a US-specific fallback route.

Relevant code:

- `lib/curriculumProfile.ts:112-168`
- `data/topics.ts:1-10`, `data/topics.ts:505-516`
- `data/questions.ts:1-12`, `data/questions.ts:2188-2203`
- `lib/server/userStore.ts:11943-11970`
- `components/dashboard/AdaptiveLearningContent.tsx:28-40`, `components/dashboard/AdaptiveLearningContent.tsx:426-448`

Recommended fix:

1. Add live US topic/question integration to the seed aggregates:
   - Add approved US_CA_MATH and US_NC_MATH topics to `data/topics.ts`.
   - Add approved US_CA_MATH and US_NC_MATH questions to `data/questions.ts`.
   - Ensure each content item has `curriculumTrack`, `region`, and `publisher` fields that satisfy `contentMatchesCurriculumProfile`.
2. Add regression coverage:
   - `getAdaptiveLearningDecision({ userId: "student-shirleen-us", grade: "S3", curriculumTrack: "US_CA_MATH" })` must return a non-null decision with questions.
   - Add one US_NC smoke using a synthetic profile.
3. Add a defensive product fallback:
   - If a curriculum profile has no adaptive content, show an explicit "content not available for this curriculum yet" panel instead of silently clearing the recommendation.

Suggested owner routing:

- S21/S18: US content package readiness and QA acceptance.
- S15: adaptive engine/API regression once content is integrated.
- S02: dashboard fallback UI if product wants a graceful no-content state.

## P1-2: Challenge Action Can Use Only Foundation/Core Questions

Severity: P1 candidate, product semantics dependent

Impact:

- High-mastery learners can see a `challenge` action but receive only Foundation/Core questions.
- This can make the adaptive pathway look functional while under-challenging strong learners.
- In the 500-student sample, this appeared 16 times.
- In the exhaustive profile-grade scan, it appeared in 19 content-bearing profile-grade rows.

Examples:

```text
HK P1: action=challenge, skill=p1-counting-number-bonds:transfer, questions=Core/Foundation only
HK S3: action=challenge, skill=polynomials:transfer, questions=Core/Foundation only
MAINLAND_PEP P4: action=challenge, skill=pep-primary-p4-upper-large-numbers-multiplication:transfer, questions=Foundation only
MAINLAND_HJB S1: action=challenge, skill=hjb-junior-s1-lower-isosceles-triangles:fluency, questions=Core only
```

Root cause:

- Current local `selectAdaptiveQuestions` prefers Challenge/Exam questions for `challenge`, but deliberately falls back to linked/topic questions if no hard questions exist.
- `questionIdsForStage` also falls back from the stage-specific question subset to all topic questions when the stage subset is empty.
- `generateAdaptiveCandidates` still emits a `challenge-ready` candidate without checking whether the resulting question set contains any Challenge/Exam question.
- The current test suite includes a passing case named `challenge falls back to easier topic questions only when no challenge or exam items exist`, so this behavior appears intentional in code but risky in product semantics.

Relevant code:

- `lib/adaptiveLearning.ts:111-118`
- `lib/adaptiveLearning.ts:270-308`
- `lib/adaptiveLearning.ts:368-375`
- `lib/adaptiveLearning.ts:598-627`

Recommended fix options:

Option A, stricter adaptive semantics:

- Do not emit a `challenge` candidate unless `selectAdaptiveQuestions(... action: "challenge")` can return at least one Challenge/Exam question.
- If a high-mastery skill lacks hard questions, emit a `practice`, `review`, or `content-gap` candidate instead.
- Add tests asserting that `challenge-ready` implies at least one Challenge/Exam question.

Option B, content pipeline remedy:

- Fill hard-question coverage for the affected topic/grade areas.
- Keep the current fallback but add a content coverage gate that flags any transfer/challenge-ready skill with no hard question supply.

Option C, UI/product wording fallback:

- If fallback to easier questions is intended, rename the action/explanation to "stretch practice" or "consolidation challenge" and expose that the engine could not find hard questions for this topic.

Suggested owner routing:

- S15: choose and implement adaptive candidate semantics.
- S18/S21: hard-question coverage audit and content-package remedy.
- S02/S09: UI/copy fallback if the product keeps easy-question fallback.

## Positive Findings

- HK and mainland PEP/BNU/HJB profiles produced decisions in the simulated current local tree.
- Cold-start no longer produced immediate repair-required as the first step in the current local adaptive code.
- Due-review and repair guardrails held in the 500-student simulation.
- LLM validation still rejected unsafe challenge reranks when guardrails required repair.
- The current tree appears to include uncommitted adaptive improvements not authored by this S11 audit, including:
  - challenge question selection preferring Challenge/Exam questions,
  - prerequisite repair requiring actual evidence before treating a prior as a weak prerequisite,
  - challenge skill selection sorting toward harder skills first.

## Checks Run

- `git status --short`: very dirty worktree with many pre-existing owner/session changes.
- Read AGENTS.md and relevant adaptive files.
- Compiled current tree to `/tmp/mais-adaptive-sim` with `tsc --outDir /tmp/mais-adaptive-sim`: passed.
- 500-student deterministic simulation via compiled local modules: completed.
- Exhaustive profile-grade advanced challenge scan: completed.
- Isolated API-level `getAdaptiveLearningDecision` smoke with `/tmp/mais-adaptive-db`: completed.
- `npm run type-check`: initially passed once, then later failed after/current concurrent shared type drift.
- `npm run test:analytics`: first run compiled and executed 23/23 tests passing, but command exit was 1 because final `rm -rf .tmp` hit existing `.tmp/e2e-isolated` output. Second run failed during TypeScript compile after/current shared type drift.

Current validation blockers:

```text
components/teacher/TeacherDashboardView.tsx: missing pending-correction-review / overdue-correction labels
components/teacher/teacherLabels.ts: missing correction-required / correction-submitted / resolved labels
lib/server/userStore.ts: Submission missing correction fields
lib/server/userStore.ts: TeacherLiveSession/ClassroomLiveSession missing workSamples
```

These blockers are outside the S11 adaptive report scope and appear tied to concurrent teacher/shared type changes.

## Handoff

The adaptive recommendation engine is usable for HK and mainland profiles in current local deterministic mode, but not for US profiles. No P0 was found. The top fix should be US content/profile integration, because that is a complete recommendation outage for US students. The second decision is product-level: either forbid `challenge` without hard questions or explicitly label the easier fallback.
