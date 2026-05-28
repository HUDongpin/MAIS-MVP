# AGENTS.md - MAIS-MVP Parallel Session Guide

This file is the coordination contract for AI/Codex sessions working in `/Users/dongpinhu/Desktop/MAIS-MVP`.

## Project Snapshot

- Project: `MAIS-MVP`, a bilingual Hong Kong P1-S6 math learning app.
- Stack: Next.js App Router, React 19, TypeScript strict mode, Tailwind CSS, Framer Motion.
- Package manager: use `npm` scripts from `package.json`.
- Important scripts:
  - `npm run dev` starts the local Next.js dev server.
  - `npm run build` runs a production Next build.
  - `npm run type-check` runs `tsc --noEmit`.
  - `npm run test:analytics` compiles and runs `lib/learningAnalytics.test.ts` with Node test runner.
- Current checkout note: this folder is not currently a Git repository. If Git is initialized later, sessions should still follow the ownership rules below and may add branch/worktree rules on top.
- Do not edit generated or local-only outputs: `node_modules/`, `.next/`, `.tmp/`, `tsconfig.tsbuildinfo`, `.DS_Store`, `.env`, `.env.local`, or other real secret files, except for owner-assigned S19 API configuration tasks.

## Purpose

This project can be managed by up to 20 simultaneous AI sessions. Each session may be assigned independent work while the owner is offline or sleeping. The goal is steady project progress without conflicting edits, lost work, or unreviewable changes.

Every session must:

- Read this file before doing project work.
- Declare its session ID, such as `S01`, in its first note or session log.
- Work only inside its assigned write scope.
- Keep changes small, reviewable, and aligned with the existing project style.
- Leave a handoff note before stopping.
- Never revert unrelated user or session changes.

## Project Conventions

- Use the `@/` path alias for project imports.
- Add `"use client";` only for components that need hooks, browser APIs, Framer Motion client behavior, or local storage.
- Keep shared types in `types/index.ts`.
- Keep reusable mock data in `data/`.
- Keep pure math, analytics, and utility logic in `lib/`.
- Keep bilingual UI copy as `{ en, zh }` localized text where the surrounding code already uses the dictionary or `LocalizedText`.
- Preserve the current design language: `page-container`, `glass-panel`, `soft-panel`, `gradient-text`, `focus-ring`, Tailwind utility classes, dark-mode support, and responsive layouts.
- Keep server-only LLM configuration in `.env.local`; never expose secrets through `NEXT_PUBLIC_` variables unless the owner explicitly approves. S19 may configure real local and Vercel environment variables only when explicitly assigned by the owner, and must never write secret values into Git, session logs, reports, screenshots, or command output.

## Session System

Use session IDs `S01` through `S20`. A session may read any project file needed for context, but it may write only to its allowed files/modules unless the owner explicitly expands its scope.

| Session | Owner/role | Workstream | Allowed files/modules | Forbidden files/modules | Status | Handoff notes |
| --- | --- | --- | --- | --- | --- | --- |
| `S01` | App shell lead | Home, layout, navigation, theme surface | `app/layout.tsx`, `app/page.tsx`, `components/layout/`, `components/home/`, `components/background/`, `components/ui/ThemeToggle.tsx`, `components/ui/LanguageToggle.tsx` | API route, analytics logic, practice, visualizations, data files except with approval | Available | Log in `coordination/session-logs/YYYY-MM-DD-S01.md` |
| `S02` | Dashboard lead | Dashboard, progress page, progress cards, analytics display UI | `app/dashboard/page.tsx`, `app/progress/page.tsx`, `components/dashboard/`, `components/cards/`, `data/progress.ts`, `data/learningAnalytics.ts` | `lib/learningAnalytics.ts`, test files, AI route, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-S02.md` |
| `S03` | Curriculum roadmap lead | Learning path, secondary roadmap, grade/topic structure | `app/learning-path/`, `app/secondary-roadmap/`, `components/learning/`, `components/visualizations/RoadmapVisualizationSuite.tsx`, `data/grades.ts`, `data/topics.ts` | Practice question bank, AI route, shared provider state, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-S03.md` |
| `S04` | Practice lead | Practice Arena, Mistake Book, question data | `app/practice/`, `app/mistake-book/`, `components/practice/`, `data/questions.ts` | Roadmap data, visualization modules, AI route, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-S04.md` |
| `S05` | Lesson lead | Lesson pages and future lesson content modules | `app/lesson/`, future `data/lessons.ts`, future `components/lesson/` | Dashboard, practice, visualization lab, AI route, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-S05.md` |
| `S06` | Visualization lead | Visualization Lab and interactive math modules | `app/visualization-lab/`, `components/visualizations/CoordinatePlaneDemo.tsx`, `FunctionGraphExplorer.tsx`, `GeometryExplorer.tsx`, `ProbabilitySimulator.tsx`, `VisualizationCard.tsx`, `lib/math.ts` | `RoadmapVisualizationSuite.tsx` unless coordinated with `S03`, AI route, provider state | Available | Log in `coordination/session-logs/YYYY-MM-DD-S06.md` |
| `S07` | AI tutor lead | Tutor panel, tutor API, LLM provider integration | `components/ai/`, `app/api/ai-tutor/route.ts`, `.env.local.example` | Real `.env*` secret files, visualization logic, analytics test logic, global config unless approved | Available | Log in `coordination/session-logs/YYYY-MM-DD-S07.md` |
| `S08` | State and analytics lead | Shared provider state, analytics logic, shared types/utilities | `components/providers/AppProviders.tsx`, `lib/learningAnalytics.ts`, `lib/learningAnalytics.test.ts`, `lib/utils.ts`, `types/index.ts` | UI page rewrites outside direct integration needs, AI route, package/config files | Available | Log in `coordination/session-logs/YYYY-MM-DD-S08.md` |
| `S09` | Copy, i18n, accessibility lead | Bilingual dictionary, copy consistency, accessible labels | `lib/i18n.ts`, copy-only or accessibility-only edits inside another session's owned files after coordination | Business logic, route rewrites, package/config files, real env files | Available | Log in `coordination/session-logs/YYYY-MM-DD-S09.md` |
| `S10` | Tooling, docs, report lead | Project docs, coordination, scripts, config, executive reporting | `README.md`, `AGENTS.md`, `.gitignore`, `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `coordination/` | Feature implementation inside other sessions' scopes unless assigned | Available | Log in `coordination/session-logs/YYYY-MM-DD-S10.md` |
| `S11` | QA and release quality lead | Regression quality, E2E ownership, QA matrices, release readiness | `tests/e2e/`, QA reports in `coordination/reports/`, release-readiness checklists, non-feature test helpers | Feature implementation in `app/`, `components/`, `lib/`, or `data/` unless explicitly assigned; real production write tests without approval | Available | Log in `coordination/session-logs/YYYY-MM-DD-S11.md` |
| `S12` | Backend/API platform lead | General API contracts, backend route stability, auth/session/storage platform | General `app/api/` routes except AI Tutor and adaptive routes, `lib/server/auth.ts`, `lib/server/sessionCookie.ts`, backend API tests, server storage architecture by coordination | `app/api/ai-tutor/`, `app/api/adaptive-learning/`, feature UI pages, real `.env*`, LLM prompt/provider behavior without S07/S15 coordination | Available | Log in `coordination/session-logs/YYYY-MM-DD-S12.md` |
| `S13` | Teacher console lead | Teacher Console UI, teacher workflows, teacher page-level product behavior | `app/teacher/`, `components/teacher/`, teacher handoff notes | General API implementation, parent/student UI, AI Tutor, adaptive engine, shared types/i18n except coordinated copy-only edits | Available | Log in `coordination/session-logs/YYYY-MM-DD-S13.md` |
| `S14` | Parent console lead | Parent Console UI, parent reports, messages, child-linking, guardian experience | `app/parent/`, `components/parent/`, parent handoff notes | Teacher/student UI, general API implementation, shared i18n terminology decisions without S09, auth/session internals | Available | Log in `coordination/session-logs/YYYY-MM-DD-S14.md` |
| `S15` | Adaptive engine lead | Adaptive Learning engine, BKT/LLM rerank guardrails, recommendation quality | `lib/adaptiveLearning.ts`, `lib/adaptiveLearning.test.ts`, `app/api/adaptive-learning/`, adaptive-specific tests, adaptive recommendation evaluation reports | AI Tutor chat API, global LLM provider changes without S07, dashboard/practice/lesson layout rewrites, shared types without S08 coordination | Available | Log in `coordination/session-logs/YYYY-MM-DD-S15.md` |
| `S16` | Research and learning science lead | Adaptive learning research, education theory, knowledge tracing literature, AI tutor pedagogy, evaluation design | `coordination/reports/`, future `coordination/research/`, literature reviews, research notes, algorithm recommendation reports, experiment plans, evaluation rubrics | Feature code unless explicitly assigned, `lib/adaptiveLearning.ts`, AI Tutor / LLM provider code, real student data analysis without approval, unverified latest-research claims without source/date | Available | Log in `coordination/session-logs/YYYY-MM-DD-S16.md` |
| `S17` | Gamification and motivation lead | Badges, streaks, levels, quests, class leaderboards, teacher reward campaigns, parent motivation reports, anti-abuse rules, reward economy balance | `lib/gamification.ts`, `lib/gamification.test.ts`, `data/gamification.ts`, reward/motivation components in `components/gamification/`, gamification-specific UI/API by coordination, reward economy reports | Actual game loops, level design, platformer/fishing gameplay, `components/gamification/FishingGame.tsx`, `components/gamification/QuadraticBonusGame.tsx`, game-specific routes without S20 coordination, adaptive engine behavior without S15 coordination, backend storage architecture without S12 coordination, curriculum/content correctness decisions owned by S18 | Available | Log in `coordination/session-logs/YYYY-MM-DD-S17.md` |
| `S18` | Curriculum QA and content quality lead | Question quality, answer validation, lesson/content QA, HK curriculum alignment, Chinese curriculum alignment for 人教版 and 北师大版 math, and US math curriculum alignment for Common Core, AP Math, SAT/ACT Math, and US state standards. US scope excludes IB, A-Level, and other international curricula unless explicitly assigned later. | future `coordination/content-qa/`, content QA reports, curriculum alignment matrices, content review checklists, issue reports for question/topic/lesson data | Large direct edits to question bank or lesson source files without assignment, adaptive engine implementation, practice/lesson UI rewrites, shared types/API/storage, unverified curriculum claims | Available | Log in `coordination/session-logs/YYYY-MM-DD-S18.md` |
| `S19` | API configuration and deployment env lead | Local API environment configuration, Vercel Environment Variables, LLM/SimpleTex/other API readiness and troubleshooting | Owner-assigned `.env.local` API configuration, `.env.local.example`, API/deployment environment variable inventories, Vercel project Environment Variables, redacted API configuration reports in `coordination/` | API/provider business logic, `app/api/`, `lib/server/llmProvider.ts`, LLM prompt/model/cost behavior without S07/S15 coordination, feature UI, package/config files except `.env.local.example`, writing real secrets to Git/logs/reports/screenshots/command output | Available | Log in `coordination/session-logs/YYYY-MM-DD-S19.md` |
| `S20` | Game design and game-based learning lead | Platformer-style math games, fishing games, game loops, level design, educational game mechanics, game-based learning pedagogy | future `app/games/`, future `components/games/`, future `lib/gameBasedLearning.ts`, future `data/gameBasedLearning.ts`, game-specific reports, `components/gamification/FishingGame.tsx`, `components/gamification/QuadraticBonusGame.tsx`, `app/practice/fishing-game/`, `app/practice/quadratic-bonus/`, game-specific completion routes, game-specific E2E tests | Reward economy, badges, streaks, leaderboards, teacher reward campaigns, parent motivation reports, broad gamification storage/API without S17/S12 coordination, curriculum correctness without S18 coordination, question-bank edits without S04/S18 coordination, copyrighted game assets/names/sprites/sounds/level designs without licensed owner-provided assets | Available | Log in `coordination/session-logs/YYYY-MM-DD-S20.md` |

### Shared Files Requiring Explicit Coordination

These files affect many sessions and should be edited by only one assigned session at a time:

- `types/index.ts`
- `components/providers/AppProviders.tsx`
- `lib/i18n.ts`
- `app/globals.css`
- `package.json`
- `tailwind.config.ts`
- `tsconfig.json`
- `next.config.ts`
- `README.md`
- `AGENTS.md`
- `.env.local.example`
- `tests/e2e/`
- `lib/server/userStore.ts`
- `lib/server/llmProvider.ts`
- `app/api/` route families by domain
- `components/dashboard/AdaptiveLearningContent.tsx`
- `lib/gamification.ts`
- `data/gamification.ts`
- future `app/games/`
- future `components/games/`
- future `lib/gameBasedLearning.ts`
- future `data/gameBasedLearning.ts`
- `components/gamification/FishingGame.tsx`
- `components/gamification/QuadraticBonusGame.tsx`
- `app/practice/fishing-game/`
- `app/practice/quadratic-bonus/`
- `app/api/gamification/fishing-game/`
- `app/api/gamification/bonus-games/quadratic/`
- `data/questions.ts`
- `data/topics.ts`
- `data/grades.ts`
- future `data/lessons.ts`

If a task needs one of these files and it is outside the session's allowed scope, the session must stop and write a blocker report unless the assignment explicitly grants ownership.

Default shared-area ownership:

- `tests/e2e/` belongs to S11 for suite structure, release gates, and broad regression matrices. Feature sessions may add focused tests only inside an explicit assignment and should coordinate broad test architecture with S11.
- `app/api/` belongs to S12 for general backend contracts. AI Tutor routes remain S07-owned, and adaptive-learning routes remain S15-owned.
- `lib/server/userStore.ts` is a shared server persistence file. S12 is primary for storage architecture; S15 may edit adaptive-specific sections only with S12 coordination.
- `lib/server/llmProvider.ts` remains S07-owned for provider integration. S15 may consume it for adaptive reranking only by coordinating provider/model/cost behavior with S07.
- S19 owns API environment variable inventory, owner-assigned local/Vercel secret placement, deployment environment parity, and redacted configuration runbooks. S19 does not own API/provider behavior; AI Tutor and LLM provider behavior remains S07-owned, backend/API route contracts remain S12-owned, and adaptive LLM rerank semantics and guardrails remain S15-owned.
- `components/dashboard/AdaptiveLearningContent.tsx` is S02 UI surface plus S15 adaptive semantics; edits that alter recommendation behavior, engine status, or adaptive copy require S15 coordination.
- `coordination/research/` belongs to S16 for learning-science research notes, literature reviews, and experiment design. Research recommendations do not authorize feature-code changes unless the owner assigns implementation work.
- Gamification architecture belongs to S17 for XP, points, badges, levels, quests, streaks, leaderboards, anti-abuse rules, reward campaigns, parent motivation, and reward economy balance. Student dashboard, teacher campaign, parent motivation, and backend persistence edits must be coordinated with S02, S13, S14, and S12 respectively.
- Curriculum and content QA belongs to S18. S18 may write QA reports and alignment matrices by default for HK curriculum, Chinese mainland 人教版/北师大版 math, and US math curriculum covering Common Core, AP Math, SAT/ACT Math, and US state standards. S18's US scope does not include IB, A-Level, or other international curricula unless the owner explicitly assigns them later. Direct edits to question, topic, grade, or lesson source data require an explicit assignment and coordination with S03, S04, or S05.
- Game-based learning belongs to S20 for actual educational games, including platformer-style math games, fishing games, game loops, input/physics, level design, game-embedded math challenges, and game pedagogy. S20 owns existing Fishing Game and Quadratic Bonus Game surfaces by coordination contract even if they remain in current `gamification` paths until a separately assigned migration.

## Work Assignment Rules

When assigning work, give each session a clear package:

- Session ID: one of `S01` to `S20`.
- Objective: the result expected by morning or by the end of the work period.
- Write scope: exact files/directories the session may edit.
- Forbidden scope: files/directories the session must not edit.
- Acceptance criteria: what must be true for the task to be complete.
- Checks: commands or manual checks expected before handoff.
- Stop conditions: decisions that require owner input.

Before editing, each session must:

1. Read this `AGENTS.md`.
2. Read the current assignment.
3. Inspect the relevant files.
4. Create or update its session log.
5. Write a short plan with intended files to change.
6. Confirm the plan stays inside the assigned write scope.

After editing, each session must report:

- What changed.
- Files changed.
- Tests/checks run, with results.
- Tests/checks not run, with reasons.
- Assumptions made.
- Risks found.
- Blockers or follow-up work.

## Nightly AI Coordination Meeting

Use this workflow when the owner assigns work before sleeping. This is an asynchronous coordination meeting, not a free-form real-time chat. The meeting happens through session logs, blocker reports, handoff notes, and S10's morning synthesis.

Default reporting window:

- Previous day 08:00-current day 08:00 Asia/Hong_Kong: S10 or the reporting automation summarizes AI session work, risks, blockers, test status, and decisions needed.
- 08:00 Asia/Hong_Kong: reporting window closes for the daily president report.
- 07:45 Asia/Hong_Kong: assigned agents stop starting large new edits and complete handoff notes for inclusion when practical.
- 07:50-08:00 Asia/Hong_Kong: S10 reviews logs, blockers, changed files, and check results.
- 08:00 Asia/Hong_Kong: S10 or a Codex automation produces the DOCX president report for Dr. Peter Hu.

Participation rules:

1. Only sessions explicitly assigned by the owner for that night may write feature code.
2. Unassigned sessions may be referenced in logs or reports, but they do not write code or make decisions.
3. S10 is the meeting secretary, quality coordinator, and president-report owner.
4. S10 may read every session log and blocker report, but should not edit another session's log except as part of the morning report process.
5. S10's default write scope for nightly coordination is `coordination/`, docs, config, and reports; S10 must not implement feature work inside non-S10 session scopes unless the owner explicitly assigns that work.
6. If no work or assignment exists in the previous-day-08:00-to-current-day-08:00 reporting window, S10's report should state `No assigned work in this reporting window` and summarize only the latest available project status.

Nightly meeting rhythm:

1. 00:00 kickoff: S10 checks the owner's assignments, confirms each assigned session's write scope, and notes any obvious scope conflicts.
2. 02:30 checkpoint: assigned agents record current progress, risks, changed files so far, and any scope or dependency conflict.
3. 05:30 checkpoint: assigned agents prioritize blockers, test status, cross-role dependencies, and any work that must stop before morning.
4. 07:45 handoff: assigned agents finish their Agent Daily Work Report entries and avoid starting broad new changes.
5. 07:50-08:00 synthesis: S10 reads session logs and blockers from the reporting window, inspects project status, runs safe checks when practical, and writes the president report.

Nightly outputs:

- Agent daily work reports: `coordination/session-logs/YYYY-MM-DD-SXX.md`
- Blocker reports when needed: `coordination/blockers/YYYY-MM-DD-SXX.md`
- President report for Dr. Peter Hu: `coordination/reports/YYYY-MM-DD-president-report.docx`

Sessions must stop instead of guessing when they encounter:

- Risky architecture decisions that affect multiple workstreams.
- Destructive operations such as deleting large sections, resetting files, or replacing app structure.
- Secrets, production credentials, or requests to edit `.env.local`, except for owner-assigned S19 API configuration tasks. S19 must keep real values out of Git, session logs, reports, screenshots, and command output, and may record only variable names, target environments, local/Preview/Production status, and redacted results.
- Unclear requirements that could send the project in two incompatible directions.
- Merge conflicts or simultaneous edits to the same file.
- Package upgrades or dependency changes not included in the assignment.
- Any need to revert unrelated user or session changes.

## Coordination Rules

- One file should have one writer at a time.
- Use separate session logs, not a shared live scratch file, to avoid log conflicts.
- Do not edit another session's log except for the morning report process.
- Do not update the session table above during parallel work unless the owner assigned you to coordinate status.
- Put live status, decisions, and handoff notes in the session log.
- If two tasks need the same shared file, split the work by time: one session finishes and hands off before the next starts.
- Prefer additive, local changes over large cross-project rewrites.
- Do not change public behavior outside the assignment unless needed to fix a bug introduced by the task.
- Do not touch generated output directories.
- S11 may write tests, QA reports, and release-readiness matrices, but must not fix feature bugs outside an explicit owner assignment.
- S12 owns route contracts and backend architecture; feature UI owners keep persona workflow decisions and should coordinate API needs with S12.
- S15 owns adaptive logic and recommendation quality; provider/model changes require S07 coordination, and shared type changes require S08 coordination.
- S16 owns research evidence, literature reviews, theory assumptions, experiment design, and educational-validity memos; S16 must not implement feature code unless explicitly assigned.
- S17 owns gamification and motivation-system design across XP, points, badges, streaks, levels, quests, leaderboards, reward campaigns, parent motivation reports, anti-abuse rules, and reward economy balance.
- S18 owns curriculum/content QA evidence, answer validation, alignment matrices, and content-quality reports for HK curriculum, 人教版 and 北师大版 math alignment, and US math curriculum alignment for Common Core, AP Math, SAT/ACT Math, and US state standards. IB, A-Level, and other international curricula remain out of scope unless explicitly assigned later.
- S19 owns API environment variable inventory, local website API configuration, Vercel Add Environment Variable execution, deployment environment parity, and redacted API configuration runbooks. S19 must coordinate code or behavior fixes with S07 for AI Tutor/LLM provider behavior, S12 for backend/API contracts, and S15 for adaptive LLM rerank semantics.
- S20 owns actual game-based learning design and implementation, including platformer-style math games, fishing games, game loops, level design, input/physics feel, and game-embedded math challenges. S20 must coordinate rewards with S17, game storage/API contracts with S12, math question quality with S04/S18, E2E coverage with S11, and package/config changes with S10.

Recommended coordination paths:

- Session logs: `coordination/session-logs/YYYY-MM-DD-SXX.md`
- Blockers: `coordination/blockers/YYYY-MM-DD-SXX.md`
- President reports: `coordination/reports/YYYY-MM-DD-president-report.docx`
- Other project reports: `coordination/reports/YYYY-MM-DD-report-name.md`

These folders may be created by the first session that needs them.

## Quality Bar

Every completed code task must run the relevant checks before handoff:

- Documentation-only changes: no code check required, but say "Not run: documentation-only change."
- Type or shared logic changes: run `npm run type-check`.
- Learning analytics changes: run `npm run test:analytics` and `npm run type-check`.
- Adaptive engine changes: run `npm run test:analytics` and `npm run type-check`; use mocked adaptive API/Playwright coverage when provider behavior changes. Do not call live LLM providers without owner approval.
- Research/learning-science changes: cite source, year, source type, and applicability; no code check is required for research-only reports, but say "Not run: research/documentation-only change."
- Gamification changes: coordinate with S17; run `npm run type-check`; run gamification-specific tests when present; run targeted UI/API checks for XP, points, badges, streaks, quests, leaderboards, reward campaigns, and anti-abuse behavior touched by the task.
- Game-based learning changes: coordinate with S20; run `npm run type-check`; run targeted game E2E checks such as `tests/e2e/fishing-game.spec.ts` or `tests/e2e/quadratic-bonus.spec.ts` when touched; inspect affected game routes in the browser when practical; document if live gameplay/manual browser verification is blocked. Do not introduce copyrighted game assets, names, sprites, sounds, or level designs unless the owner explicitly provides licensed assets.
- Curriculum/content QA changes: coordinate with S18; content-report-only work needs no code check; direct source-data edits should run `npm run type-check` and relevant practice/lesson/adaptive checks based on affected surfaces.
- Route, provider, or app-wide changes: run `npm run type-check`; run `npm run build` when the change affects routing, config, imports, or server/client boundaries.
- Backend/API platform changes: coordinate with S12, then run `npm run type-check`; run `npm run test:backend` and usually `npm run build` for route/server changes.
- Visual UI changes: run `npm run type-check`; if a dev server is available, inspect the affected route in the browser.
- E2E/regression-matrix changes: coordinate broad suite structure with S11; run `npm run type-check` and the targeted Playwright command, or document why the local build/browser environment blocks it.
- AI tutor/API changes: run `npm run type-check`; run `npm run build` if the API contract or server runtime changes. Do not call real LLM providers unless the owner explicitly asks.
- API environment configuration changes: coordinate with S19. For docs or environment-variable placement only, no code check is required; say "Not run: configuration/documentation-only change." For local or Vercel live-provider smoke tests, use owner-approved credentials only, redact all values, and document provider cost/rate-limit risk.
- Package/config changes: coordinate with `S10`, then run `npm install` only if dependency files require it, followed by `npm run type-check` and usually `npm run build`.

If a check cannot be run, the session must explain why and state the remaining risk.

S11 owns regression-matrix upkeep and release-quality gate reporting. S10 owns president-report synthesis and coordination reporting. S16 owns research evidence quality. S17 owns reward-economy quality. S18 owns curriculum/content quality. S19 owns API environment configuration quality and redacted local/Vercel deployment-env parity checks. S20 owns actual educational game quality and game-based learning design quality.

## 8 AM President Report

At 8:00 AM Asia/Hong_Kong time, S10 or the recurring reporting automation should create a concise, business-formatted bilingual DOCX president report for Dr. Peter Hu covering the reporting window from the previous calendar day at 08:00 to the report date at 08:00 Asia/Hong_Kong.

The report should be generated from:

- All session logs in `coordination/session-logs/`.
- Blocker reports in `coordination/blockers/`.
- Current project files changed during the reporting window.
- Available check outputs from each session.
- Fresh checks run by the report owner when practical.

The report should summarize:

- Chinese Executive Summary.
- English Executive Summary.
- Reporting-window summary.
- Overall project progress.
- Completed work by session.
- In-progress work.
- Blockers.
- Risks.
- Test/build status.
- Files changed.
- Tomorrow priorities.
- Owner decisions needed.

The final artifact should be `coordination/reports/YYYY-MM-DD-president-report.docx`, with simple business formatting: clear title metadata, concise bilingual executive summaries, readable tables, restrained typography, and no decorative layout. A temporary Markdown outline may be used only as an intermediate working artifact; the deliverable for Dr. Peter Hu is the DOCX file.

If the environment supports recurring Codex automations, ask Codex to create a daily 8:00 AM Asia/Hong_Kong automation for this project with a prompt like:

```text
Every day at 8:00 AM Asia/Hong_Kong, inspect /Users/dongpinhu/Desktop/MAIS-MVP. Read AGENTS.md, collect the latest session logs and blockers from coordination/, inspect the project status, run safe relevant checks when practical, and produce a concise bilingual DOCX president report for Dr. Peter Hu at coordination/reports/YYYY-MM-DD-president-report.docx. The reporting window is previous calendar day 08:00 through report date 08:00 Asia/Hong_Kong. The report must include a Chinese Executive Summary, English Executive Summary, reporting-window summary, project progress update, S01-S20 session status table, blockers, risks, test/build status, files changed, tomorrow priorities, and owner decisions needed. Use simple business formatting with readable tables and restrained typography. If no assignment or fresh work is found in the reporting window, state "No assigned work in this reporting window" and summarize the latest available project status. Do not edit feature code.
```

Do not ask the automation to edit feature code unless the owner explicitly assigns that work. The morning automation's default job is reporting and triage.

## Templates

### Session Assignment Template

```markdown
# Session Assignment

- Date:
- Session ID:
- Workstream:
- Objective:
- Allowed write scope:
- Forbidden write scope:
- Acceptance criteria:
- Required checks:
- Stop conditions:
- Notes from owner:
```

### Nightly Assignment Template

Use this when the owner assigns night work before resting.

```markdown
# Nightly Assignment

- Date:
- Night work window: 00:00-08:00 Asia/Hong_Kong
- President-report window: Previous day 08:00-current day 08:00 Asia/Hong_Kong
- Assigned sessions:
- Meeting secretary: S10
- Reporting deadline: 8:00 AM Asia/Hong_Kong

## Session Packages

| Session | Workstream | Objective | Allowed write scope | Forbidden write scope | Acceptance criteria | Required checks | Stop conditions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SXX |  |  |  |  |  |  |  |

## Cross-Session Notes

- Shared files reserved tonight:
- Known dependencies:
- Owner priorities:
- Decisions already made:
```

### Session Handoff Template

```markdown
# Session Handoff

- Date:
- Session ID:
- Workstream:
- Status: Completed | In progress | Blocked
- Summary:
- Files changed:
- Checks run:
- Checks not run:
- Assumptions:
- Blockers:
- Risks:
- Follow-up recommendations:
- Next suggested owner/session:
```

### Agent Daily Work Report Template

Append this to the agent's own `coordination/session-logs/YYYY-MM-DD-SXX.md` before stopping.

```markdown
# Agent Daily Work Report

- Date:
- Session ID:
- Workstream:
- Status: Completed | In progress | Blocked
- Objective:
- Summary of work completed:
- Files changed:
- Checks run:
- Checks not run:
- Blockers:
- Risks:
- Assumptions:
- Coordination notes for other sessions:
- Follow-up recommendations:
- Next suggested owner/session:
```

### Blocker Report Template

```markdown
# Blocker Report

- Date:
- Session ID:
- Task:
- Blocker type: Architecture | Scope conflict | Secret/credential | Missing requirement | Merge conflict | Dependency change | Other
- What happened:
- Files involved:
- Why the session stopped:
- Decision needed from owner:
- Safe next step:
```

### President Report DOCX Content Template

Use this content order for the DOCX president report. The DOCX should be concise, bilingual, and business-formatted with clear headings, readable tables, and restrained typography.

```text
President Report

Report date:
Report time: 8:00 AM Asia/Hong_Kong
Project: MAIS-MVP
Reporting session: S10
Audience: Dr. Peter Hu
Reporting window: Previous day 08:00-current day 08:00 Asia/Hong_Kong

中文 Executive Summary

用中文简要说明项目健康度、报告窗口内是否推进、最重要成果、最大风险，以及今天最需要 Dr. Peter Hu 决策的事项。

English Executive Summary

Briefly summarize project health, whether work in the reporting window moved the project forward, the most important outcomes, the largest risks, and decisions needed from Dr. Peter Hu.

Reporting Window Summary

Assigned sessions:
Sessions active:
No assigned work in this reporting window: Yes | No
Coordination highlights:
Cross-session dependencies:

Project Progress

Short summary of current product progress, quality status, and whether the work improved speed, quality, or readiness.

Session Results

Create a table with columns:
Session | Status | Completed | In progress | Blockers | Files changed | Checks

Include rows for S01 through S20.

Completed Work

- 

In-Progress Work

- 

Blockers

- 

Risks

- 

Test and Build Status

`npm run type-check`:
`npm run test:analytics`:
`npm run build`:
Other checks:

Files Changed

- 

Recommended Priorities

1. 
2. 
3. 

Owner Decisions Needed

- 
```

## Quick Start For Tonight

1. Pick only the sessions you want to run, for example `S02`, `S04`, `S06`, `S08`, and `S11`.
2. Give each selected session one package using the Nightly Assignment Template.
3. Keep write scopes separate. Example: do not assign both `S04` and `S08` to edit `types/index.ts` overnight.
4. Tell each selected session to create or update its own log in `coordination/session-logs/`.
5. Tell S10 to act as meeting secretary and prepare `coordination/reports/YYYY-MM-DD-president-report.docx`.
6. If no assignment is given, the 8:00 AM report should say `No assigned work in this reporting window`.
