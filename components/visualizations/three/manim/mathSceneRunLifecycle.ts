import { buildScenePlaybackPlan } from "./mathScenePlayback";
import type { MathSceneSpec } from "./mathSceneTypes";

export const SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT =
  "Scene.run: setup -> construct -> Scene.play playback -> optional interact -> tear_down" as const;

export type MathSceneRunPhase = "setup" | "construct" | "play" | "interact" | "tearDown";
export type MathSceneRunPhaseStatus = "active" | "complete" | "pending" | "skipped";

export type MathSceneRunPhaseEntry = {
  endSeconds: number;
  phase: MathSceneRunPhase;
  phaseIndex: number;
  startSeconds: number;
  status: MathSceneRunPhaseStatus;
};

export type MathSceneRunLifecyclePlan = {
  activePhase: MathSceneRunPhase;
  activePhaseIndex: number;
  constructActionSummary: string;
  constructBindingCount: number;
  constructComplete: boolean;
  constructFormulaCount: number;
  constructObjectCount: number;
  elapsedSeconds: number;
  familyId: MathSceneSpec["familyId"];
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
  sourceContract: typeof SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT;
  skippedPhaseCount: number;
  skippedPhaseIds: string;
  summary: string;
  tearDownActionSummary: string;
  tearDownReady: boolean;
  totalDuration: number;
};

export type MathSceneRunLifecyclePlanInput = {
  elapsedSeconds: number;
  interactEnabled?: boolean;
  scene: MathSceneSpec;
  sceneSignature: string;
  tearDownRequested?: boolean;
};

const phaseOrder: MathSceneRunPhase[] = ["setup", "construct", "play", "interact", "tearDown"];

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundMillis(value: number) {
  return Math.round(value * 1000) / 1000;
}

function stableValue(value: unknown): unknown {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (Array.isArray(value)) return value.map((entry) => stableValue(entry) ?? null);
  if (!value || typeof value !== "object") return value;

  const stableObject: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value).sort(([left], [right]) => left.localeCompare(right))) {
    if (entry !== undefined) stableObject[key] = stableValue(entry);
  }

  return stableObject;
}

function stableSerialize(value: unknown) {
  return JSON.stringify(stableValue(value))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function hashStableJson(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return `scene-run-${hash.toString(16).padStart(8, "0")}`;
}

function activePhaseFor(
  elapsedSeconds: number,
  playDurationSeconds: number,
  interactEnabled: boolean,
  tearDownRequested: boolean
): MathSceneRunPhase {
  if (elapsedSeconds < playDurationSeconds) return "play";
  if (!interactEnabled || tearDownRequested) return "tearDown";
  return "interact";
}

function phaseStatus(
  phase: MathSceneRunPhase,
  activePhase: MathSceneRunPhase,
  interactEnabled: boolean
): MathSceneRunPhaseStatus {
  if (phase === "setup" || phase === "construct") return "complete";
  if (phase === "play") return activePhase === "play" ? "active" : "complete";
  if (phase === "interact") {
    if (!interactEnabled) return "skipped";
    if (activePhase === "interact") return "active";
    if (activePhase === "tearDown") return "complete";
    return "pending";
  }
  return activePhase === "tearDown" ? "active" : "pending";
}

function buildPhases(activePhase: MathSceneRunPhase, playDurationSeconds: number, interactEnabled: boolean) {
  return phaseOrder.map((phase, phaseIndex): MathSceneRunPhaseEntry => {
    const startSeconds = phase === "setup" || phase === "construct" || phase === "play" ? 0 : playDurationSeconds;
    const endSeconds = phase === "play" ? playDurationSeconds : startSeconds;

    return {
      endSeconds,
      phase,
      phaseIndex,
      startSeconds,
      status: phaseStatus(phase, activePhase, interactEnabled)
    };
  });
}

function phaseStatusSummary(phases: MathSceneRunPhaseEntry[]) {
  return phases.map((phase) => `${phase.phase}=${phase.status}`).join(",");
}

function skippedPhaseIds(phases: MathSceneRunPhaseEntry[]) {
  const skipped = phases.filter((phase) => phase.status === "skipped").map((phase) => phase.phase);
  return skipped.join(",") || "none";
}

function runCallOrderSummary(activePhase: MathSceneRunPhase, interactEnabled: boolean) {
  const order = ["setup", "construct", "play"];
  if (activePhase === "interact" || (activePhase === "tearDown" && interactEnabled)) order.push("interact");
  if (activePhase === "tearDown") order.push("tear_down");
  return order.join(">");
}

function tearDownActionSummary(activePhase: MathSceneRunPhase) {
  return activePhase === "tearDown" ? "tear_down>scene_file_writer_finish" : "pending";
}

export function buildMathSceneRunLifecyclePlan({
  elapsedSeconds,
  interactEnabled = true,
  scene,
  sceneSignature,
  tearDownRequested = false
}: MathSceneRunLifecyclePlanInput): MathSceneRunLifecyclePlan {
  const playbackPlan = buildScenePlaybackPlan(scene.timeline);
  const playDurationSeconds = roundMillis(playbackPlan.totalDuration);
  const numPlays = playbackPlan.plays.length;
  const safeElapsedSeconds = roundMillis(Math.max(0, finite(elapsedSeconds)));
  const activePhase = activePhaseFor(safeElapsedSeconds, playDurationSeconds, interactEnabled, tearDownRequested);
  const activePhaseIndex = phaseOrder.indexOf(activePhase);
  const phases = buildPhases(activePhase, playDurationSeconds, interactEnabled);
  const skippedPhases = phases.filter((phase) => phase.status === "skipped");
  const tearDownReady = activePhase === "tearDown";
  const summary = `${scene.sceneId}:phase=${activePhase}:interactive=${interactEnabled ? "true" : "false"}:teardown=${tearDownRequested ? "true" : "false"}`;
  const basePlan = {
    activePhase,
    activePhaseIndex,
    constructActionSummary: "construct>scene_spec>mobjects>formulas>bindings",
    constructBindingCount: scene.bindings.length,
    constructComplete: true,
    constructFormulaCount: scene.formulas.length,
    constructObjectCount: scene.objects.length,
    elapsedSeconds: safeElapsedSeconds,
    familyId: scene.familyId,
    interactEnabled,
    numPlays,
    phaseCount: phases.length,
    phaseStatusSummary: phaseStatusSummary(phases),
    phases,
    playDurationSeconds,
    ready: scene.objects.length > 0 && scene.cameraShots.length > 0 && scene.timeline.length > 0 && sceneSignature.trim().length > 0,
    runCallOrderSummary: runCallOrderSummary(activePhase, interactEnabled),
    runVersion: "mais-manim-scene-run/v1" as const,
    sceneId: scene.sceneId,
    sceneSignature,
    setupActionSummary: "setup>camera>camera_frame>scene_file_writer",
    setupComplete: true,
    sourceContract: SCENE_RUN_LIFECYCLE_SOURCE_CONTRACT,
    summary,
    skippedPhaseCount: skippedPhases.length,
    skippedPhaseIds: skippedPhaseIds(phases),
    tearDownActionSummary: tearDownActionSummary(activePhase),
    tearDownReady,
    totalDuration: playDurationSeconds
  };

  return {
    ...basePlan,
    signature: hashStableJson(stableSerialize(basePlan))
  };
}

export function sceneRunLifecycleDataAttributes(plan: MathSceneRunLifecyclePlan) {
  return {
    "data-viz-manim-scene-run-active-phase": plan.activePhase,
    "data-viz-manim-scene-run-active-phase-index": String(plan.activePhaseIndex),
    "data-viz-manim-scene-run-construct-actions": plan.constructActionSummary,
    "data-viz-manim-scene-run-construct-binding-count": String(plan.constructBindingCount),
    "data-viz-manim-scene-run-construct-complete": plan.constructComplete ? "true" : "false",
    "data-viz-manim-scene-run-construct-formula-count": String(plan.constructFormulaCount),
    "data-viz-manim-scene-run-construct-object-count": String(plan.constructObjectCount),
    "data-viz-manim-scene-run-elapsed-seconds": plan.elapsedSeconds.toFixed(3),
    "data-viz-manim-scene-run-interactive": plan.interactEnabled ? "true" : "false",
    "data-viz-manim-scene-run-num-plays": String(plan.numPlays),
    "data-viz-manim-scene-run-phase-count": String(plan.phaseCount),
    "data-viz-manim-scene-run-phase-status-summary": plan.phaseStatusSummary,
    "data-viz-manim-scene-run-play-duration": plan.playDurationSeconds.toFixed(3),
    "data-viz-manim-scene-run-ready": plan.ready ? "true" : "false",
    "data-viz-manim-scene-run-source-contract": plan.sourceContract,
    "data-viz-manim-scene-run-call-order": plan.runCallOrderSummary,
    "data-viz-manim-scene-run-scene-id": plan.sceneId,
    "data-viz-manim-scene-run-scene-signature": plan.sceneSignature,
    "data-viz-manim-scene-run-setup-actions": plan.setupActionSummary,
    "data-viz-manim-scene-run-setup-complete": plan.setupComplete ? "true" : "false",
    "data-viz-manim-scene-run-signature": plan.signature,
    "data-viz-manim-scene-run-skipped-phase-count": String(plan.skippedPhaseCount),
    "data-viz-manim-scene-run-skipped-phase-ids": plan.skippedPhaseIds,
    "data-viz-manim-scene-run-summary": plan.summary,
    "data-viz-manim-scene-run-teardown-actions": plan.tearDownActionSummary,
    "data-viz-manim-scene-run-teardown-ready": plan.tearDownReady ? "true" : "false",
    "data-viz-manim-scene-run-total-duration": plan.totalDuration.toFixed(3)
  } as const;
}

export function serializeMathSceneRunLifecyclePlan(plan: MathSceneRunLifecyclePlan) {
  return stableSerialize(plan);
}
