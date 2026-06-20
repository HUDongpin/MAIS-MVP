import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  buildMathSceneSpecForThreeDFamily,
  isMaisManimFamily,
  maisManimFamilyIds
} from "./mathSceneRegistry";
import { summarizeFormulaBindings, validateFormulaBindings } from "./mathFormulaBindings";

test("registers MAIS Manim families for senior function labs", () => {
  assert.deepEqual(maisManimFamilyIds, [
    "three-function-graph",
    "three-function-family",
    "three-complex-plane",
    "three-trig-unit-wave",
    "three-calculus-rate-area",
    "three-vector-conic-strategy",
    "three-space-vectors-lines-planes"
  ]);
  assert.equal(isMaisManimFamily("three-function-graph"), true);
  assert.equal(isMaisManimFamily("three-function-family"), true);
  assert.equal(isMaisManimFamily("three-complex-plane"), true);
  assert.equal(isMaisManimFamily("three-trig-unit-wave"), true);
  assert.equal(isMaisManimFamily("three-calculus-rate-area"), true);
  assert.equal(isMaisManimFamily("three-vector-conic-strategy"), true);
  assert.equal(isMaisManimFamily("three-space-vectors-lines-planes"), true);
  assert.equal(isMaisManimFamily("three-conic-sections-deep"), false);
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
  assert.equal(spec?.objects.length, 4);
  assert.equal(spec?.timeline.length, 5);
  assert.equal(spec?.cameraShots.length, 2);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
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
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
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
  assert.match(spec!.formulas[0].latex, /active=\\\\ln x\\\\ vs\\\\ x\^2/);
  assert.doesNotMatch(spec!.formulas[0].latex, /undefined/);
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
  assert.equal(spec?.timeline.length, 7);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
});

test("builds a deterministic trig unit-wave scene spec with unit-circle bindings", () => {
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
  assert.equal(spec?.objects.length, 6);
  assert.equal(spec?.timeline.length, 7);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
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
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
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
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
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
  assert.equal(spec?.objects.length, 7);
  assert.equal(spec?.timeline.length, 8);
  assert.equal(spec?.cameraShots.length, 3);
  assert.deepEqual(validateFormulaBindings(spec!), []);
  assert.deepEqual(summarizeFormulaBindings(spec!), {
    bindingCount: spec?.diagnostics.expectedBindingCount,
    objectCount: spec?.diagnostics.expectedObjectCount,
    tokenCount: spec?.diagnostics.expectedTokenCount
  });
});

test("Three.js integration exposes MAIS Manim runtime diagnostics without moving primitive families", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const registrySource = fs.readFileSync("components/visualizations/three/ThreeDLabSceneRegistry.tsx", "utf8");
  const renderPlanSource = fs.readFileSync("components/visualizations/three/configuredThreeDRenderPlan.ts", "utf8");
  const primitiveSource = fs.readFileSync("components/visualizations/three/scenes/TemplatePrimitiveScene.tsx", "utf8");

  assert.match(canvasSource, /data-viz-runtime=\{runtime\}/);
  assert.match(canvasSource, /data-viz-scene-id=\{runtimeDiagnostics\.sceneId\}/);
  assert.match(canvasSource, /data-viz-formula-token-count=\{runtimeDiagnostics\.formulaTokenCount\}/);
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
