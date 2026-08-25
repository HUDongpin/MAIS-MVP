# A06 G07 Physical-Commit Analytics Recovery

- Date: 2026-08-21
- Agent ID: A06, consuming the approved A08 analytics contract
- Workstream: Mainland Visualization Lab G07 physical-commit analytics
- Status: Candidate recovered and verified; independent review pending
- Worktree: `/Volumes/Starship/MAIS-china-viz-labs-wt`
- Branch: `codex/a06-china-visualization-labs-loop`
- Baseline commit: `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`

## Objective

Recover the interrupted G07 analytics tranche without editing A08-owned
`lib/learningAnalytics.ts`, `lib/learningAnalytics.test.ts`, or
`components/providers/AppProviders.tsx`. Verify that the seven symbolic
expression labs emit analytics only from real physical commit boundaries,
that the configured host supplies live analytics identity, and that the G07
C10 production evidence boundary remains native-provenance fail-closed.

## Takeover Audit

The assigned G07 candidate and its focused contract were already present when
this recovery session began. Their first recovery execution was green, so this
session did not manufacture a new implementation diff or claim a new RED/GREEN
cycle. The recovery task instead independently inspected the wiring, expanded
the verification matrix, and confirmed that the candidate did not drift while
the checks ran.

Observed behavior:

- SSR and pure reducer/model state derivation emit zero learning events.
- Every allowed G07 mode click maps once to `visualization-probe`.
- Range pointer-up maps once to `visualization-slider`, including min/max
  no-op boundaries.
- Only unmodified Arrow, Home, End, PageUp, and PageDown key-up commits map to
  `visualization-slider`; Tab, Shift, modifier chords, characters, and spaces
  emit zero events.
- Each reset click maps once to `visualization-reset`.
- The configured callback exists only on G01, G02, and G07 dedicated branches;
  G03-G06 remain without this callback.
- The configured host uses the live catalog source/topic and the existing
  `recordLearningEvent` user context. Non-reset physical commits retain
  `preservePhysicalCommit: true`.
- The public G07 receipt validator still rejects production readiness because
  native physical provenance is unavailable; untrusted structural validation
  remains separate and cannot be substituted by the browser producer.

## Frozen Candidate Hashes

```text
2ec901a26b37845aaded16fb2d68693477904d8ff8c068cbeaac2b7d8fb3f104  components/visualizations/mainland/MainlandPhysicalCommitAnalytics.ts
b132756f0d2625594b1aed81f9b01279486f36e6c51c1543045c77b1e8cac02e  components/visualizations/mainland/MainlandPhysicalCommitAnalytics.test.ts
cd1e2773484b2740a757b5feeece431b9459d1fcb45d8c03e69a3f9c15661099  components/visualizations/mainland/MainlandPhysicalCommitComponentContracts.test.tsx
c841210a597224ec52fe832c00a85057c1b27d31438ee2d4e1c38b0168288979  components/visualizations/mainland/SymbolicExpressionsLab.tsx
7519476abc7342f13b20f9c8a75a7138d7f82f7a32ae1c796c6d1322a113d5f8  components/visualizations/mainland/SymbolicExpressionsPhysicalCommitContracts.test.tsx
acd0d3f7a7b47ed0ce87d1393353790140083d757daeed83334b21d411202d59  components/visualizations/ConfiguredVisualizationLab.tsx
5bbc7acd132033e2a602d4075565b597fd551f1e840b2fcde817de88121cc939  components/visualizations/configuredVisualizationMainlandProductionDispatch.test.tsx
eca1db7e3a31a32c085bdb062f30d7290a83d5bab4efb33701b80a1993e381db  lib/learningAnalytics.ts
176d45ed4e86b976249bfe6d87d581fc76b321a3d5b0cd27c102f12eeae56934  lib/learningAnalytics.test.ts
79264ccd8fdd77d81777df1b4f88d36655eb8e10a7bef044eae9d336ce6e4169  components/providers/AppProviders.tsx
33e9e4c9c5b5cd68dbf21276e3d53aaa8074825dc611099e9a0e420e9570d700  tests/e2e/china-mainland-g07-production-plan.ts
6439f5df5851f7fb6972b3748eb72b66b536d467b292b51e7b3b47f81fca9f8a  tests/e2e/china-mainland-g07-production-receipt.ts
6c064c742f77ab707bc73a9a8c3c9061b5bb68662e67825e56977694bfb4f164  tests/e2e/china-mainland-g07-production-browser.spec.ts
85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6  next-env.d.ts
```

## Checks

- `./node_modules/.bin/tsx --test components/visualizations/mainland/SymbolicExpressionsPhysicalCommitContracts.test.tsx`
  - PASS, 7/7.
- Eleven-file focused matrix covering SymbolicExpressions domain/model/visual
  behavior, component physical commits, configured production dispatch, G07
  plan, receipt, and browser-source contracts:
  - PASS, process exit 0.
- `npm run test:analytics`
  - PASS, 133/133.
- `npm run type-check -- --pretty false`
  - PASS, process exit 0.
- `git diff --check --` on the focused candidate paths
  - PASS.
- Protected `next-env.d.ts` SHA-256 before and after checks
  - unchanged at `85ae5aee75f011967cf2d25cbc342f62d69314e9d925f7f4aa3456fc2cffcca6`.

## Checks Not Run

- No Playwright browser run, production build, network call, database mutation,
  or Git mutation was performed; all were outside this recovery slice.

## Handoff

- Dirty-state final action: evidence archive; candidate remains uncommitted and
  must not be staged by this session.
- Worktree lifecycle action: retained for the parent loop.
- Release status: not approved. Request a DIFFERENT reviewer against the exact
  hashes above. Browser-wide G07/native provenance and the parent exact92/full
  gates remain separate downstream requirements.
