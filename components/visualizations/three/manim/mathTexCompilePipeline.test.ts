import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";

type MathTexCompilePipelineModule = {
  TEX_COMPILE_PIPELINE_SOURCE_CONTRACT: string;
  buildMathTexCompilePipeline: (
    scene: MathSceneSpec,
    options?: { engine?: "latex" | "xelatex" }
  ) => {
    cacheHitEligibleCount: number;
    cacheKeyCount: number;
    commandCount: number;
    documentCount: number;
    documentSourceLengthRange: string;
    documentTemplateCount: number;
    dvisvgmCount: number;
    engineIds: string[];
    formulaCount: number;
    intermediateExtensions: string[];
    rows: Array<{
      cacheKey: string;
      documentPath: string;
      documentSourceLength: number;
      dvisvgmCommand: string;
      engine: "latex" | "xelatex";
      engineCommand: string;
      formulaId: string;
      intermediatePath: string;
      ready: boolean;
      stepSequence: string;
      svgPath: string;
    }>;
    sceneId: string;
    signature: string;
    sourceContract: string;
    sourceSummary: string;
    stepSequence: string;
    summary: string;
    svgOutputCount: number;
  };
  serializeMathTexCompilePipeline: (
    plan: ReturnType<MathTexCompilePipelineModule["buildMathTexCompilePipeline"]>
  ) => string;
  texCompilePipelineDataAttributes: (
    plan: ReturnType<MathTexCompilePipelineModule["buildMathTexCompilePipeline"]>
  ) => Record<string, string>;
};

const modulePath = "components/visualizations/three/manim/mathTexCompilePipeline.ts";

const fixtureScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [{ id: "overview", position: [2, 2, 2], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] },
    worldRange: { x: [-1, 1], y: [-1, 1], z: [-1, 1] }
  },
  diagnostics: {
    expectedBindingCount: 0,
    expectedObjectCount: 0,
    expectedTokenCount: 2
  },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "curve-formula",
      latex: "$f(x)=x^2$",
      tokens: [
        { conceptId: "input", id: "input-token", text: "x" },
        { conceptId: "output", id: "output-token", text: "f(x)" }
      ]
    }
  ],
  objects: [],
  sceneId: "mais-manim-tex-compile-fixture",
  timeline: [{ type: "wait", duration: 1 }]
};

async function importTexCompilePipelineModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure TeX latex_to_svg compile-pipeline module");
  return await import("./mathTexCompilePipeline") as MathTexCompilePipelineModule;
}

test("buildMathTexCompilePipeline models Manim latex_to_svg compile steps without running shell commands", async () => {
  const { TEX_COMPILE_PIPELINE_SOURCE_CONTRACT, buildMathTexCompilePipeline } = await importTexCompilePipelineModule();
  const plan = buildMathTexCompilePipeline(fixtureScene, { engine: "xelatex" });

  assert.equal(plan.sceneId, "mais-manim-tex-compile-fixture");
  assert.equal(plan.sourceContract, TEX_COMPILE_PIPELINE_SOURCE_CONTRACT);
  assert.match(plan.sourceContract, /latex_to_svg/);
  assert.match(plan.sourceContract, /standalone/);
  assert.match(plan.sourceContract, /latex\/xelatex/);
  assert.match(plan.sourceContract, /dvisvgm/);
  assert.match(plan.sourceContract, /cache/);
  assert.equal(plan.formulaCount, 1);
  assert.equal(plan.documentCount, 1);
  assert.equal(plan.documentTemplateCount, 1);
  assert.equal(plan.documentSourceLengthRange, `${plan.rows[0].documentSourceLength}..${plan.rows[0].documentSourceLength}`);
  assert.equal(plan.commandCount, 2);
  assert.equal(plan.dvisvgmCount, 1);
  assert.equal(plan.svgOutputCount, 1);
  assert.equal(plan.cacheKeyCount, 1);
  assert.equal(plan.cacheHitEligibleCount, 1);
  assert.deepEqual(plan.engineIds, ["xelatex"]);
  assert.deepEqual(plan.intermediateExtensions, ["xdv"]);
  assert.equal(plan.stepSequence, "standalone-document>xelatex>dvisvgm>svg-cache");
  assert.equal(
    plan.sourceSummary,
    "latex_to_svg:documents=1:templates=1:engine=xelatex:intermediate=xdv:dvisvgm=1:cache=1"
  );
  assert.match(plan.signature, /^tex-compile-[0-9a-f]{8}$/);
  assert.equal(
    plan.summary,
    "tex-compile:mais-manim-tex-compile-fixture:formulas=1:documents=1:commands=2:engine=xelatex:dvisvgm=1:cache=1"
  );
  assert.equal(plan.rows.length, 1);
  assert.equal(plan.rows[0].formulaId, "curve-formula");
  assert.match(plan.rows[0].cacheKey, /^tex-entry-[0-9a-f]{8}$/);
  assert.equal(plan.rows[0].documentPath, `${plan.rows[0].cacheKey}.tex`);
  assert.equal(plan.rows[0].intermediatePath, `${plan.rows[0].cacheKey}.xdv`);
  assert.equal(plan.rows[0].svgPath, `${plan.rows[0].cacheKey}.svg`);
  assert.equal(plan.rows[0].stepSequence, "standalone-document>xelatex>dvisvgm>svg-cache");
  assert.match(plan.rows[0].engineCommand, /^xelatex -interaction=batchmode -halt-on-error tex-entry-[0-9a-f]{8}\.tex$/);
  assert.match(plan.rows[0].dvisvgmCommand, /^dvisvgm --no-fonts --exact --output=tex-entry-[0-9a-f]{8}\.svg tex-entry-[0-9a-f]{8}\.xdv$/);
  assert.ok(plan.rows[0].documentSourceLength > fixtureScene.formulas[0].latex.length);
});

test("texCompilePipelineDataAttributes exposes stable browser QA evidence", async () => {
  const {
    TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
    buildMathTexCompilePipeline,
    texCompilePipelineDataAttributes
  } = await importTexCompilePipelineModule();
  const plan = buildMathTexCompilePipeline(fixtureScene, { engine: "xelatex" });

  assert.deepEqual(texCompilePipelineDataAttributes(plan), {
    "data-viz-manim-tex-compile-cache-hit-eligible-count": "1",
    "data-viz-manim-tex-compile-cache-key-count": "1",
    "data-viz-manim-tex-compile-command-count": "2",
    "data-viz-manim-tex-compile-document-count": "1",
    "data-viz-manim-tex-compile-document-source-length-range": `${plan.rows[0].documentSourceLength}..${plan.rows[0].documentSourceLength}`,
    "data-viz-manim-tex-compile-document-template-count": "1",
    "data-viz-manim-tex-compile-dvisvgm-count": "1",
    "data-viz-manim-tex-compile-engine-ids": "xelatex",
    "data-viz-manim-tex-compile-formula-count": "1",
    "data-viz-manim-tex-compile-intermediate-extensions": "xdv",
    "data-viz-manim-tex-compile-source-contract": TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
    "data-viz-manim-tex-compile-source-summary": plan.sourceSummary,
    "data-viz-manim-tex-compile-step-sequence": "standalone-document>xelatex>dvisvgm>svg-cache",
    "data-viz-manim-tex-compile-svg-output-count": "1",
    "data-viz-manim-tex-compile-summary": plan.summary
  });
});

test("TeX compile pipeline serializes safely and documents the Manim source contract", async () => {
  const {
    TEX_COMPILE_PIPELINE_SOURCE_CONTRACT,
    buildMathTexCompilePipeline,
    serializeMathTexCompilePipeline
  } = await importTexCompilePipelineModule();
  const plan = buildMathTexCompilePipeline(fixtureScene);
  const serialized = serializeMathTexCompilePipeline(plan);
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(serialized, /<\/script|undefined|NaN|Infinity/i);
  assert.equal(JSON.parse(serialized).rows[0].engine, "latex");
  assert.equal(JSON.parse(serialized).sourceContract, TEX_COMPILE_PIPELINE_SOURCE_CONTRACT);
  assert.match(source, /latex_to_svg/);
  assert.match(source, /TEX_COMPILE_PIPELINE_SOURCE_CONTRACT/);
  assert.match(source, /standalone/);
  assert.match(source, /dvisvgm/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
