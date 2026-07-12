import assert from "node:assert/strict";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildTexColorMap,
  serializeTexColorMap,
  texColorMapDataAttributes
} from "./mathTexColorMap";

const fixtureScene: MathSceneSpec = {
  bindings: [
    { conceptId: "function-rule", formulaId: "curve-formula", objectId: "curve", tokenId: "function-token" },
    { conceptId: "current-point", formulaId: "curve-formula", objectId: "probe", tokenId: "point-token" }
  ],
  cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
    worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  },
  diagnostics: {
    expectedBindingCount: 2,
    expectedObjectCount: 3,
    expectedTokenCount: 3
  },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "curve-formula",
      latex: "$f(x)=x^2$",
      tokens: [
        { conceptId: "function-rule", id: "function-token", text: "f(x)" },
        { conceptId: "current-point", id: "point-token", text: "P" },
        { conceptId: "loose-concept", id: "loose-token", text: "loose" }
      ]
    }
  ],
  objects: [
    { type: "axis3d", id: "axes", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "coordinate-frame" },
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" },
    { type: "movingPoint", id: "probe", pathObjectId: "curve", colorRole: "probe", conceptId: "current-point" }
  ],
  sceneId: "mais-manim-tex-color-fixture",
  timeline: [{ type: "wait", duration: 1 }]
};

test("TeX color map binds formula tokens to Manim object color roles deterministically", () => {
  const colorMap = buildTexColorMap(fixtureScene);

  assert.equal(colorMap.sceneId, fixtureScene.sceneId);
  assert.equal(colorMap.familyId, "three-function-graph");
  assert.equal(colorMap.entryCount, 3);
  assert.equal(colorMap.tokenCount, 3);
  assert.equal(colorMap.boundTokenCount, 2);
  assert.equal(colorMap.unmatchedTokenCount, 1);
  assert.equal(colorMap.sourceContract, "Tex.tex_to_color_map|Tex.t2c|Tex.isolate");
  assert.deepEqual(colorMap.colorSourceCounts, {
    binding: 2,
    reference: 1,
    "tex-isolation": 0
  });
  assert.equal(colorMap.colorSourceSummary, "binding=2:tex-isolation=0:reference=1");
  assert.equal(colorMap.texIsolatedTokenCount, 0);
  assert.equal(colorMap.texIsolationSelectorCount, 0);
  assert.deepEqual(colorMap.colorRoles, ["function", "probe", "reference"]);
  assert.equal(
    colorMap.summary,
    "tex-color-map:mais-manim-tex-color-fixture:entries=3:tokens=3:bound=2:unmatched=1:roles=function,probe,reference"
  );
  assert.deepEqual(
    colorMap.entries.map((entry) => ({
      bound: entry.bound,
      colorHex: entry.colorHex,
      colorRole: entry.colorRole,
      objectId: entry.objectId,
      selector: entry.selector,
      tokenId: entry.tokenId
    })),
    [
      {
        bound: true,
        colorHex: "#22d3ee",
        colorRole: "function",
        objectId: "curve",
        selector: "[data-viz-manim-formula-token=\"function-token\"]",
        tokenId: "function-token"
      },
      {
        bound: true,
        colorHex: "#facc15",
        colorRole: "probe",
        objectId: "probe",
        selector: "[data-viz-manim-formula-token=\"point-token\"]",
        tokenId: "point-token"
      },
      {
        bound: false,
        colorHex: "#94a3b8",
        colorRole: "reference",
        objectId: undefined,
        selector: "[data-viz-manim-formula-token=\"loose-token\"]",
        tokenId: "loose-token"
      }
    ]
  );
});

test("TeX color map accepts Manim-style t2c isolation overrides without changing binding counts", () => {
  const colorMap = buildTexColorMap(fixtureScene, {
    texIsolationRules: [
      { colorRole: "attention", selector: "concept:function-rule" },
      { colorRole: "surface", selector: "loose-token" },
      { colorRole: "trace", selector: "missing-selector" }
    ]
  });

  assert.equal(colorMap.boundTokenCount, 2);
  assert.equal(colorMap.unmatchedTokenCount, 1);
  assert.equal(colorMap.colorSourceCounts.binding, 1);
  assert.equal(colorMap.colorSourceCounts["tex-isolation"], 2);
  assert.equal(colorMap.colorSourceCounts.reference, 0);
  assert.equal(colorMap.colorSourceSummary, "binding=1:tex-isolation=2:reference=0");
  assert.equal(colorMap.texIsolatedTokenCount, 2);
  assert.equal(colorMap.texIsolationSelectorCount, 2);
  assert.deepEqual(colorMap.unmatchedSelectors, ["missing-selector"]);
  assert.deepEqual(
    colorMap.entries.map((entry) => [entry.tokenId, entry.colorRole, entry.colorSource]),
    [
      ["function-token", "attention", "tex-isolation"],
      ["point-token", "probe", "binding"],
      ["loose-token", "surface", "tex-isolation"]
    ]
  );
});

test("TeX color map counts repeated Manim isolation selectors separately from colored occurrences", () => {
  const repeatedSelectorScene: MathSceneSpec = {
    ...fixtureScene,
    bindings: [],
    formulas: [
      {
        id: "repeated-selector-formula",
        latex: "$x+x$",
        tokens: [
          { conceptId: "input-variable", id: "input-token-0", text: "x" },
          { conceptId: "input-variable", id: "input-token-1", text: "x" }
        ]
      }
    ],
    sceneId: "mais-manim-tex-color-repeated-selector"
  };
  const colorMap = buildTexColorMap(repeatedSelectorScene, {
    texIsolationRules: [{ colorRole: "probe", selector: "x" }]
  });

  assert.equal(colorMap.texIsolatedTokenCount, 2);
  assert.equal(colorMap.texIsolationSelectorCount, 1);
  assert.equal(colorMap.colorSourceCounts["tex-isolation"], 2);
  assert.equal(colorMap.colorSourceSummary, "binding=0:tex-isolation=2:reference=0");
});

test("TeX color map exposes browser QA data attributes and escaped JSON", () => {
  const colorMap = buildTexColorMap(fixtureScene);
  const attributes = texColorMapDataAttributes(colorMap);
  const json = serializeTexColorMap(colorMap);

  assert.equal(attributes["data-viz-manim-tex-color-map-scene-id"], fixtureScene.sceneId);
  assert.equal(attributes["data-viz-manim-tex-color-map-entry-count"], "3");
  assert.equal(attributes["data-viz-manim-tex-color-map-token-count"], "3");
  assert.equal(attributes["data-viz-manim-tex-color-map-bound-token-count"], "2");
  assert.equal(attributes["data-viz-manim-tex-color-map-source-contract"], "Tex.tex_to_color_map|Tex.t2c|Tex.isolate");
  assert.equal(attributes["data-viz-manim-tex-color-map-binding-source-count"], "2");
  assert.equal(attributes["data-viz-manim-tex-color-map-tex-isolation-source-count"], "0");
  assert.equal(attributes["data-viz-manim-tex-color-map-reference-source-count"], "1");
  assert.equal(attributes["data-viz-manim-tex-color-map-source-summary"], "binding=2:tex-isolation=0:reference=1");
  assert.equal(attributes["data-viz-manim-tex-color-map-tex-isolated-token-count"], "0");
  assert.equal(attributes["data-viz-manim-tex-color-map-tex-isolation-selector-count"], "0");
  assert.equal(attributes["data-viz-manim-tex-color-map-unmatched-token-count"], "1");
  assert.equal(attributes["data-viz-manim-tex-color-map-unmatched-selector-count"], "0");
  assert.equal(attributes["data-viz-manim-tex-color-map-unmatched-selectors"], "none");
  assert.equal(attributes["data-viz-manim-tex-color-map-role-count"], "3");
  assert.equal(
    attributes["data-viz-manim-tex-color-map-summary"],
    "tex-color-map:mais-manim-tex-color-fixture:entries=3:tokens=3:bound=2:unmatched=1:roles=function,probe,reference"
  );
  assert.doesNotMatch(json, /</);
  assert.equal(JSON.parse(json).entryCount, 3);
});
