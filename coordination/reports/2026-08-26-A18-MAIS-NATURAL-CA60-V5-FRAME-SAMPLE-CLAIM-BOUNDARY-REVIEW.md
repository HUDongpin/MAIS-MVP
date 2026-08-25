# MAIS-NATURAL-CA60-V5 frame/sample claim-boundary review — A18

## Review outcome

> `NO_CLAIM_BOUNDARY_OBJECTION_FOR_FRAME_SAMPLE_STAGE`

A18 found no method or claim-wording objection to reporting that the
California runtime frame and deterministic 60-cluster sample have been frozen
and independently recomputed. The machine-readable review receipt self-hash is
`74eebf0c90780036ebcd86f9b39cd14bbc13b4215504091bde1828ad346c5b96`.

This review is deliberately limited to the frozen taxonomy, adjudication
method, P0/P1/P2 interpretation, statistical thresholds, decision precedence,
and wording boundary. A18 did not inspect natural-question text, reference
labels, or DeepSeek outputs. It is not a human gold-label review.

## Method findings

- The reference source is explicitly a same-model
  `machine_reference_panel`, not human gold. The registration preserves the
  correlated-error limitation and correctly states that panel agreement cannot
  establish human validity.
- The taxonomy is closed: 17 defect codes plus `NO_FINDING`, `UNASSESSABLE`,
  and `SCHEMA_GAP`. Unknown issues map to `SCHEMA_GAP`; unresolved issues map to
  `UNRESOLVED_REFERENCE`; no imputation or silent relabeling is permitted.
- A/B raw labels remain immutable and separate from final labels. Exact full
  agreement with no uncertainty and no P0/P1 is the only local merge path.
  Every disagreement, uncertainty, P0, or P1 requires exactly one adjudication;
  best-of-N selection is forbidden, and the adjudicator cannot see DeepSeek
  output.
- The one-sided 95% confidence thresholds, P0/P1/P2 rules, denominator floors,
  three-item unified nonresolved limit, and decision precedence were frozen
  before any label or result. Point estimates cannot replace decision bounds,
  and thresholds cannot be reduced after labels or results.
- The structural feasibility statement is internally consistent: even perfect
  observed sensitivity and specificity need at least 25 positive plus 52
  negative opportunities, exceeding CA60. Therefore CA60 cannot produce
  `LIMITED_GENERALIZATION_EVIDENCE`; its decision ceiling remains
  `INCONCLUSIVE_MACHINE_REFERENCE`.

## Current evidence and claim boundary

A22 froze 2,802 frame rows, including 482 eligible rows in 106 eligible
homology clusters, then selected 60 distinct clusters and a registered 12-item
C0 audit. A11 independently recomputed 108 checks and reported 108 matches,
zero discrepancies, and `CONCURRED`.

The maximum current claim is:

> `FRAME_AND_SAMPLE_FROZEN_NOT_EXECUTED_INDEPENDENTLY_REVIEWED`

No aggregate evaluation conclusion may be published yet. In particular, no
`PASS`, `APPROVED`, `PRODUCTION_READY`, `LIMITED_GENERALIZATION_EVIDENCE`, or
general machine-QA validity claim is allowed.

The `preExecutionState` embedded in the immutable design registration is its
assembly-time historical snapshot. It must not be used as current lifecycle
proof and must not be rewritten. Current lifecycle state is established by the
append-only V5 activation, owner decision, formal-freeze, and A11 independent
review receipts.

## Authority boundary

This A18 review grants no execution authority. Provider requests, credential
reads, natural-question egress events, reference labels, DeepSeek evaluations,
natural-question results, and token/attempt/USD authorizations all remain zero.
It does not authorize deployment, promotion, or live question-bank mutation.
