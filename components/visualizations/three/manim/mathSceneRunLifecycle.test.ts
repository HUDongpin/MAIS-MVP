import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { buildMathSceneSpecForThreeDFamily } from "./mathSceneRegistry";
import type { MathSceneSpec } from "./mathSceneTypes";

const expectedSceneRunLifecycleSourceContract =
  "Scene.run: setup -> construct -> Scene.play playback -> optional interact -> tear_down" as const;

type MathSceneRunPhase = "setup" | "construct" | "play" | "interact" | "tearDown";
type MathSceneRunPhaseStatus = "active" | "complete" | "pending" | "skipped";

type MathSceneRunPhaseEntry = {
  endSeconds: number;
  phase: MathSceneRunPhase;
  phaseIndex: number;
  startSeconds: number;
  status: MathSceneRunPhaseStatus;
};

type MathSceneRunLifecyclePlan = {
  activePhase: MathSceneRunPhase;
  activePhaseIndex: number;
  constructActionSummary: string;
  constructBindingCount: number;
  constructComplete: boolean;
  constructFormulaCount: number;
  constructObjectCount: number;
  elapsedSeconds: number;
  familyId: string;
  interactEnabled: boolean;
  numPlays: number;
  phaseCount: number;
  phaseStatusSummary: string;
  phases: MathSceneRunPhaseEntry[];
  playDurationSeconds: number;
  ready: boolean;
  runCallOrderSummary: string;
  runVersion: "mais-manim-scene-run/v1";
  sceneId: string;
  sceneSignature: string;
  setupActionSummary: string;
  setupComplete: boolean;
  signature: string;
  sourceContract: typeof expectedSceneRunLifecycleSourceContract;
  summary: string;
  tearDownReady: boolean;
  tearDownActionSummary: string;
  skippedPhaseCount: number;
  skippedPhaseIds: string;
  totalDuration: number;
};

type MathSceneRunLifecycleModule = {
  SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT: typeof expectedSceneRunLifecycleSourceContract;
  buildMathSceneRunLifecyclePlan: (input: {
    elapsedSeconds: number;
    interactEnabled?: boolean;
    scene: MathSceneSpec;
    sceneSignature: string;
    tearDownRequested?: boolean;
  }) => MathSceneRunLifecyclePlan;
  sceneRunLifecycleDataAttributes: (plan: MathSceneRunLifecyclePlan) => Record<string, string>;
  serializeMathSceneRunLifecyclePlan: (plan: MathSceneRunLifecyclePlan) => string;
};

const runLifecycleModulePath = "components/visualizations/three/manim/mathSceneRunLifecycle.ts";

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

async function importRunLifecycleModule() {
  assert.ok(fs.existsSync(runLifecycleModulePath), "MAIS Manim should provide a pure Scene.run lifecycle planning module");
  return (await import("./mathSceneRunLifecycle")) as MathSceneRunLifecycleModule;
}

test("builds a deterministic Scene.run lifecycle plan around the guided playback", async () => {
  const {
    SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT,
    buildMathSceneRunLifecyclePlan,
    serializeMathSceneRunLifecyclePlan
  } = await importRunLifecycleModule();
  const scene = buildFunctionGraphSpec();
  const playDurationSeconds = scene.timeline.reduce((sum, step) => sum + step.duration, 0);
  const plan = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: playDurationSeconds + 0.5,
    interactEnabled: true,
    scene,
    sceneSignature: "fnv1a-scene"
  });

  assert.equal(SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT, expectedSceneRunLifecycleSourceContract);
  assert.equal(plan.sourceContract, SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT);
  assert.equal(plan.runVersion, "mais-manim-scene-run/v1");
  assert.equal(plan.sceneId, scene.sceneId);
  assert.equal(plan.familyId, scene.familyId);
  assert.equal(plan.sceneSignature, "fnv1a-scene");
  assert.equal(plan.ready, true);
  assert.equal(plan.runCallOrderSummary, "setup>construct>play>interact");
  assert.equal(plan.setupComplete, true);
  assert.equal(plan.setupActionSummary, "setup>camera>camera_frame>scene_file_writer");
  assert.equal(plan.constructComplete, true);
  assert.equal(plan.constructActionSummary, "construct>scene_spec>mobjects>formulas>bindings");
  assert.equal(plan.constructObjectCount, scene.objects.length);
  assert.equal(plan.constructFormulaCount, scene.formulas.length);
  assert.equal(plan.constructBindingCount, scene.bindings.length);
  assert.equal(plan.interactEnabled, true);
  assert.equal(plan.numPlays, scene.timeline.length);
  assert.equal(plan.tearDownReady, false);
  assert.equal(plan.tearDownActionSummary, "pending");
  assert.equal(plan.activePhase, "interact");
  assert.equal(plan.activePhaseIndex, 3);
  assert.equal(plan.phaseCount, 5);
  assert.equal(
    plan.phaseStatusSummary,
    "setup=complete,construct=complete,play=complete,interact=active,tearDown=pending"
  );
  assert.equal(plan.skippedPhaseCount, 0);
  assert.equal(plan.skippedPhaseIds, "none");
  assert.equal(plan.playDurationSeconds, 10.84);
  assert.equal(plan.totalDuration, 10.84);
  assert.deepEqual(plan.phases.map((phase) => phase.phase), ["setup", "construct", "play", "interact", "tearDown"]);
  assert.deepEqual(plan.phases.map((phase) => phase.status), ["complete", "complete", "complete", "active", "pending"]);
  assert.equal(plan.phases[2].startSeconds, 0);
  assert.equal(plan.phases[2].endSeconds, 10.84);
  assert.match(plan.signature, /^scene-run-[0-9a-f]{8}$/);
  assert.equal(plan.summary, `${scene.sceneId}:phase=interact:interactive=true:teardown=false`);

  const serialized = serializeMathSceneRunLifecyclePlan(plan);
  assert.equal(
    serializeMathSceneRunLifecyclePlan(JSON.parse(JSON.stringify(plan)) as MathSceneRunLifecyclePlan),
    serialized
  );
  assert.doesNotMatch(serialized, /undefined|NaN|Infinity|<\/script/i);
});

test("moves from interactive Scene.run into tear down when requested", async () => {
  const { buildMathSceneRunLifecyclePlan } = await importRunLifecycleModule();
  const scene = buildFunctionGraphSpec();
  const playDurationSeconds = scene.timeline.reduce((sum, step) => sum + step.duration, 0);
  const plan = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: playDurationSeconds + 1,
    interactEnabled: true,
    scene,
    sceneSignature: "fnv1a-scene",
    tearDownRequested: true
  });

  assert.equal(plan.activePhase, "tearDown");
  assert.equal(plan.activePhaseIndex, 4);
  assert.equal(plan.tearDownReady, true);
  assert.equal(plan.runCallOrderSummary, "setup>construct>play>interact>tear_down");
  assert.equal(plan.tearDownActionSummary, "tear_down>scene_file_writer_finish");
  assert.deepEqual(plan.phases.map((phase) => phase.status), ["complete", "complete", "complete", "complete", "active"]);
  assert.equal(plan.summary, `${scene.sceneId}:phase=tearDown:interactive=true:teardown=true`);
});

test("skips interact when authoring interactivity is disabled", async () => {
  const { buildMathSceneRunLifecyclePlan } = await importRunLifecycleModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: 999,
    interactEnabled: false,
    scene,
    sceneSignature: "fnv1a-scene"
  });

  assert.equal(plan.activePhase, "tearDown");
  assert.equal(plan.interactEnabled, false);
  assert.equal(plan.tearDownReady, true);
  assert.equal(plan.runCallOrderSummary, "setup>construct>play>tear_down");
  assert.equal(plan.tearDownActionSummary, "tear_down>scene_file_writer_finish");
  assert.equal(plan.phases[3].status, "skipped");
  assert.equal(plan.skippedPhaseCount, 1);
  assert.equal(plan.skippedPhaseIds, "interact");
  assert.equal(
    plan.phaseStatusSummary,
    "setup=complete,construct=complete,play=complete,interact=skipped,tearDown=active"
  );
});

test("maps Scene.run lifecycle plans to browser QA data attributes", async () => {
  const {
    SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT,
    buildMathSceneRunLifecyclePlan,
    sceneRunLifecycleDataAttributes
  } = await importRunLifecycleModule();
  const scene = buildFunctionGraphSpec();
  const plan = buildMathSceneRunLifecyclePlan({
    elapsedSeconds: 1.23456,
    scene,
    sceneSignature: "fnv1a-scene"
  });

  assert.deepEqual(sceneRunLifecycleDataAttributes(plan), {
    "data-viz-manim-scene-run-active-phase": "play",
    "data-viz-manim-scene-run-active-phase-index": "2",
    "data-viz-manim-scene-run-construct-actions": "construct>scene_spec>mobjects>formulas>bindings",
    "data-viz-manim-scene-run-construct-binding-count": String(scene.bindings.length),
    "data-viz-manim-scene-run-construct-complete": "true",
    "data-viz-manim-scene-run-construct-formula-count": String(scene.formulas.length),
    "data-viz-manim-scene-run-construct-object-count": String(scene.objects.length),
    "data-viz-manim-scene-run-elapsed-seconds": "1.235",
    "data-viz-manim-scene-run-interactive": "true",
    "data-viz-manim-scene-run-num-plays": String(scene.timeline.length),
    "data-viz-manim-scene-run-phase-count": "5",
    "data-viz-manim-scene-run-phase-status-summary": "setup=complete,construct=complete,play=active,interact=pending,tearDown=pending",
    "data-viz-manim-scene-run-play-duration": "10.840",
    "data-viz-manim-scene-run-ready": "true",
    "data-viz-manim-scene-run-source-contract": SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT,
    "data-viz-manim-scene-run-call-order": "setup>construct>play",
    "data-viz-manim-scene-run-scene-id": scene.sceneId,
    "data-viz-manim-scene-run-scene-signature": "fnv1a-scene",
    "data-viz-manim-scene-run-setup-actions": "setup>camera>camera_frame>scene_file_writer",
    "data-viz-manim-scene-run-setup-complete": "true",
    "data-viz-manim-scene-run-signature": plan.signature,
    "data-viz-manim-scene-run-skipped-phase-count": "0",
    "data-viz-manim-scene-run-skipped-phase-ids": "none",
    "data-viz-manim-scene-run-summary": plan.summary,
    "data-viz-manim-scene-run-teardown-actions": "pending",
    "data-viz-manim-scene-run-teardown-ready": "false",
    "data-viz-manim-scene-run-total-duration": "10.840"
  });
});

test("keeps Scene.run lifecycle planning pure and renderer independent", () => {
  assert.ok(fs.existsSync(runLifecycleModulePath), "Scene.run lifecycle planning should live in a pure Manim math module");
  const source = fs.readFileSync(runLifecycleModulePath, "utf8");

  assert.match(source, /import \{ buildScenePlaybackPlan \} from "\.\/mathScenePlayback"/);
  assert.match(source, /import type \{ MathSceneSpec \} from "\.\/mathSceneTypes"/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|MathSceneRuntime|ThreeDLabCanvas|window|document/);
  assert.match(source, /buildMathSceneRunLifecyclePlan/);
  assert.match(source, /sceneRunLifecycleDataAttributes/);
  assert.match(source, /SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT/);
  assert.match(source, /serializeMathSceneRunLifecyclePlan/);
});
