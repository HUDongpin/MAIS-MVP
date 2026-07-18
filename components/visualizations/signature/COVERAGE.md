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
| Benches in the Claude Math Visual library | 184 |
| **Ported into `signature/`** | **184** (was 3 in Phase 0) |
| Audits ported (math-gate proofs) | 173 |
| Benches with no upstream audit | 11 |

## Embedding into California topics (fan-out)

| | Count |
| --- | ---: |
| California topics in the catalog | 76 |
| **Topics that render a signature lab** | **76** (all) |
| Topics still on the template | 0 |
| **Benches embedded (reachable via a topic)** | **168 / 184** |
|  ↳ render by default (a topic's `primary`) | 53 |
|  ↳ reachable via the switcher (`related` only) | 115 |
| Benches ported but with no California home | 16 |

Every embedded bench is reachable in the browser: the `primary` renders when the
topic opens, and each `related` bench is one click away via the
`SignatureBenchSwitcher` chip row. Verified live (worktree dev server, Student
guest, US/CA S3): `us-ca-math-s3-chapter-03` renders `ExponentialFunctionLab` by
default and switches to `LogarithmLab` on the chip — both are ported benches.

## The "Modeling" chapters

The three **"Modeling"** chapters (`us-ca-math-s3-chapter-04`,
`us-ca-math-s6-chapter-01`, `us-ca-math-s6-chapter-05`) carry the lone standard
`"Modeling"` — a cross-cutting CCSS ★ category, not a numbered content standard.
They are now anchored by grade-appropriate benches from a shared modeling-cycle
set (`GraphStoryLab`, `BestFitLab`, `FunctionLab`, `CompareFunctionsLab`,
`FormulaLab`, `OptimizationLab`), tagged `"Modeling"` in
`signatureLabCcssOverrides.ts`. `normalizeCcss("Modeling") === "Modeling"`, so
they join through the same pipeline as every other topic. Primaries: `s3-ch04`
→ GraphStoryLab (formulate), `s6-ch01` → BestFitLab (fit/validate), `s6-ch05` →
CompareFunctionsLab (model selection).

## The 16 benches with no California home

These carry (or teach) standards that **no** California catalog topic lists, so
the CCSS join has nowhere to place them. This is a catalog-scope fact, not a
porting gap — the benches are ported, routed, and render; they simply have no CA
topic to attach to.

- **Conic sections (G-GPE.A):** `CircleLab`, `EllipseLab`, `HyperbolaLab`, `ParabolaLab`
- **Coordinate / solid geometry (G-GPE.B, G-GMD.B):** `PerpSlopeLab`, `RevolutionLab`
- **Radical / systems equations (A-REI.A/C — not listed by any CA topic):** `ExtraneousLab`, `LineParabolaLab`
- **Number systems beyond the CA topic set:** `ComplexPlaneLab` (N-CN), `MatrixLab` (N-VM), `VectorLab` (N-VM), `IrrationalLab` (8.NS)
- **Calculus (no K–12 CCSS):** `DerivativeLab`, `IntegralLab`, `LimitLab`, `SeriesLab`

To give any of these a home later, add a truthful CCSS tag in
`data/signatureLabCcssOverrides.ts` **only if** a CA topic actually carries that
standard, then regenerate. Do not invent a mapping the standards don't support.
