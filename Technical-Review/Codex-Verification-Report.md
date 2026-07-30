# Codex Verification Report - MAIS-MVP Technical Review

Date: 2026-07-06  
Reviewer: Codex, acting as an independent senior technical reviewer  
Repo inspected: `/Users/dongpinhu/Desktop/MAIS-MVP` on branch `main`, commit `ce2ae5258013ca5bd79dd0cc56e7b1681d5cd411`  
Primary source artifacts reviewed:

- `Technical-Review/MAIS-MVP-Technical-Advisory-Report.docx`
- `Technical-Review/TECHNICAL-REVIEW.md`
- `Technical-Review/PRODUCTION-READINESS-CHECKLIST.md`
- `Technical-Review/ENGINEERING-BACKLOG.md`
- `Technical-Review/MAIS-MVP-Issues-Roadmap-Backlog.xlsx`

## Executive Summary

Codex supports the advisory report's main conclusion: MAIS-MVP is a substantial, working Next.js/TypeScript product, but it is not yet production-ready for real minors or school-scale use. The strongest supported risks are the central `app_state` JSONB/SQLite snapshot architecture, weak automatic CI gating, missing repo-visible migration/backup discipline, open teacher/parent self-registration, stateless non-revocable sessions, in-memory auth/parent-link rate limiting, missing public privacy/terms/consent flows, no app-level error tracker or alerting, and a very large dirty integration tree.

The advisory is materially useful, but several claims should be corrected before sharing as a final technical advisory. The largest wording corrections are:

- "Every write" and "entire platform state" should be narrowed. Most legacy writes still lock and rewrite the `app_state` snapshot, but selected auth and student-activity hot paths now have normalized or fast-path tables.
- "Rate limiting does not actually work in production" is too broad. Auth and parent-link limits are in-memory, but AI Tutor capability limits are persisted through the AI governance layer.
- "109 unit-test files" and "41 codex branches" are stale in the current checkout. Current evidence found 79 tracked common test files, 60 Playwright specs, and 39 `codex/*` branches.
- "No observability" should be "no error tracker, alerting, or structured logging beyond Vercel Analytics/default logs." Vercel Analytics is mounted in the root layout.
- Secret-file risk is supported as a local operational risk, not as a Git leak: `All API Keys.docx` and `.env.local` exist locally but are ignored/untracked in this checkout.

Final Codex recommendation: keep the advisory's three-month direction, but publish it with the corrected wording and treat the first release gate as a clean-slice/reviewed-source gate, not a dirty-root deployment gate.

## Scope and Method

Codex inspected source, configuration, workflow, storage/auth/API code, test inventory, live-site headers/metadata, the DOCX/Markdown/XLSX review artifacts, and the A25 dirty-tree release-intake map. No secret values were opened, printed, copied, summarized, staged, or committed. Credential evidence is limited to file existence, ignore status, and redacted operational risk.

Important scope limits:

- The root worktree is dirty and contains many owner/agent changes. This report verifies current local evidence; it does not certify a clean release candidate.
- Vercel private environment variables, database contents, backups, and production admin health checks were not accessed. Production storage/provider state remains unverified except where public HTTP and repo-visible code can support a claim.
- No broad test suite was run because this was a review/reporting task against a dirty integration tree. Counts and source evidence were checked directly.

Baseline release-intake context:

- `npm run release:dirty-map -- --reason "A10 Codex technical review verification baseline" --json` completed successfully.
- The dirty-map snapshot reported 1,460 collapsed status entries, 5,096 expanded entries, 391 tracked modified files, 1 tracked deleted file, 1,068 untracked status entries, and 4,704 untracked files.
- The generated A25 files were written under `coordination/release-intake/`, including `2026-07-06-A25-dirty-tree-map-20260706T060530Z.md` and `.json`.

## Claim Verification Matrix

| Claim or recommendation from review materials | Codex classification | Evidence and correction |
| --- | --- | --- |
| MAIS-MVP is a substantial codebase, not a simple vibe-coded prototype. | Supported | The repo has 7,786 tracked files, 160 `app/api/**/route.ts` files, 60 Playwright specs, a 9,937-line `lib/server/userStore.ts`, an 11,240-line `ThreeDLabCanvas.tsx`, 91 MB under `data/`, and strict TypeScript enabled in `tsconfig.json`. Current line counts are higher than the advisory estimate: about 392k TS/TSX lines in `app/components/lib/types`, about 403k including scripts, and about 462k including `data` and scripts. |
| "Roughly 300,000 lines of strict TypeScript." | Partially supported / stale | The project is clearly large and TypeScript-strict, but current counted scopes exceed 300k. Replace with "hundreds of thousands of TypeScript/TSX lines; current checked scopes range from roughly 392k to 462k depending on whether data/scripts are included." |
| "About 160 API routes." | Supported | `find app/api -name route.ts -type f | wc -l` returned `160`. |
| "109 unit-test files." | Unsupported as current wording | Current tracked common test files counted by `git ls-files '*test.ts' '*test.tsx' '*test.mjs' '*test.js'` returned `79`. The dirty tree has many untracked tests, but the exact advisory number is stale and should be removed or qualified. |
| "60 end-to-end browser test specs." | Supported | `find tests/e2e -name '*.spec.ts' -type f | wc -l` returned `60`. |
| Database uses local SQLite and production Postgres selected by `HK_MATH_STORAGE_PROVIDER`. | Supported from source | `lib/server/userStore.ts` selects `postgres` only when `HK_MATH_STORAGE_PROVIDER` is `postgres`; otherwise SQLite is used. `node:sqlite` and `postgres` are present. Production's actual environment value was not privately verified. |
| Core data lives in one `app_state` snapshot row with projection tables. | Supported | `lib/server/userStore.ts` creates `app_state`, keeps `stateRecordId = "primary"`, and defines 22 `projection_*` table names. Writes update the JSONB `payload`, then sync hot auth/projection tables. |
| "Every write locks and rewrites everything." | Partially supported / overbroad | Legacy `mutateDatabase` in Postgres uses `FOR UPDATE`, reads the snapshot, mutates, writes full JSONB, and syncs projections. However, dedicated fast paths exist for `practice_attempts`, `mistake_book_items`, `adaptive_skill_states`, `learning_events`, `learning_event_clears`, and `reward_point_ledger`. Use "most legacy writes" or "writes through the compatibility store." |
| Local development blob is 77 MB. | Unverified in this pass | The repo contains SQLite/snapshot migration code and the claim may be true for the advisory author's local copy, but Codex did not inspect local DB contents. Keep only if the author can attach the original size evidence. |
| Auth/practice/mistake-book are partially migrated to normalized/hot paths. | Supported with expansion | Auth hot tables are present (`auth_users`, `auth_student_profiles`, `auth_user_settings`, `auth_password_reset_tokens`). Practice/mistake/adaptive/learning-event/reward fast-path tables are defined in `lib/server/practiceAttemptStore.ts`. |
| No schema migration framework. | Supported with nuance | No repo-visible Drizzle/Prisma/Knex/node-pg-migrate migration framework was found. Runtime `CREATE TABLE IF NOT EXISTS`/`ALTER TABLE IF NOT EXISTS` code and `auth_schema_migrations` exist, but this is not a full migration framework or reversible migration discipline. |
| No verified backups. | Supported with nuance | No repo-visible backup schedule/restore drill was found. There is an admin storage export route and `scripts/storage-admin-snapshot-merge.mjs`, but that is a manual export/merge utility, not verified backup/restore coverage. |
| Push CI only installs dependencies; full validation is manual. | Supported | `.github/workflows/ci.yml` runs checkout/setup-node/npm install on push and PR. Type-check, analytics tests, MVP tests, and build run only under `workflow_dispatch` with `full_validation`. |
| Open teacher self-registration. | Supported | `app/api/auth/register/route.ts` blocks only `admin`; `student`, `teacher`, and `parent` are allowed. Teachers are created by selecting `createTeacherUser` when `requestedRole === "teacher"`. |
| Sessions are stateless and cannot be centrally revoked. | Supported | `lib/session.ts` creates an HMAC-signed token with `sub` and `exp`; verification checks signature and expiry only. Logout only clears the cookie. No session table/revocation lookup was found in the session verifier. |
| Auth and parent-link rate limiting are per-instance memory. | Supported | `lib/server/rateLimit.ts` uses a module-scope `Map`. `authRouteGuards.ts` and `app/api/parent/children/link/route.ts` consume it. |
| All rate limiting, including AI, is in-memory/ineffective. | Misleading | AI Tutor uses `consumeAiCapabilityRateLimit` and token quota checks through the AI governance/store layer. Keep the finding for auth/register/password reset/parent linking, but do not describe AI governance limits as only in-memory. |
| No privacy policy or consent flow. | Supported | No app route/page for privacy/terms/consent was found. Live footer and registration-visible public pages did not expose privacy/terms links in the spot-check. |
| No deletion/export path. | Partially supported / overbroad | There is an admin storage export endpoint, analytics export behavior, and a teacher workflow for "Data deletion request." The supported finding is narrower: no complete user-facing privacy policy, consent capture, account deletion/export workflow, or provider data-flow disclosure for real minors. |
| Secret files are in the multi-agent worktree. | Supported, redacted | `All API Keys.docx` and `.env.local` exist locally and are ignored/untracked by Git. This is an operational exposure risk in a folder used by many agents. Do not state that the files are committed or that secret values were verified. |
| No error tracking, structured logs, or alerting. | Supported with wording correction | No Sentry/OpenTelemetry/DataDog/etc. dependency was found. `@vercel/analytics` is installed and `<Analytics />` is mounted in `app/layout.tsx`, so "no observability" should be narrowed to no app-level error tracker, alerting, or structured production logging beyond Vercel defaults/Analytics. |
| 8 `loading.tsx` and 0 `error.tsx` in app. | Supported | Current count: eight `loading.tsx` files and zero `error.tsx` files under `app/`. |
| 62 scattered console statements. | Partially supported | Current count in `app`, `components`, and `lib` excluding tests is 65 `console.*` matches. The exact number drifted, but the qualitative issue is supported. |
| README/live metadata still carry older HK Math Lab/HK P1-S6 wording. | Supported | `README.md` title is `HK Math Lab Template`; `app/layout.tsx` description and live HTML metadata describe "Hong Kong P1-S6 students" while the live title is `MAIS`. |
| 41 `codex/*` branches. | Unsupported as current wording | Current `git branch --all --list 'codex/*' | wc -l` returned `39`. Replace with "dozens of codex branches" or the current count. |
| Live site is deployed on Vercel. | Supported | `curl -I -L https://www.mais.ac` returned HTTP 200 with `server: Vercel`, `x-vercel-cache: HIT`, and a static prerender response. |
| Production uses durable Postgres. | Unverified | Repo code and README describe the Postgres gate and Neon setup, and registration blocks non-durable storage on Vercel. Codex did not inspect private Vercel env or authenticated storage health on production. |
| Adaptive learning is real BKT/guardrail logic, not only LLM prompting. | Supported | `lib/adaptiveLearning.ts` defines mastery/slip/guess/learn probabilities, knowledge components, deterministic candidate generation, hard guard flags, and LLM recommendation validation. The report should preserve this asset in the architecture assessment. |
| Avoid a full rewrite; perform strangler migration and harden the existing system. | Supported | The codebase has real product and learning logic. The risk is primarily storage/ops/security/release discipline, not absence of product implementation. |
| Add migration framework and app-state freeze ADR. | Supported with modification | Choose one migration tool/process, baseline the current runtime DDL carefully, and avoid freezing legitimate hot-path table work. The ADR should freeze new compatibility-store domains while allowing approved normalized fast paths. |
| Replace in-memory auth/parent-link limiters with durable rate limits. | Supported | Auth and parent-link limiters are module-memory. Extend durable governance to auth-sensitive routes or use a shared store/Redis/Postgres limiter. |
| Replace/rewrite all rate limiting including AI. | Supported with modification | Keep AI governance rate limiting if tests prove it persists and scales; prioritize auth/register/password reset/parent-link. |
| Add Sentry or equivalent. | Supported with modification | Sentry is a reasonable default, but the requirement should be "error tracking, alerting, release markers, and redacted structured logs"; another equivalent tool is acceptable. |
| Delete `All API Keys.docx` immediately. | Not supported as an uncoordinated instruction | Current project instructions define it as an owner-approved local credential source for assigned MAIS tasks. The safer recommendation is: migrate production/shared secrets to a password manager and Vercel envs, rotate production keys, then retire/delete the DOCX only after the owner approves the replacement workflow. |

## Recommendations Codex Does Not Support

Codex does not reject the advisory's overall roadmap. The following exact recommendations or implications are not supported as written:

1. Immediate uncoordinated deletion of `All API Keys.docx`. It conflicts with the current owner-approved MAIS-MVP credential workflow. Replace with an A19-owned secret migration, rotation, and retirement plan.
2. Treating all rate limiting as equally absent/ineffective. AI governance rate limiting has a persistent path; the urgent defect is auth/register/password reset/parent linking.
3. Publishing exact stale counts ("109 unit-test files", "41 codex branches", "300,000 lines") without rerunning the inventory. Use current counts or qualitative wording.

## Supported High-Priority Findings

Priority 1: Release and data safety gate

- Do not deploy from the dirty root. Use a clean worktree, reviewed clean slice, clean clone, or pruned staging directory.
- Keep A25 dirty-tree intake and A22 clean-source release gates mandatory until the tree is sliced and reviewed.
- Add CI enforcement for type-check, focused backend/security tests, and build on PR/push or protected-branch merge.

Priority 2: Storage reliability

- Introduce a real migration framework/process and a baseline migration history.
- Freeze new compatibility-store domains and route new write paths into normalized tables.
- Prioritize high-write/high-risk flows: auth/session records, attempts/mistakes, learning events, messages, class/assignment operations, AI governance events.
- Build backup, restore, and restore-drill evidence before real student use.

Priority 3: Security/privacy before minors

- Gate teacher/parent registration through admin approval, invite code, school domain, or another owner-approved flow.
- Add server-side session records and revocation on logout/password change/admin action.
- Replace in-memory auth and parent-link rate limits with durable/shared rate limits.
- Add privacy policy, terms, consent capture, provider data-flow disclosure, account/data export, account deletion/request handling, and student data retention rules.
- Rotate production keys and reduce local secret-file exposure using the owner-approved A19 path.

Priority 4: Observability and operations

- Add error tracking, alerting, release markers, and redacted structured logs.
- Add route-level error boundaries for high-traffic student/teacher/parent surfaces.
- Add staging and smoke tests that prove login, registration gate behavior, AI fallback/live status, dashboard, practice attempt persistence, and storage health.

## Overstatements and Wording Corrections

Suggested corrected wording for the advisory DOCX:

- Replace "roughly 300,000 lines of strict TypeScript" with "hundreds of thousands of TypeScript/TSX lines; current counted scopes range from roughly 392k to 462k depending on whether data and scripts are included."
- Replace "109 unit-test files" with "a sizable node:test suite; current tracked common test-file inventory is 79, and the dirty tree contains additional untracked tests."
- Replace "Every write locks that row, rewrites the entire platform state" with "Most legacy compatibility-store writes lock that row and rewrite the snapshot; selected auth and student-activity hot paths now use normalized or fast-path tables."
- Replace "rate limiting does not actually work in production" with "auth/register/password-reset/parent-link rate limits are module-memory and do not provide a durable cross-instance limit; AI governance has a persistent rate-limit path but should still be load-tested."
- Replace "no observability" with "no app-level error tracker, alerting, or structured production logging beyond Vercel defaults and Vercel Analytics."
- Replace "41 codex branches" with "dozens of codex branches; current count in this checkout is 39."
- Replace "delete `All API Keys.docx`" with "migrate away from local DOCX secrets through an A19-owned owner-approved credential workflow, rotate production keys, then retire the DOCX."
- Replace "no deletion/export path" with "partial admin export and teacher deletion-request workflows exist, but there is no complete user-facing privacy/consent/export/deletion flow for real minors."

## Revised 3-Month Priority Assessment

Week 1:

- Enforce clean-source release discipline and freeze dirty-root deployment.
- Add PR/push CI gate for install, type-check, focused auth/storage/security tests, and build.
- Add Sentry/equivalent or another app-level error tracker with redacted context and release markers.
- Write and approve the storage migration ADR: no new compatibility-store domains; normalized tables for new write paths.
- Start A19 secret migration: inventory variable names only, rotate production keys, move authority away from local DOCX when owner-approved.

Weeks 2-4:

- Add durable auth/session tables and revocation.
- Replace auth/register/password-reset/parent-link rate limits with a shared/durable limiter.
- Add a migration framework and baseline; convert runtime DDL into reviewed migrations.
- Prove backup/restore with a non-production restore drill.
- Gate teacher/parent registration.

Month 2:

- Migrate or harden high-write domains: attempts, mistakes, learning events, class/assignment operations, messaging, AI governance events.
- Add staging smoke tests for storage health, auth, practice persistence, dashboard, and AI fallback/live modes.
- Add high-traffic route error boundaries.
- Publish public privacy/terms/consent/data-flow materials before any real minors use the product.

Month 3:

- Run realistic load tests on staging with seeded school/class data.
- Complete privacy/security hardening and provider DPA/retention checks.
- Slice and retire stale branches/coordination artifacts from release source.
- Only then consider production pilots with real student data.

## Risks Still Unverified

- Production `HK_MATH_STORAGE_PROVIDER`, `POSTGRES_URL`, and authenticated `/api/admin/storage/health` state.
- Whether production backups exist outside the repo and whether restore drills have been performed.
- Whether provider retention/encryption/DPA terms are acceptable for minors in Hong Kong/mainland China/US contexts.
- Whether existing Vercel deployments were built from clean source or dirty/staging slices.
- Current runtime latency and concurrency behavior under school-size load.
- Whether any historical local logs outside this pass exposed real credential values. This pass did not inspect or print secrets.

## Final Codex Recommendation

Publish the advisory only after applying the wording corrections above. The report's core warning is sound: MAIS-MVP is an asset worth preserving, but it needs release discipline, data migration, CI, session/rate-limit hardening, privacy/consent work, and observability before it handles real student data. Codex recommends a staged hardening-and-migration plan over a rebuild.

## Appendix Evidence

Representative evidence gathered during this verification:

- `package.json:2` still names the package `hk-math-lab-template`; `package.json:84-96` includes Next 15, React 19, Framer Motion, Three, Phaser, Postgres, and Vercel Analytics.
- `tsconfig.json:11` enables strict TypeScript.
- `.github/workflows/ci.yml:14-54` shows push/PR install-only snapshot and manual-only full validation.
- `lib/server/userStore.ts:1801-1847` selects storage provider, defines hot auth tables and 22 projection table names.
- `lib/server/userStore.ts:2864-2925` creates `app_state` and runtime auth tables.
- `lib/server/userStore.ts:4471-4604` shows `FOR UPDATE`, read-triggered normalization, full JSONB write, and snapshot mutation flow.
- `lib/server/practiceAttemptStore.ts:28-128` defines normalized fast-path tables for attempts, mistakes, adaptive skill states, learning events, clears, and reward ledger.
- `app/api/auth/register/route.ts:70-76` allows `student`, `teacher`, and `parent`, blocking only `admin`.
- `lib/session.ts:60-91` creates/verifies stateless HMAC session tokens; `app/api/auth/logout/route.ts:12-18` only clears the cookie.
- `lib/server/rateLimit.ts:18-54` uses a module-scope `Map`; `lib/server/authRouteGuards.ts:71-85` consumes it for auth routes.
- `app/api/ai-tutor/resolve/route.ts:1935-1973` uses persistent AI governance rate-limit checks.
- `app/layout.tsx:14-19` uses title `MAIS` with old HK P1-S6 description and mounts Vercel Analytics when in Vercel.
- `README.md:1-3` still describes "HK Math Lab Template"; `README.md:80` documents admin storage export; `README.md:88` claims a prior Neon production gate but this pass did not verify private environment state.
- `.gitignore:53-60` ignores `.env`, `.env.*`, and `All API Keys.docx`; both files exist locally but are untracked in this checkout.
- Live `curl -I -L https://www.mais.ac` returned HTTP 200 from Vercel with static prerender/cache headers.
- Current inventory commands returned: 160 API routes, 60 Playwright specs, 7,786 tracked files, 39 `codex/*` branches, 8 loading boundaries, 0 error boundaries, and 65 non-test `console.*` matches in `app/components/lib`.
