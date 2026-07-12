import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import {
  buildSceneVectorFields,
  buildVectorFieldEvidenceForScene,
  buildVectorFieldObjectSpecs,
  expandSceneVectorFieldObjects,
  serializeVectorFieldPayload,
  summarizeSceneVectorFields,
  vectorFieldDataAttributes,
  vectorFieldRuntimeObjectId,
  VECTOR_FIELD_SOURCE_CONTRACT
} from "./mathVectorFieldObjects";
import type { MathSceneSpec } from "./mathSceneTypes";

function vectorFieldScene(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [{ id: "overview", position: [3, 3, 3], target: [0, 0, 0], fov: 48 }],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [0, 4], z: [-1, 1] }
    },
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" }
    ],
    sceneId: "vector-field-runtime-scene",
    timeline: [],
    vectorFields: [
      {
        colorRole: "trace",
        conceptId: "rotation-flow",
        coordinateMode: "math",
        id: "rotation-field",
        maxArrowLength: 0.35,
        system: { type: "linear2d", matrix: [[0, -1], [1, 0]] },
        xRange: [-1, 1],
        xSteps: 3,
        yRange: [-1, 1],
        ySteps: 3,
        z: 0.2
      }
    ]
  };
}

function bandedVectorFieldScene(): MathSceneSpec {
  return {
    ...vectorFieldScene(),
    sceneId: "banded-vector-field-runtime-scene",
    vectorFields: [
      {
        colorRole: "trace",
        conceptId: "linear-flow",
        coordinateMode: "world",
        id: "linear-banded-field",
        maxArrowLength: 0.4,
        system: { type: "linear2d", matrix: [[1, 0], [0, 0]] },
        xRange: [-4, 4],
        xSteps: 9,
        yRange: [0, 0],
        ySteps: 1,
        z: 0
      }
    ]
  };
}

test("builds Manim-style runtime vector Mobjects from scene VectorField specs", () => {
  const objects = buildVectorFieldObjectSpecs(vectorFieldScene());

  assert.equal(vectorFieldRuntimeObjectId("rotation-field", 0), "rotation-field:sample-0:arrow");
  assert.equal(objects.length, 9);
  assert.equal(objects[0]?.type, "vector");
  assert.equal(objects[0]?.id, "rotation-field:sample-0:arrow");
  assert.equal(objects[0]?.conceptId, "rotation-flow");
  assert.equal(objects[0]?.colorRole, "trace");
  assert.equal(objects[4]?.type, "vector");
  if (objects[4]?.type !== "vector") throw new Error("expected center vector object");
  assert.equal(objects[4].id, "rotation-field:sample-4:arrow");
  assert.equal(objects[4].conceptId, "rotation-flow");
  assert.equal(objects[4].colorRole, "trace");
  assert.deepEqual(objects[4].from.map((value) => Number(value.toFixed(3))), [0, 2, 0.2]);
  assert.deepEqual(objects[4].to.map((value) => Number(value.toFixed(3))), [0, 2, 0.2]);
  assert.deepEqual(objects[4].style, {
    strokeOpacity: 0.4,
    strokeRole: "trace",
    strokeWidth: 2
  });
  assert.ok("from" in objects[2]! && objects[2].from[1] >= 0);
  assert.ok("to" in objects[2]! && objects[2].to[1] >= 0);
});

test("encodes VectorField magnitude bands with non-hue arrow styles", () => {
  const objects = buildVectorFieldObjectSpecs(bandedVectorFieldScene());
  const highArrow = objects[0];
  const midArrow = objects[2];
  const lowArrow = objects[3];
  const zeroArrow = objects[4];

  assert.equal(objects.length, 9);
  assert.equal(highArrow?.type, "vector");
  assert.equal(midArrow?.type, "vector");
  assert.equal(lowArrow?.type, "vector");
  assert.equal(zeroArrow?.type, "vector");
  if (highArrow?.type !== "vector" || midArrow?.type !== "vector" || lowArrow?.type !== "vector" || zeroArrow?.type !== "vector") {
    throw new Error("expected vector arrows for every magnitude band");
  }

  assert.deepEqual(highArrow.style, { strokeOpacity: 0.76, strokeRole: "trace", strokeWidth: 2.8 });
  assert.deepEqual(midArrow.style, { strokeOpacity: 0.62, strokeRole: "trace", strokeWidth: 2.4 });
  assert.deepEqual(lowArrow.style, { strokeOpacity: 0.5, strokeRole: "trace", strokeWidth: 2.15 });
  assert.deepEqual(zeroArrow.style, { strokeOpacity: 0.4, strokeRole: "trace", strokeWidth: 2 });
});

test("summarizes scene VectorField samples for browser QA evidence", () => {
  const fields = buildSceneVectorFields(vectorFieldScene());
  const summary = summarizeSceneVectorFields(fields);
  const attributes = vectorFieldDataAttributes(summary);

  assert.equal(fields.length, 1);
  assert.equal(fields[0]?.field.id, "rotation-field");
  assert.equal(fields[0]?.field.samples.length, 9);
  assert.equal(summary.vectorFieldCount, 1);
  assert.equal(summary.sampleCount, 9);
  assert.equal(summary.finiteVectorCount, 9);
  assert.equal(summary.zeroVectorCount, 1);
  assert.equal(summary.highBandCount, 8);
  assert.equal(summary.midBandCount, 0);
  assert.equal(summary.lowBandCount, 0);
  assert.equal(summary.zeroBandCount, 1);
  assert.equal(summary.arrowCount, 9);
  assert.equal(summary.finiteArrowLengthCount, 9);
  assert.equal(summary.arrowLengthRange, "0.000..0.350");
  assert.equal(summary.lengthEncodingMonotonic, true);
  assert.equal(summary.lengthEncodingSummary, "lengthEncoding:arrows=9;finite=9;range=0.000..0.350;monotonic=true");
  assert.equal(summary.maxMagnitude.toFixed(3), "1.414");
  assert.equal(summary.colorBandSummary, "high:8,mid:0,low:0,zero:1");
  assert.equal(summary.coordinateModeSummary, "math=1;world=0");
  assert.equal(summary.sampleGridSummary, "rotation-field:3x3:x=[-1.000,1.000]:y=[-1.000,1.000]:z=0.200:mode=math");
  assert.equal(summary.sourceContract, VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(summary.systemSummary, "rotation-field:linear2d[[0.000,-1.000],[1.000,0.000]]");
  assert.equal(summary.vectorFieldIds, "rotation-field");
  assert.equal(summary.summary, "vectorFields=1;samples=9;finite=9;zero=1;bands=high:8,mid:0,low:0,zero:1;arrows=9;max=1.414;ids=rotation-field");
  assert.equal(attributes["data-viz-manim-vector-field-color-band-summary"], "high:8,mid:0,low:0,zero:1");
  assert.equal(attributes["data-viz-manim-vector-field-coordinate-mode-summary"], "math=1;world=0");
  assert.equal(attributes["data-viz-manim-vector-field-count"], "1");
  assert.equal(attributes["data-viz-manim-vector-field-sample-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-finite-vector-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-zero-vector-count"], "1");
  assert.equal(attributes["data-viz-manim-vector-field-high-band-count"], "8");
  assert.equal(attributes["data-viz-manim-vector-field-mid-band-count"], "0");
  assert.equal(attributes["data-viz-manim-vector-field-low-band-count"], "0");
  assert.equal(attributes["data-viz-manim-vector-field-zero-band-count"], "1");
  assert.equal(attributes["data-viz-manim-vector-field-arrow-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-finite-arrow-length-count"], "9");
  assert.equal(attributes["data-viz-manim-vector-field-arrow-length-range"], "0.000..0.350");
  assert.equal(attributes["data-viz-manim-vector-field-length-encoding-monotonic"], "true");
  assert.equal(
    attributes["data-viz-manim-vector-field-length-encoding-summary"],
    "lengthEncoding:arrows=9;finite=9;range=0.000..0.350;monotonic=true"
  );
  assert.equal(attributes["data-viz-manim-vector-field-max-magnitude"], "1.414");
  assert.equal(attributes["data-viz-manim-vector-field-sample-grid-summary"], summary.sampleGridSummary);
  assert.equal(attributes["data-viz-manim-vector-field-source-contract"], VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-vector-field-summary"], summary.summary);
  assert.equal(attributes["data-viz-manim-vector-field-system-summary"], summary.systemSummary);
});

test("summarizes all VectorField magnitude bands for browser QA evidence", () => {
  const summary = summarizeSceneVectorFields(buildSceneVectorFields(bandedVectorFieldScene()));
  const attributes = vectorFieldDataAttributes(summary);

  assert.equal(summary.highBandCount, 4);
  assert.equal(summary.midBandCount, 2);
  assert.equal(summary.lowBandCount, 2);
  assert.equal(summary.zeroBandCount, 1);
  assert.equal(summary.colorBandSummary, "high:4,mid:2,low:2,zero:1");
  assert.equal(summary.arrowLengthRange, "0.000..0.400");
  assert.equal(summary.lengthEncodingMonotonic, true);
  assert.equal(summary.lengthEncodingSummary, "lengthEncoding:arrows=9;finite=9;range=0.000..0.400;monotonic=true");
  assert.equal(summary.coordinateModeSummary, "math=0;world=1");
  assert.equal(summary.sampleGridSummary, "linear-banded-field:9x1:x=[-4.000,4.000]:y=[0.000,0.000]:z=0.000:mode=world");
  assert.equal(summary.systemSummary, "linear-banded-field:linear2d[[1.000,0.000],[0.000,0.000]]");
  assert.equal(summary.summary, "vectorFields=1;samples=9;finite=9;zero=1;bands=high:4,mid:2,low:2,zero:1;arrows=9;max=4.000;ids=linear-banded-field");
  assert.equal(attributes["data-viz-manim-vector-field-color-band-summary"], "high:4,mid:2,low:2,zero:1");
  assert.equal(attributes["data-viz-manim-vector-field-coordinate-mode-summary"], "math=0;world=1");
  assert.equal(attributes["data-viz-manim-vector-field-high-band-count"], "4");
  assert.equal(attributes["data-viz-manim-vector-field-mid-band-count"], "2");
  assert.equal(attributes["data-viz-manim-vector-field-low-band-count"], "2");
  assert.equal(attributes["data-viz-manim-vector-field-arrow-length-range"], "0.000..0.400");
  assert.equal(attributes["data-viz-manim-vector-field-length-encoding-monotonic"], "true");
  assert.equal(attributes["data-viz-manim-vector-field-length-encoding-summary"], summary.lengthEncodingSummary);
  assert.equal(attributes["data-viz-manim-vector-field-sample-grid-summary"], summary.sampleGridSummary);
  assert.equal(attributes["data-viz-manim-vector-field-system-summary"], summary.systemSummary);
  assert.equal(attributes["data-viz-manim-vector-field-zero-band-count"], "1");
});

test("builds scene-level VectorField evidence from pure scene specs", () => {
  const scene = vectorFieldScene();
  const evidence = buildVectorFieldEvidenceForScene(scene);

  assert.equal(evidence.vectorFieldCount, 1);
  assert.equal(evidence.sampleCount, 9);
  assert.equal(evidence.arrowCount, 9);
  assert.equal(evidence.finiteArrowLengthCount, 9);
  assert.equal(evidence.lengthEncodingSummary, "lengthEncoding:arrows=9;finite=9;range=0.000..0.350;monotonic=true");
  assert.equal(evidence.sourceContract, VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(evidence.vectorFieldIds, "rotation-field");
  assert.equal(evidence.summary, "vectorFields=1;samples=9;finite=9;zero=1;bands=high:8,mid:0,low:0,zero:1;arrows=9;max=1.414;ids=rotation-field");
});

test("serializes VectorField payloads for browser QA without unsafe script characters", () => {
  const scene = {
    ...vectorFieldScene(),
    sceneId: "vector-field-payload-scene",
    vectorFields: [
      {
        ...vectorFieldScene().vectorFields![0]!,
        conceptId: "rotation-flow<script>",
        id: "rotation-field<script>"
      }
    ]
  };
  const fields = buildSceneVectorFields(scene);
  const json = serializeVectorFieldPayload(fields);
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.version, "mais-manim-vector-field/v1");
  assert.equal(parsed.vectorFieldCount, 1);
  assert.equal(parsed.sampleCount, 9);
  assert.equal(parsed.arrowCount, 9);
  assert.equal(parsed.sourceContract, VECTOR_FIELD_SOURCE_CONTRACT);
  assert.equal(parsed.fields.length, 1);
  assert.equal(parsed.fields[0].spec.id, "rotation-field<script>");
  assert.equal(parsed.fields[0].spec.conceptId, "rotation-flow<script>");
  assert.equal(parsed.fields[0].field.samples.length, 9);
  assert.equal(parsed.fields[0].field.samples[0].id, "rotation-field<script>:sample-0");
  assert.equal(parsed.fields[0].arrows.length, 9);
  assert.equal(parsed.fields[0].arrows[0].id, "rotation-field<script>:sample-0:arrow");
});

test("expands scene vector fields before runtime graph construction", () => {
  const scene = vectorFieldScene();
  const expanded = expandSceneVectorFieldObjects(scene);
  const runtimeState = buildMathSceneRuntimeState(scene, 0);

  assert.notEqual(expanded, scene);
  assert.equal(scene.objects.length, 1);
  assert.equal(expanded.objects.length, 10);
  assert.equal(expanded.diagnostics.expectedObjectCount, 10);
  assert.equal(expanded.objects.at(-1)?.id, "rotation-field:sample-8:arrow");
  assert.equal(runtimeState.objectGraph.byId["rotation-field:sample-8:arrow"]?.type, "vector");
  assert.equal(runtimeState.sceneGraph.summary.sceneRenderableCount, 10);
});

test("VectorField object bridge stays pure and is consumed by runtime state", () => {
  const bridgeSource = fs.readFileSync("components/visualizations/three/manim/mathVectorFieldObjects.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/mathSceneRuntimeState.ts", "utf8");

  assert.doesNotMatch(bridgeSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(bridgeSource, /sampleVectorField2D/);
  assert.match(bridgeSource, /buildVectorFieldArrows/);
  assert.match(bridgeSource, /VECTOR_FIELD_SOURCE_CONTRACT/);
  assert.match(runtimeSource, /expandSceneVectorFieldObjects/);
});
