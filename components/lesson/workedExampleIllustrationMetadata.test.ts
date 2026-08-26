import assert from "node:assert/strict";
import test from "node:test";
import { californiaElementaryMicroLessonSpecs } from "@/data/usCaliforniaMicroLessons";
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

test("live California Grade 1 topic scenes keep exact runtime contracts", () => {
  const expectedScenes = new Map([
    ["us-ca-math-p1-1-md-measure-data", "measurement-ribbon-string-difference"],
    ["us-ca-math-p1-1-g-shape-reasoning", "geometry-equal-share-rectangles"]
  ] as const);

  for (const [topicId, expectedSceneId] of expectedScenes) {
    const metadata = buildWorkedExampleIllustrationMetadata({
      content: "A standards-aligned worked example.",
      grade: "P1",
      title: topicId,
      topicId
    });
    assert.equal(metadata.sceneId, expectedSceneId);
  }
});

test("candidate-only California micro lessons have no runtime scene override", () => {
  for (const lesson of californiaElementaryMicroLessonSpecs) {
    const metadata = buildWorkedExampleIllustrationMetadata({
      content: lesson.workedExample.reasoning,
      grade: lesson.grade,
      title: lesson.maisTitle,
      topicId: lesson.topicId
    });

    assert.equal(metadata.sceneId, "generic", `${lesson.topicId} remains bound to an exact live scene`);
  }
});
