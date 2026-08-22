import assert from "node:assert/strict";
import test from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { usCaliforniaLessonSeeds } from "@/data/usCaliforniaLessons";
import { WorkedExampleIllustration, focusBadgeTextMetrics } from "./WorkedExampleIllustration";

const focusBadgeTextWidth = 325;

test("worked-example focus badges constrain long English and Chinese labels", () => {
  for (const label of [
    "shape and measurement model",
    "邻补角和为 180 度，所以另一个角为 140 度。 C",
    "在Statistics表中列出类别和对应的本数，并注明单"
  ]) {
    const metrics = focusBadgeTextMetrics(label);
    assert.ok(metrics.fontSize >= 14 && metrics.fontSize <= 28);
    if (metrics.textLength !== undefined) {
      assert.equal(metrics.textLength, focusBadgeTextWidth);
    }
  }
});

const gradeOneExactSceneTitles = [
  ["us-ca-math-p1-1-md-measure-data", "Compare ribbon and string"],
  ["us-ca-math-p1-1-g-shape-reasoning", "Two equal rectangle shares"],
  ["us-ca-math-p1-1-h1-picture-join-stories-to-10", "Join red and blue counters"],
  ["us-ca-math-p1-1-h2-picture-story-addition-equations", "Birds on fence and tree"],
  ["us-ca-math-p1-1-h3-cube-train-join-models-to-10", "Cube train join model"],
  ["us-ca-math-p1-1-h5-model-equation-join-stories-to-10", "Apples in the basket"],
  ["us-ca-math-p1-1-h6-equation-match-join-stories-to-10", "Match the fish story"],
  ["us-ca-math-p1-1-l1-picture-take-away-stories-to-10", "Take away balloons"],
  ["us-ca-math-p1-1-l2-picture-story-subtraction-equations", "Crackers subtraction"],
  ["us-ca-math-p1-1-l3-cube-train-take-away-models-to-10", "Cover cubes in the train"],
  ["us-ca-math-p1-1-l4-take-away-stories-within-10", "Sticker take-away story"],
  ["us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10", "Cross out counters"],
  ["us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10", "Break apart shells"]
] as const;

test("every California Grade 1 exact scene replaces the overlapping generic header", () => {
  // The app compiler injects the automatic JSX runtime. The focused `tsx`
  // source test uses the classic transform, so expose React while rendering
  // the production component rather than weakening this to a source regex.
  const testGlobal = globalThis as typeof globalThis & { React?: typeof React };
  const previousReact = testGlobal.React;
  testGlobal.React = React;

  for (const [topicId, expectedSceneTitle] of gradeOneExactSceneTitles) {
    const lesson = usCaliforniaLessonSeeds.find((seed) => seed.topicId === topicId);
    const workedExample = lesson?.blocks.find((block) => block.type === "worked-example");

    const markup = renderToStaticMarkup(
      createElement(WorkedExampleIllustration, {
        // The first two exact renderers are retained for legacy topic-level
        // callers but their current lessons moved to the CCSS registry.
        content: workedExample?.content?.en ?? expectedSceneTitle,
        grade: "P1",
        title: lesson?.title.en ?? expectedSceneTitle,
        topicId
      })
    );

    assert.match(markup, /data-worked-exact-scene-title="true"/, `${topicId} must render its specific scene title`);
    assert.ok(markup.includes(expectedSceneTitle), `${topicId} must keep the exact title "${expectedSceneTitle}"`);
    assert.doesNotMatch(
      markup,
      /data-worked-generic-scene-title="true"/,
      `${topicId} must not render the generic kind/age label behind its scene title`
    );
  }

  if (previousReact === undefined) {
    Reflect.deleteProperty(testGlobal, "React");
  } else {
    testGlobal.React = previousReact;
  }
});
