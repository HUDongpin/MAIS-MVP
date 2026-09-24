# A18 Content QA Workflow

## Inputs

Resolve the exact candidate/package ID, immutable digest, version, curriculum track, grade span, item types, intended student surface, source/rights boundary, review authority, and evidence inventory. A filename, branch name, status heading, or green test is not identity proof.

## Review Sequence

1. Confirm the candidate identity and the A18 review scope.
2. Inventory the content and dependencies without exporting protected text.
3. Separate deterministic checks, RSI machine evidence, natural-sample evidence, human content review, promotion evidence, regression evidence, and release/live evidence.
4. Review correctness, solvability, accepted forms, units, ambiguity, explanation quality, grade fit, curriculum alignment, bilingual quality, source distance, rights, accessibility, and visual sufficiency.
5. Record unresolved issues by severity and bounded location cue.
6. Require fresh independent review after a content mutation; do not reuse a receipt bound to old bytes.
7. Choose one allowed A18 verdict and state its exact scope and claim ceiling.
8. For `approved-for-integration-review`, hand the immutable candidate digest to A23. A23 controls Promotion state; A11 controls regression; A22 controls release evidence; A25 controls release intake. If the original request combines content acceptance with later Shadow and production work, record those conditional routes separately: Promotion owns Manifest/Shadow/Receipt/currentness after A18 acceptance, and Release owns production/release/deployment/live work only after it receives a current Promotion handoff. Preserve this separation in blocked decisions as a future sequence, not as evidence that either downstream gate is complete.

## Evidence Routing

- RSI/B-prime/C0-prime or machine finding revision: use the RSI Skill and consume only its redacted machine handoff.
- Natural-population generalization: use the Natural Sample Skill; do not turn a natural aggregate into item approval.
- Manifest/Receipt/Shadow/replay/currentness: use the Promotion Skill; do not synthesize a Promotion Receipt here.
- Build/deploy/live/readback: use the Release Skill; do not turn a content verdict into a deployment instruction.

## Decision Language

Allowed self-created verdicts:

- `approved-for-integration-review`
- `candidate-only`
- `needs-repair`
- `rejected`
- `blocked`

The skill must not create a production or live approval. It may neutrally report a separately proven production state only after reading the complete same-candidate, same-integration-SHA external evidence chain specified in `SKILL.md`.
