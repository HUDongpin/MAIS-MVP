import type { MathCheckpointPastePlan } from "./mathCheckpointPastePlan";
import type {
  MathSceneFileWriterSegmentPlan,
  MathSceneFileWriterSegmentPlanInput
} from "./mathSceneFileWriterSegments";

export const SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT =
  "Scene.checkpoint_paste(record=True) -> SceneFileWriter.temp_record begin_insert/end_insert insert segment" as const;

export type MathCheckpointPasteFileWriterBridgePlan = {
  checkpointKey: string;
  checkpointRecordRequested: boolean;
  closeInsertPipe: boolean;
  fileWriterTempRecordRequested: boolean;
  insertFilePath: string;
  insertIndex: number | null;
  openInsertPipe: boolean;
  ready: boolean;
  sceneId: string;
  segmentActionSummary: string;
  segmentCount: number;
  sourceContract: typeof SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-checkpoint-paste-file-writer-bridge/v1";
};

export type MathCheckpointPasteFileWriterBridgeInput = {
  checkpointPastePlan: MathCheckpointPastePlan | null;
  segmentPlan: MathSceneFileWriterSegmentPlan;
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

function hasInsertAction(plan: MathSceneFileWriterSegmentPlan, action: "begin_insert" | "end_insert", status: "open-pipe" | "close-pipe") {
  return plan.rows.some((row) => row.action === action && row.status === status && row.finalFilePath === plan.insertFilePath);
}

export function checkpointPasteFileWriterSegmentInput(
  input: MathSceneFileWriterSegmentPlanInput & { checkpointPastePlan?: MathCheckpointPastePlan | null }
): MathSceneFileWriterSegmentPlanInput {
  const { checkpointPastePlan, ...segmentInput } = input;

  return {
    ...segmentInput,
    requestTempRecord: segmentInput.requestTempRecord === true || checkpointPastePlan?.record === true
  };
}

export function buildCheckpointPasteFileWriterBridgePlan(
  input: MathCheckpointPasteFileWriterBridgeInput
): MathCheckpointPasteFileWriterBridgePlan {
  const checkpointRecordRequested = input.checkpointPastePlan?.record === true;
  const checkpointKey = input.checkpointPastePlan?.checkpointKey ?? "none";
  const sceneId = input.checkpointPastePlan?.sceneId ?? "none";
  const openInsertPipe = hasInsertAction(input.segmentPlan, "begin_insert", "open-pipe");
  const closeInsertPipe = hasInsertAction(input.segmentPlan, "end_insert", "close-pipe");
  const ready = checkpointRecordRequested
    ? input.segmentPlan.tempRecordRequested && openInsertPipe && closeInsertPipe && input.segmentPlan.insertIndex !== null && input.segmentPlan.insertFilePath.length > 0
    : !input.segmentPlan.tempRecordRequested;

  const planWithoutSummary = {
    checkpointKey,
    checkpointRecordRequested,
    closeInsertPipe,
    fileWriterTempRecordRequested: input.segmentPlan.tempRecordRequested,
    insertFilePath: input.segmentPlan.insertFilePath,
    insertIndex: input.segmentPlan.insertIndex,
    openInsertPipe,
    ready,
    sceneId,
    segmentActionSummary: input.segmentPlan.actionSummary,
    segmentCount: input.segmentPlan.segmentCount,
    sourceContract: SCENE_CHECKPOINT_PASTE_FILE_WRITER_BRIDGE_SOURCE_CONTRACT
  };

  return {
    ...planWithoutSummary,
    summary: [
      `checkpoint-file-writer-bridge:${sceneId}`,
      `key=${checkpointKey}`,
      `record=${String(checkpointRecordRequested)}`,
      `tempRecord=${String(input.segmentPlan.tempRecordRequested)}`,
      `insert=${input.segmentPlan.insertIndex === null ? "none" : String(input.segmentPlan.insertIndex)}`,
      `ready=${String(ready)}`
    ].join(":"),
    version: "mais-manim-checkpoint-paste-file-writer-bridge/v1"
  };
}

export function checkpointPasteFileWriterBridgeDataAttributes(
  plan: MathCheckpointPasteFileWriterBridgePlan
): Record<string, string> {
  return {
    "data-viz-manim-checkpoint-file-writer-close-insert-pipe": String(plan.closeInsertPipe),
    "data-viz-manim-checkpoint-file-writer-insert-index": plan.insertIndex === null ? "none" : String(plan.insertIndex),
    "data-viz-manim-checkpoint-file-writer-insert-path": plan.insertFilePath,
    "data-viz-manim-checkpoint-file-writer-key": plan.checkpointKey,
    "data-viz-manim-checkpoint-file-writer-open-insert-pipe": String(plan.openInsertPipe),
    "data-viz-manim-checkpoint-file-writer-ready": String(plan.ready),
    "data-viz-manim-checkpoint-file-writer-record": String(plan.checkpointRecordRequested),
    "data-viz-manim-checkpoint-file-writer-scene-id": plan.sceneId,
    "data-viz-manim-checkpoint-file-writer-segment-action-summary": plan.segmentActionSummary,
    "data-viz-manim-checkpoint-file-writer-segment-count": String(plan.segmentCount),
    "data-viz-manim-checkpoint-file-writer-source-contract": plan.sourceContract,
    "data-viz-manim-checkpoint-file-writer-summary": plan.summary,
    "data-viz-manim-checkpoint-file-writer-temp-record": String(plan.fileWriterTempRecordRequested)
  };
}

export function serializeCheckpointPasteFileWriterBridgePlan(
  plan: MathCheckpointPasteFileWriterBridgePlan
) {
  return stableSerialize(plan);
}
