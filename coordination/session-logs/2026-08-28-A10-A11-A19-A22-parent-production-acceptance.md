# A10/A11/A19/A22 Parent Production Acceptance Session

- Owner lanes: A10 coordination, A11 QA, A19 provider environment, and A22 production reliability
- Branch: `codex/a10-a11-a19-a22-parent-prod-acceptance-20260828`
- Worktree: `.worktrees/a10-a11-a19-a22-parent-prod-acceptance-20260828`
- Baseline: exact live `origin/main` commit `fb7234a8f17563467edad4fa318cc8602d080741`
- Baseline tree: `f072812bcdb8e7c341cb823454d00800fd61d7f6`
- Target PR: `#217` (`https://github.com/HUDongpin/MAIS-MVP/pull/217`)
- Created: 2026-08-28
- Expected closeout: 2026-08-30

## Objective

Complete the remaining parent-console production acceptance evidence without
using real-family data: exact-SHA PostgreSQL/provider proof, read-only live
smoke, cookie/CDN contracts, dedicated synthetic-family cross-instance and
idempotency checks, real notification delivery, monitoring/alert/recovery
evidence, and VoiceOver/NVDA human acceptance.

## Safety boundary

- Production writes are limited to an explicitly identified synthetic test
  family and require exact target-bound confirmation.
- No credential, cookie value, database URL, provider message identifier, or
  private family payload may be printed, stored, attached, committed, or
  included in reports.
- Existing A12/A22 production workflows and worktrees remain independently
  owned; this session does not duplicate an in-progress deployment or schema
  operation.
- Automated accessibility evidence does not substitute for VoiceOver or NVDA
  human acceptance.

## Initial binding

- Live remote `main`: `fb7234a8f17563467edad4fa318cc8602d080741`
- Exact-head CI run: `33162839418` (`success`, 7/7 jobs)
- Exact-head Promotion run: `33162839431` (`success`)
- Production release run `33164615767` was still in progress when this
  acceptance session started; no success claim is made until its exact release
  record is independently read back.
- Teacher-notice production health run `33147749429` failed, and alert issue
  `#166` remained open. Monitoring/recovery is therefore an active blocker,
  not inherited green evidence.

## Exact production release evidence

- Production release run `33164615767` completed successfully at exact
  candidate `fb7234a8f17563467edad4fa318cc8602d080741` and tree
  `f072812bcdb8e7c341cb823454d00800fd61d7f6`.
- Safe release-record digest:
  `903663f00adc276cca34a4cfc15906f9497e7a865211767b560f53b722b574fc`.
- Provider source/Git SHA, inspect, promotion, and both production aliases were
  verified. The real provider reported PostgreSQL major 17.
- App storage, outbox, webhook, and heartbeat schemas were all `exact`.
  Preflight and apply both had `operations=[]`; same-connection and independent
  postflight were exact.
- Both production aliases passed seven read-only routes each: landing, about,
  login, unauthenticated parent redirect, parent foundation rejection,
  session rejection, and warm-endpoint rejection.
- A direct local PostgreSQL connection attempt timed out. It is not used as
  provider proof; the protected GitHub run's live provider connection and exact
  release record are authoritative.

## Monitoring and recovery drill

- Normal health run `33167418803` passed on both production aliases at the
  exact deployed candidate and closed historical alert `#166`.
- Explicit alert drill run `33167487783` first passed the real health check,
  then failed intentionally with the built-in drill marker and opened alert
  `#216` without application credentials or response bodies.
- Recovery run `33167560491` passed and automatically closed `#216` with a
  run-bound recovery comment.
- The drill changed only GitHub alert state. It did not deploy, invoke the
  delivery cron, mutate schema, or write application/database data.

## Phase 2 acceptance tooling

- Added a protected-main-only, non-deploying production acceptance workflow and
  a release-only Node harness for the remaining dedicated-family checks.
- The harness requires exact candidate/tree/release-record binding, two explicit
  production-write booleans, an exact family/target/SHA/tree confirmation, a
  `mais-synthetic-family-*` identifier, and an official Resend
  `delivered+...@resend.dev` recipient derived in memory.
- Sensitive Vercel variables cannot be decrypted by local CLI pull; the
  workflow instead uses the existing protected `production` environment and a
  same-process Vercel provider pull. Runtime/build values must match exactly,
  only an allowlisted subset is retained temporarily, and WeCom must remain
  disabled.
- Provider and application JSON responses are stream-bounded at 1 MiB even
  when no `Content-Length` is supplied. Personalized responses accept only the
  fail-closed Vercel cache states `MISS` or `BYPASS`, alongside explicit
  private/no-store browser and edge controls.
- Both production aliases are resolved through the Vercel management API and
  matched to the release-record deployment before writes and again after the
  final notification acknowledgement. A candidate switch during the bounded
  acceptance window therefore prevents an acceptance report.
- Application runtime code is unchanged. The slice contains only workflow,
  release script/test, CI routing, and this session log.

## Local TDD and gates

- Focused RED was observed before each implementation slice: missing module,
  missing pure validators, missing orchestration, missing provider pull, missing
  workflow, missing CI routing, the dynamic-environment expression defect,
  unbounded chunked provider JSON, an unknown CDN cache state, and absent
  post-write deployment binding.
- Focused final gate: 12/12 passed.
- Exact-source deployment/release test battery: 177/177 passed.
- Release governance: 91 passed, 11 explicit skips, 0 failed.
- Complete parent console gate: 76/76 harness tests and 403/403 runtime tests
  passed with zero skips or failures.
- `npm run type-check`: passed.
- Node syntax, YAML parse, runtime import, and `git diff --check`: passed.

No synthetic-family production write or Resend delivery has been dispatched at
this point. That remains gated on review, commit/PR, exact-head CI/Promotion,
protected-main merge, and then one explicit workflow dispatch.
