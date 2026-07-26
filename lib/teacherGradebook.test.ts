import assert from "node:assert/strict";
import test from "node:test";

import { buildTeacherGradebook, gradebookToCsv, type BuildTeacherGradebookInput } from "./teacherGradebook";
import type { TeacherGradebookData } from "@/types";

function fixtureInput(): BuildTeacherGradebookInput {
  return {
    class: { id: "class-1", name: "3A", grade: "S3" },
    students: [
      { studentId: "s1", studentName: "Alice" },
      { studentId: "s2", studentName: "Bob" }
    ],
    assignments: [
      {
        id: "hw-1",
        title: { en: "HW1", zh: "作業一" },
        status: "closed",
        dueAt: "2026-06-01T00:00:00.000Z",
        countsTowardsGrade: true,
        createdAt: "2026-05-01T00:00:00.000Z",
        submissions: [
          { studentId: "s1", status: "graded", score: 80 },
          { studentId: "s2", status: "submitted", score: null }
        ]
      },
      {
        id: "hw-extra",
        title: { en: "HW-extra", zh: "附加作業" },
        status: "closed",
        dueAt: "2026-06-05T00:00:00.000Z",
        countsTowardsGrade: false,
        createdAt: "2026-05-02T00:00:00.000Z",
        submissions: [{ studentId: "s1", status: "graded", score: 40 }]
      }
    ],
    assessments: [
      {
        id: "quiz-1",
        title: { en: "Quiz1", zh: "測驗一" },
        type: "quiz",
        status: "closed",
        closesAt: "2026-06-10T00:00:00.000Z",
        weight: 1,
        createdAt: "2026-05-03T00:00:00.000Z",
        submissions: [
          { studentId: "s1", status: "graded", attemptNumber: 1, score: 12, maxScore: 20 },
          { studentId: "s1", status: "graded", attemptNumber: 2, score: 16, maxScore: 20 },
          { studentId: "s2", status: "graded", attemptNumber: 1, score: 10, maxScore: 20 }
        ]
      },
      {
        id: "asmt-practice",
        title: { en: "PracticeQuiz", zh: "練習測驗" },
        type: "quiz",
        status: "open",
        closesAt: null,
        weight: 0,
        createdAt: "2026-05-04T00:00:00.000Z",
        submissions: [{ studentId: "s2", status: "in-progress", attemptNumber: 1, score: null, maxScore: 20 }]
      }
    ],
    now: "2026-07-01T00:00:00.000Z"
  };
}

function cellFor(data: TeacherGradebookData, studentId: string, columnId: string) {
  const student = data.students.find((row) => row.studentId === studentId);
  assert.ok(student, `student ${studentId}`);
  const cell = student!.cells.find((candidate) => candidate.columnId === columnId);
  assert.ok(cell, `cell ${studentId}/${columnId}`);
  return cell!;
}

test("buildTeacherGradebook orders columns chronologically by due/close date", () => {
  const data = buildTeacherGradebook(fixtureInput());
  // asmt-practice (closesAt null → createdAt 05-04) comes before dated items.
  assert.deepEqual(data.columns.map((column) => column.id), ["asmt-practice", "hw-1", "hw-extra", "quiz-1"]);
});

test("buildTeacherGradebook normalizes assignment and assessment cells", () => {
  const data = buildTeacherGradebook(fixtureInput());

  // Assignment: score is already a 0–100 percentage.
  const aliceHw = cellFor(data, "s1", "hw-1");
  assert.equal(aliceHw.state, "graded");
  assert.equal(aliceHw.score, 80);
  assert.equal(aliceHw.maxScore, 100);
  assert.equal(aliceHw.percentage, 80);

  // Assignment with a submission but no score yet is pending, not missing.
  assert.equal(cellFor(data, "s2", "hw-1").state, "pending");

  // Assessment: best-scoring attempt (16/20 = 80%) wins over the earlier 12/20.
  const aliceQuiz = cellFor(data, "s1", "quiz-1");
  assert.equal(aliceQuiz.state, "graded");
  assert.equal(aliceQuiz.score, 16);
  assert.equal(aliceQuiz.maxScore, 20);
  assert.equal(aliceQuiz.percentage, 80);

  // No submission at all is missing.
  assert.equal(cellFor(data, "s1", "asmt-practice").state, "missing");
  // Started-but-ungraded assessment is pending.
  assert.equal(cellFor(data, "s2", "asmt-practice").state, "pending");
});

test("buildTeacherGradebook averages only grade-counting graded cells", () => {
  const data = buildTeacherGradebook(fixtureInput());

  const alice = data.students.find((row) => row.studentId === "s1")!;
  // hw-1 (80) and quiz-1 (80) count; hw-extra and asmt-practice do not.
  assert.equal(alice.average, 80);
  assert.equal(alice.gradedCount, 2);
  assert.equal(alice.totalCount, 2);

  const bob = data.students.find((row) => row.studentId === "s2")!;
  // Only quiz-1 (50%) is graded-and-counting; hw-1 is pending.
  assert.equal(bob.average, 50);
  assert.equal(bob.gradedCount, 1);
  assert.equal(bob.totalCount, 2);

  const columnById = new Map(data.columns.map((column) => [column.id, column]));
  assert.equal(columnById.get("hw-1")!.average, 80); // only Alice graded
  assert.equal(columnById.get("quiz-1")!.average, 65); // (80 + 50) / 2
  assert.equal(columnById.get("hw-extra")!.average, null); // not grade-counting
  assert.equal(columnById.get("asmt-practice")!.average, null); // weight 0

  assert.equal(data.classAverage, 65); // (80 + 50) / 2
});

test("gradebookToCsv renders escaped rows with raw scores and a class-average footer", () => {
  const data = buildTeacherGradebook(fixtureInput());
  assert.equal(
    gradebookToCsv(data),
    [
      '"Student","PracticeQuiz (/20)","HW1 (/100)","HW-extra (/100)","Quiz1 (/20)","Average %"',
      '"Alice","","80","40","16","80"',
      '"Bob","pending","pending","","10","50"',
      '"Class average %","","80","","65","65"'
    ].join("\n")
  );
});

test("buildTeacherGradebook uses the supplied timestamp and class", () => {
  const data = buildTeacherGradebook(fixtureInput());
  assert.equal(data.generatedAt, "2026-07-01T00:00:00.000Z");
  assert.deepEqual(data.class, { id: "class-1", name: "3A", grade: "S3" });
});
