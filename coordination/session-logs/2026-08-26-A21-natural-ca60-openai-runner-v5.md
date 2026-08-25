# A21 MAIS Natural CA60 OpenAI runner V5 migration session

## Session identity

- Lane: `A21` content-pipeline and protected execution-runner implementation.
- Worktree: `/Volumes/Starship/MAIS-MVP/.worktrees/a21-natural-ca60-openai-runner-v5-20260826`.
- Branch: `codex/a21-natural-ca60-openai-runner-v5-20260826`.
- Base commit: `8da7ce2719c8101034e31bb880dc6890ab8a67da`.
- V5 registration hash at base: `e240f1fb1af588fb3dbf085b8f57af1c41635bdb8576be8019838d4512fa0632`.
- Owner: A21 session implementing the owner-selected GPT-5.6 Luna reference route.
- Target PR: `pending`.
- Creation date: `2026-08-26`.
- Expected closeout date: `2026-08-27`.

## Write scope

- `coordination/content-qa/mais-natural-ca60-v1/`
- this A21 session log

## Implementation boundary

- Migrate the public CLI from `label-qwen` to `label-openai`.
- Add deterministic OpenAI Responses API logical/wire request projection for the five frozen reference roles.
- Add fixture-only response parsing, ProviderAuthorizationV2 semantics, ProviderAttemptReceiptV2 construction/validation, and V5 protected custody bindings.
- Preserve the existing append-only `0600` storage substrate and DeepSeek execution state machine.
- Keep production dispatch pinned to on-disk V5 plus out-of-band active/review/execution roots; current V3 pointer must produce zero dispatches.

## Explicit non-authorizations

- No HTTP transport or OpenAI SDK instantiation; live provider behavior remains A07-owned.
- No credential or API-key read; redacted readiness remains A19-owned.
- No natural-question egress, frame/sample freeze, provider route probe, label, canary, DeepSeek item execution, result, scoring, or aggregate export.
- No active-design pointer update, `main` push, merge, deployment, or live question-bank mutation.

## Baseline verification

- Existing runner MJS suite: `34/34` passed.
- TypeScript runtime extractor: `5/5` passed.
- Real questionStore read-only integration: `1/1` passed.
- Aggregate runtime diagnostic integration: `1/1` passed.
- Baseline total: `41/41` passed with zero provider calls.

## TDD implementation record

The first focused run was deliberately red:

- command: `node --test coordination/content-qa/mais-natural-ca60-v1/openai-reference-adapter-v5.test.mjs coordination/content-qa/mais-natural-ca60-v1/authorization-guard-v5.test.mjs coordination/content-qa/mais-natural-ca60-v1/runner-storage-v5.test.mjs coordination/content-qa/mais-natural-ca60-v1/cli.test.mjs`
- result: `4 passed / 11 failed` because the V5 modules did not yet exist and the public CLI still exposed `label-qwen` / V4 roots.

The implementation then added:

- exact `ProviderLogicalRequestV2` construction for the five frozen V5 OpenAI roles;
- deterministic projection to `POST https://us.api.openai.com/v1/responses` with model `gpt-5.6-luna`, project residency `US_STORAGE_PROCESSING`, strict role JSON Schema, `store=false`, `background=false`, and `reasoning.context=current_turn`;
- fixture-only response parsing that accepts reasoning output items, requires exactly one assistant `output_text`, validates the frozen role schema, and records exact raw-byte, parsed-envelope, request-body, model, response-ID, reasoning-context, and token-usage evidence;
- `ProviderAttemptReceiptV2` construction/semantic validation plus a prevalidated wrapper over the existing append-only `0600` receipt store;
- `ProtectedExecutionCustodyRegistryV2`, separately named from immutable V4 custody and fixed at `providerExecutionAuthorized=false` / `aggregatePublicationAuthorized=false`;
- `IndependentDesignReviewReceiptV1`, a pre-activation A11 contract binding the exact V5 design package root and reviewed runner commit/hash/adapter hash; it is distinct from the later 60-item independent recomputation receipt;
- `ProviderAuthorizationV2` guard semantics for exact provider/model/endpoint/residency/API surface, active pointer, A11 concurrence, current price evidence, route proof, expiry, rights/privacy roots, sample payload set, role and prior-artifact item binding, and pessimistic attempt/token/USD/concurrency reserves;
- public CLI migration from `label-qwen` to `label-openai`; the obsolete spelling is a usage error;
- a production package entrypoint pinned to the on-disk V5 registration and current active pointer. Because that pointer remains V3, even a fixture dispatch is blocked with zero transport calls.

## Payload-set clarification

`ProviderAuthorizationV2.payloadSetHash` is implemented as the hash of the sorted frozen sample item-hash set, not the set of complete logical request hashes. This is necessary because label and adjudication requests contain prior solve/label receipts that do not exist when authorization is issued. Every dispatch still binds `itemIdPseudonym`, `itemHash`, and `clusterId`, proves sample membership, and verifies that every prior artifact belongs to the same item and expected A/B role.

## Verification after implementation

- all package-local MJS tests: `55/55` passed;
- runtime extractor tests: `5/5` passed;
- real `questionStore` read-only source integration: `1/1` passed;
- aggregate-only runtime diagnostic integration: `1/1` passed;
- total A21 runner verification: `62/62` passed;
- immutable V5 design package: `21/21` passed;
- project type check: `npm run type-check` passed (`tsc --noEmit --incremental false`, exit `0`);
- syntax checks for all three new implementation modules: passed;
- `git diff --check`: passed;
- CLI dry-run: `OFFLINE_DRY_RUN_READY`, exact V5 registration hash, `providerRequestCount=0`, `fixtureDispatchCount=0`, `naturalItemResultCount=0`, and `formalDecision=null`;
- repository has no `lint` npm script; `npm run lint` therefore returned `Missing script: "lint"` and is not claimed as a passed gate.

## Evidence boundary after implementation

- No provider HTTP call, OpenAI SDK call, route probe, or credential read occurred.
- No natural question body left the process or repository.
- No frame, sample, authorization, reference label, canary, natural result, score, final receipt, or independent execution review was created.
- Fixture transport results are explicitly `fixtureOnly=true`, `providerEventCount=0`, and `httpRequestCount=0`; they are not provider evidence.
- V5 remains non-active pending A11 review and an append-only pointer/activation decision. This implementation does not remove the OpenAI route/preflight, credential, price, rights/egress, frame/sample, or two-live-authorization gates.
- The decision ceiling remains `INCONCLUSIVE_MACHINE_REFERENCE`; no `PASS`, `APPROVED`, `PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE` claim is available.

## Closeout and protected custody

- Reviewable runner implementation commit: `1dc093a1d0a300495dcd671091c849d24410fd5e`.
- Remote branch verification matched that exact commit before custody creation.
- Protected registry path: `.local/mais-natural-ca60-v1/custody/registry-v5.json` in this worktree; ignored by Git and observed mode `0600`.
- V5 design package root: `66a78409c64d65fa8d7e0208386f2046b276de5295602261fdb41e53e08544a1`.
- Runner source files bound: `17` committed, non-test package files.
- Runner source manifest root: `2d333700f464fc856beea60f8f96c276eaaaaaed10b476b841c06ba4b9a127b0`.
- Adapter hash: `63beb1ca15a26c71563a73447f347383bdaa31cb27a2b932b33d534007767013`.
- Runner hash: `cfef4f67e1c294e60f10de594dea59828c4f4a94b8465e55ab36b5b65285789c`.
- Custody registry hash: `aa48b5d02996ceed02daff2579b8961a4e5ea3c373dfdc023085fa181c2914a1`.
- Custody read-back validation passed and both authorization flags remained `false`.

Next gate: A11 must review the exact V5 design package and A21 runner/custody roots. This A21 closeout does not itself activate V5 or authorize any provider event.
