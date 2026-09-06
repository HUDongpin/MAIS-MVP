# MAIS RSI-Lite Calibration v2 — Formal Conclusion

- Date: `2026-08-24`
- Protocol: `MAIS-RSI-LITE-CAL-V2`
- Protocol version: `2.0.0-candidate`
- Evidence class: `synthetic-calibration`
- Source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Formal status: `formal-synthetic-calibration-complete-with-disclosed-deviation`
- Operating-policy status: `provisional-operating-policy-supported`
- Natural-bank generalization: `pending`
- Live promotion: `not-authorized`

## Conclusion

The formal synthetic calibration is complete: 168 core calls and 21 repeat-supplement calls succeeded. The results support a provisional machine-QA operating policy in which deterministic checks run first, B′ critique plus finding revision is the default machine-review path, and predefined high-risk, conflict, out-of-distribution, and precommitted random-audit cases escalate to C0′.

This is automatic machine evidence from an engineered synthetic calibration. It does not accept production content, prove performance on the natural MAIS question bank, authorize candidate-to-live promotion, or prove deployment or live behavior.

## Registered-versus-executed deviation

The execution was not an exact implementation of every registered transport/configuration field. The immutable pre-execution registration fixed `stream: false` (non-streaming). The bound adapter and all 189 successful call records instead used `stream: true`, with thinking enabled and `reasoningEffort: high`. Other recorded request parameters matched the registration.

Accordingly, the correct conclusion is “formal synthetic execution completed with a disclosed transport/configuration deviation,” not “exact protocol adherence.” This deviation narrows reproducibility and comparability claims and must remain visible in any downstream use of these results.

The source baseline also predates the untracked v2 implementation. The baseline alone is therefore insufficient to reproduce the executed system; reproducibility is bound to the recorded `codeManifest` SHA-256 in the evidence ledger below.

## Execution and budget evidence

### Call accounting

| Measure | Result |
| --- | ---: |
| Successful core calls | 168 |
| Successful repeat-supplement calls | 21 |
| Total successful calls | 189 |
| Total provider attempts | 192 |
| Failed or lost attempts | 3 |

The repeat supplement is excluded from the 168-call core estimand.

### Provider, model, and execution-mode traceability

The formal authorization and all 189 successful call records bind the provider and model consistently:

| Trace field | Recorded value | Coverage |
| --- | --- | ---: |
| Provider | `DeepSeek` | 189/189 successful calls |
| Requested model | `deepseek-v4-pro` | 189/189 successful calls |
| Exact observed model | `deepseek-v4-pro` | 189/189 successful calls |
| Registered transport mode | `stream: false` | Immutable pre-execution registration |
| Requested execution mode | `stream: true`; thinking enabled; `reasoningEffort: high` | 189/189 successful calls |
| Observed successful-call transport/mode | `stream: true` completion recorded | 189/189 successful calls |

The authorization binding is protected at `.local/rsi-lite-calibration-v2/authorization/FORMAL-AUTHORIZATION.json`; committed call-record and aggregate bindings are protected under `.local/rsi-lite-calibration-v2/execution/CORE-CAMPAIGN-COMMITTED.json`, `.local/rsi-lite-calibration-v2/execution/REPEAT-CAMPAIGN-COMMITTED.json`, and `.local/rsi-lite-calibration-v2/execution/FORMAL-EXECUTION-RECEIPT.json`. These bindings establish provider/model and requested/observed-mode traceability. They do not establish exact protocol adherence, provider determinism, price inference, or invoice cost.

### Successful-call usage

| Usage class | Tokens |
| --- | ---: |
| Cache-hit input | 1,068,928 |
| Cache-miss input | 6,777,357 |
| Output | 1,920,542 |
| Successful-call total | 9,766,827 |

### Three distinct cost concepts

| Concept | Recorded value | Interpretation |
| --- | ---: | --- |
| Enforcement token ledger | 10,498,827 / 40,000,000 | Attempt-inclusive cap accounting used to stop the run; it is not the successful-call usage total. |
| Conservative cap debit | $17.754810392 / $25 | Enforcement/ledger accounting against the owner-authorized hard cap; it is not an invoice. |
| Current-listed-price estimate | $4.622896699 | Estimate for successful usage at the price listing recorded for this 2026-08-24 conclusion; it is explicitly not a billing claim. |
| Provider invoice or balance | Not reproduced here | The provider invoice/balance is authoritative for actual billing. |
| Attempt cap | 192 / 220 | Includes the three failed or lost attempts. |

The estimate, conservative cap debit, and provider invoice answer different questions and must not be substituted for one another.

The successful-usage estimate is reproduced from the dated aggregate rate line items:

| Usage class | Tokens | Rate per 1M tokens | Estimated subtotal |
| --- | ---: | ---: | ---: |
| Cache-hit input | 1,068,928 | $0.003625 | $0.003874864 |
| Cache-miss input | 6,777,357 | $0.435 | $2.948150295 |
| Output | 1,920,542 | $0.87 | $1.670871540 |
| Total | 9,766,827 | — | $4.622896699 |

The rate snapshot was observed on `2026-08-24` and carries the source label `DeepSeek official Models & Pricing page`. The line items reproduce `$4.622896699`, but no captured rate-card artifact or rate-card hash exists in this evidence package. The external price snapshot is therefore not independently hash-verifiable and remains an estimate, not a provider invoice or balance.

The immutable preregistration preserves a prospective centre estimate of `$15.688035`, derived before execution from earlier observed costs. It is not the post-run successful-usage estimate and does not replace the provider invoice/balance.

## Core three-layer results

Each arm contains 24 core package runs and is scored against 108 gold-positive surfaces. “Surface” asks whether any finding was raised on the correct surface; “family” additionally requires the correct finding family; “exact” additionally requires an accepted finding code and the correct family.

| Arm | Surface sensitivity | Family sensitivity | Exact accepted-code + family sensitivity | Surface specificity | False positives | Interpretation |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| A′ | 72/108 (66.67%) | 72/108 (66.67%) | 72/108 (66.67%) | 2339/2340 (99.9573%) | 1 | Deterministic baseline. |
| B′ | 106/108 (98.1481%) | 106/108 (98.1481%) | 106/108 (98.1481%) | 2339/2340 (99.9573%) | 1 | Critique plus finding revision. |
| C0′ | 108/108 (100%) | 108/108 (100%) | 107/108 (99.0741%) | 2340/2340 (100%) | 0 | One finding had code/family discordance at the exact layer. |

These layers are not interchangeable. A correct surface flag does not establish correct family or accepted-code attribution. The authoritative scoring aggregate contains 2,340 reference-negative surfaces per arm; the specificity numerators and false-positive counts above use that denominator directly.

## Matched comparisons

| Comparison | Surface | Family | Exact accepted-code + family | Paired interpretation |
| --- | --- | --- | --- | --- |
| B′ versus A′ | +31.4815 pp; 34 wins / 0 losses | +31.4815 pp; 34 wins / 0 losses | +31.4815 pp; 34 wins / 0 losses | Exact McNemar p ≈ `1.164e-10` for the paired 34-to-0 discordance. |
| C0′ versus B′ | +1.8519 pp; 2 wins / 0 losses | +1.8519 pp; 2 wins / 0 losses | +0.9259 pp; 2 wins / 1 loss | Surface/family McNemar p = `0.5`; exact McNemar p = `1`. |

The matched observations are clustered within engineered latent bundles and homologous variants. The nominal paired tests do not remove that dependence; effect sizes and p-values require cluster-aware interpretation and must not be presented as independent natural-bank estimates.

## Repeatability supplement

- Six packages contributed 21 repeated role pairs.
- Sixteen of 21 pairs were exact finding-key matches.
- Exact finding-key Jaccard similarity ranged from `0` to `1`, with mean `0.897959`.
- Some role pairs varied; the results do not support a provider-determinism claim.
- The B′ repeats did not feed the repeated critique into the repeated revision. They are therefore repeated role calls, not end-to-end repeated critique → revision chains.

The supplement is descriptive stability evidence only and remains outside the core estimand. A future end-to-end repeat study must repeat the complete bound B′ chain.

## Provisional operating decision

The provisional workflow is:

1. Run the frozen deterministic baseline first.
2. Run B′ critique plus revision as the default machine-QA path. The revision revises the machine finding set only; it never edits, rewrites, or replaces the frozen question.
3. If a candidate needs remediation, create a new candidate version and new frozen hashes, then restart deterministic and machine QA. Receipts bound to the prior candidate do not transfer.
4. Escalate predefined high-risk, baseline/B′ conflict, critique/revision conflict, out-of-distribution, invalid/unknown-contract, and precommitted stratified-random-audit cases to C0′.
5. Treat C0′ role outputs and aggregation as evidence, not as majority-vote approval. Unresolved high-risk findings block the scope from advancing.

The canonical prospective rules are in [MAIS Machine-QA Operating Policy](../MAIS-MACHINE-QA-OPERATING-POLICY.md). Exact package movement remains subject to the [Machine-QA Promotion Gate](../../integration/MACHINE-QA-PROMOTION-GATE.md).

## Limitations and claim boundary

| Claim or action | Status |
| --- | --- |
| Synthetic calibration completed | Yes, with the disclosed transport/configuration deviation |
| Automatic machine evidence produced | Yes |
| Provisional operating policy supported | Yes, for prospective bounded use |
| Exact adherence to every registered execution field | No |
| End-to-end B′ repeatability established | No |
| Provider determinism established | No |
| Natural MAIS-bank generalization established | No |
| Production content accepted | No |
| Candidate-to-live promotion authorized | No |
| Git staging, commit, or push performed by the formal run | No |
| Deployment or live modification performed by the formal run | No |

No credential or provider reasoning was persisted or printed by the formal run. Raw candidate content and protected receipts remain outside the tracked public package.

## Decision-owner chain

No evidence owner may silently issue the next owner's decision. A25 is a cross-cutting currentness prerequisite before A23 integration intake and must be refreshed again before release planning; it is not a late-stage-only owner.

| Lane or owner | Required responsibility |
| --- | --- |
| A16 | Research design, synthetic calibration interpretation, and natural-sample evaluation. |
| A21 | Immutable candidate-package construction, versioning, and protected corpus handling. |
| A18 | Independent exact-scope content-QA decision, including mathematics, answer key, curriculum/age fit, language, source distance, and finding disposition. |
| A24 | Exact visual/evidence-layer review when answer-critical diagrams or overlays are in scope. |
| A25 | Cross-cutting release-intake, ownership, clean-slice, and supersession currentness before A23 integration intake and again before release planning. |
| A23 | Candidate-to-live intake, exact promoted/held scope, and promotion sequencing. |
| Live-surface owner | Explicitly authorized implementation in the named live files/routes. |
| A11 | Regression evidence for the exact integrated candidate and commit. |
| A22 | Clean-source release readiness and deployment/live-evidence separation. |
| Owner | Explicit production authorization, rollback/downlist decision, and public-claim approval. |

## Evidence hash ledger

These hashes identify the aggregate evidence used for this conclusion; they do not make protected contents public.

| Evidence | SHA-256 |
| --- | --- |
| Formal authorization self-hash | `b972cdc3f0926a504662a6455e41d42c940c94f20fa74a5d479b867f92219b92` |
| Candidate-set self-hash | `eb477ca9bdd50cfe85fdaf7039c4b292e3d48e20b13c5bac834d76d0484e083b` |
| Core-campaign self-hash | `ca266265b0f4db0eb03e0cd4cb68ca8821ffbb6c02feb74f23cac3982f25ee8c` |
| Repeat-campaign self-hash | `47086bafa5d9a50df7f0b9fdd396bfd0e9caeadb05ba1808742ae4a3ccd52a1f` |
| Scoring-report self-hash | `42928a9357099e642256fec7233fc70c2377ebde8aba4a88402965c08a13274a` |
| Repeatability-report self-hash | `560567548a727270b7613fcb29212c54792d3b4b11e071597ddd8747c3dc504d` |
| Final-execution self-hash | `f03d0142ef9fb339e17a8a22780094b32cf4f139ffcccc063f2e6e8cb72cb8f2` |
| Executed code manifest | `474cbff52f809427efbc6aed3caea02039eace0c6c39925e83f26e72474d9e7a` |
| Repeat plan | `ec4e6b6ce6fda2a9ad29f695bcb4d23cc862d7a8e631d80e8ddb74dbda72a231` |

## Protected receipt locations

The following are path references only. Their raw contents remain protected and ignored under `.local/`:

- `.local/rsi-lite-calibration-v2/authorization/FORMAL-AUTHORIZATION.json`
- `.local/rsi-lite-calibration-v2/candidate-set/BUNDLE-READINESS.json`
- `.local/rsi-lite-calibration-v2/candidate-set/public-manifest.json`
- `.local/rsi-lite-calibration-v2/execution/CORE-CAMPAIGN-COMMITTED.json`
- `.local/rsi-lite-calibration-v2/execution/REPEAT-CAMPAIGN-COMMITTED.json`
- `.local/rsi-lite-calibration-v2/execution/SCORING-REPORT.json`
- `.local/rsi-lite-calibration-v2/execution/REPEATABILITY-REPORT.json`
- `.local/rsi-lite-calibration-v2/execution/FORMAL-EXECUTION-RECEIPT.json`
- `.local/rsi-lite-calibration-v2/execution/.V2-PERSISTENT-BUDGET-LEDGER.json`

## Currentness

This conclusion is the current public aggregate status for `MAIS-RSI-LITE-CAL-V2 / 2.0.0-candidate` and the hashes above. The immutable registration and historical candidate-readiness receipt retain their pre-run wording and must not be used as the current execution status. A later protocol, candidate, code manifest, policy version, or non-superseded receipt must issue a new conclusion rather than silently rewriting this one.
