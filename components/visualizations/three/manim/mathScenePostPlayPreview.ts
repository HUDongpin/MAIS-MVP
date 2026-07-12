export type MathScenePostPlayPreviewRow = {
  actionSummary: string;
  forceDraw: boolean;
  hasWindow: boolean;
  numPlaysAfter: number;
  numPlaysBefore: number;
  playIndex: number;
  previewDtSeconds: number;
  previewWhileSkipping: boolean;
  shouldEndAnimation: boolean;
  shouldForcePreviewFrame: boolean;
  skipAnimations: boolean;
};

export type MathScenePostPlayPreviewPlan = {
  endedAnimationCount: number;
  forcedPreviewCount: number;
  hasWindow: boolean;
  numPlaysReady: boolean;
  numPlaysSequence: string;
  playCount: number;
  previewPolicy: string;
  previewWhileSkipping: boolean;
  rows: MathScenePostPlayPreviewRow[];
  skipAnimations: boolean;
  sourceContract: string;
  summary: string;
  version: "mais-manim-post-play-preview/v1";
};

export type MathScenePostPlayPreviewInput = {
  hasWindow?: boolean;
  playCount: number;
  previewWhileSkipping?: boolean;
  skipAnimations?: boolean;
  startNumPlays?: number;
};

export const SCENE_POST_PLAY_SOURCE_CONTRACT =
  "Scene.post_play -> end_animation when not skipping -> update_frame(dt=0, force_draw=True) preview branch -> increment num_plays";

export const SCENE_POST_PLAY_PREVIEW_POLICY =
  "preview-while-skipping-with-window-force-draws-dt-zero-frame-after-skipped-play";

function finite(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback = 0) {
  return Math.max(0, Math.floor(finite(value, fallback)));
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

function actionSummary(row: Omit<MathScenePostPlayPreviewRow, "actionSummary">) {
  if (row.shouldEndAnimation) return "end-animation";
  if (row.shouldForcePreviewFrame) return "force-preview-frame";
  return "none";
}

function summarize(plan: Omit<MathScenePostPlayPreviewPlan, "summary" | "version">) {
  return [
    `postPlayPreview:plays=${plan.playCount}`,
    `forced=${plan.forcedPreviewCount}`,
    `endAnimation=${plan.endedAnimationCount}`,
    `skip=${String(plan.skipAnimations)}`,
    `preview=${String(plan.previewWhileSkipping)}`,
    `window=${String(plan.hasWindow)}`
  ].join(":");
}

function summarizeNumPlays(rows: MathScenePostPlayPreviewRow[]) {
  return rows.map((row) => `${row.numPlaysBefore}->${row.numPlaysAfter}`).join("|") || "none";
}

function numPlaysIncrementReady(rows: MathScenePostPlayPreviewRow[], playCount: number) {
  return rows.length === playCount && rows.every((row, index) => {
    if (row.numPlaysAfter !== row.numPlaysBefore + 1) return false;
    if (index === 0) return true;
    return row.numPlaysBefore === rows[index - 1].numPlaysAfter;
  });
}

// Manim source contract:
// - post_play closes the file-writer animation only when skip_animations is false.
// - When preview_while_skipping and skip_animations and a window are present,
//   post_play calls update_frame(dt=0, force_draw=True) to preview the final frame.
// - post_play increments num_plays after the end-animation / preview branch.
export function buildScenePostPlayPreviewPlan(input: MathScenePostPlayPreviewInput): MathScenePostPlayPreviewPlan {
  const playCount = nonNegativeInteger(input.playCount);
  const startNumPlays = nonNegativeInteger(input.startNumPlays);
  const skipAnimations = input.skipAnimations === true;
  const previewWhileSkipping = input.previewWhileSkipping === true;
  const hasWindow = input.hasWindow === true;
  const rows = Array.from({ length: playCount }, (_, playIndex) => {
    const numPlaysBefore = startNumPlays + playIndex;
    const shouldEndAnimation = !skipAnimations;
    const shouldForcePreviewFrame = previewWhileSkipping && skipAnimations && hasWindow;
    const baseRow = {
      forceDraw: shouldForcePreviewFrame,
      hasWindow,
      numPlaysAfter: numPlaysBefore + 1,
      numPlaysBefore,
      playIndex,
      previewDtSeconds: 0,
      previewWhileSkipping,
      shouldEndAnimation,
      shouldForcePreviewFrame,
      skipAnimations
    };

    return {
      ...baseRow,
      actionSummary: actionSummary(baseRow)
    };
  });
  const basePlan = {
    endedAnimationCount: rows.filter((row) => row.shouldEndAnimation).length,
    forcedPreviewCount: rows.filter((row) => row.shouldForcePreviewFrame).length,
    hasWindow,
    numPlaysReady: numPlaysIncrementReady(rows, playCount),
    numPlaysSequence: summarizeNumPlays(rows),
    playCount,
    previewPolicy: SCENE_POST_PLAY_PREVIEW_POLICY,
    previewWhileSkipping,
    rows,
    skipAnimations,
    sourceContract: SCENE_POST_PLAY_SOURCE_CONTRACT
  };

  return {
    ...basePlan,
    summary: summarize(basePlan),
    version: "mais-manim-post-play-preview/v1"
  };
}

export function scenePostPlayPreviewDataAttributes(plan: MathScenePostPlayPreviewPlan): Record<string, string> {
  return {
    "data-viz-manim-post-play-preview-end-animation-count": String(plan.endedAnimationCount),
    "data-viz-manim-post-play-preview-forced-count": String(plan.forcedPreviewCount),
    "data-viz-manim-post-play-preview-has-window": String(plan.hasWindow),
    "data-viz-manim-post-play-preview-num-plays-ready": String(plan.numPlaysReady),
    "data-viz-manim-post-play-preview-num-plays-sequence": plan.numPlaysSequence,
    "data-viz-manim-post-play-preview-play-count": String(plan.playCount),
    "data-viz-manim-post-play-preview-policy": plan.previewPolicy,
    "data-viz-manim-post-play-preview-preview": String(plan.previewWhileSkipping),
    "data-viz-manim-post-play-preview-skip": String(plan.skipAnimations),
    "data-viz-manim-post-play-preview-source-contract": plan.sourceContract,
    "data-viz-manim-post-play-preview-summary": plan.summary
  };
}

export function serializeScenePostPlayPreviewPlan(plan: MathScenePostPlayPreviewPlan) {
  return stableSerialize(plan);
}
