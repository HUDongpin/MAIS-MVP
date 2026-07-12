# 2026-06-06 S11 Forgot Password Recovery Smoke

- Session ID: S11
- Scope: QA verification for `http://localhost:3000/forgot-password`
- Result: PASS for local/dev account recovery, with a production-delivery caveat.

## Tested Requirements

- A known student account can request a password reset from `/forgot-password`.
- The reset request creates a tokenized `/reset-password?token=...` link in the current local/dev environment.
- The reset page accepts matching new passwords and completes the reset.
- The recovered account can sign in with the new password.
- The old password is rejected after reset.
- Used reset tokens cannot be reused.
- Unknown identifiers get the generic success response and no local reset URL.

## Evidence

- API happy path against `http://localhost:3000`:
  - Registered generated test user `forgot-smoke-*`.
  - `POST /api/auth/password-reset/request` returned `200`, exposed a local reset URL, and returned `delivery: "not-configured"`.
  - `POST /api/auth/password-reset/confirm` returned `200` for the generated token and matched the test user.
  - Old password login returned `401`.
  - New password login returned `200`.
  - Reusing the same reset token returned `400`.
  - Unknown identifier reset request returned `200` and did not expose a reset URL.
- Browser UI path against `http://localhost:3000/forgot-password`:
  - Registered generated test user `forgot-ui-*`.
  - Submitted the forgot-password form with the generated username.
  - Local reset link became visible.
  - Opened the reset link, entered matching new passwords, submitted the form, and reached `/dashboard`.
  - Independent API login check confirmed the UI reset really changed the password: old password `401`, new password `200`.
  - Browser console logs had no captured errors during the final state inspection.

## Caveat

The local/dev recovery path works because this environment exposes a local reset link. The reset request response reported `delivery: "not-configured"`, meaning this localhost run did not send email through Resend or a password-reset webhook. For real production users to recover passwords without a local link, production needs one of the supported delivery paths configured:

- `RESEND_API_KEY` plus `PASSWORD_RESET_FROM`, or
- `PASSWORD_RESET_WEBHOOK_URL`.

Without one of those production delivery paths, the API intentionally returns a generic success message, but the user would not receive a reset link.

## Checks Not Run

- Full `npm run type-check` was not rerun in this S11 pass. A previous run in the same workspace was blocked by unrelated errors under the untracked `MAIS-MVP-california-practice-beta-clean/` directory.
- No production email/webhook send was attempted, to avoid sending test mail and because the task targeted localhost.
