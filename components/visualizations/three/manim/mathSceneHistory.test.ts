import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const expectedSceneHistorySourceContract =
  "Scene.save_state/restore: undo_stack redo_stack max_num_saved_states mobjects_match" as const;

type TestAuthoringState = {
  cameraMode: "guided" | "explore";
  elapsedSeconds: number;
  playbackState: "playing" | "paused" | "scrubbing" | "checkpoint";
  sceneId: string;
};

type HistoryEntry<TState> = {
  label: string;
  revision: number;
  state: TState;
};

type HistoryStore<TState> = {
  branchInvalidatedRedoCount: number;
  branchInvalidatedRedoLabels: string[];
  current: HistoryEntry<TState>;
  droppedUndoCount: number;
  maxUndoEntries: number;
  undoStack: HistoryEntry<TState>[];
  redoStack: HistoryEntry<TState>[];
  revision: number;
  sourceContract: typeof expectedSceneHistorySourceContract;
};

type HistorySummary = {
  branchInvalidatedRedoCount: number;
  branchInvalidatedRedoLabels: string;
  branchPolicy: string;
  canRedo: boolean;
  canUndo: boolean;
  currentLabel: string;
  droppedUndoCount: number;
  maxUndoEntries: number;
  redoCount: number;
  revision: number;
  sourceContract: typeof expectedSceneHistorySourceContract;
  undoCount: number;
};

type HistoryManifest = {
  branchInvalidatedRedoCount: number;
  branchInvalidatedRedoLabels: string[];
  branchPolicy: string;
  canRedo: boolean;
  canUndo: boolean;
  current: { label: string; revision: number; stateSignature: string };
  droppedUndoCount: number;
  maxUndoEntries: number;
  redoCount: number;
  redoStack: { label: string; revision: number; stateSignature: string }[];
  revision: number;
  sourceContract: typeof expectedSceneHistorySourceContract;
  summary: string;
  undoCount: number;
  undoStack: { label: string; revision: number; stateSignature: string }[];
  version: "mais-manim-history/v1";
};

type MathSceneHistoryModule = {
  SCENE_HISTORY_SOURCE_CONTRACT: typeof expectedSceneHistorySourceContract;
  buildSceneHistoryManifest: <TState>(store: HistoryStore<TState>) => HistoryManifest;
  createSceneHistoryStore: <TState>(
    initialState: TState,
    options?: { label?: string }
  ) => HistoryStore<TState>;
  pushSceneHistory: <TState>(
    store: HistoryStore<TState>,
    nextState: TState,
    options?: { label?: string; maxUndoEntries?: number }
  ) => HistoryStore<TState>;
  undoSceneHistory: <TState>(
    store: HistoryStore<TState>
  ) => {
    changed: boolean;
    state: TState;
    store: HistoryStore<TState>;
  };
  redoSceneHistory: <TState>(
    store: HistoryStore<TState>
  ) => {
    changed: boolean;
    state: TState;
    store: HistoryStore<TState>;
  };
  summarizeSceneHistory: <TState>(store: HistoryStore<TState>) => HistorySummary;
  sceneHistoryDataAttributes: (summary: HistorySummary) => Record<string, string>;
  serializeSceneHistoryManifest: (manifest: HistoryManifest) => string;
};

const historyModulePath = "components/visualizations/three/manim/mathSceneHistory.ts";
const initialState: TestAuthoringState = {
  cameraMode: "guided",
  elapsedSeconds: 0,
  playbackState: "playing",
  sceneId: "three-function-graph"
};

async function importHistoryModule() {
  assert.ok(fs.existsSync(historyModulePath), "MAIS Manim should provide a pure undo/redo history module");
  return await import("./mathSceneHistory") as MathSceneHistoryModule;
}

test("creates a deterministic scene history store from the initial authoring state", async () => {
  const {
    SCENE_HISTORY_SOURCE_CONTRACT,
    createSceneHistoryStore,
    summarizeSceneHistory,
    sceneHistoryDataAttributes
  } = await importHistoryModule();
  const store = createSceneHistoryStore(initialState, { label: "initial scene" });
  const summary = summarizeSceneHistory(store);

  assert.equal(SCENE_HISTORY_SOURCE_CONTRACT, expectedSceneHistorySourceContract);
  assert.equal(store.sourceContract, SCENE_HISTORY_SOURCE_CONTRACT);
  assert.deepEqual(store.current.state, initialState);
  assert.equal(store.current.label, "initial scene");
  assert.equal(store.current.revision, 0);
  assert.equal(store.revision, 0);
  assert.deepEqual(store.undoStack, []);
  assert.deepEqual(store.redoStack, []);
  assert.deepEqual(summary, {
    canRedo: false,
    canUndo: false,
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: "none",
    branchPolicy: "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    currentLabel: "initial scene",
    droppedUndoCount: 0,
    maxUndoEntries: 50,
    redoCount: 0,
    revision: 0,
    sourceContract: SCENE_HISTORY_SOURCE_CONTRACT,
    undoCount: 0
  });
  assert.deepEqual(sceneHistoryDataAttributes(summary), {
    "data-viz-manim-history-can-redo": "false",
    "data-viz-manim-history-can-undo": "false",
    "data-viz-manim-history-branch-invalidated-redo-count": "0",
    "data-viz-manim-history-branch-invalidated-redo-labels": "none",
    "data-viz-manim-history-branch-policy": "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    "data-viz-manim-history-current-label": "initial scene",
    "data-viz-manim-history-dropped-undo-count": "0",
    "data-viz-manim-history-max-undo-entries": "50",
    "data-viz-manim-history-redo-count": "0",
    "data-viz-manim-history-revision": "0",
    "data-viz-manim-history-source-contract": SCENE_HISTORY_SOURCE_CONTRACT,
    "data-viz-manim-history-undo-count": "0"
  });
});

test("pushes immutable authoring snapshots and clears redo after a new branch", async () => {
  const { createSceneHistoryStore, pushSceneHistory, undoSceneHistory, summarizeSceneHistory } = await importHistoryModule();
  const middleState: TestAuthoringState = { ...initialState, elapsedSeconds: 2.5, playbackState: "checkpoint" };
  const finalState: TestAuthoringState = { ...initialState, cameraMode: "explore", elapsedSeconds: 4, playbackState: "paused" };
  const branchedState: TestAuthoringState = { ...initialState, elapsedSeconds: 1.25, playbackState: "scrubbing" };
  const initial = createSceneHistoryStore(initialState, { label: "initial" });
  const withMiddle = pushSceneHistory(initial, middleState, { label: "save checkpoint" });
  const withFinal = pushSceneHistory(withMiddle, finalState, { label: "show final" });
  const undone = undoSceneHistory(withFinal);
  const branched = pushSceneHistory(undone.store, branchedState, { label: "# scrub branch\nset_time(...)" });

  middleState.elapsedSeconds = 99;

  assert.deepEqual(initial.undoStack, []);
  assert.deepEqual(withMiddle.undoStack.map((entry) => entry.label), ["initial"]);
  assert.deepEqual(withFinal.undoStack.map((entry) => entry.label), ["initial", "save checkpoint"]);
  assert.equal(withMiddle.current.state.elapsedSeconds, 2.5);
  assert.equal(undone.state.elapsedSeconds, 2.5);
  assert.equal(undone.store.redoStack.length, 1);
  assert.equal(branched.branchInvalidatedRedoCount, 1);
  assert.deepEqual(branched.branchInvalidatedRedoLabels, ["show final"]);
  assert.equal(branched.current.label, "scrub branch");
  assert.equal(branched.current.state.elapsedSeconds, 1.25);
  assert.equal(branched.redoStack.length, 0);
  assert.deepEqual(summarizeSceneHistory(branched), {
    canRedo: false,
    canUndo: true,
    branchInvalidatedRedoCount: 1,
    branchInvalidatedRedoLabels: "show final",
    branchPolicy: "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    currentLabel: "scrub branch",
    droppedUndoCount: 0,
    maxUndoEntries: 50,
    redoCount: 0,
    revision: 4,
    sourceContract: expectedSceneHistorySourceContract,
    undoCount: 2
  });
});

test("undo and redo move through scene history without mutating old stores", async () => {
  const { createSceneHistoryStore, pushSceneHistory, redoSceneHistory, summarizeSceneHistory, undoSceneHistory } = await importHistoryModule();
  const checkpointState: TestAuthoringState = { ...initialState, elapsedSeconds: 3, playbackState: "checkpoint" };
  const finalState: TestAuthoringState = { ...initialState, elapsedSeconds: 8, playbackState: "paused" };
  const store = pushSceneHistory(
    pushSceneHistory(createSceneHistoryStore(initialState, { label: "initial" }), checkpointState, { label: "checkpoint" }),
    finalState,
    { label: "final" }
  );
  const undone = undoSceneHistory(store);
  const redone = redoSceneHistory(undone.store);

  assert.equal(store.current.label, "final");
  assert.equal(undone.changed, true);
  assert.equal(undone.store.current.label, "checkpoint");
  assert.equal(undone.store.revision, 3);
  assert.equal(redone.changed, true);
  assert.equal(redone.store.current.label, "final");
  assert.equal(redone.state.elapsedSeconds, 8);
  assert.equal(redone.store.revision, 4);
  assert.deepEqual(summarizeSceneHistory(redone.store), {
    canRedo: false,
    canUndo: true,
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: "none",
    branchPolicy: "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    currentLabel: "final",
    droppedUndoCount: 0,
    maxUndoEntries: 50,
    redoCount: 0,
    revision: 4,
    sourceContract: expectedSceneHistorySourceContract,
    undoCount: 2
  });
});

test("pushSceneHistory mirrors Scene.save_state by ignoring unchanged adjacent states", async () => {
  const { createSceneHistoryStore, pushSceneHistory, summarizeSceneHistory } = await importHistoryModule();
  const checkpointState: TestAuthoringState = { ...initialState, elapsedSeconds: 3, playbackState: "checkpoint" };
  const initial = createSceneHistoryStore(initialState, { label: "initial" });
  const withCheckpoint = pushSceneHistory(initial, checkpointState, { label: "checkpoint" });
  const duplicate = pushSceneHistory(withCheckpoint, { ...checkpointState }, { label: "duplicate checkpoint" });

  assert.equal(duplicate, withCheckpoint);
  assert.equal(duplicate.current.label, "checkpoint");
  assert.equal(duplicate.revision, 1);
  assert.deepEqual(duplicate.undoStack.map((entry) => entry.label), ["initial"]);
  assert.deepEqual(summarizeSceneHistory(duplicate), {
    canRedo: false,
    canUndo: true,
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: "none",
    branchPolicy: "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    currentLabel: "checkpoint",
    droppedUndoCount: 0,
    maxUndoEntries: 50,
    redoCount: 0,
    revision: 1,
    sourceContract: expectedSceneHistorySourceContract,
    undoCount: 1
  });
});

test("pushSceneHistory enforces Manim max_num_saved_states by dropping the oldest undo entries", async () => {
  const { createSceneHistoryStore, pushSceneHistory, summarizeSceneHistory, undoSceneHistory } = await importHistoryModule();
  const initial = createSceneHistoryStore(initialState, { label: "state 0" });
  const state1: TestAuthoringState = { ...initialState, elapsedSeconds: 1, playbackState: "checkpoint" };
  const state2: TestAuthoringState = { ...initialState, elapsedSeconds: 2, playbackState: "scrubbing" };
  const state3: TestAuthoringState = { ...initialState, elapsedSeconds: 3, playbackState: "paused" };
  const withState1 = pushSceneHistory(initial, state1, { label: "state 1", maxUndoEntries: 2 });
  const withState2 = pushSceneHistory(withState1, state2, { label: "state 2", maxUndoEntries: 2 });
  const withState3 = pushSceneHistory(withState2, state3, { label: "state 3", maxUndoEntries: 2 });
  const undone = undoSceneHistory(withState3);

  assert.deepEqual(withState3.undoStack.map((entry) => entry.label), ["state 1", "state 2"]);
  assert.deepEqual(withState3.undoStack.map((entry) => entry.state.elapsedSeconds), [1, 2]);
  assert.equal(withState3.current.label, "state 3");
  assert.equal(withState3.revision, 3);
  assert.deepEqual(summarizeSceneHistory(withState3), {
    canRedo: false,
    canUndo: true,
    branchInvalidatedRedoCount: 0,
    branchInvalidatedRedoLabels: "none",
    branchPolicy: "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels",
    currentLabel: "state 3",
    droppedUndoCount: 1,
    maxUndoEntries: 2,
    redoCount: 0,
    revision: 3,
    sourceContract: expectedSceneHistorySourceContract,
    undoCount: 2
  });
  assert.equal(undone.store.current.label, "state 2");
  assert.equal(undone.store.undoStack[0]?.label, "state 1");
});

test("builds a deterministic undo/redo history manifest for browser QA payloads", async () => {
  const {
    buildSceneHistoryManifest,
    createSceneHistoryStore,
    pushSceneHistory,
    serializeSceneHistoryManifest,
    undoSceneHistory
  } = await importHistoryModule();
  const checkpointState: TestAuthoringState = { ...initialState, elapsedSeconds: 3, playbackState: "checkpoint" };
  const finalState: TestAuthoringState = { ...initialState, cameraMode: "explore", elapsedSeconds: 8, playbackState: "paused" };
  const store = pushSceneHistory(
    pushSceneHistory(createSceneHistoryStore(initialState, { label: "<initial>" }), checkpointState, { label: "checkpoint" }),
    finalState,
    { label: "final" }
  );
  const undone = undoSceneHistory(store);
  const manifest = buildSceneHistoryManifest(undone.store);
  const serialized = serializeSceneHistoryManifest(manifest);

  assert.equal(manifest.version, "mais-manim-history/v1");
  assert.equal(manifest.sourceContract, expectedSceneHistorySourceContract);
  assert.equal(manifest.current.label, "checkpoint");
  assert.equal(manifest.current.revision, 3);
  assert.match(manifest.current.stateSignature, /^history-state-[0-9a-f]{8}$/);
  assert.deepEqual(manifest.undoStack.map((entry) => entry.label), ["<initial>"]);
  assert.deepEqual(manifest.redoStack.map((entry) => entry.label), ["final"]);
  assert.equal(manifest.undoCount, 1);
  assert.equal(manifest.redoCount, 1);
  assert.equal(manifest.branchInvalidatedRedoCount, 0);
  assert.deepEqual(manifest.branchInvalidatedRedoLabels, []);
  assert.equal(
    manifest.branchPolicy,
    "new-history-push-after-undo-clears-redo-stack-and-records-invalidated-branch-labels"
  );
  assert.equal(manifest.canUndo, true);
  assert.equal(manifest.canRedo, true);
  assert.equal(
    manifest.summary,
    "history:revision=3:current=checkpoint:undo=1:redo=1:dropped=0:canUndo=true:canRedo=true"
  );
  assert.doesNotMatch(serialized, /"state":/);
  assert.doesNotMatch(serialized, /<initial>/);
  assert.match(serialized, /\\u003cinitial>/);
  assert.deepEqual(JSON.parse(serialized), manifest);
});

test("history module stays pure and separate from the React Three Fiber renderer", () => {
  assert.ok(fs.existsSync(historyModulePath), "mathSceneHistory.ts should exist");
  const source = fs.readFileSync(historyModulePath, "utf8");

  assert.doesNotMatch(source, /"use client"|@react-three\/fiber|@react-three\/drei|from "three"|ThreeDLabCanvas/);
  assert.match(source, /SCENE_HISTORY_SOURCE_CONTRACT/);
  assert.match(source, /save_state/);
  assert.match(source, /max_num_saved_states/);
  assert.match(source, /mobjects_match/);
});
