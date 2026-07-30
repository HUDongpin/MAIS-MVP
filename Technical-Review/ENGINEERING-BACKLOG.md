# MAIS-MVP Engineering Backlog — 3-Month Recovery

24 tickets, ready to paste into an issue tracker. Priority: P0 (weeks 1–2) → P1 (weeks 3–4) → P2 (month 2) → P3 (month 3). Owners: JD = junior developer (AI-agent-assisted), SE = senior engineer/advisor, PO = product owner, DO = DevOps (can be JD wearing that hat), DS = designer.

---

### BK-01 · Enable and verify database backups — **P0 · Critical · DO/JD**
Enable automated backups/PITR on the production Postgres provider; write `scripts/restore-drill.md`; perform one full restore to a scratch database.
**Accept:** provider backup schedule visible; restore drill performed with row-count verification of `app_state`, `auth_users`, `practice_attempts`; RPO/RTO documented in runbook.

### BK-02 · Make CI a real gate — **P0 · Critical · JD**
Change `.github/workflows/ci.yml` to run `type-check`, unit tests (analytics, MVP readiness, question-bank fast subset), and `next build` on every push/PR. Protect `main`.
**Accept:** red CI blocks merge; production deploy script refuses non-green `main`; pipeline < 15 min.

### BK-03 · Error tracking + uptime alerts — **P0 · High · JD**
Add Sentry (server + client) with release tags and source maps; uptime checks on `/`, `/login`, one authed API; alerts to a channel the owner reads (email/WeCom).
**Accept:** a thrown test error appears in Sentry with release + route; downtime alert fires in < 5 min in a test.

### BK-04 · Secret rotation + scanning — **P0 · Critical · PO+JD**
Rotate all provider keys (Qwen/DashScope, DeepSeek, EduHK, SimpleTex, Mathpix, Resend, LRS, session secret). Delete `All API Keys.docx`; secrets only in Vercel env + password manager. Add gitleaks pre-commit + CI job; scan git history.
**Accept:** old keys revoked and confirmed non-working; no secret-bearing files on disk in the repo tree; gitleaks green in CI.

### BK-05 · Gate teacher registration; audit parent linking — **P0 · High · JD**
Require an invite code (env-configured list or admin-generated) for role=teacher registration. Review `parent/children/link` so links require a verifiable code from the child/teacher side.
**Accept:** teacher signup without valid code → 403; e2e test covers it; parent cannot link to an arbitrary student ID; API-surface security test extended.

### BK-06 · Durable rate limiting — **P0 · High · JD**
Replace in-memory limiter with a Postgres-based (or Upstash Redis) fixed-window limiter for login, register, password-reset, and all AI/OCR/speech routes; per-IP and per-user keys.
**Accept:** limits enforced across serverless instances (verified with parallel curl from two regions or 429 after N attempts on prod-like env); AI routes have per-user daily token/request caps.

### BK-07 · "app_state freeze" ADR — **P0 · Critical · SE**
Write ADR: no new fields/domains may be added to the `app_state` blob; new data uses migration-managed tables; document the dual-write strangler recipe (as done for auth/attempts).
**Accept:** ADR merged in `docs/adr/`; PR template gains a checkbox; team (and AI-agent prompts/AGENTS.md) updated to reference it.

### BK-08 · Migration framework — **P1 · Critical · SE+JD**
Adopt node-pg-migrate (or drizzle-kit). Baseline existing tables (`app_state`, hot-auth, attempts, projections). All future DDL via committed migrations; migrations run as explicit deploy step before code release.
**Accept:** `npm run migrate` up/down works locally + staging; runtime `CREATE TABLE/ALTER` calls removed or reduced to assertion-only; docs updated.

### BK-09 · Shared API handler (auth + zod + error envelope) — **P1 · High · JD**
Build `withApiHandler({ role, schema }, fn)`: session check, role guard, zod body/query validation, standard `{code,error,requestId}` envelope, request-ID logging, Origin check for mutations. Convert auth + attempts + lesson-progress + assignments routes first (top ~20).
**Accept:** converted routes return consistent envelopes; invalid body → 400 with field errors; unit tests for the wrapper; runbook documents the envelope.

### BK-10 · Staging environment + release smoke — **P1 · High · DO/JD**
Separate Vercel project + separate Postgres + seeded demo data; e2e smoke subset (login, attempt, lesson, teacher assignment, parent view) runs against staging on every release candidate.
**Accept:** staging URL live with its own DB; smoke suite green gate documented in deploy script; production deploy references staging run ID.

### BK-11 · Strangler wave 1a: learning_events + lesson_progress — **P2 · Critical · SE+JD**
Create tables via migration; dual-write from current store; backfill from blob; shadow-read comparison logging for ≥1 week; switch reads; stop blob writes for these domains. Snapshot DB before cutover.
**Accept:** parity report ≥ 99.9% before switch; dashboards/progress pages read from tables; blob no longer written for these domains; rollback path documented.

### BK-12 · Strangler wave 1b: messages + notices — **P2 · High · JD**
Same recipe as BK-11 for teacher/parent messages and notices.
**Accept:** same criteria as BK-11.

### BK-13 · Frontend resilience + performance pass — **P2 · Medium · JD+DS**
Add `error.tsx` to all main route groups; verify loading states; run `next build` bundle analysis; dynamic-import three/phaser/game surfaces; remove large `data/` imports from client components (login page, roadmaps, forum). Mobile check of 5 critical flows.
**Accept:** no route white-screens on thrown error (e2e test); first-load JS of login/dashboard/practice under agreed budget (e.g. < 300 kB gz each); documented before/after sizes.

### BK-14 · Session revocation — **P2 · High · JD (SE review)**
Add `sessions` table (id, user, created, expires, revoked). Token carries session id; verification checks revocation (with short in-memory cache). Revoke on password change/reset; add "log out all devices".
**Accept:** password change invalidates other logged-in browser (e2e); revoked token → 401 within 60s; logout-all works.

### BK-15 · Documentation reset — **P1 · Medium · JD+PO**
Rewrite README (product, real architecture, setup, env matrix); add ARCHITECTURE.md (storage design incl. blob status), ONBOARDING.md; update site metadata/branding away from "HK Math Lab Template".
**Accept:** a new dev reaches running local app < 1 hour using only the docs; live meta description updated.

### BK-16 · Standard test tooling — **P2 · Medium · JD**
Migrate node:test unit suites to Vitest with native TS path aliases; delete the bespoke `tsc → .tmp` + symlink pipeline; wire into CI.
**Accept:** `npm test` runs full unit suite < 5 min locally; `.tmp` compile scripts removed; CI uses it.

### BK-17 · Runtime pinning + storage assertion — **P1 · Medium · JD**
Add `engines.node` + `.nvmrc` matching Vercel; on production boot, assert postgres provider and required env (extend existing release-env-guard into runtime).
**Accept:** mismatched Node fails install loudly; prod boot with sqlite provider fails with clear error.

### BK-18 · Repo hygiene — **P1 · Medium · JD**
Archive `coordination/` evidence, `video-plan/`, `Users/`, stray outputs to external archive storage; prune merged `codex/*` branches; add env-matrix doc; tidy `.gitignore`d strays (`.DS_Store` etc.).
**Accept:** tracked file count materially reduced (target < 3,000); ≤ 5 active branches; archive location documented.

### BK-19 · Classroom load test — **P3 · High · SE+JD**
k6 scenario: 200 concurrent students login → fetch practice → submit attempts (fast path) → dashboard; plus 10 teachers on analytics. Run against staging with production-like data volume.
**Accept:** p95 attempt submission < 2s, error rate < 1%; top 3 bottlenecks ticketed with flame/graph evidence.

### BK-20 · LLM budget guard — **P2 · High · JD+PO**
Central spend tracking per provider/day (extend existing budget code); hard cap with graceful "tutor is resting" UX; alert at 80%.
**Accept:** simulated overage cuts off AI routes but site otherwise works; owner alert received; caps configurable per env.

### BK-21 · Security headers + dependency audit — **P3 · Medium · JD**
Add headers via `next.config.ts` (frame-ancestors, nosniff, referrer-policy, permissions-policy) + CSP report-only; triage `npm audit` and Playwright/Next advisories.
**Accept:** securityheaders.com grade ≥ A-; CSP report endpoint logging; no high/critical unpatched deps without written waiver.

### BK-22 · Admin audit log — **P3 · Medium · JD**
`audit_log` table (actor, action, target, timestamp, metadata) written by admin endpoints (exports, provisioning, policy, bootstrap-admin) and auth events (login fail/success, password change).
**Accept:** admin storage export shows an audit row; queryable by user/date; retention decision documented.

### BK-23 · Rollback + incident runbook — **P3 · Medium · SE+JD**
Document: code rollback via Vercel, DB snapshot-before-cutover policy, migration down-path policy, incident first-steps, comms template. Run one game-day exercise.
**Accept:** runbook in repo; one simulated incident (kill staging DB) resolved following it; gaps fixed.

### BK-24 · Privacy pack — **P3 · Critical · PO+SE**
Privacy policy + terms pages; registration consent; provider data-flow map + DPA/terms review; deletion/export path (admin-assisted acceptable); LLM prompt data minimization; verify media retention/encryption settings live.
**Accept:** policy linked at register/login; deletion request fulfilled end-to-end in test; data-flow map in docs; owner sign-off on lead jurisdiction per pilot.

---

## Suggested sequencing snapshot

| Window | Tickets |
|---|---|
| Weeks 1–2 | BK-01, BK-02, BK-03, BK-04, BK-05, BK-06, BK-07 |
| Weeks 3–4 | BK-08, BK-09 (start), BK-10, BK-15, BK-17, BK-18 |
| Month 2 | BK-09 (finish), BK-11, BK-12, BK-13, BK-14, BK-16, BK-20 |
| Month 3 | BK-19, BK-21, BK-22, BK-23, BK-24 + strangler wave 2 (classes/assignments/submissions) |
