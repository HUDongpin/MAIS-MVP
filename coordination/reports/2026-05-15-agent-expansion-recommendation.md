# Agent Expansion Recommendation

- Report date: 2026-05-15
- Report time: 10:57 AM Asia/Hong_Kong
- Project: MAIS-MVP
- Reporting session: S10
- Purpose: Decide whether MAIS-MVP should add new session roles from `S11` onward to improve quality, speed, and ownership clarity.
- Sources reviewed: `AGENTS.md`, current file tree, latest 2026-05-14 and 2026-05-15 session logs, `2026-05-15-president-report.md`, `2026-05-12-console-qa-matrix.md`, and `2026-05-09-development-milestones-report.md`.

## Executive Recommendation

MAIS-MVP should add five new formal session roles now: `S11` QA/release quality, `S12` backend/API platform, `S13` teacher console, `S14` parent console, and `S15` adaptive engine.

The current `S01-S10` structure worked when the project was mostly student-facing UI plus supporting logic. It is now too compressed for the actual product surface. The repository currently contains 59 API route files, 35 teacher/parent UI files, and 20 E2E/support test files. The latest logs show repeated cross-scope work in teacher features, backend routes, adaptive learning, and QA automation. These are not theoretical future areas; they already exist and are active.

Short answers to the owner's questions:

| Area | Do we currently have a formal owner? | Recommendation |
| --- | --- | --- |
| QA | Partially, but not cleanly. S10 creates reports and some tests. | Add `S11` so QA owns regression gates and test matrices while S10 stays coordination/reporting. |
| Backend | No. API and server work is spread across S02, S04, S07, S08, and S10. | Add `S12` for general API contracts, auth/session/storage, and backend test stability. |
| Teacher console | No. Teacher UI/API work is already large and cross-session. | Add `S13` for teacher UI/product flows. Pair with S12 for teacher APIs. |
| Parent console | No. Parent routes and components exist but have no AGENTS owner. | Add `S14` for parent UX, reports, messages, and child-linking flows. |
| Adaptive engine | Partially. S08 owns analytics/state and has implemented the engine. | Add `S15` because adaptive learning is now a core AI/recommendation system. |

## Current Ownership Coverage

This table maps the active project surface to one recommended primary owner after expansion. Supporting sessions may help only through explicit coordination.

| Product area | Current evidence | Recommended primary owner | Supporting sessions |
| --- | --- | --- | --- |
| App shell, home, layout, navigation, theme | `app/layout.tsx`, `app/page.tsx`, `components/layout/`, `components/home/` | `S01` | S09 for copy, S10 for config/reporting |
| Student dashboard, progress, reward display | `app/dashboard/`, `app/progress/`, `components/dashboard/`, `components/cards/` | `S02` | S12 for APIs, S15 for adaptive panels |
| Curriculum roadmaps and grade/topic structure | `app/learning-path/`, roadmap pages, `components/learning/`, `data/grades.ts`, `data/topics.ts` | `S03` | S06 for lab links, S09 for copy |
| Practice, mistakes, question bank | `app/practice/`, `app/mistake-book/`, `components/practice/`, `data/questions.ts` | `S04` | S11 for solvability tests, S12 for attempts/questions APIs |
| Lessons and lesson content | `app/lesson/`, `components/lesson/`, `data/lessons.ts` | `S05` | S04 for embedded practice, S11 for lesson audits |
| Visualization Lab and math modules | `app/visualization-lab/`, `components/visualizations/`, `lib/math.ts` | `S06` | S11 for overlap tests, S03 for roadmap preview coordination |
| AI Tutor and tutor-specific LLM behavior | `components/ai/`, `app/api/ai-tutor/`, tutor visualization protocol | `S07` | S15 for adaptive LLM policy, S12 for shared auth/server concerns |
| Shared provider state, analytics, shared types/utilities | `components/providers/`, `lib/learningAnalytics.ts`, `types/index.ts`, `lib/utils.ts` | `S08` | S15 for adaptive types, S12 for server contract impacts |
| Copy, i18n, accessibility labels | `lib/i18n.ts`, copy-only/a11y-only edits | `S09` | All feature owners by coordination |
| Tooling, docs, config, coordination, president reports | `AGENTS.md`, config, scripts, `coordination/` | `S10` | S11 for QA reports, S12 for build/API diagnostics |
| QA matrix, E2E ownership, release quality gates | `tests/e2e/`, QA reports, regression evidence | `S11` | Feature owners fix product defects; S10 reports status |
| General backend/API platform, auth/session/storage | 59 `app/api/**/route.ts` files, `lib/server/auth.ts`, session cookie and store helpers | `S12` | Domain owners define product intent; S07/S15 own AI-specific behavior |
| Teacher console product surface | `app/teacher/`, `components/teacher/` | `S13` | S12 for teacher APIs, S09 for teacher copy |
| Parent console product surface | `app/parent/`, `components/parent/` | `S14` | S12 for parent APIs, S09 for guardian terminology |
| Adaptive learning engine and recommendation quality | `lib/adaptiveLearning.ts`, adaptive tests, `app/api/adaptive-learning/` | `S15` | S07 for LLM provider integration, S08 for shared types/analytics |
| Auth/account access UI and server flow | login/register/reset routes plus auth APIs | `S12` | S01 for shell-level visual polish, S09 for copy |
| Build/release stability | `npm run build`, CI, workspace-root/generated-artifact issues | `S11` for quality gate, `S10` for config/docs | S12 for server route failures |

Validation: with S11-S15 added, no major active module remains ownerless. Some shared files still require explicit coordination, but each area has one primary owner.

## Conflict And Overlap Findings

| Area/file family | Current overlap evidence | Risk | Recommended fix |
| --- | --- | --- | --- |
| `tests/e2e/` | S04, S06, S07, and S10 have each added or changed E2E coverage. | Test ownership is fragmented; failures may be treated as local to a feature instead of a release signal. | `S11` owns E2E structure, matrices, and release gates. Feature sessions may add focused tests inside their assignment, but S11 reviews broad suites. |
| Teacher console UI | S01 changed teacher shell, S08 changed teacher/live/rewards behavior, S09 changed teacher copy, S10 added teacher tests, S02 added teacher rewards API. | Teacher product decisions cross five sessions without one product owner. | `S13` owns teacher UI/product behavior; S12 owns teacher APIs; S11 owns teacher regression matrix. |
| `app/api/**` | API route work appears in S02 rewards, S04 handwriting, S07 AI Tutor, S08 adaptive/auth/live, and S10 QA discoveries. | Backend contracts and route coverage are inconsistent; visible controls can point to missing endpoints. | `S12` owns general API platform and backend E2E. S07 keeps AI Tutor API; S15 keeps adaptive API. |
| `lib/server/userStore.ts` | Used for auth, persistence, teacher/parent data, adaptive cache, rewards, classroom, and LLM-backed adaptive refresh. | A single shared server file has many feature owners and high merge/conflict risk. | Mark as shared coordination file. S12 is primary for storage architecture; S15 may edit adaptive-specific sections only with S12 coordination. |
| `lib/server/llmProvider.ts` | Shared by AI Tutor, adaptive reranking, and handwriting fallback. | Provider changes affect cost, live behavior, and multiple product surfaces. | Keep S07 as LLM provider owner; require coordination with S15 for adaptive use and S12 for server/runtime implications. |
| `types/index.ts` | Already shared by S08 and adaptive changes, and needed by teacher/parent/backend features. | Type churn can block many sessions. | Keep S08 primary for shared types; require S12/S13/S14/S15 to request type changes explicitly. |
| `components/dashboard/AdaptiveLearningContent.tsx` and `app/practice/page.tsx` | Adaptive engine status now surfaces in dashboard/practice while S02/S04 own those UIs. | Adaptive UX could drift from engine truth. | S15 owns adaptive behavior/copy semantics; S02/S04 own page layout and must coordinate adaptive panel edits. |
| Build/Next generated artifacts | Latest president report and logs show recurring `.next` missing chunks / workspace-root warnings. | Release confidence is blocked; tests collide when multiple sessions run builds. | S11 owns build gate status; S10 owns config/doc remediation; sessions coordinate before long Playwright/build runs. |

## New Session Recommendations

| Session | Workstream | Allowed write scope | Forbidden write scope | Required checks | Stop conditions |
| --- | --- | --- | --- | --- | --- |
| `S11` | QA and release quality lead | `tests/e2e/`, QA reports in `coordination/reports/`, QA matrices, release-readiness checklists, non-feature test helpers | Feature implementation in `app/`, `components/`, `lib/`, `data/` unless explicitly assigned; real production write tests without approval | For test-only changes: `npm run type-check` plus targeted Playwright; for release gate: `npm run check` when environment is clean; document any blocked build/e2e | Failing tests that require feature decisions; destructive cleanup of `.next` while other sessions run; live production writes |
| `S12` | Backend/API platform lead | General `app/api/` routes except AI Tutor and adaptive routes, `lib/server/auth.ts`, `lib/server/sessionCookie.ts`, backend API tests, server storage architecture by coordination | `app/api/ai-tutor/`, `app/api/adaptive-learning/`, feature UI pages, real `.env*`, LLM prompt/provider behavior without S07/S15 | `npm run type-check`; `npm run test:backend`; `npm run build` for route/server changes; targeted API smoke | Schema/storage migrations; auth policy changes; package/config changes; changes to shared `userStore.ts` that affect multiple domains without coordination |
| `S13` | Teacher console lead | `app/teacher/`, `components/teacher/`, teacher console UX, teacher page-level flows, teacher handoff notes | General API implementation, parent/student UI, AI Tutor, adaptive engine, shared types/i18n except coordinated copy-only edits | `npm run type-check`; targeted teacher Playwright (`teacher-workspace`, `teacher-console-button-matrix`, or relevant spec); browser check for visual UI | Missing API contract requiring S12; major teacher workflow product decision; shared component or type changes |
| `S14` | Parent console lead | `app/parent/`, `components/parent/`, parent reports/messages/child-linking UX, parent console tests by coordination with S11 | Teacher/student UI, general API implementation, shared i18n terminology decisions without S09, auth/session internals | `npm run type-check`; targeted `tests/e2e/parent-console.spec.ts`; browser check for parent UI | Guardian terminology decision; parent-child data contract changes needing S12; privacy/security policy questions |
| `S15` | Adaptive engine lead | `lib/adaptiveLearning.ts`, `lib/adaptiveLearning.test.ts`, `app/api/adaptive-learning/`, adaptive-specific tests, adaptive recommendation evaluation reports | AI Tutor chat API, global LLM provider changes without S07, dashboard/practice/lesson layout rewrites, shared types without S08 | `npm run test:analytics`; `npm run type-check`; mocked adaptive API/Playwright regression when provider behavior changes; no live LLM calls without owner approval | Cost/rate policy decisions; generated-question strategy; changes that alter BKT guardrail authority; provider/runtime changes needing S07/S12 |

## Migration Notes

- Move QA ownership from implicit `S10` to explicit `S11`. S10 still writes president reports, docs, coordination summaries, and `AGENTS.md`; S11 owns whether the product is testable and release-ready.
- Move general backend route ownership from ad hoc S02/S04/S08/S10 patches to `S12`. Domain sessions should define behavior and UI needs, while S12 keeps route contracts and backend regression stable.
- Move teacher console product ownership from scattered S01/S02/S08/S09/S10 changes to `S13`. S09 still owns copy/i18n; S12 owns APIs; S11 owns tests.
- Move parent console ownership from ownerless status to `S14`. This prevents parent reports/messages/child-linking work from being squeezed into dashboard or backend sessions.
- Split adaptive engine ownership out of S08 into `S15`. S08 keeps shared analytics/state/types; S15 owns recommendation logic, BKT/LLM guardrails, refresh behavior, and adaptive evaluation.
- Keep S07 responsible for AI Tutor and the shared LLM provider integration. S15 can consume LLM reranking, but provider/model/cost behavior must be coordinated with S07.

## Optional Future Agents

| Candidate | Add only if this becomes recurring | Suggested scope |
| --- | --- | --- |
| `S16` Security / LLM Ops | Live LLM smoke tests, key rotation, cost dashboards, audit logs, privacy controls become weekly work. | Secret hygiene, provider policy, quota dashboards, red-team style checks. |
| `S17` Curriculum QA / Content Quality | Question/lesson quality, HK curriculum alignment, and answer validation outgrow S04/S05. | Content review, answer validation, grade/topic pedagogy quality, curriculum alignment reports. |
| `S18` Release / Deployment | Build/Vercel/CI/CD and deployment parity remain daily blockers after S11/S10 remediation. | Deployment pipeline, Vercel settings, environment docs, release notes, rollback checklist. |

Recommendation: do not add S16-S18 yet. Track them as trigger-based roles so the coordination system does not become heavier than the work.

## Proposed AGENTS.md Update Plan

Do not edit `AGENTS.md` automatically from this report. If Dr. Peter Hu approves the expansion, S10 should update it in a separate documentation change.

Proposed edits:

1. Change the session-system language from `S01` through `S10` to `S01` through `S15`, and update the purpose text from "up to 10" to "up to 15" simultaneous sessions.
2. Add five rows to the session table:
   - `S11` QA and release quality lead.
   - `S12` backend/API platform lead.
   - `S13` teacher console lead.
   - `S14` parent console lead.
   - `S15` adaptive engine lead.
3. Add or clarify shared coordination files:
   - `tests/e2e/`
   - `lib/server/userStore.ts`
   - `lib/server/llmProvider.ts`
   - `app/api/` route families by domain
   - `components/dashboard/AdaptiveLearningContent.tsx`
4. Add a coordination rule that S11 may write tests and QA reports but does not fix feature bugs outside an explicit owner assignment.
5. Add a coordination rule that S12 owns route contracts and server architecture, while feature UI owners retain persona/workflow decisions.
6. Add a coordination rule that S15 owns adaptive logic but must coordinate LLM provider changes with S07 and shared type changes with S08.
7. Update the Quality Bar to name S11 as the default owner for regression matrix upkeep and S10 as the default owner for president-report synthesis.

## Validation Checklist

| Validation item | Result |
| --- | --- |
| No major active module is ownerless after proposed expansion. | Passed. Teacher, parent, backend, QA, adaptive, auth, and release quality all have proposed primary owners. |
| New agents do not create overlapping write scopes by default. | Passed with coordination requirements for shared server/type/provider files. |
| S10 remains coordination/reporting owner, not general QA implementer. | Passed. S11 takes QA/release quality; S10 keeps docs/config/reporting. |
| Latest build/API/teacher/parent/adaptive risks have accountable owners. | Passed. Build/e2e: S11/S10; API/backend: S12; teacher: S13; parent: S14; adaptive: S15/S07. |
| Proposed update avoids feature-code churn. | Passed. This report changes only coordination artifacts and proposes, but does not apply, `AGENTS.md` edits. |

## Immediate Next Steps

1. Dr. Peter Hu approves or revises the S11-S15 expansion.
2. S10 applies the approved `AGENTS.md` documentation update.
3. Assign the first S11 task: stabilize the release-quality dashboard around current build/e2e failures and decide the clean check sequence.
4. Assign the first S12 task: inventory backend route contracts and triage current backend E2E failures.
5. Assign the first S13 task: convert the teacher console button-matrix failures into implementation packages split between S13 UI and S12 APIs.
6. Assign the first S15 task: create an adaptive engine test/monitoring plan for LLM rerank behavior without live provider calls.
7. Activate S14 when parent-facing work is scheduled, or immediately if parent reports/messages are part of the next milestone.

