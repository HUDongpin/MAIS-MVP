import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLearningAnalyticsStatement,
  getLrsConfigStatus,
  readLrsConfig,
  statementIdForLearningEvent
} from "./lrsClient";
import type { LearningAnalyticsEvent } from "@/types";

const event: LearningAnalyticsEvent = {
  id: "2026-06-19T00:00:00.000Z-smoke",
  type: "answer-wrong",
  source: "practice",
  timestamp: "2026-06-19T00:00:00.000Z",
  grade: "S3",
  topicId: "linear-equations",
  questionId: "q-1",
  durationSeconds: 42
};

test("readLrsConfig stays disabled when no endpoint or credentials are configured", () => {
  const config = readLrsConfig({});

  assert.equal(config.enabled, false);
  assert.equal(getLrsConfigStatus({}).status, "disabled");
});

test("getLrsConfigStatus reports missing fields when LRS is explicitly enabled", () => {
  const status = getLrsConfigStatus({ LRS_ENABLED: "true", LRS_ENDPOINT: "https://lrs.example/xapi" });

  assert.equal(status.status, "missing-config");
  assert.deepEqual(status.missing, ["LRS_USERNAME", "LRS_PASSWORD"]);
});

test("statementIdForLearningEvent derives deterministic xAPI UUIDs", () => {
  const first = statementIdForLearningEvent("student-1", event.id);
  const second = statementIdForLearningEvent("student-1", event.id);

  assert.equal(first, second);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("buildLearningAnalyticsStatement maps answer events without selected answers", () => {
  const statement = buildLearningAnalyticsStatement({
    config: { activityBaseIri: "https://mais.example/xapi" },
    event,
    actor: { userId: "student-1", curriculumTrack: "HK" }
  });

  assert.equal(statement.actor.account.name, "student-1");
  assert.equal(statement.verb.id, "http://adlnet.gov/expapi/verbs/answered");
  assert.equal(statement.result?.success, false);
  assert.equal(statement.result?.duration, "PT42S");
  assert.equal(statement.object.id, "https://mais.example/xapi/activities/practice/linear-equations/questions/q-1");
  assert.equal(statement.context.extensions["https://mais.example/xapi/extensions/curriculum-track"], "HK");
  assert.ok(!JSON.stringify(statement).includes("selectedAnswer"));
});
