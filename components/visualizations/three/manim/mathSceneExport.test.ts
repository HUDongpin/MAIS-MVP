import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import type { MathSceneSpec } from "./mathSceneTypes";

type ApprovedSceneSpecExport = {
  approvedForRuntime: boolean;
  cameraShotCount: number;
  exportVersion: "mais-manim-scene-spec/v1";
  familyId: string;
  formulaTokenCount: number;
  json: string;
  objectCount: number;
  sceneId: string;
  semanticBindingCount: number;
  sourceContract: typeof expectedSceneExportSourceContract;
  signature: string;
  timelineStepCount: number;
};

type MathSceneExportModule = {
  SCENE_EXPORT_SOURCE_CONTRACT: typeof expectedSceneExportSourceContract;
  buildApprovedSceneSpecExport: (scene: MathSceneSpec) => ApprovedSceneSpecExport;
  sceneSpecExportDataAttributes: (exportPlan: ApprovedSceneSpecExport) => Record<string, string>;
  stableSerializeMathSceneSpec: (scene: MathSceneSpec) => string;
};

const exportModulePath = "components/visualizations/three/manim/mathSceneExport.ts";
const expectedSceneExportSourceContract =
  "SceneSpec export: stable JSON scene spec, approval contract, deterministic signature, and runtime artifact" as const;

function buildFunctionGraphSpec() {
  const spec = buildMathSceneSpecForThreeDFamily({
    accent: "#22d3ee",
    state: {
      comparison: 5,
      depthValue: 1.4,
      familyId: "three-function-graph",
      mode: 0,
      primaryValue: 6,
      secondaryValue: 5,
      stateSummary: "family=three-function-graph;template=function-graph;value=6.000;comparison=5.000;depth=1.400",
      templateId: "function-graph",
      value: 6
    }
  });

  if (!spec) throw new Error("expected function graph MAIS Manim spec");
  return spec;
}

function assertFiniteJsonValues(value: unknown, path = "$") {
  if (typeof value === "number") {
    assert.equal(Number.isFinite(value), true, `${path} should be finite`);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteJsonValues(entry, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertFiniteJsonValues(entry, `${path}.${key}`);
    }
  }
}

async function importExportModule() {
  assert.ok(fs.existsSync(exportModulePath), "MAIS Manim should provide a pure scene spec export module");
  return (await import("./mathSceneExport")) as MathSceneExportModule;
}

test("serializes approved MAIS Manim scene specs with a stable signature", async () => {
  const {
    SCENE_EXPORT_SOURCE_CONTRACT,
    buildApprovedSceneSpecExport,
    stableSerializeMathSceneSpec
  } = await importExportModule();
  const spec = buildFunctionGraphSpec();
  const clonedSpec = JSON.parse(JSON.stringify(spec)) as MathSceneSpec;
  const stableJson = stableSerializeMathSceneSpec(spec);

  assert.equal(stableSerializeMathSceneSpec(clonedSpec), stableJson);
  assert.doesNotMatch(stableJson, /undefined|NaN|Infinity|<\/script/i);

  const parsedSpec = JSON.parse(stableJson) as MathSceneSpec;
  assert.equal(parsedSpec.sceneId, "mais-manim-function-graph");
  assert.equal(parsedSpec.familyId, "three-function-graph");
  assert.equal(parsedSpec.randomSeed?.algorithm, "mulberry32");
  assert.match(parsedSpec.randomSeed?.signature ?? "", /^rng-[0-9a-f]{8}$/);
  assert.equal(parsedSpec.objects.length, spec.objects.length);
  assert.equal(parsedSpec.timeline.length, spec.timeline.length);
  assertFiniteJsonValues(parsedSpec);

  const exportPlan = buildApprovedSceneSpecExport(spec);

  assert.equal(exportPlan.exportVersion, "mais-manim-scene-spec/v1");
  assert.equal(SCENE_EXPORT_SOURCE_CONTRACT, expectedSceneExportSourceContract);
  assert.equal(exportPlan.sourceContract, SCENE_EXPORT_SOURCE_CONTRACT);
  assert.equal(exportPlan.approvedForRuntime, true);
  assert.equal(exportPlan.sceneId, spec.sceneId);
  assert.equal(exportPlan.familyId, spec.familyId);
  assert.equal(exportPlan.objectCount, spec.objects.length);
  assert.equal(exportPlan.formulaTokenCount, spec.formulas.reduce((sum, formula) => sum + formula.tokens.length, 0));
  assert.equal(exportPlan.semanticBindingCount, spec.bindings.length);
  assert.equal(exportPlan.timelineStepCount, spec.timeline.length);
  assert.equal(exportPlan.cameraShotCount, spec.cameraShots.length);
  assert.equal(exportPlan.json, stableJson);
  assert.match(exportPlan.signature, /^fnv1a-[0-9a-f]{8}$/);
  assert.equal(buildApprovedSceneSpecExport(spec).signature, exportPlan.signature);
});

test("maps approved scene spec exports to browser QA data attributes", async () => {
  const {
    SCENE_EXPORT_SOURCE_CONTRACT,
    buildApprovedSceneSpecExport,
    sceneSpecExportDataAttributes
  } = await importExportModule();
  const exportPlan = buildApprovedSceneSpecExport(buildFunctionGraphSpec());

  assert.deepEqual(sceneSpecExportDataAttributes(exportPlan), {
    "data-viz-manim-scene-export-beat-count": String(exportPlan.timelineStepCount),
    "data-viz-manim-scene-export-formula-token-count": String(exportPlan.formulaTokenCount),
    "data-viz-manim-scene-export-object-count": String(exportPlan.objectCount),
    "data-viz-manim-scene-export-ready": "true",
    "data-viz-manim-scene-export-semantic-binding-count": String(exportPlan.semanticBindingCount),
    "data-viz-manim-scene-export-source-contract": SCENE_EXPORT_SOURCE_CONTRACT,
    "data-viz-manim-scene-export-signature": exportPlan.signature
  });
});

test("keeps approved scene spec export pure and renderer independent", () => {
  assert.ok(fs.existsSync(exportModulePath), "MAIS Manim export should live in its own pure module");
  const source = fs.readFileSync(exportModulePath, "utf8");

  assert.match(source, /import type \{ MathSceneSpec \} from "\.\/mathSceneTypes"/);
  assert.match(source, /SCENE_EXPORT_SOURCE_CONTRACT/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas/);
});
