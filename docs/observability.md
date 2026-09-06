# Error observability and storage health

This package integrates browser error intake and optional server-side delivery. It preserves
the source observability work's Sentry envelope/webhook support, rate budgets, and Next `after()`
delivery scheduling while replacing text-based redaction with fixed classifications.

## Current scope

- `ClientErrorReporter` listens for browser errors and unhandled promise rejections. The layout
  mounts it when a monitoring destination is present in server configuration; no destination
  value is exposed to the browser. The existing request-bound bootstrap remains unchanged.
- The current three-language global error page reports through the same browser policy. Its
  UI still hides diagnostic and account details, including exception digest and raw message.
- `/api/observability/client-error` accepts bounded, anonymous, same-origin browser reports.
- `/api/observability/test-error` is an explicitly enabled, authenticated delivery probe.
- `/api/health` consumes the existing strict storage-readiness entrypoint and reports a
  bounded public status; explicitly authenticated cron requests may also drive health alerts.
- Six server capture hooks observe unexpected failures at the shared auth JSON boundary,
  the Edge tutor and resolver boundaries, and the strict full PostgreSQL writer. They use
  the existing monitor without changing request, cancellation or storage contracts.

## Server capture boundaries

The six hooks cover the following boundaries. A hook observes a caught, unexpected failure;
it does not turn an ordinary returned error result into a new exception or monitoring event.

| Hook | Current boundary | Existing outcome retained |
| --- | --- | --- |
| Auth | The catch in `withAuthRouteJsonBoundary` in `lib/server/authRouteGuards.ts` | HTTP 503 with the original body and private no-store browser/CDN headers. |
| Edge tutor, buffered | The active resolver-transport catch in `app/api/ai-tutor/route.ts` | HTTP 503; completed resolver HTTP error responses keep their original forwarding behavior. |
| Edge tutor, streamed | The active resolver-transport catch in the same route | Outer SSE HTTP 200, followed by `final.status=503` and `ok=false`. |
| Resolver, buffered | The outer unexpected-handler catch in `app/api/ai-tutor/resolve/route.ts` | HTTP 503 with the existing fallback body. |
| Resolver, streamed | The outer unexpected-handler catch in the same resolver | Outer SSE HTTP 200, followed by `final.status=500` and `ok=false`. |
| PostgreSQL full writer | The observation catch around the current `writePostgresDatabaseWith` body in `lib/server/userStore.ts` | The identical error object is rethrown; transaction failure and rollback behavior remain with the caller. |

Tutor event `status` describes the logical final result. For a stream, it is not the outer
HTTP 200 that establishes the SSE transport. The phase distinguishes buffered and streamed
failures; monitoring does not change either response to match an old telemetry status.

One auth hook serves nine current route callers through a fixed mapping:

| Caller label | Canonical route |
| --- | --- |
| `auth-me` | `/api/me` |
| `auth-password-change` | `/api/auth/password-change` |
| `auth-login` | `/api/auth/login` |
| `auth-logout-all` | `/api/auth/logout-all` |
| `auth-password-reset-request` | `/api/auth/password-reset/request` |
| `auth-password-reset-confirm` | `/api/auth/password-reset/confirm` |
| `auth-register` | `/api/auth/register` |
| `auth-session-state` | `/api/auth/session-state` |
| `auth-logout` | `/api/auth/logout` |

Unknown labels remain `unknown`. This mapping does not accept caller-selected paths, user IDs,
query strings or arbitrary auth subpaths. Existing returned 400/401/403/409/429 outcomes do
not trigger the auth catch. The private cache boundary applies to success and failure alike.

Tutor capture is suppressed once the stream is closed, the incoming request is aborted, or
the local work/transport signal is aborted. Consumer cancellation and deadline aborts retain
their existing cleanup and result handling. Expected-user conflicts remain ahead of policy,
rate limits and writes. Guest handling, invalid input, policy denial, rate rejection, bounded
admission-unavailable responses and normal provider fallback do not acquire new capture
paths. The resolver's inner provider-fallback catch is outside these six hooks.

The datastore hook wraps only the strict full writer body. It retains the existing storage
mutation capability, state identity and previous-revision predicates, `UPDATE`/`RETURNING`
validation, hot-auth/projection synchronization, final locked reread and readiness-marker
advance. It does not bootstrap storage, add a readiness probe, capture the earlier capability
acquisition, or cover every partial writer. Its operation label is `app_state-update`;
PostgreSQL failures use the shared fixed classifier rather than an arbitrary code-derived tag.

Hooks do not await transport. A synchronous capture failure or an asynchronous delivery
failure must leave the product response or original SQL exception unchanged. Next `after()`
scheduling and its caught fallback remain best effort: there is no durable queue or guaranteed
delivery. A datastore failure may also reach a downstream catch and be observed there. The
existing per-instance send budgets are not deduplication across hooks or across a fleet.
Adding these capture sites does not certify a configured monitoring service or deployment.

## Wire privacy contract

The shared `lib/observability/errorPolicy.ts` module emits fixed failure categories such as
`chunk-load-failed`, `network-failed`, `hydration-failed`, `request-timeout`, and
`postgres-statement-timeout`. A recognized runtime prefix never permits its arbitrary suffix
to pass through. Unknown errors become `unhandled-error`; unknown class names become `Error`.

Routes are fixed known paths or known family buckets such as `/teacher/[path]` and
`/lesson/[path]`. Query strings, fragments and dynamic path segments are not included. Raw
stack traces are intentionally dropped: stack symbols and path components can contain user
input or account identifiers. Release, route family, class and category remain diagnostic
signals. This trades exact stack/message detail for a smaller, reviewable telemetry contract.

Browser normalization happens before the same-origin POST. The server normalizes again, and
the transport independently filters manually constructed events. Client input cannot choose
server scope, arbitrary tags, extra values or a monitoring destination. Server contexts accept
only known label values, finite bounded numeric operational facts and the designated boolean
readiness field. No request body, cookies, headers, user object, account ID or source text is
attached to an event.

Classification labels are telemetry supplied by the reporting code. A forged anonymous report
can select an allowed category; it cannot establish that a server fault occurred. Keep client
and server scope distinct when interpreting events.

## Intake and browser limits

Intake requires the exact `application/json` MIME essence. Parameters such as `charset=utf-8`
are accepted; `text/plain; hint=application/json` is not. A supplied Origin must equal the
request URL's origin, and supplied Fetch Metadata must say `same-origin`. At least one of
those same-origin signals is required. These checks reduce cross-site browser submission;
they are not authentication against a caller able to forge request headers.

The request body is read incrementally up to 8 KiB. An oversized declared Content-Length is
rejected early, but the actual stream size is always checked. Oversized streams are cancelled;
malformed JSON, invalid UTF-8, non-object input and capture failures are silently dropped.
Every intake outcome returns HTTP 204 with `Cache-Control: no-store` and an empty body.

Intake has an instance-wide 120-request/minute budget before its 20-request/15-minute per-IP
budget. IP bucket keys are hashed and are not attached to events. Header rotation cannot bypass
the instance-wide budget. Instances do not share these in-memory counters.

The browser sends at most five distinct normalized reports per document and deduplicates them
by safe payload. Listener cleanup removes both handlers. Remounts do not reset the document
budget. Sending a report or handling a failed send does not throw into the application.

## Optional delivery configuration

Configuration is server-only and remains under the normal A19 environment custody. No real
credential values belong in this document, source, reports or test logs.

| Variable | Purpose |
| --- | --- |
| `SENTRY_DSN` | Sentry DSN; a valid DSN takes precedence over the webhook. |
| `ERROR_MONITOR_WEBHOOK_URL` | HTTP(S) JSON event receiver when no valid DSN is configured. |
| `ERROR_MONITOR_ENVIRONMENT` | Optional deployment label; defaults to Vercel/Node environment. |
| `ERROR_MONITOR_RELEASE` | Optional release label; otherwise the deployment commit prefix. |
| `ERROR_MONITOR_SERVER_NAME` | Optional server/region label. |
| `ERROR_MONITOR_TIMEOUT_MS` | Bounded delivery deadline; default 4000 ms. |
| `ERROR_MONITOR_MAX_EVENTS_PER_MINUTE` | Per-instance sending budget, independently allocated to browser and server events; default 60 each. |
| `OBSERVABILITY_TEST_ERROR_ENABLED` | Must be exactly `true` to enable the deliberate-error probe. |
| `CRON_SECRET` | Required bearer credential for that probe. |

No valid destination means `not-configured` and zero external sends. A root error can still
send a sanitized same-origin intake request when the external destination is absent; “not
configured” does not mean the browser can never make an internal POST. HTTP(S) destinations
are owner-controlled configuration, not caller-supplied URLs; use HTTPS for real delivery.

Transport results distinguish `sent`, `failed`, `not-configured`, and `rate-limited`. HTTP
failures, thrown fetch errors and aborts return bounded result codes; they do not alter product
responses. Capture hands work to Next `after()` so request completion does not immediately
discard it. Outside a request scope it falls back to a caught inline promise. This is
best-effort delivery, not a durable queue or delivery guarantee.

## Deliberate-error probe

The probe returns 404 unless both its explicit switch and exact bearer authentication pass,
on every runtime, including self-hosted production. There is no Vercel-only authorization
exception. Its result contains the channel, bounded delivery status and event reference, not
configuration values or transport diagnostics. Probe results are no-store.

An authenticated invocation can send a real event to the configured destination. Offline
tests inject the report operation instead. Shipping this source, configuring a destination,
invoking the probe, and accepting a deployment are separate actions; a test receipt is not
proof that an external monitoring account received a real event.

## Strict storage health

`GET /api/health` uses the existing `getStorageReadinessSnapshot({ includeDiagnosticsCounts:
false })` contract. It does not add a second datastore probe, initialize storage, read an
application-state payload, or request diagnostic counts. PostgreSQL readiness continues to
come from the main catalog/trigger/revision-marker/hot-auth checks. SQLite readiness reflects
the existing configured-path posture; this endpoint is not an independent durability or
mounted-volume certification.

A well-formed durable-ready snapshot returns HTTP 200. Missing, malformed, unknown,
contradictory, or non-durable production snapshots return HTTP 503 with `status: "degraded"`.
Public responses contain only `status`, `storageReady`, and bounded `checkedInMs`. All responses
set browser and edge no-store headers. Raw readiness objects, paths, messages, diagnostics,
recipient addresses, destinations and credentials are never returned.

The only non-durable healthy exception requires **all** of: explicit
`HEALTH_CHECK_ALLOW_LOCAL_DEMO=true`, `NODE_ENV=development` or `test`, no Vercel runtime or
environment marker, and a valid local SQLite demo-only snapshot with no configured path or
temporary-deployment fallback. It remains `storageReady:false`. The flag cannot make a
production or preview demo healthy.

The reader keeps one underlying readiness promise per handler instance. Anonymous reads use a
10-second completed-result cache. Trusted reads bypass completed cache, while all readers
join an existing in-flight probe. The public probe deadline defaults to 5000 ms and is bounded
by `HEALTH_CHECK_TIMEOUT_MS` to 500–20000 ms. If the underlying promise ignores its deadline,
the same single latch remains owned until it settles: later requests immediately receive the
bounded degraded timeout result, and no extra background probe is started. A late result
releases the latch but cannot replace the already published timeout with stale success.

## Health alert authority and configuration

Only an exact `Authorization: Bearer <CRON_SECRET>` header is trusted. `CRON_SECRET` must be
explicitly configured as a nonempty, whitespace-free value on **every** runtime. Missing or
invalid configuration, a login cookie, local development, self-hosted production, and absent
Vercel flags never grant trust. Anonymous callers can read health status but cannot send an
email/webhook, alter alert state, or consume the shared server-error-monitor budget. Health
alerting is a separate transport and does not call `captureServerError`.

| Variable | Health purpose |
| --- | --- |
| `CRON_SECRET` | Explicit cron bearer credential for details and alert dispatch. |
| `HEALTH_CHECK_TIMEOUT_MS` | Probe response deadline, default 5000 ms, bounded 500–20000 ms. |
| `HEALTH_CHECK_ALLOW_LOCAL_DEMO` | Exact local-only demo exception described above; default off. |
| `RESEND_API_KEY` | Existing shared Resend key; this variable may serve other Resend uses. A key alone never enables health email. |
| `HEALTH_ALERT_FROM` | Required valid bare sender address or `MAIS Ops <address>` / `MAIS Health <address>`. |
| `HEALTH_ALERT_EMAIL_TO` | Required comma-separated list of 1–10 unique valid recipient addresses. |
| `HEALTH_ALERT_WEBHOOK_URL` | Explicit HTTPS destination, used when no health email fields are supplied. Userinfo, fragments, control/space characters, malformed URLs and URLs over 2048 characters are rejected. |
| `HEALTH_ALERT_TIMEOUT_MS` | Whole alert transport/cancellation deadline, default 8000 ms, bounded 1000–30000 ms. |
| `HEALTH_ALERT_REPEAT_MS` | Repeat-down interval, default 30 minutes, bounded 1 minute–24 hours. |

Resend takes precedence only with the shared key **and** valid health-specific sender and
recipient fields. Partial or invalid health-email configuration fails closed without falling
through to a webhook. With no health-email fields, a valid explicit webhook may be used even
when another feature uses the shared Resend key. No valid health destination means zero
external health sends. Configuration remains A19-owned; this package does not read, migrate or
change real environment values.

Alert bodies contain only fixed health event/category/posture/provider labels, allowlisted
deployment environment/region labels, a bounded hexadecimal release prefix, a readiness
boolean and bounded timing. Unknown labels become fixed `unknown`/`unclassified` values, even
when a caller manually constructs a snapshot. Regions currently recognized by this health
payload are `sin1`, `pdx1`, `iad1`, `fra1`, `hnd1`, and `syd1`; other region values become
`unknown` without changing health status. Sender and recipients are intentional email routing
configuration, not diagnostic fields.

Delivery uses one POST with redirects forbidden and browser credentials omitted. Unused
response bodies are cancelled on success and failure, including responses arriving after a
deadline. The deadline also covers cancellation; abort-ignoring transport/cancellation cannot
hold a response forever. The instance dispatcher retains one unsettled raw transport latch
after timeout, so later trusted requests stay bounded without accumulating sends. HTTP 2xx
acknowledgement is treated as `sent`; it is not an inbox-delivery guarantee.

The dispatcher shares concurrent identical alerts, serializes changes, and keeps at most one
latest queued observation while a send is running. An observed recovery waits behind the
active down send; a failed older send cannot roll back a newer successful state. Only a
successful send commits the alert state and repeat window. Failed or unconfigured down sends
remain retryable; a failed recovery retains the prior down state and is retried on a later
healthy observation. Recovery is relative to an outage notification that was successfully
sent. Intermediate flaps may coalesce into the latest queued observation.

These caches, latches and dedupe states are per-instance, best effort, and not a fleet-wide
budget or durable alert queue. Alert failure does not change the storage health response.
The route declares a 120-second platform execution ceiling for the bounded probe and at most
two serialized alert waits; release validation must still confirm the deployed platform
configuration. This source does not prove any live monitoring or email delivery.

`vercel.json` adds `/api/health` on a five-minute cron and preserves `sin1`, existing headers,
`/api/warm`, teacher-notice email, and Resend webhook-maintenance crons. Vercel cron trust
requires its explicitly configured `CRON_SECRET`; adding the schedule is not a deployment or
live-alert acceptance receipt. `/api/health/teacher-notices` remains unchanged.

## Offline verification

```sh
node scripts/run-observability-tests.mjs
npx tsc -p tsconfig.observability.json
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_PORT=3088 \
  PLAYWRIGHT_RUN_ID=observability-fixture \
  npx playwright test tests/e2e/observability.spec.ts \
  --project=desktop-chrome --project=mobile-chrome
```

The focused runner constructs a minimal child environment from operational path/locale/temp
keys, forces test mode, disables tsx caching, and injects a fail-closed global fetch guard.
Provider, monitoring, health, cron, credential and arbitrary NODE_OPTIONS values are not
inherited. Tests use explicitly injected transports and synthetic inputs. Use a task-owned
external TMPDIR for verification; the runner does not create or remove a compiled `.tmp` tree. The browser suite fulfills every URL locally and loads the exact shared
policy/controller into a real browser Window; it checks outgoing requests, deduplication,
the five-report cap and cleanup without invoking an application or external endpoint.

The browser fixture validates the controller, not a production deployment or the full app
bootstrap. Type/import checks and the repository's applicable build, CI and home/identity
regressions must bind to the final integrated commit separately. The storage implementation
and strict PostgreSQL readiness contract remain unchanged; the general health endpoint
consumes that contract through its bounded reader.
