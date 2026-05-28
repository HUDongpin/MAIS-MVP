# DeepSeek-v4-pro AI Tutor Live Text QA

- Date: 2026-05-21
- Session: S11
- Workstream: QA and release quality
- Scope: Text-only AI Tutor QA for `deepseek-v4-pro`; no image, audio, video, OCR, vision fallback, or file-upload testing.
- Secret handling: No API keys, cookies, bearer tokens, raw provider payloads, or full tutor replies were written to this report.

## Executive Summary

中文摘要：AI Tutor 的 `/api/ai-tutor/status` 能正确识别 live DeepSeek 配置：`configured=true`、`mode=live`、`provider=deepseek`、`model=deepseek-v4-pro`。但是 live 文字矩阵未达上线标准：保留证据的第二次矩阵运行只有 7/27 通过，教师与家长角色均出现 HTTP 500 / 空回复。由于基础矩阵失败，未继续执行 90 次 stress/soak，以避免继续消耗 live provider 额度。项目级 `type-check` / `build` 也被一个既有的 Mainland PEP RAG metadata 类型不一致阻塞。

English summary: The live status gate passed, but the live role/text matrix failed. Student text worked partially; teacher and parent text calls returned HTTP 500 with empty replies in the retained matrix run. This is a release blocker for live AI Tutor rollout until S07/S12/S19 diagnose the AI Tutor route/provider/runtime path and S10/S18 resolve the unrelated project build/type gate.

## Evidence

| Check | Result | Notes |
| --- | --- | --- |
| `GET /api/ai-tutor/status` live DeepSeek gate | Pass | Returned live DeepSeek `deepseek-v4-pro` configuration. |
| Live API role/language matrix, retained run | Fail | 27 text calls, 7 passed, 20 empty replies, p50 83 ms, p95 8.576 s. |
| Live API role/language matrix, first run | Fail | 27 text calls, 19 passed, 6 empty replies, 1 fallback, p95 17.293 s. |
| Frontend live text smoke | Not run | Skipped because the serial API matrix failed first. |
| 90-request stress/soak | Not run | Skipped because baseline live matrix failed; avoids extra provider cost. |
| Mocked DeepSeek regression excluding image/vision/attachment | Blocked | Playwright webServer exited during build; follow-up rerun was blocked by the project build/type error below. |
| `npm run type-check` | Fail | Existing mismatch: `ragBatch` does not exist on metadata shape that now uses `ragBatches`. |
| `npm run build` | Fail | Same metadata family issue appears during Next build; after cleaning generated `.next`, build fails on `ragBatch` vs `ragBatches`. |

## Retained Live Matrix Breakdown

| Role | Cases | Passed | Empty replies | HTTP 500 | Sensitive-leak pattern hits |
| --- | ---: | ---: | ---: | ---: | ---: |
| Student | 9 | 7 | 2 | 2 | 0 |
| Teacher | 9 | 0 | 9 | 9 | 0 |
| Parent | 9 | 0 | 9 | 9 | 0 |

Failed retained-run labels:

- Student: `student-identity`, `student-overreach`.
- Teacher: all 9 teacher language/intent/negative cases.
- Parent: all 9 parent language/intent/negative cases.

The retained run used `AI_TUTOR_LIVE_TEXT_SERVER_MODE=dev` because `npm run build` is currently blocked by unrelated type errors. This means it is valid live-route/provider evidence, but it is not a full `next start` production-mode acceptance run.

## Files Added

- `tests/e2e/ai-tutor-live-text.spec.ts`

The spec is intentionally gated:

```bash
AI_TUTOR_LIVE_TEXT_QA=1 \
AI_TUTOR_LIVE_TEXT_SERVER_MODE=dev \
AI_TUTOR_LIVE_TEXT_SOAK_REQUESTS=90 \
PLAYWRIGHT_SKIP_WEBSERVER=1 \
npx playwright test tests/e2e/ai-tutor-live-text.spec.ts --project=desktop-chrome
```

Use `AI_TUTOR_LIVE_TEXT_SERVER_MODE=start` after `npm run build` is green to run the production-mode harness.

## Release Decision

Status: Blocked for live AI Tutor rollout.

Required follow-up:

- S07: diagnose why live AI Tutor POST returns HTTP 500 / empty replies for teacher and parent contexts and intermittently for student identity/overreach prompts.
- S12/S19: confirm local runtime/env parity and provider connectivity without exposing `LLM_API_KEY`.
- S10/S18: resolve the unrelated `ragBatch` / `ragBatches` project type/build blocker so mocked regression and `next start` live QA can run normally.
- S11: rerun mocked DeepSeek regression, live API matrix, frontend smoke, then 90-request soak only after the matrix is green.
