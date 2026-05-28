# Development Milestones Report

- Report date: 2026-05-09
- Project: hk-math-lab-template / MAIS
- Reporting session: S10
- Sources reviewed: `AGENTS.md`, `README.md`, package scripts, current file structure, session logs from 2026-05-07 through 2026-05-09, blocker reports, and prior verified memory for the MTR-to-Subway terminology change.

## Executive Summary

The project has moved from a polished S1-S6 math learning template into a broader P1-S6 bilingual learning platform with real persistence, authentication, student progress tracking, AI tutor support, teacher workspace foundations, primary and secondary roadmap systems, richer practice content, and meaningful automated test coverage.

The biggest milestone is that the app is no longer just a static learning-site shell. It now has SQLite-backed local persistence, signed sessions, API-backed learning activity, student dashboard/profile flows, assignment/resource/assessment/message APIs, teacher-side management surfaces, and Playwright coverage for major student and teacher journeys.

The second major milestone is curriculum expansion. The app now treats P1-P6 and S1-S6 as first-class grade bands, with 49 topics, P1-S6 learning path coverage, primary and secondary Subway maps, primary-friendly visualization lab entries, and a curated 285-question Practice Arena bank after removing earlier generated filler.

The third major milestone is quality discipline. The team introduced MVP readiness tests, analytics tests, backend API integration tests, frontend E2E suites, rendered browser checks, screenshot evidence, and a parallel-session coordination contract. Several transient local `.next` cache/dev-server issues were found, but the latest recorded full frontend E2E pass reached 22 passing tests plus 2 expected mobile backend API skips.

## Milestone Timeline

### 2026-05-07: MVP Readiness And Full-Stack Hardening

The first major development phase was an MVP-readiness review followed by implementation of the most important blockers.

Key outcomes:

- Added SQLite-backed persistence and clarified the storage boundary for local/demo or single-node pilot use.
- Hardened sessions and authentication behavior, including stricter production handling.
- Required authentication for tracked practice attempts.
- Expanded seed content so the app was less sparse as a learning product.
- Added AI Tutor safety controls, clearer fallback behavior, rate/cost constraints, and safer context handling.
- Improved bilingual copy handling.
- Added MVP readiness tests and project validation scripts.
- Updated README and environment documentation.
- Added CI workflow coverage.

Validation evidence:

- TypeScript check passed.
- Analytics tests passed.
- MVP readiness tests passed.
- Production Next build passed.

Strategic significance:

This phase turned the project from a prototype-style frontend into a safer MVP foundation with persistence, auth, tests, documentation, and deployment-minded constraints.

### 2026-05-07 To 2026-05-08: Visualization Lab Organization

The Visualization Lab was reorganized into a grade-first experience. S1-S6 roadmap visualization coverage stayed available, while larger interactive labs were grouped by grade and category.

Key outcomes:

- Added clearer grade sections for S1, S2, and S3 interactive labs.
- Added route anchors and category labels.
- Added a coverage note for S4-S6 while larger senior labs remained future work.

Strategic significance:

This established the pattern later used for P1-S6 visualization expansion: grade-specific discovery first, then deeper interactive modules.

### 2026-05-08: Website Review Implementation And API Coverage

After a website review, accepted suggestions were implemented across API routes, auth/session behavior, accessibility, tutor behavior, and protected-route messaging.

Key outcomes:

- Added or completed API routes for analytics summary/export, lessons, settings, registration, logout, password reset confirmation, mistakes, and admin storage export.
- Improved protected-route messaging and local production cookie behavior.
- Added math accessibility through a reusable `MathText` direction.
- Improved topic filter clarity and Visualization Lab quick filtering.
- Added mobile bottom spacing for the floating AI Tutor.
- Converted the old static quadratic sample lesson into the unified dynamic lesson system.
- Expanded every topic to at least 5 questions at that stage, before later question-bank quality repair.
- Added guards so lesson/question coverage gaps do not silently return.

Validation evidence:

- `npm run type-check` passed.
- `npm run test:analytics` passed.
- `npm run test:mvp` passed.
- `npm run build` passed.
- Production API smoke checks passed.
- Browser smoke verified lesson rendering and route behavior.

Strategic significance:

This phase reduced placeholder behavior and made visible controls more likely to have real API backing.

### 2026-05-08: Function Completion And First Full Student E2E

A function-completion validation layer was added, with Playwright coverage for a full student journey.

Key outcomes:

- Added Playwright E2E coverage for registration, login/logout, password reset, dashboard, roadmap, lesson progress, practice attempts, mistake book, visualization completion, analytics export, and AI Tutor local-helper fallback.
- Made the AI Tutor panel an accessible named dialog.
- Hardened analytics JSON export and downloads.
- Added an explicit local/demo reset-link flag for production preview testing.
- Updated docs around E2E and local reset settings.

Validation evidence:

- `npm run test:e2e` passed on desktop Chrome and mobile Chrome against a production preview with isolated SQLite storage.
- `npm run check` passed, including type-check, analytics tests, MVP tests, and build.

Strategic significance:

This moved the project from "feature tested in pieces" to a repeatable end-to-end student smoke path.

### 2026-05-08: Teacher Platform Foundation

The teacher/admin side was introduced as a protected workspace.

Key outcomes:

- Added `/teacher` route group with overview, classes, assignments, and inbox pages.
- Added teacher/admin authorization gates.
- Added a teacher shell with sidebar navigation, class selector, search, language toggle, and theme toggle.
- Added core teacher domain types.
- Added teacher records, demo seed data, and query helpers in the existing SQLite app-state pattern.
- Added `/api/teacher/foundation`.
- Added role-aware login/account routing.

Validation evidence:

- `npm run type-check` passed.
- `npm run build` passed.
- Production HTTP smoke confirmed teacher access, student denial, and foundation API behavior.
- Browser smoke confirmed teacher login, navigation, and shell rendering.

Strategic significance:

This established the second major product persona: teacher/admin. It created the scaffolding for class management, assignments, inbox, reports, and analytics.

### 2026-05-08 To 2026-05-09: P1-S6 Expansion

The app expanded beyond the original secondary focus into a full P1-S6 surface.

Key outcomes:

- Expanded `GradeId` and grade data to P1-P6 plus S1-S6.
- Centralized grade validation around shared grade data.
- Updated the homepage grade selector into Primary and Secondary groups.
- Added primary topic, question, lesson, and visualization seed coverage.
- Normalized storage so primary topics and lesson progress flow into dashboard/progress analytics.
- Updated login/register/settings and AI Tutor grade handling to work across P1-S6.
- Added P1-S6 Learning Path and Visualization Lab coverage.
- Kept Student Peter defaulting to S3 while supporting primary grade switching.

Validation evidence:

- `npm run type-check` passed.
- `npm run test:analytics` passed.
- `npm run test:mvp` passed.
- `npm run build` passed.
- Playwright smoke validated P1 Dashboard, Learning Path, Visualization Lab, Practice Arena, Progress, and a P1 lesson.

Strategic significance:

This is one of the most important product milestones. MAIS became a primary-through-secondary learning system instead of a secondary-only app.

### 2026-05-08 To 2026-05-09: Branding, Navigation, And App Shell Polish

The app shell received several rounds of branding and UX polish.

Key outcomes:

- Rebranded visible home/index identity to `MAIS` with the subtitle `Mathematics Adaptive Interactive System`.
- Added a favicon-style MAIS logo and aligned the navbar mark.
- Added PH and PedaNova footer identity elements.
- Added email, website, and PedaNova contact/brand rail in the footer.
- Refined footer layout to avoid the floating AI Tutor button.
- Replaced the language pill with a segmented language control.
- Changed the authenticated student navbar pill to `Student Peter's Progress`.
- Removed the Progress nav item and added a Lesson nav item linking to `/lesson/quadratic-functions`.
- Removed the standalone `/progress` page after progress content moved into the dashboard.
- Refined home grade selector behavior so Primary and Secondary groups start collapsed and expand from heading buttons.

Validation evidence:

- Multiple `npm run type-check` runs passed.
- Several route-specific browser checks and screenshots confirmed home, footer, navbar, and mobile layout behavior.
- Some changes also passed `npm run build`.

Strategic significance:

This phase tightened product identity and reduced navigation clutter. It also consolidated student progress into the dashboard rather than a separate page.

### 2026-05-08 To 2026-05-09: Terminology Safety - MTR Renamed To Subway

The visible `MTR` terminology was renamed to `Subway` after a branding/legal sensitivity concern.

Key outcomes:

- Updated website-facing copy in roadmap-related UI from `MTR` to `Subway`.
- Changed route codes, headings, legend text, explanatory text, and an SVG aria label.
- Verified that app-facing source no longer contained visible `MTR` matches outside historical logs.
- Verified rendered routes no longer showed `MTR` and did show `Subway`.

Validation evidence:

- `npm run type-check` passed.
- Rendered checks on `/learning-path`, `/secondary-roadmap`, and `/visualization-lab` found no `MTR` and confirmed `Subway` was present.

Strategic significance:

This reduced potential brand confusion and set a precedent: visible website copy should be verified in rendered routes, not only through source search.

### 2026-05-09: Learning Path And Subway Map Maturity

The roadmap system matured from grade-filtered learning paths into richer primary and secondary Subway maps.

Key outcomes:

- Learning Path now supports Primary P1-P6 and Secondary S1-S6 modes.
- Added `Open Primary Subway Map` and `Open Secondary Subway Map` actions.
- Added an independent `/primary-roadmap` page.
- Extracted the mature secondary map implementation into shared `SubwayNetworkMap`.
- Gave `/primary-roadmap` the same mature interaction model as `/secondary-roadmap`: full SVG map, Fit Map, zoom controls, grade jump buttons, mini map, station-linked minibus detail behavior, desktop detail panel, mobile drawer, route index, and bilingual copy.
- Added full-screen/expanded map controls.
- Fixed enlarged-map label clutter by staging route and station labels by zoom, grade focus, selected topic, and stride.
- Fixed hidden detail panel behavior in full-screen map mode.
- Completed a detection-only Learning Path audit and found two minor issues: mobile AI Tutor overlap with the band toggle and repeated generic `Open lesson` accessible names.

Validation evidence:

- `npm run type-check` passed repeatedly.
- `npm run build` passed for route additions.
- Browser checks verified `/primary-roadmap`, `/secondary-roadmap`, full-screen behavior, mini map, station detail behavior, and staged labels.
- Source scan confirmed no `MTR` regression.

Strategic significance:

The roadmap is now a major product differentiator: a navigable P1-S6/S1-S6 conceptual Subway map instead of only a list or simple card grid.

### 2026-05-09: Practice Arena Question Types And Quality Repair

Practice Arena evolved from mostly multiple-choice cards into a multi-format practice system.

Key outcomes:

- Added support for multiple-choice, fill-in, short-answer, and graph question types.
- Added a question-type filter.
- Added type badges and type-specific answer controls.
- Added coordinate-grid graph panels for graph questions.
- Added S2 seed examples and topic-specific graph question coverage.
- Added at least five Quadratic Patterns graph questions and additional graph coverage for Coordinates, Functions, Coordinate Geometry, Data Handling, and P6 Speed.
- Temporarily generated 80 questions per topic, then later reversed course to protect quality.
- Removed `coverage-*` filler questions and restored a curated 285-question exported bank.
- Added primary fallback supplementals using real math prompts instead of generic prose.
- Added accepted-answer aliases and stronger server-side answer normalization for units, symbols, coordinates, fractions, decimals, and bilingual phrase answers.
- Filtered stale `coverage-*` persisted records from normalized question data.
- Fixed Practice Arena initial load so it shows no cards until a relevant filter is selected.
- Fixed sentence-style answer choices that were accidentally rendered as KaTeX/math italics.
- Fixed graph rendering so parabolas are smooth and multi-point line graphs mark every value.

Validation evidence:

- `npm run type-check` passed.
- `npm run test:mvp` passed 14/14 after new audit tests.
- `npm run build` passed after the question-bank repair.
- Browser/API checks confirmed 285 questions, 0 generated coverage questions, 0 undercovered topics, and correct representative primary/lower-secondary/senior/graph filtered views.

Strategic significance:

This phase corrected a key product risk: quantity without quality. The final direction favors reviewed, topic-specific question content over synthetic coverage filler.

### 2026-05-08 To 2026-05-09: Lessons And Math Rendering

Lesson pages gained stronger math rendering and cleaner AI Tutor placement.

Key outcomes:

- Added KaTeX rendering through reusable `MathText`.
- Wired math rendering into Practice Arena, Mistake Book, lesson pages, AI Tutor messages, and visualization formula labels.
- Converted formulas in question and lesson seed data to inline LaTeX delimiters where appropriate.
- Fixed inline math baseline alignment.
- Fixed generated lesson worked-example answers so math-looking answers are wrapped and rendered.
- Tightened `MathText` detection so normal prose choices no longer become italic math.
- Removed inline `Ask AI Tutor` buttons from reusable lesson pages while preserving the global floating AI Tutor launcher.
- Added `tests/e2e/lesson-all.spec.ts` for lesson-wide QA detection; the S10 log currently contains the assignment and plan but does not yet include a completed handoff/check result for that sweep.

Validation evidence:

- `npm run type-check` passed across related changes.
- `npm run build` passed for the initial renderer integration.
- Browser checks confirmed KaTeX rendering, baseline behavior, no raw delimiters, and removal of inline lesson tutor buttons.

Strategic significance:

Lessons became more mathematically credible and less cluttered. The next important step is to complete or rerun the lesson-wide QA sweep and record its final findings.

### 2026-05-09: Visualization Lab Primary Maturity

The Visualization Lab became much more age-appropriate for primary learners.

Key outcomes:

- Fixed pointer-to-graph alignment in responsive SVG visualizations using SVG screen CTM conversion.
- Added bespoke roadmap mini-visualizations for all P1-S6 topic routes.
- Added visible selected/action states for roadmap visualization cards.
- Added focus/scroll behavior when selecting a visualization card.
- Removed generic `visual model` placeholder wording for current roadmap topics.
- Replaced primary deep-dive fallback visuals with topic-aware models:
  - P1 number-line jumps.
  - P2 place value and length/data charts.
  - P3 shapes, symmetry, and patterns.
  - P4 fractions, angles, area.
  - P5 volume, charts, averages.
  - P6 speed, percentages, and ratios.
- Added interactive controls to P2 Length and Data Explorer.
- Added interactive controls to P3 Geometry and Pattern Explorer.
- Fixed the P1 number-line equation overlap.
- Refined teacher Live Classroom prompt and right-side control layout.

Validation evidence:

- `npm run type-check` passed.
- Source coverage checks found 49 roadmap topic IDs and 0 missing mini-visual cases.
- Browser verification confirmed representative primary and secondary modules behaved as expected.
- Browser checks confirmed no visualization-related console errors beyond expected logged-out `/api/me` 401 probes.

Strategic significance:

The primary experience now feels intentionally designed rather than being secondary modules with primary labels.

### 2026-05-09: Student Dashboard, Progress, And Profile

Progress moved from a standalone page into Student Peter's dashboard, and student profile editing was added.

Key outcomes:

- Removed four top metric cards from the Progress page.
- Moved Progress header content to the dashboard above the progress cards.
- Moved weekly learning activity, mastery map, weak topics, and recent activity into the bottom of the dashboard before the footer.
- Deleted the standalone `/progress` route.
- Added a student profile editor near the dashboard grade controls.
- Added avatar selection and persisted display-name/avatar updates through `/api/me/profile`.
- Exposed profile update behavior through `AppProviders`.
- Added route-visible duration tracking and conservative fallback minutes for older durationless activity.

Validation evidence:

- `npm run type-check` passed.
- `npm run build` passed for route deletion/profile work.
- Browser checks verified profile save/reload persistence and `/progress` now serving the not-found view.
- Progress API check confirmed nonzero weekly minutes for Student Peter.

Strategic significance:

The dashboard is now the student's main operating surface: progress, profile, grade context, recommendations, and activity insights are consolidated in one place.

### 2026-05-08 To 2026-05-09: AI Tutor UI, Identity, And Attachments

The AI Tutor moved from a simple floating helper into a more branded and capable assistant surface.

Key outcomes:

- Redesigned AI Tutor launcher visuals.
- Added a custom tutor mark and later renamed the tutor identity from Professor Aurora to Professor Nova.
- Added Codex-style attachment menu UI with selected-file chips.
- Fixed the `Add photos & files` picker interaction.
- Wired attachments into tutor requests as multipart form data.
- Parsed text-like attachments and included snippets in the tutor request.
- Passed small image attachments to compatible vision/chat-completions providers as image content parts.
- Kept behavior safe without provider credentials through local-helper fallback.

Validation evidence:

- `npm run type-check` passed.
- Browser checks verified the attachment menu, file chooser, and selected-file chips.
- A production build during the S07 task hit unrelated route-module collection failures, but later S10 testing recorded passing build/E2E evidence for the broader app.

Strategic significance:

The tutor is now closer to a real multimodal learning assistant, while still preserving credential safety and local fallback behavior.

### 2026-05-09: Full-Stack Student/Teacher Feature Completion

The accepted frontend/backend audit recommendations were implemented as full-stack MVP flows.

Key outcomes:

- Added API-backed student resource pages.
- Added student assessment pages and submission routes.
- Added class join flow.
- Added student messages and reply APIs.
- Added teacher resource download route.
- Added teacher report PDF/save routes.
- Added teacher inbox draft route.
- Added teacher shell filtering/search query parameter behavior.
- Added assignment completion updates from lessons, practice, visualizations, resources, and assessments.
- Added password reset email delivery plumbing through Resend or webhook configuration, while staying safe without credentials.
- Added email-aware account fields.

Validation evidence:

- `npm run type-check` passed.
- `npm run test:analytics` passed.
- `npm run test:mvp` passed.
- `npm run build` passed.

Strategic significance:

This is the point where many previously visible UI controls became backed by persistence and API behavior instead of functioning as placeholders.

### 2026-05-09: Backend And Frontend Test Coverage

The testing surface grew from unit-style checks and one smoke path into broader API and frontend coverage.

Key outcomes:

- Added `tests/e2e/backend-api.spec.ts`.
- Added `npm run test:backend`.
- Added backend API coverage for auth/session, student learning APIs, analytics export, AI Tutor boundaries, password reset, teacher classes/resources/assignments/assessments/reports/inbox/live classroom, student resource/assessment/message flows, and admin storage export.
- Added frontend E2E coverage for app shell/preferences/auth, student dashboard/progress/roadmaps/lesson/resource/assessment/messages/practice/mistake book, visualization modules, AI Tutor attachments, live classroom, and teacher workspace flows.
- Added shared E2E helpers and fixture PDF.
- Updated existing student smoke tests to match current registration and AI Tutor behavior.

Validation evidence:

- `npm run test:backend` passed, 2/2 backend API tests.
- `npm run test:analytics` passed, 5/5.
- `npm run test:mvp` passed, 10/10 in S10 test scope and later 14/14 after S04 question-bank audit expansion.
- `PLAYWRIGHT_PORT=3031 npm run test:e2e` passed, 22 tests passed with 2 mobile backend API skips.
- The Playwright E2E command ran the production build/server step and passed.

Strategic significance:

This created a maintainable safety net for the broadened platform. Earlier frontend test failures were documented and then resolved during the test-implementation pass, though a teacher form reset bug remains intentionally noted as residual feature-code debt.

## Current Product State

As of the reviewed logs, MAIS includes:

- P1-S6 bilingual grade model.
- Student registration, login, logout, local/demo password reset, and session persistence.
- Student dashboard with profile editor, avatar selection, grade controls, progress cards, weak topics, weekly learning activity, recent activity, and recommendations.
- Dynamic lesson pages for roadmap topics.
- Practice Arena with multiple-choice, fill-in, short-answer, and graph questions.
- Curated 285-question bank with graph-friendly topic coverage and answer normalization.
- Mistake Book and authenticated attempt tracking.
- P1-S6 Learning Path plus standalone Primary and Secondary Subway map pages.
- Visualization Lab with P1-S6 coverage, topic-aware primary models, and secondary interactive modules.
- Floating AI Tutor with local-helper fallback, provider-ready API route, branded UI, and attachment handling.
- Teacher workspace foundation and expanded teacher APIs for classes, assignments, resources, assessments, reports, inbox, analytics, and live classroom.
- Backend and frontend Playwright coverage.

## Validation Snapshot

Strongest recorded green checks:

- `npm run type-check`: repeatedly passed across major phases.
- `npm run test:analytics`: passed, 5/5.
- `npm run test:mvp`: passed, latest recorded S04 repair run 14/14.
- `npm run test:backend`: passed, 2/2 backend API tests.
- `npm run build`: passed in several major integration phases.
- `PLAYWRIGHT_PORT=3031 npm run test:e2e`: passed, 22 passed and 2 mobile backend API skips.

Important caveats:

- Local development sometimes hit `.next` cache or duplicate-server conflicts when several Next servers were running from the same checkout.
- One S09 rendered check of `/visualization-lab` timed out while trying to create `.next/types/app/visualization-lab`; source/type checks passed, but rendered confirmation was not completed for that tiny copy change.
- The S10 lesson-wide QA sweep has a test file present, but the S10 log currently records the plan rather than a completed handoff with results.
- Teacher workspace tests noted an existing `event.currentTarget.reset()` client error after successful class/resource form submission; tests avoid asserting zero page errors there until the feature bug is fixed.
- External/live AI behavior still depends on owner-provided server-side provider keys.
- Production password reset email requires Resend or webhook credentials and deployment configuration.

## Coordination Milestones

The project now has a mature parallel-work protocol:

- `AGENTS.md` defines S01-S10 roles, write scopes, forbidden scopes, logs, blockers, and quality bars.
- Session logs exist for S01-S10 across 2026-05-07 to 2026-05-09.
- Blockers are recorded separately under `coordination/blockers/`.
- The workflow emphasizes scoped edits, source checks, browser verification, handoff notes, and not reverting unrelated work.
- S10 remains the natural owner for tooling, reports, and cross-session executive summaries.

This matters because the project has crossed the threshold where uncoordinated edits would create real risk. The AGENTS system is now part of the development infrastructure.

## Remaining Risks And Recommended Next Milestones

1. Complete and log the lesson-wide QA sweep.
   The `lesson-all.spec.ts` file exists, but the current S10 log does not show final execution results. Run the planned desktop/mobile lesson sweep and record findings.

2. Fix the teacher form reset client error.
   Store `const form = event.currentTarget` before awaited fetches in the affected teacher form handlers, then re-enable stricter page-error assertions in teacher workspace tests.

3. Stabilize local dev-server workflow.
   Avoid multiple `next dev` servers sharing one `.next` folder. If parallel previews are needed, use separate worktrees or a single production preview.

4. Add focused regression tests for roadmap full-screen behavior.
   The primary/secondary map controls are important and visual. Add tests for full-screen enter/exit, label staging, and station detail behavior once the roadmap smoke path is stable.

5. Continue reviewed question expansion.
   Keep the quality-first direction from the 285-question repair. Add topic-specific packs instead of generated coverage filler.

6. Improve production integrations.
   Add real email delivery configuration for password resets, decide on durable deployment storage, and document provider requirements for live AI Tutor mode.

7. Polish mobile hit targets.
   Recorded concerns include AI Tutor overlap near Learning Path controls and mobile sticky-layer intersections in some E2E tests.

8. Deepen teacher analytics and reporting.
   The teacher foundation is strong enough for the next milestone: richer dashboard analytics, class-level risk flags, action queues, and improved report PDF rendering.

## Bottom Line

The development trajectory is strong. In three days of logged work, the project advanced from a secondary math learning template into a broader P1-S6 adaptive learning platform with student and teacher surfaces, real persistence, richer curriculum paths, AI tutor interaction, and serious automated verification.

The next milestone should be consolidation rather than broad feature expansion: finish lesson QA, fix known teacher/mobile issues, stabilize local dev workflow, and keep adding high-quality reviewed math content.
