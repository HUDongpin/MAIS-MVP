# MAIS Natural CA60 V1 runner — GPT-5.6 Luna V5 migration

## Current state

This package implements the A21 offline execution substrate for the California
60-item machine-reference pilot. Its current state is:

> `V5_FRAME_AND_SAMPLE_FROZEN / V5-R3_OFFLINE_RUNNER_IMPLEMENTED / FRESH_A11_REVIEW_PENDING / PROVIDER_EXECUTION_BLOCKED`

The V5 design, California runtime frame, one-cluster-per-item CA60 sample,
rights/privacy screens, taxonomy, thresholds, P0/P1/P2 rules, and decision
ceiling are already frozen upstream. This runner step does not create a provider
authorization, reference label seal, or natural-question execution registration. It has made no
OpenAI or DeepSeek request, has produced no natural-item result, and cannot emit
`PASS`, `APPROVED`, `PRODUCTION_READY`, or
`LIMITED_GENERALIZATION_EVIDENCE`.

The tracked V5 design passed its preactivation A11 review and is now the active
method registration. It freezes the owner-selected reference tuple as
`OPENAI_DIRECT` / `US_STORAGE_PROCESSING` /
`https://us.api.openai.com/v1/responses` / `gpt-5.6-luna`, but this is a design
selection, not a live-execution grant. V5-R2 was independently reviewed and
frozen as `DISCREPANCY`; its registration and review receipt remain immutable.
V5-R3 supersedes only the pre-first-provider runner surface and leaves every
frozen research root unchanged. Its production guard returns zero dispatches
until a post-registration fresh A11 `CONCURRED` receipt, project/route evidence,
redacted credential-readiness evidence, current price evidence, an owner grant,
and a complete `ProviderAuthorizationV3` are present and mutually hash-bound.

## Implemented contracts

- Fixed protected root: `.local/mais-natural-ca60-v1/`.
- Historical V4 custody remains unchanged; V5 adds a separately named,
  self-hashed, nonauthorizing `ProtectedExecutionCustodyRegistryV2`.
- Deterministic runner source manifest over regular package-local files only.
- Authoritative receipt-derived attempt/token/USD/concurrency accounting with an
  atomic pre-dispatch reservation. Caller-supplied budget snapshots are ignored;
  duplicate attempt IDs and stale/concurrent reservations fail closed.
- Immutable per-entry canonical receipts with sequence numbers,
  `previousEntryHash`, `selfHash`, fsync, atomic same-directory publication,
  mode `0600`, and explicit stale-lock/orphan recovery blockers.
- Every post-dispatch outcome embeds a self-hashed `ProviderEventReceiptV3` in
  the atomic completion entry. Body-read failure, malformed/schema-invalid 200,
  provider-origin/model/finish drift, observed usage, pessimistic reserved cost,
  and provider-invoice authority are retained.
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
- `IndependentExecutionRunnerReviewReceiptV2` is a post-registration A11
  contract. Future owner authorization must bind the exact V5-R3 registration,
  source commit, production/test roots, and a zero-finding `CONCURRED` receipt.
- `SampleExecutionInventoryV1` carries exactly 60 unique item pseudonym/hash/
  cluster tuples plus each item's protected privacy- and rights-screen evidence
  hash. The guard recomputes the frozen payload, privacy, and rights roots and
  rejects any dispatch outside that exact egress-eligible inventory before a
  ledger reservation. Future owner grants and provider authorizations must bind
  the inventory hash, exact egress allow/deny policy hash, and exact per-role
  reservation-policy hash.
- Each dispatch checks that prior solve/label artifacts belong to the same item
  and expected panel role; later labels therefore need not pretend their
  not-yet-created solve receipts were knowable at authorization time.
- A07 live transport is implemented but not invoked by this registration. It is
  pinned to the exact OpenAI US Responses and DeepSeek direct endpoints, rejects
  redirects/origin drift, binds the OpenAI project identity, and reads a
  credential only after all static evidence and the atomic reservation pass.
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

Run the V5-R3 command contract with:

```bash
node coordination/content-qa/mais-natural-ca60-v1/runner-v5-r3-cli.mjs dry-run \
  --context /absolute/protected/context.json
node coordination/content-qa/mais-natural-ca60-v1/runner-v5-r3-cli.mjs authorize-check --context /absolute/protected/context.json
```

Provider, scoring, verification, sealing, and export commands are connected to
the guarded filesystem runtime. They require a canonical self-hashed context
inside the fixed protected root under mode `0600`; a blocker returns nonzero and
does not claim provider invocation. At the current authorization boundary they
therefore remain blocked with zero provider requests and zero natural results.
The offline reference seal builder reconstructs every A/B/adjudicator label
from the complete append-only ledger, requires 240 base successes plus exactly
one adjudicator success for every triggered item, and reports raw agreement,
Cohen kappa, Gwet AC1, family/code Jaccard, severity agreement, and adjudication
rate while retaining the correlated-machine-panel limitation. The offline
scorer implements deterministic one-to-one exact-then-family
matching, Wilson bounds, 10,000-replicate item-cluster bootstrap, conservative
missing-item bounds, P0/P1/P2 precedence, and the frozen
`INCONCLUSIVE_MACHINE_REFERENCE` decision ceiling; it cannot emit `PASS`.

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

1. Fresh A11 independently reviews the exact V5-R3 registration commit and must
   return `CONCURRED`; any discrepancy requires another append-only supersession.
2. A22 creates a clean exact-SHA execution worktree and confirms dependency,
   runtime-config, protected-storage, and route-parity evidence.
3. A separately authorized static OpenAI project-route preflight must prove the
   owner project identity, US storage/processing selection, exact model
   entitlement, and current billing route without natural-question content.
4. A19 performs redacted credential readiness checks. A current US-route price
   snapshot and two separate, unexpired, hash-bound owner authorization receipts
   must bind the exact design/frame/sample/prompt/schema/runner/adapter/payload
   roots and nontransferable attempts, tokens, and USD caps.
5. GPT-5.6 Luna reference labels are completed and sealed before any DeepSeek
   item request; DeepSeek remains blind to those labels. The same-model A/B and
   adjudicator panel remains correlated machine evidence, not human gold.
6. A11 independently recomputes the final evidence, and A18 approves the claim
   boundary before any aggregate report is exported.

Even after a valid 60-item execution, the registered decision ceiling remains
`INCONCLUSIVE_MACHINE_REFERENCE`; the CA60 design cannot formally satisfy both
surface confidence-bound thresholds at once.
