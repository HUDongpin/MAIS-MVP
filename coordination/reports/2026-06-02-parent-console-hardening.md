# Parent Console Robustness Hardening

- Date: 2026-06-02
- Coordinated sessions: S11, S10, S12, S14
- Scope: Parent Console E2E harness, parent message/link validation, route-level write throttling, and storage-model risk assessment.

## Summary

Implemented the first hardening pass after Parent Console stress testing:

- Fixed the normal Parent Console E2E harness so direct SQLite mutations use `HK_MATH_DB_PATH` when an isolated test server is used.
- Changed `startIsolatedApp` to default to current-source `dev` mode instead of silently reusing a potentially stale default `.next` production build.
- Added shared Parent Console text/input constraints.
- Rejected oversized parent message subjects, parent message bodies, and parent replies.
- Rejected invalid parent report IDs instead of silently creating an unlinked thread.
- Rejected invalid parent message categories instead of silently coercing them to `learning-support`.
- Changed invalid `thread` query selection so Parent Console no longer falls back to an unrelated first thread.
- Added route-level parent write throttles for child linking, parent message creation, and parent replies.
- Added UI `maxLength` constraints for invite code, message subject/body, and reply body.

## Storage Model Assessment

Current local/default persistence uses a single serialized `app_state` JSON payload in SQLite. `mutateDatabase` serializes writes inside one Node process, which preserves in-process consistency and kept idempotent child linking correct under stress. The stress result also showed the main weakness: every parent message/link write rewrites a large JSON snapshot, so write bursts have very low throughput.

Observed stress signals before this hardening pass:

- 100 repeated child-link writes completed correctly and stayed idempotent, but took about 63.6 seconds.
- 20 parent-message thread creations took about 24.4 seconds.
- 30 parent replies took about 19.4 seconds.

The new in-memory rate limits are a protective guardrail for this storage model, not the final enterprise-grade answer. They are per-process and reset when a server instance restarts; multi-instance/serverless deployments need a shared limiter.

## Implemented Write Guardrails

- Child link attempts: 10 per parent per 60 seconds.
- Parent message creation: 12 per parent per 60 seconds.
- Parent message replies: 30 per parent per 60 seconds.
- Oversized parent message/reply payloads return 413.
- Invalid report IDs return 404.
- Invalid parent message categories return 400.

## Recommended Next Architecture

For enterprise robustness, move Parent Console write-heavy data out of the monolithic JSON snapshot:

- Store `guardian_links`, `teacher_messages`, and `teacher_message_entries` as relational rows in Postgres.
- Add indexes on `guardian_id`, `student_id`, `class_id`, `last_message_at`, and `thread_id`.
- Use transaction-scoped inserts/updates for message creation and replies.
- Keep child-link idempotency with a unique constraint on `(parent_id, student_id)`.
- Move rate limiting to a shared backend such as Redis/Upstash or a Postgres-backed quota table.
- Add idempotency keys for parent message creation to protect against browser double-submit/retry loops.
- Add audit fields for rejected oversized payloads and repeated invite-code failures without logging private message text.

## Verification

- `npm run type-check` passed.
- `npx playwright test tests/e2e/parent-console.spec.ts --project=desktop-chrome --trace=off --output .tmp/parent-harness-fix-20260602/pw-parent-console` passed: 6/6.
- `PLAYWRIGHT_ISOLATED_FORCE_DEV=1 npx playwright test tests/e2e/parent-console-stress.spec.ts --project=desktop-chrome --grep "parent APIs enforce auth, validation, privacy, and idempotent child linking" --trace=off --output .tmp/parent-harness-fix-20260602/pw-parent-stress-api-force-dev` passed: 1/1.
- After changing `startIsolatedApp` default mode, `npx playwright test tests/e2e/parent-console-stress.spec.ts --project=desktop-chrome --grep "parent APIs enforce auth, validation, privacy, and idempotent child linking" --trace=off --output .tmp/parent-harness-fix-20260602/pw-parent-stress-api-default-dev` passed: 1/1.
- `npm run build` passed.

## Remaining Risk

- The new rate limiter is process-local. It protects local/single-process use, but does not provide distributed quota enforcement.
- Existing unrelated worktree modifications remain present and were not reverted.
- The full `parent-console-stress.spec.ts` suite was not run end to end in this pass; the API-hardening subcase and normal desktop Parent Console suite were run.
