import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildSurfaceObjectEvidence,
  buildSurfaceObjectEvidenceForScene,
  buildSurfaceObjectFromGrid,
  buildSurfaceObjectsForScene,
  buildSurfaceObject,
  partialSurfaceWireframe,
  serializeSurfaceObjectPayload,
  SURFACE_OBJECT_SOURCE_CONTRACT,
  surfaceMeshCells,
  surfaceMeshTriangles,
  surfaceObjectEvidenceDataAttributes,
  surfaceNormalAt,
  surfacePointAt,
  surfaceWireframeCurves
} from "./mathSurfaceObject";
import type { MathSceneSpec } from "./mathSceneTypes";

test("builds a sampled SurfaceObject with deterministic semantic ranges", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "height-field",
    id: "saddle-surface",
    uRange: [-1, 1],
    uSegments: 2,
    valueAt: (u, v) => [u, v, u * v],
    vRange: [-2, 2],
    vSegments: 4
  });

  assert.equal(surface.id, "saddle-surface");
  assert.equal(surface.conceptId, "height-field");
  assert.equal(surface.rows, 3);
  assert.equal(surface.columns, 5);
  assert.equal(surface.samples.length, 15);
  assert.deepEqual(surface.samples[0], { column: 0, point: [-1, -2, 2], row: 0, u: -1, v: -2 });
  assert.deepEqual(surface.samples.at(-1), { column: 4, point: [1, 2, 2], row: 2, u: 1, v: 2 });
  assert.deepEqual(surface.bounds, {
    center: [0, 0, 0],
    max: [1, 2, 2],
    min: [-1, -2, -2]
  });
});

test("samples surface points by normalized u/v progress", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "plane",
    id: "plane-surface",
    uRange: [0, 2],
    uSegments: 2,
    valueAt: (u, v) => [u, v, u + v],
    vRange: [0, 4],
    vSegments: 2
  });

  assert.deepEqual(surfacePointAt(surface, 0, 0), [0, 0, 0]);
  assert.deepEqual(surfacePointAt(surface, 1, 1), [2, 4, 6]);
  assert.deepEqual(surfacePointAt(surface, 0.5, 0.5), [1, 2, 3]);
  assert.deepEqual(surfacePointAt(surface, Number.NaN, Infinity), [0, 4, 4]);
});

test("computes finite normalized normals for sampled surfaces", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "plane",
    id: "plane-surface",
    uRange: [0, 2],
    uSegments: 2,
    valueAt: (u, v) => [u, v, 0],
    vRange: [0, 2],
    vSegments: 2
  });
  const centerNormal = surfaceNormalAt(surface, 1, 1);

  assert.deepEqual(centerNormal, [0, 0, 1]);
  assert.equal(surface.normals.length, surface.samples.length);
  assert.ok(surface.normals.every((normal) => normal.every(Number.isFinite)));
  assert.ok(surface.normals.every((normal) => Math.abs(Math.hypot(...normal) - 1) < 1e-9));
});

test("exports row and column wireframe curves for renderer adapters", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "grid",
    id: "grid-surface",
    uRange: [0, 2],
    uSegments: 2,
    valueAt: (u, v) => [u, v, 0],
    vRange: [0, 3],
    vSegments: 3
  });
  const wireframe = surfaceWireframeCurves(surface);

  assert.equal(wireframe.rows.length, 3);
  assert.equal(wireframe.columns.length, 4);
  assert.deepEqual(wireframe.rows[1], [
    [1, 0, 0],
    [1, 1, 0],
    [1, 2, 0],
    [1, 3, 0]
  ]);
  assert.deepEqual(wireframe.columns[2], [
    [0, 2, 0],
    [1, 2, 0],
    [2, 2, 0]
  ]);
});

test("exports deterministic surface cell and triangle topology for renderer adapters", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "topology",
    id: "topology-surface",
    uRange: [0, 2],
    uSegments: 2,
    valueAt: (u, v) => [u, v, u + v],
    vRange: [0, 3],
    vSegments: 3
  });
  const cells = surfaceMeshCells(surface);
  const triangles = surfaceMeshTriangles(surface);

  assert.equal(cells.length, 6);
  assert.equal(triangles.length, 12);
  assert.deepEqual(cells[0], {
    column: 0,
    cornerSampleIndices: [0, 1, 5, 4],
    corners: [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 2],
      [1, 0, 1]
    ],
    id: "topology-surface:cell:0:0",
    row: 0
  });
  assert.deepEqual(triangles[0], {
    cellId: "topology-surface:cell:0:0",
    id: "topology-surface:tri:0:0:a",
    points: [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 2]
    ],
    sampleIndices: [0, 1, 5],
    winding: "grid-forward"
  });
  assert.deepEqual(triangles[1].sampleIndices, [0, 5, 4]);
});

test("returns a Manim-style partial surface wireframe for revealSurface progress", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "grid",
    id: "grid-surface",
    uRange: [0, 3],
    uSegments: 3,
    valueAt: (u, v) => [u, v, 0],
    vRange: [0, 3],
    vSegments: 3
  });
  const partial = partialSurfaceWireframe(surface, 0.5);
  const complete = partialSurfaceWireframe(surface, 1);

  assert.equal(partial.rows.length, 2);
  assert.equal(partial.columns.length, 4);
  assert.ok(partial.columns.every((column) => column.length === 2));
  assert.deepEqual(partial.rows[1], [
    [1, 0, 0],
    [1, 1, 0],
    [1, 2, 0],
    [1, 3, 0]
  ]);
  assert.equal(complete.rows.length, 4);
  assert.ok(partialSurfaceWireframe(surface, Number.NaN).rows.length >= 1);
});

test("runtime updaters consume partial surface wireframes for revealSurface", () => {
  const updaterSource = fs.readFileSync("components/visualizations/three/manim/mathUpdaterRegistry.ts", "utf8");

  assert.match(updaterSource, /partialSurfaceWireframe/);
  assert.match(updaterSource, /reveal-surface/);
});

test("builds a SurfaceObject from an already sampled grid", () => {
  const surface = buildSurfaceObjectFromGrid({
    colorRole: "surface",
    conceptId: "sampled-height-field",
    id: "sampled-surface",
    samples: [
      [
        [0, 0, 0],
        [0, 1, 1],
        [0, 2, 2]
      ],
      [
        [1, 0, 1],
        [1, 1, 2],
        [1, 2, 3]
      ]
    ],
    uRange: [0, 1],
    vRange: [0, 2]
  });

  assert.equal(surface.rows, 2);
  assert.equal(surface.columns, 3);
  assert.equal(surface.samples.length, 6);
  assert.deepEqual(surface.samples[4], { column: 1, point: [1, 1, 2], row: 1, u: 1, v: 1 });
  assert.deepEqual(surface.bounds, {
    center: [0.5, 1, 1.5],
    max: [1, 2, 3],
    min: [0, 0, 0]
  });
});

test("sanitizes non-finite surface samples without renderer dependencies", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "finite-surface",
    id: "finite-surface",
    uRange: [-1, 1],
    uSegments: 1,
    valueAt: (u, v) => [u, Number.NaN, v === 1 ? Infinity : v],
    vRange: [-1, 1],
    vSegments: 1
  });
  const source = fs.readFileSync("components/visualizations/three/manim/mathSurfaceObject.ts", "utf8");

  assert.ok(surface.samples.every((sample) => sample.point.every(Number.isFinite)));
  assert.deepEqual(surface.samples[0].point, [-1, -1, -1]);
  assert.deepEqual(surface.samples.at(-1)?.point, [1, 1, 1]);
  assert.doesNotMatch(source, /from ["']three["']/);
  assert.doesNotMatch(source, /@react-three\/fiber/);
});

test("summarizes SurfaceObject sampling evidence for browser QA", () => {
  const surface = buildSurfaceObject({
    colorRole: "surface",
    conceptId: "height-field",
    id: "saddle-surface",
    uRange: [-1, 1],
    uSegments: 2,
    valueAt: (u, v) => [u, v, u * v],
    vRange: [-2, 2],
    vSegments: 4
  });
  const evidence = buildSurfaceObjectEvidence([surface]);
  const attributes = surfaceObjectEvidenceDataAttributes(evidence);

  assert.equal(evidence.objectCount, 1);
  assert.equal(evidence.objectIds, "saddle-surface");
  assert.equal(evidence.sampleCount, 15);
  assert.equal(evidence.finiteSampleCount, 15);
  assert.equal(evidence.normalCount, 15);
  assert.equal(evidence.finiteNormalCount, 15);
  assert.equal(evidence.cellCount, 8);
  assert.equal(evidence.triangleCount, 16);
  assert.equal(evidence.wireframeRowCount, 3);
  assert.equal(evidence.wireframeColumnCount, 5);
  assert.equal(evidence.gridSummary, "saddle-surface=3x5");
  assert.equal(evidence.rangeSummary, "saddle-surface:u=-1..1:v=-2..2");
  assert.equal(evidence.boundsSummary, "saddle-surface:min=-1.000,-2.000,-2.000:max=1.000,2.000,2.000:center=0.000,0.000,0.000");
  assert.equal(evidence.topologySummary, "saddle-surface:cells=2x4:triangles=16");
  assert.equal(evidence.sourceContract, SURFACE_OBJECT_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "surfaces:objects=1:samples=15:finite=15:normals=15:finiteNormals=15:cells=8:triangles=16:wireRows=3:wireColumns=5:ids=saddle-surface"
  );
  assert.match(SURFACE_OBJECT_SOURCE_CONTRACT, /SurfaceObject/);
  assert.match(SURFACE_OBJECT_SOURCE_CONTRACT, /parametric surface/);
  assert.match(SURFACE_OBJECT_SOURCE_CONTRACT, /surfaceWireframeCurves/);
  assert.equal(attributes["data-viz-manim-surface-source-contract"], SURFACE_OBJECT_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-surface-object-count"], "1");
  assert.equal(attributes["data-viz-manim-surface-object-ids"], "saddle-surface");
  assert.equal(attributes["data-viz-manim-surface-sample-count"], "15");
  assert.equal(attributes["data-viz-manim-surface-finite-sample-count"], "15");
  assert.equal(attributes["data-viz-manim-surface-cell-count"], "8");
  assert.equal(attributes["data-viz-manim-surface-triangle-count"], "16");
  assert.equal(attributes["data-viz-manim-surface-topology-summary"], "saddle-surface:cells=2x4:triangles=16");
  assert.equal(attributes["data-viz-manim-surface-summary"], evidence.summary);
});

test("builds surface evidence directly from MathSceneSpec parametricSurface objects", () => {
  const scene: MathSceneSpec = {
    bindings: [],
    cameraShots: [],
    coordinateSpace: {
      mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
      worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "surface",
        conceptId: "height-field",
        id: "scene-surface",
        samples: [
          [
            [0, 0, 0],
            [0, 1, 1]
          ],
          [
            [1, 0, 1],
            [1, 1, 2]
          ]
        ],
        type: "parametricSurface",
        uRange: [0, 1],
        vRange: [0, 1]
      }
    ],
    sceneId: "surface-scene",
    timeline: []
  };
  const surfaces = buildSurfaceObjectsForScene(scene);
  const evidence = buildSurfaceObjectEvidenceForScene(scene);

  assert.equal(surfaces.length, 1);
  assert.equal(surfaces[0].id, "scene-surface");
  assert.equal(surfaces[0].samples.length, 4);
  assert.equal(evidence.objectIds, "scene-surface");
  assert.equal(evidence.sampleCount, 4);
  assert.equal(evidence.gridSummary, "scene-surface=2x2");
});

test("serializes SurfaceObject samples as deterministic script-safe browser QA JSON", () => {
  const surface = buildSurfaceObjectFromGrid({
    colorRole: "surface",
    conceptId: "sampled<script>-height-field",
    id: "sampled<script>-surface",
    samples: [
      [
        [0, 0, 0],
        [0, 1, 1]
      ],
      [
        [1, 0, 1],
        [1, 1, 2]
      ]
    ],
    uRange: [0, 1],
    vRange: [0, 1]
  });
  const json = serializeSurfaceObjectPayload([surface]);
  const parsed = JSON.parse(json) as ReturnType<typeof buildSurfaceObjectEvidence> & {
    meshCells: Array<{ cells: ReturnType<typeof surfaceMeshCells>; id: string }>;
    meshTriangles: Array<{ id: string; triangles: ReturnType<typeof surfaceMeshTriangles> }>;
    surfaces: typeof surface[];
    wireframes: Array<ReturnType<typeof surfaceWireframeCurves> & { id: string }>;
  };

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.objectCount, 1);
  assert.equal(parsed.objectIds, "sampled<script>-surface");
  assert.equal(parsed.sampleCount, 4);
  assert.equal(parsed.surfaces[0].id, "sampled<script>-surface");
  assert.equal(parsed.surfaces[0].conceptId, "sampled<script>-height-field");
  assert.deepEqual(parsed.surfaces[0].samples[3], { column: 1, point: [1, 1, 2], row: 1, u: 1, v: 1 });
  assert.equal(parsed.surfaces[0].normals.length, 4);
  assert.equal(parsed.wireframes[0].id, "sampled<script>-surface");
  assert.equal(parsed.wireframes[0].rows.length, 2);
  assert.equal(parsed.wireframes[0].columns.length, 2);
  assert.equal(parsed.meshCells[0].id, "sampled<script>-surface");
  assert.equal(parsed.meshCells[0].cells.length, 1);
  assert.equal(parsed.meshTriangles[0].id, "sampled<script>-surface");
  assert.equal(parsed.meshTriangles[0].triangles.length, 2);
  assert.equal(parsed.sourceContract, SURFACE_OBJECT_SOURCE_CONTRACT);
});
