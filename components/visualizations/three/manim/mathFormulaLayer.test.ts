import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFormulaLayerState } from "./mathFormulaLayer";
import type { MathSceneSpec } from "./mathSceneTypes";

const validScene: MathSceneSpec = {
  sceneId: "formula-layer-test-scene",
  familyId: "three-function-graph",
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  objects: [
    { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" },
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" },
    { type: "movingPoint", id: "point", pathObjectId: "curve", colorRole: "probe", conceptId: "probe-point" },
    { type: "trace", id: "trace", sourceObjectId: "point", durationSeconds: 1.5, colorRole: "trace" }
  ],
  formulas: [
    {
      id: "formula",
      latex: "$f(x)=ax^2+b$",
      tokens: [
        { id: "function-token", text: "f(x)", conceptId: "function-rule" },
        { id: "point-token", text: "(x,f(x))", conceptId: "probe-point" }
      ]
    }
  ],
  bindings: [
    { conceptId: "function-rule", formulaId: "formula", objectId: "curve", tokenId: "function-token" },
    { conceptId: "probe-point", formulaId: "formula", objectId: "point", tokenId: "point-token" }
  ],
  timeline: [{ type: "highlight", conceptId: "function-rule", duration: 1 }],
  cameraShots: [{ id: "overview", target: [0, 0.7, 0], position: [3, 3, 4], fov: 48 }],
  diagnostics: {
    expectedBindingCount: 2,
    expectedObjectCount: 4,
    expectedTokenCount: 2
  }
};

test("builds screen-fixed formula token state from semantic bindings", () => {
  const state = buildFormulaLayerState(validScene, { activeConceptId: "function-rule" });

  assert.equal(state.screenFixed, true);
  assert.equal(state.formulas[0].tokens.length, 2);
  assert.deepEqual(state.activeObjectIds, ["curve"]);
  assert.deepEqual(state.unboundTokenIds, []);

  const functionToken = state.formulas[0].tokens[0];
  assert.equal(functionToken.id, "function-token");
  assert.equal(functionToken.formulaId, "formula");
  assert.equal(functionToken.index, 0);
  assert.equal(functionToken.active, true);
  assert.equal(functionToken.colorRole, "function");
  assert.equal(functionToken.conceptId, "function-rule");
  assert.deepEqual(functionToken.boundObjectIds, ["curve"]);
  assert.match(functionToken.ariaLabel, /f\(x\)/);
  assert.match(functionToken.ariaLabel, /function-rule/);

  const pointToken = state.formulas[0].tokens[1];
  assert.equal(pointToken.active, false);
  assert.equal(pointToken.colorRole, "probe");
  assert.deepEqual(pointToken.boundObjectIds, ["point"]);
});

test("keeps all formula tokens inactive when no concept is active", () => {
  const state = buildFormulaLayerState(validScene);

  assert.deepEqual(state.activeObjectIds, []);
  assert.deepEqual(
    state.formulas[0].tokens.map((token) => token.active),
    [false, false]
  );
});

test("reports formula tokens that do not have semantic object bindings", () => {
  const scene: MathSceneSpec = {
    ...validScene,
    formulas: [
      {
        ...validScene.formulas[0],
        tokens: [
          ...validScene.formulas[0].tokens,
          { id: "unbound-token", text: "b", conceptId: "constant-term" }
        ]
      }
    ]
  };

  const state = buildFormulaLayerState(scene, { activeConceptId: "constant-term" });

  assert.deepEqual(state.unboundTokenIds, ["unbound-token"]);
  assert.equal(state.formulas[0].tokens[2].active, true);
  assert.deepEqual(state.formulas[0].tokens[2].boundObjectIds, []);
  assert.equal(state.formulas[0].tokens[2].colorRole, "reference");
});

test("MathFormulaOverlay consumes formula layer state and exposes token QA attributes", () => {
  const source = readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");

  assert.match(source, /buildFormulaLayerState/);
  assert.match(source, /data-viz-manim-bound-object-ids/);
  assert.match(source, /data-viz-manim-token-color-role/);
  assert.match(source, /data-viz-manim-token-index/);
});
