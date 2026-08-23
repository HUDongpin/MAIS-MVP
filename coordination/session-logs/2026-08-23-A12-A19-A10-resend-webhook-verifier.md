# A12/A19/A10 Resend Webhook Verifier Session

- Date: 2026-08-23
- Agent IDs: A12 backend/API platform; A19 provider configuration; A10 package/config coordination
- Workstream: Resend webhook signature verification and parent-safe event normalization
- Branch: `codex/a12-resend-webhook-verifier-20260823`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-resend-webhook-verifier-20260823`
- Branch owner: A12/A19/A10 borrowed lane
- Target PR: `pending`
- Branch creation date: 2026-08-23
- Expected closeout date: 2026-08-23
- Baseline: `9c622c2d0daf9a15b79bb6b90c28c994837dc803`
- Objective: Add a standalone, test-driven Resend/Svix raw-body verifier that returns only a minimal internal envelope. Storage and route wiring are explicitly deferred.
- Allowed write scope: `package.json`, `package-lock.json`, `lib/server/teacherNoticeResendWebhook.ts`, `lib/server/teacherNoticeResendWebhook.test.ts`, and this session log.
- Forbidden write scope: outbox storage, API routes, UI, environment files, generated outputs, and every other tracked path.
- Intended sequence: inspect existing provider/test conventions; add `svix`; write the full failing contract test; capture the expected RED result; implement the smallest verifier; run focused tests, type-check, import smoke, and exact diff/status review.
- Stop conditions: package/runtime incompatibility, shared-file collision, secret access, or any required edit outside the allowed scope.

## Live status

- Isolated worktree created at the exact baseline.
- No real webhook secret or provider payload will be read, printed, or stored; tests use synthetic signing secrets and payloads only.
- Dependency compatibility: `svix@2.0.0` declares Node `>=22`; the local verification runtime is Node `v24.15.0`, and the consuming formal Vercel project is configured for Node 24.x per the integration owner evidence.

## TDD evidence

- RED command: `node --import tsx --test lib/server/teacherNoticeResendWebhook.test.ts`
- RED result: `0 pass / 1 fail`; expected `MODULE_NOT_FOUND` because the wished-for verifier module did not exist yet.
- Mutation RED proof after the first GREEN: temporarily normalized supported types to `ignored`; the same focused command produced `11 pass / 2 fail` with the precise `email.sent` versus `ignored` assertion diff. The one-line mutation was then removed before the final GREEN run.
- GREEN command: `node --import tsx --test lib/server/teacherNoticeResendWebhook.test.ts`
- Initial GREEN result: `13 pass / 0 fail`; renewed post-review GREEN result: `16 pass / 0 fail`.
- Covered behaviors: exact raw-body binding; 64 KiB UTF-8 limit; Svix header presence, duplication, and syntax; default five-minute old/future rejection; missing, malformed, and wrong secrets; signature-before-JSON behavior; supported lifecycle allowlist; unknown signed event normalization; strict UUID provider message ID; multi-signature rotation; safe allowlisted output with no recipient, subject, HTML, provider headers, payload, or secret echo.

## Verification evidence

- Existing delivery adapter baseline: `node --import tsx --test lib/server/teacherNoticeEmailDelivery.test.ts` -> `20 pass / 0 fail`.
- TypeScript: `npm run type-check` -> exit `0`.
- Dependency resolution: `npm ls svix --depth=0` -> `svix@2.0.0`.
- Direct import smoke: `node --import tsx --eval "import('./lib/server/teacherNoticeResendWebhook.ts')..."` -> exit `0` and exported verifier is a function.
- Import target audit: `npm run check:imports` -> `All local import targets resolved.`
- Diff hygiene: `git diff --check` -> exit `0`; status contains exactly the two dependency manifests, verifier, verifier test, and this session log.
- `npm install svix` reported an aggregate `4 high severity vulnerabilities` for the full installed dependency tree. No broad audit remediation or unrelated package upgrade was attempted inside this bounded slice.

## Handoff

- First independent review result: `NOT READY (0 critical / 2 important / 1 minor)` because timestamp parsing allowed JavaScript calendar normalization, signature-before-JSON precedence lacked a negative regression, and the exact 64 KiB acceptance boundary lacked a regression.
- Remediation RED: after adding the review regressions, the focused suite produced `14 pass / 1 fail`; a signed `2026-02-31T01:02:03.004Z` payload was incorrectly accepted and normalized to `2026-03-03T01:02:03.004Z`.
- Remediation: RFC 3339 components now use explicit numeric ranges plus a Gregorian calendar component round-trip before offset conversion. Impossible dates, `24:00`, invalid minute/second values, non-leap February 29, and invalid numeric offsets fail closed. Valid leap days and positive/negative offsets normalize to the canonical UTC instant.
- Added precedence proof: malformed signed JSON with either a wrong configured secret or a one-character tampered signature returns only `signature-verification-failed`, establishing verification before parse.
- Added body-boundary proof: an exactly `65,536`-byte valid signed JSON payload is accepted, while larger UTF-8 input is rejected.
- Remediation GREEN: the final focused verification reports `16 pass / 0 fail`; final type-check, direct import smoke, import-target audit, and diff check all exit `0`.
- Status: Implemented and locally verified; intentionally uncommitted and unpushed pending renewed independent specification and security review.
- Storage, replay-event persistence, monotonic outbox state transitions, route wiring, webhook registration, and live-secret placement are not part of this slice.
- Build not run: the helper is deliberately not route-wired in this slice; the integration candidate must run the clean build after route/storage composition.
