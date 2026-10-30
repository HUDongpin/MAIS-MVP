# Regional AI service-company policy

Owner: /root, A07 provider behavior with A12 routes, A15 adaptive consumers, and A19 configuration boundaries. Branch: `codex/provider-company-policy-20261030`. Worktree: `/Users/dongpinhu/.codex/worktrees/provider-company-policy/MAIS-MVP`. Base: `4532f5a3e2d8c91ad387e3875925fba8a5091b86`. Created: 2026-10-30 Asia/Taipei. Expected closeout: 2026-10-30 PR handoff after CI; retain the open-PR branch and worktree. Target PR: pending creation. The owner subsequently authorized scoped commits, push, PR creation, and related CI fixes; merge, deployment, and real environment changes remain excluded.

The owner confirmed that US-region users may use only US service companies, including US companies hosting non-US/open-weight models. The owner further specified **OpenRouter**, not DeepInfra, as the US generative-AI gateway. Alibaba remains disallowed for US even through a US regional endpoint. HK and Mainland have no service-company restriction. This is a company policy, not an assertion about physical data residency or regulatory acceptance.

Implement a shared strict endpoint/company policy, using authenticated and server-authorized subject/class curriculum context. The trusted stored curriculum region takes precedence over legacy curriculum tracks; genuinely missing region identity remains unresolved through normalization and hot-row persistence. The request body, model name and OpenAI-compatible protocol cannot relax the policy. Unknown context uses the restrictive company allowlist; unknown endpoints are not US-approved. US HTTP requests reject redirects. US text/vision/generation uses explicitly configured OpenRouter models, with a fixed US upstream-provider allowlist and no direct DeepInfra/Alibaba fallback. Mathpix remains an eligible OCR service. Preserve HK/Mainland candidate order and local fallbacks, and report unavailable capabilities when no eligible provider exists. Do not access credentials, alter live environment variables, or make live model calls.

Implementation sequence:

1. Add failing policy tests for company identity, Alibaba US rejection, unknown context, trusted region combination and redirect handling; implement the smallest shared policy.
2. Add scoped provider selection/transport and test actual outbound calls with mocked services, including fallback and missing-key cases.
3. Apply the policy to tutor text/image/retries, optional moderation, voice/speech, lesson audio, OCR, Nova Lens, adaptive, teacher generation/review/grading, and the EdUHK proxy. Preserve local safety and deterministic behavior.
4. Carry trusted subject/class context and make per-user capability status private; do not trust client-supplied region fields.
5. Run focused regressions, relevant existing provider/moderation/analytics/backend checks, type-check and isolated production build. Obtain independent review and preserve material limitations.

Baseline: existing LLM transport and OCR routing suites passed 40 tests on the clean baseline. Dependency files remain unchanged; the worktree uses a local overlay of existing locked dependencies.

Company evidence checked 2026-10-30: [DeepInfra Terms](https://deepinfra.com/terms) identify Deep Infra Inc. as a Delaware corporation; [Mathpix Terms](https://website.mathpix.com/terms) identify Mathpix Inc. as a Delaware corporation; [OpenAI entity list](https://openai.com/policies/sub-processor-list/) identifies its US API entity; [Anthropic transparency](https://www.anthropic.com/transparency/voluntary-commitments/security%26amp%3Bprivacy) identifies its US headquarters. Company labels do not certify processing location, endpoint contract compatibility, key availability or live readiness.

OpenRouter's [terms](https://openrouter.ai/terms) and [enterprise agreement](https://openrouter.ai/terms-of-service-enterprise) identify its US company. Its [routing documentation](https://openrouter.ai/blog/insights/model-routing/) and [provider controls](https://openrouter.ai/blog/insights/ai-data-residency/) distinguish the gateway from upstream inference providers. The request guard pins `only`/`order` to verified US-company slugs and `allow_fallbacks=false`; it does not claim geographic confinement or add an unrequested data-retention policy. Models are explicit `OPENROUTER_TEXT_MODEL`/`OPENROUTER_VISION_MODEL` or `OPENROUTER_MODEL`; no paid model is chosen implicitly.

Review follow-ups include trusted actor propagation through lesson-kit/grading dependencies, server-labelled conversation history, a user/text/policy-bound read-aloud proof, restriction of unidentified browser recognition, explicitly local browser synthesis voices for restricted users, and conservative treatment of another owner's stored OCR image. These close actual alternate egress paths found in review; no raw-text origin inference is attempted.

## Final local verification and handoff

Initial local implementation completed on 2026-10-30 and was retained uncommitted for review. That evidence predates the subsequent commit/push/PR assignment and remains preserved unchanged. The primary checkout remains outside the editing scope; merge, environment activation, and deployment are excluded from the PR handoff.

- Final policy and speech regressions: **49/49 passed**, covering endpoint/company checks, OpenRouter-only generative selection, forbidden-provider zero-call assertions, retries, teacher/subject context, nullable bootstrap/login policy, conflicting stored publishers, browser synthesis, tutor draft/voice proofs, and Nova Lens proof propagation.
- Final auth/session/API boundary regressions: **80/80 passed** using a fresh temporary SQLite fixture. An earlier direct invocation could not open its default database path; the isolated fixture run resolved this harness limitation without modifying application data.
- Final analytics suite: **59/59 passed**.
- Final `npm run type-check` and `git diff --check`: passed.
- Final isolated `npm run build`, run by the backend harness: passed; `NEXT_DIST_DIR` was owned by `provider-company-policy-final-20261030`.
- Final `npm run test:backend -- --workers=1`: **6/6 passed** against that isolated production build, with provider calls disabled and synthetic SQLite data.
- Earlier existing teacher/class/grading/moderation/capacity regression run: **204/204 passed**. Auth tests overlap with the final 80-test boundary run; counts are not additive.
- Independent bounded re-review confirmed all six identified P1/P2 findings resolved. This was source review, not live-provider acceptance.

The final local evidence directory is `.tmp/provider-company-policy-evidence-20261030/`. Its manifest records per-file hashes for the reviewable slice and copies the successful logs. Build/backend artifacts remain in `.tmp/china-lesson-e2e-runtime/runs/provider-company-policy-final-20261030/`.

Operational limits: this implementation uses saved curriculum/account context, not IP geolocation or a data-residency guarantee. Actual OpenRouter credentials and text/vision model IDs were not inspected or activated; they must be explicitly configured through the assigned configuration workflow before live enablement. US generative calls use OpenRouter without a direct DeepInfra fallback; OpenRouter may select only the enumerated US-company upstream providers. Unsupported Qwen speech/TTS is unavailable for US users; browser synthesis requires an explicitly local voice. HK/Mainland retain their existing provider selection. Legacy dialogue without a server-owned region label is excluded from provider history, and old replies without a valid voice proof cannot use the external tutor read-aloud path. No real AI call or live audio/browser-provider acceptance was performed.
