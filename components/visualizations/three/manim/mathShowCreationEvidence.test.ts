import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";
import { buildSceneCreationPrimitivePlan } from "./mathCreationPrimitives";
import {
  SHOW_CREATION_PARTIAL_POLICY,
  SHOW_CREATION_SOURCE_CONTRACT,
  buildShowCreationEvidence,
  serializeShowCreationEvidence,
  showCreationEvidenceDataAttributes,
  summarizeShowCreationEvidence
} from "./mathShowCreationEvidence";

const fixtureScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
    worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  },
  diagnostics: {
    expectedBindingCount: 0,
    expectedObjectCount: 2,
    expectedTokenCount: 0
  },
  familyId: "three-function-graph",
  formulas: [],
  objects: [
    {
      colorRole: "function",
      conceptId: "curve",
      id: "curve",
      samples: [[0, 0, 0], [1, 1, 0], [2, 1, 0]],
      style: { strokeRole: "function", strokeWidth: 4 },
      type: "parametricCurve"
    },
    {
      colorRole: "area",
      conceptId: "surface",
      id: "surface",
      samples: [
        [[0, 0, 0], [1, 0, 0]],
        [[0, 1, 0], [1, 1, 0]]
      ],
      style: { fillOpacity: 0.45, fillRole: "area", strokeRole: "function", strokeWidth: 3 },
      type: "parametricSurface",
      uRange: [0, 1],
      vRange: [0, 1]
    }
  ],
  sceneId: "mais-manim-show-creation-fixture",
  timeline: [
    { type: "revealCurve", objectId: "curve", duration: 1.5, easing: "smooth" },
    { type: "revealSurface", objectId: "surface", duration: 2, easing: "smooth" }
  ]
};

test("records ShowCreation partial-stroke frames from creation primitive plans", () => {
  const evidence = buildShowCreationEvidence(buildSceneCreationPrimitivePlan(fixtureScene), [0.25, 0.75]);

  assert.equal(evidence.primitiveCount, 1);
  assert.equal(evidence.frameCount, 2);
  assert.equal(evidence.objectIds, "curve");
  assert.equal(evidence.partialPolicy, SHOW_CREATION_PARTIAL_POLICY);
  assert.equal(evidence.sourceContract, SHOW_CREATION_SOURCE_CONTRACT);
  assert.equal(evidence.phaseSequence, "curve@0.250:stroke|curve@0.750:stroke");
  assert.equal(evidence.drawRangeSummary, "curve@0.250=0.000..0.250|curve@0.750=0.000..0.750");
  assert.equal(evidence.opacitySchedule, "curve@0.250=1.000|curve@0.750=1.000");
  assert.equal(evidence.progressRange, "0.250..0.750");
  assert.equal(
    summarizeShowCreationEvidence(evidence),
    "showCreation:primitives=1:frames=2:progress=0.250..0.750:objects=curve:ranges=curve@0.250=0.000..0.250|curve@0.750=0.000..0.750"
  );
});

test("serializes ShowCreation source evidence as browser QA data attributes", () => {
  const evidence = buildShowCreationEvidence(buildSceneCreationPrimitivePlan(fixtureScene), [0.25, 0.75]);

  assert.deepEqual(showCreationEvidenceDataAttributes(evidence), {
    "data-viz-manim-show-creation-draw-ranges": "curve@0.250=0.000..0.250|curve@0.750=0.000..0.750",
    "data-viz-manim-show-creation-frame-count": "2",
    "data-viz-manim-show-creation-object-ids": "curve",
    "data-viz-manim-show-creation-opacity-schedule": "curve@0.250=1.000|curve@0.750=1.000",
    "data-viz-manim-show-creation-partial-policy": SHOW_CREATION_PARTIAL_POLICY,
    "data-viz-manim-show-creation-phase-sequence": "curve@0.250:stroke|curve@0.750:stroke",
    "data-viz-manim-show-creation-primitive-count": "1",
    "data-viz-manim-show-creation-progress-range": "0.250..0.750",
    "data-viz-manim-show-creation-source-contract": SHOW_CREATION_SOURCE_CONTRACT,
    "data-viz-manim-show-creation-summary":
      "showCreation:primitives=1:frames=2:progress=0.250..0.750:objects=curve:ranges=curve@0.250=0.000..0.250|curve@0.750=0.000..0.750"
  });
});

test("serializes ShowCreation evidence as script-safe JSON for browser QA", () => {
  const evidence = buildShowCreationEvidence(buildSceneCreationPrimitivePlan(fixtureScene), [0.25, 0.75]);
  const json = serializeShowCreationEvidence({
    ...evidence,
    frames: evidence.frames.map((frame) => ({ ...frame, objectId: "<curve" })),
    objectIds: "<curve"
  });

  assert.doesNotMatch(json, /</);
  assert.deepEqual(JSON.parse(json), {
    drawRangeSummary: "curve@0.250=0.000..0.250|curve@0.750=0.000..0.750",
    frameCount: 2,
    frames: [
      {
        drawRange: [0, 0.25],
        objectId: "<curve",
        opacity: 1,
        partialPolicy: SHOW_CREATION_PARTIAL_POLICY,
        phase: "stroke",
        progress: 0.25,
        sourceContract: SHOW_CREATION_SOURCE_CONTRACT,
        styleSummary: "stroke=function:4.00@1.00;fill=reference@0.00;aa=1.00",
        timelineStepIndex: 0
      },
      {
        drawRange: [0, 0.75],
        objectId: "<curve",
        opacity: 1,
        partialPolicy: SHOW_CREATION_PARTIAL_POLICY,
        phase: "stroke",
        progress: 0.75,
        sourceContract: SHOW_CREATION_SOURCE_CONTRACT,
        styleSummary: "stroke=function:4.00@1.00;fill=reference@0.00;aa=1.00",
        timelineStepIndex: 0
      }
    ],
    objectIds: "<curve",
    opacitySchedule: "curve@0.250=1.000|curve@0.750=1.000",
    partialPolicy: SHOW_CREATION_PARTIAL_POLICY,
    phaseSequence: "curve@0.250:stroke|curve@0.750:stroke",
    primitiveCount: 1,
    progressRange: "0.250..0.750",
    sourceContract: SHOW_CREATION_SOURCE_CONTRACT,
    summary:
      "showCreation:primitives=1:frames=2:progress=0.250..0.750:objects=curve:ranges=curve@0.250=0.000..0.250|curve@0.750=0.000..0.750"
  });
});

test("ShowCreation evidence stays pure and documents pointwise_become_partial semantics", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathShowCreationEvidence.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /SHOW_CREATION_SOURCE_CONTRACT/);
  assert.match(source, /serializeShowCreationEvidence/);
  assert.match(source, /pointwise_become_partial/);
  assert.match(source, /partial-stroke-reveal-from-zero-to-alpha/);
});
