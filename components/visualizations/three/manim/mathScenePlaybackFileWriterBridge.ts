import {
  buildSceneFileWriterSegmentPlan,
  type MathSceneFileWriterSegmentPlanInput
} from "./mathSceneFileWriterSegments";
import type { ScenePlaybackPlan } from "./mathScenePlayback";

export const SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT =
  "Scene.play num_plays -> SceneFileWriter.get_next_partial_movie_path partial segment per playback beat" as const;

export type MathScenePlaybackFileWriterBridgeRow = {
  actionSummary: string;
  matchesPlayIndex: boolean;
  partialMovieIndex: number;
  partialMovieIndexPadded: string;
  partialMoviePath: string;
  playIndex: number;
  stepType: string;
};

export type MathScenePlaybackFileWriterBridgePlan = {
  mismatchCount: number;
  partialIndexSequence: string;
  partialPathSummary: string;
  ready: boolean;
  rowCount: number;
  rows: MathScenePlaybackFileWriterBridgeRow[];
  sourceContract: typeof SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-playback-file-writer-bridge/v1";
};

export type MathScenePlaybackFileWriterBridgeInput = Pick<
  MathSceneFileWriterSegmentPlanInput,
  "movieFileExtension" | "outputSlug" | "sceneId" | "subdivideOutput" | "writeToMovie"
> & {
  playbackPlan: ScenePlaybackPlan;
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

function summarizePartialIndexes(rows: MathScenePlaybackFileWriterBridgeRow[]) {
  return rows.map((row) => `${row.playIndex}=${row.partialMovieIndexPadded}`).join("|") || "none";
}

function summarizePartialPaths(rows: MathScenePlaybackFileWriterBridgeRow[]) {
  return rows.map((row) => row.partialMoviePath).join("|") || "none";
}

// Manim source contract: Scene.play uses the current scene.num_plays when
// SceneFileWriter opens a partial movie segment, then post_play increments
// num_plays after the play finishes.
export function buildScenePlaybackFileWriterBridgePlan(
  input: MathScenePlaybackFileWriterBridgeInput
): MathScenePlaybackFileWriterBridgePlan {
  const rows = input.playbackPlan.plays.map((play) => {
    const segmentPlan = buildSceneFileWriterSegmentPlan({
      movieFileExtension: input.movieFileExtension,
      numPlays: play.playIndex,
      outputSlug: input.outputSlug,
      sceneId: input.sceneId,
      subdivideOutput: input.subdivideOutput,
      writeToMovie: input.writeToMovie
    });

    return {
      actionSummary: segmentPlan.actionSummary,
      matchesPlayIndex: segmentPlan.partialMovieIndex === play.playIndex,
      partialMovieIndex: segmentPlan.partialMovieIndex,
      partialMovieIndexPadded: segmentPlan.partialMovieIndexPadded,
      partialMoviePath: segmentPlan.partialMoviePath,
      playIndex: play.playIndex,
      stepType: play.step.type
    };
  });
  const mismatchCount = rows.filter((row) => !row.matchesPlayIndex).length;
  const ready = rows.length === input.playbackPlan.plays.length && mismatchCount === 0;
  const basePlan = {
    mismatchCount,
    partialIndexSequence: summarizePartialIndexes(rows),
    partialPathSummary: summarizePartialPaths(rows),
    ready,
    rowCount: rows.length,
    rows,
    sourceContract: SCENE_PLAYBACK_FILE_WRITER_BRIDGE_SOURCE_CONTRACT,
    summary: `playback-file-writer-bridge:${input.sceneId}:plays=${rows.length}:mismatch=${mismatchCount}:ready=${ready ? "true" : "false"}`
  };

  return {
    ...basePlan,
    version: "mais-manim-playback-file-writer-bridge/v1"
  };
}

export function scenePlaybackFileWriterBridgeDataAttributes(
  plan: MathScenePlaybackFileWriterBridgePlan
): Record<string, string> {
  return {
    "data-viz-manim-playback-file-writer-bridge-mismatch-count": String(plan.mismatchCount),
    "data-viz-manim-playback-file-writer-bridge-partial-index-sequence": plan.partialIndexSequence,
    "data-viz-manim-playback-file-writer-bridge-partial-path-summary": plan.partialPathSummary,
    "data-viz-manim-playback-file-writer-bridge-ready": String(plan.ready),
    "data-viz-manim-playback-file-writer-bridge-row-count": String(plan.rowCount),
    "data-viz-manim-playback-file-writer-bridge-source-contract": plan.sourceContract,
    "data-viz-manim-playback-file-writer-bridge-summary": plan.summary
  };
}

export function serializeScenePlaybackFileWriterBridgePlan(
  plan: MathScenePlaybackFileWriterBridgePlan
) {
  return stableSerialize(plan);
}
