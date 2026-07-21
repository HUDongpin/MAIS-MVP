import assert from "node:assert/strict";
import test from "node:test";
import {
  buildClassroomLiveRoster,
  type ClassroomLiveRosterEventInput,
  type ClassroomLiveRosterStudentInput
} from "./classroomLiveRoster";
import type { LearningAnalyticsEvent } from "@/types";

const now = new Date("2026-05-07T12:00:00.000Z");

function at(secondsAgo: number) {
  return new Date(now.getTime() - secondsAgo * 1000).toISOString();
}

function event(
  studentId: string,
  overrides: Partial<ClassroomLiveRosterEventInput> & { type: LearningAnalyticsEvent["type"] }
): ClassroomLiveRosterEventInput {
  return {
    studentId,
    type: overrides.type,
    source: overrides.source ?? "practice",
    topicId: overrides.topicId ?? "quadratic-patterns",
    questionId: overrides.questionId,
    durationSeconds: overrides.durationSeconds,
    timestamp: overrides.timestamp ?? at(10)
  };
}

const roster = (students: ClassroomLiveRosterStudentInput[], events: ClassroomLiveRosterEventInput[]) =>
  buildClassroomLiveRoster({ classId: "class-1", className: "Class 1", students, events, now });

function entryFor(students: ClassroomLiveRosterStudentInput[], events: ClassroomLiveRosterEventInput[], id: string) {
  const result = roster(students, events);
  const entry = result.students.find((student) => student.studentId === id);
  assert.ok(entry, `expected roster entry for ${id}`);
  return entry;
}

test("two consecutive wrong answers mark a student as stuck and needing attention", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Maya" }],
    [
      event("s1", { type: "answer-correct", timestamp: at(120) }),
      event("s1", { type: "answer-wrong", timestamp: at(60) }),
      event("s1", { type: "answer-wrong", questionId: "q3", timestamp: at(20) })
    ],
    "s1"
  );

  assert.equal(entry.state, "stuck");
  assert.equal(entry.needsAttention, true);
  assert.equal(entry.reason, "repeated-wrong");
  assert.equal(entry.consecutiveWrong, 2);
  assert.equal(entry.lastQuestionId, "q3");
  assert.equal(entry.lastAnswerCorrect, false);
});

test("repeated hint requests count as stuck even without wrong answers", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Ana" }],
    [
      event("s1", { type: "hint-request", timestamp: at(50) }),
      event("s1", { type: "hint-request", timestamp: at(20) })
    ],
    "s1"
  );

  assert.equal(entry.state, "stuck");
  assert.equal(entry.reason, "many-hints");
  assert.equal(entry.hintCount, 2);
});

test("recent activity without struggle is working", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Ben" }],
    [
      event("s1", { type: "answer-wrong", timestamp: at(90) }),
      event("s1", { type: "answer-correct", timestamp: at(15) })
    ],
    "s1"
  );

  assert.equal(entry.state, "working");
  assert.equal(entry.needsAttention, false);
  assert.equal(entry.correctCount, 1);
  assert.equal(entry.wrongCount, 1);
});

test("silence past the idle threshold flags an idle student", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Cal" }],
    [event("s1", { type: "answer-correct", timestamp: at(300) })],
    "s1"
  );

  assert.equal(entry.state, "idle");
  assert.equal(entry.reason, "idle");
  assert.equal(entry.secondsSinceActive, 300);
});

test("an idle student whose last answer was wrong is flagged as wrong-answer", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Dee" }],
    [event("s1", { type: "answer-wrong", timestamp: at(300) })],
    "s1"
  );

  assert.equal(entry.state, "idle");
  assert.equal(entry.reason, "wrong-answer");
});

test("a completed visualization reads as done", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Eli" }],
    [event("s1", { type: "visualization-complete", source: "visualization-lab", timestamp: at(10) })],
    "s1"
  );

  assert.equal(entry.state, "done");
});

test("a silent student with a strong correct streak reads as done", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Fay" }],
    [
      event("s1", { type: "answer-correct", timestamp: at(360) }),
      event("s1", { type: "answer-correct", timestamp: at(340) }),
      event("s1", { type: "answer-correct", timestamp: at(320) })
    ],
    "s1"
  );

  assert.equal(entry.state, "done");
});

test("a student with no events at all is offline / not-started", () => {
  const entry = entryFor([{ studentId: "s1", studentName: "Gus" }], [], "s1");

  assert.equal(entry.state, "offline");
  assert.equal(entry.reason, "not-started");
  assert.equal(entry.secondsSinceActive, null);
  assert.equal(entry.lastActiveAt, null);
});

test("a student active only before the window is offline / inactive", () => {
  const entry = entryFor(
    [{ studentId: "s1", studentName: "Hana" }],
    [event("s1", { type: "answer-correct", timestamp: at(45 * 60) })],
    "s1"
  );

  assert.equal(entry.state, "offline");
  assert.equal(entry.reason, "inactive");
  assert.equal(entry.secondsSinceActive, 45 * 60);
});

test("roster counts and needs-first ordering", () => {
  const students: ClassroomLiveRosterStudentInput[] = [
    { studentId: "done", studentName: "Zoe" },
    { studentId: "working", studentName: "Wes" },
    { studentId: "idle", studentName: "Ivy" },
    { studentId: "stuck", studentName: "Sam" },
    { studentId: "offline", studentName: "Ola" }
  ];
  const events: ClassroomLiveRosterEventInput[] = [
    event("stuck", { type: "answer-wrong", timestamp: at(60) }),
    event("stuck", { type: "answer-wrong", timestamp: at(20) }),
    event("working", { type: "answer-correct", timestamp: at(10) }),
    event("idle", { type: "answer-correct", timestamp: at(300) }),
    event("done", { type: "visualization-complete", timestamp: at(30) })
    // "offline" student emits nothing.
  ];

  const result = roster(students, events);

  assert.deepEqual(result.counts, { total: 5, stuck: 1, idle: 1, working: 1, done: 1, offline: 1 });
  assert.deepEqual(
    result.students.map((student) => student.studentId),
    ["stuck", "idle", "offline", "working", "done"]
  );
});

test("events for students outside the class list are ignored", () => {
  const result = roster(
    [{ studentId: "s1", studentName: "Kai" }],
    [event("ghost", { type: "answer-wrong", timestamp: at(10) })]
  );

  assert.equal(result.counts.total, 1);
  assert.equal(result.students[0].state, "offline");
});
