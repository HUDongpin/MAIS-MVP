import assert from "node:assert/strict";
import test from "node:test";
import {
  PREVIEW_OPTIONS_PER_QUESTION,
  PREVIEW_QUESTIONS_PER_TOPIC,
  PREVIEW_TOPICS_PER_GRADE,
  buildPracticeMissionPreviewSample
} from "./practiceMissionPreviewSample";
import type { Question } from "@/types";

function makeQuestion(grade: string, topicId: string, index: number): Question {
  return {
    id: `${grade}-${topicId}-${index}`,
    grade: grade as Question["grade"],
    topicId,
    topic: { en: topicId, zh: topicId },
    difficulty: "Low",
    type: "multiple-choice",
    prompt: { en: `prompt ${index}`, zh: `題目 ${index}` },
    options: [
      { en: "a", zh: "a" },
      { en: "b", zh: "b" },
      { en: "c", zh: "c" },
      { en: "d", zh: "d" }
    ],
    answer: "a",
    explanation: { en: "", zh: "" }
  } as Question;
}

// Two grades, each with more topics and questions than the caps allow.
const grades = ["S1", "S2"];
const topicsPerGrade = 10;
const questionsPerTopic = 12;
const fixture: Question[] = [];
for (const grade of grades) {
  for (let topic = 0; topic < topicsPerGrade; topic += 1) {
    for (let index = 0; index < questionsPerTopic; index += 1) {
      fixture.push(makeQuestion(grade, `${grade}-topic-${topic}`, index));
    }
  }
}

test("caps topics per grade and questions per topic", () => {
  const { previewItems, topicOptions } = buildPracticeMissionPreviewSample(fixture);

  // Topics: PREVIEW_TOPICS_PER_GRADE per grade.
  assert.equal(topicOptions.length, PREVIEW_TOPICS_PER_GRADE * grades.length);

  // Questions: at most PREVIEW_QUESTIONS_PER_TOPIC per selected topic.
  const perTopic = new Map<string, number>();
  for (const item of previewItems) {
    perTopic.set(item.topicId, (perTopic.get(item.topicId) ?? 0) + 1);
  }
  for (const count of perTopic.values()) {
    assert.ok(count <= PREVIEW_QUESTIONS_PER_TOPIC);
  }
  assert.equal(previewItems.length, PREVIEW_TOPICS_PER_GRADE * grades.length * PREVIEW_QUESTIONS_PER_TOPIC);
});

test("preview options are trimmed to what the card renders", () => {
  const { previewItems } = buildPracticeMissionPreviewSample(fixture);
  for (const item of previewItems) {
    assert.ok((item.options?.length ?? 0) <= PREVIEW_OPTIONS_PER_QUESTION);
  }
});

test("topic options are consistent with preview items (no empty topics)", () => {
  const { previewItems, topicOptions } = buildPracticeMissionPreviewSample(fixture);
  const topicsWithItems = new Set(previewItems.map((item) => item.topicId));
  for (const option of topicOptions) {
    assert.ok(topicsWithItems.has(option.topicId), `topic ${option.topicId} should have preview items`);
  }
});

test("every grade present is represented in the topic options", () => {
  const { topicOptions } = buildPracticeMissionPreviewSample(fixture);
  const gradesRepresented = new Set(topicOptions.map((option) => option.grade));
  for (const grade of grades) {
    assert.ok(gradesRepresented.has(grade as Question["grade"]));
  }
});
