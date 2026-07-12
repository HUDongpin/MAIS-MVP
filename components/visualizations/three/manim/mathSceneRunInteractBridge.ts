import type { MathSceneInteractLoopPlan } from "./mathSceneInteractLoop";
import type { MathSceneRunLifecyclePlan } from "./mathSceneRunLifecycle";

export const SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT =
  "Scene.run optional interact calls Scene.interact; no-window returns immediately, otherwise the interact loop gates tear_down" as const;

export type MathSceneRunInteractBridgeStatus =
  | "interact-complete"
  | "interact-skipped"
  | "loop-active"
  | "quit-requested"
  | "returned-no-window"
  | "waiting-for-interact"
  | "window-closing";

export type MathSceneRunInteractBridgePlan = {
  activePhase: MathSceneRunLifecyclePlan["activePhase"];
  callOrderSummary: string;
  callsInteract: boolean;
  interactEnabled: boolean;
  interactStatePolicy: MathSceneInteractLoopPlan["statePolicy"];
  interactTermination: MathSceneInteractLoopPlan["termination"];
  loopFrameCount: number;
  loopHasWindow: boolean;
  readyForTearDown: boolean;
  sceneId: string;
  sourceContract: typeof SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT;
  status: MathSceneRunInteractBridgeStatus;
  summary: string;
  updateFrameCallCount: number;
  version: "mais-manim-scene-run-interact-bridge/v1";
};

export type MathSceneRunInteractBridgeInput = {
  interactLoopPlan: MathSceneInteractLoopPlan;
  sceneRunLifecycle: MathSceneRunLifecyclePlan;
};

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

function callsInteract(lifecycle: MathSceneRunLifecyclePlan) {
  return lifecycle.interactEnabled && lifecycle.activePhase === "interact";
}

function statusFor(input: MathSceneRunInteractBridgeInput): MathSceneRunInteractBridgeStatus {
  const lifecycle = input.sceneRunLifecycle;
  const loop = input.interactLoopPlan;

  if (!lifecycle.interactEnabled) return "interact-skipped";
  if (lifecycle.activePhase === "tearDown") return "interact-complete";
  if (lifecycle.activePhase !== "interact") return "waiting-for-interact";
  if (loop.termination === "no-window") return "returned-no-window";
  if (loop.termination === "quit-interaction") return "quit-requested";
  if (loop.termination === "window-closing") return "window-closing";
  return "loop-active";
}

function readyForTearDown(status: MathSceneRunInteractBridgeStatus) {
  return status === "interact-complete" ||
    status === "interact-skipped" ||
    status === "quit-requested" ||
    status === "returned-no-window" ||
    status === "window-closing";
}

function callOrderSummary(input: MathSceneRunInteractBridgeInput, status: MathSceneRunInteractBridgeStatus) {
  const lifecycle = input.sceneRunLifecycle;
  const interactBaseOrder = lifecycle.runCallOrderSummary.endsWith(">interact")
    ? lifecycle.runCallOrderSummary.slice(0, -">interact".length)
    : lifecycle.runCallOrderSummary;

  if (status === "interact-skipped") return "setup>construct>play>interact-skipped>tear_down-ready";
  if (status === "interact-complete") return `${lifecycle.runCallOrderSummary}>interact-complete`;
  if (status === "waiting-for-interact") return `${lifecycle.runCallOrderSummary}>interact-pending`;
  if (status === "loop-active") return `${interactBaseOrder}>interact(loop-active)`;

  return `${interactBaseOrder}>interact(${input.interactLoopPlan.termination})>tear_down-ready`;
}

export function buildSceneRunInteractBridgePlan(
  input: MathSceneRunInteractBridgeInput
): MathSceneRunInteractBridgePlan {
  const status = statusFor(input);
  const canTearDown = readyForTearDown(status);

  return {
    activePhase: input.sceneRunLifecycle.activePhase,
    callOrderSummary: callOrderSummary(input, status),
    callsInteract: callsInteract(input.sceneRunLifecycle),
    interactEnabled: input.sceneRunLifecycle.interactEnabled,
    interactStatePolicy: input.interactLoopPlan.statePolicy,
    interactTermination: input.interactLoopPlan.termination,
    loopFrameCount: input.interactLoopPlan.frameCount,
    loopHasWindow: input.interactLoopPlan.hasWindow,
    readyForTearDown: canTearDown,
    sceneId: input.sceneRunLifecycle.sceneId,
    sourceContract: SCENE_RUN_INTERACT_BRIDGE_SOURCE_CONTRACT,
    status,
    summary: [
      `scene-run-interact:${input.sceneRunLifecycle.sceneId}`,
      `phase=${input.sceneRunLifecycle.activePhase}`,
      `termination=${input.interactLoopPlan.termination}`,
      `status=${status}`,
      `teardown=${String(canTearDown)}`
    ].join(":"),
    updateFrameCallCount: input.interactLoopPlan.updateFrameCallCount,
    version: "mais-manim-scene-run-interact-bridge/v1"
  };
}

export function sceneRunInteractBridgeDataAttributes(plan: MathSceneRunInteractBridgePlan): Record<string, string> {
  return {
    "data-viz-manim-scene-run-interact-active-phase": plan.activePhase,
    "data-viz-manim-scene-run-interact-call-order": plan.callOrderSummary,
    "data-viz-manim-scene-run-interact-calls-interact": String(plan.callsInteract),
    "data-viz-manim-scene-run-interact-enabled": String(plan.interactEnabled),
    "data-viz-manim-scene-run-interact-loop-frame-count": String(plan.loopFrameCount),
    "data-viz-manim-scene-run-interact-loop-has-window": String(plan.loopHasWindow),
    "data-viz-manim-scene-run-interact-ready-for-teardown": String(plan.readyForTearDown),
    "data-viz-manim-scene-run-interact-scene-id": plan.sceneId,
    "data-viz-manim-scene-run-interact-source-contract": plan.sourceContract,
    "data-viz-manim-scene-run-interact-state-policy": plan.interactStatePolicy,
    "data-viz-manim-scene-run-interact-status": plan.status,
    "data-viz-manim-scene-run-interact-summary": plan.summary,
    "data-viz-manim-scene-run-interact-termination": plan.interactTermination,
    "data-viz-manim-scene-run-interact-update-frame-count": String(plan.updateFrameCallCount)
  };
}

export function serializeSceneRunInteractBridgePlan(plan: MathSceneRunInteractBridgePlan) {
  return stableSerialize(plan);
}
