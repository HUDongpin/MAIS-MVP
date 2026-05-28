# SimpleTex Rec Mode Fractions/Percent A/B - 2026-05-23

- Date: 2026-05-23
- Session: S11
- Scope: Direct SimpleTex `simpletex_ocr` `rec_mode=formula|auto|document` A/B for fractions/percent
- Result: **Blocked: route smoke provider none**

## Chinese Executive Summary

本轮 A/B 测试没有进入 276-call direct SimpleTex 矩阵。按计划，必须先通过 10-call MAIS route smoke：10/10 HTTP 200、10/10 `provider:"simpletex"`、0 `402 resource_no_valid`。实际 smoke 在第 1 次调用即停止：MAIS route 返回 HTTP 200 但 `provider:"none"`，服务端日志显示 SimpleTex upstream connect timeout。

这是 provider reachability / route resilience blocker，不是 `rec_mode=formula|auto|document` 的准确率结论。为保护充值后的 API 额度，本次没有继续执行 A/B 矩阵。

## English Executive Summary

The planned 276-call direct SimpleTex rec_mode A/B matrix did not run. The required 10-call MAIS route smoke stopped on call 1: the route returned HTTP 200 with `provider:"none"` after an upstream SimpleTex connect timeout.

This is a provider reachability / route resilience blocker, not an accuracy result for `rec_mode=formula|auto|document`. The A/B run was not continued, preserving quota.

## Preflight Status

| Item | Status |
| --- | --- |
| `SIMPLETEX_UAT` | present |
| `SIMPLETEX_APP_ID` | empty |
| `SIMPLETEX_APP_SECRET` | empty |
| `SIMPLETEX_API_URL` | present:expected |
| `HANDWRITING_RECOGNITION_LLM_FALLBACK_ENABLED` | present:false |
| `MATHPIX_APP_ID` | missing |
| `MATHPIX_APP_KEY` | missing |
| A/B dry-run matrix | ready: 80 existing + 12 visual supplement × 3 modes = 276 direct calls |
| Route smoke | failed hard gate on call 1 |

## Route Smoke Evidence

| Metric | Result |
| --- | ---: |
| Executed calls | 1 |
| HTTP 200 | 1 |
| `provider:"simpletex"` | 0 |
| `provider:"none"` | 1 |
| Stop reason | provider none |
| First-call latency | 10867 ms |
| Raw non-secret JSON | `/tmp/mais-simpletex-rec-mode-route-smoke-2026-05-23.json` |
| Smoke report | `coordination/reports/2026-05-23-simpletex-rec-mode-route-smoke.md` |

Observed upstream class in terminal output: `ConnectTimeoutError` to `server.simpletex.cn:443`.

## Implemented QA Harness

The planned direct A/B harness was added at `tests/e2e/simpletex-rec-mode-fractions-ab.mjs` and passed syntax check. Dry-run confirmed:

- Existing `fractions-percent` images: 80.
- Supplemental visual fraction images: 12.
- Modes: `formula`, `auto`, `document`.
- Planned direct calls: 276.
- Default max calls: 300; hard budget: 350.
- Raw output path: `/tmp/mais-simpletex-rec-mode-fractions-2026-05-23.json`.

## Decision

- Do not interpret this run as evidence for or against switching `simpletex_ocr` from `rec_mode=formula` to `auto` or `document`.
- Do not run the 276-call A/B matrix until a route smoke passes 10/10 `provider:"simpletex"`.
- S12 should consider route resilience for transient SimpleTex connect timeouts if this pattern persists.
- S19/owner should confirm SimpleTex service/account/API route reachability after the recharge, then S11 can rerun the exact A/B command.

## Rerun Command

After route smoke passes:

```bash
node tests/e2e/simpletex-rec-mode-fractions-ab.mjs \
  --route-smoke-raw /tmp/mais-simpletex-rec-mode-route-smoke-2026-05-23.json \
  --raw /tmp/mais-simpletex-rec-mode-fractions-2026-05-23.json \
  --report coordination/reports/2026-05-23-simpletex-rec-mode-fractions-ab.md \
  --interval-ms 1400 \
  --max-calls 300 \
  --budget 350
```

## Secret Hygiene

No UAT token, APP secret, cookie, auth header, or provider credential value is included in this report. The terminal error and raw JSON were checked for high-risk secret leakage patterns before handoff.
