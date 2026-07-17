import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { buildCameraDirectorState, cameraShotForTimeline } from "./mathCameraDirector";
import { buildCreationPrimitiveFrame } from "./mathCreationPrimitives";
import { buildCurveObject, pointwiseBecomePartialCurveObject } from "./mathCurveObject";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import { buildVMobjectStyle } from "./mathVMobjectStyle";
import type { MathSceneSpec } from "./mathSceneTypes";

const functionGraphSpec = buildMathSceneSpecForThreeDFamily({
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

function buildFunctionGraphSpecForMode(mode: number) {
  return buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: `family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400;mode=${mode}`,
      templateId: "function-graph",
      value: 6
    }
  });
}

function elapsedAtStartOfSweepParameter(scene: MathSceneSpec) {
  let elapsed = 0;

  for (const step of scene.timeline) {
    if (step.type === "sweepParameter") return elapsed;
    elapsed += Math.max(0, step.duration);
  }

  throw new Error("expected sweepParameter step");
}

function functionCurveYSignature(scene: MathSceneSpec, elapsedSeconds: number) {
  const state = buildMathSceneRuntimeState(scene, elapsedSeconds);
  const curve = state.objectGraph.byId["function-curve"];
  if (curve.renderState.kind !== "polyline") throw new Error("expected function curve polyline");

  return curve.renderState.points.map((point) => point[1].toFixed(6)).join(",");
}

test("V2 builds a Manim-inspired object graph with trackers and updater metadata", () => {
  assert.ok(functionGraphSpec);
  const state = buildMathSceneRuntimeState(functionGraphSpec!, 3);

  assert.equal(state.sceneId, "mais-manim-function-graph");
  assert.equal(functionGraphSpec!.parameters?.some((parameter) => parameter.id === "value"), true);
  assert.deepEqual(state.objectGraph.rootIds, ["axes", "function-curve"]);
  assert.deepEqual(state.sceneGraph.topLevelIds, ["axes", "function-curve"]);
  assert.deepEqual(state.sceneGraph.renderGroups.scene, ["axes", "function-curve", "moving-probe", "probe-trace"]);
  assert.equal(state.sceneGraph.renderBatches.objectCount, state.sceneGraph.renderGroups.all.length);
  assert.equal(state.sceneGraph.renderBatches.batchCount >= 2, true);
  assert.match(state.sceneGraph.renderBatches.summary, /^renderBatches:batches=/);
  assert.deepEqual(state.sceneGraph.renderGroups.foreground, []);
  assert.equal(state.objectGraph.byId["function-curve"].conceptId, "function-rule");
  assert.equal(state.objectGraph.byId["moving-probe"].parentId, "function-curve");
  assert.equal(state.objectGraph.byId["probe-trace"].parentId, "moving-probe");
  assert.equal(state.objectGraph.byId["function-curve"].boundingBox.kind, "finite");
  assert.equal(state.trackers.byId.timeline.value, 3);
  assert.equal(state.trackers.byId["parameter:value"].source, "parameter");
  assert.equal(state.trackers.byId["parameter:value"].conceptId, "function-rule");
  assert.equal(state.trackers.byId["parameter:comparison"].source, "parameter");
  assert.ok(state.trackers.byId["parameter:value"].normalizedValue > 0);
  assert.equal(state.trackers.byId["function-curve:progress"].value, 1);
  assert.ok(state.trackers.byId["moving-probe:progress"].value > 0);
  assert.ok(state.updaters.byObjectId["moving-probe"].includes("move-along-path"));
  assert.ok(state.updaters.byObjectId["probe-trace"].includes("trace-recent-path"));
  assert.equal(state.updatePolicy.shouldUpdateMobjects, true);
  assert.equal(state.updatePolicy.reason, "has-updaters");
  assert.equal(state.updatePolicy.updaterCount, state.updaters.entries.length);
  assert.match(state.updatePolicy.summary, /^updatePolicy:update=true:capture=true:reason=has-updaters/);
  assert.equal(state.diagnostics.mathObjectCount, 4);
  assert.equal(state.diagnostics.trackerCount, Object.keys(state.trackers.byId).length);
  assert.equal(state.diagnostics.updaterCount, state.updaters.entries.length);
});

test("V2 runtime consumes scene-authored foreground and fixed-in-frame render groups", () => {
  assert.ok(functionGraphSpec);
  const groupedScene: MathSceneSpec = {
    ...functionGraphSpec,
    renderGroups: {
      fixedInFrameObjectIds: ["axes", "missing-object"],
      foregroundObjectIds: ["function-curve", "function-curve"]
    }
  };
  const state = buildMathSceneRuntimeState(groupedScene, 0);

  assert.deepEqual(state.sceneGraph.sceneIds, []);
  assert.deepEqual(state.sceneGraph.foregroundIds, ["function-curve"]);
  assert.deepEqual(state.sceneGraph.fixedInFrameIds, ["axes"]);
  assert.deepEqual(state.sceneGraph.renderGroups.scene, []);
  assert.deepEqual(state.sceneGraph.renderGroups.foreground, ["function-curve", "moving-probe", "probe-trace"]);
  assert.deepEqual(state.sceneGraph.renderGroups.fixedInFrame, ["axes"]);
  assert.equal(state.sceneGraph.summary.sceneRenderableCount, 0);
  assert.equal(state.sceneGraph.summary.foregroundCount, 3);
  assert.equal(state.sceneGraph.summary.foregroundIds, "function-curve,moving-probe,probe-trace");
  assert.equal(state.sceneGraph.summary.fixedInFrameCount, 1);
  assert.equal(state.sceneGraph.summary.fixedInFrameIds, "axes");
  assert.equal(state.sceneGraph.summary.renderGroupOverlapCount, 0);
});

test("V2 runtime redraws function curve samples from swept tracker values for every function mode", () => {
  for (const mode of [0, 1, 2]) {
    const scene = buildFunctionGraphSpecForMode(mode);
    assert.ok(scene);
    const sweepStart = elapsedAtStartOfSweepParameter(scene);
    const startSignature = functionCurveYSignature(scene, sweepStart);
    const midSignature = functionCurveYSignature(scene, sweepStart + 0.6);
    const endSignature = functionCurveYSignature(scene, sweepStart + 1.2);

    assert.notEqual(midSignature, startSignature, `mode ${mode} should redraw curve during sweep`);
    assert.notEqual(endSignature, startSignature, `mode ${mode} should redraw curve at sweep target`);
  }
});

test("V2 runtime applies Manim introducer and remover membership to render groups", () => {
  const scene: MathSceneSpec = {
    sceneId: "membership-runtime-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      {
        type: "axis3d",
        id: "axes",
        range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
      },
      {
        type: "vector",
        id: "late-vector",
        colorRole: "function",
        conceptId: "late-vector",
        from: [0, 0, 0],
        to: [1, 0, 0]
      },
      {
        type: "vector",
        id: "grow-label",
        colorRole: "attention",
        conceptId: "grow-label",
        from: [0, 0, 0],
        to: [0, 1, 0]
      },
      {
        type: "vector",
        id: "old-vector",
        colorRole: "probe",
        conceptId: "old-vector",
        from: [0, 0, 0],
        to: [0, 0, 1]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      { type: "wait", duration: 1 },
      { type: "fadeInObject", objectId: "late-vector", duration: 2, easing: "linear" },
      { type: "growFromCenter", objectId: "grow-label", duration: 1, easing: "smooth" },
      { type: "wait", duration: 1 },
      { type: "fadeOutObject", objectId: "old-vector", duration: 2, easing: "linear" }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 4, expectedTokenCount: 0 }
  };

  const beforeIntro = buildMathSceneRuntimeState(scene, 0.5);
  const duringFadeIn = buildMathSceneRuntimeState(scene, 1.5);
  const duringGrow = buildMathSceneRuntimeState(scene, 3.5);
  const duringFadeOut = buildMathSceneRuntimeState(scene, 5.5);
  const afterFadeOut = buildMathSceneRuntimeState(scene, 7);

  assert.deepEqual(beforeIntro.sceneGraph.renderGroups.scene, ["axes", "old-vector"]);
  assert.deepEqual(duringFadeIn.sceneGraph.renderGroups.scene, ["axes", "late-vector", "old-vector"]);
  assert.deepEqual(duringGrow.sceneGraph.renderGroups.scene, ["axes", "late-vector", "grow-label", "old-vector"]);
  assert.deepEqual(duringFadeOut.sceneGraph.renderGroups.scene, ["axes", "late-vector", "grow-label", "old-vector"]);
  assert.deepEqual(afterFadeOut.sceneGraph.renderGroups.scene, ["axes", "late-vector", "grow-label"]);
  assert.equal(beforeIntro.sceneGraph.summary.renderGroupIds, "axes,old-vector");
  assert.equal(afterFadeOut.sceneGraph.summary.renderGroupIds, "axes,late-vector,grow-label");
});

test("V2 runtime applies FadeIn, FadeOut, and GrowFromCenter opacity and scale frames", () => {
  const scene: MathSceneSpec = {
    sceneId: "fade-grow-runtime-frame-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      {
        type: "vector",
        id: "fade-in-vector",
        colorRole: "function",
        conceptId: "fade-in-vector",
        from: [0, 0, 0],
        to: [2, 0, 0]
      },
      {
        type: "vector",
        id: "grow-vector",
        colorRole: "attention",
        conceptId: "grow-vector",
        from: [0, 0, 0],
        to: [2, 0, 0]
      },
      {
        type: "vector",
        id: "fade-out-vector",
        colorRole: "probe",
        conceptId: "fade-out-vector",
        from: [0, 0, 0],
        to: [2, 0, 0]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      { type: "wait", duration: 1 },
      { type: "fadeInObject", objectId: "fade-in-vector", duration: 2, easing: "linear" },
      { type: "growFromCenter", objectId: "grow-vector", duration: 2, easing: "linear" },
      { type: "fadeOutObject", objectId: "fade-out-vector", duration: 2, easing: "linear" }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 3, expectedTokenCount: 0 }
  };
  const fadeIn = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1.5)).objectGraph.byId["fade-in-vector"];
  const grow = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 3.5)).objectGraph.byId["grow-vector"];
  const fadeOut = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 5.5)).objectGraph.byId["fade-out-vector"];
  const afterFadeOut = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 7)).objectGraph.byId["fade-out-vector"];

  assert.equal(fadeIn.renderState.kind, "vector");
  assert.equal(grow.renderState.kind, "vector");
  assert.equal(fadeOut.renderState.kind, "vector");
  assert.equal(Number(fadeIn.uniforms?.opacity.toFixed(3)), 0.25);
  assert.deepEqual(fadeIn.renderState.from, [0, 0, 0]);
  assert.deepEqual(fadeIn.renderState.to, [2, 0, 0]);
  assert.equal(Number(grow.uniforms?.opacity.toFixed(3)), 0.25);
  assert.deepEqual(grow.renderState.from, [0.75, 0, 0]);
  assert.deepEqual(grow.renderState.to, [1.25, 0, 0]);
  assert.deepEqual(grow.boundingBox, {
    center: [1, 0, 0],
    kind: "finite",
    max: [1.25, 0, 0],
    min: [0.75, 0, 0]
  });
  assert.equal(Number(fadeOut.uniforms?.opacity.toFixed(3)), 0.75);
  assert.deepEqual(fadeOut.renderState.from, [0, 0, 0]);
  assert.deepEqual(fadeOut.renderState.to, [2, 0, 0]);
  assert.equal(afterFadeOut.uniforms?.opacity, 0);
});

test("V2 runtime stores Mobject uniforms and routes fixed-in-frame uniforms into scene groups", () => {
  assert.ok(functionGraphSpec);
  const uniformScene: MathSceneSpec = {
    ...functionGraphSpec,
    objects: functionGraphSpec.objects.map((object) => {
      if (object.id === "axes") return { ...object, uniforms: { fixedInFrame: true, opacity: 0.65 } };
      if (object.id === "function-curve") {
        return {
          ...object,
          uniforms: {
            clippingPlanes: [{ constant: 0, normal: [0, 1, 0] }],
            shadeIn3D: true
          }
        };
      }

      return object;
    })
  };
  const state = buildMathSceneRuntimeState(uniformScene, 0);

  assert.deepEqual(state.sceneGraph.fixedInFrameIds, ["axes"]);
  assert.deepEqual(state.sceneGraph.renderGroups.fixedInFrame, ["axes"]);
  assert.equal(state.objectGraph.byId.axes.uniforms?.fixedInFrame, true);
  assert.equal(state.objectGraph.byId.axes.uniforms?.opacity, 0.65);
  assert.equal(state.objectGraph.byId["function-curve"].uniforms?.shadeIn3D, true);
  assert.deepEqual(state.objectGraph.byId["function-curve"].uniforms?.clippingPlanes, [{ constant: 0, normal: [0, 1, 0] }]);
  assert.equal(state.objectGraph.byId["moving-probe"].uniforms?.opacity, 1);
});

test("V2 runtime carries VMobject stroke style on curve and trace render states", () => {
  assert.ok(functionGraphSpec);
  const styledScene: MathSceneSpec = {
    ...functionGraphSpec,
    objects: functionGraphSpec.objects.map((object) => {
      if (object.id === "function-curve") {
        return {
          ...object,
          style: {
            strokeOpacity: 0.42,
            strokeRole: "attention",
            strokeWidth: 7
          }
        };
      }

      if (object.id === "probe-trace") {
        return {
          ...object,
          style: {
            strokeOpacity: 0.25,
            strokeRole: "trace",
            strokeWidth: 2
          }
        };
      }

      return object;
    })
  };
  const state = applyMathUpdaters(styledScene, buildMathSceneRuntimeState(styledScene, 3));
  const curve = state.objectGraph.byId["function-curve"];
  const trace = state.objectGraph.byId["probe-trace"];

  if (curve.renderState.kind !== "polyline") throw new Error("expected curve polyline render state");
  if (trace.renderState.kind !== "polyline") throw new Error("expected trace polyline render state");

  assert.equal(curve.renderState.style?.strokeRole, "attention");
  assert.equal(curve.renderState.style?.strokeWidth, 7);
  assert.equal(curve.renderState.style?.strokeOpacity, 0.42);
  assert.equal(trace.renderState.style?.strokeRole, "trace");
  assert.equal(trace.renderState.style?.strokeWidth, 2);
  assert.equal(trace.renderState.style?.strokeOpacity, 0.25);
});

test("V2 runtime carries VMobject stroke style on surface and vector render states", () => {
  const scene: MathSceneSpec = {
    sceneId: "surface-vector-style-runtime-test",
    familyId: "three-optimization-modeling",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      {
        type: "parametricSurface",
        id: "objective-surface",
        conceptId: "objective-model",
        colorRole: "surface",
        samples: [
          [
            [-1, -1, 1],
            [-1, 0, 0],
            [-1, 1, 1]
          ],
          [
            [0, -1, 0],
            [0, 0, -1],
            [0, 1, 0]
          ],
          [
            [1, -1, 1],
            [1, 0, 0],
            [1, 1, 1]
          ]
        ],
        style: {
          strokeOpacity: 0.33,
          strokeRole: "attention",
          strokeWidth: 4
        },
        uRange: [-1, 1],
        vRange: [-1, 1]
      },
      {
        type: "vector",
        id: "gradient-vector",
        colorRole: "probe",
        conceptId: "gradient-direction",
        from: [0, 0, 0],
        style: {
          strokeOpacity: 0.6,
          strokeRole: "probe",
          strokeWidth: 6
        },
        to: [1, 1, 0]
      }
    ],
    formulas: [
      {
        id: "formula",
        latex: "$z=x^2+y^2$",
        tokens: [{ id: "surface-token", text: "z", conceptId: "objective-model" }]
      }
    ],
    bindings: [{ conceptId: "objective-model", formulaId: "formula", objectId: "objective-surface", tokenId: "surface-token" }],
    timeline: [{ type: "revealSurface", objectId: "objective-surface", duration: 2, easing: "smooth" }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 1, expectedObjectCount: 2, expectedTokenCount: 1 }
  };
  const state = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const surface = state.objectGraph.byId["objective-surface"];
  const vector = state.objectGraph.byId["gradient-vector"];

  if (surface.renderState.kind !== "surface") throw new Error("expected surface render state");
  if (vector.renderState.kind !== "vector") throw new Error("expected vector render state");

  assert.equal(surface.renderState.style?.strokeRole, "attention");
  assert.equal(surface.renderState.style?.strokeWidth, 4);
  assert.equal(surface.renderState.style?.strokeOpacity, 0.33);
  assert.equal(vector.renderState.style?.strokeRole, "probe");
  assert.equal(vector.renderState.style?.strokeWidth, 6);
  assert.equal(vector.renderState.style?.strokeOpacity, 0.6);
});

test("V2 runtime maps axis Mobjects into coordinate-system render state", () => {
  const scene: MathSceneSpec = {
    sceneId: "axis-runtime-state-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 4], y: [-1, 3], z: [-5, 5] },
      worldRange: { x: [-20, 40], y: [-10, 30], z: [-1, 1] }
    },
    objects: [
      {
        type: "axis3d",
        id: "axes",
        range: { x: [-1, 3], y: [0, 2], z: [-5, 5] },
        conceptId: "coordinate-frame"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const state = buildMathSceneRuntimeState(scene, 0);
  const axes = state.objectGraph.byId.axes;

  assert.equal(axes.renderState.kind, "axes");
  if (axes.renderState.kind !== "axes") throw new Error("expected axes render state");

  assert.deepEqual(axes.renderState.xAxisPoints, [[-10, 0, 0], [30, 0, 0]]);
  assert.deepEqual(axes.renderState.yAxisPoints, [[0, 0, 0], [0, 20, 0]]);
  assert.deepEqual(axes.renderState.zAxisPoints, [[0, 0, -1], [0, 0, 1]]);
  assert.equal(axes.boundingBox.kind, "finite");
  if (axes.boundingBox.kind !== "finite") throw new Error("expected finite axes bounding box");
  assert.deepEqual(axes.boundingBox.min, [-10, 0, -1]);
  assert.deepEqual(axes.boundingBox.max, [30, 20, 1]);
});

test("V2 camera director chooses canonical and active teaching shots from timeline beats", () => {
  assert.ok(functionGraphSpec);

  const initial = buildCameraDirectorState(functionGraphSpec!, 0);
  const detail = buildCameraDirectorState(functionGraphSpec!, 10.04);

  assert.equal(initial.canonicalShotId, "overview");
  assert.equal(initial.activeShotId, "overview");
  assert.equal(initial.resetShotId, "overview");
  assert.equal(initial.frame.id, "overview");
  assert.equal(initial.frame.fixedInFrameOverlay, true);
  assert.equal(initial.frame.viewMatrix.length, 16);
  assert.equal(initial.frame.inverseViewMatrix.length, 16);
  assert.equal(cameraShotForTimeline(functionGraphSpec!.timeline, functionGraphSpec!.cameraShots, 10.04)?.id, "curve-detail");
  assert.equal(detail.activeShotId, "curve-detail");
  assert.equal(detail.progress, 1);
  assert.equal(detail.frame.id, "curve-detail");
  assert.ok(detail.frame.orientation.forward.every(Number.isFinite));
});

test("V2 updater registry evaluates moving points and traces deterministically", () => {
  assert.ok(functionGraphSpec);
  const state = buildMathSceneRuntimeState(functionGraphSpec!, 3.5);
  const updated = applyMathUpdaters(functionGraphSpec!, state);
  const movingPoint = updated.objectGraph.byId["moving-probe"];
  const trace = updated.objectGraph.byId["probe-trace"];

  assert.equal(movingPoint.renderState.kind, "point");
  assert.equal(trace.renderState.kind, "polyline");
  assert.ok(trace.renderState.points.length > 2);
  assert.deepEqual(trace.renderState.points.at(-1), movingPoint.renderState.position);
});

test("V2 reveal curve updater renders exact ShowCreation partial path by tracker alpha", () => {
  assert.ok(functionGraphSpec);
  const runtimeFrameAt = (elapsedSeconds: number) => {
    const state = buildMathSceneRuntimeState(functionGraphSpec!, elapsedSeconds);
    const fullCurve = state.objectGraph.byId["function-curve"];
    if (fullCurve.renderState.kind !== "polyline") throw new Error("expected full curve polyline render state");
    const curveSpec = fullCurve.spec;
    if (curveSpec.type !== "parametricCurve") throw new Error("expected curve spec");
    const sourceCurve = buildCurveObject({
      colorRole: curveSpec.colorRole,
      conceptId: curveSpec.conceptId,
      id: curveSpec.id,
      samples: fullCurve.renderState.points,
      style: curveSpec.style
    });
    const updated = applyMathUpdaters(functionGraphSpec!, state);
    const curve = updated.objectGraph.byId["function-curve"];
    if (curve.renderState.kind !== "polyline") throw new Error("expected curve polyline render state");

    const alpha = state.trackers.byId["function-curve:progress"].value;
    const expected = pointwiseBecomePartialCurveObject(sourceCurve, 0, alpha);
    return { alpha, expected, points: curve.renderState.points };
  };

  const firstFrame = runtimeFrameAt(0);
  const midFrame = runtimeFrameAt(1.2);
  const finalFrame = runtimeFrameAt(3);

  assert.equal(firstFrame.alpha, 0);
  assert.deepEqual(firstFrame.points, firstFrame.expected.curve.samples);
  assert.deepEqual(firstFrame.expected.requestedRange, [0, 0]);
  assert.equal(firstFrame.expected.visibleLength, 0);
  assert.deepEqual(midFrame.points, midFrame.expected.curve.samples);
  assert.deepEqual(midFrame.expected.requestedRange, [0, midFrame.alpha]);
  assert.equal(midFrame.expected.normalizedRange[0], 0);
  assert.ok(midFrame.expected.visibleLength > 0);
  assert.deepEqual(finalFrame.points, finalFrame.expected.curve.samples);
  assert.deepEqual(finalFrame.expected.requestedRange, [0, 1]);
  assert.equal(finalFrame.expected.visibleSampleCount, finalFrame.expected.curve.samples.length);
});

test("V2 updater registry moves Mobjects along serialized vector fields", () => {
  const scene: MathSceneSpec = {
    sceneId: "vector-field-updater-runtime-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-4, 4] }
    },
    objects: [
      {
        type: "parametricCurve",
        colorRole: "function",
        conceptId: "seed-position",
        id: "seed-path",
        samples: [
          [0, 0, 0],
          [0, 0, 0]
        ]
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: "flow-probe",
        id: "flow-probe",
        pathObjectId: "seed-path"
      }
    ],
    vectorFieldUpdaters: [
      {
        coordinateMode: "world",
        id: "probe-flow-updater",
        objectId: "flow-probe",
        speedScale: 0.5,
        system: { type: "constantVelocity", velocity: [1, 0, 0] },
        type: "moveAlongVectorField"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "wait", duration: 4 }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 2, expectedTokenCount: 0 }
  };
  const state = buildMathSceneRuntimeState(scene, 2);

  assert.ok(state.updaters.byObjectId["flow-probe"].includes("move-along-vector-field"));

  const updated = applyMathUpdaters(state.sourceScene, state);
  const probe = updated.objectGraph.byId["flow-probe"];

  assert.equal(probe.renderState.kind, "point");
  if (probe.renderState.kind !== "point") throw new Error("expected vector-field-updated point render state");
  assert.deepEqual(probe.renderState.position, [1, 0, 0]);
});

test("V2 vector-field updaters evaluate math-space fields and suspend during owned animations", () => {
  const scene: MathSceneSpec = {
    sceneId: "math-vector-field-updater-runtime-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-4, 4] }
    },
    objects: [
      {
        type: "parametricCurve",
        colorRole: "function",
        conceptId: "seed-position",
        id: "seed-path",
        samples: [
          [0, 0, 0],
          [0, 0, 0]
        ]
      },
      {
        type: "parametricCurve",
        colorRole: "function",
        conceptId: "path-position",
        id: "active-path",
        samples: [
          [0, 0, 0],
          [2, 0, 0]
        ]
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: "math-flow-probe",
        id: "math-flow-probe",
        pathObjectId: "seed-path"
      },
      {
        type: "movingPoint",
        colorRole: "probe",
        conceptId: "suspended-probe",
        id: "suspended-probe",
        pathObjectId: "active-path"
      }
    ],
    vectorFieldUpdaters: [
      {
        coordinateMode: "math",
        id: "math-flow-updater",
        objectId: "math-flow-probe",
        speedScale: 0.5,
        system: { type: "constantVelocity", velocity: [1, 0, 0] },
        type: "moveAlongVectorField"
      },
      {
        coordinateMode: "world",
        id: "suspended-flow-updater",
        objectId: "suspended-probe",
        speedScale: 10,
        system: { type: "constantVelocity", velocity: [1, 0, 0] },
        type: "moveAlongVectorField"
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      { type: "wait", duration: 2 },
      { type: "moveAlongPath", objectId: "suspended-probe", pathObjectId: "active-path", duration: 2 }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 4, expectedTokenCount: 0 }
  };
  const mathFieldState = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 1));
  const mathProbe = mathFieldState.objectGraph.byId["math-flow-probe"];

  assert.equal(mathProbe.renderState.kind, "point");
  if (mathProbe.renderState.kind !== "point") throw new Error("expected math-space vector-field point render state");
  assert.deepEqual(mathProbe.renderState.position, [1, 0, 0]);

  const suspendedState = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 3));
  const suspendedProbe = suspendedState.objectGraph.byId["suspended-probe"];

  assert.equal(suspendedProbe.renderState.kind, "point");
  if (suspendedProbe.renderState.kind !== "point") throw new Error("expected suspended probe point render state");
  assert.deepEqual(suspendedProbe.renderState.position, [1, 0, 0]);
});

test("V2 runtime exposes object trackers for transformObject steps", () => {
  const scene: MathSceneSpec = {
    sceneId: "transform-runtime-test",
    familyId: "three-space-vectors-lines-planes",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }, conceptId: "coordinate-frame" },
      { type: "vector", id: "normal-vector", conceptId: "orientation", colorRole: "parameter", from: [0, 0, 0], to: [1, 0, 0] }
    ],
    formulas: [
      {
        id: "formula",
        latex: "$\\\\vec n$",
        tokens: [{ id: "normal-token", text: "n", conceptId: "orientation" }]
      }
    ],
    bindings: [{ conceptId: "orientation", formulaId: "formula", objectId: "normal-vector", tokenId: "normal-token" }],
    timeline: [{ type: "transformObject", objectId: "normal-vector", targetObjectId: "normal-vector-target", duration: 3, lagRatio: 0.25 }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 1, expectedObjectCount: 2, expectedTokenCount: 1 }
  };
  const state = buildMathSceneRuntimeState(scene, 1.5);

  assert.equal(state.trackers.byId["normal-vector:progress"].value, 0.5);
  assert.equal(state.trackers.byId["normal-vector:progress"].source, "object");
});

test("V2 runtime treats sampled surfaces as semantic math objects with wireframe render state", () => {
  const scene: MathSceneSpec = {
    sceneId: "surface-runtime-test",
    familyId: "three-optimization-modeling",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }, conceptId: "coordinate-frame" },
      {
        type: "parametricSurface",
        id: "objective-surface",
        conceptId: "objective-model",
        colorRole: "surface",
        samples: [
          [
            [-1, -1, 1],
            [-1, 0, 0],
            [-1, 1, 1]
          ],
          [
            [0, -1, 0],
            [0, 0, -1],
            [0, 1, 0]
          ],
          [
            [1, -1, 1],
            [1, 0, 0],
            [1, 1, 1]
          ]
        ],
        uRange: [-1, 1],
        vRange: [-1, 1]
      }
    ],
    formulas: [
      {
        id: "formula",
        latex: "$z=x^2+y^2-1$",
        tokens: [{ id: "objective-token", text: "z", conceptId: "objective-model" }]
      }
    ],
    bindings: [{ conceptId: "objective-model", formulaId: "formula", objectId: "objective-surface", tokenId: "objective-token" }],
    timeline: [{ type: "highlight", conceptId: "objective-model", duration: 2 }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 1, expectedObjectCount: 2, expectedTokenCount: 1 }
  };
  const state = buildMathSceneRuntimeState(scene, 0);
  const surface = state.objectGraph.byId["objective-surface"];

  assert.equal(surface.type, "parametricSurface");
  assert.equal(surface.conceptId, "objective-model");
  assert.equal(surface.boundingBox.kind, "finite");
  assert.equal(surface.renderState.kind, "surface");

  if (surface.renderState.kind !== "surface") throw new Error("expected surface render state");

  assert.equal(surface.renderState.rows, 3);
  assert.equal(surface.renderState.columns, 3);
  assert.equal(surface.renderState.points.length, 9);
  assert.deepEqual(surface.renderState.wireframeRows[1], [
    [0, -1, 0],
    [0, 0, -1],
    [0, 1, 0]
  ]);
  assert.equal(state.diagnostics.mathObjectCount, 2);
});

test("V2 runtime expands scene ODE trajectories into path, current-state, and trace Mobjects", () => {
  const scene: MathSceneSpec = {
    sceneId: "ode-runtime-bridge-test",
    familyId: "three-function-graph",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }
    },
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" }
    ],
    odeTrajectories: [
      {
        colorRole: "attention",
        conceptId: "phase-flow",
        id: "phase-orbit",
        method: "rk4",
        start: [1, 0, 0],
        stepCount: 8,
        system: { type: "linear2d", matrix: [[0, -1], [1, 0]] },
        tailDurationSeconds: 0.35,
        tRange: [0, 1]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [
      { type: "revealCurve", objectId: "phase-orbit:trajectory-path", duration: 2, easing: "linear" },
      { type: "moveAlongPath", objectId: "phase-orbit:current-state", pathObjectId: "phase-orbit:trajectory-path", duration: 2 },
      { type: "wait", duration: 0.5 }
    ],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const state = buildMathSceneRuntimeState(scene, 3);

  assert.equal(state.sourceScene.objects.length, 4);
  assert.deepEqual(state.objectGraph.rootIds, ["axes", "phase-orbit:trajectory-path"]);
  assert.deepEqual(state.sceneGraph.renderGroups.scene, [
    "axes",
    "phase-orbit:trajectory-path",
    "phase-orbit:current-state",
    "phase-orbit:trace-tail"
  ]);
  assert.equal(state.diagnostics.mathObjectCount, 4);
  assert.equal(state.objectGraph.byId["phase-orbit:trajectory-path"].type, "parametricCurve");
  assert.equal(state.objectGraph.byId["phase-orbit:trajectory-path"].conceptId, "phase-flow");
  assert.equal(state.objectGraph.byId["phase-orbit:current-state"].type, "movingPoint");
  assert.equal(state.objectGraph.byId["phase-orbit:current-state"].parentId, "phase-orbit:trajectory-path");
  assert.equal(state.objectGraph.byId["phase-orbit:trace-tail"].type, "trace");
  assert.equal(state.objectGraph.byId["phase-orbit:trace-tail"].parentId, "phase-orbit:current-state");
  assert.ok(state.updaters.byObjectId["phase-orbit:trajectory-path"].includes("reveal-curve"));
  assert.ok(state.updaters.byObjectId["phase-orbit:current-state"].includes("move-along-path"));
  assert.ok(state.updaters.byObjectId["phase-orbit:trace-tail"].includes("trace-recent-path"));

  const updated = applyMathUpdaters(state.sourceScene, state);
  const currentState = updated.objectGraph.byId["phase-orbit:current-state"];
  const traceTail = updated.objectGraph.byId["phase-orbit:trace-tail"];

  assert.equal(currentState.renderState.kind, "point");
  assert.equal(traceTail.renderState.kind, "polyline");
  if (currentState.renderState.kind !== "point") throw new Error("expected ODE current-state point");
  if (traceTail.renderState.kind !== "polyline") throw new Error("expected ODE trace-tail polyline");
  assert.ok(currentState.renderState.position.every(Number.isFinite));
  assert.ok(traceTail.renderState.points.length >= 2);
  assert.deepEqual(traceTail.renderState.points.at(-1), currentState.renderState.position);
});

test("V2 updater registry reveals sampled surface wireframes by object progress", () => {
  const scene: MathSceneSpec = {
    sceneId: "surface-reveal-runtime-test",
    familyId: "three-optimization-modeling",
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] },
      worldRange: { x: [-2, 2], y: [-2, 2], z: [-2, 2] }
    },
    objects: [
      {
        type: "parametricSurface",
        id: "objective-surface",
        conceptId: "objective-model",
        colorRole: "surface",
        samples: [
          [
            [0, 0, 0],
            [0, 1, 0],
            [0, 2, 0],
            [0, 3, 0]
          ],
          [
            [1, 0, 0],
            [1, 1, 1],
            [1, 2, 1],
            [1, 3, 0]
          ],
          [
            [2, 0, 0],
            [2, 1, 1],
            [2, 2, 1],
            [2, 3, 0]
          ],
          [
            [3, 0, 0],
            [3, 1, 0],
            [3, 2, 0],
            [3, 3, 0]
          ]
        ],
        uRange: [0, 3],
        vRange: [0, 3]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "revealSurface", objectId: "objective-surface", duration: 4, easing: "linear" }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const state = buildMathSceneRuntimeState(scene, 2);
  const updated = applyMathUpdaters(scene, state);
  const surface = updated.objectGraph.byId["objective-surface"];

  assert.equal(state.trackers.byId["objective-surface:progress"].value, 0.5);
  assert.ok(state.updaters.byObjectId["objective-surface"].includes("reveal-surface"));
  assert.equal(surface.renderState.kind, "surface");

  if (surface.renderState.kind !== "surface") throw new Error("expected surface render state");

  assert.equal(surface.renderState.rows, 2);
  assert.equal(surface.renderState.columns, 4);
  assert.equal(surface.renderState.wireframeRows.length, 2);
  assert.ok(surface.renderState.wireframeColumns.every((column) => column.length === 2));
});

test("V2 reveal surface updater applies DrawBorderThenFill style frames for filled surfaces", () => {
  const scene: MathSceneSpec = {
    sceneId: "surface-draw-border-fill-runtime-test",
    familyId: "three-optimization-modeling",
    coordinateSpace: {
      mathRange: { x: [0, 3], y: [0, 3], z: [-1, 1] },
      worldRange: { x: [0, 3], y: [0, 3], z: [-1, 1] }
    },
    objects: [
      {
        type: "parametricSurface",
        id: "area-surface",
        conceptId: "area-model",
        colorRole: "surface",
        samples: [
          [
            [0, 0, 0],
            [0, 1, 0],
            [0, 2, 0],
            [0, 3, 0]
          ],
          [
            [1, 0, 0],
            [1, 1, 0.5],
            [1, 2, 0.5],
            [1, 3, 0]
          ],
          [
            [2, 0, 0],
            [2, 1, 0.5],
            [2, 2, 0.5],
            [2, 3, 0]
          ],
          [
            [3, 0, 0],
            [3, 1, 0],
            [3, 2, 0],
            [3, 3, 0]
          ]
        ],
        style: {
          fillOpacity: 0.36,
          fillRole: "area",
          strokeOpacity: 0.64,
          strokeWidth: 5
        },
        uRange: [0, 3],
        vRange: [0, 3]
      }
    ],
    formulas: [],
    bindings: [],
    timeline: [{ type: "revealSurface", objectId: "area-surface", duration: 4, easing: "linear" }],
    cameraShots: [{ id: "overview", target: [0, 0, 0], position: [3, 3, 3], fov: 48 }],
    diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 }
  };
  const authoredStyle = buildVMobjectStyle({
    fillOpacity: 0.36,
    fillRole: "area",
    strokeOpacity: 0.64,
    strokeRole: "surface",
    strokeWidth: 5
  });
  const runtimeSurfaceAt = (elapsedSeconds: number) => {
    const state = buildMathSceneRuntimeState(scene, elapsedSeconds);
    const updated = applyMathUpdaters(scene, state);
    const surface = updated.objectGraph.byId["area-surface"];
    if (surface.renderState.kind !== "surface") throw new Error("expected surface render state");

    const alpha = state.trackers.byId["area-surface:progress"].value;
    const expectedFrame = buildCreationPrimitiveFrame({
      kind: "drawBorderThenFill",
      objectId: "area-surface",
      progress: alpha,
      style: authoredStyle
    });

    return { alpha, expectedFrame, surface: surface.renderState };
  };

  const borderFrame = runtimeSurfaceAt(1);
  const fillFrame = runtimeSurfaceAt(3);

  assert.equal(borderFrame.alpha, 0.25);
  assert.equal(borderFrame.expectedFrame.phase, "draw-border");
  assert.deepEqual(borderFrame.expectedFrame.drawRange, [0, 0.5]);
  assert.equal(borderFrame.surface.rows, Math.ceil(4 * borderFrame.expectedFrame.drawRange[1]));
  assert.equal(borderFrame.surface.style?.fillOpacity, borderFrame.expectedFrame.style.fillOpacity);
  assert.equal(borderFrame.surface.style?.fillOpacity, 0);
  assert.equal(borderFrame.surface.style?.strokeOpacity, 0.64);

  assert.equal(fillFrame.alpha, 0.75);
  assert.equal(fillFrame.expectedFrame.phase, "fill");
  assert.deepEqual(fillFrame.expectedFrame.drawRange, [0, 1]);
  assert.equal(fillFrame.surface.rows, 4);
  assert.equal(Number(fillFrame.surface.style?.fillOpacity.toFixed(3)), 0.18);
  assert.equal(fillFrame.surface.style?.fillOpacity, fillFrame.expectedFrame.style.fillOpacity);
  assert.equal(fillFrame.surface.style?.strokeWidth, 5);
  assert.ok(fillFrame.surface.wireframeColumns.every((column) => column.length === 4));
});

test("V2 runtime diagnostics are exposed on the canvas surface", () => {
  const canvasSource = fs.readFileSync("components/visualizations/three/ThreeDLabCanvas.tsx", "utf8");
  const surfaceContractSource = fs.readFileSync("components/visualizations/three/threeDCanvasSurfaceContract.ts", "utf8");
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");
  const stepperSource = fs.readFileSync("components/visualizations/three/manim/mathSceneFrameStepper.ts", "utf8");

  for (const attribute of [
    "data-viz-math-object-count",
    "data-viz-tracker-count",
    "data-viz-updater-count",
    "data-viz-camera-canonical-shot",
    "data-viz-reduced-motion",
    "data-viz-parameter-tracker-count",
    "data-viz-parameter-tracker-summary",
    "data-viz-scene-top-level-mobject-count",
    "data-viz-scene-render-group-count",
    "data-viz-scene-renderable-count",
    "data-viz-scene-foreground-count",
    "data-viz-scene-fixed-in-frame-count",
    "data-viz-scene-membership-active-introducer-count",
    "data-viz-scene-membership-active-remover-count",
    "data-viz-scene-membership-excluded-count",
    "data-viz-scene-membership-pending-introducer-count",
    "data-viz-scene-membership-removed-count"
  ]) {
    assert.match(canvasSource, new RegExp(attribute));
    assert.match(surfaceContractSource, new RegExp(attribute));
  }

  assert.match(canvasSource, /sceneTopLevelMobjectCount/);
  assert.match(canvasSource, /sceneRenderGroupCount/);
  assert.match(canvasSource, /parameterTrackerSummary/);
  assert.match(stepperSource, /buildMathSceneRuntimeState/);
  assert.match(stepperSource, /buildMathSceneEvidenceSnapshot/);
  assert.match(canvasSource, /stepMathSceneFrame/);
  assert.match(canvasSource, /evidenceDataAttributes/);
  assert.match(runtimeSource, /buildMathSceneRuntimeState/);
  assert.match(runtimeSource, /applyMathUpdaters/);
});

test("V2 R3F renderer has a deterministic wireframe adapter for sampled surfaces", () => {
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(runtimeSource, /parametricSurface/);
  assert.match(runtimeSource, /wireframeRows/);
  assert.match(runtimeSource, /wireframeColumns/);
  assert.match(runtimeSource, /tracePoints\.length < 2/);
  assert.doesNotMatch(runtimeSource, /data-viz-manim-surface-/);
  assert.match(runtimeSource, /<Line/);
});

test("V2 R3F renderer consumes runtime vector render state for animated vectors", () => {
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(runtimeSource, /const vectorPoints = runtimeObject\.renderState\.kind === "vector"/);
  assert.match(runtimeSource, /\[runtimeObject\.renderState\.from,\s*runtimeObject\.renderState\.to\]/);
  assert.match(runtimeSource, /points=\{vectorPoints\}/);
  assert.doesNotMatch(runtimeSource, /points=\{\[object\.from,\s*object\.to\]\}/);
});

test("V2 R3F renderer consumes runtime axis render state instead of hard-coded axes", () => {
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(runtimeSource, /runtimeObject\.renderState\.kind !== "axes"/);
  assert.match(runtimeSource, /runtimeObject\.renderState\.xAxisPoints/);
  assert.match(runtimeSource, /runtimeObject\.renderState\.yAxisPoints/);
  assert.match(runtimeSource, /runtimeObject\.renderState\.zAxisPoints/);
  assert.doesNotMatch(runtimeSource, /\[\[-2\.55,\s*0\.12,\s*0\],\s*\[2\.55,\s*0\.12,\s*0\]\]/);
  assert.doesNotMatch(runtimeSource, /\[\[0,\s*0,\s*0\],\s*\[0,\s*2\.35,\s*0\]\]/);
});

test("V2 R3F renderer consumes Scene render groups instead of raw object arrays", () => {
  const runtimeSource = fs.readFileSync("components/visualizations/three/manim/MathSceneRuntime.tsx", "utf8");

  assert.match(runtimeSource, /runtimeState\.sceneGraph\.renderGroups\.all\.map/);
  assert.match(runtimeSource, /const runtimeObject = runtimeState\.objectGraph\.byId\[objectId\]/);
  assert.doesNotMatch(runtimeSource, /scene\.objects\.map\(\(object\) =>/);
});
