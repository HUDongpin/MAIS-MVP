# MAIS Machine-QA Natural-Sample Evaluation

- Status: `registered-not-executed`
- Date registered: `2026-08-24`
- Design ID: `MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION`
- Design version: `1.0.0`
- Canonical path: `coordination/research/MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION.md`
- Owner: `A16`
- Evidence class: `natural-sample-evaluation`
- Decision ceiling: `bounded-research-generalization-evidence-only`
- Live-call authorization: `none`
- Budget authorization: `none`
- Package-promotion authority: `none`

## 1. Purpose and current boundary

This document registers the initial design for evaluating the provisional MAIS machine-QA policy on independently labelled natural content. It is not an execution registration: no sampling frame, labels, decision thresholds, provider calls, or budget are authorized here.

The study has not been executed. It cannot approve production content, sampled items, unsampled items, a candidate package, integration, deployment, or live promotion. The [Machine-QA Promotion Gate](../integration/MACHINE-QA-PROMOTION-GATE.md) remains a separate exact-package process.

## 2. Initial independent 180-item plan

The initial sample contains 180 natural MAIS items:

| Region | Planned items | Required stratification |
| --- | ---: | --- |
| California | 60 | Response form × difficulty |
| Hong Kong | 60 | Response form × difficulty |
| Mainland China | 60 | Response form × difficulty |
| Total | 180 | Region × response form × difficulty |

Before machine QA begins, a separate execution registration must freeze:

- this design ID/version, canonical path, and immutable Git blob ID or SHA-256 of the exact design text;
- the target population and inclusion/exclusion criteria;
- the sampling-frame generation time and SHA-256;
- protected sample IDs or an ID-manifest hash;
- region, response-form, difficulty, grade/topic, and any publisher/source strata;
- the selection algorithm and seed or commitment;
- allocation, weighting, replacement, missing-item, and exclusion rules;
- duplicate, homology, and latent-cluster handling; and
- the exact protocol, policy, prompt, taxonomy, deterministic rules, provider/model configuration, tool contract, and resource caps.

The sampling frame must be frozen before machine QA. No sampled item may be selected, replaced, excluded, or weighted after its machine result is known except under a prospectively registered rule.

## 3. Independent reference labels

Reference labels must be independent of the evaluated prompt, taxonomy, deterministic-rule, threshold, and machine-output tuning process. They must be produced before evaluated machine results are revealed to the labelling process and must have recorded method/version provenance.

Label source must be declared as `human`, `machine`, `rules`, or `hybrid`. Independent does not silently mean human. It means the reference-label process is prospectively specified, provenance-recorded, blind to the evaluated machine outputs, and not used to tune the evaluated prompt, taxonomy, rules, or thresholds.

The registration must also define:

- label schema and artifact hash;
- label-source qualifications or method provenance appropriate to the declared source;
- blindness and separation controls;
- disagreement/adjudication rules;
- missing, uncertain, and invalid-label handling; and
- the claims that the label source can and cannot support.

Named-person evidence and personal reviewer identities must not be collected or published merely to satisfy this design. Per-item human receipts and named-person signatures are not required. Independence, method provenance, privacy, and auditability are required. If a human process is used, public artifacts must describe the method without publishing personal identities.

If any sample row or reference label informs prompt, taxonomy, rule, threshold, or provider-procedure tuning, the affected evaluation is invalid for generalization and must not be silently relabelled as a test result.

## 4. Primary metric layers

The same three primary layers used in the synthetic calibration must be reported with counts and denominators:

1. **Surface detection:** whether the evaluated workflow raises any finding on the correct item/lesson/evidence surface.
2. **Family concordance:** whether the finding is assigned to the correct accepted family.
3. **Exact accepted-code + family concordance:** whether the finding matches an accepted code and the correct family.

A surface flag is not automatically a family or exact hit. The execution registration must freeze the reference-positive and reference-negative definitions and how multiple findings on one surface are scored.

## 5. Analysis and reporting plan

Report overall and per-region results. Also report registered response-form and difficulty strata; grade/topic or other strata may be reported when denominators support them.

At minimum, report:

- numerator and denominator for each primary metric layer;
- true positives, false positives, false negatives, and true negatives where the reference design identifies them;
- sensitivity/recall, specificity, precision, and false-positive rate where identifiable;
- invalid, excluded, missing, replaced, and unlabelled items;
- open P0/P1, registered P2 threshold/disposition, and finding conflicts;
- confidence intervals with the method stated;
- any weighting introduced by disproportionate stratification;
- cluster-aware limits for duplicate, homologous, latent-family, lesson, source, or package dependence;
- overall and per-region results without treating 60 items per region as a high-precision regional comparison;
- repeatability outside the primary estimand, including whether the full B′ critique → revision chain was repeated;
- false-positive burden, provider attempts, failures/retries, latency, tokens, and cost; and
- all protocol or transport/configuration deviations.

The initial design is intentionally modest. With 180 items, uncertainty and within-source clustering may be material; with 60 per region, regional contrasts are exploratory unless a separately registered larger sample supports stronger inference. Nominal item-level intervals or tests must not be presented as cluster-independent when the frame contains dependent items.

## 6. Repeatability, false positives, and cost

Any repeatability supplement must be selected before core results and reported separately. It must state whether it repeats individual role calls or the complete deterministic → critique → revision/escalation chain. Exact-match rate, finding-key Jaccard distribution, role-level variation, invalid responses, and observed configuration must be reported without a determinism claim unless the design supports one.

False positives must be reported at all identifiable metric layers and by region/stratum when denominators permit. Cost reporting must separate successful-usage estimates, conservative enforcement-ledger debits, and authoritative provider invoice/balance amounts.

## 7. Decision thresholds require a separate freeze

Decision thresholds are not set by this document. Before labels or machine results are inspected, a separate execution registration must freeze:

- the minimum acceptable result for each primary metric layer;
- false-positive and false-negative tolerances;
- P0/P1 blocking rules and any P2 threshold/disposition;
- overall versus per-region decision logic;
- confidence-interval or uncertainty rules;
- invalid/missing-data and cluster rules;
- repeatability and cost constraints; and
- the controlled conclusion vocabulary.

Without prospectively frozen thresholds, the completed study is descriptive only. Thresholds must not be selected from observed labels or results.

## 8. Allowed result language

Until a separate threshold registration exists, the only current result is `NOT_STARTED`. A later result artifact may use bounded research terms such as `INVALID_FOR_GENERALIZATION`, `INCONCLUSIVE`, or `LIMITED_GENERALIZATION_EVIDENCE`. It must not use `PASS`, `APPROVED`, `PROMOTED`, `PRODUCTION_READY`, or `LIVE`.

Any later conclusion applies only to its registered natural sampling frame, strata, label method, policy/protocol version, code manifest, and uncertainty. A18 content acceptance and A23 package promotion remain separate exact-scope decisions with separate evidence.

## 9. Execution authorization

This design authorizes no live provider call, credential access, external egress, sampling action, label collection, or budget. A later execution requires a separate owner authorization binding the frozen frame, labels, thresholds, provider configuration, privacy/rights posture, and attempt/token/USD hard caps. Its execution registration must also bind this canonical path, design ID/version, and immutable Git blob ID or SHA-256.

Current state: `registered-not-executed / no-live-call / no-budget / not-a-promotion-gate / cannot-approve-production`.

## 10. Version binding and supersession

Every execution registration and result artifact must bind `MAIS-MACHINE-QA-NATURAL-SAMPLE-EVALUATION / 1.0.0`, this canonical path, and the immutable Git blob ID or SHA-256 of the exact design used. A path and version without an immutable content binding are insufficient.

A later edit to this file does not retroactively govern an execution already bound to an earlier blob or SHA-256. Any replacement design must increment the version, identify the prior design ID/version and immutable content binding in an explicit `supersedes` field, state its effective date and rationale, and require a new execution registration. Earlier receipts remain governed by the exact design version and content hash they recorded.
