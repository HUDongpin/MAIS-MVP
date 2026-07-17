import type { MathScenePlaybackFileWriterBridgePlan } from "./mathScenePlaybackFileWriterBridge";

export const SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT =
  "SceneFileWriter.finish combines sorted partial movie files into the final movie when subdivide_output is enabled" as const;

export type MathSceneFileWriterCombineAction = "concat-partials" | "single-pipe-finish" | "skip-movie";

export type MathSceneFileWriterCombinePlan = {
  action: MathSceneFileWriterCombineAction;
  concatManifestPath: string;
  duplicatePartialCount: number;
  finalMoviePath: string;
  mismatchCount: number;
  ordered: boolean;
  partialIndexSequence: string;
  partialMovieCount: number;
  partialPathSummary: string;
  ready: boolean;
  sourceContract: typeof SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT;
  summary: string;
  version: "mais-manim-file-writer-combine/v1";
};

export type MathSceneFileWriterCombinePlanInput = {
  fileWriterReady?: boolean;
  movieFileExtension?: string;
  outputSlug: string;
  playbackBridge: MathScenePlaybackFileWriterBridgePlan;
  sceneId: string;
  subdivideOutput: boolean;
  writeToMovie: boolean;
};

function normalizeExtension(extension: string | undefined) {
  const trimmed = (extension ?? ".webm").trim();
  if (!trimmed) return ".webm";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function outputRoot(outputSlug: string) {
  const trimmed = outputSlug.trim();
  return trimmed || "scene";
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

function uniqueCount(values: string[]) {
  return new Set(values).size;
}

function orderedByPlayIndex(rows: MathScenePlaybackFileWriterBridgePlan["rows"]) {
  return rows.every((row, index, allRows) => index === 0 || allRows[index - 1].playIndex <= row.playIndex);
}

function partialPathSummary(paths: string[]) {
  return paths.length > 0 ? paths.join("|") : "none";
}

function finishAction(input: MathSceneFileWriterCombinePlanInput): MathSceneFileWriterCombineAction {
  if (!input.writeToMovie) return "skip-movie";
  if (!input.subdivideOutput) return "single-pipe-finish";
  return "concat-partials";
}

// Manim source contract: SceneFileWriter.finish closes recording and, when
// subdivide_output is enabled, combines the numbered partial movie files in
// Scene.play order into the final movie artifact.
export function buildSceneFileWriterCombinePlan(
  input: MathSceneFileWriterCombinePlanInput
): MathSceneFileWriterCombinePlan {
  const extension = normalizeExtension(input.movieFileExtension);
  const root = outputRoot(input.outputSlug);
  const action = finishAction(input);
  const partialRows = action === "concat-partials" ? input.playbackBridge.rows : [];
  const partialPaths = partialRows.map((row) => row.partialMoviePath);
  const duplicatePartialCount = Math.max(0, partialPaths.length - uniqueCount(partialPaths));
  const ordered = orderedByPlayIndex(partialRows);
  const partialMovieCount = partialPaths.length;
  const mismatchCount = input.playbackBridge.mismatchCount;
  const finalMoviePath = action === "skip-movie" ? "" : `${root}${extension}`;
  const concatManifestPath = action === "concat-partials" ? `${root}/partial-movies.txt` : "none";
  const partialIndexSequence = action === "concat-partials" ? input.playbackBridge.partialIndexSequence : "none";
  const partialPathSummaryValue = partialPathSummary(partialPaths);
  const fileWriterReady = input.fileWriterReady !== false;
  const ready = action === "concat-partials"
    ? fileWriterReady && input.playbackBridge.ready && partialMovieCount > 0 && mismatchCount === 0 && duplicatePartialCount === 0 && ordered
    : action === "single-pipe-finish" && fileWriterReady;
  const summary = `file-writer-combine:${input.sceneId}:action=${action}:partials=${partialMovieCount}:ready=${ready ? "true" : "false"}`;

  return {
    action,
    concatManifestPath,
    duplicatePartialCount,
    finalMoviePath,
    mismatchCount,
    ordered,
    partialIndexSequence,
    partialMovieCount,
    partialPathSummary: partialPathSummaryValue,
    ready,
    sourceContract: SCENE_FILE_WRITER_COMBINE_SOURCE_CONTRACT,
    summary,
    version: "mais-manim-file-writer-combine/v1"
  };
}

export function sceneFileWriterCombineDataAttributes(
  plan: MathSceneFileWriterCombinePlan
): Record<string, string> {
  return {
    "data-viz-manim-file-writer-combine-action": plan.action,
    "data-viz-manim-file-writer-combine-concat-manifest-path": plan.concatManifestPath,
    "data-viz-manim-file-writer-combine-duplicate-partial-count": String(plan.duplicatePartialCount),
    "data-viz-manim-file-writer-combine-final-path": plan.finalMoviePath,
    "data-viz-manim-file-writer-combine-mismatch-count": String(plan.mismatchCount),
    "data-viz-manim-file-writer-combine-ordered": String(plan.ordered),
    "data-viz-manim-file-writer-combine-partial-count": String(plan.partialMovieCount),
    "data-viz-manim-file-writer-combine-partial-index-sequence": plan.partialIndexSequence,
    "data-viz-manim-file-writer-combine-partial-path-summary": plan.partialPathSummary,
    "data-viz-manim-file-writer-combine-ready": String(plan.ready),
    "data-viz-manim-file-writer-combine-source-contract": plan.sourceContract,
    "data-viz-manim-file-writer-combine-summary": plan.summary
  };
}

export function serializeSceneFileWriterCombinePlan(plan: MathSceneFileWriterCombinePlan) {
  return stableSerialize(plan);
}
