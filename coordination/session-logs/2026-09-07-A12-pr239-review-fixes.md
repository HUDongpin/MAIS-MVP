# A12/A13 PR239 review fixes — isolated candidate

- Owner: A12/A13, delegated implementation by `/root/fix_pr239`; root retains independent spec/quality review and publication decisions.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a12-pr239-review-fixes-20260907`.
- Git directory: `/Volumes/Starship/MAIS-MVP/.git/worktrees/a12-pr239-review-fixes-20260907`; common directory: `/Volumes/Starship/MAIS-MVP/.git`.
- Branch: `codex/a12-pr239-review-fixes-20260907`.
- Base/HEAD: `c2abd47903dc7614c7a231fc61211ecfa8556d22`.
- Creation date: 2026-09-07. Expected closeout date: 2026-09-08.
- Target PR: #239, through a separate root publication decision.
- Assigned scope: parent production acceptance teacher registration/reuse, raw teacher invite input length, and the new Simplified Chinese copy regression. Root subsequently authorized the bounded A11 backend harness identity-header repair described below. Changes remain uncommitted for review.
- Applicable task instructions override the older candidate AGENTS.md unconditional commit/cleanup templates. The current supplied contract and root assignment govern this bounded slice.

## Changes

1. Parent production acceptance first authenticates the deterministic synthetic teacher. An existing teacher is reused without an invite. Only an explicit login 401 permits registration; a new teacher then requires `MAIS_PARENT_SYNTHETIC_TEACHER_INVITE_CODE`. The registration POST includes this single code, retains the server gate, and preserves the 409 login fallback for a registration race. Other login failures stop immediately. Student and parent registration contracts remain the same.
2. The protected `production-health` workflow can supply the optional synthetic teacher invite secret. Runtime loading accepts one strictly formatted token and excludes unrelated credentials. No invite appears in dispatch inputs, command-line arguments, or acceptance reports. RELEASE.md records the separate A19 configuration dependency; no live secret was read, provisioned, or changed.
3. The server and client share `TEACHER_INVITE_CODE_MAX_SUBMITTED_LENGTH = 53`. The normalized token remains exactly `tinv_` plus 32 lowercase hexadecimal characters. Up to 16 surrounding whitespace characters can reach the existing server trim; embedded whitespace and oversized raw submissions remain invalid.
4. The new Simplified Chinese teacher invite help changes `账户` to the established `账号` term. No audit baseline is raised.

## Verification and retained evidence

Evidence paths below are relative to this candidate.

| Check | Result | Evidence |
| --- | --- | --- |
| TDD focused tests before implementation | 10 passed, 7 failed, 17 total. Failures include truncated whitespace input, absent workflow/runtime invite wiring, and teacher establishment against a fixture that returns 403 before duplicate lookup. | `.tmp/pr239-review-fixes/targeted-red.log` |
| Same focused tests after implementation | 17/17 passed, zero skipped. Covers new/existing/racing teachers, missing invite, non-401 login failure, redacted reporting, client whitespace, and strict server grammar/bounds. | `.tmp/pr239-review-fixes/targeted-green.log` |
| Parent console manifest and gate contract | 15/15 passed. Existing parent runtime/static declaration counts remain unchanged. | `.tmp/pr239-review-fixes/manifest-green.log` |
| Full project `npm run type-check` | Passed initially and again after the final A11 harness changes. | `.tmp/pr239-review-fixes/type-check.log`, `type-check-final.log` |
| `npm run audit:zh-hans:strict` | Passed; shipped critical count returned from 49 to the existing 48 ceiling; advisory count remains 3512/3512. | `.tmp/pr239-review-fixes/zh-hans-red.log`, `zh-hans-green.log` |
| Initial native `npm run test:backend` | 4/6 passed, including actual teacher registration missing/invalid/accepted invite behavior; two identity-constraint failures are detailed below. | `.tmp/pr239-review-fixes/backend.log` |
| Final native `npm run test:backend` after A11 repair | **6/6 passed**, including Nova disabled-provider, rate-limit fallback, quota, password reset, and provisioned password-change assertions. | `.tmp/pr239-review-fixes/backend3.log` |
| Initial native isolated Next build used by backend | Compilation/build completed, BUILD_ID `Tb23MF9rPjKLBWXKW_VTN`. The generated attestation records `sourceTreeClean=false` and `sourceTreeStable=false`; this establishes local buildability only, not release readiness or an exact stable release source. | `.tmp/china-lesson-e2e-runtime/runs/pr239-review-fixes-20260907/next-dist/mais-build-attestation.json` |
| Three-language browser regression | Passed English, Simplified Chinese, Traditional Chinese. Student/parent field absence, teacher password type, autocomplete off, 53-character real typing limit, and untruncated mocked registration submission verified. Simplified Chinese help text asserted. Screenshot visually inspected. | `.tmp/pr239-review-fixes/browser-whitespace-final.log`, `browser-whitespace.mjs`, `register-en.png`, `register-zh-Hans.png`, `register-zh.png` |
| Existing identity-guard diagnostic tests | 14/14 passed across AI Tutor expected-user, password-change session revision, and shared expected-user guard tests, including the missing-constraint rejection behavior. | `.tmp/pr239-review-fixes/identity-guard-diagnostic.log` |
| Diff whitespace check | Passed. | `git diff --check`, using literal candidate Git/worktree targeting |

Native backend invocation used `PLAYWRIGHT_PORT=3419`, `PLAYWRIGHT_RUN_ID=pr239-review-fixes-20260907`, `NODE_OPTIONS=--max-old-space-size=8192`, literal Git environment binding, and `npm run test:backend`. The repository-native generated tree under `.tmp/china-lesson-e2e-runtime/runs/pr239-review-fixes-20260907` contains task-owned synthetic SQLite, reports, screenshots, video, and traces. Root explicitly authorized the native path and synthetic local database writes. Providers were disabled by the repository's offline fixture profile. The supplemental browser test reused this built app with intercepted registration and a separate task-owned SQLite path.

The first isolated build attempt stopped before Next compilation because sandboxed `ps` could not establish process birth identity (`build.log`). Authorized escalation allowed the native process checks and localhost server. The first supplemental browser attempt reached a server already stopped by the completed backend run; the second omitted the form's required confirmation-password fixture field. Both diagnostic logs are retained (`browser-whitespace.log`, `browser-whitespace-green.log`). The corrected fixture passed all three languages. The supplemental server PID 98537 was verified at this candidate's physical path and gracefully terminated after verification.

## Backend failures and causal limits

Both failing network responses carry only the recorded diagnostic code `authenticated-user-changed` and HTTP 409:

- `tests/e2e/backend-api.spec.ts:854` expects a disabled-provider 503 from `/api/ai-tutor`, but its body has only `input`, `context`, `grade`, `language`, `page`; there is no `expectedUserId` in the body, query, or identity header. `guardAiTutorExpectedUser` rejects missing identity before policy/provider processing.
- `tests/e2e/backend-api.spec.ts:1555` expects 200 from a provisioned student's `/api/auth/password-change`, but its body has only `currentPassword` and `password`, with no identity constraint. `app/api/auth/password-change/handler.ts` invokes the identity guard with `requireConstraint: true`, before changing the password.

The trace request/response evidence and current guard implementations establish these missing-constraint causes. At the initial 4/6 run, these guard files and failing requests were unchanged by this slice. No separate base checkout backend run was performed, so this record does not claim a historical baseline execution. Root subsequently assigned the specific harness correction recorded below; the guard implementations remain unchanged.

## A11 bounded harness followup

At the first A11 followup, root extended this same candidate's scope to fix the two demonstrated request-identity omissions in `tests/e2e/backend-api.spec.ts`, initially limiting the change to request identity without assertion adaptation. Using the existing `expectedUserHeaders` helper, the two disabled-provider requests and the following rate-limit request now carry `student.userId`; the quota request carries its separate `quotaStudent.userId`; provisioned password-change carries `temporaryLogin.user.id`. At that intermediate point, the original 503/429/quota/password assertions remained intact.

A new native six-case backend run used port 3419 and run ID `pr239-review-fixes-backend2-20260907`, with fresh task-owned build/SQLite and the same mocked-provider environment. Result: **5/6 passed**. Both Nova 503 assertions now pass, and the entire teacher/classroom/admin case including provisioned password-change passes. The log is `.tmp/pr239-review-fixes/backend2.log`; native artifacts are under `.tmp/china-lesson-e2e-runtime/runs/pr239-review-fixes-backend2-20260907`. The new local build ID is `S10i8iVElOtyhesXDU29c`, bound in its attestation to unchanged HEAD `c2abd47903dc7614c7a231fc61211ecfa8556d22` with `sourceTreeClean=false` and `sourceTreeStable=false`. These remain local verification artifacts, not release readiness.

The new downstream failure is `backend-api.spec.ts:866`: its third authenticated Nova request expects HTTP 429 but receives HTTP 200 with `mode: rate-limit-fallback`. Trace evidence confirms this response. Current `app/api/ai-tutor/resolve/route.ts:2193-2216` returns the fallback JSON without a status override and includes `Retry-After`, `RateLimit-Remaining: 0`, and `RateLimit-Reset`. This assertion was previously unreachable behind the missing-identity 409. At that intermediate point, the bounded followup forbade assertion/product changes, so the unchanged 429 assertion and its current-source evidence were routed to root. Original 4/6 evidence is preserved. The native harness stopped its owned server after the rerun; port 3419 was clear.

Root then authorized the exact current-contract assertion repair. The test now requires HTTP 200 and `mode: rate-limit-fallback`, a positive integer `Retry-After`, `RateLimit-Remaining: 0`, a numeric `RateLimit-Reset`, and no `X-MAIS-AI-Provider` response header. It waits for the prior two disabled-provider journal writes, then verifies the only newly journaled record for the rate-limited user is `AI Tutor rate limit exceeded`, with prompt, completion, and total token fields all null. This corroborates the implemented early return before provider work under the already-asserted offline fixture profile. The quota branch was checked against current source before rerunning: HTTP 200, `quota-exceeded`, and the 200,000,000-token limit remain the intended contract, so those assertions were unchanged. No product behavior, limit, or baseline was changed.

Final native run `pr239-review-fixes-backend3-20260907` passed **6/6** in 2.0 minutes. All original test cases ran with zero skipped. Log: `.tmp/pr239-review-fixes/backend3.log`; owned artifacts: `.tmp/china-lesson-e2e-runtime/runs/pr239-review-fixes-backend3-20260907`. Final local build ID: `kFqzM6gv58xY1fdAGKyHQ`; attestation HEAD remains `c2abd47903dc7614c7a231fc61211ecfa8556d22`, with `sourceTreeClean=false` and `sourceTreeStable=false`. These remain local build/test evidence. The native harness stopped its owned server; port 3419 was clear. The initial 4/6 and intermediate 5/6 logs/traces/builds remain preserved.

## Remaining boundaries

Implementation and the complete local six-case backend gate are complete and ready for root's independent quality review. Root reported independent spec rereview PASS, including the A11 harness changes; the candidate author does not supply independent approval. New synthetic teacher production registration remains configuration-dependent on A19 supplying the protected invite secret and its matching deployed server allowlist. Production acceptance itself was not run. No stage, commit, branch mutation, push, merge, deployment, real environment/provider/database write, external message, original-worktree modification, or evidence deletion was performed.

## Final A25 intake supplement

After the implementation and independent source quality pass, strict intake identified two unmapped assigned files. owner-pathspecs.json now maps only .github/workflows/parent-production-acceptance.yml to existing A22-production-workflows and lib/teacherInviteCodeContract.ts to existing A12-backend-api-storage, with matching expected-owner resolution checks. Existing mappings, policies and runtime behavior are unchanged. Native manifest validation passed36checks. The final candidate contains13paths including this ownership metadata file; the earlier12-file manifest remains valid as pre-intake evidence, and the final13-file manifest in the parent integration evidence directory describes current delivery. No application/test rerun is inferred from this metadata-only addition.
