# 2026-06-29 A07/A19/A11 Session Log - AI Tutor Env Gate Proposal

## Agent IDs

- A07 AI tutor lead: status contract and provider behavior ownership.
- A19 API configuration and deployment env lead: redacted provider readiness and env profile ownership.
- A11 QA and release quality lead: deterministic backend regression gate ownership.
- A22 production reliability and release engineering lead: release matrix consumer.

## Objective

Propose an enterprise-level implementation plan for the cross-owner AI Tutor/env gate that made `npm run test:backend` fail after the A12 hot-table work.

## Write Scope

- `coordination/reports/2026-06-29-A07-A19-A11-ai-tutor-env-gate-enterprise-solution.md`
- `coordination/session-logs/2026-06-29-A07-A19-A11-ai-tutor-env-gate-proposal.md`

## Evidence Reviewed

- `app/api/ai-tutor/status/route.ts`
- `app/api/ai-tutor/route.ts`
- `app/api/ai-tutor/resolve/route.ts`
- `lib/server/llmProvider.ts`
- `playwright.config.ts`
- `tests/e2e/backend-api.spec.ts`
- `tests/e2e/ai-tutor-deepseek.spec.ts`
- `tests/e2e/ai-tutor-live-text.spec.ts`
- `tests/e2e/isolated-app.ts`
- `package.json`

## Root Cause Summary

The backend regression harness blanks provider keys but also sets `AI_TUTOR_STATUS_ASSUME_QWEN_CONFIGURED=1`. The AI Tutor status route treats that marker as configured readiness, while `tests/e2e/backend-api.spec.ts` expects `configured: false`. The route is also static/revalidated, which makes environment readiness vulnerable to build-time drift.

## Output

Created an enterprise implementation proposal that splits the work into:

- A11 deterministic offline backend regression profile.
- A07 mocked-live provider contract profile.
- A19 live provider readiness smoke profile.
- A22 release matrix integration.

## Checks

- No live provider calls were made.
- No secrets were read from `.env.local`, Vercel, or the API-key DOCX.
- No Git staging, commit, branch, push, reset, clean, or revert was performed.

## Handoff Notes

- Recommended first patch is A11/A07-owned: remove the global status-only configured marker from `playwright.config.ts`, add an explicit offline provider profile, and make `/api/ai-tutor/status` runtime-dynamic with a shared A07 provider resolver.
- A19 should only run live readiness smoke after explicit owner authorization because it may use real provider credentials and incur cost.
- A22 should record offline backend regression and live AI readiness as separate release evidence lines.
