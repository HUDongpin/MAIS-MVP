# HK visualization archive refs — harvest disposition

- Date: 2026-08-26
- Author: Claude (Opus 5)
- Closes: the open-ended "any future use must start from fresh main…" clause left by
  `coordination/release-intake/2026-08-23-A25-a06-hk-visualization-labs-loop-evidence-archive.md`
- **Review date: 2026-11-26** (three months). If nothing below has been harvested by then,
  drop the harvest plan and keep the refs as historical record only.

Two refs hold abandoned Hong Kong visualization work with no owner and no decision:

| Ref | Size | State |
| --- | --- | --- |
| `origin/archive/a06-hk-visualization-labs-loop-wip-20260823` | 182 paths, 202,564 insertions | Private evidence archive. Never PR'd. Its own record says *"do not claim exhaustive HK browser or curriculum acceptance"* and *"Current-turn runtime/browser/content tests: NOT RUN"* |
| `origin/codex/a18-hk-ease-v2-qa` | 128 tests / 4,671 lines across 10 HK viz test files | Unmerged branch, well behind main |

## What I checked

Read the HK test files on `codex/a18-hk-ease-v2-qa` and their imports:

```
hkPrimaryFinalCurriculumOracle.test.ts        13 tests /  374 lines
hkPrimaryVisualizationLabContracts.test.ts    33 tests /  859 lines
hkSecondaryVisualizationLabContracts.test.ts  36 tests /  975 lines
hkVisualizationLessonContracts.test.ts        14 tests /  673 lines
```

## Disposition

### Do NOT harvest — bound to a renderer that does not exist on main

Every one of those files imports from `components/visualizations/hk/*`
(`HKPrimaryVisualizationLab.tsx`, `HKSecondaryVisualizationLab.tsx`,
`hkVisualizationLabRegistry.ts`). That HK-specific renderer is **not on main and
is not coming** — main serves HK through the shared `ConfiguredVisualizationLab`.
Rebasing the tests means rewriting every assertion against a different component,
which is not cheaper than writing new ones.

Also skip the `sourceSection(start, end)` half of the oracle: it slices the
component's **source text** and asserts against string ranges. That is precisely
the technique the 2026-08-26 audit identified as unable to prove mathematics, and
which `configuredVisualizationLabModel.test.ts` replaced with executed models.

### DO harvest — renderer-agnostic mathematics

`hkPrimaryFinalCurriculumOracle.test.ts` carries independently written helpers
(`factors`, `factorPairs`, `hcf`, `lcm` and the curriculum values they check)
that owe nothing to any renderer. These are exactly the closed forms a
behavioural proof needs, and re-deriving them from scratch would be wasted work.

**Harvest as:** lift the helpers and their expected values into a model test
beside `configuredVisualizationLabModel.test.ts`, asserting against the shipped
model rather than the retired HK component. Estimated: half a day, no dependency
on the archive branch being reopened.

### Keep as historical record only

The remaining ~197 paths on the A06 archive (session/API/outbox semantics, RAG
and question artefacts, the 15,098-line frozen manifest in
`tests/e2e/hk-visualization-dependent-transition-plan-manifest.mjs`) belong to
A08/A12/A15/A21/A11 lanes, not to visualization content. Nothing here recommends
reopening them. Note for anyone tempted by the headline line count: roughly 12%
of the e2e total is generated hash/plan constants, not authored tests.

## Why this closes the item

The audit's finding was not that the archived work is valuable or worthless — it
was that **135,079 lines sat in indefinite hold with nobody accountable for
deciding**. This record decides: one narrow harvest, everything else historical,
with a date. If the review date passes untouched, that is itself an answer.
