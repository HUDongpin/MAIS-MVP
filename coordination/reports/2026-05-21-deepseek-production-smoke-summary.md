# DeepSeek Production Smoke Summary For www.mais.hk

- Date: 2026-05-21
- Session: S19
- Workstream: API configuration and deployment environment
- Target: `https://www.mais.hk`
- Provider under test: DeepSeek through server-side `LLM_*` production environment variables
- Secret handling: No API keys, cookies, bearer tokens, raw provider payloads, or secret values are recorded in this report.

## Executive Summary

中文摘要：本次低流量生产冒烟测试确认 `www.mais.hk` 的 DeepSeek 配置已经被生产服务器读取，并且在两个目标路径中可用：AI Tutor 文字回复，以及 Adaptive Engine 与 BKT 候选方案结合的受防护 LLM rerank。AI Tutor 返回正常 `reply`，没有 fallback mode；Adaptive refresh 返回 `status: ready`、`engine.mode: llm-assisted`、`provider: deepseek`，并保留 BKT evidence、guard flags、候选 ID 与题目集合。此结论是生产连通性与功能冒烟通过，不等同于完整发布级压力测试或全角色 QA 通过。

English summary: This low-volume production smoke test confirms that `www.mais.hk` can read the DeepSeek production configuration and use it in both intended server-side paths: AI Tutor text responses and the Adaptive Engine guarded rerank working with BKT-generated candidates. AI Tutor returned a normal `reply` with no fallback mode. Adaptive refresh returned `status: ready`, `engine.mode: llm-assisted`, `provider: deepseek`, and preserved BKT evidence, guard flags, candidate IDs, and question sets. This is a production connectivity/functionality pass, not a full release-grade load, role-matrix, or regression certification.

## Evidence Summary

| Area | Endpoint / Surface | Result | Evidence |
| --- | --- | --- | --- |
| Production LLM config | `GET /api/ai-tutor/status` | Pass | HTTP 200; `configured: true`; `mode: live`; `provider: deepseek`; `model: deepseek-v4-pro`. |
| AI Tutor UI readiness | AI Tutor panel on `www.mais.hk` | Pass | Browser smoke showed `Live AI ready`; `/api/ai-tutor/status` returned HTTP 200 in the browser flow. |
| AI Tutor live text | `POST /api/ai-tutor` | Pass | HTTP 200; response included `reply`; no `mode`; no `error`; no `provider-fallback`, `context-summary-fallback`, `vision-provider-required`, `registration-required`, or `quota-exceeded`. |
| BKT first decision | `GET /api/adaptive-learning/next?grade=S3` | Pass | HTTP 200; decision present; `engine.provider: deepseek`; `engine.model: deepseek-v4-pro`; `engine.llmStatus: pending`; deterministic BKT candidate loaded. |
| Adaptive DeepSeek rerank | `POST /api/adaptive-learning/refresh` | Pass | HTTP 200; `status: ready`; `engine.mode: llm-assisted`; `engine.llmStatus: ready`; `provider: deepseek`; `finishReason: stop`. |
| BKT integration after attempts | `/api/attempts` then adaptive refresh | Pass | Two tracked practice attempts returned HTTP 200; follow-up refresh stayed `llm-assisted` with DeepSeek and BKT guard/evidence fields present. |
| Vercel production logs | Vercel CLI log query | Pass with note | Recent production logs showed entries for AI Tutor and Adaptive endpoints; no DeepSeek provider errors were found. Only unrelated Node SQLite experimental warnings appeared at error level. |

## Adaptive Engine Details

- First adaptive decision loaded as deterministic BKT with `llmStatus: pending`, which is expected before the async guarded rerank completes.
- Refresh selected the same repair candidate as the deterministic BKT baseline: `repair:polynomials:foundation`.
- The reranked decision preserved BKT guardrails, including `weak-prerequisite` and `repair-required`.
- The decision included a five-question set, evidence entries, selected candidate ID, deterministic candidate ID, teacher audit note, AI confidence metadata, and `signalsUsed`.
- After two tracked attempts, the follow-up DeepSeek rerank stayed ready and included `recentPerformance` among the signals used.

## What This Test Does And Does Not Prove

This test proves:

- Production `LLM_API_KEY`, `LLM_MODEL`, and `LLM_API_URL` are available to the server runtime.
- DeepSeek is reachable from Vercel production for the AI Tutor text path.
- DeepSeek is reachable from Vercel production for the Adaptive Engine guarded reranker.
- The Adaptive Engine keeps BKT as the source of candidate generation and guardrails; DeepSeek is acting as a validated reranker rather than inventing questions.

This test does not prove:

- Full AI Tutor release readiness across every role, language, prompt class, and context scope.
- Long-run reliability, latency percentiles, rate-limit behavior, or load capacity.
- Image/vision AI Tutor behavior; DeepSeek is currently treated as text-only for this plan.
- Broader app build/type health or unrelated production storage behavior.

## Risks And Follow-Up

- Keep this result scoped as a low-volume production smoke pass.
- S07 should own deeper AI Tutor provider behavior if broader role/language QA finds failures.
- S15 should own adaptive recommendation quality if future reranks are rejected or semantically weak.
- S19 should continue to own Vercel environment parity and redacted provider-readiness evidence.
- S11 can run a broader release-grade matrix and soak test after the owner approves live provider budget.

## Final Status

Status: Pass for the requested production DeepSeek functionality smoke on `www.mais.hk`.

No code or environment files were changed. Temporary local cookie jars and response artifacts were removed after the test.
