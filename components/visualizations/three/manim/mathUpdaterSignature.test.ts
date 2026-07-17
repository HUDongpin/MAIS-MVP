import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

const modulePath = "components/visualizations/three/manim/mathUpdaterSignature.ts";

function updaterSignatureScene(): MathSceneSpec {
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
      expectedObjectCount: 3,
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
    sceneId: "updater-signature-test",
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

test("updater signature plan classifies dt-aware, timeline, and dependency redraw updater entries", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater signature module");
  const {
    buildMathUpdaterSignaturePlan,
    summarizeMathUpdaterSignaturePlan
  } = await import("./mathUpdaterSignature");

  const runtimeState = buildMathSceneRuntimeState(updaterSignatureScene(), 0.5);
  const plan = buildMathUpdaterSignaturePlan(runtimeState.updaters);

  assert.equal(plan.totalUpdaterCount, 5);
  assert.deepEqual(plan.dtAwareUpdaterIds, ["flow-probe-vector-field"]);
  assert.deepEqual(plan.receivesDeltaSecondsIds, ["flow-probe-vector-field"]);
  assert.deepEqual(plan.receivesTimelineProgressIds, ["flow-probe:move", "flow-tail:trace", "orbit-path:reveal"]);
  assert.deepEqual(plan.dependencyUpdaterIds, ["orbit-redraw"]);
  assert.deepEqual(plan.timelineUpdaterIds, ["flow-probe:move", "flow-tail:trace", "orbit-path:reveal"]);
  assert.deepEqual(plan.callSignatures, [
    "flow-probe:move(timeline)",
    "flow-probe-vector-field(dt)",
    "flow-tail:trace(timeline)",
    "orbit-path:reveal(timeline)",
    "orbit-redraw(dependencies)"
  ]);
  assert.equal(plan.sourceSummary, "alwaysMethod=0;alwaysRedraw=1;objectProgress=3;vectorFieldDt=1");
  assert.match(plan.signature, /^updater-signature-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMathUpdaterSignaturePlan(plan),
    "updater-signature:total=5:dt=1:timeline=3:dependency=1"
  );
  assert.deepEqual(
    plan.entries.map((entry) => ({
      executionMode: entry.executionMode,
      id: entry.id,
      receivesDeltaSeconds: entry.receivesDeltaSeconds,
      receivesTimelineProgress: entry.receivesTimelineProgress,
      source: entry.source
    })),
    [
      {
        executionMode: "timeline-progress",
        id: "flow-probe:move",
        receivesDeltaSeconds: false,
        receivesTimelineProgress: true,
        source: "objectProgress"
      },
      {
        executionMode: "dt-aware",
        id: "flow-probe-vector-field",
        receivesDeltaSeconds: true,
        receivesTimelineProgress: false,
        source: "vectorFieldDt"
      },
      {
        executionMode: "timeline-progress",
        id: "flow-tail:trace",
        receivesDeltaSeconds: false,
        receivesTimelineProgress: true,
        source: "objectProgress"
      },
      {
        executionMode: "timeline-progress",
        id: "orbit-path:reveal",
        receivesDeltaSeconds: false,
        receivesTimelineProgress: true,
        source: "objectProgress"
      },
      {
        executionMode: "dependency-redraw",
        id: "orbit-redraw",
        receivesDeltaSeconds: false,
        receivesTimelineProgress: false,
        source: "alwaysRedraw"
      }
    ]
  );
});

test("updater signature data attributes and JSON serialization are deterministic for browser QA", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater signature module");
  const {
    buildMathUpdaterSignaturePlan,
    serializeMathUpdaterSignaturePlan,
    summarizeMathUpdaterSignaturePlan,
    updaterSignatureDataAttributes
  } = await import("./mathUpdaterSignature");

  const runtimeState = buildMathSceneRuntimeState(updaterSignatureScene(), 0.5);
  const plan = buildMathUpdaterSignaturePlan(runtimeState.updaters);
  const attributes = updaterSignatureDataAttributes(plan);
  const json = serializeMathUpdaterSignaturePlan(plan);

  assert.deepEqual(attributes, {
    "data-viz-manim-updater-signature-count": "5",
    "data-viz-manim-updater-signature-call-signatures": "flow-probe:move(timeline)|flow-probe-vector-field(dt)|flow-tail:trace(timeline)|orbit-path:reveal(timeline)|orbit-redraw(dependencies)",
    "data-viz-manim-updater-signature-dependency-count": "1",
    "data-viz-manim-updater-signature-dependency-ids": "orbit-redraw",
    "data-viz-manim-updater-signature-dt-aware-count": "1",
    "data-viz-manim-updater-signature-dt-aware-ids": "flow-probe-vector-field",
    "data-viz-manim-updater-signature-receives-dt-ids": "flow-probe-vector-field",
    "data-viz-manim-updater-signature-receives-timeline-ids": "flow-probe:move,flow-tail:trace,orbit-path:reveal",
    "data-viz-manim-updater-signature-signature": plan.signature,
    "data-viz-manim-updater-signature-source-summary": "alwaysMethod=0;alwaysRedraw=1;objectProgress=3;vectorFieldDt=1",
    "data-viz-manim-updater-signature-summary": summarizeMathUpdaterSignaturePlan(plan),
    "data-viz-manim-updater-signature-timeline-count": "3",
    "data-viz-manim-updater-signature-timeline-ids": "flow-probe:move,flow-tail:trace,orbit-path:reveal"
  });
  assert.doesNotMatch(json, /<script/i);
  assert.deepEqual(JSON.parse(json), plan);
});

test("updater signature module remains pure TypeScript without React, R3F, or Three.js imports", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure updater signature module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMathUpdaterSignaturePlan/);
  assert.match(source, /updaterSignatureDataAttributes/);
});
