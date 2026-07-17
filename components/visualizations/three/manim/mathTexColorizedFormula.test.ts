import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildFormulaLayerState } from "./mathFormulaLayer";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildTexColorizedFormula,
  serializeTexColorizedFormula,
  texColorizedFormulaDataAttributes,
  TEX_COLORIZED_FORMULA_SOURCE_CONTRACT
} from "./mathTexColorizedFormula";

const fixtureScene: MathSceneSpec = {
  bindings: [
    { conceptId: "function-rule", formulaId: "colored-formula", objectId: "curve", tokenId: "function-token" },
    { conceptId: "input-variable", formulaId: "colored-formula", objectId: "probe", tokenId: "input-token-0" },
    { conceptId: "input-variable", formulaId: "colored-formula", objectId: "probe", tokenId: "input-token-1" }
  ],
  cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
    worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  },
  diagnostics: {
    expectedBindingCount: 3,
    expectedObjectCount: 3,
    expectedTokenCount: 4
  },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "colored-formula",
      latex: "$f(x)=x+x$",
      tokens: [
        { conceptId: "function-rule", id: "function-token", text: "f(x)" },
        { conceptId: "input-variable", id: "input-token-0", text: "x" },
        { conceptId: "input-variable", id: "input-token-1", text: "x" },
        { conceptId: "semantic-only", id: "semantic-token", text: "moving point" }
      ]
    }
  ],
  objects: [
    { type: "axis3d", id: "axes", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "coordinate-frame" },
    { type: "parametricCurve", id: "curve", samples: [[0, 0, 0], [1, 1, 0]], colorRole: "function", conceptId: "function-rule" },
    { type: "movingPoint", id: "probe", pathObjectId: "curve", colorRole: "probe", conceptId: "input-variable" }
  ],
  sceneId: "tex-colorized-formula-scene",
  timeline: [{ type: "wait", duration: 1 }]
};

test("injects Manim tex_to_color_map roles into the KaTeX formula input", () => {
  const layer = buildFormulaLayerState(fixtureScene);
  const colorized = buildTexColorizedFormula(layer.formulas[0]);

  assert.equal(colorized.sourceContract, TEX_COLORIZED_FORMULA_SOURCE_CONTRACT);
  assert.equal(colorized.formulaId, "colored-formula");
  assert.equal(colorized.tokenCount, 4);
  assert.equal(colorized.coloredTokenCount, 3);
  assert.equal(colorized.uncoloredTokenCount, 1);
  assert.equal(colorized.sourceCharacterCount, 8);
  assert.equal(colorized.coloredCharacterCount, 6);
  assert.equal(colorized.coverageRatio, 0.75);
  assert.deepEqual(colorized.coloredTokenIds, ["function-token", "input-token-0", "input-token-1"]);
  assert.deepEqual(colorized.uncoloredTokenIds, ["semantic-token"]);
  assert.equal(colorized.intervalOrderSummary, "function-token>input-token-0>input-token-1");
  assert.equal(
    colorized.coverageSummary,
    "coverage:colored=6:source=8:ratio=0.750:order=function-token>input-token-0>input-token-1"
  );
  assert.equal(colorized.roleSummary, "function,probe");
  assert.equal(colorized.originalLatex, "$f(x)=x+x$");
  assert.equal(
    colorized.latex,
    "$\\color{#22d3ee}{f(x)}=\\color{#facc15}{x}+\\color{#facc15}{x}$"
  );
  assert.equal(
    colorized.summary,
    "tex-colorized-formula:colored-formula:tokens=4:colored=3:uncolored=1:roles=function,probe"
  );
  assert.match(colorized.intervalSummary, /function-token@0-4=#22d3ee/);
  assert.match(colorized.intervalSummary, /input-token-0@5-6=#facc15/);
  assert.match(colorized.intervalSummary, /input-token-1@7-8=#facc15/);
});

test("uses TeX isolation color roles before formula rendering", () => {
  const layer = buildFormulaLayerState(fixtureScene, {
    texIsolationRules: [{ colorRole: "attention", selector: "x" }]
  });
  const colorized = buildTexColorizedFormula(layer.formulas[0]);

  assert.equal(
    colorized.latex,
    "$\\color{#22d3ee}{f(x)}=\\color{#fb7185}{x}+\\color{#fb7185}{x}$"
  );
  assert.equal(colorized.roleSummary, "attention,function");
});

test("colors only the isolated Manim TeX substring inside a larger token", () => {
  const layer = buildFormulaLayerState({
    ...fixtureScene,
    bindings: [],
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 1,
      expectedTokenCount: 1
    },
    formulas: [
      {
        id: "substring-formula",
        latex: "$x^2+1$",
        tokens: [{ conceptId: "squared-input", id: "power-token", text: "x^2" }]
      }
    ],
    objects: [
      { type: "axis3d", id: "axes", range: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }, conceptId: "coordinate-frame" }
    ],
    sceneId: "tex-colorized-substring-scene"
  }, {
    texIsolationRules: [{ colorRole: "probe", selector: "x" }]
  });
  const colorized = buildTexColorizedFormula(layer.formulas[0]);

  assert.equal(colorized.coloredTokenCount, 1);
  assert.deepEqual(colorized.coloredTokenIds, ["power-token"]);
  assert.equal(colorized.sourceCharacterCount, 5);
  assert.equal(colorized.coloredCharacterCount, 1);
  assert.equal(colorized.coverageRatio, 0.2);
  assert.equal(colorized.intervalOrderSummary, "power-token");
  assert.equal(colorized.coverageSummary, "coverage:colored=1:source=5:ratio=0.200:order=power-token");
  assert.equal(colorized.latex, "$\\color{#facc15}{x}^2+1$");
  assert.equal(colorized.intervalSummary, "power-token@0-1=#facc15");
});

test("maps plain Greek token selectors to TeX commands when possible", () => {
  const layer = buildFormulaLayerState({
    ...fixtureScene,
    bindings: [
      { conceptId: "phase-angle", formulaId: "greek-formula", objectId: "probe", tokenId: "theta-token" }
    ],
    formulas: [
      {
        id: "greek-formula",
        latex: "$\\theta+1$",
        tokens: [{ conceptId: "phase-angle", id: "theta-token", text: "theta" }]
      }
    ],
    sceneId: "tex-colorized-greek-scene"
  });
  const colorized = buildTexColorizedFormula(layer.formulas[0]);

  assert.equal(colorized.coloredTokenCount, 1);
  assert.equal(colorized.latex, "$\\color{#facc15}{\\theta}+1$");
});

test("exposes formula colorization QA data attributes", () => {
  const layer = buildFormulaLayerState(fixtureScene);
  const colorized = buildTexColorizedFormula(layer.formulas[0]);
  const attributes = texColorizedFormulaDataAttributes(colorized);

  assert.equal(attributes["data-viz-manim-tex-colorized-formula-id"], "colored-formula");
  assert.equal(attributes["data-viz-manim-tex-colorized-source-contract"], TEX_COLORIZED_FORMULA_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-tex-colorized-token-count"], "4");
  assert.equal(attributes["data-viz-manim-tex-colorized-colored-token-count"], "3");
  assert.equal(attributes["data-viz-manim-tex-colorized-uncolored-token-count"], "1");
  assert.equal(attributes["data-viz-manim-tex-colorized-source-character-count"], "8");
  assert.equal(attributes["data-viz-manim-tex-colorized-colored-character-count"], "6");
  assert.equal(attributes["data-viz-manim-tex-colorized-coverage-ratio"], "0.750");
  assert.equal(
    attributes["data-viz-manim-tex-colorized-interval-order-summary"],
    "function-token>input-token-0>input-token-1"
  );
  assert.equal(
    attributes["data-viz-manim-tex-colorized-coverage-summary"],
    "coverage:colored=6:source=8:ratio=0.750:order=function-token>input-token-0>input-token-1"
  );
  assert.equal(attributes["data-viz-manim-tex-colorized-colored-token-ids"], "function-token,input-token-0,input-token-1");
  assert.equal(attributes["data-viz-manim-tex-colorized-uncolored-token-ids"], "semantic-token");
  assert.equal(attributes["data-viz-manim-tex-colorized-role-summary"], "function,probe");
  assert.equal(
    attributes["data-viz-manim-tex-colorized-summary"],
    "tex-colorized-formula:colored-formula:tokens=4:colored=3:uncolored=1:roles=function,probe"
  );
});

test("serializes colorized TeX formulas as deterministic script-safe browser QA JSON", () => {
  const layer = buildFormulaLayerState({
    ...fixtureScene,
    formulas: [
      {
        id: "colored-formula",
        latex: "$f(x)</script>=x$",
        tokens: [
          { conceptId: "function-rule", id: "function-token", text: "f(x)" },
          { conceptId: "input-variable", id: "input-token", text: "x" }
        ]
      }
    ],
    sceneId: "tex-colorized-unsafe-scene"
  });
  const colorized = buildTexColorizedFormula(layer.formulas[0]);
  const serialized = serializeTexColorizedFormula(colorized);

  assert.equal(serializeTexColorizedFormula(JSON.parse(JSON.stringify(colorized)) as typeof colorized), serialized);
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
  assert.deepEqual(JSON.parse(serialized), colorized);
});

test("keeps TeX formula colorization pure and renderer independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathTexColorizedFormula.ts", "utf8");

  assert.match(source, /TEX_COLORIZED_FORMULA_SOURCE_CONTRACT/);
  assert.match(source, /texColorHexForRole/);
  assert.match(source, /\\\\color/);
  assert.match(source, /serializeTexColorizedFormula/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document/);
});
