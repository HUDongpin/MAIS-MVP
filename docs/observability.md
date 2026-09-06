# Error observability

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
- `captureServerError` is available for later integration with existing auth, AI Tutor and
  datastore boundaries. Those hooks, general storage health, uptime alerts and new crons are
  not introduced by this package.

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

## Offline verification

```sh
node scripts/run-observability-tests.mjs
npx tsc -p tsconfig.observability.json
PLAYWRIGHT_SKIP_WEBSERVER=1 PLAYWRIGHT_PORT=3088 \
  PLAYWRIGHT_RUN_ID=observability-fixture \
  npx playwright test tests/e2e/observability.spec.ts \
  --project=desktop-chrome --project=mobile-chrome
```

The focused runner removes monitoring/probe/alert secrets from its child environment. Tests
use injected fetch/schedulers and synthetic inputs. The runner does not create or remove a
compiled `.tmp` tree. The browser suite fulfills every URL locally and loads the exact shared
policy/controller into a real browser Window; it checks outgoing requests, deduplication,
the five-report cap and cleanup without invoking an application or external endpoint.

The browser fixture validates the controller, not a production deployment or the full app
bootstrap. Type/import checks and the repository's applicable build, CI and home/identity
regressions must bind to the final integrated commit separately. Existing health and strict
PostgreSQL readiness contracts remain unchanged by this slice.
