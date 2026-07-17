import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { FormulaSpec, MathSceneSpec } from "./mathSceneTypes";
import { SVG_PATH_MORPH_SOURCE_CONTRACT, type FormulaSvgPathMorphSpec } from "./mathSvgPathMorph";

const formula: FormulaSpec = {
  id: "morph-formula",
  latex: "$a \\to b$",
  tokens: [
    { conceptId: "source-symbol", id: "source-token", text: "a" },
    { conceptId: "target-symbol", id: "target-token", text: "b" }
  ]
};

const morphSpec: FormulaSvgPathMorphSpec = {
  formulaId: "morph-formula",
  id: "a-to-b",
  sourcePath: "M 0 0 L 10 0 L 10 10 Z",
  sourceTokenId: "source-token",
  targetPath: "M 0 2 L 8 2 L 8 12 Z",
  targetTokenId: "target-token"
};

const scene: MathSceneSpec = {
  bindings: [],
  cameraShots: [{ fov: 48, id: "overview", position: [3, 3, 4], target: [0, 0.7, 0] }],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 2 },
  familyId: "three-function-graph",
  formulaSvgMorphs: [morphSpec],
  formulas: [formula],
  objects: [],
  sceneId: "svg-path-morph-scene",
  timeline: [{ type: "highlight", conceptId: "source-symbol", duration: 1 }]
};

test("Formula SVG morph evidence summarizes SVGMobject-style glyph path frames for browser QA", async () => {
  const module = await import("./mathFormulaSvgMorphEvidence") as typeof import("./mathFormulaSvgMorphEvidence");
  const evidence = module.buildFormulaSvgMorphEvidence(scene, {
    progress: 0.5
  });
  const attributes = module.formulaSvgMorphEvidenceDataAttributes(evidence);

  assert.equal(evidence.morphCount, 1);
  assert.equal(evidence.compatibleMorphCount, 1);
  assert.equal(evidence.issueCount, 0);
  assert.equal(evidence.commandCount, 5);
  assert.equal(evidence.cacheKeyCount, 1);
  assert.equal(evidence.morphIds, "a-to-b");
  assert.equal(evidence.progress, 0.5);
  assert.equal(evidence.framePathPreview, "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z");
  assert.equal(evidence.issueSummary, "none");
  assert.equal(evidence.sourceContract, SVG_PATH_MORPH_SOURCE_CONTRACT);
  assert.equal(evidence.summary, "svg-morph:svg-path-morph-scene:morphs=1:compatible=1:issues=0:commands=5:progress=0.500");
  assert.equal(attributes["data-viz-manim-svg-morph-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-compatible-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-issue-count"], "0");
  assert.equal(attributes["data-viz-manim-svg-morph-command-count"], "5");
  assert.equal(attributes["data-viz-manim-svg-morph-cache-key-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-ids"], "a-to-b");
  assert.equal(attributes["data-viz-manim-svg-morph-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-svg-morph-frame-path-preview"], "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z");
  assert.equal(attributes["data-viz-manim-svg-morph-issue-summary"], "none");
  assert.equal(attributes["data-viz-manim-svg-morph-source-contract"], SVG_PATH_MORPH_SOURCE_CONTRACT);
  assert.equal(attributes["data-viz-manim-svg-morph-summary"], evidence.summary);
});

test("Formula SVG morph evidence stays pure and consumes the SVG path morph subsystem", () => {
  const sourcePath = "components/visualizations/three/manim/mathFormulaSvgMorphEvidence.ts";

  assert.ok(fs.existsSync(sourcePath), "MAIS Manim should expose a pure Formula SVG morph evidence module");
  const source = fs.readFileSync(sourcePath, "utf8");

  assert.match(source, /buildFormulaSvgMorphPlan/);
  assert.match(source, /interpolateSvgPathMorph/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
