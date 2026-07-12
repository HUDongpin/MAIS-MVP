import assert from "node:assert/strict";
import test from "node:test";
import {
  assignFormulaBindingAnchors,
  FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT,
  formulaBindingAnchorForObject,
  summarizeFormulaBindingAnchors
} from "./mathFormulaBindingAnchors";
import type { MathSceneSpec } from "./mathSceneTypes";

const scene: MathSceneSpec = {
  sceneId: "binding-anchor-test-scene",
  familyId: "three-function-family",
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  objects: [
    { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" },
    { type: "parametricCurve", id: "primary-curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "primary" },
    { type: "parametricCurve", id: "comparison-curve", samples: [[0, 1, 0], [1, 0, 0]], colorRole: "trace", conceptId: "comparison" },
    {
      type: "parametricSurface",
      id: "surface",
      samples: [[[0, 0, 0], [1, 0, 0]], [[0, 1, 0], [1, 1, 0]]],
      uRange: [0, 1],
      vRange: [0, 1],
      colorRole: "surface",
      conceptId: "surface"
    },
    { type: "movingPoint", id: "probe", pathObjectId: "primary-curve", colorRole: "probe", conceptId: "probe" },
    { type: "vector", id: "normal-vector", from: [0, 0, 0], to: [0, 1, 0], colorRole: "probe", conceptId: "normal" }
  ],
  formulas: [
    {
      id: "formula",
      latex: "$f,g,p,n$",
      tokens: [
        { id: "primary-token", text: "f", conceptId: "primary" },
        { id: "comparison-token", text: "g", conceptId: "comparison" },
        { id: "surface-token", text: "S", conceptId: "surface" },
        { id: "probe-token", text: "p", conceptId: "probe" },
        { id: "normal-token", text: "n", conceptId: "normal" }
      ]
    }
  ],
  bindings: [
    { conceptId: "primary", formulaId: "formula", objectId: "primary-curve", tokenId: "primary-token" },
    { conceptId: "comparison", formulaId: "formula", objectId: "comparison-curve", tokenId: "comparison-token" },
    { conceptId: "surface", formulaId: "formula", objectId: "surface", tokenId: "surface-token" },
    { conceptId: "probe", formulaId: "formula", objectId: "probe", tokenId: "probe-token" },
    { anchorName: "lowerLeft", conceptId: "normal", formulaId: "formula", objectId: "normal-vector", tokenId: "normal-token" }
  ],
  timeline: [{ type: "highlight", conceptId: "primary", duration: 1 }],
  cameraShots: [{ id: "overview", target: [0, 0.7, 0], position: [3, 3, 4], fov: 48 }],
  diagnostics: {
    expectedBindingCount: 5,
    expectedObjectCount: 6,
    expectedTokenCount: 5
  }
};

test("assigns projected label anchors by bound MathObject type and preserves explicit anchors", () => {
  const withAnchors = assignFormulaBindingAnchors(scene);

  assert.deepEqual(withAnchors.bindings.map((binding) => binding.anchorName), [
    "upperRight",
    "upperLeft",
    "upperRight",
    "top",
    "lowerLeft"
  ]);
  assert.deepEqual(scene.bindings.map((binding) => binding.anchorName), [
    undefined,
    undefined,
    undefined,
    undefined,
    "lowerLeft"
  ]);
});

test("summarizes formula binding anchor coverage for authoring QA", () => {
  const summary = summarizeFormulaBindingAnchors(assignFormulaBindingAnchors(scene));

  assert.equal(
    FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT,
    "FormulaBinding anchors: bound formula tokens use object-aware mobject anchors for projected label placement"
  );
  assert.deepEqual(summary, {
    anchoredBindingCount: 5,
    missingAnchorCount: 0,
    missingAnchorTokenIds: "none",
    sourceContract: FORMULA_BINDING_ANCHOR_SOURCE_CONTRACT
  });
});

test("chooses stable fallback anchors for malformed or axis-only bindings", () => {
  assert.equal(formulaBindingAnchorForObject(scene.objects[0]), "center");
  assert.equal(formulaBindingAnchorForObject(undefined), "center");
});
