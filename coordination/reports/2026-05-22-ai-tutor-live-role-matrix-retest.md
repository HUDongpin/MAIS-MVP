# AI Tutor Live Role Matrix Retest

- Date: 2026-05-22
- Sessions: S07 route hardening, owner-approved S11 live QA harness/report scope, redacted S19 env presence check
- Status: Resolved
- Scope: Text-only AI Tutor live QA for DeepSeek `deepseek-v4-pro`; no image, audio, video, OCR, or vision fallback testing.
- Secret handling: No API keys, cookies, bearer tokens, raw provider payloads, full replies, or private student context were recorded.

## Executive Summary

中文摘要：旧的 teacher/parent 0/9 失败已经关闭。新的 production-mode `next start` live matrix 在清理 `.next` 并重新 build 后完成 3 轮共 81 次 live text calls，student、teacher、parent 全部 100% 通过；desktop + mobile frontend smoke 6/6 通过；180-call soak 180/180 通过。未发现空回复、HTTP 5xx、HTML 404/500、Next manifest failure、fallback response 或真实敏感上下文泄漏。

English summary: The previous teacher/parent 0/9 result is resolved. A clean production-mode live run passed the 3-round role matrix with 81/81 live calls, passed desktop and mobile frontend smoke with 6/6 cases, and passed the 180-call soak with 180/180 successes. The retained evidence separates old infrastructure/harness failures from current route/provider/model behavior.

## What Changed

- Hardened AI Tutor reply sanitization for raw context markers such as `Database-backed personalization`, `Correct answer for tutor reference`, authorized context labels, stored conversation headers, credential-like tokens, and provider/stack details.
- Added explicit parent-support session guidance so parent requests receive practical at-home support even when no parent-safe data scope is included.
- Updated the live harness so every result records `role`, `status`, `durationMs`, `serverMode`, `acceptanceMode`, `mode`, `replyChars`, `failureKind`, and infrastructure hints without storing full replies or provider payloads.
- Kept production `AI_TUTOR_LIVE_TEXT_SERVER_MODE=start` as the only acceptance mode. `dev` mode can still be used diagnostically, but it does not assert release-gate acceptance.
- Classified HTML 404/500, non-JSON responses, and Next manifest/page-data failures as `infrastructure-failure`, not teacher/parent LLM failures.
- Expanded live frontend smoke to run each role on desktop and mobile viewports.

## Evidence

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run type-check` | Passed |
| Production build | `npm run build` | Passed |
| Mocked DeepSeek regression | `npx playwright test tests/e2e/ai-tutor-deepseek.spec.ts --project=desktop-chrome --grep-invert "image\|vision\|attachment"` | 23/23 passed |
| Production live matrix + frontend | `AI_TUTOR_LIVE_TEXT_QA=1 AI_TUTOR_LIVE_TEXT_SERVER_MODE=start PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome` | 3 passed, 1 soak skipped; 13.0m |
| Production live soak | `AI_TUTOR_LIVE_TEXT_QA=1 AI_TUTOR_LIVE_TEXT_SERVER_MODE=start AI_TUTOR_LIVE_TEXT_SOAK_REQUESTS=180 AI_TUTOR_LIVE_TEXT_SOAK_CONCURRENCY=3 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome --grep "optional live text stress soak"` | 1/1 passed; 6.9m |

## Production Matrix Results

| Metric | Result |
| --- | ---: |
| Server mode | `start` |
| Acceptance mode | `true` |
| Live status | `configured=true`, `mode=live`, `provider=deepseek`, `model=deepseek-v4-pro` |
| Matrix calls | 81 |
| Matrix success rate | 100% |
| Student matrix + frontend | 29/29 |
| Teacher matrix + frontend | 29/29 |
| Parent matrix + frontend | 29/29 |
| Empty replies | 0 |
| Fallback responses | 0 |
| Sensitive leaks | 0 |
| Infrastructure failures | 0 |
| Matrix p50 / p95 | 8790ms / 15103ms |
| Frontend smoke | 6/6 desktop+mobile |
| Frontend p50 / p95 | 9801ms / 16407ms |

## Soak Results

| Metric | Result |
| --- | ---: |
| Requested calls | 180 |
| Concurrency | 3 |
| Success rate | 100% |
| Student | 60/60 |
| Teacher | 60/60 |
| Parent | 60/60 |
| Empty replies | 0 |
| Fallback responses | 0 |
| Sensitive leaks | 0 |
| Infrastructure failures | 0 |
| p50 / p95 | 6074ms / 9563ms |

## Failure Classification Update

- Old retained failure: teacher 0/9 and parent 0/9 came from a dev-mode/unstable generated-state run with HTTP 500/empty responses and known build/type pollution risk.
- Infrastructure/harness failures: now explicitly classified as `infrastructure-failure` when the response is HTML 404/500, non-JSON, or a Next manifest/page-data failure.
- Real AI Tutor route failures: none observed in the production matrix, frontend smoke, or soak.
- Real model response quality failures: none observed in the production matrix, frontend smoke, or soak.
- Safety false positives: safe refusal language is no longer treated as a leak just because it mentions private-material categories; actual raw context markers and secret-like tokens still fail.

## Environment Parity Note

Redacted S19 check found `.env.local` present, `LLM_API_KEY` configured, `LLM_MODEL=deepseek-v4-pro`, and `LLM_API_URL` host `api.deepseek.com`. Local `.env.local` still explicitly sets `AI_TUTOR_MAX_COMPLETION_TOKENS=500`; the live harness overrides this to `900`, and `.env.local.example` also uses `900`. S19 should align local and Vercel runtime values to 900-1000 without exposing secret values.

## Decision

Resolved. The old teacher/parent 0/9 issue should not be treated as evidence that DeepSeek `deepseek-v4-pro` cannot support teacher or parent text roles. Current production-mode evidence shows teacher and parent live text requests pass the release gates.
