import assert from "node:assert/strict";
import test from "node:test";
import { usCaliforniaLessonSeeds } from "@/data/usCaliforniaLessons";
import { buildWorkedExampleIllustrationMetadata, inferWorkedExampleVisualKind } from "./workedExampleIllustrationMetadata";

test("upper-primary grouped multiplication expressions use a concrete counting model", () => {
  const context = {
    content: "Model (7 + 2) x 4 by making four equal groups. Each group has 7 square counters and 2 round counters, so the expression shows repeated equal groups.",
    grade: "P5" as const,
    title: "Represent grouped expressions",
    topicId: "p5-grouped-expression"
  };

  assert.equal(inferWorkedExampleVisualKind(context), "counting");

  const metadata = buildWorkedExampleIllustrationMetadata(context);
  assert.equal(metadata.kind, "counting");
  assert.equal(metadata.focusText, "(7 + 2) x 4");
  assert.match(metadata.caption, /concrete equal groups/i);
});

test("California Grade 1 reported worked examples use exact scene contracts instead of generic visuals", () => {
  const expectedScenes = new Map([
    ["us-ca-math-p1-1-md-measure-data", "measurement-ribbon-string-difference"],
    ["us-ca-math-p1-1-g-shape-reasoning", "geometry-equal-share-rectangles"],
    ["us-ca-math-p1-1-h1-picture-join-stories-to-10", "counters-red-blue-join"],
    ["us-ca-math-p1-1-h2-picture-story-addition-equations", "birds-fence-tree-addition"],
    ["us-ca-math-p1-1-h3-cube-train-join-models-to-10", "cube-train-green-yellow-join"],
    ["us-ca-math-p1-1-h5-model-equation-join-stories-to-10", "apple-basket-join"],
    ["us-ca-math-p1-1-h6-equation-match-join-stories-to-10", "fish-equation-match-join"],
    ["us-ca-math-p1-1-l1-picture-take-away-stories-to-10", "balloon-take-away"],
    ["us-ca-math-p1-1-l2-picture-story-subtraction-equations", "crackers-subtraction-equation"],
    ["us-ca-math-p1-1-l3-cube-train-take-away-models-to-10", "cube-train-cover-take-away"],
    ["us-ca-math-p1-1-l4-take-away-stories-within-10", "sticker-take-away"],
    ["us-ca-math-p1-1-l5-model-equation-take-away-stories-to-10", "counter-cross-out-take-away"],
    ["us-ca-math-p1-1-l6-break-apart-subtraction-equations-to-10", "shells-break-apart-subtraction"]
  ] as const);

  const issues: string[] = [];

  for (const [topicId, expectedSceneId] of expectedScenes) {
    const lesson = usCaliforniaLessonSeeds.find((seed) => seed.topicId === topicId);
    const workedExample = lesson?.blocks.find((block) => block.type === "worked-example");
    assert.ok(lesson, `Missing lesson ${topicId}`);
    assert.ok(workedExample, `Missing worked example ${topicId}`);
    assert.ok(workedExample.content, `Missing worked example content ${topicId}`);

    const metadata = buildWorkedExampleIllustrationMetadata({
      content: workedExample.content.en,
      grade: "P1",
      title: lesson.title.en,
      topicId
    });
    const sceneId = (metadata as { sceneId?: string }).sceneId;

    if (sceneId !== expectedSceneId) {
      issues.push(`${topicId}: expected ${expectedSceneId}, received ${sceneId ?? "none"}`);
    }
    if (/data display|spatial and vector|balanced equation model/i.test(metadata.caption)) {
      issues.push(`${topicId}: still using generic wrong visual caption "${metadata.caption}"`);
    }
  }

  assert.deepEqual(issues, []);
});
