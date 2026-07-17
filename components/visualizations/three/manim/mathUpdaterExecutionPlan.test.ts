import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

const modulePath = "components/visualizations/three/manim/mathUpdaterExecutionPlan.ts";

function updaterExecutionScene(): MathSceneSpec {
  return {
    alwaysRedraw: [
      {
        dependencyTrackerIds: ["time"],
        id: "orbit-redraw",
        objectId: "orbit-path"
      }
    ],
    bindings: [],
    cameraShots: [
      {
        id: "overview",
        position: [0, 0, 8],
        target: [0, 0, 0]
      }
    ],
    coordinateSpace: {
      mathRange: { x: [-2, 2], y: [-2, 2], z: [-1, 1] },
      worldRange: { x: [-4, 4], y: [-4, 4], z: [-1, 1] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 4,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "primary",
        conceptId: "orbit",
        id: "orbit-path",
        samples: [
          [0, 0, 0],
          [1, 0, 0],
          [1, 1, 0]
        ],
        type: "parametricCurve"
      },
      {
        colorRole: "accent",
        conceptId: "probe",
        id: "flow-probe",
        pathObjectId: "orbit-path",
        type: "movingPoint"
      },
      {
        colorRole: "history",
        durationSeconds: 2,
        id: "flow-tail",
        sourceObjectId: "flow-probe",
        type: "trace"
      },
      {
        colorRole: "reference",
        conceptId: "idle-reference",
        from: [-1, -1, 0],
        id: "idle-vector",
        to: [-0.25, -1, 0],
        type: "vector"
      }
    ],
    parameters: [
      {
        id: "time",
        label: "time",
        role: "timeline",
        value: 0.5
      }
    ],
    sceneId: "updater-execution-test",
    timeline: [
      {
        duration: 1,
        easing: "linear",
        objectId: "orbit-path",
        type: "revealCurve"
      },
      {
        duration: 1,
        objectId: "flow-probe",
        pathObjectId: "orbit-path",
        type: "moveAlongPath"
      },
      {
        duration: 0.5,
        type: "wait"
      }
    ],
    vectorFieldUpdaters: [
      {
        id: "flow-probe-vector-field",
        objectId: "flow-probe",
        speedScale: 1,
        system: {
          type: "constantVelocity",
          velocity: [0.5, 0, 0]
        },
        type: "moveAlongVectorField"
      }
    ]
  };
}

test("updater execution plan follows Manim children-first recursive Mobject.update order", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater execution-plan module");
  const {
    buildMathUpdaterExecutionPlan,
    MOBJECT_UPDATE_SOURCE_CONTRACT,
    summarizeMathUpdaterExecutionPlan
  } = await import("./mathUpdaterExecutionPlan");

  const runtimeState = buildMathSceneRuntimeState(updaterExecutionScene(), 2.2);
  const plan = buildMathUpdaterExecutionPlan(runtimeState);

  assert.equal(
    MOBJECT_UPDATE_SOURCE_CONTRACT,
    "Mobject.update(dt): recursively update submobjects, then call updater functions; dt-aware updaters receive elapsed time"
  );
  assert.deepEqual(plan.traversalObjectIds, ["flow-tail", "flow-probe", "orbit-path"]);
  assert.deepEqual(plan.familyTraversalObjectIds, ["idle-vector", "flow-tail", "flow-probe", "orbit-path"]);
  assert.deepEqual(plan.idleTraversalObjectIds, ["idle-vector"]);
  assert.equal(
    plan.familyTraversalSummary,
    "familyTraversal:visited=4:withUpdaters=3:idle=1:order=children-first:ids=idle-vector,flow-tail,flow-probe,orbit-path"
  );
  assert.deepEqual(plan.activeCallSequence, [
    "flow-tail:trace(timeline)",
    "flow-probe:move(timeline)",
    "flow-probe-vector-field(dt)",
    "orbit-path:reveal(timeline)",
    "orbit-redraw(dependencies)"
  ]);
  assert.equal(plan.totalUpdaterCount, 5);
  assert.equal(plan.activeUpdaterCount, 5);
  assert.equal(plan.suspendedUpdaterCount, 0);
  assert.equal(plan.dtAwareUpdaterCount, 1);
  assert.equal(plan.timelineUpdaterCount, 3);
  assert.equal(plan.dependencyUpdaterCount, 1);
  assert.equal(plan.phase, "open");
  assert.equal(plan.recursiveOrder, "children-first");
  assert.deepEqual(plan.familyPaths, [
    "orbit-path/flow-probe/flow-tail",
    "orbit-path/flow-probe",
    "orbit-path"
  ]);
  assert.equal(plan.maxDepth, 2);
  assert.equal(
    plan.orderSummary,
    "children-first:flow-tail@2<flow-probe@1<orbit-path@0"
  );
  assert.match(plan.signature, /^updater-execution-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMathUpdaterExecutionPlan(plan),
    "updater-execution:phase=open:rows=3:updaters=5:active=5:suspended=0:dt=1:timeline=3:dependency=1"
  );
  assert.deepEqual(
    plan.rows.map((row) => ({
      activeUpdaterIds: row.activeUpdaterIds,
      depth: row.depth,
      familyPath: row.familyPath,
      objectId: row.objectId,
      phase: row.phase,
      updaterIds: row.updaterIds
    })),
    [
      {
        activeUpdaterIds: ["flow-tail:trace"],
        depth: 2,
        familyPath: "orbit-path/flow-probe/flow-tail",
        objectId: "flow-tail",
        phase: "active",
        updaterIds: ["flow-tail:trace"]
      },
      {
        activeUpdaterIds: ["flow-probe:move", "flow-probe-vector-field"],
        depth: 1,
        familyPath: "orbit-path/flow-probe",
        objectId: "flow-probe",
        phase: "active",
        updaterIds: ["flow-probe:move", "flow-probe-vector-field"]
      },
      {
        activeUpdaterIds: ["orbit-path:reveal", "orbit-redraw"],
        depth: 0,
        familyPath: "orbit-path",
        objectId: "orbit-path",
        phase: "active",
        updaterIds: ["orbit-path:reveal", "orbit-redraw"]
      }
    ]
  );
});

test("updater execution plan records animation-owned suspension while preserving traversal rows", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater execution-plan module");
  const { buildMathUpdaterExecutionPlan } = await import("./mathUpdaterExecutionPlan");

  const runtimeState = buildMathSceneRuntimeState(updaterExecutionScene(), 0.5);
  const plan = buildMathUpdaterExecutionPlan(runtimeState);

  assert.equal(plan.phase, "animation");
  assert.deepEqual(plan.activeCallSequence, ["orbit-path:reveal(timeline)"]);
  assert.deepEqual(plan.activeUpdaterIds, ["orbit-path:reveal"]);
  assert.deepEqual(plan.suspendedUpdaterIds, ["flow-probe-vector-field", "flow-probe:move", "flow-tail:trace", "orbit-redraw"]);
  assert.deepEqual(
    plan.rows.map((row) => ({
      activeUpdaterIds: row.activeUpdaterIds,
      objectId: row.objectId,
      phase: row.phase,
      suspendedUpdaterIds: row.suspendedUpdaterIds
    })),
    [
      {
        activeUpdaterIds: [],
        objectId: "flow-tail",
        phase: "suspended",
        suspendedUpdaterIds: ["flow-tail:trace"]
      },
      {
        activeUpdaterIds: [],
        objectId: "flow-probe",
        phase: "suspended",
        suspendedUpdaterIds: ["flow-probe:move", "flow-probe-vector-field"]
      },
      {
        activeUpdaterIds: ["orbit-path:reveal"],
        objectId: "orbit-path",
        phase: "mixed",
        suspendedUpdaterIds: ["orbit-redraw"]
      }
    ]
  );
});

test("same-object updater calls preserve Manim add_updater insertion order", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater execution-plan module");
  const { buildMathUpdaterExecutionPlan } = await import("./mathUpdaterExecutionPlan");
  const scene = updaterExecutionScene();

  scene.alwaysMethodUpdaters = [
    {
      id: "flow-probe-style",
      objectId: "flow-probe",
      operation: {
        opacity: 0.5,
        type: "setOpacity"
      }
    }
  ];

  const runtimeState = buildMathSceneRuntimeState(scene, 2.2);
  const plan = buildMathUpdaterExecutionPlan(runtimeState);
  const flowProbeRow = plan.rows.find((row) => row.objectId === "flow-probe");

  assert.ok(flowProbeRow);
  assert.deepEqual(flowProbeRow.updaterIds, ["flow-probe:move", "flow-probe-style", "flow-probe-vector-field"]);
  assert.deepEqual(flowProbeRow.activeUpdaterIds, ["flow-probe:move", "flow-probe-style", "flow-probe-vector-field"]);
  assert.deepEqual(plan.activeCallSequence.slice(1, 4), [
    "flow-probe:move(timeline)",
    "flow-probe-style(dependencies)",
    "flow-probe-vector-field(dt)"
  ]);
});

test("updater execution data attributes and JSON payload are deterministic for browser QA", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater execution-plan module");
  const {
    buildMathUpdaterExecutionPlan,
    serializeMathUpdaterExecutionPlan,
    summarizeMathUpdaterExecutionPlan,
    updaterExecutionPlanDataAttributes
  } = await import("./mathUpdaterExecutionPlan");

  const runtimeState = buildMathSceneRuntimeState(updaterExecutionScene(), 2.2);
  const plan = buildMathUpdaterExecutionPlan(runtimeState);
  const attributes = updaterExecutionPlanDataAttributes(plan);
  const json = serializeMathUpdaterExecutionPlan(plan);

  assert.deepEqual(attributes, {
    "data-viz-manim-updater-execution-active-call-sequence":
      "flow-tail:trace(timeline)>flow-probe:move(timeline)>flow-probe-vector-field(dt)>orbit-path:reveal(timeline)>orbit-redraw(dependencies)",
    "data-viz-manim-updater-execution-active-count": "5",
    "data-viz-manim-updater-execution-dependency-count": "1",
    "data-viz-manim-updater-execution-dt-aware-count": "1",
    "data-viz-manim-updater-execution-family-paths": "orbit-path/flow-probe/flow-tail|orbit-path/flow-probe|orbit-path",
    "data-viz-manim-updater-execution-family-traversal-object-ids": "idle-vector,flow-tail,flow-probe,orbit-path",
    "data-viz-manim-updater-execution-family-traversal-summary":
      "familyTraversal:visited=4:withUpdaters=3:idle=1:order=children-first:ids=idle-vector,flow-tail,flow-probe,orbit-path",
    "data-viz-manim-updater-execution-idle-object-ids": "idle-vector",
    "data-viz-manim-updater-execution-max-depth": "2",
    "data-viz-manim-updater-execution-object-ids": "flow-tail,flow-probe,orbit-path",
    "data-viz-manim-updater-execution-order-summary": "children-first:flow-tail@2<flow-probe@1<orbit-path@0",
    "data-viz-manim-updater-execution-phase": "open",
    "data-viz-manim-updater-execution-recursive-order": "children-first",
    "data-viz-manim-updater-execution-row-count": "3",
    "data-viz-manim-updater-execution-signature": plan.signature,
    "data-viz-manim-updater-execution-source-contract": "Mobject.update(dt): recursively update submobjects, then call updater functions; dt-aware updaters receive elapsed time",
    "data-viz-manim-updater-execution-summary": summarizeMathUpdaterExecutionPlan(plan),
    "data-viz-manim-updater-execution-suspended-count": "0",
    "data-viz-manim-updater-execution-timeline-count": "3",
    "data-viz-manim-updater-execution-updater-count": "5"
  });
  assert.doesNotMatch(json, /<script/i);
  assert.deepEqual(JSON.parse(json), plan);
});

test("updater execution-plan module remains pure TypeScript without React, R3F, or Three.js imports", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater execution-plan module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMathUpdaterExecutionPlan/);
  assert.match(source, /MOBJECT_UPDATE_SOURCE_CONTRACT/);
  assert.match(source, /updaterExecutionPlanDataAttributes/);
});
