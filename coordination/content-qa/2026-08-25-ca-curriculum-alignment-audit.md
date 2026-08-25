# California curriculum-alignment audit of the signature benches — 2026-08-25

Scope: every topic→bench pairing serving California on branch
`claude/ca-codex-viz-replacement` (PR #143). The Phase-1 flip made each topic's
`primary` bench the default in its lesson, so the primary must genuinely teach
the topic's CCSS standards — COVERAGE.md's own rule: a tag counts only if the
bench's lesson demonstrably teaches that standard.

## Method

1. **Mechanical join check** (dataset built from the live catalog + assignments
   + effective tags = upstream `labs.json` at `/Volumes/Starship/Claude Math
   Visual` merged with `signatureLabCcssOverrides`): all 76 topics, zero
   inconsistencies — every primary and every related bench shares ≥1 standard
   with its topic, before and after the fixes below.
2. **Live CCSS depth audit** against the real upstream library reproduces the
   documented baseline exactly: 385 standards, 329 (85.5%) real-visual, the
   only bench-less standards being G-GMD.2 and N-CN.8. No regression.
3. **Deep content read of all 76 primaries**: 8 parallel reviewers read each
   primary's lesson STEPS against the official standard text and judged
   ALIGNED / PARTIAL / MISALIGNED; every non-ALIGNED verdict then faced two
   independent adversarial refuters (mathematician lens + grade-teacher lens).
   One topic (s4-ch05 ConditionalLab) was missed by its reviewer and judged
   directly: ALIGNED (header and steps teach S-CP.1–5 — the crop as restricted
   sample space, independence via cross-multiplication, P(A|B) vs P(B|A)).

**Outcome: 57 of 76 aligned as-is; 17 deficiencies confirmed by both
refuters; 2 contested (1 of 2 refuters) — left unchanged and recorded below;
0 flags survived refutation and were dropped.**

## Fixes applied (this commit)

**12 primary swaps** in `data/signatureLabAssignments.ts` (each rationale
carries the audit trail; the old primary stays one chip away as related except
where noted; join-consistency re-verified mechanically after the swaps; three
spot-checked live on the dev server):

| Topic | Was | Now | Why |
|---|---|---|---|
| K K.OA compose/decompose | SubtractionLab | **NumberBondLab** | the topic's namesake is K.OA.3/4 decomposition |
| P1 1.G shape reasoning | PositionLab | **ShapesLab** | PositionLab is K.G.1-only (its header says so); 1.G.1 tag was paper — PositionLab detached |
| P1 H1 picture join stories | SubtractionLab | **AddLab** | join topics must not default to a take-away bench |
| P1 H3 cube-train join | SubtractionLab | **AddLab** | same |
| P1 H5 model+equation join | SubtractionLab | **AddLab** | same, with EqualSignLab for 1.OA.7 |
| P2 three-digit place value | TwoDigitNumberLab | **ComparingLab** | TwoDigitNumberLab caps at 0–99; ComparingLab's H/T/O dials run 0–999 |
| P4 4.G lines & shapes | AngleTurnLab | **LinesRaysSegmentsLab** | AngleTurnLab teaches 4.MD.C measure, not 4.G.1 |
| P5 5.NF operations | FractionAdditionLab | **UnlikeDenominatorsLab** | FractionAdditionLab is the grade-4 like-denominator lab by its own header |
| S1 7.NS rational ops | AbsoluteValueLab | **SignedAdditionLab** | AbsoluteValueLab's model is Algebra-1 y=\|mx+b\|; SignedAdditionLab is 7.NS.A.1-native |
| S1 7.EE expressions | CommutativeLab | **DistributiveLab** | CommutativeLab is numeric fact-pairs (grade 1/3 register); DistributiveLab expands/factors linear expressions |
| S5 data modeling & residuals | BoxPlotLab | **BestFitLab** | the chapter is residuals (S-ID.6/7), BestFitLab's exact subject |
| S6 modeling capstone | CompareFunctionsLab | **BestFitLab** | CompareFunctionsLab self-declares GRADE 8; BestFitLab carries the fit/validate steps of the modeling cycle |

**Documented, not changed:**

- **Upstream paper tags** (live in `labs.json` outside this repo — do not trust
  them in future curation without reading the lesson): PositionLab `1.G.A.1` and
  `K.G.A.2`; SubtractionLab `K.OA.A.2`; ExpectedValueLab `S-MD.A.4` (its header
  explicitly refuses long-run/empirical content); FractionAdditionLab `5.NF.A.1`;
  TwoDigitNumberLab `2.NBT.A.1`; CommutativeLab `7.EE.A.1`; CongruenceLab
  `G-CO.B.7`/`G-CO.B.8` (criteria named only in a comment that disavows them);
  CircleTheoremsLab `G-C.A.1`/`G-C.A.4` (similarity argument and tangent
  construction not taught). Correcting them is an upstream-library edit for the
  owner; until then the assignments above no longer rely on any of them.
- **Contested (1 of 2 refuters upheld, no change):** P4 multi-digit
  (ComparingLab caps at 999 for a grade-4 chapter — but 4.NBT.2's compare-by-
  place content is taught correctly); S5 inference (SamplingLab is the S-IC.1
  on-ramp at grade-7 register; SamplingDistributionLab stays related).
- **Content gaps for the plan's Phase 3** (no attached bench teaches them —
  honest gaps, not misalignments): the 38-topic uncovered-standards list in
  `.tmp` dataset, notably 6.G.2's fractional-edge volume (VolumeLab is integer-
  only by design), S-IC.2/3/5/6, S-MD.4/6/7, G-CO.1/.4, 3.OA.3/3.OA.7/3.NBT.3.
- **Question-bank mis-tag** (task chip spawned): all 42 s6-ch03 questions carry
  domainTag "polynomial structure" on the Decision Statistics chapter; the lab
  layer already pins corrected copy via `topicFocusOverrides`.

## Gates after fixes

`test:signature-labs` (192 audits + assignment contract) green; `tsc --noEmit`
clean; `test:components` 384 pass; `test:visualizations` 163 pass;
`test:ccss-depth` green; `audit:zh-hans:strict` exit 0. Live: s1-ch03 →
DistributiveLab, p1-1-g → ShapesLab, p5-5-nf → UnlikeDenominatorsLab confirmed
rendering as the active bench on the dev server.
