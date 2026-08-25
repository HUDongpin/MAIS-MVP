# A16 MAIS Natural CA60 GPT-5.6 Luna V5 registration session

## Session identity

- Lane: `A16` research and learning-science registration.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a16-natural-ca60-gpt56-luna-v5-20260826`.
- Branch: `codex/a16-natural-ca60-gpt56-luna-v5-20260826`.
- Base commit: `07c9a99eb329f253b2aa9ad19f8e8777fa51c656`.
- Owner: A16 session implementing the owner's `2026-08-26` provider and residency decision.
- Target PR: `pending`.
- Creation date: `2026-08-26`.
- Expected closeout date: `2026-08-27`, after the append-only V5 registration slice is verified and handed off.

## Owner-frozen decision

```text
provider = OPENAI
model = gpt-5.6-luna
projectResidency = US_STORAGE_PROCESSING
endpoint = https://us.api.openai.com/v1/responses
```

Official OpenAI documentation was checked before implementation. It identifies `gpt-5.6-luna` as an API model with Responses API and Structured Outputs support, and identifies `us.api.openai.com` as the US storage-and-processing endpoint prefix. Documentation evidence does not prove account entitlement, project residency configuration, credential readiness, provider reachability, observed-model attestation, or billing-route readiness.

## Authorized implementation scope

- Preserve all V1-V4 bytes and build a new append-only `design-v5` package.
- Record the Qwen V4 candidate as `SUPERSEDED_NOT_EXECUTED`, without rewriting it.
- Migrate machine-reference provider contracts, schemas, receipt fields, chronology, authorization templates, and review semantics to OpenAI GPT-5.6 Luna.
- Freeze the owner-selected endpoint and project-residency tuple in V5.
- Use test-first changes and run V1-V5 regression and package-integrity verification.

## Explicit non-authorizations

- No OpenAI, Qwen, or DeepSeek provider request.
- No credential-source access or credential readiness claim in this A16 slice.
- No question-content egress, frame freeze, sample freeze, reference labeling, canary, full execution, scoring, or publication.
- No modification of the A21 runner in this worktree; A21 migration requires a later independent session slice.
- No `main` push, merge, PR, deployment, or live question-bank mutation.

## Evidence boundary

The user decision authorizes a design-registration migration. It is not a hash-bound live provider authorization. Provider authorization remains impossible until the V5 registration, frame, sample, prompt/schema/runner/adapter roots, price snapshot, credential readiness, expiry, and egress evidence exist.

## Implementation record

- Red test confirmed the V5 registration was absent before implementation.
- Added an append-only full-composition V5 design registration; V1-V4 were not edited.
- Added an exact V4 package inventory with the additive disposition `SUPERSEDED_NOT_EXECUTED`.
- Added new OpenAI Responses logical/wire request contracts, five role-bound prompt/schema contracts, provider authorization and receipt schemas, route-preflight schema, and role-output schema.
- Added a V5 statistical-power artifact preserving the `25 + 52 = 77 > 60` structural infeasibility result.
- Added a zero-network semantic validator with tamper cases for provider/model, execution authority, provider events, registration hash, V4 inventory, power, schema, and secret sentinels.
- Kept `ACTIVE-DESIGN-REGISTRATION.json` on V3; no pointer update is part of this slice.
- No provider, credential, natural-question, frame, sample, label, result, or deployment operation occurred.

## Verification record

- V5 focused suite: `20/20` passed.
- V5 semantic CLI: `VALID_SEALED_CANDIDATE`; `active=false`; `executionAuthorized=false`; `providerEvents=0`; `schemas=10`; ceiling `INCONCLUSIVE_MACHINE_REFERENCE`.
- V5 `--require-active`: intentionally failed closed only on `active V5 design pointer is required` and `A11 independent review receipt is required`.
- Full V1-V5 historical regression: `627` tests, `626` passed, `1` failed, duration `1217736.966458ms`.
- Sole historical failure: `versions/design-v2/package-integrity.test.mjs` still expects `ACTIVE-DESIGN-REGISTRATION.json` to point to V2, while the immutable current pointer intentionally points to V3. V3, V4, and V5 tests passed. V2 was not rewritten to conceal this stale assertion.

## Pre-review correction

- A21 integration exposed that candidate revision 1 incorrectly constrained `ProviderAuthorizationV2.runnerCommit` to a 64-hex SHA-256.
- Current repository commits are 40-hex Git SHA-1 object IDs; retaining the old pattern would make a truthful runner-commit authorization binding impossible.
- Before independent review, activation, credential access, or any provider call, V5 candidate revision 2 corrected the pattern to `^[0-9a-f]{40}$`.
- Revision 2 records revision 1 commit `32bab56fac164631ba095a36aafc5eb0c8ee6bc5`, registration hash `74729685c89abf873c3dbf49ec41d429c4107a2b4707167208856648fd9b788b`, and package root `5e8ba0d47de9dcc1fa419dd43bfb1dc424e49d3ebcab47ccc6fa72e86684d7f2` as `SUPERSEDED_PRE_INDEPENDENT_REVIEW`.
