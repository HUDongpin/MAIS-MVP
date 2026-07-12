# S19 Database Provider Assessment - Neon vs Supabase for www.mais.hk

Date: 2026-06-22 23:04 HKT  
Scope: S19 provider/env assessment, consuming S22 deployment evidence.  
Secret policy: no database URL, token, key, Vercel secret value, org ID, project ID, or credential value was recorded.

## Executive Decision

Recommendation: keep Neon for now; do not switch to Supabase or another provider solely because of stability concerns.

Reason: the current evidence does not show a Neon outage or provider-level instability. `www.mais.hk` is live on Vercel, required production env variable names passed S22 release preflight, the public site/API are reachable, and public provider status pages are green. The missing proof is not "Neon is bad"; it is that MAIS has not yet recorded authenticated production storage health, project-level DB latency, Postgres error rate, or live classroom write stability after the latest deployment.

The best next move is an S19/S12/S11 redacted production DB smoke and a short monitor window, not an immediate migration.

## Current MAIS Evidence

| Evidence | Result | Meaning |
| --- | --- | --- |
| S22 deployment report | Production aliases `https://mais.hk` and `https://www.mais.hk` confirmed; type-check, build, runtime/env/publish preflights passed | Production release is live and required env variable names were present, but this does not prove DB health |
| S22 deployment report | Full Playwright and live browser smoke were not run | Authenticated storage stability remains unverified |
| `.env.local.example` | Production durability depends on `HK_MATH_STORAGE_PROVIDER=postgres` and server-only `POSTGRES_URL` | Provider switch is not needed if current Postgres env is healthy |
| `next.config.ts` | No explicit function region config found | California performance may depend on default Vercel function placement, not just DB provider |
| Public probe | `www.mais.hk` and `mais.hk` returned HTTP 200 with Vercel cache HIT | CDN/static entry is reachable |
| Public probe | Anonymous `/api/admin/storage/health` returned HTTP 401 | Health endpoint is reachable, but admin auth is required to prove durable Postgres readiness |
| Public probe | `/api/questions?limit=1` returned HTTP 200 | Public API is reachable; this is not enough to prove production DB write stability |

## Provider Comparison

| Question | Neon | Supabase |
| --- | --- | --- |
| Core identity | Serverless Postgres platform | Postgres plus backend-as-a-service platform |
| Best fit | Vercel/Next.js apps that want Postgres, autoscaling, pooling, and branching | Apps that want integrated Auth, Storage, Realtime, Edge Functions, RLS workflows, and dashboard-first backend ops |
| Serverless fit | Strong: autoscaling, scale-to-zero model, connection pooling, database branching | Good: direct Postgres plus Supavisor connection pooler; broader platform footprint |
| Region fit for California | US West options include AWS `us-west-2` and Azure West US 3 in Neon docs | Supabase status/docs include `us-west-1`, which is North California |
| Vercel workflow | Very strong due Neon branching/preview-database workflow | Good, but migration is larger if MAIS does not need Supabase Auth/Storage/Realtime |
| Operational maturity | Strong for serverless Postgres, but project-level health still needs monitoring | Strong product platform; more moving parts because the platform includes Auth, Storage, Realtime, etc. |
| Migration risk from current MAIS | Low if staying; migration away requires data export/import, env switch, smoke, rollback plan | Medium: Postgres-compatible, but operational model and optional platform services can pull architecture changes |
| Main risk for MAIS | Cold-start/autosuspend settings, region mismatch, and current app storage-model contention | Vendor/platform lock-in if adopting Auth/Storage/Realtime; migration work may not solve current storage verification gaps |

## Stability Assessment

Current public provider state as of 2026-06-22:

- Neon public status page indicates all systems operational in the web view used for this assessment. Local JSON API polling to `status.neon.tech` returned Cloudflare 522, so this report does not store a direct Neon API snapshot.
- Supabase Status API reports `All Systems Operational`; Database, Connection Pooler, and `us-west-1` compute capacity are operational. Supabase also lists scheduled platform maintenance on 2026-06-26 03:00-04:00 UTC.

This is not enough to rank one provider as universally "more stable." Both appear operational now. For MAIS, the decisive stability data should be gathered from the production app:

- authenticated admin storage health;
- login/session persistence;
- teacher assignment write/read;
- student practice attempt write/read;
- p50/p95 latency from California;
- Postgres connection errors/timeouts;
- backup and restore rehearsal evidence.

## California + Vercel Recommendation

For California students and teachers, optimize the path:

Browser in California -> Vercel CDN/Edge -> Vercel Function region -> Postgres primary region.

The CDN is already global; database-backed actions are constrained by the function-to-database hop. If Vercel functions default to the US East while the database is in US West, the app can feel slow even if the database provider is healthy.

Preferred next configuration path:

1. Confirm current Neon project region without exposing project IDs or connection strings.
2. If Neon is US West, pin database-heavy Vercel functions to a US West region where supported and smoke from California.
3. If Neon is not US West and California is the priority market, either move/restore Neon to US West or evaluate Supabase `us-west-1`.
4. Only migrate providers after measured latency or reliability data proves region/provider is the bottleneck.

## "Best Provider" Answer

There is no single universally accepted "best database service provider."

- For enterprise managed database credibility and operational depth: AWS RDS/Aurora PostgreSQL is the conservative benchmark.
- For Vercel serverless Postgres: Neon is one of the best-fit choices.
- For full app backend platform: Supabase is often the better product if the app wants Auth, Storage, Realtime, RLS-first workflows, and an integrated admin dashboard.
- For MAIS today: Neon remains the better default unless authenticated production smoke or California latency data proves otherwise.

## Decision Gate Before Switching

Switch from Neon only if at least one of these is proven:

1. Neon project has repeated production incidents affecting MAIS, not just public-region noise.
2. California p95 database-backed action latency remains unacceptable after Vercel/database region alignment.
3. MAIS needs Supabase-native Auth/Storage/Realtime/RLS enough to justify platform migration.
4. Neon cost/quotas/backups/HA limits block the upcoming school pilot.
5. A tested rollback/data migration plan exists and S11/S22 release gates are green.

## Sources

- Neon Status: https://neonstatus.com/
- Neon Regions: https://neon.com/docs/introduction/regions
- Neon Branching: https://neon.com/docs/introduction/branching
- Neon Autoscaling: https://neon.com/docs/introduction/autoscaling
- Neon Connection Pooling: https://neon.com/docs/connect/connection-pooling
- Supabase Status API/page: https://status.supabase.com/
- Supabase Regions: https://supabase.com/docs/guides/platform/regions
- Supabase Postgres connections and pooler: https://supabase.com/docs/guides/database/connecting-to-postgres
- Supabase Read Replicas: https://supabase.com/docs/guides/platform/read-replicas
- Vercel Function Regions: https://vercel.com/docs/functions/configuring-functions/region
- AWS RDS: https://aws.amazon.com/rds/
- DB-Engines Ranking: https://db-engines.com/en/ranking
