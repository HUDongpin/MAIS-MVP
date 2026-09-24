# A18 bundle-readiness F2-R candidate packet

- Protocol: `MAIS-RSI-LITE-CAL-V1` `1.1.1-f2-r`
- Frozen source baseline: `b6c7c347a49a813e454e707dd3c16399dcf29909`
- Author: A16 remediation session, not the independent A18 reviewer
- Current status: `MACHINE READY; OWNER HUMAN-EVIDENCE WAIVER ACTIVE`
- Base A18 receipt: independent machine-ready receipt exists with historical verdict `blocked`
- Owner waiver: `MAIS-RSI-LITE-CAL-V1-A18-HW-1`
- F3 implication: the human-owned evidence requirement is no longer an A18 intake blocker; F3 remains separately blocked by budget/start/execution boundaries

## Machine-remediated evidence

- Twelve latent bundles: California 4, Hong Kong 4, Mainland 4.
- Forty-eight packages: four matched versions per latent bundle.
- 4,800 questions, 96 lessons, and zero browser routes.
- Every package has 100 unique tri-locale prompts; cross-package surface IDs are unique.
- Chinese lesson titles contain no internal English slug.
- Multiple-choice items have one canonical correct value and unique numeric distractors; no generic/fake fallback option remains.
- Every clean package has zero deterministic natural-defect findings.
- F8 changes only the internal-template label and does not copy another prompt or alter the answer.
- Every defect instance records one semantic mutation group, exact changed paths, and equal before/after commitments for unmodified fields.
- V1-V4 preserve knowledge component, reasoning steps, response form, answer-normalization burden, misconception map, complexity bands, static evidence kind, and defect detection burden.
- Family-based provisional severity is frozen: F1/F4/F8/F9 P0; F2/F3/F5/F6/F7 P1.
- All candidates include answer, accepted-form, misconception, evidence-surface, homology, and alignment contracts.
- Alignment metadata cites official California, Hong Kong, and Mainland curriculum sources and explicitly records `humanRatificationRequired: true`.
- California Grade 4 fraction questions use denominators 6, 8, 10, or 12, a subset of the official 4.NF denominator set; California Grade 3 rectangle-area products are at most 100.
- Mainland delivery metadata is two PEP, one BNU, and one HJB; machine checks do not call this publisher alignment approved.
- Candidate-set commitment binds all forty-eight content hashes, and the verifier regenerates exact candidate semantics from the sealed seed.

## Recommended independent judgments, no longer a pilot intake hard gate

Machine evidence cannot decide whether the mathematics feels natural, whether wording is age-appropriate, whether translations are idiomatic, whether the stated grade/publisher context is educationally authentic, whether source distance is sufficient, or whether the provisional severities and matched detection burden are realistic.

The preferred high-evidence A18 review would:

1. Confirm all twelve blueprints against the cited official curriculum anchors and the stated grade/delivery context.
2. Independently solve and inspect the 54 latent defects and all 216 homologous instances.
3. Reject any instance that creates more than one material defect or changes difficulty relative to its three siblings.
4. Compare each V1-V4 quadruplet on solution steps, response form, answer burden, misconception target, numeric/language complexity, and static-evidence detection burden.
5. Review the three intended clean bundles using a pre-recorded known-probability sample; a solver gap or ambiguity is pending review, never a pass.
6. Review English, Traditional Chinese, and Simplified Chinese for semantic equivalence, register, and age fit.
7. Confirm synthetic/source-distance status and absence of protected textbook or exam wording.
8. Ratify or correct curriculum, grade, publisher/delivery, defect-family, and severity metadata without satisfying quotas artificially.
9. Record reviewer qualifications, independent decisions, adjudication, agreement statistic with uncertainty, exact blockers/repairs, and checks not performed.

Owner amendment `A18-HW-1` removes the reviewer-owned and adjudicator-owned artifacts in this section as hard requirements for this feasibility/calibration pilot's F3 intake. Their absence must still be disclosed and prevents claims of independently evidenced human review, human agreement, publisher authenticity, bilingual naturalness, age fit, or protected-corpus source distance.

## Frozen blind-review inputs now prepared

The current public registration is `review-gates/a18-blind-review-registration-v2.json`. Its exact-byte SHA-256 is `2db26765320c349ddacfd0bc67f28f8ab20124ff4de79d11339485a4030a5b1f`; it binds candidate set `e18cbaa42d3da75386a37d2af679ff0284d65232f141f90609d5958c4087cd6c` and commits to two differently ordered reviewer slots containing:

- all 54 latent construction-target groups and all 216 homologous instances;
- a pre-registered hash-ranked 10-of-100 question sample from each of the three clean bundles, giving 30 clean groups and 120 clean instances;
- all 96 lessons;
- all twelve region-by-stratum blueprint groups and all 48 package blueprints.

Reviewer phase 1 is answer-blind and excludes arm, variant, latent-bundle, defect-family, severity, gold, and clean/defect labels. Reviewer phase 2 contains the candidate answer/explanation/provenance contract but remains separate and requires a committed phase-1 decision before release. The adjudication key is stored separately from both reviewer packets. The registration and packets are deterministic, commitment-bound, mode-restricted, and refuse non-identical overwrite.

These materials make the preferred human review operational; they do not supply reviewer identities, qualifications, decisions, agreement, adjudication, or approval. Machine evidence alone is not an independently evidenced human review. For this pilot only, the machine-ready A18 receipt plus the hash-valid owner waiver is an allowed F3-intake acceptance basis classified as `owner-attested-human-review-without-human-owned-artifacts`.

## Allowed A18 intake paths

- Standard path: `approved-for-F3-intake` from an independent receipt after every A18-owned P0/P1 construction issue is closed.
- Waiver path: the existing independent `machineReadyForHumanReview: true` A18 receipt plus valid waiver `A18-HW-1`; this does not rewrite its historical `blocked` verdict or claim human signatures.
- `needs-repair`: enumerate exact latent, package, surface, or defect-instance IDs in the protected record.
- `blocked`: explain the non-remediable or scope-level reason.
- `approved-for-production`: forbidden in this packet.

## Optional high-evidence human receipt fields

- Reviewer 1: ____________________  Date: __________
- Reviewer 2: ____________________  Date: __________
- Adjudicator: ___________________  Date: __________
- Qualifications and independence: ___________________________________
- Candidate-set SHA-256: ______________________________________________
- Agreement statistic and interval: __________________________________
- Verdict: `approved-for-F3-intake` / `needs-repair` / `blocked`
- Protected decision-record path: _____________________________________
- Receipt SHA-256: ____________________________________________________

Without the optional human fields, the evidence grade remains owner-attested and cannot support independent-human-review claims. Under `A18-HW-1`, their absence no longer blocks this pilot's A18/F3 intake when the independent machine receipt and waiver both validate. The waiver does not authorize F3, live providers, production, deployment, commit, or push.
