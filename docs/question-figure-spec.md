# Question Figure Spec (QuestionDiagram)

Status: live since 2026-07-10. Owner surface: practice arena, lesson practice, teacher paper preview, AI assignment generation.

MAIS renders mathematically exact question figures from **declarative JSON specs**, not from raster images. A figure is data checked in next to the answer key, so the deterministic solvability audit can recompute what the figure claims (angles, lengths, positions, volumes) and block release on any mismatch. This replaces the withdrawn AI-PNG question-illustration lane for exact math figures; the PNG lane remains for conceptual lesson art only.

## Where things live

- Schema: `types/index.ts` → `QuestionDiagram` discriminated union.
- Engine (pure): `lib/questionFigure.ts` → layout builders, collision-aware label placement, `normalizeQuestionDiagram`, `validateQuestionDiagram`, derived-fact helpers, bilingual alt text.
- Renderer (React SVG): `components/practice/QuestionFigure.tsx` — used by `PracticeQuestionCard` (practice arena, lesson practice, game modes, student assignments) and the teacher assessment paper preview.
- QA: `lib/questionFigure.test.ts` (run via `npm run test:question-figure`, also part of `npm run test:question-bank`); every checked-in diagram must normalize and pass figure QA with zero label collisions in both English and Chinese.
- Solvability integration: `lib/questionBankSolvability.ts` validates every diagram during the full-bank audit and derives graph answers from diagram data (id-keyed derivations in `deriveGraphAnswer`).

## The four diagram kinds

Every diagram is JSON-serializable and strictly normalized: unknown keys, non-finite numbers, out-of-range values, or dangling point references cause the whole diagram to be rejected (fail-closed).

### 1. `coordinate-grid` (legacy, unchanged)

```json
{
  "kind": "coordinate-grid",
  "xRange": [-5, 5],
  "yRange": [-5, 5],
  "points": [{ "label": "A", "x": 1, "y": 2 }],
  "lines": [{ "label": "AB", "points": [{ "x": 0, "y": 0 }, { "x": 2, "y": 4 }] }]
}
```

A line labelled `parabola`/`curve` with ≥ 3 points renders as a smooth quadratic through its anchors.

### 2. `plane-figure`

```json
{
  "kind": "plane-figure",
  "points": [
    { "id": "A", "x": -4, "y": 0, "label": "A" },
    { "id": "O", "x": 0, "y": 0, "label": "O" },
    { "id": "B", "x": 4, "y": 0, "label": "B" },
    { "id": "C", "x": 2.25, "y": 2.681, "label": "C" }
  ],
  "segments": [{ "from": "A", "to": "B" }, { "from": "O", "to": "C" }],
  "polygons": [{ "vertexIds": ["A", "B", "C"], "shaded": true }],
  "circles": [{ "centerId": "O", "radius": 2, "radiusToId": "P", "label": { "en": "r", "zh": "r" } }],
  "angleMarks": [
    { "vertexId": "O", "fromId": "A", "toId": "C", "label": { "en": "130°", "zh": "130°" } },
    { "vertexId": "O", "fromId": "C", "toId": "B", "arcs": 2, "label": { "en": "x", "zh": "x" } }
  ]
}
```

- Model space is y-up (math orientation); the renderer fits and flips.
- Points with a `label` get a visible marker; unlabeled points are construction anchors.
- `segments`: `style` (`solid`/`dashed`), `tickMarks` (1–3 equal-length marks), `parallelMarks` (1–2 chevrons), localized `label`.
- `angleMarks`: `rightAngle: true` draws the square mark and is **validated against the actual coordinates (90° ± 2°)**; `arcs` (1–3) distinguishes equal angles. Collinear rays are rejected.
- `circles`: `radiusToId` draws the radius segment and is validated to lie on the circle (±2%).

### 3. `number-line`

```json
{
  "kind": "number-line",
  "range": [3, 4],
  "tickInterval": 0.1,
  "points": [{ "value": 3.7, "label": "P", "marker": "closed" }],
  "highlights": [{ "from": 3.2, "to": 3.5, "label": { "en": "gap", "zh": "间隔" } }]
}
```

- `marker`: `closed` (solid dot) or `open` (hollow, for strict inequalities).
- Up to 61 ticks; when more than 9 ticks exist, only integer ticks are labelled (endpoints as fallback) so labels never crowd.

### 4. `solid-figure`

```json
{
  "kind": "solid-figure",
  "shape": "cuboid",
  "width": 4, "depth": 3, "height": 2,
  "labels": {
    "width": { "en": "4 cm", "zh": "4 厘米" },
    "depth": { "en": "3 cm", "zh": "3 厘米" },
    "height": { "en": "2 cm", "zh": "2 厘米" }
  }
}
```

- Shapes: `cuboid` (width/depth/height), `cube` (size), `cylinder`/`cone` (radius + height), `sphere` (radius).
- Cabinet projection (45°, ×0.5 depth) with hidden edges dashed — the 斜二测 style used in Mainland textbooks.
- Cone height renders as an external dimension line; sphere radius label sits just outside the rim.

## Deterministic QA (what "valid" means)

`validateQuestionDiagram` runs two passes and returns a list of issues (empty = releasable):

1. **Semantic:** dangling ids, degenerate segments/rays, right-angle marks that are not 90°, radius points off the circle, out-of-range number-line points.
2. **Render:** the actual layout engine runs with both English and Chinese label text; any label that cannot find a collision-free placement (against strokes, markers, and other labels) is an issue. This mechanically enforces the viz-lab "text/figure = no collisions" audit standard.

The full-bank audit (`qa:full-question-bank`, `test:question-bank`) additionally marks any question whose diagram fails normalization or QA as `content-error`.

## Pipeline contracts

- **Generated banks** (`data/mainland*Questions.ts` loaders): pack questions may carry `diagram`; the loader normalizes + validates and attaches only clean diagrams. A `type: "graph"` question without a valid diagram is **dropped from the bank** (see `mainlandPepJuniorDroppedGraphQuestionIds` for observability). PEP junior is the reference implementation for future batch regenerations.
- **Runtime AI generation** (`lib/server/teacherAssignmentGeneration.ts`): the prompt teaches the four JSON shapes; the response normalizer validates any returned diagram and downgrades a graph question without a usable diagram to short-answer. Persisted assessments keep the diagram through `AssessmentEmbeddedQuestion.diagram`.
- **Static bank** (`data/questions.ts`): author the diagram inline, add the independent answer to the TSV in `lib/questionBankSolvability.ts`, and add an id-keyed derivation to `deriveGraphAnswer` that recomputes the answer from diagram data (see `graph-p4-angles-straight-line`, `graph-p4-decimals-number-line`, `graph-p5-volume-cube`). Also add the same TSV row to the local audit table in `tests/e2e/practice-bank-solvability.spec.ts`.

## Authoring rules of thumb

- Coordinates must make the figure *true*: if the label says 130°, place the points so the angle measures 130° (±0.5° is enough for rounding to survive).
- Keep labels short (`A`, `x`, `4 cm`); localized labels ≤ 60 chars, plain labels ≤ 24.
- Do not encode the answer as a visible label unless the question is about reading the figure.
- Prefer `plane-figure` for Euclidean geometry, `coordinate-grid` for anything with axes, `number-line` for decimals/fractions/inequalities, `solid-figure` for volume/surface-area.
- GeoGebra or other embedded third-party viewers are **not** used anywhere in this pipeline (commercial licensing).
