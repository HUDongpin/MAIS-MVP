import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const modulePath = "components/visualizations/three/manim/mathSceneRunFromBeat.ts";

const expectedSourceContract =
  "InteractiveSceneEmbed run-from-beat -> restore checkpointed scene state before selected play and replay selected/later plays" as const;
const expectedReplayPolicy =
  "checkpoint-prepare-earlier-beats-then-replay-selected-beat-window" as const;

type MathSceneRunFromBeatPlan = {
  checkpointInvalidationSummary: string;
  checkpointKeyCount: number;
  checkpointKeys: string[];
  checkpointPolicy: string;
  checkpointRestoreAction: "restore-and-invalidate-later" | "restore-without-invalidating" | "missing-checkpoint" | "not-ready";
  checkpointRestoreKey: string;
  checkpointRestoreMode: "restore-existing" | "missing-checkpoint" | "not-ready";
  checkpointRestoreReady: boolean;
  checkpointSummary: string;
  compositionId: string;
  compositionReplayPolicy: string;
  compositionReplayReady: boolean;
  compositionReplaySummary: string;
  compositionType: "animationGroup" | "laggedStart" | "succession" | "none";
  compositionWindowCount: number;
  compositionWindowIds: string[];
  compositionWindowSummary: string;
  elapsedBeforeReplay: number;
  finalElapsedSeconds: number;
  invalidatedCheckpointKeys: string[];
  invalidatesLaterCheckpointCount: number;
  normalizedBeatIndex: number;
  preparedBeatIndices: number[];
  ready: boolean;
  replayBeatIndices: number[];
  replayPlayCount: number;
  replayPolicy: typeof expectedReplayPolicy;
  requestedBeatIndex: number;
  retainedCheckpointKeysAfterRestore: string[];
  skippedBeforeCount: number;
  sourceContract: typeof expectedSourceContract;
  summary: string;
  totalPlayCount: number;
  version: "mais-manim-run-from-beat/v1";
};

type MathSceneRunFromBeatModule = {
  SCENE_RUN_FROM_BEAT_REPLAY_POLICY: typeof expectedReplayPolicy;
  SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT: typeof expectedSourceContract;
  buildSceneRunFromBeatPlan: (input: {
    checkpointKeys?: string[];
    checkpointRestoreKey?: string;
    compositionReplay?: {
      compositionId?: string;
      compositionType?: "animationGroup" | "laggedStart" | "succession";
      windowIds?: string[];
      windowSummary?: string;
    };
    playEndSeconds?: number[];
    playStartSeconds?: number[];
    requestedBeatIndex?: number;
  }) => MathSceneRunFromBeatPlan;
  sceneRunFromBeatDataAttributes: (plan: MathSceneRunFromBeatPlan) => Record<string, string>;
  serializeSceneRunFromBeatPlan: (plan: MathSceneRunFromBeatPlan) => string;
};

async function importRunFromBeatModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure run-from-beat replay contract module");
  return await import("./mathSceneRunFromBeat") as MathSceneRunFromBeatModule;
}

test("buildSceneRunFromBeatPlan maps a selected play to checkpoint-prepared and replay windows", async () => {
  const {
    SCENE_RUN_FROM_BEAT_REPLAY_POLICY,
    SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT,
    buildSceneRunFromBeatPlan
  } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    playEndSeconds: [1.2, 2.7, 4.1, 5],
    playStartSeconds: [0, 1.2, 2.7, 4.1],
    requestedBeatIndex: 2
  });

  assert.equal(plan.sourceContract, SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT);
  assert.equal(plan.sourceContract, expectedSourceContract);
  assert.equal(plan.replayPolicy, SCENE_RUN_FROM_BEAT_REPLAY_POLICY);
  assert.equal(plan.replayPolicy, expectedReplayPolicy);
  assert.equal(plan.ready, true);
  assert.equal(plan.requestedBeatIndex, 2);
  assert.equal(plan.normalizedBeatIndex, 2);
  assert.equal(plan.elapsedBeforeReplay, 2.7);
  assert.equal(plan.finalElapsedSeconds, 5);
  assert.deepEqual(plan.preparedBeatIndices, [0, 1]);
  assert.deepEqual(plan.replayBeatIndices, [2, 3]);
  assert.equal(plan.skippedBeforeCount, 2);
  assert.equal(plan.replayPlayCount, 2);
  assert.equal(plan.totalPlayCount, 4);
  assert.equal(
    plan.summary,
    "runFromBeat:ready=true:requested=2:normalized=2:prepared=0,1:replay=2,3:elapsed=2.700:final=5.000"
  );
});

test("buildSceneRunFromBeatPlan records checkpoint restore readiness before replaying the selected beat", async () => {
  const { buildSceneRunFromBeatPlan } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    checkpointKeys: ["# intro", "# curve", "# camera"],
    checkpointRestoreKey: "# curve",
    playEndSeconds: [1.2, 2.7, 4.1, 5],
    playStartSeconds: [0, 1.2, 2.7, 4.1],
    requestedBeatIndex: 2
  });

  assert.equal(plan.checkpointKeyCount, 3);
  assert.deepEqual(plan.checkpointKeys, ["# intro", "# curve", "# camera"]);
  assert.equal(plan.checkpointRestoreKey, "# curve");
  assert.equal(plan.checkpointRestoreMode, "restore-existing");
  assert.equal(plan.checkpointRestoreReady, true);
  assert.equal(plan.checkpointRestoreAction, "restore-and-invalidate-later");
  assert.equal(plan.invalidatesLaterCheckpointCount, 1);
  assert.deepEqual(plan.invalidatedCheckpointKeys, ["# camera"]);
  assert.deepEqual(plan.retainedCheckpointKeysAfterRestore, ["# intro", "# curve"]);
  assert.equal(
    plan.checkpointPolicy,
    "restore-existing-checkpoint-before-selected-beat-then-replay-window"
  );
  assert.equal(
    plan.checkpointSummary,
    "checkpoint:restore-existing:key=# curve:count=3:ready=true"
  );
  assert.equal(
    plan.checkpointInvalidationSummary,
    "checkpointInvalidation:action=restore-and-invalidate-later:invalidates=1:invalidated=# camera:retained=# intro|# curve"
  );
});

test("buildSceneRunFromBeatPlan exposes later-checkpoint invalidation after reverting to an earlier checkpoint", async () => {
  const { buildSceneRunFromBeatPlan, sceneRunFromBeatDataAttributes } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    checkpointKeys: ["# intro", "# derivative", "# area"],
    checkpointRestoreKey: "# intro",
    playEndSeconds: [1, 2, 3],
    playStartSeconds: [0, 1, 2],
    requestedBeatIndex: 0
  });
  const attributes = sceneRunFromBeatDataAttributes(plan);

  assert.equal(plan.checkpointRestoreMode, "restore-existing");
  assert.equal(plan.checkpointRestoreReady, true);
  assert.equal(plan.checkpointRestoreAction, "restore-and-invalidate-later");
  assert.equal(plan.invalidatesLaterCheckpointCount, 2);
  assert.deepEqual(plan.invalidatedCheckpointKeys, ["# derivative", "# area"]);
  assert.deepEqual(plan.retainedCheckpointKeysAfterRestore, ["# intro"]);
  assert.equal(
    plan.checkpointInvalidationSummary,
    "checkpointInvalidation:action=restore-and-invalidate-later:invalidates=2:invalidated=# derivative|# area:retained=# intro"
  );
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidates-count"], "2");
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidated-keys"], "# derivative|# area");
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"], "# intro");
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-restore-action"], "restore-and-invalidate-later");
  assert.equal(
    attributes["data-viz-manim-run-from-beat-checkpoint-invalidation-summary"],
    plan.checkpointInvalidationSummary
  );
});

test("buildSceneRunFromBeatPlan records grouped child windows for an animation-composition replay beat", async () => {
  const { buildSceneRunFromBeatPlan } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    compositionReplay: {
      compositionId: "function-attention-lagged-start",
      compositionType: "laggedStart",
      windowIds: ["function-curve-attention-lift", "function-probe-attention-pulse"],
      windowSummary:
        "function-curve-attention-lift@0.000..1.200:0.000|function-probe-attention-pulse@0.240..1.440:0.000"
    },
    playEndSeconds: [2.4, 6, 7.2, 8.64, 10.04, 10.84],
    playStartSeconds: [0, 2.4, 6, 7.2, 8.64, 10.04],
    requestedBeatIndex: 3
  });

  assert.equal(plan.compositionId, "function-attention-lagged-start");
  assert.equal(plan.compositionType, "laggedStart");
  assert.equal(plan.compositionWindowCount, 2);
  assert.deepEqual(plan.compositionWindowIds, ["function-curve-attention-lift", "function-probe-attention-pulse"]);
  assert.equal(
    plan.compositionWindowSummary,
    "function-curve-attention-lift@0.000..1.200:0.000|function-probe-attention-pulse@0.240..1.440:0.000"
  );
  assert.equal(
    plan.compositionReplayPolicy,
    "restore-checkpoint-then-replay-selected-Scene.play-group-with-child-windows"
  );
  assert.equal(plan.compositionReplayReady, true);
  assert.equal(
    plan.compositionReplaySummary,
    "composition:ready=true:id=function-attention-lagged-start:type=laggedStart:windows=2"
  );
});

test("buildSceneRunFromBeatPlan reports missing checkpoint restore evidence without blocking replay-window planning", async () => {
  const { buildSceneRunFromBeatPlan } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    checkpointKeys: ["# intro"],
    checkpointRestoreKey: "# missing",
    playStartSeconds: [0, 2, 4],
    requestedBeatIndex: 1
  });

  assert.equal(plan.ready, true);
  assert.equal(plan.checkpointKeyCount, 1);
  assert.deepEqual(plan.checkpointKeys, ["# intro"]);
  assert.equal(plan.checkpointRestoreKey, "# missing");
  assert.equal(plan.checkpointRestoreMode, "missing-checkpoint");
  assert.equal(plan.checkpointRestoreReady, false);
  assert.equal(plan.checkpointRestoreAction, "missing-checkpoint");
  assert.equal(plan.invalidatesLaterCheckpointCount, 0);
  assert.deepEqual(plan.invalidatedCheckpointKeys, []);
  assert.deepEqual(plan.retainedCheckpointKeysAfterRestore, []);
  assert.deepEqual(plan.preparedBeatIndices, [0]);
  assert.deepEqual(plan.replayBeatIndices, [1, 2]);
  assert.equal(
    plan.checkpointSummary,
    "checkpoint:missing-checkpoint:key=# missing:count=1:ready=false"
  );
});

test("buildSceneRunFromBeatPlan clamps invalid beat requests to the nearest replayable play", async () => {
  const { buildSceneRunFromBeatPlan } = await importRunFromBeatModule();
  const negative = buildSceneRunFromBeatPlan({
    playStartSeconds: [0, 2, 4],
    requestedBeatIndex: -4
  });
  const overflow = buildSceneRunFromBeatPlan({
    playEndSeconds: [2, 4, 8],
    playStartSeconds: [0, 2, 4],
    requestedBeatIndex: 99
  });

  assert.equal(negative.normalizedBeatIndex, 0);
  assert.deepEqual(negative.preparedBeatIndices, []);
  assert.deepEqual(negative.replayBeatIndices, [0, 1, 2]);
  assert.equal(negative.elapsedBeforeReplay, 0);
  assert.equal(overflow.normalizedBeatIndex, 2);
  assert.deepEqual(overflow.preparedBeatIndices, [0, 1]);
  assert.deepEqual(overflow.replayBeatIndices, [2]);
  assert.equal(overflow.elapsedBeforeReplay, 4);
  assert.equal(overflow.finalElapsedSeconds, 8);
});

test("buildSceneRunFromBeatPlan reports not-ready evidence when no playback beats exist", async () => {
  const { buildSceneRunFromBeatPlan } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    playStartSeconds: [],
    requestedBeatIndex: 3
  });

  assert.equal(plan.ready, false);
  assert.equal(plan.totalPlayCount, 0);
  assert.equal(plan.normalizedBeatIndex, -1);
  assert.deepEqual(plan.preparedBeatIndices, []);
  assert.deepEqual(plan.replayBeatIndices, []);
  assert.equal(plan.elapsedBeforeReplay, 0);
  assert.equal(plan.finalElapsedSeconds, 0);
  assert.equal(plan.checkpointRestoreMode, "not-ready");
  assert.equal(plan.checkpointRestoreReady, false);
  assert.equal(plan.checkpointRestoreAction, "not-ready");
  assert.equal(plan.invalidatesLaterCheckpointCount, 0);
  assert.deepEqual(plan.invalidatedCheckpointKeys, []);
  assert.deepEqual(plan.retainedCheckpointKeysAfterRestore, []);
  assert.equal(plan.summary, "runFromBeat:ready=false:requested=3:normalized=-1:prepared=none:replay=none:elapsed=0.000:final=0.000");
});

test("sceneRunFromBeatDataAttributes exposes stable browser QA evidence", async () => {
  const { buildSceneRunFromBeatPlan, sceneRunFromBeatDataAttributes } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    playEndSeconds: [1, 3, 6],
    playStartSeconds: [0, 1, 3],
    requestedBeatIndex: 1
  });

  assert.deepEqual(sceneRunFromBeatDataAttributes(plan), {
    "data-viz-manim-run-from-beat-checkpoint-count": "0",
    "data-viz-manim-run-from-beat-checkpoint-invalidates-count": "0",
    "data-viz-manim-run-from-beat-checkpoint-invalidated-keys": "none",
    "data-viz-manim-run-from-beat-checkpoint-invalidation-summary": "checkpointInvalidation:action=missing-checkpoint:invalidates=0:invalidated=none:retained=none",
    "data-viz-manim-run-from-beat-checkpoint-keys": "none",
    "data-viz-manim-run-from-beat-checkpoint-policy": "restore-existing-checkpoint-before-selected-beat-then-replay-window",
    "data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore": "none",
    "data-viz-manim-run-from-beat-checkpoint-restore-action": "missing-checkpoint",
    "data-viz-manim-run-from-beat-checkpoint-restore-key": "none",
    "data-viz-manim-run-from-beat-checkpoint-restore-mode": "missing-checkpoint",
    "data-viz-manim-run-from-beat-checkpoint-restore-ready": "false",
    "data-viz-manim-run-from-beat-checkpoint-summary": "checkpoint:missing-checkpoint:key=none:count=0:ready=false",
    "data-viz-manim-run-from-beat-composition-id": "none",
    "data-viz-manim-run-from-beat-composition-replay-policy": "restore-checkpoint-then-replay-selected-Scene.play-group-with-child-windows",
    "data-viz-manim-run-from-beat-composition-replay-ready": "false",
    "data-viz-manim-run-from-beat-composition-replay-summary": "composition:ready=false:id=none:type=none:windows=0",
    "data-viz-manim-run-from-beat-composition-type": "none",
    "data-viz-manim-run-from-beat-composition-window-count": "0",
    "data-viz-manim-run-from-beat-composition-window-ids": "none",
    "data-viz-manim-run-from-beat-composition-window-summary": "none",
    "data-viz-manim-run-from-beat-elapsed-before": "1.000",
    "data-viz-manim-run-from-beat-final-elapsed": "6.000",
    "data-viz-manim-run-from-beat-normalized-index": "1",
    "data-viz-manim-run-from-beat-prepared-count": "1",
    "data-viz-manim-run-from-beat-prepared-indices": "0",
    "data-viz-manim-run-from-beat-ready": "true",
    "data-viz-manim-run-from-beat-replay-count": "2",
    "data-viz-manim-run-from-beat-replay-indices": "1,2",
    "data-viz-manim-run-from-beat-replay-policy": expectedReplayPolicy,
    "data-viz-manim-run-from-beat-requested-index": "1",
    "data-viz-manim-run-from-beat-source-contract": expectedSourceContract,
    "data-viz-manim-run-from-beat-summary": plan.summary,
    "data-viz-manim-run-from-beat-total-play-count": "3"
  });
});

test("sceneRunFromBeatDataAttributes keeps older evidence snapshots readable after adding checkpoint invalidation fields", async () => {
  const { buildSceneRunFromBeatPlan, sceneRunFromBeatDataAttributes } = await importRunFromBeatModule();
  const currentPlan = buildSceneRunFromBeatPlan({
    playEndSeconds: [1, 2],
    playStartSeconds: [0, 1],
    requestedBeatIndex: 1
  });
  const legacySnapshot: Record<string, unknown> = { ...currentPlan };
  delete legacySnapshot.checkpointInvalidationSummary;
  delete legacySnapshot.checkpointRestoreAction;
  delete legacySnapshot.invalidatedCheckpointKeys;
  delete legacySnapshot.invalidatesLaterCheckpointCount;
  delete legacySnapshot.retainedCheckpointKeysAfterRestore;
  const attributes = sceneRunFromBeatDataAttributes(legacySnapshot as unknown as MathSceneRunFromBeatPlan);

  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidates-count"], "0");
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-invalidated-keys"], "none");
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-retained-keys-after-restore"], "none");
  assert.equal(attributes["data-viz-manim-run-from-beat-checkpoint-restore-action"], "missing-checkpoint");
  assert.equal(
    attributes["data-viz-manim-run-from-beat-checkpoint-invalidation-summary"],
    "checkpointInvalidation:action=missing-checkpoint:invalidates=0:invalidated=none:retained=none"
  );
});

test("serializeSceneRunFromBeatPlan emits deterministic script-safe replay JSON", async () => {
  const { buildSceneRunFromBeatPlan, serializeSceneRunFromBeatPlan } = await importRunFromBeatModule();
  const plan = buildSceneRunFromBeatPlan({
    playEndSeconds: [1, 2],
    playStartSeconds: [0, 1],
    requestedBeatIndex: 1
  });
  const unsafePlan = {
    ...plan,
    summary: "<run-from-beat>"
  } satisfies MathSceneRunFromBeatPlan;
  const serialized = serializeSceneRunFromBeatPlan(unsafePlan);
  const parsed = JSON.parse(serialized) as MathSceneRunFromBeatPlan;

  assert.equal(serializeSceneRunFromBeatPlan(JSON.parse(JSON.stringify(unsafePlan)) as MathSceneRunFromBeatPlan), serialized);
  assert.equal(parsed.version, "mais-manim-run-from-beat/v1");
  assert.equal(parsed.summary, "<run-from-beat>");
  assert.deepEqual(parsed.replayBeatIndices, [1]);
  assert.doesNotMatch(serialized, /<run-from-beat>|<\/script|undefined|NaN|Infinity/i);
  assert.match(serialized, /\\u003crun-from-beat>/);
});

test("Scene run-from-beat stays pure and documents the InteractiveScene replay source contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneRunFromBeat.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /InteractiveSceneEmbed/);
  assert.match(source, /run-from-beat/);
  assert.match(source, /checkpointed scene state/);
  assert.match(source, /SCENE_RUN_FROM_BEAT_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_RUN_FROM_BEAT_REPLAY_POLICY/);
  assert.match(source, /serializeSceneRunFromBeatPlan/);
  assert.match(source, /stableSerialize/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|window\.|document\.|setTimeout|requestAnimationFrame|ThreeDLabCanvas/);
});
