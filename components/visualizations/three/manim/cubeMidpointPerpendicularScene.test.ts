import assert from "node:assert/strict";
import test from "node:test";

import { buildCubeMidpointPerpendicularProof } from "../../../../lib/math-kernel/demo/cubeMidpointPerpendicular.server";
import { buildApprovedSceneSpecExport } from "./mathSceneExport";
import { buildMathSceneAnimatePlans } from "./mathSceneAnimationPlans";
import { buildFormulaLayerState } from "./mathFormulaLayer";
import { validateFormulaBindings } from "./mathFormulaBindings";
import {
  buildRuntimeIndicationOverlayFrames,
  runtimeIndicationOverlayActiveConceptId,
} from "./mathRuntimeIndicationOverlay";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import { buildMathSceneTeachingQualityEvidence } from "./mathSceneTeachingQuality";
import { timelineFocusTargetIds } from "./mathTimeline";
import { applyMathUpdaters } from "./mathUpdaterRegistry";
import {
  buildCubeMidpointPerpendicularScene,
  CUBE_MIDPOINT_PERPENDICULAR_SCENE_ID,
} from "./cubeMidpointPerpendicularScene";

function proof() {
  const result = buildCubeMidpointPerpendicularProof();
  if (!result.ok) throw new Error(result.error.message);
  assert.equal(result.ok, true);
  return result.value;
}

test("builds the confirmed 23-object cube proof from the authoritative DTO", () => {
  const dto = proof();
  const scene = buildCubeMidpointPerpendicularScene(dto, "zh-CN");

  assert.equal(scene.sceneId, CUBE_MIDPOINT_PERPENDICULAR_SCENE_ID);
  assert.equal(scene.familyId, "three-space-vectors-lines-planes");
  assert.equal(scene.objects.length, 23);
  assert.deepEqual(
    scene.objects.reduce<Record<string, number>>((counts, object) => {
      counts[object.type] = (counts[object.type] ?? 0) + 1;
      return counts;
    }, {}),
    {
      movingPoint: 3,
      parametricCurve: 15,
      parametricSurface: 1,
      vector: 4,
    },
  );

  const object = (id: string) => {
    const value = scene.objects.find((entry) => entry.id === id);
    assert.ok(value, `missing object ${id}`);
    return value;
  };

  assert.deepEqual(object("midpoint-path-E"), {
    type: "parametricCurve",
    id: "midpoint-path-E",
    samples: [dto.renderPoints.A, dto.renderPoints.E],
    colorRole: "reference",
    conceptId: "proof-midpoint-e",
    style: { strokeOpacity: 0, strokeWidth: 0 },
  });
  assert.deepEqual(object("point-E"), {
    type: "movingPoint",
    id: "point-E",
    pathObjectId: "midpoint-path-E",
    colorRole: "probe",
    conceptId: "proof-midpoint-e",
  });
  assert.deepEqual(object("vector-EF"), {
    type: "vector",
    id: "vector-EF",
    from: dto.renderPoints.E,
    to: dto.renderPoints.F,
    colorRole: "attention",
    conceptId: "proof-plane-vector-ef",
    style: { strokeWidth: 7 },
  });
  assert.deepEqual(object("vector-normal"), {
    type: "vector",
    id: "vector-normal",
    from: dto.renderPoints.E,
    to: dto.renderPoints.N,
    colorRole: "area",
    conceptId: "proof-plane-normal",
    style: { strokeWidth: 8 },
  });
  assert.deepEqual(object("vector-DB1"), {
    type: "vector",
    id: "vector-DB1",
    from: dto.renderPoints.D,
    to: dto.renderPoints.B1,
    colorRole: "function",
    conceptId: "proof-conclusion",
    style: { strokeOpacity: 0, strokeWidth: 8 },
  });
  assert.deepEqual(object("plane-EFG"), {
    type: "parametricSurface",
    id: "plane-EFG",
    samples: [
      [dto.renderPoints.E, dto.renderPoints.F],
      [dto.renderPoints.H, dto.renderPoints.G],
    ],
    uRange: [0, 1],
    vRange: [0, 1],
    colorRole: "surface",
    conceptId: "proof-conclusion",
    style: {
      fillOpacity: 0,
      fillRole: "surface",
      strokeOpacity: 0,
      strokeRole: "surface",
      strokeWidth: 3,
    },
  });
});

test("declares separate coordinate ranges that contain every proof point", () => {
  const dto = proof();
  const scene = buildCubeMidpointPerpendicularScene(dto, "en");

  assert.deepEqual(scene.coordinateSpace.mathRange, {
    x: [-0.5, 2.5],
    y: [-1.25, 2.5],
    z: [-0.5, 2.5],
  });
  assert.deepEqual(scene.coordinateSpace.worldRange, {
    x: [-0.5, 2.5],
    y: [-0.5, 2.5],
    z: [-1.25, 2.5],
  });

  const contains = (
    range: typeof scene.coordinateSpace.mathRange,
    point: readonly [number, number, number],
  ) =>
    point[0] >= range.x[0] &&
    point[0] <= range.x[1] &&
    point[1] >= range.y[0] &&
    point[1] <= range.y[1] &&
    point[2] >= range.z[0] &&
    point[2] <= range.z[1];

  for (const [pointId, exactPoint] of Object.entries(dto.points)) {
    const x = exactPoint[0].approx;
    const y = exactPoint[1].approx;
    const z = exactPoint[2].approx;
    if (x === null || y === null || z === null) {
      assert.fail(`${pointId} must have finite renderable approximations`);
    }
    const point = [x, y, z] as const;
    assert.ok(point.every(Number.isFinite));
    assert.ok(
      contains(scene.coordinateSpace.mathRange, point),
      `${pointId} must fit the declared mathematical coordinate range`,
    );
  }

  for (const [pointId, renderPoint] of Object.entries(dto.renderPoints)) {
    assert.ok(
      contains(scene.coordinateSpace.worldRange, renderPoint),
      `${pointId} must fit the declared world coordinate range`,
    );
  }
});

test("keeps formula text authoritative, JSON-safe, and semantically bound", () => {
  const dto = proof();
  const scene = buildCubeMidpointPerpendicularScene(dto, "en");

  assert.equal(scene.formulas.length, 1);
  assert.equal(
    scene.formulas[0].latex,
    `\\[${dto.formula.latex}\\]`,
    "the exact DTO formula only gains display delimiters needed by the shared KaTeX renderer",
  );
  assert.deepEqual(scene.formulas[0].tokens, dto.formula.tokens.map((token) => ({
    conceptId: token.conceptId,
    id: token.id,
    text: token.text,
  })));
  assert.equal(scene.formulas[0].tokens.length, 8);
  assert.equal(scene.bindings.length, 8);
  assert.deepEqual(validateFormulaBindings(scene), []);
  assert.deepEqual(
    buildFormulaLayerState(scene).unboundTokenIds,
    ["vector-DB1"],
    "DB1 is a screen-fixed intermediate token; its object is reserved for the final two-object conclusion binding",
  );
  assert.doesNotThrow(() => JSON.parse(JSON.stringify(scene)));

  const exportPlan = buildApprovedSceneSpecExport(scene);
  assert.equal(exportPlan.approvedForRuntime, true);
  assert.equal(exportPlan.exportVersion, "mais-manim-scene-spec/v1");
  assert.equal(exportPlan.objectCount, 23);
  assert.equal(exportPlan.formulaTokenCount, 8);
  assert.equal(exportPlan.semanticBindingCount, 8);
});

function elapsedAtBeatMidpoint(scene: ReturnType<typeof buildCubeMidpointPerpendicularScene>, beatIndex: number) {
  return scene.timeline
    .slice(0, beatIndex)
    .reduce((elapsed, step) => elapsed + step.duration, 0) + scene.timeline[beatIndex].duration / 2;
}

function activeFormulaTokenIds(
  scene: ReturnType<typeof buildCubeMidpointPerpendicularScene>,
  beatIndex: number,
) {
  const runtimeState = buildMathSceneRuntimeState(scene, elapsedAtBeatMidpoint(scene, beatIndex));
  const activeConceptId = runtimeIndicationOverlayActiveConceptId(runtimeState);
  const layer = buildFormulaLayerState(scene, {
    activeConceptId,
    activeConceptIds: [
      activeConceptId,
      runtimeState.timeline.activeConceptId,
      ...timelineFocusTargetIds(runtimeState.timeline.activeStep),
    ],
  });

  return layer.formulas.flatMap((formula) =>
    formula.tokens.filter((token) => token.active).map((token) => token.id),
  );
}

test("activates only the formula token justified by each proof beat", () => {
  const scene = buildCubeMidpointPerpendicularScene(proof(), "zh-CN");
  const expected = [
    ["point-E"],
    ["point-F"],
    ["point-G"],
    ["vector-EF"],
    ["vector-EG"],
    [],
    ["normal-n"],
    [],
    ["vector-DB1"],
    ["normal-n"],
    ["conclusion"],
    ["conclusion"],
  ];

  assert.deepEqual(
    scene.timeline.map((_, beatIndex) => activeFormulaTokenIds(scene, beatIndex)),
    expected,
  );
});

test("does not leak a visible plane edge before the plane reveal composition", () => {
  const scene = buildCubeMidpointPerpendicularScene(proof(), "en");
  const initialState = applyMathUpdaters(scene, buildMathSceneRuntimeState(scene, 0));
  const plane = initialState.objectGraph.byId["plane-EFG"];

  assert.equal(plane.renderState.kind, "surface");
  if (plane.renderState.kind !== "surface") throw new Error("expected surface render state");
  assert.equal(plane.renderState.style?.strokeOpacity, 0);
  assert.equal(plane.renderState.style?.fillOpacity, 0);
});

test("reveals the plane and DB1 through phase-safe compositions", () => {
  const scene = buildCubeMidpointPerpendicularScene(proof(), "en");
  const plans = buildMathSceneAnimatePlans(scene, buildMathSceneRuntimeState(scene, 0));
  const frameAt = (beatIndex: number, fraction: number) => {
    const elapsedBefore = scene.timeline
      .slice(0, beatIndex)
      .reduce((elapsed, step) => elapsed + step.duration, 0);
    const runtime = buildMathSceneRuntimeState(
      scene,
      elapsedBefore + scene.timeline[beatIndex].duration * fraction,
    );
    return applyMathUpdaters(scene, runtime, { animationPlans: plans });
  };

  const planeMid = frameAt(5, 0.5).objectGraph.byId["plane-EFG"];
  const planeDone = frameAt(6, 0).objectGraph.byId["plane-EFG"];
  const db1Mid = frameAt(8, 0.5).objectGraph.byId["vector-DB1"];
  const db1Done = frameAt(9, 0).objectGraph.byId["vector-DB1"];

  assert.equal(planeMid.renderState.kind, "surface");
  assert.equal(planeDone.renderState.kind, "surface");
  assert.equal(db1Mid.renderState.kind, "vector");
  assert.equal(db1Done.renderState.kind, "vector");
  if (
    planeMid.renderState.kind !== "surface" ||
    planeDone.renderState.kind !== "surface" ||
    db1Mid.renderState.kind !== "vector" ||
    db1Done.renderState.kind !== "vector"
  ) {
    throw new Error("expected surface and vector render states");
  }

  assert.ok((planeMid.renderState.style?.fillOpacity ?? 0) > 0);
  assert.equal(planeDone.renderState.style?.fillOpacity, 0.24);
  assert.ok((db1Mid.renderState.style?.strokeOpacity ?? 0) > 0);
  assert.equal(db1Done.renderState.style?.strokeOpacity, 1);
});

test("binds both conclusion beats to DB1 and plane EFG through the final frame", () => {
  const scene = buildCubeMidpointPerpendicularScene(proof(), "zh-HK");
  for (const beatIndex of [10, 11]) {
    const runtime = buildMathSceneRuntimeState(scene, elapsedAtBeatMidpoint(scene, beatIndex));
    const frames = buildRuntimeIndicationOverlayFrames(runtime, {
      focusTargetIds: timelineFocusTargetIds(runtime.timeline.activeStep),
    });

    assert.deepEqual(
      [...new Set(frames.map((frame) => frame.objectId))].sort(),
      ["plane-EFG", "vector-DB1"],
    );
    assert.deepEqual(activeFormulaTokenIds(scene, beatIndex), ["conclusion"]);
  }
});

test("uses twelve focused teaching beats and two finite camera shots", () => {
  const scene = buildCubeMidpointPerpendicularScene(proof(), "zh-HK");

  assert.equal(scene.timeline.length, 12);
  assert.deepEqual(scene.timeline.map((step) => step.type), [
    "moveAlongPath",
    "moveAlongPath",
    "moveAlongPath",
    "growFromCenter",
    "growFromCenter",
    "animationComposition",
    "growFromCenter",
    "cameraTo",
    "animationComposition",
    "highlight",
    "highlight",
    "highlight",
  ]);
  assert.deepEqual(scene.timeline[11], {
    type: "highlight",
    conceptId: "proof-conclusion",
    duration: 1.4,
  });
  assert.equal(scene.cameraShots.length, 2);
  for (const shot of scene.cameraShots) {
    assert.ok(shot.position.every(Number.isFinite));
    assert.ok(shot.target.every(Number.isFinite));
  }

  const quality = buildMathSceneTeachingQualityEvidence(scene);
  assert.equal(quality.runtimeApproved, true);
  assert.equal(quality.focusedBeatCount, 12);
  assert.equal(quality.nonWaitFocusedBeatCount, 12);
  assert.deepEqual(quality.missingTeachingEvidence, ["controlled-parameters"]);
});

test("reduced-motion mode is a static final proof with no movement animation", () => {
  const scene = buildCubeMidpointPerpendicularScene(proof(), "zh-CN", {
    reducedMotion: true,
  });

  assert.equal(scene.sceneId, CUBE_MIDPOINT_PERPENDICULAR_SCENE_ID);
  assert.deepEqual(scene.timeline, [{
    type: "wait",
    duration: 1,
    holdOnWait: true,
    note: "结论：DB₁ 垂直于平面 EFG。",
  }]);
  assert.equal(scene.timeline.some((step) => step.type !== "wait"), false);
  const plane = scene.objects.find((object) => object.id === "plane-EFG");
  const db1 = scene.objects.find((object) => object.id === "vector-DB1");
  assert.equal(plane?.type, "parametricSurface");
  assert.equal(db1?.type, "vector");
  assert.equal(plane?.type === "parametricSurface" ? plane.style?.fillOpacity : null, 0.24);
  assert.equal(db1?.type === "vector" ? db1.style?.strokeOpacity : null, 1);
  assert.equal(scene.animationPlans, undefined);
  assert.equal(scene.animationCompositions, undefined);
  assert.equal(buildApprovedSceneSpecExport(scene).approvedForRuntime, true);
});
