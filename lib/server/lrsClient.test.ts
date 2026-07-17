import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLrsStatementQuery,
  buildLearningAnalyticsStatement,
  emitLearningEventsToLrs,
  getLrsConfigStatus,
  lrsLearningVerbTaxonomy,
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

  assert.equal(statement.actor.account.name, statementIdForLearningEvent("student-1", "actor"));
  assert.equal(statement.verb.id, "http://adlnet.gov/expapi/verbs/answered");
  assert.equal(statement.result?.success, false);
  assert.equal(statement.result?.duration, "PT42S");
  assert.equal(statement.object.id, "https://mais.example/xapi/activities/practice/linear-equations/questions/q-1");
  assert.equal(statement.context.extensions["https://mais.example/xapi/extensions/curriculum-track"], "HK");
  assert.ok(!JSON.stringify(statement).includes("selectedAnswer"));
});

test("buildLearningAnalyticsStatement keeps xAPI verbs inside the learning taxonomy", () => {
  const eventTypes: LearningAnalyticsEvent["type"][] = [
    "mouse-click",
    "keyboard",
    "answer-correct",
    "answer-wrong",
    "hint-request",
    "visualization-slider",
    "visualization-drag",
    "visualization-probe",
    "visualization-simulate",
    "visualization-reset",
    "visualization-complete",
    "page-view",
    "mistake-review"
  ];
  const allowedVerbIds = new Set<string>(Object.values(lrsLearningVerbTaxonomy).map((verb) => verb.id));

  for (const type of eventTypes) {
    const statement = buildLearningAnalyticsStatement({
      config: { activityBaseIri: "https://mais.example/xapi" },
      event: { ...event, id: `${event.id}-${type}`, type },
      actor: { userId: "student-1", curriculumTrack: "HK" }
    });

    assert.equal(allowedVerbIds.has(statement.verb.id), true, `${type} must use an approved learning verb`);
  }
});

test("buildLearningAnalyticsStatement emits privacy-safe evidence and curriculum context activities", () => {
  const statement = buildLearningAnalyticsStatement({
    config: { activityBaseIri: "https://mais.example/xapi" },
    event: {
      ...event,
      classId: "class-s3a",
      assignmentId: "assignment-linear-1",
      competencyId: "linear-equation-solving"
    },
    actor: { userId: "student@example.com", curriculumTrack: "HK" }
  });
  const serialized = JSON.stringify(statement);

  assert.notEqual(statement.actor.account.name, "student@example.com");
  assert.ok(!serialized.includes("student@example.com"));
  assert.equal(statement.context.extensions["https://mais.example/xapi/extensions/evidence-strength"], "strong");
  assert.equal(statement.context.extensions["https://mais.example/xapi/extensions/privacy-tier"], "learner-analytics-minimal");
  assert.deepEqual(
    statement.context.contextActivities.parent.map((activity) => activity.id),
    [
      "https://mais.example/xapi/classes/class-s3a",
      "https://mais.example/xapi/assignments/assignment-linear-1"
    ]
  );
  assert.deepEqual(
    statement.context.contextActivities.grouping.map((activity) => activity.id),
    [
      "https://mais.example/xapi/curricula/hk",
      "https://mais.example/xapi/grades/s3",
      "https://mais.example/xapi/topics/linear-equations",
      "https://mais.example/xapi/competencies/linear-equation-solving"
    ]
  );
});

test("buildLrsStatementQuery rejects untargeted all-statement scans", () => {
  assert.throws(
    () =>
      buildLrsStatementQuery({
        config: { activityBaseIri: "https://mais.example/xapi" },
        requester: { role: "teacher", userId: "teacher-1", ownedClassIds: ["class-s3a"] },
        since: "2026-06-01T00:00:00.000Z",
        until: "2026-06-27T00:00:00.000Z"
      }),
    /targeted/i
  );
});

test("buildLrsStatementQuery rejects invalid time windows with a policy error", () => {
  assert.throws(
    () =>
      buildLrsStatementQuery({
        config: { activityBaseIri: "https://mais.example/xapi" },
        requester: { role: "student", userId: "student-1" },
        learnerId: "student-1",
        verb: "answered",
        since: "not-a-date",
        until: "2026-06-27T00:00:00.000Z"
      }),
    /timestamp/i
  );
});

test("buildLrsStatementQuery scopes learner, educator, and admin requests", () => {
  const learnerQuery = buildLrsStatementQuery({
    config: { activityBaseIri: "https://mais.example/xapi" },
    requester: { role: "student", userId: "student-1" },
    learnerId: "student-1",
    verb: "answered",
    since: "2026-06-01T00:00:00.000Z",
    until: "2026-06-27T00:00:00.000Z"
  });

  assert.equal(learnerQuery.params.agent?.account.name, statementIdForLearningEvent("student-1", "actor"));
  assert.equal(learnerQuery.params.verb, lrsLearningVerbTaxonomy.answered.id);

  const educatorQuery = buildLrsStatementQuery({
    config: { activityBaseIri: "https://mais.example/xapi" },
    requester: { role: "teacher", userId: "teacher-1", ownedClassIds: ["class-s3a"] },
    classId: "class-s3a",
    activityId: "practice/linear-equations",
    verb: "answered",
    since: "2026-06-01T00:00:00.000Z",
    until: "2026-06-27T00:00:00.000Z"
  });

  assert.equal(educatorQuery.params.activity, "https://mais.example/xapi/classes/class-s3a");
  assert.equal(educatorQuery.params.related_activities, true);
  assert.equal(educatorQuery.postFilters?.activity, "https://mais.example/xapi/activities/practice/linear-equations");
  assert.deepEqual(educatorQuery.audit, undefined);

  assert.throws(
    () =>
      buildLrsStatementQuery({
        config: { activityBaseIri: "https://mais.example/xapi" },
        requester: { role: "teacher", userId: "teacher-1", ownedClassIds: ["class-s3a"] },
        classId: "class-other",
        verb: "answered",
        since: "2026-06-01T00:00:00.000Z",
        until: "2026-06-27T00:00:00.000Z"
      }),
    /owned class/i
  );

  assert.throws(
    () =>
      buildLrsStatementQuery({
        config: { activityBaseIri: "https://mais.example/xapi" },
        requester: { role: "admin", userId: "admin-1" },
        learnerId: "student-1",
        verb: "answered",
        since: "2026-06-01T00:00:00.000Z",
        until: "2026-06-27T00:00:00.000Z"
      }),
    /audit reason/i
  );

  const adminQuery = buildLrsStatementQuery({
    config: { activityBaseIri: "https://mais.example/xapi" },
    requester: { role: "admin", userId: "admin-1" },
    learnerId: "student-1",
    verb: "answered",
    since: "2026-06-01T00:00:00.000Z",
    until: "2026-06-27T00:00:00.000Z",
    auditReason: "support-ticket-123"
  });

  assert.equal(adminQuery.audit?.reason, "support-ticket-123");
});

test("emitLearningEventsToLrs retries transient failures and returns an outbox item", async () => {
  let calls = 0;
  const result = await emitLearningEventsToLrs({
    userId: "student-1",
    curriculumTrack: "HK",
    events: [event],
    env: {
      LRS_ENABLED: "true",
      LRS_ENDPOINT: "https://lrs.example/xapi",
      LRS_USERNAME: "user",
      LRS_PASSWORD: "pass",
      LRS_DELIVERY_MAX_ATTEMPTS: "2"
    },
    fetcher: async () => {
      calls += 1;
      return new Response("temporary", { status: 503 });
    }
  });

  assert.equal(calls, 2);
  assert.equal(result.status, "queued");
  assert.equal(result.attempted, 1);
  assert.equal(result.accepted, 0);
  assert.equal(result.outbox.length, 1);
  assert.equal(result.outbox[0].statementId, statementIdForLearningEvent("student-1", event.id));
  assert.equal(result.outbox[0].attempts, 2);
});
