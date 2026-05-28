# DeepSeek v4 pro RAG Access Audit

- Date: 2026-05-24
- Session: S10
- Scope: Redacted runtime audit only; no product code changed.
- Owner authorization: Live DeepSeek v4 pro calls were explicitly authorized for this audit.
- Secret handling: API keys, bearer tokens, cookies, raw provider payloads, raw hidden prompts, and full LLM replies were not written to this report. A local forwarding proxy recorded redacted request/response summaries only.

## Executive Finding

1. AI Tutor backend can pass RAG evidence to DeepSeek v4 pro when the API request includes `context.evidenceQuery`.
2. AI Tutor frontend does not currently expose or send `evidenceQuery`; the floating UI sends only `input`, `messages`, `grade`, `language`, and `page`.
3. Adaptive Engine does call DeepSeek v4 pro successfully and returns `llm-assisted` decisions, but the prompt payload does not include RAG curriculum/textbook/exam evidence. It only includes guarded BKT candidate and performance features.

## Configuration and RAG Health

- `/api/ai-tutor/status` returned `configured=true`, `mode=live`, `provider=deepseek`, `model=deepseek-v4-pro`.
- `npm run test:rag` passed: 74/74 tests.
- `npm run build` passed and produced all app/API routes.
- RAG assets validated by tests include:
  - HK EDB curriculum guidance, HK DSE exam-pattern guidance, HK DSE UP and EPH textbook layers.
  - Mainland PEP P1-P6 curriculum cards and primary paper-pattern cards.
  - Mainland PEP S1-S3 curriculum cards, junior paper-pattern cards, and junior exam-pattern cards.
  - Mainland PEP S4-S6 curriculum cards and secondary exam-pattern cards.

## Code Path Evidence

- AI Tutor backend supports `context.evidenceQuery` in `app/api/ai-tutor/route.ts` lines 646-728.
- AI Tutor backend appends RAG text into the provider context via `safeEvidenceContext` in `app/api/ai-tutor/route.ts` lines 948-962 and 1666-1683.
- AI Tutor frontend `TutorContext` omits `evidenceQuery` in `components/ai/AITutorProvider.tsx` lines 18-27 and 381-399, so UI-originated context cannot carry RAG evidence today.
- Adaptive Engine feature pack in `lib/server/userStore.ts` lines 11135-11190 contains policy, curriculum track/profile, grade/topic, candidates, recent performance, and analytics summary, but no RAG evidence pack.
- Adaptive Engine sends that feature pack directly to DeepSeek in `lib/server/userStore.ts` lines 11193-11225 and 11395-11422.
- Mainland RAG evidence pack combines curriculum, primary paper, junior paper/exam, and secondary exam layers in `lib/rag/mainlandPep.ts` lines 436-530.
- HK RAG evidence pack combines EDB curriculum, selected textbook publisher, and DSE exam-pattern layers in `lib/rag/hongKongMath.ts` lines 94-155.

## Live DeepSeek Results

| Sample | Entry | Result | RAG layers observed in DeepSeek request | Response summary |
| --- | --- | --- | --- | --- |
| Mainland P1 | AI Tutor direct API | Pass | Mainland RAG, curriculum, primary paper pattern | 200; reply present; mentioned domain evidence and safe-use restriction |
| Mainland P6 | AI Tutor direct API | Pass | Mainland RAG, curriculum, primary paper pattern | 200; reply present; mentioned curriculum/exam domain |
| Mainland S3 | AI Tutor direct API | Pass | Mainland RAG, curriculum, junior paper pattern, junior exam pattern | 200; reply present; mentioned curriculum/exam domain |
| Mainland S6 | AI Tutor direct API | Pass | Mainland RAG, curriculum, secondary exam pattern | 200; reply present; mentioned domain evidence and safe-use restriction |
| HK EDB | AI Tutor direct API | Pass | HK combined RAG, EDB curriculum, textbook layer, DSE exam-pattern layer | 200; reply present |
| HK DSE Paper 2 | AI Tutor direct API | Pass | HK combined RAG, EDB curriculum, textbook layer, DSE exam-pattern layer | 200; reply present; mentioned DSE/Paper/exam domain |
| HK textbook layer | AI Tutor direct API | Pass | HK combined RAG, EDB curriculum, textbook layer, DSE exam-pattern layer | 200; reply present; mentioned textbook/exam domain |
| HK S3 | Adaptive refresh | Fail RAG criterion | No RAG evidence; adaptive feature pack only | 200; `llm-assisted`, `ready`, DeepSeek v4 pro; signals used only deterministic/mastery features |
| Mainland S4 | Adaptive refresh | Fail RAG criterion | No RAG evidence; adaptive feature pack only | 200; `llm-assisted`, `ready`, DeepSeek v4 pro; signals used only deterministic/mastery features |

## UI Payload Check

Production runtime browser check:

```json
{
  "keys": ["grade", "input", "language", "messages", "page"],
  "contextKeys": [],
  "hasContext": false,
  "hasEvidenceQuery": false,
  "page": "/dashboard",
  "grade": "S3",
  "language": "en",
  "messageCount": 1
}
```

Conclusion: the visible AI Tutor interface currently cannot present RAG-backed curriculum/textbook/exam evidence unless another caller supplies `context.evidenceQuery` outside the current UI path.

## Issues and Risks

- Adaptive Engine currently fails the requested RAG access criterion: DeepSeek receives adaptive candidate features, not RAG evidence.
- AI Tutor backend passes the criterion only for direct/API callers that include `context.evidenceQuery`.
- AI Tutor frontend fails the criterion because its `TutorContext` type and payload sanitization do not include `evidenceQuery`.
- HK evidence builder intentionally returns a combined pack; even an EDB-leaning query also includes selected textbook and DSE exam-pattern layers. This is useful for breadth, but future UI copy should describe it as a combined safe evidence pack.
- During live dev-server testing, `next dev` intermittently lost `.next` manifest/chunk files after route compilation. The audit worked around this by using fresh isolated dev processes and a production `npm run build`/`next start` pass for UI inspection.

## Recommended Follow-up Implementation

1. Adaptive Engine: inject a bounded, safe RAG summary into `adaptiveLLMFeaturePack`, keyed by `curriculumTrack`, `grade`, and selected candidate topic. Keep the current guarded-rerank policy and do not expose source text, answers, locators, or embeddings.
2. AI Tutor UI: extend frontend `TutorContext` with `evidenceQuery`, preserve it in draft serialization, and generate context-aware evidence queries for dashboard, adaptive-learning, roadmap, lesson, practice, and mistake surfaces.
3. Tests: add non-live regression tests proving Adaptive LLM messages include only safe RAG layer labels/summaries, and AI Tutor UI payloads can carry `evidenceQuery` from owned surfaces.
4. Live QA: keep live DeepSeek probes gated and redacted. Do not run them in default CI.
