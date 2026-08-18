# Production observability

Until this landed, a live incident at mais.ac — a tripped tutor breaker, a Postgres write
timeout, a broken build shipping a render crash — was discovered by a student or not at all.
This document describes what now watches production, how to turn it on, and how to verify it.

Three pieces, all off by default and no-ops when their environment variables are absent:

| Piece | Code | Turned on by |
| --- | --- | --- |
| Error monitoring | `lib/server/errorMonitor.ts` | `SENTRY_DSN` or `ERROR_MONITOR_WEBHOOK_URL` |
| Uptime probe + alerting | `lib/server/healthCheck.ts`, `app/api/health/route.ts` | `HEALTH_ALERT_EMAIL_TO` (+ `RESEND_API_KEY`, `HEALTH_ALERT_FROM`) or `HEALTH_ALERT_WEBHOOK_URL` |
| Product analytics | `@vercel/analytics` in `app/layout.tsx` (pre-existing) | Vercel project setting |

## Why not `@sentry/nextjs`

The Sentry SDK is the default answer and was rejected deliberately:

- It adds a build-time webpack plugin and ~20 transitive packages to a dependency tree that
  is kept deliberately small (13 runtime dependencies today), and the plugin wants a Sentry
  auth token in CI to upload source maps — a new secret and a new build failure mode.
- Its default instrumentation attaches request bodies, headers and cookies to events. This
  platform holds data belonging to minors; the payloads it would attach are exactly the ones
  that must never leave the box. Turning that off is a configuration exercise repeated on
  every SDK upgrade.

`lib/server/errorMonitor.ts` is one dependency-free module that speaks Sentry's public
envelope protocol, so `SENTRY_DSN` alone points it at a real Sentry project and you get the
Sentry UI, grouping, alerting and retention. What is given up: automatic breadcrumbs,
performance tracing, and source-map symbolication of client stacks. If those become worth
having, the SDK can be adopted later without changing any call site — every capture goes
through `captureServerError`.

## Privacy contract

This is the part to read before adding a capture.

- **Tags and extras are default-deny.** `scrubErrorMonitorEvent` (the `beforeSend` filter)
  drops any key not listed in `allowedTagKeys` / `allowedExtraKeys`. Passing
  `extra: { childName }` does not leak the name; the key is simply not transmitted.
- **Free text is redacted, then truncated.** Messages and the first few stack frames run
  through every rule in `redactionRules`: e-mail addresses, URL credentials
  (`postgres://user:pass@…`), `token=` / `password:` / `cookie:` pairs, bearer tokens, JWTs,
  any opaque string of 32+ characters, URL query strings, digit runs of 7+, home-directory
  paths in stack frames, quoted runs over 40 characters (echoed request bodies), and CJK runs
  of 2+ characters (student and parent names, tutor conversation text). Messages are capped
  at 240 characters.
- **Nothing is captured by default.** Captures are explicit calls at four boundaries (below).
  There is no request middleware harvesting traffic.
- **Health alerts carry no user-derived data at all** — only status, failure kind, timings,
  environment, release and region.

`lib/server/errorMonitor.test.ts` and `lib/server/healthCheck.test.ts` enforce all of the
above, including asserting on the exact bytes handed to `fetch`. Run them with:

```bash
npm run test:observability
```

They are part of `npm run check`.

## What is instrumented

| Boundary | File | Tags |
| --- | --- | --- |
| Every auth/JSON API route | `lib/server/authRouteGuards.ts` → `withAuthRouteJsonBoundary` | `scope=auth-route`, `route`, `kind`, `status=503` |
| AI tutor (buffered + streamed) | `app/api/ai-tutor/resolve/route.ts` | `scope=ai-tutor`, `route`, `phase=buffered\|stream` |
| AI tutor edge hop | `app/api/ai-tutor/route.ts` | `scope=ai-tutor`, `kind=edge-resolver-unreachable` (deadline aborts are not reported — they are expected and already measured; this hop runs on the Edge runtime, so it reports only where the platform exposes the monitoring env vars to Edge functions) |
| Durable write path | `lib/server/userStore.ts` → `writePostgresDatabaseWith` | `scope=datastore`, `kind=postgres-*`, `operation=app_state-upsert` |
| Browser crashes | `components/observability/ClientErrorReporter.tsx`, `app/global-error.tsx` → `app/api/observability/client-error/route.ts` | `scope=client`, `route=<pathname>`, `source=window.onerror\|unhandledrejection\|global-error-boundary` |
| Health probe failures | `app/api/health/route.ts` | `scope=health`, `kind=<failure kind>` |

Server captures are fire-and-forget (`captureServerError`): they never add latency to a
failing request and never throw. The client reporter sends at most 5 reports per page load
with duplicate signatures collapsed, and `/api/observability/client-error` is rate limited to
20 reports per IP per 15 minutes with an 8 KB body cap. On top of that, each lambda ships at
most `ERROR_MONITOR_MAX_EVENTS_PER_MINUTE` (default 60) events per minute, so a crash loop
cannot become an egress bill.

## Setup

1. **Create the destination.** Either a Sentry project (Next.js platform; copy its DSN) or an
   endpoint that accepts a JSON POST.
2. **Set the environment variables** in Vercel for Production *and* Preview:

   ```
   SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
   # or
   ERROR_MONITOR_WEBHOOK_URL=https://hooks.example/errors
   ```

   Optional: `ERROR_MONITOR_ENVIRONMENT` (defaults to `VERCEL_ENV`), `ERROR_MONITOR_RELEASE`
   (defaults to the 12-character commit SHA), `ERROR_MONITOR_TIMEOUT_MS`,
   `ERROR_MONITOR_MAX_EVENTS_PER_MINUTE`.

3. **Turn on uptime alerting**, either by e-mail (reuses the Resend account already used for
   password reset):

   ```
   RESEND_API_KEY=...
   HEALTH_ALERT_FROM=MAIS Ops <ops@your-domain>
   HEALTH_ALERT_EMAIL_TO=owner@your-domain,oncall@your-domain
   ```

   or by webhook: `HEALTH_ALERT_WEBHOOK_URL=https://hooks.example/health`.

4. **Set `CRON_SECRET`** (if it is not already set). Vercel sends it as
   `Authorization: Bearer $CRON_SECRET` on cron invocations. `/api/health` only dispatches
   alerts and returns deployment detail for requests carrying it; anonymous callers get
   status only. Without a configured secret, any caller is treated as trusted — acceptable
   locally, not in production.

5. **Point an external uptime monitor** (Better Stack, Pingdom, UptimeRobot — anything) at
   `https://<domain>/api/health` as a second, off-platform pair of eyes. It returns 503 when
   durable storage is unreadable, which is what such monitors alert on. A Vercel cron cannot
   tell you that Vercel itself is down.

All variables are listed in `.env.local.example`.

## `/api/health` vs `/api/warm`

They look similar and are not interchangeable.

- `/api/warm` exists to keep a lambda and its Neon connection hot. It swallows every failure
  and always returns 200 — a keep-alive that alarms is a bad keep-alive.
- `/api/health` exists to notice failure. It probes durable storage under a hard timeout
  (`HEALTH_CHECK_TIMEOUT_MS`, default 5 s — a hung connection counts as down), returns 503
  when storage is unreadable, captures the failure to the error monitor, and dispatches an
  alert.

Both run on the `*/5 * * * *` cron in `vercel.json`.

### What counts as "down"

Only a Postgres deployment can be down in the sense worth paging for: there the readiness
probe actually verifies the `app_state` table, so a false `durableReady` means Neon is
unreachable, unconfigured or refusing reads — the endpoint answers 503 and alerts, with the
store's own reason (`postgres-unavailable`, `missing-postgres-url`) as `failureKind`.

On a SQLite deployment the same flag reports *posture*, not health: `demo-only` simply means
`HK_MATH_DB_PATH` is unset. That is a deployment choice, so the endpoint answers 200 with
`provider: "sqlite"`, `posture: "demo-only"`, `storageReady: false` — visible in the payload,
never paged on. An endpoint that alerts every five minutes on a dev deployment gets muted
within a day, which is the failure mode this avoids. A thrown or timed-out probe is degraded
on any provider.

## Alert behaviour

`evaluateHealthAlert` deduplicates: one alert when the check starts failing, silence while it
keeps failing, a repeat every `HEALTH_ALERT_REPEAT_MS` (default 30 minutes) if it is still
down, and exactly one "recovered" notice when it comes back.

The dedupe state lives in lambda memory. Vercel may run each cron invocation on a fresh
instance, in which case every failing run alerts. That is the intended failure mode for an
alerting path — over-deliver rather than go silent — but it means "I got five identical
alerts" is expected during a long outage, not a bug. Durable dedupe would need a shared
store; it is not worth a write to the datastore that may be the thing that is down.

## Verifying the pipeline

On a preview deployment, with `CRON_SECRET` and a monitoring destination set:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<preview-url>/api/observability/test-error | jq
```

The probe throws a real error, ships it through the normal capture path and reports what the
transport did:

```json
{
  "probe": "error-monitor",
  "channel": "sentry",
  "environment": "preview",
  "release": "07e993f04412",
  "delivery": "sent",
  "eventId": "…32 hex chars…",
  "httpStatus": null,
  "errorCode": null
}
```

`delivery: "sent"` means the monitor accepted the event; search that `eventId` in Sentry and
confirm the `route` tag reads `/api/observability/test-error`. Other values:
`not-configured` (no DSN or webhook in this environment), `rate-limited` (this lambda already
hit its per-minute budget), `failed` with `httpStatus`/`errorCode` (bad DSN, wrong project,
network refused).

The probe 404s unless `CRON_SECRET` is set *and* presented, so it is inert on a deployment
that has not configured it.

Health check:

```bash
curl -sS -i https://<preview-url>/api/health
curl -sS -H "Authorization: Bearer $CRON_SECRET" https://<preview-url>/api/health | jq
```

The authenticated form returns the deployment detail:

```json
{
  "status": "ok",
  "storageReady": true,
  "checkedInMs": 41,
  "provider": "postgres",
  "posture": "durable-ready",
  "environment": "production",
  "release": "07e993f04412",
  "region": "pdx1"
}
```

To rehearse an alert, point the deployment at an unreachable `POSTGRES_URL` in a scratch
preview: the endpoint answers 503 with `failureKind`, an alert is dispatched, and restoring
the URL produces a single "recovered" notice.

## Runbook

- **Error volume spikes after a deploy** — group by the `release` tag in Sentry; the release
  is the commit SHA, so the offending change is one `git log` away.
- **`kind=postgres-quota` / `postgres-connect-timeout` on `scope=datastore`** — Neon is
  refusing writes. Every mutation in the product goes through that upsert, so treat it as a
  full outage, not a slow path.
- **`scope=client` spike on one route** — a render crash reaching `app/global-error.tsx`.
  The `route` tag is the pathname; reproduce there first.
- **Alerts stop arriving entirely** — check that the cron still runs (Vercel → Cron Jobs) and
  that `/api/health` answers. A silent monitor and a healthy system look identical from the
  outside; the external uptime monitor from step 5 is what distinguishes them.

## Not covered here

Backups and restore (the datastore is still a single row; see item 11 of the audit) and
product-funnel analytics beyond `@vercel/analytics` page views. Conversion questions —
parent sign-up rate, Google mis-roling — need explicit funnel events, which are deliberately
out of scope for a change whose privacy contract is "ship nothing user-derived".
