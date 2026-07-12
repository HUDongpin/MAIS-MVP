import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY,
  FORMULA_LAYER_SOURCE_CONTRACT,
  buildActiveProjectedLabelTextByObjectId,
  buildFormulaLayerState,
  formulaLayerActiveTokenDataAttributes,
  formulaLayerProjectedLabelTextDataAttributes,
  summarizeActiveProjectedLabelText,
  summarizeFormulaLayerActiveTokens
} from "./mathFormulaLayer";
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
  assert.equal(
    state.sourceContract,
    "Tex/StringMobject fixed-in-frame FormulaLayer|semantic token ids|token-to-object bindings"
  );
  assert.equal(state.sourceContract, FORMULA_LAYER_SOURCE_CONTRACT);
  assert.equal(state.formulas[0].tokens.length, 2);
  assert.deepEqual(state.activeObjectIds, ["curve"]);
  assert.deepEqual(state.activeObjectAnchorNames, { curve: "center" });
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

test("carries FormulaBinding anchor names into active projected label placement", () => {
  const scene: MathSceneSpec = {
    ...validScene,
    bindings: validScene.bindings.map((binding) =>
      binding.objectId === "curve" ? { ...binding, anchorName: "upperRight" } : binding
    )
  };

  const state = buildFormulaLayerState(scene, { activeConceptId: "function-rule" });

  assert.deepEqual(state.activeObjectIds, ["curve"]);
  assert.deepEqual(state.activeObjectAnchorNames, { curve: "upperRight" });
});

test("builds active projected label text from formula token bindings", () => {
  const state = buildFormulaLayerState(validScene, { activeConceptId: "function-rule" });

  assert.equal(
    FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY,
    "active FormulaLayer projected labels use bound formula token text instead of internal concept ids"
  );
  assert.deepEqual(buildActiveProjectedLabelTextByObjectId(state), {
    curve: "f(x)"
  });
});

test("activates formula labels when the timeline active id is a bound object id", () => {
  const state = buildFormulaLayerState(validScene, { activeConceptId: "curve" });
  const summary = summarizeActiveProjectedLabelText(state);
  const attributes = formulaLayerProjectedLabelTextDataAttributes(summary);

  assert.deepEqual(state.activeObjectIds, ["curve"]);
  assert.deepEqual(buildActiveProjectedLabelTextByObjectId(state), {
    curve: "f(x)"
  });
  assert.equal(summary.objectCount, 1);
  assert.equal(summary.objectIds, "curve");
  assert.equal(summary.textSummary, "curve=f(x)");
  assert.equal(summary.sourceContract, FORMULA_LAYER_SOURCE_CONTRACT);
  assert.equal(summary.policy, FORMULA_LAYER_PROJECTED_LABEL_TEXT_POLICY);
  assert.equal(attributes["data-viz-manim-projected-label-text-source"], "formula-token");
  assert.equal(attributes["data-viz-manim-projected-label-text-object-ids"], "curve");
  assert.equal(attributes["data-viz-manim-projected-label-text-token-summary"], "curve=f(x)");
  assert.match(
    attributes["data-viz-manim-projected-label-text-summary"],
    /projectedLabelText=1:source=formula-token:objects=curve:labels=curve=f\(x\)/
  );
});

test("combines multiple timeline focus ids for FormulaLayer projected labels", () => {
  const state = buildFormulaLayerState(validScene, {
    activeConceptId: "probe-point",
    activeConceptIds: ["point", "curve"]
  });
  const summary = summarizeActiveProjectedLabelText(state);

  assert.deepEqual(state.activeObjectIds, ["curve", "point"]);
  assert.deepEqual(buildActiveProjectedLabelTextByObjectId(state), {
    curve: "f(x)",
    point: "(x,f(x))"
  });
  assert.equal(summary.objectCount, 2);
  assert.equal(summary.objectIds, "curve,point");
  assert.equal(summary.textSummary, "curve=f(x)|point=(x,f(x))");
  assert.equal(
    summary.summary,
    "projectedLabelText=2:source=formula-token:objects=curve,point:labels=curve=f(x)|point=(x,f(x))"
  );
});

test("summarizes active formula token ids for QA attributes", () => {
  const state = buildFormulaLayerState(validScene, {
    activeConceptId: "function-rule",
    activeConceptIds: ["function-token", "point"]
  });
  const summary = summarizeFormulaLayerActiveTokens(state);
  const attributes = formulaLayerActiveTokenDataAttributes(summary);

  assert.deepEqual(summary, {
    activeObjectIds: "curve,point",
    activeTokenCount: 2,
    activeTokenIds: "function-token,point-token",
    sourceContract: FORMULA_LAYER_SOURCE_CONTRACT,
    summary: "activeFormulaTokens=2:ids=function-token,point-token:objects=curve,point"
  });
  assert.deepEqual(attributes, {
    "data-viz-manim-active-token-count": "2",
    "data-viz-manim-active-token-ids": "function-token,point-token",
    "data-viz-manim-active-token-object-ids": "curve,point",
    "data-viz-manim-active-token-source-contract": FORMULA_LAYER_SOURCE_CONTRACT,
    "data-viz-manim-active-token-summary": "activeFormulaTokens=2:ids=function-token,point-token:objects=curve,point"
  });
});

test("combines multiple active formula token labels for the same object", () => {
  const scene: MathSceneSpec = {
    ...validScene,
    formulas: [
      {
        ...validScene.formulas[0],
        tokens: [
          ...validScene.formulas[0].tokens,
          { conceptId: "function-rule", id: "rule-token", text: "rule" }
        ]
      }
    ],
    bindings: [
      ...validScene.bindings,
      { conceptId: "function-rule", formulaId: "formula", objectId: "curve", tokenId: "rule-token" }
    ],
    diagnostics: {
      ...validScene.diagnostics,
      expectedBindingCount: 3,
      expectedTokenCount: 3
    }
  };
  const state = buildFormulaLayerState(scene, { activeConceptId: "function-rule" });

  assert.deepEqual(buildActiveProjectedLabelTextByObjectId(state), {
    curve: "f(x) + rule"
  });
});

test("keeps all formula tokens inactive when no concept is active", () => {
  const state = buildFormulaLayerState(validScene);

  assert.deepEqual(state.activeObjectIds, []);
  assert.deepEqual(state.activeObjectAnchorNames, {});
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
  assert.match(source, /data-viz-manim-formula-layer-source-contract/);
  assert.match(source, /data-viz-manim-formula=/);
  assert.match(source, /data-viz-manim-formula-svg=/);
  assert.match(source, /data-viz-manim-bound-object-ids/);
  assert.match(source, /data-viz-manim-token-color-role/);
  assert.match(source, /data-viz-manim-token-index/);
  assert.match(source, /formulaLayerActiveTokenDataAttributes/);
  assert.match(source, /data-viz-manim-active-token-count/);
  assert.match(source, /data-viz-manim-active-token-ids/);
  assert.match(source, /data-viz-manim-active-token-object-ids/);
  assert.match(source, /data-viz-manim-tex-isolated/);
  assert.match(source, /data-viz-manim-tex-isolation-selector/);
  assert.match(source, /data-viz-manim-tex-isolation-occurrence/);
  assert.match(source, /data-viz-manim-tex-isolation-cache-key/);
  assert.match(source, /buildTexColorizedFormula/);
  assert.match(source, /texColorizedFormulaDataAttributes/);
  assert.match(source, /text=\{colorizedFormula\.latex\}/);
  assert.match(source, /data-viz-manim-tex-colorized-source-contract/);
  assert.match(source, /data-viz-manim-tex-colorized-colored-token-count/);
  assert.match(source, /data-viz-manim-tex-colorized-uncolored-token-count/);
});

test("MathFormulaOverlay renders projected spatial label anchors separately from fixed formulas", () => {
  const source = readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");

  assert.match(source, /buildProjectedLabelAnchorsFromRuntimeState/);
  assert.match(source, /activeConceptIds = \[\]/);
  assert.match(source, /activeConceptIds\?: string\[\]/);
  assert.match(source, /buildFormulaLayerState\(scene, \{ activeConceptId, activeConceptIds \}\)/);
  assert.match(source, /buildFormulaOverlayCollisionDiagnostics/);
  assert.match(source, /formulaOverlayCollisionDataAttributes/);
  assert.match(source, /projectedLabelAnchorDataAttributes/);
  assert.match(source, /formulaLayerProjectedLabelTextDataAttributes/);
  assert.match(source, /summarizeActiveProjectedLabelText/);
  assert.match(source, /summarizeProjectedLabelAnchors/);
  assert.match(source, /buildActiveProjectedLabelTextByObjectId/);
  assert.match(source, /activeObjectAnchorNames/);
  assert.match(source, /activeProjectedLabelTextByObjectId/);
  assert.match(source, /anchorForObject/);
  assert.match(source, /textForObject: \(node\) => activeProjectedLabelTextByObjectId\[node\.id\] \?\? node\.conceptId/);
  assert.match(source, /const projectedLabelAnchors = runtimeState/);
  assert.match(source, /const projectedLabels = projectedLabelAnchors\.filter\(\(label\) => label\.visible\)/);
  assert.match(source, /data-viz-manim-projected-label-count=\{projectedLabelAttributes\["data-viz-manim-projected-label-count"\]\}/);
  assert.match(source, /data-viz-manim-projected-label-visible-count/);
  assert.match(source, /data-viz-manim-projected-label-hidden-count/);
  assert.match(source, /data-viz-manim-projected-label-object-ids/);
  assert.match(source, /data-viz-manim-projected-label-summary/);
  assert.match(source, /data-viz-manim-projected-label-text-source=\{projectedLabelTextAttributes\["data-viz-manim-projected-label-text-source"\]\}/);
  assert.match(source, /data-viz-manim-projected-label-text-policy/);
  assert.match(source, /data-viz-manim-projected-label-text-summary/);
  assert.match(source, /data-viz-manim-projected-label-text-token-summary/);
  assert.match(source, /data-viz-manim-formula-collision-count/);
  assert.match(source, /data-viz-manim-formula-safe-area-status/);
  assert.match(source, /projectedLabelViewportSource = "fallback"/);
  assert.match(source, /projectedLabelViewportSource\?: "fallback" \| "measured"/);
  assert.match(source, /data-viz-manim-formula-viewport-width=\{viewportWidth\.toFixed\(0\)\}/);
  assert.match(source, /data-viz-manim-formula-viewport-height=\{viewportHeight\.toFixed\(0\)\}/);
  assert.match(source, /data-viz-manim-formula-viewport-source=\{projectedLabelViewportSource\}/);
  assert.match(source, /data-viz-manim-projected-label=/);
  assert.match(source, /data-viz-manim-projected-object-id/);
  assert.match(source, /data-viz-manim-projected-anchor-name/);
  assert.match(source, /data-viz-manim-projected-screen-x/);
  assert.match(source, /data-viz-manim-projected-screen-y/);
  assert.match(source, /data-viz-manim-projected-label-text=\{label\.text\}/);
  assert.match(source, /runtimeState\?: MathSceneRuntimeState/);
});

test("FormulaLayer exposes limited SVG path morph readiness for formula glyph continuity", () => {
  const source = readFileSync("components/visualizations/three/manim/mathFormulaLayer.ts", "utf8");
  const overlaySource = readFileSync("components/visualizations/three/manim/MathFormulaOverlay.tsx", "utf8");

  assert.match(source, /buildFormulaSvgMorphPlan/);
  assert.match(source, /svgPathMorphCacheKeys/);
  assert.match(source, /svgPathMorphCount/);
  assert.match(source, /svgPathMorphIssues/);
  assert.match(source, /scene\.formulaSvgMorphs/);
  assert.match(overlaySource, /data-viz-manim-svg-morph=/);
  assert.match(overlaySource, /buildFormulaSvgMorphRuntime/);
  assert.match(overlaySource, /data-viz-manim-svg-morph-runtime-frame/);
  assert.match(overlaySource, /data-viz-manim-svg-morph-runtime-source-contract/);
  assert.match(overlaySource, /runtimeState\?\.timeline\.easedLocalProgress/);
  assert.match(overlaySource, /svgPathMorphCacheKeys/);
});
