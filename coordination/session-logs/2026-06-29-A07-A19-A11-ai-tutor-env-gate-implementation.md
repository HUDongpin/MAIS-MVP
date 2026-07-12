# 2026-06-29 A07/A19/A11 Session Log - AI Tutor Env Gate Implementation

## Agent IDs

- A07 AI tutor lead: status contract, provider profile behavior, AI Tutor route boundary.
- A19 API configuration and deployment env lead: redacted provider profile documentation.
- A11 QA and release quality lead: deterministic backend regression gate.
- A22 production reliability consumer: release matrix separation between offline regression and live readiness.

## Objective

Implement the accepted enterprise solution for the cross-owner AI Tutor/env gate so deterministic backend regression does not fail when local or production provider credentials exist.

## Write Scope

- `app/api/ai-tutor/status/route.ts`
- `app/api/ai-tutor/route.ts`
- `app/api/ai-tutor/resolve/route.ts`
- `lib/server/llmProvider.ts`
- `lib/server/apiSurfaceSecurity.test.ts`
- `playwright.config.ts`
- `tests/e2e/backend-api.spec.ts`
- `tests/e2e/ai-tutor-deepseek.spec.ts`
- `tests/e2e/ai-tutor-live-text.spec.ts`
- `.env.local.example`
- `coordination/session-logs/2026-06-29-A07-A19-A11-ai-tutor-env-gate-implementation.md`

## Changes

- Replaced the duplicated `/api/ai-tutor/status` resolver with shared A07 `llmProvider` status helpers.
- Added explicit AI Tutor provider profiles: `offline-fixture`, `mocked-live`, `live-smoke`, `production`, and `runtime`.
- Made status readiness runtime-dynamic and no-store so configured state is not baked into a static build artifact.
- Removed the old global status-only configured marker from the A11 Playwright backend harness.
- Set the backend harness to `AI_TUTOR_PROVIDER_PROFILE=offline-fixture`.
- Updated the backend API assertion to verify the offline fixture contract explicitly.
- Made A07 mocked provider tests set `mocked-live`, and live text QA set `live-smoke`.
- Taught the A07 resolver that `offline-fixture` disables provider use even if `.env.local` contains a real key.
- Fixed the AI Tutor edge wrapper so resolver validation and setup errors preserve their original `400`, `503`, and headers instead of being converted to a fallback `200`.
- Added focused AI Tutor route tests for redacted status, offline marker/key isolation, validation error preservation, and setup error preservation.
- Documented provider profiles in `.env.local.example` without adding or exposing any credential values.

## Checks

- `npx tsx --test --test-name-pattern "offline fixture" lib/server/apiSurfaceSecurity.test.ts` - passed.
- `npx tsx --test --test-name-pattern "AI tutor" lib/server/apiSurfaceSecurity.test.ts` - passed, 4 tests.
- `npx tsx --test lib/server/llmProvider.test.ts` - passed, 14 tests.
- `npm run test:backend` - passed, 5 tests.
- `npm run type-check` - passed.
- `git diff --check -- <A07/A19/A11 touched files>` - passed.

## Notes

- No live provider calls were made.
- No real secrets were read from `.env.local`, Vercel, or the API-key DOCX.
- No Git staging, commit, branch, push, reset, clean, or revert was performed.
- A prior full `lib/server/apiSurfaceSecurity.test.ts` run still had an unrelated authenticated question API preview-size assertion failure. The AI Tutor subset in that file is green.
