import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { UPDATER_REGISTRY_SOURCE_CONTRACT, type MathUpdaterRegistry } from "./mathUpdaterRegistry";
import { SCENE_UPDATE_POLICY_SOURCE_CONTRACT } from "./mathSceneUpdatePolicy";

type MathSceneUpdatePolicy = {
  alwaysUpdateMobjects: boolean;
  forceDraw: boolean;
  hasUpdaters: boolean;
  reason: "always-update-mobjects" | "has-updaters" | "idle";
  shouldCaptureFrame: boolean;
  shouldUpdateMobjects: boolean;
  skipAnimations: boolean;
  sourceContract: typeof SCENE_UPDATE_POLICY_SOURCE_CONTRACT;
  summary: string;
  updaterCount: number;
};

type MathSceneUpdatePolicyModule = {
  buildSceneUpdatePolicy: (input: {
    alwaysUpdateMobjects?: boolean;
    forceDraw?: boolean;
    skipAnimations?: boolean;
    updaterRegistry: MathUpdaterRegistry;
  }) => MathSceneUpdatePolicy;
  sceneUpdatePolicyDataAttributes: (policy: MathSceneUpdatePolicy) => Record<string, string>;
  serializeSceneUpdatePolicy: (policy: MathSceneUpdatePolicy) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneUpdatePolicy.ts";

const emptyRegistry: MathUpdaterRegistry = {
  byObjectId: {},
  entries: [],
  sourceContract: UPDATER_REGISTRY_SOURCE_CONTRACT
};

const updaterRegistry: MathUpdaterRegistry = {
  byObjectId: {
    probe: ["move-along-path"],
    trace: ["trace-recent-path"]
  },
  entries: [
    {
      id: "probe:move",
      objectId: "probe",
      sourceContract: UPDATER_REGISTRY_SOURCE_CONTRACT,
      type: "move-along-path"
    },
    {
      id: "trace:recent",
      objectId: "trace",
      sourceContract: UPDATER_REGISTRY_SOURCE_CONTRACT,
      type: "trace-recent-path"
    }
  ],
  sourceContract: UPDATER_REGISTRY_SOURCE_CONTRACT
};

async function importSceneUpdatePolicyModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure Scene.should_update_mobjects policy module");
  return await import("./mathSceneUpdatePolicy") as MathSceneUpdatePolicyModule;
}

test("buildSceneUpdatePolicy stays idle when a Scene has no updater entries", async () => {
  const { buildSceneUpdatePolicy } = await importSceneUpdatePolicyModule();
  const policy = buildSceneUpdatePolicy({ updaterRegistry: emptyRegistry });

  assert.deepEqual(policy, {
    alwaysUpdateMobjects: false,
    forceDraw: false,
    hasUpdaters: false,
    reason: "idle",
    shouldCaptureFrame: true,
    shouldUpdateMobjects: false,
    skipAnimations: false,
    sourceContract: SCENE_UPDATE_POLICY_SOURCE_CONTRACT,
    summary: "updatePolicy:update=false:capture=true:reason=idle:updaters=0",
    updaterCount: 0
  });
});

test("buildSceneUpdatePolicy follows Manim has_updaters semantics", async () => {
  const { buildSceneUpdatePolicy } = await importSceneUpdatePolicyModule();
  const policy = buildSceneUpdatePolicy({ updaterRegistry });

  assert.equal(policy.shouldUpdateMobjects, true);
  assert.equal(policy.hasUpdaters, true);
  assert.equal(policy.reason, "has-updaters");
  assert.equal(policy.sourceContract, SCENE_UPDATE_POLICY_SOURCE_CONTRACT);
  assert.match(SCENE_UPDATE_POLICY_SOURCE_CONTRACT, /Scene\.should_update_mobjects/);
  assert.match(SCENE_UPDATE_POLICY_SOURCE_CONTRACT, /always_update_mobjects/);
  assert.match(SCENE_UPDATE_POLICY_SOURCE_CONTRACT, /has_updaters/);
  assert.equal(policy.updaterCount, 2);
  assert.equal(policy.summary, "updatePolicy:update=true:capture=true:reason=has-updaters:updaters=2");
});

test("buildSceneUpdatePolicy honors always_update_mobjects before ordinary updater checks", async () => {
  const { buildSceneUpdatePolicy } = await importSceneUpdatePolicyModule();
  const policy = buildSceneUpdatePolicy({
    alwaysUpdateMobjects: true,
    updaterRegistry: emptyRegistry
  });

  assert.equal(policy.shouldUpdateMobjects, true);
  assert.equal(policy.hasUpdaters, false);
  assert.equal(policy.reason, "always-update-mobjects");
  assert.equal(policy.summary, "updatePolicy:update=true:capture=true:reason=always-update-mobjects:updaters=0");
});

test("buildSceneUpdatePolicy mirrors skip_animations and force_draw frame-capture gating", async () => {
  const { buildSceneUpdatePolicy } = await importSceneUpdatePolicyModule();
  const skipped = buildSceneUpdatePolicy({
    skipAnimations: true,
    updaterRegistry
  });
  const forced = buildSceneUpdatePolicy({
    forceDraw: true,
    skipAnimations: true,
    updaterRegistry
  });

  assert.equal(skipped.shouldUpdateMobjects, true);
  assert.equal(skipped.shouldCaptureFrame, false);
  assert.equal(skipped.summary, "updatePolicy:update=true:capture=false:reason=has-updaters:updaters=2");
  assert.equal(forced.shouldCaptureFrame, true);
  assert.equal(forced.summary, "updatePolicy:update=true:capture=true:reason=has-updaters:updaters=2");
});

test("sceneUpdatePolicyDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneUpdatePolicy, sceneUpdatePolicyDataAttributes } = await importSceneUpdatePolicyModule();
  const policy = buildSceneUpdatePolicy({
    alwaysUpdateMobjects: true,
    forceDraw: true,
    skipAnimations: true,
    updaterRegistry
  });

  assert.deepEqual(sceneUpdatePolicyDataAttributes(policy), {
    "data-viz-manim-always-update-mobjects": "true",
    "data-viz-manim-force-draw": "true",
    "data-viz-manim-has-updaters": "true",
    "data-viz-manim-should-capture-frame": "true",
    "data-viz-manim-should-update-mobjects": "true",
    "data-viz-manim-skip-animations": "true",
    "data-viz-manim-update-policy-source-contract": SCENE_UPDATE_POLICY_SOURCE_CONTRACT,
    "data-viz-manim-update-policy-reason": "always-update-mobjects",
    "data-viz-manim-update-policy-summary": "updatePolicy:update=true:capture=true:reason=always-update-mobjects:updaters=2",
    "data-viz-manim-updater-count": "2"
  });
});

test("serializeSceneUpdatePolicy exposes deterministic script-safe browser QA JSON", async () => {
  const { buildSceneUpdatePolicy, serializeSceneUpdatePolicy } = await importSceneUpdatePolicyModule();
  const policy = buildSceneUpdatePolicy({
    forceDraw: true,
    skipAnimations: true,
    updaterRegistry: {
      ...updaterRegistry,
      entries: updaterRegistry.entries.map((entry) =>
        entry.id === "probe:move" ? { ...entry, id: "probe</script>:move" } : entry
      )
    }
  });
  const payload = {
    ...policy,
    summary: "updatePolicy:update=true:capture=true:reason=has-updaters:updaters=2</script>"
  };
  const json = serializeSceneUpdatePolicy(payload);

  assert.equal(json, serializeSceneUpdatePolicy(payload));
  assert.doesNotMatch(json, /<|<\/script>|undefined|NaN|Infinity/i);

  const parsed = JSON.parse(json) as MathSceneUpdatePolicy;
  assert.equal(parsed.sourceContract, SCENE_UPDATE_POLICY_SOURCE_CONTRACT);
  assert.equal(parsed.reason, "has-updaters");
  assert.equal(parsed.shouldUpdateMobjects, true);
  assert.equal(parsed.shouldCaptureFrame, true);
  assert.equal(parsed.skipAnimations, true);
  assert.equal(parsed.forceDraw, true);
  assert.equal(parsed.updaterCount, 2);
  assert.equal(parsed.summary, payload.summary);
});

test("Scene update policy stays pure and documents the should_update_mobjects source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneUpdatePolicy.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /buildSceneUpdatePolicy/);
  assert.match(source, /SCENE_UPDATE_POLICY_SOURCE_CONTRACT/);
  assert.match(source, /sceneUpdatePolicyDataAttributes/);
  assert.match(source, /serializeSceneUpdatePolicy/);
  assert.match(source, /should_update_mobjects/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
});
