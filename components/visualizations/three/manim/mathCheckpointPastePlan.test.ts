import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  SCENE_CHECKPOINT_PASTE_REPLAY_POLICY,
  SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT
} from "./mathCheckpointPastePlan";
import {
  SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
  SCENE_PROGRESS_CONTROL_STATE_POLICY,
  type MathSceneProgressControlPlan
} from "./mathSceneProgressControl";
import {
  SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
  SCENE_SKIP_CONTROL_STATE_POLICY,
  type MathSceneSkipControlPlan
} from "./mathSceneSkipControl";

type MathCheckpointPastePlan = {
  checkpointKey: string;
  elapsedSeconds: number;
  invalidatesLaterCheckpointCount: number;
  invalidatedCheckpointKeys: string[];
  lineCount: number;
  operationLineCount: number;
  progressBar: boolean;
  progressControlFinalShowAnimationProgress: boolean;
  progressControlPlan: MathSceneProgressControlPlan;
  progressControlRestoredPreviousStatus: boolean;
  progressControlSummary: string;
  progressControlTransitionCount: number;
  record: boolean;
  retainedCheckpointKeysAfterRestore: string[];
  checkpointRestoreAction: "save-new-checkpoint" | "restore-and-invalidate-later" | "restore-without-invalidating";
  restoreMode: "restore-existing" | "save-new";
  restoresExistingCheckpoint: boolean;
  replayPolicy: typeof SCENE_CHECKPOINT_PASTE_REPLAY_POLICY;
  sceneId: string;
  skip: boolean;
  skipControlFinalSkipAnimations: boolean;
  skipControlPlan: MathSceneSkipControlPlan;
  skipControlStoppedTransitionCount: number;
  skipControlSummary: string;
  skipControlTransitionCount: number;
  sourceLabel: string;
  sourceContract: typeof SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-checkpoint-paste/v1";
};

type MathCheckpointPastePlanModule = {
  buildMathCheckpointPastePlan: (input: {
    checkpointKeys?: string[];
    elapsedSeconds?: number;
    initialShowAnimationProgress?: boolean;
    initialSkipAnimations?: boolean;
    progressBar?: boolean;
    record?: boolean;
    sceneId: string;
    skip?: boolean;
    snippet: string;
  }) => MathCheckpointPastePlan;
  checkpointPastePlanDataAttributes: (plan: MathCheckpointPastePlan) => Record<string, string>;
  serializeMathCheckpointPastePlan: (plan: MathCheckpointPastePlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathCheckpointPastePlan.ts";

async function importCheckpointPastePlanModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure checkpoint-paste authoring plan module");
  return (await import("./mathCheckpointPastePlan")) as MathCheckpointPastePlanModule;
}

test("extracts a checkpoint key from pasted Manim-style comment snippets without executing code", async () => {
  const { buildMathCheckpointPastePlan } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    elapsedSeconds: 1.23456,
    sceneId: "mais-manim-function-graph",
    snippet: [
      "// slope handoff",
      "curve = axes.plot(lambda x: x * x)",
      "self.play(Create(curve))"
    ].join("\n")
  });

  assert.equal(plan.version, "mais-manim-checkpoint-paste/v1");
  assert.equal(plan.sceneId, "mais-manim-function-graph");
  assert.equal(plan.checkpointKey, "slope handoff");
  assert.equal(plan.sourceLabel, "// slope handoff");
  assert.equal(plan.lineCount, 3);
  assert.equal(plan.operationLineCount, 2);
  assert.equal(plan.elapsedSeconds, 1.235);
  assert.equal(plan.restoreMode, "save-new");
  assert.equal(plan.restoresExistingCheckpoint, false);
  assert.equal(plan.invalidatesLaterCheckpointCount, 0);
  assert.deepEqual(plan.invalidatedCheckpointKeys, []);
  assert.deepEqual(plan.retainedCheckpointKeysAfterRestore, []);
  assert.equal(plan.checkpointRestoreAction, "save-new-checkpoint");
  assert.equal(plan.skip, false);
  assert.equal(plan.record, false);
  assert.equal(plan.progressBar, true);
  assert.equal(plan.sourceContract, SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT);
  assert.equal(plan.replayPolicy, SCENE_CHECKPOINT_PASTE_REPLAY_POLICY);
  assert.equal(
    plan.summary,
    "checkpointPaste:mais-manim-function-graph:save-new:key=slope handoff:lines=3:operations=2:skip=false:record=false:invalidates=0"
  );
});

test("detects existing checkpoints and later-checkpoint invalidation before paste restore", async () => {
  const { buildMathCheckpointPastePlan } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    checkpointKeys: ["intro", "slope handoff", "zoom detail"],
    progressBar: false,
    record: true,
    sceneId: "mais-manim-function-graph",
    skip: true,
    snippet: "# slope handoff\nself.play(point.animate.move_to(target))"
  });

  assert.equal(plan.checkpointKey, "slope handoff");
  assert.equal(plan.restoreMode, "restore-existing");
  assert.equal(plan.restoresExistingCheckpoint, true);
  assert.equal(plan.invalidatesLaterCheckpointCount, 1);
  assert.deepEqual(plan.invalidatedCheckpointKeys, ["zoom detail"]);
  assert.deepEqual(plan.retainedCheckpointKeysAfterRestore, ["intro", "slope handoff"]);
  assert.equal(plan.checkpointRestoreAction, "restore-and-invalidate-later");
  assert.equal(plan.skip, true);
  assert.equal(plan.record, true);
  assert.equal(plan.progressBar, false);
  assert.equal(
    plan.summary,
    "checkpointPaste:mais-manim-function-graph:restore-existing:key=slope handoff:lines=2:operations=1:skip=true:record=true:invalidates=1"
  );
});

test("models checkpoint_paste skip=true as a temporary Manim skip context", async () => {
  const {
    buildMathCheckpointPastePlan,
    checkpointPastePlanDataAttributes
  } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    initialSkipAnimations: false,
    sceneId: "mais-manim-function-graph",
    skip: true,
    snippet: "// quick preview\nself.play(Create(curve))"
  });
  const attributes = checkpointPastePlanDataAttributes(plan);

  assert.equal(plan.skip, true);
  assert.equal(plan.skipControlFinalSkipAnimations, false);
  assert.equal(plan.skipControlStoppedTransitionCount, 1);
  assert.equal(plan.skipControlTransitionCount, 2);
  assert.equal(
    plan.skipControlSummary,
    "skipControl:transitions=2:finalSkip=false:original=false:stopped=1:actions=temp_skip_enter,temp_skip_exit"
  );
  assert.equal(attributes["data-viz-manim-skip-control-action-summary"], "temp_skip_enter,temp_skip_exit");
  assert.equal(attributes["data-viz-manim-skip-control-final-skip"], "false");
  assert.equal(attributes["data-viz-manim-skip-control-stopped-transition-count"], "1");
});

test("models checkpoint_paste progress_bar=true as a temporary Manim progress context", async () => {
  const {
    buildMathCheckpointPastePlan,
    checkpointPastePlanDataAttributes
  } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    initialShowAnimationProgress: false,
    progressBar: true,
    sceneId: "mais-manim-function-graph",
    snippet: "// render with progress\nself.play(Create(curve))"
  });
  const attributes = checkpointPastePlanDataAttributes(plan);

  assert.equal(plan.progressBar, true);
  assert.equal(plan.progressControlFinalShowAnimationProgress, false);
  assert.equal(plan.progressControlRestoredPreviousStatus, true);
  assert.equal(plan.progressControlTransitionCount, 2);
  assert.equal(
    plan.progressControlSummary,
    "progressControl:requested=true:transitions=2:initial=false:final=false:restored=true:actions=temp_progress_bar_enter,temp_progress_bar_exit"
  );
  assert.equal(attributes["data-viz-manim-progress-control-action-summary"], "temp_progress_bar_enter,temp_progress_bar_exit");
  assert.equal(attributes["data-viz-manim-progress-control-final-progress"], "false");
  assert.equal(attributes["data-viz-manim-progress-control-requested"], "true");
  assert.equal(attributes["data-viz-manim-progress-control-transition-count"], "2");
});

test("falls back to a deterministic scene-local checkpoint key when snippets have no comment label", async () => {
  const { buildMathCheckpointPastePlan } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    checkpointKeys: ["mais-manim-function-graph:paste"],
    sceneId: "mais-manim-function-graph",
    snippet: "self.play(Create(curve))"
  });

  assert.equal(plan.checkpointKey, "mais-manim-function-graph:paste");
  assert.equal(plan.sourceLabel, "scene fallback");
  assert.equal(plan.restoreMode, "restore-existing");
  assert.equal(plan.lineCount, 1);
  assert.equal(plan.operationLineCount, 1);
});

test("maps checkpoint-paste plans to browser QA data attributes", async () => {
  const {
    buildMathCheckpointPastePlan,
    checkpointPastePlanDataAttributes
  } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    checkpointKeys: ["intro", "slope handoff"],
    record: true,
    sceneId: "mais-manim-function-graph",
    snippet: "// slope handoff\nself.play(Create(curve))"
  });

  assert.deepEqual(checkpointPastePlanDataAttributes(plan), {
    "data-viz-manim-checkpoint-paste-key": "slope handoff",
    "data-viz-manim-checkpoint-paste-line-count": "2",
    "data-viz-manim-checkpoint-paste-operation-count": "1",
    "data-viz-manim-checkpoint-paste-invalidates-count": "0",
    "data-viz-manim-checkpoint-paste-invalidated-keys": "none",
    "data-viz-manim-checkpoint-paste-retained-keys-after-restore": "intro,slope handoff",
    "data-viz-manim-checkpoint-paste-restore-action": "restore-without-invalidating",
    "data-viz-manim-checkpoint-paste-elapsed-seconds": "0.000",
    "data-viz-manim-checkpoint-paste-progress-bar": "true",
    "data-viz-manim-checkpoint-paste-record": "true",
    "data-viz-manim-checkpoint-paste-replay-policy": SCENE_CHECKPOINT_PASTE_REPLAY_POLICY,
    "data-viz-manim-checkpoint-paste-restores-existing": "true",
    "data-viz-manim-checkpoint-paste-restore-mode": "restore-existing",
    "data-viz-manim-checkpoint-paste-scene-id": "mais-manim-function-graph",
    "data-viz-manim-checkpoint-paste-skip": "false",
    "data-viz-manim-checkpoint-paste-source-contract": SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT,
    "data-viz-manim-checkpoint-paste-source-label": "// slope handoff",
    "data-viz-manim-checkpoint-paste-summary": plan.summary,
    "data-viz-manim-checkpoint-paste-version": "mais-manim-checkpoint-paste/v1",
    "data-viz-manim-progress-control-action-summary": "temp_progress_bar_enter,temp_progress_bar_exit",
    "data-viz-manim-progress-control-final-progress": "false",
    "data-viz-manim-progress-control-initial-progress": "false",
    "data-viz-manim-progress-control-previous-progress": "false",
    "data-viz-manim-progress-control-requested": "true",
    "data-viz-manim-progress-control-restored-previous": "true",
    "data-viz-manim-progress-control-source-contract": SCENE_PROGRESS_CONTROL_SOURCE_CONTRACT,
    "data-viz-manim-progress-control-state-policy": SCENE_PROGRESS_CONTROL_STATE_POLICY,
    "data-viz-manim-progress-control-summary": "progressControl:requested=true:transitions=2:initial=false:final=false:restored=true:actions=temp_progress_bar_enter,temp_progress_bar_exit",
    "data-viz-manim-progress-control-transition-count": "2",
    "data-viz-manim-skip-control-action-summary": "none",
    "data-viz-manim-skip-control-final-original-status": "false",
    "data-viz-manim-skip-control-final-skip": "false",
    "data-viz-manim-skip-control-final-temp-previous": "false",
    "data-viz-manim-skip-control-has-original-status": "true",
    "data-viz-manim-skip-control-skipped-transition-count": "0",
    "data-viz-manim-skip-control-source-contract": SCENE_SKIP_CONTROL_SOURCE_CONTRACT,
    "data-viz-manim-skip-control-state-policy": SCENE_SKIP_CONTROL_STATE_POLICY,
    "data-viz-manim-skip-control-stopped-transition-count": "0",
    "data-viz-manim-skip-control-summary": "skipControl:transitions=0:finalSkip=false:original=false:stopped=0:actions=none",
    "data-viz-manim-skip-control-transition-count": "0"
  });
});

test("serializes checkpoint-paste plans as escaped deterministic browser JSON", async () => {
  const {
    buildMathCheckpointPastePlan,
    serializeMathCheckpointPastePlan
  } = await importCheckpointPastePlanModule();
  const plan = buildMathCheckpointPastePlan({
    checkpointKeys: ["<slope handoff>"],
    sceneId: "mais-manim-function-graph",
    snippet: "// <slope handoff>\nself.play(Create(curve))"
  });
  const serialized = serializeMathCheckpointPastePlan(plan);

  assert.equal(plan.checkpointKey, "<slope handoff>");
  assert.doesNotMatch(serialized, /<slope/);
  assert.match(serialized, /\\u003cslope handoff>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("keeps checkpoint-paste authoring pure and renderer independent", () => {
  assert.ok(fs.existsSync(modulePath), "checkpoint-paste authoring should live in a pure Manim math module");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|eval\(|new Function|MathSceneRuntime|ThreeDLabCanvas/);
  assert.match(source, /SCENE_CHECKPOINT_PASTE_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_CHECKPOINT_PASTE_REPLAY_POLICY/);
  assert.match(source, /buildMathCheckpointPastePlan/);
  assert.match(source, /checkpointPastePlanDataAttributes/);
});
