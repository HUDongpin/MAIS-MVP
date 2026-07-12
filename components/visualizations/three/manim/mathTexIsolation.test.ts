import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildFormulaLayerState } from "./mathFormulaLayer";
import {
  buildTexIsolationPlan,
  buildTexIsolationEvidence,
  texIsolationEvidenceDataAttributes,
  texIsolationCacheKey,
  TEX_ISOLATION_SOURCE_CONTRACT,
  type TexIsolationRule
} from "./mathTexIsolation";
import type { FormulaSpec, MathSceneSpec } from "./mathSceneTypes";

const formula: FormulaSpec = {
  id: "quadratic-formula",
  latex: "$f(x)=ax^2+b$",
  tokens: [
    { id: "function-token", text: "f(x)", conceptId: "function-rule" },
    { id: "input-token-0", text: "x", conceptId: "input-variable" },
    { id: "parameter-a", text: "a", conceptId: "opening-parameter" },
    { id: "input-token-1", text: "x", conceptId: "input-variable" },
    { id: "constant-b", text: "b", conceptId: "vertical-shift" }
  ]
};

const scene: MathSceneSpec = {
  sceneId: "tex-isolation-scene",
  familyId: "three-function-graph",
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  objects: [
    { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" },
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" },
    { type: "vector", id: "opening-vector", from: [0, 0, 0], to: [0, 1, 0], colorRole: "parameter", conceptId: "opening-parameter" }
  ],
  formulas: [formula],
  bindings: [
    { conceptId: "function-rule", formulaId: "quadratic-formula", objectId: "curve", tokenId: "function-token" },
    { conceptId: "opening-parameter", formulaId: "quadratic-formula", objectId: "opening-vector", tokenId: "parameter-a" }
  ],
  timeline: [{ type: "highlight", conceptId: "opening-parameter", duration: 1 }],
  cameraShots: [{ id: "overview", target: [0, 0.7, 0], position: [3, 3, 4], fov: 48 }],
  diagnostics: {
    expectedBindingCount: 2,
    expectedObjectCount: 3,
    expectedTokenCount: 5
  }
};

test("builds Manim-style TeX isolation entries from token id, text, and concept selectors", () => {
  const rules: TexIsolationRule[] = [
    { selector: "parameter-a", colorRole: "parameter" },
    { selector: "x", colorRole: "probe" },
    { selector: "concept:function-rule", colorRole: "function" }
  ];
  const plan = buildTexIsolationPlan(formula, rules);

  assert.equal(plan.formulaId, "quadratic-formula");
  assert.deepEqual(plan.unmatchedSelectors, []);
  assert.deepEqual(
    plan.entries.filter((entry) => entry.isolated).map((entry) => [
      entry.tokenId,
      entry.selector,
      entry.colorRole,
      entry.occurrence
    ]),
    [
      ["function-token", "concept:function-rule", "function", 0],
      ["input-token-0", "x", "probe", 0],
      ["parameter-a", "parameter-a", "parameter", 0],
      ["input-token-1", "x", "probe", 1]
    ]
  );
});

test("summarizes TeX isolation plans for deterministic browser QA evidence", () => {
  const evidence = buildTexIsolationEvidence(scene, {
    texIsolationRules: [
      { selector: "parameter-a", colorRole: "parameter" },
      { selector: "x", colorRole: "probe" },
      { selector: "concept:function-rule", colorRole: "function" }
    ]
  });
  const attributes = texIsolationEvidenceDataAttributes(evidence);

  assert.equal(evidence.sceneId, "tex-isolation-scene");
  assert.equal(evidence.formulaCount, 1);
  assert.equal(evidence.tokenCount, 5);
  assert.equal(evidence.isolatedTokenCount, 4);
  assert.equal(evidence.selectorCount, 3);
  assert.equal(evidence.selectorSummary, "concept:function-rule,parameter-a,x");
  assert.equal(evidence.unmatchedSelectorCount, 0);
  assert.equal(evidence.unmatchedSelectors, "none");
  assert.equal(evidence.cacheKeyCount, 1);
  assert.equal(
    evidence.occurrenceSummary,
    "quadratic-formula:function-token#0=concept:function-rule|quadratic-formula:input-token-0#0=x|quadratic-formula:parameter-a#0=parameter-a|quadratic-formula:input-token-1#1=x"
  );
  assert.equal(evidence.sourceContract, TEX_ISOLATION_SOURCE_CONTRACT);
  assert.equal(
    evidence.summary,
    "tex-isolation:tex-isolation-scene:formulas=1:tokens=5:isolated=4:selectors=concept:function-rule,parameter-a,x:unmatched=0"
  );
  assert.equal(attributes["data-viz-manim-tex-isolation-scene-id"], "tex-isolation-scene");
  assert.equal(attributes["data-viz-manim-tex-isolation-token-count"], "5");
  assert.equal(attributes["data-viz-manim-tex-isolation-isolated-token-count"], "4");
  assert.equal(attributes["data-viz-manim-tex-isolation-selector-summary"], "concept:function-rule,parameter-a,x");
  assert.equal(attributes["data-viz-manim-tex-isolation-occurrence-summary"], evidence.occurrenceSummary);
  assert.equal(attributes["data-viz-manim-tex-isolation-source-contract"], TEX_ISOLATION_SOURCE_CONTRACT);
});

test("reports unmatched TeX selectors without corrupting isolated token state", () => {
  const plan = buildTexIsolationPlan(formula, [
    { selector: "missing-token", colorRole: "attention" },
    { selector: "b", colorRole: "trace" }
  ]);

  assert.deepEqual(plan.unmatchedSelectors, ["missing-token"]);
  assert.deepEqual(
    plan.entries.filter((entry) => entry.isolated).map((entry) => [entry.tokenId, entry.colorRole]),
    [["constant-b", "trace"]]
  );
});

test("matches Manim TeX substring selectors inside composite token text", () => {
  const compositeFormula: FormulaSpec = {
    id: "substring-formula",
    latex: "$f(x)=x^2+1$",
    tokens: [
      { id: "function-token", text: "f(x)", conceptId: "function-rule" },
      { id: "power-token", text: "x^2", conceptId: "squared-input" }
    ]
  };
  const plan = buildTexIsolationPlan(compositeFormula, [
    { selector: "x", colorRole: "probe" },
    { selector: "concept:function-rule", colorRole: "function" }
  ]);

  assert.deepEqual(plan.unmatchedSelectors, []);
  assert.deepEqual(
    plan.entries.filter((entry) => entry.isolated).map((entry) => [
      entry.tokenId,
      entry.selector,
      entry.colorRole,
      entry.matchedText,
      entry.occurrence
    ]),
    [
      ["function-token", "concept:function-rule", "function", "f(x)", 0],
      ["power-token", "x", "probe", "x", 0]
    ]
  );
});

test("builds deterministic TeX isolation cache keys independent of rule order", () => {
  const left = texIsolationCacheKey(formula, [
    { selector: "x", colorRole: "probe" },
    { selector: "parameter-a", colorRole: "parameter" }
  ]);
  const right = texIsolationCacheKey(formula, [
    { selector: "parameter-a", colorRole: "parameter" },
    { selector: "x", colorRole: "probe" }
  ]);

  assert.equal(left, right);
  assert.match(left, /quadratic-formula/);
  assert.match(left, /parameter-a/);
});

test("formula layer consumes TeX isolation rules while preserving semantic object bindings", () => {
  const layer = buildFormulaLayerState(scene, {
    activeConceptId: "opening-parameter",
    texIsolationRules: [
      { selector: "parameter-a", colorRole: "parameter" },
      { selector: "x", colorRole: "probe" }
    ]
  });
  const tokens = layer.formulas[0].tokens;

  assert.equal(layer.texIsolationCacheKeys["quadratic-formula"], texIsolationCacheKey(formula, [
    { selector: "parameter-a", colorRole: "parameter" },
    { selector: "x", colorRole: "probe" }
  ]));
  assert.equal(tokens[2].id, "parameter-a");
  assert.equal(tokens[2].active, true);
  assert.equal(tokens[2].texIsolated, true);
  assert.equal(tokens[2].texIsolationSelector, "parameter-a");
  assert.equal(tokens[2].colorRole, "parameter");
  assert.deepEqual(tokens[2].boundObjectIds, ["opening-vector"]);
  assert.equal(tokens[1].texIsolationOccurrence, 0);
  assert.equal(tokens[3].texIsolationOccurrence, 1);
  assert.deepEqual(layer.texIsolationUnmatchedSelectors, []);
});

test("TeX isolation stays pure and FormulaLayer imports it as a source contract", () => {
  const isolationSource = fs.readFileSync("components/visualizations/three/manim/mathTexIsolation.ts", "utf8");
  const layerSource = fs.readFileSync("components/visualizations/three/manim/mathFormulaLayer.ts", "utf8");

  assert.doesNotMatch(isolationSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(layerSource, /buildTexIsolationPlan/);
});
