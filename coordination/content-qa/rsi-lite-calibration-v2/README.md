# MAIS RSI-Lite Calibration v2

## Offline integration boundary — 2026-09-06

The status and numerical claims in the historical section below, `FORMAL-CONCLUSION.md`, `NEXT-RUN-PROTOCOL.md`, and the dated readiness receipt are preserved historical records. This repair does not reopen their protected candidate/gold/receipt bodies or independently reproduce their historical metrics, costs, hashes, or authorization. Historical authorization constructors and selected-file manifest checks remain available for interpreting those records; they are not a current authorization or an executable-closure attestation.

The exported `runFormalCliV2` and `executeFormalCalibrationV2` entrypoints are mechanically disabled **before inspecting arguments, reading stdin/credentials/protected inputs, or invoking providers**. The historical CLI execution flag cannot enable them. Their former implementations remain unexported for provenance. The provider adapter has no default live transport: tests must supply an explicit mock transport, and package/repeat runners require an `offline-mock` adapter. This is an offline test contract, not authentication of an arbitrary callback or a new live-authorization system. Restoring live execution requires a separately reviewed current owner authorization and the actual executable closure, including dependencies/package/lock state, identity, rights and egress boundaries. Integration or governance authorization is not experimental permission.

New package, repeat, and campaign receipts explicitly carry `executionMode: "offline-mock"`, `evidenceClass: "synthetic-calibration"`, `providerCallsSimulated: true`, `liveProviderUsed: false`, and `formalExecutionAuthorized: false`. Existing protocol status strings containing `formal` and simulated call/usage/cost fields retain their schema meaning; they do not prove live calls, billed charges, or execution authority. A provider-name label, historical authorization hash, mock callback, or zero-call deterministic run cannot turn these into live evidence.

Scoring requires independently supplied `expectedPackages`, covering every receipt package and every question/lesson surface. `readCommittedRunV2` and `writeCommittedRunV2` require `expectedPackage` for core receipts and additionally `originalReceipt` for repeats. The repeat runner also requires `expectedPackage`; core/repeat collection and campaigns require `loadPackage`, and `computeRepeatabilityV2` requires `expectedPackages`. The common validators check input/hash binding, complete coverage, actual role executions and projection/result bindings, allowed dispositions, unique finding IDs, and exact finding/inspection-source parity. B executes baseline, critique and revision, but aggregates baseline plus revision; C0 uses five roles with each role's actual question/lesson scope. Repeats must retain the original core projection, including B's original critique context, and validate their call-pair evidence before scoring or persistence.

All score/write/resume gates require every offline field above plus `productionAuthorized`, `deploymentAuthorized`, `gitCommitAuthorized`, and `gitPushAuthorized` explicitly `false`. Missing or contradictory fields fail closed; no historical receipt is silently upgraded. Re-signing a self-consistent hash does not make contradictory evidence valid. These checks establish internal synthetic receipt consistency, not independent proof that a model or person performed a review. Success-settlement errors propagate without retrying a successful mock call or debiting it as provider failure.

Default tests generate a test-owned fixed-seed candidate set through the real builder. They retain 72 packages, 100 questions and 2 lessons per package, 24 runs per arm, 168 simulated core calls and 21 simulated repeat calls; they never depend on the historical `.local` corpus. Use a fresh external output root for temporary fixtures and receipts. From the worktree root:

```sh
RSI_V2_TEST_ROOT=$(mktemp -d "/tmp/mais-rsi-v2-offline.XXXXXX")
mkdir "$RSI_V2_TEST_ROOT/tmp"
printf '%s\n' 'globalThis.fetch = async () => { throw new Error("Offline verification denies real fetch"); };' \
  > "$RSI_V2_TEST_ROOT/offline-fetch-guard.mjs"
env -i PATH="$PATH" TMPDIR="$RSI_V2_TEST_ROOT/tmp" \
  node --import "$RSI_V2_TEST_ROOT/offline-fetch-guard.mjs" --test --test-concurrency=1 \
  coordination/content-qa/rsi-lite-calibration-v2/*.test.mjs
```

Keep new candidate/output roots outside this worktree and distinct from historical receipts. The acceptance run uses an external Unicode scratch checkout, sanitized environment, a fail-closed fetch and filesystem guard, accepted v1 dependencies, and an unchanged copy of the real main package.json as a canary. Offline tests establish reusable tooling behavior only. Protected historical replay, natural-population generalization, A18 content acceptance, promotion, deployment, Git operations, and any real provider experiment remain separate scopes.

## Historical formal synthetic record (preserved)

Status: `formal-synthetic-calibration-complete-with-disclosed-deviation / provisional-operating-policy-supported / natural-generalization-pending / no-live-promotion`

This package contains the immutable pre-execution design and the public aggregate conclusion for the completed synthetic machine-QA calibration. The provider acted only as a machine quality reviewer. It did not generate, rewrite, or replace the frozen MAIS candidate questions.

The execution completed 168 successful core calls and 21 successful repeat calls, with 192 total attempts and three failed or lost attempts. It also had a disclosed registered-versus-executed deviation: the registration fixed non-streaming (`stream: false`), while the bound adapter and all successful call records used `stream: true` with thinking enabled and `reasoningEffort: high`. Other recorded request parameters matched. See [FORMAL-CONCLUSION.md](./FORMAL-CONCLUSION.md) for the current status, metrics, limitations, cost distinctions, and claim boundary.

## What v2 changes

- Preserves each question's `type` in the bilingual curriculum projection.
- Accepts `MISSING_OPTIONS` only for a `multiple-choice` surface whose projected options are actually absent or empty.
- Uses a closed, per-role finding-code allowlist covering F1-F9 and natural QA findings.
- Adds deterministic F8 template/identity leakage detection.
- Scores surface detection, family concordance, and accepted-code-plus-family concordance separately.
- Compares only A′, B′, and C0′; the C isolation arm is omitted.
- Defines 24 matched triplets: eight latent bundles each for California, Hong Kong, and Mainland China.
- Precommits 168 successful core provider calls and a separately reported 21-call repeatability supplement.
- Records request stochastic parameters and observed provider response metadata without claiming unsupported seed determinism.
- Separates an independently labeled natural MAIS generalization sample from any per-question human release gate.

## Files

- `protocol-design.mjs`: deterministic 24-triplet design, repeat plan, natural-sample plan, budget proposal, and authorization boundary.
- `role-contract.mjs`: projections, closed taxonomy, role allowlists, and semantic validation.
- `deterministic-baseline.mjs`: deterministic A′ checks, including F8.
- `scoring.mjs`: surface, family, exact accepted-code-plus-family, and matched-comparison metrics.
- `call-record-contract.mjs`: request/response metadata and repeat-pair integrity contract.
- `candidate-set-builder.mjs`: frozen synthetic candidate-set construction and manifest binding.
- `provider-adapter-v2.mjs` and `credential-loader-v2.mjs`: bound provider transport and credential-loading implementation.
- `formal-authorization-v2.mjs`: formal authorization validation.
- `formal-campaign-v2.mjs`, `formal-runner-v2.mjs`, `formal-execution-v2.mjs`, and `run-formal-v2.mjs`: campaign construction, execution, ledger, and entrypoint implementation.
- [NEXT-RUN-PROTOCOL.md](./NEXT-RUN-PROTOCOL.md): immutable human-readable pre-execution registration; its historical pre-run status text is intentionally retained.
- [FORMAL-CONCLUSION.md](./FORMAL-CONCLUSION.md): current public aggregate execution conclusion and evidence ledger.
- `V2-CANDIDATE-READINESS-RECEIPT.json`: historical pre-execution readiness artifact; it is not the current run-status source.
- `*.test.mjs`: package-local protocol, adapter, authorization, runner, and execution tests. The tests use offline or mocked paths; no test invokes a live provider.

## Canonical governance documents

- [Immutable pre-execution registration](./NEXT-RUN-PROTOCOL.md)
- [Formal synthetic conclusion](./FORMAL-CONCLUSION.md)
- [Provisional machine-QA operating policy](../MAIS-MACHINE-QA-OPERATING-POLICY.md)
- [Registered natural-sample evaluation plan](../../research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md)
- [Prospective package promotion gate](../../integration/MACHINE-QA-PROMOTION-GATE.md)

## Offline verification

```bash
node --test coordination/content-qa/rsi-lite-calibration-v2/*.test.mjs
```

The directory now includes a runner, provider adapter, credential loader, authorization validator, and formal campaign entrypoint. Their existence is not standing authorization for another provider call. There is no deployment hook or candidate-to-live promotion mechanism in this package.

Raw receipts, call records, budget ledgers, candidate packages, and gold materials remain protected and ignored under `.local/rsi-lite-calibration-v2/`. They are not a tracked public content pack. Public documentation records aggregate evidence, decision boundaries, protected paths, and hashes without exposing raw candidate content, credentials, or provider reasoning.

## Authorization boundary

The completed formal synthetic run does not create standing authorization for another provider call. Any future run requires a new, exact owner authorization and preregistered USD, attempt, and token caps. The repeat supplement does not establish end-to-end B′ critique → revision repeatability because repeated critiques were not fed into repeated revisions.

Synthetic calibration is automatic evidence only. Natural-bank generalization remains pending, production content is not accepted, and no live promotion is authorized. A18 content acceptance, A23 promotion planning, the live-surface owner, A11 regression, A22 clean release evidence, A25 intake, and explicit owner production authorization remain separate mandatory decisions. No Git stage, commit, push, deployment, or live modification occurred in the formal run.
