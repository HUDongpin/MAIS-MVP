# 2026-06-06 AI Tutor Overnight Dialogue And Voice Bug Audit

Session: S07  
Scope: AI Tutor dialogue logic, DeepSeek live text path, Qwen reply voice path, browser microphone input path, and the local Playwright/dev harness used to test them.  
Credential handling: DeepSeek and Qwen credentials were checked only as redacted provider/configured status. No credential values were copied, printed, staged, or written to this report.

## Executive Summary

The isolated live DeepSeek dialogue API matrix is currently healthy: 27/27 role/language cases passed with no empty replies, no fallback replies, no sensitive leaks, and p95 latency under the 30s gate.

The main blocker found during the overnight-style audit is not a stable DeepSeek conversation bug. It is local test/runtime contamination: multiple Next dev/build/playwright processes write to the shared `.next` directory, causing false HTTP 500s, non-JSON replies, missing manifest errors, and a frontend AI Tutor smoke run that hung until killed.

The current voice architecture is split:

- Student microphone input uses browser `SpeechRecognition` / `webkitSpeechRecognition` in `components/ai/AITutorProvider.tsx`.
- AI tutor reply playback uses `/api/ai-tutor/voice`, which calls Qwen realtime WebSocket and returns `audio/wav`.
- There is no implemented Qwen ASR path for microphone transcription yet; the 2026-06-04 Qwen ASR plan remains a future implementation plan.

## Findings

| ID | Severity | Status | Finding | Evidence | Owner |
| --- | --- | --- | --- | --- | --- |
| AITUTOR-OVN-001 | P1 | Open | Local AI Tutor frontend/live QA is unreliable when concurrent Next dev/build processes share `.next`; this creates false AI Tutor failures and can hang frontend smoke tests. | Live frontend smoke ran for more than 15 minutes and had to be terminated. Dev logs showed repeated `.next/static/development/_buildManifest.js.tmp.*` ENOENT. Similar shared `.next` failures are already recorded in `coordination/reports/2026-06-02-next-distdir-build-blocker-fix.md` and other S11 reports. | S22/S11 with S07 for AI Tutor acceptance gates |
| AITUTOR-OVN-002 | P1 | Open | Production-mode AI Tutor E2E cannot be trusted until the unrelated build output blocker is fixed. | `npm run build` compiled, then failed collecting page data for `/api/assignments/[assignmentId]/submissions` with missing `.next/server/app/api/assignments/[assignmentId]/submissions/route.js`. | Owning API/release sessions |
| AITUTOR-OVN-003 | P2 | Open/product gap | Microphone input is browser speech recognition, not Qwen ASR. If the expected behavior is "Qwen transcribes student speech", the current implementation does not meet that expectation. | `components/ai/AITutorProvider.tsx` defines and uses `SpeechRecognition` / `webkitSpeechRecognition`; `/api/ai-tutor/voice` is TTS-style reply playback only. | S07/S19 |
| AITUTOR-OVN-004 | P3 | Monitoring gap | The AI Tutor live summary artifact can be overwritten by later partial/killed runs, losing the successful API matrix evidence. | The successful API-only run printed a 27/27 pass, but a later killed frontend-only run rewrote `.tmp/ai-tutor-live-text/live-text-summary.json` to an empty result set. | S11/S22 |
| AITUTOR-OVN-005 | P2 | Reproduced | Invalid authenticated voice requests consume the user's voice rate limit before body/text validation, so empty-text requests can make the next valid voice playback return 429. | In an isolated no-provider run with `AI_TUTOR_VOICE_MAX_REQUESTS_PER_MINUTE=2`, two empty `text` posts returned 400, then a valid voice request returned 429 with `Retry-After: 60`. Text API does not have this ordering issue because it validates input before rate limiting. | S07 |
| AITUTOR-OVN-006 | P1 | Open environment blocker | Current disk pressure blocks reliable frontend voice-state exhaustive testing. | `df -h` showed the data volume at 100% capacity with only 3.5GiB available. `.tmp` is about 27GiB, `.next` about 2.3GiB. An isolated frontend voice mock run hit Turbopack panics and `ENOSPC: no space left on device, write` while compiling `/api/ai-tutor/status`. | S22/S25/owner cleanup decision |

## Positive Baseline

Focused live API text matrix:

- Command: `AI_TUTOR_LIVE_TEXT_QA=1 AI_TUTOR_LIVE_TEXT_SERVER_MODE=dev AI_TUTOR_LIVE_TEXT_MATRIX_ROUNDS=1 AI_TUTOR_LIVE_TEXT_SOAK_REQUESTS=0 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome --reporter=line --retries=0 --grep "live API text role"`
- Result: passed.
- Matrix: 27/27 live API calls passed.
- Success rate: 1.0.
- Empty replies: 0.
- Fallback responses: 0.
- Sensitive leaks: 0.
- Infrastructure failures: 0.
- Approximate latency: p50 7895 ms, p95 11291 ms.

Manual local API probes also returned HTTP 200 JSON for previously suspicious student prompts after isolating from the noisy matrix run.

## Voice Architecture Evidence

- `/api/ai-tutor/status` reports the Qwen realtime voice provider through `readQwenRealtimeProviderConfig`.
- `/api/ai-tutor/voice` authenticates the user, rate-limits by user id, cleans text to 1200 characters, opens Qwen realtime WebSocket, requests audio, converts PCM to WAV, and returns `Content-Type: audio/wav`.
- Frontend microphone capture is local browser recognition: unsupported/not-allowed/no-speech states are generated around `SpeechRecognition` / `webkitSpeechRecognition`, not by a server ASR provider.

## Focused Voice Endpoint Result

Isolated Qwen reply playback smoke:

- Server mode: isolated Next dev server with per-run `NEXT_DIST_DIR` and temporary SQLite DB.
- Auth: temporary student registration succeeded.
- `/api/ai-tutor/status`: HTTP 200, live DeepSeek text, Qwen image, Qwen voice configured.
- `/api/ai-tutor/voice`: HTTP 200, `Content-Type: audio/wav`, `X-AI-Tutor-Voice-Provider: qwen`, `X-AI-Tutor-Voice-Model: qwen3.5-omni-flash-realtime`.
- Audio evidence: 161324 bytes, WAV header `RIFF` / `WAVE`.

Rate-limit ordering repro:

- Server mode: isolated Next dev server, provider disabled to avoid Qwen cost.
- `AI_TUTOR_VOICE_MAX_REQUESTS_PER_MINUTE=2`.
- Request 1: authenticated `POST /api/ai-tutor/voice` with empty `text` returned 400 `Voice text is required.`
- Request 2: authenticated empty `text` returned 400 `Voice text is required.`
- Request 3: authenticated valid `text` returned 429 `AI Tutor voice rate limit reached.`
- Expected: invalid/empty requests should not consume voice playback quota; the first valid request should reach provider configuration or playback logic.

Frontend voice-state probe:

- Attempted with headless Playwright and mocked browser `SpeechRecognition` / `webkitSpeechRecognition`.
- First attempt timed out on authenticated registration because the cold dev route completed just after Playwright's 30s request timeout.
- Second attempt removed auth and used the guest homepage, but the isolated dev server hit Turbopack panic plus `ENOSPC: no space left on device, write` while compiling `/api/ai-tutor/status`.
- Result: frontend voice-state behavior remains inconclusive in this run. The blocker is environment capacity/runtime stability, not a confirmed AI Tutor UI state bug.

## Checks Run

| Check | Result | Notes |
| --- | --- | --- |
| `npm run type-check` | Pass | TypeScript completed successfully before this report. |
| `git diff --check --` targeted AI Tutor files | Pass | No whitespace errors in the targeted files checked. |
| Mocked `ai-tutor-deepseek.spec.ts` | Blocked/inconclusive | Production temporary Next server exited with `routesManifest.dataRoutes is not iterable`; this is harness/build-output related. |
| Live API text matrix | Pass | 27/27 DeepSeek dialogue cases passed. |
| Live frontend text smoke | Inconclusive | Hung until killed; concurrent Next `.next` manifest ENOENT noise observed. |
| Isolated Qwen voice endpoint | Pass | Returned valid WAV audio via Qwen realtime. |
| Voice invalid-request quota repro | Fail/reproduced bug | Empty voice requests consume rate limit before validation. |
| Frontend mocked voice-state probe | Inconclusive | Blocked by cold compile timeout, then `ENOSPC`/Turbopack panic under low disk. |
| `npm run build` | Fail/unrelated | Missing assignment submissions route output during page-data collection. |

## Recommended Next Actions

1. S22/S11: run AI Tutor Playwright suites with a per-run isolated Next dist directory or a single controlled server; do not use shared `.next` during parallel overnight sessions.
2. S07: keep the 27/27 live DeepSeek API matrix as the current AI Tutor text baseline, and rerun only after harness isolation is restored.
3. S07/S19: decide whether microphone voice input should remain browser speech recognition or be upgraded to Qwen ASR realtime. If Qwen ASR is required, implement it as a new server/client path rather than labeling the current browser path as provider ASR.
4. S11/S22: make live summary artifacts append-only or run-id-scoped so a killed frontend run cannot overwrite a successful API matrix result.
5. S07: move `/api/ai-tutor/voice` rate-limit charging until after JSON/body validation and non-empty text validation; add a focused regression test for invalid voice requests not consuming quota.
6. S22/S25/owner: free or isolate generated runtime output before more overnight frontend AI Tutor enumeration. Current `.tmp`/`.next` pressure can turn valid UI tests into runtime panics.

## Post-Fix Update - 2026-06-06 S07

The S07-owned quota-ordering bug is fixed. `/api/ai-tutor/voice` now authenticates first, then validates JSON/body/object/non-empty cleaned `text`, and only then charges the voice rate limit.

Focused no-provider verification: two authenticated empty `text` requests returned 400, and the following authenticated valid `text` request returned 503 `Qwen realtime voice is not configured.` rather than 429. This proves invalid empty requests no longer consume voice quota.

The live text QA evidence overwrite risk is mitigated in `tests/e2e/ai-tutor-live-text.spec.ts`: each run now uses a sanitized run id, writes its summary under `.tmp/ai-tutor-live-text/runs/<run-id>/live-text-summary.json`, records the run id/path in the summary JSON, and uses per-run `NEXT_DIST_DIR` plus a temporary root tsconfig instead of shared `.next`.

Still open: microphone input remains browser `SpeechRecognition` / `webkitSpeechRecognition`, not Qwen ASR. That requires an explicit product decision and a new ASR implementation path. Broader disk cleanup and non-AI-Tutor Playwright isolation remain S22/S11/owner follow-up items.

## Post-Fix Update 2 - 2026-06-06 S07 Qwen ASR

The previous Qwen ASR product gap is now implemented in S07 scope.

Implemented:

- Added `POST /api/ai-tutor/speech` as a separate authenticated Qwen-ASR-Realtime endpoint.
- Added separate ASR configuration via `QWEN_ASR_REALTIME_MODEL`, `QWEN_ASR_REALTIME_API_URL`, `AI_TUTOR_SPEECH_PROVIDER_TIMEOUT_MS`, `AI_TUTOR_SPEECH_MAX_REQUESTS_PER_MINUTE`, and `AI_TUTOR_SPEECH_MAX_AUDIO_SECONDS`.
- Added `speech` capability reporting to `/api/ai-tutor/status`.
- Updated the AI Tutor microphone button so signed-in learners use Qwen ASR push-to-talk when `speech.configured` is true.
- Kept browser `SpeechRecognition` only as fallback when Qwen ASR is not configured.
- Updated the AI Tutor live text harness to remove its own per-run Next dist and temporary SQLite files after preserving the run-id summary.

Protocol source checked:

- Alibaba Cloud Qwen-ASR-Realtime client events document, last updated 2026-03-15: `session.update`, `input_audio_buffer.append`, `input_audio_buffer.commit`, `session.finish`, `input_audio_format: pcm`, and language hints including `zh`, `yue`, and `en`.
- Alibaba Cloud Qwen-ASR-Realtime server events document, last updated 2026-03-15: final transcript is returned in `conversation.item.input_audio_transcription.completed.transcript`.
- Alibaba Cloud Qwen-ASR-Realtime interaction-flow document, last updated 2026-01-16: Manual mode is enabled by setting `session.turn_detection` to `null`.

Verification:

- `npx tsc --noEmit --pretty false --project tsconfig.json`: passed.
- Targeted `git diff --check`: passed.
- No-provider ASR API smoke: passed with 401/400/503 behavior and no provider call.
- Live Qwen ASR smoke: passed. A short local generated utterance was sent as 16 kHz PCM to `/api/ai-tutor/speech`; response was HTTP 200 with provider `qwen`, model `qwen3-asr-flash-realtime`, transcript length 23, expected words present, and no credential output.

Remaining operational note: broad disk cleanup remains outside S07 safe scope because `.tmp` and `.next` contain shared generated outputs from many sessions. The AI Tutor live harness now isolates and cleans its own runtime artifacts, but S22/S25/owner should approve broader cleanup if long-running frontend enumeration needs more free space.

## Post-Fix Update 3 - 2026-06-06 S07 Final Completion Audit

The active bug-brief goal has been rechecked against the current worktree and isolated runtime behavior.

Resolved:

- Voice quota charging order is fixed. Empty/invalid `text` requests return 400 before voice rate limit is charged.
- Student microphone input now has a Qwen ASR path through `POST /api/ai-tutor/speech`; the AI Tutor mic button uses Qwen ASR for signed-in learners when `/api/ai-tutor/status` reports `speech.configured === true`.
- Browser `SpeechRecognition` / `webkitSpeechRecognition` remains as fallback only when Qwen ASR is not configured.
- AI Tutor live text QA summaries are run-id scoped under `.tmp/ai-tutor-live-text/runs/<run-id>/live-text-summary.json`, preventing later partial/killed runs from overwriting earlier evidence.
- AI Tutor live text harness uses per-run `NEXT_DIST_DIR` and a temporary per-run tsconfig, and cleans its own per-run Next dist and SQLite files after preserving the summary.
- Qwen reply voice playback remains healthy: live `/api/ai-tutor/voice` returned `audio/wav` with `RIFF` / `WAVE`.

Final verification:

- `npx tsc --noEmit --pretty false --project tsconfig.json`: passed.
- Targeted `git diff --check` for AI Tutor ASR/voice/status/provider/client/env/test/report/log files plus `tsconfig.json`: passed.
- No-provider isolated API smoke on `127.0.0.1:3187`: student registration 200; two empty voice requests 400; following valid voice request 503 rather than 429; `/api/ai-tutor/speech` returned 401 anonymous, 400 invalid audio, and 503 valid PCM with Qwen disabled.
- Live Qwen ASR smoke on `127.0.0.1:3188`: local generated utterance "What is two plus three?" was sent as 16 kHz PCM to `/api/ai-tutor/speech`; response was HTTP 200 with provider `qwen`, model `qwen3-asr-flash-realtime`, transcript length 23, expected words present, and no credential output.
- Live Qwen reply voice smoke on `127.0.0.1:3189`: authenticated `/api/ai-tutor/voice` returned HTTP 200, `Content-Type: audio/wav`, provider `qwen`, model `qwen3.5-omni-flash-realtime`, 103724 bytes, and WAV header `RIFF` / `WAVE`.
- Live DeepSeek text matrix recheck: `AI_TUTOR_LIVE_TEXT_QA=1 AI_TUTOR_LIVE_TEXT_SERVER_MODE=dev AI_TUTOR_LIVE_TEXT_MATRIX_ROUNDS=1 AI_TUTOR_LIVE_TEXT_SOAK_REQUESTS=0 AI_TUTOR_LIVE_TEXT_RUN_ID=s07-final-audit-1780726149 PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome --reporter=list --retries=0 --grep "live API text role"` passed in 4.2m. Summary path `.tmp/ai-tutor-live-text/runs/s07-final-audit-1780726149/live-text-summary.json`; 27 results, 27 passed, 0 failed, successRate 1, p50 8357 ms, p95 12325 ms, empty/fallback/sensitive/infrastructure failures all 0. The run directory retained only the 16K summary and `next-dist` was removed.
- Cleanup verification: no listeners remained on ports 3187, 3188, or 3189; no matching `/tmp/s07-*` smoke artifacts remained.

Operational note:

- Current disk check during final audit: about 21GiB available; `.tmp` about 22G; `.next` about 3.6G. Broad cleanup of shared generated outputs was not performed because those artifacts belong to multiple sessions. The product/test changes now isolate and clean the AI Tutor harness itself; any broader cleanup remains an S22/S25/owner policy action.
