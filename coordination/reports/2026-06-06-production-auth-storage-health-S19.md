# 2026-06-06 Production Auth/API Transport And Storage Health - S19

## Scope And Secret Handling

- Session: S19.
- Target: `https://www.mais.hk`.
- Scope: Vercel Marketplace Postgres recovery, Production env/deployment refresh, safe curl smoke checks, plus this redacted report.
- Secret handling: no token, database URL, cookie value, password, raw org ID, raw project ID, or Vercel secret value was printed or saved.

## 18:03 HKT Recovery Result

- Status: Production login/register restored at the S19 smoke level.
- Action: provisioned a replacement Neon free Postgres resource through Vercel Marketplace, refreshed encrypted Production/Preview Postgres env names, and redeployed Production.
- Current production alias target:
  - `https://www.mais.hk` and `https://mais.hk` resolve to `https://mais-h994eixih-peter-dongpin-hu-s-projects.vercel.app`.
  - Deployment is READY; deployment id is present-redacted.
- Current connected Marketplace storage resource shown for `mais-mvp`: `mais-mvp-postgres-rescue`.
- Old quota-exhausted Postgres resource was not deleted, preserving a possible future recovery/migration route.
- No local `.env*` file was edited and no secret value was pulled to disk.

## Current Production Identity

- Vercel CLI is available: `vercel` 54.9.0.
- Local Vercel linkage exists: `.vercel/project.json` has `orgId` and `projectId` present, both redacted.
- Post-recovery `vercel inspect https://www.mais.hk --format=json` resolves the production alias to:
  - URL: `https://mais-h994eixih-peter-dongpin-hu-s-projects.vercel.app`
  - target: `production`
  - ready state: `READY`
  - deployment id: present-redacted
  - created: `2026-06-06T09:53:45.230Z`

## Environment And Storage Evidence

- Production env-name check confirms encrypted variables are present:
  - `AUTH_SESSION_SECRET`
  - `HK_MATH_STORAGE_PROVIDER`
  - `POSTGRES_URL`
  - `POSTGRES_URL_NON_POOLING`
  - `POSTGRES_URL_NO_SSL`
  - `DEEPSEEK_API_KEY`
  - `DEEPSEEK_API_URL`
  - `DEEPSEEK_MODEL`
- Anonymous `GET https://www.mais.hk/api/admin/storage/health` returned HTTP 401 JSON with an error key, which is expected because admin authentication is required.
- Recent Vercel logs for `/api/admin/storage/health` show info-level request entries and no storage-health error entries in the sampled windows.
- Authenticated admin storage health was not run. Admin credentials/session are needed and absent from the current authorized session context.

## Post-Recovery Auth Smoke

- Before recovery, S19 reproduced HTTP 500 empty-body failures for both disposable `POST /api/auth/register` and `POST /api/auth/login`.
- Vercel logs for the failing requests showed the Postgres-side quota message: `Your project has exceeded the data transfer quota. Upgrade your plan to increase limits.`
- After the replacement Postgres env refresh and Production redeploy, S19 ran disposable student auth smoke:
  - `POST /api/auth/register`: HTTP 200, JSON body, keys `lessonEntryTarget`, `settings`, `user`, role `student`, grade `P3`.
  - `POST /api/auth/login`: HTTP 200, JSON body, keys `lessonEntryTarget`, `settings`, `user`, role `student`, grade `P3`.
- Recent post-recovery Vercel logs show the auth smoke routes returning HTTP 200 and no repeated data-transfer quota error in the sampled post-redeploy window.
- Note: one Node `fetch` probe saw a local socket close after Vercel had logged login HTTP 200; a follow-up `curl` smoke returned full 200 JSON for both register and login.

## API Transport Evidence

- `GET https://www.mais.hk/api/ai-tutor/status` returned HTTP 200 JSON:
  - text configured: true
  - text provider: `deepseek`
  - text model: `deepseek-v4-pro`
  - image configured: true
  - voice configured: true
- A deliberately invalid, non-credentialed `POST https://www.mais.hk/api/auth/login` returned HTTP 400 JSON with an error key.
- The invalid login probe did not produce a socket hang-up or empty reply at the client surface.

## Vercel Function Log Findings

- `vercel logs --environment production --since 24h --limit 1000 --json --no-branch`:
  - parsed 1000 JSON log lines.
  - matched 180 raw lines mentioning `/api/auth/login`, `/api/admin/storage/health`, `socket hang up`, or `empty reply`.
  - `socket hang up` mentions: 0.
  - `empty reply` mentions: 0.
  - repeated `/api/auth/login` error messages were present.
- The repeated `/api/auth/login` error message was: `Your project has exceeded the data transfer quota. Upgrade your plan to increase limits.`
- In the 2-hour sampled window:
  - `/api/auth/login` info lines: 4 raw lines.
  - `/api/auth/login` error lines: 24 raw lines.
  - `/api/admin/storage/health` info lines: 8 raw lines.
  - `/api/admin/storage/health` error lines: 0 raw lines.
  - `socket hang up`: 0.
  - `empty reply`: 0.
- In the final 10-minute sampled window:
  - `/api/auth/login` info lines: 2 raw lines.
  - `/api/auth/login` error lines: 6 raw lines.
  - `/api/admin/storage/health` info lines: 2 raw lines.
  - `/api/admin/storage/health` error lines: 0 raw lines.
  - `socket hang up`: 0.
  - `empty reply`: 0.
  - Latest dummy login probe logged as info at `2026-06-06T04:48:26.179Z`.
  - Quota-related login errors were clustered immediately before that, around `2026-06-06T04:43:31Z` to `2026-06-06T04:43:52Z`.

## Commands Run

- `sed -n '1,260p' AGENTS.md`
- `git status --short`
- `sed -n '1,220p' /Users/dongpinhu/.codex/skills/vercel-cli-with-tokens/SKILL.md`
- `test -f coordination/session-logs/2026-06-06-S19.md ...`
- `test -f coordination/reports/2026-06-06-production-auth-storage-health-S19.md ...`
- `ls -la .vercel`
- `find coordination -maxdepth 2 -type f ...`
- `sed -n ... coordination/session-logs/2026-06-05-S19.md`
- `sed -n ... coordination/blockers/2026-06-05-S19-postgres-url.md`
- `sed -n ... coordination/blockers/2026-06-05-S19-durable-postgres-terms.md`
- `sed -n ... coordination/reports/2026-05-21-production-auth-storage-root-cause.md`
- `date '+%Y-%m-%d %H:%M:%S %Z'`
- `command -v vercel ... && vercel --version`
- `node -e ... .vercel/project.json ...`
- `vercel logs --help`
- `vercel inspect --help`
- `vercel inspect https://www.mais.hk --format=json`
- `vercel env ls --help`
- `vercel env ls production`
- `curl https://www.mais.hk/api/ai-tutor/status`
- `curl https://www.mais.hk/api/admin/storage/health`
- `vercel logs --environment production --since 24h --limit 1000 --json --no-branch`
- `vercel logs --environment production --since 2h --limit 200 --json --no-branch`
- `node -e ... timestamp conversion ...`
- invalid dummy `POST https://www.mais.hk/api/auth/login`
- `vercel logs --environment production --since 10m --limit 200 --json --no-branch`
- redacted DOCX keyword scan for Postgres/Neon/Supabase/Vercel credential availability
- `vercel integration list`
- `vercel integration installations`
- `vercel integration balance neon`
- `vercel integration add neon --plan free_v3 --name mais-mvp-postgres-restore-20260606 ... --no-env-pull --format=json`
- `vercel redeploy <previous-ready-production-url> --target production`
- disposable post-recovery `POST /api/auth/register` and `POST /api/auth/login` smoke checks, with cookie/body secrets suppressed
- post-recovery `vercel inspect`, `vercel env ls production`, `vercel integration list mais-mvp`, and `vercel logs --environment production --since 10m ...`

## Recommended Next S11 Smoke Inputs

- Base URL: `https://www.mais.hk`.
- Current underlying production deployment URL for correlation: `https://mais-h994eixih-peter-dongpin-hu-s-projects.vercel.app`.
- Treat old Vercel data-transfer quota errors on `/api/auth/login` and `/api/auth/register` as the pre-recovery failure signature.
- Treat post-recovery disposable register/login HTTP 200 as S19's passed smoke, but rerun S11's independent production smoke for release confidence.
- Include timestamp capture for every auth request, plus response status, body shape, `x-vercel-id`, and whether the response body is empty.
- If owner provides an existing production admin credential/session, add authenticated `GET /api/admin/storage/health` and assert `provider=postgres`, `durableReady=true`, `usingTmpFallback=false`, and no secret-bearing fields in output.
- Without admin credentials, keep storage-health checks anonymous-only and expect HTTP 401.

## Residual Risk

- The restored Production storage is a fresh Postgres state. Seed/demo records and new registrations work, but any records only stored in the quota-exhausted previous resource remain unavailable until that old resource is restored and a migration/export path is approved.
- Admin storage health remains unverified because no production admin credential/session is available in this authorized context.

## Final Resolution - 2026-06-06 19:17 HKT

- Supersedes the previous residual admin-health gap above.
- S19 used a temporary Production bootstrap-admin smoke path, with generated redacted values, to create an authenticated admin session.
- Cleanup was completed immediately after the first authenticated health check:
  - Removed `MAIS_BOOTSTRAP_ADMIN_EMAIL`
  - Removed `MAIS_BOOTSTRAP_ADMIN_USERNAME`
  - Removed `MAIS_BOOTSTRAP_ADMIN_NAME`
  - Removed `MAIS_BOOTSTRAP_ADMIN_PASSWORD`
  - Redeployed Production after env removal
  - Rechecked Production env names: no visible `MAIS_BOOTSTRAP_ADMIN_*`
- Current Production deployment after cleanup:
  - `https://mais-28alikw52-peter-dongpin-hu-s-projects.vercel.app`
  - aliases: `https://mais.hk`, `https://www.mais.hk`
  - state: `READY`, target `production`
- Authenticated `GET https://www.mais.hk/api/admin/storage/health` passed after bootstrap env cleanup:
  - HTTP 200
  - `provider=postgres`
  - `status=durable-ready`
  - `durableReady=true`
  - `configuredUrl=true`
  - `usingTmpFallback=false`
  - `runtime=vercel`
- Post-cleanup browser student smoke passed:
  - disposable register: HTTP 200, `role=student`, `grade=P3`
  - disposable login: HTTP 200, `role=student`, `grade=P3`
  - `/api/me`: HTTP 200, `role=student`, `grade=P3`, session cookie present
- Remaining risk is now data migration and admin roster hygiene, not storage readiness:
  - Fresh Postgres state means old registrations in the quota-exhausted resource still require a later restore/export/migration decision.
  - Temporary admin smoke records may exist in the fresh Postgres state; generated passwords were not recorded. S12 should clean, disable, or rotate them through an approved maintenance path if needed.
