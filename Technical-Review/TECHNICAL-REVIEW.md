# MAIS-MVP Senior Technical Review & Advisory Report

| | |
|---|---|
| **Project** | MAIS-MVP (www.mais.ac) — adaptive K-12 math learning platform |
| **Review date** | 6 July 2026 |
| **Reviewed by** | Senior technical advisory review (Claude, acting senior software architect) |
| **Scope** | Full repository at `~/Desktop/MAIS-MVP` (main branch), live site spot-check |
| **Audience** | Founder/owner, junior developer, future engineers, product stakeholders |
| **Companion files** | `MAIS-MVP-Issues-Roadmap-Backlog.xlsx`, `PRODUCTION-READINESS-CHECKLIST.md`, `ENGINEERING-BACKLOG.md` |

Statements based on direct code inspection are labeled as evidence; anything unverifiable from the repo is labeled **Assumption** or **Unverified**.

---

## A. Executive Summary

MAIS-MVP is far more substantial than a typical vibe-coded proof of concept: roughly 300,000 lines of strict TypeScript, ~160 API routes, 109 unit-test files, 60 Playwright end-to-end specs, bilingual content pipelines for Hong Kong, mainland China, and US curricula, and a working deployed product on Vercel. Password hashing, route guards, rate-limit concepts, and an AI-governance layer show real security awareness. This is a genuine asset worth building on — not throwing away.

However, the platform stands on one dangerous foundation and several missing safety nets:

1. **The database is one giant JSON blob.** Almost all platform data (users, classes, assignments, messages, progress) is stored as a single serialized JSON document in one row of an `app_state` table. Every write locks that row, rewrites the entire platform state, and re-syncs ~22 projection tables. The local development copy of this blob is already 77 MB. This design caps the platform at a handful of concurrent users, makes every deploy a data-corruption risk, and is the #1 thing that must change. Encouragingly, the team has already proven the escape route: auth, practice attempts, and the mistake book have been migrated to real normalized tables ("hot/fast paths"). That same pattern must now be applied to the rest, domain by domain.
2. **No verified backups, no migration framework, no CI gate.** The CI workflow on push only runs `npm install`; the extensive test suite runs only when manually triggered. There is no schema migration tool and no evidence of tested database backups. Any bad deploy or bad write can currently destroy student data permanently.
3. **Security and privacy gaps that must close before real students arrive.** Anyone can self-register as a *teacher*; sessions cannot be revoked; rate limiting is per-serverless-instance (i.e., largely ineffective in production); there is no error tracking; an "All API Keys.docx" file and `.env.local` sit in a working tree where up to 25 autonomous AI agents operate; and there is no privacy policy/consent flow, despite the platform handling data about minors and sending student context to third-party LLM providers.

**Top priorities for the next 3 months:** (1) backups + CI gate + error tracking + secret rotation in week 1; (2) freeze the JSON blob and adopt a migration framework in weeks 2–4; (3) migrate the highest-traffic domains to normalized tables during month 2; (4) privacy pack, session revocation, load testing, and hardening in month 3.

**Overall verdict (detail in Section J): keep the codebase, refactor the persistence and security core incrementally.** Do not rebuild from scratch.

---

## B. Current System Assessment

### B.1 Observed architecture

| Layer | What is actually there (evidence) |
|---|---|
| Frontend | Next.js 15 App Router, React 19, Tailwind, Framer Motion, Three.js/@react-three, Phaser 4 games, KaTeX. ~30 top-level route groups (`app/`), large client components (largest: `ThreeDLabCanvas.tsx`, 11,240 lines). |
| Backend | Next.js API routes (~160 `route.ts` files), Node runtime. Business logic concentrated in `lib/server/` (notably `userStore.ts`, 9,937 lines, plus ~56 domain persistence modules under `lib/server/userStore/`). |
| Database | Dual-provider custom layer: local = SQLite via experimental `node:sqlite` (synchronous API); production = Postgres via `postgres` npm client, selected by `HK_MATH_STORAGE_PROVIDER`. Core storage = **one JSON snapshot row** (`app_state`), plus partial normalized "hot" tables: `auth_users`, `auth_student_profiles`, `auth_user_settings`, `auth_password_reset_tokens`, `practice_attempts`, `mistake_book_items`, and 22 read-only `projection_*` tables re-synced on every write. |
| Auth | Custom: PBKDF2-SHA512 (120k iterations) password hashing; HMAC-SHA256 stateless session token in an `httpOnly`, `SameSite=Lax`, secure cookie; 7-day expiry; `middleware.ts` protects page routes; per-route guards (`requireTeacherUser`, `requireParentUser`) for APIs; roles: student / teacher / parent / admin. |
| AI stack | Multiple providers (Qwen/DashScope, DeepSeek, EduHK, SimpleTex/Mathpix OCR, Resend email, optional xAPI LRS). AI tutor with rate/token budgets, an AI-governance/audit module, adaptive-learning engine (`lib/adaptiveLearning.ts`) with knowledge components, skill states, rule-based candidates and LLM-validated recommendations. |
| Content | ~91 MB of curriculum/question-bank data as TypeScript modules in `data/`, built by ~75 Python/Node manifest scripts (RAG pipelines) for HK/mainland/US textbooks. |
| Hosting/deploy | Vercel (`.vercel`, deploy scripts, `@vercel/analytics`). Custom deploy scripts with env preflight guards (`release-env-guard.mjs`); staging = script-prepared copy in `.tmp/vercel-staging`. GitHub Actions CI exists but on push only runs `npm install`; full validation is manual-dispatch only. |
| Testing | 109 unit test files (node:test, compiled via bespoke `tsc → .tmp` + symlink pipeline), 60 Playwright e2e specs (desktop + mobile-chrome projects), API-surface security tests. Not run automatically. |
| Observability | None beyond Vercel defaults and 62 `console.*` statements. No Sentry/error tracker, no structured logs, no alerting. |
| Dev workflow | Up to 25 parallel AI (Codex) agents coordinated via a 60 KB `AGENTS.md` and a `coordination/` directory; 41 `codex/*` local branches; owner integrates on `main`. 7,786 tracked files including QA evidence, video plans, and generated artifacts. |

### B.2 Maturity assessment

- **Code quality:** surprisingly high discipline for its origin — TypeScript `strict` is on, only ~11 `: any` in non-test app code, consistent naming, extensive co-located tests. The problems are *structural* (god files, a monolithic store, no linting) rather than sloppy code.
- **Product modeling:** student/teacher/parent/admin domains, classes, assignments, submissions, assessments, gamification, forum, and messaging are all explicitly modeled with typed contracts — unusually complete. But nearly all of it lives inside the single store module and the single JSON payload.
- **Operations maturity: low.** No gated CI, no migrations, unverified backups, no monitoring, secrets on disk. This is where a "junior + AI agents" workflow shows most.
- **Documentation:** README still describes the project as "HK Math Lab Template" (the live site's meta description does too); `AGENTS.md` is rich but written for AI agents, not human onboarding; no architecture doc reflecting the real storage design.

**Assumptions (unverified from repo alone):** production runs `HK_MATH_STORAGE_PROVIDER=postgres` with a managed Postgres (the registration route refuses real signups on Vercel without durable Postgres, which suggests this is configured); actual production user counts are small; no confirmed automated DB backups; Vercel plan/limits unknown.

---

## C. Major Issues Table

Ranked by severity, then urgency. Full detail (evidence, risk, fix, acceptance criteria) in the Excel register; effort = S/M/L.

| ID | Issue | Severity | Area | Why it matters / risk if ignored | Recommended fix | Effort | Owner | 3-mo priority |
|---|---|---|---|---|---|---|---|---|
| ISS-01 | Entire platform state stored as one JSON blob row (`app_state`); every write locks + rewrites everything and re-syncs 22 projection tables; local blob already 77 MB | **Critical** | Data/Arch | Hard concurrency ceiling (global write lock); slow requests; memory blowups; one bad write corrupts all data; blocks classrooms-scale usage | Freeze the blob (no new data), continue proven strangler migration to normalized tables, domain by domain (auth/attempts already done) | L | Senior + junior | Month 1–3, top priority |
| ISS-02 | No schema migration framework; runtime `CREATE TABLE IF NOT EXISTS`/`ALTER` calls; `schemaVersion` fixed at 1 | **Critical** | Data | Schema changes are untracked and irreversible; deploy + rollback of DB changes is guesswork | Adopt node-pg-migrate (or drizzle-kit); baseline current schema; migrations run as explicit deploy step | M | Senior sets up | Weeks 3–4 |
| ISS-03 | Backups and restore untested/unconfigured (no backup automation in repo; JSON export endpoint only) | **Critical** | Data/DevOps | Any incident = permanent loss of student records | Enable provider PITR/daily dumps; scripted restore drill; document RPO/RTO | S | DevOps/junior | Week 1 |
| ISS-04 | CI gates nothing: push workflow only `npm install`s; tests/build run on manual dispatch only | **Critical** | Workflow | Large test suite exists but cannot prevent regressions; AI-agent-generated code lands unverified | Run type-check + unit tests + build on every push/PR; make deploy depend on green | S | Junior | Week 1 |
| ISS-05 | No privacy baseline for a minors' platform: no policy/consent flows; student data (names, attempts, work photos, voice) flows to third-party LLM/OCR providers; multi-jurisdiction (HK PDPO, PIPL, COPPA/FERPA) | **Critical** | Privacy | Legal exposure; school trust; cannot ethically invite real students | Minimum privacy pack: policy pages, consent capture, data-flow map, provider DPA review, deletion/export path, data minimization to LLMs | M | Product owner + senior | Before real users; month 1–3 |
| ISS-06 | Sessions cannot be revoked: stateless 7-day HMAC token; logout only clears cookie; password change/reset does not invalidate other devices | High | Security | Stolen/leaked token stays valid up to 7 days; no kill switch | Server-side session table (token id + revoked flag); invalidate on password change; "log out everywhere" | M | Junior w/ review | Month 2 |
| ISS-07 | Open self-registration as **teacher** (and parent) — only admin role is blocked (`register/route.ts`) | High | Security | Strangers gain teacher-tier UI/AI capabilities; trust boundary unclear; potential access to student-adjacent flows | Invite code / admin approval for teacher accounts; audit parent-child linking flow | S–M | Junior | Weeks 1–2 |
| ISS-08 | Rate limiting is an in-memory `Map` per serverless instance — resets on cold start, not shared across instances | High | Security/Cost | Brute-force login and LLM-cost abuse are effectively unthrottled in production | Durable limiter (Postgres or Upstash Redis) for auth + AI routes; per-user and per-IP | S–M | Junior | Weeks 1–2 |
| ISS-09 | No error tracking or alerting; 62 scattered `console.*` calls; Vercel logs only | High | Observability | Production breakage is invisible; debugging = guesswork | Add Sentry (server + client), release tagging, alert rules; request-ID logging helper | S | Junior | Week 1 |
| ISS-10 | God modules: `userStore.ts` 9,937 lines (persistence + business rules + AI context assembly); `ThreeDLabCanvas.tsx` 11,240 lines; `ai-tutor/resolve` route 2,865 lines | High | Code | Every change touches a giant shared file; merge conflicts across AI agents; new devs can't navigate | Split by domain behind interfaces as part of strangler migration; never big-bang | L (incremental) | Senior guides | Months 2–3 |
| ISS-11 | Inconsistent API validation & error handling: hand-rolled `typeof` checks; only ~7 of 160 routes use a shared JSON error boundary; no schema validation library | High | Backend | Bad input reaches business logic; inconsistent error shapes break clients; 500s leak stack behavior | Introduce zod + a `withApiHandler` wrapper (auth, validation, error envelope); apply to top-20 routes first | M | Junior | Weeks 3–8 |
| ISS-12 | Secrets hygiene: `All API Keys.docx` + `.env.local` in a working tree where up to 25 autonomous AI agents operate; keys referenced in coordination logs | High | Security | One misbehaving agent/tool call can exfiltrate every provider key; keys in Word docs are uncontrolled | Rotate all keys; store only in Vercel env + password manager; delete files; add gitleaks pre-commit + CI scan | S | Owner + junior | Week 1 |
| ISS-13 | Deploy/rollback data hazard: reads can trigger normalization **write-backs** of the full state; overlapping old/new code versions during deploys can silently drop newer fields | High | Deploy/Data | Rolling back the app can corrupt or regress data; deploys during traffic are risky | Remove write-on-read (make normalization an explicit migration); version the payload; part of blob freeze | M | Senior | Month 2 |
| ISS-14 | No ESLint/Prettier; bespoke test pipeline (tsc → `.tmp`, symlinked `@` aliases, 4 tsconfigs) | Medium | Workflow | Style drift, latent bugs, fragile test runs, high onboarding friction | Add ESLint + Prettier; migrate unit tests to Vitest (keeps TS paths natively) | M | Junior | Month 2 |
| ISS-15 | Frontend weight & resilience: heavy libs (three, phaser, framer-motion); client components import from the 91 MB `data/` tree; 0 route `error.tsx` boundaries (8 `loading.tsx`) | Medium | Frontend | Slow first loads on school hardware; a thrown render error white-screens the route | Bundle analysis + dynamic imports + per-route JS budget; add `error.tsx` boundaries; audit `data/` imports reaching the client | M | Junior + designer | Month 2 |
| ISS-16 | Repo hygiene & docs drift: 7,786 tracked files incl. QA evidence/CSVs/video plans; 41 stale `codex/*` branches; README/site metadata still say "HK Math Lab Template"; stray `Users/`, `output/` dirs | Medium | Workflow | New engineers can't tell product code from scratch; git slow; brand confusion | Archive non-product artifacts out of the repo; delete merged branches; rewrite README + ARCHITECTURE + ONBOARDING | M | Junior | Weeks 3–4 |
| ISS-17 | Platform risk: experimental synchronous `node:sqlite` in the request path (local/fallback); Node version unpinned (`engines` absent; CI uses Node 24) | Medium | Platform | Event-loop blocking on big writes; "works on my machine" drift | Pin Node (engines + .nvmrc = same as Vercel); keep SQLite strictly local-dev; assert postgres provider at boot in prod | S | Junior | Weeks 3–4 |
| ISS-18 | CSRF protection relies solely on `SameSite=Lax` cookies; no origin checks or CSRF tokens on state-changing routes | Medium | Security | Residual CSRF exposure on older browsers/edge cases | Add Origin/Referer validation in the shared API wrapper; consider double-submit token later | S | Junior | Month 2 |

Positives worth preserving (do not "fix" these): strict TS with minimal `any`; PBKDF2 password hashing with constant-time comparisons; route-guard pattern + API-surface security tests; AI budget/governance layer; the hot/fast-path migration pattern; the large e2e suite; env preflight scripts.

---

## D. 3-Month Technical Recovery Roadmap

Assumes ~1 full-time junior developer assisted by AI agents, a senior engineer advising a few hours/week, and the product owner for decisions. Feature development continues at reduced pace; **no new feature may write new data into the JSON blob after Week 2.**

### Weeks 1–2 — Stabilization and risk reduction (stop the bleeding)
- Verify production storage is Postgres; enable automated backups/PITR on the DB provider; run and document one **restore drill** (ISS-03).
- Turn CI into a gate: type-check + unit tests + production build on every push/PR; production deploys only from green main (ISS-04).
- Add Sentry (server + client) with alerts to email/WeCom (ISS-09).
- Rotate every provider key; delete `All API Keys.docx` and move secrets to Vercel env + a password manager; add gitleaks scanning (ISS-12).
- Gate teacher registration behind an invite code (ISS-07).
- Replace in-memory rate limiting with a durable limiter on login, register, password-reset, and AI routes (ISS-08).
- Write the **"app_state freeze" ADR**: new/changed data goes to normalized tables only (kickoff of ISS-01).

### Weeks 3–4 — Architecture cleanup and documentation
- Introduce migration framework; baseline the existing normalized tables; all future DDL via migrations (ISS-02).
- Build the shared API handler (auth + zod validation + standard error envelope + request ID); convert auth and student-write routes first (ISS-11).
- Rewrite README (real architecture, setup, env matrix); add ARCHITECTURE.md and ONBOARDING.md for humans (ISS-16).
- Repo cleanup: archive `coordination/` evidence, `video-plan/`, stray dirs to separate archive storage; prune merged `codex/*` branches (ISS-16).
- Pin Node version; assert `storageProvider === "postgres"` at boot in production (ISS-17).
- Stand up a real **staging** environment: separate Vercel project + separate Postgres + seeded demo data; e2e smoke runs there post-deploy.

### Month 2 — Core refactoring and feature foundation
- **Strangler wave 1** out of the blob: `learning_events`, `lesson_progress`, then messages/notices — dual-write → backfill → verified reads → cut over (ISS-01).
- Remove write-on-read normalization; make normalization an explicit versioned migration (ISS-13).
- Split `userStore.ts` into domain modules behind interfaces (mechanical moves, no behavior change; protected by existing tests) (ISS-10).
- Server-side session records with revocation; invalidate on password change; "log out all devices" (ISS-06).
- Tooling: ESLint + Prettier + Vitest migration of unit tests; e2e suite nightly against staging (ISS-14).
- Frontend: bundle analysis, dynamic-import three/phaser surfaces, add `error.tsx` boundaries to main route groups; fix any `data/` imports bloating client bundles (ISS-15).

### Month 3 — Hardening, testing, and controlled feature expansion
- **Strangler wave 2:** classes, enrollments, assignments, submissions to normalized tables (ISS-01).
- Complete the privacy pack: policy + consent, data-flow map, provider DPA check, account deletion/export, LLM data minimization (ISS-05).
- Load test (k6) a realistic classroom scenario (e.g., 200 concurrent students submitting attempts); fix top 3 bottlenecks found.
- Security pass: security headers + CSP (report-only first), Origin checks (ISS-18), `npm audit` triage, admin-action audit log.
- Extract the adaptive engine behind a clean interface with a `recommendation_log` table (see Section E) — enables A/B evaluation later.
- Second restore drill + incident runbook; then a **controlled pilot** (1–2 real classrooms) with monitoring dashboards watched daily.

---

## E. Recommended Target Architecture (near-term, small-team realistic)

Keep what works: **a modular monolith on Next.js + Vercel + managed Postgres.** No microservices, no Kubernetes, no event buses. The changes are about *internal structure and data*, not new infrastructure.

```
Browser (student / teacher / parent / admin)
   │  React 19 + App Router pages, heavy visuals lazy-loaded
   ▼
Next.js API routes (thin controllers)
   │  withApiHandler: auth → role check → zod validation → error envelope
   ▼
Domain services (lib/domains/*)          ← business rules live here
   auth · learning · practice · classes · assessment · messaging ·
   gamification · adaptive · content
   ▼
Repositories (SQL via migrations-managed schema)
   ▼
Managed Postgres (Neon/Vercel/Supabase Postgres)
   + object storage for media (student work photos, audio)

Cross-cutting: Sentry · request-ID logging · durable rate limiter ·
LLM provider gateway (budgets, timeouts, fallbacks — already exists, keep) ·
Vercel Cron for scheduled jobs (reminders, retention cleanup)
```

**Core relational model** (much of this already exists as typed contracts; it becomes tables): `users`, `sessions`, `student_profiles`, `parent_links`, `schools`, `classes`, `enrollments`, `topics`, `lessons`, `questions` (+ versioned content refs), `assignments`, `submissions`, `assessments`, `assessment_items`, `attempts` (exists), `mistake_book_items` (exists), `learning_events` (append-only activity log), `lesson_progress`, `learner_skill_state`, `recommendation_log`, `messages`, `notices`, `reward_ledger`, `audit_log`.

**Adaptive learning readiness.** The existing `adaptiveLearning.ts` design (knowledge components, skill states, rule-based candidates, LLM-validated recommendations, budget classification) is conceptually sound. Minimal architecture to make it dependable:

1. `learning_events` append-only table = single source of truth for learner signals (attempts, lesson completions, tutor interactions).
2. `learner_skill_state` table updated transactionally from events (current mastery per knowledge component).
3. `AdaptiveEngine` interface: `recommendNext(learnerId, context) → {action, reason, evidence}`; rules first, LLM as *re-ranker/validator* with strict schema-validated output and a deterministic rule-based fallback (pattern already present — formalize it).
4. Log every recommendation + subsequent outcome to `recommendation_log` so effectiveness is measurable and prompts can change safely.
5. Never let ad hoc prompt logic write directly to learner state; all state changes go through the domain service.

**Content pipeline:** keep curriculum banks as build-time artifacts, but stop importing large `data/` modules into client components; serve question/lesson content through APIs or per-page static props, with an eye toward moving banks into Postgres when authoring workflows need it.

**Auth:** keep the custom HMAC session (it is competently built) + add the server-side session table. Adopt Auth.js later only if Google/SSO login becomes a product requirement (a `codex/A12-google-oauth-login` branch exists — do not merge it before session revocation lands).

---

## F. Refactoring Strategy

**Method: strangler pattern with dual-write, protected by the existing test suite. The live site must never depend on a big-bang cutover.**

Refactor first (order matters):
1. **Persistence of hot domains** (ISS-01) — the pattern per domain: create tables via migration → dual-write (blob + tables) → backfill from blob → shadow-read + compare (log mismatches) → switch reads → stop writing that domain to the blob. Auth and attempts prove this works.
2. **The API boundary** — shared handler with validation/error envelope; converts routes incrementally without touching business logic.
3. **`userStore.ts` decomposition** — mechanical extraction into `lib/domains/*` modules, one domain per PR, zero behavior change, existing unit tests as the harness.

Leave alone for now (deliberately): visualization/3D/game components (huge but self-contained and low-risk; only lazy-load them); RAG/manifest content pipelines (they work and are offline tooling); UI styling and i18n system; the gamification rules engine; anything already covered by passing tests that isn't on the persistence path.

Rules to avoid breaking the live proof of concept: never mix refactor and feature changes in one PR; every strangler wave is reversible until reads are switched; deploy waves behind env flags with staging soak first; keep the blob as read-only fallback until a full month of clean parity; take a DB snapshot before every cutover; run e2e smoke against staging before every production deploy; keep the AI agents (if the 25-agent workflow continues) writing to feature branches that must pass the new CI gate — agent output gets the same bar as human output.

---

## G. Minimum Production-Readiness Checklist

The full check-box version lives in `PRODUCTION-READINESS-CHECKLIST.md` and the Excel workbook. Summary of the bar to clear before inviting real classrooms:

- **Security:** teacher registration gated; durable rate limits on auth + AI; session revocation live; secrets only in Vercel env (rotated, scanned); security headers + CSP report-only; admin audit log.
- **Data:** automated backups with a passed restore drill; migration framework in place; blob freeze enforced; hot domains on normalized tables; RPO ≤ 24h / RTO ≤ 4h documented.
- **Deployment:** CI green required to deploy; staging with seeded data; documented rollback (code via Vercel, data via snapshot policy); Node pinned; env matrix documented.
- **Testing:** unit + build on every PR; e2e smoke on staging per release; the 5 critical flows covered: register/login, practice attempt + mistake book, lesson progress, teacher assignment → student submission → grading, parent view.
- **Monitoring:** Sentry alerting to a watched channel; uptime check on `/` and login; LLM spend alarm; weekly review of error trends.
- **Documentation:** README (real), ARCHITECTURE.md, ONBOARDING.md, incident runbook, data-flow/privacy map.
- **User experience:** route error boundaries; loading states on all data pages; mobile check of the 5 critical flows; bilingual copy pass on auth + core student flows.
- **Privacy:** policy published; consent capture; provider list + DPAs reviewed; deletion/export path; LLM data minimization documented.

---

## H. Suggested Backlog

24 tickets with descriptions and acceptance criteria are in `ENGINEERING-BACKLOG.md` and the Excel workbook (sheet "Backlog"). Highest-priority ten: BK-01 backups+restore drill, BK-02 CI gate, BK-03 Sentry, BK-04 secret rotation + gitleaks, BK-05 teacher invite codes, BK-06 durable rate limiting, BK-07 app_state freeze ADR, BK-08 migration framework, BK-09 shared API handler + zod, BK-10 staging environment.

---

## I. Risks, Assumptions, and Open Questions

**Assumptions made in this review** (verify before acting where marked ⚠):
- Production uses `HK_MATH_STORAGE_PROVIDER=postgres` with a managed Postgres instance (⚠ verify in Vercel env; the register route's durable-storage check implies it).
- Current real-user volume is very small (⚠ if real classrooms are already active, move the privacy pack and ISS-01 wave 1 earlier).
- The `.env.local` on disk contains live production-adjacent keys (⚠ treat as compromised-until-rotated given the multi-agent working tree).
- Vercel provides code rollback; no data rollback exists today.

**Open questions for the product owner:**
1. Which Postgres host/plan/region serves production, and are provider backups already enabled? (Single most urgent unknown.)
2. Are any *real* students/teachers (non-demo) already registered? Which jurisdictions (HK / mainland / US) will pilot first? This decides which privacy regime (PDPO / PIPL / COPPA-FERPA) leads.
3. What is the monthly budget ceiling for LLM providers, and should hard spend caps cut the AI tutor off?
4. Will the 25-agent development model continue? If yes, the CI gate + branch policy in this report becomes mandatory, and secrets must leave the working tree.
5. Who owns mais.ac DNS/registrar and the Vercel team account (bus-factor check)?
6. Is the xAPI LRS integration active in production (external transfer of learning records)?
7. Target pilot date and class size — the load-test scenario and wave-1 scope should match it.

**Residual risks even if the roadmap is followed:** the blob remains a single point of failure until wave 2 completes (mitigate: snapshots + freeze); LLM provider changes can silently alter tutor/adaptive behavior (mitigate: recommendation_log + golden-prompt tests); content-pipeline scripts have no lockfiles and may not reproduce (accepted for now).

---

## J. Final Recommendation

**Partially refactor. Do not rebuild, and do not keep modifying the current core unchanged.**

- **Why not rebuild:** the product works in production; ~300k lines of strict, typed, heavily unit-tested code plus three curricula of content pipelines represent months of embedded knowledge; a rebuild would freeze features for a quarter, still require a data migration, and discard an e2e suite that is precisely the safety harness a refactor needs. Rebuilds of working MVPs by small teams usually fail on scope.
- **Why not continue as-is:** the single-JSON-blob store, absent migrations/backups, ungated CI, and open teacher registration mean the next growth spurt or the next bad deploy can destroy data and trust. These are foundation defects, not cosmetic debt.
- **The middle path is already proven in this codebase:** hot-auth and practice-attempt fast paths show the strangler migration works here. Finish that job domain by domain behind the existing tests, add the missing safety nets (backups, CI, monitoring, migrations) in the first two weeks, and close the security/privacy gaps before real students arrive.

If exactly one thing gets done this month, make it Weeks 1–2 of the roadmap — every later step depends on those safety nets.

*Prepared as an advisory document. All file paths and line counts refer to the repository state on 6 July 2026.*
