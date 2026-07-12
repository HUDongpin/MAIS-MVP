import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  MOBJECT_INVALIDATION_SOURCE_CONTRACT,
  buildMobjectInvalidationPlan,
  classifyMobjectInvalidationOwnership,
  invalidatedMobjectIds,
  serializeMobjectInvalidationPlan,
  summarizeMobjectInvalidationOwnership,
  summarizeMobjectInvalidationReasons,
  summarizeMobjectInvalidation
} from "./mathMobjectInvalidation";
import type { MathObjectGraph, RuntimeMathObjectNode, RuntimeRenderState } from "./mathSceneRuntimeState";

function node(overrides: Partial<RuntimeMathObjectNode> = {}): RuntimeMathObjectNode {
  const base: RuntimeMathObjectNode = {
    boundingBox: { center: [0.5, 0.5, 0], kind: "finite", max: [1, 1, 0], min: [0, 0, 0] },
    childIds: [],
    colorRole: "function",
    conceptId: "line-rule",
    id: "line",
    renderState: {
      kind: "polyline",
      points: [
        [0, 0, 0],
        [1, 1, 0]
      ]
    },
    spec: {
      colorRole: "function",
      conceptId: "line-rule",
      id: "line",
      samples: [
        [0, 0, 0],
        [1, 1, 0]
      ],
      type: "parametricCurve"
    },
    type: "parametricCurve"
  };

  return { ...base, ...overrides };
}

function graph(nodes: RuntimeMathObjectNode[]): MathObjectGraph {
  return {
    byId: Object.fromEntries(nodes.map((entry) => [entry.id, entry])),
    rootIds: nodes.filter((entry) => !entry.parentId).map((entry) => entry.id)
  };
}

test("marks render data changes as data dirty and bounding-box stale", () => {
  const previous = graph([node()]);
  const next = graph([
    node({
      boundingBox: { center: [1, 1, 0], kind: "finite", max: [2, 2, 0], min: [0, 0, 0] },
      renderState: {
        kind: "polyline",
        points: [
          [0, 0, 0],
          [2, 2, 0]
        ]
      }
    })
  ]);

  const plan = buildMobjectInvalidationPlan(previous, next);
  const record = plan.byId.line;

  assert.equal(plan.sourceContract, MOBJECT_INVALIDATION_SOURCE_CONTRACT);
  assert.match(MOBJECT_INVALIDATION_SOURCE_CONTRACT, /_data_has_changed/);
  assert.match(MOBJECT_INVALIDATION_SOURCE_CONTRACT, /_needs_new_bounding_box/);
  assert.match(MOBJECT_INVALIDATION_SOURCE_CONTRACT, /family/);
  assert.equal(record.dataHasChanged, true);
  assert.equal(record.needsNewBoundingBox, true);
  assert.equal(record.familyHasChanged, false);
  assert.deepEqual(record.reasons, ["render-state-changed", "bounding-box-changed"]);
  assert.equal(plan.dataChangedCount, 1);
  assert.equal(plan.boundingBoxStaleCount, 1);
  assert.deepEqual(invalidatedMobjectIds(plan), ["line"]);
  assert.equal(summarizeMobjectInvalidationReasons(plan), "line:render-state-changed,bounding-box-changed");
});

test("marks family mutations without pretending render data changed", () => {
  const previous = graph([node({ childIds: ["probe"] })]);
  const next = graph([node({ childIds: ["probe", "trace"] })]);
  const plan = buildMobjectInvalidationPlan(previous, next);
  const record = plan.byId.line;

  assert.equal(record.dataHasChanged, false);
  assert.equal(record.familyHasChanged, true);
  assert.equal(record.needsNewBoundingBox, true);
  assert.deepEqual(record.reasons, ["family-changed"]);
});

test("does not mark a Mobject dirty when only a stale stored bounding-box cache is refreshed", () => {
  const axesNode: RuntimeMathObjectNode = {
    boundingBox: { kind: "empty" },
    childIds: [],
    conceptId: "coordinate-frame",
    id: "axes",
    renderState: {
      kind: "axes",
      xAxisPoints: [[-2, 0, 0], [2, 0, 0]],
      yAxisPoints: [[0, -1, 0], [0, 3, 0]],
      zAxisPoints: [[0, 0, -4], [0, 0, 4]]
    },
    spec: { type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-1, 3], z: [-4, 4] }, conceptId: "coordinate-frame" },
    type: "axis3d"
  };
  const previous = graph([axesNode]);
  const next = graph([
    {
      ...axesNode,
      boundingBox: { center: [0, 1, 0], kind: "finite", max: [2, 3, 4], min: [-2, -1, -4] }
    }
  ]);
  const plan = buildMobjectInvalidationPlan(previous, next);
  const record = plan.byId.axes;

  assert.equal(record.dataHasChanged, false);
  assert.equal(record.needsNewBoundingBox, false);
  assert.deepEqual(record.reasons, []);
  assert.equal(plan.boundingBoxStaleCount, 0);
  assert.equal(plan.unchangedCount, 1);
  assert.deepEqual(invalidatedMobjectIds(plan), []);
  assert.equal(summarizeMobjectInvalidationReasons(plan), "none");
});

test("marks uniform changes as data dirty without stale bounding boxes", () => {
  const previous = graph([
    node({
      uniforms: {
        clippingPlanes: [],
        fixedInFrame: false,
        opacity: 1,
        shadeIn3D: false
      }
    })
  ]);
  const next = graph([
    node({
      uniforms: {
        clippingPlanes: [],
        fixedInFrame: false,
        opacity: 0.4,
        shadeIn3D: false
      }
    })
  ]);
  const plan = buildMobjectInvalidationPlan(previous, next);
  const record = plan.byId.line;

  assert.equal(record.dataHasChanged, true);
  assert.equal(record.uniformsHaveChanged, true);
  assert.equal(record.metadataHasChanged, false);
  assert.equal(record.needsNewBoundingBox, false);
  assert.deepEqual(record.reasons, ["uniforms-changed"]);
  assert.equal(plan.dataChangedCount, 1);
  assert.equal(plan.uniformsChangedCount, 1);
  assert.equal(plan.metadataChangedCount, 0);
  assert.equal(plan.boundingBoxStaleCount, 0);
  assert.equal(summarizeMobjectInvalidation(plan), "data=1;bbox=0;family=0;metadata=0;uniforms=1;unchanged=0");
});

test("reports entering and exiting mobjects for cache diagnostics", () => {
  const previous = graph([node({ id: "old-line" })]);
  const next = graph([node({ id: "new-line" })]);
  const plan = buildMobjectInvalidationPlan(previous, next);

  assert.equal(plan.byId["old-line"].dataHasChanged, true);
  assert.equal(plan.byId["old-line"].needsNewBoundingBox, true);
  assert.deepEqual(plan.byId["old-line"].reasons, ["missing-next"]);
  assert.equal(plan.byId["new-line"].dataHasChanged, true);
  assert.equal(plan.byId["new-line"].needsNewBoundingBox, true);
  assert.deepEqual(plan.byId["new-line"].reasons, ["missing-previous"]);
  assert.equal(summarizeMobjectInvalidation(plan), "data=2;bbox=2;family=0;metadata=0;uniforms=0;unchanged=0");
  assert.deepEqual(invalidatedMobjectIds(plan), ["new-line", "old-line"]);
  assert.equal(summarizeMobjectInvalidationReasons(plan), "new-line:missing-previous|old-line:missing-next");
});

test("summarizes empty invalidation plans without noisy browser evidence", () => {
  const plan = buildMobjectInvalidationPlan(graph([node()]), graph([node()]));

  assert.deepEqual(invalidatedMobjectIds(plan), []);
  assert.equal(summarizeMobjectInvalidationReasons(plan), "none");
});

test("serializes invalidation plans as deterministic script-safe browser QA JSON", () => {
  const previous = graph([
    node({
      id: "curve</script>",
      renderState: {
        kind: "polyline",
        points: [[0, 0, 0]]
      }
    })
  ]);
  const next = graph([
    node({
      id: "curve</script>",
      renderState: {
        kind: "polyline",
        points: [
          [0, 0, 0],
          [1, 1, 0]
        ]
      }
    })
  ]);
  const plan = buildMobjectInvalidationPlan(previous, next);
  const serialized = serializeMobjectInvalidationPlan(plan);

  assert.equal(serialized, serializeMobjectInvalidationPlan(plan));
  assert.doesNotMatch(serialized, /<|<\/script>/i);

  const parsed = JSON.parse(serialized) as typeof plan;
  assert.equal(parsed.sourceContract, MOBJECT_INVALIDATION_SOURCE_CONTRACT);
  assert.deepEqual(parsed.objectIds, ["curve</script>"]);
  assert.deepEqual(parsed.byId["curve</script>"].reasons, ["render-state-changed", "bounding-box-changed"]);
  assert.equal(parsed.dataChangedCount, 1);
  assert.equal(parsed.boundingBoxStaleCount, 1);
});

test("classifies invalidation ownership for animation, updater, and unknown churn", () => {
  const previous = graph([
    node({ id: "animated-line" }),
    node({ id: "updater-line" }),
    node({ id: "unknown-line" }),
    node({ id: "stable-line" })
  ]);
  const changedRenderState: RuntimeRenderState = {
    kind: "polyline",
    points: [
      [0, 0, 0],
      [2, 2, 0]
    ]
  };
  const next = graph([
    node({ id: "animated-line", renderState: changedRenderState }),
    node({ id: "updater-line", renderState: changedRenderState }),
    node({ id: "unknown-line", renderState: changedRenderState }),
    node({ id: "stable-line" })
  ]);
  const plan = buildMobjectInvalidationPlan(previous, next);
  const ownership = classifyMobjectInvalidationOwnership(plan, {
    animationOwnedObjectIds: ["animated-line"],
    activeUpdaterObjectIds: ["updater-line"]
  });

  assert.equal(ownership.animationOwnedInvalidationCount, 1);
  assert.equal(ownership.updaterActiveInvalidationCount, 1);
  assert.equal(ownership.unknownInvalidationCount, 1);
  assert.equal(ownership.byId["animated-line"].ownership, "animation-owned");
  assert.equal(ownership.byId["updater-line"].ownership, "updater-active");
  assert.equal(ownership.byId["unknown-line"].ownership, "unknown");
  assert.equal(summarizeMobjectInvalidationOwnership(ownership), "animated-line:animation-owned|unknown-line:unknown|updater-line:updater-active");
});

test("Mobject invalidation source contract stays pure for runtime evidence", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathMobjectInvalidation.ts", "utf8");
  const evidenceSource = fs.readFileSync("components/visualizations/three/manim/mathEvidenceHarness.ts", "utf8");

  assert.match(source, /MOBJECT_INVALIDATION_SOURCE_CONTRACT/);
  assert.match(source, /buildMobjectInvalidationPlan/);
  assert.match(source, /classifyMobjectInvalidationOwnership/);
  assert.match(source, /invalidatedMobjectIds/);
  assert.match(source, /serializeMobjectInvalidationPlan/);
  assert.match(source, /stableSerialize/);
  assert.match(source, /summarizeMobjectInvalidationOwnership/);
  assert.match(source, /summarizeMobjectInvalidationReasons/);
  assert.match(source, /summarizeMobjectInvalidation/);
  assert.match(evidenceSource, /mathMobjectInvalidation/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
});
