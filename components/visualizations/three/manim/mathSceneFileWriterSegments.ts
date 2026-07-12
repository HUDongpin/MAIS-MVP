export const SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT =
  "SceneFileWriter segments: begin opens main pipe; begin_animation/end_animation open and close numbered partial movies; temp_record uses insert pipes" as const;

export type MathSceneFileWriterSegmentStatus = "close-pipe" | "open-pipe" | "skipped";

export type MathSceneFileWriterSegmentAction =
  | "begin"
  | "begin_animation"
  | "begin_insert"
  | "end_animation"
  | "end_insert";

export type MathSceneFileWriterSegmentRow = {
  action: MathSceneFileWriterSegmentAction;
  finalFilePath: string;
  index: number | null;
  status: MathSceneFileWriterSegmentStatus;
  tempFilePath: string;
};

export type MathSceneFileWriterSegmentPlan = {
  actionSummary: string;
  closePipeCount: number;
  finalFileSummary: string;
  insertFilePath: string;
  insertIndex: number | null;
  openPipeCount: number;
  partialMovieIndex: number;
  partialMovieIndexPadded: string;
  partialMoviePath: string;
  partialPathReady: boolean;
  rows: MathSceneFileWriterSegmentRow[];
  segmentCount: number;
  skippedCount: number;
  sourceContract: typeof SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT;
  subdivideOutput: boolean;
  summary: string;
  tempRecordRequested: boolean;
  tempFileCount: number;
  writeToMovie: boolean;
};

export type MathSceneFileWriterSegmentPlanInput = {
  existingInsertIndexes?: number[];
  movieFileExtension?: string;
  numPlays: number;
  outputSlug: string;
  requestTempRecord?: boolean;
  sceneId: string;
  subdivideOutput: boolean;
  writeToMovie: boolean;
};

function normalizeExtension(extension: string | undefined) {
  const trimmed = (extension ?? ".webm").trim();
  if (!trimmed) return ".webm";
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function nonNegativeInteger(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
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

function outputRoot(outputSlug: string) {
  const trimmed = outputSlug.trim();
  return trimmed || "scene";
}

function numberedPartialPath(root: string, numPlays: number, extension: string) {
  return `${root}/${partialMovieIndexPadded(numPlays)}${extension}`;
}

function partialMovieIndexPadded(numPlays: number) {
  return String(nonNegativeInteger(numPlays)).padStart(5, "0");
}

function mainMoviePath(root: string, extension: string) {
  return `${root}${extension}`;
}

function tempMoviePath(finalFilePath: string, extension: string) {
  if (!finalFilePath) return "";
  return `${finalFilePath.slice(0, -extension.length)}_temp${extension}`;
}

function nextInsertIndex(existingInsertIndexes: number[] | undefined) {
  const existing = new Set((existingInsertIndexes ?? []).map(nonNegativeInteger));
  let index = 0;
  while (existing.has(index)) index += 1;
  return index;
}

function makeRow(
  action: MathSceneFileWriterSegmentAction,
  status: MathSceneFileWriterSegmentStatus,
  finalFilePath: string,
  extension: string,
  index: number | null = null
): MathSceneFileWriterSegmentRow {
  return {
    action,
    finalFilePath,
    index,
    status,
    tempFilePath: status === "skipped" ? "" : tempMoviePath(finalFilePath, extension)
  };
}

function summarizeActions(rows: MathSceneFileWriterSegmentRow[]) {
  return rows.map((row) => `${row.action}:${row.status}`).join(";");
}

function summarizeFinalFiles(rows: MathSceneFileWriterSegmentRow[]) {
  const finalFiles = rows.reduce<string[]>((accumulator, row) => {
    if (row.finalFilePath && !accumulator.includes(row.finalFilePath)) {
      accumulator.push(row.finalFilePath);
    }
    return accumulator;
  }, []);

  return finalFiles.length > 0 ? finalFiles.join("|") : "none";
}

// Source contract:
// - begin opens the main movie pipe only when output is not subdivided.
// - get_next_partial_movie_path uses the Scene num_plays value padded to five digits.
// - begin_animation and end_animation open/close the current partial movie only when subdivide_output is true.
// - begin_insert chooses the first unused insert file path and opens it; end_insert closes it.
// - temp_record wraps begin_insert/end_insert while temporarily recording an insert.
export function buildSceneFileWriterSegmentPlan(
  input: MathSceneFileWriterSegmentPlanInput
): MathSceneFileWriterSegmentPlan {
  const extension = normalizeExtension(input.movieFileExtension);
  const root = outputRoot(input.outputSlug);
  const partialMovieIndex = nonNegativeInteger(input.numPlays);
  const partialMovieIndexPaddedValue = partialMovieIndexPadded(input.numPlays);
  const partialMoviePath = numberedPartialPath(root, input.numPlays, extension);
  const mainPath = mainMoviePath(root, extension);
  const insertIndex = input.requestTempRecord ? nextInsertIndex(input.existingInsertIndexes) : null;
  const insertFilePath = insertIndex === null ? "" : `inserts/${root}_${insertIndex}${extension}`;
  const rows: MathSceneFileWriterSegmentRow[] = [
    makeRow(
      "begin",
      input.writeToMovie && !input.subdivideOutput ? "open-pipe" : "skipped",
      input.writeToMovie && !input.subdivideOutput ? mainPath : "",
      extension
    ),
    makeRow(
      "begin_animation",
      input.writeToMovie && input.subdivideOutput ? "open-pipe" : "skipped",
      input.writeToMovie && input.subdivideOutput ? partialMoviePath : "",
      extension,
      input.writeToMovie && input.subdivideOutput ? nonNegativeInteger(input.numPlays) : null
    ),
    makeRow(
      "end_animation",
      input.writeToMovie && input.subdivideOutput ? "close-pipe" : "skipped",
      input.writeToMovie && input.subdivideOutput ? partialMoviePath : "",
      extension,
      input.writeToMovie && input.subdivideOutput ? nonNegativeInteger(input.numPlays) : null
    )
  ];

  if (input.requestTempRecord && insertIndex !== null) {
    rows.push(
      makeRow("begin_insert", "open-pipe", insertFilePath, extension, insertIndex),
      makeRow("end_insert", "close-pipe", insertFilePath, extension, insertIndex)
    );
  }

  const actionSummary = summarizeActions(rows);
  const finalFileSummary = summarizeFinalFiles(rows);
  const openPipeCount = rows.filter((row) => row.status === "open-pipe").length;
  const closePipeCount = rows.filter((row) => row.status === "close-pipe").length;
  const skippedCount = rows.filter((row) => row.status === "skipped").length;
  const tempFileCount = rows.filter((row) => row.tempFilePath).length;
  const summary = [
    `file-writer-segments:${input.sceneId}`,
    `open=${openPipeCount}`,
    `close=${closePipeCount}`,
    `partial=${input.subdivideOutput ? "true" : "false"}`,
    `insert=${insertIndex === null ? "none" : String(insertIndex)}`
  ].join(":");

  return {
    actionSummary,
    closePipeCount,
    finalFileSummary,
    insertFilePath,
    insertIndex,
    openPipeCount,
    partialMovieIndex,
    partialMovieIndexPadded: partialMovieIndexPaddedValue,
    partialMoviePath,
    partialPathReady: partialMoviePath.endsWith(`${partialMovieIndexPaddedValue}${extension}`),
    rows,
    segmentCount: rows.length,
    skippedCount,
    sourceContract: SCENE_FILE_WRITER_SEGMENT_SOURCE_CONTRACT,
    subdivideOutput: input.subdivideOutput,
    summary,
    tempRecordRequested: input.requestTempRecord === true,
    tempFileCount,
    writeToMovie: input.writeToMovie
  };
}

export function sceneFileWriterSegmentDataAttributes(
  plan: MathSceneFileWriterSegmentPlan
): Record<string, string> {
  return {
    "data-viz-manim-file-writer-segment-action-summary": plan.actionSummary,
    "data-viz-manim-file-writer-segment-close-count": String(plan.closePipeCount),
    "data-viz-manim-file-writer-segment-count": String(plan.segmentCount),
    "data-viz-manim-file-writer-segment-final-file-summary": plan.finalFileSummary,
    "data-viz-manim-file-writer-segment-insert-index": plan.insertIndex === null ? "none" : String(plan.insertIndex),
    "data-viz-manim-file-writer-segment-insert-path": plan.insertFilePath,
    "data-viz-manim-file-writer-segment-open-count": String(plan.openPipeCount),
    "data-viz-manim-file-writer-segment-partial-index": String(plan.partialMovieIndex),
    "data-viz-manim-file-writer-segment-partial-index-padded": plan.partialMovieIndexPadded,
    "data-viz-manim-file-writer-segment-partial-path": plan.partialMoviePath,
    "data-viz-manim-file-writer-segment-partial-path-ready": String(plan.partialPathReady),
    "data-viz-manim-file-writer-segment-skipped-count": String(plan.skippedCount),
    "data-viz-manim-file-writer-segment-source-contract": plan.sourceContract,
    "data-viz-manim-file-writer-segment-subdivide-output": String(plan.subdivideOutput),
    "data-viz-manim-file-writer-segment-summary": plan.summary,
    "data-viz-manim-file-writer-segment-temp-file-count": String(plan.tempFileCount),
    "data-viz-manim-file-writer-segment-temp-record": String(plan.tempRecordRequested),
    "data-viz-manim-file-writer-segment-write-to-movie": String(plan.writeToMovie)
  };
}

export function serializeSceneFileWriterSegmentPlan(plan: MathSceneFileWriterSegmentPlan) {
  return stableSerialize(plan);
}
