# S19 Password Reset Resend Vercel Environment Plan - 2026-06-07

## Decision

- Owner selected password reset delivery scheme A: Resend.
- Webhook path is not the active path for the next Vercel launch unless the owner changes direction.

## Vercel Environment Variables To Configure

Configure these server-side environment variables for Vercel before the production launch:

| Variable | Required | Target environments | Secret handling | Notes |
| --- | --- | --- | --- | --- |
| `RESEND_API_KEY` | Yes | Production; Preview if testing reset delivery before production | Secret; never log, commit, screenshot, or print | Resend API key for sending reset email. |
| `PASSWORD_RESET_FROM` | Yes | Production; Preview if testing reset delivery before production | Non-secret but still keep server-side | Must use a Resend-verified sender/domain. |
| `PASSWORD_RESET_BASE_URL` | Yes | Production; Preview should use preview/public test origin when testing | Non-secret | Public app origin used in emailed `/reset-password?token=...` links. Do not use localhost for production. |
| `HK_MATH_EXPOSE_LOCAL_RESET_LINKS` | Yes | Production and Preview production-like tests | Non-secret | Set to `false` so production users receive email instead of relying on local reset-link exposure. |

## Current Redacted Inventory

- Approved local credential source `All API Keys.docx`: present.
- `RESEND_API_KEY`: configured in Vercel Production from the approved DOCX source; value not printed.
- `PASSWORD_RESET_FROM`: configured locally and added to Vercel Production; value not printed.
- `PASSWORD_RESET_BASE_URL`: configured locally and added to Vercel Production; value not printed.
- `HK_MATH_EXPOSE_LOCAL_RESET_LINKS`: present locally and added to Vercel Production; value not printed.
- No real credential values were copied, printed, logged, staged, or written.
- The owner pasted a Resend key in chat on 2026-06-07. That chat-exposed value was not written to `.env.local`, Vercel, logs, or reports. The final Vercel write used the approved DOCX source through stdin.

## Vercel Configuration Procedure

Current status: S19 has safely configured every required password-reset Production variable. Before any true production publish:

1. Keep `npm run release:env-preflight -- --json` passing.
2. If Preview verification is required, add the same variable names to Preview; set `PASSWORD_RESET_BASE_URL` to the preview/public test origin or an approved staging domain.
3. Redeploy the target Vercel environment only after owner/S22 confirm clean release source and `npm run release:publish-preflight` passes.

## Validation After Deployment

Use a controlled account with a real email address:

1. Confirm the target environment has `HK_MATH_EXPOSE_LOCAL_RESET_LINKS=false`.
2. Submit `/forgot-password` using that account email or username.
3. Confirm the API returns `delivery: "sent"` and `deliveryChannel: "resend"`.
4. Confirm the email arrives and its reset link origin matches `PASSWORD_RESET_BASE_URL`.
5. Use the reset link once to set a new password.
6. Confirm the old password fails and the new password succeeds.

## Optional Local Resend Smoke Test

The repo includes a local quickstart smoke helper:

```bash
RESEND_API_KEY=re_xxxxxxxxx npm run smoke:resend:local -- --dry-run
```

Replace `re_xxxxxxxxx` with the real API key only in a private shell or secure environment variable store. The dry run prints the sample payload without sending mail. Remove `--dry-run` only when ready to send the Resend quickstart sample email.

## Owner Input Still Needed

- Confirmation that the sender configured for `PASSWORD_RESET_FROM` is verified in Resend.
- Confirmation that the configured `PASSWORD_RESET_BASE_URL` is the final public production origin.
- Owner/S22 confirmation that the release source is clean/reviewed before any true production publish.

## Continuation Note

During continuation, the owner pasted a Resend key in chat. S19 did not copy that key into commands, files, logs, or Vercel. Because the key is now chat-exposed, rotate/revoke it before Production use and add the fresh key directly in Vercel Production or through the approved local secure credential source.

## Final Blocked Status

Current redacted verification shows `RESEND_API_KEY` present in Vercel Production after reading the owner-approved DOCX source and adding it through stdin without printing the value. The three non-secret password-reset variables are also present for Production. `npm run release:env-preflight -- --json` passes. `npm run release:publish-preflight -- --json` still fails on the S22 clean release-source gate, so do not publish until owner/S22 confirm a clean reviewed release source.

## Resolution Update

- `RESEND_API_KEY`: configured in Vercel Production from `All API Keys.docx`; value redacted.
- `npm run release:env-preflight -- --json`: passed with all required Production env variables present.
- `npm run release:publish-preflight -- --json`: failed only because direct root deploy is blocked by the dirty worktree; no S19 env blocker remains.
