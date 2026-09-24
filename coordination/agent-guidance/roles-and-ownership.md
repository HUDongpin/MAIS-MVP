# Roles, Ownership, And Session Coordination

All code, artifact, and command paths in this document are relative to this checkout's root unless explicitly absolute. Read only the sections relevant to the assigned task; these are scoped requirements, not a checklist to load in full. Authorization and ordinary-task completion follow [AGENTS.md](../../AGENTS.md).

## Agent Role And Session System

Use agent IDs `A01` through `A25` for long-term stable roles. A session is one concrete work run or log entry performed by an agent. A workstream is the agent's responsibility domain. Per the Operating Model above, the table below is the routing registry: it defines default lane boundaries for assignments and attribution; the enforced write boundary of any session is its session slice (worktree/branch plus declared scope).

A session may read any project file needed for context, but it may write only within its declared slice, which defaults to its assigned agent's allowed files/modules unless the owner explicitly expands its scope. Do not create new permanent `A26+` roles unless the owner explicitly approves a new workstream after A10/A25 confirm that the need cannot be handled by refining an existing agent boundary.

Legacy `Sxx` references in older reports, logs, and filenames map one-to-one to the matching `Axx` agent role. Do not rewrite historical artifacts just to rename them; use `Axx` for all new coordination text.

| Agent | Owner/role | Workstream | Allowed files/modules | Forbidden files/modules | Status | Session log |
| --- | --- | --- | --- | --- | --- | --- |
| `A01` | App shell lead | Home, layout, navigation, theme surface | `app/layout.tsx`, `app/page.tsx`, `components/layout/`, `components/home/`, `components/background/`, `components/ui/ThemeToggle.tsx`, `components/ui/LanguageToggle.tsx` | API route, analytics logic, practice, visualizations, data files except with approval | Available | Log in `coordination/session-logs/YYYY-MM-DD-A01.md` |
| `A02` | Dashboard lead | Dashboard, progress page, progress cards, analytics display UI | `app/dashboard/page.tsx`, `app/progress/page.tsx`, `components/dashboard/`, `components/cards/`, `data/progress.ts`, `data/learningAnalytics.ts` | `lib/learningAnalytics.ts`, test files, AI route, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-A02.md` |
| `A03` | Curriculum roadmap lead | Learning path, secondary roadmap, grade/topic structure | `app/learning-path/`, `app/secondary-roadmap/`, `components/learning/`, `data/grades.ts`, `data/topics.ts` | Practice question bank, AI route, shared provider state, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-A03.md` |
| `A04` | Practice lead | Practice Arena, Mistake Book, question data | `app/practice/`, `app/mistake-book/`, `components/practice/`, `data/questions.ts` | Roadmap data, visualization modules, AI route, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-A04.md` |
| `A05` | Lesson lead | Lesson pages and lesson content modules | `app/lesson/`, `data/lessons.ts`, `components/lesson/` (now a large live tree including `components/lesson/ccss/lessons/` with 270+ CCSS lesson modules) | Dashboard, practice, visualization lab, AI route, global config | Available | Log in `coordination/session-logs/YYYY-MM-DD-A05.md` |
| `A06` | Visualization lead | Visualization Lab and interactive math modules | `app/visualization-lab/`, `app/student/tools/visualizations/`, visualization lab components in `components/visualizations/` including `VisualizationLabPage.tsx`, `ConfiguredVisualizationLab.tsx`, `CoordinatePlaneDemo.tsx`, `FunctionGraphExplorer.tsx`, `GeometryExplorer.tsx`, `ProbabilitySimulator.tsx`, `VisualizationCard.tsx`, `data/visualizationLabs.ts`, `lib/math.ts` | AI route, provider state, curriculum/content final signoff without A18 | Available | Log in `coordination/session-logs/YYYY-MM-DD-A06.md` |
| `A07` | AI tutor lead | Tutor panel, tutor API, LLM provider integration | `components/ai/`, `app/api/ai-tutor/route.ts`, `.env.local.example` | Real `.env*` secret files, visualization logic, analytics test logic, global config unless approved | Available | Log in `coordination/session-logs/YYYY-MM-DD-A07.md` |
| `A08` | State and analytics lead | Shared provider state, analytics logic, shared types/utilities | `components/providers/AppProviders.tsx`, `lib/learningAnalytics.ts`, `lib/learningAnalytics.test.ts`, `lib/utils.ts`, `types/index.ts` | UI page rewrites outside direct integration needs, AI route, package/config files | Available | Log in `coordination/session-logs/YYYY-MM-DD-A08.md` |
| `A09` | Copy, i18n, accessibility lead | Bilingual dictionary, copy consistency, accessible labels | `lib/i18n.ts`, copy-only or accessibility-only edits inside another session's owned files after coordination | Business logic, route rewrites, package/config files, real env files | Available | Log in `coordination/session-logs/YYYY-MM-DD-A09.md` |
| `A10` | Tooling, docs, report lead | Project docs, coordination, scripts, config, executive reporting | `README.md`, `AGENTS.md`, `.gitignore`, `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css`, `coordination/` | Feature implementation inside other sessions' scopes unless assigned | Available | Log in `coordination/session-logs/YYYY-MM-DD-A10.md` |
| `A11` | QA and release quality lead | Regression quality, E2E ownership, QA matrices, release readiness | `tests/e2e/`, QA reports in `coordination/reports/`, release-readiness checklists, non-feature test helpers | Feature implementation in `app/`, `components/`, `lib/`, or `data/` unless explicitly assigned; real production write tests without approval | Available | Log in `coordination/session-logs/YYYY-MM-DD-A11.md` |
| `A12` | Backend/API platform lead | General API contracts, backend route stability, auth/session/storage platform | General `app/api/` routes except AI Tutor and adaptive routes, `lib/server/auth.ts`, `lib/server/sessionCookie.ts`, backend API tests, server storage architecture by coordination | `app/api/ai-tutor/`, `app/api/adaptive-learning/`, feature UI pages, real `.env*`, LLM prompt/provider behavior without A07/A15 coordination | Available | Log in `coordination/session-logs/YYYY-MM-DD-A12.md` |
| `A13` | Teacher console lead | Teacher Console UI, teacher workflows, teacher page-level product behavior | `app/teacher/`, `components/teacher/`, teacher handoff notes | General API implementation, parent/student UI, AI Tutor, adaptive engine, shared types/i18n except coordinated copy-only edits | Available | Log in `coordination/session-logs/YYYY-MM-DD-A13.md` |
| `A14` | Parent console lead | Parent Console UI, parent reports, messages, child-linking, guardian experience | `app/parent/`, `components/parent/`, parent handoff notes | Teacher/student UI, general API implementation, shared i18n terminology decisions without A09, auth/session internals | Available | Log in `coordination/session-logs/YYYY-MM-DD-A14.md` |
| `A15` | Adaptive engine lead | Adaptive Learning engine, BKT/LLM rerank guardrails, recommendation quality | `lib/adaptiveLearning.ts`, `lib/adaptiveLearning.test.ts`, `app/api/adaptive-learning/`, adaptive-specific tests, adaptive recommendation evaluation reports | AI Tutor chat API, global LLM provider changes without A07, dashboard/practice/lesson layout rewrites, shared types without A08 coordination | Available | Log in `coordination/session-logs/YYYY-MM-DD-A15.md` |
| `A16` | Research and learning science lead | Adaptive learning research, education theory, knowledge tracing literature, AI tutor pedagogy, evaluation design | `coordination/reports/`, future `coordination/research/`, literature reviews, research notes, algorithm recommendation reports, experiment plans, evaluation rubrics | Feature code unless explicitly assigned, `lib/adaptiveLearning.ts`, AI Tutor / LLM provider code, real student data analysis without approval, unverified latest-research claims without source/date | Available | Log in `coordination/session-logs/YYYY-MM-DD-A16.md` |
| `A17` | Gamification and motivation lead | Badges, streaks, levels, quests, class leaderboards, teacher reward campaigns, parent motivation reports, anti-abuse rules, reward economy balance | `lib/gamification.ts`, `lib/gamification.test.ts`, `data/gamification.ts`, reward/motivation components in `components/gamification/`, gamification-specific UI/API by coordination, reward economy reports | Actual game loops, level design, platformer/fishing gameplay, `components/gamification/FishingGame.tsx`, `components/gamification/QuadraticBonusGame.tsx`, game-specific routes without A20 coordination, adaptive engine behavior without A15 coordination, backend storage architecture without A12 coordination, A18-owned curriculum/content correctness decisions | Available | Log in `coordination/session-logs/YYYY-MM-DD-A17.md` |
| `A18` | Curriculum QA and content quality lead | Independent question quality, answer validation, lesson/content QA, curriculum alignment, expert review, and final content acceptance recommendations for HK, Chinese mainland 人教版/北师大版 math, and US math covering Common Core, AP Math, SAT/ACT Math, and US state standards. US scope excludes IB, A-Level, and other international curricula unless explicitly assigned later. | Content QA reports, curriculum alignment matrices, content review checklists, expert review reports, final QA decision artifacts, and issue reports for question/topic/lesson data under `coordination/content-qa/` | Content generation pipeline ownership now assigned to A21, large direct edits to question bank or lesson source files without assignment, adaptive engine implementation, practice/lesson UI rewrites, shared types/API/storage, unverified curriculum claims | Available | Log in `coordination/session-logs/YYYY-MM-DD-A18.md` |
| `A19` | API configuration and deployment env lead | Local API environment configuration, Vercel Environment Variables, LLM/SimpleTex/other API readiness and troubleshooting | Owner-assigned `.env.local` API configuration, `.env.local.example`, API/deployment environment variable inventories, Vercel project Environment Variables, redacted API configuration reports in `coordination/` | API/provider business logic, `app/api/`, `lib/server/llmProvider.ts`, LLM prompt/model/cost behavior without A07/A15 coordination, feature UI, package/config files except `.env.local.example`, writing real secrets to Git/logs/reports/screenshots/command output | Available | Log in `coordination/session-logs/YYYY-MM-DD-A19.md` |
| `A20` | Game design and game-based learning lead | Platformer-style math games, fishing games, matching/elimination games, game loops, level design, educational game mechanics, game-based learning pedagogy | `app/games/`, `app/student/practice/games/`, `components/games/`, `lib/gameBasedLearning.ts`, `lib/gameBasedLearning.test.ts`, `data/gameBasedLearning.ts`, game-specific reports, `components/gamification/FishingGame.tsx`, `components/gamification/AdventureIslandGame.tsx`, `components/gamification/QuadraticBonusGame.tsx`, `app/practice/fishing-game/`, `app/practice/quadratic-bonus/`, game-specific completion routes, game-specific E2E tests | Reward economy, badges, streaks, leaderboards, teacher reward campaigns, parent motivation reports, broad gamification storage/API without A17/A12 coordination, curriculum correctness without A18 coordination, question-bank edits without A04/A18 coordination, launching draft games into primary navigation without owner approval, copyrighted game assets/names/sprites/sounds/level designs without licensed owner-provided assets | Available | Log in `coordination/session-logs/YYYY-MM-DD-A20.md` |
| `A21` | Content pipeline and RAG operations lead | Content generation pipelines, candidate question-bank packages, RAG intake/build operations, local/private corpus handling, generated-content handoff packaging, and content asset production logistics | Package-local generation and QA-operation scripts under `coordination/content-qa/`, candidate packages under `coordination/content-qa/`, owner-assigned `data/generated-content/` candidate handoffs, owner-assigned `public/question-illustrations/` production assets, local-only `.local/rag/` outputs, content/RAG pipeline reports | A18-owned final curriculum quality signoff, live `data/questions.ts`/topic/lesson source edits without A04/A05/A18 assignment, app UI/routes, provider/API behavior, real `.env*`, package/config files, committing raw copyrighted corpus text, unapproved public exposure of local/private RAG chunks | Available | Log in `coordination/session-logs/YYYY-MM-DD-A21.md` |
| `A22` | Production reliability and release engineering lead | Build/dev-server isolation, Playwright harness stability, Vercel deployment hygiene, deployment-size controls, local/production parity checks, release-blocker root-cause analysis | `playwright.config.ts`, `.vercelignore`, release/deployment reports in `coordination/reports/`, release-readiness artifacts, non-feature test harness helpers by A11 coordination, owner-assigned build/deploy scripts and config changes by A10 coordination | Feature bug fixes in `app/`, `components/`, `lib/`, or `data/` unless explicitly assigned, test assertion ownership without A11 coordination, API/provider business logic without A07/A12/A15 coordination, real `.env*`, Vercel secret values, package upgrades without A10/owner approval | Available | Log in `coordination/session-logs/YYYY-MM-DD-A22.md` |
| `A23` | Integration and promotion lead | Candidate-to-live promotion planning, release intake, integration sequencing, and cross-session handoff from A18/A21 packages into A04/A05/A11/A22 gates | `coordination/integration/`, integration and promotion reports in `coordination/reports/`, candidate-to-live checklists, owner-assigned adapter/source integration files only when explicitly listed in the assignment | Direct live `data/questions.ts`, `data/topics.ts`, `data/grades.ts`, lesson source, app UI, API, shared type, or asset edits without explicit owner assignment and owning-session coordination; final curriculum QA signoff; regression ownership | Available | Log in `coordination/session-logs/YYYY-MM-DD-A23.md` |
| `A24` | Illustration exact-layer lead | Deterministic math overlays for textbook/practice illustrations, including SVG/Plotly/KaTeX/MathJax/MAIS frontend layers, coordinates, formulas, units, and answer labels | Exact-layer package scripts/artifacts under `coordination/content-qa/`, deterministic overlay manifests, owner-assigned exact SVG/metadata assets under `public/question-illustrations/`, exact-layer QA handoff reports | Bitmap image generation, final curriculum/source-distance approval, live lesson/question integration, unrelated UI routes/components, raw copyrighted source reconstruction, provider/API/env behavior | Available | Log in `coordination/session-logs/YYYY-MM-DD-A24.md` |
| `A25` | Git hygiene and release intake lead | Dirty-tree inventory, ownership mapping, PR/commit slicing recommendations, conflict detection, release-readiness intake, and non-destructive Git status reporting | `coordination/release-intake/`, git hygiene reports in `coordination/reports/`, release intake checklists, ownership/conflict maps, A25 session-log artifacts | Staging, committing, branching, merging, rebasing, pushing, deleting, resetting, or reverting files unless explicitly assigned by the owner; feature code edits; generated content or asset production; secret files | Available | Log in `coordination/session-logs/YYYY-MM-DD-A25.md` |

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
- `playwright.config.ts`
- `.vercelignore`
- `lib/server/userStore.ts`
- `lib/server/llmProvider.ts`
- `lib/difficulty.ts`
- `lib/difficulty.test.ts`
- `app/api/` route families by domain
- `components/dashboard/AdaptiveLearningContent.tsx`
- `app/visualization-lab/`
- `app/student/tools/visualizations/`
- `components/visualizations/VisualizationLabPage.tsx`
- `components/visualizations/ConfiguredVisualizationLab.tsx`
- `data/visualizationLabs.ts`
- `lib/gamification.ts`
- `data/gamification.ts`
- `app/games/`
- `app/student/practice/games/`
- `components/games/`
- `lib/gameBasedLearning.ts`
- `lib/gameBasedLearning.test.ts`
- `data/gameBasedLearning.ts`
- `components/gamification/FishingGame.tsx`
- `components/gamification/AdventureIslandGame.tsx`
- `components/gamification/QuadraticBonusGame.tsx`
- `app/practice/fishing-game/`
- `app/practice/quadratic-bonus/`
- `app/api/gamification/fishing-game/`
- `app/api/gamification/bonus-games/quadratic/`
- `data/questions.ts`
- `data/topics.ts`
- `data/grades.ts`
- `data/lessons.ts`
- `components/lesson/`
- `data/generated-content/`
- `data/rag/`
- `lib/rag/`
- `coordination/content-qa/`
- `public/question-illustrations/`
- `.local/rag/`
- `coordination/integration/`
- `coordination/release-intake/`
- content/RAG pipeline scripts in `scripts/`

Reading a shared file for relevant context does not require write ownership. If an edit to one of these files is outside the assignment, pause that edit, explain the needed scope, and continue independent authorized work. If the owner has already assigned the file/change, do not ask for the same permission again; resolve any actual concurrent-writer conflict before writing. Use a durable blocker report only when the assignment or release/nightly workflow needs one.

Default shared-area ownership:

- A11-owned `tests/e2e/` covers suite structure, release gates, broad regression matrices, and product assertions. A22 may edit non-feature harness helpers only with A11 coordination. Feature sessions may add focused tests only inside an explicit assignment and should coordinate broad test architecture with A11.
- A22-owned release reliability covers `playwright.config.ts`, `.vercelignore`, build/dev-server isolation, deployment-size hygiene, and production/local parity harnesses. A22 must coordinate config/package changes with A10, test assertions with A11, provider/env parity with A19, and route/API behavior with A12.
- A12-owned general backend contracts cover `app/api/`. AI Tutor routes remain A07-owned, and adaptive-learning routes remain A15-owned.
- A12-owned storage architecture covers the shared server persistence file `lib/server/userStore.ts`; A15 may edit adaptive-specific sections only with A12 coordination.
- A07-owned provider integration covers `lib/server/llmProvider.ts`. A15 may consume it for adaptive reranking only by coordinating provider/model/cost behavior with A07.
- A08-owned shared type semantics cover `types/index.ts`, `lib/difficulty.ts`, and app-wide difficulty schema changes, with A10/A22 coordination when schema drift blocks type-check/build. A18 may recommend content difficulty views or mappings, but must not migrate the app-wide schema alone.
- A19-owned API environment work covers variable inventory, owner-assigned local/Vercel secret placement, deployment environment parity, and redacted configuration runbooks. API/provider behavior is not A19-owned; AI Tutor and LLM provider behavior remains A07-owned, backend/API route contracts remain A12-owned, and adaptive LLM rerank semantics and guardrails remain A15-owned.
- A02/A15-owned dashboard adaptive surface covers `components/dashboard/AdaptiveLearningContent.tsx`; edits that alter recommendation behavior, engine status, or adaptive copy require A15 coordination.
- A06-owned Visualization Lab runtime covers configured visualization templates and `data/visualizationLabs.ts`. A06 may fix playability, template mapping, and math-state consistency, but curriculum/topic-fit signoff remains A18-owned and durable regression/release gates remain A11/A22-owned.
- A16-owned `coordination/research/` covers learning-science research notes, literature reviews, and experiment design. Research recommendations do not authorize feature-code changes unless the owner assigns implementation work.
- A17-owned gamification architecture covers XP, points, badges, levels, quests, streaks, leaderboards, anti-abuse rules, reward campaigns, parent motivation, and reward economy balance. Student dashboard, teacher campaign, parent motivation, and backend persistence edits must be coordinated with A02, A13, A14, and A12 respectively.
- A18-owned curriculum and content QA covers QA reports, expert review reports, final QA decisions, and alignment matrices by default for HK curriculum, Chinese mainland 人教版/北师大版 math, and US math curriculum covering Common Core, AP Math, SAT/ACT Math, and US state standards. A18's US scope does not include IB, A-Level, or other international curricula unless the owner explicitly assigns them later. Direct edits to question, topic, grade, or lesson source data require an explicit assignment and coordination with A03, A04, or A05.
- A21-owned content pipeline and RAG operations cover package-local generation scripts, candidate question-bank packages, RAG intake/build artifacts, local/private corpus manifests, and generated-content handoff artifacts inside assigned content-pipeline scopes. Final curriculum signoff is not A21-owned; A18 must independently review QA acceptance before A04/A05/A11 integrate content into live app surfaces. Raw local/private corpus text must remain in ignored local storage unless the owner documents rights and explicitly approves public exposure.
- A20-owned game-based learning covers actual educational games, including platformer-style math games, fishing games, matching/elimination games, game loops, input/physics, level design, game-embedded math challenges, and game pedagogy. Existing Fishing Game, Adventure Island, Quadratic Bonus Game, and internal draft game routes are A20-owned by coordination contract even if some surfaces remain in current `gamification` paths until a separately assigned migration.
- A23-owned candidate-to-live integration and promotion planning covers intake, readiness gates, promotion checklists, and owning agent session handoffs, but A23 cannot make live data/source edits unless the owner explicitly assigns those exact files and the owning agent sessions agree.
- A24-owned deterministic illustration exact layers cover exact overlay construction and validation handoffs after A21 bitmap/candidate production and before A18/human final approval. Source-distance, curriculum, and final approval gates remain A18-owned.
- A25-owned git hygiene and release intake covers dirty-tree inventory, ownership maps, and PR/commit slicing recommendations, but A25 must not stage, commit, branch, merge, rebase, push, delete, reset, or revert without explicit owner instruction.

## Coordination Rules

- Role IDs express accountability and routing; they do not require creating agents or waiting for an unstaffed lane. A session may cover lanes explicitly included in its assignment and should record that scope. Coordinate with actual concurrent owners before shared-file edits; preserve required independent review and content/release gates.
- One file should have one writer at a time.
- When a durable log is required, use the assigned session-specific path, not a shared live scratch file. `YYYY-MM-DD-AXX.md` is the default for a single writer; same-day sessions borrowing the same lane use distinct suffixes and report their log paths in the handoff.
- Do not edit another session's log except for the morning report process.
- Do not update the role table in this document during parallel work unless the owner assigned you to coordinate status.
- Put live status, decisions, and handoff notes in the session log when that workflow requires one; otherwise use the task's progress and final handoff.
- Mirror the same responsible agent IDs used in the session log in any Codex-visible progress text, especially when the update references a file, smoke test, provider, release gate, or blocker.
- If two tasks need the same shared file, split the work by time: one session finishes and hands off before the next starts.
- Dev/preview server isolation (A22-owned; applies when starting or stopping a server): parallel sessions must never run bare `npm run dev`/`next dev`/`next start` against the shared root `.next`. A stray dev server rewrites the shared `.next` into dev format (removes `BUILD_ID`), which breaks other sessions' `next start` with HTTP 400s on hashed chunks and can crash concurrent `tsc` gates with TS6053 while it regenerates `.next/types`. Instead run `npm run dev:isolated` (isolated `NEXT_DIST_DIR` under `.tmp/` + an owned port) or set `NEXT_DIST_DIR=.tmp/<label>` explicitly, and choose a session-owned port. Orphaned `next-server` children may survive task termination. Before using `npm run kill-port -- <port>` or another termination command, verify the current listener still belongs to this session; prefer normal termination and force-kill only a verified owned process that does not exit. Never broadly kill processes or stop another session's server.
- Follow Root And Worktree Policy for implementation isolation and its explicit in-place exceptions. Do not duplicate setup or create a new worktree solely to answer a question, inspect files, or fill out a template.
- Prefer additive, local changes over large cross-project rewrites.
- Do not change public behavior outside the assignment unless needed to fix a bug introduced by the task.
- Do not hand-edit or stage generated runtime outputs; authorized isolated build/test/dev output is covered by Project Snapshot. Candidate content under `data/generated-content/`, `coordination/content-qa/`, `public/question-illustrations/`, or local/private `.local/rag/` storage may be handled only within the assigned content scope (A21 pipeline, A18 independent QA, A24 exact-layer work, or explicitly assigned live-surface integration). This does not grant general ownership of those directories.
- A11 may write tests, QA reports, and release-readiness matrices, but must not fix feature bugs outside an explicit owner assignment.
- A12-owned scope covers route contracts and backend architecture; feature UI owners keep persona workflow decisions and should coordinate API needs with A12.
- A15-owned scope covers adaptive logic and recommendation quality; provider/model changes require A07 coordination, and shared type changes require A08 coordination.
- A16-owned scope covers research evidence, literature reviews, theory assumptions, experiment design, and educational-validity memos; A16 must not implement feature code unless explicitly assigned.
- A17-owned scope covers gamification and motivation-system design across XP, points, badges, streaks, levels, quests, leaderboards, reward campaigns, parent motivation reports, anti-abuse rules, and reward economy balance.
- A18-owned scope covers independent curriculum/content QA evidence, answer validation, expert review, final QA decisions, alignment matrices, and content-quality reports for HK curriculum, 人教版 and 北师大版 math alignment, and US math curriculum alignment for Common Core, AP Math, SAT/ACT Math, and US state standards. IB, A-Level, and other international curricula remain out of scope unless explicitly assigned later.
- A19-owned scope covers API environment variable inventory, local website API configuration, Vercel Add Environment Variable execution, deployment environment parity, and redacted API configuration runbooks. A19 must coordinate code or behavior fixes with A07 for AI Tutor/LLM provider behavior, A12 for backend/API contracts, and A15 for adaptive LLM rerank semantics.
- A20-owned scope covers actual game-based learning design and implementation, including platformer-style math games, fishing games, matching/elimination games, game loops, level design, input/physics feel, and game-embedded math challenges. A20 must coordinate rewards with A17, game storage/API contracts with A12, math question quality with A04/A18, E2E coverage with A11, and package/config changes with A10.
- A21-owned scope covers content generation pipelines and RAG operations, including package-local generation scripts, candidate question-bank packages, generated-content handoff artifacts, question-illustration production logistics, and local/private corpus manifests. A21 must coordinate final quality decisions with A18, live practice integration with A04, lesson integration with A05, regression coverage with A11, provider/env readiness with A19, and release packaging with A22.
- A22-owned scope covers production reliability and release engineering, including build/dev-server isolation, nested workspace-copy exclusion such as `MAIS-MVP-*` folders, Playwright harness stability, Vercel deployment hygiene, deployment-size controls, local/production parity checks, and release-blocker root-cause reports. A22 must coordinate docs/config/package changes with A10, test assertions with A11, environment parity with A19, and product bug fixes with the owning feature/API sessions.
- A23-owned scope covers candidate-to-live promotion planning, integration readiness gates, and cross-session handoffs from A18/A21 outputs to A04/A05/A11/A22 implementation and regression owners. A23 must not bypass final content QA, live data ownership, or release gates.
- A24-owned scope covers deterministic illustration exact-layer construction and validation handoff for formulas, coordinates, graph values, dimensions, units, and answer labels. A24 must coordinate bitmap/candidate provenance with A21, final QA with A18, app rendering with A05/A06 when needed, and release checks with A11/A22.
- A25-owned scope covers non-destructive git hygiene, dirty-tree inventory, ownership maps, PR/commit slicing recommendations, and release intake triage. A25 must not perform Git state mutations unless explicitly assigned by the owner.
- When the root worktree is too dirty for direct release, the default path is A25 ownership mapping, A10/A25 release-slice packaging, A22 clean worktree or pruned staging, and A11 targeted regression. Do not add a new release agent for this situation.
- The content promotion chain is A21 candidate generation/RAG operations -> A18 independent acceptance of the final candidate -> A23 integration planning -> A04/A05/A11/A22 live-surface and release gates. When A24 exact-layer work is needed, preliminary A18 review may precede it, but final A18 acceptance must bind the candidate including those overlays. Reuse still-current evidence for unchanged content and review the affected additions/changes; this does not require repeating unaffected QA. Do not bypass the chain by creating another content agent.

Recommended coordination paths:

- Session logs: `coordination/session-logs/YYYY-MM-DD-AXX.md`
- Blockers: `coordination/blockers/YYYY-MM-DD-AXX.md`
- President reports: `coordination/reports/YYYY-MM-DD-president-report.docx`
- Other project reports: `coordination/reports/YYYY-MM-DD-report-name.md`

Create these folders only when the assigned workflow needs a durable artifact and the path is in scope; reading this list does not require creating them.
