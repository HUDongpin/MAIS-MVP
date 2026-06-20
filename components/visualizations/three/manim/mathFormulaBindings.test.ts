import assert from "node:assert/strict";
import test from "node:test";
import {
  summarizeFormulaBindings,
  validateFormulaBindings
} from "./mathFormulaBindings";
import type { MathSceneSpec } from "./mathSceneTypes";

const validScene: MathSceneSpec = {
  sceneId: "test-scene",
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

test("accepts formula bindings when tokens and objects share concepts", () => {
  assert.deepEqual(validateFormulaBindings(validScene), []);
  assert.deepEqual(summarizeFormulaBindings(validScene), {
    bindingCount: 2,
    objectCount: 4,
    tokenCount: 2
  });
});

test("reports missing formula tokens and object ids", () => {
  const invalidScene: MathSceneSpec = {
    ...validScene,
    bindings: [
      { conceptId: "missing", formulaId: "formula", objectId: "missing-object", tokenId: "missing-token" }
    ]
  };

  assert.deepEqual(validateFormulaBindings(invalidScene), [
    "binding missing references unknown object missing-object",
    "binding missing references unknown token missing-token in formula formula",
    "binding missing conceptId is not represented by object missing-object"
  ]);
});
