# A07/A19/A11 AI Tutor Env Gate Enterprise Solution

- Date: 2026-06-29
- Primary owners: A07 AI tutor behavior, A19 API environment readiness, A11 QA gate ownership
- Supporting owners: A22 release engineering, A25 dirty-tree slicing
- Trigger: `npm run test:backend` failed because `/api/ai-tutor/status` returned `configured: true` while `tests/e2e/backend-api.spec.ts` expected `configured: false`.

## Current Evidence

- `tests/e2e/backend-api.spec.ts` asserts the backend regression harness is in local-helper mode by expecting `GET /api/ai-tutor/status` to return `configured: false`.
- `playwright.config.ts` blanks provider keys in `disabledProviderEnv`, including `QWEN_API_KEY=`, but also sets `AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED=1`.
- `app/api/ai-tutor/status/route.ts` treats `AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED=1` as a status-only configured marker, so the status endpoint can report `configured: true` without a real or mocked provider key.
- The same status route is currently `force-static` with revalidation/cache headers, so provider readiness can be captured as a build-time/static answer instead of the runtime environment truth.
- Dedicated A07 live/provider suites already exist for configured mode, including mocked provider coverage in `tests/e2e/ai-tutor-deepseek.spec.ts` and opt-in live Qwen coverage in `tests/e2e/ai-tutor-live-text.spec.ts`.

## Root Cause

This is a cross-owner gate contract drift, not an A12 storage regression.

The backend regression gate is trying to prove deterministic local-helper behavior, while the Playwright global harness injects an env marker that makes AI Tutor status look configured. A status-only marker has become indistinguishable from provider readiness, and a static status route makes local, preview, and production readiness easier to misread.

## Target State

Split AI Tutor readiness into three explicit planes.

1. A11 deterministic backend regression plane

   - Purpose: prove auth, local-helper fallback, rate limits, API boundaries, and no accidental provider calls.
   - Env profile: `AI_TUTOR_PROVIDER_PROFILE=offline-fixture`.
   - Required status: `configured: false`, `mode: "local-helper"`, `readiness: "disabled-by-test-profile"` or `readiness: "missing-key"`.
   - Provider keys: blank.
   - Provider spend: none.
   - Gate command: `npm run test:backend`.

2. A07 mocked-live provider contract plane

   - Purpose: prove Qwen-compatible request/response shape, status schema, fallback behavior, safety filtering, rate limits, and usage recording with a fake provider.
   - Env profile: `AI_TUTOR_PROVIDER_PROFILE=mocked-live`.
   - Required status: `configured: true`, `mode: "live"`, `provider: "qwen"`, expected model, no secret-shaped fields.
   - Provider keys: fake non-secret test key only.
   - Provider spend: none; all provider calls intercepted by the local mock server.
   - Gate command: `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts --project=desktop-chrome`.

3. A19 live provider readiness plane

   - Purpose: prove local/Vercel environment parity and live provider transport only when the owner authorizes live smoke.
   - Env profile: `AI_TUTOR_PROVIDER_PROFILE=live-smoke` or production runtime.
   - Required status: `configured: true`, `mode: "live"`, `provider: "qwen"`, safe health/readiness body, no raw secrets.
   - Provider keys: real server-only keys from owner-approved sources or Vercel env.
   - Provider spend: bounded by the live smoke script and only when explicitly enabled.
   - Gate commands: `AI_TUTOR_LIVE_TEXT_QA=1 npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome` and/or `npm run smoke:ai-tutor-live-latency`.

## Implementation Packages

### Package 1 - A07 Status Contract Hardening

Write scope:

- `app/api/ai-tutor/status/route.ts`
- `lib/server/llmProvider.ts`
- A07-owned focused tests, such as `lib/server/llmProvider.test.ts` or a new status-contract test

Changes:

- Remove `AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED` as a generic configured marker.
- Make the status endpoint read the same provider resolver used by the tutor API instead of maintaining a parallel route-local resolver.
- Change the status route from static build-time readiness to runtime readiness. Prefer `dynamic = "force-dynamic"` and `Cache-Control: private, no-store` for test/local, or a short runtime cache only after A22 validates production semantics.
- Return a stable redacted schema:
  - `configured`
  - `mode`
  - `provider`
  - `model`
  - `readiness`
  - `profile`
  - per-capability `text`, `image`, `voice`, and `speech` statuses
  - `health.checked` and `health.state`
- Keep all status fields secret-safe: no keys, org IDs, endpoint credentials, raw provider error bodies, cookies, or authorization headers.

Acceptance:

- With `QWEN_API_KEY=` and `AI_TUTOR_PROVIDER_PROFILE=offline-fixture`, status returns local-helper.
- With fake mocked-live Qwen env, status returns configured live Qwen and the A07 mocked-provider suite remains green.
- With real live env, status reflects runtime env without relying on a build-time status-only marker.

### Package 2 - A19 Environment Profile And Readiness Runbook

Write scope:

- `.env.local.example`
- `coordination/reports/` redacted readiness/runbook artifacts
- Vercel env inventory only when explicitly owner-assigned

Changes:

- Add documented env profile names:
  - `AI_TUTOR_PROVIDER_PROFILE=offline-fixture`
  - `AI_TUTOR_PROVIDER_PROFILE=mocked-live`
  - `AI_TUTOR_PROVIDER_PROFILE=live-smoke`
  - `AI_TUTOR_PROVIDER_PROFILE=production`
- Record the required variable names for Qwen text, image, realtime, and ASR capabilities, with redacted present/missing status only.
- Document that local backend regression must not infer live readiness from `.env.local`.
- Document that live smoke is opt-in and cost-bounded.

Acceptance:

- No real secret values are printed, committed, staged, logged, or screenshotted.
- A19 can report local/Preview/Production readiness as redacted present/missing/configured/transport-failed/credential-rejected.
- Missing credentials stop at owner action rather than weakening tests.

### Package 3 - A11 QA Gate Split

Write scope:

- `playwright.config.ts`
- `tests/e2e/backend-api.spec.ts`
- A11-owned QA report under `coordination/reports/`

Changes:

- Remove `AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED=1` from the global `disabledProviderEnv`.
- Add `AI_TUTOR_PROVIDER_PROFILE=offline-fixture` to the global backend/e2e webServer env.
- Keep `QWEN_API_KEY=`, `DEEPSEEK_API_KEY=`, and other provider keys blank in offline regression.
- Update the backend status assertion to verify the offline profile contract, not accidental absence of a local credential.
- Keep guest `registration-required`, signed-in missing-provider `503`, and rate-limit checks in the backend gate.
- Do not add live provider assertions to `npm run test:backend`.

Acceptance:

- `npm run test:backend` passes with provider keys blank and no provider spend.
- The backend gate fails if the app accidentally reports live/configured under `offline-fixture`.
- The backend gate does not fail merely because `.env.local` or production has real provider keys.

### Package 4 - A22 Release Matrix Integration

Write scope:

- Release readiness reports in `coordination/reports/`
- Release preflight/runbook scripts only if separately assigned

Changes:

- Publish release evidence as two distinct lines:
  - deterministic backend/API regression: offline fixture, must pass for every release
  - provider readiness: live smoke, required only for releases claiming live AI Tutor readiness
- Ensure preview/production deploy reports state which AI Tutor plane was run.
- Never publish from the dirty root; use clean worktree, clean clone, reviewed slice, or pruned staging directory.

Acceptance:

- A red live provider smoke blocks only live AI Tutor readiness claims, not unrelated A12 backend/storage acceptance.
- A red offline backend gate blocks release regardless of live provider state.

## Recommended First Patch Order

1. A11 removes the global status-only marker from `playwright.config.ts` and replaces it with `AI_TUTOR_PROVIDER_PROFILE=offline-fixture`.
2. A07 removes or quarantines `AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED` from `app/api/ai-tutor/status/route.ts` and makes status runtime-dynamic.
3. A11 updates `tests/e2e/backend-api.spec.ts` to assert offline profile status explicitly.
4. A07 reruns mocked provider contract tests.
5. A19 runs redacted local readiness inventory and, only if authorized, live smoke.
6. A22 records release matrix evidence with offline and live planes separated.

## Stop Conditions

- Stop if a real Qwen, DeepSeek, OpenAI, or Vercel secret is needed but absent from owner-approved sources.
- Stop if a provider key appears in command output, logs, screenshots, reports, or Git diff.
- Stop before editing Vercel Production env unless the owner explicitly assigns that action to A19.
- Stop before changing tutor prompt/model/cost semantics outside A07 ownership.
- Stop before weakening `npm run test:backend` to accept both configured and unconfigured status in the same deterministic gate.

## Why This Is Enterprise-Grade

This design separates configuration truth, behavior correctness, and release claims. Offline backend regression becomes deterministic and cheap; mocked-live provider behavior remains fully testable without spending tokens; real live readiness becomes a redacted A19/A22 release signal instead of a hidden side effect of local `.env.local` or a build-time marker. It also preserves the safety boundary that provider status may reveal readiness, but never credential material.
