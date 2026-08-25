# MAIS Natural CA60 V1 runner — GPT-5.6 Luna V5 migration

## Current state

This package implements the A21 offline execution substrate for the California
60-item machine-reference pilot. Its current state is:

> `V5_METHOD_ACTIVE / FRAME_READINESS_IMPLEMENTED / LIVE_EXECUTION_BLOCKED`

This runner step does not itself freeze a design, frame, sample, provider
authorization, reference label seal, or execution registration. It has made no
OpenAI or DeepSeek request, has produced no natural-item result, and cannot emit
`PASS`, `APPROVED`, `PRODUCTION_READY`, or
`LIMITED_GENERALIZATION_EVIDENCE`.

The tracked V5 design passed its preactivation A11 review and is now the active
method registration. It freezes the owner-selected reference tuple as
`OPENAI_DIRECT` / `US_STORAGE_PROCESSING` /
`https://us.api.openai.com/v1/responses` / `gpt-5.6-luna`, but this is a design
selection, not a live-execution grant. The active pointer and activation receipt
both keep `firstProviderExecutionAllowed = false`. The production guard accepts
the reviewed V5 roots, then returns zero dispatches until every downstream frame,
sample, route, price, credential-readiness, and authorization gate is present.

## Implemented contracts

- Fixed protected root: `.local/mais-natural-ca60-v1/`.
- Historical V4 custody remains unchanged; V5 adds a separately named,
  self-hashed, nonauthorizing `ProtectedExecutionCustodyRegistryV2`.
- Deterministic runner source manifest over regular package-local files only.
- Append-only canonical JSONL attempt chain with sequence numbers,
  `previousReceiptHash`, `selfHash`, file and directory fsync, and mode `0600`.
- Semantic `ProviderAttemptReceiptV2` validation occurs before a receipt can be
  appended, and the actual lock-assigned sequence/hash is revalidated.
- Atomic, idempotent completed-item markers; conflicting bytes fail closed.
- Secret-bearing field/value screening before persistence.
- Deterministic logical-to-wire projection for all five frozen OpenAI reference
  roles. It binds the exact Responses endpoint/model/residency, role prompt,
  input allowlist, JSON Schema, `store=false`, `background=false`,
  `reasoning.context=current_turn`, and request hashes.
- Fixture response parsing accepts non-message reasoning items but requires
  exactly one assistant `output_text`, exact observed model, valid frozen role
  JSON, internally consistent token usage, and raw-byte/wire evidence hashes.
- Authorization, independent-review, active-pointer, route-proof, current-price,
  expiry, payload-set, origin, provider/model/endpoint, role, input/output/total
  token, per-role/total attempt, USD, and concurrency guards fail before any
  dispatch.
- `IndependentDesignReviewReceiptV1` is a pre-activation A11 contract distinct
  from the later 60-item `IndependentReviewReceiptV1`: it binds the exact V5
  design package root plus the reviewed runner commit/hash and adapter hash.
- The authorization `payloadSetHash` binds the sorted frozen sample item-hash
  set. Each dispatch separately binds its item pseudonym/hash/cluster and checks
  that prior solve/label artifacts belong to the same item and expected panel
  role; later labels therefore need not pretend their not-yet-created solve
  receipts were knowable at authorization time.
- A21 transport restriction to `FIXTURE_ONLY_NO_NETWORK_V2`; the adapter and
  guard contain no `fetch`, SDK, socket, key, or environment-variable primitive.
  Live provider transport remains A07-owned.
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
`coordination/research/mais-natural-ca60-v1/versions/design-v5/` is the
source of truth for taxonomy, prompts, thresholds, statistical power,
authorization, provider-attempt, scoring, decision, and independent-review
contracts. V5 records V4 as `SUPERSEDED_NOT_EXECUTED`; this runner does not
rewrite either predecessor package or loosen the frozen method.

## Public CLI

The machine-readable command surface is:

```text
register
freeze-frame
audit-clusters
freeze-sample
label-openai
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

At the current V5 candidate state, `dry-run` is the only successful operational
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

For this diagnostic command, the full item records and assignments remain only
in process memory. Protected persistence is a separate exact-SHA command below.

## Exact-SHA frame-readiness command

The next local-only intake step is implemented separately from formal frame
freeze:

```bash
node --import tsx coordination/content-qa/mais-natural-ca60-v1/frame-readiness-v5-cli.ts \
  --created-at 2026-08-26T12:00:00.000Z
```

The canonical UTC execution timestamp is mandatory so a rerun can reproduce the
same append-only bytes. The command refuses a dirty worktree, hashes the
committed extractor/clustering/runner source bytes, traverses the full
California runtime inventory, applies the
frozen homology algorithm, runs local PII/secret screening, and records a
conservative source-rights decision request. Natural item bodies are written
only under the content-addressed protected root
`.local/mais-natural-ca60-v1/frame-readiness-v5/<source-commit>/` with directory
mode `0700` and file mode `0600`. Its stdout contains aggregate counts, hashes,
and blockers only.

The persisted owner-decision request binds the final custody-bearing readiness
receipt hash. It requests exact owner decisions for three identified source IDs
and the frozen fine-grained lineage-rule hash. It grants no egress or provider
execution itself, and it leaves both `formalFrameFrozen` and
`formalSampleFrozen` false.

## Verification

Run the package-local offline suite:

```bash
node --test coordination/content-qa/mais-natural-ca60-v1/*.test.mjs
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/runtime-extractor.test.ts
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/question-store-source.integration.test.ts
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/runtime-diagnostic.integration.test.ts
node --import tsx --test coordination/content-qa/mais-natural-ca60-v1/frame-readiness-v5.test.ts
```

The integration tests access only local repository content. They do not load
credentials or call a model provider.

## Remaining gates

Before any natural-item provider execution, the following remain mandatory:

1. A18/owner bind the fine-grained lineage rule and rights/egress decision roots.
2. A11 independently reruns the exact extractor roots, while A22 creates an
   exact-SHA clean execution worktree and produces source,
   dependency-closure, runtime-config, and route-parity evidence.
3. The complete protected frame and 60-cluster sample are frozen and bound to
   the runner/adapter hashes.
4. A07 supplies independently reviewed OpenAI Responses and DeepSeek live
   transports; no fallback provider/model/route is allowed. It must first prove
   that the owner project is entitled to the exact US route and exact model.
5. A19 performs redacted credential readiness checks. A current US-route price
   snapshot and two separate, unexpired, hash-bound owner authorization receipts
   must bind the exact design/frame/sample/prompt/schema/runner/adapter/payload
   roots and nontransferable attempts, tokens, and USD caps.
6. GPT-5.6 Luna reference labels are completed and sealed before any DeepSeek
   item request; DeepSeek remains blind to those labels. The same-model A/B and
   adjudicator panel remains correlated machine evidence, not human gold.
7. A11 independently recomputes the final evidence, and A18 approves the claim
   boundary before any aggregate report is exported.

Even after a valid 60-item execution, the registered decision ceiling remains
`INCONCLUSIVE_MACHINE_REFERENCE`; the CA60 design cannot formally satisfy both
surface confidence-bound thresholds at once.
