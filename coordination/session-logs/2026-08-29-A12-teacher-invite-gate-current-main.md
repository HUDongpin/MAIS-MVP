# 2026-08-29 A12 — Teacher self-registration invite gate forward-port

## Session identity

- Primary lane: A12 backend/API platform
- Coordinated surfaces: A08 provider contract, A09 bilingual/accessibility copy, A10 test/config manifest, A11 regression coverage, A19 redacted environment-variable contract, A25 release intake
- Branch: `codex/a12-teacher-invite-gate-current-main-20260829`
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-teacher-invite-gate-current-main-20260829`
- Fixed baseline: `baca84e77abae1e16cfd53d497c6f7ee734d4679`
- Source of the selected idea: local `security/phase0-auth-hardening` at `96f35faf6be5a8eed6a202b2d7e4f69547840d15`
- Target PR: pending
- Created: 2026-08-29
- Expected closeout review: 2026-08-29

## Selected value and exclusions

The legacy source branch was 680 commits behind and one commit ahead of the current baseline. Only the teacher self-registration invite boundary was forward-ported. The legacy branch's session-cookie, middleware, demo-account, release-documentation, and other authentication changes were deliberately excluded.

The selected slice:

- refuses teacher self-registration when no server-only invite code is configured;
- returns stable private 403 codes for closed, missing, and invalid invites;
- bounds raw input before normalization and compares SHA-256 digests with `timingSafeEqual` across every configured candidate;
- applies the gate after the existing registration IP limiter and before storage/user creation;
- collects and sends an invite only for teacher registration;
- keeps configured values out of responses, persistence, logs, source control, and client bundles;
- provides one fixed non-secret code only to local Playwright/isolated-app fixtures;
- leaves student and parent registration behavior unchanged.

No real invite code or credential was read, copied, logged, staged, or configured. Production/self-service enablement remains an A19-owned, separately authorized environment operation. With `TEACHER_INVITE_CODES` absent or empty, the new behavior is intentionally fail-closed.

## Review and verification

- Independent specification review: PASS; no missing or extra requirements.
- Independent code-quality/security review: PASS; no Critical, High, Medium, or Low findings.
- `npm run test:parent-console`: 76/76 tooling contracts and 406/406 compiled runtime tests passed.
- Focused Playwright `teacher self-registration requires the configured invite code`: 1/1 passed, covering missing, invalid, and accepted requests against the built app.
- `npm run type-check`: passed.
- `npm run test:release-governance`: 91 passed, 0 failed, 11 existing Promotion Shadow skips.
- `npm run test:prod-certification`: 24/24 passed.
- `git diff --check`: passed.

Two broad-suite failures encountered while isolating the runtime test are pre-existing current-main contract mismatches outside this slice: Analytics expects an LRS status that the current route does not return, and the AI Tutor assertion expects 503 while the current route returns 409. No related assertion or product code was weakened or changed.

## Claim ceiling and next gate

This package proves a reviewed current-main forward-port and local verification only. It does not prove a PR, merge, provider configuration, deployment, production behavior, browser-completed registration UI journey, one-time/revocable invite records, or administrator-issued durable invites. Before any merge or deployment, the branch still requires normal PR review, required GitHub checks, and a separate A19 decision on whether a target environment should remain closed or receive owner-approved server-only invite codes.
