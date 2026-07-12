import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildSceneCreationPrimitivePlan } from "./mathCreationPrimitives";
import type { MathSceneSpec } from "./mathSceneTypes";

type FadeGrowEvidenceModule = {
  FADE_GROW_PHASE_POLICY: "fade-opacity-grow-center-scale";
  FADE_GROW_SOURCE_CONTRACT: "FadeIn/FadeOut animate opacity while GrowFromCenter scales from center";
  buildFadeGrowEvidence: (
    plan: ReturnType<typeof buildSceneCreationPrimitivePlan>,
    progressSamples?: number[]
  ) => {
    fadeFrameCount: number;
    frameCount: number;
    frames: Array<{
      kind: "fadeIn" | "fadeOut" | "growFromCenter";
      objectId: string;
      opacity: number;
      phase: "fade" | "grow";
      phasePolicy: "fade-opacity-grow-center-scale";
      progress: number;
      scale: number;
      sourceContract: "FadeIn/FadeOut animate opacity while GrowFromCenter scales from center";
      styleSummary: string;
      timelineStepIndex: number;
    }>;
    growFrameCount: number;
    kindSequence: string;
    objectIds: string;
    opacitySchedule: string;
    phasePolicy: "fade-opacity-grow-center-scale";
    phaseSequence: string;
    primitiveCount: number;
    scaleSchedule: string;
    sourceContract: "FadeIn/FadeOut animate opacity while GrowFromCenter scales from center";
    summary: string;
  };
  fadeGrowEvidenceDataAttributes: (
    evidence: ReturnType<FadeGrowEvidenceModule["buildFadeGrowEvidence"]>
  ) => Record<string, string>;
  serializeFadeGrowEvidence: (
    evidence: ReturnType<FadeGrowEvidenceModule["buildFadeGrowEvidence"]>
  ) => string;
  summarizeFadeGrowEvidence: (
    evidence: ReturnType<FadeGrowEvidenceModule["buildFadeGrowEvidence"]>
  ) => string;
};

const modulePath = "components/visualizations/three/manim/mathFadeGrowEvidence.ts";

const fadeGrowScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
    worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
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
      samples: [[0, 0, 0], [1, 1, 0]],
      style: { strokeRole: "function", strokeWidth: 4 },
      type: "parametricCurve"
    },
    {
      colorRole: "attention",
      conceptId: "surface",
      id: "surface",
      samples: [
        [[0, 0, 0], [1, 0, 0]],
        [[0, 1, 0], [1, 1, 0]]
      ],
      style: { fillOpacity: 0.5, fillRole: "area", strokeRole: "attention", strokeWidth: 3 },
      type: "parametricSurface",
      uRange: [0, 1],
      vRange: [0, 1]
    }
  ],
  sceneId: "fade-grow-fixture",
  timeline: [
    { type: "fadeInObject", objectId: "curve", duration: 0.8, easing: "smooth" },
    { type: "growFromCenter", objectId: "surface", duration: 1.1, easing: "smooth" },
    { type: "fadeOutObject", objectId: "curve", duration: 0.7, easing: "linear" }
  ]
};

async function importFadeGrowEvidenceModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure Fade/Grow phase-evidence module");
  return await import("./mathFadeGrowEvidence") as FadeGrowEvidenceModule;
}

test("buildFadeGrowEvidence samples Manim FadeIn, FadeOut, and GrowFromCenter frames", async () => {
  const {
    FADE_GROW_PHASE_POLICY,
    FADE_GROW_SOURCE_CONTRACT,
    buildFadeGrowEvidence,
    summarizeFadeGrowEvidence
  } = await importFadeGrowEvidenceModule();
  const plan = buildSceneCreationPrimitivePlan(fadeGrowScene);
  const evidence = buildFadeGrowEvidence(plan, [0.25, 0.75]);

  assert.equal(evidence.primitiveCount, 3);
  assert.equal(evidence.frameCount, 6);
  assert.equal(evidence.fadeFrameCount, 4);
  assert.equal(evidence.growFrameCount, 2);
  assert.equal(evidence.phasePolicy, FADE_GROW_PHASE_POLICY);
  assert.equal(evidence.sourceContract, FADE_GROW_SOURCE_CONTRACT);
  assert.equal(evidence.objectIds, "curve,surface");
  assert.equal(
    evidence.kindSequence,
    "curve@0.250:fadeIn|curve@0.750:fadeIn|surface@0.250:growFromCenter|surface@0.750:growFromCenter|curve@0.250:fadeOut|curve@0.750:fadeOut"
  );
  assert.equal(
    evidence.phaseSequence,
    "curve@0.250:fade|curve@0.750:fade|surface@0.250:grow|surface@0.750:grow|curve@0.250:fade|curve@0.750:fade"
  );
  assert.equal(
    evidence.opacitySchedule,
    "curve@0.250=0.250|curve@0.750=0.750|surface@0.250=0.250|surface@0.750=0.750|curve@0.250=0.750|curve@0.750=0.250"
  );
  assert.equal(
    evidence.scaleSchedule,
    "curve@0.250=1.000|curve@0.750=1.000|surface@0.250=0.250|surface@0.750=0.750|curve@0.250=1.000|curve@0.750=1.000"
  );
  assert.deepEqual(
    evidence.frames.map((frame) => ({
      kind: frame.kind,
      objectId: frame.objectId,
      opacity: frame.opacity,
      phase: frame.phase,
      phasePolicy: frame.phasePolicy,
      progress: frame.progress,
      scale: frame.scale,
      sourceContract: frame.sourceContract,
      timelineStepIndex: frame.timelineStepIndex
    })),
    [
      {
        kind: "fadeIn",
        objectId: "curve",
        opacity: 0.25,
        phase: "fade",
        phasePolicy: FADE_GROW_PHASE_POLICY,
        progress: 0.25,
        scale: 1,
        sourceContract: FADE_GROW_SOURCE_CONTRACT,
        timelineStepIndex: 0
      },
      {
        kind: "fadeIn",
        objectId: "curve",
        opacity: 0.75,
        phase: "fade",
        phasePolicy: FADE_GROW_PHASE_POLICY,
        progress: 0.75,
        scale: 1,
        sourceContract: FADE_GROW_SOURCE_CONTRACT,
        timelineStepIndex: 0
      },
      {
        kind: "growFromCenter",
        objectId: "surface",
        opacity: 0.25,
        phase: "grow",
        phasePolicy: FADE_GROW_PHASE_POLICY,
        progress: 0.25,
        scale: 0.25,
        sourceContract: FADE_GROW_SOURCE_CONTRACT,
        timelineStepIndex: 1
      },
      {
        kind: "growFromCenter",
        objectId: "surface",
        opacity: 0.75,
        phase: "grow",
        phasePolicy: FADE_GROW_PHASE_POLICY,
        progress: 0.75,
        scale: 0.75,
        sourceContract: FADE_GROW_SOURCE_CONTRACT,
        timelineStepIndex: 1
      },
      {
        kind: "fadeOut",
        objectId: "curve",
        opacity: 0.75,
        phase: "fade",
        phasePolicy: FADE_GROW_PHASE_POLICY,
        progress: 0.25,
        scale: 1,
        sourceContract: FADE_GROW_SOURCE_CONTRACT,
        timelineStepIndex: 2
      },
      {
        kind: "fadeOut",
        objectId: "curve",
        opacity: 0.25,
        phase: "fade",
        phasePolicy: FADE_GROW_PHASE_POLICY,
        progress: 0.75,
        scale: 1,
        sourceContract: FADE_GROW_SOURCE_CONTRACT,
        timelineStepIndex: 2
      }
    ]
  );
  assert.equal(
    summarizeFadeGrowEvidence(evidence),
    "fadeGrow:primitives=3:frames=6:fade=4:grow=2:objects=curve,surface:kinds=curve@0.250:fadeIn|curve@0.750:fadeIn|surface@0.250:growFromCenter|surface@0.750:growFromCenter|curve@0.250:fadeOut|curve@0.750:fadeOut"
  );
});

test("fadeGrowEvidenceDataAttributes exposes stable browser QA attributes", async () => {
  const {
    FADE_GROW_PHASE_POLICY,
    FADE_GROW_SOURCE_CONTRACT,
    buildFadeGrowEvidence,
    fadeGrowEvidenceDataAttributes
  } = await importFadeGrowEvidenceModule();
  const evidence = buildFadeGrowEvidence(
    buildSceneCreationPrimitivePlan(fadeGrowScene),
    [0.25, 0.75]
  );

  assert.deepEqual(fadeGrowEvidenceDataAttributes(evidence), {
    "data-viz-manim-fade-grow-fade-frame-count": "4",
    "data-viz-manim-fade-grow-frame-count": "6",
    "data-viz-manim-fade-grow-grow-frame-count": "2",
    "data-viz-manim-fade-grow-kind-sequence": evidence.kindSequence,
    "data-viz-manim-fade-grow-object-ids": "curve,surface",
    "data-viz-manim-fade-grow-opacity-schedule": evidence.opacitySchedule,
    "data-viz-manim-fade-grow-phase-policy": FADE_GROW_PHASE_POLICY,
    "data-viz-manim-fade-grow-phase-sequence": evidence.phaseSequence,
    "data-viz-manim-fade-grow-primitive-count": "3",
    "data-viz-manim-fade-grow-scale-schedule": evidence.scaleSchedule,
    "data-viz-manim-fade-grow-source-contract": FADE_GROW_SOURCE_CONTRACT,
    "data-viz-manim-fade-grow-summary": evidence.summary
  });
});

test("serializeFadeGrowEvidence emits script-safe browser QA JSON", async () => {
  const {
    FADE_GROW_PHASE_POLICY,
    FADE_GROW_SOURCE_CONTRACT,
    buildFadeGrowEvidence,
    serializeFadeGrowEvidence
  } = await importFadeGrowEvidenceModule();
  const evidence = buildFadeGrowEvidence(
    buildSceneCreationPrimitivePlan(fadeGrowScene),
    [0.25, 0.75]
  );
  const json = serializeFadeGrowEvidence({
    ...evidence,
    frames: evidence.frames.map((frame) => ({ ...frame, objectId: `<${frame.objectId}` })),
    objectIds: "<curve,<surface"
  });
  const parsed = JSON.parse(json);

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.primitiveCount, 3);
  assert.equal(parsed.frameCount, 6);
  assert.equal(parsed.fadeFrameCount, 4);
  assert.equal(parsed.growFrameCount, 2);
  assert.equal(parsed.objectIds, "<curve,<surface");
  assert.equal(parsed.phasePolicy, FADE_GROW_PHASE_POLICY);
  assert.equal(parsed.sourceContract, FADE_GROW_SOURCE_CONTRACT);
  assert.equal(parsed.frames[0].objectId, "<curve");
  assert.equal(parsed.frames[0].kind, "fadeIn");
  assert.equal(parsed.frames[0].opacity, 0.25);
  assert.equal(parsed.frames[2].objectId, "<surface");
  assert.equal(parsed.frames[2].kind, "growFromCenter");
  assert.equal(parsed.frames[2].scale, 0.25);
  assert.equal(parsed.frames[4].kind, "fadeOut");
  assert.equal(parsed.frames[4].opacity, 0.75);
});

test("Fade/Grow phase evidence stays pure and documents the Manim source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathFadeGrowEvidence.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /FadeIn/);
  assert.match(source, /FadeOut/);
  assert.match(source, /FADE_GROW_PHASE_POLICY/);
  assert.match(source, /FADE_GROW_SOURCE_CONTRACT/);
  assert.match(source, /GrowFromCenter/);
  assert.match(source, /buildCreationPrimitiveFrame/);
  assert.match(source, /fadeGrowEvidenceDataAttributes/);
  assert.match(source, /serializeFadeGrowEvidence/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
