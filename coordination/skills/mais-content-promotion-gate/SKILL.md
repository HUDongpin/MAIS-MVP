---
name: mais-content-promotion-gate
description: Govern an exact A23 candidate-to-Shadow chain for Manifest/Receipt/checker/currentness/attempt/reaffirmation/canonical-fresh-replay/Closure/Registry/disposition/finalization evidence, including creation of a redacted Promotion-to-Release handoff. Do not use to consume that handoff for dirty-tree/build/CI/deploy/live work, or for content QA, RSI machine QA, or Natural evaluation.
---

# MAIS Content Promotion Gate

Treat the repository's native Manifest, Receipt, Closure, Registry, checker ledger, and CI artifacts as authoritative. This skill produces redacted audit and handoff summaries, never a replacement native Receipt or live authority.

Default to an offline, read-only audit. Do not stage, commit, push, deploy, call a provider, access credentials, or write live surfaces. Inspecting a gate does not authorize Shadow execution, baseline re-affirmation, integration, or release.

## Route the request

A conceptual or route-only explanation needs no repository discovery or native execution. For an artifact-backed request, select the relevant operation and read its linked normative contract. These references retain the full schema/parser/transport/currentness rules; this router does not relax them.

| Request | Operation and required reference |
| --- | --- |
| Discover/audit selected Manifest, Receipt, currentness, or attempt relation | [discovery-and-routing.md](references/discovery-and-routing.md); `node scripts/discover-promotion-gate.mjs --repo <repo> [--expected-head <sha>]` |
| Validate, Shadow, or verify a Receipt | [core-contract.md](references/core-contract.md), then operation-aware discovery and `run-native-gate.mjs`; the wrapper invokes only the exact repository-advertised operation |
| Compare canonical/fresh/replay Receipts | [lifecycle-and-invalidation.md](references/lifecycle-and-invalidation.md); `node scripts/compare-receipts.mjs --repo <repo> --manifest <workflow-selected-repo-path> --canonical <file> --fresh <file> --replay <file>` |
| Candidate/checker change, evidence correction, or baseline re-affirmation | Lifecycle/invalidation contract; classify the actual change and preserve immutable prior evidence |
| Finalize Shadow | Core and lifecycle contracts; native finalizer plus exact A11/A22/GitHub/A25 evidence, Receipt, Closure, and Registry |
| Prepare live work | [release-handoff.md](references/release-handoff.md); stop at the redacted exact-SHA handoff and route downstream work to `mais-release-hygiene-deploy-workflow` |

Read [evidence-boundaries.md](references/evidence-boundaries.md) when reporting maturity or proof. Use [response-cards.md](references/response-cards.md) for relevant scenario requirements; combine applicable cards when necessary. Formal artifacts retain all required fields; ordinary prose can summarize the evidence, actual blockers, unverified items, and next gate instead of repeating every field or a fixed opening sentence.

For a named dated v2 attempt, re-affirmation snapshot, cached maturity statement, role-record count, or failure corpus, read [mais-v2-attempts-case-study.md](references/mais-v2-attempts-case-study.md). Preserve recorded facts as dated/non-normative; do not present them as current repository or API evidence.

Route item acceptance to A18, candidate machine QA to RSI, and natural-population evaluation to Natural. Dirty-tree/build/CI/deploy/live work belongs to release hygiene; “release readiness” alone does not trigger this specialist without an exact Manifest/Receipt/attempt/currentness question.

## Execution and authority boundaries

- `run-native-gate.mjs` requires explicit `--execute` to invoke a native CLI. Both `shadow` and `verify-receipt` require `--allow-shadow` (or the verify-only `--allow-replay-shadow`) **before planning/discovery**, because the native verifier replays Shadow. This existing operation-family boundary remains in force. Without `--execute`, output retains `wouldExecute=false`.
- Validate/Shadow run only at the clean registered execution commit, where the future canonical Receipt must be absent. Verify additionally requires the authorized repository-relative Receipt path, descendant storage commit, and exact file SHA-256; the wrapper copies only the verified Git-blob bytes to its private temporary input. Preserve exact execution -> storage -> finalization -> intended-release ancestry. Never infer storage/finalization from audit-time HEAD.
- Follow the core/discovery contracts for exactly mapped public operations, reachable workflow proof, strict JSON/YAML/shell parsing, immutable checker bundles, closed native schemas, safe paths and Git blob/mode identity, sanitized child environment, 60-second timeout, and unchanged before/after execution snapshots. Do not weaken or bypass a rejected validator, parser, selector, transport, or binding check.
- Candidate bytes/semantics or checker changes require a new immutable attempt. Evidence-only corrections and independently reviewed candidate-unrelated baseline re-affirmations remain append-only under the lifecycle contract. Never edit frozen hashes, Manifest/Receipt/Closure/Registry bytes, or old evidence in place.
- Currentness, lifecycle, and live boundary are separate. A validate PASS proves only its exported Manifest-validation fields; a verify PASS proves only its named Receipt digest fields. Neither establishes current Shadow or `shadow_passed`. Raw Receipt digests may differ; the three runs must be distinct with equal trusted bindings and recomputed closed semantics.
- Shadow finalization requires current active-attempt Closure/Registry evidence; historical direct-base closure cannot authorize an active revision. N role files are N bound evidence records, not N independent reviewers. Stored GitHub evidence is not fresh API readback.
- Shadow remains non-live: preserve `liveAllowed=false` and blocked/unproven live boundaries. Shadow rollback proves only runner-owned temporary-output isolation, not production rollback or monitoring. Exact-SHA owner target/action authorization, live-surface-owner evidence, A11/A22/A25 records, and downstream release/live proof stay separate.

## Deliver the requested evidence

State the conclusion, selected active/base evidence relationship, what each relevant check proves, material unknowns/blockers, and exact next gate. A conceptual answer may cite the normative boundary without discovering a package. An artifact-backed answer may link a complete redacted projection and summarize it; do not infer favorable values for omitted or unrun checks.

Formal audit packets use [promotion-gate-handoff.schema.json](assets/promotion-gate-handoff.schema.json), retaining `authoritativeReceipt=false`. Formal reports use [promotion-readiness-report.template.md](assets/promotion-readiness-report.template.md); mutation dispositions use [attempt-disposition.template.md](assets/attempt-disposition.template.md). A requested Shadow-to-live handoff uses every applicable field of [live-release-handoff.template.md](assets/live-release-handoff.template.md), with missing values explicitly unknown/not-run/blocked under the release-handoff contract. A short explanation of why Shadow is not live does not itself create a formal handoff.

Emit only allowed hashes, redacted references, fixed states/issue codes, counts, and evidence boundaries. Omit raw candidate/content bodies, protected data, unbounded file paths, raw run/PR/provider/account identifiers, credentials, and provider output. Missing evidence blocks only the dependent execution, transition, or handoff; preserve its exact resume gate and complete independent authorized reporting.
