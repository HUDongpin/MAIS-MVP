# MAIS Natural CA60 V1 offline runner

## Current state

This package implements the A21 offline execution substrate for the California
60-item machine-reference pilot. Its current state is:

> `OFFLINE_RUNNER_IMPLEMENTED / LIVE_EXECUTION_BLOCKED`

It does not freeze a design, frame, sample, provider authorization, reference
label seal, or execution registration. It has made no Qwen or DeepSeek request,
has produced no natural-item result, and cannot emit `PASS`, `APPROVED`,
`PRODUCTION_READY`, or `LIMITED_GENERALIZATION_EVIDENCE`.

The tracked V4 design remains `DRAFT_OWNER_DECISIONS_PENDING` with the blocker
`QWEN_ENDPOINT_AND_DATA_REGION_OWNER_DECISION_PENDING`. The production dispatch
entrypoint is pinned to that on-disk registration and therefore returns zero
dispatches even if a caller supplies a frozen-looking authorization object.

## Implemented contracts

- Fixed protected root: `.local/mais-natural-ca60-v1/`.
- Self-hashed, nonauthorizing protected custody registry.
- Deterministic runner source manifest over regular package-local files only.
- Append-only canonical JSONL attempt chain with sequence numbers,
  `previousReceiptHash`, `selfHash`, file and directory fsync, and mode `0600`.
- Atomic, idempotent completed-item markers; conflicting bytes fail closed.
- Secret-bearing field/value screening before persistence.
- Authorization, expiry, origin, provider/model/endpoint, role, token, attempt,
  USD, and concurrency guards with zero transport calls on failure.
- A21 transport restriction to `FIXTURE_ONLY_NO_NETWORK_V1`; live provider
  transport remains A07-owned.
- Registered-canary selection from manifest row 1, formal-sample membership,
  two-attempt-per-role resume logic, fixed B-prime/C0-prime role order, and
  execution-leaf drift invalidation.
- Read-only extraction through the real California `questionStore` public,
  topic-catalog, and attempt semantics, with hard duplicate-ID failure.
- Whole-inventory exact, template, near-duplicate, and fine-grained source
  homology diagnostics using the frozen `0.90` Jaccard and `0.92` edit bounds.
- Aggregate-only diagnostic output that excludes item bodies and explicitly
  denies frame/sample freeze authority.

The research package under
`coordination/research/mais-natural-ca60-v1/versions/design-v4/` remains the
source of truth for taxonomy, prompts, thresholds, statistical power,
authorization, provider-attempt, scoring, decision, and independent-review
contracts. This runner does not copy or loosen those methods.

## Public CLI

The machine-readable command surface is:

```text
register
freeze-frame
audit-clusters
freeze-sample
label-qwen
seal-reference-labels
dry-run
authorize-check
execute-deepseek --canary 1
execute-deepseek --resume
score
verify
export-aggregate-report
```

Run the read-only command contract with:

```bash
node coordination/content-qa/mais-natural-ca60-v1/cli.mjs --help
node coordination/content-qa/mais-natural-ca60-v1/cli.mjs dry-run
node coordination/content-qa/mais-natural-ca60-v1/cli.mjs authorize-check
```

At the current V4 candidate state, `dry-run` is the only successful operational
command. All registration, freeze, labeling, execution, scoring, verification,
and export commands fail closed with a nonzero exit and a self-hashed
`NaturalCaRunnerCommandReceiptV1`. Those command receipts state zero provider
requests, zero protected mutations, zero natural results, and `formalDecision =
null`.

## Reproducible runtime diagnostic

The diagnostic traverses the actual runtime store but neither writes a frame nor
prints question bodies:

```bash
node --import tsx coordination/content-qa/mais-natural-ca60-v1/runtime-diagnostic.ts
```

Its output is a closed, self-hashed
`RuntimeDiagnosticAggregateReceiptV1`. It includes counts, grade counts,
component statistics, blocker counts, and aggregate roots only. In particular:

- `diagnosticOnly = true`
- `sourceCleanProofBound = false`
- `frameFreezeAuthorized = false`
- `sampleFreezeAuthorized = false`
- `providerRequestCount = 0`
- `claimCeiling = DIAGNOSTIC_ONLY_NOT_A_FRAME_REGISTRATION`

The full item records and assignments exist only in process memory unless a
future hash-bound, protected-artifact command is authorized and implemented.

## Verification

Run the package-local offline suite:

```bash
node --test coordination/content-qa/mais-natural-ca60-v1/*.test.mjs
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/runtime-extractor.test.ts
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/question-store-source.integration.test.ts
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/runtime-diagnostic.integration.test.ts
```

The integration tests access only local repository content. They do not load
credentials or call a model provider.

## Remaining gates

Before any natural-item provider execution, the following remain mandatory:

1. A16 freezes an append-only design version after the owner supplies the exact
   Qwen endpoint and data region; threshold timing must remain pre-result.
2. A18/owner bind the fine-grained lineage rule and rights/egress decision roots.
3. A22 creates an exact-SHA clean execution worktree and produces source,
   dependency-closure, runtime-config, and route-parity evidence.
4. The complete protected frame and 60-cluster sample are frozen and bound to
   the runner/adapter hashes.
5. A07 supplies independently reviewed Qwen and DeepSeek live adapters; no
   fallback provider/model/route is allowed.
6. A19 performs redacted credential readiness checks and two current,
   hash-bound owner authorization receipts are issued with price snapshots,
   expiry, egress, attempts, tokens, and USD caps.
7. Qwen reference labels are completed and sealed before any DeepSeek item
   request; DeepSeek remains blind to those labels.
8. A11 independently recomputes the final evidence, and A18 approves the claim
   boundary before any aggregate report is exported.

Even after a valid 60-item execution, the registered decision ceiling remains
`INCONCLUSIVE_MACHINE_REFERENCE`; the CA60 design cannot formally satisfy both
surface confidence-bound thresholds at once.
