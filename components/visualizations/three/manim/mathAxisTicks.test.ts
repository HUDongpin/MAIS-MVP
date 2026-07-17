import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  axisTickPlanDataAttributes,
  buildAxisTickPlan,
  serializeAxisTickPlan,
  summarizeAxisLabelAnchors,
  summarizeAxisTickPlan,
  summarizeAxisTickSpacing
} from "./mathAxisTicks";
import type { MathSceneSpec } from "./mathSceneTypes";

const axisScene: MathSceneSpec = {
  bindings: [],
  cameraShots: [],
  coordinateSpace: {
    mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
    worldRange: { x: [-4, 4], y: [-4, 4], z: [-2, 2] }
  },
  diagnostics: { expectedBindingCount: 0, expectedObjectCount: 1, expectedTokenCount: 0 },
  familyId: "three-function-graph",
  formulas: [],
  objects: [{ type: "axis3d", id: "axes", range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] }, conceptId: "coordinate-frame" }],
  sceneId: "axis-ticks-test",
  timeline: []
};

test("builds deterministic Manim-style ticks and labels for every 3D axis", () => {
  const plan = buildAxisTickPlan(axisScene, { targetTicksPerAxis: 5 });

  assert.equal(plan.axisObjectCount, 1);
  assert.equal(plan.tickCount, 15);
  assert.equal(plan.labelCount, 15);
  assert.equal(plan.labelAnchorCount, 15);
  assert.equal(plan.finiteLabelAnchorCount, 15);
  assert.equal(plan.finiteTickCount, 15);
  assert.equal(plan.majorTickCount, 9);
  assert.equal(plan.spacingMaxDelta, 0);
  assert.equal(plan.ticks.filter((tick) => tick.axis === "x").length, 5);
  assert.equal(plan.ticks.filter((tick) => tick.axis === "y").length, 5);
  assert.equal(plan.ticks.filter((tick) => tick.axis === "z").length, 5);

  const xOriginTick = plan.ticks.find((tick) => tick.axis === "x" && tick.label === "0");

  assert.ok(xOriginTick, "x-axis origin tick should be labeled");
  assert.deepEqual(xOriginTick.worldPosition, [0, 0, 0]);
  assert.equal(xOriginTick.conceptId, "coordinate-frame:x:0");
  assert.deepEqual(
    plan.labelAnchors.find((anchor) => anchor.conceptId === xOriginTick.conceptId)?.labelWorldPosition,
    [0, -0.18, 0]
  );
  assert.equal(summarizeAxisTickPlan(plan), "axes:axis-ticks-test:axisObjects=1:ticks=15:labels=15:finite=15");
  assert.equal(summarizeAxisLabelAnchors(plan), "axisLabelAnchors:axis-ticks-test:count=15:finite=15:offset=0.180:axes=x,y,z");
  assert.equal(summarizeAxisTickSpacing(plan), "axisSpacing:axis-ticks-test:x=2.000,y=2.000,z=1.000:maxDelta=0.000000:major=9");
});

test("exposes axis tick counts as stable browser QA data attributes", () => {
  const plan = buildAxisTickPlan(axisScene, { targetTicksPerAxis: 5 });

  assert.deepEqual(axisTickPlanDataAttributes(plan), {
    "data-viz-manim-axis-finite-tick-count": "15",
    "data-viz-manim-axis-label-anchor-count": "15",
    "data-viz-manim-axis-label-anchor-finite-count": "15",
    "data-viz-manim-axis-label-anchor-summary": "axisLabelAnchors:axis-ticks-test:count=15:finite=15:offset=0.180:axes=x,y,z",
    "data-viz-manim-axis-label-count": "15",
    "data-viz-manim-axis-major-tick-count": "9",
    "data-viz-manim-axis-object-count": "1",
    "data-viz-manim-axis-spacing-max-delta": "0.000000",
    "data-viz-manim-axis-spacing-summary": "axisSpacing:axis-ticks-test:x=2.000,y=2.000,z=1.000:maxDelta=0.000000:major=9",
    "data-viz-manim-axis-summary": "axes:axis-ticks-test:axisObjects=1:ticks=15:labels=15:finite=15",
    "data-viz-manim-axis-tick-count": "15"
  });
});

test("serializes axis ticks as deterministic script-safe browser QA JSON", () => {
  const plan = buildAxisTickPlan(
    {
      ...axisScene,
      objects: [
        {
          type: "axis3d",
          id: "axes<script>",
          range: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
          conceptId: "coordinate-frame<script>"
        }
      ],
      sceneId: "axis<script>-ticks-test"
    },
    { targetTicksPerAxis: 3 }
  );
  const json = serializeAxisTickPlan(plan);
  const parsed = JSON.parse(json) as typeof plan & { summary: string };

  assert.doesNotMatch(json, /</);
  assert.equal(parsed.sceneId, "axis<script>-ticks-test");
  assert.equal(parsed.labelAnchorSummary, summarizeAxisLabelAnchors(plan));
  assert.equal(parsed.summary, summarizeAxisTickPlan(plan));
  assert.equal(parsed.spacingSummary, summarizeAxisTickSpacing(plan));
  assert.equal(parsed.labelAnchorCount, 9);
  assert.equal(parsed.finiteLabelAnchorCount, 9);
  assert.equal(parsed.tickCount, 9);
  assert.equal(parsed.majorTickCount, 9);
  assert.equal(parsed.spacingMaxDelta, 0);
  assert.deepEqual(
    parsed.ticks.map((tick) => tick.axis),
    ["x", "x", "x", "y", "y", "y", "z", "z", "z"]
  );
  assert.equal(parsed.ticks[0].axisObjectId, "axes<script>");
  assert.equal(parsed.ticks[0].conceptId, "coordinate-frame<script>:x:neg2");
  assert.deepEqual(parsed.ticks[1].worldPosition, [0, 0, 0]);
});

test("returns a deterministic empty axis plan for scenes without axis objects", () => {
  const plan = buildAxisTickPlan({ ...axisScene, objects: [], sceneId: "no-axes" });

  assert.equal(plan.axisObjectCount, 0);
  assert.equal(plan.tickCount, 0);
  assert.equal(plan.labelCount, 0);
  assert.equal(plan.labelAnchorCount, 0);
  assert.equal(plan.finiteLabelAnchorCount, 0);
  assert.equal(plan.finiteTickCount, 0);
  assert.equal(plan.majorTickCount, 0);
  assert.equal(plan.spacingMaxDelta, 0);
  assert.equal(summarizeAxisTickPlan(plan), "axes:no-axes:axisObjects=0:ticks=0:labels=0:finite=0");
  assert.equal(summarizeAxisLabelAnchors(plan), "axisLabelAnchors:no-axes:count=0:finite=0:offset=0.000:axes=none");
  assert.equal(summarizeAxisTickSpacing(plan), "axisSpacing:no-axes:none:maxDelta=0.000000:major=0");
});

test("Math axis tick planning is pure and renderer-independent", () => {
  const source = fs.readFileSync("components/visualizations/three/manim/mathAxisTicks.ts", "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildAxisTickPlan/);
  assert.match(source, /axisTickPlanDataAttributes/);
  assert.match(source, /serializeAxisTickPlan/);
  assert.match(source, /summarizeAxisLabelAnchors/);
  assert.match(source, /summarizeAxisTickSpacing/);
});
