# California Math Practice Beta Release Boundary

- Date: 2026-06-04
- Session: S10
- Workstream: Naming, release boundary, status reporting, and cross-session assignment packet
- Source inputs:
  - Owner decision on 2026-06-04: use the short-term beta positioning below and split follow-up work across S18, S21, S05, S04, S11, and S10.
  - S18 evidence artifact: `coordination/content-qa/2026-06-04-S18-us-ca-launch-readiness-gap-audit.md`.
- Production code edit: none.

## Approved Short-Term Public Positioning

Use this as the current release label:

> California Math Practice Beta

Use this as the short public description:

> California Math Practice Beta: standards-aligned practice and diagnostic experience, with lesson content layer in progress.

Allowed status language:

- "California Math Practice Beta"
- "standards-aligned practice and diagnostic experience"
- "selected California practice question packages are approved for integration handoff"
- "lesson content layer in progress"
- "not yet a full California lesson/curriculum launch"

Avoid these claims until the lesson layer completion standard below is met:

- "California lesson launch"
- "California course launch"
- "California curriculum launch"
- "California curriculum is live"
- "full California K-12 curriculum"
- Any wording that implies every California skill already has reviewed lessons, examples, remediation, and progress coverage.

## Release State Definition

Current state:

- California practice/question-bank content has enough S18 evidence to support a practice beta after production integration and release QA.
- The short-term product should be described as practice and diagnostics, not as lessons or a full curriculum.
- The lesson layer remains a separate workstream that must be generated, implemented, reviewed, and regression-tested before launch wording changes.

Next state after S04/S11/S22 integration and QA:

- "California Math Practice Beta" can be released if app-integrated California practice packages, routing, grade filters, answer feedback, diagnostic behavior, and basic progress capture pass release checks.
- Public copy should still say the lesson content layer is in progress.

Future state after S05/S18/S21/S11 completion:

- Only after the lesson layer completion standard below passes should S10 revisit whether the product can be called a California lesson, course, or curriculum launch.

## California Lesson Layer Completion Standard

The California lesson layer is not complete until all of the following are true:

1. California standards are mapped to MAIS topics and skills.
2. Every included skill has a lesson page or lesson module.
3. Each lesson includes bilingual concept explanations.
4. Each lesson includes worked examples.
5. Each lesson includes scaffolded practice.
6. Each lesson includes mistake remediation or misconception feedback.
7. The app tracks lesson progress and standards/topic coverage.
8. S18 provides curriculum QA signoff for alignment, math correctness, bilingual clarity, age fit, and release readiness.

Minimum evidence bundle before changing the release label:

- Standards-to-topic/skill alignment matrix.
- Lesson inventory showing one implemented module/page per included skill.
- Content package with concept explanations, worked examples, scaffolded practice, remediation copy, and answer/validation notes.
- S18 QA checklist and final signoff.
- S11 release-readiness report covering lesson routes, practice handoff, progress tracking, and mobile/browser behavior.
- S10 status report explicitly approving the naming change from practice beta to a larger lesson/course/curriculum label.

## Session Assignment Packets

### S18 - California Standards Alignment and QA Checklist

- Objective: Produce the California standards alignment and lesson/practice QA checklist for the beta and lesson-layer gate.
- Write scope: `coordination/content-qa/` reports, alignment matrices, QA checklists, issue reports, and final QA decision artifacts.
- Forbidden scope: live `data/questions.ts`, topic/lesson source edits, app UI/routes, adaptive engine, API/provider behavior, and package/config files.
- Acceptance criteria:
  - Map California standards to MAIS topic/skill IDs or proposed IDs.
  - Identify missing or ambiguous mappings.
  - Define pass/fail criteria for bilingual explanations, examples, scaffolded practice, remediation, and coverage tracking.
  - State whether the current integrated product supports only Practice Beta or can advance to a lesson-layer gate.
- Checks:
  - Report-only: no code check required.
  - Cite official California source pages and the date checked when making standards/framework claims.
- Stop conditions:
  - Stop if Kindergarten scope, grade-span wording, or standards source version requires owner decision.
  - Stop if any candidate content reproduces protected standards/framework/test/textbook material too closely.

### S21 - Lesson and Content Candidate Package

- Objective: Generate a California lesson/content candidate package that S05 can implement and S18 can QA.
- Write scope: package-local generation/QA scripts and candidate packages under `coordination/content-qa/`, owner-assigned `data/generated-content/` candidate handoffs, and local/private `.local/rag/` outputs when needed.
- Forbidden scope: final S18 quality signoff, live `data/questions.ts` or lesson source edits without assignment, app UI/routes, API/provider behavior, real `.env*`, package/config files, and raw copyrighted corpus exposure.
- Acceptance criteria:
  - Provide structured lesson modules by grade/topic/skill with metadata, bilingual concept explanations, worked examples, scaffolded practice, remediation, answer keys, validation notes, and approval state.
  - Keep generated content separate from live app data until S18/S05 integration gates are passed.
  - Include deterministic math validation notes where applicable.
- Checks:
  - Run package-local syntax/schema/count/audit checks.
  - Document any skipped app checks as candidate-package-only work.
- Stop conditions:
  - Stop if source rights are unclear, math cannot be validated, or lesson scope conflicts with S18/S05 definitions.

### S05 - California Lesson Page and Lesson Layer Implementation

- Objective: Implement the lesson layer UI/data path once S21 candidate modules and S18 QA gates are ready.
- Write scope: `app/lesson/`, future `data/lessons.ts`, and future `components/lesson/`.
- Forbidden scope: dashboard, practice, visualization lab, AI route, global config, direct S18 candidate package mutation, and question-bank integration unless explicitly coordinated.
- Acceptance criteria:
  - Lesson pages/modules render each included California skill.
  - Lessons show bilingual concept explanation, worked examples, scaffolded practice, remediation, and progress affordances.
  - Lesson routes interoperate with practice and progress tracking without claiming full curriculum launch prematurely.
- Checks:
  - `npm run type-check`.
  - Browser route smoke for representative California lesson pages when a dev server is available.
  - Coordinate S11 for broader release coverage.
- Stop conditions:
  - Stop if S21/S18 candidate content is not accepted or if shared data/API changes are needed outside S05 scope.

### S04 - California Practice Beta and Question-Bank Experience

- Objective: Polish the practice beta and question-bank experience around the owner-selected California packages.
- Write scope: `app/practice/`, `app/mistake-book/`, `components/practice/`, and `data/questions.ts` when explicitly handling practice/question-bank integration.
- Forbidden scope: roadmap data, visualization modules, AI route, global config, lesson-layer implementation, and S18/S21 candidate QA internals.
- Acceptance criteria:
  - California practice filters, grade/topic selection, question rendering, answer submission, feedback, retry/mistake behavior, and diagnostic flow feel release-ready.
  - Practice copy uses "California Math Practice Beta" and does not imply lesson/course/curriculum launch.
  - Integrated question set matches the S18-approved/S10-recorded beta boundary.
- Checks:
  - `npm run type-check`.
  - Relevant question-bank/solvability checks if `data/questions.ts` or generated question imports are touched.
  - Browser smoke for `/practice` with California filters.
- Stop conditions:
  - Stop if practice integration needs shared profile/API/storage changes outside S04 scope or if content QA evidence is incomplete.

### S11 - Regression Testing and Release Readiness

- Objective: Verify California Math Practice Beta release readiness and prevent lesson/curriculum overclaim regressions.
- Write scope: `tests/e2e/`, QA reports in `coordination/reports/`, release-readiness matrices, and non-feature test helpers.
- Forbidden scope: feature implementation in `app/`, `components/`, `lib/`, or `data/` unless explicitly assigned.
- Acceptance criteria:
  - Release matrix covers California guest/authenticated paths, grade/topic filters, answer feedback, mistake behavior, diagnostic/progress capture, mobile behavior, and copy guardrails.
  - Report clearly separates Practice Beta readiness from Lesson Layer readiness.
  - Any P0/P1 blockers are filed with owning sessions.
- Checks:
  - `npm run type-check` plus targeted Playwright commands where practical.
  - Document blocked browser/build conditions with root cause and owner.
- Stop conditions:
  - Stop instead of fixing feature bugs outside S11 scope.

### S10 - Naming, Status Report, and Launch Boundary

- Objective: Keep project-facing and executive-facing wording aligned with the beta boundary.
- Write scope: `README.md`, `AGENTS.md`, config/docs owned by S10, and `coordination/` reports/session logs.
- Forbidden scope: feature implementation inside other session scopes unless explicitly assigned.
- Acceptance criteria:
  - Current approved stage is recorded as "California Math Practice Beta".
  - Reports avoid "California lesson launch", "course launch", and "curriculum launch" until the lesson layer completion standard is met.
  - Session assignment packets and release boundary are visible to S18/S21/S05/S04/S11.
- Checks:
  - Documentation-only validation such as `git diff --check` and targeted `rg` for prohibited/approved wording.
  - No code check required unless S10 edits code/config.
- Stop conditions:
  - Stop if public website/app copy must be edited in another session's ownership area without explicit assignment.

## Immediate S10 Decision Record

Decision recorded:

- Current stage name: "California Math Practice Beta".
- Current short positioning: "standards-aligned practice and diagnostic experience, with lesson content layer in progress."
- Prohibited current positioning: "California lesson launch", "course launch", "curriculum launch", or equivalent claims.
- Lesson layer is a future launch gate, not part of the current beta claim.

## Checks Not Run

- Not run: code/build/browser checks, because this S10 turn created a coordination/report artifact only and did not edit production TypeScript, runtime data, routes, UI, or config.
