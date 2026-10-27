import assert from "node:assert/strict";
import test from "node:test";
import { createStudentActivityPersistenceStore, type StudentActivityPersistenceDatabase } from "@/lib/server/userStore/studentActivityPersistence";

function fixture() {
  const database: StudentActivityPersistenceDatabase = {
    visualization_sessions: [],
    class_enrollments: [{ class_id: "class-1", student_id: "student-1" }],
    assessments: [{ id: "assessment-1", class_id: "class-1", status: "open", max_attempts: 3,
      paper_sections: [{ id: "section-1", title: { en: "Questions", zh: "問題", zhHans: "问题" }, order: 0, items: [{ id: "item-1", source: "manual", order: 0, points: 10,
        embeddedQuestion: { type: "manual", prompt: { en: "2 + 2", zh: "2 + 2", zhHans: "2 + 2" }, answer: "4" } }] }] }],
    assessment_submissions: [],
    assignments: [{ id: "assignment-1", class_id: "class-1", content_type: "practice", status: "active" }],
    submissions: [{ id: "submission-1", assignment_id: "assignment-1", student_id: "student-1", status: "not-started" }],
    assignment_submission_attempts: []
  };
  let pending: Promise<unknown> = Promise.resolve();
  let id = 0;
  const store = createStudentActivityPersistenceStore({
    now: () => new Date("2026-06-20T10:00:00Z"), createId: () => String(++id), readDatabase: async () => database,
    mutateDatabase: (mutator) => {
      const result = pending.then(() => mutator(database));
      pending = result.catch(() => undefined);
      return result;
    }
  });
  return { database, store };
}

test("ambiguous assessment retries cannot consume a second attempt or overwrite the accepted answer", async () => {
  const { database, store } = fixture();
  const input = { userId: "student-1", assessmentId: "assessment-1", expectedAttemptNumber: 0, answers: [{ questionId: "item-1", answer: "4" }] };
  const results = await Promise.all([store.submitStudentAssessment(input), store.submitStudentAssessment({ ...input, answers: [{ questionId: "item-1", answer: "0" }] })]);
  assert.deepEqual(results.map(result => result.status), ["submitted", "attempt-conflict"]);
  assert.equal(database.assessment_submissions?.[0]?.attempt_number, 1);
  assert.equal(database.assessment_submissions?.[0]?.score, 10);
  const retake = await store.submitStudentAssessment({ ...input, expectedAttemptNumber: 1 });
  assert.equal(retake.status, "submitted");
  assert.equal((await store.submitStudentAssessment(input)).status, "attempt-conflict");
  assert.equal(database.assessment_submissions?.[0]?.attempt_number, 2);
});

test("repeated assignment and correction requests preserve one durable attempt", async () => {
  const { database, store } = fixture();
  const input = { userId: "student-1", assignmentId: "assignment-1", expectedAttemptNumber: 0, kind: "initial" as const, answerText: "my original work" };
  const results = await Promise.all([store.submitAssignmentWork(input), store.submitAssignmentWork({ ...input, answerText: "duplicate" })]);
  assert.deepEqual(results.map(result => result.status), ["submitted", "attempt-conflict"]);
  assert.equal(database.assignment_submission_attempts?.length, 1);
  database.submissions![0].status = "correction-required";
  const correction = { ...input, expectedAttemptNumber: 1, kind: "correction" as const, answerText: "corrected work" };
  assert.equal((await store.submitAssignmentWork(correction)).status, "submitted");
  assert.equal((await store.submitAssignmentWork(correction)).status, "attempt-conflict");
  assert.equal(database.assignment_submission_attempts?.length, 2);
});

test("assignment counters remain monotonic when retained history contains gaps", async () => {
  const { database, store } = fixture();
  database.assignment_submission_attempts!.push({ id: "older-3", submission_id: "submission-1", student_id: "student-1", attempt_number: 3, kind: "initial", input_type: "text", answer_text: "old", ocr_result: null, submitted_at: "2026-06-19T10:00:00Z" });
  assert.equal((await store.submitAssignmentWork({ userId: "student-1", assignmentId: "assignment-1", expectedAttemptNumber: 3, kind: "initial", answerText: "new" })).status, "submitted");
  assert.equal(database.assignment_submission_attempts?.[1]?.attempt_number, 4);
});
