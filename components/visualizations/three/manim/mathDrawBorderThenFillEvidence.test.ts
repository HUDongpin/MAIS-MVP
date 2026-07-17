import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildSceneCreationPrimitivePlan } from "./mathCreationPrimitives";
import type { MathSceneSpec } from "./mathSceneTypes";

type DrawBorderThenFillEvidenceModule = {
  DRAW_BORDER_THEN_FILL_PHASE_POLICY: "border-then-fill";
  DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT: "DrawBorderThenFill traces outline first, then interpolates fill/style";
  buildDrawBorderThenFillEvidence: (
    plan: ReturnType<typeof buildSceneCreationPrimitivePlan>,
    progressSamples?: number[]
  ) => {
    borderFrameCount: number;
    drawRangeSummary: string;
    fillFrameCount: number;
    fillOpacitySchedule: string;
    frameCount: number;
    frames: Array<{
      phasePolicy: "border-then-fill";
      sourceContract: "DrawBorderThenFill traces outline first, then interpolates fill/style";
      drawRange: [number, number];
      fillOpacity: number;
      objectId: string;
      phase: "draw-border" | "fill";
      progress: number;
      strokeOpacity: number;
      styleSummary: string;
      timelineStepIndex: number;
    }>;
    objectIds: string;
    phaseSequence: string;
    primitiveCount: number;
    sourceContract: "DrawBorderThenFill traces outline first, then interpolates fill/style";
    phasePolicy: "border-then-fill";
    strokeOpacitySchedule: string;
    summary: string;
  };
  drawBorderThenFillEvidenceDataAttributes: (
    evidence: ReturnType<DrawBorderThenFillEvidenceModule["buildDrawBorderThenFillEvidence"]>
  ) => Record<string, string>;
  serializeDrawBorderThenFillEvidence: (
    evidence: ReturnType<DrawBorderThenFillEvidenceModule["buildDrawBorderThenFillEvidence"]>
  ) => string;
  summarizeDrawBorderThenFillEvidence: (
    evidence: ReturnType<DrawBorderThenFillEvidenceModule["buildDrawBorderThenFillEvidence"]>
  ) => string;
};

const modulePath = "components/visualizations/three/manim/mathDrawBorderThenFillEvidence.ts";

const drawBorderThenFillScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
    worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
  },
  diagnostics: {
    expectedBindingCount: 0,
    expectedObjectCount: 1,
    expectedTokenCount: 0
  },
  familyId: "three-function-graph",
  formulas: [],
  objects: [
    {
      colorRole: "function",
      conceptId: "area-under-curve",
      id: "area-surface",
      samples: [
        [[0, 0, 0], [1, 0, 0]],
        [[0, 1, 0], [1, 1, 0]]
      ],
      style: {
        fillOpacity: 0.6,
        fillRole: "area",
        strokeOpacity: 0.8,
        strokeRole: "function",
        strokeWidth: 4
      },
      type: "parametricSurface",
      uRange: [0, 1],
      vRange: [0, 1]
    }
  ],
  sceneId: "draw-border-fill-fixture",
  timeline: [
    { type: "revealSurface", objectId: "area-surface", duration: 2, easing: "smooth" }
  ]
};

async function importDrawBorderThenFillEvidenceModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure DrawBorderThenFill phase-evidence module");
  return await import("./mathDrawBorderThenFillEvidence") as DrawBorderThenFillEvidenceModule;
}

test("buildDrawBorderThenFillEvidence samples border and fill phases from creation primitives", async () => {
  const {
    DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    buildDrawBorderThenFillEvidence,
    summarizeDrawBorderThenFillEvidence
  } = await importDrawBorderThenFillEvidenceModule();
  const plan = buildSceneCreationPrimitivePlan(drawBorderThenFillScene);
  const evidence = buildDrawBorderThenFillEvidence(plan, [0.25, 0.75]);

  assert.equal(evidence.primitiveCount, 1);
  assert.equal(evidence.frameCount, 2);
  assert.equal(evidence.borderFrameCount, 1);
  assert.equal(evidence.fillFrameCount, 1);
  assert.equal(evidence.phasePolicy, DRAW_BORDER_THEN_FILL_PHASE_POLICY);
  assert.equal(evidence.sourceContract, DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT);
  assert.equal(evidence.objectIds, "area-surface");
  assert.equal(evidence.phaseSequence, "area-surface@0.250:draw-border|area-surface@0.750:fill");
  assert.equal(evidence.drawRangeSummary, "area-surface@0.250=0.000..0.500|area-surface@0.750=0.000..1.000");
  assert.equal(evidence.fillOpacitySchedule, "area-surface@0.250=0.000|area-surface@0.750=0.300");
  assert.equal(evidence.strokeOpacitySchedule, "area-surface@0.250=0.800|area-surface@0.750=0.800");
  assert.deepEqual(
    evidence.frames.map((frame) => ({
      drawRange: frame.drawRange,
      fillOpacity: Number(frame.fillOpacity.toFixed(3)),
      objectId: frame.objectId,
      phase: frame.phase,
      phasePolicy: frame.phasePolicy,
      progress: frame.progress,
      sourceContract: frame.sourceContract,
      strokeOpacity: Number(frame.strokeOpacity.toFixed(3)),
      timelineStepIndex: frame.timelineStepIndex
    })),
    [
      {
        drawRange: [0, 0.5],
        fillOpacity: 0,
        objectId: "area-surface",
        phase: "draw-border",
        phasePolicy: DRAW_BORDER_THEN_FILL_PHASE_POLICY,
        progress: 0.25,
        sourceContract: DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
        strokeOpacity: 0.8,
        timelineStepIndex: 0
      },
      {
        drawRange: [0, 1],
        fillOpacity: 0.3,
        objectId: "area-surface",
        phase: "fill",
        phasePolicy: DRAW_BORDER_THEN_FILL_PHASE_POLICY,
        progress: 0.75,
        sourceContract: DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
        strokeOpacity: 0.8,
        timelineStepIndex: 0
      }
    ]
  );
  assert.equal(
    evidence.frames[0].styleSummary,
    "stroke=function:4.00@0.80;fill=area@0.00;aa=1.00"
  );
  assert.equal(
    evidence.frames[1].styleSummary,
    "stroke=function:4.00@0.80;fill=area@0.30;aa=1.00"
  );
  assert.equal(
    summarizeDrawBorderThenFillEvidence(evidence),
    "drawBorderThenFill:primitives=1:frames=2:border=1:fill=1:objects=area-surface:phases=area-surface@0.250:draw-border|area-surface@0.750:fill"
  );
});

test("drawBorderThenFillEvidenceDataAttributes exposes stable browser QA attributes", async () => {
  const {
    DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    buildDrawBorderThenFillEvidence,
    drawBorderThenFillEvidenceDataAttributes
  } = await importDrawBorderThenFillEvidenceModule();
  const evidence = buildDrawBorderThenFillEvidence(
    buildSceneCreationPrimitivePlan(drawBorderThenFillScene),
    [0.25, 0.75]
  );

  assert.deepEqual(drawBorderThenFillEvidenceDataAttributes(evidence), {
    "data-viz-manim-draw-border-fill-border-frame-count": "1",
    "data-viz-manim-draw-border-fill-draw-ranges": "area-surface@0.250=0.000..0.500|area-surface@0.750=0.000..1.000",
    "data-viz-manim-draw-border-fill-fill-frame-count": "1",
    "data-viz-manim-draw-border-fill-fill-opacity-schedule": "area-surface@0.250=0.000|area-surface@0.750=0.300",
    "data-viz-manim-draw-border-fill-frame-count": "2",
    "data-viz-manim-draw-border-fill-object-ids": "area-surface",
    "data-viz-manim-draw-border-fill-phase-policy": DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    "data-viz-manim-draw-border-fill-phase-sequence": "area-surface@0.250:draw-border|area-surface@0.750:fill",
    "data-viz-manim-draw-border-fill-primitive-count": "1",
    "data-viz-manim-draw-border-fill-source-contract": DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    "data-viz-manim-draw-border-fill-stroke-opacity-schedule": "area-surface@0.250=0.800|area-surface@0.750=0.800",
    "data-viz-manim-draw-border-fill-summary": evidence.summary
  });
});

test("serializeDrawBorderThenFillEvidence emits script-safe browser QA JSON", async () => {
  const {
    DRAW_BORDER_THEN_FILL_PHASE_POLICY,
    DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT,
    buildDrawBorderThenFillEvidence,
    serializeDrawBorderThenFillEvidence
  } = await importDrawBorderThenFillEvidenceModule();
  const evidence = buildDrawBorderThenFillEvidence(
    buildSceneCreationPrimitivePlan(drawBorderThenFillScene),
    [0.25, 0.75]
  );
  const json = serializeDrawBorderThenFillEvidence({
    ...evidence,
    frames: evidence.frames.map((frame) => ({ ...frame, objectId: "<area-surface" })),
    objectIds: "<area-surface"
  });
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.primitiveCount, 1);
  assert.equal(parsed.frameCount, 2);
  assert.equal(parsed.borderFrameCount, 1);
  assert.equal(parsed.fillFrameCount, 1);
  assert.equal(parsed.objectIds, "<area-surface");
  assert.equal(parsed.phasePolicy, DRAW_BORDER_THEN_FILL_PHASE_POLICY);
  assert.equal(parsed.sourceContract, DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT);
  assert.equal(parsed.frames[0].objectId, "<area-surface");
  assert.equal(parsed.frames[0].phase, "draw-border");
  assert.deepEqual(parsed.frames[0].drawRange, [0, 0.5]);
  assert.equal(parsed.frames[1].objectId, "<area-surface");
  assert.equal(parsed.frames[1].phase, "fill");
  assert.deepEqual(parsed.frames[1].drawRange, [0, 1]);
  assert.equal(parsed.frames[1].fillOpacity, 0.3);
});

test("DrawBorderThenFill phase evidence stays pure and documents the Manim source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathDrawBorderThenFillEvidence.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /DrawBorderThenFill/);
  assert.match(source, /DRAW_BORDER_THEN_FILL_PHASE_POLICY/);
  assert.match(source, /DRAW_BORDER_THEN_FILL_SOURCE_CONTRACT/);
  assert.match(source, /buildCreationPrimitiveFrame/);
  assert.match(source, /drawBorderThenFillEvidenceDataAttributes/);
  assert.match(source, /serializeDrawBorderThenFillEvidence/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
