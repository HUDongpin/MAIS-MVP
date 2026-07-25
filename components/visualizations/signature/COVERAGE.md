# Signature lab coverage (California / CCSS)

Snapshot after the full port of the Claude Math Visual library into MAIS. These
labs cover the **US California** math curriculum only — California is the sole US
track carrying CCSS standard ids, which is the join key. Arkansas, Florida, and
North Carolina keep the template renderer.

Regenerate the numbers with
`npx tsx --tsconfig ./tsconfig.json scripts/build-signature-lab-candidates.ts`.

## Benches

| | Count |
| --- | ---: |
| Benches in the Claude Math Visual library | 187 |
| Ported from that library into `signature/` | 187 (was 3 in Phase 0, 184 before 2026-07-25) |
| **MAIS-authored benches** | **5** |
| **Total benches in `signature/`** | **192** |
| Audits beside them (math-gate proofs) | 181 |
| Benches with no audit | 11 |

Three ports landed on 2026-07-25 — `StoryProblemLab`, `PlaceJumpLab`,
`CompositionLab`. They had always joined a California topic on their own CCSS tags
but had never been ported, so the join found them and nothing could render them.

### MAIS-authored benches

Written here, not ported, for standards the depth audit found had **no bench in the
library at all**. Each follows the house style (staged `STEPS`, dials, predict-then-
check, calibration) and ships with its own mutation-tested audit:

| Bench | Standards | Audit |
| --- | --- | ---: |
| `ComplexArithmeticLab` | N-CN.3, N-CN.4, N-CN.5, N-CN.6 | 310,502 checks · 11 mutants |
| `GeometricModelingLab` | G-MG.1, G-MG.2, G-MG.3 | 37,036 checks · 11 mutants |
| `CoordinateMethodsLab` | G-GPE.6, G-GPE.7 | 872,931 checks · 11 mutants |
| `ClosureLab` | N-RN.3 | 86,336 checks · 11 mutants |
| `EliminationLab` | A-REI.5 | 399,163 checks · 11 mutants |

Their common discipline: **exact arithmetic**, so the calibration stamp is an integer
or reduced-fraction equality that a float can never fire — Gaussian-integer lattice
points, whole-number coefficients of π, shoelace areas exact in halves, exact pairs
in ℚ(√2), and integer determinants. Where a quantity is genuinely irrational (a
modulus, a perimeter, an angle) the bench prints
the exact squared value beside it and labels the rounded one as rounded.

## Embedding into California topics (fan-out)

| | Count |
| --- | ---: |
| California topics in the catalog | 76 |
| **Topics that render a signature lab** | **76** (all) |
| Topics still on the template | 0 |
| **Benches embedded (reachable via a topic)** | **183 / 187** |
|  ↳ render by default (a topic's `primary`) | 54 |
|  ↳ reachable via the switcher (`related` only) | 129 |
| Benches ported but with no California home | 4 |

The four with no home are `DerivativeLab`, `IntegralLab`, `LimitLab` and
`SeriesLab`: CCSS-M has no calculus standards, so there is nothing for them to join
on. Every other bench is reachable.

Every embedded bench is reachable in the browser: the `primary` renders when the
topic opens, and each `related` bench is one click away via the
`SignatureBenchSwitcher` chip row. Verified live (dev server, Student guest):
`us-ca-math-s3-chapter-03` renders `ExponentialFunctionLab` by default and switches
to `LogarithmLab` on the chip; on 2026-07-25 every newly wired bench was opened the
same way and confirmed to draw.

## CCSS coverage (2026-07-25 depth audit)

Of the 385 CCSS-M standards, **329 (85%)** have a bench a student can reach; 50 are
claimed only by a chapter's domain auto-fill and **2 have nothing at all**
(`N-CN.8`, `G-GMD.2`). Both are ordinary buildable work — Cavalieri especially
(two stacks of slices, shear one, equal cross-sections, volume unchanged) would sit
beside PyramidLab without colliding, since dissection and equal-cross-section are
different arguments.

Of the 54 gaps that remain, most are ordinary conceptual-model standards — the kind
this library builds well; they are simply unbuilt. The harder residue is word
problems, proofs, fluency, and study design. Only **study design is categorically
absent** (S-IC.2/.3/.5/.6, S-MD.6/.7 — 0 of 6 covered anywhere); the library does
carry word-problem benches (StoryProblemLab, TwoStepLab), proof benches
(ProofChainLab, CongruenceLab) and fluency benches (PlaceJumpLab,
RegroupingSubtractionLab), just at a lower rate. Full analysis and the per-standard
table: `~/Desktop/20260725_Depth Audit of US Math Visualization Labs.md`.

**Before adding a CCSS tag to a bench, read its lesson steps.** Every tag in
`data/signatureLabCcssOverrides.ts` is a standard the bench's own lesson
demonstrably teaches; a near-miss tag re-creates exactly the paper coverage that
audit exposed. That judgement is the part no tool can check for you.

When a bench already has an entry, **extend it rather than adding a second key** —
in JavaScript the later key would win and the first tag would be lost. This is not
a silent failure: `tsc` rejects it as `TS1117 — An object literal cannot have
multiple properties with the same name`, pointing at the duplicate line. TS1117 is
a grammar error, so no compiler flag can switch it off and `npm run type-check`
(and the pre-build gate) will fail before the file can ship. Verified on
2026-07-25 by injecting a duplicate into this file and watching the real project
config reject it.

## Upstream drift

The ported copy of a bench is the upstream file with the standalone
`<p className="eyebrow">MAIS · Interactive Math Lab</p>` header removed — MAIS
renders its own chrome. Everything else is byte-identical, which is what makes an
upstream `audit-*.mjs` valid against the ported file (the audits slice their model
out of the shipped component).

A drift sweep on 2026-07-25 found exactly one bench that had fallen behind:
`LikeTermsLab` was missing the 137-line `7.EE.A.2` step ("rewriting reveals
meaning": a + 0.05a = 1.05a) that upstream added on 2026-07-18. Because
`labs.json` already tagged the bench `7.EE.A.2`, the catalog was claiming a lesson
the shipped file did not contain. Re-ported. Worth re-running that sweep before
trusting any upstream CCSS tag:

```sh
for f in components/visualizations/signature/*.jsx; do
  u=~/Desktop/"Claude Math Visual"/$(basename "$f")
  [ -f "$u" ] && [ "$(diff "$f" "$u" | grep -cE '^[<>]')" -gt 1 ] && echo "DRIFT: $f"
done
```

## The "Modeling" chapters

The three **"Modeling"** chapters (`us-ca-math-s3-chapter-04`,
`us-ca-math-s6-chapter-01`, `us-ca-math-s6-chapter-05`) carry the lone standard
`"Modeling"` — a cross-cutting CCSS ★ category, not a numbered content standard.
They are now anchored by grade-appropriate benches from a shared modeling-cycle
set (`GraphStoryLab`, `BestFitLab`, `FunctionLab`, `CompareFunctionsLab`,
`FormulaLab`, `OptimizationLab`), tagged `"Modeling"` in
`signatureLabCcssOverrides.ts`. `normalizeCcss("Modeling") === "Modeling"`, so
they join through the same pipeline as every other topic.

**Two of those three primaries changed on 2026-07-25.** `s3-ch04` and `s6-ch01`
had been reduced to the bare `Modeling` token by a description scrape that
outranked their declared domains (G-GPE and N-Q), so a modeling bench ended up
anchoring a coordinate-geometry chapter and a quantities chapter. With the domains
restored the primaries are: `s3-ch04` → **CircleLab** (G-GPE.1), `s6-ch01` →
**VectorLab** (N-VM.1), `s6-ch05` → CompareFunctionsLab (model selection, and
genuinely a Modeling chapter). The modeling benches stay attached to all three as
`related`, because the scraped `Modeling` tag is kept alongside the domain.

## The 4 benches with no California home

**This list was 16 until 2026-07-25.** Twelve of those benches were ported,
routed and rendering, but no CA topic carried their standards, so the join had
nowhere to place them — conics, coordinate and solid geometry, matrices, vectors,
the complex plane, irrationals and radical equations. They now have chapters via
`californiaChapterSupplementalStandards` in `data/visualizationLabs.ts` and are all
reachable.

What genuinely remains homeless is the calculus set — `DerivativeLab`,
`IntegralLab`, `LimitLab`, `SeriesLab` — because CCSS-M has no calculus standards
to join on. That is a curriculum fact, not a gap to close.

To give a bench a home, add a truthful CCSS tag in
`data/signatureLabCcssOverrides.ts` **only if** the bench's own lesson teaches that
standard, and give the standard a chapter in
`californiaChapterSupplementalStandards` **only if** a bench attached to that
chapter teaches it. Both halves matter: the first stops a bench claiming a lesson
it does not contain, the second stops a chapter claiming coverage no bench
provides. Do not invent a mapping the standards don't support.

## Writing a new bench

Copy the structure of a recent compact port (`PlaceJumpLab`, ~550 lines):
`MODEL:START` / `MODEL:END` sentinels around pure React-free math, a `STEPS` array
with predict-then-check and exactly one `calib` step last, dials that unlock per
step, a canvas renderer, styled-jsx. Then register in three places —
`signatureLabIds`, `SignatureLabRoutes` (tsc enforces completeness via
`satisfies`), and a CCSS tag plus a chapter and a topic's `related` list.

Two rules learned the hard way, both recorded in the audits themselves:

- **Hold exact arithmetic.** The `CALIBRATED` stamp must be an integer or
  reduced-fraction equality. A float stamp is the failure mode the mutants hunt.
- **Test what the code does, not what the prose says.** Distinctness checks that
  ban a *word* have produced a false failure in four benches running — `slope`
  caught a silo's "sloped floor"; `unit square` caught a legitimate citation of
  AreaLab; `proof` caught a citation of IrrationalLab. Structural assertions have
  produced none. And if a mutant survives, check whether the branch it targets is
  reachable at all: a defensive guard that cannot fire is not a hole in the code,
  and the right response is to move the mutation slot, not to weaken the guard.
