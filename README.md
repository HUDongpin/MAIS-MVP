# HK Math Lab Template

A modern, dark-mode-first, bilingual math learning website template for Hong Kong students from P1 to S6. The template is built with Next.js, TypeScript, Tailwind CSS, and Framer Motion. It includes reusable mock data, multi-page navigation, and interactive math visualization modules that can be extended into a full learning platform.

## Features

- Landing page with animated math background and global P1-S6 grade selector
- Student dashboard with saved streak, progress, recommended lesson, and grade-specific topic cards
- Roadmap-style learning path for P1-S6
- Reusable lesson page template with concept explanation, worked example, visualization panel, and practice feedback
- Visualization Lab modules:
  - Coordinate Plane Demo for number lines, decimals, speed graphs, and transformations
  - Geometry Explorer for shapes, arrays, fractions, angles, area, volume, and draggable triangles
  - Probability Simulator plus charts and averages models
  - Function Graph Explorer for `y = ax² + bx + c`
  - Function Model Comparer for percent, ratio, polynomial, exponential, and logarithmic models
  - Trig Wave Explorer for amplitude, period, and phase shift
  - Calculus and Statistics Lab for tangent gradients and normal-distribution z-scores
- Practice Arena with grade, topic, and difficulty filters, one starter item for every roadmap topic, and authenticated attempt tracking
- Progress page with saved analytics and animated charts
- Traditional Chinese / English language toggle
- Light/dark theme toggle
- SQLite-backed local persistence for demo/pilot sessions, attempts, mistakes, lesson progress, analytics, and AI tutor usage logs
- AI Tutor chat panel connected through a server-side LLM API route with rate and token limits
- Responsive layout, semantic HTML, accessible controls, and reduced-motion support

## Tech stack

- Next.js with App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- SVG-based custom visualizations

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown in your terminal, usually `http://localhost:3000`.

Run the full local validation suite:

```bash
npm run check
```

The validation suite runs type checking, analytics tests, MVP readiness tests, and a production build.

Run the browser smoke suite for the full student journey:

```bash
npm run test:e2e
```

The smoke suite builds a production preview, starts it with its own SQLite database under `.tmp/e2e/`, and covers registration, login/logout, local password reset, dashboard, roadmap, lesson progress, practice attempts, mistake book actions, visualization completion, analytics export, and AI Tutor local-helper fallback. By default it uses the installed Chrome channel; set `PLAYWRIGHT_BROWSER_CHANNEL` if your environment uses a different browser channel.

## Persistence and auth

The app uses SQLite through Node's built-in `node:sqlite` module. Local development stores data at `.local/hk-math-db.sqlite` by default. Set `HK_MATH_DB_PATH` to an absolute path when running a single-node pilot with a mounted persistent volume. A legacy `.local/hk-math-db.json` snapshot is migrated automatically when present.

Session cookies are signed with `AUTH_SESSION_SECRET` or `NEXTAUTH_SECRET`. Production mode requires one of those secrets; the local development fallback is intentionally disabled in production.

The demo account is intended for local demos. In production, set `HK_MATH_ENABLE_DEMO_USER=true` only for an explicit public demo deployment; the displayed demo credentials are intentionally fixed to match the `/login` screen.

Local/demo password resets can expose an in-browser reset link with `HK_MATH_EXPOSE_LOCAL_RESET_LINKS=true`. Keep it disabled for real production email delivery.

Admin users can export a full storage snapshot from `/api/admin/storage/export`. The export includes server-side records and is intended for backup/triage, not student-facing sharing.

### Vercel deployment

Set `AUTH_SESSION_SECRET` in the Vercel project environment variables before using login. For the public demo account shown on `/login`, also set `HK_MATH_ENABLE_DEMO_USER=true`; otherwise create a real account through `/register`.

When no `HK_MATH_DB_PATH` is configured on Vercel, the app stores its SQLite file under Vercel's writable `/tmp` directory. That is enough for demo login and smoke testing, but it is ephemeral and should not be used as the long-term student record store for a real class.

## Error observability

The browser error reporter and root error boundary send fixed error classifications through
`/api/observability/client-error`. Raw messages, stack traces, dynamic route segments and
account identifiers are excluded before the browser sends a report. Server transport repeats
the same policy and supports Sentry envelopes or a configured webhook. No external event is
sent when neither destination is configured.

The intake contract, explicit diagnostic-probe switch, transport limits and offline verification
are documented in [docs/observability.md](docs/observability.md). Run the focused CI gate with
`node scripts/run-observability-tests.mjs`. Storage health/alerts and auth/tutor/datastore
instrumentation are separate integration packages; this slice does not add them.

## AI Tutor LLM API

The AI Tutor UI is wired to `app/api/ai-tutor/route.ts`, which calls an OpenAI-compatible Chat Completions endpoint from the server. API keys stay in `.env.local` and are never sent to the browser. The default live example targets DeepSeek V4 Pro.

The app can run without a key. In that state the tutor panel shows `Local helper mode` and returns guided fallback hints. When the server sees `LLM_API_KEY` or `OPENAI_API_KEY`, `/api/ai-tutor/status` reports live mode without exposing the secret.

Create a local environment file:

```bash
cp .env.local.example .env.local
```

Then set:

```bash
LLM_API_KEY=your_server_side_key
LLM_MODEL=deepseek-v4-pro
LLM_API_URL=https://api.deepseek.com/chat/completions
AUTH_SESSION_SECRET=replace_with_a_long_random_value
AI_TUTOR_MAX_REQUESTS_PER_MINUTE=6
AI_TUTOR_MAX_REQUESTS_PER_HOUR=30
AI_TUTOR_MAX_COMPLETION_TOKENS=500
AI_TUTOR_TOKEN_LIMIT_5H=200000000
AI_TUTOR_DEMO_TOKEN_LIMIT_5H=100000000
```

Minimum DeepSeek setup is `LLM_API_KEY`, `LLM_MODEL`, `LLM_API_URL`, and `AUTH_SESSION_SECRET`; the checked-in `.env.local.example` already supplies the DeepSeek model and URL. `OPENAI_API_KEY` and `OPENAI_MODEL` still work as aliases for OpenAI-backed setup. Guest users receive a registration prompt instead of a live provider call, while signed-in users are limited by the 5-hour token quota settings above. If no key is configured, the chat panel stays available in local helper mode and includes the configuration error in the tutor message so the missing server setup is visible during development.

After editing `.env.local`, restart the dev server:

```bash
npm run dev
```

Open Practice Arena, click `Ask AI Tutor`, and send a message. The browser should call `/api/ai-tutor`, while the server route calls the configured LLM provider.

For a production build:

```bash
npm run build
npm run start
```

Optional TypeScript check:

```bash
npm run type-check
```

Additional MVP checks:

```bash
npm run test:analytics
npm run test:mvp
```

## File structure

```text
app/
  dashboard/page.tsx
  globals.css
  layout.tsx
  learning-path/page.tsx
  lesson/[slug]/page.tsx
  page.tsx
  practice/page.tsx
  progress/page.tsx
  visualization-lab/page.tsx
components/
  background/AnimatedMathBackground.tsx
  cards/ProgressCard.tsx
  cards/TopicCard.tsx
  home/HeroSection.tsx
  layout/Footer.tsx
  layout/Navbar.tsx
  learning/LearningRoadmap.tsx
  practice/PracticeQuestionCard.tsx
  providers/AppProviders.tsx
  ui/GradeSelector.tsx
  ui/LanguageToggle.tsx
  ui/SectionHeader.tsx
  ui/ThemeToggle.tsx
  visualizations/CoordinatePlaneDemo.tsx
  visualizations/FunctionGraphExplorer.tsx
  visualizations/GeometryExplorer.tsx
  visualizations/ProbabilitySimulator.tsx
  visualizations/VisualizationCard.tsx
data/
  grades.ts
  progress.ts
  questions.ts
  topics.ts
lib/
  i18n.ts
  math.ts
  utils.ts
types/
  index.ts
```

## How to extend

### Lesson content

Lesson metadata and content blocks are seeded from the roadmap topics and question bank in `lib/server/userStore.ts`, then rendered through `app/lesson/[slug]/page.tsx`. For MVP-quality content, add topic-specific worked examples and reviewed explanations alongside new questions.

### Grade and topic data

Edit `data/grades.ts` and `data/topics.ts`. Every topic already has a grade, localized title, localized description, status, difficulty, estimated time, and mastery score.

### Visualization modules

Add new modules under `components/visualizations/`. Keep each visualization self-contained and expose it through `app/visualization-lab/page.tsx`. Shared math utilities should go in `lib/math.ts`.

### Practice questions

Add more items to `data/questions.ts`. The Practice Arena automatically supports grade, topic, difficulty, multiple-choice, and short-answer filtering. The MVP readiness test expects every roadmap topic in `data/topics.ts` to have at least one linked question.

### Student progress tracking

Progress is generated from saved attempts, lesson progress, visualization sessions, and learning events in SQLite. Visualization cards save exploration completion through `/api/visualization-sessions`. Keep `data/progress.ts` only as legacy/demo reference data unless a page explicitly imports it.
