import assert from "node:assert/strict";
import test from "node:test";

import { createMainlandPhysicalCommitHandlers } from "./MainlandPhysicalCommitAnalytics";

test("physical commit handlers map every learner commit to exactly one analytics event", () => {
  const events: string[] = [];
  const handlers = createMainlandPhysicalCommitHandlers((type) => {
    events.push(type);
  });

  handlers.recordModeCommit();
  handlers.recordRangeCommit();
  handlers.recordRangeCommit();
  handlers.recordResetCommit();

  assert.deepEqual(events, [
    "visualization-probe",
    "visualization-slider",
    "visualization-slider",
    "visualization-reset"
  ]);
});

test("creating handlers or rendering without a physical commit emits nothing", () => {
  const events: string[] = [];
  createMainlandPhysicalCommitHandlers((type) => events.push(type));
  const disconnected = createMainlandPhysicalCommitHandlers();

  assert.doesNotThrow(() => disconnected.recordRangeCommit());
  assert.deepEqual(events, []);
});

test("range key commits include every native range adjustment key", () => {
  const events: string[] = [];
  const handlers = createMainlandPhysicalCommitHandlers((type) => {
    events.push(type);
  }) as ReturnType<typeof createMainlandPhysicalCommitHandlers> & {
    recordRangeKeyCommit?: (
      key: string,
      modifiers?: {
        altKey?: boolean;
        ctrlKey?: boolean;
        metaKey?: boolean;
        shiftKey?: boolean;
      }
    ) => void;
  };
  assert.equal(typeof handlers.recordRangeKeyCommit, "function");

  for (const key of [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown"
  ]) {
    handlers.recordRangeKeyCommit!(key);
  }

  assert.deepEqual(events, Array(8).fill("visualization-slider"));
});

test("range key commits reject navigation, modifier, character, and modified keyups", () => {
  const events: string[] = [];
  const handlers = createMainlandPhysicalCommitHandlers((type) => {
    events.push(type);
  });

  for (const key of ["Tab", "Shift", "Control", "Alt", "Meta", "a", "7"]) {
    handlers.recordRangeKeyCommit(key);
  }
  handlers.recordRangeKeyCommit("ArrowRight", { shiftKey: true });
  handlers.recordRangeKeyCommit("ArrowRight", { ctrlKey: true });
  handlers.recordRangeKeyCommit("ArrowRight", { altKey: true });
  handlers.recordRangeKeyCommit("ArrowRight", { metaKey: true });

  assert.deepEqual(events, []);
});
