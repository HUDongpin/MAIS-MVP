# S10 Urgent-Five Auto-Fix Status - 2026-06-07

## Summary

Current local build quality is green, but release remains blocked by source-control hygiene and production storage/API health. No production deploy or secret mutation was attempted.

## Priority 1 - Release Slicing / Dirty Tree

Status: blocked for direct root deploy; slicing artifact written.

- Current tree: 3345 status entries, 245 modified, 4 deleted, 3096 untracked.
- Largest dirty buckets: `public/` 2406 entries, `coordination/` 545, `app/` 118, `lib/` 81, `components/` 66, `data/` 49, `tests/` 49.
- `npm run release:root-deploy-preflight -- --json`: failed as expected and blocks direct root deploy.
- Release slice map: `coordination/release-intake/2026-06-07-S25-urgent-five-release-slices.md`.

Next owners: S25/S22 keep non-destructive release intake; S10/S22 maintain release guard tooling; no blanket staging.

## Priority 2 - Production Storage/Auth Durability

Status: production auth/storage remains red.

Evidence:

- S19 later completed Vercel Production env parity using the approved DOCX source and redacted stdin handling. Required Production env names were reported present, including `RESEND_API_KEY`.
- S19 previously verified authenticated admin storage health after cleanup: `provider=postgres`, `status=durable-ready`, `usingTmpFallback=false`.
- S11 later repeated production safe probes and found storage-backed production routes returning HTTP 500 empty bodies:
  - missing-user `POST /api/auth/login`: expected 401, got 500.
  - `GET /api/questions?grade=S3`: expected 200, got 500.
  - `GET /api/lessons/quadratic-functions`: expected 200, got 500.
- This run could not reverify production or Vercel because DNS resolution failed for `www.mais.hk` and `vercel.com`.

Next owners:

- S12/S19 inspect Vercel function logs for current 500 root cause.
- S12 reruns authenticated admin storage health only with an approved admin session/path.
- S11 reruns `tests/e2e/production-auth-api-preflight.spec.ts`, then the gated five-account production smoke after normal statuses return.

## Priority 3 - Student Core P1 Repairs

Status: locally green by code/evidence; production release still gated.

- Learner setup blocking Practice/games/handwriting: fixed locally by restricting the gate to `/dashboard` in `components/layout/LearnerStartSetupGate.tsx`.
- Direct `/student/lessons/{slug}` rendering: route exists and `StudentLessonPage` loads the requested decoded slug before redirecting only on missing lessons.
- Dashboard welcome after login/register: accessible `h1` still composes `Welcome back, <name>`.
- Handwriting/OCR: deterministic UI/API plumbing is fixed for visible ink detection and error handling; live OCR provider timeout/empty behavior remains a separate S07/S12/S19 check.

Checks this run:

- `npm run type-check`: passed.
- `npm run build`: passed.
- `npm run test:analytics`: passed, 23/23.
- `npm run test:mvp`: passed on isolated rerun, 29/29.

Not run: browser P1 reruns, because local Playwright server bind failed with `EPERM` in this sandbox.

## Priority 4 - Nova Lens / AI Tutor Clean Gate

Status: Nova Lens text/governance remains clean on the later 2026-06-06 baseline.

Accepted baseline evidence:

- S12 Nova Lens API policy audit: passed, 10/10.
- S11 targeted Nova Lens/AI Tutor/teacher operations suite: passed, 18/18.
- Gated live-provider Nova Lens smoke: passed, 1/1, without sensitive leakage.
- S10 continuation targeted run: passed, 18/18.

This run attempted the targeted local gate but Playwright could not start the server due to `listen EPERM` on `127.0.0.1:4110`.

Next owners:

- S07/S11 keep Qwen ASR/image completion outside this clean text/governance gate.
- S22 reruns the minimal gate in an environment that can bind local ports.
- Do not expand provider behavior or release scope from this artifact.

## Priority 5 - One-At-A-Time Content Release

Status: lane discipline confirmed.

- Active lane: Mainland BNU Junior Lessons V1.
- Current state: `approved-for-lesson-integration-review`, not public launch.
- Package facts: 105 lessons; S1 36, S2 39, S3 30; DeepSeek full QA 315 sections with 290 pass, 25 P2 warnings, 0 P0/P1 remediation rows.
- Other PEP high/RAG/illustration packages remain candidate-only or review-only.

Next owners:

- S05: BNU app-fit and route/slug mapping review.
- S09: bilingual copy/accessibility gate.
- S11: representative S1/S2/S3 desktop/mobile route smoke after integration.
- S23: maintain promotion wording and evidence register.
- Owner: final public promotion decision only after gates are green.

## Checks Not Run / Blocked

- Vercel env/publish preflight: blocked by DNS failure for `vercel.com` in this environment.
- Production `www.mais.hk` preflight: blocked by DNS failure in this environment; use S11 earlier same-day evidence as current production status.
- Local Playwright Nova/student browser checks: blocked by sandbox `EPERM` local bind.
- Broad E2E: not run because current priority is release-control evidence and the environment cannot reliably start local web servers.

## Owner-Facing Decision Points

- Do not deploy from the current root.
- Prioritize S12/S19 production 500 recovery before any production smoke or public release claim.
- Keep Nova Lens text/governance separate from Qwen ASR/image work.
- Keep BNU Junior Lessons V1 as the only active content lane until S05/S09/S11 gates complete.
