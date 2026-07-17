import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathScenePostCellRedrawPlan = {
  callsUpdateFrame: boolean;
  cellSucceeded: boolean;
  checkpointKey: string;
  commentLabelPolicy: string;
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
  updateFrameAction: string;
  version: "mais-manim-post-cell-redraw/v1";
};

type MathScenePostCellRedrawModule = {
  SCENE_POST_CELL_COMMENT_LABEL_POLICY: string;
  SCENE_POST_CELL_REDRAW_POLICY: string;
  SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT: string;
  buildScenePostCellRedrawPlan: (input: {
    cellSucceeded?: boolean;
    checkpointKey?: string;
    hasWindow?: boolean;
    skipAnimations?: boolean;
    snippet?: string;
  }) => MathScenePostCellRedrawPlan;
  scenePostCellRedrawDataAttributes: (plan: MathScenePostCellRedrawPlan) => Record<string, string>;
  serializeScenePostCellRedrawPlan: (plan: MathScenePostCellRedrawPlan) => string;
};

const modulePath = "components/visualizations/three/manim/mathScenePostCellRedraw.ts";

async function importPostCellRedrawModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure post-cell redraw planner");
  return (await import("./mathScenePostCellRedraw")) as MathScenePostCellRedrawModule;
}

test("buildScenePostCellRedrawPlan models the interactive shell post-cell force redraw", async () => {
  const {
    SCENE_POST_CELL_REDRAW_POLICY,
    SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
    buildScenePostCellRedrawPlan
  } = await importPostCellRedrawModule();
  const plan = buildScenePostCellRedrawPlan({
    checkpointKey: "slope handoff",
    hasWindow: true,
    skipAnimations: true,
    snippet: "# slope handoff\nplay(reveal_curve)\nwait(0.5)"
  });

  assert.equal(plan.version, "mais-manim-post-cell-redraw/v1");
  assert.equal(plan.sourceContract, SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT);
  assert.equal(plan.redrawPolicy, SCENE_POST_CELL_REDRAW_POLICY);
  assert.match(plan.sourceContract, /InteractiveSceneEmbed/);
  assert.match(plan.sourceContract, /post-cell hook/);
  assert.match(plan.sourceContract, /checkpoint_paste/);
  assert.match(plan.redrawPolicy, /successful-authoring-cell/);
  assert.match(plan.redrawPolicy, /force-draw/);
  assert.equal(plan.ready, true);
  assert.equal(plan.checkpointKey, "slope handoff");
  assert.equal(plan.commentLineCount, 1);
  assert.equal(plan.sourceLabel, "# slope handoff");
  assert.equal(plan.lineCount, 3);
  assert.equal(plan.operationLineCount, 2);
  assert.equal(plan.hasWindow, true);
  assert.equal(plan.skipAnimations, true);
  assert.equal(plan.callsUpdateFrame, true);
  assert.equal(plan.forceDraw, true);
  assert.equal(plan.dtSeconds, 0);
  assert.equal(plan.updateFrameAction, "capture");
  assert.equal(
    plan.summary,
    "postCellRedraw:key=slope handoff:lines=3:ops=2:redraw=true:force=true:window=true"
  );
});

test("buildScenePostCellRedrawPlan stays idle without a usable window or operation lines", async () => {
  const { buildScenePostCellRedrawPlan } = await importPostCellRedrawModule();
  const noWindow = buildScenePostCellRedrawPlan({
    hasWindow: false,
    snippet: "play(reveal_curve)"
  });
  const commentsOnly = buildScenePostCellRedrawPlan({
    hasWindow: true,
    snippet: "# just a checkpoint label"
  });

  assert.equal(noWindow.ready, false);
  assert.equal(noWindow.callsUpdateFrame, false);
  assert.equal(noWindow.forceDraw, false);
  assert.equal(noWindow.updateFrameAction, "skip-return");
  assert.equal(noWindow.summary, "postCellRedraw:key=none:lines=1:ops=1:redraw=false:force=false:window=false");

  assert.equal(commentsOnly.ready, false);
  assert.equal(commentsOnly.commentLineCount, 1);
  assert.equal(commentsOnly.operationLineCount, 0);
  assert.equal(commentsOnly.sourceLabel, "# just a checkpoint label");
  assert.equal(commentsOnly.callsUpdateFrame, false);
  assert.equal(commentsOnly.summary, "postCellRedraw:key=none:lines=1:ops=0:redraw=false:force=false:window=true");
});

test("buildScenePostCellRedrawPlan treats checkpoint_paste slash and block labels as comments", async () => {
  const { buildScenePostCellRedrawPlan } = await importPostCellRedrawModule();
  const slashOnly = buildScenePostCellRedrawPlan({
    hasWindow: true,
    snippet: "// slope handoff"
  });
  const blockOnly = buildScenePostCellRedrawPlan({
    hasWindow: true,
    snippet: "/* zoom detail */"
  });
  const mixed = buildScenePostCellRedrawPlan({
    checkpointKey: "slope handoff",
    hasWindow: true,
    snippet: "// slope handoff\nself.play(Create(curve))"
  });

  assert.equal(slashOnly.lineCount, 1);
  assert.equal(slashOnly.commentLineCount, 1);
  assert.equal(slashOnly.operationLineCount, 0);
  assert.equal(slashOnly.ready, false);
  assert.equal(slashOnly.callsUpdateFrame, false);
  assert.equal(slashOnly.sourceLabel, "// slope handoff");
  assert.equal(slashOnly.summary, "postCellRedraw:key=none:lines=1:ops=0:redraw=false:force=false:window=true");

  assert.equal(blockOnly.commentLineCount, 1);
  assert.equal(blockOnly.operationLineCount, 0);
  assert.equal(blockOnly.ready, false);
  assert.equal(blockOnly.sourceLabel, "/* zoom detail */");

  assert.equal(mixed.lineCount, 2);
  assert.equal(mixed.commentLineCount, 1);
  assert.equal(mixed.operationLineCount, 1);
  assert.equal(mixed.ready, true);
  assert.equal(mixed.callsUpdateFrame, true);
  assert.equal(mixed.sourceLabel, "// slope handoff");
});

test("buildScenePostCellRedrawPlan does not redraw failed cells", async () => {
  const { buildScenePostCellRedrawPlan } = await importPostCellRedrawModule();
  const plan = buildScenePostCellRedrawPlan({
    cellSucceeded: false,
    hasWindow: true,
    snippet: "play(reveal_curve)"
  });

  assert.equal(plan.cellSucceeded, false);
  assert.equal(plan.ready, false);
  assert.equal(plan.callsUpdateFrame, false);
  assert.equal(plan.forceDraw, false);
  assert.equal(plan.summary, "postCellRedraw:key=none:lines=1:ops=1:redraw=false:force=false:window=true");
});

test("scenePostCellRedrawDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_POST_CELL_COMMENT_LABEL_POLICY,
    SCENE_POST_CELL_REDRAW_POLICY,
    SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
    buildScenePostCellRedrawPlan,
    scenePostCellRedrawDataAttributes
  } = await importPostCellRedrawModule();
  const plan = buildScenePostCellRedrawPlan({
    checkpointKey: "intro",
    hasWindow: true,
    snippet: "# intro\nplay(camera_intro)"
  });

  assert.deepEqual(scenePostCellRedrawDataAttributes(plan), {
    "data-viz-manim-post-cell-redraw-action": "capture",
    "data-viz-manim-post-cell-redraw-checkpoint-key": "intro",
    "data-viz-manim-post-cell-redraw-comment-count": "1",
    "data-viz-manim-post-cell-redraw-comment-label-policy": SCENE_POST_CELL_COMMENT_LABEL_POLICY,
    "data-viz-manim-post-cell-redraw-dt": "0.000",
    "data-viz-manim-post-cell-redraw-force-draw": "true",
    "data-viz-manim-post-cell-redraw-has-window": "true",
    "data-viz-manim-post-cell-redraw-line-count": "2",
    "data-viz-manim-post-cell-redraw-operation-count": "1",
    "data-viz-manim-post-cell-redraw-policy": SCENE_POST_CELL_REDRAW_POLICY,
    "data-viz-manim-post-cell-redraw-ready": "true",
    "data-viz-manim-post-cell-redraw-skip": "false",
    "data-viz-manim-post-cell-redraw-source-contract": SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT,
    "data-viz-manim-post-cell-redraw-source-label": "# intro",
    "data-viz-manim-post-cell-redraw-summary": plan.summary
  });
});

test("serializeScenePostCellRedrawPlan emits escaped deterministic browser JSON", async () => {
  const {
    buildScenePostCellRedrawPlan,
    serializeScenePostCellRedrawPlan
  } = await importPostCellRedrawModule();
  const plan = buildScenePostCellRedrawPlan({
    checkpointKey: "<post-cell-redraw>",
    hasWindow: true,
    snippet: "# <post-cell-redraw>\nplay(reveal_curve)"
  });

  const serialized = serializeScenePostCellRedrawPlan(plan);

  assert.equal(serializeScenePostCellRedrawPlan(JSON.parse(JSON.stringify(plan)) as MathScenePostCellRedrawPlan), serialized);
  assert.doesNotMatch(serialized, /<post-cell-redraw>|<\/script/i);
  assert.match(serialized, /\\u003cpost-cell-redraw>/);
  assert.deepEqual(JSON.parse(serialized), plan);
});

test("post-cell redraw planner stays pure and documents the InteractiveSceneEmbed contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathScenePostCellRedraw.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /post-cell hook/);
  assert.match(source, /SCENE_POST_CELL_REDRAW_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_POST_CELL_REDRAW_POLICY/);
  assert.match(source, /SCENE_POST_CELL_COMMENT_LABEL_POLICY/);
  assert.match(source, /InteractiveSceneEmbed/);
  assert.match(source, /checkpoint_paste/);
  assert.match(source, /update_frame/);
  assert.match(source, /force_draw/);
  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|document\.|requestAnimationFrame/);
});
