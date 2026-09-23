# A18 content decision: K–5 template candidate v4

## Identity and verdict

- Package: `us-ca-k5-verified-templates-v4`, `schemaVersion=1`, 111 English `US_CA_MATH` candidate practice questions, K–P5, 37 template families, 33 distinct CCSS IDs; all 111 questions lack a live topic mapping.
- Exact `question-pack.json` SHA-256: `ef2c98236d2d7667f23c1ce1011895b9541b9409e3d3deb06474531db477ef81`.
- Source hashes bound in the pack: template `9fe038ff04539e4ff16b9c7e857d4935540a54e5c2ca5081b09a8f2b80c68439`; generation script `5ce17288443dab89059632c98ea380a540160ace3e2b0c1ffad9329d94d48555`.
- Generator lane A21; independent reviewer A18. The read-only A18 verdict for this exact digest is **`approved-for-integration-review`**. The reviewer wrote no package files; this document records the task's independent review result for handoff.
- `packageStatus=candidate-only`, `integrationStatus=not-integrated`; no A23 Manifest or Receipt exists for this package.

## Evidence

- A18 independently recomputed 111/111 visible answers across 37/37 families during the v3 review. For v4 the reviewer independently compared every question content field with v3: all 111 are unchanged; only package-derived `id` and `batch` changed, with both correctly bound to v4.
- The v4 audit is bound to the pack SHA-256 and reports 111/111 solver-verified, 37/37 families, zero mismatches and zero issues. The audit command also fails for unreadable packs, zero solver coverage, wrong answer keys, and corrupted visible pattern terms; the six regression tests pass. Machine checks are supplementary to the A18 judgment.
- The prior v1 and v2 packages remain intact with `needs-repair` A18 decisions and separate hashes. Their issues and v3 remedies are recorded in the respective `qa-report.md` files.
- `generatedAt=2026-09-23T17:56:01.204Z` matched the file creation/modification second during A18 review. Both source SHA-256 fields matched local source bytes. The file times do not identify the operator or prove a complete run history.
- Original short math prompts were generated from numeric templates and public CCSS IDs; no private corpus, provider response, protected question bank, student data, secret, or answer-critical visual asset was used. A18 saw no obvious copied protected wording but did not run an external corpus similarity scan.

## Claim ceiling and handoff

Each row is a practice of a standard subskill; it does not establish full-standard mastery or learner outcomes. The package has no approved live topic mapping, Chinese-language variant, A23 Promotion, A11 regression, A22 release, owner production authorization, or same-SHA live proof. A18's decision allows exact-digest A23 **integration review input** only. Formal Shadow promotion and live routing remain subject to their own Manifest/Receipt and owner gates. No rows were integrated or deployed by this work.

Available artifacts: `question-pack.json`, `solvability-audit.json`, `solvability-audit.csv`, `solvability-audit.md`, this report, and `promotability-decision.md`. No manual-review queue is pending. Next owner is A23 for topic-mapping and candidate-to-live planning, with A04 practice, A11 regression, and A22 release required only after a later exact approved integration slice.
