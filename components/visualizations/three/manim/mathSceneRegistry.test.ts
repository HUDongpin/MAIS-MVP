import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMathSceneSpecForThreeDFamily,
  isMaisManimFamily,
  maisManimFamilyIds
} from "./mathSceneRegistry";
import { buildMathSceneEvidenceSnapshot } from "./mathEvidenceHarness";
import { odeTrajectoryRuntimeObjectIds } from "./mathOdeTrajectoryObjects";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { streamLineRuntimeObjectId } from "./mathStreamLineObjects";
import { vectorFieldRuntimeObjectId } from "./mathVectorFieldObjects";
import { buildSceneValueTrackers } from "./mathValueTracker";
import {
  FORMULA_BINDING_SOURCE_CONTRACT,
  summarizeFormulaBindings,
  validateFormulaBindings
} from "./mathFormulaBindings";
import { threeDFamilyIds } from "../threeDSceneMath";
import type { ThreeDFamilyId } from "../threeDSceneTypes";
import type { VisualizationTemplateId } from "../../visualizationTemplateIds";

type BuiltMathSceneSpec = NonNullable<ReturnType<typeof buildMathSceneSpecForThreeDFamily>>;

function declaredFormulaTokenIds(spec: BuiltMathSceneSpec) {
  return spec.formulas.flatMap((formula) => formula.tokens.map((token) => token.id)).join(",") || "none";
}

function declaredSemanticBindingConceptIds(spec: BuiltMathSceneSpec) {
  return spec.bindings.map((binding) => binding.conceptId).sort().join(",") || "none";
}

function assertFormulaSummary(spec: BuiltMathSceneSpec) {
  assert.deepEqual(summarizeFormulaBindings(spec), {
    bindingCount: spec.diagnostics.expectedBindingCount,
    conceptIds: declaredSemanticBindingConceptIds(spec),
    objectCount: spec.diagnostics.expectedObjectCount,
    sourceContract: FORMULA_BINDING_SOURCE_CONTRACT,
    tokenCount: spec.diagnostics.expectedTokenCount,
    tokenIds: declaredFormulaTokenIds(spec)
  });
}

test("registers every approved Three.js family for MAIS Manim runtime", () => {
  assert.deepEqual(maisManimFamilyIds, threeDFamilyIds);
  for (const familyId of threeDFamilyIds) {
    assert.equal(isMaisManimFamily(familyId), true, `${familyId} should use MAIS Manim`);
  }
});

test("every registered MAIS Manim scene binding has an explicit projected label anchor", () => {
  const missingAnchors = threeDFamilyIds.flatMap((familyId) => {
    const spec = buildMathSceneSpecForThreeDFamily({
      accent: "#22d3ee",
      state: {
        comparison: 5,
        depthValue: 1.4,
        familyId,
        mode: 1,
        primaryValue: 6,
        secondaryValue: 5,
        stateSummary: `family=${familyId};template=function-graph;value=6.000;comparison=5.000;depth=1.400`,
        templateId: "function-graph",
        value: 6
      }
    });

    return (spec?.bindings ?? [])
      .filter((binding) => !binding.anchorName)
      .map((binding) => `${familyId}:${binding.tokenId}`);
  });

  assert.deepEqual(missingAnchors, []);
});

test("builds a deterministic function graph scene spec with bindings and timeline", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-function-graph");
  assert.equal(spec?.familyId, "three-function-graph");
  assert.equal(spec?.randomSeed?.algorithm, "mulberry32");
  assert.equal(spec?.randomSeed?.source, "scene");
  assert.match(spec?.randomSeed?.signature ?? "", /^rng-[0-9a-f]{8}$/);
  assert.equal(spec?.objects.length, 4);
  assert.equal(spec?.timeline.length, 6);
  assert.equal(spec?.animationPlans?.length, 2);
  assert.deepEqual(
    spec?.animationPlans?.map((plan) => plan.id),
    ["function-curve-attention-lift", "function-probe-attention-pulse"]
  );
  assert.deepEqual(spec?.animationCompositions, [
    {
      animationPlanIds: ["function-curve-attention-lift", "function-probe-attention-pulse"],
      id: "function-attention-lagged-start",
      lagRatio: 0.2,
      type: "laggedStart"
    }
  ]);
  assert.equal(spec?.timeline[3]?.type, "animationComposition");
  assert.equal(spec?.cameraShots.length, 2);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "function-token")?.anchorName, "upperRight");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "point-token")?.anchorName, "top");
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("function graph scene authors a semantic parameter sweep bound to the formula token", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  assert.ok(spec);
  const sweep = spec!.timeline.find((step) => step.type === "sweepParameter");

  assert.deepEqual(sweep, {
    type: "sweepParameter",
    trackerId: "parameter:value",
    fromValue: 6,
    targetValue: 5,
    duration: 1.2,
    easing: "smooth",
    conceptId: "function-rule",
    formulaTokenIds: ["function-token"]
  });

  const sweepStartSeconds = spec!.timeline
    .slice(0, spec!.timeline.findIndex((step) => step.type === "sweepParameter"))
    .reduce((total, step) => total + step.duration, 0);
  const midSweepTrackers = buildSceneValueTrackers(spec!, sweepStartSeconds + 0.6);

  assert.equal(midSweepTrackers.byId["parameter:value"].conceptId, "function-rule");
  assert.ok(midSweepTrackers.byId["parameter:value"].value > 5);
  assert.ok(midSweepTrackers.byId["parameter:value"].value < 6);
});

test("function graph scene uses CoordinateSystem3D graph helpers for Manim Axes.get_graph semantics", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");

  assert.match(source, /createCoordinateSystem3D/);
  assert.match(source, /buildGraphCurveObject/);
  assert.match(source, /displaySampleCount:\s*72/);
});

test("math scene registry no longer depends on legacy coordinate-space samplers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");

  assert.doesNotMatch(source, /from "\.\/mathCoordinateSpace"/);
  assert.doesNotMatch(source, /function sampledPath|function sampleSurfaceGrid|function projectionViewRectanglePath/);
  assert.doesNotMatch(source, /mapMathPointToWorld|sampleParametricCurve|resampleCurveByArcLength/);
});

test("builds a deterministic function family scene spec with model comparison bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#f472b6",
    state: {
      comparison: 7,
      depthValue: 1.5,
      familyId: "three-function-family",
      mode: 1,
      primaryValue: 6.1,
      secondaryValue: 7.25,
      stateSummary: "family=three-function-family;template=function-family;value=6.100;comparison=7.250;depth=1.500",
      templateId: "function-family",
      value: 6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-function-family");
  assert.equal(spec?.familyId, "three-function-family");
  assert.equal(spec?.objects.length, 5);
  assert.equal(spec?.timeline.length, 6);
  assert.equal(spec?.cameraShots.length, 2);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "family-token")?.anchorName, "upperRight");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "comparison-token")?.anchorName, "upperLeft");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "probe-token")?.anchorName, "top");
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("function family scene uses CoordinateSystem3D graph helpers for both compared curves", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const functionFamilySource = source.slice(
    source.indexOf("export function buildFunctionFamilyMathSceneSpec"),
    source.indexOf("function formulaForComplexPlane")
  );

  assert.match(functionFamilySource, /createCoordinateSystem3D/);
  assert.match(functionFamilySource, /id:\s*"primary-family-curve"/);
  assert.match(functionFamilySource, /id:\s*"comparison-family-curve"/);
  assert.equal((functionFamilySource.match(/buildGraphCurveObject/g) ?? []).length, 2);
  assert.equal((functionFamilySource.match(/displaySampleCount:\s*72/g) ?? []).length, 2);
  assert.doesNotMatch(functionFamilySource, /sampleParametricCurve|resampleCurveByArcLength/);
});

test("normalizes function family mode labels for stable formula overlays", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#f472b6",
    state: {
      comparison: 7,
      depthValue: 1.5,
      familyId: "three-function-family",
      mode: 1.6,
      primaryValue: 6.1,
      secondaryValue: 7.25,
      stateSummary: "family=three-function-family;template=function-family;value=6.100;comparison=7.250;depth=1.500",
      templateId: "function-family",
      value: 6
    }
  });

  assert.ok(spec);
  assert.match(spec!.formulas[0].latex, /active=\\ln x\\ vs\\ 2\^x/);
  assert.doesNotMatch(spec!.formulas[0].latex, /undefined/);
});

test("derives different scene random seeds when state summaries change", () => {
  const first = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-probability-machine",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-probability-machine;template=probability-simulation;value=6.000",
      templateId: "probability-simulation",
      value: 6
    }
  });
  const second = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-probability-machine",
      mode: 0,
      primaryValue: 7,
      secondaryValue: 5,
      stateSummary: "family=three-probability-machine;template=probability-simulation;value=7.000",
      templateId: "probability-simulation",
      value: 7
    }
  });

  assert.ok(first?.randomSeed);
  assert.ok(second?.randomSeed);
  assert.notEqual(first?.randomSeed?.signature, second?.randomSeed?.signature);
});

test("builds a deterministic complex plane scene spec with rotation bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#a78bfa",
    state: {
      comparison: 7,
      depthValue: 1.9,
      familyId: "three-complex-plane",
      mode: 1,
      primaryValue: 7.2,
      secondaryValue: 7.25,
      stateSummary: "family=three-complex-plane;template=complex-plane;value=7.200;comparison=7.250;depth=1.900",
      templateId: "complex-plane",
      value: 6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-complex-plane");
  assert.equal(spec?.familyId, "three-complex-plane");
  assert.equal(spec?.objects.length, 6);
  assert.equal(spec?.odeTrajectories?.length, 1);
  assert.deepEqual(spec?.streamLines, [
    {
      bounds: {
        x: [-2.4, 2.4],
        y: [-2.4, 2.4],
        z: [-1, 1]
      },
      colorRole: "reference",
      conceptId: "rotation-orbit",
      coordinateMode: "math",
      dt: 0.08,
      id: "complex-rotation-streamlines",
      phaseOffsetStep: 0.18,
      stepCount: 18,
      system: {
        matrix: [
          [0, -1],
          [1, 0]
        ],
        type: "linear2d"
      },
      visibleProgress: 0.22,
      xRange: [-1.35, 1.35],
      xSteps: 2,
      yRange: [-1.35, 1.35],
      ySteps: 2,
      z: 0.2
    }
  ]);
  assert.deepEqual(spec?.vectorFields, [
    {
      colorRole: "trace",
      conceptId: "rotation-orbit",
      coordinateMode: "math",
      id: "complex-rotation-field",
      maxArrowLength: 0.24,
      system: {
        matrix: [
          [0, -1],
          [1, 0]
        ],
        type: "linear2d"
      },
      xRange: [-1.7, 1.7],
      xSteps: 3,
      yRange: [-1.7, 1.7],
      ySteps: 3,
      z: 0.2
    }
  ]);
  const odeTrajectory = spec?.odeTrajectories?.[0];
  assert.ok(odeTrajectory);
  assert.deepEqual(odeTrajectory.bounds, {
    x: [-2.4, 2.4],
    y: [-2.4, 2.4],
    z: [-1, 1]
  });
  assert.equal(odeTrajectory.colorRole, "function");
  assert.equal(odeTrajectory.conceptId, "rotation-orbit");
  assert.equal(odeTrajectory.coordinateMode, "math");
  assert.equal(odeTrajectory.id, "complex-rotation-flow");
  assert.equal(odeTrajectory.method, "rk4");
  assert.equal(odeTrajectory.stepCount, 144);
  assert.deepEqual(odeTrajectory.system, {
    matrix: [
      [0, -1],
      [1, 0]
    ],
    type: "linear2d"
  });
  assert.ok(odeTrajectory.start.every(Number.isFinite));
  assert.equal(odeTrajectory.tailDurationSeconds, 1.2);
  assert.deepEqual(odeTrajectory.tRange, [0, Math.PI * 2]);
  assert.deepEqual(odeTrajectory, {
    bounds: {
      x: [-2.4, 2.4],
      y: [-2.4, 2.4],
      z: [-1, 1]
    },
    colorRole: "function",
    conceptId: "rotation-orbit",
    coordinateMode: "math",
    id: "complex-rotation-flow",
    method: "rk4",
    start: odeTrajectory.start,
    stepCount: 144,
    system: {
      matrix: [
        [0, -1],
        [1, 0]
      ],
      type: "linear2d"
    },
    tailDurationSeconds: 1.2,
    tRange: [0, Math.PI * 2]
  });
  assert.equal(spec?.timeline.length, 9);
  assert.deepEqual(spec?.timeline.slice(2, 7), [
    { type: "revealCurve", objectId: "complex-rotation-flow:trajectory-path", duration: 1.6, easing: "linear" },
    { type: "highlight", conceptId: "complex-vector", duration: 1 },
    { type: "highlight", conceptId: "rotation-product", duration: 1 },
    { type: "moveAlongPath", objectId: "orbit-probe", pathObjectId: "rotation-orbit", duration: 3.1 },
    {
      type: "moveAlongPath",
      objectId: "complex-rotation-flow:current-state",
      pathObjectId: "complex-rotation-flow:trajectory-path",
      duration: 3.2
    }
  ]);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("complex plane curves use CoordinateSystem3D parametric helpers for Manim ParametricCurve semantics", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const complexPlaneSource = source.slice(
    source.indexOf("export function buildComplexPlaneMathSceneSpec"),
    source.indexOf("function clampValue")
  );

  assert.match(complexPlaneSource, /createCoordinateSystem3D/);
  assert.match(complexPlaneSource, /id:\s*"modulus-circle"/);
  assert.match(complexPlaneSource, /id:\s*"rotation-orbit"/);
  assert.equal((complexPlaneSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(complexPlaneSource, /displaySampleCount:\s*72/);
  assert.match(complexPlaneSource, /displaySampleCount:\s*56/);
  assert.doesNotMatch(complexPlaneSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("complex plane ODE trajectory expands into runtime Mobjects and evidence", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#a78bfa",
    state: {
      comparison: 7,
      depthValue: 1.9,
      familyId: "three-complex-plane",
      mode: 1,
      primaryValue: 7.2,
      secondaryValue: 7.25,
      stateSummary: "family=three-complex-plane;template=complex-plane;value=7.200;comparison=7.250;depth=1.900",
      templateId: "complex-plane",
      value: 6
    }
  });
  assert.ok(spec);

  const generatedIds = odeTrajectoryRuntimeObjectIds("complex-rotation-flow");
  const fieldObjectId = vectorFieldRuntimeObjectId("complex-rotation-field", 8);
  const streamLineObjectId = streamLineRuntimeObjectId("complex-rotation-streamlines", 3);
  const runtimeState = buildMathSceneRuntimeState(spec, 5.2);
  const snapshot = buildMathSceneEvidenceSnapshot({
    reducedMotion: false,
    runtimeState,
    scene: runtimeState.sourceScene
  });

  assert.ok(runtimeState.objectGraph.byId[generatedIds.pathId]);
  assert.ok(runtimeState.objectGraph.byId[generatedIds.currentStateId]);
  assert.ok(runtimeState.objectGraph.byId[generatedIds.traceId]);
  assert.ok(runtimeState.objectGraph.byId[fieldObjectId]);
  assert.ok(runtimeState.objectGraph.byId[streamLineObjectId]);
  assert.equal(runtimeState.objectGraph.byId[generatedIds.pathId].conceptId, "rotation-orbit");
  assert.equal(runtimeState.objectGraph.byId[fieldObjectId].conceptId, "rotation-orbit");
  assert.equal(runtimeState.objectGraph.byId[fieldObjectId].type, "vector");
  assert.equal(runtimeState.objectGraph.byId[streamLineObjectId].conceptId, "rotation-orbit");
  assert.equal(runtimeState.objectGraph.byId[streamLineObjectId].type, "parametricCurve");
  assert.equal(runtimeState.objectGraph.byId[generatedIds.currentStateId].parentId, generatedIds.pathId);
  assert.equal(runtimeState.objectGraph.byId[generatedIds.traceId].parentId, generatedIds.currentStateId);
  const trajectoryPath = runtimeState.objectGraph.byId[generatedIds.pathId].renderState;
  assert.equal(trajectoryPath.kind, "polyline");
  if (trajectoryPath.kind !== "polyline") throw new Error("expected generated ODE path polyline");
  assert.ok(trajectoryPath.points[0][1] >= spec.coordinateSpace.worldRange.y[0]);
  assert.ok(trajectoryPath.points[0][1] <= spec.coordinateSpace.worldRange.y[1]);
  assert.equal(snapshot.odeTrajectoryCount, 1);
  assert.equal(snapshot.odeTrajectoryStoppedCount, 0);
  assert.equal(snapshot.streamLineSetCount, 1);
  assert.equal(snapshot.streamLineCount, 4);
  assert.equal(snapshot.streamLinePointCount, 76);
  assert.equal(snapshot.mathObjectCount, 22);
  assert.match(snapshot.sceneRenderableIds, new RegExp(generatedIds.pathId));
  assert.match(snapshot.sceneRenderableIds, new RegExp(generatedIds.currentStateId));
  assert.match(snapshot.sceneRenderableIds, new RegExp(fieldObjectId));
  assert.match(snapshot.sceneRenderableIds, new RegExp(streamLineObjectId));
  assert.match(snapshot.odeTrajectorySummary, /ids=complex-rotation-flow/);
  assert.match(snapshot.streamLineSummary, /ids=complex-rotation-streamlines/);
});

test("builds a deterministic trig unit-wave scene spec with synchronized projection teaching aids", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#38bdf8",
    state: {
      comparison: 7,
      depthValue: 1.8,
      familyId: "three-trig-unit-wave",
      mode: 1,
      primaryValue: 6.8,
      secondaryValue: 7.25,
      stateSummary: "family=three-trig-unit-wave;template=trig-unit-wave;value=6.800;comparison=7.250;depth=1.800",
      templateId: "trig-unit-wave",
      value: 6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-trig-unit-wave");
  assert.equal(spec?.familyId, "three-trig-unit-wave");
  assert.equal(spec?.objects.length, 18);
  assert.equal(spec?.timeline.length, 20);
  assert.equal(spec?.cameraShots.length, 1);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("trig unit-wave curves use CoordinateSystem3D graph and parametric helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const trigSource = source.slice(
    source.indexOf("export function buildTrigUnitWaveMathSceneSpec"),
    source.indexOf("function calculusCurveValue")
  );

  assert.match(trigSource, /createCoordinateSystem3D/);
  assert.match(trigSource, /id:\s*"unit-circle"/);
  assert.match(trigSource, /id:\s*"sine-wave"/);
  assert.equal((trigSource.match(/buildParametricCurveObject/g) ?? []).length, 1);
  assert.equal((trigSource.match(/buildGraphCurveObject/g) ?? []).length, 1);
  assert.match(trigSource, /displaySampleCount:\s*72/);
  assert.match(trigSource, /displaySampleCount:\s*84/);
  assert.doesNotMatch(trigSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic calculus rate and area scene spec with tangent bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#fb7185",
    state: {
      comparison: 5.5,
      depthValue: 2,
      familyId: "three-calculus-rate-area",
      mode: 2,
      primaryValue: 7.6,
      secondaryValue: 6,
      stateSummary: "family=three-calculus-rate-area;template=calculus-rate-area;value=7.600;comparison=6.000;depth=2.000",
      templateId: "calculus-rate-area",
      value: 6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-calculus-rate-area");
  assert.equal(spec?.familyId, "three-calculus-rate-area");
  assert.equal(spec?.objects.length, 6);
  assert.equal(spec?.timeline.length, 7);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("calculus rate-area curves use CoordinateSystem3D graph helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const calculusSource = source.slice(
    source.indexOf("export function buildCalculusRateAreaMathSceneSpec"),
    source.indexOf("function vectorConicScale")
  );

  assert.match(calculusSource, /createCoordinateSystem3D/);
  assert.match(calculusSource, /id:\s*"rate-curve"/);
  assert.match(calculusSource, /id:\s*"area-accumulation"/);
  assert.equal((calculusSource.match(/buildGraphCurveObject/g) ?? []).length, 2);
  assert.match(calculusSource, /displaySampleCount:\s*80/);
  assert.match(calculusSource, /displaySampleCount:\s*54/);
  assert.doesNotMatch(calculusSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic vector conic strategy scene spec with synthesis bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#34d399",
    state: {
      comparison: 7.5,
      depthValue: 2.1,
      familyId: "three-vector-conic-strategy",
      mode: 2,
      primaryValue: 8,
      secondaryValue: 7.5,
      stateSummary: "family=three-vector-conic-strategy;template=vector-conic-3d/strategy-map;value=8.000;comparison=7.500;depth=2.100",
      templateId: "vector-conic-3d/strategy-map",
      value: 8
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-vector-conic-strategy");
  assert.equal(spec?.familyId, "three-vector-conic-strategy");
  assert.equal(spec?.objects.length, 7);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("vector conic strategy curves use CoordinateSystem3D parametric helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const vectorConicSource = source.slice(
    source.indexOf("export function buildVectorConicStrategyMathSceneSpec"),
    source.indexOf("function spacePlaneTilt")
  );

  assert.match(vectorConicSource, /createCoordinateSystem3D/);
  assert.match(vectorConicSource, /id:\s*"conic-locus"/);
  assert.match(vectorConicSource, /id:\s*"strategy-path"/);
  assert.equal((vectorConicSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(vectorConicSource, /displaySampleCount:\s*80/);
  assert.match(vectorConicSource, /displaySampleCount:\s*64/);
  assert.doesNotMatch(vectorConicSource, /sampleParametricCurve|resampleCurveByArcLength/);
});

test("builds a deterministic space vectors lines planes scene spec with plane bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#38bdf8",
    state: {
      comparison: 6.75,
      depthValue: 2.4,
      familyId: "three-space-vectors-lines-planes",
      mode: 1,
      primaryValue: 8.4,
      secondaryValue: 6.75,
      stateSummary: "family=three-space-vectors-lines-planes;template=vector-conic-3d/strategy-map;value=8.400;comparison=6.750;depth=2.400",
      templateId: "vector-conic-3d/strategy-map",
      value: 8.4
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-space-vectors-lines-planes");
  assert.equal(spec?.familyId, "three-space-vectors-lines-planes");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  const planeSurface = spec?.objects.find((object) => object.id === "plane-surface");
  assert.ok(planeSurface);
  assert.equal(planeSurface.type, "parametricSurface");
  if (planeSurface.type !== "parametricSurface") throw new Error("expected plane surface");
  assert.equal(planeSurface.samples.length, 5);
  assert.equal(planeSurface.samples[0].length, 5);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "plane-token")?.objectId, "plane-surface");
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("space vectors lines planes use CoordinateSystem3D curve and surface helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const spaceVectorSource = source.slice(
    source.indexOf("export function buildSpaceVectorsLinesPlanesMathSceneSpec"),
    source.indexOf("function conicSectionScale")
  );

  assert.match(spaceVectorSource, /createCoordinateSystem3D/);
  assert.match(spaceVectorSource, /id:\s*"plane-boundary"/);
  assert.match(spaceVectorSource, /id:\s*"space-line"/);
  assert.match(spaceVectorSource, /id:\s*"plane-surface"/);
  assert.equal((spaceVectorSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.equal((spaceVectorSource.match(/buildParametricSurfaceObject/g) ?? []).length, 1);
  assert.match(spaceVectorSource, /displaySampleCount:\s*72/);
  assert.match(spaceVectorSource, /displaySampleCount:\s*56/);
  assert.doesNotMatch(spaceVectorSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic conic sections deep scene spec with slice bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#facc15",
    state: {
      comparison: 7.2,
      depthValue: 2.5,
      familyId: "three-conic-sections-deep",
      mode: 2,
      primaryValue: 8.8,
      secondaryValue: 7.2,
      stateSummary: "family=three-conic-sections-deep;template=vector-conic-3d/strategy-map;value=8.800;comparison=7.200;depth=2.500",
      templateId: "vector-conic-3d/strategy-map",
      value: 8.8
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-conic-sections-deep");
  assert.equal(spec?.familyId, "three-conic-sections-deep");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("conic sections deep curves use CoordinateSystem3D parametric helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const conicDeepSource = source.slice(
    source.indexOf("export function buildConicSectionsDeepMathSceneSpec"),
    source.indexOf("function optimizationCurvature")
  );

  assert.match(conicDeepSource, /createCoordinateSystem3D/);
  assert.match(conicDeepSource, /id:\s*"upper-cone-rim"/);
  assert.match(conicDeepSource, /id:\s*"lower-cone-rim"/);
  assert.match(conicDeepSource, /id:\s*"slicing-plane"/);
  assert.match(conicDeepSource, /id:\s*"conic-section-locus"/);
  assert.equal((conicDeepSource.match(/buildParametricCurveObject/g) ?? []).length, 4);
  assert.match(conicDeepSource, /displaySampleCount:\s*60/);
  assert.match(conicDeepSource, /displaySampleCount:\s*44/);
  assert.match(conicDeepSource, /displaySampleCount:\s*80/);
  assert.doesNotMatch(conicDeepSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic optimization modeling scene spec with extrema bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#fb7185",
    state: {
      comparison: 6.4,
      depthValue: 2.2,
      familyId: "three-optimization-modeling",
      mode: 1,
      primaryValue: 8.6,
      secondaryValue: 6.4,
      stateSummary: "family=three-optimization-modeling;template=calculus-rate-area;value=8.600;comparison=6.400;depth=2.200",
      templateId: "calculus-rate-area",
      value: 8.6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-optimization-modeling");
  assert.equal(spec?.familyId, "three-optimization-modeling");
  assert.equal(spec?.objects.length, 9);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  const objectiveSurface = spec?.objects.find((object) => object.id === "objective-surface");
  assert.ok(objectiveSurface);
  assert.equal(objectiveSurface.type, "parametricSurface");
  if (objectiveSurface.type !== "parametricSurface") throw new Error("expected objective surface");
  assert.equal(objectiveSurface.samples.length, 7);
  assert.equal(objectiveSurface.samples[0].length, 7);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "objective-token")?.objectId, "objective-surface");
  assert.deepEqual(spec?.timeline[0], { type: "revealSurface", objectId: "objective-surface", duration: 2, easing: "smooth" });
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("optimization modeling curves and surface use CoordinateSystem3D helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const optimizationSource = source.slice(
    source.indexOf("export function buildOptimizationModelingMathSceneSpec"),
    source.indexOf("function probabilitySuccessRate")
  );

  assert.match(optimizationSource, /createCoordinateSystem3D/);
  assert.match(optimizationSource, /id:\s*"objective-surface"/);
  assert.match(optimizationSource, /id:\s*"objective-ridge"/);
  assert.match(optimizationSource, /id:\s*"constraint-curve"/);
  assert.match(optimizationSource, /id:\s*"level-set-contour"/);
  assert.match(optimizationSource, /id:\s*"descent-path"/);
  assert.equal((optimizationSource.match(/buildParametricCurveObject/g) ?? []).length, 4);
  assert.equal((optimizationSource.match(/buildParametricSurfaceObject/g) ?? []).length, 1);
  assert.match(optimizationSource, /displaySampleCount:\s*80/);
  assert.match(optimizationSource, /displaySampleCount:\s*48/);
  assert.equal((optimizationSource.match(/displaySampleCount:\s*64/g) ?? []).length, 2);
  assert.doesNotMatch(optimizationSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic probability machine scene spec with trial bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#38bdf8",
    state: {
      comparison: 5.8,
      depthValue: 1.8,
      familyId: "three-probability-machine",
      mode: 2,
      primaryValue: 6.6,
      secondaryValue: 5.8,
      stateSummary: "family=three-probability-machine;template=probability-simulation;value=6.600;comparison=5.800;depth=1.800",
      templateId: "probability-simulation",
      value: 6.6
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-probability-machine");
  assert.equal(spec?.familyId, "three-probability-machine");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("probability machine curves use CoordinateSystem3D parametric helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const probabilitySource = source.slice(
    source.indexOf("export function buildProbabilityMachineMathSceneSpec"),
    source.indexOf("function statisticsCenter")
  );

  assert.match(probabilitySource, /createCoordinateSystem3D/);
  assert.match(probabilitySource, /id:\s*"theoretical-distribution"/);
  assert.match(probabilitySource, /id:\s*"experimental-distribution"/);
  assert.match(probabilitySource, /id:\s*"trial-stream"/);
  assert.equal((probabilitySource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(probabilitySource, /displaySampleCount:\s*76/);
  assert.match(probabilitySource, /displaySampleCount:\s*60/);
  assert.match(probabilitySource, /displaySampleCount:\s*56/);
  assert.doesNotMatch(probabilitySource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic statistics distribution scene spec with center-spread bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#a78bfa",
    state: {
      comparison: 6.2,
      depthValue: 1.9,
      familyId: "three-statistics-distribution",
      mode: 1,
      primaryValue: 7.1,
      secondaryValue: 6.2,
      stateSummary: "family=three-statistics-distribution;template=statistics-distribution;value=7.100;comparison=6.200;depth=1.900",
      templateId: "statistics-distribution",
      value: 7.1
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-statistics-distribution");
  assert.equal(spec?.familyId, "three-statistics-distribution");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("statistics distribution curves use CoordinateSystem3D parametric helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const statisticsSource = source.slice(
    source.indexOf("export function buildStatisticsDistributionMathSceneSpec"),
    source.indexOf("function formulaForStatisticalInference")
  );

  assert.match(statisticsSource, /createCoordinateSystem3D/);
  assert.match(statisticsSource, /id:\s*"dot-distribution"/);
  assert.match(statisticsSource, /id:\s*"histogram-ridge"/);
  assert.match(statisticsSource, /id:\s*"normal-model-curve"/);
  assert.equal((statisticsSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(statisticsSource, /displaySampleCount:\s*62/);
  assert.match(statisticsSource, /displaySampleCount:\s*64/);
  assert.match(statisticsSource, /displaySampleCount:\s*76/);
  assert.doesNotMatch(statisticsSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic statistical inference scene spec with interval bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#34d399",
    state: {
      comparison: 6.8,
      depthValue: 2.1,
      familyId: "three-statistical-inference-lab",
      mode: 2,
      primaryValue: 7.4,
      secondaryValue: 6.8,
      stateSummary: "family=three-statistical-inference-lab;template=statistics-distribution;value=7.400;comparison=6.800;depth=2.100",
      templateId: "statistics-distribution",
      value: 7.4
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-statistical-inference-lab");
  assert.equal(spec?.familyId, "three-statistical-inference-lab");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("statistical inference curves use CoordinateSystem3D parametric helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const inferenceSource = source.slice(
    source.indexOf("export function buildStatisticalInferenceLabMathSceneSpec"),
    source.indexOf("function formulaForSolidNetsFolding")
  );

  assert.match(inferenceSource, /createCoordinateSystem3D/);
  assert.match(inferenceSource, /id:\s*"sampling-distribution"/);
  assert.match(inferenceSource, /id:\s*"null-model-curve"/);
  assert.match(inferenceSource, /id:\s*"confidence-band"/);
  assert.equal((inferenceSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.equal((inferenceSource.match(/displaySampleCount:\s*76/g) ?? []).length, 2);
  assert.match(inferenceSource, /displaySampleCount:\s*36/);
  assert.doesNotMatch(inferenceSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic solid nets folding scene spec with surface bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#f97316",
    state: {
      comparison: 6.4,
      depthValue: 2.2,
      familyId: "three-solid-nets-folding",
      mode: 1,
      primaryValue: 7.8,
      secondaryValue: 6.4,
      stateSummary: "family=three-solid-nets-folding;template=angle-geometry;value=7.800;comparison=6.400;depth=2.200",
      templateId: "angle-geometry",
      value: 7.8
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-solid-nets-folding");
  assert.equal(spec?.familyId, "three-solid-nets-folding");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  const netSurface = spec?.objects.find((object) => object.id === "net-layout-surface");
  const foldedSurface = spec?.objects.find((object) => object.id === "folded-face-surface");
  assert.ok(netSurface);
  assert.ok(foldedSurface);
  assert.equal(netSurface.type, "parametricSurface");
  assert.equal(foldedSurface.type, "parametricSurface");
  if (netSurface.type !== "parametricSurface") throw new Error("expected net surface");
  if (foldedSurface.type !== "parametricSurface") throw new Error("expected folded surface");
  assert.equal(netSurface.samples.length, 4);
  assert.equal(netSurface.samples[0].length, 4);
  assert.equal(foldedSurface.samples.length, 4);
  assert.equal(foldedSurface.samples[0].length, 4);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "net-token")?.objectId, "net-layout-surface");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "angle-token")?.objectId, "fold-angle-vector");
  assert.deepEqual(spec?.timeline.slice(0, 2), [
    { type: "revealSurface", objectId: "net-layout-surface", duration: 1.4, easing: "smooth" },
    { type: "revealSurface", objectId: "folded-face-surface", duration: 1.4, easing: "smooth" }
  ]);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("solid nets folding uses CoordinateSystem3D curve and surface helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const solidNetSource = source.slice(
    source.indexOf("export function buildSolidNetsFoldingMathSceneSpec"),
    source.indexOf("function crossSectionRadius")
  );

  assert.match(solidNetSource, /createCoordinateSystem3D/);
  assert.match(solidNetSource, /id:\s*"net-layout-surface"/);
  assert.match(solidNetSource, /id:\s*"folded-face-surface"/);
  assert.match(solidNetSource, /id:\s*"hinge-curve"/);
  assert.match(solidNetSource, /id:\s*"fold-path-curve"/);
  assert.equal((solidNetSource.match(/buildParametricSurfaceObject/g) ?? []).length, 2);
  assert.equal((solidNetSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(solidNetSource, /displaySampleCount:\s*24/);
  assert.match(solidNetSource, /displaySampleCount:\s*44/);
  assert.doesNotMatch(solidNetSource, /sampleSurfaceGrid|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic projection views scene spec for PEP junior spatial imagination", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#34d399",
    state: {
      comparison: 6.6,
      depthValue: 2.1,
      familyId: "three-projection-views" as never,
      mode: 1,
      primaryValue: 7.4,
      secondaryValue: 6.6,
      stateSummary: "family=three-projection-views;template=right-triangle-pythagorean;value=7.400;comparison=6.600;depth=2.100",
      templateId: "right-triangle-pythagorean",
      value: 7.4
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-projection-views");
  assert.equal(spec?.familyId, "three-projection-views");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);

  const solidSurface = spec?.objects.find((object) => object.id === "projection-solid-surface");
  const frontView = spec?.objects.find((object) => object.id === "front-view-outline");
  const topView = spec?.objects.find((object) => object.id === "top-view-outline");
  const sideView = spec?.objects.find((object) => object.id === "side-view-outline");

  assert.ok(solidSurface);
  assert.ok(frontView);
  assert.ok(topView);
  assert.ok(sideView);
  assert.equal(solidSurface.type, "parametricSurface");
  assert.equal(frontView.type, "parametricCurve");
  assert.equal(topView.type, "parametricCurve");
  assert.equal(sideView.type, "parametricCurve");
  if (solidSurface.type !== "parametricSurface") throw new Error("expected projection solid surface");
  assert.equal(solidSurface.samples.length, 5);
  assert.equal(solidSurface.samples[0].length, 5);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "solid-token")?.objectId, "projection-solid-surface");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "front-token")?.objectId, "front-view-outline");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "top-token")?.objectId, "top-view-outline");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "side-token")?.objectId, "side-view-outline");
  assert.match(spec!.formulas[0].latex, /front/);
  assert.match(spec!.formulas[0].latex, /top/);
  assert.match(spec!.formulas[0].latex, /side/);
  assert.deepEqual(spec?.timeline.slice(0, 3), [
    { type: "revealSurface", objectId: "projection-solid-surface", duration: 1.5, easing: "smooth" },
    { type: "revealCurve", objectId: "front-view-outline", duration: 1.1, easing: "smooth" },
    { type: "revealCurve", objectId: "top-view-outline", duration: 1.1, easing: "smooth" }
  ]);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("projection views use CoordinateSystem3D surface and curve helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const projectionSource = source.slice(
    source.indexOf("function buildProjectionViewsMathSceneSpec"),
    source.indexOf("export function buildSolidNetsFoldingMathSceneSpec")
  );

  assert.match(projectionSource, /createCoordinateSystem3D/);
  assert.match(projectionSource, /id:\s*"projection-solid-surface"/);
  assert.match(projectionSource, /id:\s*"front-view-outline"/);
  assert.match(projectionSource, /id:\s*"top-view-outline"/);
  assert.match(projectionSource, /id:\s*"side-view-outline"/);
  assert.equal((projectionSource.match(/buildParametricSurfaceObject/g) ?? []).length, 1);
  assert.equal((projectionSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.equal((projectionSource.match(/displaySampleCount:\s*48/g) ?? []).length, 3);
  assert.doesNotMatch(projectionSource, /sampleSurfaceGrid|projectionViewRectanglePath|sampledPath|mapMathPointToWorld/);
});

test("builds a deterministic cross-section slicer scene spec with slice bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#38bdf8",
    state: {
      comparison: 6.9,
      depthValue: 2.3,
      familyId: "three-cross-section-slicer",
      mode: 2,
      primaryValue: 8.1,
      secondaryValue: 6.9,
      stateSummary: "family=three-cross-section-slicer;template=angle-geometry;value=8.100;comparison=6.900;depth=2.300",
      templateId: "angle-geometry",
      value: 8.1
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-cross-section-slicer");
  assert.equal(spec?.familyId, "three-cross-section-slicer");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  const solidSurface = spec?.objects.find((object) => object.id === "solid-surface");
  const slicingPlane = spec?.objects.find((object) => object.id === "slicing-plane-surface");
  assert.ok(solidSurface);
  assert.ok(slicingPlane);
  assert.equal(solidSurface.type, "parametricSurface");
  assert.equal(slicingPlane.type, "parametricSurface");
  if (solidSurface.type !== "parametricSurface") throw new Error("expected solid surface");
  if (slicingPlane.type !== "parametricSurface") throw new Error("expected slicing plane surface");
  assert.equal(solidSurface.samples.length, 6);
  assert.equal(solidSurface.samples[0].length, 8);
  assert.equal(slicingPlane.samples.length, 4);
  assert.equal(slicingPlane.samples[0].length, 4);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "solid-token")?.objectId, "solid-surface");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "slice-token")?.objectId, "slicing-plane-surface");
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("cross-section slicer uses CoordinateSystem3D curve and surface helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const crossSectionSource = source.slice(
    source.indexOf("export function buildCrossSectionSlicerMathSceneSpec"),
    source.indexOf("function crosswalkAlignment")
  );

  assert.match(crossSectionSource, /createCoordinateSystem3D/);
  assert.match(crossSectionSource, /id:\s*"solid-surface"/);
  assert.match(crossSectionSource, /id:\s*"slicing-plane-surface"/);
  assert.match(crossSectionSource, /id:\s*"cross-section-curve"/);
  assert.match(crossSectionSource, /id:\s*"scan-path-curve"/);
  assert.equal((crossSectionSource.match(/buildParametricSurfaceObject/g) ?? []).length, 2);
  assert.equal((crossSectionSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(crossSectionSource, /displaySampleCount:\s*64/);
  assert.match(crossSectionSource, /displaySampleCount:\s*48/);
  assert.doesNotMatch(crossSectionSource, /sampleSurfaceGrid|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic curriculum crosswalk scene spec with pathway bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 7.1,
      depthValue: 2.4,
      familyId: "three-curriculum-crosswalk-map",
      mode: 1,
      primaryValue: 8.2,
      secondaryValue: 7.1,
      stateSummary: "family=three-curriculum-crosswalk-map;template=vector-conic-3d/strategy-map;value=8.200;comparison=7.100;depth=2.400",
      templateId: "vector-conic-3d/strategy-map",
      value: 8.2
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-curriculum-crosswalk-map");
  assert.equal(spec?.familyId, "three-curriculum-crosswalk-map");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  const mapSurface = spec?.objects.find((object) => object.id === "curriculum-map-surface");
  assert.ok(mapSurface);
  assert.equal(mapSurface.type, "parametricSurface");
  if (mapSurface.type !== "parametricSurface") throw new Error("expected curriculum map surface");
  assert.equal(mapSurface.samples.length, 5);
  assert.equal(mapSurface.samples[0].length, 6);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "map-token")?.objectId, "curriculum-map-surface");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "bridge-token")?.objectId, "topic-bridge-path");
  assert.deepEqual(spec?.timeline[0], { type: "revealSurface", objectId: "curriculum-map-surface", duration: 1.8, easing: "smooth" });
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("curriculum crosswalk map uses CoordinateSystem3D curve and surface helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const crosswalkSource = source.slice(
    source.indexOf("export function buildCurriculumCrosswalkMapMathSceneSpec"),
    source.indexOf("function examStrategyScoreLift")
  );

  assert.match(crosswalkSource, /createCoordinateSystem3D/);
  assert.match(crosswalkSource, /id:\s*"curriculum-map-surface"/);
  assert.match(crosswalkSource, /id:\s*"hong-kong-topic-path"/);
  assert.match(crosswalkSource, /id:\s*"mainland-topic-path"/);
  assert.match(crosswalkSource, /id:\s*"topic-bridge-path"/);
  assert.equal((crosswalkSource.match(/buildParametricSurfaceObject/g) ?? []).length, 1);
  assert.equal((crosswalkSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.equal((crosswalkSource.match(/displaySampleCount:\s*52/g) ?? []).length, 2);
  assert.match(crosswalkSource, /displaySampleCount:\s*60/);
  assert.doesNotMatch(crosswalkSource, /sampleSurfaceGrid|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic exam strategy capstone scene spec with strategy bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#fb7185",
    state: {
      comparison: 7.4,
      depthValue: 2.5,
      familyId: "three-exam-strategy-capstone",
      mode: 2,
      primaryValue: 8.5,
      secondaryValue: 7.4,
      stateSummary: "family=three-exam-strategy-capstone;template=vector-conic-3d/strategy-map;value=8.500;comparison=7.400;depth=2.500",
      templateId: "vector-conic-3d/strategy-map",
      value: 8.5
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-exam-strategy-capstone");
  assert.equal(spec?.familyId, "three-exam-strategy-capstone");
  assert.equal(spec?.objects.length, 8);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  const strategySurface = spec?.objects.find((object) => object.id === "strategy-landscape-surface");
  assert.ok(strategySurface);
  assert.equal(strategySurface.type, "parametricSurface");
  if (strategySurface.type !== "parametricSurface") throw new Error("expected strategy surface");
  assert.equal(strategySurface.samples.length, 6);
  assert.equal(strategySurface.samples[0].length, 6);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "score-token")?.objectId, "score-vector");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "time-token")?.objectId, "time-allocation-path");
  assert.deepEqual(spec?.timeline[0], { type: "revealSurface", objectId: "strategy-landscape-surface", duration: 1.8, easing: "smooth" });
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("exam strategy capstone uses CoordinateSystem3D curve and surface helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const examStrategySource = source.slice(
    source.indexOf("export function buildExamStrategyCapstoneMathSceneSpec"),
    source.indexOf("function numberLinePoint")
  );

  assert.match(examStrategySource, /createCoordinateSystem3D/);
  assert.match(examStrategySource, /id:\s*"strategy-landscape-surface"/);
  assert.match(examStrategySource, /id:\s*"time-allocation-path"/);
  assert.match(examStrategySource, /id:\s*"strategy-frontier-path"/);
  assert.equal((examStrategySource.match(/buildParametricSurfaceObject/g) ?? []).length, 1);
  assert.equal((examStrategySource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(examStrategySource, /displaySampleCount:\s*60/);
  assert.match(examStrategySource, /displaySampleCount:\s*64/);
  assert.doesNotMatch(examStrategySource, /sampleSurfaceGrid|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic number line scene spec with value bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#38bdf8",
    state: {
      comparison: 5.2,
      depthValue: 1.2,
      familyId: "three-number-line",
      mode: 1,
      primaryValue: 6.4,
      secondaryValue: 5.2,
      stateSummary: "family=three-number-line;template=number-line;value=6.400;comparison=5.200;depth=1.200",
      templateId: "number-line",
      value: 6.4
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-number-line");
  assert.equal(spec?.familyId, "three-number-line");
  assert.equal(spec?.objects.length, 7);
  assert.equal(spec?.timeline.length, 7);
  assert.equal(spec?.cameraShots.length, 2);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "unit-token")?.objectId, "number-rail");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "point-token")?.objectId, "number-probe");
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("number line uses CoordinateSystem3D curve helpers for rail, unit hops, and jumps", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const numberLineSource = source.slice(
    source.indexOf("export function buildNumberLineMathSceneSpec"),
    source.indexOf("function measurementUnits")
  );

  assert.match(numberLineSource, /createCoordinateSystem3D/);
  assert.match(numberLineSource, /id:\s*"number-rail"/);
  assert.match(numberLineSource, /id:\s*"unit-hop-path"/);
  assert.match(numberLineSource, /id:\s*"number-jump-path"/);
  assert.equal((numberLineSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(numberLineSource, /displaySampleCount:\s*64/);
  assert.match(numberLineSource, /displaySampleCount:\s*54/);
  assert.match(numberLineSource, /displaySampleCount:\s*48/);
  assert.doesNotMatch(numberLineSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("builds a deterministic measurement scale scene spec with unit bindings", () => {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#facc15",
    state: {
      comparison: 6.1,
      depthValue: 1.4,
      familyId: "three-measurement-scale",
      mode: 2,
      primaryValue: 7.2,
      secondaryValue: 6.1,
      stateSummary: "family=three-measurement-scale;template=measurement-scale;value=7.200;comparison=6.100;depth=1.400",
      templateId: "measurement-scale",
      value: 7.2
    }
  });

  assert.ok(spec);
  assert.equal(spec?.sceneId, "mais-manim-measurement-scale");
  assert.equal(spec?.familyId, "three-measurement-scale");
  assert.equal(spec?.objects.length, 7);
  assert.equal(spec?.timeline.length, 7);
  assert.equal(spec?.cameraShots.length, 2);
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "unit-token")?.objectId, "scale-rail");
  assert.equal(spec?.bindings.find((binding) => binding.tokenId === "measure-token")?.objectId, "measurement-vector");
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assertFormulaSummary(spec!);
});

test("measurement scale uses CoordinateSystem3D curve helpers for rail, ticks, and sweep", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const measurementSource = source.slice(
    source.indexOf("export function buildMeasurementScaleMathSceneSpec"),
    source.indexOf("function standardCoordinateSpace")
  );

  assert.match(measurementSource, /createCoordinateSystem3D/);
  assert.match(measurementSource, /id:\s*"scale-rail"/);
  assert.match(measurementSource, /id:\s*"scale-tick-path"/);
  assert.match(measurementSource, /id:\s*"measurement-sweep-path"/);
  assert.equal((measurementSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(measurementSource, /displaySampleCount:\s*64/);
  assert.match(measurementSource, /displaySampleCount:\s*54/);
  assert.match(measurementSource, /displaySampleCount:\s*48/);
  assert.doesNotMatch(measurementSource, /sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("base-ten blocks uses CoordinateSystem3D curve helpers for place-value paths", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const baseTenSource = source.slice(
    source.indexOf("function buildBaseTenBlocksMathSceneSpec"),
    source.indexOf("function formulaForArrayAreaBlocks")
  );

  assert.match(baseTenSource, /createCoordinateSystem3D/);
  assert.match(baseTenSource, /id:\s*"hundreds-stack"/);
  assert.match(baseTenSource, /id:\s*"tens-rail"/);
  assert.match(baseTenSource, /id:\s*"ones-path"/);
  assert.equal((baseTenSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.equal((baseTenSource.match(/displaySampleCount:\s*48/g) ?? []).length, 2);
  assert.match(baseTenSource, /displaySampleCount:\s*44/);
  assert.doesNotMatch(baseTenSource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("array area blocks uses CoordinateSystem3D surface and curve helpers", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const arrayAreaSource = source.slice(
    source.indexOf("function buildArrayAreaBlocksMathSceneSpec"),
    source.indexOf("function formulaForFractionSlices")
  );

  assert.match(arrayAreaSource, /createCoordinateSystem3D/);
  assert.match(arrayAreaSource, /id:\s*"array-surface"/);
  assert.match(arrayAreaSource, /id:\s*"row-path"/);
  assert.match(arrayAreaSource, /id:\s*"column-path"/);
  assert.equal((arrayAreaSource.match(/buildParametricSurfaceObject/g) ?? []).length, 1);
  assert.equal((arrayAreaSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.equal((arrayAreaSource.match(/displaySampleCount:\s*42/g) ?? []).length, 2);
  assert.doesNotMatch(
    arrayAreaSource,
    /sampleSurfaceGrid|sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/
  );
});

test("fraction slices uses CoordinateSystem3D curve helpers for whole, slice, and boundary", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const fractionSource = source.slice(
    source.indexOf("function buildFractionSlicesMathSceneSpec"),
    source.indexOf("function formulaForClockMoneyData")
  );

  assert.match(fractionSource, /createCoordinateSystem3D/);
  assert.match(fractionSource, /id:\s*"fraction-circle"/);
  assert.match(fractionSource, /id:\s*"slice-path"/);
  assert.match(fractionSource, /id:\s*"slice-boundary"/);
  assert.equal((fractionSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(fractionSource, /displaySampleCount:\s*64/);
  assert.match(fractionSource, /displaySampleCount:\s*42/);
  assert.match(fractionSource, /displaySampleCount:\s*32/);
  assert.doesNotMatch(fractionSource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("clock money data uses CoordinateSystem3D curve helpers for data arc and money rail", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const clockMoneySource = source.slice(
    source.indexOf("function buildClockMoneyDataMathSceneSpec"),
    source.indexOf("function formulaForAngleGeometry")
  );

  assert.match(clockMoneySource, /createCoordinateSystem3D/);
  assert.match(clockMoneySource, /id:\s*"data-arc"/);
  assert.match(clockMoneySource, /id:\s*"money-rail"/);
  assert.equal((clockMoneySource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(clockMoneySource, /displaySampleCount:\s*56/);
  assert.match(clockMoneySource, /displaySampleCount:\s*48/);
  assert.doesNotMatch(clockMoneySource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("angle geometry uses CoordinateSystem3D curve helpers for arc and reference ray", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const angleSource = source.slice(
    source.indexOf("function buildAngleGeometryMathSceneSpec"),
    source.indexOf("function formulaForRightTrianglePythagorean")
  );

  assert.match(angleSource, /createCoordinateSystem3D/);
  assert.match(angleSource, /id:\s*"angle-arc"/);
  assert.match(angleSource, /id:\s*"base-ray"/);
  assert.equal((angleSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(angleSource, /displaySampleCount:\s*48/);
  assert.match(angleSource, /displaySampleCount:\s*36/);
  assert.doesNotMatch(angleSource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("right triangle Pythagorean uses CoordinateSystem3D curve helpers for triangle and square paths", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const triangleSource = source.slice(
    source.indexOf("function buildRightTrianglePythagoreanMathSceneSpec"),
    source.indexOf("function formulaForCoordinateTransform")
  );

  assert.match(triangleSource, /createCoordinateSystem3D/);
  assert.match(triangleSource, /id:\s*"triangle-path"/);
  assert.match(triangleSource, /id:\s*"leg-square-path"/);
  assert.equal((triangleSource.match(/buildParametricCurveObject/g) ?? []).length, 2);
  assert.match(triangleSource, /displaySampleCount:\s*60/);
  assert.match(triangleSource, /displaySampleCount:\s*36/);
  assert.doesNotMatch(triangleSource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("coordinate transform uses CoordinateSystem3D curve helpers for source, target, and transform paths", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const transformSource = source.slice(
    source.indexOf("function buildCoordinateTransformMathSceneSpec"),
    source.indexOf("function formulaForEquationBalance")
  );

  assert.match(transformSource, /createCoordinateSystem3D/);
  assert.match(transformSource, /id:\s*"source-grid"/);
  assert.match(transformSource, /id:\s*"target-grid"/);
  assert.match(transformSource, /id:\s*"transform-path"/);
  assert.equal((transformSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(transformSource, /displaySampleCount:\s*64/);
  assert.match(transformSource, /displaySampleCount:\s*56/);
  assert.match(transformSource, /displaySampleCount:\s*48/);
  assert.doesNotMatch(transformSource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

test("equation balance uses CoordinateSystem3D curve helpers for beam and pans", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathSceneRegistry.ts", "utf8");
  const balanceSource = source.slice(
    source.indexOf("function buildEquationBalanceMathSceneSpec"),
    source.indexOf("function sceneParametersFromState")
  );

  assert.match(balanceSource, /createCoordinateSystem3D/);
  assert.match(balanceSource, /id:\s*"balance-beam"/);
  assert.match(balanceSource, /id:\s*"left-pan"/);
  assert.match(balanceSource, /id:\s*"right-pan"/);
  assert.equal((balanceSource.match(/buildParametricCurveObject/g) ?? []).length, 3);
  assert.match(balanceSource, /displaySampleCount:\s*48/);
  assert.equal((balanceSource.match(/displaySampleCount:\s*40/g) ?? []).length, 2);
  assert.doesNotMatch(balanceSource, /sampledPath|sampleParametricCurve|resampleCurveByArcLength|mapMathPointToWorld/);
});

const remainingStandardFamilyContracts: Array<{
  accent: string;
  bindings: Array<{ objectId: string; tokenId: string }>;
  cameraCount: number;
  comparison: number;
  depthValue: number;
  familyId: ThreeDFamilyId;
  mode: number;
  objectCount: number;
  sceneId: string;
  templateId: VisualizationTemplateId;
  timelineCount: number;
  value: number;
}> = [
  {
    accent: "#f59e0b",
    bindings: [
      { objectId: "hundreds-stack", tokenId: "place-token" },
      { objectId: "value-probe", tokenId: "digit-token" }
    ],
    cameraCount: 2,
    comparison: 3.2,
    depthValue: 1.1,
    familyId: "three-base-ten-blocks",
    mode: 1,
    objectCount: 7,
    sceneId: "mais-manim-base-ten-blocks",
    templateId: "base-ten",
    timelineCount: 7,
    value: 6.8
  },
  {
    accent: "#22c55e",
    bindings: [
      { objectId: "array-surface", tokenId: "area-token" },
      { objectId: "factor-vector", tokenId: "factor-token" }
    ],
    cameraCount: 2,
    comparison: 4.4,
    depthValue: 1.3,
    familyId: "three-array-area-blocks",
    mode: 2,
    objectCount: 7,
    sceneId: "mais-manim-array-area-blocks",
    templateId: "array-area",
    timelineCount: 7,
    value: 5.6
  },
  {
    accent: "#fb7185",
    bindings: [
      { objectId: "fraction-circle", tokenId: "whole-token" },
      { objectId: "slice-probe", tokenId: "part-token" }
    ],
    cameraCount: 2,
    comparison: 5.5,
    depthValue: 1.2,
    familyId: "three-fraction-slices",
    mode: 1,
    objectCount: 7,
    sceneId: "mais-manim-fraction-slices",
    templateId: "fraction-bar",
    timelineCount: 7,
    value: 4.2
  },
  {
    accent: "#38bdf8",
    bindings: [
      { objectId: "data-arc", tokenId: "data-token" },
      { objectId: "value-vector", tokenId: "value-token" }
    ],
    cameraCount: 2,
    comparison: 7.1,
    depthValue: 1.5,
    familyId: "three-clock-money-data",
    mode: 0,
    objectCount: 7,
    sceneId: "mais-manim-clock-money-data",
    templateId: "clock-money-data",
    timelineCount: 7,
    value: 6.3
  },
  {
    accent: "#a78bfa",
    bindings: [
      { objectId: "angle-arc", tokenId: "angle-token" },
      { objectId: "rotating-ray", tokenId: "ray-token" }
    ],
    cameraCount: 2,
    comparison: 5.8,
    depthValue: 1.4,
    familyId: "three-angle-geometry",
    mode: 1,
    objectCount: 7,
    sceneId: "mais-manim-angle-geometry",
    templateId: "angle-geometry",
    timelineCount: 7,
    value: 7
  },
  {
    accent: "#14b8a6",
    bindings: [
      { objectId: "hypotenuse-vector", tokenId: "hypotenuse-token" },
      { objectId: "leg-square-path", tokenId: "square-token" }
    ],
    cameraCount: 2,
    comparison: 4.8,
    depthValue: 1.6,
    familyId: "three-right-triangle-pythagorean",
    mode: 2,
    objectCount: 7,
    sceneId: "mais-manim-right-triangle-pythagorean",
    templateId: "right-triangle-pythagorean",
    timelineCount: 7,
    value: 6.5
  },
  {
    accent: "#60a5fa",
    bindings: [
      { objectId: "source-grid", tokenId: "grid-token" },
      { objectId: "transform-probe", tokenId: "point-token" }
    ],
    cameraCount: 2,
    comparison: 6.6,
    depthValue: 1.8,
    familyId: "three-coordinate-transform",
    mode: 1,
    objectCount: 8,
    sceneId: "mais-manim-coordinate-transform",
    templateId: "coordinate-transform",
    timelineCount: 8,
    value: 5.9
  },
  {
    accent: "#facc15",
    bindings: [
      { objectId: "balance-beam", tokenId: "balance-token" },
      { objectId: "balance-probe", tokenId: "equation-token" }
    ],
    cameraCount: 2,
    comparison: 5.4,
    depthValue: 1.5,
    familyId: "three-equation-balance",
    mode: 2,
    objectCount: 7,
    sceneId: "mais-manim-equation-balance",
    templateId: "equation-balance",
    timelineCount: 7,
    value: 6.2
  }
];

for (const contract of remainingStandardFamilyContracts) {
  test(`builds a deterministic ${contract.familyId} scene spec with semantic bindings`, () => {
    const spec = buildMathSceneSpecForThreeDFamily({
      accent: contract.accent,
      state: {
        comparison: contract.comparison,
        depthValue: contract.depthValue,
        familyId: contract.familyId,
        mode: contract.mode,
        primaryValue: contract.value,
        secondaryValue: contract.comparison,
        stateSummary: `family=${contract.familyId};template=${contract.templateId};value=${contract.value.toFixed(3)};comparison=${contract.comparison.toFixed(3)};depth=${contract.depthValue.toFixed(3)}`,
        templateId: contract.templateId,
        value: contract.value
      }
    });

    assert.ok(spec);
    assert.equal(spec?.sceneId, contract.sceneId);
    assert.equal(spec?.familyId, contract.familyId);
    assert.equal(spec?.objects.length, contract.objectCount);
    assert.equal(spec?.timeline.length, contract.timelineCount);
    assert.equal(spec?.cameraShots.length, contract.cameraCount);
    for (const binding of contract.bindings) {
      assert.equal(spec?.bindings.find((entry) => entry.tokenId === binding.tokenId)?.objectId, binding.objectId);
    }
    assert.deepEqual(validateFormulaBindings(spec!), []);
    assertFormulaSummary(spec!);
  });
}

test("Three.js integration exposes MAIS Manim runtime diagnostics for every approved family", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/ThreeDLabSceneRegistry.tsx", "utf8");
  const renderPlanSource = fs.readFileSync("components/visualizations/three/configuredThreeDRenderPlan.ts", "utf8");
  const primitiveSource = fs.readFileSync("components/visualizations/three/scenes/TemplatePrimitiveScene.tsx", "utf8");

  assert.match(canvasSource, /data-viz-runtime=\{runtime\}/);
  assert.match(canvasSource, /evidenceDataAttributes/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-scene-id"\] \?\? runtimeDiagnostics\.sceneId/);
  assert.match(canvasSource, /manimEvidenceAttributes\?\.\["data-viz-formula-token-count"\] \?\? runtimeDiagnostics\.formulaTokenCount/);
  assert.match(canvasSource, /<MathFormulaOverlay/);
  assert.match(registrySource, /isMaisManimFamily/);
  assert.match(registrySource, /<MathSceneRuntime/);
  assert.match(renderPlanSource, /runtime: isMaisManimFamily\(familyId\) \? "mais-manim" : "primitive"/);
  assert.doesNotMatch(primitiveSource, /three-function-graph["']:\s*FunctionRibbon/);
});

test("MAIS Manim scene builders expose the CoordinateSystem3D abstraction for future graph authoring", () => {
  const coordinateSystemSource = fs.readFileSync("components/visualizations/three/manim/mathCoordinateSystem3D.ts", "utf8");

  assert.match(coordinateSystemSource, /export function createCoordinateSystem3D/);
  assert.match(coordinateSystemSource, /export function buildGraphCurveObject/);
  assert.match(coordinateSystemSource, /c2p/);
  assert.match(coordinateSystemSource, /p2c/);
  assert.match(coordinateSystemSource, /buildCurveObject/);
});

test("MAIS Manim V2 exposes pure playback and checkpoint workflow modules", () => {
  const playbackSource = fs.readFileSync("components/visualizations/three/manim/mathScenePlayback.ts", "utf8");
  const checkpointSource = fs.readFileSync("components/visualizations/three/manim/mathSceneCheckpoint.ts", "utf8");

  assert.match(playbackSource, /buildScenePlaybackPlan/);
  assert.match(playbackSource, /sampleScenePlaybackFrames/);
  assert.match(playbackSource, /prePlay/);
  assert.match(playbackSource, /postPlay/);
  assert.match(checkpointSource, /saveCheckpoint/);
  assert.match(checkpointSource, /restoreCheckpoint/);
  assert.doesNotMatch(playbackSource + checkpointSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
