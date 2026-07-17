import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";
import {
  buildFormulaSvgMorphRuntime,
  formulaSvgMorphRuntimeDataAttributes,
  FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT
} from "./mathFormulaSvgMorphRuntime";

const scene: MathSceneSpec = {
  bindings: [],
  cameraShots: [{ fov: 48, id: "overview", position: [3, 3, 4], target: [0, 0.7, 0] }],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [0, 2], z: [-1, 1] }
  },
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 2 },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "morph-formula",
      latex: "$a \\to b$",
      tokens: [
        { conceptId: "source-symbol", id: "source-token", text: "a" },
        { conceptId: "target-symbol", id: "target-token", text: "b" }
      ]
    }
  ],
  formulaSvgMorphs: [
    {
      formulaId: "morph-formula",
      id: "a-to-b",
      sourcePath: "M 0 0 L 10 0 L 10 10 Z",
      sourceTokenId: "source-token",
      targetPath: "M 0 2 L 8 2 L 8 12 Z",
      targetTokenId: "target-token"
    }
  ],
  objects: [],
  sceneId: "svg-path-morph-runtime-scene",
  timeline: [{ type: "highlight", conceptId: "source-symbol", duration: 1 }]
};

test("builds runtime SVG morph frames from scene-authored formula morph specs", () => {
  const runtime = buildFormulaSvgMorphRuntime(scene, {
    formulaId: "morph-formula",
    progress: 0.5
  });

  assert.equal(runtime.sourceContract, FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT);
  assert.equal(runtime.sceneId, "svg-path-morph-runtime-scene");
  assert.equal(runtime.formulaId, "morph-formula");
  assert.equal(runtime.frameCount, 1);
  assert.equal(runtime.compatibleFrameCount, 1);
  assert.equal(runtime.issueCount, 0);
  assert.equal(runtime.progress, 0.5);
  assert.equal(runtime.summary, "svg-morph-runtime:svg-path-morph-runtime-scene:formula=morph-formula:frames=1:compatible=1:issues=0:progress=0.500");
  assert.deepEqual(runtime.frames.map((frame) => ({
    commandCount: frame.commandCount,
    compatible: frame.compatible,
    id: frame.id,
    issueSummary: frame.issueSummary,
    path: frame.path,
    progress: frame.progress,
    sourceTokenId: frame.sourceTokenId,
    targetTokenId: frame.targetTokenId
  })), [
    {
      commandCount: 5,
      compatible: true,
      id: "a-to-b",
      issueSummary: "none",
      path: "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z",
      progress: 0.5,
      sourceTokenId: "source-token",
      targetTokenId: "target-token"
    }
  ]);
});

test("exposes Formula SVG morph runtime QA data attributes", () => {
  const runtime = buildFormulaSvgMorphRuntime(scene, {
    formulaId: "morph-formula",
    progress: 0.5
  });
  const attributes = formulaSvgMorphRuntimeDataAttributes(runtime);

  assert.equal(attributes["data-viz-manim-svg-morph-runtime-scene-id"], "svg-path-morph-runtime-scene");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-formula-id"], "morph-formula");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-compatible-frame-count"], "1");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-issue-count"], "0");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-frame-ids"], "a-to-b");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-progress"], "0.500");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-frame-path-preview"], "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z");
  assert.equal(attributes["data-viz-manim-svg-morph-runtime-source-contract"], FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT);
  assert.equal(
    attributes["data-viz-manim-svg-morph-runtime-summary"],
    "svg-morph-runtime:svg-path-morph-runtime-scene:formula=morph-formula:frames=1:compatible=1:issues=0:progress=0.500"
  );
});

test("reports missing formula without throwing during overlay rendering", () => {
  const runtime = buildFormulaSvgMorphRuntime(scene, {
    formulaId: "missing-formula",
    progress: 0.5
  });

  assert.equal(runtime.frameCount, 0);
  assert.equal(runtime.compatibleFrameCount, 0);
  assert.equal(runtime.issueCount, 1);
  assert.equal(runtime.summary, "svg-morph-runtime:svg-path-morph-runtime-scene:formula=missing-formula:frames=0:compatible=0:issues=1:progress=0.500");
});

test("keeps Formula SVG morph runtime pure and renderer independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathFormulaSvgMorphRuntime.ts", "utf8");

  assert.match(source, /buildFormulaSvgMorphPlan/);
  assert.match(source, /interpolateSvgPathMorph/);
  assert.match(source, /FORMULA_SVG_MORPH_RUNTIME_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window|document/);
});
