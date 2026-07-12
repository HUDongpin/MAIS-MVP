import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildFormulaLayerState } from "./mathFormulaLayer";
import {
  buildFormulaSvgMorphPlan,
  interpolateSvgPathMorph,
  normalizeSvgPathForMorph,
  parseSvgPathCommands,
  SVG_PATH_MORPH_SOURCE_CONTRACT,
  svgPathMorphCacheKey,
  summarizeSvgPathMorphPlan,
  type FormulaSvgPathMorphSpec
} from "./mathSvgPathMorph";
import type { FormulaSpec, MathSceneSpec } from "./mathSceneTypes";

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

function roundedCommands(commands: ReturnType<typeof parseSvgPathCommands>) {
  return commands.map((command) => ({
    ...command,
    values: command.values.map((value) => Number(value.toFixed(6)))
  }));
}

test("parses a limited SVG path command stream for formula glyph morphing", () => {
  const commands = parseSvgPathCommands("M0 0 L10 0 C10 5 5 10 0 10 Z");

  assert.deepEqual(commands, [
    { type: "M", values: [0, 0] },
    { type: "L", values: [10, 0] },
    { type: "C", values: [10, 5, 5, 10, 0, 10] },
    { type: "Z", values: [] }
  ]);
});

test("parses compact SVG path commands with implicit repeated coordinate groups", () => {
  const commands = parseSvgPathCommands("M 0 0 10 0 10 10 L 5 5 6 6 C 1 1 2 2 3 3 4 4 5 5 6 6 Z");

  assert.deepEqual(commands, [
    { type: "M", values: [0, 0] },
    { type: "L", values: [10, 0] },
    { type: "L", values: [10, 10] },
    { type: "L", values: [5, 5] },
    { type: "L", values: [6, 6] },
    { type: "C", values: [1, 1, 2, 2, 3, 3] },
    { type: "C", values: [4, 4, 5, 5, 6, 6] },
    { type: "Z", values: [] }
  ]);
});

test("converts relative SVG path commands into absolute formula glyph coordinates", () => {
  const commands = parseSvgPathCommands("M 10 10 l 5 0 0 5 c 1 1 2 2 3 3 z");

  assert.deepEqual(commands, [
    { type: "M", values: [10, 10] },
    { type: "L", values: [15, 10] },
    { type: "L", values: [15, 15] },
    { type: "C", values: [16, 16, 17, 17, 18, 18] },
    { type: "Z", values: [] }
  ]);
});

test("parses uppercase scientific notation in SVG path coordinates", () => {
  const commands = parseSvgPathCommands("M 1E1 1E-1 L 2E1 3E-1 Z");

  assert.deepEqual(commands, [
    { type: "M", values: [10, 0.1] },
    { type: "L", values: [20, 0.3] },
    { type: "Z", values: [] }
  ]);
});

test("normalizes horizontal and vertical SVG path commands into absolute line segments", () => {
  const commands = parseSvgPathCommands("M 10 10 h 5 v 5 H 20 V 30 z");

  assert.deepEqual(commands, [
    { type: "M", values: [10, 10] },
    { type: "L", values: [15, 10] },
    { type: "L", values: [15, 15] },
    { type: "L", values: [20, 15] },
    { type: "L", values: [20, 30] },
    { type: "Z", values: [] }
  ]);
});

test("normalizes quadratic SVG path commands into cubic curve segments", () => {
  const commands = parseSvgPathCommands("M 0 0 Q 10 20 20 0 q 10 -20 20 0 Z");

  assert.deepEqual(roundedCommands(commands), [
    { type: "M", values: [0, 0] },
    { type: "C", values: [6.666667, 13.333333, 13.333333, 13.333333, 20, 0] },
    { type: "C", values: [26.666667, -13.333333, 33.333333, -13.333333, 40, 0] },
    { type: "Z", values: [] }
  ]);
});

test("normalizes smooth cubic SVG path commands into explicit cubic segments", () => {
  const commands = parseSvgPathCommands("M 0 0 C 10 10 20 10 30 0 S 50 -10 60 0 s 20 10 30 0 Z");

  assert.deepEqual(roundedCommands(commands), [
    { type: "M", values: [0, 0] },
    { type: "C", values: [10, 10, 20, 10, 30, 0] },
    { type: "C", values: [40, -10, 50, -10, 60, 0] },
    { type: "C", values: [70, 10, 80, 10, 90, 0] },
    { type: "Z", values: [] }
  ]);
});

test("does not reflect arc-converted cubic control points into following smooth cubic commands", () => {
  const commands = parseSvgPathCommands("M 0 0 A 1 1 0 0 1 1 1 S 2 2 3 3");

  assert.deepEqual(roundedCommands(commands).at(-1), {
    type: "C",
    values: [1, 1, 2, 2, 3, 3]
  });
});

test("normalizes smooth quadratic SVG path commands into cubic curve segments", () => {
  const commands = parseSvgPathCommands("M 0 0 Q 10 20 20 0 T 40 0 t 20 0 Z");

  assert.deepEqual(roundedCommands(commands), [
    { type: "M", values: [0, 0] },
    { type: "C", values: [6.666667, 13.333333, 13.333333, 13.333333, 20, 0] },
    { type: "C", values: [26.666667, -13.333333, 33.333333, -13.333333, 40, 0] },
    { type: "C", values: [46.666667, 13.333333, 53.333333, 13.333333, 60, 0] },
    { type: "Z", values: [] }
  ]);
});

test("normalizes SVG arc commands into cubic curve segments before formula glyph morphing", () => {
  const commands = parseSvgPathCommands("M 1 0 A 1 1 0 0 1 0 1 Z");
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "M 1 0 A 1 1 0 0 1 0 1 Z",
    targetPath: "M 1 0 C 1 0.552285 0.552285 1 0 1 Z"
  });

  assert.deepEqual(roundedCommands(commands), [
    { type: "M", values: [1, 0] },
    { type: "C", values: [1, 0.552285, 0.552285, 1, 0, 1] },
    { type: "Z", values: [] }
  ]);
  assert.equal(plan.compatible, true);
  assert.deepEqual(plan.issues, []);
});

test("aligns cubic-only SVG morph paths by splitting lower-resolution cubic segments", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "M 1 0 A 1 1 0 0 1 -1 0 Z",
    targetPath: "M 1 0 C 1 1.10457 -1 1.10457 -1 0 Z"
  });

  assert.equal(plan.compatible, true);
  assert.deepEqual(plan.issues, []);
  assert.deepEqual(
    plan.sourceCommands.map((command) => command.type),
    ["M", "C", "C", "C", "Z"]
  );
  assert.deepEqual(
    plan.targetCommands.map((command) => command.type),
    ["M", "C", "C", "C", "Z"]
  );
});

test("aligns open cubic-only SVG morph paths without requiring a close command", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "M 0 0 C 1 0 1 1 2 1 C 3 1 3 2 4 2",
    targetPath: "M 0 0 C 1 0 3 2 4 2"
  });

  assert.equal(plan.compatible, true);
  assert.deepEqual(plan.issues, []);
  assert.deepEqual(
    plan.sourceCommands.map((command) => command.type),
    ["M", "C", "C"]
  );
  assert.deepEqual(
    plan.targetCommands.map((command) => command.type),
    ["M", "C", "C"]
  );
});

test("aligns multi-subpath cubic SVG morph paths subpath by subpath", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "M 0 0 C 1 0 1 1 2 1 C 3 1 3 2 4 2 Z M 10 0 C 11 0 11 1 12 1 Z",
    targetPath: "M 0 0 C 1 0 3 2 4 2 Z M 10 0 C 11 0 11 1 12 1 Z"
  });

  assert.equal(plan.compatible, true);
  assert.deepEqual(plan.issues, []);
  assert.deepEqual(
    plan.sourceCommands.map((command) => command.type),
    ["M", "C", "C", "C", "Z", "M", "C", "C", "Z"]
  );
  assert.deepEqual(
    plan.targetCommands.map((command) => command.type),
    ["M", "C", "C", "C", "Z", "M", "C", "C", "Z"]
  );
});

test("normalizes line segments and implicit closepath edges into cubic segments before SVG morph alignment", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "M 0 0 L 3 0 Z",
    targetPath: "M 0 0 C 1 0 2 0 3 0 C 2 0 1 0 0 0 Z"
  });

  assert.equal(plan.compatible, true);
  assert.deepEqual(plan.issues, []);
  assert.deepEqual(roundedCommands(plan.sourceCommands), [
    { type: "M", values: [0, 0] },
    { type: "C", values: [1, 0, 2, 0, 3, 0] },
    { type: "C", values: [2, 0, 1, 0, 0, 0] },
    { type: "Z", values: [] }
  ]);
});

test("normalizes compatible path pairs into a deterministic morph plan", () => {
  const plan = normalizeSvgPathForMorph(morphSpec);

  assert.equal(plan.id, "a-to-b");
  assert.equal(plan.compatible, true);
  assert.deepEqual(plan.issues, []);
  assert.equal(plan.commandCount, 5);
  assert.equal(plan.sourceTokenId, "source-token");
  assert.equal(plan.targetTokenId, "target-token");
});

test("interpolates compatible formula SVG paths with clamped progress", () => {
  const plan = normalizeSvgPathForMorph(morphSpec);
  const midpoint = interpolateSvgPathMorph(plan, 0.5);
  const finalFrame = interpolateSvgPathMorph(plan, 10);

  assert.equal(midpoint.progress, 0.5);
  assert.equal(midpoint.path, "M 0 1 C 3 1 6 1 9 1 C 9 4.333333 9 7.666667 9 11 C 6 7.666667 3 4.333333 0 1 Z");
  assert.equal(finalFrame.progress, 1);
  assert.equal(finalFrame.path, "M 0 2 C 2.666667 2 5.333333 2 8 2 C 8 5.333333 8 8.666667 8 12 C 5.333333 8.666667 2.666667 5.333333 0 2 Z");
});

test("reports incompatible SVG glyph paths instead of silently morphing wrong commands", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    id: "bad-morph",
    targetPath: "M 0 0 C 1 1 2 2 3 3"
  });
  const frame = interpolateSvgPathMorph(plan, 0.5);

  assert.equal(plan.compatible, false);
  assert.ok(plan.issues.includes("command-count:4->2"));
  assert.equal(frame.path, morphSpec.sourcePath);
  assert.equal(frame.progress, 0);
});

test("reports incomplete SVG path command groups before formula glyph morphing", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "M 0 0 L 10",
    targetPath: "M 0 0 L 10 0"
  });

  assert.equal(plan.compatible, false);
  assert.ok(plan.issues.includes("source-incomplete-command:L@4:expected=2:remaining=1"));
});

test("reports SVG glyph paths that do not start with a move command", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "L 10 0 L 10 10",
    targetPath: "M 0 0 L 10 0 L 10 10"
  });

  assert.equal(plan.compatible, false);
  assert.ok(plan.issues.includes("source-path-start:not-move:L"));
});

test("reports empty SVG glyph paths before formula morphing", () => {
  const plan = normalizeSvgPathForMorph({
    ...morphSpec,
    sourcePath: "   ",
    targetPath: "M 0 0 L 10 0"
  });

  assert.equal(plan.compatible, false);
  assert.ok(plan.issues.includes("source-path-empty"));
});

test("formula layer consumes SVG path morph specs as a source contract", () => {
  const layer = buildFormulaLayerState(scene, { svgPathMorphs: [morphSpec] });

  assert.equal(layer.svgPathMorphCount, 1);
  assert.deepEqual(layer.svgPathMorphIssues, []);
  assert.equal(layer.svgPathMorphCacheKeys["a-to-b"], svgPathMorphCacheKey(morphSpec));
  assert.equal(
    SVG_PATH_MORPH_SOURCE_CONTRACT,
    "Tex/SVGMobject SVG path pipeline|SVGMobject path commands|interpolate SVG path morph"
  );
});

test("formula layer consumes scene-authored SVG path morph specs by default", () => {
  const layer = buildFormulaLayerState(scene);

  assert.equal(layer.svgPathMorphCount, 1);
  assert.deepEqual(layer.svgPathMorphIssues, []);
  assert.equal(layer.svgPathMorphCacheKeys["a-to-b"], svgPathMorphCacheKey(morphSpec));
});

test("summarizes formula SVG morph plans for QA evidence", () => {
  const plan = buildFormulaSvgMorphPlan(formula, [morphSpec]);
  const summary = summarizeSvgPathMorphPlan(plan);

  assert.deepEqual(summary, {
    compatibleMorphCount: 1,
    formulaId: "morph-formula",
    issueCount: 0,
    morphCount: 1
  });
});

test("SVG path morphing stays pure and imported by the formula layer", () => {
  const morphSource = fs.readFileSync("components/visualizations/three/manim/mathSvgPathMorph.ts", "utf8");
  const formulaLayerSource = fs.readFileSync("components/visualizations/three/manim/mathFormulaLayer.ts", "utf8");

  assert.match(morphSource, /parseSvgPathCommands/);
  assert.match(morphSource, /normalizeSvgPathForMorph/);
  assert.match(formulaLayerSource, /buildFormulaSvgMorphPlan/);
  assert.doesNotMatch(morphSource, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
