import assert from "node:assert/strict";
import test from "node:test";

import { getPublicQuestionsFromStore } from "@/lib/server/questionStore";
import { studentActivityToPublicQuestion } from "@/lib/server/userStore/studentActivityPersistence";

const privateAnswerFields = new Set([
  "answer",
  "answeren",
  "answerzh",
  "answers",
  "acceptedanswer",
  "acceptedanswers",
  "answerkey",
  "correct",
  "correctanswer",
  "correctanswers",
  "correctoption",
  "explanation",
  "explanationen",
  "explanationzh",
  "explanations",
  "iscorrect",
  "rationale",
  "solution",
  "workedsolution"
]);

const publicQuestionFields = new Set([
  "id",
  "curriculumTrack",
  "curriculumProfile",
  "region",
  "publisher",
  "canonicalTopicId",
  "grade",
  "topicId",
  "topic",
  "difficulty",
  "type",
  "prompt",
  "options",
  "diagram",
  "questionAssets"
]);

function assertRecord(value: unknown, location: string): asserts value is Record<string, unknown> {
  assert.ok(value !== null && typeof value === "object" && !Array.isArray(value), `${location} must be an object`);
}

function assertAllowedFields(value: unknown, allowedFields: ReadonlySet<string>, location: string) {
  assertRecord(value, location);
  for (const field of Object.keys(value)) {
    assert.ok(allowedFields.has(field), `${location} contains unsupported field ${field}`);
  }
  return value;
}

function assertLocalizedText(value: unknown, location: string) {
  const localized = assertAllowedFields(value, new Set(["en", "zh", "zhHans"]), location);
  assert.equal(typeof localized.en, "string", `${location}.en must be a string`);
  assert.equal(typeof localized.zh, "string", `${location}.zh must be a string`);
  if (localized.zhHans !== undefined) {
    assert.equal(typeof localized.zhHans, "string", `${location}.zhHans must be a string`);
  }
}

function assertLocalizedFields(value: Record<string, unknown>, fields: readonly string[], location: string) {
  for (const field of fields) {
    if (value[field] !== undefined) assertLocalizedText(value[field], `${location}.${field}`);
  }
}

function assertArrayEntries(value: unknown, location: string, assertion: (entry: unknown, location: string) => void) {
  assert.ok(Array.isArray(value), `${location} must be an array`);
  value.forEach((entry, index) => assertion(entry, `${location}[${index}]`));
}

function assertCoordinateGridDiagram(value: Record<string, unknown>, location: string) {
  assertAllowedFields(value, new Set(["kind", "xRange", "yRange", "points", "lines"]), location);
  if (value.points !== undefined) {
    assertArrayEntries(value.points, `${location}.points`, (entry, entryLocation) => {
      assertAllowedFields(entry, new Set(["label", "x", "y"]), entryLocation);
    });
  }
  if (value.lines !== undefined) {
    assertArrayEntries(value.lines, `${location}.lines`, (entry, entryLocation) => {
      const line = assertAllowedFields(entry, new Set(["label", "points"]), entryLocation);
      assertArrayEntries(line.points, `${entryLocation}.points`, (point, pointLocation) => {
        assertAllowedFields(point, new Set(["x", "y"]), pointLocation);
      });
    });
  }
}

function assertPlaneFigureDiagram(value: Record<string, unknown>, location: string) {
  assertAllowedFields(value, new Set(["kind", "points", "segments", "polygons", "circles", "angleMarks"]), location);
  assertArrayEntries(value.points, `${location}.points`, (entry, entryLocation) => {
    assertAllowedFields(entry, new Set(["id", "x", "y", "label"]), entryLocation);
  });
  const nestedCollections = [
    ["segments", new Set(["from", "to", "style", "tickMarks", "parallelMarks", "label"]), ["label"]],
    ["polygons", new Set(["vertexIds", "shaded"]), []],
    ["circles", new Set(["centerId", "radius", "showCenter", "radiusToId", "label"]), ["label"]],
    ["angleMarks", new Set(["vertexId", "fromId", "toId", "rightAngle", "arcs", "label"]), ["label"]]
  ] as const;
  for (const [field, allowedFields, localizedFields] of nestedCollections) {
    if (value[field] === undefined) continue;
    assertArrayEntries(value[field], `${location}.${field}`, (entry, entryLocation) => {
      const record = assertAllowedFields(entry, allowedFields, entryLocation);
      assertLocalizedFields(record, localizedFields, entryLocation);
    });
  }
}

function assertNumberLineDiagram(value: Record<string, unknown>, location: string) {
  assertAllowedFields(value, new Set(["kind", "range", "tickInterval", "points", "highlights"]), location);
  if (value.points !== undefined) {
    assertArrayEntries(value.points, `${location}.points`, (entry, entryLocation) => {
      assertAllowedFields(entry, new Set(["value", "label", "marker"]), entryLocation);
    });
  }
  if (value.highlights !== undefined) {
    assertArrayEntries(value.highlights, `${location}.highlights`, (entry, entryLocation) => {
      const highlight = assertAllowedFields(entry, new Set(["from", "to", "label"]), entryLocation);
      assertLocalizedFields(highlight, ["label"], entryLocation);
    });
  }
}

function assertSolidFigureDiagram(value: Record<string, unknown>, location: string) {
  assertAllowedFields(
    value,
    new Set(["kind", "shape", "width", "depth", "height", "radius", "size", "labels"]),
    location
  );
  if (value.labels !== undefined) {
    const labels = assertAllowedFields(
      value.labels,
      new Set(["width", "depth", "height", "radius"]),
      `${location}.labels`
    );
    assertLocalizedFields(labels, ["width", "depth", "height", "radius"], `${location}.labels`);
  }
}

function assertTenFrameDiagram(value: Record<string, unknown>, location: string) {
  assertAllowedFields(value, new Set(["kind", "groups", "layout", "frames"]), location);
  assertArrayEntries(value.groups, `${location}.groups`, (entry, entryLocation) => {
    const group = assertAllowedFields(entry, new Set(["count", "tone", "label"]), entryLocation);
    assertLocalizedFields(group, ["label"], entryLocation);
  });
}

function assertQuestionDiagram(value: unknown, location: string) {
  assertRecord(value, location);
  switch (value.kind) {
    case "coordinate-grid":
      assertCoordinateGridDiagram(value, location);
      break;
    case "plane-figure":
      assertPlaneFigureDiagram(value, location);
      break;
    case "number-line":
      assertNumberLineDiagram(value, location);
      break;
    case "solid-figure":
      assertSolidFigureDiagram(value, location);
      break;
    case "ten-frame":
      assertTenFrameDiagram(value, location);
      break;
    default:
      assert.fail(`${location}.kind is unsupported: ${String(value.kind)}`);
  }
}

function assertPublicQuestionSchema(value: unknown) {
  const question = assertAllowedFields(value, publicQuestionFields, "PublicQuestion");
  assertLocalizedText(question.topic, "PublicQuestion.topic");
  assertLocalizedText(question.prompt, "PublicQuestion.prompt");
  if (question.curriculumProfile !== undefined) {
    assertAllowedFields(
      question.curriculumProfile,
      new Set(["region", "publisher"]),
      "PublicQuestion.curriculumProfile"
    );
  }
  if (question.options !== undefined) {
    assertArrayEntries(question.options, "PublicQuestion.options", assertLocalizedText);
  }
  if (question.diagram !== undefined) {
    assertQuestionDiagram(question.diagram, "PublicQuestion.diagram");
  }
  if (question.questionAssets !== undefined) {
    assertArrayEntries(question.questionAssets, "PublicQuestion.questionAssets", (entry, location) => {
      const asset = assertAllowedFields(entry, new Set(["kind", "src", "alt", "caption"]), location);
      assertLocalizedText(asset.alt, `${location}.alt`);
      if (asset.caption !== undefined) assertLocalizedText(asset.caption, `${location}.caption`);
    });
  }
  assertNoAnswerLeak(question);
}

function assertNoAnswerLeak(value: unknown, location = "PublicQuestion", seen = new WeakSet<object>()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoAnswerLeak(entry, `${location}[${index}]`, seen));
    return;
  }

  for (const [field, nestedValue] of Object.entries(value)) {
    const normalizedField = field.toLowerCase().replace(/[_-]/gu, "");
    assert.equal(
      privateAnswerFields.has(normalizedField),
      false,
      `PublicQuestion leaked ${location}.${field}`
    );
    assertNoAnswerLeak(nestedValue, `${location}.${field}`, seen);
  }
}

test("the privacy assertion detects answer and bilingual explanation keys at any depth", () => {
  for (const field of ["answer", "explanation_en", "explanation_zh"]) {
    assert.throws(
      () => assertNoAnswerLeak({ nested: [{ privateMaterial: { [field]: "must stay private" } }] }),
      new RegExp(`PublicQuestion leaked .*${field}`, "u")
    );
  }
});

test("the positive PublicQuestion schema rejects an answer-like field nested in an option", () => {
  assert.throws(
    () => assertPublicQuestionSchema({
      id: "synthetic-public-question",
      curriculumTrack: "HK",
      grade: "P1",
      topicId: "synthetic-topic",
      topic: { en: "Synthetic topic", zh: "合成主題" },
      difficulty: "Low",
      type: "multiple-choice",
      prompt: { en: "Choose.", zh: "選擇。" },
      options: [{ en: "One", zh: "一", answerKey: true }]
    }),
    /PublicQuestion\.options\[0\] contains unsupported field answerKey/u
  );
});

test("seed-backed PublicQuestion payloads do not expose answer material before submission", async () => {
  const questions = await getPublicQuestionsFromStore({
    curriculumProfile: { region: "MAINLAND", publisher: "MAINLAND_BNU" },
    grade: "P1"
  });

  assert.ok(questions.length > 0);
  questions.forEach((question) => assertPublicQuestionSchema(question));
});

test("persisted PublicQuestion projection does not expose answer material before submission", () => {
  const publicQuestion = studentActivityToPublicQuestion(
    { visualization_sessions: [] },
    {
      id: "private-answer-question",
      curriculum_track: "HK",
      grade: "S1",
      topic_id: "private-answer-topic",
      difficulty: "Low",
      type: "fill-in",
      prompt_en: "Complete the answer.",
      prompt_zh: "完成答案。",
      options: null,
      answer: "secret-answer",
      accepted_answers: ["also-secret"],
      explanation_en: "Private explanation.",
      explanation_zh: "不應預先顯示的解釋。"
    }
  );

  assertPublicQuestionSchema(publicQuestion);
});
