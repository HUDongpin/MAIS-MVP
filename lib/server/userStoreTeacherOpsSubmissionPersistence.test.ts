import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { MAX_ANSWER_LENGTH } from "@/lib/answerLimits";
import {
  createTeacherOpsSubmissionPersistenceStore,
  teacherOpsDeterministicAssignmentGradingRun,
  type TeacherOpsSubmissionPersistenceDatabase
} from "@/lib/server/userStore/teacherOpsSubmissionPersistence";
import type { AssignmentGradingRun, LocalizedText, Submission } from "@/types";

const fixedNow = "2026-06-21T08:00:00.000Z";

function createDatabase(): TeacherOpsSubmissionPersistenceDatabase {
  return {
    assignment_grading_runs: [
      {
        id: "grading-run-seed",
        submission_id: "submission-owned-1",
        attempt_id: "attempt-owned-latest",
        status: "suggested",
        provider: "manual",
        model: "seed-grader",
        suggested_score: 72,
        confidence: 0.8,
        feedback_en: "Review seed feedback.",
        feedback_zh: "複核建議。",
        correction_request_en: "Revise seed working.",
        correction_request_zh: "修正建議。",
        created_at: "2026-06-20T12:30:00.000Z"
      }
    ],
    assignment_submission_attempts: [
      {
        id: "attempt-owned-initial",
        submission_id: "submission-owned-1",
        student_id: "student-1",
        attempt_number: 1,
        kind: "initial",
        input_type: "text",
        answer_text: "40",
        ocr_result: null,
        submitted_at: "2026-06-20T10:05:00.000Z"
      },
      {
        id: "attempt-owned-latest",
        submission_id: "submission-owned-1",
        student_id: "student-1",
        attempt_number: 2,
        kind: "correction",
        input_type: "text",
        answer_text: "42",
        ocr_result: null,
        submitted_at: "2026-06-20T10:25:00.000Z"
      }
    ],
    assignment_teacher_reviews: [],
    assignments: [
      {
        id: "assignment-owned",
        class_id: "class-owned"
      },
      {
        id: "assignment-shared",
        class_id: "class-shared"
      },
      {
        id: "assignment-other",
        class_id: "class-other"
      }
    ],
    submissions: [
      {
        id: "submission-owned-1",
        assignment_id: "assignment-owned",
        student_id: "student-1",
        status: "submitted",
        score: null,
        submitted_at: "2026-06-20T10:00:00.000Z",
        graded_at: null,
        updated_at: "2026-06-20T10:00:00.000Z"
      },
      {
        id: "submission-shared",
        assignment_id: "assignment-shared",
        student_id: "student-2",
        status: "graded",
        score: 88,
        submitted_at: "2026-06-20T11:00:00.000Z",
        graded_at: "2026-06-20T12:00:00.000Z",
        updated_at: "2026-06-20T12:00:00.000Z"
      },
      {
        id: "submission-owned-2",
        assignment_id: "assignment-owned",
        student_id: "student-3",
        status: "in-progress",
        score: null,
        submitted_at: null,
        graded_at: null,
        updated_at: "2026-06-19T10:00:00.000Z"
      }
    ],
    school_memberships: [],
    teacher_classes: [
      {
        id: "class-owned",
        teacher_id: "teacher-1"
      },
      {
        id: "class-shared",
        teacher_id: "teacher-2"
      },
      {
        id: "class-other",
        teacher_id: "teacher-2"
      }
    ],
    users: [
      { id: "teacher-1", role: "teacher" },
      { id: "teacher-2", role: "teacher" },
      { id: "admin-1", role: "admin" },
      { id: "student-1", role: "student" }
    ]
  };
}

function createTestStore(
  database: TeacherOpsSubmissionPersistenceDatabase,
  options: Partial<Parameters<typeof createTeacherOpsSubmissionPersistenceStore>[0]> = {}
) {
  let idCounter = 0;

  return createTeacherOpsSubmissionPersistenceStore({
    readDatabase: async () => database,
    mutateDatabase: async (mutator) => mutator(database),
    createId: () => `generated-${++idCounter}`,
    now: () => new Date(fixedNow),
    createGradingRunRecord: async (_database, submission, _assignment, attempt, now) => ({
      id: "grading-run-generated",
      submission_id: submission.id,
      attempt_id: attempt?.id ?? null,
      status: "suggested",
      provider: "manual",
      model: "test-grader",
      suggested_score: 91,
      confidence: 0.93,
      feedback_en: "Strong work.",
      feedback_zh: "表現良好。",
      correction_request_en: "",
      correction_request_zh: "",
      created_at: now
    }),
    toGradingRun: (_database, run) => ({
      id: run.id,
      submissionId: run.submission_id,
      attemptId: run.attempt_id,
      status: run.status,
      provider: run.provider,
      model: run.model,
      suggestedScore: run.suggested_score,
      confidence: run.confidence,
      feedback: run.feedback_en || run.feedback_zh
        ? { en: run.feedback_en ?? "", zh: run.feedback_zh ?? run.feedback_en ?? "" }
        : null,
      correctionRequest: run.correction_request_en || run.correction_request_zh
        ? { en: run.correction_request_en ?? "", zh: run.correction_request_zh ?? run.correction_request_en ?? "" }
        : null,
      errorCode: run.error_code,
      usage: run.usage,
      createdAt: run.created_at
    }) satisfies AssignmentGradingRun,
    toSubmission: (_database, submission) => ({
      id: submission.id,
      assignmentId: submission.assignment_id,
      studentId: submission.student_id,
      studentName: submission.student_id,
      status: submission.status,
      score: submission.score,
      submittedAt: submission.submitted_at,
      gradedAt: submission.graded_at,
      feedback: null,
      correctionRequest: null,
      correctionDueAt: null,
      correctionRound: 0,
      maxCorrectionRounds: 2,
      resolvedAt: null,
      attempts: [],
      latestAttempt: null,
      latestGradingRun: null,
      latestTeacherReview: null,
      updatedAt: submission.updated_at
    }) satisfies Submission,
    ...options
  });
}

test("teacher ops submission persistence lists submissions for owned assignments without legacy userStore imports", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsSubmissionPersistence.ts"), "utf8");
  assert.doesNotMatch(source, /from ["']\.\.\/userStore["']/);
  assert.doesNotMatch(source, /from ["']@\/lib\/server\/userStore["']/);

  const submissions = await createTestStore(createDatabase()).getTeacherAssignmentSubmissions("teacher-1", "assignment-owned");

  assert.deepEqual(submissions?.map((submission) => submission.id), ["submission-owned-1", "submission-owned-2"]);
  assert.deepEqual(submissions?.map((submission) => submission.assignmentId), ["assignment-owned", "assignment-owned"]);
});

test("teacher ops submission persistence keeps legacy assignment access scoped to admins and class owners", async () => {
  const store = createTestStore(createDatabase());

  assert.equal(await store.getTeacherAssignmentSubmissions("teacher-1", "assignment-shared"), null);
  assert.deepEqual((await store.getTeacherAssignmentSubmissions("admin-1", "assignment-shared"))?.map((submission) => submission.id), [
    "submission-shared"
  ]);
  assert.equal(await store.getTeacherAssignmentSubmissions("student-1", "assignment-owned"), null);
  assert.equal(await store.getTeacherAssignmentSubmissions("teacher-1", "missing-assignment"), null);
});

test("teacher ops submission persistence creates grading runs through the extracted mutation boundary", async () => {
  const database = createDatabase();
  const seenContexts: string[] = [];
  const store = createTestStore(database, {
    createGradingRunRecord: async (_database, submission, assignment, attempt, now) => {
      seenContexts.push(`${submission.id}:${assignment.id}:${attempt?.id}:${now}`);
      return {
        id: "grading-run-from-boundary-test",
        submission_id: submission.id,
        attempt_id: attempt?.id ?? null,
        status: "suggested",
        provider: "manual",
        model: "boundary-test-grader",
        suggested_score: 94,
        confidence: 0.91,
        feedback_en: "Boundary feedback.",
        feedback_zh: "邊界回饋。",
        correction_request_en: "",
        correction_request_zh: "",
        created_at: now
      };
    }
  });

  const result = await store.createTeacherSubmissionGradingRun({
    teacherId: "teacher-1",
    submissionId: "submission-owned-1"
  });

  assert.equal(result.status, "created");
  if (result.status !== "created") throw new Error("Expected grading run creation to succeed.");
  assert.deepEqual(seenContexts, [
    "submission-owned-1:assignment-owned:attempt-owned-latest:2026-06-21T08:00:00.000Z"
  ]);
  assert.equal(database.assignment_grading_runs.at(-1)?.id, "grading-run-from-boundary-test");
  assert.equal(database.submissions.find((submission) => submission.id === "submission-owned-1")?.updated_at, fixedNow);
  assert.equal(result.gradingRun.id, "grading-run-from-boundary-test");
  assert.equal(result.gradingRun.suggestedScore, 94);
  assert.equal(result.submission.id, "submission-owned-1");

  assert.deepEqual(
    await store.createTeacherSubmissionGradingRun({ teacherId: "teacher-1", submissionId: "submission-shared" }),
    { status: "not-found" }
  );
  assert.deepEqual(
    await store.createTeacherSubmissionGradingRun({ teacherId: "student-1", submissionId: "submission-owned-1" }),
    { status: "forbidden" }
  );
});

test("teacher ops submission persistence owns visible attempt text helper for grading", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsSubmissionPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsSubmissionPersistence") as Record<string, unknown>;
  const teacherOpsVisibleAttemptText = helpers.teacherOpsVisibleAttemptText as (attempt: {
    answer_text: string;
    ocr_result: { text?: string } | null;
  } | null) => string;

  assert.equal(typeof teacherOpsVisibleAttemptText, "function");
  assert.match(persistenceSource, /export function teacherOpsVisibleAttemptText\b/);
  assert.doesNotMatch(rootSource, /function visibleAttemptText\b/);
  assert.equal(teacherOpsVisibleAttemptText(null), "");
  assert.equal(teacherOpsVisibleAttemptText({ answer_text: "typed answer", ocr_result: null }), "typed answer");
  assert.equal(teacherOpsVisibleAttemptText({
    answer_text: "typed answer",
    ocr_result: { text: "ocr answer" }
  }), "ocr answer");
  assert.equal(teacherOpsVisibleAttemptText({
    answer_text: "typed answer",
    ocr_result: { text: "" }
  }), "typed answer");
});

test("teacher ops submission persistence owns assignment grading JSON parser", async () => {
  type AssignmentGradingJsonParseResult = {
    suggestedScore: number | null;
    confidence: number | null;
    feedbackEn: string;
    feedbackZh: string;
    correctionRequestEn: string;
    correctionRequestZh: string;
  };
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsSubmissionPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsSubmissionPersistence") as Record<string, unknown>;
  const teacherOpsParseAssignmentGradingJson = helpers.teacherOpsParseAssignmentGradingJson as (
    reply: string
  ) => AssignmentGradingJsonParseResult | null;
  const longFeedbackEn = "Strong evidence. ".repeat(320);
  const longCorrectionZh = "請補充步驟。".repeat(900);

  assert.equal(typeof teacherOpsParseAssignmentGradingJson, "function");
  assert.match(persistenceSource, /export function teacherOpsParseAssignmentGradingJson\b/);
  assert.doesNotMatch(rootSource, /function parseAssignmentGradingJson\b/);

  const parsed = teacherOpsParseAssignmentGradingJson(`
    Teacher note before JSON.
    \`\`\`json
    {
      "suggestedScore": 105.7,
      "confidence": 82,
      "feedback": {
        "en": ${JSON.stringify(longFeedbackEn)},
        "zh": "推理清楚。"
      },
      "correctionRequest": {
        "en": "Show the final unit conversion.",
        "zh": ${JSON.stringify(longCorrectionZh)}
      }
    }
    \`\`\`
  `);
  assert.ok(parsed);
  assert.equal(parsed.suggestedScore, 100);
  assert.equal(parsed.confidence, 0.82);
  assert.equal(parsed.feedbackEn, longFeedbackEn.slice(0, 4000));
  assert.equal(parsed.feedbackZh, "推理清楚。");
  assert.equal(parsed.correctionRequestEn, "Show the final unit conversion.");
  assert.equal(parsed.correctionRequestZh, longCorrectionZh.slice(0, 4000));

  assert.deepEqual(
    teacherOpsParseAssignmentGradingJson(JSON.stringify({
      suggestedScore: -6.2,
      confidence: -0.4,
      feedback: {},
      correctionRequest: {}
    })),
    {
      suggestedScore: 0,
      confidence: 0,
      feedbackEn: "",
      feedbackZh: "",
      correctionRequestEn: "",
      correctionRequestZh: ""
    }
  );
  assert.equal(teacherOpsParseAssignmentGradingJson("not json"), null);
});

test("teacher ops submission persistence owns deterministic assignment grading fallback", async () => {
  const persistenceSource = await readFile(
    path.join(process.cwd(), "lib/server/userStore/teacherOpsSubmissionPersistence.ts"),
    "utf8"
  );
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helpers = await import("@/lib/server/userStore/teacherOpsSubmissionPersistence") as Record<string, unknown>;
  const teacherOpsDeterministicAssignmentGradingRun = helpers.teacherOpsDeterministicAssignmentGradingRun as (input: {
    database: TeacherOpsSubmissionPersistenceDatabase & {
      questions: Array<{
        id: string;
        answer: string;
        accepted_answers: string[] | null;
        options: LocalizedText[] | null;
      }>;
    };
    submission: TeacherOpsSubmissionPersistenceDatabase["submissions"][number];
    assignment: TeacherOpsSubmissionPersistenceDatabase["assignments"][number] & { target_id: string | null };
    attempt: TeacherOpsSubmissionPersistenceDatabase["assignment_submission_attempts"][number] | null;
    now: string;
    createId: () => string;
    questionAnswerMatches: (
      question: { answer: string; accepted_answers?: string[] | null; options?: LocalizedText[] | null },
      selectedAnswer: string
    ) => boolean;
  }) => TeacherOpsSubmissionPersistenceDatabase["assignment_grading_runs"][number];
  const database = {
    ...createDatabase(),
    questions: [
      {
        id: "question-linked",
        answer: "42",
        accepted_answers: null,
        options: null
      }
    ]
  };
  const submission = database.submissions[0];
  const attempt = database.assignment_submission_attempts.find((candidate) => candidate.id === "attempt-owned-latest") ?? null;
  const assignment = { ...database.assignments[0], target_id: "question-linked" };

  assert.equal(typeof teacherOpsDeterministicAssignmentGradingRun, "function");
  assert.match(persistenceSource, /export function teacherOpsDeterministicAssignmentGradingRun\b/);
  assert.doesNotMatch(rootSource, /function deterministicAssignmentGradingRun\b/);

  const correct = teacherOpsDeterministicAssignmentGradingRun({
    database,
    submission,
    assignment,
    attempt,
    now: fixedNow,
    createId: () => "correct-id",
    questionAnswerMatches: (question, selectedAnswer) => question.answer === selectedAnswer.trim()
  });
  assert.equal(correct.id, "grading-run-correct-id");
  assert.equal(correct.submission_id, "submission-owned-1");
  assert.equal(correct.attempt_id, "attempt-owned-latest");
  assert.equal(correct.status, "suggested");
  assert.equal(correct.model, "deterministic-answer-key");
  assert.equal(correct.suggested_score, 100);
  assert.equal(correct.confidence, 0.82);

  const incorrect = teacherOpsDeterministicAssignmentGradingRun({
    database,
    submission,
    assignment,
    attempt: attempt ? { ...attempt, answer_text: "41", ocr_result: null } : null,
    now: fixedNow,
    createId: () => "incorrect-id",
    questionAnswerMatches: (question, selectedAnswer) => question.answer === selectedAnswer.trim()
  });
  assert.equal(incorrect.id, "grading-run-incorrect-id");
  assert.equal(incorrect.suggested_score, 0);
  assert.equal(incorrect.correction_request_en, "Revise the working and explain the corrected method.");

  const needsReview = teacherOpsDeterministicAssignmentGradingRun({
    database,
    submission,
    assignment,
    attempt: null,
    now: fixedNow,
    createId: () => "review-id",
    questionAnswerMatches: () => true
  });
  assert.equal(needsReview.id, "grading-run-review-id");
  assert.equal(needsReview.status, "needs-review");
  assert.equal(needsReview.model, "teacher-review-required");
  assert.equal(needsReview.suggested_score, null);
  assert.equal(needsReview.feedback_en, "No readable answer text was captured. Teacher review is required.");
});

test("teacher deterministic grading keeps an exactly 500-character typed answer on the matcher path", () => {
  const database = {
    ...createDatabase(),
    questions: [{ id: "question-linked", answer: "accepted", accepted_answers: null, options: null }]
  };
  const submission = database.submissions[0];
  const assignment = { ...database.assignments[0], target_id: "question-linked" };
  const selectedAnswers: string[] = [];
  const answerText = "x".repeat(MAX_ANSWER_LENGTH);

  const run = teacherOpsDeterministicAssignmentGradingRun({
    database,
    submission,
    assignment,
    attempt: {
      ...database.assignment_submission_attempts[1],
      answer_text: answerText,
      ocr_result: null
    },
    now: fixedNow,
    createId: () => "typed-500",
    questionAnswerMatches: (_question, selectedAnswer) => {
      selectedAnswers.push(selectedAnswer);
      return true;
    }
  });

  assert.deepEqual(selectedAnswers, [answerText]);
  assert.equal(run.status, "suggested");
  assert.equal(run.model, "deterministic-answer-key");
  assert.equal(run.suggested_score, 100);
});

test("teacher deterministic grading routes a 501-character typed answer to review without calling the matcher", () => {
  const database = {
    ...createDatabase(),
    questions: [{ id: "question-linked", answer: "accepted", accepted_answers: null, options: null }]
  };
  const submission = database.submissions[0];
  const assignment = { ...database.assignments[0], target_id: "question-linked" };
  let matcherCalls = 0;

  const run = teacherOpsDeterministicAssignmentGradingRun({
    database,
    submission,
    assignment,
    attempt: {
      ...database.assignment_submission_attempts[1],
      answer_text: "x".repeat(MAX_ANSWER_LENGTH + 1),
      ocr_result: null
    },
    now: fixedNow,
    createId: () => "typed-501",
    questionAnswerMatches: () => {
      matcherCalls += 1;
      return false;
    }
  });

  assert.deepEqual(
    { matcherCalls, status: run.status, suggestedScore: run.suggested_score },
    { matcherCalls: 0, status: "needs-review", suggestedScore: null }
  );
  assert.equal(run.model, "teacher-review-required");
  assert.equal(run.confidence, null);
  assert.equal(
    run.feedback_en,
    "Long-form submission captured. Deterministic short-answer grading was skipped; teacher review is required."
  );
  assert.equal(run.feedback_zh, "已記錄長篇作答。已略過確定性短答案評分，需教師人工審核。");
  assert.notEqual(run.feedback_en, "No readable answer text was captured. Teacher review is required.");
});

test("teacher deterministic grading keeps 12k OCR working review-only and acceptance cannot inherit zero", async () => {
  const database = {
    ...createDatabase(),
    questions: [{ id: "question-linked", answer: "accepted", accepted_answers: null, options: null }]
  };
  const submission = database.submissions[0];
  submission.score = 0;
  const assignment = { ...database.assignments[0], target_id: "question-linked" };
  const ocrText = "ocr-working ".repeat(1000);
  let matcherCalls = 0;
  assert.equal(ocrText.length, 12000);

  const run = teacherOpsDeterministicAssignmentGradingRun({
    database,
    submission,
    assignment,
    attempt: {
      ...database.assignment_submission_attempts[1],
      input_type: "image",
      answer_text: "typed fallback",
      ocr_result: {
        text: ocrText,
        confidence: 0.9,
        provider: "mathpix",
        accepted: true,
        alternatives: []
      }
    },
    now: fixedNow,
    createId: () => "ocr-12k",
    questionAnswerMatches: () => {
      matcherCalls += 1;
      return false;
    }
  });

  assert.deepEqual(
    { matcherCalls, status: run.status, suggestedScore: run.suggested_score },
    { matcherCalls: 0, status: "needs-review", suggestedScore: null }
  );
  assert.match(run.feedback_en ?? "", /Long-form submission captured/);
  assert.notEqual(run.feedback_en, "No readable answer text was captured. Teacher review is required.");

  database.assignment_grading_runs.push(run);
  const accepted = await createTestStore(database).reviewTeacherSubmission({
    teacherId: "teacher-1",
    submissionId: submission.id,
    action: "accept"
  });

  assert.equal(accepted.status, "reviewed");
  assert.equal(database.submissions[0].score, null);
  assert.equal(database.assignment_teacher_reviews.at(-1)?.final_score, null);
});

test("teacher ops submission persistence records teacher reviews and score-only grade updates", async () => {
  const acceptedDatabase = createDatabase();
  const accepted = await createTestStore(acceptedDatabase).reviewTeacherSubmission({
    teacherId: "teacher-1",
    submissionId: "submission-owned-1",
    action: "accept"
  });

  assert.equal(accepted.status, "reviewed");
  const acceptedSubmission = acceptedDatabase.submissions.find((submission) => submission.id === "submission-owned-1");
  assert.equal(acceptedSubmission?.status, "resolved");
  assert.equal(acceptedSubmission?.score, 72);
  assert.equal(acceptedSubmission?.feedback_en, "Review seed feedback.");
  assert.equal(acceptedSubmission?.graded_at, fixedNow);
  assert.equal(acceptedDatabase.assignment_teacher_reviews.at(-1)?.id, "teacher-review-generated-1");

  const explicitScoreDatabase = createDatabase();
  const explicitScoreReview = await createTestStore(explicitScoreDatabase).reviewTeacherSubmission({
    teacherId: "teacher-1",
    submissionId: "submission-owned-1",
    action: "accept",
    score: 84.4
  });
  assert.equal(explicitScoreReview.status, "reviewed");
  assert.equal(explicitScoreDatabase.submissions[0].score, 84);
  assert.equal(explicitScoreDatabase.assignment_teacher_reviews.at(-1)?.final_score, 84);

  const noRunDatabase = createDatabase();
  noRunDatabase.assignment_grading_runs = [];
  noRunDatabase.submissions[0].score = 63;
  const noRunReview = await createTestStore(noRunDatabase).reviewTeacherSubmission({
    teacherId: "teacher-1",
    submissionId: "submission-owned-1",
    action: "accept"
  });
  assert.equal(noRunReview.status, "reviewed");
  assert.equal(noRunDatabase.submissions[0].score, 63);
  assert.equal(noRunDatabase.assignment_teacher_reviews.at(-1)?.final_score, 63);

  const correctionDatabase = createDatabase();
  const store = createTestStore(correctionDatabase);
  const correction = await store.reviewTeacherSubmission({
    teacherId: "teacher-1",
    submissionId: "submission-owned-1",
    action: "request-correction",
    score: 72.4,
    feedback: "  Needs clearer units.  ",
    correctionRequest: "  Show the unit conversion.  ",
    correctionDueAt: "2026-06-24T09:30:00.000Z"
  });

  assert.equal(correction.status, "reviewed");
  const correctionSubmission = correctionDatabase.submissions.find((submission) => submission.id === "submission-owned-1");
  assert.equal(correctionSubmission?.status, "correction-required");
  assert.equal(correctionSubmission?.score, 72);
  assert.equal(correctionSubmission?.feedback_en, "Needs clearer units.");
  assert.equal(correctionSubmission?.graded_at, null);
  assert.equal(correctionDatabase.assignment_teacher_reviews.at(-1)?.correction_due_at, "2026-06-24T09:30:00.000Z");

  const graded = await store.updateTeacherSubmissionGrade({
    teacherId: "teacher-1",
    submissionId: "submission-owned-1",
    score: 104.6,
    feedback: "  Final feedback.  "
  });

  assert.equal(graded.status, "graded");
  assert.equal(correctionSubmission?.status, "graded");
  assert.equal(correctionSubmission?.score, 100);
  assert.equal(correctionSubmission?.feedback_en, "Final feedback.");
  assert.equal(correctionSubmission?.graded_at, fixedNow);

  assert.deepEqual(
    await store.reviewTeacherSubmission({
      teacherId: "teacher-1",
      submissionId: "submission-shared",
      action: "accept"
    }),
    { status: "not-found" }
  );
  assert.deepEqual(
    await store.reviewTeacherSubmission({
      teacherId: "student-1",
      submissionId: "submission-owned-1",
      action: "accept"
    }),
    { status: "forbidden" }
  );
});

test("legacy userStore delegates teacher assignment submission reads to extracted persistence", async () => {
  const source = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");

  assert.match(
    source,
    /export const getTeacherAssignmentSubmissions = teacherOpsUserStore\.getTeacherAssignmentSubmissions/
  );
  assert.match(
    source,
    /export const createTeacherSubmissionGradingRun = teacherOpsUserStore\.createTeacherSubmissionGradingRun/
  );
  assert.match(
    source,
    /export const reviewTeacherSubmission = teacherOpsUserStore\.reviewTeacherSubmission/
  );
  assert.match(
    source,
    /export const updateTeacherSubmissionGrade = teacherOpsUserStore\.updateTeacherSubmissionGrade/
  );
  assert.doesNotMatch(source, /export async function getTeacherAssignmentSubmissions/);
  assert.doesNotMatch(source, /export async function createTeacherSubmissionGradingRun/);
  assert.doesNotMatch(source, /export async function reviewTeacherSubmission/);
  assert.doesNotMatch(source, /export async function updateTeacherSubmissionGrade/);
});

test("teacher ops submission persistence owns assignment OCR normalization helpers for legacy userStore", async () => {
  const helpers = await import("@/lib/server/userStore/teacherOpsSubmissionPersistence") as Record<string, unknown>;
  const rootSource = await readFile(path.join(process.cwd(), "lib/server/userStore.ts"), "utf8");
  const helperSource = await readFile(path.join(process.cwd(), "lib/server/userStore/teacherOpsSubmissionPersistence.ts"), "utf8");

  const normalizeAssignmentOcrProvider = helpers.normalizeTeacherOpsAssignmentOcrProvider;
  const normalizeAssignmentOcrResult = helpers.normalizeTeacherOpsAssignmentOcrResult;

  assert.equal(typeof normalizeAssignmentOcrProvider, "function");
  assert.equal(typeof normalizeAssignmentOcrResult, "function");
  assert.match(helperSource, /export function normalizeTeacherOpsAssignmentOcrProvider\(/);
  assert.match(helperSource, /export function normalizeTeacherOpsAssignmentOcrResult\(/);
  assert.match(rootSource, /normalizeTeacherOpsAssignmentOcrResult as normalizeAssignmentOcrResultFromTeacherOpsSubmission/);
  assert.doesNotMatch(rootSource, /function normalizeAssignmentOcrProvider\(/);
  assert.doesNotMatch(rootSource, /function normalizeAssignmentOcrResult\(/);

  assert.equal((normalizeAssignmentOcrProvider as (provider: unknown) => string)("mathpix"), "mathpix");
  assert.equal((normalizeAssignmentOcrProvider as (provider: unknown) => string)("camera"), "none");

  const longText = "x".repeat(12050);
  const longAlternative = "a".repeat(4050);
  const normalized = (normalizeAssignmentOcrResult as (value: unknown) => {
    text: string;
    latex?: string;
    confidence: number | null;
    provider: string;
    accepted: boolean;
    alternatives: Array<{ text: string; provider: string; confidence: number | null }>;
    reason?: string;
  })({
    text: longText,
    latex: "l".repeat(12050),
    confidence: 1.8,
    provider: "camera",
    accepted: true,
    alternatives: Array.from({ length: 8 }, (_, index) => ({
      text: `${longAlternative}-${index}`,
      confidence: index === 0 ? -0.2 : 0.4,
      provider: index === 0 ? "mathpix" : "camera"
    })),
    reason: "r".repeat(700)
  });

  assert.equal(normalized.text.length, 12000);
  assert.equal(normalized.latex?.length, 12000);
  assert.equal(normalized.confidence, 1);
  assert.equal(normalized.provider, "none");
  assert.equal(normalized.accepted, true);
  assert.equal(normalized.alternatives.length, 6);
  assert.equal(normalized.alternatives[0].text.length, 4000);
  assert.equal(normalized.alternatives[0].provider, "mathpix");
  assert.equal(normalized.alternatives[0].confidence, 0);
  assert.equal(normalized.alternatives[1].provider, "none");
  assert.equal(normalized.reason?.length, 500);
  assert.equal((normalizeAssignmentOcrResult as (value: unknown) => unknown)(null), null);
});
