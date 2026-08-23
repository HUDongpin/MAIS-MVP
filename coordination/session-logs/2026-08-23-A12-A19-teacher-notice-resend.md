# A12/A19 teacher-notice Resend provider module

- Owner: A12 backend/API platform, with A19 environment-provider coordination
- Branch: `codex/a12-teacher-notice-resend-20260823`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-teacher-notice-resend-20260823`
- Baseline: `c5335f42ac892670374a7025cbfc627f50d083a4`
- Target PR: pending
- Creation date: 2026-08-23
- Expected closeout date: 2026-08-24

## Declared slice

- Add one provider-neutral, injected-fetch teacher-notice email module.
- Add focused unit tests for its environment, privacy, idempotency, and provider-error contracts.
- Document the new server-only variables in `.env.local.example`.
- Do not integrate the module into `userStore`, teacher notice persistence, shared types, UI, E2E, Vercel, or any real environment in this slice.
- Do not send real email or expose credential values.

## Baseline evidence

- Adjacent password-reset and teacher-notice persistence tests: 16 passed, 0 failed.
- `npm run type-check`: exit 0.

## Provider contract sources

- Resend Send Email API: `https://resend.com/docs/api-reference/emails/send-email`
- Resend Idempotency Keys: `https://resend.com/docs/dashboard/emails/idempotency-keys`
- Resend API introduction and response codes: `https://resend.com/docs/api-reference/introduction`
- Resend error reference: `https://resend.com/docs/api-reference/errors`
- Resend rate-limit response headers: `https://resend.com/changelog/api-rate-limit`

Verified contract used by this slice:

- `POST https://api.resend.com/emails` with server-side bearer authorization and a JSON email payload.
- One `Idempotency-Key` per recipient delivery; the same key and payload can safely be retried within Resend's documented 24-hour window. Keys are capped by Resend at 256 characters.
- `409`, `422`, `429`, `5xx`, timeout, and transport failures require distinct stable outcomes; `Retry-After` is exposed as seconds when Resend provides it.

## TDD and verification evidence

- Focused tests were observed failing before implementation for the missing module, missing configuration, class allowlist, private recipient requests, HTTP error mapping, transport containment, request and response-body timeout aborts, invalid input, malformed provider responses, and rate-limit batch deferral.
- Final focused test: 12 passed, 0 failed.
- Adjacent password-reset and teacher-notice persistence tests: 16 passed, 0 failed.
- `npm run type-check`: exit 0.
- `npm run check:imports`: all local import targets resolved.
- No real provider request, environment mutation, Vercel change, deployment, or production-domain action occurred.

## Final state

- Reviewable commit; final commit SHA and upstream push evidence are reported in the handoff.
