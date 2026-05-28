# AI Tutor Live Fallback Fix

- Date: 2026-05-22
- Sessions: S07 implementation, S11 QA
- Audience: Dr. Peter Hu
- Status: Yellow after final provider-transport retest

## Summary

The AI Tutor route now has the planned token-budget, prompt, retry-context, diagnostics, and live-rescue fixes. Mocked DeepSeek regression is green. A 27-call live matrix passed once with 27/27, 0 fallback, and p95 14031ms, but the final retest after adding transport retry hit repeated `provider-request-failed` fallbacks from DeepSeek transport/API behavior. Do not mark the live provider gate fully green until S19/S11 rerun after provider/env stability is confirmed.

## What Changed

- Raised default and QA `AI_TUTOR_MAX_COMPLETION_TOKENS` from 500 to 900 while preserving the 1000-token cap.
- Tightened the AI Tutor JSON contract so the provider must return one JSON object with top-level `reply` and `visualization`.
- Added redacted fallback diagnostics such as `empty-final-content`, `invalid-json-shape`, `retry-invalid-json`, `finish-reason-length`, `provider-http-error`, and request timeout/failure categories.
- Reduced retry context after structured-output failure so retries do not replay full dashboard/database/adaptive context.
- Added a final minimal plain-text live rescue request after JSON retry failure; this keeps the response live while still treating true local fallback as QA failure.
- Added one redacted transport retry for provider request/response parse exceptions before local fallback.
- Updated mocked and live E2E harnesses to use the 900-token QA budget.
- Fixed live harness process-tree cleanup for temporary `next start` servers.

## Verification

| Gate | Result |
| --- | --- |
| `npm run type-check` | Passed |
| `npm run build` | First attempt hit transient Next page-data `PageNotFoundError`; immediate retry passed |
| Mocked DeepSeek targeted regression | 4/4 passed after final route changes |
| Live status | `configured: true`, `mode: live`, `model: deepseek-v4-pro`, `provider: deepseek` |
| Live 27-call matrix, successful run | 27/27 passed; 0 fallback; 0 empty replies; 0 sensitive leaks; p50 7621ms; p95 14031ms |
| Live 27-call matrix, final retest | 7/27 passed; 20 provider fallbacks; 0 empty replies; 0 sensitive leaks; p50 22519ms; p95 22587ms; diagnostics: `provider-request-failed` |
| Frontend live smoke | One run passed 3/3 before final transport retry; final full run did not reach frontend because matrix failed |
| Optional soak | Not run; requires owner approval for extra provider cost/rate-limit exposure |

Latest evidence file: `.tmp/ai-tutor-live-text/live-text-summary.json`.

## Remaining Notes

- Production or local environments with an explicit `AI_TUTOR_MAX_COMPLETION_TOKENS=500` will override the new default. S19 should verify production env parity and set 900-1000 if needed without exposing secrets.
- The release gate command should include `AI_TUTOR_LIVE_TEXT_MATRIX_ROUNDS=1` for the 27-call acceptance check.
- Keep fallback diagnostics in future health checks so a live status endpoint cannot hide provider fallback behavior.
- Current remaining blocker is not `empty-final-content` or `invalid-json-shape`; the latest failure mode is provider request/response transport failure under repeated live calls.
