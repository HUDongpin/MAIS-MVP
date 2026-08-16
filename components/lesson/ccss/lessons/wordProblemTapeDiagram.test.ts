import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWordProblemTapeDiagram,
  updateWordProblemStoryState,
  wordProblemStoryControlLimits,
  type WordProblemStoryState
} from "./wordProblemTapeDiagram";

test("the default two-step bird story shows the removed 18 before adding the landed 12", () => {
  const diagram = buildWordProblemTapeDiagram({
    added: 18,
    landed: 12,
    start: 45,
    twoStep: true
  });

  assert.deepEqual(diagram, {
    answer: 39,
    equation: "45 − 18 + 12 = 39",
    removed: 18,
    scaleTotal: 45,
    stages: [
      {
        ariaLabel: "Step 1 tape diagram: 45 birds split into 27 stayed and 18 flew away.",
        equation: "45 − 18 = 27",
        id: "step-1",
        label: "Step 1 · 45 birds before",
        segments: [
          { id: "stayed", label: "stayed", value: 27 },
          { id: "flew-away", label: "flew away", value: 18 }
        ],
        total: 45
      },
      {
        ariaLabel: "Step 2 tape diagram: 39 birds split into 27 stayed and 12 landed.",
        equation: "27 + 12 = 39",
        id: "step-2",
        label: "Step 2 · 39 birds now",
        segments: [
          { id: "stayed", label: "stayed", value: 27 },
          { id: "landed", label: "landed", value: 12 }
        ],
        total: 39
      }
    ]
  });
});

test("one-step mode keeps its original start-plus-added tape and equation", () => {
  const diagram = buildWordProblemTapeDiagram({
    added: 18,
    landed: 12,
    start: 45,
    twoStep: false
  });

  assert.equal(diagram.answer, 63);
  assert.equal(diagram.equation, "45 + 18 = 63");
  assert.equal(diagram.scaleTotal, 63);
  assert.equal(diagram.stages.length, 1);
  assert.deepEqual(diagram.stages[0]?.segments, [
    { id: "start", label: "at the start", value: 45 },
    { id: "added", label: "added", value: 18 }
  ]);
});

test("every two-step control value recomputes both tape stages from the same retained amount", () => {
  const diagram = buildWordProblemTapeDiagram({
    added: 17,
    landed: 13,
    start: 46,
    twoStep: true
  });

  assert.equal(diagram.removed, 17);
  assert.equal(diagram.answer, 42);
  assert.equal(diagram.equation, "46 − 17 + 13 = 42");
  assert.deepEqual(diagram.stages.map((stage) => ({
    equation: stage.equation,
    segments: stage.segments,
    total: stage.total
  })), [
    {
      equation: "46 − 17 = 29",
      segments: [
        { id: "stayed", label: "stayed", value: 29 },
        { id: "flew-away", label: "flew away", value: 17 }
      ],
      total: 46
    },
    {
      equation: "29 + 13 = 42",
      segments: [
        { id: "stayed", label: "stayed", value: 29 },
        { id: "landed", label: "landed", value: 13 }
      ],
      total: 42
    }
  ]);

  const allRemoved = buildWordProblemTapeDiagram({
    added: 18,
    landed: 5,
    start: 10,
    twoStep: true
  });
  assert.equal(allRemoved.removed, 10);
  assert.equal(allRemoved.answer, 5);
  assert.deepEqual(allRemoved.stages[0]?.segments.map((segment) => segment.value), [0, 10]);
  assert.deepEqual(allRemoved.stages[1]?.segments.map((segment) => segment.value), [0, 5]);
});

test("story transitions atomically clamp the changed amount without reviving an old value", () => {
  let story: WordProblemStoryState = {
    changed: 40,
    landed: 12,
    start: 45,
    twoStep: false
  };

  story = updateWordProblemStoryState(story, { type: "set-mode", twoStep: true });
  assert.equal(story.changed, 40);

  story = updateWordProblemStoryState(story, { type: "set-start", value: 20 });
  assert.deepEqual(story, {
    changed: 20,
    landed: 12,
    start: 20,
    twoStep: true
  });

  story = updateWordProblemStoryState(story, { type: "set-start", value: 45 });
  assert.equal(story.changed, 20, "raising Start must not revive the clamped 40");

  story = updateWordProblemStoryState(story, { type: "set-mode", twoStep: false });
  story = updateWordProblemStoryState(story, { type: "set-mode", twoStep: true });
  assert.equal(story.changed, 20, "mode toggles must not revive a previously clamped value");
});

test("one-step transitions keep the sum within 100", () => {
  let story: WordProblemStoryState = {
    changed: 40,
    landed: 12,
    start: 45,
    twoStep: false
  };

  story = updateWordProblemStoryState(story, { type: "set-start", value: 80 });
  assert.deepEqual(story, {
    changed: 20,
    landed: 12,
    start: 80,
    twoStep: false
  });
  assert.equal(story.start + story.changed, 100);
  assert.equal(wordProblemStoryControlLimits(story).changedMax, 20);

  story = updateWordProblemStoryState(story, { type: "set-changed", value: 40 });
  assert.equal(story.changed, 20);
  assert.equal(buildWordProblemTapeDiagram({
    added: story.changed,
    landed: story.landed,
    start: story.start,
    twoStep: story.twoStep
  }).answer, 100);
});

test("two-step transitions keep both the removed amount and final total valid", () => {
  let story: WordProblemStoryState = {
    changed: 5,
    landed: 20,
    start: 80,
    twoStep: true
  };

  story = updateWordProblemStoryState(story, { type: "set-landed", value: 40 });
  assert.equal(story.landed, 25);
  assert.equal(wordProblemStoryControlLimits(story).landedMax, 25);

  story = updateWordProblemStoryState(story, { type: "set-changed", value: 1 });
  assert.deepEqual(story, {
    changed: 1,
    landed: 21,
    start: 80,
    twoStep: true
  });
  assert.equal(story.start - story.changed + story.landed, 100);

  const switched = updateWordProblemStoryState({
    changed: 40,
    landed: 40,
    start: 10,
    twoStep: false
  }, { type: "set-mode", twoStep: true });
  assert.deepEqual(switched, {
    changed: 10,
    landed: 40,
    start: 10,
    twoStep: true
  });
  assert.equal(switched.start - switched.changed + switched.landed, 40);
});

test("two-step Flew away keeps the original full Start range", () => {
  const story = updateWordProblemStoryState({
    changed: 40,
    landed: 25,
    start: 80,
    twoStep: true
  }, { type: "set-changed", value: 80 });

  assert.deepEqual(story, {
    changed: 80,
    landed: 25,
    start: 80,
    twoStep: true
  });
  assert.equal(wordProblemStoryControlLimits(story).changedMax, 80);
  assert.equal(story.start - story.changed + story.landed, 25);
});
