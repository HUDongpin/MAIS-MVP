import assert from "node:assert/strict";
import test from "node:test";

import { productionLessonByTopicId, type ProductionLessonSeed } from "@/data/lessons";
import { topics } from "@/data/topics";
import { __userStoreLessonBlockOrderTestHooks } from "@/lib/server/userStore";
import type { Topic } from "@/types";

const { seedProductionLessonBlockRecords } = __userStoreLessonBlockOrderTestHooks;

function topicAndLesson(topicId: string) {
  const topic = topics.find((candidate) => candidate.id === topicId);
  const lesson = productionLessonByTopicId.get(topicId);
  assert.ok(topic, `${topicId}: missing topic`);
  assert.ok(lesson, `${topicId}: missing production lesson`);
  return { topic, lesson };
}

function seededTypes(topic: Topic, lesson: ProductionLessonSeed) {
  const records = seedProductionLessonBlockRecords(topic, lesson, []);
  assert.deepEqual(records.map((record) => record.sort_order), records.map((_, index) => index));
  assert.equal(records.filter((record) => record.type === "practice").length, 1);
  return records.map((record) => record.type);
}

function baselineNonHongKongTypes(lesson: ProductionLessonSeed) {
  const authored = lesson.blocks.map((block) => block.type);
  const firstExtension = authored.indexOf("extension");
  assert.notEqual(firstExtension, -1);
  return [
    ...authored.slice(0, firstExtension),
    "practice",
    ...authored.slice(firstExtension)
  ];
}

test("real HK lessons seed authored extension and checklist before one final practice block", () => {
  const { topic, lesson } = topicAndLesson("p1-counting-number-bonds");
  assert.equal(topic.curriculumTrack, "HK");
  assert.deepEqual(
    seededTypes(topic, lesson),
    [...lesson.blocks.map((block) => block.type), "practice"]
  );
});
test("real Mainland and US lessons retain the pre-HK practice-before-extension order", () => {
  for (const topicId of [
    "pep-primary-p1-upper-number-sense",
    "us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning",
    "us-ca-math-k-k-cc-count-sequence"
  ]) {
    const { topic, lesson } = topicAndLesson(topicId);
    assert.notEqual(topic.curriculumTrack, "HK");
    assert.deepEqual(seededTypes(topic, lesson), baselineNonHongKongTypes(lesson), topicId);
  }
});

test("multiple authored extensions still receive exactly one practice block", () => {
  const { topic, lesson } = topicAndLesson("us-ar-math-g06-chapter-01-ratios-rates-and-percent-reasoning");
  const extension = lesson.blocks.find((block) => block.type === "extension");
  assert.ok(extension);
  const withTwoExtensions: ProductionLessonSeed = {
    ...lesson,
    blocks: [
      ...lesson.blocks,
      { ...extension, idSuffix: `${extension.idSuffix}-second` }
    ]
  };
  const types = seededTypes(topic, withTwoExtensions);
  assert.equal(types.filter((type) => type === "extension").length, 2);
  assert.equal(types.filter((type) => type === "practice").length, 1);
  assert.ok(types.indexOf("practice") < types.indexOf("extension"));
});
