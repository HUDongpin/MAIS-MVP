import type {
  AssignmentGradingRun,
  AssignmentGradingRunStatus,
  AssignmentOcrAlternative,
  AssignmentOcrProvider,
  AssignmentSubmissionAttemptKind,
  AssignmentSubmissionInputType,
  AssignmentSubmissionOcrResult,
  AssignmentTeacherReviewAction,
  LocalizedText,
  SchoolMembershipRole,
  Submission,
  SubmissionStatus
} from "@/types";

type TeacherOpsSubmissionUserRole = "student" | "teacher" | "parent" | "admin";

type TeacherOpsSubmissionUserRecord = {
  id: string;
  role: TeacherOpsSubmissionUserRole;
};

type TeacherOpsSubmissionClassRecord = {
  id: string;
  teacher_id: string;
};

type TeacherOpsSubmissionAssignmentRecord = {
  id: string;
  class_id: string;
  target_id?: string | null;
};

type TeacherOpsSubmissionQuestionRecord = {
  id: string;
  answer: string;
  accepted_answers?: string[] | null;
  options?: LocalizedText[] | null;
};

type TeacherOpsSubmissionSchoolMembershipRecord = {
  id: string;
  school_id: string;
  user_id: string;
  role: SchoolMembershipRole;
  class_id?: string;
  created_at: string;
};

type TeacherOpsSubmissionRecord = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  score: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  feedback_en?: string;
  feedback_zh?: string;
  updated_at: string;
};

type TeacherOpsSubmissionAttemptRecord = {
  id: string;
  submission_id: string;
  student_id: string;
  attempt_number: number;
  kind: AssignmentSubmissionAttemptKind;
  input_type: AssignmentSubmissionInputType;
  answer_text: string;
  image_data_url?: string;
  image_object_key?: string;
  image_file_name?: string;
  ocr_result: AssignmentSubmissionOcrResult | null;
  submitted_at: string;
};

type TeacherOpsSubmissionGradingRunRecord = {
  id: string;
  submission_id: string;
  attempt_id: string | null;
  status: AssignmentGradingRunStatus;
  provider: AssignmentOcrProvider | "llm" | "manual";
  model: string;
  suggested_score: number | null;
  confidence: number | null;
  feedback_en?: string;
  feedback_zh?: string;
  correction_request_en?: string;
  correction_request_zh?: string;
  error_code?: string;
  usage?: AssignmentGradingRun["usage"];
  created_at: string;
};

type TeacherOpsSubmissionTeacherReviewRecord = {
  id: string;
  submission_id: string;
  action: AssignmentTeacherReviewAction;
  final_score: number | null;
  feedback_en?: string;
  feedback_zh?: string;
  correction_request_en?: string;
  correction_request_zh?: string;
  correction_due_at: string | null;
  reviewed_by: string;
  created_at: string;
};

export type TeacherOpsSubmissionPersistenceDatabase = {
  assignment_grading_runs: TeacherOpsSubmissionGradingRunRecord[];
  assignment_submission_attempts: TeacherOpsSubmissionAttemptRecord[];
  assignment_teacher_reviews: TeacherOpsSubmissionTeacherReviewRecord[];
  assignments: TeacherOpsSubmissionAssignmentRecord[];
  questions?: TeacherOpsSubmissionQuestionRecord[];
  school_memberships: TeacherOpsSubmissionSchoolMembershipRecord[];
  submissions: TeacherOpsSubmissionRecord[];
  teacher_classes: TeacherOpsSubmissionClassRecord[];
  users: TeacherOpsSubmissionUserRecord[];
};

export type TeacherOpsSubmissionPersistenceStoreDependencies = {
  readDatabase: () => Promise<TeacherOpsSubmissionPersistenceDatabase>;
  mutateDatabase: <T>(mutator: (database: TeacherOpsSubmissionPersistenceDatabase) => T | Promise<T>) => Promise<T>;
  createId: () => string;
  now: () => Date;
  createGradingRunRecord: (
    database: TeacherOpsSubmissionPersistenceDatabase,
    submission: TeacherOpsSubmissionRecord,
    assignment: TeacherOpsSubmissionAssignmentRecord,
    attempt: TeacherOpsSubmissionAttemptRecord | null,
    now: string
  ) => TeacherOpsSubmissionGradingRunRecord | Promise<TeacherOpsSubmissionGradingRunRecord>;
  toGradingRun: (
    database: TeacherOpsSubmissionPersistenceDatabase,
    run: TeacherOpsSubmissionGradingRunRecord
  ) => AssignmentGradingRun;
  toSubmission: (
    database: TeacherOpsSubmissionPersistenceDatabase,
    submission: TeacherOpsSubmissionRecord
  ) => Submission;
};

type TeacherOpsSubmissionReviewParams = {
  teacherId: string;
  submissionId: string;
  action: AssignmentTeacherReviewAction;
  score?: number | null;
  feedback?: string;
  correctionRequest?: string;
  correctionDueAt?: string | null;
};

type TeacherOpsSubmissionReviewResult =
  | { status: "reviewed"; submission: Submission }
  | { status: "forbidden" | "not-found" };

export type TeacherOpsSubmissionPersistenceStore = ReturnType<typeof createTeacherOpsSubmissionPersistenceStore>;

function canUseTeacherArea(user?: TeacherOpsSubmissionUserRecord | null): user is TeacherOpsSubmissionUserRecord {
  return user?.role === "teacher" || user?.role === "admin";
}

const assignmentMaxAnswerTextLength = 6000;
const dayMs = 24 * 60 * 60 * 1000;

export function normalizeTeacherOpsAssignmentOcrProvider(value: unknown): AssignmentOcrProvider {
  return value === "simpletex" || value === "mathpix" || value === "llm-vision" || value === "local" || value === "none"
    ? value
    : "none";
}

export function normalizeTeacherOpsAssignmentOcrResult(value: unknown): AssignmentSubmissionOcrResult | null {
  const result = value as Partial<AssignmentSubmissionOcrResult> | null;
  if (!result || typeof result !== "object") return null;
  const alternatives: AssignmentOcrAlternative[] = Array.isArray(result.alternatives)
    ? result.alternatives
        .map((alternative): AssignmentOcrAlternative | null => {
          const item = alternative as Partial<AssignmentSubmissionOcrResult["alternatives"][number]> | null;
          if (!item || typeof item.text !== "string") return null;
          return {
            text: item.text.slice(0, 4000),
            ...(typeof item.latex === "string" ? { latex: item.latex.slice(0, 4000) } : {}),
            confidence: typeof item.confidence === "number" ? Math.max(0, Math.min(1, item.confidence)) : null,
            provider: normalizeTeacherOpsAssignmentOcrProvider(item.provider)
          };
        })
        .filter((alternative): alternative is AssignmentOcrAlternative => alternative !== null)
    : [];

  return {
    text: typeof result.text === "string" ? result.text.slice(0, 12000) : "",
    ...(typeof result.latex === "string" ? { latex: result.latex.slice(0, 12000) } : {}),
    confidence: typeof result.confidence === "number" ? Math.max(0, Math.min(1, result.confidence)) : null,
    provider: normalizeTeacherOpsAssignmentOcrProvider(result.provider),
    accepted: result.accepted === true,
    alternatives: alternatives.slice(0, 6),
    ...(typeof result.reason === "string" ? { reason: result.reason.slice(0, 500) } : {})
  };
}

function cleanAssignmentText(value: string | undefined | null, maxLength = assignmentMaxAnswerTextLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function teacherOpsVisibleAttemptText(attempt: {
  answer_text: string;
  ocr_result: { text?: string } | null;
} | null) {
  if (!attempt) return "";
  return attempt.ocr_result?.text || attempt.answer_text;
}

export function teacherOpsDeterministicAssignmentGradingRun({
  database,
  submission,
  assignment,
  attempt,
  now,
  createId,
  questionAnswerMatches
}: {
  database: TeacherOpsSubmissionPersistenceDatabase;
  submission: TeacherOpsSubmissionRecord;
  assignment: TeacherOpsSubmissionAssignmentRecord;
  attempt: TeacherOpsSubmissionAttemptRecord | null;
  now: string;
  createId: () => string;
  questionAnswerMatches: (
    question: { id?: string; answer: string; accepted_answers?: string[] | null; options?: LocalizedText[] | null },
    selectedAnswer: string
  ) => boolean;
}) {
  const answerText = teacherOpsVisibleAttemptText(attempt);
  const question = assignment.target_id ? database.questions?.find((candidate) => candidate.id === assignment.target_id) : null;
  if (question && answerText) {
    const correct = questionAnswerMatches(
      {
        id: question.id,
        answer: question.answer,
        accepted_answers: question.accepted_answers ?? null,
        options: question.options ?? null
      },
      answerText
    );
    return {
      id: `grading-run-${createId()}`,
      submission_id: submission.id,
      attempt_id: attempt?.id ?? null,
      status: "suggested" as const,
      provider: "manual" as const,
      model: "deterministic-answer-key",
      suggested_score: correct ? 100 : 0,
      confidence: 0.82,
      feedback_en: correct ? "Answer matches the linked answer key." : "Answer does not match the linked answer key. Review the working before confirming.",
      feedback_zh: correct ? "答案與連結答案吻合。" : "答案與連結答案不吻合，確認前請檢查演算過程。",
      correction_request_en: correct ? "" : "Revise the working and explain the corrected method.",
      correction_request_zh: correct ? "" : "請修正演算，並說明正確方法。",
      created_at: now
    };
  }

  return {
    id: `grading-run-${createId()}`,
    submission_id: submission.id,
    attempt_id: attempt?.id ?? null,
    status: "needs-review" as const,
    provider: "manual" as const,
    model: "teacher-review-required",
    suggested_score: null,
    confidence: null,
    feedback_en: answerText ? "Submission captured. Teacher confirmation is required." : "No readable answer text was captured. Teacher review is required.",
    feedback_zh: answerText ? "已記錄提交，需教師確認。" : "未能讀取清晰答案文字，需教師人工審核。",
    correction_request_en: "",
    correction_request_zh: "",
    created_at: now
  };
}

function teacherOpsExtractJsonObjectText(value: string) {
  const trimmed = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

export function teacherOpsParseAssignmentGradingJson(reply: string) {
  const text = teacherOpsExtractJsonObjectText(reply);
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const feedback = parsed.feedback as Record<string, unknown> | undefined;
    const correctionRequest = parsed.correctionRequest as Record<string, unknown> | undefined;
    return {
      suggestedScore: typeof parsed.suggestedScore === "number" ? Math.max(0, Math.min(100, Math.round(parsed.suggestedScore))) : null,
      confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence > 1 ? parsed.confidence / 100 : parsed.confidence)) : null,
      feedbackEn: typeof feedback?.en === "string" ? feedback.en.slice(0, 4000) : "",
      feedbackZh: typeof feedback?.zh === "string" ? feedback.zh.slice(0, 4000) : "",
      correctionRequestEn: typeof correctionRequest?.en === "string" ? correctionRequest.en.slice(0, 4000) : "",
      correctionRequestZh: typeof correctionRequest?.zh === "string" ? correctionRequest.zh.slice(0, 4000) : ""
    };
  } catch {
    return null;
  }
}

function correctionDueDateFrom(value: string | undefined | null, nowMs: number) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > nowMs) return new Date(parsed).toISOString();
  return new Date(nowMs + 3 * dayMs).toISOString();
}

function teacherCanAccessClass(
  database: TeacherOpsSubmissionPersistenceDatabase,
  user: TeacherOpsSubmissionUserRecord,
  classId: string
) {
  const teacherClass = database.teacher_classes.find((candidate) => candidate.id === classId);
  if (!teacherClass) return null;
  if (
    user.role !== "admin" &&
    teacherClass.teacher_id !== user.id &&
    !(database.school_memberships ?? []).some(
      (membership) =>
        membership.user_id === user.id &&
        membership.class_id === classId &&
        (membership.role === "teacher" || membership.role === "admin")
    )
  ) {
    return null;
  }
  return teacherClass;
}

function submissionAttemptsFor(database: TeacherOpsSubmissionPersistenceDatabase, submissionId: string) {
  return database.assignment_submission_attempts
    .filter((attempt) => attempt.submission_id === submissionId)
    .sort((a, b) => a.attempt_number - b.attempt_number);
}

function latestAssignmentGradingRun(database: TeacherOpsSubmissionPersistenceDatabase, submissionId: string) {
  return database.assignment_grading_runs
    .filter((run) => run.submission_id === submissionId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
}

export function createTeacherOpsSubmissionPersistenceStore({
  readDatabase,
  mutateDatabase,
  createId,
  now,
  createGradingRunRecord,
  toGradingRun,
  toSubmission
}: TeacherOpsSubmissionPersistenceStoreDependencies) {
  const reviewTeacherSubmission = async ({
    teacherId,
    submissionId,
    action,
    score,
    feedback,
    correctionRequest,
    correctionDueAt
  }: TeacherOpsSubmissionReviewParams): Promise<TeacherOpsSubmissionReviewResult> => {
    return mutateDatabase((database) => {
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" as const };

      const submission = database.submissions.find((candidate) => candidate.id === submissionId);
      const assignment = submission
        ? database.assignments.find((candidate) => candidate.id === submission.assignment_id)
        : null;
      if (!submission || !assignment || !teacherCanAccessClass(database, user, assignment.class_id)) {
        return { status: "not-found" as const };
      }

      const nowDate = now();
      const nowIso = nowDate.toISOString();
      const latestRun = latestAssignmentGradingRun(database, submission.id);
      const cleanFeedback = cleanAssignmentText(feedback, 4000);
      const cleanCorrectionRequest = cleanAssignmentText(correctionRequest, 4000);
      const finalScore = typeof score === "number" && Number.isFinite(score)
        ? Math.max(0, Math.min(100, Math.round(score)))
        : latestRun?.suggested_score ?? submission.score;
      const dueAt = action === "request-correction"
        ? correctionDueDateFrom(correctionDueAt, nowDate.getTime())
        : null;

      const nextFeedbackEn = cleanFeedback || latestRun?.feedback_en || submission.feedback_en || "";
      const nextFeedbackZh = cleanFeedback || latestRun?.feedback_zh || latestRun?.feedback_en || submission.feedback_zh || submission.feedback_en || "";

      database.assignment_teacher_reviews.push({
        id: `teacher-review-${createId()}`,
        submission_id: submission.id,
        action,
        final_score: finalScore,
        feedback_en: nextFeedbackEn,
        feedback_zh: nextFeedbackZh,
        correction_request_en: cleanCorrectionRequest || latestRun?.correction_request_en || "",
        correction_request_zh: cleanCorrectionRequest || latestRun?.correction_request_zh || latestRun?.correction_request_en || "",
        correction_due_at: dueAt,
        reviewed_by: user.id,
        created_at: nowIso
      });

      submission.score = finalScore;
      submission.feedback_en = nextFeedbackEn;
      submission.feedback_zh = nextFeedbackZh;
      if (action === "request-correction") {
        submission.status = "correction-required";
        submission.graded_at = null;
      } else {
        submission.status = action === "score-only" ? "graded" : "resolved";
        submission.graded_at = nowIso;
      }
      submission.updated_at = nowIso;

      return { status: "reviewed" as const, submission: toSubmission(database, submission) };
    });
  };

  return {
    async getTeacherAssignmentSubmissions(userId: string, assignmentId: string): Promise<Submission[] | null> {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === userId);
      if (!canUseTeacherArea(user)) return null;

      const assignment = database.assignments.find((candidate) => candidate.id === assignmentId);
      if (!assignment || !teacherCanAccessClass(database, user, assignment.class_id)) return null;

      return database.submissions
        .filter((submission) => submission.assignment_id === assignmentId)
        .map((submission) => toSubmission(database, submission));
    },

    async createTeacherSubmissionGradingRun({
      teacherId,
      submissionId
    }: {
      teacherId: string;
      submissionId: string;
    }): Promise<
      | { status: "created"; gradingRun: AssignmentGradingRun; submission: Submission }
      | { status: "forbidden" | "not-found" }
    > {
      const database = await readDatabase();
      const user = database.users.find((candidate) => candidate.id === teacherId);
      if (!canUseTeacherArea(user)) return { status: "forbidden" };

      const submission = database.submissions.find((candidate) => candidate.id === submissionId);
      const assignment = submission
        ? database.assignments.find((candidate) => candidate.id === submission.assignment_id)
        : null;
      if (!submission || !assignment || !teacherCanAccessClass(database, user, assignment.class_id)) {
        return { status: "not-found" };
      }

      const attempt = submissionAttemptsFor(database, submission.id).slice(-1)[0] ?? null;
      const nowIso = now().toISOString();
      const run = await createGradingRunRecord(database, submission, assignment, attempt, nowIso);

      return mutateDatabase((mutable) => {
        const currentSubmission = mutable.submissions.find((candidate) => candidate.id === submissionId);
        const currentAssignment = currentSubmission
          ? mutable.assignments.find((candidate) => candidate.id === currentSubmission.assignment_id)
          : null;
        if (!currentSubmission || !currentAssignment || !teacherCanAccessClass(mutable, user, currentAssignment.class_id)) {
          return { status: "not-found" as const };
        }

        mutable.assignment_grading_runs.push(run);
        currentSubmission.updated_at = nowIso;
        return {
          status: "created" as const,
          gradingRun: toGradingRun(mutable, run),
          submission: toSubmission(mutable, currentSubmission)
        };
      });
    },

    reviewTeacherSubmission,

    async updateTeacherSubmissionGrade({
      teacherId,
      submissionId,
      score,
      feedback
    }: {
      teacherId: string;
      submissionId: string;
      score: number;
      feedback?: string;
    }): Promise<
      | { status: "graded"; submission: Submission }
      | { status: "forbidden" | "not-found" }
    > {
      const result = await reviewTeacherSubmission({
        teacherId,
        submissionId,
        action: "score-only",
        score,
        feedback
      });
      if (result.status !== "reviewed") return result;
      return { status: "graded", submission: result.submission };
    }
  };
}
