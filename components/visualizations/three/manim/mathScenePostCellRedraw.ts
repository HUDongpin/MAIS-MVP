import { buildSceneUpdateFramePlan, type MathSceneUpdateFrameAction } from "./mathSceneUpdateFrame";

export type MathScenePostCellRedrawPlan = {
  callsUpdateFrame: boolean;
  cellSucceeded: boolean;
  checkpointKey: string;
  commentLabelPolicy: typeof SCENE_POST_CELL_COMMENT_LABEL_POLICY;
  commentLineCount: number;
  dtSeconds: number;
  forceDraw: boolean;
  hasWindow: boolean;
  lineCount: number;
  operationLineCount: number;
  redrawPolicy: string;
  ready: boolean;
  skipAnimations: boolean;
  sourceContract: string;
  sourceLabel: string;
  summary: string;
  updateFrameAction: MathSceneUpdateFrameAction;
  version: "mais-manim-post-cell-redraw/v1";
};

export type MathScenePostCellRedrawInput = {
  cellSucceeded?: boolean;
  checkpointKey?: string | null;
  hasWindow?: boolean;
  skipAnimations?: boolean;
  snippet?: string | null;
};

export const SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT =
  "InteractiveSceneEmbed post-cell hook -> checkpoint_paste temporary scene config -> update_frame(dt=0, force_draw=True) after successful authoring cell";

export const SCENE_POST_CELL_REDRAW_POLICY =
  "successful-authoring-cell-with-window-and-operations-force-draws-dt-zero-preview";

export const SCENE_POST_CELL_COMMENT_LABEL_POLICY =
  "checkpoint_paste-comment-label-lines-are-authoring-metadata-not-executable-redraw-operations";

function snippetLines(snippet: string | null | undefined) {
  if (!snippet) return [];
  return snippet.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function isBlockCommentLine(line: string) {
  return /^\/\*\s*.*?\s*\*\/$/.test(line);
}

function isCommentLabelLine(line: string) {
  return line.startsWith("#") || line.startsWith("//") || isBlockCommentLine(line);
}

function operationLines(lines: string[]) {
  return lines.filter((line) => !isCommentLabelLine(line));
}

function commentLines(lines: string[]) {
  return lines.filter(isCommentLabelLine);
}

function cleanCheckpointKey(value: string | null | undefined) {
  const key = value?.trim();
  return key || "none";
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

function buildSummary(plan: Omit<MathScenePostCellRedrawPlan, "summary" | "version">) {
  return [
    `postCellRedraw:key=${plan.checkpointKey}`,
    `lines=${plan.lineCount}`,
    `ops=${plan.operationLineCount}`,
    `redraw=${String(plan.callsUpdateFrame)}`,
    `force=${String(plan.forceDraw)}`,
    `window=${String(plan.hasWindow)}`
  ].join(":");
}

// Manim source contract:
// - InteractiveSceneEmbed installs a post-cell hook for the authoring shell.
// - checkpoint_paste executes a pasted cell under temporary scene config.
// - checkpoint_paste comment labels are metadata, not executable operations.
// - After a successful authoring cell, the post-cell hook redraws the live
//   preview by calling update_frame(dt=0, force_draw=True).
// - Without a window, failed cell, or executable operation line, the hook
//   records the skipped state instead of touching renderer-owned objects.
export function buildScenePostCellRedrawPlan(input: MathScenePostCellRedrawInput = {}): MathScenePostCellRedrawPlan {
  const lines = snippetLines(input.snippet);
  const labelLines = commentLines(lines);
  const operationLineCount = operationLines(lines).length;
  const cellSucceeded = input.cellSucceeded !== false;
  const hasWindow = input.hasWindow === true;
  const skipAnimations = input.skipAnimations === true;
  const ready = cellSucceeded && hasWindow && operationLineCount > 0;
  const updateFrame = ready
    ? buildSceneUpdateFramePlan({
        dtSeconds: 0,
        forceDraw: true,
        hasWindow,
        renderGroupIds: [],
        skipAnimations
      })
    : null;
  const basePlan: Omit<MathScenePostCellRedrawPlan, "summary" | "version"> = {
    callsUpdateFrame: ready,
    cellSucceeded,
    checkpointKey: cleanCheckpointKey(input.checkpointKey),
    commentLabelPolicy: SCENE_POST_CELL_COMMENT_LABEL_POLICY,
    commentLineCount: labelLines.length,
    dtSeconds: 0,
    forceDraw: ready,
    hasWindow,
    lineCount: lines.length,
    operationLineCount,
    redrawPolicy: SCENE_POST_CELL_REDRAW_POLICY,
    ready,
    skipAnimations,
    sourceLabel: labelLines[0] ?? "none",
    sourceContract: SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
    updateFrameAction: updateFrame?.action ?? "skip-return"
  };

  return {
    ...basePlan,
    summary: buildSummary(basePlan),
    version: "mais-manim-post-cell-redraw/v1"
  };
}

export function scenePostCellRedrawDataAttributes(plan: MathScenePostCellRedrawPlan): Record<string, string> {
  return {
    "data-viz-manim-post-cell-redraw-action": plan.updateFrameAction,
    "data-viz-manim-post-cell-redraw-checkpoint-key": plan.checkpointKey,
    "data-viz-manim-post-cell-redraw-comment-count": String(plan.commentLineCount),
    "data-viz-manim-post-cell-redraw-comment-label-policy": plan.commentLabelPolicy,
    "data-viz-manim-post-cell-redraw-dt": plan.dtSeconds.toFixed(3),
    "data-viz-manim-post-cell-redraw-force-draw": String(plan.forceDraw),
    "data-viz-manim-post-cell-redraw-has-window": String(plan.hasWindow),
    "data-viz-manim-post-cell-redraw-line-count": String(plan.lineCount),
    "data-viz-manim-post-cell-redraw-operation-count": String(plan.operationLineCount),
    "data-viz-manim-post-cell-redraw-policy": plan.redrawPolicy,
    "data-viz-manim-post-cell-redraw-ready": String(plan.ready),
    "data-viz-manim-post-cell-redraw-skip": String(plan.skipAnimations),
    "data-viz-manim-post-cell-redraw-source-contract": plan.sourceContract,
    "data-viz-manim-post-cell-redraw-source-label": plan.sourceLabel,
    "data-viz-manim-post-cell-redraw-summary": plan.summary
  };
}

export function serializeScenePostCellRedrawPlan(plan: MathScenePostCellRedrawPlan) {
  return stableSerialize(plan);
}
