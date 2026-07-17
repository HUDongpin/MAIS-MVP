# S18 Full-Scope QA Decision - us-ca-math-middle-school-textbooks-v2

Status: approved-for-integration-review

Production recommendation: eligible-for-owner-approved-temporary-public-replacement-release

## Counts

- Lessons reviewed: 15
- Accepted rows: 15
- Blocker rows: 0
- Deterministic pass rows: 15
- Unique standard IDs: 81
- Grade counts: P6/G6=5, S1/G7=5, S2/G8=5

## Decision Basis

The full-scope S18 checklist reviewed every lesson for grade/domain validity, US_CA_MATH metadata, standard IDs, deterministic worked-example/checkpoint checks, answer-key consistency, source-policy blocked phrases, English-only release copy, pedagogy fields, and visual policy.

No P0/P1 math correctness, source-distance, answer-key, or age-fit blockers were found.

## Public Claim Limits

Allowed: "California middle-school mathematics replacement lessons" and "California standards-aligned lesson coverage."

Not allowed: "official California course", "complete California curriculum", "fully launched California curriculum", or "IXL-equivalent exercises."

## Remaining Risks

- This release is text-only; future graphs, diagrams, dense labels, and answer-critical visuals require deterministic math-svg/exact-layer QA.
- Public copy must avoid complete/official California curriculum claims.
- This is a replacement textbook surface, not a claim of full California curriculum parity.

## Next Owners

- S23 promotion: may promote this exact text-only lesson surface for live route integration under owner conditional release authorization.
- S05 lesson integration: may wire the student routes to the replacement lesson package.
- S11 regression: must verify the live routes after integration.
- S22 release: must publish only after type/build/route checks pass.
