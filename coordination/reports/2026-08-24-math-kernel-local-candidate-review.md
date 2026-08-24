# 2026-08-24 MAIS math-kernel local candidate review — LOCAL_CANDIDATE_REVIEWED

## 1. Decision and evidence boundary

The Edulab `bodies.py`, `conics.py`, `geometry_kernel.py`, and
`analytic_kernel.py` capabilities have been rewritten as a renderer-neutral,
strict TypeScript math kernel for MAIS and connected to the existing
`MathSceneSpec` runtime.

The reviewed implementation candidate is:

```text
branch: codex/a06-math-kernel-ts-20260823
implementation commit: 7b1f803de83b6bd4ccd4a5bf8806f61b9bd1d700
implementation tree: 6303a6c2b4b3acb5c1ef216cc13feabf8b197bd2
base and merge-base: b6c7c347a49a813e454e707dd3c16399dcf29909
local commits above origin/main: 22
```

The status is deliberately `LOCAL_CANDIDATE_REVIEWED`. It is not a claim that
a GitHub PR exists, remote CI has run, the branch has been pushed or merged, a
provider has deployed it, or production is serving the same SHA.

The final read-only remote check on 2026-08-24 returned:

```text
origin/main = b6c7c347a49a813e454e707dd3c16399dcf29909
origin/codex/a06-math-kernel-ts-20260823 = absent
```

No push, merge, deployment, production mutation, or external message was
performed.

## 2. Delivered architecture

The implementation follows the approved two-layer boundary:

```text
Next.js server/build
  server-only Compute Engine 0.118.1
    -> exact MathJSON, fractions/radicals, LaTeX, decimal strings and proofs
    -> JSON-safe MAIS DTOs
      -> client-safe MathSceneSpec adapter
        -> existing Three.js/R3F/KaTeX runtime

Learner browser
  TypeScript number kernels
    -> finite real-time drag/intersection/coordinate updates
    -> exact server recomputation only on commit/release
```

Important enforced boundaries:

- `@cortex-js/compute-engine` is pinned exactly to `0.118.1` in both package
  and lock files.
- Exact CAS modules begin with `import "server-only";` and do not appear in
  any transitive `"use client"` graph or learner chunk.
- Public results are MAIS-owned JSON data. No `BoxedExpression`, third-party
  class instance, function, `BigInt`, `NaN`, or `Infinity` crosses a Next.js
  API or React boundary.
- Raw JavaScript decimal and unsafe-integer atoms are rejected at exact
  boundaries; callers use safe integers or explicit exact MathJSON such as
  `["Rational", 3, 2]`. Browser numeric APIs remain ordinary finite-number
  APIs.
- CAS inputs are application-constructed and allowlisted, with MathJSON limits
  of depth 64 and 2,000 nodes. There is no arbitrary student formula endpoint,
  `eval()`, `new Function()`, shell execution, or dynamic code evaluation.
- Python and SymPy are not dependencies of the new math-kernel test command,
  Next.js build, server runtime, or learner browser. Existing unrelated MAIS
  RAG maintenance scripts that use Python remain outside this claim.

## 3. Four-module capability delivery

| Edulab source | MAIS TypeScript delivery | Result |
|---|---|---|
| `bodies.py` | `lib/math-kernel/bodies/index.ts` | Stable immutable topology for triangular and quadrilateral pyramids, cuboids, cubes and n-prisms, with validated vertex/edge contracts and stable error codes. |
| `conics.py` | `lib/math-kernel/conics/{model,numeric,exact.server}.ts` | Serializable axis-aligned ellipse, hyperbola, parabola and circle models; translated equations, foci/directrices/eccentricity, exact and numeric render conversions. |
| `geometry_kernel.py` | `lib/math-kernel/geometry/**` | Shared scalar algebra, browser numeric and server exact kernels, solid coordinates, coordinate/handedness transforms, exact DTO serialization and teaching solvers. The 23-capability source map is complete. |
| `analytic_kernel.py` | `lib/math-kernel/analytic/**` | Browser numeric intersections and constrained server exact setup, Vieta relations, endpoints, dot/chord/area expressions, slope theorem, eccentricity theorem and exact range proofs with domain/pole/projective witnesses. |

Semantic corrections are intentional and tested:

- `cube()` is the equal-edge semantic alias of `cuboid()` without duplicated
  topology logic.
- Translated conics are derived from the model and no longer produce malformed
  sign strings or omit a translated hyperbola center.
- Parabolas use one `vertex` meaning, not conflicting `center`/`vertex` fields.
- `dihedralHalfPlaneCos()` replaces the ambiguous Python name while any
  compatibility alias is deprecated.
- The math-z-up to world-y-up axis swap has explicit inverse, handedness,
  winding, and normal-transform contracts.
- Secant, tangent, linear-degenerate, disjoint and invalid intersections are
  explicit states; only secants expose two endpoints and chord metrics.
- `rangeOverLineFamily()` proves only supported constrained profiles. It checks
  discriminants, denominator exclusions, critical points, poles, domain
  boundaries, both infinite directions and projective witnesses; unproved
  completeness returns `UNSUPPORTED_EXPRESSION` instead of sampled evidence.
- The old generated focal-chord formula with a missing `(m^2+1)` factor was not
  copied. All formulas come from the analytic kernel.

Intended v1 boundaries remain unchanged: no faces are added to body topology,
no rotated general `xy` conic editor is promised, and no old Python HTML
generator or template is migrated.

## 4. JSON, exactness and mathematical oracle evidence

The public exact contract is centered on `MathJsonExpr`, `ExactValueDto`,
`KernelResult`, exact endpoints/intervals, `GeometrySolutionDto`, and
`AnalyticRangeSolutionDto`.

- `mathJson` is authoritative.
- LaTeX is serialized from the same validated exact expression rather than
  maintained as an independent hand-written answer.
- `decimal` is a string or `null`; `approx` is a finite renderer number or
  `null`.
- Expected invalid or degenerate mathematics returns a stable `KernelResult`
  error.
- DTO and nested snapshots are JSON-safe and immutable.

The curated one-time SymPy oracle is pinned to:

```text
Edulab source revision: cf0bc1d68b4ea64307f57d7fac64667e6a3148cc
SymPy version: 1.14.0
fixture: lib/math-kernel/test-fixtures/edulab-cf0bc1d-sympy-1.14.0.golden.json
```

The fixture is parsed from `unknown` with an exact schema, not imported using
`any`. Its restricted fixture-only expression parser accepts only safe
integers, the fixed symbol, `sqrt`, parentheses and approved arithmetic. It
does not evaluate source strings.

Actual golden consumption includes:

- all body vertex/edge order and count records;
- all 10 geometry oracle fields, including both solver outputs, line-plane and
  skew-line angles, distance, dihedral, four volumes and the general pyramid
  formula;
- ellipse line-family `A/B/C`, discriminant, Vieta sum/product, dot product,
  chord-length squared, triangle area, all exact ranges, central slope product,
  parabola focal-chord dot product and the `k=3` eccentricity interval.

The isolated migration Python virtual environment was deleted after producing
the curated JSON. The full temporary oracle and its absolute-path-containing
generator were not committed. Their fixed SHA-256 values are provenance pins,
not repository-recomputable artifacts; this limitation is disclosed in the
fixture README.

## 5. MathSceneSpec and learner interaction

The client-safe adapter is
`components/visualizations/three/manim/mathKernelSceneAdapter.ts`.

- Body edges become existing `parametricCurve` line segments.
- Conics become deterministic front-XY `parametricCurve` samples.
- Geometry points use server DTO `renderPoints`; the adapter does not apply the
  coordinate transform twice.
- The line-plane demo copies an explicit 2-by-2 base-plane point grid from
  `renderPoints` into the existing `parametricSurface` type. It does not
  recompute a normal or angle.
- `\theta` is bound to both the `A1C` vector and the declared base plane.
  Missing plane semantics produce no binding and an A18-follow-up state.
- Only `metric === "chord-length"` receives the display relation
  `L\in${intervalLatex}` and an `L` binding. Dot product,
  chord-length-squared and triangle-area intervals are not mislabeled; the
  dedicated chord demo rejects them with `INVALID_INPUT`.
- Formula tokens are accepted only if the token text occurs in the actual
  authoritative display LaTeX.
- All three locales (`en`, `zh-CN`, `zh-HK`) consume the same mathematical DTO;
  only teaching copy and metadata vary.
- Continuous slider input invokes only the browser numeric kernel. Commit or
  release performs one constrained exact POST; reset reuses the initial exact
  DTO without another CAS call.

This integration does not change the public `MathSceneSpec` shape and does not
bulk-edit US, mainland-China, or Hong Kong curriculum content.

## 6. Verification ledger for implementation SHA `7b1f803d`

| Gate | Exact result |
|---|---|
| `npm run type-check` | exit 0 |
| `npm run test:math-kernel` | 214/214 passed; 0 failed/skipped/cancelled/todo |
| `npm run test:visualizations` | 167/167 passed; 0 failed/skipped/cancelled/todo |
| Focused exact API/server/response | 18/18 passed |
| Focused real-payload, adapter and oracle slice | 27/27 passed in the A08/A18 review |
| `npm run check:imports` | exit 0 |
| Bundle scanner self-test | 3/3 passed |
| `npm run test:release-governance` | 84/84 passed |
| Release package gate | exit 0, `valid: true` |
| A25 dirty map | 0 dirty, unmapped, ambiguous, tie, multi-match or quarantine entries |
| `git diff --check origin/main...HEAD` | exit 0 |
| Formal Next.js build | exit 0; 239/239 static pages; required demo route and exact API included |
| Real learner bundle scan | 824 chunks, 294 manifests, 1,118 unique files, 66,348,907 bytes, 0 CAS markers |
| Bundled Chromium Playwright | 12/12 passed; desktop/mobile x en/zh-CN/zh-HK x geometry/analytic |

The root agent independently reran the complete 214-test kernel suite, the
167-test visualization suite and TypeScript check after all parallel reviews
stopped. The A11/A22 review independently ran the formal build, bundle scan and
browser matrix on the same implementation SHA.

The browser matrix used bundled Playwright Chromium, one worker, port 3099 and
run ID `math-kernel-a11a22-7b1f803-20260824`. It verified:

- a painted, non-background WebGL framebuffer rather than only a ready flag;
- supported renderables, finite point counts and scene export;
- KaTeX with zero formula collisions and no `.katex-error`;
- geometry vector/plane marks and analytic focal-chord mark;
- locale `lang`, localized labels and the specified keyboard/accessibility
  contracts;
- no document/body horizontal overflow on desktop or mobile;
- drag-time numeric updates with no exact POST, then exactly one exact POST on
  commit;
- HTTP 200 secant DTO, exact MathJSON, points, formula and exported scene kept
  in sync;
- reset and keyboard commit behavior;
- no console errors, uncaught page errors, failed requests or HTTP 5xx.

The earlier system Google Chrome SIGKILL was a browser-channel/runner failure
before page assertions. It did not reproduce with the repository's bundled
Chromium and is not recorded as a product defect.

The isolated browser server was stopped, port 3099 was released, the generated
`next-env.d.ts` reference was restored to `./.next/types/routes.d.ts` using an
explicit patch, and the final implementation worktree and index were clean.

## 7. Local role-equivalent reviews

These are independent Codex role-equivalent reviews of one local commit, not
human approvals and not GitHub review records.

| Role | Scope | Result on `7b1f803d` |
|---|---|---|
| A06 | TypeScript kernel and MathSceneSpec implementation | Complete for the approved v1 scope |
| A08 | Public DTO, MathJSON, errors, serialization and formula binding | APPROVED; P0/P1/P2 = 0 |
| A10 | Package/lock, CI contract, third-party notices and coordination | APPROVED; P0/P1/P2 = 0 |
| A11 | Independent tests, transitive client boundary and browser behavior | APPROVED; P0/P1/P2 = 0 |
| A12 | Constrained exact demo API contract and sanitization | APPROVED; P0/P1/P2 = 0 |
| A18 | Mathematical correctness, goldens and teaching semantics | APPROVED; P0/P1/P2 = 0 |
| A22 | Formal build, bundle and local release gate | APPROVED; P0/P1/P2 = 0 |
| A25 | Owner/pathspec and clean-worktree governance | APPROVED; P0/P1/P2 = 0 |

The 22 local commits provide the planned PR0-to-PR4 delivery sequence in one
unpublished branch: foundation and CAS contracts; bodies/conics; geometry;
analytic; scene integration; licensing/bundle gates; exact demo; governance;
and final teaching-semantic regressions. They are not actual GitHub PRs because
push and PR creation were outside authorization.

## 8. License and provenance

The candidate preserves Edulab's Apache-2.0 LICENSE and NOTICE in both
repository attribution and public third-party locations. The attribution
README names `wy51ai/edulab`, source commit
`cf0bc1d68b4ea64307f57d7fac64667e6a3148cc`, the license and the fact that the
files are modified TypeScript rewrites for MAIS.

Compute Engine, `server-only`, and the transitive `complex-esm` dependency are
exactly locked, carry integrity metadata, and have preserved license materials.

## 9. Non-blocking limitations and future gates

- The one-time full oracle and generator are not independently regenerable
  from committed repository artifacts; the curated fixture is nevertheless
  strictly parsed and actually consumed.
- Several low-level analytic expression helpers remain source-exported with
  `@internal` rather than enforced by a package export map.
- The exact demo cache is bounded to 17 accepted inputs but is per warm server
  instance, not distributed storage.
- The demo route's observed First Load JS is 804 kB. No performance budget was
  defined for this v1, so the successful build is not a performance-optimization
  claim.
- The 12-case browser test is executable locally but is not directly invoked by
  the current GitHub workflow. Therefore it is not remote-CI evidence.
- The browser test checks the specified keyboard and accessibility contracts,
  but it is not an axe run or full WCAG audit.
- The release package gate proves owner/coverage structure. A standing blocker
  report in repository governance is not evidence that the whole repository's
  release lifecycle is closed.

## 10. Handoff

The next authorized delivery step would be to push the local branch and open
the planned PR sequence or a reviewed equivalent, then require remote CI and
GitHub review. Merge, deployment and same-SHA production browser verification
remain separate later gates and require explicit authorization.
