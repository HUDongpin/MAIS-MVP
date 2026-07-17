import type { MathSceneFileWriterCombinePlan } from "./mathSceneFileWriterCombinePlan";
import type { MathSceneRunLifecyclePlan } from "./mathSceneRunLifecycle";

export const SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT =
  "Scene.run tear_down gates SceneFileWriter.finish; file-writer combine is executable only after tear_down is active" as const;

export type MathSceneRunFileWriterFinishStatus =
  | "combine-not-ready"
  | "ready-to-finish"
  | "waiting-for-tear-down";

export type MathSceneRunFileWriterFinishBridgePlan = {
  combineAction: MathSceneFileWriterCombinePlan["action"];
  concatManifestPath: string;
  finalMoviePath: string;
  finishCallOrderSummary: string;
  finishReady: boolean;
  finishRequired: boolean;
  finishStatus: MathSceneRunFileWriterFinishStatus;
  partialMovieCount: number;
  sceneId: string;
  sourceContract: typeof SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  tearDownActionSummary: string;
  tearDownReady: boolean;
  version: "mais-manim-scene-run-file-writer-finish-bridge/v1";
};

export type MathSceneRunFileWriterFinishBridgeInput = {
  fileWriterCombinePlan: MathSceneFileWriterCombinePlan;
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

function finishStatus(input: MathSceneRunFileWriterFinishBridgeInput): MathSceneRunFileWriterFinishStatus {
  if (!input.sceneRunLifecycle.tearDownReady) return "waiting-for-tear-down";
  return input.fileWriterCombinePlan.ready ? "ready-to-finish" : "combine-not-ready";
}

function finishCallOrderSummary(
  sceneRunLifecycle: MathSceneRunLifecyclePlan,
  status: MathSceneRunFileWriterFinishStatus
) {
  if (!sceneRunLifecycle.tearDownReady) return `${sceneRunLifecycle.runCallOrderSummary}>finish-deferred`;
  if (status === "ready-to-finish") return `${sceneRunLifecycle.runCallOrderSummary}>scene_file_writer.finish`;
  return `${sceneRunLifecycle.runCallOrderSummary}>scene_file_writer.finish-blocked`;
}

export function buildSceneRunFileWriterFinishBridgePlan(
  input: MathSceneRunFileWriterFinishBridgeInput
): MathSceneRunFileWriterFinishBridgePlan {
  const status = finishStatus(input);
  const finishRequired = input.sceneRunLifecycle.tearDownReady;
  const finishReady = finishRequired && status === "ready-to-finish";

  return {
    combineAction: input.fileWriterCombinePlan.action,
    concatManifestPath: input.fileWriterCombinePlan.concatManifestPath,
    finalMoviePath: input.fileWriterCombinePlan.finalMoviePath,
    finishCallOrderSummary: finishCallOrderSummary(input.sceneRunLifecycle, status),
    finishReady,
    finishRequired,
    finishStatus: status,
    partialMovieCount: input.fileWriterCombinePlan.partialMovieCount,
    sceneId: input.sceneRunLifecycle.sceneId,
    sourceContract: SCENE_RUN_FILE_WRITER_FINISH_BRIDGE_SOURCE_CONTRACT,
    summary: [
      `scene-run-file-writer-finish:${input.sceneRunLifecycle.sceneId}`,
      `teardown=${String(input.sceneRunLifecycle.tearDownReady)}`,
      `combine=${input.fileWriterCombinePlan.action}`,
      `status=${status}`,
      `ready=${String(finishReady)}`
    ].join(":"),
    tearDownActionSummary: input.sceneRunLifecycle.tearDownActionSummary,
    tearDownReady: input.sceneRunLifecycle.tearDownReady,
    version: "mais-manim-scene-run-file-writer-finish-bridge/v1"
  };
}

export function sceneRunFileWriterFinishBridgeDataAttributes(
  plan: MathSceneRunFileWriterFinishBridgePlan
): Record<string, string> {
  return {
    "data-viz-manim-scene-run-file-writer-finish-call-order": plan.finishCallOrderSummary,
    "data-viz-manim-scene-run-file-writer-finish-combine-action": plan.combineAction,
    "data-viz-manim-scene-run-file-writer-finish-concat-manifest-path": plan.concatManifestPath,
    "data-viz-manim-scene-run-file-writer-finish-final-path": plan.finalMoviePath,
    "data-viz-manim-scene-run-file-writer-finish-partial-count": String(plan.partialMovieCount),
    "data-viz-manim-scene-run-file-writer-finish-ready": String(plan.finishReady),
    "data-viz-manim-scene-run-file-writer-finish-required": String(plan.finishRequired),
    "data-viz-manim-scene-run-file-writer-finish-scene-id": plan.sceneId,
    "data-viz-manim-scene-run-file-writer-finish-source-contract": plan.sourceContract,
    "data-viz-manim-scene-run-file-writer-finish-status": plan.finishStatus,
    "data-viz-manim-scene-run-file-writer-finish-summary": plan.summary,
    "data-viz-manim-scene-run-file-writer-finish-teardown-actions": plan.tearDownActionSummary,
    "data-viz-manim-scene-run-file-writer-finish-teardown-ready": String(plan.tearDownReady)
  };
}

export function serializeSceneRunFileWriterFinishBridgePlan(
  plan: MathSceneRunFileWriterFinishBridgePlan
) {
  return stableSerialize(plan);
}
