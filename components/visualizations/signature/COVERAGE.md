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
| Audits beside them (math-gate proofs) | **192 (all)** |
| Benches with no audit | 0 (was 11 before 2026-07-26) |

Three ports landed on 2026-07-25 — `StoryProblemLab`, `PlaceJumpLab`,
`CompositionLab`. They had always joined a California topic on their own CCSS tags
but had never been ported, so the join found them and nothing could render them.

The last 11 audits landed on 2026-07-26, closing the gap the content-QA pass
found: the conic and trig-function labs (`AngleLab`, `CircleLab`, `EllipseLab`,
`HyperbolaLab`, `ParabolaLab`, `QuadraticFunctionLab`, and the five
sine/cosine/tangent/secant/cosecant benches) were the only benches with no
machine proof — and the heaviest mathematics in the library. Each new audit
slices and evals the shipped model, re-derives every quiz key, and proves the
calibration meter (exact target ⇒ 0, one dial step ⇒ never stamps); all were
mutation-verified (18 seeded defects, 18 caught). Writing `audit-sine.mjs`
immediately found and fixed a real leniency: SineFunctionLab's stamp threshold
(0.1) accepted a π/12 phase error on a half-amplitude target, so the lab's
`MATCH_RMS` is now 0.03.

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
| **Benches embedded (reachable via a topic)** | **186 / 192** |
|  ↳ render by default (a topic's `primary`) | 58 |
|  ↳ reachable via the switcher (`related` only) | 128 |
| Benches ported but with no California home | 6 |

The six with no home are `DerivativeLab`, `IntegralLab`, `LimitLab`, `SeriesLab`,
`MatrixLab`, and `VectorLab`. CCSS-M has no calculus standards for the first four;
the current California N-Q route does not teach the N-VM matrix/vector contract,
so the latter two are deliberately not used as near-miss substitutes. Every other
bench is reachable.

Every embedded bench is reachable in the browser: the `primary` renders when the
topic opens, and each `related` bench is one click away via the
`SignatureBenchSwitcher` chip row. Verified live (dev server, Student guest):
`us-ca-math-s3-chapter-03` renders `LineParabolaLab` by default and switches to
`QuadraticEquationLab` on the chip; on 2026-07-25 every newly wired bench was opened the
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

### Covered is not the same as met

Of the 192 benches, only **54 render by default** — one `primary` per topic, 76
topics. The other 138 are reachable only through the `SignatureBenchSwitcher`
chip row. That is the fan-out design working as intended, not a routing bug, but
it does mean the 85% above is what a student *can* reach, not what they *do*.

Whether the chip row is actually used was unanswerable until 2026-07-25, because
the click emitted nothing. It now emits `viz-nav:bench-switch:<BenchId>`. Tracing
the read path afterwards found the other half: **nothing in the repo consumes the
navigation channel** — not the new event and not the pre-existing
`open-lab-tile` events, which had been writing to a table nobody queried.

`npm run report:bench-usage -- --file <export>` is the reader. Its `switchRate`
is the number that matters: the share of lab opens where a student went on to try
another bench. Near zero would mean the 138 switcher-only benches are not being
met, and the coverage figure overstates what learners actually see.

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
`labs.json` already tagged the bench `7.EE.A.2`, the catalog claimed a lesson the
shipped file did not contain, for a week, until someone happened to look.

That is now automated:

```sh
npm run check:port-drift              # report drift
npm run check:port-drift -- --write   # re-record after a port
```

`port-manifest.json` beside the benches records each one's upstream SHA-256 at
port time, so drift is an exact comparison rather than a diff someone has to
remember to run. It also catches a ported file edited locally away from its
recorded hash — which would silently break the contract the audits rely on, since
they slice their model out of the shipped file.

**It is not a CI gate, and cannot be**: the upstream library lives outside the
repo, so CI has nothing to compare against — the same constraint that makes the
CCSS depth gate read a committed snapshot. Run it locally after a port and before
trusting an upstream CCSS tag. With the library absent it exits 0 with a notice.

Two ports differ from a byte-exact "upstream minus the header": `ShapesLab`
indents that header by six spaces rather than eight (the check allows any
indentation), and `QuadraticEquationLab` differs by two blank lines. The check
reports whitespace-only differences separately from content differences on
purpose — lumping them together is how a real drift gets lost among shrugs.

## The "Modeling" chapters

The three **"Modeling"** chapters (`us-ca-math-s3-chapter-04`,
`us-ca-math-s6-chapter-01`, `us-ca-math-s6-chapter-05`) carry the lone standard
`"Modeling"` — a cross-cutting CCSS ★ category, not a numbered content standard.
They are now anchored by grade-appropriate benches from a shared modeling-cycle
set (`GraphStoryLab`, `BestFitLab`, `FunctionLab`, `CompareFunctionsLab`,
`FormulaLab`, `OptimizationLab`), tagged `"Modeling"` in
`signatureLabCcssOverrides.ts`. `normalizeCcss("Modeling") === "Modeling"`, so
they join through the same pipeline as every other topic.

`s3-ch04` and `s6-ch01` had once been reduced to the bare `Modeling` token by a
description scrape that outranked their declared domains (G-GPE and N-Q), so a
generic modeling bench anchored both routes. The current audited primaries are:
`s3-ch04` → **CircleLab** (G-GPE.1), `s6-ch01` → **FormulaLab** with unit,
conversion, rounding, and notation foundations (N-Q.1-.3), and `s6-ch05` →
**CompareFunctionsLab** (model selection in a genuine Modeling chapter). Matrix
and vector benches are no longer attached to the N-Q route merely because N-VM
shares the Number & Quantity category.

## The 6 benches with no California home

**This list was 16 until 2026-07-25.** Most of those benches were ported and gained
truthful homes through `californiaChapterSupplementalStandards` in
`data/visualizationLabs.ts`: conics, coordinate and solid geometry, the complex
plane, irrationals, and radical equations are now reachable. A later A18 semantic
review removed the N-VM near-match from the N-Q quantities route, so `MatrixLab`
and `VectorLab` correctly returned to this list.

The other four are the calculus set — `DerivativeLab`, `IntegralLab`, `LimitLab`,
and `SeriesLab` — because CCSS-M has no calculus standards to join on. These six
unassigned benches represent curriculum or semantic boundaries, not missing route
wiring to be repaired with a near-match.

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
