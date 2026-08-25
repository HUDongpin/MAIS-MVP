# Mainland Visualization semantic oracle delta audit

Date: 2026-08-10

Lane: A18 curriculum QA (independent, read-only against product/runtime source)

Worktree snapshot: `/Volumes/Starship/MAIS-china-viz-labs-wt`

Branch/base: `codex/a06-china-visualization-labs-loop` / `3f8f12c4d3fd2efe938d1b07cab6289315f108dd`

Frozen source oracle: `mainland-visualization-semantic-oracle.v1.json` (`3ba1a22a40afed2cd4c6a315f88921df5ae179f3901bd9f17d4287672023abee`)

Exact candidate delta: `2026-08-10-A18-mainland-visualization-semantic-oracle-delta-candidate.v1.json`

## Decision

`approved-for-integration-review`, not `approved-for-production`.

The current source differs from the frozen 335-entry oracle in exactly 114 IDs:

- 109 promise hashes differ.
- 6 production dispositions differ.
- One ID (`bnu-primary-p1-upper-comparison`) is in both sets.
- The union is therefore 114.

Of those 114 changed entries:

- 110 are approved as a candidate oracle delta: the exact 108 previously classified `repair-required:narrow-before-live`, plus `bnu-primary-p1-upper-comparison`, plus `bnu-primary-p3-lower-area`.
- 4 remain `repair-required`: the four specialized P5 fraction-operation topics listed below.
- The other 61 frozen RED entries are untouched and remain RED. Their exact IDs are preserved in the candidate JSON; none is promoted by this audit.

If the candidate delta is independently accepted and applied to a successor oracle, the semantic-oracle-only totals would be 270 pass and 65 repair-required. These counts do not imply browser, persistence, release, or production acceptance.

## Promise delta audit

The 109 promise mismatches are structurally exact:

- The mismatch set contains all 108 and only the 108 IDs exported by `mainlandNarrowedSemanticPromiseLabIds`.
- The only mismatch outside that explicit set is `bnu-primary-p1-upper-comparison`.
- All 108 entries were already classified by the frozen independent oracle as `repair-required:narrow-before-live`; none came from the protected `pass:exact` or `repair-required:exact` promise set.
- The current preset application changes only `templateConfig.focus` and `templateConfig.formula`. It does not rewrite the specialized title or the frozen renderer disposition.
- The 227-ID complement is unchanged by the narrowing mechanism.
- All frozen required modes remain reachable for the 108 entries, and no frozen forbidden mode is exposed. `pep-junior-s1-lower-lines-coordinates` has additional explicit parallel/perpendicular/intersecting representations; the frozen required parallel-transversal mode remains reachable and no forbidden mode is introduced.

The 108 focus/formula projections retain each title's audited core mathematics. Examples include the Pythagorean equation and converse, exact fraction equivalence, rectangle area/perimeter, unit-cube volume, ratio scaling, circle sectors, conic equations, unit-circle/wave linkage, derivative/critical-point reasoning, and discrete distribution moments. Broad chapter/review promises are narrowed to the already-frozen family, modes, and invariants; no specialized operation named in those titles is replaced by unrelated mathematics.

The exact 108 IDs and their expected new SHA-256 promise hashes are in `narrowPromiseDecision.entries` in the candidate JSON. For every one of those entries, the expected successor-oracle fields are:

- `auditStatus: pass`
- `focusPolicy: exact`
- `disposition`, `requiredModes`, `forbiddenModes`, and `requiredInvariantIds`: unchanged from frozen v1
- `normalizedPromiseSha256`: the per-ID value recorded in the candidate JSON
- `rationale: ""`

## Six route-delta decisions

| Lab ID | Expected successor disposition | Status | Promise SHA-256 | Independent reason |
| --- | --- | --- | --- | --- |
| `bnu-primary-p1-upper-comparison` | direct `attribute-comparison / quantity-length-height-mass`; modes `quantity`, `length`, `height`, `mass`; invariants relation and absolute difference | PASS candidate | `0314c04f3bd2c490ca1edd220c0e072cf359532b9b544d675e333ef9c164ee5e` | A and B, `< = >`, and `abs(A-B)` share one state in all four representations. Machine attributes expose attribute, both values, relation, and difference. Quantity groups, length bars, height columns, and mass balance are visibly distinct. |
| `bnu-primary-p3-lower-area` | direct `area-perimeter / rectangle-boundary-and-cover`; mode `default`; invariants `area-boundary-cover`, `rectangle-dimension-consistency` | PASS candidate | `e60134aba4f6dac350149598a2646ca934c0c25a900fad541b3244666bc01cc4` | Width and height drive one unit-grid rectangle; area is `w*h`, perimeter is `2(w+h)`, both are machine-readable, and the visible border/grid/formula derive from the same state. Equal dimensions make the promised square case reachable. |
| `bnu-primary-p5-lower-fraction-add-sub` | direct `fraction-operations / fraction-add-subtract`; required add/subtract; multiply/divide forbidden | RED | `8fc6afe59f4b50c329ad9f12abd4c32a2c13400a28548000e05d106d9a247a33` | Exact rational add/subtract and operator isolation are correct, but the tenths-only two-bar model does not visibly implement promised common-denominator conversion, mixed-number work, simplification, or estimation. Catalog formula remains only `part / whole`. |
| `bnu-primary-p5-lower-fraction-division` | direct `fraction-operations / fraction-divide`; divide required; add/subtract/multiply forbidden | RED | `4ba11460e5d829251b46df69cc665292570b130f2356cb9aae6667c08c01c69c` | Exact quotient and divide-only routing are correct, but inverse operation, reciprocal reasoning, measurement/sharing interpretations, and equation solving promised by the focus are not shown. |
| `bnu-primary-p5-lower-fraction-multiplication` | direct `fraction-operations / fraction-multiply`; multiply required; add/subtract/divide forbidden | RED | `9df98a90dcc29bd686e1f149c87c5e99a5dfa0305f5e1fadea76ba4f0f5ef660` | Exact product and multiply-only routing are correct, but repeated groups, part-of-a-quantity, scaling, an area model, and visible simplification promised by the focus are not shown. |
| `hjb-primary-p5-lower-fractions-equivalence-operations` | direct `fraction-operations / fraction-add-subtract`; add/subtract required; multiply/divide forbidden | RED | `ac16ef7b62409562b59027c3876f75e2f4c77e617f6a5082211b4e32df264bdb` | Exact add/subtract is present, but the specialized title/focus also promises equivalence, simplifying, common denominators, comparison, and an explicit whole; the current tenths-only two-bar model does not provide those strands. |

### BNU P1 comparison disposition

Yes: `bnu-primary-p1-upper-comparison` can update its oracle disposition and static semantic status. Its old measurement-unit disposition and `millimetres/centimetres/decimetres` modes are no longer correct. The candidate successor entry should be `pass:exact`, direct `attribute-comparison / quantity-length-height-mass`, with the four attribute modes and relation/difference invariants shown in the table.

This approval is limited to the static semantic oracle. The focused Chromium run used SSR markup in a data URL; it did not mount the real lesson or directory route, exercise telemetry, or prove the whole 335-lab matrix.

## Deterministic evidence run

1. Pure model/control/Primary SSR/promise projection:

   ```text
   node --import tsx --test \
     data/visualizationLabsMainlandSemanticFocus.test.ts \
     components/visualizations/configuredVisualizationSemanticModel.test.ts \
     components/visualizations/configuredVisualizationSemanticControls.test.tsx \
     components/visualizations/ConfiguredSemanticPrimaryMarks.test.tsx \
     components/visualizations/configuredVisualizationCompositeStrands.test.tsx
   ```

   Result: 110 passed, 0 failed, 0 skipped.

2. Secondary mathematics/SSR and composite plans:

   ```text
   node --import tsx --test \
     components/visualizations/ConfiguredSemanticSecondaryMarks.test.tsx \
     components/visualizations/configuredVisualizationCompositeStrands.test.tsx
   ```

   Result: 60 passed, 0 failed, 0 skipped.

3. BNU P1 collision and fail-closed contrast microfixture:

   ```text
   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test \
     tests/e2e/china-attribute-comparison-ssr.spec.tsx \
     --project=desktop-chrome --project=mobile-chrome \
     --workers=1 --retries=0 --reporter=line
   ```

   Result: 2 passed, 0 failed, 0 skipped. Each project scanned all 72 canonical light/dark x mode x A/B states.

4. Independent set reconstruction:

   - promise mismatch count 109
   - route mismatch count 6
   - union count 114
   - narrow-set intersection 108
   - promise extras exactly `[bnu-primary-p1-upper-comparison]`
   - 108-entry required-mode omissions 0
   - 108-entry exposed forbidden modes 0

## Evidence not run or not established

- No real lesson-route or visualization-directory browser mount for the 108 narrowed entries, P3 area, or the four fraction topics.
- No all-locale, all-theme, all-viewport route matrix.
- No full 335 state/chunk ledger.
- No end-to-end first-interaction session, analytics ACK, server reread, or reward idempotency proof.
- No fresh production build or whole-repository type-check was claimed by this A18 slice.
- Passing unit/SSR tests is not used to override the four curriculum RED decisions.

## Remaining RED boundary

The exact remaining changed RED IDs are:

- `bnu-primary-p5-lower-fraction-add-sub`
- `bnu-primary-p5-lower-fraction-division`
- `bnu-primary-p5-lower-fraction-multiplication`
- `hjb-primary-p5-lower-fractions-equivalence-operations`

The exact 61 untouched RED IDs are preserved in `untouchedRedLabIds` in the candidate JSON. They remain frozen-v1 RED without inference from unrelated renderer tests.

## Handoff rule

Do not overwrite `mainland-visualization-semantic-oracle.v1.json` from this audit. A successor oracle may consume the candidate only after independent review of the artifact hashes and after the four fraction entries remain RED or receive a separately reviewed promise/model repair. Browser and release acceptance remain A11/A22 gates.
