import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import type { MathSceneSpec } from "./mathSceneTypes";

const expectedSourceContract =
  "TransformMatchingTex/TransformMatchingShapes: match source and target parts by key, transform matches, fade entering/exiting parts" as const;

type TransformMatchingStatus = "entering" | "exiting" | "matched";

type TransformMatchingPlan = {
  enteringCount: number;
  enteringIds: string;
  exitingCount: number;
  exitingIds: string;
  fadeInCount: number;
  fadeOutCount: number;
  issueCount: number;
  issueSummary: string;
  keyStrategySummary: string;
  matchedCount: number;
  matchedPairIds: string;
  planCount: number;
  planVersion: "mais-manim-transform-matching/v1";
  rowCount: number;
  rows: Array<{
    animation: "fadeIn" | "fadeOut" | "transform";
    index: number;
    kind: "object" | "token";
    matchKey: string;
    planId: string;
    sourceConceptId: string | null;
    sourceFormulaId: string | null;
    sourcePartId: string | null;
    sourceText: string | null;
    status: TransformMatchingStatus;
    targetConceptId: string | null;
    targetFormulaId: string | null;
    targetPartId: string | null;
    targetText: string | null;
  }>;
  signature: string;
  sourceContract: typeof expectedSourceContract;
  summary: string;
  transformCount: number;
};

type TransformMatchingModule = {
  TRANSFORM_MATCHING_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildTransformMatchingPlan: (scene: MathSceneSpec) => TransformMatchingPlan;
  serializeTransformMatchingPlan: (plan: TransformMatchingPlan) => string;
  transformMatchingDataAttributes: (plan: TransformMatchingPlan) => Record<string, string>;
};

const modulePath = "components/visualizations/three/manim/mathTransformMatching.ts";

const transformMatchingScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [{ id: "overview", position: [0, 0, 8], target: [0, 0, 0] }],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }
  },
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 0, expectedTokenCount: 6 },
  familyId: "three-function-graph",
  formulas: [
    {
      id: "before-formula",
      latex: "$x+a+y$",
      tokens: [
        { conceptId: "variable-x", id: "before-x", text: "x" },
        { conceptId: "parameter-a", id: "before-a", text: "a" },
        { conceptId: "variable-y", id: "before-y", text: "y" }
      ]
    },
    {
      id: "after-formula",
      latex: "$x+b+y$",
      tokens: [
        { conceptId: "variable-x", id: "after-x", text: "x" },
        { conceptId: "parameter-b", id: "after-b", text: "b" },
        { conceptId: "variable-y", id: "after-y", text: "y" }
      ]
    }
  ],
  matchingTransforms: [
    {
      id: "formula-rewrite",
      key: "conceptId",
      sourceFormulaId: "before-formula",
      targetFormulaId: "after-formula",
      type: "transformMatchingTex"
    }
  ],
  objects: [],
  sceneId: "matching-transform-scene",
  timeline: []
};

async function importTransformMatchingModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure TransformMatching source-distillation module");
  return (await import("./mathTransformMatching")) as TransformMatchingModule;
}

test("builds a TransformMatchingTex plan that preserves matched token identity", async () => {
  const { TRANSFORM_MATCHING_SOURCE_CONTRACT, buildTransformMatchingPlan } = await importTransformMatchingModule();
  const plan = buildTransformMatchingPlan(transformMatchingScene);

  assert.equal(TRANSFORM_MATCHING_SOURCE_CONTRACT, expectedSourceContract);
  assert.equal(plan.sourceContract, TRANSFORM_MATCHING_SOURCE_CONTRACT);
  assert.equal(plan.planCount, 1);
  assert.equal(plan.rowCount, 4);
  assert.equal(plan.matchedCount, 2);
  assert.equal(plan.enteringCount, 1);
  assert.equal(plan.exitingCount, 1);
  assert.equal(plan.transformCount, 2);
  assert.equal(plan.fadeInCount, 1);
  assert.equal(plan.fadeOutCount, 1);
  assert.equal(plan.matchedPairIds, "before-x->after-x,before-y->after-y");
  assert.equal(plan.enteringIds, "after-b");
  assert.equal(plan.exitingIds, "before-a");
  assert.equal(plan.keyStrategySummary, "formula-rewrite:conceptId");
  assert.equal(plan.issueCount, 0);
  assert.equal(plan.issueSummary, "none");
  assert.match(plan.signature, /^transform-matching-[0-9a-f]{8}$/);
  assert.equal(
    plan.summary,
    "transform-matching:matching-transform-scene:plans=1:rows=4:matched=2:entering=1:exiting=1:keys=formula-rewrite:conceptId"
  );
  assert.deepEqual(
    plan.rows.map((row) => [row.status, row.sourcePartId, row.targetPartId, row.matchKey, row.animation]),
    [
      ["matched", "before-x", "after-x", "variable-x", "transform"],
      ["exiting", "before-a", null, "parameter-a", "fadeOut"],
      ["matched", "before-y", "after-y", "variable-y", "transform"],
      ["entering", null, "after-b", "parameter-b", "fadeIn"]
    ]
  );
});

test("serializes TransformMatching plans as deterministic script-safe QA JSON", async () => {
  const { buildTransformMatchingPlan, serializeTransformMatchingPlan } = await importTransformMatchingModule();
  const scene: MathSceneSpec = {
    ...transformMatchingScene,
    formulas: [
      {
        id: "before-formula",
        latex: "$x</script>$",
        tokens: [{ conceptId: "danger", id: "before-danger", text: "</script>" }]
      },
      {
        id: "after-formula",
        latex: "$x$",
        tokens: [{ conceptId: "danger", id: "after-danger", text: "x" }]
      }
    ]
  };
  const plan = buildTransformMatchingPlan(scene);
  const json = serializeTransformMatchingPlan(plan);
  const parsed = JSON.parse(json) as TransformMatchingPlan;

  assert.equal(parsed.rows[0].sourcePartId, "before-danger");
  assert.doesNotMatch(json, /<\/script/i);
  assert.equal(serializeTransformMatchingPlan(JSON.parse(JSON.stringify(plan)) as TransformMatchingPlan), json);
});

test("maps TransformMatching evidence to Canvas data attributes", async () => {
  const { TRANSFORM_MATCHING_SOURCE_CONTRACT, buildTransformMatchingPlan, transformMatchingDataAttributes } =
    await importTransformMatchingModule();
  const plan = buildTransformMatchingPlan(transformMatchingScene);
  const attributes = transformMatchingDataAttributes(plan);

  assert.deepEqual(attributes, {
    "data-viz-manim-transform-matching-entering-count": "1",
    "data-viz-manim-transform-matching-entering-ids": "after-b",
    "data-viz-manim-transform-matching-exiting-count": "1",
    "data-viz-manim-transform-matching-exiting-ids": "before-a",
    "data-viz-manim-transform-matching-fade-in-count": "1",
    "data-viz-manim-transform-matching-fade-out-count": "1",
    "data-viz-manim-transform-matching-issue-count": "0",
    "data-viz-manim-transform-matching-issue-summary": "none",
    "data-viz-manim-transform-matching-key-strategies": "formula-rewrite:conceptId",
    "data-viz-manim-transform-matching-matched-count": "2",
    "data-viz-manim-transform-matching-matched-pair-ids": "before-x->after-x,before-y->after-y",
    "data-viz-manim-transform-matching-plan-count": "1",
    "data-viz-manim-transform-matching-row-count": "4",
    "data-viz-manim-transform-matching-signature": plan.signature,
    "data-viz-manim-transform-matching-source-contract": TRANSFORM_MATCHING_SOURCE_CONTRACT,
    "data-viz-manim-transform-matching-summary": plan.summary,
    "data-viz-manim-transform-matching-transform-count": "2"
  });
});

test("TransformMatching source module stays pure and renderer independent", () => {
  assert.ok(fs.existsSync(modulePath), "TransformMatching should live in a pure Manim math module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|window|document/);
  assert.match(source, /TransformMatchingTex/);
  assert.match(source, /TransformMatchingShapes/);
  assert.match(source, /ReplacementTransform/);
  assert.match(source, /buildTransformMatchingPlan/);
  assert.match(source, /serializeTransformMatchingPlan/);
  assert.match(source, /transformMatchingDataAttributes/);
});
