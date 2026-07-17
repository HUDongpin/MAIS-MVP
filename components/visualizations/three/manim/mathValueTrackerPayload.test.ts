import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneRuntimeState } from "./mathSceneRuntimeState";
import type { MathSceneSpec } from "./mathSceneTypes";

const modulePath = "components/visualizations/three/manim/mathValueTrackerPayload.ts";

function trackerPayloadScene(): MathSceneSpec {
  return {
    bindings: [],
    cameraShots: [
      {
        id: "overview",
        position: [0, 0, 8],
        target: [0, 0, 0]
      }
    ],
    coordinateSpace: {
      mathRange: { x: [0, 1], y: [0, 1], z: [0, 1] },
      worldRange: { x: [0, 1], y: [0, 1], z: [0, 1] }
    },
    diagnostics: {
      expectedBindingCount: 0,
      expectedObjectCount: 1,
      expectedTokenCount: 0
    },
    familyId: "three-function-graph",
    formulas: [],
    objects: [
      {
        colorRole: "function",
        conceptId: "function-rule",
        id: "curve",
        samples: [
          [0, 0, 0],
          [1, 1, 0]
        ],
        type: "parametricCurve"
      }
    ],
    parameters: [
      {
        conceptId: "function-rule",
        id: "value",
        label: "Primary value",
        max: 9,
        min: 0,
        role: "control",
        value: 6
      }
    ],
    sceneId: "value-tracker-payload-test",
    timeline: [
      {
        duration: 4,
        easing: "linear",
        objectId: "curve",
        type: "revealCurve"
      }
    ]
  };
}

test("ValueTracker payload exposes hidden animatable tracker rows with stable values", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure ValueTracker payload module");
  const {
    buildMathValueTrackerPayload,
    VALUE_TRACKER_SOURCE_CONTRACT,
    summarizeMathValueTrackerPayload
  } = await import("./mathValueTrackerPayload");

  const runtimeState = buildMathSceneRuntimeState(trackerPayloadScene(), 2);
  const payload = buildMathValueTrackerPayload(runtimeState.trackers);

  assert.equal(payload.totalTrackerCount, 4);
  assert.equal(payload.timelineTrackerCount, 2);
  assert.equal(payload.parameterTrackerCount, 1);
  assert.equal(payload.objectTrackerCount, 1);
  assert.equal(payload.progressTrackerCount, 2);
  assert.equal(payload.controlTrackerCount, 1);
  assert.equal(payload.sourceContract, VALUE_TRACKER_SOURCE_CONTRACT);
  assert.deepEqual(payload.trackerIds, ["curve:progress", "parameter:value", "timeline", "timeline:progress"]);
  assert.deepEqual(payload.hiddenMobjectIds, [
    "tracker:curve:progress",
    "tracker:parameter:value",
    "tracker:timeline",
    "tracker:timeline:progress"
  ]);
  assert.equal(
    payload.uniformValueSummary,
    "tracker:curve:progress:value=0.500|tracker:parameter:value:value=6.000|tracker:timeline:value=2.000|tracker:timeline:progress:value=0.500"
  );
  assert.equal(
    payload.normalizedValueSummary,
    "tracker:curve:progress:normalized=0.500|tracker:parameter:value:normalized=0.667|tracker:timeline:normalized=0.500|tracker:timeline:progress:normalized=0.500"
  );
  assert.equal(payload.uniformPairCount, 4);
  assert.equal(
    payload.uniformKeySummary,
    "tracker:curve:progress:uniforms=value,normalizedValue|tracker:parameter:value:uniforms=value,normalizedValue|tracker:timeline:uniforms=value,normalizedValue|tracker:timeline:progress:uniforms=value,normalizedValue"
  );
  assert.equal(
    payload.rangeSummary,
    "tracker:curve:progress:range=0.000..1.000|tracker:parameter:value:range=0.000..9.000|tracker:timeline:range=0.000..4.000|tracker:timeline:progress:range=0.000..1.000"
  );
  assert.equal(
    payload.sourceSummary,
    "value-tracker-source:hiddenMobjects=4:uniforms=value,normalizedValue:sources=object=1,parameter=1,timeline=2,value=0"
  );
  assert.match(payload.signature, /^value-tracker-[0-9a-f]{8}$/);
  assert.equal(
    summarizeMathValueTrackerPayload(payload),
    "value-trackers:total=4:timeline=2:parameter=1:object=1:progress=2:control=1"
  );
  assert.deepEqual(
    payload.rows.map((row) => ({
      hiddenMobjectId: row.hiddenMobjectId,
      id: row.id,
      normalizedValue: row.normalizedValue,
      role: row.role,
      source: row.source,
      uniforms: row.uniforms,
      value: row.value
    })),
    [
      {
        hiddenMobjectId: "tracker:curve:progress",
        id: "curve:progress",
        normalizedValue: 0.5,
        role: "progress",
        source: "object",
        uniforms: {
          normalizedValue: 0.5,
          value: 0.5
        },
        value: 0.5
      },
      {
        hiddenMobjectId: "tracker:parameter:value",
        id: "parameter:value",
        normalizedValue: 2 / 3,
        role: "control",
        source: "parameter",
        uniforms: {
          normalizedValue: 2 / 3,
          value: 6
        },
        value: 6
      },
      {
        hiddenMobjectId: "tracker:timeline",
        id: "timeline",
        normalizedValue: 0.5,
        role: "time",
        source: "timeline",
        uniforms: {
          normalizedValue: 0.5,
          value: 2
        },
        value: 2
      },
      {
        hiddenMobjectId: "tracker:timeline:progress",
        id: "timeline:progress",
        normalizedValue: 0.5,
        role: "progress",
        source: "timeline",
        uniforms: {
          normalizedValue: 0.5,
          value: 0.5
        },
        value: 0.5
      }
    ]
  );
});

test("ValueTracker payload data attributes and JSON serialization are deterministic for browser QA", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure ValueTracker payload module");
  const {
    buildMathValueTrackerPayload,
    VALUE_TRACKER_SOURCE_CONTRACT,
    serializeMathValueTrackerPayload,
    summarizeMathValueTrackerPayload,
    valueTrackerPayloadDataAttributes
  } = await import("./mathValueTrackerPayload");

  const runtimeState = buildMathSceneRuntimeState(trackerPayloadScene(), 2);
  const payload = buildMathValueTrackerPayload(runtimeState.trackers);
  const attributes = valueTrackerPayloadDataAttributes(payload);
  const json = serializeMathValueTrackerPayload(payload);

  assert.deepEqual(attributes, {
    "data-viz-manim-value-tracker-control-count": "1",
    "data-viz-manim-value-tracker-count": "4",
    "data-viz-manim-value-tracker-hidden-mobject-ids":
      "tracker:curve:progress,tracker:parameter:value,tracker:timeline,tracker:timeline:progress",
    "data-viz-manim-value-tracker-ids": "curve:progress,parameter:value,timeline,timeline:progress",
    "data-viz-manim-value-tracker-normalized-summary":
      "tracker:curve:progress:normalized=0.500|tracker:parameter:value:normalized=0.667|tracker:timeline:normalized=0.500|tracker:timeline:progress:normalized=0.500",
    "data-viz-manim-value-tracker-object-count": "1",
    "data-viz-manim-value-tracker-parameter-count": "1",
    "data-viz-manim-value-tracker-progress-count": "2",
    "data-viz-manim-value-tracker-range-summary":
      "tracker:curve:progress:range=0.000..1.000|tracker:parameter:value:range=0.000..9.000|tracker:timeline:range=0.000..4.000|tracker:timeline:progress:range=0.000..1.000",
    "data-viz-manim-value-tracker-signature": payload.signature,
    "data-viz-manim-value-tracker-source-contract": VALUE_TRACKER_SOURCE_CONTRACT,
    "data-viz-manim-value-tracker-source-summary":
      "value-tracker-source:hiddenMobjects=4:uniforms=value,normalizedValue:sources=object=1,parameter=1,timeline=2,value=0",
    "data-viz-manim-value-tracker-summary": summarizeMathValueTrackerPayload(payload),
    "data-viz-manim-value-tracker-timeline-count": "2",
    "data-viz-manim-value-tracker-uniform-key-summary":
      "tracker:curve:progress:uniforms=value,normalizedValue|tracker:parameter:value:uniforms=value,normalizedValue|tracker:timeline:uniforms=value,normalizedValue|tracker:timeline:progress:uniforms=value,normalizedValue",
    "data-viz-manim-value-tracker-uniform-pair-count": "4",
    "data-viz-manim-value-tracker-uniform-value-summary":
      "tracker:curve:progress:value=0.500|tracker:parameter:value:value=6.000|tracker:timeline:value=2.000|tracker:timeline:progress:value=0.500",
    "data-viz-manim-value-tracker-value-count": "0"
  });
  assert.doesNotMatch(json, /<script/i);
  assert.deepEqual(JSON.parse(json), payload);
});

test("ValueTracker payload exposes scene-authored hidden value tracker counts", async () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure ValueTracker payload module");
  const {
    buildMathValueTrackerPayload,
    valueTrackerPayloadDataAttributes
  } = await import("./mathValueTrackerPayload");
  const runtimeState = buildMathSceneRuntimeState({
    ...trackerPayloadScene(),
    timeline: [
      {
        duration: 2,
        easing: "linear",
        targetValue: 1,
        trackerId: "phase-tracker",
        type: "animateTracker"
      }
    ],
    valueTrackers: [
      {
        conceptId: "phase",
        id: "phase-tracker",
        label: "Phase",
        max: 1,
        min: 0,
        value: 0
      }
    ]
  }, 1);
  const payload = buildMathValueTrackerPayload(runtimeState.trackers);
  const attributes = valueTrackerPayloadDataAttributes(payload);

  assert.equal(payload.valueTrackerCount, 1);
  assert.equal(payload.rows.find((row) => row.id === "phase-tracker")?.source, "value");
  assert.equal(attributes["data-viz-manim-value-tracker-value-count"], "1");
});

test("ValueTracker payload module remains pure TypeScript without React, R3F, or Three.js imports", () => {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should expose a pure ValueTracker payload module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"/);
  assert.match(source, /buildMathValueTrackerPayload/);
  assert.match(source, /valueTrackerPayloadDataAttributes/);
});
