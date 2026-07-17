import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

type MathSceneInteractiveShortcutId =
  | "add"
  | "checkpoint_paste"
  | "play"
  | "redo"
  | "reload"
  | "remove"
  | "save_state"
  | "undo"
  | "wait";

type MathSceneShortcutCatalog = {
  checkpointShortcutCount: number;
  historyShortcutCount: number;
  ids: MathSceneInteractiveShortcutId[];
  playbackShortcutCount: number;
  redrawAfterCellCount: number;
  reloadReady: boolean;
  sceneGraphShortcutCount: number;
  shortcutAuthoringPolicy: string;
  sourceContract: string;
  stateShortcutCount: number;
  summary: string;
  totalShortcutCount: number;
  version: "mais-manim-shortcut-catalog/v1";
};

type MathSceneShortcutCatalogModule = {
  SCENE_SHORTCUT_AUTHORING_POLICY: string;
  SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT: string;
  buildSceneShortcutCatalog: () => MathSceneShortcutCatalog;
  sceneShortcutCatalogDataAttributes: (catalog: MathSceneShortcutCatalog) => Record<string, string>;
  serializeSceneShortcutCatalog: (catalog: MathSceneShortcutCatalog) => string;
};

const modulePath = "components/visualizations/three/manim/mathSceneShortcutCatalog.ts";

async function importShortcutCatalogModule() {
  assert.ok(fs.existsSync(modulePath), "MAIS Manim should provide a pure InteractiveScene shortcut catalog");
  return (await import("./mathSceneShortcutCatalog")) as MathSceneShortcutCatalogModule;
}

test("buildSceneShortcutCatalog lists the InteractiveSceneEmbed authoring shortcuts", async () => {
  const {
    SCENE_SHORTCUT_AUTHORING_POLICY,
    SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT,
    buildSceneShortcutCatalog
  } = await importShortcutCatalogModule();
  const catalog = buildSceneShortcutCatalog();

  assert.equal(catalog.version, "mais-manim-shortcut-catalog/v1");
  assert.equal(catalog.sourceContract, SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT);
  assert.equal(catalog.shortcutAuthoringPolicy, SCENE_SHORTCUT_AUTHORING_POLICY);
  assert.match(catalog.sourceContract, /InteractiveSceneEmbed/);
  assert.match(catalog.sourceContract, /embedded authoring-shell shortcuts/);
  assert.match(catalog.shortcutAuthoringPolicy, /checkpoint-paste-post-cell-redraw/);
  assert.match(catalog.shortcutAuthoringPolicy, /reload-authoring-lifecycle/);
  assert.deepEqual(catalog.ids, [
    "play",
    "wait",
    "add",
    "remove",
    "save_state",
    "undo",
    "redo",
    "checkpoint_paste",
    "reload"
  ]);
  assert.equal(catalog.totalShortcutCount, 9);
  assert.equal(catalog.playbackShortcutCount, 2);
  assert.equal(catalog.sceneGraphShortcutCount, 2);
  assert.equal(catalog.stateShortcutCount, 2);
  assert.equal(catalog.historyShortcutCount, 2);
  assert.equal(catalog.checkpointShortcutCount, 1);
  assert.equal(catalog.redrawAfterCellCount, 1);
  assert.equal(catalog.reloadReady, true);
  assert.equal(
    catalog.summary,
    "shortcuts:total=9:playback=2:sceneGraph=2:state=2:history=2:checkpoint=1:redraw=1:reload=true"
  );
});

test("sceneShortcutCatalogDataAttributes exposes stable browser QA evidence", async () => {
  const {
    SCENE_SHORTCUT_AUTHORING_POLICY,
    SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT,
    buildSceneShortcutCatalog,
    sceneShortcutCatalogDataAttributes
  } = await importShortcutCatalogModule();
  const catalog = buildSceneShortcutCatalog();

  assert.deepEqual(sceneShortcutCatalogDataAttributes(catalog), {
    "data-viz-manim-shortcut-checkpoint-count": "1",
    "data-viz-manim-shortcut-count": "9",
    "data-viz-manim-shortcut-history-count": "2",
    "data-viz-manim-shortcut-ids": "play,wait,add,remove,save_state,undo,redo,checkpoint_paste,reload",
    "data-viz-manim-shortcut-playback-count": "2",
    "data-viz-manim-shortcut-redraw-count": "1",
    "data-viz-manim-shortcut-reload-ready": "true",
    "data-viz-manim-shortcut-scene-graph-count": "2",
    "data-viz-manim-shortcut-source-contract": SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT,
    "data-viz-manim-shortcut-state-count": "2",
    "data-viz-manim-shortcut-authoring-policy": SCENE_SHORTCUT_AUTHORING_POLICY,
    "data-viz-manim-shortcut-summary": catalog.summary
  });
});

test("serializes shortcut catalogs as deterministic browser JSON", async () => {
  const {
    buildSceneShortcutCatalog,
    serializeSceneShortcutCatalog
  } = await importShortcutCatalogModule();
  const catalog = buildSceneShortcutCatalog();
  const serialized = serializeSceneShortcutCatalog({
    ...catalog,
    summary: "<shortcuts>"
  });

  assert.doesNotMatch(serialized, /<shortcuts>/);
  assert.match(serialized, /\\u003cshortcuts>/);
  assert.deepEqual(JSON.parse(serialized), {
    ...catalog,
    summary: "<shortcuts>"
  });
});

test("shortcut catalog stays pure and documents the source-level embedded shell contract", () => {
  assert.ok(fs.existsSync(modulePath), "mathSceneShortcutCatalog.ts should exist");
  const source = fs.readFileSync(modulePath, "utf8");

  assert.match(source, /SCENE_SHORTCUT_CATALOG_SOURCE_CONTRACT/);
  assert.match(source, /SCENE_SHORTCUT_AUTHORING_POLICY/);

  for (const token of [
    "InteractiveSceneEmbed",
    "play",
    "wait",
    "add",
    "remove",
    "save_state",
    "undo",
    "redo",
    "checkpoint_paste",
    "reload",
    "post-cell"
  ]) {
    assert.match(source, new RegExp(token));
  }

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|document\.|requestAnimationFrame/);
});
