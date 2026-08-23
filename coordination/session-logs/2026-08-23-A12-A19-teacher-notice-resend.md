# A12/A19 single-recipient teacher-notice Resend adapter

- Owner: A12 backend/API platform, with A19 environment-provider coordination
- Branch: `codex/a12-teacher-notice-resend-20260823`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-teacher-notice-resend-20260823`
- Original baseline: `c5335f42ac892670374a7025cbfc627f50d083a4`
- Revision base: `35b48004eb479a9d5320cfaa71f2353199baed17`
- Target PR: pending
- Creation date: 2026-08-23
- Expected closeout date: 2026-08-24

## Declared slice

- Refactor the provider adapter to one recipient and exactly one provider request.
- Add focused unit tests for privacy minimization, strict configuration, URL and address validation, localization, idempotency, bounded response parsing, timeout behavior, and safe provider-error classification.
- Document only the server-side configuration names in `.env.local.example`.
- Do not integrate the adapter into notice persistence, an outbox, a route, shared DTOs, or UI.
- Do not send a real email, use a real Resend credential, mutate Vercel, or deploy.

## Adapter contract

- The only delivery input fields are `recipientId`, `email`, `locale`, `durableDeliveryKey`, and `contentRevision`. Runtime objects with extra notice, class, teacher, or student fields fail closed before provider contact.
- Supported locales are exactly `en`, `zh-Hant`, and `zh-Hans`.
- The provider payload is an allowlist of `from`, one-address `to`, fixed localized `subject`, fixed localized minimal `text`, and fixed localized minimal `html`.
- Teacher-authored body text, class names, student data, and internal model or persistence diagnostics cannot enter the payload through this adapter.
- The acknowledgement URL is built only from a canonical HTTPS `TEACHER_NOTICE_BASE_URL` equal to `TEACHER_NOTICE_ALLOWED_ORIGIN`. It always uses `/parent/notices`, exactly one `recipientId` query key, and no fragment.
- The adapter accepts only `TEACHER_NOTICE_RESEND_API_KEY`. It never falls back to the shared `RESEND_API_KEY`, even if unrelated shared-key flags or allowlists are present.
- The idempotency header is an opaque SHA-256 derivation over the durable delivery key, recipient id, and content revision. It stays stable across deployment, sender, origin, locale-template, and recipient-address drift. If a caller changes the payload without raising `contentRevision`, Resend receives the same key with a different payload and can fail closed with `invalid_idempotent_request` instead of sending a duplicate.
- Successful provider responses require a canonical UUID. Provider responses are read through an 8 KiB bound; raw response messages and unknown error names never enter the result.
- Stable outcomes are `accepted`, `deferred`, `ambiguous`, `terminal-failure`, `configuration-blocked`, and `disabled`.
- `409` concurrent/locked conditions defer, invalid idempotency is terminal, and an unknown conflict is ambiguous. `429` rate limiting defers while daily/monthly quota exhaustion blocks configuration. `401` is authentication configuration; `403` distinguishes restricted or suspended credentials, explicit permission denial, sender/domain validation, security policy, and an unknown-name generic permission block; `451` is a security-policy block. `408`, `425`, `5xx`, timeout, and transport loss are ambiguous because the provider may have committed the request.
- The adapter performs no batch loop, retry loop, sleep, database operation, persistence mutation, route handling, or UI work.

## Provider contract sources

- Resend Send Email API: `https://resend.com/docs/api-reference/emails/send-email`
- Resend Idempotency Keys: `https://resend.com/docs/dashboard/emails/idempotency-keys`
- Resend API introduction and response codes: `https://resend.com/docs/api-reference/introduction`
- Resend error reference: `https://resend.com/docs/api-reference/errors`
- Resend rate-limit response headers: `https://resend.com/changelog/api-rate-limit`

## TDD evidence

- Export contract RED: focused run had 13 tests, 12 passed and 1 failed because `deliverTeacherNoticeEmail` was absent.
- Minimal export GREEN: the same 13 tests passed after adding only the singular function skeleton.
- Full contract RED: the replacement 19-test suite ran against that skeleton with 1 passed and 18 expected failures.
- Full contract GREEN: the implementation then passed all 19 focused tests.
- Independent quality review then returned `NOT READY`. Four review-driven tests produced a fresh 16/20 RED for: shared-key rejection, deployment-stable idempotency, `403 validation_error` classification, and rejected response-cancellation containment.
- After the security amendments, the focused suite returned 20/20 GREEN.
- The follow-up quality review identified the official `suspended_api_key` and `invalid_permission` names missing from the exact provider allowlist. New `403` fixtures produced a fresh 19/20 RED because a suspended key was classified as a generic permission denial.
- After adding both exact names, `suspended_api_key` maps to the stable authentication-failure outcome, `invalid_permission` maps explicitly to permission denial, and unknown `403` names remain generically fail closed. The same focused suite returned 20/20 GREEN.

## Fresh verification

- Latest post-review focused provider adapter run, including official `suspended_api_key` and `invalid_permission` fixtures: 20 passed, 0 failed.
- Latest provider plus password-reset, parent notice acknowledgement, parent notice persistence, and teacher notice persistence regression: 55 passed, 0 failed.
- `npm run type-check`: exit 0.
- `npm run check:imports`: all local import targets resolved.
- Earlier, before the two-name `403` follow-up, `npm run test:parent-console` could not establish macOS process-birth identity in the sandbox and failed in unrelated `with-next-env-restore` tooling tests; the approved non-sandbox rerun passed 69/69 tooling tests and 265/265 parent-console runtime tests with 0 skipped. This broad gate was not rerun for the two-name-only amendment.
- `git diff --check`: exit 0 before exact-path staging.
- No real provider request, real credential access, environment mutation, Vercel change, deployment, production-domain action, or Git integration occurred during verification.

## Explicit integration boundary

- This slice does not create or claim a durable outbox. A future persistence-owned integration must atomically create one durable delivery record per recipient, freeze the exact locale and payload revision, and retain the same durable delivery key across every ambiguous retry.
- This adapter has no class input and no shared-key fallback. A future shared-key capability must be a separate restricted integration interface that proves the exact class and recipient are allowlisted before it can invoke delivery.
- `accepted` means Resend returned a valid provider UUID. It does not prove inbox delivery, parent acknowledgement, or a successful persistence writeback.
- `ambiguous` must not be converted into a new delivery key. It requires status reconciliation or a retry with the identical frozen payload and key.
- Partial batch failure semantics, retry scheduling, attempt history, delivery leases, reconciliation, recipient revocation revalidation, and acknowledgement persistence remain outbox/persistence responsibilities outside this slice.

## Final state

- Reviewable amendment remains uncommitted on the same branch pending independent spec and quality re-review. No commit or push has occurred.
