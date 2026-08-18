# MAIS-MVP Minimum Production-Readiness Checklist

Bar to clear **before inviting real students/teachers** (beyond demo accounts). Check items off in PRs; each links to a backlog ticket (BK-xx) in `ENGINEERING-BACKLOG.md`.

Status legend: ☐ open · ☑ done · n/a with reason.

## 1. Security
- [x] Teacher registration requires invite code or admin approval (BK-05) — `TEACHER_INVITE_CODES`, enforced in `app/api/auth/register/route.ts`; fails closed when unconfigured. The admin-generated-code half of BK-05 is still open: it needs a durable code store, which BK-07 (app_state freeze) and BK-08 (migrations) gate.
- [ ] Parent-child linking flow audited: a parent can only see linked children, links require verification (BK-05)
- [ ] Durable rate limiting on login, register, password-reset, and all AI routes — per-IP and per-user (BK-06)
- [ ] Server-side session records: revocation on password change/reset, "log out all devices" (BK-14)
- [ ] All provider API keys rotated; secrets exist only in Vercel env + password manager; `All API Keys.docx` deleted (BK-04)
- [ ] gitleaks (or equivalent) secret scan in CI and pre-commit (BK-04)
- [ ] Security headers set (X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy) + CSP in report-only (BK-21)
- [ ] Origin/Referer check on state-changing API routes (BK-09)
- [ ] Admin actions (exports, provisioning, policy changes) written to an audit log (BK-22)
- [ ] `npm audit` high/critical findings triaged (BK-21)

## 2. Data
- [ ] Automated Postgres backups/PITR enabled at the provider (BK-01)
- [ ] Restore drill performed and documented — actual restore to a scratch DB, data verified (BK-01)
- [ ] RPO ≤ 24h and RTO ≤ 4h agreed and written down (BK-01)
- [ ] Migration framework in place; all DDL via migrations; baseline committed (BK-08)
- [ ] `app_state` blob frozen: ADR merged; code review checklist enforces "no new data in blob" (BK-07)
- [ ] Wave-1 domains (learning events, lesson progress, messages) on normalized tables (BK-11/12)
- [ ] Pre-cutover DB snapshot procedure documented and used (BK-11)
- [ ] Production boot asserts `HK_MATH_STORAGE_PROVIDER=postgres` (BK-17)

## 3. Deployment & environments
- [ ] CI runs type-check + unit tests + build on every push/PR; failures block merge (BK-02)
- [ ] Production deploys only from green `main` (BK-02)
- [ ] Staging: separate Vercel project + separate Postgres + seeded demo data (BK-10)
- [ ] e2e smoke suite runs against staging before each production release (BK-10)
- [ ] Rollback runbook: code rollback via Vercel, data policy for each release type (BK-23)
- [ ] Node version pinned (`engines` + `.nvmrc`) and matched to Vercel runtime (BK-17)
- [ ] Environment variable matrix documented per environment (BK-18)

## 4. Testing
- [ ] Unit tests + build green on every PR (BK-02)
- [ ] Critical-flow e2e coverage green: register/login; practice attempt → mistake book; lesson progress; teacher assignment → student submission → grading; parent view of child (BK-10)
- [ ] Unit tests migrated to Vitest (or equivalent standard runner) (BK-16)
- [ ] Load test of classroom scenario (≥200 concurrent students) passed with p95 < 2s on attempt submission (BK-19)

## 5. Monitoring & observability
- [ ] Sentry (client + server) with release tagging; alerts reach a watched channel (BK-03)
- [ ] Uptime monitoring on `/`, `/login`, and one authenticated API (BK-03)
- [ ] LLM spend alarm + hard budget cap decision recorded (BK-20)
- [ ] Request-ID structured logging helper used by shared API handler (BK-09)
- [ ] Weekly error-trend review scheduled (owner + dev) (BK-03)

## 6. Documentation
- [ ] README describes the real product, architecture, and setup (BK-15)
- [ ] ARCHITECTURE.md documents actual storage design incl. blob status + migration state (BK-15)
- [ ] ONBOARDING.md gets a new human dev to a running local app in < 1 hour (BK-15)
- [ ] Incident runbook: who is paged, first 5 diagnostic steps, rollback, comms (BK-23)
- [ ] Data-flow / privacy map: what student data goes to which provider and why (BK-24)

## 7. User experience
- [ ] `error.tsx` boundaries on all main route groups — no white screens (BK-13)
- [ ] Loading states on all data-fetching pages (BK-13)
- [ ] The 5 critical flows verified on mobile (small screen + slow network) (BK-13)
- [ ] Bilingual (EN/中文) copy pass on auth + core student flows (BK-13)
- [ ] Site metadata/branding updated — no more "HK Math Lab Template" (BK-15)

## 8. Privacy (education platform, minors)
- [ ] Privacy policy + terms published and linked from register/login (BK-24)
- [ ] Consent capture at registration (age-appropriate; school/parent consent path decided) (BK-24)
- [ ] Third-party provider inventory (Qwen/DashScope, DeepSeek, EduHK, SimpleTex, Mathpix, Resend, LRS) with data-protection terms reviewed (BK-24)
- [ ] Account deletion + data export path exists (even if semi-manual) (BK-24)
- [ ] LLM data minimization: prompts avoid sending names/emails where not needed (BK-24)
- [ ] Media retention: student work photos/audio retention period enforced (config exists — verify live) (BK-24)
- [ ] Lead jurisdiction decided (HK PDPO / PIPL / COPPA-FERPA) per pilot region (owner decision)
